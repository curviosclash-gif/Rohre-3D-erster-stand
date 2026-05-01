"""BT93S2R5.3 narrow predicate/pre-action seed-start-state repair.

This phase consumes the locked BT93S2R5.2 repair contract and materializes the
allowed seed/start-state replacement rows for the 33 red S2R4.4 rows. It does
not change predicate thresholds, warmup, action surface, rewards, telemetry,
PPO training, runtime surfaces, or holdout state.
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
for path in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import bt93s2r5_predicate_preaction_failure_ledger as ledger  # noqa: E402
import bt93s2r5_predicate_preaction_repair_contract as repair_contract  # noqa: E402


SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r5_predicate_preaction_repair.py"
REPORT_PATH = ledger.BT93S2R5_ROOT / "predicate_preaction_repair_report.json"
DOC_PATH = ledger.DOC_PATH

BLOCK_ID = "BT93S2R5"
PHASE_ID = "93S2R5.3"
RESULT_CLASS = "predicate-preaction-repair-applied"
SOURCE_RESULT_CLASS = "predicate-preaction-repair-contract-written"

DOWNSTREAM_BLOCKS = list(repair_contract.DOWNSTREAM_BLOCKS)
NEXT_PHASE = "93S2R5.4 Empirical Recheck auf repariertem Vertrag"


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
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


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
    return ledger._as_mapping(value)


def _as_list(value: Any) -> list[Any]:
    return ledger._as_list(value)


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
        "s2r5RepairContract": (
            repair_contract.REPORT_PATH,
            "BT93S2R5.2 locked repair contract",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R5.2",
                "resultClass": SOURCE_RESULT_CLASS,
                "ok": True,
                "claimFlags.phase93S2R5_3Allowed": True,
                "sampleCounts.repairDecisionCount": 4,
                "sampleCounts.sourceFailureLedgerRowCount": 33,
                "sampleCounts.candidatePredicateFailureCount": 0,
                "sampleCounts.candidateMeasurementInvalidBeforeActionCount": 0,
                "sampleCounts.candidateMinimumWindowFailureCount": 0,
                "sampleCounts.candidateWarmupTerminalBeforeActionCount": 0,
            },
            True,
        ),
        "s2r5FailureLedger": (
            ledger.REPORT_PATH,
            "BT93S2R5.1 predicate/pre-action failure ledger",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R5.1",
                "resultClass": "predicate-preaction-failure-ledger-written",
                "ok": True,
                "sampleCounts.failureLedgerRowCount": 33,
                "sampleCounts.uniqueScenarioSeedStartMetricsGroupCount": 4,
                "sampleCounts.actionRootCauseAllowedGroupCount": 0,
            },
            True,
        ),
        "s2r4StableReplay": (
            ledger.S2R4_STABLE_PATH,
            "red BT93S2R4.4 predicate/window stable replay report",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.4",
                "resultClass": "predicate-window-required",
                "sampleCounts.contractRowCount": ledger.EXPECTED_SOURCE_ROW_COUNT,
                "sampleCounts.predicateFailureCount": ledger.EXPECTED_RED_ROW_COUNT,
                "sampleCounts.measurementInvalidBeforeActionCount": ledger.EXPECTED_RED_ROW_COUNT,
                "sampleCounts.replaySpecIdRepeatMismatchCount": 0,
                "sampleCounts.startMetricsHashRepeatMismatchCount": 0,
                "sampleCounts.warmupKeyRepeatMismatchCount": 0,
                "sampleCounts.sessionIdDriftCount": 0,
            },
            True,
        ),
        "s2r5RepairScript": (SCRIPT_PATH, "BT93S2R5.3 report generator", {}, False),
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


def _failure_index(failure_rows: Iterable[Mapping[str, Any]]) -> dict[tuple[str, int, str, str], Mapping[str, Any]]:
    result: dict[tuple[str, int, str, str], Mapping[str, Any]] = {}
    for row in failure_rows:
        key = (
            str(row.get("scenarioId") or ""),
            int(row.get("seed") or 0),
            str(row.get("startMetricsHash") or ""),
            str(row.get("actionName") or ""),
        )
        result[key] = row
    return result


def _stable_index(stable_rows: Iterable[Mapping[str, Any]]) -> dict[tuple[str, int, str], Mapping[str, Any]]:
    result: dict[tuple[str, int, str], Mapping[str, Any]] = {}
    for row in stable_rows:
        key = (str(row.get("scenarioId") or ""), int(row.get("seed") or 0), str(row.get("actionName") or ""))
        result[key] = row
    return result


def _candidate_green(probe: Mapping[str, Any]) -> bool:
    validity = _as_mapping(probe.get("preActionValidity"))
    minimum = _as_mapping(probe.get("minimumWindow"))
    return bool(
        probe.get("probeError") is None
        and validity.get("predicatePass") is True
        and validity.get("measurementInvalidBeforeAction") is False
        and validity.get("completedMinimumWindow") is True
        and validity.get("warmupTerminalBeforeAction") is False
        and minimum.get("completed") is True
        and probe.get("actionEffectEvaluated") is False
    )


def _replacement_payload(decision: Mapping[str, Any], probe: Mapping[str, Any], stable_row: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "phaseId": PHASE_ID,
        "matrixId": ledger.MATRIX_ID,
        "contractId": ledger.CONTRACT_ID,
        "repairContractId": ledger.REPAIR_CONTRACT_ID,
        "groupId": decision.get("groupId"),
        "scenarioId": decision.get("scenarioId") or probe.get("scenarioId"),
        "oldSeed": str(decision.get("oldSeed")),
        "newSeed": str(decision.get("newSeed") or probe.get("seed")),
        "actionName": probe.get("actionName"),
        "actionToken": probe.get("actionToken"),
        "startMetricsHash": probe.get("startMetricsHash"),
        "warmupKey": probe.get("warmupKey"),
        "sourceStableReplaySpecId": stable_row.get("replaySpecId"),
        "sourceRepairClass": decision.get("primaryRepairClass"),
        "predicateChanged": bool(_get(decision, "newPredicate", "changed")),
        "warmupChanged": bool(_get(decision, "newWarmup", "changed")),
    }


def _replacement_replay_spec_id(payload: Mapping[str, Any]) -> str:
    return f"bt93s2r5-{_hash_value(payload)[:24]}"


def _replacement_session_replay_id(payload: Mapping[str, Any]) -> str:
    session_payload = {
        "phaseId": PHASE_ID,
        "replaySpecId": _replacement_replay_spec_id(payload),
        "scenarioId": payload.get("scenarioId"),
        "newSeed": payload.get("newSeed"),
        "actionName": payload.get("actionName"),
        "actionToken": payload.get("actionToken"),
    }
    return f"bt93s2r5-{_hash_value(session_payload)[:24]}"


def _repair_row(
    decision: Mapping[str, Any],
    probe: Mapping[str, Any],
    failure_rows: Mapping[tuple[str, int, str, str], Mapping[str, Any]],
    stable_rows: Mapping[tuple[str, int, str], Mapping[str, Any]],
) -> dict[str, Any]:
    scenario_id = str(decision.get("scenarioId") or probe.get("scenarioId") or "")
    old_seed = int(decision.get("oldSeed") or 0)
    new_seed = int(decision.get("newSeed") or probe.get("seed") or 0)
    action_name = str(probe.get("actionName") or "")
    old_start_hash = str(decision.get("oldStartMetricsHash") or "")
    old_row = failure_rows.get((scenario_id, old_seed, old_start_hash, action_name), {})
    stable_row = stable_rows.get((scenario_id, new_seed, action_name), {})
    replacement_payload = _replacement_payload(decision, probe, stable_row)
    validity = _as_mapping(probe.get("preActionValidity"))
    minimum = _as_mapping(probe.get("minimumWindow"))
    control = _as_mapping(decision.get("controlProtection"))
    return {
        "groupId": decision.get("groupId"),
        "scenarioId": scenario_id,
        "actionName": action_name,
        "actionToken": probe.get("actionToken"),
        "oldSeed": old_seed,
        "newSeed": new_seed,
        "oldLedgerIndex": old_row.get("ledgerIndex"),
        "oldReplaySpecId": old_row.get("replaySpecId"),
        "newReplaySpecId": _replacement_replay_spec_id(replacement_payload),
        "sourceStableReplaySpecId": stable_row.get("replaySpecId"),
        "oldSessionReplayId": old_row.get("sessionReplayId"),
        "newSessionReplayId": _replacement_session_replay_id(replacement_payload),
        "sourceStableSessionReplayId": stable_row.get("sessionReplayId"),
        "oldRunnerSessionId": old_row.get("runnerSessionId"),
        "newRunnerSessionId": ledger.reset_repair._runner_session_id(scenario_id, new_seed),
        "sourceStableRunnerSessionId": stable_row.get("runnerSessionId"),
        "oldStartMetricsHash": old_row.get("startMetricsHash") or old_start_hash,
        "newStartMetricsHash": probe.get("startMetricsHash"),
        "oldWarmupKey": old_row.get("warmupKey"),
        "newWarmupKey": probe.get("warmupKey"),
        "primaryRepairClass": decision.get("primaryRepairClass"),
        "repairApplied": True,
        "predicateChanged": bool(_get(decision, "newPredicate", "changed")),
        "warmupChanged": bool(_get(decision, "newWarmup", "changed")),
        "seedChanged": old_seed != new_seed,
        "actionEffectEvaluated": False,
        "actionQualityJudgementAllowed": control.get("actionQualityJudgementAllowed"),
        "actionSpaceJudgementAllowed": control.get("actionSpaceJudgementAllowed"),
        "rewardJudgementAllowed": control.get("rewardJudgementAllowed"),
        "preActionValidity": {
            "ok": validity.get("ok"),
            "predicatePass": validity.get("predicatePass"),
            "measurementInvalidBeforeAction": validity.get("measurementInvalidBeforeAction"),
            "completedMinimumWindow": validity.get("completedMinimumWindow"),
            "warmupTerminalBeforeAction": validity.get("warmupTerminalBeforeAction"),
            "minimumWindowCompleted": minimum.get("completed"),
            "observedSteps": minimum.get("observedSteps"),
            "minimumCompletedSteps": minimum.get("minimumCompletedSteps"),
        },
        "predicate": {
            "predicateId": _get(probe, "predicate", "predicateId"),
            "expression": _get(probe, "predicate", "expression"),
            "function": _get(probe, "predicate", "function"),
            "oldExpression": _get(decision, "oldPredicate", "expression"),
            "changed": bool(_get(decision, "newPredicate", "changed")),
            "overallMargin": _get(probe, "predicateMargin", "overallMargin"),
            "failedClauseIds": _get(probe, "predicateMargin", "failedClauseIds"),
        },
        "warmup": probe.get("warmup"),
        "sourceOldResultClass": old_row.get("resultClass"),
        "sourceStableResultClass": stable_row.get("resultClass"),
        "replacementReplaySpecPayload": replacement_payload,
        "candidateGreen": _candidate_green(probe),
        "sourceOldRowFound": bool(old_row),
        "sourceReplacementStableRowFound": bool(stable_row),
        "replacementReplaySpecMaterialized": True,
    }


def _decision_summary(decision: Mapping[str, Any], rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    candidate_rows = _as_list(decision.get("candidateProbeRows"))
    candidate_fail_count = sum(1 for probe in candidate_rows if not _candidate_green(_as_mapping(probe)))
    start_hashes = sorted({str(row.get("newStartMetricsHash")) for row in rows if row.get("newStartMetricsHash")})
    replay_specs = sorted({str(row.get("newReplaySpecId")) for row in rows if row.get("newReplaySpecId")})
    return {
        "groupId": decision.get("groupId"),
        "scenarioId": decision.get("scenarioId"),
        "oldSeed": decision.get("oldSeed"),
        "newSeed": decision.get("newSeed"),
        "oldStartMetricsHash": decision.get("oldStartMetricsHash"),
        "primaryRepairClass": decision.get("primaryRepairClass"),
        "redRowCount": decision.get("redRowCount"),
        "repairedRowCount": len(rows),
        "affectedActions": decision.get("affectedActions"),
        "candidateFailCount": candidate_fail_count,
        "newStartMetricsHashCount": len(start_hashes),
        "newStartMetricsHashes": start_hashes,
        "newReplaySpecIdCount": len(replay_specs),
        "newReplaySpecIds": replay_specs,
        "predicateChanged": bool(_get(decision, "newPredicate", "changed")),
        "warmupChanged": bool(_get(decision, "newWarmup", "changed")),
        "seedChanged": _get(decision, "seedContract", "changed") is True,
        "controlProtection": decision.get("controlProtection"),
        "decisionReason": decision.get("decisionReason"),
    }


def _claim_flags(ok: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    flags["phase93S2R5_2Allowed"] = False
    flags["phase93S2R5_3Allowed"] = False
    flags["phase93S2R5_4Allowed"] = bool(ok)
    flags["phase93S2R5_99Allowed"] = False
    flags["phase93S2R4_5Allowed"] = False
    return flags


def build_report() -> dict[str, Any]:
    contract_report = _read_json(repair_contract.REPORT_PATH)
    failure_ledger = _read_json(ledger.REPORT_PATH)
    stable_report = _read_json(ledger.S2R4_STABLE_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)
    source_files_versioned = all(
        item.get("tracked") is True for item in source_artifacts if item.get("required") is True
    )
    current_hashes = _source_hashes(source_artifacts)

    indexed_failures = _failure_index(_as_list(failure_ledger.get("failureLedgerRows")))
    indexed_stable = _stable_index(_as_list(stable_report.get("stableReplayRows")))
    repaired_rows: list[dict[str, Any]] = []
    rows_by_group: dict[str, list[Mapping[str, Any]]] = {}

    for decision in _as_list(contract_report.get("repairDecisions")):
        if not isinstance(decision, Mapping):
            continue
        group_rows = [
            _repair_row(decision, _as_mapping(probe), indexed_failures, indexed_stable)
            for probe in _as_list(decision.get("candidateProbeRows"))
            if isinstance(probe, Mapping)
        ]
        rows_by_group[str(decision.get("groupId"))] = group_rows
        repaired_rows.extend(group_rows)

    decision_summaries = [
        _decision_summary(_as_mapping(decision), rows_by_group.get(str(_as_mapping(decision).get("groupId")), []))
        for decision in _as_list(contract_report.get("repairDecisions"))
        if isinstance(decision, Mapping)
    ]

    row_class_counts = Counter(str(row.get("primaryRepairClass")) for row in repaired_rows)
    duplicate_replay_spec_count = sum(
        count - 1
        for replay_spec, count in Counter(
            str(row.get("newReplaySpecId")) for row in repaired_rows if row.get("newReplaySpecId")
        ).items()
        if replay_spec and count > 1
    )
    no_danger_rows = [row for row in repaired_rows if row.get("scenarioId") == "no-danger-control"]
    escape_right_rows = [row for row in repaired_rows if row.get("scenarioId") == "escape-right-open"]
    sample_counts = {
        "repairDecisionCount": len(decision_summaries),
        "expectedRepairDecisionCount": 4,
        "sourceFailureLedgerRowCount": _get(failure_ledger, "sampleCounts", "failureLedgerRowCount"),
        "sourceStableReplayRowCount": _get(stable_report, "sampleCounts", "contractRowCount"),
        "sourceStableReplayAttemptCount": _get(stable_report, "sampleCounts", "replayAttemptCount"),
        "repairedRowCount": len(repaired_rows),
        "expectedRepairedRowCount": 33,
        "seedStartStateInvalidRepairCount": row_class_counts.get("seed-startstate-invalid", 0),
        "predicateChangedCount": sum(1 for row in repaired_rows if row.get("predicateChanged") is True),
        "warmupChangedCount": sum(1 for row in repaired_rows if row.get("warmupChanged") is True),
        "seedChangedCount": sum(1 for row in repaired_rows if row.get("seedChanged") is True),
        "candidateGreenCount": sum(1 for row in repaired_rows if row.get("candidateGreen") is True),
        "candidateFailCount": sum(1 for row in repaired_rows if row.get("candidateGreen") is not True),
        "sourceOldRowMissingCount": sum(1 for row in repaired_rows if row.get("sourceOldRowFound") is not True),
        "sourceReplacementStableRowMissingCount": sum(
            1 for row in repaired_rows if row.get("sourceReplacementStableRowFound") is not True
        ),
        "replacementReplaySpecMaterializedCount": sum(
            1 for row in repaired_rows if row.get("replacementReplaySpecMaterialized") is True
        ),
        "replacementDuplicateReplaySpecCount": duplicate_replay_spec_count,
        "escapeRightRepairedRowCount": len(escape_right_rows),
        "escapeRightCandidatePredicateFailureCount": sum(
            1 for row in escape_right_rows if _get(row, "preActionValidity", "predicatePass") is not True
        ),
        "escapeRightActionSpaceJudgementProducedCount": 0,
        "noDangerControlRepairedRowCount": len(no_danger_rows),
        "neutralControlActionGreenAllowed": False,
        "neutralControlActionGreenProduced": False,
        "neutralControlRequiredCount": 0,
        "actionEffectEvaluatedCount": sum(1 for row in repaired_rows if row.get("actionEffectEvaluated") is True),
        "actionQualityJudgementProducedCount": 0,
        "directionJudgementProducedCount": 0,
        "rewardJudgementProducedCount": 0,
        "actionSurfaceChangeCount": 0,
        "rewardChangeCount": 0,
        "telemetryChangeCount": 0,
        "runtimeChangeCount": 0,
        "holdoutEpisodes": 0,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
    }
    neutral_control_ok = bool(
        no_danger_rows
        and sample_counts["neutralControlActionGreenAllowed"] is False
        and sample_counts["neutralControlActionGreenProduced"] is False
        and sample_counts["neutralControlRequiredCount"] == 0
        and sample_counts["actionQualityJudgementProducedCount"] == 0
        and sample_counts["directionJudgementProducedCount"] == 0
        and sample_counts["rewardJudgementProducedCount"] == 0
    )
    escape_right_fairness_ok = bool(
        escape_right_rows
        and sample_counts["escapeRightCandidatePredicateFailureCount"] == 0
        and sample_counts["escapeRightActionSpaceJudgementProducedCount"] == 0
        and all(row.get("actionSpaceJudgementAllowed") is False for row in escape_right_rows)
    )
    narrow_repair_ok = bool(
        sample_counts["repairedRowCount"] == sample_counts["expectedRepairedRowCount"]
        and sample_counts["repairDecisionCount"] == sample_counts["expectedRepairDecisionCount"]
        and sample_counts["seedStartStateInvalidRepairCount"] == sample_counts["expectedRepairedRowCount"]
        and sample_counts["predicateChangedCount"] == 0
        and sample_counts["warmupChangedCount"] == 0
        and sample_counts["candidateFailCount"] == 0
        and sample_counts["sourceOldRowMissingCount"] == 0
        and sample_counts["replacementReplaySpecMaterializedCount"] == sample_counts["expectedRepairedRowCount"]
        and sample_counts["actionEffectEvaluatedCount"] == 0
        and sample_counts["actionSurfaceChangeCount"] == 0
        and sample_counts["rewardChangeCount"] == 0
        and sample_counts["telemetryChangeCount"] == 0
        and sample_counts["runtimeChangeCount"] == 0
        and sample_counts["holdoutEpisodes"] == 0
        and sample_counts["newTrainingEpisodes"] == 0
        and sample_counts["newOptimizerUpdates"] == 0
    )
    phase_coverage = {
        "93S2R5.3.1": narrow_repair_ok,
        "93S2R5.3.2": neutral_control_ok,
        "93S2R5.3.3": escape_right_fairness_ok,
        "93S2R5.3.4": bool(
            len(_as_list(contract_report.get("sourceArtifacts"))) > 0
            and _get(contract_report, "sourceLocks", "failureLedgerReportHash")
            and _get(stable_report, "resultClass") == "predicate-window-required"
        ),
        "DoD.S2R5-5": narrow_repair_ok,
        "DoD.S2R5-7": neutral_control_ok,
        "DoD.S2R5-8": escape_right_fairness_ok,
    }
    ok = bool(source_files_ready and source_files_versioned and all(phase_coverage.values()))
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r5-predicate-preaction-repair-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": RESULT_CLASS if ok else "measurement-invalid",
        "matrixId": ledger.MATRIX_ID,
        "contractId": ledger.CONTRACT_ID,
        "repairContractId": ledger.REPAIR_CONTRACT_ID,
        "actionSurfaceId": ledger.ACTION_SURFACE_ID,
        "decoderHash": ledger.DECODER_HASH,
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceLocks": {
            "currentSourceHashes": current_hashes,
            "repairContractReportHash": contract_report.get("reportHash"),
            "failureLedgerReportHash": failure_ledger.get("reportHash"),
            "stableReplayReportHash": stable_report.get("reportHash"),
            "oldRedRowsRemainHistoricalContext": True,
            "predicateFunction": ledger.PREDICATE_FUNCTION,
        },
        "sampleCounts": sample_counts,
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
            "primaryRepairClass": "seed-startstate-invalid",
            "predicateThresholdChangeAllowed": False,
            "predicateThresholdChanged": False,
            "warmupChangeAllowed": False,
            "warmupChanged": False,
            "seedStartStateReplacementApplied": True,
            "noPostHocThresholdChange": True,
            "oldRedReportsAreContextNotGreen": True,
            "replacementDuplicateReplaySpecsAreSamplingOnly": True,
        },
        "controlChecks": {
            "noDangerControlNeutralProtected": neutral_control_ok,
            "neutralControlActionGreenAllowed": False,
            "neutralControlActionGreenProduced": False,
            "neutralControlRequiredCount": 0,
            "escapeRightFairnessFirst": escape_right_fairness_ok,
            "positiveControlsRemainMeasurableBeforeActionSpaceJudgement": escape_right_fairness_ok,
            "actionSpaceJudgementProduced": False,
            "actionQualityJudgementProduced": False,
            "directionJudgementProduced": False,
            "rewardJudgementProduced": False,
        },
        "decisionSummaries": decision_summaries,
        "repairedRows": repaired_rows,
        "repairedRowsHash": _hash_value({"rows": repaired_rows}),
        "allowNext": [NEXT_PHASE] if ok else [],
        "opensNext": [NEXT_PHASE] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R4.5",
                "reason": "S2R5.3 only materializes the repaired seed/start-state contract; empirical 103x3 gate is still missing.",
                "active": True,
            },
            {
                "scope": "predicate thresholds and warmup",
                "reason": "Repair class is seed-startstate-invalid; predicate expressions and warmup remain unchanged.",
                "active": True,
            },
            {
                "scope": "ActionSpace/Reward/Telemetry/Runtime/PPO/Holdout",
                "reason": "S2R5.3 is contract repair only and produces no action-quality, reward, runtime, training, or holdout signal.",
                "active": True,
            },
            {
                "scope": "BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Promote, Rollout, PPO-Validate, BT95",
                "reason": "Downstream remains closed until BT93S2R5.99 predicate-window-repair-green plus later S2R4 full gate/closure.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R5.4 empirical recheck on the repaired contract with at least 103 rows x 3 repeats.",
            "Do not start 93S2R4.5, 93S2R3.3-Reentry, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
            "Do not infer action quality, reward quality, or bot quality from S2R5.3.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r5_predicate_preaction_repair.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r5_predicate_preaction_empirical_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "S2R5.3 materializes the locked contract only; empirical 103x3 gate remains 93S2R5.4",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    summaries = _as_list(report.get("decisionSummaries"))
    rows = "\n".join(
        "| `{scenario}` | `{old}` | `{new}` | `{count}` | `{predicate}` | `{warmup}` |".format(
            scenario=summary.get("scenarioId"),
            old=summary.get("oldSeed"),
            new=summary.get("newSeed"),
            count=summary.get("repairedRowCount"),
            predicate=summary.get("predicateChanged"),
            warmup=summary.get("warmupChanged"),
        )
        for summary in summaries
        if isinstance(summary, Mapping)
    )
    return f"""<!-- BT93S2R5.3-START -->
