# Feature: Architektur- und Totcode-Konsolidierung nach Audit (V60)

Stand: 2026-03-26
Status: Offen
Owner: -

## Ziel

Die Audit-Folge zu Architektur und Totcode konsolidiert vier offene Restthemen nach den laufenden Bloecken V58 und V59:

- Architektur-Gates wieder voll belastbar machen (`typecheck:architecture`, `prebuild`, `knip`).
- Dormante Input-/Lobby-/Replay-/Menu-Pfade belastbar als `remove`, `rewire` oder `keep-with-contract` entscheiden.
- Die verbliebene Doppel-Orchestrierung zwischen `Game`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` in ein stabiles Zielbild ueberfuehren.
- Multiplayer-Menue-/Bridge-Vertraege haerten: echte Erfolgssemantik, Max-Player-Gate, deduplizierte Button-Wiring-Pfade und sichere Discovery-Render-Pfade.

## Audit-Basis

- `npm run architecture:report`
- `npm run check:architecture:boundaries`
- `npm run check:architecture:metrics`
- `npm run typecheck:architecture`
- `npx knip --config knip.json --no-progress`

Kernausloeser:

- `Logger.js` blockiert aktuell den Architektur-Typecheck.
- `knip.json` hat Blindspots (`server/**`, `electron/**`, `trainer/**`, `tests/**/*.mjs`) und liefert deshalb vermeidbare False Positives.
- Mehrere Input-/Multiplayer-/Replay-Module sind dormant oder nur noch test-only angebunden.
- Der Multiplayer-Menuepfad hat offene Folgebefunde: doppelte Host/Join-Bindings, fehlendes `maxPlayers`-Gate, Erfolg ohne Persistenz und unsicheres Discovery-Rendering.
- Die Rest-Orchestrierung ist trotz frueherer Decomposition weiter zu breit.

## Betroffene Dateien (Soll-Scope)

- `knip.json`
- `src/shared/logging/Logger.js`
- `src/core/main.js`
- `src/core/GameRuntimeFacade.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/MenuController.js`
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/menu/MenuDevPanelBindings.js`
- `src/ui/menu/multiplayer/MenuMultiplayerBridgeMutations.js`
- `src/ui/menu/MenuMultiplayerBridge.js`
- `src/ui/MatchInputSourceResolver.js`
- `src/core/input/**`
- `src/core/lobby/**`
- `src/network/InputDelayBuffer.js`
- `src/network/RemoteInputSource.js`
- `src/network/SpectatorInputSource.js`
- `src/core/replay/ReplayPlayer.js`
- `src/ui/menu/MenuMultiplayerPanel.js`
- `src/ui/menu/MenuLobbyRenderer.js`
- `server/**`, `electron/**`, `trainer/**` (nur fuer Tooling-/Dead-Code-Abdeckung)

## Leitentscheidungen

- Kein Modul wird nur auf Basis eines Tool-Reports geloescht; jede Entfernung braucht einen Runtime-/Test-Beleg.
- V58/V59 bleiben die Vorbedingung fuer produktive Restarbeiten an MediaRecorder, Logger und Netzwerk-Pfaden.
- Neue Umbauten sollen bestehende Helper-/Service-Splits abschliessen, nicht eine dritte Abstraktionsebene erzeugen.

## Phasenplan

- [ ] 60.1 Guard- und Tooling-Verlaesslichkeit
  - [ ] 60.1.1 `Logger.js` plus Architektur-Typecheck-Basis so anpassen, dass `npm run typecheck:architecture` wieder gruen ist und `prebuild` nicht mehr an einem bekannten Guard-Bruch scheitert.
  - [ ] 60.1.2 `knip.json` auf reale Projektbereiche und Entry-Points erweitern; dokumentierte False Positives aus dem Audit entfernen.

- [ ] 60.2 Dormante Runtime-Pfade konsolidieren
  - [ ] 60.2.1 Input-/Lobby-/Replay-Altpfade inventarisieren und je Modulgruppe als `remove`, `rewire` oder `keep-with-contract` entscheiden.
  - [ ] 60.2.2 Die test-only Multiplayer-UI entweder in den aktiven Runtime-Pfad integrieren oder sauber aus dem Hauptpfad entfernen und per Characterization absichern.

- [ ] 60.3 Zielarchitektur fuer Rest-Orchestratoren fixieren
  - [ ] 60.3.1 Zielgrenzen zwischen `Game`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` dokumentieren.
  - [ ] 60.3.2 Decomposition-Roadmap fuer `MediaRecorderSystem`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` in kleine, testbare Folgeschritte zerlegen.

- [ ] 60.4 Multiplayer-Menue-Vertraege und UI-Wiring konsolidieren
  - [ ] 60.4.1 `MenuMultiplayerBridge.js` und `menu/multiplayer/MenuMultiplayerBridgeMutations.js` so haerten, dass `host()` nur bei persistiertem Snapshot Erfolg meldet und `join()` die `maxPlayers`-Grenze mit einem konsistenten Fehlercontract erzwingt.
  - [ ] 60.4.2 `MenuController.js`, `MenuGameplayBindings.js`, `MenuDevPanelBindings.js` und `MenuMultiplayerPanel.js` auf einen aktiven Runtime-Pfad reduzieren: doppelte `multiplayer_host`-/`multiplayer_join`-Bindings entfernen und Discovery-Rendering auf sichere DOM-APIs ohne `innerHTML` umstellen.

- [ ] 60.99 Integrations- und Abschluss-Gate
  - [ ] 60.99.1 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind PASS.
  - [ ] 60.99.2 Backlog, Ownership, Lock-Status und Verifikationsstrategie sind mit dem umgesetzten Scope synchron.

## Verifikationsstrategie

- Governance: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Architektur: `npm run architecture:guard`, `npm run typecheck:architecture`
- Dead-Code-Qualitaet: `npx knip --config knip.json --no-progress`
- Scope-spezifische Tests erst nach Modulentscheidung (`remove` vs. `rewire`) und betroffenen Pfaden selektieren

## Risiko-Fokus

- Falsch-positive Dead-Code-Loeschungen in experimentellen oder serverseitigen Pfaden
- Guard-Fixes mit seitlichen Effekten auf Dev-/Prod-Logging
- Weitere Wrapper-Schichten statt echter Decomposition
- Multiplayer-Menuepfade lassen weiter doppelte Events oder falsche Erfolgszustande zu, wenn aktiver und dormant Pfad nicht sauber getrennt werden
