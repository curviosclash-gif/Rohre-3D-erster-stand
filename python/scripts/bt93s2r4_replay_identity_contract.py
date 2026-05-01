"""BT93S2R4.2 replay identity contract and hash recipe repair.

This phase is contract-only. It separates a stable replaySpecId from observed
startMetricsHash/warmupObservedHash and locks the thresholds required before
any deterministic reset or warmup repair run. It does not change env, runner,
reward, telemetry, action surface, runtime code, or PPO training state.
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

import bt93s2r4_replay_root_cause_audit as audit


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R3_ROOT = PPO_ROOT / "bt93s2r3"
BT93S2R4_ROOT = PPO_ROOT / "bt93s2r4"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r4_replay_identity_contract.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

S2R_MATRIX_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
S2R3_PREFLIGHT_PATH = BT93S2R3_ROOT / "replay_predicate_window_preflight.json"
S2R4_AUDIT_PATH = BT93S2R4_ROOT / "replay_root_cause_audit.json"
REPORT_PATH = BT93S2R4_ROOT / "replay_identity_contract.json"

BLOCK_ID = "BT93S2R4"
PHASE_ID = "93S2R4.2"
RESULT_CLASS = "replay-identity-contract-green"
MATRIX_ID = audit.MATRIX_ID
CONTRACT_ID = audit.CONTRACT_ID
REPAIR_CONTRACT_ID = audit.REPAIR_CONTRACT_ID
ACTION_SURFACE_ID = audit.ACTION_SURFACE_ID
DECODER_HASH = audit.DECODER_HASH
EXPECTED_ROW_COUNT = audit.EXPECTED_ROW_COUNT
LOCKED_REPAIR_REPEAT_COUNT = 3

PREDICATE_FUNCTION = "bt93s2_scenario_matrix_v2._predicate_ok"

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
    "reward fix from BT93S2R4.2",
    "telemetry fix from BT93S2R4.2",
    "action-surface change from BT93S2R4.2",
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
        "s2r4RootCauseAudit": (
            S2R4_AUDIT_PATH,
            "BT93S2R4.1 source-lock/root-cause audit",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R4.1",
                "resultClass": "source-lock-root-cause-audit-written",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
                "actionSurfaceId": ACTION_SURFACE_ID,
                "decoderHash": DECODER_HASH,
                "sampleCounts.auditRowCount": EXPECTED_ROW_COUNT,
                "sampleCounts.repeatMismatchCount": EXPECTED_ROW_COUNT,
            },
            True,
        ),
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
                "sampleCounts.preflightRowCount": EXPECTED_ROW_COUNT,
                "sampleCounts.replayDeterminismFailureCount": EXPECTED_ROW_COUNT,
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
        "pythonEnv": (ENV_PATH, "read-only Python env reset surface for later 93S2R4.3", {}, True),
        "headlessRunner": (HEADLESS_RUNNER_PATH, "read-only headless lane runner for later 93S2R4.3", {}, True),
        "identityContractScript": (SCRIPT_PATH, "BT93S2R4.2 generator", {}, False),
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


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("sha256")
        for item in source_artifacts
        if item.get("sourceKey")
    }


def _scenario_contract_payload(scenario: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "scenarioId": scenario.get("id"),
        "scenarioKind": scenario.get("scenarioKind"),
        "controlKind": scenario.get("controlKind"),
        "startState": scenario.get("startState"),
        "effectWindow": scenario.get("effectWindow"),
        "predicate": scenario.get("predicate"),
        "requiredMetrics": scenario.get("requiredMetrics"),
    }


def _env_config_payload(matrix_contract: Mapping[str, Any]) -> dict[str, Any]:
    scenario_payloads = [
        _scenario_contract_payload(scenario)
        for scenario in _as_list(matrix_contract.get("scenarios"))
        if isinstance(scenario, Mapping)
    ]
    return {
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "source": _rel(S2R_MATRIX_CONTRACT_PATH),
        "envPath": _rel(ENV_PATH),
        "envSourceHash": _sha256_file(ENV_PATH),
        "scenarioCount": len(scenario_payloads),
        "scenarios": scenario_payloads,
    }


def _warmup_plan_payload(scenario: Mapping[str, Any], scenario_id: str) -> dict[str, Any]:
    effect_window = _as_mapping(scenario.get("effectWindow"))
    start_state = _as_mapping(scenario.get("startState"))
    return {
        "scenarioId": scenario_id,
        "warmupAction": effect_window.get("warmupAction") or start_state.get("warmupAction"),
        "warmupSteps": effect_window.get("warmupSteps") or start_state.get("warmupSteps"),
        "maxSteps": effect_window.get("maxSteps"),
        "minimumCompletedSteps": effect_window.get("minimumCompletedSteps"),
        "terminalAbortIsFailureUnlessScenarioDefinesTerminalControl": effect_window.get(
            "terminalAbortIsFailureUnlessScenarioDefinesTerminalControl"
        ),
    }


def _start_state_payload(scenario: Mapping[str, Any], scenario_id: str, seed: Any) -> dict[str, Any]:
    return {
        "scenarioId": scenario_id,
        "seed": str(seed),
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "startState": scenario.get("startState"),
    }


def _replay_spec_payload(
    *,
    scenario_id: str,
    seed: Any,
    action_name: str,
    action_token: Any,
    start_state_hash: str,
    warmup_plan_hash: str,
    env_config_hash: str,
    action_surface_hash: str | None,
    runner_hash: str | None,
) -> dict[str, Any]:
    return {
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "scenarioId": scenario_id,
        "seed": str(seed),
        "actionName": action_name,
        "actionToken": action_token,
        "startStateHash": start_state_hash,
        "warmupPlanHash": warmup_plan_hash,
        "envConfigHash": env_config_hash,
        "actionSurfaceHash": action_surface_hash,
        "runnerHash": runner_hash,
    }


def _observed_hashes(probe_runs: list[Any], field: str) -> list[Any]:
    values: list[Any] = []
    for probe in probe_runs:
        if isinstance(probe, Mapping):
            values.append(probe.get(field))
    return values


def _contract_row(
    preflight_row: Mapping[str, Any],
    scenario: Mapping[str, Any],
    *,
    env_config_hash: str,
    action_surface_hash: str | None,
    runner_hash: str | None,
) -> dict[str, Any]:
    scenario_id = str(preflight_row.get("scenarioId") or "")
    seed = preflight_row.get("seed")
    action_name = str(preflight_row.get("actionName") or "")
    action_token = preflight_row.get("actionToken")
    probe_runs = _as_list(preflight_row.get("probeRuns"))
    start_state_hash = _hash_value(_start_state_payload(scenario, scenario_id, seed))
    warmup_plan_hash = _hash_value(_warmup_plan_payload(scenario, scenario_id))
    replay_spec_payload = _replay_spec_payload(
        scenario_id=scenario_id,
        seed=seed,
        action_name=action_name,
        action_token=action_token,
        start_state_hash=start_state_hash,
        warmup_plan_hash=warmup_plan_hash,
        env_config_hash=env_config_hash,
        action_surface_hash=action_surface_hash,
        runner_hash=runner_hash,
    )
    replay_spec_id = f"bt93s2r4-{_hash_value(replay_spec_payload)[:24]}"
    replay_spec_ids_by_repeat = [replay_spec_id for _run in probe_runs]
    legacy_session_ids = _observed_hashes(probe_runs, "sessionReplayId")
    start_metrics_hashes = _observed_hashes(probe_runs, "startMetricsHash")
    warmup_observed_hashes = _observed_hashes(probe_runs, "warmupKey")
    source_start_metrics_hashes = _observed_hashes(probe_runs, "sourceStartMetricsHash")
    return {
        "ledgerIndex": preflight_row.get("ledgerIndex"),
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": action_name,
        "actionToken": action_token,
        "replaySpecId": replay_spec_id,
        "replaySpecPayload": replay_spec_payload,
        "startStateHash": start_state_hash,
        "warmupPlanHash": warmup_plan_hash,
        "observedSignals": {
            "legacySessionReplayIdsByRepeat": legacy_session_ids,
            "sourceSessionReplayId": preflight_row.get("sourceSessionReplayId"),
            "startMetricsHashesByRepeat": start_metrics_hashes,
            "sourceStartMetricsHashesByRepeat": source_start_metrics_hashes,
            "warmupObservedHashesByRepeat": warmup_observed_hashes,
        },
        "stability": {
            "replaySpecIdRepeatStable": _all_same(replay_spec_ids_by_repeat),
            "legacySessionReplayIdRepeatStable": _all_same(legacy_session_ids),
            "startMetricsHashRepeatStable": _all_same(start_metrics_hashes),
            "warmupObservedHashRepeatStable": _all_same(warmup_observed_hashes),
            "startMetricsSourceMatch": bool(start_metrics_hashes and _all_same(source_start_metrics_hashes) and start_metrics_hashes[0] == source_start_metrics_hashes[0]),
        },
        "separationProof": {
            "replaySpecIncludesObservedStartMetricsHash": False,
            "replaySpecIncludesObservedWarmupHash": False,
            "startMetricsHashCountedSeparately": True,
            "warmupObservedHashCountedSeparately": True,
            "stableReplaySpecCanOpenReplayRepair": True,
            "stableReplaySpecCanOpenDownstreamQuality": False,
        },
    }


def _contract_rows(
    preflight: Mapping[str, Any],
    matrix_contract: Mapping[str, Any],
    *,
    env_config_hash: str,
    action_surface_hash: str | None,
    runner_hash: str | None,
) -> list[dict[str, Any]]:
    scenarios = _scenario_index(matrix_contract)
    rows: list[dict[str, Any]] = []
    for row in _as_list(preflight.get("preflightRows")):
        if not isinstance(row, Mapping):
            continue
        scenario = scenarios.get(str(row.get("scenarioId") or ""))
        if not scenario:
            rows.append(
                {
                    "ledgerIndex": row.get("ledgerIndex"),
                    "scenarioId": row.get("scenarioId"),
                    "seed": row.get("seed"),
                    "actionName": row.get("actionName"),
                    "resultClass": "measurement-invalid",
                    "issues": ["scenario-contract-missing"],
                }
            )
            continue
        rows.append(
            _contract_row(
                row,
                scenario,
                env_config_hash=env_config_hash,
                action_surface_hash=action_surface_hash,
                runner_hash=runner_hash,
            )
        )
    return rows


def _count(rows: Iterable[Mapping[str, Any]], *keys: str, expected: Any) -> int:
    return sum(1 for row in rows if _get(row, *keys) == expected)


def _count_false(rows: Iterable[Mapping[str, Any]], *keys: str) -> int:
    return sum(1 for row in rows if _get(row, *keys) is False)


def _source_start_metrics_mismatch_count(rows: Iterable[Mapping[str, Any]]) -> int:
    count = 0
    for row in rows:
        observed = _as_list(_get(row, "observedSignals", "startMetricsHashesByRepeat"))
        source = _as_list(_get(row, "observedSignals", "sourceStartMetricsHashesByRepeat"))
        if observed and source and any(value != source[0] for value in observed):
            count += 1
    return count


def _minimum_window_contract(matrix_contract: Mapping[str, Any]) -> dict[str, Any]:
    by_scenario: dict[str, Any] = {}
    for scenario in _as_list(matrix_contract.get("scenarios")):
        if not isinstance(scenario, Mapping):
            continue
        scenario_id = str(scenario.get("id") or "")
        effect_window = _as_mapping(scenario.get("effectWindow"))
        by_scenario[scenario_id] = {
            "maxSteps": effect_window.get("maxSteps"),
            "minimumCompletedSteps": effect_window.get("minimumCompletedSteps"),
            "terminalAbortIsFailureUnlessScenarioDefinesTerminalControl": effect_window.get(
                "terminalAbortIsFailureUnlessScenarioDefinesTerminalControl"
            ),
        }
    return by_scenario


def _predicate_contract(matrix_contract: Mapping[str, Any]) -> dict[str, Any]:
    by_scenario: dict[str, Any] = {}
    for scenario in _as_list(matrix_contract.get("scenarios")):
        if not isinstance(scenario, Mapping):
            continue
        scenario_id = str(scenario.get("id") or "")
        predicate = _as_mapping(scenario.get("predicate"))
        by_scenario[scenario_id] = {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": PREDICATE_FUNCTION,
            "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement"),
        }
    return by_scenario


def _claim_flags() -> dict[str, bool]:
    return {
        "phase93S2R4_3Allowed": True,
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
        "envConditionalWriteAllowed": False,
        "runnerConditionalWriteAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "contractOnly": True,
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
    matrix_contract = _read_json(S2R_MATRIX_CONTRACT_PATH)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item["required"]]
    source_files_ready = all(item["exists"] and item["isFile"] and item["fresh"] for item in required_sources)
    source_files_versioned = all(item["tracked"] for item in required_sources)
    source_hashes = _source_hashes(source_artifacts)
    action_surface_hash = _sha256_file(ACTION_SURFACE_PATH)
    runner_hash = _sha256_file(HEADLESS_RUNNER_PATH)
    env_config_payload = _env_config_payload(matrix_contract)
    env_config_hash = _hash_value(env_config_payload)
    rows = _contract_rows(
        preflight,
        matrix_contract,
        env_config_hash=env_config_hash,
        action_surface_hash=action_surface_hash,
        runner_hash=runner_hash,
    )
    row_count = len(rows)
    replay_spec_repeat_mismatch_count = _count_false(rows, "stability", "replaySpecIdRepeatStable")
    legacy_session_repeat_mismatch_count = _count_false(rows, "stability", "legacySessionReplayIdRepeatStable")
    start_metrics_repeat_mismatch_count = _count_false(rows, "stability", "startMetricsHashRepeatStable")
    warmup_observed_repeat_mismatch_count = _count_false(rows, "stability", "warmupObservedHashRepeatStable")
    source_start_metrics_mismatch_count = _source_start_metrics_mismatch_count(rows)
    stable_spec_with_metrics_drift_count = sum(
        1
        for row in rows
        if _get(row, "stability", "replaySpecIdRepeatStable") is True
        and _get(row, "stability", "startMetricsHashRepeatStable") is False
    )
    replay_spec_ids = [row.get("replaySpecId") for row in rows if row.get("replaySpecId")]
    minimum_window_contract = _minimum_window_contract(matrix_contract)
    predicate_contract = _predicate_contract(matrix_contract)
    thresholds_locked_before_run = {
        "lockedBeforeFirstRepairRun": True,
        "repeatCountForRepairGate": LOCKED_REPAIR_REPEAT_COUNT,
        "rowCount": EXPECTED_ROW_COUNT,
        "sourceHashes": source_hashes,
        "minimumWindow": minimum_window_contract,
        "predicateFunction": PREDICATE_FUNCTION,
        "predicateContract": predicate_contract,
        "envConfigHash": env_config_hash,
        "envConfigPayloadHash": env_config_hash,
        "envConfigSource": "scenario-matrix-v3-contract-derived",
        "runnerHash": runner_hash,
        "runnerPath": _rel(HEADLESS_RUNNER_PATH),
        "actionSurfaceHash": action_surface_hash,
        "actionSurfacePath": _rel(ACTION_SURFACE_PATH),
        "decoderHash": DECODER_HASH,
        "repairRunMayStartOnlyAfterThisContract": True,
    }
    phase_coverage = {
        "93S2R4.2.1": bool(
            row_count == EXPECTED_ROW_COUNT
            and replay_spec_ids
            and len(set(replay_spec_ids)) == row_count
            and replay_spec_repeat_mismatch_count == 0
            and all(
                _get(row, "separationProof", "replaySpecIncludesObservedStartMetricsHash") is False
                and _get(row, "separationProof", "startMetricsHashCountedSeparately") is True
                and _get(row, "separationProof", "warmupObservedHashCountedSeparately") is True
                for row in rows
            )
        ),
        "93S2R4.2.2": bool(
            start_metrics_repeat_mismatch_count == EXPECTED_ROW_COUNT
            and source_start_metrics_mismatch_count == EXPECTED_ROW_COUNT
            and legacy_session_repeat_mismatch_count == EXPECTED_ROW_COUNT
            and stable_spec_with_metrics_drift_count == EXPECTED_ROW_COUNT
        ),
        "93S2R4.2.3": bool(
            thresholds_locked_before_run["repeatCountForRepairGate"] == LOCKED_REPAIR_REPEAT_COUNT
            and thresholds_locked_before_run["rowCount"] == EXPECTED_ROW_COUNT
            and bool(thresholds_locked_before_run["sourceHashes"])
            and bool(thresholds_locked_before_run["minimumWindow"])
            and thresholds_locked_before_run["predicateFunction"] == PREDICATE_FUNCTION
            and bool(thresholds_locked_before_run["envConfigHash"])
            and bool(thresholds_locked_before_run["runnerHash"])
        ),
    }
    ok = bool(
        source_files_ready
        and source_files_versioned
        and all(phase_coverage.values())
        and action_surface_hash == DECODER_HASH
        and _get(preflight, "sampleCounts", "newTrainingEpisodes") == 0
        and _get(preflight, "sampleCounts", "holdoutEpisodes") == 0
        and _get(preflight, "sampleCounts", "newOptimizerUpdates") == 0
    )
    sample_counts = {
        "contractRowCount": row_count,
        "sourcePreflightRowCount": _get(preflight, "sampleCounts", "preflightRowCount"),
        "sourceReplayAttemptCount": _get(preflight, "sampleCounts", "replayAttemptCount"),
        "sourceRepeatCount": _get(preflight, "sampleCounts", "repeatCount"),
        "lockedRepairRepeatCount": LOCKED_REPAIR_REPEAT_COUNT,
        "replaySpecIdRepeatMismatchCount": replay_spec_repeat_mismatch_count,
        "legacySessionReplayIdRepeatMismatchCount": legacy_session_repeat_mismatch_count,
        "startMetricsHashRepeatMismatchCount": start_metrics_repeat_mismatch_count,
        "startMetricsHashSourceMismatchCount": source_start_metrics_mismatch_count,
        "warmupObservedHashRepeatMismatchCount": warmup_observed_repeat_mismatch_count,
        "stableReplaySpecWithStartMetricsDriftCount": stable_spec_with_metrics_drift_count,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r4-replay-identity-contract-v1",
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
        "hashRecipe": {
            "recipeId": "bt93s2r4-replay-spec-v1",
            "replaySpecIdPrefix": "bt93s2r4",
            "immutableReplaySpecFields": [
                "matrixId",
                "contractId",
                "scenarioId",
                "seed",
                "actionName",
                "actionToken",
                "startStateHash",
                "warmupPlanHash",
                "envConfigHash",
                "actionSurfaceHash",
                "runnerHash",
            ],
            "excludedObservedFields": [
                "startMetrics",
                "startMetricsHash",
                "warmupObservedHash",
                "legacySessionReplayId",
                "reward",
                "terminal",
                "actionEffect",
            ],
            "observedFieldsReportedSeparately": [
                "startMetricsHash",
                "warmupObservedHash",
                "legacySessionReplayId",
            ],
        },
        "thresholdsLockedBeforeRun": thresholds_locked_before_run,
        "sampleCounts": sample_counts,
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(),
        "guardrails": _guardrails(),
        "contractRows": rows,
        "contractRowsHash": _hash_value({"rows": rows}),
        "replaySpecIdCountsByScenario": dict(
            sorted(Counter(str(row.get("scenarioId")) for row in rows if row.get("scenarioId")).items())
        ),
        "validation": {
            "identityStabilityDoesNotHideStartMetricsDrift": stable_spec_with_metrics_drift_count == EXPECTED_ROW_COUNT,
            "startMetricsDriftStillBlocksGreen": start_metrics_repeat_mismatch_count == EXPECTED_ROW_COUNT,
            "warmupObservedHashStableInSource": warmup_observed_repeat_mismatch_count == 0,
            "actionSurfaceHashPinned": action_surface_hash == DECODER_HASH,
            "envRunnerConditionalWriteStillForbidden": True,
        },
        "allowNext": ["93S2R4.3 Deterministic-Reset-/Warmup-Repair"] if ok else [],
        "opensNext": ["93S2R4.3 Deterministic-Reset-/Warmup-Repair"] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "BT93S2R4 green/reentry",
                "reason": "93S2R4.2 stabilizes the identity contract only; StartMetrics repeat drift remains counted on all 103 rows.",
                "active": True,
            },
            {
                "scope": "env/runner conditional write",
                "reason": "93S2R4.2 locks hashes and thresholds but does not yet provide minimal-repro root-cause evidence.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R4.3 minimal repro for deterministic reset/warmup using replaySpecId and the locked thresholds.",
            "Keep python/envs/curvios_env.py and scripts/training-headless-lane-runner.mjs read-only until 93S2R4.3 proves a concrete cause.",
            "Do not start 93S2R3.3-Reentry, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r4_replay_identity_contract.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r4_deterministic_reset_repair.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure/documentation gates",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write replay identity contract artifact.")
    args = parser.parse_args()

    report = build_report()
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
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
