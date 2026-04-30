"""BT93Y.3 narrow PPO retraining-lineage package.

This phase creates a new, explicitly non-BT93N micro-lineage only because the
exact BT93N package is unavailable. It is artifact/logit evidence for a later
BT93R-Reentry, not quality, candidate, freeze, holdout, promote, rollout, or
runtime integration evidence.
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
from typing import Any, Iterable, Mapping

import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.utils import obs_as_tensor
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
    make_curvios_action_wrapper,
)
from scripts.bt93n_micro_ppo_repeat import (  # noqa: E402
    PhaseMetricsWrapper,
    PpoMetricCallback,
    _combine_eval_summaries,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Y_ROOT = PPO_ROOT / "bt93y"
LINEAGE_ID = "bt93y-retrain-lineage-v1"
PACKAGE_ROOT = BT93Y_ROOT / "retrain_lineage" / LINEAGE_ID

START_CONTRACT_PATH = BT93Y_ROOT / "retrain_start_contract.json"
LINEAGE_MANIFEST_PATH = BT93Y_ROOT / "retrain_lineage_manifest.json"
LOADER_SMOKE_REPORT_PATH = BT93Y_ROOT / "retrain_loader_smoke_report.json"
POLICY_PROBE_REPORT_PATH = BT93Y_ROOT / "retrain_policy_probe_report.json"

PACKAGE_MANIFEST_PATH = PACKAGE_ROOT / "artifact_manifest.json"
TRAINING_REPORT_PATH = PACKAGE_ROOT / "training_report.json"
CONFIG_PATH = PACKAGE_ROOT / "config.json"
MODEL_PATH = PACKAGE_ROOT / "model.zip"
VECNORMALIZE_PATH = PACKAGE_ROOT / "vecnormalize.pkl"
OPTIMIZER_PATH = PACKAGE_ROOT / "optimizer_state.pt"

BT93Y_DECISION_LOCK_PATH = BT93Y_ROOT / "lineage_recovery_decision_lock.json"
EXACT_LINEAGE_MANIFEST_PATH = BT93Y_ROOT / "exact_lineage_manifest.json"
BT93N_TOLERANCE_CONTRACT_PATH = PPO_ROOT / "bt93n" / "micro_ppo_tolerance_contract.json"
BT93N_MICRO_REPEAT_PATH = PPO_ROOT / "bt93n" / "micro_ppo_repeat_report.json"
BT93Q_POLICY_COLLAPSE_PATH = PPO_ROOT / "bt93q" / "policy_collapse_report.json"
BT93R_POLICY_ARTIFACT_PATH = PPO_ROOT / "bt93r" / "policy_artifact_report.json"
BT93R_CLOSURE_PATH = PPO_ROOT / "bt93r" / "bt93r_closure_gate_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"

DEFAULT_TIMESTEPS = 512
MAX_ALLOWED_TIMESTEPS = 10_000
DEFAULT_TRAIN_SEED = 934
DEFAULT_PROBE_SEEDS = (944, 945, 946)
DEFAULT_PROBE_STEPS_PER_SEED = 32
DEFAULT_MAX_STEPS = 180
DEFAULT_REWARD_PROFILE_ID = "bt93n-wall-trail-stability-v1"
MATRIX_ID = "bt93l-reachability-diagnostic-matrix-v1"
MATRIX_HASH = "a8e17c34cc152bf73d6e6d43e11aa12b3cffae9a2caf26601ebd22b94d4b7bad"
SEMANTIC_WINDOW = "runtime-near-headless-v1"
REPLACEMENT_POLICY_ID = "bt93x-rcp1-same-matrix-control-suite-no-bt11"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
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


def _json_safe(value: Any) -> Any:
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, torch.Tensor):
        return _json_safe(value.detach().cpu().numpy())
    if isinstance(value, Mapping):
        return {str(key): _json_safe(entry) for key, entry in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(entry) for entry in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any) -> float:
    return round(_number(value), 6)


def _artifact(path: Path | None, role: str, tracked: set[str], *, key: str | None = None) -> dict[str, Any]:
    rel_path = _rel(path)
    payload = _read_json(path) if path is not None and path.suffix == ".json" else {}
    return {
        "key": key,
        "path": rel_path,
        "role": role,
        "exists": bool(path and path.exists()),
        "isFile": bool(path and path.is_file()),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path is not None and path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    sources = {
        "bt93yDecisionLock": (BT93Y_DECISION_LOCK_PATH, "BT93Y.1 decision lock"),
        "bt93yExactLineageManifest": (EXACT_LINEAGE_MANIFEST_PATH, "BT93Y.2 exact-lineage negative evidence"),
        "bt93nToleranceContract": (BT93N_TOLERANCE_CONTRACT_PATH, "BT93N.3 comparable run contract"),
        "bt93nMicroRepeat": (BT93N_MICRO_REPEAT_PATH, "BT93N.3 diagnostic micro-PPO source"),
        "bt93qPolicyCollapse": (BT93Q_POLICY_COLLAPSE_PATH, "BT93Q deterministic collapse evidence"),
        "bt93rPolicyArtifact": (BT93R_POLICY_ARTIFACT_PATH, "BT93R artifact blocker"),
        "bt93rClosure": (BT93R_CLOSURE_PATH, "BT93R.99 red closure"),
        "ppoActionSurface": (ACTION_SURFACE_PATH, "current masked semantic PPO action surface"),
        "curviosEnv": (CURVIOS_ENV_PATH, "Python CurviosEnv bridge"),
    }
    tracked = _tracked_files(path for path, _ in sources.values())
    return [
        {"sourceKey": key, **_artifact(path, role, tracked, key=key)}
        for key, (path, role) in sources.items()
    ]


def _claim_flags() -> dict[str, bool]:
    return {
        "bt93rReentryAllowed": False,
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


def _guardrails(*, training_started: bool) -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": bool(training_started),
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "bt95HandoffSignal": False,
        "qualityClaimAllowed": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        **_claim_flags(),
    }


def _blocked_next() -> list[str]:
    return [
        "BT93R-Reentry until BT93Y.99 green",
        "BT93S claim",
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
    ]


def _make_metric_env(*, seed: int, label: str, max_steps: int, reward_profile_id: str) -> PhaseMetricsWrapper:
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max_steps,
            default_seed=seed,
            session_id=f"bt93y-retrain-{label}",
            controller_timeout_seconds=30.0,
            reward_profile_id=reward_profile_id,
            map_key="standard",
            domain_mode="classic-3d",
            game_mode="CLASSIC",
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )
    return PhaseMetricsWrapper(env, label=label)


def _build_vec_env(
    *,
    seed: int,
    label: str,
    max_steps: int,
    reward_profile_id: str,
    training: bool,
    vecnormalize_source: Path | None = None,
) -> tuple[VecNormalize, PhaseMetricsWrapper]:
    env_ref: dict[str, PhaseMetricsWrapper] = {}

    def factory() -> PhaseMetricsWrapper:
        env = _make_metric_env(seed=seed, label=label, max_steps=max_steps, reward_profile_id=reward_profile_id)
        env_ref["env"] = env
        return env

    dummy = DummyVecEnv([factory])
    if vecnormalize_source is not None:
        vec_env = VecNormalize.load(str(vecnormalize_source), dummy)
        vec_env.training = bool(training)
        vec_env.norm_reward = bool(training)
    else:
        vec_env = VecNormalize(dummy, norm_obs=True, norm_reward=True, clip_obs=10.0, gamma=0.99)
        vec_env.training = bool(training)
        vec_env.norm_reward = bool(training)
    return vec_env, env_ref["env"]


class StopAfterTimestepsCallback(BaseCallback):
    def __init__(self, max_timesteps: int) -> None:
        super().__init__()
        self.max_timesteps = int(max_timesteps)
        self.stop_reason: str | None = None

    def _on_step(self) -> bool:
        if int(self.num_timesteps) >= self.max_timesteps:
            self.stop_reason = "requested-micro-budget-reached"
            return False
        return True


def _build_config(*, total_timesteps: int, train_seed: int, probe_seeds: tuple[int, ...], probe_steps: int, max_steps: int, reward_profile_id: str) -> dict[str, Any]:
    return {
        "schemaVersion": "bt93y-retrain-lineage-config-v1",
        "blockId": "BT93Y",
        "phaseId": "93Y.3",
        "lineageId": LINEAGE_ID,
        "lineageKind": "new-retrain-lineage-not-bt93n",
        "matrixId": MATRIX_ID,
        "matrixHash": MATRIX_HASH,
        "semanticWindow": SEMANTIC_WINDOW,
        "rewardProfileId": reward_profile_id,
        "actionSurface": {
            **build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
            "sourcePath": _rel(ACTION_SURFACE_PATH),
            "sourceSha256": _sha256_file(ACTION_SURFACE_PATH),
        },
        "seeds": {
            "trainSeed": int(train_seed),
            "probeSeeds": [int(seed) for seed in probe_seeds],
        },
        "runContract": {
            "requestedTimesteps": int(total_timesteps),
            "maxAllowedTimesteps": MAX_ALLOWED_TIMESTEPS,
            "autoExtendAllowed": False,
            "hyperparameterSearchAllowed": False,
            "qualityJudgementAllowed": False,
            "holdoutUsed": False,
            "probeStepsPerSeedPerMode": int(probe_steps),
            "maxStepsPerEpisode": int(max_steps),
        },
        "algorithm": {
            "model": "stable_baselines3.PPO",
            "policy": "MlpPolicy",
            "nSteps": 128,
            "batchSize": 64,
            "nEpochs": 2,
            "learningRate": 0.0003,
            "gamma": 0.99,
            "gaeLambda": 0.95,
            "clipRange": 0.2,
            "entCoef": 0.0,
            "vfCoef": 0.5,
            "device": "auto",
        },
    }


def _build_start_contract(config: Mapping[str, Any]) -> dict[str, Any]:
    exact_manifest = _read_json(EXACT_LINEAGE_MANIFEST_PATH)
    decision_lock = _read_json(BT93Y_DECISION_LOCK_PATH)
    total_timesteps = int(config["runContract"]["requestedTimesteps"])
    exact_unavailable = exact_manifest.get("resultClass") == "exact-lineage-unavailable"
    retraining_allowed = bool(exact_manifest.get("lineageDecision", {}).get("retrainingAllowedIfExactLineageUnavailable"))
    budget_valid = 0 < total_timesteps <= MAX_ALLOWED_TIMESTEPS
    result_class = (
        "retrain-start-contract-locked"
        if exact_unavailable and retraining_allowed and budget_valid
        else "lineage-recovery-blocked"
    )
    return {
        "schemaVersion": "bt93y-retrain-start-contract-v1",
        "ok": result_class == "retrain-start-contract-locked",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_retrain_lineage.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93Y",
        "phaseId": "93Y.3",
        "resultClass": result_class,
        "lineageId": LINEAGE_ID,
        "lineageKind": "new-retrain-lineage-not-bt93n",
        "notBt93nLineage": True,
        "exactLineagePrerequisite": {
            "source": _rel(EXACT_LINEAGE_MANIFEST_PATH),
            "resultClass": exact_manifest.get("resultClass"),
            "exactLineageUnavailable": exact_unavailable,
            "exactBt93nLineageRestored": exact_manifest.get("exactBt93nLineageRestored") is True,
            "retrainingAllowedIfExactLineageUnavailable": retraining_allowed,
        },
        "lineageDecision": decision_lock.get("lineageDecision"),
        "replacementPolicy": {
            "owner": "user",
            "approved": True,
            "policyId": REPLACEMENT_POLICY_ID,
            "scope": ["BT93X starttruth", "BT93P starttruth"],
            "historicalDqnBotReportsUse": "context-only",
        },
        "matrixId": config["matrixId"],
        "matrixHash": config["matrixHash"],
        "semanticWindow": config["semanticWindow"],
        "rewardProfileId": config["rewardProfileId"],
        "actionSurface": config["actionSurface"],
        "seeds": config["seeds"],
        "runContract": config["runContract"],
        "thresholdsLockedBeforeRun": True,
        "stopRules": {
            "stopAtRequestedMicroBudget": True,
            "stopOnRuntimeError": True,
            "stopOnNonFinitePolicyOutput": True,
            "noAutoExtend": True,
        },
        "nonGoals": [
            "quality claim",
            "candidate",
            "freeze",
            "holdout consumption",
            "BT93S claim",
            "BT93O claim",
            "BT93P claim",
            "BT94A claim",
            "promote",
            "rollout",
            "productive runtime integration",
        ],
        "sourceArtifacts": _source_artifacts(),
        "guardrails": _guardrails(training_started=False),
        "claimFlags": _claim_flags(),
        "allowNext": ["execute 93Y.3 micro retrain package only"],
        "opensNext": [],
        "blocksNext": _blocked_next(),
        "commands": {
            "write": "python python/scripts/bt93y_retrain_lineage.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def _train_package(config: Mapping[str, Any]) -> tuple[dict[str, Any], PPO, VecNormalize, PhaseMetricsWrapper]:
    _write_json(CONFIG_PATH, config)
    algorithm = config["algorithm"]
    run_contract = config["runContract"]
    train_seed = int(config["seeds"]["trainSeed"])
    total_timesteps = int(run_contract["requestedTimesteps"])
    vec_env, metric_env = _build_vec_env(
        seed=train_seed,
        label="train",
        max_steps=int(run_contract["maxStepsPerEpisode"]),
        reward_profile_id=str(config["rewardProfileId"]),
        training=True,
    )
    metric_callback = PpoMetricCallback()
    stop_callback = StopAfterTimestepsCallback(total_timesteps)
    started = time.perf_counter()
    model = PPO(
        str(algorithm["policy"]),
        vec_env,
        seed=train_seed,
        n_steps=int(algorithm["nSteps"]),
        batch_size=int(algorithm["batchSize"]),
        n_epochs=int(algorithm["nEpochs"]),
        learning_rate=float(algorithm["learningRate"]),
        gamma=float(algorithm["gamma"]),
        gae_lambda=float(algorithm["gaeLambda"]),
        clip_range=float(algorithm["clipRange"]),
        ent_coef=float(algorithm["entCoef"]),
        vf_coef=float(algorithm["vfCoef"]),
        verbose=0,
        device=str(algorithm["device"]),
    )
    model.learn(total_timesteps=total_timesteps, callback=[metric_callback, stop_callback], progress_bar=False)
    elapsed_seconds = time.perf_counter() - started
    model.save(str(MODEL_PATH))
    vec_env.save(str(VECNORMALIZE_PATH))
    torch.save(model.policy.optimizer.state_dict(), OPTIMIZER_PATH)
    training_summary = metric_env.summary()
    report = {
        "schemaVersion": "bt93y-retrain-training-report-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_retrain_lineage.py",
        "blockId": "BT93Y",
        "phaseId": "93Y.3",
        "lineageId": LINEAGE_ID,
        "runKind": "artifact-logit-micro-retrain",
        "requestedTimesteps": total_timesteps,
        "actualModelTimesteps": int(model.num_timesteps),
        "optimizerUpdates": int(getattr(model, "_n_updates", 0)),
        "elapsedSeconds": _round(elapsed_seconds),
        "stepsPerSecond": _round(float(model.num_timesteps) / elapsed_seconds if elapsed_seconds > 0 else 0.0),
        "callback": {
            "rolloutCount": metric_callback.rollout_count,
            "loggerSnapshots": metric_callback.logger_snapshots,
            "stopReason": stop_callback.stop_reason,
        },
        "trainSummary": training_summary,
        "guardrails": _guardrails(training_started=True),
    }
    _write_json(TRAINING_REPORT_PATH, report)
    return report, model, vec_env, metric_env


def _package_artifacts(config: Mapping[str, Any], training_report: Mapping[str, Any]) -> dict[str, Any]:
    artifacts = {
        "model": MODEL_PATH,
        "config": CONFIG_PATH,
        "vecnormalize": VECNORMALIZE_PATH,
        "normalizer": VECNORMALIZE_PATH,
        "optimizerState": OPTIMIZER_PATH,
        "artifactManifest": PACKAGE_MANIFEST_PATH,
        "trainingReport": TRAINING_REPORT_PATH,
    }
    tracked = _tracked_files(artifacts.values())
    manifest = {
        "schemaVersion": "bt93y-retrain-artifact-manifest-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_retrain_lineage.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93Y",
        "phaseId": "93Y.3",
        "lineageId": LINEAGE_ID,
        "lineageKind": "new-retrain-lineage-not-bt93n",
        "notBt93nLineage": True,
        "matrixId": config["matrixId"],
        "matrixHash": config["matrixHash"],
        "semanticWindow": config["semanticWindow"],
        "rewardProfileId": config["rewardProfileId"],
        "actionSurface": config["actionSurface"],
        "sampleCounts": {
            "requestedTimesteps": int(training_report.get("requestedTimesteps") or 0),
            "actualModelTimesteps": int(training_report.get("actualModelTimesteps") or 0),
            "trainCompletedEpisodes": int(training_report.get("trainSummary", {}).get("completedEpisodes") or 0),
            "trainSteps": int(training_report.get("trainSummary", {}).get("totalSteps") or 0),
        },
        "artifacts": {
            key: _artifact(path, f"BT93Y.3 retrain package {key}", tracked, key=key)
            for key, path in artifacts.items()
        },
        "guardrails": _guardrails(training_started=True),
    }
    _write_json(PACKAGE_MANIFEST_PATH, manifest)
    return manifest


def _distribution_snapshot(model: PPO, obs: np.ndarray) -> dict[str, Any]:
    with torch.no_grad():
        obs_tensor = obs_as_tensor(obs, model.device)
        distribution = model.policy.get_distribution(obs_tensor).distribution
        probs = distribution.probs.detach().cpu().numpy()[0]
        logits = getattr(distribution, "logits", None)
        entropy = distribution.entropy().detach().cpu().numpy()[0]
    ranked_indices = list(np.argsort(probs)[::-1])
    semantic_names = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    ranked = [
        {
            "token": int(index),
            "semanticAction": semantic_names[index] if index < len(semantic_names) else f"unknown-{index}",
            "probability": _round(probs[index]),
            "logit": _round(logits.detach().cpu().numpy()[0][index]) if logits is not None else None,
        }
        for index in ranked_indices[:8]
    ]
    return {
        "entropy": _round(entropy),
        "argmaxToken": ranked[0]["token"] if ranked else None,
        "argmaxAction": ranked[0]["semanticAction"] if ranked else None,
        "argmaxProbability": ranked[0]["probability"] if ranked else None,
        "rankedActions": ranked,
    }


def _run_eval_mode(
    *,
    model: PPO,
    deterministic: bool,
    seed: int,
    steps: int,
    max_steps: int,
    reward_profile_id: str,
) -> dict[str, Any]:
    vec_env, metric_env = _build_vec_env(
        seed=seed,
        label=f"{'det' if deterministic else 'stoch'}-{seed}",
        max_steps=max_steps,
        reward_profile_id=reward_profile_id,
        training=False,
        vecnormalize_source=VECNORMALIZE_PATH,
    )
    model.set_env(vec_env, force_reset=False)
    action_counts: Counter[str] = Counter()
    distribution_snapshots: list[dict[str, Any]] = []
    semantic_names = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    try:
        obs = vec_env.reset()
        for step_index in range(int(steps)):
            if len(distribution_snapshots) < 6:
                distribution_snapshots.append({
                    "stepIndex": step_index,
                    **_distribution_snapshot(model, obs),
                })
            action, _ = model.predict(obs, deterministic=deterministic)
            token = int(np.asarray(action).reshape(-1)[0])
            action_counts[semantic_names[token] if token < len(semantic_names) else f"unknown-{token}"] += 1
            obs, _rewards, _dones, _infos = vec_env.step(action)
        summary = metric_env.summary()
    finally:
        vec_env.close()
    total_actions = sum(action_counts.values())
    top_action, top_count = action_counts.most_common(1)[0] if action_counts else (None, 0)
    return {
        "seed": int(seed),
        "deterministic": bool(deterministic),
        "requestedSteps": int(steps),
        "summary": summary,
        "actionCounts": dict(sorted(action_counts.items())),
        "topAction": top_action,
        "topActionShare": _round(top_count / max(1, total_actions)),
        "distributionSnapshots": distribution_snapshots,
    }


def _run_policy_probe(
    *,
    model: PPO,
    probe_seeds: tuple[int, ...],
    probe_steps: int,
    max_steps: int,
    reward_profile_id: str,
) -> dict[str, Any]:
    mode_reports: dict[str, list[dict[str, Any]]] = {"deterministic": [], "stochastic": []}
    for deterministic in (True, False):
        key = "deterministic" if deterministic else "stochastic"
        for seed in probe_seeds:
            mode_reports[key].append(
                _run_eval_mode(
                    model=model,
                    deterministic=deterministic,
                    seed=seed,
                    steps=probe_steps,
                    max_steps=max_steps,
                    reward_profile_id=reward_profile_id,
                )
            )
    deterministic_summaries = [item["summary"] for item in mode_reports["deterministic"]]
    stochastic_summaries = [item["summary"] for item in mode_reports["stochastic"]]
    deterministic_combined = _combine_eval_summaries(deterministic_summaries)
    stochastic_combined = _combine_eval_summaries(stochastic_summaries)
    deterministic_top_share = max((item.get("topActionShare") or 0.0 for item in mode_reports["deterministic"]), default=0.0)
    first_snapshot = next(
        (
            snapshot
            for mode in mode_reports.values()
            for seed_report in mode
            for snapshot in seed_report.get("distributionSnapshots") or []
        ),
        {},
    )
    deterministic_collapse_active = bool(
        deterministic_top_share >= 0.85 or _number(first_snapshot.get("argmaxProbability")) >= 0.85
    )
    action_surface_manifest = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    failure_signature = {
        "deathBefore60": {
            "classification": "present" if int(deterministic_combined.get("deathBefore60Count") or 0) > 0 else "not-observed-in-short-probe",
            "deterministicCount": int(deterministic_combined.get("deathBefore60Count") or 0),
            "stochasticCount": int(stochastic_combined.get("deathBefore60Count") or 0),
        },
        "wallTrail": {
            "classification": "counterprobe-required",
            "reason": "93Y.3 only creates a loadable lineage; BT93R-Reentry remains responsible for wall/trail root-cause counterprobe.",
        },
        "deterministicCollapse": {
            "classification": "active" if deterministic_collapse_active else "not-observed-in-short-probe",
            "topActionShareMax": _round(deterministic_top_share),
            "firstArgmaxProbability": first_snapshot.get("argmaxProbability"),
            "firstArgmaxAction": first_snapshot.get("argmaxAction"),
        },
        "actionSurface": {
            "classification": "new-current-surface-lineage-not-bt93n",
            "surfaceId": action_surface_manifest.get("surfaceId"),
            "semanticActions": action_surface_manifest.get("semanticActions"),
            "semanticActionCount": len(action_surface_manifest.get("semanticActions") or []),
            "notEquivalentToBt93nExactLineage": True,
        },
        "rewardOrdering": {
            "classification": "not-measured-in-93y3",
            "blocksQualityClaim": True,
            "nextOwner": "BT93U/BT93O after BT93R-Reentry/S/T gates",
        },
    }
    return {
        "modeReports": mode_reports,
        "combined": {
            "deterministic": deterministic_combined,
            "stochastic": stochastic_combined,
        },
        "failureSignatureClassification": failure_signature,
        "policyDistributionEvidence": {
            "realPolicyDistributionAvailable": bool(first_snapshot),
            "source": "stable_baselines3 PPO loaded from BT93Y.3 package",
            "firstSnapshot": first_snapshot,
        },
    }


def _run_loader_smoke(config: Mapping[str, Any]) -> tuple[dict[str, Any], PPO]:
    started = time.perf_counter()
    vec_env, _metric_env = _build_vec_env(
        seed=int(config["seeds"]["probeSeeds"][0]),
        label="loader-smoke",
        max_steps=int(config["runContract"]["maxStepsPerEpisode"]),
        reward_profile_id=str(config["rewardProfileId"]),
        training=False,
        vecnormalize_source=VECNORMALIZE_PATH,
    )
    error: str | None = None
    model_loaded = False
    normalizer_loaded = False
    config_loaded = False
    forward_ok = False
    try:
        config_loaded = bool(_read_json(CONFIG_PATH))
        normalizer_loaded = VECNORMALIZE_PATH.is_file()
        model = PPO.load(str(MODEL_PATH), env=vec_env, device="cpu", force_reset=False)
        model_loaded = True
        obs = vec_env.reset()
        model.predict(obs, deterministic=True)
        forward_ok = True
    except Exception as exc:  # pragma: no cover - diagnostic report path
        error = f"{exc.__class__.__name__}: {exc}"
        model = PPO.load(str(MODEL_PATH), device="cpu") if MODEL_PATH.is_file() else None  # type: ignore[assignment]
    finally:
        vec_env.close()
    report = {
        "schemaVersion": "bt93y-retrain-loader-smoke-v1",
        "ok": error is None and model_loaded and normalizer_loaded and config_loaded and forward_ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_retrain_lineage.py",
        "blockId": "BT93Y",
        "phaseId": "93Y.3",
        "resultClass": "retrain-loader-smoke-green" if error is None and forward_ok else "lineage-package-invalid",
        "lineageId": LINEAGE_ID,
        "elapsedMs": _round((time.perf_counter() - started) * 1000.0),
        "loaderSmoke": {
            "modelLoadAttempted": True,
            "modelLoaded": model_loaded,
            "configLoaded": config_loaded,
            "normalizerLoaded": normalizer_loaded,
            "forwardPassOk": forward_ok,
            "error": error,
        },
        "modelPackage": _package_artifacts_for_report(),
        "guardrails": _guardrails(training_started=True),
        "claimFlags": _claim_flags(),
        "allowNext": ["93Y.4 replacement-policy lock"] if error is None and forward_ok else [],
        "blocksNext": _blocked_next(),
    }
    if model is None:
        raise RuntimeError(error or "PPO model could not be loaded")
    return report, model


def _package_artifacts_for_report() -> dict[str, Any]:
    artifacts = {
        "model": MODEL_PATH,
        "config": CONFIG_PATH,
        "vecnormalize": VECNORMALIZE_PATH,
        "normalizer": VECNORMALIZE_PATH,
        "optimizerState": OPTIMIZER_PATH,
        "artifactManifest": PACKAGE_MANIFEST_PATH,
        "trainingReport": TRAINING_REPORT_PATH,
    }
    tracked = _tracked_files(artifacts.values())
    return {
        key: _artifact(path, f"BT93Y.3 retrain package {key}", tracked, key=key)
        for key, path in artifacts.items()
    }


def _build_final_reports(
    *,
    config: Mapping[str, Any],
    start_contract: Mapping[str, Any],
    training_report: Mapping[str, Any],
    package_manifest: Mapping[str, Any],
    loader_smoke: Mapping[str, Any],
    policy_probe: Mapping[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    package_complete = all(
        (loader_smoke.get("modelPackage") or {}).get(key, {}).get("exists")
        for key in ("model", "config", "vecnormalize", "optimizerState")
    )
    loadable = loader_smoke.get("resultClass") == "retrain-loader-smoke-green"
    distribution_ready = bool(policy_probe.get("policyDistributionEvidence", {}).get("realPolicyDistributionAvailable"))
    actual_timesteps = int(training_report.get("actualModelTimesteps") or 0)
    within_budget = 0 < actual_timesteps <= MAX_ALLOWED_TIMESTEPS
    result_class = (
        "retrain-lineage-ready"
        if start_contract.get("ok") is True and package_complete and loadable and distribution_ready and within_budget
        else "retrain-lineage-not-comparable"
    )
    phase_coverage = {
        "93Y.3.1": start_contract.get("ok") is True and start_contract.get("thresholdsLockedBeforeRun") is True,
        "93Y.3.2": package_complete and loadable,
        "93Y.3.3": distribution_ready,
        "93Y.3.4": bool(policy_probe.get("failureSignatureClassification")),
        "93Y.3.5": result_class == "retrain-lineage-not-comparable" or result_class == "retrain-lineage-ready",
        "93Y.3.6": result_class == "retrain-lineage-ready",
        "93Y.3.7": within_budget and config["runContract"]["autoExtendAllowed"] is False,
    }
    sample_counts = {
        "requestedTimesteps": int(config["runContract"]["requestedTimesteps"]),
        "actualModelTimesteps": actual_timesteps,
        "trainSteps": int(training_report.get("trainSummary", {}).get("totalSteps") or 0),
        "trainCompletedEpisodes": int(training_report.get("trainSummary", {}).get("completedEpisodes") or 0),
        "probeSeeds": list(config["seeds"]["probeSeeds"]),
        "probeStepsPerSeedPerMode": int(config["runContract"]["probeStepsPerSeedPerMode"]),
        "deterministicProbeSteps": int(policy_probe.get("combined", {}).get("deterministic", {}).get("totalSteps") or 0),
        "stochasticProbeSteps": int(policy_probe.get("combined", {}).get("stochastic", {}).get("totalSteps") or 0),
        "holdoutEpisodes": 0,
    }
    common = {
        "ok": result_class == "retrain-lineage-ready",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_retrain_lineage.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93Y",
        "phaseId": "93Y.3",
        "resultClass": result_class,
        "lineageId": LINEAGE_ID,
        "lineageKind": "new-retrain-lineage-not-bt93n",
        "notBt93nLineage": True,
        "matrixId": config["matrixId"],
        "matrixHash": config["matrixHash"],
        "semanticWindow": config["semanticWindow"],
        "rewardProfileId": config["rewardProfileId"],
        "actionSurface": config["actionSurface"],
        "sampleCounts": sample_counts,
        "phaseCoverage": phase_coverage,
        "sourceArtifacts": _source_artifacts(),
        "modelPackage": loader_smoke.get("modelPackage"),
        "packageManifest": {
            "path": _rel(PACKAGE_MANIFEST_PATH),
            "sha256": _sha256_file(PACKAGE_MANIFEST_PATH),
            "summary": {
                "sampleCounts": package_manifest.get("sampleCounts"),
                "lineageKind": package_manifest.get("lineageKind"),
            },
        },
        "guardrails": _guardrails(training_started=True),
        "claimFlags": _claim_flags(),
        "allowNext": ["93Y.4 replacement-policy lock"] if result_class == "retrain-lineage-ready" else [],
        "opensNext": ["93Y.4"] if result_class == "retrain-lineage-ready" else [],
        "blocksNext": _blocked_next(),
        "commands": {
            "write": "python python/scripts/bt93y_retrain_lineage.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    manifest = {
        "schemaVersion": "bt93y-retrain-lineage-manifest-v1",
        **common,
        "startContract": {
            "path": _rel(START_CONTRACT_PATH),
            "sha256": _sha256_file(START_CONTRACT_PATH),
            "resultClass": start_contract.get("resultClass"),
        },
        "loaderSmokeReport": {
            "path": _rel(LOADER_SMOKE_REPORT_PATH),
            "sha256": _sha256_file(LOADER_SMOKE_REPORT_PATH),
            "resultClass": loader_smoke.get("resultClass"),
        },
        "policyProbeReport": {
            "path": _rel(POLICY_PROBE_REPORT_PATH),
            "sha256": _sha256_file(POLICY_PROBE_REPORT_PATH),
            "resultClass": result_class,
        },
        "summary": {
            "finalResult": result_class,
            "bt93rReentryAllowed": False,
            "nextBestAction": "Proceed to 93Y.4; BT93R-Reentry remains blocked until 93Y.99.",
            "qualityClaimAllowed": False,
        },
    }
    probe_report = {
        "schemaVersion": "bt93y-retrain-policy-probe-report-v1",
        **common,
        "policyDistributionEvidence": policy_probe.get("policyDistributionEvidence"),
        "deterministicEval": policy_probe.get("combined", {}).get("deterministic"),
        "stochasticEval": policy_probe.get("combined", {}).get("stochastic"),
        "modeReports": policy_probe.get("modeReports"),
        "failureSignatureClassification": policy_probe.get("failureSignatureClassification"),
        "summary": {
            "finalResult": result_class,
            "realPolicyDistributionAvailable": distribution_ready,
            "deterministicCollapse": policy_probe.get("failureSignatureClassification", {}).get("deterministicCollapse"),
            "noQualityClaim": True,
        },
    }
    return manifest, probe_report


def build_reports(
    *,
    total_timesteps: int,
    train_seed: int,
    probe_seeds: tuple[int, ...],
    probe_steps_per_seed: int,
    max_steps: int,
    reward_profile_id: str,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    config = _build_config(
        total_timesteps=total_timesteps,
        train_seed=train_seed,
        probe_seeds=probe_seeds,
        probe_steps=probe_steps_per_seed,
        max_steps=max_steps,
        reward_profile_id=reward_profile_id,
    )
    start_contract = _build_start_contract(config)
    if not start_contract["ok"]:
        lineage_manifest = {
            "schemaVersion": "bt93y-retrain-lineage-manifest-v1",
            "ok": False,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93y_retrain_lineage.py",
            "blockId": "BT93Y",
            "phaseId": "93Y.3",
            "resultClass": "lineage-recovery-blocked",
            "lineageId": LINEAGE_ID,
            "startContract": start_contract,
            "guardrails": _guardrails(training_started=False),
            "claimFlags": _claim_flags(),
            "blocksNext": _blocked_next(),
        }
        loader_smoke = {
            "schemaVersion": "bt93y-retrain-loader-smoke-v1",
            "ok": False,
            "blockId": "BT93Y",
            "phaseId": "93Y.3",
            "resultClass": "lineage-recovery-blocked",
            "notApplicableReason": "start contract blocked retraining",
        }
        probe_report = {
            "schemaVersion": "bt93y-retrain-policy-probe-report-v1",
            "ok": False,
            "blockId": "BT93Y",
            "phaseId": "93Y.3",
            "resultClass": "lineage-recovery-blocked",
            "notApplicableReason": "start contract blocked retraining",
        }
        return start_contract, lineage_manifest, loader_smoke, probe_report

    _write_json(START_CONTRACT_PATH, start_contract)
    training_report, model, vec_env, _metric_env = _train_package(config)
    try:
        package_manifest = _package_artifacts(config, training_report)
    finally:
        vec_env.close()
    loader_smoke, loaded_model = _run_loader_smoke(config)
    policy_probe = _run_policy_probe(
        model=loaded_model,
        probe_seeds=probe_seeds,
        probe_steps=probe_steps_per_seed,
        max_steps=max_steps,
        reward_profile_id=reward_profile_id,
    )
    lineage_manifest, probe_report = _build_final_reports(
        config=config,
        start_contract=start_contract,
        training_report=training_report,
        package_manifest=package_manifest,
        loader_smoke=loader_smoke,
        policy_probe=policy_probe,
    )
    return start_contract, lineage_manifest, loader_smoke, probe_report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--total-timesteps", type=int, default=DEFAULT_TIMESTEPS)
    parser.add_argument("--train-seed", type=int, default=DEFAULT_TRAIN_SEED)
    parser.add_argument("--probe-seeds", default=",".join(str(seed) for seed in DEFAULT_PROBE_SEEDS))
    parser.add_argument("--probe-steps-per-seed", type=int, default=DEFAULT_PROBE_STEPS_PER_SEED)
    parser.add_argument("--max-steps", type=int, default=DEFAULT_MAX_STEPS)
    parser.add_argument("--reward-profile-id", default=DEFAULT_REWARD_PROFILE_ID)
    args = parser.parse_args()

    probe_seeds = tuple(int(value.strip()) for value in str(args.probe_seeds).split(",") if value.strip())
    reports = build_reports(
        total_timesteps=int(args.total_timesteps),
        train_seed=int(args.train_seed),
        probe_seeds=probe_seeds,
        probe_steps_per_seed=int(args.probe_steps_per_seed),
        max_steps=int(args.max_steps),
        reward_profile_id=str(args.reward_profile_id),
    )
    start_contract, lineage_manifest, loader_smoke, probe_report = reports
    if args.write_reports:
        _write_json(START_CONTRACT_PATH, start_contract)
        _write_json(LOADER_SMOKE_REPORT_PATH, loader_smoke)
        _write_json(POLICY_PROBE_REPORT_PATH, probe_report)
        _write_json(LINEAGE_MANIFEST_PATH, lineage_manifest)
    print(
        json.dumps(
            {
                "ok": lineage_manifest.get("ok"),
                "resultClass": lineage_manifest.get("resultClass"),
                "lineageId": lineage_manifest.get("lineageId"),
                "actualModelTimesteps": lineage_manifest.get("sampleCounts", {}).get("actualModelTimesteps"),
                "loaderSmoke": loader_smoke.get("resultClass"),
                "opensNext": lineage_manifest.get("opensNext"),
                "outputs": [
                    _rel(START_CONTRACT_PATH),
                    _rel(LINEAGE_MANIFEST_PATH),
                    _rel(LOADER_SMOKE_REPORT_PATH),
                    _rel(POLICY_PROBE_REPORT_PATH),
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if lineage_manifest.get("ok") is True else 1


if __name__ == "__main__":
    raise SystemExit(main())
