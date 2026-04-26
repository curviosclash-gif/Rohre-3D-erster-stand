"""BT93I.4 eval/holdout matrix report builder."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93I_ROOT = PPO_ROOT / "bt93i"

DEFAULT_REPORT_PATH = BT93I_ROOT / "matrix_green_report.json"
MATRIX_PATH = BT93I_ROOT / "matrix_manifest.json"
READINESS_PATH = BT93I_ROOT / "long_run_readiness_report.json"
REPAIR_REPORT_PATH = BT93I_ROOT / "terminal_curriculum_repair_report.json"
HOLDOUT_GUARD_PATH = BT93I_ROOT / "holdout_guard_report.json"
EVAL_POINTER_PATH = BT93I_ROOT / "latest_terminal_curriculum_repair_eval.json"
HOLDOUT_POINTER_PATH = BT93I_ROOT / "latest_holdout_eval.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(value: str | Path) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


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


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _summary(values: Iterable[Any]) -> dict[str, Any]:
    clean = [float(value) for value in values if _as_float(value) is not None]
    if not clean:
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None, "stdev": None}
    return {
        "count": len(clean),
        "min": round(min(clean), 6),
        "max": round(max(clean), 6),
        "mean": round(sum(clean) / len(clean), 6),
        "median": round(statistics.median(clean), 6),
        "stdev": round(statistics.pstdev(clean), 6) if len(clean) > 1 else 0.0,
    }


def _pct_delta(current: Any, baseline: Any) -> float | None:
    current_value = _as_float(current)
    baseline_value = _as_float(baseline)
    if current_value is None or baseline_value in (None, 0.0):
        return None
    return round(((current_value - baseline_value) / baseline_value) * 100.0, 6)


def _counter(value: Any) -> dict[str, int]:
    if not isinstance(value, Mapping):
        return {}
    return {str(key): _as_int(count) for key, count in sorted(value.items())}


def _pointer_report(pointer_path: Path) -> tuple[Path, dict[str, Any], Path, dict[str, Any]]:
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, pointer, report_path, _read_json(report_path)


def _completed_lengths(report: Mapping[str, Any]) -> list[float]:
    episode = _get(
        report,
        "diagnostics",
        "rewardSafetyDiagnostics",
        "rewardHackingSignals",
        "episodeShorteningCheck",
    ) or {}
    return [float(value) for value in episode.get("completedEpisodeLengths", []) if _as_float(value) is not None]


def _lane_metrics(report: Mapping[str, Any]) -> dict[str, Any]:
    survival = _get(report, "diagnostics", "survivalKpis") or {}
    reward = _get(report, "diagnostics", "rewardSafetyDiagnostics") or {}
    action = _get(reward, "actionTelemetry") or {}
    failure = _get(report, "diagnostics", "failureSemantics") or {}
    completed_lengths = _completed_lengths(report)
    terminal_reason_counts = _counter(failure.get("terminalReasonCounts"))
    death_cause_counts = _counter(failure.get("deathCauseCounts"))
    truncated_reason_counts = _counter(failure.get("truncatedReasonCounts"))
    natural_terminal = _as_int(failure.get("naturalTerminal"))
    max_steps = _as_int(failure.get("maxSteps"))
    return {
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "report": _get(report, "artifacts", "evalReport"),
        "sourceModelSha256": _get(report, "sourcePackage", "modelSha256"),
        "sourceOptimizerStateSha256": _get(report, "sourcePackage", "optimizerStateSha256"),
        "episodeTargetGate": report.get("episodeTargetGate"),
        "avgStepsPerEpisode": survival.get("avgStepsPerEpisode"),
        "averageBotSurvival": survival.get("averageBotSurvival"),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "completedEpisodeCount": survival.get("completedEpisodeCount"),
        "completedEpisodeLengths": completed_lengths,
        "completedEpisodeStats": _summary(completed_lengths),
        "reward": {
            "rewardTotal": reward.get("rewardTotal"),
            "rewardMean": reward.get("rewardMean"),
            "rewardBreakdownTotals": reward.get("rewardBreakdownTotals") or {},
            "safetyOverruleCounts": _get(reward, "rewardHackingSignals", "safetyOverruleCounts") or {},
        },
        "actionTelemetry": {
            "preSamplingMaskRate": action.get("preSamplingMaskRate"),
            "postDecodeClampRate": action.get("postDecodeClampRate"),
            "invalidActionRate": action.get("invalidActionRate"),
            "sanitizerRate": action.get("sanitizerRate"),
            "vetoRate": action.get("vetoRate"),
            "totalActions": action.get("totalActions"),
        },
        "failureClasses": {
            "runtimeErrorCount": _as_int(failure.get("runtimeErrorCount")),
            "crash": _as_int(failure.get("crash")),
            "timeout": _as_int(failure.get("timeout")),
            "forcedRound": _as_int(failure.get("forcedRound")),
            "socketClose": _as_int(failure.get("socketClose")),
            "teardownFailure": _as_int(failure.get("teardownFailure")),
            "maxSteps": max_steps,
            "naturalTerminal": natural_terminal,
            "deathCauseCounts": death_cause_counts,
            "terminalReasonCounts": terminal_reason_counts,
            "truncatedReasonCounts": truncated_reason_counts,
            "playerDeadOnly": set(terminal_reason_counts) == {"player-dead"} and natural_terminal == 0 and max_steps == 0,
            "maxStepsOnly": max_steps > 0 and natural_terminal == 0 and not terminal_reason_counts,
            "startCapableTerminalMatrix": bool(death_cause_counts) and natural_terminal > 0,
        },
    }


def _post_holdout_training_runs(holdout_run_id: str | None) -> list[dict[str, Any]]:
    if not holdout_run_id:
        return []
    runs: list[dict[str, Any]] = []
    for report_path in (BT93I_ROOT / "runs").glob("*/training_report.json"):
        report = _read_json(report_path)
        run_id = str(report.get("runId") or "")
        if run_id > holdout_run_id and _get(report, "learning", "optimizerUpdatesCompleted") is True:
            runs.append(
                {
                    "runId": run_id,
                    "runKind": report.get("runKind"),
                    "report": _rel(report_path),
                    "optimizerStateSha256": _get(report, "artifacts", "optimizerStateSha256"),
                }
            )
    return runs


def _result_rules(
    matrix: Mapping[str, Any],
    eval_metrics: Mapping[str, Any],
    holdout_metrics: Mapping[str, Any],
) -> dict[str, Any]:
    targets = matrix.get("targets") if isinstance(matrix.get("targets"), Mapping) else {}
    steps_target = _get(targets, "avgStepsPerEpisode", "evalMin")
    holdout_steps_target = _get(targets, "avgStepsPerEpisode", "holdoutMin")
    survival_target = _get(targets, "averageBotSurvival", "evalMin")
    holdout_survival_target = _get(targets, "averageBotSurvival", "holdoutMin")
    dqn = _get(matrix, "baseline", "dqnChampion") or {}
    minimum = matrix.get("minimumEpisodes") if isinstance(matrix.get("minimumEpisodes"), Mapping) else {}

    eval_steps = _as_float(eval_metrics.get("avgStepsPerEpisode"))
    holdout_steps = _as_float(holdout_metrics.get("avgStepsPerEpisode"))
    eval_survival = _as_float(eval_metrics.get("averageBotSurvival"))
    holdout_survival = _as_float(holdout_metrics.get("averageBotSurvival"))
    eval_episode_ok = _as_int(eval_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("eval"))
    holdout_episode_ok = _as_int(holdout_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("holdout"))
    eval_steps_ok = eval_steps is not None and eval_steps >= float(steps_target)
    holdout_steps_ok = holdout_steps is not None and holdout_steps >= float(holdout_steps_target)
    eval_survival_ok = eval_survival is not None and eval_survival >= float(survival_target)
    holdout_survival_ok = holdout_survival is not None and holdout_survival >= float(holdout_survival_target)
    terminal_ready = (
        _get(eval_metrics, "failureClasses", "startCapableTerminalMatrix") is True
        and _get(holdout_metrics, "failureClasses", "startCapableTerminalMatrix") is True
    )
    player_dead_only = any(
        _get(lane, "failureClasses", "playerDeadOnly") is True
        for lane in (eval_metrics, holdout_metrics)
    )
    max_steps_only = any(
        _get(lane, "failureClasses", "maxStepsOnly") is True
        for lane in (eval_metrics, holdout_metrics)
    )
    runtime_errors = any(
        _as_int(_get(lane, "failureClasses", "runtimeErrorCount")) > 0 for lane in (eval_metrics, holdout_metrics)
    )
    safety_ok = all(
        (_as_float(_get(lane, "actionTelemetry", "preSamplingMaskRate")) or 0.0) >= 1.0
        and (_as_float(_get(lane, "actionTelemetry", "postDecodeClampRate")) or 0.0) == 0.0
        and (_as_float(_get(lane, "actionTelemetry", "invalidActionRate")) or 0.0) == 0.0
        and (_as_float(_get(lane, "actionTelemetry", "sanitizerRate")) or 0.0) == 0.0
        and (_as_float(_get(lane, "actionTelemetry", "vetoRate")) or 0.0) < 0.25
        for lane in (eval_metrics, holdout_metrics)
    )
    ppo_regression = not (eval_steps_ok and holdout_steps_ok and eval_survival_ok and holdout_survival_ok)
    blockers = [
        "minimum eval episodes missing" if not eval_episode_ok else None,
        "minimum holdout episodes missing" if not holdout_episode_ok else None,
        "eval avgStepsPerEpisode below DQN anchor" if not eval_steps_ok else None,
        "holdout avgStepsPerEpisode below DQN anchor" if not holdout_steps_ok else None,
        "eval averageBotSurvival below BT93I target" if not eval_survival_ok else None,
        "holdout averageBotSurvival below BT93I target" if not holdout_survival_ok else None,
        "terminal/death matrix is not start-capable" if not terminal_ready else None,
        "terminal matrix is player-dead-only" if player_dead_only else None,
        "terminal matrix is max-steps-only" if max_steps_only else None,
        "runtimeErrorCount above zero" if runtime_errors else None,
        "action safety telemetry outside thresholds" if not safety_ok else None,
    ]
    blocking_reasons = [reason for reason in blockers if reason]
    return {
        "deltasAgainstDqn": {
            "evalAvgStepsPerEpisodePct": _pct_delta(eval_steps, dqn.get("avgStepsPerEpisode")),
            "holdoutAvgStepsPerEpisodePct": _pct_delta(holdout_steps, dqn.get("avgStepsPerEpisode")),
            "evalAverageBotSurvivalPct": _pct_delta(eval_survival, dqn.get("averageBotSurvival")),
            "holdoutAverageBotSurvivalPct": _pct_delta(holdout_survival, dqn.get("averageBotSurvival")),
            "resultClass": "ppo-regression" if ppo_regression else "not-regression",
        },
        "hardRules": {
            "evalMinimumEpisodesOk": eval_episode_ok,
            "holdoutMinimumEpisodesOk": holdout_episode_ok,
            "evalStepsNonRegressionOk": eval_steps_ok,
            "holdoutStepsNonRegressionOk": holdout_steps_ok,
            "evalSurvivalTargetOk": eval_survival_ok,
            "holdoutSurvivalTargetOk": holdout_survival_ok,
            "terminalDeathMatrixStartCapable": terminal_ready,
            "playerDeadOnlyBlocksStart": player_dead_only,
            "maxStepsOnlyBlocksStart": max_steps_only,
            "runtimeErrorCountBlocksStart": runtime_errors,
            "actionSafetyOk": safety_ok,
            "ppoRegressionBlocksStart": ppo_regression,
            "bt94aReadyCandidate": not blocking_reasons,
            "bt94aRemainsClosed": bool(blocking_reasons),
            "blockingReasons": blocking_reasons,
        },
    }


def build_report() -> dict[str, Any]:
    matrix = _read_json(MATRIX_PATH)
    readiness = _read_json(READINESS_PATH)
    repair = _read_json(REPAIR_REPORT_PATH)
    holdout_guard = _read_json(HOLDOUT_GUARD_PATH)
    eval_pointer_path, _, eval_report_path, eval_report = _pointer_report(EVAL_POINTER_PATH)
    holdout_pointer_path, _, holdout_report_path, holdout_report = _pointer_report(HOLDOUT_POINTER_PATH)
    eval_metrics = _lane_metrics(eval_report)
    holdout_metrics = _lane_metrics(holdout_report)
    rules = _result_rules(matrix, eval_metrics, holdout_metrics)
    hard = rules["hardRules"]
    post_holdout_training = _post_holdout_training_runs(str(holdout_metrics.get("runId") or ""))
    result_class = "BT94A-ready" if hard["bt94aReadyCandidate"] and not post_holdout_training else "diagnose-blocked"
    if hard["ppoRegressionBlocksStart"]:
        matrix_verdict = "ppo-regression"
    elif result_class == "BT94A-ready":
        matrix_verdict = "BT94A-ready"
    else:
        matrix_verdict = "diagnose-blocked"
    phase_coverage = {
        "93I.4.1": bool(
            eval_report.get("runKind") == "terminal-curriculum-repair-eval"
            and holdout_report.get("runKind") == "holdout-eval"
            and hard["evalMinimumEpisodesOk"]
            and hard["holdoutMinimumEpisodesOk"]
        ),
        "93I.4.2": bool(
            hard["evalStepsNonRegressionOk"]
            and hard["holdoutStepsNonRegressionOk"]
            and hard["evalSurvivalTargetOk"]
            and hard["holdoutSurvivalTargetOk"]
        ),
        "93I.4.3": bool(hard["terminalDeathMatrixStartCapable"]),
        "93I.4.4": True,
    }
    finding_status = {
        "F.05": "still-blocking" if hard["ppoRegressionBlocksStart"] else "closed-for-bt93i-matrix",
        "F.19": "still-blocking" if not hard["terminalDeathMatrixStartCapable"] else "closed",
        "F.27": "still-blocking" if hard["ppoRegressionBlocksStart"] else "closed-for-bt93i-matrix",
        "F.31": "still-blocking" if not hard["terminalDeathMatrixStartCapable"] else "closed",
    }
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_matrix_green_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.4",
        "matrixId": matrix.get("matrixId"),
        "resultClass": result_class,
        "matrixVerdict": matrix_verdict,
        "phaseCoverage": phase_coverage,
        "comparison": {
            "dqnChampion": _get(matrix, "baseline", "dqnChampion") or {},
            "targets": matrix.get("targets"),
            "ppoEval": eval_metrics,
            "ppoHoldout": holdout_metrics,
            "deltasAgainstDqn": rules["deltasAgainstDqn"],
        },
        "resultRules": {
            **hard,
            "postHoldoutTrainingRuns": post_holdout_training,
            "candidateFreezeAllowed": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "startgateSuccessIsPromotionEvidence": False,
        },
        "findingDisposition": finding_status,
        "bt94aImpact": {
            "claimableAfter93I4": result_class == "BT94A-ready",
            "blockedFindings": [finding for finding, status in finding_status.items() if status == "still-blocking"],
            "decision": (
                "BT94A remains closed; BT93I.4 still violates steps and/or terminal-matrix start rules."
                if result_class != "BT94A-ready"
                else "BT93I.5 may refresh the BT94A start gate from BT93I artifacts."
            ),
        },
        "commands": {
            "eval": eval_report.get("evalCommand"),
            "holdout": holdout_report.get("evalCommand"),
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_matrix_green_report.py --write-report",
        },
        "sourceArtifacts": {
            "matrixManifest": _source(MATRIX_PATH, "BT93I matrix manifest"),
            "longRunReadiness": _source(READINESS_PATH, "BT93I long-run readiness"),
            "repairReport": _source(REPAIR_REPORT_PATH, "BT93I terminal curriculum repair report"),
            "holdoutGuard": _source(HOLDOUT_GUARD_PATH, "BT93I holdout guard"),
            "evalPointer": _source(eval_pointer_path, "BT93I eval pointer", closure_capable=False),
            "evalReport": _source(eval_report_path, "BT93I eval"),
            "holdoutPointer": _source(holdout_pointer_path, "BT93I holdout pointer", closure_capable=False),
            "holdoutReport": _source(holdout_report_path, "BT93I holdout"),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93I.4 matrix green report.")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--report-output", default=str(DEFAULT_REPORT_PATH))
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(_repo_path(args.report_output), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "matrixVerdict": report["matrixVerdict"],
                "phaseCoverage": report["phaseCoverage"],
                "blockingReasons": report["resultRules"]["blockingReasons"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
