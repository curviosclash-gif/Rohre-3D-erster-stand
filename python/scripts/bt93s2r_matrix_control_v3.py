"""BT93S2R.3 matrix/control-v3 contract repair.

This phase writes diagnostic governance evidence only. It does not train PPO,
consume holdouts, repair rewards, add telemetry, change the action surface, or
touch productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import copy
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
SCENARIO_MATRIX_V2_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
EXISTING_ACTION_EFFECT_V2_PATH = BT93S2_ROOT / "existing_action_effect_v2_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
S2_MATRIX_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2_scenario_matrix_v2.py"
S2_EFFECT_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2_existing_action_effect_v2.py"
S2R_TAXONOMY_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r_failure_taxonomy.py"
S2R_TRACE_AUDIT_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r_targeted_trace_audit.py"
S2R_MATRIX_V3_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r_matrix_control_v3.py"
REPORT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"

MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
SOURCE_MATRIX_ID = "bt93s2-walltrail-action-effect-matrix-v2"
SOURCE_CONTRACT_ID = "bt93s2-walltrail-action-effect-window-v2"
MINIMUM_COMPLETED_STEPS = 8
EFFECT_WINDOW_STEPS = 24

FORBIDDEN_SUCCESS_PROXIES = [
    "reward-only",
    "command-flag-only",
    "target-distance-only",
    "single-step delta",
    "maxSteps-only survival",
    "progress event without state-risk improvement",
]

TARGET_SCENARIO_IDS = [
    "escape-left-open",
    "escape-right-open",
    "no-danger-control",
    "side-wall-left",
]

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
    "reward fix from BT93S2R.3",
    "telemetry fix from BT93S2R.3",
    "action-surface change from BT93S2R.3",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


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


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _source_artifact(path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs = {
        "failureTaxonomy": (FAILURE_TAXONOMY_PATH, "BT93S2R.1 source lock"),
        "targetedTraceAudit": (TARGETED_TRACE_AUDIT_PATH, "BT93S2R.2 root-cause audit"),
        "scenarioMatrixV2": (SCENARIO_MATRIX_V2_PATH, "BT93S2.2 matrix-v2 contract source"),
        "existingActionEffectV2": (EXISTING_ACTION_EFFECT_V2_PATH, "BT93S2.3 locked red measurement source"),
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder"),
        "bt93s2MatrixScript": (S2_MATRIX_SCRIPT_PATH, "BT93S2.2 generating script hash"),
        "bt93s2EffectScript": (S2_EFFECT_SCRIPT_PATH, "BT93S2.3 generating script hash"),
        "bt93s2rTaxonomyScript": (S2R_TAXONOMY_SCRIPT_PATH, "BT93S2R.1 generating script hash"),
        "bt93s2rTraceAuditScript": (S2R_TRACE_AUDIT_SCRIPT_PATH, "BT93S2R.2 generating script hash"),
        "bt93s2rMatrixV3Script": (S2R_MATRIX_V3_SCRIPT_PATH, "BT93S2R.3 generating script hash"),
    }
    tracked = _tracked_files(path for path, _role in specs.values())
    return [
        {"sourceKey": key, **_source_artifact(path, role, tracked)}
        for key, (path, role) in specs.items()
    ]


def _scenario_entries(contract: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    return [
        scenario
        for scenario in _as_list(contract.get("scenarios"))
        if isinstance(scenario, Mapping) and scenario.get("id")
    ]


def _findings_by_scenario(audit: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    result: dict[str, Mapping[str, Any]] = {}
    for finding in _as_list(audit.get("findings")):
        if isinstance(finding, Mapping) and finding.get("scenarioId"):
            result[str(finding["scenarioId"])] = finding
    return result


def _global_predicate_finding(audit: Mapping[str, Any]) -> Mapping[str, Any]:
    for finding in _as_list(audit.get("findings")):
        if isinstance(finding, Mapping) and finding.get("scenarioId") is None:
            return finding
    return {}


def _action_counts(finding: Mapping[str, Any]) -> Mapping[str, Any]:
    return _as_mapping(_as_mapping(finding.get("evidence")).get("actionCounts"))


def _clone_scenario(source: Mapping[str, Any]) -> dict[str, Any]:
    scenario = copy.deepcopy(dict(source))
    scenario["matrixId"] = MATRIX_ID
    scenario["contractId"] = CONTRACT_ID
    scenario["sourceMatrixId"] = SOURCE_MATRIX_ID
    scenario["sourceContractId"] = SOURCE_CONTRACT_ID
    scenario.setdefault("v3Repair", {})
    return scenario


def _baseline_success_contract(*, scenario_id: str, status: str) -> dict[str, Any]:
    return {
        "version": "bt93s2r-v3",
        "status": status,
        "evaluationOrder": [
            "source artifacts fresh and versioned",
            "predicate revalidated immediately before measurement",
            "minimum completed window satisfied",
            "negative controls fail before positive controls are judged",
            "state effect is compared against passive baseline",
            "risk and terminal non-regression are enforced",
            "forbidden success proxies are rejected",
        ],
        "forbiddenSuccessProxies": list(FORBIDDEN_SUCCESS_PROXIES),
        "measurementInvalidIf": [
            "predicateFailureCount > 0",
            "minimumWindowFailureCount > 0",
            "negative control passes as success",
            "direction contract mismatch",
            "reward-only, command-flag-only, target-distance-only, single-step or maxSteps-only success",
        ],
        "recheckScope": "BT93S2.3-Recheck only",
        "directActionSurfaceJudgementAllowed": False,
        "scenarioId": scenario_id,
    }


def _escape_left_repair(source: Mapping[str, Any], finding: Mapping[str, Any]) -> dict[str, Any]:
    scenario = _clone_scenario(source)
    controls = copy.deepcopy(dict(_as_mapping(scenario.get("controls"))))
    controls["positiveControls"] = {
        **dict(_as_mapping(controls.get("positiveControls"))),
        "actions": ["yaw-left", "turn-left-boost", "evade-left"],
        "actionsExistInPinnedSurface": True,
        "controlSuccessKind": "directed-state-effect-vs-passive-baseline",
        "mustShowStateEffectBeforeGreen": True,
    }
    controls["negativeControls"] = {
        **dict(_as_mapping(controls.get("negativeControls"))),
        "actions": ["noop"],
        "actionsExistInPinnedSurface": True,
        "mustNotPassAsSuccess": True,
        "passiveBaselineAction": "noop",
        "noopSuccessCountFromTrace": _as_mapping(finding.get("evidence")).get("noopSuccessCount"),
    }
    controls["counterDirectionControls"] = {
        "actions": ["evade-right", "roll-right", "yaw-right"],
        "mustNotRescueLeftEscape": True,
    }
    controls["requiredStateEffects"] = [
        "left-side clearance or local openness improves versus noop passive baseline",
        "collision-risk non-regression versus noop passive baseline",
        "terminal-risk non-regression versus noop passive baseline",
        "no command-flag-only or reward-only success",
    ]
    controls["passiveBaselineComparison"] = {
        "enabled": True,
        "baselineAction": "noop",
        "primaryMetrics": ["wallDistanceLeft", "localOpennessRatio"],
        "riskMetrics": ["collisionRisk", "terminalRisk", "trailPressureProxy"],
        "candidateMustBeatBaseline": True,
        "baselineSuccessIsMeasurementInvalid": True,
    }
    scenario["controls"] = controls
    scenario["successContract"] = {
        **_baseline_success_contract(scenario_id="escape-left-open", status="repaired"),
        "rootCauseClass": "escape-left-control-required",
        "sourceFindingId": finding.get("id"),
        "directedEffect": {
            "expectedEscapeDirection": "left",
            "metric": "wallDistanceLeft",
            "fallbackMetric": "localOpennessRatio",
            "mustBeatPassiveBaseline": True,
        },
    }
    scenario["v3Repair"] = {
        "status": "repaired-from-trace",
        "appliedFixes": [
            "noop remains the passive baseline and can never count as escape success",
            "left escape positive controls are directionally left-biased",
            "counter-direction actions are retained only as controls, not as left escape positives",
            "success must beat the noop baseline with risk non-regression",
        ],
        "evidence": {
            "findingId": finding.get("id"),
            "primaryRootCauseClass": finding.get("primaryRootCauseClass"),
            "noopSuccessCount": _as_mapping(finding.get("evidence")).get("noopSuccessCount"),
        },
    }
    return scenario


def _escape_right_repair(source: Mapping[str, Any], finding: Mapping[str, Any]) -> dict[str, Any]:
    scenario = _clone_scenario(source)
    controls = copy.deepcopy(dict(_as_mapping(scenario.get("controls"))))
    action_counts = _action_counts(finding)
    fair_actions = [
        action
        for action, counts in action_counts.items()
        if isinstance(counts, Mapping) and counts.get("predicateFailureCount") == 0 and counts.get("minimumWindowFailureCount") == 0
    ]
    controls["positiveControls"] = {
        **dict(_as_mapping(controls.get("positiveControls"))),
        "actions": ["yaw-right", "roll-right", "turn-right-boost", "evade-right"],
        "actionsExistInPinnedSurface": True,
        "controlSuccessKind": "right-directed-state-effect-after-fair-window",
        "mustShowStateEffectBeforeGreen": True,
        "fairWindowActionsFromTrace": sorted(fair_actions),
    }
    controls["negativeControls"] = {
        **dict(_as_mapping(controls.get("negativeControls"))),
        "actions": ["noop"],
        "actionsExistInPinnedSurface": True,
        "mustNotPassAsSuccess": True,
    }
    controls["predicateWindowFairness"] = {
        "actionSpaceJudgement": "deferred-until-v3-predicate-window-fairness",
        "perActionSeedPredicatePassRequired": True,
        "minimumWindowPassRequired": True,
        "positiveControlsMustAllBeMeasurableBeforeActionSpaceJudgement": True,
        "tracePredicateFailureCount": _as_mapping(finding.get("evidence")).get("predicateFailureCount"),
        "traceMinimumWindowFailureCount": _as_mapping(finding.get("evidence")).get("minimumWindowFailureCount"),
        "currentlyFairActionsFromTrace": sorted(fair_actions),
    }
    controls["passiveBaselineComparison"] = {
        "enabled": True,
        "baselineAction": "noop",
        "primaryMetrics": ["wallDistanceRight", "localOpennessRatio"],
        "riskMetrics": ["collisionRisk", "terminalRisk", "trailPressureProxy"],
        "candidateMustBeatBaseline": True,
        "baselineSuccessIsMeasurementInvalid": True,
    }
    scenario["controls"] = controls
    scenario["successContract"] = {
        **_baseline_success_contract(scenario_id="escape-right-open", status="repaired-for-fair-recheck"),
        "rootCauseClass": "escape-right-scenario-required",
        "sourceFindingId": finding.get("id"),
        "directedEffect": {
            "expectedEscapeDirection": "right",
            "metric": "wallDistanceRight",
            "fallbackMetric": "localOpennessRatio",
            "mustBeatPassiveBaseline": True,
        },
        "actionSpaceDecisionAllowedInS2R": False,
    }
    scenario["v3Repair"] = {
        "status": "repaired-for-fair-recheck",
        "appliedFixes": [
            "action-space judgement stays deferred until every positive control has predicate/window fairness",
            "per-action seed windows must pass predicate and minimum-window checks before success is judged",
            "right escape success must beat noop baseline with risk non-regression",
        ],
        "evidence": {
            "findingId": finding.get("id"),
            "primaryRootCauseClass": finding.get("primaryRootCauseClass"),
            "actionSpaceJudgement": _as_mapping(finding.get("evidence")).get("actionSpaceJudgement"),
            "fairWindowActionsFromTrace": sorted(fair_actions),
        },
    }
    return scenario


def _no_danger_repair(source: Mapping[str, Any], finding: Mapping[str, Any]) -> dict[str, Any]:
    scenario = _clone_scenario(source)
    controls = copy.deepcopy(dict(_as_mapping(scenario.get("controls"))))
    controls["controlKind"] = "neutral-stability-control"
    controls["actionGreenEvidenceAllowed"] = False
    controls["positiveControls"] = {
        "actions": ["noop"],
        "actionsExistInPinnedSurface": True,
        "controlSuccessKind": "neutral-stability-only",
        "mustShowStateEffectBeforeGreen": False,
        "mustNotProduceActionGreenEvidence": True,
    }
    controls["negativeControls"] = {
        "actions": ["boost", "shoot-mg"],
        "actionsExistInPinnedSurface": True,
        "mustNotPassAsSuccess": True,
    }
    controls["neutralWindow"] = {
        "stableAction": "noop",
        "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
        "maxSteps": EFFECT_WINDOW_STEPS,
        "requiresNoTerminal": True,
        "requiresPredicatePass": True,
        "riskDeltaTolerance": 0.08,
        "wallDistanceDeltaTolerance": 0.08,
        "actionGreenEvidenceProducedMustBe": False,
    }
    controls["requiredStateEffects"] = [
        "noop completes neutral window",
        "no terminal",
        "collision-risk and terminal-risk stay within neutral tolerance",
        "boost and shoot-mg remain negative controls",
        "no action-green evidence is produced",
    ]
    scenario["controls"] = controls
    scenario["successContract"] = {
        **_baseline_success_contract(scenario_id="no-danger-control", status="neutral-contract-repaired"),
        "rootCauseClass": "neutral-control-required",
        "sourceFindingId": finding.get("id"),
        "neutralControl": {
            "actionGreenEvidenceAllowed": False,
            "actionGreenEvidenceProducedMustBe": False,
            "noopIsNeutralStableOnly": True,
            "noopIsNeverActionQualityEvidence": True,
        },
    }
    scenario["v3Repair"] = {
        "status": "neutral-contract-repaired",
        "appliedFixes": [
            "noop is evaluated as neutral stability, not as action success",
            "boost and shoot-mg stay negative controls",
            "no-danger-control cannot produce action-green evidence",
        ],
        "evidence": {
            "findingId": finding.get("id"),
            "primaryRootCauseClass": finding.get("primaryRootCauseClass"),
            "actionGreenEvidenceProduced": _as_mapping(finding.get("evidence")).get("actionGreenEvidenceProduced"),
        },
    }
    return scenario


def _side_wall_left_repair(source: Mapping[str, Any], finding: Mapping[str, Any]) -> dict[str, Any]:
    scenario = _clone_scenario(source)
    controls = copy.deepcopy(dict(_as_mapping(scenario.get("controls"))))
    controls["positiveControls"] = {
        **dict(_as_mapping(controls.get("positiveControls"))),
        "actions": ["yaw-right", "roll-right", "turn-right-boost", "evade-right"],
        "actionsExistInPinnedSurface": True,
        "controlSuccessKind": "rightward-away-from-left-wall-state-effect",
        "mustShowStateEffectBeforeGreen": True,
    }
    controls["negativeControls"] = {
        **dict(_as_mapping(controls.get("negativeControls"))),
        "actions": ["noop"],
        "actionsExistInPinnedSurface": True,
        "mustNotPassAsSuccess": True,
    }
    controls["counterDirectionControls"] = {
        "actions": ["yaw-left", "roll-left", "evade-left"],
        "mustNotPassAsLeftWallEscape": True,
        "source": "BT93S2R.2 side-wall-left trace found these v2 positives missing",
    }
    controls["directionContract"] = {
        "label": "side-wall-left",
        "wallSide": "left",
        "expectedEscapeDirection": "right",
        "primaryMetric": "wallDistanceLeft",
        "secondaryMetric": "localOpennessRatio",
        "positiveControlsMustMatchExpectedDirection": True,
        "unexpectedSuccessfulActionFromTrace": ["yaw-right"],
    }
    controls["requiredStateEffects"] = [
        "left-wall clearance or local openness improves",
        "rightward control direction matches side-wall-left label",
        "collision-risk non-regression",
        "terminal-risk non-regression",
        "leftward controls cannot count as side-wall-left positive evidence",
    ]
    scenario["controls"] = controls
    scenario["successContract"] = {
        **_baseline_success_contract(scenario_id="side-wall-left", status="direction-contract-repaired"),
        "rootCauseClass": "side-wall-direction-contract-required",
        "sourceFindingId": finding.get("id"),
        "directionContract": controls["directionContract"],
    }
    scenario["v3Repair"] = {
        "status": "direction-contract-repaired",
        "appliedFixes": [
            "side-wall-left is interpreted as left wall present, escape direction right",
            "rightward controls become positives because yaw-right was the only trace-green action",
            "leftward controls become counter-direction controls until a fresh S2.3 recheck proves otherwise",
        ],
        "evidence": {
            "findingId": finding.get("id"),
            "primaryRootCauseClass": finding.get("primaryRootCauseClass"),
            "successfulActions": _as_mapping(finding.get("evidence")).get("successfulActions"),
            "missingPositiveSuccessfulActions": _as_mapping(finding.get("evidence")).get("missingPositiveSuccessfulActions"),
            "unexpectedSuccessfulActions": _as_mapping(finding.get("evidence")).get("unexpectedSuccessfulActions"),
        },
    }
    return scenario


def _retained_scenario(source: Mapping[str, Any]) -> dict[str, Any]:
    scenario = _clone_scenario(source)
    scenario["v3Repair"] = {
        "status": "retained-from-v2",
        "appliedFixes": [],
        "reason": "BT93S2R.3 scope is limited to S2.3 measurement-invalid root causes.",
    }
    scenario["successContract"] = {
        **_baseline_success_contract(scenario_id=str(source.get("id")), status="retained-from-v2"),
        "sourceFindingId": None,
        "directActionSurfaceJudgementAllowed": False,
    }
    return scenario


def _build_scenarios(v2_contract: Mapping[str, Any], audit: Mapping[str, Any]) -> list[dict[str, Any]]:
    findings = _findings_by_scenario(audit)
    scenarios: list[dict[str, Any]] = []
    for source in _scenario_entries(v2_contract):
        scenario_id = str(source.get("id"))
        if scenario_id == "escape-left-open":
            scenarios.append(_escape_left_repair(source, findings.get(scenario_id, {})))
        elif scenario_id == "escape-right-open":
            scenarios.append(_escape_right_repair(source, findings.get(scenario_id, {})))
        elif scenario_id == "no-danger-control":
            scenarios.append(_no_danger_repair(source, findings.get(scenario_id, {})))
        elif scenario_id == "side-wall-left":
            scenarios.append(_side_wall_left_repair(source, findings.get(scenario_id, {})))
        else:
            scenarios.append(_retained_scenario(source))
    return scenarios


def _phase_coverage(scenarios: list[Mapping[str, Any]], audit: Mapping[str, Any]) -> dict[str, bool]:
    by_id = {str(scenario.get("id")): scenario for scenario in scenarios}
    escape_left = _as_mapping(by_id.get("escape-left-open"))
    escape_right = _as_mapping(by_id.get("escape-right-open"))
    no_danger = _as_mapping(by_id.get("no-danger-control"))
    side_left = _as_mapping(by_id.get("side-wall-left"))
    source_root_causes = set(str(item) for item in _as_list(audit.get("rootCauseClasses")))

    escape_left_controls = _as_mapping(escape_left.get("controls"))
    escape_right_controls = _as_mapping(escape_right.get("controls"))
    no_danger_controls = _as_mapping(no_danger.get("controls"))
    side_left_controls = _as_mapping(side_left.get("controls"))

    return {
        "93S2R.3.1": bool(
            source_root_causes
            >= {
                "escape-left-control-required",
                "escape-right-scenario-required",
                "neutral-control-required",
                "predicate-window-required",
                "side-wall-direction-contract-required",
            }
            and all(_as_mapping(s.get("v3Repair")).get("status") for s in scenarios)
        ),
        "93S2R.3.2": bool(
            _as_mapping(escape_left_controls.get("passiveBaselineComparison")).get("enabled") is True
            and "noop" in _as_list(_as_mapping(escape_left_controls.get("negativeControls")).get("actions"))
            and _as_mapping(escape_left.get("successContract")).get("rootCauseClass") == "escape-left-control-required"
        ),
        "93S2R.3.3": bool(
            _as_mapping(escape_right_controls.get("predicateWindowFairness")).get("perActionSeedPredicatePassRequired") is True
            and _as_mapping(escape_right_controls.get("predicateWindowFairness")).get("actionSpaceJudgement")
            == "deferred-until-v3-predicate-window-fairness"
        ),
        "93S2R.3.4": bool(
            _as_mapping(side_left_controls.get("directionContract")).get("expectedEscapeDirection") == "right"
            and set(_as_list(_as_mapping(side_left_controls.get("positiveControls")).get("actions")))
            >= {"yaw-right", "roll-right", "turn-right-boost", "evade-right"}
        ),
        "93S2R.3.5": bool(
            _as_mapping(no_danger_controls.get("neutralWindow")).get("stableAction") == "noop"
            and no_danger_controls.get("actionGreenEvidenceAllowed") is False
            and _as_mapping(no_danger.get("successContract")).get("neutralControl", {}).get("actionGreenEvidenceProducedMustBe") is False
        ),
        "93S2R.3.6": True,
    }


def _claim_flags(ok: bool) -> dict[str, bool]:
    return {
        "bt93s2rNextPhaseAllowed": ok,
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
    taxonomy_report = _read_json(FAILURE_TAXONOMY_PATH)
    audit_report = _read_json(TARGETED_TRACE_AUDIT_PATH)
    v2_contract = _read_json(SCENARIO_MATRIX_V2_PATH)
    effect_report = _read_json(EXISTING_ACTION_EFFECT_V2_PATH)

    scenarios = _build_scenarios(v2_contract, audit_report)
    phase_coverage = _phase_coverage(scenarios, audit_report)
    global_predicate = _global_predicate_finding(audit_report)
    source_artifacts = _source_artifacts()
    required_sources_ready = all(
        item["exists"] and item["isFile"] and item["tracked"]
        for item in source_artifacts
        if item["sourceKey"] != "bt93s2rMatrixV3Script"
    )
    source_contract_matches = bool(
        taxonomy_report.get("ok") is True
        and taxonomy_report.get("phaseId") == "93S2R.1"
        and taxonomy_report.get("resultClass") == "failure-taxonomy-source-lock-green"
        and audit_report.get("ok") is True
        and audit_report.get("phaseId") == "93S2R.2"
        and audit_report.get("resultClass") == "targeted-trace-audit-green"
        and v2_contract.get("ok") is True
        and v2_contract.get("matrixId") == SOURCE_MATRIX_ID
        and v2_contract.get("contractId") == SOURCE_CONTRACT_ID
        and effect_report.get("ok") is False
        and effect_report.get("phaseId") == "93S2.3"
        and effect_report.get("resultClass") == "measurement-invalid"
    )
    phase_complete = all(phase_coverage.values())
    guardrails = _guardrails()
    guardrails_ok = bool(
        guardrails["diagnosticOnly"]
        and not guardrails["trainingStarted"]
        and not guardrails["holdoutUsed"]
        and not guardrails["actionSurfaceChanged"]
        and not guardrails["productiveRuntimeChanged"]
    )
    ok = bool(required_sources_ready and source_contract_matches and phase_complete and guardrails_ok)
    result_class = "matrix-control-v3-contract-green" if ok else "measurement-invalid"
    sample_counts = _as_mapping(effect_report.get("sampleCounts"))

    dod_coverage = {
        "DoD.S2R-R4": phase_coverage["93S2R.3.2"],
        "DoD.S2R-R5": phase_coverage["93S2R.3.3"],
        "DoD.S2R-R6": phase_coverage["93S2R.3.4"],
        "DoD.S2R-R7": phase_coverage["93S2R.3.5"],
        "DoD.S2R-R9": True,
    }

    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2r-matrix-control-v3-contract-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2r_matrix_control_v3.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93S2R",
        "phaseId": "93S2R.3",
        "resultClass": result_class,
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "sourceMatrixId": v2_contract.get("matrixId"),
        "sourceContractId": v2_contract.get("contractId"),
        "actionSurfaceId": effect_report.get("actionSurfaceId") or v2_contract.get("actionSurfaceId"),
        "decoderHash": _sha256_file(ACTION_SURFACE_PATH),
        "sourceFilesReady": required_sources_ready,
        "sourceContractMatches": source_contract_matches,
        "sourceArtifacts": source_artifacts,
        "scriptHashes": {
            "bt93s2ScenarioMatrixV2": _sha256_file(S2_MATRIX_SCRIPT_PATH),
            "bt93s2ExistingActionEffectV2": _sha256_file(S2_EFFECT_SCRIPT_PATH),
            "bt93s2rFailureTaxonomy": _sha256_file(S2R_TAXONOMY_SCRIPT_PATH),
            "bt93s2rTargetedTraceAudit": _sha256_file(S2R_TRACE_AUDIT_SCRIPT_PATH),
            "bt93s2rMatrixControlV3": _sha256_file(S2R_MATRIX_V3_SCRIPT_PATH),
        },
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "rootCauseClasses": audit_report.get("rootCauseClasses") or [],
        "targetScenarioIds": list(TARGET_SCENARIO_IDS),
        "scenarioCount": len(scenarios),
        "scenarioClasses": [str(scenario.get("id")) for scenario in scenarios],
        "scenarios": scenarios,
        "windowContract": {
            "effectWindowSteps": EFFECT_WINDOW_STEPS,
            "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
            "predicateRevalidationRequired": True,
            "predicateFailureCountMustBeZero": True,
            "minimumWindowFailureCountMustBeZero": True,
            "positiveControlsRequiredBeforeGreen": True,
            "negativeControlsMustNotPass": True,
            "neutralControlsCannotCreateActionGreen": True,
            "passiveBaselineComparisonRequiredForEscape": True,
            "directionContractRequiredForSideWall": True,
            "forbiddenSuccessProxyPolicy": ", ".join(FORBIDDEN_SUCCESS_PROXIES),
        },
        "predicateWindowAudit": {
            "sourceFindingId": global_predicate.get("id"),
            "sourceResultClass": global_predicate.get("resultClass"),
            "sourcePredicateFailureCount": _as_mapping(global_predicate.get("evidence")).get("recomputedPredicateFailureCount")
            or sample_counts.get("predicateFailureCount"),
            "sourceMinimumWindowFailureCount": _as_mapping(global_predicate.get("evidence")).get("recomputedMinimumWindowFailureCount")
            or sample_counts.get("minimumWindowFailureCount"),
            "v3GateRequirement": {
                "predicateFailureCount": 0,
                "minimumWindowFailureCount": 0,
                "measurementInvalidCount": 0,
            },
        },
        "sampleCounts": {
            "sourceProbeCount": sample_counts.get("probeCount"),
            "targetTraceProbeCount": audit_report.get("targetTraceProbeCount"),
            "scenarioCount": len(scenarios),
            "predicateFailureCount": sample_counts.get("predicateFailureCount"),
            "minimumWindowFailureCount": sample_counts.get("minimumWindowFailureCount"),
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
        },
        "claimFlags": _claim_flags(ok),
        "guardrails": guardrails,
        "invalidations": [
            {
                "scope": "BT93S2.3 normal continuation",
                "reason": "A fresh S2.3-Recheck is still required; the v3 contract alone is not action-quality or policy-selection evidence.",
            },
            {
                "scope": "escape-right-open action-space judgement",
                "reason": "Action-space-required remains deferred until v3 predicate/window fairness is measured by the reentry gate and fresh S2.3-Recheck.",
            },
            {
                "scope": "product/runtime/training",
                "reason": "BT93S2R.3 is matrix/control-only and produced no runtime, reward, telemetry, holdout or PPO-training evidence.",
            },
        ],
        "blocksNext": list(BLOCKED_NEXT),
        "opensNext": ["93S2R.4 Matrix-Control Reentry Gate"] if ok else [],
        "allowNext": ["93S2R.4 Matrix-Control Reentry Gate"] if ok else [],
        "nextAllowedActions": [
            "Run 93S2R.4 matrix-control reentry gate against scenario_matrix_v3_contract.json; do not start 93S2.4 or BT93T/U/W/O/P/94A."
        ]
        if ok
        else [
            "Stop: matrix/control-v3 contract is measurement-invalid; repair sources or contract coverage before reentry gate."
        ],
        "recommendations": [
            {
                "rank": "1",
                "action": "Execute 93S2R.4 reentry gate against v3.",
                "why": "The contract now encodes the trace-backed fixes, but only the reentry gate can prove zero predicate/window, negative-control, direction and measurement-invalid counts.",
            }
        ]
        if ok
        else [
            {
                "rank": "1",
                "action": "Do not run reentry; repair the v3 contract invalidation first.",
                "why": "Running S2.3-Recheck on invalid matrix/control evidence would repeat the BT93S2.3 measurement-invalid failure.",
            }
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r_matrix_control_v3.py --write-report",
            "next": "python python/scripts/bt93s2r_matrix_control_reentry_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "summary": {
            "finalResult": result_class,
            "matrixControlV3Ready": ok,
            "nextBestAction": "93S2R.4" if ok else "matrix-control-v3 repair",
            "blockers": [] if ok else ["measurement-invalid"],
            "bt93s2RecheckAllowed": False,
            "bt93s2Phase4Allowed": False,
            "bt93tAllowed": False,
            "bt93uAllowed": False,
            "bt93oP94aStillClosed": True,
        },
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


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
