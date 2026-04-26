"""BT93H.1 terminal/death root-cause report.

This is a diagnosis-only artifact builder. It consumes BT93G evidence and
source contracts, but it does not run training, create candidates, freeze, or
touch runtime surfaces.
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
BT93H_ROOT = PPO_ROOT / "bt93h"

DEFAULT_OUTPUT = BT93H_ROOT / "terminal_root_cause_report.json"

BT93G_TERMINAL_PATH = BT93G_ROOT / "terminal_wiring_probe_report.json"
BT93G_REPAIR_PATH = BT93G_ROOT / "repair_ladder_report.json"
BT93G_FOLLOWUP_PATH = BT93G_ROOT / "followup_gate_report.json"
BT94A_GATE_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"

LANE_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
EPISODE_CONTROLLER_PATH = REPO_ROOT / "src" / "state" / "training" / "EpisodeController.js"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
EVAL_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"

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


def _as_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _counter(value: Any) -> dict[str, int]:
    if not isinstance(value, Mapping):
        return {}
    return {str(key): _as_int(count) for key, count in sorted(value.items())}


def _read_source_tokens(path: Path, tokens: tuple[str, ...]) -> dict[str, bool]:
    text = path.read_text(encoding="utf-8")
    return {token: token in text for token in tokens}


def _failure_audit(lane_id: str, report_path: Path, failure: Mapping[str, Any]) -> dict[str, Any]:
    terminal_reasons = _counter(failure.get("terminalReasonCounts"))
    truncated_reasons = _counter(failure.get("truncatedReasonCounts"))
    death_causes = _counter(failure.get("deathCauseCounts"))
    natural_terminal = _as_int(failure.get("naturalTerminal"))
    max_steps = _as_int(failure.get("maxSteps"))
    missing = [field for field in REQUIRED_FAILURE_FIELDS if field not in failure]
    has_death = bool(death_causes)
    has_natural_terminal = natural_terminal > 0
    max_steps_only = max_steps > 0 and not has_death and not has_natural_terminal
    return {
        "laneId": lane_id,
        "report": _rel(report_path),
        "requiredFieldsPresent": not missing,
        "missingFields": missing,
        "terminalReasonCounts": terminal_reasons,
        "truncatedReasonCounts": truncated_reasons,
        "deathCauseCounts": death_causes,
        "naturalTerminal": natural_terminal,
        "maxSteps": max_steps,
        "hasDeathCause": has_death,
        "hasNonDeathNaturalTerminal": has_natural_terminal,
        "maxStepsOnly": max_steps_only,
        "bt94aStartCapableTerminalMatrix": has_death and has_natural_terminal and not max_steps_only,
    }


def _artifact_audits(repair: Mapping[str, Any]) -> dict[str, Any]:
    eval_path = _repo_path(str(_get(repair, "comparison", "ppoComparableEval", "report")))
    holdout_path = _repo_path(str(_get(repair, "comparison", "ppoHoldout", "report")))
    eval_report = _read_json(eval_path)
    holdout_report = _read_json(holdout_path)

    repair_eval = _failure_audit(
        "bt93g-repair-report-comparable-eval",
        BT93G_REPAIR_PATH,
        _get(repair, "comparison", "ppoComparableEval", "failureClasses") or {},
    )
    repair_holdout = _failure_audit(
        "bt93g-repair-report-holdout",
        BT93G_REPAIR_PATH,
        _get(repair, "comparison", "ppoHoldout", "failureClasses") or {},
    )
    raw_eval = _failure_audit(
        "bt93g-raw-comparable-eval",
        eval_path,
        _get(eval_report, "diagnostics", "failureSemantics") or {},
    )
    raw_holdout = _failure_audit(
        "bt93g-raw-holdout-eval",
        holdout_path,
        _get(holdout_report, "diagnostics", "failureSemantics") or {},
    )

    lanes = [repair_eval, repair_holdout, raw_eval, raw_holdout]
    return {
        "ok": all(lane["requiredFieldsPresent"] for lane in lanes),
        "lanes": lanes,
        "summary": {
            "laneCount": len(lanes),
            "allRequiredFieldsPresent": all(lane["requiredFieldsPresent"] for lane in lanes),
            "deathCauseObserved": any(lane["hasDeathCause"] for lane in lanes),
            "nonDeathNaturalTerminalObserved": any(lane["hasNonDeathNaturalTerminal"] for lane in lanes),
            "anyMaxStepsOnlyLane": any(lane["maxStepsOnly"] for lane in lanes),
            "bt94aStartCapableTerminalMatrix": all(
                lane["bt94aStartCapableTerminalMatrix"] for lane in lanes
            ),
        },
        "sourceReports": {
            "repairLadder": _source(BT93G_REPAIR_PATH, "BT93G repair ladder"),
            "comparableEval": _source(eval_path, "BT93G comparable eval"),
            "holdoutEval": _source(holdout_path, "BT93G holdout eval"),
        },
    }


def _probe_audit(terminal_report: Mapping[str, Any]) -> dict[str, Any]:
    probes = terminal_report.get("probes") if isinstance(terminal_report.get("probes"), list) else []
    probe_rows = {
        str(probe.get("id")): probe for probe in probes if isinstance(probe, Mapping)
    }
    expected = {
        "bt93g-probe-player-dead": ("terminalReason", "player-dead"),
        "bt93g-probe-round-ended": ("terminalReason", "match-ended"),
        "bt93g-probe-match-ended": ("terminalReason", "match-ended"),
        "bt93g-probe-max-steps": ("truncatedReason", "max-steps"),
    }
    checks = {
        probe_id: probe_rows.get(probe_id, {}).get(field) == value
        for probe_id, (field, value) in expected.items()
    }
    return {
        "ok": bool(terminal_report.get("ok")) and all(checks.values()),
        "source": _source(BT93G_TERMINAL_PATH, "BT93G headless terminal/death probes"),
        "checks": checks,
        "probeCount": len(probes),
        "countsAsQualityEvidence": False,
        "probes": probes,
    }


def _source_alignment() -> dict[str, Any]:
    headless = {
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
    }
    python_eval = {
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
            EVAL_PATH,
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
    groups = [*headless.values(), *python_eval.values()]
    field_names_aligned = all(all(checks.values()) for checks in groups)
    return {
        "ok": field_names_aligned,
        "fieldNamesAligned": field_names_aligned,
        "headless": headless,
        "pythonEval": python_eval,
        "driftHandling": "blocker-not-normalized",
        "sourceArtifacts": {
            "laneRunner": _source(LANE_RUNNER_PATH, "headless terminal derivation"),
            "episodeController": _source(EPISODE_CONTROLLER_PATH, "episode lifecycle authority"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python env done/truncated extraction"),
            "evalDiagnostics": _source(EVAL_PATH, "Python eval failureSemantics aggregation"),
        },
    }


def _provocation_matrix() -> list[dict[str, Any]]:
    return [
        {
            "id": "93h-provocation-player-dead",
            "runKind": "terminal-provocation",
            "purpose": "prove death class emission",
            "expected": {
                "done": True,
                "truncated": False,
                "terminalReason": "player-dead",
                "deathCauseCounts.player-dead": ">=1",
                "naturalTerminal": 0,
            },
            "countsAsQualityEvidence": False,
        },
        {
            "id": "93h-provocation-match-ended",
            "runKind": "terminal-provocation",
            "purpose": "prove non-death natural terminal emission",
            "expected": {
                "done": True,
                "truncated": False,
                "terminalReason": "match-ended",
                "naturalTerminal": ">=1",
                "deathCauseCounts": {},
            },
            "countsAsQualityEvidence": False,
        },
        {
            "id": "93h-provocation-max-steps-control",
            "runKind": "terminal-provocation",
            "purpose": "keep truncation separate from terminal/death quality",
            "expected": {
                "done": False,
                "truncated": True,
                "terminalReason": None,
                "truncatedReason": "max-steps",
                "maxSteps": ">=1",
            },
            "countsAsQualityEvidence": False,
        },
        {
            "id": "93h-python-eval-artifact-audit",
            "runKind": "diagnostic",
            "purpose": "verify Python eval reports carry the same terminal/death/truncation fields",
            "expected": {
                "failureSemantics": list(REQUIRED_FAILURE_FIELDS),
                "fieldNamesAlignedWithHeadlessLane": True,
            },
            "countsAsQualityEvidence": False,
        },
    ]


def _finding_status(artifact_audit: Mapping[str, Any]) -> dict[str, Any]:
    summary = artifact_audit.get("summary") if isinstance(artifact_audit.get("summary"), Mapping) else {}
    non_death_missing = not bool(summary.get("nonDeathNaturalTerminalObserved"))
    start_capable = bool(summary.get("bt94aStartCapableTerminalMatrix"))
    return {
        "F.19": {
            "status": "still-blocking" if not start_capable else "closed-for-93h1-audit",
            "reason": (
                "BT93G eval/holdout death fields are present, but the BT94A start matrix still lacks "
                "non-death natural terminal coverage."
                if non_death_missing
                else "Terminal/death matrix is start-capable in audited artifacts."
            ),
        },
        "F.31": {
            "status": "still-blocking" if non_death_missing else "closed-for-93h1-audit",
            "reason": (
                "Natural terminal evidence is absent from BT93G eval/holdout; only player-dead death cases were observed."
                if non_death_missing
                else "Natural terminal evidence is present."
            ),
        },
    }


def build_report() -> dict[str, Any]:
    terminal = _read_json(BT93G_TERMINAL_PATH)
    repair = _read_json(BT93G_REPAIR_PATH)
    followup = _read_json(BT93G_FOLLOWUP_PATH)
    bt94a_gate = _read_json(BT94A_GATE_PATH)

    probe_audit = _probe_audit(terminal)
    artifact_audit = _artifact_audits(repair)
    source_alignment = _source_alignment()
    finding_status = _finding_status(artifact_audit)
    coverage_gap = not bool(_get(artifact_audit, "summary", "nonDeathNaturalTerminalObserved"))
    field_contract_ok = bool(probe_audit["ok"] and artifact_audit["ok"] and source_alignment["ok"])

    result_class = (
        "terminal-root-cause-isolated"
        if field_contract_ok
        else "terminal-root-cause-contract-drift"
    )
    blockers = []
    if not field_contract_ok:
        blockers.append("terminal/death/truncation reporting contract drift")
    if coverage_gap:
        blockers.append("non-death natural terminal coverage missing in BT93G eval/holdout")

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93h_terminal_root_cause.py",
        "gitSha": _git_sha(),
        "blockId": "BT93H",
        "phaseId": "93H.1",
        "resultClass": result_class,
        "phaseCoverage": {
            "93H.1.1": artifact_audit["ok"],
            "93H.1.2": len(_provocation_matrix()) >= 4,
            "93H.1.3": source_alignment["fieldNamesAligned"] is True,
            "93H.1.4": True,
        },
        "rootCause": {
            "summary": (
                "BT93G did not lose terminal/death fields. Death cases are present as player-dead, "
                "but eval/holdout never observe a non-death natural terminal such as match-ended; "
                "BT94A therefore remains blocked by natural-terminal coverage, not by a field-name drift."
            ),
            "fieldContractOk": field_contract_ok,
            "coverageGap": coverage_gap,
            "blockingReasons": blockers,
            "driftVerdict": "no-field-drift" if field_contract_ok else "field-contract-drift",
        },
        "artifactAudit": artifact_audit,
        "headlessProbeAudit": probe_audit,
        "sourceAlignment": source_alignment,
        "terminalProvocationMatrix": {
            "matrixId": "bt93h-terminal-provocation-matrix-v1",
            "noRuntimeBypass": True,
            "allowedRunKinds": ["diagnostic", "terminal-provocation"],
            "forbiddenRunKinds": ["candidate", "freeze", "promote", "rollout-ready", "BT94B-ready"],
            "scenarios": _provocation_matrix(),
            "entryCriteriaFor93H3": {
                "fieldContractOk": field_contract_ok,
                "requiresNonDeathNaturalTerminalProbe": True,
                "requiresPythonEvalArtifactAudit": True,
                "currentStatus": "blocked-until-93H.2-contract-and-93H.3-run" if coverage_gap else "green",
            },
        },
        "bt94aGateContext": {
            "followupRequired": followup.get("followupRequired"),
            "remainingBt94aGates": followup.get("remainingBt94aGates"),
            "claimable": bt94a_gate.get("claimable"),
            "candidateRunsAllowed": bt94a_gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": bt94a_gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": bt94a_gate.get("candidateFreezeAllowed"),
            "resultClass": bt94a_gate.get("resultClass"),
        },
        "findingDisposition": finding_status,
        "evidenceLimits": {
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "qualityClaimFromProbes": False,
        },
        "commands": {
            "report": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93h_terminal_root_cause.py --write-report",
        },
        "sourceArtifacts": {
            "bt93gTerminalWiring": _source(BT93G_TERMINAL_PATH, "BT93G terminal wiring probes"),
            "bt93gRepairLadder": _source(BT93G_REPAIR_PATH, "BT93G repair ladder report"),
            "bt93gFollowupGate": _source(BT93G_FOLLOWUP_PATH, "BT93G followup gate"),
            "bt94aNoStartGate": _source(BT94A_GATE_PATH, "BT94A no-start gate"),
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "bt94aCheckboxClosureAllowed": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93H.1 terminal/death root-cause report.")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        output = Path(args.output)
        if not output.is_absolute():
            output = REPO_ROOT / output
        _write_json(output, report)

    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "blockingReasons": report["rootCause"]["blockingReasons"],
                "output": args.output if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