## 93S2R5.3 Enger Predicate-/StartState-/Warmup-Repair

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Repaired Rows: `{counts.get('repairedRowCount')}`; Repair-Gruppen: `{counts.get('repairDecisionCount')}`
- Predicate-/Warmup-Aenderungen: `{counts.get('predicateChangedCount')}` / `{counts.get('warmupChangedCount')}`
- Candidate-Fails/Missing Rows: `{counts.get('candidateFailCount')}` / `{counts.get('sourceOldRowMissingCount')}` / `{counts.get('sourceReplacementStableRowMissingCount')}`
- Neutral-Control/Action-/Reward-/Runtime-/Training-Signale: `0/0/0/0`

| Scenario | Alt-Seed | Neu-Seed | Rows | Predicate Changed | Warmup Changed |
| --- | ---: | ---: | ---: | --- | --- |
{rows}

S2R5.3 materialisiert nur den gelockten Seed-/StartState-Repair-Contract.
Alte rote S2R4.4-Reports bleiben Kontext, nicht Gruen. Gesperrt bleiben
`93S2R4.5`, `93S2R3.3-Reentry`, `BT93S2.3-Recheck`, `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bis zum spaeteren Empirical-/Closure-Gate.

Evidence:

- `data/training/ppo/bt93s2r5/predicate_preaction_repair_report.json`
- Command: `python python/scripts/bt93s2r5_predicate_preaction_repair.py --write-report`
<!-- BT93S2R5.3-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R5.3-START -->"
    end = "<!-- BT93S2R5.3-END -->"
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
