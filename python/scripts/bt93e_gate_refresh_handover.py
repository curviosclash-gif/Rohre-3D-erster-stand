"""BT93E gate refresh and handover package builder.

This script propagates BT93E repair diagnostics into the BT93C artifacts
consumed by the BT94A gate. It records the final BT93E decision without
running candidates, creating a freeze candidate, or touching runtime surfaces.
"""

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
BT93E_ROOT = PPO_ROOT / "bt93e"
BT94A_ROOT = PPO_ROOT / "bt94a"

PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
HANDOVER_PATH = BT93C_ROOT / "handover_report.json"
MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
BT94A_GATE_PATH = BT94A_ROOT / "no_start_gate.json"

SURVIVAL_PATH = BT93E_ROOT / "survival_repair_report.json"
TERMINAL_PATH = BT93E_ROOT / "terminal_reward_failure_report.json"
ACTION_PATH = BT93E_ROOT / "action_surface_hardening_report.json"
FINDING_REGISTER_PATH = BT93E_ROOT / "finding_register.json"
START_MATRIX_PATH = BT93E_ROOT / "start_matrix.json"
FOLLOWUP_PATH = BT93E_ROOT / "followup_gate_report.json"
DEFAULT_PACKAGE_PATH = BT93E_ROOT / "handover_package.json"
DEFAULT_ERROR_REPORT_PATH = (
    REPO_ROOT
    / "docs"
    / "Fehlerberichte"
    / "2026-04-25_bt93e-gate-refresh-diagnose-blocked.md"
)

BT94A_BLOCKER_FINDINGS = ("F.05", "F.19", "F.27", "F.30", "F.31")
BT93E_SOURCE_REPORTS = {
    "F.05": SURVIVAL_PATH,
    "F.27": SURVIVAL_PATH,
    "F.19": TERMINAL_PATH,
    "F.31": TERMINAL_PATH,
    "F.30": ACTION_PATH,
}


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
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "path": _rel(path),
        "sha256": _sha256_file(path),
        "role": role,
        "closureCapable": closure_capable,
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
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def _target_survival(dqn_survival: Any) -> float | None:
    value = _as_float(dqn_survival)
    return round(value * 1.3, 6) if value is not None else None


