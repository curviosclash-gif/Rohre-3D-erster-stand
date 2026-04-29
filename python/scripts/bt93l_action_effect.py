"""BT93L.4 action-effect and semantic vocabulary report.

The report is a diagnostic smoke. It probes each masked semantic action through
the real CurviosEnv env.step path and separates action safety from measurable
state effect.
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

import numpy as np


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
    make_curvios_action_wrapper,
)


BT93L_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93l"
REPORT_PATH = BT93L_ROOT / "action_effect_report.json"
PROGRESS_REPORT_PATH = BT93L_ROOT / "progress_reachability_report.json"
REWARD_BALANCE_REPORT_PATH = BT93L_ROOT / "reward_balance_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
PROFILE_ID = "bt93l-objective-reachability-v1"

SPEED_RATIO = 0
HEALTH_RATIO = 1
WALL_DISTANCE_FRONT = 3
WALL_DISTANCE_LEFT = 4
WALL_DISTANCE_RIGHT = 5
TARGET_DISTANCE_RATIO = 8
TARGET_ALIGNMENT = 9
TARGET_IN_FRONT = 10
PRESSURE_LEVEL = 11
PROJECTILE_THREAT = 12
LOCAL_OPENNESS_RATIO = 13
BOOST_ACTIVE = 14

OBSERVATION_FIELDS = {
    "speedRatio": SPEED_RATIO,
    "healthRatio": HEALTH_RATIO,
    "wallDistanceFront": WALL_DISTANCE_FRONT,
    "wallDistanceLeft": WALL_DISTANCE_LEFT,
    "wallDistanceRight": WALL_DISTANCE_RIGHT,
    "targetDistanceRatio": TARGET_DISTANCE_RATIO,
    "targetAlignment": TARGET_ALIGNMENT,
    "targetInFront": TARGET_IN_FRONT,
    "pressureLevel": PRESSURE_LEVEL,
    "projectileThreat": PROJECTILE_THREAT,
    "localOpennessRatio": LOCAL_OPENNESS_RATIO,
    "boostActive": BOOST_ACTIVE,
}

MOVEMENT_ACTIONS = {
    "yaw-left",
    "yaw-right",
    "pitch-up",
    "pitch-down",
    "roll-left",
    "roll-right",
    "boost",
}


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


def _observation_metrics(observation: Any) -> dict[str, float]:
    array = np.asarray(observation, dtype=np.float64).reshape(-1)
    metrics: dict[str, float] = {}
    for name, index in OBSERVATION_FIELDS.items():
        metrics[name] = _round(array[index]) if index < array.size else 0.0
    return metrics


def _delta(initial: Mapping[str, float], final: Mapping[str, float]) -> dict[str, float]:
    return {key: _round(_number(final.get(key)) - _number(initial.get(key))) for key in OBSERVATION_FIELDS}


def _episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _reward_breakdown(info: Mapping[str, Any]) -> Mapping[str, Any]:
    breakdown = info.get("rewardBreakdown")
    return breakdown if isinstance(breakdown, Mapping) else {}


def _surface(info: Mapping[str, Any]) -> Mapping[str, Any]:
    surface = info.get("ppoActionSurface")
    return surface if isinstance(surface, Mapping) else {}


def _action_flags(surface: Mapping[str, Any]) -> Mapping[str, Any]:
    action = surface.get("sanitizedAction")
    return action if isinstance(action, Mapping) else {}


def _run_action_probe(*, token: int, action_name: str, seed: int, repeat_steps: int) -> dict[str, Any]:
    started = time.perf_counter()
    env = make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max(repeat_steps + 2, 10),
            default_seed=seed,
            session_id=f"bt93l-action-effect-{action_name}",
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
    initial_metrics: dict[str, float] = {}
    final_metrics: dict[str, float] = {}
    telemetry: Mapping[str, Any] = {}
    try:
        observation, _ = env.reset(seed=seed)
        initial_metrics = _observation_metrics(observation)
        for step_index in range(repeat_steps):
            observation, reward, terminated, truncated, info = env.step(token)
            final_metrics = _observation_metrics(observation)
            semantics = _episode_semantics(info)
            reachability = semantics.get("objectiveReachability") if isinstance(semantics.get("objectiveReachability"), Mapping) else {}
            surface = _surface(info)
            action_flags = _action_flags(surface)
            rows.append(
                {
                    "stepIndex": step_index,
                    "reward": _round(float(reward)),
                    "terminated": bool(terminated),
                    "truncated": bool(truncated),
                    "terminalReason": info.get("terminalReason"),
                    "truncatedReason": info.get("truncatedReason"),
                    "surface": {
                        "semanticAction": surface.get("semanticAction"),
                        "invalidReasons": list(surface.get("invalidReasons") or []),
                        "maskEvents": list(surface.get("maskEvents") or []),
                        "vetoEvents": list(surface.get("vetoEvents") or []),
                        "sanitizerEvents": list(surface.get("sanitizerEvents") or []),
                        "sanitizerChangedAction": bool(surface.get("sanitizerChangedAction")),
                        "sanitizedAction": dict(action_flags),
                    },
                    "episodeSemantics": {
                        "realEnvStepPath": semantics.get("realEnvStepPath"),
                        "progressSignalSource": semantics.get("progressSignalSource"),
                        "objectiveSignalSource": semantics.get("objectiveSignalSource"),
                        "progressSignalReachable": semantics.get("progressSignalReachable"),
                        "objectiveSignalReachable": semantics.get("objectiveSignalReachable"),
                        "progressSignalReported": semantics.get("progressSignalReported"),
                        "checkpointReachedSignal": semantics.get("checkpointReachedSignal"),
                    },
                    "objectiveReachability": {
                        "progressEvents": list(reachability.get("progressEvents") or []),
                        "objectiveEvents": list(reachability.get("objectiveEvents") or []),
                    },
                    "metrics": final_metrics,
                    "rewardBreakdown": {key: _round(_number(value)) for key, value in _reward_breakdown(info).items()},
                }
            )
            if terminated or truncated:
                break
        telemetry = env.get_telemetry_report()
    except Exception as exc:  # pragma: no cover - report captures runtime failures
        error = str(exc)
    finally:
        env.close()
    if not final_metrics:
        final_metrics = dict(initial_metrics)
    return {
        "ok": error is None and bool(rows),
        "actionName": action_name,
        "actionToken": int(token),
        "seed": int(seed),
        "requestedRepeatSteps": int(repeat_steps),
        "observedSteps": len(rows),
        "elapsedSeconds": _round(time.perf_counter() - started),
        "error": error,
        "initialMetrics": initial_metrics,
        "finalMetrics": final_metrics,
        "metricDeltas": _delta(initial_metrics, final_metrics),
        "rows": rows,
        "telemetry": dict(telemetry),
    }


def _summarize_probe(probe: Mapping[str, Any]) -> dict[str, Any]:
    rows = [row for row in probe.get("rows") or [] if isinstance(row, Mapping)]
    action_name = str(probe.get("actionName"))
    deltas = probe.get("metricDeltas") if isinstance(probe.get("metricDeltas"), Mapping) else {}
    progress_events: Counter[str] = Counter()
    objective_events: Counter[str] = Counter()
    terminal_reasons: Counter[str] = Counter()
    action_flag_counts: Counter[str] = Counter()
    reward_total = 0.0
    progress_count = 0
    objective_count = 0
    terminated_count = 0
    truncated_count = 0
    for row in rows:
        reward_total += _number(row.get("reward"))
        if row.get("terminated") is True:
            terminated_count += 1
        if row.get("truncated") is True:
            truncated_count += 1
        reason = row.get("terminalReason") or row.get("truncatedReason")
        if reason:
            terminal_reasons[str(reason)] += 1
        semantics = row.get("episodeSemantics") if isinstance(row.get("episodeSemantics"), Mapping) else {}
        if semantics.get("progressSignalReachable") is True:
            progress_count += 1
        if semantics.get("objectiveSignalReachable") is True:
            objective_count += 1
        reachability = row.get("objectiveReachability") if isinstance(row.get("objectiveReachability"), Mapping) else {}
        for event in reachability.get("progressEvents") or []:
            progress_events[str(event)] += 1
        for event in reachability.get("objectiveEvents") or []:
            objective_events[str(event)] += 1
        surface = row.get("surface") if isinstance(row.get("surface"), Mapping) else {}
        action_flags = surface.get("sanitizedAction") if isinstance(surface.get("sanitizedAction"), Mapping) else {}
        for key, value in action_flags.items():
            if value is True:
                action_flag_counts[str(key)] += 1
    heading_delta = _number(deltas.get("targetAlignment"))
    target_distance_delta = _number(deltas.get("targetDistanceRatio"))
    target_distance_improvement = _round(-target_distance_delta)
    speed_delta = _number(deltas.get("speedRatio"))
    openness_delta = _number(deltas.get("localOpennessRatio"))
    wall_delta = _number(deltas.get("wallDistanceFront"))
    pressure_delta = _number(deltas.get("pressureLevel"))
    boost_delta = _number(deltas.get("boostActive"))
    health_delta = _number(deltas.get("healthRatio"))
    heading_effect = abs(heading_delta) >= 0.005
    position_effect = abs(speed_delta) >= 0.005 or abs(openness_delta) >= 0.005 or abs(target_distance_delta) >= 0.005
    target_effect = abs(target_distance_improvement) >= 0.002 or progress_count > 0 or objective_count > 0
    hazard_effect = abs(wall_delta) >= 0.005 or abs(pressure_delta) >= 0.005
    boost_command = action_flag_counts.get("boost", 0) > 0
    shoot_command = action_flag_counts.get("shootMG", 0) > 0
    terminal_risk = terminated_count > 0 or truncated_count > 0 or health_delta < 0
    effect_dimensions = {
        "heading": heading_effect,
        "positionProxy": position_effect,
        "targetDistance": target_effect,
        "hazardProximity": hazard_effect,
        "boostCommandOrState": boost_command or abs(boost_delta) > 0,
        "shootCommand": shoot_command,
        "terminalRisk": terminal_risk,
    }
    non_terminal_effect_score = sum(
        1
        for key, value in effect_dimensions.items()
        if key != "terminalRisk" and value is True
    )
    expected_noop = action_name == "noop"
    measured_effective = non_terminal_effect_score > 0 and not expected_noop
    return {
        "actionName": action_name,
        "actionToken": probe.get("actionToken"),
        "ok": probe.get("ok") is True,
        "observedSteps": len(rows),
        "rewardTotal": _round(reward_total),
        "metricDeltas": dict(deltas),
        "targetDistanceImprovement": target_distance_improvement,
        "progressSignalReachableCount": progress_count,
        "objectiveSignalReachableCount": objective_count,
        "progressEventCounts": dict(sorted(progress_events.items())),
        "objectiveEventCounts": dict(sorted(objective_events.items())),
        "actionFlagCounts": dict(sorted(action_flag_counts.items())),
        "terminalCounts": {
            "terminated": terminated_count,
            "truncated": truncated_count,
            "reasons": dict(sorted(terminal_reasons.items())),
        },
        "effectDimensions": effect_dimensions,
        "effectScore": non_terminal_effect_score,
        "measuredEffective": measured_effective,
        "expectedNoop": expected_noop,
        "noopStayedNonProgress": expected_noop and progress_count == 0 and objective_count == 0,
        "safetyTelemetry": {
            "invalidActionRate": _number((probe.get("telemetry") or {}).get("invalidActionRate")),
            "postDecodeClampRate": _number((probe.get("telemetry") or {}).get("postDecodeClampRate")),
            "vetoRate": _number((probe.get("telemetry") or {}).get("vetoRate")),
            "sanitizerRate": _number((probe.get("telemetry") or {}).get("sanitizerRate")),
            "preSamplingMaskRate": _number((probe.get("telemetry") or {}).get("preSamplingMaskRate")),
            "noopRate": _number((probe.get("telemetry") or {}).get("noopRate")),
        },
    }


def _aggregate_safety(summaries: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    rates: dict[str, float] = {}
    for key in ("invalidActionRate", "postDecodeClampRate", "vetoRate", "sanitizerRate"):
        rates[key] = max(_number(summary.get("safetyTelemetry", {}).get(key)) for summary in summaries.values())
    rates["minPreSamplingMaskRate"] = min(_number(summary.get("safetyTelemetry", {}).get("preSamplingMaskRate")) for summary in summaries.values())
    return {
        **rates,
        "safetyNonRegression": all(rates[key] == 0 for key in ("invalidActionRate", "postDecodeClampRate", "vetoRate", "sanitizerRate"))
        and rates["minPreSamplingMaskRate"] >= 1,
    }


def build_report(*, repeat_steps: int, seed: int) -> dict[str, Any]:
    probes = [
        _run_action_probe(token=index, action_name=name, seed=seed + index, repeat_steps=repeat_steps)
        for index, (name, _) in enumerate(MASKED_SEMANTIC_ACTIONS)
    ]
    summaries = {str(probe["actionName"]): _summarize_probe(probe) for probe in probes}
    safety = _aggregate_safety(summaries)
    manifest = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    progress_report = _read_json(PROGRESS_REPORT_PATH)
    reward_balance_report = _read_json(REWARD_BALANCE_REPORT_PATH)
    action_names = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    movement_effective = [
        name
        for name, summary in summaries.items()
        if name in MOVEMENT_ACTIONS and summary.get("measuredEffective") is True
    ]
    weak_actions = [
        name
        for name, summary in summaries.items()
        if name != "noop" and summary.get("measuredEffective") is not True and name != "shoot-mg"
    ]
    shoot_summary = summaries.get("shoot-mg", {})
    boost_summary = summaries.get("boost", {})
    noop_summary = summaries.get("noop", {})
    vocabulary_extension_required = not (
        bool(movement_effective)
        and (progress_report.get("summary") or {}).get("positiveControlGreen") is True
        and reward_balance_report.get("ok") is True
    )
    repetition_collapse_detectors = {
        "noopCollapse": {
            "metric": "noopRate",
            "redThreshold": ">= 0.80 over a diagnostic window unless explicitly running noop-control",
            "currentNoopProbeRate": (noop_summary.get("safetyTelemetry") or {}).get("noopRate"),
        },
        "singleActionCollapse": {
            "metric": "max action token share",
            "redThreshold": ">= 0.85 with progressSignalReachableCount == 0",
            "currentProbeScope": "one-token probes only; applies to future policy distributions",
        },
        "repetitionWithoutEffect": {
            "metric": "same semantic action repeated while effectScore == 0",
            "redThreshold": ">= 12 consecutive steps",
            "currentWeakActions": weak_actions,
        },
    }
    phase_coverage = {
        "93L.4.1": all(probe.get("ok") is True for probe in probes)
        and set(action_names) == set(summaries)
        and all("effectDimensions" in summary for summary in summaries.values()),
        "93L.4.2": vocabulary_extension_required is False
        and bool(movement_effective)
        and shoot_summary.get("effectDimensions", {}).get("shootCommand") is True
        and boost_summary.get("effectDimensions", {}).get("boostCommandOrState") is True,
        "93L.4.3": all(repetition_collapse_detectors.values())
        and noop_summary.get("noopStayedNonProgress") is True,
        "93L.4.4": safety["safetyNonRegression"] is True,
    }
    ok = all(phase_coverage.values())
    return {
        "schemaVersion": "bt93l-action-effect-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_action_effect.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": ok,
        "blockId": "BT93L",
        "phaseId": "93L.4",
        "resultClass": "action-effect-green" if ok else "action-space-required",
        "rewardProfileId": PROFILE_ID,
        "actionSurfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "phaseCoverage": phase_coverage,
        "summary": {
            "actionNames": action_names,
            "movementEffectiveActions": movement_effective,
            "weakActions": weak_actions,
            "vocabularyExtensionRequired": vocabulary_extension_required,
            "vocabularyDecision": "no-extension-required" if not vocabulary_extension_required else "extension-required",
            "extensionReason": (
                "current movement vocabulary produces measurable real env.step effects and BT93L.2/93L.3 are green"
                if not vocabulary_extension_required
                else "movement effects or upstream BT93L gates are insufficient"
            ),
            "shootMgCommandObserved": shoot_summary.get("effectDimensions", {}).get("shootCommand") is True,
            "boostCommandObserved": boost_summary.get("effectDimensions", {}).get("boostCommandOrState") is True,
            "noopStayedNonProgress": noop_summary.get("noopStayedNonProgress") is True,
            "bt94aClaimAllowed": False,
            "candidateRun": False,
            "holdoutUsed": False,
        },
        "actionSummaries": summaries,
        "probes": probes,
        "safetyTelemetry": safety,
        "repetitionCollapseDetectors": repetition_collapse_detectors,
        "manifest": manifest,
        "sourceArtifacts": {
            "progressReachabilityReport": _source(PROGRESS_REPORT_PATH, "BT93L.2 real env.step reachability"),
            "rewardBalanceReport": _source(REWARD_BALANCE_REPORT_PATH, "BT93L.3 reward balance"),
            "actionSurface": _source(ACTION_SURFACE_PATH, "masked semantic PPO action surface"),
            "headlessRunner": _source(HEADLESS_RUNNER_PATH, "real JS headless runner path"),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "baselineRun": False,
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
            "write": "python python/scripts/bt93l_action_effect.py --write-report",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--repeat-steps", type=int, default=6)
    parser.add_argument("--seed", type=int, default=9500)
    args = parser.parse_args()

    report = build_report(repeat_steps=max(1, int(args.repeat_steps)), seed=int(args.seed))
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
                "safetyTelemetry": report["safetyTelemetry"],
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
