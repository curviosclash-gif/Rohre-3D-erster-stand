"""BT93D repair manifest builder.

This records the BT94A start truth before any BT93D repair run. It does not
train, freeze, promote, or touch runtime surfaces.
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
BT93C_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
BT93D_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93d"
BT94A_GATE_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt94a" / "no_start_gate.json"
REQUIREMENTS_PATH = REPO_ROOT / "python" / "requirements-ppo.txt"
DEFAULT_MANIFEST_PATH = BT93D_ROOT / "repair_manifest.json"
DEFAULT_START_MATRIX_PATH = BT93D_ROOT / "start_matrix.json"

MANDATORY_START_VALUES = [
    {
        "id": "bt94a_gate_report",
        "required": {"resultClass": "claimable", "claimable": True},
        "source": "data/training/ppo/bt94a/no_start_gate.json",
    },
    {
        "id": "candidate_runs_allowed",
        "required": {"candidateRunsAllowed": True, "scope": "BT94A only after BT93D"},
        "source": "data/training/ppo/bt94a/no_start_gate.json",
    },
    {
        "id": "matrix_definition_allowed",
        "required": {"matrixDefinitionAllowed": True},
        "source": "data/training/ppo/bt94a/no_start_gate.json",
    },
    {
        "id": "candidate_freeze_allowed",
        "required": {"candidateFreezeAllowed": False, "until": "BT94A.3"},
        "source": "data/training/ppo/bt94a/no_start_gate.json",
    },
    {
        "id": "handover_result",
        "required": {"resultClass": "not diagnose"},
        "source": "data/training/ppo/bt93c/handover_report.json",
    },
    {
        "id": "handover_gate",
        "required": {"bt94aHandover.ready": True},
        "source": "data/training/ppo/bt93c/handover_report.json",
    },
    {
        "id": "precomparison",
        "required": {"resultClass": "not ppo-regression"},
        "source": "data/training/ppo/bt93c/precomparison_report.json",
    },
    {
        "id": "audit_blockers",
        "required": {"summary.bt94a-blocker": 0},
        "source": "data/training/ppo/bt93c/evidence_quality_matrix.json",
    },
    {
        "id": "f05_survival_first",
        "required": "PPO survival must be evidenced against the same matrix; legacy bot validation is excluded",
        "source": "data/training/ppo/bt93c/precomparison_report.json",
    },
    {
        "id": "f19_terminal_death_diagnostics",
        "required": "natural terminal/death cases and survival distribution are diagnostic, not max-steps only",
        "source": "data/training/ppo/bt93c/evidence_quality_matrix.json",
    },
    {
        "id": "f27_dqn_ppo_comparison",
        "required": "PPO is not a clear DQN regression, or the regression is downgraded with new evidence",
        "source": "data/training/ppo/bt93c/precomparison_report.json",
    },
    {
        "id": "f30_mask_clamp_load",
        "required": "policy-mask and post-decode clamp/veto load are separated",
        "source": "data/training/ppo/bt93c/evidence_quality_matrix.json",
    },
    {
        "id": "f31_natural_terminal_matrix",
        "required": "death/terminal matrix and survival distribution are visible before freeze path",
        "source": "data/training/ppo/bt93c/evidence_quality_matrix.json",
    },
    {
        "id": "baseline_id",
        "required": "versioned PPO baseline id with command, date, seeds, modes, maps, semantic window, artifacts",
        "source": "data/training/ppo/bt93c/baseline_report.json",
    },
    {
        "id": "dqn_champion",
        "required": "named DQN anchor with baseline id, metrics, semantic window, and drift note",
        "source": "data/training/ppo/bt93c/precomparison_report.json",
    },
    {
        "id": "holdout",
        "required": "holdout seeds consumed, reported, and not optimized on",
        "source": "data/training/ppo/bt93c/precomparison_report.json",
    },
    {
        "id": "semantic_window",
        "required": "DQN/PPO semantic window is named; drift is no-op or blocker",
        "source": "data/training/ppo/bt93c/precomparison_report.json",
    },
    {
        "id": "dependency_lock",
        "required": "PPO stack is pinned and clean-env smoke remains valid",
        "source": "data/training/ppo/bt93c/clean_env_smoke_report.json",
    },
    {
        "id": "model_package",
        "required": "true PPO package with model/config/optimizer/VecNormalize hashes; no scaffold",
        "source": "data/training/ppo/bt93c/runs/20260424T180033Z-baseline-train/artifact_manifest.json",
    },
    {
        "id": "evidence_quality",
        "required": "no tmp-only, self-count, stale-doc, scaffold, pilot-only, or mutable latest evidence as start signal",
        "source": "data/training/ppo/bt93c/evidence_quality_matrix.json",
    },
    {
        "id": "four_env",
        "required": "4-env remains locked without direct evidence",
        "source": "data/training/ppo/bt93c/baseline_report.json",
    },
    {
        "id": "ppo_validate",
        "required": "BT94B.3 rest debt stays visible; no BT80C/internal-eval replacement",
        "source": "data/training/ppo/bt93c/precomparison_report.json",
    },
    {
        "id": "rollout_boundary",
        "required": "no rollout, JS inference, registry, rollback, latency, or strategy flag signal",
        "source": "data/training/ppo/bt93c/handover_report.json",
    },
    {
        "id": "governance_gates",
        "required": "npm.cmd run plan:check, docs:sync, docs:check, build pass at closure gate",
        "source": "docs/bot-training/Bot_Trainingsplan.md",
    },
]


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


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "path": _rel(path),
        "sha256": _sha256_file(path),
        "role": role,
        "closureCapable": closure_capable,
    }


def _get(mapping: Mapping[str, Any], *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _blocked_ids(gate: Mapping[str, Any]) -> list[str]:
    state = gate.get("bt93cState") if isinstance(gate.get("bt93cState"), Mapping) else {}
    blockers = state.get("bt94aBlockers") if isinstance(state.get("bt94aBlockers"), list) else []
    return [str(row.get("id")) for row in blockers if isinstance(row, Mapping) and row.get("id")]


def _status(ok: bool, reason: str) -> dict[str, Any]:
    return {"ok": ok, "status": "ok" if ok else "blocked", "reason": reason}


def _mandatory_row_status(
    row: Mapping[str, Any],
    gate: Mapping[str, Any],
    handover: Mapping[str, Any],
    precomparison: Mapping[str, Any],
    matrix: Mapping[str, Any],
    baseline: Mapping[str, Any],
    clean_env: Mapping[str, Any],
    artifact_manifest: Mapping[str, Any],
) -> dict[str, Any]:
    row_id = str(row["id"])
    gate_state = gate.get("bt93cState") if isinstance(gate.get("bt93cState"), Mapping) else {}
    handover_gate = handover.get("bt94aHandover") if isinstance(handover.get("bt94aHandover"), Mapping) else {}
    matrix_summary = matrix.get("summary") if isinstance(matrix.get("summary"), Mapping) else {}
    candidate = precomparison.get("ppoCandidate") if isinstance(precomparison.get("ppoCandidate"), Mapping) else {}
    comparison = precomparison.get("comparisonMatrix") if isinstance(precomparison.get("comparisonMatrix"), Mapping) else {}
    blocked = set(_blocked_ids(gate))

    checks: dict[str, dict[str, Any]] = {
        "bt94a_gate_report": _status(
            gate.get("resultClass") == "claimable" and gate.get("claimable") is True,
            f"observed resultClass={gate.get('resultClass')}, claimable={gate.get('claimable')}",
        ),
        "candidate_runs_allowed": _status(
            gate.get("candidateRunsAllowed") is True,
            f"observed candidateRunsAllowed={gate.get('candidateRunsAllowed')}; BT93D itself still forbids candidates",
        ),
        "matrix_definition_allowed": _status(
            gate.get("matrixDefinitionAllowed") is True,
            f"observed matrixDefinitionAllowed={gate.get('matrixDefinitionAllowed')}",
        ),
        "candidate_freeze_allowed": _status(
            gate.get("candidateFreezeAllowed") is False,
            f"observed candidateFreezeAllowed={gate.get('candidateFreezeAllowed')}",
        ),
        "handover_result": _status(
            handover.get("resultClass") != "diagnose",
            f"observed resultClass={handover.get('resultClass')}",
        ),
        "handover_gate": _status(
            bool(handover_gate.get("ready")),
            f"observed ready={handover_gate.get('ready')}, gate={handover_gate.get('gate')}",
        ),
        "precomparison": _status(
            precomparison.get("resultClass") != "ppo-regression",
            f"observed resultClass={precomparison.get('resultClass')}",
        ),
        "audit_blockers": _status(
            int(matrix_summary.get("bt94a-blocker") or 0) == 0,
            f"observed bt94a-blocker={matrix_summary.get('bt94a-blocker')}",
        ),
        "f05_survival_first": _status("F.05" not in blocked, "F.05 is still a BT94A blocker"),
        "f19_terminal_death_diagnostics": _status("F.19" not in blocked, "F.19 is still a BT94A blocker"),
        "f27_dqn_ppo_comparison": _status("F.27" not in blocked, "F.27 is still a BT94A blocker"),
        "f30_mask_clamp_load": _status("F.30" not in blocked, "F.30 is still a BT94A blocker"),
        "f31_natural_terminal_matrix": _status("F.31" not in blocked, "F.31 is still a BT94A blocker"),
        "baseline_id": _status(
            bool(candidate.get("baselineId")) and baseline.get("resultClass") == "baseline go",
            f"observed baselineId={candidate.get('baselineId')}, baseline result={baseline.get('resultClass')}",
        ),
        "dqn_champion": _status(
            bool(_get(comparison, "dqnChampion", "baselineId")),
            f"observed dqnChampion={_get(comparison, 'dqnChampion', 'baselineId')}",
        ),
        "holdout": _status(
            bool(candidate.get("holdoutEvalRunId")),
            f"observed holdoutEvalRunId={candidate.get('holdoutEvalRunId')}",
        ),
        "semantic_window": _status(
            _get(precomparison, "v101FollowUp", "resultClass") == "no-ppo-contract-drift"
            and bool(comparison.get("modeId")),
            f"observed modeId={comparison.get('modeId')}, v101={_get(precomparison, 'v101FollowUp', 'resultClass')}",
        ),
        "dependency_lock": _status(
            clean_env.get("ok") is True
            and clean_env.get("requirementsSha256") == _sha256_file(REQUIREMENTS_PATH),
            "clean-env report ok and requirements hash matches",
        ),
        "model_package": _status(
            artifact_manifest.get("truePpoModelPackage") is True
            and artifact_manifest.get("scaffoldOnly") is False,
            f"observed truePpoModelPackage={artifact_manifest.get('truePpoModelPackage')}, scaffoldOnly={artifact_manifest.get('scaffoldOnly')}",
        ),
        "evidence_quality": _status(
            int(matrix_summary.get("bt94a-blocker") or 0) == 0,
            "evidence matrix still contains BT94A blockers; mutable latest/tmp remain non-closure sources",
        ),
        "four_env": _status(
            _get(baseline, "guardrails", "fourEnvAllowed") is False,
            f"observed fourEnvAllowed={_get(baseline, 'guardrails', 'fourEnvAllowed')}",
        ),
        "ppo_validate": _status(
            _get(precomparison, "evidenceInterpretation", "ppoValidateStatus") == "ppo-validate-missing",
            f"observed PPO-Validate status={_get(precomparison, 'evidenceInterpretation', 'ppoValidateStatus')}",
        ),
        "rollout_boundary": _status(
            _get(handover, "guardrails", "isRolloutSignal") is False
            and _get(handover, "guardrails", "productiveRuntimeChanged") is False,
            f"observed rolloutSignal={_get(handover, 'guardrails', 'isRolloutSignal')}, productiveRuntimeChanged={_get(handover, 'guardrails', 'productiveRuntimeChanged')}",
        ),
        "governance_gates": _status(False, "deferred to BT93D closure gate"),
    }
    status = checks[row_id]
    return {
        **row,
        "current": status["reason"],
        "ok": status["ok"],
        "status": status["status"],
    }


def _hash_check(path_text: str | None, expected: str | None) -> dict[str, Any]:
    if not path_text:
        return {"path": None, "expectedSha256": expected, "actualSha256": None, "ok": False}
    path = REPO_ROOT / path_text
    actual = _sha256_file(path) if path.exists() else None
    return {
        "path": _rel(path),
        "expectedSha256": expected,
        "actualSha256": actual,
        "ok": bool(expected) and actual == expected,
    }


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    gate = _read_json(BT94A_GATE_PATH)
    precomparison = _read_json(BT93C_ROOT / "precomparison_report.json")
    handover = _read_json(BT93C_ROOT / "handover_report.json")
    matrix = _read_json(BT93C_ROOT / "evidence_quality_matrix.json")
    baseline = _read_json(BT93C_ROOT / "baseline_report.json")
    baseline_source = _read_json(BT93C_ROOT / "baseline_source_manifest.json")
    clean_env = _read_json(BT93C_ROOT / "clean_env_smoke_report.json")
    artifact_manifest_path = REPO_ROOT / str(_get(handover, "modelPackage", "artifactManifest"))
    artifact_manifest = _read_json(artifact_manifest_path)

    claim_checks = gate.get("claimChecks") if isinstance(gate.get("claimChecks"), list) else []
    start_matrix = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93d_repair_manifest.py",
        "blockId": "BT93D",
        "phaseId": "93D.1.1",
        "gitSha": _git_sha(),
        "sourceGate": _source(BT94A_GATE_PATH, "fresh BT94A gate report"),
        "resultClass": gate.get("resultClass"),
        "claimable": gate.get("claimable"),
        "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
        "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
        "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
        "claimChecks": claim_checks,
        "pinnedClaimCheckIds": [
            "bt93c_result_allows_bt94a",
            "handover_gate_ready",
            "precomparison_not_regression",
            "no_open_bt94a_audit_blockers",
        ],
        "startDecision": gate.get("noStartDecision"),
    }

    mandatory_values = [
        _mandatory_row_status(
            row,
            gate,
            handover,
            precomparison,
            matrix,
            baseline,
            clean_env,
            artifact_manifest,
        )
        for row in MANDATORY_START_VALUES
    ]

    candidate = precomparison.get("ppoCandidate") if isinstance(precomparison.get("ppoCandidate"), Mapping) else {}
    comparison = precomparison.get("comparisonMatrix") if isinstance(precomparison.get("comparisonMatrix"), Mapping) else {}
    model_artifacts = artifact_manifest.get("artifacts") if isinstance(artifact_manifest.get("artifacts"), Mapping) else {}
    clean_steps = clean_env.get("steps") if isinstance(clean_env.get("steps"), Mapping) else {}
    install_step = clean_steps.get("installRequirements") if isinstance(clean_steps.get("installRequirements"), Mapping) else {}
    pip_step = clean_steps.get("pipCheck") if isinstance(clean_steps.get("pipCheck"), Mapping) else {}
    import_step = clean_steps.get("importSmoke") if isinstance(clean_steps.get("importSmoke"), Mapping) else {}
    minimal_step = clean_steps.get("minimalPpoTrainStart") if isinstance(clean_steps.get("minimalPpoTrainStart"), Mapping) else {}

    freshness = {
        "v101": {
            "resultClass": _get(precomparison, "v101FollowUp", "resultClass"),
            "freezeOk": _get(precomparison, "v101FollowUp", "freezeCheck", "freezeOk"),
            "driftCount": _get(precomparison, "v101FollowUp", "freezeCheck", "driftCount"),
            "ok": _get(precomparison, "v101FollowUp", "resultClass") == "no-ppo-contract-drift",
        },
        "semanticWindow": {
            "modeId": comparison.get("modeId"),
            "baselineSourceLearner": _get(baseline_source, "comparisonAnchor", "semanticWindow", "bt93cLearner"),
            "ok": bool(comparison.get("modeId")),
        },
        "dqnChampion": {
            "baselineId": _get(comparison, "dqnChampion", "baselineId"),
            "semanticWindow": _get(comparison, "dqnChampion", "semanticWindow"),
            "strictApplesToApples": _get(comparison, "strictApplesToApples", "ok"),
            "ok": bool(_get(comparison, "dqnChampion", "baselineId")),
        },
        "ppoBaseline": {
            "baselineId": candidate.get("baselineId"),
            "baselineRunId": candidate.get("baselineRunId"),
            "baselineEvalRunId": candidate.get("baselineEvalRunId"),
            "holdoutEvalRunId": candidate.get("holdoutEvalRunId"),
            "resultClass": baseline.get("resultClass"),
            "ok": bool(candidate.get("baselineId")) and baseline.get("resultClass") == "baseline go",
        },
        "dependencyLock": {
            "requirements": _rel(REQUIREMENTS_PATH),
            "requirementsSha256": _sha256_file(REQUIREMENTS_PATH),
            "cleanEnvRequirementsSha256": clean_env.get("requirementsSha256"),
            "installRequirementsOk": install_step.get("ok"),
            "pipCheckOk": pip_step.get("ok"),
            "importSmokeOk": import_step.get("ok"),
            "minimalPpoTrainStartOk": minimal_step.get("ok"),
            "ok": clean_env.get("ok") is True
            and clean_env.get("requirementsSha256") == _sha256_file(REQUIREMENTS_PATH),
        },
        "modelPackage": {
            "runId": artifact_manifest.get("runId"),
            "model": _hash_check(model_artifacts.get("model"), model_artifacts.get("modelSha256")),
            "vecnormalize": _hash_check(model_artifacts.get("vecnormalize"), model_artifacts.get("vecnormalizeSha256")),
            "optimizerState": _hash_check(
                model_artifacts.get("optimizerState"),
                model_artifacts.get("optimizerStateSha256"),
            ),
            "config": _hash_check(model_artifacts.get("config"), model_artifacts.get("configSha256")),
            "truePpoModelPackage": artifact_manifest.get("truePpoModelPackage"),
            "scaffoldOnly": artifact_manifest.get("scaffoldOnly"),
            "ok": artifact_manifest.get("truePpoModelPackage") is True
            and artifact_manifest.get("scaffoldOnly") is False,
        },
    }
    freshness["modelPackage"]["ok"] = bool(freshness["modelPackage"]["ok"]) and all(
        freshness["modelPackage"][key]["ok"] for key in ["model", "vecnormalize", "optimizerState", "config"]
    )

    manifest = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93d_repair_manifest.py",
        "blockId": "BT93D",
        "phaseId": "93D.1",
        "gitSha": _git_sha(),
        "resultClass": "gate-truth-pinned",
        "bt94aStartStatus": {
            "claimable": gate.get("claimable"),
            "resultClass": gate.get("resultClass"),
            "candidateRunsAllowed": gate.get("candidateRunsAllowed"),
            "matrixDefinitionAllowed": gate.get("matrixDefinitionAllowed"),
            "candidateFreezeAllowed": gate.get("candidateFreezeAllowed"),
            "blockedClaimChecks": [
                check for check in claim_checks if isinstance(check, Mapping) and not check.get("ok")
            ],
        },
        "startMatrixPath": "data/training/ppo/bt93d/start_matrix.json",
        "mandatoryStartValues": mandatory_values,
        "currentArtifacts": {
            "bt94aGate": _source(BT94A_GATE_PATH, "93D.1.1 refreshed BT94A gate"),
            "precomparisonReport": _source(BT93C_ROOT / "precomparison_report.json", "DQN/PPO precomparison"),
            "handoverReport": _source(BT93C_ROOT / "handover_report.json", "BT93C handover"),
            "evidenceQualityMatrix": _source(BT93C_ROOT / "evidence_quality_matrix.json", "audit blocker matrix"),
            "baselineReport": _source(BT93C_ROOT / "baseline_report.json", "PPO baseline bundle"),
            "artifactManifest": _source(artifact_manifest_path, "immutable PPO model package manifest"),
            "cleanEnvSmokeReport": _source(BT93C_ROOT / "clean_env_smoke_report.json", "clean-env dependency smoke"),
            "baselineSourceManifest": _source(
                BT93C_ROOT / "baseline_source_manifest.json",
                "baseline source and excluded evidence policy",
            ),
        },
        "evidenceSources": {
            "closureCapable": [
                "data/training/ppo/bt94a/no_start_gate.json",
                "data/training/ppo/bt93d/start_matrix.json",
                "data/training/ppo/bt93d/repair_manifest.json",
                "data/training/ppo/bt93c/precomparison_report.json",
                "data/training/ppo/bt93c/handover_report.json",
                "data/training/ppo/bt93c/evidence_quality_matrix.json",
                "data/training/ppo/bt93c/baseline_report.json",
                "data/training/ppo/bt93c/runs/20260424T180033Z-baseline-train/artifact_manifest.json",
                "data/training/ppo/bt93c/clean_env_smoke_report.json",
            ],
            "supplementalOnly": [
                {"path": "tmp/**", "reason": "local output is not closure-capable evidence"},
                {"path": "data/bot_validation_report.json", "reason": "legacy non-PPO validation report"},
                {"path": "data/training/ppo/bt93c/latest_*.json", "reason": "mutable pointers only"},
                {"path": "data/training/ppo/bt93b/**", "reason": "scaffold-only PPO path"},
            ],
        },
        "freshness": freshness,
        "allowedSidecarPaths": [
            "python/**",
            "data/training/ppo/bt93d/**",
            "data/training/ppo/bt93c/**",
            "data/training/ppo/bt94a/no_start_gate.json",
            "docs/bot-training/Bot_Trainingsplan.md",
        ],
        "forbiddenWork": [
            "BT94A candidate training runs",
            "freeze candidate creation",
            "BT94B handover",
            "promote or rollout-ready verdicts",
            "JS inference, runtime strategy flag, registry, rollback, or latency activation",
            "productive runtime, matchstart, or AI-Hub surface changes",
        ],
        "readOnlyRuntimeSurfaces": [
            "ObservationBridgePolicy",
            "RuntimeConfig",
            "BotPolicyRegistry",
            "BotPolicyTypes",
            "LocalDqnInference",
            "HybridDecisionArchitecture",
            "RewardCalculator",
            "MatchSessionFactory",
        ],
        "nextRepairTargets": _blocked_ids(gate),
    }
    return start_matrix, manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93D start matrix and repair manifest.")
    parser.add_argument("--write-report", action="store_true", help="Write JSON artifacts.")
    parser.add_argument("--manifest-output", default=str(DEFAULT_MANIFEST_PATH), help="Repair manifest path.")
    parser.add_argument("--start-matrix-output", default=str(DEFAULT_START_MATRIX_PATH), help="Start matrix path.")
    args = parser.parse_args()

    start_matrix, manifest = build_reports()
    if args.write_report:
        _write_json(Path(args.start_matrix_output).resolve(), start_matrix)
        _write_json(Path(args.manifest_output).resolve(), manifest)
    print(json.dumps({"startMatrix": start_matrix, "repairManifest": manifest}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
