"""SB3-trainable PPO action surface for the JS-authoritative action contract."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Mapping

import gymnasium as gym
import numpy as np
from gymnasium import spaces

from bridge.authority_snapshot import ACTION_BOOLEAN_FIELDS, ACTION_INDEX_FIELDS
from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH, sanitize_action_payload

PPO_ACTION_SURFACE_ID = "bt93c-multidiscrete-action-v1"
PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID = "bt93g-masked-semantic-action-v1"
PPO_INDEX_HEAD_SPACE_SIZE = 257
PPO_INDEX_NOOP_TOKEN = 0
PPO_INDEX_NOOP_VALUE = -1
POLICY_MASK_SOURCE = "info.match.inventoryLength from the JS-authoritative transition payload"
POLICY_MASK_CONSUMER_STATUS = "specified-but-not-consumed-by-stable-baselines3-ppo"
POLICY_MASK_CONSUMED_STATUS = "consumed-before-sampling-by-masked-semantic-action-vocabulary"
INVENTORY_GATED_BOOLEAN_FIELDS = frozenset(("dropItem", "shootItem", "nextItem"))
MASKED_SEMANTIC_ACTIONS = (
    ("noop", {}),
    ("yaw-left", {"yawLeft": True}),
    ("yaw-right", {"yawRight": True}),
    ("pitch-up", {"pitchUp": True}),
    ("pitch-down", {"pitchDown": True}),
    ("roll-left", {"rollLeft": True}),
    ("roll-right", {"rollRight": True}),
    ("boost", {"boost": True}),
    ("shoot-mg", {"shootMG": True}),
)


def _inventory_length(info: Mapping[str, Any] | None) -> int:
    if not isinstance(info, Mapping):
        return 0
    match = info.get("match")
    if not isinstance(match, Mapping):
        return 0
    try:
        return max(0, int(match.get("inventoryLength") or 0))
    except (TypeError, ValueError):
        return 0


def _is_noop(action: Mapping[str, Any]) -> bool:
    return not any(bool(action.get(key)) for key in ACTION_BOOLEAN_FIELDS) and all(
        int(action.get(key, PPO_INDEX_NOOP_VALUE)) == PPO_INDEX_NOOP_VALUE
        for key in ACTION_INDEX_FIELDS
    )


def build_policy_level_action_mask(
    *,
    inventory_length: int,
    pre_sampling_applied: bool = False,
    consumer_status: str | None = None,
) -> dict[str, Any]:
    """Build the pre-sampling legality mask required by BT93F.

    The current SB3 PPO path does not consume this mask yet. Keeping it here
    makes the JS-authoritative source and the exact per-head legality contract
    explicit for a mask-capable policy implementation.
    """

    try:
        raw_inventory_length = int(inventory_length)
    except (TypeError, ValueError):
        raw_inventory_length = 0
    safe_inventory_length = max(0, min(raw_inventory_length, PPO_INDEX_HEAD_SPACE_SIZE - 1))
    boolean_masks: dict[str, list[bool]] = {}
    for key in ACTION_BOOLEAN_FIELDS:
        if key in INVENTORY_GATED_BOOLEAN_FIELDS and safe_inventory_length <= 0:
            boolean_masks[key] = [True, False]
        else:
            boolean_masks[key] = [True, True]

    index_mask = [False for _ in range(PPO_INDEX_HEAD_SPACE_SIZE)]
    index_mask[PPO_INDEX_NOOP_TOKEN] = True
    for token in range(1, safe_inventory_length + 1):
        index_mask[token] = True

    return {
        "source": POLICY_MASK_SOURCE,
        "inventoryLength": safe_inventory_length,
        "consumerStatus": consumer_status or POLICY_MASK_CONSUMER_STATUS,
        "preSamplingApplied": bool(pre_sampling_applied),
        "booleanFields": {key: list(mask) for key, mask in boolean_masks.items()},
        "indexFields": {key: list(index_mask) for key in ACTION_INDEX_FIELDS},
        "headOrder": list(ACTION_BOOLEAN_FIELDS) + list(ACTION_INDEX_FIELDS),
    }


def build_masked_semantic_action_mask(*, inventory_length: int) -> dict[str, Any]:
    try:
        raw_inventory_length = int(inventory_length)
    except (TypeError, ValueError):
        raw_inventory_length = 0
    safe_inventory_length = max(0, raw_inventory_length)
    return {
        "source": POLICY_MASK_SOURCE,
        "surfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "inventoryLength": safe_inventory_length,
        "consumerStatus": POLICY_MASK_CONSUMED_STATUS,
        "preSamplingApplied": True,
        "semanticActions": {name: True for name, _ in MASKED_SEMANTIC_ACTIONS},
        "headOrder": [name for name, _ in MASKED_SEMANTIC_ACTIONS],
        "preSamplingByConstruction": True,
        "excludedInventoryIndexedActions": sorted(INVENTORY_GATED_BOOLEAN_FIELDS | set(ACTION_INDEX_FIELDS)),
    }


def summarize_policy_level_action_mask(mask: Mapping[str, Any]) -> dict[str, Any]:
    boolean_fields = mask.get("booleanFields") if isinstance(mask.get("booleanFields"), Mapping) else {}
    index_fields = mask.get("indexFields") if isinstance(mask.get("indexFields"), Mapping) else {}
    semantic_actions = mask.get("semanticActions") if isinstance(mask.get("semanticActions"), Mapping) else {}
    boolean_allowed = {
        str(key): sum(1 for value in values if value)
        for key, values in boolean_fields.items()
        if isinstance(values, list)
    }
    index_allowed = {
        str(key): sum(1 for value in values if value)
        for key, values in index_fields.items()
        if isinstance(values, list)
    }
    gated_boolean_fields = [
        key
        for key, count in boolean_allowed.items()
        if key in INVENTORY_GATED_BOOLEAN_FIELDS and count == 1
    ]
    return {
        "source": mask.get("source"),
        "inventoryLength": mask.get("inventoryLength"),
        "consumerStatus": mask.get("consumerStatus"),
        "preSamplingApplied": bool(mask.get("preSamplingApplied")),
        "preSamplingByConstruction": bool(mask.get("preSamplingByConstruction")),
        "booleanAllowedTokenCounts": boolean_allowed,
        "indexAllowedTokenCounts": index_allowed,
        "semanticAllowedTokenCounts": {
            str(key): 1 if value else 0
            for key, value in semantic_actions.items()
        },
        "excludedInventoryIndexedActions": list(mask.get("excludedInventoryIndexedActions") or []),
        "inventoryGatedBooleanFields": gated_boolean_fields,
        "mixedWithPostDecodeClamp": False,
    }


@dataclass
class PpoActionTelemetry:
    total_actions: int = 0
    invalid_action_count: int = 0
    pre_sampling_mask_count: int = 0
    mask_count: int = 0
    veto_count: int = 0
    sanitizer_count: int = 0
    noop_count: int = 0
    field_counts: Counter[str] = field(default_factory=Counter)
    sanitizer_reasons: Counter[str] = field(default_factory=Counter)
    raw_action_examples: list[dict[str, Any]] = field(default_factory=list)

    def _rate(self, count: int) -> float:
        if self.total_actions <= 0:
            return 0.0
        return count / self.total_actions

    def record_example(self, example: dict[str, Any]) -> None:
        if len(self.raw_action_examples) < 8:
            self.raw_action_examples.append(example)

    def record_pre_sampling_mask(self) -> None:
        self.pre_sampling_mask_count += 1

    def report(self) -> dict[str, Any]:
        return {
            "totalActions": self.total_actions,
            "invalidActionCount": self.invalid_action_count,
            "invalidActionRate": self._rate(self.invalid_action_count),
            "preSamplingMaskCount": self.pre_sampling_mask_count,
            "preSamplingMaskRate": self._rate(self.pre_sampling_mask_count),
            "maskCount": self.mask_count,
            "maskRate": self._rate(self.mask_count),
            "postDecodeClampCount": self.mask_count,
            "postDecodeClampRate": self._rate(self.mask_count),
            "vetoCount": self.veto_count,
            "vetoRate": self._rate(self.veto_count),
            "sanitizerCount": self.sanitizer_count,
            "sanitizerRate": self._rate(self.sanitizer_count),
            "noopCount": self.noop_count,
            "noopRate": self._rate(self.noop_count),
            "fieldCounts": dict(sorted(self.field_counts.items())),
            "sanitizerReasons": dict(sorted(self.sanitizer_reasons.items())),
            "rawActionExamples": list(self.raw_action_examples),
        }


def ppo_action_space() -> spaces.MultiDiscrete:
    return spaces.MultiDiscrete(
        [2 for _ in ACTION_BOOLEAN_FIELDS] + [PPO_INDEX_HEAD_SPACE_SIZE for _ in ACTION_INDEX_FIELDS]
    )


def masked_semantic_action_space() -> spaces.Discrete:
    return spaces.Discrete(len(MASKED_SEMANTIC_ACTIONS))


def decode_multidiscrete_action(
    raw_action: Any,
    *,
    inventory_length: int,
    telemetry: PpoActionTelemetry | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if telemetry is not None:
        telemetry.total_actions += 1

    action_array = np.asarray(raw_action, dtype=np.int64).reshape(-1)
    expected_width = len(ACTION_BOOLEAN_FIELDS) + len(ACTION_INDEX_FIELDS)
    invalid_reasons: list[str] = []
    if action_array.size != expected_width:
        invalid_reasons.append(f"action width {action_array.size} != {expected_width}")
        padded = np.zeros((expected_width,), dtype=np.int64)
        copy_width = min(action_array.size, expected_width)
        if copy_width > 0:
            padded[:copy_width] = action_array[:copy_width]
        action_array = padded

    policy_level_mask = build_policy_level_action_mask(inventory_length=inventory_length)
    boundary_action: dict[str, Any] = {}
    for index, key in enumerate(ACTION_BOOLEAN_FIELDS):
        raw_value = int(action_array[index])
        if raw_value not in (0, 1):
            invalid_reasons.append(f"{key} token out of range: {raw_value}")
        boundary_action[key] = raw_value > 0

    index_offset = len(ACTION_BOOLEAN_FIELDS)
    max_inventory_index = max(PPO_INDEX_NOOP_VALUE, int(inventory_length) - 1)
    mask_events: list[str] = []
    for index, key in enumerate(ACTION_INDEX_FIELDS):
        raw_token = int(action_array[index_offset + index])
        if raw_token < 0 or raw_token >= PPO_INDEX_HEAD_SPACE_SIZE:
            invalid_reasons.append(f"{key} token out of range: {raw_token}")
        token = min(max(raw_token, 0), PPO_INDEX_HEAD_SPACE_SIZE - 1)
        decoded_value = token - 1 if token != PPO_INDEX_NOOP_TOKEN else PPO_INDEX_NOOP_VALUE
        if decoded_value > max_inventory_index:
            mask_events.append(key)
            decoded_value = PPO_INDEX_NOOP_VALUE
        boundary_action[key] = decoded_value

    veto_events: list[str] = []
    if boundary_action["shootItem"] and int(boundary_action["shootItemIndex"]) < 0:
        boundary_action["shootItem"] = False
        veto_events.append("shootItem-without-index")

    sanitizer_events: list[str] = []

    def _record_sanitizer(reason: str) -> None:
        sanitizer_events.append(reason)

    sanitized = sanitize_action_payload(boundary_action, inventory_length, on_invalid=_record_sanitizer)
    sanitizer_changed = sanitized != boundary_action or bool(sanitizer_events)

    if telemetry is not None:
        if invalid_reasons:
            telemetry.invalid_action_count += 1
        if mask_events:
            telemetry.mask_count += 1
        if veto_events:
            telemetry.veto_count += 1
        if sanitizer_changed:
            telemetry.sanitizer_count += 1
        if _is_noop(sanitized):
            telemetry.noop_count += 1
        for field_name in mask_events + veto_events:
            telemetry.field_counts[field_name] += 1
        for reason in sanitizer_events:
            telemetry.sanitizer_reasons[reason] += 1
        telemetry.record_example({
            "raw": action_array.tolist(),
            "inventoryLength": int(inventory_length),
            "decoded": dict(boundary_action),
            "sanitized": dict(sanitized),
            "invalidReasons": list(invalid_reasons),
            "maskEvents": list(mask_events),
            "vetoEvents": list(veto_events),
            "sanitizerEvents": list(sanitizer_events),
        })

    diagnostics = {
        "surfaceId": PPO_ACTION_SURFACE_ID,
        "inventoryLength": int(inventory_length),
        "invalidReasons": invalid_reasons,
        "maskEvents": mask_events,
        "vetoEvents": veto_events,
        "sanitizerEvents": sanitizer_events,
        "sanitizerChangedAction": sanitizer_changed,
        "policyLevelMask": summarize_policy_level_action_mask(policy_level_mask),
        "postDecodeClamp": {
            "eventName": "maskEvents",
            "mixedWithPolicyMask": False,
        },
        "rawAction": action_array.tolist(),
        "boundaryAction": boundary_action,
        "sanitizedAction": sanitized,
    }
    return sanitized, diagnostics


def _neutral_boundary_action() -> dict[str, Any]:
    return {
        **{key: False for key in ACTION_BOOLEAN_FIELDS},
        **{key: PPO_INDEX_NOOP_VALUE for key in ACTION_INDEX_FIELDS},
    }


def decode_masked_semantic_action(
    raw_action: Any,
    *,
    inventory_length: int,
    telemetry: PpoActionTelemetry | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if telemetry is not None:
        telemetry.total_actions += 1

    try:
        token = int(np.asarray(raw_action, dtype=np.int64).reshape(-1)[0])
    except (IndexError, TypeError, ValueError):
        token = 0
    invalid_reasons: list[str] = []
    if token < 0 or token >= len(MASKED_SEMANTIC_ACTIONS):
        invalid_reasons.append(f"semantic token out of range: {token}")
        token = 0

    action_name, action_patch = MASKED_SEMANTIC_ACTIONS[token]
    boundary_action = _neutral_boundary_action()
    boundary_action.update(action_patch)
    sanitized = sanitize_action_payload(boundary_action, inventory_length)
    sanitizer_changed = sanitized != boundary_action
    policy_level_mask = build_masked_semantic_action_mask(inventory_length=inventory_length)

    if telemetry is not None:
        telemetry.record_pre_sampling_mask()
        if invalid_reasons:
            telemetry.invalid_action_count += 1
        if sanitizer_changed:
            telemetry.sanitizer_count += 1
        if _is_noop(sanitized):
            telemetry.noop_count += 1
        telemetry.record_example({
            "raw": token,
            "semanticAction": action_name,
            "inventoryLength": int(inventory_length),
            "decoded": dict(boundary_action),
            "sanitized": dict(sanitized),
            "invalidReasons": list(invalid_reasons),
            "maskEvents": [],
            "vetoEvents": [],
            "sanitizerEvents": ["semantic-sanitizer-changed"] if sanitizer_changed else [],
        })

    diagnostics = {
        "surfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "inventoryLength": int(inventory_length),
        "semanticAction": action_name,
        "invalidReasons": invalid_reasons,
        "maskEvents": [],
        "vetoEvents": [],
        "sanitizerEvents": ["semantic-sanitizer-changed"] if sanitizer_changed else [],
        "sanitizerChangedAction": sanitizer_changed,
        "policyLevelMask": summarize_policy_level_action_mask(policy_level_mask),
        "postDecodeClamp": {
            "eventName": "maskEvents",
            "count": 0,
            "mixedWithPolicyMask": False,
        },
        "rawAction": token,
        "boundaryAction": boundary_action,
        "sanitizedAction": sanitized,
    }
    return sanitized, diagnostics


class CurviosPpoActionWrapper(gym.Wrapper[np.ndarray, np.ndarray, np.ndarray, dict[str, Any]]):
    """Map SB3 MultiDiscrete actions to the bridge-v1 bool/index action dict."""

    def __init__(self, env: gym.Env[np.ndarray, dict[str, Any]]) -> None:
        super().__init__(env)
        self.action_space = ppo_action_space()
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(EXPECTED_OBSERVATION_LENGTH,),
            dtype=np.float32,
        )
        self._last_info: Mapping[str, Any] | None = None
        self.telemetry = PpoActionTelemetry()

    def reset(self, **kwargs: Any) -> tuple[np.ndarray, dict[str, Any]]:
        observation, info = self.env.reset(**kwargs)
        self._last_info = info
        return np.asarray(observation, dtype=np.float32), dict(info)

    def step(self, action: Any) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        inventory_length = _inventory_length(self._last_info)
        sanitized, diagnostics = decode_multidiscrete_action(
            action,
            inventory_length=inventory_length,
            telemetry=self.telemetry,
        )
        observation, reward, terminated, truncated, info = self.env.step(sanitized)
        enriched_info = dict(info)
        enriched_info["ppoActionSurface"] = diagnostics
        enriched_info["ppoActionTelemetry"] = self.telemetry.report()
        self._last_info = enriched_info
        return np.asarray(observation, dtype=np.float32), float(reward), bool(terminated), bool(truncated), enriched_info

    def get_telemetry_report(self) -> dict[str, Any]:
        return self.telemetry.report()

    def reset_telemetry(self) -> None:
        self.telemetry = PpoActionTelemetry()


class CurviosMaskedSemanticActionWrapper(gym.Wrapper[np.ndarray, np.ndarray, np.ndarray, dict[str, Any]]):
    """Inventory-safe semantic action vocabulary for BT93G repair training."""

    def __init__(self, env: gym.Env[np.ndarray, dict[str, Any]]) -> None:
        super().__init__(env)
        self.action_space = masked_semantic_action_space()
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(EXPECTED_OBSERVATION_LENGTH,),
            dtype=np.float32,
        )
        self._last_info: Mapping[str, Any] | None = None
        self.telemetry = PpoActionTelemetry()

    def reset(self, **kwargs: Any) -> tuple[np.ndarray, dict[str, Any]]:
        observation, info = self.env.reset(**kwargs)
        self._last_info = info
        return np.asarray(observation, dtype=np.float32), dict(info)

    def action_masks(self) -> np.ndarray:
        inventory_length = _inventory_length(self._last_info)
        mask = build_masked_semantic_action_mask(inventory_length=inventory_length)
        return np.asarray([bool(value) for value in mask["semanticActions"].values()], dtype=bool)

    def step(self, action: Any) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        inventory_length = _inventory_length(self._last_info)
        sanitized, diagnostics = decode_masked_semantic_action(
            action,
            inventory_length=inventory_length,
            telemetry=self.telemetry,
        )
        observation, reward, terminated, truncated, info = self.env.step(sanitized)
        enriched_info = dict(info)
        enriched_info["ppoActionSurface"] = diagnostics
        enriched_info["ppoActionTelemetry"] = self.telemetry.report()
        self._last_info = enriched_info
        return np.asarray(observation, dtype=np.float32), float(reward), bool(terminated), bool(truncated), enriched_info

    def get_telemetry_report(self) -> dict[str, Any]:
        return self.telemetry.report()

    def reset_telemetry(self) -> None:
        self.telemetry = PpoActionTelemetry()


def make_curvios_action_wrapper(
    env: gym.Env[np.ndarray, dict[str, Any]],
    *,
    surface_id: str | None = None,
) -> gym.Wrapper[np.ndarray, np.ndarray, np.ndarray, dict[str, Any]]:
    if surface_id == PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID:
        return CurviosMaskedSemanticActionWrapper(env)
    return CurviosPpoActionWrapper(env)


def build_action_surface_manifest(surface_id: str | None = None) -> dict[str, Any]:
    if surface_id == PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID:
        return {
            "surfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
            "gymSpace": "Discrete",
            "sb3Trainable": True,
            "semanticActions": [name for name, _ in MASKED_SEMANTIC_ACTIONS],
            "excludedInventoryIndexedActions": sorted(INVENTORY_GATED_BOOLEAN_FIELDS | set(ACTION_INDEX_FIELDS)),
            "policyLevelMasking": {
                "specified": True,
                "preSamplingAppliedInCurrentSb3Path": True,
                "consumerStatus": POLICY_MASK_CONSUMED_STATUS,
                "source": POLICY_MASK_SOURCE,
                "preSamplingByConstruction": True,
                "mixedWithPostDecodeClamp": False,
            },
            "telemetry": [
                "policyLevelMask",
                "preSamplingMaskRate",
                "postDecodeClampRate",
                "invalidActionRate",
                "vetoRate",
                "sanitizerRate",
                "noopRate",
            ],
            "rawBoundarySurfaceTraining": False,
            "boundarySanitizer": "bridge.contract_v1.sanitize_action_payload",
        }
    return {
        "surfaceId": PPO_ACTION_SURFACE_ID,
        "gymSpace": "MultiDiscrete",
        "sb3Trainable": True,
        "booleanFields": list(ACTION_BOOLEAN_FIELDS),
        "indexFields": list(ACTION_INDEX_FIELDS),
        "nvec": ppo_action_space().nvec.astype(int).tolist(),
        "indexEncoding": {
            "token0": "no-op / -1",
            "tokenN": "inventory index N-1",
            "width": PPO_INDEX_HEAD_SPACE_SIZE,
            "maskSource": POLICY_MASK_SOURCE,
        },
        "policyLevelMasking": {
            "specified": True,
            "preSamplingAppliedInCurrentSb3Path": False,
            "consumerStatus": POLICY_MASK_CONSUMER_STATUS,
            "requiredConsumer": "mask-capable PPO policy/distribution hook before action sampling",
            "source": POLICY_MASK_SOURCE,
            "inventoryGatedBooleanFields": sorted(INVENTORY_GATED_BOOLEAN_FIELDS),
            "indexFieldRule": "token0 stays no-op; tokens 1..inventoryLength are legal item indices; higher tokens are masked",
            "mixedWithPostDecodeClamp": False,
        },
        "telemetry": [
            "policyLevelMask",
            "invalidActionRate",
            "maskRate",
            "vetoRate",
            "sanitizerRate",
            "noopRate",
        ],
        "rawBoundarySurfaceTraining": False,
        "boundarySanitizer": "bridge.contract_v1.sanitize_action_payload",
    }
