"""BT93K.1 start truth, signal metric, and supervisor contract reports."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93K_ROOT = PPO_ROOT / "bt93k"

START_TRUTH_PATH = BT93K_ROOT / "start_truth.json"
SIGNAL_CONTRACT_PATH = BT93K_ROOT / "signal_metric_contract.json"
SUPERVISOR_CONTRACT_PATH = BT93K_ROOT / "supervisor_contract_report.json"

INPUT_ARTIFACTS = {
    "bt93kPreflight": BT93K_ROOT / "preflight_quarantine_report.json",
    "bt93jLongrun": PPO_ROOT / "bt93j" / "user_owned_1m_longrun_report.json",
    "bt93jPostDecision": PPO_ROOT / "bt93j" / "post_longrun_decision_report.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
    "userOwned4EnvFailureReport": REPO_ROOT
    / "docs"
    / "Fehlerberichte"
    / "2026-04-27_user-owned-4env-longrun-ended-without-final-report.md",
    "userOwnedStopLog": REPO_ROOT
    / "logs"
    / "training"
    / "user-owned-survival-stop"
    / "20260427T124452.stop.json",
}

BT93K_SCOPE_FILES = [
    "data/training/ppo/bt93k/**",
    "python/scripts/bt93k_*.py",
    "python/configs/ppo_bt93k*.json",
    "scripts/training-headless-lane-runner.mjs",
    "scripts/training-single-env-bridge.mjs",
    "src/state/training/EpisodeController.js",
    "src/state/training/RewardCalculator.js",
    "tests/training-*.mjs",
]

STATUS_CLASSES = [
    "completed",
    "stopped",
    "failed",
    "killed",
    "timeout",
    "measurement-invalid",
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


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _artifact_info(path: Path, *, role: str) -> dict[str, Any]:
    info: dict[str, Any] = {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
    }
    if path.suffix == ".json" and path.is_file():
        payload = _read_json(path)
        for key in (
            "ok",
            "blockId",
            "phaseId",
            "resultClass",
            "runId",
            "runKind",
            "claimable",
            "candidateRunsAllowed",
            "matrixDefinitionAllowed",
            "precomparison",
            "bt94aBlockerCount",
        ):
            if key in payload:
                info[key] = payload.get(key)
        state = payload.get("bt93cState")
        if isinstance(state, dict):
            info["precomparisonResultClass"] = state.get("precomparisonResultClass")
            info["bt94aBlockerCount"] = state.get("bt94aBlockerCount")
            info["handoverReady"] = state.get("handoverReady")
    return info


def _action_safety(final_eval: Mapping[str, Any]) -> dict[str, Any]:
    telemetry = final_eval.get("actionTelemetry") if isinstance(final_eval.get("actionTelemetry"), dict) else {}
    return {
        "totalActions": telemetry.get("totalActions"),
        "invalidActionRate": telemetry.get("invalidActionRate"),
        "invalidActionCount": telemetry.get("invalidActionCount"),
        "preSamplingMaskRate": telemetry.get("preSamplingMaskRate"),
        "preSamplingMaskCount": telemetry.get("preSamplingMaskCount"),
        "policyMaskRate": telemetry.get("preSamplingMaskRate"),
        "postDecodeClampRate": telemetry.get("postDecodeClampRate"),
        "vetoRate": telemetry.get("vetoRate"),
        "sanitizerRate": telemetry.get("sanitizerRate"),
        "noopRate": telemetry.get("noopRate"),
    }


def _reward_signal(final_eval: Mapping[str, Any]) -> dict[str, Any]:
    totals = final_eval.get("rewardBreakdownTotals")
    if not isinstance(totals, dict):
        totals = final_eval.get("rewardBreakdown") if isinstance(final_eval.get("rewardBreakdown"), dict) else {}
    checkpoint = float(totals.get("checkpointReached") or 0)
    parcours = float(totals.get("parcoursCompleted") or 0)
    kill = float(totals.get("kill") or 0)
    win = float(totals.get("win") or 0)
    objective_total = checkpoint + parcours + kill + win
    return {
        "progressReward": checkpoint + parcours,
        "objectiveReward": objective_total,
        "checkpointReachedReward": checkpoint,
        "parcoursCompletedReward": parcours,
        "progressSignalNonZero": (checkpoint + parcours) > 0,
        "objectiveSignalNonZero": objective_total > 0,
    }


def _terminal_signal(final_eval: Mapping[str, Any]) -> dict[str, Any]:
    matrix = final_eval.get("terminalMatrix") if isinstance(final_eval.get("terminalMatrix"), dict) else {}
    completed = int(final_eval.get("completedEpisodeCount") or 0)
    natural = int(matrix.get("naturalTerminalCount") or 0)
    max_steps = int(matrix.get("maxSteps") or 0)
    lengths = final_eval.get("completedEpisodeLengths")
    if not isinstance(lengths, list):
        lengths = []
    death_before_60 = len([
        length for length in lengths if isinstance(length, (int, float)) and float(length) < 60
    ])
    return {
        "terminalReasonCounts": matrix.get("terminalReasonCounts") or {},
        "deathCauseCounts": matrix.get("deathCauseCounts") or {},
        "naturalTerminalCount": natural,
        "naturalTerminalShare": round(natural / completed, 6) if completed else None,
        "maxStepEpisodes": max_steps,
        "maxStepEpisodeShare": round(max_steps / completed, 6) if completed else None,
        "deathBefore60Count": death_before_60,
        "deathBefore60Share": round(death_before_60 / completed, 6) if completed else None,
        "runtimeErrorCount": matrix.get("runtimeErrorCount"),
        "playerDeadOnly": matrix.get("playerDeadOnly"),
    }


def _bt93j_start_matrix(longrun: Mapping[str, Any]) -> dict[str, Any]:
    final_eval = longrun.get("finalEval") if isinstance(longrun.get("finalEval"), dict) else {}
    terminal = _terminal_signal(final_eval)
    reward = _reward_signal(final_eval)
    action_safety = _action_safety(final_eval)
    return {
        "matrixId": "bt93k-start-matrix-from-bt93j-1m-v1",
        "sourceRunId": longrun.get("runId"),
        "sourceRunKind": longrun.get("runKind"),
        "sourceResultClass": longrun.get("resultClass"),
        "completedEpisodeCount": final_eval.get("completedEpisodeCount"),
        "avgStepsPerEpisode": final_eval.get("avgStepsPerEpisodeObserved"),
        "averageBotSurvival": final_eval.get("averageBotSurvivalObserved"),
        "longestEpisode": final_eval.get("longestEpisode"),
        "terminalSignal": terminal,
        "rewardSignal": reward,
        "actionSafety": action_safety,
        "qualityJudgementAllowed": int(final_eval.get("completedEpisodeCount") or 0) >= 15,
        "blockingConclusion": (
            "Steps improved, but progress/objective rewards stayed zero and terminal evidence remained "
            "player-dead-only with naturalTerminalCount=0."
        ),
    }


def _bt94a_state(no_start: Mapping[str, Any]) -> dict[str, Any]:
    state = no_start.get("bt93cState") if isinstance(no_start.get("bt93cState"), dict) else {}
    blockers = state.get("bt94aBlockers") if isinstance(state.get("bt94aBlockers"), list) else []
    return {
        "claimable": no_start.get("claimable"),
        "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
        "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
        "candidateFreezeAllowed": no_start.get("candidateFreezeAllowed"),
        "resultClass": no_start.get("resultClass"),
        "precomparisonResultClass": state.get("precomparisonResultClass"),
        "bt94aBlockerCount": state.get("bt94aBlockerCount"),
        "handoverReady": state.get("handoverReady"),
        "handoverGate": state.get("handoverGate"),
        "remainingGates": state.get("remainingBt94aGates") or [],
        "blockers": [
            {
                "id": blocker.get("id"),
                "gate": blocker.get("gate"),
                "evidence": blocker.get("evidence"),
            }
            for blocker in blockers
            if isinstance(blocker, dict)
        ],
    }


def _side_lane_failure_summary(failure_report: Path, stop_log: Path) -> dict[str, Any]:
    text = ""
    try:
        text = failure_report.read_text(encoding="utf-8")
    except OSError:
        pass
    stop_payload = _read_json(stop_log)
    return {
        "classification": "diagnostic-only-measurement-invalid-for-closure",
        "failureReportPath": _rel(failure_report),
        "failureReportSha256": _sha256_file(failure_report),
        "stopLogPath": _rel(stop_log),
        "stopLogSha256": _sha256_file(stop_log),
        "forceStopObserved": "Force-Stop" in text or "force" in json.dumps(stop_payload).lower(),
        "finalRunnerReportPresent": False,
        "finalTrainingReportPresent": False,
        "lastMentionedSnapshot": "step_0600000" if "step_0600000" in text else None,
        "snapshotSurvivalValues": {
            "300k": 196.5,
            "400k": 304.25,
            "500k": 412.25,
            "600k": 151.5,
        },
        "blockingReason": (
            "No final runner report, no reliable exit code, no complete guardrail summary, and no "
            "machine-readable terminal class."
        ),
        "notValidAs": [
            "BT93K closure evidence",
            "BT94A claim evidence",
            "candidate",
            "freeze",
            "baseline",
            "holdout",
            "promote",
            "PPO-Validate",
        ],
    }


def _source_artifacts() -> dict[str, Any]:
    roles = {
        "bt93kPreflight": "BT93K.0 preflight and side-lane quarantine",
        "bt93jLongrun": "BT93J user-owned 1M proof longrun final report",
        "bt93jPostDecision": "BT93J post-longrun red decision",
        "bt94aNoStartGate": "BT94A no-start gate before BT93K",
        "userOwned4EnvFailureReport": "3M/4-Env side-lane failure report",
        "userOwnedStopLog": "Detached side-lane force-stop trace",
    }
    return {
        key: _artifact_info(path, role=roles[key])
        for key, path in INPUT_ARTIFACTS.items()
    }


def build_start_truth() -> dict[str, Any]:
    longrun = _read_json(INPUT_ARTIFACTS["bt93jLongrun"])
    post_decision = _read_json(INPUT_ARTIFACTS["bt93jPostDecision"])
    no_start = _read_json(INPUT_ARTIFACTS["bt94aNoStartGate"])
    preflight = _read_json(INPUT_ARTIFACTS["bt93kPreflight"])
    start_matrix = _bt93j_start_matrix(longrun)
    bt94a_state = _bt94a_state(no_start)
    required_inputs_present = all(path.exists() for path in INPUT_ARTIFACTS.values())
    red_start_state = (
        post_decision.get("resultClass") == "diagnose-loop-required"
        and bt94a_state["claimable"] is False
        and bt94a_state["candidateRunsAllowed"] is False
    )
    return {
        "ok": required_inputs_present and red_start_state,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_start_truth_contracts.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93K",
        "phaseId": "93K.1.1",
        "resultClass": "start-truth-pinned",
        "sourceArtifacts": _source_artifacts(),
        "preflightState": {
            "ok": preflight.get("ok"),
            "runBlockingReasons": (preflight.get("noGoStatus") or {}).get("runBlockingReasons"),
            "sideLaneClosureCapable": (
                (preflight.get("userOwnedSideLaneQuarantine") or {}).get("closureCapable")
            ),
        },
        "bt93jOneMillionLongrun": {
            "runId": longrun.get("runId"),
            "runKind": longrun.get("runKind"),
            "resultClass": longrun.get("resultClass"),
            "requestedTimesteps": longrun.get("requestedTimesteps"),
            "actualProgressTimesteps": longrun.get("actualProgressTimesteps"),
            "modelNumTimesteps": longrun.get("modelNumTimesteps"),
            "startFinding": longrun.get("startFinding"),
            "trend": longrun.get("trend"),
            "startMatrix": start_matrix,
        },
        "postLongrunDecision": {
            "resultClass": post_decision.get("resultClass"),
            "decision": post_decision.get("decision"),
            "blockingFindings": post_decision.get("blockingFindings") or [],
            "rootCauseChain": post_decision.get("rootCauseChain") or [],
            "nextHypotheses": post_decision.get("nextHypotheses") or [],
        },
        "bt94aNoStartState": bt94a_state,
        "userOwned3m4EnvSideLane": _side_lane_failure_summary(
            INPUT_ARTIFACTS["userOwned4EnvFailureReport"],
            INPUT_ARTIFACTS["userOwnedStopLog"],
        ),
        "claimBoundary": {
            "bt94aClosed": True,
            "candidateRunsAllowed": False,
            "freezeCandidateAllowed": False,
            "holdoutAllowed": False,
            "promotionAllowed": False,
            "rolloutSignalAllowed": False,
            "nextAllowedWork": [
                "93K.2 runner signal repair",
                "93K.3 mode/map smoke preparation",
                "93K.4 2/4/6-env supervisor smokes",
            ],
        },
        "guardrails": {
            "diagnosticOnly": True,
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
            "scopeFiles": BT93K_SCOPE_FILES,
            "noOldUserOwnedEvidenceForClosure": True,
        },
        "phaseCoverage": {
            "93K.1.1": True,
        },
    }


def build_signal_contract(start_truth: Mapping[str, Any]) -> dict[str, Any]:
    start_matrix = (
        ((start_truth.get("bt93jOneMillionLongrun") or {}).get("startMatrix") or {})
        if isinstance(start_truth.get("bt93jOneMillionLongrun"), dict)
        else {}
    )
    terminal = start_matrix.get("terminalSignal") if isinstance(start_matrix.get("terminalSignal"), dict) else {}
    death_before_60 = terminal.get("deathBefore60Share")
    improved_death_threshold = round(float(death_before_60) * 0.8, 6) if isinstance(death_before_60, (int, float)) else None
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_start_truth_contracts.py",
        "blockId": "BT93K",
        "phaseId": "93K.1.2",
        "resultClass": "signal-metric-contract-pinned",
        "sourceStartTruth": {
            "path": _rel(START_TRUTH_PATH),
            "sha256": _sha256_file(START_TRUTH_PATH),
            "matrixId": start_matrix.get("matrixId"),
        },
        "startMatrix": start_matrix,
        "qualityJudgementRules": {
            "minimumCompletedEpisodes": 15,
            "qualityJudgementForbiddenWhenCompletedEpisodesBelow": 15,
            "forbiddenResultClassWhenBelowMinimum": "quality-judgement-invalid",
            "envStartupSmokesMustBeLabelledAs": [
                "startup-smoke",
                "supervisor-smoke",
                "measurement-smoke",
            ],
            "startupSmokesCannotProve": [
                "baseline",
                "candidate",
                "freeze",
                "holdout",
                "promote",
                "BT94A-ready",
                "PPO-Validate",
            ],
        },
        "metricFamilies": {
            "survival": [
                "avgStepsPerEpisode",
                "averageBotSurvival",
                "completedEpisodeCount",
                "longestEpisode",
                "completedEpisodeLengths",
            ],
            "earlyDeaths": [
                "deathBefore60Count",
                "deathBefore60Share",
                "terminalReasonCounts",
                "deathCauseCounts",
            ],
            "maxStepPlateau": [
                "maxStepEpisodes",
                "maxStepEpisodeShare",
                "max-step-only plateau flag",
            ],
            "naturalTerminal": [
                "naturalTerminalCount",
                "naturalTerminalShare",
                "playerDeadOnly",
            ],
            "progressAndObjective": [
                "progressSignalNonZero",
                "objectiveSignalNonZero",
                "checkpointReachedReward",
                "parcoursCompletedReward",
                "killReward",
                "winReward",
            ],
            "actionSafety": [
                "invalidActionRate",
                "sanitizerRate",
                "postDecodeClampRate",
                "vetoRate",
                "policyMaskRate",
                "noopRate",
            ],
            "runtimeStability": [
                "runtimeErrorCount",
                "nonFiniteMetricCount",
                "timeoutCount",
                "forcedStop",
            ],
        },
        "signalBooleans": {
            "progressSignalNonZero": "true when real runner progress/checkpoint/parcours reward is non-zero",
            "objectiveSignalNonZero": "true when real runner objective reward is non-zero",
            "naturalTerminalSharePositive": "true when naturalTerminalShare > 0",
            "deathBefore60ImprovedBy20Pct": {
                "startDeathBefore60Share": death_before_60,
                "requiredAtOrBelow": improved_death_threshold,
                "comparison": "lower is better; must not worsen action safety",
            },
        },
        "classificationRules": {
            "measurement-invalid": [
                "missing final run_exit_report",
                "completedEpisodeCount below minimum for quality judgement",
                "stdout/stderr-only completion",
                "missing exit code",
                "missing final snapshot or eval report",
            ],
            "technical-smoke-only": [
                "env startup, sidecar launch, snapshot, and exit are proven but episode evidence is below quality minimum",
            ],
            "diagnose-loop-required": [
                "all progress/objective/natural-terminal signals are zero and early-death or player-dead-only state remains red",
            ],
            "diagnose-improved": [
                "at least one required signal improves without action-safety or runtime-stability regression",
            ],
            "BT94A-ready": [
                "reserved for 93K.99 only after all BT93K evidence and no-start gate become green",
            ],
        },
        "longrunLadderRule": {
            "longerRunAllowedOnlyWhen": [
                "technical gates are green",
                "run_exit_report.ok=true",
                "supervisor status is completed or stopped with graceful stop and final report",
                "action safety is not worse than the pinned start matrix",
                "at least one survival-first signal is green",
            ],
            "survivalFirstSignals": [
                "progressSignalNonZero=true",
                "objectiveSignalNonZero=true",
                "naturalTerminalShare>0",
                f"deathBefore60Share <= {improved_death_threshold} without worse action safety",
            ],
            "plannedLadder": [
                "20k",
                "50k",
                "100k",
                "300k",
                "1M",
            ],
            "blindLongrunForbidden": True,
        },
        "phaseCoverage": {
            "93K.1.2": True,
            "93K.1.4": True,
        },
    }


def build_supervisor_contract(start_truth: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_start_truth_contracts.py",
        "blockId": "BT93K",
        "phaseId": "93K.1.3",
        "resultClass": "supervisor-contract-pinned",
        "sourceStartTruth": {
            "path": _rel(START_TRUTH_PATH),
            "sha256": _sha256_file(START_TRUTH_PATH),
            "sideLaneFailureClass": (
                (start_truth.get("userOwned3m4EnvSideLane") or {}).get("classification")
                if isinstance(start_truth.get("userOwned3m4EnvSideLane"), dict)
                else None
            ),
        },
        "requiredRunExitReport": {
            "pathPattern": "data/training/ppo/bt93k/runs/<run-id>/run_exit_report.json",
            "required": True,
            "stdoutStderrOnlyIsInvalid": True,
            "missingExitCodeIsInvalid": True,
            "missingFinalSnapshotIsInvalid": True,
            "requiredFields": [
                "schemaVersion",
                "blockId",
                "phaseId",
                "runId",
                "runKind",
                "command",
                "configPath",
                "startedAt",
                "finishedAt",
                "elapsedSeconds",
                "ok",
                "statusClass",
                "exitCode",
                "stopReason",
                "gracefulStop",
                "forcedStop",
                "signal",
                "pidTree",
                "sidecars",
                "heartbeat",
                "stdoutPath",
                "stderrPath",
                "runDirectory",
                "snapshotManifestPath",
                "evalSnapshotPath",
                "artifactManifestPath",
                "metricsSummary",
            ],
        },
        "statusClasses": {
            "allowed": STATUS_CLASSES,
            "completed": "process exited 0 after writing final report, final snapshot, and artifact manifest",
            "stopped": "explicit stop request reached a checkpoint and wrote a final report",
            "failed": "process exited non-zero or mandatory artifact write failed",
            "killed": "external termination or missing graceful checkpoint stop",
            "timeout": "supervisor timeout fired before valid completion",
            "measurement-invalid": "any mandatory report, exit code, heartbeat, sidecar, or final snapshot evidence is missing",
        },
        "heartbeatContract": {
            "heartbeatPathPattern": "data/training/ppo/bt93k/runs/<run-id>/heartbeat.jsonl",
            "writeIntervalSecondsMax": 60,
            "staleAfterSeconds": 180,
            "requiredFields": [
                "timestamp",
                "runId",
                "pid",
                "activeSidecarPids",
                "progressTimesteps",
                "lastSnapshotPath",
                "lastEvalSnapshotPath",
            ],
        },
        "pidAndSidecarContract": {
            "recordMainPid": True,
            "recordChildPids": True,
            "recordSidecarReadyPayload": True,
            "sidecarExitCodesRequired": True,
            "sidecarMissingExitCodeClass": "measurement-invalid",
        },
        "artifactContract": {
            "finalSnapshotManifestRequired": True,
            "evalSnapshotRequiredForQualityJudgement": True,
            "artifactManifestRequiredForTrainingRuns": True,
            "configSha256Required": True,
            "gitShaRequired": True,
        },
        "stopContract": {
            "allowedStopModes": [
                "normal-completion",
                "graceful-user-stop-at-checkpoint",
                "technical-stop",
                "timeout-stop",
                "force-stop",
            ],
            "forceStopRequiresMeasurementInvalidUnlessFinalReportExists": True,
            "switchOrRestartRequiresSeparateRunExitReport": True,
        },
        "gateUse": {
            "runCanFeed93KClosureOnlyIf": [
                "run_exit_report.ok=true",
                "statusClass in ['completed', 'stopped']",
                "exitCode is present",
                "final snapshot manifest exists",
                "stdout/stderr paths are recorded",
                "sidecar readiness and exit state are recorded",
            ],
            "blocksLongerRunsWhen": [
                "run_exit_report missing",
                "statusClass is failed/killed/timeout/measurement-invalid",
                "heartbeat stale",
                "exitCode missing",
                "final snapshot missing",
                "forced stop has no final report",
            ],
        },
        "phaseCoverage": {
            "93K.1.3": True,
            "93K.1.4": True,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-root", type=Path, default=BT93K_ROOT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    global BT93K_ROOT, START_TRUTH_PATH, SIGNAL_CONTRACT_PATH, SUPERVISOR_CONTRACT_PATH
    BT93K_ROOT = args.output_root
    START_TRUTH_PATH = BT93K_ROOT / "start_truth.json"
    SIGNAL_CONTRACT_PATH = BT93K_ROOT / "signal_metric_contract.json"
    SUPERVISOR_CONTRACT_PATH = BT93K_ROOT / "supervisor_contract_report.json"

    start_truth = build_start_truth()
    _write_json(START_TRUTH_PATH, start_truth)
    signal_contract = build_signal_contract(start_truth)
    _write_json(SIGNAL_CONTRACT_PATH, signal_contract)
    supervisor_contract = build_supervisor_contract(start_truth)
    _write_json(SUPERVISOR_CONTRACT_PATH, supervisor_contract)

    print(f"Wrote {_rel(START_TRUTH_PATH)}")
    print(f"Wrote {_rel(SIGNAL_CONTRACT_PATH)}")
    print(f"Wrote {_rel(SUPERVISOR_CONTRACT_PATH)}")
    return 0 if start_truth["ok"] and signal_contract["ok"] and supervisor_contract["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
