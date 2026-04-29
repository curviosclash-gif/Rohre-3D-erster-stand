"""BT93K.0 preflight and user-owned side-lane quarantine report."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93K_ROOT = PPO_ROOT / "bt93k"
DEFAULT_REPORT_PATH = BT93K_ROOT / "preflight_quarantine_report.json"

INPUT_ARTIFACTS = {
    "bt93jLongrun": PPO_ROOT / "bt93j" / "user_owned_1m_longrun_report.json",
    "bt93jPostDecision": PPO_ROOT / "bt93j" / "post_longrun_decision_report.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
    "userOwned4EnvFailureReport": REPO_ROOT
    / "docs"
    / "Fehlerberichte"
    / "2026-04-27_user-owned-4env-longrun-ended-without-final-report.md",
    "userOwnedStopLog": REPO_ROOT
    / "logs"
    / "training"
    / "user-owned-survival-stop"
    / "20260427T124452.stop.json",
}

USER_OWNED_PATTERNS = (
    "data/training/ppo/user-owned-survival-3m*",
    "data/training/ppo/user-owned-survival-3m-4env*",
    "logs/training/user-owned-survival-stop*",
    "dev/scripts/*user-owned*survival*.ps1",
    "python/configs/ppo_user_owned_survival*.json",
)

STALE_LABELS = (
    "BT93J",
    "93J.5b",
    "bt93j-user-owned-1m-proof-longrun",
    "user-owned-survival-3m",
    "user-owned-survival-3m-4env",
)

PROHIBITED_OUTCOMES = (
    "BT94A-claim",
    "candidate",
    "freeze",
    "baseline",
    "holdout",
    "promote",
    "PPO-Validate",
    "rollout",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _run_command(
    args: list[str],
    *,
    env: Mapping[str, str] | None = None,
    timeout_seconds: int = 180,
) -> dict[str, Any]:
    command_env = os.environ.copy()
    if env:
        command_env.update(env)
    executable_args = list(args)
    if os.name == "nt":
        resolved = shutil.which(executable_args[0], path=command_env.get("PATH"))
        if resolved:
            executable_args[0] = resolved
        elif executable_args[0] == "npm":
            npm_cmd = shutil.which("npm.cmd", path=command_env.get("PATH"))
            if npm_cmd:
                executable_args[0] = npm_cmd
    try:
        result = subprocess.run(
            executable_args,
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
            timeout=timeout_seconds,
            env=command_env,
        )
        return {
            "command": " ".join(args),
            "returnCode": result.returncode,
            "stdoutTail": result.stdout[-4000:],
            "stderrTail": result.stderr[-4000:],
            "timedOut": False,
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "command": " ".join(args),
            "returnCode": None,
            "stdoutTail": (exc.stdout or "")[-4000:] if isinstance(exc.stdout, str) else "",
            "stderrTail": (exc.stderr or "")[-4000:] if isinstance(exc.stderr, str) else "",
            "timedOut": True,
        }


def _git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_porcelain_entries() -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for line in _git_output(["git", "status", "--porcelain=v1"]).splitlines():
        if not line:
            continue
        if len(line) >= 4 and line[2] == " ":
            status = line[:2]
            path = line[3:]
        else:
            parts = line.split(maxsplit=1)
            status = parts[0]
            path = parts[1] if len(parts) > 1 else ""
        path = path.replace("\\", "/")
        entries.append({"status": status, "path": path})
    return entries


def _glob_existing(patterns: Iterable[str]) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    for pattern in patterns:
        for path in sorted(REPO_ROOT.glob(pattern), key=lambda item: item.as_posix()):
            matches.append({
                "pattern": pattern,
                "path": _rel(path),
                "exists": True,
                "isDir": path.is_dir(),
                "sha256": _sha256_file(path),
            })
    return matches


def _collect_training_processes() -> dict[str, Any]:
    powershell = (
        "$items = Get-CimInstance Win32_Process | "
        "Where-Object { ($_.Name -match '^(python|python3|node|node.exe|python.exe)') "
        "-and ($_.CommandLine -match '(training|ppo|bt93|train\\.py|eval\\.py|user-owned|headless-lane)') } | "
        "ForEach-Object { [PSCustomObject]@{ pid=$_.ProcessId; name=$_.Name; commandLine=$_.CommandLine } }; "
        "$items | ConvertTo-Json -Depth 4"
    )
    result = _run_command(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", powershell],
        timeout_seconds=30,
    )
    processes: list[dict[str, Any]] = []
    if result["returnCode"] == 0 and result["stdoutTail"].strip():
        try:
            parsed = json.loads(result["stdoutTail"])
            if isinstance(parsed, dict):
                processes = [parsed]
            elif isinstance(parsed, list):
                processes = [item for item in parsed if isinstance(item, dict)]
        except json.JSONDecodeError:
            processes = []

    own_pid = os.getpid()
    filtered = [
        process
        for process in processes
        if int(process.get("pid") or -1) != own_pid
    ]
    return {
        "collector": result,
        "activeTrainingProcessCount": len(filtered),
        "processes": filtered,
    }


def _artifact_info(path: Path) -> dict[str, Any]:
    info: dict[str, Any] = {
        "path": _rel(path),
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
    }
    if path.suffix == ".json" and path.exists():
        payload = _read_json(path)
        for key in (
            "resultClass",
            "claimable",
            "candidateRunsAllowed",
            "matrixDefinitionAllowed",
            "precomparison",
            "bt94aBlockerCount",
        ):
            if key in payload:
                info[key] = payload.get(key)
        if "bt93cState" in payload and isinstance(payload["bt93cState"], dict):
            state = payload["bt93cState"]
            info["bt94aBlockerCount"] = state.get("bt94aBlockerCount")
            info["precomparisonResultClass"] = state.get("precomparisonResultClass")
    return info


def _summarize_bt93j() -> dict[str, Any]:
    longrun = _read_json(INPUT_ARTIFACTS["bt93jLongrun"])
    post_decision = _read_json(INPUT_ARTIFACTS["bt93jPostDecision"])
    final_eval = longrun.get("finalEval") or {}
    terminal = final_eval.get("terminalMatrix") or {}
    trend = longrun.get("trend") or {}
    reward_breakdown = final_eval.get("rewardBreakdown") or {}
    return {
        "longrunResultClass": longrun.get("resultClass"),
        "postDecisionResultClass": post_decision.get("resultClass"),
        "avgStepsPerEpisodeObserved": final_eval.get("avgStepsPerEpisodeObserved"),
        "dqnStepsDelta": trend.get("deltaVsDqnAnchor"),
        "naturalTerminalCount": terminal.get("naturalTerminalCount"),
        "playerDeadOnly": terminal.get("playerDeadOnly"),
        "progressReward": reward_breakdown.get("progressReward", 0),
        "objectiveReward": reward_breakdown.get("objectiveReward", 0),
        "phase93J6Allowed": post_decision.get("phase93J6Allowed"),
        "bt94aClaimableFromPostDecision": post_decision.get("bt94aClaimable"),
    }


def build_report(*, output_path: Path) -> dict[str, Any]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    guard_main = _run_command(
        ["npm", "run", "guard:main"],
        env={"ALLOW_NON_MAIN": "1"},
        timeout_seconds=180,
    )
    plan_check = _run_command(["npm", "run", "plan:check"], timeout_seconds=180)
    branch = _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    git_sha = _git_output(["git", "rev-parse", "HEAD"])
    dirty_entries = _git_porcelain_entries()
    user_owned_matches = _glob_existing(USER_OWNED_PATTERNS)
    user_owned_status = [
        entry for entry in dirty_entries if re.search(r"user[-_]owned[-_]survival[-_]3m", entry["path"])
    ]
    process_report = _collect_training_processes()

    blocking_reasons: list[str] = []
    if branch != "bot-training":
        blocking_reasons.append("branch_not_bot_training")
    if guard_main["returnCode"] != 0:
        blocking_reasons.append("guard_main_failed")
    if plan_check["returnCode"] != 0:
        blocking_reasons.append("plan_check_failed")
    if process_report["activeTrainingProcessCount"] > 0:
        blocking_reasons.append("active_python_or_node_training_processes_present")
    if not output_path.parent.exists():
        blocking_reasons.append("bt93k_output_directory_missing")

    run_blockers = list(blocking_reasons)
    run_blockers.append("supervisor_contract_missing_until_93K_1")

    return {
        "ok": guard_main["returnCode"] == 0
        and plan_check["returnCode"] == 0
        and process_report["activeTrainingProcessCount"] == 0,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93k_preflight_quarantine.py",
        "blockId": "BT93K",
        "phaseId": "93K.0",
        "git": {
            "branch": branch,
            "sha": git_sha,
            "expectedBranch": "bot-training",
            "branchExceptionApprovedByUser": True,
            "dirtyWorkspace": bool(dirty_entries),
            "dirtyEntries": dirty_entries,
        },
        "commands": {
            "guardMain": guard_main,
            "planCheck": plan_check,
        },
        "activeProcesses": process_report,
        "inputArtifacts": {key: _artifact_info(path) for key, path in INPUT_ARTIFACTS.items()},
        "bt93jStartState": _summarize_bt93j(),
        "userOwnedSideLaneQuarantine": {
            "closureCapable": False,
            "classification": "diagnostic-only",
            "matchedPaths": user_owned_matches,
            "dirtyStatusEntries": user_owned_status,
            "prohibitedAsEvidenceFor": list(PROHIBITED_OUTCOMES),
            "reason": (
                "The 3M/4-Env side lane has no BT93K run kind, no versioned supervisor "
                "contract, no PID/sidecar report, no graceful-stop proof, and no final "
                "run_exit_report.json."
            ),
        },
        "staleLabels": [
            {
                "label": label,
                "status": "historic-diagnostic-only",
                "requiredReplacement": "BT93K/93K.* run kind under data/training/ppo/bt93k/**",
            }
            for label in STALE_LABELS
        ],
        "writeTargets": {
            "bt93kRoot": _rel(output_path.parent),
            "reportPath": _rel(output_path),
            "exists": output_path.parent.exists(),
        },
        "noGoStatus": {
            "preflightBlockingReasons": blocking_reasons,
            "bt93kRunsAllowedNow": False,
            "runBlockingReasons": run_blockers,
            "noFurtherRunBefore": [
                "93K.1 supervisor_contract_report.json",
                "signal_metric_contract.json",
                "explicit run_exit_report contract",
                "cleared active process list",
            ],
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_REPORT_PATH,
        help="Path for preflight_quarantine_report.json.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = build_report(output_path=args.output)
    _write_json(args.output, report)
    print(f"Wrote {_rel(args.output)}")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
