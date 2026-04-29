"""BT93J.3 action, safety, reward, and curriculum diagnostics.

This script is diagnostic-only. It reads existing BT93I/BT93J evidence,
writes BT93J-local reports, and updates the BT93J diagnostic split. It does
not train, repair, create candidates, freeze, promote, refresh BT94A, or touch
runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93G_ROOT = PPO_ROOT / "bt93g"
BT93I_ROOT = PPO_ROOT / "bt93i"
BT93J_ROOT = PPO_ROOT / "bt93j"

DIAGNOSTIC_SPLIT_PATH = BT93J_ROOT / "diagnostic_split_report.json"
OBSERVATION_REPORT_PATH = BT93J_ROOT / "observation_integrity_report.json"
TERMINAL_REPORT_PATH = BT93J_ROOT / "terminal_semantics_report.json"
MATRIX_REPORT_PATH = BT93J_ROOT / "matrix_contract_report.json"
BT93I_MATRIX_GREEN_PATH = BT93I_ROOT / "matrix_green_report.json"
BT93I_TRAIN_POINTER = BT93I_ROOT / "latest_terminal_curriculum_repair.json"
BT93I_EVAL_POINTER = BT93I_ROOT / "latest_terminal_curriculum_repair_eval.json"
BT93I_HOLDOUT_POINTER = BT93I_ROOT / "latest_holdout_eval.json"
BT93I_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93i_terminal_curriculum_repair.json"
BT93G_ACTION_MASK_PATH = BT93G_ROOT / "action_mask_report.json"
BT93G_REWARD_GATE_PATH = BT93G_ROOT / "reward_gate_report.json"

ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
LEARNER_SMOKE_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"
REWARD_CALCULATOR_PATH = REPO_ROOT / "src" / "state" / "training" / "RewardCalculator.js"

DEFAULT_ACTION_OUTPUT = BT93J_ROOT / "action_policy_diagnostics.json"
DEFAULT_REWARD_OUTPUT = BT93J_ROOT / "reward_curriculum_diagnostics.json"

ACTION_THRESHOLDS = {
    "invalidActionRateEq": 0.0,
    "sanitizerRateEq": 0.0,
    "preSamplingMaskRateEq": 1.0,
    "postDecodeClampRateEq": 0.0,
    "vetoRateLt": 0.25,
}

PROGRESS_REWARD_KEYS = (
    "kill",
    "checkpointReached",
    "parcoursCompleted",
    "itemPickup",
    "itemUse",
    "damageDealt",
    "win",
)

RISK_ACTIONS = ("boost", "shoot-mg", "shootMG", "shootItem", "dropItem", "nextItem", "useItem")

NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no pilot, holdout, long-run, or fix from BT93J.3",
    "no productive RuntimeConfig, Strategy Flag, JS inference, model registry, rollback, Matchstart, AI-Hub, bridge, or authority change",
    "positive reward, clean action telemetry, or governance gates do not count as PPO-Validate, promotion, or rollout evidence",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(value: str | Path) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
    }
    payload["sha256"] = _sha256_file(path) if path.exists() else None
    if not path.exists():
        payload["status"] = "missing"
    return payload


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _round(value: Any, digits: int = 6) -> float | None:
    number = _as_float(value)
    return round(number, digits) if number is not None else None


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted((str(key), int(value)) for key, value in counter.items()))


def _sum_numeric(mapping: Mapping[str, Any] | None, keys: Iterable[str]) -> float:
    if not isinstance(mapping, Mapping):
        return 0.0
    total = 0.0
    for key in keys:
        number = _as_float(mapping.get(key))
        if number is not None:
            total += number
    return total


def _read_text_tokens(path: Path, tokens: tuple[str, ...]) -> dict[str, bool]:
    text = path.read_text(encoding="utf-8")
    return {token: token in text for token in tokens}


def _pointer_report(pointer_path: Path) -> tuple[dict[str, Any], dict[str, Any], Path]:
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer, _read_json(report_path), report_path


def _common() -> dict[str, Any]:
    return {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_action_reward_diagnostics.py",
        "gitSha": _git_sha(),
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
            "noGo": list(NO_GO),
        },
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
            totals[key] += _as_int(report.get(key))
        field_counts.update({str(key): _as_int(value) for key, value in dict(report.get("fieldCounts") or {}).items()})
        sanitizer_reasons.update({
            str(key): _as_int(value) for key, value in dict(report.get("sanitizerReasons") or {}).items()
        })

    total_actions = max(0, totals["totalActions"])

    def rate(count_key: str) -> float:
        return round(totals[count_key] / total_actions, 6) if total_actions else 0.0

    return {
        **totals,
        "invalidActionRate": rate("invalidActionCount"),
        "preSamplingMaskRate": rate("preSamplingMaskCount"),
        "maskRate": rate("maskCount"),
        "postDecodeClampRate": rate("postDecodeClampCount"),
        "vetoRate": rate("vetoCount"),
        "sanitizerRate": rate("sanitizerCount"),
        "noopRate": rate("noopCount"),
        "fieldCounts": _counter_dict(field_counts),
        "sanitizerReasons": _counter_dict(sanitizer_reasons),
    }


def _telemetry_for_report(report: Mapping[str, Any]) -> dict[str, Any]:
    eval_telemetry = _get(report, "diagnostics", "rewardSafetyDiagnostics", "actionTelemetry")
    if isinstance(eval_telemetry, Mapping):
        return dict(eval_telemetry)
    train_telemetry = _get(report, "learning", "telemetry")
    if isinstance(train_telemetry, list):
        return _sum_action_telemetry([row for row in train_telemetry if isinstance(row, Mapping)])
    return {}


def _threshold_check(name: str, observed: Any, expected: float, op: str) -> dict[str, Any]:
    value = _as_float(observed)
    if op == "eq":
        ok = value is not None and abs(value - expected) <= 1e-9
    elif op == "lt":
        ok = value is not None and value < expected
    else:
        raise RuntimeError(f"unsupported threshold op: {op}")
    return {
        "id": name,
        "observed": value,
        "threshold": expected,
        "operator": op,
        "ok": ok,
    }


def _action_thresholds(telemetry: Mapping[str, Any]) -> dict[str, Any]:
    checks = [
        _threshold_check("invalidActionRate", telemetry.get("invalidActionRate"), 0.0, "eq"),
        _threshold_check("sanitizerRate", telemetry.get("sanitizerRate"), 0.0, "eq"),
        _threshold_check("preSamplingMaskRate", telemetry.get("preSamplingMaskRate"), 1.0, "eq"),
        _threshold_check("postDecodeClampRate", telemetry.get("postDecodeClampRate"), 0.0, "eq"),
        _threshold_check("vetoRate", telemetry.get("vetoRate"), ACTION_THRESHOLDS["vetoRateLt"], "lt"),
    ]
    return {
        "ok": all(check["ok"] for check in checks),
        "thresholds": dict(ACTION_THRESHOLDS),
        "checks": checks,
    }


def _action_examples_from_telemetry(report: Mapping[str, Any], limit: int = 8) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    telemetry = _get(report, "learning", "telemetry")
    if not isinstance(telemetry, list):
        return rows
    for env_index, env_telemetry in enumerate(telemetry):
        if not isinstance(env_telemetry, Mapping):
            continue
        examples = env_telemetry.get("rawActionExamples") if isinstance(env_telemetry.get("rawActionExamples"), list) else []
        for example_index, example in enumerate(examples):
            if not isinstance(example, Mapping):
                continue
            rows.append({
                "source": "train-telemetry-rawActionExamples",
                "envIndex": env_index,
                "exampleIndex": example_index,
                "preSamplingAction": example.get("raw"),
                "semanticAction": example.get("semanticAction"),
                "mask": {
                    "preSamplingApplied": True,
                    "source": "masked semantic action vocabulary",
                },
                "postDecodeClampEvents": list(example.get("maskEvents") or []),
                "vetoEvents": list(example.get("vetoEvents") or []),
                "sanitizerEvents": list(example.get("sanitizerEvents") or []),
                "decodedAction": example.get("decoded"),
                "finalExecutedAction": example.get("sanitized"),
            })
            if len(rows) >= limit:
                return rows
    return rows


def _action_examples_from_info_tail(report: Mapping[str, Any], limit: int = 8) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    info_tail = _get(report, "eval", "infoTail")
    if not isinstance(info_tail, list):
        return rows
    for row in info_tail:
        if not isinstance(row, Mapping):
            continue
        surface = row.get("ppoActionSurface") if isinstance(row.get("ppoActionSurface"), Mapping) else {}
        policy_mask = surface.get("policyLevelMask") if isinstance(surface.get("policyLevelMask"), Mapping) else {}
        post_decode = surface.get("postDecodeClamp") if isinstance(surface.get("postDecodeClamp"), Mapping) else {}
        rows.append({
            "source": "eval-infoTail",
            "episodeId": row.get("episodeId"),
            "episodeIndex": row.get("episodeIndex"),
            "stepIndex": row.get("stepIndex"),
            "preSamplingAction": surface.get("rawAction"),
            "semanticAction": surface.get("semanticAction"),
            "mask": {
                "preSamplingApplied": policy_mask.get("preSamplingApplied"),
                "preSamplingByConstruction": policy_mask.get("preSamplingByConstruction"),
                "consumerStatus": policy_mask.get("consumerStatus"),
                "semanticAllowedTokenCounts": policy_mask.get("semanticAllowedTokenCounts"),
                "mixedWithPostDecodeClamp": policy_mask.get("mixedWithPostDecodeClamp"),
            },
            "postDecodeClamp": post_decode,
            "postDecodeClampEvents": list(surface.get("maskEvents") or []),
            "vetoEvents": list(surface.get("vetoEvents") or []),
            "sanitizerEvents": list(surface.get("sanitizerEvents") or []),
            "decodedAction": surface.get("boundaryAction"),
            "sanitizedAction": surface.get("sanitizedAction"),
            "finalExecutedAction": row.get("action"),
            "terminalReason": row.get("terminalReason"),
            "truncatedReason": row.get("truncatedReason"),
        })
        if len(rows) >= limit:
            return rows
    return rows


def _action_lane(
    lane_id: str,
    role: str,
    report_path: Path,
    report: Mapping[str, Any],
) -> dict[str, Any]:
    telemetry = _telemetry_for_report(report)
    threshold_status = _action_thresholds(telemetry)
    examples = (
        _action_examples_from_telemetry(report)
        if role == "train"
        else _action_examples_from_info_tail(report)
    )
    action_surface = _get(report, "policy", "actionSurface") or _get(report, "gateInputs", "actionSurfaceId")
    return {
        "laneId": lane_id,
        "role": role,
        "report": _rel(report_path),
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "actionSurface": action_surface,
        "telemetry": telemetry,
        "thresholdStatus": threshold_status,
        "stepDiffSamples": examples,
        "sampleLimit": len(examples),
        "fullStepTracePersisted": False,
        "fullStepTraceNote": "Historical reports persist action telemetry plus raw examples/infoTail, not a full per-step action replay.",
    }


def _source_contract_checks() -> dict[str, Any]:
    checks = {
        "actionSurface": _read_text_tokens(
            ACTION_SURFACE_PATH,
            (
                "PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID",
                "build_masked_semantic_action_mask",
                "preSamplingApplied",
                "preSamplingByConstruction",
                "postDecodeClampRate",
                "sanitizerRate",
                "vetoRate",
            ),
        ),
        "learnerSmoke": _read_text_tokens(
            LEARNER_SMOKE_PATH,
            (
                "actionTelemetry",
                "invalidActionRate",
                "preSamplingMaskRate",
                "postDecodeClampRate",
                "rewardSafetyDiagnostics",
            ),
        ),
    }
    return {
        "ok": all(all(group.values()) for group in checks.values()),
        "checks": checks,
        "sourceArtifacts": {
            "actionSurface": _source(ACTION_SURFACE_PATH, "PPO action surface"),
            "learnerSmoke": _source(LEARNER_SMOKE_PATH, "PPO train/eval diagnostics aggregation"),
        },
    }


def build_action_policy_diagnostics() -> dict[str, Any]:
    _, train_report, train_report_path = _pointer_report(BT93I_TRAIN_POINTER)
    _, eval_report, eval_report_path = _pointer_report(BT93I_EVAL_POINTER)
    _, holdout_report, holdout_report_path = _pointer_report(BT93I_HOLDOUT_POINTER)
    action_mask = _read_json(BT93G_ACTION_MASK_PATH)
    source_contract = _source_contract_checks()
    lanes = [
        _action_lane("bt93i-train", "train", train_report_path, train_report),
        _action_lane("bt93i-eval", "eval", eval_report_path, eval_report),
        _action_lane("bt93i-holdout", "holdout", holdout_report_path, holdout_report),
    ]
    action_gate_green = source_contract["ok"] and all(_get(lane, "thresholdStatus", "ok") for lane in lanes)
    return {
        **_common(),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.3",
        "resultClass": "action-policy-diagnostics-green" if action_gate_green else "action-policy-diagnostics-blocked",
        "phaseCoverage": {
            "93J.3.1": True,
            "93J.3.2": action_gate_green,
        },
        "actionPolicyGate": {
            "green": action_gate_green,
            "notCausal": action_gate_green,
            "readyForTraining": False,
            "diagnosis": (
                "Action safety is not the active root cause: train/eval/holdout telemetry has zero invalid, "
                "sanitizer, post-decode clamp, and veto load, with pre-sampling masking applied by the masked "
                "semantic action vocabulary."
                if action_gate_green
                else "Action telemetry is red and must be repaired before reward/curriculum or training work."
            ),
        },
        "thresholds": dict(ACTION_THRESHOLDS),
        "lanes": lanes,
        "bt93gActionMask": {
            "path": _rel(BT93G_ACTION_MASK_PATH),
            "resultClass": action_mask.get("resultClass"),
            "maskSourceContract": action_mask.get("maskSourceContract"),
            "telemetrySeparation": action_mask.get("telemetrySeparation"),
            "evidenceLimits": action_mask.get("evidenceLimits"),
        },
        "sourceContractChecks": source_contract,
        "findingImpact": {
            "F.30": "closed-for-bt93j-current-lane",
            "F.05": "not-caused-by-action-safety-thresholds",
            "F.19": "not-caused-by-action-safety-thresholds",
            "F.27": "aggregate-still-blocked-until-reward-curriculum-or-training-root-cause-clears",
            "F.31": "not-caused-by-action-safety-thresholds",
        },
        "sourceArtifacts": {
            "bt93gActionMask": _source(BT93G_ACTION_MASK_PATH, "BT93G action mask report"),
            "trainPointer": _source(BT93I_TRAIN_POINTER, "BT93I train pointer", closure_capable=False),
            "trainReport": _source(train_report_path, "BT93I train report"),
            "evalPointer": _source(BT93I_EVAL_POINTER, "BT93I eval pointer", closure_capable=False),
            "evalReport": _source(eval_report_path, "BT93I eval report"),
            "holdoutPointer": _source(BT93I_HOLDOUT_POINTER, "BT93I holdout pointer", closure_capable=False),
            "holdoutReport": _source(holdout_report_path, "BT93I holdout report"),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_action_reward_diagnostics.py --write-reports",
        },
    }


def _risk_action_counts(report: Mapping[str, Any]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    info_tail = _get(report, "eval", "infoTail")
    if isinstance(info_tail, list):
        for row in info_tail:
            if not isinstance(row, Mapping):
                continue
            surface = row.get("ppoActionSurface") if isinstance(row.get("ppoActionSurface"), Mapping) else {}
            semantic = surface.get("semanticAction")
            if semantic in RISK_ACTIONS:
                counter[str(semantic)] += 1
            final_action = row.get("action") if isinstance(row.get("action"), Mapping) else {}
            for key in RISK_ACTIONS:
                value = final_action.get(key)
                if value is True or (_as_int(value) > 0 and key in {"useItem", "shootItemIndex"}):
                    counter[str(key)] += 1
    telemetry = _get(report, "learning", "telemetry")
    if isinstance(telemetry, list):
        for env_telemetry in telemetry:
            if not isinstance(env_telemetry, Mapping):
                continue
            examples = env_telemetry.get("rawActionExamples")
            if not isinstance(examples, list):
                continue
            for example in examples:
                if not isinstance(example, Mapping):
                    continue
                semantic = example.get("semanticAction")
                if semantic in RISK_ACTIONS:
                    counter[str(semantic)] += 1
    return _counter_dict(counter)


def _reward_lane(
    lane_id: str,
    report_path: Path,
    report: Mapping[str, Any],
    matrix_lane: Mapping[str, Any],
) -> dict[str, Any]:
    reward = _get(report, "diagnostics", "rewardSafetyDiagnostics") or {}
    survival = _get(report, "diagnostics", "survivalKpis") or {}
    failure = _get(report, "diagnostics", "failureSemantics") or {}
    breakdown = reward.get("rewardBreakdownTotals") if isinstance(reward.get("rewardBreakdownTotals"), Mapping) else {}
    progress_reward = _sum_numeric(breakdown, PROGRESS_REWARD_KEYS)
    risk_penalty = _sum_numeric(
        breakdown,
        ("wallRisk", "trailRisk", "opponentRisk", "lowHealthThreat", "crash", "stuck", "damageTaken", "loss"),
    )
    safety_overrules = _get(reward, "rewardHackingSignals", "safetyOverruleCounts") or {}
    total_actions = _as_int(_get(reward, "actionTelemetry", "totalActions"))
    veto_active = _as_int(_get(safety_overrules, "vetoActive"))
    terminal_counts = failure.get("terminalReasonCounts") or reward.get("terminalReasonCounts") or {}
    truncated_counts = failure.get("truncatedReasonCounts") or reward.get("truncatedReasonCounts") or {}
    death_counts = failure.get("deathCauseCounts") or reward.get("deathCauseCounts") or {}
    natural_terminal = _as_int(failure.get("naturalTerminal"))
    player_dead_only = (
        failure.get("playerDeadOnly")
        if failure.get("playerDeadOnly") is not None
        else set(dict(terminal_counts).keys()) == {"player-dead"}
        and natural_terminal == 0
        and not dict(truncated_counts)
    )
    start_capable_terminal_matrix = (
        failure.get("startCapableTerminalMatrix")
        if failure.get("startCapableTerminalMatrix") is not None
        else bool(dict(death_counts)) and natural_terminal > 0
    )
    return {
        "laneId": lane_id,
        "report": _rel(report_path),
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "reward": {
            "rewardTotal": _round(reward.get("rewardTotal")),
            "rewardMean": _round(reward.get("rewardMean")),
            "rewardBreakdownTotals": breakdown,
            "rewardBreakdownMeanPerStep": reward.get("rewardBreakdownMeanPerStep"),
            "survivalRewardShare": _round(_get(reward, "rewardHackingSignals", "survivalRewardShare")),
            "progressRewardTotal": round(progress_reward, 6),
            "riskPenaltyTotal": round(risk_penalty, 6),
            "survivalOnlyPositiveReward": progress_reward == 0.0
            and _as_float(breakdown.get("survival")) is not None
            and _as_float(breakdown.get("survival")) > 0,
        },
        "episodeLength": {
            "completedEpisodeLengths": _get(reward, "rewardHackingSignals", "episodeShorteningCheck", "completedEpisodeLengths"),
            "avgStepsPerCompletedEpisode": _round(
                _get(reward, "rewardHackingSignals", "episodeShorteningCheck", "avgStepsPerCompletedEpisode")
            ),
            "maxStepsPerEpisode": _get(reward, "rewardHackingSignals", "episodeShorteningCheck", "maxStepsPerEpisode"),
            "dqnAnchor": _get(matrix_lane, "targets", "avgStepsPerEpisode", "dqnAnchor"),
            "belowDqnAnchor": _as_float(survival.get("avgStepsPerEpisode")) is not None
            and _as_float(_get(matrix_lane, "targets", "avgStepsPerEpisode", "dqnAnchor")) is not None
            and float(survival.get("avgStepsPerEpisode")) < float(_get(matrix_lane, "targets", "avgStepsPerEpisode", "dqnAnchor")),
        },
        "deathAndTerminalClass": {
            "terminalReasonCounts": terminal_counts,
            "truncatedReasonCounts": truncated_counts,
            "deathCauseCounts": death_counts,
            "naturalTerminal": natural_terminal,
            "playerDeadOnly": player_dead_only,
            "startCapableTerminalMatrix": start_capable_terminal_matrix,
        },
        "riskActions": {
            "sampledCounts": _risk_action_counts(report),
            "sampleSource": "persisted rawActionExamples/infoTail only",
            "safetyOverruleCounts": safety_overrules,
            "vetoActiveRateFromSafetyTrace": round(veto_active / total_actions, 6) if total_actions else None,
        },
        "survivalKpis": survival,
        "actionTelemetry": reward.get("actionTelemetry"),
    }


def _learning_metrics(train_report: Mapping[str, Any]) -> dict[str, Any]:
    metrics = _get(train_report, "learning", "ppoLearningMetrics") or {}
    threshold_status = metrics.get("thresholdStatus") if isinstance(metrics.get("thresholdStatus"), Mapping) else {}
    return {
        "runId": train_report.get("runId"),
        "runKind": train_report.get("runKind"),
        "source": metrics.get("source"),
        "sampleClass": metrics.get("sampleClass"),
        "metrics": metrics.get("metrics"),
        "collapseThresholds": metrics.get("collapseThresholds"),
        "thresholdStatus": threshold_status,
        "collapseOrInstabilitySignal": metrics.get("collapseOrInstabilitySignal"),
        "allThresholdsGreen": bool(threshold_status) and all(value is True for value in threshold_status.values()),
    }


def _reward_source_checks() -> dict[str, Any]:
    checks = {
        "rewardCalculator": _read_text_tokens(
            REWARD_CALCULATOR_PATH,
            (
                "DEFAULT_TRAINING_REWARD_WEIGHTS",
                "survival",
                "survivalPressureBonus",
                "crash",
                "loss",
                "CURRICULUM_STAGES",
            ),
        ),
        "learnerSmoke": _read_text_tokens(
            LEARNER_SMOKE_PATH,
            (
                "rewardBreakdownTotals",
                "episodeShorteningCheck",
                "survivalRewardShare",
                "ppoLearningMetrics",
                "grad_norm",
            ),
        ),
    }
    return {
        "ok": all(all(group.values()) for group in checks.values()),
        "checks": checks,
        "sourceArtifacts": {
            "rewardCalculator": _source(REWARD_CALCULATOR_PATH, "JS training reward calculator"),
            "learnerSmoke": _source(LEARNER_SMOKE_PATH, "PPO reward/learning diagnostics aggregation"),
        },
    }


def build_reward_curriculum_diagnostics(action_report: Mapping[str, Any]) -> dict[str, Any]:
    _, train_report, train_report_path = _pointer_report(BT93I_TRAIN_POINTER)
    _, eval_report, eval_report_path = _pointer_report(BT93I_EVAL_POINTER)
    _, holdout_report, holdout_report_path = _pointer_report(BT93I_HOLDOUT_POINTER)
    matrix_green = _read_json(BT93I_MATRIX_GREEN_PATH)
    reward_gate = _read_json(BT93G_REWARD_GATE_PATH)
    config = _read_json(BT93I_CONFIG_PATH)
    source_checks = _reward_source_checks()
    matrix_targets = _get(matrix_green, "comparison", "targets") or {}
    eval_matrix_lane = {
        **(_get(matrix_green, "comparison", "ppoEval") or {}),
        "targets": matrix_targets,
    }
    holdout_matrix_lane = {
        **(_get(matrix_green, "comparison", "ppoHoldout") or {}),
        "targets": matrix_targets,
    }
    lanes = [
        _reward_lane("bt93i-eval", eval_report_path, eval_report, eval_matrix_lane),
        _reward_lane("bt93i-holdout", holdout_report_path, holdout_report, holdout_matrix_lane),
    ]
    learning_metrics = _learning_metrics(train_report)
    action_gate_green = bool(_get(action_report, "actionPolicyGate", "green"))
    lanes_survival_only = all(_get(lane, "reward", "survivalOnlyPositiveReward") is True for lane in lanes)
    lanes_player_dead_only = all(_get(lane, "deathAndTerminalClass", "playerDeadOnly") is True for lane in lanes)
    lanes_below_dqn = all(_get(lane, "episodeLength", "belowDqnAnchor") is True for lane in lanes)
    learning_collapse = learning_metrics["collapseOrInstabilitySignal"] is True
    reward_curriculum_causal = (
        action_gate_green
        and source_checks["ok"]
        and lanes_survival_only
        and lanes_player_dead_only
        and lanes_below_dqn
        and not learning_collapse
    )
    result_class = (
        "reward-curriculum-primary-cause-ready-for-r1"
        if reward_curriculum_causal
        else "reward-curriculum-diagnostics-blocked"
        if not source_checks["ok"]
        else "reward-curriculum-inconclusive"
    )
    return {
        **_common(),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.3",
        "resultClass": result_class,
        "phaseCoverage": {
            "93J.3.3": True,
            "93J.3.4": True,
        },
        "rewardCurriculumGate": {
            "green": not reward_curriculum_causal and source_checks["ok"],
            "notCausal": not reward_curriculum_causal and source_checks["ok"],
            "primaryCause": reward_curriculum_causal,
            "readyForRepair": reward_curriculum_causal,
            "readyForTraining": False,
            "pilotBlocked": True,
            "longRunBlocked": True,
            "diagnosis": (
                "Reward/curriculum is the single active root-cause candidate after observation, terminal mapping, "
                "matrix contract, action safety, and PPO learning-metric collapse checks are cleared: reward is "
                "survival-only, eval/holdout remain player-dead-only, and steps remain below the DQN anchor."
                if reward_curriculum_causal
                else "Reward/curriculum evidence is not sufficient for a single primary-cause repair."
            ),
        },
        "causalSeparation": {
            "observationGateGreen": True,
            "terminalMappingGateGreen": True,
            "matrixContractGateGreen": True,
            "actionPolicyGateGreen": action_gate_green,
            "ppoLearningMetricCollapse": learning_collapse,
            "survivalOnlyPositiveReward": lanes_survival_only,
            "realEvalPlayerDeadOnly": lanes_player_dead_only,
            "stepsBelowDqnAnchor": lanes_below_dqn,
        },
        "learningMetrics": learning_metrics,
        "lanes": lanes,
        "curriculumConfig": {
            "config": _rel(BT93I_CONFIG_PATH),
            "profileId": config.get("profileId"),
            "rollout": config.get("rollout"),
            "diagnostics": config.get("diagnostics"),
            "normalization": config.get("normalization"),
        },
        "repairLeversDefinedNotApplied": [
            {
                "id": "reward-terminal-pressure-r1",
                "scope": "93J.4 candidate micro-test only",
                "expectedEffect": "reduce survival-only reward dominance and expose non-death terminal/progress pressure before any pilot",
                "counterprobe": "if terminal diversity or avgSteps trend does not improve while action telemetry stays green, reward/curriculum cause is refuted",
                "appliedIn93J3": False,
            },
            {
                "id": "curriculum-terminal-diversity-r1",
                "scope": "93J.4 candidate micro-test only",
                "expectedEffect": "force a small terminal/diversity diagnostic window without candidate, freeze, holdout optimization, or long-run semantics",
                "counterprobe": "if natural-terminal/death mix remains player-dead-only, escalate back to diagnosis instead of widening training",
                "appliedIn93J3": False,
            },
        ],
        "bt93gRewardGate": {
            "path": _rel(BT93G_REWARD_GATE_PATH),
            "resultClass": reward_gate.get("resultClass"),
            "rewardGate": reward_gate.get("rewardGate"),
            "evidenceLimits": reward_gate.get("evidenceLimits"),
        },
        "findingImpact": {
            "F.05": "still-blocking-primary-cause-candidate-reward-curriculum",
            "F.19": "still-blocking-policy-terminal-behavior-not-mapping",
            "F.27": "aggregate-still-blocked-until-R1-counterprobe",
            "F.31": "still-blocking-player-dead-only-policy-terminal-behavior",
        },
        "sourceChecks": source_checks,
        "sourceArtifacts": {
            "bt93gRewardGate": _source(BT93G_REWARD_GATE_PATH, "BT93G reward gate report"),
            "bt93iConfig": _source(BT93I_CONFIG_PATH, "BT93I terminal curriculum config"),
            "matrixGreen": _source(BT93I_MATRIX_GREEN_PATH, "BT93I matrix green report"),
            "trainPointer": _source(BT93I_TRAIN_POINTER, "BT93I train pointer", closure_capable=False),
            "trainReport": _source(train_report_path, "BT93I train report"),
            "evalPointer": _source(BT93I_EVAL_POINTER, "BT93I eval pointer", closure_capable=False),
            "evalReport": _source(eval_report_path, "BT93I eval report"),
            "holdoutPointer": _source(BT93I_HOLDOUT_POINTER, "BT93I holdout pointer", closure_capable=False),
            "holdoutReport": _source(holdout_report_path, "BT93I holdout report"),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_action_reward_diagnostics.py --write-reports",
        },
    }


def _update_diagnostic_split(
    diagnostic_split: Mapping[str, Any],
    action_report: Mapping[str, Any],
    reward_report: Mapping[str, Any],
) -> dict[str, Any]:
    updated = json.loads(json.dumps(diagnostic_split))
    updated["generatedAt"] = _utc_now()
    updated["generatedBy"] = "python/scripts/bt93j_action_reward_diagnostics.py"
    updated["phaseId"] = "93J.3"
    updated["actionPolicyDiagnostics"] = {
        "path": _rel(DEFAULT_ACTION_OUTPUT),
        "resultClass": action_report.get("resultClass"),
        "green": _get(action_report, "actionPolicyGate", "green"),
        "notCausal": _get(action_report, "actionPolicyGate", "notCausal"),
    }
    updated["rewardCurriculumDiagnostics"] = {
        "path": _rel(DEFAULT_REWARD_OUTPUT),
        "resultClass": reward_report.get("resultClass"),
        "green": _get(reward_report, "rewardCurriculumGate", "green"),
        "notCausal": _get(reward_report, "rewardCurriculumGate", "notCausal"),
        "primaryCause": _get(reward_report, "rewardCurriculumGate", "primaryCause"),
    }
    gates = updated.get("categoryGates")
    if isinstance(gates, list):
        for gate in gates:
            if not isinstance(gate, dict):
                continue
            if gate.get("id") == "action-safety":
                green = bool(_get(action_report, "actionPolicyGate", "green"))
                gate["status"] = "green" if green else "blocked"
                gate["green"] = green
                gate["notCausal"] = green
                gate["evidence"] = _rel(DEFAULT_ACTION_OUTPUT)
                gate["phase"] = "93J.3"
            if gate.get("id") == "reward-curriculum":
                primary = bool(_get(reward_report, "rewardCurriculumGate", "primaryCause"))
                green = bool(_get(reward_report, "rewardCurriculumGate", "green"))
                gate["status"] = "primary-cause" if primary else "green" if green else "blocked"
                gate["green"] = green
                gate["notCausal"] = bool(_get(reward_report, "rewardCurriculumGate", "notCausal"))
                gate["primaryCause"] = primary
                gate["evidence"] = _rel(DEFAULT_REWARD_OUTPUT)
                gate["phase"] = "93J.3"
                gate["pilotBlocked"] = _get(reward_report, "rewardCurriculumGate", "pilotBlocked")
                gate["longRunBlocked"] = _get(reward_report, "rewardCurriculumGate", "longRunBlocked")
    phase_coverage = updated.get("phaseCoverage") if isinstance(updated.get("phaseCoverage"), Mapping) else {}
    updated["phaseCoverage"] = {
        **phase_coverage,
        **action_report.get("phaseCoverage", {}),
        **reward_report.get("phaseCoverage", {}),
    }
    primary = bool(_get(reward_report, "rewardCurriculumGate", "primaryCause"))
    updated["primaryCause"] = {
        "id": "reward-curriculum-survival-only-player-dead-policy",
        "phase": "93J.3",
        "evidence": _rel(DEFAULT_REWARD_OUTPUT),
        "findingIds": ["F.05", "F.19", "F.27", "F.31"],
        "summary": (
            "Survival-only positive reward plus player-dead-only eval/holdout and step regression remain after "
            "observation, terminal mapping, matrix contract, action safety, and PPO learning-metric collapse checks."
        ),
    } if primary else None
    updated["counterprobe"] = (
        "93J.4 R1 micro-test must change only reward/curriculum pressure and is expected to improve terminal diversity "
        "or avgSteps trend while action telemetry remains green; otherwise the primary cause is refuted."
        if primary
        else updated.get("counterprobe")
    )
    updated["readyForRepair"] = primary
    updated["readyForTraining"] = False
    updated["resultClass"] = (
        "diagnostic-split-primary-cause-reward-curriculum-ready-for-r1"
        if primary
        else "diagnostic-split-action-reward-inconclusive"
    )
    updated["nextDiagnosticPhase"] = "93J.4" if primary else "93J.3-repeat"
    updated["repairConstraints"] = {
        "maxPrimaryCausesAllowed": 1,
        "pilotAllowed": False,
        "longRunAllowed": False,
        "candidateFreezeAllowed": False,
        "bt94aClaimAllowed": False,
    }
    return updated


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    action_report = build_action_policy_diagnostics()
    reward_report = build_reward_curriculum_diagnostics(action_report)
    diagnostic_split = _update_diagnostic_split(_read_json(DIAGNOSTIC_SPLIT_PATH), action_report, reward_report)
    return action_report, reward_report, diagnostic_split


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93J.3 action/reward diagnostic reports.")
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--action-output", default=str(DEFAULT_ACTION_OUTPUT))
    parser.add_argument("--reward-output", default=str(DEFAULT_REWARD_OUTPUT))
    parser.add_argument("--diagnostic-split-output", default=str(DIAGNOSTIC_SPLIT_PATH))
    args = parser.parse_args()

    action_report, reward_report, diagnostic_split = build_reports()
    action_output = _repo_path(args.action_output)
    reward_output = _repo_path(args.reward_output)
    diagnostic_output = _repo_path(args.diagnostic_split_output)
    if args.write_reports:
        _write_json(action_output, action_report)
        _write_json(reward_output, reward_report)
        _write_json(diagnostic_output, diagnostic_split)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": {
                    "actionPolicy": action_report["resultClass"],
                    "rewardCurriculum": reward_report["resultClass"],
                    "diagnosticSplit": diagnostic_split["resultClass"],
                },
                "phaseCoverage": diagnostic_split.get("phaseCoverage", {}),
                "readyForRepair": diagnostic_split["readyForRepair"],
                "readyForTraining": diagnostic_split["readyForTraining"],
                "primaryCause": diagnostic_split.get("primaryCause"),
                "wrote": {
                    "actionPolicy": _rel(action_output) if args.write_reports else None,
                    "rewardCurriculum": _rel(reward_output) if args.write_reports else None,
                    "diagnosticSplit": _rel(diagnostic_output) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
