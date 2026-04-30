"""BT93R.2 policy artifact, logit, and normalize capability probe.

This script is report-only. It does not train, evaluate a new PPO model, apply
fixes, consume holdout data, create candidates, or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import ast
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93R_ROOT = PPO_ROOT / "bt93r"
OUTPUT_PATH = BT93R_ROOT / "policy_artifact_report.json"

SOURCE_PATHS: dict[str, tuple[Path, str]] = {
    "bt93rHandoverLock": (
        BT93R_ROOT / "bt93r_handover_lock_report.json",
        "BT93R.1 handover lock",
    ),
    "bt93qPolicyCollapse": (
        PPO_ROOT / "bt93q" / "policy_collapse_report.json",
        "BT93Q deterministic policy-collapse evidence",
    ),
    "bt93nMicroPpoRepeat": (
        PPO_ROOT / "bt93n" / "micro_ppo_repeat_report.json",
        "BT93N 10k micro-PPO source run",
    ),
    "ppoActionSurface": (
        REPO_ROOT / "python" / "envs" / "ppo_action_surface.py",
        "current PPO action-surface source",
    ),
}

CONTEXT_MODEL_PACKAGE_MANIFESTS: dict[str, tuple[Path, str]] = {
    "bt93cLatestModelPackage": (PPO_ROOT / "bt93c" / "latest_model_package.json", "BT93C context package"),
    "bt93eLatestModelPackage": (PPO_ROOT / "bt93e" / "latest_model_package.json", "BT93E context package"),
    "bt93fLatestModelPackage": (PPO_ROOT / "bt93f" / "latest_model_package.json", "BT93F context package"),
    "bt93gLatestModelPackage": (PPO_ROOT / "bt93g" / "latest_model_package.json", "BT93G context package"),
    "bt93hLatestModelPackage": (PPO_ROOT / "bt93h" / "latest_model_package.json", "BT93H context package"),
    "bt93iLatestModelPackage": (PPO_ROOT / "bt93i" / "latest_model_package.json", "BT93I context package"),
    "bt93jLatestModelPackage": (
        PPO_ROOT / "bt93j" / "latest_model_package.json",
        "BT93J user-owned diagnostic context package",
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


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _repo_path(value: Any) -> Path | None:
    if not isinstance(value, str) or not value.strip():
        return None
    path = Path(value)
    return path if path.is_absolute() else REPO_ROOT / path


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
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


def _number(value: Any, fallback: float | None = None) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _artifact(path: Path | None, role: str, tracked: set[str], *, key: str | None = None) -> dict[str, Any]:
    rel_path = _rel(path)
    payload = _read_json(path) if path is not None and path.suffix == ".json" else {}
    return {
        "key": key,
        "path": rel_path,
        "role": role,
        "exists": bool(path and path.exists()),
        "isFile": bool(path and path.is_file()),
        "tracked": rel_path in tracked if rel_path else False,
        "sizeBytes": path.stat().st_size if path is not None and path.is_file() else None,
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _literal_assignment(path: Path, name: str) -> Any:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (OSError, SyntaxError):
        return None
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(target, ast.Name) and target.id == name for target in node.targets):
            continue
        try:
            return ast.literal_eval(node.value)
        except (ValueError, SyntaxError):
            return None
    return None


def _current_action_surface(path: Path, tracked: set[str]) -> dict[str, Any]:
    semantic_actions = _literal_assignment(path, "MASKED_SEMANTIC_ACTIONS") or ()
    actions = [str(item[0]) for item in semantic_actions if isinstance(item, tuple) and item]
    return {
        **_artifact(path, "current PPO action-surface source", tracked, key="ppoActionSurface"),
        "surfaceIds": {
            "multiDiscrete": _literal_assignment(path, "PPO_ACTION_SURFACE_ID"),
            "maskedSemantic": _literal_assignment(path, "PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID"),
        },
        "semanticActions": actions,
        "actionCount": len(actions),
    }


def _selected_package_paths(micro_report: Mapping[str, Any]) -> dict[str, Path | None]:
    package = micro_report.get("modelPackage") if isinstance(micro_report.get("modelPackage"), Mapping) else {}
    artifacts = micro_report.get("modelArtifacts") if isinstance(micro_report.get("modelArtifacts"), Mapping) else {}
    return {
        "model": _repo_path(package.get("model") or artifacts.get("model")),
        "config": _repo_path(package.get("config") or artifacts.get("config")),
        "vecnormalize": _repo_path(package.get("vecnormalize") or artifacts.get("vecnormalize")),
        "normalizer": _repo_path(package.get("normalizer") or artifacts.get("normalizer")),
        "optimizerState": _repo_path(package.get("optimizerState") or artifacts.get("optimizerState")),
    }


def _context_package(manifest_path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
    manifest = _read_json(manifest_path)
    model = _repo_path(manifest.get("model"))
    config = _repo_path(manifest.get("config"))
    vecnormalize = _repo_path(manifest.get("vecnormalize"))
    optimizer = _repo_path(manifest.get("optimizerState"))
    return {
        "manifest": _artifact(manifest_path, role, tracked, key=manifest_path.parent.name),
        "runId": manifest.get("runId"),
        "runKind": manifest.get("runKind"),
        "ok": manifest.get("ok"),
        "report": manifest.get("report"),
        "artifactManifest": manifest.get("artifactManifest"),
        "artifacts": {
            "model": _artifact(model, f"{role} model", tracked, key="model"),
            "config": _artifact(config, f"{role} config", tracked, key="config"),
            "vecnormalize": _artifact(vecnormalize, f"{role} vecnormalize", tracked, key="vecnormalize"),
            "optimizerState": _artifact(optimizer, f"{role} optimizer state", tracked, key="optimizerState"),
        },
        "usableFor93R2": False,
        "rejectionReason": "context-only package is not the selected BT93N/BT93Q policy lineage",
    }


def _source_artifacts(tracked: set[str]) -> list[dict[str, Any]]:
    return [
        {"sourceKey": key, **_artifact(path, role, tracked, key=key)}
        for key, (path, role) in SOURCE_PATHS.items()
    ]


def _distribution_summary(distribution: Mapping[str, Any] | None) -> dict[str, Any]:
    distribution = distribution if isinstance(distribution, Mapping) else {}
    return {
        "total": distribution.get("total"),
        "entropy": distribution.get("entropy"),
        "normalizedEntropy": distribution.get("normalizedEntropy"),
        "argmaxToken": distribution.get("argmaxToken"),
        "argmaxAction": distribution.get("argmaxAction"),
        "argmaxShare": distribution.get("argmaxShare"),
        "secondBestToken": distribution.get("secondBestToken"),
        "secondBestAction": distribution.get("secondBestAction"),
        "secondBestShare": distribution.get("secondBestShare"),
        "marginShare": distribution.get("marginShare"),
        "rankedActions": distribution.get("rankedActions"),
    }


def _mode_evidence(policy_report: Mapping[str, Any]) -> dict[str, Any]:
    snapshot = policy_report.get("entropyLogitSnapshot")
    snapshot = snapshot if isinstance(snapshot, Mapping) else {}
    empirical = snapshot.get("empiricalLogitProxy")
    empirical = empirical if isinstance(empirical, Mapping) else {}
    deterministic = policy_report.get("deterministicEval")
    deterministic = deterministic if isinstance(deterministic, Mapping) else {}
    stochastic = policy_report.get("stochasticTrain")
    stochastic = stochastic if isinstance(stochastic, Mapping) else {}
    return {
        "realModelLogitsAvailable": snapshot.get("realModelLogitsAvailable") is True,
        "proxyRejectedAsModelLogitEvidence": bool(empirical),
        "proxyLimitation": empirical.get("limitation"),
        "deterministic": {
            "source": deterministic.get("source"),
            "distribution": _distribution_summary(
                deterministic.get("combinedDistribution")
                if isinstance(deterministic.get("combinedDistribution"), Mapping)
                else {}
            ),
            "singleActionEvalShare": deterministic.get("singleActionEvalShare"),
            "dominantAction": deterministic.get("dominantAction"),
            "repeatedActionStreakLowerBound": _get(policy_report, "repeatedActionStreaks", "combinedEvalLowerBound"),
            "realLogits": {
                "available": False,
                "reason": "selected BT93N policy package is not persisted; deterministic logits cannot be sampled",
            },
            "top2": {
                "source": empirical.get("snapshotKind"),
                "argmaxToken": empirical.get("argmaxToken"),
                "argmaxAction": empirical.get("argmaxAction"),
                "secondBestToken": empirical.get("secondBestToken"),
                "secondBestAction": empirical.get("secondBestAction"),
                "margin": empirical.get("margin"),
                "isProxy": True,
            },
        },
        "stochastic": {
            "source": stochastic.get("source"),
            "distribution": _distribution_summary(
                stochastic.get("distribution") if isinstance(stochastic.get("distribution"), Mapping) else {}
            ),
            "loggerEntropy": snapshot.get("modelLoggerEntropy"),
            "realLogits": {
                "available": False,
                "reason": "BT93N persisted logger entropy and action counts, not a loadable model/logit snapshot",
            },
            "top2": {
                "source": "action-count distribution only",
                "isProxy": True,
            },
        },
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


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "newEvalRunStarted": False,
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


def build_report() -> dict[str, Any]:
    handover = _read_json(SOURCE_PATHS["bt93rHandoverLock"][0])
    policy_report = _read_json(SOURCE_PATHS["bt93qPolicyCollapse"][0])
    micro_report = _read_json(SOURCE_PATHS["bt93nMicroPpoRepeat"][0])
    selected_paths = _selected_package_paths(micro_report)
    context_paths = [path for path, _role in CONTEXT_MODEL_PACKAGE_MANIFESTS.values()]
    context_payloads = [_read_json(path) for path in context_paths]
    context_artifact_paths: list[Path | None] = []
    for payload in context_payloads:
        context_artifact_paths.extend(
            [
                _repo_path(payload.get("model")),
                _repo_path(payload.get("config")),
                _repo_path(payload.get("vecnormalize")),
                _repo_path(payload.get("optimizerState")),
            ]
        )
    tracked = _tracked_files(
        [path for path, _role in SOURCE_PATHS.values()]
        + list(selected_paths.values())
        + context_paths
        + context_artifact_paths
    )
    source_artifacts = _source_artifacts(tracked)
    current_action_surface = _current_action_surface(SOURCE_PATHS["ppoActionSurface"][0], tracked)
    policy_action_surface = policy_report.get("actionSurface") if isinstance(policy_report.get("actionSurface"), Mapping) else {}
    policy_action_surface_source = _get(policy_report, "sourceArtifacts", "ppoActionSurface")
    policy_action_surface_source = policy_action_surface_source if isinstance(policy_action_surface_source, Mapping) else {}
    selected_artifacts = {
        key: _artifact(path, f"selected BT93N policy {key}", tracked, key=key)
        for key, path in selected_paths.items()
    }
    required_keys = ["model", "config", "vecnormalize"]
    model_package_persisted = any(selected_artifacts[key]["exists"] and selected_artifacts[key]["isFile"] for key in required_keys)
    missing_required = [
        key
        for key in required_keys
        if not selected_artifacts[key]["exists"] or not selected_artifacts[key]["isFile"]
    ]
    current_actions = current_action_surface["semanticActions"]
    policy_actions = list(policy_action_surface.get("semanticActions") or [])
    action_surface_drift = {
        "currentPath": current_action_surface["path"],
        "currentSha256": current_action_surface["sha256"],
        "policyEvidencePath": policy_action_surface.get("path"),
        "policyEvidenceSha256": policy_action_surface_source.get("sha256"),
        "currentActionCount": current_action_surface["actionCount"],
        "policyEvidenceActionCount": policy_action_surface.get("actionCount"),
        "currentSemanticActions": current_actions,
        "policyEvidenceSemanticActions": policy_actions,
        "driftDetected": bool(policy_actions and current_actions != policy_actions)
        or bool(policy_action_surface_source.get("sha256") and current_action_surface["sha256"] != policy_action_surface_source.get("sha256")),
    }
    mode_evidence = _mode_evidence(policy_report)
    real_logits_available = bool(mode_evidence["realModelLogitsAvailable"]) and model_package_persisted
    blocking_findings: list[str] = []
    if missing_required:
        blocking_findings.append("selected-bt93n-model-package-missing")
    if action_surface_drift["driftDetected"]:
        blocking_findings.append("action-surface-lineage-drift")
    if not real_logits_available:
        blocking_findings.append("real-model-logits-unavailable")
    result_class = "policy-evidence-invalid" if action_surface_drift["driftDetected"] else "model-artifact-missing"
    if not missing_required and not action_surface_drift["driftDetected"] and real_logits_available:
        result_class = "policy-artifact-ready"
    phase_coverage = {
        "93R.2.1": bool(selected_artifacts)
        and all(key in selected_artifacts for key in ["model", "config", "vecnormalize", "normalizer"])
        and bool(current_action_surface["sha256"]),
        "93R.2.2": bool(mode_evidence["deterministic"])
        and bool(mode_evidence["stochastic"])
        and mode_evidence["deterministic"]["top2"]["argmaxAction"] is not None
        and mode_evidence["deterministic"]["repeatedActionStreakLowerBound"] is not None
        and mode_evidence["proxyRejectedAsModelLogitEvidence"] is True,
        "93R.2.3": result_class in {"model-artifact-missing", "policy-evidence-invalid", "policy-artifact-ready"}
        and bool(blocking_findings if result_class != "policy-artifact-ready" else True),
    }
    dod_coverage = {
        "DoD.R2": all(phase_coverage.values())
        and result_class in {"model-artifact-missing", "policy-evidence-invalid", "policy-artifact-ready"},
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())
    context_packages = {
        key: _context_package(path, role, tracked)
        for key, (path, role) in CONTEXT_MODEL_PACKAGE_MANIFESTS.items()
    }
    return {
        "schemaVersion": "bt93r-policy-artifact-report-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93r_policy_artifact_probe.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93R",
        "phaseId": "93R.2",
        "resultClass": result_class,
        "matrixId": handover.get("matrixId") or policy_report.get("matrixId"),
        "semanticWindow": handover.get("semanticWindow") or policy_report.get("semanticWindow"),
        "policyIds": micro_report.get("policyIds") or policy_report.get("policyIds"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": all(item["exists"] and item["isFile"] for item in source_artifacts),
        "sourceFilesVersioned": all(item["tracked"] for item in source_artifacts),
        "selectedPolicyLineage": {
            "source": "data/training/ppo/bt93n/micro_ppo_repeat_report.json",
            "modelPackageField": micro_report.get("modelPackage"),
            "modelArtifactsField": micro_report.get("modelArtifacts"),
            "modelPackagePersistedInBT93N": _get(policy_report, "entropyLogitSnapshot", "modelPackagePersistedInBT93N"),
            "realModelLogitsAvailableInBT93Q": _get(policy_report, "entropyLogitSnapshot", "realModelLogitsAvailable"),
            "selectedArtifacts": selected_artifacts,
            "missingRequiredArtifactKeys": missing_required,
        },
        "contextModelPackages": context_packages,
        "actionSurface": {
            "current": current_action_surface,
            "policyEvidence": {
                "path": policy_action_surface.get("path"),
                "actionCount": policy_action_surface.get("actionCount"),
                "semanticActions": policy_actions,
                "sourceSha256": policy_action_surface_source.get("sha256"),
            },
            "lineage": action_surface_drift,
        },
        "evalLogitEvidence": mode_evidence,
        "artifactCapability": {
            "modelPackagePersisted": model_package_persisted,
            "realModelLogitsAvailable": real_logits_available,
            "deterministicAndStochasticRealEvalPossible": False if result_class != "policy-artifact-ready" else None,
            "reason": (
                "BT93N selected policy has no versioned model/config/vecnormalize package and current action surface drifts "
                "from the BT93Q policy evidence."
                if action_surface_drift["driftDetected"]
                else "BT93N selected policy has no versioned model/config/vecnormalize package."
            ),
            "proxyCountsAreQualityEvidence": False,
        },
        "blockingFindings": blocking_findings,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "thresholdsLockedBeforeRun": {
            "notApplicableReason": "93R.2 is a report-only artifact capability probe and runs no new PPO eval/training sample.",
            "afterTheFactThresholdChangesAllowed": False,
        },
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "bt93nActualModelTimesteps": micro_report.get("actualModelTimesteps"),
            "bt93qDeterministicEvalActionRows": _get(
                policy_report,
                "deterministicEval",
                "combinedDistribution",
                "total",
            ),
            "bt93qStochasticTrainActionRows": _get(policy_report, "stochasticTrain", "distribution", "total"),
        },
        "claimFlags": _claim_flags(),
        "guardrails": _guardrails(),
        "allowNext": (
            ["93R.3 root-cause classification may only record policy-evidence-invalid/model-artifact-missing"]
            if result_class != "policy-artifact-ready"
            else ["93R.3 root-cause separation with real model/logit/normalize evidence"]
        ),
        "opensNext": [] if result_class != "policy-artifact-ready" else ["93R.3"],
        "blocksNext": [
            "93R.4 fix implementation until real selected policy artifacts and root-cause class exist",
            "BT93S until 93R.99 reaches R-Allowlist",
            *COMMON_BLOCKED_ACTIONS,
        ],
        "recommendations": [
            {
                "rank": 1,
                "action": "Do not implement decoder/normalize/eval-mode fixes from this evidence.",
                "why": "The selected BT93N/BT93Q policy is not loadable and real logits are unavailable.",
            },
            {
                "rank": 2,
                "action": "Resolve selected policy lineage before any counterprobe.",
                "why": "BT93J context manifests are not the selected BT93N policy lineage, and their actual model files are not versioned here.",
            },
            {
                "rank": 3,
                "action": "Treat action-surface drift as a hard artifact blocker for BT93R.",
                "why": "BT93Q policy evidence used a different semantic action list/hash than the current action-surface source.",
            },
        ],
        "summary": {
            "resultClass": result_class,
            "selectedModelPackageMissing": bool(missing_required),
            "realModelLogitsAvailable": real_logits_available,
            "actionSurfaceDriftDetected": action_surface_drift["driftDetected"],
            "dominantDeterministicAction": _get(policy_report, "deterministicEval", "dominantAction"),
            "deterministicRepeatedActionStreakLowerBound": _get(
                policy_report,
                "repeatedActionStreaks",
                "combinedEvalLowerBound",
            ),
            "nextBestAction": (
                "Close BT93R as red unless the selected BT93N policy package can be recovered and hashed."
                if result_class != "policy-artifact-ready"
                else "Proceed to 93R.3 root-cause split."
            ),
        },
        "commands": {
            "write": "python python/scripts/bt93r_policy_artifact_probe.py --write-report",
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
                "blockingFindings": report["blockingFindings"],
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
