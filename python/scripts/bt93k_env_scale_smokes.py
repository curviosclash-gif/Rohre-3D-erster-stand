"""BT93K.4 env-scale smoke evidence.

Runs small 2/4/6-env startup smokes through the Python CurviosEnv -> Node
headless bridge path. The report is supervisor, snapshot, eval-snapshot, and
action-safety evidence only; it does not train, compare quality, open BT94A,
or make a candidate/promotion claim.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import make_curvios_action_wrapper  # noqa: E402


BT93K_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93k"
DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93k_env_scale_smoke.json"
REPORT_PATH = BT93K_ROOT / "env_scale_smoke_report.json"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
SINGLE_ENV_BRIDGE_PATH = REPO_ROOT / "scripts" / "training-single-env-bridge.mjs"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
USER_OWNED_3M_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "user-owned-survival-3m"
USER_OWNED_4ENV_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "user-owned-survival-3m-4env"


@dataclass(frozen=True)
class EnvScaleSpec:
    env_count: int
    seed_base: int
    phase_item: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _run_id(env_count: int) -> str:
    stamp = _utc_now().replace("-", "").replace(":", "")
    return f"{stamp}-bt93k-env-scale-{env_count}env-smoke"


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(_json_safe(payload), indent=2, sort_keys=True)}\n", encoding="utf-8")


def _append_jsonl(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"{json.dumps(_json_safe(payload), sort_keys=True)}\n")


def _json_safe(value: Any) -> Any:
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, Mapping):
        return {str(key): _json_safe(entry) for key, entry in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(entry) for entry in value]
    if isinstance(value, Path):
        return _rel(value)
    return value


def _sha256_file(path: Path) -> str | None:
    if not path.exists():
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


def _file_contains(path: Path, *tokens: str) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    return all(token in text for token in tokens)


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "exists": path.exists(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result else None


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted((str(key), int(value)) for key, value in counter.items()))


def _extract_effective_environment(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    effective = info.get("effectiveEnvironment")
    if isinstance(effective, Mapping):
        return effective
    effective = metadata.get("effectiveEnvironment")
    return effective if isinstance(effective, Mapping) else {}


def _extract_episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _minimal_info(info: Mapping[str, Any]) -> dict[str, Any]:
    effective = _extract_effective_environment(info)
    semantics = _extract_episode_semantics(info)
    return {
        "episodeId": info.get("episodeId"),
        "stepIndex": info.get("stepIndex"),
        "terminalReason": info.get("terminalReason"),
        "truncatedReason": info.get("truncatedReason"),
        "effectiveEnvironment": dict(effective),
        "episodeSemantics": dict(semantics),
        "rewardBreakdown": dict(info.get("rewardBreakdown") or {}),
        "ppoActionSurface": dict(info.get("ppoActionSurface") or {}),
        "ppoActionTelemetry": dict(info.get("ppoActionTelemetry") or {}),
    }


def _action_summary(reports: list[Mapping[str, Any]]) -> dict[str, Any]:
    totals = Counter()
    field_counts: Counter[str] = Counter()
    sanitizer_reasons: Counter[str] = Counter()
    for report in reports:
        for key in (
            "totalActions",
            "invalidActionCount",
            "preSamplingMaskCount",
            "maskCount",
            "postDecodeClampCount",
            "vetoCount",
            "sanitizerCount",
            "noopCount",
        ):
            totals[key] += int(report.get(key) or 0)
        field_counts.update({str(key): int(value) for key, value in dict(report.get("fieldCounts") or {}).items()})
        sanitizer_reasons.update({
            str(key): int(value) for key, value in dict(report.get("sanitizerReasons") or {}).items()
        })
    total_actions = max(0, int(totals["totalActions"]))

    def _rate(key: str) -> float:
        return round(float(totals[key]) / total_actions, 6) if total_actions else 0.0

    return {
        "totalActions": total_actions,
        "invalidActionCount": int(totals["invalidActionCount"]),
        "invalidActionRate": _rate("invalidActionCount"),
        "preSamplingMaskCount": int(totals["preSamplingMaskCount"]),
        "preSamplingMaskRate": _rate("preSamplingMaskCount"),
        "maskCount": int(totals["maskCount"]),
        "maskRate": _rate("maskCount"),
        "postDecodeClampCount": int(totals["postDecodeClampCount"]),
        "postDecodeClampRate": _rate("postDecodeClampCount"),
        "vetoCount": int(totals["vetoCount"]),
        "vetoRate": _rate("vetoCount"),
        "sanitizerCount": int(totals["sanitizerCount"]),
        "sanitizerRate": _rate("sanitizerCount"),
        "noopCount": int(totals["noopCount"]),
        "noopRate": _rate("noopCount"),
        "fieldCounts": _counter_dict(field_counts),
        "sanitizerReasons": _counter_dict(sanitizer_reasons),
    }


def _run_worker(
    *,
    env_index: int,
    seed: int,
    run_id: str,
    env_cfg: Mapping[str, Any],
) -> dict[str, Any]:
    started = time.perf_counter()
    steps_per_env = int(env_cfg["stepsPerEnv"])
    max_steps = int(env_cfg["maxStepsPerEpisode"])
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max(max_steps, steps_per_env + 2),
            default_seed=seed,
            session_id=f"{run_id}-env{env_index}",
            controller_timeout_seconds=float(env_cfg["controllerTimeoutSeconds"]),
            reward_profile_id=str(env_cfg.get("rewardProfileId") or "") or None,
            map_key=str(env_cfg.get("mapKey") or "standard"),
            domain_mode=str(env_cfg.get("domainMode") or "classic-3d"),
            game_mode=str(env_cfg.get("gameMode") or "") or None,
            planar_mode=bool(env_cfg.get("planarMode")),
            mode_path=str(env_cfg.get("modePath") or "") or None,
            curriculum_step_offset=int(env_cfg.get("curriculumStepOffset") or 0),
        ),
        surface_id=str(env_cfg.get("actionSurfaceId") or ""),
    )
    env.action_space.seed(seed)
    info_samples: list[dict[str, Any]] = []
    rewards: list[float] = []
    done_count = 0
    controller_pid: int | None = None
    error: str | None = None
    diagnostics: Mapping[str, Any] = {}
    reset_ok = False
    try:
        _, reset_info = env.reset(seed=seed)
        reset_ok = True
        controller_pid = getattr(env.env, "controller_pid", None)
        info_samples.append(_minimal_info(reset_info))
        for _ in range(steps_per_env):
            _, reward, terminated, truncated, info = env.step(0)
            rewards.append(float(reward))
            info_samples.append(_minimal_info(info))
            if terminated or truncated:
                done_count += 1
                break
        diagnostics = env.env.get_diagnostics()
    except Exception as exc:  # pragma: no cover - recorded as smoke evidence
        error = str(exc)
    finally:
        env.close()
    telemetry = env.get_telemetry_report() if hasattr(env, "get_telemetry_report") else {}
    bridge_telemetry = diagnostics.get("bridgeTelemetry") if isinstance(diagnostics, Mapping) else {}
    stats = diagnostics.get("stats") if isinstance(diagnostics, Mapping) else {}
    return {
        "envIndex": int(env_index),
        "seed": int(seed),
        "sessionId": f"{run_id}-env{env_index}",
        "ok": error is None and reset_ok and len(rewards) > 0,
        "error": error,
        "controllerPid": controller_pid,
        "resetOk": reset_ok,
        "stepsObserved": len(rewards),
        "doneCount": int(done_count),
        "rewardTotal": round(sum(rewards), 6),
        "wallClockSeconds": round(time.perf_counter() - started, 6),
        "infoTail": info_samples[-3:],
        "lastEffectiveEnvironment": (
            info_samples[-1].get("effectiveEnvironment") if info_samples else {}
        ),
        "actionTelemetry": dict(telemetry),
        "bridgeTelemetry": {
            "requestsSent": int((bridge_telemetry or {}).get("requestsSent") or 0),
            "responsesReceived": int((bridge_telemetry or {}).get("responsesReceived") or 0),
            "timeouts": int((bridge_telemetry or {}).get("timeouts") or 0),
            "failures": int((bridge_telemetry or {}).get("failures") or 0),
            "latencyMeanMs": (bridge_telemetry or {}).get("latencyMeanMs"),
            "latencyP95Ms": (bridge_telemetry or {}).get("latencyP95Ms"),
            "readyMessages": int((bridge_telemetry or {}).get("readyMessages") or 0),
        },
        "runtimeStats": {
            "messageCounts": dict((stats or {}).get("messageCounts") or {}),
            "contractSmoke": dict((stats or {}).get("contractSmoke") or {}),
        },
    }


def _summarize_workers(workers: list[Mapping[str, Any]]) -> dict[str, Any]:
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    effective_maps: Counter[str] = Counter()
    effective_modes: Counter[str] = Counter()
    reward_totals: Counter[str] = Counter()
    telemetry_reports: list[Mapping[str, Any]] = []
    runtime_errors = 0
    timeout_count = 0
    bridge_failures = 0

    for worker in workers:
        if not worker.get("ok"):
            runtime_errors += 1
        bridge = worker.get("bridgeTelemetry") if isinstance(worker.get("bridgeTelemetry"), Mapping) else {}
        timeout_count += int(bridge.get("timeouts") or 0)
        bridge_failures += int(bridge.get("failures") or 0)
        telemetry = worker.get("actionTelemetry") if isinstance(worker.get("actionTelemetry"), Mapping) else {}
        telemetry_reports.append(telemetry)
        for sample in worker.get("infoTail") or []:
            if not isinstance(sample, Mapping):
                continue
            terminal = sample.get("terminalReason")
            truncated = sample.get("truncatedReason")
            if terminal:
                terminal_reasons[str(terminal)] += 1
            if truncated:
                truncated_reasons[str(truncated)] += 1
            effective = sample.get("effectiveEnvironment") if isinstance(sample.get("effectiveEnvironment"), Mapping) else {}
            if effective.get("mapKey"):
                effective_maps[str(effective.get("mapKey"))] += 1
            if effective.get("domainMode"):
                effective_modes[str(effective.get("domainMode"))] += 1
            reward_breakdown = sample.get("rewardBreakdown") if isinstance(sample.get("rewardBreakdown"), Mapping) else {}
            for key, value in reward_breakdown.items():
                number = _number(value)
                if number is not None:
                    reward_totals[str(key)] += number

    action = _action_summary(telemetry_reports)
    return {
        "envCount": len(workers),
        "okWorkerCount": sum(1 for worker in workers if worker.get("ok")),
        "totalStepsObserved": sum(int(worker.get("stepsObserved") or 0) for worker in workers),
        "totalDoneCount": sum(int(worker.get("doneCount") or 0) for worker in workers),
        "runtimeErrorCount": int(runtime_errors),
        "timeoutCount": int(timeout_count),
        "bridgeFailureCount": int(bridge_failures),
        "rewardBreakdownTotals": {key: round(float(value), 6) for key, value in sorted(reward_totals.items())},
        "terminalReasonCounts": _counter_dict(terminal_reasons),
        "truncatedReasonCounts": _counter_dict(truncated_reasons),
        "effectiveMapCounts": _counter_dict(effective_maps),
        "effectiveModeCounts": _counter_dict(effective_modes),
        "actionSafety": action,
        "actionSafetyGreen": bool(
            action["totalActions"] > 0
            and action["invalidActionCount"] == 0
            and action["sanitizerCount"] == 0
            and action["postDecodeClampCount"] == 0
            and action["vetoCount"] == 0
        ),
    }


def _run_env_scale_smoke(
    *,
    spec: EnvScaleSpec,
    config: Mapping[str, Any],
    config_path: Path,
    command: str,
) -> dict[str, Any]:
    env_cfg = config["env"]
    run_id = _run_id(spec.env_count)
    run_dir = BT93K_ROOT / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    stdout_path = run_dir / "stdout.log"
    stderr_path = run_dir / "stderr.log"
    heartbeat_path = run_dir / "heartbeat.jsonl"
    snapshot_manifest_path = run_dir / "snapshot_manifest.json"
    eval_snapshot_path = run_dir / "eval_snapshot.json"
    artifact_manifest_path = run_dir / "artifact_manifest.json"
    run_exit_report_path = run_dir / "run_exit_report.json"
    started_at = _utc_now()
    start_perf = time.perf_counter()
    stdout_lines = [
        f"{started_at} starting BT93K.4 {spec.env_count}-env smoke",
        f"config={_rel(config_path)}",
        f"stepsPerEnv={env_cfg['stepsPerEnv']}",
    ]
    stderr_lines: list[str] = []
    _append_jsonl(heartbeat_path, {
        "timestamp": started_at,
        "runId": run_id,
        "pid": os.getpid(),
        "activeSidecarPids": [],
        "progressTimesteps": 0,
        "lastSnapshotPath": None,
        "lastEvalSnapshotPath": None,
    })

    workers: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=spec.env_count) as executor:
        futures = [
            executor.submit(
                _run_worker,
                env_index=index,
                seed=spec.seed_base + index,
                run_id=run_id,
                env_cfg=env_cfg,
            )
            for index in range(spec.env_count)
        ]
        for future in as_completed(futures):
            worker = future.result()
            workers.append(worker)
            if worker.get("error"):
                stderr_lines.append(f"env{worker['envIndex']}: {worker['error']}")
    workers.sort(key=lambda entry: int(entry["envIndex"]))
    summary = _summarize_workers(workers)
    controller_pids = [
        int(worker["controllerPid"])
        for worker in workers
        if worker.get("controllerPid") is not None
    ]
    finished_at = _utc_now()
    elapsed = round(time.perf_counter() - start_perf, 6)
    ok = bool(
        summary["okWorkerCount"] == spec.env_count
        and summary["totalStepsObserved"] >= spec.env_count
        and summary["runtimeErrorCount"] == 0
        and summary["timeoutCount"] == 0
        and summary["bridgeFailureCount"] == 0
        and summary["actionSafetyGreen"]
    )

    eval_snapshot = {
        "schemaVersion": "bt93k-env-scale-eval-snapshot-v1",
        "generatedAt": finished_at,
        "blockId": "BT93K",
        "phaseId": spec.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "envCount": spec.env_count,
        "sampleClass": "startup-smoke-not-quality-evidence",
        "qualityClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "holdoutUsed": False,
        "summary": summary,
        "workers": workers,
    }
    _write_json(eval_snapshot_path, eval_snapshot)

    snapshot_manifest = {
        "manifestVersion": "bt93k-env-scale-snapshot-v1",
        "generatedAt": finished_at,
        "generatedBy": "python/scripts/bt93k_env_scale_smokes.py",
        "blockId": "BT93K",
        "phaseId": spec.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "envCount": spec.env_count,
        "snapshotClass": "env-startup-final-state",
        "diagnosticOnly": True,
        "candidateRun": False,
        "freezeCandidate": False,
        "promotionAllowed": False,
        "holdoutUsed": False,
        "artifacts": {
            "evalSnapshot": _rel(eval_snapshot_path),
            "evalSnapshotSha256": _sha256_file(eval_snapshot_path),
            "snapshotManifest": _rel(snapshot_manifest_path),
        },
        "summary": {
            "allSidecarsStarted": len(controller_pids) == spec.env_count,
            "allWorkersOk": summary["okWorkerCount"] == spec.env_count,
            "totalStepsObserved": summary["totalStepsObserved"],
            "actionSafetyGreen": summary["actionSafetyGreen"],
        },
    }
    _write_json(snapshot_manifest_path, snapshot_manifest)

    artifact_manifest = {
        "manifestVersion": "bt93k-env-scale-artifacts-v1",
        "generatedAt": finished_at,
        "blockId": "BT93K",
        "phaseId": spec.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "envCount": spec.env_count,
        "sourceConfig": {
            "path": _rel(config_path),
            "sha256": _sha256_file(config_path),
        },
        "artifacts": {
            "runExitReport": _rel(run_exit_report_path),
            "snapshotManifest": _rel(snapshot_manifest_path),
            "snapshotManifestSha256": _sha256_file(snapshot_manifest_path),
            "evalSnapshot": _rel(eval_snapshot_path),
            "evalSnapshotSha256": _sha256_file(eval_snapshot_path),
            "heartbeat": _rel(heartbeat_path),
            "stdout": _rel(stdout_path),
            "stderr": _rel(stderr_path),
        },
        "guardrails": dict(config.get("guardrails") or {}),
    }
    _write_json(artifact_manifest_path, artifact_manifest)

    _append_jsonl(heartbeat_path, {
        "timestamp": finished_at,
        "runId": run_id,
        "pid": os.getpid(),
        "activeSidecarPids": controller_pids,
        "progressTimesteps": int(summary["totalStepsObserved"]),
        "lastSnapshotPath": _rel(snapshot_manifest_path),
        "lastEvalSnapshotPath": _rel(eval_snapshot_path),
    })

    run_exit_report = {
        "schemaVersion": "bt93k-run-exit-report-v1",
        "blockId": "BT93K",
        "phaseId": spec.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "command": command,
        "configPath": _rel(config_path),
        "startedAt": started_at,
        "finishedAt": finished_at,
        "elapsedSeconds": elapsed,
        "ok": ok,
        "statusClass": "completed" if ok else "failed",
        "exitCode": 0 if ok else 1,
        "stopReason": "normal-completion" if ok else "technical-stop",
        "gracefulStop": True,
        "forcedStop": False,
        "signal": None,
        "pidTree": {
            "mainPid": os.getpid(),
            "controllerPids": controller_pids,
            "sidecarModel": "one in-process Bt92ControlledBridgeSidecar thread plus one node controller process per env",
        },
        "sidecars": [
            {
                "envIndex": int(worker["envIndex"]),
                "seed": int(worker["seed"]),
                "sessionId": worker["sessionId"],
                "controllerPid": worker.get("controllerPid"),
                "started": worker.get("controllerPid") is not None,
                "closed": True,
                "exitCode": 0 if worker.get("ok") else 1,
                "statusClass": "completed" if worker.get("ok") else "failed",
            }
            for worker in workers
        ],
        "heartbeat": {
            "path": _rel(heartbeat_path),
            "lastTimestamp": finished_at,
            "stale": False,
            "writeCount": 2,
        },
        "stdoutPath": _rel(stdout_path),
        "stderrPath": _rel(stderr_path),
        "runDirectory": _rel(run_dir),
        "snapshotManifestPath": _rel(snapshot_manifest_path),
        "evalSnapshotPath": _rel(eval_snapshot_path),
        "artifactManifestPath": _rel(artifact_manifest_path),
        "metricsSummary": summary,
        "guardrails": {
            "sampleClass": "startup-smoke-not-quality-evidence",
            "qualityClaimAllowed": False,
            "comparisonStarted": False,
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "runtimeSurfacesTouched": [],
        },
    }
    _write_json(run_exit_report_path, run_exit_report)
    stdout_lines.append(f"{finished_at} completed ok={ok} totalSteps={summary['totalStepsObserved']}")
    stdout_path.write_text("\n".join(stdout_lines) + "\n", encoding="utf-8")
    stderr_path.write_text("\n".join(stderr_lines) + ("\n" if stderr_lines else ""), encoding="utf-8")

    return {
        "envCount": spec.env_count,
        "phaseItem": spec.phase_item,
        "ok": ok,
        "runId": run_id,
        "runDirectory": _rel(run_dir),
        "runExitReport": _rel(run_exit_report_path),
        "runExitReportSha256": _sha256_file(run_exit_report_path),
        "snapshotManifest": _rel(snapshot_manifest_path),
        "snapshotManifestSha256": _sha256_file(snapshot_manifest_path),
        "evalSnapshot": _rel(eval_snapshot_path),
        "evalSnapshotSha256": _sha256_file(eval_snapshot_path),
        "artifactManifest": _rel(artifact_manifest_path),
        "artifactManifestSha256": _sha256_file(artifact_manifest_path),
        "summary": summary,
    }


def _source_checks() -> dict[str, bool]:
    return {
        "curviosEnvExposesControllerPidAndDiagnostics": _file_contains(
            CURVIOS_ENV_PATH,
            "def get_diagnostics",
            "def controller_pid",
        ),
        "actionSurfaceReportsSafetyTelemetry": _file_contains(
            ACTION_SURFACE_PATH,
            "get_telemetry_report",
            "preSamplingMaskRate",
            "postDecodeClampRate",
            "invalidActionRate",
            "sanitizerRate",
        ),
        "singleEnvBridgeSupportsModeAndCurriculumArgs": _file_contains(
            SINGLE_ENV_BRIDGE_PATH,
            "--domain-mode",
            "--mode-path",
            "--curriculum-step-offset",
        ),
        "headlessRunnerReportsEffectiveEnvironment": _file_contains(
            HEADLESS_RUNNER_PATH,
            "effectiveEnvironment",
            "curriculumTotalEnvSteps",
        ),
    }


def build_report(*, config_path: Path, command: str) -> dict[str, Any]:
    config = _read_json(config_path)
    if config.get("blockId") != "BT93K" or config.get("phaseId") != "93K.4":
        raise RuntimeError(f"wrong BT93K.4 config scope: {_rel(config_path)}")
    artifacts = config.get("artifacts") if isinstance(config.get("artifacts"), Mapping) else {}
    prerequisites = {
        "supervisorContract": _repo_path(str(artifacts["supervisorContract"])),
        "modeMapSmoke": _repo_path(str(artifacts["modeMapSmoke"])),
        "signalMetricContract": _repo_path(str(artifacts["signalMetricContract"])),
    }
    prerequisite_status = {
        key: {
            "path": _rel(path),
            "exists": path.exists(),
            "ok": (_read_json(path).get("ok") is True) if path.exists() else False,
            "sha256": _sha256_file(path),
        }
        for key, path in prerequisites.items()
    }
    if not all(entry["ok"] for entry in prerequisite_status.values()):
        raise RuntimeError("BT93K.4 is blocked by missing supervisor, mode/map, or signal contract prerequisite")

    env_cfg = config["env"]
    env_counts = [int(value) for value in env_cfg["envCounts"]]
    phase_items = {2: "93K.4.1", 4: "93K.4.2", 6: "93K.4.3"}
    specs = [
        EnvScaleSpec(
            env_count=env_count,
            seed_base=int(env_cfg["seedBase"]) + (env_count * 100),
            phase_item=phase_items.get(env_count, "93K.4"),
        )
        for env_count in env_counts
    ]
    runs = [
        _run_env_scale_smoke(
            spec=spec,
            config=config,
            config_path=config_path,
            command=command,
        )
        for spec in specs
    ]
    run_by_count = {int(run["envCount"]): run for run in runs}
    all_runs_ok = all(bool(run.get("ok")) for run in runs)
    source_checks = _source_checks()
    phase_coverage = {
        "93K.4.1": bool(
            run_by_count.get(2, {}).get("ok")
            and run_by_count[2]["summary"]["actionSafetyGreen"]
            and run_by_count[2]["runExitReport"]
            and run_by_count[2]["snapshotManifest"]
            and run_by_count[2]["evalSnapshot"]
        ),
        "93K.4.2": bool(
            run_by_count.get(4, {}).get("ok")
            and run_by_count[4]["summary"]["actionSafetyGreen"]
        ),
        "93K.4.3": bool(
            run_by_count.get(6, {}).get("ok")
            and run_by_count[6]["summary"]["okWorkerCount"] == 6
            and run_by_count[6]["summary"]["runtimeErrorCount"] == 0
        ),
        "93K.4.4": bool(all_runs_ok),
    }
    comparison_preparation = {
        "status": "prepared-not-started" if all_runs_ok else "blocked",
        "comparisonStarted": False,
        "qualityClaimAllowed": False,
        "preparedCommandBlueprint": (
            "future 100k 2/4/6 comparison must use a separate claimed phase, "
            "write run_exit_report.json/snapshot_manifest.json/eval_snapshot.json per run, "
            "and remain blocked by any missing exit code, stdout/stderr-only result, or forced stop without final report"
        ),
        "blockedReasons": [] if all_runs_ok else [
            f"{run['envCount']}env-smoke-red" for run in runs if not run.get("ok")
        ],
    }
    ok = bool(all(phase_coverage.values()) and all(source_checks.values()))
    report = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_env_scale_smokes.py",
        "gitSha": _git_sha(),
        "ok": ok,
        "blockId": "BT93K",
        "phaseId": "93K.4",
        "resultClass": "env-scale-smoke-ready" if ok else "env-scale-smoke-red",
        "phaseCoverage": phase_coverage,
        "summary": {
            "envCounts": env_counts,
            "allRunsOk": all_runs_ok,
            "runCount": len(runs),
            "totalStepsObserved": sum(int(run["summary"]["totalStepsObserved"]) for run in runs),
            "qualityClaimAllowed": False,
            "bt94aClaimAllowed": False,
        },
        "prerequisites": prerequisite_status,
        "runs": runs,
        "comparisonPreparation": comparison_preparation,
        "sourceChecks": source_checks,
        "sourceArtifacts": {
            "config": _source(config_path, "BT93K.4 env-scale smoke config"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python Curvios env"),
            "actionSurface": _source(ACTION_SURFACE_PATH, "PPO action telemetry wrapper"),
            "singleEnvBridge": _source(SINGLE_ENV_BRIDGE_PATH, "Node single env bridge CLI"),
            "headlessRunner": _source(HEADLESS_RUNNER_PATH, "JS headless runner"),
        },
        "quarantine": {
            "userOwned3mPath": _rel(USER_OWNED_3M_ROOT),
            "userOwned3mExists": USER_OWNED_3M_ROOT.exists(),
            "userOwned4EnvPath": _rel(USER_OWNED_4ENV_ROOT),
            "userOwned4EnvExists": USER_OWNED_4ENV_ROOT.exists(),
            "usedAsBt93kClosureEvidence": False,
            "classification": "diagnostic-only-not-closure-evidence",
        },
        "guardrails": {
            "startupSmokeOnly": True,
            "trainingStarted": False,
            "comparisonStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "holdoutUsed": False,
        },
        "commands": {
            "write": "python python/scripts/bt93k_env_scale_smokes.py --write-report",
        },
    }
    return report


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
        "output": _rel(output),
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
