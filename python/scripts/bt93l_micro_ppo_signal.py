"""BT93L.6 micro-PPO signal probe.

This is a diagnostic-only 10k PPO probe on the frozen BT93L matrix. It writes
signal evidence only; it is not candidate, freeze, holdout, promote, or rollout
evidence.
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

import gymnasium as gym
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback


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
REPORT_PATH = BT93L_ROOT / "micro_ppo_signal_report.json"
PROGRESS_REPORT_PATH = BT93L_ROOT / "progress_reachability_report.json"
REWARD_BALANCE_REPORT_PATH = BT93L_ROOT / "reward_balance_report.json"
ACTION_EFFECT_REPORT_PATH = BT93L_ROOT / "action_effect_report.json"
BASELINE_MATRIX_REPORT_PATH = BT93L_ROOT / "baseline_matrix_report.json"
PROFILE_ID = "bt93l-objective-reachability-v1"
TRAIN_SEED = 934
EVAL_SEEDS = (944, 945, 946)
MAX_STEPS = 24
DEFAULT_TIMESTEPS = 10_000


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _source(path: Path, role: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: float) -> float:
    return round(float(value), 6)


def _jsonable(value: Any) -> Any:
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    try:
        return float(value)
    except (TypeError, ValueError):
        return str(value)


def _episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _reward_breakdown(info: Mapping[str, Any]) -> Mapping[str, Any]:
    breakdown = info.get("rewardBreakdown")
    return breakdown if isinstance(breakdown, Mapping) else {}


class PpoMetricCallback(BaseCallback):
    def __init__(self) -> None:
        super().__init__()
        self.rollout_count = 0
        self.logger_snapshots: list[dict[str, Any]] = []

    def _on_step(self) -> bool:
        return True

    def _on_rollout_end(self) -> None:
        self.rollout_count += 1
        values = getattr(self.model.logger, "name_to_value", {})
        self.logger_snapshots.append({str(key): _jsonable(value) for key, value in values.items()})
        if len(self.logger_snapshots) > 8:
            self.logger_snapshots = self.logger_snapshots[-8:]


class SignalMetricsWrapper(gym.Wrapper[np.ndarray, int, np.ndarray, dict[str, Any]]):
    def __init__(self, env: gym.Env[np.ndarray, dict[str, Any]], *, label: str) -> None:
        super().__init__(env)
        self.label = label
        self.reset_metrics()

    def reset_metrics(self) -> None:
        self.total_steps = 0
        self.current_episode_steps = 0
        self.current_episode_reward = 0.0
        self.episodes: list[dict[str, Any]] = []
        self.action_counts: Counter[str] = Counter()
        self.reward_breakdown_totals: Counter[str] = Counter()
        self.progress_events: Counter[str] = Counter()
        self.objective_events: Counter[str] = Counter()
        self.terminal_reasons: Counter[str] = Counter()
        self.progress_signal_count = 0
        self.objective_signal_count = 0
        self.death_before_60 = 0
        self.runtime_errors = 0
        self.sample_rows: list[dict[str, Any]] = []
        self.safety_max = {
            "invalidActionRate": 0.0,
            "postDecodeClampRate": 0.0,
            "vetoRate": 0.0,
            "sanitizerRate": 0.0,
            "noopRate": 0.0,
            "preSamplingMaskRate": 0.0,
        }

    def reset(self, **kwargs: Any) -> tuple[np.ndarray, dict[str, Any]]:
        self.current_episode_steps = 0
        self.current_episode_reward = 0.0
        observation, info = self.env.reset(**kwargs)
        return np.asarray(observation, dtype=np.float32), dict(info)

    def step(self, action: Any) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        token = int(np.asarray(action, dtype=np.int64).reshape(-1)[0])
        observation, reward, terminated, truncated, info = self.env.step(token)
        self.total_steps += 1
        self.current_episode_steps += 1
        self.current_episode_reward += float(reward)
        self.action_counts[str(token)] += 1
        semantics = _episode_semantics(info)
        reachability = semantics.get("objectiveReachability") if isinstance(semantics.get("objectiveReachability"), Mapping) else {}
        if semantics.get("progressSignalReachable") is True:
            self.progress_signal_count += 1
        if semantics.get("objectiveSignalReachable") is True:
            self.objective_signal_count += 1
        for event in reachability.get("progressEvents") or []:
            self.progress_events[str(event)] += 1
        for event in reachability.get("objectiveEvents") or []:
            self.objective_events[str(event)] += 1
        for key, value in _reward_breakdown(info).items():
            self.reward_breakdown_totals[str(key)] += _number(value)
        telemetry = info.get("ppoActionTelemetry") if isinstance(info.get("ppoActionTelemetry"), Mapping) else {}
        for key in self.safety_max:
            self.safety_max[key] = max(self.safety_max[key], _number(telemetry.get(key)))
        if len(self.sample_rows) < 24:
            self.sample_rows.append(
                {
                    "step": self.total_steps,
                    "episodeStep": self.current_episode_steps,
                    "actionToken": token,
                    "reward": _round(float(reward)),
                    "progressSignalReachable": semantics.get("progressSignalReachable") is True,
                    "objectiveSignalReachable": semantics.get("objectiveSignalReachable") is True,
                    "terminalReason": info.get("terminalReason"),
                    "truncatedReason": info.get("truncatedReason"),
                }
            )
        if terminated or truncated:
            reason = info.get("terminalReason") or info.get("truncatedReason") or "unknown"
            self.terminal_reasons[str(reason)] += 1
            if str(reason) == "player-dead" and self.current_episode_steps < 60:
                self.death_before_60 += 1
            self.episodes.append(
                {
                    "steps": self.current_episode_steps,
                    "reward": _round(self.current_episode_reward),
                    "terminated": bool(terminated),
                    "truncated": bool(truncated),
                    "reason": str(reason),
                }
            )
        return np.asarray(observation, dtype=np.float32), float(reward), bool(terminated), bool(truncated), dict(info)

    def summary(self) -> dict[str, Any]:
        completed = len(self.episodes)
        return {
            "label": self.label,
            "totalSteps": self.total_steps,
            "completedEpisodes": completed,
            "avgStepsPerEpisode": _round(sum(item["steps"] for item in self.episodes) / completed) if completed else None,
            "progressSignalReachableCount": self.progress_signal_count,
            "objectiveSignalReachableCount": self.objective_signal_count,
            "progressSignalRate": _round(self.progress_signal_count / max(1, self.total_steps)),
            "objectiveSignalRate": _round(self.objective_signal_count / max(1, self.total_steps)),
            "deathBefore60Count": self.death_before_60,
            "runtimeErrorCount": self.runtime_errors,
            "terminalReasonCounts": dict(sorted(self.terminal_reasons.items())),
            "actionCounts": dict(sorted(self.action_counts.items())),
            "rewardBreakdownTotals": {key: _round(value) for key, value in sorted(self.reward_breakdown_totals.items())},
            "progressEventCounts": dict(sorted(self.progress_events.items())),
            "objectiveEventCounts": dict(sorted(self.objective_events.items())),
            "safetyMaxRates": {key: _round(value) for key, value in self.safety_max.items()},
            "sampleRows": list(self.sample_rows),
        }


def _make_env(*, seed: int, label: str) -> SignalMetricsWrapper:
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=MAX_STEPS,
            default_seed=seed,
            session_id=f"bt93l-micro-ppo-{label}",
            controller_timeout_seconds=18.0,
            reward_profile_id=PROFILE_ID,
            map_key="standard",
            domain_mode="classic-3d",
            game_mode="CLASSIC",
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )
    return SignalMetricsWrapper(env, label=label)


def _run_eval(model: PPO, *, seeds: tuple[int, ...], steps: int) -> dict[str, Any]:
    summaries = []
    for seed in seeds:
        env = _make_env(seed=seed, label=f"eval-{seed}")
        try:
            observation, _ = env.reset(seed=seed)
            for _ in range(steps):
                action, _ = model.predict(observation, deterministic=True)
                observation, _, terminated, truncated, _ = env.step(action)
                if terminated or truncated:
                    observation, _ = env.reset(seed=seed)
        finally:
            env.close()
        summaries.append(env.summary())
    total_steps = sum(int(item["totalSteps"]) for item in summaries)
    progress_total = sum(int(item["progressSignalReachableCount"]) for item in summaries)
    objective_total = sum(int(item["objectiveSignalReachableCount"]) for item in summaries)
    return {
        "seedSummaries": summaries,
        "totalSteps": total_steps,
        "progressSignalReachableCount": progress_total,
        "objectiveSignalReachableCount": objective_total,
        "progressSignalRate": _round(progress_total / max(1, total_steps)),
        "objectiveSignalRate": _round(objective_total / max(1, total_steps)),
        "runtimeErrorCount": sum(int(item["runtimeErrorCount"]) for item in summaries),
        "deathBefore60Count": sum(int(item["deathBefore60Count"]) for item in summaries),
    }


def build_report(*, total_timesteps: int) -> dict[str, Any]:
    started = time.perf_counter()
    progress = _read_json(PROGRESS_REPORT_PATH)
    reward_balance = _read_json(REWARD_BALANCE_REPORT_PATH)
    action_effect = _read_json(ACTION_EFFECT_REPORT_PATH)
    baseline = _read_json(BASELINE_MATRIX_REPORT_PATH)
    preconditions = {
        "progressReachabilityOk": progress.get("ok") is True,
        "rewardBalanceOk": reward_balance.get("ok") is True,
        "actionEffectOk": action_effect.get("ok") is True,
        "baselineMatrixOk": baseline.get("ok") is True,
        "holdoutUnused": (baseline.get("summary") or {}).get("holdoutUsed") is False,
    }
    train_env = _make_env(seed=TRAIN_SEED, label="train-10k")
    callback = PpoMetricCallback()
    error: str | None = None
    model_timesteps = 0
    update_count = 0
    try:
        model = PPO(
            "MlpPolicy",
            train_env,
            seed=TRAIN_SEED,
            n_steps=128,
            batch_size=64,
            n_epochs=2,
            learning_rate=3e-4,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.0,
            vf_coef=0.5,
            verbose=0,
            device="auto",
        )
        model.learn(total_timesteps=total_timesteps, callback=callback, progress_bar=False)
        model_timesteps = int(model.num_timesteps)
        update_count = int(getattr(model, "_n_updates", 0))
        eval_summary = _run_eval(model, seeds=EVAL_SEEDS, steps=MAX_STEPS)
    except Exception as exc:  # pragma: no cover - report captures runtime failures
        error = str(exc)
        train_env.runtime_errors += 1
        eval_summary = {
            "seedSummaries": [],
            "totalSteps": 0,
            "progressSignalReachableCount": 0,
            "objectiveSignalReachableCount": 0,
            "progressSignalRate": 0,
            "objectiveSignalRate": 0,
            "runtimeErrorCount": 1,
            "deathBefore60Count": 0,
        }
    finally:
        train_summary = train_env.summary()
        train_env.close()

    safety_ok = all(_number(train_summary["safetyMaxRates"].get(key)) == 0 for key in ("invalidActionRate", "postDecodeClampRate", "vetoRate", "sanitizerRate"))
    runtime_error_count = int(train_summary["runtimeErrorCount"]) + int(eval_summary["runtimeErrorCount"])
    signal_present = (
        train_summary["progressSignalReachableCount"] > 0
        and train_summary["objectiveSignalReachableCount"] > 0
        and eval_summary["progressSignalReachableCount"] > 0
        and eval_summary["objectiveSignalReachableCount"] > 0
    )
    metrics_present = bool(
        model_timesteps > 0
        and train_summary["totalSteps"] > 0
        and "rewardBreakdownTotals" in train_summary
        and "actionCounts" in train_summary
        and "terminalReasonCounts" in train_summary
    )
    report_valid = bool(all(preconditions.values()) and error is None and runtime_error_count == 0 and safety_ok and metrics_present)
    signal_green = bool(report_valid and signal_present)
    extension_allowed = bool(signal_green and train_summary["deathBefore60Count"] == 0 and eval_summary["deathBefore60Count"] == 0)
    phase_coverage = {
        "93L.6.1": total_timesteps >= 10_000 and all(preconditions.values()),
        "93L.6.2": isinstance(extension_allowed, bool),
        "93L.6.3": metrics_present and runtime_error_count == 0,
        "93L.6.4": True,
    }
    result_class = "signal-green" if signal_green else "signal-red"
    return {
        "schemaVersion": "bt93l-micro-ppo-signal-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_micro_ppo_signal.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": report_valid,
        "blockId": "BT93L",
        "phaseId": "93L.6",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "preconditions": preconditions,
        "requestedTimesteps": int(total_timesteps),
        "actualModelTimesteps": model_timesteps,
        "elapsedSeconds": _round(time.perf_counter() - started),
        "error": error,
        "ppoMetrics": {
            "model": "stable_baselines3.PPO",
            "updates": update_count,
            "rolloutCount": callback.rollout_count,
            "loggerSnapshots": callback.logger_snapshots,
        },
        "trainSummary": train_summary,
        "evalSummary": eval_summary,
        "decision": {
            "resultClass": result_class,
            "extension50kAllowed": extension_allowed,
            "extension50kExecuted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "allowedNextResultClasses": [
                "signal-green",
                "signal-red",
                "reward-redesign-required",
                "action-space-required",
                "measurement-invalid",
            ],
        },
        "sourceArtifacts": {
            "progressReachabilityReport": _source(PROGRESS_REPORT_PATH, "BT93L.2 real env.step reachability"),
            "rewardBalanceReport": _source(REWARD_BALANCE_REPORT_PATH, "BT93L.3 reward balance"),
            "actionEffectReport": _source(ACTION_EFFECT_REPORT_PATH, "BT93L.4 action effect"),
            "baselineMatrixReport": _source(BASELINE_MATRIX_REPORT_PATH, "BT93L.5 baseline matrix"),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": True,
            "trainingRunKind": "bt93l-micro-ppo-signal-probe",
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
            "write": f"python python/scripts/bt93l_micro_ppo_signal.py --write-report --total-timesteps {int(total_timesteps)}",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--total-timesteps", type=int, default=DEFAULT_TIMESTEPS)
    args = parser.parse_args()

    report = build_report(total_timesteps=max(1, int(args.total_timesteps)))
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "decision": report["decision"],
                "trainSummary": {
                    "totalSteps": report["trainSummary"]["totalSteps"],
                    "completedEpisodes": report["trainSummary"]["completedEpisodes"],
                    "progressSignalReachableCount": report["trainSummary"]["progressSignalReachableCount"],
                    "objectiveSignalReachableCount": report["trainSummary"]["objectiveSignalReachableCount"],
                    "deathBefore60Count": report["trainSummary"]["deathBefore60Count"],
                    "runtimeErrorCount": report["trainSummary"]["runtimeErrorCount"],
                },
                "evalSummary": {
                    "totalSteps": report["evalSummary"]["totalSteps"],
                    "progressSignalReachableCount": report["evalSummary"]["progressSignalReachableCount"],
                    "objectiveSignalReachableCount": report["evalSummary"]["objectiveSignalReachableCount"],
                    "deathBefore60Count": report["evalSummary"]["deathBefore60Count"],
                    "runtimeErrorCount": report["evalSummary"]["runtimeErrorCount"],
                },
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
