"""BT91 Python sidecar for the existing bridge-v1 path."""

from __future__ import annotations

import asyncio
import json
import queue
import time
from dataclasses import dataclass, field
from statistics import fmean
from typing import Any, Mapping

import websockets
from websockets.exceptions import ConnectionClosed

from .contract_v1 import (
    BOT_ACTION_RESPONSE_TYPE,
    EXPECTED_CONTRACT_VERSION,
    READY_MESSAGE_TYPE,
    TRAINER_READY_PROTOCOL_VERSION,
    TRAINER_STATS_TYPE,
    TRAINING_ACK_TYPE,
    ContractValidationError,
    create_deterministic_action,
    sanitize_action_payload,
    validate_inbound_envelope,
    validate_runtime_observation_payload,
    validate_transition_payload,
)


def _record_message(counter: dict[str, int], key: str) -> None:
    counter[key] = int(counter.get(key, 0)) + 1


def _latency_summary(samples: list[float]) -> Mapping[str, float | None]:
    if not samples:
        return {
            "min": None,
            "max": None,
            "average": None,
        }
    return {
        "min": round(min(samples), 3),
        "max": round(max(samples), 3),
        "average": round(fmean(samples), 3),
    }


@dataclass(slots=True)
class SidecarState:
    host: str
    port: int
    session_id: str
    started_at_unix_ms: int = field(default_factory=lambda: int(time.time() * 1000))
    message_counts: dict[str, int] = field(default_factory=dict)
    processing_latencies_ms: list[float] = field(default_factory=list)
    validation_failures: int = 0
    last_error: str | None = None
    first_observation_summary: Mapping[str, Any] | None = None
    first_reset_summary: Mapping[str, Any] | None = None
    first_step_summary: Mapping[str, Any] | None = None
    latest_observation_summary: Mapping[str, Any] | None = None
    latest_reset_summary: Mapping[str, Any] | None = None
    latest_step_summary: Mapping[str, Any] | None = None

    def note_latency(self, started_at: float) -> None:
        self.processing_latencies_ms.append((time.perf_counter() - started_at) * 1000.0)

    def note_error(self, error: Exception | str) -> None:
        self.validation_failures += 1
        self.last_error = str(error)

    def note_observation(self, summary: Mapping[str, Any]) -> None:
        if self.first_observation_summary is None:
            self.first_observation_summary = summary
        self.latest_observation_summary = summary

    def note_reset(self, summary: Mapping[str, Any]) -> None:
        if self.first_reset_summary is None:
            self.first_reset_summary = summary
        self.latest_reset_summary = summary

    def note_step(self, summary: Mapping[str, Any]) -> None:
        if self.first_step_summary is None:
            self.first_step_summary = summary
        self.latest_step_summary = summary


