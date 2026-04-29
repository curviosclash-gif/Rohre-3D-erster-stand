"""BT93Q.1 finding register and hypothesis lock.

This script is report-only. It reads BT93L/BT93M/BT93N/BT94A evidence,
writes BT93Q.1 governance artifacts, and does not start PPO training, create
candidates, consume holdout data, or touch productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import ast
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"
FINDING_REGISTER_PATH = BT93Q_ROOT / "finding_register.json"
HYPOTHESIS_LOCK_PATH = BT93Q_ROOT / "hypothesis_lock.json"

SOURCE_PATHS = {
    "bt93lMicroPpoSignal": PPO_ROOT / "bt93l" / "micro_ppo_signal_report.json",
    "bt93lBaselineMatrix": PPO_ROOT / "bt93l" / "baseline_matrix_report.json",
    "bt93mComparisonPolicyDecision": PPO_ROOT / "bt93m" / "comparison_policy_decision.json",
    "bt93nRewardTerminalDelta": PPO_ROOT / "bt93n" / "reward_terminal_delta_report.json",
    "bt93nDeathTrace": PPO_ROOT / "bt93n" / "death_before60_trace_report.json",
    "bt93nDeathTraceSamples": PPO_ROOT / "bt93n" / "death_before60_trace_samples.jsonl",
    "bt93nMicroPpoRepeat": PPO_ROOT / "bt93n" / "micro_ppo_repeat_report.json",
    "bt93nStabilityLadder": PPO_ROOT / "bt93n" / "stability_ladder_report.json",
    "bt93nClosureGate": PPO_ROOT / "bt93n" / "closure_gate_report.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
    "ppoActionSurface": REPO_ROOT / "python" / "envs" / "ppo_action_surface.py",
    "bt93qIntake": REPO_ROOT
    / "docs"
    / "plaene"
    / "neu"
    / "BT93Q_DeathBefore60_WallTrail_Policy_Repair_Intake_2026-04-30.md",
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
    "PPO-Validate or BT95 handoff signal",
    "50k/100k/200k extension",
]

NEXT_ALLOWED_ACTIONS = [
    "BT93Q.2 trace reanalysis and telemetry-completeness diagnosis",
    "BT93Q.3 deterministic-policy-collapse diagnosis",
    "BT93Q.4 wall/trail action-effect stress matrix",
    "BT93Q.5 exactly one fix class only after cause evidence",
    "BT93Q.6 maximum 10k micro-PPO recheck only after 93Q.4/93Q.5 gate evidence",
]


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


def _read_jsonl(path: Path, *, limit: int | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if limit is not None and len(rows) >= limit:
                    break
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(payload, dict):
                    rows.append(payload)
    except OSError:
        return []
    return rows


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


def _git_lines(args: list[str]) -> list[str]:
    output = _git_output(args)
    return [line.strip().replace("\\", "/") for line in output.splitlines() if line.strip()]


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _source(path: Path, role: str, tracked_files: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked_files,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _source_artifacts() -> dict[str, Any]:
    tracked = _tracked_files(SOURCE_PATHS.values())
    roles = {
        "bt93lMicroPpoSignal": "BT93L prior micro-PPO signal context",
        "bt93lBaselineMatrix": "BT93L simple-baseline and reward-ordering context",
        "bt93mComparisonPolicyDecision": "BT93M DQN-anchor/replacement-policy blocker",
        "bt93nRewardTerminalDelta": "BT93N reward/terminal delta after single reward fix",
        "bt93nDeathTrace": "BT93N death-before-60 trace source",
        "bt93nDeathTraceSamples": "BT93N raw JSONL trace samples",
        "bt93nMicroPpoRepeat": "BT93N 10k micro-PPO repeat source",
        "bt93nStabilityLadder": "BT93N 50k/100k no-run ladder gate",
        "bt93nClosureGate": "BT93N red closure gate",
        "bt94aNoStartGate": "BT94A closed no-start gate",
        "ppoActionSurface": "current sidecar PPO action surface",
        "bt93qIntake": "BT93Q user-owned intake source",
    }
    return {key: _source(path, roles[key], tracked) for key, path in SOURCE_PATHS.items()}


def _semantic_actions(path: Path) -> list[str]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (OSError, SyntaxError):
        return []
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(target, ast.Name) and target.id == "MASKED_SEMANTIC_ACTIONS" for target in node.targets):
            continue
        try:
            actions = ast.literal_eval(node.value)
        except (ValueError, SyntaxError):
            return []
        return [str(item[0]) for item in actions if isinstance(item, tuple) and item]
    return []


def _trace_sample_summary(samples: list[Mapping[str, Any]]) -> dict[str, Any]:
    early_death_samples = [sample for sample in samples if sample.get("earlyDeathBefore60") is True]
    final_rows: list[Mapping[str, Any]] = []
    all_tail_rows: list[Mapping[str, Any]] = []
    sample_kinds: Counter[str] = Counter()
    semantic_tail_actions: Counter[str] = Counter()
    for sample in samples:
        sample_kinds[str(sample.get("sampleKind") or "unknown")] += 1
        rows = [row for row in sample.get("traceTail") or [] if isinstance(row, Mapping)]
        all_tail_rows.extend(rows)
        if sample.get("earlyDeathBefore60") is True:
            final_rows.extend(rows[-3:])
        for row in rows:
            if row.get("semanticAction"):
                semantic_tail_actions[str(row.get("semanticAction"))] += 1

    def metrics(row: Mapping[str, Any]) -> Mapping[str, Any]:
        item = row.get("observationMetrics")
        return item if isinstance(item, Mapping) else {}

    def safety(row: Mapping[str, Any]) -> Mapping[str, Any]:
        action_safety = row.get("actionSafety")
        if not isinstance(action_safety, Mapping):
            return {}
        hybrid = action_safety.get("hybridSafety")
        return hybrid if isinstance(hybrid, Mapping) else {}

    def action_safety(row: Mapping[str, Any]) -> Mapping[str, Any]:
        item = row.get("actionSafety")
        return item if isinstance(item, Mapping) else {}

    wall_close_rows = [
        row for row in final_rows if _number(metrics(row).get("wallDistanceFront"), 1.0) <= 0.05
    ]
    raw_pose_flags = [
        _get(row, "positionHeadingDelta", "rawPoseAvailable")
        for row in all_tail_rows
        if isinstance(row.get("positionHeadingDelta"), Mapping)
    ]
    collision_values = [_number(safety(row).get("collisionRisk")) for row in final_rows]
    dead_end_values = [_number(safety(row).get("deadEndRisk")) for row in final_rows]
    veto_active_rows = [row for row in all_tail_rows if safety(row).get("vetoActive") is True]
    veto_event_rows = [
        row for row in all_tail_rows if action_safety(row).get("vetoEvents") not in (None, [])
    ]
    veto_rates = [_number(action_safety(row).get("vetoRate")) for row in all_tail_rows]
    return {
        "sampleCount": len(samples),
        "sampleKindCounts": dict(sorted(sample_kinds.items())),
        "earlyDeathSampleCount": len(early_death_samples),
        "earlyDeathFinalRows": len(final_rows),
        "earlyDeathFinalRowsWallDistanceFrontLte005": len(wall_close_rows),
        "maxCollisionRiskFinalRows": round(max(collision_values, default=0.0), 6),
        "maxDeadEndRiskFinalRows": round(max(dead_end_values, default=0.0), 6),
        "deadEndRiskOneFinalRows": sum(1 for value in dead_end_values if value >= 1.0),
        "rawPoseAvailableValues": sorted({str(value) for value in raw_pose_flags}),
        "rawPoseAvailableAllFalse": bool(raw_pose_flags) and all(value is False for value in raw_pose_flags),
        "vetoActiveTailRows": len(veto_active_rows),
        "vetoEventTailRows": len(veto_event_rows),
        "maxVetoRateTailRows": round(max(veto_rates, default=0.0), 6),
        "semanticActionTailCounts": dict(sorted(semantic_tail_actions.items())),
    }


def _eval_seed_summaries(micro_repeat: Mapping[str, Any], action_names: list[str]) -> list[dict[str, Any]]:
    summaries = _get(micro_repeat, "evalSummary", "seedSummaries")
    if not isinstance(summaries, list):
        return []
    result: list[dict[str, Any]] = []
    for summary in summaries:
        if not isinstance(summary, Mapping):
            continue
        action_counts = summary.get("actionCounts") if isinstance(summary.get("actionCounts"), Mapping) else {}
        dominant_token = None
        if action_counts:
            dominant_token = max(action_counts.items(), key=lambda item: int(item[1]))[0]
        dominant_action = None
        if dominant_token is not None:
            try:
                dominant_action = action_names[int(dominant_token)]
            except (ValueError, IndexError):
                dominant_action = None
        result.append(
            {
                "label": summary.get("label"),
                "actionCounts": dict(action_counts),
                "dominantToken": dominant_token,
                "dominantAction": dominant_action,
                "completedEpisodes": summary.get("completedEpisodes"),
                "deathBefore60Count": summary.get("deathBefore60Count"),
                "avgStepsPerEpisode": summary.get("avgStepsPerEpisode"),
            }
        )
    return result


def _finding(
    *,
    finding_id: str,
    title: str,
    source_path: Path,
    field: str,
    observed_value: Mapping[str, Any],
    block_effect: str,
    allowed_fix_classes: list[str],
    forbidden_actions: list[str] | None = None,
    supporting_source_paths: list[Path] | None = None,
) -> dict[str, Any]:
    return {
        "id": finding_id,
        "title": title,
        "sourcePath": _rel(source_path),
        "supportingSourcePaths": [_rel(path) for path in supporting_source_paths or []],
        "field": field,
        "observedValue": dict(observed_value),
        "blockEffect": block_effect,
        "allowedFixClasses": list(allowed_fix_classes),
        "forbiddenActions": list(forbidden_actions or BLOCKED_ACTIONS),
        "nextAllowedActions": list(NEXT_ALLOWED_ACTIONS),
    }


def _build_findings(payloads: Mapping[str, Mapping[str, Any]], samples: list[Mapping[str, Any]]) -> list[dict[str, Any]]:
    reward_delta = payloads["bt93nRewardTerminalDelta"]
    death_trace = payloads["bt93nDeathTrace"]
    micro_repeat = payloads["bt93nMicroPpoRepeat"]
    closure_gate = payloads["bt93nClosureGate"]
    comparison_policy = payloads["bt93mComparisonPolicyDecision"]
    no_start = payloads["bt94aNoStartGate"]
    bt93l_micro = payloads["bt93lMicroPpoSignal"]
    bt93l_baseline = payloads["bt93lBaselineMatrix"]
    action_names = _semantic_actions(SOURCE_PATHS["ppoActionSurface"])
    trace_summary = _trace_sample_summary(samples)
    eval_summaries = _eval_seed_summaries(micro_repeat, action_names)
    train_summary = _get(micro_repeat, "trainSummary") or {}
    eval_summary = _get(micro_repeat, "evalSummary") or {}
    reward_delta_summary = reward_delta.get("aggregateDelta") if isinstance(reward_delta.get("aggregateDelta"), Mapping) else {}
    baseline_summary = bt93l_baseline.get("summary") if isinstance(bt93l_baseline.get("summary"), Mapping) else {}

    return [
        _finding(
            finding_id="B.01",
            title="Reward-Fix was effective but insufficient",
            source_path=SOURCE_PATHS["bt93nRewardTerminalDelta"],
            field="aggregateDelta",
            observed_value={
                "resultClass": reward_delta.get("resultClass"),
                "deathBefore60Count": reward_delta_summary.get("deathBefore60Count"),
                "deathBefore60Share": reward_delta_summary.get("deathBefore60Share"),
                "avgStepsPerEpisode": reward_delta_summary.get("avgStepsPerEpisode"),
                "progressSignalReachableTailCount": reward_delta_summary.get("progressSignalReachableTailCount"),
                "objectiveSignalReachableTailCount": reward_delta_summary.get("objectiveSignalReachableTailCount"),
                "maxStepPlateauCount": reward_delta_summary.get("maxStepPlateauCount"),
                "runtimeErrorCount": reward_delta_summary.get("runtimeErrorCount"),
            },
            block_effect="Reward-only repair improved early-death reward but does not open BT93O or longer PPO runs.",
            allowed_fix_classes=["Reward"],
            forbidden_actions=["second reward fix without 93Q.2/93Q.4 danger-ordering proof", *BLOCKED_ACTIONS],
        ),
        _finding(
            finding_id="B.02",
            title="10k PPO remains red",
            source_path=SOURCE_PATHS["bt93nMicroPpoRepeat"],
            field="trainSummary/evalSummary/decision",
            observed_value={
                "resultClass": micro_repeat.get("resultClass"),
                "actualModelTimesteps": micro_repeat.get("actualModelTimesteps"),
                "train": {
                    "completedEpisodes": train_summary.get("completedEpisodes"),
                    "deathBefore60Count": train_summary.get("deathBefore60Count"),
                    "avgStepsPerEpisode": train_summary.get("avgStepsPerEpisode"),
                    "playerDeadShare": train_summary.get("playerDeadShare"),
                    "runtimeErrorCount": train_summary.get("runtimeErrorCount"),
                    "safetyMaxRates": train_summary.get("safetyMaxRates"),
                    "progressSignalReachableCount": train_summary.get("progressSignalReachableCount"),
                    "objectiveSignalReachableCount": train_summary.get("objectiveSignalReachableCount"),
                },
                "eval": {
                    "completedEpisodes": eval_summary.get("completedEpisodes"),
                    "deathBefore60Count": eval_summary.get("deathBefore60Count"),
                    "playerDeadShare": eval_summary.get("playerDeadShare"),
                    "maxStepShare": eval_summary.get("maxStepShare"),
                    "runtimeErrorCount": eval_summary.get("runtimeErrorCount"),
                    "safetyMaxRates": eval_summary.get("safetyMaxRates"),
                    "progressSignalReachableCount": eval_summary.get("progressSignalReachableCount"),
                    "objectiveSignalReachableCount": eval_summary.get("objectiveSignalReachableCount"),
                },
                "decision": micro_repeat.get("decision"),
                "bt93lPrior": {
                    "resultClass": bt93l_micro.get("resultClass"),
                    "trainDeathBefore60Count": _get(bt93l_micro, "trainSummary", "deathBefore60Count"),
                    "evalDeathBefore60Count": _get(bt93l_micro, "evalSummary", "deathBefore60Count"),
                },
            },
            block_effect="DeathBefore60 remains blocking; 50k/100k and BT93O stay closed.",
            allowed_fix_classes=["Policy", "Action", "Observation/Telemetry", "Reward", "Safety-Mask", "Terminal/Runner"],
        ),
        _finding(
            finding_id="B.03",
            title="Deterministic eval policy collapses to one action",
            source_path=SOURCE_PATHS["bt93nMicroPpoRepeat"],
            field="evalSummary.seedSummaries[].actionCounts",
            observed_value={
                "semanticActions": action_names,
                "evalSeedSummaries": eval_summaries,
                "allEvalSeedsSingleAction": bool(eval_summaries)
                and all(len(summary["actionCounts"]) == 1 for summary in eval_summaries),
                "dominantActions": sorted({str(summary.get("dominantAction")) for summary in eval_summaries}),
            },
            block_effect="Policy-collapsed deterministic eval blocks any 10k recheck until separated from action/observation/reward causes.",
            allowed_fix_classes=["Policy", "Training-Signal"],
            forbidden_actions=["BT93Q.6 recheck before policy-collapse report", *BLOCKED_ACTIONS],
        ),
        _finding(
            finding_id="B.04",
            title="Wall/trail danger is visible but not controlled",
            source_path=SOURCE_PATHS["bt93nDeathTrace"],
            supporting_source_paths=[SOURCE_PATHS["bt93nDeathTraceSamples"]],
            field="aggregate.deathClassCounts + traceTail wall/trail proximity",
            observed_value={
                "resultClass": death_trace.get("resultClass"),
                "aggregate": death_trace.get("aggregate"),
                "measurementInterpretation": death_trace.get("measurementInterpretation"),
                "traceSampleSummary": trace_summary,
            },
            block_effect="Wall/trail root cause is plausible but geometry/action-effect proof is incomplete; BT93Q.2/93Q.4 are mandatory.",
            allowed_fix_classes=["Action", "Observation/Telemetry", "Safety-Mask", "Reward"],
            forbidden_actions=["action or reward fix before trace reanalysis and action-effect stress matrix", *BLOCKED_ACTIONS],
        ),
        _finding(
            finding_id="B.05",
            title="Diagnostic safety sees risk but does not act",
            source_path=SOURCE_PATHS["bt93nDeathTraceSamples"],
            field="traceTail.actionSafety.hybridSafety/vetoEvents/vetoRate",
            observed_value={
                "vetoActiveTailRows": trace_summary["vetoActiveTailRows"],
                "vetoEventTailRows": trace_summary["vetoEventTailRows"],
                "maxVetoRateTailRows": trace_summary["maxVetoRateTailRows"],
                "maxCollisionRiskFinalRows": trace_summary["maxCollisionRiskFinalRows"],
                "maxDeadEndRiskFinalRows": trace_summary["maxDeadEndRiskFinalRows"],
                "trainSafetyMaxRates": train_summary.get("safetyMaxRates"),
                "evalSafetyMaxRates": eval_summary.get("safetyMaxRates"),
            },
            block_effect="Safety diagnostics may be informative only; a handlungswirksame mask/policy needs proof before any fix.",
            allowed_fix_classes=["Safety-Mask"],
            forbidden_actions=["productive runtime safety switch", "safety-mask fix before 93Q.2/93Q.4 proof", *BLOCKED_ACTIONS],
        ),
        _finding(
            finding_id="B.06",
            title="Current action surface has only atomic single-step actions",
            source_path=SOURCE_PATHS["ppoActionSurface"],
            field="MASKED_SEMANTIC_ACTIONS",
            observed_value={
                "semanticActions": action_names,
                "compoundEscapeActionsPresent": any(
                    action in set(action_names)
                    for action in ("turn-left-boost", "turn-right-boost", "brake", "evade-left", "evade-right", "danger-turn-away")
                ),
                "actionCount": len(action_names),
            },
            block_effect="Compound sidecar actions remain forbidden until existing actions fail the wall/trail stress matrix.",
            allowed_fix_classes=["Action"],
            forbidden_actions=["speculative action-surface expansion before 93Q.4", *BLOCKED_ACTIONS],
        ),
        _finding(
            finding_id="B.07",
            title="Reward ordering remains suspicious under danger pressure",
            source_path=SOURCE_PATHS["bt93nMicroPpoRepeat"],
            supporting_source_paths=[SOURCE_PATHS["bt93lBaselineMatrix"]],
            field="trainSummary/evalSummary.rewardBreakdownTotals",
            observed_value={
                "trainRewardBreakdownTotals": train_summary.get("rewardBreakdownTotals"),
                "evalRewardBreakdownTotals": eval_summary.get("rewardBreakdownTotals"),
                "bt93lSimpleBaselineContext": {
                    "resultClass": bt93l_baseline.get("resultClass"),
                    "sameMatrixDqnAnchorPresent": baseline_summary.get("sameMatrixDqnAnchorPresent"),
                    "summary": baseline_summary,
                },
            },
            block_effect="Danger-aware reward ordering must be tested; reward totals alone do not justify a reward fix or quality claim.",
            allowed_fix_classes=["Reward"],
            forbidden_actions=["reward redesign before pressure-ordering proof", *BLOCKED_ACTIONS],
        ),
        _finding(
            finding_id="B.08",
            title="DQN anchor remains a separate hard blocker",
            source_path=SOURCE_PATHS["bt93mComparisonPolicyDecision"],
            field="comparisonPolicyDecision/sameMatrixDqnAnchorPresent/nonBlockingForPositiveReentry",
            observed_value={
                "comparisonPolicyDecision": comparison_policy.get("comparisonPolicyDecision"),
                "sameMatrixDqnAnchorPresent": comparison_policy.get("sameMatrixDqnAnchorPresent"),
                "nonBlockingForPositiveReentry": comparison_policy.get("nonBlockingForPositiveReentry"),
                "bt93pPolicy": comparison_policy.get("bt93pPolicy"),
            },
            block_effect="BT93Q may repair wall/trail behavior but cannot create BT93P/BT94A positive reentry.",
            allowed_fix_classes=["Separate-DQN-Loader", "User-Replacement-Policy-Decision"],
            forbidden_actions=["phantom DQN anchor", *BLOCKED_ACTIONS],
        ),
        _finding(
            finding_id="B.09",
            title="BT94A remains hard closed",
            source_path=SOURCE_PATHS["bt94aNoStartGate"],
            field="claimable/candidateRunsAllowed/matrixDefinitionAllowed",
            observed_value={
                "resultClass": no_start.get("resultClass"),
                "claimable": no_start.get("claimable"),
                "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
                "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
                "candidateFreezeAllowed": no_start.get("candidateFreezeAllowed"),
                "currentHandoverSource": no_start.get("currentHandoverSource"),
                "bt93nClosure": {
                    "resultClass": closure_gate.get("resultClass"),
                    "gateClass": closure_gate.get("gateClass"),
                    "rootCause": closure_gate.get("rootCause"),
                },
            },
            block_effect="No candidate, freeze, holdout, promote, rollout, or BT95 handoff signal is allowed from BT93Q.",
            allowed_fix_classes=["Governance"],
            forbidden_actions=BLOCKED_ACTIONS,
        ),
    ]


def _hypotheses() -> list[dict[str, Any]]:
    return [
        {
            "id": "H1",
            "title": "Deterministic Policy Collapse",
            "sourceFindingIds": ["B.03"],
            "evidenceToday": "Deterministic eval selects yaw-right on all BT93N eval seeds.",
            "validationPhase": "93Q.3",
            "allowedConsequenceIfProven": "Policy/entropy/eval-mode fix or training-signal repair.",
            "notAllowedBeforeProof": ["10k recheck", "BT93O claim", "candidate/freeze wording"],
        },
        {
            "id": "H2",
            "title": "Atomic actions may be insufficient for escape",
            "sourceFindingIds": ["B.04", "B.06"],
            "evidenceToday": "Surface has no compound escape actions; wall/trail pressure remains blocking.",
            "validationPhase": "93Q.4",
            "allowedConsequenceIfProven": "Sidecar-only action extension with measured state improvement.",
            "notAllowedBeforeProof": ["compound action addition", "action-quality claim"],
        },
        {
            "id": "H3",
            "title": "Observation/trace geometry may be too weak",
            "sourceFindingIds": ["B.04"],
            "evidenceToday": "rawPoseAvailable=false in trace rows; current evidence uses runtime-near proxies.",
            "validationPhase": "93Q.2",
            "allowedConsequenceIfProven": "Training-path telemetry/observation extension for raw pose, heading, velocity, trail distance, or escape-lane fields.",
            "notAllowedBeforeProof": ["observation API broadening", "runtime observation change"],
        },
        {
            "id": "H4",
            "title": "Safety diagnostics are not action-effective",
            "sourceFindingIds": ["B.05"],
            "evidenceToday": "vetoActive appears in dangerous tails while vetoEvents and vetoRate remain zero.",
            "validationPhase": "93Q.2/93Q.4",
            "allowedConsequenceIfProven": "Sidecar pre-sampling danger mask or emergency-action test.",
            "notAllowedBeforeProof": ["productive runtime safety switch", "safety fix"],
        },
        {
            "id": "H5",
            "title": "Reward ordering may reward progress in danger",
            "sourceFindingIds": ["B.01", "B.07"],
            "evidenceToday": "Positive checkpoint/progress components remain high despite terminal/wall penalties.",
            "validationPhase": "93Q.4/93Q.5",
            "allowedConsequenceIfProven": "Danger-aware progress/reward gating.",
            "notAllowedBeforeProof": ["reward redesign", "claim that reward pressure is fixed"],
        },
        {
            "id": "H6",
            "title": "Runner/terminal classification may be wrong",
            "sourceFindingIds": ["B.02", "B.04"],
            "evidenceToday": "playerDeadShare=1.0 with runtimeErrorCount=0; no contradiction is proven yet.",
            "validationPhase": "93Q.2",
            "allowedConsequenceIfProven": "Terminal/runner fix only if raw trace contradicts terminal labels.",
            "notAllowedBeforeProof": ["terminal semantics fix", "ignoring player-dead as non-blocking"],
        },
        {
            "id": "H7",
            "title": "DQN anchor is missing independently",
            "sourceFindingIds": ["B.08", "B.09"],
            "evidenceToday": "comparisonPolicyDecision=dqn-anchor-blocked and BT94A no-start remains red.",
            "validationPhase": "separate follow-up block or user decision",
            "allowedConsequenceIfProven": "Separate DQN-loader fix or explicit replacement-policy decision.",
            "notAllowedBeforeProof": ["BT94A-ready", "positive reentry signal", "phantom DQN anchor"],
        },
    ]


def _phase_coverage(findings: list[Mapping[str, Any]], hypotheses: list[Mapping[str, Any]]) -> dict[str, bool]:
    required_finding_fields = {
        "sourcePath",
        "field",
        "observedValue",
        "blockEffect",
        "allowedFixClasses",
        "forbiddenActions",
    }
    required_findings = {f"B.{index:02d}" for index in range(1, 10)}
    required_hypotheses = {f"H{index}" for index in range(1, 8)}
    blocked_action_text = " ".join(BLOCKED_ACTIONS).lower()
    return {
        "93Q.1.1": len(findings) == 9 and all(finding.get("sourcePath") for finding in findings),
        "93Q.1.2": all(required_finding_fields.issubset(set(finding.keys())) for finding in findings)
        and {str(finding.get("id")) for finding in findings} == required_findings,
        "93Q.1.3": {str(hypothesis.get("id")) for hypothesis in hypotheses} == required_hypotheses
        and all(hypothesis.get("validationPhase") for hypothesis in hypotheses),
        "93Q.1.4": all(action in NEXT_ALLOWED_ACTIONS for action in NEXT_ALLOWED_ACTIONS)
        and all(term in blocked_action_text for term in ("bt93o", "bt93p", "bt94a", "candidate", "freeze", "holdout", "promote", "rollout")),
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    payloads = {
        key: _read_json(path)
        for key, path in SOURCE_PATHS.items()
        if path.suffix == ".json"
    }
    samples = _read_jsonl(SOURCE_PATHS["bt93nDeathTraceSamples"])
    findings = _build_findings(payloads, samples)
    hypotheses = _hypotheses()
    coverage = _phase_coverage(findings, hypotheses)
    source_artifacts = _source_artifacts()
    source_files_ready = all(
        artifact["exists"] and artifact["isFile"]
        for key, artifact in source_artifacts.items()
        if key != "bt93qIntake"
    )
    source_files_versioned = all(
        artifact["tracked"]
        for key, artifact in source_artifacts.items()
        if key != "bt93qIntake"
    )
    generated_at = _utc_now()
    common = {
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93q_finding_register.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93Q",
        "phaseId": "93Q.1",
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "phaseCoverage": coverage,
        "next_allowed_actions": list(NEXT_ALLOWED_ACTIONS),
        "blocked_actions": list(BLOCKED_ACTIONS),
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "fixApplied": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "rolloutAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
    }
    ok = source_files_ready and source_files_versioned and all(coverage.values())
    finding_register = {
        "schemaVersion": "bt93q-finding-register-v1",
        "ok": ok,
        "resultClass": "finding-register-locked" if ok else "finding-register-incomplete",
        "findings": findings,
        "findingIds": [finding["id"] for finding in findings],
        "commands": {
            "write": "python python/scripts/bt93q_finding_register.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
        **common,
    }
    hypothesis_lock = {
        "schemaVersion": "bt93q-hypothesis-lock-v1",
        "ok": ok,
        "resultClass": "hypotheses-locked-before-fix" if ok else "hypothesis-lock-incomplete",
        "hypotheses": hypotheses,
        "hypothesisIds": [hypothesis["id"] for hypothesis in hypotheses],
        "lockPolicy": {
            "lockedBeforeFix": True,
            "fixRequiresPriorEvidence": True,
            "oneFixClassPerSubphase": True,
            "hypothesesMayNotBeReinterpretedAfterFix": True,
            "recheckMaxTimesteps": 10_000,
            "bt94aReadyForbidden": True,
        },
        **common,
    }
    return finding_register, hypothesis_lock


def main() -> int:
    global BT93Q_ROOT, FINDING_REGISTER_PATH, HYPOTHESIS_LOCK_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93Q_ROOT)
    args = parser.parse_args()

    BT93Q_ROOT = args.output_root.resolve()
    FINDING_REGISTER_PATH = BT93Q_ROOT / "finding_register.json"
    HYPOTHESIS_LOCK_PATH = BT93Q_ROOT / "hypothesis_lock.json"

    finding_register, hypothesis_lock = build_reports()
    if args.write_report:
        _write_json(FINDING_REGISTER_PATH, finding_register)
        _write_json(HYPOTHESIS_LOCK_PATH, hypothesis_lock)

    summary = {
        "ok": bool(finding_register["ok"]) and bool(hypothesis_lock["ok"]),
        "findingRegisterResultClass": finding_register["resultClass"],
        "hypothesisLockResultClass": hypothesis_lock["resultClass"],
        "phaseCoverage": finding_register["phaseCoverage"],
        "outputs": {
            "findingRegister": _rel(FINDING_REGISTER_PATH),
            "hypothesisLock": _rel(HYPOTHESIS_LOCK_PATH),
        },
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
