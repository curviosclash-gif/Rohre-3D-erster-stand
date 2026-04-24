"""BT93C real PPO learner, resume, and eval smoke runner."""

from __future__ import annotations

import json
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

from bridge.authority_snapshot import READ_ONLY_RUNTIME_SURFACES
from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH
from envs.curvios_env import CurviosEnv, DEFAULT_COMMAND_TIMEOUT_SECONDS
from envs.ppo_action_surface import CurviosPpoActionWrapper, build_action_surface_manifest

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
DEFAULT_CONFIG = PYTHON_ROOT / "configs" / "ppo_bt93c_learner_smoke.json"
DEFAULT_ARTIFACT_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
CHECKPOINT_VERSION = "bt93c-ppo-checkpoint-v1"


@dataclass(frozen=True)
class ModelPackage:
    manifest_path: Path
    run_id: str
    model_path: Path
    vecnormalize_path: Path
    optimizer_path: Path
    config_path: Path
    model_sha256: str
    vecnormalize_sha256: str
    optimizer_sha256: str
    config_sha256: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _run_id(run_kind: str) -> str:
    stamp = _utc_now().replace("-", "").replace(":", "")
    return f"{stamp}-{run_kind}"


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _json_safe(value: Any) -> Any:
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, Path):
        return _rel(value)
    if isinstance(value, Mapping):
        return {str(key): _json_safe(entry) for key, entry in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(entry) for entry in value]
    return value


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(_json_safe(payload), indent=2)}\n", encoding="utf-8")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _sha256_file(path: Path) -> str:
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


def _load_config(config_path: Path | None) -> tuple[Path, dict[str, Any]]:
    resolved = (config_path or DEFAULT_CONFIG).resolve()
    config = _read_json(resolved)
    if config.get("blockId") != "BT93C" or config.get("phaseId") != "93C.3":
        raise RuntimeError(f"BT93C learner config has wrong scope: {_rel(resolved)}")
    return resolved, config


def _validate_gate_inputs(config: Mapping[str, Any]) -> dict[str, Any]:
    artifacts = config.get("artifacts") or {}
    start_manifest_path = _repo_path(str(artifacts.get("startManifest")))
    dependency_report_path = _repo_path(str(artifacts.get("dependencyLockReport")))
    clean_env_report_path = _repo_path(str(artifacts.get("cleanEnvReport")))
    action_surface_report_path = _repo_path(str(artifacts.get("actionSurfaceReport")))
    requirements_path = _repo_path(str(artifacts.get("requirements")))

    start_manifest = _read_json(start_manifest_path)
    dependency_report = _read_json(dependency_report_path)
    clean_env_report = _read_json(clean_env_report_path)
    action_surface_report = _read_json(action_surface_report_path)

    learner_signal = start_manifest.get("learnerStartSignal") or {}
    if learner_signal.get("freezeOk") is not True or learner_signal.get("reAuditRequired") is True:
        raise RuntimeError("BT93C.3 learner start is blocked by freeze/re-audit state")
    if dependency_report.get("ok") is not True or clean_env_report.get("ok") is not True:
        raise RuntimeError("BT93C.3 learner start is blocked by dependency or clean-env gate")
    if action_surface_report.get("ok") is not True:
        raise RuntimeError("BT93C.3 learner start is blocked by action-surface gate")

    return {
        "startManifest": _rel(start_manifest_path),
        "startManifestSha256": _sha256_file(start_manifest_path),
        "dependencyLockReport": _rel(dependency_report_path),
        "dependencyLockReportSha256": _sha256_file(dependency_report_path),
        "cleanEnvReport": _rel(clean_env_report_path),
        "cleanEnvReportSha256": _sha256_file(clean_env_report_path),
        "actionSurfaceReport": _rel(action_surface_report_path),
        "actionSurfaceReportSha256": _sha256_file(action_surface_report_path),
        "requirements": _rel(requirements_path),
        "requirementsSha256": _sha256_file(requirements_path),
        "freezeOk": True,
        "reAuditRequired": False,
        "actionSurfaceId": str((action_surface_report.get("surface") or {}).get("surfaceId") or ""),
        "cleanPython": str(clean_env_report.get("cleanPython") or ""),
        "semanticWindow": start_manifest.get("semanticWindow") or {},
        "matrix": start_manifest.get("matrix") or {},
        "dqnChampion": start_manifest.get("dqnChampion") or {},
    }


