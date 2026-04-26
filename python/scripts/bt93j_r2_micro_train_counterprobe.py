"""BT93J.5a R2 micro-train counterprobe report.

The script prepares and closes the R2 counterprobe around the real train/eval
commands. It never starts holdout, candidate, freeze, promote, PPO-Validate,
long-run, rollout, or runtime integration work.
"""

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
BT93J_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93j"

DIAGNOSTIC_SPLIT_PATH = BT93J_ROOT / "diagnostic_split_report.json"
PILOT_READINESS_PATH = BT93J_ROOT / "pilot_readiness_report.json"
R1_REPORT_PATH = BT93J_ROOT / "r1_micro_test_report.json"
MATRIX_REPORT_PATH = BT93J_ROOT / "matrix_contract_report.json"
DEFAULT_OUTPUT = BT93J_ROOT / "r2_micro_train_counterprobe_report.json"
TRAIN_POINTER_PATH = BT93J_ROOT / "latest_bt93j_r2_micro_train_counterprobe.json"
EVAL_POINTER_PATH = BT93J_ROOT / "latest_bt93j_r2_micro_train_counterprobe_eval.json"

R2_RUN_KIND = "bt93j-r2-micro-train-counterprobe"
R2_EVAL_RUN_KIND = "bt93j-r2-micro-train-counterprobe-eval"
R2_HYPOTHESIS = (
    "R1 reward-signal fix may reduce player-dead-only terminal behavior only if a bounded "
    "micro-train shows eval terminal diversity or avgSteps trend improvement without action "
    "safety or runtime regression."
)
R2_COUNTERPROBE = (
    "Run one bounded micro-train from the BT93I model package with R1 reward signals, then "
    "eval only on the reserved eval lane; classify trend-green, same-red, new-red, or "
    "measurement-invalid. Holdout stays unused."
)
EXPECTED_BLOCKERS = {
    "terminal_matrix_start_capable",
    "not_player_dead_only",
    "micro_test_trend_improvement",
}
NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no holdout, long-run, baseline, PPO-Validate, or pilot from BT93J.5a",
    "only trend-green may refresh pilot readiness; all other R2 classes block 93J.6",
    "runtime, AI-Hub, strategy flag, model registry, rollback, bridge, and authority surfaces stay read-only",
)


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
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


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


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _artifact_from_pointer(pointer_path: Path, report_key: str) -> tuple[Path, dict[str, Any], dict[str, Any]]:
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer[report_key]))
    return report_path, _read_json(report_path), pointer


def _precondition_checks(
    diagnostic_split: Mapping[str, Any],
    pilot_readiness: Mapping[str, Any],
    r1_report: Mapping[str, Any],
) -> list[dict[str, Any]]:
    blocking_checks = set(_get(pilot_readiness, "pilotReadiness", "blockingChecks") or [])
    return [
        {
            "id": "r1_green",
            "ok": r1_report.get("resultClass") == "green" and _get(r1_report, "classification", "green") is True,
            "observed": r1_report.get("resultClass"),
        },
        {
            "id": "ready_for_training_false",
            "ok": _get(pilot_readiness, "pilotReadiness", "readyForTraining") is False,
            "observed": _get(pilot_readiness, "pilotReadiness", "readyForTraining"),
        },
        {
            "id": "expected_blockers_exact",
            "ok": blocking_checks == EXPECTED_BLOCKERS,
            "observed": sorted(blocking_checks),
            "expected": sorted(EXPECTED_BLOCKERS),
        },
        {
            "id": "diagnostic_primary_cause_pinned",
            "ok": _get(diagnostic_split, "primaryCause", "id")
            == "reward-curriculum-survival-only-player-dead-policy",
            "observed": _get(diagnostic_split, "primaryCause", "id"),
        },
    ]


def _prior_eval_lane(matrix_report: Mapping[str, Any]) -> Mapping[str, Any]:
    lanes = matrix_report.get("laneContracts")
    if isinstance(lanes, list):
        for lane in lanes:
            if isinstance(lane, Mapping) and lane.get("laneId") == "eval":
                return lane
    return {}


