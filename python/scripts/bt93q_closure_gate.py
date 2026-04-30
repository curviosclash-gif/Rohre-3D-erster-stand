"""BT93Q.99 closure gate.

Closes BT93Q from versioned diagnostic evidence only. The gate may close red:
it must not open BT93O, BT93P, BT94A, candidate, freeze, holdout, promotion,
rollout, PPO-Validate, or BT95 handoff signals while wall/trail blockers remain.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"

SAFETY_REPORT_PATH = BT93Q_ROOT / "safety_action_contract_report.json"
REWARD_REPORT_PATH = BT93Q_ROOT / "reward_pressure_ordering_report.json"
HANDOVER_PATH = BT93Q_ROOT / "handover_package.json"
CLOSURE_PATH = BT93Q_ROOT / "closure_gate_report.json"

SOURCE_PATHS = {
    "findingRegister": BT93Q_ROOT / "finding_register.json",
    "traceReanalysis": BT93Q_ROOT / "trace_reanalysis_report.json",
    "observationTelemetryGap": BT93Q_ROOT / "observation_telemetry_gap_report.json",
    "policyCollapse": BT93Q_ROOT / "policy_collapse_report.json",
    "scenarioManifest": BT93Q_ROOT / "walltrail_scenario_manifest.json",
    "actionEffectStress": BT93Q_ROOT / "action_effect_stress_report.json",
    "fixManifest": BT93Q_ROOT / "fix_manifest.json",
    "fixDelta": BT93Q_ROOT / "fix_delta_report.json",
    "microPpoContract": BT93Q_ROOT / "micro_ppo_recheck_contract.json",
    "microPpoRecheck": BT93Q_ROOT / "micro_ppo_recheck_report.json",
    "bt93mComparisonPolicy": PPO_ROOT / "bt93m" / "comparison_policy_decision.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
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

ALLOWED_CLOSURE_RESULTS = {
    "walltrail-policy-green",
    "death-before60-still-blocking",
    "policy-collapse-active",
    "action-space-required",
    "observation-telemetry-required",
    "reward-redesign-required",
    "terminal-semantics-required",
    "measurement-invalid",
}

FORBIDDEN_GUARDRAILS = {
    "bt93oClaimAllowed",
    "bt93pClaimAllowed",
    "bt94aClaimAllowed",
    "candidateRun",
    "freezeCandidate",
    "holdoutUsed",
    "promotionAllowed",
    "rolloutAllowed",
    "ppoValidateSignal",
    "qualityClaimAllowed",
    "productiveRuntimeChanged",
}


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


def _git_lines(args: list[str]) -> list[str]:
    return [line.strip().replace("\\", "/") for line in _git_output(args).splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    return set(_git_lines(["git", "ls-files", "--", *(_rel(path) for path in paths)]))


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


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _all_coverage_true(payload: Mapping[str, Any], prefix: str) -> bool:
    coverage = payload.get("phaseCoverage")
    return isinstance(coverage, Mapping) and all(
        str(key).startswith(prefix) and value is True for key, value in coverage.items()
    )


def _guardrails_closed(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    unexpected: dict[str, Any] = {}
    for source_name, payload in payloads.items():
        guardrails = payload.get("guardrails")
        if not isinstance(guardrails, Mapping):
            continue
        for key in FORBIDDEN_GUARDRAILS:
            if key in guardrails and guardrails.get(key) is not False:
                unexpected[f"{source_name}.{key}"] = guardrails.get(key)
        runtime_surfaces = guardrails.get("runtimeSurfacesTouched")
        if runtime_surfaces not in (None, []):
            unexpected[f"{source_name}.runtimeSurfacesTouched"] = runtime_surfaces
    return {"ok": not unexpected, "unexpectedOpenGuardrails": unexpected}


def _common_guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "qualityClaimAllowed": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
    }


def _source_artifacts(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    roles = {
        "findingRegister": "BT93Q.1 finding register",
        "traceReanalysis": "BT93Q.2 trace/tail reanalysis",
        "observationTelemetryGap": "BT93Q.2 observation and telemetry gap report",
        "policyCollapse": "BT93Q.3 deterministic policy-collapse report",
        "scenarioManifest": "BT93Q.4 pinned wall/trail scenarios",
        "actionEffectStress": "BT93Q.4 action-effect stress report",
        "fixManifest": "BT93Q.5 single-fix manifest",
        "fixDelta": "BT93Q.5 fix delta report",
        "microPpoContract": "BT93Q.6 locked 10k recheck contract",
        "microPpoRecheck": "BT93Q.6 guarded 10k recheck report",
        "bt93mComparisonPolicy": "DQN anchor / replacement-policy blocker",
        "bt94aNoStartGate": "BT94A still-closed gate",
    }
    tracked = _tracked_files(SOURCE_PATHS.values())
    return {
        key: _source(path, roles[key], tracked)
        for key, path in SOURCE_PATHS.items()
    }


def _positive_risky_reward_rows(action_stress: Mapping[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    scenario_results = action_stress.get("scenarioResults")
    if not isinstance(scenario_results, Mapping):
        return rows
    for scenario_id, scenario in scenario_results.items():
        action_results = scenario.get("actionResults") if isinstance(scenario, Mapping) else None
        if not isinstance(action_results, Mapping):
            continue
        for action_name, result in action_results.items():
            if not isinstance(result, Mapping):
                continue
            success = _get(result, "successEvaluation", "success") is True
            reward_total = float(_get(result, "successEvaluation", "rewardTotal") or 0.0)
            risk_deltas = result.get("riskDeltas") if isinstance(result.get("riskDeltas"), Mapping) else {}
            risk_worse = any(
                float(risk_deltas.get(key) or 0.0) > 0.0
                for key in ("collisionRisk", "deadEndRisk", "terminalRisk", "threatHorizon")
            )
            reward_only_rejected = _get(result, "successEvaluation", "rewardOnlyRejected") is True
            if reward_total > 0.0 and not success and (risk_worse or reward_only_rejected):
                rows.append(
                    {
                        "scenarioId": str(scenario_id),
                        "action": str(action_name),
                        "rewardTotal": round(reward_total, 6),
                        "rewardOnlyRejected": reward_only_rejected,
                        "riskDeltas": {
                            key: round(float(risk_deltas.get(key) or 0.0), 6)
                            for key in ("collisionRisk", "deadEndRisk", "terminalRisk", "threatHorizon")
                        },
                    }
                )
    return rows


def _build_safety_report(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    trace = payloads["traceReanalysis"]
    fix_delta = payloads["fixDelta"]
    micro = payloads["microPpoRecheck"]
    all_group = _get(trace, "groups", "all") if isinstance(_get(trace, "groups", "all"), Mapping) else {}
    safety = all_group.get("safety") if isinstance(all_group.get("safety"), Mapping) else {}
    veto_active_rows = int(safety.get("vetoActiveRows") or 0)
    veto_event_rows = int(safety.get("vetoEventRows") or 0)
    max_veto_rate = float(safety.get("maxVetoRate") or 0.0)
    new_actions_safety_zero = _get(fix_delta, "safety", "newActionsSafetyZero") is True
    contract_decision = {
        "vetoActiveIsDiagnosticOnly": veto_active_rows > 0 and veto_event_rows == 0 and max_veto_rate == 0.0,
        "handlungswirksameMaskOrPolicyRequiredBeforeGreen": True,
        "safetyMaskFixSelectedIn93Q": _get(fix_delta, "fixClass") == "Safety-Mask",
        "productiveRuntimeSafetySwitchAllowed": False,
        "runtimeSurfacesTouched": [],
        "bt93oBlockedUntilSafetyIsActionEffective": True,
    }
    phase_coverage = {
        "DoD.8": contract_decision["vetoActiveIsDiagnosticOnly"]
        and contract_decision["productiveRuntimeSafetySwitchAllowed"] is False
        and _get(micro, "guardrails", "productiveRuntimeChanged") is False,
    }
    return {
        "schemaVersion": "bt93q-safety-action-contract-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": all(phase_coverage.values()),
        "blockId": "BT93Q",
        "phaseId": "93Q.99",
        "resultClass": "safety-diagnostic-only",
        "phaseCoverage": phase_coverage,
        "evidence": {
            "vetoActiveRows": veto_active_rows,
            "vetoEventRows": veto_event_rows,
            "maxVetoRate": max_veto_rate,
            "newActionsSafetyZero": new_actions_safety_zero,
            "microRecheckStarted": _get(micro, "decision", "recheckStarted") is True,
        },
        "contractDecision": contract_decision,
        "blocksNext": list(BLOCKED_ACTIONS),
        "nextAllowedActions": [
            "treat safety veto fields as diagnostics until a later pre-sampling mask/emergency policy proves state effect",
            "do not change productive runtime safety in BT93Q",
        ],
        "guardrails": _common_guardrails(),
        "commands": {
            "write": "python python/scripts/bt93q_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def _build_reward_report(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    trace = payloads["traceReanalysis"]
    action_stress = payloads["actionEffectStress"]
    all_tail = _get(trace, "groups", "all", "rewardTail") if isinstance(_get(trace, "groups", "all", "rewardTail"), Mapping) else {}
    breakdown = all_tail.get("breakdownTotals") if isinstance(all_tail.get("breakdownTotals"), Mapping) else {}
    positive = all_tail.get("positiveComponentTotals") if isinstance(all_tail.get("positiveComponentTotals"), Mapping) else {}
    negative = all_tail.get("negativeComponentTotals") if isinstance(all_tail.get("negativeComponentTotals"), Mapping) else {}
    risky_positive_rows = _positive_risky_reward_rows(action_stress)
    result_class = "reward-redesign-required" if risky_positive_rows else "measurement-invalid"
    phase_coverage = {
        "DoD.9": result_class == "reward-redesign-required"
        and int(all_tail.get("wallRiskRows") or 0) > 0
        and len(risky_positive_rows) > 0,
    }
    return {
        "schemaVersion": "bt93q-reward-pressure-ordering-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": all(phase_coverage.values()),
        "blockId": "BT93Q",
        "phaseId": "93Q.99",
        "resultClass": result_class,
        "matrixId": _get(payloads["microPpoContract"], "matrixId"),
        "semanticWindow": _get(payloads["microPpoContract"], "semanticWindow"),
        "phaseCoverage": phase_coverage,
        "pressureEvidence": {
            "tailRows": all_tail.get("rowReward", {}).get("count") if isinstance(all_tail.get("rowReward"), Mapping) else None,
            "wallRiskRows": all_tail.get("wallRiskRows"),
            "checkpointRows": all_tail.get("checkpointRows"),
            "positiveComponentTotals": positive,
            "negativeComponentTotals": negative,
            "breakdownTotals": breakdown,
            "positiveRiskyRewardActionRows": risky_positive_rows,
            "positiveRiskyRewardActionRowCount": len(risky_positive_rows),
        },
        "decision": {
            "progressOrCheckpointRewardWronglyOrderedNearPressure": True,
            "rewardFixAllowedWithoutNewPlan": False,
            "bt93oClaimAllowed": False,
            "resultClass": result_class,
            "blocksNext": list(BLOCKED_ACTIONS),
            "nextAllowedActions": [
                "separate reward-ordering repair before any BT93O quality claim",
                "keep reward totals out of quality evidence while wall/trail pressure rows receive positive reward",
            ],
        },
        "guardrails": _common_guardrails(),
        "commands": {
            "write": "python python/scripts/bt93q_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def _primary_result(active_blockers: list[str]) -> str:
    for candidate in (
        "policy-collapse-active",
        "action-space-required",
        "observation-telemetry-required",
        "reward-redesign-required",
        "death-before60-still-blocking",
        "terminal-semantics-required",
        "measurement-invalid",
    ):
        if candidate in active_blockers:
            return candidate
    return "walltrail-policy-green"


def _active_blockers(
    payloads: Mapping[str, Mapping[str, Any]],
    safety_report: Mapping[str, Any],
    reward_report: Mapping[str, Any],
) -> list[str]:
    blockers: list[str] = []
    if payloads["policyCollapse"].get("resultClass") == "policy-collapse-active":
        blockers.append("policy-collapse-active")
    if payloads["actionEffectStress"].get("resultClass") == "action-space-required":
        blockers.append("action-space-required")
    if payloads["fixDelta"].get("resultClass") == "action-fix-insufficient":
        blockers.append("action-space-required")
    if payloads["observationTelemetryGap"].get("resultClass") == "observation-telemetry-required":
        blockers.append("observation-telemetry-required")
    if reward_report.get("resultClass") == "reward-redesign-required":
        blockers.append("reward-redesign-required")
    if _get(safety_report, "contractDecision", "handlungswirksameMaskOrPolicyRequiredBeforeGreen") is True:
        blockers.append("safety-action-contract-diagnostic-only")
    if payloads["microPpoRecheck"].get("resultClass") == "death-before60-still-blocking":
        blockers.append("death-before60-still-blocking")
    return sorted(set(blockers))


def _build_handover(
    payloads: Mapping[str, Mapping[str, Any]],
    safety_report: Mapping[str, Any],
    reward_report: Mapping[str, Any],
) -> dict[str, Any]:
    blockers = _active_blockers(payloads, safety_report, reward_report)
    result_class = _primary_result(blockers)
    bt93o_allowed = result_class == "walltrail-policy-green" and not blockers
    comparison = payloads["bt93mComparisonPolicy"]
    no_start = payloads["bt94aNoStartGate"]
    return {
        "schemaVersion": "bt93q-handover-package-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": result_class in ALLOWED_CLOSURE_RESULTS and not bt93o_allowed,
        "blockId": "BT93Q",
        "phaseId": "93Q.99",
        "resultClass": result_class,
        "activeBlockers": blockers,
        "matrixId": _get(payloads["microPpoContract"], "matrixId"),
        "semanticWindow": _get(payloads["microPpoContract"], "semanticWindow"),
        "bt93oClaimAllowed": bt93o_allowed,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutUsed": False,
        "opensNext": [],
        "blocksNext": list(BLOCKED_ACTIONS),
        "dqnAnchorStatus": {
            "comparisonPolicyDecision": comparison.get("comparisonPolicyDecision"),
            "sameMatrixDqnAnchorPresent": comparison.get("sameMatrixDqnAnchorPresent"),
            "nonBlockingForPositiveReentry": comparison.get("nonBlockingForPositiveReentry"),
        },
        "bt94aNoStartState": {
            "resultClass": no_start.get("resultClass"),
            "claimable": no_start.get("claimable"),
            "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": no_start.get("candidateFreezeAllowed"),
        },
        "summary": {
            "finalResult": result_class,
            "bt93oStartDecision": "blocked",
            "bt93oStartReason": "BT93Q did not close walltrail-policy-green; policy/action/telemetry/reward blockers remain active.",
            "noRuntimeSignal": True,
            "noCandidateFreezeHoldoutPromoteRolloutSignal": True,
        },
        "nextRecommendedActions": [
            {
                "id": "R1",
                "action": "Replan a narrow BT93Q follow-up before BT93O instead of claiming BT93O.",
                "why": "BT93Q.99 closes red; the deterministic eval policy is still collapsed and action/reward/telemetry blockers remain active.",
            },
            {
                "id": "R2",
                "action": "Fix deterministic policy-collapse and prove non-collapsed action distribution before any further PPO recheck.",
                "why": "micro_ppo_recheck_report.json blocked the 10k run with resultClass=policy-collapse-active.",
            },
            {
                "id": "R3",
                "action": "Repair wall/trail action effect or action selection after the failed Action fix.",
                "why": "fix_delta_report.json remains action-fix-insufficient and action_effect_stress_report.json still reports action-space-required.",
            },
            {
                "id": "R4",
                "action": "Expose or derive the missing training-only raw/trail/escape-lane telemetry before interpreting trail behavior as solved.",
                "why": "observation_telemetry_gap_report.json remains observation-telemetry-required.",
            },
            {
                "id": "R5",
                "action": "Redesign danger-aware reward ordering in a separate fix class.",
                "why": "reward_pressure_ordering_report.json shows positive reward under worsening wall/trail pressure without real success.",
            },
        ],
        "guardrails": _common_guardrails(),
        "commands": {
            "write": "python python/scripts/bt93q_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def _build_closure(
    payloads: Mapping[str, Mapping[str, Any]],
    safety_report: Mapping[str, Any],
    reward_report: Mapping[str, Any],
    handover: Mapping[str, Any],
) -> dict[str, Any]:
    source_artifacts = _source_artifacts(payloads)
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    phases_closed = all(
        (
            _all_coverage_true(payloads["findingRegister"], "93Q.1"),
            _all_coverage_true(payloads["traceReanalysis"], "93Q.2"),
            _all_coverage_true(payloads["policyCollapse"], "93Q.3"),
            _all_coverage_true(payloads["actionEffectStress"], "93Q.4"),
            _all_coverage_true(payloads["fixDelta"], "93Q.5"),
            _all_coverage_true(payloads["microPpoRecheck"], "93Q.6"),
        )
    )
    guardrails = _guardrails_closed(
        {
            **payloads,
            "safetyActionContract": safety_report,
            "rewardPressureOrdering": reward_report,
            "handoverPackage": handover,
        }
    )
    active_blockers = list(handover.get("activeBlockers") or [])
    result_class = str(handover.get("resultClass") or "measurement-invalid")
    red_closure_blocks_bt93o = (
        result_class != "walltrail-policy-green"
        and handover.get("bt93oClaimAllowed") is False
        and bool(active_blockers)
    )
    phase_coverage = {
        "93Q.99.1": source_files_ready
        and source_files_versioned
        and phases_closed
        and safety_report.get("ok") is True
        and reward_report.get("ok") is True
        and handover.get("ok") is True,
        "93Q.99.2": result_class in ALLOWED_CLOSURE_RESULTS and bool(active_blockers),
        "93Q.99.3": red_closure_blocks_bt93o,
        "93Q.99.4": handover.get("bt93pClaimAllowed") is False and handover.get("bt94aClaimAllowed") is False,
        "93Q.99.5": guardrails["ok"] is True,
    }
    dod_coverage = {
        "DoD.1": payloads["findingRegister"].get("findingIds") == [f"B.{idx:02d}" for idx in range(1, 10)],
        "DoD.2": payloads["traceReanalysis"].get("ok") is True,
        "DoD.3": payloads["policyCollapse"].get("resultClass") == "policy-collapse-active",
        "DoD.4": int(payloads["scenarioManifest"].get("scenarioCount") or 0) >= 9,
        "DoD.5": payloads["actionEffectStress"].get("resultClass") == "action-space-required",
        "DoD.6": _get(payloads["fixDelta"], "dodCoverage", "DoD.6") is True,
        "DoD.7": payloads["observationTelemetryGap"].get("resultClass") == "observation-telemetry-required",
        "DoD.8": safety_report.get("ok") is True,
        "DoD.9": reward_report.get("resultClass") == "reward-redesign-required",
        "DoD.10": payloads["fixManifest"].get("oneFixClassOnly") is True,
        "DoD.11": payloads["microPpoRecheck"].get("resultClass") == "policy-collapse-active"
        and _get(payloads["microPpoRecheck"], "decision", "recheckStarted") is False,
        "DoD.12": _get(payloads["microPpoContract"], "statisticalCorridor", "afterTheFactThresholdChangesAllowed") is False,
        "DoD.13": handover.get("ok") is True and result_class == "policy-collapse-active",
        "DoD.14": handover.get("bt94aClaimAllowed") is False
        and handover.get("bt93pClaimAllowed") is False
        and _get(handover, "dqnAnchorStatus", "nonBlockingForPositiveReentry") is False,
        "DoD.15": guardrails["ok"] is True
        and handover.get("candidateRunsAllowed") is False
        and handover.get("candidateFreezeAllowed") is False
        and handover.get("holdoutUsed") is False,
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())
    return {
        "schemaVersion": "bt93q-closure-gate-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93Q",
        "phaseId": "93Q.99",
        "resultClass": result_class if ok else "closure-blocked",
        "activeBlockers": active_blockers,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "phasesClosed": phases_closed,
        "forbiddenSignalCheck": guardrails,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutUsed": False,
        "opensNext": [],
        "blocksNext": list(BLOCKED_ACTIONS),
        "summary": {
            "finalResult": result_class if ok else "closure-blocked",
            "bt93oStartDecision": "blocked",
            "activeBlockers": active_blockers,
            "recommendedNext": "Create/claim a narrow follow-up repair for policy collapse, action effect, telemetry, and reward ordering before BT93O.",
        },
        "sourceArtifacts": source_artifacts,
        "generatedArtifacts": {
            "safetyActionContract": _rel(SAFETY_REPORT_PATH),
            "rewardPressureOrdering": _rel(REWARD_REPORT_PATH),
            "handoverPackage": _rel(HANDOVER_PATH),
            "closureGateReport": _rel(CLOSURE_PATH),
        },
        "guardrails": _common_guardrails(),
        "commands": {
            "write": "python python/scripts/bt93q_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    payloads = {key: _read_json(path) for key, path in SOURCE_PATHS.items()}
    safety_report = _build_safety_report(payloads)
    reward_report = _build_reward_report(payloads)
    handover = _build_handover(payloads, safety_report, reward_report)
    closure = _build_closure(payloads, safety_report, reward_report, handover)
    return safety_report, reward_report, handover, closure


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    safety_report, reward_report, handover, closure = build_reports()
    if args.write_report:
        _write_json(SAFETY_REPORT_PATH, safety_report)
        _write_json(REWARD_REPORT_PATH, reward_report)
        _write_json(HANDOVER_PATH, handover)
        _write_json(CLOSURE_PATH, closure)
    print(
        json.dumps(
            {
                "ok": closure["ok"],
                "resultClass": closure["resultClass"],
                "activeBlockers": closure["activeBlockers"],
                "phaseCoverage": closure["phaseCoverage"],
                "dodCoverage": closure["dodCoverage"],
                "outputs": closure["generatedArtifacts"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if closure["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
