"""BT93H.2 survival gate contract builder."""

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
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93G_ROOT = PPO_ROOT / "bt93g"
BT93H_ROOT = PPO_ROOT / "bt93h"

DEFAULT_OUTPUT = BT93H_ROOT / "survival_gate_contract.json"

BT93H_TERMINAL_PATH = BT93H_ROOT / "terminal_root_cause_report.json"
BT93C_BASELINE_PATH = BT93C_ROOT / "baseline_report.json"
BT93C_BASELINE_SOURCE_PATH = BT93C_ROOT / "baseline_source_manifest.json"
BT93C_PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
BT93G_REPAIR_MATRIX_PATH = BT93G_ROOT / "repair_matrix.json"
BT93G_REPAIR_LADDER_PATH = BT93G_ROOT / "repair_ladder_report.json"
BT93G_REPAIR_BUDGET_PATH = BT93G_ROOT / "repair_ladder_budget.json"
BT93G_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93g_comparable_repair.json"


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
    return result


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _pct_thresholds(dqn: Mapping[str, Any]) -> dict[str, Any]:
    survival = _as_float(dqn.get("averageBotSurvival"))
    steps = _as_float(dqn.get("avgStepsPerEpisode"))
    return {
        "dqnAvgStepsPerEpisode": steps,
        "dqnAverageBotSurvival": survival,
        "minEvalAvgStepsPerEpisode": steps,
        "minHoldoutAvgStepsPerEpisode": steps,
        "minEvalAverageBotSurvival": round(survival * 1.3, 6) if survival is not None else None,
        "minHoldoutAverageBotSurvival": round(survival * 1.3, 6) if survival is not None else None,
        "minStepsDeltaPct": 0.0,
        "minSurvivalDeltaPctForBt94aReady": 30.0,
    }


def _observed_bt93g_stats(repair: Mapping[str, Any]) -> dict[str, Any]:
    eval_lane = _get(repair, "comparison", "ppoComparableEval") or {}
    holdout_lane = _get(repair, "comparison", "ppoHoldout") or {}
    return {
        "bt93gComparableEval": {
            "completedEpisodeCount": eval_lane.get("completedEpisodeCount"),
            "completedEpisodeStats": eval_lane.get("completedEpisodeStats"),
            "avgStepsPerEpisode": eval_lane.get("avgStepsPerEpisode"),
            "averageBotSurvival": eval_lane.get("averageBotSurvival"),
            "failureClasses": eval_lane.get("failureClasses"),
            "actionTelemetry": eval_lane.get("actionTelemetry"),
        },
        "bt93gHoldout": {
            "completedEpisodeCount": holdout_lane.get("completedEpisodeCount"),
            "completedEpisodeStats": holdout_lane.get("completedEpisodeStats"),
            "avgStepsPerEpisode": holdout_lane.get("avgStepsPerEpisode"),
            "averageBotSurvival": holdout_lane.get("averageBotSurvival"),
            "failureClasses": holdout_lane.get("failureClasses"),
            "actionTelemetry": holdout_lane.get("actionTelemetry"),
        },
    }


def _minimum_statistics(repair_matrix: Mapping[str, Any], repair: Mapping[str, Any]) -> dict[str, Any]:
    matrix_min = repair_matrix.get("minimumEpisodes") if isinstance(repair_matrix.get("minimumEpisodes"), Mapping) else {}
    eval_observed = _as_int(_get(repair, "comparison", "ppoComparableEval", "completedEpisodeCount"))
    holdout_observed = _as_int(_get(repair, "comparison", "ppoHoldout", "completedEpisodeCount"))
    eval_min = max(_as_int(matrix_min.get("eval")), eval_observed)
    holdout_min = max(_as_int(matrix_min.get("holdout")), holdout_observed)
    return {
        "episodeCount": {
            "evalMin": eval_min,
            "holdoutMin": holdout_min,
            "source": "max(BT93G matrix minimum, BT93G observed completed episode count)",
        },
        "requiredDistributions": {
            "median": True,
            "stdev": True,
            "min": True,
            "max": True,
            "mean": True,
            "completedEpisodeLengths": True,
        },
        "requiredDeltas": [
            "eval.avgStepsPerEpisodePctAgainstDqn",
            "eval.averageBotSurvivalPctAgainstDqn",
            "holdout.avgStepsPerEpisodePctAgainstDqn",
            "holdout.averageBotSurvivalPctAgainstDqn",
        ],
        "requiredFailureClasses": [
            "runtimeErrorCount",
            "crash",
            "timeout",
            "forcedRound",
            "maxSteps",
            "naturalTerminal",
            "deathCauseCounts",
            "terminalReasonCounts",
            "truncatedReasonCounts",
        ],
        "requiredActionTelemetry": [
            "preSamplingMaskRate",
            "postDecodeClampRate",
            "invalidActionRate",
            "sanitizerRate",
            "vetoRate",
        ],
    }


