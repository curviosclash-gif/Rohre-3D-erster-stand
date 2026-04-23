from __future__ import annotations

import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv, run_single_env_check


def build_invalid_action() -> dict[str, object]:
    return {
        "pitchUp": False,
        "pitchDown": False,
        "yawLeft": True,
        "yawRight": False,
        "rollLeft": False,
        "rollRight": False,
        "boost": False,
        "cameraSwitch": False,
        "dropItem": False,
        "shootItem": True,
        "shootMG": False,
        "nextItem": False,
        "shootItemIndex": 9,
        "useItem": 9,
    }


def test_curvios_env_exposes_js_authoritative_fields() -> None:
    env = CurviosEnv(max_steps=3, default_seed=92, session_id="bt92-pytest-env")
    try:
        observation, reset_info = env.reset(seed=92)
        assert observation.shape == (64,)
        assert reset_info["observationSchemaVersion"] == "v2-runtime-near"
        assert reset_info["observationLength"] == 64
        assert reset_info["rewardBreakdown"] is None
        assert reset_info["hybridDecision"] is None

        terminated = False
        truncated = False
        last_info = reset_info
        while not (terminated or truncated):
            observation, reward, terminated, truncated, last_info = env.step(build_invalid_action())
            assert observation.shape == (64,)
            assert isinstance(reward, float)
            assert "rewardBreakdown" in last_info
            assert "terminalReason" in last_info
            assert "truncatedReason" in last_info
            assert "hybridDecision" in last_info

        assert truncated is True
        assert last_info["truncatedReason"] == "max-steps"
        assert last_info["observationSchemaVersion"] == "v2-runtime-near"
        assert last_info["observationLength"] == 64
    finally:
        env.close()


def test_curvios_env_passes_gymnasium_check_env() -> None:
    run_single_env_check(max_steps=3, default_seed=93)
