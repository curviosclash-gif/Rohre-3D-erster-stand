"""Prepare the BT93B conservative scaffold config and manifest template."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent

BT93A_HANDOVER_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt93a_handover_2env.json"
BT93A_CLAIM_MANIFEST_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt93a_claim_manifest.json"
BT93B_PLAN_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt93b_scaffold_plan.json"
BT93B_MANIFEST_TEMPLATE_PATH = REPO_ROOT / "data" / "training" / "ppo" / "run_manifest.bt93b.template.json"
BT93B_CONFIG_PATH = REPO_ROOT / "python" / "configs" / "ppo_baseline.yaml"

TARGET_UPDATE_WINDOW_SECONDS = 15
N_STEPS_BUCKET = 64
SELECTED_BATCH_SIZE = 128
GLOBAL_SEED = 930
TRAIN_ENV_SEEDS = [930, 931]
EVAL_ENV_SEEDS = [940, 941]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _round_down_to_bucket(value: int, bucket: int) -> int:
    rounded = (int(value) // bucket) * bucket
    return max(bucket, rounded)


def _find_rollout_example(handover: dict[str, Any], target_seconds: int) -> dict[str, Any]:
    examples = handover.get("rolloutBudgetDerivation", {}).get("examples", [])
    for example in examples:
        if int(example.get("targetUpdateWindowSeconds") or 0) == target_seconds:
            return dict(example)
    raise RuntimeError(f"BT93A handover is missing the {target_seconds}s rollout example.")


def _build_scaffold_matrix(env_count: int) -> list[dict[str, Any]]:
    return [
        {
            "kind": "fresh-smoke",
            "label": "bt93b-fresh-smoke-v1",
            "envCount": env_count,
            "resumeMode": "fresh",
            "purpose": "minimal end-to-end scaffold smoke on the measured 2-env lane",
        },
        {
            "kind": "resume-smoke",
            "label": "bt93b-resume-smoke-v1",
            "envCount": env_count,
            "resumeMode": "resume-latest-checkpoint",
            "purpose": "checkpoint/resume smoke without claiming a larger baseline",
        },
        {
            "kind": "eval-smoke",
            "label": "bt93b-eval-smoke-v1",
            "envCount": env_count,
            "resumeMode": "manifest-driven-eval",
            "purpose": "manifest/eval smoke for scaffold artifacts only",
        },
    ]


def _build_manifest_template(
    *,
    handover: dict[str, Any],
    claim_manifest: dict[str, Any],
    rollout_example: dict[str, Any],
    selected_n_steps_per_env: int,
    selected_rollout_steps_total: int,
) -> dict[str, Any]:
    measured_lane = handover["measuredLane"]
    scaffold_contract = handover["scaffoldContract"]
    action_boundary = claim_manifest["splitHandover"]["bt92BoundarySurface"]

    return {
        "templateVersion": "bt93b-scaffold-v1",
        "blockId": "BT93B",
        "phaseId": "93B.1.1",
        "profileId": "bt93b-conservative-scaffold-v1",
        "scaffoldOnly": True,
        "promotionAllowed": False,
        "bt94aGate": "closed",
        "sourceArtifacts": {
            "bt93aHandover": str(BT93A_HANDOVER_PATH.relative_to(REPO_ROOT)),
            "bt93aClaimManifest": str(BT93A_CLAIM_MANIFEST_PATH.relative_to(REPO_ROOT)),
        },
        "lane": {
            "envCount": int(scaffold_contract["defaultStartEnvCount"]),
            "maxValidatedEnvCount": int(scaffold_contract["maxValidatedEnvCount"]),
            "measuredStepsPerSecond": float(measured_lane["stepsPerSecond"]),
            "fourEnvStatus": "locked-for-bt93b-scaffold",
            "fourEnvReason": "BT93B starts on the smallest validated lane even when BT93A thresholds would allow a follow-up measurement.",
        },
        "seedPack": {
            "globalSeed": GLOBAL_SEED,
            "trainEnvSeeds": list(TRAIN_ENV_SEEDS),
            "evalEnvSeeds": list(EVAL_ENV_SEEDS),
        },
        "rollout": {
            "targetUpdateWindowSeconds": int(rollout_example["targetUpdateWindowSeconds"]),
            "measuredMaxRolloutStepsTotal": int(rollout_example["maxRolloutStepsTotalAtMeasuredLane"]),
            "measuredMaxNstepsPerEnv": int(rollout_example["maxNstepsAtValidatedLane"]),
            "selectedNstepsPerEnv": selected_n_steps_per_env,
            "selectedRolloutStepsTotal": selected_rollout_steps_total,
            "selectedBatchSize": SELECTED_BATCH_SIZE,
            "nEpochs": 4,
            "selectionRule": "round down the measured per-env budget to the nearest 64-step bucket for conservative scaffold mini-batches",
        },
        "matrix": {
            "matrixId": "bt93b-scaffold-smoke-matrix-v1",
            "modeId": "runtime-near-headless-v1",
            "runs": _build_scaffold_matrix(int(scaffold_contract["defaultStartEnvCount"])),
        },
        "actionSurface": {
            "adapterId": "pending-93B.1.2",
            "splitHeadRequired": True,
            "booleanFields": list(action_boundary["booleanFields"]),
            "indexFields": list(action_boundary["indexFields"]),
            "rawBoundarySurfaceOnly": bool(action_boundary["rawIndexSurfaceOnly"]),
            "trainingOnRawBoundarySurface": False,
        },
        "normalization": {
            "status": "pending-93B.1.3",
            "adapter": "VecNormalize-or-equivalent",
            "note": "State normalization stays a hard prerequisite before the first baseline scaffold run.",
        },
        "actorCriticHeads": {
            "status": "pending-93B.1.3",
            "note": "Actor/Critic head definitions stay explicit and separate from the raw BT92 boundary surface.",
        },
    }


def build_scaffold_plan() -> dict[str, Any]:
    handover = _read_json(BT93A_HANDOVER_PATH)
    claim_manifest = _read_json(BT93A_CLAIM_MANIFEST_PATH)
    rollout_example = _find_rollout_example(handover, TARGET_UPDATE_WINDOW_SECONDS)
    measured_lane = handover["measuredLane"]
    scaffold_contract = handover["scaffoldContract"]

    env_count = int(scaffold_contract["defaultStartEnvCount"])
    max_n_steps_per_env = int(rollout_example["maxNstepsAtValidatedLane"])
    selected_n_steps_per_env = _round_down_to_bucket(max_n_steps_per_env, N_STEPS_BUCKET)
    selected_rollout_steps_total = selected_n_steps_per_env * env_count
    measured_rollout_steps_total = int(rollout_example["maxRolloutStepsTotalAtMeasuredLane"])

    if env_count != 2:
        raise RuntimeError(f"BT93B expects the measured BT93A start lane to stay at 2 envs, got {env_count}.")
    if selected_rollout_steps_total > measured_rollout_steps_total:
        raise RuntimeError("Selected scaffold rollout exceeds the measured BT93A lane budget.")
    if selected_rollout_steps_total % SELECTED_BATCH_SIZE != 0:
        raise RuntimeError("Selected scaffold rollout must divide cleanly into the chosen batch size.")

    manifest_template = _build_manifest_template(
        handover=handover,
        claim_manifest=claim_manifest,
        rollout_example=rollout_example,
        selected_n_steps_per_env=selected_n_steps_per_env,
        selected_rollout_steps_total=selected_rollout_steps_total,
    )
    plan = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93b_prepare_scaffold.py",
        "targetPhase": "93B.1.1",
        "sourceArtifacts": {
            "bt93aHandover": str(BT93A_HANDOVER_PATH.relative_to(REPO_ROOT)),
            "bt93aClaimManifest": str(BT93A_CLAIM_MANIFEST_PATH.relative_to(REPO_ROOT)),
        },
        "laneContract": {
            "validatedEnvCount": env_count,
            "fourEnvForScaffold": "locked",
            "fourEnvReason": "BT93B stays on the smallest validated 2-env lane until a later dedicated 4-env artifact exists.",
            "measuredStepsPerSecond": float(measured_lane["stepsPerSecond"]),
            "failureRate": float(measured_lane["failureRate"]),
            "timeoutRatePerRequest": float(measured_lane["timeoutRatePerRequest"]),
            "memoryStable": bool(measured_lane["memoryStable"]),
        },
        "seedPack": {
            "globalSeed": GLOBAL_SEED,
            "trainEnvSeeds": list(TRAIN_ENV_SEEDS),
            "evalEnvSeeds": list(EVAL_ENV_SEEDS),
        },
        "scaffoldBudget": {
            "targetUpdateWindowSeconds": int(rollout_example["targetUpdateWindowSeconds"]),
            "measuredMaxRolloutStepsTotal": measured_rollout_steps_total,
            "measuredMaxNstepsPerEnv": max_n_steps_per_env,
            "selectedNstepsPerEnv": selected_n_steps_per_env,
            "selectedRolloutStepsTotal": selected_rollout_steps_total,
            "selectedBatchSize": SELECTED_BATCH_SIZE,
            "bufferUtilizationRatio": round(selected_rollout_steps_total / measured_rollout_steps_total, 4),
            "selectionRule": "nearest lower 64-step bucket under the measured BT93A 15s rollout ceiling",
        },
        "algorithm": {
            "library": "stable-baselines3 (planned)",
            "name": "PPO",
            "policy": "MlpPolicy",
            "device": "cpu",
            "gamma": 0.99,
            "gaeLambda": 0.95,
            "learningRate": 0.0003,
            "clipRange": 0.2,
            "entCoef": 0.01,
            "vfCoef": 0.5,
            "maxGradNorm": 0.5,
        },
        "scaffoldMatrix": _build_scaffold_matrix(env_count),
        "manifestTemplatePath": str(BT93B_MANIFEST_TEMPLATE_PATH.relative_to(REPO_ROOT)),
        "configPath": str(BT93B_CONFIG_PATH.relative_to(REPO_ROOT)),
        "pendingPhasePins": {
            "actionAdapter": "93B.1.2",
            "normalizationAndHeads": "93B.1.3",
        },
        "manifestTemplate": manifest_template,
        "nextPhase": "93B.1.2",
    }
    return plan


def render_yaml_config(plan: dict[str, Any]) -> str:
    lane = plan["laneContract"]
    budget = plan["scaffoldBudget"]
    seeds = plan["seedPack"]
    lines = [
        "# BT93B conservative scaffold derived from measured BT93A 2-env evidence.",
        "block_id: BT93B",
        "phase_id: 93B.1.1",
        "profile_id: bt93b-conservative-scaffold-v1",
        "scaffold_only: true",
        "",
        "source_artifacts:",
        f"  bt93a_handover: {BT93A_HANDOVER_PATH.relative_to(REPO_ROOT).as_posix()}",
        f"  bt93a_claim_manifest: {BT93A_CLAIM_MANIFEST_PATH.relative_to(REPO_ROOT).as_posix()}",
        f"  manifest_template: {BT93B_MANIFEST_TEMPLATE_PATH.relative_to(REPO_ROOT).as_posix()}",
        "",
        "lane:",
        f"  env_count: {lane['validatedEnvCount']}",
        f"  measured_steps_per_second: {lane['measuredStepsPerSecond']}",
        f"  failure_rate: {lane['failureRate']}",
        "  four_env_for_scaffold: locked",
        "",
        "seeds:",
        f"  global_seed: {seeds['globalSeed']}",
        "  train_env_seeds:",
        *[f"    - {value}" for value in seeds["trainEnvSeeds"]],
        "  eval_env_seeds:",
        *[f"    - {value}" for value in seeds["evalEnvSeeds"]],
        "",
        "rollout:",
        f"  target_update_window_seconds: {budget['targetUpdateWindowSeconds']}",
        f"  measured_max_rollout_steps_total: {budget['measuredMaxRolloutStepsTotal']}",
        f"  measured_max_n_steps_per_env: {budget['measuredMaxNstepsPerEnv']}",
        f"  selected_n_steps_per_env: {budget['selectedNstepsPerEnv']}",
        f"  selected_rollout_steps_total: {budget['selectedRolloutStepsTotal']}",
        f"  selected_batch_size: {budget['selectedBatchSize']}",
        "  n_epochs: 4",
        f"  selection_rule: {budget['selectionRule']}",
        "",
        "algorithm:",
        "  library: stable-baselines3",
        "  name: PPO",
        "  policy: MlpPolicy",
        "  device: cpu",
        "  gamma: 0.99",
        "  gae_lambda: 0.95",
        "  learning_rate: 0.0003",
        "  clip_range: 0.2",
        "  ent_coef: 0.01",
        "  vf_coef: 0.5",
        "  max_grad_norm: 0.5",
        "",
        "matrix:",
        "  matrix_id: bt93b-scaffold-smoke-matrix-v1",
        "  mode_id: runtime-near-headless-v1",
        "  scaffold_runs:",
        "    - fresh-smoke",
        "    - resume-smoke",
        "    - eval-smoke",
        "",
        "action_surface:",
        "  split_head_adapter: pending-93B.1.2",
        "  training_on_raw_boundary_surface: false",
        "",
        "normalization:",
        "  state_normalization: pending-93B.1.3",
        "  actor_critic_heads: pending-93B.1.3",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    plan = build_scaffold_plan()
    _write_json(BT93B_PLAN_PATH, plan)
    _write_json(BT93B_MANIFEST_TEMPLATE_PATH, plan["manifestTemplate"])
    BT93B_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    BT93B_CONFIG_PATH.write_text(render_yaml_config(plan), encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "artifact": str(BT93B_PLAN_PATH.relative_to(REPO_ROOT)),
        "configPath": str(BT93B_CONFIG_PATH.relative_to(REPO_ROOT)),
        "manifestTemplatePath": str(BT93B_MANIFEST_TEMPLATE_PATH.relative_to(REPO_ROOT)),
        "envCount": plan["laneContract"]["validatedEnvCount"],
        "selectedNstepsPerEnv": plan["scaffoldBudget"]["selectedNstepsPerEnv"],
        "selectedBatchSize": plan["scaffoldBudget"]["selectedBatchSize"],
        "matrixRunCount": len(plan["scaffoldMatrix"]),
        "nextPhase": plan["nextPhase"],
    }, indent=2))


if __name__ == "__main__":
    main()
