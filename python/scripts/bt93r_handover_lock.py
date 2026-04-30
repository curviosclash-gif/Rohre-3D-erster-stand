"""BT93R.1 handover and hypothesis lock.

This report-only script freezes the BT93Q handover inputs before BT93R can
inspect model/logit/normalize evidence. It does not train, evaluate a new PPO
model, apply fixes, create candidates, consume holdout data, or touch runtime
surfaces.
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
BT93R_ROOT = PPO_ROOT / "bt93r"
OUTPUT_PATH = BT93R_ROOT / "bt93r_handover_lock_report.json"

SOURCE_PATHS: dict[str, tuple[Path, str]] = {
    "bt93qHandover": (
        PPO_ROOT / "bt93q" / "handover_package.json",
        "BT93Q handover package",
    ),
    "bt93qClosure": (
        PPO_ROOT / "bt93q" / "closure_gate_report.json",
        "BT93Q.99 closure gate",
    ),
    "bt93qPolicyCollapse": (
        PPO_ROOT / "bt93q" / "policy_collapse_report.json",
        "BT93Q.3 deterministic policy-collapse report",
    ),
    "bt93qActionEffect": (
        PPO_ROOT / "bt93q" / "action_effect_stress_report.json",
        "BT93Q.4 action-effect stress report",
    ),
    "bt93qObservationTelemetryGap": (
        PPO_ROOT / "bt93q" / "observation_telemetry_gap_report.json",
        "BT93Q.2 observation telemetry gap report",
    ),
    "bt93qRewardOrdering": (
        PPO_ROOT / "bt93q" / "reward_pressure_ordering_report.json",
        "BT93Q.99 reward pressure ordering report",
    ),
    "bt93qSafetyContract": (
        PPO_ROOT / "bt93q" / "safety_action_contract_report.json",
        "BT93Q.99 safety action contract report",
    ),
    "bt93qHypothesisLock": (
        PPO_ROOT / "bt93q" / "hypothesis_lock.json",
        "BT93Q.1 source hypothesis lock",
    ),
}

COMMON_BLOCKED_ACTIONS = [
    "BT93O claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate or BT95 handoff signal",
    "50k/100k/200k/500k/1M extension",
]

BT93R_FORBIDDEN_ACTIONS = [
    "PPO training run in 93R.1",
    "quality claim from proxy counts",
    "reward fix in BT93R",
    "action fix in BT93R",
    "observation/telemetry fix in BT93R",
    "safety-mask fix in BT93R",
    "terminal/runner fix in BT93R",
    *COMMON_BLOCKED_ACTIONS,
]

NEXT_ALLOWED_ACTIONS = [
    "93R.2 model/logit/normalize artifact capability check",
    "93R.3 root-cause separation only after 93R.2 source evidence",
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
    rel_paths = [_rel(path) for path in paths]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source(path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked,
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "sourceGitSha": _get(payload, "git", "sha") if payload else None,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "fixApplied": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "qualityClaimAllowed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
    }


def _claim_flags() -> dict[str, bool]:
    return {
        "qualityClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
    }


def _hypotheses(payloads: Mapping[str, Mapping[str, Any]]) -> list[dict[str, Any]]:
    policy = payloads["bt93qPolicyCollapse"]
    action = payloads["bt93qActionEffect"]
    telemetry = payloads["bt93qObservationTelemetryGap"]
    reward = payloads["bt93qRewardOrdering"]
    safety = payloads["bt93qSafetyContract"]
    handover = payloads["bt93qHandover"]
    closure = payloads["bt93qClosure"]
    source_hypotheses = {
        str(item.get("id")): item
        for item in payloads["bt93qHypothesisLock"].get("hypotheses", [])
        if isinstance(item, Mapping) and item.get("id")
    }

    return [
        {
            "id": "H1",
            "title": "Deterministic eval collapse is a policy-artifact problem",
            "active": True,
            "fixClass": "Policy-Collapse",
            "bt93rFixClassAllowed": True,
            "sourceArtifactKeys": ["bt93qPolicyCollapse", "bt93qHandover", "bt93qClosure"],
            "sourceHypothesisTitle": source_hypotheses.get("H1", {}).get("title"),
            "observed": {
                "resultClass": policy.get("resultClass"),
                "dominantAction": _get(policy, "deterministicEval", "dominantAction"),
                "singleActionEvalShare": _get(policy, "deterministicEval", "singleActionEvalShare"),
                "combinedEvalRepeatedActionLowerBound": _get(policy, "repeatedActionStreaks", "combinedEvalLowerBound"),
                "realModelLogitsAvailable": _get(policy, "entropyLogitSnapshot", "realModelLogitsAvailable"),
                "modelPackagePersistedInBT93N": _get(policy, "entropyLogitSnapshot", "modelPackagePersistedInBT93N"),
            },
            "nextAllowedActions": ["93R.2 artifact/logit/normalize proof", "93R.3 root-cause split"],
            "forbiddenActions": [
                "treat stochastic train entropy as quality evidence",
                "counterprobe before model/logit/normalize evidence",
                *BT93R_FORBIDDEN_ACTIONS,
            ],
        },
        {
            "id": "H2",
            "title": "Atomic or selected actions are insufficient for wall/trail escape",
            "active": True,
            "fixClass": "Action",
            "bt93rFixClassAllowed": False,
            "sourceArtifactKeys": ["bt93qActionEffect", "bt93qHandover", "bt93qClosure"],
            "sourceHypothesisTitle": source_hypotheses.get("H2", {}).get("title"),
            "observed": {
                "resultClass": action.get("resultClass"),
                "classResultCounts": action.get("classResultCounts"),
                "activeBlockerPresent": "action-space-required" in (handover.get("activeBlockers") or []),
            },
            "nextAllowedActions": ["defer to BT93S action-effect/action-selection repair"],
            "forbiddenActions": ["action-surface change in BT93R", *COMMON_BLOCKED_ACTIONS],
        },
        {
            "id": "H3",
            "title": "Raw/trail/escape-lane telemetry gap limits attribution",
            "active": True,
            "fixClass": "Observation/Telemetry",
            "bt93rFixClassAllowed": False,
            "sourceArtifactKeys": ["bt93qObservationTelemetryGap", "bt93qHandover", "bt93qClosure"],
            "sourceHypothesisTitle": source_hypotheses.get("H3", {}).get("title"),
            "observed": {
                "resultClass": telemetry.get("resultClass"),
                "requiredFieldGroups": _get(telemetry, "nextDiagnosisTelemetryDecision", "requiredFieldGroups"),
                "rawPoseAvailableAllFalse": _get(telemetry, "telemetryCompleteness", "rawPoseAvailableAllFalse"),
            },
            "nextAllowedActions": ["defer to BT93T only if BT93S keeps telemetry as blocker"],
            "forbiddenActions": ["observation/telemetry change in BT93R", "runtime observation change", *COMMON_BLOCKED_ACTIONS],
        },
        {
            "id": "H4",
            "title": "Safety signal is diagnostic and not action-effective",
            "active": True,
            "fixClass": "Safety-Mask",
            "bt93rFixClassAllowed": False,
            "sourceArtifactKeys": ["bt93qSafetyContract", "bt93qHandover", "bt93qClosure"],
            "sourceHypothesisTitle": source_hypotheses.get("H4", {}).get("title"),
            "observed": {
                "resultClass": safety.get("resultClass"),
                "vetoActiveRows": _get(safety, "evidence", "vetoActiveRows"),
                "vetoEventRows": _get(safety, "evidence", "vetoEventRows"),
                "productiveRuntimeSafetySwitchAllowed": _get(
                    safety,
                    "contractDecision",
                    "productiveRuntimeSafetySwitchAllowed",
                ),
            },
            "nextAllowedActions": ["defer safety/terminal split to BT93V"],
            "forbiddenActions": ["safety-mask change in BT93R", "productive runtime safety switch", *COMMON_BLOCKED_ACTIONS],
        },
        {
            "id": "H5",
            "title": "Reward ordering rewards risky pressure rows",
            "active": True,
            "fixClass": "Reward",
            "bt93rFixClassAllowed": False,
            "sourceArtifactKeys": ["bt93qRewardOrdering", "bt93qHandover", "bt93qClosure"],
            "sourceHypothesisTitle": source_hypotheses.get("H5", {}).get("title"),
            "observed": {
                "resultClass": reward.get("resultClass"),
                "positiveRiskyRewardActionRowCount": _get(
                    reward,
                    "pressureEvidence",
                    "positiveRiskyRewardActionRowCount",
                ),
                "progressOrCheckpointRewardWronglyOrderedNearPressure": _get(
                    reward,
                    "decision",
                    "progressOrCheckpointRewardWronglyOrderedNearPressure",
                ),
            },
            "nextAllowedActions": ["defer danger-aware reward ordering to BT93U"],
            "forbiddenActions": ["reward redesign in BT93R", "reward quality claim", *COMMON_BLOCKED_ACTIONS],
        },
        {
            "id": "H6",
            "title": "Terminal/runner semantics may still be a blocker",
            "active": True,
            "fixClass": "Terminal/Runner",
            "bt93rFixClassAllowed": False,
            "sourceArtifactKeys": ["bt93qClosure", "bt93qHandover"],
            "sourceHypothesisTitle": source_hypotheses.get("H6", {}).get("title"),
            "observed": {
                "bt93qResultClass": closure.get("resultClass"),
                "activeBlockers": closure.get("activeBlockers"),
                "terminalSemanticsRequired": "terminal-semantics-required" in (closure.get("activeBlockers") or []),
            },
            "nextAllowedActions": ["defer terminal sanity to BT93V"],
            "forbiddenActions": ["terminal/runner fix in BT93R", "ignore player-dead as non-blocking", *COMMON_BLOCKED_ACTIONS],
        },
        {
            "id": "H7",
            "title": "Comparator/DQN anchor remains separate from policy-collapse repair",
            "active": True,
            "fixClass": "Comparator/DQN",
            "bt93rFixClassAllowed": False,
            "sourceArtifactKeys": ["bt93qHandover", "bt93qClosure"],
            "sourceHypothesisTitle": source_hypotheses.get("H7", {}).get("title"),
            "observed": {
                "dqnAnchorStatus": handover.get("dqnAnchorStatus"),
                "bt93pClaimAllowed": handover.get("bt93pClaimAllowed"),
                "bt94aClaimAllowed": handover.get("bt94aClaimAllowed"),
            },
            "nextAllowedActions": ["defer comparator preflight to 93X.0 and full comparator work to BT93X"],
            "forbiddenActions": ["phantom same-matrix DQN anchor", "BT94A-ready wording", *COMMON_BLOCKED_ACTIONS],
        },
    ]


def _all_guardrails_closed(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    unexpected: dict[str, Any] = {}
    for source_name, payload in payloads.items():
        guardrails = payload.get("guardrails")
        if not isinstance(guardrails, Mapping):
            continue
        for key in (
            "qualityClaimAllowed",
            "bt93oClaimAllowed",
            "bt93pClaimAllowed",
            "bt94aClaimAllowed",
            "candidateRun",
            "freezeCandidate",
            "holdoutUsed",
            "promotionAllowed",
            "rolloutAllowed",
            "ppoValidateSignal",
            "productiveRuntimeChanged",
        ):
            if key in guardrails and guardrails.get(key) is not False:
                unexpected[f"{source_name}.{key}"] = guardrails.get(key)
        if guardrails.get("runtimeSurfacesTouched") not in (None, []):
            unexpected[f"{source_name}.runtimeSurfacesTouched"] = guardrails.get("runtimeSurfacesTouched")
    return {"ok": not unexpected, "unexpectedOpenGuardrails": unexpected}


def build_report() -> dict[str, Any]:
    payloads = {key: _read_json(path) for key, (path, _role) in SOURCE_PATHS.items()}
    tracked = _tracked_files(path for path, _role in SOURCE_PATHS.values())
    source_artifacts = [
        {"key": key, **_source(path, role, tracked)}
        for key, (path, role) in SOURCE_PATHS.items()
    ]
    sources_ready = all(item["exists"] and item["isFile"] for item in source_artifacts)
    sources_versioned = all(item["tracked"] for item in source_artifacts)
    hypotheses = _hypotheses(payloads)
    flags = _claim_flags()
    guardrails = _guardrails()
    source_guardrails = _all_guardrails_closed(payloads)
    expected_source_results = {
        "bt93qHandover": "policy-collapse-active",
        "bt93qClosure": "policy-collapse-active",
        "bt93qPolicyCollapse": "policy-collapse-active",
        "bt93qActionEffect": "action-space-required",
        "bt93qObservationTelemetryGap": "observation-telemetry-required",
        "bt93qRewardOrdering": "reward-redesign-required",
        "bt93qSafetyContract": "safety-diagnostic-only",
        "bt93qHypothesisLock": "hypotheses-locked-before-fix",
    }
    source_results_locked = all(
        payloads[key].get("resultClass") == expected
        for key, expected in expected_source_results.items()
    )
    phase_coverage = {
        "93R.1.1": sources_ready and sources_versioned and source_results_locked,
        "93R.1.2": len(hypotheses) == 7
        and {item["id"] for item in hypotheses} == {f"H{index}" for index in range(1, 8)}
        and all(item.get("active") is True and item.get("fixClass") and item.get("forbiddenActions") for item in hypotheses),
        "93R.1.3": all(value is False for value in flags.values())
        and guardrails["qualityClaimAllowed"] is False
        and guardrails["bt93oClaimAllowed"] is False
        and guardrails["bt93pClaimAllowed"] is False
        and guardrails["bt94aClaimAllowed"] is False
        and source_guardrails["ok"] is True,
    }
    dod_coverage = {
        "DoD.R1": all(phase_coverage.values()),
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())
    policy = payloads["bt93qPolicyCollapse"]
    handover = payloads["bt93qHandover"]
    telemetry = payloads["bt93qObservationTelemetryGap"]
    reward = payloads["bt93qRewardOrdering"]
    action = payloads["bt93qActionEffect"]
    safety = payloads["bt93qSafetyContract"]
    return {
        "schemaVersion": "bt93r-handover-lock-report-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93r_handover_lock.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93R",
        "phaseId": "93R.1",
        "resultClass": "handover-lock-green" if ok else "handover-lock-incomplete",
        "matrixId": handover.get("matrixId") or reward.get("matrixId"),
        "semanticWindow": handover.get("semanticWindow") or reward.get("semanticWindow"),
        "policyIds": policy.get("policyIds"),
        "actionSurface": {
            "path": _get(policy, "actionSurface", "path"),
            "actionCount": _get(policy, "actionSurface", "actionCount"),
            "semanticActions": _get(policy, "actionSurface", "semanticActions"),
            "bt93qActionEffectResultClass": action.get("resultClass"),
        },
        "rewardOrderingIds": {
            "reportPath": _rel(SOURCE_PATHS["bt93qRewardOrdering"][0]),
            "resultClass": reward.get("resultClass"),
            "positiveRiskyRewardActionRowCount": _get(reward, "pressureEvidence", "positiveRiskyRewardActionRowCount"),
        },
        "telemetryIds": {
            "reportPath": _rel(SOURCE_PATHS["bt93qObservationTelemetryGap"][0]),
            "resultClass": telemetry.get("resultClass"),
            "requiredFieldGroups": _get(telemetry, "nextDiagnosisTelemetryDecision", "requiredFieldGroups"),
            "rawPoseAvailableAllFalse": _get(telemetry, "telemetryCompleteness", "rawPoseAvailableAllFalse"),
        },
        "safetyIds": {
            "reportPath": _rel(SOURCE_PATHS["bt93qSafetyContract"][0]),
            "resultClass": safety.get("resultClass"),
            "vetoActiveIsDiagnosticOnly": _get(safety, "contractDecision", "vetoActiveIsDiagnosticOnly"),
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": sources_ready,
        "sourceFilesVersioned": sources_versioned,
        "sourceResultsLocked": source_results_locked,
        "sourceGuardrails": source_guardrails,
        "activeBlockers": handover.get("activeBlockers"),
        "hypotheses": hypotheses,
        "hypothesisIds": [item["id"] for item in hypotheses],
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "thresholdsLockedBeforeRun": {
            "notApplicableReason": "93R.1 is a handover lock and runs no PPO training/eval sample.",
            "afterTheFactThresholdChangesAllowed": False,
        },
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "bt93qDeterministicEvalActionRows": _get(policy, "deterministicEval", "combinedDistribution", "total"),
            "bt93qStochasticTrainActionRows": _get(policy, "stochasticTrain", "distribution", "total"),
            "bt93qActionStressProbeCount": len(action.get("probes") or []),
            "bt93qPositiveRiskyRewardActionRowCount": _get(
                reward,
                "pressureEvidence",
                "positiveRiskyRewardActionRowCount",
            ),
        },
        "claimFlags": flags,
        "guardrails": guardrails,
        "allowNext": NEXT_ALLOWED_ACTIONS if ok else ["repair 93R.1 handover lock evidence"],
        "opensNext": ["93R.2"] if ok else [],
        "blocksNext": [
            "BT93S until 93R.99 reaches R-Allowlist",
            "BT93O until BT93W.99=bt93o-precondition-green",
            *COMMON_BLOCKED_ACTIONS,
        ],
        "summary": {
            "lockedResult": "BT93Q.99=policy-collapse-active",
            "dominantDeterministicAction": _get(policy, "deterministicEval", "dominantAction"),
            "realModelLogitsAvailable": _get(policy, "entropyLogitSnapshot", "realModelLogitsAvailable"),
            "nextPhase": "93R.2",
            "why": "BT93R must prove model/logit/normalize artifact capability before classifying or fixing collapse.",
        },
        "commands": {
            "write": "python python/scripts/bt93r_handover_lock.py --write-report",
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
                "activeBlockers": report["activeBlockers"],
                "opensNext": report["opensNext"],
                "output": _rel(args.output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
