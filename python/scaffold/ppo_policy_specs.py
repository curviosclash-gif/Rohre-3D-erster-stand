"""BT93B normalization and actor/critic head specs for the PPO scaffold."""

from __future__ import annotations

from typing import Any

from bridge.authority_snapshot import ACTION_BOOLEAN_FIELDS, ACTION_INDEX_FIELDS
from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH
from bridge.split_head_action import OPTIONAL_MASK_SOURCE

BT93B_NORMALIZATION_ID = "bt93b-vecnormalize-v1"
BT93B_ACTOR_CRITIC_HEADS_ID = "bt93b-actor-critic-v1"


def build_normalization_spec() -> dict[str, Any]:
    return {
        "normalizationId": BT93B_NORMALIZATION_ID,
        "implementation": "VecNormalize-or-equivalent",
        "normalizeObservation": True,
        "normalizeReward": False,
        "clipObservation": 10.0,
        "clipReward": 10.0,
        "gamma": 0.99,
        "training": True,
        "persistStatsWithCheckpoint": True,
        "statsArtifactPattern": "data/training/ppo/**/vecnormalize.pkl",
        "note": "Observation normalization stays mandatory before the first scaffold smoke and must persist with checkpoints.",
    }


def build_actor_critic_head_spec() -> dict[str, Any]:
    return {
        "headSpecId": BT93B_ACTOR_CRITIC_HEADS_ID,
        "inputObservationLength": EXPECTED_OBSERVATION_LENGTH,
        "sharedEncoder": {
            "type": "mlp",
            "hiddenUnits": [128, 128],
            "activation": "tanh",
        },
        "policyHeads": [
            {
                "headId": "boolean-actions",
                "distribution": "Bernoulli",
                "fields": list(ACTION_BOOLEAN_FIELDS),
            },
            {
                "headId": "shoot-item-index",
                "distribution": "Categorical",
                "field": ACTION_INDEX_FIELDS[0],
                "optionalMaskSource": OPTIONAL_MASK_SOURCE,
                "noOpValue": -1,
            },
            {
                "headId": "use-item-index",
                "distribution": "Categorical",
                "field": ACTION_INDEX_FIELDS[1],
                "optionalMaskSource": OPTIONAL_MASK_SOURCE,
                "noOpValue": -1,
            },
        ],
        "valueHead": {
            "headId": "critic-value",
            "outputs": 1,
        },
        "rawBoundarySurfaceTraining": False,
        "note": "Separate actor heads keep PPO off the raw BT92 boundary surface while the critic stays scalar.",
    }
