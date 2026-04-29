"""BT93M.3 comparator and no-start refresh.

This script only writes governance/evidence reports. It does not run PPO,
consume holdout data, create candidates, or modify productive runtime files.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93M_ROOT = PPO_ROOT / "bt93m"
BT93L_ROOT = PPO_ROOT / "bt93l"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT94A_ROOT = PPO_ROOT / "bt94a"

START_TRUTH_PATH = BT93M_ROOT / "start_truth.json"
GATE_SOURCE_FRESHNESS_PATH = BT93M_ROOT / "gate_source_freshness_report.json"
EVIDENCE_QUARANTINE_PATH = BT93M_ROOT / "evidence_quarantine_report.json"
DQN_ANCHOR_REPORT_PATH = BT93M_ROOT / "dqn_same_matrix_anchor_report.json"
DQN_ANCHOR_MANIFEST_PATH = BT93M_ROOT / "dqn_same_matrix_manifest.json"

BT93L_TASK_CONTRACT_PATH = BT93L_ROOT / "task_metric_contract.json"
BT93L_BASELINE_MATRIX_PATH = BT93L_ROOT / "baseline_matrix_report.json"
BT93L_MICRO_PPO_SIGNAL_PATH = BT93L_ROOT / "micro_ppo_signal_report.json"
BT93L_HANDOVER_PATH = BT93L_ROOT / "handover_package.json"
BT94A_NO_START_PATH = BT94A_ROOT / "no_start_gate.json"

BT93C_PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
BT93C_EVIDENCE_MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
BT93C_HANDOVER_PATH = BT93C_ROOT / "handover_report.json"

PRECOMPARISON_REFRESH_PATH = BT93M_ROOT / "precomparison_refresh_report.json"
EVIDENCE_QUALITY_MATRIX_PATH = BT93M_ROOT / "evidence_quality_matrix.json"
HOLDOUT_LINEAGE_PATH = BT93M_ROOT / "holdout_lineage_report.json"
COMPARISON_POLICY_DECISION_PATH = BT93M_ROOT / "comparison_policy_decision.json"
HANDOVER_PACKAGE_PATH = BT93M_ROOT / "handover_package.json"

FORBIDDEN_ACTIONS = [
    "BT93P BT94A-ready",
    "BT94A candidate run",
    "freeze candidate",
    "holdout consumption",
    "PPO-Validate/promote signal",
    "rollout-ready or BT95-Handoff-ready wording",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


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


def _hash_json(payload: Any) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return sha256(canonical).hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
        "closureCapable": closure_capable,
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _source_artifacts() -> dict[str, Any]:
    return {
        "startTruth": _source(START_TRUTH_PATH, "BT93M.1 start truth"),
        "gateSourceFreshness": _source(GATE_SOURCE_FRESHNESS_PATH, "BT93M.1 gate-source freshness"),
        "evidenceQuarantine": _source(EVIDENCE_QUARANTINE_PATH, "BT93M.1 quarantine policy"),
        "dqnAnchorReport": _source(DQN_ANCHOR_REPORT_PATH, "BT93M.2 DQN same-matrix anchor diagnosis"),
        "dqnAnchorManifest": _source(DQN_ANCHOR_MANIFEST_PATH, "BT93M.2 same-matrix manifest"),
        "bt93lTaskMetricContract": _source(BT93L_TASK_CONTRACT_PATH, "BT93L task metric contract"),
        "bt93lBaselineMatrix": _source(BT93L_BASELINE_MATRIX_PATH, "BT93L baseline/control matrix"),
        "bt93lMicroPpoSignal": _source(BT93L_MICRO_PPO_SIGNAL_PATH, "BT93L 10k micro PPO signal"),
        "bt93lHandover": _source(BT93L_HANDOVER_PATH, "BT93L handover"),
        "bt94aNoStartGate": _source(BT94A_NO_START_PATH, "BT94A no-start gate"),
        "bt93cPrecomparison": _source(
            BT93C_PRECOMPARISON_PATH,
            "historical BT93C/BT93I precomparison context",
            closure_capable=False,
        ),
        "bt93cEvidenceQualityMatrix": _source(
            BT93C_EVIDENCE_MATRIX_PATH,
            "historical BT93C/BT93I evidence matrix context",
            closure_capable=False,
        ),
        "bt93cHandover": _source(
            BT93C_HANDOVER_PATH,
            "historical BT93C/BT93I handover context",
            closure_capable=False,
        ),
    }


def _matrix() -> dict[str, Any]:
    manifest = _read_json(DQN_ANCHOR_MANIFEST_PATH)
    matrix = manifest.get("matrix") if isinstance(manifest.get("matrix"), Mapping) else {}
    return dict(matrix)


def _policy_summaries() -> dict[str, Any]:
    baseline = _read_json(BT93L_BASELINE_MATRIX_PATH)
    episodes_by_policy = baseline.get("episodesByPolicy")
    if not isinstance(episodes_by_policy, Mapping):
        return {}
    summaries: dict[str, Any] = {}
    for policy_id, policy in episodes_by_policy.items():
        if not isinstance(policy, Mapping):
            continue
        summaries[str(policy_id)] = {
            "episodeCount": policy.get("episodeCount"),
            "seedCount": policy.get("seedCount"),
            "observedStepsTotal": policy.get("observedStepsTotal"),
            "rewardMean": policy.get("rewardMean"),
            "rewardMin": policy.get("rewardMin"),
            "rewardMax": policy.get("rewardMax"),
            "episodesWithProgress": policy.get("episodesWithProgress"),
            "episodesWithObjective": policy.get("episodesWithObjective"),
            "progressSignalReachableTotal": policy.get("progressSignalReachableTotal"),
            "objectiveSignalReachableTotal": policy.get("objectiveSignalReachableTotal"),
            "safetyMaxRates": policy.get("safetyMaxRates"),
        }
    return summaries


def _open_blockers() -> list[dict[str, Any]]:
    start_truth = _read_json(START_TRUTH_PATH)
    dqn_anchor = _read_json(DQN_ANCHOR_REPORT_PATH)
    no_start = _read_json(BT94A_NO_START_PATH)
    bt94a_state = start_truth.get("statusTruth", {}).get("BT94A") if isinstance(start_truth.get("statusTruth"), Mapping) else {}
    return [
        {
            "id": "BT93M.DEATH_BEFORE_60_OPEN",
            "status": "bt94a-blocker",
            "gate": "93M.3/BT93N",
            "evidence": "BT93L micro_ppo_signal_report.json has trainSummary.deathBefore60Count > 0.",
            "observed": _get(start_truth, "statusTruth", "BT93L", "trainDeathBefore60Count"),
            "blocksNext": ["50k extension", "BT93P BT94A-ready"],
        },
        {
            "id": "BT93M.50K_EXTENSION_BLOCKED",
            "status": "bt94a-blocker",
            "gate": "93M.3/BT93N",
            "evidence": "BT93L micro_ppo_signal_report.json decision.extension50kAllowed=false.",
            "observed": _get(start_truth, "statusTruth", "BT93L", "extension50kAllowed"),
            "blocksNext": ["50k extension", "100k/200k ladder", "BT93P BT94A-ready"],
        },
        {
            "id": "BT93M.DQN_SAME_MATRIX_ANCHOR_BLOCKED",
            "status": "bt94a-blocker",
            "gate": "93M.3/BT93P",
            "evidence": "BT93M.2 comparisonPolicyDecision=dqn-anchor-blocked.",
            "observed": dqn_anchor.get("comparisonPolicyDecision"),
            "blocksNext": ["BT93P BT94A-ready", "BT94A candidate/freeze claim"],
        },
        {
            "id": "BT93M.BT94A_NO_START_STILL_RED",
            "status": "bt94a-blocker",
            "gate": "93M.3/BT94A",
            "evidence": "data/training/ppo/bt94a/no_start_gate.json remains claimable=false.",
            "observed": {
                "claimable": no_start.get("claimable") if no_start else _get(bt94a_state, "claimable"),
                "candidateRunsAllowed": no_start.get("candidateRunsAllowed") if no_start else _get(bt94a_state, "candidateRunsAllowed"),
                "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed") if no_start else _get(bt94a_state, "matrixDefinitionAllowed"),
            },
            "blocksNext": ["94A.1 claim", "candidate run", "freeze"],
        },
    ]


def _bt94a_handover(open_blockers: list[Mapping[str, Any]]) -> dict[str, Any]:
    dqn_anchor = _read_json(DQN_ANCHOR_REPORT_PATH)
    precomparison_result = (
        "dqn-anchor-blocked"
        if dqn_anchor.get("comparisonPolicyDecision") == "dqn-anchor-blocked"
        else "same-matrix-dqn-ready"
    )
    return {
        "ready": False,
        "claimable": False,
        "candidateRunsAllowed": False,
        "matrixDefinitionAllowed": False,
        "candidateFreezeAllowed": False,
        "precomparison": precomparison_result,
        "gate": "closed-gate-fresh-dqn-anchor-blocked-by-bt93m",
        "reason": (
            "BT93M refreshed the gate source, but Same-Matrix-DQN is blocked and "
            "DeathBefore60/extension/no-start blockers remain active."
        ),
        "bt94aBlockerCount": len(open_blockers),
        "remainingBt94aGates": [str(item.get("id")) for item in open_blockers],
    }


def build_precomparison_refresh_report() -> dict[str, Any]:
    dqn_anchor = _read_json(DQN_ANCHOR_REPORT_PATH)
    micro = _read_json(BT93L_MICRO_PPO_SIGNAL_PATH)
    baseline = _read_json(BT93L_BASELINE_MATRIX_PATH)
    start_truth = _read_json(START_TRUTH_PATH)
    no_start = _read_json(BT94A_NO_START_PATH)
    dqn_blocked = dqn_anchor.get("comparisonPolicyDecision") == "dqn-anchor-blocked"
    policy_summaries = _policy_summaries()
    simple_baseline_parity_risk = any(
        policy_summaries.get(policy, {}).get("rewardMean") is not None
        for policy in ("random", "semantic-cycle")
    )
    result_class = "precomparison-refresh-dqn-anchor-blocked" if dqn_blocked else "precomparison-refresh-ready"
    return {
        "schemaVersion": "bt93m-precomparison-refresh-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_comparator_no_start_refresh.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93M",
        "phaseId": "93M.3.1",
        "resultClass": result_class,
        "matrix": _matrix(),
        "matrixHash": dqn_anchor.get("matrixHash"),
        "comparisonStatus": {
            "sameMatrixDqnAnchorPresent": dqn_anchor.get("sameMatrixDqnAnchorPresent"),
            "comparisonPolicyDecision": dqn_anchor.get("comparisonPolicyDecision"),
            "dqnModelHash": dqn_anchor.get("modelHash"),
            "configHash": dqn_anchor.get("configHash"),
            "historicalReportsUsedAsAnchor": _get(dqn_anchor, "guardrails", "historicalReportsUsedAsAnchor"),
            "precomparisonUsableForBt94a": not dqn_blocked,
        },
        "ppoSignal": {
            "sourceResultClass": micro.get("resultClass"),
            "actualModelTimesteps": micro.get("actualModelTimesteps"),
            "trainDeathBefore60Count": _get(micro, "trainSummary", "deathBefore60Count"),
            "evalDeathBefore60Count": _get(micro, "evalSummary", "deathBefore60Count"),
            "trainObjectiveSignalReachableCount": _get(micro, "trainSummary", "objectiveSignalReachableCount"),
            "evalObjectiveSignalReachableCount": _get(micro, "evalSummary", "objectiveSignalReachableCount"),
            "trainProgressSignalReachableCount": _get(micro, "trainSummary", "progressSignalReachableCount"),
            "evalProgressSignalReachableCount": _get(micro, "evalSummary", "progressSignalReachableCount"),
            "runtimeErrorCount": _get(micro, "trainSummary", "runtimeErrorCount"),
            "extension50kAllowed": _get(micro, "decision", "extension50kAllowed"),
        },
        "baselineOrdering": {
            "sourceResultClass": baseline.get("resultClass"),
            "policySummaries": policy_summaries,
            "simpleBaselineParityRiskActive": simple_baseline_parity_risk,
            "interpretation": (
                "Short-window simple-baseline ordering remains diagnostic only; it cannot open BT94A "
                "without longer BT93O/P ordering evidence and a valid DQN or user-approved replacement policy."
            ),
        },
        "bt94aNoStart": {
            "claimable": no_start.get("claimable"),
            "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
            "resultClass": no_start.get("resultClass"),
            "currentHandoverSource": no_start.get("currentHandoverSource"),
        },
        "sourceTruth": {
            "startTruthResultClass": start_truth.get("resultClass"),
            "bt93lStatus": _get(start_truth, "statusTruth", "BT93L"),
            "bt94aStatus": _get(start_truth, "statusTruth", "BT94A"),
        },
        "blocksNext": FORBIDDEN_ACTIONS,
        "opensNext": [
            "BT93N diagnose-only root-cause work",
            "DQN loader-fix block or explicit user replacement-policy decision",
        ],
        "nextAllowedActions": [
            "write BT93M.3 handover as gate-fresh-dqn-anchor-blocked",
            "keep BT94A no-start red",
            "proceed to BT93N only as diagnose/repair unless comparison policy is made non-blocking",
        ],
        "invalidations": [
            "historical DQN reports are context-only, not same-matrix anchors",
            "quarantined user-owned 3M/4-env side lane is not closure, baseline, holdout, freeze, candidate, or validate evidence",
            "BT93L micro-PPO signal-green is not a BT94A-ready or candidate signal",
        ],
        "sourceArtifacts": _source_artifacts(),
        "phaseCoverage": {
            "93M.3.1": True,
        },
    }


def build_holdout_lineage_report() -> dict[str, Any]:
    matrix = _matrix()
    task_contract = _read_json(BT93L_TASK_CONTRACT_PATH)
    contract_matrix = task_contract.get("matrix") if isinstance(task_contract.get("matrix"), Mapping) else {}
    seeds = contract_matrix.get("seeds") if isinstance(contract_matrix.get("seeds"), Mapping) else {}
    diagnostic_train = seeds.get("diagnosticTrainSeeds") or matrix.get("diagnosticTrainSeeds") or []
    diagnostic_eval = seeds.get("diagnosticEvalSeeds") or matrix.get("diagnosticEvalSeeds") or []
    control = seeds.get("controlSeeds") or matrix.get("controlSeeds") or []
    holdout = seeds.get("holdoutSeeds") or matrix.get("holdoutSeeds") or []
    consumed = sorted({int(seed) for seed in [*diagnostic_train, *diagnostic_eval, *control]})
    return {
        "schemaVersion": "bt93m-holdout-lineage-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_comparator_no_start_refresh.py",
        "blockId": "BT93M",
        "phaseId": "93M.3.5",
        "resultClass": "holdout-lineage-pinned-freeze-reserved",
        "matrixId": matrix.get("matrixId"),
        "semanticWindow": matrix.get("semanticWindow") or matrix.get("modeId"),
        "diagnosisLineage": {
            "consumedDiagnosticSeeds": consumed,
            "diagnosticTrainSeeds": diagnostic_train,
            "diagnosticEvalSeeds": diagnostic_eval,
            "controlSeeds": control,
            "pre20260429DiagnosisArtifacts": [
                _source(BT93C_PRECOMPARISON_PATH, "pre-2026-04-29 diagnosis/precomparison context", closure_capable=False),
                _source(BT93C_EVIDENCE_MATRIX_PATH, "pre-2026-04-29 diagnosis evidence matrix", closure_capable=False),
                _source(BT93C_HANDOVER_PATH, "pre-2026-04-29 diagnosis handover", closure_capable=False),
            ],
            "interpretation": "Consumed diagnosis/control seeds cannot become a later freeze-holdout line.",
        },
        "freezeHoldoutReservation": {
            "reservedFreezeSeeds": holdout,
            "sourceStatus": seeds.get("holdoutStatus") or matrix.get("holdoutStatus"),
            "usedInBt93m": False,
            "usedInBt93l1ThroughBt93l6": False,
            "mayBeUsedOnlyAfter": [
                "BT93P.4=BT94A-ready",
                "fresh BT94A gate claimable=true",
                "no-post-holdout-optimization manifest is written before use",
            ],
        },
        "noPostHoldoutOptimization": {
            "required": True,
            "rule": (
                "Any optimization after reading a freeze holdout invalidates that candidate and forces a new "
                "unseen holdout seed line."
            ),
            "manifestRequiredBeforeFreeze": True,
        },
        "invalidAsFreezeHoldout": [
            "diagnosticTrainSeeds",
            "diagnosticEvalSeeds",
            "controlSeeds",
            "pre-2026-04-29 diagnosis/holdout artifacts",
            "quarantined user-owned side-lane artifacts",
        ],
        "blocksNext": [
            "BT94A freeze/candidate work before a fresh holdout manifest",
            "any post-holdout optimization on reserved freeze seeds",
        ],
        "sourceArtifacts": _source_artifacts(),
        "phaseCoverage": {
            "93M.3.5": True,
        },
    }


def build_comparison_policy_decision() -> dict[str, Any]:
    dqn_anchor = _read_json(DQN_ANCHOR_REPORT_PATH)
    decision = dqn_anchor.get("comparisonPolicyDecision") or _get(dqn_anchor, "decision", "status")
    non_blocking = decision == "same-matrix-dqn-ready"
    result_class = "comparison-policy-blocks-positive-reentry" if not non_blocking else "comparison-policy-non-blocking"
    return {
        "schemaVersion": "bt93m-comparison-policy-decision-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_comparator_no_start_refresh.py",
        "blockId": "BT93M",
        "phaseId": "93M.3.6",
        "resultClass": result_class,
        "comparisonPolicyDecision": decision,
        "nonBlockingForPositiveReentry": non_blocking,
        "sameMatrixDqnAnchorPresent": dqn_anchor.get("sameMatrixDqnAnchorPresent"),
        "blockingReason": _get(dqn_anchor, "decision", "blockingReason"),
        "allowedNextActions": [
            "BT93N diagnose-only root-cause work",
            "BT93O diagnose-only action/objective/reward-ordering work if BT93N gates allow it",
            "separate loader-fix block",
            "explicit user replacement-policy decision",
        ],
        "blockedActions": FORBIDDEN_ACTIONS,
        "bt93pPolicy": {
            "bt94aReadyMayOpen": non_blocking,
            "requiredBeforePositiveReentry": [
                "same-matrix-dqn-ready or explicit user replacement policy",
                "fresh no_start_gate claimable=true",
                "BT93N/O/P gates green under the pinned statistics contract",
            ],
            "diagnoseOnlyWhileBlocked": not non_blocking,
        },
        "decisionOptions": _get(dqn_anchor, "decision", "nextRepairOptions") or [],
        "sourceArtifacts": _source_artifacts(),
        "phaseCoverage": {
            "93M.3.6": True,
        },
    }


def build_evidence_quality_matrix(
    precomparison: Mapping[str, Any],
    holdout_lineage: Mapping[str, Any],
    comparison_policy: Mapping[str, Any],
) -> dict[str, Any]:
    blockers = _open_blockers()
    rows = [
        {
            "id": "BT93M.START_TRUTH",
            "artifact": _rel(START_TRUTH_PATH),
            "evidenceClass": "closure-capable-red-gate-truth",
            "validAs": ["BT93M.1 evidence", "gate freshness input"],
            "invalidAs": ["BT94A-ready", "candidate", "freeze", "holdout"],
            "resultClass": _read_json(START_TRUTH_PATH).get("resultClass"),
        },
        {
            "id": "BT93M.DQN_ANCHOR",
            "artifact": _rel(DQN_ANCHOR_REPORT_PATH),
            "evidenceClass": "closure-capable-blocker",
            "validAs": ["same-matrix loader diagnosis", "comparison policy blocker"],
            "invalidAs": ["DQN baseline performance anchor", "BT94A-ready"],
            "resultClass": _read_json(DQN_ANCHOR_REPORT_PATH).get("resultClass"),
        },
        {
            "id": "BT93M.PRECOMPARISON_REFRESH",
            "artifact": _rel(PRECOMPARISON_REFRESH_PATH),
            "evidenceClass": "closure-capable-comparator-refresh",
            "validAs": ["BT93M.3 comparator refresh"],
            "invalidAs": ["candidate/freeze evidence", "promotion evidence"],
            "resultClass": precomparison.get("resultClass"),
        },
        {
            "id": "BT93M.HOLDOUT_LINEAGE",
            "artifact": _rel(HOLDOUT_LINEAGE_PATH),
            "evidenceClass": "closure-capable-lineage-policy",
            "validAs": ["diagnosis/freeze holdout separation"],
            "invalidAs": ["holdout result", "freeze candidate result"],
            "resultClass": holdout_lineage.get("resultClass"),
        },
        {
            "id": "BT93M.COMPARISON_POLICY",
            "artifact": _rel(COMPARISON_POLICY_DECISION_PATH),
            "evidenceClass": "closure-capable-policy-decision",
            "validAs": ["BT93P/BT94A blocking policy"],
            "invalidAs": ["positive DQN anchor"],
            "resultClass": comparison_policy.get("resultClass"),
        },
        {
            "id": "BT93M.QUARANTINE",
            "artifact": _rel(EVIDENCE_QUARANTINE_PATH),
            "evidenceClass": "context-only-quarantine-policy",
            "validAs": ["exclusion policy"],
            "invalidAs": [
                "closure evidence for BT93M.3",
                "baseline",
                "candidate",
                "freeze",
                "holdout",
                "PPO-Validate",
                "BT94A-ready",
            ],
            "resultClass": _read_json(EVIDENCE_QUARANTINE_PATH).get("resultClass"),
        },
    ]
    return {
        "schemaVersion": "bt93m-evidence-quality-matrix-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_comparator_no_start_refresh.py",
        "blockId": "BT93M",
        "phaseId": "93M.3.2",
        "resultClass": "evidence-quality-red-diagnose-only",
        "summary": {
            "rowCount": len(rows),
            "bt94a-blocker": len(blockers),
            "closureCapableRows": sum(1 for row in rows if str(row.get("evidenceClass", "")).startswith("closure-capable")),
            "contextOnlyRows": sum(1 for row in rows if "context-only" in str(row.get("evidenceClass", ""))),
            "candidateEvidenceRows": 0,
            "freezeEvidenceRows": 0,
            "holdoutEvidenceRows": 0,
            "ppoValidateEvidenceRows": 0,
        },
        "rows": rows,
        "auditRegister": blockers,
        "qualityRules": {
            "tmpOnlyEvidenceCanClose": False,
            "historicalDqnReportsCanAnchorSameMatrix": False,
            "quarantinedUserOwnedSideLaneCanClose": False,
            "microPpoSignalCanOpenBt94a": False,
            "bt94aReadyRequiresNonBlockingComparisonPolicy": True,
        },
        "nextAllowedActions": [
            "BT93N diagnose-only root-cause work after BT93M.99",
            "separate DQN loader fix or explicit user replacement-policy decision",
        ],
        "blockedActions": FORBIDDEN_ACTIONS,
        "sourceArtifacts": _source_artifacts(),
        "phaseCoverage": {
            "93M.3.2": True,
        },
    }


def build_handover_package(
    precomparison: Mapping[str, Any],
    evidence_matrix: Mapping[str, Any],
    holdout_lineage: Mapping[str, Any],
    comparison_policy: Mapping[str, Any],
) -> dict[str, Any]:
    blockers = _open_blockers()
    bt94a_handover = _bt94a_handover(blockers)
    return {
        "schemaVersion": "bt93m-handover-package-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_comparator_no_start_refresh.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93M",
        "phaseId": "93M.3",
        "resultClass": "gate-fresh-dqn-anchor-blocked",
        "currentHandoverSource": {
            "blockId": "BT93M",
            "phaseId": "93M.3",
            "sourceArtifact": _rel(HANDOVER_PACKAGE_PATH),
            "resultField": "resultClass",
            "resultClass": "gate-fresh-dqn-anchor-blocked",
            "fresh": True,
        },
        "bt94aHandover": bt94a_handover,
        "comparisonPolicyDecision": comparison_policy.get("comparisonPolicyDecision"),
        "precomparisonRefresh": {
            "path": _rel(PRECOMPARISON_REFRESH_PATH),
            "resultClass": precomparison.get("resultClass"),
            "matrixId": _get(precomparison, "matrix", "matrixId"),
            "matrixHash": precomparison.get("matrixHash"),
        },
        "evidenceQuality": {
            "path": _rel(EVIDENCE_QUALITY_MATRIX_PATH),
            "resultClass": evidence_matrix.get("resultClass"),
            "bt94aBlockerCount": _get(evidence_matrix, "summary", "bt94a-blocker"),
        },
        "holdoutLineage": {
            "path": _rel(HOLDOUT_LINEAGE_PATH),
            "resultClass": holdout_lineage.get("resultClass"),
            "reservedFreezeSeeds": _get(holdout_lineage, "freezeHoldoutReservation", "reservedFreezeSeeds"),
            "usedInBt93m": _get(holdout_lineage, "freezeHoldoutReservation", "usedInBt93m"),
        },
        "blockers": blockers,
        "summary": {
            "sameMatrixDqnAnchorPresent": _read_json(DQN_ANCHOR_REPORT_PATH).get("sameMatrixDqnAnchorPresent"),
            "comparisonPolicyDecision": comparison_policy.get("comparisonPolicyDecision"),
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "matrixDefinitionAllowed": False,
            "holdoutUsed": False,
            "nextStep": "BT93N diagnose-only or separate DQN loader/user replacement-policy decision",
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "qualityClaimAllowed": False,
        },
        "forbiddenResultTerms": {
            "candidate": False,
            "freeze": False,
            "promote": False,
            "rollout-ready": False,
            "BT95-Handoff-ready": False,
        },
        "nextAllowedActions": [
            "BT93N diagnose-only root-cause work after BT93M.99",
            "DQN loader-fix block",
            "explicit user replacement-policy decision",
            "stop as dqn-anchor-blocked",
        ],
        "blockedActions": FORBIDDEN_ACTIONS,
        "sourceArtifacts": {
            **_source_artifacts(),
            "precomparisonRefreshReport": _source(PRECOMPARISON_REFRESH_PATH, "BT93M.3 precomparison refresh"),
            "evidenceQualityMatrix": _source(EVIDENCE_QUALITY_MATRIX_PATH, "BT93M.3 evidence quality matrix"),
            "holdoutLineageReport": _source(HOLDOUT_LINEAGE_PATH, "BT93M.3 holdout lineage"),
            "comparisonPolicyDecision": _source(COMPARISON_POLICY_DECISION_PATH, "BT93M.3 comparison policy"),
        },
        "phaseCoverage": {
            "93M.3.3": True,
            "93M.3.4": True,
        },
    }


def build_reports() -> dict[str, dict[str, Any]]:
    precomparison = build_precomparison_refresh_report()
    holdout_lineage = build_holdout_lineage_report()
    comparison_policy = build_comparison_policy_decision()
    evidence_matrix = build_evidence_quality_matrix(precomparison, holdout_lineage, comparison_policy)
    handover = build_handover_package(precomparison, evidence_matrix, holdout_lineage, comparison_policy)
    return {
        "precomparisonRefresh": precomparison,
        "evidenceQualityMatrix": evidence_matrix,
        "holdoutLineage": holdout_lineage,
        "comparisonPolicyDecision": comparison_policy,
        "handoverPackage": handover,
    }


def main() -> int:
    global BT93M_ROOT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93M_ROOT)
    args = parser.parse_args()

    BT93M_ROOT = args.output_root.resolve()
    reports = build_reports()
    outputs = {
        "precomparisonRefresh": PRECOMPARISON_REFRESH_PATH,
        "evidenceQualityMatrix": EVIDENCE_QUALITY_MATRIX_PATH,
        "holdoutLineage": HOLDOUT_LINEAGE_PATH,
        "comparisonPolicyDecision": COMPARISON_POLICY_DECISION_PATH,
        "handoverPackage": HANDOVER_PACKAGE_PATH,
    }
    if args.write_report:
        for key in ("precomparisonRefresh", "evidenceQualityMatrix", "holdoutLineage", "comparisonPolicyDecision"):
            _write_json(outputs[key], reports[key])
        reports["handoverPackage"] = build_handover_package(
            reports["precomparisonRefresh"],
            reports["evidenceQualityMatrix"],
            reports["holdoutLineage"],
            reports["comparisonPolicyDecision"],
        )
        _write_json(outputs["handoverPackage"], reports["handoverPackage"])

    summary = {
        "ok": all(bool(report.get("ok")) for report in reports.values()),
        "resultClass": reports["handoverPackage"]["resultClass"],
        "comparisonPolicyDecision": reports["comparisonPolicyDecision"]["comparisonPolicyDecision"],
        "bt94aClaimAllowed": reports["handoverPackage"]["bt94aHandover"]["claimable"],
        "phaseCoverage": {
            "93M.3.1": reports["precomparisonRefresh"]["phaseCoverage"]["93M.3.1"],
            "93M.3.2": reports["evidenceQualityMatrix"]["phaseCoverage"]["93M.3.2"],
            "93M.3.3": reports["handoverPackage"]["phaseCoverage"]["93M.3.3"],
            "93M.3.4": reports["handoverPackage"]["phaseCoverage"]["93M.3.4"],
            "93M.3.5": reports["holdoutLineage"]["phaseCoverage"]["93M.3.5"],
            "93M.3.6": reports["comparisonPolicyDecision"]["phaseCoverage"]["93M.3.6"],
        },
        "outputs": {key: _rel(path) for key, path in outputs.items()},
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
