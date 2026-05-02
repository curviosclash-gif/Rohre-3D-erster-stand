"""BT93S2R6.4 full-matrix predicate repair gate.

Consumes the locked S2R6 repair materialization, reruns the full
9-scenario/13-action/338-probe matrix, and classifies the remaining blocker
class without starting PPO training, holdout, reward, telemetry, action-surface,
or runtime work.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from collections.abc import Iterable, Mapping
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"
for candidate in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

import bt93s2r2_empirical_reentry_gate as s2r2_empirical  # noqa: E402
import bt93s2r3_direction_fairness_neutral_contract as direction_contract  # noqa: E402
import bt93s2r3_empirical_zero_gate as s2r3_empirical  # noqa: E402
import bt93s2r5_predicate_preaction_repair as s2r5_repair  # noqa: E402
import bt93s2r6_full_matrix_failure_ledger as ledger  # noqa: E402
import bt93s2r6_full_matrix_repair as s2r6_repair  # noqa: E402
import bt93s2r6_full_matrix_repair_contract as s2r6_contract  # noqa: E402
from envs.ppo_action_surface import MASKED_SEMANTIC_ACTIONS, build_action_surface_manifest  # noqa: E402


SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r6_full_matrix_predicate_repair_gate.py"
REPORT_PATH = ledger.BT93S2R6_ROOT / "full_matrix_predicate_repair_gate.json"
DOC_PATH = ledger.DOC_PATH

BLOCK_ID = "BT93S2R6"
PHASE_ID = "93S2R6.4"
GREEN_RESULT = "full-matrix-predicate-green"
ROW_GREEN_RESULT = "full-matrix-predicate-row-green"
NEXT_PHASE = "93S2R6.99 Closure und Reentry-Freigabe"

EXPECTED_SCENARIO_COUNT = 9
EXPECTED_ACTION_COUNT = 13
EXPECTED_PROBE_COUNT = 338
EXPECTED_S2R5_REPAIR_ROWS = 33
EXPECTED_S2R6_REPAIR_ROWS = 52
EXPECTED_COMBINED_REPAIR_ROWS = 65

ALLOWED_RESULT_CLASSES = {
    GREEN_RESULT,
    "full-matrix-seed-startstate-required",
    "retained-v2-seed-startstate-required",
    "predicate-contract-required",
    "minimum-window-contract-required",
    "metric-sampling-contract-required",
    "scenario-contract-unrepairable",
    "action-surface-lineage-invalidated",
    "measurement-invalid",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _read_json(path: Path) -> dict[str, Any]:
    return ledger._read_json(path)


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _rel(path: Path | None) -> str | None:
    return ledger._rel(path)


def _sha256_file(path: Path | None) -> str | None:
    return ledger._sha256_file(path)


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
    return ledger._get(mapping, *keys)


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
    *,
    expected: Mapping[str, Any] | None = None,
    required: bool = True,
    tracked: set[str] | None = None,
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" and path.is_file() else {}
    expected = expected or {}
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    rel_path = _rel(path)
    tracked_ok = rel_path in tracked if rel_path and tracked is not None else False
    return {
        "sourceKey": source_key,
        "role": role,
        "path": rel_path,
        "exists": path.is_file(),
        "isFile": path.is_file(),
        "required": required,
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and expected_ok and (tracked_ok or not required)),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "reportHash": payload.get("reportHash") if payload else None,
        "gitSha": _get(payload, "git", "sha") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r6RepairReport": (
            s2r6_repair.REPORT_PATH,
            "BT93S2R6.3 materialized full-matrix repair",
            {
                "blockId": "BT93S2R6",
                "phaseId": "93S2R6.3",
                "resultClass": "full-matrix-repair-applied",
                "ok": True,
                "sampleCounts.repairedSiblingRowCount": EXPECTED_S2R6_REPAIR_ROWS,
                "sampleCounts.candidateFailCount": 0,
                "sampleCounts.newTrainingEpisodes": 0,
                "sampleCounts.holdoutEpisodes": 0,
            },
            True,
        ),
        "s2r6RepairContract": (
            s2r6_contract.REPORT_PATH,
            "BT93S2R6.2 locked repair contract",
            {
                "blockId": "BT93S2R6",
                "phaseId": "93S2R6.2",
                "resultClass": "full-matrix-repair-contract-written",
                "ok": True,
                "sampleCounts.candidateProbeCount": EXPECTED_S2R6_REPAIR_ROWS,
                "sampleCounts.candidatePredicateFailureCount": 0,
                "sampleCounts.candidateMeasurementInvalidBeforeActionCount": 0,
                "sampleCounts.candidateMinimumWindowFailureCount": 0,
            },
            True,
        ),
        "s2r6FailureLedger": (
            ledger.REPORT_PATH,
            "BT93S2R6.1 red full-matrix source ledger",
            {
                "blockId": "BT93S2R6",
                "phaseId": "93S2R6.1",
                "resultClass": "full-matrix-failure-ledger-written",
                "ok": True,
                "sampleCounts.failureLedgerRowCount": 20,
                "sampleCounts.siblingExpansionCount": EXPECTED_S2R6_REPAIR_ROWS,
            },
            True,
        ),
        "s2r5RepairReport": (
            s2r5_repair.REPORT_PATH,
            "BT93S2R5 materialized prior 103-row repair subset",
            {
                "blockId": "BT93S2R5",
                "phaseId": "93S2R5.3",
                "resultClass": "predicate-preaction-repair-applied",
                "ok": True,
                "sampleCounts.repairedRowCount": EXPECTED_S2R5_REPAIR_ROWS,
                "sampleCounts.candidateFailCount": 0,
            },
            True,
        ),
        "s2r3DirectionFairness": (
            direction_contract.REPORT_PATH,
            "BT93S2R3.3 direction/fairness/neutral source contract",
            {
                "blockId": "BT93S2R3",
                "phaseId": "93S2R3.3-Reentry",
                "resultClass": "direction-fairness-neutral-contract-green",
                "ok": True,
                "sampleCounts.directionContractRowCount": 103,
                "sampleCounts.escapeRightFairnessFailureCount": 0,
                "sampleCounts.neutralControlRequiredCount": 0,
            },
            True,
        ),
        "s2r2RepairContract": (
            s2r2_empirical.REPAIR_CONTRACT_PATH,
            "full matrix scenario/seed contract source",
            {},
            True,
        ),
        "actionSurface": (
            ledger.ACTION_SURFACE_PATH,
            "read-only PPO action-surface decoder",
            {},
            True,
        ),
        "generatorScript": (SCRIPT_PATH, "BT93S2R6.4 generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(key, path, role, expected=expected, required=required, tracked=tracked)
        for key, (path, role, expected, required) in specs.items()
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


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("sha256")
        for item in source_artifacts
        if item.get("sourceKey")
    }


def _repair_index(
    *,
    s2r5_report: Mapping[str, Any],
    s2r6_report: Mapping[str, Any],
) -> tuple[dict[tuple[str, int, str], dict[str, Any]], dict[str, int]]:
    repairs: dict[tuple[str, int, str], dict[str, Any]] = {}
    s2r5_rows = 0
    s2r6_rows = 0
    override_rows = 0
    for row in _as_list(s2r5_report.get("repairedRows")):
        if not isinstance(row, Mapping):
            continue
        try:
            old_seed = int(row.get("oldSeed"))
        except (TypeError, ValueError):
            continue
        key = (str(row.get("scenarioId") or ""), old_seed, str(row.get("actionName") or ""))
        repairs[key] = {"source": "s2r5", "row": row}
        s2r5_rows += 1
    for row in _as_list(s2r6_report.get("repairedRows")):
        if not isinstance(row, Mapping):
            continue
        try:
            old_seed = int(row.get("oldSeed") or row.get("sourceSeed"))
        except (TypeError, ValueError):
            continue
        key = (str(row.get("scenarioId") or ""), old_seed, str(row.get("actionName") or ""))
        if key in repairs:
            override_rows += 1
        repairs[key] = {"source": "s2r6", "row": row}
        s2r6_rows += 1
    return repairs, {
        "s2r5RepairRowCount": s2r5_rows,
        "s2r6RepairRowCount": s2r6_rows,
        "s2r6OverrideRowCount": override_rows,
        "combinedRepairRowCount": len(repairs),
    }


def _materialized_matrix_rows(
    repair_contract: Mapping[str, Any],
    repairs: Mapping[tuple[str, int, str], Mapping[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Mapping[str, Any]]]:
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
                repair_entry = _as_mapping(repairs.get((scenario_id, old_seed, action_name)))
                repair_row = _as_mapping(repair_entry.get("row"))
                repair_source = str(repair_entry.get("source") or "none")
                run_seed = int(repair_row.get("newSeed")) if repair_row else old_seed
                replay_payload = {
                    "matrixId": ledger.MATRIX_ID,
                    "contractId": ledger.CONTRACT_ID,
                    "phaseId": PHASE_ID,
                    "scenarioId": scenario_id,
                    "sourceSeed": old_seed,
                    "seed": run_seed,
                    "actionName": action_name,
                    "actionToken": action_token,
                    "repairSource": repair_source,
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
                        "repairSource": repair_source,
                        "repairedByS2R5": repair_source == "s2r5",
                        "repairedByS2R6": repair_source == "s2r6",
                        "sourceOldSeed": repair_row.get("oldSeed") or repair_row.get("sourceSeed") if repair_row else None,
                        "sourceRepairClass": repair_row.get("primaryRepairClass") if repair_row else None,
                        "repairGroupId": repair_row.get("groupId") if repair_row else None,
                        "expectedStartMetricsHash": repair_row.get("newStartMetricsHash") if repair_row else None,
                        "expectedWarmupKey": repair_row.get("newWarmupKey") if repair_row else None,
                        "replaySpecId": f"bt93s2r6-gate-{_hash_value(replay_payload)[:24]}",
                        "replaySpecPayload": replay_payload,
                    }
                )
                row_index += 1
    return rows, scenarios


def _run_payload(contract_row: Mapping[str, Any], scenario: Mapping[str, Any], probe: Mapping[str, Any]) -> dict[str, Any]:
    return s2r3_empirical._run_payload(contract_row, scenario, probe)


def _repair_class_for_start_mismatch(contract_row: Mapping[str, Any]) -> str:
    source_repair_class = str(contract_row.get("sourceRepairClass") or "")
    if source_repair_class == "retained-v2-seed-startstate-required":
        return "retained-v2-seed-startstate-required"
    if source_repair_class == "minimum-window-contract-required":
        return "minimum-window-contract-required"
    return "full-matrix-seed-startstate-required"


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
            "blockingClasses": ["measurement-invalid"],
            "issues": ["scenario-contract-missing"],
            "probeRun": {},
        }

    repeat_steps = s2r3_empirical.s2r5_empirical.stable_replay._repeat_steps(scenario)
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
    if contract_row.get("repairSource") != "none":
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
    if any(item in issues for item in ("probe-error", "probe-ok-false", "scenario-contract-missing")):
        result_class = "measurement-invalid"
    elif any(item in issues for item in ("repaired-startMetricsHash-mismatch", "repaired-warmupKey-mismatch")):
        result_class = _repair_class_for_start_mismatch(contract_row)
    elif "minimum-window-fail" in issues:
        result_class = "minimum-window-contract-required"
    elif "retained-v2-measurement-invalid" in issues:
        result_class = "retained-v2-seed-startstate-required"
    elif any(item in issues for item in ("predicate-fail", "escape-right-positive-control-not-measurable")):
        result_class = "predicate-contract-required"
    elif "measurement-invalid-before-action" in issues:
        result_class = "metric-sampling-contract-required"
    elif any(item in issues for item in ("neutral-control-required", "negative-control-fail")):
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
        "repairSource": contract_row.get("repairSource"),
        "repairedByS2R5": contract_row.get("repairedByS2R5") is True,
        "repairedByS2R6": contract_row.get("repairedByS2R6") is True,
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
        "fullMatrixRecheckOnly": True,
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
        "phase93S2R6_4Closed": green,
        "phase93S2R6_99Allowed": green,
        "phase93S2R3_4RecheckAllowed": False,
        "phase93S2R3_99Allowed": False,
        "bt93s2FreshRecheckAllowed": False,
        "phase93S2_4Allowed": False,
        "bt93tClaimable": False,
        "bt93uClaimable": False,
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
    }


def _result_class(counts: Mapping[str, Any], *, source_ok: bool, guardrails_ok: bool) -> str:
    if not source_ok or not guardrails_ok:
        return "measurement-invalid"
    if counts.get("actionSurfaceLineageInvalidatedCount") != 0:
        return "action-surface-lineage-invalidated"
    if (
        counts.get("scenarioCount") != EXPECTED_SCENARIO_COUNT
        or counts.get("actionCount") != EXPECTED_ACTION_COUNT
        or counts.get("probeCount") != EXPECTED_PROBE_COUNT
    ):
        return "measurement-invalid"
    if counts.get("probeErrorCount") != 0:
        return "measurement-invalid"
    if counts.get("fullMatrixStartStateMismatchCount") != 0:
        return "full-matrix-seed-startstate-required"
    if counts.get("retainedV2StartStateMismatchCount") != 0:
        return "retained-v2-seed-startstate-required"
    if counts.get("minimumWindowFailureCount") != 0:
        return "minimum-window-contract-required"
    if counts.get("retainedV2MeasurementInvalidCount") != 0:
        return "retained-v2-seed-startstate-required"
    if counts.get("predicateFailureCount") != 0:
        return "predicate-contract-required"
    if counts.get("measurementInvalidCount") != 0 or counts.get("warmupTerminalBeforeActionCount") != 0:
        return "metric-sampling-contract-required"
    if counts.get("negativeControlFailedCount") != 0 or counts.get("neutralControlRequiredCount") != 0:
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
        and counts.get("retainedV2MeasurementInvalidCount") == 0
        and counts.get("directionMismatchCount") == 0
        and counts.get("escapeRightFairnessFailureCount") == 0
        and counts.get("neutralControlRequiredCount") == 0
        and counts.get("negativeControlFailedCount") == 0
        and counts.get("newTrainingEpisodes") == 0
        and counts.get("holdoutEpisodes") == 0
    )
    exact_matrix = bool(
        counts.get("scenarioCount") == EXPECTED_SCENARIO_COUNT
        and counts.get("actionCount") == EXPECTED_ACTION_COUNT
        and counts.get("probeCount") == EXPECTED_PROBE_COUNT
        and counts.get("combinedRepairRowCount") == EXPECTED_COMBINED_REPAIR_ROWS
        and counts.get("s2r6RepairRowCount") == EXPECTED_S2R6_REPAIR_ROWS
    )
    red_result_is_closed = bool(
        result_class == GREEN_RESULT or (result_class in ALLOWED_RESULT_CLASSES and counts.get("opensNextCount") == 0)
    )
    return {
        "93S2R6.4.1": exact_matrix,
        "93S2R6.4.2": zero_gate,
        "93S2R6.4.3": red_result_is_closed,
        "DoD.S2R6-9": exact_matrix,
        "DoD.S2R6-10": zero_gate,
        "DoD.S2R6-11": "pending-93S2R6.99",
        "DoD.S2R6-12": "pending-meta-gate",
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "nextPhaseOnly": bool(result_class == GREEN_RESULT and claim_flags.get("phase93S2R6_99Allowed") is True),
    }


def build_report(*, row_limit: int | None = None) -> dict[str, Any]:
    repair_contract = _read_json(s2r2_empirical.REPAIR_CONTRACT_PATH)
    s2r5_report = _read_json(s2r5_repair.REPORT_PATH)
    s2r6_report = _read_json(s2r6_repair.REPORT_PATH)
    direction_report = _read_json(direction_contract.REPORT_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = _source_files_ready(source_artifacts)
    source_files_versioned = _source_files_versioned(source_artifacts)
    repairs, repair_counts = _repair_index(s2r5_report=s2r5_report, s2r6_report=s2r6_report)
    full_rows, scenarios = _materialized_matrix_rows(repair_contract, repairs)
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
    repair_source_counts = Counter(str(row.get("repairSource")) for row in row_results)
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
    expected_decoder_hash = ledger.DECODER_HASH
    actual_action_surface_hash = _sha256_file(ledger.ACTION_SURFACE_PATH)
    source_direction_green = bool(
        direction_report.get("resultClass") == "direction-fairness-neutral-contract-green"
        and direction_report.get("ok") is True
    )
    full_matrix_start_mismatches = [
        row
        for row in row_results
        if row.get("sourceRepairClass") == "full-matrix-seed-startstate-required"
        and (
            row.get("startMetricsHashMatchesRepair") is not True
            or row.get("warmupKeyMatchesRepair") is not True
        )
    ]
    retained_start_mismatches = [
        row
        for row in row_results
        if row.get("sourceRepairClass") == "retained-v2-seed-startstate-required"
        and (
            row.get("startMetricsHashMatchesRepair") is not True
            or row.get("warmupKeyMatchesRepair") is not True
        )
    ]
    sample_counts: dict[str, Any] = {
        "scenarioCount": len(scenario_ids),
        "expectedScenarioCount": EXPECTED_SCENARIO_COUNT,
        "actionCount": len(action_names),
        "expectedActionCount": EXPECTED_ACTION_COUNT,
        "probeCount": len(row_results),
        "expectedProbeCount": EXPECTED_PROBE_COUNT,
        "sourceDirectionContractGreen": source_direction_green,
        "sourceDirectionContractRowCount": _get(direction_report, "sampleCounts", "directionContractRowCount"),
        "sourceFullReplayAttemptCount": _get(direction_report, "sampleCounts", "sourceFullReplayAttemptCount"),
        **repair_counts,
        "expectedS2R5RepairRowCount": EXPECTED_S2R5_REPAIR_ROWS,
        "expectedS2R6RepairRowCount": EXPECTED_S2R6_REPAIR_ROWS,
        "expectedCombinedRepairRowCount": EXPECTED_COMBINED_REPAIR_ROWS,
        "s2r5OnlyMaterializedRowCount": repair_source_counts.get("s2r5", 0),
        "s2r6MaterializedRowCount": repair_source_counts.get("s2r6", 0),
        "unrepairedMaterializedRowCount": repair_source_counts.get("none", 0),
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
        "fullMatrixStartStateMismatchCount": len(full_matrix_start_mismatches),
        "retainedV2StartStateMismatchCount": len(retained_start_mismatches),
        "repairStartMetricsHashMismatchCount": sum(
            1 for row in row_results if row.get("repairSource") != "none" and row.get("startMetricsHashMatchesRepair") is not True
        ),
        "repairWarmupKeyMismatchCount": sum(
            1 for row in row_results if row.get("repairSource") != "none" and row.get("warmupKeyMatchesRepair") is not True
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
            1
            for row in row_results
            if row.get("retainedV2Scenario") is True and row.get("measurementInvalidBeforeAction") is True
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
    result_class = _result_class(
        sample_counts,
        source_ok=source_files_ready and source_files_versioned,
        guardrails_ok=guardrails_ok,
    )
    ok = bool(
        row_limit is None
        and result_class == GREEN_RESULT
        and result_class in ALLOWED_RESULT_CLASSES
        and all(row.get("resultClass") == ROW_GREEN_RESULT for row in row_results)
    )
    allow_next = [NEXT_PHASE] if ok else []
    sample_counts["opensNextCount"] = len(allow_next)
    claim_flags = _claim_flags(ok)
    phase_coverage = _phase_coverage(
        counts=sample_counts,
        result_class=result_class,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        claim_flags=claim_flags,
    )
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r6-full-matrix-predicate-repair-gate-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
        "matrixId": ledger.MATRIX_ID,
        "contractId": ledger.CONTRACT_ID,
        "repairContractId": "bt93s2r6-full-matrix-repair-contract-v1",
        "actionSurfaceId": ledger.ACTION_SURFACE_ID,
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
        "sourceLocks": {
            "sourceHashes": _source_hashes(source_artifacts),
            "s2r6RepairReportHash": s2r6_report.get("reportHash"),
            "s2r6RepairedRowsHash": s2r6_report.get("repairedRowsHash"),
            "s2r6RepairContractReportHash": _read_json(s2r6_contract.REPORT_PATH).get("reportHash"),
            "s2r5RepairReportHash": s2r5_report.get("reportHash"),
            "s2r5RepairedRowsHash": s2r5_report.get("repairedRowsHash"),
            "oldRedReportsRemainHistoricalContext": True,
            "noPostHocThresholdChange": _get(_read_json(s2r6_contract.REPORT_PATH), "noPostHocThresholdChange") is True,
        },
        "measurementContract": {
            "scenarioCountMustBe": EXPECTED_SCENARIO_COUNT,
            "actionCountMustBe": EXPECTED_ACTION_COUNT,
            "probeCountMustBe": EXPECTED_PROBE_COUNT,
            "predicateFailureCountMustBe": 0,
            "minimumWindowFailureCountMustBe": 0,
            "measurementInvalidCountMustBe": 0,
            "retainedV2MeasurementInvalidCountMustBe": 0,
            "directionMismatchCountMustBe": 0,
            "escapeRightFairnessFailureCountMustBe": 0,
            "neutralControlRequiredCountMustBe": 0,
            "negativeControlFailedCountMustBe": 0,
            "newTrainingEpisodesMustBe": 0,
            "holdoutEpisodesMustBe": 0,
            "directionJudgementProduced": False,
            "actionQualityJudgementProduced": False,
            "oldRedReportsAreContextNotGreen": True,
        },
        "sampleCounts": sample_counts,
        "rowResultCounts": dict(sorted(row_class_counts.items())),
        "issueCounts": dict(sorted(issue_counts.items())),
        "scenarioCounts": dict(sorted(Counter(str(row.get("scenarioId")) for row in row_results).items())),
        "repairSourceCounts": dict(sorted(repair_source_counts.items())),
        "empiricalRows": row_results,
        "empiricalRowsHash": _hash_value({"rows": row_results}),
        "claimFlags": claim_flags,
        "guardrails": guardrails,
        "phaseCoverage": phase_coverage,
        "allowNext": allow_next,
        "opensNext": allow_next,
        "blocksNext": list(ledger.DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R3.4-Recheck and BT93S2R3.99",
                "active": True,
                "reason": "S2R6.4 can only open S2R6.99; S2R3 recheck requires S2R6 closure green.",
            },
            {
                "scope": "BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate, BT95",
                "active": True,
                "reason": "S2R6.4 proves only full-matrix measurement validity and opens no training or candidate path.",
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R6.99 closure; only closure may open a fresh 93S2R3.4-Recheck.",
            "Keep 93S2R3.4-Recheck, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate and BT95 closed until S2R6 closure.",
        ]
        if ok
        else [
            f"Stop and repair the narrow S2R6.4 blocker class {result_class}.",
            "Do not start 93S2R6.99, 93S2R3.4-Recheck, BT93S2.3-Recheck, 93S2.4 or downstream phases while this gate is red.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r6_full_matrix_predicate_repair_gate.py --write-report",
            "diagnosticRowLimit": "python python/scripts/bt93s2r6_full_matrix_predicate_repair_gate.py --row-limit 20",
            "nextPhase": "python python/scripts/bt93s2r6_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "phase gate executes 338 full-matrix probes; no PPO training or holdout consumption",
        },
        "actionSurface": build_action_surface_manifest(ledger.ACTION_SURFACE_ID),
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    return f"""<!-- BT93S2R6.4-START -->
## 93S2R6.4 Full-Matrix Predicate Repair Gate

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Full Matrix: `{counts.get('scenarioCount')}` scenarios x `{counts.get('actionCount')}` actions = `{counts.get('probeCount')}` probes
- Materialisierte Repairs: S2R5-only `{counts.get('s2r5OnlyMaterializedRowCount')}`, S2R6 `{counts.get('s2r6MaterializedRowCount')}`, kombiniert `{counts.get('combinedRepairRowCount')}`
- Null-Counts: predicate=`{counts.get('predicateFailureCount')}`, window=`{counts.get('minimumWindowFailureCount')}`, measurement=`{counts.get('measurementInvalidCount')}`, retainedV2=`{counts.get('retainedV2MeasurementInvalidCount')}`, direction=`{counts.get('directionMismatchCount')}`, fairness=`{counts.get('escapeRightFairnessFailureCount')}`, neutral=`{counts.get('neutralControlRequiredCount')}`, negative=`{counts.get('negativeControlFailedCount')}`
- Training/Holdout/Optimizer: `{counts.get('newTrainingEpisodes')}` / `{counts.get('holdoutEpisodes')}` / `{counts.get('newOptimizerUpdates')}`

S2R6.4 ist nur Messgueltigkeit auf der reparierten Full-Matrix. Gruen oeffnet nur
`93S2R6.99`; `93S2R3.4-Recheck`, S2-Recheck, Training, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben geschlossen.

Evidence:

- `data/training/ppo/bt93s2r6/full_matrix_predicate_repair_gate.json`
- Command: `python python/scripts/bt93s2r6_full_matrix_predicate_repair_gate.py --write-report`
<!-- BT93S2R6.4-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R6.4-START -->"
    end = "<!-- BT93S2R6.4-END -->"
    text = path.read_text(encoding="utf-8") if path.is_file() else ""
    if start in text and end in text:
        before = text.split(start, 1)[0]
        after = text.split(end, 1)[1]
        text = before + section + after
    else:
        if text and not text.endswith("\n"):
            text += "\n"
        text += "\n" + section
    path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    parser.add_argument("--row-limit", type=int, default=None, help="Diagnostic row limit; full closure requires 338 rows.")
    args = parser.parse_args()

    report = build_report(row_limit=args.row_limit)
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_doc_section(DOC_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "sampleCounts": report["sampleCounts"],
                "phaseCoverage": report["phaseCoverage"],
                "opensNext": report["opensNext"],
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
