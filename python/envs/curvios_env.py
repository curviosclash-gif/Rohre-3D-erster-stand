"""BT92 single-env wrapper for the existing headless bridge-v1 runtime path."""

from __future__ import annotations

import asyncio
import json
import queue
import socket
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, Mapping

import gymnasium as gym
import numpy as np
from gymnasium import spaces
from gymnasium.utils.env_checker import check_env as gym_check_env

from bridge.authority_snapshot import (
    ACTION_BOOLEAN_FIELDS,
    ACTION_INDEX_FIELDS,
    BT92_SINGLE_ENV_VISIBLE_FIELDS,
)
from bridge.contract_v1 import (
    EXPECTED_CONTRACT_VERSION,
    EXPECTED_OBSERVATION_LENGTH,
    EXPECTED_OBSERVATION_SCHEMA_VERSION,
    validate_transition_payload,
)
from bridge.sidecar_server import Bt92ControlledBridgeSidecar

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTROLLER_SCRIPT_PATH = REPO_ROOT / "scripts" / "training-single-env-bridge.mjs"
DEFAULT_COMMAND_TIMEOUT_SECONDS = 30.0
DEFAULT_MAX_STEPS = 100
DEFAULT_SEED = 91
ACTION_INDEX_SPACE_SIZE = 257


def _choose_local_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _jsonify(value: Any) -> Any:
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        if value.ndim == 0:
            return value.item()
        return value.tolist()
    if isinstance(value, Mapping):
        return {str(key): _jsonify(entry) for key, entry in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonify(entry) for entry in value]
    return value


def _ensure_mapping(value: Any, context: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise RuntimeError(f"{context} must be an object payload")
    return value


class _SidecarRunner:
    def __init__(self, sidecar: Bt92ControlledBridgeSidecar) -> None:
        self._sidecar = sidecar
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._thread_error: BaseException | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        started = threading.Event()

        def _target() -> None:
            loop = asyncio.new_event_loop()
            self._loop = loop
            asyncio.set_event_loop(loop)
            started.set()
            try:
                loop.run_until_complete(self._sidecar.run())
            except BaseException as error:  # pragma: no cover - surfaced through request failure
                self._thread_error = error
            finally:
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                if pending:
                    loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
                loop.close()

        self._thread = threading.Thread(target=_target, name="bt92-sidecar", daemon=True)
        self._thread.start()
        started.wait(timeout=1.0)

    def stop(self) -> None:
        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._sidecar.stop)
        if self._thread is not None:
            self._thread.join(timeout=5.0)
        self._loop = None
        self._thread = None

    @property
    def thread_error(self) -> BaseException | None:
        return self._thread_error


