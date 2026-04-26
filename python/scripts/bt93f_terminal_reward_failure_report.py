"""BT93F.2 terminal, death, reward, and failure repair report.

This script records a BT93F-specific diagnostic matrix from the latest
versioned BT93E artifacts and controlled JS probes. It does not run a
candidate, freeze a model, promote, or touch productive runtime surfaces.
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
BT93E_ROOT = PPO_ROOT / "bt93e"
BT93F_ROOT = PPO_ROOT / "bt93f"

DEFAULT_REPORT_PATH = BT93F_ROOT / "terminal_reward_failure_report.json"
DEFAULT_PROBE_PATH = BT93F_ROOT / "controlled_terminal_death_probes.json"

MIN_COMPLETED_EPISODES = {
    "eval": 6,
    "holdout": 4,
}

FAILURE_FIELDS = (
    "runtimeErrorCount",
    "crash",
    "timeout",
    "forcedRound",
    "socketClose",
    "teardownFailure",
    "maxSteps",
    "naturalTerminal",
    "terminalReasonCounts",
    "truncatedReasonCounts",
    "deathCauseCounts",
)


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


def _load_report(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"required BT93F.2 source artifact is missing: {_rel(path)}")
    return _read_json(path)


def _normalized_failure(lane: Mapping[str, Any]) -> dict[str, Any]:
    failure = lane.get("terminalDeathFailureMatrix")
    if not isinstance(failure, Mapping):
        failure = {}
    normalized = {
        "runtimeErrorCount": _as_int(failure.get("runtimeErrorCount")),
        "crash": _as_int(failure.get("crash")),
        "timeout": _as_int(failure.get("timeout")),
        "forcedRound": _as_int(failure.get("forcedRound")),
        "socketClose": _as_int(failure.get("socketClose")),
        "teardownFailure": _as_int(failure.get("teardownFailure")),
        "maxSteps": _as_int(failure.get("maxSteps")),
        "naturalTerminal": _as_int(failure.get("naturalTerminal")),
        "terminalReasonCounts": _counter(failure.get("terminalReasonCounts")),
        "truncatedReasonCounts": _counter(failure.get("truncatedReasonCounts")),
        "deathCauseCounts": _counter(failure.get("deathCauseCounts")),
    }
    max_steps_only = (
        normalized["maxSteps"] > 0
        and normalized["naturalTerminal"] == 0
        and not normalized["terminalReasonCounts"]
        and not normalized["deathCauseCounts"]
    )
    empty_death = not bool(normalized["deathCauseCounts"])
    return {
        **normalized,
        "source": failure.get("source") or "bt93f-normalized-from-source-lane",
        "sourceObservabilityStatus": failure.get("observabilityStatus") or "unknown",
        "fieldNamesPresent": {field: field in normalized for field in FAILURE_FIELDS},
        "fieldNamesAligned": all(field in normalized for field in FAILURE_FIELDS),
        "sourceReportAlreadyEmitsFields": (failure.get("source") != "missing"),
        "terminalDeathMatrixVisibleInBt93f": True,
        "emptyDeathCauseCounts": empty_death,
        "maxStepsOnly": max_steps_only,
        "blocksBt94a": max_steps_only or empty_death or normalized["naturalTerminal"] == 0,
        "blockReason": (
            "max-steps-only with empty terminal/death matrix"
            if max_steps_only
            else "death-cause classes are empty or natural terminal evidence is absent"
            if empty_death or normalized["naturalTerminal"] == 0
            else None
        ),
    }


def _survival_rules(lane_name: str, lane: Mapping[str, Any], failure: Mapping[str, Any]) -> dict[str, Any]:
    survival = lane.get("survivalDistribution")
    if not isinstance(survival, Mapping):
        survival = {}
    lengths = [float(value) for value in survival.get("completedEpisodeLengths") or [] if _as_float(value) is not None]
    completed_count = _as_int(survival.get("completedEpisodeCount"))
    minimum = MIN_COMPLETED_EPISODES.get(lane_name)
    too_small = minimum is not None and completed_count < minimum
    blocks = bool(failure.get("maxStepsOnly")) or bool(failure.get("emptyDeathCauseCounts")) or too_small
    reasons = [
        "max-steps-only terminal/death matrix" if failure.get("maxStepsOnly") else None,
        "death-cause classes are empty" if failure.get("emptyDeathCauseCounts") else None,
        f"completedEpisodeCount {completed_count} below minimum {minimum}" if too_small else None,
    ]
    return {
        "source": survival.get("source") or "source-lane-survivalDistribution",
        "minimumCompletedEpisodes": minimum,
        "completedEpisodeCount": completed_count,
        "completedEpisodeLengths": lengths,
        "completedEpisodeStats": _summary(lengths),
        "avgStepsPerEpisode": survival.get("avgStepsPerEpisode"),
        "averageBotSurvival": survival.get("averageBotSurvival"),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "maxStepsOnlyBlocksStart": bool(failure.get("maxStepsOnly")),
        "emptyDeathCauseBlocksStart": bool(failure.get("emptyDeathCauseCounts")),
        "tooSmallEpisodeCountBlocksStart": too_small,
        "blocksBt94a": blocks,
        "blockReason": "; ".join(reason for reason in reasons if reason) or None,
    }


def _reward_rules(lane: Mapping[str, Any]) -> dict[str, Any]:
    reward = lane.get("rewardSafetyEpisodeShortening")
    if not isinstance(reward, Mapping):
        reward = {}
    positive_regression = bool(reward.get("positiveRewardWhileSurvivalRegresses"))
    shortening_against_dqn = bool(reward.get("episodeShorteningAgainstDqn"))
    blocks = positive_regression or shortening_against_dqn
    return {
        "source": reward.get("source") or "source-lane-rewardSafetyEpisodeShortening",
        "rewardBreakdownVisible": bool(reward.get("rewardBreakdownVisible")),
        "rewardTotal": reward.get("rewardTotal"),
        "rewardMean": reward.get("rewardMean"),
        "rewardBreakdownTotals": reward.get("rewardBreakdownTotals") or {},
        "rewardBreakdownMeanPerStep": reward.get("rewardBreakdownMeanPerStep") or {},
        "safetyOverruleCounts": reward.get("safetyOverruleCounts") or {},
        "episodeShorteningCheck": reward.get("episodeShorteningCheck") or {},
        "positiveRewardWhileSurvivalRegresses": positive_regression,
        "episodeShorteningAgainstDqn": shortening_against_dqn,
        "r01BlocksStart": blocks,
        "blocksBt94a": blocks,
        "blockReason": (
            "positive reward coexists with shorter/regressive survival"
            if positive_regression
            else "episode shortening remains below the DQN step anchor"
            if shortening_against_dqn
            else None
        ),
    }


def _lane_matrix(lane_name: str, lane: Mapping[str, Any]) -> dict[str, Any]:
    failure = _normalized_failure(lane)
    survival = _survival_rules(lane_name, lane, failure)
    reward = _reward_rules(lane)
    reasons = [
        failure.get("blockReason"),
        survival.get("blockReason"),
        reward.get("blockReason"),
    ]
    blocked = failure["blocksBt94a"] or survival["blocksBt94a"] or reward["blocksBt94a"]
    return {
        "lane": lane_name,
        "role": lane.get("role"),
        "runId": lane.get("runId"),
        "runKind": lane.get("runKind"),
        "phaseId": lane.get("phaseId"),
        "report": lane.get("report"),
        "terminalDeathFailureMatrix": failure,
        "survivalDistributionRules": survival,
        "rewardSafetyEpisodeShorteningRules": reward,
        "laneVerdict": {
            "bt94aStartImpact": "blocked" if blocked else "not-blocking",
            "reasons": [reason for reason in reasons if reason],
        },
    }


def _probe_script() -> str:
    return r"""
