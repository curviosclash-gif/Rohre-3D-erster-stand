"""BT93H gate refresh and handover package builder."""

from __future__ import annotations

import argparse
import copy
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93H_ROOT = PPO_ROOT / "bt93h"
BT94A_ROOT = PPO_ROOT / "bt94a"

PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
HANDOVER_PATH = BT93C_ROOT / "handover_report.json"
MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
BT94A_GATE_PATH = BT94A_ROOT / "no_start_gate.json"

TERMINAL_ROOT_PATH = BT93H_ROOT / "terminal_root_cause_report.json"
SURVIVAL_CONTRACT_PATH = BT93H_ROOT / "survival_gate_contract.json"
REPAIR_LADDER_PATH = BT93H_ROOT / "repair_ladder_report.json"
REPAIR_BUDGET_PATH = BT93H_ROOT / "repair_ladder_budget.json"

DEFAULT_PACKAGE_PATH = BT93H_ROOT / "handover_package.json"
DEFAULT_FOLLOWUP_PATH = BT93H_ROOT / "followup_gate_report.json"
DEFAULT_ERROR_REPORT_PATH = (
    REPO_ROOT
    / "docs"
    / "Fehlerberichte"
    / "2026-04-25_bt93h-gate-refresh-diagnose-blocked.md"
)

BT94A_BLOCKER_FINDINGS = ("F.05", "F.19", "F.27", "F.31")


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


