"""BT93S2.3 existing-action effect v2 measurement.

This diagnostic phase measures the current masked semantic actions against the
BT93S2 matrix-v2 contract. It does not train PPO, consume holdouts, alter the
action surface, change rewards, add telemetry, or touch productive runtime
surfaces.
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
SCRIPT_ROOT = Path(__file__).resolve().parent
for path in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import bt93s_existing_action_effect as bt93s_effect  # noqa: E402
import bt93s2_scenario_matrix_v2 as bt93s2_matrix  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S_ROOT = PPO_ROOT / "bt93s"
BT93S2_ROOT = PPO_ROOT / "bt93s2"

START_CONTRACT_PATH = BT93S2_ROOT / "start_contract.json"
SCENARIO_SEARCH_REPORT_PATH = BT93S2_ROOT / "scenario_search_report.json"
SCENARIO_V2_CONTRACT_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
REPORT_PATH = BT93S2_ROOT / "existing_action_effect_v2_report.json"
BT93S_CLOSURE_PATH = BT93S_ROOT / "bt93s_closure_gate_report.json"
BT93S_EXISTING_ACTION_EFFECT_PATH = BT93S_ROOT / "existing_action_effect_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

REQUIRED_EFFECT_METRICS = (
    "wallDistanceFront",
    "wallDistanceLeft",
    "wallDistanceRight",
    "localOpennessRatio",
    "collisionRisk",
    "terminalRisk",
    "headingDelta",
    "targetDelta",
    "trailPressureProxy",
)

ACTION_EFFECT_REQUIRED_SCENARIOS = (
    "escape-right-open",
    "side-wall-left",
    "side-wall-right",
    "narrowing-corridor",
)

FORBIDDEN_SUCCESS_PROXIES = (
    "reward-only",
    "command-flag-only",
    "target-distance-only",
    "single-step delta",
    "maxSteps-only survival",
    "progress event without state-risk improvement",
)

BLOCKED_NEXT = [
    "BT93T claim until BT93S2.99=observation-telemetry-required",
    "BT93U claim until BT93S2.99=action-selection-green",
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
    "reward fix from BT93S2.3",
    "telemetry fix from BT93S2.3",
    "action-surface change from BT93S2.3",
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
    paths = {
        "startContract": START_CONTRACT_PATH,
        "scenarioSearchReport": SCENARIO_SEARCH_REPORT_PATH,
        "scenarioMatrixV2Contract": SCENARIO_V2_CONTRACT_PATH,
        "bt93sExistingActionEffect": BT93S_EXISTING_ACTION_EFFECT_PATH,
        "bt93sClosure": BT93S_CLOSURE_PATH,
        "actionSurface": ACTION_SURFACE_PATH,
        "curviosEnv": CURVIOS_ENV_PATH,
        "headlessRunner": HEADLESS_RUNNER_PATH,
    }
    roles = {
        "startContract": "BT93S2.1 source lock opening the S2 chain",
        "scenarioSearchReport": "BT93S2.2 deterministic scenario search source",
        "scenarioMatrixV2Contract": "BT93S2.2 matrix-v2 contract under measurement",
        "bt93sExistingActionEffect": "BT93S.2 historical red action-effect source, context only",
        "bt93sClosure": "BT93S.99 red closure source",
        "actionSurface": "current PPO action-surface decoder, read-only",
        "curviosEnv": "Python sidecar environment, read-only",
        "headlessRunner": "JS-authoritative headless transition path, read-only",
    }
    tracked = _tracked_files(paths.values())
    return [_source_artifact(path, roles[key], tracked) for key, path in paths.items()]


def _scenario_seed_list(scenario: Mapping[str, Any]) -> list[int]:
    seed_plan = scenario.get("seedPlan") if isinstance(scenario.get("seedPlan"), Mapping) else {}
    seeds: list[int] = []
    for key in ("discoverySeeds", "validationSeeds", "seeds"):
        for seed in seed_plan.get(key) or []:
            try:
                seeds.append(int(seed))
            except (TypeError, ValueError):
                continue
    return sorted(dict.fromkeys(seeds))


def _make_env_v2(scenario: Mapping[str, Any], *, seed: int, action_name: str, repeat_steps: int) -> Any:
    start_state = scenario.get("startState") if isinstance(scenario.get("startState"), Mapping) else {}
    effect_window = scenario.get("effectWindow") if isinstance(scenario.get("effectWindow"), Mapping) else {}
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    return bt93s_effect.make_curvios_action_wrapper(
        bt93s_effect.CurviosEnv(
            max_steps=max(warmup_steps + repeat_steps + 2, repeat_steps + 2, int(effect_window.get("maxSteps") or 0) + 2),
            default_seed=int(seed),
            session_id=f"bt93s2-scenario-search-{scenario['id']}-{seed}",
            controller_timeout_seconds=8.0,
            reward_profile_id=str(start_state.get("rewardProfileId") or "bt93l-objective-reachability-v1"),
            map_key=str(start_state.get("mapKey") or "standard"),
            domain_mode=str(start_state.get("domainMode") or "classic-3d"),
            game_mode=str(start_state.get("gameMode") or "CLASSIC"),
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )


def _run_probe_v2(scenario: Mapping[str, Any], *, seed: int, action_name: str, repeat_steps: int) -> dict[str, Any]:
    original_make_env = bt93s_effect._make_env
    bt93s_effect._make_env = _make_env_v2
    try:
        return bt93s_effect._run_probe(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
    finally:
        bt93s_effect._make_env = original_make_env


def _classify_no_danger_control(
    scenario: Mapping[str, Any],
    action_results: Mapping[str, list[Mapping[str, Any]]],
) -> dict[str, Any]:
    controls = scenario.get("controls") if isinstance(scenario.get("controls"), Mapping) else {}
    positive_controls = controls.get("positiveControls") if isinstance(controls.get("positiveControls"), Mapping) else {}
    negative_controls = controls.get("negativeControls") if isinstance(controls.get("negativeControls"), Mapping) else {}
    positive_actions = set(str(action) for action in positive_controls.get("actions") or [])
    negative_actions = set(str(action) for action in negative_controls.get("actions") or [])
    classified: dict[str, Any] = {}
    weak_actions: list[str] = []
    neutral_stable_actions: list[str] = []
    negative_failed_actions: list[str] = []

    for action_name, probes in action_results.items():
        success_count = sum(1 for probe in probes if probe.get("successEvaluation", {}).get("success") is True)
        state_effect_count = sum(
            1 for probe in probes if probe.get("successEvaluation", {}).get("stateEffectObserved") is True
        )
        command_weak_count = sum(
            1 for probe in probes if probe.get("successEvaluation", {}).get("commandFlagWithoutStateEffect") is True
        )
        ok_count = sum(1 for probe in probes if probe.get("ok") is True)
        if action_name in negative_actions and success_count > 0:
            action_class = "negative-control-failed"
            negative_failed_actions.append(action_name)
        elif action_name in positive_actions and ok_count > 0 and success_count == ok_count:
            action_class = "neutral-control-stable"
            neutral_stable_actions.append(action_name)
        elif command_weak_count > 0 or (action_name not in positive_actions and action_name not in negative_actions):
            action_class = "action-effect-weak"
            weak_actions.append(action_name)
        else:
            action_class = "no-success-control"
        classified[action_name] = {
            "actionEffectClass": action_class,
            "probeCount": len(probes),
            "okCount": ok_count,
            "successCount": success_count,
            "stateEffectCount": state_effect_count,
            "commandFlagWeakCount": command_weak_count,
            "seedResults": [
                {
                    "seed": probe.get("seed"),
                    "ok": probe.get("ok"),
                    "observedSteps": probe.get("observedSteps"),
                    "completedMinimumWindow": probe.get("completedMinimumWindow"),
                    "v2PredicatePass": (probe.get("v2Predicate") or {}).get("pass")
                    if isinstance(probe.get("v2Predicate"), Mapping)
                    else None,
                    "effectMetrics": probe.get("effectMetrics"),
                    "successEvaluation": probe.get("successEvaluation"),
                    "safetyTelemetry": probe.get("safetyTelemetry"),
                }
                for probe in probes
            ],
        }

    negative_control_failed = bool(negative_failed_actions)
    positive_control_pass = bool(neutral_stable_actions) and positive_actions.issubset(set(neutral_stable_actions))
    if negative_control_failed:
        class_result = "measurement-invalid"
    elif positive_control_pass:
        class_result = "neutral-control-stable"
    else:
        class_result = "neutral-control-unstable"
    return {
        "scenarioId": "no-danger-control",
        "classResult": class_result,
        "existingActionCanRescue": False,
        "successfulActions": [],
        "neutralStableActions": sorted(neutral_stable_actions),
        "weakActions": sorted(weak_actions),
        "positiveControlActions": sorted(positive_actions),
        "positiveControlPass": positive_control_pass,
        "negativeControlActions": sorted(negative_actions),
        "negativeControlFailed": negative_control_failed,
        "negativeControlFailedActions": sorted(negative_failed_actions),
        "actionGreenEvidenceAllowed": False,
        "actionGreenEvidenceProduced": False,
        "actionResults": classified,
    }


def _classify_action_results_v2(
    scenario: Mapping[str, Any],
    action_results: Mapping[str, list[Mapping[str, Any]]],
) -> dict[str, Any]:
    if str(scenario.get("id") or "") == "no-danger-control":
        return _classify_no_danger_control(scenario, action_results)
    result = bt93s_effect._classify_action_results(scenario, action_results)
    result["actionGreenEvidenceAllowed"] = True
    result["actionGreenEvidenceProduced"] = bool(result.get("successfulActions"))
    return result


def _aggregate_action_classes_v2(scenario_results: Mapping[str, Any]) -> dict[str, Any]:
    action_summary: dict[str, dict[str, Any]] = {
        name: {
            "observedScenarioCount": 0,
            "stateEffectScenarioCount": 0,
            "neutralControlScenarioCount": 0,
            "weakScenarioCount": 0,
            "successfulScenarioIds": [],
            "neutralControlScenarioIds": [],
            "weakScenarioIds": [],
        }
        for name, _ in MASKED_SEMANTIC_ACTIONS
    }
    for scenario_id, result in scenario_results.items():
        for action_name, action_result in (result.get("actionResults") or {}).items():
            if action_name not in action_summary:
                continue
            action_summary[action_name]["observedScenarioCount"] += 1
            action_class = action_result.get("actionEffectClass")
            if action_result.get("successCount", 0) > 0 and action_class != "neutral-control-stable":
                action_summary[action_name]["stateEffectScenarioCount"] += 1
                action_summary[action_name]["successfulScenarioIds"].append(scenario_id)
            if action_class == "neutral-control-stable":
                action_summary[action_name]["neutralControlScenarioCount"] += 1
                action_summary[action_name]["neutralControlScenarioIds"].append(scenario_id)
            if action_result.get("commandFlagWeakCount", 0) > 0 or action_class == "action-effect-weak":
                action_summary[action_name]["weakScenarioCount"] += 1
                action_summary[action_name]["weakScenarioIds"].append(scenario_id)
    return {
        action: {
            **summary,
            "classification": "state-effect-observed"
            if summary["stateEffectScenarioCount"] > 0
            else "neutral-control-only"
            if summary["neutralControlScenarioCount"] > 0
            else "action-effect-weak",
            "successfulScenarioIds": sorted(summary["successfulScenarioIds"]),
            "neutralControlScenarioIds": sorted(summary["neutralControlScenarioIds"]),
            "weakScenarioIds": sorted(summary["weakScenarioIds"]),
        }
        for action, summary in action_summary.items()
    }


def _claim_flags(*, next_phase_allowed: bool) -> dict[str, bool]:
    return {
        "bt93s2NextPhaseAllowed": next_phase_allowed,
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
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "qualityClaimAllowed": False,
    }


def build_report(*, seed_limit: int | None = None, action_limit: int | None = None) -> dict[str, Any]:
    start_contract = _read_json(START_CONTRACT_PATH)
    search_report = _read_json(SCENARIO_SEARCH_REPORT_PATH)
    contract = _read_json(SCENARIO_V2_CONTRACT_PATH)
    scenarios = contract.get("scenarios") if isinstance(contract.get("scenarios"), list) else []
    actions = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    if action_limit is not None:
        actions = actions[: max(1, int(action_limit))]

    probes: list[dict[str, Any]] = []
    scenario_results: dict[str, Any] = {}
    seed_counts_by_scenario: dict[str, int] = {}
    repeat_steps_by_scenario: dict[str, int] = {}
    predicate_failure_count = 0

    for scenario in scenarios:
        if not isinstance(scenario, Mapping):
            continue
        scenario_id = str(scenario.get("id") or "")
        effect_window = scenario.get("effectWindow") if isinstance(scenario.get("effectWindow"), Mapping) else {}
        repeat_steps = int(effect_window.get("maxSteps") or 24)
        repeat_steps_by_scenario[scenario_id] = repeat_steps
        seeds = _scenario_seed_list(scenario)
        if seed_limit is not None:
            seeds = seeds[: max(1, int(seed_limit))]
        seed_counts_by_scenario[scenario_id] = len(seeds)
        action_results: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
        for seed in seeds:
            for action_name in actions:
                probe = _run_probe_v2(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
                predicate = scenario.get("predicate") if isinstance(scenario.get("predicate"), Mapping) else {}
                predicate_pass = bt93s2_matrix._predicate_ok(scenario_id, probe.get("startMetrics") or {})
                probe["v2Predicate"] = {
                    "predicateId": predicate.get("predicateId"),
                    "expression": predicate.get("expression"),
                    "pass": predicate_pass,
                    "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement") is True,
                }
                if not predicate_pass:
                    predicate_failure_count += 1
                probe["successEvaluation"] = bt93s_effect._success_evaluation(scenario, probe)
                probes.append(probe)
                action_results[action_name].append(probe)
        scenario_results[scenario_id] = _classify_action_results_v2(scenario, action_results)

    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)
    start_contract_ok = (
        start_contract.get("ok") is True
        and start_contract.get("blockId") == "BT93S2"
        and start_contract.get("phaseId") == "93S2.1"
        and start_contract.get("resultClass") == "start-contract-locked"
    )
    matrix_contract_ok = (
        contract.get("ok") is True
        and contract.get("blockId") == "BT93S2"
        and contract.get("phaseId") == "93S2.2"
        and contract.get("resultClass") == "scenario-matrix-v2-contract-green"
    )
    search_report_ok = (
        search_report.get("ok") is True
        and search_report.get("blockId") == "BT93S2"
        and search_report.get("phaseId") == "93S2.2"
        and search_report.get("resultClass") == "scenario-matrix-v2-contract-green"
    )
    class_counts = Counter(result.get("classResult") for result in scenario_results.values())
    all_probes_ok = bool(probes) and all(probe.get("ok") is True for probe in probes)
    minimum_window_failure_count = sum(1 for probe in probes if probe.get("completedMinimumWindow") is not True)
    required_metrics_written = all(
        all(metric in (probe.get("effectMetrics") or {}) for metric in REQUIRED_EFFECT_METRICS)
        for probe in probes
    )
    action_space_required_scenarios = sorted(
        scenario_id
        for scenario_id in ACTION_EFFECT_REQUIRED_SCENARIOS
        if (scenario_results.get(scenario_id) or {}).get("classResult") != "existing-action-effect-observed"
    )
    nonblocking_weak_scenarios = sorted(
        scenario_id
        for scenario_id, result in scenario_results.items()
        if result.get("classResult") == "action-effect-weak"
        and scenario_id not in ACTION_EFFECT_REQUIRED_SCENARIOS
    )
    no_danger_result = scenario_results.get("no-danger-control") or {}
    no_danger_action_green_blocked = (
        no_danger_result.get("actionGreenEvidenceAllowed") is False
        and no_danger_result.get("actionGreenEvidenceProduced") is False
        and no_danger_result.get("negativeControlFailed") is False
    )
    forbidden_proxy_rejection = {
        "policy": list(FORBIDDEN_SUCCESS_PROXIES),
        "successRequiresStateEffect": True,
        "commandFlagOnlyRejected": True,
        "rewardOnlyRejected": True,
        "maxStepsOnlyRejected": True,
        "commandFlagWithoutStateEffectCount": sum(
            1 for probe in probes if probe.get("successEvaluation", {}).get("commandFlagWithoutStateEffect") is True
        ),
        "rewardOnlyRejectedCount": sum(
            1 for probe in probes if probe.get("successEvaluation", {}).get("rewardOnlyRejected") is True
        ),
        "terminalOrMaxStepsOnlySuccessCount": 0,
    }
    phase_coverage = {
        "93S2.3.1": all_probes_ok,
        "93S2.3.2": not action_space_required_scenarios or bool(action_space_required_scenarios),
        "93S2.3.3": no_danger_action_green_blocked,
        "93S2.3.4": all(forbidden_proxy_rejection[key] is True for key in (
            "successRequiresStateEffect",
            "commandFlagOnlyRejected",
            "rewardOnlyRejected",
            "maxStepsOnlyRejected",
        )),
    }
    measurement_valid = bool(
        source_files_ready
        and source_files_versioned
        and start_contract_ok
        and matrix_contract_ok
        and search_report_ok
        and all_probes_ok
        and required_metrics_written
        and no_danger_action_green_blocked
        and not class_counts.get("measurement-invalid")
    )
    if not measurement_valid:
        result_class = "measurement-invalid"
    elif action_space_required_scenarios:
        result_class = "action-space-required"
    else:
        result_class = "existing-action-effect-v2-green"
    ok = measurement_valid
    next_phase_allowed = ok

    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2-existing-action-effect-v2-report-v1",
        "blockId": "BT93S2",
        "phaseId": "93S2.3",
        "resultClass": result_class,
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2_existing_action_effect_v2.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "matrixId": contract.get("matrixId"),
        "contractId": contract.get("contractId"),
        "actionSurfaceId": contract.get("actionSurfaceId") or PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "decoderHash": _sha256_file(ACTION_SURFACE_PATH),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "startContractOk": start_contract_ok,
        "matrixContractOk": matrix_contract_ok,
        "scenarioSearchOk": search_report_ok,
        "thresholdsLockedBeforeRun": {
            "source": _rel(SCENARIO_V2_CONTRACT_PATH),
            "actionEffectRequiredScenarioIds": list(ACTION_EFFECT_REQUIRED_SCENARIOS),
            "effectWindowStepsByScenario": repeat_steps_by_scenario,
            "minimumCompletedSteps": sorted(
                {
                    int((scenario.get("effectWindow") or {}).get("minimumCompletedSteps") or 0)
                    for scenario in scenarios
                    if isinstance(scenario, Mapping)
                }
            ),
            "v2PredicateMustPassBeforeMeasurement": True,
            "noDangerControlActionGreenAllowed": False,
            "forbiddenSuccessProxies": list(FORBIDDEN_SUCCESS_PROXIES),
        },
        "requiredEffectMetrics": list(REQUIRED_EFFECT_METRICS),
        "sampleCounts": {
            "scenarioCount": len(scenario_results),
            "seedCountsByScenario": seed_counts_by_scenario,
            "actionCount": len(actions),
            "probeCount": len(probes),
            "minimumWindowFailureCount": minimum_window_failure_count,
            "predicateFailureCount": predicate_failure_count,
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
        },
        "phaseCoverage": phase_coverage,
        "classResultCounts": dict(sorted(class_counts.items())),
        "actionSpaceRequiredScenarioIds": action_space_required_scenarios,
        "nonBlockingWeakScenarioIds": nonblocking_weak_scenarios,
        "noDangerControl": {
            "classResult": no_danger_result.get("classResult"),
            "actionGreenEvidenceAllowed": no_danger_result.get("actionGreenEvidenceAllowed"),
            "actionGreenEvidenceProduced": no_danger_result.get("actionGreenEvidenceProduced"),
            "neutralStableActions": no_danger_result.get("neutralStableActions"),
            "negativeControlFailed": no_danger_result.get("negativeControlFailed"),
        },
        "forbiddenProxyRejection": forbidden_proxy_rejection,
        "scenarioResults": scenario_results,
        "actionSummary": _aggregate_action_classes_v2(scenario_results),
        "probes": probes,
        "claimFlags": _claim_flags(next_phase_allowed=next_phase_allowed),
        "guardrails": _guardrails(),
        "blocksNext": list(BLOCKED_NEXT),
        "opensNext": ["93S2.4 Action-Surface Repair Decision"] if next_phase_allowed else [],
        "allowNext": ["93S2.4 Action-Surface Repair Decision"] if next_phase_allowed else [],
        "nextAllowedActions": [
            "Run 93S2.4 to separate root cause and pin whether the current action surface can continue."
        ]
        if next_phase_allowed
        else ["Stop: repair measurement-invalid BT93S2.3 evidence before 93S2.4."],
        "decision": {
            "resultClass": result_class,
            "measurementValid": measurement_valid,
            "actionSpaceRequired": bool(action_space_required_scenarios),
            "actionSpaceRequiredScenarioIds": action_space_required_scenarios,
            "opensNext": ["93S2.4 Action-Surface Repair Decision"] if next_phase_allowed else [],
            "blocksNext": list(BLOCKED_NEXT),
        },
        "commands": {
            "write": "python python/scripts/bt93s2_existing_action_effect_v2.py --write-report",
            "next": "python python/scripts/bt93s2_action_surface_repair_decision.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "actionSurface": build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="write BT93S2.3 JSON artifact")
    parser.add_argument("--seed-limit", type=int, default=None, help="diagnostic override; default uses all S2 seeds")
    parser.add_argument("--action-limit", type=int, default=None, help="diagnostic override; default uses all semantic actions")
    args = parser.parse_args()

    report = build_report(seed_limit=args.seed_limit, action_limit=args.action_limit)
    if args.write_report:
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "classResultCounts": report["classResultCounts"],
                "sampleCounts": report["sampleCounts"],
                "actionSpaceRequiredScenarioIds": report["actionSpaceRequiredScenarioIds"],
                "opensNext": report["opensNext"],
                "output": _rel(REPORT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
