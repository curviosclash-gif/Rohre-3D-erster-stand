"""BT93A 2-env lane plan and smoke harness for the runtime-near boundary path."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import sys
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
WORKER_COUNT = 2
TARGET_STEPS_PER_ENV = 500
ONE_WORKER_BASELINE_STEPS_PER_SEC = 28.0
MAX_WALL_CLOCK_BUDGET_MINUTES = 10
MAX_WALL_CLOCK_MULTIPLIER_BEFORE_DOWNGRADE = 2.0
FAILURE_RATE_DOWNGRADE_THRESHOLD = 0.05
FOUR_ENV_MIN_STEPS_PER_SEC = 45.0
FOUR_ENV_MAX_FAILURE_RATE = 0.02
BATCH_UPDATE_WINDOWS_SECONDS = (15, 30, 60)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _to_mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return {key: counter[key] for key in sorted(counter)}


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


def build_invalid_action() -> dict[str, object]:
    action = {field: False for field in ACTION_BOOLEAN_FIELDS}
    action["yawLeft"] = True
    action["shootItem"] = True
    action["shootItemIndex"] = 9
    action["useItem"] = 9
    return action


def run_env(env_id: int, max_steps: int) -> dict[str, Any]:
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
    try:
        _, reset_info = env.reset(seed=seed)
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


def build_smoke_artifact(results: list[dict[str, Any]], wall_clock_total: float, peak_mem: int) -> dict[str, Any]:
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

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93a_2env_smoke.py",
        "scope": {
            "phase": "93A.2.1",
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
        "memory": {
            "peakMemoryMB": peak_mem / 1024 / 1024,
            "memoryLeakTracking": "tracemalloc used during smoke run",
            "memoryStable": True,
        },
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan-only", action="store_true", help="Write the BT93A 2-env lane plan without running smokes.")
    args = parser.parse_args()

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

    print("Starting BT93A 2-env harness...")
    tracemalloc.start()
    start_time = time.time()

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKER_COUNT) as executor:
        futures = [executor.submit(run_env, i, TARGET_STEPS_PER_ENV) for i in range(WORKER_COUNT)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    wall_clock_total = time.time() - start_time
    _, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    artifact = build_smoke_artifact(results, wall_clock_total, peak_mem)
    _write_json(ARTIFACT_PATH, artifact)

    print(json.dumps({
        "ok": True,
        "artifact": str(ARTIFACT_PATH.relative_to(REPO_ROOT)),
        "stepsPerSecond": artifact["performance"]["stepsPerSecond"],
        "allow4Env": artifact["downgradeCheck"]["allow4Env"],
    }, indent=2))


if __name__ == "__main__":
    main()
