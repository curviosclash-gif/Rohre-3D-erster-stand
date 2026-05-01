"""BT93S2R3.1 source lock and failure ledger.

This phase is diagnostic-only. It locks the red BT93S2R2 source evidence and
normalizes the 103 taxonomy failures into a S2R3-owned ledger with replay keys,
direction expectations, retained-v2 status, and secondary blocker classes.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R2_ROOT = PPO_ROOT / "bt93s2r2"
BT93S2R3_ROOT = PPO_ROOT / "bt93s2r3"
SCRIPT_PATH = PYTHON_ROOT / "scripts" / "bt93s2r3_failure_ledger.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

S2_RECHECK_PATH = BT93S2_ROOT / "existing_action_effect_v3_recheck_report.json"
S2R_MATRIX_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
S2R_CLOSURE_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"
S2R2_FAILURE_TAXONOMY_PATH = BT93S2R2_ROOT / "failure_taxonomy_report.json"
S2R2_REPAIR_CONTRACT_PATH = BT93S2R2_ROOT / "predicate_window_repair_contract.json"
S2R2_EMPIRICAL_GATE_PATH = BT93S2R2_ROOT / "empirical_reentry_gate_report.json"
S2R2_CLOSURE_PATH = BT93S2R2_ROOT / "bt93s2r2_closure_gate_report.json"
REPORT_PATH = BT93S2R3_ROOT / "failure_ledger_report.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r3_measurement_reentry_required.md"

BLOCK_ID = "BT93S2R3"
PHASE_ID = "93S2R3.1"
RESULT_CLASS = "source-lock-failure-ledger-written"
MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
REPAIR_CONTRACT_ID = "bt93s2r2-predicate-window-repair-contract-v1"
ACTION_SURFACE_ID = "bt93q-walltrail-semantic-action-v1"
DECODER_HASH = "970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9"
EXPECTED_LEDGER_ROWS = 103

DOWNSTREAM_BLOCKS = [
    "BT93S2.3-Recheck before BT93S2R3.99 green closure",
    "93S2.4 start before a fresh BT93S2.3-Recheck writes measurementValid=true",
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
    "reward fix from BT93S2R3.1",
    "telemetry fix from BT93S2R3.1",
    "action-surface change from BT93S2R3.1",
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


def _hash_value(value: Any) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


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
    if isinstance(expected, list) and isinstance(actual, list):
        return actual == expected
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
    "s2Recheck": (
        S2_RECHECK_PATH,
        "red BT93S2.3-Recheck source",
        {
            "blockId": "BT93S2",
            "phaseId": "93S2.3-Recheck",
            "resultClass": "measurement-invalid",
            "ok": False,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "sampleCounts.probeCount": 338,
            "sampleCounts.predicateFailureCount": 36,
            "sampleCounts.minimumWindowFailureCount": 8,
        },
        True,
    ),
    "s2rMatrixContract": (
        S2R_MATRIX_PATH,
        "BT93S2R matrix/control-v3 contract",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.3",
            "resultClass": "matrix-control-v3-contract-green",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
        },
        True,
    ),
    "s2rClosure": (
        S2R_CLOSURE_PATH,
        "BT93S2R green closure",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.99",
            "resultClass": "matrix-control-reentry-green",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
        },
        True,
    ),
    "s2r2FailureTaxonomy": (
        S2R2_FAILURE_TAXONOMY_PATH,
        "BT93S2R2.1 failure taxonomy",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.1",
            "resultClass": "failure-taxonomy-source-lock-red-status-written",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "sampleCounts.taxonomyFailureRowCount": EXPECTED_LEDGER_ROWS,
        },
        True,
    ),
    "s2r2RepairContract": (
        S2R2_REPAIR_CONTRACT_PATH,
        "BT93S2R2.2 predicate/window repair contract",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.2",
            "resultClass": "predicate-window-repair-contract-green",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "repairContractId": REPAIR_CONTRACT_ID,
            "sampleCounts.predicateValidationRowCount": EXPECTED_LEDGER_ROWS,
        },
        True,
    ),
    "s2r2EmpiricalGate": (
        S2R2_EMPIRICAL_GATE_PATH,
        "BT93S2R2.3 empirical reentry gate",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.3",
            "resultClass": "measurement-invalid",
            "ok": False,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "repairContractId": REPAIR_CONTRACT_ID,
            "sampleCounts.probeCount": 338,
            "sampleCounts.taxonomyFailureRowCount": EXPECTED_LEDGER_ROWS,
            "sampleCounts.predicateFailureCount": 39,
            "sampleCounts.minimumWindowFailureCount": 11,
            "sampleCounts.measurementInvalidCount": 49,
            "sampleCounts.directionMismatchCount": 24,
            "sampleCounts.escapeRightFairnessFailureCount": 1,
            "sampleCounts.retainedV2MeasurementInvalidCount": 28,
            "sampleCounts.neutralControlRequiredCount": 1,
            "sampleCounts.newTrainingEpisodes": 0,
            "sampleCounts.holdoutEpisodes": 0,
        },
        True,
    ),
    "s2r2Closure": (
        S2R2_CLOSURE_PATH,
        "BT93S2R2.99 red closure",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.99",
            "resultClass": "measurement-invalid",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "opensNext": [],
            "sampleCounts.probeCount": 338,
            "sampleCounts.taxonomyFailureRowCount": EXPECTED_LEDGER_ROWS,
            "sampleCounts.predicateFailureCount": 39,
            "sampleCounts.minimumWindowFailureCount": 11,
            "sampleCounts.measurementInvalidCount": 49,
            "sampleCounts.directionMismatchCount": 24,
            "sampleCounts.escapeRightFairnessFailureCount": 1,
            "sampleCounts.retainedV2MeasurementInvalidCount": 28,
            "sampleCounts.neutralControlRequiredCount": 1,
            "sampleCounts.newTrainingEpisodes": 0,
            "sampleCounts.holdoutEpisodes": 0,
        },
        True,
    ),
    "actionSurface": (
        ACTION_SURFACE_PATH,
        "read-only PPO action-surface decoder",
        {},
        True,
    ),
    "s2r3FailureLedgerScript": (
        SCRIPT_PATH,
        "BT93S2R3.1 failure ledger generator",
        {},
        False,
    ),
}


def _source_artifact(
    source_key: str,
    path: Path,
    role: str,
    expected: Mapping[str, Any],
    required: bool,
    tracked: set[str],
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
        "fresh": bool(path.is_file() and expected_ok and (tracked_ok or not required)),
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "matrixId": payload.get("matrixId") if payload else None,
        "contractId": payload.get("contractId") if payload else None,
        "repairContractId": payload.get("repairContractId") if payload else None,
        "actionSurfaceId": payload.get("actionSurfaceId") if payload else None,
        "decoderHash": payload.get("decoderHash") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expectedFields": {
            key: sorted(value) if isinstance(value, set) else value for key, value in expected.items()
        },
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected, _required in SOURCE_SPECS.values())
    return [
        _source_artifact(key, path, role, expected, required, tracked)
        for key, (path, role, expected, required) in SOURCE_SPECS.items()
    ]


def _scenario_contracts(matrix_contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    scenarios = _as_list(matrix_contract.get("scenarios"))
    return {
        str(scenario.get("id")): scenario
        for scenario in scenarios
        if isinstance(scenario, Mapping) and scenario.get("id")
    }


def _scenario_gates(empirical_gate: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    gates = _as_list(empirical_gate.get("scenarioGates"))
    return {
        str(gate.get("scenarioId")): gate
        for gate in gates
        if isinstance(gate, Mapping) and gate.get("scenarioId")
    }


def _probe_index(empirical_gate: Mapping[str, Any]) -> dict[tuple[str, str, str], Mapping[str, Any]]:
    probes = _as_list(empirical_gate.get("probes"))
    index: dict[tuple[str, str, str], Mapping[str, Any]] = {}
    for probe in probes:
        if not isinstance(probe, Mapping):
            continue
        key = (str(probe.get("scenarioId")), str(probe.get("seed")), str(probe.get("actionName")))
        index[key] = probe
    for gate in _as_list(empirical_gate.get("scenarioGates")):
        if not isinstance(gate, Mapping):
            continue
        for probe in _as_list(gate.get("probeRows")):
            if not isinstance(probe, Mapping):
                continue
            key = (str(probe.get("scenarioId")), str(probe.get("seed")), str(probe.get("actionName")))
            index[key] = {**dict(index.get(key, {})), **dict(probe)}
    return index


def _failure_row_key(row: Mapping[str, Any]) -> tuple[str, str, str]:
    return (str(row.get("scenarioId")), str(row.get("seed")), str(row.get("actionName")))


def _expected_direction(
    scenario_id: str,
    action_name: str,
    contract: Mapping[str, Any],
    gate: Mapping[str, Any],
) -> dict[str, Any]:
    controls = _as_mapping(contract.get("controls"))
    success_contract = _as_mapping(contract.get("successContract"))
    positive_controls = set(_as_mapping(controls.get("positiveControls")).get("actions") or gate.get("positiveControlActions") or [])
    negative_controls = set(_as_mapping(controls.get("negativeControls")).get("actions") or gate.get("negativeControlActions") or [])
    counter_controls = set(_as_mapping(controls.get("counterDirectionControls")).get("actions") or [])
    directed_effect = _as_mapping(success_contract.get("directedEffect"))
    direction_contract = _as_mapping(success_contract.get("directionContract") or controls.get("directionContract"))
    neutral_control = _as_mapping(success_contract.get("neutralControl"))
    neutral_window = _as_mapping(controls.get("neutralWindow"))
    expected_escape_direction = (
        directed_effect.get("expectedEscapeDirection")
        or direction_contract.get("expectedEscapeDirection")
        or ("neutral" if neutral_control else None)
    )
    primary_metric = (
        directed_effect.get("metric")
        or direction_contract.get("primaryMetric")
        or ("neutral-window" if neutral_control else None)
    )
    fallback_metric = directed_effect.get("fallbackMetric") or direction_contract.get("secondaryMetric")
    if action_name in negative_controls:
        action_role = "negative-control"
        expected_effect = "must-not-pass-as-success"
    elif action_name in counter_controls:
        action_role = "counter-direction-control"
        expected_effect = f"must-not-pass-as-{expected_escape_direction or 'expected'}"
    elif neutral_control:
        action_role = "neutral-control-positive" if action_name in positive_controls else "neutral-control-other"
        expected_effect = "neutral-stability-only-no-action-green"
    elif action_name in positive_controls:
        action_role = "positive-control"
        expected_effect = expected_escape_direction or "state-effect"
    else:
        action_role = "non-control-action"
        expected_effect = "not-eligible-for-action-green"
    return {
        "scenarioId": scenario_id,
        "actionName": action_name,
        "actionRole": action_role,
        "expectedDirection": expected_escape_direction,
        "expectedEffect": expected_effect,
        "primaryMetric": primary_metric,
        "fallbackMetric": fallback_metric,
        "positiveControlActions": sorted(positive_controls),
        "negativeControlActions": sorted(negative_controls),
        "counterDirectionActions": sorted(counter_controls),
        "requiredStateEffects": list(controls.get("requiredStateEffects") or []),
        "forbiddenSuccessProxies": list(success_contract.get("forbiddenSuccessProxies") or []),
        "neutralWindow": dict(neutral_window),
        "rewardOrCommandFlagsCanMakeSuccess": False,
        "positiveControlsMustMatchExpectedDirection": bool(
            direction_contract.get("positiveControlsMustMatchExpectedDirection") or directed_effect
        ),
    }


def _secondary_classes(row: Mapping[str, Any], probe: Mapping[str, Any], gate: Mapping[str, Any]) -> list[str]:
    classes: set[str] = set()
    primary = str(row.get("primaryRootCauseClass") or "")
    predicate = _as_mapping(row.get("predicate"))
    minimum_window = _as_mapping(row.get("minimumWindow"))
    warmup = _as_mapping(row.get("warmup"))
    success_eval = _as_mapping(row.get("successEvaluation"))
    retained = _as_mapping(gate.get("retainedV2Revalidation"))
    fairness = _as_mapping(gate.get("escapeRightFairnessFirst"))
    counts = _as_mapping(gate.get("counts"))

    if primary in {"start-metrics-drift", "warmup-seed-drift", "predicate-expression-drift", "predicate-function-drift"}:
        classes.add("replay-determinism-required")
    if (
        primary in {"minimum-window-fail", "start-metrics-drift", "warmup-seed-drift"}
        or predicate.get("v3Pass") is False
        or minimum_window.get("completed") is False
        or warmup.get("warmupTerminalBeforeAction") is True
        or probe.get("measurementInvalidBeforeAction") is True
    ):
        classes.add("predicate-window-required")
    if probe.get("directionMismatch") is True or probe.get("counterDirectionSuccess") is True:
        classes.add("direction-contract-required")
    if primary == "negative-control-fail" or _as_mapping(row.get("negativeControl")).get("negativeControlFailed") is True:
        classes.add("negative-control-source-history")
    if row.get("scenarioId") == "escape-right-open" and fairness.get("required") is True and fairness.get("pass") is False:
        if probe.get("measurementInvalidBeforeAction") is True:
            classes.add("escape-right-fairness-required")
    if retained.get("required") is True and retained.get("pass") is False and probe.get("measurementInvalidBeforeAction") is True:
        classes.add("retained-v2-measurement-required")
    if primary == "neutral-control-unstable" or int(counts.get("neutralControlRequiredCount") or 0) > 0:
        classes.add("neutral-control-required")
    if primary == "env-measurement-drift" or probe.get("measurementInvalidBeforeAction") is True:
        classes.add("measurement-invalid")
    classes.discard(primary)
    return sorted(classes)


def _ledger_rows(
    failure_taxonomy: Mapping[str, Any],
    empirical_gate: Mapping[str, Any],
    matrix_contract: Mapping[str, Any],
) -> list[dict[str, Any]]:
    contracts = _scenario_contracts(matrix_contract)
    gates = _scenario_gates(empirical_gate)
    probes = _probe_index(empirical_gate)
    rows: list[dict[str, Any]] = []
    for index, source_row in enumerate(_as_list(failure_taxonomy.get("failureRows"))):
        if not isinstance(source_row, Mapping):
            continue
        scenario_id, seed, action_name = _failure_row_key(source_row)
        probe = probes.get((scenario_id, seed, action_name), {})
        gate = gates.get(scenario_id, {})
        contract = contracts.get(scenario_id, {})
        start_metrics = source_row.get("startMetrics") or probe.get("startMetrics") or {}
        start_metrics_hash = _hash_value(start_metrics)
        warmup = _as_mapping(source_row.get("warmup"))
        warmup_key_payload = {
            "scenarioId": scenario_id,
            "seed": seed,
            "warmupAction": warmup.get("warmupAction") or probe.get("warmupAction"),
            "warmupSteps": warmup.get("warmupSteps") if warmup.get("warmupSteps") is not None else probe.get("warmupSteps"),
            "actionName": action_name,
        }
        warmup_key = _hash_value(warmup_key_payload)
        replay_payload = {
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
            "scenarioId": scenario_id,
            "seed": seed,
            "actionName": action_name,
            "actionToken": source_row.get("actionToken"),
            "warmupKey": warmup_key,
            "startMetricsHash": start_metrics_hash,
        }
        expected_direction = _expected_direction(scenario_id, action_name, contract, gate)
        retained_status = _as_mapping(gate.get("retainedV2Revalidation"))
        ledger_row = {
            "ledgerIndex": index,
            "sourceProbeIndex": source_row.get("probeIndex"),
            "scenarioId": scenario_id,
            "seed": int(seed) if seed.isdigit() else seed,
            "actionName": action_name,
            "actionToken": source_row.get("actionToken"),
            "primaryClass": source_row.get("primaryRootCauseClass"),
            "primaryReason": source_row.get("primaryRootCauseReason"),
            "secondaryClasses": _secondary_classes(source_row, probe, gate),
            "scenarioClassResult": source_row.get("scenarioClassResult"),
            "repairClass": gate.get("repairClass"),
            "sessionReplayId": f"bt93s2r3-{_hash_value(replay_payload)[:24]}",
            "replayKeyPayload": replay_payload,
            "startMetricsHash": start_metrics_hash,
            "warmupKey": warmup_key,
            "warmup": {
                "warmupAction": warmup_key_payload["warmupAction"],
                "warmupSteps": warmup_key_payload["warmupSteps"],
                "warmupTerminalBeforeAction": warmup.get("warmupTerminalBeforeAction"),
            },
            "expectedDirection": expected_direction,
            "retainedV2Status": {
                "required": bool(retained_status.get("required")),
                "pass": bool(retained_status.get("pass")),
                "scenarioMeasurementInvalidCount": retained_status.get("measurementInvalidCount"),
                "rowMeasurementInvalidBeforeAction": bool(probe.get("measurementInvalidBeforeAction")),
                "rowIsRetainedV2MeasurementInvalid": bool(
                    retained_status.get("required") is True
                    and retained_status.get("pass") is False
                    and probe.get("measurementInvalidBeforeAction") is True
                ),
            },
            "preActionValidity": {
                "predicatePass": _as_mapping(source_row.get("predicate")).get("v3Pass"),
                "completedMinimumWindow": _as_mapping(source_row.get("minimumWindow")).get("completed"),
                "warmupTerminalBeforeAction": warmup.get("warmupTerminalBeforeAction"),
                "measurementInvalidBeforeAction": bool(probe.get("measurementInvalidBeforeAction")),
                "observedSteps": _as_mapping(source_row.get("minimumWindow")).get("observedSteps"),
                "minimumCompletedSteps": _as_mapping(source_row.get("minimumWindow")).get("minimumCompletedSteps"),
            },
            "directionEvidence": {
                "directionMismatch": bool(probe.get("directionMismatch")),
                "counterDirectionSuccess": bool(probe.get("counterDirectionSuccess")),
                "wrongDirectionSuccess": bool(_as_mapping(source_row.get("directionContract")).get("wrongDirectionSuccess")),
                "stateEffectObserved": bool(_as_mapping(source_row.get("successEvaluation")).get("stateEffectObserved")),
                "success": _as_mapping(source_row.get("successEvaluation")).get("success"),
                "stateEffectSignals": list(_as_mapping(source_row.get("successEvaluation")).get("stateEffectSignals") or []),
                "rewardOnlyRejected": _as_mapping(source_row.get("successEvaluation")).get("rewardOnlyRejected"),
                "commandFlagObserved": _as_mapping(source_row.get("successEvaluation")).get("commandFlagObserved"),
            },
            "sourceHashes": {
                "taxonomyRowHash": _hash_value(source_row),
                "empiricalProbeHash": _hash_value(probe) if probe else None,
                "scenarioContractHash": _hash_value(contract) if contract else None,
            },
        }
        rows.append(ledger_row)
    return rows


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items()))


def _nested_counts(rows: Iterable[Mapping[str, Any]], key_a: str, key_b: str) -> dict[str, dict[str, int]]:
    nested: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        nested[str(row.get(key_a))][str(row.get(key_b))] += 1
    return {key: _counter_dict(value) for key, value in sorted(nested.items())}


def _secondary_counts(rows: Iterable[Mapping[str, Any]]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for row in rows:
        for item in _as_list(row.get("secondaryClasses")):
            counter[str(item)] += 1
    return _counter_dict(counter)


def _claim_flags() -> dict[str, bool]:
    return {
        "phase93S2R3_2Allowed": True,
        "bt93s2FreshRecheckAllowed": False,
        "phase93S2_4Allowed": False,
        "bt93tClaimable": False,
        "bt93uClaimable": False,
        "bt93vClaimable": False,
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


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newOptimizerUpdates": 0,
        "newTrainingEpisodes": 0,
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


def build_report() -> dict[str, Any]:
    failure_taxonomy = _read_json(S2R2_FAILURE_TAXONOMY_PATH)
    empirical_gate = _read_json(S2R2_EMPIRICAL_GATE_PATH)
    closure = _read_json(S2R2_CLOSURE_PATH)
    matrix_contract = _read_json(S2R_MATRIX_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(
        item["exists"] and item["isFile"] and item["fresh"] for item in source_artifacts if item["required"]
    )
    source_files_versioned = all(item["tracked"] for item in source_artifacts if item["required"])
    ledger_rows = _ledger_rows(failure_taxonomy, empirical_gate, matrix_contract)
    primary_counts = Counter(str(row.get("primaryClass")) for row in ledger_rows)
    scenario_counts = Counter(str(row.get("scenarioId")) for row in ledger_rows)
    action_counts = Counter(str(row.get("actionName")) for row in ledger_rows)
    retained_invalid_count = sum(
        1 for row in ledger_rows if _as_mapping(row.get("retainedV2Status")).get("rowIsRetainedV2MeasurementInvalid")
    )
    sample_counts = {
        "failureLedgerRowCount": len(ledger_rows),
        "sourceTaxonomyFailureRowCount": _get(failure_taxonomy, "sampleCounts", "taxonomyFailureRowCount"),
        "sourceProbeCount": _get(closure, "sampleCounts", "sourceProbeCount"),
        "probeCount": _get(closure, "sampleCounts", "probeCount"),
        "scenarioCount": _get(closure, "sampleCounts", "scenarioCount"),
        "actionCount": _get(closure, "sampleCounts", "actionCount"),
        "predicateFailureCount": _get(closure, "sampleCounts", "predicateFailureCount"),
        "minimumWindowFailureCount": _get(closure, "sampleCounts", "minimumWindowFailureCount"),
        "measurementInvalidCount": _get(closure, "sampleCounts", "measurementInvalidCount"),
        "directionMismatchCount": _get(closure, "sampleCounts", "directionMismatchCount"),
        "escapeRightFairnessFailureCount": _get(closure, "sampleCounts", "escapeRightFairnessFailureCount"),
        "retainedV2MeasurementInvalidCount": _get(closure, "sampleCounts", "retainedV2MeasurementInvalidCount"),
        "ledgerRetainedV2MeasurementInvalidRows": retained_invalid_count,
        "neutralControlRequiredCount": _get(closure, "sampleCounts", "neutralControlRequiredCount"),
        "negativeControlFailedCount": _get(closure, "sampleCounts", "negativeControlFailedCount"),
        "newTrainingEpisodes": _get(closure, "sampleCounts", "newTrainingEpisodes"),
        "newOptimizerUpdates": _get(closure, "sampleCounts", "newOptimizerUpdates"),
        "holdoutEpisodes": _get(closure, "sampleCounts", "holdoutEpisodes"),
    }
    phase_coverage = {
        "93S2R3.1.1": bool(
            source_files_ready
            and source_files_versioned
            and closure.get("resultClass") == "measurement-invalid"
            and closure.get("opensNext") == []
            and closure.get("matrixId") == MATRIX_ID
            and closure.get("contractId") == CONTRACT_ID
            and closure.get("actionSurfaceId") == ACTION_SURFACE_ID
            and closure.get("decoderHash") == DECODER_HASH
            and _git_output(["git", "rev-parse", "HEAD"])
        ),
        "93S2R3.1.2": bool(
            len(ledger_rows) == EXPECTED_LEDGER_ROWS
            and all(
                row.get("sessionReplayId")
                and row.get("startMetricsHash")
                and row.get("warmupKey")
                and row.get("expectedDirection")
                and row.get("retainedV2Status")
                and row.get("primaryClass")
                for row in ledger_rows
            )
        ),
        "93S2R3.1.3": True,
    }
    ok = all(phase_coverage.values())
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r3-failure-ledger-report-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": RESULT_CLASS if ok else "measurement-invalid",
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "repairContractId": REPAIR_CONTRACT_ID,
        "actionSurfaceId": ACTION_SURFACE_ID,
        "decoderHash": DECODER_HASH,
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResult": {
            "s2r2ClosureResultClass": closure.get("resultClass"),
            "s2r2ClosureOk": closure.get("ok"),
            "s2r2OpensNext": closure.get("opensNext"),
            "s2r2ActiveBlockers": closure.get("activeBlockers"),
        },
        "sampleCounts": sample_counts,
        "primaryClassCounts": _counter_dict(primary_counts),
        "secondaryClassCounts": _secondary_counts(ledger_rows),
        "failureCountsByScenario": _counter_dict(scenario_counts),
        "failureCountsByAction": _counter_dict(action_counts),
        "failureCountsByScenarioAndPrimaryClass": _nested_counts(ledger_rows, "scenarioId", "primaryClass"),
        "failureLedgerRows": ledger_rows,
        "failureLedgerHash": _hash_value({"rows": ledger_rows}),
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(),
        "guardrails": _guardrails(),
        "allowNext": ["93S2R3.2 Replay-Determinismus und Predicate-/Window-Fail-Fast"],
        "opensNext": [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A",
                "reason": "S2R3.1 is only a source-lock and failure-ledger phase; empirical zero-count gates do not exist yet.",
                "active": True,
            },
            {
                "scope": "training, reward, telemetry, ActionSurface, runtime, candidate, freeze, holdout, promote, rollout, PPO-Validate, BT95",
                "reason": "BT93S2R3 non-goals forbid these paths; newTrainingEpisodes and holdoutEpisodes remain zero.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R3.2 replay determinism and predicate/window fail-fast preflight.",
            "Do not start a fresh BT93S2.3-Recheck, 93S2.4 or downstream BT93T/U/W/O/P/94A before 93S2R3.99 is green.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r3_failure_ledger.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r3_replay_predicate_window_preflight.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    primary_counts = _as_mapping(report.get("primaryClassCounts"))
    secondary_counts = _as_mapping(report.get("secondaryClassCounts"))
    source_artifacts = _as_list(report.get("sourceArtifacts"))
    source_rows = "\n".join(
        f"- `{source.get('path')}`: role=`{source.get('role')}`, resultClass=`{source.get('resultClass')}`, "
        f"ok=`{source.get('ok')}`, sha256=`{source.get('sha256')}`"
        for source in source_artifacts
        if isinstance(source, Mapping)
    )
    primary_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in primary_counts.items())
    secondary_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in secondary_counts.items())
    return f"""# Fehlerbericht: BT93S2R3 Measurement-Reentry erforderlich

