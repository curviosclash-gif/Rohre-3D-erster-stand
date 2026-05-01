"""BT93S2R5.2 root-cause decision and predicate/pre-action repair contract.

This phase is contract-only. It consumes the S2R5.1 failure ledger, selects one
primary repair class per red Scenario/Seed/StartMetrics group, and locks the
exact repair contract before any scenario, predicate, warmup, or seed repair is
implemented. It does not change runtime, rewards, telemetry, action-surface,
PPO training, or holdout state.
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

import bt93s2_existing_action_effect_v3_recheck as v3_recheck  # noqa: E402
import bt93s2r5_predicate_preaction_failure_ledger as ledger  # noqa: E402


SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r5_predicate_preaction_repair_contract.py"
REPORT_PATH = ledger.BT93S2R5_ROOT / "predicate_preaction_repair_contract.json"
DOC_PATH = ledger.DOC_PATH

BLOCK_ID = "BT93S2R5"
PHASE_ID = "93S2R5.2"
RESULT_CLASS = "predicate-preaction-repair-contract-written"
SOURCE_RESULT_CLASS = "predicate-preaction-failure-ledger-written"
REPAIR_CLASS = "seed-startstate-invalid"

ALLOWED_REPAIR_CLASSES = [
    "predicate-expression-stale",
    "seed-startstate-invalid",
    "warmup-contract-required",
    "neutral-control-contract-required",
    "escape-right-fairness-predicate-required",
    "metric-sampling-contract-required",
    "scenario-contract-unrepairable",
]

REPLACEMENT_SEEDS = {
    ("narrowing-corridor", 1934): 934,
    ("escape-right-open", 930): 2930,
    ("escape-right-open", 1930): 2930,
    ("no-danger-control", 930): 1930,
}

DOWNSTREAM_BLOCKS = [
    "93S2R4.5 before BT93S2R5.99 predicate-window-repair-green",
    "BT93S2R4.99 before BT93S2R5 and 93S2R4.5 green",
    "93S2R3.3-Reentry before S2R5/S2R4 full gate green",
    "BT93S2.3-Recheck before all S2R reentries green",
    "93S2.4 start before measurementValid=true",
    "BT93T/U/W/O/P/94A before S2R5/S2R4/S2R3/S2 gates",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "PPO training",
]


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


def _source_artifact(
    source_key: str,
    path: Path,
    role: str,
    expected: Mapping[str, Any],
    tracked: set[str],
    *,
    required: bool = True,
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
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
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r5FailureLedger": (
            ledger.REPORT_PATH,
            "BT93S2R5.1 predicate/pre-action failure ledger",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R5.1",
                "resultClass": SOURCE_RESULT_CLASS,
                "ok": True,
                "sampleCounts.failureLedgerRowCount": ledger.EXPECTED_RED_ROW_COUNT,
                "sampleCounts.uniqueScenarioSeedStartMetricsGroupCount": 4,
                "sampleCounts.actionRootCauseAllowedGroupCount": 0,
                "claimFlags.phase93S2R5_2Allowed": True,
            },
            True,
        ),
        "s2rMatrixContract": (
            ledger.S2R_MATRIX_CONTRACT_PATH,
            "BT93S2R matrix/control-v3 contract",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.3",
                "resultClass": "matrix-control-v3-contract-green",
                "ok": True,
                "matrixId": ledger.MATRIX_ID,
                "contractId": ledger.CONTRACT_ID,
                "actionSurfaceId": ledger.ACTION_SURFACE_ID,
                "decoderHash": ledger.DECODER_HASH,
            },
            True,
        ),
        "s2r5ContractScript": (SCRIPT_PATH, "BT93S2R5.2 generator", {}, False),
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


def _rows_by_group(failure_rows: Iterable[Mapping[str, Any]]) -> dict[str, list[Mapping[str, Any]]]:
    result: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    for row in failure_rows:
        group_id = f"{row.get('scenarioId')}:{row.get('seed')}:{str(row.get('startMetricsHash') or '')[:12]}"
        result[group_id].append(row)
    return result


def _stable_seed_candidates(stable_report: Mapping[str, Any]) -> dict[str, list[int]]:
    grouped: dict[tuple[str, int], dict[str, int]] = defaultdict(lambda: {"pass": 0, "fail": 0})
    for row in _as_list(stable_report.get("stableReplayRows")):
        if not isinstance(row, Mapping):
            continue
        key = (str(row.get("scenarioId") or ""), int(row.get("seed") or 0))
        if row.get("predicatePass") is True and row.get("measurementInvalidBeforeAction") is not True:
            grouped[key]["pass"] += 1
        else:
            grouped[key]["fail"] += 1
    result: dict[str, list[int]] = defaultdict(list)
    for (scenario_id, seed), counts in grouped.items():
        if counts["pass"] > 0 and counts["fail"] == 0:
            result[scenario_id].append(seed)
    return {key: sorted(value) for key, value in result.items()}


def _classify_group(group: Mapping[str, Any], stable_candidates: Mapping[str, list[int]]) -> dict[str, Any]:
    scenario_id = str(group.get("scenarioId") or "")
    old_seed = int(group.get("seed") or 0)
    replacement_seed = REPLACEMENT_SEEDS.get((scenario_id, old_seed))
    rejected: list[dict[str, Any]] = []
    if group.get("metricSamplingComplete") is not True:
        return {
            "primaryRepairClass": "metric-sampling-contract-required",
            "replacementSeed": None,
            "ambiguous": False,
            "unknown": False,
            "decisionReason": "Metric sampling is incomplete, so seed or predicate repair cannot be selected.",
            "rejectedCandidates": rejected,
        }
    if group.get("warmupTerminalBeforeActionCount"):
        return {
            "primaryRepairClass": "warmup-contract-required",
            "replacementSeed": None,
            "ambiguous": False,
            "unknown": False,
            "decisionReason": "Warmup terminates before action, so warmup contract repair is primary.",
            "rejectedCandidates": rejected,
        }
    if replacement_seed is None:
        return {
            "primaryRepairClass": "scenario-contract-unrepairable",
            "replacementSeed": None,
            "ambiguous": False,
            "unknown": False,
            "decisionReason": "No replacement seed is locked for this red group.",
            "rejectedCandidates": rejected,
        }

    rejected.append(
        {
            "repairClass": "predicate-expression-stale",
            "rejectedBecause": "Existing stable S2R4.4 seeds satisfy the unchanged predicate; threshold loosening is unnecessary.",
        }
    )
    rejected.append(
        {
            "repairClass": "warmup-contract-required",
            "rejectedBecause": "warmupTerminalBeforeActionCount is zero and minimum-window failures are zero.",
        }
    )
    if scenario_id == "escape-right-open":
        rejected.append(
            {
                "repairClass": "escape-right-fairness-predicate-required",
                "rejectedBecause": "Fairness remains guarded, but the direct blocker is the invalid seed/start-state, not an action-space or predicate-threshold change.",
            }
        )
    if scenario_id == "no-danger-control":
        rejected.append(
            {
                "repairClass": "neutral-control-contract-required",
                "rejectedBecause": "Neutral-control semantics remain unchanged; replacement seed preserves action-green prohibition.",
            }
        )
    candidates = list(stable_candidates.get(scenario_id) or [])
    return {
        "primaryRepairClass": REPAIR_CLASS,
        "replacementSeed": replacement_seed,
        "ambiguous": False,
        "unknown": False,
        "decisionReason": (
            f"Seed {old_seed} is deterministically outside the locked predicate window, "
            f"while stable S2R4.4 seed(s) {candidates} satisfy the unchanged scenario predicate."
        ),
        "rejectedCandidates": rejected,
    }


def _probe_candidate(
    scenario: Mapping[str, Any],
    *,
    seed: int,
    action_name: str,
    action_token: Any,
) -> dict[str, Any]:
    scenario_id = str(scenario.get("id") or "")
    predicate = _as_mapping(scenario.get("predicate"))
    expression = str(predicate.get("expression") or "")
    probe = v3_recheck._run_probe_v3(
        scenario,
        seed=seed,
        action_name=action_name,
        repeat_steps=ledger._repeat_steps(scenario),
    )
    start_metrics = _as_mapping(probe.get("startMetrics"))
    predicate_payload = _as_mapping(probe.get("v3Predicate"))
    warmup_payload = ledger.reset_repair._warmup_payload(scenario_id, seed, action_name, scenario)
    return {
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": action_name,
        "actionToken": action_token,
        "startMetricsHash": _hash_value(start_metrics),
        "warmupKey": _hash_value(warmup_payload),
        "predicate": {
            "predicateId": predicate_payload.get("predicateId") or predicate.get("predicateId"),
            "expression": predicate_payload.get("expression") or expression,
            "function": ledger.PREDICATE_FUNCTION,
            "pass": predicate_payload.get("pass"),
            "revalidatedBeforeMeasurement": predicate_payload.get("revalidatedBeforeMeasurement"),
        },
        "predicateMargin": ledger._predicate_margin(scenario_id, start_metrics, expression),
        "minimumWindow": {
            "completed": probe.get("completedMinimumWindow"),
            "observedSteps": probe.get("observedSteps"),
            "minimumCompletedSteps": ledger._minimum_completed_steps(scenario),
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
            "measurementInvalidBeforeAction": ledger._probe_invalid_before_action(probe),
        },
        "startMetrics": dict(start_metrics),
        "probeError": probe.get("error"),
        "actionEffectEvaluated": False,
    }


def _decision_payload(
    group: Mapping[str, Any],
    rows: list[Mapping[str, Any]],
    scenario: Mapping[str, Any],
    stable_candidates: Mapping[str, list[int]],
) -> dict[str, Any]:
    classification = _classify_group(group, stable_candidates)
    old_seed = int(group.get("seed") or 0)
    new_seed = classification.get("replacementSeed")
    predicate = _as_mapping(scenario.get("predicate"))
    effect_window = _as_mapping(scenario.get("effectWindow"))
    actions = sorted({str(row.get("actionName")) for row in rows if row.get("actionName")})
    candidate_probes = [
        _probe_candidate(
            scenario,
            seed=int(new_seed),
            action_name=str(row.get("actionName") or ""),
            action_token=row.get("actionToken"),
        )
        for row in sorted(rows, key=lambda item: (str(item.get("actionName")), int(item.get("actionToken") or 0)))
        if new_seed is not None
    ]
    candidate_margins = [
        _get(probe, "predicateMargin", "overallMargin")
        for probe in candidate_probes
        if isinstance(_get(probe, "predicateMargin", "overallMargin"), (int, float))
    ]
    old_margins = [
        _get(run, "predicateMargin", "overallMargin")
        for row in rows
        for run in _as_list(row.get("probeRuns"))
        if isinstance(_get(run, "predicateMargin", "overallMargin"), (int, float))
    ]
    return {
        "groupId": group.get("groupId"),
        "scenarioId": group.get("scenarioId"),
        "oldSeed": old_seed,
        "newSeed": new_seed,
        "redRowCount": len(rows),
        "affectedActions": actions,
        "oldStartMetricsHash": group.get("startMetricsHash"),
        "primaryRepairClass": classification["primaryRepairClass"],
        "decisionReason": classification["decisionReason"],
        "ambiguous": classification["ambiguous"],
        "unknown": classification["unknown"],
        "rejectedCandidates": classification["rejectedCandidates"],
        "oldPredicate": {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": ledger.PREDICATE_FUNCTION,
            "redOverallMarginMin": min(old_margins) if old_margins else None,
            "redOverallMarginMax": max(old_margins) if old_margins else None,
        },
        "newPredicate": {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": ledger.PREDICATE_FUNCTION,
            "changed": False,
            "reason": "Seed/start-state replacement keeps the predicate expression locked.",
        },
        "oldWarmup": {
            "warmupAction": effect_window.get("warmupAction"),
            "warmupSteps": effect_window.get("warmupSteps"),
        },
        "newWarmup": {
            "warmupAction": effect_window.get("warmupAction"),
            "warmupSteps": effect_window.get("warmupSteps"),
            "changed": False,
        },
        "seedContract": {
            "oldSeed": old_seed,
            "newSeed": new_seed,
            "changed": old_seed != new_seed,
            "replacementSeedSource": "existing S2R4.4 stable predicate-pass seed plus S2R5.2 candidate probe",
            "diagnosticSeedOnly": True,
            "holdoutSeed": False,
        },
        "controlProtection": {
            "noPostHocThresholdChange": True,
            "actionRootCauseAllowed": False,
            "actionSpaceJudgementAllowed": False,
            "actionQualityJudgementAllowed": False,
            "rewardJudgementAllowed": False,
            "neutralControlActionGreenAllowed": False if group.get("scenarioId") == "no-danger-control" else None,
            "neutralControlActionGreenProducedMustBe": False if group.get("scenarioId") == "no-danger-control" else None,
            "escapeRightFairnessFirst": True if group.get("scenarioId") == "escape-right-open" else None,
            "positiveControlsRemainMeasurableBeforeActionSpaceJudgement": True
            if group.get("scenarioId") == "escape-right-open"
            else None,
        },
        "candidateProbeSummary": {
            "probeCount": len(candidate_probes),
            "predicateFailureCount": sum(
                1 for probe in candidate_probes if _get(probe, "preActionValidity", "predicatePass") is not True
            ),
            "measurementInvalidBeforeActionCount": sum(
                1
                for probe in candidate_probes
                if _get(probe, "preActionValidity", "measurementInvalidBeforeAction") is True
            ),
            "minimumWindowFailureCount": sum(
                1 for probe in candidate_probes if _get(probe, "preActionValidity", "completedMinimumWindow") is not True
            ),
            "warmupTerminalBeforeActionCount": sum(
                1
                for probe in candidate_probes
                if _get(probe, "preActionValidity", "warmupTerminalBeforeAction") is True
            ),
            "startMetricsHashCount": len({probe.get("startMetricsHash") for probe in candidate_probes}),
            "overallMarginMin": min(candidate_margins) if candidate_margins else None,
            "overallMarginMax": max(candidate_margins) if candidate_margins else None,
        },
        "candidateProbeRows": candidate_probes,
    }


def _claim_flags(ok: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    flags["phase93S2R5_2Allowed"] = False
    flags["phase93S2R5_3Allowed"] = bool(ok)
    flags["phase93S2R5_4Allowed"] = False
    flags["phase93S2R5_99Allowed"] = False
    return flags


def build_report() -> dict[str, Any]:
    failure_ledger = _read_json(ledger.REPORT_PATH)
    matrix_contract = _read_json(ledger.S2R_MATRIX_CONTRACT_PATH)
    stable_report = _read_json(ledger.S2R4_STABLE_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)
    source_files_versioned = all(item.get("tracked") is True for item in source_artifacts if item.get("required") is True)
    groups = [group for group in _as_list(failure_ledger.get("dedupeGroups")) if isinstance(group, Mapping)]
    rows_by_group = _rows_by_group(_as_list(failure_ledger.get("failureLedgerRows")))
    scenarios = ledger._scenario_index(matrix_contract)
    stable_candidates = _stable_seed_candidates(stable_report)
    decisions = [
        _decision_payload(
            group,
            rows_by_group.get(str(group.get("groupId")), []),
            scenarios.get(str(group.get("scenarioId") or ""), {}),
            stable_candidates,
        )
        for group in groups
    ]
    primary_counts = Counter(str(decision.get("primaryRepairClass")) for decision in decisions)
    all_candidate_probe_rows = [
        probe
        for decision in decisions
        for probe in _as_list(decision.get("candidateProbeRows"))
        if isinstance(probe, Mapping)
    ]
    unknown_root_cause_count = sum(1 for decision in decisions if decision.get("unknown") is True)
    ambiguous_primary_class_count = sum(1 for decision in decisions if decision.get("ambiguous") is True)
    invalid_primary_class_count = sum(
        1 for decision in decisions if decision.get("primaryRepairClass") not in ALLOWED_REPAIR_CLASSES
    )
    sample_counts = {
        "sourceFailureLedgerRowCount": _get(failure_ledger, "sampleCounts", "failureLedgerRowCount"),
        "sourceUniqueScenarioSeedStartMetricsGroupCount": _get(
            failure_ledger, "sampleCounts", "uniqueScenarioSeedStartMetricsGroupCount"
        ),
        "repairDecisionCount": len(decisions),
        "expectedRepairDecisionCount": 4,
        "unknownRootCauseCount": unknown_root_cause_count,
        "ambiguousPrimaryClassCount": ambiguous_primary_class_count,
        "invalidPrimaryClassCount": invalid_primary_class_count,
        "seedStartStateInvalidCount": primary_counts.get(REPAIR_CLASS, 0),
        "candidateProbeCount": len(all_candidate_probe_rows),
        "candidatePredicateFailureCount": sum(
            1 for probe in all_candidate_probe_rows if _get(probe, "preActionValidity", "predicatePass") is not True
        ),
        "candidateMeasurementInvalidBeforeActionCount": sum(
            1
            for probe in all_candidate_probe_rows
            if _get(probe, "preActionValidity", "measurementInvalidBeforeAction") is True
        ),
        "candidateMinimumWindowFailureCount": sum(
            1
            for probe in all_candidate_probe_rows
            if _get(probe, "preActionValidity", "completedMinimumWindow") is not True
        ),
        "candidateWarmupTerminalBeforeActionCount": sum(
            1
            for probe in all_candidate_probe_rows
            if _get(probe, "preActionValidity", "warmupTerminalBeforeAction") is True
        ),
        "actionRootCauseAllowedGroupCount": _get(failure_ledger, "sampleCounts", "actionRootCauseAllowedGroupCount"),
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    phase_coverage = {
        "93S2R5.2.1": bool(
            len(decisions) == 4
            and unknown_root_cause_count == 0
            and ambiguous_primary_class_count == 0
            and invalid_primary_class_count == 0
            and all(decision.get("primaryRepairClass") == REPAIR_CLASS for decision in decisions)
        ),
        "93S2R5.2.2": bool(
            all(decision.get("oldPredicate") and decision.get("newPredicate") for decision in decisions)
            and all(_get(decision, "controlProtection", "noPostHocThresholdChange") is True for decision in decisions)
            and all(_get(decision, "seedContract", "changed") is True for decision in decisions)
            and sample_counts["candidatePredicateFailureCount"] == 0
            and sample_counts["candidateMeasurementInvalidBeforeActionCount"] == 0
            and sample_counts["candidateMinimumWindowFailureCount"] == 0
            and sample_counts["candidateWarmupTerminalBeforeActionCount"] == 0
        ),
        "93S2R5.2.3": bool(unknown_root_cause_count == 0 and ambiguous_primary_class_count == 0),
    }
    ok = bool(
        failure_ledger.get("ok") is True
        and failure_ledger.get("resultClass") == SOURCE_RESULT_CLASS
        and source_files_ready
        and source_files_versioned
        and all(phase_coverage.values())
    )
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r5-predicate-preaction-repair-contract-v1",
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
            "currentSourceHashes": _source_hashes(source_artifacts),
            "upstreamSourceHashes": _get(failure_ledger, "sourceLocks", "currentSourceHashes"),
            "predicateFunction": ledger.PREDICATE_FUNCTION,
        },
        "repairContractLockedBeforeImplementation": True,
        "noPostHocThresholdChange": True,
        "allowedRepairClasses": list(ALLOWED_REPAIR_CLASSES),
        "primaryRepairClassCounts": dict(sorted(primary_counts.items())),
        "stableSeedCandidatesByScenario": stable_candidates,
        "repairDecisions": decisions,
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
            "productiveRuntimeChanged": False,
            "envChanged": False,
            "runnerChanged": False,
            "runtimeSurfacesTouched": [],
            "actionEffectEvaluated": False,
            "actionEffectOverrideCount": 0,
            "qualityClaimAllowed": False,
        },
        "allowedFilesFor93S2R5_3": [
            "python/scripts/bt93s2r5_*.py",
            "data/training/ppo/bt93s2r5/**",
            "docs/bot-training/Bot_Trainingsplan.md",
            "docs/Fehlerberichte/2026-05-01_bt93s2r5_predicate_preaction_required.md",
        ],
        "conditionalFilesFor93S2R5_3": [
            {
                "path": "python/scripts/bt93s2r4_predicate_window_stable_replay.py",
                "allowedOnlyIf": "93S2R5.3 needs an explicit S2R5 repaired-seed contract input for later S2R4.5 full gate",
            }
        ],
        "blockedFilesAndSurfaces": [
            "python/envs/ppo_action_surface.py",
            "reward logic",
            "telemetry logic",
            "PPO trainer/optimizer",
            "productive Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart surfaces",
            "holdout artifacts",
        ],
        "allowNext": ["93S2R5.3 Enger Predicate-/StartState-/Warmup-Repair"] if ok else [],
        "opensNext": ["93S2R5.3 Enger Predicate-/StartState-/Warmup-Repair"] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R4.5",
                "reason": "S2R5.2 only locks the seed/start-state repair contract; repaired evidence and empirical gate are still missing.",
                "active": True,
            },
            {
                "scope": "predicate threshold changes",
                "reason": "Primary repair is seed-startstate-invalid for all groups; predicate expressions remain unchanged.",
                "active": True,
            },
            {
                "scope": "BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate, BT95",
                "reason": "Downstream remains closed until BT93S2R5.99 predicate-window-repair-green plus later S2R4 full gate/closure.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R5.3 to apply only the locked seed/start-state repair contract.",
            "Do not change predicate thresholds, warmup, action surface, reward, telemetry, PPO trainer, runtime surfaces, or holdout state.",
            "Do not start 93S2R4.5, 93S2R3.3-Reentry, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r5_predicate_preaction_repair_contract.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r5_predicate_preaction_repair.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "contract probes replacement seeds for affected 33 rows once; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    decisions = _as_list(report.get("repairDecisions"))
    rows = "\n".join(
        "| `{scenario}` | `{old}` | `{new}` | `{klass}` | `{actions}` | `{probe}` |".format(
            scenario=decision.get("scenarioId"),
            old=decision.get("oldSeed"),
            new=decision.get("newSeed"),
            klass=decision.get("primaryRepairClass"),
            actions=", ".join(_as_list(decision.get("affectedActions"))),
            probe=_get(decision, "candidateProbeSummary", "probeCount"),
        )
        for decision in decisions
        if isinstance(decision, Mapping)
    )
    return f"""<!-- BT93S2R5.2-START -->
