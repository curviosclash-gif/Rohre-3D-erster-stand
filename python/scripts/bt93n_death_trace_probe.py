"""BT93N.1 death-before-60 and max-step trace probe.

This probe is diagnostic-only. It writes trace evidence for early deaths,
max-step plateaus, and controls without changing rewards, actions, terminal
rules, holdout data, candidates, freeze artifacts, or runtime rollout surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from collections import Counter, deque
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
    make_curvios_action_wrapper,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93N_ROOT = PPO_ROOT / "bt93n"
DEATH_REPORT_PATH = BT93N_ROOT / "death_before60_trace_report.json"
TRACE_SAMPLE_PATH = BT93N_ROOT / "death_before60_trace_samples.jsonl"
MAXSTEP_REPORT_PATH = BT93N_ROOT / "maxstep_plateau_trace_report.json"

BT93L_TASK_CONTRACT_PATH = PPO_ROOT / "bt93l" / "task_metric_contract.json"
BT93L_MICRO_SIGNAL_PATH = PPO_ROOT / "bt93l" / "micro_ppo_signal_report.json"
BT93L_BASELINE_MATRIX_PATH = PPO_ROOT / "bt93l" / "baseline_matrix_report.json"
BT93M_COMPARISON_POLICY_PATH = PPO_ROOT / "bt93m" / "comparison_policy_decision.json"
BT94A_NO_START_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"

CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

PROFILE_ID = "bt93l-objective-reachability-v1"
DEFAULT_EPISODES = 60
DEFAULT_TRACE_TAIL = 12
DEFAULT_MAX_STEPS = 180
DEFAULT_SAMPLE_LIMIT = 12

OBSERVATION_FIELDS = {
    "speedRatio": 0,
    "healthRatio": 1,
    "shieldRatio": 2,
    "wallDistanceFront": 3,
    "wallDistanceLeft": 4,
    "wallDistanceRight": 5,
    "wallDistanceUp": 6,
    "wallDistanceDown": 7,
    "targetDistanceRatio": 8,
    "targetAlignment": 9,
    "targetInFront": 10,
    "pressureLevel": 11,
    "projectileThreat": 12,
    "localOpennessRatio": 13,
    "boostActive": 14,
}

SCRIPTED_REACHABILITY_ACTIONS = (6, 2, 4, 7, 1, 5, 3, 8)
SEMANTIC_CYCLE_ACTIONS = (1, 2, 3, 4, 5, 6, 7, 8)
DEATH_CLASSES = (
    "wall/trail",
    "opponent/projectile",
    "self-stall/noop",
    "action-collapse",
    "reset/spawn-risk",
    "runtime/bridge",
    "unclassified",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _write_jsonl(path: Path, rows: Iterable[Mapping[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n")


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
        "closureCapable": closure_capable,
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any) -> float:
    return round(_number(value), 6)


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return {str(key): int(value) for key, value in sorted(counter.items())}


def _episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _objective_reachability(info: Mapping[str, Any]) -> Mapping[str, Any]:
    semantics = _episode_semantics(info)
    reachability = semantics.get("objectiveReachability")
    return reachability if isinstance(reachability, Mapping) else {}


def _reward_breakdown(info: Mapping[str, Any]) -> Mapping[str, float]:
    breakdown = info.get("rewardBreakdown")
    if not isinstance(breakdown, Mapping):
        return {}
    return {str(key): _round(value) for key, value in breakdown.items()}


def _action_telemetry(info: Mapping[str, Any]) -> Mapping[str, Any]:
    telemetry = info.get("ppoActionTelemetry")
    return telemetry if isinstance(telemetry, Mapping) else {}


def _action_surface(info: Mapping[str, Any]) -> Mapping[str, Any]:
    surface = info.get("ppoActionSurface")
    return surface if isinstance(surface, Mapping) else {}


def _metrics_from_observation(observation: np.ndarray) -> dict[str, float | bool]:
    metrics: dict[str, float | bool] = {}
    for name, index in OBSERVATION_FIELDS.items():
        if index >= len(observation):
            continue
        value = _round(observation[index])
        metrics[name] = bool(value >= 0.5) if name in {"targetInFront", "boostActive"} else value
    return metrics


def _observation_delta(previous: np.ndarray | None, current: np.ndarray) -> dict[str, Any]:
    if previous is None:
        return {
            "rawPoseAvailable": False,
            "source": "observation-v2-runtime-near first-step proxy",
            "targetDistanceDelta": 0.0,
            "targetAlignmentDelta": 0.0,
            "localOpennessDelta": 0.0,
            "speedDelta": 0.0,
        }
    return {
        "rawPoseAvailable": False,
        "source": "observation-v2-runtime-near target/heading proxy; raw xyz/heading is not exposed",
        "targetDistanceDelta": _round(current[OBSERVATION_FIELDS["targetDistanceRatio"]] - previous[OBSERVATION_FIELDS["targetDistanceRatio"]]),
        "targetAlignmentDelta": _round(current[OBSERVATION_FIELDS["targetAlignment"]] - previous[OBSERVATION_FIELDS["targetAlignment"]]),
        "localOpennessDelta": _round(current[OBSERVATION_FIELDS["localOpennessRatio"]] - previous[OBSERVATION_FIELDS["localOpennessRatio"]]),
        "speedDelta": _round(current[OBSERVATION_FIELDS["speedRatio"]] - previous[OBSERVATION_FIELDS["speedRatio"]]),
    }


def _semantic_action_name(token: int) -> str:
    if token < 0 or token >= len(MASKED_SEMANTIC_ACTIONS):
        return "invalid-token"
    return str(MASKED_SEMANTIC_ACTIONS[token][0])


def _token_for_policy(policy_id: str, step_index: int, rng: np.random.Generator) -> int:
    if policy_id == "noop-control":
        return 0
    if policy_id == "random-control":
        return int(rng.integers(0, len(MASKED_SEMANTIC_ACTIONS)))
    if policy_id == "semantic-cycle-control":
        return int(SEMANTIC_CYCLE_ACTIONS[step_index % len(SEMANTIC_CYCLE_ACTIONS)])
    if policy_id == "scripted-reachability-positive-control":
        return int(SCRIPTED_REACHABILITY_ACTIONS[step_index % len(SCRIPTED_REACHABILITY_ACTIONS)])
    raise ValueError(f"unknown policy id: {policy_id}")


def _episode_budget(total_episodes: int) -> list[dict[str, Any]]:
    total = max(4, int(total_episodes))
    scripted = max(1, int(round(total * 0.30)))
    random = max(1, int(round(total * 0.25)))
    semantic = max(1, int(round(total * 0.20)))
    noop = max(1, total - scripted - random - semantic)
    while scripted + random + semantic + noop > total:
        noop = max(1, noop - 1)
        if scripted + random + semantic + noop <= total:
            break
        random = max(1, random - 1)
    while scripted + random + semantic + noop < total:
        scripted += 1
    return [
        {
            "policyId": "scripted-reachability-positive-control",
            "episodeCount": scripted,
            "controlClass": "positive",
            "purpose": "real action sequence should expose movement/progress/objective signals when reachable.",
        },
        {
            "policyId": "random-control",
            "episodeCount": random,
            "controlClass": "stochastic-simple",
            "purpose": "simple non-PPO baseline catches measurement and reward-ordering surprises.",
        },
        {
            "policyId": "semantic-cycle-control",
            "episodeCount": semantic,
            "controlClass": "simple-cycle",
            "purpose": "deterministic simple baseline checks action-cycle collapse and reward-ordering risk.",
        },
        {
            "policyId": "noop-control",
            "episodeCount": noop,
            "controlClass": "negative",
            "purpose": "negative control; must not be read as PPO behavior or quality.",
        },
    ]


def _minimal_trace_row(
    *,
    global_step: int,
    episode_step: int,
    action_token: int,
    reward: float,
    cumulative_reward: float,
    observation: np.ndarray,
    previous_observation: np.ndarray | None,
    terminated: bool,
    truncated: bool,
    info: Mapping[str, Any],
) -> dict[str, Any]:
    semantics = _episode_semantics(info)
    reachability = _objective_reachability(info)
    telemetry = _action_telemetry(info)
    surface = _action_surface(info)
    hybrid = info.get("hybridDecision") if isinstance(info.get("hybridDecision"), Mapping) else {}
    safety = hybrid.get("safety") if isinstance(hybrid.get("safety"), Mapping) else {}
    return {
        "globalStep": int(global_step),
        "episodeStep": int(episode_step),
        "actionToken": int(action_token),
        "semanticAction": _semantic_action_name(action_token),
        "resolvedAction": surface.get("sanitizedAction") or info.get("action"),
        "reward": _round(reward),
        "cumulativeReward": _round(cumulative_reward),
        "terminated": bool(terminated),
        "truncated": bool(truncated),
        "terminalReason": info.get("terminalReason"),
        "truncatedReason": info.get("truncatedReason"),
        "actionSafety": {
            "invalidActionRate": _round(telemetry.get("invalidActionRate")),
            "postDecodeClampRate": _round(telemetry.get("postDecodeClampRate")),
            "vetoRate": _round(telemetry.get("vetoRate")),
            "sanitizerRate": _round(telemetry.get("sanitizerRate")),
            "noopRate": _round(telemetry.get("noopRate")),
            "preSamplingMaskRate": _round(telemetry.get("preSamplingMaskRate")),
            "hybridSafety": dict(safety),
            "invalidReasons": list(surface.get("invalidReasons") or []),
            "maskEvents": list(surface.get("maskEvents") or []),
            "vetoEvents": list(surface.get("vetoEvents") or []),
            "sanitizerEvents": list(surface.get("sanitizerEvents") or []),
        },
        "observationMetrics": _metrics_from_observation(observation),
        "positionHeadingDelta": _observation_delta(previous_observation, observation),
        "objectiveReachability": {
            "progressSignalReachable": semantics.get("progressSignalReachable") is True,
            "objectiveSignalReachable": semantics.get("objectiveSignalReachable") is True,
            "progressEvents": list(reachability.get("progressEvents") or []),
            "objectiveEvents": list(reachability.get("objectiveEvents") or []),
            "deltas": dict(reachability.get("deltas") or {}),
            "metrics": dict(reachability.get("metrics") or {}),
            "source": reachability.get("source"),
        },
        "rewardBreakdown": dict(_reward_breakdown(info)),
    }


def _classify_death(episode: Mapping[str, Any]) -> dict[str, Any]:
    if episode.get("runtimeError"):
        return {
            "class": "runtime/bridge",
            "confidence": "high",
            "signals": ["runtime error captured by probe"],
        }
    rows = [row for row in episode.get("traceTail") or [] if isinstance(row, Mapping)]
    if not rows:
        return {"class": "unclassified", "confidence": "low", "signals": ["empty trace tail"]}
    final = rows[-1]
    metrics = final.get("observationMetrics") if isinstance(final.get("observationMetrics"), Mapping) else {}
    safety = final.get("actionSafety") if isinstance(final.get("actionSafety"), Mapping) else {}
    action_counts = Counter(str(row.get("semanticAction")) for row in rows)
    noop_share = action_counts.get("noop", 0) / max(1, len(rows))
    unique_actions = len([key for key, value in action_counts.items() if key and value])
    signals: list[str] = []
    if int(episode.get("steps") or 0) <= 3:
        signals.append("death within first three steps")
        return {"class": "reset/spawn-risk", "confidence": "medium", "signals": signals}
    if _number(metrics.get("wallDistanceFront"), 1.0) <= 0.08 or _number(metrics.get("localOpennessRatio"), 1.0) <= 0.08:
        signals.append("front wall or local openness near zero")
        return {"class": "wall/trail", "confidence": "medium", "signals": signals}
    if _number(metrics.get("projectileThreat")) >= 0.25 or _number(metrics.get("pressureLevel")) >= 0.55:
        signals.append("projectile/opponent pressure elevated")
        return {"class": "opponent/projectile", "confidence": "medium", "signals": signals}
    if noop_share >= 0.70:
        signals.append("noop dominates trace tail")
        return {"class": "self-stall/noop", "confidence": "medium", "signals": signals}
    if unique_actions <= 1:
        signals.append("single action dominates trace tail")
        return {"class": "action-collapse", "confidence": "medium", "signals": signals}
    if _number(safety.get("invalidActionRate")) > 0 or _number(safety.get("sanitizerRate")) > 0:
        signals.append("action sanitizer or invalid action telemetry nonzero")
        return {"class": "action-collapse", "confidence": "medium", "signals": signals}
    return {
        "class": "unclassified",
        "confidence": "low",
        "signals": ["no dominant wall/threat/noop/action/runtime signal in trace tail"],
    }


def _plateau_features(episode: Mapping[str, Any]) -> dict[str, Any]:
    rows = [row for row in episode.get("traceTail") or [] if isinstance(row, Mapping)]
    action_counts = Counter(str(row.get("semanticAction")) for row in rows)
    progress_count = 0
    objective_count = 0
    reward_total = 0.0
    speed_values: list[float] = []
    target_distance_deltas: list[float] = []
    for row in rows:
        reachability = row.get("objectiveReachability") if isinstance(row.get("objectiveReachability"), Mapping) else {}
        if reachability.get("progressSignalReachable") is True:
            progress_count += 1
        if reachability.get("objectiveSignalReachable") is True:
            objective_count += 1
        reward_total += _number(row.get("reward"))
        metrics = row.get("observationMetrics") if isinstance(row.get("observationMetrics"), Mapping) else {}
        speed_values.append(_number(metrics.get("speedRatio")))
        delta = row.get("positionHeadingDelta") if isinstance(row.get("positionHeadingDelta"), Mapping) else {}
        target_distance_deltas.append(_number(delta.get("targetDistanceDelta")))
    return {
        "traceTailLength": len(rows),
        "actionCounts": _counter_dict(action_counts),
        "uniqueActionCount": len(action_counts),
        "progressSignalReachableTailCount": progress_count,
        "objectiveSignalReachableTailCount": objective_count,
        "tailRewardTotal": _round(reward_total),
        "meanSpeedRatioTail": _round(sum(speed_values) / max(1, len(speed_values))),
        "meanTargetDistanceDeltaTail": _round(sum(target_distance_deltas) / max(1, len(target_distance_deltas))),
        "stagnationSuspected": progress_count == 0 and objective_count == 0,
    }


def _run_policy(
    *,
    policy_id: str,
    episode_count: int,
    seed: int,
    max_steps: int,
    trace_tail_length: int,
    global_step_start: int,
) -> tuple[list[dict[str, Any]], int]:
    rng = np.random.default_rng(seed)
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max_steps,
            default_seed=seed,
            session_id=f"bt93n-death-trace-{policy_id}",
            controller_timeout_seconds=30.0,
            reward_profile_id=PROFILE_ID,
            map_key="standard",
            domain_mode="classic-3d",
            game_mode="CLASSIC",
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )
    episodes: list[dict[str, Any]] = []
    global_step = int(global_step_start)
    try:
        for episode_index in range(int(episode_count)):
            started = time.perf_counter()
            trace_tail: deque[dict[str, Any]] = deque(maxlen=max(1, int(trace_tail_length)))
            reward_total = 0.0
            previous_observation: np.ndarray | None = None
            reset_info: Mapping[str, Any] | None = None
            error: str | None = None
            terminated = False
            truncated = False
            terminal_reason: Any = None
            truncated_reason: Any = None
            observed_steps = 0
            try:
                observation, reset_info = env.reset()
                previous_observation = np.asarray(observation, dtype=np.float32)
                for step_index in range(max(1, int(max_steps))):
                    token = _token_for_policy(policy_id, step_index, rng)
                    observation, reward, terminated, truncated, info = env.step(token)
                    current_observation = np.asarray(observation, dtype=np.float32)
                    reward_total += float(reward)
                    observed_steps = step_index + 1
                    global_step += 1
                    trace_tail.append(
                        _minimal_trace_row(
                            global_step=global_step,
                            episode_step=observed_steps,
                            action_token=token,
                            reward=float(reward),
                            cumulative_reward=reward_total,
                            observation=current_observation,
                            previous_observation=previous_observation,
                            terminated=terminated,
                            truncated=truncated,
                            info=info,
                        )
                    )
                    previous_observation = current_observation
                    terminal_reason = info.get("terminalReason")
                    truncated_reason = info.get("truncatedReason")
                    if terminated or truncated:
                        break
                if not terminated and not truncated:
                    truncated_reason = "probe-step-limit"
            except Exception as exc:  # pragma: no cover - runtime report path
                error = str(exc)
            episode = {
                "episodeId": f"{policy_id}-{seed}-{episode_index + 1}",
                "policyId": policy_id,
                "controlClass": "positive" if policy_id.startswith("scripted") else ("negative" if policy_id.startswith("noop") else "simple-control"),
                "seed": int(seed),
                "episodeIndex": int(episode_index),
                "steps": int(observed_steps),
                "maxSteps": int(max_steps),
                "rewardTotal": _round(reward_total),
                "terminated": bool(terminated),
                "truncated": bool(truncated),
                "terminalReason": terminal_reason,
                "truncatedReason": truncated_reason,
                "runtimeError": error,
                "elapsedSeconds": _round(time.perf_counter() - started),
                "traceTail": list(trace_tail),
                "resetEffectiveEnvironment": (
                    dict(reset_info.get("effectiveEnvironment") or {})
                    if isinstance(reset_info, Mapping)
                    else {}
                ),
            }
            episode["earlyDeathBefore60"] = (
                episode["terminalReason"] == "player-dead"
                and episode["steps"] < 60
                and not episode["runtimeError"]
            )
            episode["maxStepPlateau"] = episode["truncatedReason"] == "max-steps" or (
                episode["truncated"] and episode["steps"] >= max_steps
            )
            if episode["earlyDeathBefore60"]:
                episode["deathClassification"] = _classify_death(episode)
            if episode["maxStepPlateau"]:
                episode["plateauFeatures"] = _plateau_features(episode)
            episodes.append(episode)
    finally:
        env.close()
    return episodes, global_step


def _sample_records(episodes: list[Mapping[str, Any]], sample_limit: int) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for episode in episodes:
        if episode.get("earlyDeathBefore60") is True:
            records.append({"sampleKind": "early-death-before60", **dict(episode)})
    maxstep_count = 0
    for episode in episodes:
        if episode.get("maxStepPlateau") is True and maxstep_count < sample_limit:
            records.append({"sampleKind": "maxstep-plateau", **dict(episode)})
            maxstep_count += 1
    non_event_count = 0
    for episode in episodes:
        if episode.get("earlyDeathBefore60") is True or episode.get("maxStepPlateau") is True:
            continue
        if episode.get("runtimeError"):
            continue
        records.append({"sampleKind": "non-event-control", **dict(episode)})
        non_event_count += 1
        if non_event_count >= sample_limit:
            break
    if non_event_count == 0:
        for episode in episodes:
            if episode.get("earlyDeathBefore60") is True or episode.get("runtimeError"):
                continue
            records.append({"sampleKind": "non-event-control-fallback", **dict(episode)})
            non_event_count += 1
            if non_event_count >= min(3, sample_limit):
                break
    return records


def _aggregate(episodes: list[Mapping[str, Any]]) -> dict[str, Any]:
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    policies: Counter[str] = Counter()
    death_classes: Counter[str] = Counter()
    progress_total = 0
    objective_total = 0
    runtime_errors = 0
    reward_total = 0.0
    completed_lengths: list[int] = []
    for episode in episodes:
        policies[str(episode.get("policyId"))] += 1
        if episode.get("runtimeError"):
            runtime_errors += 1
        reason = episode.get("terminalReason")
        if reason:
            terminal_reasons[str(reason)] += 1
        truncation = episode.get("truncatedReason")
        if truncation:
            truncated_reasons[str(truncation)] += 1
        if episode.get("earlyDeathBefore60") is True:
            classification = episode.get("deathClassification")
            if isinstance(classification, Mapping):
                death_classes[str(classification.get("class") or "unclassified")] += 1
        reward_total += _number(episode.get("rewardTotal"))
        completed_lengths.append(int(episode.get("steps") or 0))
        for row in episode.get("traceTail") or []:
            if not isinstance(row, Mapping):
                continue
            reachability = row.get("objectiveReachability") if isinstance(row.get("objectiveReachability"), Mapping) else {}
            if reachability.get("progressSignalReachable") is True:
                progress_total += 1
            if reachability.get("objectiveSignalReachable") is True:
                objective_total += 1
    completed = len(episodes)
    early_deaths = sum(1 for episode in episodes if episode.get("earlyDeathBefore60") is True)
    maxsteps = sum(1 for episode in episodes if episode.get("maxStepPlateau") is True)
    return {
        "completedEpisodes": completed,
        "policyEpisodeCounts": _counter_dict(policies),
        "terminalReasonCounts": _counter_dict(terminal_reasons),
        "truncatedReasonCounts": _counter_dict(truncated_reasons),
        "deathClassCounts": _counter_dict(death_classes),
        "deathBefore60Count": int(early_deaths),
        "deathBefore60Share": _round(early_deaths / max(1, completed)),
        "maxStepPlateauCount": int(maxsteps),
        "maxStepShare": _round(maxsteps / max(1, completed)),
        "runtimeErrorCount": int(runtime_errors),
        "avgStepsPerEpisode": _round(sum(completed_lengths) / max(1, len(completed_lengths))),
        "minStepsPerEpisode": min(completed_lengths) if completed_lengths else None,
        "maxStepsPerEpisodeObserved": max(completed_lengths) if completed_lengths else None,
        "rewardTotal": _round(reward_total),
        "rewardMeanPerEpisode": _round(reward_total / max(1, completed)),
        "progressSignalReachableTailCount": int(progress_total),
        "objectiveSignalReachableTailCount": int(objective_total),
    }


def _controls(budget: list[Mapping[str, Any]], aggregate: Mapping[str, Any]) -> dict[str, Any]:
    counts = aggregate.get("policyEpisodeCounts") if isinstance(aggregate.get("policyEpisodeCounts"), Mapping) else {}
    controls = [
        {
            "policyId": str(item["policyId"]),
            "controlClass": item["controlClass"],
            "purpose": item["purpose"],
            "episodeCount": int(counts.get(str(item["policyId"]), 0)),
            "countsAsPpoBehavior": False,
            "countsAsQualityEvidence": False,
        }
        for item in budget
    ]
    return {
        "controls": controls,
        "positiveControlPresent": any(item["controlClass"] == "positive" and item["episodeCount"] > 0 for item in controls),
        "negativeControlPresent": any(item["controlClass"] == "negative" and item["episodeCount"] > 0 for item in controls),
        "controlPolicy": "controls document measurement boundaries; they do not replace PPO, DQN anchor, holdout, candidate, freeze, or validate evidence",
    }


def _phase_coverage(
    *,
    aggregate: Mapping[str, Any],
    sample_records: list[Mapping[str, Any]],
    requested_episodes: int,
    controls: Mapping[str, Any],
) -> dict[str, bool]:
    early_death_count = int(aggregate.get("deathBefore60Count") or 0)
    maxstep_count = int(aggregate.get("maxStepPlateauCount") or 0)
    early_death_samples = [row for row in sample_records if row.get("sampleKind") == "early-death-before60"]
    maxstep_samples = [row for row in sample_records if row.get("sampleKind") == "maxstep-plateau"]
    non_event_samples = [
        row
        for row in sample_records
        if str(row.get("sampleKind", "")).startswith("non-event-control")
    ]
    return {
        "93N.1.1": early_death_count == len(early_death_samples)
        and all(row.get("traceTail") for row in early_death_samples),
        "93N.1.2": set(DEATH_CLASSES).issuperset(set((aggregate.get("deathClassCounts") or {}).keys())),
        "93N.1.3": controls.get("positiveControlPresent") is True and controls.get("negativeControlPresent") is True,
        "93N.1.4": True,
        "93N.1.5": maxstep_count == 0 or bool(maxstep_samples),
        "93N.1.6": int(aggregate.get("completedEpisodes") or 0) >= int(requested_episodes),
        "93N.1.7": (early_death_count == 0 or bool(early_death_samples))
        and (maxstep_count == 0 or bool(maxstep_samples))
        and bool(non_event_samples),
    }


def _death_result_class(aggregate: Mapping[str, Any], phase_coverage: Mapping[str, bool]) -> str:
    if not all(phase_coverage.values()):
        return "measurement-invalid"
    if int(aggregate.get("runtimeErrorCount") or 0) > 0:
        return "runtime-bridge-trace-blocking"
    if int(aggregate.get("deathBefore60Count") or 0) > 0:
        return "death-before60-root-cause-classified"
    return "death-before60-not-reproduced-measurement-limited"


def _maxstep_result_class(aggregate: Mapping[str, Any]) -> str:
    maxstep_share = _number(aggregate.get("maxStepShare"))
    progress = int(aggregate.get("progressSignalReachableTailCount") or 0)
    objective = int(aggregate.get("objectiveSignalReachableTailCount") or 0)
    if maxstep_share >= 0.50 and progress == 0 and objective == 0:
        return "maxstep-plateau-still-blocking"
    if maxstep_share >= 0.50:
        return "maxstep-plateau-needs-semantic-review"
    if maxstep_share > 0:
        return "maxstep-plateau-observed"
    return "maxstep-plateau-not-observed"


def _source_artifacts() -> dict[str, Any]:
    return {
        "bt93lTaskMetricContract": _source(BT93L_TASK_CONTRACT_PATH, "BT93L pinned matrix/task contract"),
        "bt93lMicroPpoSignal": _source(BT93L_MICRO_SIGNAL_PATH, "BT93L micro PPO source blocker"),
        "bt93lBaselineMatrix": _source(BT93L_BASELINE_MATRIX_PATH, "BT93L simple baseline/control matrix"),
        "bt93mComparisonPolicyDecision": _source(BT93M_COMPARISON_POLICY_PATH, "BT93M comparison policy blocker"),
        "bt94aNoStartGate": _source(BT94A_NO_START_PATH, "BT94A closed no-start gate"),
        "curviosEnv": _source(CURVIOS_ENV_PATH, "Python CurviosEnv bridge path"),
        "ppoActionSurface": _source(ACTION_SURFACE_PATH, "masked semantic action surface"),
        "headlessLaneRunner": _source(HEADLESS_RUNNER_PATH, "JS headless training lane"),
    }


def build_reports(*, episodes: int, trace_tail: int, max_steps: int, seed_start: int, sample_limit: int) -> dict[str, Any]:
    started = time.perf_counter()
    budget = _episode_budget(episodes)
    all_episodes: list[dict[str, Any]] = []
    global_step = 0
    for index, policy in enumerate(budget):
        policy_episodes, global_step = _run_policy(
            policy_id=str(policy["policyId"]),
            episode_count=int(policy["episodeCount"]),
            seed=seed_start + index,
            max_steps=max_steps,
            trace_tail_length=trace_tail,
            global_step_start=global_step,
        )
        all_episodes.extend(policy_episodes)
    aggregate = _aggregate(all_episodes)
    records = _sample_records(all_episodes, sample_limit=sample_limit)
    controls = _controls(budget, aggregate)
    coverage = _phase_coverage(
        aggregate=aggregate,
        sample_records=records,
        requested_episodes=episodes,
        controls=controls,
    )
    death_result = _death_result_class(aggregate, coverage)
    maxstep_result = _maxstep_result_class(aggregate)
    comparison_policy = _read_json(BT93M_COMPARISON_POLICY_PATH)
    trace_policy = {
        "matrixId": _get(_read_json(BT93L_TASK_CONTRACT_PATH), "matrix", "matrixId"),
        "semanticWindow": _get(_read_json(BT93L_TASK_CONTRACT_PATH), "matrix", "semanticWindow"),
        "rewardProfileId": PROFILE_ID,
        "actionSurfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "episodesRequested": int(episodes),
        "traceTailLength": int(trace_tail),
        "maxStepsPerEpisode": int(max_steps),
        "seedStart": int(seed_start),
        "sampleLimitPerClass": int(sample_limit),
        "sampleThreshold": {
            "minimumCompletedEpisodes": int(episodes),
            "lowEventCountInterpretation": "measurement finding, never a green quality signal",
        },
        "policyBudget": budget,
    }
    common = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93n_death_trace_probe.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93N",
        "phaseId": "93N.1",
        "tracePolicy": trace_policy,
        "aggregate": aggregate,
        "controlEvidence": controls,
        "samplePath": _rel(TRACE_SAMPLE_PATH),
        "sourceArtifacts": _source_artifacts(),
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "fixApplied": False,
            "rewardChanged": False,
            "actionSurfaceChanged": False,
            "terminalRulesChanged": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "comparisonPolicy": {
            "decision": comparison_policy.get("comparisonPolicyDecision"),
            "nonBlockingForPositiveReentry": comparison_policy.get("nonBlockingForPositiveReentry"),
            "diagnoseOnlyWhileBlocked": _get(comparison_policy, "bt93pPolicy", "diagnoseOnlyWhileBlocked"),
        },
        "elapsedSeconds": _round(time.perf_counter() - started),
    }
    death_report = {
        "schemaVersion": "bt93n-death-before60-trace-v1",
        "ok": int(aggregate.get("completedEpisodes") or 0) >= int(episodes),
        "resultClass": death_result,
        "phaseCoverage": coverage,
        "deathClasses": list(DEATH_CLASSES),
        "deathBefore60Episodes": [
            {
                "episodeId": episode.get("episodeId"),
                "policyId": episode.get("policyId"),
                "steps": episode.get("steps"),
                "rewardTotal": episode.get("rewardTotal"),
                "classification": episode.get("deathClassification"),
            }
            for episode in all_episodes
            if episode.get("earlyDeathBefore60") is True
        ],
        "measurementInterpretation": {
            "lowEventCountIsGreen": False,
            "fixAllowedBeforeDominantCause": False,
            "dominantCause": (
                max((aggregate.get("deathClassCounts") or {}).items(), key=lambda item: item[1])[0]
                if aggregate.get("deathClassCounts")
                else None
            ),
            "nextFixGate": "blocked until dominant cause or measurement-invalid is explicitly accepted",
        },
        "nextAllowedActions": [
            "review 93N.1 trace evidence",
            "only start 93N.2 fix class if a dominant cause is documented",
            "otherwise keep BT93N diagnose-only and preserve BT93P/BT94A blockers",
        ],
        "blockedActions": [
            "reward/action/terminal fix without cause",
            "50k/100k extension",
            "BT93P BT94A-ready",
            "BT94A candidate/freeze",
            "holdout consumption",
            "promote or rollout-ready wording",
        ],
        **common,
    }
    maxstep_report = {
        "schemaVersion": "bt93n-maxstep-plateau-trace-v1",
        "ok": death_report["ok"],
        "resultClass": maxstep_result,
        "phaseCoverage": {
            "93N.1.5": coverage["93N.1.5"],
            "93N.1.6": coverage["93N.1.6"],
            "93N.1.7": coverage["93N.1.7"],
        },
        "plateauEpisodes": [
            {
                "episodeId": episode.get("episodeId"),
                "policyId": episode.get("policyId"),
                "steps": episode.get("steps"),
                "rewardTotal": episode.get("rewardTotal"),
                "plateauFeatures": episode.get("plateauFeatures"),
            }
            for episode in all_episodes
            if episode.get("maxStepPlateau") is True
        ][: max(1, sample_limit)],
        "plateauDecision": {
            "maxStepShare": aggregate.get("maxStepShare"),
            "maxStepCount": aggregate.get("maxStepPlateauCount"),
            "progressSignalReachableTailCount": aggregate.get("progressSignalReachableTailCount"),
            "objectiveSignalReachableTailCount": aggregate.get("objectiveSignalReachableTailCount"),
            "countsAsQualityGreen": False,
            "nextExtensionAllowed": False,
        },
        "blockedActions": [
            "50k/100k extension while plateau remains blocking or unclear",
            "quality claim from maxSteps alone",
            "BT94A candidate/freeze",
        ],
        **common,
    }
    return {
        "deathReport": death_report,
        "maxstepReport": maxstep_report,
        "samples": records,
    }


def main() -> int:
    global BT93N_ROOT, DEATH_REPORT_PATH, TRACE_SAMPLE_PATH, MAXSTEP_REPORT_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--episodes", type=int, default=DEFAULT_EPISODES)
    parser.add_argument("--trace-tail", type=int, default=DEFAULT_TRACE_TAIL)
    parser.add_argument("--max-steps", type=int, default=DEFAULT_MAX_STEPS)
    parser.add_argument("--seed-start", type=int, default=934)
    parser.add_argument("--sample-limit", type=int, default=DEFAULT_SAMPLE_LIMIT)
    parser.add_argument("--output-root", type=Path, default=BT93N_ROOT)
    args = parser.parse_args()

    BT93N_ROOT = args.output_root.resolve()
    DEATH_REPORT_PATH = BT93N_ROOT / "death_before60_trace_report.json"
    TRACE_SAMPLE_PATH = BT93N_ROOT / "death_before60_trace_samples.jsonl"
    MAXSTEP_REPORT_PATH = BT93N_ROOT / "maxstep_plateau_trace_report.json"

    reports = build_reports(
        episodes=max(1, int(args.episodes)),
        trace_tail=max(1, int(args.trace_tail)),
        max_steps=max(1, int(args.max_steps)),
        seed_start=int(args.seed_start),
        sample_limit=max(1, int(args.sample_limit)),
    )
    if args.write_report:
        _write_json(DEATH_REPORT_PATH, reports["deathReport"])
        _write_json(MAXSTEP_REPORT_PATH, reports["maxstepReport"])
        _write_jsonl(TRACE_SAMPLE_PATH, reports["samples"])

    summary = {
        "ok": bool(reports["deathReport"]["ok"]) and bool(reports["maxstepReport"]["ok"]),
        "deathResultClass": reports["deathReport"]["resultClass"],
        "maxstepResultClass": reports["maxstepReport"]["resultClass"],
        "phaseCoverage": reports["deathReport"]["phaseCoverage"],
        "aggregate": {
            "completedEpisodes": reports["deathReport"]["aggregate"]["completedEpisodes"],
            "deathBefore60Count": reports["deathReport"]["aggregate"]["deathBefore60Count"],
            "maxStepPlateauCount": reports["deathReport"]["aggregate"]["maxStepPlateauCount"],
            "runtimeErrorCount": reports["deathReport"]["aggregate"]["runtimeErrorCount"],
        },
        "outputs": {
            "deathBefore60TraceReport": _rel(DEATH_REPORT_PATH),
            "deathBefore60TraceSamples": _rel(TRACE_SAMPLE_PATH),
            "maxstepPlateauTraceReport": _rel(MAXSTEP_REPORT_PATH),
        },
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
