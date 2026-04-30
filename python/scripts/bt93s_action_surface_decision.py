"""BT93S.3 sidecar action-surface decision.

This phase is decision-only. It may record whether a sidecar action-surface
change is justified by BT93S.2, but it must not start PPO training, consume a
holdout, or touch productive runtime surfaces.
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
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S_ROOT = PPO_ROOT / "bt93s"
SCENARIO_CONTRACT_PATH = BT93S_ROOT / "scenario_window_contract.json"
ACTION_EFFECT_MANIFEST_PATH = BT93S_ROOT / "action_effect_window_manifest.json"
EXISTING_ACTION_EFFECT_PATH = BT93S_ROOT / "existing_action_effect_report.json"
ACTION_SURFACE_DECISION_PATH = BT93S_ROOT / "action_surface_decision.json"
BT93RR_HANDOVER_PATH = PPO_ROOT / "bt93r_reentry" / "bt93r_reentry_handover_package.json"

ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

COMPOUND_ACTIONS = ("turn-left-boost", "turn-right-boost", "evade-left", "evade-right")
SAFETY_RATE_FIELDS = ("invalidActionRate", "postDecodeClampRate", "sanitizerRate", "vetoRate")
ALLOWED_RESULT_CLASSES = {
    "action-space-required",
    "matrix-redesign-required",
    "measurement-invalid",
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
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S.3",
    "telemetry fix from BT93S.3",
    "policy-selection green before 93S.4",
    "BT93U until 93S.99 proves action-selection-green and no telemetry blocker",
]


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


def _source(path: Path, role: str, tracked: set[str], expected: Mapping[str, Any] | None = None) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    expected_fields = dict(expected or {})
    actual_fields = {_key: _get(payload, *_key.split(".")) for _key in expected_fields}
    expected_ok = all(actual_fields[key] == value for key, value in expected_fields.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and tracked_ok and expected_ok),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "expectedFields": expected_fields,
        "actualFields": actual_fields,
    }


def _source_artifacts() -> dict[str, Any]:
    specs = {
        "scenarioWindowContract": (
            SCENARIO_CONTRACT_PATH,
            "BT93S.1 pinned scenario-window contract",
            {"blockId": "BT93S", "phaseId": "93S.1", "ok": True},
        ),
        "actionEffectWindowManifest": (
            ACTION_EFFECT_MANIFEST_PATH,
            "BT93S.1 action-effect window alias",
            {"blockId": "BT93S", "phaseId": "93S.1", "ok": True},
        ),
        "existingActionEffect": (
            EXISTING_ACTION_EFFECT_PATH,
            "BT93S.2 existing-action effect evidence",
            {"blockId": "BT93S", "phaseId": "93S.2", "ok": True},
        ),
        "bt93rrHandover": (
            BT93RR_HANDOVER_PATH,
            "BT93RR R-Allowlist handover opening only BT93S",
            {"blockId": "BT93RR", "phaseId": "93RR.99", "ok": True},
        ),
        "actionSurface": (
            ACTION_SURFACE_PATH,
            "current masked semantic PPO action surface",
            {},
        ),
        "curviosEnv": (
            CURVIOS_ENV_PATH,
            "Python sidecar environment",
            {},
        ),
        "headlessRunner": (
            HEADLESS_RUNNER_PATH,
            "JS-authoritative headless transition path",
            {},
        ),
    }
    tracked = _tracked_files(path for path, _role, _expected in specs.values())
    return {
        key: _source(path, role, tracked, expected)
        for key, (path, role, expected) in specs.items()
    }


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_float(value: Any) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return 0.0
    return result if result == result else 0.0


def _max_safety_rates(effect_report: Mapping[str, Any]) -> dict[str, Any]:
    maxima = {field: 0.0 for field in SAFETY_RATE_FIELDS}
    nonzero: list[dict[str, Any]] = []
    probe_count = 0
    row_count = 0
    for probe in effect_report.get("probes") or []:
        if not isinstance(probe, Mapping):
            continue
        probe_count += 1
        telemetry = probe.get("safetyTelemetry") if isinstance(probe.get("safetyTelemetry"), Mapping) else {}
        if telemetry:
            row_count += 1
            for field in SAFETY_RATE_FIELDS:
                value = _as_float(telemetry.get(field))
                maxima[field] = max(maxima[field], value)
                if value != 0.0:
                    nonzero.append(
                        {
                            "scenarioId": probe.get("scenarioId"),
                            "actionName": probe.get("actionName"),
                            "seed": probe.get("seed"),
                            "field": field,
                            "value": value,
                        }
                    )
    return {
        "probeCount": probe_count,
        "telemetryRowCount": row_count,
        "maxRates": {field: round(value, 6) for field, value in maxima.items()},
        "allRequiredRatesPresent": row_count == probe_count and all(field in maxima for field in SAFETY_RATE_FIELDS),
        "allRequiredRatesZero": all(value == 0.0 for value in maxima.values()),
        "nonzeroRateSamples": nonzero[:12],
    }


def _scenario_classes(effect_report: Mapping[str, Any]) -> dict[str, str]:
    scenario_results = effect_report.get("scenarioResults") if isinstance(effect_report.get("scenarioResults"), Mapping) else {}
    return {
        str(scenario_id): str(result.get("classResult") or "missing")
        for scenario_id, result in scenario_results.items()
        if isinstance(result, Mapping)
    }


def _decision_inputs(effect_report: Mapping[str, Any]) -> dict[str, list[str]]:
    decision = effect_report.get("decision") if isinstance(effect_report.get("decision"), Mapping) else {}
    scenario_classes = _scenario_classes(effect_report)
    return {
        "actionEffectGapScenarioIds": sorted(str(item) for item in decision.get("actionEffectGapScenarioIds") or []),
        "telemetryStillLimitedScenarioIds": sorted(str(item) for item in decision.get("telemetryStillLimitedScenarioIds") or []),
        "matrixRedesignScenarioIds": sorted(
            scenario_id for scenario_id, class_result in scenario_classes.items() if class_result == "matrix-redesign-required"
        ),
        "measurementInvalidScenarioIds": sorted(
            scenario_id for scenario_id, class_result in scenario_classes.items() if class_result == "measurement-invalid"
        ),
    }


def _surface_manifest() -> dict[str, Any]:
    manifest = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    manifest["decoderHash"] = _sha256_file(ACTION_SURFACE_PATH)
    manifest["decoderPath"] = _rel(ACTION_SURFACE_PATH)
    return manifest


def _surface_drift(
    *,
    effect_report: Mapping[str, Any],
    scenario_contract: Mapping[str, Any],
    current_surface: Mapping[str, Any],
) -> dict[str, Any]:
    effect_surface_id = effect_report.get("actionSurfaceId")
    effect_decoder_hash = effect_report.get("decoderHash")
    scenario_surface = scenario_contract.get("actionSurface") if isinstance(scenario_contract.get("actionSurface"), Mapping) else {}
    scenario_surface_id = scenario_surface.get("surfaceId")
    scenario_decoder_hash = scenario_surface.get("decoderHash")
    current_surface_id = current_surface.get("surfaceId")
    current_decoder_hash = current_surface.get("decoderHash")
    return {
        "currentActionSurfaceId": current_surface_id,
        "currentDecoderHash": current_decoder_hash,
        "effectReportActionSurfaceId": effect_surface_id,
        "effectReportDecoderHash": effect_decoder_hash,
        "scenarioContractActionSurfaceId": scenario_surface_id,
        "scenarioContractDecoderHash": scenario_decoder_hash,
        "actionSurfaceChangedSince93S2": current_surface_id != effect_surface_id,
        "decoderChangedSince93S2": current_decoder_hash != effect_decoder_hash,
        "actionSurfaceChangedSince93S1": current_surface_id != scenario_surface_id,
        "decoderChangedSince93S1": current_decoder_hash != scenario_decoder_hash,
    }


def build_report() -> dict[str, Any]:
    scenario_contract = _read_json(SCENARIO_CONTRACT_PATH)
    effect_report = _read_json(EXISTING_ACTION_EFFECT_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(artifact["exists"] and artifact["isFile"] for artifact in source_artifacts.values())
    source_files_versioned = all(artifact["tracked"] for artifact in source_artifacts.values())
    current_surface = _surface_manifest()
    drift = _surface_drift(
        effect_report=effect_report,
        scenario_contract=scenario_contract,
        current_surface=current_surface,
    )
    safety_rates = _max_safety_rates(effect_report)
    inputs = _decision_inputs(effect_report)
    action_gap_exists = bool(inputs["actionEffectGapScenarioIds"])
    matrix_redesign_required = bool(inputs["matrixRedesignScenarioIds"])
    measurement_invalid = bool(inputs["measurementInvalidScenarioIds"])
    surface_unchanged = not drift["actionSurfaceChangedSince93S2"] and not drift["decoderChangedSince93S2"]
    action_names = [name for name, _patch in MASKED_SEMANTIC_ACTIONS]
    compound_actions_present = [action for action in COMPOUND_ACTIONS if action in action_names]

    if not source_files_ready or not source_files_versioned or measurement_invalid or not effect_report:
        result_class = "measurement-invalid"
        decision = "stop-measurement-invalid"
    elif matrix_redesign_required:
        result_class = "matrix-redesign-required"
        decision = "defer-action-surface-change-until-matrix-redesign"
    elif action_gap_exists:
        result_class = "action-space-required"
        decision = "action-surface-change-required-after-gap-evidence"
    else:
        result_class = "measurement-invalid"
        decision = "stop-no-action-gap-evidence"

    new_action_introduced = False
    proposed_new_actions: list[dict[str, Any]] = []
    invalidated_comparison_artifacts: list[dict[str, Any]] = []
    if result_class == "action-space-required":
        proposed_new_actions = [
            {
                "actionName": "escape-right-compound",
                "targetScenarioIds": inputs["actionEffectGapScenarioIds"],
                "status": "proposal-only-not-implemented-in-93S.3",
                "requiredBeforeImplementation": [
                    "matrix contract remains valid",
                    "decoder hash will change and must invalidate same-matrix comparisons",
                    "fresh 93S.2 measurement against new surface",
                ],
            }
        ]
        invalidated_comparison_artifacts = [
            {
                "path": _rel(EXISTING_ACTION_EFFECT_PATH),
                "reason": "would be invalid after any future action-surface or decoder change",
            }
        ]

    phase_coverage = {
        "DoD.S3": bool(
            current_surface.get("surfaceId")
            and current_surface.get("decoderHash")
            and isinstance(invalidated_comparison_artifacts, list)
        ),
        "93S.3.1": bool((not new_action_introduced and action_gap_exists) or proposed_new_actions),
        "93S.3.2": bool(
            safety_rates["allRequiredRatesPresent"]
            and {"actionSurfaceChangedSince93S2", "decoderChangedSince93S2"} <= set(drift)
            and current_surface.get("surfaceId")
            and current_surface.get("decoderHash")
        ),
    }
    ok = bool(
        source_files_ready
        and source_files_versioned
        and result_class in ALLOWED_RESULT_CLASSES
        and all(phase_coverage.values())
        and surface_unchanged
    )
    payload: dict[str, Any] = {
        "schemaVersion": "bt93s-action-surface-decision-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s_action_surface_decision.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": ok,
        "blockId": "BT93S",
        "phaseId": "93S.3",
        "resultClass": result_class if ok else "measurement-invalid",
        "matrixId": scenario_contract.get("matrixId") or effect_report.get("matrixId"),
        "actionSurfaceId": current_surface.get("surfaceId"),
        "decoderHash": current_surface.get("decoderHash"),
        "phaseCoverage": phase_coverage,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceArtifacts": source_artifacts,
        "actionSurfaceDecision": {
            "decision": decision,
            "newActionIntroduced": new_action_introduced,
            "newOrCompoundActionsOnlyWithActionGapEvidence": bool(action_gap_exists),
            "actionEffectGapScenarioIds": inputs["actionEffectGapScenarioIds"],
            "matrixRedesignScenarioIds": inputs["matrixRedesignScenarioIds"],
            "telemetryStillLimitedScenarioIds": inputs["telemetryStillLimitedScenarioIds"],
            "compoundActionsAlreadyPresent": compound_actions_present,
            "proposedNewActions": proposed_new_actions,
            "implementationStatus": "decision-only-no-action-surface-file-change",
            "reason": (
                "BT93S.2 contains an action gap, but no-danger-control is matrix-redesign-required; changing the "
                "action surface now would create a new comparator before the matrix/control contract is valid."
            )
            if matrix_redesign_required
            else "BT93S.2 contains action-gap evidence without a matrix-redesign blocker; a future narrow action-surface fix is required.",
        },
        "safetyRates": safety_rates,
        "surfaceDrift": drift,
        "actionSurfaceManifest": current_surface,
        "invalidatedComparisonArtifacts": invalidated_comparison_artifacts,
        "sampleCounts": effect_report.get("sampleCounts") if isinstance(effect_report.get("sampleCounts"), Mapping) else {},
        "allowNext": ["93S.4 Policy-Selection guard/report using this decision"] if ok else [],
        "blocksNext": list(BLOCKED_ACTIONS),
        "claimFlags": {
            "bt93tClaimAllowed": False,
            "bt93uClaimAllowed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "freezeAllowed": False,
            "promoteAllowed": False,
            "rolloutAllowed": False,
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "ppoTrainingStarted": False,
            "newEvalRunStarted": False,
            "actionSurfaceChanged": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "holdoutUsed": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "rewardFixApplied": False,
            "telemetryFixApplied": False,
        },
        "commands": {
            "write": "python python/scripts/bt93s_action_surface_decision.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(ACTION_SURFACE_DECISION_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "actionSurfaceDecision": report["actionSurfaceDecision"],
                "safetyRates": report["safetyRates"],
                "surfaceDrift": report["surfaceDrift"],
                "output": _rel(ACTION_SURFACE_DECISION_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
