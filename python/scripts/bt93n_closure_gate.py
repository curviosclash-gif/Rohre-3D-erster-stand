"""BT93N.99 closure gate.

Closes BT93N as diagnostic-only when the 10k and ladder gates still report
DeathBefore60 as blocking. The report must not open BT93O, BT93P, BT94A, a
candidate, a freeze, a holdout, promotion, or rollout language.
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
BT93N_ROOT = PPO_ROOT / "bt93n"
REPORT_PATH = BT93N_ROOT / "closure_gate_report.json"

SOURCE_PATHS = {
    "deathTrace": BT93N_ROOT / "death_before60_trace_report.json",
    "deathTraceSamples": BT93N_ROOT / "death_before60_trace_samples.jsonl",
    "maxstepTrace": BT93N_ROOT / "maxstep_plateau_trace_report.json",
    "fixManifest": BT93N_ROOT / "fix_manifest.json",
    "stabilityFix": BT93N_ROOT / "stability_fix_report.json",
    "rewardTerminalDelta": BT93N_ROOT / "reward_terminal_delta_report.json",
    "microToleranceContract": BT93N_ROOT / "micro_ppo_tolerance_contract.json",
    "microPpoRepeat": BT93N_ROOT / "micro_ppo_repeat_report.json",
    "stabilityLadder": BT93N_ROOT / "stability_ladder_report.json",
    "stageDecision": BT93N_ROOT / "runs" / "bt93n-stability-ladder-no-run" / "stage_decision.json",
    "comparisonPolicyDecision": PPO_ROOT / "bt93m" / "comparison_policy_decision.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
}

FORBIDDEN_PRODUCTIVE_SURFACES = {
    "src/state/HeadlessMatchKernelRuntime.js",
    "src/core/MatchKernelTrainingAdapter.js",
    "src/entities/ai/training/TrainingTransportFacade.js",
    "src/entities/ai/training/WebSocketTrainerBridge.js",
    "src/entities/ai/ObservationBridgePolicy.js",
    "src/core/RuntimeConfig.js",
    "src/entities/ai/BotPolicyRegistry.js",
    "src/entities/ai/BotPolicyTypes.js",
    "src/entities/ai/inference/LocalDqnInference.js",
    "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
    "src/state/MatchSessionFactory.js",
}

ALLOWED_FIX_CLASSES = {"Reward", "Curriculum", "Action", "Terminal", "Runner"}
ALLOWED_FINAL_RESULTS = {
    "stability-ladder-green",
    "reward-redesign-required",
    "action-space-required",
    "terminal-semantics-required",
    "diagnose-loop-required",
}
FORBIDDEN_GUARDRAILS = {
    "bt94aClaimAllowed",
    "candidateRun",
    "freezeCandidate",
    "holdoutUsed",
    "promotionAllowed",
    "ppoValidateSignal",
    "qualityClaimAllowed",
    "productiveRuntimeChanged",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
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


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
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


def _changed_files() -> list[str]:
    merge_base = _git_output(["git", "merge-base", "HEAD", "origin/bot-training"])
    if merge_base:
        return _git_lines(["git", "diff", "--name-only", f"{merge_base}..HEAD"])
    return _git_lines(["git", "diff", "--name-only", "HEAD~1..HEAD"])


def _tracked_files(paths: Mapping[str, Path]) -> set[str]:
    return set(_git_lines(["git", "ls-files", "--", *(_rel(path) for path in paths.values())]))


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _source(path: Path, role: str, tracked_files: set[str]) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    rel_path = _rel(path)
    return {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": rel_path,
        "role": role,
        "sha256": _sha256_file(path),
        "tracked": rel_path in tracked_files,
        "ok": payload.get("ok") if payload else None,
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _all_coverage_true(payload: Mapping[str, Any], prefix: str) -> bool:
    coverage = payload.get("phaseCoverage")
    return isinstance(coverage, Mapping) and all(
        key.startswith(prefix) and value is True for key, value in coverage.items()
    )


def _safety_rates_zero(summary: Mapping[str, Any] | None) -> bool:
    if not isinstance(summary, Mapping):
        return False
    rates = summary.get("safetyMaxRates")
    return (
        summary.get("runtimeErrorCount") == 0
        and isinstance(rates, Mapping)
        and rates.get("invalidActionRate") == 0
        and rates.get("postDecodeClampRate") == 0
        and rates.get("sanitizerRate") == 0
    )


def _closed_guardrails(payloads: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    unexpected: dict[str, Any] = {}
    for source_name, payload in payloads.items():
        guardrails = payload.get("guardrails")
        if not isinstance(guardrails, Mapping):
            continue
        for key in FORBIDDEN_GUARDRAILS:
            if key in guardrails and guardrails.get(key) is not False:
                unexpected[f"{source_name}.{key}"] = guardrails.get(key)
        runtime_surfaces = guardrails.get("runtimeSurfacesTouched")
        if runtime_surfaces not in (None, []):
            unexpected[f"{source_name}.runtimeSurfacesTouched"] = runtime_surfaces
    return {"ok": not unexpected, "unexpectedOpenGuardrails": unexpected}


def build_report() -> dict[str, Any]:
    payloads = {key: _read_json(path) for key, path in SOURCE_PATHS.items()}
    tracked_files = _tracked_files(SOURCE_PATHS)
    changed_files = _changed_files()
    forbidden_touched = sorted(set(changed_files) & FORBIDDEN_PRODUCTIVE_SURFACES)

    death_trace = payloads["deathTrace"]
    maxstep_trace = payloads["maxstepTrace"]
    fix_manifest = payloads["fixManifest"]
    stability_fix = payloads["stabilityFix"]
    reward_delta = payloads["rewardTerminalDelta"]
    tolerance = payloads["microToleranceContract"]
    micro = payloads["microPpoRepeat"]
    ladder = payloads["stabilityLadder"]
    comparison_policy = payloads["comparisonPolicyDecision"]
    no_start = payloads["bt94aNoStartGate"]

    source_files_ready = all(path.is_file() for path in SOURCE_PATHS.values())
    source_files_versioned = all(_rel(path) in tracked_files for path in SOURCE_PATHS.values())
    phases_closed = all(
        (
            _all_coverage_true(death_trace, "93N.1"),
            _all_coverage_true(stability_fix, "93N.2"),
            _all_coverage_true(micro, "93N.3"),
            _all_coverage_true(ladder, "93N.4"),
        )
    )

    root_cause = str(_get(death_trace, "measurementInterpretation", "dominantCause") or "")
    selected_fix_class = str(fix_manifest.get("selectedFixClass") or "")
    gate_class = str(ladder.get("resultClass") or micro.get("resultClass") or "")
    final_result = "diagnose-loop-required" if gate_class == "death-before60-still-blocking" else gate_class
    train_summary = micro.get("trainSummary") if isinstance(micro.get("trainSummary"), Mapping) else {}
    eval_summary = micro.get("evalSummary") if isinstance(micro.get("evalSummary"), Mapping) else {}
    train_death_before60 = int(train_summary.get("deathBefore60Count") or 0)
    eval_death_before60 = int(eval_summary.get("deathBefore60Count") or 0)

    blocks_next = set(str(item) for item in _get(ladder, "decision", "blocksNext") or [])
    opens_next = list(_get(ladder, "decision", "opensNext") or [])
    bt94a_closed = (
        no_start.get("claimable") is False
        and no_start.get("candidateRunsAllowed") is False
        and no_start.get("matrixDefinitionAllowed") is False
        and _get(ladder, "decision", "bt94aClaimAllowed") is False
        and {"BT93O", "BT94A"}.issubset(blocks_next)
    )
    gate_blocks_next = (
        gate_class == "death-before60-still-blocking"
        and train_death_before60 > 0
        and eval_death_before60 > 0
        and bt94a_closed
        and not opens_next
    )

    safety_runtime_green = _safety_rates_zero(train_summary) and _safety_rates_zero(eval_summary)
    terminal_disclosure = {
        "trainPlayerDeadShare": train_summary.get("playerDeadShare"),
        "evalPlayerDeadShare": eval_summary.get("playerDeadShare"),
        "terminalReasonCounts": _get(death_trace, "aggregate", "terminalReasonCounts"),
        "disclosedAsBlocking": train_summary.get("playerDeadShare") == 1.0
        and eval_summary.get("playerDeadShare") == 1.0
        and gate_class == "death-before60-still-blocking",
    }
    no_hidden_regression = safety_runtime_green and terminal_disclosure["disclosedAsBlocking"] is True

    closed_guardrails = _closed_guardrails(payloads)
    forbidden_signal_absent = (
        closed_guardrails["ok"]
        and len(forbidden_touched) == 0
        and no_start.get("candidateFreezeAllowed") is False
        and no_start.get("claimable") is False
        and _get(ladder, "decision", "candidateRun") is False
        and _get(ladder, "decision", "freezeCandidate") is False
        and _get(ladder, "decision", "holdoutUsed") is False
    )

    progress_objective_nonzero = (
        int(train_summary.get("progressSignalReachableCount") or 0) > 0
        and int(train_summary.get("objectiveSignalReachableCount") or 0) > 0
        and int(eval_summary.get("progressSignalReachableCount") or 0) > 0
        and int(eval_summary.get("objectiveSignalReachableCount") or 0) > 0
    )
    plateau_state = {
        "traceResultClass": maxstep_trace.get("resultClass"),
        "ladderPlateauDecision": _get(ladder, "stageExecution", "0", "plateauDecision"),
        "maxStepPlateauCount": _get(maxstep_trace, "aggregate", "maxStepPlateauCount"),
        "maxStepShare": _get(maxstep_trace, "aggregate", "maxStepShare"),
        "countsAsQualityGreen": _get(maxstep_trace, "plateauDecision", "countsAsQualityGreen"),
    }
    sample_quality = {
        "diagnosticEpisodes": _get(death_trace, "aggregate", "completedEpisodes"),
        "earlyDeathSamples": _get(death_trace, "aggregate", "deathBefore60Count"),
        "fixSampleGatePassed": _get(fix_manifest, "causeEvidence", "sampleGate", "passed"),
        "trainCompletedEpisodes": train_summary.get("completedEpisodes"),
        "evalCompletedEpisodes": eval_summary.get("completedEpisodes"),
    }
    bt93o_start_blocked = (
        "BT93O" in blocks_next
        and gate_class == "death-before60-still-blocking"
        and progress_objective_nonzero
        and sample_quality["fixSampleGatePassed"] is True
    )

    phase_coverage = {
        "93N.99.1": source_files_ready and source_files_versioned and phases_closed,
        "93N.99.2": gate_blocks_next,
        "93N.99.3": no_hidden_regression,
        "93N.99.4": forbidden_signal_absent,
        "93N.99.5": bt93o_start_blocked,
    }
    dod_coverage = {
        "DoD.1": _all_coverage_true(death_trace, "93N.1")
        and Path(str(death_trace.get("samplePath") or "")).as_posix() == "data/training/ppo/bt93n/death_before60_trace_samples.jsonl",
        "DoD.2": root_cause == "wall/trail"
        and _get(death_trace, "measurementInterpretation", "fixAllowedBeforeDominantCause") is False,
        "DoD.3": selected_fix_class in ALLOWED_FIX_CLASSES,
        "DoD.4": tolerance.get("lockedBeforeTraining") is True
        and _get(micro, "decision", "extension50kExecuted") is False
        and _get(ladder, "decision", "extension50kAllowed") is False
        and _get(ladder, "decision", "extension100kAllowed") is False,
        "DoD.5": safety_runtime_green,
        "DoD.6": progress_objective_nonzero
        and _get(micro, "plateauAssessment", "countsAsQualityGreen") is False
        and train_summary.get("playerDeadShare") == 1.0
        and eval_summary.get("playerDeadShare") == 1.0,
        "DoD.7": final_result in ALLOWED_FINAL_RESULTS,
        "DoD.8": maxstep_trace.get("resultClass") == "maxstep-plateau-not-observed"
        and _get(maxstep_trace, "plateauDecision", "countsAsQualityGreen") is False,
        "DoD.9": _get(ladder, "decision", "extension50kAllowed") is False
        and _get(ladder, "decision", "extension100kAllowed") is False,
        "DoD.10": _get(reward_delta, "matrix", "sameSeedsPoliciesTerminalRules") is True
        and _get(reward_delta, "aggregateDelta", "deathBefore60Count", "post") > 0
        and _get(ladder, "decision", "extension50kAllowed") is False,
        "DoD.11": _get(fix_manifest, "causeEvidence", "sampleGate", "passed") is True
        and _get(fix_manifest, "causeEvidence", "completedEpisodes") >= 60
        and _get(fix_manifest, "causeEvidence", "earlyDeathStats", "count") >= 5,
        "DoD.12": selected_fix_class == "Reward"
        and _get(fix_manifest, "fix", "policy")
        == "single fix class only; no action-surface, terminal, runner, holdout, candidate, freeze, promote, or rollout changes",
        "DoD.13": root_cause == "wall/trail"
        and _get(fix_manifest, "causeEvidence", "sampleGate", "passed") is True
        and bool(fix_manifest.get("falsificationRules")),
        "DoD.14": _get(reward_delta, "matrix", "sameSeedsPoliciesTerminalRules") is True,
    }
    ok = all(phase_coverage.values()) and all(dod_coverage.values())
    return {
        "schemaVersion": "bt93n-closure-gate-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93n_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93N",
        "phaseId": "93N.99",
        "resultClass": final_result if ok else "closure-blocked",
        "gateClass": gate_class,
        "rootCause": root_cause,
        "selectedFixClass": selected_fix_class,
        "phaseCoverage": phase_coverage,
        "dodCoverage": dod_coverage,
        "sourceFilesReady": source_files_ready,
        "sourceFilesVersioned": source_files_versioned,
        "phasesClosed": phases_closed,
        "bt94aClosed": bt94a_closed,
        "bt93oStartBlocked": bt93o_start_blocked,
        "noHiddenRegression": no_hidden_regression,
        "safetyRuntimeGreen": safety_runtime_green,
        "terminalDisclosure": terminal_disclosure,
        "sampleQuality": sample_quality,
        "plateauState": plateau_state,
        "comparisonPolicyDecision": comparison_policy.get("comparisonPolicyDecision"),
        "positiveReentryBlocked": comparison_policy.get("nonBlockingForPositiveReentry") is False,
        "changedFiles": changed_files,
        "forbiddenProductiveSurfaceTouched": forbidden_touched,
        "forbiddenSignalCheck": closed_guardrails,
        "summary": {
            "finalResult": final_result if ok else "closure-blocked",
            "gateClass": gate_class,
            "rootCause": root_cause,
            "trainDeathBefore60Count": train_death_before60,
            "evalDeathBefore60Count": eval_death_before60,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "promotionAllowed": False,
            "rolloutAllowed": False,
            "blocksNext": sorted(blocks_next),
            "opensNext": opens_next,
            "nextAllowedWork": [
                "narrow BT93N follow-up/root-cause repair for DeathBefore60",
                "separate DQN loader-fix block or explicit replacement-policy user decision",
                "do not claim BT93O, BT93P, BT94A, candidate, freeze, holdout, promote, or rollout from BT93N",
            ],
        },
        "sourceArtifacts": {
            key: _source(path, role, tracked_files)
            for key, path, role in (
                ("deathTrace", SOURCE_PATHS["deathTrace"], "BT93N.1 death trace root-cause report"),
                ("deathTraceSamples", SOURCE_PATHS["deathTraceSamples"], "BT93N.1 raw trace samples"),
                ("maxstepTrace", SOURCE_PATHS["maxstepTrace"], "BT93N.1 maxstep plateau trace"),
                ("fixManifest", SOURCE_PATHS["fixManifest"], "BT93N.2 single-fix manifest"),
                ("stabilityFix", SOURCE_PATHS["stabilityFix"], "BT93N.2 stability fix report"),
                ("rewardTerminalDelta", SOURCE_PATHS["rewardTerminalDelta"], "BT93N.2 pre/post delta report"),
                ("microToleranceContract", SOURCE_PATHS["microToleranceContract"], "BT93N.3 pre-run tolerance contract"),
                ("microPpoRepeat", SOURCE_PATHS["microPpoRepeat"], "BT93N.3 10k micro PPO report"),
                ("stabilityLadder", SOURCE_PATHS["stabilityLadder"], "BT93N.4 50k/100k ladder gate"),
                ("stageDecision", SOURCE_PATHS["stageDecision"], "BT93N.4 no-run stage decision"),
                ("comparisonPolicyDecision", SOURCE_PATHS["comparisonPolicyDecision"], "BT93M comparison policy blocker"),
                ("bt94aNoStartGate", SOURCE_PATHS["bt94aNoStartGate"], "BT94A closed no-start gate"),
            )
        },
        "guardrails": {
            "diagnosticOnly": True,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "rolloutAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93n_closure_gate.py --write-report",
            "metaGate": "npm.cmd run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    args = parser.parse_args()

    report = build_report()
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "gateClass": report["gateClass"],
                "rootCause": report["rootCause"],
                "phaseCoverage": report["phaseCoverage"],
                "dodCoverage": report["dodCoverage"],
                "summary": report["summary"],
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