def _decision_rules(thresholds: Mapping[str, Any], config: Mapping[str, Any]) -> dict[str, Any]:
    safety = _get(config, "diagnostics", "safetyThresholds") or {}
    collapse = _get(config, "diagnostics", "collapseThresholds") or {}
    terminal_ready_rule = (
        "eval and holdout each need deathCauseCounts and non-death naturalTerminal>0; "
        "max-steps-only or empty terminal/death matrices are diagnose-blocked"
    )
    common_hard_failures = [
        "runtimeErrorCount > 0",
        "missing median/stdev/completedEpisodeLengths",
        "episodeCount below contract minimum",
        "field contract drift between headless and Python eval",
        "terminal/death matrix not start-capable",
        "postDecodeClampRate >= safety threshold",
        "vetoRate >= safety threshold",
        "invalidActionRate != 0",
        "sanitizerRate != 0",
        "rewardTotal > 0 while survival or steps regress",
        "PPO collapse thresholds exceeded",
    ]
    return {
        "ppo-regression": {
            "class": "blocking",
            "whenAny": [
                "eval.avgStepsPerEpisodePctAgainstDqn < 0",
                "holdout.avgStepsPerEpisodePctAgainstDqn < 0",
                "eval.averageBotSurvivalPctAgainstDqn < 0",
                "holdout.averageBotSurvivalPctAgainstDqn < 0",
            ],
        },
        "diagnose": {
            "class": "blocking",
            "whenAny": common_hard_failures,
            "terminalRule": terminal_ready_rule,
        },
        "hold": {
            "class": "non-promotion",
            "whenAll": [
                "no common hard failures",
                "no negative eval/holdout deltas against DQN",
                "survival +30% target is not met on eval or holdout",
            ],
        },
        "BT94A-ready": {
            "class": "gate-open-for-94A1-only",
            "whenAll": [
                "no common hard failures",
                "eval.avgStepsPerEpisodePctAgainstDqn >= 0",
                "holdout.avgStepsPerEpisodePctAgainstDqn >= 0",
                "eval.averageBotSurvivalPctAgainstDqn >= 30",
                "holdout.averageBotSurvivalPctAgainstDqn >= 30",
                "terminal/death matrix start-capable in eval and holdout",
                "no optimization after holdout",
                "candidateFreezeAllowed=false",
                "promotionAllowed=false",
            ],
            "thresholds": thresholds,
        },
        "safetyThresholds": {
            "postDecodeClampRateLt": safety.get("postDecodeClampRateLt", 0.5),
            "vetoRateLt": safety.get("safetyVetoRateLt", 0.25),
            "invalidActionRateEq": safety.get("invalidActionRateEq", 0.0),
            "sanitizerRateEq": safety.get("sanitizerRateEq", 0.0),
        },
        "collapseThresholds": collapse,
    }


