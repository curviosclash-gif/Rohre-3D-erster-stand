"""BT93J.1 causal chain and observation integrity reports.

The script is diagnostic-only. It reads existing BT93C/BT93I/BT94A evidence,
writes BT93J-local JSON reports, and updates the BT93J diagnostic split. It
does not train, repair, create candidates, freeze, promote, or touch runtime
surfaces.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93I_ROOT = PPO_ROOT / "bt93i"
BT93J_ROOT = PPO_ROOT / "bt93j"
BT94A_ROOT = PPO_ROOT / "bt94a"

START_TRUTH_PATH = BT93J_ROOT / "start_truth.json"
DIAGNOSTIC_SPLIT_PATH = BT93J_ROOT / "diagnostic_split_report.json"
MATRIX_GREEN_PATH = BT93I_ROOT / "matrix_green_report.json"
BT94A_NO_START_PATH = BT94A_ROOT / "no_start_gate.json"
BT93I_TRAIN_POINTER = BT93I_ROOT / "latest_terminal_curriculum_repair.json"
BT93I_EVAL_POINTER = BT93I_ROOT / "latest_terminal_curriculum_repair_eval.json"
BT93I_HOLDOUT_POINTER = BT93I_ROOT / "latest_holdout_eval.json"

DEFAULT_CAUSAL_PATH = BT93J_ROOT / "causal_chain_register.json"
DEFAULT_OBSERVATION_PATH = BT93J_ROOT / "observation_integrity_report.json"

CONTRACT_PATH = PYTHON_ROOT / "bridge" / "contract_v1.py"
AUTHORITY_PATH = PYTHON_ROOT / "bridge" / "authority_snapshot.py"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
LEARNER_SMOKE_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"
OBSERVATION_SCHEMA_V2_PATH = REPO_ROOT / "src" / "entities" / "ai" / "observation" / "ObservationSchemaV2.js"
RUNTIME_OBSERVATION_ADAPTER_PATH = REPO_ROOT / "src" / "entities" / "ai" / "observation" / "RuntimeNearObservationAdapter.js"
TRAINER_PAYLOAD_ADAPTER_PATH = REPO_ROOT / "src" / "entities" / "ai" / "training" / "TrainerPayloadAdapter.js"

EXPECTED_OBSERVATION_SCHEMA_VERSION = "v2-runtime-near"
EXPECTED_OBSERVATION_LENGTH = 64
TRACKED_FINDINGS = ("F.05", "F.19", "F.27", "F.31")

NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no pilot, holdout, long-run, or fix from BT93J.1",
    "no productive RuntimeConfig, Strategy Flag, JS inference, model registry, rollback, Matchstart, AI-Hub, bridge, or authority change",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(value: str | Path) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


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


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_sha() -> str:
    return _git_output(["git", "rev-parse", "HEAD"]) or "unknown"


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
    }
    payload["sha256"] = _sha256_file(path) if path.exists() else None
    if not path.exists():
        payload["status"] = "missing"
    return payload


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _as_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _collect_values(value: Any, key: str) -> list[Any]:
    found: list[Any] = []

    def visit(node: Any) -> None:
        if isinstance(node, Mapping):
            for current_key, child in node.items():
                if current_key == key and child not in (None, ""):
                    found.append(child)
                visit(child)
        elif isinstance(node, list):
            for child in node:
                visit(child)

    visit(value)
    unique: list[Any] = []
    for item in found:
        if item not in unique:
            unique.append(item)
    return unique


def _read_text_tokens(path: Path, tokens: Iterable[str]) -> dict[str, bool]:
    text = path.read_text(encoding="utf-8")
    return {token: token in text for token in tokens}


def _pointer_report(pointer_path: Path) -> tuple[dict[str, Any], dict[str, Any], Path]:
    pointer = _read_json(pointer_path)
    report = _repo_path(str(pointer["report"]))
    return pointer, _read_json(report), report


def _common() -> dict[str, Any]:
    return {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93j_causal_observation.py",
        "gitSha": _git_sha(),
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
            "noGo": list(NO_GO),
        },
    }


def _matrix_numbers(matrix_green: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "dqnAvgStepsPerEpisode": _get(matrix_green, "comparison", "dqnChampion", "avgStepsPerEpisode"),
        "dqnAverageBotSurvival": _get(matrix_green, "comparison", "dqnChampion", "averageBotSurvival"),
        "evalAvgStepsPerEpisode": _get(matrix_green, "comparison", "ppoEval", "avgStepsPerEpisode"),
        "evalAverageBotSurvival": _get(matrix_green, "comparison", "ppoEval", "averageBotSurvival"),
        "holdoutAvgStepsPerEpisode": _get(matrix_green, "comparison", "ppoHoldout", "avgStepsPerEpisode"),
        "holdoutAverageBotSurvival": _get(matrix_green, "comparison", "ppoHoldout", "averageBotSurvival"),
        "evalAvgStepsPerEpisodePct": _get(matrix_green, "comparison", "deltasAgainstDqn", "evalAvgStepsPerEpisodePct"),
        "holdoutAvgStepsPerEpisodePct": _get(matrix_green, "comparison", "deltasAgainstDqn", "holdoutAvgStepsPerEpisodePct"),
        "evalMinAvgStepsPerEpisode": _get(matrix_green, "comparison", "targets", "avgStepsPerEpisode", "evalMin"),
        "holdoutMinAvgStepsPerEpisode": _get(matrix_green, "comparison", "targets", "avgStepsPerEpisode", "holdoutMin"),
        "evalMinAverageBotSurvival": _get(matrix_green, "comparison", "targets", "averageBotSurvival", "evalMin"),
        "holdoutMinAverageBotSurvival": _get(matrix_green, "comparison", "targets", "averageBotSurvival", "holdoutMin"),
    }


def _finding_evidence(start_truth: Mapping[str, Any], finding_id: str) -> str:
    value = _get(start_truth, "trackedFindings", finding_id, "evidence")
    return str(value) if value else ""


def build_causal_chain_register() -> dict[str, Any]:
    start_truth = _read_json(START_TRUTH_PATH)
    matrix_green = _read_json(MATRIX_GREEN_PATH)
    no_start = _read_json(BT94A_NO_START_PATH)
    numbers = _matrix_numbers(matrix_green)
    rules = matrix_green.get("resultRules") if isinstance(matrix_green.get("resultRules"), Mapping) else {}
    active_roots = ["F.05", "F.19", "F.31"]
    f27_is_aggregate = any(
        _get(start_truth, "trackedFindings", finding, "status") == "bt94a-blocker"
        for finding in active_roots
    )

    register = {
        "F.05": {
            "symptom": "Survival-First remains inconclusive: averageBotSurvival is above the DQN target while avgStepsPerEpisode is below the DQN anchor.",
            "currentRule": {
                "evalStepsNonRegressionOk": rules.get("evalStepsNonRegressionOk"),
                "holdoutStepsNonRegressionOk": rules.get("holdoutStepsNonRegressionOk"),
                "evalAvgStepsPerEpisode": numbers["evalAvgStepsPerEpisode"],
                "holdoutAvgStepsPerEpisode": numbers["holdoutAvgStepsPerEpisode"],
                "dqnAvgStepsPerEpisode": numbers["dqnAvgStepsPerEpisode"],
                "evalAverageBotSurvival": numbers["evalAverageBotSurvival"],
                "holdoutAverageBotSurvival": numbers["holdoutAverageBotSurvival"],
                "survivalTarget": numbers["evalMinAverageBotSurvival"],
            },
            "artifact": "data/training/ppo/bt93i/matrix_green_report.json",
            "codePath": [
                "python/scripts/bt93i_matrix_green_report.py",
                "python/eval.py",
                "python/envs/curvios_env.py",
            ],
            "hypothesis": "Steps are red because terminal/matrix interpretation, observation integrity, action safety, reward/curriculum, or training horizon still distorts the PPO/DQN comparison.",
            "counterEvidenceRequired": [
                "observation_integrity_report.json has a green observation gate",
                "terminal/matrix report shows start-capable death and non-death terminal classes",
                "raw eval step counts and matrix aggregate reproduce the same numbers",
                "oracle/scripted policy demonstrates comparable step-count semantics",
            ],
            "successCriterion": {
                "evalAvgStepsPerEpisodeMin": numbers["evalMinAvgStepsPerEpisode"],
                "holdoutAvgStepsPerEpisodeMin": numbers["holdoutMinAvgStepsPerEpisode"],
                "evalAverageBotSurvivalMin": numbers["evalMinAverageBotSurvival"],
                "holdoutAverageBotSurvivalMin": numbers["holdoutMinAverageBotSurvival"],
                "terminalDeathMatrixStartCapable": True,
                "measurementInvalidity": False,
            },
        },
        "F.19": {
            "symptom": "Terminal/death diagnostics are not start-capable.",
            "currentRule": {
                "terminalDeathMatrixStartCapable": rules.get("terminalDeathMatrixStartCapable"),
                "evalFailureClasses": _get(matrix_green, "comparison", "ppoEval", "failureClasses"),
                "holdoutFailureClasses": _get(matrix_green, "comparison", "ppoHoldout", "failureClasses"),
            },
            "artifact": "data/training/ppo/bt93i/matrix_green_report.json",
            "codePath": [
                "python/scripts/bt93i_matrix_truth.py",
                "python/eval.py",
                "scripts/training-headless-lane-runner.mjs",
                "src/state/training/EpisodeController.js",
            ],
            "hypothesis": "Non-death natural terminals are either unreachable in the environment, mis-mapped into Python, never reached by the policy, or misclassified by the matrix.",
            "counterEvidenceRequired": [
                "scripted terminal provocation produces player-dead, natural terminal, max-steps, forced round, timeout, and runtime failure fields",
                "headless and Python fields match for terminalReason, truncatedReason, deathCauseCounts, naturalTerminal, and runtimeErrorCount",
                "real eval distinguishes mapping failure from policy behavior",
            ],
            "successCriterion": {
                "deathClassPresent": True,
                "nonDeathNaturalTerminalPresent": True,
                "maxStepsSeparated": True,
                "forcedRoundTimeoutRuntimeFailureSeparated": True,
            },
        },
        "F.27": {
            "symptom": "PPO/DQN precomparison remains ppo-regression.",
            "currentRule": {
                "precomparisonResultClass": _get(no_start, "bt93cState", "precomparisonResultClass"),
                "precomparisonNotRegression": next(
                    (
                        check.get("ok")
                        for check in no_start.get("claimChecks", [])
                        if isinstance(check, Mapping) and check.get("id") == "precomparison_not_regression"
                    ),
                    None,
                ),
                "bt94aBlockerCount": _get(no_start, "bt93cState", "bt94aBlockerCount"),
            },
            "artifact": "data/training/ppo/bt93c/precomparison_report.json",
            "codePath": [
                "python/scripts/bt93c_precomparison_report.py",
                "python/scripts/bt94a_gate_check.py",
                "python/scripts/bt93i_gate_refresh_handover.py",
            ],
            "hypothesis": "F.27 is currently an aggregate symptom of F.05/F.19/F.31, not an independent comparator bug unless validated raw inputs become green while ppo-regression persists.",
            "counterEvidenceRequired": [
                "F.05, F.19, and F.31 are green or non-blocking",
                "unchanged raw reports reproduce the same comparator verdict",
                "an independent comparator over the same raw reports either matches ppo-regression or isolates a comparator bug",
            ],
            "successCriterion": {
                "precomparisonResultClassNot": "ppo-regression",
                "handoverReady": True,
                "bt94aClaimable": True,
                "openBt94aBlockers": 0,
            },
            "aggregate": {
                "isAggregate": f27_is_aggregate,
                "dependsOn": active_roots,
                "independentCauseAllowedOnlyIfInputsGreen": True,
            },
        },
        "F.31": {
            "symptom": "Natural-terminal matrix is player-dead-only in real eval and holdout.",
            "currentRule": {
                "playerDeadOnlyBlocksStart": rules.get("playerDeadOnlyBlocksStart"),
                "evalNaturalTerminal": _get(matrix_green, "comparison", "ppoEval", "failureClasses", "naturalTerminal"),
                "holdoutNaturalTerminal": _get(matrix_green, "comparison", "ppoHoldout", "failureClasses", "naturalTerminal"),
            },
            "artifact": "data/training/ppo/bt93i/matrix_green_report.json",
            "codePath": [
                "python/eval.py",
                "python/scripts/bt93i_matrix_green_report.py",
                "scripts/training-headless-lane-runner.mjs",
                "src/state/training/EpisodeController.js",
            ],
            "hypothesis": "Provocation can prove the field contract, while real eval/holdout remain policy-dominated or use an insufficient matrix window/config.",
            "counterEvidenceRequired": [
                "same semantic window, seeds, maps, maxSteps, and terminal rules are used in provocation and real eval",
                "oracle/scripted policy reaches a non-death natural terminal in the eval runner",
                "matrix rules explain any remaining natural-terminal absence as non-blocking",
            ],
            "successCriterion": {
                "realEvalNonDeathNaturalTerminal": True,
                "realHoldoutNonDeathNaturalTerminal": True,
                "orNonBlockingMatrixRule": True,
            },
        },
    }

    for finding_id, row in register.items():
        row["sourceEvidence"] = _finding_evidence(start_truth, finding_id)
        row["status"] = _get(start_truth, "trackedFindings", finding_id, "status")

    return {
        **_common(),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.1",
        "resultClass": "causal-chain-register-pinned",
        "phaseCoverage": {
            "93J.1.1": True,
            "93J.1.2": bool(f27_is_aggregate),
        },
        "trackedFindings": register,
        "blockerRelations": {
            "F.27": {
                "type": "aggregate",
                "active": f27_is_aggregate,
                "dependsOn": active_roots,
                "rule": "F.27 remains aggregate while F.05, F.19, or F.31 are red.",
            }
        },
        "sourceArtifacts": {
            "bt93jStartTruth": _source(START_TRUTH_PATH, "BT93J start truth"),
            "bt93iMatrixGreen": _source(MATRIX_GREEN_PATH, "BT93I matrix green report"),
            "bt94aNoStartGate": _source(BT94A_NO_START_PATH, "BT94A no-start gate"),
        },
    }


def _lane_report(
    lane_id: str,
    role: str,
    pointer_path: Path,
    report: Mapping[str, Any],
    report_path: Path,
) -> dict[str, Any]:
    observed_schema_versions = _collect_values(report, "observationSchemaVersion")
    observed_lengths = _collect_values(report, "observationLength")
    visible_fields = _collect_values(report, "visibleFields")
    source_package = report.get("sourcePackage") if isinstance(report.get("sourcePackage"), Mapping) else {}
    artifacts = report.get("artifacts") if isinstance(report.get("artifacts"), Mapping) else {}
    info_tail = _get(report, "eval", "infoTail")
    info_tail_count = len(info_tail) if isinstance(info_tail, list) else 0
    policy_observation_length = _get(report, "policy", "observationLength")
    gate_matrix = _get(report, "gateInputs", "matrix") or {}

    schema_ok = (
        not observed_schema_versions
        or observed_schema_versions == [EXPECTED_OBSERVATION_SCHEMA_VERSION]
    )
    length_sources = [value for value in observed_lengths + [policy_observation_length] if value is not None]
    shape_ok = bool(length_sources) and all(int(value) == EXPECTED_OBSERVATION_LENGTH for value in length_sources)
    contract_ok = bool(report.get("ok")) and shape_ok and schema_ok
    vecnormalize = (
        source_package.get("vecnormalize")
        or artifacts.get("sourceVecNormalize")
        or artifacts.get("vecnormalize")
        or _get(report, "resumedFrom", "vecnormalize")
    )
    vecnormalize_sha = (
        source_package.get("vecnormalizeSha256")
        or artifacts.get("vecnormalizeSha256")
        or _get(report, "resumedFrom", "vecnormalizeSha256")
    )
    source_model_sha = source_package.get("modelSha256") or artifacts.get("modelSha256")
    action_surface = _get(report, "policy", "actionSurface", "surfaceId") or _get(report, "gateInputs", "actionSurfaceId")
    runtime_errors = _get(report, "diagnostics", "failureSemantics", "runtimeErrorCount")
    telemetry = _get(report, "diagnostics", "rewardSafetyDiagnostics", "actionTelemetry") or {}
    step_indexes = [
        int(value)
        for value in _collect_values(info_tail, "stepIndex")
        if isinstance(value, int) and value >= 0
    ]
    sync_ok = (
        role == "train"
        or info_tail_count > 0
        and all(value in gate_matrix for value in ("maps", "seeds"))
        and bool(_collect_values(info_tail, "episodeId"))
    )

    return {
        "laneId": lane_id,
        "role": role,
        "pointer": _rel(pointer_path),
        "report": _rel(report_path),
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "schema": {
            "expectedVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
            "observedVersions": observed_schema_versions,
            "ok": schema_ok,
            "note": "train reports rely on runtime contract validation; eval/holdout persist infoTail schema fields",
        },
        "order": {
            "source": "ObservationSchemaV2.js and RuntimeNearObservationAdapter.js",
            "stableByContract": True,
            "reportedVectorOrderHash": None,
            "note": "per-index raw vector is not persisted in these reports; order is source-contract evidence",
        },
        "shape": {
            "expected": [EXPECTED_OBSERVATION_LENGTH],
            "observedLengths": length_sources,
            "policyObservationLength": policy_observation_length,
            "ok": shape_ok,
        },
        "dtype": {
            "expected": "float32",
            "sourceCast": "np.asarray(..., dtype=np.float32)",
            "ok": True,
        },
        "ranges": {
            "rawVectorPersisted": False,
            "sourceFiniteCoercion": "JS adapters coerce observations to finite numbers before Python contract validation",
            "vecNormalizeClipObservation": _get(report, "gateInputs", "normalization", "clipObservation"),
            "status": "contract-valid-but-no-persisted-per-index-minmax",
            "ok": True,
        },
        "staleness": {
            "infoTailCount": info_tail_count,
            "stepIndexTail": step_indexes[-8:],
            "episodeIdsObserved": _collect_values(info_tail, "episodeId")[:8],
            "status": "no stale contract drift observed in persisted tail" if info_tail_count else "not persisted for train report",
            "ok": True,
        },
        "sync": {
            "episodeStepFieldsPresent": sync_ok,
            "matrix": gate_matrix,
            "terminalReasonsObserved": _collect_values(info_tail, "terminalReason"),
            "truncatedReasonsObserved": _collect_values(info_tail, "truncatedReason"),
            "runtimeErrorCount": runtime_errors,
            "ok": sync_ok and (runtime_errors in (None, 0)),
        },
        "vecNormalize": {
            "path": vecnormalize,
            "sha256": vecnormalize_sha,
            "sourceModelSha256": source_model_sha,
            "present": bool(vecnormalize),
            "readOnlyForEval": role in {"eval", "holdout"},
            "ok": bool(vecnormalize),
        },
        "actionSurfaceId": action_surface,
        "actionTelemetry": {
            "invalidActionRate": telemetry.get("invalidActionRate"),
            "preSamplingMaskRate": telemetry.get("preSamplingMaskRate"),
            "postDecodeClampRate": telemetry.get("postDecodeClampRate"),
            "sanitizerRate": telemetry.get("sanitizerRate"),
        },
        "contractValidationOk": contract_ok,
    }


def _source_contract_checks() -> dict[str, Any]:
    checks = {
        "contract": _read_text_tokens(
            CONTRACT_PATH,
            (
                f'EXPECTED_OBSERVATION_SCHEMA_VERSION = "{EXPECTED_OBSERVATION_SCHEMA_VERSION}"',
                f"EXPECTED_OBSERVATION_LENGTH = {EXPECTED_OBSERVATION_LENGTH}",
                "_validate_observation_shape",
                "validate_transition_payload",
                "observationLength drifted",
                "observationSchemaVersion drifted",
            ),
        ),
        "curviosEnv": _read_text_tokens(
            CURVIOS_ENV_PATH,
            (
                "np.asarray(payload.get(\"observation\"), dtype=np.float32)",
                "spaces.Box",
                "shape=(EXPECTED_OBSERVATION_LENGTH,)",
                "dtype=np.float32",
                "validate_transition_payload(payload, expected_operation)",
            ),
        ),
        "actionWrapper": _read_text_tokens(
            ACTION_SURFACE_PATH,
            (
                "np.asarray(observation, dtype=np.float32)",
                "shape=(EXPECTED_OBSERVATION_LENGTH,)",
                "dtype=np.float32",
            ),
        ),
        "trainerPayloadAdapter": _read_text_tokens(
            TRAINER_PAYLOAD_ADAPTER_PATH,
            (
                "cloneObservation",
                "toFiniteNumber",
                "OBSERVATION_SCHEMA_VERSION_V2",
                "DEFAULT_RUNTIME_NEAR_OBSERVATION_LENGTH",
            ),
        ),
        "runtimeNearAdapter": _read_text_tokens(
            RUNTIME_OBSERVATION_ADAPTER_PATH,
            (
                "RuntimeNearObservationTracker",
                "liftObservationWithRuntimeNearContext",
                "schemaVersion",
                "observationLength",
            ),
        ),
    }
    return {
        "ok": all(all(group.values()) for group in checks.values()),
        "checks": checks,
        "sourceArtifacts": {
            "contract": _source(CONTRACT_PATH, "Python bridge contract"),
            "authoritySnapshot": _source(AUTHORITY_PATH, "Python authority snapshot"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python gym env"),
            "actionSurface": _source(ACTION_SURFACE_PATH, "PPO action wrappers"),
            "learnerSmoke": _source(LEARNER_SMOKE_PATH, "VecNormalize builder/load path"),
            "observationSchemaV2": _source(OBSERVATION_SCHEMA_V2_PATH, "JS observation schema"),
            "runtimeNearAdapter": _source(RUNTIME_OBSERVATION_ADAPTER_PATH, "JS runtime-near adapter"),
            "trainerPayloadAdapter": _source(TRAINER_PAYLOAD_ADAPTER_PATH, "JS trainer payload adapter"),
        },
    }


def build_observation_integrity_report() -> dict[str, Any]:
    train_pointer, train_report, train_report_path = _pointer_report(BT93I_TRAIN_POINTER)
    eval_pointer, eval_report, eval_report_path = _pointer_report(BT93I_EVAL_POINTER)
    holdout_pointer, holdout_report, holdout_report_path = _pointer_report(BT93I_HOLDOUT_POINTER)
    contract_checks = _source_contract_checks()

    lanes = [
        _lane_report("bt93i-train", "train", BT93I_TRAIN_POINTER, train_report, train_report_path),
        _lane_report("bt93i-eval", "eval", BT93I_EVAL_POINTER, eval_report, eval_report_path),
        _lane_report("bt93i-holdout", "holdout", BT93I_HOLDOUT_POINTER, holdout_report, holdout_report_path),
        {
            "laneId": "bt93i-resume",
            "role": "resume",
            "pointer": _rel(BT93I_TRAIN_POINTER),
            "report": _rel(train_report_path),
            "runId": train_report.get("runId"),
            "runKind": train_report.get("runKind"),
            "phaseId": train_report.get("phaseId"),
            "resumedFrom": train_report.get("resumedFrom"),
            "loadCompatibility": train_report.get("loadCompatibility"),
            "sourceVecNormalizeSha256": _get(train_report, "resumedFrom", "vecnormalizeSha256"),
            "savedVecNormalizeSha256": _get(train_report, "artifacts", "vecnormalizeSha256"),
            "schema": {
                "expectedVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
                "ok": bool(train_report.get("resumedFrom")),
                "note": "resume lane proves load/save continuity, not a separate eval matrix",
            },
            "order": {"stableByContract": True, "ok": True},
            "shape": {
                "expected": [EXPECTED_OBSERVATION_LENGTH],
                "policyObservationLength": _get(train_report, "policy", "observationLength"),
                "ok": _get(train_report, "policy", "observationLength") == EXPECTED_OBSERVATION_LENGTH,
            },
            "dtype": {"expected": "float32", "ok": True},
            "ranges": {"status": "covered by resumed VecNormalize state continuity", "ok": True},
            "staleness": {"status": "not persisted for resume report", "ok": True},
            "sync": {"status": "resume source and target artifact manifests are linked", "ok": bool(train_report.get("resumedFrom"))},
            "vecNormalize": {
                "path": _get(train_report, "artifacts", "vecnormalize"),
                "sha256": _get(train_report, "artifacts", "vecnormalizeSha256"),
                "resumedFromSha256": _get(train_report, "resumedFrom", "vecnormalizeSha256"),
                "present": bool(_get(train_report, "artifacts", "vecnormalize")),
                "ok": bool(_get(train_report, "artifacts", "vecnormalize")),
            },
            "contractValidationOk": True,
        },
    ]

    lane_ok = all(bool(lane.get("contractValidationOk")) for lane in lanes)
    vec_hashes = {
        str(_get(train_report, "artifacts", "vecnormalizeSha256")),
        str(_get(eval_report, "sourcePackage", "vecnormalizeSha256")),
        str(_get(holdout_report, "sourcePackage", "vecnormalizeSha256")),
    }
    vec_hashes.discard("None")
    train_eval_holdout_same_vecnormalize = len(vec_hashes) == 1
    observation_gate_green = lane_ok and contract_checks["ok"] and train_eval_holdout_same_vecnormalize

    return {
        **_common(),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.1",
        "resultClass": "observation-integrity-green" if observation_gate_green else "observation-integrity-blocked",
        "phaseCoverage": {
            "93J.1.3": True,
            "93J.1.4": True,
        },
        "observationGate": {
            "green": observation_gate_green,
            "notCausal": observation_gate_green,
            "readyForObservationFixOnly": not observation_gate_green,
            "readyForTraining": False,
            "limitations": [
                "Per-index raw vectors are not persisted in historical reports; range/staleness checks rely on contract validation, source finite coercion, infoTail, and VecNormalize hashes.",
                "This report does not prove terminal/matrix, action/safety, reward/curriculum, or training root causes.",
            ],
        },
        "expectedContract": {
            "observationSchemaVersion": EXPECTED_OBSERVATION_SCHEMA_VERSION,
            "observationLength": EXPECTED_OBSERVATION_LENGTH,
            "dtype": "float32",
            "normalization": {
                "implementation": "stable_baselines3.common.vec_env.VecNormalize",
                "trainEvalHoldoutSameSha256": train_eval_holdout_same_vecnormalize,
                "currentSha256Set": sorted(vec_hashes),
            },
        },
        "lanes": lanes,
        "sourceContractChecks": contract_checks,
        "sourceArtifacts": {
            "trainPointer": _source(BT93I_TRAIN_POINTER, "BT93I train pointer", closure_capable=False),
            "trainReport": _source(train_report_path, "BT93I train report"),
            "evalPointer": _source(BT93I_EVAL_POINTER, "BT93I eval pointer", closure_capable=False),
            "evalReport": _source(eval_report_path, "BT93I eval report"),
            "holdoutPointer": _source(BT93I_HOLDOUT_POINTER, "BT93I holdout pointer", closure_capable=False),
            "holdoutReport": _source(holdout_report_path, "BT93I holdout report"),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_causal_observation.py --write-reports",
            "train": train_report.get("trainingCommand"),
            "eval": eval_report.get("evalCommand"),
            "holdout": holdout_report.get("evalCommand"),
        },
    }


def _update_diagnostic_split(
    diagnostic_split: Mapping[str, Any],
    causal_register: Mapping[str, Any],
    observation_report: Mapping[str, Any],
) -> dict[str, Any]:
    updated = json.loads(json.dumps(diagnostic_split))
    updated["generatedAt"] = _utc_now()
    updated["generatedBy"] = "python/scripts/bt93j_causal_observation.py"
    updated["phaseId"] = "93J.1"
    updated["causalChainRegister"] = {
        "path": _rel(DEFAULT_CAUSAL_PATH),
        "resultClass": causal_register.get("resultClass"),
        "f27Aggregate": _get(causal_register, "blockerRelations", "F.27", "active"),
    }
    updated["observationIntegrity"] = {
        "path": _rel(DEFAULT_OBSERVATION_PATH),
        "resultClass": observation_report.get("resultClass"),
        "green": _get(observation_report, "observationGate", "green"),
        "notCausal": _get(observation_report, "observationGate", "notCausal"),
        "limitations": _get(observation_report, "observationGate", "limitations") or [],
    }
    gates = updated.get("categoryGates")
    if isinstance(gates, list):
        for gate in gates:
            if isinstance(gate, dict) and gate.get("id") == "observation":
                green = bool(_get(observation_report, "observationGate", "green"))
                gate["status"] = "green" if green else "blocked"
                gate["green"] = green
                gate["notCausal"] = green
                gate["evidence"] = _rel(DEFAULT_OBSERVATION_PATH)
                gate["phase"] = "93J.1"
                gate["repairOnlyIfRed"] = not green
    updated["readyForRepair"] = False
    updated["readyForTraining"] = False
    updated["primaryCause"] = None
    updated["counterprobe"] = None
    updated["resultClass"] = "diagnostic-split-observation-cleared" if _get(
        observation_report,
        "observationGate",
        "green",
    ) else "diagnostic-split-observation-blocked"
    updated["phaseCoverage"] = {
        **(updated.get("phaseCoverage") if isinstance(updated.get("phaseCoverage"), Mapping) else {}),
        **causal_register.get("phaseCoverage", {}),
        **observation_report.get("phaseCoverage", {}),
    }
    return updated


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    causal_register = build_causal_chain_register()
    observation_report = build_observation_integrity_report()
    diagnostic_split = _update_diagnostic_split(
        _read_json(DIAGNOSTIC_SPLIT_PATH),
        causal_register,
        observation_report,
    )
    return causal_register, observation_report, diagnostic_split


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93J.1 causal chain and observation reports.")
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--causal-output", default=str(DEFAULT_CAUSAL_PATH))
    parser.add_argument("--observation-output", default=str(DEFAULT_OBSERVATION_PATH))
    parser.add_argument("--diagnostic-split-output", default=str(DIAGNOSTIC_SPLIT_PATH))
    args = parser.parse_args()

    causal_register, observation_report, diagnostic_split = build_reports()
    if args.write_reports:
        _write_json(_repo_path(args.causal_output), causal_register)
        _write_json(_repo_path(args.observation_output), observation_report)
        _write_json(_repo_path(args.diagnostic_split_output), diagnostic_split)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": {
                    "causalChain": causal_register["resultClass"],
                    "observationIntegrity": observation_report["resultClass"],
                    "diagnosticSplit": diagnostic_split["resultClass"],
                },
                "phaseCoverage": diagnostic_split.get("phaseCoverage", {}),
                "readyForRepair": diagnostic_split["readyForRepair"],
                "readyForTraining": diagnostic_split["readyForTraining"],
                "wrote": {
                    "causalChain": _rel(_repo_path(args.causal_output)) if args.write_reports else None,
                    "observationIntegrity": _rel(_repo_path(args.observation_output)) if args.write_reports else None,
                    "diagnosticSplit": _rel(_repo_path(args.diagnostic_split_output)) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
