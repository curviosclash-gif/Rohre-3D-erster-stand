"""BT93S2R4.1 source lock and replay root-cause audit.

This phase is diagnostic-only. It locks the red BT93S2R3 replay preflight and
classifies each failed row by source drift, repeat drift, start-metrics drift,
session/hash-recipe drift, predicate/window failures, and unresolved reset/RNG
suspects. It does not repair env, runner, reward, telemetry, action surface, or
runtime code.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R2_ROOT = PPO_ROOT / "bt93s2r2"
BT93S2R3_ROOT = PPO_ROOT / "bt93s2r3"
BT93S2R4_ROOT = PPO_ROOT / "bt93s2r4"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r4_replay_root_cause_audit.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

S2_RECHECK_PATH = BT93S2_ROOT / "existing_action_effect_v3_recheck_report.json"
S2R_MATRIX_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
S2R_MATRIX_GATE_PATH = BT93S2R_ROOT / "matrix_control_reentry_gate_report.json"
S2R_CLOSURE_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"
S2R2_FAILURE_TAXONOMY_PATH = BT93S2R2_ROOT / "failure_taxonomy_report.json"
S2R2_REPAIR_CONTRACT_PATH = BT93S2R2_ROOT / "predicate_window_repair_contract.json"
S2R2_EMPIRICAL_GATE_PATH = BT93S2R2_ROOT / "empirical_reentry_gate_report.json"
S2R2_CLOSURE_PATH = BT93S2R2_ROOT / "bt93s2r2_closure_gate_report.json"
S2R3_LEDGER_PATH = BT93S2R3_ROOT / "failure_ledger_report.json"
S2R3_PREFLIGHT_PATH = BT93S2R3_ROOT / "replay_predicate_window_preflight.json"

S2R3_LEDGER_SCRIPT = SCRIPT_ROOT / "bt93s2r3_failure_ledger.py"
S2R3_PREFLIGHT_SCRIPT = SCRIPT_ROOT / "bt93s2r3_replay_predicate_window_preflight.py"
S2R2_FAILURE_SCRIPT = SCRIPT_ROOT / "bt93s2r2_failure_taxonomy.py"
S2R2_REPAIR_SCRIPT = SCRIPT_ROOT / "bt93s2r2_predicate_window_repair.py"
S2R2_EMPIRICAL_SCRIPT = SCRIPT_ROOT / "bt93s2r2_empirical_reentry_gate.py"

REPORT_PATH = BT93S2R4_ROOT / "replay_root_cause_audit.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r4_replay_determinism_required.md"

BLOCK_ID = "BT93S2R4"
PHASE_ID = "93S2R4.1"
RESULT_CLASS = "source-lock-root-cause-audit-written"
MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
REPAIR_CONTRACT_ID = "bt93s2r2-predicate-window-repair-contract-v1"
ACTION_SURFACE_ID = "bt93q-walltrail-semantic-action-v1"
DECODER_HASH = "970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9"
EXPECTED_ROW_COUNT = 103

DOWNSTREAM_BLOCKS = [
    "93S2R4.3 env/runner repair before 93S2R4.2 replay identity contract",
    "93S2R3.3 reentry before BT93S2R4.99 replay-startstate-green",
    "BT93S2.3-Recheck before BT93S2R4.99 replay-startstate-green",
    "93S2.4 start before BT93S2R4.99 replay-startstate-green",
    "BT93T claim before fresh S2 result opens only telemetry",
    "BT93U claim before fresh S2 result opens action-selection-green",
    "BT93W/O/P/94A claim before S2R/S2 chain is green",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "PPO training",
    "reward fix from BT93S2R4.1",
    "telemetry fix from BT93S2R4.1",
    "action-surface change from BT93S2R4.1",
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


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


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


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return sha256(_json_text(payload).encode("utf-8")).hexdigest()


def _hash_value(value: Any) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


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
    if isinstance(expected, list) and isinstance(actual, list):
        return actual == expected
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
    "s2r3Preflight": (
        S2R3_PREFLIGHT_PATH,
        "red BT93S2R3.2 replay/predicate/window preflight",
        {
            "blockId": "BT93S2R3",
            "phaseId": "93S2R3.2",
            "resultClass": "replay-determinism-required",
            "ok": True,
            "preflightGreen": False,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
            "sampleCounts.failureLedgerRowCount": EXPECTED_ROW_COUNT,
            "sampleCounts.preflightRowCount": EXPECTED_ROW_COUNT,
            "sampleCounts.replayDeterminismFailureCount": EXPECTED_ROW_COUNT,
            "sampleCounts.replayAttemptCount": 206,
            "sampleCounts.newTrainingEpisodes": 0,
            "sampleCounts.holdoutEpisodes": 0,
        },
        True,
    ),
    "s2r3FailureLedger": (
        S2R3_LEDGER_PATH,
        "BT93S2R3.1 source-lock and failure ledger",
        {
            "blockId": "BT93S2R3",
            "phaseId": "93S2R3.1",
            "resultClass": "source-lock-failure-ledger-written",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
            "sampleCounts.failureLedgerRowCount": EXPECTED_ROW_COUNT,
        },
        True,
    ),
    "s2r2Closure": (
        S2R2_CLOSURE_PATH,
        "BT93S2R2.99 red closure",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.99",
            "resultClass": "measurement-invalid",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
            "opensNext": [],
            "sampleCounts.taxonomyFailureRowCount": EXPECTED_ROW_COUNT,
        },
        True,
    ),
    "s2r2EmpiricalGate": (
        S2R2_EMPIRICAL_GATE_PATH,
        "BT93S2R2.3 empirical red gate",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.3",
            "resultClass": "measurement-invalid",
            "ok": False,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
            "sampleCounts.taxonomyFailureRowCount": EXPECTED_ROW_COUNT,
        },
        True,
    ),
    "s2r2RepairContract": (
        S2R2_REPAIR_CONTRACT_PATH,
        "BT93S2R2.2 predicate/window repair contract",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.2",
            "resultClass": "predicate-window-repair-contract-green",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
            "repairContractId": REPAIR_CONTRACT_ID,
            "sampleCounts.predicateValidationRowCount": EXPECTED_ROW_COUNT,
        },
        True,
    ),
    "s2r2FailureTaxonomy": (
        S2R2_FAILURE_TAXONOMY_PATH,
        "BT93S2R2.1 failure taxonomy",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.1",
            "resultClass": "failure-taxonomy-source-lock-red-status-written",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
            "sampleCounts.taxonomyFailureRowCount": EXPECTED_ROW_COUNT,
        },
        True,
    ),
    "s2rClosure": (
        S2R_CLOSURE_PATH,
        "BT93S2R green closure",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.99",
            "resultClass": "matrix-control-reentry-green",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
        },
        True,
    ),
    "s2rMatrixGate": (
        S2R_MATRIX_GATE_PATH,
        "BT93S2R.4 matrix/control reentry gate",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.4",
            "resultClass": "matrix-control-reentry-green",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
        },
        True,
    ),
    "s2rMatrixContract": (
        S2R_MATRIX_CONTRACT_PATH,
        "BT93S2R.3 matrix/control-v3 contract",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.3",
            "resultClass": "matrix-control-v3-contract-green",
            "ok": True,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
        },
        True,
    ),
    "s2Recheck": (
        S2_RECHECK_PATH,
        "red BT93S2.3-Recheck source",
        {
            "blockId": "BT93S2",
            "phaseId": "93S2.3-Recheck",
            "resultClass": "measurement-invalid",
            "ok": False,
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
        },
        True,
    ),
    "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
    "s2r3FailureLedgerScript": (S2R3_LEDGER_SCRIPT, "BT93S2R3.1 generator", {}, True),
    "s2r3PreflightScript": (S2R3_PREFLIGHT_SCRIPT, "BT93S2R3.2 generator", {}, True),
    "s2r2FailureScript": (S2R2_FAILURE_SCRIPT, "BT93S2R2.1 generator", {}, True),
    "s2r2RepairScript": (S2R2_REPAIR_SCRIPT, "BT93S2R2.2 generator", {}, True),
    "s2r2EmpiricalScript": (S2R2_EMPIRICAL_SCRIPT, "BT93S2R2.3 generator", {}, True),
    "s2r4AuditScript": (SCRIPT_PATH, "BT93S2R4.1 generator", {}, False),
}


def _source_artifact(
    source_key: str,
    path: Path,
    role: str,
    expected: Mapping[str, Any],
    required: bool,
    tracked: set[str],
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    tracked_ok = rel_path in tracked if rel_path else False
    git_payload = _as_mapping(payload.get("git"))
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
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "preflightGreen": payload.get("preflightGreen") if payload else None,
        "matrixId": payload.get("matrixId") if payload else None,
        "contractId": payload.get("contractId") if payload else None,
        "repairContractId": payload.get("repairContractId") if payload else None,
        "actionSurfaceId": payload.get("actionSurfaceId") if payload else None,
        "decoderHash": payload.get("decoderHash") if payload else None,
        "reportHash": payload.get("reportHash") if payload else None,
        "sourceGitSha": git_payload.get("sha") or git_payload.get("head"),
        "sourceGitBranch": git_payload.get("branch"),
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "lineageFields": {
            "matrixId": payload.get("matrixId") if payload else None,
            "contractId": payload.get("contractId") if payload else None,
            "repairContractId": payload.get("repairContractId") if payload else None,
            "actionSurfaceId": payload.get("actionSurfaceId") if payload else None,
            "decoderHash": payload.get("decoderHash") if payload else None,
            "reportHash": payload.get("reportHash") if payload else None,
        },
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected, _required in SOURCE_SPECS.values())
    return [
        _source_artifact(key, path, role, expected, required, tracked)
        for key, (path, role, expected, required) in SOURCE_SPECS.items()
    ]


def _row_by_ledger_index(rows: Iterable[Any]) -> dict[int, Mapping[str, Any]]:
    index: dict[int, Mapping[str, Any]] = {}
    for row in rows:
        if not isinstance(row, Mapping):
            continue
        try:
            ledger_index = int(row.get("ledgerIndex"))
        except (TypeError, ValueError):
            continue
        index[ledger_index] = row
    return index


def _repeat_values(probe_runs: list[Any], field: str) -> list[Any]:
    values: list[Any] = []
    for run in probe_runs:
        if isinstance(run, Mapping):
            values.append(run.get(field))
    return values


def _all_same(values: list[Any]) -> bool:
    return bool(values) and all(value == values[0] for value in values)


def _classification(preflight_row: Mapping[str, Any], ledger_row: Mapping[str, Any]) -> dict[str, Any]:
    issues = {str(issue) for issue in _as_list(preflight_row.get("issues"))}
    probe_runs = _as_list(preflight_row.get("probeRuns"))
    session_values = _repeat_values(probe_runs, "sessionReplayId")
    start_metric_values = _repeat_values(probe_runs, "startMetricsHash")
    warmup_values = _repeat_values(probe_runs, "warmupKey")

    source_mismatch = any(issue.endswith("source-mismatch") for issue in issues)
    repeat_mismatch = any(issue.endswith("repeat-mismatch") for issue in issues)
    start_metrics_source_mismatch = "start-metrics-source-mismatch" in issues
    start_metrics_repeat_mismatch = "startMetricsHash-repeat-mismatch" in issues
    session_source_mismatch = "session-replay-id-source-mismatch" in issues
    session_repeat_mismatch = "sessionReplayId-repeat-mismatch" in issues
    warmup_source_mismatch = "warmup-source-mismatch" in issues
    warmup_repeat_mismatch = "warmupKey-repeat-mismatch" in issues
    warmup_stable = _all_same(warmup_values) and not warmup_source_mismatch and not warmup_repeat_mismatch
    predicate_fail = preflight_row.get("predicatePass") is not True or "predicate-fail" in issues
    min_window_fail = preflight_row.get("completedMinimumWindow") is not True or "minimum-window-fail" in issues
    measurement_invalid = (
        preflight_row.get("measurementInvalidBeforeAction") is True
        or "measurement-invalid-before-action" in issues
    )

    unresolved_reset_rng_sampling = bool(start_metrics_repeat_mismatch and warmup_stable)
    primary_audit_class = "start-metrics-repeat-drift" if start_metrics_repeat_mismatch else "measurement-invalid"
    secondary_classes: list[str] = []
    if session_source_mismatch or session_repeat_mismatch:
        secondary_classes.append("session-id-derived-from-drifting-metrics")
    if start_metrics_source_mismatch:
        secondary_classes.append("source-start-metrics-drift")
    if predicate_fail:
        secondary_classes.append("predicate-after-replay-drift")
    if min_window_fail:
        secondary_classes.append("minimum-window-after-replay-fail")
    if measurement_invalid:
        secondary_classes.append("measurement-invalid-before-action")
    if unresolved_reset_rng_sampling:
        secondary_classes.extend(["env-reset-suspect", "seed-rng-suspect", "metric-sampling-suspect"])

    return {
        "sourceMismatch": source_mismatch,
        "repeatMismatch": repeat_mismatch,
        "startStateDrift": bool(start_metrics_source_mismatch or start_metrics_repeat_mismatch),
        "envResetDrift": "unresolved-suspect" if unresolved_reset_rng_sampling else "not-evidenced",
        "warmupDrift": bool(warmup_source_mismatch or warmup_repeat_mismatch),
        "seedRngDrift": "unresolved-suspect" if unresolved_reset_rng_sampling else "not-evidenced",
        "sessionIdDrift": bool(session_source_mismatch or session_repeat_mismatch),
        "metricSamplingDrift": "unresolved-suspect" if unresolved_reset_rng_sampling else "not-evidenced",
        "hashRecipeDrift": bool(session_source_mismatch or session_repeat_mismatch),
        "predicateAfterReplayDrift": predicate_fail,
        "minimumWindowAfterReplayFail": min_window_fail,
        "measurementInvalidBeforeAction": measurement_invalid,
        "primaryAuditClass": primary_audit_class,
        "secondaryAuditClasses": sorted(set(secondary_classes)),
        "evidence": {
            "issues": sorted(issues),
            "sourcePrimaryClass": ledger_row.get("primaryClass"),
            "sourceSecondaryClasses": list(_as_list(ledger_row.get("secondaryClasses"))),
            "sourceSessionReplayId": preflight_row.get("sourceSessionReplayId"),
            "freshSessionReplayId": preflight_row.get("freshSessionReplayId"),
            "sessionReplayIdsByRepeat": session_values,
            "sourceStartMetricsHash": _get(probe_runs[0], "sourceStartMetricsHash") if probe_runs else None,
            "startMetricsHashesByRepeat": start_metric_values,
            "sourceWarmupKey": _get(probe_runs[0], "sourceWarmupKey") if probe_runs else None,
            "warmupKeysByRepeat": warmup_values,
            "warmupStable": warmup_stable,
            "predicatePass": preflight_row.get("predicatePass"),
            "completedMinimumWindow": preflight_row.get("completedMinimumWindow"),
            "minimumCompletedSteps": preflight_row.get("minimumCompletedSteps"),
            "repeatCount": preflight_row.get("repeatCount"),
            "actionEffectEvaluated": preflight_row.get("actionEffectEvaluated"),
        },
        "repairScopeDecision": {
            "conditionalEnvWriteAllowedNow": False,
            "conditionalRunnerWriteAllowedNow": False,
            "reason": (
                "93S2R4.1 proves repeat drift but cannot yet distinguish env reset, "
                "seed/RNG, runner session, or metric sampling without 93S2R4.2/93S2R4.3."
            ),
            "nextEvidenceNeeded": [
                "93S2R4.2 stable replaySpecId separated from observed startMetricsHash",
                "93S2R4.3 minimal repro with before-reset, after-reset, after-warmup and before-action snapshots",
            ],
        },
    }


def _audit_rows(preflight: Mapping[str, Any], failure_ledger: Mapping[str, Any]) -> list[dict[str, Any]]:
    ledger_rows = _row_by_ledger_index(_as_list(failure_ledger.get("failureLedgerRows")))
    rows: list[dict[str, Any]] = []
    for preflight_row in _as_list(preflight.get("preflightRows")):
        if not isinstance(preflight_row, Mapping):
            continue
        try:
            ledger_index = int(preflight_row.get("ledgerIndex"))
        except (TypeError, ValueError):
            continue
        ledger_row = ledger_rows.get(ledger_index, {})
        classification = _classification(preflight_row, ledger_row)
        row = {
            "ledgerIndex": ledger_index,
            "scenarioId": preflight_row.get("scenarioId"),
            "seed": preflight_row.get("seed"),
            "actionName": preflight_row.get("actionName"),
            "actionToken": preflight_row.get("actionToken"),
            "preflightResultClass": preflight_row.get("resultClass"),
            "sourceLedgerPrimaryClass": ledger_row.get("primaryClass"),
            "classification": classification,
            "rowHashes": {
                "s2r3PreflightRowHash": _hash_value(preflight_row),
                "s2r3LedgerRowHash": _hash_value(ledger_row) if ledger_row else None,
            },
        }
        rows.append(row)
    return rows


def _count_bool(rows: Iterable[Mapping[str, Any]], key: str) -> int:
    return sum(1 for row in rows if _get(row, "classification", key) is True)


def _count_status(rows: Iterable[Mapping[str, Any]], key: str, status: str) -> int:
    return sum(1 for row in rows if _get(row, "classification", key) == status)


def _class_counts(rows: Iterable[Mapping[str, Any]], key: str) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for row in rows:
        value = _get(row, "classification", key)
        if value is not None:
            counter[str(value)] += 1
    return dict(sorted(counter.items()))


def _secondary_counts(rows: Iterable[Mapping[str, Any]]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for row in rows:
        for item in _as_list(_get(row, "classification", "secondaryAuditClasses")):
            counter[str(item)] += 1
    return dict(sorted(counter.items()))


def _claim_flags() -> dict[str, bool]:
    return {
        "phase93S2R4_2Allowed": True,
        "phase93S2R4_3Allowed": False,
        "phase93S2R4_4Allowed": False,
        "phase93S2R4_5Allowed": False,
        "phase93S2R4_99Allowed": False,
        "phase93S2R3_3ReentryAllowed": False,
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
        "bt95HandoffAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutAllowed": False,
        "ppoValidateSignalAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoTrainingAllowed": False,
        "actionSurfaceChangeAllowed": False,
        "rewardChangeAllowed": False,
        "telemetryChangeAllowed": False,
        "runtimeChangeAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
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
        "qualityClaimAllowed": False,
    }


def build_report() -> dict[str, Any]:
    preflight = _read_json(S2R3_PREFLIGHT_PATH)
    failure_ledger = _read_json(S2R3_LEDGER_PATH)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item["required"]]
    source_files_ready = all(item["exists"] and item["isFile"] and item["fresh"] for item in required_sources)
    source_files_versioned = all(item["tracked"] for item in required_sources)
    audit_rows = _audit_rows(preflight, failure_ledger)
    row_count = len(audit_rows)
    source_mismatch_count = _count_bool(audit_rows, "sourceMismatch")
    repeat_mismatch_count = _count_bool(audit_rows, "repeatMismatch")
    action_effect_override_count = sum(
        1 for row in audit_rows if _get(row, "classification", "evidence", "actionEffectEvaluated") is True
    )
    phase_coverage = {
        "93S2R4.1.1": bool(
            source_files_ready
            and source_files_versioned
            and preflight.get("resultClass") == "replay-determinism-required"
            and _get(preflight, "sampleCounts", "replayDeterminismFailureCount") == EXPECTED_ROW_COUNT
            and preflight.get("opensNext") == []
            and preflight.get("matrixId") == MATRIX_ID
            and preflight.get("contractId") == CONTRACT_ID
            and preflight.get("actionSurfaceId") == ACTION_SURFACE_ID
            and preflight.get("decoderHash") == DECODER_HASH
        ),
        "93S2R4.1.2": bool(
            row_count == EXPECTED_ROW_COUNT
            and source_mismatch_count == EXPECTED_ROW_COUNT
            and repeat_mismatch_count == EXPECTED_ROW_COUNT
            and all(
                _get(row, "classification", key) is not None
                for row in audit_rows
                for key in (
                    "sourceMismatch",
                    "repeatMismatch",
                    "startStateDrift",
                    "envResetDrift",
                    "warmupDrift",
                    "seedRngDrift",
                    "sessionIdDrift",
                    "metricSamplingDrift",
                    "hashRecipeDrift",
                    "predicateAfterReplayDrift",
                    "minimumWindowAfterReplayFail",
                    "measurementInvalidBeforeAction",
                )
            )
        ),
        "93S2R4.1.3": True,
    }
    ok = bool(all(phase_coverage.values()) and action_effect_override_count == 0)
    sample_counts = {
        "sourceFailureLedgerRowCount": _get(preflight, "sampleCounts", "failureLedgerRowCount"),
        "auditRowCount": row_count,
        "preflightRowCount": _get(preflight, "sampleCounts", "preflightRowCount"),
        "repeatCount": _get(preflight, "sampleCounts", "repeatCount"),
        "replayAttemptCount": _get(preflight, "sampleCounts", "replayAttemptCount"),
        "sourceMismatchCount": source_mismatch_count,
        "repeatMismatchCount": repeat_mismatch_count,
        "startStateDriftCount": _count_bool(audit_rows, "startStateDrift"),
        "envResetDriftSuspectedCount": _count_status(audit_rows, "envResetDrift", "unresolved-suspect"),
        "warmupDriftCount": _count_bool(audit_rows, "warmupDrift"),
        "seedRngDriftSuspectedCount": _count_status(audit_rows, "seedRngDrift", "unresolved-suspect"),
        "sessionIdDriftCount": _count_bool(audit_rows, "sessionIdDrift"),
        "metricSamplingDriftSuspectedCount": _count_status(audit_rows, "metricSamplingDrift", "unresolved-suspect"),
        "hashRecipeDriftCount": _count_bool(audit_rows, "hashRecipeDrift"),
        "predicateAfterReplayDriftCount": _count_bool(audit_rows, "predicateAfterReplayDrift"),
        "minimumWindowAfterReplayFailCount": _count_bool(audit_rows, "minimumWindowAfterReplayFail"),
        "measurementInvalidBeforeActionCount": _count_bool(audit_rows, "measurementInvalidBeforeAction"),
        "actionEffectOverrideCount": action_effect_override_count,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r4-replay-root-cause-audit-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": RESULT_CLASS if ok else "measurement-invalid",
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "repairContractId": REPAIR_CONTRACT_ID,
        "actionSurfaceId": ACTION_SURFACE_ID,
        "decoderHash": DECODER_HASH,
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResult": {
            "s2r3PreflightResultClass": preflight.get("resultClass"),
            "s2r3PreflightGreen": preflight.get("preflightGreen"),
            "s2r3OpensNext": preflight.get("opensNext"),
            "s2r3IssueCounts": preflight.get("issueCounts"),
            "s2r3BlockingClassCounts": preflight.get("blockingClassCounts"),
            "s2r3SampleCounts": preflight.get("sampleCounts"),
            "s2r3ReportHash": preflight.get("reportHash"),
        },
        "sampleCounts": sample_counts,
        "primaryAuditClassCounts": _class_counts(audit_rows, "primaryAuditClass"),
        "secondaryAuditClassCounts": _secondary_counts(audit_rows),
        "driftStatusCounts": {
            "envResetDrift": _class_counts(audit_rows, "envResetDrift"),
            "seedRngDrift": _class_counts(audit_rows, "seedRngDrift"),
            "metricSamplingDrift": _class_counts(audit_rows, "metricSamplingDrift"),
        },
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(),
        "guardrails": _guardrails(),
        "auditRows": audit_rows,
        "auditRowsHash": _hash_value({"rows": audit_rows}),
        "allowNext": ["93S2R4.2 Replay-Identity-Contract und Hash-Rezept-Reparatur"] if ok else [],
        "opensNext": ["93S2R4.2 Replay-Identity-Contract und Hash-Rezept-Reparatur"] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "env/runner conditional write",
                "reason": "93S2R4.1 classifies unresolved reset/RNG/metric suspects but does not prove a concrete env or runner defect.",
                "active": True,
            },
            {
                "scope": "93S2R3.3, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate, BT95",
                "reason": "Replay/startstate truth is still red; only 93S2R4.2 may proceed.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R4.2 to define replaySpecId from immutable inputs and keep startMetricsHash as separate observation.",
            "Do not edit python/envs/curvios_env.py or scripts/training-headless-lane-runner.mjs until 93S2R4.3 has minimal-repro evidence.",
            "Do not start 93S2R3.3-Reentry, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r4_replay_root_cause_audit.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r4_replay_identity_contract.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure/documentation gates",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _format_counts(counts: Mapping[str, Any]) -> str:
    return "\n".join(f"- `{key}`: `{value}`" for key, value in counts.items()) or "- keine"


def _markdown(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    source_rows = "\n".join(
        f"- `{source.get('path')}`: role=`{source.get('role')}`, resultClass=`{source.get('resultClass')}`, "
        f"ok=`{source.get('ok')}`, reportHash=`{source.get('reportHash')}`, sha256=`{source.get('sha256')}`"
        for source in _as_list(report.get("sourceArtifacts"))
        if isinstance(source, Mapping)
    )
    next_actions = "\n".join(f"- {action}" for action in _as_list(report.get("nextAllowedActions")))
    return f"""# Fehlerbericht: BT93S2R4 Replay-Determinismus erforderlich

