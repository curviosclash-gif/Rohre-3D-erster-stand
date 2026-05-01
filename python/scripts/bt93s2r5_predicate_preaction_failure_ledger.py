"""BT93S2R5.1 predicate/pre-action failure ledger and metric-margin audit.

This phase is diagnostic-only. It reruns only the 33 red BT93S2R4.4 rows,
writes complete pre-action predicate operands and margins per repeat, and
deduplicates failures by Scenario/Seed/StartMetricsHash before any repair is
selected. It does not change runtime, reward, telemetry, action-surface, PPO,
or holdout state.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter, defaultdict
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
import bt93s2r4_predicate_window_stable_replay as stable_replay  # noqa: E402
import bt93s2r4_replay_identity_contract as identity  # noqa: E402
import bt93s2r4_replay_root_cause_audit as audit  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R3_ROOT = PPO_ROOT / "bt93s2r3"
BT93S2R4_ROOT = PPO_ROOT / "bt93s2r4"
BT93S2R5_ROOT = PPO_ROOT / "bt93s2r5"

S2R3_PREFLIGHT_PATH = BT93S2R3_ROOT / "replay_predicate_window_preflight.json"
S2R4_AUDIT_PATH = BT93S2R4_ROOT / "replay_root_cause_audit.json"
S2R4_IDENTITY_PATH = BT93S2R4_ROOT / "replay_identity_contract.json"
S2R4_RESET_PATH = BT93S2R4_ROOT / "deterministic_reset_repair_report.json"
S2R4_STABLE_PATH = BT93S2R4_ROOT / "predicate_window_stable_replay_report.json"
S2R_MATRIX_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r5_predicate_preaction_failure_ledger.py"
REPORT_PATH = BT93S2R5_ROOT / "predicate_preaction_failure_ledger.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r5_predicate_preaction_required.md"

BLOCK_ID = "BT93S2R5"
PHASE_ID = "93S2R5.1"
RESULT_CLASS = "predicate-preaction-failure-ledger-written"
MATRIX_ID = audit.MATRIX_ID
CONTRACT_ID = audit.CONTRACT_ID
REPAIR_CONTRACT_ID = audit.REPAIR_CONTRACT_ID
ACTION_SURFACE_ID = audit.ACTION_SURFACE_ID
DECODER_HASH = audit.DECODER_HASH
EXPECTED_SOURCE_ROW_COUNT = audit.EXPECTED_ROW_COUNT
EXPECTED_RED_ROW_COUNT = 33
LOCKED_REPEAT_COUNT = identity.LOCKED_REPAIR_REPEAT_COUNT
PREDICATE_FUNCTION = identity.PREDICATE_FUNCTION

DOWNSTREAM_BLOCKS = [
    "93S2R4.5 before BT93S2R5.99 predicate-window-repair-green",
    "BT93S2R4.99 before BT93S2R5 and 93S2R4.5 green",
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
    try:
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/") if path else None
    except ValueError:
        return str(path).replace("\\", "/") if path else None


def _sha256_file(path: Path | None) -> str | None:
    if not path or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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


def _number(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return round(float(value), 6)
    except (TypeError, ValueError):
        return None


def _expected_matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


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
        "gitSha": _get(payload, "git", "sha") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r4StableReplay": (
            S2R4_STABLE_PATH,
            "red BT93S2R4.4 predicate/window stable replay report",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.4",
                "resultClass": "predicate-window-required",
                "ok": False,
                "sampleCounts.contractRowCount": EXPECTED_SOURCE_ROW_COUNT,
                "sampleCounts.replayAttemptCount": EXPECTED_SOURCE_ROW_COUNT * LOCKED_REPEAT_COUNT,
                "sampleCounts.predicateFailureCount": EXPECTED_RED_ROW_COUNT,
                "sampleCounts.measurementInvalidBeforeActionCount": EXPECTED_RED_ROW_COUNT,
                "sampleCounts.replaySpecIdRepeatMismatchCount": 0,
                "sampleCounts.startMetricsHashRepeatMismatchCount": 0,
                "sampleCounts.warmupKeyRepeatMismatchCount": 0,
                "sampleCounts.sessionIdDriftCount": 0,
            },
            True,
        ),
        "s2r4DeterministicResetRepair": (
            S2R4_RESET_PATH,
            "BT93S2R4.3 deterministic reset/warmup repair gate",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.3",
                "resultClass": "deterministic-reset-warmup-repair-green",
                "ok": True,
                "sampleCounts.replayAttemptCount": EXPECTED_SOURCE_ROW_COUNT * LOCKED_REPEAT_COUNT,
                "sampleCounts.startMetricsHashRepeatMismatchCount": 0,
            },
            True,
        ),
        "s2r4IdentityContract": (
            S2R4_IDENTITY_PATH,
            "BT93S2R4.2 replay identity contract",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.2",
                "resultClass": "replay-identity-contract-green",
                "ok": True,
                "sampleCounts.contractRowCount": EXPECTED_SOURCE_ROW_COUNT,
            },
            True,
        ),
        "s2r4RootCauseAudit": (
            S2R4_AUDIT_PATH,
            "BT93S2R4.1 root-cause audit",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.1",
                "resultClass": "source-lock-root-cause-audit-written",
                "ok": True,
                "sampleCounts.auditRowCount": EXPECTED_SOURCE_ROW_COUNT,
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
                "preflightGreen": False,
                "sampleCounts.preflightRowCount": EXPECTED_SOURCE_ROW_COUNT,
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
        "pythonEnv": (ENV_PATH, "read-only Python env reset/measurement surface", {}, True),
        "headlessRunner": (HEADLESS_RUNNER_PATH, "read-only headless lane runner", {}, True),
        "s2r5Script": (SCRIPT_PATH, "BT93S2R5.1 generator", {}, False),
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


def _identity_rows_by_replay_id(identity_contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    rows: dict[str, Mapping[str, Any]] = {}
    for row in _as_list(identity_contract.get("contractRows")):
        if isinstance(row, Mapping) and row.get("replaySpecId"):
            rows[str(row["replaySpecId"])] = row
    return rows


def _red_source_rows(stable_report: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    rows: list[Mapping[str, Any]] = []
    for row in _as_list(stable_report.get("stableReplayRows")):
        if not isinstance(row, Mapping):
            continue
        if (
            row.get("resultClass") != "stable-replay-row-green"
            or row.get("predicatePass") is not True
            or row.get("measurementInvalidBeforeAction") is True
        ):
            rows.append(row)
    return rows


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


def _predicate_margin(scenario_id: str, metrics: Mapping[str, Any], expression: str | None) -> dict[str, Any]:
    front = _number(metrics.get("wallDistanceFront"))
    left = _number(metrics.get("wallDistanceLeft"))
    right = _number(metrics.get("wallDistanceRight"))
    openness = _number(metrics.get("localOpennessRatio"))
    pressure = _number(metrics.get("pressureLevel"))
    clauses: list[dict[str, Any]] = []

    def add_clause(clause_id: str, actual: float | None, operator: str, threshold: float) -> None:
        if actual is None:
            margin = None
            passed = False
        elif operator == "<=":
            margin = round(threshold - actual, 6)
            passed = margin >= 0
        elif operator == ">=":
            margin = round(actual - threshold, 6)
            passed = margin >= 0
        else:
            margin = None
            passed = False
        clauses.append(
            {
                "clauseId": clause_id,
                "actual": actual,
                "operator": operator,
                "threshold": threshold,
                "margin": margin,
                "pass": passed,
            }
        )

    if scenario_id == "narrowing-corridor":
        nearest_side = min(value for value in (left, right) if value is not None) if left is not None and right is not None else None
        add_clause("localOpennessRatio<=0.64", openness, "<=", 0.64)
        add_clause("minWallDistanceLeftRight<=0.75", nearest_side, "<=", 0.75)
    elif scenario_id == "escape-right-open":
        add_clause("wallDistanceRight>=0.40", right, ">=", 0.40)
        add_clause("wallDistanceFront>=0.85", front, ">=", 0.85)
    elif scenario_id == "no-danger-control":
        max_wall = max(value for value in (front, left, right) if value is not None) if all(value is not None for value in (front, left, right)) else None
        add_clause("pressureLevel<=0.38", pressure, "<=", 0.38)
        add_clause("localOpennessRatio>=0.54", openness, ">=", 0.54)
        add_clause("maxWallDistance>=0.85", max_wall, ">=", 0.85)

    margins = [clause.get("margin") for clause in clauses if isinstance(clause.get("margin"), (int, float))]
    return {
        "expression": expression,
        "function": PREDICATE_FUNCTION,
        "operands": {
            "wallDistanceFront": front,
            "wallDistanceLeft": left,
            "wallDistanceRight": right,
            "localOpennessRatio": openness,
            "pressureLevel": pressure,
            "minWallDistanceLeftRight": min(left, right) if left is not None and right is not None else None,
            "maxWallDistance": max(front, left, right) if all(value is not None for value in (front, left, right)) else None,
        },
        "clauses": clauses,
        "overallMargin": min(margins) if margins else None,
        "failedClauseIds": [str(clause["clauseId"]) for clause in clauses if clause.get("pass") is not True],
    }


def _probe_invalid_before_action(probe: Mapping[str, Any]) -> bool:
    predicate = _as_mapping(probe.get("v3Predicate"))
    return bool(
        probe.get("ok") is not True
        or predicate.get("pass") is not True
        or probe.get("warmupTerminalBeforeAction") is True
    )


def _probe_row(
    source_row: Mapping[str, Any],
    identity_row: Mapping[str, Any] | None,
    scenario: Mapping[str, Any] | None,
    *,
    repeat_count: int,
) -> dict[str, Any]:
    scenario_id = str(source_row.get("scenarioId") or "")
    seed = int(source_row.get("seed") or 0)
    action_name = str(source_row.get("actionName") or "")
    if not isinstance(identity_row, Mapping) or not identity_row:
        return {
            "ledgerIndex": source_row.get("ledgerIndex"),
            "scenarioId": scenario_id,
            "seed": seed,
            "actionName": action_name,
            "actionToken": source_row.get("actionToken"),
            "replaySpecId": source_row.get("replaySpecId"),
            "resultClass": "measurement-invalid",
            "issues": ["identity-row-missing"],
            "probeRuns": [],
            "actionEffectEvaluated": False,
        }
    if not isinstance(scenario, Mapping) or not scenario:
        return {
            "ledgerIndex": source_row.get("ledgerIndex"),
            "scenarioId": scenario_id,
            "seed": seed,
            "actionName": action_name,
            "actionToken": source_row.get("actionToken"),
            "replaySpecId": source_row.get("replaySpecId"),
            "resultClass": "measurement-invalid",
            "issues": ["scenario-contract-missing"],
            "probeRuns": [],
            "actionEffectEvaluated": False,
        }

    predicate = _as_mapping(scenario.get("predicate"))
    expression = str(predicate.get("expression") or "")
    probe_runs: list[dict[str, Any]] = []
    for run_index in range(1, repeat_count + 1):
        probe = v3_recheck._run_probe_v3(
            scenario,
            seed=seed,
            action_name=action_name,
            repeat_steps=_repeat_steps(scenario),
        )
        start_metrics = _as_mapping(probe.get("startMetrics"))
        start_metrics_hash = _hash_value(start_metrics)
        warmup_payload = reset_repair._warmup_payload(scenario_id, seed, action_name, scenario)
        warmup_key = _hash_value(warmup_payload)
        predicate_payload = _as_mapping(probe.get("v3Predicate"))
        margin_payload = _predicate_margin(scenario_id, start_metrics, expression)
        probe_runs.append(
            {
                "runIndex": run_index,
                "replaySpecId": source_row.get("replaySpecId"),
                "sessionReplayId": reset_repair._repair_session_replay_id(identity_row),
                "runnerSessionId": reset_repair._runner_session_id(scenario_id, seed),
                "startMetricsHash": start_metrics_hash,
                "warmupKey": warmup_key,
                "actionName": action_name,
                "actionToken": source_row.get("actionToken"),
                "predicate": {
                    "predicateId": predicate_payload.get("predicateId") or predicate.get("predicateId"),
                    "expression": predicate_payload.get("expression") or expression,
                    "function": PREDICATE_FUNCTION,
                    "pass": predicate_payload.get("pass"),
                    "revalidatedBeforeMeasurement": predicate_payload.get("revalidatedBeforeMeasurement"),
                },
                "predicateMargin": margin_payload,
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
                    "predicatePass": predicate_payload.get("pass"),
                    "completedMinimumWindow": probe.get("completedMinimumWindow"),
                    "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
                    "measurementInvalidBeforeAction": _probe_invalid_before_action(probe),
                },
                "startMetrics": dict(start_metrics),
                "probeError": probe.get("error"),
                "actionEffectEvaluated": False,
            }
        )

    first = probe_runs[0] if probe_runs else {}
    issues: set[str] = set()
    if any(run.get("probeError") for run in probe_runs):
        issues.add("probe-error")
    for field in ("replaySpecId", "sessionReplayId", "startMetricsHash", "warmupKey"):
        if any(run.get(field) != first.get(field) for run in probe_runs[1:]):
            issues.add(f"{field}-repeat-mismatch")
    if any(_get(run, "preActionValidity", "predicatePass") is not True for run in probe_runs):
        issues.add("predicate-fail")
    if any(_get(run, "preActionValidity", "completedMinimumWindow") is not True for run in probe_runs):
        issues.add("minimum-window-fail")
    if any(_get(run, "preActionValidity", "warmupTerminalBeforeAction") is True for run in probe_runs):
        issues.add("warmup-terminal-before-action")
    if any(_get(run, "preActionValidity", "measurementInvalidBeforeAction") is True for run in probe_runs):
        issues.add("measurement-invalid-before-action")

    result_class = "predicate-preaction-required" if issues == {"predicate-fail", "measurement-invalid-before-action"} else "measurement-invalid"
    if any("repeat-mismatch" in issue for issue in issues):
        result_class = "replay-determinism-required"
    return {
        "ledgerIndex": source_row.get("ledgerIndex"),
        "scenarioId": scenario_id,
        "seed": seed,
        "actionName": action_name,
        "actionToken": source_row.get("actionToken"),
        "replaySpecId": source_row.get("replaySpecId"),
        "sessionReplayId": first.get("sessionReplayId"),
        "runnerSessionId": first.get("runnerSessionId"),
        "startMetricsHash": first.get("startMetricsHash"),
        "warmupKey": first.get("warmupKey"),
        "sourceResultClass": source_row.get("resultClass"),
        "resultClass": result_class,
        "issues": sorted(issues),
        "repeatStable": not any("repeat-mismatch" in issue for issue in issues),
        "predicatePass": all(_get(run, "preActionValidity", "predicatePass") is True for run in probe_runs),
        "completedMinimumWindow": all(_get(run, "preActionValidity", "completedMinimumWindow") is True for run in probe_runs),
        "warmupTerminalBeforeAction": any(_get(run, "preActionValidity", "warmupTerminalBeforeAction") is True for run in probe_runs),
        "measurementInvalidBeforeAction": any(_get(run, "preActionValidity", "measurementInvalidBeforeAction") is True for run in probe_runs),
        "minimumCompletedSteps": _minimum_completed_steps(scenario),
        "repeatCount": len(probe_runs),
        "probeRuns": probe_runs,
        "actionEffectEvaluated": False,
    }


def _hypotheses_for_group(group: Mapping[str, Any]) -> list[str]:
    scenario_id = str(group.get("scenarioId") or "")
    hypotheses: list[str] = []
    if group.get("metricSamplingComplete") is not True:
        hypotheses.append("metric-sampling-contract-required")
    if group.get("warmupTerminalBeforeActionCount"):
        hypotheses.append("warmup-contract-required")
    if scenario_id == "no-danger-control":
        hypotheses.append("neutral-control-contract-required")
    elif scenario_id == "escape-right-open":
        hypotheses.append("escape-right-fairness-predicate-required")
    hypotheses.extend(["predicate-expression-stale", "seed-startstate-invalid"])
    return list(dict.fromkeys(hypotheses))


def _dedupe_groups(ledger_rows: list[Mapping[str, Any]]) -> list[dict[str, Any]]:
    hashes_by_scenario_seed: dict[tuple[str, Any], set[str]] = defaultdict(set)
    for row in ledger_rows:
        key = (str(row.get("scenarioId") or ""), row.get("seed"))
        if row.get("startMetricsHash"):
            hashes_by_scenario_seed[key].add(str(row.get("startMetricsHash")))

    grouped: dict[tuple[str, Any, str], list[Mapping[str, Any]]] = defaultdict(list)
    for row in ledger_rows:
        grouped[(str(row.get("scenarioId") or ""), row.get("seed"), str(row.get("startMetricsHash") or ""))].append(row)

    result: list[dict[str, Any]] = []
    for (scenario_id, seed, start_hash), rows in sorted(grouped.items()):
        actions = sorted({str(row.get("actionName")) for row in rows})
        ledger_indexes = sorted(int(row.get("ledgerIndex") or 0) for row in rows)
        margins = [
            _get(run, "predicateMargin", "overallMargin")
            for row in rows
            for run in _as_list(row.get("probeRuns"))
            if isinstance(_get(run, "predicateMargin", "overallMargin"), (int, float))
        ]
        action_dependent_start_metrics = len(hashes_by_scenario_seed[(scenario_id, seed)]) > 1
        metric_sampling_complete = all(
            bool(_get(run, "predicateMargin", "clauses"))
            for row in rows
            for run in _as_list(row.get("probeRuns"))
        )
        group = {
            "groupId": f"{scenario_id}:{seed}:{start_hash[:12]}",
            "scenarioId": scenario_id,
            "seed": seed,
            "startMetricsHash": start_hash,
            "redRowCount": len(rows),
            "actionCount": len(actions),
            "actions": actions,
            "ledgerIndexes": ledger_indexes,
            "replaySpecIds": sorted(str(row.get("replaySpecId")) for row in rows if row.get("replaySpecId")),
            "warmupKeys": sorted({str(row.get("warmupKey")) for row in rows if row.get("warmupKey")}),
            "sessionReplayIds": sorted(str(row.get("sessionReplayId")) for row in rows if row.get("sessionReplayId")),
            "predicateFailureCount": sum(1 for row in rows if row.get("predicatePass") is not True),
            "measurementInvalidBeforeActionCount": sum(1 for row in rows if row.get("measurementInvalidBeforeAction") is True),
            "minimumWindowFailureCount": sum(1 for row in rows if row.get("completedMinimumWindow") is not True),
            "warmupTerminalBeforeActionCount": sum(1 for row in rows if row.get("warmupTerminalBeforeAction") is True),
            "metricSamplingComplete": metric_sampling_complete,
            "predicateMarginMin": min(margins) if margins else None,
            "predicateMarginMax": max(margins) if margins else None,
            "actionDependentStartMetricsDrift": action_dependent_start_metrics,
            "actionRootCauseAllowed": action_dependent_start_metrics,
            "actionRootCauseVerdict": "disallowed-same-preaction-startmetrics"
            if not action_dependent_start_metrics
            else "allowed-startmetrics-action-dependent",
            "primaryRepairClass": None,
            "primaryClassDeferredTo": "93S2R5.2",
        }
        group["hypothesisCandidates"] = _hypotheses_for_group(group)
        result.append(group)
    return result


def _claim_flags() -> dict[str, bool]:
    return {
        "phase93S2R5_2Allowed": True,
        "phase93S2R5_3Allowed": False,
        "phase93S2R5_4Allowed": False,
        "phase93S2R5_99Allowed": False,
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


def build_report(*, repeat_count: int = LOCKED_REPEAT_COUNT) -> dict[str, Any]:
    repeat_count = max(1, int(repeat_count))
    stable_report = _read_json(S2R4_STABLE_PATH)
    identity_contract = _read_json(S2R4_IDENTITY_PATH)
    matrix_contract = _read_json(S2R_MATRIX_CONTRACT_PATH)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item.get("required") is True]
    source_files_ready = all(item.get("exists") and item.get("isFile") and item.get("fresh") for item in required_sources)
    source_files_versioned = all(item.get("tracked") for item in required_sources)
    red_source_rows = _red_source_rows(stable_report)
    identity_rows = _identity_rows_by_replay_id(identity_contract)
    scenarios = _scenario_index(matrix_contract)
    failure_rows = [
        _probe_row(
            row,
            identity_rows.get(str(row.get("replaySpecId") or "")),
            scenarios.get(str(row.get("scenarioId") or "")),
            repeat_count=repeat_count,
        )
        for row in red_source_rows
    ]
    dedupe_groups = _dedupe_groups(failure_rows)
    row_result_counts = Counter(str(row.get("resultClass")) for row in failure_rows)
    issue_counts = Counter(issue for row in failure_rows for issue in _as_list(row.get("issues")))
    red_row_ids = [
        {
            "ledgerIndex": row.get("ledgerIndex"),
            "scenarioId": row.get("scenarioId"),
            "seed": row.get("seed"),
            "actionName": row.get("actionName"),
            "actionToken": row.get("actionToken"),
            "replaySpecId": row.get("replaySpecId"),
        }
        for row in failure_rows
    ]
    replay_attempt_count = sum(len(_as_list(row.get("probeRuns"))) for row in failure_rows)
    predicate_failure_attempt_count = sum(
        1
        for row in failure_rows
        for run in _as_list(row.get("probeRuns"))
        if _get(run, "preActionValidity", "predicatePass") is not True
    )
    measurement_invalid_attempt_count = sum(
        1
        for row in failure_rows
        for run in _as_list(row.get("probeRuns"))
        if _get(run, "preActionValidity", "measurementInvalidBeforeAction") is True
    )
    sample_counts = {
        "sourceStableReplayRowCount": _get(stable_report, "sampleCounts", "contractRowCount"),
        "sourceStableReplayAttemptCount": _get(stable_report, "sampleCounts", "replayAttemptCount"),
        "sourceRedRowCount": _get(stable_report, "sampleCounts", "predicateFailureCount"),
        "failureLedgerRowCount": len(failure_rows),
        "redRowIdCount": len(red_row_ids),
        "repeatCount": repeat_count,
        "replayAttemptCount": replay_attempt_count,
        "expectedReplayAttemptCount": EXPECTED_RED_ROW_COUNT * LOCKED_REPEAT_COUNT,
        "uniqueScenarioSeedStartMetricsGroupCount": len(dedupe_groups),
        "predicateFailureRowCount": sum(1 for row in failure_rows if row.get("predicatePass") is not True),
        "predicateFailureAttemptCount": predicate_failure_attempt_count,
        "measurementInvalidBeforeActionRowCount": sum(1 for row in failure_rows if row.get("measurementInvalidBeforeAction") is True),
        "measurementInvalidBeforeActionAttemptCount": measurement_invalid_attempt_count,
        "minimumWindowFailureRowCount": sum(1 for row in failure_rows if row.get("completedMinimumWindow") is not True),
        "warmupTerminalBeforeActionRowCount": sum(1 for row in failure_rows if row.get("warmupTerminalBeforeAction") is True),
        "replaySpecIdRepeatMismatchCount": sum(1 for row in failure_rows if not _all_same([run.get("replaySpecId") for run in _as_list(row.get("probeRuns"))])),
        "startMetricsHashRepeatMismatchCount": sum(1 for row in failure_rows if not _all_same([run.get("startMetricsHash") for run in _as_list(row.get("probeRuns"))])),
        "warmupKeyRepeatMismatchCount": sum(1 for row in failure_rows if not _all_same([run.get("warmupKey") for run in _as_list(row.get("probeRuns"))])),
        "sessionIdDriftCount": sum(1 for row in failure_rows if not _all_same([run.get("sessionReplayId") for run in _as_list(row.get("probeRuns"))])),
        "actionDependentStartMetricsDriftGroupCount": sum(1 for group in dedupe_groups if group.get("actionDependentStartMetricsDrift") is True),
        "actionRootCauseAllowedGroupCount": sum(1 for group in dedupe_groups if group.get("actionRootCauseAllowed") is True),
        "actionRootCauseDisallowedGroupCount": sum(1 for group in dedupe_groups if group.get("actionRootCauseAllowed") is not True),
        "sourceReplaySpecIdRepeatMismatchCount": _get(stable_report, "sampleCounts", "replaySpecIdRepeatMismatchCount"),
        "sourceStartMetricsHashRepeatMismatchCount": _get(stable_report, "sampleCounts", "startMetricsHashRepeatMismatchCount"),
        "sourceWarmupKeyRepeatMismatchCount": _get(stable_report, "sampleCounts", "warmupKeyRepeatMismatchCount"),
        "sourceSessionIdDriftCount": _get(stable_report, "sampleCounts", "sessionIdDriftCount"),
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }
    phase_coverage = {
        "93S2R5.1.1": bool(
            source_files_ready
            and source_files_versioned
            and len(red_row_ids) == EXPECTED_RED_ROW_COUNT
            and all(item.get("sha256") and item.get("resultClass") is not None for item in source_artifacts if item.get("path", "").endswith(".json"))
        ),
        "93S2R5.1.2": bool(
            len(failure_rows) == EXPECTED_RED_ROW_COUNT
            and replay_attempt_count == EXPECTED_RED_ROW_COUNT * repeat_count
            and all(
                all(
                    _get(run, "predicate", "expression")
                    and _get(run, "predicate", "function") == PREDICATE_FUNCTION
                    and _get(run, "predicateMargin", "operands")
                    and _get(run, "predicateMargin", "clauses")
                    and run.get("startMetricsHash")
                    and run.get("warmupKey")
                    and run.get("replaySpecId")
                    and run.get("sessionReplayId")
                    and run.get("actionName")
                    and run.get("actionToken") is not None
                    for run in _as_list(row.get("probeRuns"))
                )
                for row in failure_rows
            )
        ),
        "93S2R5.1.3": bool(
            len(dedupe_groups) > 0
            and all(group.get("primaryClassDeferredTo") == "93S2R5.2" for group in dedupe_groups)
            and all(group.get("actionRootCauseAllowed") is False for group in dedupe_groups)
        ),
        "93S2R5.1.4": True,
    }
    ok = bool(all(phase_coverage.values()))
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r5-predicate-preaction-failure-ledger-v1",
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
        "sourceLocks": {
            "currentSourceHashes": _source_hashes(source_artifacts),
            "sourceReportHashes": {
                str(item.get("sourceKey")): item.get("reportHash")
                for item in source_artifacts
                if item.get("reportHash")
            },
            "sourceGitShas": {
                str(item.get("sourceKey")): item.get("gitSha")
                for item in source_artifacts
                if item.get("gitSha")
            },
            "sourceCountSnapshots": {
                str(item.get("sourceKey")): item.get("sampleCounts")
                for item in source_artifacts
                if item.get("sampleCounts")
            },
            "redRowIds": red_row_ids,
            "redRowIdsHash": _hash_value(red_row_ids),
            "predicateFunction": PREDICATE_FUNCTION,
        },
        "measurementContract": {
            "diagnosticOnly": True,
            "predicateMustPassBeforeMeasurement": True,
            "minimumWindowMustPass": True,
            "warmupTerminalBeforeActionAllowed": False,
            "measurementInvalidBeforeActionMustBeZero": True,
            "actionEffectCanOverridePreflightFailure": False,
            "actionEffectJudgementEvaluated": False,
            "actionRootCauseRequiresActionDependentStartMetricsDrift": True,
        },
        "sampleCounts": sample_counts,
        "rowResultCounts": dict(sorted(row_result_counts.items())),
        "issueCounts": dict(sorted(issue_counts.items())),
        "phaseCoverage": phase_coverage,
        "claimFlags": _claim_flags(),
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
            "actionEffectOverrideCount": 0,
            "qualityClaimAllowed": False,
        },
        "dedupeGroups": dedupe_groups,
        "failureLedgerRows": failure_rows,
        "failureLedgerRowsHash": _hash_value({"rows": failure_rows}),
        "allowNext": ["93S2R5.2 Root-Cause-Entscheid und Repair-Contract"] if ok else [],
        "opensNext": ["93S2R5.2 Root-Cause-Entscheid und Repair-Contract"] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "93S2R4.5",
                "reason": "S2R5.1 only writes the predicate/pre-action ledger. Repair contract and empirical gate are still missing.",
                "active": True,
            },
            {
                "scope": "action root-cause",
                "reason": "All red rows dedupe to stable pre-action StartMetrics by Scenario/Seed; action root-cause is disallowed in S2R5.1.",
                "active": sample_counts["actionRootCauseAllowedGroupCount"] == 0,
            },
            {
                "scope": "BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate, BT95",
                "reason": "Downstream remains closed until BT93S2R5.99 predicate-window-repair-green plus later S2R4 full gate/closure.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R5.2 to choose exactly one repair class per unique Scenario/Seed/StartMetricsHash group and lock the repair contract.",
            "Do not start 93S2R4.5, 93S2R3.3-Reentry, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r5_predicate_preaction_failure_ledger.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r5_predicate_preaction_repair_contract.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "diagnostic ledger reruns 33 rows x 3 repeats; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    issue_rows = "\n".join(
        f"- `{key}`: `{value}`" for key, value in _as_mapping(report.get("issueCounts")).items()
    ) or "- keine"
    group_rows = "\n".join(
        "| `{scenario}` | `{seed}` | `{rows}` | `{actions}` | `{margin}` | `{root}` | `{hypotheses}` |".format(
            scenario=group.get("scenarioId"),
            seed=group.get("seed"),
            rows=group.get("redRowCount"),
            actions=", ".join(_as_list(group.get("actions"))),
            margin=group.get("predicateMarginMin"),
            root=group.get("actionRootCauseVerdict"),
            hypotheses=", ".join(_as_list(group.get("hypothesisCandidates"))),
        )
        for group in _as_list(report.get("dedupeGroups"))
        if isinstance(group, Mapping)
    )
    source_rows = "\n".join(
        f"- `{source.get('path')}`: resultClass=`{source.get('resultClass')}`, ok=`{source.get('ok')}`, "
        f"reportHash=`{source.get('reportHash')}`, gitSha=`{source.get('gitSha')}`, sha256=`{source.get('sha256')}`"
        for source in _as_list(report.get("sourceArtifacts"))
        if isinstance(source, Mapping) and source.get("required") is True
    )
    next_actions = "\n".join(f"- {action}" for action in _as_list(report.get("nextAllowedActions")))
    return f"""# Fehlerbericht: BT93S2R5 Predicate-/PreAction-Validity erforderlich