def _status_counts(rows: list[Mapping[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        status = str(row.get("status"))
        counts[status] = counts.get(status, 0) + 1
    return counts


def _status_from_disposition(disposition: str | None) -> str:
    return "bt94a-blocker" if disposition == "still-blocking" else "closed"


def _finding_dispositions(
    survival: Mapping[str, Any],
    terminal: Mapping[str, Any],
    action: Mapping[str, Any],
) -> dict[str, dict[str, Any]]:
    deltas = _get(survival, "comparison", "deltasAgainstDqn") or {}
    comparison_class = deltas.get("resultClass")
    terminal_status = terminal.get("findingDisposition") if isinstance(terminal.get("findingDisposition"), Mapping) else {}
    action_status = action.get("findingDisposition") if isinstance(action.get("findingDisposition"), Mapping) else {}

    return {
        "F.05": {
            "disposition": "still-blocking" if comparison_class == "ppo-regression" else "closed",
            "evidence": (
                "BT93E same-matrix eval/holdout keeps Survival-First blocked "
                f"(averageBotSurvivalPct={deltas.get('averageBotSurvivalPct')}, "
                f"holdoutAverageBotSurvivalPct={deltas.get('holdoutAverageBotSurvivalPct')})."
            ),
            "source": _rel(SURVIVAL_PATH),
        },
        "F.27": {
            "disposition": "still-blocking" if comparison_class == "ppo-regression" else "closed",
            "evidence": f"BT93E comparison remains {comparison_class}.",
            "source": _rel(SURVIVAL_PATH),
        },
        "F.19": {
            "disposition": str(terminal_status.get("F.19", "still-blocking")),
            "evidence": "BT93E terminal/death matrix remains insufficient for BT94A start.",
            "source": _rel(TERMINAL_PATH),
        },
        "F.30": {
            "disposition": str(action_status.get("F.30", "still-blocking")),
            "evidence": "BT93E policy-level masking remains absent while post-decode clamp/veto load blocks start.",
            "source": _rel(ACTION_PATH),
        },
        "F.31": {
            "disposition": str(terminal_status.get("F.31", "still-blocking")),
            "evidence": "BT93E natural terminal/death evidence remains weak.",
            "source": _rel(TERMINAL_PATH),
        },
    }


def _build_precomparison(
    base: Mapping[str, Any],
    survival: Mapping[str, Any],
    terminal: Mapping[str, Any],
    action: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    comparison = survival.get("comparison") if isinstance(survival.get("comparison"), Mapping) else {}
    deltas = comparison.get("deltasAgainstDqn") if isinstance(comparison.get("deltasAgainstDqn"), Mapping) else {}
    result_class = deltas.get("resultClass") or report.get("resultClass")
    dqn = comparison.get("dqnChampion") if isinstance(comparison.get("dqnChampion"), Mapping) else {}
    ppo_eval = comparison.get("ppoDiagnosticEval") if isinstance(comparison.get("ppoDiagnosticEval"), Mapping) else {}
    ppo_holdout = comparison.get("ppoHoldout") if isinstance(comparison.get("ppoHoldout"), Mapping) else {}

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93e_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93E.5.1",
            "claim": "BT93E-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": result_class,
        }
    )
    report["bt93ePhaseCoverage"] = {
        "93E.2": survival.get("phaseCoverage"),
        "93E.3": terminal.get("phaseCoverage"),
        "93E.4": action.get("phaseCoverage"),
        "93E.5.1": True,
        "93E.5.2": "pending bt94a_gate_check.py --write-report",
    }
    report.setdefault("ppoCandidate", {})
    report["ppoCandidate"]["baselineEvalRunId"] = ppo_eval.get("runId")
    report["ppoCandidate"]["holdoutEvalRunId"] = ppo_holdout.get("runId")
    report["ppoCandidate"]["promotionAllowed"] = False

    report.setdefault("metrics", {})
    report["metrics"]["dqnChampion"] = dqn or report["metrics"].get("dqnChampion")
    report["metrics"]["ppoBt93eDiagnosticEval"] = ppo_eval
    report["metrics"]["ppoBt93eHoldout"] = ppo_holdout
    report["metrics"]["deltasAgainstDqn"] = {
        "avgStepsPerEpisodePct": deltas.get("avgStepsPerEpisodePct"),
        "averageBotSurvivalPct": deltas.get("averageBotSurvivalPct"),
        "holdoutAverageBotSurvivalPct": deltas.get("holdoutAverageBotSurvivalPct"),
        "targetSurvivalForPlus30Pct": _target_survival(dqn.get("averageBotSurvival")),
        "resultClass": result_class,
    }

    report["evidenceInterpretation"] = {
        "class": result_class,
        "isPromotionEvidence": False,
        "isRolloutSignal": False,
        "internalEvalSurvivalIsPpoValidate": False,
        "ppoValidateStatus": "ppo-validate-missing",
        "summary": (
            "BT93E refreshed same-matrix eval, holdout, terminal, reward, and action-surface "
            "diagnostics. BT94A remains closed unless all claim checks turn green."
        ),
    }
    report.setdefault("guardrails", {})
    report["guardrails"].update(
        {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
            "bt94aGate": "closed-diagnose-blocked-by-bt93e",
            "rolloutAllowed": False,
            "candidateRun": False,
            "freezeCandidate": False,
        }
    )
    report.setdefault("sourceReports", {})
    report["sourceReports"].update(
        {
            "bt93eSurvivalRepair": _source(SURVIVAL_PATH, "BT93E survival repair"),
            "bt93eTerminalRewardFailure": _source(TERMINAL_PATH, "BT93E terminal/reward/failure diagnostics"),
            "bt93eActionSurfaceHardening": _source(ACTION_PATH, "BT93E action-surface hardening"),
            "bt93eFindingRegister": _source(FINDING_REGISTER_PATH, "BT93E finding register"),
            "bt93eStartMatrix": _source(START_MATRIX_PATH, "BT93E start matrix"),
        }
    )
    report["bt93eRefresh"] = {
        "phaseId": "93E.5.1",
        "resultClass": "diagnose-blocked" if result_class == "ppo-regression" else "start-gate-refresh",
        "findingDispositions": {
            finding_id: {
                **dict(disposition),
                "status": _status_from_disposition(str(disposition.get("disposition"))),
                "gate": "93E.5/BT94A",
            }
            for finding_id, disposition in dispositions.items()
        },
        "terminalRewardFailureResultClass": terminal.get("resultClass"),
        "actionSurfaceResultClass": action.get("resultClass"),
        "survivalRepairResultClass": survival.get("resultClass"),
    }
    return report


def _build_matrix(
    base: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    rows = []
    for row in report.get("auditRegister") or []:
        if not isinstance(row, Mapping):
            continue
        updated = dict(row)
        finding_id = str(updated.get("id"))
        if finding_id in dispositions:
            disposition = dispositions[finding_id]
            status = _status_from_disposition(str(disposition.get("disposition")))
            updated.update(
                {
                    "status": status,
                    "gate": "93E.5/BT94A",
                    "evidence": disposition["evidence"],
                    "blocksBt94a": status == "bt94a-blocker",
                    "bt93eDisposition": disposition["disposition"],
                    "bt93eSourceArtifact": disposition["source"],
                }
            )
        rows.append(updated)

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93e_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93E.5.1",
            "auditRegister": rows,
            "summary": _status_counts(rows),
            "bt94aStoppers": [
                str(row.get("id"))
                for row in rows
                if row.get("status") == "bt94a-blocker"
            ],
        }
    )
    report["bt93eRefresh"] = {
        "phaseId": "93E.5.1",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "allTrackedFindingsExplicit": all(
            disposition.get("disposition") in {"closed", "still-blocking"}
            for disposition in dispositions.values()
        ),
    }
    report.setdefault("sourceArtifacts", {})
    report["sourceArtifacts"].update(
        {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93E-refreshed precomparison"),
            "bt93eSurvivalRepair": _source(SURVIVAL_PATH, "BT93E survival repair"),
            "bt93eTerminalRewardFailure": _source(TERMINAL_PATH, "BT93E terminal/reward/failure diagnostics"),
            "bt93eActionSurfaceHardening": _source(ACTION_PATH, "BT93E action-surface hardening"),
            "bt93eFindingRegister": _source(FINDING_REGISTER_PATH, "BT93E finding register"),
        }
    )
    return report


def _build_handover(
    base: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    terminal: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    blockers = list(matrix.get("bt94aStoppers") or [])
    reward_blocking = _get(terminal, "findingDisposition", "R.01") == "still-blocking"
    precomparison_class = precomparison.get("resultClass")
    bt94a_ready = precomparison_class in {"ppo-promising", "ppo-hold", "BT94A-ready"} and not blockers and not reward_blocking
    result_class = "BT94A-ready" if bt94a_ready else "diagnose"
    remaining_bt94a = blockers + (["R.01"] if reward_blocking else [])

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93e_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93E.5.1",
            "claim": "BT93E-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": result_class,
        }
    )
    report["bt93ePhaseCoverage"] = {
        "93E.5.1": True,
        "93E.5.2": "pending bt94a_gate_check.py --write-report",
        "93E.5.3": not bt94a_ready,
        "93E.5.4": bt94a_ready,
    }
    report["bt94aHandover"] = {
        "ready": bt94a_ready,
        "gate": "open-for-94A1-matrix-definition" if bt94a_ready else "closed-diagnose-blocked-by-bt93e",
        "reason": (
            "BT93E still has red start evidence; BT94A remains closed."
            if not bt94a_ready
            else "BT93E closed all BT94A start blockers and refreshed the handover gate."
        ),
        "precomparisonResult": precomparison_class,
        "ppoValidateStatus": _get(precomparison, "evidenceInterpretation", "ppoValidateStatus"),
        "rolloutAllowed": False,
        "promotionAllowed": False,
    }
    report["remainingGates"] = {
        "bt94a": remaining_bt94a,
        "bt94bPpoValidate": "BT94B.3 remains mandatory before any promote verdict",
        "runtimeRollout": "outside BT93E; no JS inference, strategy flag, registry, rollback, or latency proof here",
    }
    report["evidenceQualityMatrix"] = {
        "path": _rel(MATRIX_PATH),
        "sha256": _sha256_file(MATRIX_PATH),
    }
    report.setdefault("guardrails", {})
    report["guardrails"].update(
        {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
            "isPromotionEvidence": False,
            "isRolloutSignal": False,
            "candidateRun": False,
            "freezeCandidate": False,
        }
    )
    report.setdefault("sourceArtifacts", {})
    report["sourceArtifacts"].update(
        {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93E-refreshed precomparison"),
            "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93E-refreshed evidence matrix"),
            "bt93eSurvivalRepair": _source(SURVIVAL_PATH, "BT93E survival repair"),
            "bt93eTerminalRewardFailure": _source(TERMINAL_PATH, "BT93E terminal/reward/failure diagnostics"),
            "bt93eActionSurfaceHardening": _source(ACTION_PATH, "BT93E action-surface hardening"),
            "bt93eFollowupGateReport": _source(FOLLOWUP_PATH, "BT93E followup gate report"),
        }
    )
    report["bt93eHandoverGate"] = {
        "phaseId": "93E.5.1",
        "resultClass": "BT94A-ready" if bt94a_ready else "diagnose-blocked",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "rewardSafetyEpisodeShortening": "still-blocking" if reward_blocking else "closed",
        "noBt94aCheckboxClosed": not bt94a_ready,
    }
    return report


