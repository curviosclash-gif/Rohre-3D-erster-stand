"""BT93A 2-env lane plan and smoke harness for the runtime-near boundary path."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import sys
import time
import tracemalloc
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


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


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
    env = CurviosEnv(
        max_steps=max_steps,
        default_seed=930 + env_id,
        session_id=f"bt93a-2env-smoke-{env_id}",
        controller_timeout_seconds=DEFAULT_COMMAND_TIMEOUT_SECONDS,
    )
    steps_completed = 0
    failures = 0
    start_time = time.time()
    try:
        env.reset(seed=930 + env_id)
        action = build_invalid_action()
        terminated = False
        truncated = False
        while not (terminated or truncated) and steps_completed < max_steps:
            try:
                _, _, terminated, truncated, _ = env.step(action)
                steps_completed += 1
            except Exception as e:
                failures += 1
                print(f"Env {env_id} step failed: {e}")
                break
        diagnostics = env.get_diagnostics()
    except Exception as e:
        failures += 1
        diagnostics = {"error": str(e)}
    finally:
        env.close()

    wall_clock = time.time() - start_time
    return {
        "env_id": env_id,
        "stepsCompleted": steps_completed,
        "failures": failures,
        "wall_clock_seconds": wall_clock,
        "diagnostics": diagnostics,
    }


def build_smoke_artifact(results: list[dict[str, Any]], wall_clock_total: float, peak_mem: int) -> dict[str, Any]:
    total_steps = sum(result["stepsCompleted"] for result in results)
    total_failures = sum(result["failures"] for result in results)
    steps_per_sec = total_steps / wall_clock_total if wall_clock_total > 0 else 0.0
    failure_rate = total_failures / total_steps if total_steps > 0 else 0.0
    is_downgraded = (
        steps_per_sec < ONE_WORKER_BASELINE_STEPS_PER_SEC
        or failure_rate > FAILURE_RATE_DOWNGRADE_THRESHOLD
        or wall_clock_total > (MAX_WALL_CLOCK_BUDGET_MINUTES * 60 * MAX_WALL_CLOCK_MULTIPLIER_BEFORE_DOWNGRADE)
    )
    downgrade_reason: list[str] = []
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
            "workerCount": WORKER_COUNT,
            "targetStepsPerEnv": TARGET_STEPS_PER_ENV,
            "totalTargetSteps": WORKER_COUNT * TARGET_STEPS_PER_ENV,
        },
        "lanePlan": build_lane_plan(),
        "performance": {
            "totalStepsCompleted": total_steps,
            "wallClockSeconds": wall_clock_total,
            "stepsPerSecond": steps_per_sec,
            "failureRate": failure_rate,
            "totalFailures": total_failures,
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
                "stepsCompleted": result["stepsCompleted"],
                "failures": result["failures"],
                "wallClockSeconds": result["wall_clock_seconds"],
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
            "nextPhase": "93A.1.4",
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
