"""BT93S2R6.99 closure gate.

Closes the full-matrix predicate/retained-v2 repair interposer after the
green 338-probe gate. A green closure may open only a fresh 93S2R3.4-Recheck.
It must not open S2R3.99, BT93S2 recheck, 93S2.4, BT93T/U/W/O/P/94A,
candidate, freeze, holdout, promote, rollout, PPO-Validate, BT95 handoff,
training, reward, telemetry, action-surface, or runtime signals.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
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

import bt93s2r6_full_matrix_failure_ledger as ledger  # noqa: E402
import bt93s2r6_full_matrix_predicate_repair_gate as full_gate  # noqa: E402
import bt93s2r6_full_matrix_repair as repair  # noqa: E402
import bt93s2r6_full_matrix_repair_contract as repair_contract  # noqa: E402


BLOCK_ID = "BT93S2R6"
PHASE_ID = "93S2R6.99"
GREEN_RESULT = "full-matrix-predicate-green"
ALLOWED_RESULT_CLASSES = set(full_gate.ALLOWED_RESULT_CLASSES)

SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r6_closure_gate.py"
CLOSURE_REPORT_PATH = ledger.BT93S2R6_ROOT / "bt93s2r6_closure_gate_report.json"
DOC_PATH = ledger.DOC_PATH

EXPECTED_SCENARIO_COUNT = full_gate.EXPECTED_SCENARIO_COUNT
EXPECTED_ACTION_COUNT = full_gate.EXPECTED_ACTION_COUNT
EXPECTED_PROBE_COUNT = full_gate.EXPECTED_PROBE_COUNT
EXPECTED_S2R5_REPAIR_ROWS = full_gate.EXPECTED_S2R5_REPAIR_ROWS
EXPECTED_S2R6_REPAIR_ROWS = full_gate.EXPECTED_S2R6_REPAIR_ROWS
EXPECTED_COMBINED_REPAIR_ROWS = full_gate.EXPECTED_COMBINED_REPAIR_ROWS

GREEN_OPEN_NEXT = ["93S2R3.4-Recheck"]
FULL_GATE_NEXT = [full_gate.NEXT_PHASE]
DOWNSTREAM_BLOCKS = [
    "93S2R3.99 before fresh 93S2R3.4-Recheck green",
    "BT93S2.3-Recheck before BT93S2R3.99=matrix-control-reentry-green",
    "93S2.4 before measurementValid=true and BT93S2R3.99 green",
    *ledger.DOWNSTREAM_BLOCKS,
]

ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
    "s2r6FullMatrixGate": (
        full_gate.REPORT_PATH,
        "BT93S2R6.4 green 338-probe full-matrix gate",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R6.4",
            "resultClass": GREEN_RESULT,
            "ok": True,
            "sampleCounts.scenarioCount": EXPECTED_SCENARIO_COUNT,
            "sampleCounts.actionCount": EXPECTED_ACTION_COUNT,
            "sampleCounts.probeCount": EXPECTED_PROBE_COUNT,
            "sampleCounts.s2r5RepairRowCount": EXPECTED_S2R5_REPAIR_ROWS,
            "sampleCounts.s2r6RepairRowCount": EXPECTED_S2R6_REPAIR_ROWS,
            "sampleCounts.combinedRepairRowCount": EXPECTED_COMBINED_REPAIR_ROWS,
            "sampleCounts.predicateFailureCount": 0,
            "sampleCounts.minimumWindowFailureCount": 0,
            "sampleCounts.measurementInvalidCount": 0,
            "sampleCounts.retainedV2MeasurementInvalidCount": 0,
            "sampleCounts.directionMismatchCount": 0,
            "sampleCounts.escapeRightFairnessFailureCount": 0,
            "sampleCounts.neutralControlRequiredCount": 0,
            "sampleCounts.negativeControlFailedCount": 0,
            "sampleCounts.newTrainingEpisodes": 0,
            "sampleCounts.holdoutEpisodes": 0,
            "claimFlags.phase93S2R6_99Allowed": True,
        },
        True,
    ),
    "s2r6RepairReport": (
        repair.REPORT_PATH,
        "BT93S2R6.3 full-matrix repair application",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R6.3",
            "resultClass": "full-matrix-repair-applied",
            "ok": True,
            "sampleCounts.repairedSiblingRowCount": EXPECTED_S2R6_REPAIR_ROWS,
            "sampleCounts.sourceCurrentRedRowFoundCount": ledger.EXPECTED_RED_ROW_COUNT,
            "sampleCounts.candidateFailCount": 0,
            "sampleCounts.predicateChangedCount": 0,
            "sampleCounts.warmupChangedCount": 0,
        },
        True,
    ),
    "s2r6RepairContract": (
        repair_contract.REPORT_PATH,
        "BT93S2R6.2 locked repair contract",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R6.2",
            "resultClass": "full-matrix-repair-contract-written",
            "ok": True,
            "sampleCounts.repairDecisionCount": 4,
            "sampleCounts.candidateProbeCount": EXPECTED_S2R6_REPAIR_ROWS,
            "sampleCounts.unknownRootCauseCount": 0,
            "sampleCounts.ambiguousPrimaryClassCount": 0,
        },
        True,
    ),
    "s2r6FailureLedger": (
        ledger.REPORT_PATH,
        "BT93S2R6.1 failure ledger and non-coverage audit",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R6.1",
            "resultClass": "full-matrix-failure-ledger-written",
            "ok": True,
            "sampleCounts.failureLedgerRowCount": ledger.EXPECTED_RED_ROW_COUNT,
            "sampleCounts.siblingExpansionCount": EXPECTED_S2R6_REPAIR_ROWS,
            "sampleCounts.s2r5CoveredCurrentRedRowCount": 0,
            "sampleCounts.s2r5UncoveredCurrentRedRowCount": ledger.EXPECTED_RED_ROW_COUNT,
        },
        True,
    ),
    "s2r3DirectionContract": (
        ledger.SOURCE_S2R3_DIRECTION,
        "BT93S2R3.3 direction/fairness/neutral contract",
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
    "s2r3RedFullGate": (
        ledger.SOURCE_S2R3_FULL_GATE,
        "red BT93S2R3.4 empirical zero gate source",
        {
            "blockId": "BT93S2R3",
            "phaseId": "93S2R3.4",
            "resultClass": "predicate-window-required",
            "sampleCounts.probeCount": EXPECTED_PROBE_COUNT,
            "sampleCounts.predicateFailureCount": ledger.EXPECTED_PREDICATE_FAILURE_COUNT,
            "sampleCounts.minimumWindowFailureCount": ledger.EXPECTED_MINIMUM_WINDOW_FAILURE_COUNT,
            "sampleCounts.measurementInvalidCount": ledger.EXPECTED_MEASUREMENT_INVALID_COUNT,
            "sampleCounts.retainedV2MeasurementInvalidCount": ledger.EXPECTED_RETAINED_V2_MEASUREMENT_INVALID_COUNT,
        },
        True,
    ),
    "s2r4Closure": (
        ledger.SOURCE_S2R4_CLOSURE,
        "BT93S2R4.99 replay/startstate green closure",
        {
            "blockId": "BT93S2R4",
            "phaseId": "93S2R4.99",
            "resultClass": "replay-startstate-green",
            "ok": True,
            "gatePassed": True,
            "opensNext": ["93S2R3.3-Reentry"],
        },
        True,
    ),
    "s2r5Closure": (
        ledger.SOURCE_S2R5_CLOSURE,
        "BT93S2R5.99 predicate/pre-action green closure",
        {
            "blockId": "BT93S2R5",
            "phaseId": "93S2R5.99",
            "resultClass": "predicate-window-repair-green",
            "ok": True,
            "gatePassed": True,
            "claimFlags.phase93S2R4_5Allowed": True,
        },
        True,
    ),
    "s2rMatrixContract": (
        ledger.SOURCE_MATRIX_CONTRACT,
        "BT93S2R matrix/control-v3 contract",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.3",
            "resultClass": "matrix-control-v3-contract-green",
            "ok": True,
            "matrixId": ledger.MATRIX_ID,
            "contractId": ledger.CONTRACT_ID,
        },
        True,
    ),
    "actionSurface": (ledger.ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
    "pythonEnv": (ENV_PATH, "Python sidecar environment, read-only", {}, True),
    "headlessRunner": (HEADLESS_RUNNER_PATH, "JS-authoritative headless path, read-only", {}, True),
    "closureScript": (SCRIPT_PATH, "BT93S2R6.99 closure generator", {}, False),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    return ledger._read_json(path)


def _rel(path: Path | None) -> str | None:
    return ledger._rel(path)


def _sha256_file(path: Path | None) -> str | None:
    return ledger._sha256_file(path)


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
    if isinstance(expected, (set, tuple)):
        return actual in expected
    return actual == expected


def _source_artifact(
    source_key: str,
    path: Path,
    role: str,
    expected: Mapping[str, Any],
    tracked: set[str],
    *,
    required: bool,
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" and path.is_file() else {}
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
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "gatePassed": payload.get("gatePassed") if payload else None,
        "reportHash": payload.get("reportHash") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected, _required in SOURCE_SPECS.values())
    return [
        _source_artifact(key, path, role, expected, tracked, required=required)
        for key, (path, role, expected, required) in SOURCE_SPECS.items()
    ]


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("sha256")
        for item in source_artifacts
        if item.get("sourceKey")
    }


def _source_result_classes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("resultClass")
        for item in source_artifacts
        if item.get("sourceKey") and item.get("resultClass") is not None
    }


def _compact_counts(source_report: Mapping[str, Any]) -> dict[str, Any]:
    counts = _as_mapping(source_report.get("sampleCounts"))
    keys = [
        "scenarioCount",
        "expectedScenarioCount",
        "actionCount",
        "expectedActionCount",
        "probeCount",
        "expectedProbeCount",
        "sourceDirectionContractGreen",
        "sourceDirectionContractRowCount",
        "sourceFullReplayAttemptCount",
        "s2r5RepairRowCount",
        "s2r6RepairRowCount",
        "combinedRepairRowCount",
        "s2r5OnlyMaterializedRowCount",
        "s2r6MaterializedRowCount",
        "unrepairedMaterializedRowCount",
        "retainedV2ScenarioCount",
        "retainedV2ProbeCount",
        "escapeRightPositiveControlProbeCount",
        "predicateFailureCount",
        "minimumWindowFailureCount",
        "measurementInvalidCount",
        "warmupTerminalBeforeActionCount",
        "fullMatrixStartStateMismatchCount",
        "retainedV2StartStateMismatchCount",
        "repairStartMetricsHashMismatchCount",
        "repairWarmupKeyMismatchCount",
        "directionMismatchCount",
        "legacyDirectionMismatchContextCount",
        "directionJudgementProducedCount",
        "actionQualityJudgementProducedCount",
        "escapeRightFairnessFailureCount",
        "retainedV2MeasurementInvalidCount",
        "neutralControlRequiredCount",
        "negativeControlFailedCount",
        "probeErrorCount",
        "actionSurfaceLineageInvalidatedCount",
        "newTrainingEpisodes",
        "newOptimizerUpdates",
        "holdoutEpisodes",
        "rewardChangeCount",
        "telemetryChangeCount",
        "runtimeChangeCount",
        "actionSurfaceChangeCount",
        "opensNextCount",
    ]
    return {key: counts.get(key) for key in keys if key in counts}


def _zero_counts(counts: Mapping[str, Any]) -> bool:
    zero_keys = [
        "predicateFailureCount",
        "minimumWindowFailureCount",
        "measurementInvalidCount",
        "warmupTerminalBeforeActionCount",
        "fullMatrixStartStateMismatchCount",
        "retainedV2StartStateMismatchCount",
        "repairStartMetricsHashMismatchCount",
        "repairWarmupKeyMismatchCount",
        "directionMismatchCount",
        "directionJudgementProducedCount",
        "actionQualityJudgementProducedCount",
        "escapeRightFairnessFailureCount",
        "retainedV2MeasurementInvalidCount",
        "neutralControlRequiredCount",
        "negativeControlFailedCount",
        "probeErrorCount",
        "actionSurfaceLineageInvalidatedCount",
        "newTrainingEpisodes",
        "newOptimizerUpdates",
        "holdoutEpisodes",
        "rewardChangeCount",
        "telemetryChangeCount",
        "runtimeChangeCount",
        "actionSurfaceChangeCount",
    ]
    return all(int(counts.get(key) or 0) == 0 for key in zero_keys)


def _forbidden_claim_open(claim_flags: Mapping[str, Any], *, allowed_extra: Iterable[str] = ()) -> bool:
    allowed = {"phase93S2R3_4RecheckAllowed", "phase93S2R6Closed", *allowed_extra}
    return any(value is True for key, value in claim_flags.items() if key not in allowed)


def _active_blockers(
    *,
    source_report: Mapping[str, Any],
    source_files_ready: bool,
    source_files_versioned: bool,
) -> list[str]:
    counts = _compact_counts(source_report)
    source_claim_flags = _as_mapping(source_report.get("claimFlags"))
    blockers: list[str] = []
    if not source_files_ready:
        blockers.append("source-files-not-ready")
    if not source_files_versioned:
        blockers.append("source-files-not-versioned")
    source_result = str(source_report.get("resultClass") or "measurement-invalid")
    if source_result != GREEN_RESULT or source_report.get("ok") is not True:
        blockers.append(source_result if source_result in ALLOWED_RESULT_CLASSES else "measurement-invalid")
    if source_report.get("opensNext") != FULL_GATE_NEXT:
        blockers.append("closure-not-opened-by-full-matrix-gate")
    if source_claim_flags.get("phase93S2R6_99Allowed") is not True:
        blockers.append("closure-claim-flag-missing")
    exact_expected = {
        "scenarioCount": EXPECTED_SCENARIO_COUNT,
        "actionCount": EXPECTED_ACTION_COUNT,
        "probeCount": EXPECTED_PROBE_COUNT,
        "s2r5RepairRowCount": EXPECTED_S2R5_REPAIR_ROWS,
        "s2r6RepairRowCount": EXPECTED_S2R6_REPAIR_ROWS,
        "combinedRepairRowCount": EXPECTED_COMBINED_REPAIR_ROWS,
    }
    for key, expected in exact_expected.items():
        if counts.get(key) != expected:
            blockers.append(f"{key}-invalid")
    if counts.get("sourceDirectionContractGreen") is not True:
        blockers.append("direction-contract-source-invalid")
    zero_blocker_map = {
        "fullMatrixStartStateMismatchCount": "full-matrix-seed-startstate-required",
        "retainedV2StartStateMismatchCount": "retained-v2-seed-startstate-required",
        "retainedV2MeasurementInvalidCount": "retained-v2-seed-startstate-required",
        "minimumWindowFailureCount": "minimum-window-contract-required",
        "predicateFailureCount": "predicate-contract-required",
        "measurementInvalidCount": "metric-sampling-contract-required",
        "warmupTerminalBeforeActionCount": "metric-sampling-contract-required",
        "actionSurfaceLineageInvalidatedCount": "action-surface-lineage-invalidated",
        "negativeControlFailedCount": "measurement-invalid",
        "neutralControlRequiredCount": "measurement-invalid",
        "directionMismatchCount": "measurement-invalid",
        "directionJudgementProducedCount": "measurement-invalid",
        "actionQualityJudgementProducedCount": "measurement-invalid",
        "escapeRightFairnessFailureCount": "measurement-invalid",
        "probeErrorCount": "measurement-invalid",
        "newTrainingEpisodes": "training-started",
        "newOptimizerUpdates": "training-started",
        "holdoutEpisodes": "holdout-consumed",
        "rewardChangeCount": "reward-change-drift",
        "telemetryChangeCount": "telemetry-change-drift",
        "runtimeChangeCount": "runtime-change-drift",
        "actionSurfaceChangeCount": "action-surface-change-drift",
    }
    for key, blocker in zero_blocker_map.items():
        if int(counts.get(key) or 0) != 0:
            blockers.append(blocker)
    if _forbidden_claim_open(source_claim_flags, allowed_extra={"phase93S2R6_99Allowed", "phase93S2R6_4Closed"}):
        blockers.append("forbidden-downstream-claim-open")
    return sorted(set(blockers))


def _result_class(active_blockers: Iterable[str], source_report: Mapping[str, Any]) -> str:
    blocker_set = set(active_blockers)
    if not blocker_set:
        return GREEN_RESULT
    source_result = str(source_report.get("resultClass") or "")
    if source_result in ALLOWED_RESULT_CLASSES and source_result != GREEN_RESULT:
        return source_result
    for blocker, result_class in (
        ("action-surface-lineage-invalidated", "action-surface-lineage-invalidated"),
        ("full-matrix-seed-startstate-required", "full-matrix-seed-startstate-required"),
        ("retained-v2-seed-startstate-required", "retained-v2-seed-startstate-required"),
        ("minimum-window-contract-required", "minimum-window-contract-required"),
        ("predicate-contract-required", "predicate-contract-required"),
        ("metric-sampling-contract-required", "metric-sampling-contract-required"),
        ("source-files-not-ready", "measurement-invalid"),
        ("source-files-not-versioned", "measurement-invalid"),
        ("closure-not-opened-by-full-matrix-gate", "measurement-invalid"),
        ("closure-claim-flag-missing", "measurement-invalid"),
        ("forbidden-downstream-claim-open", "measurement-invalid"),
        ("direction-contract-source-invalid", "measurement-invalid"),
    ):
        if blocker in blocker_set:
            return result_class
    return "measurement-invalid"


def _claim_flags(green: bool) -> dict[str, bool]:
    return {
        "phase93S2R6Closed": bool(green),
        "phase93S2R6_99Allowed": False,
        "phase93S2R3_4RecheckAllowed": bool(green),
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
        "bt95HandoffAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignalAllowed": False,
        "ppoTrainingAllowed": False,
        "rewardChangeAllowed": False,
        "telemetryChangeAllowed": False,
        "runtimeChangeAllowed": False,
        "actionSurfaceChangeAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
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


def _blocking_status(green: bool) -> dict[str, str]:
    return {
        "phase93S2R3_4RecheckDecision": "allowed" if green else "blocked",
        "phase93S2R3_99Decision": "blocked",
        "bt93s2FreshRecheckDecision": "blocked",
        "bt93s2Phase4StartDecision": "blocked",
        "bt93tStartDecision": "blocked",
        "bt93uStartDecision": "blocked",
        "bt93wStartDecision": "blocked",
        "bt93oStartDecision": "blocked",
        "bt93xFullStartDecision": "blocked",
        "bt93pStartDecision": "blocked",
        "bt94aStartDecision": "blocked",
        "bt95HandoffDecision": "blocked",
        "candidateFreezePromoteRolloutDecision": "blocked",
        "ppoValidateDecision": "blocked",
    }


def _phase_coverage(
    *,
    green: bool,
    result_class: str,
    counts: Mapping[str, Any],
    source_files_ready: bool,
    source_files_versioned: bool,
    claim_flags: Mapping[str, Any],
    allow_next: list[str],
    opens_next: list[str],
    blocks_next: list[str],
) -> dict[str, Any]:
    field_contract_ok = bool(
        result_class in ALLOWED_RESULT_CLASSES
        and isinstance(claim_flags, Mapping)
        and isinstance(counts, Mapping)
        and isinstance(allow_next, list)
        and isinstance(opens_next, list)
        and isinstance(blocks_next, list)
    )
    only_recheck_open = bool(
        (green and opens_next == GREEN_OPEN_NEXT and claim_flags.get("phase93S2R3_4RecheckAllowed") is True)
        or (not green and opens_next == [] and claim_flags.get("phase93S2R3_4RecheckAllowed") is False)
    )
    forbidden_closed = not _forbidden_claim_open(claim_flags)
    full_zero_gate_ok = bool(
        counts.get("scenarioCount") == EXPECTED_SCENARIO_COUNT
        and counts.get("actionCount") == EXPECTED_ACTION_COUNT
        and counts.get("probeCount") == EXPECTED_PROBE_COUNT
        and counts.get("combinedRepairRowCount") == EXPECTED_COMBINED_REPAIR_ROWS
        and _zero_counts(counts)
    )
    return {
        "93S2R6.99.1": bool(source_files_ready and source_files_versioned and result_class in ALLOWED_RESULT_CLASSES),
        "93S2R6.99.2": field_contract_ok,
        "93S2R6.99.3": bool(forbidden_closed and only_recheck_open),
        "93S2R6.99.4": True,
        "DoD.S2R6-11": bool(source_files_ready and source_files_versioned and field_contract_ok and forbidden_closed and only_recheck_open),
        "DoD.S2R6-12": "covered-by-external-meta-gate",
        "fullMatrixPredicateGateGreen": full_zero_gate_ok,
    }


def build_report() -> dict[str, Any]:
    source_report = _read_json(full_gate.REPORT_PATH)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item.get("required") is True]
    source_files_ready = all(item.get("fresh") is True for item in required_sources)
    source_files_versioned = all(item.get("tracked") is True for item in required_sources)
    counts = _compact_counts(source_report)
    active_blockers = _active_blockers(
        source_report=source_report,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
    )
    result_class = _result_class(active_blockers, source_report)
    green = result_class == GREEN_RESULT and not active_blockers
    claim_flags = _claim_flags(green)
    allow_next = [
        "93S2R3.4-Recheck: rerun the empirical zero gate on the S2R6-repaired full matrix"
    ] if green else []
    opens_next = list(GREEN_OPEN_NEXT) if green else []
    blocks_next = list(dict.fromkeys(DOWNSTREAM_BLOCKS))
    phase_coverage = _phase_coverage(
        green=green,
        result_class=result_class,
        counts=counts,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        claim_flags=claim_flags,
        allow_next=allow_next,
        opens_next=opens_next,
        blocks_next=blocks_next,
    )
    closure_ok = bool(
        all(value is True for key, value in phase_coverage.items() if key != "DoD.S2R6-12")
        and phase_coverage["DoD.S2R6-12"] == "covered-by-external-meta-gate"
    )
    gate_passed = bool(closure_ok and green)
    if not closure_ok:
        result_class = "measurement-invalid"
        gate_passed = False
        claim_flags = _claim_flags(False)
        allow_next = []
        opens_next = []
    recommendations = [
        {
            "rank": "1",
            "action": "Claim fresh 93S2R3.4-Recheck via /fix-planung.",
            "why": "BT93S2R6.99 closes the full 9-scenario/13-action/338-probe predicate, retained-v2 and minimum-window repair with all required zero-count gates.",
        },
        {
            "rank": "2",
            "action": "Keep 93S2R3.99, BT93S2.3-Recheck, 93S2.4 and BT93T/U/W/O/P/94A closed until the fresh S2R3.4-Recheck proves measurement validity.",
            "why": "S2R6 green proves only measurement validity; it is not action quality, reward ordering, safety, PPO quality, candidate, holdout, runtime-load, or rollout evidence.",
        },
    ] if gate_passed else [
        {
            "rank": "1",
            "action": f"Stop and prepare a narrow S2R6 follow-up for {result_class}.",
            "why": "A red S2R6.99 opens no recheck, training, candidate, or rollout path.",
        }
    ]
    next_allowed_actions = [
        "Run /fix-planung for fresh 93S2R3.4-Recheck.",
        "Do not start 93S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, candidate, freeze, holdout, promote, rollout, PPO-Validate or BT95 from this closure.",
    ] if gate_passed else [
        f"Repair narrow blocker class {result_class}.",
        "Do not start any downstream recheck, training, candidate, or rollout path.",
    ]
    invalidations = [
        {
            "scope": "93S2R3.99",
            "active": True,
            "reason": "S2R6 green opens only a fresh 93S2R3.4-Recheck; S2R3.99 needs that recheck green first.",
        },
        {
            "scope": "BT93S2.3-Recheck and 93S2.4",
            "active": True,
            "reason": "S2R6 closure is an interposer closure, not final S2R3 matrix-control reentry.",
        },
        {
            "scope": "BT93T/U/W/O/P/94A and Candidate/Freeze/Holdout/Promote/Rollout/PPO-Validate/BT95",
            "active": True,
            "reason": "No PPO training, holdout, reward ordering, action quality, safety, runtime-load, or promotion evidence was produced.",
        },
    ]
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r6-closure-gate-report-v1",
        "ok": closure_ok,
        "gatePassed": gate_passed,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
        "matrixId": source_report.get("matrixId"),
        "contractId": source_report.get("contractId"),
        "repairContractId": source_report.get("repairContractId"),
        "actionSurfaceId": source_report.get("actionSurfaceId"),
        "decoderHash": source_report.get("decoderHash"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResultClasses": _source_result_classes(source_artifacts),
        "sourceGate": {
            "path": _rel(full_gate.REPORT_PATH),
            "resultClass": source_report.get("resultClass"),
            "ok": source_report.get("ok"),
            "opensNext": source_report.get("opensNext"),
            "allowNext": source_report.get("allowNext"),
            "reportHash": source_report.get("reportHash"),
        },
        "sourceLocks": {
            "sourceHashes": _source_hashes(source_artifacts),
            "fullMatrixGateReportHash": source_report.get("reportHash"),
            "empiricalRowsHash": source_report.get("empiricalRowsHash"),
            "s2r6RepairReportHash": _read_json(repair.REPORT_PATH).get("reportHash"),
            "s2r6RepairContractReportHash": _read_json(repair_contract.REPORT_PATH).get("reportHash"),
            "oldRedReportsRemainHistoricalContext": True,
        },
        "measurementContract": {
            "scenarioCountMustBe": EXPECTED_SCENARIO_COUNT,
            "actionCountMustBe": EXPECTED_ACTION_COUNT,
            "probeCountMustBe": EXPECTED_PROBE_COUNT,
            "s2r6RepairRowsMustBe": EXPECTED_S2R6_REPAIR_ROWS,
            "combinedRepairRowsMustBe": EXPECTED_COMBINED_REPAIR_ROWS,
            "greenOpensOnly": list(GREEN_OPEN_NEXT),
            "downstreamQualityClaimsAllowed": False,
            "trainingOrHoldoutAllowed": False,
        },
        "sampleCounts": counts,
        "rowResultCounts": source_report.get("rowResultCounts"),
        "issueCounts": source_report.get("issueCounts"),
        "activeBlockers": active_blockers,
        "phaseCoverage": phase_coverage,
        "claimFlags": claim_flags,
        "blockingStatus": _blocking_status(gate_passed),
        "guardrails": _guardrails(),
        "allowNext": allow_next,
        "opensNext": opens_next,
        "blocksNext": blocks_next,
        "invalidations": invalidations,
        "recommendations": recommendations,
        "nextAllowedActions": next_allowed_actions,
        "summary": {
            "finalResult": result_class,
            "bt93s2r6ClosedGreen": gate_passed,
            "bt93s2r6ClosedRed": not gate_passed,
            "blockersRemain": active_blockers,
            "nextBestAction": "93S2R3.4-Recheck" if gate_passed else f"narrow follow-up for {result_class}",
        },
        "commands": {
            "write": "python python/scripts/bt93s2r6_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "closure consumes versioned S2R6 gate evidence; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    recommendations = _as_list(report.get("recommendations"))
    rec_rows = "\n".join(
        f"- {item.get('action')} Warum: {item.get('why')}"
        for item in recommendations
        if isinstance(item, Mapping)
    )
    return f"""<!-- BT93S2R6.99-START -->
