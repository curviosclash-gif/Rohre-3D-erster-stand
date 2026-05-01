"""BT93S2R4.5 full replacement preflight gate.

This phase starts only after BT93S2R5.99 closed green. It reruns the full
S2R5-repaired replay contract and translates the result back into the S2R4
gate language. A green result may only open the S2R4 closure; S2R3 reentry is
only prepared and remains blocked until BT93S2R4.99 closes green.
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
for path in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import bt93s2r4_predicate_window_stable_replay as stable_replay  # noqa: E402
import bt93s2r5_closure_gate as s2r5_closure  # noqa: E402
import bt93s2r5_predicate_preaction_empirical_gate as s2r5_empirical  # noqa: E402
import bt93s2r5_predicate_preaction_failure_ledger as ledger  # noqa: E402
import bt93s2r5_predicate_preaction_repair as repair  # noqa: E402
import bt93s2r5_predicate_preaction_repair_contract as repair_contract  # noqa: E402


BLOCK_ID = "BT93S2R4"
PHASE_ID = "93S2R4.5"
GREEN_RESULT = "replay-startstate-green"
S2R5_GREEN_RESULT = "predicate-window-repair-green"
ALLOWED_RESULT_CLASSES = {
    GREEN_RESULT,
    "replay-determinism-required",
    "env-reset-required",
    "warmup-contract-required",
    "seed-rng-required",
    "headless-runner-required",
    "hash-recipe-required",
    "predicate-window-required",
    "action-surface-lineage-invalidated",
    "measurement-invalid",
}

SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r4_full_replay_preflight_gate.py"
REPORT_PATH = stable_replay.BT93S2R4_ROOT / "full_replay_preflight_gate.json"

EXPECTED_ROW_COUNT = stable_replay.EXPECTED_ROW_COUNT
LOCKED_REPEAT_COUNT = stable_replay.LOCKED_REPAIR_REPEAT_COUNT
EXPECTED_REPLAY_ATTEMPT_COUNT = EXPECTED_ROW_COUNT * LOCKED_REPEAT_COUNT
EXPECTED_REPAIRED_ROW_COUNT = s2r5_empirical.EXPECTED_REPAIRED_ROW_COUNT

IMMEDIATE_GREEN_NEXT = ["93S2R4.99 Closure"]
EVENTUAL_GREEN_NEXT = ["93S2R3.3-Reentry"]
DOWNSTREAM_BLOCKS = [
    "93S2R3.3-Reentry before BT93S2R4.99 replay-startstate-green",
    "BT93S2.3-Recheck before all S2R reentries are green",
    "93S2.4 start before measurementValid=true",
    "BT93T/U/W/O/P/94A before S2R4/S2R3/S2 gates",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "PPO training",
    "reward fix from BT93S2R4.5",
    "telemetry fix from BT93S2R4.5",
    "action-surface change from BT93S2R4.5",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
    "s2r5Closure": (
        s2r5_closure.CLOSURE_REPORT_PATH,
        "BT93S2R5.99 green closure that opens only 93S2R4.5",
        {
            "blockId": "BT93S2R5",
            "phaseId": "93S2R5.99",
            "resultClass": S2R5_GREEN_RESULT,
            "ok": True,
            "gatePassed": True,
            "sampleCounts.contractRowCount": EXPECTED_ROW_COUNT,
            "sampleCounts.replayAttemptCount": EXPECTED_REPLAY_ATTEMPT_COUNT,
            "sampleCounts.predicateFailureCount": 0,
            "sampleCounts.measurementInvalidBeforeActionCount": 0,
            "sampleCounts.minimumWindowFailureCount": 0,
            "sampleCounts.warmupTerminalBeforeActionCount": 0,
            "claimFlags.phase93S2R4_5Allowed": True,
            "claimFlags.phase93S2R4_99Allowed": False,
        },
        True,
    ),
    "s2r5EmpiricalGate": (
        s2r5_empirical.REPORT_PATH,
        "BT93S2R5.4 full repaired empirical gate",
        {
            "blockId": "BT93S2R5",
            "phaseId": "93S2R5.4",
            "resultClass": S2R5_GREEN_RESULT,
            "ok": True,
            "sampleCounts.contractRowCount": EXPECTED_ROW_COUNT,
            "sampleCounts.replayAttemptCount": EXPECTED_REPLAY_ATTEMPT_COUNT,
            "sampleCounts.predicateFailureCount": 0,
            "sampleCounts.measurementInvalidBeforeActionCount": 0,
            "sampleCounts.minimumWindowFailureCount": 0,
            "sampleCounts.warmupTerminalBeforeActionCount": 0,
            "sampleCounts.replaySpecIdRepeatMismatchCount": 0,
            "sampleCounts.startMetricsHashRepeatMismatchCount": 0,
            "sampleCounts.warmupKeyRepeatMismatchCount": 0,
            "sampleCounts.sessionIdDriftCount": 0,
            "claimFlags.phase93S2R5_99Allowed": True,
        },
        True,
    ),
    "s2r5RepairReport": (
        repair.REPORT_PATH,
        "BT93S2R5.3 repaired seed/start-state contract",
        {
            "blockId": "BT93S2R5",
            "phaseId": "93S2R5.3",
            "resultClass": "predicate-preaction-repair-applied",
            "ok": True,
            "sampleCounts.repairedRowCount": EXPECTED_REPAIRED_ROW_COUNT,
            "sampleCounts.candidateFailCount": 0,
            "sampleCounts.predicateChangedCount": 0,
            "sampleCounts.warmupChangedCount": 0,
        },
        True,
    ),
    "s2r5RepairContract": (
        repair_contract.REPORT_PATH,
        "BT93S2R5.2 locked repair contract",
        {
            "blockId": "BT93S2R5",
            "phaseId": "93S2R5.2",
            "resultClass": "predicate-preaction-repair-contract-written",
            "ok": True,
            "sampleCounts.repairDecisionCount": 4,
            "sampleCounts.unknownRootCauseCount": 0,
            "sampleCounts.ambiguousPrimaryClassCount": 0,
        },
        True,
    ),
    "s2r5FailureLedger": (
        ledger.REPORT_PATH,
        "BT93S2R5.1 failure ledger",
        {
            "blockId": "BT93S2R5",
            "phaseId": "93S2R5.1",
            "resultClass": "predicate-preaction-failure-ledger-written",
            "ok": True,
            "sampleCounts.failureLedgerRowCount": EXPECTED_REPAIRED_ROW_COUNT,
        },
        True,
    ),
    "s2r4IdentityContract": (
        stable_replay.IDENTITY_CONTRACT_PATH,
        "BT93S2R4.2 replay identity contract",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R4.2",
            "resultClass": "replay-identity-contract-green",
            "ok": True,
            "sampleCounts.contractRowCount": EXPECTED_ROW_COUNT,
            "sampleCounts.lockedRepairRepeatCount": LOCKED_REPEAT_COUNT,
        },
        True,
    ),
    "s2r4DeterministicResetRepair": (
        stable_replay.DETERMINISTIC_RESET_REPORT_PATH,
        "BT93S2R4.3 deterministic reset/warmup repair",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R4.3",
            "resultClass": "deterministic-reset-warmup-repair-green",
            "ok": True,
            "sampleCounts.replayAttemptCount": EXPECTED_REPLAY_ATTEMPT_COUNT,
            "sampleCounts.replaySpecIdRepeatMismatchCount": 0,
            "sampleCounts.startMetricsHashRepeatMismatchCount": 0,
            "sampleCounts.warmupKeyRepeatMismatchCount": 0,
            "sampleCounts.sessionIdDriftCount": 0,
        },
        True,
    ),
    "s2r4StableReplayRed": (
        stable_replay.REPORT_PATH,
        "red BT93S2R4.4 stable replay predicate/window report",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R4.4",
            "resultClass": "predicate-window-required",
            "sampleCounts.contractRowCount": EXPECTED_ROW_COUNT,
            "sampleCounts.predicateFailureCount": EXPECTED_REPAIRED_ROW_COUNT,
            "sampleCounts.measurementInvalidBeforeActionCount": EXPECTED_REPAIRED_ROW_COUNT,
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
        },
        True,
    ),
    "actionSurface": (ledger.ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
    "pythonEnv": (ledger.ENV_PATH, "Python sidecar environment, read-only", {}, True),
    "headlessRunner": (ledger.HEADLESS_RUNNER_PATH, "JS-authoritative headless path, read-only", {}, True),
    "fullPreflightScript": (SCRIPT_PATH, "BT93S2R4.5 report generator", {}, False),
}


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
    expected: Mapping[str, Any],
    tracked: set[str],
    *,
    required: bool = True,
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


def _gate_zero_counts(counts: Mapping[str, Any]) -> bool:
    keys = (
        "predicateFailureCount",
        "measurementInvalidBeforeActionCount",
        "minimumWindowFailureCount",
        "warmupTerminalBeforeActionCount",
        "replaySpecIdRepeatMismatchCount",
        "startMetricsHashRepeatMismatchCount",
        "warmupKeyRepeatMismatchCount",
        "sessionIdDriftCount",
        "repairedStartMetricsHashMismatchCount",
        "repairedWarmupKeyMismatchCount",
        "probeErrorCount",
        "actionEffectOverrideCount",
        "actionSurfaceLineageInvalidatedCount",
    )
    return all(counts.get(key) == 0 for key in keys)


def _compact_counts(empirical: Mapping[str, Any]) -> dict[str, Any]:
    counts = _as_mapping(empirical.get("sampleCounts"))
    keys = (
        "contractRowCount",
        "expectedContractRowCount",
        "sourceStableReplayRowCount",
        "sourceStableReplayPredicateFailureCount",
        "sourceStableReplayMeasurementInvalidBeforeActionCount",
        "repairedRowCount",
        "expectedRepairedRowCount",
        "repeatCount",
        "replayAttemptCount",
        "expectedReplayAttemptCount",
        "replaySpecIdRepeatMismatchCount",
        "startMetricsHashRepeatMismatchCount",
        "warmupKeyRepeatMismatchCount",
        "sessionIdDriftCount",
        "predicateFailureCount",
        "measurementInvalidBeforeActionCount",
        "minimumWindowFailureCount",
        "warmupTerminalBeforeActionCount",
        "probeErrorCount",
        "repairedStartMetricsHashMismatchCount",
        "repairedWarmupKeyMismatchCount",
        "escapeRightFairnessFailureCount",
        "neutralControlRequiredCount",
        "actionEffectOverrideCount",
        "actionQualityJudgementProducedCount",
        "directionJudgementProducedCount",
        "rewardJudgementProducedCount",
        "actionSurfaceLineageInvalidatedCount",
        "actionSurfaceChangeCount",
        "rewardChangeCount",
        "telemetryChangeCount",
        "runtimeChangeCount",
        "holdoutEpisodes",
        "newTrainingEpisodes",
        "newOptimizerUpdates",
    )
    return {key: counts.get(key) for key in keys if key in counts}


def _active_blockers(
    *,
    empirical: Mapping[str, Any],
    s2r5_closure_report: Mapping[str, Any],
    source_files_ready: bool,
    source_files_versioned: bool,
) -> list[str]:
    counts = _compact_counts(empirical)
    blockers: list[str] = []
    if not source_files_ready:
        blockers.append("source-files-not-ready")
    if not source_files_versioned:
        blockers.append("source-files-not-versioned")
    if s2r5_closure_report.get("resultClass") != S2R5_GREEN_RESULT or s2r5_closure_report.get("gatePassed") is not True:
        blockers.append("s2r5-closure-not-green")
    if empirical.get("resultClass") != S2R5_GREEN_RESULT or empirical.get("ok") is not True:
        blockers.append("s2r5-full-empirical-not-green")
    if counts.get("contractRowCount") != EXPECTED_ROW_COUNT:
        blockers.append("contract-row-count-invalid")
    if counts.get("repairedRowCount") != EXPECTED_REPAIRED_ROW_COUNT:
        blockers.append("repaired-row-count-invalid")
    if counts.get("replayAttemptCount", 0) < EXPECTED_REPLAY_ATTEMPT_COUNT:
        blockers.append("replay-attempt-count-too-low")
    zero_blocker_map = {
        "replaySpecIdRepeatMismatchCount": "replay-determinism-required",
        "sessionIdDriftCount": "headless-runner-required",
        "startMetricsHashRepeatMismatchCount": "env-reset-required",
        "warmupKeyRepeatMismatchCount": "warmup-contract-required",
        "repairedStartMetricsHashMismatchCount": "seed-rng-required",
        "repairedWarmupKeyMismatchCount": "warmup-contract-required",
        "predicateFailureCount": "predicate-window-required",
        "measurementInvalidBeforeActionCount": "predicate-window-required",
        "minimumWindowFailureCount": "predicate-window-required",
        "warmupTerminalBeforeActionCount": "warmup-contract-required",
        "probeErrorCount": "measurement-invalid",
        "actionEffectOverrideCount": "action-effect-overrode-preflight",
        "actionSurfaceLineageInvalidatedCount": "action-surface-lineage-invalidated",
        "actionQualityJudgementProducedCount": "action-quality-judgement-produced",
        "directionJudgementProducedCount": "direction-judgement-produced",
        "rewardJudgementProducedCount": "reward-judgement-produced",
    }
    for key, blocker in zero_blocker_map.items():
        if counts.get(key) not in (0, None):
            blockers.append(blocker)
    return sorted(set(blockers))


def _result_class(blockers: Iterable[str]) -> str:
    blockers_set = set(blockers)
    if not blockers_set:
        return GREEN_RESULT
    for blocker, result_class in (
        ("source-files-not-ready", "measurement-invalid"),
        ("source-files-not-versioned", "measurement-invalid"),
        ("contract-row-count-invalid", "measurement-invalid"),
        ("repaired-row-count-invalid", "measurement-invalid"),
        ("replay-attempt-count-too-low", "measurement-invalid"),
        ("probeErrorCount", "measurement-invalid"),
        ("action-surface-lineage-invalidated", "action-surface-lineage-invalidated"),
        ("replay-determinism-required", "replay-determinism-required"),
        ("headless-runner-required", "headless-runner-required"),
        ("env-reset-required", "env-reset-required"),
        ("warmup-contract-required", "warmup-contract-required"),
        ("seed-rng-required", "seed-rng-required"),
        ("predicate-window-required", "predicate-window-required"),
    ):
        if blocker in blockers_set:
            return result_class
    return "measurement-invalid"


def _claim_flags(ok: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    flags["phase93S2R3_3ReentryAllowed"] = False
    flags["phase93S2R3_3ReentryPrepared"] = bool(ok)
    flags["phase93S2R4_5Allowed"] = False
    flags["phase93S2R4_99Allowed"] = bool(ok)
    flags["phase93S2R5_2Allowed"] = False
    flags["phase93S2R5_3Allowed"] = False
    flags["phase93S2R5_4Allowed"] = False
    flags["phase93S2R5_99Allowed"] = False
    flags["bt93s2FreshRecheckAllowed"] = False
    flags["phase93S2_4Allowed"] = False
    flags["bt93tClaimable"] = False
    flags["bt93uClaimable"] = False
    flags["bt93vClaimable"] = False
    flags["bt93wClaimable"] = False
    flags["bt93oClaimable"] = False
    flags["bt93xFullClaimAllowed"] = False
    flags["bt93pClaimable"] = False
    flags["bt94aClaimable"] = False
    flags["candidateRunsAllowed"] = False
    flags["freezeAllowed"] = False
    flags["holdoutAllowed"] = False
    flags["promoteAllowed"] = False
    flags["rolloutAllowed"] = False
    flags["ppoValidateSignalAllowed"] = False
    flags["bt95HandoffAllowed"] = False
    flags["ppoTrainingAllowed"] = False
    flags["rewardChangeAllowed"] = False
    flags["telemetryChangeAllowed"] = False
    flags["actionSurfaceChangeAllowed"] = False
    flags["runtimeChangeAllowed"] = False
    flags["envConditionalWriteAllowed"] = False
    flags["runnerConditionalWriteAllowed"] = False
    return flags


def _blocking_status(ok: bool) -> dict[str, str]:
    return {
        "phase93S2R4_99Decision": "allowed" if ok else "blocked",
        "phase93S2R3_3ReentryDecision": "blocked-until-BT93S2R4.99",
        "bt93s2FreshRecheckDecision": "blocked",
        "bt93s2Phase4StartDecision": "blocked",
        "bt93tStartDecision": "blocked",
        "bt93uStartDecision": "blocked",
        "bt93vStartDecision": "blocked",
        "bt93wStartDecision": "blocked",
        "bt93oStartDecision": "blocked",
        "bt93xFullStartDecision": "blocked",
        "bt93pStartDecision": "blocked",
        "bt94aStartDecision": "blocked",
        "candidateFreezePromoteRolloutDecision": "blocked",
        "ppoValidateDecision": "blocked",
        "bt95HandoffDecision": "blocked",
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newOptimizerUpdates": 0,
        "newTrainingEpisodes": 0,
        "holdoutUsed": False,
        "holdoutEpisodes": 0,
        "candidateRun": False,
        "freezeCandidate": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "actionEffectEvaluated": False,
        "actionEffectOverrideCount": 0,
        "qualityClaimAllowed": False,
    }


def _phase_coverage(
    *,
    ok: bool,
    result_class: str,
    counts: Mapping[str, Any],
    blockers: list[str],
) -> dict[str, Any]:
    full_count_green = bool(
        counts.get("contractRowCount") == EXPECTED_ROW_COUNT
        and counts.get("replayAttemptCount", 0) >= EXPECTED_REPLAY_ATTEMPT_COUNT
        and counts.get("repeatCount") == LOCKED_REPEAT_COUNT
    )
    zero_gate_green = _gate_zero_counts(counts)
    no_downstream_green = bool(
        counts.get("actionEffectOverrideCount") == 0
        and counts.get("actionQualityJudgementProducedCount") == 0
        and counts.get("directionJudgementProducedCount") == 0
        and counts.get("rewardJudgementProducedCount") == 0
        and counts.get("holdoutEpisodes") == 0
        and counts.get("newTrainingEpisodes") == 0
        and counts.get("newOptimizerUpdates") == 0
    )
    return {
        "93S2R4.5.1": bool(full_count_green and zero_gate_green and not blockers),
        "93S2R4.5.2": bool(ok and no_downstream_green),
        "93S2R4.5.3": bool(result_class in ALLOWED_RESULT_CLASSES and (ok or not blockers == [])),
        "DoD.S2R4-8": full_count_green,
        "DoD.S2R4-9": no_downstream_green,
    }


def build_report(*, reuse_source_report: bool = False) -> dict[str, Any]:
    source_artifacts = _source_artifacts()
    source_files_ready = all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)
    source_files_versioned = all(item.get("tracked") is True for item in source_artifacts if item.get("required") is True)
    s2r5_closure_report = _read_json(s2r5_closure.CLOSURE_REPORT_PATH)
    stored_empirical_report = _read_json(s2r5_empirical.REPORT_PATH)
    empirical_report = stored_empirical_report if reuse_source_report else s2r5_empirical.build_report()
    counts = _compact_counts(empirical_report)
    blockers = _active_blockers(
        empirical=empirical_report,
        s2r5_closure_report=s2r5_closure_report,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
    )
    result_class = _result_class(blockers)
    ok = bool(result_class == GREEN_RESULT)
    rows = _as_list(empirical_report.get("empiricalRows"))
    row_class_counts = Counter(str(row.get("resultClass")) for row in rows if isinstance(row, Mapping))
    issue_counts = Counter(
        str(issue)
        for row in rows
        if isinstance(row, Mapping)
        for issue in _as_list(row.get("issues"))
    )
    phase_coverage = _phase_coverage(ok=ok, result_class=result_class, counts=counts, blockers=blockers)
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r4-full-replay-preflight-gate-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
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
        "sourceResultClasses": _source_result_classes(source_artifacts),
        "sourceLocks": {
            "currentSourceHashes": _source_hashes(source_artifacts),
            "s2r5ClosureReportHash": s2r5_closure_report.get("reportHash"),
            "storedS2R5EmpiricalReportHash": stored_empirical_report.get("reportHash"),
            "freshS2R5EmpiricalRowsHash": empirical_report.get("empiricalRowsHash"),
            "freshFullGateRerun": not reuse_source_report,
            "repairedRowsMaterializedIntoFullContract": True,
            "predicateFunction": ledger.PREDICATE_FUNCTION,
        },
        "measurementContract": {
            "fullContractRows": EXPECTED_ROW_COUNT,
            "repeatCount": LOCKED_REPEAT_COUNT,
            "minimumReplayAttemptCount": EXPECTED_REPLAY_ATTEMPT_COUNT,
            "repairedRowsFromS2R5": EXPECTED_REPAIRED_ROW_COUNT,
            "requiresBT93S2R5_99PredicateWindowRepairGreen": True,
            "predicateMustPassBeforeMeasurement": True,
            "minimumWindowMustPass": True,
            "warmupTerminalBeforeActionAllowed": False,
            "measurementInvalidBeforeActionMustBeZero": True,
            "actionEffectCanOverridePreflightFailure": False,
            "actionEffectJudgementEvaluated": False,
        },
        "sampleCounts": counts,
        "rowResultCounts": dict(sorted(row_class_counts.items())),
        "issueCounts": dict(sorted(issue_counts.items())),
        "activeBlockers": blockers,
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(ok),
        "blockingStatus": _blocking_status(ok),
        "guardrails": _guardrails(),
        "fullReplayRows": rows,
        "fullReplayRowsHash": _hash_value({"rows": rows}),
        "allowNext": list(IMMEDIATE_GREEN_NEXT) if ok else [],
        "opensNext": list(IMMEDIATE_GREEN_NEXT) if ok else [],
        "eventualOpensAfterClosure": list(EVENTUAL_GREEN_NEXT) if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R3.3-Reentry",
                "reason": "Prepared by this full gate but still blocked until BT93S2R4.99 closure is green.",
                "active": True,
            },
            {
                "scope": "BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A",
                "reason": "Full replay preflight is only measurement precondition evidence, not S2 action-quality or training evidence.",
                "active": True,
            },
            {
                "scope": "Candidate/Freeze/Holdout/Promote/Rollout/PPO-Validate/BT95",
                "reason": "No PPO training, holdout, candidate, runtime-load, or promotion evidence was produced.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R4.99 closure via /fix-planung.",
            "Keep 93S2R3.3-Reentry blocked until BT93S2R4.99 writes replay-startstate-green.",
            "Keep BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, candidate, freeze, holdout, promote, rollout, PPO-Validate and BT95 closed.",
        ]
        if ok
        else [
            f"Stop and repair the narrow S2R4 blocker class {result_class}.",
            "Do not start S2R4 closure or any downstream recheck/training/candidate path.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r4_full_replay_preflight_gate.py --write-report",
            "debugReuseSource": "python python/scripts/bt93s2r4_full_replay_preflight_gate.py --reuse-source-report",
            "nextPhase": "python python/scripts/bt93s2r4_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "phase gate executes 103 rows x 3 repeats; no PPO training or holdout consumption",
        },
        "summary": {
            "finalResult": result_class,
            "fullReplayPreflightGreen": ok,
            "blockersRemain": blockers,
            "nextBestAction": "93S2R4.99 closure" if ok else f"narrow follow-up for {result_class}",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write the report to data/training/ppo/bt93s2r4.")
    parser.add_argument(
        "--reuse-source-report",
        action="store_true",
        help="Do not rerun probes; validate the existing S2R5 empirical report instead.",
    )
    args = parser.parse_args()
    report = build_report(reuse_source_report=args.reuse_source_report)
    if args.write_report:
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report.get("ok"),
                "resultClass": report.get("resultClass"),
                "activeBlockers": report.get("activeBlockers"),
                "opensNext": report.get("opensNext"),
                "eventualOpensAfterClosure": report.get("eventualOpensAfterClosure"),
                "sampleCounts": report.get("sampleCounts"),
                "reportPath": _rel(REPORT_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") is True else 1


if __name__ == "__main__":
    raise SystemExit(main())
