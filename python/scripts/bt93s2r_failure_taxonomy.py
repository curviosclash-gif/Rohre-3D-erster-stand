"""BT93S2R.1 failure taxonomy and source lock.

This phase writes diagnostic governance evidence only. It does not train PPO,
consume holdouts, repair rewards, add telemetry, change the action surface, or
touch productive runtime surfaces.
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
BT93S_ROOT = PPO_ROOT / "bt93s"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93RR_ROOT = PPO_ROOT / "bt93r_reentry"
BT93Y_ROOT = PPO_ROOT / "bt93y"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"

START_CONTRACT_PATH = BT93S2_ROOT / "start_contract.json"
SCENARIO_MATRIX_V2_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
SCENARIO_SEARCH_PATH = BT93S2_ROOT / "scenario_search_report.json"
EXISTING_ACTION_EFFECT_V2_PATH = BT93S2_ROOT / "existing_action_effect_v2_report.json"
BT93S_CLOSURE_PATH = BT93S_ROOT / "bt93s_closure_gate_report.json"
BT93RR_CLOSURE_PATH = BT93RR_ROOT / "bt93r_reentry_closure_gate_report.json"
BT93RR_HANDOVER_PATH = BT93RR_ROOT / "bt93r_reentry_handover_package.json"
BT93Y_RETRAIN_LINEAGE_PATH = BT93Y_ROOT / "retrain_lineage_manifest.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
S2_START_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2_start_contract.py"
S2_MATRIX_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2_scenario_matrix_v2.py"
S2_EFFECT_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2_existing_action_effect_v2.py"
S2R_TAXONOMY_SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r_failure_taxonomy.py"
REPORT_PATH = BT93S2R_ROOT / "failure_taxonomy_report.json"

EXPECTED_FAILURES = {
    "escape-left-open negative-control-failed",
    "escape-right-open action-space-required candidate",
    "no-danger-control neutral-control-unstable",
    "side-wall-left direction/control mismatch",
    "predicateFailureCount=48",
    "minimumWindowFailureCount=12",
    "commandFlagWithoutStateEffectCount=118",
    "rewardOnlyRejectedCount=77",
}
ALLOWED_CLOSURE_RESULT_CLASSES = [
    "matrix-control-reentry-green",
    "escape-left-control-required",
    "escape-right-scenario-required",
    "side-wall-direction-contract-required",
    "neutral-control-required",
    "predicate-window-required",
    "measurement-invalid",
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
    "reward fix from BT93S2R.1",
    "telemetry fix from BT93S2R.1",
    "action-surface change from BT93S2R.1",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
    "bt93s2StartContract": (
        START_CONTRACT_PATH,
        "BT93S2.1 source lock",
        {"blockId": "BT93S2", "phaseId": "93S2.1", "ok": True, "resultClass": "start-contract-locked"},
    ),
    "bt93s2ScenarioMatrixV2": (
        SCENARIO_MATRIX_V2_PATH,
        "BT93S2.2 matrix-v2 contract",
        {"blockId": "BT93S2", "phaseId": "93S2.2", "ok": True, "resultClass": "scenario-matrix-v2-contract-green"},
    ),
    "bt93s2ScenarioSearch": (
        SCENARIO_SEARCH_PATH,
        "BT93S2.2 deterministic scenario search",
        {"blockId": "BT93S2", "phaseId": "93S2.2", "ok": True, "resultClass": "scenario-matrix-v2-contract-green"},
    ),
    "bt93s2ExistingActionEffectV2": (
        EXISTING_ACTION_EFFECT_V2_PATH,
        "BT93S2.3 red measurement source",
        {"blockId": "BT93S2", "phaseId": "93S2.3", "ok": False, "resultClass": "measurement-invalid"},
    ),
    "bt93sClosure": (
        BT93S_CLOSURE_PATH,
        "BT93S.99 red source before BT93S2",
        {"blockId": "BT93S", "phaseId": "93S.99", "ok": True, "resultClass": "matrix-redesign-required"},
    ),
    "bt93rrClosure": (
        BT93RR_CLOSURE_PATH,
        "BT93RR.99 green R-Reentry source",
        {"blockId": "BT93RR", "phaseId": "93RR.99", "ok": True, "resultClass": "eval-mode-bug-fixed-counterprobe-green"},
    ),
    "bt93rrHandover": (
        BT93RR_HANDOVER_PATH,
        "BT93RR.99 handover package",
        {"blockId": "BT93RR", "phaseId": "93RR.99", "ok": True, "resultClass": "eval-mode-bug-fixed-counterprobe-green"},
    ),
    "bt93yRetrainLineage": (
        BT93Y_RETRAIN_LINEAGE_PATH,
        "BT93Y retrain lineage source",
        {"blockId": "BT93Y", "ok": True, "resultClass": "retrain-lineage-ready"},
    ),
    "ppoActionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}),
    "curviosEnv": (CURVIOS_ENV_PATH, "read-only Python sidecar env", {}),
    "headlessRunner": (HEADLESS_RUNNER_PATH, "read-only JS-authoritative lane runner", {}),
    "bt93s2StartScript": (S2_START_SCRIPT_PATH, "BT93S2.1 generating script hash", {}),
    "bt93s2MatrixScript": (S2_MATRIX_SCRIPT_PATH, "BT93S2.2 generating script hash", {}),
    "bt93s2EffectScript": (S2_EFFECT_SCRIPT_PATH, "BT93S2.3 generating script hash", {}),
    "bt93s2rTaxonomyScript": (S2R_TAXONOMY_SCRIPT_PATH, "BT93S2R.1 generating script hash", {}),
}


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


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


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
    json_expected_ok = expected_ok if expected else True
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "expectedOk": json_expected_ok,
        "fresh": bool(path.is_file() and tracked_ok and json_expected_ok),
        "sha256": _sha256_file(path),
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


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _scenarios_by_id(contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {
        str(scenario.get("id")): scenario
        for scenario in _as_list(contract.get("scenarios"))
        if isinstance(scenario, Mapping) and scenario.get("id")
    }


def _scenario_results_by_id(report: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {
        str(key): value
        for key, value in _as_mapping(report.get("scenarioResults")).items()
        if isinstance(value, Mapping)
    }


def _probe_counts_by_scenario(report: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    counts: dict[str, dict[str, Any]] = {}
    for probe in _as_list(report.get("probes")):
        if not isinstance(probe, Mapping):
            continue
        scenario_id = str(probe.get("scenarioId") or "")
        if not scenario_id:
            continue
        bucket = counts.setdefault(
            scenario_id,
            {
                "probeCount": 0,
                "predicateFailureCount": 0,
                "minimumWindowFailureCount": 0,
                "actionNames": [],
                "seeds": [],
            },
        )
        bucket["probeCount"] += 1
        if probe.get("completedMinimumWindow") is not True:
            bucket["minimumWindowFailureCount"] += 1
        predicate = probe.get("v2Predicate")
        if isinstance(predicate, Mapping) and predicate.get("pass") is not True:
            bucket["predicateFailureCount"] += 1
        action_name = probe.get("actionName")
        seed = probe.get("seed")
        if action_name is not None:
            bucket["actionNames"].append(str(action_name))
        if seed is not None:
            bucket["seeds"].append(seed)
    for bucket in counts.values():
        bucket["actionNames"] = sorted(set(bucket["actionNames"]))
        bucket["seeds"] = sorted(set(bucket["seeds"]))
    return counts


def _controls(scenarios: Mapping[str, Mapping[str, Any]], scenario_id: str) -> Mapping[str, Any]:
    return _as_mapping(scenarios.get(scenario_id, {}).get("controls"))


def _control_actions(controls: Mapping[str, Any], key: str) -> list[str]:
    control = _as_mapping(controls.get(key))
    return [str(action) for action in _as_list(control.get("actions"))]


def _taxonomy_entry(
    *,
    taxonomy_id: str,
    scenario_id: str | None,
    result_class: str,
    root_cause_candidate: str,
    evidence: Mapping[str, Any],
    blocks: list[str],
    trace_focus: list[str],
) -> dict[str, Any]:
    return {
        "id": taxonomy_id,
        "scenarioId": scenario_id,
        "resultClass": result_class,
        "rootCauseCandidate": root_cause_candidate,
        "evidence": dict(evidence),
        "blocks": list(blocks),
        "traceFocus": list(trace_focus),
        "requiresTraceAuditBeforeFix": True,
    }


def _build_failure_taxonomy(
    *,
    contract: Mapping[str, Any],
    effect_report: Mapping[str, Any],
) -> list[dict[str, Any]]:
    scenarios = _scenarios_by_id(contract)
    results = _scenario_results_by_id(effect_report)
    sample_counts = _as_mapping(effect_report.get("sampleCounts"))
    proxy = _as_mapping(effect_report.get("forbiddenProxyRejection"))
    probe_counts = _probe_counts_by_scenario(effect_report)

    escape_left_controls = _controls(scenarios, "escape-left-open")
    escape_left = _as_mapping(results.get("escape-left-open"))
    escape_left_successes = [str(action) for action in _as_list(escape_left.get("successfulActions"))]

    escape_right_controls = _controls(scenarios, "escape-right-open")
    escape_right = _as_mapping(results.get("escape-right-open"))

    no_danger_controls = _controls(scenarios, "no-danger-control")
    no_danger = _as_mapping(effect_report.get("noDangerControl"))
    no_danger_result = _as_mapping(results.get("no-danger-control"))

    side_left_controls = _controls(scenarios, "side-wall-left")
    side_left = _as_mapping(results.get("side-wall-left"))
    side_left_successes = [str(action) for action in _as_list(side_left.get("successfulActions"))]
    side_left_positive = _control_actions(side_left_controls, "positiveControls")
    side_left_unexpected = sorted(set(side_left_successes) - set(side_left_positive))
    side_left_missing_positive = sorted(set(side_left_positive) - set(side_left_successes))

    return [
        _taxonomy_entry(
            taxonomy_id="escape-left-open negative-control-failed",
            scenario_id="escape-left-open",
            result_class=str(escape_left.get("classResult") or "measurement-invalid"),
            root_cause_candidate="negative-control-failed",
            evidence={
                "negativeControlActions": _control_actions(escape_left_controls, "negativeControls"),
                "positiveControlActions": _control_actions(escape_left_controls, "positiveControls"),
                "successfulActions": escape_left_successes,
                "noopPassedAsSuccess": "noop" in escape_left_successes,
                "actionGreenEvidenceProduced": escape_left.get("actionGreenEvidenceProduced"),
                "probeCounts": probe_counts.get("escape-left-open", {}),
            },
            blocks=["93S2.4", "BT93T", "BT93U", "BT93W", "BT93O", "BT93P", "BT94A"],
            trace_focus=[
                "reproduce noop against passive baseline",
                "separate passive drift from directed left escape",
                "compare positive controls against same seed/window",
            ],
        ),
        _taxonomy_entry(
            taxonomy_id="escape-right-open action-space-required candidate",
            scenario_id="escape-right-open",
            result_class=str(escape_right.get("classResult") or "action-effect-weak"),
            root_cause_candidate="action-space-required-candidate",
            evidence={
                "positiveControlActions": _control_actions(escape_right_controls, "positiveControls"),
                "negativeControlActions": _control_actions(escape_right_controls, "negativeControls"),
                "successfulActions": _as_list(escape_right.get("successfulActions")),
                "weakActions": _as_list(escape_right.get("weakActions")),
                "listedAsActionSpaceRequired": "escape-right-open" in _as_list(effect_report.get("actionSpaceRequiredScenarioIds")),
                "actionGreenEvidenceProduced": escape_right.get("actionGreenEvidenceProduced"),
                "probeCounts": probe_counts.get("escape-right-open", {}),
            },
            blocks=["93S2.4 direct surface decision", "BT93U", "BT93W", "BT93O", "BT93P", "BT94A"],
            trace_focus=[
                "prove predicate/window fairness before action-space judgement",
                "compare yaw-right roll-right turn-right-boost evade-right",
                "keep as candidate only until trace audit",
            ],
        ),
        _taxonomy_entry(
            taxonomy_id="no-danger-control neutral-control-unstable",
            scenario_id="no-danger-control",
            result_class=str(no_danger.get("classResult") or no_danger_result.get("classResult") or "neutral-control-unstable"),
            root_cause_candidate="neutral-control-required",
            evidence={
                "positiveControlActions": _control_actions(no_danger_controls, "positiveControls"),
                "negativeControlActions": _control_actions(no_danger_controls, "negativeControls"),
                "neutralStableActions": _as_list(no_danger.get("neutralStableActions")),
                "negativeControlFailed": no_danger.get("negativeControlFailed"),
                "actionGreenEvidenceAllowed": no_danger.get("actionGreenEvidenceAllowed"),
                "actionGreenEvidenceProduced": no_danger.get("actionGreenEvidenceProduced"),
                "weakActions": _as_list(no_danger_result.get("weakActions")),
                "probeCounts": probe_counts.get("no-danger-control", {}),
            },
            blocks=["BT93S2.3-Recheck green", "BT93T", "BT93U", "BT93W", "BT93O", "BT93P", "BT94A"],
            trace_focus=[
                "reproduce noop neutral stability",
                "prove boost and shoot-mg stay negative controls",
                "prevent neutral control from producing action-green evidence",
            ],
        ),
        _taxonomy_entry(
            taxonomy_id="side-wall-left direction/control mismatch",
            scenario_id="side-wall-left",
            result_class=str(side_left.get("classResult") or "existing-action-effect-observed"),
            root_cause_candidate="side-wall-direction-contract-required",
            evidence={
                "positiveControlActions": side_left_positive,
                "negativeControlActions": _control_actions(side_left_controls, "negativeControls"),
                "successfulActions": side_left_successes,
                "unexpectedSuccessfulActions": side_left_unexpected,
                "missingPositiveSuccessfulActions": side_left_missing_positive,
                "yawRightOnlySuccess": side_left_successes == ["yaw-right"],
                "actionGreenEvidenceProduced": side_left.get("actionGreenEvidenceProduced"),
                "probeCounts": probe_counts.get("side-wall-left", {}),
            },
            blocks=["BT93S2.3-Recheck green", "BT93T", "BT93U", "BT93W", "BT93O", "BT93P", "BT94A"],
            trace_focus=[
                "verify left/right coordinate label",
                "compare yaw-left roll-left evade-left against yaw-right",
                "stop as direction-contract red if label/control cannot be reconciled",
            ],
        ),
        _taxonomy_entry(
            taxonomy_id="predicateFailureCount=48",
            scenario_id=None,
            result_class="measurement-invalid",
            root_cause_candidate="predicate-window-required",
            evidence={
                "predicateFailureCount": sample_counts.get("predicateFailureCount"),
                "expectedPredicateFailureCount": 48,
                "matchesExpected": sample_counts.get("predicateFailureCount") == 48,
            },
            blocks=["matrix-control-reentry-green", "BT93S2.3-Recheck green", "BT93T/U/W/O/P/94A"],
            trace_focus=["session-id", "warmup", "seed split", "revalidation parity"],
        ),
        _taxonomy_entry(
            taxonomy_id="minimumWindowFailureCount=12",
            scenario_id=None,
            result_class="measurement-invalid",
            root_cause_candidate="predicate-window-required",
            evidence={
                "minimumWindowFailureCount": sample_counts.get("minimumWindowFailureCount"),
                "expectedMinimumWindowFailureCount": 12,
                "matchesExpected": sample_counts.get("minimumWindowFailureCount") == 12,
            },
            blocks=["matrix-control-reentry-green", "BT93S2.3-Recheck green", "BT93T/U/W/O/P/94A"],
            trace_focus=["minimum completed steps", "terminal abort", "maxSteps", "warmup"],
        ),
        _taxonomy_entry(
            taxonomy_id="commandFlagWithoutStateEffectCount=118",
            scenario_id=None,
            result_class="proxy-hygiene-retained",
            root_cause_candidate="proxy-success-rejection-required",
            evidence={
                "commandFlagWithoutStateEffectCount": proxy.get("commandFlagWithoutStateEffectCount"),
                "expectedCommandFlagWithoutStateEffectCount": 118,
                "commandFlagOnlyRejected": proxy.get("commandFlagOnlyRejected"),
                "matchesExpected": proxy.get("commandFlagWithoutStateEffectCount") == 118,
            },
            blocks=["reward-only or command-flag-only success", "action-quality claim from command flags"],
            trace_focus=["keep command flag without state effect rejected"],
        ),
        _taxonomy_entry(
            taxonomy_id="rewardOnlyRejectedCount=77",
            scenario_id=None,
            result_class="proxy-hygiene-retained",
            root_cause_candidate="proxy-success-rejection-required",
            evidence={
                "rewardOnlyRejectedCount": proxy.get("rewardOnlyRejectedCount"),
                "expectedRewardOnlyRejectedCount": 77,
                "rewardOnlyRejected": proxy.get("rewardOnlyRejected"),
                "terminalOrMaxStepsOnlySuccessCount": proxy.get("terminalOrMaxStepsOnlySuccessCount"),
                "matchesExpected": proxy.get("rewardOnlyRejectedCount") == 77,
            },
            blocks=["reward-only success", "maxSteps-only survival success", "BT94A quality claim"],
            trace_focus=["keep reward-only and maxSteps-only rejected"],
        ),
    ]


def _claim_flags(next_phase_allowed: bool) -> dict[str, bool]:
    return {
        "bt93s2rNextPhaseAllowed": next_phase_allowed,
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
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignalAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "holdoutUsed": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "safetyFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "candidateRun": False,
        "freezeCandidate": False,
        "qualityClaimAllowed": False,
    }


def build_report() -> dict[str, Any]:
    payloads = {key: _read_json(path) for key, (path, _role, _expected) in SOURCE_SPECS.items()}
    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] and item["fresh"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)

    start_contract = payloads["bt93s2StartContract"]
    matrix_contract = payloads["bt93s2ScenarioMatrixV2"]
    search_report = payloads["bt93s2ScenarioSearch"]
    effect_report = payloads["bt93s2ExistingActionEffectV2"]
    rr_closure = payloads["bt93rrClosure"]
    rr_handover = payloads["bt93rrHandover"]
    retrain_lineage = payloads["bt93yRetrainLineage"]

    failure_taxonomy = _build_failure_taxonomy(contract=matrix_contract, effect_report=effect_report)
    observed_failure_ids = {item["id"] for item in failure_taxonomy}
    missing_expected_failures = sorted(EXPECTED_FAILURES - observed_failure_ids)
    sample_counts = _as_mapping(effect_report.get("sampleCounts"))
    proxy = _as_mapping(effect_report.get("forbiddenProxyRejection"))
    scenario_results = _scenario_results_by_id(effect_report)

    s2_3_red_source_preserved = bool(
        effect_report.get("ok") is False
        and effect_report.get("blockId") == "BT93S2"
        and effect_report.get("phaseId") == "93S2.3"
        and effect_report.get("resultClass") == "measurement-invalid"
        and effect_report.get("opensNext") == []
        and effect_report.get("allowNext") == []
        and sample_counts.get("probeCount") == 338
        and sample_counts.get("predicateFailureCount") == 48
        and sample_counts.get("minimumWindowFailureCount") == 12
        and proxy.get("commandFlagWithoutStateEffectCount") == 118
        and proxy.get("rewardOnlyRejectedCount") == 77
        and proxy.get("terminalOrMaxStepsOnlySuccessCount") == 0
    )
    source_contract_matches = bool(
        start_contract.get("ok") is True
        and matrix_contract.get("ok") is True
        and search_report.get("ok") is True
        and s2_3_red_source_preserved
        and rr_closure.get("ok") is True
        and rr_handover.get("ok") is True
        and retrain_lineage.get("ok") is True
    )
    taxonomy_complete = not missing_expected_failures and len(failure_taxonomy) >= len(EXPECTED_FAILURES)

    phase_coverage = {
        "93S2R.1.1": bool(
            source_files_ready
            and source_files_versioned
            and effect_report.get("actionSurfaceId")
            and _sha256_file(ACTION_SURFACE_PATH)
            and _sha256_file(S2_START_SCRIPT_PATH)
            and _sha256_file(S2_MATRIX_SCRIPT_PATH)
            and _sha256_file(S2_EFFECT_SCRIPT_PATH)
            and _sha256_file(S2R_TAXONOMY_SCRIPT_PATH)
        ),
        "93S2R.1.2": bool(
            taxonomy_complete
            and scenario_results
            and sample_counts
            and BLOCKED_NEXT
            and ALLOWED_CLOSURE_RESULT_CLASSES
        ),
        "93S2R.1.3": bool(source_contract_matches and s2_3_red_source_preserved),
    }
    dod_coverage = {
        "DoD.S2R-R1": bool(
            source_files_ready
            and source_files_versioned
            and start_contract.get("git")
            and matrix_contract.get("git")
            and search_report.get("git")
            and effect_report.get("git")
            and effect_report.get("actionSurfaceId")
            and effect_report.get("decoderHash")
        ),
        "DoD.S2R-R2": taxonomy_complete,
    }
    ok = bool(source_contract_matches and taxonomy_complete and all(phase_coverage.values()) and all(dod_coverage.values()))
    result_class = "failure-taxonomy-source-lock-green" if ok else "measurement-invalid"

    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2r-failure-taxonomy-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2r_failure_taxonomy.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93S2R",
        "phaseId": "93S2R.1",
        "resultClass": result_class,
        "matrixId": matrix_contract.get("matrixId"),
        "contractId": matrix_contract.get("contractId"),
        "actionSurfaceId": effect_report.get("actionSurfaceId"),
        "decoderHash": _sha256_file(ACTION_SURFACE_PATH),
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceContractMatches": source_contract_matches,
        "s2_3RedSourcePreserved": s2_3_red_source_preserved,
        "sourceArtifacts": source_artifacts,
        "scriptHashes": {
            "bt93s2StartContract": _sha256_file(S2_START_SCRIPT_PATH),
            "bt93s2ScenarioMatrixV2": _sha256_file(S2_MATRIX_SCRIPT_PATH),
            "bt93s2ExistingActionEffectV2": _sha256_file(S2_EFFECT_SCRIPT_PATH),
            "bt93s2rFailureTaxonomy": _sha256_file(S2R_TAXONOMY_SCRIPT_PATH),
        },
        "sourceResultClasses": {
            "bt93s2StartContract": start_contract.get("resultClass"),
            "bt93s2ScenarioMatrixV2": matrix_contract.get("resultClass"),
            "bt93s2ScenarioSearch": search_report.get("resultClass"),
            "bt93s2ExistingActionEffectV2": effect_report.get("resultClass"),
            "bt93sClosure": payloads["bt93sClosure"].get("resultClass"),
            "bt93rrClosure": rr_closure.get("resultClass"),
        },
        "scenarioIds": sorted(_scenario_results_by_id(effect_report)),
        "controlScenarioIds": [
            "escape-left-open",
            "escape-right-open",
            "no-danger-control",
            "side-wall-left",
        ],
        "failureTaxonomy": failure_taxonomy,
        "missingExpectedFailures": missing_expected_failures,
        "sampleCounts": {
            "probeCount": sample_counts.get("probeCount"),
            "scenarioCount": sample_counts.get("scenarioCount"),
            "actionCount": sample_counts.get("actionCount"),
            "predicateFailureCount": sample_counts.get("predicateFailureCount"),
            "minimumWindowFailureCount": sample_counts.get("minimumWindowFailureCount"),
            "newTrainingEpisodes": sample_counts.get("newTrainingEpisodes"),
            "newOptimizerUpdates": sample_counts.get("newOptimizerUpdates"),
            "holdoutEpisodes": sample_counts.get("holdoutEpisodes"),
            "seedCountsByScenario": sample_counts.get("seedCountsByScenario"),
        },
        "classResultCounts": effect_report.get("classResultCounts"),
        "proxyHygiene": {
            "commandFlagWithoutStateEffectCount": proxy.get("commandFlagWithoutStateEffectCount"),
            "commandFlagOnlyRejected": proxy.get("commandFlagOnlyRejected"),
            "rewardOnlyRejectedCount": proxy.get("rewardOnlyRejectedCount"),
            "rewardOnlyRejected": proxy.get("rewardOnlyRejected"),
            "terminalOrMaxStepsOnlySuccessCount": proxy.get("terminalOrMaxStepsOnlySuccessCount"),
            "maxStepsOnlyRejected": proxy.get("maxStepsOnlyRejected"),
            "successRequiresStateEffect": proxy.get("successRequiresStateEffect"),
        },
        "allowedClosureResultClasses": list(ALLOWED_CLOSURE_RESULT_CLASSES),
        "claimFlags": _claim_flags(ok),
        "guardrails": _guardrails(),
        "invalidations": [
            {
                "scope": "BT93S2.3 normal continuation",
                "reason": "BT93S2.3 is measurement-invalid; 93S2.4 remains blocked until BT93S2R.99 green plus fresh S2.3-Recheck.",
            },
            {
                "scope": "escape-right-open action-space judgement",
                "reason": "Action-space-required is only a candidate until predicate/window fairness is proven by targeted trace audit.",
            },
            {
                "scope": "side-wall-left positive evidence",
                "reason": "Successful action yaw-right contradicts left-side positive controls yaw-left/roll-left/evade-left.",
            },
        ],
        "blocksNext": list(BLOCKED_NEXT),
        "opensNext": ["93S2R.2 Targeted Trace Audit"] if ok else [],
        "allowNext": ["93S2R.2 Targeted Trace Audit"] if ok else [],
        "nextAllowedActions": [
            "Run 93S2R.2 targeted trace audit against the locked taxonomy."
        ]
        if ok
        else [
            "Stop: repair missing, untracked, overwritten, or mismatched S2/S/RR source evidence before trace audit."
        ],
        "recommendations": [
            {
                "rank": "1",
                "action": "Run 93S2R.2 Targeted Trace Audit.",
                "why": "S2.3 is preserved as measurement-invalid and the exact red findings are now locked; fixes need root-cause trace evidence before any v3 matrix edit.",
            }
        ]
        if ok
        else [
            {
                "rank": "1",
                "action": "Repair the S2R.1 source lock before continuing.",
                "why": "Missing, untracked, mismatched, or overwritten source evidence would make trace and matrix repair non-closure-faehig.",
            }
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r_failure_taxonomy.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "summary": {
            "finalResult": result_class,
            "sourceLocked": ok,
            "nextBestAction": "93S2R.2" if ok else "source-lock repair",
            "blockers": [] if ok else ["measurement-invalid"],
            "bt93s2RecheckAllowed": False,
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
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "sourceFilesVersioned": report["sourceFilesVersioned"],
                "missingExpectedFailures": report["missingExpectedFailures"],
                "sampleCounts": report["sampleCounts"],
                "opensNext": report["opensNext"],
                "output": _rel(REPORT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
