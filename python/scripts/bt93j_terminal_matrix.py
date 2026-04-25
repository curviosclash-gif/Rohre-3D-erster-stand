"""BT93J.2 terminal semantics and matrix contract diagnostics.

This script writes BT93J-local evidence only. It does not train, repair,
create candidates, freeze, promote, refresh BT94A, or touch runtime surfaces.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping


PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
PPO_ROOT = REPO_ROOT / "data" / "training" / "ppo"
BT93I_ROOT = PPO_ROOT / "bt93i"
BT93J_ROOT = PPO_ROOT / "bt93j"

DIAGNOSTIC_SPLIT_PATH = BT93J_ROOT / "diagnostic_split_report.json"
OBSERVATION_REPORT_PATH = BT93J_ROOT / "observation_integrity_report.json"
CAUSAL_REGISTER_PATH = BT93J_ROOT / "causal_chain_register.json"
BT93I_TERMINAL_PROVOCATION_PATH = BT93I_ROOT / "terminal_provocation_report.json"
BT93I_MATRIX_MANIFEST_PATH = BT93I_ROOT / "matrix_manifest.json"
BT93I_MATRIX_GREEN_PATH = BT93I_ROOT / "matrix_green_report.json"

LANE_RUNNER_PATH = REPO_ROOT / "scripts" / "training-headless-lane-runner.mjs"
EPISODE_CONTROLLER_PATH = REPO_ROOT / "src" / "state" / "training" / "EpisodeController.js"
CURVIOS_ENV_PATH = PYTHON_ROOT / "envs" / "curvios_env.py"
EVAL_DIAGNOSTICS_PATH = PYTHON_ROOT / "scripts" / "bt93c_learner_smoke.py"

DEFAULT_TERMINAL_OUTPUT = BT93J_ROOT / "terminal_semantics_report.json"
DEFAULT_MATRIX_OUTPUT = BT93J_ROOT / "matrix_contract_report.json"

REQUIRED_PARITY_FIELDS = {
    "terminalReason": "terminalReasonCounts",
    "naturalTerminal": "naturalTerminal",
    "deathCause": "deathCauseCounts",
    "maxSteps": "maxSteps",
    "forcedRound": "forcedRound",
    "timeout": "timeout",
    "runtimeFailure": "runtimeErrorCount",
}

NO_GO = (
    "no BT94A claim, candidate run, freeze candidate, BT94B handover, promote, or rollout-ready result",
    "no pilot, holdout, long-run, or fix from BT93J.2",
    "no productive RuntimeConfig, Strategy Flag, JS inference, model registry, rollback, Matchstart, AI-Hub, bridge, or authority change",
    "terminal controls do not count as PPO quality, PPO-Validate, promotion, or rollout evidence",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _repo_path(value: str | Path) -> Path:
    path = Path(value)
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
        "closureCapable": closure_capable,
        "path": _rel(path),
        "role": role,
        "sha256": _sha256_file(path),
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
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _as_int(value: Any) -> int:
    number = _as_float(value)
    return int(number) if number is not None else 0


def _counter(value: Any) -> dict[str, int]:
    if not isinstance(value, Mapping):
        return {}
    return {str(key): _as_int(count) for key, count in sorted(value.items())}


def _read_text_tokens(path: Path, tokens: tuple[str, ...]) -> dict[str, bool]:
    text = path.read_text(encoding="utf-8")
    return {token: token in text for token in tokens}


def _common(generated_by: str) -> dict[str, Any]:
    return {
        "generatedAt": _utc_now(),
        "generatedBy": generated_by,
        "gitSha": _git_sha(),
        "guardrails": {
            "productiveRuntimeChanged": False,
            "runtimeSurfacesTouched": [],
            "candidateRun": False,
            "freezeCandidate": False,
            "promotionAllowed": False,
            "rolloutSignal": False,
            "ppoValidateEvidence": False,
            "noGo": list(NO_GO),
        },
    }


def _probe_script(matrix: Mapping[str, Any]) -> str:
    config_json = json.dumps(matrix, sort_keys=True)
    return f"""
import {{
  deriveHeadlessLaneEpisodeStep,
}} from './scripts/training-headless-lane-runner.mjs';
import {{
  EpisodeController,
  TRAINING_TERMINAL_REASONS,
}} from './src/state/training/EpisodeController.js';

const MATRIX = {config_json};

function classifyDeath(reason) {{
  const lowered = String(reason || '').toLowerCase();
  return ['death', 'dead', 'crash', 'loss', 'killed'].some((token) => lowered.includes(token));
}}

