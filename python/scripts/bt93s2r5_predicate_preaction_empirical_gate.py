"""BT93S2R5.4 empirical predicate/pre-action gate.

This phase consumes the locked BT93S2R5.3 seed/start-state repair report and
reruns the full 103-row S2R4 contract with three repeats. The 33 red S2R4.4
rows are replaced by the S2R5 repaired replay specs. This gate does not judge
action quality, change rewards or telemetry, train PPO, consume holdout, or
touch productive runtime surfaces.
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
import bt93s2r5_predicate_preaction_failure_ledger as ledger  # noqa: E402
import bt93s2r5_predicate_preaction_repair as repair  # noqa: E402
import bt93s2r5_predicate_preaction_repair_contract as repair_contract  # noqa: E402


SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r5_predicate_preaction_empirical_gate.py"
REPORT_PATH = ledger.BT93S2R5_ROOT / "predicate_preaction_empirical_gate.json"
DOC_PATH = ledger.DOC_PATH

BLOCK_ID = "BT93S2R5"
PHASE_ID = "93S2R5.4"
GREEN_RESULT = "predicate-window-repair-green"
SOURCE_RESULT_CLASS = "predicate-preaction-repair-applied"
EXPECTED_ROW_COUNT = ledger.EXPECTED_SOURCE_ROW_COUNT
EXPECTED_REPAIRED_ROW_COUNT = ledger.EXPECTED_RED_ROW_COUNT
LOCKED_REPEAT_COUNT = ledger.LOCKED_REPEAT_COUNT
NEXT_PHASE = "93S2R5.99 Closure"

ALLOWED_RESULT_CLASSES = {
    GREEN_RESULT,
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
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r5RepairReport": (
            repair.REPORT_PATH,
            "BT93S2R5.3 repaired seed/start-state contract",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R5.3",
                "resultClass": SOURCE_RESULT_CLASS,
                "ok": True,
                "sampleCounts.repairedRowCount": EXPECTED_REPAIRED_ROW_COUNT,
                "sampleCounts.candidateFailCount": 0,
                "sampleCounts.predicateChangedCount": 0,
                "sampleCounts.warmupChangedCount": 0,
                "claimFlags.phase93S2R5_4Allowed": True,
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
        "empiricalGateScript": (SCRIPT_PATH, "BT93S2R5.4 report generator", {}, False),
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


def _repair_rows_by_ledger_index(repair_report: Mapping[str, Any]) -> dict[int, Mapping[str, Any]]:
    rows: dict[int, Mapping[str, Any]] = {}
    for row in _as_list(repair_report.get("repairedRows")):
        if not isinstance(row, Mapping):
            continue
        try:
            ledger_index = int(row.get("oldLedgerIndex"))
        except (TypeError, ValueError):
            continue
        rows[ledger_index] = row
    return rows


def _stable_rows_by_ledger_index(stable_report: Mapping[str, Any]) -> dict[int, Mapping[str, Any]]:
    rows: dict[int, Mapping[str, Any]] = {}
    for row in _as_list(stable_report.get("stableReplayRows")):
        if not isinstance(row, Mapping):
            continue
        try:
            rows[int(row.get("ledgerIndex"))] = row
        except (TypeError, ValueError):
            continue
    return rows


def _materialized_contract_rows(
    identity_contract: Mapping[str, Any],
    stable_report: Mapping[str, Any],
    repair_report: Mapping[str, Any],
) -> list[dict[str, Any]]:
    repairs = _repair_rows_by_ledger_index(repair_report)
    stable_rows = _stable_rows_by_ledger_index(stable_report)
    result: list[dict[str, Any]] = []
    for source_row in _as_list(identity_contract.get("contractRows")):
        if not isinstance(source_row, Mapping):
            continue
        row = dict(source_row)
        try:
            ledger_index = int(row.get("ledgerIndex"))
        except (TypeError, ValueError):
            ledger_index = -1
        repair_row = repairs.get(ledger_index)
        if repair_row:
            replay_payload = dict(_as_mapping(row.get("replaySpecPayload")))
            replay_payload["seed"] = str(repair_row.get("newSeed"))
            replay_payload["phaseId"] = PHASE_ID
            replay_payload["sourceRepairClass"] = repair_row.get("primaryRepairClass")
            row.update(
                {
                    "seed": int(repair_row.get("newSeed") or 0),
                    "replaySpecId": repair_row.get("newReplaySpecId"),
                    "sessionReplayId": repair_row.get("newSessionReplayId"),
                    "runnerSessionId": repair_row.get("newRunnerSessionId"),
                    "replaySpecPayload": replay_payload,
                    "repairedByS2R5": True,
                    "sourceOldSeed": repair_row.get("oldSeed"),
                    "sourceOldReplaySpecId": repair_row.get("oldReplaySpecId"),
                    "sourceOldStartMetricsHash": repair_row.get("oldStartMetricsHash"),
                    "sourceOldWarmupKey": repair_row.get("oldWarmupKey"),
                    "expectedStartMetricsHash": repair_row.get("newStartMetricsHash"),
                    "expectedWarmupKey": repair_row.get("newWarmupKey"),
                    "sourceRepairClass": repair_row.get("primaryRepairClass"),
                    "repairGroupId": repair_row.get("groupId"),
                    "replacementReplaySpecPayload": repair_row.get("replacementReplaySpecPayload"),
                }
            )
        else:
            stable_row = stable_rows.get(ledger_index, {})
            row.update(
                {
                    "sessionReplayId": stable_row.get("sessionReplayId")
                    or stable_replay.reset_repair._repair_session_replay_id(row),
                    "runnerSessionId": stable_row.get("runnerSessionId")
                    or stable_replay.reset_repair._runner_session_id(
                        str(row.get("scenarioId") or ""), int(row.get("seed") or 0)
                    ),
                    "repairedByS2R5": False,
                    "sourceStableResultClass": stable_row.get("resultClass"),
                }
            )
        result.append(row)
    return result


def _run_payload(
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
    warmup_payload = stable_replay.reset_repair._warmup_payload(scenario_id, seed, action_name, scenario)
    warmup_key = _hash_value(warmup_payload)
    predicate = _as_mapping(probe.get("v3Predicate"))
    expected_start = contract_row.get("expectedStartMetricsHash")
    expected_warmup = contract_row.get("expectedWarmupKey")
    return {
        "runIndex": run_index,
        "replaySpecId": contract_row.get("replaySpecId"),
        "sessionReplayId": contract_row.get("sessionReplayId"),
        "runnerSessionId": contract_row.get("runnerSessionId"),
        "startMetricsHash": start_metrics_hash,
        "warmupKey": warmup_key,
        "expectedStartMetricsHash": expected_start,
        "expectedWarmupKey": expected_warmup,
        "startMetricsHashMatchesRepair": True if not expected_start else start_metrics_hash == expected_start,
        "warmupKeyMatchesRepair": True if not expected_warmup else warmup_key == expected_warmup,
        "predicate": {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": ledger.PREDICATE_FUNCTION,
            "pass": predicate.get("pass"),
            "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement"),
        },
        "minimumWindow": {
            "completed": probe.get("completedMinimumWindow"),
            "observedSteps": probe.get("observedSteps"),
            "minimumCompletedSteps": stable_replay._minimum_completed_steps(scenario),
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
            "measurementInvalidBeforeAction": stable_replay._probe_invalid_before_action(probe),
        },
        "startMetrics": dict(start_metrics),
        "probeError": probe.get("error"),
    }


def _row_result_class(contract_row: Mapping[str, Any], probe_runs: list[Mapping[str, Any]]) -> tuple[str, list[str]]:
    issues: list[str] = []
    if not probe_runs:
        return "measurement-invalid", ["missing-probe-runs"]
    first = probe_runs[0]
    for field, issue in (
        ("replaySpecId", "replaySpecId-repeat-mismatch"),
        ("sessionReplayId", "sessionId-repeat-mismatch"),
        ("startMetricsHash", "startMetricsHash-repeat-mismatch"),
        ("warmupKey", "warmupKey-repeat-mismatch"),
    ):
        if any(run.get(field) != first.get(field) for run in probe_runs[1:]):
            issues.append(issue)
    if any(run.get("probeError") for run in probe_runs):
        issues.append("probe-error")
    if any(_as_mapping(run.get("preActionValidity")).get("ok") is not True for run in probe_runs):
        issues.append("probe-ok-false")
    if any(_as_mapping(run.get("preActionValidity")).get("predicatePass") is not True for run in probe_runs):
        issues.append("predicate-fail")
    if any(_as_mapping(run.get("preActionValidity")).get("completedMinimumWindow") is not True for run in probe_runs):
        issues.append("minimum-window-fail")
    if any(_as_mapping(run.get("preActionValidity")).get("warmupTerminalBeforeAction") is True for run in probe_runs):
        issues.append("warmup-terminal-before-action")
    if any(_as_mapping(run.get("preActionValidity")).get("measurementInvalidBeforeAction") is True for run in probe_runs):
        issues.append("measurement-invalid-before-action")
    if contract_row.get("repairedByS2R5") is True:
        if any(run.get("startMetricsHashMatchesRepair") is not True for run in probe_runs):
            issues.append("repaired-startMetricsHash-mismatch")
        if any(run.get("warmupKeyMatchesRepair") is not True for run in probe_runs):
            issues.append("repaired-warmupKey-mismatch")
    issues = sorted(set(issues))
    if any(issue in issues for issue in ("probe-error", "probe-ok-false")):
        return "measurement-invalid", issues
    if any("repeat-mismatch" in issue for issue in issues):
        return "measurement-invalid", issues
    if "repaired-warmupKey-mismatch" in issues or "warmup-terminal-before-action" in issues:
        return "warmup-contract-required", issues
    if "repaired-startMetricsHash-mismatch" in issues:
        return "seed-startstate-required", issues
    if "minimum-window-fail" in issues:
        return "metric-sampling-contract-required", issues
    if "predicate-fail" in issues or "measurement-invalid-before-action" in issues:
        if contract_row.get("repairedByS2R5") is True:
            return "seed-startstate-required", issues
        return "predicate-contract-required", issues
    return "predicate-window-repair-row-green", issues


def _empirical_row(
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
            "actionToken": contract_row.get("actionToken"),
            "repairedByS2R5": contract_row.get("repairedByS2R5") is True,
            "replaySpecId": contract_row.get("replaySpecId"),
            "resultClass": "measurement-invalid",
            "issues": ["scenario-contract-missing"],
            "blockingClasses": ["measurement-invalid"],
            "probeRuns": [],
            "actionEffectEvaluated": False,
        }
    probe_runs: list[dict[str, Any]] = []
    for run_index in range(repeat_count):
        probe = stable_replay.v3_recheck._run_probe_v3(
            scenario,
            seed=int(seed),
            action_name=action_name,
            repeat_steps=stable_replay._repeat_steps(scenario),
        )
        probe_runs.append(_run_payload(contract_row, scenario, probe, run_index=run_index + 1))

    result_class, issues = _row_result_class(contract_row, probe_runs)
    first = probe_runs[0] if probe_runs else {}
    blocking_classes = sorted({result_class for result_class in [result_class] if result_class != "predicate-window-repair-row-green"})
    return {
        "ledgerIndex": contract_row.get("ledgerIndex"),
        "sourceProbeIndex": contract_row.get("sourceProbeIndex"),
        "scenarioId": scenario_id,
        "seed": seed,
        "sourceOldSeed": contract_row.get("sourceOldSeed"),
        "actionName": action_name,
        "actionToken": contract_row.get("actionToken"),
        "repairedByS2R5": contract_row.get("repairedByS2R5") is True,
        "sourceRepairClass": contract_row.get("sourceRepairClass"),
        "repairGroupId": contract_row.get("repairGroupId"),
        "replaySpecId": contract_row.get("replaySpecId"),
        "sessionReplayId": first.get("sessionReplayId"),
        "runnerSessionId": first.get("runnerSessionId"),
        "resultClass": result_class,
        "blockingClasses": blocking_classes,
        "issues": issues,
        "repeatStable": not any("repeat-mismatch" in issue for issue in issues),
        "predicatePass": all(_as_mapping(run.get("preActionValidity")).get("predicatePass") is True for run in probe_runs),
        "completedMinimumWindow": all(
            _as_mapping(run.get("preActionValidity")).get("completedMinimumWindow") is True for run in probe_runs
        ),
        "warmupTerminalBeforeAction": any(
            _as_mapping(run.get("preActionValidity")).get("warmupTerminalBeforeAction") is True for run in probe_runs
        ),
        "measurementInvalidBeforeAction": any(
            _as_mapping(run.get("preActionValidity")).get("measurementInvalidBeforeAction") is True for run in probe_runs
        ),
        "minimumCompletedSteps": stable_replay._minimum_completed_steps(scenario),
        "repeatCount": len(probe_runs),
        "expectedStartMetricsHash": contract_row.get("expectedStartMetricsHash"),
        "expectedWarmupKey": contract_row.get("expectedWarmupKey"),
        "startMetricsHashMatchesRepair": all(run.get("startMetricsHashMatchesRepair") is True for run in probe_runs),
        "warmupKeyMatchesRepair": all(run.get("warmupKeyMatchesRepair") is True for run in probe_runs),
        "probeRuns": probe_runs,
        "actionEffectEvaluated": False,
    }


def _count_false(rows: Iterable[Mapping[str, Any]], *keys: str) -> int:
    return sum(1 for row in rows if _get(row, *keys) is not True)


def _gate_zero_counts(sample_counts: Mapping[str, Any]) -> bool:
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
    )
    return all(sample_counts.get(key) == 0 for key in keys)


def _result_class(
    *,
    source_files_ready: bool,
    source_files_versioned: bool,
    sample_counts: Mapping[str, Any],
    row_results: list[Mapping[str, Any]],
) -> str:
    if not source_files_ready or not source_files_versioned:
        return "measurement-invalid"
    if sample_counts.get("contractRowCount") != EXPECTED_ROW_COUNT:
        return "measurement-invalid"
    if sample_counts.get("repairedRowCount") != EXPECTED_REPAIRED_ROW_COUNT:
        return "measurement-invalid"
    if sample_counts.get("replayAttemptCount", 0) < EXPECTED_ROW_COUNT * LOCKED_REPEAT_COUNT:
        return "measurement-invalid"
    if sample_counts.get("actionSurfaceLineageInvalidatedCount") != 0:
        return "action-surface-lineage-invalidated"
    if sample_counts.get("neutralControlActionGreenProduced") is True or sample_counts.get("neutralControlRequiredCount") != 0:
        return "neutral-control-contract-required"
    if sample_counts.get("escapeRightFairnessFailureCount") != 0:
        return "escape-right-fairness-predicate-required"
    row_classes = {str(row.get("resultClass")) for row in row_results}
    if "measurement-invalid" in row_classes:
        return "measurement-invalid"
    for klass in (
        "warmup-contract-required",
        "seed-startstate-required",
        "metric-sampling-contract-required",
        "predicate-contract-required",
        "scenario-contract-unrepairable",
    ):
        if klass in row_classes:
            return klass
    return GREEN_RESULT if _gate_zero_counts(sample_counts) else "measurement-invalid"


def _claim_flags(ok: bool) -> dict[str, bool]:
    flags = ledger._claim_flags()
    flags["phase93S2R5_2Allowed"] = False
    flags["phase93S2R5_3Allowed"] = False
    flags["phase93S2R5_4Allowed"] = False
    flags["phase93S2R5_99Allowed"] = bool(ok)
    flags["phase93S2R4_5Allowed"] = False
    flags["phase93S2R4_99Allowed"] = False
    return flags


def build_report(*, row_limit: int | None = None, repeat_count: int | None = None) -> dict[str, Any]:
    identity_contract = _read_json(stable_replay.IDENTITY_CONTRACT_PATH)
    stable_report = _read_json(ledger.S2R4_STABLE_PATH)
    matrix_contract = _read_json(ledger.S2R_MATRIX_CONTRACT_PATH)
    repair_report = _read_json(repair.REPORT_PATH)
    repair_contract_report = _read_json(repair_contract.REPORT_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)
    source_files_versioned = all(item.get("tracked") is True for item in source_artifacts if item.get("required") is True)
    effective_repeat_count = int(repeat_count or LOCKED_REPEAT_COUNT)
    materialized_rows = _materialized_contract_rows(identity_contract, stable_report, repair_report)
    if row_limit is not None:
        materialized_rows = materialized_rows[: max(0, int(row_limit))]
    scenarios = stable_replay._scenario_index(matrix_contract)
    row_results = [
        _empirical_row(row, scenarios.get(str(row.get("scenarioId") or "")), repeat_count=effective_repeat_count)
        for row in materialized_rows
    ]
    replay_attempt_count = sum(len(_as_list(row.get("probeRuns"))) for row in row_results)
    replay_spec_mismatch_count = sum(
        1
        for row in row_results
        if not _all_same([run.get("replaySpecId") for run in _as_list(row.get("probeRuns")) if run.get("replaySpecId")])
    )
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
    repaired_rows = [row for row in row_results if row.get("repairedByS2R5") is True]
    no_danger_rows = [row for row in row_results if row.get("scenarioId") == "no-danger-control"]
    escape_right_rows = [row for row in row_results if row.get("scenarioId") == "escape-right-open"]
    sample_counts = {
        "contractRowCount": len(row_results),
        "expectedContractRowCount": EXPECTED_ROW_COUNT,
        "sourceStableReplayRowCount": _get(stable_report, "sampleCounts", "contractRowCount"),
        "sourceStableReplayPredicateFailureCount": _get(stable_report, "sampleCounts", "predicateFailureCount"),
        "sourceStableReplayMeasurementInvalidBeforeActionCount": _get(
            stable_report, "sampleCounts", "measurementInvalidBeforeActionCount"
        ),
        "repairedRowCount": len(repaired_rows),
        "expectedRepairedRowCount": EXPECTED_REPAIRED_ROW_COUNT,
        "repeatCount": effective_repeat_count,
        "replayAttemptCount": replay_attempt_count,
        "expectedReplayAttemptCount": EXPECTED_ROW_COUNT * LOCKED_REPEAT_COUNT,
        "replaySpecIdRepeatMismatchCount": replay_spec_mismatch_count,
        "startMetricsHashRepeatMismatchCount": start_metrics_mismatch_count,
        "warmupKeyRepeatMismatchCount": warmup_key_mismatch_count,
        "sessionIdDriftCount": session_id_drift_count,
        "predicateFailureCount": sum(1 for row in row_results if row.get("predicatePass") is not True),
        "measurementInvalidBeforeActionCount": sum(
            1 for row in row_results if row.get("measurementInvalidBeforeAction") is True
        ),
        "minimumWindowFailureCount": sum(1 for row in row_results if row.get("completedMinimumWindow") is not True),
        "warmupTerminalBeforeActionCount": sum(1 for row in row_results if row.get("warmupTerminalBeforeAction") is True),
        "probeErrorCount": sum(
            1
            for row in row_results
            for run in _as_list(row.get("probeRuns"))
            if run.get("probeError")
        ),
        "repairedStartMetricsHashMismatchCount": sum(
            1 for row in repaired_rows if row.get("startMetricsHashMatchesRepair") is not True
        ),
        "repairedWarmupKeyMismatchCount": sum(1 for row in repaired_rows if row.get("warmupKeyMatchesRepair") is not True),
        "noDangerControlRowCount": len(no_danger_rows),
        "neutralControlActionGreenAllowed": False,
        "neutralControlActionGreenProduced": False,
        "neutralControlRequiredCount": 0,
        "escapeRightRowCount": len(escape_right_rows),
        "escapeRightFairnessFailureCount": sum(
            1
            for row in escape_right_rows
            if row.get("resultClass") not in ("predicate-window-repair-row-green",)
        ),
        "actionEffectOverrideCount": sum(1 for row in row_results if row.get("actionEffectEvaluated") is True),
        "actionSurfaceLineageInvalidatedCount": 0,
        "actionQualityJudgementProducedCount": 0,
        "directionJudgementProducedCount": 0,
        "rewardJudgementProducedCount": 0,
        "actionSurfaceChangeCount": 0,
        "rewardChangeCount": 0,
        "telemetryChangeCount": 0,
        "runtimeChangeCount": 0,
        "holdoutEpisodes": 0,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
    }
    result_class = _result_class(
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        sample_counts=sample_counts,
        row_results=row_results,
    )
    ok = bool(result_class == GREEN_RESULT)
    row_class_counts = Counter(str(row.get("resultClass")) for row in row_results)
    issue_counts = Counter(issue for row in row_results for issue in _as_list(row.get("issues")))
    phase_coverage = {
        "93S2R5.4.1": bool(
            len(row_results) == EXPECTED_ROW_COUNT
            and replay_attempt_count >= EXPECTED_ROW_COUNT * LOCKED_REPEAT_COUNT
            and repair_report.get("resultClass") == SOURCE_RESULT_CLASS
            and len(repaired_rows) == EXPECTED_REPAIRED_ROW_COUNT
        ),
        "93S2R5.4.2": _gate_zero_counts(sample_counts),
        "93S2R5.4.3": bool(
            result_class in ALLOWED_RESULT_CLASSES
            and ((ok and NEXT_PHASE in [str(item) for item in [NEXT_PHASE]]) or (not ok))
        ),
        "DoD.S2R5-6": _gate_zero_counts(sample_counts),
    }
    compact_rows = [
        {
            "ledgerIndex": row.get("ledgerIndex"),
            "scenarioId": row.get("scenarioId"),
            "seed": row.get("seed"),
            "sourceOldSeed": row.get("sourceOldSeed"),
            "actionName": row.get("actionName"),
            "actionToken": row.get("actionToken"),
            "repairedByS2R5": row.get("repairedByS2R5"),
            "sourceRepairClass": row.get("sourceRepairClass"),
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
            "startMetricsHashMatchesRepair": row.get("startMetricsHashMatchesRepair"),
            "warmupKeyMatchesRepair": row.get("warmupKeyMatchesRepair"),
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
                    "startMetricsHashMatchesRepair": run.get("startMetricsHashMatchesRepair"),
                    "warmupKeyMatchesRepair": run.get("warmupKeyMatchesRepair"),
                }
                for run in _as_list(row.get("probeRuns"))
            ],
        }
        for row in row_results
    ]
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r5-predicate-preaction-empirical-gate-v1",
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
        "sourceLocks": {
            "currentSourceHashes": _source_hashes(source_artifacts),
            "repairReportHash": repair_report.get("reportHash"),
            "repairRowsHash": repair_report.get("repairedRowsHash"),
            "repairContractReportHash": repair_contract_report.get("reportHash"),
            "stableReplayReportHash": stable_report.get("reportHash"),
            "identityContractReportHash": identity_contract.get("reportHash"),
            "predicateFunction": ledger.PREDICATE_FUNCTION,
            "repairedRowsMaterializedIntoFullContract": True,
        },
        "measurementContract": {
            "fullContractRows": EXPECTED_ROW_COUNT,
            "repeatCount": LOCKED_REPEAT_COUNT,
            "repairedRowsFromS2R5_3": EXPECTED_REPAIRED_ROW_COUNT,
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
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(ok),
        "guardrails": {
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
        },
        "empiricalRows": compact_rows,
        "empiricalRowsHash": _hash_value({"rows": compact_rows}),
        "allowNext": [NEXT_PHASE] if ok else [],
        "opensNext": [NEXT_PHASE] if ok else [],
        "blocksNext": list(repair_contract.DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R4.5",
                "reason": "S2R5.4 only opens BT93S2R5.99 closure; 93S2R4.5 requires closure result predicate-window-repair-green.",
                "active": True,
            },
            {
                "scope": "BT93S2R3.3/4/99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A",
                "reason": "Downstream remains closed until S2R5 closure, later S2R4.5, and BT93S2R4.99 replay-startstate-green.",
                "active": True,
            },
            {
                "scope": "Candidate/Freeze/Holdout/Promote/Rollout/PPO-Validate/BT95",
                "reason": "Empirical predicate/pre-action validity is not bot quality, training quality, or runtime load evidence.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R5.99 closure and write predicate-window-repair-green only if this empirical report remains green.",
            "After S2R5 closure, start only 93S2R4.5 full replacement preflight; keep all downstream training/candidate paths closed.",
        ]
        if ok
        else [
            f"Stop and repair the narrow S2R5 blocker class {result_class}.",
            "Do not start S2R5 closure or any downstream recheck/training/candidate path.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r5_predicate_preaction_empirical_gate.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r5_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "phase gate executes 103 rows x 3 repeats; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    return f"""<!-- BT93S2R5.4-START -->
