"""BT93D terminal/death and policy-mask diagnostic report builder.

This phase diagnoses F.19, F.30, and F.31 from already versioned train,
eval, and holdout artifacts. It does not run candidates, freeze a model,
promote, or touch runtime surfaces.
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
BT93C_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
BT93D_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93d"
DEFAULT_REPORT_PATH = BT93D_ROOT / "terminal_policy_diagnostics.json"


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


def _counter(mapping: Any) -> dict[str, int]:
    if not isinstance(mapping, Mapping):
        return {}
    result: dict[str, int] = {}
    for key, value in mapping.items():
        result[str(key)] = _as_int(value)
    return result


def _merge_counts(rows: Iterable[Mapping[str, Any] | None]) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in rows:
        if not isinstance(row, Mapping):
            continue
        for key, value in row.items():
            result[str(key)] = result.get(str(key), 0) + _as_int(value)
    return result


def _telemetry_rows(report: Mapping[str, Any], lane: str) -> list[Mapping[str, Any]]:
    if lane == "train":
        rows = _get(report, "learning", "telemetry")
    else:
        rows = _get(report, "eval", "telemetry")
    return [row for row in rows if isinstance(row, Mapping)] if isinstance(rows, list) else []


def _compact_examples(rows: Iterable[Mapping[str, Any]], limit: int = 6) -> list[dict[str, Any]]:
    examples: list[dict[str, Any]] = []
    for row in rows:
        raw_examples = row.get("rawActionExamples")
        if not isinstance(raw_examples, list):
            continue
        for example in raw_examples:
            if not isinstance(example, Mapping):
                continue
            examples.append(
                {
                    "inventoryLength": example.get("inventoryLength"),
                    "invalidReasons": list(example.get("invalidReasons") or []),
                    "maskEvents": list(example.get("maskEvents") or []),
                    "vetoEvents": list(example.get("vetoEvents") or []),
                    "sanitizerEvents": list(example.get("sanitizerEvents") or []),
                }
            )
            if len(examples) >= limit:
                return examples
    return examples


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
        "compactExamples": _compact_examples(rows),
    }
    total = aggregate["totalActions"]
    aggregate.update(
        {
            "invalidActionRate": _rate(aggregate["invalidActionCount"], total),
            "policyMaskRate": None,
            "maskRate": _rate(aggregate["maskCount"], total),
            "postDecodeClampRate": _rate(aggregate["maskCount"], total),
            "safetyVetoRate": _rate(aggregate["vetoCount"], total),
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
    blocks = max_steps_only or not death or natural == 0
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
        "emptyDeathCauseCounts": not bool(death),
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


def _survival_distribution(report: Mapping[str, Any], lane: str) -> dict[str, Any]:
    if lane == "train":
        return {
            "source": "not-emitted-by-training-report",
            "episodeLengthDistributionVisible": False,
            "completedEpisodeCount": None,
            "completedEpisodeLengths": [],
            "completedEpisodeStats": _summary([]),
            "avgStepsPerEpisode": None,
            "averageBotSurvival": None,
            "maxStepsDominated": None,
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
    lengths = shortening.get("completedEpisodeLengths") or []
    failure = _failure_semantics(report, lane)
    max_steps_only = bool(failure.get("maxStepsOnly"))
    return {
        "source": "diagnostics.survivalKpis + rewardHackingSignals.episodeShorteningCheck",
        "episodeLengthDistributionVisible": True,
        "completedEpisodeCount": survival.get("completedEpisodeCount"),
        "completedEpisodeLengths": [float(value) for value in lengths if _as_float(value) is not None],
        "completedEpisodeStats": _summary(lengths),
        "avgStepsPerEpisode": survival.get("avgStepsPerEpisode"),
        "averageBotSurvival": survival.get("averageBotSurvival"),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "maxStepsDominated": max_steps_only,
        "blocksBt94a": max_steps_only,
        "blockReason": "survival distribution is max-steps dominated with no natural terminal/death evidence"
        if max_steps_only
        else None,
    }


def _reward_safety(report: Mapping[str, Any], lane: str, survival_regression: Mapping[str, Any]) -> dict[str, Any]:
    reward = _get(report, "diagnostics", "rewardSafetyDiagnostics")
    survival_delta = _get(survival_regression, "comparison", "deltasAgainstDqn", "averageBotSurvivalPct")
    if not isinstance(reward, Mapping):
        action = _aggregate_action_telemetry(report, lane)
        return {
            "source": "learning.telemetry-only" if lane == "train" else "missing",
            "rewardBreakdownVisible": False,
            "rewardTotal": None,
            "rewardMean": None,
            "rewardBreakdownTotals": {},
            "rewardBreakdownMeanPerStep": {},
            "safetyOverruleCounts": {
                "postDecodeSafetyVetoCount": action.get("vetoCount"),
            },
            "episodeShorteningCheck": {},
            "positiveRewardWhileSurvivalRegresses": None,
            "blocksBt94a": True,
            "blockReason": "reward breakdown is not emitted in this lane artifact",
        }

    reward_total = _as_float(reward.get("rewardTotal"))
    positive_reward_regression = (
        reward_total is not None
        and reward_total > 0.0
        and _as_float(survival_delta) is not None
        and float(survival_delta) < -10.0
    )
    overrules = _counter(_get(reward, "rewardHackingSignals", "safetyOverruleCounts"))
    return {
        "source": "diagnostics.rewardSafetyDiagnostics",
        "rewardBreakdownVisible": True,
        "rewardTotal": reward_total,
        "rewardMean": reward.get("rewardMean"),
        "rewardBreakdownTotals": reward.get("rewardBreakdownTotals") or {},
        "rewardBreakdownMeanPerStep": reward.get("rewardBreakdownMeanPerStep") or {},
        "survivalRewardShare": _get(reward, "rewardHackingSignals", "survivalRewardShare"),
        "safetyOverruleCounts": overrules,
        "episodeShorteningCheck": _get(reward, "rewardHackingSignals", "episodeShorteningCheck") or {},
        "positiveRewardWhileSurvivalRegresses": positive_reward_regression,
        "blocksBt94a": bool(positive_reward_regression),
        "blockReason": "positive reward coexists with DQN survival regression" if positive_reward_regression else None,
    }


def _lane_report(
    lane: str,
    role: str,
    report_path: Path,
    report: Mapping[str, Any],
    survival_regression: Mapping[str, Any],
) -> dict[str, Any]:
    action = _aggregate_action_telemetry(report, lane)
    failure = _failure_semantics(report, lane)
    survival = _survival_distribution(report, lane)
    reward = _reward_safety(report, lane, survival_regression)
    high_mask_load = (action.get("maskRate") or 0.0) >= 0.5
    high_veto_load = (action.get("vetoRate") or 0.0) >= 0.25
    high_clamp_load = high_mask_load or high_veto_load or (action.get("sanitizerRate") or 0.0) > 0.0
    return {
        "lane": lane,
        "role": role,
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "report": _rel(report_path),
        "terminalDeathFailureMatrix": failure,
        "survivalDistribution": survival,
        "policyMaskClampTelemetry": action,
        "rewardSafetyEpisodeShortening": reward,
        "laneVerdict": {
            "bt94aStartImpact": "blocked"
            if failure.get("blocksBt94a") or survival.get("blocksBt94a") or reward.get("blocksBt94a") or high_clamp_load
            else "not-blocking",
            "highPostDecodeClampOrVetoLoad": high_clamp_load,
            "reasons": [
                reason
                for reason in [
                    failure.get("blockReason"),
                    survival.get("blockReason"),
                    reward.get("blockReason"),
                    "policy-level mask is absent; post-decode mask/veto load is high" if high_clamp_load else None,
                ]
                if reason
            ],
        },
    }


def _pointer_report(pointer_name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93D_ROOT / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, report_path, _read_json(report_path)


def _policy_mask_contract(train_report: Mapping[str, Any]) -> dict[str, Any]:
    action_surface = _get(train_report, "policy", "actionSurface") or {}
    return {
        "surfaceId": action_surface.get("surfaceId"),
        "gymSpace": action_surface.get("gymSpace"),
        "rawBoundarySurfaceTraining": action_surface.get("rawBoundarySurfaceTraining"),
        "policyLevelMasking": {
            "present": False,
            "evidence": "SB3 action space is MultiDiscrete; current maskEvents are emitted after decode from the boundary action surface.",
        },
        "postDecodeClampTelemetry": {
            "present": True,
            "maskSource": _get(action_surface, "indexEncoding", "maskSource"),
            "boundarySanitizer": action_surface.get("boundarySanitizer"),
            "reportedEvents": [
                "maskEvents",
                "vetoEvents",
                "sanitizerEvents",
                "invalidReasons",
                "noopRate",
            ],
        },
    }


def build_report() -> dict[str, Any]:
    baseline = _read_json(BT93C_ROOT / "baseline_report.json")
    survival_regression = _read_json(BT93D_ROOT / "survival_regression_report.json")
    minimum_stats = _read_json(BT93D_ROOT / "minimum_start_statistics.json")
    repair_manifest = _read_json(BT93D_ROOT / "repair_manifest.json")
    train_report_path = _repo_path(str(_get(baseline, "sourceReports", "baselineTrain", "report")))
    train_report = _read_json(train_report_path)
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_baseline_repro_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    lanes = {
        "train": _lane_report("train", "BT93C baseline train package reused as BT93D train-side evidence", train_report_path, train_report, survival_regression),
        "eval": _lane_report("eval", "BT93D baseline repro eval", eval_report_path, eval_report, survival_regression),
        "holdout": _lane_report("holdout", "BT93D holdout eval", holdout_report_path, holdout_report, survival_regression),
    }
    policy_mask_contract = _policy_mask_contract(train_report)
    lane_values = list(lanes.values())
    f19_blocking = any(lane["terminalDeathFailureMatrix"].get("blocksBt94a") for lane in lane_values)
    f30_blocking = (
        not policy_mask_contract["policyLevelMasking"]["present"]
        or any(lane["laneVerdict"].get("highPostDecodeClampOrVetoLoad") for lane in lane_values)
    )
    f31_blocking = any(lane["survivalDistribution"].get("blocksBt94a") for lane in lane_values)
    reward_blocking = any(lane["rewardSafetyEpisodeShortening"].get("blocksBt94a") for lane in lane_values)
    blocked_findings = [
        finding
        for finding, blocked in [
            ("F.19", f19_blocking),
            ("F.30", f30_blocking),
            ("F.31", f31_blocking),
            ("reward-safety-episode-shortening", reward_blocking),
        ]
        if blocked
    ]

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93d_terminal_policy_diagnostics.py",
        "blockId": "BT93D",
        "phaseId": "93D.3",
        "gitSha": _git_sha(),
        "resultClass": "diagnose-blocked" if blocked_findings else "terminal-policy-diagnostics-clear",
        "phaseCoverage": {
            "93D.3.1": True,
            "93D.3.2": True,
            "93D.3.3": True,
            "93D.3.4": True,
        },
        "lanes": lanes,
        "policyMaskContract": policy_mask_contract,
        "bt94aImpact": {
            "claimableAfter93D3": False if blocked_findings else None,
            "blockedFindings": blocked_findings,
            "findingStatus": {
                "F.19": "still-blocking" if f19_blocking else "closed",
                "F.30": "still-blocking" if f30_blocking else "closed",
                "F.31": "still-blocking" if f31_blocking else "closed",
            },
            "decision": "BT94A remains closed until 93D.4 propagates these still-blocking findings"
            if blocked_findings
            else "93D.4 may refresh the BT94A gate",
        },
        "minimumStartStatistics": {
            "path": "data/training/ppo/bt93d/minimum_start_statistics.json",
            "matrixId": minimum_stats.get("matrixId"),
            "requiredStatistics": minimum_stats.get("requiredStatistics"),
            "abortCriteriaRelevantTo93D3": [
                criterion
                for criterion in minimum_stats.get("abortCriteria", [])
                if "terminal" in str(criterion).lower()
                or "mask" in str(criterion).lower()
                or "reward" in str(criterion).lower()
            ],
        },
        "commands": {
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93d_terminal_policy_diagnostics.py --write-report",
        },
        "sourceArtifacts": {
            "baselineReport": _source(BT93C_ROOT / "baseline_report.json", "BT93C baseline report"),
            "trainReport": _source(train_report_path, "BT93C baseline train report used for train-side diagnostics"),
            "bt93dEvalReport": _source(eval_report_path, "BT93D baseline repro eval report"),
            "bt93dEvalPointer": _source(eval_pointer_path, "BT93D eval pointer", closure_capable=False),
            "bt93dHoldoutReport": _source(holdout_report_path, "BT93D holdout eval report"),
            "bt93dHoldoutPointer": _source(holdout_pointer_path, "BT93D holdout pointer", closure_capable=False),
            "survivalRegressionReport": _source(BT93D_ROOT / "survival_regression_report.json", "BT93D survival regression report"),
            "minimumStartStatistics": _source(BT93D_ROOT / "minimum_start_statistics.json", "BT93D minimum start statistics"),
            "repairManifest": _source(BT93D_ROOT / "repair_manifest.json", "BT93D repair manifest"),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "allowedSidecarPaths": repair_manifest.get("allowedSidecarPaths"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93D terminal and policy diagnostics.")
    parser.add_argument("--write-report", action="store_true", help="Write report JSON file.")
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH), help="Report output path.")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(Path(args.output).resolve(), report)
    print(json.dumps({"terminalPolicyDiagnostics": report}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