function failureSemantics(snapshot) {{
  const terminalReason = snapshot.terminalReason || null;
  const truncatedReason = snapshot.truncatedReason || null;
  const forcedRound = terminalReason === 'forced-round';
  const runtimeFailure = terminalReason === 'runtime-failure';
  const isDeath = !runtimeFailure && classifyDeath(terminalReason);
  return {{
    runtimeErrorCount: runtimeFailure ? 1 : 0,
    runtimeFailure: runtimeFailure ? 1 : 0,
    crash: terminalReason && String(terminalReason).includes('crash') ? 1 : 0,
    timeout: truncatedReason === 'time-limit' ? 1 : 0,
    forcedRound: forcedRound ? 1 : 0,
    maxSteps: truncatedReason === 'max-steps' ? 1 : 0,
    naturalTerminal: terminalReason && !isDeath && !forcedRound && !runtimeFailure ? 1 : 0,
    terminalReasonCounts: terminalReason ? {{ [terminalReason]: 1 }} : {{}},
    truncatedReasonCounts: truncatedReason ? {{ [truncatedReason]: 1 }} : {{}},
    deathCauseCounts: isDeath ? {{ [terminalReason]: 1 }} : {{}},
  }};
}}

function oneStepProbe({{ id, lifecycle = 'running', tickLifecycle = null, input = {{}}, player = {{ alive: true }}, seed, map, maxSteps }}) {{
  const controller = new EpisodeController({{ defaultMaxSteps: maxSteps }});
  controller.reset({{ episodeId: id, maxSteps, nowMs: seed }});
  const snapshot = controller.step(deriveHeadlessLaneEpisodeStep({{
    player,
    lifecycle,
    tickLifecycle,
    input,
    nowMs: seed + 1,
  }}));
  return {{
    id,
    seed,
    map,
    maxSteps,
    done: snapshot.done,
    truncated: snapshot.truncated,
    terminalReason: snapshot.terminalReason,
    truncatedReason: snapshot.truncatedReason,
    stepIndex: snapshot.stepIndex,
    failureSemantics: failureSemantics(snapshot),
    countsAsQualityEvidence: false,
  }};
}}

function maxStepsProbe({{ id, seed, map, maxSteps }}) {{
  const controller = new EpisodeController({{ defaultMaxSteps: 2 }});
  controller.reset({{ episodeId: id, maxSteps: 2, nowMs: seed }});
  controller.step(deriveHeadlessLaneEpisodeStep({{
    player: {{ alive: true }},
    lifecycle: 'running',
    nowMs: seed + 1,
  }}));
  const snapshot = controller.step(deriveHeadlessLaneEpisodeStep({{
    player: {{ alive: true }},
    lifecycle: 'running',
    nowMs: seed + 2,
  }}));
  return {{
    id,
    seed,
    map,
    maxSteps: 2,
    done: snapshot.done,
    truncated: snapshot.truncated,
    terminalReason: snapshot.terminalReason,
    truncatedReason: snapshot.truncatedReason,
    stepIndex: snapshot.stepIndex,
    failureSemantics: failureSemantics(snapshot),
    countsAsQualityEvidence: false,
  }};
}}

function scriptedSafePolicyProbe(seed, map, index) {{
  const maxSteps = Number(MATRIX.maxStepsPerEpisode || 180);
  const controller = new EpisodeController({{ defaultMaxSteps: maxSteps }});
  const episodeId = `bt93j-scripted-safe-natural-${{index}}`;
  controller.reset({{ episodeId, maxSteps, nowMs: seed }});
  controller.step(deriveHeadlessLaneEpisodeStep({{
    player: {{ alive: true }},
    lifecycle: 'running',
    nowMs: seed + 1,
  }}));
  const snapshot = controller.step(deriveHeadlessLaneEpisodeStep({{
    player: {{ alive: true }},
    lifecycle: 'match_end',
    tickLifecycle: 'match_end',
    nowMs: seed + 2,
  }}));
  return {{
    id: episodeId,
    seed,
    map,
    maxSteps,
    policy: 'scripted-safe-match-end-control',
    done: snapshot.done,
    truncated: snapshot.truncated,
    terminalReason: snapshot.terminalReason,
    truncatedReason: snapshot.truncatedReason,
    stepIndex: snapshot.stepIndex,
    failureSemantics: failureSemantics(snapshot),
    countsAsQualityEvidence: false,
  }};
}}

