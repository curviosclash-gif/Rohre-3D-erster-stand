"""BT91 validation helpers for the existing bridge/contract-v1 path.

This module does not invent a Python-specific contract. It only validates the
payloads that come from the JS-authoritative runtime path described in the
BT90 authority snapshot.
"""

from __future__ import annotations

from typing import Any, Callable, Iterable, Mapping, Sequence

from .authority_snapshot import (
    ACTION_BOOLEAN_FIELDS,
    ACTION_INDEX_FIELDS,
    RUNTIME_OBSERVATION_TOP_LEVEL_FIELDS,
    TRAINER_TRANSITION_INFO_FIELDS,
    TRAINER_TRANSITION_TOP_LEVEL_FIELDS,
    TRAINING_V1_MESSAGE_TYPES,
)

EXPECTED_CONTRACT_VERSION = "v1"
EXPECTED_OBSERVATION_SCHEMA_VERSION = "v2-runtime-near"
EXPECTED_OBSERVATION_LENGTH = 64

READY_MESSAGE_TYPE = "trainer-ready"
BOT_ACTION_RESPONSE_TYPE = "bot-action-response"
TRAINING_ACK_TYPE = "training-ack"
TRAINER_STATS_TYPE = "trainer-stats"
TRAINER_READY_PROTOCOL_VERSION = "bt91-bridge-v1"

TRUE_LITERALS = frozenset(("1", "true", "yes", "on"))

SUPPORTED_INBOUND_MESSAGE_TYPES = frozenset(
    message_type for message_type in TRAINING_V1_MESSAGE_TYPES
    if message_type != READY_MESSAGE_TYPE
)


class ContractValidationError(ValueError):
    """Raised when an inbound payload drifts from the JS-authoritative shape."""


def _expect_mapping(value: Any, context: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ContractValidationError(f"{context} must be an object")
    return value


def _expect_sequence(value: Any, context: str) -> Sequence[Any]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes, bytearray)):
        raise ContractValidationError(f"{context} must be an array")
    return value


def _require_keys(payload: Mapping[str, Any], required_keys: Iterable[str], context: str) -> None:
    missing = [key for key in required_keys if key not in payload]
    if missing:
        raise ContractValidationError(f"{context} missing keys: {', '.join(missing)}")