def build_contract() -> dict[str, Any]:
    terminal = _read_json(BT93H_TERMINAL_PATH)
    baseline = _read_json(BT93C_BASELINE_PATH)
    baseline_source = _read_json(BT93C_BASELINE_SOURCE_PATH)
    precomparison = _read_json(BT93C_PRECOMPARISON_PATH)
    repair_matrix = _read_json(BT93G_REPAIR_MATRIX_PATH)
    repair = _read_json(BT93G_REPAIR_LADDER_PATH)
    repair_budget = _read_json(BT93G_REPAIR_BUDGET_PATH)
    config = _read_json(BT93G_CONFIG_PATH)

    dqn = dict(_get(repair_matrix, "baseline", "dqnChampion") or {})
    thresholds = _pct_thresholds(dqn)
    minimum_stats = _minimum_statistics(repair_matrix, repair)
    field_contract_ok = _get(terminal, "rootCause", "fieldContractOk") is True
    current_terminal_gap = _get(terminal, "rootCause", "coverageGap") is True

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93h_survival_gate_contract.py",
        "gitSha": _git_sha(),
        "blockId": "BT93H",
        "phaseId": "93H.2",
        "resultClass": "survival-gate-contract-pinned",
        "phaseCoverage": {
            "93H.2.1": True,
            "93H.2.2": True,
            "93H.2.3": True,
            "93H.2.4": True,
        },
        "referenceLock": {
            "dqnAnchor": {
                "baselineId": _get(baseline_source, "comparisonAnchor", "baselineId")
                or _get(baseline, "dqnReferenceOnly", "baselineId"),
                "metrics": dqn,
                "semanticWindow": _get(baseline_source, "comparisonAnchor", "semanticWindow")
                or _get(baseline, "dqnReferenceOnly", "semanticWindow"),
                "readOnly": True,
            },
            "bt93cBaseline": {
                "baselineId": _get(baseline, "baselineLane", "baselineId"),
                "metrics": baseline.get("ppoBaselineMetrics"),
                "runScope": _get(baseline, "baselineLane", "runScope"),
                "readOnly": True,
            },
            "bt93gRepair": {
                "matrixId": repair_matrix.get("matrixId"),
                "resultClass": repair.get("resultClass"),
                "deltasAgainstDqn": _get(repair, "comparison", "deltasAgainstDqn"),
                "findingDisposition": repair.get("findingDisposition"),
                "readOnly": True,
            },
            "holdoutMatrix": {
                "seeds": repair_matrix.get("seeds"),
                "maps": _get(repair_matrix, "env", "maps"),
                "modeId": _get(repair_matrix, "env", "modeId"),
                "maxStepsPerEpisode": _get(repair_matrix, "env", "maxStepsPerEpisode"),
                "noPostHoldoutOptimization": _get(repair_matrix, "holdoutRule", "noPostHoldoutOptimization"),
                "readOnly": True,
            },
        },
        "currentBt93gObservedStats": _observed_bt93g_stats(repair),
        "minimumStatisticsBeforeRun": minimum_stats,
        "decisionRules": _decision_rules(thresholds, config),
        "executionGate": {
            "terminalFieldContractOk": field_contract_ok,
            "currentNaturalTerminalCoverageGap": current_terminal_gap,
            "diagnosticAndTerminalProvocationAllowed": field_contract_ok,
            "comparableTerminalRepairAllowed": field_contract_ok,
            "fourHourRunAllowedBeforeProvocationGate": False,
            "fourHourRunMaxSeconds": 14400,
            "requiresBeforeLongRun": [
                "terminal-provocation player-dead, match-ended and max-steps controls pass",
                "survival gate contract is unchanged from this artifact",
                "checkpoint and eval interval are pinned",
                "early-stop rules are active",
            ],
        },
        "budgetAndEarlyStop": {
            "wallClockLimitSeconds": _get(config, "rollout", "wallClockLimitSeconds"),
            "timeoutBudgetSeconds": _get(config, "rollout", "timeoutBudgetSeconds"),
            "checkpointFrequency": _get(config, "rollout", "checkpointFrequency"),
            "evalIntervalTimesteps": _get(config, "rollout", "evalIntervalTimesteps"),
            "earlyStopRules": [
                *(_get(config, "diagnostics", "earlyStopRules") or []),
                "stop before long-run continuation if terminal-provocation controls do not emit player-dead, match-ended and max-steps separately",
                "stop before holdout if eval terminal/death matrix is not start-capable",
                "stop before gate-refresh if eval or holdout avgStepsPerEpisode regresses against DQN",
            ],
            "sourceBudgetResultClass": repair_budget.get("resultClass"),
        },
        "forbiddenWork": [
            "BT94A candidate run",
            "freeze candidate",
            "BT94B handover",
            "promote",
            "rollout-ready wording",
            "productive Runtime, Matchstart, AI-Hub, Strategy-Flag or JS-Inference changes",
        ],
        "evidenceLimits": {
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "candidateRun": False,
            "freezeCandidate": False,
        },
        "commands": {
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_survival_gate_contract.py --write-report",
        },
        "sourceArtifacts": {
            "terminalRootCause": _source(BT93H_TERMINAL_PATH, "BT93H terminal root cause"),
            "bt93cBaseline": _source(BT93C_BASELINE_PATH, "BT93C PPO baseline"),
            "bt93cBaselineSource": _source(BT93C_BASELINE_SOURCE_PATH, "BT93C DQN anchor source"),
            "bt93cPrecomparison": _source(BT93C_PRECOMPARISON_PATH, "BT93C/BT93G refreshed precomparison"),
            "bt93gRepairMatrix": _source(BT93G_REPAIR_MATRIX_PATH, "BT93G repair matrix"),
            "bt93gRepairLadder": _source(BT93G_REPAIR_LADDER_PATH, "BT93G repair ladder"),
            "bt93gRepairBudget": _source(BT93G_REPAIR_BUDGET_PATH, "BT93G repair budget"),
            "bt93gConfig": _source(BT93G_CONFIG_PATH, "BT93G comparable repair config"),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "bt94aCheckboxClosureAllowed": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93H.2 survival gate contract.")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    report = build_contract()
    if args.write_report:
        output = Path(args.output)
        if not output.is_absolute():
            output = REPO_ROOT / output
        _write_json(output, report)

    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "evalMinEpisodes": _get(report, "minimumStatisticsBeforeRun", "episodeCount", "evalMin"),
                "holdoutMinEpisodes": _get(report, "minimumStatisticsBeforeRun", "episodeCount", "holdoutMin"),
                "fourHourRunAllowedBeforeProvocationGate": _get(
                    report,
                    "executionGate",
                    "fourHourRunAllowedBeforeProvocationGate",
                ),
                "output": args.output if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
