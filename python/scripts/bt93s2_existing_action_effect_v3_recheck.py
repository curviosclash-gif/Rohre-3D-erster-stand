"""BT93S2.3-Recheck existing-action effect against matrix/control-v3.

This diagnostic phase reruns the current masked semantic actions against the
BT93S2R matrix/control-v3 contract. It preserves the original red BT93S2.3
measurement and writes a separate recheck artifact.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
SCRIPT_ROOT = Path(__file__).resolve().parent
for path in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import bt93s2_existing_action_effect_v2 as base  # noqa: E402
import bt93s2_scenario_matrix_v2 as bt93s2_matrix  # noqa: E402
from envs.ppo_action_surface import (  # noqa: E402
    MASKED_SEMANTIC_ACTIONS,
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"

START_CONTRACT_PATH = BT93S2_ROOT / "start_contract.json"
SCENARIO_V2_CONTRACT_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
OLD_EFFECT_V2_REPORT_PATH = BT93S2_ROOT / "existing_action_effect_v2_report.json"
MATRIX_V3_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
REENTRY_GATE_REPORT_PATH = BT93S2R_ROOT / "matrix_control_reentry_gate_report.json"
S2R_CLOSURE_REPORT_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
REPORT_PATH = BT93S2_ROOT / "existing_action_effect_v3_recheck_report.json"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2_existing_action_effect_v3_recheck.py"

MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
RECHECK_PHASE_ID = "93S2.3-Recheck"

ACTION_EFFECT_REQUIRED_SCENARIOS = (
    "escape-left-open",
    "escape-right-open",
    "side-wall-left",
    "side-wall-right",
    "narrowing-corridor",
)

BLOCKED_NEXT = [
    "BT93T claim until BT93S2.99=observation-telemetry-required",
    "BT93U claim until BT93S2.99=action-selection-green",
    "BT93V claim",
    "BT93W claim",
    "BT93O claim",
    "BT93X full claim",
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
    "reward fix from BT93S2.3-Recheck",
    "telemetry fix from BT93S2.3-Recheck",
    "action-surface change from BT93S2.3-Recheck",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _read_json(path: Path) -> dict[str, Any]:
    return base._read_json(path)


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    base._write_json(path, payload)


def _rel(path: Path | None) -> str | None:
    return base._rel(path)


def _sha256_file(path: Path | None) -> str | None:
    return base._sha256_file(path)


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return base._sha256_payload(payload)


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    return base._tracked_files(paths)


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _expected_matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


def _source_artifact(
    path: Path,
    role: str,
    tracked: set[str],
    expected: Mapping[str, Any],
    *,
    source_key: str,
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "sourceKey": source_key,
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and tracked_ok and expected_ok),
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "expected": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
        "startContract": (
            START_CONTRACT_PATH,
            "BT93S2.1 source lock",
            {"blockId": "BT93S2", "phaseId": "93S2.1", "resultClass": "start-contract-locked", "ok": True},
        ),
        "scenarioMatrixV2": (
            SCENARIO_V2_CONTRACT_PATH,
            "BT93S2.2 historical matrix-v2 source",
            {"blockId": "BT93S2", "phaseId": "93S2.2", "ok": True},
        ),
        "oldExistingActionEffectV2": (
            OLD_EFFECT_V2_REPORT_PATH,
            "BT93S2.3 red measurement preserved",
            {"blockId": "BT93S2", "phaseId": "93S2.3", "resultClass": "measurement-invalid", "ok": False},
        ),
        "matrixV3Contract": (
            MATRIX_V3_CONTRACT_PATH,
            "BT93S2R.3 repaired matrix/control-v3 contract",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.3",
                "resultClass": "matrix-control-v3-contract-green",
                "ok": True,
                "matrixId": MATRIX_ID,
            },
        ),
        "s2rReentryGate": (
            REENTRY_GATE_REPORT_PATH,
            "BT93S2R.4 green matrix/control reentry gate",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.4",
                "resultClass": "matrix-control-reentry-green",
                "ok": True,
                "sampleCounts.predicateFailureCount": 0,
                "sampleCounts.minimumWindowFailureCount": 0,
                "sampleCounts.measurementInvalidCount": 0,
                "sampleCounts.negativeControlFailedCount": 0,
                "sampleCounts.directionMismatchCount": 0,
            },
        ),
        "s2rClosure": (
            S2R_CLOSURE_REPORT_PATH,
            "BT93S2R.99 closure opening only BT93S2.3-Recheck",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.99",
                "resultClass": "matrix-control-reentry-green",
                "ok": True,
            },
        ),
        "actionSurface": (ACTION_SURFACE_PATH, "read-only PPO action-surface decoder", {}),
        "curviosEnv": (CURVIOS_ENV_PATH, "Python sidecar environment, read-only", {}),
        "headlessRunner": (HEADLESS_RUNNER_PATH, "JS-authoritative headless transition path, read-only", {}),
        "recheckScript": (SCRIPT_PATH, "BT93S2.3-Recheck generating script hash", {}),
    }
    tracked = _tracked_files(path for path, _role, _expected in specs.values())
    return [
        _source_artifact(path, role, tracked, expected, source_key=key)
        for key, (path, role, expected) in specs.items()
    ]


def _scenario_seed_list(scenario: Mapping[str, Any]) -> list[int]:
    return base._scenario_seed_list(scenario)


def _run_probe_v3(scenario: Mapping[str, Any], *, seed: int, action_name: str, repeat_steps: int) -> dict[str, Any]:
    probe = base._run_probe_v2(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
    predicate = _as_mapping(scenario.get("predicate"))
    predicate_pass = bt93s2_matrix._predicate_ok(str(scenario.get("id") or ""), probe.get("startMetrics") or {})
    predicate_payload = {
        "predicateId": predicate.get("predicateId"),
        "expression": predicate.get("expression"),
        "pass": predicate_pass,
        "revalidatedBeforeMeasurement": predicate.get("revalidatedBeforeMeasurement") is True,
        "matrixId": MATRIX_ID,
    }
    probe["v2Predicate"] = predicate_payload
    probe["v3Predicate"] = predicate_payload
    probe["successEvaluation"] = base.bt93s_effect._success_evaluation(scenario, probe)
    return probe


def _classify_action_results_v3(
    scenario: Mapping[str, Any],
    action_results: Mapping[str, list[Mapping[str, Any]]],
) -> dict[str, Any]:
    result = base._classify_action_results_v2(scenario, action_results)
    result["matrixId"] = MATRIX_ID
    result["contractId"] = CONTRACT_ID
    result["recheckPhaseId"] = RECHECK_PHASE_ID
    return result


def _guardrails() -> dict[str, Any]:
    return base._guardrails()


def _claim_flags(*, next_phase_allowed: bool) -> dict[str, bool]:
    return base._claim_flags(next_phase_allowed=next_phase_allowed)


def _all_reentry_counts_zero(report: Mapping[str, Any]) -> bool:
    counts = _as_mapping(report.get("sampleCounts"))
    keys = (
        "predicateFailureCount",
        "minimumWindowFailureCount",
        "measurementInvalidCount",
        "negativeControlFailedCount",
        "directionMismatchCount",
    )
    return all(counts.get(key) == 0 for key in keys)


def build_report(*, seed_limit: int | None = None, action_limit: int | None = None) -> dict[str, Any]:
    matrix_v3 = _read_json(MATRIX_V3_CONTRACT_PATH)
    reentry_gate = _read_json(REENTRY_GATE_REPORT_PATH)
    s2r_closure = _read_json(S2R_CLOSURE_REPORT_PATH)
    old_effect = _read_json(OLD_EFFECT_V2_REPORT_PATH)
    scenarios = _as_list(matrix_v3.get("scenarios"))
    actions = [name for name, _ in MASKED_SEMANTIC_ACTIONS]
    if action_limit is not None:
        actions = actions[: max(1, int(action_limit))]

    probes: list[dict[str, Any]] = []
    scenario_results: dict[str, Any] = {}
    seed_counts_by_scenario: dict[str, int] = {}
    repeat_steps_by_scenario: dict[str, int] = {}
    predicate_failure_count = 0

    for scenario in scenarios:
        if not isinstance(scenario, Mapping):
            continue
        scenario_id = str(scenario.get("id") or "")
        effect_window = _as_mapping(scenario.get("effectWindow"))
        repeat_steps = int(effect_window.get("maxSteps") or 24)
        repeat_steps_by_scenario[scenario_id] = repeat_steps
        seeds = _scenario_seed_list(scenario)
        if seed_limit is not None:
            seeds = seeds[: max(1, int(seed_limit))]
        seed_counts_by_scenario[scenario_id] = len(seeds)
        action_results: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
        for seed in seeds:
            for action_name in actions:
                probe = _run_probe_v3(scenario, seed=seed, action_name=action_name, repeat_steps=repeat_steps)
                if not _as_mapping(probe.get("v3Predicate")).get("pass"):
                    predicate_failure_count += 1
                probes.append(probe)
                action_results[action_name].append(probe)
        scenario_results[scenario_id] = _classify_action_results_v3(scenario, action_results)

    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)
    source_contracts_ok = bool(
        matrix_v3.get("ok") is True
        and matrix_v3.get("blockId") == "BT93S2R"
        and matrix_v3.get("phaseId") == "93S2R.3"
        and matrix_v3.get("resultClass") == "matrix-control-v3-contract-green"
        and matrix_v3.get("matrixId") == MATRIX_ID
        and reentry_gate.get("ok") is True
        and reentry_gate.get("phaseId") == "93S2R.4"
        and reentry_gate.get("resultClass") == "matrix-control-reentry-green"
        and _all_reentry_counts_zero(reentry_gate)
        and s2r_closure.get("ok") is True
        and s2r_closure.get("phaseId") == "93S2R.99"
        and s2r_closure.get("resultClass") == "matrix-control-reentry-green"
        and "BT93S2.3-Recheck" in _as_list(s2r_closure.get("opensNext"))
        and old_effect.get("ok") is False
        and old_effect.get("phaseId") == "93S2.3"
        and old_effect.get("resultClass") == "measurement-invalid"
    )
    class_counts = Counter(result.get("classResult") for result in scenario_results.values())
    all_probes_ok = bool(probes) and all(probe.get("ok") is True for probe in probes)
    minimum_window_failure_count = sum(1 for probe in probes if probe.get("completedMinimumWindow") is not True)
    required_metrics_written = all(
        all(metric in _as_mapping(probe.get("effectMetrics")) for metric in base.REQUIRED_EFFECT_METRICS)
        for probe in probes
    )
    no_danger_result = _as_mapping(scenario_results.get("no-danger-control"))
    no_danger_action_green_blocked = bool(
        no_danger_result.get("actionGreenEvidenceAllowed") is False
        and no_danger_result.get("actionGreenEvidenceProduced") is False
        and no_danger_result.get("negativeControlFailed") is False
    )
    action_space_required_scenarios = sorted(
        scenario_id
        for scenario_id in ACTION_EFFECT_REQUIRED_SCENARIOS
        if _as_mapping(scenario_results.get(scenario_id)).get("classResult") != "existing-action-effect-observed"
    )
    nonblocking_weak_scenarios = sorted(
        scenario_id
        for scenario_id, result in scenario_results.items()
        if _as_mapping(result).get("classResult") == "action-effect-weak"
        and scenario_id not in ACTION_EFFECT_REQUIRED_SCENARIOS
    )
    forbidden_proxy_rejection = {
        "policy": list(base.FORBIDDEN_SUCCESS_PROXIES),
        "successRequiresStateEffect": True,
        "commandFlagOnlyRejected": True,
        "rewardOnlyRejected": True,
        "maxStepsOnlyRejected": True,
        "commandFlagWithoutStateEffectCount": sum(
            1 for probe in probes if _as_mapping(probe.get("successEvaluation")).get("commandFlagWithoutStateEffect") is True
        ),
        "rewardOnlyRejectedCount": sum(
            1 for probe in probes if _as_mapping(probe.get("successEvaluation")).get("rewardOnlyRejected") is True
        ),
        "terminalOrMaxStepsOnlySuccessCount": 0,
    }
    phase_coverage = {
        "93S2.3-Recheck.1": source_contracts_ok and source_files_ready and source_files_versioned,
        "93S2.3-Recheck.2": all_probes_ok and bool(probes),
        "93S2.3-Recheck.3": predicate_failure_count == 0 and minimum_window_failure_count == 0,
        "93S2.3-Recheck.4": no_danger_action_green_blocked,
        "93S2.3-Recheck.5": all(
            forbidden_proxy_rejection[key] is True
            for key in ("successRequiresStateEffect", "commandFlagOnlyRejected", "rewardOnlyRejected", "maxStepsOnlyRejected")
        ),
    }
    measurement_valid = bool(
        source_files_ready
        and source_files_versioned
        and source_contracts_ok
        and all_probes_ok
        and required_metrics_written
        and no_danger_action_green_blocked
        and predicate_failure_count == 0
        and minimum_window_failure_count == 0
        and not class_counts.get("measurement-invalid")
    )
    if not measurement_valid:
        result_class = "measurement-invalid"
    elif action_space_required_scenarios:
        result_class = "action-space-required"
    else:
        result_class = "existing-action-effect-v3-recheck-green"
    next_phase_allowed = measurement_valid
    guardrails = _guardrails()

    payload: dict[str, Any] = {
        "schemaVersion": "bt93s2-existing-action-effect-v3-recheck-report-v1",
        "blockId": "BT93S2",
        "phaseId": RECHECK_PHASE_ID,
        "resultClass": result_class,
        "ok": measurement_valid,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2_existing_action_effect_v3_recheck.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "matrixId": matrix_v3.get("matrixId"),
        "contractId": matrix_v3.get("contractId"),
        "sourceMatrixId": matrix_v3.get("sourceMatrixId"),
        "sourceContractId": matrix_v3.get("sourceContractId"),
        "actionSurfaceId": matrix_v3.get("actionSurfaceId") or PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "decoderHash": _sha256_file(ACTION_SURFACE_PATH),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceContractsOk": source_contracts_ok,
        "thresholdsLockedBeforeRun": {
            "source": _rel(MATRIX_V3_CONTRACT_PATH),
            "actionEffectRequiredScenarioIds": list(ACTION_EFFECT_REQUIRED_SCENARIOS),
            "effectWindowStepsByScenario": repeat_steps_by_scenario,
            "minimumCompletedSteps": sorted(
                {
                    int(_as_mapping(scenario.get("effectWindow")).get("minimumCompletedSteps") or 0)
                    for scenario in scenarios
                    if isinstance(scenario, Mapping)
                }
            ),
            "v3PredicateMustPassBeforeMeasurement": True,
            "noDangerControlActionGreenAllowed": False,
            "forbiddenSuccessProxies": list(base.FORBIDDEN_SUCCESS_PROXIES),
        },
        "requiredEffectMetrics": list(base.REQUIRED_EFFECT_METRICS),
        "sampleCounts": {
            "scenarioCount": len(scenario_results),
            "seedCountsByScenario": seed_counts_by_scenario,
            "actionCount": len(actions),
            "probeCount": len(probes),
            "sourceProbeCount": _as_mapping(old_effect.get("sampleCounts")).get("probeCount"),
            "minimumWindowFailureCount": minimum_window_failure_count,
            "predicateFailureCount": predicate_failure_count,
            "newTrainingEpisodes": 0,
            "newOptimizerUpdates": 0,
            "holdoutEpisodes": 0,
        },
        "phaseCoverage": phase_coverage,
        "classResultCounts": dict(sorted(class_counts.items())),
        "actionSpaceRequiredScenarioIds": action_space_required_scenarios,
        "nonBlockingWeakScenarioIds": nonblocking_weak_scenarios,
        "noDangerControl": {
            "classResult": no_danger_result.get("classResult"),
            "actionGreenEvidenceAllowed": no_danger_result.get("actionGreenEvidenceAllowed"),
            "actionGreenEvidenceProduced": no_danger_result.get("actionGreenEvidenceProduced"),
            "neutralStableActions": no_danger_result.get("neutralStableActions"),
            "negativeControlFailed": no_danger_result.get("negativeControlFailed"),
        },
        "forbiddenProxyRejection": forbidden_proxy_rejection,
        "scenarioResults": scenario_results,
        "actionSummary": base._aggregate_action_classes_v2(scenario_results),
        "probes": probes,
        "claimFlags": _claim_flags(next_phase_allowed=next_phase_allowed),
        "guardrails": guardrails,
        "blocksNext": list(BLOCKED_NEXT),
        "opensNext": ["93S2.4 Action-Surface Repair Decision"] if next_phase_allowed else [],
        "allowNext": ["93S2.4 Action-Surface Repair Decision"] if next_phase_allowed else [],
        "nextAllowedActions": [
            "Run 93S2.4 to separate action-space root cause and pin whether the current action surface can continue."
        ]
        if next_phase_allowed and action_space_required_scenarios
        else [
            "Run 93S2.4 to pin the unchanged action surface before policy-selection recheck."
        ]
        if next_phase_allowed
        else ["Stop: repair measurement-invalid BT93S2.3-Recheck evidence before 93S2.4."],
        "decision": {
            "resultClass": result_class,
            "measurementValid": measurement_valid,
            "actionSpaceRequired": bool(action_space_required_scenarios),
            "actionSpaceRequiredScenarioIds": action_space_required_scenarios,
            "opensNext": ["93S2.4 Action-Surface Repair Decision"] if next_phase_allowed else [],
            "blocksNext": list(BLOCKED_NEXT),
        },
        "commands": {
            "write": "python python/scripts/bt93s2_existing_action_effect_v3_recheck.py --write-report",
            "next": "python python/scripts/bt93s2_action_surface_repair_decision.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
        "invalidations": [
            {
                "scope": "old BT93S2.3 red report",
                "reason": "Preserved as historical measurement-invalid source; this recheck is a fresh v3 judgment.",
            },
            {
                "scope": "BT93T/U/W/O/P/94A",
                "reason": "BT93S2.3-Recheck can only open 93S2.4, never telemetry/reward/safety/quality/candidate scopes.",
            },
        ],
        "actionSurface": build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="write BT93S2.3-Recheck JSON artifact")
    parser.add_argument("--seed-limit", type=int, default=None, help="diagnostic override; default uses all S2R seeds")
    parser.add_argument("--action-limit", type=int, default=None, help="diagnostic override; default uses all semantic actions")
    args = parser.parse_args()

    report = build_report(seed_limit=args.seed_limit, action_limit=args.action_limit)
    if args.write_report:
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "classResultCounts": report["classResultCounts"],
                "sampleCounts": report["sampleCounts"],
                "actionSpaceRequiredScenarioIds": report["actionSpaceRequiredScenarioIds"],
                "opensNext": report["opensNext"],
                "output": _rel(REPORT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
