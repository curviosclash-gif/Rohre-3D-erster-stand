"""BT93R.99 closure gate.

Closes BT93R from versioned diagnostic evidence only. A red closure is valid
when the selected BT93N policy lineage is missing; it must not implement a
decoder, normalize, eval-mode, reward, action, telemetry, safety, terminal,
candidate, freeze, holdout, promotion, rollout, or PPO-Validate signal.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93R_ROOT = PPO_ROOT / "bt93r"
BT93N_ROOT = PPO_ROOT / "bt93n"

COUNTERPROBE_PATH = BT93R_ROOT / "collapse_counterprobe_report.json"
CLOSURE_PATH = BT93R_ROOT / "bt93r_closure_gate_report.json"

SOURCE_PATHS: dict[str, tuple[Path, str]] = {
    "bt93rHandoverLock": (
        BT93R_ROOT / "bt93r_handover_lock_report.json",
        "BT93R.1 handover lock",
    ),
    "bt93rPolicyArtifact": (
        BT93R_ROOT / "policy_artifact_report.json",
        "BT93R.2 policy artifact capability report",
    ),
    "bt93rRootCause": (
        BT93R_ROOT / "policy_collapse_root_cause_report.json",
        "BT93R.3 policy-collapse root-cause report",
    ),
    "bt93nMicroPpoRepeat": (
        BT93N_ROOT / "micro_ppo_repeat_report.json",
        "BT93N selected 10k micro-PPO source report",
    ),
    "bt93qPolicyCollapse": (
        PPO_ROOT / "bt93q" / "policy_collapse_report.json",
        "BT93Q deterministic policy-collapse evidence",
    ),
    "ppoActionSurface": (
        REPO_ROOT / "python" / "envs" / "ppo_action_surface.py",
        "current PPO action-surface source",
    ),
}

GREEN_RESULTS = {
    "policy-collapse-green",
    "decoder-fix-counterprobe-green",
    "normalize-fix-counterprobe-green",
    "eval-mode-bug-fixed-counterprobe-green",
}

RED_RESULTS = {
    "policy-collapse-active",
    "policy-evidence-invalid",
    "model-artifact-missing",
    "normalize-mismatch",
    "measurement-invalid",
}

COMMON_BLOCKED_ACTIONS = [
    "93R.4 decoder/normalize/eval-mode fix without restored selected BT93N lineage",
    "BT93S until 93R.99 reaches R-Allowlist",
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


def _artifact(path: Path, role: str, tracked: set[str], *, key: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "key": key,
        "path": rel_path,
        "role": role,
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


def _source_artifacts(tracked: set[str]) -> list[dict[str, Any]]:
    return [
        {"sourceKey": key, **_artifact(path, role, tracked, key=key)}
        for key, (path, role) in SOURCE_PATHS.items()
    ]


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


def _bt93n_lineage_inventory() -> dict[str, Any]:
    patterns = ("model.zip", "vecnormalize.pkl", "config.json", "*config*.json", "artifact_manifest.json")
    matches: list[dict[str, Any]] = []
    if BT93N_ROOT.exists():
        for path in sorted(item for item in BT93N_ROOT.rglob("*") if item.is_file()):
            if any(fnmatch.fnmatch(path.name, pattern) for pattern in patterns):
                matches.append(
                    {
                        "path": _rel(path),
                        "sizeBytes": path.stat().st_size,
                        "sha256": _sha256_file(path),
                    }
                )
    present_names = {Path(str(item["path"])).name for item in matches}
    return {
        "searchRoot": _rel(BT93N_ROOT),
        "patterns": list(patterns),
        "matchingFiles": matches,
        "modelZipPresent": "model.zip" in present_names,
        "vecnormalizePresent": "vecnormalize.pkl" in present_names,
        "configPresent": any(fnmatch.fnmatch(name, "*config*.json") for name in present_names),
        "exactLineagePackagePresent": (
            "model.zip" in present_names
            and "vecnormalize.pkl" in present_names
            and any(fnmatch.fnmatch(name, "*config*.json") for name in present_names)
        ),
    }


def _active_blockers(policy_artifact: Mapping[str, Any], root_cause: Mapping[str, Any]) -> list[str]:
    blockers = set(str(item) for item in policy_artifact.get("blockingFindings") or [])
    result_class = str(root_cause.get("resultClass") or "")
    selected_class = str(_get(root_cause, "rootCauseClassification", "selectedClass") or "")
    if result_class in RED_RESULTS:
        blockers.add(result_class)
    if selected_class and selected_class in RED_RESULTS:
        blockers.add(selected_class)
    if _get(root_cause, "artifactLineage", "actionSurfaceDriftDetected") is True:
        blockers.add("action-surface-lineage-drift")
    if _get(root_cause, "artifactLineage", "realModelLogitsAvailable") is False:
        blockers.add("real-model-logits-unavailable")
    return sorted(blockers)


def _build_counterprobe(
    payloads: Mapping[str, Mapping[str, Any]],
    source_artifacts: list[dict[str, Any]],
    generated_at: str,
) -> dict[str, Any]:
    policy_artifact = payloads["bt93rPolicyArtifact"]
    root_cause = payloads["bt93rRootCause"]
    inventory = _bt93n_lineage_inventory()
    result_class = "model-artifact-missing"
    missing_keys = list(_get(root_cause, "artifactLineage", "missingRequiredArtifactKeys") or [])
    fix_allowed = _get(root_cause, "rootCauseClassification", "fixImplementationAllowed") is True
    no_fix_allowed = fix_allowed is False and result_class in RED_RESULTS
    no_runtime_touch = _guardrails()["runtimeSurfacesTouched"] == []
    invalidated_artifacts = [
        {
            "artifact": "BT93Q/BT93N action-count proxy",
            "reason": "Counts show yaw-right collapse but are not real model logits or a loadable policy package.",
        },
        {
            "artifact": "context model packages BT93C-BT93J",
            "reason": "They are not the selected BT93N/BT93Q policy lineage.",
        },
        {
            "artifact": "current action-surface hash",
            "reason": "Current surface has 13 semantic actions while BT93Q evidence used 9 actions.",
        },
    ]
    phase_coverage = {
        "93R.4.1": no_fix_allowed
        and _get(root_cause, "rootCauseClassification", "selectedClass") == "model-artifact-missing",
        "93R.4.2": no_runtime_touch,
        "93R.4.3": bool(invalidated_artifacts),
    }
    dod_coverage = {
        "DoD.R4": all(phase_coverage.values())
        and _get(root_cause, "rootCauseClassification", "fixClassPinned") is None,
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())
    return {
        "schemaVersion": "bt93r-collapse-counterprobe-report-v1",
        "ok": ok,
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93r_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93R",
        "phaseId": "93R.4",
        "resultClass": result_class,
        "matrixId": root_cause.get("matrixId") or policy_artifact.get("matrixId"),
        "semanticWindow": root_cause.get("semanticWindow") or policy_artifact.get("semanticWindow"),
        "policyIds": root_cause.get("policyIds") or policy_artifact.get("policyIds"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": all(item["exists"] and item["isFile"] for item in source_artifacts),
        "sourceFilesVersioned": all(item["tracked"] for item in source_artifacts),
        "lineageRestorationStatus": {
            "attemptedByLocalInventory": True,
            "selectedBt93nPackageFound": inventory["exactLineagePackagePresent"],
            "missingRequiredArtifactKeys": missing_keys,
            "bt93nLocalInventory": inventory,
            "restoreBeforeFixRequired": True,
        },
        "fixDecision": {
            "fixApplied": False,
            "fixClassPinned": None,
            "fixImplementationAllowed": False,
            "selectedRootCauseClass": _get(root_cause, "rootCauseClassification", "selectedClass"),
            "reason": (
                "No decoder, normalize, or eval-mode fix is provable because the exact BT93N model, "
                "config, VecNormalize, and BT93Q surface hash are not present."
            ),
            "allowedFilesIfFutureLineageRestored": [
                "python/scripts/bt93r_*.py",
                "data/training/ppo/bt93r/**",
                "python/eval.py only for explicit logit/load field repair",
                "python/train.py only for explicit normalize/load field repair",
            ],
            "forbiddenFiles": [
                "productive runtime surfaces",
                "reward surfaces",
                "action-surface changes",
                "observation/telemetry changes",
                "safety/terminal/runner changes",
            ],
        },
        "counterprobe": {
            "lineageValidCounterprobeExecuted": False,
            "actualModelTimesteps": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "notExecutedReason": (
                "Selected BT93N model/config/vecnormalize are missing and current action-surface "
                "lineage drifts from BT93Q evidence; a counterprobe would be non-lineage evidence."
            ),
            "sameMatrixOrDiagnosticDeviation": "diagnostic-deviation-without-new-samples",
            "greenCounterprobePossible": False,
        },
        "revertCriterion": {
            "notApplicableBecauseNoFixApplied": True,
            "futureFixMustRevertIf": [
                "selected BT93N lineage cannot be hashed before the fix",
                "deterministic eval remains single-action dominated after same-lineage counterprobe",
                "fix changes reward, action, telemetry, safety, terminal, or runtime surfaces inside BT93R",
            ],
        },
        "invalidatedComparisonArtifacts": invalidated_artifacts,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "thresholdsLockedBeforeRun": {
            "notApplicableReason": "93R.4 closes without a new PPO eval/training sample because lineage is missing.",
            "afterTheFactThresholdChangesAllowed": False,
        },
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "actualModelTimesteps": 0,
            "bt93nActualModelTimesteps": _get(root_cause, "sampleCounts", "bt93nActualModelTimesteps"),
            "bt93qDeterministicEvalActionRows": _get(
                root_cause,
                "sampleCounts",
                "bt93qDeterministicEvalActionRows",
            ),
        },
        "activeBlockers": _active_blockers(policy_artifact, root_cause),
        "claimFlags": _claim_flags(),
        "guardrails": _guardrails(),
        "allowNext": [
            "BT93R.99 red closure as model-artifact-missing",
            "restore exact BT93N model/config/vecnormalize/surface-hash package in a later lineage-recovery task",
        ],
        "opensNext": [],
        "blocksNext": list(COMMON_BLOCKED_ACTIONS),
        "summary": {
            "resultClass": result_class,
            "fixApplied": False,
            "counterprobeExecuted": False,
            "selectedBt93nPackageFound": inventory["exactLineagePackagePresent"],
            "nextBestAction": "Close BT93R red; do not implement 93R.4 from proxy evidence.",
        },
    }


def _build_closure(
    payloads: Mapping[str, Mapping[str, Any]],
    source_artifacts: list[dict[str, Any]],
    counterprobe: Mapping[str, Any],
    generated_at: str,
) -> dict[str, Any]:
    policy_artifact = payloads["bt93rPolicyArtifact"]
    root_cause = payloads["bt93rRootCause"]
    result_class = "model-artifact-missing"
    active_blockers = _active_blockers(policy_artifact, root_cause)
    source_files_ready = all(item["exists"] and item["isFile"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)
    green_not_claimed = result_class not in GREEN_RESULTS
    bt93s_blocked = result_class not in GREEN_RESULTS
    guardrails = _guardrails()
    phase_coverage = {
        "93R.99.1": counterprobe.get("ok") is True
        and _get(counterprobe, "counterprobe", "lineageValidCounterprobeExecuted") is False
        and bool(_get(counterprobe, "counterprobe", "notExecutedReason")),
        "93R.99.2": green_not_claimed and GREEN_RESULTS == {
            "policy-collapse-green",
            "decoder-fix-counterprobe-green",
            "normalize-fix-counterprobe-green",
            "eval-mode-bug-fixed-counterprobe-green",
        },
        "93R.99.3": result_class in RED_RESULTS,
    }
    dod_coverage = {
        "DoD.R4": _get(counterprobe, "dodCoverage", "DoD.R4") is True,
        "DoD.R5": result_class in RED_RESULTS and counterprobe.get("resultClass") in RED_RESULTS,
        "DoD.R6": bt93s_blocked
        and guardrails["bt93oClaimAllowed"] is False
        and guardrails["bt93pClaimAllowed"] is False
        and guardrails["bt94aClaimAllowed"] is False,
    }
    ok = (
        source_files_ready
        and source_files_versioned
        and all(phase_coverage.values())
        and all(dod_coverage.values())
    )
    return {
        "schemaVersion": "bt93r-closure-gate-report-v1",
        "ok": ok,
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93r_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93R",
        "phaseId": "93R.99",
        "resultClass": result_class if ok else "closure-blocked",
        "selectedRootCauseClass": _get(root_cause, "rootCauseClassification", "selectedClass"),
        "activeBlockers": active_blockers,
        "matrixId": root_cause.get("matrixId") or policy_artifact.get("matrixId"),
        "semanticWindow": root_cause.get("semanticWindow") or policy_artifact.get("semanticWindow"),
        "policyIds": root_cause.get("policyIds") or policy_artifact.get("policyIds"),
        "sourceArtifacts": source_artifacts,
        "generatedArtifacts": {
            "collapseCounterprobe": _rel(COUNTERPROBE_PATH),
            "closureGateReport": _rel(CLOSURE_PATH),
        },
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "resultContract": {
            "greenAllowlist": sorted(GREEN_RESULTS),
            "redAllowlist": sorted(RED_RESULTS),
            "bt93rResultInRAllowlist": result_class in GREEN_RESULTS,
            "bt93sClaimAllowed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
        },
        "lineageDecision": {
            "exactBt93nLineagePackageRestored": False,
            "missingRequiredArtifactKeys": _get(root_cause, "artifactLineage", "missingRequiredArtifactKeys"),
            "modelPackagePersisted": _get(root_cause, "artifactLineage", "modelPackagePersisted"),
            "realModelLogitsAvailable": _get(root_cause, "artifactLineage", "realModelLogitsAvailable"),
            "surfaceHashRestorationRequired": _get(root_cause, "artifactLineage", "surfaceHashRestorationRequired"),
            "closureReason": (
                "BT93R cannot prove decoder, normalize, or eval-mode fixes without the exact collapse-producing "
                "model.zip, config, VecNormalize, and BT93Q surface hash."
            ),
        },
        "claimFlags": _claim_flags(),
        "guardrails": guardrails,
        "allowNext": [
            "restore exact BT93N lineage package, then rerun BT93R artifact/root-cause/counterprobe",
            "or create a narrow lineage-recovery/retraining intake with explicit user decision",
            "93X.0 may remain read-only by PF.0, but it cannot bypass the BT93R red result",
        ],
        "opensNext": [],
        "blocksNext": list(COMMON_BLOCKED_ACTIONS),
        "recommendations": [
            {
                "rank": 1,
                "action": "Restore exact BT93N lineage package: model.zip, config, VecNormalize, and BT93Q surface hash.",
                "why": "Only that package can make decoder, normalize, eval-mode, or logit counterprobes provable.",
            },
            {
                "rank": 2,
                "action": "Keep BT93S, BT93O, BT93P, and BT94A blocked from BT93R.",
                "why": "BT93R.99 did not produce an R-Allowlist result class.",
            },
            {
                "rank": 3,
                "action": "Run 93X.0 only as read-only comparator inventory if useful.",
                "why": "It can classify the DQN/replacement-policy blocker early, but cannot open training claims.",
            },
        ],
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "actualModelTimesteps": 0,
            "bt93nActualModelTimesteps": _get(root_cause, "sampleCounts", "bt93nActualModelTimesteps"),
            "bt93qDeterministicEvalActionRows": _get(
                root_cause,
                "sampleCounts",
                "bt93qDeterministicEvalActionRows",
            ),
        },
        "summary": {
            "finalResult": result_class if ok else "closure-blocked",
            "bt93sStartDecision": "blocked",
            "bt93oStartDecision": "blocked",
            "bt93pStartDecision": "blocked",
            "bt94aStartDecision": "blocked",
            "nextBestAction": "Restore exact BT93N lineage package; otherwise keep BT93R red and do not implement 93R.4.",
        },
        "commands": {
            "write": "python python/scripts/bt93r_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    payloads = {key: _read_json(path) for key, (path, _role) in SOURCE_PATHS.items()}
    tracked = _tracked_files([path for path, _role in SOURCE_PATHS.values()])
    source_artifacts = _source_artifacts(tracked)
    generated_at = _utc_now()
    counterprobe = _build_counterprobe(payloads, source_artifacts, generated_at)
    closure = _build_closure(payloads, source_artifacts, counterprobe, generated_at)
    return counterprobe, closure


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    counterprobe, closure = build_reports()
    if args.write_report:
        _write_json(COUNTERPROBE_PATH, counterprobe)
        _write_json(CLOSURE_PATH, closure)
    print(
        json.dumps(
            {
                "ok": closure["ok"],
                "resultClass": closure["resultClass"],
                "activeBlockers": closure["activeBlockers"],
                "phaseCoverage": closure["phaseCoverage"],
                "dodCoverage": closure["dodCoverage"],
                "opensNext": closure["opensNext"],
                "blocksNext": closure["blocksNext"][:3],
                "outputs": closure["generatedArtifacts"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if closure["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
