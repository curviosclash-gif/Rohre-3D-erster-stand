"""Machine-readable freeze/drift check for the BT90-BT92 authority snapshot."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.authority_snapshot import (  # noqa: E402
    FREEZE_CHECK_ARTIFACT_PATH,
    FREEZE_DATE,
    FREEZE_FILE_GROUPS,
    SNAPSHOT_COMMIT,
    SNAPSHOT_PATH,
)


def _run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        stdout = result.stdout.strip()
        detail = stderr or stdout or f"exit code {result.returncode}"
        raise RuntimeError(f"git {' '.join(args)} failed: {detail}")
    return result.stdout.strip()


def _resolve_artifact_path(artifact: str) -> Path:
    candidate = Path(artifact)
    if candidate.is_absolute():
        return candidate
    return REPO_ROOT / candidate


def _load_status_map(paths: list[str]) -> dict[str, str]:
    if not paths:
        return {}
    output = _run_git(["status", "--porcelain=v1", "--untracked-files=all", "--", *paths])
    status_map = {path: "clean" for path in paths}
    for line in output.splitlines():
        if not line:
            continue
        status_code = line[:2]
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        status_map[path] = status_code
    return status_map


def _build_file_entry(path: str, group: str, status_map: dict[str, str]) -> dict[str, object]:
    snapshot_blob = _run_git(["rev-parse", f"{SNAPSHOT_COMMIT}:{path}"])
    head_blob = _run_git(["rev-parse", f"HEAD:{path}"])
    worktree_path = REPO_ROOT / path
    exists_in_worktree = worktree_path.exists()
    current_blob = _run_git(["hash-object", "--", path]) if exists_in_worktree else None
    matches_snapshot = current_blob == snapshot_blob
    return {
        "group": group,
        "path": path,
        "existsInWorktree": exists_in_worktree,
        "worktreeStatus": status_map.get(path, "clean"),
        "snapshotBlob": snapshot_blob,
        "headBlob": head_blob,
        "currentBlob": current_blob,
        "headMatchesSnapshot": head_blob == snapshot_blob,
        "matchesSnapshot": matches_snapshot,
        "drift": not matches_snapshot,
    }


def run_freeze_check(artifact_path: Path) -> tuple[int, dict[str, object]]:
    grouped_paths = {
        group: list(paths)
        for group, paths in FREEZE_FILE_GROUPS
    }
    ordered_paths = [path for _, paths in FREEZE_FILE_GROUPS for path in paths]
    status_map = _load_status_map(ordered_paths)
    head_commit = _run_git(["rev-parse", "HEAD"])

    grouped_entries: dict[str, list[dict[str, object]]] = {}
    drift_paths: list[str] = []
    for group, paths in grouped_paths.items():
        entries = [_build_file_entry(path, group, status_map) for path in paths]
        grouped_entries[group] = entries
        drift_paths.extend(
            entry["path"]
            for entry in entries
            if entry["drift"]
        )

    freeze_ok = not drift_paths
    artifact = {
        "ok": freeze_ok,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "generatedBy": "python/scripts/bt90_freeze_check.py",
        "snapshot": {
            "freezeDate": FREEZE_DATE,
            "snapshotCommit": SNAPSHOT_COMMIT,
            "snapshotPath": SNAPSHOT_PATH,
            "headCommit": head_commit,
        },
        "summary": {
            "checkedFiles": len(ordered_paths),
            "authorityFiles": len(grouped_entries.get("authority", ())),
            "adjacentFiles": len(grouped_entries.get("adjacent", ())),
            "driftCount": len(drift_paths),
            "reAuditRequired": not freeze_ok,
        },
        "authorityFiles": grouped_entries.get("authority", []),
        "adjacentFiles": grouped_entries.get("adjacent", []),
        "driftPaths": drift_paths,
        "result": {
            "freezeOk": freeze_ok,
            "reAuditRequired": not freeze_ok,
            "reason": (
                "All authority and adjacent files still match the BT90 snapshot commit."
                if freeze_ok
                else (
                    f"{len(drift_paths)} file(s) drifted from the BT90 snapshot commit; "
                    "re-audit is required before the next BT90-BT92 claim."
                )
            ),
        },
    }

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(f"{json.dumps(artifact, indent=2)}\n", encoding="utf-8")
    exit_code = 0 if freeze_ok else 1
    return exit_code, artifact


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--artifact",
        default=FREEZE_CHECK_ARTIFACT_PATH,
        help="Artifact path relative to the repo root unless absolute.",
    )
    args = parser.parse_args()

    artifact_path = _resolve_artifact_path(args.artifact)
    try:
        exit_code, artifact = run_freeze_check(artifact_path)
    except Exception as exc:  # pragma: no cover - terminal-facing failure path
        print(json.dumps({
            "ok": False,
            "error": str(exc),
        }, indent=2))
        raise SystemExit(2) from exc

    print(json.dumps({
        "ok": artifact["ok"],
        "artifact": str(artifact_path.relative_to(REPO_ROOT)),
        "driftCount": artifact["summary"]["driftCount"],
        "driftPaths": artifact["driftPaths"],
    }, indent=2))
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
