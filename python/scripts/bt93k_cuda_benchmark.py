"""BT93K.5 isolated CUDA infrastructure benchmark evidence.

Runs the same BT93K 2/4/6-env startup smoke under the CPU reference Python and
an isolated CUDA Python, then records a small Torch CPU-vs-CUDA wallclock probe.
This is infrastructure evidence only; it never opens BT94A or claims PPO quality.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
import textwrap
import time
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from statistics import median
from typing import Any, Mapping, Sequence


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
BT93K_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93k"
DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93k_cuda_benchmark.json"
REPORT_PATH = BT93K_ROOT / "cuda_benchmark_report.json"
ENV_SCALE_SCRIPT = PYTHON_ROOT / "scripts" / "bt93k_env_scale_smokes.py"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _rel(path: str | Path | None) -> str | None:
    if path is None:
        return None
    resolved = Path(path).resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _json_safe(value: Any) -> Any:
    if isinstance(value, Path):
        return _rel(value)
    if isinstance(value, Mapping):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    return value


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(_json_safe(payload), indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str | None:
    if not path.exists() or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _run_capture(command: Sequence[str], *, timeout_seconds: int = 180) -> dict[str, Any]:
    started_at = _utc_now()
    start = time.perf_counter()
    result = subprocess.run(
        list(command),
        cwd=REPO_ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        timeout=timeout_seconds,
        check=False,
    )
    wallclock = round(time.perf_counter() - start, 6)
    return {
        "command": " ".join(str(part) for part in command),
        "startedAt": started_at,
        "finishedAt": _utc_now(),
        "exitCode": result.returncode,
        "wallClockSeconds": wallclock,
        "stdoutTail": result.stdout[-4000:],
        "stderrTail": result.stderr[-4000:],
        "ok": result.returncode == 0,
    }


def _probe_python(python_path: Path) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "path": _rel(python_path),
        "exists": python_path.exists(),
        "ok": False,
        "torchImportOk": False,
        "cudaAvailable": False,
        "deviceCount": 0,
        "devices": [],
    }
    if not python_path.exists():
        payload["error"] = "python executable missing"
        return payload
    code = r"""
import json
import platform
import sys

payload = {
    "pythonExecutable": sys.executable,
    "pythonVersion": sys.version.split()[0],
    "platform": platform.platform(),
    "torchImportOk": False,
    "cudaAvailable": False,
    "deviceCount": 0,
    "devices": [],
}
try:
    import torch
    payload.update({
        "torchImportOk": True,
        "torchVersion": torch.__version__,
        "torchCudaVersion": torch.version.cuda,
        "cudaAvailable": bool(torch.cuda.is_available()),
        "deviceCount": int(torch.cuda.device_count()),
        "devices": [torch.cuda.get_device_name(index) for index in range(torch.cuda.device_count())],
    })
except Exception as exc:
    payload["error"] = repr(exc)
