"""BT93B scaffold logging, hardware, and normalization helpers."""

from __future__ import annotations

import json
import os
import pickle
import platform
import sys
import threading
import time
import tracemalloc
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import numpy as np


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def json_safe(value: Any) -> Any:
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, Path):
        return value.as_posix()
    if isinstance(value, Mapping):
        return {str(key): json_safe(entry) for key, entry in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(entry) for entry in value]
    return value


def write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(json_safe(payload), indent=2)}\n", encoding="utf-8")


class JsonlEventLogger:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = threading.Lock()
        self._path.parent.mkdir(parents=True, exist_ok=True)

    @property
    def path(self) -> Path:
        return self._path

    def event(self, event_type: str, payload: Mapping[str, Any] | None = None) -> None:
        line = {
            "ts": utc_now(),
            "event": event_type,
            **dict(payload or {}),
        }
        with self._lock:
            with self._path.open("a", encoding="utf-8") as handle:
                handle.write(f"{json.dumps(json_safe(line), separators=(',', ':'))}\n")


class ObservationNormalizerStats:
    def __init__(self, observation_length: int, clip_observation: float) -> None:
        self.observation_length = int(observation_length)
        self.clip_observation = float(clip_observation)
        self.count = 0
        self.sum = np.zeros((self.observation_length,), dtype=np.float64)
        self.sum_squares = np.zeros((self.observation_length,), dtype=np.float64)
        self.minimum = np.full((self.observation_length,), np.inf, dtype=np.float64)
        self.maximum = np.full((self.observation_length,), -np.inf, dtype=np.float64)
        self.clip_count = 0

    def update(self, observation: Any) -> None:
        values = np.asarray(observation, dtype=np.float64)
        if values.shape != (self.observation_length,):
            raise ValueError(f"observation shape drifted: {values.shape} != ({self.observation_length},)")
        clipped = np.clip(values, -self.clip_observation, self.clip_observation)
        self.clip_count += int(np.count_nonzero(values != clipped))
        self.count += 1
        self.sum += clipped
        self.sum_squares += clipped * clipped
        self.minimum = np.minimum(self.minimum, clipped)
        self.maximum = np.maximum(self.maximum, clipped)

    def merge_state(self, state: Mapping[str, Any]) -> None:
        count = int(state.get("count") or 0)
        if count <= 0:
            return
        self.count += count
        self.sum += np.asarray(state["sum"], dtype=np.float64)
        self.sum_squares += np.asarray(state["sumSquares"], dtype=np.float64)
        self.minimum = np.minimum(self.minimum, np.asarray(state["min"], dtype=np.float64))
        self.maximum = np.maximum(self.maximum, np.asarray(state["max"], dtype=np.float64))
        self.clip_count += int(state.get("clipCount") or 0)

    def state(self) -> dict[str, Any]:
        return {
            "count": self.count,
            "sum": self.sum,
            "sumSquares": self.sum_squares,
            "min": self.minimum,
            "max": self.maximum,
            "clipCount": self.clip_count,
        }

    def summary(self) -> dict[str, Any]:
        if self.count <= 0:
            mean = np.zeros((self.observation_length,), dtype=np.float64)
            variance = np.zeros((self.observation_length,), dtype=np.float64)
            minimum = np.zeros((self.observation_length,), dtype=np.float64)
            maximum = np.zeros((self.observation_length,), dtype=np.float64)
        else:
            mean = self.sum / self.count
            variance = np.maximum((self.sum_squares / self.count) - (mean * mean), 0.0)
            minimum = self.minimum
            maximum = self.maximum
        return {
            "normalizationId": "bt93b-vecnormalize-v1",
            "implementation": "VecNormalize-equivalent-running-observation-stats",
            "normalizeObservation": True,
            "normalizeReward": False,
            "clipObservation": self.clip_observation,
            "observationLength": self.observation_length,
            "count": self.count,
            "clipCount": self.clip_count,
            "mean": mean,
            "variance": variance,
            "min": minimum,
            "max": maximum,
        }

    def write_pickle(self, path: Path, metadata: Mapping[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "metadata": dict(metadata),
            "stats": self.summary(),
        }
        with path.open("wb") as handle:
            pickle.dump(json_safe(payload), handle)


class RuntimeProbe:
    def __init__(self) -> None:
        self.started_at = utc_now()
        self.started_perf = time.perf_counter()
        tracemalloc.start()

    def snapshot(self) -> dict[str, Any]:
        current, peak = tracemalloc.get_traced_memory()
        return {
            "elapsedSeconds": round(time.perf_counter() - self.started_perf, 6),
            "tracemallocCurrentMB": round(current / 1024 / 1024, 3),
            "tracemallocPeakMB": round(peak / 1024 / 1024, 3),
        }

    def finish(self) -> dict[str, Any]:
        snapshot = self.snapshot()
        tracemalloc.stop()
        return {
            "startedAt": self.started_at,
            "finishedAt": utc_now(),
            **snapshot,
        }


def hardware_snapshot() -> dict[str, Any]:
    return {
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "pythonVersion": sys.version.split()[0],
        "processId": os.getpid(),
        "cpuCount": os.cpu_count(),
    }