class _ControllerProcess:
    def __init__(
        self,
        *,
        port: int,
        max_steps: int,
        seed: int,
        session_id: str,
        node_executable: str = "node",
        reward_profile_id: str | None = None,
        map_key: str | None = None,
        domain_mode: str | None = None,
        game_mode: str | None = None,
        planar_mode: bool | None = None,
        mode_path: str | None = None,
        curriculum_step_offset: int = 0,
    ) -> None:
        self._stderr_lines: list[str] = []
        self._responses: queue.Queue[dict[str, Any]] = queue.Queue()
        self._request_lock = threading.Lock()
        command = [
            node_executable,
            str(CONTROLLER_SCRIPT_PATH),
            "--port",
            str(port),
            "--max-steps",
            str(max_steps),
            "--seed",
            str(seed),
            "--session-id",
            session_id,
        ]
        if reward_profile_id:
            command.extend(["--reward-profile-id", str(reward_profile_id)])
        if map_key:
            command.extend(["--map-key", str(map_key)])
        if domain_mode:
            command.extend(["--domain-mode", str(domain_mode)])
        if game_mode:
            command.extend(["--game-mode", str(game_mode)])
        if planar_mode is not None:
            command.extend(["--planar-mode", "true" if planar_mode else "false"])
        if mode_path:
            command.extend(["--mode-path", str(mode_path)])
        if curriculum_step_offset:
            command.extend(["--curriculum-step-offset", str(int(curriculum_step_offset))])
        self._process = subprocess.Popen(
            command,
            cwd=str(REPO_ROOT),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self._stdout_thread = threading.Thread(target=self._drain_stdout, name="bt92-controller-stdout", daemon=True)
        self._stderr_thread = threading.Thread(target=self._drain_stderr, name="bt92-controller-stderr", daemon=True)
        self._stdout_thread.start()
        self._stderr_thread.start()

    def _drain_stdout(self) -> None:
        assert self._process.stdout is not None
        for line in self._process.stdout:
            stripped = line.strip()
            if not stripped:
                continue
            if not stripped.startswith("{"):
                self._stderr_lines.append(f"[controller-stdout] {stripped}")
                continue
            try:
                decoded = json.loads(stripped)
            except json.JSONDecodeError:
                self._responses.put({
                    "ok": False,
                    "error": f"controller emitted invalid JSON stdout: {stripped}",
                })
                continue
            self._responses.put(decoded)

    def _drain_stderr(self) -> None:
        assert self._process.stderr is not None
        for line in self._process.stderr:
            stripped = line.rstrip()
            if stripped:
                self._stderr_lines.append(stripped)

    def _error_text(self) -> str:
        tail = self._stderr_lines[-10:]
        return " | ".join(tail) if tail else "no controller stderr"

    def request(self, command: str, timeout_seconds: float = DEFAULT_COMMAND_TIMEOUT_SECONDS) -> Mapping[str, Any]:
        if self._process.poll() is not None:
            raise RuntimeError(f"controller exited early: {self._error_text()}")
        payload = json.dumps({"command": command}, separators=(",", ":"))
        with self._request_lock:
            assert self._process.stdin is not None
            self._process.stdin.write(f"{payload}\n")
            self._process.stdin.flush()
            try:
                response = self._responses.get(timeout=timeout_seconds)
            except queue.Empty as exc:
                raise TimeoutError(f"timed out waiting for controller response to {command}: {self._error_text()}") from exc
        if response.get("ok") is not True:
            raise RuntimeError(str(response.get("error") or f"{command} failed"))
        return response

    @property
    def pid(self) -> int:
        return int(self._process.pid)

    def close(self) -> None:
        if self._process.poll() is None:
            try:
                self.request("close", timeout_seconds=5.0)
            except Exception:
                pass
            if self._process.poll() is None:
                self._process.terminate()
                try:
                    self._process.wait(timeout=5.0)
                except subprocess.TimeoutExpired:
                    self._process.kill()
                    self._process.wait(timeout=5.0)


class CurviosEnv(gym.Env[np.ndarray, dict[str, Any]]):
    """Single headless env that adapts the existing JS bridge-v1 path."""

    metadata = {"render_modes": []}

    def __init__(
        self,
        *,
        max_steps: int = DEFAULT_MAX_STEPS,
        default_seed: int = DEFAULT_SEED,
        session_id: str = "bt92-curvios-env",
        node_executable: str = "node",
        controller_timeout_seconds: float = DEFAULT_COMMAND_TIMEOUT_SECONDS,
        reward_profile_id: str | None = None,
        map_key: str | None = None,
        domain_mode: str | None = None,
        game_mode: str | None = None,
        planar_mode: bool | None = None,
        mode_path: str | None = None,
        curriculum_step_offset: int = 0,
    ) -> None:
        super().__init__()
        self._max_steps = int(max_steps)
        self._default_seed = int(default_seed)
        self._session_id = session_id
        self._node_executable = node_executable
        self._controller_timeout_seconds = float(controller_timeout_seconds)
        self._reward_profile_id = reward_profile_id
        self._map_key = map_key
        self._domain_mode = domain_mode
        self._game_mode = game_mode
        self._planar_mode = planar_mode
        self._mode_path = mode_path
        self._curriculum_step_offset = max(0, int(curriculum_step_offset))
        self._controller: _ControllerProcess | None = None
        self._sidecar: Bt92ControlledBridgeSidecar | None = None
        self._sidecar_runner: _SidecarRunner | None = None
        self._active_seed: int | None = None
        self._needs_reset = True
        self._last_packet: Mapping[str, Any] | None = None
        self._last_info: dict[str, Any] | None = None

        self.action_space = spaces.Dict({
            **{key: spaces.Discrete(2) for key in ACTION_BOOLEAN_FIELDS},
            **{key: spaces.Discrete(ACTION_INDEX_SPACE_SIZE, start=-1) for key in ACTION_INDEX_FIELDS},
        })
        observation_limit = np.full((EXPECTED_OBSERVATION_LENGTH,), np.finfo(np.float32).max, dtype=np.float32)
        self.observation_space = spaces.Box(
            low=-observation_limit,
            high=observation_limit,
            shape=(EXPECTED_OBSERVATION_LENGTH,),
            dtype=np.float32,
        )

    def _start_session(self, seed: int, force_restart: bool) -> None:
        normalized_seed = int(seed)
        if not force_restart and self._controller is not None and self._active_seed == normalized_seed:
            return
        self.close()
        port = _choose_local_port()
        sidecar = Bt92ControlledBridgeSidecar(
            host="127.0.0.1",
            port=port,
            session_id=f"{self._session_id}-{normalized_seed}",
        )
        runner = _SidecarRunner(sidecar)
        runner.start()
        self._sidecar = sidecar
        self._sidecar_runner = runner
        self._controller = _ControllerProcess(
            port=port,
            max_steps=self._max_steps,
            seed=normalized_seed,
            session_id=f"{self._session_id}-{normalized_seed}",
            node_executable=self._node_executable,
            reward_profile_id=self._reward_profile_id,
            map_key=self._map_key,
            domain_mode=self._domain_mode,
            game_mode=self._game_mode,
            planar_mode=self._planar_mode,
            mode_path=self._mode_path,
            curriculum_step_offset=self._curriculum_step_offset,
        )
        self._active_seed = normalized_seed

    def _extract_packet(self, response: Mapping[str, Any], expected_operation: str) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        packet = _ensure_mapping(response.get("packet"), f"{expected_operation} response.packet")
        payload = _ensure_mapping(packet.get("payload"), f"{expected_operation} response.packet.payload")
        validate_transition_payload(payload, expected_operation)
        info_payload = _ensure_mapping(payload.get("info"), f"{expected_operation} response.packet.payload.info")

        observation = np.asarray(payload.get("observation"), dtype=np.float32)
        reward = float(payload.get("reward", 0.0))
        terminated = bool(payload.get("done"))
        truncated = bool(payload.get("truncated"))
        metadata_payload = info_payload.get("metadata")
        if not isinstance(metadata_payload, Mapping):
            metadata_payload = {}
        info = {
            "contractVersion": payload.get("contractVersion"),
            "operation": payload.get("operation"),
            "episodeId": payload.get("episodeId"),
            "episodeIndex": payload.get("episodeIndex"),
            "stepIndex": payload.get("stepIndex"),
            "action": payload.get("action"),
            "domain": info_payload.get("domain"),
            "match": info_payload.get("match"),
            "metadata": metadata_payload,
            "observationContext": info_payload.get("observationContext") or metadata_payload.get("observationContext"),
            "kernelRuntime": payload.get("kernelRuntime"),
            "rewardBreakdown": info_payload.get("rewardBreakdown"),
            "terminalReason": info_payload.get("terminalReason"),
            "truncatedReason": info_payload.get("truncatedReason"),
            "hybridDecision": info_payload.get("hybridDecision") or metadata_payload.get("hybridDecision"),
            "effectiveEnvironment": metadata_payload.get("effectiveEnvironment"),
            "observationSchemaVersion": payload.get("observationSchemaVersion"),
            "observationLength": payload.get("observationLength"),
            "visibleFields": BT92_SINGLE_ENV_VISIBLE_FIELDS,
            "bridgeActionLatencyMs": response.get("actionLatencyMs"),
            "bridgeAckLatencyMs": response.get("ackLatencyMs"),
        }
        if info["contractVersion"] != EXPECTED_CONTRACT_VERSION:
            raise RuntimeError(f"contractVersion drifted: {info['contractVersion']}")
        if info["observationSchemaVersion"] != EXPECTED_OBSERVATION_SCHEMA_VERSION:
            raise RuntimeError(f"observationSchemaVersion drifted: {info['observationSchemaVersion']}")
        if int(info["observationLength"]) != EXPECTED_OBSERVATION_LENGTH:
            raise RuntimeError(f"observationLength drifted: {info['observationLength']}")

        self._last_packet = packet
        self._last_info = info
        return observation, reward, terminated, truncated, info

    def reset(self, *, seed: int | None = None, options: Mapping[str, Any] | None = None) -> tuple[np.ndarray, dict[str, Any]]:
        super().reset(seed=seed)
        requested_seed = int(seed if seed is not None else self._default_seed)
        self._start_session(requested_seed, force_restart=seed is not None)
        assert self._controller is not None
        response = self._controller.request("reset", timeout_seconds=self._controller_timeout_seconds)
        observation, _, _, _, info = self._extract_packet(response, "reset")
        self._needs_reset = False
        return observation, info

    def step(self, action: Mapping[str, Any]) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        if self._needs_reset:
            raise RuntimeError("CurviosEnv.step() requires reset() before stepping")
        if self._sidecar is None or self._controller is None:
            raise RuntimeError("CurviosEnv session is not running")

        self._sidecar.queue_action(_jsonify(action))
        response = self._controller.request("step", timeout_seconds=self._controller_timeout_seconds)
        observation, reward, terminated, truncated, info = self._extract_packet(response, "step")
        self._needs_reset = terminated or truncated
        return observation, reward, terminated, truncated, info

    def get_diagnostics(self) -> Mapping[str, Any]:
        if self._controller is None:
            return {}
        response = self._controller.request("stats", timeout_seconds=self._controller_timeout_seconds)
        return {
            "stats": response.get("stats"),
            "bridgeTelemetry": response.get("bridgeTelemetry"),
            "lastPacket": self._last_packet,
            "lastInfo": self._last_info,
        }

    @property
    def controller_pid(self) -> int | None:
        if self._controller is None:
            return None
        return self._controller.pid

    def close(self) -> None:
        controller = self._controller
        sidecar_runner = self._sidecar_runner

        self._controller = None
        self._sidecar = None
        self._sidecar_runner = None
        self._active_seed = None
        self._needs_reset = True

        if controller is not None:
            controller.close()
        if sidecar_runner is not None:
            sidecar_runner.stop()


def run_single_env_check(*, max_steps: int = 4, default_seed: int = DEFAULT_SEED) -> None:
    env = CurviosEnv(max_steps=max_steps, default_seed=default_seed, session_id="bt92-check-env")
    try:
        gym_check_env(env, skip_render_check=True)
    finally:
        env.close()
