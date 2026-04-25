"""BT93F.4 same-matrix repair diagnostic report.

This report consumes BT93F-owned train/eval/holdout artifacts and applies the
BT93F no-start rules. It does not create a candidate, freeze a model, promote,
or touch runtime surfaces.
"""

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
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93F_ROOT = PPO_ROOT / "bt93f"

DEFAULT_REPORT_PATH = BT93F_ROOT / "repair_diagnostic_report.json"
DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93f_repair_diagnostic.json"


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
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _counter(mapping: Any) -> dict[str, int]:
    if not isinstance(mapping, Mapping):
        return {}
    return {str(key): _as_int(value) for key, value in mapping.items()}


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
    current_float = _as_float(current)
    baseline_float = _as_float(baseline)
    if current_float is None or baseline_float in (None, 0.0):
        return None
    return round(((current_float - baseline_float) / baseline_float) * 100.0, 6)


def _pointer_report(pointer_name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93F_ROOT / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, report_path, _read_json(report_path)


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
    truncated_reason_counts = _counter(failure.get("truncatedReasonCounts"))
    death_cause_counts = _counter(failure.get("deathCauseCounts"))
    natural_terminal = _as_int(failure.get("naturalTerminal"))
    max_steps = _as_int(failure.get("maxSteps"))
    max_steps_only = max_steps > 0 and natural_terminal == 0 and not terminal_reason_counts and not death_cause_counts
    return {
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "report": _get(report, "artifacts", "evalReport"),
        "avgStepsPerEpisode": survival.get("avgStepsPerEpisode"),
        "avgStepsPerEpisodeObserved": survival.get("avgStepsPerEpisodeObserved"),
        "averageBotSurvival": survival.get("averageBotSurvival"),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "baselineComparable": survival.get("baselineComparable"),
        "completedEpisodeCount": survival.get("completedEpisodeCount"),
        "completedEpisodeLengths": completed_lengths,
        "completedEpisodeStats": _summary(completed_lengths),
        "reward": {
            "rewardTotal": reward.get("rewardTotal"),
            "rewardMean": reward.get("rewardMean"),
            "rewardBreakdownTotals": reward.get("rewardBreakdownTotals") or {},
            "rewardBreakdownMeanPerStep": reward.get("rewardBreakdownMeanPerStep") or {},
            "safetyOverruleCounts": _get(reward, "rewardHackingSignals", "safetyOverruleCounts") or {},
        },
        "actionTelemetry": {
            "invalidActionRate": action.get("invalidActionRate"),
            "maskRate": action.get("maskRate"),
            "vetoRate": action.get("vetoRate"),
            "sanitizerRate": action.get("sanitizerRate"),
            "noopRate": action.get("noopRate"),
            "totalActions": action.get("totalActions"),
            "fieldCounts": action.get("fieldCounts") or {},
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
            "maxStepsOnly": max_steps_only,
            "emptyDeathCauseCounts": not bool(death_cause_counts),
        },
    }


def _matrix_from_config(config: Mapping[str, Any]) -> dict[str, Any]:
    env = config.get("env") if isinstance(config.get("env"), Mapping) else {}
    return {
        "matrixId": "bt93c-dqn-ppo-precomparison-v1",
        "semanticWindow": env.get("modeId"),
        "maps": ["standard", "maze"],
        "seeds": {
            "train": env.get("trainSeeds"),
            "eval": env.get("evalSeeds"),
            "holdout": env.get("holdoutSeeds"),
        },
        "maxStepsPerEpisode": env.get("maxStepsPerEpisode"),
        "envCount": env.get("envCount"),
        "evalEnvCount": env.get("evalEnvCount"),
    }


def _matrix_drift(config: Mapping[str, Any], start_package: Mapping[str, Any]) -> dict[str, Any]:
    config_matrix = _matrix_from_config(config)
    start_matrix = _get(start_package, "startCriteria", "matrix") or {}
    expected_seeds = start_matrix.get("seeds") if isinstance(start_matrix.get("seeds"), Mapping) else {}
    checks = {
        "matrixIdUnchanged": config_matrix["matrixId"] == start_matrix.get("matrixId"),
        "semanticWindowUnchanged": config_matrix["semanticWindow"] == start_matrix.get("semanticWindow"),
        "trainSeedsUnchanged": config_matrix["seeds"]["train"] == expected_seeds.get("train"),
        "evalSeedsUnchanged": config_matrix["seeds"]["eval"] == expected_seeds.get("eval"),
        "holdoutSeedsUnchanged": config_matrix["seeds"]["holdout"] == expected_seeds.get("holdout"),
        "mapsUnchanged": config_matrix["maps"] == start_matrix.get("maps"),
    }
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "configMatrix": config_matrix,
        "startPackageMatrix": start_matrix,
    }


