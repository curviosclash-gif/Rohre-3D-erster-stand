"""BT93L.3 reward-balance and anti-plateau report.

The report is diagnostic-only. It uses the BT93L reward profile and the
BT93L.2 reachability report to prove that survival-only, noop, player-dead,
and max-step-only cases cannot be interpreted as quality success.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
BT93L_ROOT = REPO_ROOT / "data" / "training" / "ppo" / "bt93l"
TRUTH_TABLE_PATH = BT93L_ROOT / "reward_signal_truth_table.json"
BALANCE_REPORT_PATH = BT93L_ROOT / "reward_balance_report.json"
TASK_CONTRACT_PATH = BT93L_ROOT / "task_metric_contract.json"
PROGRESS_REPORT_PATH = BT93L_ROOT / "progress_reachability_report.json"
HEADLESS_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
PROFILE_ID = "bt93l-objective-reachability-v1"

DEFAULT_WEIGHTS = {
    "baseStep": 0.0,
    "survival": 0.12,
    "survivalPressureBonus": 0.06,
    "kill": 1.0,
    "crash": -6.0,
    "stuck": -0.35,
    "itemPickup": 0.08,
    "itemUse": 0.03,
    "damageDealt": 0.015,
    "damageTaken": -0.12,
    "wallRisk": -0.08,
    "trailRisk": -0.12,
    "opponentRisk": -0.08,
    "lowHealthThreat": -0.2,
    "win": 1.5,
    "loss": -1.5,
    "checkpointReached": 0.5,
    "parcoursCompleted": 2.0,
    "wrongOrder": -0.3,
}

BT93L_WEIGHTS = {
    **DEFAULT_WEIGHTS,
    "baseStep": -0.016,
    "survival": 0.012,
    "survivalPressureBonus": 0.01,
    "checkpointReached": 0.85,
    "parcoursCompleted": 2.0,
    "loss": -4.5,
    "win": 2.5,
}

REQUIRED_EVENTS = [
    "death",
    "hazard",
    "survival-time",
    "progress",
    "objective",
    "noop",
    "max-step",
]


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


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return fallback
    return result if result == result else fallback


def _round(value: float) -> float:
    return round(float(value), 6)


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


def _file_contains(path: Path, *tokens: str) -> bool:
    if not path.is_file():
        return False
    text = path.read_text(encoding="utf-8")
    return all(token in text for token in tokens)


def _count(value: Any) -> int:
    return max(0, int(_number(value, 0.0)))


def _clamp01(value: Any, fallback: float = 0.0) -> float:
    return max(0.0, min(1.0, _number(value, fallback)))


def _calculate_reward(signals: Mapping[str, Any], weights: Mapping[str, float] = BT93L_WEIGHTS) -> dict[str, Any]:
    survived = signals.get("survival") is not False
    health_ratio = _clamp01(signals.get("healthRatio"), 1.0)
    pressure_level = _clamp01(signals.get("pressureLevel"), 0.0)
    risk_proximity = signals.get("riskProximity") if isinstance(signals.get("riskProximity"), Mapping) else {}
    wall_risk = _clamp01(signals.get("wallRisk", risk_proximity.get("wall")), 0.0)
    trail_risk = _clamp01(signals.get("trailRisk", risk_proximity.get("trail")), 0.0)
    opponent_risk = _clamp01(signals.get("opponentRisk", risk_proximity.get("opponent")), 0.0)
    projectile_threat = _clamp01(signals.get("projectileThreat"), 0.0)
    risk_pressure = max(pressure_level, wall_risk, trail_risk, opponent_risk, projectile_threat)
    survival_pressure_scale = risk_pressure * (0.55 + (1.0 - health_ratio) * 0.45) if survived else 0.0
    low_health_threat_scale = risk_pressure * ((0.5 - health_ratio) / 0.5) if health_ratio < 0.5 else 0.0
    parcours_enabled = signals.get("parcoursEnabled") is True
    components = {
        "baseStep": weights["baseStep"],
        "survival": weights["survival"] if survived else 0.0,
        "survivalPressureBonus": survival_pressure_scale * weights["survivalPressureBonus"],
        "kill": _count(signals.get("kills", signals.get("killCount"))) * weights["kill"],
        "crash": _count(signals.get("crashed", signals.get("crashCount"))) * weights["crash"],
        "stuck": _count(signals.get("stuck", signals.get("stuckCount"))) * weights["stuck"],
        "itemPickup": _count(signals.get("itemsCollected", signals.get("itemPickups"))) * weights["itemPickup"],
        "itemUse": _count(signals.get("itemUses")) * weights["itemUse"],
        "damageDealt": max(0.0, _number(signals.get("damageDealt"))) * weights["damageDealt"],
        "damageTaken": max(0.0, _number(signals.get("damageTaken"))) * weights["damageTaken"],
        "wallRisk": wall_risk * weights["wallRisk"],
        "trailRisk": trail_risk * weights["trailRisk"],
        "opponentRisk": opponent_risk * weights["opponentRisk"],
        "lowHealthThreat": low_health_threat_scale * weights["lowHealthThreat"],
        "win": weights["win"] if signals.get("won") is True else 0.0,
        "loss": weights["loss"] if signals.get("lost") is True else 0.0,
        "checkpointReached": (_count(signals.get("checkpointReached", signals.get("parcoursCheckpoints"))) * weights["checkpointReached"])
        if parcours_enabled
        else 0.0,
        "parcoursCompleted": weights["parcoursCompleted"] if parcours_enabled and signals.get("parcoursCompleted") is True else 0.0,
        "wrongOrder": (_count(signals.get("wrongOrder", signals.get("wrongCheckpointOrder"))) * weights["wrongOrder"])
        if parcours_enabled
        else 0.0,
        "external": _number(signals.get("bonusReward")),
    }
    rounded = {key: _round(value) for key, value in components.items()}
    return {
        "total": _round(sum(rounded.values())),
        "components": rounded,
    }


def _scenario(event_id: str, label: str, signals: Mapping[str, Any], expected_sign: str, success_eligible: bool, reason: str) -> dict[str, Any]:
    reward = _calculate_reward(signals)
    return {
        "eventId": event_id,
        "label": label,
        "signals": dict(signals),
        "reward": reward,
        "expectedSign": expected_sign,
        "successEligible": success_eligible,
        "qualityMeaning": reason,
    }


def _build_truth_rows() -> list[dict[str, Any]]:
    return [
        _scenario(
            "death",
            "player-dead terminal",
            {"survival": False, "lost": True},
            "negative",
            False,
            "failure terminal; never objective or candidate success",
        ),
        _scenario(
            "hazard",
            "hazard pressure without progress",
            {
                "survival": True,
                "healthRatio": 0.35,
                "pressureLevel": 0.8,
                "riskProximity": {"wall": 0.7, "trail": 0.5, "opponent": 0.4},
            },
            "negative",
            False,
            "risk exposure must not become reward hacking",
        ),
        _scenario(
            "survival-time",
            "survival-only step",
            {"survival": True, "healthRatio": 1.0, "pressureLevel": 0.0},
            "non-positive",
            False,
            "time alive is diagnostic until progress/objective signals are present",
        ),
        _scenario(
            "progress",
            "real checkpoint progress",
            {"survival": True, "parcoursEnabled": True, "checkpointReached": 1},
            "positive",
            True,
            "intermediate objective evidence only when emitted by real env.step path",
        ),
        _scenario(
            "objective",
            "objective-complete terminal",
            {"survival": True, "parcoursEnabled": True, "checkpointReached": 1, "parcoursCompleted": True, "won": True},
            "positive",
            True,
            "task-specific success; still diagnostic in BT93L, not candidate/freeze evidence",
        ),
        _scenario(
            "noop",
            "noop plateau step",
            {"survival": True, "healthRatio": 1.0},
            "non-positive",
            False,
            "no action/effect cannot be scored as success",
        ),
        _scenario(
            "max-step",
            "max-step-only episode",
            {"survival": True, "healthRatio": 1.0},
            "non-positive",
            False,
            "truncation cap is neutral/red without progress or objective completion",
        ),
    ]


def _reward_total(summary: Mapping[str, Any]) -> float:
    totals = summary.get("rewardBreakdownTotals") if isinstance(summary.get("rewardBreakdownTotals"), Mapping) else {}
    return _round(sum(_number(value) for value in totals.values()))


def _control_distribution(label: str, summary: Mapping[str, Any]) -> dict[str, Any]:
    total = _reward_total(summary)
    progress_reward = _number(summary.get("progressReward"))
    objective_reward = _number(summary.get("objectiveReward"))
    return {
        "label": label,
        "source": "progress_reachability_report.json",
        "observedSteps": int(_number(summary.get("observedSteps"))),
        "totalReward": total,
        "progressReward": _round(progress_reward),
        "objectiveReward": _round(objective_reward),
        "progressSignalReachableCount": int(_number(summary.get("progressSignalReachableCount"))),
        "objectiveSignalReachableCount": int(_number(summary.get("objectiveSignalReachableCount"))),
        "successEligible": bool(progress_reward > 0 and objective_reward > 0),
    }


def _truth_by_id(rows: list[Mapping[str, Any]]) -> dict[str, Mapping[str, Any]]:
    return {str(row["eventId"]): row for row in rows}


def _sign_ok(row: Mapping[str, Any]) -> bool:
    expected = row.get("expectedSign")
    total = _number((row.get("reward") or {}).get("total"))
    if expected == "negative":
        return total < 0
    if expected == "non-positive":
        return total <= 0
    if expected == "positive":
        return total > 0
    return False


def _profile_source_verified() -> bool:
    return _file_contains(
        HEADLESS_RUNNER_PATH,
        "baseStep: -0.016",
        "survival: 0.012",
        "survivalPressureBonus: 0.01",
        "checkpointReached: 0.85",
        "loss: -4.5",
        "survival-only, noop, and max-step plateaus are non-success",
    )


def build_reports() -> tuple[dict[str, Any], dict[str, Any]]:
    progress_report = _read_json(PROGRESS_REPORT_PATH)
    task_contract = _read_json(TASK_CONTRACT_PATH)
    control_summaries = progress_report.get("controlSummaries") if isinstance(progress_report.get("controlSummaries"), Mapping) else {}
    truth_rows = _build_truth_rows()
    truth_map = _truth_by_id(truth_rows)
    max_steps = int(
        _number(
            (((task_contract.get("matrix") or {}).get("episode") or {}).get("maxStepsPerEpisode")),
            180.0,
        )
    )
    survival_only_total = _number((truth_map["survival-time"].get("reward") or {}).get("total"))
    max_step_episode_total = _round(survival_only_total * max_steps)
    distributions = {
        "player-dead-only": {
            "source": "reward_signal_truth_table.json",
            "episodeClass": "failure-terminal",
            "totalReward": _number((truth_map["death"].get("reward") or {}).get("total")),
            "successEligible": False,
        },
        "noop-plateau": _control_distribution("noop-control", control_summaries.get("noop-control") or {}),
        "max-step-only": {
            "source": "task_metric_contract.json + reward_signal_truth_table.json",
            "episodeClass": "truncation",
            "maxSteps": max_steps,
            "perStepReward": survival_only_total,
            "episodeTotalReward": max_step_episode_total,
            "successEligible": False,
        },
        "progress": _control_distribution("positive-control", control_summaries.get("positive-control") or {}),
        "objective-complete": {
            "source": "reward_signal_truth_table.json",
            "episodeClass": "task-specific-natural-terminal",
            "totalReward": _number((truth_map["objective"].get("reward") or {}).get("total")),
            "successEligible": True,
        },
    }
    noop = distributions["noop-plateau"]
    progress = distributions["progress"]
    profile_source_verified = _profile_source_verified()
    truth_table_complete = sorted(row["eventId"] for row in truth_rows) == sorted(REQUIRED_EVENTS)
    truth_signs_ok = all(_sign_ok(row) for row in truth_rows)
    calibration_gates = {
        "profileSourceVerified": profile_source_verified,
        "truthTableComplete": truth_table_complete,
        "truthSignsOk": truth_signs_ok,
        "survivalOnlyNonPositive": survival_only_total <= 0,
        "noopPlateauNonSuccess": noop["totalReward"] <= 0
        and noop["progressReward"] <= 0
        and noop["objectiveReward"] <= 0
        and noop["successEligible"] is False,
        "maxStepOnlyNonSuccess": max_step_episode_total <= 0,
        "playerDeadNegative": distributions["player-dead-only"]["totalReward"] < 0,
        "hazardNegative": _number((truth_map["hazard"].get("reward") or {}).get("total")) < 0,
        "progressDominatesNoop": progress["totalReward"] > noop["totalReward"]
        and progress["progressReward"] > 0
        and progress["objectiveReward"] > 0,
        "objectiveDominatesProgressStep": distributions["objective-complete"]["totalReward"]
        > _number((truth_map["progress"].get("reward") or {}).get("total")),
        "progressReportStillGreen": progress_report.get("ok") is True
        and (progress_report.get("summary") or {}).get("microPpoStillBlockedUntil93L3") is True,
    }
    early_stop_rules = [
        {
            "id": "reward-up-semantics-down",
            "condition": "mean reward increases while progress/objective counts stay zero or terminal quality worsens",
            "resultClass": "reward-redesign-required",
        },
        {
            "id": "noop-or-max-step-green",
            "condition": "noop-control or max-step-only distribution becomes successEligible",
            "resultClass": "reward-redesign-required",
        },
        {
            "id": "player-dead-or-hazard-profitable",
            "condition": "player-dead-only or hazard-only total reward becomes non-negative",
            "resultClass": "reward-redesign-required",
        },
        {
            "id": "manual-injection-leaks",
            "condition": "manual progressEvent/context progress is used as reward-balance evidence",
            "resultClass": "measurement-invalid",
        },
    ]
    phase_coverage = {
        "93L.3.1": truth_table_complete and truth_signs_ok,
        "93L.3.2": all(
            calibration_gates[key]
            for key in (
                "profileSourceVerified",
                "survivalOnlyNonPositive",
                "noopPlateauNonSuccess",
                "maxStepOnlyNonSuccess",
                "playerDeadNegative",
                "hazardNegative",
                "progressDominatesNoop",
            )
        ),
        "93L.3.3": all(key in distributions for key in ("player-dead-only", "noop-plateau", "max-step-only", "progress", "objective-complete")),
        "93L.3.4": len(early_stop_rules) >= 4 and "reward-redesign-required" in {rule["resultClass"] for rule in early_stop_rules},
    }
    ok = all(phase_coverage.values()) and calibration_gates["progressReportStillGreen"]
    common = {
        "generatedAt": _utc_now(),
        "generatedBy": "python/scripts/bt93l_reward_balance.py",
        "git": {
            "branch": _git_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "sha": _git_output(["git", "rev-parse", "HEAD"]),
        },
        "blockId": "BT93L",
        "phaseId": "93L.3",
        "rewardProfileId": PROFILE_ID,
    }
    truth_table = {
        **common,
        "schemaVersion": "bt93l-reward-signal-truth-table-v1",
        "ok": phase_coverage["93L.3.1"],
        "resultClass": "reward-signal-truth-table-pinned" if phase_coverage["93L.3.1"] else "reward-redesign-required",
        "weights": BT93L_WEIGHTS,
        "events": truth_rows,
        "sourceArtifacts": {
            "headlessRunner": _source(HEADLESS_RUNNER_PATH, "BT93L reward profile source"),
            "taskMetricContract": _source(TASK_CONTRACT_PATH, "BT93L.1 task/terminal contract"),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "manualInjectionEvidenceAllowed": False,
            "candidateRun": False,
            "freezeCandidate": False,
            "holdoutUsed": False,
            "rolloutSignal": False,
        },
    }
    balance_report = {
        **common,
        "schemaVersion": "bt93l-reward-balance-report-v1",
        "ok": ok,
        "resultClass": "reward-balance-green" if ok else "reward-redesign-required",
        "phaseCoverage": phase_coverage,
        "calibrationGates": calibration_gates,
        "distributions": distributions,
        "earlyStopRules": early_stop_rules,
        "summary": {
            "pureDeathAvoidanceSuccessEligible": False,
            "noopPlateauSuccessEligible": noop["successEligible"],
            "maxStepOnlySuccessEligible": distributions["max-step-only"]["successEligible"],
            "progressDominatesNoop": calibration_gates["progressDominatesNoop"],
            "microPpoAllowedAfter93L3": ok,
            "trainingStartStillBlockedByLaterPhases": ["93L.4", "93L.5"],
            "bt94aClaimAllowed": False,
        },
        "sourceArtifacts": {
            "rewardSignalTruthTable": _source(TRUTH_TABLE_PATH, "BT93L.3.1 reward signal truth table"),
            "progressReachabilityReport": _source(PROGRESS_REPORT_PATH, "BT93L.2 real env.step reachability"),
            "taskMetricContract": _source(TASK_CONTRACT_PATH, "BT93L.1 task/terminal contract"),
            "headlessRunner": _source(HEADLESS_RUNNER_PATH, "BT93L reward profile source"),
        },
        "guardrails": {
            "diagnosticOnly": True,
            "trainingStarted": False,
            "baselineRun": False,
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
            "write": "python python/scripts/bt93l_reward_balance.py --write-report",
        },
    }
    return truth_table, balance_report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--truth-output", default=str(TRUTH_TABLE_PATH))
    parser.add_argument("--balance-output", default=str(BALANCE_REPORT_PATH))
    args = parser.parse_args()

    truth_table, balance_report = build_reports()
    if args.write_report:
        truth_output = Path(args.truth_output)
        balance_output = Path(args.balance_output)
        _write_json(truth_output, truth_table)
        balance_report["sourceArtifacts"]["rewardSignalTruthTable"] = _source(
            truth_output,
            "BT93L.3.1 reward signal truth table",
        )
        _write_json(balance_output, balance_report)
    print(
        json.dumps(
            {
                "ok": balance_report["ok"],
                "resultClass": balance_report["resultClass"],
                "phaseCoverage": balance_report["phaseCoverage"],
                "calibrationGates": balance_report["calibrationGates"],
                "outputs": {
                    "truthTable": _rel(Path(args.truth_output)),
                    "balanceReport": _rel(Path(args.balance_output)),
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if balance_report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
