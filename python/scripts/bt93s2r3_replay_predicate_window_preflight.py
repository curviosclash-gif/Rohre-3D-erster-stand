"""BT93S2R3.2 replay determinism and predicate/window fail-fast preflight.

This phase reruns only the BT93S2R3 failure-ledger rows. It does not evaluate
action quality, train PPO, consume holdout seeds, or change runtime/action
surfaces. Any pre-action drift blocks later S2R3 action-effect phases.
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
import bt93s2r3_failure_ledger as ledger  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2R2_ROOT = PPO_ROOT / "bt93s2r2"
BT93S2R3_ROOT = PPO_ROOT / "bt93s2r3"

FAILURE_LEDGER_PATH = BT93S2R3_ROOT / "failure_ledger_report.json"
REPAIR_CONTRACT_PATH = BT93S2R2_ROOT / "predicate_window_repair_contract.json"
EMPIRICAL_GATE_PATH = BT93S2R2_ROOT / "empirical_reentry_gate_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r3_replay_predicate_window_preflight.py"
REPORT_PATH = BT93S2R3_ROOT / "replay_predicate_window_preflight.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r3_measurement_reentry_required.md"

BLOCK_ID = "BT93S2R3"
PHASE_ID = "93S2R3.2"
GREEN_RESULT = "replay-predicate-window-preflight-green"
MATRIX_ID = ledger.MATRIX_ID
CONTRACT_ID = ledger.CONTRACT_ID
REPAIR_CONTRACT_ID = ledger.REPAIR_CONTRACT_ID
ACTION_SURFACE_ID = ledger.ACTION_SURFACE_ID
DECODER_HASH = ledger.DECODER_HASH
EXPECTED_LEDGER_ROWS = ledger.EXPECTED_LEDGER_ROWS
DEFAULT_REPEAT_COUNT = 2

DOWNSTREAM_BLOCKS = [
    "93S2R3.3 Direction-/Escape-Fairness-/Neutral-Control start before preflight green",
    "93S2R3.4 Retained-v2 and empirical zero gate before preflight green",
    "93S2R3.99 closure before all S2R3 subphases are closed",
    *ledger.DOWNSTREAM_BLOCKS,
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
    return ledger._rel(path)


def _sha256_file(path: Path | None) -> str | None:
    return ledger._sha256_file(path)


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return sha256(_json_text(payload).encode("utf-8")).hexdigest()


def _hash_value(value: Any) -> str:
    return ledger._hash_value(value)


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
    path: Path,
    role: str,
    tracked: set[str],
    expected: Mapping[str, Any],
    *,
    source_key: str,
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
        "fresh": bool(path.is_file() and (tracked_ok or not required) and expected_ok),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "matrixId": payload.get("matrixId") if payload else None,
        "contractId": payload.get("contractId") if payload else None,
        "expected": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "failureLedger": (
            FAILURE_LEDGER_PATH,
            "BT93S2R3.1 source-lock and failure-ledger input",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R3.1",
                "resultClass": "source-lock-failure-ledger-written",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
            },
            True,
        ),
        "repairContract": (
            REPAIR_CONTRACT_PATH,
            "BT93S2R2 predicate/window repair contract",
            {
                "blockId": "BT93S2R2",
                "phaseId": "93S2R2.2",
                "resultClass": "predicate-window-repair-contract-green",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
            },
            True,
        ),
        "empiricalGate": (
            EMPIRICAL_GATE_PATH,
            "BT93S2R2 red empirical gate context",
            {
                "blockId": "BT93S2R2",
                "phaseId": "93S2R2.3",
                "resultClass": "measurement-invalid",
                "ok": False,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
            },
            True,
        ),
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}, True),
        "preflightScript": (SCRIPT_PATH, "BT93S2R3.2 preflight generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(path, role, tracked, expected, source_key=key, required=required)
        for key, (path, role, expected, required) in specs.items()
    ]


def _source_contracts_ready(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)


def _scenario_index(repair_contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    scenarios: dict[str, Mapping[str, Any]] = {}
    for repair in _as_list(_get(repair_contract, "repairContract", "scenarioRepairs")):
        if not isinstance(repair, Mapping):
            continue
        scenario = _as_mapping(repair.get("repairedScenarioContract"))
        scenario_id = str(scenario.get("id") or repair.get("scenarioId") or "")
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


def _warmup_payload(
    scenario_id: str,
    seed: int | str,
    action_name: str,
    probe: Mapping[str, Any],
    fallback: Mapping[str, Any],
) -> dict[str, Any]:
    return {
        "scenarioId": scenario_id,
        "seed": str(seed),
        "warmupAction": probe.get("warmupAction") or fallback.get("warmupAction"),
        "warmupSteps": probe.get("warmupSteps") if probe.get("warmupSteps") is not None else fallback.get("warmupSteps"),
        "actionName": action_name,
    }


def _replay_payload(
    scenario_id: str,
    seed: int | str,
    action_name: str,
    action_token: Any,
    warmup_key: str,
    start_metrics_hash: str,
) -> dict[str, Any]:
    return {
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "actionSurfaceId": ACTION_SURFACE_ID,
        "decoderHash": DECODER_HASH,
        "scenarioId": scenario_id,
        "seed": str(seed),
        "actionName": action_name,
        "actionToken": action_token,
        "warmupKey": warmup_key,
        "startMetricsHash": start_metrics_hash,
    }


def _session_replay_id(payload: Mapping[str, Any]) -> str:
    return f"bt93s2r3-{_hash_value(payload)[:24]}"


def _probe_invalid_before_action(probe: Mapping[str, Any]) -> bool:
    predicate = _as_mapping(probe.get("v3Predicate"))
    return bool(
        probe.get("ok") is not True
        or predicate.get("pass") is not True
        or probe.get("completedMinimumWindow") is not True
        or probe.get("warmupTerminalBeforeAction") is True
    )


def _probe_preflight_row(
    ledger_row: Mapping[str, Any],
    probe: Mapping[str, Any],
    *,
    run_index: int,
) -> dict[str, Any]:
    scenario_id = str(ledger_row.get("scenarioId") or "")
    seed = ledger_row.get("seed")
    action_name = str(ledger_row.get("actionName") or "")
    fallback_warmup = _as_mapping(ledger_row.get("warmup"))
    start_metrics = _as_mapping(probe.get("startMetrics"))
    start_metrics_hash = _hash_value(start_metrics)
    warmup_payload = _warmup_payload(scenario_id, seed, action_name, probe, fallback_warmup)
    warmup_key = _hash_value(warmup_payload)
    replay_payload = _replay_payload(
        scenario_id,
        seed,
        action_name,
        ledger_row.get("actionToken"),
        warmup_key,
        start_metrics_hash,
    )
    predicate = _as_mapping(probe.get("v3Predicate"))
    minimum_completed_steps = _as_mapping(ledger_row.get("preActionValidity")).get("minimumCompletedSteps")
    return {
        "runIndex": run_index,
        "sessionReplayId": _session_replay_id(replay_payload),
        "replayKeyPayload": replay_payload,
        "startMetricsHash": start_metrics_hash,
        "sourceStartMetricsHash": ledger_row.get("startMetricsHash"),
        "startMetricsSourceMatch": start_metrics_hash == ledger_row.get("startMetricsHash"),
        "warmupKey": warmup_key,
        "sourceWarmupKey": ledger_row.get("warmupKey"),
        "warmupSourceMatch": warmup_key == ledger_row.get("warmupKey"),
        "sourceSessionReplayId": ledger_row.get("sessionReplayId"),
        "sessionReplayIdSourceMatch": _session_replay_id(replay_payload) == ledger_row.get("sessionReplayId"),
        "predicate": {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": "bt93s2_scenario_matrix_v2._predicate_ok",
            "pass": predicate.get("pass"),
            "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement"),
        },
        "minimumWindow": {
            "completed": probe.get("completedMinimumWindow"),
            "observedSteps": probe.get("observedSteps"),
            "minimumCompletedSteps": minimum_completed_steps,
            "requestedRepeatSteps": probe.get("requestedRepeatSteps"),
        },
        "warmup": {
            "warmupAction": warmup_payload["warmupAction"],
            "warmupSteps": warmup_payload["warmupSteps"],
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
    if any(
        run.get("startMetricsSourceMatch") is not True
        or run.get("warmupSourceMatch") is not True
        or run.get("sessionReplayIdSourceMatch") is not True
        for run in probe_runs
    ):
        return "replay-determinism-required"
    first = probe_runs[0] if probe_runs else {}
    repeated_fields = ("sessionReplayId", "startMetricsHash", "warmupKey")
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
    return "preflight-pass"


def _preflight_result_row(
    ledger_row: Mapping[str, Any],
    scenario: Mapping[str, Any] | None,
    *,
    repeat_count: int,
) -> dict[str, Any]:
    scenario_id = str(ledger_row.get("scenarioId") or "")
    seed = ledger_row.get("seed")
    action_name = str(ledger_row.get("actionName") or "")
    if not isinstance(scenario, Mapping) or not scenario:
        return {
            "ledgerIndex": ledger_row.get("ledgerIndex"),
            "scenarioId": scenario_id,
            "seed": seed,
            "actionName": action_name,
            "sourceSessionReplayId": ledger_row.get("sessionReplayId"),
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
        probe_runs.append(_probe_preflight_row(ledger_row, probe, run_index=run_index + 1))

    result_class = _row_result_class(probe_runs)
    first = probe_runs[0] if probe_runs else {}
    issues: list[str] = []
    if result_class == "measurement-invalid":
        issues.append("probe-error-or-ok-false")
    if result_class == "replay-determinism-required":
        if any(run.get("startMetricsSourceMatch") is not True for run in probe_runs):
            issues.append("start-metrics-source-mismatch")
        if any(run.get("warmupSourceMatch") is not True for run in probe_runs):
            issues.append("warmup-source-mismatch")
        if any(run.get("sessionReplayIdSourceMatch") is not True for run in probe_runs):
            issues.append("session-replay-id-source-mismatch")
        for field in ("sessionReplayId", "startMetricsHash", "warmupKey"):
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
                result_class if result_class != "preflight-pass" else None,
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
        "ledgerIndex": ledger_row.get("ledgerIndex"),
        "sourceProbeIndex": ledger_row.get("sourceProbeIndex"),
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": action_name,
        "actionToken": ledger_row.get("actionToken"),
        "sourceSessionReplayId": ledger_row.get("sessionReplayId"),
        "freshSessionReplayId": first.get("sessionReplayId"),
        "expectedDirection": ledger_row.get("expectedDirection"),
        "retainedV2Status": ledger_row.get("retainedV2Status"),
        "resultClass": result_class,
        "blockingClasses": blocking_classes,
        "issues": sorted(set(issues)),
        "repeatStable": not any("repeat-mismatch" in issue for issue in issues),
        "sourceReplayStable": not any("source-mismatch" in issue for issue in issues),
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


def _claim_flags(*, next_phase_allowed: bool) -> dict[str, bool]:
    return {
        "phase93S2R3_3Allowed": next_phase_allowed,
        "phase93S2R3_4Allowed": False,
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
    guardrails = ledger._guardrails()
    guardrails["actionEffectEvaluated"] = False
    guardrails["newEvalRunStarted"] = False
    return guardrails


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
    if any(row.get("resultClass") != "preflight-pass" for row in row_results):
        return "measurement-invalid"
    return GREEN_RESULT


def build_report(*, repeat_count: int = DEFAULT_REPEAT_COUNT) -> dict[str, Any]:
    repeat_count = max(1, int(repeat_count))
    failure_ledger = _read_json(FAILURE_LEDGER_PATH)
    repair_contract = _read_json(REPAIR_CONTRACT_PATH)
    source_artifacts = _source_artifacts()
    sources_ready = _source_contracts_ready(source_artifacts)
    scenario_map = _scenario_index(repair_contract)
    ledger_rows = [row for row in _as_list(failure_ledger.get("failureLedgerRows")) if isinstance(row, Mapping)]
    row_results = [
        _preflight_result_row(row, scenario_map.get(str(row.get("scenarioId") or "")), repeat_count=repeat_count)
        for row in ledger_rows
    ]

    result_class = _result_class(sources_ready=sources_ready, row_results=row_results)
    next_phase_allowed = result_class == GREEN_RESULT
    row_class_counts = Counter(str(row.get("resultClass")) for row in row_results)
    issue_counts = Counter(issue for row in row_results for issue in _as_list(row.get("issues")))
    blocking_class_counts = Counter(item for row in row_results for item in _as_list(row.get("blockingClasses")))
    replay_determinism_failure_count = sum(
        1 for row in row_results if "replay-determinism-required" in _as_list(row.get("blockingClasses"))
    )
    predicate_failure_count = sum(1 for row in row_results if row.get("predicatePass") is not True)
    minimum_window_failure_count = sum(1 for row in row_results if row.get("completedMinimumWindow") is not True)
    warmup_terminal_count = sum(1 for row in row_results if row.get("warmupTerminalBeforeAction") is True)
    measurement_invalid_count = sum(1 for row in row_results if row.get("measurementInvalidBeforeAction") is True)
    action_effect_override_count = sum(1 for row in row_results if row.get("actionEffectEvaluated") is True)
    session_replay_ids = {str(row.get("freshSessionReplayId")) for row in row_results if row.get("freshSessionReplayId")}
    phase_coverage = {
        "93S2R3.2.1": bool(
            len(row_results) == EXPECTED_LEDGER_ROWS
            and len(session_replay_ids) == len(row_results)
            and all(row.get("freshSessionReplayId") for row in row_results)
        ),
        "93S2R3.2.2": bool(
            row_results
            and all(len(_as_list(row.get("probeRuns"))) == repeat_count for row in row_results)
            and all(
                all(
                    _as_mapping(run.get("predicate")).get("expression")
                    and _as_mapping(run.get("predicate")).get("function")
                    and _as_mapping(run.get("minimumWindow")).get("minimumCompletedSteps") is not None
                    for run in _as_list(row.get("probeRuns"))
                )
                for row in row_results
            )
        ),
        "93S2R3.2.3": bool(
            row_results
            and action_effect_override_count == 0
            and all(
                row.get("resultClass") in {
                    "preflight-pass",
                    "replay-determinism-required",
                    "predicate-window-required",
                    "measurement-invalid",
                }
                for row in row_results
            )
        ),
    }
    ok = bool(sources_ready and all(phase_coverage.values()))
    sample_counts = {
        "failureLedgerRowCount": len(ledger_rows),
        "preflightRowCount": len(row_results),
        "repeatCount": repeat_count,
        "replayAttemptCount": sum(len(_as_list(row.get("probeRuns"))) for row in row_results),
        "uniqueFreshSessionReplayIdCount": len(session_replay_ids),
        "replayDeterminismFailureCount": replay_determinism_failure_count,
        "predicateFailureCount": predicate_failure_count,
        "minimumWindowFailureCount": minimum_window_failure_count,
        "warmupTerminalBeforeActionCount": warmup_terminal_count,
        "measurementInvalidBeforeActionCount": measurement_invalid_count,
        "preActionFailFastCount": sum(1 for row in row_results if _as_list(row.get("blockingClasses"))),
        "actionEffectOverrideCount": action_effect_override_count,
        "sourceProbeCount": _get(failure_ledger, "sampleCounts", "probeCount"),
        "sourceTaxonomyFailureRowCount": _get(failure_ledger, "sampleCounts", "sourceTaxonomyFailureRowCount"),
        "scenarioCount": len({row.get("scenarioId") for row in row_results}),
        "actionCount": len({row.get("actionName") for row in row_results}),
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r3-replay-predicate-window-preflight-v1",
        "ok": ok,
        "preflightGreen": next_phase_allowed,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class if ok else "measurement-invalid",
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
        "sourceFilesReady": sources_ready,
        "sourceFailureLedgerHash": failure_ledger.get("failureLedgerHash"),
        "thresholdsLockedBeforeRun": {
            "source": _rel(FAILURE_LEDGER_PATH),
            "repeatCount": repeat_count,
            "expectedLedgerRows": EXPECTED_LEDGER_ROWS,
            "v3PredicateMustPassBeforeMeasurement": True,
            "completedMinimumWindowMustPassBeforeMeasurement": True,
            "warmupTerminalBeforeActionAllowed": False,
            "actionEffectCanOverridePreflightFailure": False,
            "minimumCompletedStepsByScenario": {
                scenario_id: _minimum_completed_steps(scenario) for scenario_id, scenario in scenario_map.items()
            },
        },
        "sampleCounts": sample_counts,
        "rowResultCounts": dict(sorted(row_class_counts.items())),
        "issueCounts": dict(sorted(issue_counts.items())),
        "blockingClassCounts": dict(sorted(blocking_class_counts.items())),
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(next_phase_allowed=next_phase_allowed),
        "guardrails": _guardrails(),
        "allowNext": ["93S2R3.3 Direction-, Escape-Fairness- und Neutral-Control-Contract"]
        if next_phase_allowed
        else [],
        "opensNext": ["93S2R3.3 Direction-, Escape-Fairness- und Neutral-Control-Contract"]
        if next_phase_allowed
        else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R3.3/93S2R3.4/93S2R3.99",
                "reason": "Replay/predicate/window preflight is red."
                if not next_phase_allowed
                else "Only the next S2R3 diagnostic subphase is opened; downstream blocks remain closed.",
                "active": not next_phase_allowed,
            },
            {
                "scope": "BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate, BT95",
                "reason": "BT93S2R3.2 is diagnostic-only and never opens downstream bot-training claims.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R3.3 direction/fairness/neutral-control contract preflight."
        ]
        if next_phase_allowed
        else [
            "Stop S2R3 action-effect work and repair replay/predicate/window measurement before 93S2R3.3.",
            "Do not start BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ],
        "preflightRows": row_results,
        "preflightRowsHash": _hash_value({"rows": row_results}),
        "commands": {
            "write": "python python/scripts/bt93s2r3_replay_predicate_window_preflight.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure/documentation gates",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    issues = _as_mapping(report.get("issueCounts"))
    blocking = _as_mapping(report.get("blockingClassCounts"))
    issue_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in issues.items()) or "- keine"
    blocking_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in blocking.items()) or "- keine"
    source_rows = "\n".join(
        f"- `{source.get('path')}`: role=`{source.get('role')}`, resultClass=`{source.get('resultClass')}`, "
        f"ok=`{source.get('ok')}`, sha256=`{source.get('sha256')}`"
        for source in _as_list(report.get("sourceArtifacts"))
        if isinstance(source, Mapping)
    )
    next_actions = "\n".join(f"- {action}" for action in _as_list(report.get("nextAllowedActions")))
    return f"""# Fehlerbericht: BT93S2R3 Measurement-Reentry erforderlich

