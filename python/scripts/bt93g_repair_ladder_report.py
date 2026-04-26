"""BT93G.5 comparable repair ladder budget and result report."""

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
BT93G_ROOT = PPO_ROOT / "bt93g"
BT93C_ROOT = PPO_ROOT / "bt93c"

DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93g_comparable_repair.json"
DEFAULT_BUDGET_PATH = BT93G_ROOT / "repair_ladder_budget.json"
DEFAULT_REPORT_PATH = BT93G_ROOT / "repair_ladder_report.json"


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


def _counter(mapping: Any) -> dict[str, int]:
    if not isinstance(mapping, Mapping):
        return {}
    return {str(key): _as_int(value) for key, value in mapping.items()}


def _pct_delta(current: Any, baseline: Any) -> float | None:
    current_float = _as_float(current)
    baseline_float = _as_float(baseline)
    if current_float is None or baseline_float in (None, 0.0):
        return None
    return round(((current_float - baseline_float) / baseline_float) * 100.0, 6)


def _pointer_report(pointer_name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93G_ROOT / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, report_path, _read_json(report_path)


def _training_report_from_manifest(manifest_ref: Any) -> tuple[Path, dict[str, Any]]:
    manifest_path = _repo_path(str(manifest_ref))
    report_path = manifest_path.parent / "training_report.json"
    return report_path, _read_json(report_path)


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
        "comparisonComparable": survival.get("comparisonComparable"),
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
            "preSamplingMaskRate": action.get("preSamplingMaskRate"),
            "postDecodeClampRate": action.get("postDecodeClampRate"),
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


def _budget_checks(config: Mapping[str, Any], repair_matrix: Mapping[str, Any]) -> dict[str, Any]:
    env = config.get("env") or {}
    rollout = config.get("rollout") or {}
    diagnostics = config.get("diagnostics") or {}
    checks = {
        "maxStepsComparable": _as_int(env.get("maxStepsPerEpisode")) >= 128,
        "preferredMaxStepsPinned": _as_int(env.get("maxStepsPerEpisode")) >= 180,
        "matchesRepairMatrixMaxSteps": env.get("maxStepsPerEpisode") == _get(repair_matrix, "env", "maxStepsPerEpisode"),
        "nStepsPerEnvPinned": _as_int(rollout.get("nStepsPerEnv")) > 0,
        "batchSizePinned": _as_int(rollout.get("batchSize")) > 0,
        "nEpochsPinned": _as_int(rollout.get("nEpochs")) > 0,
        "totalTimestepsPinned": _as_int(rollout.get("extendedRepairTimesteps")) > _as_int(rollout.get("shortRepairTimesteps")),
        "wallClockWithin4h": _as_int(rollout.get("wallClockLimitSeconds")) <= 14400,
        "timeoutBudgetPinned": _as_int(rollout.get("timeoutBudgetSeconds")) > 0,
        "checkpointFrequencyPinned": bool(rollout.get("checkpointFrequency")),
        "evalIntervalPinned": _as_int(rollout.get("evalIntervalTimesteps")) > 0,
        "earlyStopRulesPinned": bool(diagnostics.get("earlyStopRules")),
    }
    return {"ok": all(checks.values()), "checks": checks}


def build_budget() -> dict[str, Any]:
    config = _read_json(DEFAULT_CONFIG_PATH)
    repair_matrix = _read_json(BT93G_ROOT / "repair_matrix.json")
    rollout = config.get("rollout") or {}
    env = config.get("env") or {}
    checks = _budget_checks(config, repair_matrix)
    return {
        "ok": checks["ok"],
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_repair_ladder_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93G",
        "phaseId": "93G.5",
        "resultClass": "extended-repair-budget-pinned",
        "budget": {
            "matrixId": repair_matrix.get("matrixId"),
            "actionSurfaceId": env.get("actionSurfaceId"),
            "maxStepsPerEpisode": env.get("maxStepsPerEpisode"),
            "envCount": env.get("envCount"),
            "evalEnvCount": env.get("evalEnvCount"),
            "trainSeeds": env.get("trainSeeds"),
            "evalSeeds": env.get("evalSeeds"),
            "holdoutSeeds": env.get("holdoutSeeds"),
            "technicalSmokeTimesteps": rollout.get("technicalSmokeTimesteps"),
            "shortRepairTimesteps": rollout.get("shortRepairTimesteps"),
            "extendedRepairTimesteps": rollout.get("extendedRepairTimesteps"),
            "evalSteps": rollout.get("evalSteps"),
            "holdoutEvalSteps": rollout.get("holdoutEvalSteps"),
            "nStepsPerEnv": rollout.get("nStepsPerEnv"),
            "batchSize": rollout.get("batchSize"),
            "nEpochs": rollout.get("nEpochs"),
            "wallClockLimitSeconds": rollout.get("wallClockLimitSeconds"),
            "timeoutBudgetSeconds": rollout.get("timeoutBudgetSeconds"),
            "checkpointFrequency": rollout.get("checkpointFrequency"),
            "evalIntervalTimesteps": rollout.get("evalIntervalTimesteps"),
            "earlyStopRules": _get(config, "diagnostics", "earlyStopRules") or [],
        },
        "budgetChecks": checks,
        "guardrails": config.get("guardrails") or {},
        "sourceArtifacts": {
            "bt93gConfig": _source(DEFAULT_CONFIG_PATH, "BT93G.5 comparable repair config"),
            "repairMatrix": _source(BT93G_ROOT / "repair_matrix.json", "BT93G comparable repair matrix"),
            "startTruth": _source(BT93G_ROOT / "start_truth.json", "BT93G start truth"),
            "actionMask": _source(BT93G_ROOT / "action_mask_report.json", "BT93G action mask"),
            "rewardGate": _source(BT93G_ROOT / "reward_gate_report.json", "BT93G reward gate"),
        },
    }


def _matrix_from_config(config: Mapping[str, Any]) -> dict[str, Any]:
    env = config.get("env") if isinstance(config.get("env"), Mapping) else {}
    return {
        "matrixId": "bt93g-comparable-repair-matrix-v1",
        "semanticWindow": env.get("modeId"),
        "actionSurfaceId": env.get("actionSurfaceId"),
        "maps": env.get("maps"),
        "maxStepsPerEpisode": env.get("maxStepsPerEpisode"),
        "envCount": env.get("envCount"),
        "evalEnvCount": env.get("evalEnvCount"),
        "seeds": {
            "train": env.get("trainSeeds"),
            "eval": env.get("evalSeeds"),
            "holdout": env.get("holdoutSeeds"),
        },
    }


def _matrix_drift(config: Mapping[str, Any], repair_matrix: Mapping[str, Any], eval_report: Mapping[str, Any], holdout_report: Mapping[str, Any]) -> dict[str, Any]:
    config_matrix = _matrix_from_config(config)
    repair_env = repair_matrix.get("env") if isinstance(repair_matrix.get("env"), Mapping) else {}
    repair_seeds = repair_matrix.get("seeds") if isinstance(repair_matrix.get("seeds"), Mapping) else {}
    checks = {
        "matrixIdUnchanged": config_matrix["matrixId"] == repair_matrix.get("matrixId"),
        "semanticWindowUnchanged": config_matrix["semanticWindow"] == repair_env.get("modeId"),
        "mapsUnchanged": config_matrix["maps"] == repair_env.get("maps"),
        "maxStepsUnchanged": config_matrix["maxStepsPerEpisode"] == repair_env.get("maxStepsPerEpisode"),
        "trainSeedsUnchanged": config_matrix["seeds"]["train"] == repair_seeds.get("train"),
        "evalSeedsUnchanged": config_matrix["seeds"]["eval"] == repair_seeds.get("eval"),
        "holdoutSeedsUnchanged": config_matrix["seeds"]["holdout"] == repair_seeds.get("holdout"),
        "evalConfigHashMatches": _get(eval_report, "sourceConfig", "sha256") == _sha256_file(DEFAULT_CONFIG_PATH),
        "holdoutConfigHashMatches": _get(holdout_report, "sourceConfig", "sha256") == _sha256_file(DEFAULT_CONFIG_PATH),
    }
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "configMatrix": config_matrix,
        "repairMatrix": {
            "matrixId": repair_matrix.get("matrixId"),
            "semanticWindow": repair_env.get("modeId"),
            "maps": repair_env.get("maps"),
            "maxStepsPerEpisode": repair_env.get("maxStepsPerEpisode"),
            "seeds": repair_seeds,
        },
    }