def _make_env_factory(
    *,
    seed: int,
    run_id: str,
    env_index: int,
    max_steps: int,
    timeout_seconds: float,
) -> Any:
    def _factory() -> CurviosPpoActionWrapper:
        env = CurviosPpoActionWrapper(
            CurviosEnv(
                max_steps=max_steps,
                default_seed=seed,
                session_id=f"{run_id}-env{env_index}",
                controller_timeout_seconds=timeout_seconds,
            )
        )
        env.action_space.seed(seed)
        return env

    return _factory


def _build_vec_env(
    *,
    config: Mapping[str, Any],
    seeds: list[int],
    run_id: str,
    training: bool,
    vecnormalize_source: Path | None = None,
) -> VecNormalize:
    env_cfg = config["env"]
    norm_cfg = config["normalization"]
    max_steps = int(env_cfg["maxStepsPerEpisode"])
    timeout_seconds = float(env_cfg.get("controllerTimeoutSeconds") or DEFAULT_COMMAND_TIMEOUT_SECONDS)
    base_env = DummyVecEnv([
        _make_env_factory(
            seed=int(seed),
            run_id=run_id,
            env_index=index,
            max_steps=max_steps,
            timeout_seconds=timeout_seconds,
        )
        for index, seed in enumerate(seeds)
    ])
    if seeds:
        base_env.seed(int(seeds[0]))
    if vecnormalize_source is not None:
        vec_env = VecNormalize.load(str(vecnormalize_source), base_env)
    else:
        vec_env = VecNormalize(
            base_env,
            norm_obs=bool(norm_cfg["normalizeObservation"]),
            norm_reward=bool(norm_cfg["normalizeReward"]),
            clip_obs=float(norm_cfg["clipObservation"]),
        )
    vec_env.training = training
    vec_env.norm_reward = False
    if seeds:
        vec_env.seed(int(seeds[0]))
    return vec_env


def _optimizer_summary(model: PPO) -> dict[str, Any]:
    state = model.policy.optimizer.state_dict()
    steps: list[int] = []
    for entry in state.get("state", {}).values():
        step = entry.get("step") if isinstance(entry, Mapping) else None
        if hasattr(step, "item"):
            steps.append(int(step.item()))
        elif isinstance(step, (int, float)):
            steps.append(int(step))
    return {
        "stateEntryCount": len(state.get("state", {})),
        "paramGroupCount": len(state.get("param_groups", [])),
        "maxOptimizerStep": max(steps) if steps else 0,
        "hasOptimizerState": bool(state.get("state")),
    }


def _policy_summary(model: PPO, config: Mapping[str, Any]) -> dict[str, Any]:
    policy = model.policy
    return {
        "policyClass": policy.__class__.__name__,
        "actionDistribution": policy.action_dist.__class__.__name__,
        "featuresExtractor": policy.features_extractor.__class__.__name__,
        "mlpExtractor": policy.mlp_extractor.__class__.__name__,
        "actionNet": {
            "class": policy.action_net.__class__.__name__,
            "outFeatures": int(getattr(policy.action_net, "out_features", 0)),
        },
        "valueNet": {
            "class": policy.value_net.__class__.__name__,
            "outFeatures": int(getattr(policy.value_net, "out_features", 0)),
        },
        "netArch": list((config.get("policy") or {}).get("netArch") or []),
        "observationLength": EXPECTED_OBSERVATION_LENGTH,
        "actionSurface": build_action_surface_manifest(),
    }


