"""BT93S2R4.3 deterministic reset/warmup repair gate.

This phase may only repair a concrete reset/warmup source. It keeps the
locked 93S2R4.2 replaySpecId contract intact, reruns the 103 rows with three
repeats, and proves that observed start metrics no longer drift before action.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
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

import bt93s_existing_action_effect as bt93s_effect  # noqa: E402
import bt93s2_existing_action_effect_v2 as base_v2  # noqa: E402
import bt93s2_scenario_matrix_v2 as matrix_v2  # noqa: E402
import bt93s2r4_replay_identity_contract as identity  # noqa: E402
import bt93s2r4_replay_root_cause_audit as audit  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R4_ROOT = PPO_ROOT / "bt93s2r4"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r4_deterministic_reset_repair.py"
REPORT_PATH = BT93S2R4_ROOT / "deterministic_reset_repair_report.json"

IDENTITY_CONTRACT_PATH = BT93S2R4_ROOT / "replay_identity_contract.json"
ROOT_CAUSE_AUDIT_PATH = BT93S2R4_ROOT / "replay_root_cause_audit.json"
S2R_MATRIX_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

BLOCK_ID = "BT93S2R4"
PHASE_ID = "93S2R4.3"
GREEN_RESULT = "deterministic-reset-warmup-repair-green"
MATRIX_ID = audit.MATRIX_ID
CONTRACT_ID = audit.CONTRACT_ID
REPAIR_CONTRACT_ID = audit.REPAIR_CONTRACT_ID
ACTION_SURFACE_ID = audit.ACTION_SURFACE_ID
DECODER_HASH = audit.DECODER_HASH
EXPECTED_ROW_COUNT = audit.EXPECTED_ROW_COUNT
LOCKED_REPAIR_REPEAT_COUNT = identity.LOCKED_REPAIR_REPEAT_COUNT
PREDICATE_FUNCTION = identity.PREDICATE_FUNCTION

DOWNSTREAM_BLOCKS = [
    "93S2R3.3 reentry before BT93S2R4.99 replay-startstate-green",
    "BT93S2.3-Recheck before BT93S2R4.99 replay-startstate-green",
    "93S2.4 start before BT93S2R4.99 replay-startstate-green",
    "BT93T/U/W/O/P/94A before S2R4 closure green",
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
    return audit._read_json(path)


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _rel(path: Path | None) -> str | None:
    return audit._rel(path)


def _sha256_file(path: Path | None) -> str | None:
    return audit._sha256_file(path)


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


def _all_same(values: list[Any]) -> bool:
    return bool(values) and all(value == values[0] for value in values)


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
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r4IdentityContract": (
            IDENTITY_CONTRACT_PATH,
            "BT93S2R4.2 replay identity contract",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R4.2",
                "resultClass": "replay-identity-contract-green",
                "ok": True,
                "sampleCounts.contractRowCount": EXPECTED_ROW_COUNT,
                "sampleCounts.lockedRepairRepeatCount": LOCKED_REPAIR_REPEAT_COUNT,
                "sampleCounts.replaySpecIdRepeatMismatchCount": 0,
                "sampleCounts.startMetricsHashRepeatMismatchCount": EXPECTED_ROW_COUNT,
                "claimFlags.phase93S2R4_3Allowed": True,
            },
            True,
        ),
        "s2r4RootCauseAudit": (
            ROOT_CAUSE_AUDIT_PATH,
            "BT93S2R4.1 root-cause audit",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R4.1",
                "resultClass": "source-lock-root-cause-audit-written",
                "ok": True,
                "sampleCounts.auditRowCount": EXPECTED_ROW_COUNT,
                "primaryAuditClassCounts.start-metrics-repeat-drift": EXPECTED_ROW_COUNT,
            },
            True,
        ),
        "s2rMatrixContract": (
            S2R_MATRIX_CONTRACT_PATH,
            "BT93S2R matrix/control-v3 contract",
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
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
        "pythonEnv": (ENV_PATH, "read-only Python env reset surface", {}, True),
        "headlessRunner": (HEADLESS_RUNNER_PATH, "conditional repair target: headless lane runner", {}, True),
        "deterministicResetRepairScript": (SCRIPT_PATH, "BT93S2R4.3 generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(key, path, role, expected, tracked, required=required)
        for key, (path, role, expected, required) in specs.items()
    ]


def _scenario_index(matrix_contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    scenarios: dict[str, Mapping[str, Any]] = {}
    for scenario in _as_list(matrix_contract.get("scenarios")):
        if not isinstance(scenario, Mapping):
            continue
        scenario_id = str(scenario.get("id") or "")
        if scenario_id:
            scenarios[scenario_id] = scenario
    return scenarios


def _audit_index(root_cause_report: Mapping[str, Any]) -> dict[tuple[Any, str, str, str], Mapping[str, Any]]:
    indexed: dict[tuple[Any, str, str, str], Mapping[str, Any]] = {}
    for row in _as_list(root_cause_report.get("auditRows")):
        if not isinstance(row, Mapping):
            continue
        indexed[
            (
                row.get("ledgerIndex"),
                str(row.get("scenarioId") or ""),
                str(row.get("seed") or ""),
                str(row.get("actionName") or ""),
            )
        ] = row
    return indexed


def _contract_key(row: Mapping[str, Any]) -> tuple[Any, str, str, str]:
    return (
        row.get("ledgerIndex"),
        str(row.get("scenarioId") or ""),
        str(row.get("seed") or ""),
        str(row.get("actionName") or ""),
    )


def _warmup_payload(scenario_id: str, seed: int | str, action_name: str, scenario: Mapping[str, Any]) -> dict[str, Any]:
    effect_window = _as_mapping(scenario.get("effectWindow"))
    start_state = _as_mapping(scenario.get("startState"))
    return {
        "scenarioId": scenario_id,
        "seed": str(seed),
        "warmupAction": effect_window.get("warmupAction") or start_state.get("warmupAction"),
        "warmupSteps": effect_window.get("warmupSteps") if effect_window.get("warmupSteps") is not None else start_state.get("warmupSteps"),
        "actionName": action_name,
    }


def _runner_session_id(scenario_id: str, seed: int | str) -> str:
    return f"bt93s2-scenario-search-{scenario_id}-{int(seed)}-{int(seed)}"


def _repair_session_replay_id(row: Mapping[str, Any]) -> str:
    payload = {
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "scenarioId": row.get("scenarioId"),
        "seed": str(row.get("seed")),
        "actionName": row.get("actionName"),
        "actionToken": row.get("actionToken"),
        "replaySpecId": row.get("replaySpecId"),
        "sessionKeyRecipe": "bt93s2r4-replaySpecId-not-startMetricsHash",
    }
    return f"bt93s2r4-{_hash_value(payload)[:24]}"


def _snapshot(
    stage: str,
    *,
    metrics: Mapping[str, Any],
    info: Mapping[str, Any],
    terminal: bool,
    extra: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    metadata = _as_mapping(info.get("metadata"))
    return {
        "stage": stage,
        "metrics": dict(metrics),
        "metricsHash": _hash_value(metrics),
        "risk": dict(bt93s_effect._risk(metrics, bt93s_effect._hybrid_safety(info), terminal=terminal)),
        "terminal": terminal,
        "episode": {
            "episodeId": info.get("episodeId"),
            "episodeIndex": info.get("episodeIndex"),
            "stepIndex": info.get("stepIndex"),
            "terminalReason": info.get("terminalReason"),
            "truncatedReason": info.get("truncatedReason"),
        },
        "effectiveEnvironment": info.get("effectiveEnvironment") or metadata.get("effectiveEnvironment"),
        "domain": info.get("domain"),
        "match": info.get("match"),
        **(dict(extra) if isinstance(extra, Mapping) else {}),
    }


def _before_reset_snapshot(row: Mapping[str, Any], scenario: Mapping[str, Any]) -> dict[str, Any]:
    scenario_id = str(row.get("scenarioId") or "")
    seed = int(row.get("seed") or 0)
    return {
        "stage": "before-reset",
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": row.get("actionName"),
        "actionToken": row.get("actionToken"),
        "replaySpecId": row.get("replaySpecId"),
        "replaySpecPayloadHash": _hash_value(row.get("replaySpecPayload")),
        "startState": scenario.get("startState"),
        "startStateHash": row.get("startStateHash"),
        "runnerSessionId": _runner_session_id(scenario_id, seed),
    }


def _run_reset_warmup_probe(
    row: Mapping[str, Any],
    scenario: Mapping[str, Any],
    *,
    run_index: int,
) -> dict[str, Any]:
    started = time.perf_counter()
    scenario_id = str(row.get("scenarioId") or "")
    seed = int(row.get("seed") or 0)
    action_name = str(row.get("actionName") or "")
    effect_window = _as_mapping(scenario.get("effectWindow"))
    warmup_action = str(effect_window.get("warmupAction") or "noop")
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    repeat_steps = int(effect_window.get("maxSteps") or 24)
    warmup_token = bt93s_effect._action_token(warmup_action)
    before_reset = _before_reset_snapshot(row, scenario)
    warmup_payload = _warmup_payload(scenario_id, seed, action_name, scenario)
    repair_session_id = _repair_session_replay_id(row)
    env = base_v2._make_env_v2(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
    error: str | None = None
    terminal_observed = False
    observed_warmup_steps = 0
    after_reset: dict[str, Any] = {}
    after_warmup: dict[str, Any] = {}
    before_action: dict[str, Any] = {}
    try:
        observation, reset_info = env.reset(seed=seed)
        reset_metrics = bt93s_effect._observation_metrics(observation)
        after_reset = _snapshot(
            "after-reset",
            metrics=reset_metrics,
            info=reset_info,
            terminal=False,
            extra={
                "resetMetricsHash": _hash_value(reset_metrics),
                "runnerSessionId": before_reset["runnerSessionId"],
            },
        )
        last_info: Mapping[str, Any] = reset_info
        for _step_index in range(warmup_steps):
            observation, _reward, terminated, truncated, last_info = env.step(warmup_token)
            observed_warmup_steps += 1
            if terminated or truncated:
                terminal_observed = True
                break
        warmup_metrics = bt93s_effect._observation_metrics(observation)
        predicate_pass = matrix_v2._predicate_ok(scenario_id, warmup_metrics)
        after_warmup = _snapshot(
            "after-warmup",
            metrics=warmup_metrics,
            info=last_info,
            terminal=terminal_observed,
            extra={
                "warmupAction": warmup_action,
                "warmupStepsRequested": warmup_steps,
                "warmupStepsObserved": observed_warmup_steps,
                "warmupKey": _hash_value(warmup_payload),
                "warmupPayload": warmup_payload,
            },
        )
        before_action = _snapshot(
            "before-action",
            metrics=warmup_metrics,
            info=last_info,
            terminal=terminal_observed,
            extra={
                "actionName": action_name,
                "actionToken": row.get("actionToken"),
                "startMetricsHash": _hash_value(warmup_metrics),
                "predicate": {
                    "predicateId": _get(scenario, "predicate", "predicateId"),
                    "expression": _get(scenario, "predicate", "expression"),
                    "function": PREDICATE_FUNCTION,
                    "pass": predicate_pass,
                    "revalidatedBeforeMeasurement": True,
                },
                "warmupTerminalBeforeAction": terminal_observed,
            },
        )
    except Exception as exc:  # pragma: no cover - diagnostic report captures runtime failure
        error = str(exc)
    finally:
        env.close()

    return {
        "runIndex": run_index,
        "ok": error is None and bool(before_action),
        "error": error,
        "elapsedSeconds": bt93s_effect._round(time.perf_counter() - started),
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": action_name,
        "replaySpecId": row.get("replaySpecId"),
        "sessionReplayId": repair_session_id,
        "runnerSessionId": before_reset["runnerSessionId"],
        "startMetricsHash": before_action.get("startMetricsHash"),
        "warmupKey": _hash_value(warmup_payload),
        "warmupTerminalBeforeAction": terminal_observed,
        "observedWarmupSteps": observed_warmup_steps,
        "snapshots": {
            "beforeReset": before_reset,
            "afterReset": after_reset,
            "afterWarmup": after_warmup,
            "beforeAction": before_action,
        },
    }


def _repair_row(
    row: Mapping[str, Any],
    scenario: Mapping[str, Any] | None,
    audit_row: Mapping[str, Any] | None,
    *,
    repeat_count: int,
) -> dict[str, Any]:
    scenario_id = str(row.get("scenarioId") or "")
    if not isinstance(scenario, Mapping) or not scenario:
        return {
            "ledgerIndex": row.get("ledgerIndex"),
            "scenarioId": scenario_id,
            "seed": row.get("seed"),
            "actionName": row.get("actionName"),
            "ok": False,
            "resultClass": "measurement-invalid",
            "issues": ["scenario-contract-missing"],
            "probeRuns": [],
        }
    probe_runs = [
        _run_reset_warmup_probe(row, scenario, run_index=run_index)
        for run_index in range(repeat_count)
    ]
    replay_spec_ids = [run.get("replaySpecId") for run in probe_runs]
    start_hashes = [run.get("startMetricsHash") for run in probe_runs if run.get("startMetricsHash")]
    warmup_keys = [run.get("warmupKey") for run in probe_runs if run.get("warmupKey")]
    session_ids = [run.get("sessionReplayId") for run in probe_runs if run.get("sessionReplayId")]
    probe_errors = [run.get("error") for run in probe_runs if run.get("error")]
    stability = {
        "replaySpecIdRepeatStable": _all_same(replay_spec_ids),
        "startMetricsHashRepeatStable": len(start_hashes) == repeat_count and _all_same(start_hashes),
        "warmupKeyRepeatStable": len(warmup_keys) == repeat_count and _all_same(warmup_keys),
        "sessionReplayIdRepeatStable": len(session_ids) == repeat_count and _all_same(session_ids),
    }
    ok = bool(not probe_errors and all(stability.values()))
    audit_class = str(_get(audit_row, "classification", "primaryAuditClass") or "unclassified")
    return {
        "ledgerIndex": row.get("ledgerIndex"),
        "scenarioId": scenario_id,
        "seed": row.get("seed"),
        "actionName": row.get("actionName"),
        "actionToken": row.get("actionToken"),
        "sourcePrimaryAuditClass": audit_class,
        "sourceSecondaryAuditClasses": _as_list(_get(audit_row, "classification", "secondaryAuditClasses")),
        "sourceObservedStartMetricsHashes": _as_list(_get(row, "observedSignals", "startMetricsHashesByRepeat")),
        "sourceObservedLegacySessionReplayIds": _as_list(_get(row, "observedSignals", "legacySessionReplayIdsByRepeat")),
        "sourceObservedWarmupHashes": _as_list(_get(row, "observedSignals", "warmupObservedHashesByRepeat")),
        "replaySpecId": row.get("replaySpecId"),
        "runnerSessionId": _runner_session_id(scenario_id, row.get("seed") or 0),
        "stability": stability,
        "ok": ok,
        "resultClass": "repair-row-green" if ok else "measurement-invalid",
        "issues": [] if ok else ["probe-error" if probe_errors else "repeat-drift"],
        "probeErrorCount": len(probe_errors),
        "probeRuns": probe_runs,
        "repeatHashes": {
            "replaySpecIds": replay_spec_ids,
            "startMetricsHashes": start_hashes,
            "warmupKeys": warmup_keys,
            "sessionReplayIds": session_ids,
        },
    }


def _minimal_repro_rows(repair_rows: list[Mapping[str, Any]]) -> list[dict[str, Any]]:
    by_class: dict[str, Mapping[str, Any]] = {}
    for row in repair_rows:
        audit_class = str(row.get("sourcePrimaryAuditClass") or "unclassified")
        by_class.setdefault(audit_class, row)
    minimal: list[dict[str, Any]] = []
    for audit_class, row in sorted(by_class.items()):
        probe_runs = _as_list(row.get("probeRuns"))
        first_run = _as_mapping(probe_runs[0] if probe_runs else {})
        snapshots = _as_mapping(first_run.get("snapshots"))
        minimal.append(
            {
                "primaryAuditClass": audit_class,
                "ledgerIndex": row.get("ledgerIndex"),
                "scenarioId": row.get("scenarioId"),
                "seed": row.get("seed"),
                "actionName": row.get("actionName"),
                "replaySpecId": row.get("replaySpecId"),
                "sourceObservedStartMetricsHashes": row.get("sourceObservedStartMetricsHashes"),
                "sourceObservedLegacySessionReplayIds": row.get("sourceObservedLegacySessionReplayIds"),
                "repairRepeatHashes": row.get("repeatHashes"),
                "snapshots": {
                    "beforeReset": snapshots.get("beforeReset"),
                    "afterReset": snapshots.get("afterReset"),
                    "afterWarmup": snapshots.get("afterWarmup"),
                    "beforeAction": snapshots.get("beforeAction"),
                },
            }
        )
    return minimal


def _count_false(rows: Iterable[Mapping[str, Any]], *keys: str) -> int:
    return sum(1 for row in rows if _get(row, *keys) is not True)


def _claim_flags(ok: bool) -> dict[str, bool]:
    return {
        "phase93S2R4_3Allowed": False,
        "phase93S2R4_4Allowed": ok,
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
        "envConditionalWriteAllowed": False,
        "runnerConditionalWriteAllowed": False,
    }


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("sha256")
        for item in source_artifacts
        if item.get("sourceKey")
    }


def build_report(*, row_limit: int | None = None, repeat_count: int | None = None) -> dict[str, Any]:
    identity_contract = _read_json(IDENTITY_CONTRACT_PATH)
    root_cause_report = _read_json(ROOT_CAUSE_AUDIT_PATH)
    matrix_contract = _read_json(S2R_MATRIX_CONTRACT_PATH)
    locked_repeat_count = int(_get(identity_contract, "thresholdsLockedBeforeRun", "repeatCountForRepairGate") or LOCKED_REPAIR_REPEAT_COUNT)
    effective_repeat_count = int(repeat_count or locked_repeat_count)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item.get("required") is True]
    source_files_ready = all(item.get("exists") and item.get("isFile") and item.get("fresh") for item in required_sources)
    source_files_versioned = all(item.get("tracked") for item in required_sources)
    current_hashes = _source_hashes(source_artifacts)
    locked_source_hashes = _as_mapping(_get(identity_contract, "thresholdsLockedBeforeRun", "sourceHashes"))
    locked_runner_hash = _get(identity_contract, "thresholdsLockedBeforeRun", "runnerHash")
    scenarios = _scenario_index(matrix_contract)
    audit_rows_by_key = _audit_index(root_cause_report)
    contract_rows = [
        row for row in _as_list(identity_contract.get("contractRows"))
        if isinstance(row, Mapping)
    ]
    if row_limit is not None:
        contract_rows = contract_rows[: max(0, int(row_limit))]
    repair_rows = [
        _repair_row(
            row,
            scenarios.get(str(row.get("scenarioId") or "")),
            audit_rows_by_key.get(_contract_key(row)),
            repeat_count=effective_repeat_count,
        )
        for row in contract_rows
    ]
    row_count = len(repair_rows)
    replay_attempt_count = sum(len(_as_list(row.get("probeRuns"))) for row in repair_rows)
    replay_spec_mismatch_count = _count_false(repair_rows, "stability", "replaySpecIdRepeatStable")
    start_metrics_mismatch_count = _count_false(repair_rows, "stability", "startMetricsHashRepeatStable")
    warmup_key_mismatch_count = _count_false(repair_rows, "stability", "warmupKeyRepeatStable")
    session_id_drift_count = _count_false(repair_rows, "stability", "sessionReplayIdRepeatStable")
    probe_error_count = sum(int(row.get("probeErrorCount") or 0) for row in repair_rows)
    minimal_rows = _minimal_repro_rows(repair_rows)
    expected_primary_classes = set(str(key) for key in _as_mapping(root_cause_report.get("primaryAuditClassCounts")).keys())
    actual_minimal_classes = set(str(row.get("primaryAuditClass")) for row in minimal_rows)
    action_surface_changed = current_hashes.get("actionSurface") != locked_source_hashes.get("actionSurface")
    env_changed = current_hashes.get("pythonEnv") != locked_source_hashes.get("pythonEnv")
    runner_changed = current_hashes.get("headlessRunner") != locked_runner_hash
    repair_gate_green = bool(
        row_count == EXPECTED_ROW_COUNT
        and effective_repeat_count == LOCKED_REPAIR_REPEAT_COUNT
        and replay_attempt_count >= EXPECTED_ROW_COUNT * LOCKED_REPAIR_REPEAT_COUNT
        and replay_spec_mismatch_count == 0
        and start_metrics_mismatch_count == 0
        and warmup_key_mismatch_count == 0
        and session_id_drift_count == 0
        and probe_error_count == 0
    )
    phase_coverage = {
        "93S2R4.3.1": bool(
            minimal_rows
            and expected_primary_classes
            and expected_primary_classes.issubset(actual_minimal_classes)
            and all(
                _get(row, "snapshots", "beforeReset")
                and _get(row, "snapshots", "afterReset")
                and _get(row, "snapshots", "afterWarmup")
                and _get(row, "snapshots", "beforeAction")
                for row in minimal_rows
            )
        ),
        "93S2R4.3.2": bool(
            runner_changed
            and not env_changed
            and not action_surface_changed
            and current_hashes.get("headlessRunner")
            and locked_runner_hash
        ),
        "93S2R4.3.3": repair_gate_green,
    }
    ok = bool(source_files_ready and source_files_versioned and all(phase_coverage.values()))
    sample_counts = {
        "contractRowCount": row_count,
        "lockedContractRowCount": _get(identity_contract, "sampleCounts", "contractRowCount"),
        "lockedRepairRepeatCount": LOCKED_REPAIR_REPEAT_COUNT,
        "repeatCount": effective_repeat_count,
        "replayAttemptCount": replay_attempt_count,
        "expectedReplayAttemptCount": EXPECTED_ROW_COUNT * LOCKED_REPAIR_REPEAT_COUNT,
        "replaySpecIdRepeatMismatchCount": replay_spec_mismatch_count,
        "startMetricsHashRepeatMismatchCount": start_metrics_mismatch_count,
        "warmupKeyRepeatMismatchCount": warmup_key_mismatch_count,
        "sessionIdDriftCount": session_id_drift_count,
        "probeErrorCount": probe_error_count,
        "minimalReproClassCount": len(minimal_rows),
        "sourceStartMetricsHashRepeatMismatchCount": _get(identity_contract, "sampleCounts", "startMetricsHashRepeatMismatchCount"),
        "sourceLegacySessionReplayIdRepeatMismatchCount": _get(identity_contract, "sampleCounts", "legacySessionReplayIdRepeatMismatchCount"),
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    compact_repair_rows = [
        {
            "ledgerIndex": row.get("ledgerIndex"),
            "scenarioId": row.get("scenarioId"),
            "seed": row.get("seed"),
            "actionName": row.get("actionName"),
            "sourcePrimaryAuditClass": row.get("sourcePrimaryAuditClass"),
            "replaySpecId": row.get("replaySpecId"),
            "runnerSessionId": row.get("runnerSessionId"),
            "stability": row.get("stability"),
            "repeatHashes": row.get("repeatHashes"),
            "ok": row.get("ok"),
            "resultClass": row.get("resultClass"),
            "issues": row.get("issues"),
            "probeErrorCount": row.get("probeErrorCount"),
        }
        for row in repair_rows
    ]
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r4-deterministic-reset-repair-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": GREEN_RESULT if ok else "measurement-invalid",
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
        "sourceLocks": {
            "lockedBeforeFirstRepairRun": _get(identity_contract, "thresholdsLockedBeforeRun", "lockedBeforeFirstRepairRun") is True,
            "lockedRunnerHashBeforeRepair": locked_runner_hash,
            "currentRunnerHashAfterRepair": current_hashes.get("headlessRunner"),
            "lockedSourceHashes": dict(locked_source_hashes),
            "currentSourceHashes": current_hashes,
            "predicateFunction": _get(identity_contract, "thresholdsLockedBeforeRun", "predicateFunction"),
            "minimumWindow": _get(identity_contract, "thresholdsLockedBeforeRun", "minimumWindow"),
            "envConfigHash": _get(identity_contract, "thresholdsLockedBeforeRun", "envConfigHash"),
        },
        "rootCauseEvidence": {
            "sourcePrimaryAuditClassCounts": root_cause_report.get("primaryAuditClassCounts"),
            "concreteCause": "headless runner reset/initialization/step path used process-global Math.random without a deterministic per-session scope.",
            "repairTarget": _rel(HEADLESS_RUNNER_PATH),
            "repairType": "headless-boundary-deterministic-rng-scope",
            "randomSourcesObservedInHeadlessPath": [
                "src/entities/Arena.js getRandomPosition/getRandomPositionOnLevel",
                "src/entities/Powerup.js spawn position/phase fallback",
                "src/entities/Player.js fallback spawn orientation",
                "src/entities/ai/* bot stochastic decisions during step",
            ],
            "whyRunnerNotProductiveRuntime": "The patch scopes Math.random only inside HeadlessBoundaryController initialize/reset/step calls; productive runtime modules remain unchanged.",
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
            "actionSurfaceChanged": action_surface_changed,
            "productiveRuntimeChanged": False,
            "envChanged": env_changed,
            "runnerChanged": runner_changed,
            "runtimeSurfacesTouched": [],
            "actionEffectEvaluated": False,
            "qualityClaimAllowed": False,
            "downstreamStillBlockedUntilS2R4_99": True,
        },
        "minimalReproRows": minimal_rows,
        "repairRows": compact_repair_rows,
        "repairRowsHash": _hash_value({"rows": compact_repair_rows}),
        "replaySpecIdCountsByScenario": dict(
            sorted(Counter(str(row.get("scenarioId")) for row in repair_rows if row.get("scenarioId")).items())
        ),
        "validation": {
            "sourceRepeatDriftWasRed": _get(identity_contract, "sampleCounts", "startMetricsHashRepeatMismatchCount") == EXPECTED_ROW_COUNT,
            "lockedReplaySpecStillStable": replay_spec_mismatch_count == 0,
            "startMetricsRepeatRepaired": start_metrics_mismatch_count == 0,
            "warmupKeyRepeatStable": warmup_key_mismatch_count == 0,
            "sessionReplayIdNotDerivedFromStartMetrics": session_id_drift_count == 0,
            "headlessRunnerOnlyRepair": runner_changed and not env_changed and not action_surface_changed,
        },
        "allowNext": ["93S2R4.4 Predicate-/Window-Recheck auf stabiler Replay-Basis"] if ok else [],
        "opensNext": ["93S2R4.4 Predicate-/Window-Recheck auf stabiler Replay-Basis"] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "BT93S2R4 green/reentry",
                "reason": "93S2R4.3 only proves deterministic reset/warmup. Predicate/window recheck and final full replay gate remain open.",
                "active": True,
            },
            {
                "scope": "quality/PPO/candidate/freeze/holdout/promote/rollout",
                "reason": "Still blocked until BT93S2R4.99 replay-startstate-green.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R4.4 predicate/window recheck on the stable replay basis.",
            "Then run 93S2R4.5 full 103-row x 3-repeat replay gate.",
            "Only after BT93S2R4.99 may S2R3 reentry and downstream BT93T/U/W/O/P/94A resume.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r4_deterministic_reset_repair.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r4_predicate_window_recheck.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "repair gate executes 103 rows x 3 repeats; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write deterministic reset repair artifact.")
    parser.add_argument("--row-limit", type=int, default=None, help="Diagnostic partial run; does not close the phase.")
    parser.add_argument("--repeat-count", type=int, default=None, help="Diagnostic repeat override; defaults to locked repair count.")
    args = parser.parse_args()

    report = build_report(row_limit=args.row_limit, repeat_count=args.repeat_count)
    if args.write_report:
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "sampleCounts": report["sampleCounts"],
                "phaseCoverage": report["phaseCoverage"],
                "opensNext": report["opensNext"],
                "output": _rel(REPORT_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    if args.row_limit is not None or args.repeat_count is not None:
        return 0 if int(report["sampleCounts"].get("probeErrorCount") or 0) == 0 else 1
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