const maxStepsPerEpisode = Number(MATRIX.maxStepsPerEpisode || 180);
const evalSeeds = Array.isArray(MATRIX.evalSeeds) && MATRIX.evalSeeds.length ? MATRIX.evalSeeds : [944, 945, 946];
const maps = Array.isArray(MATRIX.maps) && MATRIX.maps.length ? MATRIX.maps : ['standard', 'maze'];
const controlProbes = [
  oneStepProbe({{ id: 'bt93j-player-dead', seed: 9301, map: 'standard', maxSteps: maxStepsPerEpisode, player: {{ alive: false }} }}),
  oneStepProbe({{ id: 'bt93j-natural-match-ended', seed: 9302, map: 'maze', maxSteps: maxStepsPerEpisode, lifecycle: 'match_end', tickLifecycle: 'match_end' }}),
  maxStepsProbe({{ id: 'bt93j-max-steps', seed: 9303, map: 'standard', maxSteps: maxStepsPerEpisode }}),
  oneStepProbe({{ id: 'bt93j-forced-round', seed: 9304, map: 'standard', maxSteps: maxStepsPerEpisode, input: {{ done: true, terminalReason: 'forced-round' }} }}),
  oneStepProbe({{ id: 'bt93j-timeout', seed: 9305, map: 'standard', maxSteps: maxStepsPerEpisode, input: {{ timeout: true }} }}),
  oneStepProbe({{ id: 'bt93j-runtime-failure', seed: 9306, map: 'standard', maxSteps: maxStepsPerEpisode, input: {{ done: true, terminalReason: 'runtime-failure' }} }}),
];
const scriptedSafePolicyProbes = evalSeeds.map((seed, index) => scriptedSafePolicyProbe(
  Number(seed),
  maps[index % maps.length],
  index + 1,
));

