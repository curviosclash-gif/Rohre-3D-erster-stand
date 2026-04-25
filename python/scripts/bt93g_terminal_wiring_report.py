"""BT93G.2 terminal/death/truncation probe report.

The report exercises the repaired headless lane episode semantics without
running candidate training, creating a freeze candidate, or promoting a model.
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
BT93G_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93g"

DEFAULT_OUTPUT = BT93G_ROOT / "terminal_wiring_probe_report.json"
LANE_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
EPISODE_CONTROLLER_PATH = REPO_ROOT / "src" / "state" / "training" / "EpisodeController.js"
CONTRACT_TEST_PATH = REPO_ROOT / "tests" / "training-environment.contract.test.mjs"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _read_json_from_stdout(stdout: str) -> dict[str, Any]:
    return json.loads(stdout.strip())


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
        "closureCapable": True,
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

function terminalProbe({ id, lifecycle, tickLifecycle, player }) {
  const controller = new EpisodeController({ defaultMaxSteps: 5 });
  controller.reset({ episodeId: id, maxSteps: 5, nowMs: 0 });
  const stepInput = deriveHeadlessLaneEpisodeStep({
    player,
    lifecycle,
    tickLifecycle,
    nowMs: 1,
  });
  const snapshot = controller.step(stepInput);
  return {
    id,
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
  const controller = new EpisodeController({ defaultMaxSteps: 2 });
  controller.reset({ episodeId: 'bt93g-probe-max-steps', maxSteps: 2, nowMs: 0 });
  controller.step(deriveHeadlessLaneEpisodeStep({
    player: { alive: true },
    lifecycle: 'running',
    nowMs: 1,
  }));
  const snapshot = controller.step(deriveHeadlessLaneEpisodeStep({
    player: { alive: true },
    lifecycle: 'running',
    nowMs: 2,
  }));
  return {
    id: 'bt93g-probe-max-steps',
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
    id: 'bt93g-probe-player-dead',
    lifecycle: 'running',
    player: { alive: false },
  }),
  terminalProbe({
    id: 'bt93g-probe-round-ended',
    lifecycle: 'round_end',
    player: { alive: true },
  }),
  terminalProbe({
    id: 'bt93g-probe-match-ended',
    tickLifecycle: 'match_end',
    player: { alive: true },
  }),
  maxStepsProbe(),
];

process.stdout.write(JSON.stringify({
  ok: true,
  generatedBy: 'python/scripts/bt93g_terminal_wiring_report.py::node-probes',
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
    return _read_json_from_stdout(result.stdout)


def build_report() -> dict[str, Any]:
    probes = _run_node_probes()
    probe_rows = probes.get("probes") if isinstance(probes.get("probes"), list) else []
    player_dead = next((row for row in probe_rows if row.get("id") == "bt93g-probe-player-dead"), {})
    round_ended = next((row for row in probe_rows if row.get("id") == "bt93g-probe-round-ended"), {})
    match_ended = next((row for row in probe_rows if row.get("id") == "bt93g-probe-match-ended"), {})
    max_steps = next((row for row in probe_rows if row.get("id") == "bt93g-probe-max-steps"), {})

    phase_coverage = {
        "93G.2.1": player_dead.get("terminalReason") == "player-dead"
        and round_ended.get("terminalReason") == "match-ended"
        and match_ended.get("terminalReason") == "match-ended",
        "93G.2.2": all(row.get("done") or row.get("truncated") for row in probe_rows),
        "93G.2.3": len(probe_rows) >= 4,
        "93G.2.4": all(
            isinstance((row.get("failureSemantics") or {}).get(key), (int, dict))
            for row in probe_rows
            for key in ("runtimeErrorCount", "terminalReasonCounts", "truncatedReasonCounts", "deathCauseCounts")
        ),
    }

    return {
        "ok": all(phase_coverage.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_terminal_wiring_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93G",
        "phaseId": "93G.2",
        "resultClass": "terminal-wiring-probes-pinned",
        "phaseCoverage": phase_coverage,
        "sourceArtifacts": {
            "laneRunner": _source(LANE_RUNNER_PATH, "headless lane terminal derivation"),
            "episodeController": _source(EPISODE_CONTROLLER_PATH, "episode lifecycle authority"),
            "contractTest": _source(CONTRACT_TEST_PATH, "BT93G.2 contract coverage"),
        },
        "probes": probe_rows,
        "reportingContract": {
            "requiredFields": [
                "terminalReasonCounts",
                "truncatedReasonCounts",
                "deathCauseCounts",
                "naturalTerminal",
                "maxSteps",
                "runtimeErrorCount",
                "crash",
                "timeout",
                "forcedRound",
            ],
            "trainEvalHoldoutRule": "reports must carry these failure semantics from transition info; probes do not count as survival quality, promotion, or PPO-Validate evidence",
        },
        "stillForbidden": [
            "BT94A candidate run",
            "freeze candidate",
            "promotion or rollout signal",
            "quality claim from probes alone",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93G terminal wiring probe report.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write:
        output = Path(args.output)
        if not output.is_absolute():
            output = REPO_ROOT / output
        _write_json(output, report)

    print(json.dumps({
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "phaseCoverage": report["phaseCoverage"],
        "output": args.output if args.write else None,
    }, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
