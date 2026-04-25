"""BT93G.1 start sanity and comparable repair contract.

This script pins the BT93G no-start truth from BT93F/BT94A artifacts and
defines the comparable repair matrix. It does not train, define BT94A
candidates, create a freeze candidate, promote, or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93F_ROOT = PPO_ROOT / "bt93f"
BT93G_ROOT = PPO_ROOT / "bt93g"
BT94A_ROOT = PPO_ROOT / "bt94a"

NO_START_GATE_PATH = BT94A_ROOT / "no_start_gate.json"
BT93C_PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
BT93C_HANDOVER_PATH = BT93C_ROOT / "handover_report.json"
BT93C_MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
BT93F_REPAIR_PATH = BT93F_ROOT / "repair_diagnostic_report.json"
BT93F_HANDOVER_PATH = BT93F_ROOT / "handover_package.json"
BT93F_FOLLOWUP_PATH = BT93F_ROOT / "followup_gate_report.json"
BT93F_ACTION_PATH = BT93F_ROOT / "action_surface_repair_report.json"
BT93F_TERMINAL_PATH = BT93F_ROOT / "terminal_reward_failure_report.json"
BT93F_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93f_repair_diagnostic.json"

DEFAULT_START_TRUTH_PATH = BT93G_ROOT / "start_truth.json"
DEFAULT_REPAIR_MATRIX_PATH = BT93G_ROOT / "repair_matrix.json"
DEFAULT_START_CONTRACT_PATH = BT93G_ROOT / "start_contract.json"

MIN_COMPARABLE_MAX_STEPS = 128
PREFERRED_MAX_STEPS = 180
EVAL_EPISODES_MIN = 6
HOLDOUT_EPISODES_MIN = 4

GATE_FINDINGS = (
    "G.01",
    "G.02",
    "G.03",
    "G.04",
    "G.05",
    "G.06",
    "G.07",
    "G.08",
)
CLAIM_CHECKS = {
    "C.01": "bt93c_result_allows_bt94a",
    "C.02": "handover_gate_ready",
    "C.03": "precomparison_not_regression",
    "C.04": "no_open_bt94a_audit_blockers",
}
AUDIT_FINDINGS = tuple(f"F.{number:02d}" for number in range(1, 38))
BT94A_HARD_BLOCKERS = {"F.05", "F.19", "F.27", "F.30", "F.31", "R.01"}

FINDING_TREATMENTS = {
    "G.01": "Pin red BT94A gate snapshot; refresh only in 93G.6.",
    "G.02": "Candidate run allowance remains false; BT93G may run repair/diagnostic only.",
    "G.03": "BT94A matrix definition remains closed; BT93G defines only repair/eval matrix.",
    "G.04": "Freeze allowance must remain false until 94A.3.",
    "G.05": "Handover result remains diagnose until 93G.6 artifacts justify a new result.",
    "G.06": "Handover gate remains closed until BT93G gate refresh.",
    "G.07": "Precomparison regression may not be used as comparable quality evidence while horizon is invalid.",
    "G.08": "Audit blockers remain start-blocking until each has versioned BT93G evidence.",
    "C.01": "Claim check stays red until BT93G handover result no longer blocks.",
    "C.02": "Claim check stays red until bt94aHandover.ready=true.",
    "C.03": "Claim check stays red until comparable-matrix precomparison is not ppo-regression.",
    "C.04": "Claim check stays red until bt94a-blocker count is zero.",
    "F.05": "Repair survival/steps on comparable matrix; old bot validation and 16-step diagnostics cannot close it.",
    "F.19": "Wire natural terminal, death and truncation classes before quality judgement.",
    "F.27": "Re-run comparison only after comparable horizon and root fixes; otherwise keep ppo-regression/blocker.",
    "F.30": "Implement true pre-sampling policy mask or keep BT94A blocked.",
    "F.31": "Eval/holdout terminal/death matrix must be non-empty or BT93G remains diagnose-blocked.",
    "R.01": "Reward gates must block positive reward claims when survival/steps regress or safety load is high.",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


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


def _optional_source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    if path.exists():
        return _source(path, role, closure_capable)
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": None,
        "status": "missing",
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


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int | None:
    number = _as_float(value)
    return int(number) if number is not None else None


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _claim_check(gate: Mapping[str, Any], check_id: str) -> Mapping[str, Any]:
    checks = gate.get("claimChecks") if isinstance(gate.get("claimChecks"), list) else []
    for check in checks:
        if isinstance(check, Mapping) and check.get("id") == check_id:
            return check
    return {}


def _audit_rows(matrix: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    rows = matrix.get("auditRegister") if isinstance(matrix.get("auditRegister"), list) else []
    return {str(row.get("id")): row for row in rows if isinstance(row, Mapping) and row.get("id")}


def _status_from_audit(row: Mapping[str, Any]) -> str:
    status = row.get("status")
    if status == "bt94a-blocker":
        return "still-blocking / BT94A-blocker"
    if status in {"closed", "follow-gated"}:
        return str(status)
    if status:
        return str(status)
    return "unknown"


def _gate_finding_status(finding_id: str, gate: Mapping[str, Any], handover: Mapping[str, Any], precomparison: Mapping[str, Any], matrix: Mapping[str, Any]) -> tuple[str, Any]:
    summary = _mapping(matrix.get("summary"))
    handover_gate = _mapping(handover.get("bt94aHandover"))
    if finding_id == "G.01":
        observed = {"resultClass": gate.get("resultClass"), "claimable": gate.get("claimable")}
        return ("closed" if gate.get("resultClass") == "claimable" and gate.get("claimable") is True else "still-blocking", observed)
    if finding_id == "G.02":
        observed = {"candidateRunsAllowed": gate.get("candidateRunsAllowed")}
        return ("closed" if gate.get("candidateRunsAllowed") is True else "still-blocking", observed)
    if finding_id == "G.03":
        observed = {"matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed")}
        return ("closed" if gate.get("matrixDefinitionAllowed") is True else "still-blocking", observed)
    if finding_id == "G.04":
        observed = {"candidateFreezeAllowed": gate.get("candidateFreezeAllowed")}
        return ("carried" if gate.get("candidateFreezeAllowed") is False else "still-blocking", observed)
    if finding_id == "G.05":
        observed = {"handoverResultClass": handover.get("resultClass")}
        return ("closed" if handover.get("resultClass") != "diagnose" else "still-blocking", observed)
    if finding_id == "G.06":
        observed = {"bt94aHandoverReady": handover_gate.get("ready"), "gate": handover_gate.get("gate")}
        return ("closed" if bool(handover_gate.get("ready")) else "still-blocking", observed)
    if finding_id == "G.07":
        observed = {"precomparisonResultClass": precomparison.get("resultClass")}
        return ("closed" if precomparison.get("resultClass") != "ppo-regression" else "still-blocking", observed)
    observed = {"bt94aBlockerCount": summary.get("bt94a-blocker")}
    return ("closed" if int(summary.get("bt94a-blocker") or 0) == 0 else "still-blocking", observed)


def _finding_register(
    gate: Mapping[str, Any],
    handover: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    repair: Mapping[str, Any],
    terminal: Mapping[str, Any],
) -> list[dict[str, Any]]:
    rows = _audit_rows(matrix)
    register: list[dict[str, Any]] = []

    for finding_id in GATE_FINDINGS:
        status, observed = _gate_finding_status(finding_id, gate, handover, precomparison, matrix)
        register.append(
            {
                "id": finding_id,
                "status": status,
                "observed": observed,
                "treatment": FINDING_TREATMENTS.get(finding_id),
                "blocksBt94a": status == "still-blocking",
            }
        )

    for finding_id, check_id in CLAIM_CHECKS.items():
        check = _claim_check(gate, check_id)
        status = "closed" if bool(check.get("ok")) else "still-blocking"
        register.append(
            {
                "id": finding_id,
                "status": status,
                "observed": dict(check),
                "treatment": FINDING_TREATMENTS.get(finding_id),
                "blocksBt94a": status == "still-blocking",
            }
        )

    for finding_id in AUDIT_FINDINGS:
        row = rows.get(finding_id, {})
        status = _status_from_audit(row)
        register.append(
            {
                "id": finding_id,
                "status": status,
                "gate": row.get("gate"),
                "evidence": row.get("evidence"),
                "source": row.get("source"),
                "treatment": FINDING_TREATMENTS.get(
                    finding_id,
                    "Carry current BT93C/BT93F disposition; refresh only with BT93G artifacts.",
                ),
                "blocksBt94a": finding_id in BT94A_HARD_BLOCKERS or status.startswith("still-blocking"),
            }
        )

    blocked = set(_get(repair, "bt94aImpact", "blockedFindings") or [])
    if "R.01" not in blocked:
        blocked = set(_get(terminal, "bt94aImpact", "blockedFindings") or [])
    register.append(
        {
            "id": "R.01",
            "status": "still-blocking / BT94A-blocker" if "R.01" in blocked else "closed",
            "evidence": "Reward remains untrusted while survival/steps regress or terminal/action gates are red.",
            "treatment": FINDING_TREATMENTS["R.01"],
            "blocksBt94a": "R.01" in blocked,
        }
    )
    return register


def _status_counts(register: list[Mapping[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in register:
        status = str(row.get("status"))
        counts[status] = counts.get(status, 0) + 1
    return counts


def _prior_matrix_classification(repair: Mapping[str, Any]) -> dict[str, Any]:
    config_matrix = _mapping(_get(repair, "comparison", "matrix", "configMatrix"))
    deltas = _mapping(_get(repair, "comparison", "deltasAgainstDqn"))
    dqn = _mapping(_get(repair, "comparison", "dqnChampion"))
    max_steps = _as_int(config_matrix.get("maxStepsPerEpisode"))
    dqn_steps = _as_float(dqn.get("avgStepsPerEpisode"))

    comparable = max_steps is not None and max_steps >= MIN_COMPARABLE_MAX_STEPS
    classification = "comparable" if comparable else "diagnose-not-comparable"
    reasons = []
    if max_steps is None:
        reasons.append("maxStepsPerEpisode is missing")
    elif max_steps < MIN_COMPARABLE_MAX_STEPS:
        reasons.append(f"maxStepsPerEpisode={max_steps} is below required {MIN_COMPARABLE_MAX_STEPS}")
    if max_steps is not None and dqn_steps is not None and max_steps < dqn_steps:
        reasons.append(f"maxStepsPerEpisode={max_steps} is below DQN avgStepsPerEpisode={dqn_steps}")

    return {
        "bt93fMatrix": config_matrix,
        "bt93fResultClass": deltas.get("resultClass"),
        "bt93gClassification": classification,
        "qualityComparisonAllowed": comparable,
        "dqnNonRegressionClaimAllowed": comparable,
        "requiredReportLabelWhenNotComparable": "diagnose-not-comparable",
        "blockingReasons": reasons,
        "rule": "A run with maxStepsPerEpisode below 128 must not be reported as DQN/PPO non-regression quality evidence.",
    }


def _repair_matrix(gate: Mapping[str, Any], repair: Mapping[str, Any]) -> dict[str, Any]:
    semantic_window = _get(gate, "bt93cState", "semanticWindow") or _get(repair, "comparison", "matrix", "configMatrix", "semanticWindow")
    baseline_id = _get(gate, "bt93cState", "baselineId")
    dqn = _mapping(_get(repair, "comparison", "dqnChampion"))
    return {
        "blockId": "BT93G",
        "phaseId": "93G.1",
        "matrixId": "bt93g-comparable-repair-matrix-v1",
        "classification": "comparable-repair-matrix",
        "comparisonUse": "BT93G repair/eval gate only; not a BT94A candidate, freeze, promotion, or PPO-Validate lane.",
        "env": {
            "modeId": semantic_window,
            "maps": ["standard", "maze"],
            "envCount": 2,
            "evalEnvCount": 2,
            "maxStepsPerEpisode": PREFERRED_MAX_STEPS,
            "minComparableMaxSteps": MIN_COMPARABLE_MAX_STEPS,
            "preferredMaxStepsPerEpisode": PREFERRED_MAX_STEPS,
        },
        "seeds": {
            "train": [934, 935, 936, 937],
            "eval": [944, 945, 946],
            "holdout": [960, 961],
        },
        "minimumEpisodes": {
            "eval": EVAL_EPISODES_MIN,
            "holdout": HOLDOUT_EPISODES_MIN,
            "derivation": "2 maps x 3 eval seeds = 6 eval episodes; 2 maps x 2 holdout seeds = 4 holdout episodes.",
        },
        "baseline": {
            "baselineId": baseline_id,
            "dqnChampion": {
                "source": dqn.get("source"),
                "avgStepsPerEpisode": dqn.get("avgStepsPerEpisode"),
                "averageBotSurvival": dqn.get("averageBotSurvival"),
                "invalidActionRate": dqn.get("invalidActionRate"),
                "runtimeErrorCount": dqn.get("runtimeErrorCount"),
            },
        },
        "holdoutRule": {
            "status": "reserved-for-93G.5-after-root-fixes",
            "noPostHoldoutOptimization": True,
            "holdoutMayNotOpenBt94aIf": [
                "pre-sampling mask is missing",
                "terminal/death matrix is empty or max-steps-only",
                "reward is positive while survival or steps regress",
                "runtimeErrorCount is greater than 0",
            ],
        },
    }


def _start_contract(repair_matrix: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "blockId": "BT93G",
        "phaseId": "93G.1",
        "contractId": "bt93g-start-contract-v1",
        "resultClass": "start-contract-pinned",
        "allowedRunKinds": [
            "diagnostic",
            "repair",
            "technical-smoke",
            "comparable-repair",
            "comparable-repair-eval",
            "holdout-eval",
        ],
        "forbiddenRunKinds": [
            "candidate",
            "freeze",
            "freeze-candidate",
            "promote",
            "rollout-ready",
            "BT94B-ready",
            "baseline",
        ],
        "forbiddenEvidenceSources": [
            "data/bot_validation_report.json",
            "tmp/**",
            "latest_* pointers without immutable run artifacts",
            "plan grep or self-count evidence",
            "throughput-only reports",
            "scaffold-only reports",
            "16-step diagnostics as DQN non-regression proof",
        ],
        "gateLogic": {
            "maxStepsBelow128": {
                "classification": "diagnose-not-comparable",
                "dqnNonRegressionAllowed": False,
                "bt94aClaimAllowed": False,
            },
            "preSamplingMaskMissing": {
                "classification": "hard-blocker",
                "bt94aClaimAllowed": False,
            },
            "terminalDeathMatrixEmpty": {
                "classification": "hard-blocker",
                "bt94aClaimAllowed": False,
            },
            "positiveRewardWithRegression": {
                "classification": "R.01 still-blocking",
                "bt94aClaimAllowed": False,
            },
        },
        "phaseOrder": {
            "93G.1": "start truth, comparable matrix, gate logic, start contract",
            "93G.2": "natural terminal/death/truncation wiring",
            "93G.3": "pre-sampling policy-level mask",
            "93G.4": "reward and diagnosis gates",
            "93G.5": "comparable repair learner/eval/holdout",
            "93G.6": "gate refresh and handover decision",
        },
        "closurePaths": {
            "93G.1.1": "data/training/ppo/bt93g/start_truth.json",
            "93G.1.2": "data/training/ppo/bt93g/repair_matrix.json",
            "93G.1.3": "data/training/ppo/bt93g/start_contract.json#gateLogic",
            "93G.1.4": "data/training/ppo/bt93g/start_contract.json",
        },
        "repairMatrix": repair_matrix,
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    gate = _read_json(NO_START_GATE_PATH)
    precomparison = _read_json(BT93C_PRECOMPARISON_PATH)
    handover = _read_json(BT93C_HANDOVER_PATH)
    matrix = _read_json(BT93C_MATRIX_PATH)
    repair = _read_json(BT93F_REPAIR_PATH)
    terminal = _read_json(BT93F_TERMINAL_PATH)

    register = _finding_register(gate, handover, precomparison, matrix, repair, terminal)
    repair_matrix = _repair_matrix(gate, repair)
    start_contract = _start_contract(repair_matrix)
    prior_classification = _prior_matrix_classification(repair)

    start_truth = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_start_sanity.py",
        "gitSha": _git_sha(),
        "blockId": "BT93G",
        "phaseId": "93G.1",
        "resultClass": "start-sanity-pinned",
        "bt94aStatus": {
            "resultClass": gate.get("resultClass"),
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "precomparisonResultClass": _get(gate, "bt93cState", "precomparisonResultClass"),
            "bt94aBlockerCount": _get(gate, "bt93cState", "bt94aBlockerCount"),
        },
        "sourceArtifacts": {
            "noStartGate": _source(NO_START_GATE_PATH, "BT94A red no-start gate"),
            "bt93cPrecomparison": _source(BT93C_PRECOMPARISON_PATH, "BT93C/BT93F refreshed precomparison"),
            "bt93cHandover": _source(BT93C_HANDOVER_PATH, "BT93C/BT93F refreshed handover"),
            "bt93cEvidenceMatrix": _source(BT93C_MATRIX_PATH, "BT93C/BT93F evidence quality matrix"),
            "repairDiagnosticReport": _source(BT93F_REPAIR_PATH, "BT93F repair diagnostic report"),
            "handoverPackage": _source(BT93F_HANDOVER_PATH, "BT93F handover package"),
            "followupGateReport": _source(BT93F_FOLLOWUP_PATH, "BT93F follow-up gate report"),
            "actionSurfaceRepairReport": _source(BT93F_ACTION_PATH, "BT93F action/mask report"),
            "terminalRewardFailureReport": _source(BT93F_TERMINAL_PATH, "BT93F terminal/reward report"),
            "config": _source(BT93F_CONFIG_PATH, "BT93F diagnostic config"),
            "controlledTerminalDeathProbes": _optional_source(
                BT93F_ROOT / "controlled_terminal_death_probes.json",
                "BT93F controlled terminal/death probes",
            ),
        },
        "priorMatrixClassification": prior_classification,
        "repairMatrix": repair_matrix,
        "findingRegister": register,
        "findingSummary": _status_counts(register),
        "nextAllowedWork": [
            "93G.2 natural terminal/death/truncation wiring",
            "93G.3 pre-sampling policy mask",
            "93G.4 reward and diagnosis gate hardening",
        ],
        "stillForbidden": [
            "BT94A candidate run",
            "freeze candidate",
            "promotion or rollout signal",
            "PPO-Validate substitution",
            "DQN non-regression claim from 16-step diagnostics",
        ],
    }
    return start_truth, repair_matrix, start_contract


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93G start sanity artifacts.")
    parser.add_argument("--start-truth-output", default=str(DEFAULT_START_TRUTH_PATH))
    parser.add_argument("--repair-matrix-output", default=str(DEFAULT_REPAIR_MATRIX_PATH))
    parser.add_argument("--start-contract-output", default=str(DEFAULT_START_CONTRACT_PATH))
    parser.add_argument("--write", action="store_true", help="Write BT93G.1 artifacts.")
    args = parser.parse_args()

    start_truth, repair_matrix, start_contract = build_reports()
    if args.write:
        _write_json(_repo_path(args.start_truth_output), start_truth)
        _write_json(_repo_path(args.repair_matrix_output), repair_matrix)
        _write_json(_repo_path(args.start_contract_output), start_contract)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": start_truth["resultClass"],
                "priorMatrixClassification": start_truth["priorMatrixClassification"]["bt93gClassification"],
                "repairMatrixId": repair_matrix["matrixId"],
                "bt94aClaimable": start_truth["bt94aStatus"]["claimable"],
                "wrote": {
                    "startTruth": args.start_truth_output if args.write else None,
                    "repairMatrix": args.repair_matrix_output if args.write else None,
                    "startContract": args.start_contract_output if args.write else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
