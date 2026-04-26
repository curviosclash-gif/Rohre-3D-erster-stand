"""BT93G gate refresh and handover package builder.

This propagates BT93G repair-ladder evidence into the BT94A gate inputs. It
does not run candidates, create a freeze candidate, promote, or touch runtime
surfaces.
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
BT93G_ROOT = PPO_ROOT / "bt93g"
BT94A_ROOT = PPO_ROOT / "bt94a"

PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
HANDOVER_PATH = BT93C_ROOT / "handover_report.json"
MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
BT94A_GATE_PATH = BT94A_ROOT / "no_start_gate.json"

REPAIR_LADDER_PATH = BT93G_ROOT / "repair_ladder_report.json"
REPAIR_BUDGET_PATH = BT93G_ROOT / "repair_ladder_budget.json"
START_TRUTH_PATH = BT93G_ROOT / "start_truth.json"
REPAIR_MATRIX_PATH = BT93G_ROOT / "repair_matrix.json"
TERMINAL_PATH = BT93G_ROOT / "terminal_wiring_probe_report.json"
ACTION_PATH = BT93G_ROOT / "action_mask_report.json"
REWARD_PATH = BT93G_ROOT / "reward_gate_report.json"

DEFAULT_PACKAGE_PATH = BT93G_ROOT / "handover_package.json"
DEFAULT_FOLLOWUP_PATH = BT93G_ROOT / "followup_gate_report.json"
DEFAULT_ERROR_REPORT_PATH = (
    REPO_ROOT
    / "docs"
    / "Fehlerberichte"
    / "2026-04-25_bt93g-gate-refresh-diagnose-blocked.md"
)

BT94A_BLOCKER_FINDINGS = ("F.05", "F.19", "F.27", "F.30", "F.31")
BT93G_SOURCE_REPORTS = {
    "F.05": REPAIR_LADDER_PATH,
    "F.27": REPAIR_LADDER_PATH,
    "F.19": REPAIR_LADDER_PATH,
    "F.31": REPAIR_LADDER_PATH,
    "F.30": ACTION_PATH,
    "R.01": REWARD_PATH,
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


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


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
    return "bt94a-blocker" if str(disposition or "").startswith("still-blocking") else "closed"


def _finding_dispositions(repair: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    dispositions = _mapping(repair.get("findingDisposition"))
    deltas = _mapping(_get(repair, "comparison", "deltasAgainstDqn"))
    blockers = "; ".join(str(reason) for reason in _get(repair, "resultRules", "blockingReasons") or [])
    return {
        "F.05": {
            "disposition": str(dispositions.get("F.05", "still-blocking")),
            "evidence": (
                "BT93G comparable repair keeps Survival-First blocked because avgSteps regress "
                f"(avgStepsPerEpisodePct={deltas.get('avgStepsPerEpisodePct')})."
            ),
            "source": _rel(REPAIR_LADDER_PATH),
        },
        "F.27": {
            "disposition": str(dispositions.get("F.27", "still-blocking")),
            "evidence": f"BT93G comparison remains {deltas.get('resultClass')}; hard rules: {blockers}.",
            "source": _rel(REPAIR_LADDER_PATH),
        },
        "F.19": {
            "disposition": str(dispositions.get("F.19", "still-blocking")),
            "evidence": "BT93G eval/holdout terminal/death matrix is still empty or not start-capable.",
            "source": _rel(REPAIR_LADDER_PATH),
        },
        "F.30": {
            "disposition": str(dispositions.get("F.30", "closed-for-bt93g-repair-lane")),
            "evidence": "BT93G masked semantic action surface reports preSamplingMaskRate=1.0 and zero clamp/veto load.",
            "source": _rel(ACTION_PATH),
        },
        "F.31": {
            "disposition": str(dispositions.get("F.31", "still-blocking")),
            "evidence": "BT93G natural terminal/death evidence remains insufficient for BT94A start.",
            "source": _rel(REPAIR_LADDER_PATH),
        },
        "R.01": {
            "disposition": str(dispositions.get("R.01", "closed-for-93g-repair-eval")),
            "evidence": "BT93G reward gate no longer opens on reward mean alone; reward-hacking rule was applied.",
            "source": _rel(REWARD_PATH),
        },
    }


def _build_precomparison(
    base: Mapping[str, Any],
    repair: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    comparison = _mapping(repair.get("comparison"))
    deltas = _mapping(comparison.get("deltasAgainstDqn"))
    dqn = _mapping(comparison.get("dqnChampion"))
    ppo_eval = _mapping(comparison.get("ppoComparableEval"))
    ppo_holdout = _mapping(comparison.get("ppoHoldout"))
    result_class = deltas.get("resultClass") or "ppo-regression"

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93g_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93G.6.1",
            "claim": "BT93G-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": result_class,
        }
    )
    report["bt93gPhaseCoverage"] = {
        "93G.5": repair.get("phaseCoverage"),
        "93G.6.1": True,
        "93G.6.2": "pending bt94a_gate_check.py --write-report",
    }
    report.setdefault("ppoCandidate", {})
    report["ppoCandidate"].update(
        {
            "baselineEvalRunId": ppo_eval.get("runId"),
            "holdoutEvalRunId": ppo_holdout.get("runId"),
            "promotionAllowed": False,
            "candidateRun": False,
        }
    )
    report.setdefault("metrics", {})
    report["metrics"]["dqnChampion"] = dqn or report["metrics"].get("dqnChampion")
    report["metrics"]["ppoBt93gComparableEval"] = ppo_eval
    report["metrics"]["ppoBt93gHoldout"] = ppo_holdout
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
        "ppoValidateStatus": "ppo-validate-missing-until-BT94B.3",
        "summary": "BT93G refresh consumed comparable repair eval/holdout and keeps BT94A closed if any hard start rule remains red.",
    }
    report.setdefault("guardrails", {})
    report["guardrails"].update(
        {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
            "bt94aGate": "closed-diagnose-blocked-by-bt93g",
            "rolloutAllowed": False,
            "candidateRun": False,
            "freezeCandidate": False,
        }
    )
    report.setdefault("sourceReports", {})
    report["sourceReports"].update(
        {
            "bt93gRepairLadder": _source(REPAIR_LADDER_PATH, "BT93G repair ladder"),
            "bt93gRepairBudget": _source(REPAIR_BUDGET_PATH, "BT93G repair budget"),
            "bt93gStartTruth": _source(START_TRUTH_PATH, "BT93G start truth"),
            "bt93gRepairMatrix": _source(REPAIR_MATRIX_PATH, "BT93G repair matrix"),
            "bt93gActionMask": _source(ACTION_PATH, "BT93G pre-sampling mask"),
            "bt93gRewardGate": _source(REWARD_PATH, "BT93G reward gate"),
        }
    )
    report["bt93gRefresh"] = {
        "phaseId": "93G.6.1",
        "resultClass": "diagnose-blocked" if result_class == "ppo-regression" else "start-gate-refresh",
        "findingDispositions": {
            finding_id: {
                **dict(disposition),
                "status": _status_from_disposition(str(disposition.get("disposition"))),
                "gate": "93G.6/BT94A",
            }
            for finding_id, disposition in dispositions.items()
        },
        "repairLadderResultClass": repair.get("resultClass"),
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
        if finding_id in BT94A_BLOCKER_FINDINGS and finding_id in dispositions:
            disposition = dispositions[finding_id]
            status = _status_from_disposition(str(disposition.get("disposition")))
            updated.update(
                {
                    "status": status,
                    "gate": "93G.6/BT94A",
                    "evidence": disposition["evidence"],
                    "blocksBt94a": status == "bt94a-blocker",
                    "bt93gDisposition": disposition["disposition"],
                    "bt93gSourceArtifact": disposition["source"],
                }
            )
        rows.append(updated)

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93g_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93G.6.1",
            "auditRegister": rows,
            "summary": _status_counts(rows),
            "bt94aStoppers": [
                str(row.get("id"))
                for row in rows
                if row.get("status") == "bt94a-blocker"
            ],
        }
    )
    report["bt93gRefresh"] = {
        "phaseId": "93G.6.1",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "allTrackedFindingsExplicit": all(bool(disposition.get("disposition")) for disposition in dispositions.values()),
    }
    report.setdefault("sourceArtifacts", {})
    report["sourceArtifacts"].update(
        {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93G-refreshed precomparison"),
            "bt93gRepairLadder": _source(REPAIR_LADDER_PATH, "BT93G repair ladder"),
            "bt93gActionMask": _source(ACTION_PATH, "BT93G pre-sampling mask"),
            "bt93gRewardGate": _source(REWARD_PATH, "BT93G reward gate"),
        }
    )
    return report


def _bt94a_ready(precomparison: Mapping[str, Any], matrix: Mapping[str, Any], reward_blocking: bool) -> bool:
    blockers = list(matrix.get("bt94aStoppers") or [])
    return bool(
        precomparison.get("resultClass") in {"not-regression", "ppo-promising", "ppo-hold", "BT94A-ready"}
        and not blockers
        and not reward_blocking
    )


def _build_handover(
    base: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    blockers = list(matrix.get("bt94aStoppers") or [])
    reward_blocking = str(_get(dispositions, "R.01", "disposition") or "").startswith("still-blocking")
    ready = _bt94a_ready(precomparison, matrix, reward_blocking)
    result_class = "BT94A-ready" if ready else "diagnose"
    remaining_bt94a = blockers + (["R.01"] if reward_blocking else [])

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93g_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93G.6.1",
            "claim": "BT93G-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": result_class,
        }
    )
    report["bt93gPhaseCoverage"] = {
        "93G.6.1": True,
        "93G.6.2": "pending bt94a_gate_check.py --write-report",
        "93G.6.3": not ready,
        "93G.6.4": ready,
    }
    report["bt94aHandover"] = {
        "ready": ready,
        "gate": "open-for-94A1-matrix-definition" if ready else "closed-diagnose-blocked-by-bt93g",
        "reason": (
            "BT93G still has red start evidence; BT94A remains closed."
            if not ready
            else "BT93G closed all BT94A start blockers and refreshed the handover gate."
        ),
        "precomparisonResult": precomparison.get("resultClass"),
        "ppoValidateStatus": _get(precomparison, "evidenceInterpretation", "ppoValidateStatus"),
        "rolloutAllowed": False,
        "promotionAllowed": False,
    }
    report["remainingGates"] = {
        "bt94a": remaining_bt94a,
        "bt94bPpoValidate": "BT94B.3 remains mandatory before promote",
        "runtimeRollout": "outside BT93G; no JS inference, strategy flag, registry, rollback, or latency proof here",
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
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93G-refreshed precomparison"),
            "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93G-refreshed evidence matrix"),
            "bt93gRepairLadder": _source(REPAIR_LADDER_PATH, "BT93G repair ladder"),
            "bt93gActionMask": _source(ACTION_PATH, "BT93G pre-sampling mask"),
            "bt93gRewardGate": _source(REWARD_PATH, "BT93G reward gate"),
        }
    )
    report["bt93gHandoverGate"] = {
        "phaseId": "93G.6.1",
        "resultClass": "BT94A-ready" if ready else "diagnose-blocked",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "rewardSafetyEpisodeShortening": "still-blocking" if reward_blocking else "closed",
        "noBt94aCheckboxClosed": not ready,
    }
    return report


def write_upstream_reports() -> dict[str, Any]:
    precomparison_base = _read_json(PRECOMPARISON_PATH)
    handover_base = _read_json(HANDOVER_PATH)
    matrix_base = _read_json(MATRIX_PATH)
    repair = _read_json(REPAIR_LADDER_PATH)
    dispositions = _finding_dispositions(repair)

    precomparison = _build_precomparison(precomparison_base, repair, dispositions)
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
        and gate.get("candidateFreezeAllowed") is False
        and _get(handover, "bt94aHandover", "ready") is True
        and _get(matrix, "summary", "bt94a-blocker") in {0, None}
    )


def _source_artifacts(error_report_path: Path | None, followup_path: Path | None) -> dict[str, Any]:
    artifacts: dict[str, Any] = {
        "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93G-refreshed precomparison"),
        "handoverReport": _source(HANDOVER_PATH, "BT93G-refreshed handover"),
        "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93G-refreshed evidence matrix"),
        "bt94aGate": _source(BT94A_GATE_PATH, "BT94A gate check"),
        "bt93gRepairLadder": _source(REPAIR_LADDER_PATH, "BT93G repair ladder"),
        "bt93gRepairBudget": _source(REPAIR_BUDGET_PATH, "BT93G repair budget"),
        "bt93gStartTruth": _source(START_TRUTH_PATH, "BT93G start truth"),
        "bt93gRepairMatrix": _source(REPAIR_MATRIX_PATH, "BT93G repair matrix"),
        "bt93gTerminalWiring": _source(TERMINAL_PATH, "BT93G terminal wiring probes"),
        "bt93gActionMask": _source(ACTION_PATH, "BT93G action mask"),
        "bt93gRewardGate": _source(REWARD_PATH, "BT93G reward gate"),
    }
    if followup_path is not None and followup_path.exists():
        artifacts["followupGateReport"] = _source(followup_path, "BT93G followup gate report")
    if error_report_path is not None and error_report_path.exists():
        artifacts["diagnoseBlockedErrorReport"] = _source(error_report_path, "BT93G diagnose-blocked error report")
    return artifacts


def build_package(
    error_report_path: Path | None = None,
    followup_path: Path | None = None,
) -> dict[str, Any]:
    precomparison = _read_json(PRECOMPARISON_PATH)
    handover = _read_json(HANDOVER_PATH)
    matrix = _read_json(MATRIX_PATH)
    gate = _read_json(BT94A_GATE_PATH)
    repair = _read_json(REPAIR_LADDER_PATH)
    red_checks = _red_checks(gate)
    green = _gate_is_green(gate, handover, matrix)
    remaining_bt94a = list(_get(handover, "remainingGates", "bt94a") or [])

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_gate_refresh_handover.py",
        "blockId": "BT93G",
        "phaseId": "93G.6",
        "gitSha": _git_sha(),
        "resultClass": "BT94A-ready" if green else "diagnose-blocked",
        "phaseCoverage": {
            "93G.6.1": (
                precomparison.get("generatedBy") == "python/scripts/bt93g_gate_refresh_handover.py"
                and handover.get("generatedBy") == "python/scripts/bt93g_gate_refresh_handover.py"
                and matrix.get("generatedBy") == "python/scripts/bt93g_gate_refresh_handover.py"
            ),
            "93G.6.2": gate.get("generatedBy") == "python/scripts/bt94a_gate_check.py",
            "93G.6.3": not green,
            "93G.6.4": green,
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
            "repairLadderResultClass": repair.get("resultClass"),
            "nextRepairOrReplanStep": (
                "BT93G ended diagnose-blocked. A user-owned replan or a narrower follow-up repair "
                "must close or explicitly downgate the remaining start blockers before BT94A.1 can be claimed."
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
            "repairLadderResultClass": repair.get("resultClass"),
        },
        "sourceArtifacts": _source_artifacts(error_report_path, followup_path),
        "commands": {
            "refreshReports": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93g_gate_refresh_handover.py "
                "--write-upstream-reports"
            ),
            "gateCheck": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report",
            "package": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93g_gate_refresh_handover.py "
                "--write-package --write-followup-report --write-error-report"
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
                "BT94A candidate runs inside BT93G",
                "freeze candidate creation inside BT93G",
                "BT94B handover inside BT93G",
                "promotion or rollout signal",
                "JS inference, strategy flag, registry, rollback, or latency claim",
            ],
        },
    }


def build_followup_report(package: Mapping[str, Any]) -> dict[str, Any]:
    red_checks = _get(package, "diagnoseBlocked", "redChecks") or []
    remaining = _get(package, "diagnoseBlocked", "remainingBt94aGates") or []
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_gate_refresh_handover.py",
        "blockId": "BT93G",
        "phaseId": "93G.6.3",
        "resultClass": "diagnose-blocked" if package.get("resultClass") == "diagnose-blocked" else "not-needed",
        "remainingBt94aGates": remaining,
        "redClaimChecks": red_checks,
        "followupRequired": package.get("resultClass") == "diagnose-blocked",
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
        "reproduction": [
            "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93g_gate_refresh_handover.py --write-upstream-reports",
            "python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report",
            "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93g_gate_refresh_handover.py --write-package --write-followup-report --write-error-report",
        ],
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
    content = f"""# Fehlerbericht: BT93G 93G.6 Gate-Refresh bleibt diagnose-blocked

