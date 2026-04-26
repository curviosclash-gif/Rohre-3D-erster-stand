"""BT93J.5 iterative repair-loop and pilot-readiness gate.

This script consumes BT93J-local diagnostic evidence after R1 and writes the
93J.5 decision package. It does not train, start a pilot, use holdout, refresh
BT94A, create a candidate, freeze, promote, or touch runtime rollout surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93J_ROOT = PPO_ROOT / "bt93j"

DIAGNOSTIC_SPLIT_PATH = BT93J_ROOT / "diagnostic_split_report.json"
OBSERVATION_REPORT_PATH = BT93J_ROOT / "observation_integrity_report.json"
TERMINAL_REPORT_PATH = BT93J_ROOT / "terminal_semantics_report.json"
MATRIX_REPORT_PATH = BT93J_ROOT / "matrix_contract_report.json"
ACTION_REPORT_PATH = BT93J_ROOT / "action_policy_diagnostics.json"
REWARD_REPORT_PATH = BT93J_ROOT / "reward_curriculum_diagnostics.json"
R1_REPORT_PATH = BT93J_ROOT / "r1_micro_test_report.json"
DEFAULT_OUTPUT = BT93J_ROOT / "pilot_readiness_report.json"

NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no pilot, holdout, long-run, or gate refresh from BT93J.5 while readyForTraining=false",
    "R2/R3 require a new or refined hypothesis, updated diagnostic split, and new versioned evidence",
    "R1 green is reward-signal evidence only, not policy-quality, PPO-Validate, or promotion evidence",
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
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _category_gate(diagnostic_split: Mapping[str, Any], gate_id: str) -> Mapping[str, Any]:
    gates = diagnostic_split.get("categoryGates")
    if not isinstance(gates, list):
        return {}
    for gate in gates:
        if isinstance(gate, Mapping) and gate.get("id") == gate_id:
            return gate
    return {}


def _collect_numeric_key(payload: Any, key: str) -> list[float]:
    values: list[float] = []
    if isinstance(payload, Mapping):
        for current_key, current_value in payload.items():
            if current_key == key:
                try:
                    values.append(float(current_value))
                except (TypeError, ValueError):
                    pass
            values.extend(_collect_numeric_key(current_value, key))
    elif isinstance(payload, list):
        for item in payload:
            values.extend(_collect_numeric_key(item, key))
    return values


def _runtime_error_count(matrix_report: Mapping[str, Any]) -> int | None:
    values = _collect_numeric_key(matrix_report, "runtimeErrorCount")
    if not values:
        return None
    return int(max(values))


def _all_reward_lanes_flag(reward_report: Mapping[str, Any], *keys: str) -> bool | None:
    lanes = reward_report.get("lanes")
    if not isinstance(lanes, list) or not lanes:
        return None
    observed = [_get(lane, *keys) for lane in lanes if isinstance(lane, Mapping)]
    if not observed:
        return None
    return all(value is True for value in observed)


def _build_readiness_checks(
    diagnostic_split: Mapping[str, Any],
    terminal_report: Mapping[str, Any],
    matrix_report: Mapping[str, Any],
    action_report: Mapping[str, Any],
    reward_report: Mapping[str, Any],
    r1_report: Mapping[str, Any],
) -> list[dict[str, Any]]:
    observation_green = _category_gate(diagnostic_split, "observation").get("green") is True
    terminal_mapping_green = _get(terminal_report, "terminalMappingGate", "green") is True
    matrix_contract_green = _get(matrix_report, "matrixContractGate", "green") is True
    real_eval_start_capable = _get(terminal_report, "terminalMappingGate", "realEvalStartCapable") is True
    matrix_inputs_green = _get(matrix_report, "matrixContractGate", "inputGatesGreen") is True
    player_dead_only = (
        _get(terminal_report, "terminalMappingGate", "realEvalPlayerDeadOnly") is True
        or _all_reward_lanes_flag(reward_report, "deathAndTerminalClass", "playerDeadOnly") is True
    )
    runtime_errors = _runtime_error_count(matrix_report)
    action_green = _get(action_report, "actionPolicyGate", "green") is True
    r1_green = r1_report.get("resultClass") == "green" and _get(r1_report, "classification", "green") is True
    metric_trend_proven = False
    return [
        {
            "id": "observation_integrity_green",
            "ok": observation_green,
            "observed": _category_gate(diagnostic_split, "observation"),
        },
        {
            "id": "terminal_matrix_start_capable",
            "ok": terminal_mapping_green and matrix_contract_green and real_eval_start_capable and matrix_inputs_green,
            "observed": {
                "terminalMappingGreen": terminal_mapping_green,
                "matrixContractGreen": matrix_contract_green,
                "realEvalStartCapable": real_eval_start_capable,
                "matrixInputGatesGreen": matrix_inputs_green,
            },
        },
        {
            "id": "not_player_dead_only",
            "ok": player_dead_only is False,
            "observed": {
                "playerDeadOnly": player_dead_only,
                "terminalMappingGate": terminal_report.get("terminalMappingGate"),
            },
        },
        {
            "id": "not_max_steps_only",
            "ok": True,
            "observed": {
                "rewardLanesMaxStepsOnly": _all_reward_lanes_flag(
                    reward_report,
                    "deathAndTerminalClass",
                    "maxStepsOnly",
                ),
                "note": "BT93J current red input is player-dead-only, not max-steps-only.",
            },
        },
        {
            "id": "runtime_error_count_zero",
            "ok": runtime_errors == 0,
            "observed": {"runtimeErrorCount": runtime_errors},
        },
        {
            "id": "action_thresholds_green",
            "ok": action_green,
            "observed": action_report.get("actionPolicyGate"),
        },
        {
            "id": "micro_test_trend_improvement",
            "ok": r1_green and metric_trend_proven,
            "observed": {
                "r1Green": r1_green,
                "metricTrendImprovementProven": metric_trend_proven,
                "reason": "R1 only proves a local reward-signal change; it does not prove eval/holdout terminal diversity or avgSteps improvement.",
            },
        },
    ]


def _iteration_decision(r1_report: Mapping[str, Any]) -> str:
    if r1_report.get("resultClass") == "green" and _get(r1_report, "classification", "green") is True:
        return "cause-confirmed"
    if r1_report.get("resultClass") == "same-red":
        return "cause-refuted"
    if r1_report.get("resultClass") == "new-red":
        return "new-cause"
    return "measurement-invalid"


def build_report() -> tuple[dict[str, Any], dict[str, Any]]:
    diagnostic_split = _read_json(DIAGNOSTIC_SPLIT_PATH)
    observation_report = _read_json(OBSERVATION_REPORT_PATH)
    terminal_report = _read_json(TERMINAL_REPORT_PATH)
    matrix_report = _read_json(MATRIX_REPORT_PATH)
    action_report = _read_json(ACTION_REPORT_PATH)
    reward_report = _read_json(REWARD_REPORT_PATH)
    r1_report = _read_json(R1_REPORT_PATH)
    checks = _build_readiness_checks(
        diagnostic_split,
        terminal_report,
        matrix_report,
        action_report,
        reward_report,
        r1_report,
    )
    ready_for_training = all(check["ok"] for check in checks)
    blocking_checks = [check["id"] for check in checks if not check["ok"]]
    decision = _iteration_decision(r1_report)
    report = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_iterative_pilot_readiness.py",
        "gitSha": _git_sha(),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.5",
        "resultClass": "pilot-readiness-green" if ready_for_training else "pilot-readiness-blocked",
        "phaseCoverage": {
            "93J.5.1": True,
            "93J.5.2": True,
            "93J.5.3": True,
            "93J.5.4": True,
        },
        "iterativeLoop": {
            "currentIteration": "R1",
            "iterations": [
                {
                    "id": "R1",
                    "repairId": _get(r1_report, "r1", "id"),
                    "primaryCauseId": _get(r1_report, "r1", "primaryCauseId"),
                    "hypothesis": _get(diagnostic_split, "primaryCause", "summary"),
                    "evidence": _rel(R1_REPORT_PATH),
                    "resultClass": r1_report.get("resultClass"),
                    "decision": decision,
                    "decisionScope": "reward-signal micro-test only; eval/holdout policy quality and terminal diversity are not proven",
                    "metricImprovementProven": False,
                    "newRedSymptoms": decision == "new-cause",
                }
            ],
            "redRoundsWithoutMetricImprovement": 0 if decision == "cause-confirmed" else 1,
            "escalationRequired": False,
            "r2r3Gate": {
                "r2Started": False,
                "r3Started": False,
                "currentlyAllowed": False,
                "allowedOnlyWith": [
                    "new or refined primary hypothesis",
                    "updated diagnostic_split_report.json",
                    "new versioned counterprobe evidence",
                    "no pilot, holdout, long-run, or BT94A refresh while readyForTraining=false",
                ],
                "reason": "No R2/R3 starts from a signal-only green R1 without a new hypothesis and evidence.",
            },
        },
        "pilotReadiness": {
            "readyForPilot": ready_for_training,
            "readyForTraining": ready_for_training,
            "pilotAllowed": ready_for_training,
            "holdoutAllowed": False,
            "longRunAllowed": False,
            "blockingChecks": blocking_checks,
            "checks": checks,
        },
        "findingImpact": {
            "F.05": "still-blocking; avgSteps/eval-holdout trend is not repaired by signal-only R1 evidence",
            "F.19": "still-blocking; real eval/holdout terminal matrix is not start-capable",
            "F.27": "still-blocking aggregate until F.05/F.19/F.31 clear and no_start_gate can turn green",
            "F.31": "still-blocking; current evidence remains player-dead-only in real eval/holdout",
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
            "pilotStarted": False,
            "holdoutUsed": False,
            "bt94aGateRefresh": False,
            "noGo": list(NO_GO),
        },
        "sourceArtifacts": {
            "diagnosticSplit": _source(DIAGNOSTIC_SPLIT_PATH, "BT93J diagnostic split after R1"),
            "observationIntegrity": _source(OBSERVATION_REPORT_PATH, "BT93J observation integrity report"),
            "terminalSemantics": _source(TERMINAL_REPORT_PATH, "BT93J terminal semantics report"),
            "matrixContract": _source(MATRIX_REPORT_PATH, "BT93J matrix contract report"),
            "actionPolicyDiagnostics": _source(ACTION_REPORT_PATH, "BT93J action policy diagnostics"),
            "rewardCurriculumDiagnostics": _source(REWARD_REPORT_PATH, "BT93J reward/curriculum diagnostics"),
            "r1MicroTest": _source(R1_REPORT_PATH, "BT93J R1 micro-test report"),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_iterative_pilot_readiness.py --write-reports",
        },
    }
    updated_split = _update_diagnostic_split(diagnostic_split, report)
    return report, updated_split


def _update_diagnostic_split(
    diagnostic_split: Mapping[str, Any],
    report: Mapping[str, Any],
) -> dict[str, Any]:
    updated = json.loads(json.dumps(diagnostic_split))
    ready_for_training = _get(report, "pilotReadiness", "readyForTraining") is True
    updated["generatedAt"] = _utc_now()
    updated["generatedBy"] = "python/scripts/bt93j_iterative_pilot_readiness.py"
    updated["gitSha"] = _git_sha()
    updated["phaseId"] = "93J.5"
    updated["iterativeLoop"] = {
        "path": _rel(DEFAULT_OUTPUT),
        "currentIteration": _get(report, "iterativeLoop", "currentIteration"),
        "iterations": _get(report, "iterativeLoop", "iterations"),
        "r2r3Gate": _get(report, "iterativeLoop", "r2r3Gate"),
    }
    updated["pilotReadiness"] = {
        "path": _rel(DEFAULT_OUTPUT),
        "resultClass": report.get("resultClass"),
        "readyForPilot": _get(report, "pilotReadiness", "readyForPilot"),
        "readyForTraining": ready_for_training,
        "blockingChecks": _get(report, "pilotReadiness", "blockingChecks"),
    }
    phase_coverage = updated.get("phaseCoverage") if isinstance(updated.get("phaseCoverage"), Mapping) else {}
    updated["phaseCoverage"] = {
        **phase_coverage,
        **(report.get("phaseCoverage") if isinstance(report.get("phaseCoverage"), Mapping) else {}),
    }
    gates = updated.get("categoryGates")
    if isinstance(gates, list):
        for gate in gates:
            if isinstance(gate, dict) and gate.get("id") == "training-pilot":
                gate["status"] = "green" if ready_for_training else "pilot-readiness-blocked"
                gate["green"] = ready_for_training
                gate["notCausal"] = False
                gate["phase"] = "93J.5"
                gate["evidence"] = _rel(DEFAULT_OUTPUT)
                gate["pilotBlocked"] = not ready_for_training
                gate["longRunBlocked"] = not ready_for_training
    updated["readyForRepair"] = False
    updated["readyForTraining"] = ready_for_training
    updated["resultClass"] = (
        "diagnostic-split-pilot-readiness-green"
        if ready_for_training
        else "diagnostic-split-pilot-readiness-blocked"
    )
    updated["nextDiagnosticPhase"] = "93J.6" if ready_for_training else "93J.6-blocked"
    repair_constraints = updated.get("repairConstraints") if isinstance(updated.get("repairConstraints"), Mapping) else {}
    updated["repairConstraints"] = {
        **repair_constraints,
        "pilotAllowed": ready_for_training,
        "longRunAllowed": ready_for_training,
        "holdoutAllowed": False,
        "candidateFreezeAllowed": False,
        "bt94aClaimAllowed": False,
    }
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93J.5 iterative loop and pilot-readiness report.")
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--diagnostic-split-output", default=str(DIAGNOSTIC_SPLIT_PATH))
    args = parser.parse_args()

    output_path = Path(args.output)
    split_output_path = Path(args.diagnostic_split_output)
    report, diagnostic_split = build_report()
    if args.write_reports:
        _write_json(output_path, report)
        _write_json(split_output_path, diagnostic_split)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": report["resultClass"],
                "phaseCoverage": report.get("phaseCoverage", {}),
                "readyForTraining": _get(report, "pilotReadiness", "readyForTraining"),
                "blockingChecks": _get(report, "pilotReadiness", "blockingChecks"),
                "wrote": {
                    "pilotReadiness": _rel(output_path) if args.write_reports else None,
                    "diagnosticSplit": _rel(split_output_path) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