def _telemetry(vec_env: VecNormalize) -> list[dict[str, Any]]:
    try:
        return [dict(entry) for entry in vec_env.env_method("get_telemetry_report")]
    except Exception:
        return []


def _write_model_package(
    *,
    model: PPO,
    vec_env: VecNormalize,
    config: Mapping[str, Any],
    config_path: Path,
    run_dir: Path,
    run_id: str,
    run_kind: str,
    phase_id: str,
    gate_inputs: Mapping[str, Any],
    resumed_from: ModelPackage | None,
    learning_report: Mapping[str, Any],
) -> tuple[ModelPackage, dict[str, Any]]:
    checkpoint_dir = run_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    model_path = checkpoint_dir / "model.zip"
    vecnormalize_path = checkpoint_dir / "vecnormalize.pkl"
    optimizer_path = checkpoint_dir / "optimizer_state.pt"
    config_snapshot_path = checkpoint_dir / "config.json"
    report_path = run_dir / "training_report.json"
    manifest_path = run_dir / "artifact_manifest.json"

    _write_json(config_snapshot_path, config)
    model.save(str(model_path))
    vec_env.save(str(vecnormalize_path))
    torch.save(
        {
            "checkpointVersion": CHECKPOINT_VERSION,
            "runId": run_id,
            "runKind": run_kind,
            "phaseId": phase_id,
            "optimizerStateDict": model.policy.optimizer.state_dict(),
            "optimizerSummary": _optimizer_summary(model),
        },
        optimizer_path,
    )

    package = ModelPackage(
        manifest_path=manifest_path,
        run_id=run_id,
        model_path=model_path,
        vecnormalize_path=vecnormalize_path,
        optimizer_path=optimizer_path,
        config_path=config_snapshot_path,
        model_sha256=_sha256_file(model_path),
        vecnormalize_sha256=_sha256_file(vecnormalize_path),
        optimizer_sha256=_sha256_file(optimizer_path),
        config_sha256=_sha256_file(config_snapshot_path),
    )
    manifest = {
        "manifestVersion": CHECKPOINT_VERSION,
        "generatedAt": _utc_now(),
        "generatedBy": "python/train.py",
        "blockId": "BT93C",
        "phaseId": phase_id,
        "runId": run_id,
        "runKind": run_kind,
        "profileId": config["profileId"],
        "gitSha": _git_sha(),
        "truePpoModelPackage": True,
        "scaffoldOnly": False,
        "baselineRunsStarted": False,
        "pilotRunsStarted": False,
        "promotionAllowed": False,
        "resumedFrom": _package_pointer(resumed_from) if resumed_from else None,
        "artifacts": {
            "model": _rel(model_path),
            "modelSha256": package.model_sha256,
            "vecnormalize": _rel(vecnormalize_path),
            "vecnormalizeSha256": package.vecnormalize_sha256,
            "optimizerState": _rel(optimizer_path),
            "optimizerStateSha256": package.optimizer_sha256,
            "config": _rel(config_snapshot_path),
            "configSha256": package.config_sha256,
            "trainingReport": _rel(report_path),
            "artifactManifest": _rel(manifest_path),
        },
        "sourceConfig": {
            "path": _rel(config_path),
            "sha256": _sha256_file(config_path),
        },
        "gateInputs": dict(gate_inputs),
        "trainingCommand": " ".join(sys.argv),
        "policy": _policy_summary(model, config),
        "optimizer": _optimizer_summary(model),
        "learning": dict(learning_report),
        "guardrails": {
            "readOnlyRuntimeSurfaces": list(READ_ONLY_RUNTIME_SURFACES),
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
        },
    }
    _write_json(manifest_path, manifest)
    return package, manifest