def _action_safety_status(action_telemetry: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "invalidActionRate": float(action_telemetry.get("invalidActionRate") or 0.0),
        "postDecodeClampRate": float(action_telemetry.get("postDecodeClampRate") or 0.0),
        "sanitizerRate": float(action_telemetry.get("sanitizerRate") or 0.0),
        "vetoRate": float(action_telemetry.get("vetoRate") or 0.0),
        "ok": (
            float(action_telemetry.get("invalidActionRate") or 0.0) == 0.0
            and float(action_telemetry.get("postDecodeClampRate") or 0.0) < 0.5
            and float(action_telemetry.get("sanitizerRate") or 0.0) == 0.0
            and float(action_telemetry.get("vetoRate") or 0.0) < 0.25
        ),
    }


def _classification(
    *,
    preconditions_ok: bool,
    episode_gate_satisfied: bool,
    runtime_error_count: int,
    collapse_signal: bool,
    action_safety_ok: bool,
    start_capable: bool,
    player_dead_only: bool,
    avg_steps_delta: float | None,
    natural_terminal_share: float | None,
) -> str:
    if not preconditions_ok or not episode_gate_satisfied or avg_steps_delta is None:
        return "measurement-invalid"
    if runtime_error_count != 0 or collapse_signal or not action_safety_ok:
        return "new-red"
    if start_capable and not player_dead_only and avg_steps_delta > 0 and (natural_terminal_share or 0.0) > 0.0:
        return "trend-green"
    if player_dead_only or not start_capable or avg_steps_delta <= 0:
        return "same-red"
    return "measurement-invalid"


def _prepare_diagnostic_split(status: str, report: Mapping[str, Any] | None = None) -> dict[str, Any]:
    diagnostic_split = _read_json(DIAGNOSTIC_SPLIT_PATH)
    iterations = list(_get(diagnostic_split, "iterativeLoop", "iterations") or [])
    iterations = [entry for entry in iterations if not (isinstance(entry, Mapping) and entry.get("id") == "R2")]
    r2_entry: dict[str, Any] = {
        "id": "R2",
        "status": status,
        "runKind": R2_RUN_KIND,
        "evalRunKind": R2_EVAL_RUN_KIND,
        "hypothesis": R2_HYPOTHESIS,
        "counterprobe": R2_COUNTERPROBE,
        "holdoutUsed": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "evidence": _rel(DEFAULT_OUTPUT),
    }
    if report is not None:
        r2_entry.update(
            {
                "resultClass": report.get("resultClass"),
                "runId": _get(report, "microTrain", "runId"),
                "evalRunId": _get(report, "evalCounterprobe", "runId"),
                "decision": report.get("resultClass"),
                "metricImprovementProven": report.get("resultClass") == "trend-green",
                "newRedSymptoms": report.get("resultClass") == "new-red",
            }
        )
    iterations.append(r2_entry)
    updated = json.loads(json.dumps(diagnostic_split))
    updated["generatedAt"] = _utc_now()
    updated["generatedBy"] = "python/scripts/bt93j_r2_micro_train_counterprobe.py"
    updated["gitSha"] = _git_sha()
    updated["phaseId"] = "93J.5a"
    updated["r2MicroTrainCounterprobe"] = {
        "path": _rel(DEFAULT_OUTPUT),
        "resultClass": report.get("resultClass") if report is not None else "prepared",
        "trendGreen": report.get("resultClass") == "trend-green" if report is not None else False,
        "holdoutUsed": False,
        "pilotReadinessRefreshAllowed": report.get("resultClass") == "trend-green" if report is not None else False,
    }
    updated["iterativeLoop"] = {
        **(updated.get("iterativeLoop") if isinstance(updated.get("iterativeLoop"), Mapping) else {}),
        "currentIteration": "R2",
        "iterations": iterations,
        "r2r3Gate": {
            "r2Started": True,
            "r3Started": False,
            "currentlyAllowed": status == "prepared",
            "allowedOnlyWith": [
                "R1 green",
                "readyForTraining=false",
                "exact blockers terminal_matrix_start_capable, not_player_dead_only, micro_test_trend_improvement",
                "new R2 counterprobe evidence",
            ],
            "reason": R2_COUNTERPROBE,
        },
    }
    updated["phaseCoverage"] = {
        **(updated.get("phaseCoverage") if isinstance(updated.get("phaseCoverage"), Mapping) else {}),
        **(report.get("phaseCoverage") if isinstance(report, Mapping) else {}),
    }
    result_class = report.get("resultClass") if report is not None else "prepared"
    updated["nextDiagnosticPhase"] = "93J.6" if result_class == "trend-green" else "93J.6-blocked"
    updated["readyForTraining"] = False
    updated["repairConstraints"] = {
        **(updated.get("repairConstraints") if isinstance(updated.get("repairConstraints"), Mapping) else {}),
        "pilotAllowed": False,
        "longRunAllowed": False,
        "holdoutAllowed": False,
        "candidateFreezeAllowed": False,
        "bt94aClaimAllowed": False,
    }
    return updated


