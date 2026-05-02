"""BT93S2R6.3 full-matrix seed/start-state/window repair materialization.

Consumes the locked BT93S2R6.2 repair contract and materializes the four
full-matrix repair groups across all 52 sibling action rows. This phase is
diagnostic-only: no action-surface, reward, telemetry, PPO trainer, runtime,
holdout, or candidate state is changed.
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

import bt93s2r6_full_matrix_failure_ledger as ledger  # noqa: E402
import bt93s2r6_full_matrix_repair_contract as repair_contract  # noqa: E402
from envs.ppo_action_surface import MASKED_SEMANTIC_ACTIONS  # noqa: E402


SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r6_full_matrix_repair.py"
REPORT_PATH = ledger.BT93S2R6_ROOT / "full_matrix_repair_report.json"
DOC_PATH = ledger.DOC_PATH

BLOCK_ID = "BT93S2R6"
PHASE_ID = "93S2R6.3"
SOURCE_RESULT_CLASS = "full-matrix-repair-contract-written"
RESULT_CLASS = "full-matrix-repair-applied"
NEXT_PHASE = "93S2R6.4 Full-Matrix Recheck auf repariertem Vertrag"
EXPECTED_REPAIR_DECISION_COUNT = 4
EXPECTED_REPAIRED_SIBLING_ROW_COUNT = 52
EXPECTED_CURRENT_RED_ROW_COUNT = 20


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
    fresh = path.is_file() and all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    rel_path = _rel(path)
    return {
        "sourceKey": source_key,
        "role": role,
        "path": rel_path,
        "exists": path.is_file(),
        "isFile": path.is_file(),
        "required": required,
        "tracked": rel_path in tracked if tracked is not None and rel_path else False,
        "fresh": fresh,
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "reportHash": payload.get("reportHash") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r6RepairContract": (
            repair_contract.REPORT_PATH,
            "BT93S2R6.2 locked full-matrix repair contract",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R6.2",
                "resultClass": SOURCE_RESULT_CLASS,
                "ok": True,
                "claimFlags.phase93S2R6_3Allowed": True,
                "sampleCounts.repairDecisionCount": EXPECTED_REPAIR_DECISION_COUNT,
                "sampleCounts.candidateProbeCount": EXPECTED_REPAIRED_SIBLING_ROW_COUNT,
                "sampleCounts.candidatePredicateFailureCount": 0,
                "sampleCounts.candidateMeasurementInvalidBeforeActionCount": 0,
                "sampleCounts.candidateMinimumWindowFailureCount": 0,
                "sampleCounts.candidateWarmupTerminalBeforeActionCount": 0,
                "sampleCounts.replacementSeedDuplicateCount": 0,
            },
            True,
        ),
        "s2r6FailureLedger": (
            ledger.REPORT_PATH,
            "BT93S2R6.1 full-matrix failure ledger",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R6.1",
                "resultClass": "full-matrix-failure-ledger-written",
                "ok": True,
                "sampleCounts.failureLedgerRowCount": EXPECTED_CURRENT_RED_ROW_COUNT,
                "sampleCounts.siblingExpansionCount": EXPECTED_REPAIRED_SIBLING_ROW_COUNT,
                "sampleCounts.startStateSiblingGroupCount": EXPECTED_REPAIR_DECISION_COUNT,
            },
            True,
        ),
        "actionSurface": (ledger.ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
        "s2r6RepairScript": (SCRIPT_PATH, "BT93S2R6.3 report generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(
            source_key,
            path,
            role,
            expected=expected,
            required=required,
            tracked=tracked,
        )
        for source_key, (path, role, expected, required) in specs.items()
    ]


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {str(item.get("sourceKey")): item.get("sha256") for item in source_artifacts}


def _failure_index(failure_rows: Iterable[Mapping[str, Any]]) -> dict[tuple[str, int, str], Mapping[str, Any]]:
    result: dict[tuple[str, int, str], Mapping[str, Any]] = {}
    for row in failure_rows:
        key = (
            str(row.get("scenarioId") or ""),
            int(row.get("seed") or row.get("sourceSeed") or 0),
            str(row.get("actionName") or ""),
        )
        result[key] = row
    return result


def _action_tokens() -> dict[str, int]:
    return {str(action_name): index for index, (action_name, _flags) in enumerate(MASKED_SEMANTIC_ACTIONS)}


def _candidate_green(probe: Mapping[str, Any]) -> bool:
    validity = _as_mapping(probe.get("preActionValidity"))
    minimum = _as_mapping(probe.get("minimumWindow"))
    return bool(
        probe.get("probeError") in (None, "")
        and validity.get("predicatePass") is True
        and validity.get("measurementInvalidBeforeAction") is False
        and validity.get("completedMinimumWindow") is True
        and validity.get("warmupTerminalBeforeAction") is False
        and minimum.get("completed") is True
        and probe.get("actionEffectEvaluated") is False
    )


def _replacement_payload(decision: Mapping[str, Any], probe: Mapping[str, Any], action_token: int | None) -> dict[str, Any]:
    return {
        "phaseId": PHASE_ID,
        "matrixId": ledger.MATRIX_ID,
        "contractId": ledger.CONTRACT_ID,
        "repairContractId": "bt93s2r6-full-matrix-repair-contract-v1",
        "groupId": decision.get("groupId"),
        "scenarioId": decision.get("scenarioId") or probe.get("scenarioId"),
        "sourceSeed": decision.get("sourceSeed"),
        "diagnosticSeedReplacement": _get(decision, "seedContract", "diagnosticSeedReplacement"),
        "actionName": probe.get("actionName"),
        "actionToken": action_token,
        "startMetricsHash": probe.get("startMetricsHash"),
        "warmupKey": probe.get("warmupKey"),
        "primaryRepairClass": decision.get("primaryRepairClass"),
        "predicateChanged": bool(_get(decision, "predicateContract", "changed")),
        "minimumWindowRepairClassIsSeparate": bool(
            _get(decision, "minimumWindowContract", "minimumWindowRepairClassIsSeparate")
        ),
        "retainedV2QuarantineActive": bool(_get(decision, "retainedV2Quarantine", "active")),
    }


def _replacement_replay_spec_id(payload: Mapping[str, Any]) -> str:
    return f"bt93s2r6-{_hash_value(payload)[:24]}"


def _replacement_session_replay_id(payload: Mapping[str, Any]) -> str:
    session_payload = {
        "phaseId": PHASE_ID,
        "replaySpecId": _replacement_replay_spec_id(payload),
        "scenarioId": payload.get("scenarioId"),
        "diagnosticSeedReplacement": payload.get("diagnosticSeedReplacement"),
        "actionName": payload.get("actionName"),
        "actionToken": payload.get("actionToken"),
    }
    return f"bt93s2r6-{_hash_value(session_payload)[:24]}"


def _repair_row(
    decision: Mapping[str, Any],
    probe: Mapping[str, Any],
    failure_rows: Mapping[tuple[str, int, str], Mapping[str, Any]],
    action_tokens: Mapping[str, int],
) -> dict[str, Any]:
    scenario_id = str(decision.get("scenarioId") or probe.get("scenarioId") or "")
    source_seed = int(decision.get("sourceSeed") or 0)
    replacement_seed = int(_get(decision, "seedContract", "diagnosticSeedReplacement") or probe.get("seed") or 0)
    action_name = str(probe.get("actionName") or "")
    source_red_row = failure_rows.get((scenario_id, source_seed, action_name), {})
    action_token = action_tokens.get(action_name)
    payload = _replacement_payload(decision, probe, action_token)
    validity = _as_mapping(probe.get("preActionValidity"))
    minimum = _as_mapping(probe.get("minimumWindow"))
    control = _as_mapping(decision.get("controlProtection"))
    predicate_contract = _as_mapping(decision.get("predicateContract"))
    seed_contract = _as_mapping(decision.get("seedContract"))
    minimum_contract = _as_mapping(decision.get("minimumWindowContract"))
    retained_quarantine = _as_mapping(decision.get("retainedV2Quarantine"))
    red_actions = {str(action) for action in _as_list(decision.get("redActions"))}
    return {
        "groupId": decision.get("groupId"),
        "scenarioId": scenario_id,
        "actionName": action_name,
        "actionToken": action_token,
        "sourceSeed": source_seed,
        "oldSeed": source_seed,
        "diagnosticSeedReplacement": replacement_seed,
        "newSeed": replacement_seed,
        "sourceStartMetricsHash": decision.get("sourceStartMetricsHash"),
        "newStartMetricsHash": probe.get("startMetricsHash"),
        "sourceWarmupKey": source_red_row.get("warmupKey"),
        "newWarmupKey": probe.get("warmupKey"),
        "sourceCurrentRedRowFound": bool(source_red_row),
        "sourceCurrentRedRowId": source_red_row.get("rowId"),
        "sourceMatrixRowIndex": source_red_row.get("matrixRowIndex"),
        "sourceCurrentRedAction": action_name in red_actions,
        "sourceFailureIssues": source_red_row.get("issues") if source_red_row else [],
        "primaryRepairClass": decision.get("primaryRepairClass"),
        "repairApplied": True,
        "repairAppliedToFullMatrixSibling": True,
        "predicateChanged": bool(predicate_contract.get("changed")),
        "warmupChanged": False,
        "seedChanged": seed_contract.get("changed") is True,
        "sourceSeedLineageRetained": seed_contract.get("sourceSeedLineageRetained") is True,
        "diagnosticSeedOnly": seed_contract.get("diagnosticSeedOnly") is True,
        "usedForTraining": seed_contract.get("usedForTraining") is True,
        "holdoutSeed": seed_contract.get("holdoutSeed") is True,
        "replacementSeedSource": seed_contract.get("replacementSeedSource"),
        "minimumWindowRepairClassIsSeparate": bool(minimum_contract.get("minimumWindowRepairClassIsSeparate")),
        "retainedV2QuarantineActive": bool(retained_quarantine.get("active")),
        "retainedV2ReleaseCondition": retained_quarantine.get("releaseCondition"),
        "actionEffectEvaluated": False,
        "actionRootCauseAllowed": control.get("actionRootCauseAllowed"),
        "actionSpaceJudgementAllowed": control.get("actionSpaceJudgementAllowed"),
        "actionQualityJudgementAllowed": control.get("actionQualityJudgementAllowed"),
        "rewardJudgementAllowed": control.get("rewardJudgementAllowed"),
        "escapeRightFairnessFirst": control.get("escapeRightFairnessFirst"),
        "preActionValidity": {
            "ok": validity.get("ok"),
            "predicatePass": validity.get("predicatePass"),
            "measurementInvalidBeforeAction": validity.get("measurementInvalidBeforeAction"),
            "completedMinimumWindow": validity.get("completedMinimumWindow"),
            "warmupTerminalBeforeAction": validity.get("warmupTerminalBeforeAction"),
            "minimumWindowCompleted": minimum.get("completed"),
            "observedSteps": minimum.get("observedSteps"),
            "minimumCompletedSteps": minimum.get("minimumCompletedSteps"),
            "requestedRepeatSteps": minimum.get("requestedRepeatSteps"),
        },
        "predicate": {
            "predicateId": _get(probe, "predicate", "predicateId"),
            "expression": _get(probe, "predicate", "expression"),
            "function": _get(probe, "predicate", "function"),
            "changed": bool(predicate_contract.get("changed")),
            "noPostHocThresholdChange": predicate_contract.get("noPostHocThresholdChange") is True,
            "overallMargin": _get(probe, "predicateMargin", "overallMargin"),
            "failedClauseIds": _get(probe, "predicateMargin", "failedClauseIds"),
        },
        "warmup": probe.get("warmup"),
        "candidateGreen": _candidate_green(probe),
        "replacementReplaySpecPayload": payload,
        "replacementReplaySpecId": _replacement_replay_spec_id(payload),
        "replacementSessionReplayId": _replacement_session_replay_id(payload),
        "oldRedReportsRemainHistoricalContext": True,
    }


def _decision_summary(decision: Mapping[str, Any], rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    candidate_rows = [_as_mapping(row) for row in _as_list(decision.get("candidateProbeRows"))]
    source_red_found = sum(1 for row in rows if row.get("sourceCurrentRedRowFound") is True)
    candidate_fail_count = sum(1 for probe in candidate_rows if not _candidate_green(probe))
    return {
        "groupId": decision.get("groupId"),
        "scenarioId": decision.get("scenarioId"),
        "sourceSeed": decision.get("sourceSeed"),
        "diagnosticSeedReplacement": _get(decision, "seedContract", "diagnosticSeedReplacement"),
        "primaryRepairClass": decision.get("primaryRepairClass"),
        "redActions": decision.get("redActions"),
        "affectedActionCount": len(_as_list(decision.get("affectedActions"))),
        "repairedSiblingRowCount": len(rows),
        "sourceCurrentRedRowFoundCount": source_red_found,
        "sourceNonRedSiblingRowCount": len(rows) - source_red_found,
        "candidateFailCount": candidate_fail_count,
        "predicateChanged": bool(_get(decision, "predicateContract", "changed")),
        "warmupChanged": False,
        "seedChanged": _get(decision, "seedContract", "changed") is True,
        "retainedV2QuarantineActive": _get(decision, "retainedV2Quarantine", "active") is True,
        "minimumWindowRepairClassIsSeparate": _get(
            decision, "minimumWindowContract", "minimumWindowRepairClassIsSeparate"
        )
        is True,
        "controlProtection": decision.get("controlProtection"),
        "decisionReason": decision.get("decisionReason"),
    }


def _claim_flags(ok: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    flags["phase93S2R6_2Allowed"] = False
    flags["phase93S2R6_3Allowed"] = False
    flags["phase93S2R6_4Allowed"] = bool(ok)
    flags["phase93S2R6_99Allowed"] = False
    return flags


def build_report() -> dict[str, Any]:
    contract_report = _read_json(repair_contract.REPORT_PATH)
    failure_ledger = _read_json(ledger.REPORT_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)
    source_files_versioned = all(
        item.get("tracked") is True for item in source_artifacts if item.get("required") is True
    )
    failure_rows = _failure_index(_as_list(failure_ledger.get("failureLedgerRows")))
    action_tokens = _action_tokens()
    repaired_rows: list[dict[str, Any]] = []
    rows_by_group: dict[str, list[Mapping[str, Any]]] = {}
    decisions = [_as_mapping(decision) for decision in _as_list(contract_report.get("repairDecisions"))]

    for decision in decisions:
        group_rows = [
            _repair_row(decision, _as_mapping(probe), failure_rows, action_tokens)
            for probe in _as_list(decision.get("candidateProbeRows"))
            if isinstance(probe, Mapping)
        ]
        rows_by_group[str(decision.get("groupId"))] = group_rows
        repaired_rows.extend(group_rows)

    summaries = [_decision_summary(decision, rows_by_group.get(str(decision.get("groupId")), [])) for decision in decisions]
    row_class_counts = Counter(str(row.get("primaryRepairClass")) for row in repaired_rows)
    candidate_fail_count = sum(1 for row in repaired_rows if row.get("candidateGreen") is not True)
    source_red_found_count = sum(1 for row in repaired_rows if row.get("sourceCurrentRedRowFound") is True)
    replacement_seed_counts = Counter(int(row.get("newSeed") or 0) for row in repaired_rows if row.get("newSeed"))
    replay_spec_counts = Counter(str(row.get("replacementReplaySpecId")) for row in repaired_rows)
    escape_rows = [row for row in repaired_rows if row.get("scenarioId") == "escape-right-open"]
    retained_rows = [row for row in repaired_rows if row.get("retainedV2QuarantineActive") is True]
    minimum_window_rows = [
        row for row in repaired_rows if row.get("primaryRepairClass") == "minimum-window-contract-required"
    ]
    action_surface_hash = _sha256_file(ledger.ACTION_SURFACE_PATH)
    sample_counts = {
        "repairDecisionCount": len(summaries),
        "expectedRepairDecisionCount": EXPECTED_REPAIR_DECISION_COUNT,
        "sourceFailureLedgerRowCount": _get(failure_ledger, "sampleCounts", "failureLedgerRowCount"),
        "sourceSiblingExpansionCount": _get(failure_ledger, "sampleCounts", "siblingExpansionCount"),
        "repairedSiblingRowCount": len(repaired_rows),
        "expectedRepairedSiblingRowCount": EXPECTED_REPAIRED_SIBLING_ROW_COUNT,
        "sourceCurrentRedRowFoundCount": source_red_found_count,
        "expectedSourceCurrentRedRowFoundCount": EXPECTED_CURRENT_RED_ROW_COUNT,
        "sourceNonRedSiblingRowCount": len(repaired_rows) - source_red_found_count,
        "fullMatrixSeedStartStateRepairedRowCount": row_class_counts.get("full-matrix-seed-startstate-required", 0),
        "retainedV2SeedStartStateRepairedRowCount": row_class_counts.get("retained-v2-seed-startstate-required", 0),
        "minimumWindowRepairedRowCount": row_class_counts.get("minimum-window-contract-required", 0),
        "retainedV2QuarantinedRowCount": len(retained_rows),
        "retainedV2ReleasedBeforeS2R6_4Count": 0,
        "candidateGreenCount": len(repaired_rows) - candidate_fail_count,
        "candidateFailCount": candidate_fail_count,
        "candidatePredicateFailureCount": sum(
            1 for row in repaired_rows if _get(row, "preActionValidity", "predicatePass") is not True
        ),
        "candidateMeasurementInvalidBeforeActionCount": sum(
            1 for row in repaired_rows if _get(row, "preActionValidity", "measurementInvalidBeforeAction") is True
        ),
        "candidateMinimumWindowFailureCount": sum(
            1 for row in repaired_rows if _get(row, "preActionValidity", "completedMinimumWindow") is not True
        ),
        "candidateWarmupTerminalBeforeActionCount": sum(
            1 for row in repaired_rows if _get(row, "preActionValidity", "warmupTerminalBeforeAction") is True
        ),
        "replacementSeedDuplicateCount": sum(1 for count in replacement_seed_counts.values() if count > 13),
        "replacementReplaySpecDuplicateCount": sum(
            count - 1 for count in replay_spec_counts.values() if count > 1
        ),
        "replacementSeedUsedForTrainingCount": sum(1 for row in repaired_rows if row.get("usedForTraining") is True),
        "replacementSeedUsedForHoldoutCount": sum(1 for row in repaired_rows if row.get("holdoutSeed") is True),
        "predicateChangedCount": sum(1 for row in repaired_rows if row.get("predicateChanged") is True),
        "warmupChangedCount": sum(1 for row in repaired_rows if row.get("warmupChanged") is True),
        "escapeRightRepairedRowCount": len(escape_rows),
        "escapeRightCandidatePredicateFailureCount": sum(
            1 for row in escape_rows if _get(row, "preActionValidity", "predicatePass") is not True
        ),
        "escapeRightActionSpaceJudgementProducedCount": 0,
        "minimumWindowRepairSeparatedRowCount": len(minimum_window_rows),
        "directionEvidenceInvalidatedCount": 0,
        "fairnessEvidenceInvalidatedCount": 0,
        "actionEffectEvaluatedCount": sum(1 for row in repaired_rows if row.get("actionEffectEvaluated") is True),
        "actionQualityJudgementProducedCount": 0,
        "directionJudgementProducedCount": 0,
        "rewardJudgementProducedCount": 0,
        "actionSurfaceLineageInvalidatedCount": 0 if action_surface_hash == ledger.DECODER_HASH else 1,
        "actionSurfaceChangeCount": 0,
        "rewardChangeCount": 0,
        "telemetryChangeCount": 0,
        "runtimeChangeCount": 0,
        "holdoutEpisodes": 0,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
    }
    exact_repair_ok = bool(
        contract_report.get("ok") is True
        and contract_report.get("resultClass") == SOURCE_RESULT_CLASS
        and sample_counts["repairDecisionCount"] == EXPECTED_REPAIR_DECISION_COUNT
        and sample_counts["repairedSiblingRowCount"] == EXPECTED_REPAIRED_SIBLING_ROW_COUNT
        and sample_counts["sourceCurrentRedRowFoundCount"] == EXPECTED_CURRENT_RED_ROW_COUNT
        and sample_counts["candidateFailCount"] == 0
        and sample_counts["predicateChangedCount"] == 0
        and sample_counts["warmupChangedCount"] == 0
        and sample_counts["replacementSeedUsedForTrainingCount"] == 0
        and sample_counts["replacementSeedUsedForHoldoutCount"] == 0
        and sample_counts["actionSurfaceChangeCount"] == 0
        and sample_counts["rewardChangeCount"] == 0
        and sample_counts["telemetryChangeCount"] == 0
        and sample_counts["runtimeChangeCount"] == 0
        and sample_counts["holdoutEpisodes"] == 0
        and sample_counts["newTrainingEpisodes"] == 0
        and sample_counts["newOptimizerUpdates"] == 0
    )
    escape_right_fairness_ok = bool(
        len(escape_rows) == 26
        and sample_counts["escapeRightCandidatePredicateFailureCount"] == 0
        and sample_counts["escapeRightActionSpaceJudgementProducedCount"] == 0
        and all(row.get("actionSpaceJudgementAllowed") is False for row in escape_rows)
    )
    retained_v2_quarantine_ok = bool(
        len(retained_rows) == 13
        and sample_counts["retainedV2ReleasedBeforeS2R6_4Count"] == 0
        and all(row.get("retainedV2ReleaseCondition") for row in retained_rows)
    )
    minimum_window_ok = bool(
        len(minimum_window_rows) == 13
        and all(row.get("minimumWindowRepairClassIsSeparate") is True for row in minimum_window_rows)
        and sample_counts["directionEvidenceInvalidatedCount"] == 0
        and sample_counts["fairnessEvidenceInvalidatedCount"] == 0
    )
    phase_coverage = {
        "93S2R6.3.1": exact_repair_ok,
        "93S2R6.3.2": escape_right_fairness_ok,
        "93S2R6.3.3": retained_v2_quarantine_ok,
        "93S2R6.3.4": minimum_window_ok,
    }
    ok = bool(source_files_ready and source_files_versioned and all(phase_coverage.values()))
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r6-full-matrix-repair-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": RESULT_CLASS if ok else "measurement-invalid",
        "matrixId": ledger.MATRIX_ID,
        "contractId": ledger.CONTRACT_ID,
        "repairContractId": "bt93s2r6-full-matrix-repair-contract-v1",
        "actionSurfaceId": ledger.ACTION_SURFACE_ID,
        "decoderHash": ledger.DECODER_HASH,
        "actualActionSurfaceHash": action_surface_hash,
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
            "currentSourceHashes": _source_hashes(source_artifacts),
            "repairContractReportHash": contract_report.get("reportHash"),
            "failureLedgerReportHash": failure_ledger.get("reportHash"),
            "failureLedgerRowsHash": failure_ledger.get("failureLedgerRowsHash"),
            "redRowIdsHash": _get(failure_ledger, "sourceLocks", "redRowIdsHash"),
            "replacementManifestHash": _hash_value(contract_report.get("replacementManifest")),
            "noPostHocThresholdChange": contract_report.get("noPostHocThresholdChange") is True,
            "oldRedReportsRemainHistoricalContext": True,
        },
        "sampleCounts": sample_counts,
        "rowResultCounts": dict(sorted(row_class_counts.items())),
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(ok),
        "guardrails": {
            "trainingStarted": False,
            "ppoTrainingStarted": False,
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutUsed": False,
            "holdoutEpisodes": 0,
            "candidateRun": False,
            "freezeCandidate": False,
            "actionSurfaceChanged": False,
            "rewardFixApplied": False,
            "telemetryFixApplied": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "actionEffectEvaluated": False,
            "actionEffectOverrideCount": 0,
            "qualityClaimAllowed": False,
        },
        "repairPolicy": {
            "fullMatrixSiblingExpansionMaterialized": True,
            "predicateThresholdChangeAllowed": False,
            "predicateThresholdChanged": False,
            "warmupChangeAllowed": False,
            "warmupChanged": False,
            "seedStartStateReplacementApplied": True,
            "minimumWindowRepairClassSeparated": minimum_window_ok,
            "retainedV2QuarantineKept": retained_v2_quarantine_ok,
            "escapeRightFairnessFirst": escape_right_fairness_ok,
            "noPostHocThresholdChange": True,
            "oldRedReportsAreContextNotGreen": True,
        },
        "controlChecks": {
            "escapeRightFairnessFirst": escape_right_fairness_ok,
            "escapeRightActionSpaceJudgementProduced": False,
            "retainedV2StillQuarantined": retained_v2_quarantine_ok,
            "minimumWindowRepairSeparatedFromSeedAndPredicate": minimum_window_ok,
            "actionQualityJudgementProduced": False,
            "directionJudgementProduced": False,
            "rewardJudgementProduced": False,
        },
        "decisionSummaries": summaries,
        "repairedRows": repaired_rows,
        "repairedRowsHash": _hash_value({"rows": repaired_rows}),
        "allowNext": [NEXT_PHASE] if ok else [],
        "opensNext": [NEXT_PHASE] if ok else [],
        "blocksNext": list(ledger.DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R6.4 and full-matrix green",
                "reason": "S2R6.3 only materializes the locked repair; the 338-probe recheck is still missing.",
                "active": True,
            },
            {
                "scope": "retained-v2",
                "reason": "narrowing-corridor retained-v2 remains quarantined until S2R6.4 writes retainedV2MeasurementInvalidCount=0.",
                "active": True,
            },
            {
                "scope": "ActionSpace/Reward/Telemetry/Runtime/PPO/Holdout",
                "reason": "S2R6.3 produces no action-quality, reward, runtime, training, candidate, or holdout signal.",
                "active": True,
            },
            {
                "scope": "93S2R3.4-Recheck, 93S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Promote, Rollout, PPO-Validate, BT95",
                "reason": "Downstream remains closed until BT93S2R6.99 plus a fresh S2R3.4-Recheck.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R6.4 full-matrix recheck on the materialized S2R6 repair with exactly the 9-scenario/13-action/338-probe matrix.",
            "Do not start 93S2R3.4-Recheck, S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
            "Do not infer action quality, reward quality, or bot quality from S2R6.3.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r6_full_matrix_repair.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r6_full_matrix_predicate_repair_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "S2R6.3 materializes the locked repair only; empirical 338-probe gate remains 93S2R6.4",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    rows = "\n".join(
        "| `{scenario}` | `{source}` | `{replacement}` | `{klass}` | `{siblings}` | `{red}` | `{fails}` |".format(
            scenario=summary.get("scenarioId"),
            source=summary.get("sourceSeed"),
            replacement=summary.get("diagnosticSeedReplacement"),
            klass=summary.get("primaryRepairClass"),
            siblings=summary.get("repairedSiblingRowCount"),
            red=summary.get("sourceCurrentRedRowFoundCount"),
            fails=summary.get("candidateFailCount"),
        )
        for summary in _as_list(report.get("decisionSummaries"))
        if isinstance(summary, Mapping)
    )
    return f"""<!-- BT93S2R6.3-START -->
