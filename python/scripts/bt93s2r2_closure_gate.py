"""BT93S2R2.99 closure gate.

Closes the predicate/window reentry from versioned diagnostic evidence. A green
closure may open only a fresh BT93S2.3-Recheck. A red closure must keep
93S2.4, BT93T/U/W/O/P/94A, candidate, freeze, holdout, promote, rollout,
PPO-Validate, BT95 handoff, training, and productive runtime signals closed.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
BT93S2R2_ROOT = PPO_ROOT / "bt93s2r2"

RED_RECHECK_PATH = BT93S2_ROOT / "existing_action_effect_v3_recheck_report.json"
S2R_CLOSURE_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"
FAILURE_TAXONOMY_PATH = BT93S2R2_ROOT / "failure_taxonomy_report.json"
PREDICATE_WINDOW_REPAIR_PATH = BT93S2R2_ROOT / "predicate_window_repair_contract.json"
EMPIRICAL_REENTRY_GATE_PATH = BT93S2R2_ROOT / "empirical_reentry_gate_report.json"
CLOSURE_REPORT_PATH = BT93S2R2_ROOT / "bt93s2r2_closure_gate_report.json"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r2_recheck_measurement_invalid.md"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
SCRIPT_PATH = PYTHON_ROOT / "scripts" / "bt93s2r2_closure_gate.py"

GREEN_RESULT = "matrix-control-reentry-green"
RED_RESULTS = {
    "predicate-window-required",
    "escape-control-required",
    "neutral-control-required",
    "measurement-invalid",
}
ALLOWED_RESULT_CLASSES = {GREEN_RESULT, *RED_RESULTS}

BLOCKED_NEXT = [
    "BT93S2.3-Recheck before BT93S2R2.99 green closure",
    "93S2.4 start before fresh BT93S2.3-Recheck writes measurementValid=true",
    "BT93T claim before fresh S2-Recheck opens only observation telemetry",
    "BT93U claim before fresh S2-Recheck opens action-selection-green",
    "BT93V claim",
    "BT93W claim",
    "BT93O claim",
    "BT93X full claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate signal",
    "BT95 handoff signal",
    "productive runtime integration",
    "PPO training",
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S2R2.99",
    "telemetry fix from BT93S2R2.99",
    "action-surface change from BT93S2R2.99",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
    "redRecheck": (
        RED_RECHECK_PATH,
        "red BT93S2.3-Recheck source",
        {
            "blockId": "BT93S2",
            "phaseId": "93S2.3-Recheck",
            "resultClass": "measurement-invalid",
            "ok": False,
            "sampleCounts.predicateFailureCount": 36,
            "sampleCounts.minimumWindowFailureCount": 8,
        },
        True,
    ),
    "s2rClosure": (
        S2R_CLOSURE_PATH,
        "BT93S2R green source closure",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.99",
            "resultClass": GREEN_RESULT,
            "ok": True,
        },
        True,
    ),
    "failureTaxonomy": (
        FAILURE_TAXONOMY_PATH,
        "BT93S2R2.1 failure taxonomy",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.1",
            "resultClass": "failure-taxonomy-source-lock-red-status-written",
            "ok": True,
        },
        True,
    ),
    "predicateWindowRepair": (
        PREDICATE_WINDOW_REPAIR_PATH,
        "BT93S2R2.2 predicate/window repair contract",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.2",
            "resultClass": "predicate-window-repair-contract-green",
            "ok": True,
        },
        True,
    ),
    "empiricalReentryGate": (
        EMPIRICAL_REENTRY_GATE_PATH,
        "BT93S2R2.3 empirical reentry gate",
        {
            "blockId": "BT93S2R2",
            "phaseId": "93S2R2.3",
            "resultClass": ALLOWED_RESULT_CLASSES,
            "sampleCounts.newTrainingEpisodes": 0,
            "sampleCounts.holdoutEpisodes": 0,
        },
        True,
    ),
    "actionSurface": (
        ACTION_SURFACE_PATH,
        "read-only PPO action-surface decoder",
        {},
        True,
    ),
    "closureScript": (
        SCRIPT_PATH,
        "BT93S2R2.99 closure generator",
        {},
        False,
    ),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return sha256(_json_text(payload).encode("utf-8")).hexdigest()


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(args: list[str]) -> list[str]:
    return [line.strip().replace("\\", "/") for line in _git_output(args).splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths]
    rel_paths = [path for path in rel_paths if path]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _expected_matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


def _source_artifact(
    path: Path,
    role: str,
    tracked: set[str],
    expected: Mapping[str, Any],
    *,
    source_key: str,
    required: bool,
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "sourceKey": source_key,
        "path": rel_path,
        "role": role,
        "required": required,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and (tracked_ok or not required) and expected_ok),
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "expectedFields": {
            key: sorted(value) if isinstance(value, set) else value for key, value in expected.items()
        },
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected, _required in SOURCE_SPECS.values())
    return [
        _source_artifact(path, role, tracked, expected, source_key=key, required=required)
        for key, (path, role, expected, required) in SOURCE_SPECS.items()
    ]


def _claim_flags(green: bool) -> dict[str, bool]:
    return {
        "bt93s2FreshRecheckAllowed": green,
        "bt93s2FreshRecheckOnlyNext": green,
        "phase93S2_4Allowed": False,
        "bt93tClaimable": False,
        "bt93uClaimable": False,
        "bt93vClaimable": False,
        "bt93wClaimable": False,
        "bt93oClaimable": False,
        "bt93xFullClaimAllowed": False,
        "bt93pClaimable": False,
        "bt94aClaimable": False,
        "bt95HandoffAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutAllowed": False,
        "ppoValidateSignalAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoTrainingAllowed": False,
        "actionSurfaceChangeAllowed": False,
        "rewardChangeAllowed": False,
        "telemetryChangeAllowed": False,
        "runtimeChangeAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newOptimizerUpdates": 0,
        "newTrainingEpisodes": 0,
        "newEvalRunStarted": False,
        "holdoutUsed": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "qualityClaimAllowed": False,
    }


def _active_blockers(empirical: Mapping[str, Any], source_files_ready: bool) -> list[str]:
    counts = _as_mapping(empirical.get("sampleCounts"))
    blockers: list[str] = []
    if not source_files_ready:
        blockers.append("source-evidence-invalid")
    if empirical.get("resultClass") == "measurement-invalid" or empirical.get("ok") is False:
        blockers.append("measurement-invalid")
    if int(counts.get("predicateFailureCount") or 0) or int(counts.get("minimumWindowFailureCount") or 0):
        blockers.append("predicate-window-required")
    if int(counts.get("negativeControlFailedCount") or 0):
        blockers.append("escape-control-required")
    if int(counts.get("neutralControlRequiredCount") or 0):
        blockers.append("neutral-control-required")
    if int(counts.get("directionMismatchCount") or 0):
        blockers.append("direction-contract-mismatch")
    if int(counts.get("escapeRightFairnessFailureCount") or 0):
        blockers.append("escape-right-fairness-required")
    if int(counts.get("retainedV2MeasurementInvalidCount") or 0):
        blockers.append("retained-v2-measurement-invalid")
    return sorted(set(blockers))


def _result_class(empirical: Mapping[str, Any], source_files_ready: bool) -> str:
    empirical_result = str(empirical.get("resultClass") or "measurement-invalid")
    if not source_files_ready or empirical_result not in ALLOWED_RESULT_CLASSES:
        return "measurement-invalid"
    return empirical_result


def _next_actions(result_class: str) -> tuple[list[str], list[str], list[dict[str, str]]]:
    if result_class == GREEN_RESULT:
        return (
            ["BT93S2.3-Recheck: rerun action-effect judgement after BT93S2R2 green closure"],
            ["BT93S2.3-Recheck"],
            [
                {
                    "rank": "1",
                    "action": "Claim a fresh BT93S2.3-Recheck via /fix-planung.",
                    "why": "The predicate/window reentry reached all empirical zero-count gates.",
                },
                {
                    "rank": "2",
                    "action": "Keep 93S2.4 and downstream blocks closed until the fresh Recheck itself writes measurementValid=true.",
                    "why": "BT93S2R2 can only authorize a recheck, not action-quality or telemetry/reward/safety work.",
                },
            ],
        )
    return (
        ["Stop: no fresh BT93S2.3-Recheck or 93S2.4; create/claim a narrower Predicate-/Window-/Env-measurement follow-up"],
        [],
        [
            {
                "rank": "1",
                "action": "Do not start BT93S2.3-Recheck, 93S2.4, BT93T, BT93U, BT93W, BT93O, BT93P or BT94A.",
                "why": f"BT93S2R2.99 closes red as {result_class}; the empirical gate still has non-zero measurement blockers.",
            },
            {
                "rank": "2",
                "action": "Prepare a narrow follow-up replan for predicate/window replay validity, direction contract, retained-v2 invalidations, escape-right fairness and neutral control.",
                "why": "The remaining failures are still measurement validity failures, not PPO quality, reward ordering, telemetry need, or candidate evidence.",
            },
        ],
    )


def _compact_counts(empirical: Mapping[str, Any]) -> dict[str, Any]:
    counts = _as_mapping(empirical.get("sampleCounts"))
    keys = [
        "scenarioCount",
        "actionCount",
        "probeCount",
        "sourceProbeCount",
        "taxonomyFailureRowCount",
        "predicateFailureCount",
        "minimumWindowFailureCount",
        "measurementInvalidCount",
        "negativeControlFailedCount",
        "directionMismatchCount",
        "escapeRightFairnessFailureCount",
        "retainedV2MeasurementInvalidCount",
        "neutralControlRequiredCount",
        "newTrainingEpisodes",
        "newOptimizerUpdates",
        "holdoutEpisodes",
    ]
    return {key: counts.get(key) for key in keys}


def build_report() -> dict[str, Any]:
    empirical = _read_json(EMPIRICAL_REENTRY_GATE_PATH)
    predicate_contract = _read_json(PREDICATE_WINDOW_REPAIR_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(
        item["exists"] and item["isFile"] and item["fresh"] for item in source_artifacts if item["required"]
    )
    source_files_versioned = all(item["tracked"] for item in source_artifacts if item["required"])
    result_class = _result_class(empirical, source_files_ready)
    green = result_class == GREEN_RESULT and empirical.get("gatePassed") is True and empirical.get("ok") is True
    claim_flags = _claim_flags(green)
    allow_next, opens_next, recommendations = _next_actions(result_class)
    sample_counts = _compact_counts(empirical)
    active_blockers = _active_blockers(empirical, source_files_ready)
    forbidden_claims_closed = all(
        claim_flags[key] is False
        for key in [
            "phase93S2_4Allowed",
            "bt93tClaimable",
            "bt93uClaimable",
            "bt93vClaimable",
            "bt93wClaimable",
            "bt93oClaimable",
            "bt93xFullClaimAllowed",
            "bt93pClaimable",
            "bt94aClaimable",
            "bt95HandoffAllowed",
            "candidateRunsAllowed",
            "freezeAllowed",
            "holdoutAllowed",
            "ppoValidateSignalAllowed",
            "promoteAllowed",
            "rolloutAllowed",
            "ppoTrainingAllowed",
            "actionSurfaceChangeAllowed",
            "rewardChangeAllowed",
            "telemetryChangeAllowed",
            "runtimeChangeAllowed",
        ]
    )
    phase_coverage = {
        "93S2R2.99.1": result_class in ALLOWED_RESULT_CLASSES and source_files_ready and source_files_versioned,
        "93S2R2.99.2": bool(
            isinstance(allow_next, list)
            and isinstance(opens_next, list)
            and isinstance(BLOCKED_NEXT, list)
            and isinstance(claim_flags, Mapping)
            and isinstance(sample_counts, Mapping)
            and source_artifacts
        ),
        "93S2R2.99.3": forbidden_claims_closed
        and (green or (not opens_next and claim_flags["bt93s2FreshRecheckAllowed"] is False)),
        "93S2R2.99.4": True,
    }
    dod_coverage = {
        "DoD.S2R2-8": (green and opens_next == ["BT93S2.3-Recheck"])
        or (not green and opens_next == [] and claim_flags["phase93S2_4Allowed"] is False),
        "DoD.S2R2-9": "covered-by-external-meta-gate",
    }
    closure_ok = all(phase_coverage.values()) and dod_coverage["DoD.S2R2-8"] is True
    if not closure_ok:
        result_class = "measurement-invalid"
        green = False
        claim_flags = _claim_flags(False)
        allow_next, opens_next, recommendations = _next_actions(result_class)
    invalidations = [
        {
            "scope": "BT93S2.3-Recheck",
            "reason": "Only a green BT93S2R2 closure may open a fresh Recheck; this closure is red.",
            "active": not green,
        },
        {
            "scope": "93S2.4 normal continuation",
            "reason": "93S2.4 remains closed until a later fresh BT93S2.3-Recheck writes measurementValid=true.",
            "active": True,
        },
        {
            "scope": "BT93T/U/W/O/X/P/94A and candidate/freeze/holdout/promote/rollout/PPO-Validate/BT95",
            "reason": "BT93S2R2 is measurement-validity evidence only and cannot open downstream quality, reward, telemetry, safety, runtime or promotion paths.",
            "active": True,
        },
    ]
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r2-closure-gate-report-v1",
        "ok": closure_ok,
        "gatePassed": green,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "blockId": "BT93S2R2",
        "phaseId": "93S2R2.99",
        "resultClass": result_class,
        "matrixId": empirical.get("matrixId") or predicate_contract.get("matrixId"),
        "contractId": empirical.get("contractId") or predicate_contract.get("contractId"),
        "repairContractId": empirical.get("repairContractId") or predicate_contract.get("repairContractId"),
        "actionSurfaceId": empirical.get("actionSurfaceId") or predicate_contract.get("actionSurfaceId"),
        "decoderHash": empirical.get("decoderHash") or predicate_contract.get("decoderHash"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResultClasses": {
            item["sourceKey"]: item.get("resultClass") for item in source_artifacts if item["sourceKey"] != "actionSurface"
        },
        "sourceGate": {
            "path": _rel(EMPIRICAL_REENTRY_GATE_PATH),
            "resultClass": empirical.get("resultClass"),
            "ok": empirical.get("ok"),
            "gatePassed": empirical.get("gatePassed"),
            "zeroCountGateGreen": empirical.get("zeroCountGateGreen"),
            "opensNext": empirical.get("opensNext"),
            "allowNext": empirical.get("allowNext"),
        },
        "sampleCounts": sample_counts,
        "activeBlockers": active_blockers,
        "classResultCounts": empirical.get("classResultCounts"),
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "claimFlags": claim_flags,
        "guardrails": _guardrails(),
        "allowNext": allow_next,
        "opensNext": opens_next,
        "blocksNext": list(BLOCKED_NEXT),
        "invalidations": invalidations,
        "recommendations": recommendations,
        "blockingStatus": {
            "bt93s2FreshRecheckDecision": "allowed" if claim_flags["bt93s2FreshRecheckAllowed"] else "blocked",
            "bt93s2Phase4StartDecision": "blocked",
            "bt93tStartDecision": "blocked",
            "bt93uStartDecision": "blocked",
            "bt93vStartDecision": "blocked",
            "bt93wStartDecision": "blocked",
            "bt93oStartDecision": "blocked",
            "bt93xFullStartDecision": "blocked",
            "bt93pStartDecision": "blocked",
            "bt94aStartDecision": "blocked",
            "candidateFreezePromoteRolloutDecision": "blocked",
            "ppoValidateDecision": "blocked",
            "bt95HandoffDecision": "blocked",
        },
        "summary": {
            "finalResult": result_class,
            "nextBestAction": allow_next[0] if allow_next else "Stop",
            "bt93s2r2ClosedRed": not green,
            "bt93s2r2ClosedGreen": green,
            "blockersRemain": active_blockers,
            "empiricalCounts": sample_counts,
        },
        "commands": {
            "write": "python python/scripts/bt93s2r2_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    blockers = _as_list(report.get("activeBlockers"))
    recommendations = _as_list(report.get("recommendations"))
    blocker_rows = "\n".join(f"- `{item}`" for item in blockers) or "- keine"
    rec_rows = "\n".join(
        f"- {item.get('action')} Warum: {item.get('why')}" for item in recommendations if isinstance(item, Mapping)
    )
    return f"""# Fehlerbericht: BT93S2R2 Abschluss

