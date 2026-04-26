"""BT93E action-surface hardening report.

This report closes the BT93E.4 evidence loop from versioned BT93E train,
eval, holdout, and action-surface smoke artifacts. It keeps PPO training
sidecar-only and records start blockers without candidate, freeze, promotion,
or runtime changes.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93C_ROOT = PPO_ROOT / "bt93c"
BT93D_ROOT = PPO_ROOT / "bt93d"
BT93E_ROOT = PPO_ROOT / "bt93e"

DEFAULT_REPORT_PATH = BT93E_ROOT / "action_surface_hardening_report.json"
DEFAULT_START_MATRIX_PATH = BT93E_ROOT / "start_matrix.json"
DEFAULT_SMOKE_PATH = BT93E_ROOT / "action_surface_smoke_93e4.json"

CLAMP_RATE_BLOCK_THRESHOLD = 0.5
VETO_RATE_BLOCK_THRESHOLD = 0.25


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


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
        "path": _rel(path),
        "sha256": _sha256_file(path),
        "role": role,
        "closureCapable": closure_capable,
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


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _rate(count: int, total: int) -> float | None:
    if total <= 0:
        return None
    return round(count / total, 6)


def _counter(mapping: Any) -> dict[str, int]:
    if not isinstance(mapping, Mapping):
        return {}
    return {str(key): _as_int(value) for key, value in mapping.items()}


def _merge_counts(rows: Iterable[Mapping[str, Any] | None]) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in rows:
        if not isinstance(row, Mapping):
            continue
        for key, value in row.items():
            result[str(key)] = result.get(str(key), 0) + _as_int(value)
    return result


def _pointer_report(pointer_name: str) -> tuple[Path, Path, dict[str, Any]]:
    pointer_path = BT93E_ROOT / pointer_name
    pointer = _read_json(pointer_path)
    report_path = _repo_path(str(pointer["report"]))
    return pointer_path, report_path, _read_json(report_path)


def _telemetry_rows(report: Mapping[str, Any], lane: str) -> list[Mapping[str, Any]]:
    rows = _get(report, "learning", "telemetry") if lane == "train" else _get(report, "eval", "telemetry")
    return [row for row in rows if isinstance(row, Mapping)] if isinstance(rows, list) else []


def _compact_examples(rows: Iterable[Mapping[str, Any]], limit: int = 6) -> list[dict[str, Any]]:
    examples: list[dict[str, Any]] = []
    for row in rows:
        raw_examples = row.get("rawActionExamples")
        if not isinstance(raw_examples, list):
            continue
        for example in raw_examples:
            if not isinstance(example, Mapping):
                continue
            examples.append(
                {
                    "inventoryLength": example.get("inventoryLength"),
                    "invalidReasons": list(example.get("invalidReasons") or []),
                    "maskEvents": list(example.get("maskEvents") or []),
                    "vetoEvents": list(example.get("vetoEvents") or []),
                    "sanitizerEvents": list(example.get("sanitizerEvents") or []),
                }
            )
            if len(examples) >= limit:
                return examples
    return examples


def _aggregate_raw(rows: list[Mapping[str, Any]]) -> dict[str, Any]:
    aggregate = {
        "totalActions": sum(_as_int(row.get("totalActions")) for row in rows),
        "invalidActionCount": sum(_as_int(row.get("invalidActionCount")) for row in rows),
        "postDecodeClampCount": sum(_as_int(row.get("maskCount")) for row in rows),
        "safetyVetoCount": sum(_as_int(row.get("vetoCount")) for row in rows),
        "sanitizerCount": sum(_as_int(row.get("sanitizerCount")) for row in rows),
        "noopFallbackCount": sum(_as_int(row.get("noopCount")) for row in rows),
        "fieldCounts": _merge_counts(row.get("fieldCounts") for row in rows),
        "sanitizerReasons": _merge_counts(row.get("sanitizerReasons") for row in rows),
        "sampleCount": len(rows),
        "compactExamples": _compact_examples(rows),
    }
    total = aggregate["totalActions"]
    aggregate.update(
        {
            "invalidActionRate": _rate(aggregate["invalidActionCount"], total),
            "postDecodeClampRate": _rate(aggregate["postDecodeClampCount"], total),
            "safetyVetoRate": _rate(aggregate["safetyVetoCount"], total),
            "sanitizerRate": _rate(aggregate["sanitizerCount"], total),
            "noopFallbackRate": _rate(aggregate["noopFallbackCount"], total),
        }
    )
    return aggregate


def _action_measurements(report: Mapping[str, Any], lane: str) -> dict[str, Any]:
    rows = _telemetry_rows(report, lane)
    raw = _aggregate_raw(rows)
    return {
        "schemaNames": [
            "policyLevelMask",
            "postDecodeClamp",
            "sanitizer",
            "safetyVeto",
            "invalidAction",
            "noopFallback",
        ],
        "totalActions": raw["totalActions"],
        "sampleCount": raw["sampleCount"],
        "policyLevelMask": {
            "present": False,
            "count": None,
            "rate": None,
            "eventName": None,
            "status": "absent-in-current-sb3-multidiscrete-policy",
            "mixedWithPostDecodeClamp": False,
        },
        "postDecodeClamp": {
            "count": raw["postDecodeClampCount"],
            "rate": raw["postDecodeClampRate"],
            "eventName": "maskEvents",
            "source": "decode_multidiscrete_action inventory clamp after policy output",
            "fieldCounts": raw["fieldCounts"],
        },
        "sanitizer": {
            "count": raw["sanitizerCount"],
            "rate": raw["sanitizerRate"],
            "eventName": "sanitizerEvents",
            "reasons": raw["sanitizerReasons"],
        },
        "safetyVeto": {
            "count": raw["safetyVetoCount"],
            "rate": raw["safetyVetoRate"],
            "eventName": "vetoEvents",
            "fieldCounts": raw["fieldCounts"],
        },
        "invalidAction": {
            "count": raw["invalidActionCount"],
            "rate": raw["invalidActionRate"],
            "eventName": "invalidReasons",
        },
        "noopFallback": {
            "count": raw["noopFallbackCount"],
            "rate": raw["noopFallbackRate"],
            "eventName": "noopRate",
        },
        "compactExamples": raw["compactExamples"],
    }


def _lane_report(lane: str, role: str, report_path: Path, report: Mapping[str, Any]) -> dict[str, Any]:
    metrics = _action_measurements(report, lane)
    clamp_rate = _as_float(_get(metrics, "postDecodeClamp", "rate")) or 0.0
    veto_rate = _as_float(_get(metrics, "safetyVeto", "rate")) or 0.0
    sanitizer_rate = _as_float(_get(metrics, "sanitizer", "rate")) or 0.0
    invalid_rate = _as_float(_get(metrics, "invalidAction", "rate")) or 0.0
    high_load = (
        clamp_rate >= CLAMP_RATE_BLOCK_THRESHOLD
        or veto_rate >= VETO_RATE_BLOCK_THRESHOLD
        or sanitizer_rate > 0.0
        or invalid_rate > 0.0
    )
    policy_mask_missing = not bool(_get(metrics, "policyLevelMask", "present"))
    return {
        "lane": lane,
        "role": role,
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "phaseId": report.get("phaseId"),
        "report": _rel(report_path),
        "actionSurfaceTelemetry": metrics,
        "laneVerdict": {
            "bt94aStartImpact": "blocked" if policy_mask_missing and high_load else "not-blocking",
            "policyMaskMissing": policy_mask_missing,
            "highPostDecodeClampOrVetoLoad": high_load,
            "reasons": [
                reason
                for reason in [
                    "policy-level mask is absent" if policy_mask_missing else None,
                    "post-decode clamp rate is above threshold" if clamp_rate >= CLAMP_RATE_BLOCK_THRESHOLD else None,
                    "safety-veto rate is above threshold" if veto_rate >= VETO_RATE_BLOCK_THRESHOLD else None,
                    "sanitizer rate is non-zero" if sanitizer_rate > 0.0 else None,
                    "invalid-action rate is non-zero" if invalid_rate > 0.0 else None,
                ]
                if reason
            ],
        },
    }


def _policy_contract(smoke: Mapping[str, Any]) -> dict[str, Any]:
    surface = smoke.get("surface") if isinstance(smoke.get("surface"), Mapping) else {}
    checks = smoke.get("checks") if isinstance(smoke.get("checks"), Mapping) else {}
    fallback = smoke.get("fallbackProbes") if isinstance(smoke.get("fallbackProbes"), Mapping) else {}
    return {
        "surfaceId": surface.get("surfaceId"),
        "gymSpace": surface.get("gymSpace"),
        "sb3Trainable": surface.get("sb3Trainable"),
        "sameWrapperForTrainAndEval": checks.get("sameWrapperForTrainAndEval"),
        "indexEncoding": surface.get("indexEncoding"),
        "rawBoundarySurfaceTraining": surface.get("rawBoundarySurfaceTraining"),
        "policyLevelMasking": {
            "present": False,
            "rateSource": None,
            "status": "not-implemented-in-current-policy",
            "evidence": "Current SB3 policy emits MultiDiscrete heads; inventory legality is clamped after decode.",
        },
        "postDecodeClamp": {
            "present": True,
            "eventName": "maskEvents",
            "maskSource": _get(surface, "indexEncoding", "maskSource"),
            "mixedWithPolicyMask": False,
        },
        "fallbackSemantics": {
            "noopFallbackVisible": checks.get("forcedNoopFallbackTelemetryVisible"),
            "invalidWidthFallbackVisible": checks.get("forcedInvalidFallbackTelemetryVisible"),
            "noopProbe": fallback.get("noop"),
            "invalidWidthProbe": fallback.get("invalidWidthFallback"),
        },
        "boundarySanitizer": surface.get("boundarySanitizer"),
    }


def _source_artifacts(
    smoke_path: Path,
    train_pointer_path: Path,
    train_report_path: Path,
    eval_pointer_path: Path,
    eval_report_path: Path,
    holdout_pointer_path: Path,
    holdout_report_path: Path,
) -> dict[str, Any]:
    return {
        "bt93eActionSurfaceSmoke": _source(smoke_path, "BT93E.4 action-surface smoke refresh"),
        "bt93cActionSurfaceSmoke": _source(BT93C_ROOT / "action_surface_smoke.json", "BT93C action-surface predecessor"),
        "bt93dTerminalPolicyDiagnostics": _source(
            BT93D_ROOT / "terminal_policy_diagnostics.json",
            "BT93D terminal/policy predecessor",
        ),
        "bt93eFindingRegister": _source(BT93E_ROOT / "finding_register.json", "BT93E finding register"),
        "bt93eStartMatrixBefore93E4": _source(DEFAULT_START_MATRIX_PATH, "BT93E start matrix before action update"),
        "diagnosticTrainReport": _source(train_report_path, "BT93E diagnostic repair train"),
        "diagnosticTrainPointer": _source(train_pointer_path, "BT93E diagnostic train pointer", closure_capable=False),
        "baselineReproEvalReport": _source(eval_report_path, "BT93E same-matrix eval"),
        "baselineReproEvalPointer": _source(eval_pointer_path, "BT93E eval pointer", closure_capable=False),
        "holdoutEvalReport": _source(holdout_report_path, "BT93E holdout eval"),
        "holdoutEvalPointer": _source(holdout_pointer_path, "BT93E holdout pointer", closure_capable=False),
    }


def _build_start_matrix_update(report: Mapping[str, Any], report_path: Path | None = None) -> dict[str, Any]:
    lanes = report["lanes"]
    update: dict[str, Any] = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_action_surface_hardening_report.py",
        "phaseId": "93E.4.4",
        "classification": "bt93e-action-surface-start-diagnostics-only",
        "countsAsPpoValidateEvidence": False,
        "countsAsPromotionEvidence": False,
        "countsAsRolloutEvidence": False,
        "thresholds": report["gateRules"],
        "policyMaskClampContract": report["policyMaskClampContract"],
        "laneMatrix": {
            lane_id: {
                "bt94aStartImpact": lane["laneVerdict"]["bt94aStartImpact"],
                "policyLevelMask": lane["actionSurfaceTelemetry"]["policyLevelMask"],
                "postDecodeClamp": lane["actionSurfaceTelemetry"]["postDecodeClamp"],
                "sanitizer": lane["actionSurfaceTelemetry"]["sanitizer"],
                "safetyVeto": lane["actionSurfaceTelemetry"]["safetyVeto"],
                "invalidAction": lane["actionSurfaceTelemetry"]["invalidAction"],
                "noopFallback": lane["actionSurfaceTelemetry"]["noopFallback"],
            }
            for lane_id, lane in lanes.items()
        },
        "findingDisposition": report["findingDisposition"],
        "bt94aImpact": report["bt94aImpact"],
    }
    if report_path is not None:
        update["sourceReport"] = _source(report_path, "BT93E action-surface hardening report")
    return update


def build_report(smoke_path: Path = DEFAULT_SMOKE_PATH) -> dict[str, Any]:
    smoke = _read_json(smoke_path)
    terminal = _read_json(BT93E_ROOT / "terminal_reward_failure_report.json")
    finding_register = _read_json(BT93E_ROOT / "finding_register.json")
    start_matrix = _read_json(DEFAULT_START_MATRIX_PATH)

    train_pointer_path, train_report_path, train_report = _pointer_report("latest_diagnostics_smoke.json")
    eval_pointer_path, eval_report_path, eval_report = _pointer_report("latest_baseline_repro_eval.json")
    holdout_pointer_path, holdout_report_path, holdout_report = _pointer_report("latest_holdout_eval.json")

    lanes = {
        "train": _lane_report("train", "BT93E diagnostic repair train", train_report_path, train_report),
        "eval": _lane_report("eval", "BT93E same-matrix baseline repro eval", eval_report_path, eval_report),
        "holdout": _lane_report("holdout", "BT93E holdout eval", holdout_report_path, holdout_report),
    }
    policy_contract = _policy_contract(smoke)
    smoke_checks = smoke.get("checks") if isinstance(smoke.get("checks"), Mapping) else {}
    f03_closed = (
        smoke.get("ok") is True
        and _get(policy_contract, "sb3Trainable") is True
        and _get(policy_contract, "sameWrapperForTrainAndEval") is True
        and _get(policy_contract, "indexEncoding", "maskSource") is not None
        and _get(policy_contract, "fallbackSemantics", "noopFallbackVisible") is True
        and _get(policy_contract, "fallbackSemantics", "invalidWidthFallbackVisible") is True
    )
    f20_closed = all(lane["actionSurfaceTelemetry"]["totalActions"] > 0 for lane in lanes.values())
    f30_blocking = (
        not bool(_get(policy_contract, "policyLevelMasking", "present"))
        and any(lane["laneVerdict"]["highPostDecodeClampOrVetoLoad"] for lane in lanes.values())
    )
    finding_disposition = {
        "F.03": "closed" if f03_closed else "still-blocking",
        "F.20": "closed" if f20_closed else "still-blocking",
        "F.30": "still-blocking" if f30_blocking else "closed",
    }
    blocked_findings = [finding for finding, status in finding_disposition.items() if status == "still-blocking"]

    report: dict[str, Any] = {
        "ok": True,
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93e_action_surface_hardening_report.py",
        "blockId": "BT93E",
        "phaseId": "93E.4",
        "gitSha": _git_sha(),
        "resultClass": "diagnose-blocked" if blocked_findings else "action-surface-hardened",
        "phaseCoverage": {
            "93E.4.1": True,
            "93E.4.2": True,
            "93E.4.3": True,
            "93E.4.4": True,
        },
        "lanes": lanes,
        "policyMaskClampContract": policy_contract,
        "actionSurfaceSmokeRefresh": {
            "path": _rel(smoke_path),
            "blockId": smoke.get("blockId"),
            "phaseId": smoke.get("phaseId"),
            "checks": smoke_checks,
            "surface": smoke.get("surface"),
        },
        "gateRules": {
            "policyMaskAndPostDecodeClampMustNotBeMixed": True,
            "postDecodeClampRateBlocksAtOrAbove": CLAMP_RATE_BLOCK_THRESHOLD,
            "safetyVetoRateBlocksAtOrAbove": VETO_RATE_BLOCK_THRESHOLD,
            "sanitizerRateAboveZeroBlocks": True,
            "invalidActionRateAboveZeroBlocks": True,
            "highLoadWithoutPolicyMaskBlocksBt94a": True,
        },
        "findingDisposition": finding_disposition,
        "bt94aImpact": {
            "claimableAfter93E4": False if blocked_findings else None,
            "blockedFindings": blocked_findings,
            "findingStatus": finding_disposition,
            "decision": "BT94A remains closed; 93E.4 separates policy-mask absence from post-decode clamp/veto load"
            if blocked_findings
            else "93E.5 may refresh handover and gate artifacts",
        },
        "evidenceLimits": {
            "countsAsPpoValidateEvidence": False,
            "countsAsPromotionEvidence": False,
            "countsAsRolloutEvidence": False,
            "candidateRun": False,
            "freezeCandidate": False,
        },
        "commands": {
            "smoke": (
                "tmp\\bt93c-clean-env-20260424T155919Z\\Scripts\\python.exe "
                "python\\scripts\\bt93c_action_surface_smoke.py "
                "--output data\\training\\ppo\\bt93e\\action_surface_smoke_93e4.json "
                "--block-id BT93E --phase-id 93E.4.3 --include-fallback-probes"
            ),
            "report": (
                "python\\.venv\\Scripts\\python.exe "
                "python\\scripts\\bt93e_action_surface_hardening_report.py --write-report --update-start-matrix"
            ),
        },
        "sourceArtifacts": _source_artifacts(
            smoke_path,
            train_pointer_path,
            train_report_path,
            eval_pointer_path,
            eval_report_path,
            holdout_pointer_path,
            holdout_report_path,
        ),
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "terminalRewardFailureResultBefore93E4": terminal.get("resultClass"),
            "findingRegisterSummaryBefore93E4": finding_register.get("summary"),
            "startMatrixResultBefore93E4": start_matrix.get("resultClass"),
        },
    }
    report["startMatrixUpdate"] = _build_start_matrix_update(report)
    return report


def update_start_matrix(start_matrix_path: Path, report: Mapping[str, Any], report_path: Path) -> dict[str, Any]:
    start_matrix = _read_json(start_matrix_path) if start_matrix_path.exists() else {}
    updated = deepcopy(start_matrix)
    updated["actionSurfaceHardeningMatrix"] = _build_start_matrix_update(report, report_path)
    _write_json(start_matrix_path, updated)
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93E.4 action-surface hardening diagnostics.")
    parser.add_argument("--write-report", action="store_true", help="Write report JSON file.")
    parser.add_argument("--update-start-matrix", action="store_true", help="Record action matrix in BT93E start_matrix.json.")
    parser.add_argument("--output", default=str(DEFAULT_REPORT_PATH), help="Report output path.")
    parser.add_argument("--start-matrix", default=str(DEFAULT_START_MATRIX_PATH), help="BT93E start matrix path.")
    parser.add_argument("--smoke", default=str(DEFAULT_SMOKE_PATH), help="BT93E action-surface smoke path.")
    args = parser.parse_args()

    report_path = Path(args.output).resolve()
    start_matrix_path = Path(args.start_matrix).resolve()
    report = build_report(Path(args.smoke).resolve())
    if args.write_report:
        _write_json(report_path, report)
    if args.update_start_matrix:
        update_start_matrix(start_matrix_path, report, report_path)
    print(
        json.dumps(
            {
                "ok": report["ok"],
                "resultClass": report["resultClass"],
                "phaseCoverage": report["phaseCoverage"],
                "findingDisposition": report["findingDisposition"],
                "blockedFindings": report["bt94aImpact"]["blockedFindings"],
                "wrote": {
                    "report": _rel(report_path) if args.write_report else None,
                    "startMatrix": _rel(start_matrix_path) if args.update_start_matrix else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
