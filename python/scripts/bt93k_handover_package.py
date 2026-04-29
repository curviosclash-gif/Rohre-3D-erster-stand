"""BT93K.7 handover package and BT94A gate discipline.

This script records the BT93K outcome from the signal-gated ladder. It does
not refresh BT94A to green, run candidates, create a freeze candidate, promote,
or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
BT93K_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93k"
BT94A_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt94a"

LONGRUN_LADDER_PATH = BT93K_ROOT / "longrun_ladder_decision_report.json"
HANDOVER_PATH = BT93K_ROOT / "handover_package.json"
NO_START_GATE_PATH = BT94A_ROOT / "no_start_gate.json"

SOURCE_REPORTS = {
    "preflightQuarantine": BT93K_ROOT / "preflight_quarantine_report.json",
    "startTruth": BT93K_ROOT / "start_truth.json",
    "signalMetricContract": BT93K_ROOT / "signal_metric_contract.json",
    "supervisorContract": BT93K_ROOT / "supervisor_contract_report.json",
    "runnerSignalRepair": BT93K_ROOT / "runner_signal_repair_report.json",
    "modeMapSmoke": BT93K_ROOT / "mode_map_smoke_report.json",
    "envScaleSmoke": BT93K_ROOT / "env_scale_smoke_report.json",
    "cudaBenchmark": BT93K_ROOT / "cuda_benchmark_report.json",
    "longrunLadder": LONGRUN_LADDER_PATH,
    "bt94aNoStartGate": NO_START_GATE_PATH,
}

ALLOWED_RESULT_CLASSES = {"diagnose-loop-required", "diagnose-improved", "BT94A-ready", "blocked"}
FORBIDDEN_RESULT_WORDS = (
    "candidate",
    "freeze-candidate",
    "promote",
    "rollout-ready",
    "BT94B-ready",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(value: str | Path) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str | None:
    if not path.exists():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "exists": path.exists(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_float(value: Any) -> float | None:
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def _first_run(ladder: Mapping[str, Any]) -> Mapping[str, Any]:
    runs = ladder.get("runs")
    if isinstance(runs, list) and runs and isinstance(runs[0], Mapping):
        return runs[0]
    return {}


def _no_start_status(no_start_gate: Mapping[str, Any]) -> dict[str, Any]:
    bt93c_state = no_start_gate.get("bt93cState") if isinstance(no_start_gate.get("bt93cState"), Mapping) else {}
    return {
        "path": _rel(NO_START_GATE_PATH),
        "claimable": no_start_gate.get("claimable") is True,
        "candidateRunsAllowed": no_start_gate.get("candidateRunsAllowed") is True,
        "matrixDefinitionAllowed": no_start_gate.get("matrixDefinitionAllowed") is True,
        "candidateFreezeAllowed": no_start_gate.get("candidateFreezeAllowed") is True,
        "resultClass": no_start_gate.get("resultClass"),
        "precomparisonResultClass": bt93c_state.get("precomparisonResultClass"),
        "bt94aBlockerCount": bt93c_state.get("bt94aBlockerCount"),
        "remainingBt94aGates": bt93c_state.get("remainingBt94aGates") or [],
        "currentHandoverSource": no_start_gate.get("currentHandoverSource"),
    }


def _bt94a_gate_green(no_start_gate: Mapping[str, Any]) -> bool:
    state = _no_start_status(no_start_gate)
    return bool(
        state["claimable"]
        and state["candidateRunsAllowed"]
        and state["matrixDefinitionAllowed"]
        and int(state["bt94aBlockerCount"] or 0) == 0
        and state["precomparisonResultClass"] != "ppo-regression"
    )


def _result_class(ladder: Mapping[str, Any], no_start_gate: Mapping[str, Any]) -> str:
    signal_gate = ladder.get("signalGate") if isinstance(ladder.get("signalGate"), Mapping) else {}
    summary = ladder.get("summary") if isinstance(ladder.get("summary"), Mapping) else {}
    if ladder.get("ok") is not True:
        return "blocked"
    if _bt94a_gate_green(no_start_gate) and summary.get("bt94aClaimAllowed") is True:
        return "BT94A-ready"
    if signal_gate.get("longerRunAllowed") is True:
        return "diagnose-improved"
    return "diagnose-loop-required"


def _blockers(ladder: Mapping[str, Any], no_start_gate: Mapping[str, Any]) -> list[dict[str, Any]]:
    signal_gate = ladder.get("signalGate") if isinstance(ladder.get("signalGate"), Mapping) else {}
    run = _first_run(ladder)
    survival = _get(run, "summary", "survival") or {}
    terminal = _get(run, "summary", "terminalSignal") or {}
    reward = _get(run, "summary", "rewardSignal") or {}
    no_start = _no_start_status(no_start_gate)
    blockers: list[dict[str, Any]] = []

    observed_steps = _as_float(signal_gate.get("avgStepsPerEpisodeObserved"))
    start_steps = _as_float(signal_gate.get("startAvgStepsPerEpisode"))
    if observed_steps is not None and start_steps is not None and observed_steps < start_steps:
        blockers.append(
            {
                "id": "F.05",
                "gate": "93K.7/BT94A",
                "severity": "critical",
                "observed": {
                    "avgStepsPerEpisodeObserved": observed_steps,
                    "startAvgStepsPerEpisode": start_steps,
                    "completedEpisodeCount": survival.get("completedEpisodeCount"),
                },
                "effect": "BT94A bleibt geschlossen; Survival-First regressiert gegen die gepinnte Startmatrix.",
            }
        )
    if terminal.get("naturalTerminalCount") in {0, "0"} or terminal.get("naturalTerminalShare") in {0, 0.0, "0"}:
        blockers.append(
            {
                "id": "F.19",
                "gate": "93K.7/BT94A",
                "severity": "critical",
                "observed": {
                    "naturalTerminalCount": terminal.get("naturalTerminalCount"),
                    "naturalTerminalShare": terminal.get("naturalTerminalShare"),
                    "terminalReasonCounts": terminal.get("terminalReasonCounts") or {},
                },
                "effect": "Terminal-/Death-Matrix ist nicht startfaehig.",
            }
        )
    if terminal.get("playerDeadOnly") is True:
        blockers.append(
            {
                "id": "F.31",
                "gate": "93K.7/BT94A",
                "severity": "critical",
                "observed": {
                    "playerDeadOnly": True,
                    "deathCauseCounts": terminal.get("deathCauseCounts") or {},
                },
                "effect": "Natural-Terminal-/Death-Evidence bleibt unzureichend.",
            }
        )
    if no_start["precomparisonResultClass"] == "ppo-regression":
        blockers.append(
            {
                "id": "F.27",
                "gate": "BT94A/no_start_gate",
                "severity": "critical",
                "observed": {
                    "precomparisonResultClass": no_start["precomparisonResultClass"],
                    "bt94aBlockerCount": no_start["bt94aBlockerCount"],
                    "remainingBt94aGates": no_start["remainingBt94aGates"],
                },
                "effect": "BT94A darf nicht starten, solange der PPO-Vorvergleich als Regression klassifiziert ist.",
            }
        )
    if reward.get("progressSignalNonZero") is not True or reward.get("objectiveSignalNonZero") is not True:
        blockers.append(
            {
                "id": "BT93K.signal-reachability",
                "gate": "93K.7/BT94A",
                "severity": "high",
                "observed": {
                    "progressSignalNonZero": reward.get("progressSignalNonZero"),
                    "objectiveSignalNonZero": reward.get("objectiveSignalNonZero"),
                    "progressReward": reward.get("progressReward"),
                    "objectiveReward": reward.get("objectiveReward"),
                },
                "effect": "Kein laengerer Ladder-Schritt und kein Kandidatenclaim ohne erreichbares Zielsignal.",
            }
        )
    if not no_start["claimable"] or not no_start["candidateRunsAllowed"] or not no_start["matrixDefinitionAllowed"]:
        blockers.append(
            {
                "id": "BT94A.no-start-gate-red",
                "gate": "BT94A/no_start_gate",
                "severity": "critical",
                "observed": no_start,
                "effect": "BT94A.1 bleibt geschlossen; bt94a_gate_check.py wurde in 93K.7 nicht ausgefuehrt.",
            }
        )
    return blockers


def _forbidden_outcome_audit(result_class: str, package_terms: list[str]) -> dict[str, Any]:
    labels = [result_class, *package_terms]
    hits = [
        {"label": label, "forbiddenTerm": term}
        for label in labels
        for term in FORBIDDEN_RESULT_WORDS
        if term.lower() in str(label).lower()
    ]
    return {
        "forbiddenTerms": list(FORBIDDEN_RESULT_WORDS),
        "labelsChecked": labels,
        "hits": hits,
        "ok": not hits,
    }


def build_package(*, ladder_path: Path, no_start_gate_path: Path, command: str) -> dict[str, Any]:
    ladder = _read_json(ladder_path)
    no_start_gate = _read_json(no_start_gate_path) if no_start_gate_path.exists() else {}
    result_class = _result_class(ladder, no_start_gate)
    blockers = _blockers(ladder, no_start_gate)
    ready = result_class == "BT94A-ready"
    gate_check_executed = False
    gate_check_required = ready
    no_start_status = _no_start_status(no_start_gate)
    forbidden_audit = _forbidden_outcome_audit(
        result_class,
        [
            "closed-diagnose-loop-required-by-bt93k" if not ready else "open-for-94A1",
            "BT94A remains closed before 94A.1" if not ready else "BT94A may start at 94A.1",
        ],
    )
    phase_coverage = {
        "93K.7.1": result_class in ALLOWED_RESULT_CLASSES,
        "93K.7.2": bool(not ready and blockers and no_start_status["claimable"] is False),
        "93K.7.3": bool((ready and gate_check_executed) or (not ready and not gate_check_executed)),
        "93K.7.4": forbidden_audit["ok"],
    }
    ok = bool(all(value is True for value in phase_coverage.values()) and forbidden_audit["ok"])

    return {
        "schemaVersion": "bt93k-handover-package-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_handover_package.py",
        "gitSha": _git_sha(),
        "ok": ok,
        "blockId": "BT93K",
        "phaseId": "93K.7",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "bt94aHandover": {
            "ready": ready,
            "gate": "open-for-94A1" if ready else "closed-diagnose-loop-required-by-bt93k",
            "reason": (
                "BT93K did not produce BT94A-ready evidence; signal-gated ladder stays diagnostic."
                if not ready
                else "BT93K evidence and BT94A no-start gate are both claimable."
            ),
            "claimable": ready and no_start_status["claimable"],
            "candidateRunsAllowed": ready and no_start_status["candidateRunsAllowed"],
            "matrixDefinitionAllowed": ready and no_start_status["matrixDefinitionAllowed"],
            "candidateFreezeAllowed": False,
        },
        "ladderDecision": {
            "path": _rel(ladder_path),
            "resultClass": ladder.get("resultClass"),
            "longerRunAllowed": _get(ladder, "summary", "longerRunAllowed"),
            "bt94aClaimAllowed": _get(ladder, "summary", "bt94aClaimAllowed"),
            "blockedReasons": _get(ladder, "summary", "blockedReasons") or [],
            "signalGate": ladder.get("signalGate"),
            "firstRun": {
                "runId": _first_run(ladder).get("runId"),
                "runExitReport": _first_run(ladder).get("runExitReport"),
                "evalSnapshot": _first_run(ladder).get("evalSnapshot"),
                "summary": _first_run(ladder).get("summary"),
            },
            "deferredRungs": ladder.get("deferredRungs") or [],
        },
        "bt94aNoStartGate": {
            **no_start_status,
            "leftUnchangedByBt93k7": True,
            "gateCheckExecutedIn93K7": gate_check_executed,
            "gateCheckRequiredIn93K7": gate_check_required,
            "gateCheckSkippedReason": (
                "not BT94A-ready; 93K.7 may not reinterpret a red or incomplete no_start_gate as green"
                if not ready
                else None
            ),
        },
        "remainingBlockers": blockers,
        "nextGate": {
            "status": "BT94A remains closed before 94A.1" if not ready else "BT94A may start at 94A.1",
            "nextStep": "BT93K.99 closure gate, then user-owned replan/follow-up diagnosis" if not ready else "BT93K.99 closure gate",
            "requiredBefore94A1": [
                "BT93K.99 must be BT94A-ready",
                "data/training/ppo/bt94a/no_start_gate.json must have claimable=true",
                "candidateRunsAllowed=true and matrixDefinitionAllowed=true",
                "bt94aBlockerCount=0",
                "precomparison != ppo-regression",
            ],
        },
        "forbiddenOutcomeAudit": forbidden_audit,
        "sourceArtifacts": {
            key: _source(path, key)
            for key, path in SOURCE_REPORTS.items()
            if path.exists() or key in {"longrunLadder", "bt94aNoStartGate"}
        },
        "commands": {
            "write": "python python/scripts/bt93k_handover_package.py --write-report",
            "bt94aGateCheck": "not executed in 93K.7 because BT94A-ready evidence is absent",
        },
        "guardrails": {
            "diagnosticOnly": not ready,
            "trainingStarted": False,
            "comparisonStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "bt94bReadySignal": False,
            "ppoValidateSignal": False,
            "holdoutUsed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "command": command,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write the BT93K handover package.")
    parser.add_argument("--ladder-report", default=str(LONGRUN_LADDER_PATH), help="BT93K.6 ladder report.")
    parser.add_argument("--no-start-gate", default=str(NO_START_GATE_PATH), help="BT94A no-start gate.")
    parser.add_argument("--output", default=str(HANDOVER_PATH), help="Handover package output path.")
    args = parser.parse_args()

    output = _repo_path(args.output)
    report = build_package(
        ladder_path=_repo_path(args.ladder_report),
        no_start_gate_path=_repo_path(args.no_start_gate),
        command=" ".join(sys.argv),
    )
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "bt94aReady": report["bt94aHandover"]["ready"],
                "gateCheckExecutedIn93K7": report["bt94aNoStartGate"]["gateCheckExecutedIn93K7"],
                "remainingBlockers": [blocker["id"] for blocker in report["remainingBlockers"]],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
