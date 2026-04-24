"""Verify BT93B fresh/resume scaffold artifact consistency."""

from __future__ import annotations

import argparse
import json
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH
from bridge.split_head_action import BT93B_SPLIT_HEAD_ADAPTER_ID

DEFAULT_ARTIFACT_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93b"
DEFAULT_OUTPUT_PATH = DEFAULT_ARTIFACT_ROOT / "artifact_consistency_report.json"
CHECKPOINT_VERSION = "bt93b-scaffold-checkpoint-v1"
PHASE_ID = "93B.3.2"

STABLE_MANIFEST_KEYS = (
    "templateVersion",
    "blockId",
    "profileId",
    "sourceArtifacts",
    "lane",
    "seedPack",
    "rollout",
    "matrix",
    "actionSurface",
    "normalization",
    "actorCriticHeads",
    "scaffoldOnly",
    "promotionAllowed",
    "bt94aGate",
    "entrypoints",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _read_pickle(path: Path) -> Mapping[str, Any]:
    with path.open("rb") as handle:
        payload = pickle.load(handle)
    if not isinstance(payload, Mapping):
        raise RuntimeError(f"pickle payload is not a mapping: {_relative(path)}")
    return payload


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _resolve_repo_artifact(value: Any, *, field_name: str) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(f"missing artifact path: {field_name}")
    candidate = Path(value)
    resolved = candidate.resolve() if candidate.is_absolute() else (REPO_ROOT / candidate).resolve()
    if not _is_relative_to(resolved, REPO_ROOT):
        raise RuntimeError(f"artifact path escapes repo root: {field_name}={value}")
    return resolved


def _relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _expect(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def _expect_equal(left: Any, right: Any, message: str, failures: list[str]) -> None:
    if left != right:
        failures.append(message)


def _load_run(pointer_path: Path, expected_kind: str, failures: list[str]) -> dict[str, Any]:
    pointer = _read_json(pointer_path)
    _expect(pointer.get("ok") is True, f"{expected_kind} pointer is not ok", failures)
    report_path = _resolve_repo_artifact(pointer.get("report"), field_name=f"{expected_kind}.report")
    checkpoint_path = _resolve_repo_artifact(pointer.get("checkpoint"), field_name=f"{expected_kind}.checkpoint")
    run_dir = _resolve_repo_artifact(pointer.get("runDir"), field_name=f"{expected_kind}.runDir")
    report = _read_json(report_path)
    checkpoint = _read_json(checkpoint_path)
    manifest_path = _resolve_repo_artifact(report.get("artifacts", {}).get("runManifest"), field_name=f"{expected_kind}.runManifest")
    events_path = _resolve_repo_artifact(report.get("artifacts", {}).get("events"), field_name=f"{expected_kind}.events")
    manifest = _read_json(manifest_path)
    _expect(report.get("runKind") == expected_kind, f"report runKind drifted for {expected_kind}", failures)
    _expect(manifest.get("runKind") == expected_kind, f"manifest runKind drifted for {expected_kind}", failures)
    _expect(checkpoint.get("runKind") == expected_kind, f"checkpoint runKind drifted for {expected_kind}", failures)
    _expect(run_dir.exists() and run_dir.is_dir(), f"missing run dir for {expected_kind}: {_relative(run_dir)}", failures)
    return {
        "pointer": pointer,
        "pointerPath": pointer_path,
        "report": report,
        "reportPath": report_path,
        "checkpoint": checkpoint,
        "checkpointPath": checkpoint_path,
        "manifest": manifest,
        "manifestPath": manifest_path,
        "eventsPath": events_path,
        "runDir": run_dir,
    }


def _verify_artifact_paths(run: Mapping[str, Any], label: str, failures: list[str]) -> list[str]:
    report = run["report"]
    artifact_paths: list[str] = []
    for key, value in sorted((report.get("artifacts") or {}).items()):
        path = _resolve_repo_artifact(value, field_name=f"{label}.artifacts.{key}")
        exists = path.exists()
        if key == "runDir":
            _expect(exists and path.is_dir(), f"{label} missing artifact directory {key}: {_relative(path)}", failures)
        else:
            _expect(exists and path.is_file(), f"{label} missing artifact file {key}: {_relative(path)}", failures)
        artifact_paths.append(_relative(path))
    return artifact_paths


def _verify_normalization_payload(run: Mapping[str, Any], label: str, failures: list[str]) -> dict[str, Any]:
    report = run["report"]
    checkpoint = run["checkpoint"]
    stats_json_path = _resolve_repo_artifact(checkpoint.get("normalizationStatsJson"), field_name=f"{label}.normalizationStatsJson")
    stats_pickle_path = _resolve_repo_artifact(checkpoint.get("normalizationStats"), field_name=f"{label}.normalizationStats")
    json_payload = _read_json(stats_json_path)
    pickle_payload = _read_pickle(stats_pickle_path)
    json_metadata = json_payload.get("metadata") or {}
    pickle_metadata = pickle_payload.get("metadata") or {}
    json_stats = json_payload.get("stats") or {}
    pickle_stats = pickle_payload.get("stats") or {}
    budget = report.get("budget") or {}
    expected_count = int(report.get("performance", {}).get("totalStepsCompleted") or 0) + int(budget.get("envCount") or 0)

    _expect_equal(_canonical(json_stats), _canonical(pickle_stats), f"{label} json/pickle stats mismatch", failures)
    _expect_equal(json_metadata, pickle_metadata, f"{label} json/pickle metadata mismatch", failures)
    _expect_equal(json_metadata.get("runId"), report.get("runId"), f"{label} normalization runId mismatch", failures)
    _expect_equal(json_metadata.get("runKind"), report.get("runKind"), f"{label} normalization runKind mismatch", failures)
    _expect_equal(json_metadata.get("phaseId"), report.get("phaseId"), f"{label} normalization phaseId mismatch", failures)
    _expect_equal(json_stats.get("normalizationId"), "bt93b-vecnormalize-v1", f"{label} normalization id drifted", failures)
    _expect_equal(json_stats.get("observationLength"), EXPECTED_OBSERVATION_LENGTH, f"{label} observation length drifted", failures)
    _expect_equal(json_stats.get("count"), expected_count, f"{label} normalization count does not match completed steps plus resets", failures)

    return {
        "json": _relative(stats_json_path),
        "pickle": _relative(stats_pickle_path),
        "count": int(json_stats.get("count") or 0),
        "observationLength": int(json_stats.get("observationLength") or 0),
        "jsonPickleMatch": _canonical(json_stats) == _canonical(pickle_stats) and json_metadata == pickle_metadata,
    }


def _verify_events(run: Mapping[str, Any], label: str, failures: list[str]) -> dict[str, Any]:
    report = run["report"]
    events_path = run["eventsPath"]
    lines = [line for line in events_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    events = [json.loads(line) for line in lines]
    _expect(len(events) >= 2, f"{label} event stream is too short", failures)
    first_event = events[0] if events else {}
    last_event = events[-1] if events else {}
    _expect_equal(first_event.get("event"), "run-start", f"{label} event stream does not start with run-start", failures)
    _expect_equal(last_event.get("event"), "run-finish", f"{label} event stream does not finish with run-finish", failures)
    _expect_equal(last_event.get("runId"), report.get("runId"), f"{label} run-finish runId mismatch", failures)
    _expect_equal(last_event.get("ok"), report.get("ok"), f"{label} run-finish ok mismatch", failures)
    _expect_equal(last_event.get("totalSteps"), report.get("performance", {}).get("totalStepsCompleted"), f"{label} run-finish totalSteps mismatch", failures)
    return {
        "path": _relative(events_path),
        "lineCount": len(events),
        "firstEvent": first_event.get("event"),
        "lastEvent": last_event.get("event"),
    }


def _stable_manifest(manifest: Mapping[str, Any]) -> dict[str, Any]:
    return {key: manifest.get(key) for key in STABLE_MANIFEST_KEYS}


def verify_artifacts(artifact_root: Path, output_path: Path) -> dict[str, Any]:
    failures: list[str] = []
    fresh = _load_run(artifact_root / "latest_fresh_smoke.json", "fresh-smoke", failures)
    resume = _load_run(artifact_root / "latest_resume_smoke.json", "resume-smoke", failures)

    fresh_artifacts = _verify_artifact_paths(fresh, "fresh", failures)
    resume_artifacts = _verify_artifact_paths(resume, "resume", failures)
    fresh_norm = _verify_normalization_payload(fresh, "fresh", failures)
    resume_norm = _verify_normalization_payload(resume, "resume", failures)
    fresh_events = _verify_events(fresh, "fresh", failures)
    resume_events = _verify_events(resume, "resume", failures)

    fresh_report = fresh["report"]
    resume_report = resume["report"]
    fresh_checkpoint = fresh["checkpoint"]
    resume_checkpoint = resume["checkpoint"]
    fresh_manifest = fresh["manifest"]
    resume_manifest = resume["manifest"]
    resume_input = resume_report.get("resume", {}).get("input") or {}
    resume_from_checkpoint = resume_checkpoint.get("resumedFrom") or {}

    _expect_equal(fresh_report.get("ok"), True, "fresh report is not ok", failures)
    _expect_equal(resume_report.get("ok"), True, "resume report is not ok", failures)
    _expect_equal(fresh_checkpoint.get("checkpointVersion"), CHECKPOINT_VERSION, "fresh checkpoint version drifted", failures)
    _expect_equal(resume_checkpoint.get("checkpointVersion"), CHECKPOINT_VERSION, "resume checkpoint version drifted", failures)
    _expect_equal(_stable_manifest(fresh_manifest), _stable_manifest(resume_manifest), "fresh/resume stable manifest fields drifted", failures)
    _expect_equal(fresh_report.get("budget"), resume_report.get("budget"), "fresh/resume budget drifted", failures)
    _expect_equal(fresh_manifest.get("actionSurface"), resume_manifest.get("actionSurface"), "fresh/resume action surface drifted", failures)
    _expect_equal(fresh_checkpoint.get("policySurface"), resume_checkpoint.get("policySurface"), "fresh/resume checkpoint policy surface drifted", failures)
    _expect_equal(fresh_checkpoint.get("policySurface", {}).get("adapterId"), BT93B_SPLIT_HEAD_ADAPTER_ID, "checkpoint adapter id drifted", failures)
    _expect_equal(resume_manifest.get("checkpointInput"), _relative(fresh["checkpointPath"]), "resume manifest does not consume fresh checkpoint", failures)
    _expect_equal(resume_input.get("checkpoint"), _relative(fresh["checkpointPath"]), "resume report does not consume fresh checkpoint", failures)
    _expect_equal(resume_from_checkpoint.get("checkpoint"), _relative(fresh["checkpointPath"]), "resume checkpoint does not record fresh checkpoint source", failures)
    _expect_equal(resume_input.get("sourceRunId"), fresh_report.get("runId"), "resume sourceRunId mismatch", failures)
    _expect_equal(resume_input.get("normalizationStatsJson"), _relative(_resolve_repo_artifact(fresh_checkpoint.get("normalizationStatsJson"), field_name="fresh.normalizationStatsJson")), "resume input normalization json source mismatch", failures)
    _expect_equal(resume_input.get("normalizationCount"), fresh_norm["count"], "resume input normalization count mismatch", failures)
    _expect_equal(resume_report.get("scopeGuardrails"), fresh_report.get("scopeGuardrails"), "fresh/resume scope guardrails drifted", failures)

    for label, report in (("fresh", fresh_report), ("resume", resume_report)):
        _expect(report.get("scaffoldOnly") is True, f"{label} report is not scaffold-only", failures)
        _expect(report.get("promotionAllowed") is False, f"{label} report allows promotion", failures)
        _expect_equal(report.get("bt94aGate"), "closed", f"{label} report opened BT94A", failures)
        _expect_equal(report.get("stability", {}).get("failureClasses"), {}, f"{label} failure classes are not empty", failures)
        _expect_equal(report.get("stability", {}).get("timeoutCount"), 0, f"{label} timeout count is not zero", failures)
        _expect_equal(report.get("scopeGuardrails", {}).get("runtimeSurfacesTouched"), [], f"{label} touched runtime surfaces", failures)
        _expect(report.get("scopeGuardrails", {}).get("productiveRuntimeChanged") is False, f"{label} changed productive runtime", failures)

    ok = len(failures) == 0
    report = {
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93b_verify_artifact_consistency.py",
        "blockId": "BT93B",
        "phaseId": PHASE_ID,
        "scaffoldOnly": True,
        "promotionAllowed": False,
        "bt94aGate": "closed",
        "freshRun": {
            "runId": fresh_report.get("runId"),
            "runKind": fresh_report.get("runKind"),
            "phaseId": fresh_report.get("phaseId"),
            "report": _relative(fresh["reportPath"]),
            "checkpoint": _relative(fresh["checkpointPath"]),
            "artifacts": fresh_artifacts,
            "normalization": fresh_norm,
            "events": fresh_events,
        },
        "resumeRun": {
            "runId": resume_report.get("runId"),
            "runKind": resume_report.get("runKind"),
            "phaseId": resume_report.get("phaseId"),
            "report": _relative(resume["reportPath"]),
            "checkpoint": _relative(resume["checkpointPath"]),
            "resumedFrom": resume_input,
            "artifacts": resume_artifacts,
            "normalization": resume_norm,
            "events": resume_events,
        },
        "checks": {
            "stableManifestMatch": _stable_manifest(fresh_manifest) == _stable_manifest(resume_manifest),
            "budgetMatch": fresh_report.get("budget") == resume_report.get("budget"),
            "policySurfaceMatch": fresh_checkpoint.get("policySurface") == resume_checkpoint.get("policySurface"),
            "resumeConsumesFreshCheckpoint": resume_input.get("checkpoint") == _relative(fresh["checkpointPath"]),
            "freshNormalizationJsonPickleMatch": fresh_norm["jsonPickleMatch"],
            "resumeNormalizationJsonPickleMatch": resume_norm["jsonPickleMatch"],
            "eventStreamsClosed": fresh_events["lastEvent"] == "run-finish" and resume_events["lastEvent"] == "run-finish",
            "scopeGuardrailsMatch": fresh_report.get("scopeGuardrails") == resume_report.get("scopeGuardrails"),
            "runtimeSurfacesUntouched": (
                fresh_report.get("scopeGuardrails", {}).get("runtimeSurfacesTouched") == []
                and resume_report.get("scopeGuardrails", {}).get("runtimeSurfacesTouched") == []
            ),
            "noPromotionClaim": (
                fresh_report.get("promotionAllowed") is False
                and resume_report.get("promotionAllowed") is False
                and fresh_report.get("bt94aGate") == "closed"
                and resume_report.get("bt94aGate") == "closed"
            ),
        },
        "failures": failures,
    }
    _write_json(output_path, report)
    _write_json(artifact_root / "latest_artifact_consistency.json", {
        "ok": ok,
        "report": _relative(output_path),
        "freshRunId": fresh_report.get("runId"),
        "resumeRunId": resume_report.get("runId"),
    })
    if not ok:
        raise RuntimeError(f"BT93B artifact consistency failed: {failures}")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-root", default=str(DEFAULT_ARTIFACT_ROOT))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_PATH))
    args = parser.parse_args()

    report = verify_artifacts(Path(args.artifact_root).resolve(), Path(args.output).resolve())
    print(json.dumps({
        "ok": report["ok"],
        "report": _relative(Path(args.output).resolve()),
        "freshRunId": report["freshRun"]["runId"],
        "resumeRunId": report["resumeRun"]["runId"],
        "checks": report["checks"],
    }, indent=2))


if __name__ == "__main__":
    main()
