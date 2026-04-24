"""Runtime-near BT93B scaffold runner.

This executes the measured BT93A 2-env lane with the BT93B split-head action
adapter, writes scaffold artifacts, and deliberately avoids PPO promotion or
productive runtime changes.
"""

from __future__ import annotations

import concurrent.futures
import json
import pickle
import time
import traceback
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from bridge.authority_snapshot import ACTION_BOOLEAN_FIELDS, ACTION_INDEX_FIELDS, READ_ONLY_RUNTIME_SURFACES
from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH
from bridge.split_head_action import BT93B_SPLIT_HEAD_ADAPTER_ID, sanitize_split_head_action
from callbacks.bt93b_scaffold import (
    JsonlEventLogger,
    ObservationNormalizerStats,
    RuntimeProbe,
    hardware_snapshot,
    json_safe,
    utc_now,
    write_json,
)
from envs.curvios_env import CurviosEnv, DEFAULT_COMMAND_TIMEOUT_SECONDS

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
DEFAULT_TEMPLATE_PATH = REPO_ROOT / "data" / "training" / "ppo" / "run_manifest.bt93b.template.json"
DEFAULT_ARTIFACT_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93b"
CHECKPOINT_VERSION = "bt93b-scaffold-checkpoint-v1"


@dataclass(frozen=True)
class ScaffoldRunRequest:
    run_kind: str
    phase_id: str
    manifest_template_path: Path = DEFAULT_TEMPLATE_PATH
    artifact_root: Path = DEFAULT_ARTIFACT_ROOT
    target_steps_per_env: int | None = None
    checkpoint_path: Path | None = None


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _resolve_repo_artifact(path_value: Any, *, field_name: str) -> Path:
    if not isinstance(path_value, str) or not path_value.strip():
        raise RuntimeError(f"checkpoint field is missing a repo artifact path: {field_name}")
    candidate = Path(path_value)
    resolved = candidate.resolve() if candidate.is_absolute() else (REPO_ROOT / candidate).resolve()
    if not _is_relative_to(resolved, REPO_ROOT):
        raise RuntimeError(f"checkpoint field escapes repo root: {field_name}={path_value}")
    return resolved


