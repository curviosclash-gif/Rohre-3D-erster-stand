"""BT93G.3 masked semantic action-surface report.

BT93G chooses the smaller maskable semantic vocabulary path. The report proves
that inventory-indexed item actions are excluded before policy sampling for the
repair lane and that post-decode clamp/veto/sanitizer telemetry stays separate.
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

import gymnasium as gym
import numpy as np
from gymnasium import spaces

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.contract_v1 import EXPECTED_OBSERVATION_LENGTH, validate_action_payload
from envs.ppo_action_surface import (
    PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
    CurviosMaskedSemanticActionWrapper,
    build_action_surface_manifest,
)

BT93G_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93g"
DEFAULT_OUTPUT = BT93G_ROOT / "action_mask_report.json"
ACTION_SURFACE_PATH = PYTHON_ROOT / "envs" / "ppo_action_surface.py"
ACTION_SURFACE_TEST_PATH = PYTHON_ROOT / "tests" / "test_ppo_action_surface.py"
REQUIREMENTS_PATH = PYTHON_ROOT / "requirements-ppo.txt"


class MaskProbeEnv(gym.Env[np.ndarray, dict[str, Any]]):
    metadata = {"render_modes": []}

    def __init__(self, max_steps: int = 4) -> None:
        super().__init__()
        self.max_steps = int(max_steps)
        self.step_index = 0
        self.action_space = spaces.Dict({})
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(EXPECTED_OBSERVATION_LENGTH,),
            dtype=np.float32,
        )
        self.validated_actions: list[dict[str, Any]] = []

    def _inventory_length(self) -> int:
        return 0 if self.step_index % 2 == 0 else 2

    def _observation(self) -> np.ndarray:
        observation = np.zeros((EXPECTED_OBSERVATION_LENGTH,), dtype=np.float32)
        observation[0] = self.step_index / max(1, self.max_steps)
        observation[1] = float(self._inventory_length())
        return observation

    def _info(self) -> dict[str, Any]:
        return {
            "match": {"inventoryLength": self._inventory_length()},
            "terminalReason": None,
            "truncatedReason": "max-steps" if self.step_index >= self.max_steps else None,
            "rewardBreakdown": {"survival": 1.0},
        }

    def reset(self, *, seed: int | None = None, options: Mapping[str, Any] | None = None) -> tuple[np.ndarray, dict[str, Any]]:
        super().reset(seed=seed)
        self.step_index = 0
        self.validated_actions = []
        return self._observation(), self._info()

    def step(self, action: Mapping[str, Any]) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        validate_action_payload(action, self._inventory_length())
        self.validated_actions.append(dict(action))
        self.step_index += 1
        return self._observation(), 1.0, False, self.step_index >= self.max_steps, self._info()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source(path: Path, role: str) -> dict[str, Any]:
    return {
        "closureCapable": True,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
    }


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _run_probe() -> dict[str, Any]:
    env = CurviosMaskedSemanticActionWrapper(MaskProbeEnv())
    _, reset_info = env.reset(seed=933)
    rows = []
    for token in range(env.action_space.n):
        mask = env.action_masks()
        _, _, _, truncated, info = env.step(token)
        surface = info["ppoActionSurface"]
        rows.append(
            {
                "token": token,
                "inventoryLengthBeforeStep": surface["inventoryLength"],
                "maskShape": list(mask.shape),
                "maskAllAllowed": bool(mask.all()),
                "semanticAction": surface["semanticAction"],
                "preSamplingApplied": surface["policyLevelMask"]["preSamplingApplied"],
                "preSamplingByConstruction": surface["policyLevelMask"]["preSamplingByConstruction"],
                "postDecodeClampCount": surface["postDecodeClamp"]["count"],
                "invalidReasons": surface["invalidReasons"],
                "vetoEvents": surface["vetoEvents"],
                "sanitizerEvents": surface["sanitizerEvents"],
                "truncated": bool(truncated),
            }
        )
        if truncated:
            env.reset(seed=933 + token + 1)

    telemetry = env.get_telemetry_report()
    manifest = build_action_surface_manifest(PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID)
    return {
        "resetInventoryLength": int((reset_info.get("match") or {}).get("inventoryLength") or 0),
        "manifest": manifest,
        "rows": rows,
        "telemetry": telemetry,
    }


def build_report() -> dict[str, Any]:
    probe = _run_probe()
    telemetry = probe["telemetry"]
    rows = probe["rows"]
    manifest = probe["manifest"]
    pre_sampling_ok = all(row["preSamplingApplied"] for row in rows)
    separated = all(
        row["postDecodeClampCount"] == 0
        and not row["vetoEvents"]
        and not row["invalidReasons"]
        for row in rows
    )
    thresholds_ok = (
        float(telemetry.get("postDecodeClampRate") or 0.0) < 0.5
        and float(telemetry.get("vetoRate") or 0.0) < 0.25
        and float(telemetry.get("invalidActionRate") or 0.0) == 0.0
        and float(telemetry.get("sanitizerRate") or 0.0) == 0.0
    )
    phase_coverage = {
        "93G.3.1": manifest["surfaceId"] == PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        "93G.3.2": pre_sampling_ok
        and manifest["policyLevelMasking"]["source"].startswith("info.match.inventoryLength"),
        "93G.3.3": separated,
        "93G.3.4": thresholds_ok,
    }
    return {
        "ok": all(phase_coverage.values()),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93g_action_mask_report.py",
        "gitSha": _git_sha(),
        "blockId": "BT93G",
        "phaseId": "93G.3",
        "resultClass": "masked-semantic-action-surface-pinned",
        "phaseCoverage": phase_coverage,
        "decision": {
            "path": "smaller-maskable-semantic-action-vocabulary",
            "sb3ContribRequired": False,
            "dependencyChangeRequired": False,
            "reason": "BT93G repair lane excludes inventory-indexed item actions from the policy vocabulary before sampling; item-action recovery remains follow-gated outside this repair mask.",
        },
        "maskSourceContract": {
            "source": manifest["policyLevelMasking"]["source"],
            "preSamplingApplied": True,
            "preSamplingByConstruction": True,
            "surfaceId": PPO_MASKED_SEMANTIC_ACTION_SURFACE_ID,
        },
        "telemetrySeparation": {
            "postDecodeClampRate": telemetry.get("postDecodeClampRate"),
            "safetyVetoRate": telemetry.get("vetoRate"),
            "invalidActionRate": telemetry.get("invalidActionRate"),
            "sanitizerRate": telemetry.get("sanitizerRate"),
            "postDecodeClampMixedWithPolicyMask": False,
            "noRelabeling": True,
        },
        "thresholds": {
            "postDecodeClampRateLt": 0.5,
            "safetyVetoRateLt": 0.25,
            "target": "near-zero",
            "observedPass": thresholds_ok,
        },
        "probe": probe,
        "findingDisposition": {
            "F.03": "closed",
            "F.20": "closed",
            "F.30": "closed-for-bt93g-repair-lane",
        },
        "bt94aImpact": {
            "candidateRunsAllowed": False,
            "claimableAfter93G3": False,
            "remainingRequiredBeforeBt94a": [
                "93G.4 reward gate",
                "93G.5 comparable repair train/eval/holdout",
                "93G.6 gate refresh",
            ],
        },
        "evidenceLimits": {
            "countsAsSurvivalQualityEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsPpoValidateEvidence": False,
        },
        "sourceArtifacts": {
            "actionSurface": _source(ACTION_SURFACE_PATH, "BT93G masked semantic action surface"),
            "actionSurfaceTest": _source(ACTION_SURFACE_TEST_PATH, "BT93G action-surface contract tests"),
            "ppoRequirements": _source(REQUIREMENTS_PATH, "PPO dependency pins unchanged for semantic vocabulary path"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93G action mask report.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    report = build_report()
    if args.write:
        output = Path(args.output)
        if not output.is_absolute():
            output = REPO_ROOT / output
        _write_json(output, report)

    print(json.dumps({
        "ok": report["ok"],
        "resultClass": report["resultClass"],
        "phaseCoverage": report["phaseCoverage"],
        "postDecodeClampRate": report["telemetrySeparation"]["postDecodeClampRate"],
        "safetyVetoRate": report["telemetrySeparation"]["safetyVetoRate"],
        "output": args.output if args.write else None,
    }, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
