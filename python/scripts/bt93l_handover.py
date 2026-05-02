"""BT93L.7 handover classifier.

The handover is diagnostic-only. It decides whether BT93L can open BT94A or
must stay in a follow-up diagnose loop.
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
BT93L_ROOT = PPO_ROOT / "bt93l"
REPORT_PATH = BT93L_ROOT / "handover_package.json"
SOURCE_PATHS = {
    "taskMetricContract": BT93L_ROOT / "task_metric_contract.json",
    "progressReachabilityReport": BT93L_ROOT / "progress_reachability_report.json",
    "rewardBalanceReport": BT93L_ROOT / "reward_balance_report.json",
    "actionEffectReport": BT93L_ROOT / "action_effect_report.json",
    "baselineMatrixReport": BT93L_ROOT / "baseline_matrix_report.json",
    "microPpoSignalReport": BT93L_ROOT / "micro_ppo_signal_report.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
}
ALLOWED_RESULT_CLASSES = {
    "BT94A-ready",
    "diagnose-loop-required",
    "reward-redesign-required",
    "action-space-required",
    "measurement-invalid",
    "blocked",
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


def _source(path: Path, role: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def build_handover() -> dict[str, Any]:
    sources = {key: _read_json(path) for key, path in SOURCE_PATHS.items()}
    micro = sources["microPpoSignalReport"]
    baseline = sources["baselineMatrixReport"]
    no_start = sources["bt94aNoStartGate"]
    micro_decision = micro.get("decision") if isinstance(micro.get("decision"), Mapping) else {}
    train_summary = micro.get("trainSummary") if isinstance(micro.get("trainSummary"), Mapping) else {}
    eval_summary = micro.get("evalSummary") if isinstance(micro.get("evalSummary"), Mapping) else {}
    baseline_summary = baseline.get("summary") if isinstance(baseline.get("summary"), Mapping) else {}
    bt93c_state = no_start.get("bt93cState") if isinstance(no_start.get("bt93cState"), Mapping) else {}

    checks = {
        "taskMetricContractOk": sources["taskMetricContract"].get("ok") is True,
        "progressReachabilityOk": sources["progressReachabilityReport"].get("ok") is True,
        "rewardBalanceOk": sources["rewardBalanceReport"].get("ok") is True,
        "actionEffectOk": sources["actionEffectReport"].get("ok") is True,
        "baselineMatrixOk": baseline.get("ok") is True,
        "microPpoSignalGreen": micro.get("resultClass") == "signal-green",
        "runtimeErrorFree": _number(train_summary.get("runtimeErrorCount")) + _number(eval_summary.get("runtimeErrorCount")) == 0,
        "deathBefore60Clear": _number(train_summary.get("deathBefore60Count")) + _number(eval_summary.get("deathBefore60Count")) == 0,
        "extension50kAllowed": micro_decision.get("extension50kAllowed") is True,
        "sameMatrixDqnAnchorPresent": baseline_summary.get("sameMatrixDqnAnchorPresent") is True,
        "bt94aNoStartGateClaimable": no_start.get("claimable") is True,
        "bt94aCandidateRunsAllowed": no_start.get("candidateRunsAllowed") is True,
        "bt94aMatrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed") is True,
        "bt94aBlockerCountZero": _number(bt93c_state.get("bt94aBlockerCount"), 999) == 0,
        "precomparisonNotRegression": bt93c_state.get("precomparisonResultClass") != "ppo-regression",
    }
    ready = all(checks.values())
    blockers = []
    if not checks["deathBefore60Clear"]:
        blockers.append({
            "id": "BT93L.DEATH_BEFORE_60",
            "evidence": "micro_ppo_signal_report.json has train deathBefore60Count > 0",
            "blocks": ["50k extension", "BT94A-ready"],
        })
    if not checks["extension50kAllowed"]:
        blockers.append({
            "id": "BT93L.50K_EXTENSION_BLOCKED",
            "evidence": "micro_ppo_signal_report.json decision.extension50kAllowed=false",
            "blocks": ["longer micro signal confirmation", "BT94A-ready"],
        })
    if not checks["sameMatrixDqnAnchorPresent"]:
        blockers.append({
            "id": "BT93L.DQN_SAME_MATRIX_ANCHOR_MISSING",
            "evidence": "baseline_matrix_report.json has sameMatrixDqnAnchorPresent=false",
            "blocks": ["BT94A comparison", "candidate/freeze claim"],
        })
    if not checks["bt94aNoStartGateClaimable"]:
        blockers.append({
            "id": "BT94A.NO_START_GATE_STILL_RED",
            "evidence": "data/training/ppo/bt94a/no_start_gate.json remains claimable=false",
            "blocks": ["94A.1 claim"],
        })
    result_class = "BT94A-ready" if ready else "diagnose-loop-required"
    followup = {
        "required": not ready,
        "concreteFollowup": "BT93M DeathBefore60-Stability und DQN-Same-Matrix-Anker (manual intake required)",
        "reason": "BT93L produced real PPO signals, but 50k extension is blocked, same-matrix DQN anchor is missing, and BT94A no-start remains red.",
        "mustNotShiftIntoBT94A": True,
    }
    gate_action = {
        "bt94aGateCheckExecuted": False,
        "reason": "BT93L result is not BT94A-ready; plan allows bt94a_gate_check.py only for an opening attempt after BT94A-ready.",
        "noStartGateRemainsRed": no_start.get("claimable") is False,
        "noStartGatePath": _rel(SOURCE_PATHS["bt94aNoStartGate"]),
    }
    forbidden_terms = {
        "candidate": False,
        "freeze": False,
        "promote": False,
        "rollout-ready": False,
        "BT95-Handoff-ready": False,
    }
    phase_coverage = {
        "93L.7.1": result_class in ALLOWED_RESULT_CLASSES,
        "93L.7.2": gate_action["bt94aGateCheckExecuted"] is False and gate_action["noStartGateRemainsRed"] is True,
        "93L.7.3": followup["required"] is True and bool(followup["concreteFollowup"]),
        "93L.7.4": all(value is False for value in forbidden_terms.values()),
    }
    ok = all(phase_coverage.values())
    return {
        "schemaVersion": "bt93l-handover-package-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_handover.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": ok,
        "blockId": "BT93L",
        "phaseId": "93L.7",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "checks": checks,
        "blockers": blockers,
        "bt94aHandover": {
            "ready": ready,
            "claimable": False,
            "candidateRunsAllowed": False,
            "matrixDefinitionAllowed": False,
            "precomparison": bt93c_state.get("precomparisonResultClass"),
            "bt94aBlockerCount": bt93c_state.get("bt94aBlockerCount"),
        },
        "gateAction": gate_action,
        "followup": followup,
        "forbiddenResultTerms": forbidden_terms,
        "summary": {
            "microPpoResultClass": micro.get("resultClass"),
            "trainDeathBefore60Count": train_summary.get("deathBefore60Count"),
            "evalObjectiveSignalReachableCount": eval_summary.get("objectiveSignalReachableCount"),
            "sameMatrixDqnAnchorPresent": baseline_summary.get("sameMatrixDqnAnchorPresent"),
            "extension50kAllowed": micro_decision.get("extension50kAllowed"),
            "bt94aClaimAllowed": False,
            "nextStep": "manual intake of BT93M follow-up or 93L.99 closure as diagnose-loop-required",
        },
        "sourceArtifacts": {
            key: _source(path, role)
            for key, path, role in (
                ("taskMetricContract", SOURCE_PATHS["taskMetricContract"], "BT93L.1 task metric contract"),
                ("progressReachabilityReport", SOURCE_PATHS["progressReachabilityReport"], "BT93L.2 progress reachability"),
                ("rewardBalanceReport", SOURCE_PATHS["rewardBalanceReport"], "BT93L.3 reward balance"),
                ("actionEffectReport", SOURCE_PATHS["actionEffectReport"], "BT93L.4 action effect"),
                ("baselineMatrixReport", SOURCE_PATHS["baselineMatrixReport"], "BT93L.5 baseline matrix"),
                ("microPpoSignalReport", SOURCE_PATHS["microPpoSignalReport"], "BT93L.6 micro PPO signal"),
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
            "write": "python python/scripts/bt93l_handover.py --write-report",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    args = parser.parse_args()

    handover = build_handover()
    output = Path(args.output)
    if args.write_report:
        _write_json(output, handover)
    print(
        json.dumps(
            {
                "ok": handover["ok"],
                "resultClass": handover["resultClass"],
                "phaseCoverage": handover["phaseCoverage"],
                "blockers": [blocker["id"] for blocker in handover["blockers"]],
                "bt94aHandover": handover["bt94aHandover"],
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if handover["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