class Bt91HeadlessBridgeSidecar:
    """Minimal sidecar that speaks only the existing BT91-approved messages."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8765, session_id: str = "bt91-sidecar") -> None:
        self._state = SidecarState(host=host, port=port, session_id=session_id)
        self._stop_event = asyncio.Event()

    @property
    def state(self) -> SidecarState:
        return self._state

    def build_ready_payload(self) -> Mapping[str, Any]:
        return {
            "ok": True,
            "type": READY_MESSAGE_TYPE,
            "contractVersion": EXPECTED_CONTRACT_VERSION,
            "protocolVersion": TRAINER_READY_PROTOCOL_VERSION,
            "sessionId": self._state.session_id,
        }

    def build_training_ack(self, request_id: int) -> Mapping[str, Any]:
        return {
            "id": request_id,
            "ok": True,
            "type": TRAINING_ACK_TYPE,
            "training": {
                "trained": False,
                "loss": 0.0,
                "epsilon": 0.0,
                "replayFill": 0.0,
                "optimizerSteps": int(self._state.message_counts.get("training-step", 0)),
            },
        }

    def build_stats_payload(self, request_id: int) -> Mapping[str, Any]:
        return {
            "id": request_id,
            "ok": self._state.validation_failures == 0,
            "type": TRAINER_STATS_TYPE,
            "sessionId": self._state.session_id,
            "state": {
                "resumeSource": None,
            },
            "model": {
                "optimizerSteps": int(self._state.message_counts.get("training-step", 0)),
                "epsilon": 0.0,
            },
            "messageCounts": dict(sorted(self._state.message_counts.items())),
            "contractSmoke": {
                "validationFailures": self._state.validation_failures,
                "firstObservation": self._state.first_observation_summary,
                "firstReset": self._state.first_reset_summary,
                "firstStep": self._state.first_step_summary,
                "latestObservation": self._state.latest_observation_summary,
                "latestReset": self._state.latest_reset_summary,
                "latestStep": self._state.latest_step_summary,
                "lastError": self._state.last_error,
            },
            "processingLatencyMs": _latency_summary(self._state.processing_latencies_ms),
        }

    def build_error_response(
        self,
        message_type: str,
        request_id: int,
        error: Exception | str,
    ) -> Mapping[str, Any]:
        error_text = str(error)
        if message_type == "bot-action-request":
            return {
                "id": request_id,
                "ok": False,
                "type": BOT_ACTION_RESPONSE_TYPE,
                "error": error_text,
            }
        if message_type in {"training-reset", "training-step"}:
            return {
                "id": request_id,
                "ok": False,
                "type": TRAINING_ACK_TYPE,
                "error": error_text,
            }
        return {
            "id": request_id,
            "ok": False,
            "type": TRAINER_STATS_TYPE,
            "error": error_text,
        }

    async def _handle_message(self, websocket: Any, raw_message: str) -> None:
        started_at = time.perf_counter()
        message_type = "unknown"
        request_id = -1
        try:
            decoded = json.loads(raw_message)
            message_type, request_id, payload = validate_inbound_envelope(decoded)
            _record_message(self._state.message_counts, message_type)

            if message_type == "bot-action-request":
                summary = validate_runtime_observation_payload(payload)
                self._state.note_observation(summary)
                inventory_length = int((summary.get("player") or {}).get("inventoryLength") or 0)
                action = create_deterministic_action(
                    int(self._state.message_counts.get("training-step", 0)),
                    inventory_length=inventory_length,
                )
                response = {
                    "id": request_id,
                    "ok": True,
                    "type": BOT_ACTION_RESPONSE_TYPE,
                    "action": action,
                }
                await websocket.send(json.dumps(response))
                return

            if message_type == "training-reset":
                summary = validate_transition_payload(payload, "reset")
                self._state.note_reset(summary)
                await websocket.send(json.dumps(self.build_training_ack(request_id)))
                return

            if message_type == "training-step":
                summary = validate_transition_payload(payload, "step")
                self._state.note_step(summary)
                await websocket.send(json.dumps(self.build_training_ack(request_id)))
                return

            await websocket.send(json.dumps(self.build_stats_payload(request_id)))
        except Exception as error:
            self._state.note_error(error)
            await websocket.send(json.dumps(self.build_error_response(message_type, request_id, error)))
        finally:
            self._state.note_latency(started_at)

    async def _client_handler(self, websocket: Any, _path: str | None = None) -> None:
        _record_message(self._state.message_counts, READY_MESSAGE_TYPE)
        await websocket.send(json.dumps(self.build_ready_payload()))
        try:
            async for raw_message in websocket:
                await self._handle_message(websocket, str(raw_message))
        except ConnectionClosed:
            return

    async def run(self) -> None:
        async with websockets.serve(self._client_handler, self._state.host, self._state.port):
            print(
                json.dumps(
                    {
                        "type": "bt91-sidecar-listening",
                        "host": self._state.host,
                        "port": self._state.port,
                        "sessionId": self._state.session_id,
                    },
                    separators=(",", ":"),
                ),
                flush=True,
            )
            await self._stop_event.wait()

    def stop(self) -> None:
        self._stop_event.set()


class Bt92ControlledBridgeSidecar(Bt91HeadlessBridgeSidecar):
    """BT92 sidecar that returns env-supplied actions over the unchanged bridge-v1 path."""

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 8765,
        session_id: str = "bt92-sidecar",
        action_timeout_ms: int = 2_000,
    ) -> None:
        super().__init__(host=host, port=port, session_id=session_id)
        self._action_timeout_seconds = max(0.1, float(action_timeout_ms) / 1000.0)
        self._pending_actions: queue.Queue[Any] = queue.Queue(maxsize=1)

    def queue_action(self, action: Any) -> None:
        if self._pending_actions.full():
            raise RuntimeError("pending BT92 action was not consumed by the JS bridge")
        self._pending_actions.put_nowait(action)

    def _take_action(self, inventory_length: int) -> Mapping[str, Any]:
        try:
            raw_action = self._pending_actions.get(timeout=self._action_timeout_seconds)
        except queue.Empty as exc:
            raise TimeoutError("timed out waiting for BT92 action payload") from exc
        return sanitize_action_payload(raw_action, inventory_length=inventory_length)

    async def _handle_message(self, websocket: Any, raw_message: str) -> None:
        started_at = time.perf_counter()
        message_type = "unknown"
        request_id = -1
        try:
            decoded = json.loads(raw_message)
            message_type, request_id, payload = validate_inbound_envelope(decoded)
            _record_message(self._state.message_counts, message_type)

            if message_type == "bot-action-request":
                summary = validate_runtime_observation_payload(payload)
                self._state.note_observation(summary)
                inventory_length = int((summary.get("player") or {}).get("inventoryLength") or 0)
                action = await asyncio.to_thread(self._take_action, inventory_length)
                response = {
                    "id": request_id,
                    "ok": True,
                    "type": BOT_ACTION_RESPONSE_TYPE,
                    "action": action,
                }
                await websocket.send(json.dumps(response))
                return

            if message_type == "training-reset":
                summary = validate_transition_payload(payload, "reset")
                self._state.note_reset(summary)
                await websocket.send(json.dumps(self.build_training_ack(request_id)))
                return

            if message_type == "training-step":
                summary = validate_transition_payload(payload, "step")
                self._state.note_step(summary)
                await websocket.send(json.dumps(self.build_training_ack(request_id)))
                return

            await websocket.send(json.dumps(self.build_stats_payload(request_id)))
        except Exception as error:
            self._state.note_error(error)
            await websocket.send(json.dumps(self.build_error_response(message_type, request_id, error)))
        finally:
            self._state.note_latency(started_at)