## 93S2R6.99 Closure

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`, `gatePassed={report.get('gatePassed')}`
- Full Matrix: `{counts.get('scenarioCount')}` scenarios x `{counts.get('actionCount')}` actions = `{counts.get('probeCount')}` probes
- Materialisierte Repairs: S2R5 `{counts.get('s2r5RepairRowCount')}`, S2R6 `{counts.get('s2r6RepairRowCount')}`, kombiniert `{counts.get('combinedRepairRowCount')}`
- Null-Counts: predicate=`{counts.get('predicateFailureCount')}`, window=`{counts.get('minimumWindowFailureCount')}`, measurement=`{counts.get('measurementInvalidCount')}`, retainedV2=`{counts.get('retainedV2MeasurementInvalidCount')}`, direction=`{counts.get('directionMismatchCount')}`, fairness=`{counts.get('escapeRightFairnessFailureCount')}`, neutral=`{counts.get('neutralControlRequiredCount')}`, negative=`{counts.get('negativeControlFailedCount')}`
- Training/Holdout/Optimizer: `{counts.get('newTrainingEpisodes')}` / `{counts.get('holdoutEpisodes')}` / `{counts.get('newOptimizerUpdates')}`
- OpensNext: `{report.get('opensNext')}`

S2R6.99 schliesst nur die Full-Matrix Predicate-/PreAction-, retained-v2- und
Minimum-Window-Messgueltigkeit. Gruen oeffnet ausschliesslich einen frischen
`93S2R3.4-Recheck`; `93S2R3.99`, `BT93S2.3-Recheck`, `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate, BT95 und produktive Runtime bleiben geschlossen.

Evidence:

- `data/training/ppo/bt93s2r6/bt93s2r6_closure_gate_report.json`
- Command: `python python/scripts/bt93s2r6_closure_gate.py --write-report`

Naechster Schritt:

{rec_rows}
<!-- BT93S2R6.99-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R6.99-START -->"
    end = "<!-- BT93S2R6.99-END -->"
    text = path.read_text(encoding="utf-8") if path.is_file() else ""
    if start in text and end in text:
        before = text.split(start, 1)[0]
        after = text.split(end, 1)[1]
        text = before + section + after
    else:
        if text and not text.endswith("\n"):
            text += "\n"
        text += "\n" + section
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write closure JSON and Fehlerbericht.")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(CLOSURE_REPORT_PATH, report)
        _write_doc_section(DOC_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "gatePassed": report["gatePassed"],
                "resultClass": report["resultClass"],
                "activeBlockers": report["activeBlockers"],
                "sampleCounts": report["sampleCounts"],
                "phaseCoverage": report["phaseCoverage"],
                "opensNext": report["opensNext"],
                "report": _rel(CLOSURE_REPORT_PATH) if args.write_report else None,
                "doc": _rel(DOC_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
