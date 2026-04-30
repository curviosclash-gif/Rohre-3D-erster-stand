"""BT93S.2 existing-action effect measurement.

The report probes the pinned BT93S scenario-window contract with the current
masked semantic action surface. It is diagnostic-only: no PPO training,
candidate, holdout, reward fix, action-surface edit, or runtime integration is
started here.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

import numpy as np


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
    make_curvios_action_wrapper,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S_ROOT = PPO_ROOT / "bt93s"
SCENARIO_CONTRACT_PATH = BT93S_ROOT / "scenario_window_contract.json"
ACTION_EFFECT_MANIFEST_PATH = BT93S_ROOT / "action_effect_window_manifest.json"
REPORT_PATH = BT93S_ROOT / "existing_action_effect_report.json"

ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
BT93RR_HANDOVER_PATH = PPO_ROOT / "bt93r_reentry" / "bt93r_reentry_handover_package.json"

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

BLOCKED_ACTIONS = [
    "BT93O claim",
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
    "reward fix from BT93S.2",
    "telemetry fix from BT93S.2",
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


def _source(path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
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


def _source_artifacts() -> dict[str, Any]:
    paths = {
        "scenarioWindowContract": SCENARIO_CONTRACT_PATH,
        "actionEffectWindowManifest": ACTION_EFFECT_MANIFEST_PATH,
        "bt93rrHandover": BT93RR_HANDOVER_PATH,
        "actionSurface": ACTION_SURFACE_PATH,
        "curviosEnv": CURVIOS_ENV_PATH,
        "headlessRunner": HEADLESS_RUNNER_PATH,
    }
    roles = {
        "scenarioWindowContract": "BT93S.1 pinned scenario-window contract",
        "actionEffectWindowManifest": "BT93S.1 action-effect window alias",
        "bt93rrHandover": "BT93RR R-Allowlist handover opening only BT93S",
        "actionSurface": "current masked semantic PPO action surface",
        "curviosEnv": "Python sidecar environment",
        "headlessRunner": "JS-authoritative headless transition path",
    }
    tracked = _tracked_files(paths.values())
    return {key: _source(path, roles[key], tracked) for key, path in paths.items()}


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any) -> float:
    return round(_number(value), 6)


def _observation_metrics(observation: Any) -> dict[str, float]:
    array = np.asarray(observation, dtype=np.float64).reshape(-1)
    return {
        name: _round(array[index]) if index < array.size else 0.0
        for name, index in OBSERVATION_FIELDS.items()
    }


def _hybrid_safety(info: Mapping[str, Any]) -> Mapping[str, Any]:
    safety = info.get("hybridDecision")
    if isinstance(safety, Mapping):
        nested = safety.get("safety")
        if isinstance(nested, Mapping):
            return nested
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    hybrid = metadata.get("hybridDecision")
    nested = hybrid.get("safety") if isinstance(hybrid, Mapping) else None
    return nested if isinstance(nested, Mapping) else {}


def _risk(metrics: Mapping[str, Any], safety: Mapping[str, Any], *, terminal: bool = False) -> dict[str, float | bool]:
    collision = _number(safety.get("collisionRisk"))
    dead_end = _number(safety.get("deadEndRisk"))
    threat = _number(safety.get("threatHorizon"))
    terminal_risk = max(collision, dead_end, threat, 1.0 - _number(metrics.get("healthRatio")), 1.0 if terminal else 0.0)
    return {
        "collisionRisk": _round(collision),
        "deadEndRisk": _round(dead_end),
        "threatHorizon": _round(threat),
        "terminalRisk": _round(terminal_risk),
        "vetoActive": bool(safety.get("vetoActive")),
    }


def _episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _surface(info: Mapping[str, Any]) -> Mapping[str, Any]:
    surface = info.get("ppoActionSurface")
    return surface if isinstance(surface, Mapping) else {}


def _telemetry(info: Mapping[str, Any]) -> Mapping[str, Any]:
    telemetry = info.get("ppoActionTelemetry")
    return telemetry if isinstance(telemetry, Mapping) else {}


def _reward_breakdown(info: Mapping[str, Any]) -> Mapping[str, Any]:
    breakdown = info.get("rewardBreakdown")
    return breakdown if isinstance(breakdown, Mapping) else {}


def _action_token(action_name: str) -> int:
    for index, (name, _) in enumerate(MASKED_SEMANTIC_ACTIONS):
        if name == action_name:
            return index
    raise ValueError(f"unknown semantic action: {action_name}")


def _delta(initial: Mapping[str, Any], final: Mapping[str, Any]) -> dict[str, float]:
    return {key: _round(_number(final.get(key)) - _number(initial.get(key))) for key in OBSERVATION_FIELDS}


def _risk_delta(initial: Mapping[str, Any], final: Mapping[str, Any]) -> dict[str, float]:
    return {
        key: _round(_number(final.get(key)) - _number(initial.get(key)))
        for key in ("collisionRisk", "deadEndRisk", "threatHorizon", "terminalRisk")
    }


def _effect_metrics(deltas: Mapping[str, Any], risk_deltas: Mapping[str, Any]) -> dict[str, float]:
    return {
        "wallDistanceFront": _round(deltas.get("wallDistanceFront")),
        "wallDistanceLeft": _round(deltas.get("wallDistanceLeft")),
        "wallDistanceRight": _round(deltas.get("wallDistanceRight")),
        "localOpennessRatio": _round(deltas.get("localOpennessRatio")),
        "collisionRisk": _round(risk_deltas.get("collisionRisk")),
        "terminalRisk": _round(risk_deltas.get("terminalRisk")),
        "headingDelta": _round(deltas.get("targetAlignment")),
        "targetDelta": _round(-_number(deltas.get("targetDistanceRatio"))),
        "trailPressureProxy": _round(deltas.get("pressureLevel")),
    }


def _action_flags(surface: Mapping[str, Any]) -> dict[str, bool]:
    sanitized = surface.get("sanitizedAction")
    if not isinstance(sanitized, Mapping):
        return {}
    return {str(key): bool(value) for key, value in sanitized.items() if isinstance(value, bool) and value}


def _make_env(scenario: Mapping[str, Any], *, seed: int, action_name: str, repeat_steps: int) -> Any:
    start_state = scenario.get("startState") if isinstance(scenario.get("startState"), Mapping) else {}
    effect_window = scenario.get("effectWindow") if isinstance(scenario.get("effectWindow"), Mapping) else {}
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    return make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max(warmup_steps + repeat_steps + 2, repeat_steps + 2, int(effect_window.get("maxSteps") or 0) + 2),
            default_seed=int(seed),
            session_id=f"bt93s-existing-action-{scenario['id']}-{seed}-{action_name}",
            controller_timeout_seconds=8.0,
            reward_profile_id=str(start_state.get("rewardProfileId") or "bt93l-objective-reachability-v1"),
            map_key=str(start_state.get("mapKey") or "standard"),
            domain_mode=str(start_state.get("domainMode") or "classic-3d"),
            game_mode=str(start_state.get("gameMode") or "CLASSIC"),
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )


def _run_probe(scenario: Mapping[str, Any], *, seed: int, action_name: str, repeat_steps: int) -> dict[str, Any]:
    started = time.perf_counter()
    token = _action_token(action_name)
    effect_window = scenario.get("effectWindow") if isinstance(scenario.get("effectWindow"), Mapping) else {}
    warmup_action = str(effect_window.get("warmupAction") or "noop")
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    warmup_token = _action_token(warmup_action)
    env = _make_env(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
    error: str | None = None
    start_metrics: dict[str, Any] = {}
    start_risk: dict[str, Any] = {}
    final_metrics: dict[str, Any] = {}
    final_risk: dict[str, Any] = {}
    action_flag_counts: Counter[str] = Counter()
    progress_events: Counter[str] = Counter()
    objective_events: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    observed_steps = 0
    reward_total = 0.0
    terminal_observed = False
    last_telemetry: Mapping[str, Any] = {}
    first_step: dict[str, Any] | None = None
    final_step: dict[str, Any] | None = None
    try:
        observation, reset_info = env.reset(seed=int(seed))
        last_info: Mapping[str, Any] = reset_info
        for _ in range(warmup_steps):
            observation, _, terminated, truncated, last_info = env.step(warmup_token)
            if terminated or truncated:
                terminal_observed = True
                break
        start_metrics = _observation_metrics(observation)
        start_risk = _risk(start_metrics, _hybrid_safety(last_info), terminal=terminal_observed)
        if not terminal_observed:
            for step_index in range(repeat_steps):
                observation, reward, terminated, truncated, info = env.step(token)
                observed_steps += 1
                reward_total += _number(reward)
                final_metrics = _observation_metrics(observation)
                final_risk = _risk(final_metrics, _hybrid_safety(info), terminal=bool(terminated or truncated))
                surface = _surface(info)
                action_flag_counts.update(_action_flags(surface))
                semantics = _episode_semantics(info)
                reachability = semantics.get("objectiveReachability") if isinstance(semantics.get("objectiveReachability"), Mapping) else {}
                for event in reachability.get("progressEvents") or []:
                    progress_events[str(event)] += 1
                for event in reachability.get("objectiveEvents") or []:
                    objective_events[str(event)] += 1
                reason = info.get("terminalReason") or info.get("truncatedReason")
                if reason:
                    terminal_reasons[str(reason)] += 1
                last_telemetry = _telemetry(info)
                step_summary = {
                    "stepIndex": step_index,
                    "reward": _round(reward),
                    "terminated": bool(terminated),
                    "truncated": bool(truncated),
                    "terminalReason": info.get("terminalReason"),
                    "truncatedReason": info.get("truncatedReason"),
                    "metrics": final_metrics,
                    "risk": final_risk,
                    "semanticAction": surface.get("semanticAction"),
                    "commandFlags": sorted(_action_flags(surface)),
                    "telemetry": {
                        key: _round(last_telemetry.get(key))
                        for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate", "vetoRate", "preSamplingMaskRate")
                    },
                    "rewardBreakdown": {key: _round(value) for key, value in _reward_breakdown(info).items()},
                }
                if first_step is None:
                    first_step = step_summary
                final_step = step_summary
                if terminated or truncated:
                    terminal_observed = True
                    break
    except Exception as exc:  # pragma: no cover - diagnostic report captures runtime failure
        error = str(exc)
    finally:
        env.close()
    if not final_metrics:
        final_metrics = dict(start_metrics)
    if not final_risk:
        final_risk = dict(start_risk)
    deltas = _delta(start_metrics, final_metrics)
    risk_deltas = _risk_delta(start_risk, final_risk)
    return {
        "scenarioId": scenario.get("id"),
        "seed": int(seed),
        "actionName": action_name,
        "actionToken": token,
        "ok": error is None and bool(start_metrics) and (observed_steps >= 1 or terminal_observed),
        "error": error,
        "elapsedSeconds": _round(time.perf_counter() - started),
        "warmupAction": warmup_action,
        "warmupSteps": warmup_steps,
        "warmupTerminalBeforeAction": bool(terminal_observed and observed_steps == 0),
        "requestedRepeatSteps": repeat_steps,
        "observedSteps": observed_steps,
        "minimumCompletedSteps": int(effect_window.get("minimumCompletedSteps") or 0),
        "completedMinimumWindow": observed_steps >= int(effect_window.get("minimumCompletedSteps") or 0),
        "terminalObserved": terminal_observed,
        "terminalReasons": dict(sorted(terminal_reasons.items())),
        "startMetrics": start_metrics,
        "finalMetrics": final_metrics,
        "metricDeltas": deltas,
        "startRisk": start_risk,
        "finalRisk": final_risk,
        "riskDeltas": risk_deltas,
        "effectMetrics": _effect_metrics(deltas, risk_deltas),
        "rewardTotal": _round(reward_total),
        "commandFlagsObserved": dict(sorted(action_flag_counts.items())),
        "progressEventCounts": dict(sorted(progress_events.items())),
        "objectiveEventCounts": dict(sorted(objective_events.items())),
        "stepSamples": {
            "first": first_step,
            "final": final_step,
        },
        "safetyTelemetry": {
            key: _round(last_telemetry.get(key))
            for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate", "vetoRate", "preSamplingMaskRate")
        },
    }


def _wall_keys(scenario_id: str) -> tuple[str, ...]:
    return {
        "frontal-near-wall": ("wallDistanceFront",),
        "side-wall-left": ("wallDistanceLeft",),
        "side-wall-right": ("wallDistanceRight",),
        "narrowing-corridor": ("wallDistanceFront", "wallDistanceLeft", "wallDistanceRight"),
        "trail-ahead": ("wallDistanceFront",),
        "trail-side": ("wallDistanceLeft", "wallDistanceRight"),
        "escape-left-open": ("wallDistanceLeft",),
        "escape-right-open": ("wallDistanceRight",),
        "no-danger-control": ("wallDistanceFront", "wallDistanceLeft", "wallDistanceRight"),
    }.get(scenario_id, ("wallDistanceFront", "wallDistanceLeft", "wallDistanceRight"))


def _success_evaluation(scenario: Mapping[str, Any], probe: Mapping[str, Any]) -> dict[str, Any]:
    scenario_id = str(scenario.get("id") or "")
    action_name = str(probe.get("actionName") or "")
    controls = scenario.get("controls") if isinstance(scenario.get("controls"), Mapping) else {}
    positive_controls = controls.get("positiveControls") if isinstance(controls.get("positiveControls"), Mapping) else {}
    positive_actions = set(str(action) for action in positive_controls.get("actions") or [])
    deltas = probe.get("metricDeltas") if isinstance(probe.get("metricDeltas"), Mapping) else {}
    risk_deltas = probe.get("riskDeltas") if isinstance(probe.get("riskDeltas"), Mapping) else {}
    final_metrics = probe.get("finalMetrics") if isinstance(probe.get("finalMetrics"), Mapping) else {}
    terminal_observed = bool(probe.get("terminalObserved"))
    wall_delta = max(_number(deltas.get(key)) for key in _wall_keys(scenario_id))
    wall_rises = wall_delta > 0.02
    wall_non_regression = wall_delta >= -0.02
    local_openness_rises = _number(deltas.get("localOpennessRatio")) > 0.01
    local_openness_non_regression = _number(deltas.get("localOpennessRatio")) >= -0.01
    collision_sinks = _number(risk_deltas.get("collisionRisk")) < -0.01
    collision_non_regression = _number(risk_deltas.get("collisionRisk")) <= 0.02
    terminal_risk_sinks = _number(risk_deltas.get("terminalRisk")) < -0.01
    terminal_risk_stable = _number(risk_deltas.get("terminalRisk")) <= 0.0 and not terminal_observed
    pressure_sinks = _number(deltas.get("pressureLevel")) < -0.01
    pressure_non_regression = _number(deltas.get("pressureLevel")) <= 0.02
    heading_or_target_changed = abs(_number(deltas.get("targetAlignment"))) > 0.02 or abs(_number(deltas.get("targetDistanceRatio"))) > 0.02
    progress_or_objective = bool(probe.get("progressEventCounts") or probe.get("objectiveEventCounts"))
    command_flags = probe.get("commandFlagsObserved") if isinstance(probe.get("commandFlagsObserved"), Mapping) else {}
    command_flag_observed = bool(command_flags)
    stability_success = (
        not terminal_observed
        and local_openness_non_regression
        and pressure_non_regression
        and collision_non_regression
        and min(_number(final_metrics.get(key)) for key in _wall_keys(scenario_id)) >= 0.45
    )
    if scenario_id == "no-danger-control":
        success = stability_success and action_name in positive_actions
    elif scenario_id.startswith("side-wall") or scenario_id == "frontal-near-wall":
        success = (wall_rises or collision_sinks) and terminal_risk_stable
    elif scenario_id == "narrowing-corridor":
        success = (local_openness_rises or collision_sinks) and collision_non_regression and terminal_risk_stable
    elif scenario_id.startswith("trail-"):
        success = (pressure_sinks or wall_non_regression) and collision_non_regression and terminal_risk_stable
    elif scenario_id.startswith("escape-"):
        success = wall_non_regression and (collision_sinks or terminal_risk_sinks) and not terminal_observed
    else:
        success = (wall_rises or local_openness_rises or collision_sinks or pressure_sinks) and terminal_risk_stable

    state_effect_signals = [
        signal
        for signal, observed in (
            ("wallDistance", wall_rises),
            ("wallNonRegression", wall_non_regression and scenario_id.startswith(("trail-", "escape-"))),
            ("localOpenness", local_openness_rises),
            ("collisionRisk", collision_sinks),
            ("terminalRisk", terminal_risk_sinks or (terminal_risk_stable and scenario_id != "no-danger-control" and success)),
            ("trailPressureProxy", pressure_sinks),
            ("controlStability", scenario_id == "no-danger-control" and success),
        )
        if observed
    ]
    reward_total = _number(probe.get("rewardTotal"))
    reward_only_rejected = reward_total > 0 and not state_effect_signals and (heading_or_target_changed or progress_or_objective)
    command_flag_without_state_effect = command_flag_observed and not success and not state_effect_signals
    return {
        "success": bool(success),
        "stateEffectObserved": bool(success or state_effect_signals),
        "stateEffectSignals": state_effect_signals,
        "commandFlagObserved": command_flag_observed,
        "commandFlagWithoutStateEffect": command_flag_without_state_effect,
        "rewardOnlyRejected": bool(reward_only_rejected),
        "wallDistanceDelta": _round(wall_delta),
        "wallDistanceRises": wall_rises,
        "wallDistanceNonRegression": wall_non_regression,
        "localOpennessRises": local_openness_rises,
        "localOpennessNonRegression": local_openness_non_regression,
        "collisionRiskSinks": collision_sinks,
        "collisionRiskNonRegression": collision_non_regression,
        "terminalRiskSinks": terminal_risk_sinks,
        "terminalRiskStable": terminal_risk_stable,
        "trailPressureProxySinks": pressure_sinks,
        "trailPressureProxyNonRegression": pressure_non_regression,
        "headingOrTargetChanged": heading_or_target_changed,
        "progressOrObjectiveSignal": progress_or_objective,
        "terminalObserved": terminal_observed,
    }


def _classify_action_results(
    scenario: Mapping[str, Any],
    action_results: Mapping[str, list[Mapping[str, Any]]],
) -> dict[str, Any]:
    scenario_id = str(scenario.get("id") or "")
    controls = scenario.get("controls") if isinstance(scenario.get("controls"), Mapping) else {}
    positive_controls = controls.get("positiveControls") if isinstance(controls.get("positiveControls"), Mapping) else {}
    negative_controls = controls.get("negativeControls") if isinstance(controls.get("negativeControls"), Mapping) else {}
    positive_actions = set(str(action) for action in positive_controls.get("actions") or [])
    negative_actions = set(str(action) for action in negative_controls.get("actions") or [])
    classified: dict[str, Any] = {}
    successful_actions: list[str] = []
    weak_actions: list[str] = []
    for action_name, probes in action_results.items():
        success_count = sum(1 for probe in probes if probe.get("successEvaluation", {}).get("success") is True)
        state_effect_count = sum(1 for probe in probes if probe.get("successEvaluation", {}).get("stateEffectObserved") is True)
        command_weak_count = sum(
            1 for probe in probes if probe.get("successEvaluation", {}).get("commandFlagWithoutStateEffect") is True
        )
        ok_count = sum(1 for probe in probes if probe.get("ok") is True)
        if scenario_id == "no-danger-control" and action_name in positive_actions and success_count == ok_count:
            action_class = "negative-control-stable"
        elif success_count > 0:
            action_class = "existing-action-effect-observed"
            successful_actions.append(action_name)
        elif command_weak_count > 0 or (action_name not in negative_actions and action_name != "noop"):
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
                    "effectMetrics": probe.get("effectMetrics"),
                    "successEvaluation": probe.get("successEvaluation"),
                    "safetyTelemetry": probe.get("safetyTelemetry"),
                }
                for probe in probes
            ],
        }
    positive_control_pass = any(action in successful_actions for action in positive_actions) if positive_actions else True
    negative_control_failed = any(action in successful_actions for action in negative_actions)
    if scenario_id == "no-danger-control":
        if negative_control_failed:
            class_result = "measurement-invalid"
        elif positive_control_pass:
            class_result = "negative-control-stable"
        else:
            class_result = "matrix-redesign-required"
    elif negative_control_failed:
        class_result = "measurement-invalid"
    elif successful_actions:
        class_result = "existing-action-effect-observed"
    else:
        class_result = "action-effect-weak"
    return {
        "scenarioId": scenario_id,
        "classResult": class_result,
        "existingActionCanRescue": bool(successful_actions),
        "successfulActions": sorted(successful_actions),
        "weakActions": sorted(weak_actions),
        "positiveControlActions": sorted(positive_actions),
        "positiveControlPass": positive_control_pass,
        "negativeControlActions": sorted(negative_actions),
        "negativeControlFailed": negative_control_failed,
        "telemetryLimit": (controls.get("expectedStateEffect") or {}).get("telemetryLimit")
        if isinstance(controls.get("expectedStateEffect"), Mapping)
        else None,
        "actionResults": classified,
    }


def _aggregate_action_classes(scenario_results: Mapping[str, Any]) -> dict[str, Any]:
    action_summary: dict[str, dict[str, Any]] = {
        name: {
            "observedScenarioCount": 0,
            "stateEffectScenarioCount": 0,
            "weakScenarioCount": 0,
            "successfulScenarioIds": [],
            "weakScenarioIds": [],
        }
        for name, _ in MASKED_SEMANTIC_ACTIONS
    }
    for scenario_id, result in scenario_results.items():
        for action_name, action_result in (result.get("actionResults") or {}).items():
            if action_name not in action_summary:
                continue
            action_summary[action_name]["observedScenarioCount"] += 1
            if action_result.get("successCount", 0) > 0:
                action_summary[action_name]["stateEffectScenarioCount"] += 1
                action_summary[action_name]["successfulScenarioIds"].append(scenario_id)
            if action_result.get("commandFlagWeakCount", 0) > 0 or action_result.get("actionEffectClass") == "action-effect-weak":
                action_summary[action_name]["weakScenarioCount"] += 1
                action_summary[action_name]["weakScenarioIds"].append(scenario_id)
    return {
        action: {
            **summary,
            "classification": "state-effect-observed" if summary["stateEffectScenarioCount"] > 0 else "action-effect-weak",
            "successfulScenarioIds": sorted(summary["successfulScenarioIds"]),
            "weakScenarioIds": sorted(summary["weakScenarioIds"]),
        }
        for action, summary in action_summary.items()
    }


def build_report(*, seed_limit: int | None = None, action_limit: int | None = None) -> dict[str, Any]:
    contract = _read_json(SCENARIO_CONTRACT_PATH)
    scenarios = contract.get("scenarios") if isinstance(contract.get("scenarios"), list) else []
    actions = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    if action_limit is not None:
        actions = actions[: max(1, int(action_limit))]
    probes: list[dict[str, Any]] = []
    scenario_results: dict[str, Any] = {}
    repeat_steps_by_scenario: dict[str, int] = {}
    seed_counts_by_scenario: dict[str, int] = {}
    for scenario in scenarios:
        if not isinstance(scenario, Mapping):
            continue
        scenario_id = str(scenario.get("id") or "")
        effect_window = scenario.get("effectWindow") if isinstance(scenario.get("effectWindow"), Mapping) else {}
        repeat_steps = int(effect_window.get("maxSteps") or 24)
        repeat_steps_by_scenario[scenario_id] = repeat_steps
        seed_plan = scenario.get("seedPlan") if isinstance(scenario.get("seedPlan"), Mapping) else {}
        seeds = [int(seed) for seed in seed_plan.get("seeds") or []]
        if seed_limit is not None:
            seeds = seeds[: max(1, int(seed_limit))]
        seed_counts_by_scenario[scenario_id] = len(seeds)
        action_results: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
        for seed in seeds:
            for action_name in actions:
                probe = _run_probe(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
                probe["successEvaluation"] = _success_evaluation(scenario, probe)
                probes.append(probe)
                action_results[action_name].append(probe)
        scenario_results[scenario_id] = _classify_action_results(scenario, action_results)

    class_counts = Counter(result.get("classResult") for result in scenario_results.values())
    telemetry_limited_scenarios = [
        scenario_id for scenario_id, result in scenario_results.items() if result.get("telemetryLimit")
    ]
    source_artifacts = _source_artifacts()
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    all_probes_ok = bool(probes) and all(probe.get("ok") is True for probe in probes)
    minimum_window_failure_count = sum(1 for probe in probes if probe.get("completedMinimumWindow") is not True)
    required_metrics_written = all(
        all(metric in (probe.get("effectMetrics") or {}) for metric in REQUIRED_EFFECT_METRICS)
        for probe in probes
    )
    weak_classifications_written = any(
        action.get("actionEffectClass") == "action-effect-weak"
        for result in scenario_results.values()
        for action in (result.get("actionResults") or {}).values()
    )
    phase_coverage = {
        "DoD.S2": required_metrics_written and all_probes_ok,
        "93S.2.1": all_probes_ok and len(scenario_results) == len(scenarios),
        "93S.2.2": weak_classifications_written,
    }
    if not source_files_ready or not source_files_versioned or not all_probes_ok or class_counts.get("measurement-invalid"):
        result_class = "measurement-invalid"
    elif class_counts.get("matrix-redesign-required"):
        result_class = "matrix-redesign-required"
    elif class_counts.get("action-effect-weak"):
        result_class = "action-effect-weak"
    else:
        result_class = "existing-action-effect-measured"
    ok = bool(source_files_ready and source_files_versioned and all(phase_coverage.values()))
    action_summary = _aggregate_action_classes(scenario_results)
    payload: dict[str, Any] = {
        "schemaVersion": "bt93s-existing-action-effect-report-v1",
        "blockId": "BT93S",
        "phaseId": "93S.2",
        "resultClass": result_class,
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s_existing_action_effect.py",
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "matrixId": contract.get("matrixId"),
        "contractId": contract.get("contractId"),
        "actionSurfaceId": (contract.get("actionSurface") or {}).get("surfaceId")
        if isinstance(contract.get("actionSurface"), Mapping)
        else PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "decoderHash": (contract.get("actionSurface") or {}).get("decoderHash")
        if isinstance(contract.get("actionSurface"), Mapping)
        else _sha256_file(ACTION_SURFACE_PATH),
        "lineage": contract.get("lineage") if isinstance(contract.get("lineage"), Mapping) else {},
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "thresholdsLockedBeforeRun": {
            "source": _rel(SCENARIO_CONTRACT_PATH),
            "effectWindowStepsByScenario": repeat_steps_by_scenario,
            "minimumCompletedSteps": sorted(
                {
                    int((scenario.get("effectWindow") or {}).get("minimumCompletedSteps") or 0)
                    for scenario in scenarios
                    if isinstance(scenario, Mapping)
                }
            ),
            "wallDistanceRise": "> 0.02",
            "wallDistanceNonRegression": ">= -0.02 for trail/escape classes",
            "localOpennessRise": "> 0.01",
            "localOpennessNonRegression": ">= -0.01",
            "collisionRiskSink": "< -0.01",
            "collisionRiskNonRegression": "<= 0.02",
            "terminalRiskSink": "< -0.01",
            "terminalRiskStable": "<= 0 and no terminal/truncation",
            "trailPressureProxySink": "pressureLevel delta < -0.01",
            "forbiddenSuccessProxies": "reward-only, command-flag-only, target-distance-only, single-step delta, maxSteps-only",
        },
        "requiredEffectMetrics": list(REQUIRED_EFFECT_METRICS),
        "sampleCounts": {
            "scenarioCount": len(scenario_results),
            "seedCountsByScenario": seed_counts_by_scenario,
            "actionCount": len(actions),
            "probeCount": len(probes),
            "repeatStepsByScenario": repeat_steps_by_scenario,
            "minimumWindowFailureCount": minimum_window_failure_count,
        },
        "phaseCoverage": phase_coverage,
        "classResultCounts": dict(sorted(class_counts.items())),
        "telemetryLimitedScenarioIds": telemetry_limited_scenarios,
        "scenarioResults": scenario_results,
        "actionSummary": action_summary,
        "probes": probes,
        "decision": {
            "resultClass": result_class,
            "opensNext": ["93S.3 Sidecar-Action Entscheidung"] if ok else [],
            "blocksNext": [
                *BLOCKED_ACTIONS,
                *(
                    ["BT93U until 93S.99 proves action-selection-green and no telemetry blocker"]
                    if result_class != "measurement-invalid"
                    else ["93S.3 until measurement-invalid is repaired"]
                ),
            ],
            "nextAllowedActions": [
                "Run 93S.3 sidecar-action decision using this action-effect gap classification."
            ]
            if ok
            else ["Stop: repair BT93S.2 measurement-invalid or missing source/versioning first."],
            "actionEffectGapScenarioIds": sorted(
                scenario_id
                for scenario_id, result in scenario_results.items()
                if result.get("classResult") == "action-effect-weak"
            ),
            "telemetryStillLimitedScenarioIds": telemetry_limited_scenarios,
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "ppoTrainingStarted": False,
            "newEvalRunStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "rewardFixApplied": False,
            "actionSurfaceChanged": False,
            "telemetryFixApplied": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "promoteAllowed": False,
            "rolloutAllowed": False,
        },
        "commands": {
            "write": "python python/scripts/bt93s_existing_action_effect.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
        "actionSurface": build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def reclassify_existing_report() -> dict[str, Any]:
    payload = _read_json(REPORT_PATH)
    contract = _read_json(SCENARIO_CONTRACT_PATH)
    scenarios = contract.get("scenarios") if isinstance(contract.get("scenarios"), list) else []
    scenarios_by_id = {
        str(scenario.get("id")): scenario
        for scenario in scenarios
        if isinstance(scenario, Mapping) and scenario.get("id")
    }
    probes = [probe for probe in payload.get("probes") or [] if isinstance(probe, dict)]
    for probe in probes:
        warmup_terminal = bool(probe.get("terminalObserved") and int(probe.get("observedSteps") or 0) == 0)
        probe["warmupTerminalBeforeAction"] = warmup_terminal
        if probe.get("error") is None and probe.get("startMetrics") and (int(probe.get("observedSteps") or 0) >= 1 or warmup_terminal):
            probe["ok"] = True
    grouped: dict[str, dict[str, list[Mapping[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    for probe in probes:
        grouped[str(probe.get("scenarioId"))][str(probe.get("actionName"))].append(probe)
    scenario_results = {
        scenario_id: _classify_action_results(scenario, grouped.get(scenario_id, {}))
        for scenario_id, scenario in scenarios_by_id.items()
    }
    class_counts = Counter(result.get("classResult") for result in scenario_results.values())
    source_artifacts = _source_artifacts()
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    all_probes_ok = bool(probes) and all(probe.get("ok") is True for probe in probes)
    required_metrics_written = all(
        all(metric in (probe.get("effectMetrics") or {}) for metric in REQUIRED_EFFECT_METRICS)
        for probe in probes
    )
    weak_classifications_written = any(
        action.get("actionEffectClass") == "action-effect-weak"
        for result in scenario_results.values()
        for action in (result.get("actionResults") or {}).values()
    )
    phase_coverage = {
        "DoD.S2": required_metrics_written and all_probes_ok,
        "93S.2.1": all_probes_ok and len(scenario_results) == len(scenarios),
        "93S.2.2": weak_classifications_written,
    }
    if not source_files_ready or not source_files_versioned or not all_probes_ok or class_counts.get("measurement-invalid"):
        result_class = "measurement-invalid"
    elif class_counts.get("matrix-redesign-required"):
        result_class = "matrix-redesign-required"
    elif class_counts.get("action-effect-weak"):
        result_class = "action-effect-weak"
    else:
        result_class = "existing-action-effect-measured"
    ok = bool(source_files_ready and source_files_versioned and all(phase_coverage.values()))
    telemetry_limited_scenarios = [
        scenario_id for scenario_id, result in scenario_results.items() if result.get("telemetryLimit")
    ]
    sample_counts = payload.get("sampleCounts") if isinstance(payload.get("sampleCounts"), Mapping) else {}
    sample_counts = {
        **dict(sample_counts),
        "minimumWindowFailureCount": sum(1 for probe in probes if probe.get("completedMinimumWindow") is not True),
        "warmupTerminalBeforeActionCount": sum(1 for probe in probes if probe.get("warmupTerminalBeforeAction") is True),
    }
    payload.update(
        {
            "resultClass": result_class,
            "ok": ok,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93s_existing_action_effect.py",
            "reclassifiedExistingMeasurement": True,
            "sourceArtifacts": source_artifacts,
            "sourceFilesReady": source_files_ready,
            "sourceFilesVersioned": source_files_versioned,
            "phaseCoverage": phase_coverage,
            "classResultCounts": dict(sorted(class_counts.items())),
            "telemetryLimitedScenarioIds": telemetry_limited_scenarios,
            "scenarioResults": scenario_results,
            "actionSummary": _aggregate_action_classes(scenario_results),
            "probes": probes,
            "sampleCounts": sample_counts,
            "decision": {
                "resultClass": result_class,
                "opensNext": ["93S.3 Sidecar-Action Entscheidung"] if ok else [],
                "blocksNext": [
                    *BLOCKED_ACTIONS,
                    *(
                        ["BT93U until 93S.99 proves action-selection-green and no telemetry blocker"]
                        if result_class != "measurement-invalid"
                        else ["93S.3 until measurement-invalid is repaired"]
                    ),
                ],
                "nextAllowedActions": [
                    "Run 93S.3 sidecar-action decision using this action-effect gap classification."
                ]
                if ok
                else ["Stop: repair BT93S.2 measurement-invalid or missing source/versioning first."],
                "actionEffectGapScenarioIds": sorted(
                    scenario_id
                    for scenario_id, result in scenario_results.items()
                    if result.get("classResult") == "action-effect-weak"
                ),
                "telemetryStillLimitedScenarioIds": telemetry_limited_scenarios,
            },
            "commands": {
                "fullMeasurement": "python python/scripts/bt93s_existing_action_effect.py --write-report",
                "reclassifyExisting": "python python/scripts/bt93s_existing_action_effect.py --reclassify-existing --write-report",
                "metaGate": "npm.cmd run gates:pre-commit",
            },
        }
    )
    payload.pop("reportHash", None)
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="write BT93S.2 existing-action effect report")
    parser.add_argument("--seed-limit", type=int, default=None, help="diagnostic override; default uses all contract seeds")
    parser.add_argument("--action-limit", type=int, default=None, help="diagnostic override; default uses all semantic actions")
    parser.add_argument("--reclassify-existing", action="store_true", help="reclassify the existing raw measurement report")
    args = parser.parse_args()

    report = reclassify_existing_report() if args.reclassify_existing else build_report(
        seed_limit=args.seed_limit,
        action_limit=args.action_limit,
    )
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
                "decision": report["decision"],
                "output": _rel(REPORT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
