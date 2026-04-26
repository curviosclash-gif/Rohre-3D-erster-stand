"""BT93I gate refresh and handover package builder.

This propagates BT93I terminal-curriculum evidence into the BT94A gate inputs.
It does not run candidates, create a freeze candidate, promote, or touch
runtime surfaces.
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
BT93I_ROOT = PPO_ROOT / "bt93i"
BT94A_ROOT = PPO_ROOT / "bt94a"

PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
HANDOVER_PATH = BT93C_ROOT / "handover_report.json"
MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
BT94A_GATE_PATH = BT94A_ROOT / "no_start_gate.json"

START_TRUTH_PATH = BT93I_ROOT / "start_truth.json"
MATRIX_MANIFEST_PATH = BT93I_ROOT / "matrix_manifest.json"
TERMINAL_PROVOCATION_PATH = BT93I_ROOT / "terminal_provocation_report.json"
READINESS_PATH = BT93I_ROOT / "long_run_readiness_report.json"
REPAIR_REPORT_PATH = BT93I_ROOT / "terminal_curriculum_repair_report.json"
HOLDOUT_GUARD_PATH = BT93I_ROOT / "holdout_guard_report.json"
MATRIX_GREEN_PATH = BT93I_ROOT / "matrix_green_report.json"
LATEST_REPAIR_PATH = BT93I_ROOT / "latest_terminal_curriculum_repair.json"

DEFAULT_PACKAGE_PATH = BT93I_ROOT / "handover_package.json"
DEFAULT_FOLLOWUP_PATH = BT93I_ROOT / "followup_gate_report.json"
DEFAULT_ERROR_REPORT_PATH = (
    REPO_ROOT
    / "docs"
    / "Fehlerberichte"
    / "2026-04-25_bt93i-gate-refresh-diagnose-blocked.md"
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


def _repo_path(value: str | Path) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


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


def _optional_source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any] | None:
    return _source(path, role, closure_capable) if path.exists() else None


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


def _latest_model_package() -> dict[str, Any]:
    pointer = _read_json(LATEST_REPAIR_PATH)
    manifest_path = _repo_path(str(pointer["artifactManifest"]))
    manifest = _read_json(manifest_path)
    artifacts = _mapping(manifest.get("artifacts"))
    return {
        "artifactManifest": _rel(manifest_path),
        "runId": manifest.get("runId"),
        "modelSha256": artifacts.get("modelSha256"),
        "vecnormalizeSha256": artifacts.get("vecnormalizeSha256"),
        "optimizerStateSha256": artifacts.get("optimizerStateSha256"),
        "configSha256": artifacts.get("configSha256"),
        "gitSha": manifest.get("gitSha"),
        "truePpoModelPackage": manifest.get("truePpoModelPackage"),
        "scaffoldOnly": manifest.get("scaffoldOnly"),
        "candidateRun": manifest.get("candidateRun"),
        "freezeCandidate": manifest.get("freezeCandidate"),
        "promotionAllowed": manifest.get("promotionAllowed"),
    }


def _finding_dispositions(matrix_green: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    dispositions = _mapping(matrix_green.get("findingDisposition"))
    deltas = _mapping(_get(matrix_green, "comparison", "deltasAgainstDqn"))
    hard = _mapping(matrix_green.get("resultRules"))
    blockers = "; ".join(str(reason) for reason in hard.get("blockingReasons") or [])
    return {
        "F.05": {
            "disposition": str(dispositions.get("F.05", "still-blocking")),
            "evidence": (
                "BT93I terminal-curriculum repair keeps Survival-First blocked because avgSteps regress "
                f"(evalAvgStepsPerEpisodePct={deltas.get('evalAvgStepsPerEpisodePct')}, "
                f"holdoutAvgStepsPerEpisodePct={deltas.get('holdoutAvgStepsPerEpisodePct')})."
            ),
            "source": _rel(MATRIX_GREEN_PATH),
        },
        "F.19": {
            "disposition": str(dispositions.get("F.19", "still-blocking")),
            "evidence": (
                "BT93I eval/holdout terminal-death matrix is not start-capable "
                f"(terminalDeathMatrixStartCapable={hard.get('terminalDeathMatrixStartCapable')})."
            ),
            "source": _rel(MATRIX_GREEN_PATH),
        },
        "F.27": {
            "disposition": str(dispositions.get("F.27", "still-blocking")),
            "evidence": f"BT93I comparison remains {deltas.get('resultClass')}; hard rules: {blockers}.",
            "source": _rel(MATRIX_GREEN_PATH),
        },
        "F.31": {
            "disposition": str(dispositions.get("F.31", "still-blocking")),
            "evidence": (
                "BT93I natural terminal/death evidence remains insufficient "
                f"(playerDeadOnlyBlocksStart={hard.get('playerDeadOnlyBlocksStart')})."
            ),
            "source": _rel(MATRIX_GREEN_PATH),
        },
    }


def _current_source() -> dict[str, Any]:
    return {
        "blockId": "BT93I",
        "phaseId": "93I.5",
        "sourceArtifact": _rel(MATRIX_GREEN_PATH),
        "fallbackUsed": False,
    }


def _source_artifacts_for_reports() -> dict[str, Any]:
    artifacts: dict[str, Any] = {
        "bt93iStartTruth": _source(START_TRUTH_PATH, "BT93I start truth"),
        "bt93iMatrixManifest": _source(MATRIX_MANIFEST_PATH, "BT93I matrix manifest"),
        "bt93iTerminalProvocation": _source(TERMINAL_PROVOCATION_PATH, "BT93I terminal provocation"),
        "bt93iLongRunReadiness": _source(READINESS_PATH, "BT93I long-run readiness"),
        "bt93iRepairReport": _source(REPAIR_REPORT_PATH, "BT93I terminal curriculum repair report"),
        "bt93iHoldoutGuard": _source(HOLDOUT_GUARD_PATH, "BT93I holdout guard"),
        "bt93iMatrixGreen": _source(MATRIX_GREEN_PATH, "BT93I matrix green report"),
    }
    latest = _optional_source(LATEST_REPAIR_PATH, "BT93I latest repair pointer", closure_capable=False)
    if latest is not None:
        artifacts["bt93iLatestRepairPointer"] = latest
    return artifacts


def _build_precomparison(
    base: Mapping[str, Any],
    matrix_green: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    comparison = _mapping(matrix_green.get("comparison"))
    deltas = _mapping(comparison.get("deltasAgainstDqn"))
    dqn = _mapping(comparison.get("dqnChampion"))
    ppo_eval = _mapping(comparison.get("ppoEval"))
    ppo_holdout = _mapping(comparison.get("ppoHoldout"))
    result_class = str(matrix_green.get("matrixVerdict") or deltas.get("resultClass") or "ppo-regression")
    model_package = _latest_model_package()

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93i_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93I.5.1",
            "claim": "BT93I-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": result_class,
            "currentHandoverSource": _current_source(),
        }
    )
    report["bt93iPhaseCoverage"] = {
        "93I.5.1": True,
        "93I.5.2": "pending bt94a_gate_check.py --write-report",
        "93I.5.3": matrix_green.get("resultClass") == "diagnose-blocked",
        "93I.5.4": True if matrix_green.get("resultClass") == "BT94A-ready" else "not-applicable-red-gate",
    }
    report.setdefault("ppoCandidate", {})
    report["ppoCandidate"].update(
        {
            "baselineEvalRunId": ppo_eval.get("runId"),
            "holdoutEvalRunId": ppo_holdout.get("runId"),
            "modelSha256": model_package.get("modelSha256"),
            "vecnormalizeSha256": model_package.get("vecnormalizeSha256"),
            "optimizerStateSha256": model_package.get("optimizerStateSha256"),
            "configSha256": model_package.get("configSha256"),
            "artifactManifest": model_package.get("artifactManifest"),
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
        }
    )
    report.setdefault("metrics", {})
    report["metrics"]["dqnChampion"] = dqn or report["metrics"].get("dqnChampion")
    report["metrics"]["ppoBt93iTerminalCurriculumEval"] = ppo_eval
    report["metrics"]["ppoBt93iHoldout"] = ppo_holdout
    report["metrics"]["deltasAgainstDqn"] = {
        **dict(deltas),
        "targetSurvivalForPlus30Pct": _target_survival(dqn.get("averageBotSurvival")),
    }
    report["evidenceInterpretation"] = {
        "class": result_class,
        "isPromotionEvidence": False,
        "isRolloutSignal": False,
        "internalEvalSurvivalIsPpoValidate": False,
        "ppoValidateStatus": "ppo-validate-missing-until-BT94B.3",
        "summary": (
            "BT93I consumed terminal-curriculum eval/holdout evidence and keeps BT94A closed "
            "while hard start rules remain red."
        ),
    }
    report.setdefault("guardrails", {})
    report["guardrails"].update(
        {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
            "bt94aGate": "closed-diagnose-blocked-by-bt93i",
            "candidateRun": False,
            "freezeCandidate": False,
            "rolloutAllowed": False,
        }
    )
    report.setdefault("sourceReports", {})
    report["sourceReports"].update(_source_artifacts_for_reports())
    report["bt93iRefresh"] = {
        "phaseId": "93I.5.1",
        "resultClass": "diagnose-blocked" if result_class == "ppo-regression" else "start-gate-refresh",
        "matrixGreenResultClass": matrix_green.get("resultClass"),
        "findingDispositions": {
            finding_id: {
                **dict(disposition),
                "status": _status_from_disposition(str(disposition.get("disposition"))),
                "gate": "93I.5/BT94A",
            }
            for finding_id, disposition in dispositions.items()
        },
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
                    "gate": "93I.5/BT94A",
                    "evidence": disposition["evidence"],
                    "blocksBt94a": status == "bt94a-blocker",
                    "bt93iDisposition": disposition["disposition"],
                    "bt93iSourceArtifact": disposition["source"],
                }
            )
        rows.append(updated)

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93i_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93I.5.1",
            "auditRegister": rows,
            "summary": _status_counts(rows),
            "bt94aStoppers": [
                str(row.get("id"))
                for row in rows
                if row.get("status") == "bt94a-blocker"
            ],
            "currentHandoverSource": _current_source(),
        }
    )
    report["bt93iRefresh"] = {
        "phaseId": "93I.5.1",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "allTrackedFindingsExplicit": all(bool(disposition.get("disposition")) for disposition in dispositions.values()),
    }
    report.setdefault("sourceArtifacts", {})
    report["sourceArtifacts"].update(
        {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93I-refreshed precomparison"),
            **_source_artifacts_for_reports(),
        }
    )
    return report


def _bt94a_ready(precomparison: Mapping[str, Any], matrix: Mapping[str, Any]) -> bool:
    blockers = list(matrix.get("bt94aStoppers") or [])
    return bool(
        precomparison.get("resultClass") in {"not-regression", "ppo-promising", "ppo-hold", "BT94A-ready"}
        and not blockers
    )


def _build_handover(
    base: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    blockers = list(matrix.get("bt94aStoppers") or [])
    ready = _bt94a_ready(precomparison, matrix)
    result_class = "BT94A-ready" if ready else "diagnose"
    model_package = _latest_model_package()

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93i_gate_refresh_handover.py",
            "blockId": "BT93C",
            "phaseId": "93I.5.1",
            "claim": "BT93I-BT94A-Gate-Refresh",
            "gitSha": _git_sha(),
            "resultClass": result_class,
            "currentHandoverSource": _current_source(),
        }
    )
    report["bt93iPhaseCoverage"] = {
        "93I.5.1": True,
        "93I.5.2": "pending bt94a_gate_check.py --write-report",
        "93I.5.3": not ready,
        "93I.5.4": True if ready else "not-applicable-red-gate",
    }
    report["modelPackage"] = {
        **model_package,
        "candidateRun": False,
        "freezeCandidate": False,
        "promotionAllowed": False,
    }
    report["bt94aHandover"] = {
        "ready": ready,
        "gate": "open-for-94A1-matrix-definition" if ready else "closed-diagnose-blocked-by-bt93i",
        "reason": (
            "BT93I still has red start evidence; BT94A remains closed."
            if not ready
            else "BT93I closed all BT94A start blockers and refreshed the handover gate."
        ),
        "precomparisonResult": precomparison.get("resultClass"),
        "ppoValidateStatus": _get(precomparison, "evidenceInterpretation", "ppoValidateStatus"),
        "rolloutAllowed": False,
        "promotionAllowed": False,
    }
    report["remainingGates"] = {
        "bt94a": blockers,
        "bt94bPpoValidate": "BT94B.3 remains mandatory before promote",
        "runtimeRollout": "outside BT93I; no JS inference, strategy flag, registry, rollback, or latency proof here",
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
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93I-refreshed precomparison"),
            "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93I-refreshed evidence matrix"),
            **_source_artifacts_for_reports(),
        }
    )
    report["bt93iHandoverGate"] = {
        "phaseId": "93I.5.1",
        "resultClass": "BT94A-ready" if ready else "diagnose-blocked",
        "trackedFindings": {
            finding_id: disposition["disposition"]
            for finding_id, disposition in dispositions.items()
        },
        "noBt94aCheckboxClosed": not ready,
    }
    return report


def write_upstream_reports() -> dict[str, Any]:
    precomparison_base = _read_json(PRECOMPARISON_PATH)
    handover_base = _read_json(HANDOVER_PATH)
    matrix_base = _read_json(MATRIX_PATH)
    matrix_green = _read_json(MATRIX_GREEN_PATH)
    dispositions = _finding_dispositions(matrix_green)

    precomparison = _build_precomparison(precomparison_base, matrix_green, dispositions)
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
        and _get(gate, "currentHandoverSource", "blockId") == "BT93I"
        and _get(handover, "bt94aHandover", "ready") is True
        and _get(matrix, "summary", "bt94a-blocker") in {0, None}
    )


def _package_source_artifacts(error_report_path: Path | None, followup_path: Path | None) -> dict[str, Any]:
    artifacts: dict[str, Any] = {
        "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93I-refreshed precomparison"),
        "handoverReport": _source(HANDOVER_PATH, "BT93I-refreshed handover"),
        "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93I-refreshed evidence matrix"),
        "bt94aGate": _source(BT94A_GATE_PATH, "BT94A gate check"),
        **_source_artifacts_for_reports(),
    }
    if followup_path is not None and followup_path.exists():
        artifacts["followupGateReport"] = _source(followup_path, "BT93I followup gate report")
    if error_report_path is not None and error_report_path.exists():
        artifacts["diagnoseBlockedErrorReport"] = _source(error_report_path, "BT93I diagnose-blocked error report")
    return artifacts


def build_package(
    error_report_path: Path | None = None,
    followup_path: Path | None = None,
) -> dict[str, Any]:
    precomparison = _read_json(PRECOMPARISON_PATH)
    handover = _read_json(HANDOVER_PATH)
    matrix = _read_json(MATRIX_PATH)
    gate = _read_json(BT94A_GATE_PATH)
    matrix_green = _read_json(MATRIX_GREEN_PATH)
    red_checks = _red_checks(gate)
    green = _gate_is_green(gate, handover, matrix)
    remaining_bt94a = list(_get(handover, "remainingGates", "bt94a") or [])

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_gate_refresh_handover.py",
        "blockId": "BT93I",
        "phaseId": "93I.5",
        "gitSha": _git_sha(),
        "resultClass": "BT94A-ready" if green else "diagnose-blocked",
        "phaseCoverage": {
            "93I.5.1": (
                precomparison.get("generatedBy") == "python/scripts/bt93i_gate_refresh_handover.py"
                and handover.get("generatedBy") == "python/scripts/bt93i_gate_refresh_handover.py"
                and matrix.get("generatedBy") == "python/scripts/bt93i_gate_refresh_handover.py"
                and gate.get("generatedBy") == "python/scripts/bt94a_gate_check.py"
                and _get(gate, "currentHandoverSource", "blockId") == "BT93I"
            ),
            "93I.5.2": (
                gate.get("generatedBy") == "python/scripts/bt94a_gate_check.py"
                and _get(gate, "currentHandoverSource", "blockId") == "BT93I"
                and _get(gate, "currentHandoverSource", "fallbackUsed") is False
            ),
            "93I.5.3": not green,
            "93I.5.4": True if green else "not-applicable-red-gate",
        },
        "bt94aStartStatus": {
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "resultClass": gate.get("resultClass"),
            "currentHandoverSource": gate.get("currentHandoverSource"),
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
            "matrixGreenResultClass": matrix_green.get("resultClass"),
            "matrixVerdict": matrix_green.get("matrixVerdict"),
            "blockingReasons": _get(matrix_green, "resultRules", "blockingReasons") or [],
            "nextRepairOrReplanStep": (
                "BT93I ended diagnose-blocked. A user-owned replan or a narrower follow-up repair "
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
        "artifactRefresh": {
            "precomparisonResultClass": precomparison.get("resultClass"),
            "handoverResultClass": handover.get("resultClass"),
            "handoverGate": _get(handover, "bt94aHandover", "gate"),
            "bt94aBlockerCount": _get(matrix, "summary", "bt94a-blocker"),
            "matrixGreenResultClass": matrix_green.get("resultClass"),
            "matrixVerdict": matrix_green.get("matrixVerdict"),
        },
        "sourceArtifacts": _package_source_artifacts(error_report_path, followup_path),
        "commands": {
            "refreshReports": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_gate_refresh_handover.py "
                "--write-upstream-reports"
            ),
            "gateCheck": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report",
            "package": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_gate_refresh_handover.py "
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
                "BT94A candidate runs inside BT93I",
                "freeze candidate creation inside BT93I",
                "BT94B handover inside BT93I",
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
        "generatedBy": "python/scripts/bt93i_gate_refresh_handover.py",
        "blockId": "BT93I",
        "phaseId": "93I.5.3",
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
            "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_gate_refresh_handover.py --write-upstream-reports",
            "python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report",
            (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_gate_refresh_handover.py "
                "--write-package --write-followup-report --write-error-report"
            ),
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
    reasons = "; ".join(str(item) for item in _get(package, "diagnoseBlocked", "blockingReasons") or [])
    content = f"""# Fehlerbericht: BT93I 93I.5 Gate-Refresh bleibt diagnose-blocked

