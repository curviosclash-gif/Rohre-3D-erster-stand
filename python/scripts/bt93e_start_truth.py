"""BT93E start-truth and finding register builder.

This script pins the BT93E.1 state from the current BT93C/BT93D/BT94A
artifacts. It does not train, freeze, promote, or touch runtime surfaces.
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
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93D_ROOT = PPO_ROOT / "bt93d"
BT93E_ROOT = PPO_ROOT / "bt93e"
BT94A_GATE_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"

PRECOMPARISON_PATH = BT93C_ROOT / "precomparison_report.json"
HANDOVER_PATH = BT93C_ROOT / "handover_report.json"
EVIDENCE_MATRIX_PATH = BT93C_ROOT / "evidence_quality_matrix.json"
BASELINE_PATH = BT93C_ROOT / "baseline_report.json"
CLEAN_ENV_PATH = BT93C_ROOT / "clean_env_smoke_report.json"
ACTION_SURFACE_PATH = BT93C_ROOT / "action_surface_smoke.json"
START_GATE_PACKAGE_PATH = BT93D_ROOT / "start_gate_package.json"
REPAIR_MANIFEST_PATH = BT93D_ROOT / "repair_manifest.json"
SURVIVAL_REGRESSION_PATH = BT93D_ROOT / "survival_regression_report.json"
TERMINAL_POLICY_PATH = BT93D_ROOT / "terminal_policy_diagnostics.json"
MINIMUM_STATS_PATH = BT93D_ROOT / "minimum_start_statistics.json"

DEFAULT_REGISTER_PATH = BT93E_ROOT / "finding_register.json"
DEFAULT_START_MATRIX_PATH = BT93E_ROOT / "start_matrix.json"
DEFAULT_CARRY_FORWARD_PATH = BT93E_ROOT / "carry_forward_prerequisites.json"
DEFAULT_FOLLOWUP_PATH = BT93E_ROOT / "followup_gate_report.json"


def _inventory() -> list[dict[str, str]]:
    return [
        _row("G.01", "BT94A gate report is red", "resultClass=claimable and claimable=true", "data/training/ppo/bt94a/no_start_gate.json", "governance", "93E.5"),
        _row("G.02", "candidate run allowance is red", "candidateRunsAllowed=true, usable only in BT94A", "data/training/ppo/bt94a/no_start_gate.json", "governance", "93E.5"),
        _row("G.03", "matrix definition allowance is red", "matrixDefinitionAllowed=true", "data/training/ppo/bt94a/no_start_gate.json", "governance", "93E.5"),
        _row("G.04", "freeze allowance must stay red", "candidateFreezeAllowed=false until 94A.3", "data/training/ppo/bt94a/no_start_gate.json", "governance", "94A.3"),
        _row("G.05", "handover result is diagnose", "handover result is not diagnose or is hard follow-gated", "data/training/ppo/bt93c/handover_report.json", "governance", "93E.5"),
        _row("G.06", "handover gate is closed", "bt94aHandover.ready=true", "data/training/ppo/bt93c/handover_report.json", "governance", "93E.5"),
        _row("G.07", "precomparison is ppo-regression", "precomparison_report.json.resultClass != ppo-regression", "data/training/ppo/bt93c/precomparison_report.json", "ppo-training", "93E.2"),
        _row("G.08", "audit blockers are open", "summary.bt94a-blocker=0", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.5"),
        _row("C.01", "bt93c_result_allows_bt94a is red", "claim check green", "data/training/ppo/bt94a/no_start_gate.json", "governance", "93E.5"),
        _row("C.02", "handover_gate_ready is red", "claim check green", "data/training/ppo/bt94a/no_start_gate.json", "governance", "93E.5"),
        _row("C.03", "precomparison_not_regression is red", "claim check green", "data/training/ppo/bt94a/no_start_gate.json", "ppo-training", "93E.2"),
        _row("C.04", "no_open_bt94a_audit_blockers is red", "claim check green", "data/training/ppo/bt94a/no_start_gate.json", "governance", "93E.5"),
        _row("F.01", "real PPO learner must not regress to scaffold-only", "real model package and optimizer update revalidated", "data/training/ppo/bt93c/handover_report.json", "ppo-training", "93E.5"),
        _row("F.02", "dependency pins and clean env must not be ambient", "lock, pip check, and import smoke remain valid", "data/training/ppo/bt93c/clean_env_smoke_report.json", "ppo-training", "93E.5"),
        _row("F.03", "action surface must be SB3-trainable", "train/eval path uses real action surface", "data/training/ppo/bt93c/action_surface_smoke.json", "ppo-training", "93E.4"),
        _row("F.04", "normalize, optimizer state, and heads must remain real", "load/resume/hash revalidated", "data/training/ppo/bt93c/runs/20260424T180033Z-baseline-train/artifact_manifest.json", "ppo-training", "93E.5"),
        _row("F.05", "Survival-First is not proven; PPO regresses", "PPO survival/steps on same matrix are not regressive or are downgated with evidence", "data/training/ppo/bt93d/survival_regression_report.json", "ppo-training", "93E.2"),
        _row("F.06", "PPO-Validate is missing", "visible BT94B.3 rest debt, no promote bypass", "94B.3", "qa-ops", "BT94B.3"),
        _row("F.07", "direct 4-env evidence is missing", "4-env stays locked or direct evidence exists", "data/training/ppo/bt93c/baseline_report.json", "ppo-training", "94A/94B"),
        _row("F.08", "throughput is not learning proof", "reports label throughput as lane/budget evidence only", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.5"),
        _row("F.09", "freeze signal must be fresh", "freeze/freshness artifact stays valid or is regenerated", "data/training/ppo/freeze_check.json", "governance", "93E.5"),
        _row("F.10", "stale docs and untracked hints", "no stale/untracked start signals", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.5"),
        _row("F.11", "tmp is not closure-capable", "versioned evidence for all start claims", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.5"),
        _row("F.12", "DQN champion, semantic window, and holdout must be fixed", "champion/matrix/holdout unchanged or newly versioned", "data/training/ppo/bt93c/precomparison_report.json", "ppo-training", "93E.5"),
        _row("F.13", "three runs alone are weak", "minimum episodes, spread, median, holdout, non-inferiority fixed", "data/training/ppo/bt93d/minimum_start_statistics.json", "qa-ops", "94B.1/94B.2"),
        _row("F.14", "legacy bot:validate is not PPO-Validate", "PPO-Validate stays its own lane", "94B.3", "qa-ops", "BT94B.3"),
        _row("F.15", "runtime handoff is missing", "stays non-goal until BT95 or separate rollout", "BT95/separate rollout", "architecture", "BT95"),
        _row("F.16", "baseline term is ambiguous", "scaffold, pilot, baseline, and candidate separated", "data/training/ppo/bt93c/baseline_report.json", "governance", "93E.5"),
        _row("F.17", "eval must not be scaffold eval", "eval loads real model package", "data/training/ppo/bt93c/precomparison_report.json", "ppo-training", "93E.5"),
        _row("F.18", "runtime/failure classes must be mapped", "runtimeErrorCount, crash/timeout/forced/teardown visible", "data/training/ppo/bt93d/terminal_policy_diagnostics.json", "qa-ops", "93E.3/94B.3"),
        _row("F.19", "terminal/death diagnostics are insufficient", "natural terminal/death cases and survival distribution are robust", "data/training/ppo/bt93d/terminal_policy_diagnostics.json", "qa-ops", "93E.3"),
        _row("F.20", "sanitizer/mask/veto rates are gate metrics", "rates are reported in train/eval/holdout", "data/training/ppo/bt93c/evidence_quality_matrix.json", "ppo-training", "93E.4"),
        _row("F.21", "risk-register drift", "draft and active plan risks aligned", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.5"),
        _row("F.22", "plan:check is not PPO proof", "governance evidence separated from run evidence", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.99"),
        _row("F.23", "self-count evidence is weak", "concrete artifacts instead of plan grep/self-count", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.5"),
        _row("F.24", "shutdown/teardown failures are not long-run proof", "failure classes continue, not quality proof", "data/training/ppo/bt93d/terminal_policy_diagnostics.json", "qa-ops", "94A/94B"),
        _row("F.25", "ambient venv dependencies", "reproducible stack without local random deps", "data/training/ppo/bt93c/clean_env_smoke_report.json", "ppo-training", "93E.5"),
        _row("F.26", "baseline ambiguity", "exact baseline ID with metric source", "data/training/ppo/bt93c/baseline_report.json", "governance", "93E.5"),
        _row("F.27", "DQN/PPO comparison remains ppo-regression", "regression closed, downgraded, or follow-blocked", "data/training/ppo/bt93d/survival_regression_report.json", "ppo-training", "93E.2"),
        _row("F.28", "internal eval survival is not PPO-Validate", "metric source separated, no validate/promotion claim", "data/training/ppo/bt93c/precomparison_report.json", "qa-ops", "BT94B.3"),
        _row("F.29", "holdout was reserved/used, no post-optimization", "holdout use and non-post-optimization reported", "data/training/ppo/bt93c/precomparison_report.json", "ppo-training", "93E.2"),
        _row("F.30", "policy-level mask missing; clamp/veto hides policy load", "policy-mask and post-decode clamp separated; high load blocks", "data/training/ppo/bt93d/terminal_policy_diagnostics.json", "ppo-training", "93E.4"),
        _row("F.31", "natural terminal matrix is weak", "death/terminal matrix is not empty and not max-steps-only", "data/training/ppo/bt93d/terminal_policy_diagnostics.json", "qa-ops", "93E.3"),
        _row("F.32", "small timesteps/eval steps have weak power", "minimum statistics fixed and met before start", "data/training/ppo/bt93d/minimum_start_statistics.json", "qa-ops", "94A.1/94B.1"),
        _row("F.33", "mutable latest pointer is not freeze evidence", "immutable run IDs, hashes, and manifests", "data/training/ppo/bt93c/handover_report.json", "governance", "93E.5"),
        _row("F.34", "V101 may have created contract drift", "V101 follow-up is no-op or blocker", "data/training/ppo/bt93c/precomparison_report.json", "architecture", "93E.5"),
        _row("F.35", "green governance gate is not PPO proof", "semantic run/validate evidence separated", "data/training/ppo/bt93c/evidence_quality_matrix.json", "governance", "93E.99"),
        _row("F.36", "short smokes are not long-run stability proof", "stability classes continue, no overinterpretation", "data/training/ppo/bt93d/terminal_policy_diagnostics.json", "qa-ops", "94A/94B"),
        _row("F.37", "PPO-Validate build location is missing", "runner/schema/target paths in BT94B.3 hard gate", "94B.3", "qa-ops", "BT94B.3"),
        _row("R.01", "reward rises while survival worsens", "reward/safety/episode-shortening blocker closed or follow-gated", "data/training/ppo/bt93d/terminal_policy_diagnostics.json", "ppo-training", "93E.3"),
    ]


def _row(
    row_id: str,
    finding: str,
    required: str,
    reference: str,
    owner_layer: str,
    next_gate: str,
) -> dict[str, str]:
    return {
        "id": row_id,
        "finding": finding,
        "requiredBeforeBt94a1": required,
        "reference": reference,
        "ownerLayer": owner_layer,
        "nextGate": next_gate,
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


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "path": _rel(path),
        "sha256": _sha256_file(path),
        "role": role,
        "closureCapable": closure_capable,
    }


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _status_from_bool(ok: bool, if_open: str = "still-blocking") -> str:
    return "closed" if ok else if_open


def _start_impact(status: str) -> str:
    if status == "still-blocking":
        return "blocks BT94A.1 until repaired, downgated, or reclassified by versioned evidence"
    if status == "closed":
        return "no current BT94A start blocker while referenced hashes remain valid"
    if status == "invalidated-by-new-evidence":
        return "superseded by newer versioned evidence; old finding is not a start signal"
    return "carried as explicit rest debt; does not open BT94A and cannot be used as promotion evidence"


def _claim_check(gate: Mapping[str, Any], check_id: str) -> Mapping[str, Any]:
    checks = gate.get("claimChecks") if isinstance(gate.get("claimChecks"), list) else []
    for check in checks:
        if isinstance(check, Mapping) and check.get("id") == check_id:
            return check
    return {}


def _matrix_rows(matrix: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    rows = matrix.get("auditRegister") if isinstance(matrix.get("auditRegister"), list) else []
    return {str(row.get("id")): row for row in rows if isinstance(row, Mapping) and row.get("id")}


def _status_from_matrix(row: Mapping[str, Any]) -> str:
    status = row.get("status")
    if status == "closed":
        return "closed"
    if status == "bt94a-blocker":
        return "still-blocking"
    if status == "follow-gated":
        return "not-start-blocking-carried"
    return "not-start-blocking-carried"


def _observed_for(
    row_id: str,
    gate: Mapping[str, Any],
    handover: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    terminal: Mapping[str, Any],
    survival: Mapping[str, Any],
) -> Any:
    summary = matrix.get("summary") if isinstance(matrix.get("summary"), Mapping) else {}
    handover_gate = handover.get("bt94aHandover") if isinstance(handover.get("bt94aHandover"), Mapping) else {}
    if row_id == "G.01":
        return {"resultClass": gate.get("resultClass"), "claimable": gate.get("claimable")}
    if row_id == "G.02":
        return {"candidateRunsAllowed": gate.get("candidateRunsAllowed")}
    if row_id == "G.03":
        return {"matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed")}
    if row_id == "G.04":
        return {"candidateFreezeAllowed": gate.get("candidateFreezeAllowed")}
    if row_id == "G.05":
        return {"handoverResultClass": handover.get("resultClass")}
    if row_id == "G.06":
        return {"bt94aHandoverReady": handover_gate.get("ready"), "gate": handover_gate.get("gate")}
    if row_id == "G.07":
        return {"precomparisonResultClass": precomparison.get("resultClass")}
    if row_id == "G.08":
        return {"bt94aBlockerCount": summary.get("bt94a-blocker")}
    if row_id.startswith("C."):
        return dict(_claim_check(gate, CLAIM_IDS[row_id]))
    if row_id == "R.01":
        return {
            "blocked": "reward-safety-episode-shortening"
            in set(_get(terminal, "bt94aImpact", "blockedFindings") or []),
            "positiveRewardWhileSurvivalRegresses": _get(terminal, "lanes", "eval", "positiveRewardWhileSurvivalRegresses"),
        }
    if row_id in {"F.05", "F.27"}:
        return _get(survival, "comparison", "deltasAgainstDqn")
    if row_id in {"F.19", "F.30", "F.31"}:
        return {
            "findingStatus": _get(terminal, "bt94aImpact", "findingStatus", row_id),
            "blockedFindings": _get(terminal, "bt94aImpact", "blockedFindings"),
        }
    return None


def _status_for(
    item: Mapping[str, str],
    gate: Mapping[str, Any],
    handover: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    terminal: Mapping[str, Any],
) -> str:
    row_id = item["id"]
    summary = matrix.get("summary") if isinstance(matrix.get("summary"), Mapping) else {}
    handover_gate = handover.get("bt94aHandover") if isinstance(handover.get("bt94aHandover"), Mapping) else {}

    if row_id == "G.01":
        return _status_from_bool(gate.get("resultClass") == "claimable" and gate.get("claimable") is True)
    if row_id == "G.02":
        return _status_from_bool(gate.get("candidateRunsAllowed") is True)
    if row_id == "G.03":
        return _status_from_bool(gate.get("matrixDefinitionAllowed") is True)
    if row_id == "G.04":
        return "not-start-blocking-carried" if gate.get("candidateFreezeAllowed") is False else "still-blocking"
    if row_id == "G.05":
        return _status_from_bool(handover.get("resultClass") != "diagnose")
    if row_id == "G.06":
        return _status_from_bool(bool(handover_gate.get("ready")))
    if row_id == "G.07":
        return _status_from_bool(precomparison.get("resultClass") != "ppo-regression")
    if row_id == "G.08":
        return _status_from_bool(int(summary.get("bt94a-blocker") or 0) == 0)
    if row_id.startswith("C."):
        return _status_from_bool(bool(_claim_check(gate, CLAIM_IDS[row_id]).get("ok")))
    if row_id == "R.01":
        blocked = "reward-safety-episode-shortening" in set(_get(terminal, "bt94aImpact", "blockedFindings") or [])
        return "still-blocking" if blocked else "closed"

    matrix_row = _matrix_rows(matrix).get(row_id, {})
    return _status_from_matrix(matrix_row)


CLAIM_IDS = {
    "C.01": "bt93c_result_allows_bt94a",
    "C.02": "handover_gate_ready",
    "C.03": "precomparison_not_regression",
    "C.04": "no_open_bt94a_audit_blockers",
}


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    gate = _read_json(BT94A_GATE_PATH)
    handover = _read_json(HANDOVER_PATH)
    precomparison = _read_json(PRECOMPARISON_PATH)
    matrix = _read_json(EVIDENCE_MATRIX_PATH)
    baseline = _read_json(BASELINE_PATH)
    clean_env = _read_json(CLEAN_ENV_PATH)
    action_surface = _read_json(ACTION_SURFACE_PATH)
    start_gate_package = _read_json(START_GATE_PACKAGE_PATH)
    repair_manifest = _read_json(REPAIR_MANIFEST_PATH)
    survival = _read_json(SURVIVAL_REGRESSION_PATH)
    terminal = _read_json(TERMINAL_POLICY_PATH)
    minimum_stats = _read_json(MINIMUM_STATS_PATH)
    matrix_rows = _matrix_rows(matrix)

    entries = []
    for item in _inventory():
        row_id = item["id"]
        matrix_row = matrix_rows.get(row_id, {})
        status = _status_for(item, gate, handover, precomparison, matrix, terminal)
        reference = str(matrix_row.get("bt93dSourceArtifact") or matrix_row.get("source") or item["reference"])
        evidence = str(
            matrix_row.get("evidence")
            or _get(start_gate_package, "diagnoseBlocked", "trackedFindings", row_id)
            or item["finding"]
        )
        entries.append(
            {
                **item,
                "status": status,
                "startImpact": _start_impact(status),
                "referenceArtifact": reference,
                "evidence": evidence,
                "observed": _observed_for(row_id, gate, handover, precomparison, matrix, terminal, survival),
            }
        )

    counts: dict[str, int] = {}
    for entry in entries:
        counts[entry["status"]] = counts.get(entry["status"], 0) + 1

    red_checks = [
        check
        for check in gate.get("claimChecks", [])
        if isinstance(check, Mapping) and not check.get("ok")
    ]
    bt94a_blocker_count = int(_get(matrix, "summary", "bt94a-blocker") or 0)

    finding_register = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_start_truth.py",
        "blockId": "BT93E",
        "phaseId": "93E.1.1",
        "gitSha": _git_sha(),
        "resultClass": "start-truth-pinned",
        "statusVocabulary": [
            "closed",
            "not-start-blocking-carried",
            "still-blocking",
            "invalidated-by-new-evidence",
        ],
        "summary": {
            **counts,
            "total": len(entries),
            "bt94aBlockerCount": bt94a_blocker_count,
            "redClaimChecks": len(red_checks),
        },
        "entries": entries,
        "sourceArtifacts": _source_artifacts(),
        "guardrails": _guardrails(repair_manifest),
    }

    start_matrix = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_start_truth.py",
        "blockId": "BT93E",
        "phaseId": "93E.1.2",
        "gitSha": _git_sha(),
        "resultClass": "blocked-no-start" if red_checks else "claimable",
        "claimable": gate.get("claimable"),
        "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
        "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
        "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
        "bt94aBlockerCount": bt94a_blocker_count,
        "redClaimChecks": red_checks,
        "claimChecks": gate.get("claimChecks"),
        "pinnedValues": {
            "handoverResultClass": handover.get("resultClass"),
            "bt94aHandoverReady": _get(handover, "bt94aHandover", "ready"),
            "bt94aHandoverGate": _get(handover, "bt94aHandover", "gate"),
            "precomparisonResultClass": precomparison.get("resultClass"),
            "summary.bt94a-blocker": bt94a_blocker_count,
            "trackedFindings": _get(start_gate_package, "diagnoseBlocked", "trackedFindings"),
        },
        "sourceGate": _source(BT94A_GATE_PATH, "BT94A gate report refreshed during 93E.1.2"),
        "noStartDecision": gate.get("noStartDecision"),
        "guardrails": _guardrails(repair_manifest),
    }

    carry_forward = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_start_truth.py",
        "blockId": "BT93E",
        "phaseId": "93E.1.3",
        "gitSha": _git_sha(),
        "resultClass": "carry-forward-pinned",
        "summary": {
            "allRequiredStartValuesGreen": all(
                row.get("ok") for row in repair_manifest.get("mandatoryStartValues", [])
                if row.get("id") not in {"candidate_freeze_allowed", "four_env", "ppo_validate", "rollout_boundary"}
            ),
            "blockedPrerequisites": [
                row.get("id")
                for row in repair_manifest.get("mandatoryStartValues", [])
                if row.get("status") == "blocked"
            ],
            "freshnessOk": {
                "baseline": _get(repair_manifest, "freshness", "ppoBaseline", "ok"),
                "dqnChampion": _get(repair_manifest, "freshness", "dqnChampion", "ok"),
                "semanticWindow": _get(repair_manifest, "freshness", "semanticWindow", "ok"),
                "dependencyLock": _get(repair_manifest, "freshness", "dependencyLock", "ok"),
                "modelPackage": _get(repair_manifest, "freshness", "modelPackage", "ok"),
                "v101": _get(repair_manifest, "freshness", "v101", "ok"),
            },
        },
        "carryForwardPrerequisites": {
            "baseline": _get(repair_manifest, "freshness", "ppoBaseline"),
            "dqnChampion": _get(repair_manifest, "freshness", "dqnChampion"),
            "holdout": {
                "holdoutEvalRunId": _get(repair_manifest, "freshness", "ppoBaseline", "holdoutEvalRunId"),
                "noPostOptimization": True,
                "source": "data/training/ppo/bt93c/precomparison_report.json",
            },
            "semanticWindow": _get(repair_manifest, "freshness", "semanticWindow"),
            "dependencyLock": _get(repair_manifest, "freshness", "dependencyLock"),
            "modelPackage": _get(repair_manifest, "freshness", "modelPackage"),
            "evidenceQuality": {
                "summary": matrix.get("summary"),
                "bt94aStoppers": matrix.get("bt94aStoppers"),
                "tmpOnlyEvidenceExcluded": True,
                "mutableLatestExcluded": True,
            },
            "fourEnv": {
                "allowed": False,
                "reason": "direct 4-env evidence is still absent and remains outside BT93E.1 start truth",
            },
            "ppoValidateRestDebt": {
                "status": _get(precomparison, "evidenceInterpretation", "ppoValidateStatus"),
                "nextGate": "BT94B.3",
                "mayPromote": False,
            },
            "rolloutBoundary": {
                "productiveRuntimeChanged": _get(handover, "guardrails", "productiveRuntimeChanged"),
                "runtimeSurfacesTouched": _get(handover, "guardrails", "runtimeSurfacesTouched"),
                "rolloutSignal": _get(handover, "guardrails", "isRolloutSignal"),
                "nextGate": "BT95/separate rollout",
            },
            "actionSurface": {
                "source": _rel(ACTION_SURFACE_PATH),
                "ok": action_surface.get("ok"),
                "resultClass": action_surface.get("resultClass"),
            },
            "minimumStatistics": minimum_stats,
            "cleanEnv": {
                "source": _rel(CLEAN_ENV_PATH),
                "ok": clean_env.get("ok"),
                "requirementsSha256": clean_env.get("requirementsSha256"),
            },
            "baselineReport": {
                "source": _rel(BASELINE_PATH),
                "resultClass": baseline.get("resultClass"),
            },
        },
        "sourceArtifacts": _source_artifacts(),
        "guardrails": _guardrails(repair_manifest),
    }

    followup = _build_followup(entries, repair_manifest)
    return finding_register, start_matrix, carry_forward, followup


def _source_artifacts() -> dict[str, Any]:
    return {
        "bt94aGate": _source(BT94A_GATE_PATH, "BT94A gate check"),
        "precomparisonReport": _source(PRECOMPARISON_PATH, "BT93C/BT93D precomparison"),
        "handoverReport": _source(HANDOVER_PATH, "BT93C/BT93D handover"),
        "evidenceQualityMatrix": _source(EVIDENCE_MATRIX_PATH, "BT93C/BT93D evidence matrix"),
        "bt93dStartGatePackage": _source(START_GATE_PACKAGE_PATH, "BT93D start gate package"),
        "bt93dRepairManifest": _source(REPAIR_MANIFEST_PATH, "BT93D repair manifest"),
        "bt93dSurvivalRegression": _source(SURVIVAL_REGRESSION_PATH, "BT93D survival regression"),
        "bt93dTerminalPolicyDiagnostics": _source(TERMINAL_POLICY_PATH, "BT93D terminal and policy diagnostics"),
        "bt93dMinimumStatistics": _source(MINIMUM_STATS_PATH, "BT93D minimum statistics"),
        "bt93cBaselineReport": _source(BASELINE_PATH, "BT93C baseline report"),
        "bt93cCleanEnv": _source(CLEAN_ENV_PATH, "BT93C clean-env smoke"),
        "bt93cActionSurface": _source(ACTION_SURFACE_PATH, "BT93C action-surface smoke"),
    }


def _guardrails(repair_manifest: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
        "candidateRun": False,
        "freezeCandidate": False,
        "promotionAllowed": False,
        "rolloutSignal": False,
        "allowedSidecarPaths": repair_manifest.get("allowedSidecarPaths"),
        "forbiddenWork": repair_manifest.get("forbiddenWork"),
        "readOnlyRuntimeSurfaces": repair_manifest.get("readOnlyRuntimeSurfaces"),
    }


def _build_followup(
    entries: list[Mapping[str, Any]],
    repair_manifest: Mapping[str, Any],
) -> dict[str, Any]:
    nonrepairable = [
        entry
        for entry in entries
        if entry["status"] == "not-start-blocking-carried"
        and entry["nextGate"] not in {"93E.2", "93E.3", "93E.4", "93E.5", "93E.99"}
    ]
    repair_scope = [
        entry
        for entry in entries
        if entry["status"] == "still-blocking"
        and entry["nextGate"] in {"93E.2", "93E.3", "93E.4", "93E.5"}
    ]
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_start_truth.py",
        "blockId": "BT93E",
        "phaseId": "93E.1.4",
        "gitSha": _git_sha(),
        "resultClass": "followup-gates-pinned",
        "openBt93eRepairScope": [
            {
                "id": entry["id"],
                "status": entry["status"],
                "blocker": entry["finding"],
                "reproduction": f"inspect {entry['referenceArtifact']} and rerun the mapped BT93E repair phase {entry['nextGate']}",
                "affectedArtifacts": [entry["referenceArtifact"]],
                "nextGate": entry["nextGate"],
                "forbiddenWorkaround": "do not mark BT94A claimable from plan text, tmp output, latest pointers, or promotion wording",
            }
            for entry in repair_scope
        ],
        "carriedOutsideBt93e": [
            {
                "id": entry["id"],
                "status": entry["status"],
                "blocker": entry["finding"],
                "reproduction": f"inspect {entry['referenceArtifact']} and keep next gate {entry['nextGate']} explicit",
                "affectedArtifacts": [entry["referenceArtifact"]],
                "nextGate": entry["nextGate"],
                "forbiddenWorkaround": "do not use this carried debt as BT94A, promotion, PPO-Validate, or rollout evidence",
            }
            for entry in nonrepairable
        ],
        "guardrails": _guardrails(repair_manifest),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93E.1 start truth artifacts.")
    parser.add_argument("--write-reports", action="store_true", help="Write BT93E JSON artifacts.")
    parser.add_argument("--register-output", default=str(DEFAULT_REGISTER_PATH))
    parser.add_argument("--start-matrix-output", default=str(DEFAULT_START_MATRIX_PATH))
    parser.add_argument("--carry-forward-output", default=str(DEFAULT_CARRY_FORWARD_PATH))
    parser.add_argument("--followup-output", default=str(DEFAULT_FOLLOWUP_PATH))
    args = parser.parse_args()

    register, start_matrix, carry_forward, followup = build_reports()
    if args.write_reports:
        _write_json(Path(args.register_output).resolve(), register)
        _write_json(Path(args.start_matrix_output).resolve(), start_matrix)
        _write_json(Path(args.carry_forward_output).resolve(), carry_forward)
        _write_json(Path(args.followup_output).resolve(), followup)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": register["resultClass"],
                "summary": register["summary"],
                "wrote": {
                    "findingRegister": _rel(Path(args.register_output).resolve()) if args.write_reports else None,
                    "startMatrix": _rel(Path(args.start_matrix_output).resolve()) if args.write_reports else None,
                    "carryForward": _rel(Path(args.carry_forward_output).resolve()) if args.write_reports else None,
                    "followupGateReport": _rel(Path(args.followup_output).resolve()) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
