# Fehlerbericht: BT93S2R4 Predicate-/Window-Required

## Aufgabe/Kontext

- Task: `93S2R4.4`
- Quelle: `93S2R4.3=deterministic-reset-warmup-repair-green`
- Ziel: Predicate-Ausdruck, Predicate-Funktion, Minimum-Window und `measurementInvalidBeforeAction` erst nach stabilem Replay-Repeat-Gate auf allen 103 Rows neu messen.

## Ergebnis

- Result: `resultClass=predicate-window-required`, `ok=false`
- Replay-Attempts: `309` (`103` Rows x `3` Repeats)
- Replay-/StartMetrics-/Warmup-/Session-Drift: `0/0/0/0`
- Predicate-Fails: `33`
- Measurement-Invalid-Before-Action: `33`
- Minimum-Window-Fails: `0`
- Warmup-Terminal-Before-Action: `0`
- Action-Effect-Overrides: `0`
- Training/Holdout/Optimizer: `0/0/0`
- `opensNext=[]`

## Befundmatrix

- `narrowing-corridor`: `3` Rows rot
- `escape-right-open`: `17` Rows rot
- `no-danger-control`: `13` Rows rot

Alle roten Rows sind nach Replay-/StartState-Reparatur deterministisch stabil. Der Restblocker ist damit kein Replay-, Reset-, Warmup-, Session- oder Minimum-Window-Problem mehr, sondern ein Predicate-/Pre-Action-Validity-Problem auf stabiler Replay-Basis.

## No-Go

Kein `93S2R4.5`, kein `93S2R4.99`, kein `93S2R3.3-Reentry`, kein `BT93S2.3-Recheck`, kein `93S2.4`, kein `BT93T/U/W/O/P/94A`, kein Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate oder BT95.

Keine Reward-, Telemetry-, ActionSurface-, PPO-Training- oder produktive Runtime-Aenderung aus diesem Befund ableiten. Der naechste Fix muss eng auf Predicate-/Pre-Action-Validity fuer `narrowing-corridor`, `escape-right-open` und `no-danger-control` bleiben.

## Evidence

- `data/training/ppo/bt93s2r4/predicate_window_stable_replay_report.json`
- Command: `python python/scripts/bt93s2r4_predicate_window_stable_replay.py --write-report`

## Naechster Schritt

- Engen Folge-Replan fuer BT93S2R4 Predicate-/Window-Reparatur aufnehmen.
- Danach erneut `93S2R4.4` oder einen explizit aufgenommenen Reentry ausfuehren.
- `93S2R4.5` erst starten, wenn `predicateFailureCount=0`, `measurementInvalidBeforeActionCount=0`, `minimumWindowFailureCount=0` und `warmupTerminalBeforeActionCount=0` maschinenlesbar belegt sind.
