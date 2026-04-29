"""BT93M.2 DQN same-matrix anchor diagnosis.

This script is report-only. It does not run PPO, consume holdout data, create
candidate/freeze artifacts, or modify productive runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93M_ROOT = PPO_ROOT / "bt93m"
CONFIG_PATH = REPO_ROOT / "python" / "configs" / "ppo_bt93m_dqn_same_matrix.json"
REPORT_PATH = BT93M_ROOT / "dqn_same_matrix_anchor_report.json"
MANIFEST_PATH = BT93M_ROOT / "dqn_same_matrix_manifest.json"

TASK_CONTRACT_PATH = PPO_ROOT / "bt93l" / "task_metric_contract.json"
BASELINE_MATRIX_PATH = PPO_ROOT / "bt93l" / "baseline_matrix_report.json"
START_TRUTH_PATH = BT93M_ROOT / "start_truth.json"

SUPPORTED_CHECKPOINT_VERSIONS = {
    "v36-dqn-checkpoint-v2",
    "v35-dqn-checkpoint-v1",
    "v34-dqn-checkpoint-v1",
}


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


def _sha256_bytes(payload: bytes) -> str:
    return sha256(payload).hexdigest()


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _hash_json(payload: Any) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return _sha256_bytes(canonical)


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
        "closureCapable": closure_capable,
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _shape(value: Any) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        return {"type": type(value).__name__}
    return {
        "type": "object",
        "keys": sorted(str(key) for key in value.keys()),
        "contractVersion": value.get("contractVersion"),
        "checkpointKeys": (
            sorted(str(key) for key in value.get("checkpoint", {}).keys())
            if isinstance(value.get("checkpoint"), Mapping)
            else None
        ),
        "onlineKeys": (
            sorted(str(key) for key in value.get("online", {}).keys())
            if isinstance(value.get("online"), Mapping)
            else None
        ),
        "targetKeys": (
            sorted(str(key) for key in value.get("target", {}).keys())
            if isinstance(value.get("target"), Mapping)
            else None
        ),
    }


def _extract_checkpoint(raw: Mapping[str, Any]) -> Mapping[str, Any] | None:
    checkpoint = raw.get("checkpoint")
    if isinstance(checkpoint, Mapping):
        return checkpoint
    if raw.get("contractVersion") in SUPPORTED_CHECKPOINT_VERSIONS:
        return raw
    return None


def _network_state_ok(network_state: Any) -> bool:
    if not isinstance(network_state, Mapping):
        return False
    layers = network_state.get("layers")
    if isinstance(layers, list) and layers:
        for layer in layers:
            if not isinstance(layer, Mapping):
                return False
            weights = layer.get("weights")
            bias = layer.get("bias")
            if not isinstance(weights, list) or not isinstance(bias, list):
                return False
            input_size = int(layer.get("inputSize") or 0)
            output_size = int(layer.get("outputSize") or 0)
            if input_size <= 0 or output_size <= 0:
                return False
            if len(weights) != input_size * output_size or len(bias) != output_size:
                return False
        return True
    return (
        isinstance(network_state.get("weightsInputHidden"), list)
        and isinstance(network_state.get("weightsHiddenOutput"), list)
        and isinstance(network_state.get("biasHidden"), list)
        and isinstance(network_state.get("biasOutput"), list)
    )


def _validate_checkpoint(path: Path, role: str) -> dict[str, Any]:
    if not path.exists():
        return {
            "role": role,
            "path": _rel(path),
            "exists": False,
            "loadAttempted": False,
            "loadOk": False,
            "errorClass": "artifact-not-found",
            "expectedSignature": "DQN checkpoint JSON with contractVersion plus online/target network states",
            "actualStructure": None,
            "missingFields": ["file"],
        }
    raw = _read_json(path)
    checkpoint = _extract_checkpoint(raw)
    if checkpoint is None:
        return {
            "role": role,
            "path": _rel(path),
            "exists": True,
            "sha256": _sha256_file(path),
            "loadAttempted": True,
            "loadOk": False,
            "errorClass": "checkpoint-missing",
            "expectedSignature": "top-level DQN checkpoint or envelope.checkpoint",
            "actualStructure": _shape(raw),
            "missingFields": ["checkpoint"],
        }
    missing_fields: list[str] = []
    if checkpoint.get("contractVersion") not in SUPPORTED_CHECKPOINT_VERSIONS:
        missing_fields.append("supported contractVersion")
    if not isinstance(checkpoint.get("online"), Mapping):
        missing_fields.append("online")
    if not isinstance(checkpoint.get("target"), Mapping):
        missing_fields.append("target")
    if isinstance(checkpoint.get("online"), Mapping) and not _network_state_ok(checkpoint.get("online")):
        missing_fields.append("online network weights")
    if isinstance(checkpoint.get("target"), Mapping) and not _network_state_ok(checkpoint.get("target")):
        missing_fields.append("target network weights")
    load_ok = not missing_fields
    online = checkpoint.get("online") if isinstance(checkpoint.get("online"), Mapping) else {}
    return {
        "role": role,
        "path": _rel(path),
        "exists": True,
        "sha256": _sha256_file(path),
        "loadAttempted": True,
        "loadOk": load_ok,
        "errorClass": None if load_ok else "checkpoint-network-state-missing",
        "expectedSignature": {
            "contractVersion": sorted(SUPPORTED_CHECKPOINT_VERSIONS),
            "requiredFields": ["online", "target"],
            "networkFormat": "layers[] or v34 flat weights/bias fields",
        },
        "actualStructure": _shape(checkpoint),
        "missingFields": missing_fields,
        "modelMetadata": {
            "contractVersion": checkpoint.get("contractVersion"),
            "observationLength": checkpoint.get("observationLength") or _get(online, "layers", 0, "inputSize") or online.get("inputSize"),
            "actionCount": checkpoint.get("actionCount") or online.get("outputSize"),
            "envSteps": checkpoint.get("envSteps"),
            "optimizerSteps": checkpoint.get("optimizerSteps"),
        },
    }


def _matrix_from_contract(task_contract: Mapping[str, Any]) -> dict[str, Any]:
    matrix = task_contract.get("matrix") if isinstance(task_contract.get("matrix"), Mapping) else {}
    mode = matrix.get("mode") if isinstance(matrix.get("mode"), Mapping) else {}
    maps = matrix.get("maps") if isinstance(matrix.get("maps"), Mapping) else {}
    seeds = matrix.get("seeds") if isinstance(matrix.get("seeds"), Mapping) else {}
    episode = matrix.get("episode") if isinstance(matrix.get("episode"), Mapping) else {}
    micro = matrix.get("microPpo") if isinstance(matrix.get("microPpo"), Mapping) else {}
    return {
        "matrixId": matrix.get("matrixId"),
        "semanticWindow": matrix.get("semanticWindow"),
        "modeId": mode.get("modeId"),
        "domainModes": mode.get("domainModes") or [],
        "modePath": mode.get("modePath"),
        "gameMode": mode.get("gameMode"),
        "planarMode": mode.get("planarMode"),
        "primaryMap": maps.get("primary"),
        "maxStepsPerEpisode": episode.get("maxStepsPerEpisode"),
        "controlSeeds": seeds.get("controlSeeds") or [],
        "diagnosticEvalSeeds": seeds.get("diagnosticEvalSeeds") or [],
        "diagnosticTrainSeeds": seeds.get("diagnosticTrainSeeds") or [],
        "holdoutSeeds": seeds.get("holdoutSeeds") or [],
        "holdoutStatus": seeds.get("holdoutStatus"),
        "microPpoEnvCount": micro.get("envCount"),
        "microPpoFirstProbeTimesteps": micro.get("firstProbeTimesteps"),
    }


def _config_candidate_paths(config: Mapping[str, Any]) -> list[tuple[str, Path]]:
    expected = config.get("expectedChampion") if isinstance(config.get("expectedChampion"), Mapping) else {}
    paths: list[tuple[str, Path]] = []
    if expected.get("checkpointPath"):
        paths.append(("expected-bt11-champion-checkpoint", REPO_ROOT / str(expected["checkpointPath"])))
    for raw_path in config.get("fallbackInspection") or []:
        path = REPO_ROOT / str(raw_path)
        if "checkpoint" in path.name.lower():
            paths.append(("fallback-inspection-checkpoint", path))
    return paths


def build_manifest() -> dict[str, Any]:
    config = _read_json(CONFIG_PATH)
    task_contract = _read_json(TASK_CONTRACT_PATH)
    baseline_matrix = _read_json(BASELINE_MATRIX_PATH)
    matrix = _matrix_from_contract(task_contract)
    expected = config.get("expectedChampion") if isinstance(config.get("expectedChampion"), Mapping) else {}
    fallback_paths = [REPO_ROOT / str(path) for path in (config.get("fallbackInspection") or [])]
    return {
        "schemaVersion": "bt93m-dqn-same-matrix-manifest-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_dqn_same_matrix_anchor.py",
        "blockId": "BT93M",
        "phaseId": "93M.2",
        "configPath": _rel(CONFIG_PATH),
        "configSha256": _sha256_file(CONFIG_PATH),
        "matrix": matrix,
        "matrixHash": _hash_json(matrix),
        "expectedChampion": expected,
        "expectedCheckpointSignature": config.get("expectedCheckpointSignature"),
        "sameMatrixRequirements": config.get("sameMatrixRequirements"),
        "candidateCheckpoints": [
            {
                "role": role,
                "path": _rel(path),
                "exists": path.exists(),
                "sha256": _sha256_file(path),
            }
            for role, path in _config_candidate_paths(config)
        ],
        "historicalReports": [
            _source(path, "context-only historical report", closure_capable=False)
            for path in fallback_paths
            if path.suffix == ".json" and "checkpoint" not in path.name.lower()
        ],
        "historicalReportPolicy": config.get("historicalReportPolicy"),
        "sourceArtifacts": {
            "taskMetricContract": _source(TASK_CONTRACT_PATH, "BT93L task metric contract"),
            "baselineMatrixReport": _source(BASELINE_MATRIX_PATH, "BT93L baseline matrix"),
            "startTruth": _source(START_TRUTH_PATH, "BT93M.1 start truth"),
        },
        "baselineMatrixDqnAnchor": baseline_matrix.get("dqnAnchor") if isinstance(baseline_matrix.get("dqnAnchor"), Mapping) else {},
    }


def build_report() -> dict[str, Any]:
    manifest = build_manifest()
    config = _read_json(CONFIG_PATH)
    load_attempts = [
        _validate_checkpoint(path, role)
        for role, path in _config_candidate_paths(config)
    ]
    load_ok_attempts = [attempt for attempt in load_attempts if attempt.get("loadOk") is True]
    same_matrix_anchor_present = bool(load_ok_attempts)
    decision = "same-matrix-dqn-ready" if same_matrix_anchor_present else "dqn-anchor-blocked"
    blocking_reason = None
    if not same_matrix_anchor_present:
        blocking_reason = (
            "No loadable DQN checkpoint exists for the BT93L/BT93M matrix: the documented BT11 "
            "champion checkpoint path is absent and the only versioned checkpoint-like fallback lacks "
            "online/target network state."
        )
    return {
        "schemaVersion": "bt93m-dqn-same-matrix-anchor-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93m_dqn_same_matrix_anchor.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "ok": True,
        "blockId": "BT93M",
        "phaseId": "93M.2",
        "resultClass": "same-matrix-dqn-ready" if same_matrix_anchor_present else "dqn-anchor-blocked",
        "sameMatrixDqnAnchorPresent": same_matrix_anchor_present,
        "comparisonPolicyDecision": decision,
        "decision": {
            "status": decision,
            "blocksPositiveReentry": not same_matrix_anchor_present,
            "blockingReason": blocking_reason,
            "nextRepairOptions": [
                {
                    "id": "restore-bt11-checkpoint-artifact",
                    "type": "loader-fix-block",
                    "requiredEvidence": [
                        "versioned checkpoint at data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json",
                        "contractVersion plus online/target network states",
                        "same BT93L matrix manifest hash",
                    ],
                },
                {
                    "id": "approve-replacement-comparison-policy",
                    "type": "explicit-user-decision",
                    "requiredEvidence": [
                        "new policy id",
                        "why DQN anchor is impossible or intentionally replaced",
                        "effect on BT93P and BT94A gates",
                    ],
                },
                {
                    "id": "stop-as-dqn-anchor-blocked",
                    "type": "hard-stop",
                    "requiredEvidence": [
                        "this report",
                        "comparison_policy_decision.json in BT93M.3",
                    ],
                },
            ],
        },
        "loadAttempts": load_attempts,
        "modelHash": load_ok_attempts[0].get("sha256") if load_ok_attempts else None,
        "configHash": manifest.get("configSha256"),
        "matrixHash": manifest.get("matrixHash"),
        "matrix": manifest.get("matrix"),
        "manifestPath": _rel(MANIFEST_PATH),
        "manifestHash": _hash_json(manifest),
        "historicalReportHandling": {
            "data/bot_validation_report.json": "context-only, not same-matrix DQN anchor",
            "data/performance_ki_baseline_report.json": "context-only, not same-matrix DQN anchor",
        },
        "phaseCoverage": {
            "93M.2.1": True,
            "93M.2.2": manifest.get("matrix", {}).get("matrixId") == "bt93l-reachability-diagnostic-matrix-v1",
            "93M.2.3": bool(manifest.get("matrixHash") and manifest.get("configSha256")),
            "93M.2.4": True,
            "93M.2.5": all(
                attempt.get("loadOk") is True
                or (
                    attempt.get("path")
                    and attempt.get("expectedSignature")
                    and attempt.get("actualStructure") is not None
                    and attempt.get("missingFields")
                )
                or attempt.get("errorClass") == "artifact-not-found"
                for attempt in load_attempts
            ),
            "93M.2.6": decision in {
                "same-matrix-dqn-ready",
                "dqn-loader-fix-required",
                "replacement-policy-user-decision-required",
                "dqn-anchor-blocked",
            },
            "93M.2.7": not same_matrix_anchor_present,
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "historicalReportsUsedAsAnchor": False,
        },
        "nextAllowedActions": [
            "BT93M.3 comparator/no-start refresh with comparisonPolicyDecision=dqn-anchor-blocked",
            "document BT93N/O as diagnose-only unless user approves a replacement policy or restores a loadable DQN anchor",
        ],
        "blockedActions": [
            "BT93P BT94A-ready",
            "BT94A candidate run",
            "freeze candidate",
            "promotion",
            "rollout-ready wording",
        ],
        "sourceArtifacts": manifest.get("sourceArtifacts"),
    }


def main() -> int:
    global BT93M_ROOT, REPORT_PATH, MANIFEST_PATH

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output-root", type=Path, default=BT93M_ROOT)
    args = parser.parse_args()

    BT93M_ROOT = args.output_root.resolve()
    REPORT_PATH = BT93M_ROOT / "dqn_same_matrix_anchor_report.json"
    MANIFEST_PATH = BT93M_ROOT / "dqn_same_matrix_manifest.json"

    manifest = build_manifest()
    report = build_report()
    if args.write_report:
        _write_json(MANIFEST_PATH, manifest)
        report["manifestHash"] = _sha256_file(MANIFEST_PATH)
        _write_json(REPORT_PATH, report)

    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "sameMatrixDqnAnchorPresent": report["sameMatrixDqnAnchorPresent"],
                "comparisonPolicyDecision": report["comparisonPolicyDecision"],
                "phaseCoverage": report["phaseCoverage"],
                "outputs": {
                    "report": _rel(REPORT_PATH),
                    "manifest": _rel(MANIFEST_PATH),
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
