from __future__ import annotations

import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.contract_v1 import (
    EXPECTED_CONTRACT_VERSION,
    EXPECTED_OBSERVATION_LENGTH,
    EXPECTED_OBSERVATION_SCHEMA_VERSION,
    create_deterministic_action,
    sanitize_action_payload,
    validate_action_payload,
    validate_runtime_observation_payload,
    validate_transition_payload,
)


def build_runtime_observation_payload() -> dict:
    return {
        "mode": "classic",
        "planarMode": False,
        "controlProfileId": "classic-3d",
        "domainId": "classic-3d",
        "domainVersion": "training-domain.v1",
        "dt": 1 / 60,
        "observationSchemaVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
        "observationLength": EXPECTED_OBSERVATION_LENGTH,
        "observation": [0.0] * EXPECTED_OBSERVATION_LENGTH,
        "observationContext": {
            "runtimeNear": True,
            "schemaVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
        },
        "player": {
            "index": 0,
            "hp": 10,
            "maxHp": 10,
            "shieldHp": 2,
            "maxShieldHp": 5,
            "inventoryLength": 1,
        },
    }


def build_transition_payload(operation: str) -> dict:
    payload = {
        "contractVersion": EXPECTED_CONTRACT_VERSION,
        "observationSchemaVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
        "observationLength": EXPECTED_OBSERVATION_LENGTH,
        "operation": operation,
        "episodeId": "bt91-episode-0",
        "episodeIndex": 0,
        "stepIndex": 1 if operation == "step" else 0,
        "reward": 0.05 if operation == "step" else 0.0,
        "done": False,
        "truncated": operation == "step",
        "observation": [0.0] * EXPECTED_OBSERVATION_LENGTH,
        "action": None if operation == "reset" else validate_action_payload(create_deterministic_action(4, 1), 1),
        "info": {
            "domain": {
                "domainId": "classic-3d",
                "version": "training-domain.v1",
                "mode": "classic",
                "planarMode": False,
                "controlProfileId": "classic-3d",
            },
            "terminalReason": None,
            "truncatedReason": "max-steps" if operation == "step" else None,
            "rewardBreakdown": {"survival": 0.05} if operation == "step" else None,
            "match": {
                "matchId": "standard",
                "mode": "classic",
                "planarMode": False,
                "controlProfileId": "classic-3d",
            },
            "observationContext": {
                "runtimeNear": True,
                "schemaVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
            },
            "hybridDecision": {
                "contractVersion": "v80-hybrid-decision-trace-v1",
            } if operation == "step" else None,
        },
        "kernelRuntime": {
            "consumer": {
                "surface": "headless",
            }
        },
    }
    return payload


def test_validate_runtime_observation_payload_accepts_js_authoritative_shape() -> None:
    summary = validate_runtime_observation_payload(build_runtime_observation_payload())
    assert summary["domainId"] == "classic-3d"
    assert summary["observationLength"] == EXPECTED_OBSERVATION_LENGTH


def test_validate_transition_payload_accepts_reset_and_step_shapes() -> None:
    reset_summary = validate_transition_payload(build_transition_payload("reset"), "reset")
    step_summary = validate_transition_payload(build_transition_payload("step"), "step")
    assert reset_summary["observationLength"] == EXPECTED_OBSERVATION_LENGTH
    assert step_summary["rewardBreakdownKeys"] == ["survival"]


def test_create_deterministic_action_stays_in_index_range() -> None:
    action = create_deterministic_action(9, inventory_length=1)
    assert action["useItem"] == -1
    assert action["shootItemIndex"] == -1
    assert action["yawLeft"] in (True, False)


def test_sanitize_action_payload_matches_bt92_index_semantics() -> None:
    invalid_messages: list[str] = []
    action = sanitize_action_payload({
        "yawLeft": 1,
        "shootItem": True,
        "shootItemIndex": 9,
        "useItem": 5,
    }, inventory_length=0, on_invalid=invalid_messages.append)
    assert action["yawLeft"] is True
    assert action["shootItem"] is False
    assert action["shootItemIndex"] == -1
    assert action["useItem"] == -1
    assert invalid_messages == [
        "shootItem requested without valid shootItemIndex",
        "shootItemIndex clamped to inventory range",
        "useItem clamped to inventory range",
    ]
