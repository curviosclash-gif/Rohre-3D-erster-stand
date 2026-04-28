"""BT93L.5 baseline matrix report.

The matrix is diagnostic-only. It compares simple non-PPO baselines on the
same BT93L task/reward/terminal semantics and freezes that matrix before the
optional micro-PPO signal probe.
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
from typing import Any, Callable, Mapping

import numpy as np


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    make_curvios_action_wrapper,
)


BT93L_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93l"
REPORT_PATH = BT93L_ROOT / "baseline_matrix_report.json"
TASK_CONTRACT_PATH = BT93L_ROOT / "task_metric_contract.json"
PROGRESS_REPORT_PATH = BT93L_ROOT / "progress_reachability_report.json"
REWARD_BALANCE_REPORT_PATH = BT93L_ROOT / "reward_balance_report.json"
ACTION_EFFECT_REPORT_PATH = BT93L_ROOT / "action_effect_report.json"
HISTORICAL_DQN_REPORTS = [
    REPO_ROOT / "data" / "bot_validation_report.json",
    REPO_ROOT / "data" / "performance_ki_baseline_report.json",
]
PROFILE_ID = "bt93l-objective-reachability-v1"
SEEDS = (944, 945, 946)
MAX_STEPS = 24
SCRIPTED_REACHABILITY_ACTIONS = (6, 2, 4, 7, 1, 5, 3, 8)
SEMANTIC_CYCLE_ACTIONS = (1, 2, 3, 4, 5, 6, 7, 8)


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


def _source(path: Path, role: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: float) -> float:
    return round(float(value), 6)


def _episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _reward_breakdown(info: Mapping[str, Any]) -> Mapping[str, Any]:
    breakdown = info.get("rewardBreakdown")
    return breakdown if isinstance(breakdown, Mapping) else {}


def _telemetry_rates(report: Mapping[str, Any]) -> dict[str, float]:
    return {
        "invalidActionRate": _number(report.get("invalidActionRate")),
        "postDecodeClampRate": _number(report.get("postDecodeClampRate")),
        "vetoRate": _number(report.get("vetoRate")),
        "sanitizerRate": _number(report.get("sanitizerRate")),
        "noopRate": _number(report.get("noopRate")),
        "preSamplingMaskRate": _number(report.get("preSamplingMaskRate")),
    }


def _policy_token(policy_id: str, step_index: int, rng: np.random.Generator) -> int:
    if policy_id == "noop":
        return 0
    if policy_id == "random":
        return int(rng.integers(0, 9))
    if policy_id == "semantic-cycle":
        return int(SEMANTIC_CYCLE_ACTIONS[step_index % len(SEMANTIC_CYCLE_ACTIONS)])
    if policy_id == "scripted-reachability":
        return int(SCRIPTED_REACHABILITY_ACTIONS[step_index % len(SCRIPTED_REACHABILITY_ACTIONS)])
    raise ValueError(f"unknown baseline policy: {policy_id}")


def _run_episode(*, policy_id: str, seed: int, steps: int) -> dict[str, Any]:
    started = time.perf_counter()
    rng = np.random.default_rng(seed)
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max(steps + 2, 10),
            default_seed=seed,
            session_id=f"bt93l-baseline-{policy_id}",
            controller_timeout_seconds=18.0,
            reward_profile_id=PROFILE_ID,
            map_key="standard",
            domain_mode="classic-3d",
            game_mode="CLASSIC",
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )
    rows: list[dict[str, Any]] = []
    error: str | None = None
    telemetry: Mapping[str, Any] = {}
    try:
        env.reset(seed=seed)
        for step_index in range(steps):
            token = _policy_token(policy_id, step_index, rng)
            _, reward, terminated, truncated, info = env.step(token)
            semantics = _episode_semantics(info)
            reachability = semantics.get("objectiveReachability") if isinstance(semantics.get("objectiveReachability"), Mapping) else {}
            rows.append(
                {
                    "stepIndex": step_index,
                    "actionToken": token,
                    "reward": _round(float(reward)),
                    "terminated": bool(terminated),
                    "truncated": bool(truncated),
                    "terminalReason": info.get("terminalReason"),
                    "truncatedReason": info.get("truncatedReason"),
                    "progressSignalReachable": semantics.get("progressSignalReachable") is True,
                    "objectiveSignalReachable": semantics.get("objectiveSignalReachable") is True,
                    "progressEvents": list(reachability.get("progressEvents") or []),
                    "objectiveEvents": list(reachability.get("objectiveEvents") or []),
                    "rewardBreakdown": {key: _round(_number(value)) for key, value in _reward_breakdown(info).items()},
                }
            )
            if terminated or truncated:
                break
        telemetry = env.get_telemetry_report()
    except Exception as exc:  # pragma: no cover - captured in report
        error = str(exc)
    finally:
        env.close()
    return {
        "ok": error is None and bool(rows),
        "policyId": policy_id,
        "seed": int(seed),
        "requestedSteps": int(steps),
        "observedSteps": len(rows),
        "elapsedSeconds": _round(time.perf_counter() - started),
        "error": error,
        "rows": rows,
        "telemetry": dict(telemetry),
    }


def _summarize_episode(episode: Mapping[str, Any]) -> dict[str, Any]:
    rows = [row for row in episode.get("rows") or [] if isinstance(row, Mapping)]
    reward_breakdown: Counter[str] = Counter()
    progress_events: Counter[str] = Counter()
    objective_events: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    progress_count = 0
    objective_count = 0
    reward_total = 0.0
    for row in rows:
        reward_total += _number(row.get("reward"))
        if row.get("progressSignalReachable") is True:
            progress_count += 1
        if row.get("objectiveSignalReachable") is True:
            objective_count += 1
        reason = row.get("terminalReason") or row.get("truncatedReason")
        if reason:
            terminal_reasons[str(reason)] += 1
        for event in row.get("progressEvents") or []:
            progress_events[str(event)] += 1
        for event in row.get("objectiveEvents") or []:
            objective_events[str(event)] += 1
        breakdown = row.get("rewardBreakdown") if isinstance(row.get("rewardBreakdown"), Mapping) else {}
        for key, value in breakdown.items():
            reward_breakdown[str(key)] += _number(value)
    return {
        "policyId": episode.get("policyId"),
        "seed": episode.get("seed"),
        "ok": episode.get("ok") is True,
        "observedSteps": len(rows),
        "rewardTotal": _round(reward_total),
        "progressSignalReachableCount": progress_count,
        "objectiveSignalReachableCount": objective_count,
        "progressEventCounts": dict(sorted(progress_events.items())),
        "objectiveEventCounts": dict(sorted(objective_events.items())),
        "terminalReasonCounts": dict(sorted(terminal_reasons.items())),
        "rewardBreakdownTotals": {key: _round(value) for key, value in sorted(reward_breakdown.items())},
        "telemetry": _telemetry_rates(episode.get("telemetry") if isinstance(episode.get("telemetry"), Mapping) else {}),
    }


def _aggregate_policy(policy_id: str, episodes: list[Mapping[str, Any]]) -> dict[str, Any]:
    summaries = [_summarize_episode(episode) for episode in episodes]
    count = max(1, len(summaries))
    progress_counts = [int(summary["progressSignalReachableCount"]) for summary in summaries]
    objective_counts = [int(summary["objectiveSignalReachableCount"]) for summary in summaries]
    rewards = [_number(summary["rewardTotal"]) for summary in summaries]
    max_rates = {
        key: max(_number(summary["telemetry"].get(key)) for summary in summaries)
        for key in ("invalidActionRate", "postDecodeClampRate", "vetoRate", "sanitizerRate")
    }
    return {
        "policyId": policy_id,
        "episodeCount": len(summaries),
        "seedCount": len({summary["seed"] for summary in summaries}),
        "observedStepsTotal": sum(int(summary["observedSteps"]) for summary in summaries),
        "rewardMean": _round(sum(rewards) / count),
        "rewardMin": _round(min(rewards) if rewards else 0.0),
        "rewardMax": _round(max(rewards) if rewards else 0.0),
        "progressSignalReachableTotal": sum(progress_counts),
        "objectiveSignalReachableTotal": sum(objective_counts),
        "episodesWithProgress": sum(1 for value in progress_counts if value > 0),
        "episodesWithObjective": sum(1 for value in objective_counts if value > 0),
        "safetyMaxRates": max_rates,
        "episodes": summaries,
    }


def _dqn_anchor() -> dict[str, Any]:
    sources = [_source(path, "historical DQN or KI baseline context") for path in HISTORICAL_DQN_REPORTS]
    available = [source for source in sources if source["exists"] and source["isFile"]]
    return {
        "status": "missing-same-matrix-blocking",
        "sameMatrix": False,
        "historicalSourcesPresent": bool(available),
        "historicalSources": sources,
        "blockingFor": ["BT94A comparison", "candidate/freeze claim", "promotion"],
        "notBlockingFor": ["BT93L.6 micro-PPO signal probe"],
        "reason": "historical DQN reports are not produced on the BT93L task/reward/terminal matrix",
    }


def build_report(*, steps: int) -> dict[str, Any]:
    policy_ids = ["random", "noop", "semantic-cycle", "scripted-reachability"]
    episodes_by_policy = {
        policy_id: [_run_episode(policy_id=policy_id, seed=seed, steps=steps) for seed in SEEDS]
        for policy_id in policy_ids
    }
    policy_summaries = {
        policy_id: _aggregate_policy(policy_id, episodes)
        for policy_id, episodes in episodes_by_policy.items()
    }
    dqn_anchor = _dqn_anchor()
    noop_clean = (
        policy_summaries["noop"]["progressSignalReachableTotal"] == 0
        and policy_summaries["noop"]["objectiveSignalReachableTotal"] == 0
        and policy_summaries["noop"]["rewardMax"] <= 0
    )
    scripted_reaches_objective = policy_summaries["scripted-reachability"]["episodesWithObjective"] > 0
    safety_ok = all(
        all(_number(summary["safetyMaxRates"].get(key)) == 0 for key in ("invalidActionRate", "postDecodeClampRate", "vetoRate", "sanitizerRate"))
        for summary in policy_summaries.values()
    )
    matrix_frozen = {
        "matrixId": "bt93l-baseline-matrix-v1",
        "rewardProfileId": PROFILE_ID,
        "actionSurfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "mapKey": "standard",
        "domainMode": "classic-3d",
        "gameMode": "CLASSIC",
        "seeds": list(SEEDS),
        "maxSteps": int(steps),
        "policies": {
            "random": "numpy default_rng(seed) over semantic action tokens 0..8",
            "noop": "always token 0",
            "semantic-cycle": list(SEMANTIC_CYCLE_ACTIONS),
            "scripted-reachability": list(SCRIPTED_REACHABILITY_ACTIONS),
        },
        "postHocOptimizationAllowed": False,
        "holdoutUsed": False,
    }
    phase_coverage = {
        "93L.5.1": all(policy_id in policy_summaries for policy_id in ("random", "noop", "semantic-cycle"))
        and all(summary["episodeCount"] == len(SEEDS) for summary in policy_summaries.values())
        and noop_clean,
        "93L.5.2": scripted_reaches_objective,
        "93L.5.3": dqn_anchor["status"] in ("referenced-same-matrix", "missing-same-matrix-blocking"),
        "93L.5.4": matrix_frozen["postHocOptimizationAllowed"] is False and matrix_frozen["holdoutUsed"] is False,
    }
    ok = all(phase_coverage.values()) and safety_ok
    return {
        "schemaVersion": "bt93l-baseline-matrix-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_baseline_matrix.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": ok,
        "blockId": "BT93L",
        "phaseId": "93L.5",
        "resultClass": "baseline-matrix-frozen-dqn-anchor-missing" if ok else "baseline-matrix-blocked",
        "phaseCoverage": phase_coverage,
        "matrix": matrix_frozen,
        "policySummaries": policy_summaries,
        "episodesByPolicy": episodes_by_policy,
        "dqnAnchor": dqn_anchor,
        "summary": {
            "noopClean": noop_clean,
            "scriptedHeuristicReachesObjective": scripted_reaches_objective,
            "sameMatrixDqnAnchorPresent": dqn_anchor["sameMatrix"],
            "dqnAnchorBlockingForBt94a": True,
            "microPpoMatrixFrozen": ok,
            "microPpoAllowedBy93L5": ok,
            "bt94aClaimAllowed": False,
            "candidateRun": False,
            "holdoutUsed": False,
        },
        "sourceArtifacts": {
            "taskMetricContract": _source(TASK_CONTRACT_PATH, "BT93L.1 task and terminal contract"),
            "progressReachabilityReport": _source(PROGRESS_REPORT_PATH, "BT93L.2 real env.step reachability"),
            "rewardBalanceReport": _source(REWARD_BALANCE_REPORT_PATH, "BT93L.3 reward balance"),
            "actionEffectReport": _source(ACTION_EFFECT_REPORT_PATH, "BT93L.4 action-effect matrix"),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "baselineRun": True,
            "baselineRunKind": "diagnostic-non-ppo-control-baselines",
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93l_baseline_matrix.py --write-report",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--steps", type=int, default=MAX_STEPS)
    args = parser.parse_args()

    report = build_report(steps=max(1, int(args.steps)))
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "summary": report["summary"],
                "policySummary": {
                    key: {
                        "rewardMean": value["rewardMean"],
                        "progressSignalReachableTotal": value["progressSignalReachableTotal"],
                        "objectiveSignalReachableTotal": value["objectiveSignalReachableTotal"],
                        "episodesWithObjective": value["episodesWithObjective"],
                    }
                    for key, value in report["policySummaries"].items()
                },
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
