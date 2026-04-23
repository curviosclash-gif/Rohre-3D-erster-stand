"""BT93A 2-env lane plan and smoke harness for the runtime-near boundary path."""

from __future__ import annotations

import argparse
import concurrent.futures
import ctypes
import json
import os
import sys
import threading
import time
import tracemalloc
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.authority_snapshot import (  # noqa: E402
    ACTION_BOOLEAN_FIELDS,
    ACTION_INDEX_FIELDS,
    ALLOWED_PPO_BUILD_LOCATIONS,
    READ_ONLY_RUNTIME_SURFACES,
)
from envs.curvios_env import CurviosEnv, DEFAULT_COMMAND_TIMEOUT_SECONDS  # noqa: E402

ARTIFACT_PATH = REPO_ROOT / "data" / "training" / "ppo" / "lane_baseline_2env.json"
LANE_PLAN_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt93a_lane_plan.json"
HANDOVER_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt93a_handover_2env.json"
WORKER_COUNT = 2
TARGET_STEPS_PER_ENV = 500
ONE_WORKER_BASELINE_STEPS_PER_SEC = 28.0
MAX_WALL_CLOCK_BUDGET_MINUTES = 10
MAX_WALL_CLOCK_MULTIPLIER_BEFORE_DOWNGRADE = 2.0
FAILURE_RATE_DOWNGRADE_THRESHOLD = 0.05
FOUR_ENV_MIN_STEPS_PER_SEC = 45.0
FOUR_ENV_MAX_FAILURE_RATE = 0.02
BATCH_UPDATE_WINDOWS_SECONDS = (15, 30, 60)
MEMORY_SAMPLE_INTERVAL_SECONDS = 0.5
PYTHON_RSS_GROWTH_LIMIT_MB = 24.0
TRACEMALLOC_GROWTH_LIMIT_MB = 4.0

if sys.platform == "win32":
    _DWORD = ctypes.c_ulong
    _SIZE_T = ctypes.c_size_t

    class _ProcessMemoryCountersEx(ctypes.Structure):
        _fields_ = [
            ("cb", _DWORD),
            ("PageFaultCount", _DWORD),
            ("PeakWorkingSetSize", _SIZE_T),
            ("WorkingSetSize", _SIZE_T),
            ("QuotaPeakPagedPoolUsage", _SIZE_T),
            ("QuotaPagedPoolUsage", _SIZE_T),
            ("QuotaPeakNonPagedPoolUsage", _SIZE_T),
            ("QuotaNonPagedPoolUsage", _SIZE_T),
            ("PagefileUsage", _SIZE_T),
            ("PeakPagefileUsage", _SIZE_T),
            ("PrivateUsage", _SIZE_T),
        ]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _to_mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return {key: counter[key] for key in sorted(counter)}


def _round_mb(value: int | float | None) -> float | None:
    if value is None:
        return None
    return round(float(value) / 1024 / 1024, 3)


def _summarize_series_mb(values: list[int | float]) -> dict[str, float | None]:
    if not values:
        return {
            "startMB": None,
            "endMB": None,
            "peakMB": None,
            "deltaMB": None,
        }
    start = float(values[0])
    end = float(values[-1])
    peak = float(max(values))
    return {
        "startMB": _round_mb(start),
        "endMB": _round_mb(end),
        "peakMB": _round_mb(peak),
        "deltaMB": _round_mb(end - start),
    }


def _read_process_memory(pid: int) -> dict[str, int] | None:
    if pid <= 0 or sys.platform != "win32":
        return None

    desired_access = 0x0010 | 0x0400 | 0x1000
    handle = ctypes.windll.kernel32.OpenProcess(desired_access, False, pid)
    if not handle:
        return None

    try:
        counters = _ProcessMemoryCountersEx()
        counters.cb = ctypes.sizeof(_ProcessMemoryCountersEx)
        ok = ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb)
        if not ok:
            return None
        return {
            "rssBytes": int(counters.WorkingSetSize),
            "privateBytes": int(counters.PrivateUsage),
        }
    finally:
        ctypes.windll.kernel32.CloseHandle(handle)


def _classify_failure(error: BaseException | str | None) -> str:
    if error is None:
        return "unknown"
    if isinstance(error, TimeoutError):
        return "timeout"

    message = str(error).strip()
    lowered = message.lower()
    if "timed out" in lowered or "timeout" in lowered:
        return "timeout"
    if "socket" in lowered and "closed" in lowered:
        return "socket-closed"
    if isinstance(error, BaseException):
        return error.__class__.__name__
    return message.split(":", 1)[0] or "runtime-error"