def _result_rules(
    *,
    config: Mapping[str, Any],
    budget: Mapping[str, Any],
    technical_report: Mapping[str, Any],
    short_report: Mapping[str, Any],
    extended_report: Mapping[str, Any],
    eval_metrics: Mapping[str, Any],
    holdout_metrics: Mapping[str, Any],
    dqn_metrics: Mapping[str, Any],
) -> dict[str, Any]:
    thresholds = _get(config, "diagnostics", "safetyThresholds") or {}
    eval_steps_delta = _pct_delta(eval_metrics.get("avgStepsPerEpisode"), dqn_metrics.get("avgStepsPerEpisode"))
    eval_survival_delta = _pct_delta(eval_metrics.get("averageBotSurvival"), dqn_metrics.get("averageBotSurvival"))
    holdout_survival_delta = _pct_delta(holdout_metrics.get("averageBotSurvival"), dqn_metrics.get("averageBotSurvival"))

    ppo_regression = any(
        value is None or value < 0.0
        for value in (eval_steps_delta, eval_survival_delta, holdout_survival_delta)
    )
    minimum = _get(config, "repairMatrix", "minimumEpisodes") or {}
    if not minimum:
        minimum = _get(_read_json(BT93G_ROOT / "repair_matrix.json"), "minimumEpisodes") or {}
    eval_minimum_ok = _as_int(eval_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("eval"))
    holdout_minimum_ok = _as_int(holdout_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("holdout"))
    extended_updates = _as_int(_get(extended_report, "learning", "optimizerUpdatesAfter"))
    short_updates = _as_int(_get(short_report, "learning", "optimizerUpdatesAfter"))
    learning_trend_missing = (
        extended_report.get("truePpoOptimizerUpdate") is not True
        or extended_updates <= short_updates
        or bool(_get(extended_report, "learning", "ppoLearningMetrics", "collapseOrInstabilitySignal"))
    )
    pre_sampling_missing = any(
        (_as_float(_get(lane, "actionTelemetry", "preSamplingMaskRate")) or 0.0) <= 0.0
        for lane in (eval_metrics, holdout_metrics)
    )
    high_action_load = any(
        ((_as_float(_get(lane, "actionTelemetry", "postDecodeClampRate")) or 0.0) >= float(thresholds.get("postDecodeClampRateLt", 0.5)))
        or ((_as_float(_get(lane, "actionTelemetry", "vetoRate")) or 0.0) >= float(thresholds.get("safetyVetoRateLt", 0.25)))
        or ((_as_float(_get(lane, "actionTelemetry", "invalidActionRate")) or 0.0) != float(thresholds.get("invalidActionRateEq", 0.0)))
        or ((_as_float(_get(lane, "actionTelemetry", "sanitizerRate")) or 0.0) != float(thresholds.get("sanitizerRateEq", 0.0)))
        for lane in (eval_metrics, holdout_metrics)
    )
    empty_terminal_or_death = any(
        bool(_get(lane, "failureClasses", "maxStepsOnly"))
        or bool(_get(lane, "failureClasses", "emptyDeathCauseCounts"))
        or _as_int(_get(lane, "failureClasses", "naturalTerminal")) == 0
        for lane in (eval_metrics, holdout_metrics)
    )
    runtime_errors = any(
        _as_int(_get(lane, "failureClasses", "runtimeErrorCount")) > 0
        for lane in (eval_metrics, holdout_metrics)
    )
    reward_hacking = any(
        (_as_float(_get(lane, "reward", "rewardTotal")) or 0.0) > 0.0
        and (_pct_delta(lane.get("averageBotSurvival"), dqn_metrics.get("averageBotSurvival")) or -100.0) < 0.0
        for lane in (eval_metrics, holdout_metrics)
    )
    ladder_ok = (
        technical_report.get("runKind") == "technical-smoke"
        and short_report.get("runKind") == "comparable-repair"
        and extended_report.get("runKind") == "comparable-repair"
        and technical_report.get("truePpoModelPackage") is True
        and short_report.get("truePpoModelPackage") is True
        and extended_report.get("truePpoModelPackage") is True
    )
    blocking_reasons = [
        "repair ladder missing technical/short/extended model package" if not ladder_ok else None,
        "extended repair budget was not pinned before execution" if budget.get("ok") is not True else None,
        "minimum eval/holdout episode statistics missing" if not (eval_minimum_ok and holdout_minimum_ok) else None,
        "ppo-regression against DQN anchor" if ppo_regression else None,
        "extended repair learning trend missing or collapsed" if learning_trend_missing else None,
        "reward remains positive while survival regresses" if reward_hacking else None,
        "terminal/death matrix remains max-steps-only or empty" if empty_terminal_or_death else None,
        "pre-sampling mask telemetry missing" if pre_sampling_missing else None,
        "high clamp/veto/invalid/sanitizer load" if high_action_load else None,
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
            "repairLadderOk": ladder_ok,
            "extendedBudgetPinned": budget.get("ok") is True,
            "ppoRegressionBlocksStart": ppo_regression,
            "learningTrendMissingBlocksStart": learning_trend_missing,
            "rewardHackingBlocksStart": reward_hacking,
            "emptyTerminalDeathMatrixBlocksStart": empty_terminal_or_death,
            "preSamplingMaskMissingBlocksStart": pre_sampling_missing,
            "highClampOrVetoLoadBlocksStart": high_action_load,
            "runtimeErrorCountBlocksStart": runtime_errors,
            "bt94aRemainsClosed": hard_blocked,
            "blockingReasons": [reason for reason in blocking_reasons if reason],
        },
    }


