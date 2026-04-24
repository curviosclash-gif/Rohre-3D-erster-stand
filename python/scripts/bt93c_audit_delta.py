"""Build the BT93C.1 audit-delta and baseline-source evidence."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
PLAN_PATH = REPO_ROOT / "docs" / "bot-training" / "Bot_Trainingsplan.md"
ROADMAP_PATH = REPO_ROOT / "docs" / "bot-training" / "Bot_Trainings_Roadmap.md"
PPO_README_PATH = REPO_ROOT / "data" / "training" / "ppo" / "README.md"
BT90_RISK_PATH = REPO_ROOT / "docs" / "plaene" / "neu" / "BT90_GoldStandard" / "offene_risiken.md"
BT93C_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
AUDIT_READINESS_PATH = BT93C_ROOT / "audit_readiness_report.json"
START_MANIFEST_PATH = BT93C_ROOT / "start_manifest.json"
BT93B_CONSISTENCY_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt93b" / "artifact_consistency_report.json"
BOT_VALIDATE_REPORT_PATH = REPO_ROOT / "data" / "bot_validation_report.json"
BT11_VALIDATE_DOC_PATH = REPO_ROOT / "docs" / "tests" / "Testergebnisse_Phase4b_2026-03-24.md"
AUDIT_DELTA_PATH = BT93C_ROOT / "audit_delta_report.json"
BASELINE_SOURCE_PATH = BT93C_ROOT / "baseline_source_manifest.json"

CURRENT_CLAIM_OUTPUTS = {
    "data/training/ppo/bt93c/audit_delta_report.json",
    "data/training/ppo/bt93c/baseline_source_manifest.json",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


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
        path = line[3:] if len(line) > 3 and line[2] == " " else line[2:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        entries.append({"status": line[:2], "path": path.replace("\\", "/")})
    return entries


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


def _risk_rows(text: str) -> dict[str, str]:
    rows: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line.startswith("| S"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if cells:
            rows[cells[0]] = line
    return rows


def _versioned(path: Path) -> bool:
    return _run_git(["ls-files", "--", _rel(path)]) == _rel(path)


def build_artifacts() -> tuple[dict[str, Any], dict[str, Any]]:
    generated_at = _now()
    plan = _read(PLAN_PATH)
    readme = _read(PPO_README_PATH)
    risks = _read(BT90_RISK_PATH)
    roadmap = _read(ROADMAP_PATH)
    readiness = _load_json(AUDIT_READINESS_PATH)
    start_manifest = _load_json(START_MANIFEST_PATH)
    bt93b_consistency = _load_json(BT93B_CONSISTENCY_PATH)
    bot_validate_report = _load_json(BOT_VALIDATE_REPORT_PATH)

    scoped_status = _git_status([
        "data/training/ppo",
        "docs/bot-training/Bot_Trainingsplan.md",
        "docs/plaene/neu/BT90_GoldStandard",
        "python/scripts",
    ])
    untracked_ppo = [
        entry["path"]
        for entry in scoped_status
        if entry["status"] == "??"
        and entry["path"].startswith("data/training/ppo/")
        and entry["path"] not in CURRENT_CLAIM_OUTPUTS
    ]

    stale_readme_markers = [
        marker
        for marker in (
            "untracked gefuehrt",
            "noch nicht repo-versioniert",
            "laut Git-Status noch nicht repo-versioniert",
        )
        if marker in readme
    ]
    tmp_only_evidence = _completed_tmp_only_evidence(plan)
    self_count_evidence = _self_count_gate_lines(plan)
    risk_rows = _risk_rows(risks)
    required_risk_links = {
        "S001": "F.02",
        "S008": "F.08",
        "S009": "F.12",
        "S010": "F.20",
        "S011": "F.06",
        "S012": "F.15",
        "S013": "F.15",
        "S014": "D.05",
    }
    risk_mapping = {
        risk_id: {
            "presentInDraftRegister": risk_id in risk_rows,
            "activePlanAnchor": anchor,
            "anchorPresentInActivePlan": anchor in plan,
        }
        for risk_id, anchor in required_risk_links.items()
    }
    risk_drift_ok = all(
        entry["presentInDraftRegister"] and entry["anchorPresentInActivePlan"]
        for entry in risk_mapping.values()
    )

    audit_delta = {
        "ok": (
            readiness["ok"]
            and not untracked_ppo
            and not stale_readme_markers
            and not tmp_only_evidence
            and not self_count_evidence
            and risk_drift_ok
            and bt93b_consistency["scaffoldOnly"]
            and not bt93b_consistency["promotionAllowed"]
        ),
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93c_audit_delta.py",
        "blockId": "BT93C",
        "phaseId": "93C.1.1",
        "claim": "93C-Audit-Delta",
        "inputs": {
            "plan": _rel(PLAN_PATH),
            "ppoReadme": _rel(PPO_README_PATH),
            "bt90RiskRegister": _rel(BT90_RISK_PATH),
            "auditReadiness": _rel(AUDIT_READINESS_PATH),
            "startManifest": _rel(START_MANIFEST_PATH),
            "bt93bConsistency": _rel(BT93B_CONSISTENCY_PATH),
            "baselineSourceManifest": _rel(BASELINE_SOURCE_PATH),
        },
        "git": {
            "headCommit": _run_git(["rev-parse", "HEAD"]),
            "scopedStatusBeforeWrite": scoped_status,
            "ignoredCurrentClaimOutputs": sorted(CURRENT_CLAIM_OUTPUTS),
        },
        "checks": {
            "freshFreezeStillGreen": {
                "freezeOk": readiness["checks"]["freeze"]["freezeOk"],
                "reAuditRequired": readiness["checks"]["freeze"]["reAuditRequired"],
                "driftCount": readiness["checks"]["freeze"]["driftCount"],
            },
            "staleUntrackedHints": {
                "untrackedPpoArtifacts": untracked_ppo,
                "readmeMarkers": stale_readme_markers,
                "readmeStatus": "current" if not stale_readme_markers else "stale",
            },
            "tmpOnlyEvidence": tmp_only_evidence,
            "selfCountEvidence": self_count_evidence,
            "scaffoldBaselineClassification": {
                "bt93bScaffoldOnly": bt93b_consistency["scaffoldOnly"],
                "bt93bPromotionAllowed": bt93b_consistency["promotionAllowed"],
                "bt93bGate": bt93b_consistency["bt94aGate"],
                "labels": {
                    "bt93b": "scaffold",
                    "bt93cBeforeLearner": "no PPO baseline",
                    "dataBotValidationReport": "legacy DQN validation report; not PPO candidate evidence",
                    "throughputArtifacts": "lane budget evidence only; not survival evidence",
                },
            },
            "riskDrift": {
                "ok": risk_drift_ok,
                "source": _rel(BT90_RISK_PATH),
                "mapping": risk_mapping,
            },
            "baselineAmbiguity": {
                "resolvedBy": _rel(BASELINE_SOURCE_PATH),
                "legacyBotValidationReportGeneratedAt": bot_validate_report.get("generatedAt"),
                "roadmapContainsQ2Baseline": "Baseline Snapshot" in roadmap,
            },
        },
        "resultClass": "go" if risk_drift_ok and not stale_readme_markers and not untracked_ppo else "hold",
        "nextGate": "93C.1.2/93C.1.3 dependency and clean-env lock",
        "trainingRunsStarted": False,
    }

    baseline_source = {
        "ok": True,
        "generatedAt": generated_at,
        "generatedBy": "python/scripts/bt93c_audit_delta.py",
        "blockId": "BT93C",
        "phaseId": "93C.1.4",
        "manifestVersion": "bt93c-baseline-source-v1",
        "baselinePolicy": {
            "singleActiveBaselineSource": True,
            "oldNonPpoReportsExcludedAsPpoQuality": True,
            "ppoBaselineExists": False,
            "ppoBaselineBefore93C5": "blocked until 93C.3/93C.4 produce a real learner/eval path and 93C.5 publishes a candidate baseline bundle",
        },
        "comparisonAnchor": {
            "baselineId": "bt93c-dqn-reference-bt11-final-20260324-v1",
            "role": "DQN champion comparison anchor, not a PPO baseline",
            "date": "2026-03-24",
            "command": "npm run training:10h -- --series-stamp BT11_FIGHT_20260324T014853 --modes hunt-3d,hunt-2d --stop-on-fail false; npm run bot:validate",
            "metrics": {
                "avgStepsPerEpisode": 117.525,
                "averageBotSurvival": 37.376986,
                "invalidActionRate": 1.0,
                "runtimeErrorCount": None,
            },
            "seeds": {
                "status": "not versioned in legacy BT11 evidence; 93C.6 must freeze a reproducible apples-to-apples matrix before comparison",
                "bt93cReservedTrainSeeds": start_manifest["matrix"]["train"]["seeds"],
                "bt93cReservedEvalSeeds": start_manifest["matrix"]["eval"]["seeds"],
                "bt93cReservedHoldoutSeeds": start_manifest["matrix"]["holdout"]["seeds"],
            },
            "modes": {
                "trainingRun": ["hunt-3d", "hunt-2d"],
                "botValidateScenarios": ["classic-3d", "classic-2d"],
            },
            "maps": ["standard", "maze"],
            "semanticWindow": {
                "dqnChampion": "BT11 legacy DQN champion window",
                "bt93cLearner": start_manifest["semanticWindow"]["modeId"],
                "comparisonCaveat": "93C.6 must disclose any semantic drift before PPO/DQN comparison.",
            },
            "artifactPaths": [
                {
                    "path": _rel(BT11_VALIDATE_DOC_PATH),
                    "versioned": _versioned(BT11_VALIDATE_DOC_PATH),
                    "role": "versioned rounded bot-validation survival summary",
                },
                {
                    "path": _rel(PLAN_PATH),
                    "versioned": _versioned(PLAN_PATH),
                    "role": "active plan stores exact BT11 checkpoint metrics",
                },
                {
                    "path": "output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log",
                    "versioned": False,
                    "role": "historical command log referenced by plan; not closure evidence by itself",
                },
            ],
            "ppoBaselineEligible": False,
        },
        "excludedSources": [
            {
                "path": _rel(BOT_VALIDATE_REPORT_PATH),
                "generatedAt": bot_validate_report.get("generatedAt"),
                "reason": "legacy non-PPO DQN validation report; current file points to 2026-03-27 and is not a PPO candidate or baseline-quality report",
            },
            {
                "path": "tmp/**",
                "reason": "local tmp output is never closure-capable survival evidence",
            },
            {
                "path": "data/training/ppo/bt93b/**",
                "reason": "BT93B is scaffold-only and contains no PPO optimizer update",
            },
            {
                "path": "data/training/ppo/lane_baseline*.json",
                "reason": "lane throughput/boot-step evidence only; not PPO survival baseline",
            },
        ],
        "requiredBefore93C5": {
            "baselineId": "bt93c-ppo-baseline-publish-v1",
            "minimumFields": [
                "avgStepsPerEpisode",
                "averageBotSurvival",
                "runtimeErrorCount",
                "sanitizerRate",
                "vetoRate",
                "invalidActionRate",
                "failureClasses",
                "modelHash",
                "configHash",
                "matrixId",
            ],
            "publishCommand": "npm run bot:validate:publish with an explicit PPO candidate/eval bundle after 93C.3 and 93C.4",
            "status": "not runnable in 93C-Audit-Delta",
        },
    }
    return audit_delta, baseline_source


def main() -> None:
    BT93C_ROOT.mkdir(parents=True, exist_ok=True)
    audit_delta, baseline_source = build_artifacts()
    BASELINE_SOURCE_PATH.write_text(f"{json.dumps(baseline_source, indent=2)}\n", encoding="utf-8")
    audit_delta["checks"]["baselineAmbiguity"]["baselineSourceOk"] = baseline_source["ok"]
    AUDIT_DELTA_PATH.write_text(f"{json.dumps(audit_delta, indent=2)}\n", encoding="utf-8")
    print(json.dumps({
        "ok": audit_delta["ok"] and baseline_source["ok"],
        "resultClass": audit_delta["resultClass"],
        "auditDelta": _rel(AUDIT_DELTA_PATH),
        "baselineSource": _rel(BASELINE_SOURCE_PATH),
        "trainingRunsStarted": False,
    }, indent=2))
    raise SystemExit(0 if audit_delta["ok"] and baseline_source["ok"] else 1)


if __name__ == "__main__":
    main()
