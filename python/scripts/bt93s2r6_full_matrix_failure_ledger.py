"""BT93S2R6.1 full-matrix failure ledger and non-coverage audit.

Diagnostic-only: reads the red BT93S2R3.4 full-matrix report, locks the
source artifacts, writes all 20 red rows with predicate operands/margins, and
audits why the prior S2R5 103-row repair did not cover the full 338-probe
matrix. It does not train, consume holdout, or change runtime/action semantics.
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
for candidate in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

import bt93s2_existing_action_effect_v3_recheck as v3_recheck  # noqa: E402
import bt93s2r4_deterministic_reset_repair as reset_repair  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R3_ROOT = PPO_ROOT / "bt93s2r3"
BT93S2R4_ROOT = PPO_ROOT / "bt93s2r4"
BT93S2R5_ROOT = PPO_ROOT / "bt93s2r5"
BT93S2R6_ROOT = PPO_ROOT / "bt93s2r6"

SOURCE_S2R3_FULL_GATE = BT93S2R3_ROOT / "empirical_zero_gate_report.json"
SOURCE_S2R3_DIRECTION = BT93S2R3_ROOT / "direction_fairness_neutral_contract.json"
SOURCE_S2R5_LEDGER = BT93S2R5_ROOT / "predicate_preaction_failure_ledger.json"
SOURCE_S2R5_REPAIR_CONTRACT = BT93S2R5_ROOT / "predicate_preaction_repair_contract.json"
SOURCE_S2R5_CLOSURE = BT93S2R5_ROOT / "bt93s2r5_closure_gate_report.json"
SOURCE_S2R4_FULL_REPLAY = BT93S2R4_ROOT / "full_replay_preflight_gate.json"
SOURCE_S2R4_CLOSURE = BT93S2R4_ROOT / "bt93s2r4_closure_gate_report.json"
SOURCE_MATRIX_CONTRACT = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r6_full_matrix_failure_ledger.py"
REPORT_PATH = BT93S2R6_ROOT / "full_matrix_failure_ledger.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-02_bt93s2r6_full_matrix_predicate_required.md"

BLOCK_ID = "BT93S2R6"
PHASE_ID = "93S2R6.1"
RESULT_CLASS = "full-matrix-failure-ledger-written"
MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
REPAIR_CONTRACT_ID = "bt93s2r2-predicate-window-repair-contract-v1"
ACTION_SURFACE_ID = "bt93q-walltrail-semantic-action-v1"
DECODER_HASH = "970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9"

EXPECTED_PROBE_COUNT = 338
EXPECTED_SCENARIO_COUNT = 9
EXPECTED_ACTION_COUNT = 13
EXPECTED_RED_ROW_COUNT = 20
EXPECTED_PREDICATE_FAILURE_COUNT = 19
EXPECTED_MINIMUM_WINDOW_FAILURE_COUNT = 1
EXPECTED_MEASUREMENT_INVALID_COUNT = 19
EXPECTED_RETAINED_V2_MEASUREMENT_INVALID_COUNT = 10

DOWNSTREAM_BLOCKS = [
    "93S2R3.99 before BT93S2R6.99 plus fresh 93S2R3.4-Recheck",
    "BT93S2.3-Recheck before BT93S2R6.99 plus fresh 93S2R3.4-Recheck",
    "93S2.4 before measurementValid=true and BT93S2R3.99 green",
    "BT93T/U/W/O/P/94A before matrix-control reentry is green",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "PPO training",
    "reward change",
    "telemetry change",
    "action-surface change",
    "productive runtime integration",
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
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


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
        "s2r3FullMatrixGate": (
            SOURCE_S2R3_FULL_GATE,
            "red 93S2R3.4 full-matrix empirical gate",
            {
                "blockId": "BT93S2R3",
                "phaseId": "93S2R3.4",
                "resultClass": "predicate-window-required",
                "ok": False,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
                "actionSurfaceId": ACTION_SURFACE_ID,
                "decoderHash": DECODER_HASH,
                "sampleCounts.probeCount": EXPECTED_PROBE_COUNT,
                "sampleCounts.scenarioCount": EXPECTED_SCENARIO_COUNT,
                "sampleCounts.actionCount": EXPECTED_ACTION_COUNT,
                "sampleCounts.predicateFailureCount": EXPECTED_PREDICATE_FAILURE_COUNT,
                "sampleCounts.minimumWindowFailureCount": EXPECTED_MINIMUM_WINDOW_FAILURE_COUNT,
                "sampleCounts.measurementInvalidCount": EXPECTED_MEASUREMENT_INVALID_COUNT,
                "sampleCounts.retainedV2MeasurementInvalidCount": EXPECTED_RETAINED_V2_MEASUREMENT_INVALID_COUNT,
                "sampleCounts.newTrainingEpisodes": 0,
                "sampleCounts.holdoutEpisodes": 0,
            },
            True,
        ),
        "s2r3DirectionFairness": (
            SOURCE_S2R3_DIRECTION,
            "green 93S2R3.3 direction/fairness/neutral contract",
            {
                "blockId": "BT93S2R3",
                "phaseId": "93S2R3.3-Reentry",
                "resultClass": "direction-fairness-neutral-contract-green",
                "ok": True,
                "sampleCounts.directionContractRowCount": 103,
                "sampleCounts.escapeRightFairnessFailureCount": 0,
                "sampleCounts.neutralControlRequiredCount": 0,
            },
            True,
        ),
        "s2r5RepairContract": (
            SOURCE_S2R5_REPAIR_CONTRACT,
            "green S2R5 repair contract, only 103-row coverage",
            {
                "blockId": "BT93S2R5",
                "phaseId": "93S2R5.2",
                "resultClass": "predicate-preaction-repair-contract-written",
                "ok": True,
                "sampleCounts.repairDecisionCount": 4,
            },
            True,
        ),
        "s2r5Closure": (
            SOURCE_S2R5_CLOSURE,
            "green S2R5 closure for predicate/window repair",
            {
                "blockId": "BT93S2R5",
                "phaseId": "93S2R5.99",
                "resultClass": "predicate-window-repair-green",
                "ok": True,
                "sampleCounts.contractRowCount": 103,
                "sampleCounts.predicateFailureCount": 0,
            },
            True,
        ),
        "s2r4FullReplayGreen": (
            SOURCE_S2R4_FULL_REPLAY,
            "green S2R4 full replay preflight",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.5",
                "resultClass": "replay-startstate-green",
                "ok": True,
                "sampleCounts.contractRowCount": 103,
                "sampleCounts.replayAttemptCount": 309,
            },
            True,
        ),
        "s2r4Closure": (
            SOURCE_S2R4_CLOSURE,
            "green S2R4 closure",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.99",
                "resultClass": "replay-startstate-green",
                "ok": True,
            },
            True,
        ),
        "s2rMatrixContract": (
            SOURCE_MATRIX_CONTRACT,
            "full matrix/control-v3 contract",
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
        "generatorScript": (SCRIPT_PATH, "BT93S2R6.1 generator", {}, False),
    }
    tracked = _tracked_files(path for path, _role, _expected, _required in specs.values())
    return [
        _source_artifact(key, path, role, expected, tracked, required=required)
        for key, (path, role, expected, required) in specs.items()
    ]


def _scenario_index(matrix_contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {
        str(scenario.get("id")): scenario
        for scenario in _as_list(matrix_contract.get("scenarios"))
        if isinstance(scenario, Mapping) and scenario.get("id")
    }


def _semantic_actions(full_gate: Mapping[str, Any]) -> list[str]:
    actions = _get(full_gate, "actionSurface", "semanticActions")
    return [str(action) for action in _as_list(actions)]


def _row_predicate(row: Mapping[str, Any]) -> Mapping[str, Any]:
    predicate = _get(row, "probeRun", "predicate")
    return predicate if isinstance(predicate, Mapping) else {}


def _row_minimum_window(row: Mapping[str, Any]) -> Mapping[str, Any]:
    window = _get(row, "probeRun", "minimumWindow")
    return window if isinstance(window, Mapping) else {}


def _row_start_hash(row: Mapping[str, Any]) -> str | None:
    value = row.get("startMetricsHash") or _get(row, "probeRun", "startMetricsHash")
    return str(value) if value else None


def _row_warmup_key(row: Mapping[str, Any]) -> str | None:
    value = row.get("warmupKey") or _get(row, "probeRun", "warmupKey")
    return str(value) if value else None


def _is_red(row: Mapping[str, Any]) -> bool:
    return bool(
        row.get("predicatePass") is not True
        or row.get("measurementInvalidBeforeAction") is True
        or row.get("completedMinimumWindow") is not True
        or row.get("resultClass") != "matrix-control-empirical-row-green"
    )


def _group_key(row: Mapping[str, Any]) -> str:
    predicate = _row_predicate(row)
    return "|".join(
        [
            str(row.get("scenarioId")),
            str(row.get("seed")),
            str(row.get("sourceSeed")),
            str(_row_start_hash(row)),
            str(predicate.get("predicateId")),
        ]
    )


def _strict_key(row: Mapping[str, Any]) -> str:
    return f"{_group_key(row)}|{_row_warmup_key(row)}"


def _repair_decisions_by_group(repair_contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    decisions: dict[str, Mapping[str, Any]] = {}
    for decision in _as_list(repair_contract.get("repairDecisions")):
        if not isinstance(decision, Mapping):
            continue
        key = "|".join(
            [
                str(decision.get("scenarioId")),
                str(decision.get("oldSeed")),
                str(decision.get("oldSeed")),
                str(decision.get("oldStartMetricsHash")),
                str(_get(decision, "oldPredicate", "predicateId") or _get(decision, "newPredicate", "predicateId")),
            ]
        )
        decisions[key] = decision
    return decisions


def _stable_margin_clause(clause_id: str, actual: float | None, operator: str, threshold: float) -> dict[str, Any]:
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
    return {
        "clauseId": clause_id,
        "actual": actual,
        "operator": operator,
        "threshold": threshold,
        "margin": margin,
        "pass": passed,
    }


def _predicate_margin(scenario_id: str, metrics: Mapping[str, Any], expression: str | None) -> dict[str, Any]:
    front = _number(metrics.get("wallDistanceFront"))
    left = _number(metrics.get("wallDistanceLeft"))
    right = _number(metrics.get("wallDistanceRight"))
    openness = _number(metrics.get("localOpennessRatio"))
    pressure = _number(metrics.get("pressureLevel"))
    nearest_side = min(left, right) if left is not None and right is not None else None
    max_wall = max(front, left, right) if all(value is not None for value in (front, left, right)) else None
    clauses: list[dict[str, Any]] = []
    if scenario_id == "escape-right-open":
        clauses.append(_stable_margin_clause("wallDistanceRight>=0.40", right, ">=", 0.40))
        clauses.append(_stable_margin_clause("wallDistanceFront>=0.85", front, ">=", 0.85))
    elif scenario_id == "narrowing-corridor":
        clauses.append(_stable_margin_clause("localOpennessRatio<=0.64", openness, "<=", 0.64))
        clauses.append(_stable_margin_clause("minWallDistanceLeftRight<=0.75", nearest_side, "<=", 0.75))
    margins = [clause["margin"] for clause in clauses if isinstance(clause.get("margin"), (int, float))]
    return {
        "expression": expression,
        "function": "bt93s2_scenario_matrix_v2._predicate_ok",
        "operands": {
            "wallDistanceFront": front,
            "wallDistanceLeft": left,
            "wallDistanceRight": right,
            "localOpennessRatio": openness,
            "pressureLevel": pressure,
            "minWallDistanceLeftRight": nearest_side,
            "maxWallDistance": max_wall,
        },
        "clauses": clauses,
        "overallMargin": min(margins) if margins else None,
        "failedClauseIds": [str(clause["clauseId"]) for clause in clauses if clause.get("pass") is not True],
    }


def _diagnostic_probe(row: Mapping[str, Any], scenario: Mapping[str, Any]) -> dict[str, Any]:
    action_name = str(row.get("actionName"))
    seed = int(row.get("seed") or 0)
    source_min_window = _row_minimum_window(row)
    repeat_steps = int(source_min_window.get("requestedRepeatSteps") or _get(scenario, "effectWindow", "maxSteps") or 24)
    probe = v3_recheck._run_probe_v3(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
    metrics = probe.get("startMetrics") if isinstance(probe.get("startMetrics"), Mapping) else {}
    predicate = probe.get("v3Predicate") if isinstance(probe.get("v3Predicate"), Mapping) else {}
    if not predicate:
        predicate = _row_predicate(row)
    start_hash = _hash_value(metrics) if metrics else None
    warmup_payload = reset_repair._warmup_payload(str(row.get("scenarioId")), seed, action_name, scenario)
    warmup_key = _hash_value(warmup_payload)
    predicate_margin = _predicate_margin(str(row.get("scenarioId")), metrics, str(predicate.get("expression") or ""))
    return {
        "startMetrics": metrics,
        "startMetricsHash": start_hash,
        "warmupKey": warmup_key,
        "predicate": {
            "predicateId": predicate.get("predicateId"),
            "expression": predicate.get("expression"),
            "function": predicate.get("function") or "bt93s2_scenario_matrix_v2._predicate_ok",
            "pass": predicate.get("pass"),
            "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement"),
        },
        "predicateMargin": predicate_margin,
        "startMetricsHashMatchesSource": start_hash == _row_start_hash(row),
        "warmupKeyMatchesSource": warmup_key == _row_warmup_key(row),
    }


def _issue_list(row: Mapping[str, Any]) -> list[str]:
    issues = [str(issue) for issue in _as_list(row.get("issues"))]
    if row.get("predicatePass") is not True:
        issues.append("predicate-failed-before-action")
    if row.get("measurementInvalidBeforeAction") is True:
        issues.append("measurement-invalid-before-action")
    if row.get("completedMinimumWindow") is not True:
        issues.append("minimum-window-failed")
    if row.get("retainedV2Scenario") is True and row.get("measurementInvalidBeforeAction") is True:
        issues.append("retained-v2-measurement-invalid")
    return sorted(set(issues))


def _hypotheses_for_group(group: Mapping[str, Any]) -> list[str]:
    scenario_id = str(group.get("scenarioId"))
    if scenario_id == "escape-right-open":
        return [
            "full-matrix-seed-startstate-required",
            "predicate-contract-required",
        ]
    if scenario_id == "narrowing-corridor" and group.get("minimumWindowFailureCount"):
        return [
            "minimum-window-contract-required",
            "metric-sampling-contract-required",
        ]
    if scenario_id == "narrowing-corridor" and group.get("retainedV2MeasurementInvalidCount"):
        return [
            "retained-v2-seed-startstate-required",
            "predicate-contract-required",
        ]
    return ["measurement-invalid"]


def _claim_flags() -> dict[str, bool]:
    return {
        "phase93S2R6_2Allowed": True,
        "phase93S2R6_3Allowed": False,
        "phase93S2R6_4Allowed": False,
        "phase93S2R6_99Allowed": False,
        "phase93S2R3_4RecheckAllowed": False,
        "phase93S2R3_99Allowed": False,
        "bt93s2FreshRecheckAllowed": False,
        "phase93S2_4Allowed": False,
        "bt93tClaimable": False,
        "bt93uClaimable": False,
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


def build_report() -> dict[str, Any]:
    full_gate = _read_json(SOURCE_S2R3_FULL_GATE)
    matrix_contract = _read_json(SOURCE_MATRIX_CONTRACT)
    repair_contract = _read_json(SOURCE_S2R5_REPAIR_CONTRACT)
    source_artifacts = _source_artifacts()
    required_sources = [item for item in source_artifacts if item.get("required") is True]
    source_files_ready = all(item.get("exists") and item.get("isFile") and item.get("fresh") for item in required_sources)
    source_files_versioned = all(item.get("tracked") for item in required_sources)

    empirical_rows = [row for row in _as_list(full_gate.get("empiricalRows")) if isinstance(row, Mapping)]
    red_source_rows = sorted([row for row in empirical_rows if _is_red(row)], key=lambda row: int(row.get("matrixRowIndex") or 0))
    scenarios = _scenario_index(matrix_contract)
    repair_decisions = _repair_decisions_by_group(repair_contract)
    action_vocab = _semantic_actions(full_gate)

    rows_by_group: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    strict_rows_by_group: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    for row in empirical_rows:
        rows_by_group[_group_key(row)].append(row)
        strict_rows_by_group[_strict_key(row)].append(row)

    failure_rows: list[dict[str, Any]] = []
    for row in red_source_rows:
        scenario_id = str(row.get("scenarioId"))
        scenario = scenarios.get(scenario_id, {})
        diagnostic = _diagnostic_probe(row, scenario)
        predicate = _row_predicate(row)
        minimum_window = _row_minimum_window(row)
        group_key = _group_key(row)
        strict_key = _strict_key(row)
        repair_decision = repair_decisions.get(group_key)
        s2r5_actions = [str(action) for action in _as_list(repair_decision.get("affectedActions") if repair_decision else [])]
        source_action = str(row.get("actionName"))
        failure_rows.append(
            {
                "rowId": f"{scenario_id}:{row.get('seed')}:{row.get('sourceSeed')}:{row.get('matrixRowIndex')}:{source_action}",
                "matrixRowIndex": row.get("matrixRowIndex"),
                "scenarioId": scenario_id,
                "seed": row.get("seed"),
                "sourceSeed": row.get("sourceSeed"),
                "sourceOldSeed": row.get("sourceOldSeed"),
                "actionName": source_action,
                "actionToken": row.get("actionToken"),
                "resultClass": row.get("resultClass"),
                "retainedV2Scenario": row.get("retainedV2Scenario") is True,
                "predicateId": predicate.get("predicateId"),
                "predicateExpression": predicate.get("expression"),
                "predicateFunction": predicate.get("function"),
                "predicatePass": row.get("predicatePass"),
                "predicateOperands": diagnostic["predicateMargin"]["operands"],
                "predicateMargin": diagnostic["predicateMargin"],
                "sourceStartMetricsHash": _row_start_hash(row),
                "diagnosticStartMetricsHash": diagnostic["startMetricsHash"],
                "startMetricsHashMatchesSource": diagnostic["startMetricsHashMatchesSource"],
                "sourceWarmupKey": _row_warmup_key(row),
                "diagnosticWarmupKey": diagnostic["warmupKey"],
                "warmupKeyMatchesSource": diagnostic["warmupKeyMatchesSource"],
                "requestedRepeatSteps": minimum_window.get("requestedRepeatSteps"),
                "observedSteps": minimum_window.get("observedSteps"),
                "minimumCompletedSteps": minimum_window.get("minimumCompletedSteps"),
                "completedMinimumWindow": row.get("completedMinimumWindow"),
                "measurementInvalidBeforeAction": row.get("measurementInvalidBeforeAction"),
                "warmupTerminalBeforeAction": row.get("warmupTerminalBeforeAction"),
                "issues": _issue_list(row),
                "siblingGroupKey": group_key,
                "strictWarmupSiblingKey": strict_key,
                "strictWarmupSiblingRowCount": len(strict_rows_by_group.get(strict_key, [])),
                "s2r5PreviouslyCovered": source_action in s2r5_actions,
                "s2r5CoverageStatus": "covered-by-s2r5-103-row-repair"
                if source_action in s2r5_actions
                else "not-covered-by-s2r5-103-row-repair",
                "s2r5RepairDecisionId": repair_decision.get("groupId") if repair_decision else None,
                "s2r5RepairClass": repair_decision.get("primaryRepairClass") if repair_decision else None,
            }
        )

    failure_rows_by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in failure_rows:
        failure_rows_by_group[str(row["siblingGroupKey"])].append(row)

    sibling_groups: list[dict[str, Any]] = []
    for group_key, group_rows in sorted(failure_rows_by_group.items()):
        first = group_rows[0]
        repair_decision = repair_decisions.get(group_key)
        s2r5_actions = sorted(str(action) for action in _as_list(repair_decision.get("affectedActions") if repair_decision else []))
        current_rows = rows_by_group.get(group_key, [])
        current_actions = sorted({str(row.get("actionName")) for row in current_rows})
        current_red_actions = sorted({str(row.get("actionName")) for row in group_rows})
        full_sibling_actions = sorted(set(current_actions) | set(s2r5_actions))
        missing_actions = sorted(set(action_vocab) - set(full_sibling_actions))
        group = {
            "groupId": group_key,
            "scenarioId": first["scenarioId"],
            "seed": first["seed"],
            "sourceSeed": first["sourceSeed"],
            "startMetricsHash": first["sourceStartMetricsHash"],
            "predicateId": first["predicateId"],
            "predicateExpression": first["predicateExpression"],
            "currentFullMatrixRowCount": len(current_rows),
            "currentFullMatrixActions": current_actions,
            "currentRedRowCount": len(group_rows),
            "currentRedActions": current_red_actions,
            "strictWarmupSiblingGroupCount": len({row["strictWarmupSiblingKey"] for row in group_rows}),
            "s2r5RepairDecisionId": repair_decision.get("groupId") if repair_decision else None,
            "s2r5RepairClass": repair_decision.get("primaryRepairClass") if repair_decision else None,
            "s2r5CoveredActions": s2r5_actions,
            "s2r5CoveredActionCount": len(s2r5_actions),
            "fullMatrixSiblingActions": full_sibling_actions,
            "fullMatrixSiblingActionCount": len(full_sibling_actions),
            "missingFromExpectedActionVocabulary": missing_actions,
            "siblingExpansionCount": len(full_sibling_actions),
            "uncoveredCurrentRedActions": sorted(set(current_red_actions) - set(s2r5_actions)),
            "predicateFailureCount": sum(1 for row in group_rows if row["predicatePass"] is not True),
            "measurementInvalidCount": sum(1 for row in group_rows if row["measurementInvalidBeforeAction"] is True),
            "retainedV2MeasurementInvalidCount": sum(
                1 for row in group_rows if row["retainedV2Scenario"] is True and row["measurementInvalidBeforeAction"] is True
            ),
            "minimumWindowFailureCount": sum(1 for row in group_rows if row["completedMinimumWindow"] is not True),
            "observedStepMin": min(_number(row.get("observedSteps")) for row in group_rows if _number(row.get("observedSteps")) is not None),
            "observedStepMax": max(_number(row.get("observedSteps")) for row in group_rows if _number(row.get("observedSteps")) is not None),
            "predicateMarginMin": min(
                _number(_get(row, "predicateMargin", "overallMargin"))
                for row in group_rows
                if _number(_get(row, "predicateMargin", "overallMargin")) is not None
            ),
            "coverageGapReason": "s2r5-repaired-only-103-row-subset; current red actions are full-matrix siblings outside that repair"
            if repair_decision
            else "full-matrix-retained-v2/minimum-window row was never a red S2R5 repair decision",
        }
        group["rootCauseHypotheses"] = _hypotheses_for_group(group)
        sibling_groups.append(group)

    row_result_counts = Counter(str(row.get("resultClass")) for row in failure_rows)
    issue_counts = Counter(issue for row in failure_rows for issue in _as_list(row.get("issues")))
    sample_counts = {
        "sourceProbeCount": _get(full_gate, "sampleCounts", "probeCount"),
        "sourceScenarioCount": _get(full_gate, "sampleCounts", "scenarioCount"),
        "sourceActionCount": _get(full_gate, "sampleCounts", "actionCount"),
        "failureLedgerRowCount": len(failure_rows),
        "expectedFailureLedgerRowCount": EXPECTED_RED_ROW_COUNT,
        "predicateFailureCount": sum(1 for row in failure_rows if row.get("predicatePass") is not True),
        "minimumWindowFailureCount": sum(1 for row in failure_rows if row.get("completedMinimumWindow") is not True),
        "measurementInvalidBeforeActionCount": sum(1 for row in failure_rows if row.get("measurementInvalidBeforeAction") is True),
        "retainedV2RedRowCount": sum(1 for row in failure_rows if row.get("retainedV2Scenario") is True),
        "retainedV2MeasurementInvalidCount": sum(
            1 for row in failure_rows if row.get("retainedV2Scenario") is True and row.get("measurementInvalidBeforeAction") is True
        ),
        "sourceStartMetricsHashMismatchCount": sum(1 for row in failure_rows if row.get("startMetricsHashMatchesSource") is not True),
        "sourceWarmupKeyMismatchCount": sum(1 for row in failure_rows if row.get("warmupKeyMatchesSource") is not True),
        "strictWarmupSiblingGroupCount": len({row["strictWarmupSiblingKey"] for row in failure_rows}),
        "startStateSiblingGroupCount": len(sibling_groups),
        "siblingExpansionCount": sum(group["siblingExpansionCount"] for group in sibling_groups),
        "expectedSiblingExpansionPerGroup": EXPECTED_ACTION_COUNT,
        "s2r5PreviouslyCoveredSiblingActionCount": sum(group["s2r5CoveredActionCount"] for group in sibling_groups),
        "s2r5CoveredCurrentRedRowCount": sum(1 for row in failure_rows if row.get("s2r5PreviouslyCovered") is True),
        "s2r5UncoveredCurrentRedRowCount": sum(1 for row in failure_rows if row.get("s2r5PreviouslyCovered") is not True),
        "siblingGroupsMissingExpectedActionCount": sum(
            1 for group in sibling_groups if group["fullMatrixSiblingActionCount"] != EXPECTED_ACTION_COUNT
        ),
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutEpisodes": 0,
    }

    phase_coverage = {
        "93S2R6.1.1": bool(
            source_files_ready
            and source_files_versioned
            and _get(full_gate, "reportHash") == "11726cf75018cc9441fcc07756e82af29a029ce5ba11c8243587ba0198d3d6a0"
        ),
        "93S2R6.1.2": bool(
            len(failure_rows) == EXPECTED_RED_ROW_COUNT
            and all(row.get("predicateId") and row.get("predicateOperands") and row.get("predicateMargin") for row in failure_rows)
            and sample_counts["sourceStartMetricsHashMismatchCount"] == 0
        ),
        "93S2R6.1.3": bool(
            len(sibling_groups) == 4
            and sample_counts["siblingGroupsMissingExpectedActionCount"] == 0
            and sample_counts["s2r5UncoveredCurrentRedRowCount"] == EXPECTED_RED_ROW_COUNT
        ),
        "93S2R6.1.4": True,
    }
    ok = all(phase_coverage.values())
    source_hashes = {
        str(item.get("sourceKey")): item.get("sha256")
        for item in source_artifacts
        if item.get("sourceKey")
    }
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r6-full-matrix-failure-ledger-v1",
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
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceLocks": {
            "sourceHashes": source_hashes,
            "sourceReportHashes": {
                str(item.get("sourceKey")): item.get("reportHash")
                for item in source_artifacts
                if item.get("reportHash")
            },
            "sourceCountSnapshots": {
                str(item.get("sourceKey")): item.get("sampleCounts")
                for item in source_artifacts
                if item.get("sampleCounts")
            },
            "redRowIds": [
                {
                    "matrixRowIndex": row["matrixRowIndex"],
                    "scenarioId": row["scenarioId"],
                    "seed": row["seed"],
                    "sourceSeed": row["sourceSeed"],
                    "actionName": row["actionName"],
                    "predicateId": row["predicateId"],
                    "startMetricsHash": row["sourceStartMetricsHash"],
                    "warmupKey": row["sourceWarmupKey"],
                }
                for row in failure_rows
            ],
            "redRowIdsHash": _hash_value(
                [
                    (row["matrixRowIndex"], row["scenarioId"], row["seed"], row["sourceSeed"], row["actionName"])
                    for row in failure_rows
                ]
            ),
            "matrixId": MATRIX_ID,
            "contractId": CONTRACT_ID,
            "actionSurfaceId": ACTION_SURFACE_ID,
            "decoderHash": DECODER_HASH,
        },
        "measurementContract": {
            "diagnosticOnly": True,
            "fullMatrixProbeCount": EXPECTED_PROBE_COUNT,
            "predicateMustPassBeforeActionEffect": True,
            "minimumWindowMustPass": True,
            "s2r5CoverageIs103RowSubsetOnly": True,
            "actionEffectJudgementProduced": False,
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
            "actionEffectEvaluated": False,
            "qualityClaimAllowed": False,
        },
        "failureLedgerRows": failure_rows,
        "failureLedgerRowsHash": _hash_value(failure_rows),
        "siblingGroups": sibling_groups,
        "nonCoverageAudit": {
            "s2r5GreenIsValidFor103RowSubset": True,
            "s2r5CannotClose338FullMatrix": True,
            "s2r5CurrentRedRowsCoveredCount": sample_counts["s2r5CoveredCurrentRedRowCount"],
            "s2r5CurrentRedRowsUncoveredCount": sample_counts["s2r5UncoveredCurrentRedRowCount"],
            "coverageGapSummary": [
                {
                    "groupId": group["groupId"],
                    "s2r5CoveredActions": group["s2r5CoveredActions"],
                    "currentRedActions": group["currentRedActions"],
                    "uncoveredCurrentRedActions": group["uncoveredCurrentRedActions"],
                    "coverageGapReason": group["coverageGapReason"],
                    "rootCauseHypotheses": group["rootCauseHypotheses"],
                }
                for group in sibling_groups
            ],
        },
        "allowNext": ["93S2R6.2 Root-Cause-Entscheid und Repair-Contract"] if ok else [],
        "opensNext": ["93S2R6.2 Root-Cause-Entscheid und Repair-Contract"] if ok else [],
        "blocksNext": list(DOWNSTREAM_BLOCKS),
        "invalidations": [
            {
                "scope": "S2R5 green as full-matrix proof",
                "reason": "S2R5 closed the 103-row subset, but 20 current red rows are outside that covered repair set or are retained-v2/window gaps.",
                "active": True,
            },
            {
                "scope": "93S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate, BT95",
                "reason": "93S2R6.1 only writes source-lock and non-coverage evidence; repair contract, repair, recheck and closure are still missing.",
                "active": True,
            },
        ],
        "nextAllowedActions": [
            "Run 93S2R6.2 to classify each unique red Scenario/Seed/StartState group with exactly one primary repair class and lock the repair contract.",
            "Do not start 93S2R6.3/4/99, 93S2R3.4-Recheck, 93S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95 yet.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r6_full_matrix_failure_ledger.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r6_full_matrix_repair_contract.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "diagnostic-only pre-action operand replay for 20 red rows; no PPO training or holdout consumption",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown(report: Mapping[str, Any]) -> str:
    counts = report.get("sampleCounts") if isinstance(report.get("sampleCounts"), Mapping) else {}
    groups = report.get("siblingGroups") if isinstance(report.get("siblingGroups"), list) else []
    group_rows = "\n".join(
        "| `{scenario}` | `{seed}` | `{red}` | `{siblings}` | `{covered}` | `{uncovered}` | `{hypotheses}` |".format(
            scenario=group.get("scenarioId"),
            seed=group.get("seed"),
            red=", ".join(_as_list(group.get("currentRedActions"))),
            siblings=group.get("fullMatrixSiblingActionCount"),
            covered=", ".join(_as_list(group.get("s2r5CoveredActions"))) or "-",
            uncovered=", ".join(_as_list(group.get("uncoveredCurrentRedActions"))) or "-",
            hypotheses=", ".join(_as_list(group.get("rootCauseHypotheses"))),
        )
        for group in groups
        if isinstance(group, Mapping)
    )
    sources = "\n".join(
        f"- `{source.get('path')}`: resultClass=`{source.get('resultClass')}`, ok=`{source.get('ok')}`, "
        f"reportHash=`{source.get('reportHash')}`, sha256=`{source.get('sha256')}`"
        for source in _as_list(report.get("sourceArtifacts"))
        if isinstance(source, Mapping) and source.get("required") is True
    )
    next_actions = "\n".join(f"- {action}" for action in _as_list(report.get("nextAllowedActions")))
    return f"""# Fehlerbericht: BT93S2R6 Full-Matrix Predicate Required