def _run_rules(
    *,
    train_report: Mapping[str, Any],
    eval_metrics: Mapping[str, Any],
    holdout_metrics: Mapping[str, Any],
    dqn_metrics: Mapping[str, Any],
    action_report: Mapping[str, Any],
    start_package: Mapping[str, Any],
) -> dict[str, Any]:
    action_thresholds = _get(start_package, "startCriteria", "actionTelemetryThresholds") or {}
    post_decode_threshold = _as_float(action_thresholds.get("postDecodeClampRateBlocksAtOrAbove"))
    veto_threshold = _as_float(action_thresholds.get("safetyVetoRateBlocksAtOrAbove"))
    eval_steps_delta = _pct_delta(eval_metrics.get("avgStepsPerEpisode"), dqn_metrics.get("avgStepsPerEpisode"))
    eval_survival_delta = _pct_delta(eval_metrics.get("averageBotSurvival"), dqn_metrics.get("averageBotSurvival"))
    holdout_survival_delta = _pct_delta(
        holdout_metrics.get("averageBotSurvival"),
        dqn_metrics.get("averageBotSurvival"),
    )

    ppo_regression = any(
        value is None or value < -10.0
        for value in (eval_steps_delta, eval_survival_delta, holdout_survival_delta)
    )
    runtime_errors = any(
        _as_int(_get(lane, "failureClasses", "runtimeErrorCount")) > 0
        for lane in (eval_metrics, holdout_metrics)
    )
    empty_terminal_or_death = any(
        bool(_get(lane, "failureClasses", "maxStepsOnly"))
        or bool(_get(lane, "failureClasses", "emptyDeathCauseCounts"))
        or _as_int(_get(lane, "failureClasses", "naturalTerminal")) == 0
        for lane in (eval_metrics, holdout_metrics)
    )
    reward_hacking = any(
        (_as_float(_get(lane, "reward", "rewardTotal")) or 0.0) > 0.0
        and (_pct_delta(lane.get("averageBotSurvival"), dqn_metrics.get("averageBotSurvival")) or -100.0) < 0.0
        for lane in (eval_metrics, holdout_metrics)
    )
    high_action_load = any(
        (
            post_decode_threshold is not None
            and (_as_float(_get(lane, "actionTelemetry", "maskRate")) or 0.0) >= post_decode_threshold
        )
        or (
            veto_threshold is not None
            and (_as_float(_get(lane, "actionTelemetry", "vetoRate")) or 0.0) >= veto_threshold
        )
        or ((_as_float(_get(lane, "actionTelemetry", "invalidActionRate")) or 0.0) > 0.0)
        or ((_as_float(_get(lane, "actionTelemetry", "sanitizerRate")) or 0.0) > 0.0)
        for lane in (eval_metrics, holdout_metrics)
    )
    policy_mask_blocker = _get(action_report, "findingDisposition", "F.30") == "still-blocking"
    repair_learner_ok = (
        train_report.get("runKind") == "repair-diagnostic"
        and train_report.get("truePpoOptimizerUpdate") is True
        and _get(train_report, "learning", "diagnosticOnly") is True
        and _get(train_report, "learning", "learningQualityClaimAllowed") is False
    )
    minimum = _get(start_package, "startCriteria", "minimumCompletedEpisodes") or {}
    eval_minimum_ok = _as_int(eval_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("eval"))
    holdout_minimum_ok = _as_int(holdout_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("holdout"))

    blocking_reasons = [
        "repair learner did not satisfy repair-diagnostic guardrails" if not repair_learner_ok else None,
        "minimum eval/holdout episode statistics missing" if not (eval_minimum_ok and holdout_minimum_ok) else None,
        "ppo-regression against DQN anchor" if ppo_regression else None,
        "reward remains positive while survival regresses" if reward_hacking else None,
        "terminal/death matrix remains max-steps-only or empty" if empty_terminal_or_death else None,
        "high post-decode clamp/veto/invalid/sanitizer load" if high_action_load else None,
        "policy-level mask remains a follow-blocker" if policy_mask_blocker else None,
        "runtimeErrorCount above zero" if runtime_errors else None,
    ]
    hard_blocked = any(reason for reason in blocking_reasons)

    return {
        "deltasAgainstDqn": {
            "avgStepsPerEpisodePct": eval_steps_delta,
            "averageBotSurvivalPct": eval_survival_delta,
            "holdoutAverageBotSurvivalPct": holdout_survival_delta,
            "resultClass": "ppo-regression" if ppo_regression else "not-regression",
        },
        "minimumStatistics": {
            "required": minimum,
            "evalCompletedEpisodes": eval_metrics.get("completedEpisodeCount"),
            "holdoutCompletedEpisodes": holdout_metrics.get("completedEpisodeCount"),
            "evalCompletedEpisodeStats": eval_metrics.get("completedEpisodeStats"),
            "holdoutCompletedEpisodeStats": holdout_metrics.get("completedEpisodeStats"),
            "evalMinimumOk": eval_minimum_ok,
            "holdoutMinimumOk": holdout_minimum_ok,
        },
        "hardRules": {
            "repairLearnerOk": repair_learner_ok,
            "ppoRegressionBlocksStart": ppo_regression,
            "rewardHackingBlocksStart": reward_hacking,
            "emptyTerminalDeathMatrixBlocksStart": empty_terminal_or_death,
            "highClampOrVetoLoadBlocksStart": high_action_load,
            "policyMaskFollowBlockerBlocksStart": policy_mask_blocker,
            "runtimeErrorCountBlocksStart": runtime_errors,
            "bt94aRemainsClosed": hard_blocked,
            "blockingReasons": [reason for reason in blocking_reasons if reason],
        },
    }


