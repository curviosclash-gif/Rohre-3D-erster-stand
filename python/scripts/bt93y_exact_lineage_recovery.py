"""BT93Y.2 exact BT93N lineage inventory and loader-smoke gate.

This phase searches for the exact BT93N model package required by the red
BT93R closure. It does not train, evaluate, consume holdout, create a
candidate, freeze, promote, run PPO-Validate, or touch productive runtime code.
"""

from __future__ import annotations

import argparse
import json
import os
import pickle
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Y_ROOT = PPO_ROOT / "bt93y"

INVENTORY_REPORT_PATH = BT93Y_ROOT / "exact_lineage_inventory_report.json"
LOADER_SMOKE_REPORT_PATH = BT93Y_ROOT / "exact_lineage_loader_smoke_report.json"
MANIFEST_PATH = BT93Y_ROOT / "exact_lineage_manifest.json"

BT93Y_DECISION_LOCK_PATH = BT93Y_ROOT / "lineage_recovery_decision_lock.json"
BT93N_MICRO_REPEAT_PATH = PPO_ROOT / "bt93n" / "micro_ppo_repeat_report.json"
BT93N_TOLERANCE_CONTRACT_PATH = PPO_ROOT / "bt93n" / "micro_ppo_tolerance_contract.json"
BT93N_CLOSURE_PATH = PPO_ROOT / "bt93n" / "closure_gate_report.json"
BT93Q_POLICY_COLLAPSE_PATH = PPO_ROOT / "bt93q" / "policy_collapse_report.json"
BT93R_POLICY_ARTIFACT_PATH = PPO_ROOT / "bt93r" / "policy_artifact_report.json"
BT93R_CLOSURE_PATH = PPO_ROOT / "bt93r" / "bt93r_closure_gate_report.json"
ACTION_SURFACE_PATH = REPO_ROOT / "python" / "envs" / "ppo_action_surface.py"

