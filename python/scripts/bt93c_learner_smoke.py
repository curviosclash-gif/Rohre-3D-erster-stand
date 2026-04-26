"""BT93C real PPO learner, resume, and eval smoke runner."""

from __future__ import annotations

import json
import subprocess
import sys
import time
from collections import Counter
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

from bridge.authority_snapshot import READ_ONLY_RUNTIME_SURFACES
from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH
from envs.curvios_env import CurviosEnv, DEFAULT_COMMAND_TIMEOUT_SECONDS
from envs.ppo_action_surface import build_action_surface_manifest, make_curvios_action_wrapper

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
DEFAULT_CONFIG = PYTHON_ROOT / "configs" / "ppo_bt93c_learner_smoke.json"
DEFAULT_ARTIFACT_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
CHECKPOINT_VERSION = "bt93c-ppo-checkpoint-v1"
_NUMPY_BIT_GENERATOR_PICKLE_COMPAT_INSTALLED = False
_NUMPY_CORE_MODULE_ALIASES_INSTALLED = False
BT93J_R2_TRAIN_RUN_KIND = "bt93j-r2-micro-train-counterprobe"
BT93J_R2_EVAL_RUN_KIND = "bt93j-r2-micro-train-counterprobe-eval"
BT93J_USER_OWNED_PROOF_LONGRUN_KIND = "bt93j-user-owned-1m-proof-longrun"


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
    step_label_timesteps: int | None = None
    source_run_dir: Path | None = None


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


def _install_numpy_bit_generator_pickle_compat() -> None:
    """Allow older VecNormalize pickles to carry Gym space RNG state."""
    global _NUMPY_BIT_GENERATOR_PICKLE_COMPAT_INSTALLED
    if _NUMPY_BIT_GENERATOR_PICKLE_COMPAT_INSTALLED:
        return
    import numpy.random._pickle as random_pickle

    original_bit_generator_ctor = random_pickle.__bit_generator_ctor
    original_generator_ctor = random_pickle.__generator_ctor
    if getattr(original_bit_generator_ctor, "_bt93_pickle_compat", False):
        _NUMPY_BIT_GENERATOR_PICKLE_COMPAT_INSTALLED = True
        return

    class _LegacyBitGeneratorProxy:
        def __init__(self, bit_generator_name: Any = "PCG64") -> None:
            self.bit_generator_name = getattr(bit_generator_name, "__name__", bit_generator_name)
            self.legacy_states: list[Any] = []

        def __setstate__(self, state: Any) -> None:
            self.legacy_states.append(state)

    def _compat_ctor(bit_generator_name: Any = "MT19937") -> Any:
        if isinstance(bit_generator_name, type) and bit_generator_name.__module__.startswith("numpy.random"):
            return _LegacyBitGeneratorProxy(bit_generator_name)
        return original_bit_generator_ctor(bit_generator_name)

    def _compat_generator_ctor(bit_generator_name: Any = "MT19937", bit_generator_ctor: Any = None) -> Any:
        if isinstance(bit_generator_name, _LegacyBitGeneratorProxy):
            return np.random.Generator(np.random.PCG64())
        if isinstance(bit_generator_name, type) and bit_generator_name.__module__.startswith("numpy.random"):
            bit_generator_name = bit_generator_name.__name__
        if bit_generator_ctor is not None:
            return original_generator_ctor(bit_generator_name, bit_generator_ctor)
        return original_generator_ctor(bit_generator_name)

    _compat_ctor._bt93_pickle_compat = True  # type: ignore[attr-defined]
    random_pickle.__bit_generator_ctor = _compat_ctor
    random_pickle.__generator_ctor = _compat_generator_ctor
    _NUMPY_BIT_GENERATOR_PICKLE_COMPAT_INSTALLED = True


def _install_numpy_core_module_aliases() -> None:
    """Map NumPy 2 pickle module names back to NumPy 1.x modules."""
    global _NUMPY_CORE_MODULE_ALIASES_INSTALLED
    if _NUMPY_CORE_MODULE_ALIASES_INSTALLED:
        return
    import numpy.core as numpy_core
    import numpy.core.multiarray as numpy_core_multiarray
    import numpy.core.numeric as numpy_core_numeric

    sys.modules.setdefault("numpy._core", numpy_core)
    sys.modules.setdefault("numpy._core.multiarray", numpy_core_multiarray)
    sys.modules.setdefault("numpy._core.numeric", numpy_core_numeric)
    _NUMPY_CORE_MODULE_ALIASES_INSTALLED = True


def _install_numpy_artifact_pickle_compat() -> None:
    _install_numpy_core_module_aliases()
    _install_numpy_bit_generator_pickle_compat()


def _numpy_pickle_compat_report(vecnormalize_source: Path | None) -> dict[str, Any]:
    return {
        "numpyBitGeneratorClassPickleCompat": _NUMPY_BIT_GENERATOR_PICKLE_COMPAT_INSTALLED,
        "numpyCoreModuleAliases": _NUMPY_CORE_MODULE_ALIASES_INSTALLED,
        "reason": (
            "legacy VecNormalize pickle may contain Gym space RNG state encoded with a NumPy BitGenerator class"
            if vecnormalize_source is not None
            else None
        ),
        "scope": "PPO model and VecNormalize artifact load only; observation/reward RMS state is loaded from the source artifact",
    }


def _clear_space_rng_for_vecnormalize_pickle(vec_env: VecNormalize) -> dict[str, Any]:
    cleared: list[str] = []
    for attr_name in ("action_space", "observation_space"):
        space = getattr(vec_env, attr_name, None)
        if hasattr(space, "_np_random") and getattr(space, "_np_random", None) is not None:
            setattr(space, "_np_random", None)
            cleared.append(attr_name)
    return {
        "spaceRngClearedBeforeVecNormalizeSave": cleared,
        "normalizationRmsPreserved": True,
    }


def _load_config(config_path: Path | None) -> tuple[Path, dict[str, Any]]:
    resolved = (config_path or DEFAULT_CONFIG).resolve()
    config = _read_json(resolved)
    allowed_scopes = {
        "BT93C": {"93C.3", "93C.4", "93C.5"},
        "BT93F": {"93F.4"},
        "BT93G": {"93G.5"},
        "BT93H": {"93H.3"},
        "BT93I": {"93I.2"},
        "BT93J": {"93J.5a", "93J.5b"},
    }
    block_id = str(config.get("blockId") or "")
    if block_id not in allowed_scopes or config.get("phaseId") not in allowed_scopes[block_id]:
        raise RuntimeError(f"PPO learner config has wrong scope: {_rel(resolved)}")
    return resolved, config


def _run_sample_class(run_kind: str) -> str:
    if run_kind == "technical-smoke":
        return "technical-smoke-not-quality-evidence"
    if run_kind == "comparable-repair":
        return "bt93g-comparable-repair-not-candidate"
    if run_kind == "comparable-repair-eval":
        return "bt93g-comparable-repair-eval-not-ppo-validate"
    if run_kind == "comparable-terminal-repair":
        return "bt93h-comparable-terminal-repair-not-candidate"
    if run_kind == "comparable-terminal-repair-eval":
        return "bt93h-comparable-terminal-repair-eval-not-ppo-validate"
    if run_kind == "terminal-curriculum-repair":
        return "bt93i-terminal-curriculum-repair-not-candidate"
    if run_kind == "terminal-curriculum-repair-eval":
        return "bt93i-terminal-curriculum-repair-eval-not-ppo-validate"
    if run_kind == BT93J_R2_TRAIN_RUN_KIND:
        return "bt93j-r2-micro-train-counterprobe-not-candidate"
    if run_kind == BT93J_R2_EVAL_RUN_KIND:
        return "bt93j-r2-micro-train-counterprobe-eval-not-ppo-validate"
    if run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND:
        return "bt93j-user-owned-1m-proof-longrun-not-candidate"
    if run_kind == "repair-diagnostic":
        return "repair-diagnostic-not-candidate"
    if run_kind.startswith("baseline-"):
        return "conservative-baseline-not-promotion"
    if run_kind.startswith("pilot-"):
        return "pilot-not-baseline"
    if run_kind.startswith("diagnostics-"):
        return "diagnostic-smoke-not-baseline"
    return "learner-smoke-not-baseline"


def _is_diagnostic_run(run_kind: str) -> bool:
    return (
        run_kind.startswith("diagnostics-")
        or run_kind == "repair-diagnostic"
        or run_kind == BT93J_R2_TRAIN_RUN_KIND
        or run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND
    )


def _is_pilot_run(run_kind: str) -> bool:
    return run_kind.startswith("pilot-")


def _is_baseline_run(run_kind: str) -> bool:
    return run_kind.startswith("baseline-")


def _is_holdout_run(run_kind: str) -> bool:
    return run_kind.startswith("holdout-") or run_kind.endswith("-holdout")


def _is_bt93g_train_run(run_kind: str) -> bool:
    return run_kind in {"technical-smoke", "comparable-repair"}


def _is_bt93g_comparable_eval(block_id: str, run_kind: str) -> bool:
    return block_id == "BT93G" and run_kind in {"comparable-repair-eval", "holdout-eval"}


def _is_bt93h_comparable_eval(block_id: str, run_kind: str) -> bool:
    return block_id == "BT93H" and run_kind in {"comparable-terminal-repair-eval", "holdout-eval"}


def _is_bt93i_comparable_eval(block_id: str, run_kind: str) -> bool:
    return block_id == "BT93I" and run_kind in {"terminal-curriculum-repair-eval", "holdout-eval"}


def _is_bt93j_r2_eval(block_id: str, run_kind: str) -> bool:
    return block_id == "BT93J" and run_kind == BT93J_R2_EVAL_RUN_KIND


def _is_comparable_repair_eval(block_id: str, run_kind: str) -> bool:
    return (
        _is_bt93g_comparable_eval(block_id, run_kind)
        or _is_bt93h_comparable_eval(block_id, run_kind)
        or _is_bt93i_comparable_eval(block_id, run_kind)
        or _is_bt93j_r2_eval(block_id, run_kind)
    )


def _action_surface_id(config: Mapping[str, Any]) -> str | None:
    env_cfg = config.get("env") if isinstance(config.get("env"), Mapping) else {}
    policy_cfg = config.get("policy") if isinstance(config.get("policy"), Mapping) else {}
    value = env_cfg.get("actionSurfaceId") or policy_cfg.get("actionSurfaceId")
    return str(value) if value else None


def _number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, torch.Tensor):
        if value.numel() != 1:
            return None
        value = value.detach().cpu().item()
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(result):
        return None
    return result


def _numeric_summary(values: list[float]) -> dict[str, Any]:
    clean_values = [float(value) for value in values if np.isfinite(value)]
    if not clean_values:
        return {"count": 0, "min": None, "max": None, "mean": None}
    return {
        "count": len(clean_values),
        "min": round(min(clean_values), 6),
        "max": round(max(clean_values), 6),
        "mean": round(sum(clean_values) / len(clean_values), 6),
    }


def _diagnostic_thresholds(config: Mapping[str, Any]) -> dict[str, Any]:
    configured = dict((config.get("diagnostics") or {}).get("collapseThresholds") or {})
    return {
        "maxApproxKl": float(configured.get("maxApproxKl", 0.2)),
        "maxClipFraction": float(configured.get("maxClipFraction", 0.6)),
        "minEntropy": float(configured.get("minEntropy", 0.01)),
        "maxValueLoss": float(configured.get("maxValueLoss", 100.0)),
        "maxGradNorm": float(configured.get("maxGradNorm", (config.get("algorithm") or {}).get("maxGradNorm", 0.5))),
        "minExplainedVariance": float(configured.get("minExplainedVariance", -1.0)),
    }


def _gradient_summary(model: PPO, max_grad_norm: float) -> dict[str, Any]:
    squared_norm = 0.0
    max_abs = 0.0
    tensors = 0
    for parameter in model.policy.parameters():
        gradient = parameter.grad
        if gradient is None:
            continue
        detached = gradient.detach()
        squared_norm += float(torch.sum(detached * detached).cpu().item())
        max_abs = max(max_abs, float(torch.max(torch.abs(detached)).cpu().item()))
        tensors += 1
    global_norm = squared_norm ** 0.5
    tolerance = max(1e-5, abs(float(max_grad_norm)) * 1e-4)
    return {
        "observed": tensors > 0,
        "tensorCount": tensors,
        "globalNorm": round(global_norm, 6),
        "maxAbsGradient": round(max_abs, 6),
        "configuredMaxGradNorm": float(max_grad_norm),
        "tolerance": tolerance,
        "withinConfiguredMaxGradNorm": bool(tensors > 0 and global_norm <= float(max_grad_norm) + tolerance),
    }


