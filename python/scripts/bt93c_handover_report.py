"""BT93C reproducibility and BT94A handover report."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
DEFAULT_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
DEFAULT_HANDOVER = DEFAULT_ROOT / "handover_report.json"
DEFAULT_MATRIX = DEFAULT_ROOT / "evidence_quality_matrix.json"

FINDING_DISPOSITIONS = [
    ("F.01", "closed", "93C.3", "real PPO optimizer updates and model package exist"),
    ("F.02", "closed", "93C.1", "requirements, clean env, pip check, and import smoke are versioned"),
    ("F.03", "closed", "93C.2", "SB3 MultiDiscrete action surface is train/eval compatible"),
    ("F.04", "closed", "93C.3", "model, optimizer, VecNormalize, config, and hashes are persisted"),
    ("F.05", "bt94a-blocker", "93C.6/94B.2", "PPO survival regresses against the DQN anchor"),
    ("F.06", "follow-gated", "94B.3", "PPO-Validate must be built before any promote verdict"),
    ("F.07", "follow-gated", "93C.99/94A", "4-env remains locked without direct evidence"),
    ("F.08", "closed", "93C.4/93C.5", "throughput is classified as budget/stability evidence only"),
    ("F.09", "closed", "93C.0", "fresh freeze check is green"),
    ("F.10", "closed", "93C.1", "stale artifact/readme contradictions were cleared"),
    ("F.11", "closed", "93C.1", "tmp-only closure evidence was replaced or demoted"),
    ("F.12", "closed", "93C.6", "DQN champion, matrix, semantic window, and holdout are frozen"),
    ("F.13", "follow-gated", "94B.1/94B.2", "external candidate statistics need fixed rules before runs"),
    ("F.14", "follow-gated", "94B.3", "PPO-specific validate report is still missing"),
    ("F.15", "follow-gated", "BT95/separate rollout", "runtime handoff remains doc-only and out of BT93C scope"),
    ("F.16", "closed", "93C.1/93C.5", "scaffold, pilot, baseline, and candidate terms are separated"),
    ("F.17", "closed", "93C.3/93C.6", "eval loads a real PPO model package"),
    ("F.18", "follow-gated", "94B.3", "runtime classes are reported internally; PPO-Validate mapping remains"),
    ("F.19", "bt94a-blocker", "94B.2/94B.3", "episodes are still max-step dominated with empty death classes"),
    ("F.20", "closed", "93C.2/93C.4", "sanitizer, mask, veto, and invalid rates are measured"),
    ("F.21", "closed", "93C.1/93C.7", "draft-risk drift is carried into the quality matrix"),
    ("F.22", "closed", "93C.7", "governance gates are not treated as learning proof"),
    ("F.23", "closed", "93C.1/93C.7", "closure evidence points to artifacts instead of plan self-counts"),
    ("F.24", "follow-gated", "94A/94B", "short stability smokes remain monitoring, not long-run proof"),
    ("F.25", "closed", "93C.1", "clean env reproduces the PPO dependency stack"),
    ("F.26", "closed", "93C.1/93C.5", "exact baseline IDs and metric sources are fixed"),
    ("F.27", "bt94a-blocker", "93C.6/93C.7", "PPO result is classified as regression versus DQN"),
    ("F.28", "follow-gated", "94B.3", "internal eval survival is not PPO-Validate evidence"),
    ("F.29", "closed", "93C.6", "holdout seeds were consumed and reported"),
    ("F.30", "bt94a-blocker", "94A/94B.2", "post-decode clamp/mask load must not become a freeze candidate"),
    ("F.31", "bt94a-blocker", "94B.2/94B.3", "natural terminal/death matrix remains weak"),
    ("F.32", "follow-gated", "94A.1/94B.1", "larger candidate runs need fixed sample/statistics rules"),
    ("F.33", "closed", "93C.7", "handover references immutable run IDs, hashes, and manifests"),
    ("F.34", "closed", "93C.6/93C.7", "V101 follow-up reports no PPO contract drift"),
    ("F.35", "closed", "93C.7", "docs gates are separated from semantic PPO evidence"),
    ("F.36", "follow-gated", "94A/94B", "longer candidate runs must continue failure-class telemetry"),
    ("F.37", "follow-gated", "94B.3", "PPO-Validate build location and schema remain a future gate"),
]


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
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


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


def _git_sha() -> str:
    result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _git_status(paths: list[str]) -> dict[str, str]:
    result = subprocess.run(
        ["git", "status", "--porcelain=v1", "--untracked-files=all", "--", *paths],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    status = {path: "clean" for path in paths}
    for line in result.stdout.splitlines():
        if not line:
            continue
        path = line[3:].replace("\\", "/")
        status[path] = line[:2]
    return status


def _number(value: Any) -> float | None:
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def _metric_block(report: Mapping[str, Any]) -> dict[str, Any]:
    diagnostics = report.get("diagnostics") if isinstance(report.get("diagnostics"), Mapping) else {}
    survival = diagnostics.get("survivalKpis") if isinstance(diagnostics.get("survivalKpis"), Mapping) else {}
    reward = diagnostics.get("rewardSafetyDiagnostics") if isinstance(diagnostics.get("rewardSafetyDiagnostics"), Mapping) else {}
    telemetry = reward.get("actionTelemetry") if isinstance(reward.get("actionTelemetry"), Mapping) else {}
    failures = diagnostics.get("failureSemantics") if isinstance(diagnostics.get("failureSemantics"), Mapping) else {}
    return {
        "avgStepsPerEpisode": _number(survival.get("avgStepsPerEpisode")),
        "averageBotSurvival": _number(survival.get("averageBotSurvival")),
        "runtimeErrorCount": failures.get("runtimeErrorCount"),
        "invalidActionRate": telemetry.get("invalidActionRate"),
        "sanitizerRate": telemetry.get("sanitizerRate"),
        "vetoRate": telemetry.get("vetoRate"),
        "maskRate": telemetry.get("maskRate"),
        "terminalReasonCounts": failures.get("terminalReasonCounts"),
        "truncatedReasonCounts": failures.get("truncatedReasonCounts"),
        "deathCauseCounts": failures.get("deathCauseCounts"),
    }


def _pointer_report(root: Path, pointer_name: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None, Path | None]:
    pointer_path = root / pointer_name
    if not pointer_path.exists():
        return None, None, None
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer, _read_json(report_path), report_path


def _build_repro(root: Path, baseline_report: Mapping[str, Any]) -> dict[str, Any]:
    baseline_eval_path = _repo_path(str(((baseline_report.get("sourceReports") or {}).get("baselineEval") or {}).get("report")))
    baseline_eval = _read_json(baseline_eval_path)
    repro_pointer, repro_report, repro_path = _pointer_report(root, "latest_baseline_repro_eval.json")
    tolerance = {
        "avgStepsPerEpisodeAbs": 0.000001,
        "averageBotSurvivalAbs": 0.000001,
        "rewardTotalAbs": 0.000001,
    }
    baseline_metrics = _metric_block(baseline_eval)
    repro_metrics = _metric_block(repro_report or {})
    deltas = {
        "avgStepsPerEpisodeAbs": abs((repro_metrics["avgStepsPerEpisode"] or 0.0) - (baseline_metrics["avgStepsPerEpisode"] or 0.0)),
        "averageBotSurvivalAbs": abs((repro_metrics["averageBotSurvival"] or 0.0) - (baseline_metrics["averageBotSurvival"] or 0.0)),
        "rewardTotalAbs": abs(float(((repro_report or {}).get("eval") or {}).get("rewardTotal") or 0.0) - float((baseline_eval.get("eval") or {}).get("rewardTotal") or 0.0)),
    }
    ok = bool(
        repro_report
        and repro_report.get("ok") is True
        and (repro_report.get("sourcePackage") or {}).get("modelSha256")
        == (((baseline_report.get("ppoCandidate") or {}).get("modelSha256")) or ((baseline_eval.get("sourcePackage") or {}).get("modelSha256")))
        and deltas["avgStepsPerEpisodeAbs"] <= tolerance["avgStepsPerEpisodeAbs"]
        and deltas["averageBotSurvivalAbs"] <= tolerance["averageBotSurvivalAbs"]
        and deltas["rewardTotalAbs"] <= tolerance["rewardTotalAbs"]
        and repro_metrics["runtimeErrorCount"] == 0
    )
    return {
        "ok": ok,
        "runId": (repro_pointer or {}).get("runId"),
        "runKind": (repro_pointer or {}).get("runKind"),
        "command": "python\\.venv\\Scripts\\python.exe python\\eval.py --profile bt93c --run-kind baseline-repro-eval --phase-id 93C.7.1 --config python\\configs\\ppo_bt93c_baseline.json --checkpoint data\\training\\ppo\\bt93c\\runs\\20260424T180033Z-baseline-train\\artifact_manifest.json",
        "baselineEvalReport": _rel(baseline_eval_path),
        "reproEvalReport": _rel(repro_path) if repro_path else None,
        "baselineMetrics": baseline_metrics,
        "reproMetrics": repro_metrics,
        "tolerance": tolerance,
        "deltas": deltas,
        "interpretation": "same-config deterministic KPI repro" if ok else "repro missing or outside tolerance",
    }


def _build_quality_matrix(root: Path, reports: Mapping[str, Any]) -> dict[str, Any]:
    audit_delta = reports["auditDelta"]
    precomparison = reports["precomparison"]
    rows = [
        {
            "id": finding_id,
            "status": status,
            "gate": gate,
            "evidence": evidence,
            "blocksBt94a": status == "bt94a-blocker",
        }
        for finding_id, status, gate, evidence in FINDING_DISPOSITIONS
    ]
    status_counts: dict[str, int] = {}
    for row in rows:
        status_counts[row["status"]] = status_counts.get(row["status"], 0) + 1
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_handover_report.py",
        "blockId": "BT93C",
        "phaseId": "93C.7.3",
        "summary": status_counts,
        "auditRegister": rows,
        "tmpSelfCountStaleDocState": {
            "source": "data/training/ppo/bt93c/audit_delta_report.json",
            "untrackedPpoArtifacts": audit_delta.get("untrackedPpoArtifacts"),
            "tmpOnlyEvidence": audit_delta.get("tmpOnlyEvidence"),
            "selfCountEvidence": audit_delta.get("selfCountEvidence"),
            "riskDrift": audit_delta.get("riskDrift"),
        },
        "riskRegisterAlignment": [
            {
                "risk": "PPO baseline is misread as promotion",
                "disposition": "blocked by ppo-regression result and promotionAllowed=false",
            },
            {
                "risk": "4-env escalation without direct evidence",
                "disposition": "fourEnvAllowed=false remains in reports",
            },
            {
                "risk": "V101 drift invalidates PPO contracts",
                "disposition": precomparison.get("v101FollowUp", {}).get("resultClass"),
            },
            {
                "risk": "PPO-Validate is confused with BT80C legacy validate",
                "disposition": "BT94B.3 owns PPO-Validate; BT80C is historical context only",
            },
        ],
        "bt94aStoppers": [
            row["id"]
            for row in rows
            if row["blocksBt94a"]
        ],
        "sourceArtifacts": {
            "auditDeltaReport": {
                "path": "data/training/ppo/bt93c/audit_delta_report.json",
                "sha256": _sha256_file(root / "audit_delta_report.json"),
            },
            "precomparisonReport": {
                "path": "data/training/ppo/bt93c/precomparison_report.json",
                "sha256": _sha256_file(root / "precomparison_report.json"),
            },
        },
    }


def build_reports(root: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    reports = {
        "auditDelta": _read_json(root / "audit_delta_report.json"),
        "baseline": _read_json(root / "baseline_report.json"),
        "precomparison": _read_json(root / "precomparison_report.json"),
        "diagnostics": _read_json(root / "diagnostics_report.json"),
        "pilot": _read_json(root / "pilot_report.json"),
    }
    baseline_manifest_path = _repo_path(str((reports["precomparison"].get("ppoCandidate") or {}).get("artifactManifest")))
    baseline_manifest = _read_json(baseline_manifest_path)
    repro = _build_repro(root, reports["baseline"] | {"ppoCandidate": reports["precomparison"].get("ppoCandidate") or {}})
    quality = _build_quality_matrix(root, reports)
    v101 = reports["precomparison"].get("v101FollowUp") or {}
    result_class = reports["precomparison"].get("resultClass")
    bt94a_ready = bool(
        result_class in {"ppo-promising", "ppo-hold"}
        and repro["ok"]
        and baseline_manifest.get("truePpoModelPackage") is True
        and baseline_manifest.get("scaffoldOnly") is False
    )
    handover_class = "BT94A-ready" if bt94a_ready else "diagnose"
    handover = {
        "ok": bool(repro["ok"] and quality["ok"] and v101.get("ok") is True),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_handover_report.py",
        "blockId": "BT93C",
        "phaseId": "93C.7",
        "claim": "93C-Handover",
        "gitSha": _git_sha(),
        "resultClass": handover_class,
        "phaseCoverage": {
            "93C.7.1": repro["ok"],
            "93C.7.2": True,
            "93C.7.3": quality["ok"],
            "93C.7.4": v101.get("ok") is True,
        },
        "doDCoverage": {
            "DoD.5": True,
            "DoD.7": True,
            "DoD.9": True,
            "DoD.12": True,
            "DoD.10": False,
        },
        "reproducibility": repro,
        "modelPackage": {
            "artifactManifest": _rel(baseline_manifest_path),
            "runId": baseline_manifest.get("runId"),
            "modelSha256": (baseline_manifest.get("artifacts") or {}).get("modelSha256"),
            "vecnormalizeSha256": (baseline_manifest.get("artifacts") or {}).get("vecnormalizeSha256"),
            "optimizerStateSha256": (baseline_manifest.get("artifacts") or {}).get("optimizerStateSha256"),
            "configSha256": (baseline_manifest.get("artifacts") or {}).get("configSha256"),
            "gitSha": baseline_manifest.get("gitSha"),
            "truePpoModelPackage": baseline_manifest.get("truePpoModelPackage"),
            "scaffoldOnly": baseline_manifest.get("scaffoldOnly"),
        },
        "v101FollowUp": {
            "resultClass": v101.get("resultClass"),
            "driftPaths": v101.get("driftPaths"),
            "freezeCheck": v101.get("freezeCheck"),
        },
        "bt94aHandover": {
            "ready": bt94a_ready,
            "gate": "closed-diagnose-ppo-regression" if not bt94a_ready else "open-for-candidate-freeze-intake",
            "reason": (
                "BT93C has a real model package and repro evidence, but the pre-comparison is ppo-regression and keeps BT94A closed."
                if not bt94a_ready
                else "BT93C produced a real model package and non-regressing pre-comparison evidence."
            ),
            "precomparisonResult": result_class,
            "ppoValidateStatus": (reports["precomparison"].get("evidenceInterpretation") or {}).get("ppoValidateStatus"),
            "rolloutAllowed": False,
            "promotionAllowed": False,
        },
        "remainingGates": {
            "bt94a": quality["bt94aStoppers"],
            "bt94bPpoValidate": "BT94B.3 remains mandatory before any promote verdict",
            "runtimeRollout": "outside BT93C; no JS inference, strategy flag, registry, rollback, or latency proof here",
        },
        "evidenceQualityMatrix": {
            "path": "data/training/ppo/bt93c/evidence_quality_matrix.json",
            "sha256": None,
        },
        "guardrails": {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
            "isPromotionEvidence": False,
            "isRolloutSignal": False,
        },
        "worktreeRuntimeSurfaceStatus": _git_status([
            "src/entities/ai/training/TrainingContractV1.js",
            "src/entities/ai/training/TrainerPayloadAdapter.js",
            "src/entities/ai/observation/ObservationSchemaV2.js",
            "src/entities/ai/actions/BotActionContract.js",
            "src/state/training/TrainingDomain.js",
            "src/entities/ai/ObservationBridgePolicy.js",
            "src/entities/ai/observation/RuntimeNearObservationAdapter.js",
            "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
            "src/core/RuntimeConfig.js",
            "src/state/training/RewardCalculator.js",
        ]),
        "sourceArtifacts": {
            "baselineReport": {
                "path": "data/training/ppo/bt93c/baseline_report.json",
                "sha256": _sha256_file(root / "baseline_report.json"),
            },
            "precomparisonReport": {
                "path": "data/training/ppo/bt93c/precomparison_report.json",
                "sha256": _sha256_file(root / "precomparison_report.json"),
            },
            "diagnosticsReport": {
                "path": "data/training/ppo/bt93c/diagnostics_report.json",
                "sha256": _sha256_file(root / "diagnostics_report.json"),
            },
        },
    }
    return handover, quality


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-root", default=str(DEFAULT_ROOT))
    parser.add_argument("--handover-output", default=str(DEFAULT_HANDOVER))
    parser.add_argument("--matrix-output", default=str(DEFAULT_MATRIX))
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    root = _repo_path(args.artifact_root)
    handover_output = _repo_path(args.handover_output)
    matrix_output = _repo_path(args.matrix_output)
    handover, quality = build_reports(root)
    wrote: dict[str, str] = {}
    if args.write_report:
        _write_json(matrix_output, quality)
        handover["evidenceQualityMatrix"]["sha256"] = _sha256_file(matrix_output)
        _write_json(handover_output, handover)
        wrote["evidenceQualityMatrix"] = _rel(matrix_output)
        wrote["handoverReport"] = _rel(handover_output)
    print(json.dumps({"ok": handover["ok"], "resultClass": handover["resultClass"], "wrote": wrote}, indent=2))


if __name__ == "__main__":
    main()
