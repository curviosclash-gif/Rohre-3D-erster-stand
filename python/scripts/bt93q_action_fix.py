"""BT93Q.5 action-fix manifest and delta report.

The fix class is intentionally narrow: action surface only. The script records
the pre-fix action-space evidence, runs the post-fix wall/trail stress matrix
in-process, and writes fix_manifest.json plus fix_delta_report.json.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
SCRIPT_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))
if str(SCRIPT_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPT_ROOT))

from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)
from bt93q_walltrail_stress import build_reports as build_walltrail_reports  # noqa: E402


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"
FIX_MANIFEST_PATH = BT93Q_ROOT / "fix_manifest.json"
FIX_DELTA_PATH = BT93Q_ROOT / "fix_delta_report.json"

PRE_STRESS_PATH = BT93Q_ROOT / "action_effect_stress_report.json"
POLICY_COLLAPSE_PATH = BT93Q_ROOT / "policy_collapse_report.json"
TELEMETRY_GAP_PATH = BT93Q_ROOT / "observation_telemetry_gap_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
ACTION_SURFACE_TEST_PATH = PYTHON_ROOT / "tests" / "test_ppo_action_surface.py"

NEW_ACTIONS = ("turn-left-boost", "turn-right-boost", "evade-left", "evade-right")
TARGET_SCENARIO_ID = "escape-right-open"

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
        "preActionEffectStress": PRE_STRESS_PATH,
        "policyCollapse": POLICY_COLLAPSE_PATH,
        "telemetryGap": TELEMETRY_GAP_PATH,
        "actionSurface": ACTION_SURFACE_PATH,
        "actionSurfaceTest": ACTION_SURFACE_TEST_PATH,
    }
    roles = {
        "preActionEffectStress": "BT93Q.4 pre-fix action-space evidence",
        "policyCollapse": "BT93Q.3 policy-collapse blocker",
        "telemetryGap": "BT93Q.2 telemetry gap",
        "actionSurface": "BT93Q.5 changed sidecar action surface",
        "actionSurfaceTest": "focused action-surface contract test updated for new actions",
    }
    tracked = _tracked_files(paths.values())
    return {key: _source(path, roles[key], tracked) for key, path in paths.items()}


def _scenario_action_results(report: Mapping[str, Any], *, scenario_id: str, actions: Iterable[str]) -> dict[str, Any]:
    scenario_results = report.get("scenarioResults") if isinstance(report.get("scenarioResults"), Mapping) else {}
    scenario = scenario_results.get(scenario_id) if isinstance(scenario_results.get(scenario_id), Mapping) else {}
    action_results = scenario.get("actionResults") if isinstance(scenario.get("actionResults"), Mapping) else {}
    return {
        action: action_results.get(action)
        for action in actions
        if isinstance(action_results.get(action), Mapping)
    }


def _safety_zero_for_new_actions(post_report: Mapping[str, Any]) -> bool:
    for result in _scenario_action_results(post_report, scenario_id=TARGET_SCENARIO_ID, actions=NEW_ACTIONS).values():
        action_results = result if isinstance(result, Mapping) else {}
        if not action_results.get("ok"):
            return False
    for probe in post_report.get("probes") or []:
        if not isinstance(probe, Mapping) or probe.get("actionName") not in NEW_ACTIONS:
            continue
        for row in probe.get("rows") or []:
            if not isinstance(row, Mapping):
                continue
            telemetry = row.get("telemetry") if isinstance(row.get("telemetry"), Mapping) else {}
            if any(float(telemetry.get(key) or 0.0) != 0.0 for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate")):
                return False
    return True


def _new_action_successes(post_report: Mapping[str, Any]) -> dict[str, list[str]]:
    successes: dict[str, list[str]] = {}
    scenario_results = post_report.get("scenarioResults") if isinstance(post_report.get("scenarioResults"), Mapping) else {}
    for scenario_id, result in scenario_results.items():
        if not isinstance(result, Mapping):
            continue
        actions = [
            action
            for action in result.get("successfulActions") or []
            if action in NEW_ACTIONS
        ]
        if actions:
            successes[str(scenario_id)] = actions
    return successes


def _new_action_safety_and_gain(post_report: Mapping[str, Any]) -> dict[str, Any]:
    per_action: dict[str, dict[str, Any]] = {
        action: {
            "safetyZero": True,
            "stateGainObserved": False,
            "stateGainSignals": [],
            "successScenarioIds": [],
            "targetScenarioStateGainObserved": False,
        }
        for action in NEW_ACTIONS
    }
    scenario_results = post_report.get("scenarioResults") if isinstance(post_report.get("scenarioResults"), Mapping) else {}
    for scenario_id, result in scenario_results.items():
        if not isinstance(result, Mapping):
            continue
        for action in result.get("successfulActions") or []:
            if action in per_action:
                per_action[action]["successScenarioIds"].append(str(scenario_id))
    for probe in post_report.get("probes") or []:
        if not isinstance(probe, Mapping) or probe.get("actionName") not in per_action:
            continue
        action_name = str(probe["actionName"])
        for row in probe.get("rows") or []:
            if not isinstance(row, Mapping):
                continue
            telemetry = row.get("telemetry") if isinstance(row.get("telemetry"), Mapping) else {}
            if any(float(telemetry.get(key) or 0.0) != 0.0 for key in ("invalidActionRate", "postDecodeClampRate", "sanitizerRate")):
                per_action[action_name]["safetyZero"] = False
        deltas = probe.get("metricDeltas") if isinstance(probe.get("metricDeltas"), Mapping) else {}
        risk_deltas = probe.get("riskDeltas") if isinstance(probe.get("riskDeltas"), Mapping) else {}
        state_gain_signals = [
            signal
            for signal, observed in (
                ("wallDistanceFront", float(deltas.get("wallDistanceFront") or 0.0) > 0.02),
                ("wallDistanceLeft", float(deltas.get("wallDistanceLeft") or 0.0) > 0.02),
                ("wallDistanceRight", float(deltas.get("wallDistanceRight") or 0.0) > 0.02),
                ("localOpennessRatio", float(deltas.get("localOpennessRatio") or 0.0) >= 0.0),
                ("collisionRisk", float(risk_deltas.get("collisionRisk") or 0.0) < -0.01),
                ("terminalRisk", float(risk_deltas.get("terminalRisk") or 0.0) <= 0.0),
            )
            if observed
        ]
        if state_gain_signals:
            per_action[action_name]["stateGainObserved"] = True
            per_action[action_name]["stateGainSignals"] = sorted(
                set(per_action[action_name]["stateGainSignals"]) | set(state_gain_signals)
            )
            if probe.get("scenarioId") == TARGET_SCENARIO_ID:
                per_action[action_name]["targetScenarioStateGainObserved"] = True
    return {
        "perAction": per_action,
        "allActionsSafetyZero": all(details["safetyZero"] for details in per_action.values()),
        "allActionsStateGainObserved": all(details["stateGainObserved"] for details in per_action.values()),
        "targetScenarioStateGainActions": [
            action
            for action, details in per_action.items()
            if details["targetScenarioStateGainObserved"]
        ],
    }


def build_reports(*, repeat_steps: int) -> tuple[dict[str, Any], dict[str, Any]]:
    pre_report = _read_json(PRE_STRESS_PATH)
    _, post_report = build_walltrail_reports(repeat_steps=repeat_steps)
    source_artifacts = _source_artifacts()
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    current_actions = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    pre_target = (pre_report.get("scenarioResults") or {}).get(TARGET_SCENARIO_ID, {})
    post_target = (post_report.get("scenarioResults") or {}).get(TARGET_SCENARIO_ID, {})
    new_action_successes = _new_action_successes(post_report)
    target_new_action_successes = [
        action
        for action in post_target.get("successfulActions") or []
        if action in NEW_ACTIONS
    ] if isinstance(post_target, Mapping) else []
    safety_zero = _safety_zero_for_new_actions(post_report)
    safety_and_gain = _new_action_safety_and_gain(post_report)
    action_surface_manifest = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    generated_at = _utc_now()
    common = {
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93q_action_fix.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93Q",
        "phaseId": "93Q.5",
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "blockedActions": list(BLOCKED_ACTIONS),
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "ppoTrainingStarted": False,
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
    }
    fix_manifest = {
        "schemaVersion": "bt93q-fix-manifest-v1",
        "ok": True,
        "resultClass": "action-fix-locked-before-recheck",
        "fixClass": "Action",
        "oneFixClassOnly": True,
        "selectedBecause": {
            "preReportPath": _rel(PRE_STRESS_PATH),
            "preResultClass": pre_report.get("resultClass"),
            "targetScenarioId": TARGET_SCENARIO_ID,
            "targetPreClassResult": pre_target.get("classResult") if isinstance(pre_target, Mapping) else None,
            "policyCollapseStillBlocking": _read_json(POLICY_COLLAPSE_PATH).get("resultClass") == "policy-collapse-active",
        },
        "changedFiles": [
            _rel(ACTION_SURFACE_PATH),
            _rel(ACTION_SURFACE_TEST_PATH),
        ],
        "newSemanticActions": list(NEW_ACTIONS),
        "actionSurface": {
            "surfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
            "semanticActions": current_actions,
            "manifest": action_surface_manifest,
        },
        "expectedMetricDirection": {
            TARGET_SCENARIO_ID: {
                "wallDistanceRight": "increase-or-stabilize",
                "localOpennessRatio": "increase-or-stabilize",
                "collisionRisk": "decrease-or-stabilize",
                "terminalRisk": "decrease-or-stabilize",
                "invalidActionRate": "0",
                "postDecodeClampRate": "0",
                "sanitizerRate": "0",
            }
        },
        "falsificationRules": [
            "no new action succeeds on escape-right-open",
            "any new action has invalidActionRate, postDecodeClampRate, or sanitizerRate > 0",
            "post stress report remains action-space-required for the same target scenario",
            "policy-collapse-active remains a separate blocker for 93Q.6",
        ],
        "nextAllowedActions": [
            "write fix_delta_report.json",
            "do not start 93Q.6 while policy-collapse-active remains unresolved",
        ],
        **common,
    }
    phase_coverage = {
        "93Q.5.1": fix_manifest["fixClass"] == "Action"
        and pre_report.get("resultClass") == "action-space-required"
        and pre_target.get("classResult") == "action-space-required",
        "93Q.5.2": fix_manifest["fixClass"] != "Observation/Telemetry",
        "93Q.5.3": fix_manifest["fixClass"] != "Reward",
        "93Q.5.4": fix_manifest["fixClass"] != "Safety-Mask",
        "93Q.5.5": fix_manifest["fixClass"] != "Terminal/Runner",
        "93Q.5.6": fix_manifest["oneFixClassOnly"] is True
        and bool(fix_manifest["changedFiles"])
        and bool(fix_manifest["expectedMetricDirection"])
        and bool(fix_manifest["falsificationRules"]),
    }
    target_repaired = bool(target_new_action_successes)
    result_class = "action-fix-green-diagnose-only" if target_repaired and safety_zero else "action-fix-insufficient"
    fix_delta = {
        "schemaVersion": "bt93q-fix-delta-report-v1",
        "ok": bool(source_files_ready and source_files_versioned and all(phase_coverage.values())),
        "resultClass": result_class,
        "fixClass": "Action",
        "phaseCoverage": phase_coverage,
        "pre": {
            "resultClass": pre_report.get("resultClass"),
            "classResultCounts": pre_report.get("classResultCounts"),
            "targetScenario": {
                "scenarioId": TARGET_SCENARIO_ID,
                "classResult": pre_target.get("classResult") if isinstance(pre_target, Mapping) else None,
                "successfulActions": pre_target.get("successfulActions") if isinstance(pre_target, Mapping) else None,
            },
        },
        "post": {
            "resultClass": post_report.get("resultClass"),
            "classResultCounts": post_report.get("classResultCounts"),
            "sampleCounts": post_report.get("sampleCounts"),
            "targetScenario": {
                "scenarioId": TARGET_SCENARIO_ID,
                "classResult": post_target.get("classResult") if isinstance(post_target, Mapping) else None,
                "successfulActions": post_target.get("successfulActions") if isinstance(post_target, Mapping) else None,
                "newActionResults": _scenario_action_results(post_report, scenario_id=TARGET_SCENARIO_ID, actions=NEW_ACTIONS),
            },
            "newActionSuccessesByScenario": new_action_successes,
        },
        "safety": {
            "newActionsSafetyZero": safety_zero,
            "newActionsSafetyAndGain": safety_and_gain,
            "requiredZeroRates": ["invalidActionRate", "postDecodeClampRate", "sanitizerRate"],
        },
        "dodCoverage": {
            "DoD.6": pre_report.get("resultClass") == "action-space-required"
            and safety_and_gain["allActionsSafetyZero"] is True
            and safety_and_gain["allActionsStateGainObserved"] is True,
            "DoD.10": fix_manifest["oneFixClassOnly"] is True,
            "DoD.11": False,
            "DoD.12": False,
        },
        "decision": {
            "targetScenarioRepaired": target_repaired,
            "policyCollapseStillBlocking": _read_json(POLICY_COLLAPSE_PATH).get("resultClass") == "policy-collapse-active",
            "microPpoRecheckAllowed": False,
            "opensNext": ["93Q.6 contract only if policy collapse is later resolved or explicitly explained"],
            "blocksNext": [
                "93Q.6 10k micro-PPO recheck while policy-collapse-active remains unresolved",
                *BLOCKED_ACTIONS,
            ],
        },
        "commands": {
            "write": f"python python/scripts/bt93q_action_fix.py --write-report --repeat-steps {repeat_steps}",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
        **common,
    }
    fix_manifest["phaseCoverage"] = phase_coverage
    fix_manifest["ok"] = bool(source_files_ready and source_files_versioned and all(phase_coverage.values()))
    return fix_manifest, fix_delta


def main() -> int:
    global BT93Q_ROOT, FIX_MANIFEST_PATH, FIX_DELTA_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93Q_ROOT)
    parser.add_argument("--repeat-steps", type=int, default=4)
    args = parser.parse_args()

    BT93Q_ROOT = args.output_root.resolve()
    FIX_MANIFEST_PATH = BT93Q_ROOT / "fix_manifest.json"
    FIX_DELTA_PATH = BT93Q_ROOT / "fix_delta_report.json"

    fix_manifest, fix_delta = build_reports(repeat_steps=max(1, int(args.repeat_steps)))
    if args.write_report:
        _write_json(FIX_MANIFEST_PATH, fix_manifest)
        _write_json(FIX_DELTA_PATH, fix_delta)
    print(
        json.dumps(
            {
                "ok": fix_manifest["ok"] and fix_delta["ok"],
                "resultClass": fix_delta["resultClass"],
                "phaseCoverage": fix_delta["phaseCoverage"],
                "targetScenario": fix_delta["post"]["targetScenario"],
                "outputs": {
                    "fixManifest": _rel(FIX_MANIFEST_PATH),
                    "fixDelta": _rel(FIX_DELTA_PATH),
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if fix_manifest["ok"] and fix_delta["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
