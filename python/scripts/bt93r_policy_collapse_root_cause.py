"""BT93R.3 policy-collapse root-cause classifier.

This script is report-only. It does not train, evaluate a PPO model, apply
fixes, consume holdout data, create candidates, or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import ast
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93R_ROOT = PPO_ROOT / "bt93r"
OUTPUT_PATH = BT93R_ROOT / "policy_collapse_root_cause_report.json"

SOURCE_PATHS: dict[str, tuple[Path, str]] = {
    "bt93rHandoverLock": (
        BT93R_ROOT / "bt93r_handover_lock_report.json",
        "BT93R.1 handover lock",
    ),
    "bt93rPolicyArtifact": (
        BT93R_ROOT / "policy_artifact_report.json",
        "BT93R.2 policy artifact capability report",
    ),
    "bt93qPolicyCollapse": (
        PPO_ROOT / "bt93q" / "policy_collapse_report.json",
        "BT93Q deterministic policy-collapse evidence",
    ),
    "bt93nMicroPpoRepeat": (
        PPO_ROOT / "bt93n" / "micro_ppo_repeat_report.json",
        "BT93N 10k micro-PPO source run",
    ),
    "ppoActionSurface": (
        REPO_ROOT / "python" / "envs" / "ppo_action_surface.py",
        "current PPO action-surface source",
    ),
}

COMMON_BLOCKED_ACTIONS = [
    "93R.4 decoder/normalize/eval-mode fix without restored selected BT93N lineage",
    "BT93S until 93R.99 reaches R-Allowlist",
    "BT93O claim",
    "BT93P claim",
    "BT94A claim",
    "candidate run",
    "freeze candidate",
    "holdout consumption",
    "promote",
    "rollout",
    "PPO-Validate or BT95 handoff signal",
    "50k/100k/200k/500k/1M extension",
]

ROOT_CAUSE_CLASSES = [
    "eval-argmax-collapse",
    "model-artifact-missing",
    "decoder-bug",
    "normalize-mismatch",
    "reward-pressure-collapse",
    "action-selection-blindness",
    "entropy-config-collapse",
    "reward-scale-collapse",
    "rollout-bootstrap-drift",
    "action-repeat-or-seed-correlation",
    "truncation-terminal-bias",
    "measurement-invalid",
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
    output = _git_output(args)
    return [line.strip().replace("\\", "/") for line in output.splitlines() if line.strip()]


def _tracked_files(paths: Iterable[Path | None]) -> set[str]:
    rel_paths = [_rel(path) for path in paths if path is not None]
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


def _number(value: Any, fallback: float | None = None) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _literal_assignment(path: Path, name: str) -> Any:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (OSError, SyntaxError):
        return None
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(target, ast.Name) and target.id == name for target in node.targets):
            continue
        try:
            return ast.literal_eval(node.value)
        except (ValueError, SyntaxError):
            return None
    return None


def _artifact(path: Path, role: str, tracked: set[str], *, key: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "key": key,
        "path": rel_path,
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "tracked": rel_path in tracked if rel_path else False,
        "sha256": _sha256_file(path),
        "sizeBytes": path.stat().st_size if path.is_file() else None,
        "schemaVersion": payload.get("schemaVersion") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _source_artifacts(tracked: set[str]) -> list[dict[str, Any]]:
    return [
        {"sourceKey": key, **_artifact(path, role, tracked, key=key)}
        for key, (path, role) in SOURCE_PATHS.items()
    ]


def _semantic_actions_from_source(path: Path) -> list[str]:
    semantic_actions = _literal_assignment(path, "MASKED_SEMANTIC_ACTIONS") or ()
    return [str(item[0]) for item in semantic_actions if isinstance(item, tuple) and item]


def _surface_ids_from_source(path: Path) -> dict[str, Any]:
    return {
        "multiDiscrete": _literal_assignment(path, "PPO_ACTION_SURFACE_ID"),
        "maskedSemantic": _literal_assignment(path, "PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID"),
    }


def _token_mapping(token: Any, actions: list[str]) -> dict[str, Any]:
    try:
        index = int(token)
    except (TypeError, ValueError):
        index = None
    zero_based = actions[index] if index is not None and 0 <= index < len(actions) else None
    one_based = actions[index - 1] if index is not None and 1 <= index <= len(actions) else None
    return {
        "token": str(token) if token is not None else None,
        "zeroBasedAction": zero_based,
        "oneBasedAction": one_based,
        "zeroBasedIndexValid": zero_based is not None,
        "oneBasedIndexValid": one_based is not None,
    }


def _claim_flags() -> dict[str, bool]:
    return {
        "qualityClaimAllowed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "holdoutConsumptionAllowed": False,
        "promoteAllowed": False,
        "rolloutAllowed": False,
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
        "newEvalRunStarted": False,
        "fixApplied": False,
        "candidateRun": False,
        "freezeCandidate": False,
        "holdoutUsed": False,
        "bt93oClaimAllowed": False,
        "bt93pClaimAllowed": False,
        "bt94aClaimAllowed": False,
        "candidateRunsAllowed": False,
        "candidateFreezeAllowed": False,
        "qualityClaimAllowed": False,
        "promotionAllowed": False,
        "rolloutAllowed": False,
        "ppoValidateSignal": False,
        "productiveRuntimeChanged": False,
        "runtimeSurfacesTouched": [],
    }


def _candidate(
    root_class: str,
    *,
    selected: bool,
    status: str,
    evidence: list[str],
    next_action: str,
) -> dict[str, Any]:
    if root_class not in ROOT_CAUSE_CLASSES:
        raise ValueError(f"unknown root cause class: {root_class}")
    return {
        "class": root_class,
        "selected": selected,
        "status": status,
        "evidence": evidence,
        "nextAction": next_action,
    }


def build_report() -> dict[str, Any]:
    handover = _read_json(SOURCE_PATHS["bt93rHandoverLock"][0])
    artifact_report = _read_json(SOURCE_PATHS["bt93rPolicyArtifact"][0])
    policy_report = _read_json(SOURCE_PATHS["bt93qPolicyCollapse"][0])
    micro_report = _read_json(SOURCE_PATHS["bt93nMicroPpoRepeat"][0])

    tracked = _tracked_files([path for path, _role in SOURCE_PATHS.values()])
    source_artifacts = _source_artifacts(tracked)

    current_action_surface_path = SOURCE_PATHS["ppoActionSurface"][0]
    current_actions = _semantic_actions_from_source(current_action_surface_path)
    policy_actions = list(_get(artifact_report, "actionSurface", "policyEvidence", "semanticActions") or [])
    current_surface_hash = _sha256_file(current_action_surface_path)
    policy_surface_hash = _get(artifact_report, "actionSurface", "policyEvidence", "sourceSha256")
    action_surface_drift = bool(_get(artifact_report, "actionSurface", "lineage", "driftDetected"))
    action_surface = {
        "current": {
            "path": _rel(current_action_surface_path),
            "sha256": current_surface_hash,
            "surfaceIds": _surface_ids_from_source(current_action_surface_path),
            "actionCount": len(current_actions),
            "semanticActions": current_actions,
        },
        "policyEvidence": {
            "path": _get(artifact_report, "actionSurface", "policyEvidence", "path"),
            "sha256": policy_surface_hash,
            "actionCount": _get(artifact_report, "actionSurface", "policyEvidence", "actionCount"),
            "semanticActions": policy_actions,
        },
        "driftDetected": action_surface_drift,
    }

    deterministic_distribution = _get(artifact_report, "evalLogitEvidence", "deterministic", "distribution")
    deterministic_distribution = (
        deterministic_distribution if isinstance(deterministic_distribution, Mapping) else {}
    )
    stochastic_distribution = _get(artifact_report, "evalLogitEvidence", "stochastic", "distribution")
    stochastic_distribution = stochastic_distribution if isinstance(stochastic_distribution, Mapping) else {}
    argmax_token = deterministic_distribution.get("argmaxToken")
    dominant_action = deterministic_distribution.get("argmaxAction")
    current_token_mapping = _token_mapping(argmax_token, current_actions)
    policy_token_mapping = _token_mapping(argmax_token, policy_actions)
    token_mapping_consistent = (
        current_token_mapping["zeroBasedAction"] == dominant_action
        and policy_token_mapping["zeroBasedAction"] == dominant_action
    )
    decoder_mapping = {
        "argmaxToken": argmax_token,
        "argmaxActionFromEvidence": dominant_action,
        "currentSurfaceZeroBased": current_token_mapping,
        "policyEvidenceSurfaceZeroBased": policy_token_mapping,
        "tokenMappingConsistentForObservedArgmax": token_mapping_consistent,
        "decoderBugProven": False,
        "decoderBugReason": (
            "Token 2 maps to yaw-right in both current and BT93Q policy-evidence action lists; "
            "the blocker is lineage drift plus missing selected policy artifacts, not a proven off-by-one decoder bug."
        ),
    }

    missing_artifact_keys = list(_get(artifact_report, "selectedPolicyLineage", "missingRequiredArtifactKeys") or [])
    model_package_missing = bool(missing_artifact_keys)
    real_logits_available = bool(_get(artifact_report, "evalLogitEvidence", "realModelLogitsAvailable"))
    deterministic_repeated_streak = _number(
        _get(artifact_report, "summary", "deterministicRepeatedActionStreakLowerBound"),
        0,
    )
    deterministic_single_action_share = _number(
        _get(artifact_report, "evalLogitEvidence", "deterministic", "singleActionEvalShare"),
        0,
    )
    deterministic_collapse_observed = deterministic_single_action_share == 1.0 or deterministic_repeated_streak >= 2700
    stochastic_normalized_entropy = _number(stochastic_distribution.get("normalizedEntropy"), None)
    stochastic_broad = stochastic_normalized_entropy is not None and stochastic_normalized_entropy >= 0.9

    counterprobe_separation = {
        "identicalSeedMatrixRunExecuted": False,
        "notExecutedReason": (
            "Selected BT93N model/config/vecnormalize are missing; running deterministic/stochastic counterprobes "
            "would create non-lineage evidence."
        ),
        "deterministicEval": {
            "source": _get(artifact_report, "evalLogitEvidence", "deterministic", "source"),
            "argmaxAction": dominant_action,
            "singleActionEvalShare": deterministic_single_action_share,
            "repeatedActionStreakLowerBound": deterministic_repeated_streak,
            "collapseObserved": deterministic_collapse_observed,
        },
        "stochasticTrain": {
            "source": _get(artifact_report, "evalLogitEvidence", "stochastic", "source"),
            "argmaxAction": stochastic_distribution.get("argmaxAction"),
            "normalizedEntropy": stochastic_normalized_entropy,
            "broadDistributionObserved": stochastic_broad,
        },
        "stochasticEval": {
            "available": False,
            "reason": "No loadable selected model/logit artifact exists for same-seed stochastic eval.",
        },
        "normalizeEvalTemperatureSeedTruncation": {
            "normalizeStateComparable": False,
            "evalModeComparable": False,
            "temperatureComparable": False,
            "seedComparable": False,
            "truncationComparable": False,
            "reason": "Config, VecNormalize and real logits/probs are unavailable for the selected BT93N policy lineage.",
        },
    }

    selected_root_cause = "model-artifact-missing"
    result_class = "model-artifact-missing"
    if not model_package_missing and action_surface_drift:
        selected_root_cause = "measurement-invalid"
        result_class = "policy-evidence-invalid"
    elif not model_package_missing and not action_surface_drift and deterministic_collapse_observed:
        selected_root_cause = "eval-argmax-collapse"
        result_class = "policy-collapse-active"

    candidates = [
        _candidate(
            "eval-argmax-collapse",
            selected=selected_root_cause == "eval-argmax-collapse",
            status="observed-but-not-selected" if selected_root_cause != "eval-argmax-collapse" else "selected-red",
            evidence=[
                "deterministic eval is single-action yaw-right in BT93Q/BT93N count evidence",
                "real model logits are unavailable, so a fixable eval-mode bug is not proven",
            ],
            next_action="Do not implement eval-mode fix without restored selected model/logit evidence.",
        ),
        _candidate(
            "model-artifact-missing",
            selected=selected_root_cause == "model-artifact-missing",
            status="selected-red" if selected_root_cause == "model-artifact-missing" else "rejected",
            evidence=[
                f"missing selected BT93N artifact keys: {', '.join(missing_artifact_keys) or 'none'}",
                "real logits/probs and VecNormalize comparison are unavailable for the selected policy lineage",
            ],
            next_action="Recover or regenerate the exact selected BT93N package before any decoder/normalize/eval fix.",
        ),
        _candidate(
            "decoder-bug",
            selected=False,
            status="not-proven",
            evidence=[
                "token 2 maps to yaw-right under zero-based mapping in current and policy-evidence action lists",
                "action-surface hash drift exists but does not prove a decoder bug for the observed argmax token",
            ],
            next_action="Keep decoder fix blocked unless a loadable lineage package shows an index mismatch.",
        ),
        _candidate(
            "normalize-mismatch",
            selected=False,
            status="untestable",
            evidence=[
                "selected BT93N vecnormalize artifact is missing",
                "normalize/config drift cannot be separated from missing lineage",
            ],
            next_action="Restore vecnormalize/config first; then classify drift in a fresh lineage-valid counterprobe.",
        ),
        _candidate(
            "reward-pressure-collapse",
            selected=False,
            status="deferred-to-bt93u",
            evidence=["BT93Q reward ordering remains red, but reward fixes are forbidden in BT93R."],
            next_action="Keep reward ordering for BT93U after BT93R/S/T gates.",
        ),
        _candidate(
            "action-selection-blindness",
            selected=False,
            status="deferred-to-bt93s",
            evidence=["BT93Q action-space/action-selection blockers are active, but action fixes are forbidden in BT93R."],
            next_action="Keep action-effect and action-selection work for BT93S.",
        ),
        _candidate(
            "entropy-config-collapse",
            selected=False,
            status="not-proven",
            evidence=[
                "stochastic train normalized entropy is broad in count evidence",
                "real logits/KL/value/advantage data are unavailable",
            ],
            next_action="Do not tune entropy config without a lineage-valid mini-repro.",
        ),
        _candidate(
            "reward-scale-collapse",
            selected=False,
            status="deferred-to-bt93u",
            evidence=["No BT93R-owned reward-scale evidence exists; reward-scale work belongs to reward ordering."],
            next_action="Defer to BT93U if reward ordering remains red.",
        ),
        _candidate(
            "rollout-bootstrap-drift",
            selected=False,
            status="not-proven",
            evidence=["No loadable selected model package or rollout/bootstrap trace exists for BT93R.3."],
            next_action="Do not infer rollout drift from proxy counts.",
        ),
        _candidate(
            "action-repeat-or-seed-correlation",
            selected=False,
            status="observed-but-not-causal",
            evidence=[
                "repeated-action streak is observed across eval seeds",
                "seed/temperature/truncation separation is impossible without selected artifacts",
            ],
            next_action="Treat as symptom, not fix class, until lineage-valid counterprobe exists.",
        ),
        _candidate(
            "truncation-terminal-bias",
            selected=False,
            status="not-proven",
            evidence=["Terminal/truncation evidence is not separable from the missing policy package in BT93R.3."],
            next_action="Keep terminal sanity for BT93V unless a BT93R lineage-valid repro proves eval truncation bias.",
        ),
        _candidate(
            "measurement-invalid",
            selected=selected_root_cause == "measurement-invalid",
            status="secondary-blocker" if selected_root_cause != "measurement-invalid" else "selected-red",
            evidence=[
                "current action-surface hash/action count drift from BT93Q policy evidence",
                "measurement remains invalid for fix proof until selected model/config/vecnormalize/surface hash align",
            ],
            next_action="Use as closure blocker if model package is restored but surface lineage still drifts.",
        ),
    ]
    selected_candidates = [item["class"] for item in candidates if item["selected"]]

    phase_coverage = {
        "93R.3.1": bool(decoder_mapping) and decoder_mapping["argmaxToken"] is not None,
        "93R.3.2": bool(counterprobe_separation)
        and counterprobe_separation["identicalSeedMatrixRunExecuted"] is False
        and bool(counterprobe_separation["notExecutedReason"]),
        "93R.3.3": len(selected_candidates) == 1
        and selected_candidates[0] in ROOT_CAUSE_CLASSES
        and result_class in {"model-artifact-missing", "policy-evidence-invalid", "policy-collapse-active"},
    }
    dod_coverage = {
        "DoD.R3": all(phase_coverage.values())
        and bool(candidates)
        and bool(decoder_mapping)
        and bool(counterprobe_separation),
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())

    return {
        "schemaVersion": "bt93r-policy-collapse-root-cause-report-v1",
        "ok": ok,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93r_policy_collapse_root_cause.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "BT93R",
        "phaseId": "93R.3",
        "resultClass": result_class,
        "matrixId": handover.get("matrixId") or artifact_report.get("matrixId") or policy_report.get("matrixId"),
        "semanticWindow": handover.get("semanticWindow")
        or artifact_report.get("semanticWindow")
        or policy_report.get("semanticWindow"),
        "policyIds": artifact_report.get("policyIds") or policy_report.get("policyIds"),
        "sourceArtifacts": source_artifacts,
        "sourceFilesReady": all(item["exists"] and item["isFile"] for item in source_artifacts),
        "sourceFilesVersioned": all(item["tracked"] for item in source_artifacts),
        "rootCauseClassification": {
            "selectedClass": selected_root_cause,
            "selectedClassCount": len(selected_candidates),
            "selectedClasses": selected_candidates,
            "redClosurePrepared": result_class in {
                "model-artifact-missing",
                "policy-evidence-invalid",
                "policy-collapse-active",
            },
            "fixClassPinned": None,
            "fixImplementationAllowed": False,
            "why": (
                "The selected BT93N policy package is missing model/config/vecnormalize, so decoder, normalize "
                "and eval-mode fixes cannot be proven against the policy that produced the collapse."
            ),
        },
        "actionSurface": action_surface,
        "decoderActionMapping": decoder_mapping,
        "counterprobeSeparation": counterprobe_separation,
        "candidateRootCauses": candidates,
        "artifactLineage": {
            "selectedPolicySource": "data/training/ppo/bt93n/micro_ppo_repeat_report.json",
            "missingRequiredArtifactKeys": missing_artifact_keys,
            "modelPackagePersisted": bool(_get(artifact_report, "artifactCapability", "modelPackagePersisted")),
            "realModelLogitsAvailable": real_logits_available,
            "actionSurfaceDriftDetected": action_surface_drift,
            "surfaceHashRestorationRequired": True,
        },
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "thresholdsLockedBeforeRun": {
            "notApplicableReason": "93R.3 is a report-only root-cause classifier and runs no new PPO eval/training sample.",
            "afterTheFactThresholdChangesAllowed": False,
        },
        "sampleCounts": {
            "newTrainingEpisodes": 0,
            "newEvalEpisodes": 0,
            "holdoutEpisodes": 0,
            "bt93nActualModelTimesteps": micro_report.get("actualModelTimesteps"),
            "bt93qDeterministicEvalActionRows": _get(
                policy_report,
                "deterministicEval",
                "combinedDistribution",
                "total",
            ),
            "bt93qStochasticTrainActionRows": _get(policy_report, "stochasticTrain", "distribution", "total"),
        },
        "claimFlags": _claim_flags(),
        "guardrails": _guardrails(),
        "allowNext": [
            "93R.99 red closure preparation if user accepts model-artifact-missing as BT93R outcome",
            "or restore exact BT93N model/config/vecnormalize/surface-hash package before any 93R.4 fix",
        ],
        "opensNext": [],
        "blocksNext": COMMON_BLOCKED_ACTIONS,
        "recommendations": [
            {
                "rank": 1,
                "action": "Restore the exact BT93N package before any fix attempt.",
                "why": "The collapse-producing model, config, vecnormalize and surface hash are the missing proof line.",
            },
            {
                "rank": 2,
                "action": "If restoration is impossible, close BT93R red as model-artifact-missing/policy-evidence-invalid.",
                "why": "A decoder, normalize or eval-mode change would be unprovable against the selected policy lineage.",
            },
            {
                "rank": 3,
                "action": "Keep BT93S/O/P/94A blocked.",
                "why": "BT93R has not produced an R-Allowlist result class or a counterprobe-green artifact.",
            },
        ],
        "summary": {
            "resultClass": result_class,
            "selectedRootCauseClass": selected_root_cause,
            "deterministicCollapseObserved": deterministic_collapse_observed,
            "deterministicDominantAction": dominant_action,
            "decoderBugProven": False,
            "normalizeMismatchProven": False,
            "evalModeBugProven": False,
            "selectedModelPackageMissing": model_package_missing,
            "actionSurfaceDriftDetected": action_surface_drift,
            "nextBestAction": "Restore exact BT93N lineage package or close BT93R red; do not implement a fix from proxy evidence.",
        },
        "commands": {
            "write": "python python/scripts/bt93r_policy_collapse_root_cause.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()

    report = build_report()
    if args.write_report:
        _write_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "selectedRootCauseClass": report["rootCauseClassification"]["selectedClass"],
                "phaseCoverage": report["phaseCoverage"],
                "blocksNext": report["blocksNext"][:3],
                "opensNext": report["opensNext"],
                "output": _rel(args.output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
