"""BT93S2R5.99 closure gate.

Closes the predicate/pre-action validity interposer after the green empirical
gate. A green closure may open only 93S2R4.5. It must not open S2R3 reentry,
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

import bt93s2r4_predicate_window_stable_replay as stable_replay  # noqa: E402
import bt93s2r5_predicate_preaction_empirical_gate as empirical_gate  # noqa: E402
import bt93s2r5_predicate_preaction_failure_ledger as ledger  # noqa: E402
import bt93s2r5_predicate_preaction_repair as repair  # noqa: E402
import bt93s2r5_predicate_preaction_repair_contract as repair_contract  # noqa: E402


BLOCK_ID = "BT93S2R5"
PHASE_ID = "93S2R5.99"
GREEN_RESULT = "predicate-window-repair-green"
RED_RESULTS = {
    "predicate-contract-required",
    "seed-startstate-required",
    "warmup-contract-required",
    "neutral-control-contract-required",
    "escape-right-fairness-predicate-required",
    "metric-sampling-contract-required",
    "scenario-contract-unrepairable",
    "action-surface-lineage-invalidated",
    "measurement-invalid",
}
ALLOWED_RESULT_CLASSES = {GREEN_RESULT, *RED_RESULTS}

SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r5_closure_gate.py"
CLOSURE_REPORT_PATH = ledger.BT93S2R5_ROOT / "bt93s2r5_closure_gate_report.json"
DOC_PATH = ledger.DOC_PATH

EXPECTED_ROW_COUNT = ledger.EXPECTED_SOURCE_ROW_COUNT
EXPECTED_REPAIRED_ROW_COUNT = ledger.EXPECTED_RED_ROW_COUNT
EXPECTED_REPLAY_ATTEMPT_COUNT = EXPECTED_ROW_COUNT * ledger.LOCKED_REPEAT_COUNT

GREEN_OPEN_NEXT = ["93S2R4.5"]
DOWNSTREAM_BLOCKS = [
    "BT93S2R4.99 before 93S2R4.5 green full gate",
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
    "reward fix from BT93S2R5.99",
    "telemetry fix from BT93S2R5.99",
    "action-surface change from BT93S2R5.99",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
    "s2r5EmpiricalGate": (
        empirical_gate.REPORT_PATH,
        "BT93S2R5.4 green empirical predicate/pre-action gate",
        {
            "blockId": BLOCK_ID,
            "phaseId": "93S2R5.4",
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
            "claimFlags.phase93S2R5_99Allowed": True,
        },
        True,
    ),
    "s2r5RepairReport": (
        repair.REPORT_PATH,
        "BT93S2R5.3 repaired seed/start-state contract",
        {
            "blockId": BLOCK_ID,
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
            "blockId": BLOCK_ID,
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
            "blockId": BLOCK_ID,
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
            "blockId": "BT93S2R4",
            "phaseId": "93S2R4.2",
            "resultClass": "replay-identity-contract-green",
            "ok": True,
            "sampleCounts.contractRowCount": EXPECTED_ROW_COUNT,
        },
        True,
    ),
    "s2r4StableReplay": (
        ledger.S2R4_STABLE_PATH,
        "red BT93S2R4.4 predicate/window report",
        {
            "blockId": "BT93S2R4",
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
    "closureScript": (SCRIPT_PATH, "BT93S2R5.99 closure generator", {}, False),
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


def _claim_flags(green: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    flags["phase93S2R5_2Allowed"] = False
    flags["phase93S2R5_3Allowed"] = False
    flags["phase93S2R5_4Allowed"] = False
    flags["phase93S2R5_99Allowed"] = False
    flags["phase93S2R4_5Allowed"] = bool(green)
    flags["phase93S2R4_99Allowed"] = False
    flags["phase93S2R3_3ReentryAllowed"] = False
    flags["bt93s2FreshRecheckAllowed"] = False
    return flags


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
        "qualityClaimAllowed": False,
        "actionEffectEvaluated": False,
        "actionEffectOverrideCount": 0,
    }


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
        "neutralControlRequiredCount",
        "escapeRightFairnessFailureCount",
        "probeErrorCount",
        "repairedStartMetricsHashMismatchCount",
        "repairedWarmupKeyMismatchCount",
        "actionSurfaceLineageInvalidatedCount",
        "actionQualityJudgementProducedCount",
        "directionJudgementProducedCount",
        "actionEffectOverrideCount",
        "newTrainingEpisodes",
        "newOptimizerUpdates",
        "holdoutEpisodes",
    ]
    return all(int(counts.get(key) or 0) == 0 for key in zero_keys)


def _active_blockers(empirical: Mapping[str, Any], source_files_ready: bool) -> list[str]:
    counts = _as_mapping(empirical.get("sampleCounts"))
    blockers: list[str] = []
    empirical_result = str(empirical.get("resultClass") or "measurement-invalid")
    if not source_files_ready:
        blockers.append("source-evidence-invalid")
    if empirical_result != GREEN_RESULT or empirical.get("ok") is not True:
        blockers.append(empirical_result if empirical_result in RED_RESULTS else "measurement-invalid")
    if int(counts.get("predicateFailureCount") or 0):
        blockers.append("predicate-contract-required")
    if int(counts.get("measurementInvalidBeforeActionCount") or 0):
        blockers.append("metric-sampling-contract-required")
    if int(counts.get("minimumWindowFailureCount") or 0):
        blockers.append("predicate-contract-required")
    if int(counts.get("warmupTerminalBeforeActionCount") or 0):
        blockers.append("warmup-contract-required")
    if int(counts.get("neutralControlRequiredCount") or 0):
        blockers.append("neutral-control-contract-required")
    if int(counts.get("escapeRightFairnessFailureCount") or 0):
        blockers.append("escape-right-fairness-predicate-required")
    if int(counts.get("actionSurfaceLineageInvalidatedCount") or 0):
        blockers.append("action-surface-lineage-invalidated")
    return sorted(set(blockers))


def _result_class(empirical: Mapping[str, Any], source_files_ready: bool) -> str:
    empirical_result = str(empirical.get("resultClass") or "measurement-invalid")
    if not source_files_ready or empirical_result not in ALLOWED_RESULT_CLASSES:
        return "measurement-invalid"
    return empirical_result


def _next_actions(result_class: str) -> tuple[list[str], list[str], list[dict[str, str]]]:
    if result_class == GREEN_RESULT:
        return (
            ["93S2R4.5: run the full replacement preflight on the S2R5-repaired contract"],
            list(GREEN_OPEN_NEXT),
            [
                {
                    "rank": "1",
                    "action": "Claim 93S2R4.5 via /fix-planung.",
                    "why": "S2R5 closed the predicate/pre-action blocker with 309/309 replay attempts and all required zero-count gates.",
                },
                {
                    "rank": "2",
                    "action": "Keep S2R3-Reentry, BT93S2-Recheck, 93S2.4 and BT93T/U/W/O/P/94A closed until S2R4.5 and BT93S2R4.99 are green.",
                    "why": "S2R5 proves only predicate/pre-action validity; it is not action quality, reward ordering, telemetry, training, or candidate evidence.",
                },
            ],
        )
    return (
        [f"Stop: repair narrow S2R5 blocker class {result_class}; do not start 93S2R4.5"],
        [],
        [
            {
                "rank": "1",
                "action": "Do not start 93S2R4.5 or any downstream training/candidate path.",
                "why": f"BT93S2R5.99 closes red as {result_class}.",
            },
            {
                "rank": "2",
                "action": "Prepare a narrow follow-up replan for the failing predicate/pre-action contract class.",
                "why": "A red S2R5 result opens nothing by contract.",
            },
        ],
    )


def _compact_counts(empirical: Mapping[str, Any]) -> dict[str, Any]:
    counts = _as_mapping(empirical.get("sampleCounts"))
    keys = [
        "contractRowCount",
        "repeatCount",
        "replayAttemptCount",
        "repairedRowCount",
        "predicateFailureCount",
        "measurementInvalidBeforeActionCount",
        "minimumWindowFailureCount",
        "warmupTerminalBeforeActionCount",
        "replaySpecIdRepeatMismatchCount",
        "startMetricsHashRepeatMismatchCount",
        "warmupKeyRepeatMismatchCount",
        "sessionIdDriftCount",
        "neutralControlRequiredCount",
        "escapeRightFairnessFailureCount",
        "noDangerControlRowCount",
        "escapeRightRowCount",
        "actionSurfaceLineageInvalidatedCount",
        "actionQualityJudgementProducedCount",
        "directionJudgementProducedCount",
        "actionEffectOverrideCount",
        "newTrainingEpisodes",
        "newOptimizerUpdates",
        "holdoutEpisodes",
    ]
    return {key: counts.get(key) for key in keys}


def build_report() -> dict[str, Any]:
    empirical = _read_json(empirical_gate.REPORT_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)
    source_files_versioned = all(
        item.get("tracked") is True for item in source_artifacts if item.get("required") is True
    )
    result_class = _result_class(empirical, source_files_ready)
    sample_counts = _compact_counts(empirical)
    counts = _as_mapping(empirical.get("sampleCounts"))
    green = (
        result_class == GREEN_RESULT
        and empirical.get("ok") is True
        and source_files_ready
        and source_files_versioned
        and _gate_zero_counts(counts)
        and int(counts.get("contractRowCount") or 0) == EXPECTED_ROW_COUNT
        and int(counts.get("replayAttemptCount") or 0) >= EXPECTED_REPLAY_ATTEMPT_COUNT
        and int(counts.get("repairedRowCount") or 0) == EXPECTED_REPAIRED_ROW_COUNT
    )
    claim_flags = _claim_flags(green)
    allow_next, opens_next, recommendations = _next_actions(result_class)
    blocks_next = list(DOWNSTREAM_BLOCKS) if green else ["93S2R4.5 before BT93S2R5.99 green closure", *DOWNSTREAM_BLOCKS]
    forbidden_claims_closed = all(
        claim_flags.get(key) is False
        for key in [
            "phase93S2R3_3ReentryAllowed",
            "phase93S2R4_99Allowed",
            "bt93s2FreshRecheckAllowed",
            "phase93S2_4Allowed",
            "bt93tClaimable",
            "bt93uClaimable",
            "bt93vClaimable",
            "bt93wClaimable",
            "bt93oClaimable",
            "bt93xFullClaimAllowed",
            "bt93pClaimable",
            "bt94aClaimable",
            "bt95HandoffAllowed",
            "candidateRunsAllowed",
            "freezeAllowed",
            "holdoutAllowed",
            "ppoValidateSignalAllowed",
            "promoteAllowed",
            "rolloutAllowed",
            "ppoTrainingAllowed",
            "actionSurfaceChangeAllowed",
            "rewardChangeAllowed",
            "telemetryChangeAllowed",
            "runtimeChangeAllowed",
        ]
    )
    phase_coverage = {
        "93S2R5.99.1": result_class in ALLOWED_RESULT_CLASSES and source_files_ready and source_files_versioned,
        "93S2R5.99.2": bool(
            isinstance(allow_next, list)
            and isinstance(opens_next, list)
            and isinstance(blocks_next, list)
            and isinstance(claim_flags, Mapping)
            and isinstance(sample_counts, Mapping)
            and source_artifacts
        ),
        "93S2R5.99.3": forbidden_claims_closed
        and ((green and opens_next == GREEN_OPEN_NEXT and claim_flags["phase93S2R4_5Allowed"] is True) or (not green and opens_next == [])),
        "93S2R5.99.4": True,
    }
    dod_coverage = {
        "DoD.S2R5-10": phase_coverage["93S2R5.99.1"] and phase_coverage["93S2R5.99.2"],
        "DoD.S2R5-11": phase_coverage["93S2R5.99.3"],
        "DoD.S2R5-12": "covered-by-external-meta-gate",
    }
    closure_ok = all(phase_coverage.values()) and dod_coverage["DoD.S2R5-10"] is True and dod_coverage["DoD.S2R5-11"] is True
    if not closure_ok:
        result_class = "measurement-invalid"
        green = False
        claim_flags = _claim_flags(False)
        allow_next, opens_next, recommendations = _next_actions(result_class)
        blocks_next = ["93S2R4.5 before BT93S2R5.99 green closure", *DOWNSTREAM_BLOCKS]
    active_blockers = _active_blockers(empirical, source_files_ready)
    invalidations = [
        {
            "scope": "93S2R4.5",
            "reason": "Allowed only because BT93S2R5.99 closes green; otherwise blocked.",
            "active": not green,
        },
        {
            "scope": "BT93S2R4.99, 93S2R3.3-Reentry, BT93S2.3-Recheck and 93S2.4",
            "reason": "S2R5 green opens only 93S2R4.5; later full gates must close before reentry or S2 recheck.",
            "active": True,
        },
        {
            "scope": "BT93T/U/W/O/P/94A and Candidate/Freeze/Holdout/Promote/Rollout/PPO-Validate/BT95",
            "reason": "Predicate/pre-action validity is not bot quality, reward ordering, telemetry, safety, training, or runtime-load evidence.",
            "active": True,
        },
    ]
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r5-closure-gate-report-v1",
        "ok": closure_ok,
        "gatePassed": green,
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
        "matrixId": empirical.get("matrixId"),
        "contractId": empirical.get("contractId"),
        "repairContractId": empirical.get("repairContractId"),
        "actionSurfaceId": empirical.get("actionSurfaceId"),
        "decoderHash": empirical.get("decoderHash"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResultClasses": {
            item["sourceKey"]: item.get("resultClass")
            for item in source_artifacts
            if item.get("sourceKey") not in {"actionSurface", "pythonEnv", "headlessRunner", "closureScript"}
        },
        "sourceGate": {
            "path": _rel(empirical_gate.REPORT_PATH),
            "resultClass": empirical.get("resultClass"),
            "ok": empirical.get("ok"),
            "opensNext": empirical.get("opensNext"),
            "allowNext": empirical.get("allowNext"),
            "reportHash": empirical.get("reportHash"),
        },
        "sourceLocks": {
            "currentSourceHashes": _source_hashes(source_artifacts),
            "empiricalGateReportHash": empirical.get("reportHash"),
            "empiricalRowsHash": empirical.get("empiricalRowsHash"),
            "sourceLocks": empirical.get("sourceLocks"),
        },
        "sampleCounts": sample_counts,
        "activeBlockers": active_blockers,
        "rowResultCounts": empirical.get("rowResultCounts"),
        "issueCounts": empirical.get("issueCounts"),
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "claimFlags": claim_flags,
        "guardrails": _guardrails(),
        "allowNext": allow_next,
        "opensNext": opens_next,
        "blocksNext": blocks_next,
        "invalidations": invalidations,
        "recommendations": recommendations,
        "blockingStatus": {
            "phase93S2R4_5Decision": "allowed" if claim_flags["phase93S2R4_5Allowed"] else "blocked",
            "phase93S2R4_99Decision": "blocked",
            "phase93S2R3_3ReentryDecision": "blocked",
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
            "bt95HandoffDecision": "blocked",
            "candidateFreezePromoteRolloutDecision": "blocked",
            "ppoValidateDecision": "blocked",
        },
        "summary": {
            "finalResult": result_class,
            "nextBestAction": allow_next[0] if allow_next else "Stop",
            "bt93s2r5ClosedGreen": green,
            "bt93s2r5ClosedRed": not green,
            "blockersRemain": active_blockers,
            "empiricalCounts": sample_counts,
        },
        "commands": {
            "write": "python python/scripts/bt93s2r5_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    recommendations = _as_list(report.get("recommendations"))
    rec_rows = "\n".join(
        f"- {item.get('action')} Warum: {item.get('why')}" for item in recommendations if isinstance(item, Mapping)
    )
    return f"""<!-- BT93S2R5.99-START -->
