#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def run_git(repo_root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "git command failed")
    return result.stdout.strip()


def parse_status_branch(status_output: str) -> tuple[dict[str, object], list[dict[str, str]]]:
    lines = status_output.splitlines()
    branch_line = lines[0] if lines else ""
    dirty_entries: list[dict[str, str]] = []
    for line in lines[1:]:
        if not line.strip():
            continue
        dirty_entries.append({"status": line[:2], "path": line[3:] if len(line) > 3 else line})

    actual_branch = ""
    upstream = None
    ahead = 0
    behind = 0
    diverged = False

    if branch_line.startswith("## "):
        branch_meta = branch_line[3:]
        branch_name, _, upstream_meta = branch_meta.partition("...")
        actual_branch = branch_name.strip()
        if upstream_meta:
            upstream_name, _, bracket_meta = upstream_meta.partition(" [")
            upstream = upstream_name.strip() or None
            if bracket_meta:
                bracket_meta = bracket_meta.rstrip("]")
                for item in bracket_meta.split(","):
                    token = item.strip()
                    if token.startswith("ahead "):
                        ahead = int(token.split(" ", 1)[1])
                    elif token.startswith("behind "):
                        behind = int(token.split(" ", 1)[1])
                diverged = ahead > 0 and behind > 0

    return (
        {
            "actual": actual_branch,
            "upstream": upstream,
            "ahead": ahead,
            "behind": behind,
            "diverged": diverged,
            "dirty": bool(dirty_entries),
        },
        dirty_entries,
    )


def load_plan_lines(plan_path: Path) -> list[str]:
    return plan_path.read_text(encoding="utf-8").splitlines()


def parse_lock_rows(plan_lines: list[str], block_pattern: re.Pattern[str] | None) -> list[dict[str, str]]:
    lock_start = None
    for index, line in enumerate(plan_lines):
        if line.strip() == "## Lock-Status":
            lock_start = index
            break
    if lock_start is None:
        raise RuntimeError("Lock-Status section not found")

    header_index = None
    for index in range(lock_start + 1, len(plan_lines)):
        if plan_lines[index].startswith("| Agent "):
            header_index = index
            break
    if header_index is None:
        raise RuntimeError("Lock-Status table header not found")

    rows: list[dict[str, str]] = []
    for line in plan_lines[header_index + 2 :]:
        if not line.startswith("|"):
            break
        columns = [column.strip() for column in line.strip().strip("|").split("|")]
        if len(columns) < 5:
            continue
        row = {
            "agent": columns[0],
            "block": columns[1],
            "startDate": columns[2],
            "status": columns[3].lower(),
            "target": columns[4],
        }
        if block_pattern and not block_pattern.search(row["block"]):
            continue
        rows.append(row)
    return rows


def find_next_open_item(plan_lines: list[str], block_id: str) -> dict[str, str] | None:
    block_heading = re.compile(rf"^## Block {re.escape(block_id)}:")
    block_phase_prefix = block_id.removeprefix("BT") + "."
    item_pattern = re.compile(r"^- \[ \] (?P<id>[A-Za-z0-9.]+)\s+(?P<title>.+)$")

    in_block = False
    current_heading = ""
    for line in plan_lines:
        if block_heading.match(line):
            in_block = True
            continue
        if in_block and line.startswith("## Block "):
            break
        if not in_block:
            continue
        if line.startswith("### "):
            current_heading = line[4:].strip()
            continue
        match = item_pattern.match(line)
        if match and match.group("id").startswith(block_phase_prefix):
            return {
                "id": match.group("id"),
                "title": match.group("title").strip(),
                "heading": current_heading,
            }
    return None


def build_report(args: argparse.Namespace) -> dict[str, object]:
    repo_root = Path(__file__).resolve().parents[2]
    plan_path = (repo_root / args.plan).resolve()
    block_pattern = re.compile(args.block_regex) if args.block_regex else None

    status_output = run_git(repo_root, "status", "--porcelain=v1", "--branch")
    branch_info, dirty_entries = parse_status_branch(status_output)
    plan_lines = load_plan_lines(plan_path)
    lock_rows = parse_lock_rows(plan_lines, block_pattern)
    active_rows = [row for row in lock_rows if row["status"] == "active"]

    failures: list[str] = []
    warnings: list[str] = []

    if args.branch and branch_info["actual"] != args.branch:
        failures.append(
            f"Expected branch '{args.branch}', found '{branch_info['actual'] or 'unknown'}'."
        )
    if branch_info["dirty"]:
        failures.append("Worktree is dirty.")
    if branch_info["behind"]:
        failures.append(f"Local branch is behind upstream by {branch_info['behind']} commit(s).")
    if branch_info["diverged"]:
        failures.append("Local branch has diverged from upstream.")
    elif branch_info["ahead"]:
        warnings.append(f"Local branch is ahead of upstream by {branch_info['ahead']} commit(s).")
    if not active_rows:
        warnings.append("No active matching block found; next run would need to claim a block.")
    if len(active_rows) > 1:
        failures.append(
            "More than one active matching block found: "
            + ", ".join(row["block"] for row in active_rows)
        )

    target_block = None
    next_open = None
    mode = "claim"
    if len(active_rows) == 1:
        active_row = active_rows[0]
        target_block = active_row["block"]
        mode = "continue"
        if args.owner and active_row["agent"] != args.owner:
            failures.append(
                f"Active block '{target_block}' is owned by '{active_row['agent']}', not '{args.owner}'."
            )
        next_open = find_next_open_item(plan_lines, target_block)
        if not next_open:
            failures.append(f"Active block '{target_block}' has no open phase item.")

    return {
        "ok": not failures,
        "mode": mode,
        "repoRoot": str(repo_root),
        "branch": {
            "expected": args.branch,
            **branch_info,
        },
        "git": {
            "dirtyFiles": dirty_entries,
        },
        "plan": {
            "path": str(plan_path),
            "blockRegex": args.block_regex,
            "matchingLockRows": lock_rows,
            "activeMatchingLocks": active_rows,
            "targetBlock": target_block,
            "nextOpenPhase": next_open,
        },
        "failures": failures,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Preflight guardrails for unattended bot-training automation loops."
    )
    parser.add_argument("--plan", default="docs/bot-training/Bot_Trainingsplan.md")
    parser.add_argument("--branch", default=None)
    parser.add_argument("--owner", default=None)
    parser.add_argument("--block-regex", default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    try:
        report = build_report(args)
    except Exception as exc:  # pragma: no cover
        error_report = {
            "ok": False,
            "mode": "error",
            "failures": [str(exc)],
            "warnings": [],
        }
        if args.json:
            print(json.dumps(error_report, indent=2))
        else:
            print("BLOCKED")
            print(str(exc))
        return 1

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("READY" if report["ok"] else "BLOCKED")
        if report["plan"]["targetBlock"]:
            print(f"targetBlock={report['plan']['targetBlock']}")
        next_open = report["plan"]["nextOpenPhase"]
        if next_open:
            print(f"nextOpenPhase={next_open['id']} | {next_open['title']}")
        for warning in report["warnings"]:
            print(f"warning={warning}")
        for failure in report["failures"]:
            print(f"failure={failure}")

    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