def _status_counts(rows: list[Mapping[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        status = str(row.get("status"))
        counts[status] = counts.get(status, 0) + 1
    return counts


def _status_from_disposition(disposition: str | None) -> str:
    return "bt94a-blocker" if str(disposition or "").startswith("still-blocking") else "closed"


def _finding_dispositions(repair: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    dispositions = repair.get("findingDisposition") if isinstance(repair.get("findingDisposition"), Mapping) else {}
    deltas = _get(repair, "comparison", "deltasAgainstDqn") or {}
    hard = repair.get("resultRules") if isinstance(repair.get("resultRules"), Mapping) else {}
    blockers = "; ".join(str(reason) for reason in hard.get("blockingReasons") or [])
    return {
        "F.05": {
            "disposition": str(dispositions.get("F.05", "still-blocking")),
            "evidence": (
                "BT93H comparable-terminal-repair keeps Survival-First blocked: "
                f"evalAvgStepsPerEpisodePct={deltas.get('evalAvgStepsPerEpisodePct')}, "
                f"holdoutAvgStepsPerEpisodePct={deltas.get('holdoutAvgStepsPerEpisodePct')}."
            ),
            "source": _rel(REPAIR_LADDER_PATH),
        },
        "F.19": {
            "disposition": str(dispositions.get("F.19", "still-blocking")),
            "evidence": "BT93H eval/holdout terminal/death matrix is not start-capable.",
            "source": _rel(REPAIR_LADDER_PATH),
        },
        "F.27": {
            "disposition": str(dispositions.get("F.27", "still-blocking")),
            "evidence": f"BT93H comparison remains {deltas.get('resultClass')}; hard rules: {blockers}.",
            "source": _rel(REPAIR_LADDER_PATH),
        },
        "F.31": {
            "disposition": str(dispositions.get("F.31", "still-blocking")),
            "evidence": "BT93H natural terminal evidence remains absent; only player-dead death cases were observed.",
            "source": _rel(REPAIR_LADDER_PATH),
        },
    }


def _build_precomparison(base: Mapping[str, Any], repair: Mapping[str, Any]) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    comparison = repair.get("comparison") if isinstance(repair.get("comparison"), Mapping) else {}
    deltas = comparison.get("deltasAgainstDqn") if isinstance(comparison.get("deltasAgainstDqn"), Mapping) else {}
    result_class = deltas.get("resultClass") or "ppo-regression"
    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93h_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93H.4.1",
            "claim": "BT93H-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": result_class,
        }
    )
    report["bt93hPhaseCoverage"] = {
        "93H.4.1": True,
        "93H.4.2": "pending bt94a_gate_check.py --write-report",
        "93H.4.3": repair.get("resultClass") == "diagnose-blocked",
        "93H.4.4": True if repair.get("resultClass") == "BT94A-ready" else "not-applicable-red-gate",
    }
    report.setdefault("metrics", {})
    report["metrics"]["ppoBt93hComparableTerminalEval"] = comparison.get("ppoComparableTerminalEval")
    report["metrics"]["ppoBt93hHoldout"] = comparison.get("ppoHoldout")
    report["metrics"]["deltasAgainstDqn"] = {
        **dict(deltas),
        "targetSurvivalForPlus30Pct": _get(
            report,
            "metrics",
            "deltasAgainstDqn",
            "targetSurvivalForPlus30Pct",
        ),
    }
    report.setdefault("ppoCandidate", {})
    report["ppoCandidate"].update(
        {
            "baselineEvalRunId": _get(comparison, "ppoComparableTerminalEval", "runId"),
            "holdoutEvalRunId": _get(comparison, "ppoHoldout", "runId"),
            "candidateRun": False,
            "promotionAllowed": False,
        }
    )
    report["evidenceInterpretation"] = {
        "class": result_class,
        "isPromotionEvidence": False,
        "isRolloutSignal": False,
        "internalEvalSurvivalIsPpoValidate": False,
        "ppoValidateStatus": "ppo-validate-missing-until-BT94B.3",
        "summary": "BT93H consumed comparable-terminal-repair eval/holdout and keeps BT94A closed when hard start rules remain red.",
    }
    report.setdefault("guardrails", {})
    report["guardrails"].update(
        {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "bt94aGate": "closed-diagnose-blocked-by-bt93h",
            "candidateRun": False,
            "freezeCandidate": False,
            "rolloutAllowed": False,
        }
    )
    report.setdefault("sourceReports", {})
    report["sourceReports"].update(
        {
            "bt93hTerminalRootCause": _source(TERMINAL_ROOT_PATH, "BT93H terminal root cause"),
            "bt93hSurvivalGateContract": _source(SURVIVAL_CONTRACT_PATH, "BT93H survival gate contract"),
            "bt93hRepairLadder": _source(REPAIR_LADDER_PATH, "BT93H repair ladder"),
            "bt93hRepairBudget": _source(REPAIR_BUDGET_PATH, "BT93H repair budget"),
        }
    )
    report["bt93hRefresh"] = {
        "phaseId": "93H.4.1",
        "repairLadderResultClass": repair.get("resultClass"),
        "resultClass": "diagnose-blocked" if result_class == "ppo-regression" else "start-gate-refresh",
    }
    return report


def _build_matrix(base: Mapping[str, Any], dispositions: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    rows = []
    for row in report.get("auditRegister") or []:
        if not isinstance(row, Mapping):
            continue
        updated = dict(row)
        finding_id = str(updated.get("id"))
        if finding_id in BT94A_BLOCKER_FINDINGS and finding_id in dispositions:
            disposition = dispositions[finding_id]
            status = _status_from_disposition(str(disposition.get("disposition")))
            updated.update(
                {
                    "status": status,
                    "gate": "93H.4/BT94A",
                    "evidence": disposition["evidence"],
                    "blocksBt94a": status == "bt94a-blocker",
                    "bt93hDisposition": disposition["disposition"],
                    "bt93hSourceArtifact": disposition["source"],
                }
            )
        rows.append(updated)
    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93h_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93H.4.1",
            "auditRegister": rows,
            "summary": _status_counts(rows),
            "bt94aStoppers": [
                str(row.get("id"))
                for row in rows
                if row.get("status") == "bt94a-blocker"
            ],
        }
    )
    report["bt93hRefresh"] = {
        "phaseId": "93H.4.1",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "allTrackedFindingsExplicit": all(bool(disposition.get("disposition")) for disposition in dispositions.values()),
    }
    report.setdefault("sourceArtifacts", {})
    report["sourceArtifacts"].update(
        {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93H-refreshed precomparison"),
            "bt93hRepairLadder": _source(REPAIR_LADDER_PATH, "BT93H repair ladder"),
        }
    )
    return report


def _build_handover(
    base: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    blockers = list(matrix.get("bt94aStoppers") or [])
    ready = bool(precomparison.get("resultClass") != "ppo-regression" and not blockers)
    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93h_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93H.4.1",
            "claim": "BT93H-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": "BT94A-ready" if ready else "diagnose",
        }
    )
    report["bt93hPhaseCoverage"] = {
        "93H.4.1": True,
        "93H.4.2": "pending bt94a_gate_check.py --write-report",
        "93H.4.3": not ready,
        "93H.4.4": True if ready else "not-applicable-red-gate",
    }
    report["bt94aHandover"] = {
        "ready": ready,
        "gate": "open-for-94A1-matrix-definition" if ready else "closed-diagnose-blocked-by-bt93h",
        "reason": (
            "BT93H still has red start evidence; BT94A remains closed."
            if not ready
            else "BT93H closed all BT94A start blockers and refreshed the handover gate."
        ),
        "precomparisonResult": precomparison.get("resultClass"),
        "ppoValidateStatus": _get(precomparison, "evidenceInterpretation", "ppoValidateStatus"),
        "rolloutAllowed": False,
        "promotionAllowed": False,
    }
    report["remainingGates"] = {
        "bt94a": blockers,
        "bt94bPpoValidate": "BT94B.3 remains mandatory before promote",
        "runtimeRollout": "outside BT93H; no JS inference, strategy flag, registry, rollback, or latency proof here",
    }
    report["bt93hHandoverGate"] = {
        "phaseId": "93H.4.1",
        "resultClass": "BT94A-ready" if ready else "diagnose-blocked",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "noBt94aCheckboxClosed": not ready,
    }
    report.setdefault("guardrails", {})
    report["guardrails"].update(
        {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "isPromotionEvidence": False,
            "isRolloutSignal": False,
        }
    )
    report.setdefault("sourceArtifacts", {})
    report["sourceArtifacts"].update(
        {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93H-refreshed precomparison"),
            "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93H-refreshed evidence matrix"),
            "bt93hRepairLadder": _source(REPAIR_LADDER_PATH, "BT93H repair ladder"),
        }
    )
    return report


