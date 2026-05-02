"""BT93S2R3.4 retained-v2/full-scenario empirical zero gate.

This phase reruns the full 9-scenario/13-action matrix with the locked S2R5
seed/start-state replacements materialized for repaired rows. It is
diagnostic-only: no PPO training, holdout use, reward, telemetry, action
surface, runtime, registry, strategy, or matchstart changes.
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

import bt93s2r2_empirical_reentry_gate as s2r2_empirical  # noqa: E402
import bt93s2r3_direction_fairness_neutral_contract as direction_contract  # noqa: E402
import bt93s2r3_failure_ledger as failure_ledger  # noqa: E402
import bt93s2r4_full_replay_preflight_gate as s2r4_full_gate  # noqa: E402
import bt93s2r5_predicate_preaction_empirical_gate as s2r5_empirical  # noqa: E402
import bt93s2r5_predicate_preaction_repair as s2r5_repair  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)


BLOCK_ID = "BT93S2R3"
PHASE_ID = "93S2R3.4"
GREEN_RESULT = "matrix-control-reentry-green"
ROW_GREEN_RESULT = "matrix-control-empirical-row-green"
EXPECTED_SCENARIO_COUNT = 9
EXPECTED_ACTION_COUNT = 13
EXPECTED_PROBE_COUNT = 338
EXPECTED_REPAIRED_ROW_COUNT = 33
EXPECTED_DIRECTION_CONTRACT_ROW_COUNT = 103
EXPECTED_FULL_REPLAY_ATTEMPT_COUNT = 309

REPORT_PATH = failure_ledger.BT93S2R3_ROOT / "empirical_zero_gate_report.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r3_measurement_reentry_required.md"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r3_empirical_zero_gate.py"

ALLOWED_RESULT_CLASSES = {
    GREEN_RESULT,
    "replay-determinism-required",
    "predicate-window-required",
    "direction-contract-required",
    "escape-right-fairness-required",
    "retained-v2-measurement-required",
    "neutral-control-required",
    "action-surface-lineage-invalidated",
    "measurement-invalid",
}

FORBIDDEN_DOWNSTREAM = [
    "BT93S2.3-Recheck before BT93S2R3.99 writes matrix-control-reentry-green",
    "93S2.4 start before fresh BT93S2.3-Recheck writes measurementValid=true",
    "BT93T claim before fresh S2-Recheck opens observation telemetry",
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
    "reward fix from BT93S2R3.4",
    "telemetry fix from BT93S2R3.4",
    "action-surface change from BT93S2R3.4",
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


def _hash_value(value: Any) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")).hexdigest()


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


def _field(mapping: Mapping[str, Any], dotted_path: str) -> Any:
    current: Any = mapping
    for part in dotted_path.split("."):
        if not isinstance(current, Mapping):
            return None
        current = current.get(part)
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
    source_key: str,
    path: Path,
    role: str,
    expected_fields: Mapping[str, Any] | None = None,
    *,
    required: bool = True,
) -> dict[str, Any]:
    payload = _read_json(path)
    expected_fields = dict(expected_fields or {})
    tracked = _rel(path) in _tracked_files([path])
    actual_fields = {key: _field(payload, key) for key in expected_fields}
    expected_ok = all(_expected_matches(actual_fields.get(key), expected) for key, expected in expected_fields.items())
    exists = path.exists()
    is_file = path.is_file()
    return {
        "sourceKey": source_key,
        "path": _rel(path),
        "role": role,
        "required": required,
        "exists": exists,
        "isFile": is_file,
        "tracked": tracked,
        "fresh": bool(exists and is_file),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "reportHash": payload.get("reportHash") if payload else None,
        "expectedFields": expected_fields,
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    return [
        _source_artifact(
            "s2r3DirectionFairnessNeutralContract",
            direction_contract.REPORT_PATH,
            "BT93S2R3.3 green direction/fairness/neutral source",
            {
                "resultClass": "direction-fairness-neutral-contract-green",
                "ok": True,
                "sampleCounts.directionContractRowCount": EXPECTED_DIRECTION_CONTRACT_ROW_COUNT,
                "sampleCounts.predicateFailureCount": 0,
                "sampleCounts.minimumWindowFailureCount": 0,
                "sampleCounts.measurementInvalidBeforeActionCount": 0,
                "sampleCounts.escapeRightFairnessFailureCount": 0,
                "sampleCounts.neutralControlRequiredCount": 0,
                "sampleCounts.rewardOrCommandSuccessAllowedCount": 0,
            },
        ),
        _source_artifact(
            "s2r4FullReplayPreflight",
            s2r4_full_gate.REPORT_PATH,
            "BT93S2R4.5 green replay/startstate source",
            {
                "resultClass": "replay-startstate-green",
                "ok": True,
                "sampleCounts.replayAttemptCount": EXPECTED_FULL_REPLAY_ATTEMPT_COUNT,
                "sampleCounts.predicateFailureCount": 0,
                "sampleCounts.minimumWindowFailureCount": 0,
                "sampleCounts.measurementInvalidBeforeActionCount": 0,
                "sampleCounts.replaySpecIdRepeatMismatchCount": 0,
                "sampleCounts.startMetricsHashRepeatMismatchCount": 0,
                "sampleCounts.warmupKeyRepeatMismatchCount": 0,
                "sampleCounts.sessionIdDriftCount": 0,
            },
        ),
        _source_artifact(
            "s2r5EmpiricalPredicatePreactionGate",
            s2r5_empirical.REPORT_PATH,
            "BT93S2R5.4 green repaired predicate/pre-action source",
            {
                "resultClass": "predicate-window-repair-green",
                "ok": True,
                "sampleCounts.replayAttemptCount": EXPECTED_FULL_REPLAY_ATTEMPT_COUNT,
                "sampleCounts.predicateFailureCount": 0,
                "sampleCounts.measurementInvalidBeforeActionCount": 0,
                "sampleCounts.minimumWindowFailureCount": 0,
            },
        ),
        _source_artifact(
            "s2r5SeedStartStateRepair",
            s2r5_repair.REPORT_PATH,
            "BT93S2R5.3 materialized seed/start-state repair",
            {
                "resultClass": "predicate-preaction-repair-applied",
                "ok": True,
                "sampleCounts.repairedRowCount": EXPECTED_REPAIRED_ROW_COUNT,
                "sampleCounts.predicateChangedCount": 0,
                "sampleCounts.warmupChangedCount": 0,
            },
        ),
        _source_artifact(
            "s2r3FailureLedger",
            failure_ledger.REPORT_PATH,
            "BT93S2R3.1 failure-ledger source",
            {
                "resultClass": "source-lock-failure-ledger-written",
                "ok": True,
                "sampleCounts.failureLedgerRowCount": EXPECTED_DIRECTION_CONTRACT_ROW_COUNT,
                "sampleCounts.probeCount": EXPECTED_PROBE_COUNT,
            },
        ),
        _source_artifact(
            "s2r2EmpiricalMatrixSource",
            s2r2_empirical.REPORT_PATH,
            "BT93S2R2 red full matrix source; context only",
            {
                "sampleCounts.scenarioCount": EXPECTED_SCENARIO_COUNT,
                "sampleCounts.actionCount": EXPECTED_ACTION_COUNT,
                "sampleCounts.probeCount": EXPECTED_PROBE_COUNT,
            },
        ),
        _source_artifact(
            "actionSurfaceDecoder",
            ACTION_SURFACE_PATH,
            "read-only PPO action-surface decoder",
            {},
        ),
        _source_artifact(
            "empiricalZeroGateScript",
            SCRIPT_PATH,
            "BT93S2R3.4 report generator",
            {},
            required=False,
        ),
    ]


def _source_files_ready(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(
        item.get("exists") is True
        and item.get("isFile") is True
        and item.get("fresh") is True
        and item.get("expectedOk") is True
        for item in source_artifacts
        if item.get("required") is True
    )


def _source_files_versioned(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(item.get("tracked") is True for item in source_artifacts if item.get("required") is True)


def _source_result_classes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("resultClass")
        for item in source_artifacts
        if item.get("sourceKey")
    }


def _repair_rows_by_old_key(repair_report: Mapping[str, Any]) -> dict[tuple[str, int, str], Mapping[str, Any]]:
    result: dict[tuple[str, int, str], Mapping[str, Any]] = {}
    for row in _as_list(repair_report.get("repairedRows")):
        if not isinstance(row, Mapping):
            continue
        try:
            old_seed = int(row.get("oldSeed"))
        except (TypeError, ValueError):
            continue
        result[(str(row.get("scenarioId") or ""), old_seed, str(row.get("actionName") or ""))] = row
    return result


def _materialized_matrix_rows(
    repair_contract: Mapping[str, Any],
    repair_report: Mapping[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Mapping[str, Any]]]:
    repairs = _repair_rows_by_old_key(repair_report)
    actions = [(str(name), index) for index, (name, _flags) in enumerate(MASKED_SEMANTIC_ACTIONS)]
    rows: list[dict[str, Any]] = []
    scenarios: dict[str, Mapping[str, Any]] = {}
    row_index = 0
    for repair in s2r2_empirical._scenario_repairs(repair_contract):
        scenario = _as_mapping(repair.get("repairedScenarioContract"))
        scenario_id = str(scenario.get("id") or repair.get("scenarioId") or "")
        if not scenario_id:
            continue
        scenarios[scenario_id] = scenario
        for source_seed in s2r2_empirical._scenario_seed_list(scenario):
            try:
                old_seed = int(source_seed)
            except (TypeError, ValueError):
                continue
            for action_name, action_token in actions:
                repair_row = repairs.get((scenario_id, old_seed, action_name))
                run_seed = int(repair_row.get("newSeed")) if repair_row else old_seed
                replay_payload = {
                    "matrixId": s2r2_empirical.MATRIX_ID,
                    "contractId": s2r2_empirical.CONTRACT_ID,
                    "phaseId": PHASE_ID,
                    "scenarioId": scenario_id,
                    "sourceSeed": old_seed,
                    "seed": run_seed,
                    "actionName": action_name,
                    "actionToken": action_token,
                    "repairedByS2R5": bool(repair_row),
                    "repairGroupId": repair_row.get("groupId") if repair_row else None,
                }
                rows.append(
                    {
                        "matrixRowIndex": row_index,
                        "scenarioId": scenario_id,
                        "seed": run_seed,
                        "sourceSeed": old_seed,
                        "actionName": action_name,
                        "actionToken": action_token,
                        "repairedByS2R5": bool(repair_row),
                        "sourceOldSeed": repair_row.get("oldSeed") if repair_row else None,
                        "sourceRepairClass": repair_row.get("primaryRepairClass") if repair_row else None,
                        "repairGroupId": repair_row.get("groupId") if repair_row else None,
                        "expectedStartMetricsHash": repair_row.get("newStartMetricsHash") if repair_row else None,
                        "expectedWarmupKey": repair_row.get("newWarmupKey") if repair_row else None,
                        "replaySpecId": f"bt93s2r3-empirical-{_hash_value(replay_payload)[:24]}",
                        "replaySpecPayload": replay_payload,
                    }
                )
                row_index += 1
    return rows, scenarios


def _run_payload(contract_row: Mapping[str, Any], scenario: Mapping[str, Any], probe: Mapping[str, Any]) -> dict[str, Any]:
    scenario_id = str(contract_row.get("scenarioId") or "")
    seed = int(contract_row.get("seed") or 0)
    action_name = str(contract_row.get("actionName") or "")
    start_metrics = _as_mapping(probe.get("startMetrics"))
    start_metrics_hash = _hash_value(start_metrics)
    warmup_payload = s2r5_empirical.stable_replay.reset_repair._warmup_payload(
        scenario_id, seed, action_name, scenario
    )
    warmup_key = _hash_value(warmup_payload)
    predicate = _as_mapping(probe.get("v3Predicate"))
    expected_start = contract_row.get("expectedStartMetricsHash")
    expected_warmup = contract_row.get("expectedWarmupKey")
    legacy_row = s2r2_empirical._probe_row(scenario, probe)
    measurement_invalid = s2r5_empirical.stable_replay._probe_invalid_before_action(probe)
    return {
        "replaySpecId": contract_row.get("replaySpecId"),
        "startMetricsHash": start_metrics_hash,
        "warmupKey": warmup_key,
        "expectedStartMetricsHash": expected_start,
        "expectedWarmupKey": expected_warmup,
        "startMetricsHashMatchesRepair": True if not expected_start else start_metrics_hash == expected_start,
        "warmupKeyMatchesRepair": True if not expected_warmup else warmup_key == expected_warmup,
        "predicate": {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": s2r5_empirical.ledger.PREDICATE_FUNCTION,
            "pass": predicate.get("pass"),
            "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement"),
        },
        "minimumWindow": {
            "completed": probe.get("completedMinimumWindow"),
            "observedSteps": probe.get("observedSteps"),
            "minimumCompletedSteps": s2r5_empirical.stable_replay._minimum_completed_steps(scenario),
            "requestedRepeatSteps": probe.get("requestedRepeatSteps"),
        },
        "warmup": {
            "warmupAction": warmup_payload.get("warmupAction"),
            "warmupSteps": warmup_payload.get("warmupSteps"),
            "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
        },
        "preActionValidity": {
            "ok": probe.get("ok"),
            "predicatePass": predicate.get("pass"),
            "completedMinimumWindow": probe.get("completedMinimumWindow"),
            "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
            "measurementInvalidBeforeAction": measurement_invalid,
        },
        "legacyActionEffectContext": {
            "directionMismatch": legacy_row.get("directionMismatch"),
            "counterDirectionSuccess": legacy_row.get("counterDirectionSuccess"),
            "negativeControlFailed": legacy_row.get("negativeControlFailed"),
            "successEvaluation": legacy_row.get("successEvaluation"),
        },
        "probeError": probe.get("error"),
    }


def _row_result(
    contract_row: Mapping[str, Any],
    scenario: Mapping[str, Any] | None,
    *,
    escape_positive_actions: set[str],
    neutral_source_ok: bool,
) -> dict[str, Any]:
    scenario_id = str(contract_row.get("scenarioId") or "")
    seed = int(contract_row.get("seed") or 0)
    action_name = str(contract_row.get("actionName") or "")
    if not scenario:
        return {
            "matrixRowIndex": contract_row.get("matrixRowIndex"),
            "scenarioId": scenario_id,
            "seed": seed,
            "sourceSeed": contract_row.get("sourceSeed"),
            "actionName": action_name,
            "actionToken": contract_row.get("actionToken"),
            "resultClass": "measurement-invalid",
            "issues": ["scenario-contract-missing"],
            "blockingClasses": ["measurement-invalid"],
            "probeRun": {},
        }
    repeat_steps = s2r5_empirical.stable_replay._repeat_steps(scenario)
    probe = s2r2_empirical.v3_recheck._run_probe_v3(
        scenario,
        seed=seed,
        action_name=action_name,
        repeat_steps=repeat_steps,
    )
    run = _run_payload(contract_row, scenario, probe)
    validity = _as_mapping(run.get("preActionValidity"))
    issues: list[str] = []
    if run.get("probeError"):
        issues.append("probe-error")
    if validity.get("ok") is not True:
        issues.append("probe-ok-false")
    if validity.get("predicatePass") is not True:
        issues.append("predicate-fail")
    if validity.get("completedMinimumWindow") is not True:
        issues.append("minimum-window-fail")
    if validity.get("warmupTerminalBeforeAction") is True:
        issues.append("warmup-terminal-before-action")
    if validity.get("measurementInvalidBeforeAction") is True:
        issues.append("measurement-invalid-before-action")
    if contract_row.get("repairedByS2R5") is True:
        if run.get("startMetricsHashMatchesRepair") is not True:
            issues.append("repaired-startMetricsHash-mismatch")
        if run.get("warmupKeyMatchesRepair") is not True:
            issues.append("repaired-warmupKey-mismatch")
    retained_v2_row = scenario_id in s2r2_empirical.RETAINED_V2_SCENARIOS
    if retained_v2_row and validity.get("measurementInvalidBeforeAction") is True:
        issues.append("retained-v2-measurement-invalid")
    escape_right_positive_control = scenario_id == "escape-right-open" and action_name in escape_positive_actions
    if escape_right_positive_control and validity.get("measurementInvalidBeforeAction") is True:
        issues.append("escape-right-positive-control-not-measurable")
    neutral_control_required = scenario_id == "no-danger-control" and (
        validity.get("measurementInvalidBeforeAction") is True or neutral_source_ok is not True
    )
    if neutral_control_required:
        issues.append("neutral-control-required")
    legacy = _as_mapping(run.get("legacyActionEffectContext"))
    negative_control_failed = bool(legacy.get("negativeControlFailed"))
    if negative_control_failed:
        issues.append("negative-control-fail")

    issues = sorted(set(issues))
    if any(item in issues for item in ("probe-error", "probe-ok-false")):
        result_class = "measurement-invalid"
    elif any(item in issues for item in ("repaired-startMetricsHash-mismatch", "repaired-warmupKey-mismatch")):
        result_class = "replay-determinism-required"
    elif "warmup-terminal-before-action" in issues:
        result_class = "predicate-window-required"
    elif "retained-v2-measurement-invalid" in issues:
        result_class = "retained-v2-measurement-required"
    elif "neutral-control-required" in issues:
        result_class = "neutral-control-required"
    elif "escape-right-positive-control-not-measurable" in issues:
        result_class = "escape-right-fairness-required"
    elif any(item in issues for item in ("predicate-fail", "minimum-window-fail", "measurement-invalid-before-action")):
        result_class = "predicate-window-required"
    elif "negative-control-fail" in issues:
        result_class = "measurement-invalid"
    else:
        result_class = ROW_GREEN_RESULT
    blocking_classes = [] if result_class == ROW_GREEN_RESULT else [result_class]
    return {
        "matrixRowIndex": contract_row.get("matrixRowIndex"),
        "scenarioId": scenario_id,
        "seed": seed,
        "sourceSeed": contract_row.get("sourceSeed"),
        "actionName": action_name,
        "actionToken": contract_row.get("actionToken"),
        "repairedByS2R5": contract_row.get("repairedByS2R5") is True,
        "sourceOldSeed": contract_row.get("sourceOldSeed"),
        "sourceRepairClass": contract_row.get("sourceRepairClass"),
        "repairGroupId": contract_row.get("repairGroupId"),
        "retainedV2Scenario": retained_v2_row,
        "escapeRightPositiveControl": escape_right_positive_control,
        "neutralControlRequired": neutral_control_required,
        "negativeControlFailed": negative_control_failed,
        "directionJudgementProduced": False,
        "actionQualityJudgementProduced": False,
        "legacyDirectionMismatchContext": bool(
            legacy.get("directionMismatch") is True or legacy.get("counterDirectionSuccess") is True
        ),
        "resultClass": result_class,
        "blockingClasses": blocking_classes,
        "issues": issues,
        "predicatePass": validity.get("predicatePass") is True,
        "completedMinimumWindow": validity.get("completedMinimumWindow") is True,
        "warmupTerminalBeforeAction": validity.get("warmupTerminalBeforeAction") is True,
        "measurementInvalidBeforeAction": validity.get("measurementInvalidBeforeAction") is True,
        "startMetricsHashMatchesRepair": run.get("startMetricsHashMatchesRepair"),
        "warmupKeyMatchesRepair": run.get("warmupKeyMatchesRepair"),
        "probeRun": run,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "fullScenarioEmpiricalGateOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newOptimizerUpdates": 0,
        "newTrainingEpisodes": 0,
        "newEvalRunStarted": False,
        "holdoutUsed": False,
        "holdoutEpisodes": 0,
        "candidateRun": False,
        "freezeCandidate": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "actionQualityJudgementProduced": False,
        "actionSpaceJudgementProduced": False,
        "qualityClaimAllowed": False,
    }


def _claim_flags(green: bool) -> dict[str, bool]:
    return {
        "phase93S2R3_4Closed": green,
        "phase93S2R3_99Allowed": green,
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
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignalAllowed": False,
        "bt95HandoffAllowed": False,
        "ppoTrainingAllowed": False,
        "rewardChangeAllowed": False,
        "telemetryChangeAllowed": False,
        "runtimeChangeAllowed": False,
        "actionSurfaceChangeAllowed": False,
        "envConditionalWriteAllowed": False,
        "runnerConditionalWriteAllowed": False,
    }


def _result_class(counts: Mapping[str, Any], *, source_ok: bool, guardrails_ok: bool) -> str:
    if not source_ok or not guardrails_ok:
        return "measurement-invalid"
    if counts.get("actionSurfaceLineageInvalidatedCount") != 0:
        return "action-surface-lineage-invalidated"
    if (
        counts.get("probeCount") != EXPECTED_PROBE_COUNT
        or counts.get("scenarioCount") != EXPECTED_SCENARIO_COUNT
        or counts.get("actionCount") != EXPECTED_ACTION_COUNT
    ):
        return "measurement-invalid"
    if counts.get("probeErrorCount") != 0:
        return "measurement-invalid"
    if counts.get("predicateFailureCount") != 0 or counts.get("minimumWindowFailureCount") != 0:
        return "predicate-window-required"
    if counts.get("measurementInvalidCount") != 0 or counts.get("warmupTerminalBeforeActionCount") != 0:
        return "predicate-window-required"
    if counts.get("directionMismatchCount") != 0:
        return "direction-contract-required"
    if counts.get("escapeRightFairnessFailureCount") != 0:
        return "escape-right-fairness-required"
    if counts.get("retainedV2MeasurementInvalidCount") != 0:
        return "retained-v2-measurement-required"
    if counts.get("neutralControlRequiredCount") != 0:
        return "neutral-control-required"
    if counts.get("negativeControlFailedCount") != 0:
        return "measurement-invalid"
    return GREEN_RESULT


def _phase_coverage(
    *,
    counts: Mapping[str, Any],
    result_class: str,
    source_files_ready: bool,
    source_files_versioned: bool,
    claim_flags: Mapping[str, Any],
) -> dict[str, Any]:
    zero_gate = bool(
        counts.get("predicateFailureCount") == 0
        and counts.get("minimumWindowFailureCount") == 0
        and counts.get("measurementInvalidCount") == 0
        and counts.get("directionMismatchCount") == 0
        and counts.get("escapeRightFairnessFailureCount") == 0
        and counts.get("retainedV2MeasurementInvalidCount") == 0
        and counts.get("neutralControlRequiredCount") == 0
        and counts.get("negativeControlFailedCount") == 0
        and counts.get("newTrainingEpisodes") == 0
        and counts.get("holdoutEpisodes") == 0
    )
    return {
        "93S2R3.4.1": bool(
            counts.get("retainedV2ScenarioCount") == len(s2r2_empirical.RETAINED_V2_SCENARIOS)
            and counts.get("retainedV2ProbeCount", 0) > 0
            and counts.get("sourceDirectionContractGreen") is True
        ),
        "93S2R3.4.2": bool(
            counts.get("scenarioCount") == EXPECTED_SCENARIO_COUNT
            and counts.get("actionCount") == EXPECTED_ACTION_COUNT
            and counts.get("probeCount", 0) >= EXPECTED_PROBE_COUNT
        ),
        "93S2R3.4.3": zero_gate,
        "DoD.S2R3-7": bool(counts.get("retainedV2MeasurementInvalidCount") == 0),
        "DoD.S2R3-9": zero_gate,
        "DoD.S2R3-10": "pending-93S2R3.99",
        "DoD.S2R3-11": "pending-93S2R3.99",
        "DoD.S2R3-12": "pending-meta-gate",
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "nextPhaseOnly": bool(result_class == GREEN_RESULT and claim_flags.get("phase93S2R3_99Allowed") is True),
    }


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    counts = _as_mapping(report.get("sampleCounts"))
    section = f"""<!-- BT93S2R3.4-START -->