def _build_batch_math() -> dict[str, Any]:
    examples = []
    for window_seconds in BATCH_UPDATE_WINDOWS_SECONDS:
        total_rollout_steps = int(ONE_WORKER_BASELINE_STEPS_PER_SEC * window_seconds)
        examples.append({
            "targetUpdateWindowSeconds": window_seconds,
            "maxRolloutStepsTotalAt1WorkerAnchor": total_rollout_steps,
            "maxNstepsAt2Env": total_rollout_steps // WORKER_COUNT,
        })
    return {
        "formula": "max_rollout_steps_total = measured_steps_per_second * target_update_window_seconds",
        "baselineAnchorArtifact": "data/training/ppo/throughput_analysis_btf08.json",
        "baselineMeasuredStepsPerSecond": ONE_WORKER_BASELINE_STEPS_PER_SEC,
        "rule": "BT93B must replace the 1-worker anchor with measured BT93A lane evidence before pinning rollout sizes.",
        "examples": examples,
    }


def _build_measured_rollout_examples(measured_steps_per_second: float, worker_count: int) -> list[dict[str, int]]:
    examples = []
    safe_worker_count = max(worker_count, 1)
    for window_seconds in BATCH_UPDATE_WINDOWS_SECONDS:
        total_rollout_steps = int(round(measured_steps_per_second * window_seconds))
        examples.append({
            "targetUpdateWindowSeconds": window_seconds,
            "maxRolloutStepsTotalAtMeasuredLane": total_rollout_steps,
            "maxNstepsAtValidatedLane": total_rollout_steps // safe_worker_count,
        })
    return examples


def build_lane_plan() -> dict[str, Any]:
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93a_2env_smoke.py --plan-only",
        "scope": {
            "phase": "93A.1.2",
            "smallestClaimableLane": True,
            "workerCount": WORKER_COUNT,
            "targetStepsPerEnv": TARGET_STEPS_PER_ENV,
            "totalTargetSteps": WORKER_COUNT * TARGET_STEPS_PER_ENV,
            "ppoBaseline": False,
        },
        "processModel": {
            "envFactory": "CurviosEnv",
            "controllerScript": "scripts/training-single-env-bridge.mjs",
            "sidecarProcess": "Bt92ControlledBridgeSidecar",
            "portStrategy": "dynamic localhost port per env via CurviosEnv._choose_local_port()",
            "controllerTimeoutSeconds": DEFAULT_COMMAND_TIMEOUT_SECONDS,
            "wallClockBudgetMinutes": MAX_WALL_CLOCK_BUDGET_MINUTES,
            "sessionIdPattern": "bt93a-2env-smoke-{envId}",
        },
        "restartBehavior": {
            "perEnvLifecycle": "each worker owns one CurviosEnv and closes it deterministically after the lane run",
            "rerunStrategy": "restart the affected env/controller/sidecar trio instead of reusing a failed process",
            "fallbackLane": "pin a sequential 2-env fallback lane if subprocess churn or wall-clock overruns appear",
        },
        "comparisonAnchor": {
            "artifact": "data/training/ppo/throughput_analysis_btf08.json",
            "realisticStepsPerSec1Worker": ONE_WORKER_BASELINE_STEPS_PER_SEC,
            "maxWallClockMinutesBeforeDowngrade": (
                MAX_WALL_CLOCK_BUDGET_MINUTES * MAX_WALL_CLOCK_MULTIPLIER_BEFORE_DOWNGRADE
            ),
        },
        "fourEnvPolicy": {
            "optionalFollowUpOnly": True,
            "defaultStatus": "locked-until-measured-2env-evidence",
            "minMeasured2EnvStepsPerSec": FOUR_ENV_MIN_STEPS_PER_SEC,
            "maxMeasured2EnvFailureRate": FOUR_ENV_MAX_FAILURE_RATE,
            "downgradeRule": "Without measured 2-env evidence, BT93A stays on 2-env or the sequential fallback lane.",
        },
        "batchMath": _build_batch_math(),
        "actionBoundary": {
            "booleanFields": ACTION_BOOLEAN_FIELDS,
            "indexFields": ACTION_INDEX_FIELDS,
            "rawIndexSurfaceOnly": True,
        },
        "scopeGuardrails": {
            "allowedBuildLocations": ALLOWED_PPO_BUILD_LOCATIONS,
            "readOnlyRuntimeSurfaces": READ_ONLY_RUNTIME_SURFACES,
            "phaseBoundary": "BT93A documents harness, timeout, throughput and failure evidence only.",
        },
        "pendingThroughputArtifact": str(ARTIFACT_PATH.relative_to(REPO_ROOT)),
    }


