"""BT93F.3 policy-mask and action-surface repair report.

The script keeps BT93F sidecar-only. It records whether the current SB3 PPO
path can consume a pre-sampling action mask; if not, it writes a narrow
follow-blocker instead of reclassifying post-decode clamps as policy masks.
"""

from __future__ import annotations

import argparse
import importlib.util
import inspect
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

from scripts.bt93c_action_surface_smoke import run_smoke

PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93E_ROOT = PPO_ROOT / "bt93e"
BT93F_ROOT = PPO_ROOT / "bt93f"

DEFAULT_REPORT_PATH = BT93F_ROOT / "action_surface_repair_report.json"
DEFAULT_SMOKE_PATH = BT93F_ROOT / "action_surface_smoke_93f3.json"


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


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get(mapping: Mapping[str, Any] | None, *keys: str) -> Any:
    current: Any = mapping
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _detect_stack(requirements_path: Path) -> dict[str, Any]:
    requirements = requirements_path.read_text(encoding="utf-8")
    stack: dict[str, Any] = {
        "requirements": _rel(requirements_path),
        "requirementsIncludesSb3Contrib": "sb3-contrib" in requirements,
        "sb3ContribImportable": importlib.util.find_spec("sb3_contrib") is not None,
        "stableBaselines3Version": None,
        "basePpoPredictAcceptsActionMasks": False,
        "multiCategoricalDistributionHasApplyMasking": False,
    }
    try:
        import stable_baselines3
        from stable_baselines3 import PPO
        from stable_baselines3.common.distributions import MultiCategoricalDistribution

        stack["stableBaselines3Version"] = stable_baselines3.__version__
        stack["basePpoPredictAcceptsActionMasks"] = "action_masks" in inspect.signature(PPO.predict).parameters
        stack["multiCategoricalDistributionHasApplyMasking"] = hasattr(
            MultiCategoricalDistribution,
            "apply_masking",
        )
    except Exception as exc:  # pragma: no cover - report must survive broken local envs
        stack["stackInspectionError"] = str(exc)
    stack["currentSb3PpoCanConsumePolicyMask"] = bool(
        stack["basePpoPredictAcceptsActionMasks"]
        or stack["multiCategoricalDistributionHasApplyMasking"]
        or stack["sb3ContribImportable"]
    )
    return stack


def _lane_separation(previous_action_report: Mapping[str, Any]) -> dict[str, Any]:
    lanes = previous_action_report.get("lanes") if isinstance(previous_action_report.get("lanes"), Mapping) else {}
    result: dict[str, Any] = {}
    for lane_name, lane in lanes.items():
        telemetry = _get(lane, "actionSurfaceTelemetry") or {}
        result[str(lane_name)] = {
            "policyLevelMask": telemetry.get("policyLevelMask"),
            "postDecodeClamp": telemetry.get("postDecodeClamp"),
            "sanitizer": telemetry.get("sanitizer"),
            "safetyVeto": telemetry.get("safetyVeto"),
            "invalidAction": telemetry.get("invalidAction"),
            "noopFallback": telemetry.get("noopFallback"),
            "laneVerdict": lane.get("laneVerdict") if isinstance(lane, Mapping) else None,
        }
    return result


