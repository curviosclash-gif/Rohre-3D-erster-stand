"""BT93S2R2.3 empirical predicate/window reentry gate.

This script validates the BT93S2R2.2 repair contract against fresh environment
probes. It stays diagnostic-only: no PPO training, no holdout use, no reward,
telemetry, action-surface, runtime, registry, strategy, or matchstart changes.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"
for path in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import bt93s2_existing_action_effect_v2 as base  # noqa: E402
import bt93s2_existing_action_effect_v3_recheck as v3_recheck  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R2_ROOT = PPO_ROOT / "bt93s2r2"

RED_RECHECK_REPORT_PATH = BT93S2_ROOT / "existing_action_effect_v3_recheck_report.json"
S2R_REENTRY_GATE_PATH = BT93S2R_ROOT / "matrix_control_reentry_gate_report.json"
S2R_CLOSURE_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"
FAILURE_TAXONOMY_PATH = BT93S2R2_ROOT / "failure_taxonomy_report.json"
REPAIR_CONTRACT_PATH = BT93S2R2_ROOT / "predicate_window_repair_contract.json"
REPORT_PATH = BT93S2R2_ROOT / "empirical_reentry_gate_report.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r2_recheck_measurement_invalid.md"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r2_empirical_reentry_gate.py"

BLOCK_ID = "BT93S2R2"
PHASE_ID = "93S2R2.3"
MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
GREEN_RESULT = "matrix-control-reentry-green"

RETAINED_V2_SCENARIOS = {
    "frontal-near-wall",
    "narrowing-corridor",
    "side-wall-left",
    "side-wall-right",
    "trail-ahead",
    "trail-side",
}

BLOCKED_NEXT = [
    "93S2.4 start before fresh BT93S2.3-Recheck writes measurementValid=true",
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
    "PPO training",
    "reward fix from BT93S2R2.3",
    "telemetry fix from BT93S2R2.3",
    "action-surface change from BT93S2R2.3",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


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


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _expected_matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


def _source_artifact(
    path: Path,
    role: str,
    tracked: set[str],
    expected: Mapping[str, Any],
    *,
    source_key: str,
    required: bool = True,
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "sourceKey": source_key,
        "path": rel_path,
        "role": role,
        "required": required,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and (tracked_ok or not required) and expected_ok),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "matrixId": payload.get("matrixId") if payload else None,
        "contractId": payload.get("contractId") if payload else None,
        "actionSurfaceId": payload.get("actionSurfaceId") if payload else None,
        "expected": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "repairContract": (
            REPAIR_CONTRACT_PATH,
            "BT93S2R2.2 predicate/window repair contract",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R2.2",
                "resultClass": "predicate-window-repair-contract-green",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
            },
            True,
        ),
        "failureTaxonomy": (
            FAILURE_TAXONOMY_PATH,
            "BT93S2R2.1 failure taxonomy",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R2.1",
                "resultClass": "failure-taxonomy-source-lock-red-status-written",
                "ok": True,
            },
            True,
        ),
        "redRecheck": (
            RED_RECHECK_REPORT_PATH,
            "red BT93S2.3-Recheck source",
            {
                "blockId": "BT93S2",
                "phaseId": "93S2.3-Recheck",
                "resultClass": "measurement-invalid",
                "ok": False,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
            },
            True,
        ),
        "s2rReentryGate": (
            S2R_REENTRY_GATE_PATH,
            "BT93S2R green source reentry gate",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.4",
                "resultClass": GREEN_RESULT,
                "ok": True,
            },
            True,
        ),
        "s2rClosure": (
            S2R_CLOSURE_PATH,
            "BT93S2R closure source",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.99",
                "resultClass": GREEN_RESULT,
                "ok": True,
            },
            True,
        ),
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
        "empiricalScript": (SCRIPT_PATH, "BT93S2R2.3 empirical gate generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(path, role, tracked, expected, source_key=key, required=required)
        for key, (path, role, expected, required) in specs.items()
    ]


def _source_contracts_ready(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)


def _scenario_repairs(repair_contract: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    repairs = _get(repair_contract, "repairContract", "scenarioRepairs")
    return [repair for repair in _as_list(repairs) if isinstance(repair, Mapping)]


def _scenario_seed_list(scenario: Mapping[str, Any]) -> list[int]:
    return v3_recheck._scenario_seed_list(scenario)


def _run_probe(scenario: Mapping[str, Any], *, seed: int, action_name: str, repeat_steps: int) -> dict[str, Any]:
    return v3_recheck._run_probe_v3(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)


def _classify_action_results(
    scenario: Mapping[str, Any],
    action_results: Mapping[str, list[Mapping[str, Any]]],
) -> dict[str, Any]:
    return v3_recheck._classify_action_results_v3(scenario, action_results)


def _control_actions(scenario: Mapping[str, Any], key: str) -> set[str]:
    controls = _as_mapping(scenario.get("controls"))
    block = _as_mapping(controls.get(key))
    return {str(action) for action in _as_list(block.get("actions"))}


def _counter_direction_actions(scenario: Mapping[str, Any]) -> set[str]:
    controls = _as_mapping(scenario.get("controls"))
    block = _as_mapping(controls.get("counterDirectionControls"))
    return {str(action) for action in _as_list(block.get("actions"))}


def _probe_invalid_before_action(probe: Mapping[str, Any]) -> bool:
    predicate = _as_mapping(probe.get("v3Predicate"))
    return bool(
        probe.get("ok") is not True
        or predicate.get("pass") is not True
        or probe.get("completedMinimumWindow") is not True
        or probe.get("warmupTerminalBeforeAction") is True
    )


def _probe_row(
    scenario: Mapping[str, Any],
    probe: Mapping[str, Any],
) -> dict[str, Any]:
    positive_actions = _control_actions(scenario, "positiveControls")
    negative_actions = _control_actions(scenario, "negativeControls")
    counter_direction_actions = _counter_direction_actions(scenario)
    action_name = str(probe.get("actionName") or "")
    success = _as_mapping(probe.get("successEvaluation")).get("success") is True
    negative_failed = action_name in negative_actions and success
    direction_mismatch = bool(success and positive_actions and action_name not in positive_actions)
    counter_direction_success = bool(action_name in counter_direction_actions and success)
    return {
        "scenarioId": scenario.get("id"),
        "seed": probe.get("seed"),
        "actionName": action_name,
        "ok": probe.get("ok"),
        "v3PredicatePass": _as_mapping(probe.get("v3Predicate")).get("pass"),
        "completedMinimumWindow": probe.get("completedMinimumWindow"),
        "observedSteps": probe.get("observedSteps"),
        "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
        "success": success,
        "stateEffectObserved": _as_mapping(probe.get("successEvaluation")).get("stateEffectObserved"),
        "measurementInvalidBeforeAction": _probe_invalid_before_action(probe),
        "negativeControlFailed": negative_failed,
        "directionMismatch": direction_mismatch,
        "counterDirectionSuccess": counter_direction_success,
        "successEvaluation": probe.get("successEvaluation"),
        "effectMetrics": probe.get("effectMetrics"),
        "safetyTelemetry": probe.get("safetyTelemetry"),
    }


def _scenario_gate(
    scenario: Mapping[str, Any],
    probes: list[Mapping[str, Any]],
    scenario_result: Mapping[str, Any],
    repair: Mapping[str, Any],
) -> dict[str, Any]:
    scenario_id = str(scenario.get("id") or "")
    positive_actions = _control_actions(scenario, "positiveControls")
    negative_actions = _control_actions(scenario, "negativeControls")
    rows = [_probe_row(scenario, probe) for probe in probes]
    positive_rows = [row for row in rows if row["actionName"] in positive_actions]
    negative_rows = [row for row in rows if row["actionName"] in negative_actions]
    predicate_failure_count = sum(1 for row in rows if row["v3PredicatePass"] is not True)
    minimum_window_failure_count = sum(1 for row in rows if row["completedMinimumWindow"] is not True)
    measurement_invalid_count = sum(1 for row in rows if row["measurementInvalidBeforeAction"])
    negative_control_failed_count = sum(1 for row in negative_rows if row["negativeControlFailed"] is True)
    direction_mismatch_count = sum(
        1 for row in rows if row["directionMismatch"] is True or row["counterDirectionSuccess"] is True
    )
    positive_control_measurable_count = sum(1 for row in positive_rows if row["measurementInvalidBeforeAction"] is False)
    positive_control_expected_count = len(positive_actions) * len({row["seed"] for row in rows})
    escape_right_fairness_failure_count = 0
    if scenario_id == "escape-right-open":
        escape_right_fairness_failure_count = max(0, positive_control_expected_count - positive_control_measurable_count)
    retained_v2_measurement_invalid_count = measurement_invalid_count if scenario_id in RETAINED_V2_SCENARIOS else 0
    neutral_control_required_count = 0
    if scenario_id == "no-danger-control":
        neutral_control_required_count = 1 if scenario_result.get("classResult") != "neutral-control-stable" else 0
    scenario_measurement_invalid = 1 if scenario_result.get("classResult") == "measurement-invalid" else 0
    gate_green = bool(
        predicate_failure_count == 0
        and minimum_window_failure_count == 0
        and measurement_invalid_count == 0
        and negative_control_failed_count == 0
        and direction_mismatch_count == 0
        and escape_right_fairness_failure_count == 0
        and retained_v2_measurement_invalid_count == 0
        and neutral_control_required_count == 0
        and scenario_measurement_invalid == 0
    )
    return {
        "scenarioId": scenario_id,
        "repairClass": repair.get("repairClass"),
        "probeCount": len(rows),
        "seedCount": len({row["seed"] for row in rows}),
        "positiveControlActions": sorted(positive_actions),
        "negativeControlActions": sorted(negative_actions),
        "classResult": scenario_result.get("classResult"),
        "counts": {
            "predicateFailureCount": predicate_failure_count,
            "minimumWindowFailureCount": minimum_window_failure_count,
            "measurementInvalidCount": measurement_invalid_count,
            "scenarioMeasurementInvalidCount": scenario_measurement_invalid,
            "negativeControlFailedCount": negative_control_failed_count,
            "directionMismatchCount": direction_mismatch_count,
            "escapeRightFairnessFailureCount": escape_right_fairness_failure_count,
            "retainedV2MeasurementInvalidCount": retained_v2_measurement_invalid_count,
            "neutralControlRequiredCount": neutral_control_required_count,
        },
        "negativeControlFirst": {
            "required": scenario_id == "escape-left-open",
            "negativeControlRows": negative_rows,
            "pass": negative_control_failed_count == 0,
        },
        "escapeRightFairnessFirst": {
            "required": scenario_id == "escape-right-open",
            "positiveControlExpectedCount": positive_control_expected_count,
            "positiveControlMeasurableCount": positive_control_measurable_count,
            "pass": escape_right_fairness_failure_count == 0,
        },
        "retainedV2Revalidation": {
            "required": scenario_id in RETAINED_V2_SCENARIOS,
            "measurementInvalidCount": retained_v2_measurement_invalid_count,
            "pass": retained_v2_measurement_invalid_count == 0,
        },
        "gateGreen": gate_green,
        "probeRows": rows,
    }


def _sum_scenario_counts(scenario_gates: Iterable[Mapping[str, Any]], key: str) -> int:
    return sum(int(_as_mapping(gate.get("counts")).get(key) or 0) for gate in scenario_gates)


def _result_class(
    *,
    sources_ready: bool,
    guardrails_ok: bool,
    counts: Mapping[str, Any],
    scenario_gates: Iterable[Mapping[str, Any]],
) -> str:
    if not sources_ready or not guardrails_ok or counts.get("measurementInvalidCount") != 0:
        return "measurement-invalid"
    if counts.get("predicateFailureCount") != 0 or counts.get("minimumWindowFailureCount") != 0:
        return "predicate-window-required"
    if counts.get("negativeControlFailedCount") != 0:
        return "escape-control-required"
    if counts.get("neutralControlRequiredCount") != 0:
        return "neutral-control-required"
    if counts.get("directionMismatchCount") != 0:
        return "measurement-invalid"
    if any(gate.get("gateGreen") is not True for gate in scenario_gates):
        return "measurement-invalid"
    return GREEN_RESULT


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newOptimizerUpdates": 0,
        "newTrainingEpisodes": 0,
        "newEvalRunStarted": False,
        "holdoutUsed": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "qualityClaimAllowed": False,
    }


def _claim_flags(green: bool) -> dict[str, bool]:
    return {
        "bt93s2r2ClosureAllowed": True,
        "bt93s2FreshRecheckAllowedAfterClosure": green,
        "phase93S2_4Allowed": False,
        "bt93tClaimable": False,
        "bt93uClaimable": False,
        "bt93wClaimable": False,
        "bt93oClaimable": False,
        "bt93xFullClaimAllowed": False,
        "bt93pClaimable": False,
        "bt94aClaimable": False,
        "bt95HandoffAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutAllowed": False,
        "ppoValidateSignalAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoTrainingAllowed": False,
        "actionSurfaceChangeAllowed": False,
        "rewardChangeAllowed": False,
        "telemetryChangeAllowed": False,
        "runtimeChangeAllowed": False,
    }


def build_report(*, seed_limit: int | None = None, action_limit: int | None = None) -> dict[str, Any]:
    repair_contract = _read_json(REPAIR_CONTRACT_PATH)
    red_recheck = _read_json(RED_RECHECK_REPORT_PATH)
    taxonomy = _read_json(FAILURE_TAXONOMY_PATH)
    source_artifacts = _source_artifacts()
    sources_ready = _source_contracts_ready(source_artifacts)
    actions = [name for name, _token in MASKED_SEMANTIC_ACTIONS]
    if action_limit is not None:
        actions = actions[: max(1, int(action_limit))]

    all_probes: list[dict[str, Any]] = []
    scenario_results: dict[str, Any] = {}
    scenario_gates: list[dict[str, Any]] = []
    seed_counts_by_scenario: dict[str, int] = {}
    repeat_steps_by_scenario: dict[str, int] = {}

    for repair in _scenario_repairs(repair_contract):
        scenario = _as_mapping(repair.get("repairedScenarioContract"))
        scenario_id = str(scenario.get("id") or repair.get("scenarioId") or "")
        if not scenario_id:
            continue
        effect_window = _as_mapping(scenario.get("effectWindow"))
        repeat_steps = int(effect_window.get("maxSteps") or 24)
        repeat_steps_by_scenario[scenario_id] = repeat_steps
        seeds = _scenario_seed_list(scenario)
        if seed_limit is not None:
            seeds = seeds[: max(1, int(seed_limit))]
        seed_counts_by_scenario[scenario_id] = len(seeds)
        action_results: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
        scenario_probes: list[dict[str, Any]] = []
        for seed in seeds:
            for action_name in actions:
                probe = _run_probe(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
                scenario_probes.append(probe)
                all_probes.append(probe)
                action_results[action_name].append(probe)
        result = _classify_action_results(scenario, action_results)
        scenario_results[scenario_id] = result
        scenario_gates.append(_scenario_gate(scenario, scenario_probes, result, repair))

    guardrails = _guardrails()
    guardrails_ok = bool(
        guardrails["diagnosticOnly"]
        and not guardrails["trainingStarted"]
        and not guardrails["holdoutUsed"]
        and not guardrails["actionSurfaceChanged"]
        and not guardrails["productiveRuntimeChanged"]
    )
    required_metrics_written = bool(all_probes) and all(
        all(metric in _as_mapping(probe.get("effectMetrics")) for metric in base.REQUIRED_EFFECT_METRICS)
        for probe in all_probes
    )
    class_counts = Counter(str(result.get("classResult")) for result in scenario_results.values())
    counts = {
        "scenarioCount": len(scenario_results),
        "actionCount": len(actions),
        "probeCount": len(all_probes),
        "sourceProbeCount": _get(red_recheck, "sampleCounts", "probeCount"),
        "sourcePredicateFailureCount": _get(red_recheck, "sampleCounts", "predicateFailureCount"),
        "sourceMinimumWindowFailureCount": _get(red_recheck, "sampleCounts", "minimumWindowFailureCount"),
        "taxonomyFailureRowCount": len(_as_list(taxonomy.get("failureRows"))),
        "predicateFailureCount": _sum_scenario_counts(scenario_gates, "predicateFailureCount"),
        "minimumWindowFailureCount": _sum_scenario_counts(scenario_gates, "minimumWindowFailureCount"),
        "measurementInvalidCount": _sum_scenario_counts(scenario_gates, "measurementInvalidCount")
        + _sum_scenario_counts(scenario_gates, "scenarioMeasurementInvalidCount"),
        "negativeControlFailedCount": _sum_scenario_counts(scenario_gates, "negativeControlFailedCount"),
        "directionMismatchCount": _sum_scenario_counts(scenario_gates, "directionMismatchCount"),
        "escapeRightFairnessFailureCount": _sum_scenario_counts(scenario_gates, "escapeRightFairnessFailureCount"),
        "retainedV2MeasurementInvalidCount": _sum_scenario_counts(
            scenario_gates, "retainedV2MeasurementInvalidCount"
        ),
        "neutralControlRequiredCount": _sum_scenario_counts(scenario_gates, "neutralControlRequiredCount"),
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    zero_count_gate_green = bool(
        sources_ready
        and guardrails_ok
        and required_metrics_written
        and all(gate.get("gateGreen") is True for gate in scenario_gates)
        and all(
            counts[key] == 0
            for key in (
                "predicateFailureCount",
                "minimumWindowFailureCount",
                "measurementInvalidCount",
                "negativeControlFailedCount",
                "directionMismatchCount",
                "escapeRightFairnessFailureCount",
                "retainedV2MeasurementInvalidCount",
                "neutralControlRequiredCount",
            )
        )
    )
    result_class = _result_class(
        sources_ready=sources_ready,
        guardrails_ok=guardrails_ok,
        counts=counts,
        scenario_gates=scenario_gates,
    )
    green = bool(result_class == GREEN_RESULT and zero_count_gate_green)
    phase_coverage = {
        "93S2R2.3.1": bool(all_probes and required_metrics_written),
        "93S2R2.3.2": bool(
            scenario_gates
            and any(gate.get("negativeControlFirst", {}).get("required") for gate in scenario_gates)
            and any(gate.get("escapeRightFairnessFirst", {}).get("required") for gate in scenario_gates)
            and any(gate.get("retainedV2Revalidation", {}).get("required") for gate in scenario_gates)
        ),
        "93S2R2.3.3": True,
    }
    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2r2-empirical-reentry-gate-v1",
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
        "ok": green,
        "gatePassed": green,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "matrixId": repair_contract.get("matrixId") or MATRIX_ID,
        "contractId": repair_contract.get("contractId") or CONTRACT_ID,
        "repairContractId": repair_contract.get("repairContractId"),
        "actionSurfaceId": repair_contract.get("actionSurfaceId") or PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "decoderHash": repair_contract.get("decoderHash") or _sha256_file(ACTION_SURFACE_PATH),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": sources_ready,
        "sourceFilesVersioned": all(
            item.get("tracked") is True for item in source_artifacts if item.get("required") is True
        ),
        "thresholdsLockedBeforeRun": {
            "source": _rel(REPAIR_CONTRACT_PATH),
            "predicateFailureCountMustBe": 0,
            "minimumWindowFailureCountMustBe": 0,
            "measurementInvalidCountMustBe": 0,
            "negativeControlFailedCountMustBe": 0,
            "directionMismatchCountMustBe": 0,
            "escapeRightFairnessFailureCountMustBe": 0,
            "retainedV2MeasurementInvalidCountMustBe": 0,
            "neutralControlRequiredCountMustBe": 0,
            "effectWindowStepsByScenario": repeat_steps_by_scenario,
            "seedCountsByScenario": seed_counts_by_scenario,
            "forbiddenSuccessProxies": list(base.FORBIDDEN_SUCCESS_PROXIES),
        },
        "requiredEffectMetrics": list(base.REQUIRED_EFFECT_METRICS),
        "sampleCounts": counts,
        "phaseCoverage": phase_coverage,
        "zeroCountGateGreen": zero_count_gate_green,
        "classResultCounts": dict(sorted(class_counts.items())),
        "scenarioGates": scenario_gates,
        "scenarioResults": scenario_results,
        "actionSummary": base._aggregate_action_classes_v2(scenario_results),
        "probes": all_probes,
        "claimFlags": _claim_flags(green),
        "guardrails": guardrails,
        "allowNext": ["93S2R2.99 Abschluss"] if not green else ["93S2R2.99 Abschluss, then BT93S2.3-Recheck"],
        "opensNext": ["BT93S2.3-Recheck"] if green else [],
        "blocksNext": list(BLOCKED_NEXT),
        "nextAllowedActions": [
            "Run 93S2R2.99 closure, then start a fresh BT93S2.3-Recheck. Do not start 93S2.4 directly."
        ]
        if green
        else [
            "Run 93S2R2.99 closure to record the red empirical gate and prepare a narrower follow-up replan; do not start BT93S2.3-Recheck or 93S2.4."
        ],
        "invalidations": [
            {
                "scope": "direct 93S2.4 continuation",
                "reason": "BT93S2R2.3 can only open a fresh BT93S2.3-Recheck when all empirical null-count gates are zero.",
            },
            {
                "scope": "BT93T/U/W/O/P/94A and all candidate/freeze/holdout/promote/rollout signals",
                "reason": "This phase is measurement-validity only and cannot promote action quality, reward quality, survival, or runtime readiness.",
            },
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r2_empirical_reentry_gate.py --write-report",
            "closure": "python python/scripts/bt93s2r2_closure_gate.py --write-report",
            "freshRecheckIfGreen": "python python/scripts/bt93s2_existing_action_effect_v3_recheck.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "head": _git_output(["git", "rev-parse", "HEAD"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "actionSurface": build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def _markdown(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    scenario_gates = _as_list(report.get("scenarioGates"))
    scenario_rows = "\n".join(
        "- `{scenario}`: result=`{result}`, predicate=`{predicate}`, window=`{window}`, measurementInvalid=`{invalid}`, "
        "negative=`{negative}`, direction=`{direction}`, escapeRightFairness=`{fairness}`, retainedV2=`{retained}`, "
        "neutral=`{neutral}`".format(
            scenario=gate.get("scenarioId"),
            result=gate.get("classResult"),
            predicate=_as_mapping(gate.get("counts")).get("predicateFailureCount"),
            window=_as_mapping(gate.get("counts")).get("minimumWindowFailureCount"),
            invalid=_as_mapping(gate.get("counts")).get("measurementInvalidCount"),
            negative=_as_mapping(gate.get("counts")).get("negativeControlFailedCount"),
            direction=_as_mapping(gate.get("counts")).get("directionMismatchCount"),
            fairness=_as_mapping(gate.get("counts")).get("escapeRightFairnessFailureCount"),
            retained=_as_mapping(gate.get("counts")).get("retainedV2MeasurementInvalidCount"),
            neutral=_as_mapping(gate.get("counts")).get("neutralControlRequiredCount"),
        )
        for gate in scenario_gates
        if isinstance(gate, Mapping)
    )
    return f"""# Fehlerbericht: BT93S2R2 Empirical-Reentry Gate

