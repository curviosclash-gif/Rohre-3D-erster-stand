"""BT93I.2 long-run readiness and early-stop report builder.

This script prepares the BT93I repair lane for a bounded smoke/extension run.
It does not train, evaluate, freeze, promote, or touch runtime surfaces.
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
BT93I_ROOT = PPO_ROOT / "bt93i"
BT93G_ROOT = PPO_ROOT / "bt93g"

DEFAULT_CONFIG_PATH = PYTHON_ROOT / "configs" / "ppo_bt93i_terminal_curriculum_repair.json"
DEFAULT_REPORT_PATH = BT93I_ROOT / "long_run_readiness_report.json"
START_TRUTH_PATH = BT93I_ROOT / "start_truth.json"
MATRIX_PATH = BT93I_ROOT / "matrix_manifest.json"
TERMINAL_REPORT_PATH = BT93I_ROOT / "terminal_provocation_report.json"
ACTION_MASK_PATH = BT93G_ROOT / "action_mask_report.json"
REWARD_GATE_PATH = BT93G_ROOT / "reward_gate_report.json"
EVAL_ENTRYPOINT_PATH = PYTHON_ROOT / "eval.py"
TRAIN_ENTRYPOINT_PATH = PYTHON_ROOT / "train.py"
RUNNER_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"


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


def _source(path: Path, role: str, closure_capable: bool = True) -> dict[str, Any]:
    return {
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
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


def _source_tokens(path: Path, tokens: tuple[str, ...]) -> dict[str, bool]:
    text = path.read_text(encoding="utf-8")
    return {token: token in text for token in tokens}


def _rollout_config(config: Mapping[str, Any]) -> Mapping[str, Any]:
    rollout = config.get("rollout")
    return rollout if isinstance(rollout, Mapping) else {}


def _env_config(config: Mapping[str, Any]) -> Mapping[str, Any]:
    env = config.get("env")
    return env if isinstance(env, Mapping) else {}


def _diagnostics_config(config: Mapping[str, Any]) -> Mapping[str, Any]:
    diagnostics = config.get("diagnostics")
    return diagnostics if isinstance(diagnostics, Mapping) else {}


def _artifacts_config(config: Mapping[str, Any]) -> Mapping[str, Any]:
    artifacts = config.get("artifacts")
    return artifacts if isinstance(artifacts, Mapping) else {}


def _build_eval_readiness(config: Mapping[str, Any], matrix: Mapping[str, Any]) -> dict[str, Any]:
    rollout = _rollout_config(config)
    minimum = matrix.get("minimumEpisodes") if isinstance(matrix.get("minimumEpisodes"), Mapping) else {}
    eval_min = int(minimum.get("eval") or rollout.get("evalMinCompletedEpisodes") or 0)
    holdout_min = int(minimum.get("holdout") or rollout.get("holdoutMinCompletedEpisodes") or 0)
    eval_steps = int(rollout.get("evalSteps") or 0)
    holdout_steps = int(rollout.get("holdoutEvalSteps") or 0)
    eval_tokens = _source_tokens(
        EVAL_ENTRYPOINT_PATH,
        ("--min-completed-episodes", "--max-eval-steps", "terminal-curriculum-repair-eval"),
    )
    runner_tokens = _source_tokens(
        RUNNER_PATH,
        ("episodeTargetGate", "min_completed_episodes", "terminal-curriculum-repair-eval"),
    )
    checks = {
        "evalMinEpisodesPinned": eval_min >= 15,
        "holdoutMinEpisodesPinned": holdout_min >= 8,
        "evalMaxStepsPinned": eval_steps >= eval_min,
        "holdoutMaxStepsPinned": holdout_steps >= holdout_min,
        "evalEntrypointSupportsEpisodeTarget": all(eval_tokens.values()),
        "runnerWritesEpisodeTargetGate": all(runner_tokens.values()),
    }
    config_path = _rel(DEFAULT_CONFIG_PATH)
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "minimumEpisodes": {"eval": eval_min, "holdout": holdout_min},
        "maxEvalSteps": {"eval": eval_steps, "holdout": holdout_steps},
        "commands": {
            "eval": (
                "python\\.venv\\Scripts\\python.exe python\\eval.py --profile bt93i "
                "--run-kind terminal-curriculum-repair-eval --phase-id 93I.4.1 "
                f"--config {config_path} --artifact-root data\\training\\ppo\\bt93i "
                "--checkpoint data\\training\\ppo\\bt93i\\latest_terminal_curriculum_repair.json "
                f"--min-completed-episodes {eval_min} --max-eval-steps {eval_steps}"
            ),
            "holdout": (
                "python\\.venv\\Scripts\\python.exe python\\eval.py --profile bt93i "
                "--run-kind holdout-eval --phase-id 93I.4.1 "
                f"--config {config_path} --artifact-root data\\training\\ppo\\bt93i "
                "--checkpoint data\\training\\ppo\\bt93i\\latest_terminal_curriculum_repair.json "
                f"--min-completed-episodes {holdout_min} --max-eval-steps {holdout_steps}"
            ),
        },
        "sourceChecks": {"evalEntrypoint": eval_tokens, "runner": runner_tokens},
    }


def _build_budget(config: Mapping[str, Any], matrix: Mapping[str, Any]) -> dict[str, Any]:
    rollout = _rollout_config(config)
    env = _env_config(config)
    matrix_env = matrix.get("env") if isinstance(matrix.get("env"), Mapping) else {}
    checks = {
        "smokeTimestepsPinned": int(rollout.get("terminalCurriculumSmokeTimesteps") or 0) == 2048,
        "extensionIncrementPinned": int(rollout.get("terminalCurriculumIncrementTimesteps") or 0) == 4096,
        "maxTimestepsPinned": int(rollout.get("terminalCurriculumMaxTimesteps") or 0) == 32768,
        "wallClockLimitPinned": int(rollout.get("wallClockLimitSeconds") or 0) == 14400,
        "envCountPinned": int(env.get("envCount") or 0) == 2,
        "fourEnvDisabled": (config.get("guardrails") or {}).get("fourEnvAllowed") is False,
        "checkpointFrequencyPinned": int(rollout.get("checkpointFrequencyTimesteps") or 0) == 2048,
        "evalIntervalPinned": int(rollout.get("evalIntervalTimesteps") or 0) == 2048,
        "seedsMatchMatrix": env.get("trainSeeds") == (matrix.get("seeds") or {}).get("train")
        and env.get("evalSeeds") == (matrix.get("seeds") or {}).get("eval")
        and env.get("holdoutSeeds") == (matrix.get("seeds") or {}).get("holdout"),
        "mapsMatchMatrix": env.get("maps") == matrix_env.get("maps"),
        "maxStepsPerEpisodePinned": int(env.get("maxStepsPerEpisode") or 0) == int(matrix_env.get("maxStepsPerEpisode") or 0),
    }
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "smokeTimesteps": int(rollout.get("terminalCurriculumSmokeTimesteps") or 0),
        "extensionIncrementTimesteps": int(rollout.get("terminalCurriculumIncrementTimesteps") or 0),
        "maxTimesteps": int(rollout.get("terminalCurriculumMaxTimesteps") or 0),
        "wallClockLimitSeconds": int(rollout.get("wallClockLimitSeconds") or 0),
        "envCount": int(env.get("envCount") or 0),
        "checkpointFrequencyTimesteps": int(rollout.get("checkpointFrequencyTimesteps") or 0),
        "evalIntervalTimesteps": int(rollout.get("evalIntervalTimesteps") or 0),
        "command": (
            "python\\.venv\\Scripts\\python.exe python\\train.py --profile bt93i "
            "--run-kind terminal-curriculum-repair --phase-id 93I.3.2 "
            f"--config {_rel(DEFAULT_CONFIG_PATH)} --artifact-root data\\training\\ppo\\bt93i "
            "--checkpoint data\\training\\ppo\\bt93h\\latest_comparable_terminal_repair.json "
            "--total-timesteps 2048"
        ),
    }


def _build_early_stops(
    config: Mapping[str, Any],
    terminal_report: Mapping[str, Any],
    action_mask: Mapping[str, Any],
    reward_gate: Mapping[str, Any],
) -> dict[str, Any]:
    diagnostics = _diagnostics_config(config)
    rules = diagnostics.get("earlyStopRules") if isinstance(diagnostics.get("earlyStopRules"), list) else []
    collapse = diagnostics.get("collapseThresholds") if isinstance(diagnostics.get("collapseThresholds"), Mapping) else {}
    safety = diagnostics.get("safetyThresholds") if isinstance(diagnostics.get("safetyThresholds"), Mapping) else {}
    scenario_checks = terminal_report.get("scenarioChecks") if isinstance(terminal_report.get("scenarioChecks"), Mapping) else {}
    checks = {
        "runtimeErrorRulePinned": any("runtimeErrorCount" in str(rule) for rule in rules),
        "terminalMatrixRulePinned": any("terminal/death matrix" in str(rule) for rule in rules),
        "stepsRegressionRulePinned": any("avgStepsPerEpisode" in str(rule) for rule in rules),
        "survivalRegressionRulePinned": any("averageBotSurvival" in str(rule) for rule in rules),
        "rewardHackingRulePinned": any("reward" in str(rule) and "episode shortening" in str(rule) for rule in rules),
        "collapseRulesPinned": all(
            key in collapse
            for key in (
                "maxApproxKl",
                "maxClipFraction",
                "minEntropy",
                "maxValueLoss",
                "maxGradNorm",
                "minExplainedVariance",
            )
        ),
        "safetyThresholdsPinned": all(
            key in safety
            for key in ("postDecodeClampRateLt", "safetyVetoRateLt", "invalidActionRateEq", "sanitizerRateEq")
        ),
        "preSamplingMaskGreen": action_mask.get("ok") is True
        and (action_mask.get("maskSourceContract") or {}).get("preSamplingApplied") is True,
        "rewardGateGreen": reward_gate.get("ok") is True,
        "terminalProvocationGreen": terminal_report.get("ok") is True
        and scenario_checks.get("playerDead") is True
        and scenario_checks.get("matchEndedNonDeathNaturalTerminal") is True
        and scenario_checks.get("maxStepsControl") is True,
        "noPostHoldoutOptimizationRulePinned": any("no optimization after holdout" in str(rule) for rule in rules),
    }
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "rules": list(rules),
        "collapseThresholds": dict(collapse),
        "safetyThresholds": dict(safety),
    }


def build_report(config_path: Path) -> dict[str, Any]:
    config = _read_json(config_path)
    start_truth = _read_json(START_TRUTH_PATH)
    matrix = _read_json(MATRIX_PATH)
    terminal_report = _read_json(TERMINAL_REPORT_PATH)
    action_mask = _read_json(ACTION_MASK_PATH)
    reward_gate = _read_json(REWARD_GATE_PATH)

    artifacts = _artifacts_config(config)
    artifact_checks = {
        "configBlockIsBt93i": config.get("blockId") == "BT93I",
        "configPhaseIs93I2": config.get("phaseId") == "93I.2",
        "artifactRootIsBt93i": artifacts.get("root") == "data/training/ppo/bt93i",
        "startTruthGreen": start_truth.get("ok") is True,
        "matrixGreen": matrix.get("ok") is True,
        "terminalProvocationGreen": terminal_report.get("ok") is True,
    }
    eval_readiness = _build_eval_readiness(config, matrix)
    budget = _build_budget(config, matrix)
    early_stops = _build_early_stops(config, terminal_report, action_mask, reward_gate)

    phase_coverage = {
        "93I.2.1": eval_readiness["ok"],
        "93I.2.2": budget["ok"],
        "93I.2.3": early_stops["ok"],
        "93I.2.4": all(artifact_checks.values()) and eval_readiness["ok"] and budget["ok"] and early_stops["ok"],
    }
    long_run_allowed = all(phase_coverage.values())
    return {
        "ok": long_run_allowed,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93i_long_run_readiness.py",
        "gitSha": _git_sha(),
        "blockId": "BT93I",
        "phaseId": "93I.2",
        "matrixId": matrix.get("matrixId"),
        "resultClass": "long-run-readiness-green" if long_run_allowed else "diagnose-blocked",
        "longRunAllowed": long_run_allowed,
        "phaseCoverage": phase_coverage,
        "artifactChecks": artifact_checks,
        "episodeTargetedEvalReadiness": eval_readiness,
        "longRunBudget": budget,
        "earlyStopRules": early_stops,
        "nextAllowedRun": {
            "runKind": "terminal-curriculum-repair" if long_run_allowed else None,
            "phaseId": "93I.3.2" if long_run_allowed else None,
            "requires": [
                "start with 2048 smoke",
                "extend only by 4096 timesteps while this report remains green",
                "stop before holdout on eval gate failure",
                "no candidate, freeze, promote, rollout, or PPO-Validate claim",
            ],
        },
        "guardrails": {
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "ppoValidateEvidence": False,
            "rolloutSignal": False,
            "runtimeSurfacesTouched": [],
            "fourEnvAllowed": False,
        },
        "sourceArtifacts": {
            "config": _source(config_path, "BT93I repair config"),
            "startTruth": _source(START_TRUTH_PATH, "BT93I start truth"),
            "matrixManifest": _source(MATRIX_PATH, "BT93I episode-counted matrix"),
            "terminalProvocation": _source(TERMINAL_REPORT_PATH, "BT93I terminal provocation"),
            "actionMask": _source(ACTION_MASK_PATH, "BT93G pre-sampling action mask"),
            "rewardGate": _source(REWARD_GATE_PATH, "BT93G reward gate"),
            "evalEntrypoint": _source(EVAL_ENTRYPOINT_PATH, "episode-targeted eval entrypoint"),
            "trainEntrypoint": _source(TRAIN_ENTRYPOINT_PATH, "BT93I train entrypoint"),
            "ppoRunner": _source(RUNNER_PATH, "PPO train/eval runner"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93I.2 long-run readiness report.")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH))
    args = parser.parse_args()

    report = build_report(_repo_path(args.config))
    if args.write_report:
        _write_json(_repo_path(args.output), report)

    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "longRunAllowed": report["longRunAllowed"],
                "phaseCoverage": report["phaseCoverage"],
                "wrote": args.output if args.write_report else None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