def _package_pointer(package: ModelPackage | None) -> dict[str, Any] | None:
    if package is None:
        return None
    return {
        "runId": package.run_id,
        "artifactManifest": _rel(package.manifest_path),
        "model": _rel(package.model_path),
        "modelSha256": package.model_sha256,
        "vecnormalize": _rel(package.vecnormalize_path),
        "vecnormalizeSha256": package.vecnormalize_sha256,
        "optimizerState": _rel(package.optimizer_path),
        "optimizerStateSha256": package.optimizer_sha256,
        "config": _rel(package.config_path),
        "configSha256": package.config_sha256,
    }


def _resolve_package(checkpoint: str | None, artifact_root: Path, *, prefer: str = "latest_model_package.json") -> ModelPackage:
    source = _repo_path(checkpoint) if checkpoint else artifact_root / prefer
    if source.is_dir():
        source = source / "artifact_manifest.json"
    payload = _read_json(source)
    if "artifactManifest" in payload:
        source = _repo_path(str(payload["artifactManifest"]))
        payload = _read_json(source)
    artifacts = payload.get("artifacts")
    if not isinstance(artifacts, Mapping):
        raise RuntimeError(f"model package manifest is malformed: {_rel(source)}")
    return ModelPackage(
        manifest_path=source.resolve(),
        run_id=str(payload.get("runId") or ""),
        model_path=_repo_path(str(artifacts["model"])),
        vecnormalize_path=_repo_path(str(artifacts["vecnormalize"])),
        optimizer_path=_repo_path(str(artifacts["optimizerState"])),
        config_path=_repo_path(str(artifacts["config"])),
        model_sha256=str(artifacts["modelSha256"]),
        vecnormalize_sha256=str(artifacts["vecnormalizeSha256"]),
        optimizer_sha256=str(artifacts["optimizerStateSha256"]),
        config_sha256=str(artifacts["configSha256"]),
    )


