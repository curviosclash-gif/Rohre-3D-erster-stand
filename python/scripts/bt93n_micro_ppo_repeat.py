"""BT93N.3 micro-PPO repeat after the BT93N stability reward fix.

This lane is diagnostic-only. It repeats the 10k PPO probe on the pinned
BT93L matrix with the BT93N reward profile and writes a pre-run tolerance
contract plus a final report. It never starts a 50k extension, candidate,
freeze, holdout, promote, PPO-Validate, or runtime rollout path.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

import gymnasium as gym
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    make_curvios_action_wrapper,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93N_ROOT = PPO_ROOT / "bt93n"
REPORT_PATH = BT93N_ROOT / "micro_ppo_repeat_report.json"
TOLERANCE_CONTRACT_PATH = BT93N_ROOT / "micro_ppo_tolerance_contract.json"

BT93L_TASK_CONTRACT_PATH = PPO_ROOT / "bt93l" / "task_metric_contract.json"
BT93L_MICRO_SIGNAL_PATH = PPO_ROOT / "bt93l" / "micro_ppo_signal_report.json"
BT93L_BASELINE_MATRIX_PATH = PPO_ROOT / "bt93l" / "baseline_matrix_report.json"
BT93N_FIX_MANIFEST_PATH = BT93N_ROOT / "fix_manifest.json"
BT93N_STABILITY_FIX_REPORT_PATH = BT93N_ROOT / "stability_fix_report.json"
BT93N_REWARD_DELTA_PATH = BT93N_ROOT / "reward_terminal_delta_report.json"
BT93M_COMPARISON_POLICY_PATH = PPO_ROOT / "bt93m" / "comparison_policy_decision.json"
BT94A_NO_START_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

BT93N_PROFILE_ID = "bt93n-wall-trail-stability-v1"
DEFAULT_TIMESTEPS = 10_000
DEFAULT_TRAIN_SEED = 934
DEFAULT_EVAL_SEEDS = (944, 945, 946)
DEFAULT_EVAL_STEPS_PER_SEED = 2700
DEFAULT_MAX_STEPS = 180


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


def _jsonable(value: Any) -> Any:
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    try:
        return float(value)
    except (TypeError, ValueError):
        return str(value)


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


def _episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _reward_breakdown(info: Mapping[str, Any]) -> Mapping[str, Any]:
    breakdown = info.get("rewardBreakdown")
    return breakdown if isinstance(breakdown, Mapping) else {}


def _action_telemetry(info: Mapping[str, Any]) -> Mapping[str, Any]:
    telemetry = info.get("ppoActionTelemetry")
    return telemetry if isinstance(telemetry, Mapping) else {}


class PpoMetricCallback(BaseCallback):
    def __init__(self) -> None:
        super().__init__()
        self.rollout_count = 0
        self.logger_snapshots: list[dict[str, Any]] = []

    def _on_step(self) -> bool:
        return True

    def _on_rollout_end(self) -> None:
        self.rollout_count += 1
        values = getattr(self.model.logger, "name_to_value", {})
        self.logger_snapshots.append({str(key): _jsonable(value) for key, value in values.items()})
        if len(self.logger_snapshots) > 8:
            self.logger_snapshots = self.logger_snapshots[-8:]


class PhaseMetricsWrapper(gym.Wrapper[np.ndarray, int, np.ndarray, dict[str, Any]]):
    def __init__(self, env: gym.Env[np.ndarray, dict[str, Any]], *, label: str) -> None:
        super().__init__(env)
        self.label = label
        self.reset_metrics()

    def reset_metrics(self) -> None:
        self.total_steps = 0
        self.current_episode_steps = 0
        self.current_episode_reward = 0.0
        self.current_episode_progress = 0
        self.current_episode_objective = 0
        self.current_episode_reward_breakdown: Counter[str] = Counter()
        self.episodes: list[dict[str, Any]] = []
        self.action_counts: Counter[str] = Counter()
        self.reward_breakdown_totals: Counter[str] = Counter()
        self.progress_events: Counter[str] = Counter()
        self.objective_events: Counter[str] = Counter()
        self.terminal_reasons: Counter[str] = Counter()
        self.truncated_reasons: Counter[str] = Counter()
        self.progress_signal_count = 0
        self.objective_signal_count = 0
        self.death_before_60 = 0
        self.runtime_errors = 0
        self.sample_rows: list[dict[str, Any]] = []
        self.safety_max = {
            "invalidActionRate": 0.0,
            "postDecodeClampRate": 0.0,
            "vetoRate": 0.0,
            "sanitizerRate": 0.0,
            "noopRate": 0.0,
            "preSamplingMaskRate": 0.0,
        }

    def reset(self, **kwargs: Any) -> tuple[np.ndarray, dict[str, Any]]:
        self.current_episode_steps = 0
        self.current_episode_reward = 0.0
        self.current_episode_progress = 0
        self.current_episode_objective = 0
        self.current_episode_reward_breakdown = Counter()
        observation, info = self.env.reset(**kwargs)
        return np.asarray(observation, dtype=np.float32), dict(info)

    def step(self, action: Any) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        token = int(np.asarray(action, dtype=np.int64).reshape(-1)[0])
        observation, reward, terminated, truncated, info = self.env.step(token)
        self.total_steps += 1
        self.current_episode_steps += 1
        self.current_episode_reward += float(reward)
        self.action_counts[str(token)] += 1

        semantics = _episode_semantics(info)
        reachability = semantics.get("objectiveReachability") if isinstance(semantics.get("objectiveReachability"), Mapping) else {}
        progress_reachable = semantics.get("progressSignalReachable") is True
        objective_reachable = semantics.get("objectiveSignalReachable") is True
        if progress_reachable:
            self.progress_signal_count += 1
            self.current_episode_progress += 1
        if objective_reachable:
            self.objective_signal_count += 1
            self.current_episode_objective += 1
        for event in reachability.get("progressEvents") or []:
            self.progress_events[str(event)] += 1
        for event in reachability.get("objectiveEvents") or []:
            self.objective_events[str(event)] += 1
        for key, value in _reward_breakdown(info).items():
            numeric = _number(value)
            self.reward_breakdown_totals[str(key)] += numeric
            self.current_episode_reward_breakdown[str(key)] += numeric

        telemetry = _action_telemetry(info)
        for key in self.safety_max:
            self.safety_max[key] = max(self.safety_max[key], _number(telemetry.get(key)))
        if len(self.sample_rows) < 32:
            self.sample_rows.append(
                {
                    "step": self.total_steps,
                    "episodeStep": self.current_episode_steps,
                    "actionToken": token,
                    "reward": _round(reward),
                    "progressSignalReachable": progress_reachable,
                    "objectiveSignalReachable": objective_reachable,
                    "terminalReason": info.get("terminalReason"),
                    "truncatedReason": info.get("truncatedReason"),
                    "safety": {
                        key: _round(telemetry.get(key))
                        for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate")
                    },
                }
            )

        if terminated or truncated:
            terminal_reason = info.get("terminalReason")
            truncated_reason = info.get("truncatedReason")
            reason = terminal_reason or truncated_reason or "unknown"
            if terminal_reason:
                self.terminal_reasons[str(terminal_reason)] += 1
            if truncated_reason:
                self.truncated_reasons[str(truncated_reason)] += 1
            if str(reason) == "player-dead" and self.current_episode_steps < 60:
                self.death_before_60 += 1
            self.episodes.append(
                {
                    "steps": self.current_episode_steps,
                    "reward": _round(self.current_episode_reward),
                    "terminated": bool(terminated),
                    "truncated": bool(truncated),
                    "terminalReason": terminal_reason,
                    "truncatedReason": truncated_reason,
                    "reason": str(reason),
                    "progressSignalReachableCount": self.current_episode_progress,
                    "objectiveSignalReachableCount": self.current_episode_objective,
                    "rewardBreakdownTotals": {
                        key: _round(value) for key, value in sorted(self.current_episode_reward_breakdown.items())
                    },
                }
            )
        return np.asarray(observation, dtype=np.float32), float(reward), bool(terminated), bool(truncated), dict(info)

    def summary(self) -> dict[str, Any]:
        completed = len(self.episodes)
        max_step_count = sum(1 for item in self.episodes if item.get("reason") == "max-steps")
        player_dead_count = sum(1 for item in self.episodes if item.get("reason") == "player-dead")
        progress_episode_count = sum(1 for item in self.episodes if int(item.get("progressSignalReachableCount") or 0) > 0)
        objective_episode_count = sum(1 for item in self.episodes if int(item.get("objectiveSignalReachableCount") or 0) > 0)
        stagnation_count = sum(
            1
            for item in self.episodes
            if int(item.get("progressSignalReachableCount") or 0) == 0
            and int(item.get("objectiveSignalReachableCount") or 0) == 0
        )
        return {
            "label": self.label,
            "totalSteps": self.total_steps,
            "completedEpisodes": completed,
            "avgStepsPerEpisode": _round(sum(int(item["steps"]) for item in self.episodes) / completed) if completed else None,
            "deathBefore60Count": int(self.death_before_60),
            "runtimeErrorCount": int(self.runtime_errors),
            "terminalReasonCounts": dict(sorted(self.terminal_reasons.items())),
            "truncatedReasonCounts": dict(sorted(self.truncated_reasons.items())),
            "actionCounts": dict(sorted(self.action_counts.items())),
            "rewardBreakdownTotals": {key: _round(value) for key, value in sorted(self.reward_breakdown_totals.items())},
            "progressEventCounts": dict(sorted(self.progress_events.items())),
            "objectiveEventCounts": dict(sorted(self.objective_events.items())),
            "progressSignalReachableCount": int(self.progress_signal_count),
            "objectiveSignalReachableCount": int(self.objective_signal_count),
            "progressSignalStepShare": _round(self.progress_signal_count / max(1, self.total_steps)),
            "objectiveSignalStepShare": _round(self.objective_signal_count / max(1, self.total_steps)),
            "maxStepShare": _round(max_step_count / max(1, completed)),
            "playerDeadShare": _round(player_dead_count / max(1, completed)),
            "progressEventShare": _round(progress_episode_count / max(1, completed)),
            "objectiveEventShare": _round(objective_episode_count / max(1, completed)),
            "stagnationShare": _round(stagnation_count / max(1, completed)),
            "safetyMaxRates": {key: _round(value) for key, value in self.safety_max.items()},
            "sampleRows": list(self.sample_rows),
        }


def _make_env(*, seed: int, label: str, max_steps: int, reward_profile_id: str) -> PhaseMetricsWrapper:
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max_steps,
            default_seed=seed,
            session_id=f"bt93n-micro-ppo-{label}",
            controller_timeout_seconds=30.0,
            reward_profile_id=reward_profile_id,
            map_key="standard",
            domain_mode="classic-3d",
            game_mode="CLASSIC",
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )
    return PhaseMetricsWrapper(env, label=label)


def _combine_eval_summaries(seed_summaries: list[Mapping[str, Any]]) -> dict[str, Any]:
    total_steps = sum(int(item.get("totalSteps") or 0) for item in seed_summaries)
    completed = sum(int(item.get("completedEpisodes") or 0) for item in seed_summaries)
    deaths = sum(int(item.get("deathBefore60Count") or 0) for item in seed_summaries)
    runtime_errors = sum(int(item.get("runtimeErrorCount") or 0) for item in seed_summaries)
    progress = sum(int(item.get("progressSignalReachableCount") or 0) for item in seed_summaries)
    objective = sum(int(item.get("objectiveSignalReachableCount") or 0) for item in seed_summaries)
    safety: dict[str, float] = {}
    for summary in seed_summaries:
        rates = summary.get("safetyMaxRates") if isinstance(summary.get("safetyMaxRates"), Mapping) else {}
        for key, value in rates.items():
            safety[str(key)] = max(safety.get(str(key), 0.0), _number(value))
    weighted = {}
    for key in ("maxStepShare", "playerDeadShare", "progressEventShare", "objectiveEventShare", "stagnationShare"):
        numerator = sum(_number(item.get(key)) * int(item.get("completedEpisodes") or 0) for item in seed_summaries)
        weighted[key] = _round(numerator / max(1, completed))
    reward_totals: Counter[str] = Counter()
    terminal_counts: Counter[str] = Counter()
    truncated_counts: Counter[str] = Counter()
    for summary in seed_summaries:
        for key, value in (summary.get("rewardBreakdownTotals") or {}).items():
            reward_totals[str(key)] += _number(value)
        for key, value in (summary.get("terminalReasonCounts") or {}).items():
            terminal_counts[str(key)] += int(value)
        for key, value in (summary.get("truncatedReasonCounts") or {}).items():
            truncated_counts[str(key)] += int(value)
    return {
        "seedSummaries": seed_summaries,
        "totalSteps": total_steps,
        "completedEpisodes": completed,
        "deathBefore60Count": deaths,
        "runtimeErrorCount": runtime_errors,
        "progressSignalReachableCount": progress,
        "objectiveSignalReachableCount": objective,
        "progressSignalStepShare": _round(progress / max(1, total_steps)),
        "objectiveSignalStepShare": _round(objective / max(1, total_steps)),
        "safetyMaxRates": {key: _round(value) for key, value in sorted(safety.items())},
        "rewardBreakdownTotals": {key: _round(value) for key, value in sorted(reward_totals.items())},
        "terminalReasonCounts": dict(sorted(terminal_counts.items())),
        "truncatedReasonCounts": dict(sorted(truncated_counts.items())),
        **weighted,
    }


def _run_eval(
    model: PPO,
    *,
    seeds: tuple[int, ...],
    steps_per_seed: int,
    max_steps: int,
    reward_profile_id: str,
) -> dict[str, Any]:
    summaries: list[Mapping[str, Any]] = []
    for seed in seeds:
        env = _make_env(seed=seed, label=f"eval-{seed}", max_steps=max_steps, reward_profile_id=reward_profile_id)
        try:
            observation, _ = env.reset(seed=seed)
            for _ in range(max(1, int(steps_per_seed))):
                action, _ = model.predict(observation, deterministic=True)
                observation, _, terminated, truncated, _ = env.step(action)
                if terminated or truncated:
                    observation, _ = env.reset(seed=seed)
        finally:
            env.close()
        summaries.append(env.summary())
    return _combine_eval_summaries(summaries)


def _source_artifacts() -> dict[str, Any]:
    return {
        "bt93lTaskMetricContract": _source(BT93L_TASK_CONTRACT_PATH, "BT93L pinned task/matrix contract"),
        "bt93lMicroPpoSignal": _source(BT93L_MICRO_SIGNAL_PATH, "BT93L original 10k micro-PPO signal"),
        "bt93lBaselineMatrix": _source(BT93L_BASELINE_MATRIX_PATH, "BT93L baseline/control matrix"),
        "bt93nFixManifest": _source(BT93N_FIX_MANIFEST_PATH, "BT93N.2 selected reward fix manifest"),
        "bt93nStabilityFixReport": _source(BT93N_STABILITY_FIX_REPORT_PATH, "BT93N.2 stability fix report"),
        "bt93nRewardTerminalDelta": _source(BT93N_REWARD_DELTA_PATH, "BT93N.2 pre/post reward-terminal delta"),
        "bt93mComparisonPolicyDecision": _source(BT93M_COMPARISON_POLICY_PATH, "BT93M comparison policy blocker"),
        "bt94aNoStartGate": _source(BT94A_NO_START_PATH, "BT94A closed no-start gate"),
        "curviosEnv": _source(CURVIOS_ENV_PATH, "Python CurviosEnv bridge path"),
        "ppoActionSurface": _source(ACTION_SURFACE_PATH, "masked semantic action surface"),
        "headlessLaneRunner": _source(HEADLESS_RUNNER_PATH, "JS headless training lane"),
    }


def _build_tolerance_contract(
    *,
    total_timesteps: int,
    train_seed: int,
    eval_seeds: tuple[int, ...],
    eval_steps_per_seed: int,
    max_steps: int,
    reward_profile_id: str,
) -> dict[str, Any]:
    task_contract = _read_json(BT93L_TASK_CONTRACT_PATH)
    return {
        "schemaVersion": "bt93n-micro-ppo-tolerance-contract-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93n_micro_ppo_repeat.py",
        "lockedBeforeTraining": True,
        "blockId": "BT93N",
        "phaseId": "93N.3",
        "matrixId": _get(task_contract, "matrix", "matrixId"),
        "semanticWindow": _get(task_contract, "matrix", "semanticWindow"),
        "policyIds": {
            "train": "ppo-bt93n-micro-10k-stochastic",
            "eval": "ppo-bt93n-micro-10k-deterministic",
        },
        "runContract": {
            "requestedTimesteps": int(total_timesteps),
            "minimumTimesteps": 10_000,
            "extension50kExecuted": False,
            "extension50kAllowedInThisCommand": False,
            "rewardProfileId": reward_profile_id,
            "actionSurfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
            "maxStepsPerEpisode": int(max_steps),
            "trainSeed": int(train_seed),
            "evalSeeds": list(eval_seeds),
            "evalStepsPerSeed": int(eval_steps_per_seed),
            "holdoutStatus": _get(task_contract, "matrix", "seeds", "holdoutStatus"),
        },
        "statisticalCorridor": {
            "lockedBefore10kRun": True,
            "deathBefore60TrainMax": 0,
            "deathBefore60EvalMax": 0,
            "minimumTrainCompletedEpisodes": 15,
            "minimumEvalCompletedEpisodes": len(eval_seeds),
            "runtimeErrorCountMax": 0,
            "invalidActionRateMax": 0.0,
            "postDecodeClampRateMax": 0.0,
            "sanitizerRateMax": 0.0,
            "progressSignalReachableMinTrain": 1,
            "objectiveSignalReachableMinTrain": 1,
            "progressSignalReachableMinEval": 1,
            "objectiveSignalReachableMinEval": 1,
            "pureMaxStepPlateauBlocksGreen": True,
            "purePlateauDefinition": "deathBefore60Count == 0 and maxStepShare >= 0.80 and progress/objective event shares are 0",
            "afterTheFactToleranceChangesAllowed": False,
        },
        "resultClasses": [
            "micro-ppo-10k-green-diagnose-only",
            "death-before60-still-blocking",
            "maxstep-plateau-still-blocking",
            "signal-unstable-diagnose-only",
            "measurement-invalid",
        ],
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStartedAtContractWrite": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "sourceArtifacts": _source_artifacts(),
    }


def _safety_ok(summary: Mapping[str, Any], *, required_zero: tuple[str, ...]) -> bool:
    rates = summary.get("safetyMaxRates") if isinstance(summary.get("safetyMaxRates"), Mapping) else {}
    return all(_number(rates.get(key)) == 0.0 for key in required_zero)


def _invalidations(
    *,
    train_summary: Mapping[str, Any],
    eval_summary: Mapping[str, Any],
    tolerance: Mapping[str, Any],
    error: str | None,
    actual_model_timesteps: int,
) -> list[dict[str, Any]]:
    corridor = tolerance.get("statisticalCorridor") if isinstance(tolerance.get("statisticalCorridor"), Mapping) else {}
    invalidations: list[dict[str, Any]] = []
    if error:
        invalidations.append({"id": "runtime-exception", "resultClass": "measurement-invalid", "detail": error})
    if actual_model_timesteps < int(corridor.get("minimumTimesteps") or DEFAULT_TIMESTEPS):
        invalidations.append(
            {
                "id": "timesteps-under-minimum",
                "resultClass": "measurement-invalid",
                "actual": actual_model_timesteps,
            }
        )
    if int(train_summary.get("completedEpisodes") or 0) < int(corridor.get("minimumTrainCompletedEpisodes") or 0):
        invalidations.append({"id": "train-sample-count-too-low", "resultClass": "measurement-invalid"})
    if int(eval_summary.get("completedEpisodes") or 0) < int(corridor.get("minimumEvalCompletedEpisodes") or 0):
        invalidations.append({"id": "eval-sample-count-too-low", "resultClass": "measurement-invalid"})
    runtime_errors = int(train_summary.get("runtimeErrorCount") or 0) + int(eval_summary.get("runtimeErrorCount") or 0)
    if runtime_errors > int(corridor.get("runtimeErrorCountMax") or 0):
        invalidations.append({"id": "runtime-error-count-nonzero", "resultClass": "measurement-invalid", "actual": runtime_errors})
    for label, summary in (("train", train_summary), ("eval", eval_summary)):
        rates = summary.get("safetyMaxRates") if isinstance(summary.get("safetyMaxRates"), Mapping) else {}
        for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate"):
            max_key = f"{key}Max"
            if _number(rates.get(key)) > _number(corridor.get(max_key)):
                invalidations.append(
                    {
                        "id": f"{label}-{key}-nonzero",
                        "resultClass": "measurement-invalid",
                        "actual": _round(rates.get(key)),
                    }
                )
    if int(train_summary.get("deathBefore60Count") or 0) > int(corridor.get("deathBefore60TrainMax") or 0):
        invalidations.append(
            {
                "id": "train-death-before60-nonzero",
                "resultClass": "death-before60-still-blocking",
                "actual": int(train_summary.get("deathBefore60Count") or 0),
            }
        )
    if int(eval_summary.get("deathBefore60Count") or 0) > int(corridor.get("deathBefore60EvalMax") or 0):
        invalidations.append(
            {
                "id": "eval-death-before60-nonzero",
                "resultClass": "death-before60-still-blocking",
                "actual": int(eval_summary.get("deathBefore60Count") or 0),
            }
        )
    if int(train_summary.get("progressSignalReachableCount") or 0) < int(corridor.get("progressSignalReachableMinTrain") or 1):
        invalidations.append({"id": "train-progress-signal-missing", "resultClass": "signal-unstable-diagnose-only"})
    if int(train_summary.get("objectiveSignalReachableCount") or 0) < int(corridor.get("objectiveSignalReachableMinTrain") or 1):
        invalidations.append({"id": "train-objective-signal-missing", "resultClass": "signal-unstable-diagnose-only"})
    if int(eval_summary.get("progressSignalReachableCount") or 0) < int(corridor.get("progressSignalReachableMinEval") or 1):
        invalidations.append({"id": "eval-progress-signal-missing", "resultClass": "signal-unstable-diagnose-only"})
    if int(eval_summary.get("objectiveSignalReachableCount") or 0) < int(corridor.get("objectiveSignalReachableMinEval") or 1):
        invalidations.append({"id": "eval-objective-signal-missing", "resultClass": "signal-unstable-diagnose-only"})

    combined_deaths = int(train_summary.get("deathBefore60Count") or 0) + int(eval_summary.get("deathBefore60Count") or 0)
    pure_plateau = (
        combined_deaths == 0
        and (_number(train_summary.get("maxStepShare")) >= 0.80 or _number(eval_summary.get("maxStepShare")) >= 0.80)
        and _number(train_summary.get("progressEventShare")) == 0
        and _number(train_summary.get("objectiveEventShare")) == 0
        and _number(eval_summary.get("progressEventShare")) == 0
        and _number(eval_summary.get("objectiveEventShare")) == 0
    )
    if pure_plateau:
        invalidations.append({"id": "pure-maxstep-plateau", "resultClass": "maxstep-plateau-still-blocking"})
    return invalidations


def _result_class(invalidations: list[Mapping[str, Any]]) -> str:
    classes = {str(item.get("resultClass")) for item in invalidations}
    if "measurement-invalid" in classes:
        return "measurement-invalid"
    if "death-before60-still-blocking" in classes:
        return "death-before60-still-blocking"
    if "maxstep-plateau-still-blocking" in classes:
        return "maxstep-plateau-still-blocking"
    if "signal-unstable-diagnose-only" in classes:
        return "signal-unstable-diagnose-only"
    return "micro-ppo-10k-green-diagnose-only"


def _phase_coverage(
    *,
    train_summary: Mapping[str, Any],
    eval_summary: Mapping[str, Any],
    tolerance: Mapping[str, Any],
    result_class: str,
    actual_model_timesteps: int,
) -> dict[str, bool]:
    required_zero = ("invalidActionRate", "postDecodeClampRate", "sanitizerRate")
    signal_stable = (
        int(train_summary.get("progressSignalReachableCount") or 0) > 0
        and int(train_summary.get("objectiveSignalReachableCount") or 0) > 0
        and int(eval_summary.get("progressSignalReachableCount") or 0) > 0
        and int(eval_summary.get("objectiveSignalReachableCount") or 0) > 0
        and bool(train_summary.get("rewardBreakdownTotals"))
        and bool(eval_summary.get("rewardBreakdownTotals"))
    )
    plateau_metrics_present = all(
        key in train_summary and key in eval_summary
        for key in ("maxStepShare", "playerDeadShare", "objectiveEventShare", "progressEventShare", "stagnationShare")
    )
    early_death_contract_applied = result_class in {
        "micro-ppo-10k-green-diagnose-only",
        "death-before60-still-blocking",
        "maxstep-plateau-still-blocking",
        "signal-unstable-diagnose-only",
    }
    return {
        "93N.3.1": actual_model_timesteps >= 10_000 and tolerance.get("runContract", {}).get("extension50kExecuted") is False,
        "93N.3.2": "deathBefore60Count" in train_summary and "deathBefore60Count" in eval_summary,
        "93N.3.3": (
            int(train_summary.get("runtimeErrorCount") or 0) + int(eval_summary.get("runtimeErrorCount") or 0) == 0
            and _safety_ok(train_summary, required_zero=required_zero)
            and _safety_ok(eval_summary, required_zero=required_zero)
        ),
        "93N.3.4": signal_stable,
        "93N.3.5": plateau_metrics_present,
        "93N.3.6": early_death_contract_applied,
        "93N.3.7": tolerance.get("lockedBeforeTraining") is True
        and (BT93N_ROOT / "micro_ppo_tolerance_contract.json").is_file(),
    }


def build_report(
    *,
    total_timesteps: int,
    train_seed: int,
    eval_seeds: tuple[int, ...],
    eval_steps_per_seed: int,
    max_steps: int,
    reward_profile_id: str,
    write_contract: bool,
) -> dict[str, Any]:
    started = time.perf_counter()
    tolerance = _build_tolerance_contract(
        total_timesteps=total_timesteps,
        train_seed=train_seed,
        eval_seeds=eval_seeds,
        eval_steps_per_seed=eval_steps_per_seed,
        max_steps=max_steps,
        reward_profile_id=reward_profile_id,
    )
    if write_contract:
        _write_json(TOLERANCE_CONTRACT_PATH, tolerance)

    train_env = _make_env(seed=train_seed, label="train-10k", max_steps=max_steps, reward_profile_id=reward_profile_id)
    callback = PpoMetricCallback()
    error: str | None = None
    model_timesteps = 0
    update_count = 0
    try:
        model = PPO(
            "MlpPolicy",
            train_env,
            seed=train_seed,
            n_steps=128,
            batch_size=64,
            n_epochs=2,
            learning_rate=3e-4,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.0,
            vf_coef=0.5,
            verbose=0,
            device="auto",
        )
        model.learn(total_timesteps=total_timesteps, callback=callback, progress_bar=False)
        model_timesteps = int(model.num_timesteps)
        update_count = int(getattr(model, "_n_updates", 0))
        eval_summary = _run_eval(
            model,
            seeds=eval_seeds,
            steps_per_seed=eval_steps_per_seed,
            max_steps=max_steps,
            reward_profile_id=reward_profile_id,
        )
    except Exception as exc:  # pragma: no cover - report captures runtime failures
        error = str(exc)
        train_env.runtime_errors += 1
        eval_summary = {
            "seedSummaries": [],
            "totalSteps": 0,
            "completedEpisodes": 0,
            "deathBefore60Count": 0,
            "runtimeErrorCount": 1,
            "progressSignalReachableCount": 0,
            "objectiveSignalReachableCount": 0,
            "progressSignalStepShare": 0.0,
            "objectiveSignalStepShare": 0.0,
            "maxStepShare": 0.0,
            "playerDeadShare": 0.0,
            "progressEventShare": 0.0,
            "objectiveEventShare": 0.0,
            "stagnationShare": 0.0,
            "safetyMaxRates": {},
            "rewardBreakdownTotals": {},
        }
    finally:
        train_summary = train_env.summary()
        train_env.close()

    invalidations = _invalidations(
        train_summary=train_summary,
        eval_summary=eval_summary,
        tolerance=tolerance,
        error=error,
        actual_model_timesteps=model_timesteps,
    )
    result_class = _result_class(invalidations)
    phase_coverage = _phase_coverage(
        train_summary=train_summary,
        eval_summary=eval_summary,
        tolerance=tolerance,
        result_class=result_class,
        actual_model_timesteps=model_timesteps,
    )
    ok = bool(error is None and all(phase_coverage.values()) and result_class != "measurement-invalid")
    opens_next = ["93N.4"] if result_class == "micro-ppo-10k-green-diagnose-only" else []
    blocks_next = [] if opens_next else ["93N.4", "BT93O", "BT94A"]
    sample_counts = {
        "trainSteps": int(train_summary.get("totalSteps") or 0),
        "trainCompletedEpisodes": int(train_summary.get("completedEpisodes") or 0),
        "evalSteps": int(eval_summary.get("totalSteps") or 0),
        "evalCompletedEpisodes": int(eval_summary.get("completedEpisodes") or 0),
        "evalSeeds": list(eval_seeds),
        "requestedTimesteps": int(total_timesteps),
        "actualModelTimesteps": int(model_timesteps),
    }
    decision = {
        "resultClass": result_class,
        "blocksNext": blocks_next,
        "opensNext": opens_next,
        "extension50kAllowed": bool(opens_next),
        "extension50kExecuted": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "bt94aClaimAllowed": False,
        "nextAllowedActions": [
            "start 93N.4 50k stability ladder only if resultClass is micro-ppo-10k-green-diagnose-only",
            "otherwise keep BT93N diagnose-only and write a narrow follow-up/root-cause block",
            "do not claim BT93O, BT93P, BT94A, candidate, freeze, holdout, promote, or rollout from this report",
        ],
    }
    return {
        "schemaVersion": "bt93n-micro-ppo-repeat-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93n_micro_ppo_repeat.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": ok,
        "blockId": "BT93N",
        "phaseId": "93N.3",
        "resultClass": result_class,
        "matrixId": tolerance.get("matrixId"),
        "semanticWindow": tolerance.get("semanticWindow"),
        "policyIds": tolerance.get("policyIds"),
        "phaseCoverage": phase_coverage,
        "toleranceContract": {
            "path": _rel(TOLERANCE_CONTRACT_PATH),
            "sha256": _sha256_file(TOLERANCE_CONTRACT_PATH),
            "lockedBeforeTraining": tolerance.get("lockedBeforeTraining") is True,
            "statisticalCorridor": tolerance.get("statisticalCorridor"),
        },
        "requestedTimesteps": int(total_timesteps),
        "actualModelTimesteps": int(model_timesteps),
        "elapsedSeconds": _round(time.perf_counter() - started),
        "error": error,
        "sampleCounts": sample_counts,
        "invalidations": invalidations,
        "ppoMetrics": {
            "model": "stable_baselines3.PPO",
            "updates": update_count,
            "rolloutCount": callback.rollout_count,
            "loggerSnapshots": callback.logger_snapshots,
        },
        "trainSummary": train_summary,
        "evalSummary": eval_summary,
        "plateauAssessment": {
            "train": {
                "maxStepShare": train_summary.get("maxStepShare"),
                "playerDeadShare": train_summary.get("playerDeadShare"),
                "objectiveEventShare": train_summary.get("objectiveEventShare"),
                "progressEventShare": train_summary.get("progressEventShare"),
                "stagnationShare": train_summary.get("stagnationShare"),
            },
            "eval": {
                "maxStepShare": eval_summary.get("maxStepShare"),
                "playerDeadShare": eval_summary.get("playerDeadShare"),
                "objectiveEventShare": eval_summary.get("objectiveEventShare"),
                "progressEventShare": eval_summary.get("progressEventShare"),
                "stagnationShare": eval_summary.get("stagnationShare"),
            },
            "countsAsQualityGreen": False,
        },
        "decision": decision,
        "sourceArtifacts": {
            **_source_artifacts(),
            "toleranceContract": _source(TOLERANCE_CONTRACT_PATH, "BT93N.3 pre-run tolerance contract"),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": True,
            "trainingRunKind": "bt93n-micro-ppo-stability",
            "baselineRun": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": (
                "python python/scripts/bt93n_micro_ppo_repeat.py --write-report "
                f"--total-timesteps {int(total_timesteps)} --eval-steps-per-seed {int(eval_steps_per_seed)}"
            ),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--total-timesteps", type=int, default=DEFAULT_TIMESTEPS)
    parser.add_argument("--train-seed", type=int, default=DEFAULT_TRAIN_SEED)
    parser.add_argument("--eval-seeds", default=",".join(str(seed) for seed in DEFAULT_EVAL_SEEDS))
    parser.add_argument("--eval-steps-per-seed", type=int, default=DEFAULT_EVAL_STEPS_PER_SEED)
    parser.add_argument("--max-steps", type=int, default=DEFAULT_MAX_STEPS)
    parser.add_argument("--reward-profile-id", default=BT93N_PROFILE_ID)
    args = parser.parse_args()

    eval_seeds = tuple(
        int(seed.strip())
        for seed in str(args.eval_seeds).split(",")
        if seed.strip()
    ) or DEFAULT_EVAL_SEEDS
    report = build_report(
        total_timesteps=max(1, int(args.total_timesteps)),
        train_seed=int(args.train_seed),
        eval_seeds=eval_seeds,
        eval_steps_per_seed=max(1, int(args.eval_steps_per_seed)),
        max_steps=max(1, int(args.max_steps)),
        reward_profile_id=str(args.reward_profile_id),
        write_contract=bool(args.write_report),
    )
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "sampleCounts": report["sampleCounts"],
                "invalidations": report["invalidations"],
                "decision": report["decision"],
                "output": _rel(output),
                "toleranceContract": report["toleranceContract"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