## Aufgabe/Kontext

- Task: `93S2R4.1`
- Quelle: `93S2R3.2=replay-determinism-required`, `preflightGreen=false`, `opensNext=[]`
- Ziel: Source-Lock und Root-Cause-Audit fuer alle 103 roten Replay-Preflight-Rows.

## Ergebnis

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Audit-Rows: `{counts.get('auditRowCount')}`
- Replay-Attempts Quelle: `{counts.get('replayAttemptCount')}`
- Source-Mismatch: `{counts.get('sourceMismatchCount')}`
- Repeat-Mismatch: `{counts.get('repeatMismatchCount')}`
- StartState/StartMetrics-Drift: `{counts.get('startStateDriftCount')}`
- EnvReset-Verdacht: `{counts.get('envResetDriftSuspectedCount')}`
- Seed/RNG-Verdacht: `{counts.get('seedRngDriftSuspectedCount')}`
- Metric-Sampling-Verdacht: `{counts.get('metricSamplingDriftSuspectedCount')}`
- Hash-Rezept-/Session-ID-Drift: `{counts.get('hashRecipeDriftCount')}` / `{counts.get('sessionIdDriftCount')}`
- Predicate-Fails nach Replay: `{counts.get('predicateAfterReplayDriftCount')}`
- Minimum-Window-Fails nach Replay: `{counts.get('minimumWindowAfterReplayFailCount')}`
- Measurement-Invalid-Before-Action: `{counts.get('measurementInvalidBeforeActionCount')}`
- Action-Effect-Overrides: `{counts.get('actionEffectOverrideCount')}`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

