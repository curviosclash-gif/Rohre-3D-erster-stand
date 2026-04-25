"""BT93G.4 reward and diagnosis gate report.

The report binds reward, survival/steps, episode-shortening, safety/action
load, and terminal/death evidence into a hard start gate. It does not run
training, open BT94A, create a candidate, or promote a model.
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
BT93G_ROOT = PPO_ROOT / "bt93g"
BT93F_ROOT = PPO_ROOT / "bt93f"

START_TRUTH_PATH = BT93G_ROOT / "start_truth.json"
REPAIR_MATRIX_PATH = BT93G_ROOT / "repair_matrix.json"
TERMINAL_WIRING_PATH = BT93G_ROOT / "terminal_wiring_probe_report.json"
ACTION_MASK_PATH = BT93G_ROOT / "action_mask_report.json"
BT93F_REPAIR_PATH = BT93F_ROOT / "repair_diagnostic_report.json"
DEFAULT_OUTPUT = BT93G_ROOT / "reward_gate_report.json"


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


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "closureCapable": True,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
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
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def build_report() -> dict[str, Any]:
    start_truth = _read_json(START_TRUTH_PATH)
    repair_matrix = _read_json(REPAIR_MATRIX_PATH)
    terminal_wiring = _read_json(TERMINAL_WIRING_PATH)
    action_mask = _read_json(ACTION_MASK_PATH)
    bt93f_repair = _read_json(BT93F_REPAIR_PATH)

    deltas = _get(bt93f_repair, "comparison", "deltasAgainstDqn") or {}
    action_rates = action_mask.get("telemetrySeparation") if isinstance(action_mask.get("telemetrySeparation"), Mapping) else {}
    post_decode_clamp_rate = _as_float(action_rates.get("postDecodeClampRate")) or 0.0
    safety_veto_rate = _as_float(action_rates.get("safetyVetoRate")) or 0.0
    invalid_action_rate = _as_float(action_rates.get("invalidActionRate")) or 0.0
    sanitizer_rate = _as_float(action_rates.get("sanitizerRate")) or 0.0
    prior_not_comparable = _get(start_truth, "priorMatrixClassification", "bt93gClassification") == "diagnose-not-comparable"
    max_steps = int(_get(repair_matrix, "env", "maxStepsPerEpisode") or 0)

    reward_gate = {
        "R.01": {
            "status": "still-blocking",
            "reason": "Positive reward claims remain blocked until comparable 93G.5 eval/holdout proves survival/steps are not regressive.",
            "priorBt93fResultClass": deltas.get("resultClass"),
            "priorAverageBotSurvivalPct": deltas.get("averageBotSurvivalPct"),
            "priorAvgStepsPerEpisodePct": deltas.get("avgStepsPerEpisodePct"),
            "positiveRewardMayOpenBt94a": False,
        },
        "episodeShortening": {
            "status": "blocked-until-93G.5",
            "maxStepsPerEpisode": max_steps,
            "prior16StepComparisonReclassified": prior_not_comparable,
            "maxStepsOnlyMayOpenBt94a": False,
        },
        "terminalDeathMatrix": {
            "status": "probe-wired-not-quality-evidence",
            "probeCoverage": terminal_wiring.get("phaseCoverage"),
            "evalHoldoutMatrixRequired": True,
            "emptyDeathMatrixMayOpenBt94a": False,
        },
        "actionSafety": {
            "status": "probe-pass-still-requires-93G.5",
            "postDecodeClampRate": post_decode_clamp_rate,
            "safetyVetoRate": safety_veto_rate,
            "invalidActionRate": invalid_action_rate,
            "sanitizerRate": sanitizer_rate,
            "thresholds": {
                "postDecodeClampRateLt": 0.5,
                "safetyVetoRateLt": 0.25,
                "invalidActionRateEq": 0.0,
                "sanitizerRateEq": 0.0,
            },
            "probeThresholdsPass": (
                post_decode_clamp_rate < 0.5
                and safety_veto_rate < 0.25
                and invalid_action_rate == 0.0
                and sanitizer_rate == 0.0
            ),
        },
    }

    gate_matrix = {
        "realSurvivalImprovement": {
            "classification": "not-yet-evidenced",
            "requires": "93G.5 comparable eval and holdout with non-regressive survival/steps",
            "bt94aStartSignal": False,
        },
        "artificialMaxStepEpisode": {
            "classification": "hard-blocker",
            "requires": "natural terminal/death matrix or honest diagnose-blocked outcome",
            "bt94aStartSignal": False,
        },
        "timeoutOrTruncation": {
            "classification": "diagnostic-only",
            "requires": "separate truncatedReasonCounts and no relabeling as terminal/death quality",
            "bt94aStartSignal": False,
        },
        "naturalTerminal": {
            "classification": "required-before-start",
            "requires": "non-empty eval/holdout terminal/death/failure matrix",
            "bt94aStartSignal": False,
        },
        "rewardMeanOnly": {
            "classification": "never-sufficient",
            "requires": "rewardBreakdown cross-checked against survival, steps, action safety and terminal/death matrix",
            "bt94aStartSignal": False,
        },
    }

    phase_coverage = {
        "93G.4.1": all(key in reward_gate for key in ("R.01", "episodeShortening", "terminalDeathMatrix", "actionSafety")),
        "93G.4.2": reward_gate["R.01"]["status"] == "still-blocking",
        "93G.4.3": all(entry.get("classification") for entry in gate_matrix.values()),
        "93G.4.4": reward_gate["actionSafety"]["probeThresholdsPass"] is True
        and gate_matrix["rewardMeanOnly"]["bt94aStartSignal"] is False,
    }

    return {
        "ok": all(phase_coverage.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_reward_gate_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93G",
        "phaseId": "93G.4",
        "resultClass": "reward-gates-pinned-r01-blocking",
        "phaseCoverage": phase_coverage,
        "rewardGate": reward_gate,
        "gateMatrix": gate_matrix,
        "findingDisposition": {
            "F.05": "still-blocking",
            "F.19": "still-blocking-until-93G.5",
            "F.27": "still-blocking",
            "F.30": "closed-for-bt93g-repair-lane",
            "F.31": "still-blocking-until-93G.5",
            "R.01": "still-blocking",
        },
        "bt94aImpact": {
            "claimableAfter93G4": False,
            "blockedFindings": ["F.05", "F.19", "F.27", "F.31", "R.01"],
            "nextRequiredPhase": "93G.5 comparable repair learner/eval/holdout",
        },
        "evidenceLimits": {
            "countsAsSurvivalQualityEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsPpoValidateEvidence": False,
            "candidateRun": False,
            "freezeCandidate": False,
        },
        "sourceArtifacts": {
            "startTruth": _source(START_TRUTH_PATH, "BT93G start truth"),
            "repairMatrix": _source(REPAIR_MATRIX_PATH, "BT93G repair matrix"),
            "terminalWiring": _source(TERMINAL_WIRING_PATH, "BT93G terminal wiring probes"),
            "actionMask": _source(ACTION_MASK_PATH, "BT93G pre-sampling action mask"),
            "bt93fRepairDiagnostic": _source(BT93F_REPAIR_PATH, "BT93F prior reward/survival regression evidence"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93G reward gate report.")
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
        "r01": report["findingDisposition"]["R.01"],
        "claimableAfter93G4": report["bt94aImpact"]["claimableAfter93G4"],
        "output": args.output if args.write else None,
    }, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
