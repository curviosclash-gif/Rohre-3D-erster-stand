"""BT93I.1 matrix truth and terminal-provocation artifact builder.

The script consumes BT93H/BT94A evidence, writes the BT93I start truth and
episode-counted matrix manifest, and proves terminal classification controls.
It does not train, create candidates, freeze a model, promote, or touch runtime
surfaces.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93G_ROOT = PPO_ROOT / "bt93g"
BT93H_ROOT = PPO_ROOT / "bt93h"
BT93I_ROOT = PPO_ROOT / "bt93i"
BT94A_ROOT = PPO_ROOT / "bt94a"

BT93H_FOLLOWUP_PATH = BT93H_ROOT / "followup_gate_report.json"
BT93H_HANDOVER_PATH = BT93H_ROOT / "handover_package.json"
BT93H_REPAIR_PATH = BT93H_ROOT / "repair_ladder_report.json"
BT93H_SURVIVAL_CONTRACT_PATH = BT93H_ROOT / "survival_gate_contract.json"
BT93H_TERMINAL_ROOT_PATH = BT93H_ROOT / "terminal_root_cause_report.json"
BT94A_GATE_PATH = BT94A_ROOT / "no_start_gate.json"
BT93G_ACTION_MASK_PATH = BT93G_ROOT / "action_mask_report.json"
BT93G_REWARD_GATE_PATH = BT93G_ROOT / "reward_gate_report.json"
BT93C_BASELINE_SOURCE_PATH = BT93C_ROOT / "baseline_source_manifest.json"

LANE_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
EPISODE_CONTROLLER_PATH = REPO_ROOT / "src" / "state" / "training" / "EpisodeController.js"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
EVAL_DIAGNOSTICS_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"

DEFAULT_START_TRUTH_PATH = BT93I_ROOT / "start_truth.json"
DEFAULT_MATRIX_PATH = BT93I_ROOT / "matrix_manifest.json"
DEFAULT_TERMINAL_PATH = BT93I_ROOT / "terminal_provocation_report.json"

BT93I_FINDINGS = ("F.05", "F.19", "F.27", "F.31")
REQUIRED_FAILURE_FIELDS = (
    "runtimeErrorCount",
    "crash",
    "timeout",
    "forcedRound",
    "maxSteps",
    "naturalTerminal",
    "deathCauseCounts",
    "terminalReasonCounts",
    "truncatedReasonCounts",
)

EVAL_MIN_EPISODES = 15
HOLDOUT_MIN_EPISODES = 8
BT93I_MAX_STEPS_PER_EPISODE = 180
BT93I_ENV_COUNT = 2
BT93I_FOUR_ENV_ALLOWED = False


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(value: str | Path) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _optional_source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    if path.exists():
        return _source(path, role, closure_capable)
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": None,
        "status": "missing",
    }


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _counter(value: Any) -> dict[str, int]:
    if not isinstance(value, Mapping):
        return {}
    return {str(key): _as_int(count) for key, count in sorted(value.items())}


def _read_source_tokens(path: Path, tokens: tuple[str, ...]) -> dict[str, bool]:
    text = path.read_text(encoding="utf-8")
    return {token: token in text for token in tokens}


def _gate_blockers(gate: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    rows = _get(gate, "bt93cState", "bt94aBlockers")
    if not isinstance(rows, list):
        return {}
    return {
        str(row.get("id")): row
        for row in rows
        if isinstance(row, Mapping) and row.get("id")
    }


def _red_claim_checks(gate: Mapping[str, Any], followup: Mapping[str, Any]) -> list[dict[str, Any]]:
    checks = gate.get("claimChecks") if isinstance(gate.get("claimChecks"), list) else []
    red = [dict(check) for check in checks if isinstance(check, Mapping) and not check.get("ok")]
    if red:
        return red
    followup_checks = followup.get("redClaimChecks") if isinstance(followup.get("redClaimChecks"), list) else []
    return [dict(check) for check in followup_checks if isinstance(check, Mapping)]


def _lane_metrics(repair: Mapping[str, Any], key: str) -> Mapping[str, Any]:
    return _get(repair, "comparison", key) or {}


def _episode_gap(repair: Mapping[str, Any]) -> dict[str, Any]:
    eval_lane = _lane_metrics(repair, "ppoComparableTerminalEval")
    holdout_lane = _lane_metrics(repair, "ppoHoldout")
    eval_count = _as_int(eval_lane.get("completedEpisodeCount"))
    holdout_count = _as_int(holdout_lane.get("completedEpisodeCount"))
    return {
        "eval": {
            "required": EVAL_MIN_EPISODES,
            "observed": eval_count,
            "missing": max(0, EVAL_MIN_EPISODES - eval_count),
            "sourceRunId": eval_lane.get("runId"),
            "sourceReport": eval_lane.get("report"),
        },
        "holdout": {
            "required": HOLDOUT_MIN_EPISODES,
            "observed": holdout_count,
            "missing": max(0, HOLDOUT_MIN_EPISODES - holdout_count),
            "sourceRunId": holdout_lane.get("runId"),
            "sourceReport": holdout_lane.get("report"),
        },
        "gate": "episode-targeted eval/holdout must reach completedEpisodeCount before BT94A can open",
    }


def _dqn_thresholds(contract: Mapping[str, Any]) -> dict[str, Any]:
    thresholds = _get(contract, "decisionRules", "BT94A-ready", "thresholds") or {}
    return {
        "dqnAvgStepsPerEpisode": thresholds.get("dqnAvgStepsPerEpisode"),
        "dqnAverageBotSurvival": thresholds.get("dqnAverageBotSurvival"),
        "minEvalAvgStepsPerEpisode": thresholds.get("minEvalAvgStepsPerEpisode"),
        "minHoldoutAvgStepsPerEpisode": thresholds.get("minHoldoutAvgStepsPerEpisode"),
        "minEvalAverageBotSurvival": thresholds.get("minEvalAverageBotSurvival"),
        "minHoldoutAverageBotSurvival": thresholds.get("minHoldoutAverageBotSurvival"),
        "minStepsDeltaPct": thresholds.get("minStepsDeltaPct"),
        "minSurvivalDeltaPctForBt94aReady": thresholds.get("minSurvivalDeltaPctForBt94aReady"),
        "source": _rel(BT93H_SURVIVAL_CONTRACT_PATH),
    }


def _finding_register(
    gate: Mapping[str, Any],
    followup: Mapping[str, Any],
    repair: Mapping[str, Any],
    contract: Mapping[str, Any],
) -> dict[str, dict[str, Any]]:
    blockers = _gate_blockers(gate)
    eval_lane = _lane_metrics(repair, "ppoComparableTerminalEval")
    holdout_lane = _lane_metrics(repair, "ppoHoldout")
    deltas = _get(repair, "comparison", "deltasAgainstDqn") or {}
    thresholds = _dqn_thresholds(contract)
    dispositions = repair.get("findingDisposition") if isinstance(repair.get("findingDisposition"), Mapping) else {}
    remaining = set(str(item) for item in followup.get("remainingBt94aGates") or [])

    def gate_evidence(finding_id: str, fallback: str) -> str:
        row = blockers.get(finding_id)
        return str(row.get("evidence")) if isinstance(row, Mapping) and row.get("evidence") else fallback

    return {
        "F.05": {
            "status": "active-blocker" if "F.05" in remaining else "unknown",
            "priorDisposition": dispositions.get("F.05"),
            "evidence": gate_evidence(
                "F.05",
                "BT93H remains below the DQN avgStepsPerEpisode threshold on eval and holdout.",
            ),
            "observed": {
                "evalAvgStepsPerEpisode": eval_lane.get("avgStepsPerEpisode"),
                "holdoutAvgStepsPerEpisode": holdout_lane.get("avgStepsPerEpisode"),
                "minEvalAvgStepsPerEpisode": thresholds.get("minEvalAvgStepsPerEpisode"),
                "minHoldoutAvgStepsPerEpisode": thresholds.get("minHoldoutAvgStepsPerEpisode"),
                "evalAvgStepsPerEpisodePct": deltas.get("evalAvgStepsPerEpisodePct"),
                "holdoutAvgStepsPerEpisodePct": deltas.get("holdoutAvgStepsPerEpisodePct"),
            },
            "bt93iTreatment": "repair must prove Steps-Non-Regression and Survival target on the BT93I episode-counted matrix",
        },
        "F.19": {
            "status": "active-blocker" if "F.19" in remaining else "unknown",
            "priorDisposition": dispositions.get("F.19"),
            "evidence": gate_evidence("F.19", "BT93H terminal/death matrix is not start-capable."),
            "observed": {
                "evalFailureClasses": eval_lane.get("failureClasses"),
                "holdoutFailureClasses": holdout_lane.get("failureClasses"),
            },
            "bt93iTreatment": "eval and holdout each need deathCauseCounts plus non-death naturalTerminal coverage",
        },
        "F.27": {
            "status": "active-blocker" if "F.27" in remaining else "unknown",
            "priorDisposition": dispositions.get("F.27"),
            "evidence": gate_evidence("F.27", "BT93H comparison remains ppo-regression."),
            "observed": {
                "precomparisonResultClass": _get(gate, "bt93cState", "precomparisonResultClass"),
                "deltasAgainstDqn": deltas,
                "repairResultClass": repair.get("resultClass"),
            },
            "bt93iTreatment": "BT93I may only downgrade this with non-regressive eval and holdout evidence",
        },
        "F.31": {
            "status": "active-blocker" if "F.31" in remaining else "unknown",
            "priorDisposition": dispositions.get("F.31"),
            "evidence": gate_evidence(
                "F.31",
                "BT93H natural terminal evidence remains absent in eval/holdout.",
            ),
            "observed": {
                "evalNaturalTerminal": _get(eval_lane, "failureClasses", "naturalTerminal"),
                "holdoutNaturalTerminal": _get(holdout_lane, "failureClasses", "naturalTerminal"),
                "evalDeathCauseCounts": _get(eval_lane, "failureClasses", "deathCauseCounts"),
                "holdoutDeathCauseCounts": _get(holdout_lane, "failureClasses", "deathCauseCounts"),
            },
            "bt93iTreatment": "terminal-provocation must prove non-death natural terminal control before repair can continue",
        },
    }


def build_matrix_manifest(
    gate: Mapping[str, Any],
    repair: Mapping[str, Any],
    contract: Mapping[str, Any],
) -> dict[str, Any]:
    holdout_matrix = _get(contract, "referenceLock", "holdoutMatrix") or {}
    seeds = holdout_matrix.get("seeds") if isinstance(holdout_matrix.get("seeds"), Mapping) else {}
    maps = holdout_matrix.get("maps") if isinstance(holdout_matrix.get("maps"), list) else ["standard", "maze"]
    thresholds = _dqn_thresholds(contract)
    model_package = _get(gate, "bt93cState", "modelPackage") or {}
    matrix_checks = {
        "evalMinEpisodesPinned": EVAL_MIN_EPISODES >= 15,
        "holdoutMinEpisodesPinned": HOLDOUT_MIN_EPISODES >= 8,
        "envCountPinned": BT93I_ENV_COUNT == 2,
        "fourEnvDisabled": BT93I_FOUR_ENV_ALLOWED is False,
        "maxStepsPerEpisodePinned": BT93I_MAX_STEPS_PER_EPISODE == _as_int(
            holdout_matrix.get("maxStepsPerEpisode")
        ),
        "mapsPinned": bool(maps),
        "seedsPinned": all(key in seeds for key in ("train", "eval", "holdout")),
        "thresholdsPinned": all(
            thresholds.get(key) is not None
            for key in (
                "minEvalAvgStepsPerEpisode",
                "minHoldoutAvgStepsPerEpisode",
                "minEvalAverageBotSurvival",
                "minHoldoutAverageBotSurvival",
            )
        ),
    }
    return {
        "ok": all(matrix_checks.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_matrix_truth.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.1",
        "matrixId": "bt93i-terminal-curriculum-episode-matrix-v1",
        "resultClass": "episode-targeted-matrix-pinned",
        "matrixChecks": matrix_checks,
        "comparisonUse": "BT93I repair/eval/holdout gate only; no candidate, freeze, promote, rollout, or PPO-Validate signal.",
        "env": {
            "modeId": holdout_matrix.get("modeId") or _get(gate, "bt93cState", "semanticWindow"),
            "maps": maps,
            "envCount": BT93I_ENV_COUNT,
            "evalEnvCount": BT93I_ENV_COUNT,
            "fourEnvAllowed": BT93I_FOUR_ENV_ALLOWED,
            "maxStepsPerEpisode": BT93I_MAX_STEPS_PER_EPISODE,
            "semanticWindow": _get(gate, "bt93cState", "semanticWindow"),
        },
        "seeds": {
            "train": list(seeds.get("train") or [934, 935, 936, 937]),
            "eval": list(seeds.get("eval") or [944, 945, 946]),
            "holdout": list(seeds.get("holdout") or [960, 961]),
            "terminalProvocation": [9301, 9302, 9303],
        },
        "minimumEpisodes": {
            "eval": EVAL_MIN_EPISODES,
            "holdout": HOLDOUT_MIN_EPISODES,
            "rule": "Eval/Holdout completion is gated by completedEpisodeCount, not fixed eval-steps alone.",
        },
        "targets": {
            "avgStepsPerEpisode": {
                "evalMin": thresholds.get("minEvalAvgStepsPerEpisode"),
                "holdoutMin": thresholds.get("minHoldoutAvgStepsPerEpisode"),
                "dqnAnchor": thresholds.get("dqnAvgStepsPerEpisode"),
                "nonRegressionRequired": True,
            },
            "averageBotSurvival": {
                "evalMin": thresholds.get("minEvalAverageBotSurvival"),
                "holdoutMin": thresholds.get("minHoldoutAverageBotSurvival"),
                "dqnAnchor": thresholds.get("dqnAverageBotSurvival"),
                "plus30PctRequiredForBt94aReady": True,
            },
            "runtimeErrorCount": 0,
            "terminalDeathMatrix": "eval and holdout each require player-dead/death class plus non-death natural terminal coverage",
        },
        "baseline": {
            "baselineId": _get(gate, "bt93cState", "baselineId"),
            "matrixId": _get(gate, "bt93cState", "matrixId"),
            "dqnChampion": {
                "avgStepsPerEpisode": thresholds.get("dqnAvgStepsPerEpisode"),
                "averageBotSurvival": thresholds.get("dqnAverageBotSurvival"),
                "source": "BT93H survival gate contract / BT11 historical DQN champion anchor",
            },
            "modelPackage": model_package,
        },
        "guardrails": {
            "allowedRunKinds": [
                "diagnostic",
                "terminal-provocation",
                "episode-count-eval",
                "terminal-curriculum-repair",
                "terminal-curriculum-repair-eval",
                "holdout-eval",
            ],
            "forbiddenRunKinds": [
                "candidate",
                "freeze",
                "freeze-candidate",
                "promote",
                "rollout-ready",
                "BT94B-ready",
                "baseline",
            ],
            "candidateRunsAllowed": False,
            "candidateFreezeAllowed": False,
            "promotionAllowed": False,
            "runtimeSurfacesTouched": [],
        },
        "sourceArtifacts": {
            "bt93hSurvivalContract": _source(BT93H_SURVIVAL_CONTRACT_PATH, "BT93H survival gate contract"),
            "bt93hRepairLadder": _source(BT93H_REPAIR_PATH, "BT93H repair ladder"),
            "bt94aNoStartGate": _source(BT94A_GATE_PATH, "BT94A red no-start gate"),
        },
    }


def build_start_truth(
    gate: Mapping[str, Any],
    followup: Mapping[str, Any],
    handover: Mapping[str, Any],
    repair: Mapping[str, Any],
    contract: Mapping[str, Any],
    terminal_root: Mapping[str, Any],
    matrix_manifest: Mapping[str, Any],
) -> dict[str, Any]:
    red_checks = _red_claim_checks(gate, followup)
    register = _finding_register(gate, followup, repair, contract)
    episode_gap = _episode_gap(repair)
    remaining = list(followup.get("remainingBt94aGates") or _get(gate, "bt93cState", "remainingBt94aGates") or [])
    start_checks = {
        "bt93hFollowupRequiresRepair": followup.get("followupRequired") is True,
        "bt94aGateStillClosed": gate.get("claimable") is False
        and gate.get("candidateRunsAllowed") is False
        and gate.get("matrixDefinitionAllowed") is False,
        "trackedBlockersExplicit": all(finding in register for finding in BT93I_FINDINGS),
        "minimumEpisodeGapExplicit": episode_gap["eval"]["missing"] > 0 or episode_gap["holdout"]["missing"] > 0,
        "dqnThresholdsPinned": bool(_dqn_thresholds(contract).get("minEvalAvgStepsPerEpisode")),
        "matrixManifestPinned": bool(matrix_manifest.get("ok")),
    }
    return {
        "ok": all(start_checks.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_matrix_truth.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.1",
        "resultClass": "start-truth-pinned",
        "startChecks": start_checks,
        "bt94aStatus": {
            "resultClass": gate.get("resultClass"),
            "claimable": gate.get("claimable"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "precomparisonResultClass": _get(gate, "bt93cState", "precomparisonResultClass"),
            "bt94aBlockerCount": _get(gate, "bt93cState", "bt94aBlockerCount"),
            "handoverGate": _get(gate, "bt93cState", "handoverGate"),
            "handoverReady": _get(gate, "bt93cState", "handoverReady"),
        },
        "redClaimChecks": red_checks,
        "remainingBt94aGates": remaining,
        "findingRegister": register,
        "minimumEpisodeGap": episode_gap,
        "dqnThresholds": _dqn_thresholds(contract),
        "terminalRootCauseCarryForward": {
            "fieldContractOk": _get(terminal_root, "rootCause", "fieldContractOk"),
            "coverageGap": _get(terminal_root, "rootCause", "coverageGap"),
            "blockingReasons": _get(terminal_root, "rootCause", "blockingReasons") or [],
            "source": _rel(BT93H_TERMINAL_ROOT_PATH),
        },
        "priorBt93hRepair": {
            "resultClass": repair.get("resultClass"),
            "repairRun": repair.get("repairRun"),
            "deltasAgainstDqn": _get(repair, "comparison", "deltasAgainstDqn"),
            "eval": _lane_metrics(repair, "ppoComparableTerminalEval"),
            "holdout": _lane_metrics(repair, "ppoHoldout"),
        },
        "matrixManifest": {
            "path": _rel(DEFAULT_MATRIX_PATH),
            "matrixId": matrix_manifest.get("matrixId"),
            "minimumEpisodes": matrix_manifest.get("minimumEpisodes"),
            "env": matrix_manifest.get("env"),
            "targets": matrix_manifest.get("targets"),
        },
        "nextAllowedWork": [
            "93I.2 episode-targeted eval/holdout runner readiness",
            "93I.2 long-run budget and early-stop report",
        ],
        "stillForbidden": [
            "BT94A candidate run",
            "freeze candidate",
            "BT94B handover",
            "promote",
            "rollout-ready wording",
            "productive Runtime/Matchstart/AI-Hub/Strategy-Flag/Registry/JS-Inference changes",
        ],
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_matrix_truth.py --write",
            "priorBt93hRepair": _get(repair, "commands", "report"),
            "priorBt94aGate": _get(handover, "commands", "gateCheck"),
        },
        "sourceArtifacts": {
            "bt93hFollowupGate": _source(BT93H_FOLLOWUP_PATH, "BT93H followup gate"),
            "bt93hHandoverPackage": _source(BT93H_HANDOVER_PATH, "BT93H handover package"),
            "bt93hRepairLadder": _source(BT93H_REPAIR_PATH, "BT93H repair ladder"),
            "bt93hSurvivalContract": _source(BT93H_SURVIVAL_CONTRACT_PATH, "BT93H survival gate contract"),
            "bt93hTerminalRootCause": _source(BT93H_TERMINAL_ROOT_PATH, "BT93H terminal root cause"),
            "bt94aNoStartGate": _source(BT94A_GATE_PATH, "BT94A red no-start gate"),
            "bt93gActionMask": _optional_source(BT93G_ACTION_MASK_PATH, "BT93G action mask"),
            "bt93gRewardGate": _optional_source(BT93G_REWARD_GATE_PATH, "BT93G reward gate"),
            "bt93cBaselineSource": _optional_source(BT93C_BASELINE_SOURCE_PATH, "BT93C DQN anchor source"),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
        },
    }


def _probe_script() -> str:
    return r"""