import { EpisodeController, TRAINING_TERMINAL_REASONS } from './src/state/training/EpisodeController.js';
import { calculateReward } from './src/state/training/RewardCalculator.js';

function classifyDeath(reason) {
  const lowered = String(reason || '').toLowerCase();
  return ['death', 'dead', 'crash', 'loss', 'killed'].some((token) => lowered.includes(token));
}

function terminalProbe({ id, reason, signals }) {
  const controller = new EpisodeController({ defaultMaxSteps: 5 });
  controller.reset({ episodeId: id, maxSteps: 5, nowMs: 0 });
  const snapshot = controller.step({ done: true, terminalReason: reason, nowMs: 1 });
  const reward = calculateReward(signals, { episodeSnapshot: snapshot });
  const isDeath = classifyDeath(snapshot.terminalReason);
  return {
    id,
    kind: isDeath ? 'death-cause-probe' : 'natural-terminal-probe',
    done: snapshot.done,
    truncated: snapshot.truncated,
    terminalReason: snapshot.terminalReason,
    truncatedReason: snapshot.truncatedReason,
    stepIndex: snapshot.stepIndex,
    maxSteps: snapshot.maxSteps,
    rewardBreakdown: reward.components,
    rewardTotal: reward.total,
    failureSemantics: {
      runtimeErrorCount: 0,
      crash: String(snapshot.terminalReason || '').toLowerCase().includes('crash') ? 1 : 0,
      timeout: 0,
      forcedRound: 0,
      socketClose: 0,
      teardownFailure: 0,
      maxSteps: 0,
      naturalTerminal: isDeath ? 0 : 1,
      terminalReasonCounts: { [snapshot.terminalReason]: 1 },
      truncatedReasonCounts: {},
      deathCauseCounts: isDeath ? { [snapshot.terminalReason]: 1 } : {},
    },
  };
}

