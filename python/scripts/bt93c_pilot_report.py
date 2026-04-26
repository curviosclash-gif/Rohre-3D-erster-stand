"""BT93C pilot ladder and pilot verdict report."""

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
DEFAULT_CONFIG = PYTHON_ROOT / "configs" / "ppo_bt93c_pilot.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


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
    report_value = pointer.get("report")
    if not report_value:
        return pointer, None, None
    report_path = (REPO_ROOT / str(report_value)).resolve()
    return pointer, _read_json(report_path), report_path


def _status_all_true(payload: Mapping[str, Any]) -> bool:
    return all(value is True for value in payload.values())


def _number(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def build_ladder(root: Path, config_path: Path) -> dict[str, Any]:
    config = _read_json(config_path)
    start_manifest_path = root / "start_manifest.json"
    diagnostics_path = root / "diagnostics_report.json"
    start_manifest = _read_json(start_manifest_path)
    diagnostics = _read_json(diagnostics_path)
    rollout = config["rollout"]
    env = config["env"]
    budget = start_manifest.get("budget") or {}
    diagnostic_budget = diagnostics.get("latencyAndThroughputBudget") or {}
    diagnostic_gate = diagnostics.get("gateInterpretation") or {}
    train_timesteps = int(rollout["pilotTimesteps"])
    diagnostic_steps_per_second = _number(diagnostic_budget.get("trainingStepsPerSecond"))
    target_window_seconds = int(budget.get("targetUpdateWindowSeconds") or 15)
    estimated_seconds = (
        round(train_timesteps / diagnostic_steps_per_second, 6)
        if diagnostic_steps_per_second > 0
        else None
    )
    latest_model_pointer, latest_model_report, latest_model_report_path = _pointer_report(root, "latest_model_package.json")

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_pilot_report.py",
        "blockId": "BT93C",
        "phaseId": "93C.5.1",
        "claim": "93C-Pilot",
        "gitSha": _git_sha(),
        "ladder": [
            {
                "stage": "learner-smoke",
                "status": "completed",
                "evidence": "data/training/ppo/bt93c/latest_model_package.json",
            },
            {
                "stage": "pilot",
                "status": "defined",
                "trainCommand": "python/train.py --profile bt93c --run-kind pilot-train --phase-id 93C.5.2 --config python/configs/ppo_bt93c_pilot.json",
                "evalCommand": "python/eval.py --profile bt93c --run-kind pilot-eval --phase-id 93C.5.2 --config python/configs/ppo_bt93c_pilot.json",
            },
            {
                "stage": "baseline",
                "status": "locked-until-pilot-go",
                "allowedBeforePilotGo": False,
            },
        ],
        "budgetDecision": {
            "sourceArtifacts": [
                _rel(start_manifest_path),
                _rel(diagnostics_path),
            ],
            "startManifestMeasuredStepsPerSecond": budget.get("measuredStepsPerSecond"),
            "diagnosticStepsPerSecond": diagnostic_steps_per_second,
            "targetWindowSeconds": target_window_seconds,
            "pilotTimesteps": train_timesteps,
            "pilotEvalSteps": int(rollout["evalSteps"]),
            "envCount": int(env["envCount"]),
            "evalEnvCount": int(env["evalEnvCount"]),
            "maxStepsPerEpisode": int(env["maxStepsPerEpisode"]),
            "estimatedPilotTrainSecondsFromDiagnosticThroughput": estimated_seconds,
            "withinMeasuredWindow": estimated_seconds is not None and estimated_seconds <= target_window_seconds,
            "nStepsPerEnv": int(rollout["nStepsPerEnv"]),
            "batchSize": int(rollout["batchSize"]),
            "selectionRule": rollout["budgetRule"],
        },
        "gateInputs": {
            "diagnosticsResultClass": diagnostics.get("resultClass"),
            "pilotAllowedByDiagnostics": bool(diagnostic_gate.get("pilotAllowedByThisReport") is True),
            "baselineAllowedByDiagnostics": bool(diagnostic_gate.get("baselineAllowedByThisReport") is True),
            "collapseOrInstabilitySignal": bool(
                ((diagnostics.get("ppoLearningMetrics") or {}).get("collapseOrInstabilitySignal")) is True
            ),
            "latestModelPackage": latest_model_pointer,
            "latestModelTrainingReport": _rel(latest_model_report_path) if latest_model_report_path else None,
            "latestModelReportOk": bool((latest_model_report or {}).get("ok") is True),
        },
        "matrix": {
            "modeId": env["modeId"],
            "trainSeeds": list(env["trainSeeds"]),
            "evalSeeds": list(env["evalSeeds"]),
            "holdoutSeeds": list(env["holdoutSeeds"]),
            "holdoutStatus": env["holdoutStatus"],
            "fourEnvStatus": "locked; direct 4-env evidence is still absent",
        },
        "guardrails": {
            "pilotIsBaseline": False,
            "baselineRunsStarted": False,
            "promotionAllowed": False,
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
        },
        "artifacts": {
            "config": _rel(config_path),
            "configSha256": _sha256_file(config_path),
            "ladderManifest": "data/training/ppo/bt93c/pilot_ladder_manifest.json",
        },
    }


