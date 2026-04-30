"""BT94A claim gate check.

This script records whether BT94A may start from the current refreshed gate
source. It does not run candidate training and does not create a freeze
candidate.
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
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93P_HANDOVER_SOURCE = PPO_ROOT / "bt93p" / "handover_package.json"
BT93X_HANDOVER_SOURCE = PPO_ROOT / "bt93x" / "handover_package.json"
BT93O_HANDOVER_SOURCE = PPO_ROOT / "bt93o" / "handover_package.json"
BT93W_HANDOVER_SOURCE = PPO_ROOT / "bt93w" / "handover_package.json"
BT93Q_HANDOVER_SOURCE = PPO_ROOT / "bt93q" / "handover_package.json"
HISTORICAL_FALLBACK_SOURCES = [
    ("BT93M", PPO_ROOT / "bt93m" / "handover_package.json"),
    ("BT93M", PPO_ROOT / "bt93m" / "start_truth.json"),
    ("BT93L", PPO_ROOT / "bt93l" / "handover_package.json"),
    ("BT93I", PPO_ROOT / "bt93i" / "matrix_green_report.json"),
]
SOURCE_ORDER = {
    "BT93C": 93.0,
    "BT93D": 93.1,
    "BT93E": 93.2,
    "BT93F": 93.3,
    "BT93G": 93.4,
    "BT93H": 93.5,
    "BT93I": 93.6,
    "BT93J": 93.7,
    "BT93K": 93.8,
    "BT93L": 93.9,
    "BT93M": 94.0,
    "BT93N": 94.1,
    "BT93Q": 94.2,
    "BT93W": 94.3,
    "BT93O": 94.4,
    "BT93X": 94.5,
    "BT93P": 94.6,
}


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


def _read_json_or_empty(path: Path) -> dict[str, Any]:
    try:
        payload = _read_json(path)
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


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


def _optional_source(path: Path) -> dict[str, str] | None:
    return _source(path) if path.is_file() else None


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
    candidates = [
        (
            "BT93P",
            BT93P_HANDOVER_SOURCE,
            "BT93P.4 is the highest-priority BT94A gate source after the R-X repair chain.",
        ),
        (
            "BT93X",
            BT93X_HANDOVER_SOURCE,
            "BT93X.99 supersedes BT93O/W/Q for BT93P starttruth and BT94A no-start freshness.",
        ),
        (
            "BT93O",
            BT93O_HANDOVER_SOURCE,
            "BT93O.99 supersedes BT93W/Q once action/objective quality is classified.",
        ),
        (
            "BT93W",
            BT93W_HANDOVER_SOURCE,
            "BT93W.99 supersedes BT93Q once BT93O preconditions are classified.",
        ),
        (
            "BT93Q",
            BT93Q_HANDOVER_SOURCE,
            "BT93Q.99 is the current R-X baseline source until BT93W/O/X/P handovers exist.",
        ),
    ]
    for block_id, path, reason in candidates:
        if path.exists():
            return {
                "blockId": block_id,
                "reason": reason,
                "sourceArtifact": _rel(path),
            }
    for block_id, path in HISTORICAL_FALLBACK_SOURCES:
        if path.exists():
            return {
                "blockId": block_id,
                "reason": (
                    "Historical fallback source found, but no R-X handover source exists. "
                    "This cannot open BT94A and should be superseded by BT93Q/W/O/X/P."
                ),
                "sourceArtifact": _rel(path),
            }
    return {
        "blockId": None,
        "reason": "No repair-source artifact detected.",
        "sourceArtifact": None,
    }


def _payload_claim_field(
    payload: Mapping[str, Any],
    bt94a: Mapping[str, Any],
    decision: Mapping[str, Any],
    no_start_state: Mapping[str, Any],
    key: str,
    decision_key: str | None = None,
) -> Any:
    if key in bt94a:
        return bt94a.get(key)
    if key in no_start_state:
        return no_start_state.get(key)
    if key in payload:
        return payload.get(key)
    if decision_key and decision_key in decision:
        return decision.get(decision_key)
    return decision.get(key)


def _payload_bt94a_reason(
    payload: Mapping[str, Any],
    bt94a: Mapping[str, Any],
    decision: Mapping[str, Any],
) -> Any:
    summary = payload.get("summary") if isinstance(payload.get("summary"), Mapping) else {}
    return (
        bt94a.get("reason")
        or decision.get("blockingReason")
        or decision.get("reason")
        or summary.get("bt94aReason")
        or summary.get("bt93oStartReason")
        or summary.get("recommendedNext")
    )


def _payload_bt94a_ready(payload: Mapping[str, Any], bt94a: Mapping[str, Any], claimable: Any) -> Any:
    if "ready" in bt94a:
        return bt94a.get("ready")
    if "bt94aReady" in payload:
        return payload.get("bt94aReady")
    if claimable is not None:
        return bool(claimable)
    return None


def _source_rank(block_id: Any) -> float:
    return SOURCE_ORDER.get(str(block_id), 0.0)


def _repo_path(value: Any) -> Path | None:
    if not value:
        return None
    path = Path(str(value))
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _source_payload_summary(source: Mapping[str, Any]) -> dict[str, Any]:
    source_path = _repo_path(source.get("sourceArtifact"))
    payload = _read_json_or_empty(source_path) if source_path else {}
    bt94a = payload.get("bt94aHandover") if isinstance(payload.get("bt94aHandover"), Mapping) else {}
    decision = payload.get("decision") if isinstance(payload.get("decision"), Mapping) else {}
    no_start_state = payload.get("bt94aNoStartState") if isinstance(payload.get("bt94aNoStartState"), Mapping) else {}
    claimable = _payload_claim_field(payload, bt94a, decision, no_start_state, "claimable", "bt94aClaimAllowed")
    if claimable is None:
        claimable = _payload_claim_field(payload, bt94a, decision, no_start_state, "bt94aClaimAllowed")
    candidate_runs = _payload_claim_field(payload, bt94a, decision, no_start_state, "candidateRunsAllowed")
    matrix_definition = _payload_claim_field(payload, bt94a, decision, no_start_state, "matrixDefinitionAllowed")
    candidate_freeze = _payload_claim_field(payload, bt94a, decision, no_start_state, "candidateFreezeAllowed")
    return {
        "path": _rel(source_path) if source_path else None,
        "sha256": _sha256_file(source_path) if source_path and source_path.is_file() else None,
        "generatedBy": payload.get("generatedBy"),
        "blockId": payload.get("blockId") or source.get("blockId"),
        "phaseId": payload.get("phaseId") or source.get("phaseId"),
        "resultClass": payload.get("resultClass"),
        "bt94aReady": _payload_bt94a_ready(payload, bt94a, claimable),
        "bt94aClaimAllowed": claimable,
        "candidateRunsAllowed": candidate_runs,
        "matrixDefinitionAllowed": matrix_definition,
        "candidateFreezeAllowed": candidate_freeze,
        "bt94aGate": bt94a.get("gate") or payload.get("bt94aGate"),
        "bt94aReason": _payload_bt94a_reason(payload, bt94a, decision),
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
    detected_source = _detect_handover_source(handover, precomparison, evidence_matrix)
    expected_source = _expected_handover_source()
    expected_is_newer = _source_rank(expected_source.get("blockId")) > _source_rank(detected_source.get("blockId"))
    current_source = (
        {
            "blockId": expected_source.get("blockId"),
            "phaseId": _source_payload_summary(expected_source).get("phaseId"),
            "sourceArtifact": expected_source.get("sourceArtifact"),
            "generatedBy": _source_payload_summary(expected_source).get("generatedBy"),
            "fallbackUsed": False,
            "supersedesDetectedSource": detected_source,
        }
        if expected_is_newer and expected_source.get("blockId")
        else detected_source
    )
    current_source_summary = _source_payload_summary(current_source)
    latest_source_ok = not expected_source["blockId"] or current_source.get("blockId") == expected_source["blockId"]
    current_source_allows_start = bool(
        current_source_summary.get("resultClass") == "BT94A-ready"
        and current_source_summary.get("bt94aReady") is True
        and current_source_summary.get("bt94aClaimAllowed") is True
    )
    no_start_reason = current_source_summary.get("bt94aReason") or handover_gate.get("reason")

    checks = [
        {
            "id": "current_handover_source_is_latest",
            "ok": latest_source_ok,
            "observed": current_source.get("blockId"),
            "required": expected_source["blockId"] or "no newer source",
            "blocksStart": not latest_source_ok,
        },
        {
            "id": "current_handover_source_allows_bt94a",
            "ok": current_source_allows_start,
            "observed": {
                "blockId": current_source_summary.get("blockId"),
                "resultClass": current_source_summary.get("resultClass"),
                "bt94aReady": current_source_summary.get("bt94aReady"),
                "bt94aClaimAllowed": current_source_summary.get("bt94aClaimAllowed"),
                "candidateRunsAllowed": current_source_summary.get("candidateRunsAllowed"),
                "matrixDefinitionAllowed": current_source_summary.get("matrixDefinitionAllowed"),
            },
            "required": "fresh source resultClass=BT94A-ready with bt94aHandover.ready=true and claimable=true",
            "blocksStart": not current_source_allows_start,
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
            "detectedBt93cInputSource": detected_source,
            "sourceState": current_source_summary,
        },
        "sourceArtifacts": {
            "handoverReport": _source(handover_path),
            "precomparisonReport": _source(precomparison_path),
            "evidenceQualityMatrix": _source(matrix_path),
            "currentHandoverSource": _optional_source(_repo_path(current_source.get("sourceArtifact"))) if current_source.get("sourceArtifact") else None,
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
            "latestSourceState": current_source_summary,
            "staleInputSource": detected_source if expected_is_newer else None,
        },
        "claimChecks": checks,
        "noStartDecision": {
            "status": "BT94A remains closed before 94A.1" if blocks_start else "BT94A may be claimed",
            "reason": no_start_reason,
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