def _ppo_learning_metrics(model: PPO, config: Mapping[str, Any], run_kind: str) -> dict[str, Any]:
    logger_values = dict(getattr(model.logger, "name_to_value", {}) or {})
    entropy_loss = _number(logger_values.get("train/entropy_loss"))
    entropy = -entropy_loss if entropy_loss is not None else None
    thresholds = _diagnostic_thresholds(config)
    metrics = {
        "policy_loss": _number(logger_values.get("train/policy_gradient_loss")),
        "value_loss": _number(logger_values.get("train/value_loss")),
        "entropy": entropy,
        "approx_kl": _number(logger_values.get("train/approx_kl")),
        "clip_fraction": _number(logger_values.get("train/clip_fraction")),
        "explained_variance": _number(logger_values.get("train/explained_variance")),
        "grad_norm": _gradient_summary(model, thresholds["maxGradNorm"]),
    }
    status = {
        "approxKlWithinThreshold": metrics["approx_kl"] is not None and metrics["approx_kl"] <= thresholds["maxApproxKl"],
        "clipFractionWithinThreshold": metrics["clip_fraction"] is not None and metrics["clip_fraction"] <= thresholds["maxClipFraction"],
        "entropyAboveMinimum": metrics["entropy"] is not None and metrics["entropy"] >= thresholds["minEntropy"],
        "valueLossWithinThreshold": metrics["value_loss"] is not None and metrics["value_loss"] <= thresholds["maxValueLoss"],
        "explainedVarianceAboveMinimum": (
            metrics["explained_variance"] is not None
            and metrics["explained_variance"] >= thresholds["minExplainedVariance"]
        ),
        "gradNormWithinThreshold": bool(metrics["grad_norm"]["withinConfiguredMaxGradNorm"]),
    }
    return {
        "source": "stable_baselines3.PPO logger after model.learn()",
        "sampleClass": _run_sample_class(run_kind),
        "metrics": metrics,
        "rawLoggerKeys": sorted(str(key) for key in logger_values.keys()),
        "collapseThresholds": thresholds,
        "thresholdStatus": status,
        "collapseOrInstabilitySignal": not all(status.values()),
    }


def _sum_action_telemetry(reports: list[Mapping[str, Any]]) -> dict[str, Any]:
    totals = {
        "totalActions": 0,
        "invalidActionCount": 0,
        "preSamplingMaskCount": 0,
        "maskCount": 0,
        "postDecodeClampCount": 0,
        "vetoCount": 0,
        "sanitizerCount": 0,
        "noopCount": 0,
    }
    field_counts: Counter[str] = Counter()
    sanitizer_reasons: Counter[str] = Counter()
    for report in reports:
        for key in totals:
            totals[key] += int(report.get(key) or 0)
        field_counts.update({str(key): int(value) for key, value in dict(report.get("fieldCounts") or {}).items()})
        sanitizer_reasons.update({
            str(key): int(value) for key, value in dict(report.get("sanitizerReasons") or {}).items()
        })

    total_actions = max(0, totals["totalActions"])

    def _rate(count_key: str) -> float:
        return round(totals[count_key] / total_actions, 6) if total_actions else 0.0

    return {
        **totals,
        "invalidActionRate": _rate("invalidActionCount"),
        "preSamplingMaskRate": _rate("preSamplingMaskCount"),
        "maskRate": _rate("maskCount"),
        "postDecodeClampRate": _rate("postDecodeClampCount"),
        "vetoRate": _rate("vetoCount"),
        "sanitizerRate": _rate("sanitizerCount"),
        "noopRate": _rate("noopCount"),
        "fieldCounts": dict(sorted(field_counts.items())),
        "sanitizerReasons": dict(sorted(sanitizer_reasons.items())),
    }


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted((str(key), int(value)) for key, value in counter.items()))


def _collect_eval_diagnostics(
    *,
    block_id: str,
    run_kind: str,
    info_samples: list[Mapping[str, Any]],
    telemetry_reports: list[Mapping[str, Any]],
    reward_values: list[float],
    done_count: int,
    completed_episode_lengths: list[int],
    open_episode_lengths: list[int],
    env_count: int,
    max_steps_per_episode: int,
    training_report: Mapping[str, Any] | None,
    model_reload_ms: float,
    forward_pass_ms: float,
) -> dict[str, Any]:
    reward_breakdown_totals: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    truncated_reasons: Counter[str] = Counter()
    death_causes: Counter[str] = Counter()
    intent_requested: Counter[str] = Counter()
    intent_applied: Counter[str] = Counter()
    safety_overrules: Counter[str] = Counter()
    action_latencies: list[float] = []
    ack_latencies: list[float] = []

    for info in info_samples:
        reward_breakdown = info.get("rewardBreakdown")
        if isinstance(reward_breakdown, Mapping):
            for key, value in reward_breakdown.items():
                number = _number(value)
                if number is not None:
                    reward_breakdown_totals[str(key)] += number
        terminal_reason = info.get("terminalReason")
        if terminal_reason:
            reason = str(terminal_reason)
            terminal_reasons[reason] += 1
            lowered = reason.lower()
            if any(token in lowered for token in ("death", "dead", "crash", "loss", "killed")):
                death_causes[reason] += 1
        truncated_reason = info.get("truncatedReason")
        if truncated_reason:
            truncated_reasons[str(truncated_reason)] += 1

        hybrid_decision = info.get("hybridDecision")
        if isinstance(hybrid_decision, Mapping):
            intent = hybrid_decision.get("intent")
            if isinstance(intent, Mapping):
                requested = intent.get("requested")
                applied = intent.get("applied")
                if requested:
                    intent_requested[str(requested)] += 1
                if applied:
                    intent_applied[str(applied)] += 1
                if requested and applied and requested != applied:
                    safety_overrules["intent-request-applied-mismatch"] += 1
            safety = hybrid_decision.get("safety")
            if isinstance(safety, Mapping):
                for key in ("vetoActive", "portalVeto", "combatVeto", "itemVeto", "projectileThreat"):
                    if safety.get(key) is True:
                        safety_overrules[str(key)] += 1

        action_latency = _number(info.get("bridgeActionLatencyMs"))
        if action_latency is not None:
            action_latencies.append(action_latency)
        ack_latency = _number(info.get("bridgeAckLatencyMs"))
        if ack_latency is not None:
            ack_latencies.append(ack_latency)

    observed_steps = len(reward_values)
    reward_total = round(sum(reward_values), 6)
    completed_avg = (
        round(sum(completed_episode_lengths) / len(completed_episode_lengths), 6)
        if completed_episode_lengths
        else None
    )
    reward_breakdown_mean = {
        key: round(float(value) / observed_steps, 6) if observed_steps else 0.0
        for key, value in sorted(reward_breakdown_totals.items())
    }
    action_telemetry = _sum_action_telemetry(telemetry_reports)
    truncated_max_steps = sum(
        value for key, value in truncated_reasons.items() if "max" in str(key).lower() and "step" in str(key).lower()
    )
    timeout_count = sum(value for key, value in truncated_reasons.items() if "timeout" in str(key).lower())
    forced_round_count = sum(
        value
        for key, value in {**terminal_reasons, **truncated_reasons}.items()
        if "forced" in str(key).lower()
    )
    crash_count = sum(
        value
        for key, value in {**terminal_reasons, **death_causes}.items()
        if "crash" in str(key).lower()
    )
    training_learning = dict((training_report or {}).get("learning") or {})
    is_baseline = _is_baseline_run(run_kind) or _is_holdout_run(run_kind) or _is_comparable_repair_eval(block_id, run_kind)
    average_survival_reason = None
    if not is_baseline:
        average_survival_reason = (
            "BT93C.5 pilot is not the baseline/publish lane."
            if _is_pilot_run(run_kind)
            else "BT93C.4 diagnostic smoke is not the 93C.5 baseline/publish lane."
        )

    return {
        "rewardSafetyDiagnostics": {
            "rewardBreakdownTotals": {key: round(float(value), 6) for key, value in sorted(reward_breakdown_totals.items())},
            "rewardBreakdownMeanPerStep": reward_breakdown_mean,
            "rewardTotal": reward_total,
            "rewardMean": round(reward_total / observed_steps, 6) if observed_steps else 0.0,
            "rewardHackingSignals": {
                "survivalRewardShare": (
                    round(float(reward_breakdown_totals.get("survival", 0.0)) / reward_total, 6)
                    if reward_total
                    else None
                ),
                "episodeShorteningCheck": {
                    "doneCount": int(done_count),
                    "completedEpisodeLengths": list(completed_episode_lengths),
                    "avgStepsPerCompletedEpisode": completed_avg,
                    "maxStepsPerEpisode": int(max_steps_per_episode),
                    "baselineComparable": is_baseline,
                },
                "safetyOverruleCounts": _counter_dict(safety_overrules),
            },
            "actionTelemetry": action_telemetry,
            "terminalReasonCounts": _counter_dict(terminal_reasons),
            "truncatedReasonCounts": _counter_dict(truncated_reasons),
            "deathCauseCounts": _counter_dict(death_causes),
        },
        "survivalKpis": {
            "observedVectorSteps": observed_steps,
            "envCount": int(env_count),
            "doneCount": int(done_count),
            "completedEpisodeCount": len(completed_episode_lengths),
            "avgStepsPerEpisode": completed_avg if is_baseline else None,
            "avgStepsPerEpisodeObserved": completed_avg,
            "openEpisodeLengthsAtStop": list(open_episode_lengths),
            "averageBotSurvival": completed_avg if is_baseline else None,
            "averageBotSurvivalReason": average_survival_reason,
            "averageBotSurvivalSource": (
                "BT93J R2 micro-train counterprobe completed episode length"
                if _is_bt93j_r2_eval(block_id, run_kind)
                else
                "BT93I terminal curriculum repair completed episode length"
                if _is_bt93i_comparable_eval(block_id, run_kind)
                else "BT93H comparable terminal repair completed episode length"
                if _is_bt93h_comparable_eval(block_id, run_kind)
                else "BT93G comparable repair completed episode length"
                if _is_bt93g_comparable_eval(block_id, run_kind)
                else "BT93C runtime-near completed episode length"
                if is_baseline
                else None
            ),
            "baselineComparable": is_baseline,
            "comparisonComparable": is_baseline,
        },
        "policyQualityRestDebt": {
            "bt73IntentRecovery": {
                "status": "open-restschuld-visible",
                "requestedIntentCounts": _counter_dict(intent_requested),
                "appliedIntentCounts": _counter_dict(intent_applied),
                "note": "Intent-/Recovery-Luecken bleiben Bewertungsrestschuld; Survival allein entscheidet nicht.",
            },
            "ppoValidateLane": {
                "status": "missing-until-BT94B.3",
                "rolloutOrPromoteAllowed": False,
                "replacesLegacyBotValidate": True,
            },
            "bt80cLegacyValidation": {
                "status": "historical-context-only",
                "replacesPpoValidate": False,
            },
            "jsInferenceIntegration": {
                "status": "not-in-BT93C-scope",
                "runtimeSwitchAllowed": False,
                "latencyCountsAsJsTickEvidence": False,
            },
        },
        "failureSemantics": {
            "runtimeErrorCount": 0,
            "crash": int(crash_count),
            "timeout": int(timeout_count),
            "forcedRound": int(forced_round_count),
            "socketClose": 0,
            "teardownFailure": 0,
            "maxSteps": int(truncated_max_steps),
            "naturalTerminal": int(sum(terminal_reasons.values()) - sum(death_causes.values())),
            "deathCauseCounts": _counter_dict(death_causes),
            "terminalReasonCounts": _counter_dict(terminal_reasons),
            "truncatedReasonCounts": _counter_dict(truncated_reasons),
        },
        "latencyAndThroughputBudget": {
            "countsAsLearningProgress": False,
            "modelReloadMs": round(model_reload_ms, 6),
            "pythonForwardPassMs": round(forward_pass_ms, 6),
            "bridgeActionLatencyMs": _numeric_summary(action_latencies),
            "bridgeAckLatencyMs": _numeric_summary(ack_latencies),
            "trainingStepsPerSecond": training_learning.get("stepsPerSecond"),
            "trainingWallClockSeconds": training_learning.get("wallClockSeconds"),
            "classification": "budget-and-stability-only",
        },
    }


