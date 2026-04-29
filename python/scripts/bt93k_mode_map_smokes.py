"""BT93K.3 mode/map smoke evidence.

Runs short startup probes through the Python CurviosEnv -> Node headless
bridge path. The report is startup/telemetry evidence only; it does not train,
evaluate quality, open BT94A, or compare DQN/PPO/env scale.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
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
REPORT_PATH = BT93K_ROOT / "mode_map_smoke_report.json"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
SINGLE_ENV_BRIDGE_PATH = REPO_ROOT / "scripts" / "training-single-env-bridge.mjs"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
LEARNER_SMOKE_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"


@dataclass(frozen=True)
class ProbeSpec:
    domain_mode: str
    map_key: str
    game_mode: str
    planar_mode: bool
    mode_path: str
    seed: int


PROBES = (
    ProbeSpec("classic-3d", "standard", "CLASSIC", False, "normal", 9331),
    ProbeSpec("classic-2d", "standard", "CLASSIC", True, "normal", 9332),
    ProbeSpec("hunt-3d", "standard", "HUNT", False, "fight", 9333),
    ProbeSpec("hunt-2d", "standard", "HUNT", True, "fight", 9334),
)


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


def _file_contains(path: Path, *tokens: str) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    return all(token in text for token in tokens)


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "exists": path.exists(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _extract_effective_environment(info: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = info.get("metadata") if isinstance(info.get("metadata"), Mapping) else {}
    effective = info.get("effectiveEnvironment")
    if isinstance(effective, Mapping):
        return effective
    effective = metadata.get("effectiveEnvironment")
    return effective if isinstance(effective, Mapping) else {}


def _run_probe(spec: ProbeSpec, *, steps: int, timeout_seconds: float) -> dict[str, Any]:
    env = CurviosEnv(
        max_steps=max(steps + 2, 8),
        default_seed=spec.seed,
        session_id=f"bt93k-mode-map-{spec.domain_mode}",
        controller_timeout_seconds=timeout_seconds,
        map_key=spec.map_key,
        domain_mode=spec.domain_mode,
        game_mode=spec.game_mode,
        planar_mode=spec.planar_mode,
        mode_path=spec.mode_path,
    )
    reset_effective: Mapping[str, Any] = {}
    step_effective: list[Mapping[str, Any]] = []
    diagnostics: Mapping[str, Any] = {}
    error: str | None = None
    try:
        _, reset_info = env.reset(seed=spec.seed)
        reset_effective = _extract_effective_environment(reset_info)
        for _ in range(max(1, steps)):
            _, _, terminated, truncated, info = env.step({})
            step_effective.append(_extract_effective_environment(info))
            if terminated or truncated:
                break
        diagnostics = env.get_diagnostics()
    except Exception as exc:  # pragma: no cover - recorded as smoke evidence
        error = str(exc)
    finally:
        env.close()

    last_effective = dict(step_effective[-1] if step_effective else reset_effective)
    expected = {
        "mapKey": spec.map_key,
        "domainMode": spec.domain_mode,
        "gameMode": spec.game_mode,
        "planarMode": spec.planar_mode,
        "modePath": spec.mode_path,
    }
    matches = {
        key: last_effective.get(key) == value
        for key, value in expected.items()
    }
    mode_matches = str(last_effective.get("mode") or "").lower() == ("hunt" if spec.game_mode == "HUNT" else "classic")
    matches["mode"] = mode_matches

    stats = diagnostics.get("stats") if isinstance(diagnostics, Mapping) else {}
    contract_smoke = stats.get("contractSmoke") if isinstance(stats, Mapping) else {}
    latest_observation = contract_smoke.get("latestObservation") if isinstance(contract_smoke, Mapping) else {}
    return {
        "id": spec.domain_mode,
        "ok": error is None and bool(step_effective) and all(matches.values()),
        "error": error,
        "requested": expected,
        "resetEffectiveEnvironment": dict(reset_effective),
        "lastStepEffectiveEnvironment": last_effective,
        "matches": matches,
        "observation": {
            "length": latest_observation.get("observationLength") if isinstance(latest_observation, Mapping) else None,
            "domainId": latest_observation.get("domainId") if isinstance(latest_observation, Mapping) else None,
            "mode": latest_observation.get("mode") if isinstance(latest_observation, Mapping) else None,
            "planarMode": latest_observation.get("planarMode") if isinstance(latest_observation, Mapping) else None,
        },
        "stepsObserved": len(step_effective),
        "bridgeTelemetry": (diagnostics.get("bridgeTelemetry") or {}) if isinstance(diagnostics, Mapping) else {},
    }


def _source_checks() -> dict[str, bool]:
    return {
        "headlessCliAcceptsModeMapArgs": _file_contains(
            SINGLE_ENV_BRIDGE_PATH,
            "--map-key",
            "--domain-mode",
            "--game-mode",
            "--planar-mode",
            "--mode-path",
        ),
        "pythonEnvForwardsModeMapArgs": _file_contains(
            CURVIOS_ENV_PATH,
            "map_key",
            "domain_mode",
            "game_mode",
            "planar_mode",
            "mode_path",
        ),
        "headlessRunnerReportsEffectiveEnvironment": _file_contains(
            HEADLESS_RUNNER_PATH,
            "effectiveEnvironment",
            "mapKey",
            "domainMode",
            "gameMode",
            "planarMode",
            "modePath",
        ),
        "huntModePathIsCanonicalFight": _file_contains(
            HEADLESS_RUNNER_PATH,
            "domainId: 'hunt-3d', modePath: 'fight'",
            "domainId: 'hunt-2d', modePath: 'fight'",
        ),
        "trainEvalReportsConfiguredEffectiveEnv": _file_contains(
            LEARNER_SMOKE_PATH,
            "effectiveMap",
            "effectiveDomainMode",
            "effectiveGameMode",
            "effectivePlanarMode",
            "effectiveModePath",
        ),
    }


def _policy_decision(probes: list[Mapping[str, Any]]) -> dict[str, Any]:
    observations = [probe.get("observation") for probe in probes if isinstance(probe.get("observation"), Mapping)]
    observation_lengths = sorted({int(obs.get("length")) for obs in observations if obs.get("length") is not None})
    domain_ids = sorted({str(obs.get("domainId")) for obs in observations if obs.get("domainId")})
    modes = sorted({str(obs.get("mode")) for obs in observations if obs.get("mode")})
    planar_modes = sorted({bool(obs.get("planarMode")) for obs in observations if "planarMode" in obs})
    same_observation_length = len(observation_lengths) == 1
    distinct_domains_visible = len(domain_ids) == 4 and len(modes) >= 2 and len(planar_modes) == 2
    return {
        "decision": "separate-policy-or-normalize-state-required-before-quality-comparison",
        "sharedPolicyAllowedForStartupSmokes": bool(same_observation_length),
        "sharedPolicyAllowedForQualityComparison": False,
        "separateNormalizeStateRequiredForComparison": True,
        "basis": {
            "observationLengths": observation_lengths,
            "domainIds": domain_ids,
            "modes": modes,
            "planarModes": planar_modes,
            "sameObservationLength": same_observation_length,
            "distinctDomainsVisible": distinct_domains_visible,
        },
        "reason": "All four mode surfaces share the bridge shape, but game-mode and planar/domain semantics are materially different; quality comparisons need per-mode telemetry and isolated normalization evidence.",
    }


def build_report(*, steps: int, timeout_seconds: float) -> dict[str, Any]:
    probes = [_run_probe(spec, steps=steps, timeout_seconds=timeout_seconds) for spec in PROBES]
    source_checks = _source_checks()
    all_probes_ok = all(bool(probe.get("ok")) for probe in probes)
    all_source_checks_ok = all(source_checks.values())
    policy_decision = _policy_decision(probes)
    comparison_gate = {
        "dqnPpoComparisonStarted": False,
        "envScalingComparisonStarted": False,
        "modeMapTelemetryRequired": True,
        "modeMapTelemetryComplete": all_probes_ok,
        "effectiveValuesMustMatchConfig": True,
        "comparisonsAllowedAfterThisSmoke": bool(all_probes_ok),
        "blockedReasons": [] if all_probes_ok else ["mode-map-telemetry-missing-or-deviating"],
    }
    phase_coverage = {
        "93K.3.1": bool(
            source_checks["headlessCliAcceptsModeMapArgs"]
            and source_checks["pythonEnvForwardsModeMapArgs"]
            and source_checks["headlessRunnerReportsEffectiveEnvironment"]
            and source_checks["huntModePathIsCanonicalFight"]
        ),
        "93K.3.2": bool(all_probes_ok),
        "93K.3.3": bool(policy_decision["decision"] and not policy_decision["sharedPolicyAllowedForQualityComparison"]),
        "93K.3.4": bool(comparison_gate["modeMapTelemetryRequired"] and not comparison_gate["dqnPpoComparisonStarted"] and not comparison_gate["envScalingComparisonStarted"]),
    }
    ok = all(phase_coverage.values()) and all_source_checks_ok
    return {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_mode_map_smokes.py",
        "gitSha": _git_sha(),
        "ok": ok,
        "blockId": "BT93K",
        "phaseId": "93K.3",
        "resultClass": "mode-map-smoke-ready" if ok else "mode-map-smoke-red",
        "phaseCoverage": phase_coverage,
        "summary": {
            "probeCount": len(probes),
            "probeIds": [probe.get("id") for probe in probes],
            "allProbesOk": all_probes_ok,
            "allSourceChecksOk": all_source_checks_ok,
            "qualityClaimAllowed": False,
            "bt94aClaimAllowed": False,
        },
        "probes": probes,
        "policyDecision": policy_decision,
        "comparisonGate": comparison_gate,
        "sourceChecks": source_checks,
        "sourceArtifacts": {
            "headlessRunner": _source(HEADLESS_RUNNER_PATH, "JS headless runner"),
            "singleEnvBridge": _source(SINGLE_ENV_BRIDGE_PATH, "Node single env bridge CLI"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python Curvios env"),
            "learnerSmoke": _source(LEARNER_SMOKE_PATH, "PPO train/eval report writer"),
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
            "holdoutUsed": False,
        },
        "commands": {
            "write": "python python/scripts/bt93k_mode_map_smokes.py --write-report",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    parser.add_argument("--steps", type=int, default=2)
    parser.add_argument("--timeout-seconds", type=float, default=12.0)
    args = parser.parse_args()

    report = build_report(steps=max(1, int(args.steps)), timeout_seconds=max(1.0, float(args.timeout_seconds)))
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
