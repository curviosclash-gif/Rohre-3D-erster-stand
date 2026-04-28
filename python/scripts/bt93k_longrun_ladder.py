"""BT93K.6 signal-gated diagnostic longrun ladder evidence."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from collections import Counter
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import make_curvios_action_wrapper  # noqa: E402


BT93K_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93k"
DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93k_longrun_ladder.json"
REPORT_PATH = BT93K_ROOT / "longrun_ladder_decision_report.json"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

SEMANTIC_CYCLE = (1, 2, 3, 4, 5, 6, 7, 8, 0)


@dataclass(frozen=True)
class LadderRung:
    id: str
    phase_item: str
    env_count: int
    target_env_steps: int
    minimum_completed_episodes: int
    sample_class: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _stamp() -> str:
    return _utc_now().replace("-", "").replace(":", "")


def _rel(path: Path | str | None) -> str | None:
    if path is None:
        return None
    resolved = Path(path).resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _json_safe(value: Any) -> Any:
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, Mapping):
        return {str(key): _json_safe(entry) for key, entry in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(entry) for entry in value]
    if isinstance(value, Path):
        return _rel(value)
    return value


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(_json_safe(payload), indent=2, sort_keys=True)}\n", encoding="utf-8")


def _append_jsonl(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"{json.dumps(_json_safe(payload), sort_keys=True)}\n")


def _sha256_file(path: Path) -> str | None:
    if not path.exists():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "exists": path.exists(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _number(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return {key: int(value) for key, value in sorted(counter.items())}


def _sum_action_telemetry(reports: list[Mapping[str, Any]]) -> dict[str, Any]:
    totals = Counter()
    field_counts = Counter()
    sanitizer_reasons = Counter()
    raw_examples: list[Mapping[str, Any]] = []
    keys = (
        "totalActions",
        "invalidActionCount",
        "preSamplingMaskCount",
        "maskCount",
        "postDecodeClampCount",
        "vetoCount",
        "sanitizerCount",
        "noopCount",
    )
    for report in reports:
        for key in keys:
            totals[key] += int(report.get(key) or 0)
        field_counts.update({str(key): int(value) for key, value in dict(report.get("fieldCounts") or {}).items()})
        sanitizer_reasons.update(
            {str(key): int(value) for key, value in dict(report.get("sanitizerReasons") or {}).items()}
        )
        for example in report.get("rawActionExamples") or []:
            if isinstance(example, Mapping) and len(raw_examples) < 8:
                raw_examples.append(example)

    total_actions = int(totals["totalActions"])

    def rate(count_key: str) -> float:
        return round(float(totals[count_key]) / total_actions, 6) if total_actions else 0.0

    return {
        "totalActions": total_actions,
        "invalidActionCount": int(totals["invalidActionCount"]),
        "invalidActionRate": rate("invalidActionCount"),
        "preSamplingMaskCount": int(totals["preSamplingMaskCount"]),
        "preSamplingMaskRate": rate("preSamplingMaskCount"),
        "maskCount": int(totals["maskCount"]),
        "maskRate": rate("maskCount"),
        "postDecodeClampCount": int(totals["postDecodeClampCount"]),
        "postDecodeClampRate": rate("postDecodeClampCount"),
        "vetoCount": int(totals["vetoCount"]),
        "vetoRate": rate("vetoCount"),
        "sanitizerCount": int(totals["sanitizerCount"]),
        "sanitizerRate": rate("sanitizerCount"),
        "noopCount": int(totals["noopCount"]),
        "noopRate": rate("noopCount"),
        "fieldCounts": _counter_dict(field_counts),
        "sanitizerReasons": _counter_dict(sanitizer_reasons),
        "rawActionExamples": raw_examples,
    }


def _extract_effective_environment(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    effective = info.get("effectiveEnvironment")
    if isinstance(effective, Mapping):
        return effective
    effective = metadata.get("effectiveEnvironment")
    return effective if isinstance(effective, Mapping) else {}


def _minimal_info(info: Mapping[str, Any]) -> dict[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics") if isinstance(metadata.get("episodeSemantics"), Mapping) else {}
    return {
        "episodeId": info.get("episodeId"),
        "episodeIndex": info.get("episodeIndex"),
        "stepIndex": info.get("stepIndex"),
        "terminalReason": info.get("terminalReason"),
        "truncatedReason": info.get("truncatedReason"),
        "rewardBreakdown": info.get("rewardBreakdown"),
        "effectiveEnvironment": _extract_effective_environment(info),
        "episodeSemantics": dict(semantics),
        "bridgeActionLatencyMs": info.get("bridgeActionLatencyMs"),
        "bridgeAckLatencyMs": info.get("bridgeAckLatencyMs"),
    }


def _action_for_step(policy: str, step_index: int, env_index: int) -> int:
    if policy == "noop":
        return 0
    offset = (int(step_index) + int(env_index)) % len(SEMANTIC_CYCLE)
    return int(SEMANTIC_CYCLE[offset])


def _run_worker(
    *,
    env_index: int,
    seed: int,
    run_id: str,
    env_cfg: Mapping[str, Any],
    steps_per_env: int,
    progress: dict[int, int],
) -> dict[str, Any]:
    started = time.perf_counter()
    max_steps = int(env_cfg["maxStepsPerEpisode"])
    action_policy = str(env_cfg.get("actionPolicy") or "semantic-cycle")
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max_steps,
            default_seed=seed,
            session_id=f"{run_id}-env{env_index}",
            controller_timeout_seconds=float(env_cfg["controllerTimeoutSeconds"]),
            reward_profile_id=str(env_cfg.get("rewardProfileId") or "") or None,
            map_key=str(env_cfg.get("mapKey") or "standard"),
            domain_mode=str(env_cfg.get("domainMode") or "classic-3d"),
            game_mode=str(env_cfg.get("gameMode") or "") or None,
            planar_mode=bool(env_cfg.get("planarMode")),
            mode_path=str(env_cfg.get("modePath") or "") or None,
            curriculum_step_offset=int(env_cfg.get("curriculumStepOffset") or 0),
        ),
        surface_id=str(env_cfg.get("actionSurfaceId") or ""),
    )
    env.action_space.seed(seed)
    rewards: list[float] = []
    reward_totals: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    death_causes: Counter[str] = Counter()
    effective_maps: Counter[str] = Counter()
    effective_modes: Counter[str] = Counter()
    curriculum_stages: Counter[str] = Counter()
    curriculum_offsets: Counter[str] = Counter()
    global_steps: list[float] = []
    total_steps: list[float] = []
    action_latencies: list[float] = []
    ack_latencies: list[float] = []
    info_tail: list[dict[str, Any]] = []
    completed_lengths: list[int] = []
    open_length = 0
    controller_pid: int | None = None
    error: str | None = None
    diagnostics: Mapping[str, Any] = {}
    reset_count = 0
    try:
        _, reset_info = env.reset(seed=seed)
        controller_pid = getattr(env.env, "controller_pid", None)
        info_tail.append(_minimal_info(reset_info))
        for step_index in range(steps_per_env):
            _, reward, terminated, truncated, info = env.step(_action_for_step(action_policy, step_index, env_index))
            rewards.append(float(reward))
            open_length += 1
            minimal = _minimal_info(info)
            info_tail.append(minimal)
            info_tail = info_tail[-8:]
            effective = minimal.get("effectiveEnvironment") if isinstance(minimal.get("effectiveEnvironment"), Mapping) else {}
            if effective.get("mapKey"):
                effective_maps[str(effective.get("mapKey"))] += 1
            if effective.get("domainMode"):
                effective_modes[str(effective.get("domainMode"))] += 1
            if effective.get("activeCurriculumStage"):
                curriculum_stages[str(effective.get("activeCurriculumStage"))] += 1
            offset = _number(effective.get("curriculumStepOffset"))
            if offset is not None:
                curriculum_offsets[str(int(offset))] += 1
            global_step = _number(effective.get("globalEnvSteps"))
            if global_step is not None:
                global_steps.append(global_step)
            total_step = _number(effective.get("curriculumTotalEnvSteps"))
            if total_step is not None:
                total_steps.append(total_step)

            reward_breakdown = info.get("rewardBreakdown") if isinstance(info.get("rewardBreakdown"), Mapping) else {}
            for key, value in reward_breakdown.items():
                number = _number(value)
                if number is not None:
                    reward_totals[str(key)] += number
            terminal_reason = info.get("terminalReason")
            if terminal_reason:
                reason = str(terminal_reason)
                terminal_reasons[reason] += 1
                if any(token in reason.lower() for token in ("death", "dead", "crash", "loss", "killed")):
                    death_causes[reason] += 1
            truncated_reason = info.get("truncatedReason")
            if truncated_reason:
                truncated_reasons[str(truncated_reason)] += 1

            action_latency = _number(info.get("bridgeActionLatencyMs"))
            if action_latency is not None:
                action_latencies.append(action_latency)
            ack_latency = _number(info.get("bridgeAckLatencyMs"))
            if ack_latency is not None:
                ack_latencies.append(ack_latency)

            if terminated or truncated:
                completed_lengths.append(open_length)
                open_length = 0
                reset_count += 1
                if step_index + 1 < steps_per_env:
                    _, reset_info = env.reset(seed=seed + reset_count)
                    info_tail.append(_minimal_info(reset_info))
                    info_tail = info_tail[-8:]

            if (step_index + 1) % 250 == 0:
                progress[env_index] = step_index + 1

        progress[env_index] = len(rewards)
        diagnostics = env.env.get_diagnostics()
    except Exception as exc:  # pragma: no cover - recorded as report evidence
        error = str(exc)
        progress[env_index] = len(rewards)
    finally:
        env.close()

    telemetry = env.get_telemetry_report() if hasattr(env, "get_telemetry_report") else {}
    bridge_telemetry = diagnostics.get("bridgeTelemetry") if isinstance(diagnostics, Mapping) else {}
    stats = diagnostics.get("stats") if isinstance(diagnostics, Mapping) else {}
    return {
        "envIndex": int(env_index),
        "seed": int(seed),
        "sessionId": f"{run_id}-env{env_index}",
        "ok": error is None and len(rewards) == steps_per_env,
        "error": error,
        "controllerPid": controller_pid,
        "stepsObserved": len(rewards),
        "rewardTotal": round(sum(rewards), 6),
        "rewardBreakdownTotals": {key: round(float(value), 6) for key, value in sorted(reward_totals.items())},
        "terminalReasonCounts": _counter_dict(terminal_reasons),
        "truncatedReasonCounts": _counter_dict(truncated_reasons),
        "deathCauseCounts": _counter_dict(death_causes),
        "completedEpisodeLengths": completed_lengths,
        "openEpisodeLengthAtStop": int(open_length),
        "effectiveMapCounts": _counter_dict(effective_maps),
        "effectiveModeCounts": _counter_dict(effective_modes),
        "effectiveCurriculumStageCounts": _counter_dict(curriculum_stages),
        "curriculumStepOffsetCounts": _counter_dict(curriculum_offsets),
        "globalEnvStepRange": {
            "min": min(global_steps) if global_steps else None,
            "max": max(global_steps) if global_steps else None,
        },
        "curriculumTotalEnvStepRange": {
            "min": min(total_steps) if total_steps else None,
            "max": max(total_steps) if total_steps else None,
        },
        "bridgeActionLatencyMs": _numeric_summary(action_latencies),
        "bridgeAckLatencyMs": _numeric_summary(ack_latencies),
        "actionTelemetry": dict(telemetry),
        "bridgeTelemetry": {
            "requestsSent": int((bridge_telemetry or {}).get("requestsSent") or 0),
            "responsesReceived": int((bridge_telemetry or {}).get("responsesReceived") or 0),
            "timeouts": int((bridge_telemetry or {}).get("timeouts") or 0),
            "failures": int((bridge_telemetry or {}).get("failures") or 0),
            "latencyMeanMs": (bridge_telemetry or {}).get("latencyMeanMs"),
            "latencyP95Ms": (bridge_telemetry or {}).get("latencyP95Ms"),
            "readyMessages": int((bridge_telemetry or {}).get("readyMessages") or 0),
        },
        "runtimeStats": {
            "messageCounts": dict((stats or {}).get("messageCounts") or {}),
            "contractSmoke": dict((stats or {}).get("contractSmoke") or {}),
        },
        "infoTail": info_tail,
        "wallClockSeconds": round(time.perf_counter() - started, 6),
    }


def _numeric_summary(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"count": 0, "min": None, "max": None, "mean": None}
    return {
        "count": len(values),
        "min": round(min(values), 6),
        "max": round(max(values), 6),
        "mean": round(sum(values) / len(values), 6),
    }


def _combine_counts(workers: list[Mapping[str, Any]], key: str) -> Counter[str]:
    counter: Counter[str] = Counter()
    for worker in workers:
        counter.update({str(name): int(value) for name, value in dict(worker.get(key) or {}).items()})
    return counter


def _summarize_workers(workers: list[Mapping[str, Any]], *, start_matrix: Mapping[str, Any]) -> dict[str, Any]:
    reward_totals: Counter[str] = Counter()
    for worker in workers:
        reward_totals.update({str(key): float(value) for key, value in dict(worker.get("rewardBreakdownTotals") or {}).items()})
    completed_lengths = [
        int(length)
        for worker in workers
        for length in (worker.get("completedEpisodeLengths") or [])
        if isinstance(length, (int, float))
    ]
    open_lengths = [
        int(worker.get("openEpisodeLengthAtStop") or 0)
        for worker in workers
        if int(worker.get("openEpisodeLengthAtStop") or 0) > 0
    ]
    terminal_reasons = _combine_counts(workers, "terminalReasonCounts")
    truncated_reasons = _combine_counts(workers, "truncatedReasonCounts")
    death_causes = _combine_counts(workers, "deathCauseCounts")
    action = _sum_action_telemetry([
        worker.get("actionTelemetry") for worker in workers if isinstance(worker.get("actionTelemetry"), Mapping)
    ])
    completed = len(completed_lengths)
    natural_terminal_count = sum(terminal_reasons.values()) - sum(death_causes.values())
    max_step_episodes = sum(
        value
        for key, value in truncated_reasons.items()
        if "max" in key.lower() and "step" in key.lower()
    )
    death_before_60 = len([length for length in completed_lengths if length < 60])
    avg_steps = round(sum(completed_lengths) / completed, 6) if completed else None
    progress_reward = float(reward_totals.get("checkpointReached", 0.0)) + float(reward_totals.get("parcoursCompleted", 0.0))
    objective_reward = progress_reward + float(reward_totals.get("kill", 0.0)) + float(reward_totals.get("win", 0.0))
    runtime_error_count = sum(1 for worker in workers if not worker.get("ok"))
    timeout_count = sum(int((worker.get("bridgeTelemetry") or {}).get("timeouts") or 0) for worker in workers)
    bridge_failure_count = sum(int((worker.get("bridgeTelemetry") or {}).get("failures") or 0) for worker in workers)
    start_action = start_matrix.get("actionSafety") if isinstance(start_matrix.get("actionSafety"), Mapping) else {}

    def rate_ok(key: str) -> bool:
        observed = float(action.get(key) or 0.0)
        start = float(start_action.get(key) or 0.0)
        return observed <= start

    action_safety_not_worse = all(
        rate_ok(key)
        for key in ("invalidActionRate", "sanitizerRate", "postDecodeClampRate", "vetoRate")
    )
    return {
        "envCount": len(workers),
        "okWorkerCount": sum(1 for worker in workers if worker.get("ok")),
        "totalStepsObserved": sum(int(worker.get("stepsObserved") or 0) for worker in workers),
        "runtimeErrorCount": int(runtime_error_count),
        "timeoutCount": int(timeout_count),
        "bridgeFailureCount": int(bridge_failure_count),
        "rewardTotal": round(sum(float(worker.get("rewardTotal") or 0.0) for worker in workers), 6),
        "rewardBreakdownTotals": {key: round(float(value), 6) for key, value in sorted(reward_totals.items())},
        "rewardSignal": {
            "progressReward": round(progress_reward, 6),
            "objectiveReward": round(objective_reward, 6),
            "checkpointReachedReward": round(float(reward_totals.get("checkpointReached", 0.0)), 6),
            "parcoursCompletedReward": round(float(reward_totals.get("parcoursCompleted", 0.0)), 6),
            "progressSignalNonZero": progress_reward > 0,
            "objectiveSignalNonZero": objective_reward > 0,
        },
        "survival": {
            "avgStepsPerEpisodeObserved": avg_steps,
            "averageBotSurvivalObserved": avg_steps,
            "completedEpisodeCount": completed,
            "longestEpisode": max(completed_lengths) if completed_lengths else None,
            "completedEpisodeLengths": completed_lengths,
            "openEpisodeLengthsAtStop": open_lengths,
        },
        "terminalSignal": {
            "terminalReasonCounts": _counter_dict(terminal_reasons),
            "truncatedReasonCounts": _counter_dict(truncated_reasons),
            "deathCauseCounts": _counter_dict(death_causes),
            "naturalTerminalCount": int(max(0, natural_terminal_count)),
            "naturalTerminalShare": round(max(0, natural_terminal_count) / completed, 6) if completed else None,
            "maxStepEpisodes": int(max_step_episodes),
            "maxStepEpisodeShare": round(max_step_episodes / completed, 6) if completed else None,
            "deathBefore60Count": int(death_before_60),
            "deathBefore60Share": round(death_before_60 / completed, 6) if completed else None,
            "playerDeadOnly": bool(sum(terminal_reasons.values()) > 0 and sum(death_causes.values()) == sum(terminal_reasons.values())),
            "runtimeErrorCount": int(runtime_error_count),
        },
        "actionSafety": action,
        "actionSafetyGreen": bool(
            action["totalActions"] > 0
            and action["invalidActionCount"] == 0
            and action["sanitizerCount"] == 0
            and action["postDecodeClampCount"] == 0
            and action["vetoCount"] == 0
        ),
        "actionSafetyNotWorseThanStart": action_safety_not_worse,
    }


def _run_ladder_rung(
    *,
    rung: LadderRung,
    config: Mapping[str, Any],
    config_path: Path,
    command: str,
    start_matrix: Mapping[str, Any],
) -> dict[str, Any]:
    env_cfg = config["env"]
    run_id = f"{_stamp()}-bt93k-{rung.id}"
    run_dir = BT93K_ROOT / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    stdout_path = run_dir / "stdout.log"
    stderr_path = run_dir / "stderr.log"
    heartbeat_path = run_dir / "heartbeat.jsonl"
    snapshot_manifest_path = run_dir / "snapshot_manifest.json"
    eval_snapshot_path = run_dir / "eval_snapshot.json"
    artifact_manifest_path = run_dir / "artifact_manifest.json"
    run_exit_report_path = run_dir / "run_exit_report.json"
    started_at = _utc_now()
    start_perf = time.perf_counter()
    seed_base = int(env_cfg["seedBase"]) + (rung.env_count * 100)
    steps_per_env = max(1, int(rung.target_env_steps) // int(rung.env_count))
    progress = {index: 0 for index in range(rung.env_count)}
    stdout_lines = [
        f"{started_at} starting BT93K.6 {rung.id}",
        f"config={_rel(config_path)}",
        f"envCount={rung.env_count}",
        f"targetEnvSteps={rung.target_env_steps}",
        f"stepsPerEnv={steps_per_env}",
    ]
    stderr_lines: list[str] = []
    heartbeat_count = 0

    def heartbeat(last_snapshot: str | None = None, last_eval: str | None = None) -> None:
        nonlocal heartbeat_count
        heartbeat_count += 1
        _append_jsonl(heartbeat_path, {
            "timestamp": _utc_now(),
            "runId": run_id,
            "pid": os.getpid(),
            "activeSidecarPids": [],
            "progressTimesteps": sum(int(value) for value in progress.values()),
            "lastSnapshotPath": last_snapshot,
            "lastEvalSnapshotPath": last_eval,
        })

    heartbeat()
    workers: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=rung.env_count) as executor:
        futures = {
            executor.submit(
                _run_worker,
                env_index=index,
                seed=seed_base + index,
                run_id=run_id,
                env_cfg=env_cfg,
                steps_per_env=steps_per_env,
                progress=progress,
            ): index
            for index in range(rung.env_count)
        }
        pending = set(futures)
        while pending:
            done, pending = wait(pending, timeout=20, return_when=FIRST_COMPLETED)
            heartbeat()
            for future in done:
                worker = future.result()
                workers.append(worker)
                if worker.get("error"):
                    stderr_lines.append(f"env{worker['envIndex']}: {worker['error']}")
    workers.sort(key=lambda entry: int(entry["envIndex"]))
    summary = _summarize_workers(workers, start_matrix=start_matrix)
    controller_pids = [
        int(worker["controllerPid"])
        for worker in workers
        if worker.get("controllerPid") is not None
    ]
    finished_at = _utc_now()
    elapsed = round(time.perf_counter() - start_perf, 6)
    technical_ok = bool(
        summary["okWorkerCount"] == rung.env_count
        and summary["totalStepsObserved"] == steps_per_env * rung.env_count
        and summary["runtimeErrorCount"] == 0
        and summary["timeoutCount"] == 0
        and summary["bridgeFailureCount"] == 0
        and summary["actionSafetyGreen"]
    )
    completed_ok = summary["survival"]["completedEpisodeCount"] >= rung.minimum_completed_episodes
    ok = bool(technical_ok and completed_ok)

    eval_snapshot = {
        "schemaVersion": "bt93k-longrun-ladder-eval-snapshot-v1",
        "generatedAt": finished_at,
        "blockId": "BT93K",
        "phaseId": rung.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "rungId": rung.id,
        "sampleClass": rung.sample_class,
        "diagnosticOnly": True,
        "qualityClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "holdoutUsed": False,
        "summary": summary,
        "workers": workers,
    }
    _write_json(eval_snapshot_path, eval_snapshot)

    snapshot_manifest = {
        "manifestVersion": "bt93k-longrun-ladder-snapshot-v1",
        "generatedAt": finished_at,
        "generatedBy": "python/scripts/bt93k_longrun_ladder.py",
        "blockId": "BT93K",
        "phaseId": rung.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "rungId": rung.id,
        "snapshotClass": "signal-gated-diagnostic-final-state",
        "diagnosticOnly": True,
        "candidateRun": False,
        "freezeCandidate": False,
        "promotionAllowed": False,
        "holdoutUsed": False,
        "artifacts": {
            "evalSnapshot": _rel(eval_snapshot_path),
            "evalSnapshotSha256": _sha256_file(eval_snapshot_path),
            "snapshotManifest": _rel(snapshot_manifest_path),
        },
        "summary": {
            "allSidecarsStarted": len(controller_pids) == rung.env_count,
            "allWorkersOk": summary["okWorkerCount"] == rung.env_count,
            "totalStepsObserved": summary["totalStepsObserved"],
            "completedEpisodeCount": summary["survival"]["completedEpisodeCount"],
            "actionSafetyGreen": summary["actionSafetyGreen"],
        },
    }
    _write_json(snapshot_manifest_path, snapshot_manifest)

    artifact_manifest = {
        "manifestVersion": "bt93k-longrun-ladder-artifacts-v1",
        "generatedAt": finished_at,
        "blockId": "BT93K",
        "phaseId": rung.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "rungId": rung.id,
        "sourceConfig": {
            "path": _rel(config_path),
            "sha256": _sha256_file(config_path),
        },
        "artifacts": {
            "runExitReport": _rel(run_exit_report_path),
            "snapshotManifest": _rel(snapshot_manifest_path),
            "snapshotManifestSha256": _sha256_file(snapshot_manifest_path),
            "evalSnapshot": _rel(eval_snapshot_path),
            "evalSnapshotSha256": _sha256_file(eval_snapshot_path),
            "heartbeat": _rel(heartbeat_path),
            "stdout": _rel(stdout_path),
            "stderr": _rel(stderr_path),
        },
        "guardrails": dict(config.get("guardrails") or {}),
    }
    _write_json(artifact_manifest_path, artifact_manifest)
    heartbeat(_rel(snapshot_manifest_path), _rel(eval_snapshot_path))

    run_exit_report = {
        "schemaVersion": "bt93k-run-exit-report-v1",
        "blockId": "BT93K",
        "phaseId": rung.phase_item,
        "runId": run_id,
        "runKind": config["runKind"],
        "rungId": rung.id,
        "command": command,
        "configPath": _rel(config_path),
        "startedAt": started_at,
        "finishedAt": finished_at,
        "elapsedSeconds": elapsed,
        "ok": ok,
        "statusClass": "completed" if ok else "measurement-invalid",
        "exitCode": 0 if ok else 1,
        "stopReason": "normal-completion" if ok else "technical-or-episode-gate",
        "gracefulStop": True,
        "forcedStop": False,
        "signal": None,
        "pidTree": {
            "mainPid": os.getpid(),
            "controllerPids": controller_pids,
            "sidecarModel": "one in-process Bt92ControlledBridgeSidecar thread plus one node controller process per env",
        },
        "sidecars": [
            {
                "envIndex": int(worker["envIndex"]),
                "seed": int(worker["seed"]),
                "sessionId": worker["sessionId"],
                "controllerPid": worker.get("controllerPid"),
                "started": worker.get("controllerPid") is not None,
                "closed": True,
                "exitCode": 0 if worker.get("ok") else 1,
                "statusClass": "completed" if worker.get("ok") else "failed",
            }
            for worker in workers
        ],
        "heartbeat": {
            "path": _rel(heartbeat_path),
            "lastTimestamp": finished_at,
            "stale": False,
            "writeCount": heartbeat_count,
        },
        "stdoutPath": _rel(stdout_path),
        "stderrPath": _rel(stderr_path),
        "runDirectory": _rel(run_dir),
        "snapshotManifestPath": _rel(snapshot_manifest_path),
        "evalSnapshotPath": _rel(eval_snapshot_path),
        "artifactManifestPath": _rel(artifact_manifest_path),
        "metricsSummary": summary,
        "guardrails": {
            "sampleClass": rung.sample_class,
            "diagnosticOnly": True,
            "qualityClaimAllowed": False,
            "comparisonStarted": False,
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "runtimeSurfacesTouched": [],
        },
    }
    _write_json(run_exit_report_path, run_exit_report)
    stdout_lines.append(f"{finished_at} completed ok={ok} totalSteps={summary['totalStepsObserved']}")
    stdout_path.write_text("\n".join(stdout_lines) + "\n", encoding="utf-8")
    stderr_path.write_text("\n".join(stderr_lines) + ("\n" if stderr_lines else ""), encoding="utf-8")

    return {
        "id": rung.id,
        "phaseItem": rung.phase_item,
        "envCount": rung.env_count,
        "targetEnvSteps": rung.target_env_steps,
        "ok": ok,
        "technicalOk": technical_ok,
        "completedEpisodeGateOk": completed_ok,
        "runId": run_id,
        "runDirectory": _rel(run_dir),
        "runExitReport": _rel(run_exit_report_path),
        "runExitReportSha256": _sha256_file(run_exit_report_path),
        "snapshotManifest": _rel(snapshot_manifest_path),
        "snapshotManifestSha256": _sha256_file(snapshot_manifest_path),
        "evalSnapshot": _rel(eval_snapshot_path),
        "evalSnapshotSha256": _sha256_file(eval_snapshot_path),
        "artifactManifest": _rel(artifact_manifest_path),
        "artifactManifestSha256": _sha256_file(artifact_manifest_path),
        "summary": summary,
    }


def _artifact_status(path: Path) -> dict[str, Any]:
    exists = path.exists()
    payload = _read_json(path) if exists else {}
    return {
        "path": _rel(path),
        "exists": exists,
        "ok": payload.get("ok") is True if exists else False,
        "resultClass": payload.get("resultClass") if exists else None,
        "sha256": _sha256_file(path),
    }


def _prerequisite_status(config: Mapping[str, Any]) -> dict[str, Any]:
    artifacts = config.get("artifacts") if isinstance(config.get("artifacts"), Mapping) else {}
    keys = (
        "supervisorContract",
        "runnerSignalRepair",
        "modeMapSmoke",
        "envScaleSmoke",
        "signalMetricContract",
        "cudaBenchmark",
    )
    status = {key: _artifact_status(_repo_path(str(artifacts[key]))) for key in keys if artifacts.get(key)}
    env_scale = status.get("envScaleSmoke", {})
    status["summary"] = {
        "allRequiredGreen": all(
            status.get(key, {}).get("ok") is True
            for key in ("supervisorContract", "runnerSignalRepair", "modeMapSmoke", "envScaleSmoke", "signalMetricContract")
        ),
        "cudaBenchmarkInformationalOnly": True,
        "envScaleSmokeGreen": env_scale.get("ok") is True,
    }
    return status


def _rung_from_config(entry: Mapping[str, Any]) -> LadderRung:
    return LadderRung(
        id=str(entry["id"]),
        phase_item=str(entry["phaseItem"]),
        env_count=int(entry["envCount"]),
        target_env_steps=int(entry["targetEnvSteps"]),
        minimum_completed_episodes=int(entry.get("minimumCompletedEpisodes") or 0),
        sample_class=str(entry.get("sampleClass") or "signal-gated-diagnostic"),
    )


def _evaluate_ladder_gates(
    *,
    first_run: Mapping[str, Any],
    config: Mapping[str, Any],
    signal_contract: Mapping[str, Any],
) -> dict[str, Any]:
    summary = first_run.get("summary") if isinstance(first_run.get("summary"), Mapping) else {}
    reward = summary.get("rewardSignal") if isinstance(summary.get("rewardSignal"), Mapping) else {}
    terminal = summary.get("terminalSignal") if isinstance(summary.get("terminalSignal"), Mapping) else {}
    survival = summary.get("survival") if isinstance(summary.get("survival"), Mapping) else {}
    action_safety = summary.get("actionSafety") if isinstance(summary.get("actionSafety"), Mapping) else {}
    start_matrix = signal_contract.get("startMatrix") if isinstance(signal_contract.get("startMatrix"), Mapping) else {}
    start_survival = _number(start_matrix.get("avgStepsPerEpisode") or start_matrix.get("averageBotSurvival"))
    current_survival = _number(survival.get("avgStepsPerEpisodeObserved"))
    signal_rules = signal_contract.get("signalBooleans") if isinstance(signal_contract.get("signalBooleans"), Mapping) else {}
    death_rule = signal_rules.get("deathBefore60ImprovedBy20Pct") if isinstance(signal_rules.get("deathBefore60ImprovedBy20Pct"), Mapping) else {}
    death_threshold = _number(death_rule.get("requiredAtOrBelow"))
    death_share = _number(terminal.get("deathBefore60Share"))
    action_safety_green = all(
        float(action_safety.get(key) or 0.0) == 0.0
        for key in ("invalidActionRate", "sanitizerRate", "postDecodeClampRate")
    )
    progress_signal = reward.get("progressSignalNonZero") is True
    objective_signal = reward.get("objectiveSignalNonZero") is True
    natural_terminal = (_number(terminal.get("naturalTerminalShare")) or 0.0) > 0.0
    death_improved = death_share is not None and death_threshold is not None and death_share <= death_threshold
    survival_non_regression = (
        current_survival is not None and start_survival is not None and current_survival >= start_survival
    )
    technical_ok = first_run.get("technicalOk") is True and first_run.get("completedEpisodeGateOk") is True
    max_step_share = _number(terminal.get("maxStepEpisodeShare"))
    max_step_only = bool(
        max_step_share is not None
        and max_step_share >= 0.8
        and not progress_signal
        and not objective_signal
        and not natural_terminal
    )
    contract_signal = progress_signal or objective_signal or natural_terminal or death_improved
    longer_allowed_by_contract = bool(technical_ok and action_safety_green and contract_signal)
    require_survival_non_regression = bool(
        (config.get("escalationRules") or {}).get("requireAverageSurvivalNonRegressionForLongerRuns")
    )
    longer_allowed = bool(
        longer_allowed_by_contract
        and (survival_non_regression or not require_survival_non_regression)
        and not max_step_only
    )
    blocked_reasons = []
    if not technical_ok:
        blocked_reasons.append("20k technical or completed-episode gate not green")
    if not action_safety_green:
        blocked_reasons.append("action safety hard rates are not zero")
    if not contract_signal:
        blocked_reasons.append("no progress/objective/natural-terminal signal and no deathBefore60 improvement")
    if require_survival_non_regression and not survival_non_regression:
        blocked_reasons.append("avgStepsPerEpisodeObserved regressed against pinned start matrix")
    if max_step_only:
        blocked_reasons.append("max-step-only plateau is not a valid escalation signal")
    return {
        "technicalOk": technical_ok,
        "actionSafetyGreen": action_safety_green,
        "progressSignalNonZero": progress_signal,
        "objectiveSignalNonZero": objective_signal,
        "naturalTerminalSharePositive": natural_terminal,
        "deathBefore60ImprovedBy20Pct": death_improved,
        "deathBefore60Share": death_share,
        "deathBefore60RequiredAtOrBelow": death_threshold,
        "avgStepsPerEpisodeObserved": current_survival,
        "startAvgStepsPerEpisode": start_survival,
        "avgStepsNonRegression": survival_non_regression,
        "maxStepOnlyPlateau": max_step_only,
        "longerRunAllowedBySignalContract": longer_allowed_by_contract,
        "longerRunAllowed": longer_allowed,
        "blockedReasons": blocked_reasons,
    }


def build_report(*, config_path: Path, command: str) -> dict[str, Any]:
    config = _read_json(config_path)
    if config.get("blockId") != "BT93K" or config.get("phaseId") != "93K.6":
        raise RuntimeError(f"wrong BT93K.6 config scope: {_rel(config_path)}")
    artifacts = config.get("artifacts") if isinstance(config.get("artifacts"), Mapping) else {}
    signal_contract_path = _repo_path(str(artifacts["signalMetricContract"]))
    signal_contract = _read_json(signal_contract_path)
    start_matrix = signal_contract.get("startMatrix") if isinstance(signal_contract.get("startMatrix"), Mapping) else {}
    prerequisites = _prerequisite_status(config)
    if prerequisites["summary"]["allRequiredGreen"] is not True:
        raise RuntimeError("BT93K.6 is blocked by missing supervisor, signal, mode/map, env-scale, or metric-contract prerequisite")
    ladder = [_rung_from_config(entry) for entry in config["ladder"]]
    first_rung = ladder[0]
    first_run = _run_ladder_rung(
        rung=first_rung,
        config=config,
        config_path=config_path,
        command=command,
        start_matrix=start_matrix,
    )
    gates = _evaluate_ladder_gates(first_run=first_run, config=config, signal_contract=signal_contract)
    deferred = [
        {
            "id": rung.id,
            "phaseItem": rung.phase_item,
            "envCount": rung.env_count,
            "targetEnvSteps": rung.target_env_steps,
            "status": "blocked-by-20k-signal-gate" if not gates["longerRunAllowed"] else "ready-for-explicit-next-claim",
            "started": False,
            "blockedReasons": list(gates["blockedReasons"]),
        }
        for rung in ladder[1:]
    ]
    phase_coverage = {
        "93K.6.1": bool(first_run.get("ok") and first_run.get("runExitReport") and first_run.get("evalSnapshot")),
        "93K.6.2": bool(not gates["longerRunAllowed"]),
        "93K.6.3": bool(not gates["longerRunAllowed"]),
        "93K.6.4": bool(not gates["longerRunAllowed"]),
        "93K.6.5": bool(not gates["longerRunAllowed"]),
    }
    result_class = "ladder-blocked-after-20k-signal-smoke"
    if gates["longerRunAllowed"]:
        result_class = "ladder-next-rung-ready"
    if first_run.get("ok") is not True:
        result_class = "measurement-invalid"
    ok = bool(all(phase_coverage.values()) and first_run.get("ok") is True)
    report = {
        "schemaVersion": "bt93k-longrun-ladder-decision-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_longrun_ladder.py",
        "gitSha": _git_sha(),
        "ok": ok,
        "blockId": "BT93K",
        "phaseId": "93K.6",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "summary": {
            "firstRung": first_rung.id,
            "firstRungOk": first_run.get("ok") is True,
            "longerRunAllowed": gates["longerRunAllowed"],
            "blockedReasons": list(gates["blockedReasons"]),
            "nextAllowedStep": "93K.7 handover/BT94A gate discipline" if not gates["longerRunAllowed"] else "explicit BT93K follow-up claim before 50k/100k+ execution",
            "qualityClaimAllowed": False,
            "bt94aClaimAllowed": False,
        },
        "prerequisites": prerequisites,
        "signalGate": gates,
        "runs": [first_run],
        "deferredRungs": deferred,
        "sourceArtifacts": {
            "config": _source(config_path, "BT93K.6 longrun ladder config"),
            "signalMetricContract": _source(signal_contract_path, "BT93K.1 signal metric contract"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python Curvios env"),
            "actionSurface": _source(ACTION_SURFACE_PATH, "PPO action telemetry wrapper"),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "comparisonStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "holdoutUsed": False,
        },
        "commands": {
            "write": "python python/scripts/bt93k_longrun_ladder.py --write-report",
        },
    }
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    parser.add_argument("--output", default=str(REPORT_PATH))
    args = parser.parse_args()

    config_path = _repo_path(args.config)
    output = _repo_path(args.output)
    command = " ".join(sys.argv)
    report = build_report(config_path=config_path, command=command)
    if args.write_report:
        _write_json(output, report)
    print(json.dumps({
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "phaseCoverage": report["phaseCoverage"],
        "longerRunAllowed": report["signalGate"]["longerRunAllowed"],
        "blockedReasons": report["signalGate"]["blockedReasons"],
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
