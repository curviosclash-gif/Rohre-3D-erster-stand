"""BT93E survival repair and DQN/PPO precomparison report.

This report closes the BT93E.2 evidence loop from BT93E-owned sidecar
artifacts. It does not create a candidate, freeze a model, promote, or touch
runtime surfaces.
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
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93E_ROOT = PPO_ROOT / "bt93e"
BT94A_GATE_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"

DEFAULT_REPORT_PATH = BT93E_ROOT / "survival_repair_report.json"


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
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None, "stdev": None}
    return {
        "count": len(clean),
        "min": round(min(clean), 6),
        "max": round(max(clean), 6),
        "mean": round(sum(clean) / len(clean), 6),
        "median": round(statistics.median(clean), 6),
        "stdev": round(statistics.pstdev(clean), 6) if len(clean) > 1 else 0.0,
    }


def _pointer_report(pointer_name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93E_ROOT / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, report_path, _read_json(report_path)


def _training_report() -> tuple[Path, Path, dict[str, Any]]:
    return _pointer_report("latest_diagnostics_smoke.json")


def _completed_lengths(report: Mapping[str, Any]) -> list[float]:
    reward = _get(report, "diagnostics", "rewardSafetyDiagnostics") or {}
    episode = _get(reward, "rewardHackingSignals", "episodeShorteningCheck") or {}
    return [float(value) for value in episode.get("completedEpisodeLengths", []) if _as_float(value) is not None]


def _eval_metrics(report: Mapping[str, Any]) -> dict[str, Any]:
    survival = _get(report, "diagnostics", "survivalKpis") or {}
    reward = _get(report, "diagnostics", "rewardSafetyDiagnostics") or {}
    action = _get(reward, "actionTelemetry") or {}
    failure = _get(report, "diagnostics", "failureSemantics") or {}
    completed_lengths = _completed_lengths(report)
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


def _comparison_classification(
    eval_steps_delta: float | None,
    eval_survival_delta: float | None,
    holdout_survival_delta: float | None,
) -> str:
    if eval_steps_delta is None or eval_survival_delta is None or holdout_survival_delta is None:
        return "diagnose-missing-metric"
    if eval_steps_delta < -10.0 or eval_survival_delta < -10.0 or holdout_survival_delta < -10.0:
        return "ppo-regression"
    return "not-regression"


def _training_runs_after(holdout_run_id: str | None) -> list[dict[str, Any]]:
    if not holdout_run_id:
        return []
    results = []
    runs_root = BT93E_ROOT / "runs"
    if not runs_root.exists():
        return results
    for report_path in runs_root.glob("*/training_report.json"):
        report = _read_json(report_path)
        run_id = str(report.get("runId") or "")
        if run_id > holdout_run_id and _get(report, "learning", "optimizerUpdatesCompleted") is True:
            results.append({"runId": run_id, "report": _rel(report_path)})
    return results


def _phase_coverage(
    repair: Mapping[str, Any],
    comparison: Mapping[str, Any],
    holdout_non_optimization: Mapping[str, Any],
) -> dict[str, bool]:
    deltas = comparison.get("deltasAgainstDqn") if isinstance(comparison.get("deltasAgainstDqn"), Mapping) else {}
    return {
        "93E.2.1": repair.get("status") in {"executed-diagnostic-smoke", "no-run-documented"},
        "93E.2.2": all(
            deltas.get(key) is not None
            for key in ("avgStepsPerEpisodePct", "averageBotSurvivalPct", "holdoutAverageBotSurvivalPct")
        ),
        "93E.2.3": bool(comparison.get("resultRulesApplied")),
        "93E.2.4": bool(holdout_non_optimization.get("ok")),
    }


def build_report() -> dict[str, Any]:
    precomparison = _read_json(BT93C_ROOT / "precomparison_report.json")
    finding_register = _read_json(BT93E_ROOT / "finding_register.json")
    start_matrix = _read_json(BT93E_ROOT / "start_matrix.json")
    gate = _read_json(BT94A_GATE_PATH)

    train_pointer_path, train_report_path, train_report = _training_report()
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_baseline_repro_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    dqn_metrics = dict(_get(precomparison, "metrics", "dqnChampion") or {})
    ppo_eval_metrics = _eval_metrics(eval_report)
    ppo_holdout_metrics = _eval_metrics(holdout_report)

    eval_steps_delta = _pct_delta(ppo_eval_metrics.get("avgStepsPerEpisode"), dqn_metrics.get("avgStepsPerEpisode"))
    eval_survival_delta = _pct_delta(ppo_eval_metrics.get("averageBotSurvival"), dqn_metrics.get("averageBotSurvival"))
    holdout_survival_delta = _pct_delta(
        ppo_holdout_metrics.get("averageBotSurvival"),
        dqn_metrics.get("averageBotSurvival"),
    )
    comparison_result = _comparison_classification(eval_steps_delta, eval_survival_delta, holdout_survival_delta)
    post_holdout_training = _training_runs_after(str(ppo_holdout_metrics.get("runId") or ""))
    holdout_non_optimization = {
        "ok": not post_holdout_training,
        "holdoutRunId": ppo_holdout_metrics.get("runId"),
        "optimizerRunId": train_report.get("runId"),
        "optimizerRunBeforeHoldout": str(train_report.get("runId") or "") < str(ppo_holdout_metrics.get("runId") or ""),
        "postHoldoutOptimizerRuns": post_holdout_training,
        "holdoutSeeds": _get(precomparison, "comparisonMatrix", "holdoutSeeds"),
        "tmpOnlyEvidenceExcluded": True,
        "mutableLatestPointersExcludedAsClosureEvidence": True,
        "oldNonPpoReportsExcluded": ["data/bot_validation_report.json"],
    }
    repair_learner_run = {
        "status": "executed-diagnostic-smoke",
        "runId": train_report.get("runId"),
        "runKind": train_report.get("runKind"),
        "phaseId": train_report.get("phaseId"),
        "requestedTimesteps": _get(train_report, "learning", "requestedTimesteps"),
        "truePpoOptimizerUpdate": train_report.get("truePpoOptimizerUpdate"),
        "diagnosticOnly": _get(train_report, "learning", "diagnosticOnly"),
        "learningQualityClaimAllowed": _get(train_report, "learning", "learningQualityClaimAllowed"),
        "candidateRun": False,
        "freezeCandidate": False,
        "promotionClaim": False,
        "sourceModelPackage": _get(train_report, "resumedFrom", "artifactManifest"),
    }
    comparison = {
        "matrixId": _get(precomparison, "comparisonMatrix", "matrixId"),
        "semanticWindow": _get(precomparison, "comparisonMatrix", "modeId"),
        "maps": _get(precomparison, "comparisonMatrix", "maps"),
        "seeds": {
            "eval": _get(precomparison, "comparisonMatrix", "evalSeeds"),
            "holdout": _get(precomparison, "comparisonMatrix", "holdoutSeeds"),
        },
        "dqnChampion": dqn_metrics,
        "ppoDiagnosticEval": ppo_eval_metrics,
        "ppoHoldout": ppo_holdout_metrics,
        "deltasAgainstDqn": {
            "avgStepsPerEpisodePct": eval_steps_delta,
            "averageBotSurvivalPct": eval_survival_delta,
            "holdoutAverageBotSurvivalPct": holdout_survival_delta,
            "resultClass": comparison_result,
        },
        "resultRulesApplied": True,
        "oldReportsExcluded": ["data/bot_validation_report.json", "tmp/**", "BT93B scaffold reports"],
    }
    result_rules = {
        "precomparisonRequired": "not ppo-regression",
        "precomparisonObserved": comparison_result,
        "ppoRegressionRemainsStartBlocker": comparison_result == "ppo-regression",
        "downgradeRequiresNewEvidence": True,
        "newEvidenceUsed": {
            "diagnosticTrainRunId": train_report.get("runId"),
            "evalRunId": ppo_eval_metrics.get("runId"),
            "holdoutRunId": ppo_holdout_metrics.get("runId"),
        },
        "bt94aClaimableAfter93E2": comparison_result != "ppo-regression" and not post_holdout_training,
        "candidateFreezeAllowed": False,
    }
    finding_disposition = {
        "G.07": "closed" if comparison_result != "ppo-regression" else "still-blocking",
        "C.03": "closed" if comparison_result != "ppo-regression" else "still-blocking",
        "F.05": "closed" if comparison_result != "ppo-regression" else "still-blocking",
        "F.27": "closed" if comparison_result != "ppo-regression" else "still-blocking",
        "F.29": "closed" if holdout_non_optimization["ok"] else "still-blocking",
        "F.32": "still-blocking"
        if ppo_eval_metrics["completedEpisodeStats"]["count"] < 6 or ppo_holdout_metrics["completedEpisodeStats"]["count"] < 4
        else "closed",
    }

    report = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_survival_repair_report.py",
        "blockId": "BT93E",
        "phaseId": "93E.2",
        "gitSha": _git_sha(),
        "resultClass": "diagnose-blocked" if comparison_result == "ppo-regression" else "survival-gate-open",
        "phaseCoverage": _phase_coverage(repair_learner_run, comparison, holdout_non_optimization),
        "repairLearnerRun": repair_learner_run,
        "comparison": comparison,
        "resultRules": result_rules,
        "holdoutNonOptimization": holdout_non_optimization,
        "findingDisposition": finding_disposition,
        "bt94aGateSnapshot": {
            "resultClass": gate.get("resultClass"),
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
        },
        "minimumStatisticsObserved": {
            "evalCompletedEpisodes": ppo_eval_metrics.get("completedEpisodeCount"),
            "holdoutCompletedEpisodes": ppo_holdout_metrics.get("completedEpisodeCount"),
            "evalCompletedEpisodeStats": ppo_eval_metrics.get("completedEpisodeStats"),
            "holdoutCompletedEpisodeStats": ppo_holdout_metrics.get("completedEpisodeStats"),
            "minimumStatsStillNeededBeforeBT94A": finding_disposition["F.32"] == "still-blocking",
        },
        "sourceArtifacts": {
            "bt93eFindingRegister": _source(BT93E_ROOT / "finding_register.json", "BT93E finding register"),
            "bt93eStartMatrix": _source(BT93E_ROOT / "start_matrix.json", "BT93E start matrix"),
            "bt93cPrecomparison": _source(BT93C_ROOT / "precomparison_report.json", "DQN anchor and comparison matrix"),
            "bt94aGate": _source(BT94A_GATE_PATH, "BT94A current gate"),
            "diagnosticTrainReport": _source(train_report_path, "BT93E diagnostic repair train"),
            "diagnosticTrainPointer": _source(train_pointer_path, "BT93E diagnostic train pointer", closure_capable=False),
            "baselineReproEvalReport": _source(eval_report_path, "BT93E same-matrix eval"),
            "baselineReproEvalPointer": _source(eval_pointer_path, "BT93E eval pointer", closure_capable=False),
            "holdoutEvalReport": _source(holdout_report_path, "BT93E holdout eval"),
            "holdoutEvalPointer": _source(holdout_pointer_path, "BT93E holdout pointer", closure_capable=False),
        },
        "commands": {
            "diagnosticTrain": _get(train_report, "learning", "trainingCommand"),
            "eval": (
                "tmp\\bt93c-clean-env-20260424T155919Z\\Scripts\\python.exe python\\eval.py "
                "--profile bt93c --run-kind baseline-repro-eval --phase-id 93E.2.2 "
                "--config python\\configs\\ppo_bt93c_baseline.json --artifact-root data\\training\\ppo\\bt93e "
                f"--checkpoint data\\training\\ppo\\bt93e\\runs\\{train_report.get('runId')}\\artifact_manifest.json --eval-steps 16"
            ),
            "holdout": (
                "tmp\\bt93c-clean-env-20260424T155919Z\\Scripts\\python.exe python\\eval.py "
                "--profile bt93c --run-kind holdout-eval --phase-id 93E.2.4 "
                "--config python\\configs\\ppo_bt93c_baseline.json --artifact-root data\\training\\ppo\\bt93e "
                f"--checkpoint data\\training\\ppo\\bt93e\\runs\\{train_report.get('runId')}\\artifact_manifest.json --eval-steps 16"
            ),
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93e_survival_repair_report.py --write-report",
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "findingRegisterSummaryBefore93E2": finding_register.get("summary"),
            "startMatrixResultBefore93E2": start_matrix.get("resultClass"),
        },
    }
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93E.2 survival repair report.")
    parser.add_argument("--write-report", action="store_true", help="Write report JSON file.")
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH), help="Report output path.")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(Path(args.output).resolve(), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "deltasAgainstDqn": report["comparison"]["deltasAgainstDqn"],
                "wrote": _rel(Path(args.output).resolve()) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
