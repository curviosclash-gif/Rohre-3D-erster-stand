"""BT93S2R4.99 closure gate.

Closes the replay/start-state repair block after the full replacement
preflight. A green closure may open only 93S2R3.3-Reentry. It must not open
BT93S2 recheck, 93S2.4, BT93T/U/W/O/P/94A, candidate, freeze, holdout,
promote, rollout, PPO-Validate, BT95 handoff, training, or runtime signals.
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

import bt93s2r4_full_replay_preflight_gate as full_gate  # noqa: E402
import bt93s2r4_predicate_window_stable_replay as stable_replay  # noqa: E402
import bt93s2r5_closure_gate as s2r5_closure  # noqa: E402
import bt93s2r5_predicate_preaction_empirical_gate as s2r5_empirical  # noqa: E402
import bt93s2r5_predicate_preaction_failure_ledger as ledger  # noqa: E402


BLOCK_ID = "BT93S2R4"
PHASE_ID = "93S2R4.99"
GREEN_RESULT = "replay-startstate-green"
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

SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r4_closure_gate.py"
CLOSURE_REPORT_PATH = stable_replay.BT93S2R4_ROOT / "bt93s2r4_closure_gate_report.json"

EXPECTED_ROW_COUNT = full_gate.EXPECTED_ROW_COUNT
EXPECTED_REPLAY_ATTEMPT_COUNT = full_gate.EXPECTED_REPLAY_ATTEMPT_COUNT
LOCKED_REPEAT_COUNT = full_gate.LOCKED_REPEAT_COUNT
EXPECTED_REPAIRED_ROW_COUNT = full_gate.EXPECTED_REPAIRED_ROW_COUNT

GREEN_OPEN_NEXT = ["93S2R3.3-Reentry"]
DOWNSTREAM_BLOCKS = [
    "93S2R3.4/99 before 93S2R3.3-Reentry is green",
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
    "reward fix from BT93S2R4.99",
    "telemetry fix from BT93S2R4.99",
    "action-surface change from BT93S2R4.99",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
    "s2r4FullPreflight": (
        full_gate.REPORT_PATH,
        "BT93S2R4.5 full replacement preflight",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R4.5",
            "resultClass": GREEN_RESULT,
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
            "claimFlags.phase93S2R4_99Allowed": True,
            "claimFlags.phase93S2R3_3ReentryPrepared": True,
        },
        True,
    ),
    "s2r5Closure": (
        s2r5_closure.CLOSURE_REPORT_PATH,
        "BT93S2R5.99 green closure",
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
    "s2r5EmpiricalGate": (
        s2r5_empirical.REPORT_PATH,
        "BT93S2R5.4 full repaired empirical gate",
        {
            "blockId": "BT93S2R5",
            "phaseId": "93S2R5.4",
            "resultClass": "predicate-window-repair-green",
            "ok": True,
            "sampleCounts.contractRowCount": EXPECTED_ROW_COUNT,
            "sampleCounts.replayAttemptCount": EXPECTED_REPLAY_ATTEMPT_COUNT,
            "sampleCounts.predicateFailureCount": 0,
            "sampleCounts.measurementInvalidBeforeActionCount": 0,
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
        "red BT93S2R4.4 predicate/window report",
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
    "closureScript": (SCRIPT_PATH, "BT93S2R4.99 closure generator", {}, False),
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


def _compact_counts(full_report: Mapping[str, Any]) -> dict[str, Any]:
    counts = _as_mapping(full_report.get("sampleCounts"))
    keys = [
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
    ]
    return {key: counts.get(key) for key in keys if key in counts}


def _gate_zero_counts(counts: Mapping[str, Any]) -> bool:
    zero_keys = [
        "predicateFailureCount",
        "measurementInvalidBeforeActionCount",
        "minimumWindowFailureCount",
        "warmupTerminalBeforeActionCount",
        "replaySpecIdRepeatMismatchCount",
        "startMetricsHashRepeatMismatchCount",
        "warmupKeyRepeatMismatchCount",
        "sessionIdDriftCount",
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
    ]
    return all(int(counts.get(key) or 0) == 0 for key in zero_keys)


def _forbidden_claim_open(claim_flags: Mapping[str, Any], *, allowed_extra: Iterable[str] = ()) -> bool:
    allowed = {"phase93S2R3_3ReentryAllowed", "phase93S2R3_3ReentryPrepared", *allowed_extra}
    return any(value is True for key, value in claim_flags.items() if key not in allowed)


def _active_blockers(
    *,
    full_report: Mapping[str, Any],
    source_files_ready: bool,
    source_files_versioned: bool,
) -> list[str]:
    counts = _compact_counts(full_report)
    claim_flags = _as_mapping(full_report.get("claimFlags"))
    blockers: list[str] = []
    if not source_files_ready:
        blockers.append("source-files-not-ready")
    if not source_files_versioned:
        blockers.append("source-files-not-versioned")
    if full_report.get("resultClass") != GREEN_RESULT or full_report.get("ok") is not True:
        result = str(full_report.get("resultClass") or "measurement-invalid")
        blockers.append(result if result in ALLOWED_RESULT_CLASSES else "measurement-invalid")
    if full_report.get("opensNext") != ["93S2R4.99 Closure"]:
        blockers.append("closure-not-opened-by-full-gate")
    if full_report.get("eventualOpensAfterClosure") != GREEN_OPEN_NEXT:
        blockers.append("reentry-not-prepared-by-full-gate")
    if claim_flags.get("phase93S2R4_99Allowed") is not True:
        blockers.append("closure-claim-flag-missing")
    if claim_flags.get("phase93S2R3_3ReentryPrepared") is not True:
        blockers.append("reentry-prepared-flag-missing")
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
        "newTrainingEpisodes": "training-started",
        "newOptimizerUpdates": "training-started",
        "holdoutEpisodes": "holdout-consumed",
    }
    for key, blocker in zero_blocker_map.items():
        if counts.get(key) not in (0, None):
            blockers.append(blocker)
    if _forbidden_claim_open(claim_flags, allowed_extra={"phase93S2R4_99Allowed"}):
        blockers.append("forbidden-downstream-claim-open")
    return sorted(set(blockers))


def _result_class(blockers: Iterable[str], full_report: Mapping[str, Any]) -> str:
    blockers_set = set(blockers)
    if not blockers_set:
        return GREEN_RESULT
    source_result = str(full_report.get("resultClass") or "")
    if source_result in ALLOWED_RESULT_CLASSES and source_result != GREEN_RESULT:
        return source_result
    for blocker, result_class in (
        ("source-files-not-ready", "measurement-invalid"),
        ("source-files-not-versioned", "measurement-invalid"),
        ("contract-row-count-invalid", "measurement-invalid"),
        ("repaired-row-count-invalid", "measurement-invalid"),
        ("replay-attempt-count-too-low", "measurement-invalid"),
        ("closure-not-opened-by-full-gate", "measurement-invalid"),
        ("reentry-not-prepared-by-full-gate", "measurement-invalid"),
        ("closure-claim-flag-missing", "measurement-invalid"),
        ("reentry-prepared-flag-missing", "measurement-invalid"),
        ("forbidden-downstream-claim-open", "measurement-invalid"),
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


def _claim_flags(green: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    for key in list(flags):
        flags[key] = False
    flags["phase93S2R3_3ReentryAllowed"] = bool(green)
    flags["phase93S2R3_3ReentryPrepared"] = bool(green)
    flags["phase93S2R4_99Allowed"] = False
    flags["phase93S2R4Closed"] = bool(green)
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


def _blocking_status(green: bool) -> dict[str, str]:
    return {
        "phase93S2R3_3ReentryDecision": "allowed" if green else "blocked",
        "phase93S2R3_4Decision": "blocked",
        "phase93S2R3_99Decision": "blocked",
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
        "actionEffectEvaluated": False,
        "actionEffectOverrideCount": 0,
        "qualityClaimAllowed": False,
    }


def _phase_coverage(
    *,
    green: bool,
    result_class: str,
    counts: Mapping[str, Any],
    source_files_ready: bool,
    source_files_versioned: bool,
    active_blockers: list[str],
    claim_flags: Mapping[str, Any],
) -> dict[str, Any]:
    field_contract_ok = bool(
        isinstance(claim_flags, Mapping)
        and isinstance(counts, Mapping)
        and result_class in ALLOWED_RESULT_CLASSES
        and "contractRowCount" in counts
        and "replayAttemptCount" in counts
    )
    full_zero_gate_ok = bool(
        counts.get("contractRowCount") == EXPECTED_ROW_COUNT
        and counts.get("replayAttemptCount", 0) >= EXPECTED_REPLAY_ATTEMPT_COUNT
        and counts.get("repeatCount") == LOCKED_REPEAT_COUNT
        and _gate_zero_counts(counts)
    )
    only_reentry_open = bool(
        (green and claim_flags.get("phase93S2R3_3ReentryAllowed") is True)
        or (not green and claim_flags.get("phase93S2R3_3ReentryAllowed") is False)
    )
    forbidden_closed = not _forbidden_claim_open(claim_flags, allowed_extra={"phase93S2R4Closed"})
    return {
        "93S2R4.99.1": bool(source_files_ready and source_files_versioned and result_class in ALLOWED_RESULT_CLASSES),
        "93S2R4.99.2": field_contract_ok,
        "93S2R4.99.3": bool(
            forbidden_closed
            and only_reentry_open
            and ((green and not active_blockers) or (not green and bool(active_blockers)))
        ),
        "93S2R4.99.4": True,
        "DoD.S2R4-10": field_contract_ok,
        "DoD.S2R4-11": bool(forbidden_closed and only_reentry_open),
        "DoD.S2R4-12": "covered-by-external-meta-gate",
        "fullReplayGateGreen": full_zero_gate_ok,
    }


def build_report() -> dict[str, Any]:
    full_report = _read_json(full_gate.REPORT_PATH)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item.get("required") is True]
    source_files_ready = all(item.get("fresh") is True for item in required_sources)
    source_files_versioned = all(item.get("tracked") is True for item in required_sources)
    counts = _compact_counts(full_report)
    active_blockers = _active_blockers(
        full_report=full_report,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
    )
    result_class = _result_class(active_blockers, full_report)
    green = result_class == GREEN_RESULT and not active_blockers
    claim_flags = _claim_flags(green)
    phase_coverage = _phase_coverage(
        green=green,
        result_class=result_class,
        counts=counts,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        active_blockers=active_blockers,
        claim_flags=claim_flags,
    )
    closure_ok = bool(
        all(value is True for key, value in phase_coverage.items() if key != "DoD.S2R4-12")
        and phase_coverage["DoD.S2R4-12"] == "covered-by-external-meta-gate"
    )
    gate_passed = bool(closure_ok and green)
    allow_next = list(GREEN_OPEN_NEXT) if gate_passed else []
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r4-closure-gate-report-v1",
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
        "matrixId": full_report.get("matrixId"),
        "contractId": full_report.get("contractId"),
        "repairContractId": full_report.get("repairContractId"),
        "actionSurfaceId": full_report.get("actionSurfaceId"),
        "decoderHash": full_report.get("decoderHash"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResultClasses": _source_result_classes(source_artifacts),
        "sourceGate": {
            "path": _rel(full_gate.REPORT_PATH),
            "resultClass": full_report.get("resultClass"),
            "ok": full_report.get("ok"),
            "opensNext": full_report.get("opensNext"),
            "eventualOpensAfterClosure": full_report.get("eventualOpensAfterClosure"),
            "reportHash": full_report.get("reportHash"),
        },
        "sourceLocks": {
            "currentSourceHashes": _source_hashes(source_artifacts),
            "fullPreflightReportHash": full_report.get("reportHash"),
            "fullReplayRowsHash": full_report.get("fullReplayRowsHash"),
            "sourceLocks": full_report.get("sourceLocks"),
        },
        "measurementContract": {
            "fullContractRows": EXPECTED_ROW_COUNT,
            "repeatCount": LOCKED_REPEAT_COUNT,
            "minimumReplayAttemptCount": EXPECTED_REPLAY_ATTEMPT_COUNT,
            "repairedRowsFromS2R5": EXPECTED_REPAIRED_ROW_COUNT,
            "greenOpensOnly": list(GREEN_OPEN_NEXT),
            "downstreamQualityClaimsAllowed": False,
            "actionEffectCanOverridePreflightFailure": False,
        },
        "sampleCounts": counts,
        "rowResultCounts": full_report.get("rowResultCounts"),
        "issueCounts": full_report.get("issueCounts"),
        "activeBlockers": active_blockers,
        "phaseCoverage": phase_coverage,
        "claimFlags": claim_flags,
        "blockingStatus": _blocking_status(gate_passed),
        "guardrails": _guardrails(),
        "allowNext": allow_next,
        "opensNext": allow_next,
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "BT93S2.3-Recheck and 93S2.4",
                "reason": "S2R4 closure opens only S2R3.3-Reentry; the S2 recheck still needs fresh S2R3 reentry evidence.",
                "active": True,
            },
            {
                "scope": "BT93T/U/W/O/P/94A",
                "reason": "Replay/start-state validity is not telemetry, reward ordering, safety, action quality, or training evidence.",
                "active": True,
            },
            {
                "scope": "Candidate/Freeze/Holdout/Promote/Rollout/PPO-Validate/BT95",
                "reason": "No PPO training, holdout, candidate, runtime-load, or promotion evidence was produced.",
                "active": True,
            },
        ],
        "recommendations": [
            {
                "rank": "1",
                "action": "Claim 93S2R3.3-Reentry via /fix-planung.",
                "why": "BT93S2R4.99 closes replay/start-state and predicate/window preconditions with 103 rows x 3 repeats and all required zero-count gates.",
            },
            {
                "rank": "2",
                "action": "Keep BT93S2.3-Recheck, 93S2.4 and BT93T/U/W/O/P/94A closed until the S2R3 reentry proves measurement validity.",
                "why": "This closure proves measurement preconditions only; it does not prove action quality, telemetry, reward ordering, safety, or PPO quality.",
            },
        ]
        if gate_passed
        else [
            {
                "rank": "1",
                "action": f"Stop and repair the narrow S2R4 blocker class {result_class}.",
                "why": "A red S2R4 closure opens no reentry, recheck, training, or candidate path.",
            }
        ],
        "nextAllowedActions": [
            "Run /fix-planung for 93S2R3.3-Reentry.",
            "Do not start BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, candidate, freeze, holdout, promote, rollout, PPO-Validate or BT95 from this closure.",
        ]
        if gate_passed
        else [
            f"Prepare a narrow follow-up for {result_class}.",
            "Do not start any downstream recheck, training, candidate, or rollout path.",
        ],
        "summary": {
            "finalResult": result_class,
            "bt93s2r4ClosedGreen": gate_passed,
            "bt93s2r4ClosedRed": not gate_passed,
            "blockersRemain": active_blockers,
            "nextBestAction": "93S2R3.3-Reentry" if gate_passed else f"narrow follow-up for {result_class}",
        },
        "commands": {
            "write": "python python/scripts/bt93s2r4_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write the closure JSON.")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(CLOSURE_REPORT_PATH, report)
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
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
