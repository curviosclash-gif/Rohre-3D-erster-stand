"""BT93J.5b reward/curriculum proof-lane report.

This phase prepares the explicit user-owned 1000000-step diagnostic longrun.
It writes proof-lane and readiness artifacts only. It does not run training,
use holdout, refresh BT94A, create a candidate, freeze, promote, or touch
productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
BT93J_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93j"

R2_REPORT_PATH = BT93J_ROOT / "r2_micro_train_counterprobe_report.json"
REWARD_DIAGNOSTICS_PATH = BT93J_ROOT / "reward_curriculum_diagnostics.json"
ACTION_DIAGNOSTICS_PATH = BT93J_ROOT / "action_policy_diagnostics.json"
TERMINAL_REPORT_PATH = BT93J_ROOT / "terminal_semantics_report.json"
MATRIX_REPORT_PATH = BT93J_ROOT / "matrix_contract_report.json"
CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93j_reward_curriculum_proof_lane.json"
PROOF_REPORT_PATH = BT93J_ROOT / "reward_curriculum_proof_lane_report.json"
READINESS_REPORT_PATH = BT93J_ROOT / "user_owned_1m_longrun_readiness_report.json"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
LEARNER_SMOKE_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
SINGLE_ENV_BRIDGE_PATH = REPO_ROOT / "scripts" / "training-single-env-bridge.mjs"

PROOF_PROFILE_ID = "bt93j-reward-curriculum-proof-v1"
PROOF_LONGRUN_KIND = "bt93j-user-owned-1m-proof-longrun"

NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no holdout, pilot, baseline, PPO-Validate, or gate refresh from BT93J.5b",
    "no productive RuntimeConfig, Strategy Flag, JS inference, model registry, rollback, Matchstart, AI-Hub, bridge, or authority change",
    "BT93J.5b only prepares the explicit user-owned 93J.5c diagnostic longrun",
)

NODE_PROBE = r"""
import {
  BT93J_REWARD_CURRICULUM_PROOF_PROFILE_ID,
  buildHeadlessTrainingRewardSignals,
  deriveHeadlessLaneEpisodeStep,
  resolveHeadlessRewardProfile,
} from './scripts/training-headless-lane-runner.mjs';
import {
  RewardCalculator,
} from './src/state/training/RewardCalculator.js';

const profile = resolveHeadlessRewardProfile(BT93J_REWARD_CURRICULUM_PROOF_PROFILE_ID);
const calculator = new RewardCalculator(profile.rewardCalculatorOptions);

function addBreakdown(left, right) {
  const merged = { ...left };
  for (const [key, value] of Object.entries(right || {})) {
    merged[key] = Number(((merged[key] || 0) + Number(value || 0)).toFixed(6));
  }
  return merged;
}

function rewardForEpisode(input, context = {}) {
  const episode = deriveHeadlessLaneEpisodeStep(input);
  const signals = buildHeadlessTrainingRewardSignals(episode, {
    ...context,
    rewardProfileId: BT93J_REWARD_CURRICULUM_PROOF_PROFILE_ID,
  });
  const reward = calculator.compute(signals, episode);
  return {
    episode: {
      done: episode.done,
      truncated: episode.truncated,
      terminalReason: episode.terminalReason,
      truncatedReason: episode.truncatedReason,
    },
    signals,
    total: reward.total,
    components: reward.components,
    stage: calculator.currentStage,
  };
}

function episodeSequence(id, runningSteps, terminalInput, terminalContext = {}) {
  let total = 0;
  let breakdown = {};
  for (let index = 0; index < runningSteps; index += 1) {
    const row = rewardForEpisode({
      player: { alive: true },
      lifecycle: 'running',
      tickLifecycle: 'running',
      nowMs: index + 1,
    }, {
      totalEnvSteps: index + 1,
    });
    total += row.total;
    breakdown = addBreakdown(breakdown, row.components);
  }
  const terminal = rewardForEpisode(terminalInput, {
    totalEnvSteps: runningSteps + 1,
    ...terminalContext,
  });
  total += terminal.total;
  breakdown = addBreakdown(breakdown, terminal.components);
  return {
    id,
    runningSteps,
    terminal,
    total: Number(total.toFixed(6)),
    breakdown,
  };
}