def _training_after(holdout_run_id: str | None) -> list[dict[str, Any]]:
    if not holdout_run_id:
        return []
    results: list[dict[str, Any]] = []
    for report_path in (BT93F_ROOT / "runs").glob("*/training_report.json"):
        report = _read_json(report_path)
        run_id = str(report.get("runId") or "")
        if run_id > holdout_run_id and _get(report, "learning", "optimizerUpdatesCompleted") is True:
            results.append({"runId": run_id, "report": _rel(report_path), "runKind": report.get("runKind")})
    return results


def build_report() -> dict[str, Any]:
    config = _read_json(DEFAULT_CONFIG_PATH)
    start_package = _read_json(BT93F_ROOT / "start_repair_package.json")
    terminal_report = _read_json(BT93F_ROOT / "terminal_reward_failure_report.json")
    action_report = _read_json(BT93F_ROOT / "action_surface_repair_report.json")
    precomparison = _read_json(BT93C_ROOT / "precomparison_report.json")

    train_pointer_path, train_report_path, train_report = _pointer_report("latest_repair_diagnostic.json")
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_baseline_repro_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    dqn_metrics = dict(_get(precomparison, "metrics", "dqnChampion") or {})
    eval_metrics = _lane_metrics(eval_report)
    holdout_metrics = _lane_metrics(holdout_report)
    matrix = _matrix_drift(config, start_package)
    rules = _run_rules(
        train_report=train_report,
        eval_metrics=eval_metrics,
        holdout_metrics=holdout_metrics,
        dqn_metrics=dqn_metrics,
        action_report=action_report,
        start_package=start_package,
    )
    post_holdout_training = _training_after(str(holdout_metrics.get("runId") or ""))
    hard_rules = rules["hardRules"]
    result_class = "diagnose-blocked" if hard_rules["bt94aRemainsClosed"] or post_holdout_training else "bt94a-start-gate-open"

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93f_repair_diagnostic_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93F",
        "phaseId": "93F.4",
        "resultClass": result_class,
        "phaseCoverage": {
            "93F.4.1": bool(hard_rules["repairLearnerOk"]),
            "93F.4.2": bool(matrix["ok"]),
            "93F.4.3": bool(
                rules["minimumStatistics"]["evalMinimumOk"]
                and rules["minimumStatistics"]["holdoutMinimumOk"]
                and rules["deltasAgainstDqn"]["avgStepsPerEpisodePct"] is not None
                and rules["deltasAgainstDqn"]["averageBotSurvivalPct"] is not None
                and rules["deltasAgainstDqn"]["holdoutAverageBotSurvivalPct"] is not None
            ),
            "93F.4.4": True,
        },
        "repairLearnerRun": {
            "runId": train_report.get("runId"),
            "runKind": train_report.get("runKind"),
            "phaseId": train_report.get("phaseId"),
            "truePpoOptimizerUpdate": train_report.get("truePpoOptimizerUpdate"),
            "diagnosticOnly": _get(train_report, "learning", "diagnosticOnly"),
            "learningQualityClaimAllowed": _get(train_report, "learning", "learningQualityClaimAllowed"),
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionClaim": False,
            "sourceModelPackage": _get(train_report, "resumedFrom", "artifactManifest"),
        },
        "comparison": {
            "matrix": matrix,
            "dqnChampion": dqn_metrics,
            "ppoDiagnosticEval": eval_metrics,
            "ppoHoldout": holdout_metrics,
            "deltasAgainstDqn": rules["deltasAgainstDqn"],
        },
        "resultRules": {
            **rules["hardRules"],
            "postHoldoutOptimizerRuns": post_holdout_training,
            "holdoutNonOptimizationOk": not post_holdout_training,
            "candidateFreezeAllowed": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
        },
        "minimumStatisticsObserved": rules["minimumStatistics"],
        "findingDisposition": {
            "F.05": "still-blocking" if hard_rules["ppoRegressionBlocksStart"] else "closed",
            "F.19": "still-blocking" if hard_rules["emptyTerminalDeathMatrixBlocksStart"] else "closed",
            "F.27": "still-blocking" if hard_rules["ppoRegressionBlocksStart"] else "closed",
            "F.30": "still-blocking" if hard_rules["policyMaskFollowBlockerBlocksStart"] else "closed",
            "F.31": "still-blocking" if hard_rules["emptyTerminalDeathMatrixBlocksStart"] else "closed",
            "R.01": "still-blocking" if hard_rules["rewardHackingBlocksStart"] else "closed",
        },
        "bt94aImpact": {
            "claimableAfter93F4": result_class != "diagnose-blocked",
            "blockedFindings": [
                key for key, status in {
                    "F.05": "still-blocking" if hard_rules["ppoRegressionBlocksStart"] else "closed",
                    "F.19": "still-blocking" if hard_rules["emptyTerminalDeathMatrixBlocksStart"] else "closed",
                    "F.27": "still-blocking" if hard_rules["ppoRegressionBlocksStart"] else "closed",
                    "F.30": "still-blocking" if hard_rules["policyMaskFollowBlockerBlocksStart"] else "closed",
                    "F.31": "still-blocking" if hard_rules["emptyTerminalDeathMatrixBlocksStart"] else "closed",
                    "R.01": "still-blocking" if hard_rules["rewardHackingBlocksStart"] else "closed",
                }.items()
                if status == "still-blocking"
            ],
            "decision": (
                "BT94A remains closed; BT93F.4 produced same-matrix diagnostic evidence but hard result rules still block."
                if result_class == "diagnose-blocked"
                else "BT93F.5 may refresh the start gate from BT93F artifacts."
            ),
        },
        "evidenceLimits": {
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "classification": "BT93F.4 same-matrix repair diagnostic only",
        },
        "commands": {
            "repairDiagnosticTrain": _get(train_report, "learning", "trainingCommand"),
            "eval": (
                "python\\.venv\\Scripts\\python.exe python\\eval.py --profile bt93f "
                "--run-kind baseline-repro-eval --phase-id 93F.4.2 "
                "--config python\\configs\\ppo_bt93f_repair_diagnostic.json "
                "--artifact-root data\\training\\ppo\\bt93f "
                f"--checkpoint data\\training\\ppo\\bt93f\\runs\\{train_report.get('runId')}\\artifact_manifest.json"
            ),
            "holdout": (
                "python\\.venv\\Scripts\\python.exe python\\eval.py --profile bt93f "
                "--run-kind holdout-eval --phase-id 93F.4.2 "
                "--config python\\configs\\ppo_bt93f_repair_diagnostic.json "
                "--artifact-root data\\training\\ppo\\bt93f "
                f"--checkpoint data\\training\\ppo\\bt93f\\runs\\{train_report.get('runId')}\\artifact_manifest.json"
            ),
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93f_repair_diagnostic_report.py --write-report",
        },
        "sourceArtifacts": {
            "bt93fConfig": _source(DEFAULT_CONFIG_PATH, "BT93F.4 repair diagnostic config"),
            "bt93fStartRepairPackage": _source(BT93F_ROOT / "start_repair_package.json", "BT93F start package"),
            "bt93fTerminalRewardFailure": _source(
                BT93F_ROOT / "terminal_reward_failure_report.json",
                "BT93F.2 terminal/reward/failure report",
            ),
            "bt93fActionSurfaceRepair": _source(
                BT93F_ROOT / "action_surface_repair_report.json",
                "BT93F.3 action-surface report",
            ),
            "bt93cPrecomparison": _source(BT93C_ROOT / "precomparison_report.json", "DQN anchor source"),
            "repairTrainReport": _source(train_report_path, "BT93F.4 repair-diagnostic train"),
            "repairTrainPointer": _source(train_pointer_path, "BT93F.4 train pointer", closure_capable=False),
            "evalReport": _source(eval_report_path, "BT93F.4 same-matrix eval"),
            "evalPointer": _source(eval_pointer_path, "BT93F.4 eval pointer", closure_capable=False),
            "holdoutReport": _source(holdout_report_path, "BT93F.4 holdout eval"),
            "holdoutPointer": _source(holdout_pointer_path, "BT93F.4 holdout pointer", closure_capable=False),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "terminalRewardFailureResultClass": terminal_report.get("resultClass"),
            "actionSurfaceRepairResultClass": action_report.get("resultClass"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93F.4 repair diagnostic report.")
    parser.add_argument("--write-report", action="store_true", help="Write report JSON file.")
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH), help="Report output path.")
    args = parser.parse_args()

    report = build_report()
    output_path = Path(args.output).resolve()
    if args.write_report:
        _write_json(output_path, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "blockedFindings": report["bt94aImpact"]["blockedFindings"],
                "minimumStatisticsObserved": report["minimumStatisticsObserved"],
                "wrote": _rel(output_path) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
