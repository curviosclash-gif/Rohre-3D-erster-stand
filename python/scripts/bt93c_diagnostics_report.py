"""BT93C.4 diagnostics report composer."""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
DEFAULT_ARTIFACT_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _load_report(artifact_root: Path, pointer_name: str) -> tuple[dict[str, Any], dict[str, Any], Path]:
    pointer_path = artifact_root / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer, _read_json(report_path), report_path


def _has_keys(payload: Mapping[str, Any], keys: list[str]) -> bool:
    return all(key in payload for key in keys)


def build_report(artifact_root: Path) -> dict[str, Any]:
    train_pointer, train_report, train_report_path = _load_report(artifact_root, "latest_diagnostics_smoke.json")
    eval_pointer, eval_report, eval_report_path = _load_report(artifact_root, "latest_diagnostics_eval.json")
    diagnostics = dict(eval_report.get("diagnostics") or {})
    learning = dict(train_report.get("learning") or {})
    ppo_metrics = dict(learning.get("ppoLearningMetrics") or {})
    metric_values = dict(ppo_metrics.get("metrics") or {})
    required_metric_keys = [
        "policy_loss",
        "value_loss",
        "entropy",
        "approx_kl",
        "clip_fraction",
        "explained_variance",
        "grad_norm",
    ]
    reward_safety = dict(diagnostics.get("rewardSafetyDiagnostics") or {})
    rest_debt = dict(diagnostics.get("policyQualityRestDebt") or {})
    failure_semantics = dict(diagnostics.get("failureSemantics") or {})
    latency_budget = dict(diagnostics.get("latencyAndThroughputBudget") or {})

    phase_coverage = {
        "93C.4.1": _has_keys(metric_values, required_metric_keys) and bool(ppo_metrics.get("collapseThresholds")),
        "93C.4.2": _has_keys(
            reward_safety,
            ["rewardBreakdownTotals", "rewardHackingSignals", "actionTelemetry", "terminalReasonCounts"],
        ) and "survivalKpis" in diagnostics,
        "93C.4.3": _has_keys(rest_debt, ["bt73IntentRecovery", "bt80cProductionValidation", "jsInferenceIntegration"]),
        "93C.4.4": _has_keys(
            failure_semantics,
            [
                "runtimeErrorCount",
                "crash",
                "timeout",
                "forcedRound",
                "socketClose",
                "teardownFailure",
                "maxSteps",
                "naturalTerminal",
                "deathCauseCounts",
            ],
        ),
        "93C.4.5": latency_budget.get("countsAsLearningProgress") is False
        and latency_budget.get("classification") == "budget-and-stability-only",
    }
    coverage_ok = all(phase_coverage.values())
    threshold_status = dict(ppo_metrics.get("thresholdStatus") or {})
    collapse_or_instability = bool(ppo_metrics.get("collapseOrInstabilitySignal"))
    runtime_error_count = int(failure_semantics.get("runtimeErrorCount") or 0)
    result_class = "go" if coverage_ok and not collapse_or_instability and runtime_error_count == 0 else "diagnose"

    report_path = artifact_root / "diagnostics_report.json"
    return {
        "ok": coverage_ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_diagnostics_report.py",
        "blockId": "BT93C",
        "phaseId": "93C.4",
        "resultClass": result_class,
        "gitSha": _git_sha(),
        "sourceReports": {
            "diagnosticsSmoke": {
                "pointer": _rel(artifact_root / "latest_diagnostics_smoke.json"),
                "runId": train_pointer.get("runId"),
                "report": _rel(train_report_path),
                "sha256": _sha256_file(train_report_path),
            },
            "diagnosticsEval": {
                "pointer": _rel(artifact_root / "latest_diagnostics_eval.json"),
                "runId": eval_pointer.get("runId"),
                "report": _rel(eval_report_path),
                "sha256": _sha256_file(eval_report_path),
            },
        },
        "phaseCoverage": phase_coverage,
        "ppoLearningMetrics": ppo_metrics,
        "rewardSafetyDiagnostics": reward_safety,
        "survivalKpis": diagnostics.get("survivalKpis"),
        "policyQualityRestDebt": rest_debt,
        "failureSemantics": failure_semantics,
        "latencyAndThroughputBudget": latency_budget,
        "gateInterpretation": {
            "thresholdStatus": threshold_status,
            "collapseOrInstabilitySignal": collapse_or_instability,
            "runtimeErrorCount": runtime_error_count,
            "pilotAllowedByThisReport": result_class == "go",
            "baselineAllowedByThisReport": False,
            "promotionAllowed": False,
            "learningProgressFromThroughputAllowed": False,
        },
        "guardrails": {
            "diagnosticOnly": True,
            "pilotRunsStarted": False,
            "baselineRunsStarted": False,
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
        },
        "artifacts": {
            "diagnosticsReport": _rel(report_path),
        },
    }


def main() -> None:
    artifact_root = DEFAULT_ARTIFACT_ROOT
    report = build_report(artifact_root)
    report_path = artifact_root / "diagnostics_report.json"
    latest_path = artifact_root / "latest_diagnostics_report.json"
    _write_json(report_path, report)
    _write_json(latest_path, {
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "report": _rel(report_path),
        "sha256": _sha256_file(report_path),
    })
    print(json.dumps({
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "report": _rel(report_path),
        "phaseCoverage": report["phaseCoverage"],
    }, indent=2))
    if not report["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
