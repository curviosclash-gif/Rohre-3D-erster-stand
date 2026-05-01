"""BT93S2R2.1 source lock and failure taxonomy.

This script is deliberately read-only against the environment and action
surface. It locks the red BT93S2.3-Recheck sources and writes the first
BT93S2R2 evidence artifact plus the matching Fehlerbericht update.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter, defaultdict
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
SCRIPT_ROOT = PYTHON_ROOT / "scripts"
DOC_PATH = REPO_ROOT / "docs" / "Fehlerberichte" / "2026-05-01_bt93s2r2_recheck_measurement_invalid.md"

RECHECK_REPORT_PATH = BT93S2_ROOT / "existing_action_effect_v3_recheck_report.json"
MATRIX_V3_CONTRACT_PATH = BT93S2R_ROOT / "scenario_matrix_v3_contract.json"
REENTRY_GATE_REPORT_PATH = BT93S2R_ROOT / "matrix_control_reentry_gate_report.json"
S2R_CLOSURE_REPORT_PATH = BT93S2R_ROOT / "bt93s2r_closure_gate_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
REPORT_PATH = BT93S2R2_ROOT / "failure_taxonomy_report.json"
SCRIPT_PATH = SCRIPT_ROOT / "bt93s2r2_failure_taxonomy.py"

BLOCK_ID = "BT93S2R2"
PHASE_ID = "93S2R2.1"
RESULT_CLASS = "failure-taxonomy-source-lock-red-status-written"
MATRIX_ID = "bt93s2r-walltrail-action-effect-matrix-v3"
CONTRACT_ID = "bt93s2r-walltrail-action-effect-window-v3"
ACTION_SURFACE_ID = "bt93q-walltrail-semantic-action-v1"

ROOT_CAUSE_CLASSES = [
    "predicate-expression-drift",
    "predicate-function-drift",
    "start-metrics-drift",
    "warmup-seed-drift",
    "minimum-window-fail",
    "negative-control-fail",
    "direction-contract-mismatch",
    "neutral-control-unstable",
    "env-measurement-drift",
]

BLOCKED_NEXT = [
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
    "reward fix from BT93S2R2.1",
    "telemetry fix from BT93S2R2.1",
    "action-surface change from BT93S2R2.1",
]


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
        "matrixId": payload.get("matrixId") if payload else None,
        "contractId": payload.get("contractId") if payload else None,
        "actionSurfaceId": payload.get("actionSurfaceId") if payload else None,
        "decoderHash": payload.get("decoderHash") if payload else None,
        "sampleCounts": payload.get("sampleCounts") if payload else None,
        "expected": dict(expected),
        "actualFields": actual_fields,
        "expectedOk": expected_ok,
    }


def _source_artifacts() -> list[dict[str, Any]]:
    specs: list[tuple[Path, str, Mapping[str, Any]]] = [
        (
            RECHECK_REPORT_PATH,
            "red BT93S2.3-Recheck source",
            {
                "blockId": "BT93S2",
                "phaseId": "93S2.3-Recheck",
                "resultClass": "measurement-invalid",
                "ok": False,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
                "actionSurfaceId": ACTION_SURFACE_ID,
                "sampleCounts.predicateFailureCount": 36,
                "sampleCounts.minimumWindowFailureCount": 8,
            },
        ),
        (
            MATRIX_V3_CONTRACT_PATH,
            "matrix/control-v3 source contract",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.3",
                "resultClass": "matrix-control-v3-contract-green",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
                "actionSurfaceId": ACTION_SURFACE_ID,
            },
        ),
        (
            REENTRY_GATE_REPORT_PATH,
            "BT93S2R empirical reentry gate",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.4",
                "resultClass": "matrix-control-reentry-green",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
                "actionSurfaceId": ACTION_SURFACE_ID,
            },
        ),
        (
            S2R_CLOSURE_REPORT_PATH,
            "BT93S2R closure gate",
            {
                "blockId": "BT93S2R",
                "phaseId": "93S2R.99",
                "resultClass": "matrix-control-reentry-green",
                "ok": True,
                "matrixId": MATRIX_ID,
                "contractId": CONTRACT_ID,
                "actionSurfaceId": ACTION_SURFACE_ID,
            },
        ),
        (
            ACTION_SURFACE_PATH,
            "read-only PPO action-surface decoder source",
            {},
        ),
        (
            SCRIPT_PATH,
            "BT93S2R2.1 taxonomy generator",
            {},
        ),
    ]
    tracked = _tracked_files(path for path, _, _ in specs)
    return [_source_artifact(path, role, tracked, expected) for path, role, expected in specs]


def _primary_root_cause(probe: Mapping[str, Any], scenario_result: Mapping[str, Any]) -> tuple[str | None, str]:
    v2_predicate = probe.get("v2Predicate") if isinstance(probe.get("v2Predicate"), Mapping) else {}
    v3_predicate = probe.get("v3Predicate") if isinstance(probe.get("v3Predicate"), Mapping) else {}
    v2_pass = v2_predicate.get("pass")
    v3_pass = v3_predicate.get("pass")
    v2_expr = v2_predicate.get("expression")
    v3_expr = v3_predicate.get("expression")
    action_name = str(probe.get("actionName", ""))
    success_eval = probe.get("successEvaluation") if isinstance(probe.get("successEvaluation"), Mapping) else {}
    success = success_eval.get("success") is True
    negative_actions = set(scenario_result.get("negativeControlActions") or [])
    positive_actions = set(scenario_result.get("positiveControlActions") or [])
    scenario_id = str(probe.get("scenarioId", ""))

    if v2_expr and v3_expr and v2_expr != v3_expr:
        return "predicate-expression-drift", "v2Predicate.expression and v3Predicate.expression diverge"
    if v2_pass != v3_pass:
        return "predicate-function-drift", "v2Predicate.pass and v3Predicate.pass diverge"
    if v2_pass is False or v3_pass is False:
        return "start-metrics-drift", "predicate expression/function agree, but replay startMetrics do not satisfy the locked predicate"
    if probe.get("warmupTerminalBeforeAction") is True:
        return "warmup-seed-drift", "warmup ended before action measurement"
    if probe.get("completedMinimumWindow") is False:
        return "minimum-window-fail", "probe did not complete the locked minimum measurement window"
    if action_name in negative_actions and success:
        return "negative-control-fail", "negative-control action produced success evidence"
    if scenario_id == "no-danger-control" and scenario_result.get("classResult") == "neutral-control-unstable":
        return "neutral-control-unstable", "neutral control is unstable and cannot produce action-green evidence"
    if success and positive_actions and action_name not in positive_actions:
        return "direction-contract-mismatch", "non-positive or wrong-direction action produced success evidence"
    if action_name in positive_actions and success is False and scenario_result.get("classResult") == "action-effect-weak":
        return "env-measurement-drift", "positive control remains weak in a valid recheck window"
    return None, "not a BT93S2R2.1 taxonomy failure"


def _taxonomy_rows(recheck: Mapping[str, Any]) -> list[dict[str, Any]]:
    scenario_results = recheck.get("scenarioResults") if isinstance(recheck.get("scenarioResults"), Mapping) else {}
    rows: list[dict[str, Any]] = []

    for index, probe in enumerate(recheck.get("probes") or []):
        if not isinstance(probe, Mapping):
            continue
        scenario_id = str(probe.get("scenarioId", ""))
        scenario_result = scenario_results.get(scenario_id)
        if not isinstance(scenario_result, Mapping):
            scenario_result = {}
        root_cause, reason = _primary_root_cause(probe, scenario_result)
        if root_cause is None:
            continue
        v2_predicate = probe.get("v2Predicate") if isinstance(probe.get("v2Predicate"), Mapping) else {}
        v3_predicate = probe.get("v3Predicate") if isinstance(probe.get("v3Predicate"), Mapping) else {}
        success_eval = probe.get("successEvaluation") if isinstance(probe.get("successEvaluation"), Mapping) else {}
        action_name = str(probe.get("actionName", ""))
        negative_actions = set(scenario_result.get("negativeControlActions") or [])
        positive_actions = set(scenario_result.get("positiveControlActions") or [])
        row = {
            "probeIndex": index,
            "scenarioId": scenario_id,
            "seed": probe.get("seed"),
            "actionName": action_name,
            "actionToken": probe.get("actionToken"),
            "primaryRootCauseClass": root_cause,
            "primaryRootCauseReason": reason,
            "predicate": {
                "v2PredicateId": v2_predicate.get("predicateId"),
                "v2Expression": v2_predicate.get("expression"),
                "v2Pass": v2_predicate.get("pass"),
                "v3PredicateId": v3_predicate.get("predicateId"),
                "v3Expression": v3_predicate.get("expression"),
                "v3Pass": v3_predicate.get("pass"),
                "revalidatedBeforeMeasurement": bool(
                    v2_predicate.get("revalidatedBeforeMeasurement") and v3_predicate.get("revalidatedBeforeMeasurement")
                ),
            },
            "minimumWindow": {
                "completed": probe.get("completedMinimumWindow"),
                "observedSteps": probe.get("observedSteps"),
                "minimumCompletedSteps": probe.get("minimumCompletedSteps"),
                "requestedRepeatSteps": probe.get("requestedRepeatSteps"),
            },
            "negativeControl": {
                "isNegativeControlAction": action_name in negative_actions,
                "negativeControlActions": sorted(negative_actions),
                "negativeControlFailed": bool(action_name in negative_actions and success_eval.get("success") is True),
            },
            "directionContract": {
                "isPositiveControlAction": action_name in positive_actions,
                "positiveControlActions": sorted(positive_actions),
                "wrongDirectionSuccess": bool(success_eval.get("success") is True and positive_actions and action_name not in positive_actions),
            },
            "startMetrics": probe.get("startMetrics"),
            "warmup": {
                "warmupAction": probe.get("warmupAction"),
                "warmupSteps": probe.get("warmupSteps"),
                "warmupTerminalBeforeAction": probe.get("warmupTerminalBeforeAction"),
            },
            "successEvaluation": {
                "success": success_eval.get("success"),
                "stateEffectObserved": success_eval.get("stateEffectObserved"),
                "stateEffectSignals": success_eval.get("stateEffectSignals"),
                "commandFlagObserved": success_eval.get("commandFlagObserved"),
                "rewardOnlyRejected": success_eval.get("rewardOnlyRejected"),
                "terminalObserved": success_eval.get("terminalObserved"),
            },
            "scenarioClassResult": scenario_result.get("classResult"),
        }
        rows.append(row)
    return rows


def _counter_dict(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items()))


def _nested_counter(rows: Iterable[Mapping[str, Any]], key_a: str, key_b: str) -> dict[str, dict[str, int]]:
    nested: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        nested[str(row.get(key_a))][str(row.get(key_b))] += 1
    return {key: _counter_dict(value) for key, value in sorted(nested.items())}


def _build_report() -> dict[str, Any]:
    recheck = _read_json(RECHECK_REPORT_PATH)
    rows = _taxonomy_rows(recheck)
    source_artifacts = _source_artifacts()
    root_cause_counts = Counter(str(row["primaryRootCauseClass"]) for row in rows)
    scenario_counts = Counter(str(row["scenarioId"]) for row in rows)
    action_counts = Counter(str(row["actionName"]) for row in rows)
    seed_counts = Counter(str(row["seed"]) for row in rows)
    source_recheck_counts = recheck.get("sampleCounts") if isinstance(recheck.get("sampleCounts"), Mapping) else {}
    sample_counts = {
        "probeCount": source_recheck_counts.get("probeCount"),
        "sourceProbeCount": source_recheck_counts.get("sourceProbeCount"),
        "scenarioCount": source_recheck_counts.get("scenarioCount"),
        "actionCount": source_recheck_counts.get("actionCount"),
        "taxonomyFailureRowCount": len(rows),
        "predicateFailureCount": source_recheck_counts.get("predicateFailureCount"),
        "minimumWindowFailureCount": source_recheck_counts.get("minimumWindowFailureCount"),
        "negativeControlFailureRowCount": root_cause_counts.get("negative-control-fail", 0),
        "directionMismatchRowCount": root_cause_counts.get("direction-contract-mismatch", 0),
        "neutralControlUnstableRowCount": root_cause_counts.get("neutral-control-unstable", 0),
        "envMeasurementDriftRowCount": root_cause_counts.get("env-measurement-drift", 0),
        "newTrainingEpisodes": source_recheck_counts.get("newTrainingEpisodes", 0),
        "holdoutEpisodes": source_recheck_counts.get("holdoutEpisodes", 0),
    }
    payload: dict[str, Any] = {
        "schemaVersion": 1,
        "blockId": BLOCK_ID,
        "phaseId": PHASE_ID,
        "resultClass": RESULT_CLASS,
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": _rel(SCRIPT_PATH),
        "matrixId": recheck.get("matrixId"),
        "contractId": recheck.get("contractId"),
        "actionSurfaceId": recheck.get("actionSurfaceId"),
        "decoderHash": recheck.get("decoderHash"),
        "sourceRecheckResultClass": recheck.get("resultClass"),
        "sourceRecheckOk": recheck.get("ok"),
        "sampleCounts": sample_counts,
        "rootCauseClassesAllowed": ROOT_CAUSE_CLASSES,
        "rootCauseCounts": _counter_dict(root_cause_counts),
        "failureCountsByScenario": _counter_dict(scenario_counts),
        "failureCountsByAction": _counter_dict(action_counts),
        "failureCountsBySeed": _counter_dict(seed_counts),
        "failureCountsByScenarioAndRootCause": _nested_counter(rows, "scenarioId", "primaryRootCauseClass"),
        "failureCountsByActionAndRootCause": _nested_counter(rows, "actionName", "primaryRootCauseClass"),
        "failureRows": rows,
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": all(source["exists"] and source["isFile"] and source["expectedOk"] for source in source_artifacts),
        "sourceFilesVersioned": all(source["tracked"] for source in source_artifacts),
        "allowNext": ["93S2R2.2"],
        "opensNext": [],
        "blocksNext": BLOCKED_NEXT,
        "claimFlags": {
            "phase93S2R2_2Allowed": True,
            "phase93S2_4Allowed": False,
            "bt93tClaimable": False,
            "bt93uClaimable": False,
            "bt93wClaimable": False,
            "bt93oClaimable": False,
            "bt93pClaimable": False,
            "bt94aClaimable": False,
            "candidateRunsAllowed": False,
            "freezeAllowed": False,
            "holdoutAllowed": False,
            "ppoTrainingAllowed": False,
            "actionSurfaceChangeAllowed": False,
            "rewardChangeAllowed": False,
            "telemetryChangeAllowed": False,
            "runtimeChangeAllowed": False,
        },
        "git": {
            "branch": _git_output(["git", "branch", "--show-current"]),
            "head": _git_output(["git", "rev-parse", "HEAD"]),
            "statusShort": _git_lines(["git", "status", "--short"]),
        },
        "commands": {
            "generate": "python python/scripts/bt93s2r2_failure_taxonomy.py --write-report",
            "sourceRecheck": "python python/scripts/bt93s2_existing_action_effect_v3_recheck.py --write-report",
        },
        "guardrails": [
            "No PPO training.",
            "No holdout consumption.",
            "No ActionSurface, reward, telemetry, runtime, strategy, registry, or matchstart change.",
            "No 93S2.4, BT93T/U/W/O/P/94A, candidate, freeze, promote, rollout, PPO-Validate, or BT95 signal.",
        ],
    }
    payload["reportHash"] = _sha256_payload(payload)
    return payload


def _markdown(report: Mapping[str, Any]) -> str:
    sample_counts = report.get("sampleCounts") if isinstance(report.get("sampleCounts"), Mapping) else {}
    root_counts = report.get("rootCauseCounts") if isinstance(report.get("rootCauseCounts"), Mapping) else {}
    scenario_counts = report.get("failureCountsByScenario") if isinstance(report.get("failureCountsByScenario"), Mapping) else {}
    source_artifacts = report.get("sourceArtifacts") if isinstance(report.get("sourceArtifacts"), list) else []
    source_rows = "\n".join(
        f"- `{source.get('path')}`: role=`{source.get('role')}`, resultClass=`{source.get('resultClass')}`, "
        f"ok=`{source.get('ok')}`, sha256=`{source.get('sha256')}`"
        for source in source_artifacts
    )
    root_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in root_counts.items())
    scenario_rows = "\n".join(f"- `{key}`: `{value}`" for key, value in scenario_counts.items())
    return f"""# Fehlerbericht: BT93S2R2 Source-Lock und Failure-Taxonomie

