# Next Agent Prompt: Bot-Training-Automatisierung V33 (Bot A)

Arbeite im Projekt `c:\Users\gunda\Desktop\CurviosCLash` weiter.

Wichtig: Diese Lane ist der Automation-Core. Kein Eingriff in UI-Lane (Bot C) oder Gate-Skripte (Bot B), ausser via abgestimmtem Handoff.

## Auftrag

Fuehre die Bot-A-Lane aus `docs/Feature_Bot_Training_Automatisierung_V33.md` um.

Fokusphasen:

1. `33.0` Contract-/KPI-Freeze (mit den anderen Lanes abstimmen)
2. `33.1` Automationskern Batch-Runner
3. `33.7` End-to-End-Orchestrierung (A-Anteil)

## Besitz dieser Lane

1. `src/entities/ai/training/**` (Automation-Core, nicht Bridge-spezifisch)
2. `scripts/training-run.mjs`
3. `scripts/training-e2e.mjs` oder gleichwertige Orchestrierung (falls sinnvoll)
4. eigene Tests unter `tests/**` fuer Core-Automation
5. eigene Doku-Updates in `docs/**` (append-only)

Diese Lane fasst nicht an:

1. `index.html`, `src/ui/menu/**`, `src/core/runtime/MenuRuntimeDeveloperTrainingService.js`
2. `scripts/training-eval.mjs`, `scripts/training-gate.mjs`
3. `package.json` (Bot-B-Lane)

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

1. Contract-Freeze + Artefaktformat finalisieren
2. `TrainingAutomationRunner` mit Seed-/Episode-Loops implementieren
3. `scripts/training-run.mjs` bauen
4. `training:e2e`-Orchestrierung vorbereiten (Handoff an Bot B fuer Gate-Anbindung)

## Mindest-Verifikation

1. gezielte Core-Automation-Tests
2. `npm run test:core`
3. `npm run docs:sync`
4. `npm run docs:check`
5. `npm run build`

## Abschlussformat

Die finale Ausgabe soll enthalten:

1. Welche Core-Module entstanden/geaendert wurden
2. Wie Reproduzierbarkeit ueber Seeds/Episoden sichergestellt wird
3. Welche Artefakte erzeugt werden
4. Exakte Verifikation mit PASS/FAIL
5. Handoff-Notizen an Bot B/C