Datum: 2026-04-25

## Task Context

BT93I.5 sollte `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93I-Artefakten neu schreiben und danach den BT94A-Startstatus hart ableiten.

## Failure

`bt94a_gate_check.py --write-report` bleibt rot: `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`.

Rote Claim-Checks: {red_check_ids or "keine"}.

Verbleibende BT94A-Gates: {remaining or "keine"}.

BT93I-Hard-Rules: {reasons or "keine"}.

## Reproduction Path

1. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_gate_refresh_handover.py --write-upstream-reports`
2. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report`
3. `python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_gate_refresh_handover.py --write-package --write-followup-report --write-error-report`

## Affected Files

- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93i/handover_package.json`
- `data/training/ppo/bt93i/followup_gate_report.json`

## Attempted Fixes

BT93I.1 bis BT93I.4 lieferten Matrix-Truth, Terminal-Provocation, Long-run-Readiness, einen Terminal-Curriculum-Repair-Lauf sowie Eval/Holdout mit Mindestepisoden. Diese Evidence reicht nicht fuer BT94A.1, weil Steps gegen den DQN-Anker regressieren und die Terminal-/Death-Matrix nicht startfaehig bleibt.

## Status

`diagnose-blocked`. Keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze-Kandidat, kein BT94B-Handover, kein Promote und kein Rollout-Signal.

## Next Step

User-owned Replan oder enger Folgeblock fuer F.05/F.19/F.27/F.31.
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93I gate refresh and handover artifacts.")
    parser.add_argument("--write-upstream-reports", action="store_true", help="Refresh BT94A gate input reports.")
    parser.add_argument("--write-package", action="store_true", help="Write BT93I handover package.")
    parser.add_argument("--write-followup-report", action="store_true", help="Write a BT93I followup gate report.")
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
