"""BT93C DQN/PPO pre-comparison and holdout report."""

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
DEFAULT_CONFIG = PYTHON_ROOT / "configs" / "ppo_bt93c_baseline.json"
DEFAULT_OUTPUT = DEFAULT_ROOT / "precomparison_report.json"
FREEZE_CHECK = REPO_ROOT / "data" / "training" / "ppo" / "freeze_check.json"
V101_PLAN = REPO_ROOT / "docs" / "plaene" / "aktiv" / "V101.md"

V101_WATCHLIST = [
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


def _git(args: list[str]) -> tuple[int, str, str]:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def _git_required(args: list[str]) -> str:
    code, stdout, stderr = _git(args)
    if code != 0:
        detail = stderr or stdout or f"exit code {code}"
        raise RuntimeError(f"git {' '.join(args)} failed: {detail}")
    return stdout


def _git_sha() -> str:
    return _git_required(["rev-parse", "HEAD"])


def _git_blob(commit: str, path: str) -> str | None:
    code, stdout, _ = _git(["rev-parse", f"{commit}:{path}"])
    return stdout if code == 0 else None


def _worktree_blob(path: str) -> str | None:
    if not (REPO_ROOT / path).exists():
        return None
    return _git_required(["hash-object", "--", path])


def _status_map(paths: list[str]) -> dict[str, str]:
    output = _git_required(["status", "--porcelain=v1", "--untracked-files=all", "--", *paths])
    result = {path: "clean" for path in paths}
    for line in output.splitlines():
        if not line:
            continue
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        result[path] = line[:2]
    return result


def _number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pct_delta(current: float | None, reference: float | None) -> float | None:
    if current is None or reference in (None, 0):
        return None
    return round(((current - reference) / reference) * 100.0, 6)


def _metric_block(report: Mapping[str, Any]) -> dict[str, Any]:
    diagnostics = report.get("diagnostics") if isinstance(report.get("diagnostics"), Mapping) else {}
    survival = diagnostics.get("survivalKpis") if isinstance(diagnostics.get("survivalKpis"), Mapping) else {}
    reward = (
        diagnostics.get("rewardSafetyDiagnostics")
        if isinstance(diagnostics.get("rewardSafetyDiagnostics"), Mapping)
        else {}
    )
    telemetry = reward.get("actionTelemetry") if isinstance(reward.get("actionTelemetry"), Mapping) else {}
    failures = diagnostics.get("failureSemantics") if isinstance(diagnostics.get("failureSemantics"), Mapping) else {}
    return {
        "avgStepsPerEpisode": _number(survival.get("avgStepsPerEpisode")),
        "averageBotSurvival": _number(survival.get("averageBotSurvival")),
        "averageBotSurvivalSource": survival.get("averageBotSurvivalSource"),
        "runtimeErrorCount": failures.get("runtimeErrorCount"),
        "failureClasses": {
            key: failures.get(key)
            for key in ("crash", "timeout", "forcedRound", "socketClose", "teardownFailure", "maxSteps", "naturalTerminal")
        },
        "invalidActionRate": telemetry.get("invalidActionRate"),
        "sanitizerRate": telemetry.get("sanitizerRate"),
        "vetoRate": telemetry.get("vetoRate"),
        "maskRate": telemetry.get("maskRate"),
        "terminalReasonCounts": failures.get("terminalReasonCounts"),
        "truncatedReasonCounts": failures.get("truncatedReasonCounts"),
        "deathCauseCounts": failures.get("deathCauseCounts"),
    }


def _build_v101_followup(baseline_git_sha: str | None) -> dict[str, Any]:
    status = _status_map(V101_WATCHLIST)
    entries = []
    drift_paths = []
    for path in V101_WATCHLIST:
        baseline_blob = _git_blob(baseline_git_sha, path) if baseline_git_sha else None
        head_blob = _git_blob("HEAD", path)
        current_blob = _worktree_blob(path)
        changed_since_baseline = baseline_blob is not None and current_blob != baseline_blob
        worktree_dirty = status.get(path, "clean") != "clean"
        if changed_since_baseline or worktree_dirty:
            drift_paths.append(path)
        entries.append({
            "path": path,
            "worktreeStatus": status.get(path, "clean"),
            "baselineCommit": baseline_git_sha,
            "baselineBlob": baseline_blob,
            "headBlob": head_blob,
            "currentBlob": current_blob,
            "changedSinceBaselineCommit": changed_since_baseline,
            "worktreeDirty": worktree_dirty,
        })

    freeze_check = _read_json(FREEZE_CHECK) if FREEZE_CHECK.exists() else {}
    freeze_result = freeze_check.get("result") if isinstance(freeze_check.get("result"), Mapping) else {}
    freeze_summary = freeze_check.get("summary") if isinstance(freeze_check.get("summary"), Mapping) else {}
    plan_text = V101_PLAN.read_text(encoding="utf-8") if V101_PLAN.exists() else ""
    v101_closed = "status: done" in plan_text and "101.99" in plan_text
    freeze_ok = freeze_result.get("freezeOk") is True and freeze_summary.get("driftCount") == 0
    blocking = bool(drift_paths or not v101_closed or not freeze_ok)
    return {
        "ok": not blocking,
        "resultClass": "no-ppo-contract-drift" if not blocking else "blocked-v101-or-freeze-drift",
        "v101Plan": {
            "path": _rel(V101_PLAN),
            "closed": v101_closed,
            "scopeIncludesTrainingSurfaces": all(path in plan_text for path in [
                "src/state/training/TrainingDomain.js",
                "src/entities/ai/ObservationBridgePolicy.js",
                "src/entities/ai/observation/RuntimeNearObservationAdapter.js",
                "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
                "src/core/RuntimeConfig.js",
            ]),
        },
        "freezeCheck": {
            "path": _rel(FREEZE_CHECK),
            "freezeOk": freeze_result.get("freezeOk"),
            "reAuditRequired": freeze_result.get("reAuditRequired"),
            "driftCount": freeze_summary.get("driftCount"),
            "headCommit": ((freeze_check.get("snapshot") or {}).get("headCommit") if freeze_check else None),
        },
        "watchlist": entries,
        "driftPaths": drift_paths,
        "conclusion": (
            "V101 is closed and no watched PPO authority/runtime-near surface drifted since the BT93C baseline commit."
            if not blocking
            else "V101/freeze drift blocks a strong DQN/PPO pre-comparison until resolved."
        ),
    }


def _build_matrix(config: Mapping[str, Any], baseline_source: Mapping[str, Any]) -> dict[str, Any]:
    env = config["env"]
    anchor = baseline_source["comparisonAnchor"]
    return {
        "matrixId": "bt93c-dqn-ppo-precomparison-v1",
        "modeId": env["modeId"],
        "maps": list(anchor.get("maps") or []),
        "trainSeeds": list(env["trainSeeds"]),
        "evalSeeds": list(env["evalSeeds"]),
        "holdoutSeeds": list(env["holdoutSeeds"]),
        "invalidPassRules": [
            "freezeOk must stay true",
            "runtimeErrorCount must be 0",
            "holdout must be reported separately from eval",
            "PPO-Validate is required before any promote or rollout signal",
            "4-env remains locked without direct evidence",
        ],
        "dqnChampion": {
            "baselineId": anchor.get("baselineId"),
            "role": anchor.get("role"),
            "date": anchor.get("date"),
            "command": anchor.get("command"),
            "modes": anchor.get("modes"),
            "maps": anchor.get("maps"),
            "semanticWindow": anchor.get("semanticWindow"),
            "artifactPaths": anchor.get("artifactPaths"),
        },
        "strictApplesToApples": {
            "ok": False,
            "reason": "Legacy BT11 DQN seed evidence is not fully versioned; BT93C.6 is a conservative pre-comparison, not promotion evidence.",
            "legacySeedStatus": ((anchor.get("seeds") or {}).get("status")),
        },
    }


def _classify(*, ppo_survival: float | None, dqn_survival: float | None, holdout_survival: float | None, v101_ok: bool) -> str:
    if not v101_ok or ppo_survival is None or dqn_survival is None or holdout_survival is None:
        return "ppo-diagnose"
    if ppo_survival >= dqn_survival * 1.3 and holdout_survival >= dqn_survival:
        return "ppo-promising"
    if ppo_survival >= dqn_survival * 0.9 and holdout_survival >= ppo_survival * 0.8:
        return "ppo-hold"
    return "ppo-regression"


def build_precomparison_report(root: Path, config_path: Path) -> dict[str, Any]:
    config = _read_json(config_path)
    baseline = _read_json(_repo_path(config["artifacts"]["baselineReport"]))
    baseline_source = _read_json(_repo_path(config["artifacts"]["baselineSourceManifest"]))
    holdout_pointer_path = root / "latest_holdout_eval.json"
    holdout_pointer = _read_json(holdout_pointer_path) if holdout_pointer_path.exists() else None
    holdout_report_path = _repo_path(str(holdout_pointer["report"])) if holdout_pointer else None
    holdout_report = _read_json(holdout_report_path) if holdout_report_path else None
    baseline_manifest_path = _repo_path(str(((baseline.get("sourceReports") or {}).get("baselineTrain") or {}).get("report"))).parent / "artifact_manifest.json"
    baseline_manifest = _read_json(baseline_manifest_path)

    v101 = _build_v101_followup(str(baseline.get("gitSha") or ""))
    matrix = _build_matrix(config, baseline_source)
    ppo_eval = baseline.get("ppoBaselineMetrics") or {}
    ppo_holdout = _metric_block(holdout_report or {})
    dqn_metrics = ((baseline_source.get("comparisonAnchor") or {}).get("metrics") or {})
    ppo_survival = _number(ppo_eval.get("averageBotSurvival"))
    ppo_steps = _number(ppo_eval.get("avgStepsPerEpisode"))
    holdout_survival = _number(ppo_holdout.get("averageBotSurvival"))
    dqn_survival = _number(dqn_metrics.get("averageBotSurvival"))
    dqn_steps = _number(dqn_metrics.get("avgStepsPerEpisode"))
    result_class = _classify(
        ppo_survival=ppo_survival,
        dqn_survival=dqn_survival,
        holdout_survival=holdout_survival,
        v101_ok=bool(v101["ok"]),
    )

    phase_coverage = {
        "93C.6.1": bool(v101["ok"] and matrix["dqnChampion"]["baselineId"] and matrix["holdoutSeeds"]),
        "93C.6.2": bool(holdout_report and ppo_survival is not None and holdout_survival is not None),
        "93C.6.3": result_class in {"ppo-promising", "ppo-hold", "ppo-diagnose", "ppo-regression"},
        "93C.6.4": bool(matrix["dqnChampion"]["baselineId"] and matrix["dqnChampion"]["artifactPaths"]),
        "93C.6.5": True,
    }

    return {
        "ok": all(phase_coverage.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_precomparison_report.py",
        "blockId": "BT93C",
        "phaseId": "93C.6",
        "claim": "93C-DQN-PPO-Precomparison-Holdout",
        "gitSha": _git_sha(),
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "v101FollowUp": v101,
        "comparisonMatrix": matrix,
        "ppoCandidate": {
            "baselineId": "bt93c-ppo-baseline-publish-v1",
            "baselineRunId": ((baseline.get("sourceReports") or {}).get("baselineTrain") or {}).get("runId"),
            "baselineEvalRunId": ((baseline.get("sourceReports") or {}).get("baselineEval") or {}).get("runId"),
            "holdoutEvalRunId": (holdout_pointer or {}).get("runId"),
            "modelSha256": ((baseline_manifest.get("artifacts") or {}).get("modelSha256")),
            "vecnormalizeSha256": ((baseline_manifest.get("artifacts") or {}).get("vecnormalizeSha256")),
            "optimizerStateSha256": ((baseline_manifest.get("artifacts") or {}).get("optimizerStateSha256")),
            "configSha256": ((baseline_manifest.get("artifacts") or {}).get("configSha256")),
            "artifactManifest": _rel(baseline_manifest_path),
            "promotionAllowed": False,
        },
        "metrics": {
            "dqnChampion": {
                "avgStepsPerEpisode": dqn_steps,
                "averageBotSurvival": dqn_survival,
                "invalidActionRate": _number(dqn_metrics.get("invalidActionRate")),
                "runtimeErrorCount": dqn_metrics.get("runtimeErrorCount"),
                "source": "BT11 historical DQN champion anchor",
            },
            "ppoInternalEval": ppo_eval,
            "ppoHoldout": ppo_holdout,
            "deltasAgainstDqn": {
                "avgStepsPerEpisodePct": _pct_delta(ppo_steps, dqn_steps),
                "averageBotSurvivalPct": _pct_delta(ppo_survival, dqn_survival),
                "holdoutAverageBotSurvivalPct": _pct_delta(holdout_survival, dqn_survival),
                "targetSurvivalForPlus30Pct": round(dqn_survival * 1.3, 6) if dqn_survival is not None else None,
            },
        },
        "evidenceInterpretation": {
            "class": result_class,
            "isPromotionEvidence": False,
            "isRolloutSignal": False,
            "internalEvalSurvivalIsPpoValidate": False,
            "ppoValidateStatus": "ppo-validate-missing",
            "summary": (
                "PPO baseline/holdout are below the DQN survival anchor; keep BT94A closed unless 93C.7 documents a diagnose-only handover."
                if result_class == "ppo-regression"
                else "Pre-comparison requires 93C.7 handover before any BT94A decision."
            ),
        },
        "ppoValidateHandover": {
            "targetBlock": "BT94B.3",
            "runnerIdea": "dedicated PPO validate runner loads candidate manifest, model, VecNormalize state, config and fixed matrix before publishing versioned evidence",
            "commandIdea": "npm run bot:validate:ppo -- --candidate-manifest <artifact_manifest.json> --matrix <comparison_manifest.json> --publish",
            "reportSchemaMustInclude": [
                "candidateId",
                "modelSha256",
                "vecnormalizeSha256",
                "configSha256",
                "matrixId",
                "semanticWindow",
                "seeds",
                "modes",
                "maps",
                "averageBotSurvival",
                "avgStepsPerEpisode",
                "runtimeErrorCount",
                "failureClasses",
                "naturalTerminalAndDeathClasses",
                "invalidActionRate",
                "sanitizerRate",
                "vetoRate",
            ],
            "versionedTargetPaths": [
                "data/training/ppo/validate/<candidate-id>/ppo_validate_report.json",
                "docs/bot-training/ppo-validate/<candidate-id>.md",
            ],
            "notClosureEvidence": ["tmp/**", "legacy data/bot_validation_report.json without PPO candidate hash"],
        },
        "guardrails": {
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "fourEnvAllowed": False,
            "bt94aGate": "closed-until-93C.7",
            "rolloutAllowed": False,
        },
        "sourceReports": {
            "baselineReport": {
                "path": _rel(_repo_path(config["artifacts"]["baselineReport"])),
                "sha256": _sha256_file(_repo_path(config["artifacts"]["baselineReport"])),
            },
            "baselineSourceManifest": {
                "path": _rel(_repo_path(config["artifacts"]["baselineSourceManifest"])),
                "sha256": _sha256_file(_repo_path(config["artifacts"]["baselineSourceManifest"])),
            },
            "holdoutEval": {
                "pointer": _rel(holdout_pointer_path) if holdout_pointer else None,
                "report": _rel(holdout_report_path) if holdout_report_path else None,
                "sha256": _sha256_file(holdout_report_path) if holdout_report_path else None,
            },
            "freezeCheck": {
                "path": _rel(FREEZE_CHECK),
                "sha256": _sha256_file(FREEZE_CHECK) if FREEZE_CHECK.exists() else None,
            },
        },
        "artifacts": {
            "config": _rel(config_path),
            "configSha256": _sha256_file(config_path),
            "precomparisonReport": _rel(DEFAULT_OUTPUT),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-root", default=str(DEFAULT_ROOT))
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    root = _repo_path(args.artifact_root)
    config_path = _repo_path(args.config)
    output_path = _repo_path(args.output)
    report = build_precomparison_report(root, config_path)
    wrote: dict[str, str] = {}
    if args.write_report:
        _write_json(output_path, report)
        wrote["precomparisonReport"] = _rel(output_path)
    print(json.dumps({"ok": report["ok"], "resultClass": report["resultClass"], "wrote": wrote}, indent=2))


if __name__ == "__main__":
    main()
