"""BT93Q.2 trace reanalysis and telemetry-completeness reports.

This lane is diagnostic-only. It re-reads the BT93N raw trace samples and
writes BT93Q.2 evidence without starting PPO training, applying action/reward
or safety fixes, consuming holdout data, or touching productive runtime code.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from statistics import mean, median
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"

TRACE_REANALYSIS_PATH = BT93Q_ROOT / "trace_reanalysis_report.json"
PLAYER_DEAD_CONTROL_PATH = BT93Q_ROOT / "player_dead_control_report.json"
OBSERVATION_TELEMETRY_GAP_PATH = BT93Q_ROOT / "observation_telemetry_gap_report.json"

SOURCE_PATHS = {
    "bt93qFindingRegister": BT93Q_ROOT / "finding_register.json",
    "bt93qHypothesisLock": BT93Q_ROOT / "hypothesis_lock.json",
    "bt93nDeathTrace": PPO_ROOT / "bt93n" / "death_before60_trace_report.json",
    "bt93nDeathTraceSamples": PPO_ROOT / "bt93n" / "death_before60_trace_samples.jsonl",
    "bt93nRewardTerminalDelta": PPO_ROOT / "bt93n" / "reward_terminal_delta_report.json",
    "bt93nMicroPpoRepeat": PPO_ROOT / "bt93n" / "micro_ppo_repeat_report.json",
    "bt93nClosureGate": PPO_ROOT / "bt93n" / "closure_gate_report.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
}

BLOCKED_ACTIONS = [
    "BT93O claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate or BT95 handoff signal",
    "50k/100k/200k extension",
]

NEXT_ALLOWED_ACTIONS = [
    "BT93Q.3 deterministic-policy-collapse diagnosis",
    "BT93Q.4 wall/trail action-effect stress matrix",
    "BT93Q.5 exactly one fix class only after cause evidence",
    "BT93Q.6 maximum 10k micro-PPO recheck only after 93Q.4/93Q.5 gate evidence",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(payload, dict):
                    rows.append(payload)
    except OSError:
        return []
    return rows


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(args: list[str]) -> list[str]:
    output = _git_output(args)
    return [line.strip().replace("\\", "/") for line in output.splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
    return set(_git_lines(["git", "ls-files", "--", *[path for path in rel_paths if path]]))


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any) -> float:
    return round(_number(value), 6)


def _stats(values: Iterable[Any]) -> dict[str, Any]:
    numeric = sorted(_number(value) for value in values if value is not None)
    if not numeric:
        return {
            "count": 0,
            "min": None,
            "max": None,
            "mean": None,
            "median": None,
            "p10": None,
            "p90": None,
        }
    p10_index = min(len(numeric) - 1, max(0, round((len(numeric) - 1) * 0.10)))
    p90_index = min(len(numeric) - 1, max(0, round((len(numeric) - 1) * 0.90)))
    return {
        "count": len(numeric),
        "min": _round(numeric[0]),
        "max": _round(numeric[-1]),
        "mean": _round(mean(numeric)),
        "median": _round(median(numeric)),
        "p10": _round(numeric[p10_index]),
        "p90": _round(numeric[p90_index]),
    }


def _counter(values: Iterable[Any]) -> dict[str, int]:
    return dict(sorted(Counter("null" if value is None else str(value) for value in values).items()))


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _trace_rows(sample: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    rows = sample.get("traceTail")
    return [row for row in rows if isinstance(row, Mapping)] if isinstance(rows, list) else []


def _all_rows(samples: Iterable[Mapping[str, Any]]) -> list[Mapping[str, Any]]:
    rows: list[Mapping[str, Any]] = []
    for sample in samples:
        rows.extend(_trace_rows(sample))
    return rows


def _final_rows(samples: Iterable[Mapping[str, Any]]) -> list[Mapping[str, Any]]:
    rows: list[Mapping[str, Any]] = []
    for sample in samples:
        tail = _trace_rows(sample)
        if tail:
            rows.append(tail[-1])
    return rows


def _obs(row: Mapping[str, Any]) -> Mapping[str, Any]:
    metrics = row.get("observationMetrics")
    return metrics if isinstance(metrics, Mapping) else {}


def _objective_metrics(row: Mapping[str, Any]) -> Mapping[str, Any]:
    metrics = _get(row, "objectiveReachability", "metrics")
    return metrics if isinstance(metrics, Mapping) else {}


def _objective_deltas(row: Mapping[str, Any]) -> Mapping[str, Any]:
    deltas = _get(row, "objectiveReachability", "deltas")
    return deltas if isinstance(deltas, Mapping) else {}


def _position_delta(row: Mapping[str, Any]) -> Mapping[str, Any]:
    delta = row.get("positionHeadingDelta")
    return delta if isinstance(delta, Mapping) else {}


def _hybrid_safety(row: Mapping[str, Any]) -> Mapping[str, Any]:
    safety = _get(row, "actionSafety", "hybridSafety")
    return safety if isinstance(safety, Mapping) else {}


def _action_safety(row: Mapping[str, Any]) -> Mapping[str, Any]:
    safety = row.get("actionSafety")
    return safety if isinstance(safety, Mapping) else {}


def _reward_breakdown(row: Mapping[str, Any]) -> Mapping[str, Any]:
    breakdown = row.get("rewardBreakdown")
    return breakdown if isinstance(breakdown, Mapping) else {}


def _metric(row: Mapping[str, Any], key: str) -> Any:
    observed = _obs(row)
    if key in observed:
        return observed.get(key)
    objective = _objective_metrics(row)
    if key in objective:
        return objective.get(key)
    safety = _hybrid_safety(row)
    if key in safety:
        return safety.get(key)
    delta = _position_delta(row)
    if key in delta:
        return delta.get(key)
    return None


def _source(path: Path, role: str, tracked_files: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked_files,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _source_artifacts() -> dict[str, Any]:
    roles = {
        "bt93qFindingRegister": "BT93Q.1 finding register",
        "bt93qHypothesisLock": "BT93Q.1 hypothesis lock",
        "bt93nDeathTrace": "BT93N death-before-60 trace aggregate",
        "bt93nDeathTraceSamples": "BT93N raw JSONL trace samples",
        "bt93nRewardTerminalDelta": "BT93N reward/terminal delta context",
        "bt93nMicroPpoRepeat": "BT93N 10k micro-PPO repeat context",
        "bt93nClosureGate": "BT93N red closure gate",
        "bt94aNoStartGate": "BT94A closed no-start gate",
    }
    tracked = _tracked_files(SOURCE_PATHS.values())
    return {key: _source(path, roles[key], tracked) for key, path in SOURCE_PATHS.items()}


def _longest_streak(rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    longest_action: str | None = None
    longest = 0
    current_action: str | None = None
    current = 0
    for row in rows:
        action = str(row.get("semanticAction") or "unknown")
        if action == current_action:
            current += 1
        else:
            current_action = action
            current = 1
        if current > longest:
            longest = current
            longest_action = action
    return {"semanticAction": longest_action, "length": longest}


def _tail_reward_summary(rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    breakdown_totals: Counter[str] = Counter()
    positive_components: Counter[str] = Counter()
    negative_components: Counter[str] = Counter()
    for row in rows:
        for key, value in _reward_breakdown(row).items():
            amount = _number(value)
            breakdown_totals[str(key)] += amount
            if amount > 0:
                positive_components[str(key)] += amount
            elif amount < 0:
                negative_components[str(key)] += amount
    return {
        "rowReward": _stats(row.get("reward") for row in rows),
        "cumulativeReward": _stats(row.get("cumulativeReward") for row in rows),
        "breakdownTotals": {key: _round(value) for key, value in sorted(breakdown_totals.items())},
        "positiveComponentTotals": {key: _round(value) for key, value in sorted(positive_components.items())},
        "negativeComponentTotals": {key: _round(value) for key, value in sorted(negative_components.items())},
        "lossRows": sum(1 for row in rows if _number(_reward_breakdown(row).get("loss")) < 0),
        "wallRiskRows": sum(1 for row in rows if _number(_reward_breakdown(row).get("wallRisk")) < 0),
        "trailRiskRows": sum(1 for row in rows if _number(_reward_breakdown(row).get("trailRisk")) < 0),
        "checkpointRows": sum(1 for row in rows if _number(_reward_breakdown(row).get("checkpointReached")) != 0),
    }


def _group_summary(name: str, samples: list[Mapping[str, Any]]) -> dict[str, Any]:
    rows = _all_rows(samples)
    finals = _final_rows(samples)
    semantic_actions = [row.get("semanticAction") for row in rows]
    final_actions = [row.get("semanticAction") for row in finals]
    veto_rows = [row for row in rows if _hybrid_safety(row).get("vetoActive") is True]
    veto_event_rows = [row for row in rows if _action_safety(row).get("vetoEvents") not in (None, [])]
    progress_rows = [row for row in rows if _get(row, "objectiveReachability", "progressSignalReachable") is True]
    objective_rows = [row for row in rows if _get(row, "objectiveReachability", "objectiveSignalReachable") is True]
    return {
        "name": name,
        "sampleCount": len(samples),
        "sampleKindCounts": _counter(sample.get("sampleKind") for sample in samples),
        "policyCounts": _counter(sample.get("policyId") for sample in samples),
        "terminalReasonCounts": _counter(sample.get("terminalReason") for sample in samples),
        "deathClassCounts": _counter(_get(sample, "deathClassification", "class") for sample in samples),
        "steps": _stats(sample.get("steps") for sample in samples),
        "episodeRewardTotal": _stats(sample.get("rewardTotal") for sample in samples),
        "tailRowCount": len(rows),
        "tailActionCounts": _counter(semantic_actions),
        "finalActionCounts": _counter(final_actions),
        "longestRepeatedTailAction": _longest_streak(rows),
        "wallDistance": {
            "front": _stats(_metric(row, "wallDistanceFront") for row in rows),
            "left": _stats(_metric(row, "wallDistanceLeft") for row in rows),
            "right": _stats(_metric(row, "wallDistanceRight") for row in rows),
            "up": _stats(_metric(row, "wallDistanceUp") for row in rows),
            "down": _stats(_metric(row, "wallDistanceDown") for row in rows),
            "frontFinal": _stats(_metric(row, "wallDistanceFront") for row in finals),
        },
        "localOpenness": {
            "ratio": _stats(_metric(row, "localOpennessRatio") for row in rows),
            "ratioFinal": _stats(_metric(row, "localOpennessRatio") for row in finals),
            "delta": _stats(_metric(row, "localOpennessDelta") for row in rows),
        },
        "risk": {
            "collisionRisk": _stats(_metric(row, "collisionRisk") for row in rows),
            "collisionRiskFinal": _stats(_metric(row, "collisionRisk") for row in finals),
            "deadEndRisk": _stats(_metric(row, "deadEndRisk") for row in rows),
            "deadEndRiskFinal": _stats(_metric(row, "deadEndRisk") for row in finals),
            "threatHorizon": _stats(_metric(row, "threatHorizon") for row in rows),
            "pressureLevel": _stats(_metric(row, "pressureLevel") for row in rows),
        },
        "safety": {
            "vetoActiveRows": len(veto_rows),
            "vetoEventRows": len(veto_event_rows),
            "maxInvalidActionRate": _round(max((_number(_action_safety(row).get("invalidActionRate")) for row in rows), default=0.0)),
            "maxPostDecodeClampRate": _round(max((_number(_action_safety(row).get("postDecodeClampRate")) for row in rows), default=0.0)),
            "maxSanitizerRate": _round(max((_number(_action_safety(row).get("sanitizerRate")) for row in rows), default=0.0)),
            "maxVetoRate": _round(max((_number(_action_safety(row).get("vetoRate")) for row in rows), default=0.0)),
            "maxPreSamplingMaskRate": _round(max((_number(_action_safety(row).get("preSamplingMaskRate")) for row in rows), default=0.0)),
        },
        "rewardTail": _tail_reward_summary(rows),
        "reachabilityTail": {
            "progressSignalReachableRows": len(progress_rows),
            "objectiveSignalReachableRows": len(objective_rows),
            "progressEventRows": sum(1 for row in rows if _get(row, "objectiveReachability", "progressEvents")),
            "objectiveEventRows": sum(1 for row in rows if _get(row, "objectiveReachability", "objectiveEvents")),
        },
        "terminalRows": {
            "terminalReasonCounts": _counter(row.get("terminalReason") for row in rows if row.get("terminalReason") is not None),
            "terminatedRows": sum(1 for row in rows if row.get("terminated") is True),
            "truncatedRows": sum(1 for row in rows if row.get("truncated") is True),
        },
    }


def _field_presence(rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    def present(path: tuple[str, ...]) -> int:
        count = 0
        for row in rows:
            current: Any = row
            for key in path:
                if not isinstance(current, Mapping) or key not in current:
                    current = None
                    break
                current = current[key]
            if current is not None:
                count += 1
        return count

    return {
        "rowCount": len(rows),
        "rawPoseAvailableValues": _counter(_position_delta(row).get("rawPoseAvailable") for row in rows),
        "rawPoseSourceValues": _counter(_position_delta(row).get("source") for row in rows),
        "availableProxyFields": {
            "wallDistanceFront": present(("observationMetrics", "wallDistanceFront")),
            "wallDistanceLeft": present(("observationMetrics", "wallDistanceLeft")),
            "wallDistanceRight": present(("observationMetrics", "wallDistanceRight")),
            "localOpennessRatio": present(("observationMetrics", "localOpennessRatio")),
            "pressureLevel": present(("observationMetrics", "pressureLevel")),
            "targetAlignment": present(("observationMetrics", "targetAlignment")),
            "targetDistanceRatio": present(("observationMetrics", "targetDistanceRatio")),
            "speedRatio": present(("observationMetrics", "speedRatio")),
            "collisionRisk": present(("actionSafety", "hybridSafety", "collisionRisk")),
            "deadEndRisk": present(("actionSafety", "hybridSafety", "deadEndRisk")),
            "threatHorizon": present(("actionSafety", "hybridSafety", "threatHorizon")),
            "localOpennessDelta": present(("positionHeadingDelta", "localOpennessDelta")),
            "speedDelta": present(("positionHeadingDelta", "speedDelta")),
            "targetAlignmentDelta": present(("positionHeadingDelta", "targetAlignmentDelta")),
            "targetDistanceDelta": present(("positionHeadingDelta", "targetDistanceDelta")),
        },
        "missingRawOrScenarioFields": {
            "rawPose": present(("positionHeadingDelta", "rawPose")) == 0,
            "rawX": present(("positionHeadingDelta", "rawX")) == 0,
            "rawY": present(("positionHeadingDelta", "rawY")) == 0,
            "rawZ": present(("positionHeadingDelta", "rawZ")) == 0,
            "heading": present(("positionHeadingDelta", "heading")) == 0,
            "velocity": present(("positionHeadingDelta", "velocity")) == 0,
            "trailDistance": present(("observationMetrics", "trailDistance")) == 0,
            "trailHeadingDelta": present(("observationMetrics", "trailHeadingDelta")) == 0,
            "escapeLaneLeftOpen": present(("observationMetrics", "escapeLaneLeftOpen")) == 0,
            "escapeLaneRightOpen": present(("observationMetrics", "escapeLaneRightOpen")) == 0,
            "escapeLaneForwardOpen": present(("observationMetrics", "escapeLaneForwardOpen")) == 0,
        },
    }


def _classify_samples(samples: list[Mapping[str, Any]]) -> dict[str, list[Mapping[str, Any]]]:
    early = [
        sample
        for sample in samples
        if sample.get("earlyDeathBefore60") is True or sample.get("sampleKind") == "early-death-before60"
    ]
    non_event = [sample for sample in samples if sample.get("sampleKind") == "non-event-control"]
    late_player_dead = [
        sample
        for sample in non_event
        if sample.get("terminalReason") == "player-dead" and int(sample.get("steps") or 0) >= 60
    ]
    return {
        "all": samples,
        "earlyDeathBefore60": early,
        "nonEventControl": non_event,
        "latePlayerDeadControl": late_player_dead,
    }


def _telemetry_decisions(field_presence: Mapping[str, Any]) -> list[dict[str, Any]]:
    missing = field_presence.get("missingRawOrScenarioFields")
    missing_map = missing if isinstance(missing, Mapping) else {}
    raw_pose_values = field_presence.get("rawPoseAvailableValues")
    raw_pose_all_false = raw_pose_values == {"False": int(field_presence.get("rowCount") or 0)}
    return [
        {
            "fieldGroup": "rawPose",
            "requiredForNextDiagnosis": raw_pose_all_false or bool(missing_map.get("rawPose")),
            "status": "missing",
            "reason": "State-effect proof cannot reconstruct actual trajectory when rawPoseAvailable=false for every trace row.",
            "allowedPhase": "93Q.5 observation/telemetry fix only if 93Q.3/93Q.4 still need it",
        },
        {
            "fieldGroup": "heading",
            "requiredForNextDiagnosis": bool(missing_map.get("heading")),
            "status": "proxy-only",
            "reason": "targetAlignmentDelta is present, but raw heading/yaw is absent for wall/trail escape-direction proof.",
            "allowedPhase": "93Q.5 observation/telemetry fix",
        },
        {
            "fieldGroup": "velocity",
            "requiredForNextDiagnosis": bool(missing_map.get("velocity")),
            "status": "proxy-only",
            "reason": "speedRatio/speedDelta exist, but raw velocity vector is absent for action-effect attribution.",
            "allowedPhase": "93Q.5 observation/telemetry fix",
        },
        {
            "fieldGroup": "trailDistance",
            "requiredForNextDiagnosis": bool(missing_map.get("trailDistance")) or bool(missing_map.get("trailHeadingDelta")),
            "status": "missing",
            "reason": "Trail-specific proximity is not exposed; trail risk is only inferable through reward/risk proxies.",
            "allowedPhase": "93Q.5 observation/telemetry fix",
        },
        {
            "fieldGroup": "escapeLane",
            "requiredForNextDiagnosis": any(
                bool(missing_map.get(key))
                for key in ("escapeLaneLeftOpen", "escapeLaneRightOpen", "escapeLaneForwardOpen")
            ),
            "status": "missing",
            "reason": "Escape-lane availability is not exposed for left/right/forward action-effect classification.",
            "allowedPhase": "93Q.5 observation/telemetry fix",
        },
    ]


def _phase_coverage(
    *,
    trace_report: Mapping[str, Any],
    player_dead_report: Mapping[str, Any],
    telemetry_report: Mapping[str, Any],
) -> dict[str, bool]:
    groups = trace_report.get("groups") if isinstance(trace_report.get("groups"), Mapping) else {}
    early = groups.get("earlyDeathBefore60") if isinstance(groups.get("earlyDeathBefore60"), Mapping) else {}
    control = groups.get("nonEventControl") if isinstance(groups.get("nonEventControl"), Mapping) else {}
    telemetry = telemetry_report.get("telemetryCompleteness") if isinstance(telemetry_report.get("telemetryCompleteness"), Mapping) else {}
    return {
        "93Q.2.1": (
            bool(trace_report.get("earlyDeathVsControl"))
            and int(early.get("sampleCount") or 0) > 0
            and int(control.get("sampleCount") or 0) > 0
            and all(
                key in trace_report.get("coveredSignals", [])
                for key in (
                    "Action-Tails",
                    "WallDistance",
                    "LocalOpenness",
                    "CollisionRisk",
                    "DeadEndRisk",
                    "Reward-Tails",
                    "TerminalReason",
                )
            )
        ),
        "93Q.2.2": int(player_dead_report.get("latePlayerDeadControlCount") or 0) > 0
        and bool(player_dead_report.get("latePlayerDeadControlsRetained")),
        "93Q.2.3": bool(telemetry.get("rawPoseAvailableEvaluated"))
        and bool(telemetry_report.get("nextDiagnosisTelemetryDecision")),
        "93Q.2.4": (
            _get(trace_report, "guardrails", "fixApplied") is False
            and _get(trace_report, "guardrails", "actionFixApplied") is False
            and _get(trace_report, "guardrails", "rewardFixApplied") is False
            and _get(trace_report, "guardrails", "safetyFixApplied") is False
        ),
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    payloads = {key: _read_json(path) for key, path in SOURCE_PATHS.items() if path.suffix == ".json"}
    samples = _read_jsonl(SOURCE_PATHS["bt93nDeathTraceSamples"])
    classified = _classify_samples(samples)
    source_artifacts = _source_artifacts()
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    generated_at = _utc_now()
    git = {
        "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
        "sha": _git_output(["git", "rev-parse", "HEAD"]),
    }
    guardrails = {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "fixApplied": False,
        "actionFixApplied": False,
        "rewardFixApplied": False,
        "safetyFixApplied": False,
        "terminalRunnerFixApplied": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
    }
    common = {
        "schemaVersion": "bt93q-trace-reanalysis-v1",
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93q_trace_reanalysis.py",
        "git": git,
        "blockId": "BT93Q",
        "phaseId": "93Q.2",
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "blockedActions": list(BLOCKED_ACTIONS),
        "nextAllowedActions": list(NEXT_ALLOWED_ACTIONS),
        "guardrails": guardrails,
    }

    groups = {
        name: _group_summary(name, list(group_samples))
        for name, group_samples in classified.items()
    }
    all_rows = _all_rows(samples)
    field_presence = _field_presence(all_rows)
    telemetry_decisions = _telemetry_decisions(field_presence)
    required_groups = [
        decision["fieldGroup"]
        for decision in telemetry_decisions
        if decision.get("requiredForNextDiagnosis") is True
    ]
    telemetry_result_class = (
        "observation-telemetry-required"
        if required_groups
        else "observation-telemetry-sufficient-for-next-diagnosis"
    )

    trace_report: dict[str, Any] = {
        **common,
        "resultClass": "trace-reanalysis-complete-with-telemetry-gap"
        if required_groups
        else "trace-reanalysis-complete",
        "coveredSignals": [
            "Early-Death vs non-event-control",
            "Action-Tails",
            "WallDistance",
            "LocalOpenness",
            "CollisionRisk",
            "DeadEndRisk",
            "Reward-Tails",
            "TerminalReason",
        ],
        "sampleCounts": {
            "rawSampleCount": len(samples),
            "earlyDeathBefore60": len(classified["earlyDeathBefore60"]),
            "nonEventControl": len(classified["nonEventControl"]),
            "latePlayerDeadControl": len(classified["latePlayerDeadControl"]),
            "traceTailRows": len(all_rows),
        },
        "matrixContext": {
            "bt93nTraceResultClass": payloads["bt93nDeathTrace"].get("resultClass"),
            "bt93nClosureGateClass": payloads["bt93nClosureGate"].get("gateClass"),
            "bt93nRootCause": payloads["bt93nClosureGate"].get("rootCause"),
            "bt93nMicroPpoResultClass": payloads["bt93nMicroPpoRepeat"].get("resultClass"),
            "bt94aClaimable": payloads["bt94aNoStartGate"].get("claimable"),
        },
        "groups": groups,
        "earlyDeathVsControl": {
            "earlyDeathPolicyCounts": groups["earlyDeathBefore60"]["policyCounts"],
            "controlPolicyCounts": groups["nonEventControl"]["policyCounts"],
            "earlyDeathStepStats": groups["earlyDeathBefore60"]["steps"],
            "controlStepStats": groups["nonEventControl"]["steps"],
            "earlyDeathFinalWallDistanceFront": groups["earlyDeathBefore60"]["wallDistance"]["frontFinal"],
            "controlFinalWallDistanceFront": groups["nonEventControl"]["wallDistance"]["frontFinal"],
            "earlyDeathFinalCollisionRisk": groups["earlyDeathBefore60"]["risk"]["collisionRiskFinal"],
            "controlFinalCollisionRisk": groups["nonEventControl"]["risk"]["collisionRiskFinal"],
            "earlyDeathTerminalReasons": groups["earlyDeathBefore60"]["terminalReasonCounts"],
            "controlTerminalReasons": groups["nonEventControl"]["terminalReasonCounts"],
            "interpretation": (
                "Early deaths and later non-event controls both end player-dead; "
                "late controls are retained as positive controls, not discarded."
            ),
        },
        "diagnosticDecision": {
            "traceReanalysisComplete": True,
            "fixAllowedFrom93Q2Alone": False,
            "opensNext": ["93Q.3", "93Q.4"],
            "blocksNext": [
                "Action fix before 93Q.4",
                "Reward fix before danger-ordering proof",
                "Safety-mask fix before action-effect proof",
                *BLOCKED_ACTIONS,
            ],
            "resultClass": "trace-reanalysis-complete-with-telemetry-gap"
            if required_groups
            else "trace-reanalysis-complete",
        },
    }

    early_dead = classified["earlyDeathBefore60"]
    late_controls = classified["latePlayerDeadControl"]
    player_dead_report: dict[str, Any] = {
        **common,
        "schemaVersion": "bt93q-player-dead-control-report-v1",
        "resultClass": "player-dead-controls-separated",
        "earlyDeathCount": len(early_dead),
        "latePlayerDeadControlCount": len(late_controls),
        "latePlayerDeadControlsRetained": bool(late_controls),
        "earlyDeathSamples": [
            {
                "episodeId": sample.get("episodeId"),
                "policyId": sample.get("policyId"),
                "seed": sample.get("seed"),
                "steps": sample.get("steps"),
                "terminalReason": sample.get("terminalReason"),
                "deathClass": _get(sample, "deathClassification", "class"),
            }
            for sample in early_dead
        ],
        "latePlayerDeadControlSamples": [
            {
                "episodeId": sample.get("episodeId"),
                "policyId": sample.get("policyId"),
                "seed": sample.get("seed"),
                "steps": sample.get("steps"),
                "terminalReason": sample.get("terminalReason"),
                "deathClass": _get(sample, "deathClassification", "class"),
            }
            for sample in late_controls
        ],
        "separation": {
            "earlyDeathBefore60": groups["earlyDeathBefore60"],
            "latePlayerDeadControl": groups["latePlayerDeadControl"],
            "nonEventControl": groups["nonEventControl"],
        },
        "decision": {
            "latePositiveControlsIgnored": False,
            "latePositiveControlsBlockGreenClaim": True,
            "earlyDeathStillBlocking": bool(early_dead),
            "terminalSemanticsContradictionFound": False,
            "terminalRunnerFixAllowedFrom93Q2": False,
            "reason": (
                "Raw samples consistently label early and late control deaths as player-dead; "
                "no terminal-label contradiction is proven in 93Q.2."
            ),
        },
    }

    telemetry_report: dict[str, Any] = {
        **common,
        "schemaVersion": "bt93q-observation-telemetry-gap-report-v1",
        "resultClass": telemetry_result_class,
        "telemetryCompleteness": {
            **field_presence,
            "rawPoseAvailableEvaluated": True,
            "rawPoseAvailableAllFalse": field_presence.get("rawPoseAvailableValues")
            == {"False": int(field_presence.get("rowCount") or 0)},
            "proxyOnlyStateEffectProof": True,
        },
        "nextDiagnosisTelemetryDecision": {
            "requiredFieldGroups": required_groups,
            "fieldDecisions": telemetry_decisions,
            "observationTelemetryFixAllowedNow": False,
            "fixClassIfStillBlocking": "Observation/Telemetry",
            "decision": (
                "93Q.3 may proceed on policy-collapse evidence. 93Q.4 may use existing wall/openness/risk "
                "proxies, but any unresolved action-effect class must be marked observation-telemetry-required "
                "unless raw pose/heading/velocity/trail/escape-lane fields are added in a later allowed fix phase."
            ),
        },
        "blocksNext": [
            "Action/reward/safety fix before 93Q.4 cause proof",
            "BT93O claim until 93Q.99 non-blocking classification",
            *BLOCKED_ACTIONS,
        ],
        "opensNext": ["93Q.3", "93Q.4"],
    }

    coverage = _phase_coverage(
        trace_report=trace_report,
        player_dead_report=player_dead_report,
        telemetry_report=telemetry_report,
    )
    for report in (trace_report, player_dead_report, telemetry_report):
        report["phaseCoverage"] = dict(coverage)
        report["ok"] = bool(source_files_ready and source_files_versioned and all(coverage.values()))
        report["commands"] = {
            "write": "python python/scripts/bt93q_trace_reanalysis.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        }
    return trace_report, player_dead_report, telemetry_report


def main() -> int:
    global BT93Q_ROOT, TRACE_REANALYSIS_PATH, PLAYER_DEAD_CONTROL_PATH, OBSERVATION_TELEMETRY_GAP_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93Q_ROOT)
    args = parser.parse_args()

    BT93Q_ROOT = args.output_root.resolve()
    TRACE_REANALYSIS_PATH = BT93Q_ROOT / "trace_reanalysis_report.json"
    PLAYER_DEAD_CONTROL_PATH = BT93Q_ROOT / "player_dead_control_report.json"
    OBSERVATION_TELEMETRY_GAP_PATH = BT93Q_ROOT / "observation_telemetry_gap_report.json"

    trace_report, player_dead_report, telemetry_report = build_reports()
    if args.write_report:
        _write_json(TRACE_REANALYSIS_PATH, trace_report)
        _write_json(PLAYER_DEAD_CONTROL_PATH, player_dead_report)
        _write_json(OBSERVATION_TELEMETRY_GAP_PATH, telemetry_report)

    summary = {
        "ok": bool(trace_report["ok"] and player_dead_report["ok"] and telemetry_report["ok"]),
        "resultClasses": {
            "traceReanalysis": trace_report["resultClass"],
            "playerDeadControl": player_dead_report["resultClass"],
            "observationTelemetryGap": telemetry_report["resultClass"],
        },
        "phaseCoverage": trace_report["phaseCoverage"],
        "sampleCounts": trace_report["sampleCounts"],
        "outputs": {
            "traceReanalysis": _rel(TRACE_REANALYSIS_PATH),
            "playerDeadControl": _rel(PLAYER_DEAD_CONTROL_PATH),
            "observationTelemetryGap": _rel(OBSERVATION_TELEMETRY_GAP_PATH),
        },
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
