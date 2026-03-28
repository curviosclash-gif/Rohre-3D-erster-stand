# Feature: Architektur- und Totcode-Konsolidierung nach Audit (V60)

Stand: 2026-03-26
Status: In Arbeit
Owner: Bot-Codex

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
- `src/network/InputDelayBuffer.js` (remove)
- `src/network/RemoteInputSource.js` (remove)
- `src/network/SpectatorInputSource.js` (remove)
- `src/core/replay/ReplayPlayer.js` (remove)
- `src/ui/menu/testing/**` (test-only harness, nicht aktiver Runtime-Pfad)
- `server/**`, `electron/**`, `trainer/**` (nur fuer Tooling-/Dead-Code-Abdeckung)

## Leitentscheidungen

- Kein Modul wird nur auf Basis eines Tool-Reports geloescht; jede Entfernung braucht einen Runtime-/Test-Beleg.
- V58/V59 bleiben die Vorbedingung fuer produktive Restarbeiten an MediaRecorder, Logger und Netzwerk-Pfaden.
- Neue Umbauten sollen bestehende Helper-/Service-Splits abschliessen, nicht eine dritte Abstraktionsebene erzeugen.

## Phasenplan

- [x] 60.1 Guard- und Tooling-Verlaesslichkeit
  - [x] 60.1.1 `Logger.js` plus Architektur-Typecheck-Basis so anpassen, dass `npm run typecheck:architecture` wieder gruen ist und `prebuild` nicht mehr an einem bekannten Guard-Bruch scheitert.
  - [x] 60.1.2 `knip.json` auf reale Projektbereiche und Entry-Points erweitern; dokumentierte False Positives aus dem Audit entfernen.

- [x] 60.2 Dormante Runtime-Pfade konsolidieren
  - [x] 60.2.1 Input-/Lobby-/Replay-Altpfade inventarisieren und je Modulgruppe als `remove`, `rewire` oder `keep-with-contract` entscheiden.
  - [x] 60.2.2 Die test-only Multiplayer-UI entweder in den aktiven Runtime-Pfad integrieren oder sauber aus dem Hauptpfad entfernen und per Characterization absichern.

- [ ] 60.3 Zielarchitektur fuer Rest-Orchestratoren fixieren
  - [x] 60.3.1 Zielgrenzen zwischen `Game`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` dokumentieren.
  - [x] 60.3.2 Decomposition-Roadmap fuer `MediaRecorderSystem`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` in kleine, testbare Folgeschritte zerlegen.
  - [ ] 60.3.3 Session-Typ-Bruch `multiplayer` vs. echte Runtime-Transporte `lan`/`online` aufloesen und den Storage-Bridge-Pfad explizit als Mock/Test-Helfer oder Vorstufe kennzeichnen.

- [x] 60.4 Multiplayer-Menue-Vertraege und UI-Wiring konsolidieren
  - [x] 60.4.1 `MenuMultiplayerBridge.js` und `menu/multiplayer/MenuMultiplayerBridgeMutations.js` so haerten, dass `host()` nur bei persistiertem Snapshot Erfolg meldet und `join()` die `maxPlayers`-Grenze mit einem konsistenten Fehlercontract erzwingt.
  - [x] 60.4.2 `MenuController.js`, `MenuGameplayBindings.js`, `MenuDevPanelBindings.js` und `MenuMultiplayerPanel.js` auf einen aktiven Runtime-Pfad reduzieren: doppelte `multiplayer_host`-/`multiplayer_join`-Bindings entfernen und Discovery-Rendering auf sichere DOM-APIs ohne `innerHTML` umstellen.

- [ ] 60.99 Integrations- und Abschluss-Gate
  - [ ] 60.99.1 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind PASS.
  - [ ] 60.99.2 Backlog, Ownership, Lock-Status und Verifikationsstrategie sind mit dem umgesetzten Scope synchron.

## Verifikationsstrategie

