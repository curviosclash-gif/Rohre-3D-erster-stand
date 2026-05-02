"""BT93S2R3.3 direction, escape-fairness and neutral-control contract.

This reentry phase starts only after BT93S2R4.99 closes green. It consumes the
historical S2R3 failure ledger for expected direction semantics plus the
S2R4/S2R5 green replay-startstate evidence for current pre-action validity.
It writes a contract report only; it does not train PPO, judge action quality,
change rewards, telemetry, action surfaces, or productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
SCRIPT_ROOT = PYTHON_ROOT / "scripts"
for path in (PYTHON_ROOT, SCRIPT_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import bt93s2r3_failure_ledger as failure_ledger  # noqa: E402
import bt93s2r4_closure_gate as s2r4_closure  # noqa: E402
import bt93s2r4_full_replay_preflight_gate as s2r4_full_gate  # noqa: E402
import bt93s2r5_closure_gate as s2r5_closure  # noqa: E402
import bt93s2r5_predicate_preaction_empirical_gate as s2r5_empirical  # noqa: E402


BLOCK_ID = "BT93S2R3"
PHASE_ID = "93S2R3.3-Reentry"
GREEN_RESULT = "direction-fairness-neutral-contract-green"
S2R4_GREEN_RESULT = "replay-startstate-green"
S2R5_GREEN_RESULT = "predicate-window-repair-green"
EXPECTED_ROW_COUNT = 103
LOCKED_REPEAT_COUNT = 3
EXPECTED_REPLAY_ATTEMPT_COUNT = EXPECTED_ROW_COUNT * LOCKED_REPEAT_COUNT

SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r3_direction_fairness_neutral_contract.py"
REPORT_PATH = failure_ledger.BT93S2R3_ROOT / "direction_fairness_neutral_contract.json"
DOC_PATH = failure_ledger.DOC_PATH
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"

ALLOWED_RESULT_CLASSES = {
    GREEN_RESULT,
    "direction-contract-required",
    "escape-right-fairness-required",
    "neutral-control-required",
    "predicate-window-required",
    "action-surface-lineage-invalidated",
    "measurement-invalid",
}

FORBIDDEN_DOWNSTREAM = [
    "BT93S2.3-Recheck before BT93S2R3.99 green closure",
    "93S2.4 start before a fresh BT93S2.3-Recheck writes measurementValid=true",
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
    "reward fix from BT93S2R3.3",
    "telemetry fix from BT93S2R3.3",
    "action-surface change from BT93S2R3.3",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_text(payload: Mapping[str, Any]) -> str:
    return f"{json.dumps(payload, indent=2, sort_keys=True)}\n"


def _read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except FileNotFoundError:
        return {}
    if isinstance(payload, dict):
        return payload
    return {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_json_text(payload), encoding="utf-8")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _sha256_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _hash_value(value: Any) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def _sha256_payload(payload: Mapping[str, Any]) -> str:
    return _hash_value(payload)


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip()


def _git_lines(args: list[str]) -> list[str]:
    return [line.strip().replace("\\", "/") for line in _git_output(args).splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path]) -> set[str]:
    rel_paths = [_rel(path) for path in paths if path is not None]
    rel_paths = [path for path in rel_paths if path]
    if not rel_paths:
        return set()
    return set(_git_lines(["git", "ls-files", "--", *rel_paths]))


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    value: Any = mapping
    for key in keys:
        if not isinstance(value, Mapping):
            return None
        value = value.get(key)
    return value


def _as_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _expected_matches(actual: Any, expected: Any) -> bool:
    if expected is None:
        return True
    if isinstance(expected, list):
        return actual in expected
    return actual == expected


def _source_artifact(
    *,
    source_key: str,
    path: Path,
    role: str,
    expected: Mapping[str, Any] | None = None,
    required: bool = True,
    tracked: set[str],
) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    actual_fields = {key: _get(payload, *key.split(".")) for key in (expected or {})}
    expected_ok = all(_expected_matches(actual_fields.get(key), value) for key, value in (expected or {}).items())
    rel_path = _rel(path)
    exists = path.is_file()
    return {
        "sourceKey": source_key,
        "role": role,
        "path": rel_path,
        "required": required,
        "exists": exists,
        "isFile": exists,
        "tracked": rel_path in tracked if rel_path else False,
        "fresh": bool(exists and (not required or expected_ok)),
        "sha256": _sha256_file(path),
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
        "reportHash": payload.get("reportHash") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expectedFields": dict(expected or {}),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: dict[str, tuple[Path, str, Mapping[str, Any], bool]] = {
        "s2r4Closure": (
            s2r4_closure.CLOSURE_REPORT_PATH,
            "BT93S2R4.99 green closure opening only 93S2R3.3-Reentry",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.99",
                "resultClass": S2R4_GREEN_RESULT,
                "ok": True,
                "gatePassed": True,
                "claimFlags.phase93S2R3_3ReentryAllowed": True,
            },
            True,
        ),
        "s2r4FullPreflight": (
            s2r4_full_gate.REPORT_PATH,
            "BT93S2R4.5 full replay-startstate green source",
            {
                "blockId": "BT93S2R4",
                "phaseId": "93S2R4.5",
                "resultClass": S2R4_GREEN_RESULT,
                "ok": True,
            },
            True,
        ),
        "s2r5Closure": (
            s2r5_closure.CLOSURE_REPORT_PATH,
            "BT93S2R5.99 predicate/window green closure",
            {
                "blockId": "BT93S2R5",
                "phaseId": "93S2R5.99",
                "resultClass": S2R5_GREEN_RESULT,
                "ok": True,
                "gatePassed": True,
            },
            True,
        ),
        "s2r5Empirical": (
            s2r5_empirical.REPORT_PATH,
            "BT93S2R5.4 green empirical predicate/pre-action source",
            {
                "blockId": "BT93S2R5",
                "phaseId": "93S2R5.4",
                "resultClass": S2R5_GREEN_RESULT,
                "ok": True,
            },
            True,
        ),
        "s2r3FailureLedger": (
            failure_ledger.REPORT_PATH,
            "BT93S2R3.1 expected direction source ledger",
            {
                "blockId": BLOCK_ID,
                "phaseId": "93S2R3.1",
                "resultClass": "source-lock-failure-ledger-written",
                "ok": True,
            },
            True,
        ),
        "actionSurfaceDecoder": (
            ACTION_SURFACE_PATH,
            "read-only PPO action-surface decoder",
            {},
            True,
        ),
        "directionContractScript": (
            SCRIPT_PATH,
            "BT93S2R3.3 report generator",
            {},
            False,
        ),
    }
    tracked = _tracked_files(spec[0] for spec in specs.values())
    return [
        _source_artifact(
            source_key=source_key,
            path=path,
            role=role,
            expected=expected,
            required=required,
            tracked=tracked,
        )
        for source_key, (path, role, expected, required) in specs.items()
    ]


def _row_key(row: Mapping[str, Any]) -> tuple[str, str, str]:
    return (str(row.get("scenarioId")), str(row.get("seed")), str(row.get("actionName")))


def _full_rows_by_key(full_report: Mapping[str, Any]) -> dict[tuple[str, str, str], Mapping[str, Any]]:
    result: dict[tuple[str, str, str], Mapping[str, Any]] = {}
    for row in _as_list(full_report.get("fullReplayRows")):
        if isinstance(row, Mapping):
            result[_row_key(row)] = row
    return result


def _full_rows_by_ledger_index(full_report: Mapping[str, Any]) -> dict[int, Mapping[str, Any]]:
    result: dict[int, Mapping[str, Any]] = {}
    for row in _as_list(full_report.get("fullReplayRows")):
        if not isinstance(row, Mapping):
            continue
        try:
            result[int(row.get("ledgerIndex"))] = row
        except (TypeError, ValueError):
            continue
    return result


def _forbidden_direction(expected: Mapping[str, Any]) -> str | list[str] | None:
    expected_direction = expected.get("expectedDirection")
    action_role = expected.get("actionRole")
    if expected_direction == "left":
        return "right"
    if expected_direction == "right":
        return "left"
    if expected_direction == "neutral":
        return ["action-green", "direction-green", "reward-green"]
    if action_role == "positive-control":
        return "wrong-state-effect-success"
    if action_role == "non-control-action":
        return "any-action-green"
    if action_role == "negative-control":
        return "success"
    return None


def _valid_preaction_window(row: Mapping[str, Any]) -> bool:
    return bool(
        row.get("predicatePass") is True
        and row.get("completedMinimumWindow") is True
        and row.get("measurementInvalidBeforeAction") is False
        and row.get("warmupTerminalBeforeAction") is False
        and row.get("repeatStable") is True
    )


def _direction_contract_rows(
    ledger_report: Mapping[str, Any], full_report: Mapping[str, Any]
) -> list[dict[str, Any]]:
    full_rows = _full_rows_by_key(full_report)
    full_rows_by_ledger = _full_rows_by_ledger_index(full_report)
    contract_rows: list[dict[str, Any]] = []
    for ledger_row in _as_list(ledger_report.get("failureLedgerRows")):
        if not isinstance(ledger_row, Mapping):
            continue
        key = _row_key(ledger_row)
        ledger_index = ledger_row.get("ledgerIndex")
        try:
            full_row = _as_mapping(full_rows_by_ledger.get(int(ledger_index)))
        except (TypeError, ValueError):
            full_row = {}
        if not full_row:
            full_row = _as_mapping(full_rows.get(key))
        expected = dict(_as_mapping(ledger_row.get("expectedDirection")))
        contract_rows.append(
            {
                "ledgerIndex": ledger_row.get("ledgerIndex"),
                "scenarioId": ledger_row.get("scenarioId"),
                "seed": ledger_row.get("seed"),
                "actionName": ledger_row.get("actionName"),
                "actionToken": ledger_row.get("actionToken"),
                "actionRole": expected.get("actionRole"),
                "expectedDirection": expected.get("expectedDirection"),
                "expectedEffect": expected.get("expectedEffect"),
                "forbiddenDirection": _forbidden_direction(expected),
                "primaryMetric": expected.get("primaryMetric"),
                "fallbackMetric": expected.get("fallbackMetric"),
                "requiredStateEffects": list(expected.get("requiredStateEffects") or []),
                "forbiddenSuccessProxies": list(expected.get("forbiddenSuccessProxies") or []),
                "rewardOrCommandFlagsCanMakeSuccess": False,
                "commandFlagOnlyCanMakeSuccess": False,
                "rewardOnlyCanMakeSuccess": False,
                "positiveControlsMustMatchExpectedDirection": bool(
                    expected.get("positiveControlsMustMatchExpectedDirection")
                ),
                "positiveControlActions": list(expected.get("positiveControlActions") or []),
                "negativeControlActions": list(expected.get("negativeControlActions") or []),
                "counterDirectionActions": list(expected.get("counterDirectionActions") or []),
                "neutralWindow": dict(_as_mapping(expected.get("neutralWindow"))),
                "sourcePrimaryClass": ledger_row.get("primaryClass"),
                "sourceRepairClass": ledger_row.get("repairClass"),
                "sourceSessionReplayId": ledger_row.get("sessionReplayId"),
                "currentReplaySpecId": full_row.get("replaySpecId"),
                "currentSessionReplayId": full_row.get("sessionReplayId"),
                "repairedByS2R5": full_row.get("repairedByS2R5"),
                "validPreActionWindow": _valid_preaction_window(full_row),
                "currentResultClass": full_row.get("resultClass"),
                "directionJudgementProduced": False,
                "actionQualityJudgementProduced": False,
            }
        )
    return sorted(
        contract_rows,
        key=lambda row: (str(row.get("scenarioId")), int(row.get("ledgerIndex") or -1), str(row.get("actionName"))),
    )


def _escape_fairness_contract(contract_rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    rows = [row for row in contract_rows if row.get("scenarioId") == "escape-right-open"]
    positive_rows = [row for row in rows if row.get("actionRole") == "positive-control"]
    valid_positive_rows = [row for row in positive_rows if row.get("validPreActionWindow") is True]
    actions = sorted({str(row.get("actionName")) for row in positive_rows})
    valid_actions = sorted({str(row.get("actionName")) for row in valid_positive_rows})
    return {
        "scenarioId": "escape-right-open",
        "fairnessFirst": True,
        "rowCount": len(rows),
        "positiveControlRowCount": len(positive_rows),
        "positiveControlValidWindowCount": len(valid_positive_rows),
        "positiveControlActions": actions,
        "positiveControlValidWindowActions": valid_actions,
        "positiveControlsMeasurableBeforeActionSpaceJudgement": bool(positive_rows and len(positive_rows) == len(valid_positive_rows)),
        "actionSpaceRequiredAllowedByThisPhase": False,
        "futureActionSpaceJudgementPreconditionPinned": True,
    }


def _neutral_control_contract(contract_rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    rows = [row for row in contract_rows if row.get("scenarioId") == "no-danger-control"]
    neutral_rows = [row for row in rows if str(row.get("actionRole")).startswith("neutral-control")]
    valid_rows = [row for row in rows if row.get("validPreActionWindow") is True]
    return {
        "scenarioId": "no-danger-control",
        "rowCount": len(rows),
        "neutralControlRowCount": len(neutral_rows),
        "validPreActionWindowCount": len(valid_rows),
        "successAllowed": False,
        "directionGreenAllowed": False,
        "actionGreenAllowed": False,
        "rewardGreenAllowed": False,
        "actionGreenProduced": False,
        "directionGreenProduced": False,
        "neutralControlRequiredCount": 0 if len(valid_rows) == len(rows) else len(rows) - len(valid_rows),
        "forbiddenOutputs": ["success", "direction-green", "action-green", "reward-green"],
        "stableWindowPinned": bool(rows and len(valid_rows) == len(rows)),
    }


def _count_false(rows: Iterable[Mapping[str, Any]], key: str) -> int:
    return sum(1 for row in rows if row.get(key) is False)


def _source_files_ready(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(item.get("fresh") is True for item in source_artifacts if item.get("required") is True)


def _source_files_versioned(source_artifacts: Iterable[Mapping[str, Any]]) -> bool:
    return all(item.get("tracked") is True for item in source_artifacts if item.get("required") is True)


def _source_hashes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {str(item.get("sourceKey")): item.get("sha256") for item in source_artifacts if item.get("sourceKey")}


def _source_result_classes(source_artifacts: Iterable[Mapping[str, Any]]) -> dict[str, str | None]:
    return {str(item.get("sourceKey")): item.get("resultClass") for item in source_artifacts if item.get("sourceKey")}


def _sample_counts(
    *,
    contract_rows: list[Mapping[str, Any]],
    full_report: Mapping[str, Any],
    escape_contract: Mapping[str, Any],
    neutral_contract: Mapping[str, Any],
) -> dict[str, Any]:
    role_counts = Counter(str(row.get("actionRole")) for row in contract_rows)
    scenario_counts = Counter(str(row.get("scenarioId")) for row in contract_rows)
    full_counts = _as_mapping(full_report.get("sampleCounts"))
    return {
        "contractRowCount": len(contract_rows),
        "expectedContractRowCount": EXPECTED_ROW_COUNT,
        "scenarioCount": len(scenario_counts),
        "directionContractRowCount": len(contract_rows),
        "expectedDirectionMissingCount": sum(1 for row in contract_rows if row.get("expectedEffect") in (None, "")),
        "forbiddenDirectionMissingCount": sum(1 for row in contract_rows if row.get("forbiddenDirection") in (None, "")),
        "rewardOrCommandSuccessAllowedCount": sum(
            1 for row in contract_rows if row.get("rewardOrCommandFlagsCanMakeSuccess") is not False
        ),
        "rewardOnlySuccessAllowedCount": sum(1 for row in contract_rows if row.get("rewardOnlyCanMakeSuccess") is not False),
        "commandFlagOnlySuccessAllowedCount": sum(
            1 for row in contract_rows if row.get("commandFlagOnlyCanMakeSuccess") is not False
        ),
        "directionJudgementProducedCount": sum(1 for row in contract_rows if row.get("directionJudgementProduced") is True),
        "actionQualityJudgementProducedCount": sum(
            1 for row in contract_rows if row.get("actionQualityJudgementProduced") is True
        ),
        "positiveControlContractCount": role_counts.get("positive-control", 0),
        "positiveControlValidWindowCount": sum(
            1 for row in contract_rows if row.get("actionRole") == "positive-control" and row.get("validPreActionWindow") is True
        ),
        "negativeControlContractCount": role_counts.get("negative-control", 0),
        "counterDirectionControlContractCount": role_counts.get("counter-direction-control", 0),
        "nonControlActionContractCount": role_counts.get("non-control-action", 0),
        "neutralControlContractCount": role_counts.get("neutral-control-positive", 0)
        + role_counts.get("neutral-control-other", 0),
        "validPreActionWindowCount": sum(1 for row in contract_rows if row.get("validPreActionWindow") is True),
        "invalidPreActionWindowCount": _count_false(contract_rows, "validPreActionWindow"),
        "escapeRightRowCount": escape_contract.get("rowCount"),
        "escapeRightPositiveControlCount": escape_contract.get("positiveControlRowCount"),
        "escapeRightPositiveControlValidWindowCount": escape_contract.get("positiveControlValidWindowCount"),
        "escapeRightFairnessFailureCount": 0
        if escape_contract.get("positiveControlsMeasurableBeforeActionSpaceJudgement") is True
        else 1,
        "noDangerControlRowCount": neutral_contract.get("rowCount"),
        "noDangerControlValidWindowCount": neutral_contract.get("validPreActionWindowCount"),
        "neutralControlRequiredCount": neutral_contract.get("neutralControlRequiredCount"),
        "neutralControlActionGreenProduced": neutral_contract.get("actionGreenProduced"),
        "neutralControlDirectionGreenProduced": neutral_contract.get("directionGreenProduced"),
        "sourceFullReplayRowCount": full_counts.get("contractRowCount"),
        "sourceFullReplayAttemptCount": full_counts.get("replayAttemptCount"),
        "sourceFullReplayRepeatCount": full_counts.get("repeatCount"),
        "predicateFailureCount": full_counts.get("predicateFailureCount"),
        "minimumWindowFailureCount": full_counts.get("minimumWindowFailureCount"),
        "measurementInvalidBeforeActionCount": full_counts.get("measurementInvalidBeforeActionCount"),
        "warmupTerminalBeforeActionCount": full_counts.get("warmupTerminalBeforeActionCount"),
        "replaySpecIdRepeatMismatchCount": full_counts.get("replaySpecIdRepeatMismatchCount"),
        "startMetricsHashRepeatMismatchCount": full_counts.get("startMetricsHashRepeatMismatchCount"),
        "warmupKeyRepeatMismatchCount": full_counts.get("warmupKeyRepeatMismatchCount"),
        "sessionIdDriftCount": full_counts.get("sessionIdDriftCount"),
        "newTrainingEpisodes": 0,
        "holdoutEpisodes": 0,
        "newOptimizerUpdates": 0,
        "rewardChangeCount": 0,
        "telemetryChangeCount": 0,
        "runtimeChangeCount": 0,
        "actionSurfaceChangeCount": 0,
    }


def _active_blockers(
    *,
    source_files_ready: bool,
    source_files_versioned: bool,
    counts: Mapping[str, Any],
    closure_report: Mapping[str, Any],
    full_report: Mapping[str, Any],
    action_surface_hash: str | None,
    expected_decoder_hash: str | None,
) -> list[str]:
    blockers: list[str] = []
    if not source_files_ready:
        blockers.append("source-files-not-ready")
    if not source_files_versioned:
        blockers.append("source-files-not-versioned")
    if closure_report.get("resultClass") != S2R4_GREEN_RESULT or closure_report.get("ok") is not True:
        blockers.append("s2r4-closure-not-green")
    if "93S2R3.3-Reentry" not in _as_list(closure_report.get("opensNext")):
        blockers.append("s2r4-closure-does-not-open-s2r3-reentry")
    if full_report.get("resultClass") != S2R4_GREEN_RESULT or full_report.get("ok") is not True:
        blockers.append("s2r4-full-preflight-not-green")
    if action_surface_hash and expected_decoder_hash and action_surface_hash != expected_decoder_hash:
        blockers.append("action-surface-lineage-invalidated")
    if counts.get("contractRowCount") != EXPECTED_ROW_COUNT:
        blockers.append("direction-contract-row-count-mismatch")
    if counts.get("sourceFullReplayAttemptCount") != EXPECTED_REPLAY_ATTEMPT_COUNT:
        blockers.append("source-full-replay-attempt-count-mismatch")
    if counts.get("sourceFullReplayRepeatCount") != LOCKED_REPEAT_COUNT:
        blockers.append("source-repeat-count-mismatch")
    if counts.get("predicateFailureCount") != 0 or counts.get("minimumWindowFailureCount") != 0:
        blockers.append("predicate-window-required")
    if counts.get("measurementInvalidBeforeActionCount") != 0 or counts.get("warmupTerminalBeforeActionCount") != 0:
        blockers.append("predicate-window-required")
    if counts.get("invalidPreActionWindowCount") != 0:
        blockers.append("predicate-window-required")
    if counts.get("expectedDirectionMissingCount") != 0 or counts.get("forbiddenDirectionMissingCount") != 0:
        blockers.append("direction-contract-required")
    if (
        counts.get("rewardOrCommandSuccessAllowedCount") != 0
        or counts.get("rewardOnlySuccessAllowedCount") != 0
        or counts.get("commandFlagOnlySuccessAllowedCount") != 0
    ):
        blockers.append("direction-contract-required")
    if counts.get("escapeRightFairnessFailureCount") != 0:
        blockers.append("escape-right-fairness-required")
    if counts.get("neutralControlRequiredCount") != 0:
        blockers.append("neutral-control-required")
    if counts.get("neutralControlActionGreenProduced") is not False:
        blockers.append("neutral-control-required")
    if counts.get("neutralControlDirectionGreenProduced") is not False:
        blockers.append("neutral-control-required")
    if any(counts.get(key) != 0 for key in ("newTrainingEpisodes", "holdoutEpisodes", "newOptimizerUpdates")):
        blockers.append("measurement-invalid")
    return sorted(set(blockers))


def _result_class(blockers: Iterable[str]) -> str:
    blocker_set = set(blockers)
    if not blocker_set:
        return GREEN_RESULT
    for blocker, result_class in (
        ("action-surface-lineage-invalidated", "action-surface-lineage-invalidated"),
        ("predicate-window-required", "predicate-window-required"),
        ("direction-contract-required", "direction-contract-required"),
        ("escape-right-fairness-required", "escape-right-fairness-required"),
        ("neutral-control-required", "neutral-control-required"),
    ):
        if blocker in blocker_set:
            return result_class
    return "measurement-invalid"


def _claim_flags(green: bool) -> dict[str, bool]:
    flags = {
        "phase93S2R3_3Closed": green,
        "phase93S2R3_4Allowed": green,
        "phase93S2R3_99Allowed": False,
        "bt93s2FreshRecheckAllowed": False,
        "phase93S2_4Allowed": False,
        "bt93tClaimable": False,
        "bt93uClaimable": False,
        "bt93vClaimable": False,
        "bt93wClaimable": False,
        "bt93oClaimable": False,
        "bt93xFullClaimAllowed": False,
        "bt93pClaimable": False,
        "bt94aClaimable": False,
        "candidateRunsAllowed": False,
        "freezeAllowed": False,
        "holdoutAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignalAllowed": False,
        "bt95HandoffAllowed": False,
        "ppoTrainingAllowed": False,
        "rewardChangeAllowed": False,
        "telemetryChangeAllowed": False,
        "runtimeChangeAllowed": False,
        "actionSurfaceChangeAllowed": False,
        "envConditionalWriteAllowed": False,
        "runnerConditionalWriteAllowed": False,
    }
    return flags


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "contractOnly": True,
        "trainingStarted": False,
        "ppoTrainingStarted": False,
        "newOptimizerUpdates": 0,
        "newTrainingEpisodes": 0,
        "newEvalRunStarted": False,
        "holdoutUsed": False,
        "holdoutEpisodes": 0,
        "candidateRun": False,
        "freezeCandidate": False,
        "rewardFixApplied": False,
        "telemetryFixApplied": False,
        "actionSurfaceChanged": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "actionQualityJudgementProduced": False,
        "actionSpaceJudgementProduced": False,
        "qualityClaimAllowed": False,
    }


def _phase_coverage(
    *,
    result_class: str,
    counts: Mapping[str, Any],
    source_files_ready: bool,
    source_files_versioned: bool,
    active_blockers: list[str],
    claim_flags: Mapping[str, Any],
) -> dict[str, Any]:
    green = result_class == GREEN_RESULT and not active_blockers
    field_contract_ok = bool(
        result_class in ALLOWED_RESULT_CLASSES
        and counts.get("contractRowCount") == EXPECTED_ROW_COUNT
        and counts.get("rewardOrCommandSuccessAllowedCount") == 0
        and counts.get("sourceFullReplayAttemptCount") == EXPECTED_REPLAY_ATTEMPT_COUNT
    )
    return {
        "93S2R3.3.1": bool(
            field_contract_ok
            and counts.get("expectedDirectionMissingCount") == 0
            and counts.get("forbiddenDirectionMissingCount") == 0
            and counts.get("rewardOrCommandSuccessAllowedCount") == 0
        ),
        "93S2R3.3.2": bool(
            counts.get("escapeRightPositiveControlCount", 0) > 0
            and counts.get("escapeRightPositiveControlCount") == counts.get("escapeRightPositiveControlValidWindowCount")
            and counts.get("escapeRightFairnessFailureCount") == 0
        ),
        "93S2R3.3.3": bool(
            counts.get("noDangerControlRowCount", 0) > 0
            and counts.get("noDangerControlRowCount") == counts.get("noDangerControlValidWindowCount")
            and counts.get("neutralControlRequiredCount") == 0
            and counts.get("neutralControlActionGreenProduced") is False
            and counts.get("neutralControlDirectionGreenProduced") is False
        ),
        "DoD.S2R3-5": bool(field_contract_ok and counts.get("rewardOrCommandSuccessAllowedCount") == 0),
        "DoD.S2R3-6": bool(counts.get("escapeRightFairnessFailureCount") == 0),
        "DoD.S2R3-7": "pending-93S2R3.4",
        "DoD.S2R3-8": bool(counts.get("neutralControlRequiredCount") == 0),
        "DoD.S2R3-9": "pending-93S2R3.4",
        "DoD.S2R3-10": "pending-93S2R3.99",
        "DoD.S2R3-11": "pending-93S2R3.99",
        "DoD.S2R3-12": "pending-meta-gate",
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "nextPhaseOnly": bool(green and claim_flags.get("phase93S2R3_4Allowed") is True),
    }


def build_report() -> dict[str, Any]:
    ledger_report = _read_json(failure_ledger.REPORT_PATH)
    full_report = _read_json(s2r4_full_gate.REPORT_PATH)
    s2r4_closure_report = _read_json(s2r4_closure.CLOSURE_REPORT_PATH)
    source_artifacts = _source_artifacts()
    contract_rows = _direction_contract_rows(ledger_report, full_report)
    escape_contract = _escape_fairness_contract(contract_rows)
    neutral_contract = _neutral_control_contract(contract_rows)
    counts = _sample_counts(
        contract_rows=contract_rows,
        full_report=full_report,
        escape_contract=escape_contract,
        neutral_contract=neutral_contract,
    )
    source_files_ready = _source_files_ready(source_artifacts)
    source_files_versioned = _source_files_versioned(source_artifacts)
    action_surface_hash = _sha256_file(ACTION_SURFACE_PATH)
    expected_decoder_hash = ledger_report.get("decoderHash")
    active_blockers = _active_blockers(
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        counts=counts,
        closure_report=s2r4_closure_report,
        full_report=full_report,
        action_surface_hash=action_surface_hash,
        expected_decoder_hash=expected_decoder_hash,
    )
    result_class = _result_class(active_blockers)
    ok = bool(result_class == GREEN_RESULT and not active_blockers)
    claim_flags = _claim_flags(ok)
    phase_coverage = _phase_coverage(
        result_class=result_class,
        counts=counts,
        source_files_ready=source_files_ready,
        source_files_versioned=source_files_versioned,
        active_blockers=active_blockers,
        claim_flags=claim_flags,
    )

    report: dict[str, Any] = {
        "schemaVersion": "bt93s2r3-direction-fairness-neutral-contract-v1",
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": result_class,
        "ok": ok,
        "matrixId": ledger_report.get("matrixId") or full_report.get("matrixId"),
        "contractId": ledger_report.get("contractId") or full_report.get("contractId"),
        "actionSurfaceId": ledger_report.get("actionSurfaceId") or full_report.get("actionSurfaceId"),
        "decoderHash": expected_decoder_hash,
        "actualActionSurfaceHash": action_surface_hash,
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "sourceArtifacts": source_artifacts,
        "sourceHashes": _source_hashes(source_artifacts),
        "sourceResultClasses": _source_result_classes(source_artifacts),
        "sourceReportHashes": {
            "s2r3FailureLedger": ledger_report.get("reportHash"),
            "s2r4Closure": s2r4_closure_report.get("reportHash"),
            "s2r4FullPreflight": full_report.get("reportHash"),
        },
        "sampleCounts": counts,
        "roleCounts": dict(Counter(str(row.get("actionRole")) for row in contract_rows)),
        "scenarioCounts": dict(Counter(str(row.get("scenarioId")) for row in contract_rows)),
        "escapeRightFairnessContract": escape_contract,
        "neutralControlContract": neutral_contract,
        "directionContractRows": contract_rows,
        "directionContractRowsHash": _hash_value(contract_rows),
        "activeBlockers": active_blockers,
        "allowNext": ["93S2R3.4 Retained-v2-Quarantaene und Full-Scenario Empirical Gate"] if ok else [],
        "opensNext": ["93S2R3.4 Retained-v2-Quarantaene und Full-Scenario Empirical Gate"] if ok else [],
        "blocksNext": FORBIDDEN_DOWNSTREAM,
        "claimFlags": claim_flags,
        "guardrails": _guardrails(),
        "phaseCoverage": phase_coverage,
        "invalidations": [
            {
                "active": not ok,
                "scope": "93S2R3.3",
                "reason": active_blockers,
            }
        ],
        "nextAllowedActions": [
            "Run 93S2R3.4 retained-v2/full-scenario empirical zero gate only after this report is green.",
            "Do not start BT93S2.3-Recheck before BT93S2R3.99 green closure.",
            "Do not start BT93T/U/W/O/P/94A, candidate, freeze, holdout, promote, rollout, PPO-Validate or BT95.",
        ]
        if ok
        else [
            f"Stop and repair the narrow S2R3.3 blocker class {result_class}.",
            "Do not start 93S2R3.4 or downstream phases while this contract is red.",
        ],
        "commands": {
            "write": "python python/scripts/bt93s2r3_direction_fairness_neutral_contract.py --write-report",
            "nextPhase": "python python/scripts/bt93s2r3_empirical_zero_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
            "tests": "user-owned except closure/documentation gates",
        },
    }
    report["reportHash"] = _sha256_payload(report)
    return report


def _markdown_section(report: Mapping[str, Any]) -> str:
    counts = _as_mapping(report.get("sampleCounts"))
    escape_contract = _as_mapping(report.get("escapeRightFairnessContract"))
    neutral_contract = _as_mapping(report.get("neutralControlContract"))
    return f"""<!-- BT93S2R3.3-START -->