def _validate_gate_inputs(config: Mapping[str, Any]) -> dict[str, Any]:
    artifacts = config.get("artifacts") or {}
    dependency_report_path = _repo_path(str(artifacts.get("dependencyLockReport")))
    clean_env_report_path = _repo_path(str(artifacts.get("cleanEnvReport")))
    requirements_path = _repo_path(str(artifacts.get("requirements")))

    dependency_report = _read_json(dependency_report_path)
    clean_env_report = _read_json(clean_env_report_path)
    if dependency_report.get("ok") is not True or clean_env_report.get("ok") is not True:
        raise RuntimeError("PPO learner start is blocked by dependency or clean-env gate")

    block_id = str(config.get("blockId") or "")
    if block_id == "BT93G":
        start_truth_path = _repo_path(str(artifacts.get("startTruth")))
        repair_matrix_path = _repo_path(str(artifacts.get("repairMatrix")))
        start_contract_path = _repo_path(str(artifacts.get("startContract")))
        terminal_wiring_path = _repo_path(str(artifacts.get("terminalWiringReport")))
        action_mask_path = _repo_path(str(artifacts.get("actionMaskReport")))
        reward_gate_path = _repo_path(str(artifacts.get("rewardGateReport")))

        start_truth = _read_json(start_truth_path)
        repair_matrix = _read_json(repair_matrix_path)
        start_contract = _read_json(start_contract_path)
        terminal_wiring = _read_json(terminal_wiring_path)
        action_mask = _read_json(action_mask_path)
        reward_gate = _read_json(reward_gate_path)

        if start_truth.get("resultClass") != "start-sanity-pinned":
            raise RuntimeError("BT93G.5 start is blocked by missing start sanity")
        if repair_matrix.get("classification") != "comparable-repair-matrix":
            raise RuntimeError("BT93G.5 start is blocked by non-comparable repair matrix")
        if int((repair_matrix.get("env") or {}).get("maxStepsPerEpisode") or 0) < 128:
            raise RuntimeError("BT93G.5 start is blocked by maxStepsPerEpisode < 128")
        if terminal_wiring.get("ok") is not True or action_mask.get("ok") is not True or reward_gate.get("ok") is not True:
            raise RuntimeError("BT93G.5 start is blocked by terminal/action/reward prerequisite gates")
        if (action_mask.get("maskSourceContract") or {}).get("preSamplingApplied") is not True:
            raise RuntimeError("BT93G.5 start is blocked by missing pre-sampling mask")

        return {
            "startTruth": _rel(start_truth_path),
            "startTruthSha256": _sha256_file(start_truth_path),
            "repairMatrix": _rel(repair_matrix_path),
            "repairMatrixSha256": _sha256_file(repair_matrix_path),
            "startContract": _rel(start_contract_path),
            "startContractSha256": _sha256_file(start_contract_path),
            "terminalWiringReport": _rel(terminal_wiring_path),
            "terminalWiringReportSha256": _sha256_file(terminal_wiring_path),
            "actionMaskReport": _rel(action_mask_path),
            "actionMaskReportSha256": _sha256_file(action_mask_path),
            "rewardGateReport": _rel(reward_gate_path),
            "rewardGateReportSha256": _sha256_file(reward_gate_path),
            "dependencyLockReport": _rel(dependency_report_path),
            "dependencyLockReportSha256": _sha256_file(dependency_report_path),
            "cleanEnvReport": _rel(clean_env_report_path),
            "cleanEnvReportSha256": _sha256_file(clean_env_report_path),
            "requirements": _rel(requirements_path),
            "requirementsSha256": _sha256_file(requirements_path),
            "freezeOk": False,
            "reAuditRequired": False,
            "candidateRunsAllowed": False,
            "promotionAllowed": False,
            "actionSurfaceId": _action_surface_id(config),
            "cleanPython": str(clean_env_report.get("cleanPython") or ""),
            "semanticWindow": {"modeId": (repair_matrix.get("env") or {}).get("modeId")},
            "matrix": {
                "matrixId": repair_matrix.get("matrixId"),
                "maps": (repair_matrix.get("env") or {}).get("maps"),
                "seeds": repair_matrix.get("seeds"),
                "maxStepsPerEpisode": (repair_matrix.get("env") or {}).get("maxStepsPerEpisode"),
            },
            "dqnChampion": ((repair_matrix.get("baseline") or {}).get("dqnChampion") or {}),
        }

    if block_id == "BT93H":
        terminal_root_path = _repo_path(str(artifacts.get("terminalRootCause")))
        survival_contract_path = _repo_path(str(artifacts.get("survivalGateContract")))
        repair_matrix_path = _repo_path(str(artifacts.get("repairMatrix")))
        action_mask_path = _repo_path(str(artifacts.get("actionMaskReport")))
        reward_gate_path = _repo_path(str(artifacts.get("rewardGateReport")))

        terminal_root = _read_json(terminal_root_path)
        survival_contract = _read_json(survival_contract_path)
        repair_matrix = _read_json(repair_matrix_path)
        action_mask = _read_json(action_mask_path)
        reward_gate = _read_json(reward_gate_path)

        if (terminal_root.get("rootCause") or {}).get("fieldContractOk") is not True:
            raise RuntimeError("BT93H.3 start is blocked by terminal field-contract drift")
        if survival_contract.get("resultClass") != "survival-gate-contract-pinned":
            raise RuntimeError("BT93H.3 start is blocked by missing survival gate contract")
        if (survival_contract.get("executionGate") or {}).get("comparableTerminalRepairAllowed") is not True:
            raise RuntimeError("BT93H.3 start is blocked by survival contract execution gate")
        if repair_matrix.get("classification") != "comparable-repair-matrix":
            raise RuntimeError("BT93H.3 start is blocked by non-comparable repair matrix")
        if action_mask.get("ok") is not True or reward_gate.get("ok") is not True:
            raise RuntimeError("BT93H.3 start is blocked by action/reward prerequisite gates")
        if (action_mask.get("maskSourceContract") or {}).get("preSamplingApplied") is not True:
            raise RuntimeError("BT93H.3 start is blocked by missing pre-sampling mask")

        return {
            "terminalRootCause": _rel(terminal_root_path),
            "terminalRootCauseSha256": _sha256_file(terminal_root_path),
            "survivalGateContract": _rel(survival_contract_path),
            "survivalGateContractSha256": _sha256_file(survival_contract_path),
            "repairMatrix": _rel(repair_matrix_path),
            "repairMatrixSha256": _sha256_file(repair_matrix_path),
            "actionMaskReport": _rel(action_mask_path),
            "actionMaskReportSha256": _sha256_file(action_mask_path),
            "rewardGateReport": _rel(reward_gate_path),
            "rewardGateReportSha256": _sha256_file(reward_gate_path),
            "dependencyLockReport": _rel(dependency_report_path),
            "dependencyLockReportSha256": _sha256_file(dependency_report_path),
            "cleanEnvReport": _rel(clean_env_report_path),
            "cleanEnvReportSha256": _sha256_file(clean_env_report_path),
            "requirements": _rel(requirements_path),
            "requirementsSha256": _sha256_file(requirements_path),
            "freezeOk": False,
            "reAuditRequired": False,
            "candidateRunsAllowed": False,
            "promotionAllowed": False,
            "actionSurfaceId": _action_surface_id(config),
            "cleanPython": str(clean_env_report.get("cleanPython") or ""),
            "semanticWindow": {"modeId": (repair_matrix.get("env") or {}).get("modeId")},
            "matrix": {
                "matrixId": repair_matrix.get("matrixId"),
                "maps": (repair_matrix.get("env") or {}).get("maps"),
                "seeds": repair_matrix.get("seeds"),
                "maxStepsPerEpisode": (repair_matrix.get("env") or {}).get("maxStepsPerEpisode"),
            },
            "dqnChampion": ((repair_matrix.get("baseline") or {}).get("dqnChampion") or {}),
        }

    if block_id == "BT93I":
        start_truth_path = _repo_path(str(artifacts.get("startTruth")))
        matrix_manifest_path = _repo_path(str(artifacts.get("matrixManifest")))
        terminal_report_path = _repo_path(str(artifacts.get("terminalProvocationReport")))
        action_mask_path = _repo_path(str(artifacts.get("actionMaskReport")))
        reward_gate_path = _repo_path(str(artifacts.get("rewardGateReport")))

        start_truth = _read_json(start_truth_path)
        matrix_manifest = _read_json(matrix_manifest_path)
        terminal_report = _read_json(terminal_report_path)
        action_mask = _read_json(action_mask_path)
        reward_gate = _read_json(reward_gate_path)
        scenario_checks = terminal_report.get("scenarioChecks") or {}

        if start_truth.get("resultClass") != "start-truth-pinned":
            raise RuntimeError("BT93I start is blocked by missing start truth")
        if matrix_manifest.get("resultClass") != "episode-targeted-matrix-pinned":
            raise RuntimeError("BT93I start is blocked by missing episode-counted matrix")
        if terminal_report.get("resultClass") != "terminal-provocation-green":
            raise RuntimeError("BT93I start is blocked by red terminal provocation")
        if scenario_checks.get("matchEndedNonDeathNaturalTerminal") is not True:
            raise RuntimeError("BT93I start is blocked by missing non-death natural terminal control")
        if action_mask.get("ok") is not True or reward_gate.get("ok") is not True:
            raise RuntimeError("BT93I start is blocked by action/reward prerequisite gates")
        if (action_mask.get("maskSourceContract") or {}).get("preSamplingApplied") is not True:
            raise RuntimeError("BT93I start is blocked by missing pre-sampling mask")

        env = matrix_manifest.get("env") or {}
        return {
            "startTruth": _rel(start_truth_path),
            "startTruthSha256": _sha256_file(start_truth_path),
            "matrixManifest": _rel(matrix_manifest_path),
            "matrixManifestSha256": _sha256_file(matrix_manifest_path),
            "terminalProvocationReport": _rel(terminal_report_path),
            "terminalProvocationReportSha256": _sha256_file(terminal_report_path),
            "actionMaskReport": _rel(action_mask_path),
            "actionMaskReportSha256": _sha256_file(action_mask_path),
            "rewardGateReport": _rel(reward_gate_path),
            "rewardGateReportSha256": _sha256_file(reward_gate_path),
            "dependencyLockReport": _rel(dependency_report_path),
            "dependencyLockReportSha256": _sha256_file(dependency_report_path),
            "cleanEnvReport": _rel(clean_env_report_path),
            "cleanEnvReportSha256": _sha256_file(clean_env_report_path),
            "requirements": _rel(requirements_path),
            "requirementsSha256": _sha256_file(requirements_path),
            "freezeOk": False,
            "reAuditRequired": False,
            "candidateRunsAllowed": False,
            "promotionAllowed": False,
            "actionSurfaceId": _action_surface_id(config),
            "cleanPython": str(clean_env_report.get("cleanPython") or ""),
            "semanticWindow": {"modeId": env.get("modeId")},
            "matrix": {
                "matrixId": matrix_manifest.get("matrixId"),
                "maps": env.get("maps"),
                "seeds": matrix_manifest.get("seeds"),
                "maxStepsPerEpisode": env.get("maxStepsPerEpisode"),
                "minimumEpisodes": matrix_manifest.get("minimumEpisodes"),
            },
            "dqnChampion": ((matrix_manifest.get("baseline") or {}).get("dqnChampion") or {}),
        }

    if block_id == "BT93J":
        diagnostic_split_path = _repo_path(str(artifacts.get("diagnosticSplit")))
        pilot_readiness_path = _repo_path(str(artifacts.get("pilotReadinessReport")))
        r1_report_path = _repo_path(str(artifacts.get("r1MicroTestReport")))
        terminal_report_path = _repo_path(str(artifacts.get("terminalSemanticsReport")))
        matrix_report_path = _repo_path(str(artifacts.get("matrixContractReport")))
        action_report_path = _repo_path(str(artifacts.get("actionPolicyDiagnostics")))
        reward_report_path = _repo_path(str(artifacts.get("rewardCurriculumDiagnostics")))

        diagnostic_split = _read_json(diagnostic_split_path)
        pilot_readiness = _read_json(pilot_readiness_path)
        r1_report = _read_json(r1_report_path)
        terminal_report = _read_json(terminal_report_path)
        matrix_report = _read_json(matrix_report_path)
        action_report = _read_json(action_report_path)
        reward_report = _read_json(reward_report_path)
        phase_id = str(config.get("phaseId") or "")

        if phase_id == "93J.5b":
            r2_report_path = _repo_path(str(artifacts.get("r2CounterprobeReport")))
            proof_lane_path = _repo_path(str(artifacts.get("rewardCurriculumProofLaneReport")))
            longrun_readiness_path = _repo_path(str(artifacts.get("userOwned1mLongrunReadinessReport")))
            r2_report = _read_json(r2_report_path)
            proof_lane = _read_json(proof_lane_path)
            longrun_readiness = _read_json(longrun_readiness_path)

            if r2_report.get("resultClass") != "same-red":
                raise RuntimeError("BT93J.5c proof longrun requires R2=same-red as the pinned start finding")
            if proof_lane.get("resultClass") != "reward-curriculum-proof-lane-ready":
                raise RuntimeError("BT93J.5c proof longrun is blocked by red proof-lane report")
            if longrun_readiness.get("readyForUserOwnedLongrun") is not True:
                raise RuntimeError("BT93J.5c proof longrun readiness is not green")
            if (action_report.get("actionPolicyGate") or {}).get("green") is not True:
                raise RuntimeError("BT93J.5c proof longrun is blocked by red action telemetry")
            if (longrun_readiness.get("guardrails") or {}).get("holdoutUsed") is not False:
                raise RuntimeError("BT93J.5c proof longrun cannot consume holdout")
            if (longrun_readiness.get("guardrails") or {}).get("candidateRun") is not False:
                raise RuntimeError("BT93J.5c proof longrun cannot be a candidate run")
            if str((config.get("env") or {}).get("rewardProfileId") or "") != "bt93j-reward-curriculum-proof-v1":
                raise RuntimeError("BT93J.5c proof longrun requires the BT93J reward/curriculum proof profile")

            matrix_contract = matrix_report.get("contract") or {}
            return {
                "diagnosticSplit": _rel(diagnostic_split_path),
                "diagnosticSplitSha256": _sha256_file(diagnostic_split_path),
                "r2CounterprobeReport": _rel(r2_report_path),
                "r2CounterprobeReportSha256": _sha256_file(r2_report_path),
                "rewardCurriculumProofLaneReport": _rel(proof_lane_path),
                "rewardCurriculumProofLaneReportSha256": _sha256_file(proof_lane_path),
                "userOwned1mLongrunReadinessReport": _rel(longrun_readiness_path),
                "userOwned1mLongrunReadinessReportSha256": _sha256_file(longrun_readiness_path),
                "actionPolicyDiagnostics": _rel(action_report_path),
                "actionPolicyDiagnosticsSha256": _sha256_file(action_report_path),
                "rewardCurriculumDiagnostics": _rel(reward_report_path),
                "rewardCurriculumDiagnosticsSha256": _sha256_file(reward_report_path),
                "terminalSemanticsReport": _rel(terminal_report_path),
                "terminalSemanticsReportSha256": _sha256_file(terminal_report_path),
                "matrixContractReport": _rel(matrix_report_path),
                "matrixContractReportSha256": _sha256_file(matrix_report_path),
                "dependencyLockReport": _rel(dependency_report_path),
                "dependencyLockReportSha256": _sha256_file(dependency_report_path),
                "cleanEnvReport": _rel(clean_env_report_path),
                "cleanEnvReportSha256": _sha256_file(clean_env_report_path),
                "requirements": _rel(requirements_path),
                "requirementsSha256": _sha256_file(requirements_path),
                "freezeOk": False,
                "reAuditRequired": False,
                "candidateRunsAllowed": False,
                "promotionAllowed": False,
                "actionSurfaceId": _action_surface_id(config),
                "rewardProfileId": str((config.get("env") or {}).get("rewardProfileId") or ""),
                "cleanPython": str(clean_env_report.get("cleanPython") or ""),
                "semanticWindow": {"modeId": matrix_contract.get("modeId")},
                "matrix": {
                    "matrixId": matrix_report.get("matrixId"),
                    "maps": matrix_contract.get("maps"),
                    "seeds": matrix_contract.get("seeds"),
                    "maxStepsPerEpisode": matrix_contract.get("maxStepsPerEpisode"),
                    "minimumEpisodes": matrix_contract.get("minimumEpisodes"),
                },
                "dqnChampion": matrix_contract.get("dqnChampion") or {},
                "userOwnedProofLongrunGate": {
                    "readyForUserOwnedLongrun": True,
                    "allowedRunKind": BT93J_USER_OWNED_PROOF_LONGRUN_KIND,
                    "totalTimesteps": (config.get("rollout") or {}).get("userOwnedProofLongrunTimesteps"),
                    "holdoutAllowed": False,
                    "candidateRun": False,
                    "freezeCandidate": False,
                },
                "diagnosticSplitResultClass": diagnostic_split.get("resultClass"),
            }

        blocking_checks = set((pilot_readiness.get("pilotReadiness") or {}).get("blockingChecks") or [])
        expected_blockers = {
            "terminal_matrix_start_capable",
            "not_player_dead_only",
            "micro_test_trend_improvement",
        }
        if r1_report.get("resultClass") != "green":
            raise RuntimeError("BT93J.5a start is blocked because R1 is not green")
        if (pilot_readiness.get("pilotReadiness") or {}).get("readyForTraining") is not False:
            raise RuntimeError("BT93J.5a start requires readyForTraining=false")
        if blocking_checks != expected_blockers:
            raise RuntimeError("BT93J.5a start is blocked by unexpected pilot-readiness blockers")
        if (terminal_report.get("terminalMappingGate") or {}).get("realEvalPlayerDeadOnly") is not True:
            raise RuntimeError("BT93J.5a start requires player-dead-only R1 counterprobe input")
        if (action_report.get("actionPolicyGate") or {}).get("green") is not True:
            raise RuntimeError("BT93J.5a start is blocked by red action telemetry")
        if (reward_report.get("rewardCurriculumGate") or {}).get("primaryCause") is not True:
            raise RuntimeError("BT93J.5a start is blocked by missing reward/curriculum primary cause")

        matrix_contract = matrix_report.get("contract") or {}
        return {
            "diagnosticSplit": _rel(diagnostic_split_path),
            "diagnosticSplitSha256": _sha256_file(diagnostic_split_path),
            "pilotReadinessReport": _rel(pilot_readiness_path),
            "pilotReadinessReportSha256": _sha256_file(pilot_readiness_path),
            "r1MicroTestReport": _rel(r1_report_path),
            "r1MicroTestReportSha256": _sha256_file(r1_report_path),
            "terminalSemanticsReport": _rel(terminal_report_path),
            "terminalSemanticsReportSha256": _sha256_file(terminal_report_path),
            "matrixContractReport": _rel(matrix_report_path),
            "matrixContractReportSha256": _sha256_file(matrix_report_path),
            "actionPolicyDiagnostics": _rel(action_report_path),
            "actionPolicyDiagnosticsSha256": _sha256_file(action_report_path),
            "rewardCurriculumDiagnostics": _rel(reward_report_path),
            "rewardCurriculumDiagnosticsSha256": _sha256_file(reward_report_path),
            "dependencyLockReport": _rel(dependency_report_path),
            "dependencyLockReportSha256": _sha256_file(dependency_report_path),
            "cleanEnvReport": _rel(clean_env_report_path),
            "cleanEnvReportSha256": _sha256_file(clean_env_report_path),
            "requirements": _rel(requirements_path),
            "requirementsSha256": _sha256_file(requirements_path),
            "freezeOk": False,
            "reAuditRequired": False,
            "candidateRunsAllowed": False,
            "promotionAllowed": False,
            "actionSurfaceId": _action_surface_id(config),
            "cleanPython": str(clean_env_report.get("cleanPython") or ""),
            "semanticWindow": {"modeId": matrix_contract.get("modeId")},
            "matrix": {
                "matrixId": matrix_report.get("matrixId"),
                "maps": matrix_contract.get("maps"),
                "seeds": matrix_contract.get("seeds"),
                "maxStepsPerEpisode": matrix_contract.get("maxStepsPerEpisode"),
                "minimumEpisodes": matrix_contract.get("minimumEpisodes"),
            },
            "dqnChampion": matrix_contract.get("dqnChampion") or {},
            "r2StartGate": {
                "r1Green": True,
                "readyForTraining": False,
                "blockingChecks": sorted(blocking_checks),
                "allowedRunKind": BT93J_R2_TRAIN_RUN_KIND,
                "holdoutAllowed": False,
                "candidateRun": False,
                "freezeCandidate": False,
            },
            "diagnosticSplitResultClass": diagnostic_split.get("resultClass"),
        }

    start_manifest_path = _repo_path(str(artifacts.get("startManifest")))
    action_surface_report_path = _repo_path(str(artifacts.get("actionSurfaceReport")))
    start_manifest = _read_json(start_manifest_path)
    action_surface_report = _read_json(action_surface_report_path)

    learner_signal = start_manifest.get("learnerStartSignal") or {}
    if learner_signal.get("freezeOk") is not True or learner_signal.get("reAuditRequired") is True:
        raise RuntimeError("BT93C.3 learner start is blocked by freeze/re-audit state")
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
    action_surface_id: str | None,
    reward_profile_id: str | None,
) -> Any:
    def _factory() -> Any:
        env = make_curvios_action_wrapper(
            CurviosEnv(
                max_steps=max_steps,
                default_seed=seed,
                session_id=f"{run_id}-env{env_index}",
                controller_timeout_seconds=timeout_seconds,
                reward_profile_id=reward_profile_id,
            ),
            surface_id=action_surface_id,
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
    action_surface_id = _action_surface_id(config)
    reward_profile_id = str(env_cfg.get("rewardProfileId") or "") or None
    base_env = DummyVecEnv([
        _make_env_factory(
            seed=int(seed),
            run_id=run_id,
            env_index=index,
            max_steps=max_steps,
            timeout_seconds=timeout_seconds,
            action_surface_id=action_surface_id,
            reward_profile_id=reward_profile_id,
        )
        for index, seed in enumerate(seeds)
    ])
    if seeds:
        base_env.seed(int(seeds[0]))
    if vecnormalize_source is not None:
        _install_numpy_artifact_pickle_compat()
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
        "actionSurface": build_action_surface_manifest(_action_surface_id(config)),
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
    block_id = str(config.get("blockId") or "BT93C")
    baseline_claim_allowed = block_id == "BT93C" and _is_baseline_run(run_kind)
    pilot_claim_allowed = block_id == "BT93C" and (_is_pilot_run(run_kind) or _is_baseline_run(run_kind))
    repair_evidence_allowed = (
        (block_id == "BT93G" and run_kind == "comparable-repair")
        or (block_id == "BT93H" and run_kind == "comparable-terminal-repair")
        or (block_id == "BT93I" and run_kind == "terminal-curriculum-repair")
        or (block_id == "BT93J" and run_kind == BT93J_R2_TRAIN_RUN_KIND)
        or (block_id == "BT93J" and run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND)
    )
    checkpoint_dir = run_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    model_path = checkpoint_dir / "model.zip"
    vecnormalize_path = checkpoint_dir / "vecnormalize.pkl"
    optimizer_path = checkpoint_dir / "optimizer_state.pt"
    config_snapshot_path = checkpoint_dir / "config.json"
    report_path = run_dir / "training_report.json"
    manifest_path = run_dir / "artifact_manifest.json"

    _write_json(config_snapshot_path, config)
    normalize_pickle_compat = _clear_space_rng_for_vecnormalize_pickle(vec_env)
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

    longrun_step_label = (
        int(learning_report.get("progressTimesteps") or 0)
        if run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND
        else None
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
        step_label_timesteps=longrun_step_label,
        source_run_dir=run_dir if run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND else None,
    )
    manifest = {
        "manifestVersion": CHECKPOINT_VERSION,
        "generatedAt": _utc_now(),
        "generatedBy": "python/train.py",
        "blockId": block_id,
        "phaseId": phase_id,
        "runId": run_id,
        "runKind": run_kind,
        "profileId": config["profileId"],
        "gitSha": _git_sha(),
        "truePpoModelPackage": True,
        "scaffoldOnly": False,
        "diagnosticOnly": _is_diagnostic_run(run_kind),
        "learningQualityClaimAllowed": baseline_claim_allowed,
        "repairEvidenceClaimAllowed": repair_evidence_allowed,
        "baselineRunsStarted": baseline_claim_allowed,
        "pilotRunsStarted": pilot_claim_allowed,
        "candidateRun": False,
        "freezeCandidate": False,
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
        "pickleCompatibility": normalize_pickle_compat,
        "learning": dict(learning_report),
        "guardrails": {
            "readOnlyRuntimeSurfaces": list(READ_ONLY_RUNTIME_SURFACES),
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "diagnosticOnly": _is_diagnostic_run(run_kind),
            "learningQualityClaimAllowed": baseline_claim_allowed,
            "repairEvidenceClaimAllowed": repair_evidence_allowed,
            "baselineRunsStarted": baseline_claim_allowed,
            "pilotRunsStarted": pilot_claim_allowed,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
        },
    }
    _write_json(manifest_path, manifest)
    return package, manifest


def _package_pointer(package: ModelPackage | None) -> dict[str, Any] | None:
    if package is None:
        return None
    pointer = {
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
    if package.step_label_timesteps is not None:
        pointer["stepLabelTimesteps"] = package.step_label_timesteps
    if package.source_run_dir is not None:
        pointer["sourceRunDirectory"] = _rel(package.source_run_dir)
    return pointer


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
    source_run_dir = None
    if source.parent.name.startswith("step_") and source.parent.parent.name == "longrun_snapshots":
        source_run_dir = source.parent.parent.parent
    elif source.parent.name == "checkpoints":
        source_run_dir = source.parent.parent
    elif source.name == "artifact_manifest.json":
        source_run_dir = source.parent
    step_label_raw = payload.get("stepLabelTimesteps")
    if step_label_raw is None and str(payload.get("runKind") or "") == BT93J_USER_OWNED_PROOF_LONGRUN_KIND:
        learning = payload.get("learning")
        if isinstance(learning, Mapping):
            step_label_raw = learning.get("progressTimesteps")
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
        step_label_timesteps=int(step_label_raw) if step_label_raw is not None else None,
        source_run_dir=source_run_dir.resolve() if source_run_dir is not None else None,
    )


def _has_non_finite(value: Any) -> bool:
    if value is None or isinstance(value, (str, bool)):
        return False
    if isinstance(value, np.ndarray):
        try:
            return not bool(np.isfinite(value.astype(float)).all())
        except (TypeError, ValueError):
            return False
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, torch.Tensor):
        return not bool(torch.isfinite(value).all().item())
    if isinstance(value, (int, float)):
        return not bool(np.isfinite(float(value)))
    if isinstance(value, Mapping):
        return any(_has_non_finite(entry) for entry in value.values())
    if isinstance(value, (list, tuple)):
        return any(_has_non_finite(entry) for entry in value)
    return False


