# Next Agent Prompt: Bot-Training-Automatisierung V33 (Bot C)

Arbeite im Projekt `c:\Users\gunda\Desktop\CurviosCLash` weiter.

Wichtig: Diese Lane besitzt Developer-UI und Trainings-UX. Kein Eingriff in Eval/Gate-Skripte von Bot B.

## Auftrag

Fuehre die Bot-C-Lane aus `docs/Feature_Bot_Training_Automatisierung_V33.md` um.

Fokusphasen:

1. `33.4` Developer-UI Automationslane
2. `33.5` Test-Lane Training Automation (UI-/Flow-Anteil)
3. `33.9` Abschluss-Gate-Doku (C-Anteil)

## Besitz dieser Lane

1. `index.html`
2. `src/core/GameBootstrap.js`
3. `src/ui/menu/**`
4. `src/core/runtime/MenuRuntimeDeveloperTrainingService.js`
5. `src/core/GameRuntimeFacade.js`
6. `src/core/GameDebugApi.js`
7. UI-/Flow-Tests unter `tests/**`
8. Doku unter `docs/**` (append-only)

Diese Lane fasst nicht an:

1. `scripts/training-eval.mjs`, `scripts/training-gate.mjs`
2. `package.json`
3. Bot-A-Core-Automationmodule ohne expliziten Handoff

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

1. Dev-Panel um `Run Batch`, `Run Eval`, `Run Gate` erweitern
2. UI-Payload-Builder und Runtime-Service modular halten
3. Ergebnisdarstellung (KPI + Artifact-Pfad + PASS/FAIL) verbessern
4. UI-Flow-Tests fuer die neuen Pfade bauen
5. Doku-/Bedienhinweise aktualisieren

## Mindest-Verifikation

1. neue UI-/Training-Flow-Tests
2. `npm run test:core`
3. `npm run test:stress` (oder isolierte relevante Tests)
4. `npm run docs:sync`
5. `npm run docs:check`
6. `npm run build`

## Abschlussformat

Die finale Ausgabe soll enthalten:

1. Welche UI-Elemente und Events neu sind
2. Wie die Runtime-Service-Schicht modular blieb
3. Welche Trainings-KPIs/Outputs im UI sichtbar sind
4. Exakte Verifikation mit PASS/FAIL
5. Restrisiken/Offene Punkte fuer Bot A/B