def run_training_from_cli(
    *,
    run_kind: str,
    phase_id: str,
    config_path: str | None,
    artifact_root: str | None,
    total_timesteps: int | None,
    checkpoint: str | None,
) -> dict[str, Any]:
    if run_kind not in {"learner-smoke", "resume-smoke"}:
        raise RuntimeError(f"unsupported BT93C train run kind: {run_kind}")
    resolved_config_path, config = _load_config(Path(config_path).resolve() if config_path else None)
    gate_inputs = _validate_gate_inputs(config)
    artifact_root_path = _repo_path(artifact_root or str((config.get("artifacts") or {}).get("root") or DEFAULT_ARTIFACT_ROOT))
    run_id = _run_id(run_kind)
    run_dir = artifact_root_path / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)

    env_cfg = config["env"]
    rollout_cfg = config["rollout"]
    algorithm_cfg = config["algorithm"]
    seeds = [int(seed) for seed in env_cfg["trainSeeds"][: int(env_cfg["envCount"])]]
    source_package = None
    if run_kind == "resume-smoke":
        source_package = _resolve_package(checkpoint, artifact_root_path, prefer="latest_learner_smoke.json")
    timesteps = int(total_timesteps or rollout_cfg["resumeTimesteps" if run_kind == "resume-smoke" else "learnerTimesteps"])

    vec_env: VecNormalize | None = None
    try:
        vec_env = _build_vec_env(
            config=config,
            seeds=seeds,
            run_id=run_id,
            training=True,
            vecnormalize_source=source_package.vecnormalize_path if source_package else None,
        )
        if source_package is not None:
            model = PPO.load(str(source_package.model_path), env=vec_env, device=str(algorithm_cfg["device"]))
        else:
            model = PPO(
                str(algorithm_cfg["policy"]),
                vec_env,
                n_steps=int(rollout_cfg["nStepsPerEnv"]),
                batch_size=int(rollout_cfg["batchSize"]),
                n_epochs=int(rollout_cfg["nEpochs"]),
                gamma=float(algorithm_cfg["gamma"]),
                gae_lambda=float(algorithm_cfg["gaeLambda"]),
                learning_rate=float(algorithm_cfg["learningRate"]),
                clip_range=float(algorithm_cfg["clipRange"]),
                ent_coef=float(algorithm_cfg["entCoef"]),
                vf_coef=float(algorithm_cfg["vfCoef"]),
                max_grad_norm=float(algorithm_cfg["maxGradNorm"]),
                seed=int(seeds[0]),
                device=str(algorithm_cfg["device"]),
                policy_kwargs={"net_arch": list(config["policy"]["netArch"])},
                verbose=0,
            )
        updates_before = int(getattr(model, "_n_updates", 0))
        started = time.perf_counter()
        model.learn(total_timesteps=timesteps, reset_num_timesteps=(run_kind == "learner-smoke"))
        elapsed = time.perf_counter() - started
        updates_after = int(getattr(model, "_n_updates", 0))
        learning_report = {
            "requestedTimesteps": timesteps,
            "modelNumTimesteps": int(model.num_timesteps),
            "optimizerUpdatesBefore": updates_before,
            "optimizerUpdatesAfter": updates_after,
            "optimizerUpdatesCompleted": updates_after > updates_before,
            "wallClockSeconds": round(elapsed, 6),
            "stepsPerSecond": round(float(model.num_timesteps) / elapsed, 6) if elapsed > 0 else 0.0,
            "telemetry": _telemetry(vec_env),
            "trainingCommand": " ".join(sys.argv),
        }
        package, manifest = _write_model_package(
            model=model,
            vec_env=vec_env,
            config=config,
            config_path=resolved_config_path,
            run_dir=run_dir,
            run_id=run_id,
            run_kind=run_kind,
            phase_id=phase_id,
            gate_inputs=gate_inputs,
            resumed_from=source_package,
            learning_report=learning_report,
        )
        report = {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/train.py",
            "blockId": "BT93C",
            "phaseId": phase_id,
            "runId": run_id,
            "runKind": run_kind,
            "truePpoOptimizerUpdate": learning_report["optimizerUpdatesCompleted"],
            "truePpoModelPackage": True,
            "resumedFrom": _package_pointer(source_package) if source_package else None,
            "learning": learning_report,
            "artifacts": manifest["artifacts"],
            "policy": manifest["policy"],
            "optimizer": manifest["optimizer"],
            "gateInputs": gate_inputs,
            "guardrails": manifest["guardrails"],
        }
        report_path = run_dir / "training_report.json"
        _write_json(report_path, report)
        pointer = {
            "runId": run_id,
            "runKind": run_kind,
            "ok": True,
            "report": _rel(report_path),
            "artifactManifest": _rel(package.manifest_path),
            "model": _rel(package.model_path),
            "vecnormalize": _rel(package.vecnormalize_path),
            "optimizerState": _rel(package.optimizer_path),
        }
        _write_json(artifact_root_path / f"latest_{run_kind.replace('-', '_')}.json", pointer)
        _write_json(artifact_root_path / "latest_model_package.json", pointer)
        _write_json(artifact_root_path / "latest_run.json", pointer)
        print(json.dumps({
            "ok": True,
            "runId": run_id,
            "runKind": run_kind,
            "report": _rel(report_path),
            "artifactManifest": _rel(package.manifest_path),
            "optimizerUpdatesAfter": updates_after,
            "modelSha256": package.model_sha256,
        }, indent=2))
        return report
    finally:
        if vec_env is not None:
            vec_env.close()


