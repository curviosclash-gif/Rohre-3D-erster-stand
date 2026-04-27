"""BT93J.7.1 post-longrun decision report.

This report deliberately closes no BT94A gate. It pins the result of the
user-owned diagnostic longrun and decides whether BT93J.6 may proceed.
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
BT93J_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93j"
BT94A_NO_START = REPO_ROOT / "data" / "training" / "ppo" / "bt94a" / "no_start_gate.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


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


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None


def _result_class(longrun_result: str, measurement_invalid: bool) -> str:
    if measurement_invalid:
        return "measurement-invalid"
    if longrun_result == "green-for-93J.6":
        return "green-for-93J.6"
    if longrun_result in {"reward-still-blocking", "undertraining-supported"}:
        return "diagnose-loop-required"
    return "diagnose-blocked-escalation"


def build_report(*, longrun_report_path: Path, no_start_gate_path: Path | None = None) -> dict[str, Any]:
    longrun_report = _read_json(longrun_report_path)
    no_start_gate = _read_json(no_start_gate_path) if no_start_gate_path and no_start_gate_path.exists() else {}

    final_eval = longrun_report.get("finalEval") or {}
    terminal = final_eval.get("terminalMatrix") or {}
    trend = longrun_report.get("trend") or {}
    technical_stop = longrun_report.get("technicalStop") or {}
    result = str(longrun_report.get("resultClass") or "")
    measurement_invalid = bool(technical_stop.get("measurementInvalid"))
    decision_result = _result_class(result, measurement_invalid)

    natural_terminals = int(terminal.get("naturalTerminalCount") or 0)
    player_dead_only = bool(terminal.get("playerDeadOnly"))
    final_avg = _number(final_eval.get("avgStepsPerEpisodeObserved"))
    dqn_delta = _number(trend.get("deltaVsDqnAnchor"))
    phase6_allowed = decision_result == "green-for-93J.6"
    bt94a_claimable = bool(no_start_gate.get("claimable")) and phase6_allowed

    blocking_findings = []
    if result != "green-for-93J.6":
        blocking_findings.append({
            "id": "longrun_not_green_for_93J_6",
            "severity": "critical",
            "observed": result,
            "effect": "93J.6 remains closed; no pilot, holdout, BT94A refresh, candidate, freeze, promote, or rollout signal.",
        })
    if natural_terminals <= 0:
        blocking_findings.append({
            "id": "natural_terminal_zero",
            "severity": "critical",
            "observed": natural_terminals,
            "effect": "F.19/F.31 remain blocking; max-step survival is not start-capable terminal evidence.",
        })
    if player_dead_only:
        blocking_findings.append({
            "id": "player_dead_only_terminal_matrix",
            "severity": "critical",
            "observed": True,
            "effect": "The longrun improved survival duration but did not diversify terminal/death semantics.",
        })
    if final_avg is not None and dqn_delta is not None and dqn_delta > 0:
        blocking_findings.append({
            "id": "steps_green_but_gate_red",
            "severity": "high",
            "observed": {
                "avgStepsPerEpisodeObserved": final_avg,
                "deltaVsDqnAnchor": dqn_delta,
            },
            "effect": "F.05 is partly improved, but cannot close while F.19/F.31 remain red and no holdout was used.",
        })

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_post_longrun_decision.py",
        "gitSha": _git_sha(),
        "blockId": "BT93J",
        "phaseId": "93J.7.1",
        "resultClass": decision_result,
        "sourceLongrun": {
            "path": _rel(longrun_report_path),
            "sha256": _sha256_file(longrun_report_path),
            "runId": longrun_report.get("runId"),
            "runKind": longrun_report.get("runKind"),
            "longrunResultClass": result,
            "requestedTimesteps": longrun_report.get("requestedTimesteps"),
            "actualProgressTimesteps": longrun_report.get("actualProgressTimesteps"),
            "modelNumTimesteps": longrun_report.get("modelNumTimesteps"),
        },
        "decision": {
            "phase93J6Allowed": phase6_allowed,
            "phase93J6RequiredResult": "green-for-93J.6",
            "phase93J6ObservedResult": result,
            "bt94aClaimable": bt94a_claimable,
            "bt94aNoStartGateObservedClaimable": no_start_gate.get("claimable"),
            "candidateRunsAllowed": False,
            "freezeCandidateAllowed": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "holdoutConsumed": False,
            "diagnoseLoopRequired": not phase6_allowed,
            "nextTrainingRequiresNewHypothesis": not phase6_allowed,
        },
        "survivalOutcome": {
            "avgStepsPerEpisodeObserved": final_avg,
            "deltaVsStartAvgSteps": trend.get("deltaVsStartAvgSteps"),
            "deltaVsDqnAnchor": trend.get("deltaVsDqnAnchor"),
            "longestEpisode": final_eval.get("longestEpisode"),
            "maxStepEpisodes": terminal.get("maxSteps"),
            "naturalTerminalCount": natural_terminals,
            "playerDeadOnly": player_dead_only,
            "terminalReasonCounts": terminal.get("terminalReasonCounts") or {},
            "deathCauseCounts": terminal.get("deathCauseCounts") or {},
            "terminalDiversified": trend.get("terminalDiversified"),
        },
        "blockingFindings": blocking_findings,
        "rootCauseChain": [
            {
                "cause": "survival_plateau",
                "evidence": "AvgSteps improved and many episodes reached the cap, but natural/objective/progress signals stayed zero.",
                "consequence": "More blind longrun time is not the next best hypothesis.",
            },
            {
                "cause": "curriculum_clock_not_global",
                "evidence": "BT93J proof diversity stage needs high total steps, while the runner previously used episodic tickIndex.",
                "consequence": "Diversity pressure can stay inactive even across long wall-clock training.",
            },
            {
                "cause": "progress_event_unreachable",
                "evidence": "checkpointReached/parcoursCompleted remained zero in every snapshot.",
                "consequence": "Progress reward cannot guide PPO until reachability is proven in the actual runner path.",
            },
            {
                "cause": "mode_map_not_effective",
                "evidence": "The headless runner used an effectively fixed standard/classic/3d lane.",
                "consequence": "Mode or map claims need explicit effective-mode telemetry before any 6-env or longrun interpretation.",
            },
        ],
        "nextHypotheses": [
            "repair global curriculum step accounting before the next longrun",
            "prove progress/natural/objective reward reachability in a real runner smoke",
            "make the PPO headless lane mode/map/planar explicit and report effective values",
            "run a small 6-env smoke only after the signal path is nonzero",
            "benchmark CUDA separately; do not switch device until CPU-vs-CUDA wallclock is measured",
        ],
        "phaseCoverage": {
            "93J.7.1": True,
            "93J.7.4": decision_result in {"diagnose-loop-required", "diagnose-blocked-escalation", "measurement-invalid"},
        },
        "guardrails": {
            "diagnosticOnly": True,
            "holdoutUsed": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "bt94aGateRefresh": False,
            "ppoValidateEvidence": False,
            "runtimeSurfacesTouched": [],
            "productiveRuntimeChanged": False,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--longrun-report", default=str(BT93J_ROOT / "user_owned_1m_longrun_report.json"))
    parser.add_argument("--no-start-gate", default=str(BT94A_NO_START))
    parser.add_argument("--output", default=str(BT93J_ROOT / "post_longrun_decision_report.json"))
    parser.add_argument("--write-reports", action="store_true")
    args = parser.parse_args()

    output_path = Path(args.output).resolve()
    report = build_report(
        longrun_report_path=Path(args.longrun_report).resolve(),
        no_start_gate_path=Path(args.no_start_gate).resolve() if args.no_start_gate else None,
    )
    if args.write_reports:
        _write_json(output_path, report)
        _write_json(
            BT93J_ROOT / "latest_post_longrun_decision_report.json",
            {
                "ok": True,
                "resultClass": report["resultClass"],
                "report": _rel(output_path),
                "sha256": _sha256_file(output_path),
            },
        )
    print(json.dumps({
        "ok": True,
        "resultClass": report["resultClass"],
        "phase93J6Allowed": report["decision"]["phase93J6Allowed"],
        "report": _rel(output_path),
    }, indent=2))


if __name__ == "__main__":
    main()
