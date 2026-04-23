"""BT93A claim manifest for the harness-only 2-env lane start."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.authority_snapshot import (  # noqa: E402
    ACTION_BOOLEAN_FIELDS,
    ACTION_INDEX_FIELDS,
    ALLOWED_PPO_BUILD_LOCATIONS,
    READ_ONLY_RUNTIME_SURFACES,
)

FREEZE_CHECK_PATH = REPO_ROOT / "data" / "training" / "ppo" / "freeze_check.json"
SINGLE_ENV_SMOKE_PATH = REPO_ROOT / "data" / "training" / "ppo" / "single_env_smoke.json"
THROUGHPUT_ANALYSIS_PATH = REPO_ROOT / "data" / "training" / "ppo" / "throughput_analysis_btf08.json"
ARTIFACT_PATH = REPO_ROOT / "data" / "training" / "ppo" / "bt93a_claim_manifest.json"


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    freeze_check = _read_json(FREEZE_CHECK_PATH)
    single_env = _read_json(SINGLE_ENV_SMOKE_PATH)
    throughput = _read_json(THROUGHPUT_ANALYSIS_PATH)

    freeze_ok = bool(freeze_check.get("result", {}).get("freezeOk"))
    single_env_scope = single_env.get("scope", {})
    throughput_scope = throughput.get("bt93a_startbudgets", {})
    derived_steprate = throughput.get("derived_steprate_1worker", {})

    artifact = {
        "ok": freeze_ok and single_env.get("ok") is True and throughput.get("btfItem") == "BTF-08",
        "generatedBy": "python/scripts/bt93a_claim_manifest.py",
        "claimInputs": {
            "bt92SingleEnv": {
                "artifact": str(SINGLE_ENV_SMOKE_PATH.relative_to(REPO_ROOT)),
                "ok": single_env.get("ok") is True,
                "workerCount": single_env_scope.get("workerCount"),
                "multiEnv": single_env_scope.get("multiEnv"),
                "vecEnv": single_env_scope.get("vecEnv"),
                "ppoBaseline": single_env_scope.get("ppoBaseline"),
                "observationSchemaVersion": single_env_scope.get("observationSchemaVersion"),
                "observationLength": single_env_scope.get("observationLength"),
            },
            "freezeCheck": {
                "artifact": str(FREEZE_CHECK_PATH.relative_to(REPO_ROOT)),
                "freezeOk": freeze_ok,
                "snapshotCommit": freeze_check.get("snapshot", {}).get("snapshotCommit"),
                "reason": freeze_check.get("result", {}).get("reason"),
            },
            "throughputAnchor": {
                "artifact": str(THROUGHPUT_ANALYSIS_PATH.relative_to(REPO_ROOT)),
                "btfItem": throughput.get("btfItem"),
                "realisticStepsPerSec1Worker": derived_steprate.get("realistic_stepsPerSec"),
                "twoEnvSmokeSteps": throughput_scope.get("twoEnv_smoke_steps"),
                "twoEnvHarnessSteps": throughput_scope.get("twoEnv_harness_steps"),
                "twoEnvMaxWallClockBudgetMin": throughput_scope.get("twoEnv_max_wall_clock_budget_min"),
            },
        },
        "splitHandover": {
            "bt92BoundarySurface": {
                "booleanFields": ACTION_BOOLEAN_FIELDS,
                "indexFields": ACTION_INDEX_FIELDS,
                "rawIndexSurfaceOnly": True,
                "note": "CurviosEnv keeps the JS-authoritative bool/index boundary for harness work only.",
            },
            "bt93aScope": {
                "harnessOnly": True,
                "ppoBaseline": False,
                "trainPy": False,
                "evalPy": False,
            },
            "bt93bRequirement": {
                "splitHeadRequired": True,
                "note": "BT93B must introduce a split-head before any PPO scaffold trains on actions.",
            },
        },
        "scopeGuardrails": {
            "allowedBuildLocations": ALLOWED_PPO_BUILD_LOCATIONS,
            "readOnlyRuntimeSurfaces": READ_ONLY_RUNTIME_SURFACES,
            "phaseBoundary": "BT93A stays on harness, throughput, timeout and failure evidence only.",
        },
        "pendingVerification": {
            "deferredPhase": "93A.2",
            "deferredReason": "Multi-env smoke execution stays deferred until the throughput/failure phase.",
        },
        "nextSubPhase": "93A.1.2",
    }

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(f"{json.dumps(artifact, indent=2)}\n", encoding="utf-8")
    print(json.dumps({
        "ok": artifact["ok"],
        "artifact": str(ARTIFACT_PATH.relative_to(REPO_ROOT)),
        "freezeOk": freeze_ok,
        "nextSubPhase": artifact["nextSubPhase"],
    }, indent=2))


if __name__ == "__main__":
    main()
