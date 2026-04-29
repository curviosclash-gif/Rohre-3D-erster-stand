"""BT93N.4 50k/100k stability ladder gate.

This phase is diagnostic-only. It starts no ladder stage unless the BT93N.3
10k report explicitly opens the 50k extension. If the 10k gate is red, the
script writes a closure-capable no-run report and keeps BT93O/BT94A blocked.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))


PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93N_ROOT = PPO_ROOT / "bt93n"
RUNS_ROOT = BT93N_ROOT / "runs"
REPORT_PATH = BT93N_ROOT / "stability_ladder_report.json"
MICRO_REPORT_PATH = BT93N_ROOT / "micro_ppo_repeat_report.json"
TOLERANCE_CONTRACT_PATH = BT93N_ROOT / "micro_ppo_tolerance_contract.json"
FIX_MANIFEST_PATH = BT93N_ROOT / "fix_manifest.json"
REWARD_DELTA_PATH = BT93N_ROOT / "reward_terminal_delta_report.json"
BT93M_COMPARISON_POLICY_PATH = PPO_ROOT / "bt93m" / "comparison_policy_decision.json"
BT94A_NO_START_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"
TASK_CONTRACT_PATH = PPO_ROOT / "bt93l" / "task_metric_contract.json"

DEFAULT_RUN_ID = "bt93n-stability-ladder-no-run"
PLANNED_STAGES = (50_000, 100_000)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
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


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source(path: Path, role: str, *, closure_capable: bool = True) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
        "closureCapable": closure_capable,
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _source_artifacts(stage_decision_path: Path | None = None) -> dict[str, Any]:
    artifacts = {
        "microPpoRepeatReport": _source(MICRO_REPORT_PATH, "BT93N.3 10k gate source"),
        "toleranceContract": _source(TOLERANCE_CONTRACT_PATH, "BT93N.3 pre-run tolerance contract"),
        "fixManifest": _source(FIX_MANIFEST_PATH, "BT93N.2 selected fix manifest"),
        "rewardTerminalDelta": _source(REWARD_DELTA_PATH, "BT93N.2 pre/post delta source"),
        "comparisonPolicyDecision": _source(BT93M_COMPARISON_POLICY_PATH, "BT93M comparison policy decision"),
        "bt94aNoStartGate": _source(BT94A_NO_START_PATH, "BT94A closed no-start gate"),
        "taskMetricContract": _source(TASK_CONTRACT_PATH, "BT93L task/matrix contract"),
    }
    if stage_decision_path is not None:
        artifacts["stageDecision"] = _source(stage_decision_path, "BT93N.4 no-run stage decision")
    return artifacts


def _micro_gate_green(micro_report: Mapping[str, Any]) -> bool:
    return (
        micro_report.get("resultClass") == "micro-ppo-10k-green-diagnose-only"
        and _get(micro_report, "decision", "extension50kAllowed") is True
        and _get(micro_report, "decision", "extension50kExecuted") is False
        and micro_report.get("ok") is True
    )


def _stage_record(timesteps: int, *, blocked_reason: str, blocking_sources: list[str]) -> dict[str, Any]:
    return {
        "timesteps": int(timesteps),
        "executed": False,
        "blockedBeforeRun": True,
        "blockedReason": blocked_reason,
        "blockingSources": list(blocking_sources),
        "modelHash": None,
        "configHash": None,
        "vecNormalizeHash": None,
        "optimizerHash": None,
        "rewardBreakdown": None,
        "ppoMetrics": {
            "kl": None,
            "entropy": None,
            "clipFraction": None,
            "valueLoss": None,
            "gradNorm": None,
            "notApplicableBecause": blocked_reason,
        },
        "deathBefore60Count": None,
        "terminalClassCounts": {},
        "progressEventShare": None,
        "objectiveEventShare": None,
        "actionEntropy": None,
        "failureClasses": {},
        "plateauDecision": "not-run-10k-gate-blocked",
        "sampleQuality": {
            "evalSampleCountOk": False,
            "dispersionMeasured": False,
            "eventCoverageMeasured": False,
            "redReason": blocked_reason,
        },
    }


def _build_no_run_report(*, run_id: str) -> tuple[dict[str, Any], Path]:
    generated_at = _utc_now()
    micro_report = _read_json(MICRO_REPORT_PATH)
    comparison_policy = _read_json(BT93M_COMPARISON_POLICY_PATH)
    task_contract = _read_json(TASK_CONTRACT_PATH)
    micro_green = _micro_gate_green(micro_report)
    if micro_green:
        blocked_reason = "50k stage implementation is intentionally not invoked by no-run mode"
        result_class = "measurement-invalid"
        invalidations = [
            {
                "id": "unexpected-green-10k-no-run-mode",
                "resultClass": "measurement-invalid",
                "detail": "The 10k gate is green; run the executable ladder implementation in a separate guarded command.",
            }
        ]
    else:
        blocked_reason = (
            "BT93N.3 did not open the 50k extension: "
            f"resultClass={micro_report.get('resultClass')}, "
            f"extension50kAllowed={_get(micro_report, 'decision', 'extension50kAllowed')}"
        )
        result_class = "death-before60-still-blocking"
        invalidations = [
            {
                "id": "micro-ppo-10k-not-green",
                "resultClass": "death-before60-still-blocking",
                "source": _rel(MICRO_REPORT_PATH),
                "observed": {
                    "resultClass": micro_report.get("resultClass"),
                    "extension50kAllowed": _get(micro_report, "decision", "extension50kAllowed"),
                    "trainDeathBefore60Count": _get(micro_report, "trainSummary", "deathBefore60Count"),
                    "evalDeathBefore60Count": _get(micro_report, "evalSummary", "deathBefore60Count"),
                },
            }
        ]
    if comparison_policy.get("nonBlockingForPositiveReentry") is not True:
        invalidations.append(
            {
                "id": "comparison-policy-positive-reentry-blocked",
                "resultClass": "dqn-anchor-blocked",
                "source": _rel(BT93M_COMPARISON_POLICY_PATH),
                "observed": comparison_policy.get("comparisonPolicyDecision"),
            }
        )

    blocking_sources = [_rel(MICRO_REPORT_PATH) or ""]
    if comparison_policy.get("nonBlockingForPositiveReentry") is not True:
        blocking_sources.append(_rel(BT93M_COMPARISON_POLICY_PATH) or "")
    stages = [_stage_record(timesteps, blocked_reason=blocked_reason, blocking_sources=blocking_sources) for timesteps in PLANNED_STAGES]
    phase_coverage = {
        "93N.4.1": micro_report.get("resultClass") != "micro-ppo-10k-green-diagnose-only"
        and _get(micro_report, "decision", "extension50kAllowed") is False
        and all(stage["executed"] is False for stage in stages),
        "93N.4.2": all(
            stage["executed"] is False
            and stage["modelHash"] is None
            and stage["configHash"] is None
            and stage["vecNormalizeHash"] is None
            and stage["optimizerHash"] is None
            for stage in stages
        ),
        "93N.4.3": all(
            stage["executed"] is False
            and stage["deathBefore60Count"] is None
            and stage["plateauDecision"] == "not-run-10k-gate-blocked"
            for stage in stages
        ),
        "93N.4.4": True,
        "93N.4.5": all(stage["plateauDecision"] == "not-run-10k-gate-blocked" for stage in stages),
        "93N.4.6": True,
    }
    stage_decision = {
        "schemaVersion": "bt93n-stability-ladder-stage-decision-v1",
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93n_stability_ladder.py",
        "blockId": "BT93N",
        "phaseId": "93N.4",
        "runId": run_id,
        "resultClass": result_class,
        "stageExecutionAllowed": False,
        "stageExecution": stages,
        "invalidations": invalidations,
        "guardrails": {
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
    }
    stage_decision_path = RUNS_ROOT / run_id / "stage_decision.json"
    _write_json(stage_decision_path, stage_decision)

    report = {
        "schemaVersion": "bt93n-stability-ladder-report-v1",
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93n_stability_ladder.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": True,
        "blockId": "BT93N",
        "phaseId": "93N.4",
        "resultClass": result_class,
        "matrixId": _get(task_contract, "matrix", "matrixId") or micro_report.get("matrixId"),
        "semanticWindow": _get(task_contract, "matrix", "semanticWindow") or micro_report.get("semanticWindow"),
        "runId": run_id,
        "phaseCoverage": phase_coverage,
        "stageExecutionAllowed": False,
        "stageExecution": stages,
        "sampleCounts": {
            "executedStages": 0,
            "plannedStages": [int(item) for item in PLANNED_STAGES],
            "holdoutUsed": False,
            "latestOnlyEvidenceUsed": False,
            "sourceTrainCompletedEpisodes": _get(micro_report, "trainSummary", "completedEpisodes"),
            "sourceEvalCompletedEpisodes": _get(micro_report, "evalSummary", "completedEpisodes"),
        },
        "invalidations": invalidations,
        "decision": {
            "resultClass": result_class,
            "blocksNext": ["BT93O", "BT93P", "BT94A"],
            "opensNext": [],
            "extension50kAllowed": False,
            "extension50kExecuted": False,
            "extension100kAllowed": False,
            "extension100kExecuted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "nextAllowedActions": [
                "close BT93N honestly as diagnose-loop-required/death-before60-still-blocking",
                "write a narrow follow-up/root-cause block or resolve the DQN anchor/replacement-policy blocker",
                "do not claim BT93O, BT93P, BT94A, candidate, freeze, holdout, promote, or rollout from this report",
            ],
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "trainingRunKind": "bt93n-stability-ladder-no-run",
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
        "sourceArtifacts": _source_artifacts(stage_decision_path),
        "commands": {
            "write": f"python python/scripts/bt93n_stability_ladder.py --write-report --run-id {run_id}",
        },
    }
    return report, stage_decision_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--run-id", default=DEFAULT_RUN_ID)
    args = parser.parse_args()

    report, _ = _build_no_run_report(run_id=str(args.run_id))
    if args.write_report:
        _write_json(Path(args.output), report)
    json.dump(report, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0 if report.get("ok") is True else 1


if __name__ == "__main__":
    raise SystemExit(main())