def write_upstream_reports() -> dict[str, Any]:
    precomparison_base = _read_json(PRECOMPARISON_PATH)
    handover_base = _read_json(HANDOVER_PATH)
    matrix_base = _read_json(MATRIX_PATH)
    repair = _read_json(REPAIR_LADDER_PATH)
    dispositions = _finding_dispositions(repair)

    precomparison = _build_precomparison(precomparison_base, repair)
    _write_json(PRECOMPARISON_PATH, precomparison)

    matrix = _build_matrix(matrix_base, dispositions)
    _write_json(MATRIX_PATH, matrix)

    handover = _build_handover(handover_base, precomparison, matrix, dispositions)
    _write_json(HANDOVER_PATH, handover)

    return {
        "precomparisonReport": _rel(PRECOMPARISON_PATH),
        "handoverReport": _rel(HANDOVER_PATH),
        "evidenceQualityMatrix": _rel(MATRIX_PATH),
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
    }


def _red_checks(gate: Mapping[str, Any]) -> list[dict[str, Any]]:
    checks = gate.get("claimChecks") if isinstance(gate.get("claimChecks"), list) else []
    return [dict(check) for check in checks if isinstance(check, Mapping) and not check.get("ok")]


def _gate_is_green(gate: Mapping[str, Any], handover: Mapping[str, Any], matrix: Mapping[str, Any]) -> bool:
    return bool(
        gate.get("resultClass") == "claimable"
        and gate.get("claimable") is True
        and gate.get("candidateRunsAllowed") is True
        and gate.get("matrixDefinitionAllowed") is True
        and _get(handover, "bt94aHandover", "ready") is True
        and _get(matrix, "summary", "bt94a-blocker") in {0, None}
    )