## 93S2R6.3 Full-Matrix Repair Applied

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Materialisierte Sibling-Rows: `{counts.get('repairedSiblingRowCount')}` / `{counts.get('expectedRepairedSiblingRowCount')}`
- Current-Red-Rows abgedeckt: `{counts.get('sourceCurrentRedRowFoundCount')}` / `{counts.get('expectedSourceCurrentRedRowFoundCount')}`
- Candidate Predicate/Measurement/Window/Warmup Fails: `{counts.get('candidatePredicateFailureCount')}` / `{counts.get('candidateMeasurementInvalidBeforeActionCount')}` / `{counts.get('candidateMinimumWindowFailureCount')}` / `{counts.get('candidateWarmupTerminalBeforeActionCount')}`
- Predicate-/Warmup-/ActionSurface-/Reward-/Telemetry-/Runtime-/Training-/Holdout-Aenderungen: `0/0/0/0/0/0/0/0`

| Scenario | SourceSeed | Replacement | Repair-Klasse | Sibling-Rows | Red-Rows | Candidate-Fails |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
{rows}

S2R6.3 materialisiert nur den gelockten Full-Matrix-Seed-/StartState-/Window-Repair.
`escape-right-open` bleibt Fairness-first ohne Action-Space-Urteil. `narrowing-corridor`
retained-v2 bleibt bis zum S2R6.4-Null-Count quarantined. Der Minimum-Window-Repair
bleibt getrennt von Predicate-/Seed-Reparatur und invalidiert keine Direction-/Fairness-Evidence.

Evidence:

- `data/training/ppo/bt93s2r6/full_matrix_repair_report.json`
- Command: `python python/scripts/bt93s2r6_full_matrix_repair.py --write-report`
<!-- BT93S2R6.3-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R6.3-START -->"
    end = "<!-- BT93S2R6.3-END -->"
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
    args = parser.parse_args()

    report = build_report()
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
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
