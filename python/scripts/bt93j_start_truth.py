"""BT93J.0 start truth and diagnostic split builder.

This records the current BT93I/BT94A/BT93C evidence before any BT93J repair.
It does not train, repair, refresh BT94A, create a candidate, freeze, promote,
or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93I_ROOT = PPO_ROOT / "bt93i"
BT93J_ROOT = PPO_ROOT / "bt93j"
BT94A_ROOT = PPO_ROOT / "bt94a"

INPUT_ARTIFACTS = {
    "bt93iClosure": (
        BT93I_ROOT / "closure_gate_report.json",
        "BT93I closure gate and diagnose-blocked-closed state",
    ),
    "bt93iMatrixGreen": (
        BT93I_ROOT / "matrix_green_report.json",
        "BT93I eval/holdout matrix verdict",
    ),
    "bt93iHandoverPackage": (
        BT93I_ROOT / "handover_package.json",
        "BT93I handover and BT94A no-start handoff",
    ),
    "bt93iFollowupGate": (
        BT93I_ROOT / "followup_gate_report.json",
        "BT93I followup gate for remaining BT94A blockers",
    ),
    "bt94aNoStartGate": (
        BT94A_ROOT / "no_start_gate.json",
        "BT94A no-start gate after BT93I",
    ),
    "bt93cPrecomparison": (
        BT93C_ROOT / "precomparison_report.json",
        "BT93C/BT93I precomparison state",
    ),
    "bt93cEvidenceQualityMatrix": (
        BT93C_ROOT / "evidence_quality_matrix.json",
        "BT93C/BT93I evidence quality matrix",
    ),
}

DEFAULT_START_TRUTH_PATH = BT93J_ROOT / "start_truth.json"
DEFAULT_SPLIT_PATH = BT93J_ROOT / "diagnostic_split_report.json"

TRACKED_FINDINGS = ("F.05", "F.19", "F.27", "F.31")
REPAIR_ORDER = (
    ("observation", "93J.1", "Observation schema, order, shape, ranges, staleness, sync, and VecNormalize"),
    ("terminal-mapping", "93J.2", "Terminal, death, max-steps, forced-round, timeout, and runtime-failure mapping"),
    ("eval-matrix", "93J.2", "Eval/holdout matrix contract, minimum episodes, seeds, maps, modes, and DQN anchor"),
    ("action-safety", "93J.3", "Pre-sampling mask, clamp, veto, sanitizer, invalid action, and executed action"),
    ("reward-curriculum", "93J.3", "Reward breakdown versus episode length, terminal class, risk actions, and learning metrics"),
    ("training-pilot", "93J.4+", "Minimal repair, micro-test, pilot readiness, holdout guard, and long-run readiness"),
)

NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no pilot, holdout, long-run, or fix before diagnostic_split_report.json names one primary cause and counterprobe",
    "no productive RuntimeConfig, Strategy Flag, JS inference, model registry, rollback, Matchstart, AI-Hub, bridge, or authority change",
    "no gate downgrade from plan text, tmp output, mutable latest pointer, or governance-only command",
)

SCOPE_FILES = (
    "data/training/ppo/bt93j/**",
    "python/scripts/bt93j_*.py",
    "python/configs/ppo_bt93j*.json",
    "python/eval.py only after 93J.0-93J.4 prove diagnostic/report need",
    "python/train.py only after green readiness; no candidate or freeze run",
    "python/envs/**, python/callbacks/**, scripts/training-headless-lane-runner.mjs, src/state/training/** only for proven root cause",
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


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_sha() -> str:
    return _git_output(["git", "rev-parse", "HEAD"]) or "unknown"


def _artifact_git_sha(path: Path) -> str | None:
    value = _git_output(["git", "log", "-n", "1", "--format=%H", "--", _rel(path)])
    return value or None


def _workspace() -> dict[str, Any]:
    porcelain = _git_output(["git", "status", "--short"]).splitlines()
    return {
        "headSha": _git_sha(),
        "dirty": bool(porcelain),
        "statusShort": porcelain,
    }


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _collect_keys(value: Any, keys: Iterable[str]) -> list[Any]:
    key_set = set(keys)
    found: list[Any] = []

    def visit(node: Any) -> None:
        if isinstance(node, Mapping):
            for key, child in node.items():
                if key in key_set and child not in (None, ""):
                    found.append(child)
                visit(child)
        elif isinstance(node, list):
            for child in node:
                visit(child)

    visit(value)
    unique: list[Any] = []
    for item in found:
        if item not in unique:
            unique.append(item)
    return unique


def _source(path: Path, role: str, payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "artifactGitSha": _artifact_git_sha(path),
        "closureCapable": True,
        "generatedAt": payload.get("generatedAt"),
        "generatedBy": payload.get("generatedBy"),
        "matrixIds": _collect_keys(payload, ("matrixId",)),
        "path": _rel(path),
        "phaseId": payload.get("phaseId"),
        "resultClass": payload.get("resultClass") or payload.get("matrixVerdict"),
        "role": role,
        "runIds": _collect_keys(
            payload,
            (
                "runId",
                "baselineEvalRunId",
                "holdoutEvalRunId",
                "baselineReproEvalRunId",
                "modelRunId",
            ),
        ),
        "sha256": _sha256_file(path),
    }


def _load_inputs() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    payloads: dict[str, dict[str, Any]] = {}
    sources: dict[str, dict[str, Any]] = {}
    for key, (path, role) in INPUT_ARTIFACTS.items():
        payload = _read_json(path)
        payloads[key] = payload
        sources[key] = _source(path, role, payload)
    return payloads, sources


def _red_claim_checks(gate: Mapping[str, Any]) -> list[dict[str, Any]]:
    checks = gate.get("claimChecks") if isinstance(gate.get("claimChecks"), list) else []
    return [dict(check) for check in checks if isinstance(check, Mapping) and not check.get("ok")]


def _blocked_findings(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, dict[str, Any]]:
    gate = payloads["bt94aNoStartGate"]
    blockers = _get(gate, "bt93cState", "bt94aBlockers")
    by_id = {
        str(row.get("id")): dict(row)
        for row in blockers
        if isinstance(row, Mapping) and row.get("id") in TRACKED_FINDINGS
    } if isinstance(blockers, list) else {}

    matrix = payloads["bt93cEvidenceQualityMatrix"]
    rows = matrix.get("auditRegister") if isinstance(matrix.get("auditRegister"), list) else []
    matrix_by_id = {
        str(row.get("id")): dict(row)
        for row in rows
        if isinstance(row, Mapping) and row.get("id") in TRACKED_FINDINGS
    }

    result: dict[str, dict[str, Any]] = {}
    for finding_id in TRACKED_FINDINGS:
        gate_row = by_id.get(finding_id, {})
        matrix_row = matrix_by_id.get(finding_id, {})
        result[finding_id] = {
            "status": "bt94a-blocker",
            "gate": gate_row.get("gate") or matrix_row.get("gate") or "93J.0",
            "evidence": gate_row.get("evidence") or matrix_row.get("evidence"),
            "sourceArtifact": gate_row.get("source") or matrix_row.get("bt93iSourceArtifact") or "data/training/ppo/bt94a/no_start_gate.json",
            "needsPrimaryCause": True,
            "needsCounterprobe": True,
        }
    return result


def _category_gates() -> list[dict[str, Any]]:
    return [
        {
            "id": category,
            "phase": phase,
            "status": "not-run",
            "green": False,
            "notCausal": False,
            "description": description,
        }
        for category, phase, description in REPAIR_ORDER
    ]


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    payloads, sources = _load_inputs()
    workspace = _workspace()
    gate = payloads["bt94aNoStartGate"]
    closure = payloads["bt93iClosure"]
    matrix_green = payloads["bt93iMatrixGreen"]
    handover = payloads["bt93iHandoverPackage"]
    precomparison = payloads["bt93cPrecomparison"]
    evidence_matrix = payloads["bt93cEvidenceQualityMatrix"]
    blocked_findings = _blocked_findings(payloads)
    red_checks = _red_claim_checks(gate)

    common = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_start_truth.py",
        "gitSha": workspace["headSha"],
        "workspace": workspace,
        "sourceArtifacts": sources,
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "bt94aCheckboxClosed": False,
            "noGo": list(NO_GO),
        },
    }

    start_truth = {
        **common,
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.0",
        "resultClass": "start-truth-pinned",
        "claimBoundary": {
            "nextAllowedPhase": "93J.0",
            "bt94aClosedBefore94A1": True,
            "requiredBeforeAnyRepair": "diagnostic_split_report.json names one primary cause and counterprobe",
            "requiredBeforeAnyTraining": "all diagnostic category gates are green or non-causal",
        },
        "bt93iClosure": {
            "resultClass": closure.get("resultClass"),
            "followupRequired": _get(closure, "diagnoseBlocked", "followupRequired"),
            "remainingBt94aGates": _get(closure, "diagnoseBlocked", "remainingBt94aGates"),
        },
        "bt93iMatrix": {
            "matrixId": matrix_green.get("matrixId"),
            "resultClass": matrix_green.get("resultClass"),
            "matrixVerdict": matrix_green.get("matrixVerdict"),
            "blockedFindings": _get(matrix_green, "bt94aImpact", "blockedFindings"),
            "decision": _get(matrix_green, "bt94aImpact", "decision"),
        },
        "bt94aNoStartGate": {
            "resultClass": gate.get("resultClass"),
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "handoverReady": _get(gate, "bt93cState", "handoverReady"),
            "handoverGate": _get(gate, "bt93cState", "handoverGate"),
            "precomparisonResultClass": _get(gate, "bt93cState", "precomparisonResultClass"),
            "bt94aBlockerCount": _get(gate, "bt93cState", "bt94aBlockerCount"),
            "redClaimChecks": red_checks,
        },
        "precomparison": {
            "resultClass": precomparison.get("resultClass"),
            "matrixId": _get(gate, "bt93cState", "matrixId") or _get(precomparison, "comparisonMatrix", "matrixId"),
            "baselineId": _get(gate, "bt93cState", "baselineId") or _get(precomparison, "ppoCandidate", "baselineId"),
            "currentHandoverSource": gate.get("currentHandoverSource"),
        },
        "evidenceQuality": {
            "summary": evidence_matrix.get("summary"),
            "bt94aStoppers": evidence_matrix.get("bt94aStoppers"),
        },
        "trackedFindings": blocked_findings,
        "scopeFiles": list(SCOPE_FILES),
        "readyForRepair": False,
        "readyForTraining": False,
    }

    category_gates = _category_gates()
    diagnostic_split = {
        **common,
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.0",
        "resultClass": "diagnostic-split-blocked-before-repair",
        "readyForRepair": False,
        "readyForTraining": False,
        "primaryCause": None,
        "counterprobe": None,
        "repairOrder": [
            {
                "order": index,
                "category": category,
                "phase": phase,
                "description": description,
            }
            for index, (category, phase, description) in enumerate(REPAIR_ORDER, start=1)
        ],
        "categoryGates": category_gates,
        "trainingGateRule": (
            "readyForTraining remains false until every category gate is green or explicitly non-causal "
            "from versioned BT93J artifacts."
        ),
        "repairGateRule": (
            "readyForRepair remains false until exactly one primary cause and one counterprobe are named."
        ),
        "blockedFindings": {
            finding_id: {
                **finding,
                "firstDiagnosticPhase": "93J.1"
                if finding_id in {"F.05", "F.27"}
                else "93J.2",
                "diagnosticQuestion": _diagnostic_question(finding_id),
            }
            for finding_id, finding in blocked_findings.items()
        },
        "bt94aNoStartGate": start_truth["bt94aNoStartGate"],
        "noStartDecision": _get(gate, "noStartDecision"),
    }

    return start_truth, diagnostic_split


def _diagnostic_question(finding_id: str) -> str:
    questions = {
        "F.05": "Are Survival/Steps red because observations, terminal mapping, eval matrix, action safety, reward/curriculum, or training budget are invalid?",
        "F.19": "Are terminal/death classes red because mapping is invalid or because policy behavior truly remains player-dead-only?",
        "F.27": "Does ppo-regression persist after F.05, F.19, and F.31 inputs are validated, or is it only their aggregate symptom?",
        "F.31": "Can real eval/holdout show non-dead natural terminals under the same semantic window, or is the matrix incapable of observing them?",
    }
    return questions[finding_id]


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93J.0 start truth artifacts.")
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--start-truth-output", default=str(DEFAULT_START_TRUTH_PATH))
    parser.add_argument("--diagnostic-split-output", default=str(DEFAULT_SPLIT_PATH))
    args = parser.parse_args()

    start_truth, diagnostic_split = build_reports()
    if args.write_reports:
        _write_json(Path(args.start_truth_output), start_truth)
        _write_json(Path(args.diagnostic_split_output), diagnostic_split)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": start_truth["resultClass"],
                "readyForRepair": diagnostic_split["readyForRepair"],
                "readyForTraining": diagnostic_split["readyForTraining"],
                "bt94a": start_truth["bt94aNoStartGate"],
                "wrote": {
                    "startTruth": _rel(Path(args.start_truth_output)) if args.write_reports else None,
                    "diagnosticSplit": _rel(Path(args.diagnostic_split_output)) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
