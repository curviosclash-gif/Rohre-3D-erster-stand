"""BT93S2R2.2 predicate/window root-cause repair contract.

This phase writes diagnostic governance evidence only. It compares the locked
predicate text, predicate function, replay start metrics, warmup, seeds,
session identity, and minimum windows from the red BT93S2.3-Recheck. It does
not train PPO, consume holdouts, change the action surface, repair rewards,
add telemetry, or touch productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import ast
import copy
import json
import operator
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

import bt93s2_scenario_matrix_v2 as bt93s2_matrix  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R2_ROOT = PPO_ROOT / "bt93s2r2"

RECHECK_REPORT_PATH = BT93S2_ROOT / "existing_action_effect_v3_recheck_report.json"
MATRIX_V3_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
REENTRY_GATE_REPORT_PATH = BT93S2R_ROOT / "matrix_control_reentry_gate_report.json"
S2R_CLOSURE_REPORT_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"
FAILURE_TAXONOMY_PATH = BT93S2R2_ROOT / "failure_taxonomy_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
REPORT_PATH = BT93S2R2_ROOT / "predicate_window_repair_contract.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r2_recheck_measurement_invalid.md"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r2_predicate_window_repair.py"

BLOCK_ID = "BT93S2R2"
PHASE_ID = "93S2R2.2"
RESULT_GREEN = "predicate-window-repair-contract-green"
RESULT_INVALID = "measurement-invalid"
MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
REPAIR_CONTRACT_ID = "bt93s2r2-predicate-window-repair-contract-v1"
ACTION_SURFACE_ID = "bt93q-walltrail-semantic-action-v1"
MINIMUM_COMPLETED_STEPS = 8
EFFECT_WINDOW_STEPS = 24

BLOCKED_NEXT = [
    "93S2.4 start before fresh BT93S2.3-Recheck writes measurementValid=true",
    "BT93T claim before fresh S2-Recheck opens only observation telemetry",
    "BT93U claim before fresh S2-Recheck opens action-selection-green",
    "BT93V claim",
    "BT93W claim",
    "BT93O claim",
    "BT93X full claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "PPO training",
    "reward fix from BT93S2R2.2",
    "telemetry fix from BT93S2R2.2",
    "action-surface change from BT93S2R2.2",
]

FORBIDDEN_SUCCESS_PROXIES = [
    "reward-only",
    "command-flag-only",
    "target-distance-only",
    "single-step delta",
    "maxSteps-only survival",
    "progress event without state-risk improvement",
]

ROOT_CAUSE_ORDER = [
    "predicate-expression-drift",
    "predicate-function-drift",
    "start-metrics-drift",
    "warmup-seed-drift",
    "minimum-window-fail",
    "negative-control-fail",
    "direction-contract-mismatch",
    "neutral-control-unstable",
    "env-measurement-drift",
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


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items()))


def _nested_counter(rows: Iterable[Mapping[str, Any]], key_a: str, key_b: str) -> dict[str, dict[str, int]]:
    nested: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        nested[str(row.get(key_a))][str(row.get(key_b))] += 1
    return {key: _counter_dict(value) for key, value in sorted(nested.items())}


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
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and tracked_ok and expected_ok),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "matrixId": payload.get("matrixId") if payload else None,
        "contractId": payload.get("contractId") if payload else None,
        "actionSurfaceId": payload.get("actionSurfaceId") if payload else None,
        "expected": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
        "redRecheck": (
            RECHECK_REPORT_PATH,
            "red BT93S2.3-Recheck source",
            {
                "blockId": "BT93S2",
                "phaseId": "93S2.3-Recheck",
                "resultClass": "measurement-invalid",
                "ok": False,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
                "sampleCounts.predicateFailureCount": 36,
                "sampleCounts.minimumWindowFailureCount": 8,
            },
        ),
        "failureTaxonomy": (
            FAILURE_TAXONOMY_PATH,
            "BT93S2R2.1 source-lock taxonomy",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R2.1",
                "resultClass": "failure-taxonomy-source-lock-red-status-written",
                "ok": True,
            },
        ),
        "matrixV3Contract": (
            MATRIX_V3_CONTRACT_PATH,
            "BT93S2R matrix/control-v3 contract",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.3",
                "resultClass": "matrix-control-v3-contract-green",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
            },
        ),
        "s2rReentryGate": (
            REENTRY_GATE_REPORT_PATH,
            "BT93S2R empirical reentry gate",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.4",
                "resultClass": "matrix-control-reentry-green",
                "ok": True,
            },
        ),
        "s2rClosure": (
            S2R_CLOSURE_REPORT_PATH,
            "BT93S2R closure gate",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.99",
                "resultClass": "matrix-control-reentry-green",
                "ok": True,
            },
        ),
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}),
        "repairScript": (SCRIPT_PATH, "BT93S2R2.2 repair-contract generator", {}),
    }
    tracked = _tracked_files(path for path, _role, _expected in specs.values())
    return [
        _source_artifact(path, role, tracked, expected, source_key=key)
        for key, (path, role, expected) in specs.items()
    ]


class _PredicateExpressionEvaluator(ast.NodeVisitor):
    _cmp_ops = {
        ast.Eq: operator.eq,
        ast.NotEq: operator.ne,
        ast.Lt: operator.lt,
        ast.LtE: operator.le,
        ast.Gt: operator.gt,
        ast.GtE: operator.ge,
    }
    _bin_ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
    }

    def __init__(self, metrics: Mapping[str, Any]) -> None:
        self.metrics = metrics

    def visit_Expression(self, node: ast.Expression) -> Any:  # noqa: N802
        return self.visit(node.body)

    def visit_BoolOp(self, node: ast.BoolOp) -> bool:  # noqa: N802
        values = [bool(self.visit(value)) for value in node.values]
        if isinstance(node.op, ast.And):
            return all(values)
        if isinstance(node.op, ast.Or):
            return any(values)
        raise ValueError(f"unsupported bool op: {type(node.op).__name__}")

    def visit_Compare(self, node: ast.Compare) -> bool:  # noqa: N802
        left = self.visit(node.left)
        for op, comparator in zip(node.ops, node.comparators):
            right = self.visit(comparator)
            fn = self._cmp_ops.get(type(op))
            if fn is None:
                raise ValueError(f"unsupported compare op: {type(op).__name__}")
            if not fn(left, right):
                return False
            left = right
        return True

    def visit_Call(self, node: ast.Call) -> float:  # noqa: N802
        if not isinstance(node.func, ast.Name) or node.func.id not in {"min", "max"}:
            raise ValueError("only min/max calls are allowed")
        args = [self.visit(arg) for arg in node.args]
        if not args:
            raise ValueError("min/max needs at least one argument")
        return min(args) if node.func.id == "min" else max(args)

    def visit_Name(self, node: ast.Name) -> float:  # noqa: N802
        if node.id not in self.metrics:
            raise ValueError(f"missing metric: {node.id}")
        value = self.metrics[node.id]
        if not isinstance(value, (int, float)):
            raise ValueError(f"metric is not numeric: {node.id}")
        return float(value)

    def visit_Constant(self, node: ast.Constant) -> float | bool:  # noqa: N802
        if isinstance(node.value, (int, float, bool)):
            return node.value
        raise ValueError("only numeric and bool constants are allowed")

    def visit_UnaryOp(self, node: ast.UnaryOp) -> float:  # noqa: N802
        value = self.visit(node.operand)
        if isinstance(node.op, ast.USub):
            return -float(value)
        if isinstance(node.op, ast.UAdd):
            return float(value)
        raise ValueError(f"unsupported unary op: {type(node.op).__name__}")

    def visit_BinOp(self, node: ast.BinOp) -> float:  # noqa: N802
        fn = self._bin_ops.get(type(node.op))
        if fn is None:
            raise ValueError(f"unsupported bin op: {type(node.op).__name__}")
        return float(fn(self.visit(node.left), self.visit(node.right)))

    def generic_visit(self, node: ast.AST) -> Any:
        raise ValueError(f"unsupported expression node: {type(node).__name__}")


def _eval_predicate_expression(expression: str | None, metrics: Mapping[str, Any]) -> tuple[bool | None, str | None]:
    if not expression:
        return None, "missing-expression"
    try:
        parsed = ast.parse(expression, mode="eval")
        return bool(_PredicateExpressionEvaluator(metrics).visit(parsed)), None
    except (SyntaxError, ValueError, TypeError, ZeroDivisionError) as exc:
        return None, str(exc)


def _predicate_function_pass(scenario_id: str, metrics: Mapping[str, Any]) -> tuple[bool | None, str | None]:
    try:
        return bool(bt93s2_matrix._predicate_ok(scenario_id, metrics)), None
    except Exception as exc:  # pragma: no cover - diagnostic script must report, not hide, function drift.
        return None, str(exc)


def _predicate_validation(row: Mapping[str, Any]) -> dict[str, Any]:
    scenario_id = str(row.get("scenarioId") or "")
    predicate = _as_mapping(row.get("predicate"))
    start_metrics = _as_mapping(row.get("startMetrics"))
    expression = predicate.get("v3Expression") or predicate.get("v2Expression")
    expression_pass, expression_error = _eval_predicate_expression(
        str(expression) if expression is not None else None,
        start_metrics,
    )
    function_pass, function_error = _predicate_function_pass(scenario_id, start_metrics)
    v2_pass = predicate.get("v2Pass")
    v3_pass = predicate.get("v3Pass")
    expression_function_agree = (
        expression_pass is not None and function_pass is not None and expression_pass == function_pass
    )
    source_function_agree = v3_pass == function_pass if function_pass is not None else False
    source_expression_agree = v3_pass == expression_pass if expression_pass is not None else False
    v2_v3_agree = v2_pass == v3_pass and predicate.get("v2Expression") == predicate.get("v3Expression")
    disagreement_reasons: list[str] = []

    if expression_error:
        disagreement_reasons.append("predicate-expression-eval-error")
    if function_error:
        disagreement_reasons.append("predicate-function-error")
    if predicate.get("v2Expression") != predicate.get("v3Expression"):
        disagreement_reasons.append("predicate-expression-drift")
    if v2_pass != v3_pass:
        disagreement_reasons.append("predicate-source-pass-drift")
    if expression_pass is not None and function_pass is not None and expression_pass != function_pass:
        disagreement_reasons.append("predicate-function-drift")
    if function_pass is not None and v3_pass != function_pass:
        disagreement_reasons.append("source-function-drift")
    if expression_pass is not None and v3_pass != expression_pass:
        disagreement_reasons.append("source-expression-drift")
    if expression_pass is False and function_pass is False and v3_pass is False:
        disagreement_reasons.append("start-metrics-do-not-satisfy-predicate")

    return {
        "expression": expression,
        "expressionPass": expression_pass,
        "expressionError": expression_error,
        "functionPass": function_pass,
        "functionError": function_error,
        "sourceV2Pass": v2_pass,
        "sourceV3Pass": v3_pass,
        "v2V3Agree": v2_v3_agree,
        "expressionFunctionAgree": expression_function_agree,
        "sourceFunctionAgree": source_function_agree,
        "sourceExpressionAgree": source_expression_agree,
        "allPredicateTruthsAgree": bool(
            v2_v3_agree and expression_function_agree and source_function_agree and source_expression_agree
        ),
        "disagreementReasons": disagreement_reasons,
    }


def _session_id(row: Mapping[str, Any]) -> str:
    start_metrics_hash = sha256(_json_text(_as_mapping(row.get("startMetrics"))).encode("utf-8")).hexdigest()[:16]
    key = {
        "matrixId": MATRIX_ID,
        "scenarioId": row.get("scenarioId"),
        "seed": row.get("seed"),
        "actionName": row.get("actionName"),
        "warmupAction": _as_mapping(row.get("warmup")).get("warmupAction"),
        "warmupSteps": _as_mapping(row.get("warmup")).get("warmupSteps"),
        "startMetricsHash": start_metrics_hash,
    }
    return sha256(_json_text(key).encode("utf-8")).hexdigest()[:24]


def _failure_rows(taxonomy: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    rows = taxonomy.get("failureRows")
    return [row for row in _as_list(rows) if isinstance(row, Mapping)]


def _red_scenario_ids(rows: Iterable[Mapping[str, Any]]) -> list[str]:
    return sorted({str(row.get("scenarioId")) for row in rows if row.get("scenarioId")})


def _scenario_source(scenarios: Mapping[str, Mapping[str, Any]], scenario_id: str) -> Mapping[str, Any]:
    return scenarios.get(scenario_id, {})


def _repair_class(root_counts: Counter[str], scenario_id: str) -> str:
    if root_counts.get("negative-control-fail") or scenario_id == "escape-left-open":
        return "escape-control-required"
    if root_counts.get("neutral-control-unstable") or scenario_id == "no-danger-control":
        return "neutral-control-required"
    if root_counts.get("direction-contract-mismatch"):
        return "direction-contract-required"
    if root_counts.get("env-measurement-drift") or scenario_id == "escape-right-open":
        return "predicate-window-fairness-required"
    if root_counts.get("minimum-window-fail") or root_counts.get("warmup-seed-drift"):
        return "minimum-window-required"
    if root_counts.get("start-metrics-drift"):
        return "predicate-window-required"
    return "classified-no-contract-change"


def _scenario_policy(scenario_id: str, root_counts: Counter[str]) -> dict[str, Any]:
    policy = {
        "predicateExpressionFunctionAgreementRequired": True,
        "startMetricsMustSatisfyPredicateBeforeAction": True,
        "sessionReplayIdRequired": True,
        "minimumWindow": {
            "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
            "effectWindowSteps": EFFECT_WINDOW_STEPS,
            "terminalBeforeMinimumWindowIsMeasurementInvalid": True,
            "seedActionPairWithEarlyTerminalIsBlockedForPositiveEvidence": True,
        },
        "forbiddenSuccessProxies": list(FORBIDDEN_SUCCESS_PROXIES),
        "invalidIf": [
            "predicate expression and predicate function disagree",
            "source predicate pass and recomputed function pass disagree",
            "startMetrics fail the locked predicate",
            "warmup terminal occurs before action measurement",
            "minimum completed window is not reached",
            "negative control passes as success",
            "wrong-direction action passes as success",
            "neutral control produces action-green evidence",
        ],
    }
    if scenario_id == "escape-left-open":
        policy["negativeControlFirst"] = {
            "enabled": True,
            "baselineAction": "noop",
            "wrongDirections": ["yaw-right", "roll-right", "evade-right", "turn-right-boost"],
            "baselineSuccessInvalidatesScenario": True,
            "positiveActionsJudgedOnlyAfterNegativeControlsFail": True,
        }
    if scenario_id == "escape-right-open":
        policy["fairnessFirst"] = {
            "enabled": True,
            "actionSpaceJudgementAllowed": False,
            "requiresAllPositiveControlsMeasurable": True,
            "predicateAndWindowMustBeGreenBeforeActionSpaceRequired": True,
        }
    if scenario_id == "no-danger-control":
        policy["neutralControl"] = {
            "actionGreenEvidenceAllowed": False,
            "noopIsNeutralStabilityOnly": True,
            "negativeActions": ["boost", "shoot-mg"],
        }
    if root_counts.get("direction-contract-mismatch"):
        policy["directionContract"] = {
            "positiveActionDirectionMustMatchScenario": True,
            "wrongDirectionSuccessInvalidatesMeasurement": True,
        }
    return policy


def _session_repair_row(row: Mapping[str, Any]) -> dict[str, Any]:
    predicate = _predicate_validation(row)
    minimum_window = _as_mapping(row.get("minimumWindow"))
    warmup = _as_mapping(row.get("warmup"))
    root_cause = str(row.get("primaryRootCauseClass") or "")
    return {
        "sessionReplayId": _session_id(row),
        "scenarioId": row.get("scenarioId"),
        "seed": row.get("seed"),
        "actionName": row.get("actionName"),
        "actionToken": row.get("actionToken"),
        "primaryRootCauseClass": root_cause,
        "predicateValidation": predicate,
        "startMetricsHash": sha256(_json_text(_as_mapping(row.get("startMetrics"))).encode("utf-8")).hexdigest(),
        "warmup": {
            "warmupAction": warmup.get("warmupAction"),
            "warmupSteps": warmup.get("warmupSteps"),
            "warmupTerminalBeforeAction": warmup.get("warmupTerminalBeforeAction"),
            "repairDecision": "block-seed-action-pair-until-nonterminal-warmup"
            if warmup.get("warmupTerminalBeforeAction") is True
            else "warmup-contract-locked",
        },
        "minimumWindow": {
            "completed": minimum_window.get("completed"),
            "observedSteps": minimum_window.get("observedSteps"),
            "minimumCompletedSteps": minimum_window.get("minimumCompletedSteps"),
            "requestedRepeatSteps": minimum_window.get("requestedRepeatSteps"),
            "repairDecision": "block-positive-evidence-until-minimum-window-completes"
            if minimum_window.get("completed") is not True
            else "minimum-window-contract-locked",
        },
        "measurementInvalidBeforeAction": bool(
            not predicate["allPredicateTruthsAgree"]
            or predicate["functionPass"] is not True
            or warmup.get("warmupTerminalBeforeAction") is True
            or minimum_window.get("completed") is not True
        ),
        "allowedToContributeActionSuccessBeforeEmpiricalGate": False,
    }


def _scenario_repairs(
    rows: list[Mapping[str, Any]],
    scenarios: Mapping[str, Mapping[str, Any]],
) -> list[dict[str, Any]]:
    by_scenario: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    for row in rows:
        by_scenario[str(row.get("scenarioId"))].append(row)

    repairs: list[dict[str, Any]] = []
    for scenario_id in sorted(by_scenario):
        scenario_rows = by_scenario[scenario_id]
        root_counts = Counter(str(row.get("primaryRootCauseClass")) for row in scenario_rows)
        predicate_rows = [_session_repair_row(row) for row in scenario_rows]
        expression_function_disagreement_count = sum(
            1
            for row in predicate_rows
            if row["predicateValidation"]["expressionFunctionAgree"] is not True
            or row["predicateValidation"]["sourceFunctionAgree"] is not True
        )
        source = copy.deepcopy(dict(_scenario_source(scenarios, scenario_id)))
        source["s2r2Repair"] = {
            "repairClass": _repair_class(root_counts, scenario_id),
            "rootCauseCounts": _counter_dict(root_counts),
            "predicateWindowPolicy": _scenario_policy(scenario_id, root_counts),
            "sessionReplayRows": predicate_rows,
            "expressionFunctionDisagreementCount": expression_function_disagreement_count,
            "empiricalGateRequired": True,
            "actionSuccessEvidenceAllowedBeforeEmpiricalGate": False,
        }
        repairs.append(
            {
                "scenarioId": scenario_id,
                "repairClass": source["s2r2Repair"]["repairClass"],
                "rootCauseCounts": _counter_dict(root_counts),
                "failureRowCount": len(scenario_rows),
                "expressionFunctionDisagreementCount": expression_function_disagreement_count,
                "seedCount": len({row.get("seed") for row in scenario_rows}),
                "actionCount": len({row.get("actionName") for row in scenario_rows}),
                "blockedSeedActionPairs": [
                    {
                        "sessionReplayId": row["sessionReplayId"],
                        "seed": row["seed"],
                        "actionName": row["actionName"],
                        "primaryRootCauseClass": row["primaryRootCauseClass"],
                        "measurementInvalidBeforeAction": row["measurementInvalidBeforeAction"],
                    }
                    for row in predicate_rows
                    if row["measurementInvalidBeforeAction"]
                ],
                "repairedScenarioContract": source,
                "nextEmpiricalGate": {
                    "predicateFailureCountMustBe": 0,
                    "minimumWindowFailureCountMustBe": 0,
                    "measurementInvalidCountMustBe": 0,
                    "negativeControlFailedCountMustBe": 0,
                    "directionMismatchCountMustBe": 0,
                    "newTrainingEpisodesMustBe": 0,
                    "holdoutEpisodesMustBe": 0,
                },
            }
        )
    return repairs


def _source_contracts_ready(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    required = [item for item in source_artifacts if item.get("sourceKey") != "repairScript"]
    return all(item.get("fresh") is True for item in required)


def _claim_flags(next_phase_allowed: bool) -> dict[str, bool]:
    return {
        "phase93S2R2_3Allowed": next_phase_allowed,
        "phase93S2_4Allowed": False,
        "bt93tClaimable": False,
        "bt93uClaimable": False,
        "bt93wClaimable": False,
        "bt93oClaimable": False,
        "bt93pClaimable": False,
        "bt94aClaimable": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutAllowed": False,
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
        "newEvalRunStarted": False,
        "holdoutUsed": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "qualityClaimAllowed": False,
    }


def _phase_coverage(
    repairs: list[Mapping[str, Any]],
    validation_rows: list[Mapping[str, Any]],
    source_contracts_ready: bool,
) -> dict[str, bool]:
    red_scenarios = {str(repair.get("scenarioId")) for repair in repairs}
    retained_fail_scenarios = {
        "frontal-near-wall",
        "narrowing-corridor",
        "trail-ahead",
        "trail-side",
        "side-wall-left",
        "side-wall-right",
    }
    return {
        "93S2R2.2.1": bool(
            validation_rows
            and all(_as_mapping(row.get("predicateValidation")).get("expression") for row in validation_rows)
            and all("functionPass" in _as_mapping(row.get("predicateValidation")) for row in validation_rows)
        ),
        "93S2R2.2.2": bool(
            repairs
            and all(_as_mapping(repair.get("nextEmpiricalGate")).get("predicateFailureCountMustBe") == 0 for repair in repairs)
            and all(_as_mapping(repair.get("nextEmpiricalGate")).get("minimumWindowFailureCountMustBe") == 0 for repair in repairs)
        ),
        "93S2R2.2.3": bool(
            source_contracts_ready
            and red_scenarios >= retained_fail_scenarios
            and all(
                _as_mapping(_as_mapping(repair.get("repairedScenarioContract")).get("s2r2Repair")).get(
                    "actionSuccessEvidenceAllowedBeforeEmpiricalGate"
                )
                is False
                for repair in repairs
            )
        ),
    }


def build_report() -> dict[str, Any]:
    taxonomy = _read_json(FAILURE_TAXONOMY_PATH)
    recheck = _read_json(RECHECK_REPORT_PATH)
    matrix_v3 = _read_json(MATRIX_V3_CONTRACT_PATH)
    failure_rows = _failure_rows(taxonomy)
    scenarios = {
        str(scenario.get("id")): scenario
        for scenario in _as_list(matrix_v3.get("scenarios"))
        if isinstance(scenario, Mapping) and scenario.get("id")
    }
    source_artifacts = _source_artifacts()
    sources_ready = _source_contracts_ready(source_artifacts)
    repairs = _scenario_repairs(failure_rows, scenarios)
    validation_rows = [
        {
            "scenarioId": row.get("scenarioId"),
            "seed": row.get("seed"),
            "actionName": row.get("actionName"),
            "primaryRootCauseClass": row.get("primaryRootCauseClass"),
            "predicateValidation": _predicate_validation(row),
        }
        for row in failure_rows
    ]
    root_counts = Counter(str(row.get("primaryRootCauseClass")) for row in failure_rows)
    scenario_counts = Counter(str(row.get("scenarioId")) for row in failure_rows)
    action_counts = Counter(str(row.get("actionName")) for row in failure_rows)
    expression_function_disagreement_count = sum(
        1
        for row in validation_rows
        if _as_mapping(row.get("predicateValidation")).get("expressionFunctionAgree") is not True
        or _as_mapping(row.get("predicateValidation")).get("sourceFunctionAgree") is not True
    )
    expression_eval_error_count = sum(
        1 for row in validation_rows if _as_mapping(row.get("predicateValidation")).get("expressionError")
    )
    phase_coverage = _phase_coverage(repairs, validation_rows, sources_ready)
    guardrails = _guardrails()
    guardrails_ok = bool(
        guardrails["diagnosticOnly"]
        and not guardrails["trainingStarted"]
        and not guardrails["holdoutUsed"]
        and not guardrails["actionSurfaceChanged"]
        and not guardrails["productiveRuntimeChanged"]
    )
    contract_blocking_counts = {
        "expressionFunctionDisagreementCount": expression_function_disagreement_count,
        "expressionEvalErrorCount": expression_eval_error_count,
        "missingSourceScenarioCount": sum(
            1 for repair in repairs if not _as_mapping(repair.get("repairedScenarioContract")).get("id")
        ),
    }
    next_phase_allowed = bool(
        sources_ready
        and all(phase_coverage.values())
        and guardrails_ok
        and all(value == 0 for value in contract_blocking_counts.values())
    )
    result_class = RESULT_GREEN if next_phase_allowed else RESULT_INVALID
    sample_counts = _as_mapping(recheck.get("sampleCounts"))
    repair_contract = {
        "repairContractId": REPAIR_CONTRACT_ID,
        "sourceMatrixId": matrix_v3.get("matrixId"),
        "sourceContractId": matrix_v3.get("contractId"),
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "actionSurfaceId": recheck.get("actionSurfaceId") or ACTION_SURFACE_ID,
        "decoderHash": recheck.get("decoderHash") or _sha256_file(ACTION_SURFACE_PATH),
        "predicateTruthPolicy": {
            "expressionFunctionAgreementRequired": True,
            "sourcePredicatePassMustMatchRecomputedFunction": True,
            "startMetricsMustSatisfyPredicateBeforeAction": True,
            "everyDisagreementCountsAsMeasurementInvalid": True,
        },
        "sessionReplayPolicy": {
            "sessionReplayIdRequired": True,
            "sessionIdentityFields": [
                "matrixId",
                "scenarioId",
                "seed",
                "actionName",
                "warmupAction",
                "warmupSteps",
                "startMetricsHash",
            ],
            "warmupTerminalBeforeActionBlocksPositiveEvidence": True,
            "seedActionPairsAreNotReusableAcrossScenarioIds": True,
        },
        "minimumWindowPolicy": {
            "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
            "effectWindowSteps": EFFECT_WINDOW_STEPS,
            "earlyTerminalBeforeMinimumWindowIsMeasurementInvalid": True,
        },
        "controlPolicy": {
            "escapeLeftNegativeControlFirst": True,
            "escapeRightActionSpaceJudgementDeferredUntilFairWindow": True,
            "retainedV2FailuresMustBeRevalidated": True,
            "neutralControlCannotProduceActionGreen": True,
            "wrongDirectionSuccessInvalidatesMeasurement": True,
        },
        "scenarioRepairs": repairs,
    }
    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2r2-predicate-window-repair-contract-v1",
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
        "ok": next_phase_allowed,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "repairContractId": REPAIR_CONTRACT_ID,
        "actionSurfaceId": recheck.get("actionSurfaceId") or ACTION_SURFACE_ID,
        "decoderHash": recheck.get("decoderHash") or _sha256_file(ACTION_SURFACE_PATH),
        "sourceRecheckResultClass": recheck.get("resultClass"),
        "sourceRecheckOk": recheck.get("ok"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": sources_ready,
        "sourceFilesVersioned": all(
            item.get("tracked") is True for item in source_artifacts if item.get("sourceKey") != "repairScript"
        ),
        "phaseCoverage": phase_coverage,
        "contractBlockingCounts": contract_blocking_counts,
        "rootCauseCounts": _counter_dict(root_counts),
        "failureCountsByScenario": _counter_dict(scenario_counts),
        "failureCountsByAction": _counter_dict(action_counts),
        "failureCountsByScenarioAndRootCause": _nested_counter(failure_rows, "scenarioId", "primaryRootCauseClass"),
        "redScenarioIds": _red_scenario_ids(failure_rows),
        "predicateValidationRows": validation_rows,
        "repairContract": repair_contract,
        "sampleCounts": {
            "sourceProbeCount": sample_counts.get("probeCount"),
            "sourceScenarioCount": sample_counts.get("scenarioCount"),
            "sourceActionCount": sample_counts.get("actionCount"),
            "sourcePredicateFailureCount": sample_counts.get("predicateFailureCount"),
            "sourceMinimumWindowFailureCount": sample_counts.get("minimumWindowFailureCount"),
            "taxonomyFailureRowCount": len(failure_rows),
            "repairedScenarioCount": len(repairs),
            "predicateValidationRowCount": len(validation_rows),
            "expressionFunctionDisagreementCount": expression_function_disagreement_count,
            "expressionEvalErrorCount": expression_eval_error_count,
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
        },
        "claimFlags": _claim_flags(next_phase_allowed),
        "guardrails": guardrails,
        "allowNext": ["93S2R2.3 Empirical-Reentry Gate"] if next_phase_allowed else [],
        "opensNext": ["93S2R2.3 Empirical-Reentry Gate"] if next_phase_allowed else [],
        "blocksNext": list(BLOCKED_NEXT),
        "nextAllowedActions": [
            "Run 93S2R2.3 empirical reentry gate against predicate_window_repair_contract.json; do not start 93S2.4."
        ]
        if next_phase_allowed
        else [
            "Stop: predicate/window repair contract is measurement-invalid; repair the listed contract blockers before an empirical gate."
        ],
        "invalidations": [
            {
                "scope": "direct 93S2.4 continuation",
                "reason": "BT93S2R2.2 writes only a repair contract; a fresh empirical reentry gate and then a new S2.3-Recheck are still required.",
            },
            {
                "scope": "action-surface/reward/telemetry/training",
                "reason": "No ActionSurface, reward, telemetry, runtime, holdout or PPO-training surface was changed or evaluated.",
            },
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r2_predicate_window_repair.py --write-report",
            "next": "python python/scripts/bt93s2r2_empirical_reentry_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "head": _git_output(["git", "rev-parse", "HEAD"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def _markdown(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    root_counts = _as_mapping(report.get("rootCauseCounts"))
    scenario_counts = _as_mapping(report.get("failureCountsByScenario"))
    phase = _as_mapping(report.get("phaseCoverage"))
    blockers = _as_mapping(report.get("contractBlockingCounts"))
    source_artifacts = _as_list(report.get("sourceArtifacts"))
    source_rows = "\n".join(
        f"- `{source.get('path')}`: role=`{source.get('role')}`, resultClass=`{source.get('resultClass')}`, "
        f"ok=`{source.get('ok')}`, sha256=`{source.get('sha256')}`"
        for source in source_artifacts
        if isinstance(source, Mapping)
    )
    root_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in root_counts.items())
    scenario_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in scenario_counts.items())
    phase_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in phase.items())
    blocker_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in blockers.items())
    return f"""# Fehlerbericht: BT93S2R2 Predicate-/Window-Reentry

