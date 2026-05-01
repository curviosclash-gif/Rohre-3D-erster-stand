"""BT93S2R.4 matrix/control reentry gate.

This gate validates the repaired matrix/control-v3 contract. It does not run
PPO training, consume holdouts, change the action surface, repair rewards, add
telemetry, or open product/runtime signals.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"

FAILURE_TAXONOMY_PATH = BT93S2R_ROOT / "failure_taxonomy_report.json"
TARGETED_TRACE_AUDIT_PATH = BT93S2R_ROOT / "targeted_trace_audit_report.json"
MATRIX_V3_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
SCENARIO_MATRIX_V2_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
EXISTING_ACTION_EFFECT_V2_PATH = BT93S2_ROOT / "existing_action_effect_v2_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
S2R_REENTRY_GATE_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r_matrix_control_reentry_gate.py"
REPORT_PATH = BT93S2R_ROOT / "matrix_control_reentry_gate_report.json"

MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
SOURCE_MATRIX_ID = "bt93s2-walltrail-action-effect-matrix-v2"
SOURCE_CONTRACT_ID = "bt93s2-walltrail-action-effect-window-v2"
MINIMUM_COMPLETED_STEPS = 8
EFFECT_WINDOW_STEPS = 24

TARGET_SCENARIO_IDS = [
    "escape-left-open",
    "escape-right-open",
    "no-danger-control",
    "side-wall-left",
]

FORBIDDEN_SUCCESS_PROXIES = [
    "reward-only",
    "command-flag-only",
    "target-distance-only",
    "single-step delta",
    "maxSteps-only survival",
    "progress event without state-risk improvement",
]

GREEN_RESULT = "matrix-control-reentry-green"
BLOCKED_NEXT = [
    "93S2.4 start before BT93S2R.99=matrix-control-reentry-green plus fresh BT93S2.3-Recheck",
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
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S2R.4",
    "telemetry fix from BT93S2R.4",
    "action-surface change from BT93S2R.4",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
    "failureTaxonomy": (
        FAILURE_TAXONOMY_PATH,
        "BT93S2R.1 source lock",
        {"blockId": "BT93S2R", "phaseId": "93S2R.1", "resultClass": "failure-taxonomy-source-lock-green", "ok": True},
    ),
    "targetedTraceAudit": (
        TARGETED_TRACE_AUDIT_PATH,
        "BT93S2R.2 root-cause audit",
        {"blockId": "BT93S2R", "phaseId": "93S2R.2", "resultClass": "targeted-trace-audit-green", "ok": True},
    ),
    "matrixV3Contract": (
        MATRIX_V3_CONTRACT_PATH,
        "BT93S2R.3 repaired matrix/control-v3 contract",
        {"blockId": "BT93S2R", "phaseId": "93S2R.3", "resultClass": "matrix-control-v3-contract-green", "ok": True},
    ),
    "scenarioMatrixV2": (
        SCENARIO_MATRIX_V2_PATH,
        "BT93S2.2 matrix-v2 source truth",
        {"blockId": "BT93S2", "phaseId": "93S2.2", "matrixId": SOURCE_MATRIX_ID, "contractId": SOURCE_CONTRACT_ID, "ok": True},
    ),
    "existingActionEffectV2": (
        EXISTING_ACTION_EFFECT_V2_PATH,
        "BT93S2.3 red measurement source",
        {"blockId": "BT93S2", "phaseId": "93S2.3", "resultClass": "measurement-invalid", "ok": False},
    ),
    "actionSurface": (
        ACTION_SURFACE_PATH,
        "read-only PPO action-surface decoder",
        {},
    ),
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


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _expected_matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


def _source_artifact(path: Path, role: str, tracked: set[str], expected: Mapping[str, Any]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and tracked_ok and expected_ok),
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected in SOURCE_SPECS.values())
    return [
        {"sourceKey": key, **_source_artifact(path, role, tracked, expected)}
        for key, (path, role, expected) in SOURCE_SPECS.items()
    ]


def _scenario_by_id(contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    scenarios: dict[str, Mapping[str, Any]] = {}
    for scenario in _as_list(contract.get("scenarios")):
        if isinstance(scenario, Mapping) and scenario.get("id"):
            scenarios[str(scenario["id"])] = scenario
    return scenarios


def _action_direction(action: str) -> str | None:
    if action.endswith("-left") or action in {"yaw-left", "roll-left", "evade-left", "turn-left-boost"}:
        return "left"
    if action.endswith("-right") or action in {"yaw-right", "roll-right", "evade-right", "turn-right-boost"}:
        return "right"
    return None


def _all_actions_match(actions: Iterable[Any], expected_direction: str) -> bool:
    action_names = [str(action) for action in actions]
    return bool(action_names) and all(_action_direction(action) == expected_direction for action in action_names)


def _forbidden_proxy_ok(*containers: Mapping[str, Any]) -> bool:
    expected = set(FORBIDDEN_SUCCESS_PROXIES)
    for container in containers:
        actual = set(str(item) for item in _as_list(container.get("forbiddenSuccessProxies")))
        if not expected.issubset(actual):
            return False
    return True


def _window_ok(scenario: Mapping[str, Any]) -> bool:
    effect_window = _as_mapping(scenario.get("effectWindow"))
    controls_window = _as_mapping(_as_mapping(scenario.get("controls")).get("minimumWindow"))
    return bool(
        effect_window.get("minimumCompletedSteps") == MINIMUM_COMPLETED_STEPS
        and effect_window.get("maxSteps") == EFFECT_WINDOW_STEPS
        and controls_window.get("minimumCompletedSteps") == MINIMUM_COMPLETED_STEPS
        and controls_window.get("maxSteps") == EFFECT_WINDOW_STEPS
    )


def _predicate_ok(scenario: Mapping[str, Any]) -> bool:
    predicate = _as_mapping(scenario.get("predicate"))
    start_state = _as_mapping(scenario.get("startState"))
    return bool(
        predicate.get("revalidatedBeforeMeasurement") is True
        and predicate.get("expression")
        and start_state.get("revalidateBeforeMeasurement") is True
        and start_state.get("requiredPredicate")
    )


def _negative_controls_ok(scenario_id: str, scenario: Mapping[str, Any]) -> bool:
    controls = _as_mapping(scenario.get("controls"))
    negative = _as_mapping(controls.get("negativeControls"))
    actions = set(str(action) for action in _as_list(negative.get("actions")))
    expected = {"boost", "shoot-mg"} if scenario_id == "no-danger-control" else {"noop"}
    return bool(expected.issubset(actions) and negative.get("mustNotPassAsSuccess") is True)


def _direction_contract_ok(scenario_id: str, scenario: Mapping[str, Any]) -> bool:
    controls = _as_mapping(scenario.get("controls"))
    positive_controls = _as_mapping(controls.get("positiveControls"))
    success_contract = _as_mapping(scenario.get("successContract"))
    directed_effect = _as_mapping(success_contract.get("directedEffect"))
    direction_contract = _as_mapping(controls.get("directionContract") or success_contract.get("directionContract"))

    expected_direction = None
    if scenario_id == "escape-left-open":
        expected_direction = "left"
    elif scenario_id == "escape-right-open":
        expected_direction = "right"
    elif scenario_id == "side-wall-left":
        expected_direction = "right"

    if expected_direction is None:
        return True

    positive_ok = _all_actions_match(_as_list(positive_controls.get("actions")), expected_direction)
    if scenario_id.startswith("escape-"):
        return bool(
            positive_ok
            and directed_effect.get("expectedEscapeDirection") == expected_direction
            and directed_effect.get("mustBeatPassiveBaseline") is True
        )
    return bool(
        positive_ok
        and direction_contract.get("label") == "side-wall-left"
        and direction_contract.get("wallSide") == "left"
        and direction_contract.get("expectedEscapeDirection") == "right"
        and direction_contract.get("positiveControlsMustMatchExpectedDirection") is True
    )


def _neutral_control_ok(scenario: Mapping[str, Any]) -> bool:
    controls = _as_mapping(scenario.get("controls"))
    success_contract = _as_mapping(scenario.get("successContract"))
    neutral_window = _as_mapping(controls.get("neutralWindow"))
    neutral_contract = _as_mapping(success_contract.get("neutralControl"))
    repair_evidence = _as_mapping(_as_mapping(scenario.get("v3Repair")).get("evidence"))
    return bool(
        controls.get("controlKind") == "neutral-stability-control"
        and controls.get("actionGreenEvidenceAllowed") is False
        and neutral_window.get("stableAction") == "noop"
        and neutral_window.get("actionGreenEvidenceProducedMustBe") is False
        and neutral_contract.get("actionGreenEvidenceAllowed") is False
        and neutral_contract.get("actionGreenEvidenceProducedMustBe") is False
        and repair_evidence.get("actionGreenEvidenceProduced") is False
    )


def _escape_right_deferred_ok(scenario: Mapping[str, Any]) -> bool:
    controls = _as_mapping(scenario.get("controls"))
    fairness = _as_mapping(controls.get("predicateWindowFairness"))
    success_contract = _as_mapping(scenario.get("successContract"))
    return bool(
        fairness.get("actionSpaceJudgement") == "deferred-until-v3-predicate-window-fairness"
        and fairness.get("perActionSeedPredicatePassRequired") is True
        and fairness.get("minimumWindowPassRequired") is True
        and fairness.get("positiveControlsMustAllBeMeasurableBeforeActionSpaceJudgement") is True
        and success_contract.get("actionSpaceDecisionAllowedInS2R") is False
        and success_contract.get("directActionSurfaceJudgementAllowed") is False
    )


def _scenario_gate(scenario_id: str, scenario: Mapping[str, Any]) -> dict[str, Any]:
    controls = _as_mapping(scenario.get("controls"))
    success_contract = _as_mapping(scenario.get("successContract"))
    proxy_ok = _forbidden_proxy_ok(controls, success_contract)
    predicate_ok = _predicate_ok(scenario)
    minimum_window_ok = _window_ok(scenario)
    negative_ok = _negative_controls_ok(scenario_id, scenario)
    direction_ok = _direction_contract_ok(scenario_id, scenario)
    neutral_ok = True if scenario_id != "no-danger-control" else _neutral_control_ok(scenario)
    escape_right_deferred_ok = True if scenario_id != "escape-right-open" else _escape_right_deferred_ok(scenario)
    measurement_invalid_reasons: list[str] = []

    if scenario.get("matrixId") != MATRIX_ID:
        measurement_invalid_reasons.append("matrix-id-mismatch")
    if scenario.get("contractId") != CONTRACT_ID:
        measurement_invalid_reasons.append("contract-id-mismatch")
    if _as_mapping(scenario.get("validation")).get("ok") is not True:
        measurement_invalid_reasons.append("validation-not-ok")
    if success_contract.get("directActionSurfaceJudgementAllowed") is not False:
        measurement_invalid_reasons.append("direct-action-surface-judgement-not-blocked")
    if success_contract.get("recheckScope") != "BT93S2.3-Recheck only":
        measurement_invalid_reasons.append("recheck-scope-not-limited")
    if not proxy_ok:
        measurement_invalid_reasons.append("forbidden-success-proxy-policy-missing")
    if not escape_right_deferred_ok:
        measurement_invalid_reasons.append("escape-right-action-surface-decision-not-deferred")

    return {
        "scenarioId": scenario_id,
        "predicateOk": predicate_ok,
        "minimumWindowOk": minimum_window_ok,
        "negativeControlOk": negative_ok,
        "directionContractOk": direction_ok,
        "neutralControlOk": neutral_ok,
        "escapeRightDeferredForFreshRecheckOnly": escape_right_deferred_ok,
        "proxyHygieneOk": proxy_ok,
        "measurementInvalidReasons": measurement_invalid_reasons,
        "gateGreen": bool(
            predicate_ok
            and minimum_window_ok
            and negative_ok
            and direction_ok
            and neutral_ok
            and escape_right_deferred_ok
            and not measurement_invalid_reasons
        ),
    }


def _gate_evidence(contract: Mapping[str, Any]) -> dict[str, Any]:
    scenarios = _scenario_by_id(contract)
    scenario_gates: list[dict[str, Any]] = []
    missing_scenarios = [scenario_id for scenario_id in TARGET_SCENARIO_IDS if scenario_id not in scenarios]
    for scenario_id in TARGET_SCENARIO_IDS:
        scenario = scenarios.get(scenario_id)
        if scenario is None:
            scenario_gates.append(
                {
                    "scenarioId": scenario_id,
                    "predicateOk": False,
                    "minimumWindowOk": False,
                    "negativeControlOk": False,
                    "directionContractOk": False,
                    "neutralControlOk": False,
                    "escapeRightDeferredForFreshRecheckOnly": False,
                    "proxyHygieneOk": False,
                    "measurementInvalidReasons": ["target-scenario-missing"],
                    "gateGreen": False,
                }
            )
        else:
            scenario_gates.append(_scenario_gate(scenario_id, scenario))

    window_contract = _as_mapping(contract.get("windowContract"))
    window_contract_ok = bool(
        window_contract.get("predicateFailureCountMustBeZero") is True
        and window_contract.get("minimumWindowFailureCountMustBeZero") is True
        and window_contract.get("negativeControlsMustNotPass") is True
        and window_contract.get("neutralControlsCannotCreateActionGreen") is True
        and window_contract.get("passiveBaselineComparisonRequiredForEscape") is True
        and window_contract.get("directionContractRequiredForSideWall") is True
    )
    reentry_counts = {
        "predicateFailureCount": sum(1 for gate in scenario_gates if gate["predicateOk"] is not True),
        "minimumWindowFailureCount": sum(1 for gate in scenario_gates if gate["minimumWindowOk"] is not True),
        "measurementInvalidCount": sum(
            len(_as_list(gate.get("measurementInvalidReasons"))) for gate in scenario_gates
        )
        + (0 if window_contract_ok else 1)
        + len(missing_scenarios),
        "negativeControlFailedCount": sum(1 for gate in scenario_gates if gate["negativeControlOk"] is not True),
        "directionMismatchCount": sum(1 for gate in scenario_gates if gate["directionContractOk"] is not True),
        "neutralControlFailedCount": sum(1 for gate in scenario_gates if gate["neutralControlOk"] is not True),
        "proxyHygieneFailureCount": sum(1 for gate in scenario_gates if gate["proxyHygieneOk"] is not True),
        "escapeRightDirectSurfaceDecisionCount": sum(
            1 for gate in scenario_gates if gate["escapeRightDeferredForFreshRecheckOnly"] is not True
        ),
    }
    return {
        "targetScenarioIds": list(TARGET_SCENARIO_IDS),
        "scenarioGates": scenario_gates,
        "missingScenarios": missing_scenarios,
        "windowContractOk": window_contract_ok,
        "reentryCounts": reentry_counts,
        "zeroCountGateGreen": all(value == 0 for value in reentry_counts.values()),
    }


def _result_class(evidence: Mapping[str, Any], sources_ready: bool, contract_ready: bool) -> str:
    counts = _as_mapping(evidence.get("reentryCounts"))
    if not sources_ready or not contract_ready or counts.get("measurementInvalidCount") != 0:
        return "measurement-invalid"
    if counts.get("predicateFailureCount") != 0 or counts.get("minimumWindowFailureCount") != 0:
        return "predicate-window-required"
    if counts.get("negativeControlFailedCount") != 0:
        gates = _as_list(evidence.get("scenarioGates"))
        failed_escape_left = any(
            isinstance(gate, Mapping)
            and gate.get("scenarioId") == "escape-left-open"
            and gate.get("negativeControlOk") is not True
            for gate in gates
        )
        return "escape-left-control-required" if failed_escape_left else "neutral-control-required"
    if counts.get("directionMismatchCount") != 0:
        return "side-wall-direction-contract-required"
    if counts.get("neutralControlFailedCount") != 0:
        return "neutral-control-required"
    return GREEN_RESULT


def _claim_flags(green: bool, valid_gate: bool) -> dict[str, bool]:
    return {
        "bt93s2rClosureAllowed": valid_gate,
        "bt93s2RecheckReadyForClosure": green,
        "bt93s2RecheckAllowed": False,
        "bt93s2Phase4Allowed": False,
        "bt93tClaimAllowed": False,
        "bt93uClaimAllowed": False,
        "bt93vClaimAllowed": False,
        "bt93wClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93xFullClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "bt95HandoffAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "ppoValidateSignalAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
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


def build_report() -> dict[str, Any]:
    contract = _read_json(MATRIX_V3_CONTRACT_PATH)
    effect_report = _read_json(EXISTING_ACTION_EFFECT_V2_PATH)
    source_artifacts = _source_artifacts()
    sources_ready = all(item["fresh"] for item in source_artifacts)
    contract_ready = bool(
        contract.get("ok") is True
        and contract.get("phaseId") == "93S2R.3"
        and contract.get("resultClass") == "matrix-control-v3-contract-green"
        and contract.get("matrixId") == MATRIX_ID
        and contract.get("contractId") == CONTRACT_ID
    )
    gate_evidence = _gate_evidence(contract)
    result_class = _result_class(gate_evidence, sources_ready, contract_ready)
    green = result_class == GREEN_RESULT and gate_evidence["zeroCountGateGreen"]
    valid_gate = result_class != "measurement-invalid"
    guardrails = _guardrails()
    guardrails_ok = bool(
        guardrails["diagnosticOnly"]
        and not guardrails["trainingStarted"]
        and not guardrails["holdoutUsed"]
        and not guardrails["actionSurfaceChanged"]
        and not guardrails["productiveRuntimeChanged"]
    )
    if not guardrails_ok:
        result_class = "measurement-invalid"
        green = False
        valid_gate = False

    source_counts = _as_mapping(effect_report.get("sampleCounts"))
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r-matrix-control-reentry-gate-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2r_matrix_control_reentry_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": valid_gate,
        "gatePassed": green,
        "blockId": "BT93S2R",
        "phaseId": "93S2R.4",
        "resultClass": result_class,
        "matrixId": contract.get("matrixId"),
        "contractId": contract.get("contractId"),
        "actionSurfaceId": contract.get("actionSurfaceId"),
        "decoderHash": _sha256_file(ACTION_SURFACE_PATH),
        "sourceFilesReady": sources_ready,
        "sourceContractMatches": contract_ready,
        "sourceArtifacts": source_artifacts,
        "scriptHashes": {
            "bt93s2rMatrixControlReentryGate": _sha256_file(S2R_REENTRY_GATE_SCRIPT_PATH),
        },
        "historicalSourceCounts": {
            "sourceProbeCount": source_counts.get("probeCount"),
            "predicateFailureCount": source_counts.get("predicateFailureCount"),
            "minimumWindowFailureCount": source_counts.get("minimumWindowFailureCount"),
            "commandFlagWithoutStateEffectCount": source_counts.get("commandFlagWithoutStateEffectCount"),
            "rewardOnlyRejectedCount": source_counts.get("rewardOnlyRejectedCount"),
        },
        "reentryGate": gate_evidence,
        "sampleCounts": {
            "sourceProbeCount": source_counts.get("probeCount"),
            "targetTraceProbeCount": contract.get("sampleCounts", {}).get("targetTraceProbeCount")
            if isinstance(contract.get("sampleCounts"), Mapping)
            else None,
            "scenarioCount": len(_as_list(contract.get("scenarios"))),
            "gateScenarioCount": len(TARGET_SCENARIO_IDS),
            "predicateFailureCount": gate_evidence["reentryCounts"]["predicateFailureCount"],
            "minimumWindowFailureCount": gate_evidence["reentryCounts"]["minimumWindowFailureCount"],
            "measurementInvalidCount": gate_evidence["reentryCounts"]["measurementInvalidCount"],
            "negativeControlFailedCount": gate_evidence["reentryCounts"]["negativeControlFailedCount"],
            "directionMismatchCount": gate_evidence["reentryCounts"]["directionMismatchCount"],
            "neutralControlFailedCount": gate_evidence["reentryCounts"]["neutralControlFailedCount"],
            "proxyHygieneFailureCount": gate_evidence["reentryCounts"]["proxyHygieneFailureCount"],
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
        },
        "claimFlags": _claim_flags(green=green, valid_gate=valid_gate),
        "guardrails": guardrails,
        "invalidations": [
            {
                "scope": "BT93S2.3 normal continuation",
                "reason": "93S2.4 remains closed until 93S2R.99 closes green and a fresh BT93S2.3-Recheck is produced.",
            },
            {
                "scope": "escape-right-open action-surface judgement",
                "reason": "BT93S2R.4 may pass matrix/control fairness only; action-space judgement is deferred to the fresh S2.3-Recheck.",
            },
            {
                "scope": "product/runtime/training",
                "reason": "BT93S2R.4 is a matrix/control evidence gate and produced no runtime, reward, telemetry, holdout or PPO-training evidence.",
            },
        ],
        "blocksNext": list(BLOCKED_NEXT),
        "opensNext": ["93S2R.99 Closure"] if valid_gate else [],
        "allowNext": ["93S2R.99 Closure"] if valid_gate else [],
        "prospectiveOpensNextAfterClosure": ["BT93S2.3-Recheck"] if green else [],
        "nextAllowedActions": [
            "Run 93S2R.99 closure; only a green closure may open BT93S2.3-Recheck."
        ]
        if valid_gate
        else [
            "Stop: repair the matrix/control reentry invalidation before closure or downstream claims."
        ],
        "recommendations": [
            {
                "rank": "1",
                "action": "Run 93S2R.99 closure.",
                "why": "The repaired v3 contract satisfies zero predicate/window, measurement-invalid, negative-control and direction-mismatch counts at the reentry gate.",
            },
            {
                "rank": "2",
                "action": "Keep 93S2.4, BT93T/U/W/O/P/94A and all candidate/freeze/promote paths closed.",
                "why": "BT93S2R.4 proves only matrix/control reentry readiness; action-quality and policy-selection evidence still require a fresh S2.3-Recheck.",
            },
        ]
        if green
        else [
            {
                "rank": "1",
                "action": "Keep downstream claims closed and repair the reported reentry class.",
                "why": f"The reentry gate result is {result_class}, so BT93S2.3-Recheck is not ready.",
            }
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r_matrix_control_reentry_gate.py --write-report",
            "next": "python python/scripts/bt93s2r_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "summary": {
            "finalResult": result_class,
            "gatePassed": green,
            "nextBestAction": "93S2R.99" if valid_gate else result_class,
            "blockers": [] if green else [result_class],
            "bt93s2RecheckReadyForClosure": green,
            "bt93s2RecheckAllowed": False,
            "bt93s2Phase4Allowed": False,
            "bt93tAllowed": False,
            "bt93uAllowed": False,
            "bt93oP94aStillClosed": True,
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "gatePassed": report["gatePassed"],
                "resultClass": report["resultClass"],
                "report": _rel(REPORT_PATH) if args.write_report else None,
                "opensNext": report["opensNext"],
                "blockers": report["summary"]["blockers"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
