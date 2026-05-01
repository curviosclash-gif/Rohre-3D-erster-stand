# Fehlerbericht: BT93S2.3-Recheck measurement-invalid

## Aufgabe/Kontext

- Task: `BT93S2.3-Recheck` nach `BT93S2R.99=matrix-control-reentry-green`
- Ziel: Bestehende Actions gegen Matrix-/Control-v3 erneut messen und klaeren, ob `93S2.4` starten darf
- Datum: 2026-05-01

## Fehlerbild

- Beobachtung: Der frische Recheck schreibt `resultClass=measurement-invalid` und `opensNext=[]`.
- Erwartetes Verhalten: Nach `BT93S2R.99` sollten Predicate-, Window-, Control- und Direction-Gates in echter Env-Messung gruensicher sein oder eng klassifiziert rot enden.
- Tatsaechliches Verhalten:
  - `predicateFailureCount=36`
  - `minimumWindowFailureCount=8`
  - `escape-left-open` bleibt durch Negative-Control-Fail kontaminiert
  - `escape-right-open` bleibt `action-effect-weak`
  - `93S2.4`, `BT93T/U/W/O/P/94A` bleiben geschlossen

## Reproduktion

1. `python python/scripts/bt93s2_existing_action_effect_v3_recheck.py --write-report`
2. Report lesen: `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`
3. Kernergebnis: `ok=false`, `resultClass=measurement-invalid`, `opensNext=[]`.

## Betroffene Dateien/Komponenten

- `python/scripts/bt93s2_existing_action_effect_v3_recheck.py`
- `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`
- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`
- `data/training/ppo/bt93s2r/matrix_control_reentry_gate_report.json`
- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/plaene/neu/BT93S2R2_Recheck_Predicate_Window_Repair_Intake_2026-05-01.md`

## Bereits getestete Ansaetze

- Ansatz: Full-Recheck mit allen 338 Probes gegen Matrix-/Control-v3.
- Ergebnis: Recheck laeuft technisch durch, bleibt aber messlogisch rot.
- Ansatz: Schneller Probe-Lauf mit `--seed-limit 1 --action-limit 2`.
- Ergebnis: derselbe Failure-Typ sichtbar; Predicate-/Window-Drift ist nicht nur Artefakt des Full-Runs.

## Evidence

- `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`
- Command: `python python/scripts/bt93s2_existing_action_effect_v3_recheck.py --write-report`
- Failure-Verteilung:
  - Predicate-Fails: `frontal-near-wall=3`, `side-wall-left=1`, `narrowing-corridor=2`, `trail-ahead=1`, `trail-side=5`, `escape-left-open=13`, `escape-right-open=11`
  - Window-Fails: `frontal-near-wall=2`, `narrowing-corridor=2`, `trail-ahead=4`

## Aktueller Stand

Status: offen/blockierend.

Root-Cause-Stand: `BT93S2R.99` war als strukturelles Matrix-/Control-Gate gruen, aber die echte Recheck-Messung ist nicht gueltig. Der naechste Scope muss Predicate-Ausdruck, Predicate-Funktion, StartMetrics, Warmup, Seeds, Session-ID, Minimum-Window und Negative-Control-First empirisch zusammenfuehren.

## Naechster Schritt

`BT93S2R2` claimen und nur Predicate-/Window-/Control-Messgueltigkeit reparieren. Kein `93S2.4`, kein BT93T/U/W/O/P/94A, kein PPO-Training, kein Holdout, keine ActionSurface-, Reward-, Telemetry- oder Runtime-Aenderung.
