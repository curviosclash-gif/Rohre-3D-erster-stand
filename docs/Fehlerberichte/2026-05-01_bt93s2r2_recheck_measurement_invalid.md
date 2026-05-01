# Fehlerbericht: BT93S2R2 Abschluss

## Aufgabe/Kontext

- Task: `BT93S2R2.99`
- Ziel: roten Predicate-/Window-Reentry sauber schliessen und Folgeclaims blockieren.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass=measurement-invalid`, `ok=True`, `gatePassed=False`
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

## Aktive Blocker

- `direction-contract-mismatch`
- `escape-right-fairness-required`
- `measurement-invalid`
- `neutral-control-required`
- `predicate-window-required`
- `retained-v2-measurement-invalid`

## Bewertung

`BT93S2R2.99` schliesst rot. Ein frischer `BT93S2.3-Recheck` ist nicht geoeffnet,
weil das Empirical-Reentry-Gate keine Null-Counts erreicht hat. `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate, BT95 und produktive Runtime bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/bt93s2r2_closure_gate_report.json`
- Command: `python python/scripts/bt93s2r2_closure_gate.py --write-report`

## Naechster Schritt

- Do not start BT93S2.3-Recheck, 93S2.4, BT93T, BT93U, BT93W, BT93O, BT93P or BT94A. Warum: BT93S2R2.99 closes red as measurement-invalid; the empirical gate still has non-zero measurement blockers.
- Prepare a narrow follow-up replan for predicate/window replay validity, direction contract, retained-v2 invalidations, escape-right fairness and neutral control. Warum: The remaining failures are still measurement validity failures, not PPO quality, reward ordering, telemetry need, or candidate evidence.