def _bt93j_player_dead_only(terminal_counts: Mapping[str, int], death_counts: Mapping[str, int]) -> bool:
    total_terminals = sum(int(value) for value in terminal_counts.values())
    if total_terminals <= 0:
        return False
    player_dead = int(terminal_counts.get("player-dead", 0))
    death_total = sum(int(value) for value in death_counts.values())
    return player_dead == total_terminals and death_total == total_terminals


def _bt93j_eval_summary(eval_report: Mapping[str, Any]) -> dict[str, Any]:
    diagnostics = eval_report.get("diagnostics") or {}
    survival = diagnostics.get("survivalKpis") or {}
    reward_safety = diagnostics.get("rewardSafetyDiagnostics") or {}
    failure = diagnostics.get("failureSemantics") or {}
    terminal_counts = {
        str(key): int(value)
        for key, value in dict(failure.get("terminalReasonCounts") or {}).items()
    }
    death_counts = {
        str(key): int(value)
        for key, value in dict(failure.get("deathCauseCounts") or {}).items()
    }
    completed_lengths = [
        int(value)
        for value in (survival.get("completedEpisodeLengths") or [])
        if isinstance(value, (int, float, np.integer, np.floating))
    ]
    natural_terminal_count = int(failure.get("naturalTerminal") or 0)
    return {
        "avgStepsPerEpisodeObserved": survival.get("avgStepsPerEpisodeObserved"),
        "averageBotSurvivalObserved": survival.get("avgStepsPerEpisodeObserved"),
        "completedEpisodeCount": survival.get("completedEpisodeCount"),
        "longestEpisode": max(completed_lengths) if completed_lengths else None,
        "completedEpisodeLengths": completed_lengths,
        "rewardBreakdownTotals": reward_safety.get("rewardBreakdownTotals") or {},
        "actionTelemetry": reward_safety.get("actionTelemetry") or {},
        "terminalMatrix": {
            "terminalReasonCounts": terminal_counts,
            "deathCauseCounts": death_counts,
            "naturalTerminalCount": natural_terminal_count,
            "maxSteps": int(failure.get("maxSteps") or 0),
            "runtimeErrorCount": int(failure.get("runtimeErrorCount") or 0),
            "playerDeadOnly": _bt93j_player_dead_only(terminal_counts, death_counts),
        },
    }


