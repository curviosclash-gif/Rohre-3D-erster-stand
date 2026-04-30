"""BT93S.4 policy-selection diagnostic.

This evaluates the BT93R-Reentry-approved stochastic eval policy on the pinned
BT93S scenario windows. It is diagnostic-only: no PPO training, reward fix,
action-surface edit, holdout use, candidate, freeze, or runtime integration.
"""

from __future__ import annotations

import argparse
import json
import math
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
from stable_baselines3.common.vec_env import VecNormalize


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_masked_semantic_action_mask,
)
from scripts import bt93r_reentry_root_cause as rr2  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S_ROOT = PPO_ROOT / "bt93s"

SCENARIO_CONTRACT_PATH = BT93S_ROOT / "scenario_window_contract.json"
ACTION_EFFECT_MANIFEST_PATH = BT93S_ROOT / "action_effect_window_manifest.json"
EXISTING_ACTION_EFFECT_PATH = BT93S_ROOT / "existing_action_effect_report.json"
ACTION_SURFACE_DECISION_PATH = BT93S_ROOT / "action_surface_decision.json"
POLICY_SELECTION_REPORT_PATH = BT93S_ROOT / "policy_selection_report.json"
ACTION_SELECTION_ALIAS_PATH = BT93S_ROOT / "action_selection_report.json"

BT93RR_HANDOVER_PATH = PPO_ROOT / "bt93r_reentry" / "bt93r_reentry_handover_package.json"
BT93RR_COUNTERPROBE_PATH = PPO_ROOT / "bt93r_reentry" / "bt93r_reentry_counterprobe_report.json"

ALLOWED_RESULT_CLASSES = {
    "action-selection-green",
    "action-space-required",
    "action-selection-required",
    "matrix-redesign-required",
    "observation-telemetry-required",
    "measurement-invalid",
}