def _training_after(holdout_run_id: str | None) -> list[dict[str, Any]]:
    if not holdout_run_id:
        return []
    results: list[dict[str, Any]] = []
    for report_path in (BT93G_ROOT / "runs").glob("*/training_report.json"):
        report = _read_json(report_path)
        run_id = str(report.get("runId") or "")
        if run_id > holdout_run_id and _get(report, "learning", "optimizerUpdatesCompleted") is True:
            results.append({"runId": run_id, "report": _rel(report_path), "runKind": report.get("runKind")})
    return results


def build_report() -> dict[str, Any]:
    config = _read_json(DEFAULT_CONFIG_PATH)
    repair_matrix = _read_json(BT93G_ROOT / "repair_matrix.json")
    budget = _read_json(DEFAULT_BUDGET_PATH)

    extended_pointer_path, extended_report_path, extended_report = _pointer_report("latest_comparable_repair.json")
    short_report_path, short_report = _training_report_from_manifest(_get(extended_report, "resumedFrom", "artifactManifest"))
    technical_report_path, technical_report = _training_report_from_manifest(_get(short_report, "resumedFrom", "artifactManifest"))
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_comparable_repair_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    dqn_metrics = dict(_get(repair_matrix, "baseline", "dqnChampion") or {})
    eval_metrics = _lane_metrics(eval_report)
    holdout_metrics = _lane_metrics(holdout_report)
    matrix = _matrix_drift(config, repair_matrix, eval_report, holdout_report)
    rules = _result_rules(
        config=config,
        budget=budget,
        technical_report=technical_report,
        short_report=short_report,
        extended_report=extended_report,
        eval_metrics=eval_metrics,
        holdout_metrics=holdout_metrics,
        dqn_metrics=dqn_metrics,
    )
    post_holdout_training = _training_after(str(holdout_metrics.get("runId") or ""))
    hard_rules = rules["hardRules"]
    result_class = "diagnose-blocked" if hard_rules["bt94aRemainsClosed"] or post_holdout_training else "bt94a-start-gate-open"

    phase_coverage = {
        "93G.5.1": bool(hard_rules["repairLadderOk"]),
        "93G.5.2": bool(hard_rules["extendedBudgetPinned"]),
        "93G.5.3": bool(
            extended_report.get("truePpoModelPackage") is True
            and _get(extended_report, "artifacts", "modelSha256")
            and _get(extended_report, "artifacts", "optimizerStateSha256")
            and _get(extended_report, "artifacts", "vecnormalizeSha256")
            and _get(extended_report, "learning", "ppoLearningMetrics", "metrics", "approx_kl") is not None
        ),
        "93G.5.4": bool(matrix["ok"]),
        "93G.5.5": bool(rules["minimumStatistics"]["evalMinimumOk"] and rules["minimumStatistics"]["holdoutMinimumOk"]),
        "93G.5.6": True,
    }
    finding_status = {
        "F.05": "still-blocking" if hard_rules["ppoRegressionBlocksStart"] else "closed-for-93g-comparable-matrix",
        "F.19": "still-blocking" if hard_rules["emptyTerminalDeathMatrixBlocksStart"] else "closed",
        "F.27": "still-blocking" if hard_rules["ppoRegressionBlocksStart"] else "closed-for-93g-comparable-matrix",
        "F.30": "still-blocking" if hard_rules["preSamplingMaskMissingBlocksStart"] else "closed-for-bt93g-repair-lane",
        "F.31": "still-blocking" if hard_rules["emptyTerminalDeathMatrixBlocksStart"] else "closed",
        "R.01": "still-blocking" if hard_rules["rewardHackingBlocksStart"] else "closed-for-93g-repair-eval",
    }
    if hard_rules["learningTrendMissingBlocksStart"]:
        finding_status["F.32"] = "still-blocking"

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_repair_ladder_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93G",
        "phaseId": "93G.5",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "repairLadderRuns": {
            "technicalSmoke": {
                "runId": technical_report.get("runId"),
                "runKind": technical_report.get("runKind"),
                "report": _rel(technical_report_path),
                "truePpoModelPackage": technical_report.get("truePpoModelPackage"),
                "candidateRun": False,
            },
            "shortComparableRepair": {
                "runId": short_report.get("runId"),
                "runKind": short_report.get("runKind"),
                "report": _rel(short_report_path),
                "requestedTimesteps": _get(short_report, "learning", "requestedTimesteps"),
                "truePpoOptimizerUpdate": short_report.get("truePpoOptimizerUpdate"),
                "sourceModelPackage": _get(short_report, "resumedFrom", "artifactManifest"),
                "candidateRun": False,
            },
            "extendedComparableRepair": {
                "runId": extended_report.get("runId"),
                "runKind": extended_report.get("runKind"),
                "report": _rel(extended_report_path),
                "requestedTimesteps": _get(extended_report, "learning", "requestedTimesteps"),
                "truePpoOptimizerUpdate": extended_report.get("truePpoOptimizerUpdate"),
                "truePpoModelPackage": extended_report.get("truePpoModelPackage"),
                "sourceModelPackage": _get(extended_report, "resumedFrom", "artifactManifest"),
                "learningMetrics": _get(extended_report, "learning", "ppoLearningMetrics"),
                "actionTelemetry": _get(extended_report, "learning", "telemetry"),
                "candidateRun": False,
                "freezeCandidate": False,
                "promotionAllowed": False,
            },
        },
        "comparison": {
            "matrix": matrix,
            "dqnChampion": dqn_metrics,
            "ppoComparableEval": eval_metrics,
            "ppoHoldout": holdout_metrics,
            "deltasAgainstDqn": rules["deltasAgainstDqn"],
        },
        "resultRules": {
            **hard_rules,
            "postHoldoutOptimizerRuns": post_holdout_training,
            "holdoutNonOptimizationOk": not post_holdout_training,
            "candidateFreezeAllowed": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
        },
        "minimumStatisticsObserved": rules["minimumStatistics"],
        "findingDisposition": finding_status,
        "bt94aImpact": {
            "claimableAfter93G5": result_class != "diagnose-blocked",
            "blockedFindings": [key for key, status in finding_status.items() if status == "still-blocking"],
            "decision": (
                "BT94A remains closed; BT93G.5 repair evidence still violates hard result rules."
                if result_class == "diagnose-blocked"
                else "BT93G.6 may refresh the start gate from BT93G artifacts."
            ),
        },
        "evidenceLimits": {
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "classification": "BT93G.5 comparable repair evidence only",
        },
        "commands": {
            "technicalSmoke": _get(technical_report, "learning", "trainingCommand"),
            "shortComparableRepair": _get(short_report, "learning", "trainingCommand"),
            "extendedComparableRepair": _get(extended_report, "learning", "trainingCommand"),
            "eval": eval_report.get("evalCommand"),
            "holdout": holdout_report.get("evalCommand"),
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93g_repair_ladder_report.py --write-report",
        },
        "sourceArtifacts": {
            "bt93gConfig": _source(DEFAULT_CONFIG_PATH, "BT93G.5 comparable repair config"),
            "repairLadderBudget": _source(DEFAULT_BUDGET_PATH, "BT93G.5 pinned budget"),
            "repairMatrix": _source(BT93G_ROOT / "repair_matrix.json", "BT93G comparable matrix"),
            "actionMaskReport": _source(BT93G_ROOT / "action_mask_report.json", "BT93G pre-sampling action mask"),
            "rewardGateReport": _source(BT93G_ROOT / "reward_gate_report.json", "BT93G reward gate"),
            "technicalSmokeTrainReport": _source(technical_report_path, "BT93G.5 technical smoke train"),
            "shortRepairTrainReport": _source(short_report_path, "BT93G.5 short comparable repair train"),
            "extendedRepairTrainReport": _source(extended_report_path, "BT93G.5 extended comparable repair train"),
            "extendedRepairPointer": _source(extended_pointer_path, "BT93G.5 extended repair pointer", closure_capable=False),
            "evalReport": _source(eval_report_path, "BT93G.5 comparable repair eval"),
            "evalPointer": _source(eval_pointer_path, "BT93G.5 eval pointer", closure_capable=False),
            "holdoutReport": _source(holdout_report_path, "BT93G.5 holdout eval"),
            "holdoutPointer": _source(holdout_pointer_path, "BT93G.5 holdout pointer", closure_capable=False),
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
    parser = argparse.ArgumentParser(description="Write BT93G.5 comparable repair ladder artifacts.")
    parser.add_argument("--write-budget", action="store_true", help="Write pre-run budget JSON file.")
    parser.add_argument("--write-report", action="store_true", help="Write post-run report JSON file.")
    parser.add_argument("--budget-output", default=str(DEFAULT_BUDGET_PATH), help="Budget output path.")
    parser.add_argument("--report-output", default=str(DEFAULT_REPORT_PATH), help="Report output path.")
    args = parser.parse_args()

    result: dict[str, Any] = {}
    if args.write_budget:
        budget = build_budget()
        budget_path = Path(args.budget_output).resolve()
        _write_json(budget_path, budget)
        result["budget"] = {
            "ok": budget["ok"],
            "resultClass": budget["resultClass"],
            "wrote": _rel(budget_path),
            "budgetChecks": budget["budgetChecks"],
        }
    if args.write_report:
        report = build_report()
        report_path = Path(args.report_output).resolve()
        _write_json(report_path, report)
        result["report"] = {
            "ok": report["ok"],
            "resultClass": report["resultClass"],
            "phaseCoverage": report["phaseCoverage"],
            "blockedFindings": report["bt94aImpact"]["blockedFindings"],
            "minimumStatisticsObserved": report["minimumStatisticsObserved"],
            "wrote": _rel(report_path),
        }
    if not args.write_budget and not args.write_report:
        budget = build_budget()
        result["budget"] = {
            "ok": budget["ok"],
            "resultClass": budget["resultClass"],
            "budgetChecks": budget["budgetChecks"],
        }
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
