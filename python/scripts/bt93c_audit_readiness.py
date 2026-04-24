"""Build the BT93C.0 audit-readiness report and start manifest."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
PLAN_PATH = REPO_ROOT / "docs" / "bot-training" / "Bot_Trainingsplan.md"
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"

FREEZE_CHECK_PATH = PPO_ROOT / "freeze_check.json"
BT93A_HANDOVER_PATH = PPO_ROOT / "bt93a_handover_2env.json"
BT93B_SCAFFOLD_PLAN_PATH = PPO_ROOT / "bt93b_scaffold_plan.json"
BT93B_CONSISTENCY_PATH = PPO_ROOT / "bt93b" / "artifact_consistency_report.json"
START_MANIFEST_PATH = BT93C_ROOT / "start_manifest.json"
AUDIT_REPORT_PATH = BT93C_ROOT / "audit_readiness_report.json"
INTENDED_ARTIFACTS = {
    "data/training/ppo/bt93c/audit_readiness_report.json",
    "data/training/ppo/bt93c/start_manifest.json",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or str(result.returncode)
        raise RuntimeError(f"git {' '.join(args)} failed: {detail}")
    return result.stdout.strip()


def _git_status(paths: list[str]) -> list[dict[str, str]]:
    output = _run_git(["status", "--porcelain=v1", "--untracked-files=all", "--", *paths])
    entries: list[dict[str, str]] = []
    for line in output.splitlines():
        if not line:
            continue
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        entries.append({"status": line[:2], "path": path.replace("\\", "/")})
    return entries


def _extract_block(plan: str, block_id: str) -> str:
    match = re.search(rf"^## Block {re.escape(block_id)}:.*?(?=^## Block |\Z)", plan, re.M | re.S)
    return match.group(0) if match else ""


def _extract_lock_table(plan: str) -> dict[str, dict[str, str]]:
    match = re.search(r"^## Lock-Status\s*\n(?P<table>.*?)(?=^## )", plan, re.M | re.S)
    if not match:
        return {}
    rows: dict[str, dict[str, str]] = {}
    for raw_line in match.group("table").splitlines():
        line = raw_line.strip()
        if not line.startswith("|") or "---" in line or "Block / Stream" in line:
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 5:
            continue
        agent, block, start, status, target = cells
        rows[block] = {
            "agent": agent,
            "startDate": start,
            "status": status,
            "target": target,
        }
    return rows


def _extract_lock_header(block_text: str) -> str:
    match = re.search(r"<!-- LOCK:\s*(.*?)\s*-->", block_text)
    return match.group(1).strip() if match else "missing"


def _completed_numbered_lines_without_evidence(plan: str) -> list[str]:
    missing: list[str] = []
    for line in plan.splitlines():
        if not re.match(r"- \[x\] \d", line):
            continue
        if "(abgeschlossen:" not in line or "evidence:" not in line:
            missing.append(line)
    return missing


def _completed_tmp_only_evidence(plan: str) -> list[str]:
    findings: list[str] = []
    for line in plan.splitlines():
        if not re.match(r"- \[x\] \d", line):
            continue
        if not re.search(r"evidence:.*`tmp/", line):
            continue
        has_versioned_or_durable_result = any(
            marker in line
            for marker in (
                "`data/",
                "`docs/",
                "`output/",
                "commit `",
                "`npm.cmd run",
                "`python",
            )
        )
        if not has_versioned_or_durable_result:
            findings.append(line)
    return findings


def _self_count_gate_lines(plan: str) -> list[str]:
    return [
        line
        for line in plan.splitlines()
        if re.match(r"- \[x\] \d", line) and "completed_phase_items" in line
    ]


def _mojibake_lines(plan: str) -> list[str]:
    markers = ("Ã", "Â", "�", "â€”", "â€", "â€“")
    return [line for line in plan.splitlines() if any(marker in line for marker in markers)]


def _build_start_manifest(
    generated_at: str,
    freeze_check: dict[str, Any],
    bt93a_handover: dict[str, Any],
    bt93b_scaffold_plan: dict[str, Any],
    bt93b_consistency: dict[str, Any],
    head_commit: str,
) -> dict[str, Any]:
    lane = bt93a_handover["measuredLane"]
    scaffold_budget = bt93b_scaffold_plan["scaffoldBudget"]
    seed_pack = bt93b_scaffold_plan["seedPack"]
    return {
        "manifestVersion": "bt93c-start-v1",
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93c_audit_readiness.py",
        "blockId": "BT93C",
        "phaseId": "93C.0.5",
        "claim": "93C-Audit",
        "git": {
            "headCommit": head_commit,
            "freezeSnapshotCommit": freeze_check["snapshot"]["snapshotCommit"],
        },
        "learnerStartSignal": {
            "freezeOk": bool(freeze_check["result"]["freezeOk"]),
            "reAuditRequired": bool(freeze_check["result"]["reAuditRequired"]),
            "status": "go-after-93C.1-and-93C.2",
            "blockedUntil": [
                "93C.1 PPO dependency and clean-env gate",
                "93C.2 SB3-compatible action surface gate",
            ],
            "noGoBefore": [
                "no pilot or baseline before 93C.3 and 93C.4",
                "no 4-env before direct 4-env evidence",
                "no runtime or JS inference integration in BT93C",
            ],
        },
        "dqnChampion": {
            "championBlock": "BT11",
            "referenceBlock": "BT20",
            "source": "docs/bot-training/Bot_Trainingsplan.md BT80C scope and DoD.2",
            "status": "frozen-for-comparison-planning",
            "productionValidationRestblocker": "BT80C 80.9.3 remains open; promotion/rollout stays blocked.",
            "comparisonUse": "Only 93C.6 may run the DQN/PPO pre-comparison on the fixed matrix.",
        },
        "semanticWindow": {
            "modeId": "runtime-near-headless-v1",
            "freezeDate": freeze_check["snapshot"]["freezeDate"],
            "snapshotPath": freeze_check["snapshot"]["snapshotPath"],
            "authorityFiles": [
                entry["path"]
                for entry in freeze_check.get("authorityFiles", [])
            ],
            "adjacentFiles": [
                entry["path"]
                for entry in freeze_check.get("adjacentFiles", [])
            ],
        },
        "matrix": {
            "matrixId": "bt93c-learner-smoke-start-v1",
            "scope": "first real learner smoke only; no baseline and no promotion",
            "envCount": lane["validatedEnvCount"],
            "maxValidatedEnvCount": bt93a_handover["scaffoldContract"]["maxValidatedEnvCount"],
            "fourEnvStatus": "locked-until-direct-4env-evidence",
            "train": {
                "modeId": "runtime-near-headless-v1",
                "maps": ["standard", "maze"],
                "seeds": seed_pack["trainEnvSeeds"],
            },
            "eval": {
                "modeId": "runtime-near-headless-v1",
                "maps": ["standard", "maze"],
                "seeds": seed_pack["evalEnvSeeds"],
            },
            "holdout": {
                "modeId": "runtime-near-headless-v1",
                "maps": ["standard", "maze"],
                "seeds": [950, 951],
                "status": "reserved-for-93C.6; not consumed by learner smoke",
            },
        },
        "budget": {
            "sourceArtifact": _rel(BT93B_SCAFFOLD_PLAN_PATH),
            "measuredStepsPerSecond": lane["stepsPerSecond"],
            "failureRate": lane["failureRate"],
            "targetUpdateWindowSeconds": scaffold_budget["targetUpdateWindowSeconds"],
            "learnerSmokeRolloutStepsTotal": scaffold_budget["selectedRolloutStepsTotal"],
            "nStepsPerEnv": scaffold_budget["selectedNstepsPerEnv"],
            "batchSize": scaffold_budget["selectedBatchSize"],
            "selectionRule": scaffold_budget["selectionRule"],
        },
        "abortRules": [
            "freezeOk=false or reAuditRequired=true",
            "BT93B consistency ok=false",
            "clean env, pip check, import smoke, or mini train smoke fails",
            "action surface cannot be trained by SB3 without sanitizer-only fallback",
            "failureRate > 0.05 or timeoutRatePerRequest > 0",
            "runtime, match-start, AI-Hub, or JS inference surfaces would need changes",
        ],
        "allowedArtifactPaths": [
            "data/training/ppo/bt93c/**",
            "python/configs/**",
            "python/requirements*.txt",
        ],
        "readOnlyRuntimeSurfaces": [
            "src/state/HeadlessMatchKernelRuntime.js",
            "src/core/MatchKernelTrainingAdapter.js",
            "src/entities/ai/training/TrainingTransportFacade.js",
            "src/entities/ai/training/WebSocketTrainerBridge.js",
            "src/entities/ai/ObservationBridgePolicy.js",
            "src/core/RuntimeConfig.js",
            "src/entities/ai/BotPolicyRegistry.js",
            "src/entities/ai/BotPolicyTypes.js",
            "src/entities/ai/inference/LocalDqnInference.js",
            "src/state/training/RewardCalculator.js",
            "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
        ],
        "scaffoldStatus": {
            "bt93bScaffoldOnly": bool(bt93b_consistency["scaffoldOnly"]),
            "promotionAllowed": bool(bt93b_consistency["promotionAllowed"]),
            "bt94aGate": bt93b_consistency["bt94aGate"],
            "checks": bt93b_consistency["checks"],
        },
    }


def build_artifacts() -> tuple[dict[str, Any], dict[str, Any]]:
    generated_at = _now()
    plan = PLAN_PATH.read_text(encoding="utf-8")
    lock_table = _extract_lock_table(plan)
    bt93a_block = _extract_block(plan, "BT93A")
    bt93b_block = _extract_block(plan, "BT93B")
    bt93c_block = _extract_block(plan, "BT93C")
    freeze_check = _load_json(FREEZE_CHECK_PATH)
    bt93a_handover = _load_json(BT93A_HANDOVER_PATH)
    bt93b_scaffold_plan = _load_json(BT93B_SCAFFOLD_PLAN_PATH)
    bt93b_consistency = _load_json(BT93B_CONSISTENCY_PATH)
    head_commit = _run_git(["rev-parse", "HEAD"])
    scoped_status = _git_status([
        "docs/bot-training/Bot_Trainingsplan.md",
        "data/training/ppo",
        "python/scripts",
        "python/configs",
    ])
    untracked_ppo = [
        entry["path"]
        for entry in scoped_status
        if entry["status"] == "??" and entry["path"].startswith("data/training/ppo/")
        and entry["path"] not in INTENDED_ARTIFACTS
    ]

    lock_rows = {key: lock_table.get(key, {}) for key in ("BT93A", "BT93B", "BT93C")}
    lock_headers = {
        "BT93A": _extract_lock_header(bt93a_block),
        "BT93B": _extract_lock_header(bt93b_block),
        "BT93C": _extract_lock_header(bt93c_block),
    }
    lock_consistency = {
        "BT93A": lock_rows["BT93A"].get("status") == "frei" and lock_headers["BT93A"] == "frei",
        "BT93B": lock_rows["BT93B"].get("status") == "frei" and lock_headers["BT93B"] == "frei",
        "BT93C": lock_rows["BT93C"].get("status") == "frei" and lock_headers["BT93C"] == "frei",
    }

    status_consistency = {
        "bt93aClosed": "93A.99.2" in bt93a_block and "- [x] 93A.99.2" in bt93a_block,
        "bt93bClosed": "93B.99.2" in bt93b_block and "- [x] 93B.99.2" in bt93b_block,
        "bt93cAuditClaimPresent": "- [ ] 93C.0.1" in bt93c_block or "- [x] 93C.0.1" in bt93c_block,
        "bt80cValidationRestblockerVisible": "80.9.3" in plan and "roundsRecorded=0" in plan,
    }
    gate_discipline = {
        "missingEvidenceCompletedItems": _completed_numbered_lines_without_evidence(plan),
        "tmpOnlyCompletedEvidence": _completed_tmp_only_evidence(plan),
        "selfCountGateEvidence": _self_count_gate_lines(plan),
        "mojibakeLines": _mojibake_lines(plan),
        "bt93bScaffoldOnly": bool(bt93b_consistency["scaffoldOnly"]),
        "bt93bNoPromotionClaim": bool(bt93b_consistency["checks"]["noPromotionClaim"]),
        "bt93bBt94aGate": bt93b_consistency["bt94aGate"],
    }
    hygiene_ok = (
        all(lock_consistency.values())
        and not untracked_ppo
        and not gate_discipline["missingEvidenceCompletedItems"]
        and not gate_discipline["tmpOnlyCompletedEvidence"]
        and not gate_discipline["selfCountGateEvidence"]
        and not gate_discipline["mojibakeLines"]
    )
    freeze_ok = bool(freeze_check["result"]["freezeOk"]) and not bool(freeze_check["result"]["reAuditRequired"])

    start_manifest = _build_start_manifest(
        generated_at,
        freeze_check,
        bt93a_handover,
        bt93b_scaffold_plan,
        bt93b_consistency,
        head_commit,
    )
    audit_report = {
        "ok": freeze_ok and hygiene_ok and all(status_consistency.values()),
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93c_audit_readiness.py",
        "blockId": "BT93C",
        "phaseId": "93C.0",
        "claim": "93C-Audit",
        "resultClass": "go" if freeze_ok and hygiene_ok and all(status_consistency.values()) else "hold",
        "inputs": {
            "plan": _rel(PLAN_PATH),
            "freezeCheck": _rel(FREEZE_CHECK_PATH),
            "bt93aHandover": _rel(BT93A_HANDOVER_PATH),
            "bt93bScaffoldPlan": _rel(BT93B_SCAFFOLD_PLAN_PATH),
            "bt93bConsistency": _rel(BT93B_CONSISTENCY_PATH),
            "startManifest": _rel(START_MANIFEST_PATH),
        },
        "git": {
            "headCommit": head_commit,
            "scopedStatusBeforeWrite": scoped_status,
        },
        "checks": {
            "freeze": {
                "freezeOk": freeze_check["result"]["freezeOk"],
                "reAuditRequired": freeze_check["result"]["reAuditRequired"],
                "driftCount": freeze_check["summary"]["driftCount"],
                "driftPaths": freeze_check["driftPaths"],
            },
            "statusConsistency": status_consistency,
            "lockConsistency": {
                "rows": lock_rows,
                "headers": lock_headers,
                "matches": lock_consistency,
            },
            "evidenceHygiene": {
                "untrackedPpoArtifactsBeforeWrite": untracked_ppo,
                **gate_discipline,
            },
            "startManifest": {
                "path": _rel(START_MANIFEST_PATH),
                "learnerStartSignal": start_manifest["learnerStartSignal"],
                "dqnChampion": start_manifest["dqnChampion"],
                "matrix": start_manifest["matrix"],
            },
        },
        "nextClaim": "93C-Env",
        "nextPhase": "93C.1",
        "notes": [
            "93C.0 does not start PPO training.",
            "BT93B remains scaffold-only and cannot justify a baseline or BT94A handover.",
            "BT80C 80.9.3 remains a production-like validation restblocker for promotion and rollout.",
        ],
    }
    return audit_report, start_manifest


def main() -> None:
    audit_report, start_manifest = build_artifacts()
    BT93C_ROOT.mkdir(parents=True, exist_ok=True)
    START_MANIFEST_PATH.write_text(f"{json.dumps(start_manifest, indent=2)}\n", encoding="utf-8")
    AUDIT_REPORT_PATH.write_text(f"{json.dumps(audit_report, indent=2)}\n", encoding="utf-8")
    print(json.dumps({
        "ok": audit_report["ok"],
        "resultClass": audit_report["resultClass"],
        "auditReport": _rel(AUDIT_REPORT_PATH),
        "startManifest": _rel(START_MANIFEST_PATH),
        "nextPhase": audit_report["nextPhase"],
    }, indent=2))
    raise SystemExit(0 if audit_report["ok"] else 1)


if __name__ == "__main__":
    main()
