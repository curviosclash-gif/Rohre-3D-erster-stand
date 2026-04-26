"""BT93H.3 comparable-terminal-repair budget and result report."""

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
BT93H_ROOT = PPO_ROOT / "bt93h"

DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93h_comparable_terminal_repair.json"
DEFAULT_BUDGET_PATH = BT93H_ROOT / "repair_ladder_budget.json"
DEFAULT_REPORT_PATH = BT93H_ROOT / "repair_ladder_report.json"


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


def _counter(value: Any) -> dict[str, int]:
    if not isinstance(value, Mapping):
        return {}
    return {str(key): _as_int(count) for key, count in sorted(value.items())}


def _pct_delta(current: Any, baseline: Any) -> float | None:
    current_value = _as_float(current)
    baseline_value = _as_float(baseline)
    if current_value is None or baseline_value in (None, 0.0):
        return None
    return round(((current_value - baseline_value) / baseline_value) * 100.0, 6)


def _pointer_report(name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93H_ROOT / name
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
    death_cause_counts = _counter(failure.get("deathCauseCounts"))
    natural_terminal = _as_int(failure.get("naturalTerminal"))
    max_steps = _as_int(failure.get("maxSteps"))
    return {
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "report": _get(report, "artifacts", "evalReport"),
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
            "truncatedReasonCounts": _counter(failure.get("truncatedReasonCounts")),
            "maxStepsOnly": max_steps > 0 and natural_terminal == 0 and not terminal_reason_counts and not death_cause_counts,
            "startCapableTerminalMatrix": bool(death_cause_counts) and natural_terminal > 0 and max_steps == 0,
        },
    }