## 93S2R3.3 Direction-, Fairness- und Neutral-Control-Contract

- Result: `resultClass={report.get('resultClass')}`, `ok={report.get('ok')}`
- Direction-Rows: `{counts.get('directionContractRowCount')}`; Reward-/Command-Success erlaubt: `{counts.get('rewardOrCommandSuccessAllowedCount')}`
- Escape-right positive Controls messbar: `{escape_contract.get('positiveControlValidWindowCount')}` / `{escape_contract.get('positiveControlRowCount')}`
- No-danger Neutral-Control: rows `{neutral_contract.get('rowCount')}`, actionGreenProduced=`{neutral_contract.get('actionGreenProduced')}`, directionGreenProduced=`{neutral_contract.get('directionGreenProduced')}`
- Source Full-Replay: `{counts.get('sourceFullReplayRowCount')}` rows x `{counts.get('sourceFullReplayRepeatCount')}` repeats = `{counts.get('sourceFullReplayAttemptCount')}` attempts

S2R3.3 pinnt nur Direction-/Fairness-/Neutral-Vertraege. Action-Space-Urteile,
Reward-, Telemetry-, ActionSurface-, Training-, Holdout- und Runtime-Aenderungen
bleiben verboten.

Evidence:

- `data/training/ppo/bt93s2r3/direction_fairness_neutral_contract.json`
- Command: `python python/scripts/bt93s2r3_direction_fairness_neutral_contract.py --write-report`
<!-- BT93S2R3.3-END -->
"""


def _write_doc_section(path: Path, report: Mapping[str, Any]) -> None:
    section = _markdown_section(report)
    start = "<!-- BT93S2R3.3-START -->"
    end = "<!-- BT93S2R3.3-END -->"
    text = path.read_text(encoding="utf-8") if path.is_file() else ""
    if start in text and end in text:
        before = text.split(start, 1)[0].rstrip()
        after = text.split(end, 1)[1].lstrip()
        text = f"{before}\n\n{section}\n{after}".rstrip() + "\n"
    else:
        text = f"{text.rstrip()}\n\n{section}".rstrip() + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write contract JSON and Fehlerbericht section.")
    args = parser.parse_args()
    report = build_report()
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_doc_section(DOC_PATH, report)
    print(
        _json_text(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "sampleCounts": report["sampleCounts"],
                "phaseCoverage": report["phaseCoverage"],
                "opensNext": report["opensNext"],
                "report": _rel(REPORT_PATH) if args.write_report else None,
                "doc": _rel(DOC_PATH) if args.write_report else None,
            }
        ),
        end="",
    )
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
