"""BT93Y.1 lineage recovery and replacement-policy decision lock.

This phase pins the red BT93R/BT93X.0 start truth and the user-owned
decisions for BT93Y. It does not run training, eval, holdout, candidate,
freeze, runtime, rollout, or PPO-Validate work.
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
BT93Y_ROOT = PPO_ROOT / "bt93y"
REPORT_PATH = BT93Y_ROOT / "lineage_recovery_decision_lock.json"

BT93R_CLOSURE_PATH = PPO_ROOT / "bt93r" / "bt93r_closure_gate_report.json"
BT93X0_PREFLIGHT_PATH = PPO_ROOT / "bt93x" / "early_comparator_preflight_report.json"

REPLACEMENT_POLICY_ID = "bt93x-rcp1-same-matrix-control-suite-no-bt11"

FORBIDDEN_NEXT_ACTIONS = [
    "BT93S claim",
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


def _artifact(path: Path, role: str, tracked: set[str], expected: Mapping[str, Any]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    result_class = payload.get("resultClass") if payload else None
    expected_fields = dict(expected)
    fresh = bool(
        path.is_file()
        and rel_path in tracked
        and all(_get(payload, *key.split(".")) == value for key, value in expected_fields.items())
    )
    return {
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "fresh": fresh,
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": result_class,
        "ok": payload.get("ok") if payload else None,
        "expectedFields": expected_fields,
        "actualFields": {key: _get(payload, *key.split(".")) for key in expected_fields},
    }


def _source_artifacts() -> list[dict[str, Any]]:
    tracked = _tracked_files([BT93R_CLOSURE_PATH, BT93X0_PREFLIGHT_PATH])
    return [
        {
            "sourceKey": "bt93rClosureGate",
            **_artifact(
                BT93R_CLOSURE_PATH,
                "BT93R.99 red closure gate",
                tracked,
                {"resultClass": "model-artifact-missing", "phaseId": "93R.99"},
            ),
        },
        {
            "sourceKey": "bt93x0EarlyComparatorPreflight",
            **_artifact(
                BT93X0_PREFLIGHT_PATH,
                "BT93X.0 read-only early comparator preflight",
                tracked,
                {
                    "preflightField": "dqn-loader-fix-required",
                    "comparisonPolicyDecision": "dqn-anchor-blocked",
                    "phaseId": "93X.0",
                },
            ),
        },
    ]


def _guardrails() -> dict[str, Any]:
    return {
        "trainingStarted": False,
        "newEvalRunStarted": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "bt95HandoffSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "bt93rReentryAllowed": False,
        "bt93sClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
    }


def _claim_flags() -> dict[str, bool]:
    return {
        "bt93rReentryAllowed": False,
        "bt93sClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
    }


def build_report() -> dict[str, Any]:
    bt93r = _read_json(BT93R_CLOSURE_PATH)
    bt93x0 = _read_json(BT93X0_PREFLIGHT_PATH)
    source_artifacts = _source_artifacts()
    source_files_ready = all(item["exists"] and item["isFile"] for item in source_artifacts)
    source_files_versioned = all(item["tracked"] for item in source_artifacts)
    source_files_fresh = all(item["fresh"] for item in source_artifacts)
    phase_coverage = {
        "93Y.1.1": bt93r.get("resultClass") == "model-artifact-missing",
        "93Y.1.2": (
            bt93x0.get("preflightField") == "dqn-loader-fix-required"
            and bt93x0.get("comparisonPolicyDecision") == "dqn-anchor-blocked"
        ),
        "93Y.1.3": True,
        "93Y.1.4": True,
        "93Y.1.5": True,
    }
    ok = source_files_ready and source_files_versioned and source_files_fresh and all(phase_coverage.values())
    result_class = "lineage-recovery-lock-green" if ok else "measurement-invalid"
    guardrails = _guardrails()
    return {
        "schemaVersion": "bt93y-lineage-recovery-decision-lock-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93y_lineage_recovery_decision_lock.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93Y",
        "phaseId": "93Y.1",
        "resultClass": result_class,
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "sourceFilesFresh": source_files_fresh,
        "lineageDecision": {
            "owner": "user",
            "decisionId": "UOD-1",
            "mode": "lineage-recovery-before-any-r-s-o-p",
            "lineageRecoveryBeforeAnyRSOP": True,
            "exactRecoveryAttempted": False,
            "exactRecoveryRequiredBeforeRerun": True,
            "retrainingAllowedIfExactLineageUnavailable": True,
            "newRetrainLineageMustNotBeLabeledAsBt93n": True,
        },
        "replacementPolicy": {
            "owner": "user",
            "decisionId": "UOD-2",
            "decision": "approved",
            "approved": True,
            "policyId": REPLACEMENT_POLICY_ID,
            "replaces": "BT11-same-matrix-DQN-anchor",
            "scope": ["BT93X starttruth", "BT93P starttruth"],
            "forbiddenUse": [
                "candidate",
                "freeze",
                "promote",
                "rollout",
                "DQN sunset",
                "productive handoff",
            ],
            "historicalDqnBotReportsUse": "context-only",
        },
        "forbiddenNextActions": list(FORBIDDEN_NEXT_ACTIONS),
        "allowNext": [
            "93Y.2 exact BT93N lineage inventory and loader-smoke path",
            "93Y.3 narrow retraining lineage only if exact lineage is unavailable under UOD-1",
            "93Y.4 replacement-policy lock report before full BT93X/BT93P starttruth",
        ],
        "opensNext": ["93Y.2"],
        "blocksNext": list(FORBIDDEN_NEXT_ACTIONS),
        "claimFlags": _claim_flags(),
        "guardrails": guardrails,
        "phaseCoverage": phase_coverage,
        "dodCoverage": {
            "DoD.Y1": phase_coverage["93Y.1.1"] and phase_coverage["93Y.1.2"],
            "DoD.Y2": phase_coverage["93Y.1.3"] and phase_coverage["93Y.1.4"],
            "DoD.Y7": all(value is False for value in _claim_flags().values())
            and guardrails["productiveRuntimeChanged"] is False,
        },
        "matrixId": bt93x0.get("matrixId") or bt93r.get("matrixId"),
        "matrixHash": bt93x0.get("matrixHash"),
        "semanticWindow": bt93x0.get("semanticWindow") or bt93r.get("semanticWindow"),
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "steps": 0,
            "missingRates": {},
            "notApplicableReason": "93Y.1 is a decision-lock phase without training or eval samples.",
        },
        "summary": {
            "bt93rSourceResult": bt93r.get("resultClass"),
            "bt93x0PreflightField": bt93x0.get("preflightField"),
            "bt93x0ComparisonPolicyDecision": bt93x0.get("comparisonPolicyDecision"),
            "lineageRecoveryBeforeAnyRSOP": True,
            "replacementPolicyId": REPLACEMENT_POLICY_ID,
            "nextBestAction": "Run 93Y.2 exact lineage inventory; do not start BT93S/O/P/94A.",
        },
        "commands": {
            "write": "python python/scripts/bt93y_lineage_recovery_decision_lock.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", type=Path, default=REPORT_PATH)
    args = parser.parse_args()

    report = build_report()
    output = args.output.resolve()
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "opensNext": report["opensNext"],
                "blockedCount": len(report["blocksNext"]),
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
