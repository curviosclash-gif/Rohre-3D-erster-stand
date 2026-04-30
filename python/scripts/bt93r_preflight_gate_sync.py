"""PF.0 preflight for the BT93R-X repair chain.

The preflight records branch, plan/docs, graph, no-start, roadmap, and terminal
sanity state. It does not train, create candidates, consume holdout data, or
open BT93O/BT93P/BT94A.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
OUTPUT_PATH = PPO_ROOT / "bt93r" / "bt93r_preflight_gate_sync_report.json"

BOT_PLAN_PATH = REPO_ROOT / "docs" / "bot-training" / "Bot_Trainingsplan.md"
ROADMAP_PATH = REPO_ROOT / "docs" / "bot-training" / "Bot_Trainings_Roadmap.md"
NO_START_PATH = PPO_ROOT / "bt94a" / "no_start_gate.json"
BT93Q_CLOSURE_PATH = PPO_ROOT / "bt93q" / "closure_gate_report.json"
BT93Q_HANDOVER_PATH = PPO_ROOT / "bt93q" / "handover_package.json"
BT93N_CLOSURE_PATH = PPO_ROOT / "bt93n" / "closure_gate_report.json"

SOURCE_PRIORITY = [
    ("BT93P", PPO_ROOT / "bt93p" / "handover_package.json"),
    ("BT93X", PPO_ROOT / "bt93x" / "handover_package.json"),
    ("BT93O", PPO_ROOT / "bt93o" / "handover_package.json"),
    ("BT93W", PPO_ROOT / "bt93w" / "handover_package.json"),
    ("BT93Q", BT93Q_HANDOVER_PATH),
]

BLOCKED_ACTIONS = [
    "BT93R.1 claim while PF.0 is not preflight-green or explicitly excepted",
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


def _command(
    args: list[str],
    *,
    env: Mapping[str, str] | None = None,
    timeout: int = 180,
) -> dict[str, Any]:
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    try:
        result = subprocess.run(
            args,
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
            timeout=timeout,
            env=merged_env,
        )
        stdout = result.stdout.strip().splitlines()
        stderr = result.stderr.strip().splitlines()
        return {
            "command": " ".join(args),
            "exitCode": result.returncode,
            "ok": result.returncode == 0,
            "stdoutTail": stdout[-12:],
            "stderrTail": stderr[-12:],
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "command": " ".join(args),
            "exitCode": None,
            "ok": False,
            "timedOut": True,
            "stdoutTail": (exc.stdout or "").splitlines()[-12:] if isinstance(exc.stdout, str) else [],
            "stderrTail": (exc.stderr or "").splitlines()[-12:] if isinstance(exc.stderr, str) else [],
        }


def _json_command(args: list[str]) -> tuple[dict[str, Any], dict[str, Any]]:
    result = subprocess.run(
        args,
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    stdout_lines = result.stdout.strip().splitlines()
    stderr_lines = result.stderr.strip().splitlines()
    command = {
        "command": " ".join(args),
        "exitCode": result.returncode,
        "ok": result.returncode == 0,
        "stdoutTail": stdout_lines[-12:],
        "stderrTail": stderr_lines[-12:],
    }
    payload: dict[str, Any] = {}
    if command["ok"] and result.stdout.strip():
        try:
            payload = json.loads(result.stdout)
        except json.JSONDecodeError:
            payload = {}
    return command, payload


def _source(path: Path, role: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "path": _rel(path),
        "role": role,
        "exists": path.exists(),
        "isFile": path.is_file(),
        "sha256": _sha256_file(path),
        "blockId": payload.get("blockId") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
        "ok": payload.get("ok") if payload else None,
    }


def _latest_expected_source() -> dict[str, Any]:
    for block_id, path in SOURCE_PRIORITY:
        if path.is_file():
            payload = _read_json(path)
            return {
                "blockId": block_id,
                "path": _rel(path),
                "phaseId": payload.get("phaseId"),
                "resultClass": payload.get("resultClass"),
                "sha256": _sha256_file(path),
            }
    return {
        "blockId": None,
        "path": None,
        "phaseId": None,
        "resultClass": None,
        "sha256": None,
    }


def _source_block(no_start: Mapping[str, Any]) -> str | None:
    source = no_start.get("currentHandoverSource")
    if isinstance(source, Mapping):
        return str(source.get("blockId")) if source.get("blockId") else None
    return None


def _graph_state() -> dict[str, Any]:
    expected = {
        "BT93O": {"BT93W"},
        "BT93P": {"BT93O", "BT93X"},
        "BT94A": {"BT93P"},
    }
    observed: dict[str, Any] = {}
    commands: dict[str, Any] = {}
    stale: list[dict[str, Any]] = []
    for block_id, expected_deps in expected.items():
        command, payload = _json_command(["node", "scripts/query-knowledge-graph.mjs", "open-deps", block_id, "--json"])
        commands[block_id] = command
        deps = payload.get("openDependencies")
        dep_ids = {
            str(item.get("dependsOn"))
            for item in deps
            if isinstance(item, Mapping) and item.get("dependsOn")
        } if isinstance(deps, list) else set()
        observed[block_id] = {
            "expectedAny": sorted(expected_deps),
            "observed": sorted(dep_ids),
            "payload": payload,
            "ok": bool(dep_ids & expected_deps),
        }
        if not dep_ids & expected_deps:
            stale.append(
                {
                    "blockId": block_id,
                    "expectedAny": sorted(expected_deps),
                    "observed": sorted(dep_ids),
                }
            )
    return {
        "ok": not stale,
        "observed": observed,
        "stale": stale,
        "commands": commands,
    }


def _roadmap_state() -> dict[str, Any]:
    roadmap = ROADMAP_PATH.read_text(encoding="utf-8-sig") if ROADMAP_PATH.is_file() else ""
    plan = BOT_PLAN_PATH.read_text(encoding="utf-8") if BOT_PLAN_PATH.is_file() else ""
    required_terms = ["PF.0", "BT93R", "BT93W", "BT93X.0", "BT93O.99=bt93o-quality-green"]
    missing = [term for term in required_terms if term not in roadmap]
    stale_release_terms = [
        term
        for term in ["BT93M` bis `BT93P", "BT93M-P"]
        if term in roadmap
    ]
    plan_missing = [term for term in ["## Block PF.0", "## Block BT93R", "## Block BT93X.0"] if term not in plan]
    return {
        "ok": not missing and not stale_release_terms and not plan_missing,
        "requiredTermsPresent": sorted(set(required_terms) - set(missing)),
        "missingTerms": missing,
        "staleReleaseTerms": stale_release_terms,
        "planMissingTerms": plan_missing,
    }


def _terminal_raw_sanity(bt93q: Mapping[str, Any], bt93n: Mapping[str, Any]) -> dict[str, Any]:
    bt93q_blockers = bt93q.get("activeBlockers") if isinstance(bt93q.get("activeBlockers"), list) else []
    terminal = bt93n.get("terminalDisclosure") if isinstance(bt93n.get("terminalDisclosure"), Mapping) else {}
    terminal_counts = terminal.get("terminalReasonCounts") if isinstance(terminal.get("terminalReasonCounts"), Mapping) else {}
    disclosed_blocking = terminal.get("disclosedAsBlocking") is True
    known_walltrail_root = bt93n.get("rootCause") == "wall/trail"
    contradiction = (
        not disclosed_blocking
        and bool(terminal_counts)
        and (terminal.get("trainPlayerDeadShare") == 1.0 or terminal.get("evalPlayerDeadShare") == 1.0)
    )
    return {
        "ok": not contradiction,
        "resultClass": "terminal-raw-sanity-nonblocking-for-preflight" if not contradiction else "terminal-raw-contradiction",
        "bt93nRootCause": bt93n.get("rootCause"),
        "bt93nGateClass": bt93n.get("gateClass"),
        "terminalDisclosure": terminal,
        "bt93qActiveBlockers": bt93q_blockers,
        "knownWallTrailRootDisclosed": known_walltrail_root and disclosed_blocking,
        "interpretation": (
            "Terminal/player-dead state is already disclosed as blocking diagnosis input; PF.0 does not treat it as quality."
            if not contradiction
            else "Terminal raw state contradicts the disclosed gate state and blocks repair claims."
        ),
    }


def _guardrails() -> dict[str, Any]:
    return {
        "diagnosticOnly": True,
        "trainingStarted": False,
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
    }


def build_report(run_commands: bool) -> dict[str, Any]:
    branch = _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    sha = _git_output(["git", "rev-parse", "HEAD"])
    commands: dict[str, Any] = {}
    if run_commands:
        commands["guardMain"] = _command(["npm.cmd", "run", "guard:main"], env={"ALLOW_NON_MAIN": "1"})
        commands["planCheck"] = _command(["npm.cmd", "run", "plan:check"])
        commands["docsSync"] = _command(["npm.cmd", "run", "docs:sync"])
        commands["docsCheck"] = _command(["npm.cmd", "run", "docs:check"])
        commands["bt94aGateCheck"] = _command([sys.executable, "python/scripts/bt94a_gate_check.py", "--write-report"])

    no_start = _read_json(NO_START_PATH)
    bt93q_closure = _read_json(BT93Q_CLOSURE_PATH)
    bt93q_handover = _read_json(BT93Q_HANDOVER_PATH)
    bt93n_closure = _read_json(BT93N_CLOSURE_PATH)

    graph = _graph_state()
    roadmap = _roadmap_state()
    latest_source = _latest_expected_source()
    observed_no_start_source = _source_block(no_start)
    no_start_fresh = observed_no_start_source == latest_source.get("blockId")
    terminal = _terminal_raw_sanity(bt93q_closure, bt93n_closure)

    branch_guard = {
        "branch": branch,
        "expectedBranch": "bot-training",
        "ok": branch == "bot-training" and commands.get("guardMain", {}).get("ok") is not False,
        "nonMainAllowedByKickoff": branch == "bot-training",
        "guardCommand": commands.get("guardMain"),
    }
    plan_docs = {
        "planCheck": commands.get("planCheck"),
        "docsSync": commands.get("docsSync"),
        "docsCheck": commands.get("docsCheck"),
        "ok": all(
            commands.get(key, {}).get("ok") is True
            for key in ("planCheck", "docsSync", "docsCheck")
        ) if run_commands else None,
    }
    bt94a_no_start = {
        "ok": no_start.get("ok") is True,
        "resultClass": no_start.get("resultClass"),
        "claimable": no_start.get("claimable"),
        "candidateRunsAllowed": no_start.get("candidateRunsAllowed"),
        "matrixDefinitionAllowed": no_start.get("matrixDefinitionAllowed"),
        "candidateFreezeAllowed": no_start.get("candidateFreezeAllowed"),
        "observedCurrentSource": observed_no_start_source,
        "expectedCurrentSource": latest_source,
        "freshForRx": no_start_fresh,
        "staleReason": None if no_start_fresh else "no_start_gate currentHandoverSource does not follow R-X priority BT93P -> BT93X -> BT93O -> BT93W -> BT93Q.",
        "gateCommand": commands.get("bt94aGateCheck"),
    }

    result_class = "preflight-green"
    if not branch_guard["ok"]:
        result_class = "branch-guard-blocked"
    elif not plan_docs["ok"]:
        result_class = "plan-docs-gate-blocked"
    elif not graph["ok"]:
        result_class = "plan-graph-drift"
    elif not no_start_fresh:
        result_class = "bt94a-no-start-stale"
    elif not roadmap["ok"]:
        result_class = "roadmap-sync-required"
    elif not terminal["ok"]:
        result_class = "terminal-raw-sanity-blocked"

    opens_next = ["BT93R.1", "93X.0 read-only"] if result_class == "preflight-green" else []
    allow_next = opens_next or [
        "repair PF.0 blocker only",
        "refresh bt94a_gate_check source priority before BT93R.1" if result_class == "bt94a-no-start-stale" else "do not claim BT93R.1",
    ]
    blocks_next = [] if result_class == "preflight-green" else list(BLOCKED_ACTIONS)

    return {
        "schemaVersion": "bt93r-preflight-gate-sync-v1",
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93r_preflight_gate_sync.py",
        "git": {
            "branch": branch,
            "sha": sha,
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "blockId": "PF.0",
        "phaseId": "PF.0",
        "resultClass": result_class,
        "branch": branch,
        "guardMain": branch_guard,
        "planCheck": plan_docs["planCheck"],
        "docsSync": plan_docs["docsSync"],
        "docsCheck": plan_docs["docsCheck"],
        "graphOpenDeps": graph,
        "bt94aNoStartFreshness": bt94a_no_start,
        "roadmapSyncRequired": not roadmap["ok"],
        "roadmapSync": roadmap,
        "terminalRawSanity": terminal,
        "nextAllowedAction": allow_next[0],
        "allowNext": allow_next,
        "opensNext": opens_next,
        "blocksNext": blocks_next,
        "claimFlags": {
            "bt93rClaimAllowed": result_class == "preflight-green",
            "bt93x0ReadOnlyAllowed": result_class == "preflight-green",
            "bt93oClaimAllowed": False,
            "bt93pClaimAllowed": False,
            "bt94aClaimAllowed": False,
            "candidateRunsAllowed": False,
            "candidateFreezeAllowed": False,
        },
        "thresholdsLockedBeforeRun": {
            "notApplicableReason": "PF.0 is read-only governance preflight and runs no PPO training or eval sample.",
            "afterTheFactThresholdChangesAllowed": False,
        },
        "sampleCounts": {
            "trainingEpisodes": 0,
            "evalEpisodes": 0,
            "holdoutEpisodes": 0,
            "bt93nDiagnosticEpisodes": bt93n_closure.get("sampleQuality", {}).get("diagnosticEpisodes")
            if isinstance(bt93n_closure.get("sampleQuality"), Mapping)
            else None,
            "bt93qActiveBlockerCount": len(bt93q_closure.get("activeBlockers") or []),
        },
        "sourceArtifacts": [
            _source(BOT_PLAN_PATH, "active bot-training master plan"),
            _source(ROADMAP_PATH, "bot-training roadmap"),
            _source(NO_START_PATH, "BT94A no-start gate"),
            _source(BT93Q_CLOSURE_PATH, "BT93Q.99 closure gate"),
            _source(BT93Q_HANDOVER_PATH, "BT93Q handover"),
            _source(BT93N_CLOSURE_PATH, "BT93N.99 closure gate"),
        ],
        "bt93qState": {
            "closureResultClass": bt93q_closure.get("resultClass"),
            "handoverResultClass": bt93q_handover.get("resultClass"),
            "activeBlockers": bt93q_closure.get("activeBlockers"),
            "opensNext": bt93q_closure.get("opensNext"),
            "bt93oClaimAllowed": bt93q_closure.get("bt93oClaimAllowed"),
        },
        "guardrails": _guardrails(),
        "commands": commands,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--no-run-commands", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()

    report = build_report(run_commands=not args.no_run_commands)
    if args.write_report:
        _write_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "nextAllowedAction": report["nextAllowedAction"],
                "graphOk": report["graphOpenDeps"]["ok"],
                "bt94aNoStartFresh": report["bt94aNoStartFreshness"]["freshForRx"],
                "roadmapOk": report["roadmapSync"]["ok"],
                "terminalRawSanityOk": report["terminalRawSanity"]["ok"],
                "output": _rel(args.output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