## Aufgabe/Kontext

- Task: `93S2R5.1`
- Ziel: die 33 roten `93S2R4.4`-Rows mit vollstaendigen Predicate-Operanden, Margins und PreAction-Metrics erneut schreiben.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Failure-Ledger-Rows: `{counts.get('failureLedgerRowCount')}`
- Unique Scenario/Seed/StartMetrics-Gruppen: `{counts.get('uniqueScenarioSeedStartMetricsGroupCount')}`
- Replay-Attempts: `{counts.get('replayAttemptCount')}`
- Predicate-Fail-Rows/Attempts: `{counts.get('predicateFailureRowCount')}` / `{counts.get('predicateFailureAttemptCount')}`
- MeasurementInvalidBeforeAction-Rows/Attempts: `{counts.get('measurementInvalidBeforeActionRowCount')}` / `{counts.get('measurementInvalidBeforeActionAttemptCount')}`
- Minimum-Window-Fails: `{counts.get('minimumWindowFailureRowCount')}`
- Warmup-Terminal-Before-Action: `{counts.get('warmupTerminalBeforeActionRowCount')}`
- Action-abhaengiger StartMetrics-Drift: `{counts.get('actionDependentStartMetricsDriftGroupCount')}`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

{source_rows}

## Befundmatrix

| Scenario | Seed | Rows | Actions | Min Margin | Action-Root-Cause | Hypothesen fuer 93S2R5.2 |
| --- | ---: | ---: | --- | ---: | --- | --- |
{group_rows}

## Issues

{issue_rows}

## No-Go-Status

`93S2R4.5`, `93S2R3.3-Reentry`, `BT93S2.3-Recheck`, `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bleiben geschlossen. Action-Wirkung ist als Ursache in
S2R5.1 nicht erlaubt, weil die roten Gruppen nach Scenario/Seed stabile
PreAction-StartMetrics haben.

## Evidence

- `data/training/ppo/bt93s2r5/predicate_preaction_failure_ledger.json`
- Command: `python python/scripts/bt93s2r5_predicate_preaction_failure_ledger.py --write-report`

## Naechster Schritt

{next_actions}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    parser.add_argument("--repeat-count", type=int, default=LOCKED_REPEAT_COUNT, help="fresh replay attempts per red row")
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
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