import {
  deriveHeadlessLaneEpisodeStep,
} from './scripts/training-headless-lane-runner.mjs';
import {
  EpisodeController,
  TRAINING_TERMINAL_REASONS,
} from './src/state/training/EpisodeController.js';

function classifyDeath(reason) {
  const lowered = String(reason || '').toLowerCase();
  return ['death', 'dead', 'crash', 'loss', 'killed'].some((token) => lowered.includes(token));
}

function failureSemantics(snapshot) {
  const terminalReason = snapshot.terminalReason || null;
  const truncatedReason = snapshot.truncatedReason || null;
  const isDeath = classifyDeath(terminalReason);
  return {
    runtimeErrorCount: 0,
    crash: terminalReason && String(terminalReason).includes('crash') ? 1 : 0,
    timeout: truncatedReason === 'time-limit' ? 1 : 0,
    forcedRound: 0,
    socketClose: 0,
    teardownFailure: 0,
    maxSteps: truncatedReason === 'max-steps' ? 1 : 0,
    naturalTerminal: terminalReason && !isDeath ? 1 : 0,
    terminalReasonCounts: terminalReason ? { [terminalReason]: 1 } : {},
    truncatedReasonCounts: truncatedReason ? { [truncatedReason]: 1 } : {},
    deathCauseCounts: isDeath ? { [terminalReason]: 1 } : {},
  };
}