def _bt93j_snapshot_technical_gate(eval_report: Mapping[str, Any], learning_metrics: Mapping[str, Any]) -> dict[str, Any]:
    summary = _bt93j_eval_summary(eval_report)
    action = summary["actionTelemetry"]
    terminal = summary["terminalMatrix"]
    ppo_metrics = (learning_metrics.get("ppoLearningMetrics") or {}).get("metrics") or {}
    checks = [
        {
            "id": "finite_eval_report",
            "ok": not _has_non_finite(eval_report.get("eval")),
        },
        {
            "id": "finite_ppo_metrics",
            "ok": not _has_non_finite(ppo_metrics),
        },
        {
            "id": "runtime_error_count_zero",
            "ok": int(terminal.get("runtimeErrorCount") or 0) == 0,
            "observed": terminal.get("runtimeErrorCount"),
        },
        {
            "id": "invalid_action_rate_zero",
            "ok": float(action.get("invalidActionRate") or 0.0) == 0.0,
            "observed": action.get("invalidActionRate"),
        },
        {
            "id": "sanitizer_rate_zero",
            "ok": float(action.get("sanitizerRate") or 0.0) == 0.0,
            "observed": action.get("sanitizerRate"),
        },
        {
            "id": "post_decode_clamp_rate_zero",
            "ok": float(action.get("postDecodeClampRate") or 0.0) == 0.0,
            "observed": action.get("postDecodeClampRate"),
        },
        {
            "id": "veto_rate_below_0_25",
            "ok": float(action.get("vetoRate") or 0.0) < 0.25,
            "observed": action.get("vetoRate"),
        },
    ]
    return {
        "ok": all(bool(check["ok"]) for check in checks),
        "checks": checks,
    }


def _write_bt93j_longrun_checkpoint(
    *,
    model: PPO,
    vec_env: VecNormalize,
    config: Mapping[str, Any],
    config_path: Path,
    run_dir: Path,
    run_id: str,
    run_kind: str,
    phase_id: str,
    step_label: int,
    progress_timesteps: int,
) -> dict[str, Any]:
    snapshot_dir = run_dir / "longrun_snapshots" / f"step_{step_label:07d}"
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    model_path = snapshot_dir / "model.zip"
    vecnormalize_path = snapshot_dir / "vecnormalize.pkl"
    optimizer_path = snapshot_dir / "optimizer_state.pt"
    config_snapshot_path = snapshot_dir / "config.json"
    manifest_path = snapshot_dir / "snapshot_manifest.json"

    _write_json(config_snapshot_path, config)
    normalize_pickle_compat = _clear_space_rng_for_vecnormalize_pickle(vec_env)
    model.save(str(model_path))
    vec_env.save(str(vecnormalize_path))
    torch.save(
        {
            "checkpointVersion": CHECKPOINT_VERSION,
            "runId": run_id,
            "runKind": run_kind,
            "phaseId": phase_id,
            "stepLabelTimesteps": step_label,
            "progressTimesteps": progress_timesteps,
            "modelNumTimesteps": int(model.num_timesteps),
            "optimizerStateDict": model.policy.optimizer.state_dict(),
            "optimizerSummary": _optimizer_summary(model),
        },
        optimizer_path,
    )
    manifest = {
        "manifestVersion": f"{CHECKPOINT_VERSION}-bt93j-longrun-snapshot",
        "generatedAt": _utc_now(),
        "generatedBy": "python/train.py::BT93JLongrunSnapshotCallback",
        "blockId": "BT93J",
        "phaseId": phase_id,
        "runId": run_id,
        "runKind": run_kind,
        "stepLabelTimesteps": step_label,
        "progressTimesteps": progress_timesteps,
        "modelNumTimesteps": int(model.num_timesteps),
        "diagnosticOnly": True,
        "candidateRun": False,
        "freezeCandidate": False,
        "promotionAllowed": False,
        "holdoutUsed": False,
        "bt94aGateRefresh": False,
        "artifacts": {
            "model": _rel(model_path),
            "modelSha256": _sha256_file(model_path),
            "vecnormalize": _rel(vecnormalize_path),
            "vecnormalizeSha256": _sha256_file(vecnormalize_path),
            "optimizerState": _rel(optimizer_path),
            "optimizerStateSha256": _sha256_file(optimizer_path),
            "config": _rel(config_snapshot_path),
            "configSha256": _sha256_file(config_snapshot_path),
            "snapshotManifest": _rel(manifest_path),
        },
        "sourceConfig": {
            "path": _rel(config_path),
            "sha256": _sha256_file(config_path),
        },
        "policy": _policy_summary(model, config),
        "optimizer": _optimizer_summary(model),
        "pickleCompatibility": normalize_pickle_compat,
        "guardrails": {
            "readOnlyRuntimeSurfaces": list(READ_ONLY_RUNTIME_SURFACES),
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "diagnosticOnly": True,
            "learningQualityClaimAllowed": False,
            "baselineRunsStarted": False,
            "pilotRunsStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "holdoutUsed": False,
            "bt94aGateRefresh": False,
        },
    }
    _write_json(manifest_path, manifest)
    return manifest