const playerDeadOnly = episodeSequence('player-dead-only-72-plus-death', 72, {
  player: { alive: false },
  lifecycle: 'running',
  tickLifecycle: 'running',
  nowMs: 73,
});

const naturalTerminal = episodeSequence('natural-terminal-72-plus-match-ended', 72, {
  player: { alive: true },
  lifecycle: 'match_end',
  tickLifecycle: 'match_end',
  nowMs: 73,
});

const progress = rewardForEpisode({
  player: { alive: true },
  lifecycle: 'running',
  tickLifecycle: 'running',
  nowMs: 9,
}, {
  totalEnvSteps: 9,
  progressEvent: true,
});

process.stdout.write(JSON.stringify({
  ok: true,
  generatedBy: 'python/scripts/bt93j_reward_curriculum_proof_lane.py::node-probe',
  profile,
  scenarios: [playerDeadOnly, naturalTerminal, { id: 'progress-event', ...progress }],
}, null, 2));
"""


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


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


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    payload = {
        "closureCapable": closure_capable,
        "exists": path.exists(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path) if path.exists() else None,
    }
    if not path.exists():
        payload["closureCapable"] = False
    return payload


def _run_node_probe() -> dict[str, Any]:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", NODE_PROBE],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "BT93J.5b node probe failed")
    return json.loads(result.stdout)


def _scenario(probe: Mapping[str, Any], scenario_id: str) -> Mapping[str, Any]:
    for row in probe.get("scenarios") or []:
        if isinstance(row, Mapping) and row.get("id") == scenario_id:
            return row
    return {}


def _file_contains(path: Path, *tokens: str) -> bool:
    text = path.read_text(encoding="utf-8")
    return all(token in text for token in tokens)


def _build_checks(
    r2_report: Mapping[str, Any],
    reward_diagnostics: Mapping[str, Any],
    action_diagnostics: Mapping[str, Any],
    config: Mapping[str, Any],
    probe: Mapping[str, Any],
) -> list[dict[str, Any]]:
    player_dead = _scenario(probe, "player-dead-only-72-plus-death")
    natural_terminal = _scenario(probe, "natural-terminal-72-plus-match-ended")
    progress = _scenario(probe, "progress-event")
    reward_totals = _get(r2_report, "rewardBreakdown", "totals") or {}
    return [
        {
            "id": "r2_same_red_start_pinned",
            "ok": r2_report.get("resultClass") == "same-red"
            and _get(r2_report, "terminalMatrix", "playerDeadOnly") is True
            and _get(r2_report, "avgStepsTrend", "currentAvgStepsPerEpisodeObserved") == 72.833333
            and _get(r2_report, "avgStepsTrend", "dqnAnchor") == 117.525,
            "observed": {
                "resultClass": r2_report.get("resultClass"),
                "playerDeadOnly": _get(r2_report, "terminalMatrix", "playerDeadOnly"),
                "avgSteps": _get(r2_report, "avgStepsTrend", "currentAvgStepsPerEpisodeObserved"),
                "dqnAnchor": _get(r2_report, "avgStepsTrend", "dqnAnchor"),
            },
        },
        {
            "id": "survival_dominated_reward_start_pinned",
            "ok": reward_totals.get("survival") == 61.2
            and reward_totals.get("loss") == -9.0
            and all(float(value or 0.0) == 0.0 for key, value in reward_totals.items() if key not in {"survival", "loss"}),
            "observed": reward_totals,
        },
        {
            "id": "reward_curriculum_primary_cause_still_active",
            "ok": _get(reward_diagnostics, "rewardCurriculumGate", "primaryCause") is True,
            "observed": reward_diagnostics.get("resultClass"),
        },
        {
            "id": "action_safety_stays_green",
            "ok": _get(action_diagnostics, "actionPolicyGate", "green") is True,
            "observed": action_diagnostics.get("resultClass"),
        },
        {
            "id": "proof_profile_is_configured",
            "ok": _get(config, "env", "rewardProfileId") == PROOF_PROFILE_ID
            and _get(config, "rollout", "userOwnedProofLongrunTimesteps") == 1_000_000
            and _get(config, "guardrails", "holdoutAllowed") is False
            and _get(config, "guardrails", "bt94aGateRefreshAllowed") is False,
            "observed": {
                "rewardProfileId": _get(config, "env", "rewardProfileId"),
                "timesteps": _get(config, "rollout", "userOwnedProofLongrunTimesteps"),
                "holdoutAllowed": _get(config, "guardrails", "holdoutAllowed"),
                "bt94aGateRefreshAllowed": _get(config, "guardrails", "bt94aGateRefreshAllowed"),
            },
        },
        {
            "id": "proof_lane_is_run_kind_bound",
            "ok": _file_contains(HEADLESS_RUNNER_PATH, PROOF_PROFILE_ID, PROOF_LONGRUN_KIND)
            and _file_contains(LEARNER_SMOKE_PATH, "BT93J_USER_OWNED_PROOF_LONGRUN_KIND", "userOwnedProofLongrunTimesteps")
            and _file_contains(CURVIOS_ENV_PATH, "reward_profile_id")
            and _file_contains(SINGLE_ENV_BRIDGE_PATH, "--reward-profile-id"),
            "observed": {
                "headlessRunner": _rel(HEADLESS_RUNNER_PATH),
                "learnerSmoke": _rel(LEARNER_SMOKE_PATH),
                "curviosEnv": _rel(CURVIOS_ENV_PATH),
                "singleEnvBridge": _rel(SINGLE_ENV_BRIDGE_PATH),
            },
        },
        {
            "id": "player_dead_only_is_net_negative",
            "ok": float(player_dead.get("total") or 0.0) < 0.0
            and float(_get(player_dead, "breakdown", "loss") or 0.0) < 0.0
            and float(_get(player_dead, "breakdown", "win") or 0.0) == 0.0
            and float(_get(player_dead, "breakdown", "checkpointReached") or 0.0) == 0.0,
            "observed": player_dead,
        },
        {
            "id": "natural_terminal_is_separately_positive",
            "ok": float(natural_terminal.get("total") or 0.0) > 0.0
            and float(_get(natural_terminal, "breakdown", "win") or 0.0) > 0.0
            and _get(natural_terminal, "terminal", "signals", "won") is True,
            "observed": natural_terminal,
        },
        {
            "id": "progress_reward_is_separately_visible",
            "ok": float(_get(progress, "components", "checkpointReached") or 0.0) > 0.0
            and _get(progress, "signals", "parcoursEnabled") is True,
            "observed": progress,
        },
    ]


def _classification(checks: list[Mapping[str, Any]]) -> str:
    return "reward-curriculum-proof-lane-ready" if all(check.get("ok") is True for check in checks) else "reward-curriculum-proof-lane-red"


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    r2_report = _read_json(R2_REPORT_PATH)
    reward_diagnostics = _read_json(REWARD_DIAGNOSTICS_PATH)
    action_diagnostics = _read_json(ACTION_DIAGNOSTICS_PATH)
    terminal_report = _read_json(TERMINAL_REPORT_PATH)
    matrix_report = _read_json(MATRIX_REPORT_PATH)
    config = _read_json(CONFIG_PATH)
    probe = _run_node_probe()
    checks = _build_checks(r2_report, reward_diagnostics, action_diagnostics, config, probe)
    result_class = _classification(checks)
    phase_coverage = {
        "93J.5b.1": all(check["ok"] for check in checks if check["id"] in {"r2_same_red_start_pinned", "survival_dominated_reward_start_pinned"}),
        "93J.5b.2": any(check["id"] == "proof_profile_is_configured" and check["ok"] for check in checks),
        "93J.5b.3": any(check["id"] == "proof_lane_is_run_kind_bound" and check["ok"] for check in checks),
        "93J.5b.4": all(
            any(check["id"] == check_id and check["ok"] for check in checks)
            for check_id in {
                "player_dead_only_is_net_negative",
                "natural_terminal_is_separately_positive",
                "progress_reward_is_separately_visible",
            }
        ),
        "93J.5b.5": result_class == "reward-curriculum-proof-lane-ready",
        "93J.5b.6": result_class == "reward-curriculum-proof-lane-ready",
        "93J.5b.7": True,
    }
    ok = all(phase_coverage.values())
    source_manifest = _get(r2_report, "modelPackage", "artifactManifest")
    source_manifest_command = str(source_manifest or "").replace("/", "\\")
    train_command = (
        "python\\.venv\\Scripts\\python.exe python\\train.py --profile bt93j "
        f"--run-kind {PROOF_LONGRUN_KIND} --phase-id 93J.5c "
        " --config python\\configs\\ppo_bt93j_reward_curriculum_proof_lane.json"
        " --artifact-root data\\training\\ppo\\bt93j"
        f" --checkpoint {source_manifest_command}"
        " --total-timesteps 1000000"
    )
    report = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_reward_curriculum_proof_lane.py",
        "gitSha": _git_sha(),
        "ok": ok,
        "blockId": "BT93J",
        "phaseId": "93J.5b",
        "resultClass": result_class,
        "startFinding": {
            "r2ResultClass": r2_report.get("resultClass"),
            "terminalMatrix": r2_report.get("terminalMatrix"),
            "avgStepsPerEpisodeObserved": _get(r2_report, "avgStepsTrend", "currentAvgStepsPerEpisodeObserved"),
            "dqnAnchor": _get(r2_report, "avgStepsTrend", "dqnAnchor"),
            "rewardBreakdownTotals": _get(r2_report, "rewardBreakdown", "totals"),
        },
        "rewardProfile": probe.get("profile"),
        "rewardSmoke": {
            "ok": phase_coverage["93J.5b.4"],
            "nodeProbe": probe,
        },
        "phaseCoverage": phase_coverage,
        "checks": checks,
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
            "pilotStarted": False,
            "holdoutUsed": False,
            "bt94aGateRefresh": False,
            "noGo": list(NO_GO),
        },
        "findingImpact": {
            "F.05": "still-blocking-until-93J.5c-separates-undertraining-from-reward",
            "F.19": "still-blocking-until-93J.5c-terminal-distribution-is-observed",
            "F.27": "aggregate-still-blocked; BT94A remains closed",
            "F.31": "still-blocking-until-player-dead-only-changes-in-93J.5c",
        },
        "sourceArtifacts": {
            "r2Counterprobe": _source(R2_REPORT_PATH, "BT93J R2 same-red start finding"),
            "rewardDiagnostics": _source(REWARD_DIAGNOSTICS_PATH, "BT93J reward/curriculum diagnostics"),
            "actionDiagnostics": _source(ACTION_DIAGNOSTICS_PATH, "BT93J action safety diagnostics"),
            "terminalSemantics": _source(TERMINAL_REPORT_PATH, "BT93J terminal semantics"),
            "matrixContract": _source(MATRIX_REPORT_PATH, "BT93J matrix contract"),
            "proofConfig": _source(CONFIG_PATH, "BT93J.5b PPO proof-lane config"),
            "headlessLaneRunner": _source(HEADLESS_RUNNER_PATH, "BT93J.5b run-kind-bound reward profile"),
            "learnerSmoke": _source(LEARNER_SMOKE_PATH, "BT93J.5b PPO train support"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "BT93J.5b reward-profile bridge plumbing"),
            "singleEnvBridge": _source(SINGLE_ENV_BRIDGE_PATH, "BT93J.5b controller CLI plumbing"),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_reward_curriculum_proof_lane.py --write-reports",
            "nodeProbe": "node --input-type=module -e <bt93j 93J.5b embedded reward probes>",
            "userOwnedLongrun": train_command,
        },
    }
    readiness = {
        "generatedAt": report["generatedAt"],
        "generatedBy": report["generatedBy"],
        "gitSha": report["gitSha"],
        "ok": ok,
        "blockId": "BT93J",
        "phaseId": "93J.5b",
        "readyForUserOwnedLongrun": ok,
        "resultClass": "ready" if ok else "blocked",
        "requiredRunKind": PROOF_LONGRUN_KIND,
        "config": {
            "path": _rel(CONFIG_PATH),
            "sha256": _sha256_file(CONFIG_PATH),
            "rewardProfileId": PROOF_PROFILE_ID,
            "totalTimesteps": _get(config, "rollout", "userOwnedProofLongrunTimesteps"),
            "checkpointFrequencyTimesteps": _get(config, "rollout", "checkpointFrequencyTimesteps"),
            "evalIntervalTimesteps": _get(config, "rollout", "evalIntervalTimesteps"),
        },
        "sourceModelPackage": {
            "artifactManifest": source_manifest,
            "runId": _get(r2_report, "microTrain", "runId"),
            "modelSha256": _get(r2_report, "modelPackage", "modelSha256"),
            "configSha256": _get(r2_report, "modelPackage", "configSha256"),
            "normalizeStateSha256": _get(r2_report, "modelPackage", "normalizeStateSha256"),
            "optimizerStateSha256": _get(r2_report, "modelPackage", "optimizerStateSha256"),
        },
        "technicalStopRules": _get(config, "diagnostics", "technicalStopRules"),
        "qualityInterpretation": {
            "greenFor93J6OnlyAllowedAfter": "93J.5c user_owned_1m_longrun_report.resultClass=green-for-93J.6",
            "noPromotionEvidence": True,
            "noPpoValidateEvidence": True,
            "noBt94aGateRefresh": True,
            "holdoutReserved": True,
        },
        "guardrails": report["guardrails"],
        "blockingChecksIfFalse": [
            check["id"]
            for check in checks
            if check.get("ok") is not True
        ],
        "commands": {
            "write": report["commands"]["write"],
            "userOwnedLongrun": train_command,
        },
        "sourceArtifacts": {
            "proofLaneReport": _source(PROOF_REPORT_PATH, "BT93J.5b proof lane report"),
            "r2Counterprobe": _source(R2_REPORT_PATH, "BT93J R2 same-red start finding"),
            "proofConfig": _source(CONFIG_PATH, "BT93J.5b PPO proof-lane config"),
        },
    }
    return report, readiness


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93J.5b reward/curriculum proof-lane reports.")
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--proof-output", default=str(PROOF_REPORT_PATH))
    parser.add_argument("--readiness-output", default=str(READINESS_REPORT_PATH))
    args = parser.parse_args()

    proof_output = Path(args.proof_output)
    readiness_output = Path(args.readiness_output)
    report, readiness = build_reports()
    if args.write_reports:
        _write_json(proof_output, report)
        readiness["sourceArtifacts"]["proofLaneReport"] = _source(proof_output, "BT93J.5b proof lane report")
        _write_json(readiness_output, readiness)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": report["resultClass"],
                "readyForUserOwnedLongrun": readiness["readyForUserOwnedLongrun"],
                "phaseCoverage": report["phaseCoverage"],
                "wrote": {
                    "proofLane": _rel(proof_output) if args.write_reports else None,
                    "readiness": _rel(readiness_output) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
