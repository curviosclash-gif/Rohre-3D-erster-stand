"""BT93I.3 terminal-curriculum repair smoke and holdout guard report."""

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
BT93I_ROOT = PPO_ROOT / "bt93i"

DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93i_terminal_curriculum_repair.json"
READINESS_PATH = BT93I_ROOT / "long_run_readiness_report.json"
MATRIX_PATH = BT93I_ROOT / "matrix_manifest.json"
TERMINAL_REPORT_PATH = BT93I_ROOT / "terminal_provocation_report.json"
LATEST_REPAIR_POINTER = BT93I_ROOT / "latest_terminal_curriculum_repair.json"
LATEST_HOLDOUT_POINTER = BT93I_ROOT / "latest_holdout_eval.json"
DEFAULT_REPAIR_REPORT_PATH = BT93I_ROOT / "terminal_curriculum_repair_report.json"
DEFAULT_HOLDOUT_GUARD_PATH = BT93I_ROOT / "holdout_guard_report.json"


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
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _pointer_report(pointer_path: Path) -> tuple[Path, dict[str, Any], Path, dict[str, Any]]:
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, pointer, report_path, _read_json(report_path)


def _artifact_manifest(report: Mapping[str, Any]) -> tuple[Path, dict[str, Any]]:
    manifest_path = _repo_path(str(_get(report, "artifacts", "artifactManifest")))
    return manifest_path, _read_json(manifest_path)


def _sum_train_telemetry(report: Mapping[str, Any]) -> dict[str, Any]:
    totals = {
        "totalActions": 0,
        "invalidActionCount": 0,
        "preSamplingMaskCount": 0,
        "maskCount": 0,
        "postDecodeClampCount": 0,
        "vetoCount": 0,
        "sanitizerCount": 0,
        "noopCount": 0,
    }
    for row in _get(report, "learning", "telemetry") or []:
        if not isinstance(row, Mapping):
            continue
        for key in totals:
            totals[key] += _as_int(row.get(key))
    total_actions = totals["totalActions"]

    def rate(key: str) -> float:
        return round(totals[key] / total_actions, 6) if total_actions else 0.0

    return {
        **totals,
        "invalidActionRate": rate("invalidActionCount"),
        "preSamplingMaskRate": rate("preSamplingMaskCount"),
        "maskRate": rate("maskCount"),
        "postDecodeClampRate": rate("postDecodeClampCount"),
        "vetoRate": rate("vetoCount"),
        "sanitizerRate": rate("sanitizerCount"),
        "noopRate": rate("noopCount"),
    }


def _safety_status(config: Mapping[str, Any], telemetry: Mapping[str, Any]) -> dict[str, Any]:
    thresholds = _get(config, "diagnostics", "safetyThresholds") or {}
    checks = {
        "preSamplingMaskActive": (_as_float(telemetry.get("preSamplingMaskRate")) or 0.0) > 0.0,
        "postDecodeClampBelowLimit": (_as_float(telemetry.get("postDecodeClampRate")) or 0.0)
        < float(thresholds.get("postDecodeClampRateLt", 0.5)),
        "vetoBelowLimit": (_as_float(telemetry.get("vetoRate")) or 0.0)
        < float(thresholds.get("safetyVetoRateLt", 0.25)),
        "invalidActionRateZero": (_as_float(telemetry.get("invalidActionRate")) or 0.0)
        == float(thresholds.get("invalidActionRateEq", 0.0)),
        "sanitizerRateZero": (_as_float(telemetry.get("sanitizerRate")) or 0.0)
        == float(thresholds.get("sanitizerRateEq", 0.0)),
    }
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "thresholds": dict(thresholds),
        "telemetry": dict(telemetry),
    }


def _source_package(report: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "runId": _get(report, "resumedFrom", "runId"),
        "artifactManifest": _get(report, "resumedFrom", "artifactManifest"),
        "modelSha256": _get(report, "resumedFrom", "modelSha256"),
        "vecnormalizeSha256": _get(report, "resumedFrom", "vecnormalizeSha256"),
        "optimizerStateSha256": _get(report, "resumedFrom", "optimizerStateSha256"),
    }