def build_bt93a_handover(
    smoke_artifact: dict[str, Any],
    *,
    generated_by: str,
) -> dict[str, Any]:
    scope = _to_mapping(smoke_artifact.get("scope"))
    performance = _to_mapping(smoke_artifact.get("performance"))
    stability = _to_mapping(smoke_artifact.get("stability"))
    downgrade_check = _to_mapping(smoke_artifact.get("downgradeCheck"))
    memory = _to_mapping(smoke_artifact.get("memory"))
    leak_check = _to_mapping(memory.get("leakCheck"))
    lane_plan = _to_mapping(smoke_artifact.get("lanePlan"))

    worker_count = int(scope.get("workerCount") or WORKER_COUNT)
    steps_per_second = float(performance.get("stepsPerSecond") or 0.0)
    failure_rate = float(performance.get("failureRate") or 0.0)
    wall_clock_seconds = float(performance.get("wallClockSeconds") or 0.0)
    timeout_rate_per_request = float(stability.get("timeoutRatePerRequest") or 0.0)
    allow_four_env = bool(downgrade_check.get("allow4Env"))
    downgraded = bool(downgrade_check.get("downgraded"))
    memory_stable = bool(leak_check.get("memoryStable"))

    downgrade_triggers = [
        f"measured 2-env stepsPerSecond < {ONE_WORKER_BASELINE_STEPS_PER_SEC}",
        f"failureRate > {FAILURE_RATE_DOWNGRADE_THRESHOLD}",
        f"wallClockSeconds > {MAX_WALL_CLOCK_BUDGET_MINUTES * 60 * MAX_WALL_CLOCK_MULTIPLIER_BEFORE_DOWNGRADE}",
        "memory.leakCheck.memoryStable == false",
        "timeoutRatePerRequest > 0 OR bridgeRequestsSent != bridgeResponsesReceived",
    ]
    four_env_unlock_criteria = [
        f"measured 2-env stepsPerSecond >= {FOUR_ENV_MIN_STEPS_PER_SEC}",
        f"failureRate <= {FOUR_ENV_MAX_FAILURE_RATE}",
        "downgradeCheck.downgraded == false",
        "4-env remains a follow-up lane until fresh direct evidence exists",
    ]
    four_env_status = (
        "eligible-from-2env-thresholds-not-yet-measured"
        if allow_four_env
        else "blocked-by-2env-thresholds"
    )

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": generated_by,
        "targetBlock": "BT93B",
        "sourceArtifact": str(ARTIFACT_PATH.relative_to(REPO_ROOT)),
        "sourcePhase": str(scope.get("phase") or "93A.2"),
        "measuredLane": {
            "validatedEnvCount": worker_count,
            "stepsPerSecond": steps_per_second,
            "failureRate": failure_rate,
            "wallClockSeconds": wall_clock_seconds,
            "timeoutRatePerRequest": timeout_rate_per_request,
            "memoryStable": memory_stable,
            "totalFailures": int(performance.get("totalFailures") or 0),
        },
        "scaffoldContract": {
            "defaultStartEnvCount": worker_count,
            "maxValidatedEnvCount": worker_count,
            "requiredMeasuredArtifactForBt93B": str(ARTIFACT_PATH.relative_to(REPO_ROOT)),
            "requiredHandoverArtifactForBt93B": str(HANDOVER_PATH.relative_to(REPO_ROOT)),
            "rule": "BT93B starts on the smallest validated lane. 4-env remains optional follow-up only.",
            "fourEnvStatus": four_env_status,
        },
        "rolloutBudgetDerivation": {
            "formula": "max_rollout_steps_total = measured_lane_steps_per_second * target_update_window_seconds",
            "rule": "BT93B rollout sizes must come from this measured 2-env artifact, never from draft numbers.",
            "examples": _build_measured_rollout_examples(steps_per_second, worker_count),
        },
        "downgradeRules": {
            "laneDowngradeTriggers": downgrade_triggers,
            "fourEnvUnlockCriteria": four_env_unlock_criteria,
            "currentDowngradeDecision": "stay-on-validated-2env-lane" if not downgraded else "downgrade-to-fallback",
            "sequentialFallbackLane": (
                _to_mapping(lane_plan.get("restartBehavior")).get("fallbackLane")
                or "pin a sequential 2-env fallback lane if subprocess churn or wall-clock overruns appear"
            ),
            "currentReasons": list(downgrade_check.get("reason") or []),
        },
    }


