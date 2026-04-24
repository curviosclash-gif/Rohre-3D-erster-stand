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
PPO_INDEX_HEAD_SPACE_SIZE = 257
PPO_INDEX_NOOP_TOKEN = 0
PPO_INDEX_NOOP_VALUE = -1


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


@dataclass
class PpoActionTelemetry:
    total_actions: int = 0
    invalid_action_count: int = 0
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

    def report(self) -> dict[str, Any]:
        return {
            "totalActions": self.total_actions,
            "invalidActionCount": self.invalid_action_count,
            "invalidActionRate": self._rate(self.invalid_action_count),
            "maskCount": self.mask_count,
            "maskRate": self._rate(self.mask_count),
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
        "rawAction": action_array.tolist(),
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


def build_action_surface_manifest() -> dict[str, Any]:
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
            "maskSource": "info.match.inventoryLength from the JS-authoritative transition payload",
        },
        "telemetry": [
            "invalidActionRate",
            "maskRate",
            "vetoRate",
            "sanitizerRate",
            "noopRate",
        ],
        "rawBoundarySurfaceTraining": False,
        "boundarySanitizer": "bridge.contract_v1.sanitize_action_payload",
    }
