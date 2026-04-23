"""BT92 smoke for the JS-authoritative single-env path."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.authority_snapshot import (  # noqa: E402
    ACTION_BOOLEAN_FIELDS,
    ACTION_INDEX_FIELDS,
    BT92_SINGLE_ENV_VISIBLE_FIELDS,
    TRAINER_TRANSITION_INFO_FIELDS,
    TRAINER_TRANSITION_TOP_LEVEL_FIELDS,
)
from bridge.contract_v1 import (  # noqa: E402
    EXPECTED_CONTRACT_VERSION,
    EXPECTED_OBSERVATION_LENGTH,
    EXPECTED_OBSERVATION_SCHEMA_VERSION,
)
from envs.curvios_env import CurviosEnv, run_single_env_check  # noqa: E402

ARTIFACT_PATH = REPO_ROOT / "data" / "training" / "ppo" / "single_env_smoke.json"


def build_invalid_action() -> dict[str, object]:
    action = {field: False for field in ACTION_BOOLEAN_FIELDS}
    action["yawLeft"] = True
    action["shootItem"] = True
    action["shootItemIndex"] = 9
    action["useItem"] = 9
    return action


def main() -> None:
    env = CurviosEnv(max_steps=4, default_seed=92, session_id="bt92-single-env-smoke")
    smoke_steps: list[dict[str, object]] = []
    try:
        reset_observation, reset_info = env.reset(seed=92)
        action = build_invalid_action()
        terminated = False
        truncated = False
        while not (terminated or truncated):
            observation, reward, terminated, truncated, info = env.step(action)
            smoke_steps.append({
                "stepIndex": info["stepIndex"],
                "reward": reward,
                "done": terminated,
                "truncated": truncated,
                "rewardBreakdownKeys": sorted((info["rewardBreakdown"] or {}).keys()),
                "terminalReason": info["terminalReason"],
                "truncatedReason": info["truncatedReason"],
                "hybridDecisionKeys": sorted((info["hybridDecision"] or {}).keys()),
                "action": info["action"],
                "observationLength": int(observation.shape[0]),
            })
        diagnostics = env.get_diagnostics()
    finally:
        env.close()

    run_single_env_check(max_steps=3, default_seed=93)

    artifact = {
        "ok": True,
        "generatedBy": "python/scripts/bt92_single_env_smoke.py",
        "scope": {
            "workerCount": 1,
            "multiEnv": False,
            "vecEnv": False,
            "ppoBaseline": False,
            "contractVersion": EXPECTED_CONTRACT_VERSION,
            "observationSchemaVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
            "observationLength": EXPECTED_OBSERVATION_LENGTH,
        },
        "authority": {
            "trainerTransitionTopLevelFields": TRAINER_TRANSITION_TOP_LEVEL_FIELDS,
            "trainerTransitionInfoFields": TRAINER_TRANSITION_INFO_FIELDS,
            "actionBooleanFields": ACTION_BOOLEAN_FIELDS,
            "actionIndexFields": ACTION_INDEX_FIELDS,
            "visibleEnvFields": BT92_SINGLE_ENV_VISIBLE_FIELDS,
        },
        "smoke": {
            "reset": {
                "observationLength": int(reset_observation.shape[0]),
                "observationSchemaVersion": reset_info["observationSchemaVersion"],
                "rewardBreakdown": reset_info["rewardBreakdown"],
                "terminalReason": reset_info["terminalReason"],
                "truncatedReason": reset_info["truncatedReason"],
                "hybridDecision": reset_info["hybridDecision"],
            },
            "steps": smoke_steps,
        },
        "checkEnv": {
            "tool": "gymnasium.utils.env_checker.check_env",
            "passed": True,
        },
        "diagnostics": diagnostics,
    }
    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(f"{json.dumps(artifact, indent=2)}\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "artifact": str(ARTIFACT_PATH.relative_to(REPO_ROOT)),
        "finalStep": smoke_steps[-1]["stepIndex"] if smoke_steps else None,
        "finalTruncatedReason": smoke_steps[-1]["truncatedReason"] if smoke_steps else None,
    }, indent=2))


if __name__ == "__main__":
    main()
