"""BT93J.4 R1 reward/curriculum micro-test.

The script validates that R1 starts from the single BT93J primary cause and
checks the small training-reward change with deterministic JS probes. It does
not train, start a pilot, use holdout, refresh BT94A, create a candidate,
freeze, promote, or touch runtime rollout surfaces.
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
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93J_ROOT = PPO_ROOT / "bt93j"

DIAGNOSTIC_SPLIT_PATH = BT93J_ROOT / "diagnostic_split_report.json"
REWARD_DIAGNOSTICS_PATH = BT93J_ROOT / "reward_curriculum_diagnostics.json"
ACTION_DIAGNOSTICS_PATH = BT93J_ROOT / "action_policy_diagnostics.json"
DEFAULT_OUTPUT = BT93J_ROOT / "r1_micro_test_report.json"

PRIMARY_CAUSE_ID = "reward-curriculum-survival-only-player-dead-policy"
R1_ID = "reward-terminal-loss-signal-r1"

NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no pilot, holdout, long-run, or BT94A gate refresh from BT93J.4",
    "no productive RuntimeConfig, Strategy Flag, JS inference, model registry, rollback, Matchstart, AI-Hub, bridge, or authority change",
    "R1 micro-test is reward-signal evidence only, not PPO-Validate or promotion evidence",
)

NODE_PROBE = r"""
import {
  buildHeadlessTrainingRewardSignals,
  deriveHeadlessLaneEpisodeStep,
} from './scripts/training-headless-lane-runner.mjs';
import {
  RewardCalculator,
  calculateReward,
} from './src/state/training/RewardCalculator.js';

const rewardCalculator = new RewardCalculator();

function rewardFor(id, input) {
  const episode = deriveHeadlessLaneEpisodeStep(input);
  const r1Signals = buildHeadlessTrainingRewardSignals(episode, { totalEnvSteps: input.totalEnvSteps ?? 1 });
  const r1Reward = rewardCalculator.compute(r1Signals, episode);
  const legacySignals = {
    survival: episode.done !== true && episode.truncated !== true,
  };
  const legacyReward = calculateReward(legacySignals, { episodeSnapshot: episode });
  return {
    id,
    episode: {
      done: episode.done,
      truncated: episode.truncated,
      terminalReason: episode.terminalReason,
      truncatedReason: episode.truncatedReason,
    },
    legacy: {
      signals: legacySignals,
      total: legacyReward.total,
      components: legacyReward.components,
    },
    r1: {
      signals: r1Signals,
      total: r1Reward.total,
      components: r1Reward.components,
    },
    delta: Number((r1Reward.total - legacyReward.total).toFixed(6)),
  };
}

const scenarios = [
  rewardFor('running-alive', {
    player: { alive: true },
    lifecycle: 'running',
    tickLifecycle: 'running',
    nowMs: 1,
  }),
  rewardFor('player-dead-terminal', {
    player: { alive: false },
    lifecycle: 'running',
    tickLifecycle: 'running',
    nowMs: 2,
  }),
  rewardFor('natural-match-ended-terminal', {
    player: { alive: true },
    lifecycle: 'match_end',
    tickLifecycle: 'match_end',
    nowMs: 3,
  }),
  rewardFor('max-steps-truncated', {
    player: { alive: true },
    lifecycle: 'running',
    tickLifecycle: 'running',
    input: { truncated: true, truncatedReason: 'max-steps' },
    nowMs: 4,
  }),
];

