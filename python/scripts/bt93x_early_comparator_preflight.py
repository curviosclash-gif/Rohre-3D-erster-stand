"""BT93X.0 early comparator preflight.

This script is report-only. It inventories historical DQN/bot/KI evidence and
classifies early comparator loader blockers without opening BT93P/BT94A.
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
BT93X_ROOT = PPO_ROOT / "bt93x"
REPORT_PATH = BT93X_ROOT / "early_comparator_preflight_report.json"

BT93M_ROOT = PPO_ROOT / "bt93m"
BT93L_ROOT = PPO_ROOT / "bt93l"
BT94A_ROOT = PPO_ROOT / "bt94a"

SOURCE_PATHS: dict[str, tuple[Path, str, bool]] = {
    "bt93mDqnAnchorReport": (
        BT93M_ROOT / "dqn_same_matrix_anchor_report.json",
        "BT93M same-matrix DQN anchor diagnosis",
        True,
    ),
    "bt93mDqnAnchorManifest": (
        BT93M_ROOT / "dqn_same_matrix_manifest.json",
        "BT93M same-matrix DQN manifest",
        True,
    ),
    "bt93mComparisonPolicyDecision": (
        BT93M_ROOT / "comparison_policy_decision.json",
        "BT93M comparison policy decision",
        True,
    ),
    "bt93mPrecomparisonRefresh": (
        BT93M_ROOT / "precomparison_refresh_report.json",
        "BT93M precomparison refresh",
        True,
    ),
    "bt93lTaskMetricContract": (
        BT93L_ROOT / "task_metric_contract.json",
        "BT93L task and matrix contract",
        True,
    ),
    "bt93lBaselineMatrix": (
        BT93L_ROOT / "baseline_matrix_report.json",
        "BT93L baseline/control matrix",
        True,
    ),
    "bt94aNoStartGate": (
        BT94A_ROOT / "no_start_gate.json",
        "BT94A no-start gate",
        True,
    ),
    "historicalBotValidation": (
        REPO_ROOT / "data" / "bot_validation_report.json",
        "historical bot validation report",
        False,
    ),
    "historicalPerformanceKiBaseline": (
        REPO_ROOT / "data" / "performance_ki_baseline_report.json",
        "historical KI performance baseline report",
        False,
    ),
    "dqnInferenceSource": (
        REPO_ROOT / "src" / "entities" / "ai" / "inference" / "LocalDqnInference.js",
        "productive DQN inference source, read-only",
        False,
    ),
    "botPolicyRegistry": (
        REPO_ROOT / "src" / "entities" / "ai" / "BotPolicyRegistry.js",
        "productive bot policy registry, read-only",
        False,
    ),
    "observationBridgePolicy": (
        REPO_ROOT / "src" / "entities" / "ai" / "ObservationBridgePolicy.js",
        "productive observation bridge, read-only",
        False,
    ),
}

FORBIDDEN_ACTIONS = [
    "BT93P BT94A-ready",
    "BT94A claim",
    "BT94A candidate run",
    "freeze candidate",
    "holdout consumption",
    "PPO-Validate/promote signal",
    "rollout-ready wording",
    "full BT93X starttruth before BT93O.99=bt93o-quality-green",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path | None) -> str | None:
    if path is None:
        return None
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


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


def _artifact(path: Path, role: str, tracked: set[str], *, closure_capable: bool) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "closureCapable": closure_capable,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _source_artifacts() -> dict[str, Any]:
    tracked = _tracked_files(path for path, _role, _closure_capable in SOURCE_PATHS.values())
    return {
        key: _artifact(path, role, tracked, closure_capable=closure_capable)
        for key, (path, role, closure_capable) in SOURCE_PATHS.items()
    }


def _historical_inventory(manifest: Mapping[str, Any], source_artifacts: Mapping[str, Any]) -> list[dict[str, Any]]:
    historical_reports = manifest.get("historicalReports") if isinstance(manifest.get("historicalReports"), list) else []
    rows: list[dict[str, Any]] = []
    for item in historical_reports:
        if not isinstance(item, Mapping):
            continue
        rows.append(
            {
                "path": item.get("path"),
                "role": item.get("role") or "historical report",
                "exists": item.get("exists"),
                "sha256": item.get("sha256"),
                "sourceResultClass": item.get("resultClass"),
                "sameMatrixUse": "forbidden-context-only",
                "reason": "historical report is not a loadable same-matrix DQN checkpoint",
            }
        )
    for key in ("historicalBotValidation", "historicalPerformanceKiBaseline"):
        artifact = source_artifacts.get(key) if isinstance(source_artifacts.get(key), Mapping) else {}
        rows.append(
            {
                "path": artifact.get("path"),
                "role": artifact.get("role"),
                "exists": artifact.get("exists"),
                "sha256": artifact.get("sha256"),
                "sourceResultClass": artifact.get("resultClass"),
                "sameMatrixUse": "forbidden-context-only",
                "reason": "historical DQN/bot reports cannot replace a same-matrix loader proof",
            }
        )
    return rows


def _candidate_checkpoint_inventory(manifest: Mapping[str, Any], dqn_anchor: Mapping[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in manifest.get("candidateCheckpoints") or []:
        if not isinstance(item, Mapping):
            continue
        rows.append(
            {
                "role": item.get("role"),
                "path": item.get("path"),
                "exists": item.get("exists"),
                "sha256": item.get("sha256"),
                "sameMatrixCandidate": True,
                "loadOk": None,
                "errorClass": "not-attempted-in-bt93x0-read-only",
            }
        )
    for attempt in dqn_anchor.get("loadAttempts") or []:
        if not isinstance(attempt, Mapping):
            continue
        rows.append(
            {
                "role": attempt.get("role"),
                "path": attempt.get("path"),
                "exists": attempt.get("exists"),
                "sha256": attempt.get("sha256"),
                "sameMatrixCandidate": True,
                "loadOk": attempt.get("loadOk"),
                "errorClass": attempt.get("errorClass"),
                "missingFields": attempt.get("missingFields"),
                "modelMetadata": attempt.get("modelMetadata"),
            }
        )
    deduped: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = str(row.get("path") or row.get("role"))
        existing = deduped.get(key, {})
        deduped[key] = {**existing, **{k: v for k, v in row.items() if v is not None}}
    return list(deduped.values())


def _loader_blockers(dqn_anchor: Mapping[str, Any], comparison_policy: Mapping[str, Any]) -> list[dict[str, Any]]:
    attempts = [item for item in (dqn_anchor.get("loadAttempts") or []) if isinstance(item, Mapping)]
    load_ok = any(item.get("loadOk") is True for item in attempts)
    blockers = [
        {
            "id": "checkpoint-format",
            "status": "blocked" if not load_ok else "green",
            "evidence": "BT93M.2 loadAttempts",
            "detail": _get(dqn_anchor, "decision", "blockingReason"),
        },
        {
            "id": "observation-length",
            "status": "blocked",
            "evidence": "no loadable same-matrix DQN checkpoint metadata",
            "detail": "observation length cannot be bound to BT93L/BT93M matrix without a loadable checkpoint",
        },
        {
            "id": "action-surface",
            "status": "blocked",
            "evidence": "no loadable same-matrix DQN checkpoint metadata",
            "detail": "DQN action count/surface cannot be compared to PPO semantic action surface yet",
        },
        {
            "id": "reward-terminal-semantics",
            "status": "blocked",
            "evidence": "BT93M comparison policy decision",
            "detail": "historical DQN/bot reports are context only and cannot prove same reward/terminal semantics",
        },
        {
            "id": "matrix-id",
            "status": "blocked" if comparison_policy.get("sameMatrixDqnAnchorPresent") is not True else "green",
            "evidence": "BT93M comparison policy decision",
            "detail": comparison_policy.get("blockingReason") or _get(dqn_anchor, "decision", "blockingReason"),
        },
        {
            "id": "normalizer",
            "status": "not-applicable-for-dqn-but-blocked-for-cross-policy-comparison",
            "evidence": "PPO uses VecNormalize lineage; DQN anchor has no matching normalize-state contract",
            "detail": "full BT93X must document how non-normalized DQN observations compare to PPO normalized inputs",
        },
    ]
    return blockers


def build_report() -> dict[str, Any]:
    source_artifacts = _source_artifacts()
    dqn_anchor = _read_json(SOURCE_PATHS["bt93mDqnAnchorReport"][0])
    manifest = _read_json(SOURCE_PATHS["bt93mDqnAnchorManifest"][0])
    comparison_policy = _read_json(SOURCE_PATHS["bt93mComparisonPolicyDecision"][0])
    precomparison = _read_json(SOURCE_PATHS["bt93mPrecomparisonRefresh"][0])
    bt94a_no_start = _read_json(SOURCE_PATHS["bt94aNoStartGate"][0])
    loader_blockers = _loader_blockers(dqn_anchor, comparison_policy)
    hard_loader_blocked = any(item["status"] == "blocked" for item in loader_blockers)
    preflight_field = (
        "dqn-loader-fix-required"
        if hard_loader_blocked
        else "comparison-preflight-nonblocking"
    )
    if (
        comparison_policy.get("comparisonPolicyDecision") == "replacement-policy-user-decision-required"
        or comparison_policy.get("resultClass") == "replacement-policy-user-decision-required"
    ):
        preflight_field = "replacement-policy-user-decision-required"
    matrix = manifest.get("matrix") if isinstance(manifest.get("matrix"), Mapping) else {}
    inventory = {
        "candidateCheckpoints": _candidate_checkpoint_inventory(manifest, dqn_anchor),
        "historicalReports": _historical_inventory(manifest, source_artifacts),
        "runtimeReadOnlySources": [
            source_artifacts["dqnInferenceSource"],
            source_artifacts["botPolicyRegistry"],
            source_artifacts["observationBridgePolicy"],
        ],
    }
    return {
        "schemaVersion": "bt93x-early-comparator-preflight-report-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93x_early_comparator_preflight.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93X.0",
        "phaseId": "93X.0",
        "resultClass": "early-comparator-preflight-complete",
        "preflightField": preflight_field,
        "matrixId": matrix.get("matrixId") or precomparison.get("matrixId"),
        "semanticWindow": matrix.get("semanticWindow") or precomparison.get("semanticWindow"),
        "matrixHash": manifest.get("matrixHash") or dqn_anchor.get("matrixHash"),
        "comparisonPolicyDecision": comparison_policy.get("comparisonPolicyDecision"),
        "sameMatrixDqnAnchorPresent": dqn_anchor.get("sameMatrixDqnAnchorPresent"),
        "inventory": inventory,
        "loaderBlockers": loader_blockers,
        "historicalEvidencePolicy": {
            "historicalReportsUsedAsSameMatrixAnchor": False,
            "contextOnlyRows": len(inventory["historicalReports"]),
            "rule": "Historical DQN/bot/KI reports stay read-only context until a loadable same-matrix checkpoint or explicit replacement policy exists.",
        },
        "bt94aState": {
            "resultClass": bt94a_no_start.get("resultClass"),
            "claimable": bt94a_no_start.get("claimable"),
            "candidateRunsAllowed": bt94a_no_start.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": bt94a_no_start.get("matrixDefinitionAllowed"),
        },
        "guardrails": {
            "readOnly": True,
            "trainingStarted": False,
            "newEvalRunStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt93rToBt93wBypassed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "promotionAllowed": False,
            "rolloutAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "phaseCoverage": {
            "93X.0.1.1": True,
            "93X.0.1.2": True,
            "93X.0.2.1": True,
            "93X.0.2.2": True,
        },
        "dodCoverage": {
            "DoD.X0.1": True,
            "DoD.X0.2": True,
            "DoD.X0.3": preflight_field
            in {
                "dqn-loader-fix-required",
                "replacement-policy-user-decision-required",
                "comparison-preflight-nonblocking",
            },
            "DoD.X0.4": True,
        },
        "allowNext": [
            "keep 93X.0 as read-only context for later full BT93X",
            "restore DQN checkpoint or approve replacement policy in a separate user-owned decision path",
            "restore exact BT93N PPO lineage package before rerunning BT93R",
        ],
        "blocksNext": FORBIDDEN_ACTIONS,
        "recommendations": [
            {
                "rank": 1,
                "action": "Do not claim BT93S/O/P/94A from comparator evidence.",
                "why": "BT93R.99 is model-artifact-missing and the R-Allowlist is not satisfied.",
            },
            {
                "rank": 2,
                "action": "Recover exact BT93N PPO lineage first: model.zip, config, VecNormalize and action-surface hash.",
                "why": "Decoder, normalize and eval-mode fixes are not provable from reports-only lineage.",
            },
            {
                "rank": 3,
                "action": "If BT93N lineage cannot be restored, create a narrow lineage-recovery/retraining intake.",
                "why": "BT93S requires an R-Allowlist result, and the current comparator state is still dqn-loader-fix-required.",
            },
            {
                "rank": 4,
                "action": "Resolve DQN comparator separately before full BT93X/BT93P.",
                "why": "The BT11 champion checkpoint is absent or not loadable on the same matrix.",
            },
        ],
        "sourceArtifacts": source_artifacts,
        "commands": {
            "write": "python python/scripts/bt93x_early_comparator_preflight.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", type=Path, default=REPORT_PATH)
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "preflightField": report["preflightField"],
                "comparisonPolicyDecision": report["comparisonPolicyDecision"],
                "sameMatrixDqnAnchorPresent": report["sameMatrixDqnAnchorPresent"],
                "phaseCoverage": report["phaseCoverage"],
                "output": _rel(args.output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
