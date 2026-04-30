"""BT93S2R.2 targeted trace audit.

This phase extracts targeted trace evidence from the locked BT93S2.3 red
measurement source. It does not train PPO, consume holdouts, repair rewards,
add telemetry, change the action surface, or touch productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"

FAILURE_TAXONOMY_PATH = BT93S2R_ROOT / "failure_taxonomy_report.json"
SCENARIO_MATRIX_V2_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
EXISTING_ACTION_EFFECT_V2_PATH = BT93S2_ROOT / "existing_action_effect_v2_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
S2_EFFECT_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2_existing_action_effect_v2.py"
S2R_TAXONOMY_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r_failure_taxonomy.py"
S2R_TRACE_AUDIT_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r_targeted_trace_audit.py"
REPORT_PATH = BT93S2R_ROOT / "targeted_trace_audit_report.json"

TARGET_SCENARIO_IDS = [
    "escape-left-open",
    "escape-right-open",
    "no-danger-control",
    "side-wall-left",
]
BLOCKED_NEXT = [
    "93S2.4 start before BT93S2R.99=matrix-control-reentry-green plus fresh BT93S2.3-Recheck",
    "BT93T claim before fresh S2-Recheck opens only observation telemetry",
    "BT93U claim before fresh S2-Recheck opens action-selection-green",
    "BT93V claim",
    "BT93W claim",
    "BT93O claim",
    "BT93X full claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S2R.2",
    "telemetry fix from BT93S2R.2",
    "action-surface change from BT93S2R.2",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return sha256(_json_text(payload).encode("utf-8")).hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(args: list[str]) -> list[str]:
    return [line.strip().replace("\\", "/") for line in _git_output(args).splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
    rel_paths = [path for path in rel_paths if path]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _round_value(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 6)
    return value


def _select_keys(mapping: Mapping[str, Any] | None, keys: Iterable[str]) -> dict[str, Any]:
    source = _as_mapping(mapping)
    return {key: _round_value(source.get(key)) for key in keys if key in source}


def _source_artifact(path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs = {
        "failureTaxonomy": (FAILURE_TAXONOMY_PATH, "BT93S2R.1 source lock"),
        "existingActionEffectV2": (EXISTING_ACTION_EFFECT_V2_PATH, "BT93S2.3 locked red trace source"),
        "scenarioMatrixV2": (SCENARIO_MATRIX_V2_PATH, "BT93S2.2 matrix-v2 contract"),
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder"),
        "bt93s2EffectScript": (S2_EFFECT_SCRIPT_PATH, "BT93S2.3 generating script hash"),
        "bt93s2rTaxonomyScript": (S2R_TAXONOMY_SCRIPT_PATH, "BT93S2R.1 generating script hash"),
        "bt93s2rTraceAuditScript": (S2R_TRACE_AUDIT_SCRIPT_PATH, "BT93S2R.2 generating script hash"),
    }
    tracked = _tracked_files(path for path, _role in specs.values())
    return [
        {"sourceKey": key, **_source_artifact(path, role, tracked)}
        for key, (path, role) in specs.items()
    ]


def _scenarios_by_id(contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {
        str(scenario.get("id")): scenario
        for scenario in _as_list(contract.get("scenarios"))
        if isinstance(scenario, Mapping) and scenario.get("id")
    }


def _scenario_results_by_id(report: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {
        str(key): value
        for key, value in _as_mapping(report.get("scenarioResults")).items()
        if isinstance(value, Mapping)
    }


def _failure_taxonomy_by_id(report: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {
        str(item.get("id")): item
        for item in _as_list(report.get("failureTaxonomy"))
        if isinstance(item, Mapping) and item.get("id")
    }


def _controls(scenarios: Mapping[str, Mapping[str, Any]], scenario_id: str) -> Mapping[str, Any]:
    return _as_mapping(scenarios.get(scenario_id, {}).get("controls"))


def _control_actions(controls: Mapping[str, Any], key: str) -> list[str]:
    control = _as_mapping(controls.get(key))
    return [str(action) for action in _as_list(control.get("actions"))]


def _target_actions(scenarios: Mapping[str, Mapping[str, Any]]) -> dict[str, list[str]]:
    return {
        "escape-left-open": sorted(
            set(["noop"] + _control_actions(_controls(scenarios, "escape-left-open"), "positiveControls"))
        ),
        "escape-right-open": sorted(
            set(_control_actions(_controls(scenarios, "escape-right-open"), "positiveControls"))
        ),
        "no-danger-control": sorted(
            set(
                _control_actions(_controls(scenarios, "no-danger-control"), "positiveControls")
                + _control_actions(_controls(scenarios, "no-danger-control"), "negativeControls")
            )
        ),
        "side-wall-left": sorted(
            set(
                ["yaw-right"]
                + _control_actions(_controls(scenarios, "side-wall-left"), "positiveControls")
            )
        ),
    }


def _probe_key(probe: Mapping[str, Any]) -> tuple[str, str, int | str]:
    return (
        str(probe.get("scenarioId") or ""),
        str(probe.get("actionName") or ""),
        probe.get("seed") if probe.get("seed") is not None else "",
    )


def _compact_probe_trace(probe: Mapping[str, Any]) -> dict[str, Any]:
    first = _as_mapping(_get(probe, "stepSamples", "first"))
    final = _as_mapping(_get(probe, "stepSamples", "final"))
    metric_keys = [
        "wallDistanceFront",
        "wallDistanceLeft",
        "wallDistanceRight",
        "localOpennessRatio",
        "targetAlignment",
        "targetDistanceRatio",
        "pressureLevel",
        "speedRatio",
        "boostActive",
        "healthRatio",
    ]
    risk_keys = ["collisionRisk", "deadEndRisk", "terminalRisk", "threatHorizon", "vetoActive"]
    delta_keys = [
        "wallDistanceFront",
        "wallDistanceLeft",
        "wallDistanceRight",
        "localOpennessRatio",
        "targetDelta",
        "headingDelta",
        "collisionRisk",
        "terminalRisk",
        "trailPressureProxy",
    ]
    success_keys = [
        "success",
        "stateEffectObserved",
        "stateEffectSignals",
        "commandFlagObserved",
        "commandFlagWithoutStateEffect",
        "rewardOnlyRejected",
        "progressOrObjectiveSignal",
        "wallDistanceRises",
        "wallDistanceNonRegression",
        "collisionRiskNonRegression",
        "terminalRiskStable",
        "terminalObserved",
    ]
    return {
        "scenarioId": probe.get("scenarioId"),
        "actionName": probe.get("actionName"),
        "seed": probe.get("seed"),
        "ok": probe.get("ok"),
        "observedSteps": probe.get("observedSteps"),
        "requestedRepeatSteps": probe.get("requestedRepeatSteps"),
        "minimumCompletedSteps": probe.get("minimumCompletedSteps"),
        "completedMinimumWindow": probe.get("completedMinimumWindow"),
        "warmupAction": probe.get("warmupAction"),
        "warmupSteps": probe.get("warmupSteps"),
        "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
        "predicate": {
            "predicateId": _get(probe, "v2Predicate", "predicateId"),
            "pass": _get(probe, "v2Predicate", "pass"),
            "expression": _get(probe, "v2Predicate", "expression"),
            "revalidatedBeforeMeasurement": _get(probe, "v2Predicate", "revalidatedBeforeMeasurement"),
        },
        "commandFlagsObserved": _as_mapping(probe.get("commandFlagsObserved")),
        "commandFlagsFirst": _as_list(first.get("commandFlags")),
        "commandFlagsFinal": _as_list(final.get("commandFlags")),
        "startMetrics": _select_keys(probe.get("startMetrics"), metric_keys),
        "finalMetrics": _select_keys(probe.get("finalMetrics"), metric_keys),
        "metricDeltas": _select_keys(probe.get("metricDeltas"), delta_keys),
        "startRisk": _select_keys(probe.get("startRisk"), risk_keys),
        "finalRisk": _select_keys(probe.get("finalRisk"), risk_keys),
        "riskDeltas": _select_keys(probe.get("riskDeltas"), risk_keys),
        "rewardTotal": _round_value(probe.get("rewardTotal")),
        "firstReward": _round_value(first.get("reward")),
        "finalReward": _round_value(final.get("reward")),
        "finalRewardBreakdown": _select_keys(
            final.get("rewardBreakdown"),
            ["baseStep", "checkpointReached", "loss", "survival", "survivalPressureBonus", "wallRisk", "trailRisk"],
        ),
        "successEvaluation": _select_keys(probe.get("successEvaluation"), success_keys),
        "progressEventCounts": _as_mapping(probe.get("progressEventCounts")),
        "objectiveEventCounts": _as_mapping(probe.get("objectiveEventCounts")),
        "terminalObserved": probe.get("terminalObserved"),
        "terminalReasons": _as_mapping(probe.get("terminalReasons")),
        "terminalReasonFinal": final.get("terminalReason"),
        "safetyTelemetry": _as_mapping(probe.get("safetyTelemetry")),
    }


def _selected_probes(effect_report: Mapping[str, Any], targets: Mapping[str, list[str]]) -> list[Mapping[str, Any]]:
    selected = []
    wanted = {(scenario_id, action) for scenario_id, actions in targets.items() for action in actions}
    for probe in _as_list(effect_report.get("probes")):
        if not isinstance(probe, Mapping):
            continue
        key = (str(probe.get("scenarioId") or ""), str(probe.get("actionName") or ""))
        if key in wanted:
            selected.append(probe)
    return sorted(selected, key=_probe_key)


def _count_success(probes: Iterable[Mapping[str, Any]]) -> int:
    return sum(1 for probe in probes if _get(probe, "successEvaluation", "success") is True)


def _count_predicate_failures(probes: Iterable[Mapping[str, Any]]) -> int:
    return sum(1 for probe in probes if _get(probe, "v2Predicate", "pass") is not True)


def _count_minimum_window_failures(probes: Iterable[Mapping[str, Any]]) -> int:
    return sum(1 for probe in probes if probe.get("completedMinimumWindow") is not True)


def _group_by_action(probes: Iterable[Mapping[str, Any]]) -> dict[str, list[Mapping[str, Any]]]:
    grouped: dict[str, list[Mapping[str, Any]]] = {}
    for probe in probes:
        action = str(probe.get("actionName") or "")
        grouped.setdefault(action, []).append(probe)
    return grouped


def _action_counts(probes: Iterable[Mapping[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped = _group_by_action(probes)
    return {
        action: {
            "probeCount": len(action_probes),
            "successCount": _count_success(action_probes),
            "predicateFailureCount": _count_predicate_failures(action_probes),
            "minimumWindowFailureCount": _count_minimum_window_failures(action_probes),
            "seeds": [probe.get("seed") for probe in action_probes],
        }
        for action, action_probes in sorted(grouped.items())
    }


def _finding(
    *,
    finding_id: str,
    scenario_id: str | None,
    primary_root_cause_class: str,
    evidence: Mapping[str, Any],
    trace_reproduced: bool,
    trace_excerpt: list[dict[str, Any]],
    result_class: str,
) -> dict[str, Any]:
    return {
        "id": finding_id,
        "scenarioId": scenario_id,
        "traceReproduced": trace_reproduced,
        "primaryRootCauseClass": primary_root_cause_class,
        "resultClass": result_class,
        "evidence": dict(evidence),
        "traceExcerpt": trace_excerpt,
    }


def _scenario_probe_bucket(
    selected: Iterable[Mapping[str, Any]], scenario_id: str, actions: Iterable[str]
) -> list[Mapping[str, Any]]:
    action_set = set(actions)
    return [
        probe
        for probe in selected
        if probe.get("scenarioId") == scenario_id and probe.get("actionName") in action_set
    ]


def _build_findings(
    *,
    matrix_contract: Mapping[str, Any],
    effect_report: Mapping[str, Any],
    taxonomy_report: Mapping[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, list[str]], list[Mapping[str, Any]]]:
    scenarios = _scenarios_by_id(matrix_contract)
    targets = _target_actions(scenarios)
    selected = _selected_probes(effect_report, targets)
    scenario_results = _scenario_results_by_id(effect_report)
    taxonomy = _failure_taxonomy_by_id(taxonomy_report)

    escape_left_actions = targets["escape-left-open"]
    escape_left_probes = _scenario_probe_bucket(selected, "escape-left-open", escape_left_actions)
    escape_left_noop = _scenario_probe_bucket(selected, "escape-left-open", ["noop"])
    escape_left_positive = [
        probe for probe in escape_left_probes if probe.get("actionName") != "noop"
    ]
    escape_left_result = _as_mapping(scenario_results.get("escape-left-open"))
    escape_left_successes = [str(action) for action in _as_list(escape_left_result.get("successfulActions"))]
    escape_left_noop_success_count = _count_success(escape_left_noop)

    escape_right_actions = targets["escape-right-open"]
    escape_right_probes = _scenario_probe_bucket(selected, "escape-right-open", escape_right_actions)
    escape_right_result = _as_mapping(scenario_results.get("escape-right-open"))
    escape_right_predicate_failures = _count_predicate_failures(escape_right_probes)

    no_danger_actions = targets["no-danger-control"]
    no_danger_probes = _scenario_probe_bucket(selected, "no-danger-control", no_danger_actions)
    no_danger = _as_mapping(effect_report.get("noDangerControl"))
    no_danger_result = _as_mapping(scenario_results.get("no-danger-control"))
    no_danger_noop = _scenario_probe_bucket(selected, "no-danger-control", ["noop"])
    neutral_stable_actions = [str(action) for action in _as_list(no_danger.get("neutralStableActions"))]

    side_left_actions = targets["side-wall-left"]
    side_left_probes = _scenario_probe_bucket(selected, "side-wall-left", side_left_actions)
    side_left_result = _as_mapping(scenario_results.get("side-wall-left"))
    side_left_successes = [str(action) for action in _as_list(side_left_result.get("successfulActions"))]
    side_left_controls = _controls(scenarios, "side-wall-left")
    side_left_positive = _control_actions(side_left_controls, "positiveControls")
    side_left_unexpected_successes = sorted(set(side_left_successes) - set(side_left_positive))
    side_left_missing_positive_successes = sorted(set(side_left_positive) - set(side_left_successes))

    sample_counts = _as_mapping(effect_report.get("sampleCounts"))
    all_probes = [probe for probe in _as_list(effect_report.get("probes")) if isinstance(probe, Mapping)]
    predicate_failures = [probe for probe in all_probes if _get(probe, "v2Predicate", "pass") is not True]
    minimum_window_failures = [probe for probe in all_probes if probe.get("completedMinimumWindow") is not True]
    predicate_breakdown = _failure_breakdown(predicate_failures)
    minimum_window_breakdown = _failure_breakdown(minimum_window_failures)

    findings = [
        _finding(
            finding_id="93S2R.2.1 escape-left-open negative-control trace",
            scenario_id="escape-left-open",
            primary_root_cause_class="escape-left-control-required",
            result_class="negative-control-failed",
            trace_reproduced=bool(
                escape_left_noop
                and escape_left_positive
                and escape_left_noop_success_count > 0
                and "noop" in escape_left_successes
            ),
            evidence={
                "taxonomyId": "escape-left-open negative-control-failed",
                "taxonomyRootCause": _get(taxonomy, "escape-left-open negative-control-failed", "rootCauseCandidate"),
                "targetActions": escape_left_actions,
                "positiveControlActions": _control_actions(
                    _controls(scenarios, "escape-left-open"), "positiveControls"
                ),
                "negativeControlActions": _control_actions(
                    _controls(scenarios, "escape-left-open"), "negativeControls"
                ),
                "actionCounts": _action_counts(escape_left_probes),
                "successfulActions": escape_left_successes,
                "noopSuccessCount": escape_left_noop_success_count,
                "predicateFailureCount": _count_predicate_failures(escape_left_probes),
                "minimumWindowFailureCount": _count_minimum_window_failures(escape_left_probes),
                "rootCauseRationale": "noop is a negative control and appears in successfulActions; passive/noop drift must not be counted as escape success.",
            },
            trace_excerpt=[_compact_probe_trace(probe) for probe in escape_left_probes],
        ),
        _finding(
            finding_id="93S2R.2.2 escape-right-open predicate/window trace",
            scenario_id="escape-right-open",
            primary_root_cause_class="escape-right-scenario-required",
            result_class="predicate-window-required",
            trace_reproduced=bool(
                escape_right_probes
                and escape_right_predicate_failures > 0
                and not _as_list(escape_right_result.get("successfulActions"))
            ),
            evidence={
                "taxonomyId": "escape-right-open action-space-required candidate",
                "taxonomyRootCause": _get(
                    taxonomy,
                    "escape-right-open action-space-required candidate",
                    "rootCauseCandidate",
                ),
                "targetActions": escape_right_actions,
                "positiveControlActions": _control_actions(
                    _controls(scenarios, "escape-right-open"), "positiveControls"
                ),
                "actionCounts": _action_counts(escape_right_probes),
                "successfulActions": _as_list(escape_right_result.get("successfulActions")),
                "weakActions": _as_list(escape_right_result.get("weakActions")),
                "predicateFailureCount": escape_right_predicate_failures,
                "minimumWindowFailureCount": _count_minimum_window_failures(escape_right_probes),
                "actionSpaceJudgement": "deferred-until-v3-predicate-window-fairness",
                "rootCauseRationale": "positive controls are weak under a scenario with predicate failures, so action-space-required remains a candidate rather than a repair decision.",
            },
            trace_excerpt=[_compact_probe_trace(probe) for probe in escape_right_probes],
        ),
        _finding(
            finding_id="93S2R.2.3 no-danger-control neutral trace",
            scenario_id="no-danger-control",
            primary_root_cause_class="neutral-control-required",
            result_class="neutral-control-unstable",
            trace_reproduced=bool(
                no_danger_probes
                and no_danger_noop
                and "noop" not in neutral_stable_actions
                and no_danger.get("actionGreenEvidenceProduced") is False
            ),
            evidence={
                "taxonomyId": "no-danger-control neutral-control-unstable",
                "taxonomyRootCause": _get(
                    taxonomy,
                    "no-danger-control neutral-control-unstable",
                    "rootCauseCandidate",
                ),
                "targetActions": no_danger_actions,
                "positiveControlActions": _control_actions(
                    _controls(scenarios, "no-danger-control"), "positiveControls"
                ),
                "negativeControlActions": _control_actions(
                    _controls(scenarios, "no-danger-control"), "negativeControls"
                ),
                "actionCounts": _action_counts(no_danger_probes),
                "neutralStableActions": neutral_stable_actions,
                "negativeControlFailed": no_danger.get("negativeControlFailed"),
                "actionGreenEvidenceProduced": no_danger.get("actionGreenEvidenceProduced"),
                "weakActions": _as_list(no_danger_result.get("weakActions")),
                "rootCauseRationale": "noop does not reach neutralStableActions; neutral control must be repaired before producing any action-green evidence.",
            },
            trace_excerpt=[_compact_probe_trace(probe) for probe in no_danger_probes],
        ),
        _finding(
            finding_id="93S2R.2.4 side-wall-left direction/control trace",
            scenario_id="side-wall-left",
            primary_root_cause_class="side-wall-direction-contract-required",
            result_class="direction-control-mismatch",
            trace_reproduced=bool(
                side_left_probes
                and "yaw-right" in side_left_successes
                and side_left_missing_positive_successes
            ),
            evidence={
                "taxonomyId": "side-wall-left direction/control mismatch",
                "taxonomyRootCause": _get(
                    taxonomy,
                    "side-wall-left direction/control mismatch",
                    "rootCauseCandidate",
                ),
                "targetActions": side_left_actions,
                "positiveControlActions": side_left_positive,
                "negativeControlActions": _control_actions(side_left_controls, "negativeControls"),
                "actionCounts": _action_counts(side_left_probes),
                "successfulActions": side_left_successes,
                "unexpectedSuccessfulActions": side_left_unexpected_successes,
                "missingPositiveSuccessfulActions": side_left_missing_positive_successes,
                "rootCauseRationale": "the only green action is yaw-right while left positive controls are not successful; label, coordinate, or control direction must be fixed before selection quality is judged.",
            },
            trace_excerpt=[_compact_probe_trace(probe) for probe in side_left_probes],
        ),
        _finding(
            finding_id="93S2R.2.5 predicate/minimum-window trace",
            scenario_id=None,
            primary_root_cause_class="predicate-window-required",
            result_class="predicate-window-required",
            trace_reproduced=bool(
                sample_counts.get("predicateFailureCount") == 48
                and sample_counts.get("minimumWindowFailureCount") == 12
                and len(predicate_failures) == 48
                and len(minimum_window_failures) == 12
            ),
            evidence={
                "taxonomyIds": ["predicateFailureCount=48", "minimumWindowFailureCount=12"],
                "sampleCountsPredicateFailureCount": sample_counts.get("predicateFailureCount"),
                "sampleCountsMinimumWindowFailureCount": sample_counts.get("minimumWindowFailureCount"),
                "recomputedPredicateFailureCount": len(predicate_failures),
                "recomputedMinimumWindowFailureCount": len(minimum_window_failures),
                "predicateFailureBreakdown": predicate_breakdown,
                "minimumWindowFailureBreakdown": minimum_window_breakdown,
                "rootCauseRationale": "predicate and minimum-window failures are reproducible from the locked probe set and must be zero in the later v3 reentry gate.",
            },
            trace_excerpt=[_compact_probe_trace(probe) for probe in (predicate_failures[:8] + minimum_window_failures[:8])],
        ),
    ]
    return findings, targets, selected


def _failure_breakdown(probes: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[tuple[str, str], dict[str, Any]] = {}
    for probe in probes:
        key = (str(probe.get("scenarioId") or ""), str(probe.get("actionName") or ""))
        bucket = buckets.setdefault(
            key,
            {
                "scenarioId": key[0],
                "actionName": key[1],
                "count": 0,
                "seeds": [],
            },
        )
        bucket["count"] += 1
        bucket["seeds"].append(probe.get("seed"))
    for bucket in buckets.values():
        bucket["seeds"] = sorted(set(bucket["seeds"]))
    return sorted(buckets.values(), key=lambda item: (item["scenarioId"], item["actionName"]))


def _claim_flags(next_phase_allowed: bool) -> dict[str, bool]:
    return {
        "bt93s2rNextPhaseAllowed": next_phase_allowed,
        "bt93s2RecheckAllowed": False,
        "bt93s2Phase4Allowed": False,
        "bt93tClaimAllowed": False,
        "bt93uClaimAllowed": False,
        "bt93vClaimAllowed": False,
        "bt93wClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93xFullClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "bt95HandoffAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignalAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutUsed": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "safetyFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "candidateRun": False,
        "freezeCandidate": False,
        "qualityClaimAllowed": False,
    }


def build_report() -> dict[str, Any]:
    taxonomy_report = _read_json(FAILURE_TAXONOMY_PATH)
    matrix_contract = _read_json(SCENARIO_MATRIX_V2_PATH)
    effect_report = _read_json(EXISTING_ACTION_EFFECT_V2_PATH)

    findings, targets, selected = _build_findings(
        matrix_contract=matrix_contract,
        effect_report=effect_report,
        taxonomy_report=taxonomy_report,
    )
    source_artifacts = _source_artifacts()
    required_sources_ready = all(
        item["exists"] and item["isFile"] and item["tracked"]
        for item in source_artifacts
        if item["sourceKey"] != "bt93s2rTraceAuditScript"
    )
    source_contract_matches = bool(
        taxonomy_report.get("ok") is True
        and taxonomy_report.get("blockId") == "BT93S2R"
        and taxonomy_report.get("phaseId") == "93S2R.1"
        and taxonomy_report.get("resultClass") == "failure-taxonomy-source-lock-green"
        and effect_report.get("ok") is False
        and effect_report.get("blockId") == "BT93S2"
        and effect_report.get("phaseId") == "93S2.3"
        and effect_report.get("resultClass") == "measurement-invalid"
        and matrix_contract.get("ok") is True
        and matrix_contract.get("resultClass") == "scenario-matrix-v2-contract-green"
    )
    finding_by_id = {finding["id"]: finding for finding in findings}
    phase_coverage = {
        "93S2R.2.1": bool(finding_by_id["93S2R.2.1 escape-left-open negative-control trace"]["traceReproduced"]),
        "93S2R.2.2": bool(finding_by_id["93S2R.2.2 escape-right-open predicate/window trace"]["traceReproduced"]),
        "93S2R.2.3": bool(finding_by_id["93S2R.2.3 no-danger-control neutral trace"]["traceReproduced"]),
        "93S2R.2.4": bool(finding_by_id["93S2R.2.4 side-wall-left direction/control trace"]["traceReproduced"]),
        "93S2R.2.5": bool(finding_by_id["93S2R.2.5 predicate/minimum-window trace"]["traceReproduced"]),
    }
    root_cause_classes = sorted({str(finding["primaryRootCauseClass"]) for finding in findings})
    dod_coverage = {
        "DoD.S2R-R3": bool(all(finding["traceReproduced"] and finding["primaryRootCauseClass"] for finding in findings)),
    }
    ok = bool(required_sources_ready and source_contract_matches and all(phase_coverage.values()) and all(dod_coverage.values()))
    result_class = "targeted-trace-audit-green" if ok else "measurement-invalid"
    sample_counts = _as_mapping(effect_report.get("sampleCounts"))

    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2r-targeted-trace-audit-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2r_targeted_trace_audit.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93S2R",
        "phaseId": "93S2R.2",
        "resultClass": result_class,
        "matrixId": matrix_contract.get("matrixId"),
        "contractId": matrix_contract.get("contractId"),
        "actionSurfaceId": effect_report.get("actionSurfaceId"),
        "decoderHash": _sha256_file(ACTION_SURFACE_PATH),
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "sourceFilesReady": required_sources_ready,
        "sourceContractMatches": source_contract_matches,
        "sourceArtifacts": source_artifacts,
        "scriptHashes": {
            "bt93s2ExistingActionEffectV2": _sha256_file(S2_EFFECT_SCRIPT_PATH),
            "bt93s2rFailureTaxonomy": _sha256_file(S2R_TAXONOMY_SCRIPT_PATH),
            "bt93s2rTargetedTraceAudit": _sha256_file(S2R_TRACE_AUDIT_SCRIPT_PATH),
        },
        "targetScenarioIds": list(TARGET_SCENARIO_IDS),
        "targetActions": targets,
        "targetTraceProbeCount": len(selected),
        "findings": findings,
        "rootCauseClasses": root_cause_classes,
        "sampleCounts": {
            "sourceProbeCount": sample_counts.get("probeCount"),
            "targetTraceProbeCount": len(selected),
            "predicateFailureCount": sample_counts.get("predicateFailureCount"),
            "minimumWindowFailureCount": sample_counts.get("minimumWindowFailureCount"),
            "newTrainingEpisodes": sample_counts.get("newTrainingEpisodes"),
            "newOptimizerUpdates": sample_counts.get("newOptimizerUpdates"),
            "holdoutEpisodes": sample_counts.get("holdoutEpisodes"),
        },
        "claimFlags": _claim_flags(ok),
        "guardrails": _guardrails(),
        "invalidations": [
            {
                "scope": "BT93S2.3 normal continuation",
                "reason": "Targeted trace audit confirms BT93S2.3 remains measurement-invalid until v3 repair and a fresh S2.3 recheck.",
            },
            {
                "scope": "escape-right-open action-space judgement",
                "reason": "Positive-control weakness is not an action-surface repair decision before predicate/window fairness is repaired.",
            },
            {
                "scope": "side-wall-left positive evidence",
                "reason": "Direction/control mismatch is the primary root cause; policy selection or action quality cannot be judged from this trace.",
            },
        ],
        "blocksNext": list(BLOCKED_NEXT),
        "opensNext": ["93S2R.3 Matrix-/Control-v3 Contract Repair"] if ok else [],
        "allowNext": ["93S2R.3 Matrix-/Control-v3 Contract Repair"] if ok else [],
        "nextAllowedActions": [
            "Run 93S2R.3 matrix/control-v3 repair using only the root causes identified by this trace audit."
        ]
        if ok
        else [
            "Stop: targeted trace audit is measurement-invalid; repair source locks or trace classification before matrix/control-v3 work."
        ],
        "recommendations": [
            {
                "rank": "1",
                "action": "Implement 93S2R.3 Matrix-/Control-v3 Contract Repair.",
                "why": "Trace audit names the blocking root causes: negative-control escape-left, predicate/window fairness for escape-right, neutral-control instability, side-wall direction contract, and nonzero predicate/minimum-window failures.",
            }
        ]
        if ok
        else [
            {
                "rank": "1",
                "action": "Stop before v3 repair and fix the trace-audit invalidation.",
                "why": "A v3 matrix contract without reproduced root causes would violate the no-fix-without-cause gate.",
            }
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r_targeted_trace_audit.py --write-report",
            "next": "python python/scripts/bt93s2r_matrix_control_v3.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "summary": {
            "finalResult": result_class,
            "traceAuditComplete": ok,
            "nextBestAction": "93S2R.3" if ok else "trace-audit repair",
            "blockers": [] if ok else ["measurement-invalid"],
            "bt93s2RecheckAllowed": False,
            "bt93tAllowed": False,
            "bt93uAllowed": False,
            "bt93oP94aStillClosed": True,
        },
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "rootCauseClasses": report["rootCauseClasses"],
                "targetTraceProbeCount": report["targetTraceProbeCount"],
                "opensNext": report["opensNext"],
                "output": _rel(REPORT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
