# Teststrategie Testpyramide

Stand: 2026-04-12

## Zielbild

- `guard`: Plan- und Doku-Gates laufen zuerst.
- `node-contract`: Reine Logik-, Vertrags-, Policy-, Normalizer-, Storage-, Capability- und Trainingspfade laufen ueber `node:test`.
- `desktop-smoke`: Das kleinste produktnahe Desktop-Hauptgate prueft echten App-Boot, Menu, Matchstart, ersten Input und Return-to-Menu.
- `desktop-e2e`: Produktnahe Desktop-Integrationen ueber den Smoke-Kern hinaus laufen gezielt ueber reale Session-, Runtime-, Plattform- und Recording-Pfade.
- `browser-compat`: Browser-Demo-, Web-API-, Editor- und degradierte Browser-Fallback-Pfade bleiben eigener Kompatibilitaets-Layer.
- `heavy-diagnostic`: Physics-, Bot-, GPU-, Stress-, Legacy- und andere breite Diagnosepfade bleiben opt-in.

## Default-Pfad

1. `npm run plan:check`
2. `npm run docs:sync`
3. `npm run docs:check`
4. `npm run test:contract`
5. `npm run test:desktop:smoke`

`npm run test:core` fasst nur noch `node-contract + desktop-smoke` zusammen.

## Schnellwahl fuer neue Features

- `node-contract` zuerst fuer gemeinsame Runtime-, Match-, KI-, Storage-, Config- und Capability-Vertraege ohne DOM, Browser-API, Electron-Boot oder echten Matchflow.
- `desktop-smoke` fuer sichtbare Desktop-Hauptproduktpfade, wenn Start, Menu, Matchstart, Input-Ankunft oder Return-to-Menu das eigentliche Risiko tragen.
- `desktop-e2e` nur dann, wenn die Aenderung ueber den Smoke-Kern hinaus echte Desktop-Integration braucht, z. B. Session-/Lobby-Lifecycle, Recording-Lifecycle, Plattform-Capabilities oder breitere Runtime-Orchestrierung.
- `browser-compat` nur fuer Browser-Demo, Web-APIs, degradierte Browser-Fallbacks, browsernahe Surface-Routen oder Web-/Editor-Pfade wie `network-adapter`, `recording` und `editor-vehicle`.
- `heavy-diagnostic` nur fuer bestehende schwere Cluster oder expliziten Diagnosebedarf; neue Features sollen nicht dort starten.
- Waehrend Folgearbeit wird immer der leichteste fachlich passende Layer gewaehlt und nur bei ungedecktem Restrisiko hochgezogen.

## Trigger

- `node-contract` zuerst fuer `src/modes/**`, `src/hunt/**`, `src/entities/ai/**`, `src/state/training/**`, `src/shared/contracts/**`, Menu-/Storage-/Capability-Adapter und andere browserunabhaengige Vertragslogik.
- `desktop-smoke` fuer App-Load, kritische Menuepfade, Matchstart, Return-to-Menu und andere Desktop-Hauptprodukt-Signale.
- `desktop-e2e` fuer gezielte Desktop-Lifecycle-, Session-, Runtime-, Recording- oder Plattform-Integrationen, die ueber den Smoke-Kern hinausgehen.
- `browser-compat` fuer kleinere Playwright-Slices mit echter Browser-Abhaengigkeit, etwa DOM, Browser-APIs, degradierte Web-Fallbacks oder fokussierte Surface-Routen.
- Der volle Editor-Map-Surface bleibt separat auf `npm run test:editor-ui` mit `playwright.editor.config.mjs`, statt in `desktop-e2e` oder `browser-compat` zu landen.
- `heavy-diagnostic` nur fuer GPU, Stress, Legacy-Regressionen, Physics-/Bot-Cluster, Diagnostik oder gezielte Trainings-Integrationen.

## Rollout

- Stufe 1: Teure Low-Value-Playwright-Vertraege werden in `node:test` verschoben.
- Stufe 2: `tests/core.spec.js` bildet den kleinen `desktop-smoke`; produktnahe `core-targeted*`-Slices bleiben selektives `desktop-e2e`, Browser-Demo- und Web-API-Faelle liegen separat in `browser-compat`.
- Stufe 3: CI und Abschluss-Gates fahren Guards plus `node-contract` plus `desktop-smoke`; breitere Desktop-, Browser- oder Diagnosepfade werden nur scopespezifisch ergaenzt.

## Rueckfallpfad

- Wenn ein ausgelagerter Vertrag doch Browser-Abhaengigkeiten zeigt, wandert nur dieser Fall in `browser-compat`, nicht zurueck in den Desktop-Smoke.
- Wenn `desktop-smoke` ein wichtiges Produktsignal verpasst, wird zuerst dieser kleine Kern erweitert; `desktop-e2e` bleibt fuer echte Mehrschritt- oder Integrationsrisiken reserviert.
- Surface-spezifische Editor-Faelle bleiben vorzugsweise auf `test:editor-ui` oder einem fokussierten `browser-compat` statt in die breite Desktop-Runtime-Suite zurueckzurutschen.
- Diagnostik und Legacy-Suites bleiben vorhanden, aber ausserhalb des Default-Pfads, damit sie bei Bedarf sofort reaktivierbar sind.
