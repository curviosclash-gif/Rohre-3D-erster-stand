from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Mapping

import gymnasium as gym
import numpy as np
from gymnasium import spaces

PYTHON_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH, validate_action_payload
from envs.ppo_action_surface import (
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    CurviosMaskedSemanticActionWrapper,
    build_action_surface_manifest,
)


class ProbeEnv(gym.Env[np.ndarray, dict[str, Any]]):
    metadata = {"render_modes": []}

    def __init__(self) -> None:
        super().__init__()
        self.action_space = spaces.Dict({})
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(EXPECTED_OBSERVATION_LENGTH,),
            dtype=np.float32,
        )
        self.step_index = 0
        self.actions: list[dict[str, Any]] = []

    def _info(self) -> dict[str, Any]:
        return {
            "match": {"inventoryLength": 0 if self.step_index % 2 == 0 else 2},
            "terminalReason": None,
            "truncatedReason": None,
        }

    def reset(self, *, seed: int | None = None, options: Mapping[str, Any] | None = None) -> tuple[np.ndarray, dict[str, Any]]:
        super().reset(seed=seed)
        self.step_index = 0
        self.actions = []
        return np.zeros((EXPECTED_OBSERVATION_LENGTH,), dtype=np.float32), self._info()

    def step(self, action: Mapping[str, Any]) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        validate_action_payload(action, 0 if self.step_index % 2 == 0 else 2)
        self.actions.append(dict(action))
        self.step_index += 1
        return np.zeros((EXPECTED_OBSERVATION_LENGTH,), dtype=np.float32), 0.0, False, self.step_index >= 4, self._info()


def test_masked_semantic_action_surface_applies_pre_sampling_mask_by_construction() -> None:
    env = CurviosMaskedSemanticActionWrapper(ProbeEnv())
    _, info = env.reset(seed=933)
    mask = env.action_masks()
    _, _, _, _, step_info = env.step(0)
    telemetry = env.get_telemetry_report()
    surface = step_info["ppoActionSurface"]

    assert info["match"]["inventoryLength"] == 0
    assert mask.dtype == np.bool_
    assert mask.shape == (env.action_space.n,)
    assert mask.all()
    assert surface["surfaceId"] == PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID
    assert surface["policyLevelMask"]["preSamplingApplied"] is True
    assert surface["policyLevelMask"]["preSamplingByConstruction"] is True
    assert surface["postDecodeClamp"]["count"] == 0
    assert telemetry["postDecodeClampRate"] == 0.0
    assert telemetry["vetoRate"] == 0.0
    assert telemetry["invalidActionRate"] == 0.0


def test_masked_semantic_manifest_excludes_inventory_indexed_actions() -> None:
    manifest = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    excluded = set(manifest["excludedInventoryIndexedActions"])

    assert manifest["gymSpace"] == "Discrete"
    assert manifest["policyLevelMasking"]["preSamplingAppliedInCurrentSb3Path"] is True
    assert "shootItem" in excluded
    assert "shootItemIndex" in excluded