function maxStepsProbe() {
  const controller = new EpisodeController({ defaultMaxSteps: 2 });
  controller.reset({ episodeId: 'bt93f-probe-max-steps', maxSteps: 2, nowMs: 0 });
  controller.step({ nowMs: 1 });
  const snapshot = controller.step({ nowMs: 2 });
  return {
    id: 'bt93f-probe-max-steps',
    kind: 'truncation-probe',
    done: snapshot.done,
    truncated: snapshot.truncated,
    terminalReason: snapshot.terminalReason,
    truncatedReason: snapshot.truncatedReason,
    stepIndex: snapshot.stepIndex,
    maxSteps: snapshot.maxSteps,
    failureSemantics: {
      runtimeErrorCount: 0,
      crash: 0,
      timeout: 0,
      forcedRound: 0,
      socketClose: 0,
      teardownFailure: 0,
      maxSteps: 1,
      naturalTerminal: 0,
      terminalReasonCounts: {},
      truncatedReasonCounts: { [snapshot.truncatedReason]: 1 },
      deathCauseCounts: {},
    },
  };
}

const probes = [
  terminalProbe({
    id: 'bt93f-probe-player-dead',
    reason: TRAINING_TERMINAL_REASONS.PLAYER_DEAD,
    signals: { survival: false, crashed: true },
  }),
  terminalProbe({
    id: 'bt93f-probe-match-ended',
    reason: TRAINING_TERMINAL_REASONS.MATCH_ENDED,
    signals: { survival: true },
  }),
  maxStepsProbe(),
];

