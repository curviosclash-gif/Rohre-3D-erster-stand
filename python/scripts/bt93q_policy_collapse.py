"""BT93Q.3 deterministic-policy-collapse diagnosis.

This report is diagnostic-only. It separates stochastic-train and
deterministic-eval action distributions from existing BT93N evidence and uses
an explicit empirical logit proxy because BT93N did not persist a model package.
"""

from __future__ import annotations

import argparse
import ast
import json
import math
import subprocess
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"
REPORT_PATH = BT93Q_ROOT / "policy_collapse_report.json"

SOURCE_PATHS = {
    "bt93nMicroPpoRepeat": PPO_ROOT / "bt93n" / "micro_ppo_repeat_report.json",
    "bt93qTraceReanalysis": BT93Q_ROOT / "trace_reanalysis_report.json",
    "bt93qPlayerDeadControl": BT93Q_ROOT / "player_dead_control_report.json",
    "bt93qObservationTelemetryGap": BT93Q_ROOT / "observation_telemetry_gap_report.json",
    "ppoActionSurface": REPO_ROOT / "python" / "envs" / "ppo_action_surface.py",
}

BLOCKED_ACTIONS = [
    "BT93O claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate or BT95 handoff signal",
    "50k/100k/200k extension",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(args: list[str]) -> list[str]:
    output = _git_output(args)
    return [line.strip().replace("\\", "/") for line in output.splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
    return set(_git_lines(["git", "ls-files", "--", *[path for path in rel_paths if path]]))


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any) -> float:
    return round(_number(value), 6)


def _source(path: Path, role: str, tracked_files: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked_files,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _source_artifacts() -> dict[str, Any]:
    roles = {
        "bt93nMicroPpoRepeat": "BT93N stochastic-train and deterministic-eval source",
        "bt93qTraceReanalysis": "BT93Q.2 trace reanalysis context",
        "bt93qPlayerDeadControl": "BT93Q.2 player-dead control separation",
        "bt93qObservationTelemetryGap": "BT93Q.2 telemetry-gap decision",
        "ppoActionSurface": "current masked semantic action surface",
    }
    tracked = _tracked_files(SOURCE_PATHS.values())
    return {key: _source(path, roles[key], tracked) for key, path in SOURCE_PATHS.items()}


def _semantic_actions(path: Path) -> list[str]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (OSError, SyntaxError):
        return []
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(target, ast.Name) and target.id == "MASKED_SEMANTIC_ACTIONS" for target in node.targets):
            continue
        try:
            actions = ast.literal_eval(node.value)
        except (ValueError, SyntaxError):
            return []
        return [str(item[0]) for item in actions if isinstance(item, tuple) and item]
    return []


def _action_name(token: str | int, actions: list[str]) -> str:
    try:
        index = int(token)
    except (TypeError, ValueError):
        return str(token)
    return actions[index] if 0 <= index < len(actions) else f"token-{index}"


def _distribution(action_counts: Mapping[str, Any], actions: list[str]) -> dict[str, Any]:
    counts = {str(token): int(value) for token, value in action_counts.items()}
    total = sum(counts.values())
    probabilities = {
        str(token): (count / total if total else 0.0)
        for token, count in sorted(counts.items(), key=lambda item: int(item[0]))
    }
    entropy = -sum(probability * math.log(probability) for probability in probabilities.values() if probability > 0)
    max_entropy = math.log(max(1, len(actions)))
    ranked = sorted(counts.items(), key=lambda item: (-item[1], int(item[0])))
    top = ranked[0] if ranked else (None, 0)
    second = ranked[1] if len(ranked) > 1 else (None, 0)
    return {
        "counts": counts,
        "total": total,
        "probabilities": {token: _round(value) for token, value in probabilities.items()},
        "entropy": _round(entropy),
        "normalizedEntropy": _round(entropy / max_entropy if max_entropy else 0.0),
        "argmaxToken": top[0],
        "argmaxAction": _action_name(top[0], actions) if top[0] is not None else None,
        "argmaxCount": top[1],
        "argmaxShare": _round(top[1] / total if total else 0.0),
        "secondBestToken": second[0],
        "secondBestAction": _action_name(second[0], actions) if second[0] is not None else None,
        "secondBestCount": second[1],
        "secondBestShare": _round(second[1] / total if total else 0.0),
        "marginShare": _round((top[1] - second[1]) / total if total else 0.0),
        "rankedActions": [
            {
                "token": token,
                "semanticAction": _action_name(token, actions),
                "count": count,
                "share": _round(count / total if total else 0.0),
            }
            for token, count in ranked
        ],
    }


def _combined_eval_counts(seed_summaries: list[Mapping[str, Any]]) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for summary in seed_summaries:
        action_counts = summary.get("actionCounts")
        if not isinstance(action_counts, Mapping):
            continue
        for token, value in action_counts.items():
            counts[str(token)] += int(value)
    return dict(sorted(counts.items(), key=lambda item: int(item[0])))


def _seed_eval_distributions(seed_summaries: list[Mapping[str, Any]], actions: list[str]) -> list[dict[str, Any]]:
    result = []
    for summary in seed_summaries:
        action_counts = summary.get("actionCounts") if isinstance(summary.get("actionCounts"), Mapping) else {}
        distribution = _distribution(action_counts, actions)
        result.append(
            {
                "label": summary.get("label"),
                "completedEpisodes": summary.get("completedEpisodes"),
                "deathBefore60Count": summary.get("deathBefore60Count"),
                "avgStepsPerEpisode": summary.get("avgStepsPerEpisode"),
                "distribution": distribution,
                "repeatedActionStreakLowerBound": distribution["total"] if len(distribution["counts"]) == 1 else None,
            }
        )
    return result


def _last_logger_entropy(ppo_metrics: Mapping[str, Any], action_count: int) -> dict[str, Any]:
    snapshots = ppo_metrics.get("loggerSnapshots")
    if not isinstance(snapshots, list) or not snapshots:
        return {
            "available": False,
            "source": "missing SB3 logger snapshots",
            "entropy": None,
            "normalizedEntropy": None,
        }
    last = snapshots[-1] if isinstance(snapshots[-1], Mapping) else {}
    entropy = -_number(last.get("train/entropy_loss"))
    max_entropy = math.log(max(1, action_count))
    return {
        "available": True,
        "source": "stable_baselines3 logger train/entropy_loss from last rollout snapshot",
        "entropy": _round(entropy),
        "normalizedEntropy": _round(entropy / max_entropy if max_entropy else 0.0),
        "rawEntropyLoss": last.get("train/entropy_loss"),
        "nUpdates": last.get("train/n_updates"),
    }


def _empirical_logit_proxy(action_counts: Mapping[str, Any], actions: list[str], *, alpha: float = 1.0) -> dict[str, Any]:
    counts = {str(token): int(value) for token, value in action_counts.items()}
    for index in range(len(actions)):
        counts.setdefault(str(index), 0)
    smoothed = {token: count + alpha for token, count in counts.items()}
    logits = {token: math.log(value) for token, value in smoothed.items()}
    ranked = sorted(logits.items(), key=lambda item: (-item[1], int(item[0])))
    top = ranked[0]
    second = ranked[1]
    return {
        "snapshotKind": "empirical-count-logit-proxy",
        "realModelLogitsAvailable": False,
        "alpha": alpha,
        "logits": {token: _round(value) for token, value in sorted(logits.items(), key=lambda item: int(item[0]))},
        "argmaxToken": top[0],
        "argmaxAction": _action_name(top[0], actions),
        "secondBestToken": second[0],
        "secondBestAction": _action_name(second[0], actions),
        "margin": _round(top[1] - second[1]),
        "limitation": "BT93N did not persist a model package; this proxy uses eval action counts with Laplace smoothing.",
    }


def _softmax_from_logits(logits: Mapping[str, Any], temperature: float) -> dict[str, Any]:
    scaled = {token: _number(value) / max(temperature, 1e-9) for token, value in logits.items()}
    max_logit = max(scaled.values(), default=0.0)
    weights = {token: math.exp(value - max_logit) for token, value in scaled.items()}
    total = sum(weights.values())
    probabilities = {token: (weight / total if total else 0.0) for token, weight in weights.items()}
    ranked = sorted(probabilities.items(), key=lambda item: (-item[1], int(item[0])))
    return {
        "temperature": temperature,
        "probabilities": {token: _round(value) for token, value in sorted(probabilities.items(), key=lambda item: int(item[0]))},
        "argmaxToken": ranked[0][0],
        "argmaxShare": _round(ranked[0][1]),
        "secondBestToken": ranked[1][0],
        "secondBestShare": _round(ranked[1][1]),
        "marginShare": _round(ranked[0][1] - ranked[1][1]),
    }


def _phase_coverage(report: Mapping[str, Any]) -> dict[str, bool]:
    snapshot = report.get("entropyLogitSnapshot") if isinstance(report.get("entropyLogitSnapshot"), Mapping) else {}
    empirical = snapshot.get("empiricalLogitProxy") if isinstance(snapshot.get("empiricalLogitProxy"), Mapping) else {}
    deterministic = report.get("deterministicEval") if isinstance(report.get("deterministicEval"), Mapping) else {}
    stochastic = report.get("stochasticTrain") if isinstance(report.get("stochasticTrain"), Mapping) else {}
    separation = report.get("modeSeparation") if isinstance(report.get("modeSeparation"), Mapping) else {}
    return {
        "93Q.3.1": bool(stochastic.get("distribution"))
        and bool(deterministic.get("combinedDistribution"))
        and bool(report.get("temperatureTop2Diagnosis"))
        and report.get("qualityClaimAllowed") is False,
        "93Q.3.2": bool(report.get("actionDistribution"))
        and bool(report.get("repeatedActionStreaks"))
        and empirical.get("argmaxAction") is not None
        and empirical.get("secondBestAction") is not None
        and "margin" in empirical
        and bool(report.get("scenarioContext")),
        "93Q.3.3": report.get("resultClass") == "policy-collapse-active"
        and _number(deterministic.get("singleActionEvalShare")) >= 1.0
        and report.get("microPpoRecheckAllowed") is False,
        "93Q.3.4": separation.get("stochasticTrainAndDeterministicEvalSeparated") is True
        and separation.get("gateEvidenceMode") == "deterministic-eval-remains-blocking",
    }


def build_report() -> dict[str, Any]:
    micro = _read_json(SOURCE_PATHS["bt93nMicroPpoRepeat"])
    trace = _read_json(SOURCE_PATHS["bt93qTraceReanalysis"])
    player_dead = _read_json(SOURCE_PATHS["bt93qPlayerDeadControl"])
    telemetry = _read_json(SOURCE_PATHS["bt93qObservationTelemetryGap"])
    actions = _semantic_actions(SOURCE_PATHS["ppoActionSurface"])
    train_counts = micro.get("trainSummary", {}).get("actionCounts") if isinstance(micro.get("trainSummary"), Mapping) else {}
    train_counts = train_counts if isinstance(train_counts, Mapping) else {}
    seed_summaries = micro.get("evalSummary", {}).get("seedSummaries") if isinstance(micro.get("evalSummary"), Mapping) else []
    seed_summaries = [summary for summary in seed_summaries if isinstance(summary, Mapping)] if isinstance(seed_summaries, list) else []
    eval_counts = _combined_eval_counts(seed_summaries)
    train_distribution = _distribution(train_counts, actions)
    eval_distribution = _distribution(eval_counts, actions)
    eval_seed_distributions = _seed_eval_distributions(seed_summaries, actions)
    logger_entropy = _last_logger_entropy(micro.get("ppoMetrics", {}) if isinstance(micro.get("ppoMetrics"), Mapping) else {}, len(actions))
    empirical_proxy = _empirical_logit_proxy(eval_counts, actions)
    temperature_diagnostics = [
        {
            **_softmax_from_logits(empirical_proxy["logits"], temperature),
            "argmaxAction": _action_name(_softmax_from_logits(empirical_proxy["logits"], temperature)["argmaxToken"], actions),
            "secondBestAction": _action_name(_softmax_from_logits(empirical_proxy["logits"], temperature)["secondBestToken"], actions),
        }
        for temperature in (1.0, 2.0, 5.0)
    ]
    single_action_eval = len(eval_counts) == 1 and eval_distribution["argmaxAction"] == "yaw-right"
    result_class = "policy-collapse-active" if single_action_eval else "policy-collapse-not-proven"
    source_artifacts = _source_artifacts()
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    report: dict[str, Any] = {
        "schemaVersion": "bt93q-policy-collapse-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_policy_collapse.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93Q",
        "phaseId": "93Q.3",
        "resultClass": result_class,
        "qualityClaimAllowed": False,
        "microPpoRecheckAllowed": False if result_class == "policy-collapse-active" else None,
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "policyIds": micro.get("policyIds"),
        "actionSurface": {
            "path": _rel(SOURCE_PATHS["ppoActionSurface"]),
            "semanticActions": actions,
            "actionCount": len(actions),
        },
        "stochasticTrain": {
            "source": "BT93N micro_ppo_repeat_report.trainSummary.actionCounts",
            "distribution": train_distribution,
            "entropyInterpretation": "Stochastic train remains multi-action and is not used as quality evidence.",
        },
        "deterministicEval": {
            "source": "BT93N micro_ppo_repeat_report.evalSummary.seedSummaries[].actionCounts",
            "combinedDistribution": eval_distribution,
            "seedDistributions": eval_seed_distributions,
            "singleActionEvalShare": _round(1.0 if single_action_eval else eval_distribution.get("argmaxShare")),
            "dominantAction": eval_distribution.get("argmaxAction"),
            "deterministicYawRightDominates": bool(single_action_eval),
        },
        "actionDistribution": {
            "stochasticTrain": train_distribution,
            "deterministicEval": eval_distribution,
        },
        "repeatedActionStreaks": {
            "deterministicEvalSeedLowerBounds": [
                {
                    "label": item["label"],
                    "semanticAction": item["distribution"]["argmaxAction"],
                    "lowerBound": item["repeatedActionStreakLowerBound"],
                }
                for item in eval_seed_distributions
            ],
            "combinedEvalLowerBound": eval_distribution["total"] if single_action_eval else None,
        },
        "entropyLogitSnapshot": {
            "modelLoggerEntropy": logger_entropy,
            "empiricalLogitProxy": empirical_proxy,
            "realModelLogitsAvailable": False,
            "modelPackagePersistedInBT93N": False,
        },
        "temperatureTop2Diagnosis": {
            "source": "empirical-count-logit-proxy from deterministic eval counts",
            "diagnostics": temperature_diagnostics,
            "top2Conclusion": (
                "Temperature softening exposes alternate actions only as a diagnostic proxy; "
                "deterministic gate evidence remains yaw-right collapsed."
            ),
        },
        "scenarioContext": {
            "traceReanalysisResultClass": trace.get("resultClass"),
            "traceSampleCounts": trace.get("sampleCounts"),
            "playerDeadControlResultClass": player_dead.get("resultClass"),
            "latePlayerDeadControlCount": player_dead.get("latePlayerDeadControlCount"),
            "observationTelemetryResultClass": telemetry.get("resultClass"),
            "requiredTelemetryFieldGroups": (telemetry.get("nextDiagnosisTelemetryDecision") or {}).get("requiredFieldGroups")
            if isinstance(telemetry.get("nextDiagnosisTelemetryDecision"), Mapping)
            else None,
        },
        "modeSeparation": {
            "stochasticTrainAndDeterministicEvalSeparated": True,
            "evalModeArtifactOnly": False,
            "gateEvidenceMode": "deterministic-eval-remains-blocking",
            "judgement": "Stochastic train distribution is broad, but deterministic eval is single-action yaw-right on every eval seed.",
        },
        "decision": {
            "resultClass": result_class,
            "blocksNext": [
                "93Q.6 10k micro-PPO recheck",
                *BLOCKED_ACTIONS,
            ],
            "opensNext": ["93Q.4 wall/trail action-effect stress matrix"],
            "nextAllowedActions": [
                "continue with 93Q.4 stress matrix without quality claim",
                "do not start 93Q.6 until policy collapse is fixed or explicitly explained by later evidence",
            ],
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "fixApplied": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "rolloutAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93q_policy_collapse.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    coverage = _phase_coverage(report)
    report["phaseCoverage"] = coverage
    report["ok"] = bool(source_files_ready and source_files_versioned and all(coverage.values()))
    return report


def main() -> int:
    global BT93Q_ROOT, REPORT_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93Q_ROOT)
    args = parser.parse_args()

    BT93Q_ROOT = args.output_root.resolve()
    REPORT_PATH = BT93Q_ROOT / "policy_collapse_report.json"

    report = build_report()
    if args.write_report:
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "dominantAction": report["deterministicEval"]["dominantAction"],
                "outputs": {"policyCollapse": _rel(REPORT_PATH)},
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