def build_invalid_action() -> dict[str, object]:
    action = {field: False for field in ACTION_BOOLEAN_FIELDS}
    action["yawLeft"] = True
    action["shootItem"] = True
    action["shootItemIndex"] = 9
    action["useItem"] = 9
    return action


class LaneMemoryMonitor:
    def __init__(self, worker_count: int, sample_interval_seconds: float = MEMORY_SAMPLE_INTERVAL_SECONDS) -> None:
        self._python_pid = os.getpid()
        self._worker_count = worker_count
        self._sample_interval_seconds = sample_interval_seconds
        self._progress: dict[int, int] = {env_id: 0 for env_id in range(worker_count)}
        self._controller_pids: dict[int, int] = {}
        self._samples: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._started_at = 0.0

    def start(self) -> None:
        self._started_at = time.perf_counter()
        tracemalloc.start()
        self.capture("run-start")
        self._thread = threading.Thread(target=self._run, name="bt93a-memory-monitor", daemon=True)
        self._thread.start()

    def _run(self) -> None:
        while not self._stop_event.wait(self._sample_interval_seconds):
            self.capture("interval")

    def register_controller_pid(self, env_id: int, pid: int | None) -> None:
        if pid is None:
            return
        with self._lock:
            self._controller_pids[env_id] = int(pid)

    def update_progress(self, env_id: int, steps_completed: int) -> None:
        with self._lock:
            self._progress[env_id] = int(steps_completed)

    def capture(self, reason: str) -> dict[str, Any]:
        with self._lock:
            progress = dict(self._progress)
            controller_pids = dict(self._controller_pids)

        current_bytes, peak_bytes = tracemalloc.get_traced_memory()
        python_memory = _read_process_memory(self._python_pid) or {}
        controllers: dict[str, Any] = {}
        total_controller_rss = 0
        total_controller_private = 0

        for env_id, pid in sorted(controller_pids.items()):
            process_memory = _read_process_memory(pid)
            controller_entry: dict[str, Any] = {
                "pid": pid,
                "alive": process_memory is not None,
            }
            if process_memory is not None:
                controller_entry.update(process_memory)
                total_controller_rss += int(process_memory["rssBytes"])
                total_controller_private += int(process_memory["privateBytes"])
            controllers[str(env_id)] = controller_entry

        sample = {
            "timestamp": _utc_now(),
            "reason": reason,
            "elapsedSeconds": round(time.perf_counter() - self._started_at, 3),
            "totalCompletedSteps": sum(progress.values()),
            "perEnvSteps": {str(key): progress[key] for key in sorted(progress)},
            "python": {
                "pid": self._python_pid,
                "rssBytes": python_memory.get("rssBytes"),
                "privateBytes": python_memory.get("privateBytes"),
            },
            "tracemalloc": {
                "currentBytes": int(current_bytes),
                "peakBytes": int(peak_bytes),
            },
            "controllers": {
                "trackedEnvIds": [int(env_id) for env_id in sorted(controller_pids)],
                "perEnv": controllers,
                "totalRssBytes": total_controller_rss,
                "totalPrivateBytes": total_controller_private,
            },
        }
        self._samples.append(sample)
        return sample

    def finish(self) -> dict[str, Any]:
        self.capture("run-complete")
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=self._sample_interval_seconds * 4)
        final_sample = self.capture("post-close")
        for _ in range(4):
            if final_sample["controllers"].get("totalRssBytes", 0) == 0:
                break
            time.sleep(self._sample_interval_seconds)
            final_sample = self.capture("post-close-wait")
        tracemalloc.stop()
        return build_memory_summary(
            samples=self._samples,
            sample_interval_seconds=self._sample_interval_seconds,
            python_pid=self._python_pid,
            final_sample=final_sample,
        )


