"""BT93I.99 closure gate report builder.

The report closes BT93I as diagnose-blocked without opening BT94A, creating a
freeze candidate, promoting PPO, or touching runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93I_ROOT = PPO_ROOT / "bt93i"
BT94A_ROOT = PPO_ROOT / "bt94a"

PLAN_PATH = REPO_ROOT / "docs" / "bot-training" / "Bot_Trainingsplan.md"
MATRIX_GREEN_PATH = BT93I_ROOT / "matrix_green_report.json"
HANDOVER_PACKAGE_PATH = BT93I_ROOT / "handover_package.json"
FOLLOWUP_GATE_PATH = BT93I_ROOT / "followup_gate_report.json"
EVIDENCE_MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
NO_START_GATE_PATH = BT94A_ROOT / "no_start_gate.json"
DEFAULT_REPORT_PATH = BT93I_ROOT / "closure_gate_report.json"

TRACKED_FINDINGS = ("F.05", "F.19", "F.27", "F.31")
FORBIDDEN_RESULT_LABELS = {"promote", "rollout-ready", "freeze-candidate", "BT94B-ready"}
SUBPHASE_RE = re.compile(r"^- \[(?P<state>[ x/])\] (?P<id>93I\.(?P<section>[1-5])\.\d+)\b(?P<body>.*)$")


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


def _is_false(value: Any) -> bool:
    return value is False or value == "false"


def _plan_phase_coverage() -> dict[str, Any]:
    phase_items: dict[str, dict[str, Any]] = {}
    section_counts: dict[str, dict[str, int]] = {
        f"93I.{section}": {"complete": 0, "total": 0, "withEvidence": 0}
        for section in range(1, 6)
    }

    for line_number, line in enumerate(PLAN_PATH.read_text(encoding="utf-8").splitlines(), start=1):
        match = SUBPHASE_RE.match(line)
        if not match:
            continue
        phase_id = match.group("id")
        section_id = f"93I.{match.group('section')}"
        body = match.group("body")
        state = match.group("state")
        has_evidence = "(abgeschlossen:" in body and "evidence:" in body and "->" in body
        section_counts[section_id]["total"] += 1
        section_counts[section_id]["complete"] += 1 if state == "x" else 0
        section_counts[section_id]["withEvidence"] += 1 if has_evidence else 0
        phase_items[phase_id] = {
            "line": line_number,
            "state": state,
            "complete": state == "x",
            "hasEvidence": has_evidence,
        }

    missing_sections = [
        section_id
        for section_id, counts in section_counts.items()
        if counts["total"] == 0 or counts["complete"] != counts["total"] or counts["withEvidence"] != counts["total"]
    ]
    return {
        "ok": not missing_sections,
        "sectionCounts": section_counts,
        "missingOrIncompleteSections": missing_sections,
        "items": phase_items,
    }


def _audit_rows_by_id(evidence_matrix: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    rows: dict[str, Mapping[str, Any]] = {}
    for row in evidence_matrix.get("auditRegister") or []:
        if isinstance(row, Mapping) and row.get("id") in TRACKED_FINDINGS:
            rows[str(row["id"])] = row
    return rows


def _finding_visibility(
    matrix_green: Mapping[str, Any],
    handover_package: Mapping[str, Any],
    followup_gate: Mapping[str, Any],
    evidence_matrix: Mapping[str, Any],
    no_start_gate: Mapping[str, Any],
) -> dict[str, Any]:
    audit_rows = _audit_rows_by_id(evidence_matrix)
    matrix_dispositions = matrix_green.get("findingDisposition") if isinstance(matrix_green.get("findingDisposition"), Mapping) else {}
    followup_remaining = set(str(item) for item in followup_gate.get("remainingBt94aGates") or [])
    handover_remaining = set(str(item) for item in _get(handover_package, "diagnoseBlocked", "remainingBt94aGates") or [])
    gate_remaining = set(str(item) for item in _get(no_start_gate, "bt93cState", "remainingBt94aGates") or [])
    matrix_stoppers = set(str(item) for item in evidence_matrix.get("bt94aStoppers") or [])

    findings: dict[str, Any] = {}
    for finding_id in TRACKED_FINDINGS:
        row = audit_rows.get(finding_id, {})
        status = row.get("status")
        disposition = matrix_dispositions.get(finding_id)
        visible = bool(
            status in {"closed", "follow-gated", "bt94a-blocker"}
            and disposition in {"closed", "closed-for-bt93i-matrix", "still-blocking"}
            and finding_id in followup_remaining
            and finding_id in handover_remaining
            and finding_id in gate_remaining
            and finding_id in matrix_stoppers
        )
        findings[finding_id] = {
            "visibleOrClosed": visible,
            "status": status,
            "disposition": disposition,
            "followupGate": finding_id in followup_remaining,
            "handoverPackage": finding_id in handover_remaining,
            "noStartGate": finding_id in gate_remaining,
            "evidenceMatrixStopper": finding_id in matrix_stoppers,
            "source": row.get("bt93iSourceArtifact") or row.get("evidence"),
        }

    return {
        "ok": all(item["visibleOrClosed"] for item in findings.values()),
        "findings": findings,
    }


def _forbidden_result_check(
    matrix_green: Mapping[str, Any],
    handover_package: Mapping[str, Any],
    no_start_gate: Mapping[str, Any],
) -> dict[str, Any]:
    result_fields = {
        "matrix_green.resultClass": matrix_green.get("resultClass"),
        "matrix_green.matrixVerdict": matrix_green.get("matrixVerdict"),
        "handover_package.resultClass": handover_package.get("resultClass"),
        "no_start_gate.resultClass": no_start_gate.get("resultClass"),
        "no_start_gate.noStartDecision.status": _get(no_start_gate, "noStartDecision", "status"),
    }
    guardrail_fields = {
        "matrix_green.promotionAllowed": _get(matrix_green, "guardrails", "promotionAllowed"),
        "matrix_green.rolloutSignal": _get(matrix_green, "guardrails", "rolloutSignal"),
        "matrix_green.freezeCandidate": _get(matrix_green, "guardrails", "freezeCandidate"),
        "handover_package.promotionAllowed": _get(handover_package, "guardrails", "promotionAllowed"),
        "handover_package.rolloutSignal": _get(handover_package, "guardrails", "rolloutSignal"),
        "handover_package.freezeCandidate": _get(handover_package, "guardrails", "freezeCandidate"),
        "handover_package.candidateRun": _get(handover_package, "guardrails", "candidateRun"),
        "no_start_gate.candidateRunsAllowed": no_start_gate.get("candidateRunsAllowed"),
        "no_start_gate.candidateFreezeAllowed": no_start_gate.get("candidateFreezeAllowed"),
        "no_start_gate.claimable": no_start_gate.get("claimable"),
    }
    bad_labels = {
        key: value
        for key, value in result_fields.items()
        if isinstance(value, str) and value in FORBIDDEN_RESULT_LABELS
    }
    bad_guardrails = {
        key: value
        for key, value in guardrail_fields.items()
        if not _is_false(value)
    }
    return {
        "ok": not bad_labels and not bad_guardrails,
        "resultFields": result_fields,
        "guardrailFields": guardrail_fields,
        "forbiddenLabels": bad_labels,
        "unexpectedOpenGuardrails": bad_guardrails,
    }


def build_report(governance_gate_passed: bool = False) -> dict[str, Any]:
    matrix_green = _read_json(MATRIX_GREEN_PATH)
    handover_package = _read_json(HANDOVER_PACKAGE_PATH)
    followup_gate = _read_json(FOLLOWUP_GATE_PATH)
    evidence_matrix = _read_json(EVIDENCE_MATRIX_PATH)
    no_start_gate = _read_json(NO_START_GATE_PATH)

    phase_coverage = _plan_phase_coverage()
    finding_visibility = _finding_visibility(
        matrix_green,
        handover_package,
        followup_gate,
        evidence_matrix,
        no_start_gate,
    )
    forbidden_results = _forbidden_result_check(matrix_green, handover_package, no_start_gate)
    no_start_status = {
        "claimable": no_start_gate.get("claimable"),
        "candidateRunsAllowed": no_start_gate.get("candidateRunsAllowed"),
        "matrixDefinitionAllowed": no_start_gate.get("matrixDefinitionAllowed"),
        "candidateFreezeAllowed": no_start_gate.get("candidateFreezeAllowed"),
        "resultClass": no_start_gate.get("resultClass"),
        "currentHandoverSource": no_start_gate.get("currentHandoverSource"),
    }
    conclusion_ok = (
        phase_coverage["ok"]
        and finding_visibility["ok"]
        and forbidden_results["ok"]
        and handover_package.get("resultClass") == "diagnose-blocked"
        and no_start_gate.get("claimable") is False
        and no_start_gate.get("candidateRunsAllowed") is False
        and no_start_gate.get("matrixDefinitionAllowed") is False
    )

    return {
        "ok": conclusion_ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_closure_gate.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.99",
        "resultClass": "diagnose-blocked-closed" if conclusion_ok else "closure-blocked",
        "phaseCoverage": {
            "93I.99.1": phase_coverage["ok"],
            "93I.99.2": finding_visibility["ok"],
            "93I.99.3": forbidden_results["ok"],
            "93I.99.4": True
            if governance_gate_passed
            else "requires npm.cmd run gates:pre-commit immediately before closure commit",
        },
        "bt93iSubphaseCoverage": phase_coverage,
        "trackedFindingVisibility": finding_visibility,
        "forbiddenResultCheck": forbidden_results,
        "noStartGate": no_start_status,
        "diagnoseBlocked": {
            "active": handover_package.get("resultClass") == "diagnose-blocked",
            "remainingBt94aGates": _get(handover_package, "diagnoseBlocked", "remainingBt94aGates") or [],
            "followupRequired": followup_gate.get("followupRequired"),
            "bt94aStatus": _get(no_start_gate, "noStartDecision", "status"),
        },
        "governance": {
            "closureGateCommand": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_closure_gate.py "
                "--write-report --governance-gate-pass"
            )
            if governance_gate_passed
            else "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_closure_gate.py --write-report",
            "preCommitGatePassed": governance_gate_passed,
            "requiredPreCommitGate": "npm.cmd run gates:pre-commit",
            "docsGatesAreNotPpoEvidence": True,
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "bt94aCheckboxClosed": False,
        },
        "sourceArtifacts": {
            "botTrainingPlan": _source(PLAN_PATH, "BT93I plan evidence"),
            "matrixGreenReport": _source(MATRIX_GREEN_PATH, "BT93I matrix green report"),
            "handoverPackage": _source(HANDOVER_PACKAGE_PATH, "BT93I handover package"),
            "followupGateReport": _source(FOLLOWUP_GATE_PATH, "BT93I followup gate report"),
            "evidenceQualityMatrix": _source(EVIDENCE_MATRIX_PATH, "BT93I-refreshed evidence matrix"),
            "noStartGate": _source(NO_START_GATE_PATH, "BT94A no-start gate"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93I.99 closure gate report.")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--governance-gate-pass", action="store_true")
    parser.add_argument("--report-output", default=str(DEFAULT_REPORT_PATH))
    args = parser.parse_args()

    report = build_report(governance_gate_passed=args.governance_gate_pass)
    if args.write_report:
        _write_json(Path(args.report_output), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "remainingBt94aGates": report["diagnoseBlocked"]["remainingBt94aGates"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