def run_eval_from_cli(
    *,
    phase_id: str,
    config_path: str | None,
    artifact_root: str | None,
    eval_steps: int | None,
    checkpoint: str | None,
) -> dict[str, Any]:
    resolved_config_path, config = _load_config(Path(config_path).resolve() if config_path else None)
    gate_inputs = _validate_gate_inputs(config)
    artifact_root_path = _repo_path(artifact_root or str((config.get("artifacts") or {}).get("root") or DEFAULT_ARTIFACT_ROOT))
    source_package = _resolve_package(checkpoint, artifact_root_path)
    run_id = _run_id("eval-smoke")
    run_dir = artifact_root_path / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    env_cfg = config["env"]
    seeds = [int(seed) for seed in env_cfg["evalSeeds"][: int(env_cfg["evalEnvCount"])]]
    steps = int(eval_steps or config["rollout"]["evalSteps"])

    vec_env: VecNormalize | None = None
    try:
        vec_env = _build_vec_env(
            config=config,
            seeds=seeds,
            run_id=run_id,
            training=False,
            vecnormalize_source=source_package.vecnormalize_path,
        )
        load_started = time.perf_counter()
        model = PPO.load(
            str(source_package.model_path),
            device=str(config["algorithm"]["device"]),
            force_reset=False,
        )
        model.set_env(vec_env, force_reset=False)
        load_elapsed_ms = (time.perf_counter() - load_started) * 1000.0
        obs = vec_env.reset()
        forward_started = time.perf_counter()
        model.predict(obs[:1], deterministic=True)
        forward_elapsed_ms = (time.perf_counter() - forward_started) * 1000.0

        rewards: list[float] = []
        done_count = 0
        info_tail: list[dict[str, Any]] = []
        for _ in range(steps):
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, done, infos = vec_env.step(action)
            rewards.extend(float(entry) for entry in np.asarray(reward).reshape(-1))
            done_count += int(np.count_nonzero(done))
            for info in infos:
                if len(info_tail) < 4:
                    info_tail.append(dict(info))
        report = {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/eval.py",
            "blockId": "BT93C",
            "phaseId": phase_id,
            "runId": run_id,
            "runKind": "eval-smoke",
            "loadedRealPpoModel": True,
            "sourcePackage": _package_pointer(source_package),
            "modelReload": {
                "wallClockMs": round(load_elapsed_ms, 6),
                "modelSha256": _sha256_file(source_package.model_path),
                "hashMatchesManifest": _sha256_file(source_package.model_path) == source_package.model_sha256,
            },
            "forwardPass": {
                "batchSize": 1,
                "wallClockMs": round(forward_elapsed_ms, 6),
                "countsAsJsTickLatency": False,
            },
            "eval": {
                "steps": steps,
                "rewardTotal": round(sum(rewards), 6),
                "rewardMean": round(sum(rewards) / len(rewards), 6) if rewards else 0.0,
                "doneCount": done_count,
                "telemetry": _telemetry(vec_env),
                "infoTail": info_tail,
            },
            "artifacts": {
                "evalReport": _rel(run_dir / "eval_report.json"),
                "sourceArtifactManifest": _rel(source_package.manifest_path),
                "sourceModel": _rel(source_package.model_path),
                "sourceVecNormalize": _rel(source_package.vecnormalize_path),
            },
            "sourceConfig": {
                "path": _rel(resolved_config_path),
                "sha256": _sha256_file(resolved_config_path),
            },
            "gateInputs": gate_inputs,
            "guardrails": {
                "readOnlyRuntimeSurfaces": list(READ_ONLY_RUNTIME_SURFACES),
                "runtimeSurfacesTouched": [],
                "productiveRuntimeChanged": False,
                "baselineRunsStarted": False,
                "pilotRunsStarted": False,
            },
        }
        report_path = run_dir / "eval_report.json"
        _write_json(report_path, report)
        pointer = {
            "runId": run_id,
            "runKind": "eval-smoke",
            "ok": True,
            "report": _rel(report_path),
            "sourceArtifactManifest": _rel(source_package.manifest_path),
            "sourceModel": _rel(source_package.model_path),
        }
        _write_json(artifact_root_path / "latest_eval_smoke.json", pointer)
        print(json.dumps({
            "ok": True,
            "runId": run_id,
            "report": _rel(report_path),
            "sourceArtifactManifest": _rel(source_package.manifest_path),
            "forwardPassMs": report["forwardPass"]["wallClockMs"],
            "rewardTotal": report["eval"]["rewardTotal"],
        }, indent=2))
        return report
    finally:
        if vec_env is not None:
            vec_env.close()