def build_memory_summary(
    *,
    samples: list[dict[str, Any]],
    sample_interval_seconds: float,
    python_pid: int,
    final_sample: dict[str, Any],
) -> dict[str, Any]:
    python_rss_values = [
        sample["python"]["rssBytes"]
        for sample in samples
        if sample["python"].get("rssBytes") is not None
    ]
    python_private_values = [
        sample["python"]["privateBytes"]
        for sample in samples
        if sample["python"].get("privateBytes") is not None
    ]
    tracemalloc_current_values = [sample["tracemalloc"]["currentBytes"] for sample in samples]
    tracemalloc_peak_values = [sample["tracemalloc"]["peakBytes"] for sample in samples]
    controller_rss_active_values = [
        sample["controllers"]["totalRssBytes"]
        for sample in samples
        if sample["controllers"].get("totalRssBytes", 0) > 0
    ]
    controller_private_active_values = [
        sample["controllers"]["totalPrivateBytes"]
        for sample in samples
        if sample["controllers"].get("totalPrivateBytes", 0) > 0
    ]

    per_env_peak_rss_mb: dict[str, float] = {}
    for sample in samples:
        per_env = sample["controllers"].get("perEnv", {})
        for env_id, entry in per_env.items():
            rss_bytes = entry.get("rssBytes")
            if rss_bytes is None:
                continue
            peak_mb = _round_mb(rss_bytes)
            if peak_mb is None:
                continue
            current_peak = per_env_peak_rss_mb.get(env_id)
            if current_peak is None or peak_mb > current_peak:
                per_env_peak_rss_mb[env_id] = peak_mb

    python_rss_summary = _summarize_series_mb(python_rss_values)
    tracemalloc_current_summary = _summarize_series_mb(tracemalloc_current_values)
    python_rss_growth_mb = python_rss_summary["deltaMB"]
    tracemalloc_growth_mb = tracemalloc_current_summary["deltaMB"]

    leak_reasons: list[str] = []
    if python_rss_growth_mb is not None and python_rss_growth_mb > PYTHON_RSS_GROWTH_LIMIT_MB:
        leak_reasons.append(
            f"python RSS grew by {python_rss_growth_mb} MB (> {PYTHON_RSS_GROWTH_LIMIT_MB} MB limit)"
        )
    if tracemalloc_growth_mb is not None and tracemalloc_growth_mb > TRACEMALLOC_GROWTH_LIMIT_MB:
        leak_reasons.append(
            f"tracemalloc current grew by {tracemalloc_growth_mb} MB (> {TRACEMALLOC_GROWTH_LIMIT_MB} MB limit)"
        )

    timeline = []
    for sample in samples:
        timeline.append({
            "elapsedSeconds": sample["elapsedSeconds"],
            "reason": sample["reason"],
            "totalCompletedSteps": sample["totalCompletedSteps"],
            "pythonRssMB": _round_mb(sample["python"].get("rssBytes")),
            "pythonPrivateMB": _round_mb(sample["python"].get("privateBytes")),
            "tracemallocCurrentMB": _round_mb(sample["tracemalloc"].get("currentBytes")),
            "tracemallocPeakMB": _round_mb(sample["tracemalloc"].get("peakBytes")),
            "controllerTotalRssMB": _round_mb(sample["controllers"].get("totalRssBytes")),
        })

    return {
        "adr": "PPO-ADR-003",
        "tracking": (
            "Python harness memory sampled via OS RSS/private bytes plus tracemalloc current/peak over the live 2-env lane."
        ),
        "sampleCount": len(samples),
        "sampleIntervalSeconds": sample_interval_seconds,
        "pythonProcess": {
            "pid": python_pid,
            "rssMB": python_rss_summary,
            "privateMB": _summarize_series_mb(python_private_values),
        },
        "tracemalloc": {
            "currentMB": tracemalloc_current_summary,
            "peakMB": _round_mb(max(tracemalloc_peak_values)) if tracemalloc_peak_values else None,
        },
        "controllerProcesses": {
            "trackedEnvIds": final_sample["controllers"].get("trackedEnvIds", []),
            "rssMBDuringActiveRun": _summarize_series_mb(controller_rss_active_values),
            "privateMBDuringActiveRun": _summarize_series_mb(controller_private_active_values),
            "perEnvPeakRssMB": {key: per_env_peak_rss_mb[key] for key in sorted(per_env_peak_rss_mb)},
            "finalResidualRssMB": _round_mb(final_sample["controllers"].get("totalRssBytes")),
            "cleanupSettled": final_sample["controllers"].get("totalRssBytes", 0) <= 1024 * 1024,
        },
        "leakCheck": {
            "memoryStable": not leak_reasons,
            "status": "pass" if not leak_reasons else "review",
            "reasons": leak_reasons,
            "maxAllowedPythonRssGrowthMB": PYTHON_RSS_GROWTH_LIMIT_MB,
            "maxAllowedTracemallocGrowthMB": TRACEMALLOC_GROWTH_LIMIT_MB,
        },
        "timeline": timeline,
    }