def write_upstream_reports() -> dict[str, Any]:
    precomparison_base = _read_json(PRECOMPARISON_PATH)
    handover_base = _read_json(HANDOVER_PATH)
    matrix_base = _read_json(MATRIX_PATH)
    survival = _read_json(SURVIVAL_PATH)
    terminal = _read_json(TERMINAL_PATH)
    action = _read_json(ACTION_PATH)
    dispositions = _finding_dispositions(survival, terminal, action)

    precomparison = _build_precomparison(precomparison_base, survival, terminal, action, dispositions)
    _write_json(PRECOMPARISON_PATH, precomparison)

    matrix = _build_matrix(matrix_base, dispositions)
    _write_json(MATRIX_PATH, matrix)

    handover = _build_handover(handover_base, precomparison, matrix, terminal, dispositions)
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
        and gate.get("candidateFreezeAllowed") is False
        and _get(handover, "bt94aHandover", "ready") is True
        and _get(matrix, "summary", "bt94a-blocker") in {0, None}
    )


def build_package(error_report_path: Path | None = None) -> dict[str, Any]:
    precomparison = _read_json(PRECOMPARISON_PATH)
    handover = _read_json(HANDOVER_PATH)
    matrix = _read_json(MATRIX_PATH)
    gate = _read_json(BT94A_GATE_PATH)
    survival = _read_json(SURVIVAL_PATH)
    terminal = _read_json(TERMINAL_PATH)
    action = _read_json(ACTION_PATH)
    finding_register = _read_json(FINDING_REGISTER_PATH)
    start_matrix = _read_json(START_MATRIX_PATH)
    red_checks = _red_checks(gate)
    green = _gate_is_green(gate, handover, matrix)
    remaining_bt94a = list(_get(handover, "remainingGates", "bt94a") or [])

    source_artifacts: dict[str, Any] = {
        "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93E-refreshed precomparison"),
        "handoverReport": _source(HANDOVER_PATH, "BT93E-refreshed handover"),
        "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93E-refreshed evidence matrix"),
        "bt94aGate": _source(BT94A_GATE_PATH, "BT94A gate check"),
        "bt93eSurvivalRepair": _source(SURVIVAL_PATH, "BT93E survival repair"),
        "bt93eTerminalRewardFailure": _source(TERMINAL_PATH, "BT93E terminal/reward/failure diagnostics"),
        "bt93eActionSurfaceHardening": _source(ACTION_PATH, "BT93E action-surface hardening"),
        "bt93eFindingRegister": _source(FINDING_REGISTER_PATH, "BT93E finding register"),
        "bt93eStartMatrix": _source(START_MATRIX_PATH, "BT93E start matrix"),
        "bt93eFollowupGateReport": _source(FOLLOWUP_PATH, "BT93E followup gate report"),
    }
    if error_report_path is not None and error_report_path.exists():
        source_artifacts["diagnoseBlockedErrorReport"] = _source(
            error_report_path,
            "BT93E diagnose-blocked error report",
        )

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_gate_refresh_handover.py",
        "blockId": "BT93E",
        "phaseId": "93E.5",
        "gitSha": _git_sha(),
        "resultClass": "BT94A-ready" if green else "diagnose-blocked",
        "phaseCoverage": {
            "93E.5.1": (
                precomparison.get("generatedBy") == "python/scripts/bt93e_gate_refresh_handover.py"
                and handover.get("generatedBy") == "python/scripts/bt93e_gate_refresh_handover.py"
                and matrix.get("generatedBy") == "python/scripts/bt93e_gate_refresh_handover.py"
            ),
            "93E.5.2": gate.get("generatedBy") == "python/scripts/bt94a_gate_check.py",
            "93E.5.3": not green,
            "93E.5.4": green,
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
            "remainingBt94aGates": remaining_bt94a,
            "findingRegisterSummary": finding_register.get("summary"),
            "startMatrixResultClass": start_matrix.get("resultClass"),
            "nextRepairOrReplanStep": (
                "BT93E ended diagnose-blocked. A follow-up repair/replan must close or explicitly "
                "downgate the remaining start blockers before BT94A.1 can be claimed."
            ),
            "noBt94aCheckboxClosed": not green,
        },
        "bt94aReady": {
            "active": green,
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "ppoValidateRestDebt": "BT94B.3 remains mandatory before promote",
            "rolloutRestDebt": "BT95/separate rollout remains mandatory before runtime activation",
        },
        "artifactRefresh": {
            "precomparisonResultClass": precomparison.get("resultClass"),
            "handoverResultClass": handover.get("resultClass"),
            "handoverGate": _get(handover, "bt94aHandover", "gate"),
            "bt94aBlockerCount": _get(matrix, "summary", "bt94a-blocker"),
            "survivalRepairResultClass": survival.get("resultClass"),
            "terminalRewardFailureResultClass": terminal.get("resultClass"),
            "actionSurfaceResultClass": action.get("resultClass"),
        },
        "sourceArtifacts": source_artifacts,
        "commands": {
            "refreshReports": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93e_gate_refresh_handover.py "
                "--write-upstream-reports"
            ),
            "gateCheck": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report",
            "package": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93e_gate_refresh_handover.py "
                "--write-package --write-error-report --update-start-matrix"
            ),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "forbiddenWork": [
                "BT94A candidate runs inside BT93E",
                "freeze candidate creation inside BT93E",
                "BT94B handover inside BT93E",
                "promotion or rollout signal",
                "JS inference, strategy flag, registry, rollback, or latency claim",
            ],
        },
    }