def build_budget() -> dict[str, Any]:
    config = _read_json(DEFAULT_CONFIG_PATH)
    contract_path = _repo_path(str(_get(config, "artifacts", "survivalGateContract")))
    contract = _read_json(contract_path)
    rollout = config.get("rollout") or {}
    env = config.get("env") or {}
    checks = {
        "runKindPinned": True,
        "wallClockWithin4h": _as_int(rollout.get("wallClockLimitSeconds")) <= 14400,
        "fourHourRunBlockedBeforeProvocation": _get(contract, "executionGate", "fourHourRunAllowedBeforeProvocationGate") is False,
        "terminalRepairTimestepsPinned": _as_int(rollout.get("terminalRepairTimesteps")) > 0,
        "evalStepsPinned": _as_int(rollout.get("evalSteps")) > 0,
        "holdoutEvalStepsPinned": _as_int(rollout.get("holdoutEvalSteps")) > 0,
        "checkpointFrequencyPinned": bool(rollout.get("checkpointFrequency")),
        "evalIntervalPinned": _as_int(rollout.get("evalIntervalTimesteps")) > 0,
        "earlyStopRulesPinned": bool(_get(config, "diagnostics", "earlyStopRules")),
        "matrixUnchanged": _get(contract, "referenceLock", "holdoutMatrix", "seeds") == {
            "train": env.get("trainSeeds"),
            "eval": env.get("evalSeeds"),
            "holdout": env.get("holdoutSeeds"),
        },
    }
    return {
        "ok": all(checks.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93h_repair_ladder_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93H",
        "phaseId": "93H.3",
        "resultClass": "comparable-terminal-repair-budget-pinned",
        "budgetChecks": {"ok": all(checks.values()), "checks": checks},
        "budget": {
            "runKind": "comparable-terminal-repair",
            "matrixId": _get(contract, "referenceLock", "bt93gRepair", "matrixId"),
            "actionSurfaceId": env.get("actionSurfaceId"),
            "maxStepsPerEpisode": env.get("maxStepsPerEpisode"),
            "envCount": env.get("envCount"),
            "evalEnvCount": env.get("evalEnvCount"),
            "trainSeeds": env.get("trainSeeds"),
            "evalSeeds": env.get("evalSeeds"),
            "holdoutSeeds": env.get("holdoutSeeds"),
            "terminalRepairTimesteps": rollout.get("terminalRepairTimesteps"),
            "evalSteps": rollout.get("evalSteps"),
            "holdoutEvalSteps": rollout.get("holdoutEvalSteps"),
            "wallClockLimitSeconds": rollout.get("wallClockLimitSeconds"),
            "checkpointFrequency": rollout.get("checkpointFrequency"),
            "evalIntervalTimesteps": rollout.get("evalIntervalTimesteps"),
            "earlyStopRules": _get(config, "diagnostics", "earlyStopRules") or [],
        },
        "sourceArtifacts": {
            "bt93hConfig": _source(DEFAULT_CONFIG_PATH, "BT93H comparable terminal repair config"),
            "survivalGateContract": _source(contract_path, "BT93H survival gate contract"),
        },
    }


def _result_rules(
    contract: Mapping[str, Any],
    train_report: Mapping[str, Any],
    eval_metrics: Mapping[str, Any],
    holdout_metrics: Mapping[str, Any],
) -> dict[str, Any]:
    dqn = _get(contract, "referenceLock", "dqnAnchor", "metrics") or {}
    eval_steps_delta = _pct_delta(eval_metrics.get("avgStepsPerEpisode"), dqn.get("avgStepsPerEpisode"))
    eval_survival_delta = _pct_delta(eval_metrics.get("averageBotSurvival"), dqn.get("averageBotSurvival"))
    holdout_steps_delta = _pct_delta(holdout_metrics.get("avgStepsPerEpisode"), dqn.get("avgStepsPerEpisode"))
    holdout_survival_delta = _pct_delta(holdout_metrics.get("averageBotSurvival"), dqn.get("averageBotSurvival"))
    minimum = _get(contract, "minimumStatisticsBeforeRun", "episodeCount") or {}
    safety = _get(contract, "decisionRules", "safetyThresholds") or {}

    ppo_regression = any(
        value is None or value < 0.0
        for value in (eval_steps_delta, eval_survival_delta, holdout_steps_delta, holdout_survival_delta)
    )
    minimum_ok = (
        _as_int(eval_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("evalMin"))
        and _as_int(holdout_metrics.get("completedEpisodeCount")) >= _as_int(minimum.get("holdoutMin"))
    )
    terminal_ready = (
        _get(eval_metrics, "failureClasses", "startCapableTerminalMatrix") is True
        and _get(holdout_metrics, "failureClasses", "startCapableTerminalMatrix") is True
    )
    high_action_load = any(
        ((_as_float(_get(lane, "actionTelemetry", "postDecodeClampRate")) or 0.0) >= float(safety.get("postDecodeClampRateLt", 0.5)))
        or ((_as_float(_get(lane, "actionTelemetry", "vetoRate")) or 0.0) >= float(safety.get("vetoRateLt", 0.25)))
        or ((_as_float(_get(lane, "actionTelemetry", "invalidActionRate")) or 0.0) != float(safety.get("invalidActionRateEq", 0.0)))
        or ((_as_float(_get(lane, "actionTelemetry", "sanitizerRate")) or 0.0) != float(safety.get("sanitizerRateEq", 0.0)))
        for lane in (eval_metrics, holdout_metrics)
    )
    runtime_errors = any(_as_int(_get(lane, "failureClasses", "runtimeErrorCount")) > 0 for lane in (eval_metrics, holdout_metrics))
    blocking_reasons = [
        "run-kind is not comparable-terminal-repair" if train_report.get("runKind") != "comparable-terminal-repair" else None,
        "model package missing" if train_report.get("truePpoModelPackage") is not True else None,
        "optimizer update missing" if train_report.get("truePpoOptimizerUpdate") is not True else None,
        "minimum eval/holdout episode statistics missing" if not minimum_ok else None,
        "ppo-regression against DQN anchor" if ppo_regression else None,
        "terminal/death matrix is not start-capable" if not terminal_ready else None,
        "high clamp/veto/invalid/sanitizer load" if high_action_load else None,
        "runtimeErrorCount above zero" if runtime_errors else None,
    ]
    blockers = [reason for reason in blocking_reasons if reason]
    survival_ready = (
        eval_survival_delta is not None
        and holdout_survival_delta is not None
        and eval_survival_delta >= 30.0
        and holdout_survival_delta >= 30.0
        and eval_steps_delta is not None
        and holdout_steps_delta is not None
        and eval_steps_delta >= 0.0
        and holdout_steps_delta >= 0.0
    )
    return {
        "deltasAgainstDqn": {
            "evalAvgStepsPerEpisodePct": eval_steps_delta,
            "evalAverageBotSurvivalPct": eval_survival_delta,
            "holdoutAvgStepsPerEpisodePct": holdout_steps_delta,
            "holdoutAverageBotSurvivalPct": holdout_survival_delta,
            "resultClass": "ppo-regression" if ppo_regression else "not-regression",
        },
        "hardRules": {
            "minimumStatisticsOk": minimum_ok,
            "terminalDeathMatrixStartCapable": terminal_ready,
            "ppoRegressionBlocksStart": ppo_regression,
            "highActionLoadBlocksStart": high_action_load,
            "runtimeErrorCountBlocksStart": runtime_errors,
            "bt94aReadyCandidate": survival_ready and not blockers,
            "bt94aRemainsClosed": bool(blockers),
            "blockingReasons": blockers,
        },
    }


def build_report() -> dict[str, Any]:
    config = _read_json(DEFAULT_CONFIG_PATH)
    contract_path = _repo_path(str(_get(config, "artifacts", "survivalGateContract")))
    contract = _read_json(contract_path)
    budget = _read_json(DEFAULT_BUDGET_PATH)
    train_pointer_path, train_report_path, train_report = _pointer_report("latest_comparable_terminal_repair.json")
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_comparable_terminal_repair_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    eval_metrics = _lane_metrics(eval_report)
    holdout_metrics = _lane_metrics(holdout_report)
    rules = _result_rules(contract, train_report, eval_metrics, holdout_metrics)
    hard = rules["hardRules"]
    result_class = "BT94A-ready" if hard["bt94aReadyCandidate"] else "diagnose-blocked"
    phase_coverage = {
        "93H.3.1": train_report.get("runKind") == "comparable-terminal-repair",
        "93H.3.2": all(
            (_as_float(_get(lane, "actionTelemetry", "preSamplingMaskRate")) or 0.0) > 0.0
            and (_as_float(_get(lane, "actionTelemetry", "postDecodeClampRate")) or 0.0) < 0.5
            for lane in (eval_metrics, holdout_metrics)
        ),
        "93H.3.3": bool(
            train_report.get("truePpoModelPackage") is True
            and _get(train_report, "artifacts", "modelSha256")
            and _get(train_report, "artifacts", "optimizerStateSha256")
            and _get(train_report, "artifacts", "vecnormalizeSha256")
        ),
        "93H.3.4": True,
        "93H.3.5": True,
    }
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93h_repair_ladder_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93H",
        "phaseId": "93H.3",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "repairRun": {
            "runId": train_report.get("runId"),
            "runKind": train_report.get("runKind"),
            "report": _rel(train_report_path),
            "requestedTimesteps": _get(train_report, "learning", "requestedTimesteps"),
            "truePpoOptimizerUpdate": train_report.get("truePpoOptimizerUpdate"),
            "truePpoModelPackage": train_report.get("truePpoModelPackage"),
            "sourceModelPackage": _get(train_report, "resumedFrom", "artifactManifest"),
            "modelSha256": _get(train_report, "artifacts", "modelSha256"),
            "optimizerStateSha256": _get(train_report, "artifacts", "optimizerStateSha256"),
            "vecnormalizeSha256": _get(train_report, "artifacts", "vecnormalizeSha256"),
            "candidateRun": False,
            "freezeCandidate": False,
        },
        "comparison": {
            "dqnChampion": _get(contract, "referenceLock", "dqnAnchor", "metrics") or {},
            "ppoComparableTerminalEval": eval_metrics,
            "ppoHoldout": holdout_metrics,
            "deltasAgainstDqn": rules["deltasAgainstDqn"],
        },
        "resultRules": {
            **hard,
            "candidateFreezeAllowed": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
        },
        "findingDisposition": {
            "F.05": "still-blocking" if hard["ppoRegressionBlocksStart"] else "closed-for-bt93h-comparable-terminal-repair",
            "F.19": "still-blocking" if not hard["terminalDeathMatrixStartCapable"] else "closed",
            "F.27": "still-blocking" if hard["ppoRegressionBlocksStart"] else "closed-for-bt93h-comparable-terminal-repair",
            "F.31": "still-blocking" if not hard["terminalDeathMatrixStartCapable"] else "closed",
        },
        "bt94aImpact": {
            "claimableAfter93H3": result_class == "BT94A-ready",
            "blockedFindings": [
                finding
                for finding, status in {
                    "F.05": "still-blocking" if hard["ppoRegressionBlocksStart"] else "closed",
                    "F.19": "still-blocking" if not hard["terminalDeathMatrixStartCapable"] else "closed",
                    "F.27": "still-blocking" if hard["ppoRegressionBlocksStart"] else "closed",
                    "F.31": "still-blocking" if not hard["terminalDeathMatrixStartCapable"] else "closed",
                }.items()
                if status == "still-blocking"
            ],
            "decision": (
                "BT94A remains closed; BT93H.3 still violates hard terminal/survival rules."
                if result_class == "diagnose-blocked"
                else "BT93H.4 may refresh the BT94A start gate from BT93H artifacts."
            ),
        },
        "commands": {
            "budget": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_repair_ladder_report.py --write-budget",
            "train": train_report.get("learning", {}).get("trainingCommand"),
            "eval": eval_report.get("evalCommand"),
            "holdout": holdout_report.get("evalCommand"),
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_repair_ladder_report.py --write-report",
        },
        "sourceArtifacts": {
            "bt93hConfig": _source(DEFAULT_CONFIG_PATH, "BT93H config"),
            "survivalGateContract": _source(contract_path, "BT93H survival gate contract"),
            "repairBudget": _source(DEFAULT_BUDGET_PATH, "BT93H repair budget"),
            "repairTrainPointer": _source(train_pointer_path, "BT93H repair pointer", closure_capable=False),
            "repairTrainReport": _source(train_report_path, "BT93H repair train"),
            "evalPointer": _source(eval_pointer_path, "BT93H eval pointer", closure_capable=False),
            "evalReport": _source(eval_report_path, "BT93H eval"),
            "holdoutPointer": _source(holdout_pointer_path, "BT93H holdout pointer", closure_capable=False),
            "holdoutReport": _source(holdout_report_path, "BT93H holdout"),
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
    parser = argparse.ArgumentParser(description="Write BT93H.3 comparable terminal repair artifacts.")
    parser.add_argument("--write-budget", action="store_true")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--budget-output", default=str(DEFAULT_BUDGET_PATH))
    parser.add_argument("--report-output", default=str(DEFAULT_REPORT_PATH))
    args = parser.parse_args()

    result: dict[str, Any] = {}
    if args.write_budget:
        budget = build_budget()
        budget_path = Path(args.budget_output).resolve()
        _write_json(budget_path, budget)
        result["budget"] = {
            "ok": budget["ok"],
            "resultClass": budget["resultClass"],
            "budgetChecks": budget["budgetChecks"],
            "wrote": _rel(budget_path),
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