def run_env(env_id: int, max_steps: int, memory_monitor: LaneMemoryMonitor | None = None) -> dict[str, Any]:
    seed = 930 + env_id
    session_id = f"bt93a-2env-smoke-{env_id}"
    env = CurviosEnv(
        max_steps=max_steps,
        default_seed=seed,
        session_id=session_id,
        controller_timeout_seconds=DEFAULT_COMMAND_TIMEOUT_SECONDS,
    )
    steps_completed = 0
    failures = 0
    reset_count = 0
    reset_failures = 0
    step_failures = 0
    timeout_count = 0
    failure_classes: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    last_error: str | None = None
    start_time = time.time()
    controller_pid: int | None = None
    try:
        _, reset_info = env.reset(seed=seed)
        controller_pid = env.controller_pid
        if memory_monitor is not None:
            memory_monitor.register_controller_pid(env_id, controller_pid)
            memory_monitor.update_progress(env_id, steps_completed)
        reset_count += 1
        action = build_invalid_action()
        terminated = False
        truncated = False
        while not (terminated or truncated) and steps_completed < max_steps:
            try:
                _, _, terminated, truncated, info = env.step(action)
                steps_completed += 1
                terminal_reason = str(info.get("terminalReason") or "")
                truncated_reason = str(info.get("truncatedReason") or "")
                if terminal_reason:
                    terminal_reasons[terminal_reason] += 1
                if truncated_reason:
                    truncated_reasons[truncated_reason] += 1
                if memory_monitor is not None and (
                    steps_completed == 1 or steps_completed % 25 == 0 or terminated or truncated
                ):
                    memory_monitor.update_progress(env_id, steps_completed)
            except Exception as e:
                failures += 1
                step_failures += 1
                error_class = _classify_failure(e)
                failure_classes[error_class] += 1
                if error_class == "timeout":
                    timeout_count += 1
                last_error = str(e)
                print(f"Env {env_id} step failed: {e}")
                break
        diagnostics = env.get_diagnostics()
    except Exception as e:
        failures += 1
        reset_failures += 1
        error_class = _classify_failure(e)
        failure_classes[error_class] += 1
        if error_class == "timeout":
            timeout_count += 1
        last_error = str(e)
        diagnostics = {"error": str(e)}
    finally:
        env.close()
        if memory_monitor is not None:
            memory_monitor.update_progress(env_id, steps_completed)

    wall_clock = time.time() - start_time
    diagnostics_map = _to_mapping(diagnostics)
    stats = _to_mapping(diagnostics_map.get("stats"))
    bridge_telemetry = _to_mapping(diagnostics_map.get("bridgeTelemetry"))
    message_counts = _to_mapping(stats.get("messageCounts"))
    contract_smoke = _to_mapping(stats.get("contractSmoke"))

    timeout_count += int(bridge_telemetry.get("timeouts") or 0)
    bridge_last_failure = bridge_telemetry.get("lastFailure")
    if bridge_last_failure:
        failure_classes[_classify_failure(str(bridge_last_failure))] += 1
    contract_last_error = contract_smoke.get("lastError")
    if contract_last_error:
        failure_classes[_classify_failure(str(contract_last_error))] += 1

    return {
        "env_id": env_id,
        "seed": seed,
        "sessionId": session_id,
        "controllerPid": controller_pid,
        "stepsCompleted": steps_completed,
        "failures": failures,
        "resetCount": max(reset_count, int(message_counts.get("training-reset") or 0)),
        "resetFailures": reset_failures,
        "stepFailures": step_failures,
        "timeoutCount": timeout_count,
        "failureClasses": _sorted_counter(failure_classes),
        "terminalReasons": _sorted_counter(terminal_reasons),
        "truncatedReasons": _sorted_counter(truncated_reasons),
        "lastError": last_error,
        "wall_clock_seconds": wall_clock,
        "diagnostics": diagnostics_map,
        "bridgeRequestsSent": int(bridge_telemetry.get("requestsSent") or 0),
        "bridgeResponsesReceived": int(bridge_telemetry.get("responsesReceived") or 0),
        "bridgeFailures": int(bridge_telemetry.get("failures") or 0),
        "bridgeLatencyMeanMs": bridge_telemetry.get("latencyMeanMs"),
        "bridgeLatencyP95Ms": bridge_telemetry.get("latencyP95Ms"),
        "processingLatencyAverageMs": _to_mapping(stats.get("processingLatencyMs")).get("average"),
        "validationFailures": int(contract_smoke.get("validationFailures") or 0),
        "messageCounts": {
            "training-reset": int(message_counts.get("training-reset") or 0),
            "training-step": int(message_counts.get("training-step") or 0),
            "trainer-stats-request": int(message_counts.get("trainer-stats-request") or 0),
            "bot-action-request": int(message_counts.get("bot-action-request") or 0),
        },
    }


