# Fehlerbericht: BT93S2R3 Measurement-Reentry erforderlich

## Aufgabe/Kontext

- Task: `93S2R3.2`
- Ziel: Replay-Determinismus, StartMetrics, Warmup, Predicate und Minimum-Window vor jeder Action-Wirkung fail-fast pruefen.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass=replay-determinism-required`, `ok=True`, `preflightGreen=False`
- Failure-Ledger-Rows: `103`
- Preflight-Rows: `103`
- Replay-Attempts: `206`
- Replay-Determinism-Fails: `103`
- Predicate-Fails: `25`
- Minimum-Window-Fails: `3`
- Warmup-Terminal-Before-Action: `0`
- Measurement-Invalid-Before-Action: `27`
- Action-Effect-Overrides: `0`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

- `data/training/ppo/bt93s2r3/failure_ledger_report.json`: role=`BT93S2R3.1 source-lock and failure-ledger input`, resultClass=`source-lock-failure-ledger-written`, ok=`True`, sha256=`901adc50c2a2d9eb33be2d934452656f660c2849c0e2b89f429479f825c12e3b`
- `data/training/ppo/bt93s2r2/predicate_window_repair_contract.json`: role=`BT93S2R2 predicate/window repair contract`, resultClass=`predicate-window-repair-contract-green`, ok=`True`, sha256=`1347893998c73af94e8171584e24b8c0a7347cdd216670db113a77dd58d4109e`
- `data/training/ppo/bt93s2r2/empirical_reentry_gate_report.json`: role=`BT93S2R2 red empirical gate context`, resultClass=`measurement-invalid`, ok=`False`, sha256=`0ba311bf779ed66b7bfa2706b3431d8a1c2edbc35b77cd9247dd32aed31de177`
- `python/envs/ppo_action_surface.py`: role=`read-only PPO action-surface decoder`, resultClass=`None`, ok=`None`, sha256=`970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
- `python/scripts/bt93s2r3_replay_predicate_window_preflight.py`: role=`BT93S2R3.2 preflight generator`, resultClass=`None`, ok=`None`, sha256=`918840775543308df583d55da2a05b153cbff337696668c9adae3dca26516e18`

## Blocking-Klassen

- `predicate-window-required`: `27`
- `replay-determinism-required`: `103`

## Issues

- `measurement-invalid-before-action`: `27`
- `minimum-window-fail`: `3`
- `predicate-fail`: `25`
- `session-replay-id-source-mismatch`: `103`
- `sessionReplayId-repeat-mismatch`: `103`
- `start-metrics-source-mismatch`: `103`
- `startMetricsHash-repeat-mismatch`: `103`

## Bewertung

`93S2R3.2` ist diagnostic-only. Keine Action-Wirkung, kein Reward, keine
Telemetry, kein ActionSurface- oder Runtime-Pfad darf einen roten Preflight
ueberstimmen.

## Evidence

- `data/training/ppo/bt93s2r3/replay_predicate_window_preflight.json`
- Command: `python python/scripts/bt93s2r3_replay_predicate_window_preflight.py --write-report`

## Naechster Schritt

- Stop S2R3 action-effect work and repair replay/predicate/window measurement before 93S2R3.3.
- Do not start BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.

<!-- BT93S2R3.3-START -->
## 93S2R3.3 Direction-, Fairness- und Neutral-Control-Contract

- Result: `resultClass=direction-fairness-neutral-contract-green`, `ok=True`
- Direction-Rows: `103`; Reward-/Command-Success erlaubt: `0`
- Escape-right positive Controls messbar: `12` / `12`
- No-danger Neutral-Control: rows `26`, actionGreenProduced=`False`, directionGreenProduced=`False`
- Source Full-Replay: `103` rows x `3` repeats = `309` attempts

S2R3.3 pinnt nur Direction-/Fairness-/Neutral-Vertraege. Action-Space-Urteile,
Reward-, Telemetry-, ActionSurface-, Training-, Holdout- und Runtime-Aenderungen
bleiben verboten.

Evidence:

- `data/training/ppo/bt93s2r3/direction_fairness_neutral_contract.json`
- Command: `python python/scripts/bt93s2r3_direction_fairness_neutral_contract.py --write-report`
<!-- BT93S2R3.3-END -->

<!-- BT93S2R3.4-START -->
## 93S2R3.4 Retained-v2-Quarantaene und Full-Scenario Empirical Gate

- Result: `resultClass=predicate-window-required`, `ok=False`
- Full Matrix: `9` scenarios x `13` actions = `338` probes
- Repaired S2R5 Rows materialisiert: `33` / `33`
- Null-Counts: predicate=`19`, window=`1`, measurement=`19`, direction=`0`, retainedV2=`10`, neutral=`0`, negative=`0`
- Training/Holdout/Optimizer: `0` / `0` / `0`

S2R3.4 belegt nur Messgueltigkeit auf der vollen Matrix. `BT93S2.3-Recheck`,
`93S2.4`, Training, Candidate, Freeze, Holdout, Promote, Rollout und
PPO-Validate bleiben bis `BT93S2R3.99=matrix-control-reentry-green` geschlossen.

Evidence:

- `data/training/ppo/bt93s2r3/empirical_zero_gate_report.json`
- Command: `python python/scripts/bt93s2r3_empirical_zero_gate.py --write-report`
<!-- BT93S2R3.4-END -->