## Aufgabe/Kontext

- Task: `BT93S2R2.2` nach rotem `BT93S2.3-Recheck`
- Ziel: Predicate-Ausdruck, Predicate-Funktion, StartMetrics, Warmup, Seeds, Session-ID und Minimum-Window gegen echte Recheck-StartMetrics abgleichen.
- Datum: 2026-05-01

## Quellen-Lock

{source_rows}

Git-SHA: `{_as_mapping(report.get('git')).get('head')}`
MatrixId: `{report.get('matrixId')}`
ContractId: `{report.get('contractId')}`
RepairContractId: `{report.get('repairContractId')}`
ActionSurfaceId: `{report.get('actionSurfaceId')}`
Decoder-Hash: `{report.get('decoderHash')}`

## Roter Ausgangsbefund

- Source-Result: `resultClass={report.get('sourceRecheckResultClass')}`, `ok={report.get('sourceRecheckOk')}`
- ProbeCount: `{counts.get('sourceProbeCount')}`
- Predicate-Fails: `{counts.get('sourcePredicateFailureCount')}`
- Minimum-Window-Fails: `{counts.get('sourceMinimumWindowFailureCount')}`
- Taxonomy-Failure-Rows: `{counts.get('taxonomyFailureRowCount')}`

## Root-Cause-Verteilung

