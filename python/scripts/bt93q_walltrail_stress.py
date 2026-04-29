"""BT93Q.4 wall/trail action-effect stress matrix.

This script runs deterministic sidecar-only scenario probes. It tests every
existing masked semantic action against pinned wall/trail scenarios without PPO
training, candidates, holdout use, or productive runtime changes.
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
from typing import Any, Iterable, Mapping

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


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"
MANIFEST_PATH = BT93Q_ROOT / "walltrail_scenario_manifest.json"
REPORT_PATH = BT93Q_ROOT / "action_effect_stress_report.json"

ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
POLICY_COLLAPSE_PATH = BT93Q_ROOT / "policy_collapse_report.json"
TELEMETRY_GAP_PATH = BT93Q_ROOT / "observation_telemetry_gap_report.json"
TRACE_REANALYSIS_PATH = BT93Q_ROOT / "trace_reanalysis_report.json"

REWARD_PROFILE_ID = "bt93l-objective-reachability-v1"
DEFAULT_REPEAT_STEPS = 4

OBSERVATION_FIELDS = {
    "speedRatio": 0,
    "healthRatio": 1,
    "wallDistanceFront": 3,
    "wallDistanceLeft": 4,
    "wallDistanceRight": 5,
    "targetDistanceRatio": 8,
    "targetAlignment": 9,
    "targetInFront": 10,
    "pressureLevel": 11,
    "projectileThreat": 12,
    "localOpennessRatio": 13,
    "boostActive": 14,
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


SCENARIOS: tuple[dict[str, Any], ...] = (
    {
        "id": "frontal-near-wall",
        "seed": 934,
        "warmupAction": "pitch-up",
        "warmupSteps": 8,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-right", "roll-right"],
        "forbiddenSuccessProxy": "reward-only or target-distance-only",
        "negativeControl": "noop",
        "predicate": "wallDistanceFront <= 0.20",
    },
    {
        "id": "side-wall-left",
        "seed": 942,
        "warmupAction": "noop",
        "warmupSteps": 2,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-right", "roll-right"],
        "forbiddenSuccessProxy": "reward-only",
        "negativeControl": "noop",
        "predicate": "wallDistanceLeft <= 0.25",
    },
    {
        "id": "side-wall-right",
        "seed": 930,
        "warmupAction": "boost",
        "warmupSteps": 7,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-left", "roll-left"],
        "forbiddenSuccessProxy": "reward-only",
        "negativeControl": "noop",
        "predicate": "wallDistanceRight <= 0.25",
    },
    {
        "id": "narrowing-corridor",
        "seed": 934,
        "warmupAction": "pitch-up",
        "warmupSteps": 6,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-right", "roll-right"],
        "forbiddenSuccessProxy": "single target metric",
        "negativeControl": "noop",
        "predicate": "wallDistanceFront <= 0.35 and one side wall <= 0.35 and localOpennessRatio <= 0.45",
    },
    {
        "id": "trail-ahead",
        "seed": 930,
        "warmupAction": "pitch-up",
        "warmupSteps": 8,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-left", "roll-left"],
        "forbiddenSuccessProxy": "reward-only; trailDistance is not exposed",
        "negativeControl": "noop",
        "predicate": "pressureLevel >= 0.50 and wallDistanceFront <= 0.40",
        "telemetryLimit": "trailDistance missing; pressure/front-wall proxy used",
    },
    {
        "id": "trail-side",
        "seed": 934,
        "warmupAction": "pitch-up",
        "warmupSteps": 6,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-right", "roll-right"],
        "forbiddenSuccessProxy": "reward-only; trailDistance is not exposed",
        "negativeControl": "noop",
        "predicate": "pressureLevel >= 0.40 and side wall <= 0.30",
        "telemetryLimit": "trailDistance missing; pressure/side-wall proxy used",
    },
    {
        "id": "escape-left-open",
        "seed": 930,
        "warmupAction": "pitch-up",
        "warmupSteps": 7,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-left", "roll-left"],
        "forbiddenSuccessProxy": "reward-only",
        "negativeControl": "noop",
        "predicate": "wallDistanceLeft >= 0.80 and front/right not both fully open",
    },
    {
        "id": "escape-right-open",
        "seed": 930,
        "warmupAction": "yaw-left",
        "warmupSteps": 0,
        "maxSteps": 20,
        "expectedSafeAction": ["yaw-right", "roll-right"],
        "forbiddenSuccessProxy": "reward-only",
        "negativeControl": "noop",
        "predicate": "wallDistanceRight >= 0.80 and left/front not both fully open",
    },
    {
        "id": "no-danger-control",
        "seed": 930,
        "warmupAction": "noop",
        "warmupSteps": 0,
        "maxSteps": 20,
        "expectedSafeAction": ["control-stability"],
        "forbiddenSuccessProxy": "rescue claim in no-danger state",
        "negativeControl": "noop",
        "predicate": "front/left/right open and pressureLevel <= 0.40",
    },
)


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


def _observation_metrics(observation: Any) -> dict[str, float]:
    array = np.asarray(observation, dtype=np.float64).reshape(-1)
    return {
        name: _round(array[index]) if index < array.size else 0.0
        for name, index in OBSERVATION_FIELDS.items()
    }


def _risk(metrics: Mapping[str, Any], safety: Mapping[str, Any], *, terminated: bool = False) -> dict[str, float | bool]:
    collision = _number(safety.get("collisionRisk"))
    dead_end = _number(safety.get("deadEndRisk"))
    threat = _number(safety.get("threatHorizon"))
    terminal_risk = max(collision, dead_end, threat, 1.0 - _number(metrics.get("healthRatio")), 1.0 if terminated else 0.0)
    return {
        "collisionRisk": _round(collision),
        "deadEndRisk": _round(dead_end),
        "threatHorizon": _round(threat),
        "terminalRisk": _round(terminal_risk),
        "vetoActive": bool(safety.get("vetoActive")),
    }


def _episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _hybrid_safety(info: Mapping[str, Any]) -> Mapping[str, Any]:
    safety = info.get("hybridDecision")
    if isinstance(safety, Mapping):
        nested = safety.get("safety")
        if isinstance(nested, Mapping):
            return nested
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    hybrid = metadata.get("hybridDecision")
    nested = hybrid.get("safety") if isinstance(hybrid, Mapping) else None
    return nested if isinstance(nested, Mapping) else {}


def _reward_breakdown(info: Mapping[str, Any]) -> Mapping[str, Any]:
    breakdown = info.get("rewardBreakdown")
    return breakdown if isinstance(breakdown, Mapping) else {}


def _surface(info: Mapping[str, Any]) -> Mapping[str, Any]:
    surface = info.get("ppoActionSurface")
    return surface if isinstance(surface, Mapping) else {}


def _telemetry(info: Mapping[str, Any]) -> Mapping[str, Any]:
    telemetry = info.get("ppoActionTelemetry")
    return telemetry if isinstance(telemetry, Mapping) else {}


def _action_token(action_name: str) -> int:
    for index, (name, _) in enumerate(MASKED_SEMANTIC_ACTIONS):
        if name == action_name:
            return index
    raise ValueError(f"unknown semantic action: {action_name}")


def _make_env(scenario: Mapping[str, Any], *, action_name: str) -> Any:
    return make_curvios_action_wrapper(
        CurviosEnv(
            max_steps=max(int(scenario.get("maxSteps") or 20), int(scenario.get("warmupSteps") or 0) + DEFAULT_REPEAT_STEPS + 2),
            default_seed=int(scenario["seed"]),
            session_id=f"bt93q-walltrail-{scenario['id']}-{action_name}",
            controller_timeout_seconds=8.0,
            reward_profile_id=REWARD_PROFILE_ID,
            map_key="standard",
            domain_mode="classic-3d",
            game_mode="CLASSIC",
            planar_mode=False,
        ),
        surface_id=PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    )


def _delta(initial: Mapping[str, Any], final: Mapping[str, Any]) -> dict[str, float]:
    return {key: _round(_number(final.get(key)) - _number(initial.get(key))) for key in OBSERVATION_FIELDS}


def _risk_delta(initial: Mapping[str, Any], final: Mapping[str, Any]) -> dict[str, float]:
    return {
        key: _round(_number(final.get(key)) - _number(initial.get(key)))
        for key in ("collisionRisk", "deadEndRisk", "threatHorizon", "terminalRisk")
    }


def _run_probe(scenario: Mapping[str, Any], *, action_name: str, repeat_steps: int) -> dict[str, Any]:
    started = time.perf_counter()
    token = _action_token(action_name)
    warmup_action = str(scenario["warmupAction"])
    warmup_token = _action_token(warmup_action)
    env = _make_env(scenario, action_name=action_name)
    rows: list[dict[str, Any]] = []
    error: str | None = None
    start_metrics: dict[str, Any] = {}
    start_risk: dict[str, Any] = {}
    final_metrics: dict[str, Any] = {}
    final_risk: dict[str, Any] = {}
    try:
        observation, _ = env.reset(seed=int(scenario["seed"]))
        last_info: Mapping[str, Any] = {}
        for _ in range(int(scenario.get("warmupSteps") or 0)):
            observation, _, terminated, truncated, last_info = env.step(warmup_token)
            if terminated or truncated:
                break
        start_metrics = _observation_metrics(observation)
        start_risk = _risk(start_metrics, _hybrid_safety(last_info), terminated=False)
        for step_index in range(repeat_steps):
            observation, reward, terminated, truncated, info = env.step(token)
            final_metrics = _observation_metrics(observation)
            final_risk = _risk(final_metrics, _hybrid_safety(info), terminated=bool(terminated))
            semantics = _episode_semantics(info)
            reachability = semantics.get("objectiveReachability") if isinstance(semantics.get("objectiveReachability"), Mapping) else {}
            surface = _surface(info)
            rows.append(
                {
                    "stepIndex": step_index,
                    "reward": _round(reward),
                    "terminated": bool(terminated),
                    "truncated": bool(truncated),
                    "terminalReason": info.get("terminalReason"),
                    "truncatedReason": info.get("truncatedReason"),
                    "metrics": final_metrics,
                    "risk": final_risk,
                    "surface": {
                        "semanticAction": surface.get("semanticAction"),
                        "invalidReasons": list(surface.get("invalidReasons") or []),
                        "maskEvents": list(surface.get("maskEvents") or []),
                        "vetoEvents": list(surface.get("vetoEvents") or []),
                        "sanitizerEvents": list(surface.get("sanitizerEvents") or []),
                    },
                    "telemetry": {
                        key: _round(_telemetry(info).get(key))
                        for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate", "vetoRate", "preSamplingMaskRate")
                    },
                    "objectiveReachability": {
                        "progressSignalReachable": reachability.get("progressSignalReachable"),
                        "objectiveSignalReachable": reachability.get("objectiveSignalReachable"),
                        "progressEvents": list(reachability.get("progressEvents") or []),
                        "objectiveEvents": list(reachability.get("objectiveEvents") or []),
                    },
                    "rewardBreakdown": {key: _round(value) for key, value in _reward_breakdown(info).items()},
                }
            )
            if terminated or truncated:
                break
    except Exception as exc:  # pragma: no cover - diagnostic report captures runtime failure
        error = str(exc)
    finally:
        env.close()
    if not final_metrics:
        final_metrics = dict(start_metrics)
    if not final_risk:
        final_risk = dict(start_risk)
    return {
        "scenarioId": scenario["id"],
        "actionName": action_name,
        "actionToken": token,
        "ok": error is None and bool(rows) and bool(start_metrics),
        "error": error,
        "elapsedSeconds": _round(time.perf_counter() - started),
        "seed": scenario["seed"],
        "warmupAction": warmup_action,
        "warmupSteps": scenario["warmupSteps"],
        "repeatSteps": repeat_steps,
        "startMetrics": start_metrics,
        "finalMetrics": final_metrics,
        "metricDeltas": _delta(start_metrics, final_metrics),
        "startRisk": start_risk,
        "finalRisk": final_risk,
        "riskDeltas": _risk_delta(start_risk, final_risk),
        "rows": rows,
    }


def _scenario_success(scenario: Mapping[str, Any], probe: Mapping[str, Any]) -> dict[str, Any]:
    deltas = probe.get("metricDeltas") if isinstance(probe.get("metricDeltas"), Mapping) else {}
    risk_deltas = probe.get("riskDeltas") if isinstance(probe.get("riskDeltas"), Mapping) else {}
    final_metrics = probe.get("finalMetrics") if isinstance(probe.get("finalMetrics"), Mapping) else {}
    rows = [row for row in probe.get("rows") or [] if isinstance(row, Mapping)]
    terminal = any(row.get("terminated") is True or row.get("truncated") is True for row in rows)
    scenario_id = str(scenario["id"])
    wall_keys = {
        "frontal-near-wall": ("wallDistanceFront",),
        "side-wall-left": ("wallDistanceLeft",),
        "side-wall-right": ("wallDistanceRight",),
        "narrowing-corridor": ("wallDistanceFront", "wallDistanceLeft", "wallDistanceRight"),
        "trail-ahead": ("wallDistanceFront",),
        "trail-side": ("wallDistanceLeft", "wallDistanceRight"),
        "escape-left-open": ("wallDistanceLeft",),
        "escape-right-open": ("wallDistanceRight",),
        "no-danger-control": ("wallDistanceFront", "wallDistanceLeft", "wallDistanceRight"),
    }[scenario_id]
    wall_distance_delta = max(_number(deltas.get(key)) for key in wall_keys)
    wall_distance_rises = wall_distance_delta > 0.02
    local_openness_stable_or_rises = _number(deltas.get("localOpennessRatio")) >= -0.01
    collision_risk_sinks = _number(risk_deltas.get("collisionRisk")) < -0.01
    terminal_risk_sinks_or_stable = _number(risk_deltas.get("terminalRisk")) <= 0.0 and not terminal
    control_stable = (
        scenario_id == "no-danger-control"
        and not terminal
        and _number(deltas.get("localOpennessRatio")) >= -0.02
        and _number(deltas.get("pressureLevel")) <= 0.05
        and min(
            _number(final_metrics.get("wallDistanceFront")),
            _number(final_metrics.get("wallDistanceLeft")),
            _number(final_metrics.get("wallDistanceRight")),
        )
        >= 0.50
    )
    rescue_success = (
        scenario_id != "no-danger-control"
        and (wall_distance_rises or local_openness_stable_or_rises)
        and (collision_risk_sinks or _number(risk_deltas.get("collisionRisk")) <= 0.02)
        and terminal_risk_sinks_or_stable
    )
    reward_total = sum(_number(row.get("reward")) for row in rows)
    reward_only = reward_total > 0 and not (wall_distance_rises or collision_risk_sinks or terminal_risk_sinks_or_stable)
    return {
        "success": bool(control_stable or rescue_success),
        "controlStable": control_stable,
        "wallDistanceRises": wall_distance_rises,
        "wallDistanceDelta": _round(wall_distance_delta),
        "localOpennessStableOrRises": local_openness_stable_or_rises,
        "collisionRiskSinks": collision_risk_sinks,
        "terminalRiskSinksOrStable": terminal_risk_sinks_or_stable,
        "rewardOnlyRejected": bool(reward_only),
        "terminalObserved": terminal,
        "rewardTotal": _round(reward_total),
    }


def _source(path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _source_artifacts() -> dict[str, Any]:
    paths = {
        "policyCollapse": POLICY_COLLAPSE_PATH,
        "telemetryGap": TELEMETRY_GAP_PATH,
        "traceReanalysis": TRACE_REANALYSIS_PATH,
        "actionSurface": ACTION_SURFACE_PATH,
        "curviosEnv": CURVIOS_ENV_PATH,
        "headlessRunner": HEADLESS_RUNNER_PATH,
    }
    roles = {
        "policyCollapse": "BT93Q.3 policy-collapse blocker",
        "telemetryGap": "BT93Q.2 observation/telemetry gap",
        "traceReanalysis": "BT93Q.2 wall/trail trace context",
        "actionSurface": "masked semantic action surface",
        "curviosEnv": "Python sidecar environment",
        "headlessRunner": "JS headless lane runner",
    }
    tracked = _tracked_files(paths.values())
    return {key: _source(path, roles[key], tracked) for key, path in paths.items()}


def _build_manifest() -> dict[str, Any]:
    generated_at = _utc_now()
    scenarios = []
    for scenario in SCENARIOS:
        scenarios.append(
            {
                **scenario,
                "startWindow": {
                    "kind": "seed-plus-warmup-action",
                    "seed": scenario["seed"],
                    "warmupAction": scenario["warmupAction"],
                    "warmupSteps": scenario["warmupSteps"],
                    "rewardProfileId": REWARD_PROFILE_ID,
                    "mapKey": "standard",
                    "domainMode": "classic-3d",
                    "gameMode": "CLASSIC",
                },
            }
        )
    return {
        "schemaVersion": "bt93q-walltrail-scenario-manifest-v1",
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93q_walltrail_stress.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": True,
        "blockId": "BT93Q",
        "phaseId": "93Q.4",
        "scenarioClasses": [scenario["id"] for scenario in scenarios],
        "scenarioCount": len(scenarios),
        "scenarios": scenarios,
        "actionSurface": build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "ppoTrainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
    }


def build_reports(*, repeat_steps: int) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = _build_manifest()
    source_artifacts = _source_artifacts()
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    actions = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    probes: list[dict[str, Any]] = []
    scenario_results: dict[str, Any] = {}
    for scenario in manifest["scenarios"]:
        action_results = {}
        for action_name in actions:
            probe = _run_probe(scenario, action_name=action_name, repeat_steps=repeat_steps)
            probe["successEvaluation"] = _scenario_success(scenario, probe)
            probes.append(probe)
            action_results[action_name] = {
                "ok": probe["ok"],
                "metricDeltas": probe["metricDeltas"],
                "riskDeltas": probe["riskDeltas"],
                "successEvaluation": probe["successEvaluation"],
            }
        success_actions = [
            action_name
            for action_name, result in action_results.items()
            if result["successEvaluation"]["success"] is True
            and (scenario["id"] == "no-danger-control" or action_name != scenario.get("negativeControl"))
        ]
        class_result = "existing-action-effect-observed" if success_actions else "action-space-required"
        if scenario["id"] == "no-danger-control":
            class_result = "negative-control-stable" if success_actions else "measurement-invalid"
        scenario_results[str(scenario["id"])] = {
            "scenarioId": scenario["id"],
            "actionResults": action_results,
            "successfulActions": success_actions,
            "existingActionCanRescue": bool(success_actions),
            "classResult": class_result,
            "telemetryLimit": scenario.get("telemetryLimit"),
            "expectedSafeAction": scenario.get("expectedSafeAction"),
            "negativeControl": scenario.get("negativeControl"),
        }
    class_results = Counter(result["classResult"] for result in scenario_results.values())
    telemetry_limited = [
        scenario_id
        for scenario_id, result in scenario_results.items()
        if result.get("telemetryLimit")
    ]
    result_class = "action-space-required" if class_results.get("action-space-required") else "walltrail-action-stress-green"
    if class_results.get("measurement-invalid"):
        result_class = "measurement-invalid"
    if telemetry_limited and result_class == "walltrail-action-stress-green":
        result_class = "observation-telemetry-required"
    phase_coverage = {
        "93Q.4.1": set(manifest["scenarioClasses"])
        == {
            "frontal-near-wall",
            "side-wall-left",
            "side-wall-right",
            "narrowing-corridor",
            "trail-ahead",
            "trail-side",
            "escape-left-open",
            "escape-right-open",
            "no-danger-control",
        },
        "93Q.4.2": all(
            all(key in scenario for key in ("seed", "startWindow", "maxSteps", "expectedSafeAction", "forbiddenSuccessProxy", "negativeControl"))
            for scenario in manifest["scenarios"]
        ),
        "93Q.4.3": len(probes) == len(manifest["scenarios"]) * len(actions)
        and all(probe.get("ok") is True for probe in probes),
        "93Q.4.4": all("successEvaluation" in probe for probe in probes)
        and all(
            all(key in probe["successEvaluation"] for key in ("wallDistanceRises", "localOpennessStableOrRises", "collisionRiskSinks", "terminalRiskSinksOrStable"))
            for probe in probes
        ),
        "93Q.4.5": all(result.get("classResult") for result in scenario_results.values()),
    }
    report = {
        "schemaVersion": "bt93q-action-effect-stress-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_walltrail_stress.py",
        "git": manifest["git"],
        "ok": bool(source_files_ready and source_files_versioned and all(phase_coverage.values())),
        "blockId": "BT93Q",
        "phaseId": "93Q.4",
        "resultClass": result_class,
        "phaseCoverage": phase_coverage,
        "sampleCounts": {
            "scenarioCount": len(manifest["scenarios"]),
            "actionCount": len(actions),
            "probeCount": len(probes),
            "repeatSteps": repeat_steps,
        },
        "scenarioResults": scenario_results,
        "classResultCounts": dict(sorted(class_results.items())),
        "telemetryLimitedScenarioIds": telemetry_limited,
        "probes": probes,
        "decision": {
            "resultClass": result_class,
            "opensNext": ["93Q.5 fix after cause evidence"],
            "blocksNext": [
                "93Q.6 10k micro-PPO recheck until 93Q.5 chooses one fix class",
                *BLOCKED_ACTIONS,
            ],
            "nextAllowedActions": [
                "choose exactly one 93Q.5 fix class from action-space, observation/telemetry, reward, safety-mask, or terminal/runner evidence",
                "do not start 93Q.6 while policy-collapse-active remains unresolved",
            ],
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "ppoTrainingStarted": False,
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
            "write": f"python python/scripts/bt93q_walltrail_stress.py --write-report --repeat-steps {repeat_steps}",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    return manifest, report


def main() -> int:
    global BT93Q_ROOT, MANIFEST_PATH, REPORT_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93Q_ROOT)
    parser.add_argument("--repeat-steps", type=int, default=DEFAULT_REPEAT_STEPS)
    args = parser.parse_args()

    BT93Q_ROOT = args.output_root.resolve()
    MANIFEST_PATH = BT93Q_ROOT / "walltrail_scenario_manifest.json"
    REPORT_PATH = BT93Q_ROOT / "action_effect_stress_report.json"

    manifest, report = build_reports(repeat_steps=max(1, int(args.repeat_steps)))
    if args.write_report:
        _write_json(MANIFEST_PATH, manifest)
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "classResultCounts": report["classResultCounts"],
                "sampleCounts": report["sampleCounts"],
                "outputs": {
                    "walltrailScenarioManifest": _rel(MANIFEST_PATH),
                    "actionEffectStress": _rel(REPORT_PATH),
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
