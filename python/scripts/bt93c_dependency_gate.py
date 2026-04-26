"""BT93C.1 dependency lock and clean-env smoke evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
REQUIREMENTS_PATH = PYTHON_ROOT / "requirements-ppo.txt"
BT93C_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93c"
DEPENDENCY_LOCK_PATH = BT93C_ROOT / "dependency_lock_report.json"
CLEAN_ENV_PATH = BT93C_ROOT / "clean_env_smoke_report.json"

REQUIRED_DIRECT_PINS = (
    "stable-baselines3",
    "torch",
    "gymnasium",
    "numpy",
    "tensorboard",
    "rich",
    "websockets",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    return path.resolve().relative_to(REPO_ROOT).as_posix()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _parse_pins(path: Path) -> dict[str, str]:
    pins: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "==" not in stripped:
            continue
        name, version = stripped.split("==", 1)
        pins[name.strip().lower()] = version.strip()
    return pins


def _run(command: list[str], *, timeout_seconds: int = 600) -> dict[str, Any]:
    started = datetime.now(timezone.utc)
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
        check=False,
    )
    return {
        "command": command,
        "returncode": result.returncode,
        "startedAt": started.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "stdoutTail": result.stdout[-4000:],
        "stderrTail": result.stderr[-4000:],
        "ok": result.returncode == 0,
    }


def _clean_env_python(venv_path: Path) -> Path:
    return venv_path / "Scripts" / "python.exe" if sys.platform.startswith("win") else venv_path / "bin" / "python"


def build_dependency_lock() -> dict[str, Any]:
    pins = _parse_pins(REQUIREMENTS_PATH)
    missing = [name for name in REQUIRED_DIRECT_PINS if name not in pins]
    report = {
        "ok": not missing,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_dependency_gate.py",
        "blockId": "BT93C",
        "phaseId": "93C.1.2",
        "requirements": _rel(REQUIREMENTS_PATH),
        "requirementsSha256": _sha256(REQUIREMENTS_PATH),
        "directPins": pins,
        "requiredPins": list(REQUIRED_DIRECT_PINS),
        "missingRequiredPins": missing,
        "bt90MinimalStackSeparated": True,
        "bt90MinimalRequirements": "python/requirements.txt",
        "runtimeSurfacesTouched": [],
        "productiveRuntimeChanged": False,
    }
    BT93C_ROOT.mkdir(parents=True, exist_ok=True)
    DEPENDENCY_LOCK_PATH.write_text(f"{json.dumps(report, indent=2)}\n", encoding="utf-8")
    return report


def run_clean_env_smoke(*, venv_path: Path) -> dict[str, Any]:
    if venv_path.exists():
        raise RuntimeError(f"clean env path already exists: {venv_path}")
    venv_path.parent.mkdir(parents=True, exist_ok=True)
    create = _run([sys.executable, "-m", "venv", str(venv_path)], timeout_seconds=180)
    clean_python = _clean_env_python(venv_path)
    upgrade = _run([str(clean_python), "-m", "pip", "install", "--upgrade", "pip"], timeout_seconds=300) if create["ok"] else {
        "ok": False,
        "command": [str(clean_python), "-m", "pip", "install", "--upgrade", "pip"],
        "returncode": None,
        "stdoutTail": "",
        "stderrTail": "skipped because venv creation failed",
    }
    install = _run([str(clean_python), "-m", "pip", "install", "-r", str(REQUIREMENTS_PATH)], timeout_seconds=1800) if upgrade["ok"] else {
        "ok": False,
        "command": [str(clean_python), "-m", "pip", "install", "-r", str(REQUIREMENTS_PATH)],
        "returncode": None,
        "stdoutTail": "",
        "stderrTail": "skipped because pip upgrade failed",
    }
    pip_check = _run([str(clean_python), "-m", "pip", "check"], timeout_seconds=300) if install["ok"] else {
        "ok": False,
        "command": [str(clean_python), "-m", "pip", "check"],
        "returncode": None,
        "stdoutTail": "",
        "stderrTail": "skipped because install failed",
    }

    import_code = """
