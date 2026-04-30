"""BT93S.1 scenario-window and control contract.

This script pins the BT93S wall/trail action-effect matrix before any
measurement. It writes contracts only; it does not start PPO training, consume
holdout data, or change productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"
BT93RR_ROOT = PPO_ROOT / "bt93r_reentry"
BT93S_ROOT = PPO_ROOT / "bt93s"

SCENARIO_CONTRACT_PATH = BT93S_ROOT / "scenario_window_contract.json"
ACTION_EFFECT_MANIFEST_PATH = BT93S_ROOT / "action_effect_window_manifest.json"

BT93Q_SCENARIO_MANIFEST_PATH = BT93Q_ROOT / "walltrail_scenario_manifest.json"
BT93Q_ACTION_EFFECT_REPORT_PATH = BT93Q_ROOT / "action_effect_stress_report.json"
BT93RR_HANDOVER_PATH = BT93RR_ROOT / "bt93r_reentry_handover_package.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

REQUIRED_SCENARIOS = (
    "frontal-near-wall",
    "side-wall-left",
    "side-wall-right",
    "narrowing-corridor",
    "trail-ahead",
    "trail-side",
    "escape-left-open",
    "escape-right-open",
    "no-danger-control",
)

SEED_OFFSETS = (0, 1000, 2000)
EFFECT_WINDOW_STEPS = 24
MINIMUM_COMPLETED_STEPS = 8
CONTRACT_ID = "bt93s-walltrail-action-effect-window-v1"
MATRIX_ID = "bt93s-walltrail-action-effect-matrix-v1"

BLOCKED_ACTIONS = [
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
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S.1",
    "telemetry fix from BT93S.1",
]

EXPECTED_EFFECTS: dict[str, dict[str, Any]] = {
    "frontal-near-wall": {
        "primaryImprovement": ["wallDistanceFront increase", "collisionRisk decrease", "terminalRisk decrease"],
        "positiveControlRationale": "turn/roll away from frontal wall pressure",
    },
    "side-wall-left": {
        "primaryImprovement": ["wallDistanceLeft increase", "collisionRisk decrease"],
        "positiveControlRationale": "move away from left wall pressure",
    },
    "side-wall-right": {
        "primaryImprovement": ["wallDistanceRight increase", "collisionRisk decrease"],
        "positiveControlRationale": "move away from right wall pressure",
    },
    "narrowing-corridor": {
        "primaryImprovement": ["localOpennessRatio increase", "deadEndRisk decrease", "terminalRisk decrease"],
        "positiveControlRationale": "choose wider escape lane rather than target-only progress",
    },
    "trail-ahead": {
        "primaryImprovement": ["pressureLevel decrease", "wallDistanceFront non-regression", "terminalRisk decrease"],
        "positiveControlRationale": "escape ahead/trail pressure without using reward-only proxy",
        "telemetryLimit": "trailDistance not exposed before BT93T; pressure/front-wall proxy only",
    },
    "trail-side": {
        "primaryImprovement": ["pressureLevel decrease", "side-wall distance non-regression", "terminalRisk decrease"],
        "positiveControlRationale": "escape side trail pressure without using reward-only proxy",
        "telemetryLimit": "trailDistance not exposed before BT93T; pressure/side-wall proxy only",
    },
    "escape-left-open": {
        "primaryImprovement": ["left escape lane preserved", "terminalRisk decrease", "collisionRisk decrease"],
        "positiveControlRationale": "use left-side opening under pressure",
    },
    "escape-right-open": {
        "primaryImprovement": ["right escape lane preserved", "terminalRisk decrease", "collisionRisk decrease"],
        "positiveControlRationale": "hard BT93S target blocker: use right-side opening under pressure",
    },
    "no-danger-control": {
        "primaryImprovement": ["stability without rescue claim", "terminalRisk non-regression"],
        "positiveControlRationale": "no-danger rows may not manufacture escape success",
    },
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return sha256(_json_text(payload).encode("utf-8")).hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(args: list[str]) -> list[str]:
    return [line.strip().replace("\\", "/") for line in _git_output(args).splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
    rel_paths = [path for path in rel_paths if path]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _source_artifact(path: Path, role: str, tracked: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _surface_manifest() -> dict[str, Any]:
    import sys

    if str(PYTHON_ROOT) not in sys.path:
        sys.path.insert(0, str(PYTHON_ROOT))

    from envs.ppo_action_surface import (  # pylint: disable=import-outside-toplevel
        PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        build_action_surface_manifest,
    )

    manifest = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    manifest["decoderHash"] = _sha256_file(ACTION_SURFACE_PATH)
    manifest["decoderPath"] = _rel(ACTION_SURFACE_PATH)
    return manifest


def _as_int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _seed_set(source_seed: int) -> list[int]:
    return [source_seed + offset for offset in SEED_OFFSETS]


def _control_contract(source: Mapping[str, Any]) -> dict[str, Any]:
    scenario_id = str(source.get("id") or "")
    expected = EXPECTED_EFFECTS.get(scenario_id, {})
    expected_safe_actions = list(source.get("expectedSafeAction") or [])
    negative_control = source.get("negativeControl") or "noop"
    if scenario_id == "no-danger-control":
        positive_controls = ["noop"]
        negative_controls = ["boost", "shoot-mg"]
    else:
        positive_controls = [str(action) for action in expected_safe_actions if action != "control-stability"]
        negative_controls = [str(negative_control)]

    return {
        "expectedStateEffect": {
            "primaryImprovement": list(expected.get("primaryImprovement") or []),
            "positiveControlRationale": expected.get("positiveControlRationale"),
            "telemetryLimit": expected.get("telemetryLimit") or source.get("telemetryLimit"),
        },
        "positiveControls": {
            "actions": positive_controls,
            "mustShowExpectedEffectBeforeGreen": True,
            "failureResultClass": "matrix-redesign-required",
        },
        "negativeControls": {
            "actions": negative_controls,
            "mustNotPassAsSuccess": True,
            "failureResultClass": "measurement-invalid",
        },
        "forbiddenSuccessProxies": [
            source.get("forbiddenSuccessProxy") or "reward-only",
            "single-step delta",
            "command flag without state effect",
            "target-distance-only improvement under higher terminal risk",
            "maxSteps survival without objective or risk improvement",
        ],
    }


def _scenario_contract(source: Mapping[str, Any]) -> dict[str, Any]:
    scenario_id = str(source.get("id") or "")
    source_seed = _as_int(source.get("seed"), 0)
    warmup_steps = max(0, _as_int(source.get("warmupSteps"), 0))
    source_max_steps = max(1, _as_int(source.get("maxSteps"), EFFECT_WINDOW_STEPS))
    return {
        "id": scenario_id,
        "source": {
            "blockId": "BT93Q",
            "path": _rel(BT93Q_SCENARIO_MANIFEST_PATH),
            "sourceSeed": source_seed,
            "predicate": source.get("predicate"),
            "warmupAction": source.get("warmupAction"),
            "warmupSteps": warmup_steps,
        },
        "seedPlan": {
            "mode": "deterministic-expanded-from-bt93q",
            "seeds": _seed_set(source_seed),
            "sourceSeed": source_seed,
            "justification": (
                "BT93Q supplied deterministic wall/trail fixtures; BT93S expands each class "
                "to three deterministic seeds and revalidates predicates before effect claims."
            ),
        },
        "startState": {
            **dict(source.get("startWindow") or {}),
            "requiredPredicate": source.get("predicate"),
            "revalidateBeforeMeasurement": True,
        },
        "effectWindow": {
            "warmupAction": source.get("warmupAction"),
            "warmupSteps": warmup_steps,
            "sourceMaxSteps": source_max_steps,
            "maxSteps": max(EFFECT_WINDOW_STEPS, source_max_steps),
            "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
            "earlyAbortOnTerminal": True,
            "terminalAbortIsFailureUnlessScenarioDefinesTerminalControl": True,
        },
        "controls": _control_contract(source),
        "requiredMetrics": [
            "wallDistanceFront",
            "wallDistanceLeft",
            "wallDistanceRight",
            "localOpennessRatio",
            "collisionRisk",
            "terminalRisk",
            "headingDelta",
            "targetDelta",
            "pressureLevel",
            "trailPressureProxy",
        ],
    }


def build_contract() -> dict[str, Any]:
    source_manifest = _read_json(BT93Q_SCENARIO_MANIFEST_PATH)
    source_scenarios = source_manifest.get("scenarios") if isinstance(source_manifest.get("scenarios"), list) else []
    source_by_id = {
        str(scenario.get("id")): scenario
        for scenario in source_scenarios
        if isinstance(scenario, Mapping) and scenario.get("id")
    }
    missing_scenarios = [scenario_id for scenario_id in REQUIRED_SCENARIOS if scenario_id not in source_by_id]
    scenarios = [_scenario_contract(source_by_id[scenario_id]) for scenario_id in REQUIRED_SCENARIOS if scenario_id in source_by_id]

    current_surface = _surface_manifest()
    source_surface = source_manifest.get("actionSurface") if isinstance(source_manifest.get("actionSurface"), Mapping) else {}
    source_paths = [
        BT93Q_SCENARIO_MANIFEST_PATH,
        BT93Q_ACTION_EFFECT_REPORT_PATH,
        BT93RR_HANDOVER_PATH,
        ACTION_SURFACE_PATH,
    ]
    tracked = _tracked_files(source_paths)
    source_artifacts = [
        _source_artifact(BT93Q_SCENARIO_MANIFEST_PATH, "BT93Q scenario classes", tracked),
        _source_artifact(BT93Q_ACTION_EFFECT_REPORT_PATH, "BT93Q prior 4-step action-effect diagnostic", tracked),
        _source_artifact(BT93RR_HANDOVER_PATH, "BT93RR R-Allowlist handover opening only BT93S", tracked),
        _source_artifact(ACTION_SURFACE_PATH, "current PPO action surface decoder", tracked),
    ]

    surface_drift = {
        "sourceBt93qSurfaceId": source_surface.get("surfaceId"),
        "currentSurfaceId": current_surface.get("surfaceId"),
        "sourceSemanticActions": list(source_surface.get("semanticActions") or []),
        "currentSemanticActions": list(current_surface.get("semanticActions") or []),
        "surfaceIdChangedSinceBt93qManifest": source_surface.get("surfaceId") != current_surface.get("surfaceId"),
        "semanticVocabularyChangedSinceBt93qManifest": list(source_surface.get("semanticActions") or [])
        != list(current_surface.get("semanticActions") or []),
        "consequence": (
            "BT93S pins the current decoder/actionSurfaceId; old matrix, baseline, and comparator artifacts "
            "remain context-only until re-evaluated on the pinned BT93S surface."
        ),
    }

    ok = (
        not missing_scenarios
        and len(scenarios) == len(REQUIRED_SCENARIOS)
        and all(len(scenario["seedPlan"]["seeds"]) >= 3 for scenario in scenarios)
        and bool(current_surface.get("surfaceId"))
    )

    payload: dict[str, Any] = {
        "schemaVersion": "bt93s-scenario-window-contract-v1",
        "blockId": "BT93S",
        "phaseId": "93S.1",
        "contractId": CONTRACT_ID,
        "matrixId": MATRIX_ID,
        "resultClass": "scenario-window-contract-green" if ok else "measurement-invalid",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s_scenario_window_contract.py",
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "sourceArtifacts": source_artifacts,
        "lineage": {
            "bt93rrHandover": _rel(BT93RR_HANDOVER_PATH),
            "bt93qScenarioManifest": _rel(BT93Q_SCENARIO_MANIFEST_PATH),
            "upstreamMatrixId": _read_json(BT93RR_HANDOVER_PATH).get("lineage", {}).get("matrixId")
            if isinstance(_read_json(BT93RR_HANDOVER_PATH).get("lineage"), Mapping)
            else None,
            "rewardProfileId": _read_json(BT93RR_HANDOVER_PATH).get("lineage", {}).get("rewardProfileId")
            if isinstance(_read_json(BT93RR_HANDOVER_PATH).get("lineage"), Mapping)
            else None,
            "actionSurfaceId": current_surface.get("surfaceId"),
            "decoderHash": current_surface.get("decoderHash"),
        },
        "actionSurface": current_surface,
        "surfaceDrift": surface_drift,
        "scenarioClasses": list(REQUIRED_SCENARIOS),
        "scenarioCount": len(scenarios),
        "missingScenarios": missing_scenarios,
        "scenarios": scenarios,
        "windowContract": {
            "effectWindowSteps": EFFECT_WINDOW_STEPS,
            "minimumCompletedSteps": MINIMUM_COMPLETED_STEPS,
            "warmupPreservedFromBt93q": True,
            "terminalAbortEnabled": True,
            "earlyAbortEnabled": True,
            "positiveControlsRequiredBeforeGreen": True,
            "negativeControlsMustNotPass": True,
            "forbiddenSuccessProxyPolicy": "reward/command/maxSteps/single-step deltas cannot establish action quality",
        },
        "phaseCoverage": {
            "DoD.S1": ok,
            "93S.1.1": not missing_scenarios,
            "93S.1.2": all(len(scenario["seedPlan"]["seeds"]) >= 3 for scenario in scenarios),
            "93S.1.3": all(scenario["effectWindow"]["maxSteps"] >= EFFECT_WINDOW_STEPS for scenario in scenarios),
            "93S.1.4": all(
                bool(scenario["controls"]["positiveControls"]["actions"])
                and scenario["controls"]["positiveControls"]["mustShowExpectedEffectBeforeGreen"]
                for scenario in scenarios
            ),
            "93S.1.5": all(
                bool(scenario["controls"]["negativeControls"]["actions"])
                and scenario["controls"]["negativeControls"]["mustNotPassAsSuccess"]
                for scenario in scenarios
            ),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "ppoTrainingStarted": False,
            "newEvalRunStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "rewardFixApplied": False,
            "actionSurfaceChanged": False,
            "telemetryFixApplied": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "promoteAllowed": False,
            "rolloutAllowed": False,
        },
        "blocksNext": BLOCKED_ACTIONS,
        "opensNext": ["93S.2 Existing-Action Effekt"] if ok else [],
        "nextAllowedActions": [
            "Run BT93S.2 existing-action effect measurement on this pinned scenario contract."
        ]
        if ok
        else ["Stop: repair missing BT93S.1 scenario/control contract first."],
        "aliasesWrittenByWriteReports": [
            _rel(SCENARIO_CONTRACT_PATH),
            _rel(ACTION_EFFECT_MANIFEST_PATH),
        ],
    }
    payload["contractHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-reports", action="store_true", help="write BT93S.1 contract JSON artifacts")
    args = parser.parse_args()

    payload = build_contract()
    if args.write_reports:
        _write_json(SCENARIO_CONTRACT_PATH, payload)
        _write_json(ACTION_EFFECT_MANIFEST_PATH, payload)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if payload.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
