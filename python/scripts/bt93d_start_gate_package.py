"""BT93D BT94A start gate package builder.

This script propagates BT93D repair diagnostics into the BT93C handover
artifacts consumed by the BT94A gate. It records a red gate as diagnose-blocked
without running BT94A candidates, creating a freeze candidate, or touching
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
BT93D_ROOT = PPO_ROOT / "bt93d"
BT94A_GATE_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"

PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
HANDOVER_PATH = BT93C_ROOT / "handover_report.json"
MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
SURVIVAL_PATH = BT93D_ROOT / "survival_regression_report.json"
TERMINAL_PATH = BT93D_ROOT / "terminal_policy_diagnostics.json"
MINIMUM_STATS_PATH = BT93D_ROOT / "minimum_start_statistics.json"
REPAIR_MANIFEST_PATH = BT93D_ROOT / "repair_manifest.json"
DEFAULT_PACKAGE_PATH = BT93D_ROOT / "start_gate_package.json"

TRACKED_FINDINGS = ("F.05", "F.19", "F.27", "F.30", "F.31")


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


def _finding_dispositions(
    survival: Mapping[str, Any],
    terminal: Mapping[str, Any],
) -> dict[str, dict[str, Any]]:
    comparison_class = _get(survival, "comparison", "deltasAgainstDqn", "resultClass")
    survival_blocking = comparison_class == "ppo-regression"
    terminal_status = _get(terminal, "bt94aImpact", "findingStatus") or {}
    blocked_findings = set(_get(terminal, "bt94aImpact", "blockedFindings") or [])
    deltas = _get(survival, "comparison", "deltasAgainstDqn") or {}

    return {
        "F.05": {
            "disposition": "still-blocking" if survival_blocking else "closed",
            "status": "bt94a-blocker" if survival_blocking else "closed",
            "gate": "93D.4/BT94A",
            "evidence": (
                "BT93D fresh eval/holdout reproduces survival regression "
                f"(averageBotSurvivalPct={deltas.get('averageBotSurvivalPct')}, "
                f"holdoutAverageBotSurvivalPct={deltas.get('holdoutAverageBotSurvivalPct')})."
            ),
            "source": _rel(SURVIVAL_PATH),
        },
        "F.27": {
            "disposition": "still-blocking" if survival_blocking else "closed",
            "status": "bt94a-blocker" if survival_blocking else "closed",
            "gate": "93D.4/BT94A",
            "evidence": f"BT93D comparison remains {comparison_class}.",
            "source": _rel(SURVIVAL_PATH),
        },
        "F.19": {
            "disposition": terminal_status.get("F.19", "still-blocking"),
            "status": "bt94a-blocker" if terminal_status.get("F.19") != "closed" else "closed",
            "gate": "93D.4/BT94A",
            "evidence": "BT93D terminal/death matrix remains max-steps-only or incomplete.",
            "source": _rel(TERMINAL_PATH),
        },
        "F.30": {
            "disposition": terminal_status.get("F.30", "still-blocking"),
            "status": "bt94a-blocker" if terminal_status.get("F.30") != "closed" else "closed",
            "gate": "93D.4/BT94A",
            "evidence": "BT93D policy-level masking is absent and post-decode clamp/veto load remains high.",
            "source": _rel(TERMINAL_PATH),
        },
        "F.31": {
            "disposition": terminal_status.get("F.31", "still-blocking"),
            "status": "bt94a-blocker" if terminal_status.get("F.31") != "closed" else "closed",
            "gate": "93D.4/BT94A",
            "evidence": "BT93D natural terminal/death evidence remains weak.",
            "source": _rel(TERMINAL_PATH),
        },
        "reward-safety-episode-shortening": {
            "disposition": "still-blocking"
            if "reward-safety-episode-shortening" in blocked_findings
            else "closed",
            "status": "diagnostic-blocker"
            if "reward-safety-episode-shortening" in blocked_findings
            else "closed",
            "gate": "93D.4/BT94A",
            "evidence": "Positive reward still coexists with Survival regression.",
            "source": _rel(TERMINAL_PATH),
        },
    }


def _status_counts(rows: list[Mapping[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        status = str(row.get("status"))
        counts[status] = counts.get(status, 0) + 1
    return counts


def _build_precomparison(
    base: Mapping[str, Any],
    survival: Mapping[str, Any],
    terminal: Mapping[str, Any],
    dispositions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    report = copy.deepcopy(dict(base))
    comparison = survival.get("comparison") if isinstance(survival.get("comparison"), Mapping) else {}
    deltas = comparison.get("deltasAgainstDqn") if isinstance(comparison.get("deltasAgainstDqn"), Mapping) else {}
    result_class = deltas.get("resultClass") or report.get("resultClass")
    dqn = comparison.get("dqnChampion") if isinstance(comparison.get("dqnChampion"), Mapping) else {}
    ppo_eval = comparison.get("ppoEval") if isinstance(comparison.get("ppoEval"), Mapping) else {}
    ppo_holdout = comparison.get("ppoHoldout") if isinstance(comparison.get("ppoHoldout"), Mapping) else {}

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93d_start_gate_package.py",
            "blockId": "BT93C",
            "phaseId": "93D.4.1",
            "claim": "93D-BT94A-Startfreigabe-Paket",
            "gitSha": _git_sha(),
            "resultClass": result_class,
        }
    )
    report["bt93dPhaseCoverage"] = {
        "93D.4.1": True,
        "93D.4.2": "pending bt94a_gate_check.py --write-report",
        "93D.4.3": result_class == "ppo-regression",
        "93D.4.4": "not-applicable-until-green-gate" if result_class == "ppo-regression" else True,
    }
    report.setdefault("ppoCandidate", {})
    report["ppoCandidate"]["holdoutEvalRunId"] = ppo_holdout.get("runId")
    report["ppoCandidate"]["promotionAllowed"] = False

    report.setdefault("metrics", {})
    report["metrics"]["dqnChampion"] = dqn or report["metrics"].get("dqnChampion")
    report["metrics"]["ppoBt93dReproEval"] = ppo_eval
    report["metrics"]["ppoHoldout"] = ppo_holdout
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
            "BT93D refreshed eval/holdout evidence keeps BT94A closed: Survival remains below "
            "the DQN anchor and terminal/policy diagnostics still block start."
        ),
    }
    report.setdefault("guardrails", {})
    report["guardrails"].update(
        {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
            "bt94aGate": "closed-diagnose-blocked-by-bt93d",
            "rolloutAllowed": False,
            "candidateRun": False,
            "freezeCandidate": False,
        }
    )
    report.setdefault("sourceReports", {})
    report["sourceReports"].update(
        {
            "bt93dSurvivalRegression": _source(SURVIVAL_PATH, "BT93D survival regression"),
            "bt93dTerminalPolicyDiagnostics": _source(TERMINAL_PATH, "BT93D terminal and policy diagnostics"),
            "bt93dMinimumStartStatistics": _source(MINIMUM_STATS_PATH, "BT93D minimum start statistics"),
            "holdoutEval": {
                "pointer": "data/training/ppo/bt93d/latest_holdout_eval.json",
                "report": ppo_holdout.get("report"),
                "sha256": _sha256_file(REPO_ROOT / str(ppo_holdout.get("report"))) if ppo_holdout.get("report") else None,
            },
        }
    )
    report["bt93dRefresh"] = {
        "phaseId": "93D.4.1",
        "resultClass": "diagnose-blocked" if result_class == "ppo-regression" else "start-gate-refresh",
        "findingDispositions": {key: dispositions[key] for key in TRACKED_FINDINGS},
        "terminalPolicyResultClass": terminal.get("resultClass"),
        "survivalRegressionResultClass": survival.get("resultClass"),
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
        if finding_id in TRACKED_FINDINGS:
            disposition = dispositions[finding_id]
            updated.update(
                {
                    "status": disposition["status"],
                    "gate": disposition["gate"],
                    "evidence": disposition["evidence"],
                    "blocksBt94a": disposition["status"] == "bt94a-blocker",
                    "bt93dDisposition": disposition["disposition"],
                    "bt93dSourceArtifact": disposition["source"],
                }
            )
        rows.append(updated)

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93d_start_gate_package.py",
            "blockId": "BT93C",
            "phaseId": "93D.4.1",
            "auditRegister": rows,
            "summary": _status_counts(rows),
            "bt94aStoppers": [
                str(row.get("id"))
                for row in rows
                if row.get("status") == "bt94a-blocker"
            ],
        }
    )
    report["bt93dRefresh"] = {
        "phaseId": "93D.4.1",
        "trackedFindings": {
            finding_id: dispositions[finding_id]["disposition"]
            for finding_id in TRACKED_FINDINGS
        },
        "allTrackedFindingsExplicit": all(
            dispositions[finding_id]["disposition"] in {"closed", "still-blocking"}
            for finding_id in TRACKED_FINDINGS
        ),
        "diagnosticBlockers": {
            "rewardSafetyEpisodeShortening": dispositions["reward-safety-episode-shortening"],
        },
    }
    report.setdefault("sourceArtifacts", {})
    report["sourceArtifacts"].update(
        {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93D-refreshed precomparison"),
            "bt93dSurvivalRegression": _source(SURVIVAL_PATH, "BT93D survival regression"),
            "bt93dTerminalPolicyDiagnostics": _source(TERMINAL_PATH, "BT93D terminal and policy diagnostics"),
            "bt93dMinimumStartStatistics": _source(MINIMUM_STATS_PATH, "BT93D minimum start statistics"),
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
    precomparison_class = precomparison.get("resultClass")
    bt94a_ready = precomparison_class in {"ppo-promising", "ppo-hold"} and not blockers
    result_class = "BT94A-ready" if bt94a_ready else "diagnose"

    report.update(
        {
            "ok": True,
            "generatedAt": _utc_now(),
            "generatedBy": "python/scripts/bt93d_start_gate_package.py",
            "blockId": "BT93C",
            "phaseId": "93D.4.1",
            "claim": "93D-BT94A-Startfreigabe-Paket",
            "gitSha": _git_sha(),
            "resultClass": result_class,
        }
    )
    report["bt93dPhaseCoverage"] = {
        "93D.4.1": True,
        "93D.4.2": "pending bt94a_gate_check.py --write-report",
        "93D.4.3": not bt94a_ready,
        "93D.4.4": True,
    }
    report["bt94aHandover"] = {
        "ready": bt94a_ready,
        "gate": "open-for-94A1-matrix-definition" if bt94a_ready else "closed-diagnose-blocked-by-bt93d",
        "reason": (
            "BT93D propagated still-blocking F.05/F.19/F.27/F.30/F.31 evidence; BT94A remains closed."
            if not bt94a_ready
            else "BT93D closed all BT94A blockers and refreshed the handover gate."
        ),
        "precomparisonResult": precomparison_class,
        "ppoValidateStatus": _get(precomparison, "evidenceInterpretation", "ppoValidateStatus"),
        "rolloutAllowed": False,
        "promotionAllowed": False,
    }
    report["remainingGates"] = {
        "bt94a": blockers,
        "bt94bPpoValidate": "BT94B.3 remains mandatory before any promote verdict",
        "runtimeRollout": "outside BT93D; no JS inference, strategy flag, registry, rollback, or latency proof here",
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
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93D-refreshed precomparison"),
            "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93D-refreshed evidence matrix"),
            "bt93dSurvivalRegression": _source(SURVIVAL_PATH, "BT93D survival regression"),
            "bt93dTerminalPolicyDiagnostics": _source(TERMINAL_PATH, "BT93D terminal and policy diagnostics"),
            "bt93dMinimumStartStatistics": _source(MINIMUM_STATS_PATH, "BT93D minimum start statistics"),
        }
    )
    report["bt93dStartGate"] = {
        "phaseId": "93D.4.1",
        "resultClass": "BT94A-ready" if bt94a_ready else "diagnose-blocked",
        "trackedFindings": {
            finding_id: dispositions[finding_id]["disposition"]
            for finding_id in TRACKED_FINDINGS
        },
        "noBt94aCheckboxClosed": not bt94a_ready,
    }
    return report


def write_upstream_reports() -> dict[str, Any]:
    precomparison_base = _read_json(PRECOMPARISON_PATH)
    handover_base = _read_json(HANDOVER_PATH)
    matrix_base = _read_json(MATRIX_PATH)
    survival = _read_json(SURVIVAL_PATH)
    terminal = _read_json(TERMINAL_PATH)
    dispositions = _finding_dispositions(survival, terminal)

    precomparison = _build_precomparison(precomparison_base, survival, terminal, dispositions)
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
            finding_id: dispositions[finding_id]["disposition"]
            for finding_id in TRACKED_FINDINGS
        },
    }


def _red_checks(gate: Mapping[str, Any]) -> list[dict[str, Any]]:
    checks = gate.get("claimChecks") if isinstance(gate.get("claimChecks"), list) else []
    return [dict(check) for check in checks if isinstance(check, Mapping) and not check.get("ok")]


def build_package() -> dict[str, Any]:
    precomparison = _read_json(PRECOMPARISON_PATH)
    handover = _read_json(HANDOVER_PATH)
    matrix = _read_json(MATRIX_PATH)
    survival = _read_json(SURVIVAL_PATH)
    terminal = _read_json(TERMINAL_PATH)
    minimum_stats = _read_json(MINIMUM_STATS_PATH)
    repair_manifest = _read_json(REPAIR_MANIFEST_PATH)
    gate = _read_json(BT94A_GATE_PATH) if BT94A_GATE_PATH.exists() else {}
    red_checks = _red_checks(gate)
    gate_is_green = bool(gate.get("claimable") and not red_checks)
    tracked = (matrix.get("bt93dRefresh") or {}).get("trackedFindings") or {}

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93d_start_gate_package.py",
        "blockId": "BT93D",
        "phaseId": "93D.4",
        "gitSha": _git_sha(),
        "resultClass": "BT94A-ready" if gate_is_green else "diagnose-blocked",
        "phaseCoverage": {
            "93D.4.1": all(tracked.get(finding_id) in {"closed", "still-blocking"} for finding_id in TRACKED_FINDINGS),
            "93D.4.2": gate.get("generatedBy") == "python/scripts/bt94a_gate_check.py",
            "93D.4.3": not gate_is_green,
            "93D.4.4": True,
        },
        "bt94aStartStatus": {
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "resultClass": gate.get("resultClass"),
            "status": "BT94A may start at 94A.1" if gate_is_green else "BT94A remains closed before 94A.1",
        },
        "diagnoseBlocked": {
            "active": not gate_is_green,
            "redChecks": red_checks,
            "trackedFindings": tracked,
            "diagnosticBlockers": (matrix.get("bt93dRefresh") or {}).get("diagnosticBlockers"),
            "nextReplanOrRepairStep": (
                "User-owned replan or a follow-up PPO diagnosis repair must close or explicitly downgrade "
                "F.05/F.19/F.27/F.30/F.31 before BT94A.1 can be claimed."
            ),
            "noBt94aCheckboxClosed": not gate_is_green,
        },
        "artifactRefresh": {
            "precomparisonResultClass": precomparison.get("resultClass"),
            "handoverResultClass": handover.get("resultClass"),
            "handoverGate": _get(handover, "bt94aHandover", "gate"),
            "bt94aBlockerCount": _get(matrix, "summary", "bt94a-blocker"),
            "survivalRegressionResultClass": survival.get("resultClass"),
            "terminalPolicyResultClass": terminal.get("resultClass"),
            "minimumStatisticsMatrixId": minimum_stats.get("matrixId"),
        },
        "sourceArtifacts": {
            "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93D-refreshed precomparison"),
            "handoverReport": _source(HANDOVER_PATH, "BT93D-refreshed handover"),
            "evidenceQualityMatrix": _source(MATRIX_PATH, "BT93D-refreshed evidence matrix"),
            "bt94aGate": _source(BT94A_GATE_PATH, "BT94A gate check"),
            "bt93dSurvivalRegression": _source(SURVIVAL_PATH, "BT93D survival regression"),
            "bt93dTerminalPolicyDiagnostics": _source(TERMINAL_PATH, "BT93D terminal and policy diagnostics"),
            "bt93dMinimumStartStatistics": _source(MINIMUM_STATS_PATH, "BT93D minimum start statistics"),
            "bt93dRepairManifest": _source(REPAIR_MANIFEST_PATH, "BT93D repair manifest"),
        },
        "commands": {
            "refreshReports": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93d_start_gate_package.py "
                "--write-upstream-reports"
            ),
            "gateCheck": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt94a_gate_check.py --write-report",
            "package": (
                "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93d_start_gate_package.py "
                "--write-package"
            ),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "allowedSidecarPaths": repair_manifest.get("allowedSidecarPaths"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93D BT94A start gate package.")
    parser.add_argument("--write-upstream-reports", action="store_true", help="Refresh BT93C gate input reports.")
    parser.add_argument("--write-package", action="store_true", help="Write BT93D start gate package.")
    parser.add_argument("--package-output", default=str(DEFAULT_PACKAGE_PATH), help="Package output path.")
    args = parser.parse_args()

    wrote: dict[str, Any] = {}
    if args.write_upstream_reports:
        wrote["upstreamReports"] = write_upstream_reports()
    package: dict[str, Any] | None = None
    if args.write_package:
        package = build_package()
        _write_json(Path(args.package_output).resolve(), package)
        wrote["startGatePackage"] = _rel(Path(args.package_output).resolve())
    if not args.write_upstream_reports and not args.write_package:
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
