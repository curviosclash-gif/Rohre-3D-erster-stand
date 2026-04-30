"""BT93RR.1 artifact probe for the BT93R-Reentry.

The probe loads the active BT93Y retrain-lineage package and records concrete
model, VecNormalize, optimizer-state, action-surface, observation-length, and
logit/action-probability evidence. It does not train, run quality evaluation,
apply fixes, consume holdout data, create candidates, or touch runtime
surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.utils import obs_as_tensor
from stable_baselines3.common.vec_env import VecNormalize


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)
from scripts.bt93y_retrain_lineage import _build_vec_env  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93R_REENTRY_ROOT = PPO_ROOT / "bt93r_reentry"
BT93Y_ROOT = PPO_ROOT / "bt93y"
PACKAGE_ROOT = BT93Y_ROOT / "retrain_lineage" / "bt93y-retrain-lineage-v1"

HANDOVER_LOCK_PATH = BT93R_REENTRY_ROOT / "bt93r_reentry_handover_lock_report.json"
OUTPUT_PATH = BT93R_REENTRY_ROOT / "bt93r_reentry_artifact_probe_report.json"

CONFIG_PATH = PACKAGE_ROOT / "config.json"
MODEL_PATH = PACKAGE_ROOT / "model.zip"
VECNORMALIZE_PATH = PACKAGE_ROOT / "vecnormalize.pkl"
OPTIMIZER_PATH = PACKAGE_ROOT / "optimizer_state.pt"
PACKAGE_MANIFEST_PATH = PACKAGE_ROOT / "artifact_manifest.json"
TRAINING_REPORT_PATH = PACKAGE_ROOT / "training_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

PROBE_SEEDS = (944, 945, 946)

SOURCE_PATHS: dict[str, tuple[Path, str]] = {
    "bt93rrHandoverLock": (HANDOVER_LOCK_PATH, "BT93RR.1 handover lock"),
    "bt93yConfig": (CONFIG_PATH, "BT93Y retrain-lineage config"),
    "bt93yModel": (MODEL_PATH, "BT93Y retrain-lineage model"),
    "bt93yVecNormalize": (VECNORMALIZE_PATH, "BT93Y retrain-lineage VecNormalize"),
    "bt93yOptimizerState": (OPTIMIZER_PATH, "BT93Y retrain-lineage optimizer state"),
    "bt93yPackageManifest": (PACKAGE_MANIFEST_PATH, "BT93Y retrain-lineage artifact manifest"),
    "bt93yTrainingReport": (TRAINING_REPORT_PATH, "BT93Y retrain-lineage training report"),
    "ppoActionSurface": (ACTION_SURFACE_PATH, "current PPO action-surface source"),
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
    "reward/action/telemetry/safety fix during 93RR.1",
]


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


def _round(value: Any, digits: int = 6) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return round(number, digits)


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
        "newEvalRunStarted": False,
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


def _distribution_snapshot(model: PPO, obs: np.ndarray) -> dict[str, Any]:
    with torch.no_grad():
        obs_tensor = obs_as_tensor(obs, model.device)
        distribution = model.policy.get_distribution(obs_tensor).distribution
        probs = distribution.probs.detach().cpu().numpy()[0]
        logits = getattr(distribution, "logits", None)
        entropy = distribution.entropy().detach().cpu().numpy()[0]
    ranked_indices = list(np.argsort(probs)[::-1])
    semantic_names = [name for name, _patch in MASKED_SEMANTIC_ACTIONS]
    ranked = [
        {
            "token": int(index),
            "semanticAction": semantic_names[index] if index < len(semantic_names) else f"unknown-{index}",
            "probability": _round(probs[index]),
            "logit": _round(logits.detach().cpu().numpy()[0][index]) if logits is not None else None,
        }
        for index in ranked_indices
    ]
    return {
        "entropy": _round(entropy),
        "argmaxToken": int(ranked_indices[0]) if ranked_indices else None,
        "argmaxAction": ranked[0]["semanticAction"] if ranked else None,
        "argmaxProbability": ranked[0]["probability"] if ranked else None,
        "secondBestToken": int(ranked_indices[1]) if len(ranked_indices) > 1 else None,
        "secondBestAction": ranked[1]["semanticAction"] if len(ranked) > 1 else None,
        "secondBestProbability": ranked[1]["probability"] if len(ranked) > 1 else None,
        "argmaxMargin": _round((float(probs[ranked_indices[0]]) - float(probs[ranked_indices[1]])) if len(ranked_indices) > 1 else None),
        "rankedActions": ranked,
    }


def _load_optimizer_state(path: Path) -> dict[str, Any]:
    state = torch.load(path, map_location="cpu")
    if not isinstance(state, Mapping):
        return {"loaded": True, "type": type(state).__name__, "paramGroupCount": None, "stateEntryCount": None}
    return {
        "loaded": True,
        "type": type(state).__name__,
        "topLevelKeys": sorted(str(key) for key in state.keys()),
        "paramGroupCount": len(state.get("param_groups", [])) if isinstance(state.get("param_groups"), list) else None,
        "stateEntryCount": len(state.get("state", {})) if isinstance(state.get("state"), Mapping) else None,
    }


def _probe_observation_samples(config: Mapping[str, Any], model: PPO) -> tuple[list[dict[str, Any]], list[str]]:
    samples: list[dict[str, Any]] = []
    errors: list[str] = []
    for seed in PROBE_SEEDS:
        vec_env: VecNormalize | None = None
        try:
            vec_env, _metric_env = _build_vec_env(
                seed=int(seed),
                label=f"rr1-sample-{seed}",
                max_steps=int(config["runContract"]["maxStepsPerEpisode"]),
                reward_profile_id=str(config["rewardProfileId"]),
                training=False,
                vecnormalize_source=VECNORMALIZE_PATH,
            )
            obs = vec_env.reset()
            action, _state = model.predict(obs, deterministic=True)
            token = int(np.asarray(action).reshape(-1)[0])
            semantic_names = [name for name, _patch in MASKED_SEMANTIC_ACTIONS]
            samples.append(
                {
                    "seed": int(seed),
                    "observationShape": list(np.asarray(obs).shape),
                    "observationLength": int(np.asarray(obs).reshape(-1).shape[0]),
                    "deterministicActionToken": token,
                    "deterministicAction": semantic_names[token] if 0 <= token < len(semantic_names) else f"unknown-{token}",
                    "distribution": _distribution_snapshot(model, obs),
                }
            )
        except Exception as exc:  # pragma: no cover - diagnostic report path
            errors.append(f"seed {seed}: {exc.__class__.__name__}: {exc}")
        finally:
            if vec_env is not None:
                vec_env.close()
    return samples, errors


def build_report() -> dict[str, Any]:
    started = time.perf_counter()
    tracked = _tracked_files(path for path, _role in SOURCE_PATHS.values())
    sources = [
        _source_artifact(key, path, role, tracked)
        for key, (path, role) in SOURCE_PATHS.items()
    ]
    handover = _read_json(HANDOVER_LOCK_PATH)
    config = _read_json(CONFIG_PATH)
    errors: list[str] = []
    model_loaded = False
    normalizer_loaded = False
    config_loaded = bool(config)
    optimizer_loaded = False
    forward_pass_ok = False
    observation_samples: list[dict[str, Any]] = []
    model_summary: dict[str, Any] = {}
    optimizer_summary: dict[str, Any] = {}

    vec_env: VecNormalize | None = None
    try:
        vec_env, _metric_env = _build_vec_env(
            seed=int(PROBE_SEEDS[0]),
            label="rr1-loader-smoke",
            max_steps=int(config["runContract"]["maxStepsPerEpisode"]),
            reward_profile_id=str(config["rewardProfileId"]),
            training=False,
            vecnormalize_source=VECNORMALIZE_PATH,
        )
        normalizer_loaded = True
        model = PPO.load(str(MODEL_PATH), env=vec_env, device="cpu", force_reset=False)
        model_loaded = True
        obs = vec_env.reset()
        model.predict(obs, deterministic=True)
        forward_pass_ok = True
        optimizer_summary = _load_optimizer_state(OPTIMIZER_PATH)
        optimizer_loaded = optimizer_summary.get("loaded") is True
        observation_samples, sample_errors = _probe_observation_samples(config, model)
        errors.extend(sample_errors)
        model_summary = {
            "policyClass": model.policy.__class__.__name__,
            "observationSpace": str(model.observation_space),
            "actionSpace": str(model.action_space),
            "numTimesteps": int(model.num_timesteps),
            "device": str(model.device),
            "nEnv": int(model.n_envs),
            "observationLength": int(np.asarray(obs).reshape(-1).shape[0]),
        }
    except Exception as exc:  # pragma: no cover - diagnostic report path
        errors.append(f"{exc.__class__.__name__}: {exc}")
    finally:
        if vec_env is not None:
            vec_env.close()

    required_sources_present = all(source["exists"] and source["isFile"] for source in sources)
    action_surface = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    action_surface_hash_matches = _sha256_file(ACTION_SURFACE_PATH) == (config.get("actionSurface") or {}).get("sourceSha256")
    semantic_names = [name for name, _patch in MASKED_SEMANTIC_ACTIONS]
    config_surface_names = list((config.get("actionSurface") or {}).get("semanticActions") or [])
    decoder_mapping_ok = semantic_names == config_surface_names
    handover_ok = handover.get("resultClass") == "reentry-handover-lock-green"

    ok = (
        handover_ok
        and required_sources_present
        and model_loaded
        and normalizer_loaded
        and config_loaded
        and optimizer_loaded
        and forward_pass_ok
        and len(observation_samples) == len(PROBE_SEEDS)
        and not errors
        and action_surface_hash_matches
        and decoder_mapping_ok
    )
    result_class = "artifact-probe-green" if ok else "policy-evidence-invalid"

    return {
        "schemaVersion": "bt93rr-reentry-artifact-probe-report-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93r_reentry_artifact_probe.py",
        "blockId": "BT93RR",
        "phaseId": "93RR.1",
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
            "rewardProfileId": config.get("rewardProfileId"),
            "semanticWindow": config.get("semanticWindow"),
        },
        "loaderSmoke": {
            "handoverLockGreen": handover_ok,
            "modelLoadAttempted": True,
            "modelLoaded": model_loaded,
            "configLoaded": config_loaded,
            "normalizerLoaded": normalizer_loaded,
            "optimizerStateLoaded": optimizer_loaded,
            "forwardPassOk": forward_pass_ok,
            "errors": errors,
        },
        "modelSummary": model_summary,
        "optimizerState": optimizer_summary,
        "actionSurface": {
            "surfaceId": action_surface.get("surfaceId"),
            "sourcePath": _rel(ACTION_SURFACE_PATH),
            "sourceSha256": _sha256_file(ACTION_SURFACE_PATH),
            "expectedSourceSha256": (config.get("actionSurface") or {}).get("sourceSha256"),
            "hashMatchesConfig": action_surface_hash_matches,
            "gymSpace": action_surface.get("gymSpace"),
            "semanticActions": semantic_names,
            "semanticActionCount": len(semantic_names),
            "decoderMappingMatchesConfig": decoder_mapping_ok,
            "decoderMapping": [
                {"token": index, "semanticAction": name}
                for index, name in enumerate(semantic_names)
            ],
        },
        "observationProbe": {
            "seeds": list(PROBE_SEEDS),
            "samples": observation_samples,
            "realPolicyDistributionAvailable": bool(observation_samples),
            "qualityClaimAllowed": False,
            "notQualityEvidenceReason": "Observation samples prove loader/logit availability only; no quality or survival judgement is made in 93RR.1.",
        },
        "phaseCoverage": {
            "93RR.1.1": handover_ok,
            "93RR.1.2": model_loaded and normalizer_loaded and config_loaded and optimizer_loaded and forward_pass_ok,
            "93RR.1.3": bool(observation_samples) and all(sample.get("distribution", {}).get("rankedActions") for sample in observation_samples),
            "93RR.1.4": ok or result_class in {"policy-evidence-invalid", "measurement-invalid"},
            "DoD.RR2": ok,
        },
        "guardrails": _guardrails(),
        "claimFlags": _claim_flags(),
        "sampleCounts": {
            "observationSamples": len(observation_samples),
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "steps": 0,
            "probeSeeds": list(PROBE_SEEDS),
        },
        "sourceArtifacts": sources,
        "allowNext": ["93RR.2 collapse-root-cause"] if ok else [],
        "opensNext": ["93RR.2"] if ok else [],
        "blocksNext": BLOCKED_ACTIONS,
        "summary": {
            "finalResult": result_class,
            "modelLoadable": model_loaded,
            "realLogitsAvailable": bool(observation_samples),
            "optimizerStateLoadable": optimizer_loaded,
            "actionSurfaceMatchesConfig": action_surface_hash_matches and decoder_mapping_ok,
            "nextBestAction": "Run 93RR.2 collapse-root-cause only; no fix work yet." if ok else "Stop BT93RR.1 and repair evidence/package loading.",
            "bt93sStartDecision": "blocked until BT93R-Reentry.99 in R-Allowlist",
            "bt93oStartDecision": "blocked",
            "bt93pStartDecision": "blocked",
            "bt94aStartDecision": "blocked",
        },
        "commands": {
            "write": "python python/scripts/bt93r_reentry_artifact_probe.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
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
