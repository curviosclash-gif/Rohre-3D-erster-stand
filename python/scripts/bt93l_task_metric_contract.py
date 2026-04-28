"""BT93L.1 task and metric contract.

The contract is diagnostic-only. It pins task semantics, the small matrix for
reachability work, terminal classes, and the red start state before any BT93L
smoke or micro-PPO run may start.
"""

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
BT93L_ROOT = PPO_ROOT / "bt93l"
OUTPUT_PATH = BT93L_ROOT / "task_metric_contract.json"

SOURCE_ARTIFACTS = {
    "bt93jLongrun": PPO_ROOT / "bt93j" / "user_owned_1m_longrun_report.json",
    "bt93jPostLongrunDecision": PPO_ROOT / "bt93j" / "post_longrun_decision_report.json",
    "bt93kSignalMetricContract": PPO_ROOT / "bt93k" / "signal_metric_contract.json",
    "bt93kHandover": PPO_ROOT / "bt93k" / "handover_package.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
    "diagnosisRestartPlan": REPO_ROOT
    / "docs"
    / "bot-training"
    / "PPO_Diagnose_und_Neustartplan_2026-04-28.md",
}

BT93L_SCOPE_FILES = [
    "docs/bot-training/PPO_Diagnose_und_Neustartplan_2026-04-28.md",
    "data/training/ppo/bt93l/**",
    "python/scripts/bt93l_*.py",
    "python/configs/ppo_bt93l*.json",
    "scripts/training-headless-lane-runner.mjs",
    "scripts/training-single-env-bridge.mjs",
    "src/state/training/EpisodeController.js",
    "src/state/training/RewardCalculator.js",
    "python/envs/ppo_action_surface.py",
    "python/train.py",
    "python/eval.py",
    "tests/training-*.mjs",
    "python/tests/**",
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


def _artifact(path: Path, role: str) -> dict[str, Any]:
    info: dict[str, Any] = {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }
    if path.suffix == ".json" and path.is_file():
        payload = _read_json(path)
        for key in ("ok", "blockId", "phaseId", "resultClass", "runId", "runKind"):
            if key in payload:
                info[key] = payload.get(key)
        if "claimable" in payload:
            info["claimable"] = payload.get("claimable")
        state = payload.get("bt93cState")
        if isinstance(state, dict):
            info["bt94aBlockerCount"] = state.get("bt94aBlockerCount")
            info["handoverReady"] = state.get("handoverReady")
            info["precomparisonResultClass"] = state.get("precomparisonResultClass")
    return info


def _source_artifacts() -> dict[str, Any]:
    roles = {
        "bt93jLongrun": "BT93J user-owned 1M diagnostic longrun",
        "bt93jPostLongrunDecision": "BT93J red post-longrun decision",
        "bt93kSignalMetricContract": "BT93K pinned signal metric contract",
        "bt93kHandover": "BT93K red handover into BT93L",
        "bt94aNoStartGate": "BT94A no-start gate",
        "diagnosisRestartPlan": "BT93L diagnosis and restart source",
    }
    return {key: _artifact(path, roles[key]) for key, path in SOURCE_ARTIFACTS.items()}


def _bt93j_start_state(longrun: Mapping[str, Any], post_decision: Mapping[str, Any]) -> dict[str, Any]:
    final_eval = longrun.get("finalEval") if isinstance(longrun.get("finalEval"), Mapping) else {}
    reward = final_eval.get("rewardBreakdownTotals")
    if not isinstance(reward, Mapping):
        reward = {}
    terminal = final_eval.get("terminalMatrix")
    if not isinstance(terminal, Mapping):
        terminal = {}
    return {
        "sourceRunId": longrun.get("runId"),
        "sourceRunKind": longrun.get("runKind"),
        "longrunResultClass": longrun.get("resultClass"),
        "postDecisionResultClass": post_decision.get("resultClass"),
        "avgStepsPerEpisodeObserved": final_eval.get("avgStepsPerEpisodeObserved"),
        "averageBotSurvivalObserved": final_eval.get("averageBotSurvivalObserved"),
        "completedEpisodeCount": final_eval.get("completedEpisodeCount"),
        "longestEpisode": final_eval.get("longestEpisode"),
        "maxStepEpisodes": terminal.get("maxSteps"),
        "naturalTerminalCount": terminal.get("naturalTerminalCount"),
        "playerDeadOnly": terminal.get("playerDeadOnly"),
        "terminalReasonCounts": terminal.get("terminalReasonCounts") or {},
        "deathCauseCounts": terminal.get("deathCauseCounts") or {},
        "progressReward": float(reward.get("checkpointReached") or 0)
        + float(reward.get("parcoursCompleted") or 0),
        "objectiveReward": float(reward.get("checkpointReached") or 0)
        + float(reward.get("parcoursCompleted") or 0)
        + float(reward.get("kill") or 0)
        + float(reward.get("win") or 0),
        "redConclusion": (
            "survival improved, but progress/objective rewards stayed zero and terminal "
            "evidence stayed player-dead-only or max-step dominated"
        ),
    }


def _bt93k_state(handover: Mapping[str, Any], signal_contract: Mapping[str, Any]) -> dict[str, Any]:
    ladder = handover.get("ladderDecision") if isinstance(handover.get("ladderDecision"), Mapping) else {}
    signal_gate = ladder.get("signalGate") if isinstance(ladder.get("signalGate"), Mapping) else {}
    first_run = ladder.get("firstRun") if isinstance(ladder.get("firstRun"), Mapping) else {}
    first_summary = first_run.get("summary") if isinstance(first_run.get("summary"), Mapping) else {}
    reward_signal = first_summary.get("rewardSignal")
    terminal_signal = first_summary.get("terminalSignal")
    survival = first_summary.get("survival")
    return {
        "handoverResultClass": handover.get("resultClass"),
        "bt94aReady": (handover.get("bt94aHandover") or {}).get("ready")
        if isinstance(handover.get("bt94aHandover"), Mapping)
        else None,
        "startMatrixId": (signal_contract.get("sourceStartTruth") or {}).get("matrixId")
        if isinstance(signal_contract.get("sourceStartTruth"), Mapping)
        else None,
        "firstDiagnosticRun": {
            "runId": first_run.get("runId"),
            "avgStepsPerEpisodeObserved": (survival or {}).get("avgStepsPerEpisodeObserved")
            if isinstance(survival, Mapping)
            else None,
            "completedEpisodeCount": (survival or {}).get("completedEpisodeCount")
            if isinstance(survival, Mapping)
            else None,
            "progressSignalNonZero": (reward_signal or {}).get("progressSignalNonZero")
            if isinstance(reward_signal, Mapping)
            else None,
            "objectiveSignalNonZero": (reward_signal or {}).get("objectiveSignalNonZero")
            if isinstance(reward_signal, Mapping)
            else None,
            "naturalTerminalShare": (terminal_signal or {}).get("naturalTerminalShare")
            if isinstance(terminal_signal, Mapping)
            else None,
            "playerDeadOnly": (terminal_signal or {}).get("playerDeadOnly")
            if isinstance(terminal_signal, Mapping)
            else None,
        },
        "blockedReasons": ladder.get("blockedReasons") or [],
        "signalGate": {
            "longerRunAllowed": signal_gate.get("longerRunAllowed"),
            "progressSignalNonZero": signal_gate.get("progressSignalNonZero"),
            "objectiveSignalNonZero": signal_gate.get("objectiveSignalNonZero"),
            "naturalTerminalSharePositive": signal_gate.get("naturalTerminalSharePositive"),
            "avgStepsNonRegression": signal_gate.get("avgStepsNonRegression"),
            "technicalOk": signal_gate.get("technicalOk"),
        },
    }


def _bt94a_state(no_start: Mapping[str, Any]) -> dict[str, Any]:
    bt93c_state = no_start.get("bt93cState") if isinstance(no_start.get("bt93cState"), Mapping) else {}
    return {
        "claimable": no_start.get("claimable"),
        "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
        "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
        "candidateFreezeAllowed": no_start.get("candidateFreezeAllowed"),
        "resultClass": no_start.get("resultClass"),
        "handoverReady": bt93c_state.get("handoverReady"),
        "handoverGate": bt93c_state.get("handoverGate"),
        "precomparisonResultClass": bt93c_state.get("precomparisonResultClass"),
        "bt94aBlockerCount": bt93c_state.get("bt94aBlockerCount"),
        "remainingGates": bt93c_state.get("remainingBt94aGates") or [],
    }


def _task_definitions() -> dict[str, Any]:
    return {
        "survivalTask": {
            "purpose": "measure survival and safety without treating survival-only as gameplay quality",
            "primaryMetrics": [
                "avgStepsPerEpisode",
                "averageBotSurvival",
                "completedEpisodeCount",
                "deathBefore60Share",
                "runtimeErrorCount",
            ],
            "successBoundary": [
                "runtimeErrorCount == 0",
                "deathBefore60Share does not regress",
                "avgStepsPerEpisode may improve only as diagnostic evidence until objective signals exist",
            ],
            "explicitNonSuccess": [
                "maxSteps-only plateau",
                "playerDeadOnly=true",
                "progressSignalReachable=false",
                "objectiveSignalReachable=false",
            ],
        },
        "objectiveTask": {
            "purpose": "prove progress and objective signals in the real env.step path",
            "primaryMetrics": [
                "progressSignalReachable",
                "objectiveSignalReachable",
                "realEnvStepPath",
                "checkpointReachedReward",
                "parcoursCompletedReward",
                "objectiveCompleteCount",
            ],
            "successBoundary": [
                "positive-control reaches progress/objective without manual signal injection",
                "noop-control stays non-progress",
                "random-control is reported separately and cannot be tuned post-hoc",
            ],
            "manualInjectionRule": "input.progressEvent/context.progressEvent is allowed only as counterprobe, never as reachability evidence",
        },
        "candidateFreezeTask": {
            "purpose": "future BT94A candidate/freeze work; not claimable in BT93L.1",
            "entryConditions": [
                "BT93L.99 resultClass == BT94A-ready",
                "data/training/ppo/bt94a/no_start_gate.json claimable == true",
                "candidateRunsAllowed == true",
                "matrixDefinitionAllowed == true",
                "bt94aBlockerCount == 0",
                "precomparisonResultClass != ppo-regression",
            ],
            "forbiddenInBT93L": [
                "candidate",
                "freeze",
                "holdout optimization",
                "promote",
                "rollout-ready",
                "BT95-Handoff-ready",
            ],
        },
    }


def _matrix() -> dict[str, Any]:
    return {
        "matrixId": "bt93l-reachability-diagnostic-matrix-v1",
        "semanticWindow": "runtime-near-headless-v1",
        "mode": {
            "modeId": "runtime-near-headless-v1",
            "domainModes": ["classic-3d"],
            "gameMode": "CLASSIC",
            "planarMode": False,
            "modePath": "normal",
        },
        "maps": {
            "primary": "standard",
            "secondaryForMatrixConsistency": "maze",
            "rule": "standard is the first reachability map; maze may be used only with identical task and terminal semantics",
        },
        "seeds": {
            "diagnosticTrainSeeds": [934, 935, 936, 937],
            "diagnosticEvalSeeds": [944, 945, 946],
            "controlSeeds": [944, 945, 946],
            "holdoutSeeds": [960, 961],
            "holdoutStatus": "reserved-unused-in-BT93L.1-through-BT93L.6",
        },
        "episode": {
            "maxStepsPerEpisode": 180,
            "maxStepsInterpretation": "neutral truncation; never objective-complete and never quality-green by itself",
            "minimumCompletedEpisodesForRead": 15,
            "controllerTimeoutSeconds": 30,
        },
        "evaluation": {
            "evalSteps": 2700,
            "evalMinCompletedEpisodes": 15,
            "controls": ["positive-control", "noop-control", "random-control"],
            "requiredReports": [
                "progress_reachability_report.json",
                "reward_balance_report.json",
                "baseline_matrix_report.json",
            ],
        },
        "microPpo": {
            "allowedOnlyAfter": ["93L.2 green", "93L.3 green"],
            "firstProbeTimesteps": 10000,
            "extensionTimesteps": 50000,
            "envCount": 2,
            "resultClasses": [
                "signal-green",
                "signal-red",
                "reward-redesign-required",
                "action-space-required",
                "measurement-invalid",
            ],
            "qualityBoundary": "signal probe only; no candidate, freeze, holdout, promote, PPO-Validate, or rollout signal",
        },
    }


def _terminal_semantics() -> dict[str, Any]:
    return {
        "player-dead": {
            "class": "failure-terminal",
            "qualityMeaning": "red for objective/candidate readiness; survival diagnostics may report it separately",
            "countsTowardNaturalTerminal": False,
        },
        "max-steps": {
            "class": "truncation",
            "qualityMeaning": "neutral diagnostic cap; not objective-complete and not survival quality by itself",
            "countsTowardNaturalTerminal": False,
        },
        "objective-progress": {
            "class": "progress-signal",
            "qualityMeaning": "nonterminal or intermediate objective evidence only when emitted by real env.step path",
            "countsTowardNaturalTerminal": False,
        },
        "objective-complete": {
            "class": "task-specific-natural-terminal",
            "qualityMeaning": "objective-task success only when generated without manual injection",
            "countsTowardNaturalTerminal": True,
        },
        "timeout": {
            "class": "technical-failure",
            "qualityMeaning": "measurement-invalid unless explicitly classified by a final runner report",
            "countsTowardNaturalTerminal": False,
        },
        "runtime-error": {
            "class": "technical-failure",
            "qualityMeaning": "red; runtimeErrorCount must remain zero",
            "countsTowardNaturalTerminal": False,
        },
        "forced-stop": {
            "class": "operator-or-supervisor-stop",
            "qualityMeaning": "measurement-invalid for quality unless graceful final report and final snapshots exist",
            "countsTowardNaturalTerminal": False,
        },
    }


def build_contract() -> dict[str, Any]:
    bt93j_longrun = _read_json(SOURCE_ARTIFACTS["bt93jLongrun"])
    bt93j_decision = _read_json(SOURCE_ARTIFACTS["bt93jPostLongrunDecision"])
    bt93k_signal = _read_json(SOURCE_ARTIFACTS["bt93kSignalMetricContract"])
    bt93k_handover = _read_json(SOURCE_ARTIFACTS["bt93kHandover"])
    no_start = _read_json(SOURCE_ARTIFACTS["bt94aNoStartGate"])

    source_artifacts = _source_artifacts()
    sources_present = all(item["exists"] and item["isFile"] for item in source_artifacts.values())
    bt94a_state = _bt94a_state(no_start)
    red_start_pinned = (
        bt93j_longrun.get("resultClass") == "reward-still-blocking"
        and bt93j_decision.get("resultClass") == "diagnose-loop-required"
        and bt93k_handover.get("resultClass") == "diagnose-loop-required"
        and bt94a_state["claimable"] is False
        and bt94a_state["candidateRunsAllowed"] is False
        and bt94a_state["matrixDefinitionAllowed"] is False
    )
    phase_coverage = {
        "93L.1.1": True,
        "93L.1.2": True,
        "93L.1.3": True,
        "93L.1.4": red_start_pinned,
    }
    ok = bool(sources_present and all(phase_coverage.values()))

    return {
        "schemaVersion": "bt93l-task-metric-contract-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_task_metric_contract.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": ok,
        "blockId": "BT93L",
        "phaseId": "93L.1",
        "resultClass": "task-metric-contract-pinned" if ok else "measurement-invalid",
        "phaseCoverage": phase_coverage,
        "sourceArtifacts": source_artifacts,
        "taskDefinitions": _task_definitions(),
        "metricInterpretation": {
            "noSilentRedefinition": True,
            "maxSteps": "neutral truncation; cannot become quality-green without progress/objective evidence",
            "avgStepsPerEpisode": "survival diagnostic until objective reachability and reward balance are green",
            "averageBotSurvival": "survival diagnostic until PPO-Validate lane exists",
            "progressSignalReachable": "true only from real env.step path; manual injection is counterprobe only",
            "objectiveSignalReachable": "true only from real env.step path and objective task semantics",
            "playerDeadOnly": "red for objective/candidate readiness",
            "runtimeErrorCount": "hard stability metric; must be zero",
        },
        "matrix": _matrix(),
        "terminalSemantics": _terminal_semantics(),
        "startState": {
            "bt93j": _bt93j_start_state(bt93j_longrun, bt93j_decision),
            "bt93k": _bt93k_state(bt93k_handover, bt93k_signal),
            "bt94aNoStartGate": bt94a_state,
            "diagnosisSummary": {
                "source": _rel(SOURCE_ARTIFACTS["diagnosisRestartPlan"]),
                "sourceSha256": _sha256_file(SOURCE_ARTIFACTS["diagnosisRestartPlan"]),
                "pinnedFindings": [
                    "PPO technically runs, but optimizes an insufficient signal",
                    "progress/objective rewards are dead in the normal PPO runner path",
                    "survival-only reward can produce max-step plateaus without gameplay quality",
                    "BT94A no-start is correct until reachability, terminal, reward, and comparison gates are green",
                ],
            },
        },
        "nextGate": {
            "phase": "93L.2",
            "requires": [
                "dead signal path documented",
                "real progress/objective source defined",
                "focused smoke proves realEnvStepPath=true",
                "positive/noop/random controls reported",
            ],
            "trainingStartBlockedUntil": [
                "progressSignalReachable=true",
                "objectiveSignalReachable=true",
                "realEnvStepPath=true",
            ],
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "baselineRunsStarted": False,
            "pilotRunsStarted": False,
            "candidateRun": False,
            "candidateFreezeAllowed": False,
            "promotionAllowed": False,
            "ppoValidateEvidence": False,
            "holdoutUsed": False,
            "bt94aGateRefreshAllowed": False,
            "rolloutSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "scopeFiles": BT93L_SCOPE_FILES,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = args.output if args.output.is_absolute() else REPO_ROOT / args.output
    contract = build_contract()
    _write_json(output, contract)
    print(
        json.dumps(
            {
                "ok": contract["ok"],
                "resultClass": contract["resultClass"],
                "phaseCoverage": contract["phaseCoverage"],
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if contract["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
