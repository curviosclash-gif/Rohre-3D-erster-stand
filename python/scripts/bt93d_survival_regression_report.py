"""BT93D survival-regression report builder.

This phase reproduces the DQN/PPO survival comparison from fresh BT93D
eval/holdout evidence. It does not train a candidate, freeze a model, promote,
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
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
BT93C_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
BT93D_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93d"
BT94A_GATE_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt94a" / "no_start_gate.json"
DEFAULT_REPORT_PATH = BT93D_ROOT / "survival_regression_report.json"
DEFAULT_MINIMUM_STATS_PATH = BT93D_ROOT / "minimum_start_statistics.json"


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
        "path": _rel(path),
        "sha256": _sha256_file(path),
        "role": role,
        "closureCapable": closure_capable,
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


def _pct_delta(current: Any, baseline: Any) -> float | None:
    current_float = _as_float(current)
    baseline_float = _as_float(baseline)
    if current_float is None or baseline_float in (None, 0.0):
        return None
    return round(((current_float - baseline_float) / baseline_float) * 100.0, 6)


def _summary(values: list[float]) -> dict[str, Any]:
    clean = [float(value) for value in values if math.isfinite(float(value))]
    if not clean:
        return {
            "count": 0,
            "min": None,
            "max": None,
            "mean": None,
            "median": None,
            "stdev": None,
        }
    return {
        "count": len(clean),
        "min": round(min(clean), 6),
        "max": round(max(clean), 6),
        "mean": round(sum(clean) / len(clean), 6),
        "median": round(statistics.median(clean), 6),
        "stdev": round(statistics.pstdev(clean), 6) if len(clean) > 1 else 0.0,
    }


def _pointer_report(pointer_name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93D_ROOT / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, report_path, _read_json(report_path)


def _eval_metrics(report: Mapping[str, Any]) -> dict[str, Any]:
    survival = _get(report, "diagnostics", "survivalKpis") or {}
    reward = _get(report, "diagnostics", "rewardSafetyDiagnostics") or {}
    reward_hacking = _get(reward, "rewardHackingSignals", "episodeShorteningCheck") or {}
    action = _get(reward, "actionTelemetry") or {}
    failure = _get(report, "diagnostics", "failureSemantics") or {}
    completed_lengths = [
        float(value)
        for value in reward_hacking.get("completedEpisodeLengths", [])
        if _as_float(value) is not None
    ]
    return {
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "report": _get(report, "artifacts", "evalReport"),
        "avgStepsPerEpisode": survival.get("avgStepsPerEpisode"),
        "avgStepsPerEpisodeObserved": survival.get("avgStepsPerEpisodeObserved"),
        "averageBotSurvival": survival.get("averageBotSurvival"),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "completedEpisodeCount": survival.get("completedEpisodeCount"),
        "completedEpisodeLengths": completed_lengths,
        "completedEpisodeStats": _summary(completed_lengths),
        "runtimeErrorCount": failure.get("runtimeErrorCount"),
        "failureClasses": {
            "crash": failure.get("crash"),
            "timeout": failure.get("timeout"),
            "forcedRound": failure.get("forcedRound"),
            "socketClose": failure.get("socketClose"),
            "teardownFailure": failure.get("teardownFailure"),
            "maxSteps": failure.get("maxSteps"),
            "naturalTerminal": failure.get("naturalTerminal"),
            "deathCauseCounts": failure.get("deathCauseCounts"),
            "terminalReasonCounts": failure.get("terminalReasonCounts"),
            "truncatedReasonCounts": failure.get("truncatedReasonCounts"),
        },
        "actionTelemetry": {
            "invalidActionRate": action.get("invalidActionRate"),
            "maskRate": action.get("maskRate"),
            "vetoRate": action.get("vetoRate"),
            "sanitizerRate": action.get("sanitizerRate"),
            "totalActions": action.get("totalActions"),
            "fieldCounts": action.get("fieldCounts"),
        },
    }


def _audit_rows(matrix: Mapping[str, Any], ids: set[str]) -> list[dict[str, Any]]:
    rows = matrix.get("auditRegister") if isinstance(matrix.get("auditRegister"), list) else []
    result = []
    for row in rows:
        if isinstance(row, Mapping) and str(row.get("id")) in ids:
            result.append(
                {
                    "id": str(row.get("id")),
                    "status": row.get("status"),
                    "gate": row.get("gate"),
                    "evidence": row.get("evidence"),
                    "blocksBt94a": row.get("blocksBt94a"),
                }
            )
    return result


def _comparison_classification(eval_delta: float | None, holdout_delta: float | None) -> str:
    if eval_delta is None or holdout_delta is None:
        return "diagnose-missing-metric"
    if eval_delta < -10.0 or holdout_delta < -10.0:
        return "ppo-regression"
    return "not-regression"


def _minimum_stats(precomparison: Mapping[str, Any], dqn_metrics: Mapping[str, Any]) -> dict[str, Any]:
    comparison = precomparison.get("comparisonMatrix") if isinstance(precomparison.get("comparisonMatrix"), Mapping) else {}
    dqn_survival = _as_float(dqn_metrics.get("averageBotSurvival"))
    dqn_steps = _as_float(dqn_metrics.get("avgStepsPerEpisode"))
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93d_survival_regression_report.py",
        "blockId": "BT93D",
        "phaseId": "93D.2.4",
        "matrixId": "bt93d-survival-repair-minimum-v1",
        "sourceMatrixId": comparison.get("matrixId"),
        "semanticWindow": comparison.get("modeId"),
        "maps": comparison.get("maps") or ["standard", "maze"],
        "seeds": {
            "eval": comparison.get("evalSeeds") or [944, 945],
            "holdout": comparison.get("holdoutSeeds") or [950, 951],
        },
        "minimumEpisodes": {
            "evalCompletedEpisodes": 6,
            "holdoutCompletedEpisodes": 4,
            "rationale": "BT93C/BT93D two-episode checks remain diagnostic; the next start needs median/spread visibility.",
        },
        "holdoutRule": {
            "holdoutShareMinimum": 0.25,
            "holdoutSeedsMustNotBeOptimizedOn": True,
            "holdoutReportedSeparately": True,
        },
        "requiredStatistics": [
            "avgStepsPerEpisode",
            "averageBotSurvival",
            "medianCompletedEpisodeLength",
            "stdevCompletedEpisodeLength",
            "runtimeErrorCount",
            "failureClasses",
            "terminalReasonCounts",
            "deathCauseCounts",
            "invalidActionRate",
            "maskRate",
            "vetoRate",
            "sanitizerRate",
        ],
        "bt94aStartNonInferiority": {
            "averageBotSurvivalDeltaPctMinimum": -10.0,
            "avgStepsPerEpisodeDeltaPctMinimum": -10.0,
            "holdoutAverageBotSurvivalDeltaPctMinimum": -10.0,
            "dqnAverageBotSurvival": dqn_survival,
            "dqnAvgStepsPerEpisode": dqn_steps,
            "minimumAverageBotSurvival": round(dqn_survival * 0.9, 6) if dqn_survival is not None else None,
            "minimumAvgStepsPerEpisode": round(dqn_steps * 0.9, 6) if dqn_steps is not None else None,
            "promotionPlus30PctRemainsBt94BOnly": True,
        },
        "abortCriteria": [
            "runtimeErrorCount > 0",
            "precomparison resultClass remains ppo-regression",
            "handover resultClass remains diagnose",
            "bt94aHandover.ready is not true",
            "reward rises while averageBotSurvival or avgStepsPerEpisode regresses",
            "holdout regresses below the non-inferiority threshold",
            "terminal/death matrix remains max-steps-only",
            "mask/veto/clamp load hides policy invalid-action burden",
            "any JS inference, runtime strategy flag, registry, rollback, latency, matchstart, or AI-Hub surface changes appear",
        ],
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    precomparison = _read_json(BT93C_ROOT / "precomparison_report.json")
    handover = _read_json(BT93C_ROOT / "handover_report.json")
    evidence_matrix = _read_json(BT93C_ROOT / "evidence_quality_matrix.json")
    baseline = _read_json(BT93C_ROOT / "baseline_report.json")
    repair_manifest = _read_json(BT93D_ROOT / "repair_manifest.json")
    gate = _read_json(BT94A_GATE_PATH)
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_baseline_repro_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    dqn_metrics = dict(_get(precomparison, "metrics", "dqnChampion") or {})
    ppo_eval_metrics = _eval_metrics(eval_report)
    ppo_holdout_metrics = _eval_metrics(holdout_report)
    eval_survival_delta = _pct_delta(ppo_eval_metrics.get("averageBotSurvival"), dqn_metrics.get("averageBotSurvival"))
    eval_steps_delta = _pct_delta(ppo_eval_metrics.get("avgStepsPerEpisode"), dqn_metrics.get("avgStepsPerEpisode"))
    holdout_survival_delta = _pct_delta(
        ppo_holdout_metrics.get("averageBotSurvival"),
        dqn_metrics.get("averageBotSurvival"),
    )
    result_class = _comparison_classification(eval_survival_delta, holdout_survival_delta)
    minimum_stats = _minimum_stats(precomparison, dqn_metrics)

    phase_status = {
        "93D.2.1": True,
        "93D.2.2": True,
        "93D.2.3": True,
        "93D.2.4": True,
    }
    bt94a_ready = (
        result_class != "ppo-regression"
        and handover.get("resultClass") != "diagnose"
        and bool(_get(handover, "bt94aHandover", "ready"))
    )

    report = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93d_survival_regression_report.py",
        "blockId": "BT93D",
        "phaseId": "93D.2",
        "gitSha": _git_sha(),
        "resultClass": "survival-regression-reproduced" if result_class == "ppo-regression" else "survival-gate-open",
        "phaseCoverage": phase_status,
        "comparison": {
            "matrixId": _get(precomparison, "comparisonMatrix", "matrixId"),
            "semanticWindow": _get(precomparison, "comparisonMatrix", "modeId"),
            "oldReportsExcluded": [
                "data/bot_validation_report.json",
                "tmp/**",
                "BT93B scaffold reports",
            ],
            "dqnChampion": dqn_metrics,
            "ppoEval": ppo_eval_metrics,
            "ppoHoldout": ppo_holdout_metrics,
            "deltasAgainstDqn": {
                "avgStepsPerEpisodePct": eval_steps_delta,
                "averageBotSurvivalPct": eval_survival_delta,
                "holdoutAverageBotSurvivalPct": holdout_survival_delta,
                "resultClass": result_class,
            },
        },
        "repairLearnerRun": {
            "status": "blocked",
            "phaseItem": "93D.2.2",
            "reason": (
                "Fresh BT93D eval and holdout evidence reproduce the BT93C survival regression. "
                "A same-config micro learner would not close F.05/F.27 and could be misread as "
                "candidate tuning before 93D.3 diagnostics."
            ),
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionClaim": False,
            "allowedNextRepairOnlyAfter": [
                "93D.3 terminal/death/mask diagnostics",
                "fixed minimum statistics from data/training/ppo/bt93d/minimum_start_statistics.json",
            ],
        },
        "evalHoldoutGate": {
            "bt94aStartAllowedAfter93D2": bt94a_ready,
            "precomparisonRequired": "not ppo-regression",
            "precomparisonObserved": result_class,
            "handoverResultRequired": "not diagnose",
            "handoverResultObserved": handover.get("resultClass"),
            "handoverReadyRequired": True,
            "handoverReadyObserved": _get(handover, "bt94aHandover", "ready"),
            "decision": "BT94A remains closed" if not bt94a_ready else "BT94A start gate can be refreshed",
        },
        "auditImpact": {
            "trackedFindings": _audit_rows(evidence_matrix, {"F.05", "F.27"}),
            "status": "F.05 and F.27 remain bt94a-blocker until non-regression evidence exists",
        },
        "minimumStartStatisticsPath": "data/training/ppo/bt93d/minimum_start_statistics.json",
        "sourceArtifacts": {
            "precomparisonReport": _source(BT93C_ROOT / "precomparison_report.json", "BT93C DQN/PPO precomparison"),
            "handoverReport": _source(BT93C_ROOT / "handover_report.json", "BT93C handover gate state"),
            "evidenceQualityMatrix": _source(BT93C_ROOT / "evidence_quality_matrix.json", "BT93C audit matrix"),
            "baselineReport": _source(BT93C_ROOT / "baseline_report.json", "BT93C baseline report"),
            "repairManifest": _source(BT93D_ROOT / "repair_manifest.json", "BT93D repair manifest"),
            "bt94aGate": _source(BT94A_GATE_PATH, "BT94A current no-start gate"),
            "bt93dEvalReport": _source(eval_report_path, "fresh BT93D baseline repro eval"),
            "bt93dEvalPointer": _source(eval_pointer_path, "BT93D eval pointer", closure_capable=False),
            "bt93dHoldoutReport": _source(holdout_report_path, "fresh BT93D holdout eval"),
            "bt93dHoldoutPointer": _source(holdout_pointer_path, "BT93D holdout pointer", closure_capable=False),
        },
        "commands": {
            "eval": (
                "tmp\\bt93c-clean-env-20260424T155919Z\\Scripts\\python.exe python\\eval.py "
                "--profile bt93c --run-kind baseline-repro-eval --phase-id 93D.2.3 "
                "--config python\\configs\\ppo_bt93c_baseline.json --artifact-root data\\training\\ppo\\bt93d "
                "--checkpoint data\\training\\ppo\\bt93c\\runs\\20260424T180033Z-baseline-train\\artifact_manifest.json "
                "--eval-steps 16"
            ),
            "holdout": (
                "tmp\\bt93c-clean-env-20260424T155919Z\\Scripts\\python.exe python\\eval.py "
                "--profile bt93c --run-kind holdout-eval --phase-id 93D.2.3 "
                "--config python\\configs\\ppo_bt93c_baseline.json --artifact-root data\\training\\ppo\\bt93d "
                "--checkpoint data\\training\\ppo\\bt93c\\runs\\20260424T180033Z-baseline-train\\artifact_manifest.json "
                "--eval-steps 16"
            ),
            "report": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93d_survival_regression_report.py "
                "--write-report"
            ),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "fourEnvAllowed": _get(repair_manifest, "freshness", "fourEnv", "ok") is False,
            "ppoValidateStillBt94B3RestDebt": True,
        },
        "bt94aGateSnapshot": {
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "resultClass": gate.get("resultClass"),
        },
    }
    return report, minimum_stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93D survival regression evidence.")
    parser.add_argument("--write-report", action="store_true", help="Write report JSON files.")
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH), help="Survival regression report path.")
    parser.add_argument(
        "--minimum-stats-output",
        default=str(DEFAULT_MINIMUM_STATS_PATH),
        help="Minimum statistics report path.",
    )
    args = parser.parse_args()

    report, minimum_stats = build_reports()
    if args.write_report:
        _write_json(Path(args.output).resolve(), report)
        _write_json(Path(args.minimum_stats_output).resolve(), minimum_stats)
    print(json.dumps({"survivalRegressionReport": report, "minimumStartStatistics": minimum_stats}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