def _require_string(payload: Mapping[str, Any], key: str, context: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ContractValidationError(f"{context}.{key} must be a non-empty string")
    return value.strip()


def _require_bool(payload: Mapping[str, Any], key: str, context: str) -> bool:
    value = payload.get(key)
    if not isinstance(value, bool):
        raise ContractValidationError(f"{context}.{key} must be a boolean")
    return value


def _require_int(payload: Mapping[str, Any], key: str, context: str) -> int:
    value = payload.get(key)
    if isinstance(value, bool) or not isinstance(value, int):
        raise ContractValidationError(f"{context}.{key} must be an integer")
    return value


def _require_number(payload: Mapping[str, Any], key: str, context: str) -> float:
    value = payload.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ContractValidationError(f"{context}.{key} must be numeric")
    return float(value)


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in TRUE_LITERALS
    if isinstance(value, (int, float)):
        return float(value) != 0.0
    return bool(value)


def _clamp_index(value: Any, minimum: int, maximum: int) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return minimum
    if numeric < minimum:
        return minimum
    if numeric > maximum:
        return maximum
    return numeric


def _validate_observation_shape(payload: Mapping[str, Any], context: str) -> None:
    observation_length = _require_int(payload, "observationLength", context)
    if observation_length != EXPECTED_OBSERVATION_LENGTH:
        raise ContractValidationError(
            f"{context}.observationLength drifted: {observation_length} != {EXPECTED_OBSERVATION_LENGTH}"
        )
    observation_schema_version = _require_string(payload, "observationSchemaVersion", context)
    if observation_schema_version != EXPECTED_OBSERVATION_SCHEMA_VERSION:
        raise ContractValidationError(
            f"{context}.observationSchemaVersion drifted: {observation_schema_version}"
        )
    observation = _expect_sequence(payload.get("observation"), f"{context}.observation")
    if len(observation) != EXPECTED_OBSERVATION_LENGTH:
        raise ContractValidationError(
            f"{context}.observation length drifted: {len(observation)} != {EXPECTED_OBSERVATION_LENGTH}"
        )
    for index, entry in enumerate(observation):
        if isinstance(entry, bool) or not isinstance(entry, (int, float)):
            raise ContractValidationError(f"{context}.observation[{index}] must be numeric")


def validate_inbound_envelope(message: Any) -> tuple[str, int, Mapping[str, Any]]:
    envelope = _expect_mapping(message, "envelope")
    message_type = _require_string(envelope, "type", "envelope")
    if message_type not in SUPPORTED_INBOUND_MESSAGE_TYPES:
        raise ContractValidationError(f"unsupported message type: {message_type}")
    request_id = _require_int(envelope, "id", "envelope")
    payload = _expect_mapping(envelope.get("payload"), "envelope.payload")
    return message_type, request_id, payload


def validate_runtime_observation_payload(payload: Any) -> Mapping[str, Any]:
    source = _expect_mapping(payload, "bot-action-request payload")
    _require_keys(source, RUNTIME_OBSERVATION_TOP_LEVEL_FIELDS, "bot-action-request payload")
    _validate_observation_shape(source, "bot-action-request payload")
    _require_string(source, "mode", "bot-action-request payload")
    _require_string(source, "controlProfileId", "bot-action-request payload")
    _require_string(source, "domainId", "bot-action-request payload")
    _require_string(source, "domainVersion", "bot-action-request payload")
    _require_bool(source, "planarMode", "bot-action-request payload")
    _require_number(source, "dt", "bot-action-request payload")
    observation_context = _expect_mapping(
        source.get("observationContext"),
        "bot-action-request payload.observationContext",
    )
    player = source.get("player")
    player_summary: Mapping[str, Any] | None = None
    if player is not None:
        player_payload = _expect_mapping(player, "bot-action-request payload.player")
        if "index" in player_payload:
            _require_int(player_payload, "index", "bot-action-request payload.player")
        if "inventoryLength" in player_payload:
            _require_int(player_payload, "inventoryLength", "bot-action-request payload.player")
        player_summary = {
            "index": player_payload.get("index"),
            "inventoryLength": player_payload.get("inventoryLength"),
        }
    return {
        "mode": source["mode"],
        "planarMode": source["planarMode"],
        "domainId": source["domainId"],
        "controlProfileId": source["controlProfileId"],
        "observationLength": source["observationLength"],
        "player": player_summary,
        "observationContextKeys": sorted(observation_context.keys()),
    }


def validate_action_payload(action: Any, inventory_length: int = 0) -> Mapping[str, Any]:
    payload = _expect_mapping(action, "action")
    _require_keys(
        payload,
        tuple(ACTION_BOOLEAN_FIELDS) + tuple(ACTION_INDEX_FIELDS),
        "action",
    )
    for key in ACTION_BOOLEAN_FIELDS:
        _require_bool(payload, key, "action")
    max_inventory_index = max(-1, int(inventory_length) - 1)
    for key in ACTION_INDEX_FIELDS:
        value = _require_int(payload, key, "action")
        if value < -1 or value > max_inventory_index:
            raise ContractValidationError(
                f"action.{key} must stay within -1..{max_inventory_index}, got {value}"
            )
    return payload


def sanitize_action_payload(
    action: Any,
    inventory_length: int = 0,
    on_invalid: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    sanitized = {
        "pitchUp": False,
        "pitchDown": False,
        "yawLeft": False,
        "yawRight": False,
        "rollLeft": False,
        "rollRight": False,
        "boost": False,
        "cameraSwitch": False,
        "dropItem": False,
        "shootItem": False,
        "shootMG": False,
        "nextItem": False,
        "shootItemIndex": -1,
        "useItem": -1,
    }
    if not isinstance(action, Mapping):
        if on_invalid is not None:
            on_invalid("bot action is not an object payload")
        return sanitized

    for key in ACTION_BOOLEAN_FIELDS:
        sanitized[key] = _coerce_bool(action.get(key))

    max_inventory_index = max(-1, int(inventory_length) - 1)
    raw_shoot_item_index = _clamp_index(action.get("shootItemIndex"), -1, max_inventory_index)
    raw_use_item_index = _clamp_index(action.get("useItem"), -1, max_inventory_index)

    if sanitized["shootItem"] and raw_shoot_item_index >= 0:
        sanitized["shootItemIndex"] = raw_shoot_item_index
    elif sanitized["shootItem"]:
        if on_invalid is not None:
            on_invalid("shootItem requested without valid shootItemIndex")
        sanitized["shootItem"] = False
        sanitized["shootItemIndex"] = -1

    sanitized["useItem"] = raw_use_item_index if raw_use_item_index >= 0 else -1

    try:
        original_shoot_item_index = int(action.get("shootItemIndex"))
    except (TypeError, ValueError):
        original_shoot_item_index = None
    if original_shoot_item_index is not None and original_shoot_item_index != raw_shoot_item_index and on_invalid is not None:
        on_invalid("shootItemIndex clamped to inventory range")

    try:
        original_use_item_index = int(action.get("useItem"))
    except (TypeError, ValueError):
        original_use_item_index = None
    if original_use_item_index is not None and original_use_item_index != raw_use_item_index and on_invalid is not None:
        on_invalid("useItem clamped to inventory range")

    return sanitized


def validate_transition_payload(payload: Any, expected_operation: str) -> Mapping[str, Any]:
    source = _expect_mapping(payload, f"{expected_operation} payload")
    _require_keys(source, TRAINER_TRANSITION_TOP_LEVEL_FIELDS, f"{expected_operation} payload")
    contract_version = _require_string(source, "contractVersion", f"{expected_operation} payload")
    if contract_version != EXPECTED_CONTRACT_VERSION:
        raise ContractValidationError(
            f"{expected_operation} payload.contractVersion drifted: {contract_version}"
        )
    operation = _require_string(source, "operation", f"{expected_operation} payload")
    if operation != expected_operation:
        raise ContractValidationError(
            f"{expected_operation} payload.operation mismatch: {operation}"
        )
    _validate_observation_shape(source, f"{expected_operation} payload")
    _require_string(source, "episodeId", f"{expected_operation} payload")
    _require_int(source, "episodeIndex", f"{expected_operation} payload")
    _require_int(source, "stepIndex", f"{expected_operation} payload")
    _require_number(source, "reward", f"{expected_operation} payload")
    _require_bool(source, "done", f"{expected_operation} payload")
    _require_bool(source, "truncated", f"{expected_operation} payload")
    info = _expect_mapping(source.get("info"), f"{expected_operation} payload.info")
    _require_keys(info, TRAINER_TRANSITION_INFO_FIELDS, f"{expected_operation} payload.info")
    domain = _expect_mapping(info.get("domain"), f"{expected_operation} payload.info.domain")
    _require_string(domain, "domainId", f"{expected_operation} payload.info.domain")
    _require_string(domain, "mode", f"{expected_operation} payload.info.domain")
    _require_bool(domain, "planarMode", f"{expected_operation} payload.info.domain")
    _require_string(domain, "version", f"{expected_operation} payload.info.domain")
    _require_string(domain, "controlProfileId", f"{expected_operation} payload.info.domain")
    _expect_mapping(info.get("observationContext"), f"{expected_operation} payload.info.observationContext")
    if expected_operation == "step":
        action = validate_action_payload(
            source.get("action"),
            int((source.get("info") or {}).get("match", {}).get("inventoryLength", 0)),
        )
    else:
        action = None
        if source.get("action") is not None:
            raise ContractValidationError("reset payload.action must be null")
    kernel_runtime = source.get("kernelRuntime")
    if kernel_runtime is not None:
        _expect_mapping(kernel_runtime, f"{expected_operation} payload.kernelRuntime")
    reward_breakdown = info.get("rewardBreakdown")
    if reward_breakdown is not None:
        _expect_mapping(reward_breakdown, f"{expected_operation} payload.info.rewardBreakdown")
    hybrid_decision = info.get("hybridDecision")
    if hybrid_decision is not None:
        _expect_mapping(hybrid_decision, f"{expected_operation} payload.info.hybridDecision")
    return {
        "episodeId": source["episodeId"],
        "stepIndex": source["stepIndex"],
        "done": source["done"],
        "truncated": source["truncated"],
        "domainId": domain["domainId"],
        "observationLength": source["observationLength"],
        "actionKeys": sorted(action.keys()) if action else [],
        "hasKernelRuntime": isinstance(kernel_runtime, Mapping),
        "rewardBreakdownKeys": sorted(reward_breakdown.keys()) if isinstance(reward_breakdown, Mapping) else [],
    }


def create_deterministic_action(step_index: int, inventory_length: int = 0) -> Mapping[str, Any]:
    safe_step_index = max(0, int(step_index))
    max_inventory_index = max(-1, int(inventory_length) - 1)
    yaw_left = safe_step_index % 12 < 6
    yaw_right = not yaw_left and safe_step_index % 4 == 0
    boost = safe_step_index % 20 == 0
    action = {
        "pitchUp": False,
        "pitchDown": False,
        "yawLeft": yaw_left,
        "yawRight": yaw_right,
        "rollLeft": False,
        "rollRight": False,
        "boost": boost,
        "cameraSwitch": False,
        "dropItem": False,
        "shootItem": False,
        "shootMG": False,
        "nextItem": False,
        "shootItemIndex": -1,
        "useItem": -1 if max_inventory_index < 0 else -1,
    }
    return sanitize_action_payload(action, inventory_length)