## 93S2R5.4 Empirical Recheck auf repariertem Vertrag

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Rows/Repeats: `{counts.get('contractRowCount')}` x `{counts.get('repeatCount')}` = `{counts.get('replayAttemptCount')}`
- Repaired Rows: `{counts.get('repairedRowCount')}`
- Predicate/PreAction/Window/Warmup-Fails: `{counts.get('predicateFailureCount')}` / `{counts.get('measurementInvalidBeforeActionCount')}` / `{counts.get('minimumWindowFailureCount')}` / `{counts.get('warmupTerminalBeforeActionCount')}`
- Replay/StartMetrics/Warmup/Session-Drift: `{counts.get('replaySpecIdRepeatMismatchCount')}` / `{counts.get('startMetricsHashRepeatMismatchCount')}` / `{counts.get('warmupKeyRepeatMismatchCount')}` / `{counts.get('sessionIdDriftCount')}`
- Repair-Contract-Hash-Mismatch: `{counts.get('repairedStartMetricsHashMismatchCount')}` / `{counts.get('repairedWarmupKeyMismatchCount')}`

S2R5.4 belegt nur Predicate-/PreAction-Validity auf dem reparierten Vertrag.
`93S2R4.5`, `93S2R3.3-Reentry`, `BT93S2.3-Recheck`, `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bleiben bis S2R5-Closure und spaeteren Full-Gates
geschlossen.

Evidence:

- `data/training/ppo/bt93s2r5/predicate_preaction_empirical_gate.json`
- Command: `python python/scripts/bt93s2r5_predicate_preaction_empirical_gate.py --write-report`
<!-- BT93S2R5.4-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R5.4-START -->"
    end = "<!-- BT93S2R5.4-END -->"
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
    parser.add_argument("--write-report", action="store_true", help="Write empirical gate JSON and Fehlerbericht.")
    parser.add_argument("--row-limit", type=int, default=None, help="Diagnostic partial run; does not close the phase.")
    parser.add_argument("--repeat-count", type=int, default=None, help="Diagnostic repeat override; defaults to locked count.")
    args = parser.parse_args()

    report = build_report(row_limit=args.row_limit, repeat_count=args.repeat_count)
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
    if args.row_limit is not None or args.repeat_count is not None:
        return 0 if int(report["sampleCounts"].get("probeErrorCount") or 0) == 0 else 1
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