## Aufgabe/Kontext

- Task: `BT93S2R2.1` nach rotem `BT93S2.3-Recheck`
- Ziel: Quellen locken und Recheck-Failures pro Szenario, Seed und Action mit genau einer Primaerklasse klassifizieren.
- Datum: 2026-05-01

## Quellen-Lock

{source_rows}

Git-SHA: `{report.get('git', {}).get('head') if isinstance(report.get('git'), Mapping) else None}`
MatrixId: `{report.get('matrixId')}`
ContractId: `{report.get('contractId')}`
ActionSurfaceId: `{report.get('actionSurfaceId')}`
Decoder-Hash: `{report.get('decoderHash')}`

## Roter Ausgangsbefund

- Source-Result: `resultClass={report.get('sourceRecheckResultClass')}`, `ok={report.get('sourceRecheckOk')}`
- ProbeCount: `{sample_counts.get('probeCount')}`
- Predicate-Fails: `{sample_counts.get('predicateFailureCount')}`
- Minimum-Window-Fails: `{sample_counts.get('minimumWindowFailureCount')}`
- Taxonomy-Failure-Rows: `{sample_counts.get('taxonomyFailureRowCount')}`

## Root-Cause-Verteilung

{root_rows}

## Szenario-Verteilung

{scenario_rows}

## Bewertung

`BT93S2R2.1` ist als Source-Lock/Taxonomie abgeschlossen. Der rote Status bleibt
fachlich blockierend: `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/failure_taxonomy_report.json`
- Command: `python python/scripts/bt93s2r2_failure_taxonomy.py --write-report`

## Naechster Schritt

`93S2R2.2` muss Predicate-Ausdruck, Predicate-Funktion, StartMetrics, Warmup,
Seeds, Session-ID und Minimum-Window gegen echte StartMetrics abgleichen und
nur belegte Matrix-/Control-Reparaturen schreiben.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Fehlerbericht artifacts.")
    args = parser.parse_args()

    report = _build_report()
    if args.write_report:
        _write_json(REPORT_PATH, report)
        _write_text(DOC_PATH, _markdown(report))
    else:
        print(_json_text(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
