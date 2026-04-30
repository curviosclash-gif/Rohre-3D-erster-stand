"""BT93RR.3 eval-mode counterprobe for BT93R-Reentry.

The counterprobe executes only the fix class pinned by BT93RR.2:
eval-mode stochastic sampling on the same matrix. It does not train, update
weights, consume holdout data, create candidates, or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import VecNormalize


PYTHON_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from scripts import bt93r_reentry_root_cause as rr2  # noqa: E402


OUTPUT_PATH = rr2.BT93R_REENTRY_ROOT / "bt93r_reentry_counterprobe_report.json"
ROOT_CAUSE_PATH = rr2.OUTPUT_PATH

GREEN_RESULT = "eval-mode-bug-fixed-counterprobe-green"
RED_RESULTS = {
    "policy-collapse-active",
    "policy-evidence-invalid",
    "normalize-mismatch",
    "model-artifact-missing",
    "measurement-invalid",
}
ALLOWED_RESULTS = {GREEN_RESULT, *RED_RESULTS}

BLOCKED_ACTIONS = [
    "BT93S claim before BT93R-Reentry.99 in R-Allowlist",
    "BT93O claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "reward/action/telemetry/safety fix during 93RR.3",
]


def _claim_flags() -> dict[str, bool]:
    return {
        "bt93sClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "newEvalRunStarted": True,
        "counterprobeOnly": True,
        "counterprobeFixClass": "eval-mode-counterprobe",
        "codeFixApplied": False,
        "rewardFixApplied": False,
        "actionFixApplied": False,
        "telemetryFixApplied": False,
        "safetyFixApplied": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "bt93sClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "qualityClaimAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "bt95HandoffSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
    }


def _seeds_from_contract(root_cause: Mapping[str, Any]) -> tuple[int, ...]:
    contract = root_cause.get("counterprobeContract") if isinstance(root_cause.get("counterprobeContract"), Mapping) else {}
    required = contract.get("requiredEvalSeeds") if isinstance(contract.get("requiredEvalSeeds"), list) else [944, 945, 946]
    controls = contract.get("additionalControlSeeds") if isinstance(contract.get("additionalControlSeeds"), list) else [947]
    seeds: list[int] = []
    for seed in [*required, *controls]:
        try:
            seed_int = int(seed)
        except (TypeError, ValueError):
            continue
        if seed_int not in seeds:
            seeds.append(seed_int)
    return tuple(seeds or (944, 945, 946, 947))


def _steps_per_seed(root_cause: Mapping[str, Any], requested_steps: int | None, seed_count: int) -> int:
    contract = root_cause.get("counterprobeContract") if isinstance(root_cause.get("counterprobeContract"), Mapping) else {}
    try:
        max_timesteps = int(contract.get("maxDiagnosticTimesteps") or 1000)
    except (TypeError, ValueError):
        max_timesteps = 1000
    if requested_steps is not None:
        return max(1, min(int(requested_steps), max(1, max_timesteps // max(1, seed_count))))
    return max(1, max_timesteps // max(1, seed_count))


def _max_streak(action_sequence: Sequence[int], actions: Sequence[str]) -> dict[str, Any]:
    max_action: int | None = None
    max_length = 0
    current_action: int | None = None
    current_length = 0
    for token in action_sequence:
        if token == current_action:
            current_length += 1
        else:
            current_action = token
            current_length = 1
        if current_length > max_length:
            max_length = current_length
            max_action = token
    return {
        "maxLength": int(max_length),
        "semanticAction": rr2._action_name(max_action, actions),
        "token": max_action,
        "shareOfProbe": rr2._round(max_length / max(1, len(action_sequence))),
    }


def _run_eval_mode_counterprobe(
    *,
    model: PPO,
    seeds: Sequence[int],
    steps_per_seed: int,
    max_steps: int,
    reward_profile_id: str,
) -> dict[str, Any]:
    actions = rr2._semantic_names()
    seed_reports: list[dict[str, Any]] = []

    for seed in seeds:
        vec_env: VecNormalize | None = None
        action_counts: Counter[str] = Counter()
        action_sequence: list[int] = []
        snapshots: list[dict[str, Any]] = []
        error: str | None = None
        try:
            vec_env, metric_env = rr2._build_vec_env(
                seed=int(seed),
                label=f"rr3-eval-mode-counterprobe-{seed}",
                max_steps=max_steps,
                reward_profile_id=reward_profile_id,
                training=False,
                vecnormalize_source=rr2.VECNORMALIZE_PATH,
            )
            model.set_env(vec_env, force_reset=False)
            obs = vec_env.reset()
            for step_index in range(int(steps_per_seed)):
                before = rr2._distribution_snapshot(model, obs)
                raw_probs = before.pop("_rawProbs")
                before.pop("_rawValue", None)
                action, _state = model.predict(obs, deterministic=False)
                token = int(np.asarray(action).reshape(-1)[0])
                action_counts[str(token)] += 1
                action_sequence.append(token)
                if len(snapshots) < 8:
                    snapshots.append(
                        {
                            "stepIndex": step_index,
                            "selectedActionToken": token,
                            "selectedAction": actions[token] if 0 <= token < len(actions) else f"unknown-{token}",
                            "selectedActionProbability": rr2._round(raw_probs[token]) if 0 <= token < len(raw_probs) else None,
                            **before,
                        }
                    )
                next_obs, _rewards, _dones, _infos = vec_env.step(action)
                obs = next_obs
            summary = rr2._compact_summary(metric_env.summary())
        except Exception as exc:  # pragma: no cover - diagnostic report path
            error = f"{exc.__class__.__name__}: {exc}"
            summary = {}
        finally:
            if vec_env is not None:
                vec_env.close()

        distribution = rr2._distribution(action_counts, actions)
        seed_reports.append(
            {
                "seed": int(seed),
                "modeId": "eval-mode-counterprobe",
                "deterministicPolicyPredict": False,
                "vecNormalizeTraining": False,
                "requestedSteps": int(steps_per_seed),
                "error": error,
                "summary": summary,
                "actionDistribution": distribution,
                "repeatedActionStreak": _max_streak(action_sequence, actions),
                "distributionSnapshots": snapshots,
            }
        )

    combined_summary = rr2._combine_eval_summaries(
        [report["summary"] for report in seed_reports if isinstance(report.get("summary"), Mapping)]
    )
    combined_counts: Counter[str] = Counter()
    for report in seed_reports:
        counts = report.get("actionDistribution", {}).get("counts") if isinstance(report.get("actionDistribution"), Mapping) else {}
        for token, count in (counts or {}).items():
            combined_counts[str(token)] += int(count)

    return {
        "modeId": "eval-mode-counterprobe",
        "deterministicPolicyPredict": False,
        "vecNormalizeTraining": False,
        "stepsPerSeed": int(steps_per_seed),
        "seedReports": seed_reports,
        "combinedSummary": combined_summary,
        "combinedActionDistribution": rr2._distribution(combined_counts, actions),
        "maxSeedTopActionShare": max(
            (rr2._number(report.get("actionDistribution", {}).get("argmaxShare")) for report in seed_reports),
            default=0.0,
        ),
        "maxRepeatedActionStreak": max(
            (int(report.get("repeatedActionStreak", {}).get("maxLength") or 0) for report in seed_reports),
            default=0,
        ),
        "runtimeErrorCount": int(combined_summary.get("runtimeErrorCount") or 0),
        "errors": [report["error"] for report in seed_reports if report.get("error")],
    }


def _source_artifacts(root_cause_path: Path) -> list[dict[str, Any]]:
    source_paths = {
        "bt93rrRootCause": (root_cause_path, "BT93RR.2 root-cause report"),
        **rr2.SOURCE_PATHS,
    }
    tracked = rr2._tracked_files(path for path, _role in source_paths.values())
    return [rr2._source_artifact(key, path, role, tracked) for key, (path, role) in source_paths.items()]


def _root_allows_counterprobe(root_cause: Mapping[str, Any]) -> bool:
    contract = root_cause.get("counterprobeContract") if isinstance(root_cause.get("counterprobeContract"), Mapping) else {}
    pinned = root_cause.get("rootCause") if isinstance(root_cause.get("rootCause"), Mapping) else {}
    return (
        root_cause.get("ok") is True
        and root_cause.get("resultClass") == "eval-argmax-collapse"
        and contract.get("allowed") is True
        and contract.get("fixClass") == "eval-mode-counterprobe"
        and pinned.get("counterprobeFixClass") == "eval-mode-counterprobe"
    )


def _green_criteria(mode: Mapping[str, Any], *, steps_per_seed: int, max_timesteps: int) -> dict[str, bool]:
    distribution = mode.get("combinedActionDistribution") if isinstance(mode.get("combinedActionDistribution"), Mapping) else {}
    second_best_share = rr2._number(distribution.get("secondBestShare"))
    argmax_share = rr2._number(distribution.get("argmaxShare"))
    max_seed_top = rr2._number(mode.get("maxSeedTopActionShare"))
    max_streak = int(mode.get("maxRepeatedActionStreak") or 0)
    runtime_errors = int(mode.get("runtimeErrorCount") or 0)
    diagnostic_steps = int(steps_per_seed) * len(mode.get("seedReports") or [])
    return {
        "diagnosticTimestepsWithinLimit": diagnostic_steps <= max_timesteps,
        "noFullSingleActionDominance": argmax_share < 1.0 and max_seed_top < 1.0,
        "repeatedActionStreakBelowProbeLength": max_streak < int(steps_per_seed),
        "no2700RepeatedActionStreak": max_streak < 2700,
        "secondBestProbabilityNonZero": second_best_share > 0.0,
        "runtimeErrorCountZero": runtime_errors == 0,
        "noCounterprobeRuntimeErrors": not bool(mode.get("errors")),
    }


def _death_before60(mode: Mapping[str, Any]) -> dict[str, Any]:
    summary = mode.get("combinedSummary") if isinstance(mode.get("combinedSummary"), Mapping) else {}
    return {
        "measured": "deathBefore60Count" in summary,
        "deathBefore60Count": summary.get("deathBefore60Count"),
        "playerDeadShare": summary.get("playerDeadShare"),
        "avgStepsPerEpisode": summary.get("avgStepsPerEpisode"),
        "usedAsSuccessCriterion": False,
        "interpretation": "DeathBefore60 is measured for continuity only; 93RR.3 success is limited to eval-mode collapse counterprobe criteria.",
    }


def _phase_coverage(report: Mapping[str, Any]) -> dict[str, bool]:
    criteria = report.get("greenCriteria") if isinstance(report.get("greenCriteria"), Mapping) else {}
    death_before60 = report.get("deathBefore60") if isinstance(report.get("deathBefore60"), Mapping) else {}
    counterprobe_contract = report.get("counterprobeContract") if isinstance(report.get("counterprobeContract"), Mapping) else {}
    mode = report.get("counterprobeMode") if isinstance(report.get("counterprobeMode"), Mapping) else {}
    return {
        "93RR.3.1": counterprobe_contract.get("fixClass") == "eval-mode-counterprobe"
        and mode.get("modeId") == "eval-mode-counterprobe"
        and report.get("guardrails", {}).get("rewardFixApplied") is False
        and report.get("guardrails", {}).get("actionFixApplied") is False
        and report.get("guardrails", {}).get("telemetryFixApplied") is False,
        "93RR.3.2": all(
            key in criteria
            for key in (
                "noFullSingleActionDominance",
                "repeatedActionStreakBelowProbeLength",
                "no2700RepeatedActionStreak",
                "secondBestProbabilityNonZero",
                "runtimeErrorCountZero",
            )
        ),
        "93RR.3.3": death_before60.get("measured") is True and death_before60.get("usedAsSuccessCriterion") is False,
        "93RR.3.4": report.get("resultClass") in ALLOWED_RESULTS,
        "DoD.RR4": counterprobe_contract.get("sameMatrixRequired") is True
        and set(counterprobe_contract.get("evalSeeds") or ()) >= {944, 945, 946, 947}
        and counterprobe_contract.get("maxDiagnosticTimesteps") == 1000
        and report.get("guardrails", {}).get("qualityClaimAllowed") is False,
    }


def build_report(*, steps_per_seed: int | None = None) -> dict[str, Any]:
    started = time.perf_counter()
    root_cause = rr2._read_json(ROOT_CAUSE_PATH)
    config = rr2._read_json(rr2.CONFIG_PATH)
    seeds = _seeds_from_contract(root_cause)
    steps = _steps_per_seed(root_cause, steps_per_seed, len(seeds))
    max_steps = int(config.get("runContract", {}).get("maxStepsPerEpisode") or 180)
    reward_profile_id = str(config.get("rewardProfileId") or "bt93n-wall-trail-stability-v1")
    max_diagnostic_timesteps = 1000
    root_allows = _root_allows_counterprobe(root_cause)

    mode: dict[str, Any] = {}
    model_error: str | None = None
    vec_env: VecNormalize | None = None
    model: PPO | None = None
    try:
        vec_env, _metric_env = rr2._build_vec_env(
            seed=seeds[0],
            label="rr3-loader",
            max_steps=max_steps,
            reward_profile_id=reward_profile_id,
            training=False,
            vecnormalize_source=rr2.VECNORMALIZE_PATH,
        )
        model = PPO.load(str(rr2.MODEL_PATH), env=vec_env, device="cpu", force_reset=False)
    except Exception as exc:  # pragma: no cover - diagnostic report path
        model_error = f"{exc.__class__.__name__}: {exc}"
    finally:
        if vec_env is not None:
            vec_env.close()

    if model is not None and root_allows:
        mode = _run_eval_mode_counterprobe(
            model=model,
            seeds=seeds,
            steps_per_seed=steps,
            max_steps=max_steps,
            reward_profile_id=reward_profile_id,
        )

    criteria = _green_criteria(mode, steps_per_seed=steps, max_timesteps=max_diagnostic_timesteps) if mode else {}
    criteria_green = bool(criteria) and all(criteria.values())
    measurement_valid = bool(mode) and int(mode.get("runtimeErrorCount") or 0) == 0 and not mode.get("errors")
    if not root_allows:
        result_class = "policy-evidence-invalid"
    elif model is None:
        result_class = "model-artifact-missing"
    elif not measurement_valid:
        result_class = "measurement-invalid"
    elif criteria_green:
        result_class = GREEN_RESULT
    else:
        result_class = "policy-collapse-active"

    source_artifacts = _source_artifacts(ROOT_CAUSE_PATH)
    report: dict[str, Any] = {
        "schemaVersion": "bt93rr-reentry-counterprobe-report-v1",
        "ok": False,
        "generatedAt": rr2._utc_now(),
        "generatedBy": "python/scripts/bt93r_reentry_counterprobe.py",
        "blockId": "BT93RR",
        "phaseId": "93RR.3",
        "resultClass": result_class,
        "git": {
            "branch": rr2._git_output(["git", "branch", "--show-current"]),
            "sha": rr2._git_output(["git", "rev-parse", "HEAD"]),
        },
        "elapsedMs": rr2._round((time.perf_counter() - started) * 1000.0, 4),
        "lineage": {
            "lineageId": config.get("lineageId"),
            "lineageKind": config.get("lineageKind"),
            "notBt93nLineage": config.get("lineageKind") == "new-retrain-lineage-not-bt93n",
            "matrixId": config.get("matrixId"),
            "matrixHash": config.get("matrixHash"),
            "rewardProfileId": reward_profile_id,
            "semanticWindow": config.get("semanticWindow"),
            "actionSurfaceId": rr2._read_json(rr2.ARTIFACT_PROBE_PATH).get("actionSurface", {}).get("surfaceId"),
        },
        "counterprobeContract": {
            "phase": "93RR.3",
            "rootCauseSource": rr2._rel(ROOT_CAUSE_PATH),
            "rootCauseResultClass": root_cause.get("resultClass"),
            "rootAllowsCounterprobe": root_allows,
            "fixClass": "eval-mode-counterprobe",
            "sameMatrixRequired": True,
            "evalSeeds": list(seeds),
            "stepsPerSeed": steps,
            "maxDiagnosticTimesteps": max_diagnostic_timesteps,
            "qualityClaimAllowed": False,
            "noRewardActionTelemetryBundle": True,
        },
        "counterprobeMode": mode,
        "greenCriteria": criteria,
        "deathBefore60": _death_before60(mode) if mode else {"measured": False, "usedAsSuccessCriterion": False},
        "modelLoadError": model_error,
        "phaseCoverage": {},
        "guardrails": _guardrails(),
        "claimFlags": _claim_flags(),
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "newEvalEpisodes": int(mode.get("combinedSummary", {}).get("completedEpisodes") or 0) if mode else 0,
            "holdoutEpisodes": 0,
            "diagnosticSteps": steps * len(seeds) if mode else 0,
            "perMode": {
                "eval-mode-counterprobe": {
                    "steps": int(mode.get("combinedSummary", {}).get("totalSteps") or 0) if mode else 0,
                    "completedEpisodes": int(mode.get("combinedSummary", {}).get("completedEpisodes") or 0) if mode else 0,
                }
            },
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": all(source["exists"] and source["isFile"] for source in source_artifacts),
        "allowNext": ["93RR.99 closure gate"],
        "opensNext": ["93RR.99"],
        "blocksNext": BLOCKED_ACTIONS,
        "summary": {
            "finalResult": result_class,
            "rootCause": root_cause.get("resultClass"),
            "counterprobeFixClass": "eval-mode-counterprobe",
            "criteriaGreen": criteria_green,
            "nextBestAction": (
                "Run 93RR.99 closure gate; only closure may decide whether BT93S opens."
                if result_class == GREEN_RESULT
                else "Run 93RR.99 closure gate as red/invalid; BT93S stays closed unless closure reaches R-Allowlist."
            ),
            "bt93sStartDecision": "blocked until BT93R-Reentry.99 in R-Allowlist",
            "bt93oStartDecision": "blocked",
            "bt93pStartDecision": "blocked",
            "bt94aStartDecision": "blocked",
        },
        "commands": {
            "write": "python python/scripts/bt93r_reentry_counterprobe.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    coverage = _phase_coverage(report)
    report["phaseCoverage"] = coverage
    report["ok"] = bool(report["sourceFilesReady"] and measurement_valid and all(coverage.values()))
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--steps-per-seed", type=int, default=None)
    args = parser.parse_args()

    report = build_report(steps_per_seed=args.steps_per_seed)
    if args.write_report:
        rr2._write_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "greenCriteria": report["greenCriteria"],
                "phaseCoverage": report["phaseCoverage"],
                "output": rr2._rel(args.output.resolve()),
                "opensNext": report["opensNext"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