{source_rows}

Git-SHA: `{_as_mapping(report.get('git')).get('sha')}`
MatrixId: `{report.get('matrixId')}`
ContractId: `{report.get('contractId')}`
ActionSurfaceId: `{report.get('actionSurfaceId')}`
Decoder-Hash: `{report.get('decoderHash')}`

## Audit-Klassen

Primaer:

{_format_counts(_as_mapping(report.get('primaryAuditClassCounts')))}

Sekundaer:

{_format_counts(_as_mapping(report.get('secondaryAuditClassCounts')))}

## Bewertung

Alle 103 Rows bleiben Replay-/StartMetrics-rot. Der Audit trennt die
beobachteten Klassen, beweist aber noch keinen konkreten Env- oder Runner-Fix.
`python/envs/curvios_env.py` und `scripts/training-headless-lane-runner.mjs`
bleiben deshalb read-only bis `93S2R4.3` eine Minimal-Repro-Ursache belegt.

## No-Go

Kein `93S2R3.3-Reentry`, kein `BT93S2.3-Recheck`, kein `93S2.4`, kein
`BT93T/U/W/O/P/94A`, kein Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate oder BT95. Keine Reward-, Telemetry-, ActionSurface- oder
produktive Runtime-Aenderung.

## Evidence

- `data/training/ppo/bt93s2r4/replay_root_cause_audit.json`
- Command: `python python/scripts/bt93s2r4_replay_root_cause_audit.py --write-report`

## Naechster Schritt

{next_actions}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_text(DOC_PATH, _markdown(report))
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "sampleCounts": report["sampleCounts"],
                "primaryAuditClassCounts": report["primaryAuditClassCounts"],
                "secondaryAuditClassCounts": report["secondaryAuditClassCounts"],
                "phaseCoverage": report["phaseCoverage"],
                "opensNext": report["opensNext"],
                "output": _rel(REPORT_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