def _relative(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _make_run_id(run_kind: str) -> str:
    stamp = utc_now().replace("-", "").replace(":", "").replace("T", "T").replace("Z", "Z")
    return f"{stamp}-{run_kind}"


def _validate_template(template: Mapping[str, Any]) -> None:
    lane = template.get("lane") or {}
    rollout = template.get("rollout") or {}
    action_surface = template.get("actionSurface") or {}
    normalization = template.get("normalization") or {}
    actor_critic_heads = template.get("actorCriticHeads") or {}

    if template.get("blockId") != "BT93B":
        raise RuntimeError("manifest template is not scoped to BT93B")
    if template.get("scaffoldOnly") is not True:
        raise RuntimeError("BT93B scaffold manifest must stay scaffoldOnly=true")
    if template.get("promotionAllowed") is not False or template.get("bt94aGate") != "closed":
        raise RuntimeError("BT93B scaffold must not open promotion or BT94A")
    if int(lane.get("envCount") or 0) != 2:
        raise RuntimeError("BT93B.2 must run on the measured 2-env lane")
    if str(lane.get("fourEnvStatus")) != "locked-for-bt93b-scaffold":
        raise RuntimeError("4-env is not allowed for BT93B scaffold smoke")
    if int(rollout.get("selectedNstepsPerEnv") or 0) <= 0:
        raise RuntimeError("manifest is missing selectedNstepsPerEnv")
    if action_surface.get("adapterId") != BT93B_SPLIT_HEAD_ADAPTER_ID:
        raise RuntimeError("BT93B split-head adapter drifted")
    if action_surface.get("splitHeadRequired") is not True:
        raise RuntimeError("BT93B split-head is no longer required")
    if normalization.get("persistStatsWithCheckpoint") is not True:
        raise RuntimeError("BT93B normalization stats must persist with checkpoints")
    if int(actor_critic_heads.get("inputObservationLength") or 0) != EXPECTED_OBSERVATION_LENGTH:
        raise RuntimeError("BT93B actor/critic head observation length drifted")


def _validate_normalization_stats_payload(payload: Mapping[str, Any], *, source: Path) -> dict[str, Any]:
    stats = payload.get("stats")
    metadata = payload.get("metadata")
    if not isinstance(stats, Mapping) or not isinstance(metadata, Mapping):
        raise RuntimeError(f"normalization stats payload is malformed: {_relative(source)}")
    if stats.get("normalizationId") != "bt93b-vecnormalize-v1":
        raise RuntimeError(f"normalization stats id drifted: {_relative(source)}")
    if stats.get("normalizeObservation") is not True or stats.get("normalizeReward") is not False:
        raise RuntimeError(f"normalization mode drifted: {_relative(source)}")
    observation_length = int(stats.get("observationLength") or 0)
    if observation_length != EXPECTED_OBSERVATION_LENGTH:
        raise RuntimeError(f"normalization observation length drifted: {observation_length}")
    count = int(stats.get("count") or 0)
    if count <= 0:
        raise RuntimeError(f"normalization stats are empty: {_relative(source)}")
    if metadata.get("scaffoldOnly") is not True:
        raise RuntimeError(f"normalization stats are not scaffold-only: {_relative(source)}")
    return {
        "runId": str(metadata.get("runId") or ""),
        "runKind": str(metadata.get("runKind") or ""),
        "phaseId": str(metadata.get("phaseId") or ""),
        "count": count,
        "observationLength": observation_length,
    }


def _read_pickle_payload(path: Path) -> Mapping[str, Any]:
    with path.open("rb") as handle:
        payload = pickle.load(handle)
    if not isinstance(payload, Mapping):
        raise RuntimeError(f"normalization pickle payload is malformed: {_relative(path)}")
    return payload


def _validate_resume_checkpoint(checkpoint_path: Path) -> dict[str, Any]:
    resolved_checkpoint = checkpoint_path.resolve()
    if not resolved_checkpoint.exists():
        raise FileNotFoundError(f"resume checkpoint does not exist: {resolved_checkpoint}")
    if not _is_relative_to(resolved_checkpoint, REPO_ROOT):
        raise RuntimeError(f"resume checkpoint must stay inside the repo: {resolved_checkpoint}")

    checkpoint = _read_json(resolved_checkpoint)
    if checkpoint.get("checkpointVersion") != CHECKPOINT_VERSION:
        raise RuntimeError(f"unsupported BT93B checkpoint version: {checkpoint.get('checkpointVersion')}")
    if checkpoint.get("scaffoldOnly") is not True:
        raise RuntimeError("resume checkpoint must be scaffold-only")
    if checkpoint.get("promotionAllowed") is not False or checkpoint.get("bt94aGate") != "closed":
        raise RuntimeError("resume checkpoint must keep promotion and BT94A closed")
    if int(checkpoint.get("completedSteps") or 0) <= 0:
        raise RuntimeError("resume checkpoint has no completed steps")
    if int(checkpoint.get("targetSteps") or 0) <= 0:
        raise RuntimeError("resume checkpoint has no target steps")

    policy_surface = checkpoint.get("policySurface")
    if not isinstance(policy_surface, Mapping) or policy_surface.get("adapterId") != BT93B_SPLIT_HEAD_ADAPTER_ID:
        raise RuntimeError("resume checkpoint policy surface drifted")

    stats_json_path = _resolve_repo_artifact(checkpoint.get("normalizationStatsJson"), field_name="normalizationStatsJson")
    stats_pickle_path = _resolve_repo_artifact(checkpoint.get("normalizationStats"), field_name="normalizationStats")
    if not stats_json_path.exists():
        raise FileNotFoundError(f"resume normalization json is missing: {stats_json_path}")
    if not stats_pickle_path.exists():
        raise FileNotFoundError(f"resume normalization pickle is missing: {stats_pickle_path}")

    json_summary = _validate_normalization_stats_payload(_read_json(stats_json_path), source=stats_json_path)
    pickle_summary = _validate_normalization_stats_payload(_read_pickle_payload(stats_pickle_path), source=stats_pickle_path)
    if json_summary["count"] != pickle_summary["count"]:
        raise RuntimeError("resume normalization json/pickle count mismatch")
    if json_summary["runId"] and checkpoint.get("runId") and json_summary["runId"] != checkpoint.get("runId"):
        raise RuntimeError("resume normalization stats runId does not match checkpoint")
    if pickle_summary["runId"] and checkpoint.get("runId") and pickle_summary["runId"] != checkpoint.get("runId"):
        raise RuntimeError("resume normalization pickle runId does not match checkpoint")

    return {
        "ok": True,
        "checkpoint": _relative(resolved_checkpoint),
        "checkpointId": str(checkpoint.get("checkpointId") or ""),
        "sourceRunId": str(checkpoint.get("runId") or ""),
        "sourceRunKind": str(checkpoint.get("runKind") or ""),
        "sourcePhaseId": str(checkpoint.get("phaseId") or ""),
        "completedSteps": int(checkpoint.get("completedSteps") or 0),
        "targetSteps": int(checkpoint.get("targetSteps") or 0),
        "normalizationStats": _relative(stats_pickle_path),
        "normalizationStatsJson": _relative(stats_json_path),
        "normalizationCount": json_summary["count"],
        "normalizationObservationLength": json_summary["observationLength"],
        "normalizationJsonPickleMatch": True,
    }


def _extract_inventory_length(info: Mapping[str, Any] | None) -> int:
    if not isinstance(info, Mapping):
        return 0
    match = info.get("match")
    if not isinstance(match, Mapping):
        return 0
    try:
        return max(0, int(match.get("inventoryLength") or 0))
    except (TypeError, ValueError):
        return 0


def _build_split_head_action(step_index: int, env_index: int, info: Mapping[str, Any] | None) -> dict[str, Any]:
    inventory_length = _extract_inventory_length(info)
    raw_action = {key: False for key in ACTION_BOOLEAN_FIELDS}
    raw_action.update({key: -1 for key in ACTION_INDEX_FIELDS})
    raw_action["yawLeft"] = (step_index + env_index) % 16 < 8
    raw_action["yawRight"] = not raw_action["yawLeft"] and (step_index + env_index) % 4 == 0
    raw_action["pitchUp"] = step_index % 23 == 0
    raw_action["boost"] = step_index % 20 == 0
    raw_action["shootMG"] = step_index % 17 == 0
    return sanitize_split_head_action(raw_action, inventory_length)


def _classify_failure(error: BaseException) -> str:
    message = str(error).lower()
    if isinstance(error, TimeoutError) or "timeout" in message or "timed out" in message:
        return "timeout"
    if "controller exited" in message:
        return "controller-exit"
    if "contract" in message or "drift" in message:
        return "contract-drift"
    return error.__class__.__name__


def _run_env_worker(
    *,
    env_index: int,
    seed: int,
    target_steps: int,
    run_id: str,
    run_kind: str,
    logger: JsonlEventLogger,
) -> dict[str, Any]:
    started = time.perf_counter()
    normalizer = ObservationNormalizerStats(EXPECTED_OBSERVATION_LENGTH, clip_observation=10.0)
    reward_total = 0.0
    reset_count = 0
    completed_steps = 0
    action_counts: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    diagnostics: Mapping[str, Any] = {}
    env = CurviosEnv(
        max_steps=target_steps,
        default_seed=seed,
        session_id=f"{run_id}-env{env_index}",
        controller_timeout_seconds=DEFAULT_COMMAND_TIMEOUT_SECONDS,
    )
    try:
        observation, info = env.reset(seed=seed)
        reset_count += 1
        normalizer.update(observation)
        logger.event("env-reset", {"envIndex": env_index, "seed": seed, "runKind": run_kind})

        while completed_steps < target_steps:
            action = _build_split_head_action(completed_steps, env_index, info)
            for key, value in action.items():
                if isinstance(value, bool) and value:
                    action_counts[key] += 1
                elif not isinstance(value, bool) and isinstance(value, int) and value >= 0:
                    action_counts[key] += 1

            observation, reward, terminated, truncated, info = env.step(action)
            normalizer.update(observation)
            reward_total += float(reward)
            completed_steps += 1

            if completed_steps % 64 == 0 or completed_steps == target_steps:
                logger.event(
                    "env-progress",
                    {
                        "envIndex": env_index,
                        "completedSteps": completed_steps,
                        "targetSteps": target_steps,
                    },
                )

            if terminated or truncated:
                if isinstance(info, Mapping):
                    terminal_reason = info.get("terminalReason")
                    truncated_reason = info.get("truncatedReason")
                    if terminal_reason:
                        terminal_reasons[str(terminal_reason)] += 1
                    if truncated_reason:
                        truncated_reasons[str(truncated_reason)] += 1
                if completed_steps < target_steps:
                    observation, info = env.reset()
                    reset_count += 1
                    normalizer.update(observation)

        diagnostics = env.get_diagnostics()
        wall_clock = time.perf_counter() - started
        return {
            "ok": True,
            "envIndex": env_index,
            "seed": seed,
            "completedSteps": completed_steps,
            "targetSteps": target_steps,
            "rewardTotal": reward_total,
            "resetCount": reset_count,
            "wallClockSeconds": wall_clock,
            "stepsPerSecond": completed_steps / wall_clock if wall_clock > 0 else 0.0,
            "actionCounts": dict(sorted(action_counts.items())),
            "terminalReasons": dict(sorted(terminal_reasons.items())),
            "truncatedReasons": dict(sorted(truncated_reasons.items())),
            "controllerPid": env.controller_pid,
            "diagnostics": diagnostics,
            "normalizerState": normalizer.state(),
        }
    except BaseException as error:
        logger.event(
            "env-failure",
            {
                "envIndex": env_index,
                "failureClass": _classify_failure(error),
                "error": str(error),
            },
        )
        return {
            "ok": False,
            "envIndex": env_index,
            "seed": seed,
            "completedSteps": completed_steps,
            "targetSteps": target_steps,
            "failureClass": _classify_failure(error),
            "error": str(error),
            "traceback": traceback.format_exc(),
            "normalizerState": normalizer.state(),
            "diagnostics": diagnostics,
        }
    finally:
        env.close()


def run_scaffold(request: ScaffoldRunRequest) -> dict[str, Any]:
    template_path = request.manifest_template_path.resolve()
    artifact_root = request.artifact_root.resolve()
    template = _read_json(template_path)
    _validate_template(template)
    resume_input = None
    if request.checkpoint_path is not None:
        resume_input = _validate_resume_checkpoint(request.checkpoint_path)
    if request.run_kind == "resume-smoke" and resume_input is None:
        raise RuntimeError("resume-smoke requires a valid BT93B checkpoint")

    rollout = template["rollout"]
    lane = template["lane"]
    seeds = list(template["seedPack"]["evalEnvSeeds"] if request.run_kind == "eval-smoke" else template["seedPack"]["trainEnvSeeds"])
    env_count = int(lane["envCount"])
    target_steps = int(request.target_steps_per_env or rollout["selectedNstepsPerEnv"])
    selected_steps = int(rollout["selectedNstepsPerEnv"])
    if target_steps <= 0 or target_steps > selected_steps:
        raise RuntimeError(f"target steps must stay within the measured scaffold budget: {target_steps} > {selected_steps}")
    if len(seeds) < env_count:
        raise RuntimeError("manifest seed pack does not cover the selected env count")

    run_id = _make_run_id(request.run_kind)
    run_dir = artifact_root / "runs" / run_id
    checkpoint_dir = run_dir / "checkpoints"
    run_dir.mkdir(parents=True, exist_ok=False)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    logger = JsonlEventLogger(run_dir / "events.jsonl")
    probe = RuntimeProbe()
    logger.event("run-start", {"runId": run_id, "runKind": request.run_kind, "targetStepsPerEnv": target_steps})

    manifest = {
        **template,
        "phaseId": request.phase_id,
        "runId": run_id,
        "runKind": request.run_kind,
        "artifactRoot": _relative(artifact_root),
        "runDir": _relative(run_dir),
        "checkpointInput": _relative(request.checkpoint_path) if request.checkpoint_path else None,
        "resumeInput": resume_input,
        "scaffoldOnly": True,
        "promotionAllowed": False,
        "bt94aGate": "closed",
        "entrypoints": {
            "train": "python/train.py",
            "eval": "python/eval.py",
            "callbacks": "python/callbacks/bt93b_scaffold.py",
            "runner": "python/scaffold/bt93b_runner.py",
        },
    }
    write_json(run_dir / "run_manifest.json", manifest)

    results: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=env_count, thread_name_prefix="bt93b-env") as executor:
        futures = [
            executor.submit(
                _run_env_worker,
                env_index=env_index,
                seed=int(seeds[env_index]),
                target_steps=target_steps,
                run_id=run_id,
                run_kind=request.run_kind,
                logger=logger,
            )
            for env_index in range(env_count)
        ]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    results.sort(key=lambda entry: int(entry["envIndex"]))
    combined_normalizer = ObservationNormalizerStats(EXPECTED_OBSERVATION_LENGTH, clip_observation=10.0)
    failure_classes: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    total_steps = 0
    total_reward = 0.0
    reset_count = 0
    for result in results:
        combined_normalizer.merge_state(result["normalizerState"])
        total_steps += int(result.get("completedSteps") or 0)
        total_reward += float(result.get("rewardTotal") or 0.0)
        reset_count += int(result.get("resetCount") or 0)
        if result.get("ok") is not True:
            failure_classes[str(result.get("failureClass") or "unknown")] += 1
        terminal_reasons.update(result.get("terminalReasons") or {})
        truncated_reasons.update(result.get("truncatedReasons") or {})

    runtime_summary = probe.finish()
    total_target_steps = target_steps * env_count
    ok = len(failure_classes) == 0 and total_steps == total_target_steps
    failure_rate = (sum(failure_classes.values()) / env_count) if env_count else 1.0
    timeout_count = int(failure_classes.get("timeout", 0))
    report_path = run_dir / "training_report.json"
    stats_json_path = checkpoint_dir / "vecnormalize.json"
    stats_pickle_path = checkpoint_dir / "vecnormalize.pkl"
    checkpoint_path = checkpoint_dir / "latest_checkpoint.json"
    crash_path = run_dir / "crash_paths.json"
    hardware_path = run_dir / "hardware_limits.json"

    stats_summary = combined_normalizer.summary()
    stats_metadata = {
        "runId": run_id,
        "runKind": request.run_kind,
        "phaseId": request.phase_id,
        "scaffoldOnly": True,
        "sourceManifest": _relative(template_path),
    }
    write_json(stats_json_path, {"metadata": stats_metadata, "stats": stats_summary})
    combined_normalizer.write_pickle(stats_pickle_path, stats_metadata)

    checkpoint = {
        "checkpointVersion": CHECKPOINT_VERSION,
        "checkpointId": f"{run_id}-latest",
        "runId": run_id,
        "runKind": request.run_kind,
        "phaseId": request.phase_id,
        "resumedFrom": resume_input,
        "scaffoldOnly": True,
        "promotionAllowed": False,
        "bt94aGate": "closed",
        "completedSteps": total_steps,
        "targetSteps": total_target_steps,
        "policySurface": template["actionSurface"],
        "normalizationStats": _relative(stats_pickle_path),
        "normalizationStatsJson": _relative(stats_json_path),
        "note": "Scaffold-only split-head smoke; no PPO optimizer update and no baseline claim.",
    }
    write_json(checkpoint_path, checkpoint)

    hardware_limits = {
        "hardware": hardware_snapshot(),
        "runtimeProbe": runtime_summary,
        "measuredLane": {
            "envCount": env_count,
            "targetStepsPerEnv": target_steps,
            "totalTargetSteps": total_target_steps,
            "wallClockSeconds": runtime_summary["elapsedSeconds"],
            "stepsPerSecond": total_steps / runtime_summary["elapsedSeconds"] if runtime_summary["elapsedSeconds"] > 0 else 0.0,
        },
        "limits": {
            "source": "data/training/ppo/bt93a_handover_2env.json",
            "maxValidatedEnvCount": int(lane["maxValidatedEnvCount"]),
            "fourEnvStatus": lane["fourEnvStatus"],
            "controllerTimeoutSeconds": DEFAULT_COMMAND_TIMEOUT_SECONDS,
        },
    }
    write_json(hardware_path, hardware_limits)

    crash_paths = {
        "ok": ok,
        "failureClasses": dict(sorted(failure_classes.items())),
        "timeoutCount": timeout_count,
        "failureRate": failure_rate,
        "fallbackRequired": not ok,
        "fallbackLane": "BT93A pinned sequential 2-env fallback" if not ok else None,
        "workerResults": [
            {
                key: value
                for key, value in result.items()
                if key not in {"normalizerState", "diagnostics", "traceback"}
            }
            for result in results
        ],
    }
    write_json(crash_path, crash_paths)

    report = {
        "ok": ok,
        "generatedAt": utc_now(),
        "generatedBy": "python/train.py" if request.run_kind != "eval-smoke" else "python/eval.py",
        "blockId": "BT93B",
        "phaseId": request.phase_id,
        "runId": run_id,
        "runKind": request.run_kind,
        "scaffoldOnly": True,
        "promotionAllowed": False,
        "bt94aGate": "closed",
        "budget": {
            "sourceArtifact": "data/training/ppo/bt93a_handover_2env.json",
            "envCount": env_count,
            "targetStepsPerEnv": target_steps,
            "totalTargetSteps": total_target_steps,
            "selectedNstepsPerEnv": selected_steps,
            "selectedBatchSize": int(rollout["selectedBatchSize"]),
            "measuredMaxRolloutStepsTotal": int(rollout["measuredMaxRolloutStepsTotal"]),
        },
        "performance": {
            "totalStepsCompleted": total_steps,
            "wallClockSeconds": runtime_summary["elapsedSeconds"],
            "stepsPerSecond": total_steps / runtime_summary["elapsedSeconds"] if runtime_summary["elapsedSeconds"] > 0 else 0.0,
            "failureRate": failure_rate,
        },
        "stability": {
            "resetCount": reset_count,
            "timeoutCount": timeout_count,
            "failureClasses": dict(sorted(failure_classes.items())),
            "terminalReasons": dict(sorted(terminal_reasons.items())),
            "truncatedReasons": dict(sorted(truncated_reasons.items())),
        },
        "artifacts": {
            "runDir": _relative(run_dir),
            "runManifest": _relative(run_dir / "run_manifest.json"),
            "events": _relative(logger.path),
            "trainingReport": _relative(report_path),
            "checkpoint": _relative(checkpoint_path),
            "normalizationStats": _relative(stats_pickle_path),
            "normalizationStatsJson": _relative(stats_json_path),
            "crashPaths": _relative(crash_path),
            "hardwareLimits": _relative(hardware_path),
        },
        "resume": {
            "required": request.run_kind == "resume-smoke",
            "validated": resume_input is not None,
            "input": resume_input,
        },
        "workerResults": results,
        "scopeGuardrails": {
            "readOnlyRuntimeSurfaces": list(READ_ONLY_RUNTIME_SURFACES),
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
        },
    }
    write_json(report_path, report)
    write_json(artifact_root / f"latest_{request.run_kind.replace('-', '_')}.json", {
        "runId": run_id,
        "ok": ok,
        "report": _relative(report_path),
        "checkpoint": _relative(checkpoint_path),
        "runDir": _relative(run_dir),
    })
    write_json(artifact_root / "latest_run.json", {
        "runId": run_id,
        "runKind": request.run_kind,
        "ok": ok,
        "report": _relative(report_path),
        "checkpoint": _relative(checkpoint_path),
        "runDir": _relative(run_dir),
    })
    logger.event("run-finish", {"runId": run_id, "ok": ok, "totalSteps": total_steps})

    print(json.dumps({
        "ok": ok,
        "runId": run_id,
        "report": _relative(report_path),
        "checkpoint": _relative(checkpoint_path),
        "totalStepsCompleted": total_steps,
        "stepsPerSecond": report["performance"]["stepsPerSecond"],
        "failureRate": failure_rate,
    }, indent=2))
    if not ok:
        raise RuntimeError(f"BT93B scaffold run failed; see {_relative(report_path)}")
    return json_safe(report)