def build_smoke_artifact(
    results: list[dict[str, Any]],
    wall_clock_total: float,
    memory_summary: dict[str, Any],
) -> dict[str, Any]:
    total_steps = sum(result["stepsCompleted"] for result in results)
    total_failures = sum(result["failures"] for result in results)
    total_resets = sum(result["resetCount"] for result in results)
    total_timeouts = sum(result["timeoutCount"] for result in results)
    total_requests = sum(result["bridgeRequestsSent"] for result in results)
    total_validation_failures = sum(result["validationFailures"] for result in results)
    steps_per_sec = total_steps / wall_clock_total if wall_clock_total > 0 else 0.0
    failure_rate = total_failures / total_steps if total_steps > 0 else 0.0
    timeout_rate = total_timeouts / total_requests if total_requests > 0 else 0.0
    is_downgraded = (
        steps_per_sec < ONE_WORKER_BASELINE_STEPS_PER_SEC
        or failure_rate > FAILURE_RATE_DOWNGRADE_THRESHOLD
        or wall_clock_total > (MAX_WALL_CLOCK_BUDGET_MINUTES * 60 * MAX_WALL_CLOCK_MULTIPLIER_BEFORE_DOWNGRADE)
    )
    downgrade_reason: list[str] = []
    failure_classes: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    for result in results:
        failure_classes.update(result["failureClasses"])
        terminal_reasons.update(result["terminalReasons"])
        truncated_reasons.update(result["truncatedReasons"])
    if steps_per_sec < ONE_WORKER_BASELINE_STEPS_PER_SEC:
        downgrade_reason.append("Step rate under 1-worker baseline (< 28 steps/s)")
    if failure_rate > FAILURE_RATE_DOWNGRADE_THRESHOLD:
        downgrade_reason.append("Failure rate too high (> 0.05)")
    if wall_clock_total > (MAX_WALL_CLOCK_BUDGET_MINUTES * 60 * MAX_WALL_CLOCK_MULTIPLIER_BEFORE_DOWNGRADE):
        downgrade_reason.append("Wall-clock exceeded 2x the BT93A 2-env budget")

    artifact = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93a_2env_smoke.py",
        "scope": {
            "phase": "93A.2",
            "evidencePhases": ["93A.2.1", "93A.2.2"],
            "workerCount": WORKER_COUNT,
            "targetStepsPerEnv": TARGET_STEPS_PER_ENV,
            "totalTargetSteps": WORKER_COUNT * TARGET_STEPS_PER_ENV,
            "multiEnv": True,
            "vecEnv": False,
            "laneModel": "two parallel CurviosEnv workers via ThreadPoolExecutor",
        },
        "lanePlan": build_lane_plan(),
        "execution": {
            "deterministicSeeds": [result["seed"] for result in sorted(results, key=lambda entry: entry["env_id"])],
            "controllerTimeoutSeconds": DEFAULT_COMMAND_TIMEOUT_SECONDS,
            "expectedResetPattern": "one reset per env before stepping",
            "vecEnvNote": "BT93A measures a runtime-near multi-env lane first; no SubprocVecEnv/DummyVecEnv wrapper is introduced before measured evidence exists.",
        },
        "performance": {
            "totalStepsCompleted": total_steps,
            "wallClockSeconds": wall_clock_total,
            "stepsPerSecond": steps_per_sec,
            "failureRate": failure_rate,
            "totalFailures": total_failures,
        },
        "stability": {
            "resetCount": total_resets,
            "resetRatePerEnv": total_resets / WORKER_COUNT if WORKER_COUNT > 0 else 0.0,
            "timeoutCount": total_timeouts,
            "timeoutRatePerRequest": timeout_rate,
            "validationFailures": total_validation_failures,
            "failureClasses": _sorted_counter(failure_classes),
            "terminalReasons": _sorted_counter(terminal_reasons),
            "truncatedReasons": _sorted_counter(truncated_reasons),
        },
        "memory": memory_summary,
        "downgradeCheck": {
            "downgraded": is_downgraded,
            "reason": downgrade_reason,
            "allow4Env": (
                not is_downgraded
                and steps_per_sec >= FOUR_ENV_MIN_STEPS_PER_SEC
                and failure_rate <= FOUR_ENV_MAX_FAILURE_RATE
            ),
            "minStepsPerSecondFor4Env": FOUR_ENV_MIN_STEPS_PER_SEC,
            "maxFailureRateFor4Env": FOUR_ENV_MAX_FAILURE_RATE,
        },
        "workers": [
            {
                "envId": result["env_id"],
                "seed": result["seed"],
                "sessionId": result["sessionId"],
                "controllerPid": result["controllerPid"],
                "stepsCompleted": result["stepsCompleted"],
                "resetCount": result["resetCount"],
                "timeoutCount": result["timeoutCount"],
                "failures": result["failures"],
                "failureClasses": result["failureClasses"],
                "terminalReasons": result["terminalReasons"],
                "truncatedReasons": result["truncatedReasons"],
                "wallClockSeconds": result["wall_clock_seconds"],
                "bridgeRequestsSent": result["bridgeRequestsSent"],
                "bridgeResponsesReceived": result["bridgeResponsesReceived"],
                "bridgeFailures": result["bridgeFailures"],
                "bridgeLatencyMeanMs": result["bridgeLatencyMeanMs"],
                "bridgeLatencyP95Ms": result["bridgeLatencyP95Ms"],
                "processingLatencyAverageMs": result["processingLatencyAverageMs"],
                "validationFailures": result["validationFailures"],
                "messageCounts": result["messageCounts"],
                "lastError": result["lastError"],
            }
            for result in sorted(results, key=lambda entry: entry["env_id"])
        ],
    }
    artifact["handover"] = build_bt93a_handover(artifact, generated_by="python/scripts/bt93a_2env_smoke.py")
    return artifact


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan-only", action="store_true", help="Write the BT93A 2-env lane plan without running smokes.")
    parser.add_argument(
        "--handover-only",
        action="store_true",
        help="Write the BT93A handover artifact from the measured 2-env smoke artifact.",
    )
    args = parser.parse_args()

    if args.plan_only and args.handover_only:
        parser.error("--plan-only and --handover-only cannot be used together.")

    if args.plan_only:
        artifact = build_lane_plan()
        _write_json(LANE_PLAN_PATH, artifact)
        print(json.dumps({
            "ok": True,
            "artifact": str(LANE_PLAN_PATH.relative_to(REPO_ROOT)),
            "workerCount": artifact["scope"]["workerCount"],
            "nextPhase": "93A.2",
        }, indent=2))
        return

    if args.handover_only:
        smoke_artifact = _read_json(ARTIFACT_PATH)
        handover_artifact = build_bt93a_handover(
            smoke_artifact,
            generated_by="python/scripts/bt93a_2env_smoke.py --handover-only",
        )
        _write_json(HANDOVER_PATH, handover_artifact)
        print(json.dumps({
            "ok": True,
            "artifact": str(HANDOVER_PATH.relative_to(REPO_ROOT)),
            "defaultEnvCount": handover_artifact["scaffoldContract"]["defaultStartEnvCount"],
            "measuredStepsPerSecond": handover_artifact["measuredLane"]["stepsPerSecond"],
            "fourEnvStatus": handover_artifact["scaffoldContract"]["fourEnvStatus"],
        }, indent=2))
        return

    print("Starting BT93A 2-env harness...")
    start_time = time.time()
    memory_monitor = LaneMemoryMonitor(worker_count=WORKER_COUNT)
    memory_monitor.start()

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKER_COUNT) as executor:
        futures = [
            executor.submit(run_env, i, TARGET_STEPS_PER_ENV, memory_monitor)
            for i in range(WORKER_COUNT)
        ]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    wall_clock_total = time.time() - start_time
    memory_summary = memory_monitor.finish()
    artifact = build_smoke_artifact(results, wall_clock_total, memory_summary)
    _write_json(ARTIFACT_PATH, artifact)
    _write_json(HANDOVER_PATH, artifact["handover"])

    print(json.dumps({
        "ok": True,
        "artifact": str(ARTIFACT_PATH.relative_to(REPO_ROOT)),
        "handoverArtifact": str(HANDOVER_PATH.relative_to(REPO_ROOT)),
        "stepsPerSecond": artifact["performance"]["stepsPerSecond"],
        "allow4Env": artifact["downgradeCheck"]["allow4Env"],
        "memoryStable": artifact["memory"]["leakCheck"]["memoryStable"],
    }, indent=2))


if __name__ == "__main__":
    main()