{root_rows}

## Szenario-Verteilung

{scenario_rows}

## Predicate-/Window-Repair

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- RepairContract: `{report.get('repairContractId')}`
- Expression/Function-Disagreements: `{counts.get('expressionFunctionDisagreementCount')}`
- Expression-Eval-Errors: `{counts.get('expressionEvalErrorCount')}`
- Repaired Scenarios: `{counts.get('repairedScenarioCount')}`
- ActionSurface-/Reward-/Telemetry-/Runtime-/Training-Aenderungen: `0`

Phase-Coverage:

{phase_rows}

Contract-Blocker:

{blocker_rows}

## Bewertung

`BT93S2R2.2` schreibt nur einen Predicate-/Window-/Control-Repair-Vertrag. Der
rote Recheck-Status bleibt blockierend, bis `93S2R2.3` echte Env-Proben mit
Null-Counts schreibt und danach ein neuer `BT93S2.3-Recheck` `measurementValid=true`
belegt. `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote,
Rollout, PPO-Validate und BT95 bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/predicate_window_repair_contract.json`
- Command: `python python/scripts/bt93s2r2_predicate_window_repair.py --write-report`

## Naechster Schritt

`93S2R2.3` muss den Repair-Vertrag gegen echte Env-Proben validieren und
`predicateFailureCount=0`, `minimumWindowFailureCount=0`,
`measurementInvalidCount=0`, `negativeControlFailedCount=0` und
`directionMismatchCount=0` schreiben. Kein `93S2.4` vor dem spaeteren frischen
S2.3-Recheck.
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
                "phaseCoverage": report["phaseCoverage"],
                "contractBlockingCounts": report["contractBlockingCounts"],
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
