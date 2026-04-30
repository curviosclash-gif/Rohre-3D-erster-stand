"""BT93S.99 closure gate.

Closes BT93S from the versioned wall/trail action-effect and policy-selection
evidence. A green closure may open BT93U only when action selection is green and
no telemetry, action-space, or matrix blocker remains. Observation telemetry may
open BT93T. All other red outcomes stop the R-X ladder until a narrow replan.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93S_ROOT = PPO_ROOT / "bt93s"
BT93RR_ROOT = PPO_ROOT / "bt93r_reentry"

SCENARIO_CONTRACT_PATH = BT93S_ROOT / "scenario_window_contract.json"
ACTION_EFFECT_MANIFEST_PATH = BT93S_ROOT / "action_effect_window_manifest.json"
EXISTING_ACTION_EFFECT_PATH = BT93S_ROOT / "existing_action_effect_report.json"
ACTION_SURFACE_DECISION_PATH = BT93S_ROOT / "action_surface_decision.json"
POLICY_SELECTION_REPORT_PATH = BT93S_ROOT / "policy_selection_report.json"
BT93RR_HANDOVER_PATH = BT93RR_ROOT / "bt93r_reentry_handover_package.json"
BT93RR_CLOSURE_PATH = BT93RR_ROOT / "bt93r_reentry_closure_gate_report.json"
CLOSURE_REPORT_PATH = BT93S_ROOT / "bt93s_closure_gate_report.json"

GREEN_RESULT = "action-selection-green"
RED_RESULTS = {
    "action-space-required",
    "action-selection-required",
    "matrix-redesign-required",
    "observation-telemetry-required",
    "measurement-invalid",
}
ALLOWED_RESULT_CLASSES = {GREEN_RESULT, *RED_RESULTS}

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
]

SOURCE_SPECS: dict[str, tuple[Path, str, Mapping[str, Any]]] = {
    "scenarioWindowContract": (
        SCENARIO_CONTRACT_PATH,
        "BT93S.1 pinned scenario-window contract",
        {"blockId": "BT93S", "phaseId": "93S.1", "ok": True, "resultClass": "scenario-window-contract-green"},
    ),
    "actionEffectWindowManifest": (
        ACTION_EFFECT_MANIFEST_PATH,
        "BT93S.1 action-effect manifest alias",
        {"blockId": "BT93S", "phaseId": "93S.1", "ok": True, "resultClass": "scenario-window-contract-green"},
    ),
    "existingActionEffect": (
        EXISTING_ACTION_EFFECT_PATH,
        "BT93S.2 existing-action effect report",
        {"blockId": "BT93S", "phaseId": "93S.2", "ok": True},
    ),
    "actionSurfaceDecision": (
        ACTION_SURFACE_DECISION_PATH,
        "BT93S.3 action-surface decision",
        {"blockId": "BT93S", "phaseId": "93S.3", "ok": True},
    ),
    "policySelection": (
        POLICY_SELECTION_REPORT_PATH,
        "BT93S.4 policy-selection report",
        {"blockId": "BT93S", "phaseId": "93S.4", "ok": True},
    ),
    "bt93rrClosure": (
        BT93RR_CLOSURE_PATH,
        "BT93RR.99 R-Allowlist closure",
        {"blockId": "BT93RR", "phaseId": "93RR.99", "ok": True, "resultClass": "eval-mode-bug-fixed-counterprobe-green"},
    ),
    "bt93rrHandover": (
        BT93RR_HANDOVER_PATH,
        "BT93RR.99 handover opening only BT93S",
        {"blockId": "BT93RR", "phaseId": "93RR.99", "ok": True, "resultClass": "eval-mode-bug-fixed-counterprobe-green"},
    ),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


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


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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


def _source_artifact(path: Path, role: str, tracked: set[str], expected: Mapping[str, Any]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    actual_fields = {key: _get(payload, *key.split(".")) for key in expected}
    expected_ok = all(_expected_matches(actual_fields[key], value) for key, value in expected.items())
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
        "expectedFields": dict(expected),
        "actualFields": actual_fields,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files(path for path, _role, _expected in SOURCE_SPECS.values())
    return [
        {"sourceKey": key, **_source_artifact(path, role, tracked, expected)}
        for key, (path, role, expected) in SOURCE_SPECS.items()
    ]


def _phase_bool(payload: Mapping[str, Any], key: str) -> bool:
    coverage = payload.get("phaseCoverage")
    return isinstance(coverage, Mapping) and coverage.get(key) is True


def _compact_counts(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    policy_counts = payloads["policySelection"].get("sampleCounts")
    effect_counts = payloads["existingActionEffect"].get("sampleCounts")
    return {
        "scenarioCount": _get(policy_counts, "scenarioCount"),
        "contractScenarioCount": _get(policy_counts, "contractScenarioCount"),
        "probeCount": _get(effect_counts, "probeCount"),
        "selectionStepCount": _get(policy_counts, "selectionStepCount"),
        "newTrainingEpisodes": _get(policy_counts, "newTrainingEpisodes") or 0,
        "newOptimizerUpdates": _get(policy_counts, "newOptimizerUpdates") or 0,
        "holdoutEpisodes": _get(policy_counts, "holdoutEpisodes") or 0,
    }


def _list_values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    return []


def _scenario_blockers(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, list[str]]:
    effect_decision = payloads["existingActionEffect"].get("decision")
    action_decision = payloads["actionSurfaceDecision"].get("actionSurfaceDecision")
    policy_decision = payloads["policySelection"].get("decision")
    action_decision = action_decision if isinstance(action_decision, Mapping) else {}
    policy_decision = policy_decision if isinstance(policy_decision, Mapping) else {}
    effect_decision = effect_decision if isinstance(effect_decision, Mapping) else {}
    telemetry_routing = policy_decision.get("telemetryRouting")
    telemetry_routing = telemetry_routing if isinstance(telemetry_routing, Mapping) else {}
    return {
        "matrixRedesignScenarioIds": sorted(
            set(_list_values(action_decision.get("matrixRedesignScenarioIds")))
            | set(_list_values(policy_decision.get("matrixRedesignScenarioIds")))
        ),
        "actionEffectGapScenarioIds": sorted(
            set(_list_values(effect_decision.get("actionEffectGapScenarioIds")))
            | set(_list_values(action_decision.get("actionEffectGapScenarioIds")))
            | set(_list_values(policy_decision.get("actionSpaceBlockers")))
        ),
        "selectionBlockers": sorted(set(_list_values(policy_decision.get("selectionBlockers")))),
        "telemetryLimitedScenarioIds": sorted(
            set(_list_values(payloads["existingActionEffect"].get("telemetryLimitedScenarioIds")))
            | set(_list_values(effect_decision.get("telemetryStillLimitedScenarioIds")))
            | set(_list_values(telemetry_routing.get("telemetryLimitedScenarioIds")))
        ),
    }


def _active_blockers(
    *,
    source_files_ready: bool,
    source_files_versioned: bool,
    payloads: Mapping[str, Mapping[str, Any]],
    scenario_blockers: Mapping[str, list[str]],
) -> list[str]:
    blockers: list[str] = []
    if not source_files_ready or not source_files_versioned:
        blockers.append("measurement-invalid")
    if any(payload.get("resultClass") == "measurement-invalid" or payload.get("ok") is False for payload in payloads.values()):
        blockers.append("measurement-invalid")
    if scenario_blockers["matrixRedesignScenarioIds"]:
        blockers.append("matrix-redesign-required")
    if scenario_blockers["actionEffectGapScenarioIds"]:
        blockers.append("action-space-required")
    if scenario_blockers["selectionBlockers"]:
        blockers.append("action-selection-required")
    if scenario_blockers["telemetryLimitedScenarioIds"]:
        blockers.append("observation-telemetry-required")
    for source in ("existingActionEffect", "actionSurfaceDecision", "policySelection"):
        result = str(payloads[source].get("resultClass") or "")
        if result in RED_RESULTS:
            blockers.append(result)
    return sorted(set(blockers))


def _result_class(active_blockers: list[str]) -> str:
    for candidate in (
        "measurement-invalid",
        "matrix-redesign-required",
        "action-space-required",
        "observation-telemetry-required",
        "action-selection-required",
    ):
        if candidate in active_blockers:
            return candidate
    return GREEN_RESULT


def _claim_flags(result_class: str) -> dict[str, bool]:
    return {
        "bt93tClaimAllowed": result_class == "observation-telemetry-required",
        "bt93uClaimAllowed": result_class == GREEN_RESULT,
        "bt93wClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignalAllowed": False,
        "bt95HandoffAllowed": False,
    }


def _guardrails(result_class: str) -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
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
        "qualityClaimAllowed": result_class == GREEN_RESULT,
    }


def _allowed_next(result_class: str) -> tuple[list[str], list[str], list[dict[str, str]]]:
    if result_class == GREEN_RESULT:
        return (
            ["BT93U claim: Danger-aware Reward- und Objective-Ordering Repair"],
            ["BT93U"],
            [
                {
                    "rank": "1",
                    "action": "Claim BT93U via /fix-planung.",
                    "why": "BT93S closed action-selection-green without telemetry, action-space, or matrix blocker.",
                }
            ],
        )
    if result_class == "observation-telemetry-required":
        return (
            ["BT93T claim: training-only Raw-/Trail-/Escape-Lane Telemetry Repair"],
            ["BT93T"],
            [
                {
                    "rank": "1",
                    "action": "Claim BT93T via /fix-planung.",
                    "why": "BT93S could not judge trail/escape behavior without additional training-only telemetry.",
                },
                {
                    "rank": "2",
                    "action": "Recheck BT93S after telemetry-green.",
                    "why": "BT93U requires a fresh S-Recheck with action-selection-green.",
                },
            ],
        )
    if result_class == "matrix-redesign-required":
        return (
            ["Manual replan/intake for BT93S matrix redesign before BT93T/U/W/O"],
            [],
            [
                {
                    "rank": "1",
                    "action": "Add a narrow matrix-redesign/action-effect follow-up before continuing the R-X ladder.",
                    "why": "BT93S found the pinned matrix itself invalid for at least one control/effect window; BT93T only covers telemetry gaps and cannot repair matrix validity.",
                },
                {
                    "rank": "2",
                    "action": "Keep BT93T, BT93U, BT93W, BT93O, BT93P and BT94A closed.",
                    "why": "The closure result is not observation-telemetry-required or action-selection-green.",
                },
            ],
        )
    if result_class == "action-space-required":
        return (
            ["Manual replan/intake for action-space or matrix repair before BT93T/U/W/O"],
            [],
            [
                {
                    "rank": "1",
                    "action": "Add a narrow action-space repair that proves real escape state effect before policy quality work.",
                    "why": "Existing actions left an action-effect gap; command/safety flags alone are not action quality.",
                }
            ],
        )
    if result_class == "action-selection-required":
        return (
            ["Manual replan/intake for policy-selection repair before BT93U/W/O"],
            [],
            [
                {
                    "rank": "1",
                    "action": "Add a narrow policy-selection repair/recheck before BT93U.",
                    "why": "The policy did not choose effective actions under danger often enough for action-selection-green.",
                }
            ],
        )
    return (
        ["Stop and repair measurement before any follow-up claim"],
        [],
        [
            {
                "rank": "1",
                "action": "Repair BT93S measurement inputs before continuing.",
                "why": "Closure evidence is incomplete, unversioned, or internally inconsistent.",
            }
        ],
    )


def build_report() -> dict[str, Any]:
    payloads = {key: _read_json(path) for key, (path, _role, _expected) in SOURCE_SPECS.items()}
    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] and item["fresh"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)
    scenario_blockers = _scenario_blockers(payloads)
    active_blockers = _active_blockers(
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        payloads=payloads,
        scenario_blockers=scenario_blockers,
    )
    result_class = _result_class(active_blockers)
    claim_flags = _claim_flags(result_class)
    allow_next, opens_next, recommendations = _allowed_next(result_class)
    guardrails = _guardrails(result_class)
    counts = _compact_counts(payloads)
    red_result_blocks_ladder = result_class != GREEN_RESULT and claim_flags["bt93uClaimAllowed"] is False
    phase_coverage = {
        "93S.99.1": result_class in ALLOWED_RESULT_CLASSES
        and bool(allow_next)
        and source_files_ready
        and source_files_versioned,
        "93S.99.2": red_result_blocks_ladder
        and claim_flags["bt93wClaimAllowed"] is False
        and claim_flags["bt93oClaimAllowed"] is False
        and claim_flags["bt93pClaimAllowed"] is False
        and claim_flags["bt94aClaimAllowed"] is False,
    }
    dod_coverage = {
        "DoD.S1": _phase_bool(payloads["scenarioWindowContract"], "DoD.S1"),
        "DoD.S2": _phase_bool(payloads["existingActionEffect"], "DoD.S2"),
        "DoD.S3": _phase_bool(payloads["actionSurfaceDecision"], "DoD.S3"),
        "DoD.S4": _phase_bool(payloads["policySelection"], "DoD.S4"),
        "DoD.S5": (result_class == GREEN_RESULT and claim_flags["bt93uClaimAllowed"] is True)
        or (
            result_class in RED_RESULTS
            and claim_flags["bt93uClaimAllowed"] is False
            and claim_flags["bt93wClaimAllowed"] is False
            and claim_flags["bt93oClaimAllowed"] is False
        ),
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())
    if not ok:
        result_class = "measurement-invalid"
        claim_flags = _claim_flags(result_class)
        allow_next, opens_next, recommendations = _allowed_next(result_class)
    return {
        "schemaVersion": "bt93s-closure-gate-report-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93s_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93S",
        "phaseId": "93S.99",
        "resultClass": result_class,
        "matrixId": payloads["scenarioWindowContract"].get("matrixId"),
        "contractId": payloads["scenarioWindowContract"].get("contractId"),
        "actionSurfaceId": payloads["scenarioWindowContract"].get("actionSurface", {}).get("surfaceId")
        if isinstance(payloads["scenarioWindowContract"].get("actionSurface"), Mapping)
        else payloads["policySelection"].get("actionSurfaceId"),
        "semanticWindow": {
            "source": _rel(SCENARIO_CONTRACT_PATH),
            "effectWindowStepsByScenario": _get(payloads["existingActionEffect"], "thresholdsLockedBeforeRun", "effectWindowStepsByScenario"),
        },
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceResultClasses": {
            key: payload.get("resultClass")
            for key, payload in payloads.items()
            if key in {"scenarioWindowContract", "existingActionEffect", "actionSurfaceDecision", "policySelection", "bt93rrClosure", "bt93rrHandover"}
        },
        "thresholdsLockedBeforeRun": {
            "source": _rel(SCENARIO_CONTRACT_PATH),
            "policySource": _rel(BT93RR_CLOSURE_PATH),
            "greenOnlyWhen": GREEN_RESULT,
            "telemetryCanOnlyOpen": "BT93T",
            "matrixRedesignPrecedence": True,
            "redResultsBlockBT93UWTOP94A": True,
            "noRewardOrMaxStepSuccessProxy": True,
        },
        "sampleCounts": counts,
        "activeBlockers": active_blockers,
        "scenarioBlockers": scenario_blockers,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "claimFlags": claim_flags,
        "guardrails": guardrails,
        "allowNext": allow_next,
        "opensNext": opens_next,
        "blocksNext": BLOCKED_NEXT,
        "recommendations": recommendations,
        "blockingStatus": {
            "bt93tStartDecision": "allowed" if claim_flags["bt93tClaimAllowed"] else "blocked",
            "bt93uStartDecision": "allowed" if claim_flags["bt93uClaimAllowed"] else "blocked",
            "bt93wStartDecision": "blocked",
            "bt93oStartDecision": "blocked",
            "bt93pStartDecision": "blocked",
            "bt94aStartDecision": "blocked",
            "candidateFreezePromoteRolloutDecision": "blocked",
        },
        "summary": {
            "finalResult": result_class,
            "nextBestAction": allow_next[0] if allow_next else "Stop",
            "why": recommendations[0]["why"] if recommendations else None,
            "bt93sClosedRed": result_class != GREEN_RESULT,
            "blockersRemain": active_blockers,
        },
        "commands": {
            "write": "python python/scripts/bt93s_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure gate script",
        },
    }


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
                "activeBlockers": report["activeBlockers"],
                "scenarioBlockers": report["scenarioBlockers"],
                "claimFlags": report["claimFlags"],
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "allowNext": report["allowNext"],
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