def build_pilot_report(root: Path, config_path: Path) -> dict[str, Any]:
    ladder = build_ladder(root, config_path)
    train_pointer, train_report, train_report_path = _pointer_report(root, "latest_pilot_train.json")
    eval_pointer, eval_report, eval_report_path = _pointer_report(root, "latest_pilot_eval.json")

    if not train_report or not eval_report:
        result_class = "pilot-not-run"
        status_checks: dict[str, bool] = {
            "trainingReportPresent": bool(train_report),
            "evalReportPresent": bool(eval_report),
        }
    else:
        learning = train_report.get("learning") or {}
        metrics = learning.get("ppoLearningMetrics") or {}
        diagnostics = (eval_report.get("diagnostics") or {})
        failure = diagnostics.get("failureSemantics") or {}
        reward_safety = diagnostics.get("rewardSafetyDiagnostics") or {}
        action_telemetry = reward_safety.get("actionTelemetry") or {}
        latency = diagnostics.get("latencyAndThroughputBudget") or {}
        target_window_seconds = int(ladder["budgetDecision"]["targetWindowSeconds"])
        status_checks = {
            "trainingOk": train_report.get("ok") is True,
            "evalOk": eval_report.get("ok") is True,
            "truePpoOptimizerUpdate": train_report.get("truePpoOptimizerUpdate") is True,
            "collapseThresholdsGreen": _status_all_true(metrics.get("thresholdStatus") or {}),
            "noCollapseSignal": metrics.get("collapseOrInstabilitySignal") is False,
            "runtimeErrorCountZero": int(failure.get("runtimeErrorCount") or 0) == 0,
            "noCrashTimeoutForcedOrSocketFailure": all(
                int(failure.get(key) or 0) == 0
                for key in ("crash", "timeout", "forcedRound", "socketClose", "teardownFailure")
            ),
            "invalidActionRateZero": _number(action_telemetry.get("invalidActionRate")) == 0.0,
            "sanitizerRateZero": _number(action_telemetry.get("sanitizerRate")) == 0.0,
            "withinPilotWindow": _number(learning.get("wallClockSeconds"), target_window_seconds + 1)
            <= target_window_seconds,
            "positiveThroughput": _number(learning.get("stepsPerSecond")) > 0.0,
            "pilotNotBaseline": (
                train_report.get("baselineRunsStarted", train_report.get("guardrails", {}).get("baselineRunsStarted", False))
                is False
                and eval_report.get("guardrails", {}).get("baselineRunsStarted", False) is False
            ),
        }
        if not status_checks["positiveThroughput"] or not status_checks["withinPilotWindow"]:
            result_class = "diagnose: throughput insufficient"
        elif _status_all_true(status_checks):
            result_class = "pilot go"
        else:
            result_class = "pilot unsafe"

    return {
        "ok": result_class == "pilot go",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_pilot_report.py",
        "blockId": "BT93C",
        "phaseId": "93C.5.2",
        "claim": "93C-Pilot",
        "gitSha": _git_sha(),
        "resultClass": result_class,
        "phaseCoverage": {
            "93C.5.1": True,
            "93C.5.2": result_class in {"pilot go", "pilot unsafe", "diagnose: throughput insufficient"},
            "93C.5.3": False,
            "93C.5.4": False,
            "93C.5.5": False,
        },
        "pilotStatusChecks": status_checks,
        "baselineDecision": {
            "baselineRunsStarted": False,
            "pilotIsBaseline": False,
            "baselineNextAllowed": result_class == "pilot go",
            "baselineStillRequires93C53To93C55": True,
        },
        "sourceReports": {
            "ladderManifest": {
                "report": "data/training/ppo/bt93c/pilot_ladder_manifest.json",
                "sha256": _sha256_file(root / "pilot_ladder_manifest.json")
                if (root / "pilot_ladder_manifest.json").exists()
                else None,
            },
            "pilotTrain": {
                "pointer": _rel(root / "latest_pilot_train.json") if train_pointer else None,
                "runId": (train_pointer or {}).get("runId"),
                "report": _rel(train_report_path) if train_report_path else None,
                "sha256": _sha256_file(train_report_path) if train_report_path else None,
            },
            "pilotEval": {
                "pointer": _rel(root / "latest_pilot_eval.json") if eval_pointer else None,
                "runId": (eval_pointer or {}).get("runId"),
                "report": _rel(eval_report_path) if eval_report_path else None,
                "sha256": _sha256_file(eval_report_path) if eval_report_path else None,
            },
        },
        "pilotMetrics": {
            "training": (train_report or {}).get("learning"),
            "eval": (eval_report or {}).get("eval"),
            "diagnostics": (eval_report or {}).get("diagnostics"),
        },
        "ladderSnapshot": ladder,
        "guardrails": {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "baselineRunsStarted": False,
            "pilotRunsStarted": bool(train_report and eval_report),
            "promotionAllowed": False,
            "fourEnvAllowed": False,
        },
        "artifacts": {
            "pilotLadderManifest": "data/training/ppo/bt93c/pilot_ladder_manifest.json",
            "pilotReport": "data/training/ppo/bt93c/pilot_report.json",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-root", default=str(DEFAULT_ROOT))
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--write-ladder", action="store_true")
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    root = Path(args.artifact_root).resolve()
    config_path = Path(args.config).resolve()
    write_ladder = args.write_ladder or not args.write_report
    wrote: dict[str, str] = {}
    if write_ladder:
        ladder = build_ladder(root, config_path)
        ladder_path = root / "pilot_ladder_manifest.json"
        _write_json(ladder_path, ladder)
        wrote["pilotLadderManifest"] = _rel(ladder_path)
    if args.write_report:
        report = build_pilot_report(root, config_path)
        report_path = root / "pilot_report.json"
        _write_json(report_path, report)
        wrote["pilotReport"] = _rel(report_path)
    print(json.dumps({"ok": True, "wrote": wrote}, indent=2))


if __name__ == "__main__":
    main()