- Governance: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Architektur: `npm run architecture:guard`, `npm run typecheck:architecture`
- Dead-Code-Qualitaet: `npx knip --config knip.json --no-progress`
- Scope-spezifische Tests: `npm run build`, `npm run test:core -g T41*`, danach `npm run test:core` und `npm run test:stress`

## Dormant-Pfad-Inventar (2026-03-28)

| Modulgruppe | Entscheidung | Evidence |
| --- | --- | --- |
| `src/core/input/**` | `keep-with-contract` | Aktiver Pfad in `MatchInputSourceResolver.js` nutzt nur lokale Keyboard-/Gamepad-/Touch-Sources; `PlayerInputSource` bleibt als Basisvertrag |
| `src/core/lobby/**`, `src/network/LANMatchLobby.js`, `src/network/OnlineMatchLobby.js` | `keep-with-contract` | LAN/Online/Local-Lobby-Typen bilden weiterhin die expliziten Transport- und Testvertraege; `tests/network-adapter.spec.js` deckt LAN-/Online-Basisverhalten ab |
| `src/network/RemoteInputSource.js`, `src/network/SpectatorInputSource.js`, `src/network/InputDelayBuffer.js`, `src/core/replay/ReplayPlayer.js` | `remove` | Keine produktiven Import-/Call-Sites mehr; nur historische Doku-Kommentare verblieben |
| `src/ui/menu/testing/**` | `remove-from-runtime / keep-for-tests` | `MenuMultiplayerPanel` und `MenuLobbyRenderer` haengen nur an `tests/core.spec.js` und liegen jetzt explizit ausserhalb des aktiven Menuepfads |

## Zielbild Rest-Orchestratoren (2026-03-28)

- `Game` bleibt App-Shell fuer globale Lifecycle-Ereignisse, Toaster, DOM-Root und Bootstrapping.
- `GameRuntimeFacade` bleibt die einzige Runtime-Schicht, die Menu-Events auf Services, Session-State und Matchstart abbildet.
- `MatchFlowUiController` bleibt fuer Validierung, Start/Abbruch und UI-nahe Match-Transitions zustaendig, aber nicht fuer Lobby-Synchronisation.
- `MenuMultiplayerBridge` bleibt ein menue-lokaler Snapshot-/CAS-Koordinator fuer Mock/Test- und Pre-Session-Flows, nicht der dauerhafte Netzwerk-Transport.

## Decomposition-Roadmap (2026-03-28)

1. `GameRuntimeFacade`: Session-Typ-Mapping (`multiplayer` -> `lan`/`online`) als eigenen Runtime-Service extrahieren und am Matchstart zentral erzwingen.
2. `MenuMultiplayerBridge`: Storage-/BroadcastChannel-Bridge hinter einen expliziten Test-/Mock-Adapter verschieben; produktive Transportpfade nur noch ueber echte Lobby-Services.
3. `MatchFlowUiController`: Start-Validierung auf einen transportneutralen Session-Contract umstellen, damit `lan`, `online` und Mock-Lobby denselben Gate nutzen.
4. `MediaRecorderSystem`: verbleibende UI-/Lifecycle-Verkabelung in V58/V59-Restschritten weiter verkleinern; kein neuer Wrapper in V60.

## Risiko-Fokus

- Falsch-positive Dead-Code-Loeschungen in experimentellen oder serverseitigen Pfaden
- Guard-Fixes mit seitlichen Effekten auf Dev-/Prod-Logging
- Weitere Wrapper-Schichten statt echter Decomposition
- Multiplayer-Menuepfade lassen weiter doppelte Events oder falsche Erfolgszustande zu, wenn aktiver und dormant Pfad nicht sauber getrennt werden
- Session-Typ-Mapping bleibt bis `60.3.3` ein offener Architekturrest; der Storage-Bridge-Pfad ist bewusst noch kein echter `lan`/`online`-Transport