print(json.dumps(payload, sort_keys=True))
"""
    run = _run_capture([str(python_path), "-c", code], timeout_seconds=60)
    payload["probeCommand"] = run
    if run["ok"]:
        try:
            parsed = json.loads(str(run["stdoutTail"]).strip().splitlines()[-1])
            payload.update(parsed)
            payload["ok"] = bool(parsed.get("torchImportOk"))
        except Exception as exc:  # pragma: no cover - defensive report path
            payload["error"] = f"probe-json-parse-failed: {exc!r}"
    return payload


def _nvidia_smi() -> dict[str, Any]:
    run = _run_capture(
        ["nvidia-smi", "--query-gpu=name,driver_version,memory.total", "--format=csv,noheader"],
        timeout_seconds=30,
    )
    gpus = []
    if run["ok"]:
        for line in str(run["stdoutTail"]).splitlines():
            parts = [part.strip() for part in line.split(",")]
            if len(parts) >= 3:
                gpus.append({
                    "name": parts[0],
                    "driverVersion": parts[1],
                    "memoryTotal": parts[2],
                })
    return {
        "available": run["ok"],
        "gpus": gpus,
        "command": run,
    }


def _run_env_scale_smoke(python_path: Path, output_path: Path) -> dict[str, Any]:
    command = [
        str(python_path),
        str(ENV_SCALE_SCRIPT),
        "--write-report",
        "--output",
        str(output_path),
    ]
    run = _run_capture(command, timeout_seconds=240)
    report: dict[str, Any] | None = None
    if output_path.exists():
        try:
            report = _read_json(output_path)
        except Exception as exc:  # pragma: no cover - defensive report path
            report = {"readError": repr(exc)}
    runs = report.get("runs") if isinstance(report, Mapping) else []
    artifact_integrity = bool(
        report
        and report.get("ok") is True
        and report.get("summary", {}).get("allRunsOk") is True
        and all(
            item.get("runExitReportSha256")
            and item.get("snapshotManifestSha256")
            and item.get("evalSnapshotSha256")
            for item in runs
            if isinstance(item, Mapping)
        )
        and len(runs) == 3
    )
    return {
        "output": _rel(output_path),
        "outputSha256": _sha256_file(output_path),
        "command": run,
        "reportOk": bool(report and report.get("ok") is True),
        "artifactIntegrityOk": artifact_integrity,
        "resultClass": report.get("resultClass") if isinstance(report, Mapping) else None,
        "summary": report.get("summary") if isinstance(report, Mapping) else None,
        "phaseCoverage": report.get("phaseCoverage") if isinstance(report, Mapping) else None,
        "runs": [
            {
                "envCount": item.get("envCount"),
                "ok": item.get("ok"),
                "runExitReport": item.get("runExitReport"),
                "runExitReportSha256": item.get("runExitReportSha256"),
                "snapshotManifest": item.get("snapshotManifest"),
                "snapshotManifestSha256": item.get("snapshotManifestSha256"),
                "evalSnapshot": item.get("evalSnapshot"),
                "evalSnapshotSha256": item.get("evalSnapshotSha256"),
                "totalStepsObserved": item.get("summary", {}).get("totalStepsObserved"),
                "runtimeErrorCount": item.get("summary", {}).get("runtimeErrorCount"),
            }
            for item in runs
            if isinstance(item, Mapping)
        ],
    }


def _run_torch_probe(python_path: Path, device: str, torch_cfg: Mapping[str, Any], env_counts: Sequence[int]) -> dict[str, Any]:
    params = {
        "device": device,
        "envCounts": [int(value) for value in env_counts],
        "stepsPerEnv": int(torch_cfg["stepsPerEnv"]),
        "obsDim": int(torch_cfg["obsDim"]),
        "hiddenDim": int(torch_cfg["hiddenDim"]),
        "actionDim": int(torch_cfg["actionDim"]),
        "iterations": int(torch_cfg["iterations"]),
        "warmupIterations": int(torch_cfg["warmupIterations"]),
        "seed": int(torch_cfg["seed"]),
    }
    code = r"""
import json
import math
import sys
import time

params = json.loads(sys.argv[1])
import torch

device = torch.device(params["device"])
if device.type == "cuda" and not torch.cuda.is_available():
    raise RuntimeError("CUDA requested but torch.cuda.is_available() is false")

torch.manual_seed(int(params["seed"]))
if device.type == "cuda":
    torch.cuda.manual_seed_all(int(params["seed"]))

def run_one(env_count):
    batch_size = max(1, int(env_count) * int(params["stepsPerEnv"]))
    obs_dim = int(params["obsDim"])
    hidden_dim = int(params["hiddenDim"])
    action_dim = int(params["actionDim"])
    model = torch.nn.Sequential(
        torch.nn.Linear(obs_dim, hidden_dim),
        torch.nn.Tanh(),
        torch.nn.Linear(hidden_dim, hidden_dim),
        torch.nn.Tanh(),
        torch.nn.Linear(hidden_dim, action_dim),
    ).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    x = torch.randn((batch_size, obs_dim), device=device)
    target = torch.arange(batch_size, device=device) % action_dim
    for _ in range(int(params["warmupIterations"])):
        optimizer.zero_grad(set_to_none=True)
        loss = torch.nn.functional.cross_entropy(model(x), target)
        loss.backward()
        optimizer.step()
    if device.type == "cuda":
        torch.cuda.synchronize()
    started = time.perf_counter()
    final_loss = None
    for _ in range(int(params["iterations"])):
        optimizer.zero_grad(set_to_none=True)
        logits = model(x)
        loss = torch.nn.functional.cross_entropy(logits, target)
        loss.backward()
        optimizer.step()
        final_loss = loss
    if device.type == "cuda":
        torch.cuda.synchronize()
    wallclock = time.perf_counter() - started
    checksum = 0.0
    with torch.no_grad():
        for parameter in model.parameters():
            checksum += float(parameter.detach().float().sum().cpu().item())
    final_loss_value = float(final_loss.detach().cpu().item()) if final_loss is not None else None
    return {
        "envCount": int(env_count),
        "batchSize": batch_size,
        "wallClockSeconds": round(wallclock, 6),
        "iterations": int(params["iterations"]),
        "iterationsPerSecond": round(float(params["iterations"]) / wallclock, 6) if wallclock > 0 else None,
        "finalLoss": final_loss_value,
        "checksum": round(checksum, 6),
        "finite": bool(
            final_loss_value is not None
            and math.isfinite(final_loss_value)
            and math.isfinite(checksum)
        ),
    }

