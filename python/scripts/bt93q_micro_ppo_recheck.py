"""BT93Q.6 guarded 10k micro-PPO recheck contract.

The recheck is allowed only after the wall/trail cause and the narrow fix are
both green enough to justify a diagnostic 10k run. In the current BT93Q state
the prerequisite reports are still red, so this script writes the versioned
contract plus a non-started report and keeps all larger/candidate lanes closed.
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
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    build_action_surface_manifest,
)


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93Q_ROOT = PPO_ROOT / "bt93q"
CONTRACT_PATH = BT93Q_ROOT / "micro_ppo_recheck_contract.json"
REPORT_PATH = BT93Q_ROOT / "micro_ppo_recheck_report.json"

POLICY_COLLAPSE_PATH = BT93Q_ROOT / "policy_collapse_report.json"
WALLTRAIL_STRESS_PATH = BT93Q_ROOT / "action_effect_stress_report.json"
FIX_MANIFEST_PATH = BT93Q_ROOT / "fix_manifest.json"
FIX_DELTA_PATH = BT93Q_ROOT / "fix_delta_report.json"
SCENARIO_MANIFEST_PATH = BT93Q_ROOT / "walltrail_scenario_manifest.json"
TELEMETRY_GAP_PATH = BT93Q_ROOT / "observation_telemetry_gap_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"

DEFAULT_TIMESTEPS = 10_000
DEFAULT_TRAIN_SEED = 934
DEFAULT_EVAL_SEEDS = (944, 945, 946)
DEFAULT_EVAL_STEPS_PER_SEED = 2700
DEFAULT_MAX_STEPS = 180
REWARD_PROFILE_ID = "bt93l-objective-reachability-v1"
MATRIX_ID = "bt93q-walltrail-policy-recheck-v1"
SEMANTIC_WINDOW = "bt93q-walltrail-10k-diagnostic-window"

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
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _source_artifacts() -> dict[str, Any]:
    paths = {
        "policyCollapse": POLICY_COLLAPSE_PATH,
        "walltrailStress": WALLTRAIL_STRESS_PATH,
        "fixManifest": FIX_MANIFEST_PATH,
        "fixDelta": FIX_DELTA_PATH,
        "scenarioManifest": SCENARIO_MANIFEST_PATH,
        "telemetryGap": TELEMETRY_GAP_PATH,
        "actionSurface": ACTION_SURFACE_PATH,
        "curviosEnv": CURVIOS_ENV_PATH,
        "headlessRunner": HEADLESS_RUNNER_PATH,
    }
    roles = {
        "policyCollapse": "BT93Q.3 deterministic policy-collapse decision",
        "walltrailStress": "BT93Q.4 action-effect stress matrix",
        "fixManifest": "BT93Q.5 selected narrow fix manifest",
        "fixDelta": "BT93Q.5 post-fix delta decision",
        "scenarioManifest": "BT93Q.4 pinned wall/trail scenario matrix",
        "telemetryGap": "BT93Q.2 observation/telemetry gap decision",
        "actionSurface": "BT93Q sidecar masked semantic action surface",
        "curviosEnv": "Python sidecar environment",
        "headlessRunner": "JS headless lane runner",
    }
    tracked = _tracked_files(paths.values())
    return {key: _source(path, roles[key], tracked) for key, path in paths.items()}


def _gate_bool(value: Any) -> bool:
    return value is True


def _build_start_gate() -> dict[str, Any]:
    policy_collapse = _read_json(POLICY_COLLAPSE_PATH)
    stress = _read_json(WALLTRAIL_STRESS_PATH)
    fix_manifest = _read_json(FIX_MANIFEST_PATH)
    fix_delta = _read_json(FIX_DELTA_PATH)
    telemetry_gap = _read_json(TELEMETRY_GAP_PATH)
    checks = {
        "policyCollapseResolvedOrExplained": policy_collapse.get("resultClass") != "policy-collapse-active",
        "stressMatrixHasNoActionSpaceBlocker": stress.get("resultClass") != "action-space-required",
        "fixClassLocked": fix_manifest.get("oneFixClassOnly") is True and bool(fix_manifest.get("fixClass")),
        "fixDeltaAllowsMicroRecheck": _gate_bool(fix_delta.get("decision", {}).get("microPpoRecheckAllowed")),
        "postFixResultNotInsufficient": fix_delta.get("resultClass") != "action-fix-insufficient",
        "telemetryGapNonBlocking": telemetry_gap.get("resultClass") != "observation-telemetry-required",
        "sourceFilesReady": all(source.get("exists") and source.get("isFile") for source in _source_artifacts().values()),
        "sourceFilesVersioned": all(source.get("tracked") for source in _source_artifacts().values()),
    }
    blocker_map = {
        "policyCollapseResolvedOrExplained": "policy-collapse-active",
        "stressMatrixHasNoActionSpaceBlocker": "action-space-required",
        "fixDeltaAllowsMicroRecheck": "micro-ppo-recheck-not-allowed",
        "postFixResultNotInsufficient": "action-fix-insufficient",
        "telemetryGapNonBlocking": "observation-telemetry-required",
        "sourceFilesReady": "source-artifact-missing",
        "sourceFilesVersioned": "source-artifact-unversioned",
    }
    blockers = [
        {"id": key, "resultClass": blocker_map.get(key, "start-gate-blocked")}
        for key, passed in checks.items()
        if not passed
    ]
    return {
        "passed": not blockers,
        "checks": checks,
        "blockers": blockers,
        "sourceResultClasses": {
            "policyCollapse": policy_collapse.get("resultClass"),
            "walltrailStress": stress.get("resultClass"),
            "fixManifest": fix_manifest.get("resultClass"),
            "fixDelta": fix_delta.get("resultClass"),
            "telemetryGap": telemetry_gap.get("resultClass"),
        },
    }


def _result_class(start_gate: Mapping[str, Any]) -> str:
    classes = [str(item.get("resultClass")) for item in start_gate.get("blockers") or [] if item.get("resultClass")]
    for candidate in (
        "policy-collapse-active",
        "action-space-required",
        "observation-telemetry-required",
        "action-fix-insufficient",
        "micro-ppo-recheck-not-allowed",
    ):
        if candidate in classes:
            return candidate if candidate != "action-fix-insufficient" else "action-space-required"
    return "micro-ppo-10k-green-diagnose-only"


def _build_contract(
    *,
    total_timesteps: int,
    train_seed: int,
    eval_seeds: tuple[int, ...],
    eval_steps_per_seed: int,
    max_steps: int,
) -> dict[str, Any]:
    start_gate = _build_start_gate()
    scenario_manifest = _read_json(SCENARIO_MANIFEST_PATH)
    return {
        "schemaVersion": "bt93q-micro-ppo-recheck-contract-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_micro_ppo_recheck.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": True,
        "blockId": "BT93Q",
        "phaseId": "93Q.6",
        "matrixId": MATRIX_ID,
        "semanticWindow": SEMANTIC_WINDOW,
        "scenarioMatrix": {
            "sourcePath": _rel(SCENARIO_MANIFEST_PATH),
            "scenarioClasses": scenario_manifest.get("scenarioClasses") or [],
            "scenarioCount": scenario_manifest.get("scenarioCount"),
            "mapKey": "standard",
            "domainMode": "classic-3d",
            "gameMode": "CLASSIC",
        },
        "rewardProfileId": REWARD_PROFILE_ID,
        "actionSurface": build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID),
        "policyIds": {
            "train": "ppo-bt93q-micro-10k-stochastic",
            "eval": "ppo-bt93q-micro-10k-deterministic",
        },
        "runContract": {
            "requestedTimesteps": int(total_timesteps),
            "maximumTimesteps": 10_000,
            "extension50kExecuted": False,
            "extension50kAllowedInThisBlock": False,
            "extension100kAllowedInThisBlock": False,
            "maxStepsPerEpisode": int(max_steps),
            "trainSeed": int(train_seed),
            "evalSeeds": list(eval_seeds),
            "evalStepsPerSeed": int(eval_steps_per_seed),
            "holdoutStatus": "not-used; freeze holdout remains reserved",
        },
        "statisticalCorridor": {
            "lockedBeforeRun": True,
            "deathBefore60TrainMax": 0,
            "deathBefore60EvalMax": 0,
            "deterministicEvalSingleActionShareMax": 0.85,
            "repeatedActionStreakMax": 600,
            "progressSignalReachableMinTrain": 1,
            "objectiveSignalReachableMinTrain": 1,
            "progressSignalReachableMinEval": 1,
            "objectiveSignalReachableMinEval": 1,
            "runtimeErrorCountMax": 0,
            "invalidActionRateMax": 0.0,
            "postDecodeClampRateMax": 0.0,
            "sanitizerRateMax": 0.0,
            "afterTheFactThresholdChangesAllowed": False,
        },
        "startGate": start_gate,
        "resultClasses": [
            "micro-ppo-10k-green-diagnose-only",
            "death-before60-still-blocking",
            "policy-collapse-active",
            "action-space-required",
            "observation-telemetry-required",
            "reward-redesign-required",
            "terminal-semantics-required",
            "measurement-invalid",
        ],
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStartedAtContractWrite": False,
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
        "sourceArtifacts": _source_artifacts(),
    }


def _empty_metric_block() -> dict[str, Any]:
    return {
        "executed": False,
        "deathBefore60Count": None,
        "playerDeadShare": None,
        "actionDistribution": {},
        "repeatedActionStreaks": {},
        "entropyLogitSnapshot": {},
        "progressSignalReachableCount": None,
        "objectiveSignalReachableCount": None,
        "rewardBreakdownTotals": {},
        "safetyMaxRates": {
            "invalidActionRate": None,
            "postDecodeClampRate": None,
            "sanitizerRate": None,
        },
        "runtimeErrorCount": None,
    }


def _phase_coverage(contract: Mapping[str, Any], report_result_class: str) -> dict[str, bool]:
    run_contract = contract.get("runContract") if isinstance(contract.get("runContract"), Mapping) else {}
    corridor = contract.get("statisticalCorridor") if isinstance(contract.get("statisticalCorridor"), Mapping) else {}
    start_gate = contract.get("startGate") if isinstance(contract.get("startGate"), Mapping) else {}
    required_contract_keys = (
        "matrixId",
        "semanticWindow",
        "rewardProfileId",
        "actionSurface",
        "runContract",
        "statisticalCorridor",
    )
    required_metric_keys = (
        "deathBefore60Count",
        "playerDeadShare",
        "actionDistribution",
        "repeatedActionStreaks",
        "entropyLogitSnapshot",
        "progressSignalReachableCount",
        "objectiveSignalReachableCount",
        "rewardBreakdownTotals",
        "safetyMaxRates",
        "runtimeErrorCount",
    )
    train_schema = _empty_metric_block()
    eval_schema = _empty_metric_block()
    return {
        "93Q.6.1": start_gate.get("passed") is False or start_gate.get("passed") is True,
        "93Q.6.2": all(key in contract for key in required_contract_keys)
        and bool(run_contract.get("evalSeeds"))
        and corridor.get("afterTheFactThresholdChangesAllowed") is False,
        "93Q.6.3": int(run_contract.get("requestedTimesteps") or 0) <= 10_000
        and run_contract.get("extension50kExecuted") is False
        and run_contract.get("extension100kAllowedInThisBlock") is False,
        "93Q.6.4": all(key in train_schema and key in eval_schema for key in required_metric_keys),
        "93Q.6.5": report_result_class in {
            "micro-ppo-10k-green-diagnose-only",
            "death-before60-still-blocking",
            "policy-collapse-active",
            "action-space-required",
            "observation-telemetry-required",
            "reward-redesign-required",
            "terminal-semantics-required",
            "measurement-invalid",
        },
    }


def build_report(
    *,
    total_timesteps: int,
    train_seed: int,
    eval_seeds: tuple[int, ...],
    eval_steps_per_seed: int,
    max_steps: int,
) -> tuple[dict[str, Any], dict[str, Any]]:
    contract = _build_contract(
        total_timesteps=total_timesteps,
        train_seed=train_seed,
        eval_seeds=eval_seeds,
        eval_steps_per_seed=eval_steps_per_seed,
        max_steps=max_steps,
    )
    start_gate = contract["startGate"]
    result_class = _result_class(start_gate)
    training_started = bool(start_gate["passed"])
    if training_started:
        # The current BT93Q path is expected to be blocked before this branch.
        # Keep the script defensive rather than silently starting an unimplemented run.
        result_class = "measurement-invalid"
        start_gate = {
            **start_gate,
            "passed": False,
            "blockers": [
                *list(start_gate.get("blockers") or []),
                {"id": "implementation-guard", "resultClass": "measurement-invalid"},
            ],
        }
        contract["startGate"] = start_gate
        training_started = False

    phase_coverage = _phase_coverage(contract, result_class)
    guard_blockers = list(start_gate.get("blockers") or [])
    report = {
        "schemaVersion": "bt93q-micro-ppo-recheck-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93q_micro_ppo_recheck.py",
        "git": contract["git"],
        "ok": bool(all(phase_coverage.values())),
        "blockId": "BT93Q",
        "phaseId": "93Q.6",
        "resultClass": result_class,
        "matrixId": contract["matrixId"],
        "semanticWindow": contract["semanticWindow"],
        "policyIds": contract["policyIds"],
        "phaseCoverage": phase_coverage,
        "contract": {
            "path": _rel(CONTRACT_PATH),
            "sha256": _sha256_file(CONTRACT_PATH),
            "lockedBeforeRun": contract.get("statisticalCorridor", {}).get("lockedBeforeRun") is True,
            "statisticalCorridor": contract.get("statisticalCorridor"),
        },
        "startGate": start_gate,
        "requestedTimesteps": int(total_timesteps),
        "actualModelTimesteps": 0,
        "sampleCounts": {
            "trainSteps": 0,
            "trainCompletedEpisodes": 0,
            "evalSteps": 0,
            "evalCompletedEpisodes": 0,
            "evalSeeds": list(eval_seeds),
            "requestedTimesteps": int(total_timesteps),
            "actualModelTimesteps": 0,
        },
        "invalidations": guard_blockers,
        "trainSummary": {
            **_empty_metric_block(),
            "notMeasuredReason": "start-gate-blocked",
        },
        "evalSummary": {
            **_empty_metric_block(),
            "notMeasuredReason": "start-gate-blocked",
        },
        "greenCriteria": {
            "deathBefore60TrainEqualsZero": None,
            "deathBefore60EvalEqualsZero": None,
            "deterministicEvalDistributionNonCollapsed": None,
            "progressOrObjectiveNonzero": None,
            "green": False,
            "notGreenReason": result_class,
        },
        "decision": {
            "resultClass": result_class,
            "recheckStarted": training_started,
            "extension50kAllowed": False,
            "extension50kExecuted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "opensNext": [],
            "blocksNext": [
                "93Q.99 green closure",
                *BLOCKED_ACTIONS,
            ],
            "nextAllowedActions": [
                "close BT93Q honestly with the red result class",
                "do not claim BT93O while policy/action/telemetry blockers remain active",
                "do not start a 50k/100k/200k extension in BT93Q",
            ],
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": training_started,
            "trainingRunKind": "bt93q-micro-ppo-recheck" if training_started else "not-started-start-gate-blocked",
            "baselineRun": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "sourceArtifacts": {
            **contract["sourceArtifacts"],
            "microPpoRecheckContract": _source(CONTRACT_PATH, "BT93Q.6 pre-run recheck contract", set()),
        },
        "commands": {
            "write": (
                "python python/scripts/bt93q_micro_ppo_recheck.py --write-report "
                f"--total-timesteps {int(total_timesteps)} --eval-steps-per-seed {int(eval_steps_per_seed)}"
            ),
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }
    return contract, report


def main() -> int:
    global CONTRACT_PATH, REPORT_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93Q_ROOT)
    parser.add_argument("--total-timesteps", type=int, default=DEFAULT_TIMESTEPS)
    parser.add_argument("--train-seed", type=int, default=DEFAULT_TRAIN_SEED)
    parser.add_argument("--eval-seeds", default=",".join(str(seed) for seed in DEFAULT_EVAL_SEEDS))
    parser.add_argument("--eval-steps-per-seed", type=int, default=DEFAULT_EVAL_STEPS_PER_SEED)
    parser.add_argument("--max-steps", type=int, default=DEFAULT_MAX_STEPS)
    args = parser.parse_args()

    output_root = args.output_root.resolve()
    CONTRACT_PATH = output_root / "micro_ppo_recheck_contract.json"
    REPORT_PATH = output_root / "micro_ppo_recheck_report.json"
    eval_seeds = tuple(
        int(seed.strip())
        for seed in str(args.eval_seeds).split(",")
        if seed.strip()
    ) or DEFAULT_EVAL_SEEDS
    contract, report = build_report(
        total_timesteps=max(1, min(10_000, int(args.total_timesteps))),
        train_seed=int(args.train_seed),
        eval_seeds=eval_seeds,
        eval_steps_per_seed=max(1, int(args.eval_steps_per_seed)),
        max_steps=max(1, int(args.max_steps)),
    )
    if args.write_report:
        _write_json(CONTRACT_PATH, contract)
        report["contract"]["sha256"] = _sha256_file(CONTRACT_PATH)
        report["sourceArtifacts"]["microPpoRecheckContract"] = _source(
            CONTRACT_PATH,
            "BT93Q.6 pre-run recheck contract",
            set(),
        )
        _write_json(REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "startGate": report["startGate"],
                "sampleCounts": report["sampleCounts"],
                "decision": report["decision"],
                "outputs": {
                    "contract": _rel(CONTRACT_PATH),
                    "report": _rel(REPORT_PATH),
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
