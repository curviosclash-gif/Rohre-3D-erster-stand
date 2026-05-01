"""BT93S2R4.4 predicate/window recheck on stable replay basis.

This phase may start only after the BT93S2R4.3 repeat gate is green. It reruns
the 103 locked replay rows with three repeats and measures only predicate,
minimum-window, warmup-terminal, and pre-action validity. It does not judge
action quality, train PPO, consume holdout seeds, or change runtime surfaces.
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

import bt93s2_existing_action_effect_v3_recheck as v3_recheck  # noqa: E402
import bt93s2r4_deterministic_reset_repair as reset_repair  # noqa: E402
import bt93s2r4_replay_identity_contract as identity  # noqa: E402
import bt93s2r4_replay_root_cause_audit as audit  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R4_ROOT = PPO_ROOT / "bt93s2r4"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r4_predicate_window_stable_replay.py"
REPORT_PATH = BT93S2R4_ROOT / "predicate_window_stable_replay_report.json"

IDENTITY_CONTRACT_PATH = BT93S2R4_ROOT / "replay_identity_contract.json"
ROOT_CAUSE_AUDIT_PATH = BT93S2R4_ROOT / "replay_root_cause_audit.json"
DETERMINISTIC_RESET_REPORT_PATH = BT93S2R4_ROOT / "deterministic_reset_repair_report.json"
S2R_MATRIX_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

BLOCK_ID = "BT93S2R4"
PHASE_ID = "93S2R4.4"
GREEN_RESULT = "stable-replay-predicate-window-green"
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
    payload = _read_json(path) if path.suffix == ".json" else {}
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
            },
            True,
        ),
        "s2r4DeterministicResetRepair": (
            DETERMINISTIC_RESET_REPORT_PATH,
            "BT93S2R4.3 deterministic reset/warmup repair gate",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R4.3",
                "resultClass": "deterministic-reset-warmup-repair-green",
                "ok": True,
                "sampleCounts.replayAttemptCount": EXPECTED_ROW_COUNT * LOCKED_REPAIR_REPEAT_COUNT,
                "sampleCounts.replaySpecIdRepeatMismatchCount": 0,
                "sampleCounts.startMetricsHashRepeatMismatchCount": 0,
                "sampleCounts.warmupKeyRepeatMismatchCount": 0,
                "sampleCounts.sessionIdDriftCount": 0,
                "claimFlags.phase93S2R4_4Allowed": True,
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
            },
            True,
        ),
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
        "pythonEnv": (ENV_PATH, "Python sidecar environment, read-only", {}, True),
        "headlessRunner": (HEADLESS_RUNNER_PATH, "JS-authoritative headless transition path, read-only", {}, True),
        "stableReplayScript": (SCRIPT_PATH, "BT93S2R4.4 report generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(key, path, role, expected, tracked, required=required)
        for key, (path, role, expected, required) in specs.items()
    ]


def _source_files_ready(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)


def _source_files_versioned(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(item.get("tracked") is True for item in source_artifacts if item.get("required") is True)


def _scenario_index(matrix_contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    scenarios: dict[str, Mapping[str, Any]] = {}
    for scenario in _as_list(matrix_contract.get("scenarios")):
        if not isinstance(scenario, Mapping):
            continue
        scenario_id = str(scenario.get("id") or "")
        if scenario_id:
            scenarios[scenario_id] = scenario
    return scenarios


def _repeat_steps(scenario: Mapping[str, Any]) -> int:
    effect_window = _as_mapping(scenario.get("effectWindow"))
    return int(effect_window.get("maxSteps") or 24)


def _minimum_completed_steps(scenario: Mapping[str, Any]) -> int | None:
    effect_window = _as_mapping(scenario.get("effectWindow"))
    value = effect_window.get("minimumCompletedSteps")
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _probe_invalid_before_action(probe: Mapping[str, Any]) -> bool:
    predicate = _as_mapping(probe.get("v3Predicate"))
    return bool(
        probe.get("ok") is not True
        or predicate.get("pass") is not True
        or probe.get("warmupTerminalBeforeAction") is True
    )


def _stable_run_payload(
    contract_row: Mapping[str, Any],
    scenario: Mapping[str, Any],
    probe: Mapping[str, Any],
    *,
    run_index: int,
) -> dict[str, Any]:
    scenario_id = str(contract_row.get("scenarioId") or "")
    seed = int(contract_row.get("seed") or 0)
    action_name = str(contract_row.get("actionName") or "")
    start_metrics = _as_mapping(probe.get("startMetrics"))
    start_metrics_hash = _hash_value(start_metrics)
    warmup_payload = reset_repair._warmup_payload(scenario_id, seed, action_name, scenario)
    predicate = _as_mapping(probe.get("v3Predicate"))
    return {
        "runIndex": run_index,
        "replaySpecId": contract_row.get("replaySpecId"),
        "sessionReplayId": reset_repair._repair_session_replay_id(contract_row),
        "runnerSessionId": reset_repair._runner_session_id(scenario_id, seed),
        "startMetricsHash": start_metrics_hash,
        "warmupKey": _hash_value(warmup_payload),
        "predicate": {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": PREDICATE_FUNCTION,
            "pass": predicate.get("pass"),
            "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement"),
        },
        "minimumWindow": {
            "completed": probe.get("completedMinimumWindow"),
            "observedSteps": probe.get("observedSteps"),
            "minimumCompletedSteps": _minimum_completed_steps(scenario),
            "requestedRepeatSteps": probe.get("requestedRepeatSteps"),
        },
        "warmup": {
            "warmupAction": warmup_payload.get("warmupAction"),
            "warmupSteps": warmup_payload.get("warmupSteps"),
            "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
        },
        "preActionValidity": {
            "ok": probe.get("ok"),
            "predicatePass": predicate.get("pass"),
            "completedMinimumWindow": probe.get("completedMinimumWindow"),
            "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
            "measurementInvalidBeforeAction": _probe_invalid_before_action(probe),
        },
        "startMetrics": dict(start_metrics),
        "probeError": probe.get("error"),
    }


def _row_result_class(probe_runs: list[Mapping[str, Any]]) -> str:
    if any(run.get("probeError") or _as_mapping(run.get("preActionValidity")).get("ok") is not True for run in probe_runs):
        return "measurement-invalid"
    first = probe_runs[0] if probe_runs else {}
    repeated_fields = ("replaySpecId", "sessionReplayId", "startMetricsHash", "warmupKey")
    if any(any(run.get(field) != first.get(field) for run in probe_runs[1:]) for field in repeated_fields):
        return "replay-determinism-required"
    if any(
        _as_mapping(run.get("preActionValidity")).get("predicatePass") is not True
        or _as_mapping(run.get("preActionValidity")).get("completedMinimumWindow") is not True
        or _as_mapping(run.get("preActionValidity")).get("warmupTerminalBeforeAction") is True
        or _as_mapping(run.get("preActionValidity")).get("measurementInvalidBeforeAction") is True
        for run in probe_runs
    ):
        return "predicate-window-required"
    return "stable-replay-row-green"


def _stable_row(
    contract_row: Mapping[str, Any],
    scenario: Mapping[str, Any] | None,
    *,
    repeat_count: int,
) -> dict[str, Any]:
    scenario_id = str(contract_row.get("scenarioId") or "")
    seed = contract_row.get("seed")
    action_name = str(contract_row.get("actionName") or "")
    if not isinstance(scenario, Mapping) or not scenario:
        return {
            "ledgerIndex": contract_row.get("ledgerIndex"),
            "scenarioId": scenario_id,
            "seed": seed,
            "actionName": action_name,
            "replaySpecId": contract_row.get("replaySpecId"),
            "resultClass": "measurement-invalid",
            "blockingClasses": ["measurement-invalid"],
            "issues": ["scenario-contract-missing"],
            "probeRuns": [],
            "actionEffectEvaluated": False,
        }

    probe_runs: list[dict[str, Any]] = []
    for run_index in range(repeat_count):
        probe = v3_recheck._run_probe_v3(
            scenario,
            seed=int(seed),
            action_name=action_name,
            repeat_steps=_repeat_steps(scenario),
        )
        probe_runs.append(_stable_run_payload(contract_row, scenario, probe, run_index=run_index + 1))

    result_class = _row_result_class(probe_runs)
    first = probe_runs[0] if probe_runs else {}
    issues: list[str] = []
    if result_class == "measurement-invalid":
        issues.append("probe-error-or-ok-false")
    if result_class == "replay-determinism-required":
        for field in ("replaySpecId", "sessionReplayId", "startMetricsHash", "warmupKey"):
            if any(run.get(field) != first.get(field) for run in probe_runs[1:]):
                issues.append(f"{field}-repeat-mismatch")
    if any(_as_mapping(run.get("preActionValidity")).get("predicatePass") is not True for run in probe_runs):
        issues.append("predicate-fail")
    if any(_as_mapping(run.get("preActionValidity")).get("completedMinimumWindow") is not True for run in probe_runs):
        issues.append("minimum-window-fail")
    if any(_as_mapping(run.get("preActionValidity")).get("warmupTerminalBeforeAction") is True for run in probe_runs):
        issues.append("warmup-terminal-before-action")
    if any(_as_mapping(run.get("preActionValidity")).get("measurementInvalidBeforeAction") is True for run in probe_runs):
        issues.append("measurement-invalid-before-action")

    blocking_classes = sorted(
        {
            item
            for item in (
                result_class if result_class != "stable-replay-row-green" else None,
                "predicate-window-required"
                if any(
                    issue in issues
                    for issue in (
                        "predicate-fail",
                        "minimum-window-fail",
                        "warmup-terminal-before-action",
                        "measurement-invalid-before-action",
                    )
                )
                else None,
            )
            if item
        }
    )
    return {
        "ledgerIndex": contract_row.get("ledgerIndex"),
        "sourceProbeIndex": contract_row.get("sourceProbeIndex"),
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": action_name,
        "actionToken": contract_row.get("actionToken"),
        "replaySpecId": contract_row.get("replaySpecId"),
        "sessionReplayId": first.get("sessionReplayId"),
        "runnerSessionId": first.get("runnerSessionId"),
        "expectedDirection": contract_row.get("expectedDirection"),
        "retainedV2Status": contract_row.get("retainedV2Status"),
        "resultClass": result_class,
        "blockingClasses": blocking_classes,
        "issues": sorted(set(issues)),
        "repeatStable": not any("repeat-mismatch" in issue for issue in issues),
        "predicatePass": all(
            _as_mapping(run.get("preActionValidity")).get("predicatePass") is True for run in probe_runs
        ),
        "completedMinimumWindow": all(
            _as_mapping(run.get("preActionValidity")).get("completedMinimumWindow") is True for run in probe_runs
        ),
        "warmupTerminalBeforeAction": any(
            _as_mapping(run.get("preActionValidity")).get("warmupTerminalBeforeAction") is True for run in probe_runs
        ),
        "measurementInvalidBeforeAction": any(
            _as_mapping(run.get("preActionValidity")).get("measurementInvalidBeforeAction") is True for run in probe_runs
        ),
        "minimumCompletedSteps": _minimum_completed_steps(scenario),
        "repeatCount": len(probe_runs),
        "probeRuns": probe_runs,
        "actionEffectEvaluated": False,
    }


def _count_false(rows: Iterable[Mapping[str, Any]], *keys: str) -> int:
    return sum(1 for row in rows if _get(row, *keys) is not True)


def _claim_flags(ok: bool) -> dict[str, bool]:
    return {
        "phase93S2R4_4Allowed": False,
        "phase93S2R4_5Allowed": ok,
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


def _result_class(*, sources_ready: bool, row_results: list[Mapping[str, Any]]) -> str:
    if not sources_ready or not row_results:
        return "measurement-invalid"
    row_classes = {str(row.get("resultClass")) for row in row_results}
    if "measurement-invalid" in row_classes:
        return "measurement-invalid"
    if "replay-determinism-required" in row_classes:
        return "replay-determinism-required"
    if "predicate-window-required" in {
        item for row in row_results for item in _as_list(row.get("blockingClasses"))
    }:
        return "predicate-window-required"
    if any(row.get("resultClass") != "stable-replay-row-green" for row in row_results):
        return "measurement-invalid"
    return GREEN_RESULT


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {
        str(item.get("sourceKey")): item.get("sha256")
        for item in source_artifacts
        if item.get("sourceKey")
    }


def build_report(*, row_limit: int | None = None, repeat_count: int | None = None) -> dict[str, Any]:
    identity_contract = _read_json(IDENTITY_CONTRACT_PATH)
    deterministic_report = _read_json(DETERMINISTIC_RESET_REPORT_PATH)
    matrix_contract = _read_json(S2R_MATRIX_CONTRACT_PATH)
    locked_repeat_count = int(
        _get(identity_contract, "thresholdsLockedBeforeRun", "repeatCountForRepairGate")
        or LOCKED_REPAIR_REPEAT_COUNT
    )
    effective_repeat_count = int(repeat_count or locked_repeat_count)
    source_artifacts = _source_artifacts()
    source_files_ready = _source_files_ready(source_artifacts)
    source_files_versioned = _source_files_versioned(source_artifacts)
    scenarios = _scenario_index(matrix_contract)
    contract_rows = [
        row for row in _as_list(identity_contract.get("contractRows"))
        if isinstance(row, Mapping)
    ]
    if row_limit is not None:
        contract_rows = contract_rows[: max(0, int(row_limit))]
    row_results = [
        _stable_row(row, scenarios.get(str(row.get("scenarioId") or "")), repeat_count=effective_repeat_count)
        for row in contract_rows
    ]
    row_count = len(row_results)
    replay_attempt_count = sum(len(_as_list(row.get("probeRuns"))) for row in row_results)
    replay_spec_mismatch_count = _count_false(row_results, "repeatStable")
    start_metrics_mismatch_count = sum(
        1
        for row in row_results
        if not _all_same(
            [run.get("startMetricsHash") for run in _as_list(row.get("probeRuns")) if run.get("startMetricsHash")]
        )
    )
    warmup_key_mismatch_count = sum(
        1
        for row in row_results
        if not _all_same([run.get("warmupKey") for run in _as_list(row.get("probeRuns")) if run.get("warmupKey")])
    )
    session_id_drift_count = sum(
        1
        for row in row_results
        if not _all_same(
            [run.get("sessionReplayId") for run in _as_list(row.get("probeRuns")) if run.get("sessionReplayId")]
        )
    )
    predicate_failure_count = sum(1 for row in row_results if row.get("predicatePass") is not True)
    minimum_window_failure_count = sum(1 for row in row_results if row.get("completedMinimumWindow") is not True)
    warmup_terminal_count = sum(1 for row in row_results if row.get("warmupTerminalBeforeAction") is True)
    measurement_invalid_count = sum(1 for row in row_results if row.get("measurementInvalidBeforeAction") is True)
    probe_error_count = sum(
        1
        for row in row_results
        for run in _as_list(row.get("probeRuns"))
        if run.get("probeError")
    )
    action_effect_override_count = sum(1 for row in row_results if row.get("actionEffectEvaluated") is True)
    result_class = _result_class(sources_ready=source_files_ready, row_results=row_results)
    ok = bool(result_class == GREEN_RESULT)
    row_class_counts = Counter(str(row.get("resultClass")) for row in row_results)
    issue_counts = Counter(issue for row in row_results for issue in _as_list(row.get("issues")))
    blocking_class_counts = Counter(
        blocking for row in row_results for blocking in _as_list(row.get("blockingClasses"))
    )
    phase_coverage = {
        "93S2R4.4.1": bool(
            _get(deterministic_report, "resultClass") == "deterministic-reset-warmup-repair-green"
            and _get(deterministic_report, "sampleCounts", "replayAttemptCount")
            == EXPECTED_ROW_COUNT * LOCKED_REPAIR_REPEAT_COUNT
            and _get(deterministic_report, "sampleCounts", "startMetricsHashRepeatMismatchCount") == 0
            and all(
                all(
                    _as_mapping(run.get("predicate")).get("expression")
                    and _as_mapping(run.get("predicate")).get("function") == PREDICATE_FUNCTION
                    for run in _as_list(row.get("probeRuns"))
                )
                for row in row_results
            )
        ),
        "93S2R4.4.2": bool(
            row_count == EXPECTED_ROW_COUNT
            and replay_attempt_count >= EXPECTED_ROW_COUNT * LOCKED_REPAIR_REPEAT_COUNT
            and all(
                all(
                    _as_mapping(run.get("minimumWindow")).get("minimumCompletedSteps") is not None
                    and "measurementInvalidBeforeAction" in _as_mapping(run.get("preActionValidity"))
                    for run in _as_list(row.get("probeRuns"))
                )
                for row in row_results
            )
        ),
        "93S2R4.4.3": bool(
            predicate_failure_count == 0
            and minimum_window_failure_count == 0
            and measurement_invalid_count == 0
            and warmup_terminal_count == 0
        ),
    }
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
        "predicateFailureCount": predicate_failure_count,
        "minimumWindowFailureCount": minimum_window_failure_count,
        "warmupTerminalBeforeActionCount": warmup_terminal_count,
        "measurementInvalidBeforeActionCount": measurement_invalid_count,
        "probeErrorCount": probe_error_count,
        "actionEffectOverrideCount": action_effect_override_count,
        "sourceDeterministicReplayAttemptCount": _get(deterministic_report, "sampleCounts", "replayAttemptCount"),
        "sourceStartMetricsHashRepeatMismatchCount": _get(
            deterministic_report, "sampleCounts", "startMetricsHashRepeatMismatchCount"
        ),
        "sourceWarmupKeyRepeatMismatchCount": _get(
            deterministic_report, "sampleCounts", "warmupKeyRepeatMismatchCount"
        ),
        "sourceSessionIdDriftCount": _get(deterministic_report, "sampleCounts", "sessionIdDriftCount"),
        "scenarioCount": len({row.get("scenarioId") for row in row_results}),
        "actionCount": len({row.get("actionName") for row in row_results}),
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    compact_rows = [
        {
            "ledgerIndex": row.get("ledgerIndex"),
            "scenarioId": row.get("scenarioId"),
            "seed": row.get("seed"),
            "actionName": row.get("actionName"),
            "actionToken": row.get("actionToken"),
            "replaySpecId": row.get("replaySpecId"),
            "sessionReplayId": row.get("sessionReplayId"),
            "runnerSessionId": row.get("runnerSessionId"),
            "resultClass": row.get("resultClass"),
            "blockingClasses": row.get("blockingClasses"),
            "issues": row.get("issues"),
            "repeatStable": row.get("repeatStable"),
            "predicatePass": row.get("predicatePass"),
            "completedMinimumWindow": row.get("completedMinimumWindow"),
            "warmupTerminalBeforeAction": row.get("warmupTerminalBeforeAction"),
            "measurementInvalidBeforeAction": row.get("measurementInvalidBeforeAction"),
            "minimumCompletedSteps": row.get("minimumCompletedSteps"),
            "repeatCount": row.get("repeatCount"),
            "runHashes": [
                {
                    "runIndex": run.get("runIndex"),
                    "startMetricsHash": run.get("startMetricsHash"),
                    "warmupKey": run.get("warmupKey"),
                    "predicatePass": _get(run, "preActionValidity", "predicatePass"),
                    "completedMinimumWindow": _get(run, "preActionValidity", "completedMinimumWindow"),
                    "measurementInvalidBeforeAction": _get(run, "preActionValidity", "measurementInvalidBeforeAction"),
                }
                for run in _as_list(row.get("probeRuns"))
            ],
        }
        for row in row_results
    ]
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r4-predicate-window-stable-replay-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
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
            "predicateRecheckStartedAfterRepeatGateGreen": _get(deterministic_report, "ok") is True,
            "deterministicResetRepairReportHash": deterministic_report.get("reportHash"),
            "identityContractReportHash": identity_contract.get("reportHash"),
            "lockedRepairRepeatCount": LOCKED_REPAIR_REPEAT_COUNT,
            "currentSourceHashes": _source_hashes(source_artifacts),
            "predicateFunction": PREDICATE_FUNCTION,
            "minimumWindow": _get(identity_contract, "thresholdsLockedBeforeRun", "minimumWindow"),
        },
        "measurementContract": {
            "predicateFunction": PREDICATE_FUNCTION,
            "predicateMustPassBeforeMeasurement": True,
            "minimumWindowMustPass": True,
            "warmupTerminalBeforeActionAllowed": False,
            "measurementInvalidBeforeActionMustBeZero": True,
            "actionEffectCanOverridePreflightFailure": False,
            "actionEffectJudgementEvaluated": False,
        },
        "sampleCounts": sample_counts,
        "rowResultCounts": dict(sorted(row_class_counts.items())),
        "issueCounts": dict(sorted(issue_counts.items())),
        "blockingClassCounts": dict(sorted(blocking_class_counts.items())),
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
            "actionEffectOverrideCount": action_effect_override_count,
            "qualityClaimAllowed": False,
            "downstreamStillBlockedUntilS2R4_99": True,
        },
        "stableReplayRows": compact_rows,
        "stableReplayRowsHash": _hash_value({"rows": compact_rows}),
        "validation": {
            "sourceRepeatGateGreen": _get(deterministic_report, "resultClass")
            == "deterministic-reset-warmup-repair-green",
            "lockedReplaySpecStillStable": replay_spec_mismatch_count == 0,
            "startMetricsRepeatStable": start_metrics_mismatch_count == 0,
            "warmupKeyRepeatStable": warmup_key_mismatch_count == 0,
            "sessionReplayIdRepeatStable": session_id_drift_count == 0,
            "predicateWindowGreen": ok,
        },
        "allowNext": ["93S2R4.5 Full Replacement Preflight und S2R3-Reentry-Entscheid"] if ok else [],
        "opensNext": ["93S2R4.5 Full Replacement Preflight und S2R3-Reentry-Entscheid"] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "BT93S2R4.5/99",
                "reason": "93S2R4.4 only proves predicate/window validity on the stable replay basis; full gate and closure remain open.",
                "active": ok,
            },
            {
                "scope": "quality/PPO/candidate/freeze/holdout/promote/rollout",
                "reason": "Still blocked until BT93S2R4.99 replay-startstate-green.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R4.5 full 103-row x 3-repeat replacement preflight gate.",
            "Then close BT93S2R4.99; only replay-startstate-green may open 93S2R3.3-Reentry.",
            "Do not start BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ]
        if ok
        else [
            "Stop S2R4 and repair the reported replay/predicate/window blocker in a narrow follow-up.",
            "Do not start 93S2R4.5, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r4_predicate_window_stable_replay.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r4_full_replay_preflight_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "phase gate executes 103 rows x 3 repeats; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write predicate/window stable replay artifact.")
    parser.add_argument("--row-limit", type=int, default=None, help="Diagnostic partial run; does not close the phase.")
    parser.add_argument("--repeat-count", type=int, default=None, help="Diagnostic repeat override; defaults to locked repeat count.")
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
