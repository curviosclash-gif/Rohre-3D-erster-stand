"""BT93C conservative baseline report."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
DEFAULT_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
DEFAULT_CONFIG = PYTHON_ROOT / "configs" / "ppo_bt93c_baseline.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


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
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
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


def _pointer_report(root: Path, pointer_name: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None, Path | None]:
    pointer_path = root / pointer_name
    if not pointer_path.exists():
        return None, None, None
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer, _read_json(report_path), report_path


def _number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_baseline_report(root: Path, config_path: Path) -> dict[str, Any]:
    config = _read_json(config_path)
    pilot_report = _read_json(_repo_path(config["artifacts"]["pilotReport"]))
    source_manifest = _read_json(_repo_path(config["artifacts"]["baselineSourceManifest"]))
    train_pointer, train_report, train_report_path = _pointer_report(root, "latest_baseline_train.json")
    eval_pointer, eval_report, eval_report_path = _pointer_report(root, "latest_baseline_eval.json")

    survival = ((eval_report or {}).get("diagnostics") or {}).get("survivalKpis") or {}
    reward_safety = ((eval_report or {}).get("diagnostics") or {}).get("rewardSafetyDiagnostics") or {}
    action_telemetry = reward_safety.get("actionTelemetry") or {}
    failure_semantics = ((eval_report or {}).get("diagnostics") or {}).get("failureSemantics") or {}
    learning = (train_report or {}).get("learning") or {}
    env = config["env"]
    rollout = config["rollout"]
    dqn_anchor = source_manifest.get("comparisonAnchor") or {}
    dqn_metrics = dqn_anchor.get("metrics") or {}

    baseline_timesteps = int(rollout["baselineTimesteps"])
    env_count = int(env["envCount"])
    eval_env_count = int(env["evalEnvCount"])
    no_draft_budget = baseline_timesteps < 300000
    two_env_only = env_count == 2 and eval_env_count == 2
    four_env_locked = config["guardrails"].get("fourEnvAllowed") is False and two_env_only
    training_ok = bool((train_report or {}).get("ok") and (train_report or {}).get("truePpoOptimizerUpdate"))
    eval_ok = bool((eval_report or {}).get("ok") and (eval_report or {}).get("loadedRealPpoModel"))

    status_checks = {
        "pilotGo": pilot_report.get("resultClass") == "pilot go",
        "trainingOk": training_ok,
        "evalOk": eval_ok,
        "baselineRunKind": (train_pointer or {}).get("runKind") == "baseline-train"
        and (eval_pointer or {}).get("runKind") == "baseline-eval",
        "baselineTimestepsConservative": no_draft_budget,
        "twoEnvOnly": two_env_only,
        "fourEnvLocked": four_env_locked,
        "promotionBlocked": config["guardrails"].get("promotionAllowed") is False,
        "runtimeSurfacesUntouched": not ((train_report or {}).get("guardrails") or {}).get("runtimeSurfacesTouched")
        and not ((eval_report or {}).get("guardrails") or {}).get("runtimeSurfacesTouched"),
        "runtimeErrorCountZero": int(failure_semantics.get("runtimeErrorCount") or 0) == 0,
    }
    result_class = "baseline go" if all(status_checks.values()) else "diagnose"

    ppo_metrics = {
        "avgStepsPerEpisode": survival.get("avgStepsPerEpisode"),
        "averageBotSurvival": survival.get("averageBotSurvival"),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "runtimeErrorCount": failure_semantics.get("runtimeErrorCount"),
        "failureClasses": {
            key: failure_semantics.get(key)
            for key in ("crash", "timeout", "forcedRound", "socketClose", "teardownFailure", "maxSteps", "naturalTerminal")
        },
        "invalidActionRate": action_telemetry.get("invalidActionRate"),
        "sanitizerRate": action_telemetry.get("sanitizerRate"),
        "vetoRate": action_telemetry.get("vetoRate"),
        "maskRate": action_telemetry.get("maskRate"),
        "rewardTotal": ((eval_report or {}).get("eval") or {}).get("rewardTotal"),
        "stepsPerSecond": learning.get("stepsPerSecond"),
    }

    return {
        "ok": result_class == "baseline go",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_baseline_report.py",
        "blockId": "BT93C",
        "phaseId": "93C.5.3",
        "claim": "93C-Conservative-Baseline",
        "gitSha": _git_sha(),
        "resultClass": result_class,
        "phaseCoverage": {
            "93C.5.3": result_class in {"baseline go", "diagnose"},
            "93C.5.4": result_class == "baseline go",
            "93C.5.5": four_env_locked,
        },
        "statusChecks": status_checks,
        "baselineLane": {
            "baselineId": "bt93c-ppo-baseline-publish-v1",
            "runScope": "conservative baseline, not promotion",
            "trainCommand": (learning.get("trainingCommand") if train_report else None),
            "evalCommand": "python/eval.py --profile bt93c --run-kind baseline-eval --phase-id 93C.5.3 --config python/configs/ppo_bt93c_baseline.json",
            "envCount": env_count,
            "evalEnvCount": eval_env_count,
            "baselineTimesteps": baseline_timesteps,
            "evalSteps": int(rollout["evalSteps"]),
            "maxStepsPerEpisode": int(env["maxStepsPerEpisode"]),
            "trainSeeds": list(env["trainSeeds"]),
            "evalSeeds": list(env["evalSeeds"]),
            "holdoutSeeds": list(env["holdoutSeeds"]),
            "holdoutStatus": env["holdoutStatus"],
            "budgetRule": rollout["budgetRule"],
        },
        "ppoBaselineMetrics": ppo_metrics,
        "dqnReferenceOnly": {
            "baselineId": dqn_anchor.get("baselineId"),
            "role": dqn_anchor.get("role"),
            "avgStepsPerEpisode": _number(dqn_metrics.get("avgStepsPerEpisode")),
            "averageBotSurvival": _number(dqn_metrics.get("averageBotSurvival")),
            "semanticWindow": dqn_anchor.get("semanticWindow"),
            "comparisonDeferredTo": "93C.6",
        },
        "guardrails": {
            "baselineRunsStarted": True,
            "pilotRequiredResult": "pilot go",
            "promotionAllowed": False,
            "fourEnvAllowed": False,
            "fourEnvStatus": "locked; direct 4-env evidence is still absent",
            "draft300000Allowed": False,
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
        },
        "sourceReports": {
            "pilotReport": {
                "report": _rel(_repo_path(config["artifacts"]["pilotReport"])),
                "sha256": _sha256_file(_repo_path(config["artifacts"]["pilotReport"])),
            },
            "baselineTrain": {
                "pointer": _rel(root / "latest_baseline_train.json") if train_pointer else None,
                "runId": (train_pointer or {}).get("runId"),
                "report": _rel(train_report_path) if train_report_path else None,
                "sha256": _sha256_file(train_report_path) if train_report_path else None,
            },
            "baselineEval": {
                "pointer": _rel(root / "latest_baseline_eval.json") if eval_pointer else None,
                "runId": (eval_pointer or {}).get("runId"),
                "report": _rel(eval_report_path) if eval_report_path else None,
                "sha256": _sha256_file(eval_report_path) if eval_report_path else None,
            },
        },
        "artifacts": {
            "config": _rel(config_path),
            "configSha256": _sha256_file(config_path),
            "baselineReport": "data/training/ppo/bt93c/baseline_report.json",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-root", default=str(DEFAULT_ROOT))
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    root = Path(args.artifact_root).resolve()
    config_path = Path(args.config).resolve()
    report = build_baseline_report(root, config_path)
    wrote: dict[str, str] = {}
    if args.write_report:
        report_path = root / "baseline_report.json"
        _write_json(report_path, report)
        wrote["baselineReport"] = _rel(report_path)
    print(json.dumps({"ok": report["ok"], "resultClass": report["resultClass"], "wrote": wrote}, indent=2))


if __name__ == "__main__":
    main()