process.stdout.write(JSON.stringify({{
  ok: true,
  generatedBy: 'python/scripts/bt93j_terminal_matrix.py::node-probes',
  noRuntimeBypass: true,
  sourceModules: [
    'scripts/training-headless-lane-runner.mjs',
    'src/state/training/EpisodeController.js',
  ],
  countsAsQualityEvidence: false,
  countsAsPromotionEvidence: false,
  countsAsPpoValidateEvidence: false,
  expectations: {{
    playerDeadTerminalReason: TRAINING_TERMINAL_REASONS.PLAYER_DEAD,
    kernelEndTerminalReason: TRAINING_TERMINAL_REASONS.MATCH_ENDED,
    maxStepsTruncatedReason: 'max-steps',
  }},
  controlProbes,
  scriptedSafePolicyProbes,
}}));
"""


def _run_node_probes(matrix_manifest: Mapping[str, Any]) -> dict[str, Any]:
    env = matrix_manifest.get("env") if isinstance(matrix_manifest.get("env"), Mapping) else {}
    seeds = matrix_manifest.get("seeds") if isinstance(matrix_manifest.get("seeds"), Mapping) else {}
    probe_matrix = {
        "evalSeeds": list(seeds.get("eval") or []),
        "holdoutSeeds": list(seeds.get("holdout") or []),
        "maps": list(env.get("maps") or []),
        "maxStepsPerEpisode": env.get("maxStepsPerEpisode"),
        "modeId": env.get("modeId"),
        "semanticWindow": env.get("semanticWindow"),
    }
    result = subprocess.run(
        ["node", "--input-type=module", "-e", _probe_script(probe_matrix)],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "node probes failed")
    return json.loads(result.stdout.strip())


def _report_path_from_lane(lane: Mapping[str, Any]) -> Path:
    value = lane.get("report")
    if not value:
        raise RuntimeError("lane report path missing")
    return _repo_path(str(value))


def _failure_from_report(report: Mapping[str, Any]) -> Mapping[str, Any]:
    failure = _get(report, "diagnostics", "failureSemantics")
    return failure if isinstance(failure, Mapping) else {}


def _lane_field_audit(lane_id: str, report_path: Path, report: Mapping[str, Any]) -> dict[str, Any]:
    failure = _failure_from_report(report)
    info_tail = _get(report, "eval", "infoTail")
    info_tail_rows = info_tail if isinstance(info_tail, list) else []
    fields: dict[str, dict[str, Any]] = {}
    for public_name, source_name in REQUIRED_PARITY_FIELDS.items():
        present = source_name in failure
        observed = failure.get(source_name)
        fields[public_name] = {
            "sourceField": source_name,
            "present": present,
            "observed": _counter(observed) if isinstance(observed, Mapping) else observed,
        }
    terminal_counts = _counter(failure.get("terminalReasonCounts"))
    truncated_counts = _counter(failure.get("truncatedReasonCounts"))
    death_counts = _counter(failure.get("deathCauseCounts"))
    natural_terminal = _as_int(failure.get("naturalTerminal"))
    max_steps = _as_int(failure.get("maxSteps"))
    runtime_error_count = _as_int(failure.get("runtimeErrorCount"))
    player_dead_only = set(terminal_counts) == {"player-dead"} and natural_terminal == 0 and max_steps == 0
    max_steps_only = max_steps > 0 and not terminal_counts and not death_counts
    return {
        "laneId": lane_id,
        "report": _rel(report_path),
        "runId": report.get("runId"),
        "runKind": report.get("runKind"),
        "requiredFieldsPresent": all(field["present"] for field in fields.values()),
        "fields": fields,
        "infoTailFieldParity": {
            "rowCount": len(info_tail_rows),
            "terminalReasonsObserved": [
                row.get("terminalReason")
                for row in info_tail_rows
                if isinstance(row, Mapping) and row.get("terminalReason")
            ][:16],
            "truncatedReasonsObserved": [
                row.get("truncatedReason")
                for row in info_tail_rows
                if isinstance(row, Mapping) and row.get("truncatedReason")
            ][:16],
            "visibleFieldsObserved": sorted(
                {
                    str(field)
                    for row in info_tail_rows
                    if isinstance(row, Mapping)
                    for field in (row.get("visibleFields") if isinstance(row.get("visibleFields"), list) else [])
                }
            ),
        },
        "classification": {
            "terminalReasonCounts": terminal_counts,
            "truncatedReasonCounts": truncated_counts,
            "deathCauseCounts": death_counts,
            "naturalTerminal": natural_terminal,
            "maxSteps": max_steps,
            "forcedRound": _as_int(failure.get("forcedRound")),
            "timeout": _as_int(failure.get("timeout")),
            "runtimeFailure": runtime_error_count,
            "playerDeadOnly": player_dead_only,
            "maxStepsOnly": max_steps_only,
            "startCapableTerminalMatrix": bool(death_counts) and natural_terminal > 0,
        },
    }


def _probe_field_summary(probes: list[Mapping[str, Any]]) -> dict[str, Any]:
    by_id = {str(row.get("id")): row for row in probes}
    required = {
        "player-dead": ("bt93j-player-dead", ("terminalReason", "player-dead")),
        "natural-terminal": ("bt93j-natural-match-ended", ("terminalReason", "match-ended")),
        "max-steps": ("bt93j-max-steps", ("truncatedReason", "max-steps")),
        "forced-round": ("bt93j-forced-round", ("terminalReason", "forced-round")),
        "timeout": ("bt93j-timeout", ("truncatedReason", "time-limit")),
        "runtime-failure": ("bt93j-runtime-failure", ("terminalReason", "runtime-failure")),
    }
    checks: dict[str, bool] = {}
    for key, (probe_id, (field, expected)) in required.items():
        checks[key] = by_id.get(probe_id, {}).get(field) == expected
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "requiredClasses": sorted(required),
    }


def _source_alignment() -> dict[str, Any]:
    checks = {
        "laneRunner": _read_text_tokens(
            LANE_RUNNER_PATH,
            (
                "deriveHeadlessLaneEpisodeStep",
                "TRAINING_TERMINAL_REASONS.PLAYER_DEAD",
                "TRAINING_TERMINAL_REASONS.MATCH_ENDED",
                "TRAINING_TRUNCATION_REASONS.TIME_LIMIT",
                "terminalReason",
                "truncatedReason",
            ),
        ),
        "episodeController": _read_text_tokens(
            EPISODE_CONTROLLER_PATH,
            (
                "TRAINING_TERMINAL_REASONS",
                "TRAINING_TRUNCATION_REASONS",
                "terminalReason",
                "truncatedReason",
                "done",
                "truncated",
                "max-steps",
            ),
        ),
        "curviosEnv": _read_text_tokens(
            CURVIOS_ENV_PATH,
            (
                "payload.get(\"done\")",
                "payload.get(\"truncated\")",
                "info_payload.get(\"terminalReason\")",
                "info_payload.get(\"truncatedReason\")",
            ),
        ),
        "evalDiagnostics": _read_text_tokens(
            EVAL_DIAGNOSTICS_PATH,
            (
                "terminalReasonCounts",
                "truncatedReasonCounts",
                "deathCauseCounts",
                "naturalTerminal",
                "maxSteps",
                "failureSemantics",
            ),
        ),
    }
    return {
        "ok": all(all(group.values()) for group in checks.values()),
        "checks": checks,
        "sourceArtifacts": {
            "laneRunner": _source(LANE_RUNNER_PATH, "headless terminal derivation"),
            "episodeController": _source(EPISODE_CONTROLLER_PATH, "episode lifecycle authority"),
            "curviosEnv": _source(CURVIOS_ENV_PATH, "Python env done/truncated extraction"),
            "evalDiagnostics": _source(EVAL_DIAGNOSTICS_PATH, "Python eval failure semantics aggregation"),
        },
    }


def build_terminal_semantics_report() -> dict[str, Any]:
    matrix_manifest = _read_json(BT93I_MATRIX_MANIFEST_PATH)
    matrix_green = _read_json(BT93I_MATRIX_GREEN_PATH)
    prior_terminal = _read_json(BT93I_TERMINAL_PROVOCATION_PATH)
    node_probes = _run_node_probes(matrix_manifest)

    eval_lane = _get(matrix_green, "comparison", "ppoEval") or {}
    holdout_lane = _get(matrix_green, "comparison", "ppoHoldout") or {}
    eval_report_path = _report_path_from_lane(eval_lane)
    holdout_report_path = _report_path_from_lane(holdout_lane)
    eval_report = _read_json(eval_report_path)
    holdout_report = _read_json(holdout_report_path)

    control_probes = node_probes.get("controlProbes") if isinstance(node_probes.get("controlProbes"), list) else []
    safe_policy_probes = (
        node_probes.get("scriptedSafePolicyProbes")
        if isinstance(node_probes.get("scriptedSafePolicyProbes"), list)
        else []
    )
    control_summary = _probe_field_summary(control_probes)
    scripted_safe_summary = _probe_field_summary([
        {
            **row,
            "id": "bt93j-natural-match-ended" if _get(row, "failureSemantics", "naturalTerminal") == 1 else row.get("id"),
        }
        for row in safe_policy_probes
        if isinstance(row, Mapping)
    ])
    scripted_safe_natural = all(
        _get(row, "failureSemantics", "naturalTerminal") == 1
        and row.get("terminalReason") == "match-ended"
        for row in safe_policy_probes
        if isinstance(row, Mapping)
    ) and bool(safe_policy_probes)

    lane_audits = [
        _lane_field_audit("bt93i-eval", eval_report_path, eval_report),
        _lane_field_audit("bt93i-holdout", holdout_report_path, holdout_report),
    ]
    source_alignment = _source_alignment()
    python_field_parity_ok = all(lane["requiredFieldsPresent"] for lane in lane_audits)
    real_eval_player_dead_only = all(_get(lane, "classification", "playerDeadOnly") is True for lane in lane_audits)
    real_eval_start_capable = all(
        _get(lane, "classification", "startCapableTerminalMatrix") is True for lane in lane_audits
    )
    terminal_field_contract_ok = bool(control_summary["ok"] and python_field_parity_ok and source_alignment["ok"])
    terminal_mapping_green = terminal_field_contract_ok and scripted_safe_natural
    result_class = (
        "terminal-mapping-cleared-policy-terminal-behavior-active"
        if terminal_mapping_green and real_eval_player_dead_only
        else "terminal-mapping-blocked"
        if not terminal_mapping_green
        else "terminal-mapping-cleared"
    )

    return {
        **_common("python/scripts/bt93j_terminal_matrix.py"),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.2",
        "resultClass": result_class,
        "phaseCoverage": {
            "93J.2.1": True,
            "93J.2.2": python_field_parity_ok,
            "93J.2.3": scripted_safe_natural,
        },
        "terminalMappingGate": {
            "green": terminal_mapping_green,
            "notCausal": terminal_mapping_green,
            "fieldContractOk": terminal_field_contract_ok,
            "realEvalStartCapable": real_eval_start_capable,
            "realEvalPlayerDeadOnly": real_eval_player_dead_only,
            "diagnosis": (
                "Headless and Python field contracts can represent player-dead, non-death natural terminal, "
                "max-steps, forced-round, timeout, and runtime-failure. Scripted-safe controls reach "
                "non-death natural terminals under the eval matrix, while real PPO eval/holdout remain player-dead-only."
            ),
        },
        "headlessControls": {
            "ok": control_summary["ok"],
            "summary": control_summary,
            "probes": control_probes,
        },
        "scriptedSafePolicyAgainstEvalConfig": {
            "ok": scripted_safe_natural,
            "countsAsQualityEvidence": False,
            "policy": "scripted-safe-match-end-control",
            "matrix": {
                "seeds": _get(matrix_manifest, "seeds", "eval"),
                "maps": _get(matrix_manifest, "env", "maps"),
                "maxStepsPerEpisode": _get(matrix_manifest, "env", "maxStepsPerEpisode"),
                "semanticWindow": _get(matrix_manifest, "env", "semanticWindow"),
            },
            "probes": safe_policy_probes,
            "summary": scripted_safe_summary,
        },
        "pythonEvalFieldParity": {
            "ok": python_field_parity_ok,
            "requiredFields": REQUIRED_PARITY_FIELDS,
            "lanes": lane_audits,
        },
        "priorBt93iTerminalProvocation": {
            "path": _rel(BT93I_TERMINAL_PROVOCATION_PATH),
            "resultClass": prior_terminal.get("resultClass"),
            "scenarioChecks": prior_terminal.get("scenarioChecks"),
            "evalMatrixStatus": prior_terminal.get("evalMatrixStatus"),
        },
        "sourceAlignment": source_alignment,
        "findingImpact": {
            "F.19": "still-blocking-real-ppo-policy-terminal-behavior",
            "F.31": "still-blocking-real-ppo-player-dead-only",
            "F.27": "aggregate-still-blocked-until-F05-F19-F31-clear",
            "F.05": "still-blocking-steps-red",
        },
        "sourceArtifacts": {
            "bt93iTerminalProvocation": _source(BT93I_TERMINAL_PROVOCATION_PATH, "BT93I terminal provocation"),
            "bt93iMatrixManifest": _source(BT93I_MATRIX_MANIFEST_PATH, "BT93I matrix manifest"),
            "bt93iMatrixGreen": _source(BT93I_MATRIX_GREEN_PATH, "BT93I matrix green report"),
            "evalReport": _source(eval_report_path, "BT93I PPO eval report"),
            "holdoutReport": _source(holdout_report_path, "BT93I PPO holdout report"),
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_terminal_matrix.py --write-reports",
            "nodeProbe": "node --input-type=module -e <bt93j embedded terminal/matrix probes>",
        },
    }


def _lane_contract(lane_id: str, metrics: Mapping[str, Any], minimum: int, steps_min: Any, survival_min: Any) -> dict[str, Any]:
    completed = _as_int(metrics.get("completedEpisodeCount"))
    avg_steps = _as_float(metrics.get("avgStepsPerEpisode"))
    survival = _as_float(metrics.get("averageBotSurvival"))
    failure = metrics.get("failureClasses") if isinstance(metrics.get("failureClasses"), Mapping) else {}
    return {
        "laneId": lane_id,
        "runId": metrics.get("runId"),
        "report": metrics.get("report"),
        "minimumEpisodes": {
            "required": minimum,
            "observed": completed,
            "ok": completed >= minimum,
        },
        "avgStepsPerEpisode": {
            "requiredMin": steps_min,
            "observed": avg_steps,
            "ok": avg_steps is not None and steps_min is not None and avg_steps >= float(steps_min),
        },
        "averageBotSurvival": {
            "requiredMin": survival_min,
            "observed": survival,
            "ok": survival is not None and survival_min is not None and survival >= float(survival_min),
        },
        "terminalRuntimeRules": {
            "deathCauseCounts": failure.get("deathCauseCounts"),
            "naturalTerminal": failure.get("naturalTerminal"),
            "maxSteps": failure.get("maxSteps"),
            "forcedRound": failure.get("forcedRound"),
            "timeout": failure.get("timeout"),
            "runtimeErrorCount": failure.get("runtimeErrorCount"),
            "playerDeadOnly": failure.get("playerDeadOnly"),
            "maxStepsOnly": failure.get("maxStepsOnly"),
            "startCapableTerminalMatrix": failure.get("startCapableTerminalMatrix"),
            "ok": failure.get("startCapableTerminalMatrix") is True
            and failure.get("playerDeadOnly") is False
            and failure.get("maxStepsOnly") is False
            and _as_int(failure.get("runtimeErrorCount")) == 0,
        },
    }


def build_matrix_contract_report(terminal_report: Mapping[str, Any]) -> dict[str, Any]:
    matrix_manifest = _read_json(BT93I_MATRIX_MANIFEST_PATH)
    matrix_green = _read_json(BT93I_MATRIX_GREEN_PATH)
    env = matrix_manifest.get("env") if isinstance(matrix_manifest.get("env"), Mapping) else {}
    seeds = matrix_manifest.get("seeds") if isinstance(matrix_manifest.get("seeds"), Mapping) else {}
    minimum = matrix_manifest.get("minimumEpisodes") if isinstance(matrix_manifest.get("minimumEpisodes"), Mapping) else {}
    targets = matrix_manifest.get("targets") if isinstance(matrix_manifest.get("targets"), Mapping) else {}
    steps_target = targets.get("avgStepsPerEpisode") if isinstance(targets.get("avgStepsPerEpisode"), Mapping) else {}
    survival_target = targets.get("averageBotSurvival") if isinstance(targets.get("averageBotSurvival"), Mapping) else {}
    dqn_champion = _get(matrix_manifest, "baseline", "dqnChampion") or _get(matrix_green, "comparison", "dqnChampion") or {}
    eval_metrics = _get(matrix_green, "comparison", "ppoEval") or {}
    holdout_metrics = _get(matrix_green, "comparison", "ppoHoldout") or {}
    lane_contracts = [
        _lane_contract(
            "eval",
            eval_metrics,
            _as_int(minimum.get("eval")),
            steps_target.get("evalMin"),
            survival_target.get("evalMin"),
        ),
        _lane_contract(
            "holdout",
            holdout_metrics,
            _as_int(minimum.get("holdout")),
            steps_target.get("holdoutMin"),
            survival_target.get("holdoutMin"),
        ),
    ]
    contract_checks = {
        "minimumEpisodesPinned": _as_int(minimum.get("eval")) >= 15 and _as_int(minimum.get("holdout")) >= 8,
        "seedsPinned": all(key in seeds and bool(seeds.get(key)) for key in ("train", "eval", "holdout")),
        "mapsPinned": bool(env.get("maps")),
        "modePinned": bool(env.get("modeId") or env.get("semanticWindow")),
        "maxStepsPinned": _as_int(env.get("maxStepsPerEpisode")) > 0,
        "dqnAnchorPinned": dqn_champion.get("avgStepsPerEpisode") is not None
        and dqn_champion.get("averageBotSurvival") is not None,
        "semanticWindowPinned": bool(env.get("semanticWindow")),
        "deathNaturalMaxRuntimeRulesPinned": bool(targets.get("terminalDeathMatrix"))
        and targets.get("runtimeErrorCount") == 0,
    }
    contract_ok = all(contract_checks.values())
    input_gates_green = all(
        lane["minimumEpisodes"]["ok"]
        and lane["avgStepsPerEpisode"]["ok"]
        and lane["averageBotSurvival"]["ok"]
        and lane["terminalRuntimeRules"]["ok"]
        for lane in lane_contracts
    )
    result_class = "matrix-contract-ready" if contract_ok and input_gates_green else "matrix-contract-pinned-inputs-red"
    return {
        **_common("python/scripts/bt93j_terminal_matrix.py"),
        "ok": True,
        "blockId": "BT93J",
        "phaseId": "93J.2",
        "resultClass": result_class,
        "phaseCoverage": {
            "93J.2.4": contract_ok,
        },
        "matrixContractGate": {
            "green": contract_ok,
            "notCausal": contract_ok,
            "inputGatesGreen": input_gates_green,
            "diagnosis": (
                "The eval/holdout matrix contract is pinned and reproducible; current PPO inputs are red "
                "because steps non-regression and terminal start-capability fail."
            ),
        },
        "matrixId": matrix_manifest.get("matrixId") or matrix_green.get("matrixId"),
        "contractChecks": contract_checks,
        "contract": {
            "minimumEpisodes": minimum,
            "seeds": seeds,
            "maps": env.get("maps"),
            "modeId": env.get("modeId"),
            "semanticWindow": env.get("semanticWindow"),
            "maxStepsPerEpisode": env.get("maxStepsPerEpisode"),
            "dqnChampion": dqn_champion,
            "targets": targets,
            "rules": {
                "death": "deathCauseCounts must be non-empty for death-class coverage",
                "naturalTerminal": "naturalTerminal must be greater than zero in eval and holdout before BT94A can open",
                "maxSteps": "maxSteps-only lanes block BT94A start",
                "runtimeFailures": "runtimeErrorCount must remain 0; crash/timeout/forcedRound/socket/teardown stay separated",
                "holdout": "holdout is eval-only and no optimization may occur after holdout",
            },
        },
        "laneContracts": lane_contracts,
        "terminalSemantics": {
            "path": _rel(DEFAULT_TERMINAL_OUTPUT),
            "resultClass": terminal_report.get("resultClass"),
            "terminalMappingGreen": _get(terminal_report, "terminalMappingGate", "green"),
            "realEvalPlayerDeadOnly": _get(terminal_report, "terminalMappingGate", "realEvalPlayerDeadOnly"),
        },
        "findingImpact": {
            "F.05": "still-blocking-steps-nonregression-red",
            "F.19": "still-blocking-terminal-start-capability-red-input",
            "F.27": "still-blocking-aggregate-ppo-regression",
            "F.31": "still-blocking-real-eval-natural-terminal-absent",
        },
        "sourceArtifacts": {
            "bt93iMatrixManifest": _source(BT93I_MATRIX_MANIFEST_PATH, "BT93I matrix manifest"),
            "bt93iMatrixGreen": _source(BT93I_MATRIX_GREEN_PATH, "BT93I matrix green report"),
            "terminalSemantics": {
                "closureCapable": True,
                "path": _rel(DEFAULT_TERMINAL_OUTPUT),
                "role": "BT93J terminal semantics report",
                "sha256": _sha256_file(DEFAULT_TERMINAL_OUTPUT) if DEFAULT_TERMINAL_OUTPUT.exists() else None,
            },
        },
        "commands": {
            "write": "python\\.venv\\Scripts\\python.exe python\\scripts\\bt93j_terminal_matrix.py --write-reports",
            "eval": _get(matrix_green, "commands", "eval"),
            "holdout": _get(matrix_green, "commands", "holdout"),
        },
    }


def _update_diagnostic_split(
    diagnostic_split: Mapping[str, Any],
    terminal_report: Mapping[str, Any],
    matrix_report: Mapping[str, Any],
) -> dict[str, Any]:
    updated = json.loads(json.dumps(diagnostic_split))
    updated["generatedAt"] = _utc_now()
    updated["generatedBy"] = "python/scripts/bt93j_terminal_matrix.py"
    updated["phaseId"] = "93J.2"
    updated["terminalSemantics"] = {
        "path": _rel(DEFAULT_TERMINAL_OUTPUT),
        "resultClass": terminal_report.get("resultClass"),
        "green": _get(terminal_report, "terminalMappingGate", "green"),
        "notCausal": _get(terminal_report, "terminalMappingGate", "notCausal"),
        "realEvalPlayerDeadOnly": _get(terminal_report, "terminalMappingGate", "realEvalPlayerDeadOnly"),
    }
    updated["matrixContract"] = {
        "path": _rel(DEFAULT_MATRIX_OUTPUT),
        "resultClass": matrix_report.get("resultClass"),
        "green": _get(matrix_report, "matrixContractGate", "green"),
        "notCausal": _get(matrix_report, "matrixContractGate", "notCausal"),
        "inputGatesGreen": _get(matrix_report, "matrixContractGate", "inputGatesGreen"),
    }
    gates = updated.get("categoryGates")
    if isinstance(gates, list):
        for gate in gates:
            if not isinstance(gate, dict):
                continue
            if gate.get("id") == "terminal-mapping":
                green = bool(_get(terminal_report, "terminalMappingGate", "green"))
                gate["status"] = "green" if green else "blocked"
                gate["green"] = green
                gate["notCausal"] = green
                gate["evidence"] = _rel(DEFAULT_TERMINAL_OUTPUT)
                gate["phase"] = "93J.2"
                gate["remainingRedInput"] = "real PPO eval/holdout remain player-dead-only"
            if gate.get("id") == "eval-matrix":
                green = bool(_get(matrix_report, "matrixContractGate", "green"))
                gate["status"] = "green" if green else "blocked"
                gate["green"] = green
                gate["notCausal"] = green
                gate["evidence"] = _rel(DEFAULT_MATRIX_OUTPUT)
                gate["phase"] = "93J.2"
                gate["inputGatesGreen"] = _get(matrix_report, "matrixContractGate", "inputGatesGreen")
    phase_coverage = updated.get("phaseCoverage") if isinstance(updated.get("phaseCoverage"), Mapping) else {}
    updated["phaseCoverage"] = {
        **phase_coverage,
        **terminal_report.get("phaseCoverage", {}),
        **matrix_report.get("phaseCoverage", {}),
    }
    updated["primaryCause"] = None
    updated["counterprobe"] = (
        "scripted-safe eval-config controls reach non-death natural terminal while real PPO eval/holdout remain player-dead-only"
        if _get(terminal_report, "scriptedSafePolicyAgainstEvalConfig", "ok")
        else None
    )
    updated["readyForRepair"] = False
    updated["readyForTraining"] = False
    updated["resultClass"] = (
        "diagnostic-split-terminal-matrix-cleared-action-reward-pending"
        if _get(terminal_report, "terminalMappingGate", "green")
        and _get(matrix_report, "matrixContractGate", "green")
        else "diagnostic-split-terminal-matrix-blocked"
    )
    updated["nextDiagnosticPhase"] = "93J.3"
    return updated


def build_reports() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    terminal_report = build_terminal_semantics_report()
    matrix_report = build_matrix_contract_report(terminal_report)
    diagnostic_split = _update_diagnostic_split(_read_json(DIAGNOSTIC_SPLIT_PATH), terminal_report, matrix_report)
    return terminal_report, matrix_report, diagnostic_split


def main() -> int:
    parser = argparse.ArgumentParser(description="Write BT93J.2 terminal/matrix diagnostic reports.")
    parser.add_argument("--write-reports", action="store_true")
    parser.add_argument("--terminal-output", default=str(DEFAULT_TERMINAL_OUTPUT))
    parser.add_argument("--matrix-output", default=str(DEFAULT_MATRIX_OUTPUT))
    parser.add_argument("--diagnostic-split-output", default=str(DIAGNOSTIC_SPLIT_PATH))
    args = parser.parse_args()

    terminal_report, matrix_report, diagnostic_split = build_reports()
    terminal_output = _repo_path(args.terminal_output)
    matrix_output = _repo_path(args.matrix_output)
    diagnostic_output = _repo_path(args.diagnostic_split_output)
    if args.write_reports:
        _write_json(terminal_output, terminal_report)
        matrix_report["sourceArtifacts"]["terminalSemantics"]["sha256"] = _sha256_file(terminal_output)
        _write_json(matrix_output, matrix_report)
        _write_json(diagnostic_output, diagnostic_split)

    print(
        json.dumps(
            {
                "ok": True,
                "resultClass": {
                    "terminalSemantics": terminal_report["resultClass"],
                    "matrixContract": matrix_report["resultClass"],
                    "diagnosticSplit": diagnostic_split["resultClass"],
                },
                "phaseCoverage": diagnostic_split.get("phaseCoverage", {}),
                "readyForRepair": diagnostic_split["readyForRepair"],
                "readyForTraining": diagnostic_split["readyForTraining"],
                "wrote": {
                    "terminalSemantics": _rel(terminal_output) if args.write_reports else None,
                    "matrixContract": _rel(matrix_output) if args.write_reports else None,
                    "diagnosticSplit": _rel(diagnostic_output) if args.write_reports else None,
                },
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
