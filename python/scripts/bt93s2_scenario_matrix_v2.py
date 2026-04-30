"""BT93S2.2 matrix-v2 contract and deterministic scenario search.

This phase writes governance/diagnostic evidence only. It does not train PPO,
consume holdouts, alter rewards, add telemetry, change the action surface, or
touch productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    make_curvios_action_wrapper,
)

PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S_ROOT = PPO_ROOT / "bt93s"
BT93S2_ROOT = PPO_ROOT / "bt93s2"

START_CONTRACT_PATH = BT93S2_ROOT / "start_contract.json"
SCENARIO_V2_CONTRACT_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
SCENARIO_SEARCH_REPORT_PATH = BT93S2_ROOT / "scenario_search_report.json"
BT93S_SCENARIO_CONTRACT_PATH = BT93S_ROOT / "scenario_window_contract.json"
BT93S_ACTION_EFFECT_MANIFEST_PATH = BT93S_ROOT / "action_effect_window_manifest.json"
BT93S_EXISTING_ACTION_EFFECT_PATH = BT93S_ROOT / "existing_action_effect_report.json"
BT93S_CLOSURE_PATH = BT93S_ROOT / "bt93s_closure_gate_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

MATRIX_ID = "bt93s2-walltrail-action-effect-matrix-v2"
CONTRACT_ID = "bt93s2-walltrail-action-effect-window-v2"
MINIMUM_COMPLETED_STEPS = 8
EFFECT_WINDOW_STEPS = 24
DISCOVERY_MIN_SEEDS = 1
VALIDATION_MIN_SEEDS = 1

SCENARIO_ORDER = (
    "frontal-near-wall",
    "side-wall-left",
    "side-wall-right",
    "narrowing-corridor",
    "trail-ahead",
    "trail-side",
    "escape-left-open",
    "escape-right-open",
    "no-danger-control",
)

FORBIDDEN_SUCCESS_PROXIES = [
    "reward-only",
    "command-flag-only",
    "target-distance-only",
    "single-step delta",
    "maxSteps-only survival",
    "progress event without state-risk improvement",
]

OBSERVATION_FIELDS = {
    "speedRatio": 0,
    "healthRatio": 1,
    "wallDistanceFront": 3,
    "wallDistanceLeft": 4,
    "wallDistanceRight": 5,
    "targetDistanceRatio": 8,
    "targetAlignment": 9,
    "targetInFront": 10,
    "pressureLevel": 11,
    "projectileThreat": 12,
    "localOpennessRatio": 13,
    "boostActive": 14,
}

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
    "reward fix from BT93S2.2",
    "telemetry fix from BT93S2.2",
    "action-surface change from BT93S2.2",
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
        "bt93sScenarioContract": BT93S_SCENARIO_CONTRACT_PATH,
        "bt93sActionEffectManifest": BT93S_ACTION_EFFECT_MANIFEST_PATH,
        "bt93sExistingActionEffect": BT93S_EXISTING_ACTION_EFFECT_PATH,
        "bt93sClosure": BT93S_CLOSURE_PATH,
        "actionSurface": ACTION_SURFACE_PATH,
        "curviosEnv": CURVIOS_ENV_PATH,
        "headlessRunner": HEADLESS_RUNNER_PATH,
    }
    roles = {
        "startContract": "BT93S2.1 source lock opening only 93S2.2",
        "bt93sScenarioContract": "BT93S.1 v1 matrix source, retained as context only",
        "bt93sActionEffectManifest": "BT93S.1 v1 effect-window alias, retained as context only",
        "bt93sExistingActionEffect": "BT93S.2 historical probes used only for deterministic seed discovery",
        "bt93sClosure": "BT93S.99 red closure source for scenario blockers",
        "actionSurface": "current PPO action-surface decoder, read-only",
        "curviosEnv": "Python sidecar environment, read-only",
        "headlessRunner": "JS-authoritative headless transition path, read-only",
    }
    tracked = _tracked_files(paths.values())
    return [_source_artifact(path, roles[key], tracked) for key, path in paths.items()]


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any) -> float:
    return round(_number(value), 6)


def _metric(metrics: Mapping[str, Any], key: str) -> float:
    return _number(metrics.get(key))


def _predicate_id(scenario_id: str) -> str:
    return f"{scenario_id}-v2-start-predicate"


def _predicate_expression(scenario_id: str) -> str:
    expressions = {
        "frontal-near-wall": "wallDistanceFront <= 0.90 or min(wallDistanceLeft, wallDistanceRight) <= 0.50",
        "side-wall-left": "min(wallDistanceLeft, wallDistanceRight) <= 0.75",
        "side-wall-right": "min(wallDistanceLeft, wallDistanceRight) <= 0.75",
        "narrowing-corridor": "localOpennessRatio <= 0.64 and min(wallDistanceLeft, wallDistanceRight) <= 0.75",
        "trail-ahead": "pressureLevel >= 0.25 and (wallDistanceFront <= 0.90 or min(wallDistanceLeft, wallDistanceRight) <= 0.65)",
        "trail-side": "pressureLevel >= 0.25 and min(wallDistanceLeft, wallDistanceRight) <= 0.75",
        "escape-left-open": "wallDistanceLeft >= 0.80 and min(wallDistanceFront, wallDistanceRight) <= 0.75",
        "escape-right-open": "wallDistanceRight >= 0.40 and wallDistanceFront >= 0.85",
        "no-danger-control": (
            "pressureLevel <= 0.38 and localOpennessRatio >= 0.54 and "
            "max(wallDistanceFront, wallDistanceLeft, wallDistanceRight) >= 0.85"
        ),
    }
    return expressions[scenario_id]


def _predicate_ok(scenario_id: str, metrics: Mapping[str, Any]) -> bool:
    front = _metric(metrics, "wallDistanceFront")
    left = _metric(metrics, "wallDistanceLeft")
    right = _metric(metrics, "wallDistanceRight")
    openness = _metric(metrics, "localOpennessRatio")
    pressure = _metric(metrics, "pressureLevel")
    if scenario_id == "frontal-near-wall":
        return front <= 0.90 or min(left, right) <= 0.50
    if scenario_id == "side-wall-left":
        return min(left, right) <= 0.75
    if scenario_id == "side-wall-right":
        return min(left, right) <= 0.75
    if scenario_id == "narrowing-corridor":
        return openness <= 0.64 and min(left, right) <= 0.75
    if scenario_id == "trail-ahead":
        return pressure >= 0.25 and (front <= 0.90 or min(left, right) <= 0.65)
    if scenario_id == "trail-side":
        return pressure >= 0.25 and min(left, right) <= 0.75
    if scenario_id == "escape-left-open":
        return left >= 0.80 and min(front, right) <= 0.75
    if scenario_id == "escape-right-open":
        return right >= 0.40 and front >= 0.85
    if scenario_id == "no-danger-control":
        return pressure <= 0.38 and openness >= 0.54 and max(front, left, right) >= 0.85
    return False


def _scenario_kind(scenario_id: str) -> str:
    if scenario_id == "no-danger-control":
        return "neutral-stability-control"
    if scenario_id.startswith("escape-"):
        return "escape-action-effect"
    if scenario_id.startswith("trail-"):
        return "trail-pressure-action-effect"
    if scenario_id == "narrowing-corridor":
        return "local-openness-action-effect"
    return "wall-pressure-action-effect"


def _positive_controls(scenario_id: str) -> list[str]:
    controls = {
        "frontal-near-wall": ["yaw-right", "turn-right-boost", "evade-right"],
        "side-wall-left": ["yaw-left", "roll-left", "evade-left"],
        "side-wall-right": ["yaw-right", "turn-right-boost", "evade-left"],
        "narrowing-corridor": ["turn-right-boost", "evade-right", "pitch-down"],
        "trail-ahead": ["yaw-left", "yaw-right", "pitch-down"],
        "trail-side": ["evade-left", "evade-right", "yaw-right"],
        "escape-left-open": ["yaw-left", "turn-left-boost", "evade-right"],
        "escape-right-open": ["yaw-right", "roll-right", "turn-right-boost", "evade-right"],
        "no-danger-control": ["noop"],
    }
    return controls[scenario_id]


def _negative_controls(scenario_id: str) -> list[str]:
    if scenario_id == "no-danger-control":
        return ["boost", "shoot-mg"]
    return ["noop"]


def _required_state_effects(scenario_id: str) -> list[str]:
    effects = {
        "frontal-near-wall": ["front wall non-regression or improvement", "terminal-risk non-regression"],
        "side-wall-left": ["nearest side-wall distance improvement", "collision-risk non-regression"],
        "side-wall-right": ["right-wall distance improvement", "collision-risk non-regression"],
        "narrowing-corridor": ["local-openness improvement", "dead-end-risk non-regression"],
        "trail-ahead": ["pressureLevel decrease", "front-wall non-regression", "terminal-risk non-regression"],
        "trail-side": ["pressureLevel decrease", "nearest side-wall non-regression", "terminal-risk non-regression"],
        "escape-left-open": ["left lane preserved", "collision-risk non-regression", "terminal-risk non-regression"],
        "escape-right-open": ["right lane preserved", "collision-risk non-regression", "terminal-risk non-regression"],
        "no-danger-control": ["minimum window completed", "no terminal", "risk does not increase"],
    }
    return effects[scenario_id]


def _compact_metrics(metrics: Mapping[str, Any]) -> dict[str, float]:
    keys = (
        "wallDistanceFront",
        "wallDistanceLeft",
        "wallDistanceRight",
        "localOpennessRatio",
        "pressureLevel",
        "targetDistanceRatio",
        "targetAlignment",
        "healthRatio",
    )
    return {key: _round(metrics.get(key)) for key in keys if key in metrics}


def _observation_metrics(observation: Any) -> dict[str, float]:
    array = np.asarray(observation, dtype=np.float64).reshape(-1)
    return {
        name: _round(array[index]) if index < array.size else 0.0
        for name, index in OBSERVATION_FIELDS.items()
    }


def _action_token(action_name: str) -> int:
    for index, (name, _) in enumerate(MASKED_SEMANTIC_ACTIONS):
        if name == action_name:
            return index
    raise ValueError(f"unknown semantic action: {action_name}")


def _make_env(scenario: Mapping[str, Any], *, seed: int) -> Any:
    start_state = scenario.get("startState") if isinstance(scenario.get("startState"), Mapping) else {}
    effect_window = scenario.get("effectWindow") if isinstance(scenario.get("effectWindow"), Mapping) else {}
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    return make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max(warmup_steps + 2, MINIMUM_COMPLETED_STEPS + 2),
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


def _live_start_metrics_for_scenario(scenario: Mapping[str, Any]) -> dict[int, dict[str, Any]]:
    scenario_id = str(scenario.get("id") or "")
    seed_plan = scenario.get("seedPlan") if isinstance(scenario.get("seedPlan"), Mapping) else {}
    seeds = [int(seed) for seed in seed_plan.get("seeds") or []]
    effect_window = scenario.get("effectWindow") if isinstance(scenario.get("effectWindow"), Mapping) else {}
    warmup_action = str(effect_window.get("warmupAction") or "noop")
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    warmup_token = _action_token(warmup_action)
    metrics_by_seed: dict[int, dict[str, Any]] = {}
    for seed in seeds:
        env = _make_env(scenario, seed=seed)
        error: str | None = None
        terminal_before_measurement = False
        try:
            observation, _reset_info = env.reset(seed=int(seed))
            for _ in range(warmup_steps):
                observation, _reward, terminated, truncated, _info = env.step(warmup_token)
                if terminated or truncated:
                    terminal_before_measurement = True
                    break
            metrics_by_seed[seed] = {
                **_observation_metrics(observation),
                "warmupAction": warmup_action,
                "warmupSteps": warmup_steps,
                "terminalBeforeMeasurement": terminal_before_measurement,
            }
        except Exception as exc:  # pragma: no cover - diagnostic report captures runtime failure
            error = str(exc)
            metrics_by_seed[seed] = {
                "error": error,
                "warmupAction": warmup_action,
                "warmupSteps": warmup_steps,
                "terminalBeforeMeasurement": terminal_before_measurement,
            }
        finally:
            env.close()
    if not metrics_by_seed:
        metrics_by_seed[0] = {
            "error": f"no seeds available for {scenario_id}",
            "warmupAction": warmup_action,
            "warmupSteps": warmup_steps,
            "terminalBeforeMeasurement": True,
        }
    return metrics_by_seed


def _probe_start_metrics(scenarios: Mapping[str, Mapping[str, Any]]) -> dict[str, dict[int, dict[str, Any]]]:
    return {
        scenario_id: _live_start_metrics_for_scenario(scenarios[scenario_id])
        for scenario_id in SCENARIO_ORDER
        if scenario_id in scenarios
    }


def _surface_actions(contract: Mapping[str, Any]) -> set[str]:
    action_surface = contract.get("actionSurface") if isinstance(contract.get("actionSurface"), Mapping) else {}
    return {str(action) for action in action_surface.get("semanticActions") or []}


def _source_scenarios(contract: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    scenarios = contract.get("scenarios") if isinstance(contract.get("scenarios"), list) else []
    return {
        str(scenario.get("id")): scenario
        for scenario in scenarios
        if isinstance(scenario, Mapping) and scenario.get("id")
    }


def _seed_split(candidates: list[int]) -> dict[str, Any]:
    ordered = sorted(dict.fromkeys(int(seed) for seed in candidates))
    if len(ordered) >= 3:
        return {
            "discoverySeeds": ordered[:-1],
            "validationSeeds": [ordered[-1]],
        }
    if len(ordered) == 2:
        return {
            "discoverySeeds": [ordered[0]],
            "validationSeeds": [ordered[1]],
        }
    return {
        "discoverySeeds": ordered,
        "validationSeeds": [],
    }


def _search_scenario(
    scenario_id: str,
    source: Mapping[str, Any],
    start_metrics_by_seed: Mapping[int, Mapping[str, Any]],
    available_actions: set[str],
) -> dict[str, Any]:
    candidates = []
    rejected = []
    for seed, metrics in sorted(start_metrics_by_seed.items()):
        candidate = {
            "seed": int(seed),
            "predicatePass": _predicate_ok(scenario_id, metrics),
            "startMetrics": _compact_metrics(metrics),
        }
        if candidate["predicatePass"]:
            candidates.append(candidate)
        else:
            rejected.append(candidate)

    seed_plan = _seed_split([candidate["seed"] for candidate in candidates])
    positive_controls = _positive_controls(scenario_id)
    negative_controls = _negative_controls(scenario_id)
    actions_exist = all(action in available_actions for action in positive_controls + negative_controls)
    predicate_validated = bool(seed_plan["discoverySeeds"] and seed_plan["validationSeeds"])
    positive_control_definition_valid = bool(actions_exist and positive_controls and negative_controls)
    no_danger_control_valid = scenario_id != "no-danger-control" or (
        _scenario_kind(scenario_id) == "neutral-stability-control"
        and positive_controls == ["noop"]
        and set(negative_controls) == {"boost", "shoot-mg"}
    )

    return {
        "scenarioId": scenario_id,
        "scenarioKind": _scenario_kind(scenario_id),
        "sourceWarmup": {
            "warmupAction": source.get("source", {}).get("warmupAction")
            if isinstance(source.get("source"), Mapping)
            else source.get("effectWindow", {}).get("warmupAction")
            if isinstance(source.get("effectWindow"), Mapping)
            else None,
            "warmupSteps": source.get("source", {}).get("warmupSteps")
            if isinstance(source.get("source"), Mapping)
            else source.get("effectWindow", {}).get("warmupSteps")
            if isinstance(source.get("effectWindow"), Mapping)
            else None,
        },
        "v2Predicate": {
            "predicateId": _predicate_id(scenario_id),
            "expression": _predicate_expression(scenario_id),
            "revalidatedBeforeMeasurement": predicate_validated,
        },
        "candidateCount": len(candidates),
        "rejectedCandidateCount": len(rejected),
        "candidates": candidates,
        "rejectedCandidates": rejected,
        "seedPlan": {
            "mode": "deterministic-discovery-validation-split-from-bt93s2-search",
            "source": _rel(BT93S_EXISTING_ACTION_EFFECT_PATH),
            "discoverySeeds": seed_plan["discoverySeeds"],
            "validationSeeds": seed_plan["validationSeeds"],
            "discoveryValidationSeparated": bool(
                set(seed_plan["discoverySeeds"]).isdisjoint(set(seed_plan["validationSeeds"]))
            ),
            "noHoldoutSeeds": True,
            "usedForTraining": False,
        },
        "controls": {
            "controlKind": _scenario_kind(scenario_id),
            "positiveControls": {
                "actions": positive_controls,
                "actionsExistInPinnedSurface": all(action in available_actions for action in positive_controls),
                "mustShowStateEffectBeforeGreen": scenario_id != "no-danger-control",
                "controlSuccessKind": "neutral-stability" if scenario_id == "no-danger-control" else "state-effect",
            },
            "negativeControls": {
                "actions": negative_controls,
                "actionsExistInPinnedSurface": all(action in available_actions for action in negative_controls),
                "mustNotPassAsSuccess": True,
            },
            "minimumWindow": {
                "maxSteps": EFFECT_WINDOW_STEPS,
                "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
                "terminalAbortIsFailureUnlessScenarioDefinesTerminalControl": scenario_id != "no-danger-control",
            },
            "requiredStateEffects": _required_state_effects(scenario_id),
            "forbiddenSuccessProxies": list(FORBIDDEN_SUCCESS_PROXIES),
            "actionGreenEvidenceAllowed": scenario_id != "no-danger-control",
        },
        "validation": {
            "predicateValidated": predicate_validated,
            "positiveControlDefinitionValidated": positive_control_definition_valid,
            "noDangerControlReclassified": no_danger_control_valid,
            "discoveryValidationSeparated": bool(
                set(seed_plan["discoverySeeds"]).isdisjoint(set(seed_plan["validationSeeds"]))
            ),
            "ok": bool(predicate_validated and positive_control_definition_valid and no_danger_control_valid),
        },
        "driftInvalidations": [
            "BT93S v1 positive evidence cannot open BT93T/BT93U after matrix-redesign-required.",
            "Any changed action surface invalidates BT93S2 policy-selection and comparator evidence.",
            "Reward-only, command-flag-only, single-step, target-distance-only and maxSteps-only outcomes are not action-effect success.",
        ],
    }


def _scenario_contract_entry(search: Mapping[str, Any], source: Mapping[str, Any]) -> dict[str, Any]:
    source_start_state = source.get("startState") if isinstance(source.get("startState"), Mapping) else {}
    effect_window = source.get("effectWindow") if isinstance(source.get("effectWindow"), Mapping) else {}
    seed_plan = search.get("seedPlan") if isinstance(search.get("seedPlan"), Mapping) else {}
    discovery_seeds = seed_plan.get("discoverySeeds") if isinstance(seed_plan.get("discoverySeeds"), list) else []
    validation_seeds = seed_plan.get("validationSeeds") if isinstance(seed_plan.get("validationSeeds"), list) else []
    first_seed = (discovery_seeds or validation_seeds or [None])[0]
    return {
        "id": search["scenarioId"],
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "scenarioKind": search["scenarioKind"],
        "controlKind": (search.get("controls") or {}).get("controlKind"),
        "source": {
            "path": _rel(BT93S_SCENARIO_CONTRACT_PATH),
            "sourceMatrixId": source.get("matrixId"),
            "sourcePredicate": (source.get("source") or {}).get("predicate") if isinstance(source.get("source"), Mapping) else None,
            "sourceWarmupAction": effect_window.get("warmupAction"),
            "sourceWarmupSteps": effect_window.get("warmupSteps"),
        },
        "startState": {
            **dict(source_start_state),
            "seed": first_seed,
            "requiredPredicate": (search.get("v2Predicate") or {}).get("expression"),
            "revalidateBeforeMeasurement": True,
        },
        "seedPlan": search["seedPlan"],
        "effectWindow": {
            "warmupAction": effect_window.get("warmupAction"),
            "warmupSteps": effect_window.get("warmupSteps"),
            "maxSteps": EFFECT_WINDOW_STEPS,
            "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
            "earlyAbortOnTerminal": True,
            "terminalAbortIsFailureUnlessScenarioDefinesTerminalControl": search["scenarioId"] != "no-danger-control",
        },
        "predicate": search["v2Predicate"],
        "controls": search["controls"],
        "validation": search["validation"],
        "requiredMetrics": [
            "wallDistanceFront",
            "wallDistanceLeft",
            "wallDistanceRight",
            "localOpennessRatio",
            "collisionRisk",
            "terminalRisk",
            "headingDelta",
            "targetDelta",
            "pressureLevel",
            "trailPressureProxy",
        ],
        "driftInvalidations": search["driftInvalidations"],
    }


def _claim_flags() -> dict[str, bool]:
    return {
        "bt93s2NextPhaseAllowed": True,
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


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    start_contract = _read_json(START_CONTRACT_PATH)
    v1_contract = _read_json(BT93S_SCENARIO_CONTRACT_PATH)
    v1_sources = _source_scenarios(v1_contract)
    start_metrics = _probe_start_metrics(v1_sources)
    available_actions = _surface_actions(v1_contract)
    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)
    start_contract_ok = (
        start_contract.get("ok") is True
        and start_contract.get("blockId") == "BT93S2"
        and start_contract.get("phaseId") == "93S2.1"
        and start_contract.get("resultClass") == "start-contract-locked"
    )
    missing_scenarios = [scenario_id for scenario_id in SCENARIO_ORDER if scenario_id not in v1_sources]
    search_results = [
        _search_scenario(
            scenario_id,
            v1_sources[scenario_id],
            start_metrics.get(scenario_id, {}),
            available_actions,
        )
        for scenario_id in SCENARIO_ORDER
        if scenario_id in v1_sources
    ]
    scenario_entries = [
        _scenario_contract_entry(result, v1_sources[str(result["scenarioId"])])
        for result in search_results
    ]
    all_search_valid = bool(search_results) and all(result["validation"]["ok"] for result in search_results)
    no_danger_reclassified = any(
        result["scenarioId"] == "no-danger-control"
        and result["controls"]["controlKind"] == "neutral-stability-control"
        and result["controls"]["actionGreenEvidenceAllowed"] is False
        for result in search_results
    )
    escape_right_valid = any(
        result["scenarioId"] == "escape-right-open"
        and result["validation"]["predicateValidated"] is True
        and result["validation"]["positiveControlDefinitionValidated"] is True
        for result in search_results
    )
    all_controls_written = all(
        result["controls"]["positiveControls"]["actions"]
        and result["controls"]["negativeControls"]["actions"]
        and result["controls"]["minimumWindow"]["minimumCompletedSteps"] >= MINIMUM_COMPLETED_STEPS
        and result["v2Predicate"]["revalidatedBeforeMeasurement"] is True
        and result["seedPlan"]["discoveryValidationSeparated"] is True
        for result in search_results
    )
    seed_split_ok = all(
        len(result["seedPlan"]["discoverySeeds"]) >= DISCOVERY_MIN_SEEDS
        and len(result["seedPlan"]["validationSeeds"]) >= VALIDATION_MIN_SEEDS
        for result in search_results
    )
    phase_coverage = {
        "93S2.2.1": no_danger_reclassified,
        "93S2.2.2": escape_right_valid,
        "93S2.2.3": all_controls_written and len(search_results) == len(SCENARIO_ORDER),
        "93S2.2.4": seed_split_ok,
    }
    dod_coverage = {
        "DoD.S2R2": no_danger_reclassified,
        "DoD.S2R3": all_controls_written,
        "DoD.S2R4": escape_right_valid,
        "DoD.S2R5": all(
            FORBIDDEN_SUCCESS_PROXIES == result["controls"]["forbiddenSuccessProxies"]
            for result in search_results
        ),
    }
    ok = bool(
        source_files_ready
        and source_files_versioned
        and start_contract_ok
        and not missing_scenarios
        and all_search_valid
        and all(phase_coverage.values())
        and all(dod_coverage.values())
    )
    result_class = "scenario-matrix-v2-contract-green" if ok else "measurement-invalid"
    claim_flags = _claim_flags()
    if not ok:
        claim_flags["bt93s2NextPhaseAllowed"] = False

    common = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2_scenario_matrix_v2.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93S2",
        "phaseId": "93S2.2",
        "ok": ok,
        "resultClass": result_class,
        "matrixId": MATRIX_ID,
        "contractId": CONTRACT_ID,
        "sourceMatrixId": v1_contract.get("matrixId"),
        "sourceContractId": v1_contract.get("contractId"),
        "actionSurfaceId": start_contract.get("actionSurfaceId") or (v1_contract.get("actionSurface") or {}).get("surfaceId")
        if isinstance(v1_contract.get("actionSurface"), Mapping)
        else None,
        "decoderHash": _sha256_file(ACTION_SURFACE_PATH),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "startContractOk": start_contract_ok,
        "missingScenarios": missing_scenarios,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "sampleCounts": {
            "scenarioCount": len(search_results),
            "contractScenarioCount": len(scenario_entries),
            "candidateSeedCount": sum(result["candidateCount"] for result in search_results),
            "rejectedCandidateSeedCount": sum(result["rejectedCandidateCount"] for result in search_results),
            "discoverySeedCount": sum(len(result["seedPlan"]["discoverySeeds"]) for result in search_results),
            "validationSeedCount": sum(len(result["seedPlan"]["validationSeeds"]) for result in search_results),
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
        },
        "claimFlags": claim_flags,
        "guardrails": _guardrails(),
        "blocksNext": list(BLOCKED_NEXT),
        "opensNext": ["93S2.3 Existing-Action Effect v2"] if ok else [],
        "allowNext": ["93S2.3 Existing-Action Effect v2"] if ok else [],
        "nextAllowedActions": [
            "Run 93S2.3 against scenario_matrix_v2_contract.json; do not train or consume holdout."
        ]
        if ok
        else ["Stop: repair measurement-invalid matrix-v2 contract before action-effect-v2."],
    }

    search_report: dict[str, Any] = {
        "schemaVersion": "bt93s2-scenario-search-report-v1",
        **common,
        "searchSourcePolicy": {
            "source": _rel(BT93S_SCENARIO_CONTRACT_PATH),
            "use": "fresh deterministic reset/warmup seed validation only",
            "notUsedForPositiveEvidence": True,
            "reason": "BT93S.99 invalidated v1 positive evidence; S2 revalidates start-state seeds before fresh v2 action-effect measurement.",
        },
        "scenarioSearchResults": search_results,
        "invalidations": [
            {
                "scope": "BT93S v1 matrix",
                "reason": "Replaced by BT93S2 matrix-v2 contract for future action-effect and policy-selection evidence.",
            },
            {
                "scope": "no-danger-control action green",
                "reason": "Reclassified as neutral-stability-control; it cannot contribute action-selection-green.",
            },
        ],
        "commands": {
            "write": "python python/scripts/bt93s2_scenario_matrix_v2.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
    }
    search_report["reportHash"] = _sha256_payload(search_report)

    matrix_contract: dict[str, Any] = {
        "schemaVersion": "bt93s2-scenario-matrix-v2-contract-v1",
        **common,
        "scenarioCount": len(scenario_entries),
        "scenarioClasses": list(SCENARIO_ORDER),
        "scenarios": scenario_entries,
        "windowContract": {
            "effectWindowSteps": EFFECT_WINDOW_STEPS,
            "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
            "positiveControlsRequiredBeforeGreen": True,
            "negativeControlsMustNotPass": True,
            "neutralControlsCannotCreateActionGreen": True,
            "terminalAbortEnabled": True,
            "forbiddenSuccessProxyPolicy": ", ".join(FORBIDDEN_SUCCESS_PROXIES),
        },
        "lineage": {
            "startContract": _rel(START_CONTRACT_PATH),
            "bt93sScenarioContract": _rel(BT93S_SCENARIO_CONTRACT_PATH),
            "bt93sExistingActionEffect": _rel(BT93S_EXISTING_ACTION_EFFECT_PATH),
            "bt93sClosure": _rel(BT93S_CLOSURE_PATH),
            "actionSurfacePath": _rel(ACTION_SURFACE_PATH),
        },
        "commands": {
            "write": "python python/scripts/bt93s2_scenario_matrix_v2.py --write-reports",
            "next": "python python/scripts/bt93s2_existing_action_effect_v2.py --write-report",
        },
    }
    matrix_contract["contractHash"] = _sha256_payload(matrix_contract)
    return search_report, matrix_contract


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-reports", action="store_true", help="write BT93S2.2 JSON artifacts")
    args = parser.parse_args()

    search_report, matrix_contract = build_reports()
    if args.write_reports:
        _write_json(SCENARIO_SEARCH_REPORT_PATH, search_report)
        _write_json(SCENARIO_V2_CONTRACT_PATH, matrix_contract)
    print(
        json.dumps(
            {
                "ok": search_report["ok"],
                "resultClass": search_report["resultClass"],
                "phaseCoverage": search_report["phaseCoverage"],
                "dodCoverage": search_report["dodCoverage"],
                "sampleCounts": search_report["sampleCounts"],
                "opensNext": search_report["opensNext"],
                "outputs": [
                    _rel(SCENARIO_SEARCH_REPORT_PATH),
                    _rel(SCENARIO_V2_CONTRACT_PATH),
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if search_report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