## 93S2R5.99 Closure

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`, `gatePassed={report.get('gatePassed')}`
- Rows/Repeats: `{counts.get('contractRowCount')}` x `{counts.get('repeatCount')}` = `{counts.get('replayAttemptCount')}`
- Repaired Rows: `{counts.get('repairedRowCount')}`
- Predicate/PreAction/Window/Warmup-Fails: `{counts.get('predicateFailureCount')}` / `{counts.get('measurementInvalidBeforeActionCount')}` / `{counts.get('minimumWindowFailureCount')}` / `{counts.get('warmupTerminalBeforeActionCount')}`
- Replay/StartMetrics/Warmup/Session-Drift: `{counts.get('replaySpecIdRepeatMismatchCount')}` / `{counts.get('startMetricsHashRepeatMismatchCount')}` / `{counts.get('warmupKeyRepeatMismatchCount')}` / `{counts.get('sessionIdDriftCount')}`
- OpensNext: `{report.get('opensNext')}`

S2R5.99 schliesst nur den Predicate-/PreAction-Validity-Interposer. Gruen
oeffnet ausschliesslich `93S2R4.5`; `BT93S2R4.99`, `93S2R3.3-Reentry`,
`BT93S2.3-Recheck`, `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate, BT95 und produktive Runtime bleiben
geschlossen.

Evidence:

- `data/training/ppo/bt93s2r5/bt93s2r5_closure_gate_report.json`
- Command: `python python/scripts/bt93s2r5_closure_gate.py --write-report`

Naechster Schritt:

{rec_rows}
<!-- BT93S2R5.99-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R5.99-START -->"
    end = "<!-- BT93S2R5.99-END -->"
    text = path.read_text(encoding="utf-8") if path.is_file() else ""
    if start in text and end in text:
        before = text.split(start, 1)[0].rstrip()
        after = text.split(end, 1)[1].lstrip()
        text = f"{before}\n\n{section}\n{after}".rstrip() + "\n"
    else:
        text = f"{text.rstrip()}\n\n{section}".rstrip() + "\n"
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
                "dodCoverage": report["dodCoverage"],
                "opensNext": report["opensNext"],
                "report": _rel(CLOSURE_REPORT_PATH) if args.write_report else None,
                "doc": _rel(DOC_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