def _write_bt93j_longrun_eval_snapshot(
    *,
    snapshot_manifest: Mapping[str, Any],
    config: Mapping[str, Any],
    run_id: str,
    run_kind: str,
    phase_id: str,
    step_label: int,
    progress_timesteps: int,
    learning_metrics: Mapping[str, Any],
) -> dict[str, Any]:
    artifacts = snapshot_manifest.get("artifacts") or {}
    snapshot_dir = _repo_path(str(artifacts["snapshotManifest"])).parent
    source_run_dir = snapshot_dir.parent.parent if snapshot_dir.parent.name == "longrun_snapshots" else None
    source_package = ModelPackage(
        manifest_path=_repo_path(str(artifacts["snapshotManifest"])),
        run_id=str(snapshot_manifest.get("runId") or run_id),
        model_path=_repo_path(str(artifacts["model"])),
        vecnormalize_path=_repo_path(str(artifacts["vecnormalize"])),
        optimizer_path=_repo_path(str(artifacts["optimizerState"])),
        config_path=_repo_path(str(artifacts["config"])),
        model_sha256=str(artifacts["modelSha256"]),
        vecnormalize_sha256=str(artifacts["vecnormalizeSha256"]),
        optimizer_sha256=str(artifacts["optimizerStateSha256"]),
        config_sha256=str(artifacts["configSha256"]),
        step_label_timesteps=int(snapshot_manifest.get("stepLabelTimesteps") or step_label),
        source_run_dir=source_run_dir.resolve() if source_run_dir is not None else None,
    )
    env_cfg = config["env"]
    seeds = [int(seed) for seed in env_cfg["evalSeeds"][: int(env_cfg["evalEnvCount"])]]
    steps = int((config.get("rollout") or {}).get("evalSteps") or 0)
    target_completed_episodes = int((config.get("rollout") or {}).get("evalMinCompletedEpisodes") or 0)
    eval_env: VecNormalize | None = None
    try:
        eval_env = _build_vec_env(
            config=config,
            seeds=seeds,
            run_id=f"{run_id}-eval-{step_label}",
            training=False,
            vecnormalize_source=source_package.vecnormalize_path,
        )
        load_started = time.perf_counter()
        eval_model = PPO.load(
            str(source_package.model_path),
            device=str(config["algorithm"]["device"]),
            force_reset=False,
        )
        eval_model.set_env(eval_env, force_reset=False)
        load_elapsed_ms = (time.perf_counter() - load_started) * 1000.0
        obs = eval_env.reset()
        forward_started = time.perf_counter()
        eval_model.predict(obs[:1], deterministic=True)
        forward_elapsed_ms = (time.perf_counter() - forward_started) * 1000.0

        rewards: list[float] = []
        done_count = 0
        info_tail: list[dict[str, Any]] = []
        info_samples: list[dict[str, Any]] = []
        completed_episode_lengths: list[int] = []
        open_episode_lengths = [0 for _ in seeds]
        vector_steps_executed = 0
        stop_reason = "step-limit"
        for _ in range(steps):
            action, _ = eval_model.predict(obs, deterministic=True)
            obs, reward, done, infos = eval_env.step(action)
            vector_steps_executed += 1
            reward_entries = [float(entry) for entry in np.asarray(reward).reshape(-1)]
            done_entries = [bool(entry) for entry in np.asarray(done).reshape(-1)]
            rewards.extend(reward_entries)
            done_count += int(np.count_nonzero(done))
            for index, info in enumerate(infos):
                if index < len(open_episode_lengths):
                    open_episode_lengths[index] += 1
                    if index < len(done_entries) and done_entries[index]:
                        completed_episode_lengths.append(open_episode_lengths[index])
                        open_episode_lengths[index] = 0
                info_samples.append(dict(info))
                if len(info_tail) < 4:
                    info_tail.append(dict(info))
            if target_completed_episodes > 0 and len(completed_episode_lengths) >= target_completed_episodes:
                stop_reason = "min-completed-episodes"
                break
        telemetry_reports = _telemetry(eval_env)
        diagnostics = _collect_eval_diagnostics(
            block_id="BT93J",
            run_kind=run_kind,
            info_samples=info_samples,
            telemetry_reports=telemetry_reports,
            reward_values=rewards,
            done_count=done_count,
            completed_episode_lengths=completed_episode_lengths,
            open_episode_lengths=open_episode_lengths,
            env_count=len(seeds),
            max_steps_per_episode=int(env_cfg["maxStepsPerEpisode"]),
            training_report={"learning": dict(learning_metrics)},
            model_reload_ms=load_elapsed_ms,
            forward_pass_ms=forward_elapsed_ms,
        )
        diagnostics["survivalKpis"]["completedEpisodeLengths"] = list(completed_episode_lengths)
        report = {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/train.py::BT93JLongrunSnapshotCallback",
            "blockId": "BT93J",
            "phaseId": phase_id,
            "runId": run_id,
            "runKind": run_kind,
            "stepLabelTimesteps": step_label,
            "progressTimesteps": progress_timesteps,
            "holdoutUsed": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "bt94aGateRefresh": False,
            "sourcePackage": _package_pointer(source_package),
            "modelReload": {
                "wallClockMs": round(load_elapsed_ms, 6),
                "countsAsJsTickLatency": False,
            },
            "forwardPass": {
                "wallClockMs": round(forward_elapsed_ms, 6),
                "countsAsJsTickLatency": False,
            },
            "eval": {
                "steps": vector_steps_executed,
                "stepLimit": steps,
                "rewardTotal": round(sum(rewards), 6),
                "rewardMean": round(sum(rewards) / len(rewards), 6) if rewards else 0.0,
                "doneCount": done_count,
                "completedEpisodeLengths": list(completed_episode_lengths),
                "openEpisodeLengthsAtStop": list(open_episode_lengths),
                "telemetry": telemetry_reports,
                "infoTail": info_tail,
            },
            "episodeTargetGate": {
                "enabled": target_completed_episodes > 0,
                "minCompletedEpisodes": target_completed_episodes or None,
                "completedEpisodeCount": len(completed_episode_lengths),
                "satisfied": (
                    len(completed_episode_lengths) >= target_completed_episodes
                    if target_completed_episodes > 0
                    else None
                ),
                "stopReason": stop_reason,
                "maxEvalSteps": steps,
                "vectorStepsExecuted": vector_steps_executed,
            },
            "diagnostics": diagnostics,
            "guardrails": {
                "diagnosticOnly": True,
                "learningQualityClaimAllowed": False,
                "baselineRunsStarted": False,
                "pilotRunsStarted": False,
                "candidateRun": False,
                "freezeCandidate": False,
                "promotionAllowed": False,
                "holdoutUsed": False,
                "bt94aGateRefresh": False,
                "runtimeSurfacesTouched": [],
                "productiveRuntimeChanged": False,
            },
        }
        technical_gate = _bt93j_snapshot_technical_gate(report, learning_metrics)
        report["technicalStopGate"] = technical_gate
        report_path = snapshot_dir / "eval_snapshot.json"
        _write_json(report_path, report)
        return {
            "ok": technical_gate["ok"],
            "path": _rel(report_path),
            "sha256": _sha256_file(report_path),
            "summary": _bt93j_eval_summary(report),
            "episodeTargetGate": report["episodeTargetGate"],
            "technicalStopGate": technical_gate,
        }
    finally:
        if eval_env is not None:
            eval_env.close()


