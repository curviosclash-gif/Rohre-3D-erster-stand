"""BT93M.1 start truth, gate-source freshness, and quarantine reports.

This script is report-only. It does not run PPO training, create candidates,
touch holdout data, or modify productive runtime surfaces.
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

START_TRUTH_PATH = BT93M_ROOT / "start_truth.json"
GATE_SOURCE_FRESHNESS_PATH = BT93M_ROOT / "gate_source_freshness_report.json"
EVIDENCE_QUARANTINE_PATH = BT93M_ROOT / "evidence_quarantine_report.json"

SOURCE_PATHS = {
    "bt93jPostLongrunDecision": PPO_ROOT / "bt93j" / "post_longrun_decision_report.json",
    "bt93jUserOwnedLongrun": PPO_ROOT / "bt93j" / "user_owned_1m_longrun_report.json",
    "bt93kHandover": PPO_ROOT / "bt93k" / "handover_package.json",
    "bt93lClosureGate": PPO_ROOT / "bt93l" / "closure_gate_report.json",
    "bt93lHandover": PPO_ROOT / "bt93l" / "handover_package.json",
    "bt93lMicroPpoSignal": PPO_ROOT / "bt93l" / "micro_ppo_signal_report.json",
    "bt93lBaselineMatrix": PPO_ROOT / "bt93l" / "baseline_matrix_report.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
    "v101Plan": REPO_ROOT / "docs" / "plaene" / "aktiv" / "V101.md",
    "aiArchitectureContext": REPO_ROOT / "docs" / "referenz" / "ai_architecture_context.md",
    "authoritySnapshot": REPO_ROOT / "python" / "bridge" / "authority_snapshot.py",
}

QUARANTINE_PATHS = {
    "userOwned4EnvFailureReport": REPO_ROOT
    / "docs"
    / "Fehlerberichte"
    / "2026-04-27_user-owned-4env-longrun-ended-without-final-report.md",
    "userOwned3mConfig": REPO_ROOT / "python" / "configs" / "ppo_user_owned_survival_3m_longrun.json",
    "userOwned3m4EnvConfig": REPO_ROOT / "python" / "configs" / "ppo_user_owned_survival_3m_4env_longrun.json",
    "userOwnedStartScript": REPO_ROOT / "dev" / "scripts" / "start-user-owned-ppo-survival-3m-longrun.ps1",
    "userOwnedSwitchScript": REPO_ROOT / "dev" / "scripts" / "switch-user-owned-ppo-survival-to-4env-at-next-checkpoint.ps1",
    "userOwnedStopScript": REPO_ROOT / "dev" / "scripts" / "stop-user-owned-ppo-survival-at-next-checkpoint.ps1",
    "historicalBotValidation": REPO_ROOT / "data" / "bot_validation_report.json",
    "historicalPerformanceBaseline": REPO_ROOT / "data" / "performance_ki_baseline_report.json",
}

CONTRACT_SURFACES = [
    "src/state/training/TrainingDomain.js",
    "src/entities/ai/ObservationBridgePolicy.js",
    "src/entities/ai/observation/RuntimeNearObservationAdapter.js",
    "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
    "src/core/RuntimeConfig.js",
    "src/entities/ai/BotPolicyRegistry.js",
    "src/entities/ai/BotPolicyTypes.js",
    "src/entities/ai/inference/LocalDqnInference.js",
    "src/state/training/RewardCalculator.js",
    "src/entities/ai/training/TrainingContractV1.js",
    "src/entities/ai/training/TrainerPayloadAdapter.js",
]

PRODUCTIVE_RUNTIME_PREFIXES = (
    "src/",
    "electron/",
    "scripts/training-headless",
    "scripts/training-single-env-bridge",
    "dev/scripts/training-",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
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


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_status_paths() -> list[str]:
    output = _git_output(["git", "status", "--short"])
    paths: list[str] = []
    for line in output.splitlines():
        if len(line) < 4:
            continue
        raw_path = line[3:].strip()
        if " -> " in raw_path:
            raw_path = raw_path.split(" -> ", 1)[1].strip()
        paths.append(raw_path.replace("\\", "/"))
    return paths


def _artifact_info(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    info: dict[str, Any] = {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
        "closureCapable": closure_capable,
    }
    for key in (
        "ok",
        "blockId",
        "phaseId",
        "resultClass",
        "claimable",
        "candidateRunsAllowed",
        "matrixDefinitionAllowed",
    ):
        if key in payload:
            info[key] = payload.get(key)
    return info


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _bt94a_state(no_start: Mapping[str, Any]) -> dict[str, Any]:
    state = no_start.get("bt93cState") if isinstance(no_start.get("bt93cState"), Mapping) else {}
    source = no_start.get("currentHandoverSource") if isinstance(no_start.get("currentHandoverSource"), Mapping) else {}
    return {
        "resultClass": no_start.get("resultClass"),
        "claimable": no_start.get("claimable"),
        "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
        "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
        "candidateFreezeAllowed": no_start.get("candidateFreezeAllowed"),
        "precomparisonResultClass": state.get("precomparisonResultClass"),
        "bt94aBlockerCount": state.get("bt94aBlockerCount"),
        "remainingBt94aGates": state.get("remainingBt94aGates") or [],
        "currentHandoverSource": source,
        "noStartStatus": _get(no_start, "noStartDecision", "status"),
        "noStartReason": _get(no_start, "noStartDecision", "reason"),
    }


def _contract_drift_status() -> dict[str, Any]:
    status_paths = _git_status_paths()
    productive_dirty = [
        path
        for path in status_paths
        if path.startswith(PRODUCTIVE_RUNTIME_PREFIXES)
    ]
    missing_contract_surfaces = [
        path for path in CONTRACT_SURFACES if not (REPO_ROOT / path).is_file()
    ]
    source_artifacts = {
        "v101Plan": _artifact_info(SOURCE_PATHS["v101Plan"], "closed V101 contract-hardening plan"),
        "aiArchitectureContext": _artifact_info(
            SOURCE_PATHS["aiArchitectureContext"],
            "authoritative BT90-BT95 layer context",
        ),
        "authoritySnapshot": _artifact_info(
            SOURCE_PATHS["authoritySnapshot"],
            "Python read-only authority snapshot",
        ),
    }
    return {
        "resultClass": (
            "no-ppo-contract-drift"
            if not productive_dirty and not missing_contract_surfaces
            else "ppo-contract-drift-blocker"
        ),
        "productiveRuntimeDirtyPaths": productive_dirty,
        "missingContractSurfaces": missing_contract_surfaces,
        "checkedSurfaces": CONTRACT_SURFACES,
        "sourceArtifacts": source_artifacts,
        "rules": {
            "productiveRuntimeSurfacesReadOnly": True,
            "runtimeAiHubRegistryRolloutSurfacesTouched": bool(productive_dirty),
            "v101FollowupRequiredWhenDrift": bool(productive_dirty or missing_contract_surfaces),
        },
    }


def build_quarantine_report() -> dict[str, Any]:
    source_artifacts = {
        key: _artifact_info(path, role, closure_capable=False)
        for key, path, role in (
            ("userOwned4EnvFailureReport", QUARANTINE_PATHS["userOwned4EnvFailureReport"], "quarantined user-owned 4-env failure report"),
            ("userOwned3mConfig", QUARANTINE_PATHS["userOwned3mConfig"], "user-owned 3M config, diagnostic only"),
            ("userOwned3m4EnvConfig", QUARANTINE_PATHS["userOwned3m4EnvConfig"], "user-owned 3M/4-env config, diagnostic only"),
            ("userOwnedStartScript", QUARANTINE_PATHS["userOwnedStartScript"], "manual side-lane start helper"),
            ("userOwnedSwitchScript", QUARANTINE_PATHS["userOwnedSwitchScript"], "manual side-lane 4-env switch helper"),
            ("userOwnedStopScript", QUARANTINE_PATHS["userOwnedStopScript"], "manual side-lane stop helper"),
            ("historicalBotValidation", QUARANTINE_PATHS["historicalBotValidation"], "historical DQN/bot validation context"),
            ("historicalPerformanceBaseline", QUARANTINE_PATHS["historicalPerformanceBaseline"], "historical performance baseline context"),
        )
    }
    return {
        "schemaVersion": "bt93m-evidence-quarantine-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_start_truth.py",
        "blockId": "BT93M",
        "phaseId": "93M.1.4",
        "resultClass": "evidence-quarantine-pinned",
        "quarantineClass": "diagnostic-context-only",
        "sourceArtifacts": source_artifacts,
        "quarantinedEvidence": {
            "userOwned3m4EnvSideLane": {
                "status": "quarantined",
                "reason": (
                    "User-owned 3M/4-env traces lack final runner report, controlled BT93M run kind, "
                    "freeze-holdout lineage, and PPO-Validate/candidate binding."
                ),
                "validAs": ["diagnostic context"],
                "invalidAs": [
                    "closure evidence",
                    "baseline",
                    "candidate",
                    "freeze",
                    "holdout",
                    "promote",
                    "PPO-Validate",
                    "BT94A-ready",
                ],
            },
            "historicalDqnReports": {
                "status": "context-only",
                "reason": "Historical reports are not same-matrix DQN anchors for the BT93L/BT93M matrix.",
                "validAs": ["historical context"],
                "invalidAs": [
                    "same-matrix DQN anchor",
                    "PPO survival baseline",
                    "candidate/freeze evidence",
                    "BT94A opening evidence",
                ],
            },
        },
        "phaseCoverage": {
            "93M.1.4": True,
        },
        "nextAllowedUse": [
            "reference as quarantined context",
            "exclude from closure, baseline, candidate, holdout, freeze, promote, and validate claims",
        ],
    }


def build_start_truth() -> dict[str, Any]:
    bt93j_post = _read_json(SOURCE_PATHS["bt93jPostLongrunDecision"])
    bt93j_longrun = _read_json(SOURCE_PATHS["bt93jUserOwnedLongrun"])
    bt93k_handover = _read_json(SOURCE_PATHS["bt93kHandover"])
    bt93l_closure = _read_json(SOURCE_PATHS["bt93lClosureGate"])
    bt93l_handover = _read_json(SOURCE_PATHS["bt93lHandover"])
    bt93l_micro = _read_json(SOURCE_PATHS["bt93lMicroPpoSignal"])
    bt93l_baseline = _read_json(SOURCE_PATHS["bt93lBaselineMatrix"])
    bt94a_no_start = _read_json(SOURCE_PATHS["bt94aNoStartGate"])

    bt94a_state = _bt94a_state(bt94a_no_start)
    micro_decision = bt93l_micro.get("decision") if isinstance(bt93l_micro.get("decision"), Mapping) else {}
    micro_train = bt93l_micro.get("trainSummary") if isinstance(bt93l_micro.get("trainSummary"), Mapping) else {}
    baseline_summary = bt93l_baseline.get("summary") if isinstance(bt93l_baseline.get("summary"), Mapping) else {}
    contract_drift = _contract_drift_status()
    source_artifacts = {
        key: _artifact_info(path, role)
        for key, path, role in (
            ("bt93jPostLongrunDecision", SOURCE_PATHS["bt93jPostLongrunDecision"], "BT93J red post-longrun decision"),
            ("bt93jUserOwnedLongrun", SOURCE_PATHS["bt93jUserOwnedLongrun"], "BT93J 1M user-owned diagnostic longrun"),
            ("bt93kHandover", SOURCE_PATHS["bt93kHandover"], "BT93K diagnose-loop-required handover"),
            ("bt93lClosureGate", SOURCE_PATHS["bt93lClosureGate"], "BT93L closure gate"),
            ("bt93lHandover", SOURCE_PATHS["bt93lHandover"], "BT93L handover"),
            ("bt93lMicroPpoSignal", SOURCE_PATHS["bt93lMicroPpoSignal"], "BT93L micro PPO signal"),
            ("bt93lBaselineMatrix", SOURCE_PATHS["bt93lBaselineMatrix"], "BT93L baseline matrix"),
            ("bt94aNoStartGate", SOURCE_PATHS["bt94aNoStartGate"], "BT94A no-start gate"),
        )
    }
    no_go = [
        {
            "id": "death-before60-still-open",
            "observed": micro_train.get("deathBefore60Count"),
            "effect": "50k extension and BT94A-ready remain blocked.",
        },
        {
            "id": "extension50k-disallowed",
            "observed": micro_decision.get("extension50kAllowed"),
            "effect": "No further PPO longrun from BT93L/BT93M.1.",
        },
        {
            "id": "same-matrix-dqn-anchor-missing",
            "observed": baseline_summary.get("sameMatrixDqnAnchorPresent"),
            "effect": "BT93M.2 must load a DQN anchor or document a concrete blocker/decision.",
        },
        {
            "id": "bt94a-no-start-red",
            "observed": {
                "claimable": bt94a_state["claimable"],
                "candidateRunsAllowed": bt94a_state["candidateRunsAllowed"],
                "matrixDefinitionAllowed": bt94a_state["matrixDefinitionAllowed"],
                "precomparisonResultClass": bt94a_state["precomparisonResultClass"],
                "bt94aBlockerCount": bt94a_state["bt94aBlockerCount"],
            },
            "effect": "No BT94A claim, candidate run, freeze, promote, rollout, or BT95 handoff.",
        },
    ]
    return {
        "schemaVersion": "bt93m-start-truth-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_start_truth.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93M",
        "phaseId": "93M.1",
        "resultClass": "start-truth-pinned-red",
        "currentHandoverSource": {
            "blockId": "BT93M",
            "phaseId": "93M.1",
            "sourceArtifact": _rel(START_TRUTH_PATH),
            "resultField": "resultClass",
            "resultClass": "start-truth-pinned-red",
            "fresh": True,
        },
        "sourceArtifacts": source_artifacts,
        "statusTruth": {
            "BT93J": {
                "resultClass": bt93j_post.get("resultClass"),
                "phase93J6Allowed": _get(bt93j_post, "decision", "phase93J6Allowed"),
                "survivalOutcome": bt93j_post.get("survivalOutcome"),
                "longrunResultClass": bt93j_longrun.get("resultClass"),
            },
            "BT93K": {
                "resultClass": bt93k_handover.get("resultClass"),
                "bt94aHandover": bt93k_handover.get("bt94aHandover"),
                "signalGate": _get(bt93k_handover, "ladderDecision", "signalGate"),
            },
            "BT93L": {
                "closureResultClass": bt93l_closure.get("resultClass"),
                "handoverResultClass": bt93l_handover.get("resultClass"),
                "microPpoResultClass": bt93l_micro.get("resultClass"),
                "trainDeathBefore60Count": micro_train.get("deathBefore60Count"),
                "extension50kAllowed": micro_decision.get("extension50kAllowed"),
                "sameMatrixDqnAnchorPresent": baseline_summary.get("sameMatrixDqnAnchorPresent"),
                "baselineMatrixResultClass": bt93l_baseline.get("resultClass"),
                "blockers": bt93l_handover.get("blockers") or [],
            },
            "BT94A": bt94a_state,
        },
        "noGoSignals": no_go,
        "allowedNextActions": [
            "BT93M.2 same-matrix DQN anchor load/loader-blocker diagnosis",
            "BT93M.3 comparator/no-start refresh after anchor decision",
            "record fresh red gate status",
        ],
        "forbiddenActions": [
            "PPO longrun",
            "baseline claim",
            "BT94A candidate run",
            "freeze candidate",
            "holdout consumption",
            "PPO-Validate or promote signal",
            "runtime rollout or JS inference integration",
        ],
        "v101AuthoritySchemaFollowup": contract_drift,
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
        },
        "phaseCoverage": {
            "93M.1.1": True,
            "93M.1.4": True,
            "93M.1.5": contract_drift["resultClass"] == "no-ppo-contract-drift",
        },
    }


def build_gate_source_freshness_report() -> dict[str, Any]:
    no_start = _read_json(SOURCE_PATHS["bt94aNoStartGate"])
    bt94a_state = _bt94a_state(no_start)
    current = bt94a_state["currentHandoverSource"]
    source_state = current.get("sourceState") if isinstance(current.get("sourceState"), Mapping) else {}
    bt93m_handover_path = BT93M_ROOT / "handover_package.json"
    allowed_sources = {
        _rel(START_TRUTH_PATH): "BT93M start_truth.json",
        _rel(bt93m_handover_path): "BT93M handover_package.json",
    }
    current_source = str(current.get("sourceArtifact") or "").replace("\\", "/")
    expected_source = {
        "blockId": "BT93M",
        "phaseId": "93M.1",
        "sourceArtifact": _rel(START_TRUTH_PATH),
        "resultField": "resultClass",
        "alsoAllowedAfter93M3": _rel(bt93m_handover_path),
    }
    fresh = (
        current.get("blockId") == "BT93M"
        and current_source in allowed_sources
    )
    red_but_fresh = fresh and bt94a_state["claimable"] is False
    stale_reason = None
    if not fresh:
        stale_reason = (
            f"bt94a_gate_check.py still reports {current.get('blockId')} from "
            f"{current.get('sourceArtifact')} instead of a BT93M start_truth/handover source."
        )
    return {
        "schemaVersion": "bt93m-gate-source-freshness-v1",
        "ok": fresh and red_but_fresh,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_start_truth.py",
        "blockId": "BT93M",
        "phaseId": "93M.1.3",
        "resultClass": "gate-source-fresh-red" if fresh else "gate-source-stale-blocker",
        "currentHandoverSource": current,
        "expectedHandoverSource": expected_source,
        "acceptedFreshSource": allowed_sources.get(current_source),
        "fresh": fresh,
        "staleReason": stale_reason,
        "resultField": source_state.get("resultClass") if source_state else no_start.get("resultClass"),
        "noStartReason": bt94a_state["noStartReason"] or bt94a_state["noStartStatus"],
        "bt94aGateTruth": {
            "claimable": bt94a_state["claimable"],
            "candidateRunsAllowed": bt94a_state["candidateRunsAllowed"],
            "matrixDefinitionAllowed": bt94a_state["matrixDefinitionAllowed"],
            "candidateFreezeAllowed": bt94a_state["candidateFreezeAllowed"],
            "precomparisonResultClass": bt94a_state["precomparisonResultClass"],
            "bt94aBlockerCount": bt94a_state["bt94aBlockerCount"],
            "redButFresh": red_but_fresh,
        },
        "sourceArtifacts": {
            "bt93mStartTruth": _artifact_info(START_TRUTH_PATH, "BT93M.1 start truth"),
            "bt94aNoStartGate": _artifact_info(SOURCE_PATHS["bt94aNoStartGate"], "BT94A gate check after BT93M source detection"),
        },
        "phaseCoverage": {
            "93M.1.2": fresh and bt94a_state["claimable"] is False,
            "93M.1.3": fresh and bool(current.get("sourceArtifact")) and bool(source_state.get("resultClass")),
            "93M.1.6": red_but_fresh and not stale_reason,
        },
        "nextAllowedActions": [
            "BT93M.2 DQN same-matrix anchor diagnosis",
            "keep BT94A closed while red raw findings remain",
        ],
        "blockedActions": [
            "BT94A candidate run",
            "freeze candidate",
            "BT94B handover",
            "promote",
            "rollout-ready wording",
        ],
    }


def main() -> int:
    global BT93M_ROOT, START_TRUTH_PATH, GATE_SOURCE_FRESHNESS_PATH, EVIDENCE_QUARANTINE_PATH
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write BT93M.1 reports.")
    parser.add_argument(
        "--write-gate-source-only",
        action="store_true",
        help="Refresh only gate_source_freshness_report.json from the existing start_truth/no_start_gate pair.",
    )
    parser.add_argument("--output-root", type=Path, default=BT93M_ROOT)
    args = parser.parse_args()

    BT93M_ROOT = args.output_root.resolve()
    START_TRUTH_PATH = BT93M_ROOT / "start_truth.json"
    GATE_SOURCE_FRESHNESS_PATH = BT93M_ROOT / "gate_source_freshness_report.json"
    EVIDENCE_QUARANTINE_PATH = BT93M_ROOT / "evidence_quarantine_report.json"

    if args.write_gate_source_only:
        gate_source = build_gate_source_freshness_report()
        _write_json(GATE_SOURCE_FRESHNESS_PATH, gate_source)
        summary = {
            "ok": bool(gate_source["ok"]),
            "gateSourceResultClass": gate_source["resultClass"],
            "outputs": {
                "gateSourceFreshness": _rel(GATE_SOURCE_FRESHNESS_PATH),
            },
        }
        print(json.dumps(summary, indent=2, sort_keys=True))
        return 0 if summary["ok"] else 1

    quarantine = build_quarantine_report()
    start_truth = build_start_truth()
    gate_source = build_gate_source_freshness_report()

    if args.write_report:
        _write_json(EVIDENCE_QUARANTINE_PATH, quarantine)
        _write_json(START_TRUTH_PATH, start_truth)
        gate_source = build_gate_source_freshness_report()
        _write_json(GATE_SOURCE_FRESHNESS_PATH, gate_source)

    summary = {
        "ok": bool(start_truth["ok"]) and bool(quarantine["ok"]) and bool(gate_source["ok"]),
        "startTruthResultClass": start_truth["resultClass"],
        "gateSourceResultClass": gate_source["resultClass"],
        "quarantineResultClass": quarantine["resultClass"],
        "outputs": {
            "startTruth": _rel(START_TRUTH_PATH),
            "gateSourceFreshness": _rel(GATE_SOURCE_FRESHNESS_PATH),
            "evidenceQuarantine": _rel(EVIDENCE_QUARANTINE_PATH),
        },
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
