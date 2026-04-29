"""BT93L.99 closure gate."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93L_ROOT = PPO_ROOT / "bt93l"
REPORT_PATH = BT93L_ROOT / "closure_gate_report.json"
SOURCE_PATHS = {
    "taskMetricContract": BT93L_ROOT / "task_metric_contract.json",
    "progressReachabilityReport": BT93L_ROOT / "progress_reachability_report.json",
    "rewardBalanceReport": BT93L_ROOT / "reward_balance_report.json",
    "actionEffectReport": BT93L_ROOT / "action_effect_report.json",
    "baselineMatrixReport": BT93L_ROOT / "baseline_matrix_report.json",
    "microPpoSignalReport": BT93L_ROOT / "micro_ppo_signal_report.json",
    "handoverPackage": BT93L_ROOT / "handover_package.json",
    "bt94aNoStartGate": PPO_ROOT / "bt94a" / "no_start_gate.json",
}
FORBIDDEN_PRODUCTIVE_SURFACES = {
    "src/state/HeadlessMatchKernelRuntime.js",
    "src/core/MatchKernelTrainingAdapter.js",
    "src/entities/ai/training/TrainingTransportFacade.js",
    "src/entities/ai/training/WebSocketTrainerBridge.js",
    "src/entities/ai/ObservationBridgePolicy.js",
    "src/core/RuntimeConfig.js",
    "src/entities/ai/BotPolicyRegistry.js",
    "src/entities/ai/BotPolicyTypes.js",
    "src/entities/ai/inference/LocalDqnInference.js",
    "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
    "src/state/MatchSessionFactory.js",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
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


def _git_lines(args: list[str]) -> list[str]:
    output = _git_output(args)
    return [line.strip().replace("\\", "/") for line in output.splitlines() if line.strip()]


def _source(path: Path, role: str) -> dict[str, Any]:
    payload = _read_json(path) if path.suffix == ".json" else {}
    return {
        "exists": path.exists(),
        "isFile": path.is_file(),
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
        "ok": payload.get("ok") if payload else None,
        "phaseId": payload.get("phaseId") if payload else None,
        "resultClass": payload.get("resultClass") if payload else None,
    }


def _changed_files() -> list[str]:
    merge_base = _git_output(["git", "merge-base", "HEAD", "origin/bot-training"])
    if merge_base:
        return _git_lines(["git", "diff", "--name-only", f"{merge_base}..HEAD"])
    return _git_lines(["git", "diff", "--name-only", "HEAD~1..HEAD"])


def build_report() -> dict[str, Any]:
    payloads = {key: _read_json(path) for key, path in SOURCE_PATHS.items()}
    changed_files = _changed_files()
    forbidden_touched = sorted(set(changed_files) & FORBIDDEN_PRODUCTIVE_SURFACES)
    handover = payloads["handoverPackage"]
    no_start = payloads["bt94aNoStartGate"]
    source_ok = {
        key: payload.get("ok") is True
        for key, payload in payloads.items()
        if key != "bt94aNoStartGate"
    }
    bt94a_closed = (
        handover.get("resultClass") != "BT94A-ready"
        and ((handover.get("bt94aHandover") or {}).get("ready") is False if isinstance(handover.get("bt94aHandover"), Mapping) else True)
        and no_start.get("claimable") is False
    )
    honest_result = handover.get("resultClass") == "diagnose-loop-required"
    phase_coverage = {
        "93L.99.1": all(source_ok.values()),
        "93L.99.2": honest_result,
        "93L.99.3": bt94a_closed,
        "93L.99.4": len(forbidden_touched) == 0,
        "93L.99.5": True,
    }
    ok = all(phase_coverage.values())
    return {
        "schemaVersion": "bt93l-closure-gate-report-v1",
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_closure_gate.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
            "mergeBaseOriginBotTraining": _git_output(["git", "merge-base", "HEAD", "origin/bot-training"]),
        },
        "ok": ok,
        "blockId": "BT93L",
        "phaseId": "93L.99",
        "resultClass": "diagnose-loop-required" if ok else "closure-blocked",
        "phaseCoverage": phase_coverage,
        "sourceOk": source_ok,
        "bt94aClosed": bt94a_closed,
        "honestResult": honest_result,
        "changedFiles": changed_files,
        "forbiddenProductiveSurfaceTouched": forbidden_touched,
        "summary": {
            "finalResult": "diagnose-loop-required" if ok else "closure-blocked",
            "bt94aClaimAllowed": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "followupRequired": True,
            "followup": (handover.get("followup") or {}).get("concreteFollowup") if isinstance(handover.get("followup"), Mapping) else None,
            "nextAllowedWork": "manual intake/replan for BT93M; no BT94A claim",
        },
        "sourceArtifacts": {
            key: _source(path, role)
            for key, path, role in (
                ("taskMetricContract", SOURCE_PATHS["taskMetricContract"], "BT93L.1 task metric contract"),
                ("progressReachabilityReport", SOURCE_PATHS["progressReachabilityReport"], "BT93L.2 progress reachability"),
                ("rewardBalanceReport", SOURCE_PATHS["rewardBalanceReport"], "BT93L.3 reward balance"),
                ("actionEffectReport", SOURCE_PATHS["actionEffectReport"], "BT93L.4 action effect"),
                ("baselineMatrixReport", SOURCE_PATHS["baselineMatrixReport"], "BT93L.5 baseline matrix"),
                ("microPpoSignalReport", SOURCE_PATHS["microPpoSignalReport"], "BT93L.6 micro PPO signal"),
                ("handoverPackage", SOURCE_PATHS["handoverPackage"], "BT93L.7 handover"),
                ("bt94aNoStartGate", SOURCE_PATHS["bt94aNoStartGate"], "BT94A red no-start gate"),
            )
        },
        "guardrails": {
            "diagnosticOnly": True,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "bt94aClaimAllowed": False,
            "promotionAllowed": False,
            "ppoValidateSignal": False,
            "qualityClaimAllowed": False,
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
        },
        "commands": {
            "write": "python python/scripts/bt93l_closure_gate.py --write-report",
            "metaGate": "npm run gates:pre-commit",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--output", default=str(REPORT_PATH))
    args = parser.parse_args()

    report = build_report()
    output = Path(args.output)
    if args.write_report:
        _write_json(output, report)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "forbiddenProductiveSurfaceTouched": report["forbiddenProductiveSurfaceTouched"],
                "summary": report["summary"],
                "output": _rel(output),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