def build_report() -> dict[str, Any]:
    diagnostic_split = _read_json(DIAGNOSTIC_SPLIT_PATH)
    pilot_readiness = _read_json(PILOT_READINESS_PATH)
    r1_report = _read_json(R1_REPORT_PATH)
    matrix_report = _read_json(MATRIX_REPORT_PATH)
    train_report_path, train_report, train_pointer = _artifact_from_pointer(TRAIN_POINTER_PATH, "report")
    eval_report_path, eval_report, eval_pointer = _artifact_from_pointer(EVAL_POINTER_PATH, "report")
    manifest_path = _repo_path(str(train_pointer["artifactManifest"]))
    manifest = _read_json(manifest_path)

    preconditions = _precondition_checks(diagnostic_split, pilot_readiness, r1_report)
    preconditions_ok = all(check["ok"] for check in preconditions)
    eval_diagnostics = eval_report.get("diagnostics") if isinstance(eval_report.get("diagnostics"), Mapping) else {}
    reward_safety = eval_diagnostics.get("rewardSafetyDiagnostics") if isinstance(eval_diagnostics.get("rewardSafetyDiagnostics"), Mapping) else {}
    survival_kpis = eval_diagnostics.get("survivalKpis") if isinstance(eval_diagnostics.get("survivalKpis"), Mapping) else {}
    failure = eval_diagnostics.get("failureSemantics") if isinstance(eval_diagnostics.get("failureSemantics"), Mapping) else {}
    learning = train_report.get("learning") if isinstance(train_report.get("learning"), Mapping) else {}
    learning_metrics = learning.get("ppoLearningMetrics") if isinstance(learning.get("ppoLearningMetrics"), Mapping) else {}
    artifacts = manifest.get("artifacts") if isinstance(manifest.get("artifacts"), Mapping) else {}
    action_telemetry = reward_safety.get("actionTelemetry") if isinstance(reward_safety.get("actionTelemetry"), Mapping) else {}
    action_safety = _action_safety_status(action_telemetry)

    prior_lane = _prior_eval_lane(matrix_report)
    prior_avg_steps = _get(prior_lane, "avgStepsPerEpisode", "observed")
    current_avg_steps = survival_kpis.get("avgStepsPerEpisodeObserved")
    try:
        avg_steps_delta = float(current_avg_steps) - float(prior_avg_steps)
    except (TypeError, ValueError):
        avg_steps_delta = None
    done_count = int(survival_kpis.get("doneCount") or 0)
    natural_terminal = int(failure.get("naturalTerminal") or 0)
    death_counts = failure.get("deathCauseCounts") if isinstance(failure.get("deathCauseCounts"), Mapping) else {}
    runtime_error_count = int(failure.get("runtimeErrorCount") or 0)
    natural_terminal_share = round(natural_terminal / done_count, 6) if done_count else None
    start_capable = bool(death_counts) and natural_terminal > 0 and runtime_error_count == 0
    player_dead_only = bool(death_counts) and natural_terminal == 0 and int(failure.get("maxSteps") or 0) == 0
    collapse_signal = bool(learning_metrics.get("collapseOrInstabilitySignal"))
    episode_gate_satisfied = _get(eval_report, "episodeTargetGate", "satisfied") is True
    result_class = _classification(
        preconditions_ok=preconditions_ok,
        episode_gate_satisfied=episode_gate_satisfied,
        runtime_error_count=runtime_error_count,
        collapse_signal=collapse_signal,
        action_safety_ok=action_safety["ok"],
        start_capable=start_capable,
        player_dead_only=player_dead_only,
        avg_steps_delta=avg_steps_delta,
        natural_terminal_share=natural_terminal_share,
    )

    report = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_r2_micro_train_counterprobe.py",
        "gitSha": _git_sha(),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.5a",
        "resultClass": result_class,
        "hypothesis": R2_HYPOTHESIS,
        "counterprobe": R2_COUNTERPROBE,
        "phaseCoverage": {
            "93J.5a.1": preconditions_ok,
            "93J.5a.2": train_report.get("runKind") == R2_RUN_KIND
            and train_report.get("candidateRun") is False
            and train_report.get("freezeCandidate") is False
            and train_report.get("promotionAllowed") is False,
            "93J.5a.3": bool(artifacts.get("modelSha256"))
            and bool(artifacts.get("configSha256"))
            and bool(artifacts.get("vecnormalizeSha256"))
            and bool(artifacts.get("optimizerStateSha256")),
            "93J.5a.4": result_class in {"trend-green", "same-red", "new-red", "measurement-invalid"},
            "93J.5a.5": _get(eval_report, "guardrails", "candidateRun") is False
            and _get(eval_report, "guardrails", "freezeCandidate") is False
            and _get(eval_report, "sourcePackage", "runId") == train_report.get("runId"),
        },
        "preconditions": {
            "ok": preconditions_ok,
            "checks": preconditions,
            "blockingChecks": _get(pilot_readiness, "pilotReadiness", "blockingChecks"),
        },
        "microTrain": {
            "runId": train_report.get("runId"),
            "runKind": train_report.get("runKind"),
            "timesteps": learning.get("requestedTimesteps"),
            "modelNumTimesteps": learning.get("modelNumTimesteps"),
            "optimizerUpdatesBefore": learning.get("optimizerUpdatesBefore"),
            "optimizerUpdatesAfter": learning.get("optimizerUpdatesAfter"),
            "optimizerUpdatesCompleted": learning.get("optimizerUpdatesCompleted"),
            "wallClockSeconds": learning.get("wallClockSeconds"),
            "seeds": _get(train_report, "gateInputs", "matrix", "seeds", "train"),
        },
        "modelPackage": {
            "artifactManifest": _rel(manifest_path),
            "modelSha256": artifacts.get("modelSha256"),
            "configSha256": artifacts.get("configSha256"),
            "normalizeStateSha256": artifacts.get("vecnormalizeSha256"),
            "optimizerStateSha256": artifacts.get("optimizerStateSha256"),
            "sourceArtifactManifest": _get(train_report, "resumedFrom", "artifactManifest"),
        },
        "evalCounterprobe": {
            "runId": eval_report.get("runId"),
            "runKind": eval_report.get("runKind"),
            "report": _rel(eval_report_path),
            "episodeTargetGate": eval_report.get("episodeTargetGate"),
            "holdoutUsed": False,
            "seeds": _get(train_report, "gateInputs", "matrix", "seeds", "eval"),
        },
        "terminalMatrix": {
            "runtimeErrorCount": runtime_error_count,
            "terminalReasonCounts": failure.get("terminalReasonCounts") or {},
            "deathCauseCounts": death_counts,
            "truncatedReasonCounts": failure.get("truncatedReasonCounts") or {},
            "naturalTerminal": natural_terminal,
            "naturalTerminalShare": natural_terminal_share,
            "maxSteps": int(failure.get("maxSteps") or 0),
            "startCapableTerminalMatrix": start_capable,
            "playerDeadOnly": player_dead_only,
        },
        "avgStepsTrend": {
            "priorEvalRunId": prior_lane.get("runId"),
            "priorAvgStepsPerEpisode": prior_avg_steps,
            "currentAvgStepsPerEpisodeObserved": current_avg_steps,
            "delta": round(avg_steps_delta, 6) if avg_steps_delta is not None else None,
            "improved": avg_steps_delta is not None and avg_steps_delta > 0,
            "dqnAnchor": _get(matrix_report, "contract", "dqnChampion", "avgStepsPerEpisode"),
        },
        "rewardBreakdown": {
            "totals": reward_safety.get("rewardBreakdownTotals") or {},
            "meanPerStep": reward_safety.get("rewardBreakdownMeanPerStep") or {},
            "rewardTotal": reward_safety.get("rewardTotal"),
            "rewardMean": reward_safety.get("rewardMean"),
            "survivalRewardShare": _get(reward_safety, "rewardHackingSignals", "survivalRewardShare"),
        },
        "actionSafetyTelemetry": {
            **action_safety,
            "raw": action_telemetry,
        },
        "learningMetrics": learning_metrics,
        "classificationRules": {
            "trendGreen": "runtimeErrorCount=0, action safety green, terminal matrix start-capable, not player-dead-only, naturalTerminalShare>0, and avgSteps trend improves against prior eval",
            "sameRed": "player-dead-only, terminal matrix not start-capable, or avgSteps trend does not improve",
            "newRed": "runtime, collapse, or action-safety regression appears",
            "measurementInvalid": "preconditions or eval episode target are not satisfied",
        },
        "findingImpact": {
            "F.05": "still-blocking" if result_class != "trend-green" else "trend-improved-not-closed-without pilot/holdout",
            "F.19": "still-blocking" if not start_capable else "trend-improved-not-closed-without pilot/holdout",
            "F.27": "aggregate-still-blocked; no BT94A gate refresh in 93J.5a",
            "F.31": "still-blocking" if player_dead_only else "trend-improved-not-closed-without pilot/holdout",
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
            "pilotStarted": False,
            "holdoutUsed": False,
            "longRunStarted": False,
            "bt94aGateRefresh": False,
            "pilotReadinessRefreshAllowed": result_class == "trend-green",
            "phase6Allowed": result_class == "trend-green",
            "noGo": list(NO_GO),
        },
        "sourceArtifacts": {
            "diagnosticSplit": _source(DIAGNOSTIC_SPLIT_PATH, "BT93J diagnostic split"),
            "pilotReadiness": _source(PILOT_READINESS_PATH, "BT93J pilot-readiness gate"),
            "r1MicroTest": _source(R1_REPORT_PATH, "BT93J R1 micro-test"),
            "matrixContract": _source(MATRIX_REPORT_PATH, "BT93J matrix contract"),
            "trainReport": _source(train_report_path, "BT93J R2 micro-train report"),
            "artifactManifest": _source(manifest_path, "BT93J R2 model package manifest"),
            "evalReport": _source(eval_report_path, "BT93J R2 eval counterprobe report"),
            "trainPointer": _source(TRAIN_POINTER_PATH, "BT93J mutable train pointer", closure_capable=False),
            "evalPointer": _source(EVAL_POINTER_PATH, "BT93J mutable eval pointer", closure_capable=False),
        },
        "commands": {
            "prepare": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_r2_micro_train_counterprobe.py --prepare",
            "train": "python\\.venv\\Scripts\\python.exe python\\train.py --profile bt93j --run-kind bt93j-r2-micro-train-counterprobe --phase-id 93J.5a --config python\\configs\\ppo_bt93j_r2_micro_train_counterprobe.json --artifact-root data\\training\\ppo\\bt93j --checkpoint data\\training\\ppo\\bt93i\\latest_terminal_curriculum_repair.json",
            "eval": "python\\.venv\\Scripts\\python.exe python\\eval.py --profile bt93j --run-kind bt93j-r2-micro-train-counterprobe-eval --phase-id 93J.5a --config python\\configs\\ppo_bt93j_r2_micro_train_counterprobe.json --artifact-root data\\training\\ppo\\bt93j --checkpoint data\\training\\ppo\\bt93j\\latest_bt93j_r2_micro_train_counterprobe.json --min-completed-episodes 6 --max-eval-steps 900",
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_r2_micro_train_counterprobe.py --write-reports",
        },
    }
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare or write BT93J.5a R2 counterprobe report.")
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--write-reports", action="store_true")
    args = parser.parse_args()

    diagnostic_split = _read_json(DIAGNOSTIC_SPLIT_PATH)
    pilot_readiness = _read_json(PILOT_READINESS_PATH)
    r1_report = _read_json(R1_REPORT_PATH)
    preconditions = _precondition_checks(diagnostic_split, pilot_readiness, r1_report)
    preconditions_ok = all(check["ok"] for check in preconditions)
    if args.prepare:
        if not preconditions_ok:
            raise SystemExit(json.dumps({"ok": False, "checks": preconditions}, indent=2, sort_keys=True))
        _write_json(DIAGNOSTIC_SPLIT_PATH, _prepare_diagnostic_split("prepared"))
        print(json.dumps({"ok": True, "prepared": True, "r2RunKind": R2_RUN_KIND}, indent=2, sort_keys=True))
        return 0

    report = build_report()
    if args.write_reports:
        _write_json(DEFAULT_OUTPUT, report)
        _write_json(DIAGNOSTIC_SPLIT_PATH, _prepare_diagnostic_split("completed", report))
    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "phase6Allowed": _get(report, "guardrails", "phase6Allowed"),
                "wrote": _rel(DEFAULT_OUTPUT) if args.write_reports else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
