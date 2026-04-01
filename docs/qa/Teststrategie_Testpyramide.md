# Teststrategie Testpyramide

Stand: 2026-04-01

## Zielbild

- `guard`: Plan- und Doku-Gates laufen zuerst.
- `node-contract`: Reine Logik-, Vertrags-, Policy-, Normalizer- und Trainingspfade laufen ueber `node:test`.
- `playwright-smoke`: Nur wenige echte Runtime-/UI-Signale bleiben immer verfuegbar.
- `playwright-targeted`: Physik, Netzwerk, Recorder, Editor und groessere Runtime-Slices laufen gezielt nach Scope.
- `heavy-special`: GPU-, Stress-, Legacy-Regressionen, diagnostische Recorder-Checks und Node-Integrationspfade bleiben opt-in.

## Default-Pfad

1. `npm run plan:check`
2. `npm run docs:sync`
3. `npm run docs:check`
4. `npm run test:contract`
5. `npm run test:smoke`

`npm run test:core` fasst nur noch Schritt 4 und 5 zusammen.

## Trigger

- `node-contract` zuerst fuer `src/modes/**`, `src/hunt/**`, `src/entities/ai/**`, `src/state/training/**` und `src/shared/contracts/**`.
- `playwright-smoke` fuer App-Load, Matchstart, Rueckkehr ins Menue und kritische Persistenz.
- `playwright-targeted` nur bei echten Browser-/Canvas-/Runtime-Themen wie Physik, Netzwerk, Recorder, Editor oder groesseren Menuepfaden.
- `heavy-special` nur fuer GPU, Stress, Legacy-Regressionen, Diagnostik oder gezielte Trainings-Integrationen.

## Rollout

- Stufe 1: Teure Low-Value-Playwright-Vertraege werden in `node:test` verschoben.
- Stufe 2: `tests/core.spec.js` bleibt nur kleiner Smoke; die grosse Rest-Suite liegt separat als `tests/core-targeted.spec.js`.
- Stufe 3: CI faehrt Guards plus `node-contract` plus kleinen Smoke, nicht mehr die grosse Sammelsuite.

## Rueckfallpfad

- Wenn ein ausgelagerter Vertrag doch Browser-Abhaengigkeiten zeigt, wandert nur dieser Fall in `playwright-targeted`, nicht zurueck in den Default-Smoke.
- Wenn der kleine Smoke ein wichtiges Runtime-Signal verpasst, wird zuerst `tests/core.spec.js` punktuell ergaenzt; `tests/core-targeted.spec.js` bleibt Reserve fuer breite Regressionen.
- Diagnostik und Legacy-Suites bleiben vorhanden, aber ausserhalb des Default-Pfads, damit sie bei Bedarf sofort reaktivierbar sind.