def build_package(error_report_path: Path | None = None, followup_path: Path | None = None) -> dict[str, Any]:
    precomparison = _read_json(PRECOMPARISON_PATH)
    handover = _read_json(HANDOVER_PATH)
    matrix = _read_json(MATRIX_PATH)
    gate = _read_json(BT94A_GATE_PATH)
    repair = _read_json(REPAIR_LADDER_PATH)
    green = _gate_is_green(gate, handover, matrix)
    red_checks = _red_checks(gate)
    remaining = list(_get(handover, "remainingGates", "bt94a") or [])
    source_artifacts = {
        "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93H-refreshed precomparison"),
        "handoverReport": _source(HANDOVER_PATH, "BT93H-refreshed handover"),
        "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93H-refreshed evidence matrix"),
        "bt94aGate": _source(BT94A_GATE_PATH, "BT94A gate check"),
        "bt93hTerminalRootCause": _source(TERMINAL_ROOT_PATH, "BT93H terminal root cause"),
        "bt93hSurvivalGateContract": _source(SURVIVAL_CONTRACT_PATH, "BT93H survival gate contract"),
        "bt93hRepairLadder": _source(REPAIR_LADDER_PATH, "BT93H repair ladder"),
    }
    if followup_path is not None and followup_path.exists():
        source_artifacts["followupGateReport"] = _source(followup_path, "BT93H followup gate report")
    if error_report_path is not None and error_report_path.exists():
        source_artifacts["diagnoseBlockedErrorReport"] = _source(error_report_path, "BT93H diagnose-blocked error report")
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93h_gate_refresh_handover.py",
        "blockId": "BT93H",
        "phaseId": "93H.4",
        "gitSha": _git_sha(),
        "resultClass": "BT94A-ready" if green else "diagnose-blocked",
        "phaseCoverage": {
            "93H.4.1": precomparison.get("generatedBy") == "python/scripts/bt93h_gate_refresh_handover.py"
            and handover.get("generatedBy") == "python/scripts/bt93h_gate_refresh_handover.py"
            and matrix.get("generatedBy") == "python/scripts/bt93h_gate_refresh_handover.py",
            "93H.4.2": gate.get("generatedBy") == "python/scripts/bt94a_gate_check.py",
            "93H.4.3": not green,
            "93H.4.4": True if green else "not-applicable-red-gate",
        },
        "bt94aStartStatus": {
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "resultClass": gate.get("resultClass"),
            "handoverReady": _get(handover, "bt94aHandover", "ready"),
            "handoverGate": _get(handover, "bt94aHandover", "gate"),
            "precomparisonResultClass": precomparison.get("resultClass"),
            "bt94aBlockerCount": _get(matrix, "summary", "bt94a-blocker"),
            "status": "BT94A may start at 94A.1" if green else "BT94A remains closed before 94A.1",
        },
        "diagnoseBlocked": {
            "active": not green,
            "redChecks": red_checks,
            "remainingBt94aGates": remaining,
            "repairLadderResultClass": repair.get("resultClass"),
            "nextRepairOrReplanStep": (
                "BT93H ended diagnose-blocked. A user-owned replan or narrower follow-up repair "
                "must close or explicitly downgate F.05/F.19/F.27/F.31 before BT94A.1 can be claimed."
            ),
            "noBt94aCheckboxClosed": not green,
        },
        "bt94aReady": {
            "active": green,
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "ppoValidateRestDebt": "BT94B.3 remains mandatory before promote",
            "rolloutRestDebt": "BT95/separate rollout remains mandatory before runtime activation",
        },
        "sourceArtifacts": source_artifacts,
        "commands": {
            "refreshReports": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_gate_refresh_handover.py --write-upstream-reports",
            "gateCheck": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report",
            "package": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_gate_refresh_handover.py --write-package --write-followup-report --write-error-report",
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
        },
    }


def build_followup_report(package: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93h_gate_refresh_handover.py",
        "blockId": "BT93H",
        "phaseId": "93H.4.3",
        "resultClass": "diagnose-blocked" if package.get("resultClass") == "diagnose-blocked" else "not-needed",
        "followupRequired": package.get("resultClass") == "diagnose-blocked",
        "remainingBt94aGates": _get(package, "diagnoseBlocked", "remainingBt94aGates") or [],
        "redClaimChecks": _get(package, "diagnoseBlocked", "redChecks") or [],
        "nextGate": {
            "allowed": [
                "user-owned replan",
                "narrow follow-up repair for remaining BT94A start blockers",
                "record no-start decision without opening BT94A",
            ],
            "forbidden": [
                "94A.* checkbox closure while no_start_gate is red",
                "BT94A candidate run",
                "freeze candidate",
                "BT94B handover",
                "promote or rollout-ready wording",
            ],
        },
        "affectedArtifacts": [
            _rel(PRECOMPARISON_PATH),
            _rel(HANDOVER_PATH),
            _rel(MATRIX_PATH),
            _rel(BT94A_GATE_PATH),
            _rel(DEFAULT_PACKAGE_PATH),
        ],
    }


