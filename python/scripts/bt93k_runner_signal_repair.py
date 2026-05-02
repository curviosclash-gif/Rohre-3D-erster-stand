"""BT93K.2 runner signal repair and reachability evidence.

This writes a small versioned smoke report for the real CurviosEnv ->
Python sidecar -> Node headless runner path. It does not train, evaluate a
candidate, open BT94A, or make any quality claim.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from envs.curvios_env import CurviosEnv  # noqa: E402


BT93K_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93k"
REPORT_PATH = BT93K_ROOT / "runner_signal_repair_report.json"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
SINGLE_ENV_BRIDGE_PATH = REPO_ROOT / "scripts" / "training-single-env-bridge.mjs"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
LEARNER_SMOKE_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"
TRAINER_PAYLOAD_ADAPTER_PATH = REPO_ROOT / "src" / "entities" / "ai" / "training" / "TrainerPayloadAdapter.js"

PROOF_PROFILE_ID = "bt93j-reward-curriculum-proof-v1"
CURRICULUM_OFFSET = 250_000


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _sha256_file(path: Path) -> str | None:
    if not path.exists():
        return None
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


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result else None


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "exists": path.exists(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _file_contains(path: Path, *tokens: str) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    return all(token in text for token in tokens)


def _extract_effective_environment(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    effective = info.get("effectiveEnvironment")
    if isinstance(effective, Mapping):
        return effective
    effective = metadata.get("effectiveEnvironment")
    return effective if isinstance(effective, Mapping) else {}


def _extract_episode_semantics(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    semantics = metadata.get("episodeSemantics")
    return semantics if isinstance(semantics, Mapping) else {}


def _step_row(index: int, reward: float, terminated: bool, truncated: bool, info: Mapping[str, Any]) -> dict[str, Any]:
    reward_breakdown = info.get("rewardBreakdown") if isinstance(info.get("rewardBreakdown"), Mapping) else {}
    effective = _extract_effective_environment(info)
    semantics = _extract_episode_semantics(info)
    return {
        "index": int(index),
        "reward": round(float(reward), 6),
        "terminated": bool(terminated),
        "truncated": bool(truncated),
        "effectiveEnvironment": dict(effective),
        "episodeSemantics": dict(semantics),
        "rewardBreakdown": dict(reward_breakdown),
    }


def _run_real_runner_smoke(*, steps: int, seed: int) -> dict[str, Any]:
    env = CurviosEnv(
        max_steps=max(steps + 2, 8),
        default_seed=seed,
        session_id="bt93k-runner-signal-repair",
        controller_timeout_seconds=12.0,
        reward_profile_id=PROOF_PROFILE_ID,
        map_key="standard",
        domain_mode="classic-3d",
        curriculum_step_offset=CURRICULUM_OFFSET,
    )
    rows: list[dict[str, Any]] = []
    reset_info: Mapping[str, Any] | None = None
    diagnostics: Mapping[str, Any] = {}
    try:
        _, reset_info = env.reset(seed=seed)
        for index in range(steps):
            _, reward, terminated, truncated, info = env.step({})
            rows.append(_step_row(index, reward, terminated, truncated, info))
            if terminated or truncated:
                break
        diagnostics = env.get_diagnostics()
    finally:
        env.close()
    return {
        "ok": bool(rows),
        "seed": int(seed),
        "requestedSteps": int(steps),
        "observedSteps": len(rows),
        "resetEffectiveEnvironment": dict(_extract_effective_environment(reset_info or {})),
        "rows": rows,
        "diagnostics": {
            "runtime": (diagnostics.get("stats") or {}) if isinstance(diagnostics, Mapping) else {},
            "bridgeTelemetry": (diagnostics.get("bridgeTelemetry") or {}) if isinstance(diagnostics, Mapping) else {},
        },
    }


def _summarize_smoke(smoke: Mapping[str, Any]) -> dict[str, Any]:
    rows = [row for row in smoke.get("rows") or [] if isinstance(row, Mapping)]
    global_steps: list[int] = []
    total_steps: list[int] = []
    offsets: set[int] = set()
    stages: set[str] = set()
    stage_change_count = 0
    reward_totals: dict[str, float] = {}
    progress_reported = 0
    progress_reachable = 0

    for row in rows:
        effective = row.get("effectiveEnvironment") if isinstance(row.get("effectiveEnvironment"), Mapping) else {}
        semantics = row.get("episodeSemantics") if isinstance(row.get("episodeSemantics"), Mapping) else {}
        for source in (effective, semantics):
            global_step = _number(source.get("globalEnvSteps"))
            total_step = _number(source.get("curriculumTotalEnvSteps"))
            offset = _number(source.get("curriculumStepOffset"))
            stage = source.get("activeCurriculumStage")
            if global_step is not None:
                global_steps.append(int(global_step))
            if total_step is not None:
                total_steps.append(int(total_step))
            if offset is not None:
                offsets.add(int(offset))
            if stage:
                stages.add(str(stage))
            if source.get("curriculumStageChanged") is True:
                stage_change_count += 1
            if source.get("progressSignalReported") is True:
                progress_reported += 1
            if source.get("progressEventReachable") is True:
                progress_reachable += 1
        reward_breakdown = row.get("rewardBreakdown") if isinstance(row.get("rewardBreakdown"), Mapping) else {}
        for key, value in reward_breakdown.items():
            number = _number(value)
            if number is not None:
                reward_totals[str(key)] = round(reward_totals.get(str(key), 0.0) + number, 6)

    expected_global = list(range(1, len(rows) + 1))
    unique_global = sorted(set(global_steps))
    objective_total = round(
        sum(float(reward_totals.get(key, 0.0)) for key in ("checkpointReached", "parcoursCompleted", "kill", "win")),
        6,
    )
    progress_total = round(
        sum(float(reward_totals.get(key, 0.0)) for key in ("checkpointReached", "parcoursCompleted")),
        6,
    )
    return {
        "globalEnvSteps": unique_global,
        "curriculumTotalEnvSteps": sorted(set(total_steps)),
        "curriculumStepOffsets": sorted(offsets),
        "activeCurriculumStages": sorted(stages),
        "curriculumStageChangeCount": int(stage_change_count),
        "globalEnvStepsMonotone": unique_global == expected_global,
        "curriculumTotalUsesOffset": all(step == CURRICULUM_OFFSET + global_step for step, global_step in zip(sorted(set(total_steps)), unique_global)),
        "rewardBreakdownTotals": reward_totals,
        "progressReward": progress_total,
        "objectiveReward": objective_total,
        "progressEventReachableCount": int(progress_reachable),
        "progressSignalReportedCount": int(progress_reported),
        "noPhantomProgressOrObjective": progress_total == 0.0 and objective_total == 0.0 and progress_reported == 0,
    }


def _source_checks() -> dict[str, bool]:
    return {
        "runnerUsesGlobalEnvSteps": _file_contains(
            HEADLESS_RUNNER_PATH,
            "this.globalEnvSteps += 1",
            "curriculumTotalEnvSteps",
            "totalEnvSteps: curriculumTotalEnvSteps",
        ),
        "runnerReportsCurriculumTelemetry": _file_contains(
            HEADLESS_RUNNER_PATH,
            "activeCurriculumStage",
            "curriculumStepOffset",
            "curriculumStageChanged",
        ),
        "pythonEnvPassesModeMapAndOffset": _file_contains(
            CURVIOS_ENV_PATH,
            "map_key",
            "domain_mode",
            "curriculum_step_offset",
            "effectiveEnvironment",
        ),
        "singleEnvBridgeAcceptsModeMapAndOffset": _file_contains(
            SINGLE_ENV_BRIDGE_PATH,
            "--map-key",
            "--domain-mode",
            "--curriculum-step-offset",
        ),
        "trainEvalReportsEffectiveEnv": _file_contains(
            LEARNER_SMOKE_PATH,
            "effectiveEnv",
            "effectiveMap",
            "effectiveDomainMode",
            "modePath",
        ),
        "evalDiagnosticsReportStepAndStageTelemetry": _file_contains(
            LEARNER_SMOKE_PATH,
            "globalEnvStepRange",
            "curriculumTotalEnvStepRange",
            "curriculumStageChangeCount",
        ),
        "trainerPayloadForwardsRunnerMetadata": _file_contains(
            TRAINER_PAYLOAD_ADAPTER_PATH,
            "metadata: cloneSerializable(metadata)",
            "effectiveEnvironment",
            "episodeSemantics",
        ),
    }


def build_report(*, steps: int, seed: int) -> dict[str, Any]:
    smoke = _run_real_runner_smoke(steps=steps, seed=seed)
    summary = _summarize_smoke(smoke)
    source_checks = _source_checks()
    phase_coverage = {
        "93K.2.1": bool(source_checks["runnerUsesGlobalEnvSteps"] and summary["globalEnvStepsMonotone"] and summary["curriculumTotalUsesOffset"]),
        "93K.2.2": bool(
            source_checks["runnerReportsCurriculumTelemetry"]
            and source_checks["trainerPayloadForwardsRunnerMetadata"]
            and summary["activeCurriculumStages"]
            and summary["curriculumStageChangeCount"] >= 1
        ),
        "93K.2.3": bool(smoke["ok"] and summary["noPhantomProgressOrObjective"]),
        "93K.2.4": bool(
            source_checks["pythonEnvPassesModeMapAndOffset"]
            and source_checks["singleEnvBridgeAcceptsModeMapAndOffset"]
            and source_checks["trainEvalReportsEffectiveEnv"]
            and source_checks["evalDiagnosticsReportStepAndStageTelemetry"]
        ),
    }
    ok = all(phase_coverage.values())
    return {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_runner_signal_repair.py",
        "gitSha": _git_sha(),
        "ok": ok,
        "blockId": "BT93K",
        "phaseId": "93K.2",
        "resultClass": "runner-signal-repair-ready" if ok else "runner-signal-repair-red",
        "summary": summary,
        "phaseCoverage": phase_coverage,
        "sourceChecks": source_checks,
        "realRunnerSmoke": smoke,
        "sourceArtifacts": {
            "headlessRunner": _source(HEADLESS_RUNNER_PATH, "JS headless runner"),
            "singleEnvBridge": _source(SINGLE_ENV_BRIDGE_PATH, "Node single env bridge"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python Curvios env"),
            "learnerSmoke": _source(LEARNER_SMOKE_PATH, "PPO train/eval report writer"),
            "trainerPayloadAdapter": _source(TRAINER_PAYLOAD_ADAPTER_PATH, "training payload metadata forwarder"),
        },
        "guardrails": {
            "trainingStarted": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93k_runner_signal_repair.py --write-report",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--seed", type=int, default=9302)
    args = parser.parse_args()

    report = build_report(steps=max(1, int(args.steps)), seed=int(args.seed))
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(json.dumps({
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "phaseCoverage": report["phaseCoverage"],
        "output": _rel(output),
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