## 93S2R3.4 Retained-v2-Quarantaene und Full-Scenario Empirical Gate

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Full Matrix: `{counts.get('scenarioCount')}` scenarios x `{counts.get('actionCount')}` actions = `{counts.get('probeCount')}` probes
- Repaired S2R5 Rows materialisiert: `{counts.get('repairedRowCount')}` / `{counts.get('expectedRepairedRowCount')}`
- Null-Counts: predicate=`{counts.get('predicateFailureCount')}`, window=`{counts.get('minimumWindowFailureCount')}`, measurement=`{counts.get('measurementInvalidCount')}`, direction=`{counts.get('directionMismatchCount')}`, retainedV2=`{counts.get('retainedV2MeasurementInvalidCount')}`, neutral=`{counts.get('neutralControlRequiredCount')}`, negative=`{counts.get('negativeControlFailedCount')}`
- Training/Holdout/Optimizer: `{counts.get('newTrainingEpisodes')}` / `{counts.get('holdoutEpisodes')}` / `{counts.get('newOptimizerUpdates')}`

S2R3.4 belegt nur Messgueltigkeit auf der vollen Matrix. `BT93S2.3-Recheck`,
`93S2.4`, Training, Candidate, Freeze, Holdout, Promote, Rollout und
PPO-Validate bleiben bis `BT93S2R3.99=matrix-control-reentry-green` geschlossen.