def write_error_report(path: Path, package: Mapping[str, Any]) -> None:
    red_checks = _get(package, "diagnoseBlocked", "redChecks") or []
    red_check_ids = ", ".join(str(check.get("id")) for check in red_checks if isinstance(check, Mapping))
    remaining = ", ".join(str(item) for item in _get(package, "diagnoseBlocked", "remainingBt94aGates") or [])
    content = f"""# Fehlerbericht: BT93H 93H.4 Gate-Refresh bleibt diagnose-blocked

Datum: 2026-04-25

## Task Context

BT93H.4 sollte `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93H-Artefakten neu schreiben und danach den BT94A-Startstatus hart ableiten.

## Failure

`bt94a_gate_check.py --write-report` bleibt rot: `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`.

Rote Claim-Checks: {red_check_ids or "keine"}.

Verbleibende BT94A-Gates: {remaining or "keine"}.

## Reproduction Path

1. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_gate_refresh_handover.py --write-upstream-reports`
2. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report`
3. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_gate_refresh_handover.py --write-package --write-followup-report --write-error-report`

## Affected Files

- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93h/handover_package.json`
- `data/training/ppo/bt93h/followup_gate_report.json`

## Attempted Fixes

BT93H.1 bis BT93H.3 lieferten Terminal-Root-Cause, Survival-Gate-Kontrakt und einen comparable-terminal-repair Lauf mit Eval/Holdout. Die Evidence reicht nicht fuer BT94A.1, weil Steps gegen den DQN-Anker regressieren, Mindestepisoden verfehlt wurden und die Natural-Terminal-Matrix nicht startfaehig ist.

## Status

`diagnose-blocked`. Keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze-Kandidat, kein BT94B-Handover, kein Promote und kein Rollout-Signal.

## Next Step

User-owned Replan oder enger Folgeblock fuer F.05/F.19/F.27/F.31.
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93H gate refresh and handover artifacts.")
    parser.add_argument("--write-upstream-reports", action="store_true")
    parser.add_argument("--write-package", action="store_true")
    parser.add_argument("--write-followup-report", action="store_true")
    parser.add_argument("--write-error-report", action="store_true")
    parser.add_argument("--package-output", default=str(DEFAULT_PACKAGE_PATH))
    parser.add_argument("--followup-output", default=str(DEFAULT_FOLLOWUP_PATH))
    parser.add_argument("--error-report", default=str(DEFAULT_ERROR_REPORT_PATH))
    args = parser.parse_args()

    wrote: dict[str, Any] = {}
    if args.write_upstream_reports:
        wrote["upstreamReports"] = write_upstream_reports()

    package_path = Path(args.package_output).resolve()
    followup_path = Path(args.followup_output).resolve()
    error_report_path = Path(args.error_report).resolve()
    package: dict[str, Any] | None = None
    if args.write_package or args.write_followup_report or args.write_error_report:
        package = build_package()
        if args.write_followup_report:
            followup = build_followup_report(package)
            _write_json(followup_path, followup)
            wrote["followupReport"] = _rel(followup_path)
            package = build_package(followup_path=followup_path)
        if args.write_error_report and package.get("resultClass") == "diagnose-blocked":
            write_error_report(error_report_path, package)
            wrote["errorReport"] = _rel(error_report_path)
            package = build_package(error_report_path=error_report_path, followup_path=followup_path)
        if args.write_package:
            _write_json(package_path, package)
            wrote["handoverPackage"] = _rel(package_path)

    if not wrote:
        package = build_package()

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": (package or {}).get("resultClass"),
                "wrote": wrote,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
