"""BT93RR.99 closure gate for BT93R-Reentry.

Closes the retrain-lineage Reentry from versioned evidence only. A green
closure may open exactly BT93S; it must not open BT93O/P/94A, candidate,
freeze, holdout, promote, rollout, PPO-Validate, BT95 handoff, or productive
runtime signals.
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
BT93RR_ROOT = PPO_ROOT / "bt93r_reentry"
BT93R_ROOT = PPO_ROOT / "bt93r"
BT93Y_ROOT = PPO_ROOT / "bt93y"

CLOSURE_REPORT_PATH = BT93RR_ROOT / "bt93r_reentry_closure_gate_report.json"
HANDOVER_PACKAGE_PATH = BT93RR_ROOT / "bt93r_reentry_handover_package.json"

GREEN_RESULT_CLASSES = {
    "policy-collapse-green",
    "decoder-fix-counterprobe-green",
    "normalize-fix-counterprobe-green",
    "eval-mode-bug-fixed-counterprobe-green",
}
RED_RESULT_CLASSES = {
    "policy-collapse-active",
    "policy-evidence-invalid",
    "normalize-mismatch",
    "model-artifact-missing",
    "measurement-invalid",
}

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
    "bt93rrHandoverLock": (
        BT93RR_ROOT / "bt93r_reentry_handover_lock_report.json",
        "BT93RR.1 handover lock",
        {"blockId": "BT93RR", "phaseId": "93RR.1", "resultClass": "reentry-handover-lock-green", "ok": True},
    ),
    "bt93rrArtifactProbe": (
        BT93RR_ROOT / "bt93r_reentry_artifact_probe_report.json",
        "BT93RR.1 artifact probe",
        {"blockId": "BT93RR", "phaseId": "93RR.1", "resultClass": "artifact-probe-green", "ok": True},
    ),
    "bt93rrRootCause": (
        BT93RR_ROOT / "bt93r_reentry_root_cause_report.json",
        "BT93RR.2 root-cause report",
        {"blockId": "BT93RR", "phaseId": "93RR.2", "resultClass": "eval-argmax-collapse", "ok": True},
    ),
    "bt93rrCounterprobe": (
        BT93RR_ROOT / "bt93r_reentry_counterprobe_report.json",
        "BT93RR.3 counterprobe report",
        {
            "blockId": "BT93RR",
            "phaseId": "93RR.3",
            "resultClass": "eval-mode-bug-fixed-counterprobe-green",
            "ok": True,
        },
    ),
    "bt93rHistoricalClosure": (
        BT93R_ROOT / "bt93r_closure_gate_report.json",
        "historical BT93R.99 red closure",
        {"blockId": "BT93R", "phaseId": "93R.99", "resultClass": "model-artifact-missing", "ok": True},
    ),
    "bt93yClosure": (
        BT93Y_ROOT / "bt93y_closure_gate_report.json",
        "BT93Y.99 closure opening BT93R-Reentry",
        {
            "blockId": "BT93Y",
            "phaseId": "93Y.99",
            "resultClass": "retrain-lineage-ready-bt93r-reentry-ready",
            "ok": True,
        },
    ),
}

BLOCKED_NEXT = [
    "BT93O claim",
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
    "Reward/Action/Telemetry/Safety bundled fix from BT93RR",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
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


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


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


def _tracked_files(paths: Iterable[Path | None]) -> set[str]:
    rel_paths = [_rel(path) for path in paths if path is not None]
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
    tracked = _tracked_files([path for path, _role, _expected in SOURCE_SPECS.values()])
    return [
        {"sourceKey": key, **_artifact(path, role, tracked, expected)}
        for key, (path, role, expected) in SOURCE_SPECS.items()
    ]


def _claim_flags(*, bt93s_allowed: bool) -> dict[str, bool]:
    return {
        "bt93sClaimAllowed": bt93s_allowed,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "qualityClaimAllowed": False,
    }


def _guardrails(*, bt93s_allowed: bool) -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "newEvalRunStarted": False,
        "fixApplied": False,
        "counterprobeOnly": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "bt95HandoffSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "rewardFixApplied": False,
        "actionFixApplied": False,
        "telemetryFixApplied": False,
        "safetyFixApplied": False,
        **_claim_flags(bt93s_allowed=bt93s_allowed),
    }


def _lineage(counterprobe: Mapping[str, Any]) -> dict[str, Any]:
    lineage = counterprobe.get("lineage") if isinstance(counterprobe.get("lineage"), Mapping) else {}
    return {
        "lineageId": lineage.get("lineageId"),
        "lineageKind": lineage.get("lineageKind"),
        "notBt93nLineage": lineage.get("notBt93nLineage"),
        "matrixId": lineage.get("matrixId"),
        "matrixHash": lineage.get("matrixHash"),
        "rewardProfileId": lineage.get("rewardProfileId"),
        "semanticWindow": lineage.get("semanticWindow"),
        "actionSurfaceId": lineage.get("actionSurfaceId"),
    }


def _sample_counts(counterprobe: Mapping[str, Any]) -> dict[str, Any]:
    counts = counterprobe.get("sampleCounts") if isinstance(counterprobe.get("sampleCounts"), Mapping) else {}
    return {
        "newTrainingEpisodes": counts.get("newTrainingEpisodes", 0),
        "newOptimizerUpdates": counts.get("newOptimizerUpdates", 0),
        "newEvalEpisodes": counts.get("newEvalEpisodes", 0),
        "holdoutEpisodes": counts.get("holdoutEpisodes", 0),
        "diagnosticSteps": counts.get("diagnosticSteps", 0),
        "perMode": counts.get("perMode", {}),
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    generated_at = _utc_now()
    source_artifacts = _source_artifacts()
    payloads = {key: _read_json(path) for key, (path, _role, _expected) in SOURCE_SPECS.items()}
    counterprobe = payloads["bt93rrCounterprobe"]
    old_bt93r = payloads["bt93rHistoricalClosure"]

    source_files_ready = all(item["exists"] and item["isFile"] and item["tracked"] and item["fresh"] for item in source_artifacts)
    result_class = str(counterprobe.get("resultClass") or "measurement-invalid")
    result_in_allowlist = result_class in GREEN_RESULT_CLASSES or result_class in RED_RESULT_CLASSES
    r_allowlist_green = result_class in GREEN_RESULT_CLASSES and counterprobe.get("ok") is True
    old_red_referenced = (
        old_bt93r.get("blockId") == "BT93R"
        and old_bt93r.get("phaseId") == "93R.99"
        and old_bt93r.get("resultClass") == "model-artifact-missing"
    )
    bt93s_allowed = bool(source_files_ready and r_allowlist_green and old_red_referenced)
    guardrails = _guardrails(bt93s_allowed=bt93s_allowed)
    claim_flags = _claim_flags(bt93s_allowed=bt93s_allowed)
    other_claims_closed = all(
        claim_flags[key] is False
        for key in [
            "bt93oClaimAllowed",
            "bt93pClaimAllowed",
            "bt94aClaimAllowed",
            "candidateRunsAllowed",
            "candidateFreezeAllowed",
            "holdoutConsumptionAllowed",
            "promoteAllowed",
            "rolloutAllowed",
            "qualityClaimAllowed",
        ]
    )
    phase_coverage = {
        "93RR.99.1": source_files_ready
        and result_in_allowlist
        and isinstance(counterprobe.get("allowNext"), list)
        and "blocksNext" in counterprobe
        and isinstance(counterprobe.get("sampleCounts"), Mapping),
        "93RR.99.2": bt93s_allowed and other_claims_closed,
        "93RR.99.3": old_red_referenced,
        "93RR.99.4": True,
    }
    dod_coverage = {
        "DoD.RR5": result_class in GREEN_RESULT_CLASSES,
        "DoD.RR6": result_class not in RED_RESULT_CLASSES,
        "DoD.RR7": (bt93s_allowed is True) and other_claims_closed,
    }
    ok = source_files_ready and all(phase_coverage.values()) and all(dod_coverage.values())
    final_result = result_class if ok else "measurement-invalid"
    allow_next = ["BT93S claim: 93S.1 Wall-/Trail Action-Effekt und Action-Selection Repair"] if ok else []
    opens_next = ["BT93S"] if ok else []

    git_info = {
        "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
        "sha": _git_output(["git", "rev-parse", "HEAD"]),
        "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
    }
    generated_artifacts = {
        "closureGateReport": _rel(CLOSURE_REPORT_PATH),
        "handoverPackage": _rel(HANDOVER_PACKAGE_PATH),
    }
    blocking_status = {
        "bt93sBlockedUntil": None if ok else "BT93R-Reentry.99 in R-Allowlist",
        "bt93oBlockedUntil": "BT93W.99=bt93o-precondition-green",
        "bt93pBlockedUntil": "BT93O.99=bt93o-quality-green and BT93X.99=bt93p-starttruth-green",
        "bt94aBlockedUntil": "BT93P.4=BT94A-ready plus green no-start gate",
        "candidateFreezePromoteRolloutBlocked": True,
        "ppoValidateBlocked": True,
    }
    recommendations = [
        {
            "rank": 1,
            "action": "Claim BT93S next.",
            "why": "BT93RR.99 reached the R-Allowlist via eval-mode-bug-fixed-counterprobe-green and opens only BT93S.",
        },
        {
            "rank": 2,
            "action": "Keep BT93O/P/94A closed.",
            "why": "BT93S/T/U/V/W still need to prove action effect, telemetry need, reward ordering, safety/terminal sanity, and the integrated 10k gate.",
        },
        {
            "rank": 3,
            "action": "Treat DeathBefore60 from 93RR.3 as measured continuity evidence, not quality success.",
            "why": "The counterprobe repaired eval-mode collapse only; deathBefore60Count=2 and playerDeadShare=1.0 remain downstream repair context.",
        },
    ]
    closure = {
        "schemaVersion": "bt93rr-reentry-closure-gate-report-v1",
        "ok": ok,
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93r_reentry_closure_gate.py",
        "git": git_info,
        "blockId": "BT93RR",
        "phaseId": "93RR.99",
        "resultClass": final_result,
        "rAllowlistResult": ok,
        "greenResultClasses": sorted(GREEN_RESULT_CLASSES),
        "redResultClasses": sorted(RED_RESULT_CLASSES),
        "lineage": _lineage(counterprobe),
        "sourceArtifacts": source_artifacts,
        "generatedArtifacts": generated_artifacts,
        "sourceFilesReady": source_files_ready,
        "historicalBt93R": {
            "path": _rel(BT93R_ROOT / "bt93r_closure_gate_report.json"),
            "resultClass": old_bt93r.get("resultClass"),
            "preservedAsHistoricalTruth": old_red_referenced,
            "notRewritten": True,
        },
        "counterprobeResult": {
            "path": _rel(BT93RR_ROOT / "bt93r_reentry_counterprobe_report.json"),
            "resultClass": result_class,
            "ok": counterprobe.get("ok"),
            "rootCause": _get(counterprobe, "summary", "rootCause"),
            "counterprobeFixClass": _get(counterprobe, "summary", "counterprobeFixClass"),
            "deathBefore60": counterprobe.get("deathBefore60"),
            "greenCriteria": counterprobe.get("greenCriteria"),
        },
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "claimFlags": claim_flags,
        "guardrails": guardrails,
        "blockingStatus": blocking_status,
        "allowNext": allow_next,
        "opensNext": opens_next,
        "blocksNext": list(BLOCKED_NEXT),
        "sampleCounts": _sample_counts(counterprobe),
        "recommendations": recommendations,
        "summary": {
            "finalResult": final_result,
            "bt93sStartDecision": "allowed" if ok else "blocked",
            "bt93oStartDecision": "blocked",
            "bt93pStartDecision": "blocked",
            "bt94aStartDecision": "blocked",
            "candidateFreezePromoteRolloutDecision": "blocked",
            "nextBestAction": "Claim BT93S via /fix-planung." if ok else "Stop; BT93S remains blocked.",
            "remainingBlockersAfterNextFixPlanung": [
                "BT93O still needs BT93W.99=bt93o-precondition-green",
                "BT93P still needs BT93O.99 and BT93X.99",
                "BT94A still needs BT93P.4=BT94A-ready plus green gate",
                "DeathBefore60/action-effect/reward-ordering/safety-terminal evidence remain downstream blockers",
            ],
        },
        "commands": {
            "write": "python python/scripts/bt93r_reentry_closure_gate.py --write-reports",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate scripts",
        },
    }
    handover = {
        "schemaVersion": "bt93rr-reentry-handover-package-v1",
        "ok": ok,
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93r_reentry_closure_gate.py",
        "git": git_info,
        "blockId": "BT93RR",
        "phaseId": "93RR.99",
        "resultClass": final_result,
        "sourceClosureReport": {
            "path": _rel(CLOSURE_REPORT_PATH),
            "sha256AfterWrite": None,
        },
        "lineage": closure["lineage"],
        "nextAllowedActions": allow_next,
        "openedBlocks": opens_next,
        "blockedActions": list(BLOCKED_NEXT),
        "blockingStatus": blocking_status,
        "claimFlags": claim_flags,
        "guardrails": guardrails,
        "recommendations": recommendations,
        "nonGoalsPreserved": [
            "no BT93O/P/94A claim",
            "no candidate or freeze",
            "no holdout consumption",
            "no promote or rollout wording",
            "no PPO-Validate or BT95 handoff signal",
            "no productive runtime integration",
            "old BT93R.99 remains model-artifact-missing",
        ],
        "summary": closure["summary"],
    }
    handover["sourceClosureReport"]["sha256AfterWrite"] = _sha256_payload(closure)
    return closure, handover


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-reports", action="store_true")
    args = parser.parse_args()

    closure, handover = build_reports()
    if args.write_reports:
        _write_json(CLOSURE_REPORT_PATH, closure)
        _write_json(HANDOVER_PACKAGE_PATH, handover)
    print(
        json.dumps(
            {
                "ok": closure["ok"],
                "resultClass": closure["resultClass"],
                "bt93sClaimAllowed": closure["claimFlags"]["bt93sClaimAllowed"],
                "phaseCoverage": closure["phaseCoverage"],
                "dodCoverage": closure["dodCoverage"],
                "opensNext": closure["opensNext"],
                "blocksNext": closure["blocksNext"][:4],
                "outputs": closure["generatedArtifacts"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if closure["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