payload = {
    "device": str(device),
    "torchVersion": torch.__version__,
    "torchCudaVersion": torch.version.cuda,
    "cudaAvailable": bool(torch.cuda.is_available()),
    "deviceName": torch.cuda.get_device_name(0) if device.type == "cuda" and torch.cuda.is_available() else None,
    "runs": [run_one(count) for count in params["envCounts"]],
}
payload["ok"] = all(item["finite"] for item in payload["runs"])
print(json.dumps(payload, sort_keys=True))
"""
    run = _run_capture([str(python_path), "-c", code, json.dumps(params, sort_keys=True)], timeout_seconds=180)
    payload: dict[str, Any] = {
        "device": device,
        "command": run,
        "ok": False,
        "runs": [],
    }
    if run["ok"]:
        try:
            parsed = json.loads(str(run["stdoutTail"]).strip().splitlines()[-1])
            payload.update(parsed)
        except Exception as exc:  # pragma: no cover - defensive report path
            payload["error"] = f"torch-probe-json-parse-failed: {exc!r}"
    return payload


def _speedup(cpu_seconds: float | None, cuda_seconds: float | None) -> float | None:
    if not cpu_seconds or not cuda_seconds or cpu_seconds <= 0 or cuda_seconds <= 0:
        return None
    return round((cpu_seconds - cuda_seconds) / cpu_seconds, 6)


def _compare_torch(cpu_probe: Mapping[str, Any], cuda_probe: Mapping[str, Any]) -> dict[str, Any]:
    cpu_by_count = {
        int(item["envCount"]): item
        for item in cpu_probe.get("runs", [])
        if isinstance(item, Mapping) and item.get("envCount") is not None
    }
    cuda_by_count = {
        int(item["envCount"]): item
        for item in cuda_probe.get("runs", [])
        if isinstance(item, Mapping) and item.get("envCount") is not None
    }
    rows = []
    for env_count in sorted(cpu_by_count.keys() & cuda_by_count.keys()):
        cpu = cpu_by_count[env_count]
        cuda = cuda_by_count[env_count]
        rows.append({
            "envCount": env_count,
            "cpuWallClockSeconds": cpu.get("wallClockSeconds"),
            "cudaWallClockSeconds": cuda.get("wallClockSeconds"),
            "wallClockImprovement": _speedup(cpu.get("wallClockSeconds"), cuda.get("wallClockSeconds")),
            "cpuFinite": cpu.get("finite") is True,
            "cudaFinite": cuda.get("finite") is True,
        })
    improvements = [
        row["wallClockImprovement"]
        for row in rows
        if isinstance(row.get("wallClockImprovement"), int | float)
    ]
    return {
        "rows": rows,
        "minWallClockImprovement": round(min(improvements), 6) if improvements else None,
        "medianWallClockImprovement": round(median(improvements), 6) if improvements else None,
        "allFinite": bool(rows and all(row["cpuFinite"] and row["cudaFinite"] for row in rows)),
    }


def build_report(*, config_path: Path, command: str) -> dict[str, Any]:
    config = _read_json(config_path)
    if config.get("blockId") != "BT93K" or config.get("phaseId") != "93K.5":
        raise RuntimeError(f"wrong BT93K.5 config scope: {_rel(config_path)}")

    python_cfg = config["python"]
    env_cfg = config["envSmoke"]
    policy = config["retentionPolicy"]
    env_counts = [int(value) for value in env_cfg["envCounts"]]

    cpu_python = _repo_path(python_cfg["cpuReference"])
    cuda_python = _repo_path(python_cfg["cudaIsolated"])
    cpu_output = _repo_path(env_cfg["cpuOutput"])
    cuda_output = _repo_path(env_cfg["cudaOutput"])
    source_env_config = _repo_path(env_cfg["sourceConfig"])

    cpu_probe = _probe_python(cpu_python)
    cuda_probe = _probe_python(cuda_python)
    nvidia = _nvidia_smi()

    cpu_env_smoke = _run_env_scale_smoke(cpu_python, cpu_output) if cpu_probe["ok"] else {"skipped": "cpu-python-probe-failed"}
    cuda_env_smoke = (
        _run_env_scale_smoke(cuda_python, cuda_output)
        if cuda_probe["ok"] and cuda_probe.get("cudaAvailable") is True
        else {"skipped": "cuda-python-probe-failed-or-cuda-unavailable"}
    )

    torch_cfg = dict(config["torchProbe"])
    torch_cfg["stepsPerEnv"] = int(env_cfg["stepsPerEnv"])
    cpu_torch = _run_torch_probe(cpu_python, "cpu", torch_cfg, env_counts) if cpu_probe["ok"] else {"skipped": "cpu-python-probe-failed"}
    cuda_torch = (
        _run_torch_probe(cuda_python, "cuda", torch_cfg, env_counts)
        if cuda_probe["ok"] and cuda_probe.get("cudaAvailable") is True
        else {"skipped": "cuda-python-probe-failed-or-cuda-unavailable"}
    )
    torch_comparison = _compare_torch(cpu_torch, cuda_torch) if cpu_torch.get("ok") and cuda_torch.get("ok") else {
        "rows": [],
        "minWallClockImprovement": None,
        "medianWallClockImprovement": None,
        "allFinite": False,
    }

    cpu_env_wall = cpu_env_smoke.get("command", {}).get("wallClockSeconds") if isinstance(cpu_env_smoke, Mapping) else None
    cuda_env_wall = cuda_env_smoke.get("command", {}).get("wallClockSeconds") if isinstance(cuda_env_smoke, Mapping) else None
    env_smoke_improvement = _speedup(cpu_env_wall, cuda_env_wall)
    artifact_integrity_ok = bool(
        cpu_env_smoke.get("artifactIntegrityOk") is True
        and cuda_env_smoke.get("artifactIntegrityOk") is True
    )
    driver_problems = []
    if not nvidia["available"]:
        driver_problems.append("nvidia-smi unavailable")
    if cuda_probe.get("cudaAvailable") is not True:
        driver_problems.append("cuda torch unavailable")
    determinism_problems = []
    if torch_comparison["allFinite"] is not True:
        determinism_problems.append("torch probe did not complete with finite CPU and CUDA metrics")

    minimum_improvement = float(policy["minimumStableWallclockImprovement"])
    torch_min = torch_comparison.get("minWallClockImprovement")
    cuda_retained = bool(
        cpu_probe["ok"]
        and cuda_probe["ok"]
        and cuda_probe.get("cudaAvailable") is True
        and artifact_integrity_ok
        and not driver_problems
        and not determinism_problems
        and isinstance(env_smoke_improvement, int | float)
        and env_smoke_improvement >= minimum_improvement
        and isinstance(torch_min, int | float)
        and torch_min >= minimum_improvement
    )
    blocked_reasons = []
    if cpu_probe["ok"] is not True:
        blocked_reasons.append("cpu reference python probe failed")
    if cuda_probe["ok"] is not True or cuda_probe.get("cudaAvailable") is not True:
        blocked_reasons.append("isolated cuda python probe failed or cuda unavailable")
    if artifact_integrity_ok is not True:
        blocked_reasons.append("CPU/CUDA env smoke artifact integrity not green")
    if isinstance(env_smoke_improvement, int | float) and env_smoke_improvement < minimum_improvement:
        blocked_reasons.append("env-smoke wallclock improvement below 20 percent")
    if isinstance(torch_min, int | float) and torch_min < minimum_improvement:
        blocked_reasons.append("torch wallclock improvement below 20 percent for at least one env count")
    blocked_reasons.extend(driver_problems)
    blocked_reasons.extend(determinism_problems)

    phase_coverage = {
        "93K.5.1": bool(cpu_probe["ok"] and cuda_probe["ok"] and cuda_probe.get("cudaAvailable") is True),
        "93K.5.2": bool(artifact_integrity_ok and cpu_torch.get("ok") and cuda_torch.get("ok")),
        "93K.5.3": True,
    }
    ok = bool(all(phase_coverage.values()))

    return {
        "schemaVersion": "bt93k-cuda-benchmark-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_cuda_benchmark.py",
        "blockId": "BT93K",
        "phaseId": "93K.5",
        "gitSha": _git_sha(),
        "command": command,
        "config": {
            "path": _rel(config_path),
            "sha256": _sha256_file(config_path),
        },
        "sourceArtifacts": {
            "envScaleConfig": {
                "path": _rel(source_env_config),
                "sha256": _sha256_file(source_env_config),
            },
            "envScaleScript": {
                "path": _rel(ENV_SCALE_SCRIPT),
                "sha256": _sha256_file(ENV_SCALE_SCRIPT),
            },
        },
        "ok": ok,
        "resultClass": "cuda-retained-for-infra" if cuda_retained else "cuda-not-retained",
        "phaseCoverage": phase_coverage,
        "summary": {
            "cpuReferenceOk": cpu_probe["ok"],
            "cudaTorchAvailable": cuda_probe.get("cudaAvailable") is True,
            "envSmokeArtifactIntegrityOk": artifact_integrity_ok,
            "envSmokeWallClockImprovement": env_smoke_improvement,
            "torchMinWallClockImprovement": torch_comparison.get("minWallClockImprovement"),
            "torchMedianWallClockImprovement": torch_comparison.get("medianWallClockImprovement"),
            "cudaRetained": cuda_retained,
            "cpuRemainsReferencePath": True,
            "qualityClaimAllowed": False,
            "blockedReasons": blocked_reasons,
        },
        "pythonEnvironments": {
            "cpuReference": cpu_probe,
            "cudaIsolated": cuda_probe,
        },
        "nvidiaSmi": nvidia,
        "envSmokeComparison": {
            "envCounts": env_counts,
            "stepsPerEnv": int(env_cfg["stepsPerEnv"]),
            "cpu": cpu_env_smoke,
            "cuda": cuda_env_smoke,
            "wallClockImprovement": env_smoke_improvement,
        },
        "torchProbeComparison": {
            "cpu": cpu_torch,
            "cuda": cuda_torch,
            "comparison": torch_comparison,
        },
        "decision": {
            "cudaRetained": cuda_retained,
            "policy": dict(policy),
            "blockedReasons": blocked_reasons,
            "retentionReason": (
                "CUDA retained only for future infra experiments; no PPO quality semantics"
                if cuda_retained
                else "CPU remains reference; CUDA is not retained because one or more infrastructure gates failed"
            ),
        },
        "guardrails": dict(config.get("guardrails") or {}),
        "commands": {
            "write": "python python/scripts/bt93k_cuda_benchmark.py --write-report",
            "cudaVenvInstall": (
                "python -m venv tmp/bt93k-cuda-venv; "
                "tmp/bt93k-cuda-venv/Scripts/python.exe -m pip install "
                "--index-url https://download.pytorch.org/whl/cu121 torch==2.3.1; "
                "tmp/bt93k-cuda-venv/Scripts/python.exe -m pip install -r python/requirements-ppo.txt"
            ),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    parser.add_argument("--output", default=str(REPORT_PATH))
    args = parser.parse_args()

    config_path = _repo_path(args.config)
    command = " ".join(sys.argv)
    report = build_report(config_path=config_path, command=command)
    output = _repo_path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(json.dumps({
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "phaseCoverage": report["phaseCoverage"],
        "cudaRetained": report["summary"]["cudaRetained"],
        "output": _rel(output),
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
