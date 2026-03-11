# Next Agent Prompt: Bot-Training-Automatisierung V33 (Bot B)

Arbeite im Projekt `c:\Users\gunda\Desktop\CurviosCLash` weiter.

Wichtig: Diese Lane besitzt Eval/Gate/Bridge. Kein UI-Umbau (Bot C) und kein Core-Batch-Umbau von Bot A ohne Handoff.

## Auftrag

Fuehre die Bot-B-Lane aus `docs/Feature_Bot_Training_Automatisierung_V33.md` um.

Fokusphasen:

1. `33.2` Eval- und Gate-Lane
2. `33.3` Bridge-/Trainer-Client-Lane
3. `33.6` Baseline-/Threshold-Kalibrierung
4. `33.7` End-to-End-Orchestrierung (B-Anteil)

## Besitz dieser Lane

1. `scripts/training-eval.mjs`
2. `scripts/training-gate.mjs`
3. optional `scripts/training-e2e.mjs`-Gate-Anteil
4. Bridge-/Gate-nahe Module in `src/entities/ai/training/**` und ggf. `src/state/training/**`
5. `package.json` (Scripts fuer `training:run/eval/gate/e2e`)
6. eigene Tests unter `tests/**` fuer Gate/Bridge
7. eigene Doku-Updates in `docs/**` (append-only)

Diese Lane fasst nicht an:

1. `index.html`, `src/ui/menu/**`, `src/core/runtime/MenuRuntimeDeveloperTrainingService.js`
2. Bot-A-Core-Dateien ohne Handoff (AutomationRunner intern)

## Startblock

1. `AGENTS.md` und relevante `.agents` Regeln/Workflows lesen.
2. Revalidieren:
   - `git status --short`
   - `git diff --name-status`
   - `git log --oneline -n 10`
3. Diese Dokus lesen:
   - `docs/Feature_Bot_Training_Automatisierung_V33.md`
   - `docs/Bot-Training-Schnittstelle.md`
   - `docs/Umsetzungsplan.md`

## Verbindliche Umsetzungsreihenfolge

1. `training-eval` implementieren
2. `training-gate` mit Exit-Code und KPI-Schwellen implementieren
3. Bridge-Timeout/Retry/Fallback lane absichern
4. `package.json` Scripts final verdrahten
5. Baseline-Kalibrierung dokumentieren

## Mindest-Verifikation

1. neue Eval-/Gate-/Bridge-Tests
2. `npm run training:run` (sofern bereits vorhanden)
3. `npm run training:eval`
4. `npm run training:gate`
5. `npm run docs:sync`
6. `npm run docs:check`
7. `npm run build`

## Abschlussformat

Die finale Ausgabe soll enthalten:

1. KPI-Schwellen und deren Herleitung
2. Exit-Code-Verhalten von `training:gate`
3. Bridge-Fallback-Strategie und Messwerte
4. Exakte Verifikation mit PASS/FAIL
5. Handoff-Notizen an Bot A/C