## Aufgabe/Kontext

- Task: `93S2R3.1`
- Quelle: `BT93S2R2.99=measurement-invalid`, `opensNext=[]`
- Ziel: Source-Lock und eigenes Failure-Ledger fuer den engen S2R3-Messgueltigkeits-Reentry.

## Source-Lock

{source_rows}

Git-SHA: `{_as_mapping(report.get('git')).get('sha')}`
MatrixId: `{report.get('matrixId')}`
ContractId: `{report.get('contractId')}`
ActionSurfaceId: `{report.get('actionSurfaceId')}`
Decoder-Hash: `{report.get('decoderHash')}`

## Ledger-Befund

- Failure-Ledger-Rows: `{counts.get('failureLedgerRowCount')}`
- Probes: `{counts.get('probeCount')}`
- Predicate-Fails: `{counts.get('predicateFailureCount')}`
- Minimum-Window-Fails: `{counts.get('minimumWindowFailureCount')}`
- Measurement-Invalid: `{counts.get('measurementInvalidCount')}`
- Direction-Mismatches: `{counts.get('directionMismatchCount')}`
- Escape-Right-Fairness-Fails: `{counts.get('escapeRightFairnessFailureCount')}`
- Retained-v2-Measurement-Invalid: `{counts.get('retainedV2MeasurementInvalidCount')}`
- Neutral-Control-Required: `{counts.get('neutralControlRequiredCount')}`
- Training/Holdout/Optimizer: `0/0/0`

## Primaerklassen

{primary_rows}

## Sekundaerklassen

{secondary_rows}

## Bewertung

`93S2R3.1` ist nur Source-Lock und Ledger. Der Blocker ist nicht geloest:
`BT93S2.3-Recheck`, `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate, BT95 und Runtime bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r3/failure_ledger_report.json`
- Command: `python python/scripts/bt93s2r3_failure_ledger.py --write-report`

## Naechster Schritt

`93S2R3.2` muss Replay-Determinismus, StartMetrics, Warmup, Predicate und
Minimum-Window vor jeder Action-Wirkung fail-fast pruefen. Erst ein spaeteres
gruener `93S2R3.99` darf maximal einen frischen `BT93S2.3-Recheck` oeffnen.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_text(DOC_PATH, _markdown(report))
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "sampleCounts": report["sampleCounts"],
                "primaryClassCounts": report["primaryClassCounts"],
                "secondaryClassCounts": report["secondaryClassCounts"],
                "phaseCoverage": report["phaseCoverage"],
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