process.stdout.write(JSON.stringify({
  ok: true,
  generatedBy: 'python/scripts/bt93f_terminal_reward_failure_report.py::node-probes',
  sourceModules: [
    'src/state/training/EpisodeController.js',
    'src/state/training/RewardCalculator.js',
  ],
  countsAsQualityEvidence: false,
  countsAsPromotionEvidence: false,
  countsAsPpoValidateEvidence: false,
  probes,
}));
"""


def _run_controlled_probes() -> dict[str, Any]:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", _probe_script()],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return {
            "ok": False,
            "generatedBy": "python/scripts/bt93f_terminal_reward_failure_report.py::node-probes",
            "error": result.stderr.strip() or result.stdout.strip(),
            "probes": [],
            "countsAsQualityEvidence": False,
            "countsAsPromotionEvidence": False,
        }
    payload = json.loads(result.stdout)
    payload["generatedAt"] = _utc_now()
    return payload


def _probe_summary(probes: Mapping[str, Any]) -> dict[str, Any]:
    rows = [row for row in probes.get("probes") or [] if isinstance(row, Mapping)]
    death_rows = [
        row
        for row in rows
        if _counter(_get(row, "failureSemantics", "deathCauseCounts"))
    ]
    natural_rows = [
        row
        for row in rows
        if _as_int(_get(row, "failureSemantics", "naturalTerminal")) > 0
    ]
    max_steps_rows = [
        row
        for row in rows
        if _as_int(_get(row, "failureSemantics", "maxSteps")) > 0
    ]
    return {
        "probeRunnerOk": bool(probes.get("ok")),
        "probeCount": len(rows),
        "naturalTerminalProbeCount": len(natural_rows),
        "deathCauseProbeCount": len(death_rows),
        "maxStepsProbeCount": len(max_steps_rows),
        "naturalTerminalOrDeathCauseTriggered": bool(natural_rows or death_rows),
        "countsAsQualityEvidence": False,
        "countsAsPromotionEvidence": False,
        "countsAsPpoValidateEvidence": False,
        "probeIds": [str(row.get("id")) for row in rows],
    }


def build_report(probe_payload: Mapping[str, Any] | None = None) -> dict[str, Any]:
    terminal_path = BT93E_ROOT / "terminal_reward_failure_report.json"
    survival_path = BT93E_ROOT / "survival_repair_report.json"
    start_package_path = BT93F_ROOT / "start_repair_package.json"
    no_go_path = BT93F_ROOT / "no_go_report.json"

    terminal = _load_report(terminal_path)
    survival = _load_report(survival_path)
    start_package = _load_report(start_package_path)
    no_go = _load_report(no_go_path)
    probes = dict(probe_payload or _run_controlled_probes())

    lanes = {
        lane_name: _lane_matrix(lane_name, lane)
        for lane_name, lane in (terminal.get("lanes") or {}).items()
        if isinstance(lane, Mapping)
    }
    required_lanes = {"train", "eval", "holdout"}
    schema_aligned = required_lanes.issubset(set(lanes)) and all(
        lane["terminalDeathFailureMatrix"].get("fieldNamesAligned")
        for lane in lanes.values()
    )
    source_emits_all_fields = all(
        lane["terminalDeathFailureMatrix"].get("sourceReportAlreadyEmitsFields")
        for lane in lanes.values()
    )
    max_steps_or_too_small = any(
        lane["survivalDistributionRules"].get("maxStepsOnlyBlocksStart")
        or lane["survivalDistributionRules"].get("tooSmallEpisodeCountBlocksStart")
        for lane in lanes.values()
    )
    death_terminal_blocking = any(
        lane["terminalDeathFailureMatrix"].get("blocksBt94a")
        for lane in lanes.values()
    )
    reward_blocking = any(
        lane["rewardSafetyEpisodeShorteningRules"].get("r01BlocksStart")
        for lane in lanes.values()
    )
    blocked_findings = [
        finding
        for finding, blocked in [
            ("F.19", death_terminal_blocking),
            ("F.31", max_steps_or_too_small),
            ("R.01", reward_blocking),
        ]
        if blocked
    ]
    probe_summary = _probe_summary(probes)

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93f_terminal_reward_failure_report.py",
        "blockId": "BT93F",
        "phaseId": "93F.2",
        "gitSha": _git_sha(),
        "resultClass": "diagnose-blocked" if blocked_findings else "terminal-reward-emission-clear",
        "phaseCoverage": {
            "93F.2.1": schema_aligned,
            "93F.2.2": bool(probe_summary["naturalTerminalOrDeathCauseTriggered"]),
            "93F.2.3": True,
            "93F.2.4": True,
        },
        "laneSchemaContract": {
            "requiredFailureFields": list(FAILURE_FIELDS),
            "requiredLanes": sorted(required_lanes),
            "bt93fNormalizedMatrixHasAllFields": schema_aligned,
            "sourceReportsAlreadyEmitAllFields": source_emits_all_fields,
            "trainEvalHoldoutAreNamedConsistently": schema_aligned,
            "missingSourceEmissionBlocksStart": not source_emits_all_fields,
        },
        "lanes": lanes,
        "controlledTerminalDeathProbes": probe_summary,
        "findingDisposition": {
            "F.18": "closed" if schema_aligned else "still-blocking",
            "F.19": "still-blocking" if death_terminal_blocking else "closed",
            "F.24": "not-start-blocking-carried",
            "F.31": "still-blocking" if max_steps_or_too_small else "closed",
            "R.01": "still-blocking" if reward_blocking else "closed",
        },
        "bt94aImpact": {
            "claimableAfter93F2": False if blocked_findings else None,
            "blockedFindings": blocked_findings,
            "decision": (
                "BT94A remains closed; BT93F.2 repaired emission/probe visibility but source "
                "eval/holdout still show max-steps-only, too-small episode counts, empty death matrix, or R.01."
                if blocked_findings
                else "93F.3 may continue with policy-level mask repair."
            ),
        },
        "startRules": {
            "maxStepsOnlyWithEmptyDeathMatrixBlocksStart": True,
            "tooSmallEvalHoldoutEpisodeCountsBlockStart": True,
            "positiveRewardWhileSurvivalRegressesBlocksStart": True,
            "controlledProbesDoNotCountAsQualityEvidence": True,
            "minimumCompletedEpisodes": MIN_COMPLETED_EPISODES,
        },
        "evidenceLimits": {
            "countsAsLongRunStabilityEvidence": False,
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "classification": "BT93F.2 sidecar emission/probe diagnostics only",
        },
        "commands": {
            "report": (
                "python python\\scripts\\bt93f_terminal_reward_failure_report.py --write-report --write-probes"
            ),
        },
        "sourceArtifacts": {
            "bt93fStartRepairPackage": _source(start_package_path, "BT93F start repair package"),
            "bt93fNoGoReport": _source(no_go_path, "BT93F no-go report"),
            "bt93eTerminalRewardFailure": _source(terminal_path, "BT93E terminal/reward/failure diagnostics"),
            "bt93eSurvivalRepair": _source(survival_path, "BT93E survival repair report"),
            "episodeController": _source(
                REPO_ROOT / "src" / "state" / "training" / "EpisodeController.js",
                "JS terminal/truncation source used by controlled probes",
            ),
            "rewardCalculator": _source(
                REPO_ROOT / "src" / "state" / "training" / "RewardCalculator.js",
                "JS reward source used by controlled probes",
            ),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "sourceNoStartState": start_package.get("currentNoStartState"),
            "noGoResultClass": no_go.get("resultClass"),
            "bt93eSurvivalResultClass": survival.get("resultClass"),
            "bt93eTerminalResultClass": terminal.get("resultClass"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93F.2 terminal/reward/failure repair diagnostics.")
    parser.add_argument("--write-report", action="store_true", help="Write BT93F.2 report JSON.")
    parser.add_argument("--write-probes", action="store_true", help="Write controlled terminal/death probe JSON.")
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH), help="Report output path.")
    parser.add_argument("--probe-output", default=str(DEFAULT_PROBE_PATH), help="Controlled probe output path.")
    args = parser.parse_args()

    probe_payload = _run_controlled_probes()
    probe_path = Path(args.probe_output).resolve()
    report_path = Path(args.output).resolve()
    if args.write_probes:
        _write_json(probe_path, probe_payload)
    report = build_report(probe_payload=probe_payload)
    if args.write_report:
        _write_json(report_path, report)
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
                    "probes": _rel(probe_path) if args.write_probes else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
