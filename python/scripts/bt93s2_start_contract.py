"""BT93S2.1 start contract and invalidation lock.

This phase locks the red BT93S sources before matrix-v2 work starts. It writes
diagnostic governance evidence only: no PPO training, no reward fix, no
telemetry fix, no action-surface change, and no productive runtime change.
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
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S_ROOT = PPO_ROOT / "bt93s"
BT93RR_ROOT = PPO_ROOT / "bt93r_reentry"
BT93Y_ROOT = PPO_ROOT / "bt93y"
BT93S2_ROOT = PPO_ROOT / "bt93s2"

BT93S_CLOSURE_PATH = BT93S_ROOT / "bt93s_closure_gate_report.json"
BT93S_SCENARIO_CONTRACT_PATH = BT93S_ROOT / "scenario_window_contract.json"
BT93S_ACTION_EFFECT_MANIFEST_PATH = BT93S_ROOT / "action_effect_window_manifest.json"
BT93S_EXISTING_ACTION_EFFECT_PATH = BT93S_ROOT / "existing_action_effect_report.json"
BT93S_ACTION_SURFACE_DECISION_PATH = BT93S_ROOT / "action_surface_decision.json"
BT93S_POLICY_SELECTION_PATH = BT93S_ROOT / "policy_selection_report.json"
BT93S_ACTION_SELECTION_ALIAS_PATH = BT93S_ROOT / "action_selection_report.json"
BT93RR_CLOSURE_PATH = BT93RR_ROOT / "bt93r_reentry_closure_gate_report.json"
BT93RR_HANDOVER_PATH = BT93RR_ROOT / "bt93r_reentry_handover_package.json"
BT93Y_RETRAIN_LINEAGE_PATH = BT93Y_ROOT / "retrain_lineage_manifest.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
START_CONTRACT_PATH = BT93S2_ROOT / "start_contract.json"

EXPECTED_BT93S_BLOCKERS = {
    "action-selection-required",
    "action-space-required",
    "matrix-redesign-required",
    "observation-telemetry-required",
}
EXPECTED_SCENARIO_BLOCKERS = {
    "matrixRedesignScenarioIds": {"no-danger-control"},
    "actionEffectGapScenarioIds": {"escape-right-open"},
    "selectionBlockers": {"narrowing-corridor", "side-wall-left", "side-wall-right"},
    "telemetryLimitedScenarioIds": {"trail-ahead", "trail-side"},
}
ALLOWED_BT93S2_RESULT_CLASSES = [
    "action-selection-green",
    "observation-telemetry-required",
    "matrix-redesign-required",
    "action-space-required",
    "action-selection-required",
    "action-surface-lineage-invalidated",
    "measurement-invalid",
]
BLOCKED_NEXT = [
    "BT93T claim until BT93S2.99=observation-telemetry-required",
    "BT93U claim until BT93S2.99=action-selection-green",
    "BT93V claim",
    "BT93W claim",
    "BT93O claim",
    "BT93X full claim",
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
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S2.1",
    "telemetry fix from BT93S2.1",
    "action-surface change from BT93S2.1",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
    "bt93sClosure": (
        BT93S_CLOSURE_PATH,
        "BT93S.99 red closure source for BT93S2",
        {"blockId": "BT93S", "phaseId": "93S.99", "ok": True, "resultClass": "matrix-redesign-required"},
    ),
    "bt93sScenarioContract": (
        BT93S_SCENARIO_CONTRACT_PATH,
        "BT93S.1 scenario-window contract source",
        {"blockId": "BT93S", "phaseId": "93S.1", "ok": True, "resultClass": "scenario-window-contract-green"},
    ),
    "bt93sActionEffectManifest": (
        BT93S_ACTION_EFFECT_MANIFEST_PATH,
        "BT93S.1 action-effect manifest alias",
        {"blockId": "BT93S", "phaseId": "93S.1", "ok": True, "resultClass": "scenario-window-contract-green"},
    ),
    "bt93sExistingActionEffect": (
        BT93S_EXISTING_ACTION_EFFECT_PATH,
        "BT93S.2 existing-action effect source",
        {"blockId": "BT93S", "phaseId": "93S.2", "ok": True},
    ),
    "bt93sActionSurfaceDecision": (
        BT93S_ACTION_SURFACE_DECISION_PATH,
        "BT93S.3 action-surface decision source",
        {"blockId": "BT93S", "phaseId": "93S.3", "ok": True, "resultClass": "matrix-redesign-required"},
    ),
    "bt93sPolicySelection": (
        BT93S_POLICY_SELECTION_PATH,
        "BT93S.4 policy-selection source",
        {"blockId": "BT93S", "phaseId": "93S.4", "ok": True, "resultClass": "matrix-redesign-required"},
    ),
    "bt93sActionSelectionAlias": (
        BT93S_ACTION_SELECTION_ALIAS_PATH,
        "BT93S.4 action-selection alias source",
        {"blockId": "BT93S", "phaseId": "93S.4", "ok": True, "resultClass": "matrix-redesign-required"},
    ),
    "bt93rrClosure": (
        BT93RR_CLOSURE_PATH,
        "BT93RR.99 R-Allowlist closure source",
        {"blockId": "BT93RR", "phaseId": "93RR.99", "ok": True, "resultClass": "eval-mode-bug-fixed-counterprobe-green"},
    ),
    "bt93rrHandover": (
        BT93RR_HANDOVER_PATH,
        "BT93RR.99 handover source",
        {"blockId": "BT93RR", "phaseId": "93RR.99", "ok": True, "resultClass": "eval-mode-bug-fixed-counterprobe-green"},
    ),
    "bt93yRetrainLineage": (
        BT93Y_RETRAIN_LINEAGE_PATH,
        "BT93Y retrain-lineage policy source",
        {"blockId": "BT93Y", "ok": True, "resultClass": "retrain-lineage-ready"},
    ),
    "ppoActionSurface": (
        ACTION_SURFACE_PATH,
        "current PPO action-surface decoder",
        {},
    ),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


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


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
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


def _expected_matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


def _source_artifact(path: Path, role: str, tracked: set[str], expected: Mapping[str, Any]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "expectedOk": expected_ok,
        "fresh": bool(path.is_file() and tracked_ok and expected_ok),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected in SOURCE_SPECS.values())
    return [
        {"sourceKey": key, **_source_artifact(path, role, tracked, expected)}
        for key, (path, role, expected) in SOURCE_SPECS.items()
    ]


def _as_set(value: Any) -> set[str]:
    if isinstance(value, list):
        return {str(item) for item in value}
    return set()


def _scenario_blockers(closure: Mapping[str, Any]) -> dict[str, list[str]]:
    source = closure.get("scenarioBlockers")
    source = source if isinstance(source, Mapping) else {}
    return {
        "matrixRedesignScenarioIds": sorted(_as_set(source.get("matrixRedesignScenarioIds"))),
        "actionEffectGapScenarioIds": sorted(_as_set(source.get("actionEffectGapScenarioIds"))),
        "selectionBlockers": sorted(_as_set(source.get("selectionBlockers"))),
        "telemetryLimitedScenarioIds": sorted(_as_set(source.get("telemetryLimitedScenarioIds"))),
    }


def _invalidated_bt93s_reports() -> list[dict[str, str]]:
    return [
        {
            "path": _rel(BT93S_SCENARIO_CONTRACT_PATH) or "",
            "invalidatedFor": "BT93S2 positive matrix evidence",
            "retainAs": "historical source for v2 redesign",
            "reason": "BT93S.99 found no-danger-control matrix/control semantics invalid.",
        },
        {
            "path": _rel(BT93S_ACTION_EFFECT_MANIFEST_PATH) or "",
            "invalidatedFor": "BT93S2 positive action-effect evidence",
            "retainAs": "historical source for v2 effect-window redesign",
            "reason": "Effect windows belong to the v1 matrix stopped by matrix-redesign-required.",
        },
        {
            "path": _rel(BT93S_EXISTING_ACTION_EFFECT_PATH) or "",
            "invalidatedFor": "action-selection-green and BT93U opening",
            "retainAs": "source evidence for escape-right-open action-space gap",
            "reason": "Existing action-effect was measured on the invalid v1 control matrix.",
        },
        {
            "path": _rel(BT93S_ACTION_SURFACE_DECISION_PATH) or "",
            "invalidatedFor": "final BT93S2 action-surface decision",
            "retainAs": "source decision explaining why BT93S deferred action-surface change",
            "reason": "S2 must re-decide after matrix-v2 and action-effect-v2 evidence.",
        },
        {
            "path": _rel(BT93S_POLICY_SELECTION_PATH) or "",
            "invalidatedFor": "BT93U opening",
            "retainAs": "source evidence for v1 selection blockers",
            "reason": "Policy selection before matrix-v2/action-effect-v2 cannot be positive S2 evidence.",
        },
        {
            "path": _rel(BT93S_ACTION_SELECTION_ALIAS_PATH) or "",
            "invalidatedFor": "BT93U opening",
            "retainAs": "alias of v1 policy-selection source",
            "reason": "Alias inherits the policy-selection invalidation.",
        },
    ]


def _claim_flags() -> dict[str, bool]:
    return {
        "bt93s2NextPhaseAllowed": True,
        "bt93tClaimAllowed": False,
        "bt93uClaimAllowed": False,
        "bt93vClaimAllowed": False,
        "bt93wClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93xFullClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "bt95HandoffAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignalAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newOptimizerUpdates": 0,
        "newEvalRunStarted": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "qualityClaimAllowed": False,
    }


def build_report() -> dict[str, Any]:
    payloads = {key: _read_json(path) for key, (path, _role, _expected) in SOURCE_SPECS.items()}
    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] and item["fresh"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)

    closure = payloads["bt93sClosure"]
    scenario_contract = payloads["bt93sScenarioContract"]
    rr_closure = payloads["bt93rrClosure"]
    rr_handover = payloads["bt93rrHandover"]
    retrain_lineage = payloads["bt93yRetrainLineage"]

    active_blockers = sorted(_as_set(closure.get("activeBlockers")))
    scenario_blockers = _scenario_blockers(closure)
    blocker_match = EXPECTED_BT93S_BLOCKERS <= set(active_blockers)
    scenario_match = all(EXPECTED_SCENARIO_BLOCKERS[key] <= set(values) for key, values in scenario_blockers.items())

    current_action_surface_hash = _sha256_file(ACTION_SURFACE_PATH)
    bt93s_decoder_hash = _get(scenario_contract, "actionSurface", "decoderHash")
    bt93y_action_hash = _get(retrain_lineage, "actionSurface", "sourceSha256")
    action_surface_id = (
        closure.get("actionSurfaceId")
        or _get(scenario_contract, "actionSurface", "surfaceId")
        or _get(retrain_lineage, "actionSurface", "surfaceId")
    )
    action_surface_hashes_match = bool(
        current_action_surface_hash
        and current_action_surface_hash == bt93s_decoder_hash
        and current_action_surface_hash == bt93y_action_hash
    )

    rr_lineage = rr_closure.get("lineage") if isinstance(rr_closure.get("lineage"), Mapping) else {}
    rr_handover_lineage = rr_handover.get("lineage") if isinstance(rr_handover.get("lineage"), Mapping) else {}
    policy_lineage_lock = {
        "lineageId": rr_lineage.get("lineageId") or retrain_lineage.get("lineageId"),
        "lineageKind": rr_lineage.get("lineageKind") or retrain_lineage.get("lineageKind"),
        "notBt93nLineage": rr_lineage.get("notBt93nLineage") or retrain_lineage.get("notBt93nLineage"),
        "matrixId": rr_lineage.get("matrixId") or retrain_lineage.get("matrixId"),
        "matrixHash": rr_lineage.get("matrixHash") or retrain_lineage.get("matrixHash"),
        "rewardProfileId": rr_lineage.get("rewardProfileId") or retrain_lineage.get("rewardProfileId"),
        "semanticWindow": rr_lineage.get("semanticWindow") or retrain_lineage.get("semanticWindow"),
        "actionSurfaceId": rr_lineage.get("actionSurfaceId") or action_surface_id,
        "bt93rrClosureResultClass": rr_closure.get("resultClass"),
        "bt93rrHandoverResultClass": rr_handover.get("resultClass"),
        "bt93yRetrainResultClass": retrain_lineage.get("resultClass"),
        "bt93rrAndHandoverAgree": rr_lineage == rr_handover_lineage,
    }
    action_surface_hash_lock = {
        "actionSurfaceId": action_surface_id,
        "decoderPath": _rel(ACTION_SURFACE_PATH),
        "currentSourceSha256": current_action_surface_hash,
        "bt93sScenarioDecoderHash": bt93s_decoder_hash,
        "bt93yRetrainSourceSha256": bt93y_action_hash,
        "hashesMatch": action_surface_hashes_match,
    }

    source_contract_matches = bool(
        closure.get("ok") is True
        and closure.get("resultClass") == "matrix-redesign-required"
        and rr_closure.get("ok") is True
        and rr_closure.get("resultClass") == "eval-mode-bug-fixed-counterprobe-green"
        and rr_handover.get("ok") is True
        and retrain_lineage.get("ok") is True
        and blocker_match
        and scenario_match
        and action_surface_hashes_match
    )
    source_valid = bool(source_files_ready and source_files_versioned and source_contract_matches)
    result_class = "start-contract-locked" if source_valid else "measurement-invalid"
    local_claim_flags = _claim_flags()
    if not source_valid:
        local_claim_flags["bt93s2NextPhaseAllowed"] = False

    phase_coverage = {
        "93S2.1.1": bool(source_files_ready and policy_lineage_lock["lineageId"] and action_surface_hash_lock["currentSourceSha256"]),
        "93S2.1.2": bool(
            active_blockers
            and any(scenario_blockers.values())
            and _invalidated_bt93s_reports()
            and BLOCKED_NEXT
            and ALLOWED_BT93S2_RESULT_CLASSES
        ),
        "93S2.1.3": bool((source_valid and result_class == "start-contract-locked") or (not source_valid and result_class == "measurement-invalid")),
    }
    dod_coverage = {
        "DoD.S2R1": bool(
            source_valid
            and policy_lineage_lock["lineageId"]
            and action_surface_hash_lock["hashesMatch"]
            and active_blockers
            and closure.get("sampleCounts")
            and closure.get("claimFlags")
        )
    }
    ok = bool(source_valid and all(phase_coverage.values()) and all(dod_coverage.values()))
    if not ok:
        result_class = "measurement-invalid"
        local_claim_flags["bt93s2NextPhaseAllowed"] = False

    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2-start-contract-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2_start_contract.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93S2",
        "phaseId": "93S2.1",
        "resultClass": result_class,
        "matrixId": "bt93s2-walltrail-action-effect-matrix-v2-pending",
        "sourceMatrixId": closure.get("matrixId"),
        "sourceContractId": closure.get("contractId"),
        "actionSurfaceId": action_surface_id,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceContractMatches": source_contract_matches,
        "sourceArtifacts": source_artifacts,
        "policyLineageLock": policy_lineage_lock,
        "actionSurfaceHashLock": action_surface_hash_lock,
        "activeBlockers": active_blockers,
        "scenarioIds": {
            "matrixRedesign": scenario_blockers["matrixRedesignScenarioIds"],
            "actionEffectGap": scenario_blockers["actionEffectGapScenarioIds"],
            "selectionBlockers": scenario_blockers["selectionBlockers"],
            "telemetryLimited": scenario_blockers["telemetryLimitedScenarioIds"],
        },
        "scenarioBlockers": scenario_blockers,
        "sampleCounts": closure.get("sampleCounts") if isinstance(closure.get("sampleCounts"), Mapping) else {},
        "claimFlags": local_claim_flags,
        "upstreamClaimFlags": closure.get("claimFlags") if isinstance(closure.get("claimFlags"), Mapping) else {},
        "guardrails": _guardrails(),
        "allowedResultClasses": list(ALLOWED_BT93S2_RESULT_CLASSES),
        "invalidatedBt93sReports": _invalidated_bt93s_reports(),
        "invalidations": [
            {
                "scope": "BT93S positive evidence",
                "reason": "BT93S.99 ended matrix-redesign-required; BT93S reports may seed BT93S2 but cannot open BT93T/U.",
            },
            {
                "scope": "BT93T/BT93U opening",
                "reason": "Only BT93S2.99 may open BT93T or BT93U with the allowed result-class contract.",
            },
        ],
        "allowNext": ["93S2.2 Matrix-v2 Contract und Scenario Search"] if ok else [],
        "opensNext": [],
        "blocksNext": list(BLOCKED_NEXT),
        "recommendations": [
            {
                "rank": "1",
                "action": "Run 93S2.2 Matrix-v2 Contract und Scenario Search.",
                "why": "The red BT93S sources are locked, versioned, and invalidated for positive evidence; v2 must repair no-danger-control and escape-right-open before action-effect or selection can be judged.",
            }
        ]
        if ok
        else [
            {
                "rank": "1",
                "action": "Repair missing/untracked/mismatched BT93S2 start sources before continuing.",
                "why": "BT93S2.1 can only open 93S2.2 when BT93S.99, 93S.1-93S.4, BT93RR.99, policy lineage, and action-surface hash are coherent.",
            }
        ],
        "commands": {
            "write": "python python/scripts/bt93s2_start_contract.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "summary": {
            "finalResult": result_class,
            "blockers": active_blockers,
            "nextBestAction": "93S2.2" if ok else "source repair",
            "bt93tAllowed": False,
            "bt93uAllowed": False,
            "bt93oP94aStillClosed": True,
        },
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(START_CONTRACT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "activeBlockers": report["activeBlockers"],
                "scenarioIds": report["scenarioIds"],
                "claimFlags": report["claimFlags"],
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "allowNext": report["allowNext"],
                "output": _rel(START_CONTRACT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
