"""BT93S2R.99 closure gate.

Closes the matrix/control reentry after the repaired v3 gate. A green closure
may open only a fresh BT93S2.3-Recheck; it must not open 93S2.4, BT93T/U/W/O/P,
BT94A, candidate, freeze, holdout, promote, rollout, PPO-Validate, BT95 handoff,
or productive runtime signals.
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
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S2_ROOT = PPO_ROOT / "bt93s2"
BT93S2R_ROOT = PPO_ROOT / "bt93s2r"
PYTHON_ROOT = REPO_ROOT / "python"

FAILURE_TAXONOMY_PATH = BT93S2R_ROOT / "failure_taxonomy_report.json"
TARGETED_TRACE_AUDIT_PATH = BT93S2R_ROOT / "targeted_trace_audit_report.json"
MATRIX_V3_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
REENTRY_GATE_PATH = BT93S2R_ROOT / "matrix_control_reentry_gate_report.json"
SCENARIO_MATRIX_V2_PATH = BT93S2_ROOT / "scenario_matrix_v2_contract.json"
EXISTING_ACTION_EFFECT_V2_PATH = BT93S2_ROOT / "existing_action_effect_v2_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
CLOSURE_REPORT_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"

GREEN_RESULT = "matrix-control-reentry-green"
RED_RESULTS = {
    "escape-left-control-required",
    "escape-right-scenario-required",
    "side-wall-direction-contract-required",
    "neutral-control-required",
    "predicate-window-required",
    "measurement-invalid",
}
ALLOWED_RESULT_CLASSES = {GREEN_RESULT, *RED_RESULTS}

BLOCKED_NEXT = [
    "93S2.4 start before fresh BT93S2.3-Recheck",
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
    "50k/100k/200k/500k/1M extension",
    "reward fix from BT93S2R.99",
    "telemetry fix from BT93S2R.99",
    "action-surface change from BT93S2R.99",
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
    "failureTaxonomy": (
        FAILURE_TAXONOMY_PATH,
        "BT93S2R.1 source lock",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.1",
            "resultClass": "failure-taxonomy-source-lock-green",
            "ok": True,
        },
    ),
    "targetedTraceAudit": (
        TARGETED_TRACE_AUDIT_PATH,
        "BT93S2R.2 targeted trace audit",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.2",
            "resultClass": "targeted-trace-audit-green",
            "ok": True,
        },
    ),
    "matrixV3Contract": (
        MATRIX_V3_CONTRACT_PATH,
        "BT93S2R.3 repaired matrix/control-v3 contract",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.3",
            "resultClass": "matrix-control-v3-contract-green",
            "ok": True,
        },
    ),
    "matrixControlReentryGate": (
        REENTRY_GATE_PATH,
        "BT93S2R.4 matrix/control reentry gate",
        {
            "blockId": "BT93S2R",
            "phaseId": "93S2R.4",
            "resultClass": GREEN_RESULT,
            "ok": True,
            "gatePassed": True,
        },
    ),
    "scenarioMatrixV2": (
        SCENARIO_MATRIX_V2_PATH,
        "BT93S2.2 matrix-v2 source truth",
        {
            "blockId": "BT93S2",
            "phaseId": "93S2.2",
            "matrixId": "bt93s2-walltrail-action-effect-matrix-v2",
            "contractId": "bt93s2-walltrail-action-effect-window-v2",
            "ok": True,
        },
    ),
    "existingActionEffectV2": (
        EXISTING_ACTION_EFFECT_V2_PATH,
        "BT93S2.3 red measurement source",
        {
            "blockId": "BT93S2",
            "phaseId": "93S2.3",
            "resultClass": "measurement-invalid",
            "ok": False,
        },
    ),
    "actionSurface": (
        ACTION_SURFACE_PATH,
        "read-only PPO action-surface decoder",
        {},
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


def _expected_matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, (set, list, tuple)):
        return actual in expected
    return actual == expected


def _artifact(path: Path, role: str, tracked: set[str], expected: Mapping[str, Any]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    expected_fields = dict(expected)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected_fields}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected_fields.items())
    tracked_ok = rel_path in tracked if rel_path else False
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": tracked_ok,
        "fresh": bool(path.is_file() and tracked_ok and expected_ok),
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "expectedFields": {
            key: sorted(value) if isinstance(value, set) else value
            for key, value in expected_fields.items()
        },
        "actualFields": actual_fields,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected in SOURCE_SPECS.values())
    return [
        {"sourceKey": key, **_artifact(path, role, tracked, expected)}
        for key, (path, role, expected) in SOURCE_SPECS.items()
    ]


def _claim_flags(*, green: bool) -> dict[str, bool]:
    return {
        "bt93s2RecheckAllowed": green,
        "bt93s2RecheckOnlyNext": green,
        "bt93s2Phase4Allowed": False,
        "bt93tClaimAllowed": False,
        "bt93uClaimAllowed": False,
        "bt93vClaimAllowed": False,
        "bt93wClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93xFullClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "ppoValidateSignalAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "bt95HandoffAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newTrainingEpisodes": 0,
        "newOptimizerUpdates": 0,
        "newEvalRunStarted": False,
        "rewardFixApplied": False,
        "actionSurfaceChanged": False,
        "telemetryFixApplied": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "qualityClaimAllowed": False,
    }


def _allowed_next(*, green: bool, result_class: str) -> tuple[list[str], list[str], list[dict[str, str]]]:
    if green:
        return (
            ["BT93S2.3-Recheck: rerun action-effect judgement against matrix/control-v3"],
            ["BT93S2.3-Recheck"],
            [
                {
                    "rank": "1",
                    "action": "Claim the fresh BT93S2.3-Recheck via /fix-planung.",
                    "why": "BT93S2R closed the matrix/control judgement gap with zero predicate, window, measurement, negative-control, neutral-control, proxy and direction failures.",
                },
                {
                    "rank": "2",
                    "action": "Keep BT93T/U/W/O/P/94A and candidate/freeze/promote paths closed.",
                    "why": "BT93S2R proves only recheck readiness; action-selection, telemetry need, reward ordering, safety and quality are still downstream evidence.",
                },
            ],
        )
    return (
        ["Stop: repair BT93S2R closure blocker before any downstream claim"],
        [],
        [
            {
                "rank": "1",
                "action": "Keep downstream claims closed and repair the BT93S2R closure blocker.",
                "why": f"The closure result is {result_class}, so BT93S2.3-Recheck is not allowed.",
            }
        ],
    )


def _compact_sample_counts(reentry_gate: Mapping[str, Any]) -> dict[str, Any]:
    counts = reentry_gate.get("sampleCounts") if isinstance(reentry_gate.get("sampleCounts"), Mapping) else {}
    return {
        "sourceProbeCount": counts.get("sourceProbeCount"),
        "targetTraceProbeCount": counts.get("targetTraceProbeCount"),
        "scenarioCount": counts.get("scenarioCount"),
        "gateScenarioCount": counts.get("gateScenarioCount"),
        "predicateFailureCount": counts.get("predicateFailureCount"),
        "minimumWindowFailureCount": counts.get("minimumWindowFailureCount"),
        "measurementInvalidCount": counts.get("measurementInvalidCount"),
        "negativeControlFailedCount": counts.get("negativeControlFailedCount"),
        "neutralControlFailedCount": counts.get("neutralControlFailedCount"),
        "directionMismatchCount": counts.get("directionMismatchCount"),
        "proxyHygieneFailureCount": counts.get("proxyHygieneFailureCount"),
        "newTrainingEpisodes": counts.get("newTrainingEpisodes", 0),
        "newOptimizerUpdates": counts.get("newOptimizerUpdates", 0),
        "holdoutEpisodes": counts.get("holdoutEpisodes", 0),
    }


def build_report() -> dict[str, Any]:
    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] and item["tracked"] and item["fresh"] for item in source_artifacts)
    reentry_gate = _read_json(REENTRY_GATE_PATH)
    reentry_result = str(reentry_gate.get("resultClass") or "measurement-invalid")
    reentry_green = (
        source_files_ready
        and reentry_result == GREEN_RESULT
        and reentry_gate.get("ok") is True
        and reentry_gate.get("gatePassed") is True
    )
    result_class = GREEN_RESULT if reentry_green else reentry_result if reentry_result in RED_RESULTS else "measurement-invalid"
    green = result_class == GREEN_RESULT
    claim_flags = _claim_flags(green=green)
    allow_next, opens_next, recommendations = _allowed_next(green=green, result_class=result_class)
    sample_counts = _compact_sample_counts(reentry_gate)
    phase_coverage = {
        "93S2R.99.1": result_class in ALLOWED_RESULT_CLASSES
        and isinstance(allow_next, list)
        and isinstance(opens_next, list)
        and isinstance(BLOCKED_NEXT, list)
        and isinstance(claim_flags, Mapping)
        and isinstance(sample_counts, Mapping)
        and source_files_ready,
        "93S2R.99.2": green
        and opens_next == ["BT93S2.3-Recheck"]
        and claim_flags["bt93s2RecheckAllowed"] is True
        and all(
            claim_flags[key] is False
            for key in [
                "bt93s2Phase4Allowed",
                "bt93tClaimAllowed",
                "bt93uClaimAllowed",
                "bt93vClaimAllowed",
                "bt93wClaimAllowed",
                "bt93oClaimAllowed",
                "bt93xFullClaimAllowed",
                "bt93pClaimAllowed",
                "bt94aClaimAllowed",
                "candidateRunsAllowed",
                "freezeAllowed",
                "holdoutConsumptionAllowed",
                "ppoValidateSignalAllowed",
                "promoteAllowed",
                "rolloutAllowed",
                "bt95HandoffAllowed",
            ]
        ),
        "93S2R.99.3": (green is True)
        or (not opens_next and claim_flags["bt93s2RecheckAllowed"] is False),
        "93S2R.99.4": True,
    }
    dod_coverage = {
        "DoD.S2R-R10": green
        and opens_next == ["BT93S2.3-Recheck"]
        and "BT93T claim before fresh S2-Recheck opens only observation telemetry" in BLOCKED_NEXT
        and "BT94A claim" in BLOCKED_NEXT,
        "DoD.S2R-R11": "covered-by-external-meta-gate",
    }
    ok = source_files_ready and all(value is True for value in phase_coverage.values()) and dod_coverage["DoD.S2R-R10"] is True
    if not ok:
        result_class = "measurement-invalid"
        green = False
        claim_flags = _claim_flags(green=False)
        allow_next, opens_next, recommendations = _allowed_next(green=False, result_class=result_class)

    invalidations = [
        {
            "scope": "93S2.4 normal continuation",
            "reason": "93S2.4 stays closed until the fresh BT93S2.3-Recheck produces its own allowed result.",
        },
        {
            "scope": "BT93T/BT93U claims",
            "reason": "BT93T and BT93U require a fresh S2-Recheck result, not BT93S2R closure alone.",
        },
        {
            "scope": "BT93V/W/O/X/P/94A and runtime/product paths",
            "reason": "BT93S2R closure is matrix/control reentry evidence only; it is not reward, telemetry, safety, quality, candidate, freeze, validate, promote, rollout, or runtime evidence.",
        },
    ]
    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r-closure-gate-report-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s2r_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93S2R",
        "phaseId": "93S2R.99",
        "resultClass": result_class,
        "matrixId": reentry_gate.get("matrixId"),
        "contractId": reentry_gate.get("contractId"),
        "actionSurfaceId": reentry_gate.get("actionSurfaceId"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceResultClasses": {
            key: _artifact.get("resultClass")
            for key, _artifact in ((item["sourceKey"], item) for item in source_artifacts)
            if key != "actionSurface"
        },
        "sourceGate": {
            "path": _rel(REENTRY_GATE_PATH),
            "resultClass": reentry_gate.get("resultClass"),
            "ok": reentry_gate.get("ok"),
            "gatePassed": reentry_gate.get("gatePassed"),
            "reentryCounts": _get(reentry_gate, "reentryGate", "reentryCounts"),
            "prospectiveOpensNextAfterClosure": reentry_gate.get("prospectiveOpensNextAfterClosure"),
        },
        "sampleCounts": sample_counts,
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
            "bt93s2RecheckStartDecision": "allowed" if green else "blocked",
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
            "bt93s2rClosedGreen": green,
            "blockersRemain": [] if green else [result_class],
            "downstreamStillBlocked": [
                "93S2.4 until fresh BT93S2.3-Recheck",
                "BT93T/U until fresh S2-Recheck opens them",
                "BT93W/O/P/94A until their later gates",
                "candidate/freeze/holdout/promote/rollout/PPO-Validate/BT95",
            ],
        },
        "commands": {
            "write": "python python/scripts/bt93s2r_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(CLOSURE_REPORT_PATH, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "opensNext": report["opensNext"],
                "blocksNext": report["blocksNext"][:4],
                "output": _rel(CLOSURE_REPORT_PATH),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
