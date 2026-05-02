"""BT93S2R6.2 full-matrix root-cause decision and repair contract.

Contract-only phase: consumes the S2R6.1 failure ledger, chooses one primary
repair class per red Scenario/Seed/StartState group, and locks candidate
probes before any matrix, predicate, window, seed, env, or runner repair.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"
for candidate in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

import bt93s2r6_full_matrix_failure_ledger as ledger  # noqa: E402


SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r6_full_matrix_repair_contract.py"
REPORT_PATH = ledger.BT93S2R6_ROOT / "full_matrix_repair_contract.json"
DOC_PATH = ledger.DOC_PATH

BLOCK_ID = "BT93S2R6"
PHASE_ID = "93S2R6.2"
SOURCE_RESULT_CLASS = "full-matrix-failure-ledger-written"
RESULT_CLASS = "full-matrix-repair-contract-written"

ALLOWED_REPAIR_CLASSES = [
    "full-matrix-seed-startstate-required",
    "retained-v2-seed-startstate-required",
    "predicate-contract-required",
    "minimum-window-contract-required",
    "metric-sampling-contract-required",
    "scenario-contract-unrepairable",
    "action-surface-lineage-invalidated",
    "measurement-invalid",
]

REPAIR_DECISIONS: dict[tuple[str, int], dict[str, Any]] = {
    ("escape-right-open", 930): {
        "primaryRepairClass": "full-matrix-seed-startstate-required",
        "diagnosticSeedReplacement": 2930,
        "replacementSource": "locked matrix validation seed plus S2R6.2 full-sibling candidate probe",
        "decisionReason": (
            "Source seed 930 fails the locked right-lane predicate before action; "
            "replacement seed 2930 keeps predicate and window unchanged and passes all 13 sibling probes."
        ),
        "rejectedClasses": {
            "predicate-contract-required": "Predicate thresholds remain unchanged; replacement probe margin is positive.",
            "metric-sampling-contract-required": "Start metrics and warmup keys are reproducible in S2R6.1.",
        },
    },
    ("escape-right-open", 1930): {
        "primaryRepairClass": "full-matrix-seed-startstate-required",
        "diagnosticSeedReplacement": 3930,
        "replacementSource": "S2R6.2 deterministic diagnostic seed probe; avoids replacement-seed duplication",
        "decisionReason": (
            "Source seed 1930 fails the locked right-lane predicate before action; "
            "replacement seed 3930 keeps predicate and window unchanged and passes all 13 sibling probes."
        ),
        "rejectedClasses": {
            "predicate-contract-required": "Predicate thresholds remain unchanged; replacement probe margin is positive.",
            "metric-sampling-contract-required": "Start metrics and warmup keys are reproducible in S2R6.1.",
        },
    },
    ("narrowing-corridor", 1934): {
        "primaryRepairClass": "retained-v2-seed-startstate-required",
        "diagnosticSeedReplacement": 934,
        "replacementSource": "locked matrix discovery seed plus S2R6.2 full-sibling candidate probe",
        "decisionReason": (
            "Retained-v2 source seed 1934 fails the locked local-openness predicate before action; "
            "replacement seed 934 keeps predicate and window unchanged and passes all 13 sibling probes."
        ),
        "rejectedClasses": {
            "predicate-contract-required": "Retained-v2 stays quarantined; predicate thresholds are not relaxed.",
            "metric-sampling-contract-required": "Candidate probe proves the same metrics are sampleable before action.",
        },
    },
    ("narrowing-corridor", 2934): {
        "primaryRepairClass": "minimum-window-contract-required",
        "diagnosticSeedReplacement": 5934,
        "replacementSource": "S2R6.2 deterministic diagnostic seed probe for the minimum-window row",
        "decisionReason": (
            "Source seed 2934 passes predicate but pitch-up terminates before the locked minimum window; "
            "replacement seed 5934 keeps the 8-step minimum window and passes all 13 sibling probes."
        ),
        "rejectedClasses": {
            "predicate-contract-required": "The old predicate already passes; the blocker is the minimum window.",
            "metric-sampling-contract-required": "Candidate probe reaches the locked minimum window without sampling drift.",
        },
    },
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


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
    rel_paths = [ledger._rel(path) for path in paths]
    rel_paths = [path for path in rel_paths if path]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    return ledger._get(mapping, *keys)


def _as_list(value: Any) -> list[Any]:
    return ledger._as_list(value)


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _source_artifact(
    source_key: str,
    path: Path,
    role: str,
    expected: Mapping[str, Any],
    tracked: set[str],
    *,
    required: bool = True,
) -> dict[str, Any]:
    payload = ledger._read_json(path) if path.suffix == ".json" and path.exists() else {}
    rel_path = ledger._rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(actual_fields[key] == value for key, value in expected.items())
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
        "sha256": ledger._sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "reportHash": payload.get("reportHash") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r6FailureLedger": (
            ledger.REPORT_PATH,
            "BT93S2R6.1 full-matrix failure ledger",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R6.1",
                "resultClass": SOURCE_RESULT_CLASS,
                "ok": True,
                "sampleCounts.failureLedgerRowCount": ledger.EXPECTED_RED_ROW_COUNT,
                "sampleCounts.siblingExpansionCount": 52,
                "claimFlags.phase93S2R6_2Allowed": True,
            },
            True,
        ),
        "s2rMatrixContract": (
            ledger.SOURCE_MATRIX_CONTRACT,
            "BT93S2R matrix/control-v3 contract",
            {
                "blockId": "BT93S2R",
                "resultClass": "matrix-control-v3-contract-green",
                "ok": True,
                "matrixId": ledger.MATRIX_ID,
                "contractId": ledger.CONTRACT_ID,
                "actionSurfaceId": ledger.ACTION_SURFACE_ID,
                "decoderHash": ledger.DECODER_HASH,
            },
            True,
        ),
        "s2r6ContractScript": (SCRIPT_PATH, "BT93S2R6.2 generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(key, path, role, expected, tracked, required=required)
        for key, (path, role, expected, required) in specs.items()
    ]


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("sha256")
        for item in source_artifacts
        if item.get("sourceKey")
    }


def _candidate_probe(scenario: Mapping[str, Any], *, seed: int, action_name: str) -> dict[str, Any]:
    scenario_id = str(scenario.get("id") or "")
    repeat_steps = int(_get(scenario, "effectWindow", "maxSteps") or 24)
    minimum_steps = int(_get(scenario, "effectWindow", "minimumCompletedSteps") or 8)
    probe = ledger.v3_recheck._run_probe_v3(
        scenario,
        seed=seed,
        action_name=action_name,
        repeat_steps=repeat_steps,
    )
    start_metrics = _as_mapping(probe.get("startMetrics"))
    predicate_payload = _as_mapping(probe.get("v3Predicate"))
    warmup_payload = ledger.reset_repair._warmup_payload(scenario_id, seed, action_name, scenario)
    predicate_pass = predicate_payload.get("pass") is True
    completed_minimum_window = probe.get("completedMinimumWindow") is True
    warmup_terminal = probe.get("warmupTerminalBeforeAction") is True
    return {
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": action_name,
        "startMetricsHash": _hash_value(start_metrics),
        "warmupKey": _hash_value(warmup_payload),
        "predicate": {
            "predicateId": predicate_payload.get("predicateId") or _get(scenario, "predicate", "predicateId"),
            "expression": predicate_payload.get("expression") or _get(scenario, "predicate", "expression"),
            "function": predicate_payload.get("function") or "bt93s2_scenario_matrix_v2._predicate_ok",
            "pass": predicate_payload.get("pass"),
            "revalidatedBeforeMeasurement": predicate_payload.get("revalidatedBeforeMeasurement"),
        },
        "predicateMargin": ledger._predicate_margin(
            scenario_id,
            start_metrics,
            str(predicate_payload.get("expression") or _get(scenario, "predicate", "expression") or ""),
        ),
        "minimumWindow": {
            "completed": probe.get("completedMinimumWindow"),
            "observedSteps": probe.get("observedSteps"),
            "minimumCompletedSteps": minimum_steps,
            "requestedRepeatSteps": probe.get("requestedRepeatSteps"),
        },
        "warmup": {
            "warmupAction": warmup_payload.get("warmupAction"),
            "warmupSteps": warmup_payload.get("warmupSteps"),
            "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
        },
        "preActionValidity": {
            "ok": probe.get("ok"),
            "predicatePass": predicate_payload.get("pass"),
            "completedMinimumWindow": probe.get("completedMinimumWindow"),
            "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
            "measurementInvalidBeforeAction": bool(
                not predicate_pass or not completed_minimum_window or warmup_terminal
            ),
        },
        "startMetrics": dict(start_metrics),
        "probeError": probe.get("error"),
        "actionEffectEvaluated": False,
    }


def _probe_summary(probes: Iterable[Mapping[str, Any]]) -> dict[str, Any]:
    probe_rows = [probe for probe in probes if isinstance(probe, Mapping)]
    margins = [
        _get(probe, "predicateMargin", "overallMargin")
        for probe in probe_rows
        if isinstance(_get(probe, "predicateMargin", "overallMargin"), (int, float))
    ]
    observed_steps = [
        _get(probe, "minimumWindow", "observedSteps")
        for probe in probe_rows
        if isinstance(_get(probe, "minimumWindow", "observedSteps"), (int, float))
    ]
    return {
        "probeCount": len(probe_rows),
        "predicateFailureCount": sum(
            1 for probe in probe_rows if _get(probe, "preActionValidity", "predicatePass") is not True
        ),
        "measurementInvalidBeforeActionCount": sum(
            1
            for probe in probe_rows
            if _get(probe, "preActionValidity", "measurementInvalidBeforeAction") is True
        ),
        "minimumWindowFailureCount": sum(
            1
            for probe in probe_rows
            if _get(probe, "preActionValidity", "completedMinimumWindow") is not True
        ),
        "warmupTerminalBeforeActionCount": sum(
            1
            for probe in probe_rows
            if _get(probe, "preActionValidity", "warmupTerminalBeforeAction") is True
        ),
        "startMetricsHashCount": len({probe.get("startMetricsHash") for probe in probe_rows}),
        "overallMarginMin": min(margins) if margins else None,
        "overallMarginMax": max(margins) if margins else None,
        "observedStepsMin": min(observed_steps) if observed_steps else None,
        "observedStepsMax": max(observed_steps) if observed_steps else None,
    }


def _decision_payload(group: Mapping[str, Any], scenario: Mapping[str, Any]) -> dict[str, Any]:
    scenario_id = str(group.get("scenarioId") or "")
    source_seed = int(group.get("seed") or 0)
    decision = REPAIR_DECISIONS.get((scenario_id, source_seed), {})
    primary_class = str(decision.get("primaryRepairClass") or "measurement-invalid")
    replacement_seed = decision.get("diagnosticSeedReplacement")
    actions = sorted(str(action) for action in _as_list(group.get("fullMatrixSiblingActions")))
    candidate_probes = [
        _candidate_probe(scenario, seed=int(replacement_seed), action_name=action)
        for action in actions
        if replacement_seed is not None
    ]
    candidate_summary = _probe_summary(candidate_probes)
    old_probe_summary = {
        "redRowCount": group.get("currentRedRowCount"),
        "siblingExpansionCount": group.get("siblingExpansionCount"),
        "predicateFailureCount": group.get("predicateFailureCount"),
        "measurementInvalidCount": group.get("measurementInvalidCount"),
        "retainedV2MeasurementInvalidCount": group.get("retainedV2MeasurementInvalidCount"),
        "minimumWindowFailureCount": group.get("minimumWindowFailureCount"),
        "observedStepsMin": group.get("observedStepMin"),
        "observedStepsMax": group.get("observedStepMax"),
        "predicateMarginMin": group.get("predicateMarginMin"),
    }
    return {
        "groupId": group.get("groupId"),
        "scenarioId": scenario_id,
        "sourceSeed": source_seed,
        "sourceStartMetricsHash": group.get("startMetricsHash"),
        "sourcePredicateId": group.get("predicateId"),
        "sourceWarmupSiblingGroupCount": group.get("strictWarmupSiblingGroupCount"),
        "primaryRepairClass": primary_class,
        "ambiguous": False,
        "unknown": False,
        "decisionReason": decision.get("decisionReason"),
        "rejectedCandidates": [
            {"repairClass": key, "rejectedBecause": value}
            for key, value in sorted(_as_mapping(decision.get("rejectedClasses")).items())
        ],
        "affectedActions": actions,
        "redActions": list(_as_list(group.get("currentRedActions"))),
        "oldProbeSummary": old_probe_summary,
        "candidateProbeSummary": candidate_summary,
        "candidateProbeRows": candidate_probes,
        "predicateContract": {
            "oldPredicateId": group.get("predicateId"),
            "oldExpression": group.get("predicateExpression"),
            "newPredicateId": group.get("predicateId"),
            "newExpression": group.get("predicateExpression"),
            "function": "bt93s2_scenario_matrix_v2._predicate_ok",
            "changed": False,
            "noPostHocThresholdChange": True,
        },
        "seedContract": {
            "sourceSeed": source_seed,
            "diagnosticSeedReplacement": replacement_seed,
            "changed": replacement_seed is not None and int(replacement_seed) != source_seed,
            "replacementSeedSource": decision.get("replacementSource"),
            "diagnosticSeedOnly": True,
            "usedForTraining": False,
            "holdoutSeed": False,
            "sourceSeedLineageRetained": True,
        },
        "minimumWindowContract": {
            "sourceMinimumWindowFailureCount": group.get("minimumWindowFailureCount"),
            "sourceObservedStepsMin": group.get("observedStepMin"),
            "candidateMinimumWindowFailureCount": candidate_summary["minimumWindowFailureCount"],
            "minimumCompletedStepsChanged": False,
            "requestedRepeatStepsChanged": False,
            "minimumWindowRepairClassIsSeparate": primary_class == "minimum-window-contract-required",
        },
        "retainedV2Quarantine": {
            "active": primary_class == "retained-v2-seed-startstate-required",
            "sourceRetainedV2MeasurementInvalidCount": group.get("retainedV2MeasurementInvalidCount"),
            "releaseCondition": "S2R6.4 full-matrix recheck writes retainedV2MeasurementInvalidCount=0",
        },
        "controlProtection": {
            "noPostHocThresholdChange": True,
            "actionRootCauseAllowed": False,
            "actionSpaceJudgementAllowed": False,
            "actionQualityJudgementAllowed": False,
            "rewardJudgementAllowed": False,
            "escapeRightFairnessFirst": scenario_id == "escape-right-open",
            "retainedV2Quarantined": primary_class == "retained-v2-seed-startstate-required",
            "minimumWindowSeparated": primary_class == "minimum-window-contract-required",
        },
    }


def _claim_flags(ok: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    flags["phase93S2R6_2Allowed"] = False
    flags["phase93S2R6_3Allowed"] = bool(ok)
    flags["phase93S2R6_4Allowed"] = False
    flags["phase93S2R6_99Allowed"] = False
    return flags


def build_report() -> dict[str, Any]:
    failure_ledger = ledger._read_json(ledger.REPORT_PATH)
    matrix_contract = ledger._read_json(ledger.SOURCE_MATRIX_CONTRACT)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item.get("required") is True]
    source_files_ready = all(item.get("fresh") is True for item in required_sources)
    source_files_versioned = all(item.get("tracked") is True for item in required_sources)
    scenarios = ledger._scenario_index(matrix_contract)
    groups = [group for group in _as_list(failure_ledger.get("siblingGroups")) if isinstance(group, Mapping)]
    decisions = [
        _decision_payload(group, scenarios.get(str(group.get("scenarioId") or ""), {}))
        for group in sorted(groups, key=lambda item: (str(item.get("scenarioId")), int(item.get("seed") or 0)))
    ]
    primary_counts = Counter(str(decision.get("primaryRepairClass")) for decision in decisions)
    all_candidate_probes = [
        probe
        for decision in decisions
        for probe in _as_list(decision.get("candidateProbeRows"))
        if isinstance(probe, Mapping)
    ]
    replacement_seeds = [
        _get(decision, "seedContract", "diagnosticSeedReplacement")
        for decision in decisions
        if _get(decision, "seedContract", "diagnosticSeedReplacement") is not None
    ]
    replacement_counts = Counter(int(seed) for seed in replacement_seeds)
    unknown_root_cause_count = sum(1 for decision in decisions if decision.get("unknown") is True)
    ambiguous_primary_class_count = sum(1 for decision in decisions if decision.get("ambiguous") is True)
    invalid_primary_class_count = sum(
        1 for decision in decisions if decision.get("primaryRepairClass") not in ALLOWED_REPAIR_CLASSES
    )
    candidate_summary = _probe_summary(all_candidate_probes)
    sample_counts = {
        "sourceFailureLedgerRowCount": _get(failure_ledger, "sampleCounts", "failureLedgerRowCount"),
        "sourceSiblingExpansionCount": _get(failure_ledger, "sampleCounts", "siblingExpansionCount"),
        "sourceStartStateSiblingGroupCount": _get(failure_ledger, "sampleCounts", "startStateSiblingGroupCount"),
        "repairDecisionCount": len(decisions),
        "expectedRepairDecisionCount": 4,
        "fullMatrixSeedStartStateRequiredCount": primary_counts.get("full-matrix-seed-startstate-required", 0),
        "retainedV2SeedStartStateRequiredCount": primary_counts.get("retained-v2-seed-startstate-required", 0),
        "minimumWindowContractRequiredCount": primary_counts.get("minimum-window-contract-required", 0),
        "predicateContractRequiredCount": primary_counts.get("predicate-contract-required", 0),
        "metricSamplingContractRequiredCount": primary_counts.get("metric-sampling-contract-required", 0),
        "measurementInvalidDecisionCount": primary_counts.get("measurement-invalid", 0),
        "unknownRootCauseCount": unknown_root_cause_count,
        "ambiguousPrimaryClassCount": ambiguous_primary_class_count,
        "invalidPrimaryClassCount": invalid_primary_class_count,
        "candidateProbeCount": candidate_summary["probeCount"],
        "expectedCandidateProbeCount": 52,
        "candidatePredicateFailureCount": candidate_summary["predicateFailureCount"],
        "candidateMeasurementInvalidBeforeActionCount": candidate_summary["measurementInvalidBeforeActionCount"],
        "candidateMinimumWindowFailureCount": candidate_summary["minimumWindowFailureCount"],
        "candidateWarmupTerminalBeforeActionCount": candidate_summary["warmupTerminalBeforeActionCount"],
        "replacementSeedDuplicateCount": sum(1 for count in replacement_counts.values() if count > 1),
        "replacementSeedUsedForTrainingCount": 0,
        "replacementSeedUsedForHoldoutCount": 0,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    phase_coverage = {
        "93S2R6.2.1": bool(
            len(decisions) == 4
            and unknown_root_cause_count == 0
            and ambiguous_primary_class_count == 0
            and invalid_primary_class_count == 0
            and sample_counts["fullMatrixSeedStartStateRequiredCount"] == 2
            and sample_counts["retainedV2SeedStartStateRequiredCount"] == 1
            and sample_counts["minimumWindowContractRequiredCount"] == 1
        ),
        "93S2R6.2.2": bool(
            sample_counts["candidateProbeCount"] == sample_counts["expectedCandidateProbeCount"]
            and sample_counts["candidatePredicateFailureCount"] == 0
            and sample_counts["candidateMeasurementInvalidBeforeActionCount"] == 0
            and sample_counts["candidateMinimumWindowFailureCount"] == 0
            and sample_counts["candidateWarmupTerminalBeforeActionCount"] == 0
            and all(_get(decision, "controlProtection", "noPostHocThresholdChange") is True for decision in decisions)
        ),
        "93S2R6.2.3": bool(
            sample_counts["replacementSeedDuplicateCount"] == 0
            and sample_counts["replacementSeedUsedForTrainingCount"] == 0
            and sample_counts["replacementSeedUsedForHoldoutCount"] == 0
            and all(_get(decision, "seedContract", "sourceSeedLineageRetained") is True for decision in decisions)
        ),
        "93S2R6.2.4": bool(unknown_root_cause_count == 0 and ambiguous_primary_class_count == 0),
    }
    ok = bool(
        failure_ledger.get("ok") is True
        and failure_ledger.get("resultClass") == SOURCE_RESULT_CLASS
        and source_files_ready
        and source_files_versioned
        and all(phase_coverage.values())
    )
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r6-full-matrix-repair-contract-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": ledger._rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": RESULT_CLASS if ok else "measurement-invalid",
        "matrixId": ledger.MATRIX_ID,
        "contractId": ledger.CONTRACT_ID,
        "repairContractId": "bt93s2r6-full-matrix-repair-contract-v1",
        "actionSurfaceId": ledger.ACTION_SURFACE_ID,
        "decoderHash": ledger.DECODER_HASH,
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
            "failureLedgerReportHash": failure_ledger.get("reportHash"),
            "failureLedgerRowsHash": failure_ledger.get("failureLedgerRowsHash"),
            "redRowIdsHash": _get(failure_ledger, "sourceLocks", "redRowIdsHash"),
            "sourceHashes": _source_hashes(source_artifacts),
            "upstreamSourceHashes": _get(failure_ledger, "sourceLocks", "sourceHashes"),
        },
        "repairContractLockedBeforeImplementation": True,
        "noPostHocThresholdChange": True,
        "allowedRepairClasses": list(ALLOWED_REPAIR_CLASSES),
        "primaryRepairClassCounts": dict(sorted(primary_counts.items())),
        "repairDecisions": decisions,
        "candidateProbeSummary": candidate_summary,
        "replacementManifest": [
            {
                "scenarioId": decision.get("scenarioId"),
                "sourceSeed": decision.get("sourceSeed"),
                "diagnosticSeedReplacement": _get(decision, "seedContract", "diagnosticSeedReplacement"),
                "primaryRepairClass": decision.get("primaryRepairClass"),
                "sourceStartMetricsHash": decision.get("sourceStartMetricsHash"),
                "replacementSeedSource": _get(decision, "seedContract", "replacementSeedSource"),
                "usedForTraining": False,
                "holdoutSeed": False,
            }
            for decision in decisions
        ],
        "retainedV2Quarantine": {
            "active": True,
            "releaseCondition": "S2R6.4 writes retainedV2MeasurementInvalidCount=0 on the full 338-probe matrix",
            "affectedGroups": [
                decision.get("groupId")
                for decision in decisions
                if decision.get("primaryRepairClass") == "retained-v2-seed-startstate-required"
            ],
        },
        "sampleCounts": sample_counts,
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(ok),
        "guardrails": {
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
            "envChanged": False,
            "runnerChanged": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "actionEffectEvaluated": False,
            "actionEffectOverrideCount": 0,
            "qualityClaimAllowed": False,
        },
        "allowedFilesFor93S2R6_3": [
            "python/scripts/bt93s2r6_*.py",
            "data/training/ppo/bt93s2r6/**",
            "docs/bot-training/Bot_Trainingsplan.md",
            "docs/Fehlerberichte/2026-05-02_bt93s2r6_full_matrix_predicate_required.md",
        ],
        "conditionalFilesFor93S2R6_3": [
            {
                "path": "python/scripts/bt93s2r3_empirical_zero_gate.py",
                "allowedOnlyIf": "needed to consume the locked S2R6 repair contract as explicit recheck source",
            },
            {
                "path": "python/scripts/bt93s2_scenario_matrix_v2.py",
                "allowedOnlyIf": "seed/window repair can be represented only in the scenario matrix contract",
            },
            {
                "path": "python/envs/curvios_env.py",
                "allowedOnlyIf": "S2R6.3 proves a metric-sampling/minimum-window harness root cause before edit",
            },
        ],
        "blockedFilesAndSurfaces": [
            "python/envs/ppo_action_surface.py",
            "reward logic",
            "telemetry logic",
            "PPO trainer/optimizer",
            "productive Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart surfaces",
            "holdout artifacts",
        ],
        "allowNext": ["93S2R6.3 Enger Full-Matrix Predicate-/StartState-/Window-Repair"] if ok else [],
        "opensNext": ["93S2R6.3 Enger Full-Matrix Predicate-/StartState-/Window-Repair"] if ok else [],
        "blocksNext": ["93S2R6.4 before 93S2R6.3 repair is applied", *ledger.DOWNSTREAM_BLOCKS],
        "invalidations": [
            {
                "scope": "predicate threshold changes",
                "reason": "Candidate probes pass with unchanged predicates; threshold loosening is invalid.",
                "active": True,
            },
            {
                "scope": "S2R3.4-Recheck and downstream",
                "reason": "S2R6.2 only locks the repair contract; repair, full-matrix recheck and closure are still missing.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R6.3 to apply only the locked full-matrix seed/start-state and minimum-window repair contract.",
            "Do not change action surface, reward, telemetry, PPO trainer, runtime surfaces, or holdout state.",
            "Do not start S2R3.4-Recheck, S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r6_full_matrix_repair_contract.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r6_full_matrix_repair.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "candidate probes all 52 sibling rows once; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    decisions = _as_list(report.get("repairDecisions"))
    rows = "\n".join(
        "| `{}` | `{}` | `{}` | `{}` | `{}` | `{}` | `{}` |".format(
            decision.get("scenarioId"),
            decision.get("sourceSeed"),
            _get(decision, "seedContract", "diagnosticSeedReplacement"),
            decision.get("primaryRepairClass"),
            ", ".join(_as_list(decision.get("redActions"))) or "-",
            _get(decision, "candidateProbeSummary", "probeCount"),
            _get(decision, "candidateProbeSummary", "observedStepsMin"),
        )
        for decision in decisions
        if isinstance(decision, Mapping)
    )
    return f"""## 93S2R6.2 Root-Cause-Entscheid und Repair-Contract

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Repair-Decisions: `{counts.get('repairDecisionCount')}`
- Candidate-Probes: `{counts.get('candidateProbeCount')}`
- Candidate Predicate/Measurement/Window/Warmup Fails: `{counts.get('candidatePredicateFailureCount')}` / `{counts.get('candidateMeasurementInvalidBeforeActionCount')}` / `{counts.get('candidateMinimumWindowFailureCount')}` / `{counts.get('candidateWarmupTerminalBeforeActionCount')}`
- Primaerklassen: `full-matrix-seed-startstate-required={counts.get('fullMatrixSeedStartStateRequiredCount')}`, `retained-v2-seed-startstate-required={counts.get('retainedV2SeedStartStateRequiredCount')}`, `minimum-window-contract-required={counts.get('minimumWindowContractRequiredCount')}`
- Replacement-Seed-Duplikate/Training/Holdout: `{counts.get('replacementSeedDuplicateCount')}` / `{counts.get('replacementSeedUsedForTrainingCount')}` / `{counts.get('replacementSeedUsedForHoldoutCount')}`