class _BT93JLongrunSnapshotCallback(BaseCallback):
    def __init__(
        self,
        *,
        config: Mapping[str, Any],
        config_path: Path,
        run_dir: Path,
        run_id: str,
        run_kind: str,
        phase_id: str,
        total_timesteps: int,
        start_progress_timesteps: int,
        capture_start_snapshot: bool,
    ) -> None:
        super().__init__(verbose=0)
        rollout = config.get("rollout") or {}
        self.config = config
        self.config_path = config_path
        self.run_dir = run_dir
        self.run_id = run_id
        self.run_kind = run_kind
        self.phase_id = phase_id
        self.total_timesteps = int(total_timesteps)
        self.start_progress_timesteps = int(start_progress_timesteps)
        self.capture_start_snapshot = bool(capture_start_snapshot)
        self.interval = int(rollout.get("checkpointFrequencyTimesteps") or 50000)
        self.next_step = ((self.start_progress_timesteps // self.interval) + 1) * self.interval
        self.start_timesteps = 0
        self.snapshots: list[dict[str, Any]] = []
        self.stop_reason: str | None = None
        self.stop_error: dict[str, Any] | None = None

    def _on_training_start(self) -> None:
        self.start_timesteps = int(self.model.num_timesteps)
        if not self.capture_start_snapshot or self.start_progress_timesteps <= 0:
            return
        if self.start_progress_timesteps % self.interval != 0:
            raise RuntimeError(
                "BT93J.5c start snapshot requires longrun-start-progress "
                f"to align with checkpoint interval {self.interval}: {self.start_progress_timesteps}"
            )
        try:
            self._capture(self.start_progress_timesteps, self.start_progress_timesteps)
        except Exception as exc:
            self.stop_reason = f"snapshot-error-at-{self.start_progress_timesteps}"
            self.stop_error = {
                "type": exc.__class__.__name__,
                "message": str(exc),
                "stepLabelTimesteps": self.start_progress_timesteps,
            }

    def _capture(self, step_label: int, progress_timesteps: int) -> None:
        vec_env = self.training_env
        if not isinstance(vec_env, VecNormalize):
            raise RuntimeError("BT93J.5c snapshots require VecNormalize training env")
        learning_metrics = {
            "requestedTimesteps": self.total_timesteps,
            "modelNumTimesteps": int(self.model.num_timesteps),
            "progressTimesteps": progress_timesteps,
            "ppoLearningMetrics": _ppo_learning_metrics(self.model, self.config, self.run_kind),
        }
        checkpoint = _write_bt93j_longrun_checkpoint(
            model=self.model,
            vec_env=vec_env,
            config=self.config,
            config_path=self.config_path,
            run_dir=self.run_dir,
            run_id=self.run_id,
            run_kind=self.run_kind,
            phase_id=self.phase_id,
            step_label=step_label,
            progress_timesteps=progress_timesteps,
        )
        eval_snapshot = _write_bt93j_longrun_eval_snapshot(
            snapshot_manifest=checkpoint,
            config=self.config,
            run_id=self.run_id,
            run_kind=self.run_kind,
            phase_id=self.phase_id,
            step_label=step_label,
            progress_timesteps=progress_timesteps,
            learning_metrics=learning_metrics,
        )
        entry = {
            "stepLabelTimesteps": step_label,
            "progressTimesteps": progress_timesteps,
            "modelNumTimesteps": int(self.model.num_timesteps),
            "checkpoint": {
                "ok": True,
                "path": checkpoint["artifacts"]["snapshotManifest"],
                "sha256": _sha256_file(_repo_path(str(checkpoint["artifacts"]["snapshotManifest"]))),
            },
            "evalSnapshot": eval_snapshot,
        }
        self.snapshots.append(entry)
        if eval_snapshot["ok"] is not True:
            self.stop_reason = f"technical-stop-at-{step_label}"

    def _on_step(self) -> bool:
        if self.stop_reason:
            return False
        progress = self.start_progress_timesteps + int(self.model.num_timesteps) - self.start_timesteps
        try:
            while self.next_step <= self.total_timesteps and progress >= self.next_step:
                self._capture(self.next_step, progress)
                self.next_step += self.interval
                if self.stop_reason:
                    return False
        except Exception as exc:
            self.stop_reason = f"snapshot-error-at-{self.next_step}"
            self.stop_error = {
                "type": exc.__class__.__name__,
                "message": str(exc),
                "stepLabelTimesteps": self.next_step,
            }
            return False
        return True

    def capture_target_if_missing(self) -> None:
        if self.stop_reason:
            return
        captured = {int(entry["stepLabelTimesteps"]) for entry in self.snapshots}
        progress = self.start_progress_timesteps + int(self.model.num_timesteps) - self.start_timesteps
        if self.total_timesteps not in captured and progress >= self.total_timesteps:
            self._capture(self.total_timesteps, progress)


def _read_bt93j_snapshot_entry(snapshot_dir: Path) -> dict[str, Any] | None:
    manifest_path = snapshot_dir / "snapshot_manifest.json"
    eval_path = snapshot_dir / "eval_snapshot.json"
    if not manifest_path.exists() or not eval_path.exists():
        return None
    manifest = _read_json(manifest_path)
    eval_report = _read_json(eval_path)
    return {
        "stepLabelTimesteps": int(manifest.get("stepLabelTimesteps") or eval_report.get("stepLabelTimesteps") or 0),
        "progressTimesteps": int(manifest.get("progressTimesteps") or eval_report.get("progressTimesteps") or 0),
        "modelNumTimesteps": int(manifest.get("modelNumTimesteps") or 0),
        "checkpoint": {
            "ok": True,
            "path": _rel(manifest_path),
            "sha256": _sha256_file(manifest_path),
        },
        "evalSnapshot": {
            "ok": bool((eval_report.get("technicalStopGate") or {}).get("ok")),
            "path": _rel(eval_path),
            "sha256": _sha256_file(eval_path),
            "summary": _bt93j_eval_summary(eval_report),
            "episodeTargetGate": eval_report.get("episodeTargetGate") or {},
            "technicalStopGate": eval_report.get("technicalStopGate") or {},
        },
    }


def _collect_bt93j_longrun_snapshot_entries(run_dir: Path | None) -> list[dict[str, Any]]:
    if run_dir is None or not run_dir.exists():
        return []
    snapshot_root = run_dir / "longrun_snapshots"
    if not snapshot_root.exists():
        return []
    entries: list[dict[str, Any]] = []
    for snapshot_dir in sorted(path for path in snapshot_root.iterdir() if path.is_dir()):
        entry = _read_bt93j_snapshot_entry(snapshot_dir)
        if entry is not None:
            entries.append(entry)
    return entries


def _build_bt93j_user_owned_longrun_report(
    *,
    config: Mapping[str, Any],
    config_path: Path,
    run_dir: Path,
    run_id: str,
    phase_id: str,
    gate_inputs: Mapping[str, Any],
    requested_timesteps: int,
    learning_report: Mapping[str, Any],
    final_package: ModelPackage,
    callback: _BT93JLongrunSnapshotCallback,
    prior_snapshots: list[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    interval = int((config.get("rollout") or {}).get("checkpointFrequencyTimesteps") or 50000)
    expected_steps = list(range(interval, requested_timesteps + 1, interval))
    by_step: dict[int, dict[str, Any]] = {}
    for entry in list(prior_snapshots or []) + list(callback.snapshots):
        step = int(entry.get("stepLabelTimesteps") or 0)
        if step > 0:
            by_step[step] = dict(entry)
    snapshots = [by_step[step] for step in sorted(by_step)]
    present_steps = {
        int(entry.get("stepLabelTimesteps") or 0)
        for entry in snapshots
        if (entry.get("checkpoint") or {}).get("ok") is True and (entry.get("evalSnapshot") or {}).get("path")
    }
    missing_steps = [step for step in expected_steps if step not in present_steps]
    final_snapshot = snapshots[-1] if snapshots else None
    final_summary = ((final_snapshot or {}).get("evalSnapshot") or {}).get("summary") or {}
    final_avg = _number(final_summary.get("avgStepsPerEpisodeObserved"))
    terminal = final_summary.get("terminalMatrix") or {}
    start_artifacts = config.get("artifacts") or {}
    r2_report = _read_json(_repo_path(str(start_artifacts.get("r2CounterprobeReport"))))
    start_avg = _number((r2_report.get("avgStepsTrend") or {}).get("currentAvgStepsPerEpisodeObserved"))
    dqn_anchor = _number(((gate_inputs.get("dqnChampion") or {}).get("avgStepsPerEpisode")))
    player_dead_only = bool(terminal.get("playerDeadOnly"))
    natural_terminal_count = int(terminal.get("naturalTerminalCount") or 0)
    technical_gates_ok = all(
        bool(((entry.get("evalSnapshot") or {}).get("technicalStopGate") or {}).get("ok"))
        for entry in snapshots
    )
    technical_stop = bool(str(callback.stop_reason or "").startswith("technical-stop"))
    measurement_invalid = bool(
        callback.stop_error
        or not snapshots
        or final_avg is None
        or (missing_steps and not technical_stop)
    )
    new_instability = bool(not measurement_invalid and (technical_stop or not technical_gates_ok))
    green_for_phase6 = bool(
        not measurement_invalid
        and not new_instability
        and dqn_anchor is not None
        and final_avg is not None
        and final_avg >= dqn_anchor
        and not player_dead_only
        and natural_terminal_count > 0
    )
    steps_improved = bool(start_avg is not None and final_avg is not None and final_avg > start_avg)
    terminal_diversified = bool(not player_dead_only or natural_terminal_count > 0)
    if measurement_invalid:
        result_class = "measurement-invalid"
    elif new_instability:
        result_class = "new-instability"
    elif green_for_phase6:
        result_class = "green-for-93J.6"
    elif steps_improved and terminal_diversified:
        result_class = "undertraining-supported"
    else:
        result_class = "reward-still-blocking"

    return {
        "ok": result_class in {
            "green-for-93J.6",
            "undertraining-supported",
            "reward-still-blocking",
            "new-instability",
            "measurement-invalid",
        },
        "generatedAt": _utc_now(),
        "generatedBy": "python/train.py::BT93J.5c",
        "blockId": "BT93J",
        "phaseId": phase_id,
        "runId": run_id,
        "runKind": BT93J_USER_OWNED_PROOF_LONGRUN_KIND,
        "resultClass": result_class,
        "requestedTimesteps": requested_timesteps,
        "actualProgressTimesteps": int(learning_report.get("progressTimesteps") or 0),
        "modelNumTimesteps": int(learning_report.get("modelNumTimesteps") or 0),
        "classificationRules": {
            "greenFor93J6": "final eval avgStepsPerEpisodeObserved >= DQN anchor, terminal matrix is not player-dead-only, natural terminal evidence exists, and no technical stop fired",
            "undertrainingSupported": "steps improved from the R2 same-red start and terminal distribution diversified, but 93J.6 gate is still not green",
            "rewardStillBlocking": "1M diagnostic proof lane did not separate reward/curriculum from the same-red start finding",
            "newInstability": "runtime, action-safety, non-finite metric, or technical stop rule fired",
            "measurementInvalid": "mandatory checkpoint/eval snapshot missing, final eval unavailable, or snapshot writer failed",
        },
        "startFinding": {
            "r2ResultClass": r2_report.get("resultClass"),
            "avgStepsPerEpisodeObserved": start_avg,
            "dqnAnchor": dqn_anchor,
            "playerDeadOnly": (r2_report.get("terminalMatrix") or {}).get("playerDeadOnly"),
        },
        "finalEval": final_summary,
        "trend": {
            "stepsImproved": steps_improved,
            "terminalDiversified": terminal_diversified,
            "deltaVsStartAvgSteps": (
                round(final_avg - start_avg, 6)
                if final_avg is not None and start_avg is not None
                else None
            ),
            "deltaVsDqnAnchor": (
                round(final_avg - dqn_anchor, 6)
                if final_avg is not None and dqn_anchor is not None
                else None
            ),
        },
        "snapshotCadence": {
            "checkpointFrequencyTimesteps": interval,
            "evalIntervalTimesteps": int((config.get("rollout") or {}).get("evalIntervalTimesteps") or interval),
            "expectedSteps": expected_steps,
            "presentSteps": sorted(present_steps),
            "missingSteps": missing_steps,
            "ok": not missing_steps,
        },
        "technicalStop": {
            "stopReason": callback.stop_reason,
            "stopError": callback.stop_error,
            "allSnapshotGatesOk": technical_gates_ok,
            "measurementInvalid": measurement_invalid,
            "newInstability": new_instability,
        },
        "snapshots": snapshots,
        "learning": dict(learning_report),
        "sourceConfig": {
            "path": _rel(config_path),
            "sha256": _sha256_file(config_path),
        },
        "artifacts": {
            "runDirectory": _rel(run_dir),
            "trainingReport": _rel(run_dir / "training_report.json"),
            "artifactManifest": _rel(final_package.manifest_path),
            "artifactManifestSha256": _sha256_file(final_package.manifest_path),
            "model": _rel(final_package.model_path),
            "modelSha256": final_package.model_sha256,
            "vecnormalize": _rel(final_package.vecnormalize_path),
            "vecnormalizeSha256": final_package.vecnormalize_sha256,
            "optimizerState": _rel(final_package.optimizer_path),
            "optimizerStateSha256": final_package.optimizer_sha256,
        },
        "phaseCoverage": {
            "93J.5c.1": True,
            "93J.5c.2": requested_timesteps == 1000000 and result_class != "measurement-invalid",
            "93J.5c.3": not missing_steps,
            "93J.5c.4": final_snapshot is not None,
            "93J.5c.5": True,
            "93J.5c.6": True,
        },
        "guardrails": {
            "diagnosticOnly": True,
            "holdoutUsed": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "bt94aGateRefresh": False,
            "ppoValidateEvidence": False,
            "rolloutSignal": False,
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
        },
        "nextAllowedStep": "93J.6 only if resultClass=green-for-93J.6; otherwise diagnose/replan without BT94A claim",
    }


def run_training_from_cli(
    *,
    run_kind: str,
    phase_id: str,
    config_path: str | None,
    artifact_root: str | None,
    total_timesteps: int | None,
    checkpoint: str | None,
    longrun_start_progress: int | None = None,
    longrun_capture_start_snapshot: bool = False,
    longrun_prior_run_dirs: list[str] | None = None,
) -> dict[str, Any]:
    if run_kind not in {
        "learner-smoke",
        "resume-smoke",
        "diagnostics-smoke",
        "pilot-train",
        "baseline-train",
        "repair-diagnostic",
        "technical-smoke",
        "comparable-repair",
        "comparable-terminal-repair",
        "terminal-curriculum-repair",
        BT93J_R2_TRAIN_RUN_KIND,
        BT93J_USER_OWNED_PROOF_LONGRUN_KIND,
    }:
        raise RuntimeError(f"unsupported BT93C train run kind: {run_kind}")
    resolved_config_path, config = _load_config(Path(config_path).resolve() if config_path else None)
    block_id = str(config.get("blockId") or "BT93C")
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
    if run_kind in {
        "resume-smoke",
        "diagnostics-smoke",
        "pilot-train",
        "baseline-train",
        "repair-diagnostic",
        "comparable-repair",
        "comparable-terminal-repair",
        "terminal-curriculum-repair",
        BT93J_R2_TRAIN_RUN_KIND,
        BT93J_USER_OWNED_PROOF_LONGRUN_KIND,
    }:
        prefer_pointer = {
            "resume-smoke": "latest_learner_smoke.json",
            "comparable-repair": "latest_technical_smoke.json",
            "comparable-terminal-repair": "latest_model_package.json",
            BT93J_R2_TRAIN_RUN_KIND: "latest_model_package.json",
            BT93J_USER_OWNED_PROOF_LONGRUN_KIND: "latest_model_package.json",
        }.get(run_kind, "latest_model_package.json")
        source_package = _resolve_package(
            checkpoint,
            artifact_root_path,
            prefer=prefer_pointer,
        )
    longrun_resume_offset = 0
    if run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND:
        longrun_resume_offset = (
            int(longrun_start_progress)
            if longrun_start_progress is not None
            else int(source_package.step_label_timesteps or 0)
            if source_package is not None
            else 0
        )
        if source_package is not None and longrun_start_progress is not None:
            source_package = replace(source_package, step_label_timesteps=longrun_resume_offset)
    longrun_planned_total = int(
        (rollout_cfg.get("userOwnedProofLongrunTimesteps") or total_timesteps or 0)
        if run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND
        else 0
    )
    timestep_key = {
        "learner-smoke": "learnerTimesteps",
        "resume-smoke": "resumeTimesteps",
        "diagnostics-smoke": "diagnosticsTimesteps",
        "pilot-train": "pilotTimesteps",
        "baseline-train": "baselineTimesteps",
        "repair-diagnostic": "repairTimesteps",
        "technical-smoke": "technicalSmokeTimesteps",
        "comparable-repair": "shortRepairTimesteps",
        "comparable-terminal-repair": "terminalRepairTimesteps",
        "terminal-curriculum-repair": "terminalCurriculumSmokeTimesteps",
        BT93J_R2_TRAIN_RUN_KIND: "r2MicroTrainTimesteps",
        BT93J_USER_OWNED_PROOF_LONGRUN_KIND: "userOwnedProofLongrunTimesteps",
    }[run_kind]
    timesteps = int(
        total_timesteps
        or rollout_cfg.get(timestep_key)
        or rollout_cfg.get("diagnosticsTimesteps")
        or rollout_cfg["resumeTimesteps"]
    )

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
        longrun_callback = (
            _BT93JLongrunSnapshotCallback(
                config=config,
                config_path=resolved_config_path,
                run_dir=run_dir,
                run_id=run_id,
                run_kind=run_kind,
                phase_id=phase_id,
                total_timesteps=longrun_planned_total,
                start_progress_timesteps=longrun_resume_offset,
                capture_start_snapshot=longrun_capture_start_snapshot,
            )
            if run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND
            else None
        )
        started = time.perf_counter()
        model.learn(
            total_timesteps=timesteps,
            reset_num_timesteps=(run_kind == "learner-smoke"),
            callback=longrun_callback,
        )
        if longrun_callback is not None:
            longrun_callback.capture_target_if_missing()
        elapsed = time.perf_counter() - started
        updates_after = int(getattr(model, "_n_updates", 0))
        ppo_metrics = _ppo_learning_metrics(model, config, run_kind)
        progress_timesteps = (
            longrun_callback.start_progress_timesteps + int(model.num_timesteps) - longrun_callback.start_timesteps
            if longrun_callback is not None
            else int(model.num_timesteps)
        )
        learning_report = {
            "requestedTimesteps": timesteps,
            "modelNumTimesteps": int(model.num_timesteps),
            "progressTimesteps": progress_timesteps,
            "optimizerUpdatesBefore": updates_before,
            "optimizerUpdatesAfter": updates_after,
            "optimizerUpdatesCompleted": updates_after > updates_before,
            "wallClockSeconds": round(elapsed, 6),
            "stepsPerSecond": round(float(model.num_timesteps) / elapsed, 6) if elapsed > 0 else 0.0,
            "diagnosticOnly": _is_diagnostic_run(run_kind),
            "learningQualityClaimAllowed": block_id == "BT93C" and _is_baseline_run(run_kind),
            "repairEvidenceClaimAllowed": (
                (block_id == "BT93G" and run_kind == "comparable-repair")
                or (block_id == "BT93H" and run_kind == "comparable-terminal-repair")
                or (block_id == "BT93I" and run_kind == "terminal-curriculum-repair")
                or (block_id == "BT93J" and run_kind == BT93J_R2_TRAIN_RUN_KIND)
                or (block_id == "BT93J" and run_kind == BT93J_USER_OWNED_PROOF_LONGRUN_KIND)
            ),
            "baselineComparable": block_id == "BT93C" and _is_baseline_run(run_kind),
            "ppoLearningMetrics": ppo_metrics,
            "telemetry": _telemetry(vec_env),
            "trainingCommand": " ".join(sys.argv),
        }
        if longrun_callback is not None:
            learning_report["longrunSnapshots"] = {
                "plannedTotalTimesteps": longrun_planned_total,
                "startProgressTimesteps": longrun_callback.start_progress_timesteps,
                "checkpointFrequencyTimesteps": longrun_callback.interval,
                "capturedCount": len(longrun_callback.snapshots),
                "capturedSteps": [
                    int(entry["stepLabelTimesteps"])
                    for entry in longrun_callback.snapshots
                ],
                "stopReason": longrun_callback.stop_reason,
                "stopError": longrun_callback.stop_error,
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
            "blockId": block_id,
            "phaseId": phase_id,
            "runId": run_id,
            "runKind": run_kind,
            "truePpoOptimizerUpdate": learning_report["optimizerUpdatesCompleted"],
            "truePpoModelPackage": True,
            "resumedFrom": _package_pointer(source_package) if source_package else None,
            "loadCompatibility": _numpy_pickle_compat_report(
                source_package.vecnormalize_path if source_package else None
            ),
            "learning": learning_report,
            "artifacts": manifest["artifacts"],
            "policy": manifest["policy"],
            "optimizer": manifest["optimizer"],
            "gateInputs": gate_inputs,
            "guardrails": manifest["guardrails"],
            "baselineRunsStarted": block_id == "BT93C" and _is_baseline_run(run_kind),
            "pilotRunsStarted": block_id == "BT93C" and (_is_pilot_run(run_kind) or _is_baseline_run(run_kind)),
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
        }
        if longrun_callback is not None:
            prior_snapshot_entries: list[Mapping[str, Any]] = []
            prior_dirs: list[Path] = []
            if source_package is not None and source_package.source_run_dir is not None:
                prior_dirs.append(source_package.source_run_dir)
            for prior_dir in longrun_prior_run_dirs or []:
                prior_dirs.append(_repo_path(prior_dir))
            seen_prior_dirs: set[str] = set()
            for prior_dir in prior_dirs:
                prior_key = str(prior_dir.resolve())
                if prior_key in seen_prior_dirs:
                    continue
                seen_prior_dirs.add(prior_key)
                prior_snapshot_entries.extend(_collect_bt93j_longrun_snapshot_entries(prior_dir))
            longrun_report = _build_bt93j_user_owned_longrun_report(
                config=config,
                config_path=resolved_config_path,
                run_dir=run_dir,
                run_id=run_id,
                phase_id=phase_id,
                gate_inputs=gate_inputs,
                requested_timesteps=longrun_planned_total,
                learning_report=learning_report,
                final_package=package,
                callback=longrun_callback,
                prior_snapshots=prior_snapshot_entries,
            )
            longrun_report_path = artifact_root_path / "user_owned_1m_longrun_report.json"
            _write_json(longrun_report_path, longrun_report)
            _write_json(
                artifact_root_path / "latest_bt93j_user_owned_1m_longrun_report.json",
                {
                    "ok": True,
                    "resultClass": longrun_report["resultClass"],
                    "runId": run_id,
                    "runKind": run_kind,
                    "report": _rel(longrun_report_path),
                    "sha256": _sha256_file(longrun_report_path),
                },
            )
            report["artifacts"]["userOwned1mLongrunReport"] = _rel(longrun_report_path)
            report["artifacts"]["userOwned1mLongrunReportSha256"] = _sha256_file(longrun_report_path)
            report["longrunResultClass"] = longrun_report["resultClass"]
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
    run_kind: str,
    phase_id: str,
    config_path: str | None,
    artifact_root: str | None,
    eval_steps: int | None,
    max_eval_steps: int | None = None,
    min_completed_episodes: int | None = None,
    checkpoint: str | None,
) -> dict[str, Any]:
    if run_kind not in {
        "eval-smoke",
        "diagnostics-eval",
        "pilot-eval",
        "baseline-eval",
        "baseline-repro-eval",
        "holdout-eval",
        "comparable-repair-eval",
        "comparable-terminal-repair-eval",
        "terminal-curriculum-repair-eval",
        BT93J_R2_EVAL_RUN_KIND,
    }:
        raise RuntimeError(f"unsupported BT93C eval run kind: {run_kind}")
    resolved_config_path, config = _load_config(Path(config_path).resolve() if config_path else None)
    block_id = str(config.get("blockId") or "BT93C")
    baseline_claim_allowed = block_id == "BT93C" and _is_baseline_run(run_kind)
    gate_inputs = _validate_gate_inputs(config)
    artifact_root_path = _repo_path(artifact_root or str((config.get("artifacts") or {}).get("root") or DEFAULT_ARTIFACT_ROOT))
    source_package = _resolve_package(checkpoint, artifact_root_path)
    run_id = _run_id(run_kind)
    run_dir = artifact_root_path / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    env_cfg = config["env"]
    seed_key = "holdoutSeeds" if run_kind == "holdout-eval" else "evalSeeds"
    seeds = [int(seed) for seed in env_cfg[seed_key][: int(env_cfg["evalEnvCount"])]]
    target_completed_episodes = int(min_completed_episodes or 0)
    steps = int(max_eval_steps or eval_steps or config["rollout"]["evalSteps"])

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
        info_samples: list[dict[str, Any]] = []
        completed_episode_lengths: list[int] = []
        open_episode_lengths = [0 for _ in seeds]
        vector_steps_executed = 0
        stop_reason = "step-limit"
        for _ in range(steps):
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, done, infos = vec_env.step(action)
            vector_steps_executed += 1
            reward_entries = [float(entry) for entry in np.asarray(reward).reshape(-1)]
            done_entries = [bool(entry) for entry in np.asarray(done).reshape(-1)]
            rewards.extend(reward_entries)
            done_count += int(np.count_nonzero(done))
            for index, info in enumerate(infos):
                if index < len(open_episode_lengths):
                    open_episode_lengths[index] += 1
                    if index < len(done_entries) and done_entries[index]:
                        completed_episode_lengths.append(open_episode_lengths[index])
                        open_episode_lengths[index] = 0
                info_samples.append(dict(info))
                if len(info_tail) < 4:
                    info_tail.append(dict(info))
            if target_completed_episodes > 0 and len(completed_episode_lengths) >= target_completed_episodes:
                stop_reason = "min-completed-episodes"
                break
        telemetry_reports = _telemetry(vec_env)
        source_training_report = None
        source_training_report_path = source_package.manifest_path.parent / "training_report.json"
        if source_training_report_path.exists():
            source_training_report = _read_json(source_training_report_path)
        diagnostics = _collect_eval_diagnostics(
            block_id=block_id,
            run_kind=run_kind,
            info_samples=info_samples,
            telemetry_reports=telemetry_reports,
            reward_values=rewards,
            done_count=done_count,
            completed_episode_lengths=completed_episode_lengths,
            open_episode_lengths=open_episode_lengths,
            env_count=len(seeds),
            max_steps_per_episode=int(env_cfg["maxStepsPerEpisode"]),
            training_report=source_training_report,
            model_reload_ms=load_elapsed_ms,
            forward_pass_ms=forward_elapsed_ms,
        )
        report = {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/eval.py",
            "blockId": block_id,
            "phaseId": phase_id,
            "runId": run_id,
            "runKind": run_kind,
            "loadedRealPpoModel": True,
            "sourcePackage": _package_pointer(source_package),
            "loadCompatibility": _numpy_pickle_compat_report(source_package.vecnormalize_path),
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
                "steps": vector_steps_executed,
                "stepLimit": steps,
                "rewardTotal": round(sum(rewards), 6),
                "rewardMean": round(sum(rewards) / len(rewards), 6) if rewards else 0.0,
                "doneCount": done_count,
                "telemetry": telemetry_reports,
                "infoTail": info_tail,
            },
            "episodeTargetGate": {
                "enabled": target_completed_episodes > 0,
                "minCompletedEpisodes": target_completed_episodes or None,
                "completedEpisodeCount": len(completed_episode_lengths),
                "satisfied": (
                    len(completed_episode_lengths) >= target_completed_episodes
                    if target_completed_episodes > 0
                    else None
                ),
                "stopReason": stop_reason,
                "maxEvalSteps": steps,
                "vectorStepsExecuted": vector_steps_executed,
            },
            "evalCommand": " ".join(sys.argv),
            "diagnostics": diagnostics,
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
                "baselineRunsStarted": baseline_claim_allowed,
                "pilotRunsStarted": block_id == "BT93C" and (_is_pilot_run(run_kind) or _is_baseline_run(run_kind)),
                "diagnosticOnly": block_id == "BT93F" or _is_diagnostic_run(run_kind),
                "learningQualityClaimAllowed": baseline_claim_allowed,
                "repairEvidenceClaimAllowed": _is_comparable_repair_eval(block_id, run_kind),
                "candidateRun": False,
                "freezeCandidate": False,
                "promotionAllowed": False,
            },
        }
        report_path = run_dir / "eval_report.json"
        _write_json(report_path, report)
        pointer = {
            "runId": run_id,
            "runKind": run_kind,
            "ok": True,
            "report": _rel(report_path),
            "sourceArtifactManifest": _rel(source_package.manifest_path),
            "sourceModel": _rel(source_package.model_path),
        }
        pointer_name = {
            "diagnostics-eval": "latest_diagnostics_eval.json",
            "pilot-eval": "latest_pilot_eval.json",
            "baseline-eval": "latest_baseline_eval.json",
            "baseline-repro-eval": "latest_baseline_repro_eval.json",
            "holdout-eval": "latest_holdout_eval.json",
            "comparable-repair-eval": "latest_comparable_repair_eval.json",
            "comparable-terminal-repair-eval": "latest_comparable_terminal_repair_eval.json",
                "terminal-curriculum-repair-eval": "latest_terminal_curriculum_repair_eval.json",
                BT93J_R2_EVAL_RUN_KIND: "latest_bt93j_r2_micro_train_counterprobe_eval.json",
            }.get(run_kind, "latest_eval_smoke.json")
        _write_json(artifact_root_path / pointer_name, pointer)
        print(json.dumps({
            "ok": True,
            "runId": run_id,
            "report": _rel(report_path),
            "sourceArtifactManifest": _rel(source_package.manifest_path),
            "forwardPassMs": report["forwardPass"]["wallClockMs"],
            "rewardTotal": report["eval"]["rewardTotal"],
            "episodeTargetGate": report["episodeTargetGate"],
        }, indent=2))
        return report
    finally:
        if vec_env is not None:
            vec_env.close()