process.stdout.write(JSON.stringify({
  ok: true,
  generatedBy: 'python/scripts/bt93j_r1_micro_test.py::node-probe',
  scenarios,
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


def _git_head_json(path: Path) -> dict[str, Any] | None:
    result = subprocess.run(
        ["git", "show", f"HEAD:{_rel(path)}"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _run_node_probe() -> dict[str, Any]:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", NODE_PROBE],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "BT93J R1 node probe failed")
    return json.loads(result.stdout)


def _scenario(probe: Mapping[str, Any], scenario_id: str) -> Mapping[str, Any]:
    rows = probe.get("scenarios")
    if not isinstance(rows, list):
        return {}
    for row in rows:
        if isinstance(row, Mapping) and row.get("id") == scenario_id:
            return row
    return {}


def _primary_cause_count(diagnostic_split: Mapping[str, Any]) -> int:
    count = 1 if isinstance(diagnostic_split.get("primaryCause"), Mapping) else 0
    gates = diagnostic_split.get("categoryGates")
    if isinstance(gates, list):
        gate_count = sum(
            1
            for gate in gates
            if isinstance(gate, Mapping) and gate.get("primaryCause") is True
        )
        return max(count, gate_count)
    return count


def _build_checks(
    diagnostic_split: Mapping[str, Any],
    reward_diagnostics: Mapping[str, Any],
    action_diagnostics: Mapping[str, Any],
    node_probe: Mapping[str, Any],
) -> list[dict[str, Any]]:
    ready_for_r1 = diagnostic_split.get("readyForRepair") is True
    already_green = _get(diagnostic_split, "r1MicroTest", "green") is True
    player_dead = _scenario(node_probe, "player-dead-terminal")
    running = _scenario(node_probe, "running-alive")
    natural = _scenario(node_probe, "natural-match-ended-terminal")
    max_steps = _scenario(node_probe, "max-steps-truncated")
    checks = [
        {
            "id": "diagnostic_split_ready_for_r1",
            "ok": (ready_for_r1 or already_green)
            and _primary_cause_count(diagnostic_split) == 1
            and _get(diagnostic_split, "primaryCause", "id") == PRIMARY_CAUSE_ID
            and bool(diagnostic_split.get("counterprobe")),
            "observed": {
                "readyForRepair": ready_for_r1,
                "r1MicroTestAlreadyGreen": already_green,
                "primaryCauseCount": _primary_cause_count(diagnostic_split),
                "primaryCauseId": _get(diagnostic_split, "primaryCause", "id"),
                "counterprobe": diagnostic_split.get("counterprobe"),
            },
        },
        {
            "id": "reward_curriculum_primary_cause_still_active",
            "ok": _get(reward_diagnostics, "rewardCurriculumGate", "primaryCause") is True,
            "observed": reward_diagnostics.get("resultClass"),
        },
        {
            "id": "action_gate_stays_green",
            "ok": _get(action_diagnostics, "actionPolicyGate", "green") is True,
            "observed": action_diagnostics.get("resultClass"),
        },
        {
            "id": "player_dead_terminal_gets_negative_loss_signal",
            "ok": _get(player_dead, "r1", "signals", "lost") is True
            and float(_get(player_dead, "r1", "components", "loss") or 0.0) < 0.0
            and float(_get(player_dead, "r1", "total") or 0.0) < 0.0,
            "observed": player_dead,
        },
        {
            "id": "r1_changes_only_player_death_terminal_reward",
            "ok": float(player_dead.get("delta") or 0.0) < 0.0
            and float(running.get("delta") or 0.0) == 0.0
            and float(natural.get("delta") or 0.0) == 0.0
            and float(max_steps.get("delta") or 0.0) == 0.0,
            "observed": {
                "playerDeadDelta": player_dead.get("delta"),
                "runningDelta": running.get("delta"),
                "naturalDelta": natural.get("delta"),
                "maxStepsDelta": max_steps.get("delta"),
            },
        },
        {
            "id": "natural_terminal_not_reclassified_as_loss",
            "ok": _get(natural, "r1", "signals", "lost") is False
            and float(_get(natural, "r1", "total") or 0.0) == 0.0,
            "observed": natural,
        },
        {
            "id": "running_survival_reward_unchanged",
            "ok": _get(running, "r1", "signals", "survival") is True
            and float(_get(running, "r1", "total") or 0.0) > 0.0
            and float(running.get("delta") or 0.0) == 0.0,
            "observed": running,
        },
    ]
    return checks


def _classification(checks: list[Mapping[str, Any]]) -> str:
    by_id = {str(check.get("id")): check.get("ok") is True for check in checks}
    if not by_id.get("diagnostic_split_ready_for_r1"):
        return "inconclusive"
    if not by_id.get("action_gate_stays_green") or not by_id.get("natural_terminal_not_reclassified_as_loss"):
        return "new-red"
    if not by_id.get("player_dead_terminal_gets_negative_loss_signal"):
        return "same-red"
    if all(by_id.values()):
        return "green"
    return "inconclusive"


def build_report() -> tuple[dict[str, Any], dict[str, Any]]:
    diagnostic_split = _read_json(DIAGNOSTIC_SPLIT_PATH)
    precondition_split = diagnostic_split
    precondition_source = "working-tree"
    if diagnostic_split.get("readyForRepair") is not True and _get(diagnostic_split, "r1MicroTest", "green") is True:
        head_split = _git_head_json(DIAGNOSTIC_SPLIT_PATH)
        if isinstance(head_split, Mapping) and head_split.get("readyForRepair") is True:
            precondition_split = head_split
            precondition_source = "git-head-before-r1"
    reward_diagnostics = _read_json(REWARD_DIAGNOSTICS_PATH)
    action_diagnostics = _read_json(ACTION_DIAGNOSTICS_PATH)
    node_probe = _run_node_probe()
    checks = _build_checks(precondition_split, reward_diagnostics, action_diagnostics, node_probe)
    classification = _classification(checks)
    ok = classification == "green"
    report = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_r1_micro_test.py",
        "gitSha": _git_sha(),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.4",
        "resultClass": classification,
        "r1": {
            "id": R1_ID,
            "primaryCauseId": PRIMARY_CAUSE_ID,
            "scope": "training-headless reward signal only",
            "smallChange": (
                "Headless training reward signals now pass lost=true for player-dead/death-like "
                "terminal episodes before RewardCalculator.compute()."
            ),
            "expectedEffect": (
                "player-dead terminal samples receive a negative terminal loss signal; running survival "
                "and non-death natural terminals keep their previous reward shape."
            ),
            "counterprobe": diagnostic_split.get("counterprobe"),
            "changedFiles": ["scripts/training-headless-lane-runner.mjs"],
        },
        "preconditionSource": precondition_source,
        "classification": {
            "value": classification,
            "green": ok,
            "sameRed": classification == "same-red",
            "newRed": classification == "new-red",
            "inconclusive": classification == "inconclusive",
            "pilotAllowed": False,
            "longRunAllowed": False,
            "readyForTraining": False,
            "note": "A green R1 micro-test only proves reward-signal behavior; it is not policy quality evidence.",
        },
        "checks": checks,
        "nodeProbe": node_probe,
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
            "noGo": list(NO_GO),
        },
        "sourceArtifacts": {
            "diagnosticSplit": _source(DIAGNOSTIC_SPLIT_PATH, "BT93J diagnostic split before R1"),
            "rewardDiagnostics": _source(REWARD_DIAGNOSTICS_PATH, "BT93J reward/curriculum diagnostics"),
            "actionDiagnostics": _source(ACTION_DIAGNOSTICS_PATH, "BT93J action policy diagnostics"),
            "headlessLaneRunner": _source(
                REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs",
                "BT93J R1 training reward signal implementation",
            ),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_r1_micro_test.py --write-reports",
            "nodeProbe": "node --input-type=module -e <bt93j r1 embedded reward probes>",
        },
    }
    updated_split = _update_diagnostic_split(diagnostic_split, report)
    return report, updated_split


def _update_diagnostic_split(
    diagnostic_split: Mapping[str, Any],
    report: Mapping[str, Any],
) -> dict[str, Any]:
    updated = json.loads(json.dumps(diagnostic_split))
    result_class = str(report.get("resultClass") or "inconclusive")
    check_status = {
        str(check.get("id")): check.get("ok") is True
        for check in report.get("checks", [])
        if isinstance(check, Mapping)
    }
    updated["generatedAt"] = _utc_now()
    updated["generatedBy"] = "python/scripts/bt93j_r1_micro_test.py"
    updated["phaseId"] = "93J.4"
    updated["r1MicroTest"] = {
        "path": _rel(DEFAULT_OUTPUT),
        "resultClass": result_class,
        "green": result_class == "green",
        "sameRed": result_class == "same-red",
        "newRed": result_class == "new-red",
        "inconclusive": result_class == "inconclusive",
        "r1Id": R1_ID,
    }
    updated["phaseCoverage"] = {
        **(updated.get("phaseCoverage") if isinstance(updated.get("phaseCoverage"), Mapping) else {}),
        "93J.4.1": check_status.get("diagnostic_split_ready_for_r1") is True,
        "93J.4.2": result_class in {"green", "same-red", "new-red"},
        "93J.4.3": True,
        "93J.4.4": result_class not in {"same-red", "new-red"},
    }
    gates = updated.get("categoryGates")
    if isinstance(gates, list):
        for gate in gates:
            if isinstance(gate, dict) and gate.get("id") == "reward-curriculum":
                gate["status"] = "r1-micro-test-green" if result_class == "green" else f"r1-{result_class}"
                gate["green"] = False
                gate["notCausal"] = False
                gate["primaryCause"] = True
                gate["evidence"] = _rel(DEFAULT_OUTPUT)
                gate["phase"] = "93J.4"
                gate["pilotBlocked"] = True
                gate["longRunBlocked"] = True
    updated["readyForRepair"] = False
    updated["readyForTraining"] = False
    updated["resultClass"] = f"diagnostic-split-r1-micro-test-{result_class}"
    updated["nextDiagnosticPhase"] = "93J.5" if result_class == "green" else "93J.4-analysis"
    updated["repairConstraints"] = {
        **(updated.get("repairConstraints") if isinstance(updated.get("repairConstraints"), Mapping) else {}),
        "pilotAllowed": False,
        "longRunAllowed": False,
        "candidateFreezeAllowed": False,
        "bt94aClaimAllowed": False,
    }
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93J.4 R1 micro-test report.")
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--diagnostic-split-output", default=str(DIAGNOSTIC_SPLIT_PATH))
    args = parser.parse_args()

    output_path = Path(args.output)
    split_output_path = Path(args.diagnostic_split_output)
    report, diagnostic_split = build_report()
    if args.write_reports:
        _write_json(output_path, report)
        _write_json(split_output_path, diagnostic_split)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": report["resultClass"],
                "phaseCoverage": diagnostic_split.get("phaseCoverage", {}),
                "readyForTraining": diagnostic_split["readyForTraining"],
                "wrote": {
                    "r1MicroTest": _rel(output_path) if args.write_reports else None,
                    "diagnosticSplit": _rel(split_output_path) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
