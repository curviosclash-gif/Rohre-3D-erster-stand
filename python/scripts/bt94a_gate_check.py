"""BT94A claim gate check.

This script records whether BT94A may start from the current refreshed BT93C
handover inputs. It does not run candidate training and does not create a
freeze candidate.
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
DEFAULT_BT93C_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
DEFAULT_OUTPUT = REPO_ROOT / "data" / "training" / "ppo" / "bt94a" / "no_start_gate.json"
BT93I_CURRENT_SOURCE = REPO_ROOT / "data" / "training" / "ppo" / "bt93i" / "matrix_green_report.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


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


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _source(path: Path) -> dict[str, str]:
    return {
        "path": _rel(path),
        "sha256": _sha256_file(path),
    }


def _summary_value(summary: Mapping[str, Any], key: str) -> int:
    value = summary.get(key, 0)
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _blocked_findings(matrix: Mapping[str, Any]) -> list[dict[str, Any]]:
    rows = matrix.get("auditRegister")
    if not isinstance(rows, list):
        return []
    return [
        {
            "id": str(row.get("id")),
            "gate": row.get("gate"),
            "evidence": row.get("evidence"),
        }
        for row in rows
        if isinstance(row, Mapping) and row.get("status") == "bt94a-blocker"
    ]


def _detect_handover_source(
    handover: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    evidence_matrix: Mapping[str, Any],
) -> dict[str, Any]:
    explicit = handover.get("currentHandoverSource")
    if isinstance(explicit, Mapping):
        return {
            "blockId": explicit.get("blockId"),
            "phaseId": explicit.get("phaseId") or handover.get("phaseId"),
            "sourceArtifact": explicit.get("sourceArtifact"),
            "generatedBy": handover.get("generatedBy"),
            "fallbackUsed": bool(explicit.get("fallbackUsed")),
        }

    sources = [
        ("BT93I", "bt93iRefresh"),
        ("BT93H", "bt93hRefresh"),
        ("BT93G", "bt93gRefresh"),
        ("BT93F", "bt93fRefresh"),
        ("BT93E", "bt93eRefresh"),
        ("BT93D", "bt93dRefresh"),
    ]
    generated_by = str(handover.get("generatedBy") or precomparison.get("generatedBy") or evidence_matrix.get("generatedBy") or "")
    for block_id, field in sources:
        if field in handover or field in precomparison or field in evidence_matrix or block_id.lower() in generated_by:
            return {
                "blockId": block_id,
                "phaseId": handover.get("phaseId") or precomparison.get("phaseId"),
                "sourceArtifact": None,
                "generatedBy": handover.get("generatedBy"),
                "fallbackUsed": False,
            }
    return {
        "blockId": "BT93C",
        "phaseId": handover.get("phaseId") or precomparison.get("phaseId"),
        "sourceArtifact": None,
        "generatedBy": handover.get("generatedBy"),
        "fallbackUsed": True,
    }


def _expected_handover_source() -> dict[str, Any]:
    if BT93I_CURRENT_SOURCE.exists():
        return {
            "blockId": "BT93I",
            "reason": "BT93I matrix_green_report.json exists and is the latest handover source.",
            "sourceArtifact": _rel(BT93I_CURRENT_SOURCE),
        }
    return {
        "blockId": None,
        "reason": "No newer repair-source artifact detected.",
        "sourceArtifact": None,
    }


def build_gate_report(bt93c_root: Path) -> dict[str, Any]:
    handover_path = bt93c_root / "handover_report.json"
    precomparison_path = bt93c_root / "precomparison_report.json"
    matrix_path = bt93c_root / "evidence_quality_matrix.json"

    handover = _read_json(handover_path)
    precomparison = _read_json(precomparison_path)
    evidence_matrix = _read_json(matrix_path)

    handover_gate = handover.get("bt94aHandover") if isinstance(handover.get("bt94aHandover"), Mapping) else {}
    summary = evidence_matrix.get("summary") if isinstance(evidence_matrix.get("summary"), Mapping) else {}
    bt94a_blocker_count = _summary_value(summary, "bt94a-blocker")
    blocked_findings = _blocked_findings(evidence_matrix)
    current_source = _detect_handover_source(handover, precomparison, evidence_matrix)
    expected_source = _expected_handover_source()
    latest_source_ok = not expected_source["blockId"] or current_source.get("blockId") == expected_source["blockId"]

    checks = [
        {
            "id": "current_handover_source_is_latest",
            "ok": latest_source_ok,
            "observed": current_source.get("blockId"),
            "required": expected_source["blockId"] or "no newer source",
            "blocksStart": not latest_source_ok,
        },
        {
            "id": "bt93c_result_allows_bt94a",
            "ok": handover.get("resultClass") != "diagnose",
            "observed": handover.get("resultClass"),
            "required": "not diagnose",
            "blocksStart": handover.get("resultClass") == "diagnose",
        },
        {
            "id": "handover_gate_ready",
            "ok": bool(handover_gate.get("ready")),
            "observed": handover_gate.get("gate"),
            "required": "ready=true",
            "blocksStart": not bool(handover_gate.get("ready")),
        },
        {
            "id": "precomparison_not_regression",
            "ok": precomparison.get("resultClass") != "ppo-regression",
            "observed": precomparison.get("resultClass"),
            "required": "not ppo-regression",
            "blocksStart": precomparison.get("resultClass") == "ppo-regression",
        },
        {
            "id": "no_open_bt94a_audit_blockers",
            "ok": bt94a_blocker_count == 0,
            "observed": bt94a_blocker_count,
            "required": 0,
            "blocksStart": bt94a_blocker_count > 0,
        },
    ]
    blocks_start = any(bool(check["blocksStart"]) for check in checks)

    comparison_matrix = precomparison.get("comparisonMatrix")
    if not isinstance(comparison_matrix, Mapping):
        comparison_matrix = {}
    ppo_candidate = precomparison.get("ppoCandidate")
    if not isinstance(ppo_candidate, Mapping):
        ppo_candidate = {}
    model_package = handover.get("modelPackage")
    if not isinstance(model_package, Mapping):
        model_package = {}

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt94a_gate_check.py",
        "gitSha": _git_sha(),
        "blockId": "BT94A",
        "phaseId": "94A.1",
        "resultClass": "blocked-no-start" if blocks_start else "claimable",
        "claimable": not blocks_start,
        "candidateRunsAllowed": not blocks_start,
        "matrixDefinitionAllowed": not blocks_start,
        "candidateFreezeAllowed": False,
        "currentHandoverSource": {
            **current_source,
            "expected": expected_source,
            "fresh": latest_source_ok,
        },
        "sourceArtifacts": {
            "handoverReport": _source(handover_path),
            "precomparisonReport": _source(precomparison_path),
            "evidenceQualityMatrix": _source(matrix_path),
        },
        "bt93cState": {
            "handoverResultClass": handover.get("resultClass"),
            "handoverGate": handover_gate.get("gate"),
            "handoverReady": handover_gate.get("ready"),
            "precomparisonResultClass": precomparison.get("resultClass"),
            "modelPackage": {
                "artifactManifest": model_package.get("artifactManifest"),
                "runId": model_package.get("runId"),
                "modelSha256": model_package.get("modelSha256"),
                "vecnormalizeSha256": model_package.get("vecnormalizeSha256"),
                "optimizerStateSha256": model_package.get("optimizerStateSha256"),
                "configSha256": model_package.get("configSha256"),
                "truePpoModelPackage": model_package.get("truePpoModelPackage"),
                "scaffoldOnly": model_package.get("scaffoldOnly"),
            },
            "matrixId": comparison_matrix.get("matrixId"),
            "semanticWindow": comparison_matrix.get("modeId"),
            "baselineId": ppo_candidate.get("baselineId"),
            "remainingBt94aGates": (handover.get("remainingGates") or {}).get("bt94a"),
            "bt94aBlockerCount": bt94a_blocker_count,
            "bt94aBlockers": blocked_findings,
        },
        "claimChecks": checks,
        "noStartDecision": {
            "status": "BT94A remains closed before 94A.1" if blocks_start else "BT94A may be claimed",
            "reason": handover_gate.get("reason"),
            "allowedWork": [
                "record gate status",
                "carry blockers into plan/evidence",
            ]
            if blocks_start
            else [
                "define ablation matrix",
                "run at most two candidate runs per claim",
            ],
            "forbiddenWork": [
                "candidate training runs",
                "freeze candidate creation",
                "BT94B handover",
                "promotion or rollout signal",
            ]
            if blocks_start
            else [
                "promotion or rollout signal",
            ],
        },
        "nextGate": {
            "requiredBefore94A1": [
                "BT93C handover result must not be diagnose",
                "PPO must not be classified as ppo-regression against the DQN anchor",
                (
                    "Open BT94A audit blockers must be closed or explicitly downgraded with evidence: "
                    + (", ".join(str(row.get("id")) for row in blocked_findings) or "none")
                ),
            ],
            "fallback": "user-owned replan or return to PPO diagnosis before candidate ablations",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT94A claim gate status from BT93C handover evidence.")
    parser.add_argument("--bt93c-root", default=str(DEFAULT_BT93C_ROOT), help="BT93C evidence directory.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Gate report output path.")
    parser.add_argument("--write-report", action="store_true", help="Write the report JSON.")
    args = parser.parse_args()

    report = build_gate_report(Path(args.bt93c_root).resolve())
    if args.write_report:
        _write_json(Path(args.output).resolve(), report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
