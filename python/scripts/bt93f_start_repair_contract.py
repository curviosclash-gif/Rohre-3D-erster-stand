"""BT93F start repair contract builder.

This script records the BT93F no-start state and the phase-separated repair
contract. It does not run training, define BT94A candidates, create a freeze
candidate, or touch productive runtime surfaces.
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
BT93E_ROOT = PPO_ROOT / "bt93e"
BT93F_ROOT = PPO_ROOT / "bt93f"
BT94A_ROOT = PPO_ROOT / "bt94a"

NO_START_GATE_PATH = BT94A_ROOT / "no_start_gate.json"
BT93E_HANDOVER_PATH = BT93E_ROOT / "handover_package.json"
PRECOMPARISON_PATH = PPO_ROOT / "bt93c" / "precomparison_report.json"
FINDING_REGISTER_PATH = BT93E_ROOT / "finding_register.json"
START_MATRIX_PATH = BT93E_ROOT / "start_matrix.json"
SURVIVAL_REPORT_PATH = BT93E_ROOT / "survival_repair_report.json"
TERMINAL_REPORT_PATH = BT93E_ROOT / "terminal_reward_failure_report.json"
ACTION_REPORT_PATH = BT93E_ROOT / "action_surface_hardening_report.json"

DEFAULT_START_PACKAGE_PATH = BT93F_ROOT / "start_repair_package.json"
DEFAULT_NO_GO_PATH = BT93F_ROOT / "no_go_report.json"

BLOCKERS = ("F.05", "F.19", "F.27", "F.30", "F.31", "R.01")
RUNTIME_READ_ONLY_SURFACES = (
    "ObservationBridgePolicy",
    "RuntimeConfig",
    "BotPolicyRegistry",
    "BotPolicyTypes",
    "LocalDqnInference",
    "HybridDecisionArchitecture",
    "RewardCalculator",
    "MatchSessionFactory",
)


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
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _optional_source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    if path.exists():
        return _source(path, role, closure_capable)
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": None,
        "status": "pending-write",
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


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _finding_status(finding_register: Mapping[str, Any]) -> dict[str, str]:
    entries = finding_register.get("entries")
    if not isinstance(entries, list):
        return {}
    statuses: dict[str, str] = {}
    for entry in entries:
        if isinstance(entry, Mapping):
            finding_id = entry.get("id")
            if finding_id in BLOCKERS:
                statuses[str(finding_id)] = str(entry.get("status"))
    return statuses


def _blocker_register(
    no_start_gate: Mapping[str, Any],
    handover: Mapping[str, Any],
    finding_register: Mapping[str, Any],
) -> list[dict[str, Any]]:
    statuses = _finding_status(finding_register)
    gate_state = _mapping(no_start_gate.get("bt93cState"))
    blockers = {
        "F.05": {
            "artifact": SURVIVAL_REPORT_PATH,
            "closureRule": "same-matrix eval and holdout no longer classify PPO as ppo-regression against the DQN anchor",
            "evidence": "Survival-First remains blocked by negative averageBotSurvival and holdout deltas.",
            "nextPhase": "93F.4",
            "ownerLayer": "ppo-training/qa",
        },
        "F.19": {
            "artifact": TERMINAL_REPORT_PATH,
            "closureRule": "terminal/death/failure classes are visible in train/eval/holdout and no longer max-steps-only",
            "evidence": "Terminal/death matrix remains insufficient for BT94A start.",
            "nextPhase": "93F.2",
            "ownerLayer": "ppo-eval/qa",
        },
        "F.27": {
            "artifact": SURVIVAL_REPORT_PATH,
            "closureRule": "precomparison_report.json.resultClass is not ppo-regression on the pinned matrix",
            "evidence": f"Current precomparison remains {gate_state.get('precomparisonResultClass')}.",
            "nextPhase": "93F.4",
            "ownerLayer": "ppo-training/qa",
        },
        "F.30": {
            "artifact": ACTION_REPORT_PATH,
            "closureRule": "policy-level mask is trainable before sampling or a hard follow-blocker keeps BT94A closed",
            "evidence": "Policy-level masking is absent while post-decode clamp and veto load remain high.",
            "nextPhase": "93F.3",
            "ownerLayer": "ppo-action-surface",
        },
        "F.31": {
            "artifact": TERMINAL_REPORT_PATH,
            "closureRule": "natural terminal or death-cause evidence exists, or the report keeps no-start active",
            "evidence": "Natural terminal/death evidence remains weak.",
            "nextPhase": "93F.2",
            "ownerLayer": "ppo-eval/qa",
        },
        "R.01": {
            "artifact": TERMINAL_REPORT_PATH,
            "closureRule": "reward gains cannot coexist with shorter survival or hidden safety/episode-shortening regression",
            "evidence": "Reward and safety signals are not trusted while survival remains regressive.",
            "nextPhase": "93F.2",
            "ownerLayer": "ppo-reward/qa",
        },
    }
    remaining = set(gate_state.get("remainingBt94aGates") or handover.get("diagnoseBlocked", {}).get("remainingBt94aGates") or [])
    rows = []
    for finding_id in BLOCKERS:
        row = blockers[finding_id]
        rows.append(
            {
                "id": finding_id,
                "status": statuses.get(finding_id, "still-blocking" if finding_id in remaining else "unknown"),
                "ownerLayer": row["ownerLayer"],
                "nextPhase": row["nextPhase"],
                "sourceArtifact": _source(row["artifact"], f"BT93E source for {finding_id}"),
                "currentEvidence": row["evidence"],
                "closureRule": row["closureRule"],
                "forbiddenWorkaround": "Do not close via old validation reports, tmp-only data, latest_* pointers, plan grep, candidate/freeze wording, or matrix drift.",
            }
        )
    return rows


def _separated_hypotheses() -> list[dict[str, Any]]:
    return [
        {
            "id": "H1-survival-reward",
            "phase": "93F.2/93F.4",
            "question": "Can reward and survival be aligned without hiding shorter episodes or safety overrules?",
            "allowedOutputs": [
                "data/training/ppo/bt93f/terminal_reward_failure_report.json",
                "data/training/ppo/bt93f/runs/*/training_report.json",
                "data/training/ppo/bt93f/runs/*/eval_report.json",
            ],
            "mustNotMixWith": ["BT94A candidate runs", "freeze candidate creation", "matrix expansion"],
        },
        {
            "id": "H2-terminal-death-emission",
            "phase": "93F.2",
            "question": "Can train/eval/holdout reports expose terminal, death, truncation, and failure classes consistently?",
            "allowedOutputs": [
                "data/training/ppo/bt93f/terminal_reward_failure_report.json",
                "data/training/ppo/bt93f/terminal_death_probe_report.json",
            ],
            "mustNotMixWith": ["quality claim", "promotion claim", "PPO-Validate claim"],
        },
        {
            "id": "H3-policy-level-mask",
            "phase": "93F.3",
            "question": "Can inventory/item legality be masked before policy sampling instead of only clamped after decode?",
            "allowedOutputs": [
                "data/training/ppo/bt93f/action_surface_repair_report.json",
                "data/training/ppo/bt93f/action_surface_smoke_93f3.json",
            ],
            "mustNotMixWith": ["postDecodeClamp counted as policy-mask", "BT94A start if masking is absent"],
        },
        {
            "id": "H4-eval-holdout-statistics",
            "phase": "93F.4",
            "question": "Can the repaired lane meet minimum eval/holdout episodes on the pinned same matrix?",
            "allowedOutputs": [
                "data/training/ppo/bt93f/runs/*/eval_report.json",
                "data/training/ppo/bt93f/runs/*/artifact_manifest.json",
            ],
            "mustNotMixWith": ["changed seeds", "changed maps", "changed semantic window", "candidate/freeze labels"],
        },
        {
            "id": "H5-gate-refresh",
            "phase": "93F.5",
            "question": "Do BT93F artifacts make the gate claimable, or must the block end diagnose-blocked?",
            "allowedOutputs": [
                "data/training/ppo/bt93c/precomparison_report.json",
                "data/training/ppo/bt93c/handover_report.json",
                "data/training/ppo/bt93c/evidence_quality_matrix.json",
                "data/training/ppo/bt94a/no_start_gate.json",
                "data/training/ppo/bt93f/handover_package.json",
            ],
            "mustNotMixWith": ["BT94A checkbox closure while no_start_gate is red", "BT94B handover"],
        },
    ]


def _start_criteria(
    no_start_gate: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    survival: Mapping[str, Any],
    terminal: Mapping[str, Any],
    action: Mapping[str, Any],
) -> dict[str, Any]:
    comparison = _mapping(survival.get("comparison"))
    comparison_matrix = _mapping(precomparison.get("comparisonMatrix"))
    dqn_matrix = _mapping(comparison_matrix.get("dqnChampion"))
    dqn = _mapping(comparison.get("dqnChampion"))
    action_thresholds = _mapping(_mapping(action.get("thresholds")))
    survival_rules = _mapping(terminal.get("survivalDistributionRules"))
    minimum_episodes = _mapping(survival_rules.get("minimumCompletedEpisodes"))
    seeds = _mapping(comparison.get("seeds"))
    gate_state = _mapping(no_start_gate.get("bt93cState"))
    model_package = _mapping(gate_state.get("modelPackage"))
    return {
        "minimumCompletedEpisodes": {
            "eval": int(minimum_episodes.get("eval", 6)),
            "holdout": int(minimum_episodes.get("holdout", 4)),
        },
        "dqnAnchor": {
            "baselineId": dqn_matrix.get("baselineId"),
            "averageBotSurvival": dqn.get("averageBotSurvival"),
            "avgStepsPerEpisode": dqn.get("avgStepsPerEpisode"),
            "source": dqn.get("source"),
        },
        "matrix": {
            "matrixId": comparison.get("matrixId") or gate_state.get("matrixId"),
            "maps": comparison.get("maps") or comparison_matrix.get("maps"),
            "semanticWindow": comparison.get("semanticWindow") or gate_state.get("semanticWindow"),
            "seeds": {
                "train": comparison_matrix.get("trainSeeds"),
                "eval": seeds.get("eval") or comparison_matrix.get("evalSeeds"),
                "holdout": seeds.get("holdout") or comparison_matrix.get("holdoutSeeds"),
            },
        },
        "nonRegressionRule": {
            "precomparisonResultClass": "not ppo-regression",
            "averageBotSurvival": ">= dqnAnchor.averageBotSurvival or explicitly downgated with versioned evidence",
            "holdoutAverageBotSurvival": ">= dqnAnchor.averageBotSurvival or BT94A stays closed",
            "avgStepsPerEpisode": "non-regression or explicit no-start",
            "runtimeErrorCount": 0,
        },
        "actionTelemetryThresholds": {
            "policyLevelMaskRequired": True,
            "policyMaskAndPostDecodeClampMustNotBeMixed": action_thresholds.get("policyMaskAndPostDecodeClampMustNotBeMixed", True),
            "postDecodeClampRateBlocksAtOrAbove": action_thresholds.get("postDecodeClampRateBlocksAtOrAbove", 0.5),
            "safetyVetoRateBlocksAtOrAbove": action_thresholds.get("safetyVetoRateBlocksAtOrAbove", 0.25),
            "invalidActionRateAboveZeroBlocks": action_thresholds.get("invalidActionRateAboveZeroBlocks", True),
            "sanitizerRateAboveZeroBlocks": action_thresholds.get("sanitizerRateAboveZeroBlocks", True),
        },
        "modelPackageHashes": {
            "artifactManifest": model_package.get("artifactManifest"),
            "configSha256": model_package.get("configSha256"),
            "modelSha256": model_package.get("modelSha256"),
            "optimizerStateSha256": model_package.get("optimizerStateSha256"),
            "runId": model_package.get("runId"),
            "vecnormalizeSha256": model_package.get("vecnormalizeSha256"),
        },
        "closureTargetPaths": {
            "startPackage": _rel(DEFAULT_START_PACKAGE_PATH),
            "noGoReport": _rel(DEFAULT_NO_GO_PATH),
            "terminalRewardFailure": "data/training/ppo/bt93f/terminal_reward_failure_report.json",
            "actionSurfaceRepair": "data/training/ppo/bt93f/action_surface_repair_report.json",
            "repairEvalRuns": "data/training/ppo/bt93f/runs/*/eval_report.json",
            "bt93fHandover": "data/training/ppo/bt93f/handover_package.json",
            "gateRefresh": "data/training/ppo/bt94a/no_start_gate.json",
        },
    }


def build_start_package() -> dict[str, Any]:
    no_start_gate = _read_json(NO_START_GATE_PATH)
    handover = _read_json(BT93E_HANDOVER_PATH)
    precomparison = _read_json(PRECOMPARISON_PATH)
    finding_register = _read_json(FINDING_REGISTER_PATH)
    start_matrix = _read_json(START_MATRIX_PATH)
    survival = _read_json(SURVIVAL_REPORT_PATH)
    terminal = _read_json(TERMINAL_REPORT_PATH)
    action = _read_json(ACTION_REPORT_PATH)

    red_checks = [check for check in no_start_gate.get("claimChecks", []) if isinstance(check, Mapping) and not check.get("ok")]
    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93f_start_repair_contract.py",
        "gitSha": _git_sha(),
        "blockId": "BT93F",
        "phaseId": "93F.1",
        "resultClass": "start-repair-contract",
        "countsAsPpoValidateEvidence": False,
        "countsAsPromotionEvidence": False,
        "countsAsRolloutEvidence": False,
        "currentNoStartState": {
            "resultClass": no_start_gate.get("resultClass"),
            "claimable": no_start_gate.get("claimable"),
            "candidateRunsAllowed": no_start_gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": no_start_gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": no_start_gate.get("candidateFreezeAllowed"),
            "redClaimChecks": red_checks,
            "remainingBt94aGates": _mapping(no_start_gate.get("bt93cState")).get("remainingBt94aGates"),
        },
        "blockerRegister": _blocker_register(no_start_gate, handover, finding_register),
        "separatedRepairHypotheses": _separated_hypotheses(),
        "startCriteria": _start_criteria(no_start_gate, precomparison, survival, terminal, action),
        "scopeControl": {
            "allowedFiles": [
                "python/scripts/bt93f_*.py",
                "python/configs/ppo_bt93f_*.json",
                "python/envs/**",
                "python/scaffold/**",
                "src/entities/ai/training/**",
                "trainer/**",
                "tests/**/ppo*",
                "data/training/ppo/bt93f/**",
                "data/training/ppo/bt93c/precomparison_report.json",
                "data/training/ppo/bt93c/handover_report.json",
                "data/training/ppo/bt93c/evidence_quality_matrix.json",
                "data/training/ppo/bt94a/no_start_gate.json",
                "docs/bot-training/Bot_Trainingsplan.md",
                "docs/Fehlerberichte/2026-04-25_bt93f-*.md",
            ],
            "ownerLayers": {
                "harness": ["python/scripts/bt93f_*.py", "data/training/ppo/bt93f/**"],
                "environment": ["python/envs/**", "src/entities/ai/training/**"],
                "ppoLogic": ["python/configs/ppo_bt93f_*.json", "python/scaffold/**"],
                "governance": ["docs/bot-training/Bot_Trainingsplan.md"],
            },
            "readOnlyRuntimeSurfaces": list(RUNTIME_READ_ONLY_SURFACES),
            "forbiddenWorkarounds": [
                "BT94A candidate run inside BT93F",
                "freeze candidate creation",
                "BT94B handover",
                "promote or rollout-ready verdict",
                "JS inference, runtime strategy flag, registry, rollback, or latency activation",
                "using data/bot_validation_report.json as PPO evidence",
                "using tmp/** as closure evidence",
                "using latest_* pointers as immutable evidence",
                "using plan grep/self-count as evidence",
                "renaming post-decode clamp as policy-level mask",
                "changing matrix ID, seeds, maps, or semantic window during evaluation",
            ],
        },
        "sourceArtifacts": {
            "noStartGate": _source(NO_START_GATE_PATH, "current BT94A no-start gate"),
            "bt93eHandover": _source(BT93E_HANDOVER_PATH, "BT93E diagnose-blocked handover"),
            "precomparison": _source(PRECOMPARISON_PATH, "BT93C/BT93E precomparison source"),
            "findingRegister": _source(FINDING_REGISTER_PATH, "BT93E finding register"),
            "startMatrix": _source(START_MATRIX_PATH, "BT93E start matrix"),
            "survivalRepair": _source(SURVIVAL_REPORT_PATH, "BT93E survival repair source"),
            "terminalRewardFailure": _source(TERMINAL_REPORT_PATH, "BT93E terminal/reward/failure source"),
            "actionSurfaceHardening": _source(ACTION_REPORT_PATH, "BT93E action-surface source"),
        },
        "sourceSnapshot": {
            "bt93eStartMatrixResultClass": start_matrix.get("resultClass"),
            "bt93eHandoverResultClass": handover.get("resultClass"),
            "bt94aNoStartStatus": _mapping(no_start_gate.get("noStartDecision")).get("status"),
        },
    }


def build_no_go_report(
    start_package: Mapping[str, Any],
    source_package_path: Path = DEFAULT_START_PACKAGE_PATH,
) -> dict[str, Any]:
    no_start = _mapping(start_package.get("currentNoStartState"))
    return {
        "ok": True,
        "generatedAt": start_package.get("generatedAt"),
        "generatedBy": start_package.get("generatedBy"),
        "gitSha": start_package.get("gitSha"),
        "blockId": "BT93F",
        "phaseId": "93F.1.4",
        "resultClass": "no-go-active",
        "active": True,
        "reason": "BT94A remains closed while no_start_gate.json is red.",
        "gateState": {
            "resultClass": no_start.get("resultClass"),
            "claimable": no_start.get("claimable"),
            "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": no_start.get("candidateFreezeAllowed"),
            "redClaimChecks": no_start.get("redClaimChecks"),
        },
        "prohibitedEvidenceSources": [
            "data/bot_validation_report.json",
            "tmp/**",
            "latest_* pointers without immutable run IDs and hashes",
            "plan-grep or self-count evidence",
            "BT93B scaffold reports",
        ],
        "prohibitedResultLabels": [
            "candidate",
            "freeze-candidate",
            "promote",
            "rollout-ready",
            "BT94B-ready",
        ],
        "conditionsToLift": [
            "data/training/ppo/bt94a/no_start_gate.json resultClass=claimable",
            "claimable=true",
            "candidateRunsAllowed=true",
            "matrixDefinitionAllowed=true",
            "bt94aHandover.ready=true",
            "precomparison_report.json.resultClass != ppo-regression",
            "summary.bt94a-blocker=0 or bt94aBlockerCount=0",
            "candidateFreezeAllowed remains false until 94A.3",
        ],
        "closureCapableEvidenceOnly": [
            "versioned data/** artifacts with immutable run IDs and hashes",
            "versioned docs/** error or handover reports",
            "commands recorded in BT93F plan evidence",
        ],
        "sourcePackage": _optional_source(source_package_path, "BT93F start repair package"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="Write BT93F start package and no-go report")
    parser.add_argument("--start-package", type=Path, default=DEFAULT_START_PACKAGE_PATH)
    parser.add_argument("--no-go-report", type=Path, default=DEFAULT_NO_GO_PATH)
    args = parser.parse_args()

    start_package = build_start_package()
    if args.write:
        _write_json(args.start_package, start_package)
        no_go_report = build_no_go_report(start_package, args.start_package)
        _write_json(args.no_go_report, no_go_report)
    else:
        no_go_report = build_no_go_report(start_package, args.start_package)
        print(json.dumps({"startPackage": start_package, "noGoReport": no_go_report}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
