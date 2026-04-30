"""BT93Y.4 replacement comparison policy lock.

This phase turns the already user-owned UOD-2 decision into machine-readable
evidence for later BT93X/BT93P starttruth. It does not run training, eval,
holdout, candidate, freeze, runtime, rollout, or PPO-Validate work.
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
BT93X_ROOT = PPO_ROOT / "bt93x"
BT93Y_ROOT = PPO_ROOT / "bt93y"

DECISION_PATH = BT93X_ROOT / "replacement_policy_decision.json"
LOCK_REPORT_PATH = BT93Y_ROOT / "replacement_policy_lock_report.json"

BT93Y_DECISION_LOCK_PATH = BT93Y_ROOT / "lineage_recovery_decision_lock.json"
EXACT_LINEAGE_MANIFEST_PATH = BT93Y_ROOT / "exact_lineage_manifest.json"
RETRAIN_LINEAGE_MANIFEST_PATH = BT93Y_ROOT / "retrain_lineage_manifest.json"
BT93X0_PREFLIGHT_PATH = BT93X_ROOT / "early_comparator_preflight_report.json"
BT93L_TASK_METRIC_CONTRACT_PATH = PPO_ROOT / "bt93l" / "task_metric_contract.json"
BT93L_BASELINE_MATRIX_PATH = PPO_ROOT / "bt93l" / "baseline_matrix_report.json"
BT93M_COMPARISON_DECISION_PATH = PPO_ROOT / "bt93m" / "comparison_policy_decision.json"
BT94A_NO_START_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"

HISTORICAL_REPORT_PATHS = [
    REPO_ROOT / "data" / "bot_validation_report.json",
    REPO_ROOT / "data" / "performance_ki_baseline_report.json",
]

REPLACEMENT_POLICY_ID = "bt93x-rcp1-same-matrix-control-suite-no-bt11"
MISSING_DQN_ANCHOR = "BT11-same-matrix-DQN-anchor"

REQUIRED_CONTROL_POLICIES = [
    "noop",
    "random",
    "semantic-cycle",
    "scripted-reachability",
]

FORBIDDEN_USES = [
    "candidate",
    "freeze",
    "holdout-consumption",
    "promote",
    "rollout",
    "DQN sunset",
    "productive handoff",
    "PPO-Validate",
    "BT95 handoff",
]

BLOCKED_ACTIONS = [
    "BT93R-Reentry before BT93Y.99",
    "BT93S claim",
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
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
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


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return sha256(_json_text(payload).encode("utf-8")).hexdigest()


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


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _artifact(path: Path, role: str, tracked: set[str], expected: Mapping[str, Any] | None = None) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    expected_fields = dict(expected or {})
    fresh = bool(
        path.is_file()
        and rel_path in tracked
        and all(_get(payload, *key.split(".")) == value for key, value in expected_fields.items())
    )
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "fresh": fresh if expected_fields else path.is_file() and rel_path in tracked,
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "expectedFields": expected_fields,
        "actualFields": {key: _get(payload, *key.split(".")) for key in expected_fields},
    }


def _source_artifacts() -> list[dict[str, Any]]:
    sources: list[tuple[str, Path, str, Mapping[str, Any]]] = [
        (
            "bt93yDecisionLock",
            BT93Y_DECISION_LOCK_PATH,
            "BT93Y.1 user-owned lineage and replacement-policy decision lock",
            {
                "replacementPolicy.owner": "user",
                "replacementPolicy.decision": "approved",
                "replacementPolicy.policyId": REPLACEMENT_POLICY_ID,
            },
        ),
        (
            "bt93yExactLineageManifest",
            EXACT_LINEAGE_MANIFEST_PATH,
            "BT93Y.2 exact-lineage negative or restored manifest",
            {"phaseId": "93Y.2"},
        ),
        (
            "bt93yRetrainLineageManifest",
            RETRAIN_LINEAGE_MANIFEST_PATH,
            "BT93Y.3 retrain-lineage manifest",
            {"phaseId": "93Y.3", "resultClass": "retrain-lineage-ready"},
        ),
        (
            "bt93x0EarlyComparatorPreflight",
            BT93X0_PREFLIGHT_PATH,
            "BT93X.0 read-only comparator preflight",
            {"preflightField": "dqn-loader-fix-required", "comparisonPolicyDecision": "dqn-anchor-blocked"},
        ),
        (
            "bt93lTaskMetricContract",
            BT93L_TASK_METRIC_CONTRACT_PATH,
            "BT93L matrix, seed and semantic contract",
            {"resultClass": "task-metric-contract-pinned"},
        ),
        (
            "bt93lBaselineMatrix",
            BT93L_BASELINE_MATRIX_PATH,
            "BT93L baseline/control matrix context",
            {"resultClass": "baseline-matrix-frozen-dqn-anchor-missing"},
        ),
        (
            "bt93mComparisonPolicyDecision",
            BT93M_COMPARISON_DECISION_PATH,
            "BT93M DQN-anchor blocked decision",
            {"comparisonPolicyDecision": "dqn-anchor-blocked"},
        ),
        (
            "bt94aNoStartGate",
            BT94A_NO_START_PATH,
            "BT94A no-start gate remains red",
            {"claimable": False, "candidateRunsAllowed": False, "matrixDefinitionAllowed": False},
        ),
    ]
    tracked = _tracked_files([path for _, path, _, _ in sources] + HISTORICAL_REPORT_PATHS)
    artifacts = [
        {"sourceKey": key, **_artifact(path, role, tracked, expected)}
        for key, path, role, expected in sources
    ]
    artifacts.extend(
        {
            "sourceKey": f"historicalContext{index}",
            **_artifact(path, "historical DQN/bot report; context-only", tracked, {}),
            "sameMatrixUse": "forbidden-context-only",
        }
        for index, path in enumerate(HISTORICAL_REPORT_PATHS, start=1)
    )
    return artifacts


def _claim_flags() -> dict[str, bool]:
    return {
        "bt93rReentryAllowed": False,
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


def _guardrails() -> dict[str, Any]:
    return {
        "trainingStarted": False,
        "newEvalRunStarted": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "bt95HandoffSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        **_claim_flags(),
    }


def _active_lineage(exact_manifest: Mapping[str, Any], retrain_manifest: Mapping[str, Any]) -> dict[str, Any]:
    exact_restored = exact_manifest.get("resultClass") in {
        "exact-bt93n-lineage-restored",
        "exact-lineage-restored",
        "exact-lineage-restored-bt93r-reentry-ready",
    }
    retrain_ready = retrain_manifest.get("resultClass") == "retrain-lineage-ready"
    if exact_restored:
        return {
            "lineageId": exact_manifest.get("lineageId") or "bt93n-exact-lineage",
            "lineageKind": "exact-bt93n-lineage-restored",
            "policyId": "recovered-bt93n-ppo-lineage",
            "sourcePath": _rel(EXACT_LINEAGE_MANIFEST_PATH),
            "sourceResultClass": exact_manifest.get("resultClass"),
            "ready": True,
        }
    return {
        "lineageId": retrain_manifest.get("lineageId"),
        "lineageKind": retrain_manifest.get("lineageKind"),
        "policyId": retrain_manifest.get("lineageId") or "bt93y-retrained-ppo-lineage",
        "sourcePath": _rel(RETRAIN_LINEAGE_MANIFEST_PATH),
        "sourceResultClass": retrain_manifest.get("resultClass"),
        "ready": retrain_ready,
    }


def _minimum_statistics(task_contract: Mapping[str, Any]) -> dict[str, Any]:
    matrix = task_contract.get("matrix") if isinstance(task_contract.get("matrix"), Mapping) else {}
    episode = matrix.get("episode") if isinstance(matrix.get("episode"), Mapping) else {}
    evaluation = matrix.get("evaluation") if isinstance(matrix.get("evaluation"), Mapping) else {}
    seeds = matrix.get("seeds") if isinstance(matrix.get("seeds"), Mapping) else {}
    return {
        "lockedBeforeRun": True,
        "postHocThresholdChangeInvalidates": True,
        "matrixIdRequired": True,
        "matrixHashRequired": True,
        "semanticWindowRequired": True,
        "actionSurfaceIdRequired": True,
        "rewardProfileIdRequired": True,
        "comparisonSeeds": seeds.get("diagnosticEvalSeeds") or seeds.get("controlSeeds") or [944, 945, 946],
        "reservedFreezeHoldoutSeeds": seeds.get("holdoutSeeds") or [960, 961],
        "holdoutLineage": {
            "diagnosticComparisonMayUsePinnedComparisonSeeds": True,
            "freezeHoldoutStatus": seeds.get("holdoutStatus") or "reserved-unused",
            "freezeHoldoutConsumptionAllowed": False,
            "noPostHoldoutOptimizationRequired": True,
        },
        "minCompletedEpisodesPerPolicy": (
            evaluation.get("evalMinCompletedEpisodes")
            or episode.get("minimumCompletedEpisodesForRead")
            or 15
        ),
        "medianRequired": True,
        "iqrRequired": True,
        "minimumDeltas": {
            "medianStepsPerEpisodeRelativeVsSimpleControls": 0.30,
            "objectiveEventCountAbsoluteVsNoop": 1,
            "deathBefore60RateRegressionAllowed": 0.0,
            "randomOrSemanticCycleMayNotMeetOrExceedPpoOnRequiredMetrics": True,
            "noopMustRemainNonSuccess": True,
        },
        "requiredMetrics": [
            "avgStepsPerEpisode",
            "medianStepsPerEpisode",
            "iqrStepsPerEpisode",
            "deathBefore60Rate",
            "objectiveEventCount",
            "progressEventCount",
            "naturalTerminalCount",
            "runtimeErrorCount",
            "invalidActionRate",
        ],
    }


def _invalidations() -> list[dict[str, str]]:
    return [
        {"id": "historical-dqn-used-as-anchor", "resultClass": "measurement-invalid"},
        {"id": "missing-matrix-id-or-hash", "resultClass": "comparison-policy-not-ready"},
        {"id": "missing-semantic-window-action-surface-or-reward-profile", "resultClass": "comparison-policy-not-ready"},
        {"id": "missing-seeds-episodes-median-iqr-or-minimum-delta", "resultClass": "comparison-policy-not-ready"},
        {"id": "sample-count-below-minimum", "resultClass": "comparison-policy-not-ready"},
        {"id": "random-or-semantic-cycle-parity-with-ppo-or-scripted", "resultClass": "measurement-invalid"},
        {"id": "noop-success-or-noop-not-clearly-worse", "resultClass": "measurement-invalid"},
        {"id": "post-hoc-threshold-change", "resultClass": "measurement-invalid"},
        {"id": "freeze-holdout-consumed-or-optimized-against", "resultClass": "measurement-invalid"},
        {"id": "candidate-freeze-promote-rollout-or-dqn-sunset-wording", "resultClass": "measurement-invalid"},
    ]


def build_decision() -> dict[str, Any]:
    decision_lock = _read_json(BT93Y_DECISION_LOCK_PATH)
    exact_manifest = _read_json(EXACT_LINEAGE_MANIFEST_PATH)
    retrain_manifest = _read_json(RETRAIN_LINEAGE_MANIFEST_PATH)
    task_contract = _read_json(BT93L_TASK_METRIC_CONTRACT_PATH)
    bt93x0 = _read_json(BT93X0_PREFLIGHT_PATH)
    active_lineage = _active_lineage(exact_manifest, retrain_manifest)
    matrix_id = retrain_manifest.get("matrixId") or bt93x0.get("matrixId")
    matrix_hash = retrain_manifest.get("matrixHash") or bt93x0.get("matrixHash")
    semantic_window = retrain_manifest.get("semanticWindow") or bt93x0.get("semanticWindow")
    action_surface = retrain_manifest.get("actionSurface") if isinstance(retrain_manifest.get("actionSurface"), Mapping) else {}
    policy_ids = [*REQUIRED_CONTROL_POLICIES, active_lineage["policyId"]]

    return {
        "schemaVersion": "bt93x-replacement-policy-decision-v1",
        "blockId": "BT93X",
        "phaseId": "93Y.4",
        "ok": True,
        "resultClass": "replacement-policy-approved",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_replacement_policy_lock.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "owner": "user",
        "decisionId": "UOD-2",
        "decision": "approved",
        "approved": True,
        "policyId": REPLACEMENT_POLICY_ID,
        "replaces": MISSING_DQN_ANCHOR,
        "replacementReason": "BT11/DQN same-matrix checkpoint is absent or not loadable; historical reports are context-only.",
        "scope": {
            "allowedFor": ["BT93X starttruth", "BT93P starttruth"],
            "forbiddenFor": list(FORBIDDEN_USES),
            "fullBt93xMayUseAfter": [
                "BT93Y.99 green",
                "BT93R-Reentry.99 in R-Allowlist",
                "BT93W.99=bt93o-precondition-green",
                "BT93O.99=bt93o-quality-green",
            ],
            "bt93pMayUseAfter": [
                "BT93X.99=bt93p-starttruth-green",
                "pinned statistics contract remains unchanged",
            ],
        },
        "comparisonPolicy": {
            "policyIds": policy_ids,
            "requiredControlPolicies": list(REQUIRED_CONTROL_POLICIES),
            "ppoLineagePolicyId": active_lineage["policyId"],
            "activeLineage": active_lineage,
            "scriptedReachabilityRole": "task-sanity-control-not-historical-champion",
            "orderingRules": [
                "noop must remain non-success and clearly worse than controlled progress policies",
                "random and semantic-cycle must not match or exceed PPO or scripted-reachability on required metrics",
                "scripted-reachability proves task reachability only and does not replace a champion DQN",
            ],
        },
        "matrixContract": {
            "matrixId": matrix_id,
            "matrixHash": matrix_hash,
            "semanticWindow": semantic_window,
            "actionSurfaceId": action_surface.get("surfaceId"),
            "rewardProfileId": retrain_manifest.get("rewardProfileId"),
        },
        "statisticsContract": _minimum_statistics(task_contract),
        "historicalEvidencePolicy": {
            "historicalDqnBotReportsUse": "context-only",
            "historicalReportsUsedAsSameMatrixAnchor": False,
            "reports": [
                {
                    "path": _rel(path),
                    "exists": path.is_file(),
                    "sha256": _sha256_file(path),
                    "sameMatrixUse": "forbidden-context-only",
                }
                for path in HISTORICAL_REPORT_PATHS
            ],
        },
        "invalidations": _invalidations(),
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "steps": 0,
            "notApplicableReason": "93Y.4 is a user-owned comparison-policy lock without training, eval or holdout samples.",
        },
        "guardrails": _guardrails(),
        "claimFlags": _claim_flags(),
        "allowNext": [
            "93Y.5 BT93R-Reentry package",
            "later full BT93X only after BT93O.99=bt93o-quality-green and all R-X dependencies are green",
        ],
        "blocksNext": list(BLOCKED_ACTIONS),
        "summary": {
            "replacementPolicyApproved": True,
            "sameMatrixDqnAnchorPresent": False,
            "historicalReportsContextOnly": True,
            "activeLineageReady": active_lineage["ready"],
            "nextBestAction": "Run 93Y.5; do not start BT93R-Reentry/S/O/P/94A yet.",
        },
        "sourceDecision": {
            "path": _rel(BT93Y_DECISION_LOCK_PATH),
            "owner": _get(decision_lock, "replacementPolicy", "owner"),
            "decision": _get(decision_lock, "replacementPolicy", "decision"),
            "policyId": _get(decision_lock, "replacementPolicy", "policyId"),
        },
    }


def build_lock_report(decision: Mapping[str, Any]) -> dict[str, Any]:
    source_artifacts = _source_artifacts()
    decision_policy = decision.get("policyId") == REPLACEMENT_POLICY_ID
    source_ready = all(item["exists"] and item["isFile"] and item["tracked"] and item["fresh"] for item in source_artifacts[:8])
    matrix_contract = decision.get("matrixContract") if isinstance(decision.get("matrixContract"), Mapping) else {}
    statistics_contract = decision.get("statisticsContract") if isinstance(decision.get("statisticsContract"), Mapping) else {}
    historical_policy = decision.get("historicalEvidencePolicy") if isinstance(decision.get("historicalEvidencePolicy"), Mapping) else {}
    phase_coverage = {
        "93Y.4.1": (
            decision.get("owner") == "user"
            and decision.get("decision") == "approved"
            and decision_policy
            and decision.get("replaces") == MISSING_DQN_ANCHOR
        ),
        "93Y.4.2": all(not value for value in _claim_flags().values())
        and "candidate" in decision.get("scope", {}).get("forbiddenFor", []),
        "93Y.4.3": set(REQUIRED_CONTROL_POLICIES).issubset(
            set(decision.get("comparisonPolicy", {}).get("policyIds", []))
        )
        and bool(decision.get("comparisonPolicy", {}).get("activeLineage", {}).get("ready")),
        "93Y.4.4": all(
            bool(matrix_contract.get(key))
            for key in ("matrixId", "matrixHash", "semanticWindow", "actionSurfaceId", "rewardProfileId")
        )
        and bool(statistics_contract.get("lockedBeforeRun"))
        and bool(statistics_contract.get("medianRequired"))
        and bool(statistics_contract.get("iqrRequired"))
        and bool(statistics_contract.get("minimumDeltas")),
        "93Y.4.5": historical_policy.get("historicalDqnBotReportsUse") == "context-only"
        and historical_policy.get("historicalReportsUsedAsSameMatrixAnchor") is False,
    }
    ok = source_ready and all(phase_coverage.values())
    result_class = "replacement-policy-approved" if ok else "replacement-policy-decision-missing"
    decision_artifact = {
        "path": _rel(DECISION_PATH),
        "role": "BT93X replacement policy decision generated by BT93Y.4",
        "schemaVersion": decision.get("schemaVersion"),
        "blockId": decision.get("blockId"),
        "phaseId": decision.get("phaseId"),
        "resultClass": decision.get("resultClass"),
        "ok": decision.get("ok"),
        "sha256": _sha256_payload(decision),
        "trackedAfterCommitRequired": True,
    }
    return {
        "schemaVersion": "bt93y-replacement-policy-lock-report-v1",
        "blockId": "BT93Y",
        "phaseId": "93Y.4",
        "ok": ok,
        "resultClass": result_class,
        "generatedAt": decision.get("generatedAt") or _utc_now(),
        "generatedBy": "python/scripts/bt93y_replacement_policy_lock.py",
        "git": decision.get("git"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_ready,
        "decisionArtifact": decision_artifact,
        "phaseCoverage": phase_coverage,
        "dodCoverage": {
            "DoD.Y5": all(phase_coverage.values()),
            "DoD.Y7": all(value is False for value in _claim_flags().values()),
        },
        "replacementPolicy": {
            "owner": decision.get("owner"),
            "decision": decision.get("decision"),
            "policyId": decision.get("policyId"),
            "replaces": decision.get("replaces"),
            "scope": decision.get("scope"),
        },
        "comparisonPolicy": decision.get("comparisonPolicy"),
        "matrixContract": decision.get("matrixContract"),
        "statisticsContract": decision.get("statisticsContract"),
        "historicalEvidencePolicy": decision.get("historicalEvidencePolicy"),
        "invalidations": decision.get("invalidations"),
        "sampleCounts": decision.get("sampleCounts"),
        "guardrails": decision.get("guardrails"),
        "claimFlags": decision.get("claimFlags"),
        "allowNext": ["93Y.5 BT93R-Reentry package"],
        "blocksNext": list(BLOCKED_ACTIONS),
        "summary": {
            "replacementPolicyApproved": ok,
            "resultClass": result_class,
            "nextBestAction": "Run 93Y.5; BT93R-Reentry remains blocked until BT93Y.99.",
            "bt93sBlocked": True,
            "bt93oBlocked": True,
            "bt93pBlocked": True,
            "bt94aBlocked": True,
        },
        "commands": {
            "write": "python python/scripts/bt93y_replacement_policy_lock.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--decision-output", type=Path, default=DECISION_PATH)
    parser.add_argument("--lock-output", type=Path, default=LOCK_REPORT_PATH)
    args = parser.parse_args()

    decision = build_decision()
    lock_report = build_lock_report(decision)

    if args.write_reports:
        _write_json(args.decision_output.resolve(), decision)
        _write_json(args.lock_output.resolve(), lock_report)

    print(
        json.dumps(
            {
                "ok": lock_report["ok"],
                "resultClass": lock_report["resultClass"],
                "phaseCoverage": lock_report["phaseCoverage"],
                "allowNext": lock_report["allowNext"],
                "blockedCount": len(lock_report["blocksNext"]),
                "decisionOutput": _rel(args.decision_output.resolve()),
                "lockOutput": _rel(args.lock_output.resolve()),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if lock_report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
