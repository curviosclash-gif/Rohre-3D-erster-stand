"""BT93Y.5 BT93R-Reentry package.

This phase prepares the next BT93R-Reentry as a diagnostic package only. It
does not start the reentry, run training/eval/holdout work, apply fixes, or
open BT93S/O/P/94A.
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
BT93X_ROOT = PPO_ROOT / "bt93x"
BT93Y_ROOT = PPO_ROOT / "bt93y"

EXACT_LINEAGE_MANIFEST_PATH = BT93Y_ROOT / "exact_lineage_manifest.json"
RETRAIN_LINEAGE_MANIFEST_PATH = BT93Y_ROOT / "retrain_lineage_manifest.json"
RETRAIN_LOADER_SMOKE_PATH = BT93Y_ROOT / "retrain_loader_smoke_report.json"
RETRAIN_POLICY_PROBE_PATH = BT93Y_ROOT / "retrain_policy_probe_report.json"
REPLACEMENT_POLICY_LOCK_PATH = BT93Y_ROOT / "replacement_policy_lock_report.json"
REPLACEMENT_POLICY_DECISION_PATH = BT93X_ROOT / "replacement_policy_decision.json"
BT93R_CLOSURE_PATH = BT93R_ROOT / "bt93r_closure_gate_report.json"
BT93R_POLICY_ARTIFACT_PATH = BT93R_ROOT / "policy_artifact_report.json"
BT93X0_PREFLIGHT_PATH = BT93X_ROOT / "early_comparator_preflight_report.json"

REENTRY_MANIFEST_PATH = BT93Y_ROOT / "bt93r_reentry_manifest.json"
REENTRY_GATE_REPORT_PATH = BT93Y_ROOT / "bt93r_reentry_gate_report.json"

EXACT_READY_CLASSES = {
    "exact-bt93n-lineage-restored",
    "exact-lineage-restored",
    "exact-lineage-restored-bt93r-reentry-ready",
}
RETRAIN_READY_CLASS = "retrain-lineage-ready"
REPLACEMENT_POLICY_ID = "bt93x-rcp1-same-matrix-control-suite-no-bt11"

REENTRY_STAGES = [
    {
        "id": "artifact-probe",
        "order": 1,
        "purpose": "Load the active lineage package and verify model, normalizer, config, optimizer and action-surface hashes.",
        "fixWorkAllowed": False,
        "requiredOutput": "BT93R-Reentry artifact-probe report with concrete package/loader status.",
    },
    {
        "id": "root-cause",
        "order": 2,
        "purpose": "Classify the deterministic-collapse/root-cause signature against BT93N/Q/R evidence.",
        "fixWorkAllowed": False,
        "requiredOutput": "BT93R-Reentry root-cause report naming one concrete fix class or a red blocker.",
    },
    {
        "id": "counterprobe",
        "order": 3,
        "purpose": "Run only the counterprobe enabled by the named fix class; no broad repair bundle is allowed.",
        "fixWorkAllowed": "only-after-root-cause-fix-class",
        "requiredOutput": "BT93R-Reentry.99 in R-Allowlist or a concrete red blocker.",
    },
]

BLOCKED_ACTIONS = [
    "BT93R-Reentry claim before BT93Y.99",
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
]

FORBIDDEN_SIGNAL_FLAGS = {
    "candidateRun": False,
    "candidateFreezeAllowed": False,
    "freezeCandidate": False,
    "holdoutConsumptionAllowed": False,
    "holdoutUsed": False,
    "promoteAllowed": False,
    "promotionAllowed": False,
    "rolloutAllowed": False,
    "ppoValidateSignal": False,
    "bt95HandoffSignal": False,
    "productiveRuntimeChanged": False,
}


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
    expected_ok = all(_get(payload, *key.split(".")) == value for key, value in expected_fields.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and tracked_ok and expected_ok),
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
            "bt93yExactLineageManifest",
            EXACT_LINEAGE_MANIFEST_PATH,
            "BT93Y.2 exact-lineage manifest",
            {"phaseId": "93Y.2"},
        ),
        (
            "bt93yRetrainLineageManifest",
            RETRAIN_LINEAGE_MANIFEST_PATH,
            "BT93Y.3 retrain-lineage manifest",
            {"phaseId": "93Y.3"},
        ),
        (
            "bt93yRetrainLoaderSmoke",
            RETRAIN_LOADER_SMOKE_PATH,
            "BT93Y.3 retrain loader smoke",
            {"phaseId": "93Y.3", "resultClass": "retrain-loader-smoke-green"},
        ),
        (
            "bt93yRetrainPolicyProbe",
            RETRAIN_POLICY_PROBE_PATH,
            "BT93Y.3 retrain policy probe",
            {"phaseId": "93Y.3", "resultClass": "retrain-lineage-ready"},
        ),
        (
            "bt93yReplacementPolicyLock",
            REPLACEMENT_POLICY_LOCK_PATH,
            "BT93Y.4 replacement-policy lock",
            {"phaseId": "93Y.4", "resultClass": "replacement-policy-approved"},
        ),
        (
            "bt93xReplacementPolicyDecision",
            REPLACEMENT_POLICY_DECISION_PATH,
            "BT93X replacement-policy decision from BT93Y.4",
            {"phaseId": "93Y.4", "resultClass": "replacement-policy-approved"},
        ),
        (
            "bt93rClosureGate",
            BT93R_CLOSURE_PATH,
            "Historical BT93R.99 red closure",
            {"phaseId": "93R.99", "resultClass": "model-artifact-missing"},
        ),
        (
            "bt93rPolicyArtifact",
            BT93R_POLICY_ARTIFACT_PATH,
            "Historical BT93R artifact blocker",
            {"phaseId": "93R.2", "resultClass": "policy-evidence-invalid"},
        ),
        (
            "bt93x0EarlyComparatorPreflight",
            BT93X0_PREFLIGHT_PATH,
            "BT93X.0 read-only comparator preflight",
            {"phaseId": "93X.0", "comparisonPolicyDecision": "dqn-anchor-blocked"},
        ),
    ]
    tracked = _tracked_files([path for _, path, _, _ in sources])
    return [{"sourceKey": key, **_artifact(path, role, tracked, expected)} for key, path, role, expected in sources]


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
        "runtimeSurfacesTouched": [],
        **FORBIDDEN_SIGNAL_FLAGS,
        **_claim_flags(),
    }


def _active_lineage(exact_manifest: Mapping[str, Any], retrain_manifest: Mapping[str, Any]) -> dict[str, Any]:
    exact_ready = exact_manifest.get("resultClass") in EXACT_READY_CLASSES
    retrain_ready = retrain_manifest.get("resultClass") == RETRAIN_READY_CLASS
    active_count = int(exact_ready) + int(retrain_ready)

    if exact_ready:
        return {
            "activeCount": active_count,
            "sourceKind": "exact-bt93n-lineage-restored",
            "sourcePath": _rel(EXACT_LINEAGE_MANIFEST_PATH),
            "sourceResultClass": exact_manifest.get("resultClass"),
            "lineageId": exact_manifest.get("lineageId") or "exact-bt93n-lineage",
            "lineageKind": exact_manifest.get("lineageKind") or "exact-bt93n-lineage-restored",
            "policyId": exact_manifest.get("lineageId") or "exact-bt93n-lineage",
            "notBt93nLineage": False,
            "ready": active_count == 1,
            "modelPackage": exact_manifest.get("modelPackage"),
        }

    return {
        "activeCount": active_count,
        "sourceKind": "retrain-lineage-ready",
        "sourcePath": _rel(RETRAIN_LINEAGE_MANIFEST_PATH),
        "sourceResultClass": retrain_manifest.get("resultClass"),
        "lineageId": retrain_manifest.get("lineageId"),
        "lineageKind": retrain_manifest.get("lineageKind"),
        "policyId": retrain_manifest.get("lineageId") or "bt93y-retrain-lineage-v1",
        "notBt93nLineage": True,
        "ready": active_count == 1 and retrain_ready,
        "modelPackage": retrain_manifest.get("modelPackage"),
        "loaderSmokeReport": retrain_manifest.get("loaderSmokeReport"),
        "policyProbeReport": retrain_manifest.get("policyProbeReport"),
        "packageManifest": retrain_manifest.get("packageManifest"),
    }


def _final_result_class(active_lineage: Mapping[str, Any]) -> str:
    if not active_lineage.get("ready"):
        return "bt93r-reentry-blocked"
    if active_lineage.get("sourceKind") == "exact-bt93n-lineage-restored":
        return "exact-lineage-restored-bt93r-reentry-ready"
    if active_lineage.get("sourceKind") == "retrain-lineage-ready":
        return "retrain-lineage-ready-bt93r-reentry-ready"
    return "bt93r-reentry-blocked"


def _reentry_plan() -> dict[str, Any]:
    return {
        "targetBlock": "BT93R-Reentry",
        "allowedOnlyAfter": ["BT93Y.99 green with bt93rReentryAllowed=true"],
        "historicalBt93rStatus": "BT93R.99 remains red as model-artifact-missing",
        "stages": REENTRY_STAGES,
        "stageOrder": [stage["id"] for stage in REENTRY_STAGES],
        "forbiddenDuringReentryPlanning": [
            "broad fix bundle",
            "training extension",
            "BT93S claim",
            "BT93O claim",
            "BT93P claim",
            "BT94A claim",
            "candidate/freeze/holdout/promote/rollout wording",
        ],
    }


def build_manifest() -> dict[str, Any]:
    exact_manifest = _read_json(EXACT_LINEAGE_MANIFEST_PATH)
    retrain_manifest = _read_json(RETRAIN_LINEAGE_MANIFEST_PATH)
    replacement_decision = _read_json(REPLACEMENT_POLICY_DECISION_PATH)
    source_artifacts = _source_artifacts()
    active_lineage = _active_lineage(exact_manifest, retrain_manifest)
    result_class = _final_result_class(active_lineage)
    source_ready = all(item["exists"] and item["isFile"] and item["tracked"] and item["fresh"] for item in source_artifacts)
    matrix_contract = replacement_decision.get("matrixContract") if isinstance(replacement_decision.get("matrixContract"), Mapping) else {}
    sample_counts = {
        "newTrainingEpisodes": 0,
        "newEvalEpisodes": 0,
        "holdoutEpisodes": 0,
        "steps": 0,
        "notApplicableReason": "93Y.5 packages a diagnostic BT93R-Reentry plan only; it does not run training, eval or holdout samples.",
    }
    guardrails = _guardrails()
    reentry_plan = _reentry_plan()
    phase_coverage = {
        "93Y.5.1": active_lineage.get("ready") is True and active_lineage.get("activeCount") == 1,
        "93Y.5.2": reentry_plan["stageOrder"] == ["artifact-probe", "root-cause", "counterprobe"],
        "93Y.5.3": all(stage["fixWorkAllowed"] is False for stage in REENTRY_STAGES[:2])
        and REENTRY_STAGES[2]["fixWorkAllowed"] == "only-after-root-cause-fix-class",
        "93Y.5.4": guardrails["bt93sClaimAllowed"] is False
        and any("BT93S claim" in action for action in BLOCKED_ACTIONS),
        "93Y.5.5": all(value is False for value in FORBIDDEN_SIGNAL_FLAGS.values()),
    }
    ok = (
        source_ready
        and replacement_decision.get("policyId") == REPLACEMENT_POLICY_ID
        and replacement_decision.get("resultClass") == "replacement-policy-approved"
        and all(phase_coverage.values())
    )
    if not ok:
        result_class = "bt93r-reentry-blocked"

    return {
        "schemaVersion": "bt93y-bt93r-reentry-manifest-v1",
        "blockId": "BT93Y",
        "phaseId": "93Y.5",
        "ok": ok,
        "resultClass": result_class,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_reentry_package.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_ready,
        "activeLineage": active_lineage,
        "replacementPolicy": {
            "policyId": replacement_decision.get("policyId"),
            "decision": replacement_decision.get("decision"),
            "owner": replacement_decision.get("owner"),
            "sourcePath": _rel(REPLACEMENT_POLICY_DECISION_PATH),
            "historicalDqnBotReportsUse": _get(
                replacement_decision,
                "historicalEvidencePolicy",
                "historicalDqnBotReportsUse",
            ),
        },
        "matrixContract": matrix_contract,
        "reentryPlan": reentry_plan,
        "fixPolicy": {
            "fixWorkAllowedBeforeNewRProbe": False,
            "fixWorkRequiresConcreteClass": True,
            "counterprobeRequiredForAnyFix": True,
            "multiFixBundleAllowed": False,
        },
        "dependencyLocks": {
            "bt93rReentryClaimAllowedBeforeBt93y99": False,
            "bt93rReentryMayOpenAfterBt93y99": ok,
            "bt93sClaimAllowedBeforeNewBt93rReentry99": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
        },
        "phaseCoverage": phase_coverage,
        "sampleCounts": sample_counts,
        "guardrails": guardrails,
        "claimFlags": _claim_flags(),
        "allowNext": ["93Y.99 closure gate"],
        "opensNext": ["93Y.99"],
        "blocksNext": list(BLOCKED_ACTIONS),
        "summary": {
            "activeLineageSource": active_lineage.get("sourceKind"),
            "bt93rReentryPackageReady": ok,
            "bt93rReentryAllowedBeforeBt93y99": False,
            "bt93rReentryAllowedAfterBt93y99": ok,
            "nextBestAction": "Run 93Y.99 closure gate; do not claim BT93R-Reentry before BT93Y.99 is green.",
        },
        "commands": {
            "write": "python python/scripts/bt93y_reentry_package.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def build_gate_report(manifest: Mapping[str, Any]) -> dict[str, Any]:
    phase_coverage = manifest.get("phaseCoverage") if isinstance(manifest.get("phaseCoverage"), Mapping) else {}
    ok = bool(manifest.get("ok")) and all(phase_coverage.values())
    result_class = manifest.get("resultClass") if ok else "bt93r-reentry-blocked"
    return {
        "schemaVersion": "bt93y-bt93r-reentry-gate-report-v1",
        "blockId": "BT93Y",
        "phaseId": "93Y.5",
        "ok": ok,
        "resultClass": result_class,
        "generatedAt": manifest.get("generatedAt") or _utc_now(),
        "generatedBy": "python/scripts/bt93y_reentry_package.py",
        "git": manifest.get("git"),
        "manifestArtifact": {
            "path": _rel(REENTRY_MANIFEST_PATH),
            "role": "BT93Y.5 BT93R-Reentry manifest",
            "schemaVersion": manifest.get("schemaVersion"),
            "blockId": manifest.get("blockId"),
            "phaseId": manifest.get("phaseId"),
            "resultClass": manifest.get("resultClass"),
            "ok": manifest.get("ok"),
            "sha256": _sha256_payload(manifest),
            "trackedAfterCommitRequired": True,
        },
        "sourceArtifacts": manifest.get("sourceArtifacts"),
        "sourceFilesReady": manifest.get("sourceFilesReady"),
        "activeLineage": manifest.get("activeLineage"),
        "reentryPlan": manifest.get("reentryPlan"),
        "phaseCoverage": phase_coverage,
        "dodCoverage": {
            "DoD.Y6-input": ok
            and result_class
            in {
                "exact-lineage-restored-bt93r-reentry-ready",
                "retrain-lineage-ready-bt93r-reentry-ready",
            },
            "DoD.Y7": all(value is False for value in FORBIDDEN_SIGNAL_FLAGS.values()),
        },
        "bt93y99ClosureInput": {
            "bt93rReentryAllowedOnClosure": ok,
            "resultClassOnClosure": result_class,
            "requiresBt93y99ClosureGates": True,
        },
        "sampleCounts": manifest.get("sampleCounts"),
        "guardrails": manifest.get("guardrails"),
        "claimFlags": manifest.get("claimFlags"),
        "allowNext": ["93Y.99 closure gate"],
        "opensNext": ["93Y.99"],
        "blocksNext": list(BLOCKED_ACTIONS),
        "summary": {
            "bt93rReentryPackageReady": ok,
            "bt93rReentryClaimAllowedNow": False,
            "bt93rReentryMayOpenAfterBt93y99": ok,
            "bt93sBlockedUntil": "BT93R-Reentry.99 in R-Allowlist",
            "candidateFreezePromoteRolloutSignals": False,
            "nextBestAction": "Close BT93Y with 93Y.99; then claim only BT93R-Reentry.",
        },
        "commands": {
            "write": "python python/scripts/bt93y_reentry_package.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--manifest-output", type=Path, default=REENTRY_MANIFEST_PATH)
    parser.add_argument("--gate-output", type=Path, default=REENTRY_GATE_REPORT_PATH)
    args = parser.parse_args()

    manifest = build_manifest()
    gate_report = build_gate_report(manifest)

    if args.write_reports:
        _write_json(args.manifest_output.resolve(), manifest)
        _write_json(args.gate_output.resolve(), gate_report)

    print(
        json.dumps(
            {
                "ok": gate_report["ok"],
                "resultClass": gate_report["resultClass"],
                "phaseCoverage": gate_report["phaseCoverage"],
                "allowNext": gate_report["allowNext"],
                "blockedCount": len(gate_report["blocksNext"]),
                "manifestOutput": _rel(args.manifest_output.resolve()),
                "gateOutput": _rel(args.gate_output.resolve()),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if gate_report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
