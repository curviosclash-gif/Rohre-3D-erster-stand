"""BT93B split-head adapter for scaffold manifests and boundary-safe actions."""

from __future__ import annotations

from typing import Any, Mapping

from .authority_snapshot import ACTION_BOOLEAN_FIELDS, ACTION_INDEX_FIELDS
from .contract_v1 import sanitize_action_payload

BT93B_SPLIT_HEAD_ADAPTER_ID = "bt93b-split-head-v1"
OPTIONAL_MASK_SOURCE = "player.inventoryLength"


def build_manifest_action_surface() -> dict[str, Any]:
    return {
        "adapterId": BT93B_SPLIT_HEAD_ADAPTER_ID,
        "splitHeadRequired": True,
        "booleanFields": list(ACTION_BOOLEAN_FIELDS),
        "indexFields": list(ACTION_INDEX_FIELDS),
        "indexHeadStrategy": "per-field-slot-head-with--1-as-no-op",
        "optionalMaskSource": OPTIONAL_MASK_SOURCE,
        "optionalMaskStatus": "available-but-not-required",
        "rawBoundarySurfaceOnly": True,
        "trainingOnRawBoundarySurface": False,
        "boundarySanitizer": "bridge.contract_v1.sanitize_action_payload",
        "note": "BT93B pins split heads before any PPO scaffold trains against the BT92 boundary surface.",
    }


def sanitize_split_head_action(action: Mapping[str, Any] | None, inventory_length: int = 0) -> dict[str, Any]:
    if action is None:
        return sanitize_action_payload({}, inventory_length)

    boundary_action = {
        key: bool(action.get(key, False))
        for key in ACTION_BOOLEAN_FIELDS
    }
    for key in ACTION_INDEX_FIELDS:
        try:
            boundary_action[key] = int(action.get(key, -1))
        except (TypeError, ValueError):
            boundary_action[key] = -1
    return sanitize_action_payload(boundary_action, inventory_length)