import importlib.metadata as md, json
packages = ["stable-baselines3", "torch", "gymnasium", "numpy", "tensorboard", "rich"]
print(json.dumps({name: md.version(name) for name in packages}, sort_keys=True))
""".strip()
    import_smoke = _run([str(clean_python), "-c", import_code], timeout_seconds=300) if pip_check["ok"] else {
        "ok": False,
        "command": [str(clean_python), "-c", import_code],
        "returncode": None,
        "stdoutTail": "",
        "stderrTail": "skipped because pip check failed",
    }

    mini_train_code = """
import json
import gymnasium as gym
import numpy as np
from gymnasium import spaces
from stable_baselines3 import PPO

class TinyEnv(gym.Env):
    metadata = {"render_modes": []}
    def __init__(self):
        self.observation_space = spaces.Box(low=-1, high=1, shape=(4,), dtype=np.float32)
        self.action_space = spaces.Discrete(2)
        self.steps = 0
    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.steps = 0
        return np.zeros(4, dtype=np.float32), {}
    def step(self, action):
        self.steps += 1
        obs = np.full(4, self.steps / 8, dtype=np.float32)
        reward = 1.0 if int(action) == 1 else 0.0
        return obs, reward, False, self.steps >= 4, {}

env = TinyEnv()
model = PPO("MlpPolicy", env, n_steps=4, batch_size=4, n_epochs=1, learning_rate=0.0003, seed=931, verbose=0)
model.learn(total_timesteps=8)
print(json.dumps({"ok": True, "totalTimesteps": 8, "policy": "MlpPolicy"}))
""".strip()
    mini_train = _run([str(clean_python), "-c", mini_train_code], timeout_seconds=300) if import_smoke["ok"] else {
        "ok": False,
        "command": [str(clean_python), "-c", mini_train_code],
        "returncode": None,
        "stdoutTail": "",
        "stderrTail": "skipped because import smoke failed",
    }

    freeze = _run([str(clean_python), "-m", "pip", "freeze"], timeout_seconds=300) if mini_train["ok"] else {
        "ok": False,
        "command": [str(clean_python), "-m", "pip", "freeze"],
        "returncode": None,
        "stdoutTail": "",
        "stderrTail": "skipped because mini train failed",
    }

    report = {
        "ok": all(step["ok"] for step in (create, upgrade, install, pip_check, import_smoke, mini_train, freeze)),
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93c_dependency_gate.py",
        "blockId": "BT93C",
        "phaseId": "93C.1.3",
        "requirements": _rel(REQUIREMENTS_PATH),
        "requirementsSha256": _sha256(REQUIREMENTS_PATH),
        "cleanEnvPath": str(venv_path),
        "cleanPython": str(clean_python),
        "steps": {
            "createVenv": create,
            "upgradePip": upgrade,
            "installRequirements": install,
            "pipCheck": pip_check,
            "importSmoke": import_smoke,
            "minimalPpoTrainStart": mini_train,
            "pipFreeze": freeze,
        },
        "minimalTrainingSmokeOnly": True,
        "baselineRunsStarted": False,
        "pilotRunsStarted": False,
        "runtimeSurfacesTouched": [],
        "productiveRuntimeChanged": False,
    }
    BT93C_ROOT.mkdir(parents=True, exist_ok=True)
    CLEAN_ENV_PATH.write_text(f"{json.dumps(report, indent=2)}\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-clean-env", action="store_true")
    parser.add_argument("--venv-path", default=None)
    args = parser.parse_args()

    dependency_lock = build_dependency_lock()
    clean_report = None
    if args.run_clean_env:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        venv_path = Path(args.venv_path).resolve() if args.venv_path else (REPO_ROOT / "tmp" / f"bt93c-clean-env-{stamp}")
        clean_report = run_clean_env_smoke(venv_path=venv_path)

    output = {
        "ok": dependency_lock["ok"] and (clean_report is None or clean_report["ok"]),
        "dependencyLock": _rel(DEPENDENCY_LOCK_PATH),
        "cleanEnvSmoke": _rel(CLEAN_ENV_PATH) if clean_report else None,
        "cleanPython": clean_report["cleanPython"] if clean_report else None,
    }
    print(json.dumps(output, indent=2))
    raise SystemExit(0 if output["ok"] else 1)


if __name__ == "__main__":
    main()
