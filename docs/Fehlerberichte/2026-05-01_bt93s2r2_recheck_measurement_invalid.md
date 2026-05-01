# Fehlerbericht: BT93S2R2 Empirical-Reentry Gate

## Aufgabe/Kontext

- Task: `BT93S2R2.3`
- Ziel: reparierten Predicate-/Window-Vertrag gegen echte Env-Proben validieren.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass=measurement-invalid`, `ok=False`, `gatePassed=False`
- Source-Probes: `338`
- Fresh-Probes: `338`
- Predicate-Fails: `39`
- Minimum-Window-Fails: `11`
- Measurement-Invalid: `49`
- Negative-Control-Fails: `0`
- Direction-Mismatches: `24`
- Escape-Right-Fairness-Fails: `1`
- Retained-v2-Measurement-Invalid: `28`
- Neutral-Control-Required: `1`
- PPO-Training/Holdout/Runtime-Aenderungen: `0`

## Szenario-Gates

- `escape-left-open`: result=`existing-action-effect-observed`, predicate=`13`, window=`1`, measurementInvalid=`13`, negative=`0`, direction=`7`, escapeRightFairness=`0`, retainedV2=`0`, neutral=`0`
- `escape-right-open`: result=`action-effect-weak`, predicate=`6`, window=`0`, measurementInvalid=`6`, negative=`0`, direction=`0`, escapeRightFairness=`1`, retainedV2=`0`, neutral=`0`
- `frontal-near-wall`: result=`existing-action-effect-observed`, predicate=`2`, window=`4`, measurementInvalid=`6`, negative=`0`, direction=`3`, escapeRightFairness=`0`, retainedV2=`6`, neutral=`0`
- `narrowing-corridor`: result=`existing-action-effect-observed`, predicate=`5`, window=`1`, measurementInvalid=`6`, negative=`0`, direction=`2`, escapeRightFairness=`0`, retainedV2=`6`, neutral=`0`
- `no-danger-control`: result=`neutral-control-unstable`, predicate=`2`, window=`0`, measurementInvalid=`2`, negative=`0`, direction=`0`, escapeRightFairness=`0`, retainedV2=`0`, neutral=`1`
- `side-wall-left`: result=`existing-action-effect-observed`, predicate=`0`, window=`0`, measurementInvalid=`0`, negative=`0`, direction=`1`, escapeRightFairness=`0`, retainedV2=`0`, neutral=`0`
- `side-wall-right`: result=`existing-action-effect-observed`, predicate=`2`, window=`0`, measurementInvalid=`2`, negative=`0`, direction=`2`, escapeRightFairness=`0`, retainedV2=`2`, neutral=`0`
- `trail-ahead`: result=`existing-action-effect-observed`, predicate=`4`, window=`4`, measurementInvalid=`8`, negative=`0`, direction=`4`, escapeRightFairness=`0`, retainedV2=`8`, neutral=`0`
- `trail-side`: result=`existing-action-effect-observed`, predicate=`5`, window=`1`, measurementInvalid=`6`, negative=`0`, direction=`5`, escapeRightFairness=`0`, retainedV2=`6`, neutral=`0`

## Bewertung

`BT93S2R2.3` hat echte Env-Proben geschrieben und das Null-Count-Gate vor
jedem Folgeclaim erzwungen. Nur `matrix-control-reentry-green` darf nach
`93S2R2.99` einen frischen `BT93S2.3-Recheck` oeffnen. `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/empirical_reentry_gate_report.json`
- Command: `python python/scripts/bt93s2r2_empirical_reentry_gate.py --write-report`

## Naechster Schritt

Run 93S2R2.99 closure to record the red empirical gate and prepare a narrower follow-up replan; do not start BT93S2.3-Recheck or 93S2.4.