REPLACEMENT_POLICY_ID = "bt93x-rcp1-same-matrix-control-suite-no-bt11"
EXPECTED_RUN_ID = "ppo-bt93n-micro-10k"
EXPECTED_POLICY_IDS = {
    "train": "ppo-bt93n-micro-10k-stochastic",
    "eval": "ppo-bt93n-micro-10k-deterministic",
}
EXPECTED_FILENAMES = {
    "model": ["model.zip"],
    "config": ["config.json", "ppo_config.json", "training_config.json", "run_config.json"],
    "vecnormalize": ["vecnormalize.pkl", "vec_normalize.pkl", "normalizer.pkl", "normalize.pkl"],
    "optimizerState": ["optimizer_state.pt"],
    "artifactManifest": ["artifact_manifest.json"],
    "trainingReport": ["training_report.json"],
}
REQUIRED_PACKAGE_KEYS = ["model", "config", "vecnormalize"]
OPTIONAL_PACKAGE_KEYS = ["optimizerState", "artifactManifest", "trainingReport"]


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
    return [line.strip().replace("\\", "/") for line in _git_output(args).splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
    rel_paths = [path for path in rel_paths if path]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _all_repo_tracked() -> set[str]:
    return set(_git_lines(["git", "ls-files"]))


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source_artifact(path: Path, key: str, role: str, tracked: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "key": key,
        "role": role,
        "path": rel_path,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    paths = [
        BT93Y_DECISION_LOCK_PATH,
        BT93N_MICRO_REPEAT_PATH,
        BT93N_TOLERANCE_CONTRACT_PATH,
        BT93N_CLOSURE_PATH,
        BT93Q_POLICY_COLLAPSE_PATH,
        BT93R_POLICY_ARTIFACT_PATH,
        BT93R_CLOSURE_PATH,
        ACTION_SURFACE_PATH,
    ]
    tracked = _tracked_files(paths)
    return [
        _source_artifact(BT93Y_DECISION_LOCK_PATH, "bt93yDecisionLock", "BT93Y.1 decision lock", tracked),
        _source_artifact(BT93N_MICRO_REPEAT_PATH, "bt93nMicroRepeat", "BT93N.3 selected micro-PPO source", tracked),
        _source_artifact(
            BT93N_TOLERANCE_CONTRACT_PATH,
            "bt93nToleranceContract",
            "BT93N.3 pre-run tolerance contract",
            tracked,
        ),
        _source_artifact(BT93N_CLOSURE_PATH, "bt93nClosure", "BT93N.99 red closure", tracked),
        _source_artifact(BT93Q_POLICY_COLLAPSE_PATH, "bt93qPolicyCollapse", "BT93Q.3 collapse evidence", tracked),
        _source_artifact(BT93R_POLICY_ARTIFACT_PATH, "bt93rPolicyArtifact", "BT93R.2 artifact blocker", tracked),
        _source_artifact(BT93R_CLOSURE_PATH, "bt93rClosure", "BT93R.99 red closure", tracked),
        _source_artifact(ACTION_SURFACE_PATH, "currentPpoActionSurface", "current PPO action-surface source", tracked),
    ]


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
        "bt93rReentryAllowed": False,
        "bt93sClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
    }


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


def _search_roots() -> list[dict[str, Any]]:
    local_roots = [
        (PPO_ROOT / "bt93n", "repo-local BT93N evidence directory", True),
        (PPO_ROOT / "bt93n" / "runs", "repo-local BT93N run directory", True),
        (REPO_ROOT / "output" / "training", "workspace output training directory", True),
        (PPO_ROOT, "repo-local PPO artifact context, exact BT93N only accepted", True),
        (REPO_ROOT / "tmp", "tmp is scanned only as forbidden/non-closure context", False),
    ]
    roots: list[dict[str, Any]] = []
    seen: set[str] = set()
    for root, role, accepted in local_roots:
        key = str(root.resolve())
        if key in seen:
            continue
        seen.add(key)
        roots.append(
            {
                "path": _rel(root),
                "absolutePath": str(root.resolve()),
                "role": role,
                "exists": root.exists(),
                "acceptsRecoveryArtifacts": accepted,
                "owner": "repo",
            }
        )

    external_value = os.environ.get("BT93Y_EXTERNAL_LINEAGE_ROOTS", "").strip()
    for raw in [part.strip() for part in external_value.split(os.pathsep) if part.strip()]:
        path = Path(raw)
        key = str(path.resolve())
        if key in seen:
            continue
        seen.add(key)
        roots.append(
            {
                "path": _rel(path),
                "absolutePath": str(path.resolve()),
                "role": "user-provided external lineage root via BT93Y_EXTERNAL_LINEAGE_ROOTS",
                "exists": path.exists(),
                "acceptsRecoveryArtifacts": True,
                "owner": "user",
            }
        )
    if not external_value:
        roots.append(
            {
                "path": None,
                "absolutePath": None,
                "role": "user-provided external lineage roots",
                "exists": False,
                "acceptsRecoveryArtifacts": True,
                "owner": "user",
                "notConfiguredReason": "BT93Y_EXTERNAL_LINEAGE_ROOTS is empty; no off-workspace location was provided.",
            }
        )
    return roots


def _candidate_files(root: Path, accepts_recovery: bool) -> list[Path]:
    if not root.exists() or not root.is_dir():
        return []
    target_names = {name for names in EXPECTED_FILENAMES.values() for name in names}
    found: list[Path] = []
    for current_root, dirs, files in os.walk(root):
        current = Path(current_root)
        rel_current = current.as_posix().lower()
        if "\\site-packages\\" in rel_current or "/site-packages/" in rel_current:
            dirs[:] = []
            continue
        if not accepts_recovery and "bt93n" not in rel_current:
            dirs[:] = [directory for directory in dirs if "bt93n" in directory.lower()]
            continue
        for name in files:
            if name in target_names or name == "latest_model_package.json":
                found.append(current / name)
    return found


def _group_candidates(roots: list[dict[str, Any]], tracked: set[str]) -> list[dict[str, Any]]:
    packages: dict[Path, dict[str, Any]] = {}
    file_to_key = {
        filename: key
        for key, filenames in EXPECTED_FILENAMES.items()
        for filename in filenames
    }
    for root_info in roots:
        abs_path = root_info.get("absolutePath")
        if not abs_path:
            continue
        root = Path(abs_path)
        for path in _candidate_files(root, bool(root_info.get("acceptsRecoveryArtifacts"))):
            package_dir = path.parent
            rel_path = _rel(path)
            key = file_to_key.get(path.name, "latestPointer")
            package = packages.setdefault(
                package_dir,
                {
                    "packageDir": _rel(package_dir),
                    "absolutePackageDir": str(package_dir.resolve()),
                    "searchRoot": root_info.get("path"),
                    "searchRootRole": root_info.get("role"),
                    "acceptsRecoveryArtifacts": root_info.get("acceptsRecoveryArtifacts"),
                    "files": {},
                    "rejectionReasons": [],
                },
            )
            package["files"][key] = {
                "path": rel_path,
                "exists": path.is_file(),
                "tracked": rel_path in tracked if rel_path else False,
                "sha256": _sha256_file(path),
                "sizeBytes": path.stat().st_size if path.is_file() else None,
                "lastModifiedUtc": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
                .isoformat(timespec="seconds")
                .replace("+00:00", "Z")
                if path.is_file()
                else None,
            }

    candidates = list(packages.values())
    for candidate in candidates:
        files = candidate["files"]
        missing = [key for key in REQUIRED_PACKAGE_KEYS if key not in files]
        untracked_required = [
            key for key in REQUIRED_PACKAGE_KEYS if key in files and not files[key].get("tracked")
        ]
        package_dir = str(candidate.get("packageDir") or "")
        if not candidate.get("acceptsRecoveryArtifacts"):
            candidate["rejectionReasons"].append("forbidden-search-root")
        if "latestPointer" in files:
            candidate["rejectionReasons"].append("latest-pointer-not-accepted")
        if "bt93n" not in package_dir.lower():
            candidate["rejectionReasons"].append("not-bt93n-selected-lineage")
        if missing:
            candidate["rejectionReasons"].append(f"missing-required:{','.join(missing)}")
        if untracked_required:
            candidate["rejectionReasons"].append(f"required-artifacts-untracked:{','.join(untracked_required)}")
        candidate["requiredPackageComplete"] = not missing
        candidate["requiredPackageTracked"] = not untracked_required
        candidate["acceptedAsExactLineage"] = (
            bool(candidate.get("acceptsRecoveryArtifacts"))
            and "latestPointer" not in files
            and "bt93n" in package_dir.lower()
            and not missing
            and not untracked_required
        )
    return sorted(candidates, key=lambda item: str(item.get("packageDir") or ""))


def _expected_lineage() -> dict[str, Any]:
    micro = _read_json(BT93N_MICRO_REPEAT_PATH)
    q_collapse = _read_json(BT93Q_POLICY_COLLAPSE_PATH)
    r_policy = _read_json(BT93R_POLICY_ARTIFACT_PATH)
    q_surface = q_collapse.get("actionSurface") if isinstance(q_collapse.get("actionSurface"), Mapping) else {}
    policy_surface = _get(r_policy, "actionSurface", "policyEvidence") or {}
    current_surface = _get(r_policy, "actionSurface", "current") or {}
    return {
        "expectedRunId": EXPECTED_RUN_ID,
        "expectedPolicyIds": EXPECTED_POLICY_IDS,
        "expectedArtifactNames": EXPECTED_FILENAMES,
        "sourceTimeWindow": {
            "bt93nMicroGeneratedAt": micro.get("generatedAt"),
            "bt93qCollapseGeneratedAt": q_collapse.get("generatedAt"),
            "bt93rPolicyArtifactGeneratedAt": r_policy.get("generatedAt"),
        },
        "matrixId": micro.get("matrixId") or r_policy.get("matrixId"),
        "semanticWindow": micro.get("semanticWindow") or r_policy.get("semanticWindow"),
        "bt93qMatrixId": r_policy.get("matrixId") or "bt93q-walltrail-policy-recheck-v1",
        "bt93qSemanticWindow": r_policy.get("semanticWindow") or "bt93q-walltrail-10k-diagnostic-window",
        "actualModelTimesteps": micro.get("actualModelTimesteps"),
        "requiredArtifacts": REQUIRED_PACKAGE_KEYS,
        "optionalArtifacts": OPTIONAL_PACKAGE_KEYS,
        "selectedBt93nPolicyEvidence": {
            "source": _rel(BT93N_MICRO_REPEAT_PATH),
            "modelPackagePersisted": bool(_get(r_policy, "selectedPolicyLineage", "modelPackagePersistedInBT93N")),
            "missingRequiredArtifactKeysFromBT93R": _get(
                r_policy, "selectedPolicyLineage", "missingRequiredArtifactKeys"
            )
            or [],
            "realModelLogitsAvailable": bool(_get(r_policy, "selectedPolicyLineage", "realModelLogitsAvailableInBT93Q")),
        },
        "actionSurfaceExpectedFromBt93Q": {
            "source": _rel(BT93Q_POLICY_COLLAPSE_PATH),
            "path": q_surface.get("path") or policy_surface.get("path"),
            "sha256": policy_surface.get("sourceSha256"),
            "semanticActions": q_surface.get("semanticActions") or policy_surface.get("semanticActions"),
            "actionCount": q_surface.get("actionCount") or policy_surface.get("actionCount"),
        },
        "currentActionSurface": {
            "source": _rel(ACTION_SURFACE_PATH),
            "sha256": _sha256_file(ACTION_SURFACE_PATH),
            "reportedSha256": current_surface.get("sha256"),
            "semanticActions": current_surface.get("semanticActions"),
            "actionCount": current_surface.get("actionCount"),
        },
    }


def _build_inventory() -> dict[str, Any]:
    tracked = _all_repo_tracked()
    roots = _search_roots()
    candidates = _group_candidates(roots, tracked)
    accepted = [candidate for candidate in candidates if candidate.get("acceptedAsExactLineage")]
    exact_restored = len(accepted) == 1
    result_class = "exact-bt93n-lineage-restored" if exact_restored else "exact-lineage-unavailable"
    expected = _expected_lineage()
    missing_required = [] if exact_restored else REQUIRED_PACKAGE_KEYS
    negative_evidence = [
        {
            "searchRoot": root.get("path"),
            "absolutePath": root.get("absolutePath"),
            "owner": root.get("owner"),
            "searched": bool(root.get("exists")) and bool(root.get("absolutePath")),
            "acceptsRecoveryArtifacts": root.get("acceptsRecoveryArtifacts"),
            "reason": root.get("notConfiguredReason")
            or (
                "no acceptable exact BT93N model/config/vecnormalize package found"
                if root.get("exists")
                else "search root missing"
            ),
            "expectedRunId": EXPECTED_RUN_ID,
            "expectedArtifactNames": EXPECTED_FILENAMES,
        }
        for root in roots
    ]
    return {
        "schemaVersion": "bt93y-exact-lineage-inventory-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_exact_lineage_recovery.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93Y",
        "phaseId": "93Y.2",
        "resultClass": result_class,
        "lineageDecision": {
            "owner": "user",
            "mode": "exact-bt93n-lineage-recovery-before-any-r-s-o-p",
            "exactRecoveryAttempted": True,
            "exactBt93nLineageRestored": exact_restored,
            "exactLineageUnavailable": not exact_restored,
            "retrainingAllowedIfExactLineageUnavailable": True,
            "newRetrainLineageMustNotBeLabeledAsBt93n": True,
        },
        "replacementPolicy": {
            "owner": "user",
            "approved": True,
            "policyId": REPLACEMENT_POLICY_ID,
            "scope": ["BT93X starttruth", "BT93P starttruth"],
            "historicalDqnBotReportsUse": "context-only",
        },
        "expectedLineage": expected,
        "searchRoots": roots,
        "candidatePackages": candidates,
        "acceptedExactLineagePackages": accepted,
        "negativeEvidence": negative_evidence,
        "modelPackage": {
            "restored": exact_restored,
            "activePackageDir": accepted[0]["packageDir"] if exact_restored else None,
            "model": accepted[0]["files"].get("model") if exact_restored else None,
            "config": accepted[0]["files"].get("config") if exact_restored else None,
            "vecnormalize": accepted[0]["files"].get("vecnormalize") if exact_restored else None,
            "normalizer": accepted[0]["files"].get("vecnormalize") if exact_restored else None,
            "optimizerState": accepted[0]["files"].get("optimizerState") if exact_restored else None,
            "missingRequiredArtifactKeys": missing_required,
            "notApplicableReason": None
            if exact_restored
            else "No complete tracked exact BT93N model/config/vecnormalize package was found.",
        },
        "sourceArtifacts": _source_artifacts(),
        "sourceFilesReady": all(item["exists"] and item["isFile"] for item in _source_artifacts()),
        "sourceFilesVersioned": all(item["tracked"] for item in _source_artifacts()),
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "steps": 0,
            "externalSearchRootsConfigured": sum(
                1 for root in roots if root.get("owner") == "user" and root.get("absolutePath")
            ),
            "candidatePackagesFound": len(candidates),
            "acceptedExactLineagePackages": len(accepted),
        },
        "allowNext": (
            ["BT93R-Reentry artifact probe after BT93Y.4/93Y.5"]
            if exact_restored
            else ["93Y.3 narrow retraining lineage under UOD-1"]
        ),
        "opensNext": ["93Y.3"] if not exact_restored else ["93Y.4", "93Y.5"],
        "blocksNext": [
            "BT93R-Reentry until BT93Y.99 green",
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
        ],
        "claimFlags": _claim_flags(),
        "guardrails": _guardrails(),
        "phaseCoverage": {
            "93Y.2.1": True,
            "93Y.2.2": True,
            "93Y.2.3": True,
            "93Y.2.4": True,
            "93Y.2.5": True,
            "93Y.2.6": not exact_restored,
            "93Y.2.7": not exact_restored,
        },
        "branchOutcomes": {
            "93Y.2.5.fullRecoveryWritten": exact_restored,
            "93Y.2.5.notApplicableReason": None
            if exact_restored
            else "Full exact recovery branch was evaluated but not taken; 93Y.2.6 writes exact-lineage-unavailable.",
            "93Y.2.6.exactLineageUnavailableWritten": not exact_restored,
            "93Y.2.7.negativeEvidenceWritten": not exact_restored,
        },
        "summary": {
            "finalResult": result_class,
            "exactBt93nLineageRestored": exact_restored,
            "missingRequiredArtifactKeys": missing_required,
            "candidatePackagesFound": len(candidates),
            "acceptedExactLineagePackages": len(accepted),
            "nextBestAction": (
                "Proceed to 93Y.4/93Y.5 packaging after replacement-policy lock."
                if exact_restored
                else "Proceed to 93Y.3 narrow retraining lineage; do not start BT93S/O/P/94A."
            ),
        },
        "commands": {
            "write": "python python/scripts/bt93y_exact_lineage_recovery.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def _load_json_config(path: Path) -> dict[str, Any]:
    try:
        return _read_json(path)
    except OSError:
        return {}


def _run_loader_smoke(inventory: Mapping[str, Any]) -> dict[str, Any]:
    model_package = inventory.get("modelPackage") if isinstance(inventory.get("modelPackage"), Mapping) else {}
    restored = bool(model_package.get("restored"))
    active_dir = model_package.get("activePackageDir")
    model_info = model_package.get("model") if isinstance(model_package.get("model"), Mapping) else {}
    config_info = model_package.get("config") if isinstance(model_package.get("config"), Mapping) else {}
    vec_info = model_package.get("vecnormalize") if isinstance(model_package.get("vecnormalize"), Mapping) else {}
    smoke: dict[str, Any] = {
        "attempted": False,
        "modelLoadAttempted": False,
        "configLoadAttempted": False,
        "normalizerLoadAttempted": False,
        "modelLoaded": False,
        "configLoaded": False,
        "normalizerLoaded": False,
        "error": None,
        "notApplicableReason": None,
    }
    if not restored:
        smoke["notApplicableReason"] = "exact BT93N lineage package unavailable; loader-smoke is recorded as skipped."
    else:
        smoke["attempted"] = True
        model_path = REPO_ROOT / str(model_info.get("path", ""))
        config_path = REPO_ROOT / str(config_info.get("path", ""))
        vec_path = REPO_ROOT / str(vec_info.get("path", ""))
        try:
            smoke["configLoadAttempted"] = True
            smoke["configLoaded"] = bool(_load_json_config(config_path))
            smoke["normalizerLoadAttempted"] = True
            with vec_path.open("rb") as handle:
                pickle.load(handle)
            smoke["normalizerLoaded"] = True
            smoke["modelLoadAttempted"] = True
            from stable_baselines3 import PPO  # type: ignore

            PPO.load(str(model_path), device="cpu")
            smoke["modelLoaded"] = True
        except Exception as exc:  # pragma: no cover - diagnostic report path
            smoke["error"] = f"{exc.__class__.__name__}: {exc}"
    result_class = (
        "exact-lineage-loader-smoke-green"
        if smoke["modelLoaded"] and smoke["configLoaded"] and smoke["normalizerLoaded"]
        else inventory["resultClass"]
        if not restored
        else "lineage-package-invalid"
    )
    return {
        "schemaVersion": "bt93y-exact-lineage-loader-smoke-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_exact_lineage_recovery.py",
        "git": inventory["git"],
        "blockId": "BT93Y",
        "phaseId": "93Y.2",
        "resultClass": result_class,
        "sourceInventoryReport": _rel(INVENTORY_REPORT_PATH),
        "activePackageDir": active_dir,
        "modelPackage": model_package,
        "loaderSmoke": smoke,
        "lineageDecision": inventory["lineageDecision"],
        "allowNext": inventory["allowNext"],
        "opensNext": inventory["opensNext"],
        "blocksNext": inventory["blocksNext"],
        "claimFlags": inventory["claimFlags"],
        "guardrails": inventory["guardrails"],
        "sampleCounts": inventory["sampleCounts"],
        "summary": {
            "finalResult": result_class,
            "loaderSmokeAttempted": smoke["attempted"],
            "modelLoaded": smoke["modelLoaded"],
            "configLoaded": smoke["configLoaded"],
            "normalizerLoaded": smoke["normalizerLoaded"],
            "nextBestAction": inventory["summary"]["nextBestAction"],
        },
        "commands": inventory["commands"],
    }


def _build_manifest(inventory: Mapping[str, Any], loader_smoke: Mapping[str, Any]) -> dict[str, Any]:
    exact_restored = bool(_get(inventory, "lineageDecision", "exactBt93nLineageRestored"))
    result_class = (
        "exact-bt93n-lineage-restored"
        if exact_restored and loader_smoke.get("resultClass") == "exact-lineage-loader-smoke-green"
        else "exact-lineage-unavailable"
        if not exact_restored
        else "lineage-package-invalid"
    )
    return {
        "schemaVersion": "bt93y-exact-lineage-manifest-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_exact_lineage_recovery.py",
        "git": inventory["git"],
        "blockId": "BT93Y",
        "phaseId": "93Y.2",
        "resultClass": result_class,
        "lineageId": "bt93n-exact-restored" if result_class == "exact-bt93n-lineage-restored" else None,
        "exactBt93nLineageRestored": result_class == "exact-bt93n-lineage-restored",
        "exactLineageUnavailable": result_class == "exact-lineage-unavailable",
        "acceptedArtifacts": _get(inventory, "acceptedExactLineagePackages") or [],
        "modelPackage": inventory["modelPackage"],
        "inventoryReport": _rel(INVENTORY_REPORT_PATH),
        "loaderSmokeReport": _rel(LOADER_SMOKE_REPORT_PATH),
        "sourceArtifacts": inventory["sourceArtifacts"],
        "searchRoots": inventory["searchRoots"],
        "negativeEvidence": inventory["negativeEvidence"],
        "lineageDecision": inventory["lineageDecision"],
        "expectedLineage": inventory["expectedLineage"],
        "replacementPolicy": inventory["replacementPolicy"],
        "allowNext": inventory["allowNext"],
        "opensNext": inventory["opensNext"],
        "blocksNext": inventory["blocksNext"],
        "claimFlags": inventory["claimFlags"],
        "guardrails": inventory["guardrails"],
        "sampleCounts": inventory["sampleCounts"],
        "phaseCoverage": inventory["phaseCoverage"],
        "branchOutcomes": inventory["branchOutcomes"],
        "summary": {
            "finalResult": result_class,
            "exactBt93nLineageRestored": result_class == "exact-bt93n-lineage-restored",
            "exactLineageUnavailable": result_class == "exact-lineage-unavailable",
            "bt93rReentryAllowed": False,
            "nextBestAction": inventory["summary"]["nextBestAction"],
        },
        "commands": inventory["commands"],
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    inventory = _build_inventory()
    loader_smoke = _run_loader_smoke(inventory)
    manifest = _build_manifest(inventory, loader_smoke)
    return inventory, loader_smoke, manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-reports", action="store_true")
    args = parser.parse_args()

    inventory, loader_smoke, manifest = build_reports()
    if args.write_reports:
        _write_json(INVENTORY_REPORT_PATH, inventory)
        _write_json(LOADER_SMOKE_REPORT_PATH, loader_smoke)
        _write_json(MANIFEST_PATH, manifest)
    print(
        json.dumps(
            {
                "ok": manifest["ok"],
                "resultClass": manifest["resultClass"],
                "exactBt93nLineageRestored": manifest["exactBt93nLineageRestored"],
                "candidatePackagesFound": inventory["summary"]["candidatePackagesFound"],
                "acceptedExactLineagePackages": inventory["summary"]["acceptedExactLineagePackages"],
                "opensNext": manifest["opensNext"],
                "outputs": [
                    _rel(INVENTORY_REPORT_PATH),
                    _rel(LOADER_SMOKE_REPORT_PATH),
                    _rel(MANIFEST_PATH),
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if manifest["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