## Kontext

- Task: `93S2R6.1`
- Quelle: rotes `93S2R3.4=predicate-window-required`
- Ziel: Full-Matrix Failure-Ledger und Non-Coverage-Audit nach S2R5-Gruen.

## Ergebnis

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Failure-Ledger-Rows: `{counts.get('failureLedgerRowCount')}`
- Predicate-Fails: `{counts.get('predicateFailureCount')}`
- MeasurementInvalidBeforeAction: `{counts.get('measurementInvalidBeforeActionCount')}`
- Minimum-Window-Fails: `{counts.get('minimumWindowFailureCount')}`
- Retained-v2 MeasurementInvalid: `{counts.get('retainedV2MeasurementInvalidCount')}`
- StartState-Gruppen: `{counts.get('startStateSiblingGroupCount')}`
- SiblingExpansionCount: `{counts.get('siblingExpansionCount')}`
- S2R5-covered current red rows: `{counts.get('s2r5CoveredCurrentRedRowCount')}`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

{sources}

## Befundmatrix und S2R5-Coverage-Gap

| Scenario | Seed | Aktuelle rote Actions | Sibling-Actions | S2R5-covered Actions | Uncovered aktuelle rote Actions | Root-Cause-Hypothesen |
| --- | ---: | --- | ---: | --- | --- | --- |
{group_rows}

## No-Go-Status

`93S2R3.99`, `BT93S2.3-Recheck`, `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate,
Freeze, Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben geschlossen.
S2R5-Gruen ist nur 103-Row-Subset-Evidence und kein 338-Probe-Full-Matrix-Gruen.

## Evidence

- `data/training/ppo/bt93s2r6/full_matrix_failure_ledger.json`
- Command: `python python/scripts/bt93s2r6_full_matrix_failure_ledger.py --write-report`

## Naechster Schritt

{next_actions}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="write JSON and Fehlerbericht artifacts")
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