def build_holdout_guard() -> dict[str, Any]:
    pointer_path, pointer, train_report_path, train_report = _pointer_report(LATEST_REPAIR_POINTER)
    manifest_path, manifest = _artifact_manifest(train_report)
    matrix = _read_json(MATRIX_PATH)
    holdout_pointer = _read_json(LATEST_HOLDOUT_POINTER) if LATEST_HOLDOUT_POINTER.exists() else None
    holdout_report_path = _repo_path(str(holdout_pointer["report"])) if holdout_pointer else None
    holdout_report = _read_json(holdout_report_path) if holdout_report_path else None
    holdout_seeds = list(_get(matrix, "seeds", "holdout") or [])
    holdout_run_id = str(holdout_report.get("runId") or "") if holdout_report else ""
    post_holdout_training_runs: list[dict[str, Any]] = []
    if holdout_run_id:
        for report_path in (BT93I_ROOT / "runs").glob("*/training_report.json"):
            report = _read_json(report_path)
            run_id = str(report.get("runId") or "")
            if run_id > holdout_run_id and _get(report, "learning", "optimizerUpdatesCompleted") is True:
                post_holdout_training_runs.append(
                    {
                        "runId": run_id,
                        "runKind": report.get("runKind"),
                        "report": _rel(report_path),
                        "optimizerStateSha256": _get(report, "artifacts", "optimizerStateSha256"),
                    }
                )
    holdout_consumed = holdout_report is not None
    result_class = "holdout-guard-green" if holdout_consumed else "pre-holdout-guard-pinned"
    pre_optimizer_hash = _get(train_report, "artifacts", "optimizerStateSha256")
    holdout_optimizer_hash = _get(holdout_report, "sourcePackage", "optimizerStateSha256") if holdout_report else None
    guard_checks = {
        "repairRunPinned": train_report.get("runKind") == "terminal-curriculum-repair",
        "holdoutSeedsPinned": bool(holdout_seeds),
        "optimizerStateHashPinned": bool(pre_optimizer_hash),
        "postHoldoutTrainingRunsEmpty": not post_holdout_training_runs,
        "holdoutEvalOnly": not holdout_consumed or holdout_report.get("runKind") == "holdout-eval",
        "holdoutSourceModelMatchesRepair": not holdout_consumed
        or _get(holdout_report, "sourcePackage", "modelSha256") == _get(train_report, "artifacts", "modelSha256"),
        "optimizerStateUnchangedByHoldout": not holdout_consumed or holdout_optimizer_hash == pre_optimizer_hash,
    }
    return {
        "ok": all(guard_checks.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_terminal_curriculum_repair_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.3.4",
        "resultClass": result_class,
        "guardChecks": guard_checks,
        "holdoutConsumed": holdout_consumed,
        "holdoutSeeds": holdout_seeds,
        "preHoldoutTrainingRun": {
            "runId": train_report.get("runId"),
            "runKind": train_report.get("runKind"),
            "report": _rel(train_report_path),
            "artifactManifest": _rel(manifest_path),
            "optimizerStep": _get(manifest, "optimizer", "maxOptimizerStep"),
            "modelSha256": _get(train_report, "artifacts", "modelSha256"),
            "vecnormalizeSha256": _get(train_report, "artifacts", "vecnormalizeSha256"),
            "optimizerStateSha256": _get(train_report, "artifacts", "optimizerStateSha256"),
        },
        "holdoutRun": {
            "runId": holdout_report.get("runId") if holdout_report else None,
            "report": _rel(holdout_report_path) if holdout_report_path else None,
            "sourceModelSha256": _get(holdout_report, "modelReload", "modelSha256") if holdout_report else None,
            "sourceOptimizerStateSha256": holdout_optimizer_hash,
        },
        "optimizerStateHashes": {
            "beforeHoldout": pre_optimizer_hash,
            "afterHoldout": holdout_optimizer_hash if holdout_consumed else None,
            "unchanged": guard_checks["optimizerStateUnchangedByHoldout"],
        },
        "postHoldoutTrainingRuns": post_holdout_training_runs,
        "rule": (
            "After a BT93I holdout eval exists, no later optimization may use the same holdout seeds; "
            "this report must be regenerated with before/after optimizer hashes."
        ),
        "sourceArtifacts": {
            "matrixManifest": _source(MATRIX_PATH, "BT93I matrix manifest"),
            "repairPointer": _source(pointer_path, "BT93I repair pointer", closure_capable=False),
            "repairTrainReport": _source(train_report_path, "BT93I repair train"),
            "repairManifest": _source(manifest_path, "BT93I repair artifact manifest"),
            "holdoutPointer": _optional_source(LATEST_HOLDOUT_POINTER, "BT93I holdout pointer", closure_capable=False),
        },
        "guardrails": {
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_terminal_curriculum_repair_report.py --write-holdout-guard",
            "repairTrain": _get(train_report, "learning", "trainingCommand"),
        },
    }


def build_repair_report(holdout_guard_path: Path) -> dict[str, Any]:
    config = _read_json(DEFAULT_CONFIG_PATH)
    readiness = _read_json(READINESS_PATH)
    terminal = _read_json(TERMINAL_REPORT_PATH)
    pointer_path, pointer, train_report_path, train_report = _pointer_report(LATEST_REPAIR_POINTER)
    manifest_path, manifest = _artifact_manifest(train_report)
    holdout_guard = _read_json(holdout_guard_path)
    telemetry = _sum_train_telemetry(train_report)
    safety = _safety_status(config, telemetry)
    threshold_status = _get(train_report, "learning", "ppoLearningMetrics", "thresholdStatus") or {}
    artifacts = train_report.get("artifacts") if isinstance(train_report.get("artifacts"), Mapping) else {}
    requested_timesteps = _as_int(_get(train_report, "learning", "requestedTimesteps"))
    phase_coverage = {
        "93I.3.1": train_report.get("runKind") == "terminal-curriculum-repair"
        and train_report.get("candidateRun") is False
        and train_report.get("freezeCandidate") is False
        and train_report.get("promotionAllowed") is False,
        "93I.3.2": requested_timesteps == 2048
        and readiness.get("longRunAllowed") is True
        and terminal.get("resultClass") == "terminal-provocation-green",
        "93I.3.3": train_report.get("truePpoModelPackage") is True
        and train_report.get("truePpoOptimizerUpdate") is True
        and all(
            artifacts.get(key)
            for key in (
                "modelSha256",
                "optimizerStateSha256",
                "vecnormalizeSha256",
                "configSha256",
            )
        )
        and bool(_get(train_report, "learning", "ppoLearningMetrics", "metrics"))
        and safety["ok"],
        "93I.3.4": holdout_guard.get("ok") is True
        and holdout_guard.get("postHoldoutTrainingRuns") == [],
    }
    result_class = "terminal-curriculum-smoke-green-awaiting-eval" if all(phase_coverage.values()) else "diagnose-blocked"
    return {
        "ok": all(phase_coverage.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_terminal_curriculum_repair_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.3",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "repairRun": {
            "runId": train_report.get("runId"),
            "runKind": train_report.get("runKind"),
            "report": _rel(train_report_path),
            "artifactManifest": _rel(manifest_path),
            "requestedTimesteps": requested_timesteps,
            "modelNumTimesteps": _get(train_report, "learning", "modelNumTimesteps"),
            "optimizerUpdatesBefore": _get(train_report, "learning", "optimizerUpdatesBefore"),
            "optimizerUpdatesAfter": _get(train_report, "learning", "optimizerUpdatesAfter"),
            "truePpoOptimizerUpdate": train_report.get("truePpoOptimizerUpdate"),
            "truePpoModelPackage": train_report.get("truePpoModelPackage"),
            "sourceModelPackage": _source_package(train_report),
            "artifacts": {
                "modelSha256": artifacts.get("modelSha256"),
                "optimizerStateSha256": artifacts.get("optimizerStateSha256"),
                "vecnormalizeSha256": artifacts.get("vecnormalizeSha256"),
                "configSha256": artifacts.get("configSha256"),
            },
            "loadCompatibility": train_report.get("loadCompatibility"),
            "pickleCompatibility": manifest.get("pickleCompatibility"),
        },
        "earlyStopStatus": {
            "collapseThresholdsOk": bool(threshold_status) and all(bool(value) for value in threshold_status.values()),
            "thresholdStatus": dict(threshold_status),
            "collapseOrInstabilitySignal": _get(
                train_report,
                "learning",
                "ppoLearningMetrics",
                "collapseOrInstabilitySignal",
            ),
            "safety": safety,
            "runtimeErrorCount": 0,
            "stopRequired": not (bool(threshold_status) and all(bool(value) for value in threshold_status.values()) and safety["ok"]),
        },
        "extensionDecision": {
            "smokeExecuted": True,
            "extensionExecuted": False,
            "nextIncrementTimesteps": _get(config, "rollout", "terminalCurriculumIncrementTimesteps"),
            "maxTimesteps": _get(config, "rollout", "terminalCurriculumMaxTimesteps"),
            "wallClockLimitSeconds": _get(config, "rollout", "wallClockLimitSeconds"),
            "reason": (
                "93I.3 stops after the green 2048 smoke; 93I.4 owns the episode-targeted eval/holdout "
                "matrix before any further optimization or start-gate decision."
            ),
        },
        "holdoutGuard": {
            "path": _rel(holdout_guard_path),
            "resultClass": holdout_guard.get("resultClass"),
            "holdoutConsumed": holdout_guard.get("holdoutConsumed"),
            "postHoldoutTrainingRuns": holdout_guard.get("postHoldoutTrainingRuns"),
        },
        "commands": {
            "train": _get(train_report, "learning", "trainingCommand"),
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_terminal_curriculum_repair_report.py --write-holdout-guard --write-report",
        },
        "sourceArtifacts": {
            "config": _source(DEFAULT_CONFIG_PATH, "BT93I repair config"),
            "longRunReadiness": _source(READINESS_PATH, "BT93I long-run readiness"),
            "matrixManifest": _source(MATRIX_PATH, "BT93I matrix manifest"),
            "terminalProvocation": _source(TERMINAL_REPORT_PATH, "BT93I terminal provocation"),
            "repairPointer": _source(pointer_path, "BT93I repair pointer", closure_capable=False),
            "repairTrainReport": _source(train_report_path, "BT93I repair train"),
            "repairManifest": _source(manifest_path, "BT93I repair artifact manifest"),
            "holdoutGuard": _source(holdout_guard_path, "BT93I holdout guard"),
        },
        "guardrails": {
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
            "runtimeSurfacesTouched": [],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93I.3 repair report and holdout guard.")
    parser.add_argument("--write-holdout-guard", action="store_true")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--holdout-guard-output", default=str(DEFAULT_HOLDOUT_GUARD_PATH))
    parser.add_argument("--report-output", default=str(DEFAULT_REPAIR_REPORT_PATH))
    args = parser.parse_args()

    wrote: dict[str, Any] = {}
    holdout_guard_path = _repo_path(args.holdout_guard_output)
    if args.write_holdout_guard:
        holdout_guard = build_holdout_guard()
        _write_json(holdout_guard_path, holdout_guard)
        wrote["holdoutGuard"] = _rel(holdout_guard_path)
    if args.write_report:
        if not holdout_guard_path.exists():
            _write_json(holdout_guard_path, build_holdout_guard())
            wrote["holdoutGuard"] = _rel(holdout_guard_path)
        report = build_repair_report(holdout_guard_path)
        report_path = _repo_path(args.report_output)
        _write_json(report_path, report)
        wrote["repairReport"] = _rel(report_path)

    if not wrote:
        report = build_repair_report(holdout_guard_path) if holdout_guard_path.exists() else build_holdout_guard()
        print(json.dumps({"ok": report["ok"], "resultClass": report["resultClass"]}, indent=2, sort_keys=True))
        return 0 if report["ok"] else 1

    repair_report_path = _repo_path(args.report_output)
    summary = _read_json(repair_report_path) if repair_report_path.exists() else _read_json(holdout_guard_path)
    print(
        json.dumps(
            {
                "ok": summary["ok"],
                "resultClass": summary["resultClass"],
                "phaseCoverage": summary.get("phaseCoverage"),
                "wrote": wrote,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