## 93S2R5.2 Root-Cause-Entscheid und Repair-Contract

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Primaerklasse: `seed-startstate-invalid` fuer `{counts.get('repairDecisionCount')}` Gruppen
- Unknown/Ambiguous: `{counts.get('unknownRootCauseCount')}` / `{counts.get('ambiguousPrimaryClassCount')}`
- Candidate-Probes: `{counts.get('candidateProbeCount')}`; Predicate/PreAction/Window/Warmup-Fails: `{counts.get('candidatePredicateFailureCount')}` / `{counts.get('candidateMeasurementInvalidBeforeActionCount')}` / `{counts.get('candidateMinimumWindowFailureCount')}` / `{counts.get('candidateWarmupTerminalBeforeActionCount')}`
- Training/Holdout/Optimizer: `0/0/0`

| Scenario | Alt-Seed | Neu-Seed | Primaerklasse | Betroffene Actions | Contract-Probes |
| --- | ---: | ---: | --- | --- | ---: |
{rows}

Der Repair-Contract aendert keine Predicate-Schwellen und kein Warmup.
Gesperrt bleiben `93S2R4.5`, `93S2R3.3-Reentry`, `BT93S2.3-Recheck`,
`93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote,
Rollout, PPO-Validate und BT95.

Evidence:

- `data/training/ppo/bt93s2r5/predicate_preaction_repair_contract.json`
- Command: `python python/scripts/bt93s2r5_predicate_preaction_repair_contract.py --write-report`
<!-- BT93S2R5.2-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R5.2-START -->"
    end = "<!-- BT93S2R5.2-END -->"
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    if start in existing and end in existing:
        prefix = existing.split(start, 1)[0].rstrip()
        suffix = existing.split(end, 1)[1].lstrip()
        text = f"{prefix}\n\n{section}\n{suffix}".rstrip() + "\n"
    else:
        text = f"{existing.rstrip()}\n\n{section}".rstrip() + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
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