def run_from_cli(
    *,
    run_kind: str,
    phase_id: str,
    manifest_template: str | None,
    artifact_root: str | None,
    target_steps_per_env: int | None,
    checkpoint: str | None = None,
) -> dict[str, Any]:
    artifact_root_path = Path(artifact_root).resolve() if artifact_root else DEFAULT_ARTIFACT_ROOT
    checkpoint_path = Path(checkpoint).resolve() if checkpoint else None
    if run_kind == "resume-smoke" and checkpoint_path is None:
        checkpoint_path = latest_checkpoint_path(artifact_root_path)
    return run_scaffold(ScaffoldRunRequest(
        run_kind=run_kind,
        phase_id=phase_id,
        manifest_template_path=Path(manifest_template).resolve() if manifest_template else DEFAULT_TEMPLATE_PATH,
        artifact_root=artifact_root_path,
        target_steps_per_env=target_steps_per_env,
        checkpoint_path=checkpoint_path,
    ))


def latest_checkpoint_path(artifact_root: Path = DEFAULT_ARTIFACT_ROOT) -> Path:
    pointer_path = artifact_root / "latest_run.json"
    if not pointer_path.exists():
        raise FileNotFoundError(f"missing latest BT93B run pointer: {pointer_path}")
    pointer = _read_json(pointer_path)
    checkpoint = pointer.get("checkpoint")
    if not checkpoint:
        raise RuntimeError(f"latest BT93B run pointer has no checkpoint: {pointer_path}")
    return (REPO_ROOT / str(checkpoint)).resolve()
