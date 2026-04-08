# Teststrategie Testpyramide

Stand: 2026-04-01

## Zielbild

- `guard`: Plan- und Doku-Gates laufen zuerst.
- `node-contract`: Reine Logik-, Vertrags-, Policy-, Normalizer- und Trainingspfade laufen ueber `node:test`.
- `preview-smoke`: Nur wenige echte Runtime-/UI-Signale bleiben immer verfuegbar und laufen ueber den Preview-Server.
- `dev-runtime`: Physik, breite Runtime-Slices, GPU-/Stress-Pfade und die grossen Browser-Source-Import-Suites (`core-targeted`, `physics-*`, `arcade-blueprint`, `bot-targeting`) laufen gezielt ueber den Vite-Dev-Server.
- `browser-contract`: Fokussierte browsernahe Vertragschecks (`network-adapter`, `recording`, `training-automation`, `editor-vehicle`) laufen mit expliziter Spec-/`--grep`-Selektion ueber denselben Dev-Server-Vertrag.
- `heavy-special`: GPU-, Stress-, Legacy-Regressionen, diagnostische Recorder-Checks und Node-Integrationspfade bleiben opt-in.

## Default-Pfad

1. `npm run plan:check`
2. `npm run docs:sync`
3. `npm run docs:check`
4. `npm run test:contract`
5. `npm run test:smoke` (`preview-smoke`)

`npm run test:core` fasst nur noch Schritt 4 und 5 zusammen.

## Trigger

- `node-contract` zuerst fuer `src/modes/**`, `src/hunt/**`, `src/entities/ai/**`, `src/state/training/**` und `src/shared/contracts/**`.
- `preview-smoke` fuer App-Load, Matchstart, Rueckkehr ins Menue und kritische Persistenz.
- `dev-runtime` fuer echte Browser-/Canvas-/Runtime-Themen wie Physik, breite Runtime-Slices, GPU, Stress oder groessere Menuepfade.
- `browser-contract` fuer kleinere Playwright-Slices, die wegen DOM, Browser-APIs, `import('/src/...')` oder fokussierten Surface-Routen noch nicht sauber in `node:test` passen, aber keinen breiten Gesamtlauf brauchen.
- Browser-Demo- und Surface-Pfade ausserhalb des Desktop-first-Kerns bleiben bewusst opt-in: `network-adapter` prueft Transport-/Signaling-Vertraege, `recording` Web-Recording-APIs, `training-automation` den Browser-WebSocket-Pfad und `editor-vehicle` den Vehicle-Lab-/Asset-Contract.
- Der volle Editor-Map-Surface bleibt separat auf `npm run test:editor-ui` mit `playwright.editor.config.mjs`, statt in `dev-runtime` oder `browser-contract` zu landen.
- `heavy-special` nur fuer GPU, Stress, Legacy-Regressionen, Diagnostik oder gezielte Trainings-Integrationen.

## Rollout

- Stufe 1: Teure Low-Value-Playwright-Vertraege werden in `node:test` verschoben.
- Stufe 2: `tests/core.spec.js` bleibt nur kleiner `preview-smoke`; breite Runtime-Suites liegen separat im `dev-runtime`-Pfad und browsernahe Vertragschecks koennen als `browser-contract` laufen.
- Stufe 3: CI faehrt Guards plus `node-contract` plus kleinen Smoke, nicht mehr die grosse Sammelsuite.

## Rueckfallpfad

- Wenn ein ausgelagerter Vertrag doch Browser-Abhaengigkeiten zeigt, wandert nur dieser Fall in `browser-contract` oder `dev-runtime`, nicht zurueck in den Default-Smoke.
- Wenn der kleine Smoke ein wichtiges Runtime-Signal verpasst, wird zuerst `tests/core.spec.js` punktuell ergaenzt; `tests/core-targeted.spec.js` bleibt Reserve fuer breite Regressionen im `dev-runtime`.
- Surface-spezifische Editor-Faelle bleiben vorzugsweise auf `test:editor-ui` oder einem fokussierten `browser-contract` statt in die breite Runtime-Suite zurueckzurutschen.
- Diagnostik und Legacy-Suites bleiben vorhanden, aber ausserhalb des Default-Pfads, damit sie bei Bedarf sofort reaktivierbar sind.
