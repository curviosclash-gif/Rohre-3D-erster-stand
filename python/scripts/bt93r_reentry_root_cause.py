"""BT93RR.2 collapse root-cause report for BT93R-Reentry.

This diagnostic separates deterministic eval, stochastic eval, and train-mode
sampling on the same matrix/seeds. It does not train, update weights, apply a
fix, consume holdout data, create candidates, or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from statistics import mean, median, pstdev
from typing import Any, Iterable, Mapping, Sequence

import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.utils import obs_as_tensor
from stable_baselines3.common.vec_env import VecNormalize


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.ppo_action_surface import MASKED_SEMANTIC_ACTIONS  # noqa: E402
from scripts.bt93n_micro_ppo_repeat import _combine_eval_summaries  # noqa: E402
from scripts.bt93y_retrain_lineage import _build_vec_env  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93R_REENTRY_ROOT = PPO_ROOT / "bt93r_reentry"
BT93Y_ROOT = PPO_ROOT / "bt93y"
PACKAGE_ROOT = BT93Y_ROOT / "retrain_lineage" / "bt93y-retrain-lineage-v1"

ARTIFACT_PROBE_PATH = BT93R_REENTRY_ROOT / "bt93r_reentry_artifact_probe_report.json"
HANDOVER_LOCK_PATH = BT93R_REENTRY_ROOT / "bt93r_reentry_handover_lock_report.json"
OUTPUT_PATH = BT93R_REENTRY_ROOT / "bt93r_reentry_root_cause_report.json"

CONFIG_PATH = PACKAGE_ROOT / "config.json"
MODEL_PATH = PACKAGE_ROOT / "model.zip"
VECNORMALIZE_PATH = PACKAGE_ROOT / "vecnormalize.pkl"
TRAINING_REPORT_PATH = PACKAGE_ROOT / "training_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

DEFAULT_SEEDS = (944, 945, 946)
DEFAULT_STEPS_PER_SEED = 64

ROOT_CAUSES = {
    "eval-argmax-collapse",
    "decoder-bug",
    "normalize-mismatch",
    "reward-pressure-collapse",
    "action-selection-blindness",
    "entropy-config-collapse",
    "reward-scale-collapse",
    "rollout-bootstrap-drift",
    "action-repeat-or-seed-correlation",
    "truncation-terminal-bias",
    "policy-collapse-active",
    "policy-evidence-invalid",
    "measurement-invalid",
}

BLOCKED_ACTIONS = [
    "BT93S claim before BT93R-Reentry.99 in R-Allowlist",
    "BT93O claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "reward/action/telemetry/safety fix during 93RR.2",
]

SOURCE_PATHS: dict[str, tuple[Path, str]] = {
    "bt93rrHandoverLock": (HANDOVER_LOCK_PATH, "BT93RR.1 handover lock"),
    "bt93rrArtifactProbe": (ARTIFACT_PROBE_PATH, "BT93RR.1 artifact probe"),
    "bt93yConfig": (CONFIG_PATH, "BT93Y retrain-lineage config"),
    "bt93yModel": (MODEL_PATH, "BT93Y retrain-lineage model"),
    "bt93yVecNormalize": (VECNORMALIZE_PATH, "BT93Y retrain-lineage VecNormalize"),
    "bt93yTrainingReport": (TRAINING_REPORT_PATH, "BT93Y retrain-lineage training report"),
    "ppoActionSurface": (ACTION_SURFACE_PATH, "current PPO action-surface source"),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(args: list[str]) -> list[str]:
    return [line.strip().replace("\\", "/") for line in _git_output(args).splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path | None]) -> set[str]:
    rel_paths = [_rel(path) for path in paths if path is not None]
    rel_paths = [path for path in rel_paths if path]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any, digits: int = 6) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return round(number, digits)


def _stats(values: Sequence[Any]) -> dict[str, Any]:
    numbers = [float(value) for value in values if _round(value) is not None]
    if not numbers:
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None, "std": None}
    return {
        "count": len(numbers),
        "min": _round(min(numbers)),
        "max": _round(max(numbers)),
        "mean": _round(mean(numbers)),
        "median": _round(median(numbers)),
        "std": _round(pstdev(numbers)) if len(numbers) > 1 else 0.0,
    }


def _semantic_names() -> list[str]:
    return [name for name, _patch in MASKED_SEMANTIC_ACTIONS]


def _action_name(token: str | int | None, actions: Sequence[str]) -> str | None:
    if token is None:
        return None
    try:
        index = int(token)
    except (TypeError, ValueError):
        return str(token)
    return actions[index] if 0 <= index < len(actions) else f"unknown-{index}"


def _distribution(action_counts: Mapping[str, Any], actions: Sequence[str]) -> dict[str, Any]:
    counts = {str(token): int(value) for token, value in action_counts.items()}
    for index in range(len(actions)):
        counts.setdefault(str(index), 0)
    total = sum(counts.values())
    probabilities = {
        token: (count / total if total else 0.0)
        for token, count in sorted(counts.items(), key=lambda item: int(item[0]))
    }
    entropy = -sum(probability * math.log(probability) for probability in probabilities.values() if probability > 0)
    max_entropy = math.log(max(1, len(actions)))
    ranked = sorted(counts.items(), key=lambda item: (-item[1], int(item[0])))
    top = ranked[0] if ranked else (None, 0)
    second = ranked[1] if len(ranked) > 1 else (None, 0)
    return {
        "counts": {token: count for token, count in sorted(counts.items(), key=lambda item: int(item[0])) if count > 0},
        "total": total,
        "probabilities": {token: _round(value) for token, value in probabilities.items()},
        "entropy": _round(entropy),
        "normalizedEntropy": _round(entropy / max_entropy if max_entropy else 0.0),
        "argmaxToken": top[0],
        "argmaxAction": _action_name(top[0], actions),
        "argmaxCount": top[1],
        "argmaxShare": _round(top[1] / total if total else 0.0),
        "secondBestToken": second[0],
        "secondBestAction": _action_name(second[0], actions),
        "secondBestCount": second[1],
        "secondBestShare": _round(second[1] / total if total else 0.0),
        "marginShare": _round((top[1] - second[1]) / total if total else 0.0),
        "rankedActions": [
            {
                "token": token,
                "semanticAction": _action_name(token, actions),
                "count": count,
                "share": _round(count / total if total else 0.0),
            }
            for token, count in ranked
            if count > 0
        ],
    }


def _categorical_kl(previous: np.ndarray | None, current: np.ndarray | None) -> float | None:
    if previous is None or current is None:
        return None
    epsilon = 1e-12
    p = np.clip(previous.astype(np.float64), epsilon, 1.0)
    q = np.clip(current.astype(np.float64), epsilon, 1.0)
    return float(np.sum(p * (np.log(p) - np.log(q))))


def _distribution_snapshot(model: PPO, obs: np.ndarray) -> dict[str, Any]:
    actions = _semantic_names()
    with torch.no_grad():
        obs_tensor = obs_as_tensor(obs, model.device)
        distribution = model.policy.get_distribution(obs_tensor).distribution
        probs = distribution.probs.detach().cpu().numpy()[0]
        logits = getattr(distribution, "logits", None)
        entropy = distribution.entropy().detach().cpu().numpy()[0]
        value = model.policy.predict_values(obs_tensor).detach().cpu().numpy().reshape(-1)[0]
    ranked_indices = list(np.argsort(probs)[::-1])
    ranked = [
        {
            "token": int(index),
            "semanticAction": actions[index] if index < len(actions) else f"unknown-{index}",
            "probability": _round(probs[index]),
            "logit": _round(logits.detach().cpu().numpy()[0][index]) if logits is not None else None,
        }
        for index in ranked_indices
    ]
    max_entropy = math.log(max(1, len(actions)))
    return {
        "entropy": _round(entropy),
        "normalizedEntropy": _round(float(entropy) / max_entropy if max_entropy else 0.0),
        "valueEstimate": _round(value),
        "argmaxToken": ranked[0]["token"] if ranked else None,
        "argmaxAction": ranked[0]["semanticAction"] if ranked else None,
        "argmaxProbability": ranked[0]["probability"] if ranked else None,
        "secondBestToken": ranked[1]["token"] if len(ranked) > 1 else None,
        "secondBestAction": ranked[1]["semanticAction"] if len(ranked) > 1 else None,
        "secondBestProbability": ranked[1]["probability"] if len(ranked) > 1 else None,
        "argmaxMargin": _round(float(probs[ranked_indices[0]]) - float(probs[ranked_indices[1]]) if len(ranked_indices) > 1 else 0.0),
        "probabilities": {str(index): _round(value) for index, value in enumerate(probs)},
        "rankedActions": ranked[:5],
        "_rawProbs": probs,
        "_rawValue": float(value),
    }


def _source_artifact(key: str, path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "sourceKey": key,
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "trainSamplingOnlyNoOptimizerUpdate": True,
        "newEvalRunStarted": True,
        "fixApplied": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "bt93sClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "qualityClaimAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "bt95HandoffSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
    }


def _claim_flags() -> dict[str, bool]:
    return {
        "bt93sClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
    }


def _compact_summary(summary: Mapping[str, Any]) -> dict[str, Any]:
    compact = dict(summary)
    rows = compact.get("sampleRows")
    if isinstance(rows, list):
        compact["sampleRows"] = rows[:8]
        compact["sampleRowsTruncated"] = max(0, len(rows) - 8)
    return compact


def _run_mode(
    *,
    model: PPO,
    mode_id: str,
    deterministic: bool,
    vecnormalize_training: bool,
    seeds: Sequence[int],
    steps_per_seed: int,
    max_steps: int,
    reward_profile_id: str,
    gamma: float,
) -> dict[str, Any]:
    actions = _semantic_names()
    seed_reports: list[dict[str, Any]] = []
    for seed in seeds:
        vec_env: VecNormalize | None = None
        action_counts: Counter[str] = Counter()
        action_sequence: list[int] = []
        entropies: list[float] = []
        normalized_entropies: list[float] = []
        argmax_margins: list[float] = []
        action_probabilities: list[float] = []
        value_estimates: list[float] = []
        advantage_proxy: list[float] = []
        policy_kl_by_step: list[float] = []
        snapshots: list[dict[str, Any]] = []
        previous_probs: np.ndarray | None = None
        error: str | None = None

        try:
            vec_env, metric_env = _build_vec_env(
                seed=int(seed),
                label=f"rr2-{mode_id}-{seed}",
                max_steps=max_steps,
                reward_profile_id=reward_profile_id,
                training=vecnormalize_training,
                vecnormalize_source=VECNORMALIZE_PATH,
            )
            model.set_env(vec_env, force_reset=False)
            obs = vec_env.reset()
            for step_index in range(int(steps_per_seed)):
                before = _distribution_snapshot(model, obs)
                raw_probs = before.pop("_rawProbs")
                value = float(before.pop("_rawValue"))
                action, _state = model.predict(obs, deterministic=deterministic)
                token = int(np.asarray(action).reshape(-1)[0])
                action_counts[str(token)] += 1
                action_sequence.append(token)
                entropies.append(_number(before.get("entropy")))
                normalized_entropies.append(_number(before.get("normalizedEntropy")))
                argmax_margins.append(_number(before.get("argmaxMargin")))
                action_probabilities.append(float(raw_probs[token]) if 0 <= token < len(raw_probs) else 0.0)
                value_estimates.append(value)
                kl_value = _categorical_kl(previous_probs, raw_probs)
                if kl_value is not None:
                    policy_kl_by_step.append(kl_value)
                previous_probs = raw_probs

                next_obs, rewards, dones, _infos = vec_env.step(action)
                done = bool(np.asarray(dones).reshape(-1)[0])
                reward = float(np.asarray(rewards).reshape(-1)[0])
                next_value = 0.0
                if not done:
                    next_snapshot = _distribution_snapshot(model, next_obs)
                    next_value = float(next_snapshot.pop("_rawValue"))
                advantage_proxy.append(reward + (gamma * next_value if not done else 0.0) - value)
                if len(snapshots) < 4:
                    snapshots.append(
                        {
                            "stepIndex": step_index,
                            "selectedActionToken": token,
                            "selectedAction": actions[token] if 0 <= token < len(actions) else f"unknown-{token}",
                            "selectedActionProbability": _round(raw_probs[token]) if 0 <= token < len(raw_probs) else None,
                            **before,
                        }
                    )
                obs = next_obs
            summary = _compact_summary(metric_env.summary())
        except Exception as exc:  # pragma: no cover - diagnostic report path
            error = f"{exc.__class__.__name__}: {exc}"
            summary = {}
        finally:
            if vec_env is not None:
                vec_env.close()

        max_streak_action: int | None = None
        max_streak = 0
        current_action: int | None = None
        current_streak = 0
        for token in action_sequence:
            if token == current_action:
                current_streak += 1
            else:
                current_action = token
                current_streak = 1
            if current_streak > max_streak:
                max_streak = current_streak
                max_streak_action = token

        distribution = _distribution(action_counts, actions)
        seed_reports.append(
            {
                "seed": int(seed),
                "modeId": mode_id,
                "deterministicPolicyPredict": bool(deterministic),
                "vecNormalizeTraining": bool(vecnormalize_training),
                "requestedSteps": int(steps_per_seed),
                "error": error,
                "summary": summary,
                "actionDistribution": distribution,
                "repeatedActionStreak": {
                    "maxLength": int(max_streak),
                    "semanticAction": _action_name(max_streak_action, actions),
                    "token": max_streak_action,
                    "shareOfProbe": _round(max_streak / max(1, len(action_sequence))),
                },
                "policyDistributionStats": {
                    "entropy": _stats(entropies),
                    "normalizedEntropy": _stats(normalized_entropies),
                    "argmaxMargin": _stats(argmax_margins),
                    "selectedActionProbability": _stats(action_probabilities),
                    "valueEstimate": _stats(value_estimates),
                    "observationStepKl": _stats(policy_kl_by_step),
                    "advantageProxy": _stats(advantage_proxy),
                    "advantageProxySource": "one-step reward + gamma * next_value - value over diagnostic env steps; no optimizer update.",
                },
                "distributionSnapshots": snapshots,
            }
        )

    combined_summary = _combine_eval_summaries(
        [report["summary"] for report in seed_reports if isinstance(report.get("summary"), Mapping)]
    )
    combined_counts: Counter[str] = Counter()
    for report in seed_reports:
        counts = report.get("actionDistribution", {}).get("counts") if isinstance(report.get("actionDistribution"), Mapping) else {}
        for token, count in (counts or {}).items():
            combined_counts[str(token)] += int(count)

    return {
        "modeId": mode_id,
        "deterministicPolicyPredict": bool(deterministic),
        "vecNormalizeTraining": bool(vecnormalize_training),
        "stepsPerSeed": int(steps_per_seed),
        "seedReports": seed_reports,
        "combinedSummary": combined_summary,
        "combinedActionDistribution": _distribution(combined_counts, actions),
        "maxSeedTopActionShare": max(
            (_number(report.get("actionDistribution", {}).get("argmaxShare")) for report in seed_reports),
            default=0.0,
        ),
        "maxRepeatedActionStreak": max(
            (int(report.get("repeatedActionStreak", {}).get("maxLength") or 0) for report in seed_reports),
            default=0,
        ),
        "runtimeErrorCount": int(combined_summary.get("runtimeErrorCount") or 0),
        "errors": [report["error"] for report in seed_reports if report.get("error")],
    }


def _training_logger_metrics(training_report: Mapping[str, Any]) -> dict[str, Any]:
    snapshots = training_report.get("callback", {}).get("loggerSnapshots") if isinstance(training_report.get("callback"), Mapping) else []
    snapshots = [item for item in snapshots if isinstance(item, Mapping)] if isinstance(snapshots, list) else []
    last = snapshots[-1] if snapshots else {}
    return {
        "source": _rel(TRAINING_REPORT_PATH),
        "snapshotCount": len(snapshots),
        "latest": {
            "approx_kl": _round(last.get("train/approx_kl")),
            "value_loss": _round(last.get("train/value_loss")),
            "entropy_loss": _round(last.get("train/entropy_loss")),
            "policy_gradient_loss": _round(last.get("train/policy_gradient_loss")),
            "clip_fraction": _round(last.get("train/clip_fraction")),
            "explained_variance": _round(last.get("train/explained_variance")),
            "n_updates": last.get("train/n_updates"),
        },
        "history": [
            {
                "approx_kl": _round(item.get("train/approx_kl")),
                "value_loss": _round(item.get("train/value_loss")),
                "entropy_loss": _round(item.get("train/entropy_loss")),
                "n_updates": item.get("train/n_updates"),
            }
            for item in snapshots
            if "train/n_updates" in item
        ],
    }


def _root_cause(
    *,
    artifact_probe: Mapping[str, Any],
    modes: Mapping[str, Mapping[str, Any]],
    training_metrics: Mapping[str, Any],
    action_surface_matches: bool,
) -> dict[str, Any]:
    deterministic = modes["deterministic-eval"]
    stochastic = modes["stochastic-eval"]
    train_sampling = modes["train-sampling"]
    det_top = _number(deterministic.get("maxSeedTopActionShare"))
    stoch_top = _number(stochastic.get("maxSeedTopActionShare"))
    train_top = _number(train_sampling.get("maxSeedTopActionShare"))
    det_streak = int(deterministic.get("maxRepeatedActionStreak") or 0)
    stoch_streak = int(stochastic.get("maxRepeatedActionStreak") or 0)

    det_margins = [
        _number(report.get("policyDistributionStats", {}).get("argmaxMargin", {}).get("median"))
        for report in deterministic.get("seedReports", [])
        if isinstance(report, Mapping)
    ]
    det_entropy = [
        _number(report.get("policyDistributionStats", {}).get("normalizedEntropy", {}).get("median"))
        for report in deterministic.get("seedReports", [])
        if isinstance(report, Mapping)
    ]
    median_margin = median(det_margins) if det_margins else 0.0
    median_entropy = median(det_entropy) if det_entropy else 0.0
    approx_kl = _number(training_metrics.get("latest", {}).get("approx_kl"))
    value_loss = _number(training_metrics.get("latest", {}).get("value_loss"))
    runtime_errors = sum(int(mode.get("runtimeErrorCount") or 0) for mode in modes.values())
    evidence_valid = (
        artifact_probe.get("resultClass") == "artifact-probe-green"
        and action_surface_matches
        and runtime_errors == 0
        and not any(mode.get("errors") for mode in modes.values())
    )

    if artifact_probe.get("resultClass") != "artifact-probe-green":
        cause = "policy-evidence-invalid"
    elif not action_surface_matches:
        cause = "decoder-bug"
    elif runtime_errors:
        cause = "measurement-invalid"
    elif det_top >= 0.50 and det_streak >= 16 and stoch_top <= 0.45 and train_top <= 0.45 and median_entropy >= 0.90 and median_margin <= 0.02:
        cause = "eval-argmax-collapse"
    elif det_top >= 0.85 and stoch_top >= 0.70:
        cause = "policy-collapse-active"
    elif median_entropy <= 0.35:
        cause = "entropy-config-collapse"
    elif value_loss >= 20.0 and approx_kl <= 0.0001:
        cause = "rollout-bootstrap-drift"
    else:
        cause = "action-selection-blindness"

    counterprobe_fix_class = None
    if cause == "eval-argmax-collapse":
        counterprobe_fix_class = "eval-mode-counterprobe"
    elif cause == "decoder-bug":
        counterprobe_fix_class = "decoder-counterprobe"
    elif cause == "normalize-mismatch":
        counterprobe_fix_class = "normalize-counterprobe"

    return {
        "exactRootCause": cause,
        "evidenceValid": evidence_valid,
        "counterprobeFixClass": counterprobe_fix_class,
        "counterprobeAllowedIn93RR3": counterprobe_fix_class is not None,
        "signals": {
            "deterministicTopActionShareMax": _round(det_top),
            "deterministicRepeatedActionStreakMax": det_streak,
            "stochasticTopActionShareMax": _round(stoch_top),
            "stochasticRepeatedActionStreakMax": stoch_streak,
            "trainSamplingTopActionShareMax": _round(train_top),
            "deterministicMedianPolicyEntropyNormalized": _round(median_entropy),
            "deterministicMedianArgmaxMargin": _round(median_margin),
            "trainingApproxKlLatest": _round(approx_kl),
            "trainingValueLossLatest": _round(value_loss),
            "runtimeErrorCount": runtime_errors,
        },
        "interpretation": (
            "Deterministic argmax turns a high-entropy, near-tied policy into repeated actions; "
            "stochastic eval and train-mode sampling remain broad. This supports an eval-mode "
            "counterprobe, not reward/action/telemetry fix work."
            if cause == "eval-argmax-collapse"
            else "Root-cause evidence does not support an eval-mode green path; BT93S remains closed."
        ),
    }


def _phase_coverage(report: Mapping[str, Any]) -> dict[str, bool]:
    modes = report.get("modeReports") if isinstance(report.get("modeReports"), Mapping) else {}
    diagnostics = report.get("diagnosticMetrics") if isinstance(report.get("diagnosticMetrics"), Mapping) else {}
    root_cause = report.get("rootCause") if isinstance(report.get("rootCause"), Mapping) else {}
    return {
        "93RR.2.1": all(key in modes for key in ("deterministic-eval", "stochastic-eval", "train-sampling")),
        "93RR.2.2": all(
            key in diagnostics
            for key in (
                "entropy",
                "kl",
                "valueLoss",
                "advantageDistribution",
                "actionProbabilities",
                "argmaxMargin",
                "repeatedActionStreaks",
            )
        ),
        "93RR.2.3": root_cause.get("exactRootCause") in ROOT_CAUSES,
        "93RR.2.4": report.get("guardrails", {}).get("fixApplied") is False
        and root_cause.get("counterprobeFixClass") in {"eval-mode-counterprobe", "decoder-counterprobe", "normalize-counterprobe"},
        "DoD.RR3": root_cause.get("exactRootCause") in ROOT_CAUSES and bool(root_cause.get("signals")),
    }


def build_report(*, steps_per_seed: int) -> dict[str, Any]:
    started = time.perf_counter()
    config = _read_json(CONFIG_PATH)
    artifact_probe = _read_json(ARTIFACT_PROBE_PATH)
    training_report = _read_json(TRAINING_REPORT_PATH)
    seeds = tuple(int(seed) for seed in (config.get("seeds", {}).get("probeSeeds") or DEFAULT_SEEDS))
    max_steps = int(config.get("runContract", {}).get("maxStepsPerEpisode") or 180)
    reward_profile_id = str(config.get("rewardProfileId") or "bt93n-wall-trail-stability-v1")
    gamma = float(config.get("algorithm", {}).get("gamma") or 0.99)
    actions = _semantic_names()

    vec_env: VecNormalize | None = None
    model: PPO | None = None
    model_error: str | None = None
    try:
        vec_env, _metric_env = _build_vec_env(
            seed=seeds[0],
            label="rr2-loader",
            max_steps=max_steps,
            reward_profile_id=reward_profile_id,
            training=False,
            vecnormalize_source=VECNORMALIZE_PATH,
        )
        model = PPO.load(str(MODEL_PATH), env=vec_env, device="cpu", force_reset=False)
    except Exception as exc:  # pragma: no cover - diagnostic report path
        model_error = f"{exc.__class__.__name__}: {exc}"
    finally:
        if vec_env is not None:
            vec_env.close()

    if model is None:
        modes: dict[str, Any] = {}
    else:
        modes = {
            "deterministic-eval": _run_mode(
                model=model,
                mode_id="deterministic-eval",
                deterministic=True,
                vecnormalize_training=False,
                seeds=seeds,
                steps_per_seed=steps_per_seed,
                max_steps=max_steps,
                reward_profile_id=reward_profile_id,
                gamma=gamma,
            ),
            "stochastic-eval": _run_mode(
                model=model,
                mode_id="stochastic-eval",
                deterministic=False,
                vecnormalize_training=False,
                seeds=seeds,
                steps_per_seed=steps_per_seed,
                max_steps=max_steps,
                reward_profile_id=reward_profile_id,
                gamma=gamma,
            ),
            "train-sampling": _run_mode(
                model=model,
                mode_id="train-sampling",
                deterministic=False,
                vecnormalize_training=True,
                seeds=seeds,
                steps_per_seed=steps_per_seed,
                max_steps=max_steps,
                reward_profile_id=reward_profile_id,
                gamma=gamma,
            ),
        }

    tracked = _tracked_files(path for path, _role in SOURCE_PATHS.values())
    source_artifacts = [
        _source_artifact(key, path, role, tracked)
        for key, (path, role) in SOURCE_PATHS.items()
    ]
    action_surface_matches = bool(
        artifact_probe.get("actionSurface", {}).get("hashMatchesConfig") is True
        and artifact_probe.get("actionSurface", {}).get("decoderMappingMatchesConfig") is True
    )
    training_metrics = _training_logger_metrics(training_report)
    root_cause = (
        _root_cause(
            artifact_probe=artifact_probe,
            modes=modes,
            training_metrics=training_metrics,
            action_surface_matches=action_surface_matches,
        )
        if len(modes) == 3
        else {
            "exactRootCause": "policy-evidence-invalid",
            "evidenceValid": False,
            "counterprobeFixClass": None,
            "counterprobeAllowedIn93RR3": False,
            "signals": {"modelLoadError": model_error},
            "interpretation": "Model or env evidence is not loadable for BT93RR.2.",
        }
    )
    result_class = str(root_cause["exactRootCause"])

    diagnostic_metrics = {
        "entropy": {
            key: [
                report.get("policyDistributionStats", {}).get("normalizedEntropy")
                for report in mode.get("seedReports", [])
            ]
            for key, mode in modes.items()
        },
        "kl": {
            "trainingLogger": training_metrics.get("latest", {}).get("approx_kl"),
            "observationStepKl": {
                key: [
                    report.get("policyDistributionStats", {}).get("observationStepKl")
                    for report in mode.get("seedReports", [])
                ]
                for key, mode in modes.items()
            },
        },
        "valueLoss": {
            "trainingLogger": training_metrics.get("latest", {}).get("value_loss"),
            "source": training_metrics.get("source"),
        },
        "advantageDistribution": {
            key: [
                report.get("policyDistributionStats", {}).get("advantageProxy")
                for report in mode.get("seedReports", [])
            ]
            for key, mode in modes.items()
        },
        "actionProbabilities": {
            key: [
                report.get("policyDistributionStats", {}).get("selectedActionProbability")
                for report in mode.get("seedReports", [])
            ]
            for key, mode in modes.items()
        },
        "argmaxMargin": {
            key: [
                report.get("policyDistributionStats", {}).get("argmaxMargin")
                for report in mode.get("seedReports", [])
            ]
            for key, mode in modes.items()
        },
        "repeatedActionStreaks": {
            key: [
                report.get("repeatedActionStreak")
                for report in mode.get("seedReports", [])
            ]
            for key, mode in modes.items()
        },
    }

    report: dict[str, Any] = {
        "schemaVersion": "bt93rr-reentry-root-cause-report-v1",
        "ok": False,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93r_reentry_root_cause.py",
        "blockId": "BT93RR",
        "phaseId": "93RR.2",
        "resultClass": result_class,
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "elapsedMs": _round((time.perf_counter() - started) * 1000.0, 4),
        "lineage": {
            "lineageId": config.get("lineageId"),
            "lineageKind": config.get("lineageKind"),
            "notBt93nLineage": config.get("lineageKind") == "new-retrain-lineage-not-bt93n",
            "matrixId": config.get("matrixId"),
            "matrixHash": config.get("matrixHash"),
            "rewardProfileId": reward_profile_id,
            "semanticWindow": config.get("semanticWindow"),
            "actionSurfaceId": artifact_probe.get("actionSurface", {}).get("surfaceId"),
        },
        "modeContract": {
            "seeds": list(seeds),
            "stepsPerSeed": int(steps_per_seed),
            "sameMatrixForAllModes": True,
            "sameRewardProfileForAllModes": True,
            "sameVecNormalizeSource": _rel(VECNORMALIZE_PATH),
            "trainSamplingNoOptimizerUpdate": True,
            "maxDiagnosticSteps": int(steps_per_seed) * len(seeds) * 3,
            "qualityClaimAllowed": False,
            "holdoutUsed": False,
        },
        "actionSurface": {
            "semanticActions": actions,
            "semanticActionCount": len(actions),
            "matchesArtifactProbe": action_surface_matches,
        },
        "modeReports": modes,
        "diagnosticMetrics": diagnostic_metrics,
        "trainingLoggerMetrics": training_metrics,
        "rootCause": root_cause,
        "counterprobeContract": {
            "phase": "93RR.3",
            "allowed": bool(root_cause.get("counterprobeAllowedIn93RR3")),
            "fixClass": root_cause.get("counterprobeFixClass"),
            "sameMatrixRequired": True,
            "requiredEvalSeeds": [944, 945, 946],
            "additionalControlSeeds": [947],
            "maxDiagnosticTimesteps": 1000,
            "qualityClaimAllowed": False,
            "greenCriteria": {
                "noFullSingleActionDominance": True,
                "repeatedActionStreakBelowProbeLength": True,
                "secondBestProbabilityNonZero": True,
                "runtimeErrorCount": 0,
            },
        },
        "phaseCoverage": {},
        "guardrails": _guardrails(),
        "claimFlags": _claim_flags(),
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "newEvalEpisodes": sum(
                int(mode.get("combinedSummary", {}).get("completedEpisodes") or 0)
                for key, mode in modes.items()
                if key != "train-sampling"
            ),
            "holdoutEpisodes": 0,
            "diagnosticSteps": int(steps_per_seed) * len(seeds) * max(1, len(modes)),
            "perMode": {
                key: {
                    "steps": int(mode.get("combinedSummary", {}).get("totalSteps") or 0),
                    "completedEpisodes": int(mode.get("combinedSummary", {}).get("completedEpisodes") or 0),
                }
                for key, mode in modes.items()
            },
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": all(source["exists"] and source["isFile"] for source in source_artifacts),
        "allowNext": ["93RR.3 eval-mode counterprobe"] if root_cause.get("counterprobeAllowedIn93RR3") else [],
        "opensNext": ["93RR.3"] if root_cause.get("counterprobeAllowedIn93RR3") else [],
        "blocksNext": BLOCKED_ACTIONS,
        "summary": {
            "finalResult": result_class,
            "rootCause": root_cause.get("exactRootCause"),
            "counterprobeFixClass": root_cause.get("counterprobeFixClass"),
            "nextBestAction": (
                "Run 93RR.3 as eval-mode counterprobe only; no reward/action/telemetry fix."
                if root_cause.get("counterprobeFixClass") == "eval-mode-counterprobe"
                else "Stop before 93RR.3; root cause does not permit an allowed counterprobe."
            ),
            "bt93sStartDecision": "blocked until BT93R-Reentry.99 in R-Allowlist",
            "bt93oStartDecision": "blocked",
            "bt93pStartDecision": "blocked",
            "bt94aStartDecision": "blocked",
        },
        "commands": {
            "write": "python python/scripts/bt93r_reentry_root_cause.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    coverage = _phase_coverage(report)
    report["phaseCoverage"] = coverage
    report["ok"] = bool(report["sourceFilesReady"] and root_cause.get("evidenceValid") and all(coverage.values()))
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--steps-per-seed", type=int, default=DEFAULT_STEPS_PER_SEED)
    args = parser.parse_args()

    report = build_report(steps_per_seed=max(1, int(args.steps_per_seed)))
    if args.write_report:
        _write_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "rootCause": report["rootCause"],
                "phaseCoverage": report["phaseCoverage"],
                "output": _rel(args.output.resolve()),
                "opensNext": report["opensNext"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
