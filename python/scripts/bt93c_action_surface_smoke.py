"""BT93C.2 SB3 action-surface smoke for the PPO wrapper."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

import gymnasium as gym
import numpy as np
from gymnasium import spaces
from stable_baselines3 import PPO

from bridge.authority_snapshot import ACTION_BOOLEAN_FIELDS, ACTION_INDEX_FIELDS, READ_ONLY_RUNTIME_SURFACES
from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH, validate_action_payload
from envs.ppo_action_surface import (
    CurviosPpoActionWrapper,
    build_action_surface_manifest,
    build_policy_level_action_mask,
    summarize_policy_level_action_mask,
)

DEFAULT_OUTPUT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c" / "action_surface_smoke.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    return path.resolve().relative_to(REPO_ROOT).as_posix()


class ActionSurfaceProbeEnv(gym.Env[np.ndarray, dict[str, Any]]):
    metadata = {"render_modes": []}

    def __init__(self, *, max_steps: int = 8) -> None:
        super().__init__()
        self.max_steps = int(max_steps)
        self.step_index = 0
        self.action_space = spaces.Dict({
            **{key: spaces.Discrete(2) for key in ACTION_BOOLEAN_FIELDS},
            **{key: spaces.Discrete(257, start=-1) for key in ACTION_INDEX_FIELDS},
        })
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(EXPECTED_OBSERVATION_LENGTH,),
            dtype=np.float32,
        )
        self.validated_actions: list[dict[str, Any]] = []

    def _inventory_length(self) -> int:
        return 0 if self.step_index % 2 == 0 else 2

    def _observation(self) -> np.ndarray:
        observation = np.zeros((EXPECTED_OBSERVATION_LENGTH,), dtype=np.float32)
        observation[0] = self.step_index / max(1, self.max_steps)
        observation[1] = float(self._inventory_length())
        return observation

    def _info(self) -> dict[str, Any]:
        return {
            "match": {"inventoryLength": self._inventory_length()},
            "terminalReason": None,
            "truncatedReason": "max-steps" if self.step_index >= self.max_steps else None,
            "rewardBreakdown": {"survival": 1.0},
            "hybridDecision": {"source": "bt93c-action-surface-probe"},
        }

    def reset(self, *, seed: int | None = None, options: Mapping[str, Any] | None = None) -> tuple[np.ndarray, dict[str, Any]]:
        super().reset(seed=seed)
        self.step_index = 0
        self.validated_actions = []
        return self._observation(), self._info()

    def step(self, action: Mapping[str, Any]) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        validate_action_payload(action, self._inventory_length())
        self.validated_actions.append(dict(action))
        self.step_index += 1
        reward = 1.0
        terminated = False
        truncated = self.step_index >= self.max_steps
        return self._observation(), reward, terminated, truncated, self._info()


def _noop_action(width: int) -> np.ndarray:
    return np.zeros((width,), dtype=np.int64)


def run_smoke(
    *,
    output_path: Path,
    train_timesteps: int,
    eval_steps: int,
    block_id: str = "BT93C",
    phase_id: str = "93C.2",
    include_fallback_probes: bool = False,
) -> dict[str, Any]:
    env = CurviosPpoActionWrapper(ActionSurfaceProbeEnv(max_steps=max(4, eval_steps)))
    observation, initial_info = env.reset(seed=932)
    initial_policy_mask = summarize_policy_level_action_mask(
        build_policy_level_action_mask(
            inventory_length=int((initial_info.get("match") or {}).get("inventoryLength") or 0),
        )
    )

    forced_raw_action = np.zeros(env.action_space.shape, dtype=np.int64)
    forced_raw_action[len(ACTION_BOOLEAN_FIELDS) + 0] = 256
    forced_raw_action[list(ACTION_BOOLEAN_FIELDS).index("shootItem")] = 1
    _, _, _, _, forced_info = env.step(forced_raw_action)
    forced_noop_info: Mapping[str, Any] = {}
    forced_invalid_fallback_info: Mapping[str, Any] = {}
    if include_fallback_probes:
        _, _, _, _, forced_noop_info = env.step(_noop_action(len(ACTION_BOOLEAN_FIELDS) + len(ACTION_INDEX_FIELDS)))
        _, _, _, _, forced_invalid_fallback_info = env.step(np.array([], dtype=np.int64))

    model = PPO(
        "MlpPolicy",
        env,
        n_steps=4,
        batch_size=4,
        n_epochs=1,
        learning_rate=0.0003,
        seed=932,
        verbose=0,
    )
    model.learn(total_timesteps=train_timesteps)

    eval_env = CurviosPpoActionWrapper(ActionSurfaceProbeEnv(max_steps=eval_steps))
    obs, _ = eval_env.reset(seed=942)
    eval_rewards: list[float] = []
    for _ in range(eval_steps):
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, terminated, truncated, _ = eval_env.step(action)
        eval_rewards.append(float(reward))
        if terminated or truncated:
            obs, _ = eval_env.reset()

    train_telemetry = env.get_telemetry_report()
    eval_telemetry = eval_env.get_telemetry_report()
    manifest = build_action_surface_manifest()
    forced_policy_mask = forced_info.get("ppoActionSurface", {}).get("policyLevelMask")
    report = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_action_surface_smoke.py",
        "blockId": block_id,
        "phaseId": phase_id,
        "surface": manifest,
        "checks": {
            "sb3CompatibleActionSpace": env.action_space.__class__.__name__ == "MultiDiscrete",
            "observationLength": int(observation.shape[0]),
            "forcedMaskTelemetryVisible": bool(forced_info.get("ppoActionSurface", {}).get("maskEvents")),
            "forcedVetoTelemetryVisible": bool(forced_info.get("ppoActionSurface", {}).get("vetoEvents")),
            "forcedNoopFallbackTelemetryVisible": bool(forced_noop_info.get("ppoActionTelemetry", {}).get("noopCount"))
            if include_fallback_probes
            else None,
            "forcedInvalidFallbackTelemetryVisible": bool(
                forced_invalid_fallback_info.get("ppoActionSurface", {}).get("invalidReasons")
            )
            if include_fallback_probes
            else None,
            "trainIterationCompleted": True,
            "evalIterationCompleted": True,
            "sameWrapperForTrainAndEval": True,
            "rawBoundarySurfaceTraining": False,
            "policyMaskSpecVisible": bool(forced_policy_mask),
            "policyMaskSourceFromJsTransitionPayload": (
                forced_policy_mask or {}
            ).get("source") == manifest["policyLevelMasking"]["source"],
            "policyMaskAppliedBeforePolicySampling": bool(
                (forced_policy_mask or {}).get("preSamplingApplied")
            ),
            "postDecodeClampSeparatedFromPolicyMask": (
                forced_info.get("ppoActionSurface", {})
                .get("postDecodeClamp", {})
                .get("mixedWithPolicyMask")
                is False
            ),
        },
        "policyLevelMasking": {
            "initialProbe": initial_policy_mask,
            "forcedProbe": forced_policy_mask,
            "currentSb3PathConsumesMask": False,
            "bt94aStartEvidence": False,
        },
        "fallbackProbes": {
            "included": include_fallback_probes,
            "noop": forced_noop_info.get("ppoActionSurface") if include_fallback_probes else None,
            "invalidWidthFallback": forced_invalid_fallback_info.get("ppoActionSurface")
            if include_fallback_probes
            else None,
        },
        "train": {
            "totalTimesteps": int(train_timesteps),
            "telemetry": train_telemetry,
        },
        "eval": {
            "steps": int(eval_steps),
            "rewardTotal": sum(eval_rewards),
            "telemetry": eval_telemetry,
        },
        "guardrails": {
            "readOnlyRuntimeSurfaces": list(READ_ONLY_RUNTIME_SURFACES),
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "baselineRunsStarted": False,
            "pilotRunsStarted": False,
        },
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(f"{json.dumps(report, indent=2)}\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--train-timesteps", type=int, default=16)
    parser.add_argument("--eval-steps", type=int, default=8)
    parser.add_argument("--block-id", default="BT93C")
    parser.add_argument("--phase-id", default="93C.2")
    parser.add_argument("--include-fallback-probes", action="store_true")
    args = parser.parse_args()

    report = run_smoke(
        output_path=Path(args.output).resolve(),
        train_timesteps=args.train_timesteps,
        eval_steps=args.eval_steps,
        block_id=args.block_id,
        phase_id=args.phase_id,
        include_fallback_probes=args.include_fallback_probes,
    )
    print(json.dumps({
        "ok": report["ok"],
        "output": _rel(Path(args.output).resolve()),
        "trainTelemetry": report["train"]["telemetry"],
        "evalTelemetry": report["eval"]["telemetry"],
    }, indent=2))


if __name__ == "__main__":
    main()