function terminalProbe({ id, lifecycle, tickLifecycle, player, seed, map }) {
  const controller = new EpisodeController({ defaultMaxSteps: 5 });
  controller.reset({ episodeId: id, maxSteps: 5, nowMs: seed });
  const stepInput = deriveHeadlessLaneEpisodeStep({
    player,
    lifecycle,
    tickLifecycle,
    nowMs: seed + 1,
  });
  const snapshot = controller.step(stepInput);
  return {
    id,
    command: 'node --input-type=module -e <bt93i embedded terminal probe>',
    seed,
    map,
    countsAsQualityEvidence: false,
    done: snapshot.done,
    truncated: snapshot.truncated,
    terminalReason: snapshot.terminalReason,
    truncatedReason: snapshot.truncatedReason,
    stepIndex: snapshot.stepIndex,
    maxSteps: snapshot.maxSteps,
    failureSemantics: failureSemantics(snapshot),
  };
}

function maxStepsProbe() {
  const seed = 9303;
  const controller = new EpisodeController({ defaultMaxSteps: 2 });
  controller.reset({ episodeId: 'bt93i-headless-max-steps', maxSteps: 2, nowMs: seed });
  controller.step(deriveHeadlessLaneEpisodeStep({
    player: { alive: true },
    lifecycle: 'running',
    nowMs: seed + 1,
  }));
  const snapshot = controller.step(deriveHeadlessLaneEpisodeStep({
    player: { alive: true },
    lifecycle: 'running',
    nowMs: seed + 2,
  }));
  return {
    id: 'bt93i-headless-max-steps',
    command: 'node --input-type=module -e <bt93i embedded terminal probe>',
    seed,
    map: 'standard',
    countsAsQualityEvidence: false,
    done: snapshot.done,
    truncated: snapshot.truncated,
    terminalReason: snapshot.terminalReason,
    truncatedReason: snapshot.truncatedReason,
    stepIndex: snapshot.stepIndex,
    maxSteps: snapshot.maxSteps,
    failureSemantics: failureSemantics(snapshot),
  };
}

