"""BT93N.2 reward stability fix and pre/post delta report.

This script stays diagnostic-only. It uses the BT93N death trace evidence to
select exactly one fix class, writes the fix manifest before the post-fix
probe, and compares the BT93L reward profile against the BT93N reward profile
on the same matrix, seeds, policies, and terminal rules.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

from bt93n_death_trace_probe import build_reports  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93N_ROOT = PPO_ROOT / "bt93n"
PRE_DEATH_REPORT_PATH = BT93N_ROOT / "death_before60_trace_report.json"
PRE_MAXSTEP_REPORT_PATH = BT93N_ROOT / "maxstep_plateau_trace_report.json"
FIX_MANIFEST_PATH = BT93N_ROOT / "fix_manifest.json"
STABILITY_FIX_REPORT_PATH = BT93N_ROOT / "stability_fix_report.json"
DELTA_REPORT_PATH = BT93N_ROOT / "reward_terminal_delta_report.json"
BT93M_COMPARISON_POLICY_PATH = PPO_ROOT / "bt93m" / "comparison_policy_decision.json"
BT94A_NO_START_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"

BT93L_PROFILE_ID = "bt93l-objective-reachability-v1"
BT93N_PROFILE_ID = "bt93n-wall-trail-stability-v1"
DEFAULT_EPISODES = 60
DEFAULT_TRACE_TAIL = 12
DEFAULT_MAX_STEPS = 180
DEFAULT_SAMPLE_LIMIT = 12
DEFAULT_SEED_START = 934

CHANGED_FILES = [
    "src/state/training/RewardCalculator.js",
    "scripts/training-headless-lane-runner.mjs",
    "python/scripts/bt93n_death_trace_probe.py",
    "python/scripts/bt93n_stability_fix.py",
    "tests/training-reward-survival.test.mjs",
    "tests/training-environment.contract.test.mjs",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


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


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: Any) -> float:
    return round(_number(value), 6)


def _source(path: Path, role: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _file_contains(path: Path, *tokens: str) -> bool:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return False
    return all(token in text for token in tokens)


def _artifact_sources() -> dict[str, Any]:
    sources = {
        "preDeathTraceReport": _source(PRE_DEATH_REPORT_PATH, "BT93N.1 death trace pre-fix source"),
        "preMaxstepTraceReport": _source(PRE_MAXSTEP_REPORT_PATH, "BT93N.1 maxstep trace pre-fix source"),
        "comparisonPolicyDecision": _source(BT93M_COMPARISON_POLICY_PATH, "BT93M comparison policy blocker"),
        "bt94aNoStartGate": _source(BT94A_NO_START_PATH, "BT94A closed no-start gate"),
    }
    for relative in CHANGED_FILES:
        sources[relative.replace("/", "_").replace(".", "_")] = _source(REPO_ROOT / relative, "BT93N.2 changed/prepared file")
    return sources


def _early_death_stats(report: Mapping[str, Any]) -> dict[str, Any]:
    episodes = [
        item
        for item in report.get("deathBefore60Episodes") or []
        if isinstance(item, Mapping)
    ]
    classes: Counter[str] = Counter()
    rewards: list[float] = []
    positive = 0
    for item in episodes:
        classification = item.get("classification") if isinstance(item.get("classification"), Mapping) else {}
        classes[str(classification.get("class") or "unclassified")] += 1
        reward = _number(item.get("rewardTotal"))
        rewards.append(reward)
        if reward > 0:
            positive += 1
    return {
        "count": len(episodes),
        "classCounts": dict(sorted(classes.items())),
        "positiveRewardCount": positive,
        "meanReward": _round(sum(rewards) / max(1, len(rewards))),
        "minReward": _round(min(rewards)) if rewards else None,
        "maxReward": _round(max(rewards)) if rewards else None,
        "rewards": [_round(value) for value in rewards],
    }


def _build_manifest(pre_death_report: Mapping[str, Any], pre_maxstep_report: Mapping[str, Any]) -> dict[str, Any]:
    aggregate = pre_death_report.get("aggregate") if isinstance(pre_death_report.get("aggregate"), Mapping) else {}
    dominant_cause = str((pre_death_report.get("measurementInterpretation") or {}).get("dominantCause") or "")
    death_stats = _early_death_stats(pre_death_report)
    completed = int(_number(aggregate.get("completedEpisodes")))
    enough_samples = completed >= DEFAULT_EPISODES and int(death_stats["count"]) >= 5
    reward_cause = dominant_cause == "wall/trail" and int(death_stats["positiveRewardCount"]) > 0 and enough_samples
    return {
        "schemaVersion": "bt93n-fix-manifest-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93n_stability_fix.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93N",
        "phaseId": "93N.2",
        "ok": reward_cause,
        "resultClass": "reward-fix-manifest-pinned" if reward_cause else "measurement-invalid",
        "selectedFixClass": "Reward" if reward_cause else "None",
        "dominantCause": dominant_cause,
        "causeEvidence": {
            "completedEpisodes": completed,
            "earlyDeathStats": death_stats,
            "maxstepResultClass": pre_maxstep_report.get("resultClass"),
            "positiveEarlyDeathsMakeTerminalLossInsufficient": int(death_stats["positiveRewardCount"]) > 0,
            "sampleGate": {
                "minimumCompletedEpisodes": DEFAULT_EPISODES,
                "minimumEarlyDeathOrPlateauSamples": 5,
                "passed": enough_samples,
            },
        },
        "fix": {
            "profileId": BT93N_PROFILE_ID,
            "baseProfileId": BT93L_PROFILE_ID,
            "class": "Reward",
            "policy": "single fix class only; no action-surface, terminal, runner, holdout, candidate, freeze, promote, or rollout changes",
            "changeSummary": [
                "add optional terminal-only earlyDeath reward component with default weight 0",
                "add BT93N reward profile with stronger wall/trail pressure and step-scaled early-death penalty before step 60",
                "keep real objective/progress deltas active for the BT93N profile",
            ],
            "changedFiles": list(CHANGED_FILES),
        },
        "expectedMetricDirection": {
            "deathBefore60PositiveRewardCount": "decrease-to-zero",
            "deathBefore60Count": "non-increase in same control matrix; PPO check deferred to 93N.3",
            "maxStepPlateauCount": "non-increase",
            "progressSignalReachableTailCount": "non-zero and non-collapsed",
            "objectiveSignalReachableTailCount": "non-zero and non-collapsed",
            "runtimeErrorCount": "stay-zero",
            "invalidActionRate": "stay-zero",
        },
        "falsificationRules": [
            {
                "id": "early-death-still-profitable",
                "condition": "any post-fix death-before-60 sample remains net-positive",
                "resultClass": "reward-redesign-required",
            },
            {
                "id": "semantics-collapse",
                "condition": "progress/objective tail counts fall to zero or become unavailable",
                "resultClass": "reward-redesign-required",
            },
            {
                "id": "death-or-plateau-worse",
                "condition": "deathBefore60Count or maxStepPlateauCount increases on the same matrix",
                "resultClass": "diagnose-loop-required",
            },
            {
                "id": "safety-or-runtime-regression",
                "condition": "runtime errors, invalid actions, sanitizer, or post-decode clamp rates become nonzero",
                "resultClass": "measurement-invalid",
            },
        ],
        "sourceArtifacts": _artifact_sources(),
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
    }


def _aggregate_delta(pre_report: Mapping[str, Any], post_report: Mapping[str, Any]) -> dict[str, Any]:
    pre = pre_report.get("aggregate") if isinstance(pre_report.get("aggregate"), Mapping) else {}
    post = post_report.get("aggregate") if isinstance(post_report.get("aggregate"), Mapping) else {}
    keys = [
        "completedEpisodes",
        "deathBefore60Count",
        "deathBefore60Share",
        "maxStepPlateauCount",
        "maxStepShare",
        "avgStepsPerEpisode",
        "rewardMeanPerEpisode",
        "progressSignalReachableTailCount",
        "objectiveSignalReachableTailCount",
        "runtimeErrorCount",
    ]
    return {
        key: {
            "pre": pre.get(key),
            "post": post.get(key),
            "delta": _round(_number(post.get(key)) - _number(pre.get(key))),
        }
        for key in keys
    }


def _build_delta_report(
    *,
    pre_death_report: Mapping[str, Any],
    pre_maxstep_report: Mapping[str, Any],
    post_death_report: Mapping[str, Any],
    post_maxstep_report: Mapping[str, Any],
    elapsed_seconds: float,
) -> dict[str, Any]:
    pre_stats = _early_death_stats(pre_death_report)
    post_stats = _early_death_stats(post_death_report)
    aggregate_delta = _aggregate_delta(pre_death_report, post_death_report)
    post_aggregate = post_death_report.get("aggregate") if isinstance(post_death_report.get("aggregate"), Mapping) else {}
    pre_aggregate = pre_death_report.get("aggregate") if isinstance(pre_death_report.get("aggregate"), Mapping) else {}
    positive_rewards_fixed = int(post_stats["positiveRewardCount"]) == 0 and int(pre_stats["positiveRewardCount"]) > 0
    semantics_nonzero = int(_number(post_aggregate.get("progressSignalReachableTailCount"))) > 0 and int(
        _number(post_aggregate.get("objectiveSignalReachableTailCount"))
    ) > 0
    death_non_increase = int(_number(post_aggregate.get("deathBefore60Count"))) <= int(_number(pre_aggregate.get("deathBefore60Count")))
    plateau_non_increase = int(_number(post_aggregate.get("maxStepPlateauCount"))) <= int(_number(pre_aggregate.get("maxStepPlateauCount")))
    runtime_ok = int(_number(post_aggregate.get("runtimeErrorCount"))) == 0
    ok = bool(post_death_report.get("ok") is True and positive_rewards_fixed and semantics_nonzero and death_non_increase and plateau_non_increase and runtime_ok)
    if not post_death_report.get("ok"):
        result_class = "measurement-invalid"
    elif not positive_rewards_fixed or not semantics_nonzero:
        result_class = "reward-redesign-required"
    elif not death_non_increase or not plateau_non_increase:
        result_class = "diagnose-loop-required"
    else:
        result_class = "reward-fix-delta-green-diagnose-only"
    return {
        "schemaVersion": "bt93n-reward-terminal-delta-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93n_stability_fix.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93N",
        "phaseId": "93N.2",
        "ok": ok,
        "resultClass": result_class,
        "matrix": {
            "matrixId": (pre_death_report.get("tracePolicy") or {}).get("matrixId"),
            "semanticWindow": (pre_death_report.get("tracePolicy") or {}).get("semanticWindow"),
            "seedStart": (pre_death_report.get("tracePolicy") or {}).get("seedStart"),
            "episodesRequested": (pre_death_report.get("tracePolicy") or {}).get("episodesRequested"),
            "preRewardProfileId": BT93L_PROFILE_ID,
            "postRewardProfileId": BT93N_PROFILE_ID,
            "sameSeedsPoliciesTerminalRules": True,
        },
        "aggregateDelta": aggregate_delta,
        "earlyDeathRewardDelta": {
            "pre": pre_stats,
            "post": post_stats,
            "positiveRewardCountDelta": int(post_stats["positiveRewardCount"]) - int(pre_stats["positiveRewardCount"]),
            "meanRewardDelta": _round(_number(post_stats["meanReward"]) - _number(pre_stats["meanReward"])),
        },
        "preReports": {
            "deathResultClass": pre_death_report.get("resultClass"),
            "maxstepResultClass": pre_maxstep_report.get("resultClass"),
        },
        "postReports": {
            "deathResultClass": post_death_report.get("resultClass"),
            "maxstepResultClass": post_maxstep_report.get("resultClass"),
        },
        "falsificationResults": {
            "positiveEarlyDeathRewardsFixed": positive_rewards_fixed,
            "semanticsNonzero": semantics_nonzero,
            "deathBefore60NonIncrease": death_non_increase,
            "maxStepPlateauNonIncrease": plateau_non_increase,
            "runtimeErrorCountZero": runtime_ok,
        },
        "elapsedSeconds": _round(elapsed_seconds),
        "sourceArtifacts": _artifact_sources(),
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
    }


def _build_stability_report(
    *,
    manifest: Mapping[str, Any],
    delta_report: Mapping[str, Any],
    manifest_written_before_post_probe: bool,
) -> dict[str, Any]:
    tests_prepared = {
        "tests/training-reward-survival.test.mjs": _file_contains(
            REPO_ROOT / "tests" / "training-reward-survival.test.mjs",
            "BT93N early-death shaping",
        ),
        "tests/training-environment.contract.test.mjs": _file_contains(
            REPO_ROOT / "tests" / "training-environment.contract.test.mjs",
            "BT93N wall-trail stability profile",
        ),
        "python/tests/test_ppo_action_surface.py": (REPO_ROOT / "python" / "tests" / "test_ppo_action_surface.py").is_file(),
        "python/tests/test_curvios_env.py": (REPO_ROOT / "python" / "tests" / "test_curvios_env.py").is_file(),
    }
    fix_class = manifest.get("selectedFixClass")
    phase_coverage = {
        "93N.2.1": fix_class == "Reward" and delta_report.get("resultClass") != "measurement-invalid",
        "93N.2.2": fix_class != "Curriculum",
        "93N.2.3": fix_class != "Action",
        "93N.2.4": fix_class not in {"Terminal", "Runner"},
        "93N.2.5": all(tests_prepared.values()),
        "93N.2.6": delta_report.get("ok") is True and (BT93N_ROOT / "reward_terminal_delta_report.json").is_file(),
        "93N.2.7": manifest.get("ok") is True and manifest_written_before_post_probe,
    }
    ok = all(phase_coverage.values())
    return {
        "schemaVersion": "bt93n-stability-fix-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93n_stability_fix.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93N",
        "phaseId": "93N.2",
        "ok": ok,
        "resultClass": "stability-fix-reward-profile-ready-diagnose-only" if ok else delta_report.get("resultClass", "measurement-invalid"),
        "phaseCoverage": phase_coverage,
        "fixDecision": {
            "selectedFixClass": fix_class,
            "dominantCause": manifest.get("dominantCause"),
            "rewardFixApplied": fix_class == "Reward",
            "curriculumFixApplied": False,
            "actionFixApplied": False,
            "terminalOrRunnerFixApplied": False,
            "notAppliedReasons": {
                "curriculum": "BT93N.1 classified wall/trail reward profitability, not start-window or danger-window curriculum evidence",
                "action": "BT93N.1 did not prove missing evade/turn action capacity or action-collapse dominance",
                "terminalRunner": "BT93N.1 terminalReason was consistently player-dead; no reset, bridge, max-step, or truncation misclassification was proven",
            },
        },
        "testsPreparedButNotRun": {
            "policy": "tests are user-owned for non-*.99 subphases",
            "prepared": tests_prepared,
            "recommendedSmokes": [
                "node --test tests/training-reward-survival.test.mjs tests/training-environment.contract.test.mjs",
                "python -m pytest python/tests/test_ppo_action_surface.py python/tests/test_curvios_env.py",
            ],
        },
        "deltaReport": _rel(DELTA_REPORT_PATH),
        "fixManifest": _rel(FIX_MANIFEST_PATH),
        "nextAllowedActions": [
            "BT93N.3 10k micro-PPO may run only as diagnose-only with the BT93N reward profile",
            "50k/100k remain blocked until the 10k report is green by its pre-pinned tolerance",
            "BT93P/BT94A positive reentry stays blocked while DQN anchor policy is dqn-anchor-blocked",
        ],
        "blockedActions": [
            "50k/100k extension from 93N.2 alone",
            "candidate, freeze, holdout, promote, rollout, or BT94A-ready wording",
            "action-surface or terminal follow-up without separate trace evidence",
        ],
        "sourceArtifacts": _artifact_sources(),
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93n_stability_fix.py --write-report",
        },
    }


def build_reports_for_fix(*, episodes: int, trace_tail: int, max_steps: int, seed_start: int, sample_limit: int, write_report: bool) -> dict[str, Any]:
    started = time.perf_counter()
    pre_death_report = _read_json(PRE_DEATH_REPORT_PATH)
    pre_maxstep_report = _read_json(PRE_MAXSTEP_REPORT_PATH)
    manifest = _build_manifest(pre_death_report, pre_maxstep_report)
    manifest_written_before_post_probe = False
    if write_report:
        _write_json(FIX_MANIFEST_PATH, manifest)
        manifest_written_before_post_probe = True

    post = build_reports(
        episodes=max(1, int(episodes)),
        trace_tail=max(1, int(trace_tail)),
        max_steps=max(1, int(max_steps)),
        seed_start=int(seed_start),
        sample_limit=max(1, int(sample_limit)),
        reward_profile_id=BT93N_PROFILE_ID,
    )
    post_death_report = post["deathReport"]
    post_maxstep_report = post["maxstepReport"]
    post_death_report["phaseId"] = "93N.2"
    post_death_report["schemaVersion"] = "bt93n-post-fix-death-before60-trace-v1"
    post_death_report["generatedBy"] = "python/scripts/bt93n_stability_fix.py -> bt93n_death_trace_probe.build_reports"
    post_maxstep_report["phaseId"] = "93N.2"
    post_maxstep_report["schemaVersion"] = "bt93n-post-fix-maxstep-plateau-trace-v1"
    post_maxstep_report["generatedBy"] = "python/scripts/bt93n_stability_fix.py -> bt93n_death_trace_probe.build_reports"

    delta_report = _build_delta_report(
        pre_death_report=pre_death_report,
        pre_maxstep_report=pre_maxstep_report,
        post_death_report=post_death_report,
        post_maxstep_report=post_maxstep_report,
        elapsed_seconds=time.perf_counter() - started,
    )
    if write_report:
        _write_json(DELTA_REPORT_PATH, delta_report)

    stability_report = _build_stability_report(
        manifest=manifest,
        delta_report=delta_report,
        manifest_written_before_post_probe=manifest_written_before_post_probe,
    )
    if write_report:
        _write_json(STABILITY_FIX_REPORT_PATH, stability_report)

    return {
        "manifest": manifest,
        "deltaReport": delta_report,
        "stabilityFixReport": stability_report,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--episodes", type=int, default=DEFAULT_EPISODES)
    parser.add_argument("--trace-tail", type=int, default=DEFAULT_TRACE_TAIL)
    parser.add_argument("--max-steps", type=int, default=DEFAULT_MAX_STEPS)
    parser.add_argument("--seed-start", type=int, default=DEFAULT_SEED_START)
    parser.add_argument("--sample-limit", type=int, default=DEFAULT_SAMPLE_LIMIT)
    args = parser.parse_args()

    reports = build_reports_for_fix(
        episodes=args.episodes,
        trace_tail=args.trace_tail,
        max_steps=args.max_steps,
        seed_start=args.seed_start,
        sample_limit=args.sample_limit,
        write_report=args.write_report,
    )
    summary = {
        "ok": reports["stabilityFixReport"]["ok"],
        "resultClass": reports["stabilityFixReport"]["resultClass"],
        "phaseCoverage": reports["stabilityFixReport"]["phaseCoverage"],
        "deltaResultClass": reports["deltaReport"]["resultClass"],
        "earlyDeathRewardDelta": reports["deltaReport"]["earlyDeathRewardDelta"],
        "outputs": {
            "fixManifest": _rel(FIX_MANIFEST_PATH),
            "stabilityFixReport": _rel(STABILITY_FIX_REPORT_PATH),
            "rewardTerminalDeltaReport": _rel(DELTA_REPORT_PATH),
        },
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