## Aufgabe/Kontext

- Task: `BT93S2R2.3`
- Ziel: reparierten Predicate-/Window-Vertrag gegen echte Env-Proben validieren.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`, `gatePassed={report.get('gatePassed')}`
- Source-Probes: `{counts.get('sourceProbeCount')}`
- Fresh-Probes: `{counts.get('probeCount')}`
- Predicate-Fails: `{counts.get('predicateFailureCount')}`
- Minimum-Window-Fails: `{counts.get('minimumWindowFailureCount')}`
- Measurement-Invalid: `{counts.get('measurementInvalidCount')}`
- Negative-Control-Fails: `{counts.get('negativeControlFailedCount')}`
- Direction-Mismatches: `{counts.get('directionMismatchCount')}`
- Escape-Right-Fairness-Fails: `{counts.get('escapeRightFairnessFailureCount')}`
- Retained-v2-Measurement-Invalid: `{counts.get('retainedV2MeasurementInvalidCount')}`
- Neutral-Control-Required: `{counts.get('neutralControlRequiredCount')}`
- PPO-Training/Holdout/Runtime-Aenderungen: `0`

## Szenario-Gates

{scenario_rows}

## Bewertung

`BT93S2R2.3` hat echte Env-Proben geschrieben und das Null-Count-Gate vor
jedem Folgeclaim erzwungen. Nur `matrix-control-reentry-green` darf nach
`93S2R2.99` einen frischen `BT93S2.3-Recheck` oeffnen. `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/empirical_reentry_gate_report.json`
- Command: `python python/scripts/bt93s2r2_empirical_reentry_gate.py --write-report`

## Naechster Schritt

{_as_list(report.get('nextAllowedActions'))[0] if _as_list(report.get('nextAllowedActions')) else 'Keine Folgeaktion geoeffnet.'}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    parser.add_argument("--seed-limit", type=int, default=None, help="diagnostic override; default uses all seeds")
    parser.add_argument("--action-limit", type=int, default=None, help="diagnostic override; default uses all actions")
    args = parser.parse_args()

    report = build_report(seed_limit=args.seed_limit, action_limit=args.action_limit)
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_text(DOC_PATH, _markdown(report))
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "sampleCounts": report["sampleCounts"],
                "zeroCountGateGreen": report["zeroCountGateGreen"],
                "opensNext": report["opensNext"],
                "report": _rel(REPORT_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