## Aufgabe/Kontext

- Task: `93S2R3.2`
- Ziel: Replay-Determinismus, StartMetrics, Warmup, Predicate und Minimum-Window vor jeder Action-Wirkung fail-fast pruefen.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`, `preflightGreen={report.get('preflightGreen')}`
- Failure-Ledger-Rows: `{counts.get('failureLedgerRowCount')}`
- Preflight-Rows: `{counts.get('preflightRowCount')}`
- Replay-Attempts: `{counts.get('replayAttemptCount')}`
- Replay-Determinism-Fails: `{counts.get('replayDeterminismFailureCount')}`
- Predicate-Fails: `{counts.get('predicateFailureCount')}`
- Minimum-Window-Fails: `{counts.get('minimumWindowFailureCount')}`
- Warmup-Terminal-Before-Action: `{counts.get('warmupTerminalBeforeActionCount')}`
- Measurement-Invalid-Before-Action: `{counts.get('measurementInvalidBeforeActionCount')}`
- Action-Effect-Overrides: `{counts.get('actionEffectOverrideCount')}`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

{source_rows}

## Blocking-Klassen

{blocking_rows}

## Issues

{issue_rows}

## Bewertung

`93S2R3.2` ist diagnostic-only. Keine Action-Wirkung, kein Reward, keine
Telemetry, kein ActionSurface- oder Runtime-Pfad darf einen roten Preflight
ueberstimmen.

## Evidence

- `data/training/ppo/bt93s2r3/replay_predicate_window_preflight.json`
- Command: `python python/scripts/bt93s2r3_replay_predicate_window_preflight.py --write-report`

## Naechster Schritt

{next_actions}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    parser.add_argument("--repeat-count", type=int, default=DEFAULT_REPEAT_COUNT, help="fresh replay attempts per ledger row")
    args = parser.parse_args()

    report = build_report(repeat_count=args.repeat_count)
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_text(DOC_PATH, _markdown(report))
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "preflightGreen": report["preflightGreen"],
                "sampleCounts": report["sampleCounts"],
                "issueCounts": report["issueCounts"],
                "opensNext": report["opensNext"],
                "report": _rel(REPORT_PATH) if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