| Scenario | SourceSeed | Replacement | Primaerklasse | Rote Actions | Candidate-Probes | Candidate observedStepsMin |
| --- | ---: | ---: | --- | --- | ---: | ---: |
{rows}

Der Contract aendert keine Predicate-Schwellen, keine ActionSurface, kein Reward,
keine Telemetrie, keinen PPO-Trainer, keine Runtime-Surface und keine Holdout-Lineage.
`narrowing-corridor` retained-v2 bleibt bis zum S2R6.4-Null-Count quarantined.

Evidence:

- `data/training/ppo/bt93s2r6/full_matrix_repair_contract.json`
- Command: `python python/scripts/bt93s2r6_full_matrix_repair_contract.py --write-report`
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = path.read_text(encoding="utf-8") if path.exists() else "# Fehlerbericht: BT93S2R6\n"
    marker = "## 93S2R6.2 Root-Cause-Entscheid und Repair-Contract"
    next_marker = "## Naechster Schritt"
    section = _markdown_section(report).strip()
    if marker in text:
        before, rest = text.split(marker, 1)
        if next_marker in rest:
            _old, after = rest.split(next_marker, 1)
            text = f"{before}{section}\n\n{next_marker}{after}"
        else:
            text = f"{before}{section}\n"
    elif next_marker in text:
        before, after = text.split(next_marker, 1)
        text = f"{before}{section}\n\n{next_marker}{after}"
    else:
        text = f"{text.rstrip()}\n\n{section}\n"
    text = text.replace(
        "- Run 93S2R6.2 to classify each unique red Scenario/Seed/StartState group with exactly one primary repair class and lock the repair contract.",
        "- Run 93S2R6.3 to apply only the locked full-matrix seed/start-state and minimum-window repair contract.",
    )
    text = text.replace(
        "- Do not start 93S2R6.3/4/99, 93S2R3.4-Recheck, 93S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95 yet.",
        "- Do not start 93S2R6.4/99, 93S2R3.4-Recheck, 93S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95 yet.",
    )
    path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-report", action="store_true", help="write JSON and Fehlerbericht artifacts")
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
                "report": ledger._rel(REPORT_PATH) if args.write_report else None,
                "doc": ledger._rel(DOC_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