Evidence:

- `data/training/ppo/bt93s2r3/empirical_zero_gate_report.json`
- Command: `python python/scripts/bt93s2r3_empirical_zero_gate.py --write-report`
<!-- BT93S2R3.4-END -->
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        text = path.read_text(encoding="utf-8")
    else:
        text = "# Fehlerbericht: BT93S2R3 Measurement-Reentry erforderlich\n"
    start = "<!-- BT93S2R3.4-START -->"
    end = "<!-- BT93S2R3.4-END -->"
    if start in text and end in text:
        before = text[: text.index(start)].rstrip()
        after = text[text.index(end) + len(end) :].lstrip()
        text = f"{before}\n\n{section.rstrip()}\n"
        if after:
            text += f"\n{after}"
    else:
        text = f"{text.rstrip()}\n\n{section.rstrip()}\n"
    path.write_text(text, encoding="utf-8")


def build_report(*, row_limit: int | None = None) -> dict[str, Any]:
    repair_contract = _read_json(s2r2_empirical.REPAIR_CONTRACT_PATH)
    repair_report = _read_json(s2r5_repair.REPORT_PATH)
    direction_report = _read_json(direction_contract.REPORT_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = _source_files_ready(source_artifacts)
    source_files_versioned = _source_files_versioned(source_artifacts)
    full_rows, scenarios = _materialized_matrix_rows(repair_contract, repair_report)
    if row_limit is not None:
        full_rows = full_rows[: max(0, int(row_limit))]

    escape_contract = _as_mapping(direction_report.get("escapeRightFairnessContract"))
    neutral_contract = _as_mapping(direction_report.get("neutralControlContract"))
    escape_positive_actions = {str(item) for item in _as_list(escape_contract.get("positiveControlActions"))}
    neutral_source_ok = bool(
        neutral_contract.get("neutralControlRequiredCount") == 0
        and neutral_contract.get("actionGreenProduced") is False
        and neutral_contract.get("directionGreenProduced") is False
    )

    row_results = [
        _row_result(
            row,
            scenarios.get(str(row.get("scenarioId") or "")),
            escape_positive_actions=escape_positive_actions,
            neutral_source_ok=neutral_source_ok,
        )
        for row in full_rows
    ]
    scenario_ids = {str(row.get("scenarioId")) for row in row_results}
    action_names = {str(row.get("actionName")) for row in row_results}
    row_class_counts = Counter(str(row.get("resultClass")) for row in row_results)
    issue_counts: Counter[str] = Counter()
    for row in row_results:
        issue_counts.update(str(item) for item in _as_list(row.get("issues")))

    guardrails = _guardrails()
    guardrails_ok = bool(
        guardrails["diagnosticOnly"]
        and not guardrails["trainingStarted"]
        and not guardrails["holdoutUsed"]
        and not guardrails["actionSurfaceChanged"]
        and not guardrails["productiveRuntimeChanged"]
    )
    expected_decoder_hash = failure_ledger.DECODER_HASH
    actual_action_surface_hash = _sha256_file(ACTION_SURFACE_PATH)
    source_direction_green = bool(
        direction_report.get("resultClass") == "direction-fairness-neutral-contract-green"
        and direction_report.get("ok") is True
    )
    sample_counts = {
        "scenarioCount": len(scenario_ids),
        "expectedScenarioCount": EXPECTED_SCENARIO_COUNT,
        "actionCount": len(action_names),
        "expectedActionCount": EXPECTED_ACTION_COUNT,
        "probeCount": len(row_results),
        "expectedProbeCount": EXPECTED_PROBE_COUNT,
        "sourceDirectionContractGreen": source_direction_green,
        "sourceDirectionContractRowCount": _get(direction_report, "sampleCounts", "directionContractRowCount"),
        "sourceFullReplayAttemptCount": _get(direction_report, "sampleCounts", "sourceFullReplayAttemptCount"),
        "repairedRowCount": sum(1 for row in row_results if row.get("repairedByS2R5") is True),
        "expectedRepairedRowCount": EXPECTED_REPAIRED_ROW_COUNT,
        "retainedV2ScenarioCount": len({row.get("scenarioId") for row in row_results if row.get("retainedV2Scenario")}),
        "retainedV2ProbeCount": sum(1 for row in row_results if row.get("retainedV2Scenario") is True),
        "escapeRightPositiveControlProbeCount": sum(
            1 for row in row_results if row.get("escapeRightPositiveControl") is True
        ),
        "predicateFailureCount": sum(1 for row in row_results if row.get("predicatePass") is not True),
        "minimumWindowFailureCount": sum(1 for row in row_results if row.get("completedMinimumWindow") is not True),
        "measurementInvalidCount": sum(1 for row in row_results if row.get("measurementInvalidBeforeAction") is True),
        "warmupTerminalBeforeActionCount": sum(
            1 for row in row_results if row.get("warmupTerminalBeforeAction") is True
        ),
        "directionMismatchCount": 0
        if source_direction_green
        else int(_get(direction_report, "sampleCounts", "directionJudgementProducedCount") or 0),
        "legacyDirectionMismatchContextCount": sum(
            1 for row in row_results if row.get("legacyDirectionMismatchContext") is True
        ),
        "directionJudgementProducedCount": 0,
        "actionQualityJudgementProducedCount": 0,
        "escapeRightFairnessFailureCount": sum(
            1
            for row in row_results
            if row.get("escapeRightPositiveControl") is True and row.get("measurementInvalidBeforeAction") is True
        ),
        "retainedV2MeasurementInvalidCount": sum(
            1 for row in row_results if row.get("retainedV2Scenario") is True and row.get("measurementInvalidBeforeAction") is True
        ),
        "neutralControlRequiredCount": sum(1 for row in row_results if row.get("neutralControlRequired") is True),
        "negativeControlFailedCount": sum(1 for row in row_results if row.get("negativeControlFailed") is True),
        "probeErrorCount": sum(1 for row in row_results if _get(row, "probeRun", "probeError")),
        "actionSurfaceLineageInvalidatedCount": 0 if actual_action_surface_hash == expected_decoder_hash else 1,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
        "rewardChangeCount": 0,
        "telemetryChangeCount": 0,
        "runtimeChangeCount": 0,
        "actionSurfaceChangeCount": 0,
    }
    result_class = _result_class(sample_counts, source_ok=source_files_ready and source_files_versioned, guardrails_ok=guardrails_ok)
    ok = bool(
        row_limit is None
        and result_class == GREEN_RESULT
        and result_class in ALLOWED_RESULT_CLASSES
        and all(row.get("resultClass") == ROW_GREEN_RESULT for row in row_results)
    )
    claim_flags = _claim_flags(ok)
    phase_coverage = _phase_coverage(
        counts=sample_counts,
        result_class=result_class,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        claim_flags=claim_flags,
    )
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r3-empirical-zero-gate-v1",
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
        "ok": ok,
        "matrixId": s2r2_empirical.MATRIX_ID,
        "contractId": s2r2_empirical.CONTRACT_ID,
        "repairContractId": failure_ledger.REPAIR_CONTRACT_ID,
        "actionSurfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "decoderHash": expected_decoder_hash,
        "actualActionSurfaceHash": actual_action_surface_hash,
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResultClasses": _source_result_classes(source_artifacts),
        "sourceLocks": {
            "s2r3DirectionReportHash": direction_report.get("reportHash"),
            "s2r5RepairRowsHash": repair_report.get("repairedRowsHash"),
            "s2r5RepairReportHash": repair_report.get("reportHash"),
        },
        "measurementContract": {
            "fullScenarioProbeCountMustBeAtLeast": EXPECTED_PROBE_COUNT,
            "scenarioCountMustBe": EXPECTED_SCENARIO_COUNT,
            "actionCountMustBe": EXPECTED_ACTION_COUNT,
            "retainedV2Scenarios": sorted(s2r2_empirical.RETAINED_V2_SCENARIOS),
            "predicateFailureCountMustBe": 0,
            "minimumWindowFailureCountMustBe": 0,
            "measurementInvalidCountMustBe": 0,
            "directionMismatchCountMustBe": 0,
            "escapeRightFairnessFailureCountMustBe": 0,
            "retainedV2MeasurementInvalidCountMustBe": 0,
            "neutralControlRequiredCountMustBe": 0,
            "negativeControlFailedCountMustBe": 0,
            "newTrainingEpisodesMustBe": 0,
            "holdoutEpisodesMustBe": 0,
            "directionJudgementProduced": False,
            "actionQualityJudgementProduced": False,
        },
        "sampleCounts": sample_counts,
        "rowResultCounts": dict(sorted(row_class_counts.items())),
        "issueCounts": dict(sorted(issue_counts.items())),
        "scenarioCounts": dict(sorted(Counter(str(row.get("scenarioId")) for row in row_results).items())),
        "repairSubstitutionCounts": dict(
            sorted(
                Counter(
                    f"{row.get('scenarioId')}:{row.get('sourceOldSeed')}->{row.get('seed')}"
                    for row in row_results
                    if row.get("repairedByS2R5") is True
                ).items()
            )
        ),
        "empiricalRows": row_results,
        "empiricalRowsHash": _hash_value({"rows": row_results}),
        "claimFlags": claim_flags,
        "guardrails": guardrails,
        "phaseCoverage": phase_coverage,
        "allowNext": ["93S2R3.99 Closure"] if ok else [],
        "opensNext": ["93S2R3.99 Closure"] if ok else [],
        "blocksNext": FORBIDDEN_DOWNSTREAM,
        "invalidations": [
            {
                "scope": "BT93S2.3-Recheck and 93S2.4",
                "active": True,
                "reason": "S2R3.4 can only open S2R3.99 closure; fresh S2-Recheck requires S2R3 closure green.",
            },
            {
                "scope": "training/candidate/freeze/holdout/promote/rollout/PPO-Validate",
                "active": True,
                "reason": "Empirical zero gate proves measurement validity only, not bot quality or runtime readiness.",
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R3.99 closure and write matrix-control-reentry-green only if this empirical report remains green.",
            "Keep BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, candidate, freeze, holdout, promote, rollout, PPO-Validate and BT95 closed until S2R3 closure.",
        ]
        if ok
        else [
            f"Stop and repair the narrow S2R3.4 blocker class {result_class}.",
            "Do not start BT93S2.3-Recheck, 93S2.4 or downstream phases while this empirical gate is red.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r3_empirical_zero_gate.py --write-report",
            "diagnosticRowLimit": "python python/scripts/bt93s2r3_empirical_zero_gate.py --row-limit 20",
            "nextPhase": "python python/scripts/bt93s2r3_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "phase gate executes 338 full-matrix probes; no PPO training or holdout consumption",
        },
        "actionSurface": build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93S2R3.4 empirical zero gate report.")
    parser.add_argument("--write-report", action="store_true", help="Write empirical gate JSON and Fehlerbericht section.")
    parser.add_argument("--row-limit", type=int, default=None, help="Diagnostic row limit; full closure requires 338 rows.")
    args = parser.parse_args()
    report = build_report(row_limit=args.row_limit)
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_doc_section(DOC_PATH, report)
    print(
        json.dumps(
            {
                "ok": report.get("ok"),
                "resultClass": report.get("resultClass"),
                "sampleCounts": report.get("sampleCounts"),
                "phaseCoverage": report.get("phaseCoverage"),
                "opensNext": report.get("opensNext"),
                "report": _rel(REPORT_PATH) if args.write_report else None,
                "doc": _rel(DOC_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    if args.row_limit is not None:
        return 0 if int(_get(report, "sampleCounts", "probeErrorCount") or 0) == 0 else 1
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