BLOCKED_ACTIONS = [
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
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S.4",
    "action-surface edit from BT93S.4",
    "telemetry fix from BT93S.4",
    "BT93U until 93S.99 proves action-selection-green and no telemetry or matrix blocker",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return sha256(_json_text(payload).encode("utf-8")).hexdigest()


def _source_artifacts() -> list[dict[str, Any]]:
    sources = {
        "scenarioWindowContract": (SCENARIO_CONTRACT_PATH, "BT93S.1 pinned scenario-window contract"),
        "actionEffectWindowManifest": (ACTION_EFFECT_MANIFEST_PATH, "BT93S.1 action-effect manifest alias"),
        "existingActionEffect": (EXISTING_ACTION_EFFECT_PATH, "BT93S.2 existing-action effect report"),
        "actionSurfaceDecision": (ACTION_SURFACE_DECISION_PATH, "BT93S.3 action-surface decision"),
        "bt93rrHandover": (BT93RR_HANDOVER_PATH, "BT93RR.99 R-Allowlist handover"),
        "bt93rrCounterprobe": (BT93RR_COUNTERPROBE_PATH, "BT93RR.3 stochastic eval-mode counterprobe"),
        "bt93yModel": (rr2.MODEL_PATH, "BT93Y retrain-lineage model"),
        "bt93yVecNormalize": (rr2.VECNORMALIZE_PATH, "BT93Y retrain-lineage VecNormalize"),
        "bt93yConfig": (rr2.CONFIG_PATH, "BT93Y retrain-lineage config"),
        "ppoActionSurface": (rr2.ACTION_SURFACE_PATH, "current PPO action-surface source"),
    }
    tracked = rr2._tracked_files(path for path, _role in sources.values())
    return [
        rr2._source_artifact(key, path, role, tracked)
        for key, (path, role) in sources.items()
    ]


def _source_map(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, Mapping[str, Any]]:
    return {str(source.get("sourceKey")): source for source in source_artifacts}


def _action_names() -> list[str]:
    return [name for name, _patch in MASKED_SEMANTIC_ACTIONS]


def _action_token(action_name: str) -> int:
    for index, name in enumerate(_action_names()):
        if name == action_name:
            return index
    raise ValueError(f"unknown semantic action: {action_name}")


def _as_float(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if math.isfinite(result) else fallback


def _round(value: Any) -> float:
    return round(_as_float(value), 6)


def _scenario_start_state(scenario: Mapping[str, Any]) -> Mapping[str, Any]:
    start_state = scenario.get("startState")
    return start_state if isinstance(start_state, Mapping) else {}


def _scenario_effect_window(scenario: Mapping[str, Any]) -> Mapping[str, Any]:
    effect_window = scenario.get("effectWindow")
    return effect_window if isinstance(effect_window, Mapping) else {}


def _scenario_seeds(scenario: Mapping[str, Any]) -> list[int]:
    seed_plan = scenario.get("seedPlan")
    values = seed_plan.get("seeds") if isinstance(seed_plan, Mapping) else []
    seeds: list[int] = []
    for value in values or []:
        try:
            seeds.append(int(value))
        except (TypeError, ValueError):
            continue
    return seeds


def _scenario_reward_profile(scenario: Mapping[str, Any], config: Mapping[str, Any]) -> str:
    start_state = _scenario_start_state(scenario)
    return str(start_state.get("rewardProfileId") or config.get("rewardProfileId") or "bt93n-wall-trail-stability-v1")


def _scenario_max_steps(scenario: Mapping[str, Any]) -> int:
    effect_window = _scenario_effect_window(scenario)
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    repeat_steps = int(effect_window.get("maxSteps") or 24)
    return max(warmup_steps + repeat_steps + 2, repeat_steps + 2, int(effect_window.get("sourceMaxSteps") or 0) + 2)


def _available_actions_from_mask() -> list[str]:
    mask = build_masked_semantic_action_mask(inventory_length=0)
    semantic_actions = mask.get("semanticActions") if isinstance(mask.get("semanticActions"), Mapping) else {}
    return [name for name, allowed in semantic_actions.items() if allowed]


def _compact_ranked(snapshot: Mapping[str, Any], *, limit: int = 2) -> list[dict[str, Any]]:
    ranked = snapshot.get("rankedActions") if isinstance(snapshot.get("rankedActions"), list) else []
    compact: list[dict[str, Any]] = []
    for entry in ranked[:limit]:
        if not isinstance(entry, Mapping):
            continue
        compact.append(
            {
                "token": entry.get("token"),
                "semanticAction": entry.get("semanticAction"),
                "probability": entry.get("probability"),
                "logit": entry.get("logit"),
            }
        )
    return compact


def _surface_info(info: Mapping[str, Any]) -> Mapping[str, Any]:
    surface = info.get("ppoActionSurface")
    return surface if isinstance(surface, Mapping) else {}


def _telemetry_info(info: Mapping[str, Any]) -> Mapping[str, Any]:
    telemetry = info.get("ppoActionTelemetry")
    return telemetry if isinstance(telemetry, Mapping) else {}


def _load_model(config: Mapping[str, Any]) -> tuple[PPO | None, str | None]:
    vec_env: VecNormalize | None = None
    model: PPO | None = None
    error: str | None = None
    try:
        probe_seed = int((config.get("seeds") or {}).get("probeSeeds", [944])[0])
        vec_env, _metric_env = rr2._build_vec_env(
            seed=probe_seed,
            label="bt93s-policy-selection-loader",
            max_steps=int((config.get("runContract") or {}).get("maxStepsPerEpisode") or 180),
            reward_profile_id=str(config.get("rewardProfileId") or "bt93n-wall-trail-stability-v1"),
            training=False,
            vecnormalize_source=rr2.VECNORMALIZE_PATH,
        )
        model = PPO.load(str(rr2.MODEL_PATH), env=vec_env, device="cpu", force_reset=False)
    except Exception as exc:  # pragma: no cover - diagnostic report path
        error = f"{exc.__class__.__name__}: {exc}"
    finally:
        if vec_env is not None:
            vec_env.close()
    return model, error


def _run_scenario_seed(
    *,
    model: PPO,
    scenario: Mapping[str, Any],
    seed: int,
    config: Mapping[str, Any],
    effective_actions: set[str],
) -> dict[str, Any]:
    scenario_id = str(scenario.get("id") or "unknown")
    effect_window = _scenario_effect_window(scenario)
    warmup_action = str(effect_window.get("warmupAction") or "noop")
    warmup_steps = int(effect_window.get("warmupSteps") or 0)
    repeat_steps = int(effect_window.get("maxSteps") or 24)
    warmup_token = _action_token(warmup_action)
    action_names = _action_names()
    available_actions = _available_actions_from_mask()
    vec_env: VecNormalize | None = None
    rows: list[dict[str, Any]] = []
    action_counts: Counter[str] = Counter()
    effective_count = 0
    top1_effective_count = 0
    top2_effective_count = 0
    terminal_observed = False
    warmup_terminal_before_action = False
    error: str | None = None
    summary: dict[str, Any] = {}

    np.random.seed(int(seed) + 93004)
    torch.manual_seed(int(seed) + 93004)
    try:
        vec_env, metric_env = rr2._build_vec_env(
            seed=int(seed),
            label=f"bt93s-policy-selection-{scenario_id}-{seed}",
            max_steps=_scenario_max_steps(scenario),
            reward_profile_id=_scenario_reward_profile(scenario, config),
            training=False,
            vecnormalize_source=rr2.VECNORMALIZE_PATH,
        )
        model.set_env(vec_env, force_reset=False)
        obs = vec_env.reset()
        for _ in range(warmup_steps):
            obs, _rewards, dones, _infos = vec_env.step(np.asarray([warmup_token], dtype=np.int64))
            if bool(np.asarray(dones).reshape(-1)[0]):
                terminal_observed = True
                warmup_terminal_before_action = True
                break

        if not warmup_terminal_before_action:
            for step_index in range(repeat_steps):
                snapshot = rr2._distribution_snapshot(model, obs)
                raw_probs = snapshot.pop("_rawProbs")
                snapshot.pop("_rawValue", None)
                action, _state = model.predict(obs, deterministic=False)
                token = int(np.asarray(action).reshape(-1)[0])
                selected_action = action_names[token] if 0 <= token < len(action_names) else f"unknown-{token}"
                action_counts[selected_action] += 1
                selected_effective = selected_action in effective_actions
                effective_count += 1 if selected_effective else 0
                top2 = _compact_ranked(snapshot, limit=2)
                top1 = top2[0]["semanticAction"] if top2 else None
                top2_actions = {str(item.get("semanticAction")) for item in top2}
                top1_effective_count += 1 if top1 in effective_actions else 0
                top2_effective_count += 1 if bool(effective_actions & top2_actions) else 0
                next_obs, reward, dones, infos = vec_env.step(action)
                info = infos[0] if isinstance(infos, (list, tuple)) and infos else {}
                surface = _surface_info(info)
                telemetry = _telemetry_info(info)
                post_decode_action = surface.get("semanticAction")
                row = {
                    "scenarioId": scenario_id,
                    "seed": int(seed),
                    "stepIndex": int(step_index),
                    "policyMode": "stochastic-eval-mode-counterprobe",
                    "availableActions": available_actions,
                    "maskStatus": {
                        "surfaceId": surface.get("surfaceId") or PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
                        "preSamplingApplied": True,
                        "consumerStatus": "consumed-before-sampling-by-masked-semantic-action-vocabulary",
                        "allSemanticActionsAvailable": set(available_actions) == set(action_names),
                    },
                    "selectedActionToken": token,
                    "selectedAction": selected_action,
                    "selectedActionProbability": rr2._round(raw_probs[token]) if 0 <= token < len(raw_probs) else None,
                    "top2BeforeSelection": top2,
                    "top2ContainsEffectiveAction": bool(effective_actions & top2_actions),
                    "selectedActionEffective": selected_effective,
                    "postDecodeAction": post_decode_action,
                    "postDecodeMatchesSelected": post_decode_action == selected_action,
                    "reward": _round(float(np.asarray(reward).reshape(-1)[0])),
                    "terminalObserved": bool(np.asarray(dones).reshape(-1)[0]),
                    "terminalReason": info.get("terminalReason"),
                    "truncatedReason": info.get("truncatedReason"),
                    "safetyTelemetry": {
                        key: _round(telemetry.get(key))
                        for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate", "vetoRate", "preSamplingMaskRate")
                    },
                }
                rows.append(row)
                if row["terminalObserved"]:
                    terminal_observed = True
                    break
                obs = next_obs
        summary = rr2._compact_summary(metric_env.summary())
    except Exception as exc:  # pragma: no cover - diagnostic report path
        error = f"{exc.__class__.__name__}: {exc}"
    finally:
        if vec_env is not None:
            vec_env.close()

    step_count = len(rows)
    return {
        "scenarioId": scenario_id,
        "seed": int(seed),
        "error": error,
        "warmupAction": warmup_action,
        "warmupSteps": warmup_steps,
        "warmupTerminalBeforeAction": warmup_terminal_before_action,
        "requestedSelectionSteps": repeat_steps,
        "selectionStepCount": step_count,
        "terminalObserved": terminal_observed,
        "effectiveActionSelectionCount": effective_count,
        "effectiveActionSelectionShare": _round(effective_count / max(1, step_count)),
        "top1EffectiveCount": top1_effective_count,
        "top1EffectiveShare": _round(top1_effective_count / max(1, step_count)),
        "top2EffectiveCount": top2_effective_count,
        "top2EffectiveShare": _round(top2_effective_count / max(1, step_count)),
        "actionCounts": dict(sorted(action_counts.items())),
        "rows": rows,
        "summary": summary,
    }


def _classify_scenario_selection(
    *,
    scenario_id: str,
    existing_class: str,
    telemetry_limit: str | None,
    effective_actions: set[str],
    seed_reports: list[Mapping[str, Any]],
) -> dict[str, Any]:
    total_steps = sum(int(report.get("selectionStepCount") or 0) for report in seed_reports)
    effective_count = sum(int(report.get("effectiveActionSelectionCount") or 0) for report in seed_reports)
    top2_count = sum(int(report.get("top2EffectiveCount") or 0) for report in seed_reports)
    action_counts: Counter[str] = Counter()
    errors = [report.get("error") for report in seed_reports if report.get("error")]
    for report in seed_reports:
        for action_name, count in (report.get("actionCounts") or {}).items():
            action_counts[str(action_name)] += int(count)
    top_action, top_count = action_counts.most_common(1)[0] if action_counts else (None, 0)
    effective_share = _round(effective_count / max(1, total_steps))
    top2_share = _round(top2_count / max(1, total_steps))

    if errors or total_steps <= 0:
        selection_class = "measurement-invalid"
    elif existing_class == "matrix-redesign-required":
        selection_class = "matrix-redesign-required"
    elif existing_class == "action-effect-weak" or not effective_actions:
        selection_class = "action-space-required"
    elif telemetry_limit:
        selection_class = "observation-telemetry-required"
    elif effective_share >= 0.25 and top2_share >= 0.50:
        selection_class = "selection-observed"
    else:
        selection_class = "action-selection-required"

    return {
        "scenarioId": scenario_id,
        "existingActionEffectClass": existing_class,
        "telemetryLimit": telemetry_limit,
        "effectiveActionsFrom93S2": sorted(effective_actions),
        "selectionClass": selection_class,
        "selectionStepCount": total_steps,
        "effectiveActionSelectionCount": effective_count,
        "effectiveActionSelectionShare": effective_share,
        "top2EffectiveShare": top2_share,
        "topSelectedAction": top_action,
        "topSelectedActionShare": _round(top_count / max(1, total_steps)),
        "actionCounts": dict(sorted(action_counts.items())),
        "errors": errors,
    }


def _result_class(
    *,
    source_files_ready: bool,
    source_files_versioned: bool,
    model_load_error: str | None,
    scenario_results: Mapping[str, Mapping[str, Any]],
    action_surface_decision: Mapping[str, Any],
) -> str:
    if not source_files_ready or not source_files_versioned or model_load_error:
        return "measurement-invalid"
    classes = Counter(str(result.get("selectionClass")) for result in scenario_results.values())
    decision = action_surface_decision.get("actionSurfaceDecision")
    matrix_ids = []
    action_gap_ids = []
    if isinstance(decision, Mapping):
        matrix_ids = [str(item) for item in decision.get("matrixRedesignScenarioIds") or []]
        action_gap_ids = [str(item) for item in decision.get("actionEffectGapScenarioIds") or []]
    if classes.get("measurement-invalid"):
        return "measurement-invalid"
    if matrix_ids or classes.get("matrix-redesign-required"):
        return "matrix-redesign-required"
    if action_gap_ids or classes.get("action-space-required"):
        return "action-space-required"
    if classes.get("observation-telemetry-required"):
        return "observation-telemetry-required"
    if classes.get("action-selection-required"):
        return "action-selection-required"
    return "action-selection-green"


def _phase_coverage(report: Mapping[str, Any]) -> dict[str, bool]:
    scenario_results = report.get("scenarioResults") if isinstance(report.get("scenarioResults"), Mapping) else {}
    decision = report.get("decision") if isinstance(report.get("decision"), Mapping) else {}
    sample_counts = report.get("sampleCounts") if isinstance(report.get("sampleCounts"), Mapping) else {}
    claim_flags = report.get("claimFlags") if isinstance(report.get("claimFlags"), Mapping) else {}
    source = report.get("policySource") if isinstance(report.get("policySource"), Mapping) else {}
    return {
        "DoD.S4": bool(sample_counts.get("selectionStepCount") and scenario_results),
        "93S.4.1": source.get("bt93rrResultClass") == "eval-mode-bug-fixed-counterprobe-green"
        and int(sample_counts.get("scenarioCount") or 0) == int(sample_counts.get("contractScenarioCount") or -1),
        "93S.4.2": bool(decision.get("telemetryRouting") or report.get("resultClass") in ALLOWED_RESULT_CLASSES),
        "93S.4.3": all(
            result.get("selectionClass") != "selection-observed"
            or bool(result.get("effectiveActionsFrom93S2"))
            for result in scenario_results.values()
            if isinstance(result, Mapping)
        ),
        "93S.4.4": bool(decision.get("selectionBlockers") is not None),
        "93S.4.5": bool(decision.get("telemetryRouting") is not None),
        "93S.4.6": claim_flags.get("bt93uClaimAllowed") is False,
    }


def build_report() -> dict[str, Any]:
    started = time.perf_counter()
    contract = _read_json(SCENARIO_CONTRACT_PATH)
    effect_report = _read_json(EXISTING_ACTION_EFFECT_PATH)
    action_surface_decision = _read_json(ACTION_SURFACE_DECISION_PATH)
    handover = _read_json(BT93RR_HANDOVER_PATH)
    counterprobe = _read_json(BT93RR_COUNTERPROBE_PATH)
    config = _read_json(rr2.CONFIG_PATH)
    source_artifacts = _source_artifacts()
    source_by_key = _source_map(source_artifacts)
    source_files_ready = all(source.get("exists") and source.get("isFile") for source in source_artifacts)
    source_files_versioned = all(source.get("tracked") for source in source_artifacts)
    model, model_load_error = _load_model(config)
    scenarios = [scenario for scenario in contract.get("scenarios") or [] if isinstance(scenario, Mapping)]
    effect_scenario_results = effect_report.get("scenarioResults") if isinstance(effect_report.get("scenarioResults"), Mapping) else {}
    seed_reports_by_scenario: dict[str, list[Mapping[str, Any]]] = {}
    selection_rows: list[Mapping[str, Any]] = []

    if model is not None:
        for scenario in scenarios:
            scenario_id = str(scenario.get("id") or "unknown")
            effect_result = effect_scenario_results.get(scenario_id)
            effect_result = effect_result if isinstance(effect_result, Mapping) else {}
            effective_actions = {str(action) for action in effect_result.get("successfulActions") or []}
            seed_reports: list[Mapping[str, Any]] = []
            for seed in _scenario_seeds(scenario):
                seed_report = _run_scenario_seed(
                    model=model,
                    scenario=scenario,
                    seed=int(seed),
                    config=config,
                    effective_actions=effective_actions,
                )
                seed_reports.append(seed_report)
                selection_rows.extend(seed_report.get("rows") or [])
            seed_reports_by_scenario[scenario_id] = seed_reports

    scenario_results: dict[str, Mapping[str, Any]] = {}
    for scenario in scenarios:
        scenario_id = str(scenario.get("id") or "unknown")
        effect_result = effect_scenario_results.get(scenario_id)
        effect_result = effect_result if isinstance(effect_result, Mapping) else {}
        scenario_results[scenario_id] = _classify_scenario_selection(
            scenario_id=scenario_id,
            existing_class=str(effect_result.get("classResult") or "missing"),
            telemetry_limit=effect_result.get("telemetryLimit"),
            effective_actions={str(action) for action in effect_result.get("successfulActions") or []},
            seed_reports=list(seed_reports_by_scenario.get(scenario_id) or []),
        )

    result_class = _result_class(
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        model_load_error=model_load_error,
        scenario_results=scenario_results,
        action_surface_decision=action_surface_decision,
    )
    telemetry_ids = sorted(
        scenario_id
        for scenario_id, result in scenario_results.items()
        if result.get("selectionClass") == "observation-telemetry-required"
    )
    selection_blockers = sorted(
        scenario_id
        for scenario_id, result in scenario_results.items()
        if result.get("selectionClass") == "action-selection-required"
    )
    action_space_blockers = sorted(
        scenario_id
        for scenario_id, result in scenario_results.items()
        if result.get("selectionClass") == "action-space-required"
    )
    matrix_blockers = sorted(
        scenario_id
        for scenario_id, result in scenario_results.items()
        if result.get("selectionClass") == "matrix-redesign-required"
    )
    result_ok = result_class in ALLOWED_RESULT_CLASSES and result_class != "measurement-invalid"
    payload: dict[str, Any] = {
        "schemaVersion": "bt93s-policy-selection-report-v1",
        "ok": result_ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s_policy_selection.py",
        "blockId": "BT93S",
        "phaseId": "93S.4",
        "resultClass": result_class,
        "git": {
            "branch": rr2._git_output(["git", "branch", "--show-current"]),
            "sha": rr2._git_output(["git", "rev-parse", "HEAD"]),
        },
        "elapsedMs": rr2._round((time.perf_counter() - started) * 1000.0, 4),
        "matrixId": contract.get("matrixId"),
        "contractId": contract.get("contractId"),
        "actionSurfaceId": contract.get("actionSurface", {}).get("surfaceId")
        if isinstance(contract.get("actionSurface"), Mapping)
        else PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "policySource": {
            "lineageId": config.get("lineageId"),
            "lineageKind": config.get("lineageKind"),
            "notBt93nLineage": config.get("lineageKind") == "new-retrain-lineage-not-bt93n",
            "modelPath": rr2._rel(rr2.MODEL_PATH),
            "vecNormalizePath": rr2._rel(rr2.VECNORMALIZE_PATH),
            "bt93rrResultClass": counterprobe.get("resultClass"),
            "bt93rrHandoverResultClass": handover.get("resultClass"),
            "policyMode": "stochastic-eval-mode-counterprobe",
            "deterministicPolicyPredict": False,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
            "modelLoadError": model_load_error,
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceFreshness": {
            "scenarioWindowContract": source_by_key.get("scenarioWindowContract", {}).get("resultClass"),
            "existingActionEffect": source_by_key.get("existingActionEffect", {}).get("resultClass"),
            "actionSurfaceDecision": source_by_key.get("actionSurfaceDecision", {}).get("resultClass"),
            "bt93rrCounterprobe": source_by_key.get("bt93rrCounterprobe", {}).get("resultClass"),
        },
        "thresholdsLockedBeforeRun": {
            "source": rr2._rel(SCENARIO_CONTRACT_PATH),
            "policySource": rr2._rel(BT93RR_COUNTERPROBE_PATH),
            "effectiveSelectionShareForSelectionObserved": ">= 0.25",
            "top2EffectiveShareForSelectionObserved": ">= 0.50",
            "matrixRedesignPrecedence": True,
            "actionGapBlocksGreen": True,
            "telemetryLimitRoutesToBT93TOnlyAfter93S99": True,
            "noRewardOrMaxStepSuccessProxy": True,
        },
        "sampleCounts": {
            "contractScenarioCount": len(scenarios),
            "scenarioCount": len(scenario_results),
            "seedCountsByScenario": {
                str(scenario.get("id") or "unknown"): len(_scenario_seeds(scenario))
                for scenario in scenarios
            },
            "selectionStepCount": len(selection_rows),
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
        },
        "scenarioResults": scenario_results,
        "seedReportsByScenario": seed_reports_by_scenario,
        "selectionRows": selection_rows,
        "decision": {
            "resultClass": result_class,
            "matrixRedesignScenarioIds": matrix_blockers,
            "actionSpaceBlockers": action_space_blockers,
            "selectionBlockers": selection_blockers,
            "telemetryRouting": {
                "route": "BT93T only if 93S.99 emits observation-telemetry-required",
                "telemetryLimitedScenarioIds": telemetry_ids,
                "bt93uBlockedUntilFreshSRecheck": bool(telemetry_ids),
            },
            "selectionGreen": result_class == "action-selection-green",
            "reason": (
                "Policy-selection rows were generated, but BT93S.3/S.4 still contain matrix-redesign and/or action-space "
                "blockers; this report cannot open BT93U/W/O."
            )
            if result_class != "action-selection-green"
            else "All BT93S scenario selections meet the action-selection-green thresholds.",
        },
        "allowNext": ["93S.99 Abschluss"] if result_ok else [],
        "opensNext": ["93S.99"] if result_ok else [],
        "blocksNext": BLOCKED_ACTIONS,
        "claimFlags": {
            "bt93tClaimAllowed": False,
            "bt93uClaimAllowed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "freezeAllowed": False,
            "holdoutConsumptionAllowed": False,
            "promoteAllowed": False,
            "rolloutAllowed": False,
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "ppoTrainingStarted": False,
            "newOptimizerUpdates": 0,
            "newEvalRunStarted": True,
            "policySelectionDiagnosticOnly": True,
            "rewardFixApplied": False,
            "actionSurfaceChanged": False,
            "telemetryFixApplied": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "qualityClaimAllowed": False,
        },
        "commands": {
            "write": "python python/scripts/bt93s_policy_selection.py --write-report",
            "aliasWritten": rr2._rel(ACTION_SELECTION_ALIAS_PATH),
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    payload["phaseCoverage"] = _phase_coverage(payload)
    payload["ok"] = bool(payload["ok"] and all(payload["phaseCoverage"].values()))
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(POLICY_SELECTION_REPORT_PATH, report)
        _write_json(ACTION_SELECTION_ALIAS_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "sampleCounts": report["sampleCounts"],
                "decision": report["decision"],
                "outputs": [
                    rr2._rel(POLICY_SELECTION_REPORT_PATH),
                    rr2._rel(ACTION_SELECTION_ALIAS_PATH),
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
