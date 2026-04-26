"""BT93E terminal, reward, and failure diagnostic report.

This report closes the BT93E.3 evidence loop from versioned BT93E train,
eval, and holdout artifacts. It records start blockers without creating a
candidate, freezing a model, promoting, or touching runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import subprocess
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93D_ROOT = PPO_ROOT / "bt93d"
BT93E_ROOT = PPO_ROOT / "bt93e"

DEFAULT_REPORT_PATH = BT93E_ROOT / "terminal_reward_failure_report.json"
DEFAULT_START_MATRIX_PATH = BT93E_ROOT / "start_matrix.json"

MIN_COMPLETED_EPISODES = {
    "eval": 6,
    "holdout": 4,
}


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


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _rate(count: int, total: int) -> float | None:
    if total <= 0:
        return None
    return round(count / total, 6)


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


def _merge_counts(rows: Iterable[Mapping[str, Any] | None]) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in rows:
        if not isinstance(row, Mapping):
            continue
        for key, value in row.items():
            result[str(key)] = result.get(str(key), 0) + _as_int(value)
    return result


def _pointer_report(pointer_name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93E_ROOT / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, report_path, _read_json(report_path)


def _telemetry_rows(report: Mapping[str, Any], lane: str) -> list[Mapping[str, Any]]:
    rows = _get(report, "learning", "telemetry") if lane == "train" else _get(report, "eval", "telemetry")
    return [row for row in rows if isinstance(row, Mapping)] if isinstance(rows, list) else []


def _aggregate_action_telemetry(report: Mapping[str, Any], lane: str) -> dict[str, Any]:
    rows = _telemetry_rows(report, lane)
    aggregate = {
        "totalActions": sum(_as_int(row.get("totalActions")) for row in rows),
        "invalidActionCount": sum(_as_int(row.get("invalidActionCount")) for row in rows),
        "maskCount": sum(_as_int(row.get("maskCount")) for row in rows),
        "vetoCount": sum(_as_int(row.get("vetoCount")) for row in rows),
        "sanitizerCount": sum(_as_int(row.get("sanitizerCount")) for row in rows),
        "noopCount": sum(_as_int(row.get("noopCount")) for row in rows),
        "fieldCounts": _merge_counts(row.get("fieldCounts") for row in rows),
        "sanitizerReasons": _merge_counts(row.get("sanitizerReasons") for row in rows),
        "sampleCount": len(rows),
    }
    total = aggregate["totalActions"]
    aggregate.update(
        {
            "invalidActionRate": _rate(aggregate["invalidActionCount"], total),
            "maskRate": _rate(aggregate["maskCount"], total),
            "vetoRate": _rate(aggregate["vetoCount"], total),
            "sanitizerRate": _rate(aggregate["sanitizerCount"], total),
            "noopRate": _rate(aggregate["noopCount"], total),
        }
    )
    return aggregate


def _failure_semantics(report: Mapping[str, Any], lane: str) -> dict[str, Any]:
    failure = _get(report, "diagnostics", "failureSemantics")
    if not isinstance(failure, Mapping):
        return {
            "source": "missing",
            "observabilityStatus": "missing-in-training-report" if lane == "train" else "missing",
            "runtimeErrorCount": None,
            "crash": None,
            "timeout": None,
            "forcedRound": None,
            "socketClose": None,
            "teardownFailure": None,
            "maxSteps": None,
            "naturalTerminal": None,
            "terminalReasonCounts": {},
            "truncatedReasonCounts": {},
            "deathCauseCounts": {},
            "terminalDeathMatrixVisible": False,
            "emptyDeathCauseCounts": True,
            "maxStepsOnly": None,
            "blocksBt94a": True,
            "blockReason": "terminal/death/failure classes are not emitted in this lane artifact",
        }

    terminal = _counter(failure.get("terminalReasonCounts"))
    truncated = _counter(failure.get("truncatedReasonCounts"))
    death = _counter(failure.get("deathCauseCounts"))
    max_steps = _as_int(failure.get("maxSteps"))
    natural = _as_int(failure.get("naturalTerminal"))
    max_steps_only = max_steps > 0 and natural == 0 and not terminal and not death
    empty_death = not bool(death)
    blocks = max_steps_only or empty_death or natural == 0
    return {
        "source": "diagnostics.failureSemantics",
        "observabilityStatus": "visible",
        "runtimeErrorCount": _as_int(failure.get("runtimeErrorCount")),
        "crash": _as_int(failure.get("crash")),
        "timeout": _as_int(failure.get("timeout")),
        "forcedRound": _as_int(failure.get("forcedRound")),
        "socketClose": _as_int(failure.get("socketClose")),
        "teardownFailure": _as_int(failure.get("teardownFailure")),
        "maxSteps": max_steps,
        "naturalTerminal": natural,
        "terminalReasonCounts": terminal,
        "truncatedReasonCounts": truncated,
        "deathCauseCounts": death,
        "terminalDeathMatrixVisible": True,
        "emptyDeathCauseCounts": empty_death,
        "maxStepsOnly": max_steps_only,
        "blocksBt94a": blocks,
        "blockReason": (
            "max-steps-only with empty terminal/death matrix"
            if max_steps_only
            else "natural terminal/death evidence still absent"
            if blocks
            else None
        ),
    }


def _survival_distribution(report: Mapping[str, Any], lane: str, failure: Mapping[str, Any]) -> dict[str, Any]:
    if lane == "train":
        return {
            "source": "not-emitted-by-training-report",
            "episodeLengthDistributionVisible": False,
            "minimumCompletedEpisodes": None,
            "completedEpisodeCount": None,
            "completedEpisodeLengths": [],
            "completedEpisodeStats": _summary([]),
            "avgStepsPerEpisode": None,
            "averageBotSurvival": None,
            "averageBotSurvivalSource": None,
            "maxStepsDominated": None,
            "tooSmallEpisodeCount": True,
            "emptyDeathCauseStartBlocker": True,
            "blocksBt94a": True,
            "blockReason": "training report has action telemetry but no episode terminal distribution",
        }

    survival = _get(report, "diagnostics", "survivalKpis") or {}
    shortening = _get(
        report,
        "diagnostics",
        "rewardSafetyDiagnostics",
        "rewardHackingSignals",
        "episodeShorteningCheck",
    ) or {}
    lengths = [float(value) for value in shortening.get("completedEpisodeLengths") or [] if _as_float(value) is not None]
    stats = _summary(lengths)
    completed_count = _as_int(survival.get("completedEpisodeCount"))
    minimum = MIN_COMPLETED_EPISODES.get(lane)
    too_small = minimum is not None and completed_count < minimum
    max_steps_dominated = bool(failure.get("maxStepsOnly"))
    empty_death = bool(failure.get("emptyDeathCauseCounts"))
    blocks = max_steps_dominated or empty_death or too_small
    reasons = [
        "survival distribution is max-steps dominated with no natural terminal/death evidence"
        if max_steps_dominated
        else None,
        "death-cause classes are empty" if empty_death else None,
        f"completedEpisodeCount {completed_count} below minimum {minimum}" if too_small else None,
    ]
    return {
        "source": "diagnostics.survivalKpis + rewardHackingSignals.episodeShorteningCheck",
        "episodeLengthDistributionVisible": True,
        "minimumCompletedEpisodes": minimum,
        "completedEpisodeCount": completed_count,
        "completedEpisodeLengths": lengths,
        "completedEpisodeStats": stats,
        "avgStepsPerEpisode": survival.get("avgStepsPerEpisode"),
        "averageBotSurvival": survival.get("averageBotSurvival"),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "maxStepsDominated": max_steps_dominated,
        "tooSmallEpisodeCount": too_small,
        "emptyDeathCauseStartBlocker": empty_death,
        "blocksBt94a": blocks,
        "blockReason": "; ".join(reason for reason in reasons if reason) or None,
    }


def _reward_safety(
    report: Mapping[str, Any],
    lane: str,
    action: Mapping[str, Any],
    survival_repair: Mapping[str, Any],
) -> dict[str, Any]:
    reward = _get(report, "diagnostics", "rewardSafetyDiagnostics")
    survival_delta = _as_float(_get(survival_repair, "comparison", "deltasAgainstDqn", "averageBotSurvivalPct"))
    dqn_steps = _as_float(_get(survival_repair, "comparison", "dqnChampion", "avgStepsPerEpisode"))
    if not isinstance(reward, Mapping):
        return {
            "source": "learning.telemetry-only" if lane == "train" else "missing",
            "rewardBreakdownVisible": False,
            "rewardTotal": None,
            "rewardMean": None,
            "rewardBreakdownTotals": {},
            "rewardBreakdownMeanPerStep": {},
            "survivalRewardShare": None,
            "safetyOverruleCounts": {"postDecodeSafetyVetoCount": action.get("vetoCount")},
            "episodeShorteningCheck": {},
            "positiveRewardWhileSurvivalRegresses": None,
            "episodeShorteningAgainstDqn": None,
            "blocksBt94a": True,
            "blockReason": "reward breakdown is not emitted in this lane artifact",
        }

    reward_total = _as_float(reward.get("rewardTotal"))
    episode = _get(reward, "rewardHackingSignals", "episodeShorteningCheck") or {}
    avg_steps = _as_float(episode.get("avgStepsPerCompletedEpisode"))
    positive_reward_regression = (
        reward_total is not None
        and reward_total > 0.0
        and survival_delta is not None
        and survival_delta < 0.0
    )
    shortened_against_dqn = avg_steps is not None and dqn_steps is not None and avg_steps < dqn_steps
    blocks = positive_reward_regression or shortened_against_dqn
    reasons = [
        "positive reward coexists with DQN survival regression" if positive_reward_regression else None,
        "completed episode length remains below the DQN step anchor" if shortened_against_dqn else None,
    ]
    return {
        "source": "diagnostics.rewardSafetyDiagnostics",
        "rewardBreakdownVisible": True,
        "rewardTotal": reward_total,
        "rewardMean": reward.get("rewardMean"),
        "rewardBreakdownTotals": reward.get("rewardBreakdownTotals") or {},
        "rewardBreakdownMeanPerStep": reward.get("rewardBreakdownMeanPerStep") or {},
        "survivalRewardShare": _get(reward, "rewardHackingSignals", "survivalRewardShare"),
        "safetyOverruleCounts": _counter(_get(reward, "rewardHackingSignals", "safetyOverruleCounts")),
        "episodeShorteningCheck": episode,
        "positiveRewardWhileSurvivalRegresses": positive_reward_regression,
        "episodeShorteningAgainstDqn": shortened_against_dqn,
        "blocksBt94a": blocks,
        "blockReason": "; ".join(reason for reason in reasons if reason) or None,
    }


def _lane_report(
    lane: str,
    role: str,
    report_path: Path,
    report: Mapping[str, Any],
    survival_repair: Mapping[str, Any],
) -> dict[str, Any]:
    action = _aggregate_action_telemetry(report, lane)
    failure = _failure_semantics(report, lane)
    survival = _survival_distribution(report, lane, failure)
    reward = _reward_safety(report, lane, action, survival_repair)
    reasons = [
        failure.get("blockReason"),
        survival.get("blockReason"),
        reward.get("blockReason"),
    ]
    blocked = failure.get("blocksBt94a") or survival.get("blocksBt94a") or reward.get("blocksBt94a")
    return {
        "lane": lane,
        "role": role,
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "report": _rel(report_path),
        "terminalDeathFailureMatrix": failure,
        "survivalDistribution": survival,
        "rewardSafetyEpisodeShortening": reward,
        "actionTelemetryForSafetyContext": action,
        "laneVerdict": {
            "bt94aStartImpact": "blocked" if blocked else "not-blocking",
            "reasons": [reason for reason in reasons if reason],
        },
    }


def _failure_start_row(lane: Mapping[str, Any]) -> dict[str, Any]:
    failure = lane["terminalDeathFailureMatrix"]
    return {
        "runtimeErrorCount": failure.get("runtimeErrorCount"),
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
        "observabilityStatus": failure.get("observabilityStatus"),
        "bt94aStartImpact": lane["laneVerdict"]["bt94aStartImpact"],
    }


def _build_start_matrix_update(report: Mapping[str, Any], report_path: Path | None = None) -> dict[str, Any]:
    lanes = report["lanes"]
    update = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_terminal_reward_failure_report.py",
        "phaseId": "93E.3.4",
        "classification": "bt93e-internal-start-diagnostics-only",
        "countsAsLongRunStabilityEvidence": False,
        "countsAsPpoValidateEvidence": False,
        "countsAsPromotionEvidence": False,
        "failureClassStartMatrix": {
            "train": _failure_start_row(lanes["train"]),
            "eval": _failure_start_row(lanes["eval"]),
            "holdout": _failure_start_row(lanes["holdout"]),
        },
        "survivalDistributionRules": {
            "maxStepsOnlyBlocksStart": True,
            "emptyDeathCauseClassesBlockStart": True,
            "tooSmallEpisodeCountsBlockStart": True,
            "minimumCompletedEpisodes": MIN_COMPLETED_EPISODES,
        },
        "rewardSafetyRules": {
            "positiveRewardWhileSurvivalRegressesBlocksStart": True,
            "episodeShorteningWithRegressiveSurvivalBlocksStart": True,
        },
        "findingDisposition": report["findingDisposition"],
        "bt94aImpact": report["bt94aImpact"],
    }
    if report_path is not None:
        update["sourceReport"] = _source(report_path, "BT93E terminal/reward/failure report")
    return update


def build_report() -> dict[str, Any]:
    survival_repair = _read_json(BT93E_ROOT / "survival_repair_report.json")
    finding_register = _read_json(BT93E_ROOT / "finding_register.json")
    start_matrix = _read_json(DEFAULT_START_MATRIX_PATH)
    bt93d_terminal = _read_json(BT93D_ROOT / "terminal_policy_diagnostics.json")

    train_pointer_path, train_report_path, train_report = _pointer_report("latest_diagnostics_smoke.json")
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_baseline_repro_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    lanes = {
        "train": _lane_report("train", "BT93E diagnostic repair train", train_report_path, train_report, survival_repair),
        "eval": _lane_report("eval", "BT93E same-matrix baseline repro eval", eval_report_path, eval_report, survival_repair),
        "holdout": _lane_report("holdout", "BT93E holdout eval", holdout_report_path, holdout_report, survival_repair),
    }
    lane_values = list(lanes.values())
    f18_visible = all(
        lane["terminalDeathFailureMatrix"].get("observabilityStatus") == "visible"
        for key, lane in lanes.items()
        if key in {"eval", "holdout"}
    )
    f19_blocking = any(lane["terminalDeathFailureMatrix"].get("blocksBt94a") for lane in lane_values)
    f31_blocking = any(lane["survivalDistribution"].get("blocksBt94a") for lane in lane_values)
    r01_blocking = any(lane["rewardSafetyEpisodeShortening"].get("blocksBt94a") for lane in lane_values)
    blocked_findings = [
        finding
        for finding, blocked in [
            ("F.19", f19_blocking),
            ("F.31", f31_blocking),
            ("R.01", r01_blocking),
        ]
        if blocked
    ]
    finding_disposition = {
        "F.18": "not-start-blocking-carried" if f18_visible else "still-blocking",
        "F.19": "still-blocking" if f19_blocking else "closed",
        "F.24": "not-start-blocking-carried",
        "F.31": "still-blocking" if f31_blocking else "closed",
        "R.01": "still-blocking" if r01_blocking else "closed",
    }

    report: dict[str, Any] = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_terminal_reward_failure_report.py",
        "blockId": "BT93E",
        "phaseId": "93E.3",
        "gitSha": _git_sha(),
        "resultClass": "diagnose-blocked" if blocked_findings else "terminal-reward-failure-clear",
        "phaseCoverage": {
            "93E.3.1": True,
            "93E.3.2": True,
            "93E.3.3": True,
            "93E.3.4": True,
        },
        "lanes": lanes,
        "findingDisposition": finding_disposition,
        "bt94aImpact": {
            "claimableAfter93E3": False if blocked_findings else None,
            "blockedFindings": blocked_findings,
            "findingStatus": finding_disposition,
            "decision": "BT94A remains closed; 93E.3 records diagnostics and start blockers only"
            if blocked_findings
            else "93E.4/93E.5 may continue the start-gate refresh",
        },
        "evidenceLimits": {
            "countsAsLongRunStabilityEvidence": False,
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "classification": "internal Train/Eval/Holdout start-diagnostic matrix",
        },
        "commands": {
            "report": (
                "python\\.venv\\Scripts\\python.exe "
                "python\\scripts\\bt93e_terminal_reward_failure_report.py --write-report --update-start-matrix"
            ),
        },
        "sourceArtifacts": {
            "bt93eSurvivalRepair": _source(BT93E_ROOT / "survival_repair_report.json", "BT93E survival repair report"),
            "bt93eFindingRegister": _source(BT93E_ROOT / "finding_register.json", "BT93E finding register"),
            "bt93eStartMatrixBefore93E3": _source(DEFAULT_START_MATRIX_PATH, "BT93E start matrix before terminal/reward update"),
            "bt93dTerminalPolicyDiagnostics": _source(BT93D_ROOT / "terminal_policy_diagnostics.json", "BT93D terminal/policy predecessor"),
            "diagnosticTrainReport": _source(train_report_path, "BT93E diagnostic repair train"),
            "diagnosticTrainPointer": _source(train_pointer_path, "BT93E diagnostic train pointer", closure_capable=False),
            "baselineReproEvalReport": _source(eval_report_path, "BT93E same-matrix eval"),
            "baselineReproEvalPointer": _source(eval_pointer_path, "BT93E eval pointer", closure_capable=False),
            "holdoutEvalReport": _source(holdout_report_path, "BT93E holdout eval"),
            "holdoutEvalPointer": _source(holdout_pointer_path, "BT93E holdout pointer", closure_capable=False),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "findingRegisterSummaryBefore93E3": finding_register.get("summary"),
            "startMatrixResultBefore93E3": start_matrix.get("resultClass"),
            "bt93dPredecessorResult": bt93d_terminal.get("resultClass"),
        },
    }
    report["startMatrixUpdate"] = _build_start_matrix_update(report)
    return report


def update_start_matrix(start_matrix_path: Path, report: Mapping[str, Any], report_path: Path) -> dict[str, Any]:
    start_matrix = _read_json(start_matrix_path) if start_matrix_path.exists() else {}
    updated = deepcopy(start_matrix)
    updated["terminalRewardFailureMatrix"] = _build_start_matrix_update(report, report_path)
    _write_json(start_matrix_path, updated)
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93E.3 terminal/reward/failure diagnostics.")
    parser.add_argument("--write-report", action="store_true", help="Write report JSON file.")
    parser.add_argument("--update-start-matrix", action="store_true", help="Record the failure matrix in BT93E start_matrix.json.")
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH), help="Report output path.")
    parser.add_argument("--start-matrix", default=str(DEFAULT_START_MATRIX_PATH), help="BT93E start matrix path.")
    args = parser.parse_args()

    report_path = Path(args.output).resolve()
    start_matrix_path = Path(args.start_matrix).resolve()
    report = build_report()
    if args.write_report:
        _write_json(report_path, report)
    if args.update_start_matrix:
        update_start_matrix(start_matrix_path, report, report_path)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "findingDisposition": report["findingDisposition"],
                "blockedFindings": report["bt94aImpact"]["blockedFindings"],
                "wrote": {
                    "report": _rel(report_path) if args.write_report else None,
                    "startMatrix": _rel(start_matrix_path) if args.update_start_matrix else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