def build_report(smoke_path: Path) -> dict[str, Any]:
    smoke = _read_json(smoke_path)
    previous_action = _read_json(BT93E_ROOT / "action_surface_hardening_report.json")
    start_package = _read_json(BT93F_ROOT / "start_repair_package.json")
    no_go = _read_json(BT93F_ROOT / "no_go_report.json")
    terminal = _read_json(BT93F_ROOT / "terminal_reward_failure_report.json")
    requirements_path = PYTHON_ROOT / "requirements-ppo.txt"
    stack = _detect_stack(requirements_path)

    surface = smoke.get("surface") if isinstance(smoke.get("surface"), Mapping) else {}
    checks = smoke.get("checks") if isinstance(smoke.get("checks"), Mapping) else {}
    policy_mask = surface.get("policyLevelMasking") if isinstance(surface.get("policyLevelMasking"), Mapping) else {}
    mask_specified = bool(policy_mask.get("specified"))
    mask_consumable = bool(stack["currentSb3PpoCanConsumePolicyMask"])
    f30_closed = mask_specified and mask_consumable and bool(policy_mask.get("preSamplingAppliedInCurrentSb3Path"))
    result_class = "action-surface-repaired" if f30_closed else "diagnose-blocked"

    return {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93f_action_surface_repair_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93F",
        "phaseId": "93F.3",
        "resultClass": result_class,
        "phaseCoverage": {
            "93F.3.1": True,
            "93F.3.2": mask_specified and checks.get("policyMaskSourceFromJsTransitionPayload") is True,
            "93F.3.3": checks.get("postDecodeClampSeparatedFromPolicyMask") is True,
            "93F.3.4": smoke.get("ok") is True
            and checks.get("sb3CompatibleActionSpace") is True
            and checks.get("forcedInvalidFallbackTelemetryVisible") is True
            and checks.get("forcedNoopFallbackTelemetryVisible") is True,
        },
        "policyLevelMaskDecision": {
            "decision": "follow-blocker" if not f30_closed else "implemented",
            "reason": (
                "Base stable-baselines3 PPO/MultiCategoricalDistribution exposes no action-mask consumer in the pinned "
                "BT93C clean stack, and sb3-contrib is not pinned. The mask source/spec is recorded, but BT94A remains closed."
            )
            if not f30_closed
            else "Mask-capable PPO path consumes the JS-authoritative mask before sampling.",
            "maskSpecified": mask_specified,
            "maskConsumedBeforeSampling": bool(policy_mask.get("preSamplingAppliedInCurrentSb3Path")),
            "stack": stack,
        },
        "maskSourceContract": {
            "source": policy_mask.get("source"),
            "sourceIsJsAuthoritativeTransitionPayload": checks.get("policyMaskSourceFromJsTransitionPayload") is True,
            "inventoryGatedBooleanFields": policy_mask.get("inventoryGatedBooleanFields"),
            "indexFieldRule": policy_mask.get("indexFieldRule"),
            "trainEvalHoldoutName": "policyLevelMask",
            "sameNameInTrainEvalHoldout": True,
        },
        "telemetrySeparation": {
            "schemaNames": [
                "policyLevelMask",
                "postDecodeClamp",
                "sanitizer",
                "safetyVeto",
                "invalidAction",
                "noopFallback",
            ],
            "policyMaskAndPostDecodeClampMustNotBeMixed": True,
            "previousBt93eLanes": _lane_separation(previous_action),
            "bt93fSmoke": {
                "path": _rel(smoke_path),
                "checks": checks,
                "policyLevelMasking": smoke.get("policyLevelMasking"),
                "fallbackProbes": smoke.get("fallbackProbes"),
            },
        },
        "findingDisposition": {
            "F.03": "closed",
            "F.20": "closed",
            "F.30": "closed" if f30_closed else "still-blocking",
        },
        "bt94aImpact": {
            "claimableAfter93F3": bool(f30_closed),
            "blockedFindings": [] if f30_closed else ["F.30"],
            "decision": "BT94A remains closed; 93F.3 records a policy-mask follow-blocker instead of relabeling post-decode clamp."
            if not f30_closed
            else "93F.4 may run a small repair learner with mask-capable action sampling.",
        },
        "evidenceLimits": {
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "candidateRun": False,
            "freezeCandidate": False,
        },
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "noGoResultClass": no_go.get("resultClass"),
            "terminalRewardFailureResultClass": terminal.get("resultClass"),
            "sourceNoStartState": start_package.get("currentNoStartState"),
        },
        "commands": {
            "smokeAndReport": (
                "tmp\\bt93c-clean-env-20260424T155919Z\\Scripts\\python.exe "
                "python\\scripts\\bt93f_action_surface_repair_report.py --write-smoke --write-report"
            ),
        },
        "sourceArtifacts": {
            "bt93fActionSurfaceSmoke": _source(smoke_path, "BT93F.3 action-surface smoke"),
            "bt93eActionSurfaceHardening": _source(
                BT93E_ROOT / "action_surface_hardening_report.json",
                "BT93E action-surface source",
            ),
            "bt93fStartRepairPackage": _source(
                BT93F_ROOT / "start_repair_package.json",
                "BT93F start repair package",
            ),
            "bt93fNoGoReport": _source(BT93F_ROOT / "no_go_report.json", "BT93F no-go report"),
            "bt93fTerminalRewardFailure": _source(
                BT93F_ROOT / "terminal_reward_failure_report.json",
                "BT93F terminal/reward/failure report",
            ),
            "ppoRequirements": _source(requirements_path, "BT93C/BT93F PPO dependency pin"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-smoke", action="store_true", help="Write BT93F action-surface smoke.")
    parser.add_argument("--write-report", action="store_true", help="Write BT93F action-surface repair report.")
    parser.add_argument("--smoke-output", type=Path, default=DEFAULT_SMOKE_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--train-timesteps", type=int, default=16)
    parser.add_argument("--eval-steps", type=int, default=8)
    args = parser.parse_args()

    smoke_path = args.smoke_output.resolve()
    report_path = args.output.resolve()
    if args.write_smoke:
        run_smoke(
            output_path=smoke_path,
            train_timesteps=args.train_timesteps,
            eval_steps=args.eval_steps,
            block_id="BT93F",
            phase_id="93F.3.4",
            include_fallback_probes=True,
        )
    report = build_report(smoke_path)
    if args.write_report:
        _write_json(report_path, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "findingDisposition": report["findingDisposition"],
                "blockedFindings": report["bt94aImpact"]["blockedFindings"],
                "wrote": {
                    "smoke": _rel(smoke_path) if args.write_smoke else None,
                    "report": _rel(report_path) if args.write_report else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
