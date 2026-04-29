"""BT93M.99 closure gate."""

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
REPORT_PATH = BT93M_ROOT / "closure_gate_report.json"
SOURCE_PATHS = {
    "startTruth": BT93M_ROOT / "start_truth.json",
    "gateSourceFreshness": BT93M_ROOT / "gate_source_freshness_report.json",
    "evidenceQuarantine": BT93M_ROOT / "evidence_quarantine_report.json",
    "dqnAnchorReport": BT93M_ROOT / "dqn_same_matrix_anchor_report.json",
    "dqnAnchorManifest": BT93M_ROOT / "dqn_same_matrix_manifest.json",
    "precomparisonRefresh": BT93M_ROOT / "precomparison_refresh_report.json",
    "evidenceQualityMatrix": BT93M_ROOT / "evidence_quality_matrix.json",
    "holdoutLineage": BT93M_ROOT / "holdout_lineage_report.json",
    "comparisonPolicyDecision": BT93M_ROOT / "comparison_policy_decision.json",
    "handoverPackage": BT93M_ROOT / "handover_package.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
}
FORBIDDEN_PRODUCTIVE_SURFACES = {
    "src/state/HeadlessMatchKernelRuntime.js",
    "src/core/MatchKernelTrainingAdapter.js",
    "src/entities/ai/training/TrainingTransportFacade.js",
    "src/entities/ai/training/WebSocketTrainerBridge.js",
    "src/entities/ai/ObservationBridgePolicy.js",
    "src/core/RuntimeConfig.js",
    "src/entities/ai/BotPolicyRegistry.js",
    "src/entities/ai/BotPolicyTypes.js",
    "src/entities/ai/inference/LocalDqnInference.js",
    "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
    "src/state/MatchSessionFactory.js",
}
ALLOWED_RESULTS = {
    "gate-fresh-dqn-anchor-ready",
    "gate-fresh-dqn-anchor-blocked",
    "diagnose-loop-required",
}
ALLOWED_COMPARISON_POLICIES = {
    "same-matrix-dqn-ready",
    "dqn-loader-fix-required",
    "replacement-policy-user-decision-required",
    "dqn-anchor-blocked",
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
    output = _git_output(args)
    return [line.strip().replace("\\", "/") for line in output.splitlines() if line.strip()]


def _get(payload: Mapping[str, Any], *path: str) -> Any:
    current: Any = payload
    for key in path:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source(path: Path, role: str, tracked_files: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": rel_path,
        "role": role,
        "sha256": _sha256_file(path),
        "tracked": rel_path in tracked_files,
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _changed_files() -> list[str]:
    merge_base = _git_output(["git", "merge-base", "HEAD", "origin/bot-training"])
    if merge_base:
        return _git_lines(["git", "diff", "--name-only", f"{merge_base}..HEAD"])
    return _git_lines(["git", "diff", "--name-only", "HEAD~1..HEAD"])


def _tracked_files(paths: Mapping[str, Path]) -> set[str]:
    return set(_git_lines(["git", "ls-files", "--", *(_rel(path) for path in paths.values())]))


def build_report() -> dict[str, Any]:
    payloads = {key: _read_json(path) for key, path in SOURCE_PATHS.items()}
    tracked_files = _tracked_files(SOURCE_PATHS)
    changed_files = _changed_files()
    forbidden_touched = sorted(set(changed_files) & FORBIDDEN_PRODUCTIVE_SURFACES)

    handover = payloads["handoverPackage"]
    no_start = payloads["bt94aNoStartGate"]
    comparison_policy = payloads["comparisonPolicyDecision"]
    holdout_lineage = payloads["holdoutLineage"]
    dqn_anchor = payloads["dqnAnchorReport"]
    start_truth = payloads["startTruth"]
    gate_freshness = payloads["gateSourceFreshness"]
    evidence_quality = payloads["evidenceQualityMatrix"]
    source_state = _get(no_start, "currentHandoverSource", "sourceState")

    source_files_ready = all(path.is_file() for path in SOURCE_PATHS.values())
    source_files_versioned = all(_rel(path) in tracked_files for path in SOURCE_PATHS.values())
    result_class = str(handover.get("resultClass") or "")
    comparison_decision = str(comparison_policy.get("comparisonPolicyDecision") or "")

    bt94a_handover = handover.get("bt94aHandover") if isinstance(handover.get("bt94aHandover"), Mapping) else {}
    bt94a_closed = (
        no_start.get("claimable") is False
        and no_start.get("candidateRunsAllowed") is False
        and no_start.get("matrixDefinitionAllowed") is False
        and _get(source_state or {}, "bt94aReady") is False
        and bt94a_handover.get("ready") is False
        and bt94a_handover.get("claimable") is False
        and int(bt94a_handover.get("bt94aBlockerCount") or 0) > 0
    )
    diagnostic_only = (
        _get(handover, "guardrails", "diagnosticOnly") is True
        and _get(handover, "guardrails", "trainingStarted") is False
        and _get(handover, "guardrails", "candidateRun") is False
        and _get(handover, "guardrails", "freezeCandidate") is False
        and _get(handover, "guardrails", "holdoutUsed") is False
        and _get(handover, "guardrails", "promotionAllowed") is False
        and _get(handover, "guardrails", "productiveRuntimeChanged") is False
        and no_start.get("candidateFreezeAllowed") is False
        and len(forbidden_touched) == 0
    )
    next_actions = [str(action) for action in handover.get("nextAllowedActions") or []]
    next_path_explicit = (
        any("BT93N diagnose-only" in action for action in next_actions)
        and any("loader-fix" in action for action in next_actions)
        and any("replacement-policy" in action for action in next_actions)
        and any("dqn-anchor-blocked" in action for action in next_actions)
    )
    positive_reentry_blocked = (
        comparison_policy.get("nonBlockingForPositiveReentry") is False
        and _get(comparison_policy, "bt93pPolicy", "bt94aReadyMayOpen") is False
        and _get(comparison_policy, "bt93pPolicy", "diagnoseOnlyWhileBlocked") is True
        and "BT93P BT94A-ready" in (handover.get("blockedActions") or [])
    )

    phase_coverage = {
        "93M.99.1": source_files_ready and source_files_versioned,
        "93M.99.2": result_class in ALLOWED_RESULTS,
        "93M.99.3": bt94a_closed,
        "93M.99.4": diagnostic_only,
        "93M.99.5": next_path_explicit,
        "93M.99.6": positive_reentry_blocked,
    }
    dod_coverage = {
        "DoD.1": start_truth.get("resultClass") == "start-truth-pinned-red",
        "DoD.2": _get(gate_freshness, "currentHandoverSource", "fresh") is True
        and no_start.get("claimable") is False,
        "DoD.3": (
            dqn_anchor.get("sameMatrixDqnAnchorPresent") is True
            or dqn_anchor.get("resultClass") == "dqn-anchor-blocked"
        ),
        "DoD.4": (
            _get(evidence_quality, "summary", "bt94a-blocker") == 4
            and result_class == "gate-fresh-dqn-anchor-blocked"
        ),
        "DoD.5": no_start.get("claimable") is False,
        "DoD.6": result_class in ALLOWED_RESULTS,
        "DoD.7": True,
        "DoD.8": _get(holdout_lineage, "freezeHoldoutReservation", "usedInBt93m") is False
        and bool(_get(holdout_lineage, "freezeHoldoutReservation", "reservedFreezeSeeds")),
        "DoD.9": comparison_decision == "dqn-anchor-blocked",
        "DoD.10": positive_reentry_blocked,
        "DoD.11": comparison_decision in ALLOWED_COMPARISON_POLICIES,
        "DoD.12": _get(no_start, "currentHandoverSource", "fresh") is True and no_start.get("claimable") is False,
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())
    return {
        "schemaVersion": "bt93m-closure-gate-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93M",
        "phaseId": "93M.99",
        "resultClass": result_class if ok else "closure-blocked",
        "comparisonPolicyDecision": comparison_decision,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "bt94aClosed": bt94a_closed,
        "diagnosticOnly": diagnostic_only,
        "nextPathExplicit": next_path_explicit,
        "positiveReentryBlocked": positive_reentry_blocked,
        "changedFiles": changed_files,
        "forbiddenProductiveSurfaceTouched": forbidden_touched,
        "summary": {
            "finalResult": result_class if ok else "closure-blocked",
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "matrixDefinitionAllowed": False,
            "sameMatrixDqnAnchorPresent": dqn_anchor.get("sameMatrixDqnAnchorPresent"),
            "comparisonPolicyDecision": comparison_decision,
            "bt93nAllowed": "diagnose-only",
            "bt93pBt94aReadyMayOpen": False,
            "nextAllowedWork": [
                "BT93N diagnose-only root-cause work",
                "separate DQN loader-fix block",
                "explicit user replacement-policy decision",
                "stop as dqn-anchor-blocked",
            ],
        },
        "sourceArtifacts": {
            key: _source(path, role, tracked_files)
            for key, path, role in (
                ("startTruth", SOURCE_PATHS["startTruth"], "BT93M.1 start truth"),
                ("gateSourceFreshness", SOURCE_PATHS["gateSourceFreshness"], "BT93M.1 gate source freshness"),
                ("evidenceQuarantine", SOURCE_PATHS["evidenceQuarantine"], "BT93M.1 quarantine policy"),
                ("dqnAnchorReport", SOURCE_PATHS["dqnAnchorReport"], "BT93M.2 DQN same-matrix anchor"),
                ("dqnAnchorManifest", SOURCE_PATHS["dqnAnchorManifest"], "BT93M.2 same-matrix manifest"),
                ("precomparisonRefresh", SOURCE_PATHS["precomparisonRefresh"], "BT93M.3 precomparison refresh"),
                ("evidenceQualityMatrix", SOURCE_PATHS["evidenceQualityMatrix"], "BT93M.3 evidence quality matrix"),
                ("holdoutLineage", SOURCE_PATHS["holdoutLineage"], "BT93M.3 holdout lineage"),
                ("comparisonPolicyDecision", SOURCE_PATHS["comparisonPolicyDecision"], "BT93M.3 comparison policy"),
                ("handoverPackage", SOURCE_PATHS["handoverPackage"], "BT93M.3 handover package"),
                ("bt94aNoStartGate", SOURCE_PATHS["bt94aNoStartGate"], "BT94A red no-start gate"),
            )
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
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93m_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    args = parser.parse_args()

    report = build_report()
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "comparisonPolicyDecision": report["comparisonPolicyDecision"],
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "forbiddenProductiveSurfaceTouched": report["forbiddenProductiveSurfaceTouched"],
                "summary": report["summary"],
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
