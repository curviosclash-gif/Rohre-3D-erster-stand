"""BT93L.2 progress/objective reachability report.

The report runs a small diagnostic-only CurviosEnv smoke. It proves whether
the real env.step path emits progress/objective reward signals without manual
progressEvent injection.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

import numpy as np


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    make_curvios_action_wrapper,
)


BT93L_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93l"
REPORT_PATH = BT93L_ROOT / "progress_reachability_report.json"
TASK_CONTRACT_PATH = BT93L_ROOT / "task_metric_contract.json"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
PROFILE_ID = "bt93l-objective-reachability-v1"
POSITIVE_CONTROL_ACTIONS = (8, 5, 4, 8, 6, 1, 4, 0, 0, 5, 6, 0)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result else None


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _file_contains(path: Path, *tokens: str) -> bool:
    if not path.is_file():
        return False
    text = path.read_text(encoding="utf-8")
    return all(token in text for token in tokens)


def _extract_effective_environment(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    effective = info.get("effectiveEnvironment")
    if isinstance(effective, Mapping):
        return effective
    effective = metadata.get("effectiveEnvironment")
    return effective if isinstance(effective, Mapping) else {}


def _extract_episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _minimal_row(index: int, action_token: int, reward: float, terminated: bool, truncated: bool, info: Mapping[str, Any]) -> dict[str, Any]:
    reward_breakdown = info.get("rewardBreakdown") if isinstance(info.get("rewardBreakdown"), Mapping) else {}
    semantics = _extract_episode_semantics(info)
    reachability = semantics.get("objectiveReachability") if isinstance(semantics.get("objectiveReachability"), Mapping) else {}
    return {
        "index": int(index),
        "actionToken": int(action_token),
        "reward": round(float(reward), 6),
        "terminated": bool(terminated),
        "truncated": bool(truncated),
        "terminalReason": info.get("terminalReason"),
        "truncatedReason": info.get("truncatedReason"),
        "effectiveEnvironment": dict(_extract_effective_environment(info)),
        "episodeSemantics": {
            "manualProgressEvent": semantics.get("manualProgressEvent"),
            "progressEventReachable": semantics.get("progressEventReachable"),
            "realEnvStepPath": semantics.get("realEnvStepPath"),
            "actionActiveForObjectiveSignal": semantics.get("actionActiveForObjectiveSignal"),
            "progressSignalSource": semantics.get("progressSignalSource"),
            "objectiveSignalSource": semantics.get("objectiveSignalSource"),
            "progressSignalReachable": semantics.get("progressSignalReachable"),
            "objectiveSignalReachable": semantics.get("objectiveSignalReachable"),
            "progressSignalReported": semantics.get("progressSignalReported"),
            "checkpointReachedSignal": semantics.get("checkpointReachedSignal"),
            "done": semantics.get("done"),
            "truncated": semantics.get("truncated"),
        },
        "objectiveReachability": {
            "source": reachability.get("source"),
            "progressEvents": list(reachability.get("progressEvents") or []),
            "objectiveEvents": list(reachability.get("objectiveEvents") or []),
            "deltas": dict(reachability.get("deltas") or {}),
            "metrics": dict(reachability.get("metrics") or {}),
        },
        "rewardBreakdown": dict(reward_breakdown),
    }


def _action_for_policy(policy: str, step_index: int, rng: np.random.Generator) -> int:
    if policy == "noop-control":
        return 0
    if policy == "random-control":
        return int(rng.integers(0, 9))
    return int(POSITIVE_CONTROL_ACTIONS[step_index % len(POSITIVE_CONTROL_ACTIONS)])


def _run_control(*, label: str, policy: str, seed: int, steps: int) -> dict[str, Any]:
    started = time.perf_counter()
    rng = np.random.default_rng(seed)
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max(steps + 2, 12),
            default_seed=seed,
            session_id=f"bt93l-progress-reachability-{label}",
            controller_timeout_seconds=18.0,
            reward_profile_id=PROFILE_ID,
            map_key="standard",
            domain_mode="classic-3d",
            game_mode="CLASSIC",
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )
    rows: list[dict[str, Any]] = []
    reset_info: Mapping[str, Any] | None = None
    diagnostics: Mapping[str, Any] = {}
    error: str | None = None
    try:
        _, reset_info = env.reset(seed=seed)
        for step_index in range(steps):
            action_token = _action_for_policy(policy, step_index, rng)
            _, reward, terminated, truncated, info = env.step(action_token)
            rows.append(_minimal_row(step_index, action_token, reward, terminated, truncated, info))
            if terminated or truncated:
                break
        diagnostics = env.env.get_diagnostics()
    except Exception as exc:  # pragma: no cover - captured in report
        error = str(exc)
    finally:
        env.close()
    return {
        "ok": bool(rows) and error is None,
        "label": label,
        "policy": policy,
        "seed": int(seed),
        "requestedSteps": int(steps),
        "observedSteps": len(rows),
        "elapsedSeconds": round(time.perf_counter() - started, 3),
        "error": error,
        "resetEffectiveEnvironment": dict(_extract_effective_environment(reset_info or {})),
        "rows": rows,
        "diagnostics": {
            "bridgeTelemetry": (diagnostics.get("bridgeTelemetry") or {}) if isinstance(diagnostics, Mapping) else {},
            "messageCounts": ((diagnostics.get("stats") or {}).get("messageCounts") or {}) if isinstance(diagnostics, Mapping) else {},
        },
    }


def _summarize_control(control: Mapping[str, Any]) -> dict[str, Any]:
    rows = [row for row in control.get("rows") or [] if isinstance(row, Mapping)]
    event_counts: Counter[str] = Counter()
    source_counts: Counter[str] = Counter()
    reward_totals: Counter[str] = Counter()
    real_env_step_count = 0
    manual_count = 0
    progress_count = 0
    objective_count = 0
    reported_count = 0
    checkpoint_signal_total = 0.0

    for row in rows:
        semantics = row.get("episodeSemantics") if isinstance(row.get("episodeSemantics"), Mapping) else {}
        reachability = row.get("objectiveReachability") if isinstance(row.get("objectiveReachability"), Mapping) else {}
        if semantics.get("realEnvStepPath") is True:
            real_env_step_count += 1
        if semantics.get("manualProgressEvent") is True or semantics.get("progressEventReachable") is True:
            manual_count += 1
        if semantics.get("progressSignalReachable") is True:
            progress_count += 1
        if semantics.get("objectiveSignalReachable") is True:
            objective_count += 1
        if semantics.get("progressSignalReported") is True:
            reported_count += 1
        signal = _number(semantics.get("checkpointReachedSignal"))
        if signal is not None:
            checkpoint_signal_total += signal
        source = semantics.get("progressSignalSource")
        if source:
            source_counts[str(source)] += 1
        for event in reachability.get("progressEvents") or []:
            event_counts[str(event)] += 1
        reward_breakdown = row.get("rewardBreakdown") if isinstance(row.get("rewardBreakdown"), Mapping) else {}
        for key, value in reward_breakdown.items():
            number = _number(value)
            if number is not None:
                reward_totals[str(key)] += number

    progress_reward = round(float(reward_totals.get("checkpointReached", 0.0) + reward_totals.get("parcoursCompleted", 0.0)), 6)
    objective_reward = round(progress_reward + float(reward_totals.get("kill", 0.0) + reward_totals.get("win", 0.0)), 6)
    return {
        "observedSteps": len(rows),
        "realEnvStepPathCount": int(real_env_step_count),
        "manualProgressEventCount": int(manual_count),
        "progressSignalReachableCount": int(progress_count),
        "objectiveSignalReachableCount": int(objective_count),
        "progressSignalReportedCount": int(reported_count),
        "checkpointReachedSignalTotal": round(checkpoint_signal_total, 6),
        "progressReward": progress_reward,
        "objectiveReward": objective_reward,
        "sourceCounts": dict(sorted(source_counts.items())),
        "progressEventCounts": dict(sorted(event_counts.items())),
        "rewardBreakdownTotals": {key: round(float(value), 6) for key, value in sorted(reward_totals.items())},
    }


def _source_checks() -> dict[str, bool]:
    return {
        "legacyManualProgressEventSeparated": _file_contains(
            HEADLESS_RUNNER_PATH,
            "progressEvent: input.progressEvent === true",
            "manualProgressEvent",
            "manual-injection-counterprobe",
        ),
        "runnerDefinesRealObservationDeltaSource": _file_contains(
            HEADLESS_RUNNER_PATH,
            "deriveHeadlessObjectiveReachabilitySignals",
            "runtime-observation-delta",
            "previousObjectiveObservation",
        ),
        "runnerFeedsRealSignalsIntoReward": _file_contains(
            HEADLESS_RUNNER_PATH,
            "objectiveReachability?.progressSignalReachable",
            "objectiveReachability?.objectiveSignalReachable",
            "checkpointReached",
        ),
        "pythonEnvUsesRealControllerStep": _file_contains(
            CURVIOS_ENV_PATH,
            "self._sidecar.queue_action",
            'self._controller.request("step"',
            "validate_transition_payload",
        ),
        "semanticActionSurfaceUsed": _file_contains(
            ACTION_SURFACE_PATH,
            "PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID",
            "MASKED_SEMANTIC_ACTIONS",
            "decode_masked_semantic_action",
        ),
    }


def build_report(*, steps: int, seed: int) -> dict[str, Any]:
    controls = [
        _run_control(label="positive-control", policy="positive-control", seed=seed, steps=steps),
        _run_control(label="noop-control", policy="noop-control", seed=seed + 1, steps=steps),
        _run_control(label="random-control", policy="random-control", seed=seed + 2, steps=steps),
    ]
    summaries = {str(control["label"]): _summarize_control(control) for control in controls}
    source_checks = _source_checks()
    positive = summaries["positive-control"]
    noop = summaries["noop-control"]
    random_control = summaries["random-control"]
    positive_green = (
        controls[0]["ok"] is True
        and positive["realEnvStepPathCount"] > 0
        and positive["manualProgressEventCount"] == 0
        and positive["progressSignalReachableCount"] > 0
        and positive["objectiveSignalReachableCount"] > 0
        and positive["progressReward"] > 0
    )
    noop_clean = (
        controls[1]["ok"] is True
        and noop["manualProgressEventCount"] == 0
        and noop["progressReward"] <= 0
        and noop["objectiveReward"] <= 0
    )
    random_recorded = controls[2]["ok"] is True and random_control["observedSteps"] > 0
    real_path_green = bool(
        source_checks["runnerDefinesRealObservationDeltaSource"]
        and source_checks["runnerFeedsRealSignalsIntoReward"]
        and positive_green
    )
    phase_coverage = {
        "93L.2.1": bool(source_checks["legacyManualProgressEventSeparated"]),
        "93L.2.2": bool(real_path_green),
        "93L.2.3": bool(positive_green and noop_clean and random_recorded),
        "93L.2.4": bool(positive_green and positive["realEnvStepPathCount"] > 0),
    }
    ok = all(phase_coverage.values())
    return {
        "schemaVersion": "bt93l-progress-reachability-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_progress_reachability.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": ok,
        "blockId": "BT93L",
        "phaseId": "93L.2",
        "resultClass": "progress-reachability-green" if ok else "progress-reachability-red",
        "rewardProfileId": PROFILE_ID,
        "actionSurfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "phaseCoverage": phase_coverage,
        "summary": {
            "progressSignalReachable": positive["progressSignalReachableCount"] > 0,
            "objectiveSignalReachable": positive["objectiveSignalReachableCount"] > 0,
            "realEnvStepPath": positive["realEnvStepPathCount"] > 0,
            "manualInjectionUsedAsEvidence": False,
            "positiveControlGreen": positive_green,
            "noopControlClean": noop_clean,
            "randomControlRecorded": random_recorded,
            "trainingStartBlockedByMissing93L2Signals": not positive_green,
            "microPpoStillBlockedUntil93L3": True,
        },
        "controlSummaries": summaries,
        "controls": controls,
        "sourceChecks": source_checks,
        "sourceArtifacts": {
            "taskMetricContract": _source(TASK_CONTRACT_PATH, "BT93L.1 pinned task and metric contract"),
            "headlessRunner": _source(HEADLESS_RUNNER_PATH, "real JS headless runner path"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python env.step bridge"),
            "actionSurface": _source(ACTION_SURFACE_PATH, "masked semantic action surface"),
        },
        "contractState": {
            "taskMetricContractOk": _read_json(TASK_CONTRACT_PATH).get("ok"),
            "taskMetricContractPhase": _read_json(TASK_CONTRACT_PATH).get("phaseId"),
            "taskMetricContractSha256": _sha256_file(TASK_CONTRACT_PATH),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "baselineRun": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93l_progress_reachability.py --write-report",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--steps", type=int, default=12)
    parser.add_argument("--seed", type=int, default=9321)
    args = parser.parse_args()

    report = build_report(steps=max(1, int(args.steps)), seed=int(args.seed))
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(json.dumps({
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "phaseCoverage": report["phaseCoverage"],
        "summary": report["summary"],
        "output": _rel(output),
    }, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