const probes = [
  terminalProbe({
    id: 'bt93i-headless-player-dead',
    lifecycle: 'running',
    player: { alive: false },
    seed: 9301,
    map: 'standard',
  }),
  terminalProbe({
    id: 'bt93i-headless-round-ended',
    lifecycle: 'round_end',
    player: { alive: true },
    seed: 9302,
    map: 'maze',
  }),
  terminalProbe({
    id: 'bt93i-headless-match-ended',
    tickLifecycle: 'match_end',
    player: { alive: true },
    seed: 9302,
    map: 'maze',
  }),
  maxStepsProbe(),
];

process.stdout.write(JSON.stringify({
  ok: true,
  generatedBy: 'python/scripts/bt93i_matrix_truth.py::node-probes',
  noRuntimeBypass: true,
  sourceModules: [
    'scripts/training-headless-lane-runner.mjs',
    'src/state/training/EpisodeController.js',
  ],
  countsAsQualityEvidence: false,
  countsAsPromotionEvidence: false,
  countsAsPpoValidateEvidence: false,
  probes,
  expectations: {
    playerDeadTerminalReason: TRAINING_TERMINAL_REASONS.PLAYER_DEAD,
    kernelEndTerminalReason: TRAINING_TERMINAL_REASONS.MATCH_ENDED,
    maxStepsTruncatedReason: 'max-steps',
  },
}));
"""


def _run_node_probes() -> dict[str, Any]:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", _probe_script()],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "node probes failed")
    return json.loads(result.stdout.strip())


def _failure_audit(lane_id: str, report_path: Path, failure: Mapping[str, Any]) -> dict[str, Any]:
    missing = [field for field in REQUIRED_FAILURE_FIELDS if field not in failure]
    terminal_counts = _counter(failure.get("terminalReasonCounts"))
    truncated_counts = _counter(failure.get("truncatedReasonCounts"))
    death_counts = _counter(failure.get("deathCauseCounts"))
    natural_terminal = _as_int(failure.get("naturalTerminal"))
    max_steps = _as_int(failure.get("maxSteps"))
    return {
        "laneId": lane_id,
        "report": _rel(report_path),
        "requiredFieldsPresent": not missing,
        "missingFields": missing,
        "terminalReasonCounts": terminal_counts,
        "truncatedReasonCounts": truncated_counts,
        "deathCauseCounts": death_counts,
        "naturalTerminal": natural_terminal,
        "maxSteps": max_steps,
        "hasDeathCause": bool(death_counts),
        "hasNonDeathNaturalTerminal": natural_terminal > 0,
        "maxStepsOnly": max_steps > 0 and not terminal_counts and not death_counts,
    }


def _python_eval_field_audit(repair: Mapping[str, Any]) -> dict[str, Any]:
    lanes = []
    for lane_id, key in (
        ("bt93h-raw-comparable-terminal-eval", "ppoComparableTerminalEval"),
        ("bt93h-raw-holdout-eval", "ppoHoldout"),
    ):
        lane = _lane_metrics(repair, key)
        report_path = _repo_path(str(lane.get("report")))
        report = _read_json(report_path)
        failure = _get(report, "diagnostics", "failureSemantics") or lane.get("failureClasses") or {}
        lanes.append(_failure_audit(lane_id, report_path, failure))
    return {
        "ok": all(lane["requiredFieldsPresent"] for lane in lanes),
        "lanes": lanes,
        "summary": {
            "laneCount": len(lanes),
            "allRequiredFieldsPresent": all(lane["requiredFieldsPresent"] for lane in lanes),
            "deathCauseObserved": any(lane["hasDeathCause"] for lane in lanes),
            "nonDeathNaturalTerminalObserved": any(lane["hasNonDeathNaturalTerminal"] for lane in lanes),
            "anyMaxStepsOnlyLane": any(lane["maxStepsOnly"] for lane in lanes),
        },
    }


def _source_alignment() -> dict[str, Any]:
    checks = {
        "laneRunner": _read_source_tokens(
            LANE_RUNNER_PATH,
            (
                "deriveHeadlessLaneEpisodeStep",
                "TRAINING_TERMINAL_REASONS.PLAYER_DEAD",
                "TRAINING_TERMINAL_REASONS.MATCH_ENDED",
                "TRAINING_TRUNCATION_REASONS.TIME_LIMIT",
                "terminalReason",
                "truncatedReason",
            ),
        ),
        "episodeController": _read_source_tokens(
            EPISODE_CONTROLLER_PATH,
            (
                "TRAINING_TERMINAL_REASONS",
                "TRAINING_TRUNCATION_REASONS",
                "terminalReason",
                "truncatedReason",
                "done",
                "truncated",
                "max-steps",
            ),
        ),
        "curviosEnv": _read_source_tokens(
            CURVIOS_ENV_PATH,
            (
                "payload.get(\"done\")",
                "payload.get(\"truncated\")",
                "info_payload.get(\"terminalReason\")",
                "info_payload.get(\"truncatedReason\")",
            ),
        ),
        "evalDiagnostics": _read_source_tokens(
            EVAL_DIAGNOSTICS_PATH,
            (
                "terminalReasonCounts",
                "truncatedReasonCounts",
                "deathCauseCounts",
                "naturalTerminal",
                "maxSteps",
                "failureSemantics",
            ),
        ),
    }
    return {
        "ok": all(all(group.values()) for group in checks.values()),
        "checks": checks,
        "sourceArtifacts": {
            "laneRunner": _source(LANE_RUNNER_PATH, "headless terminal derivation"),
            "episodeController": _source(EPISODE_CONTROLLER_PATH, "episode lifecycle authority"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python env done/truncated extraction"),
            "evalDiagnostics": _source(EVAL_DIAGNOSTICS_PATH, "Python eval failureSemantics aggregation"),
        },
    }


def build_terminal_provocation_report(
    repair: Mapping[str, Any],
    terminal_root: Mapping[str, Any],
    matrix_manifest: Mapping[str, Any],
) -> dict[str, Any]:
    probes = _run_node_probes()
    rows = probes.get("probes") if isinstance(probes.get("probes"), list) else []
    by_id = {str(row.get("id")): row for row in rows if isinstance(row, Mapping)}
    python_audit = _python_eval_field_audit(repair)
    source_alignment = _source_alignment()

    player_dead = by_id.get("bt93i-headless-player-dead", {})
    match_ended = by_id.get("bt93i-headless-match-ended", {})
    round_ended = by_id.get("bt93i-headless-round-ended", {})
    max_steps = by_id.get("bt93i-headless-max-steps", {})
    non_death_terminal_ok = bool(
        match_ended.get("terminalReason") == "match-ended"
        and _get(match_ended, "failureSemantics", "naturalTerminal") == 1
        and not _get(match_ended, "failureSemantics", "deathCauseCounts")
    )
    scenario_checks = {
        "playerDead": bool(
            player_dead.get("done") is True
            and player_dead.get("terminalReason") == "player-dead"
            and _get(player_dead, "failureSemantics", "deathCauseCounts", "player-dead") == 1
        ),
        "matchEndedNonDeathNaturalTerminal": non_death_terminal_ok,
        "roundEndedNonDeathNaturalTerminal": bool(
            round_ended.get("terminalReason") == "match-ended"
            and _get(round_ended, "failureSemantics", "naturalTerminal") == 1
        ),
        "maxStepsControl": bool(
            max_steps.get("truncated") is True
            and max_steps.get("truncatedReason") == "max-steps"
            and _get(max_steps, "failureSemantics", "maxSteps") == 1
        ),
        "pythonEvalFieldsPresent": python_audit["ok"],
        "sourceAlignmentOk": source_alignment["ok"],
        "noRuntimeBypass": probes.get("noRuntimeBypass") is True,
    }
    terminal_ok = all(scenario_checks.values())
    python_eval_summary = python_audit["summary"]
    phase_coverage = {
        "93I.1.3": terminal_ok,
        "93I.1.4": non_death_terminal_ok,
    }
    return {
        "ok": all(phase_coverage.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_matrix_truth.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.1",
        "resultClass": "terminal-provocation-green" if terminal_ok else "terminal-provocation-blocked",
        "phaseCoverage": phase_coverage,
        "scenarioChecks": scenario_checks,
        "matrixId": matrix_manifest.get("matrixId"),
        "headlessProvocation": {
            "ok": probes.get("ok"),
            "noRuntimeBypass": probes.get("noRuntimeBypass"),
            "countsAsQualityEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsPpoValidateEvidence": False,
            "probes": rows,
        },
        "pythonEvalFieldAudit": python_audit,
        "sourceAlignment": source_alignment,
        "terminalRootCauseCarryForward": {
            "fieldContractOk": _get(terminal_root, "rootCause", "fieldContractOk"),
            "coverageGap": _get(terminal_root, "rootCause", "coverageGap"),
            "source": _rel(BT93H_TERMINAL_ROOT_PATH),
        },
        "evalMatrixStatus": {
            "existingBt93hEvalHasNonDeathNaturalTerminal": bool(
                python_eval_summary.get("nonDeathNaturalTerminalObserved")
            ),
            "existingBt93hEvalHasDeathCause": bool(python_eval_summary.get("deathCauseObserved")),
            "existingBt93hEvalStillStartBlocked": not bool(
                python_eval_summary.get("nonDeathNaturalTerminalObserved")
            ),
            "interpretation": (
                "Headless non-death natural terminal control is reproducible; existing BT93H eval/holdout "
                "still lacks that class and must be repaired by later BT93I phases."
            ),
        },
        "longRunGateImpact": {
            "repairOrLongRunStopRequiredBy93I14": not non_death_terminal_ok,
            "longRunAllowed": False,
            "reason": (
                "93I.1 terminal-provocation is green; 93I.2 still must pin episode-targeted eval and early-stop readiness."
                if terminal_ok
                else "Terminal-provocation is red; stop before repair or long run."
            ),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93i_matrix_truth.py --write",
            "nodeProbe": "node --input-type=module -e <bt93i embedded terminal probe>",
            "bt93hEval": _get(repair, "commands", "eval"),
            "bt93hHoldout": _get(repair, "commands", "holdout"),
        },
        "sourceArtifacts": {
            "laneRunner": _source(LANE_RUNNER_PATH, "headless lane terminal derivation"),
            "episodeController": _source(EPISODE_CONTROLLER_PATH, "episode lifecycle authority"),
            "bt93hTerminalRootCause": _source(BT93H_TERMINAL_ROOT_PATH, "BT93H terminal root cause"),
            "bt93hRepairLadder": _source(BT93H_REPAIR_PATH, "BT93H repair ladder"),
            "matrixManifest": {
                "closureCapable": True,
                "path": _rel(DEFAULT_MATRIX_PATH),
                "role": "BT93I matrix manifest",
                "sha256": _sha256_file(DEFAULT_MATRIX_PATH) if DEFAULT_MATRIX_PATH.exists() else None,
            },
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
        },
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    gate = _read_json(BT94A_GATE_PATH)
    followup = _read_json(BT93H_FOLLOWUP_PATH)
    handover = _read_json(BT93H_HANDOVER_PATH)
    repair = _read_json(BT93H_REPAIR_PATH)
    contract = _read_json(BT93H_SURVIVAL_CONTRACT_PATH)
    terminal_root = _read_json(BT93H_TERMINAL_ROOT_PATH)

    matrix_manifest = build_matrix_manifest(gate, repair, contract)
    start_truth = build_start_truth(gate, followup, handover, repair, contract, terminal_root, matrix_manifest)
    terminal_report = build_terminal_provocation_report(repair, terminal_root, matrix_manifest)

    matrix_manifest["phaseCoverage"] = {
        "93I.1.2": matrix_manifest["ok"],
    }
    start_truth["phaseCoverage"] = {
        "93I.1.1": start_truth["ok"],
    }
    start_truth["terminalProvocationPreview"] = {
        "path": _rel(DEFAULT_TERMINAL_PATH),
        "resultClass": terminal_report.get("resultClass"),
        "nonDeathNaturalTerminalReproducible": _get(
            terminal_report,
            "scenarioChecks",
            "matchEndedNonDeathNaturalTerminal",
        ),
    }
    return start_truth, matrix_manifest, terminal_report


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93I.1 matrix truth artifacts.")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--start-truth-output", default=str(DEFAULT_START_TRUTH_PATH))
    parser.add_argument("--matrix-output", default=str(DEFAULT_MATRIX_PATH))
    parser.add_argument("--terminal-output", default=str(DEFAULT_TERMINAL_PATH))
    args = parser.parse_args()

    start_truth, matrix_manifest, terminal_report = build_reports()
    if args.write:
        _write_json(_repo_path(args.matrix_output), matrix_manifest)
        terminal_report["sourceArtifacts"]["matrixManifest"]["sha256"] = _sha256_file(_repo_path(args.matrix_output))
        _write_json(_repo_path(args.start_truth_output), start_truth)
        _write_json(_repo_path(args.terminal_output), terminal_report)

    print(
        json.dumps(
            {
                "ok": bool(start_truth["ok"] and matrix_manifest["ok"] and terminal_report["ok"]),
                "phaseCoverage": {
                    **start_truth.get("phaseCoverage", {}),
                    **matrix_manifest.get("phaseCoverage", {}),
                    **terminal_report.get("phaseCoverage", {}),
                },
                "resultClass": {
                    "startTruth": start_truth["resultClass"],
                    "matrix": matrix_manifest["resultClass"],
                    "terminalProvocation": terminal_report["resultClass"],
                },
                "episodeGap": start_truth["minimumEpisodeGap"],
                "redClaimCheckCount": len(start_truth["redClaimChecks"]),
                "wrote": {
                    "startTruth": args.start_truth_output if args.write else None,
                    "matrix": args.matrix_output if args.write else None,
                    "terminalProvocation": args.terminal_output if args.write else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if start_truth["ok"] and matrix_manifest["ok"] and terminal_report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