def write_error_report(path: Path, package: Mapping[str, Any]) -> None:
    red_checks = package.get("diagnoseBlocked", {}).get("redChecks", [])
    red_check_ids = ", ".join(str(check.get("id")) for check in red_checks if isinstance(check, Mapping))
    remaining = ", ".join(str(item) for item in package.get("diagnoseBlocked", {}).get("remainingBt94aGates", []))
    content = f"""# Fehlerbericht: BT93E 93E.5 Gate-Refresh bleibt diagnose-blocked

Datum: 2026-04-25

## Task Context

BT93E.5 sollte `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93E-Artefakten neu schreiben und danach den BT94A-Startstatus hart ableiten.

## Failure

`bt94a_gate_check.py --write-report` bleibt rot: `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`.

Rote Claim-Checks: {red_check_ids or "keine"}.

Verbleibende BT94A-Gates: {remaining or "keine"}.

## Reproduction Path

1. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93e_gate_refresh_handover.py --write-upstream-reports`
2. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report`
3. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93e_gate_refresh_handover.py --write-package --write-error-report --update-start-matrix`

## Affected Files

- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93e/handover_package.json`

## Attempted Fixes

BT93E.2, BT93E.3 und BT93E.4 liefern neue Survival-/Holdout-, Terminal-/Reward-/Failure- und Action-Surface-Evidence. Diese Evidence reicht nicht fuer BT94A.1, weil die Startbedingungen weiterhin rot sind.

## Status

`diagnose-blocked`. Keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze-Kandidat, kein BT94B-Handover, kein Promote und kein Rollout-Signal.

## Next Step

`/fix-planung`
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def update_start_matrix(package: Mapping[str, Any], package_path: Path, error_report_path: Path | None) -> dict[str, Any]:
    start_matrix = _read_json(START_MATRIX_PATH) if START_MATRIX_PATH.exists() else {}
    updated = copy.deepcopy(start_matrix)
    refresh: dict[str, Any] = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_gate_refresh_handover.py",
        "phaseId": "93E.5",
        "resultClass": package.get("resultClass"),
        "phaseCoverage": package.get("phaseCoverage"),
        "bt94aStartStatus": package.get("bt94aStartStatus"),
        "diagnoseBlocked": package.get("diagnoseBlocked"),
        "bt94aReady": package.get("bt94aReady"),
        "sourcePackage": _source(package_path, "BT93E handover package"),
    }
    if error_report_path is not None and error_report_path.exists():
        refresh["diagnoseBlockedErrorReport"] = _source(error_report_path, "BT93E diagnose-blocked error report")
    updated["gateRefreshHandover"] = refresh
    _write_json(START_MATRIX_PATH, updated)
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93E gate refresh and handover artifacts.")
    parser.add_argument("--write-upstream-reports", action="store_true", help="Refresh BT93C gate input reports.")
    parser.add_argument("--write-package", action="store_true", help="Write BT93E handover package.")
    parser.add_argument("--write-error-report", action="store_true", help="Write a Fehlerbericht if the gate stays red.")
    parser.add_argument("--update-start-matrix", action="store_true", help="Record 93E.5 status in BT93E start_matrix.json.")
    parser.add_argument("--package-output", default=str(DEFAULT_PACKAGE_PATH), help="Package output path.")
    parser.add_argument("--error-report", default=str(DEFAULT_ERROR_REPORT_PATH), help="Diagnose-blocked report path.")
    args = parser.parse_args()

    wrote: dict[str, Any] = {}
    if args.write_upstream_reports:
        wrote["upstreamReports"] = write_upstream_reports()

    package_path = Path(args.package_output).resolve()
    error_report_path = Path(args.error_report).resolve()
    package: dict[str, Any] | None = None
    if args.write_package or args.write_error_report or args.update_start_matrix:
        package = build_package()
        if args.write_error_report and package.get("resultClass") == "diagnose-blocked":
            write_error_report(error_report_path, package)
            wrote["errorReport"] = _rel(error_report_path)
            package = build_package(error_report_path)
        if args.write_package:
            _write_json(package_path, package)
            wrote["handoverPackage"] = _rel(package_path)
        if args.update_start_matrix:
            update_start_matrix(package, package_path, error_report_path if error_report_path.exists() else None)
            wrote["startMatrix"] = _rel(START_MATRIX_PATH)

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