Datum: 2026-04-25

## Task Context

BT93G.6 sollte `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93G-Artefakten neu schreiben und danach den BT94A-Startstatus hart ableiten.

## Failure

`bt94a_gate_check.py --write-report` bleibt rot: `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`.

Rote Claim-Checks: {red_check_ids or "keine"}.

Verbleibende BT94A-Gates: {remaining or "keine"}.

## Reproduction Path

1. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93g_gate_refresh_handover.py --write-upstream-reports`
2. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report`
3. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93g_gate_refresh_handover.py --write-package --write-followup-report --write-error-report`

## Affected Files

- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93g/handover_package.json`
- `data/training/ppo/bt93g/followup_gate_report.json`

## Attempted Fixes

BT93G.1 bis BT93G.5 liefern vergleichbare Matrix, Terminal-/Reward-/Mask-Gates und eine gestufte PPO-Repair-Lane mit Eval/Holdout. Diese Evidence reicht nicht fuer BT94A.1, weil Steps gegen den DQN-Anker regressieren und die Terminal-/Death-Matrix nicht startfaehig ist.

## Status

`diagnose-blocked`. Keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze-Kandidat, kein BT94B-Handover, kein Promote und kein Rollout-Signal.

## Next Step

User-owned Replan oder enger Folgeblock fuer die verbleibenden Startblocker.
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93G gate refresh and handover artifacts.")
    parser.add_argument("--write-upstream-reports", action="store_true", help="Refresh BT94A gate input reports.")
    parser.add_argument("--write-package", action="store_true", help="Write BT93G handover package.")
    parser.add_argument("--write-followup-report", action="store_true", help="Write a BT93G followup gate report.")
    parser.add_argument("--write-error-report", action="store_true", help="Write a Fehlerbericht if the gate stays red.")
    parser.add_argument("--package-output", default=str(DEFAULT_PACKAGE_PATH), help="Package output path.")
    parser.add_argument("--followup-output", default=str(DEFAULT_FOLLOWUP_PATH), help="Followup report output path.")
    parser.add_argument("--error-report", default=str(DEFAULT_ERROR_REPORT_PATH), help="Diagnose-blocked report path.")
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