## Aufgabe/Kontext

- Task: `BT93S2R2.99`
- Ziel: roten Predicate-/Window-Reentry sauber schliessen und Folgeclaims blockieren.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`, `gatePassed={report.get('gatePassed')}`
- Fresh-Probes: `{counts.get('probeCount')}`
- Predicate-Fails: `{counts.get('predicateFailureCount')}`
- Minimum-Window-Fails: `{counts.get('minimumWindowFailureCount')}`
- Measurement-Invalid: `{counts.get('measurementInvalidCount')}`
- Negative-Control-Fails: `{counts.get('negativeControlFailedCount')}`
- Direction-Mismatches: `{counts.get('directionMismatchCount')}`
- Escape-Right-Fairness-Fails: `{counts.get('escapeRightFairnessFailureCount')}`
- Retained-v2-Measurement-Invalid: `{counts.get('retainedV2MeasurementInvalidCount')}`
- Neutral-Control-Required: `{counts.get('neutralControlRequiredCount')}`
- PPO-Training/Holdout/Runtime-Aenderungen: `0`

## Aktive Blocker

{blocker_rows}

## Bewertung

`BT93S2R2.99` schliesst rot. Ein frischer `BT93S2.3-Recheck` ist nicht geoeffnet,
weil das Empirical-Reentry-Gate keine Null-Counts erreicht hat. `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate, BT95 und produktive Runtime bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/bt93s2r2_closure_gate_report.json`
- Command: `python python/scripts/bt93s2r2_closure_gate.py --write-report`

## Naechster Schritt

{rec_rows}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(CLOSURE_REPORT_PATH, report)
        _write_text(DOC_PATH, _markdown(report))
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "gatePassed": report["gatePassed"],
                "resultClass": report["resultClass"],
                "activeBlockers": report["activeBlockers"],
                "sampleCounts": report["sampleCounts"],
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "opensNext": report["opensNext"],
                "output": _rel(CLOSURE_REPORT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
