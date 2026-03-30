# Feature Architektur-Runtime-Entkopplung V74

Stand: 2026-03-31
Status: Geplant
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die verbleibenden Architektur-Leaks zwischen `Game`, `GameRuntimeFacade`, `MatchFlowUiController`, Match-Session-State, globaler Runtime-Konfiguration und `EntityManager` systematisch abbauen, sodass die Runtime ueber explizite Ports, eindeutige Lifecycle-Einstiegspunkte und stabile State-/Transport-Vertraege statt ueber ein implizites `game`-God-Object gekoppelt ist.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V74`
- Hard dependencies: `V58.99` bleibt die Guard-/Budget-Baseline fuer Architekturgrenzen; `V60.3` bleibt das dokumentierte Zielbild fuer Rest-Orchestratoren und muss bei der Intake als Referenz mitgefuehrt werden.
- Soft dependencies: `V70` ist fuer Settings-/Preset-Pfade relevant, weil `GameRuntimeFacade` und Start-/Menue-Flows weiter Settings-Mutationen beruehren; Multiplayer-/Arcade-Pfade aus `V67` und `V68` muessen bei Lifecycle-Refactors mitgeprueft werden.
- Datei-Ownership: Im aktuellen Masterplan ist fuer die Kernpfade kein aktiver Lock ersichtlich; historische Ownership aus `V58` und `V70` ist abgeschlossen.
- Hinweis: Manuelle Uebernahme erforderlich.

## Ausgangslage

- Die Import-Grenzen sind formal gruen, aber zentrale Runtime-Objekte werden weiterhin breit ueber `game.*` mutiert und konsumiert.
- `GameBootstrap` haengt Renderer, Audio, HUD, Controller, Bridges und Runtime-Hilfen direkt an dasselbe Objekt; `GameRuntimeFacade` mutiert anschliessend weitere Laufzeitfelder und Menue-/Session-Referenzen.
- `GameRuntimeFacade` und `MatchFlowUiController` bilden aktuell einen bidirektionalen Orchestrierungszyklus; mehrere private `_...`-Methoden sind de facto stabile Fremdvertraege.
- `MatchLifecycleSessionOrchestrator` nutzt den kompletten Runtime-Kontext statt eines kleinen Session-Ports und verwirft bei Session-ID-Mismatch bereits initialisierte Sessions ohne explizites Cleanup.
- `EntityManager` haengt fuer Modus-/Runtime-Aufloesung noch an `src/core/Config.js` und `ActiveRuntimeConfigStore`, statt seine Runtime-Konfiguration ausschliesslich ueber explizite Setup-Vertraege zu erhalten.
- `CONFIG` ist ueber `ActiveRuntimeConfigStore` ein globaler Prozesszustand; zahlreiche Entity-, Hunt- und Arena-Pfade lesen Laufzeitwerte indirekt aus diesem globalen Store statt aus der aktiven Match-Session.
- `GameRuntimePorts` kapselt die Runtime nicht wirklich, sondern delegiert mehrfach direkt zurueck auf `game`, `matchFlowUiController` und `sessionOrchestrator`; damit bleibt die Kopplung hinter einer scheinbaren Port-Schicht erhalten.
- Return-to-Menu ist aktuell auf mehrere Pfade verteilt (`GameRuntimeFacade.returnToMenu`, `MatchFlowUiController.returnToMenu`, `PauseOverlayController.returnToMenuFromPause`, `RoundStateTickSystem`), wodurch Exit-Hooks wie Arcade-Reset und Match-Prewarm nicht konsistent an einem einzigen Oeffnungspunkt haengen.
- `MediaRecorderSystem.dispose()` beendet offene Stop-/Finalize-Pfade nicht deterministisch; ein laufender `stopRecording()`-Promise kann dadurch orphanen, wenn Recorder-Dispose waehrend eines Stop- oder Match-Teardown-Pfads ausgeloest wird.
- Das Menue verwendet `multiplayer` als Host/Join-Vertrag, waehrend die Match-Runtime in diesem Modus bewusst nur `LocalSessionAdapter` startet; der Storage-Bridge-Pfad ist damit eher Koordinations- oder Mock-Transport als echter Multiplayer-Laufzeitvertrag.
- Core- und State-Pfade tragen weiterhin UI-/DOM- und Contract-Drift: `GameLoop` und `RuntimeDiagnosticsSystem` erzeugen DOM direkt, und Lifecycle-/Round-State-Pfade nutzen rohe State-Strings parallel zu `GAME_STATE_IDS`.
- Die groessten Rest-Orchestratoren bleiben `src/core/GameRuntimeFacade.js`, `src/ui/MatchFlowUiController.js`, `src/core/MediaRecorderSystem.js` und `src/core/arcade/ArcadeRunRuntime.js`; fuer diesen Block steht die Kopplungsreduktion im Start-/Match-/Return-Pfad im Vordergrund.

## Betroffene Pfade (geplant)

- `src/core/main.js`
- `src/core/Config.js`
- `src/core/GameBootstrap.js`
- `src/core/GameLoop.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/MatchSessionRuntimeBridge.js`
- `src/core/MediaRecorderSystem.js`
- `src/core/RuntimeDiagnosticsSystem.js`
- `src/core/RuntimeErrorOverlay.js`
- `src/core/RuntimeConfig.js`
- `src/core/runtime/RuntimeSessionLifecycleService.js`
- `src/core/runtime/ActiveRuntimeConfigStore.js`
- `src/core/runtime/MenuRuntimeMultiplayerService.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/PauseOverlayController.js`
- `src/ui/menu/MenuMultiplayerBridge.js`
- `src/state/MatchLifecycleSessionOrchestrator.js`
- `src/state/MatchSessionFactory.js`
- `src/state/RoundStateTickSystem.js`
- `src/state/match-session/MatchSessionSetupOps.js`
- `src/entities/EntityManager.js`
- `src/entities/Trail.js`
- `src/entities/Powerup.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/arena/portal/PortalLayoutBuilder.js`
- `src/entities/runtime/EntityRuntimeContext.js`
- `src/hunt/HealthSystem.js`
- `src/hunt/RespawnSystem.js`
- `src/core/session/LocalSessionAdapter.js`
- `src/shared/runtime/GameRuntimePorts.js`
- `src/shared/contracts/MatchLifecycleContract.js`
- `src/shared/contracts/GameStateIds.js`
- `tests/core.spec.js`
- `tests/stress.spec.js`
- `scripts/architecture-report.mjs`
- `scripts/check-architecture-boundaries.mjs`
- `scripts/check-architecture-metrics.mjs`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done (DoD)

- [ ] DoD.1 `GameBootstrap`, `GameRuntimeFacade` und `MatchSessionRuntimeBridge` erzeugen und verdrahten Runtime-Abhaengigkeiten ueber explizite Bundles/Ports statt ueber breit verteilte `game.*`-Mutation als Default-Muster.
- [ ] DoD.2 `ActiveRuntimeConfigStore` ist entweder klar als Uebergangsadapter isoliert oder aus den betroffenen Entity-/Hunt-/Arena-Pfaden herausgedraengt; Match-Lifecycle und Tests koennen Runtime-Konfiguration deterministisch ohne globalen Restzustand setzen und zuruecksetzen.
- [ ] DoD.3 Der Match-Start-/Pause-/Return-Pfad zwischen Core und UI hat einen klaren Richtungssinn; `MatchFlowUiController` und `PauseOverlayController` rufen keine privaten Session-/Arcade-/Teardown-Interna der Facade mehr direkt auf, und Return-to-Menu laeuft ueber genau einen oeffentlichen Exit-Pfad.
- [ ] DoD.4 `MatchLifecycleSessionOrchestrator` arbeitet gegen einen kleinen Session-Lifecycle-Port; verworfene oder ersetzte Initialisierungen sowie Recorder-/Session-Stopps werden deterministisch aufgeraeumt.
- [ ] DoD.5 `EntityManager` und direkt benachbarte Entity-Runtime-Pfade lesen Modus-/Runtime-Informationen nicht mehr aus `src/core/**`-Globals oder dem `CONFIG`-Proxy, sondern aus expliziten Setup-/Contract-Parametern.
- [ ] DoD.6 Der Vertragsbruch zwischen Menue-`multiplayer`, Storage-Bridge und echter Match-Runtime ist aufgeloest oder explizit umbenannt/dokumentiert; State-IDs laufen konsistent ueber `GAME_STATE_IDS`, und Core-DOM-/Error-Overlays sind sauber in Runtime-/UI-Grenzen eingeordnet.
- [ ] DoD.7 Architektur-Guards und Metriken bilden die neue Baseline ab und lassen keine neuen Legacy-Ausnahmen fuer `ui -> core`, `entities -> core`, `constructor(game)`, globale Runtime-Stores oder private Cross-Layer-Ports entstehen.
- [ ] DoD.8 Match-, Multiplayer-, Arcade-, Recorder- und Pause-Lifecycle bleiben funktional stabil; relevante Regressionen fuer Start, Return-to-Menu, Session-Wechsel, Recorder-Stop und Storage-Bridge-Sonderfaelle sind durch Tests oder Smokes abgesichert.
- [ ] DoD.9 `docs/referenz/ai_architecture_context.md` und der externe Plan dokumentieren die neuen Verantwortungsgrenzen, Runtime-Vertraege und benannten Rest-Adapter nachvollziehbar.
- [ ] DoD.10 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und die direkt betroffenen Runtime-/Architektur-Checks sind gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 74.1 Runtime-Komposition und `game`-Mutation zurueckdruecken

- [ ] 74.1.1 Die in `GameBootstrap` erzeugten Runtime-Komponenten in ein explizites Bootstrap-/Runtime-Bundle ueberfuehren, damit `main.js` nicht mehr Dutzende lose Properties als impliziten API-Surface verwaltet.
- [ ] 74.1.2 `GameRuntimeFacade.applySettingsToRuntime()` und angrenzende Setup-Pfade so schneiden, dass abgeleitete Runtime-Werte (`runtimeConfig`, Session-Daten, aktive Controller) in klaren Stores/Ports landen statt breit auf dem Root-Objekt zu verstreuen.
- [ ] 74.1.3 Bestehende Backward-Compat-Wrapper in `Game` inventarisieren und in `keep`, `replace-by-port` oder `remove-after-migration` klassifizieren, damit weitere Refactors nicht an stillen Aliasen haengen.
- [ ] 74.1.4 Den globalen `CONFIG`-/`ActiveRuntimeConfigStore`-Pfad inventarisieren und fuer den Lifecycle explizit machen: klare Set-/Clear-Semantik, dokumentierter Uebergangsadapter und keine stillen Match-Reste zwischen Tests, Matches oder `Game`-Instanzen.

### 74.2 Core/UI-Orchestrierungszyklus aufloesen

- [ ] 74.2.1 Einen expliziten Match-Lifecycle-Port zwischen Runtime-Core und UI definieren, sodass `GameRuntimeFacade` keine UI-Controller direkt antreibt und `MatchFlowUiController` keine privaten Facade-Interna `_initSession`, `_waitForAllPlayersLoaded`, `_teardownSession` oder `_startArcadeRunIfEnabled` mehr aufruft.
- [ ] 74.2.2 Start-, Round-, Pause- und Return-to-Menu-Flows in klar getrennte Verantwortlichkeiten schneiden: UI steuert Darstellung und Nutzereingaben, Runtime-Core steuert Session-/Arcade-/Netzwerk-Lifecycle.
- [ ] 74.2.3 Direkte Privatmethodenaufrufe aus Bootstrap in UI-Controller (`_setupPauseOverlayListeners`) durch explizite Public-Ports oder Initializer ersetzen, damit Bootstrap nur noch definierte Vertraege nutzt.
- [ ] 74.2.4 Die vorhandene Port-Schicht (`GameRuntimePorts`) auf echte Richtungstreue pruefen und Rueckgriffe auf `game`, `matchFlowUiController` oder `sessionOrchestrator` aus den Ports entfernen; Ports sollen Vertragsanbieter sein, keine getarnten Alias-Weiterleitungen.
- [ ] 74.2.5 Einen einzigen oeffentlichen Return-to-Menu-Entry-Point definieren und alle Round-End-, Pause-, Fehler- und Hotkey-Pfade darauf konsolidieren, damit Arcade-Reset, Match-Prewarm, Input-Cleanup und Session-Teardown nicht auseinanderlaufen.

### 74.3 Match-Session-Lifecycle und Stale-Cleanup haerten

- [ ] 74.3.1 `MatchLifecycleSessionOrchestrator` von einem Vollzugriff auf `runtime/game` auf ein kleines Dependency-Objekt oder Session-Port umstellen, das nur die fuer Match-Initialisierung, Round-Reset und Teardown notwendigen Operationen enthaelt.
- [ ] 74.3.2 Den Session-ID-Guard so erweitern, dass verworfene `initializeMatchSession()`-Ergebnisse aktiv disposed werden und keine Arena-, Entity-, Particle- oder Camera-Reste im Renderer oder Runtime-Bridge-Zustand verbleiben.
- [ ] 74.3.3 Fuer Matchstart, Abbruch waehrend Async-Init, Multiplayer-Load-Gate und Return-to-Menu deterministische Cleanup- und Error-Pfade definieren, damit Lifecycle-Races nicht mehr nur durch `_startMatchPromise` maskiert werden.
- [ ] 74.3.4 `MediaRecorderSystem` in den Lifecycle einschliessen: offene `stopRecording()`-/Finalize-Promises muessen bei Dispose, Session-Abbruch oder Return-to-Menu deterministisch abgeschlossen werden, statt in orphaned Pending-States zu enden.

### 74.4 Entity-Runtime von Core-Globals loesen

- [ ] 74.4.1 `EntityManager` so umbauen, dass Modus, Bot-Policy, Runtime-Config und aktive Strategie ausschliesslich ueber Setup-/Factory-Parameter oder dedizierte Contracts gesetzt werden und keine `src/core/**`-Imports fuer aktive Runtime-Entscheidungen mehr benoetigt werden.
- [ ] 74.4.2 `ActiveRuntimeConfigStore`-Abhaengigkeiten in Entity-/Mode-Pfaden inventarisieren und auf lokale Runtime-Kontexte oder `shared/contracts` umstellen, damit `entities` isoliert instanziierbar und testbarer wird.
- [ ] 74.4.3 Den Entity-Setup-Pfad in `MatchSessionFactory` und benachbarten Setup-Ops auf die neuen Contracts umstellen und dabei klar dokumentieren, welche Werte pro Match-Session, pro Round und pro Player gelten.
- [ ] 74.4.4 Die direkten `CONFIG`-/Proxy-Leser in `Trail`, `Powerup`, Projectile-, Portal- und Hunt-Pfaden priorisieren und schrittweise auf explizite Runtime-Inputs umstellen, damit Match-spezifische Konfiguration nicht mehr als globaler Ambient-State in die Simulation einsickert.

### 74.5 Vertragsklarheit, Guard-Ratchet, Tests und Dokumentation

- [ ] 74.5.1 Den Vertragsbruch zwischen Menue-`multiplayer`, Storage-Bridge und Match-Runtime explizit aufloesen: entweder durch klares Renaming/Scoping des Storage-Bridge-Modus oder durch einen echten, zur Runtime passenden Transportvertrag.
- [ ] 74.5.2 State-IDs und Lifecycle-Contracts vereinheitlichen: rohe String-Zustaende (`'MENU'`, `'PLAYING'`, `'ROUND_END'`, ...) durch `GAME_STATE_IDS` bzw. klare Contract-Helfer ersetzen und Drift zwischen Core, State und UI abbauen.
- [ ] 74.5.3 Core-DOM-/Overlay-Verantwortung inventarisieren (`GameLoop`, `RuntimeDiagnosticsSystem`, Fehler-Overlay) und entscheiden, was in UI/Debug-Infrastruktur wandert und was als klar markierter Runtime-Debug-Adapter bestehen bleiben darf.
- [ ] 74.5.4 Architektur-Reports und Boundary-/Metrics-Checks um die neue Baseline nachziehen, damit private Cross-Layer-Vertraege, `entities -> core`-Reste, globale Runtime-Store-Abhaengigkeiten oder neue `constructor(game)`-Legacy-Pfade nicht erneut still wachsen.
- [ ] 74.5.5 Gezielte Regressionstests oder Smokes fuer Matchstart, Session-Abbruch, Return-to-Menu, Multiplayer-Load-Gate, Recorder-Stop/Dispose und Entity-Setup ohne Core-Globals ergaenzen.
- [ ] 74.5.6 Die Architektur-Referenz, insbesondere das Zielbild fuer `Game`, `GameRuntimeFacade`, `MatchFlowUiController`, Session-Orchestrierung, Runtime-Config-Lebenszyklus und Entity-Runtime, auf den neuen Zustand aktualisieren.

### 74.99 Integrations- und Abschluss-Gate

- [ ] 74.99.1 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics` und die direkt betroffenen Runtime-Tests/Smokes sind fuer den Scope gruen.
- [ ] 74.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; verbleibende Rest-Hotspots ausserhalb des Block-Scopes sind dokumentiert, bevor `74.99` geschlossen wird.

## Verifikationsstrategie

- Architektur-Baseline: `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics`
- Runtime-/Lifecycle-Regression: `TEST_PORT=<port> PW_RUN_TAG=v74-core PW_OUTPUT_DIR=test-results/v74-core npm run test:core`
- Bei Lifecycle-/Race-Haertung: `npm run test:stress`
- Plan-/Dokugates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`

## Risiko-Register V74

- `R1 | high |` Eine Entkopplung von `GameRuntimeFacade` und `MatchFlowUiController` kann Matchstart, Pause, Return-to-Menu und Multiplayer-Lobby gleichzeitig brechen.
  - Mitigation: Start-/Return-Pfad in kleine Ports schneiden und jede Etappe mit Runtime-Smokes absichern.
- `R2 | high |` Das Schliessen des Session-Race-Leaks kann unerwartete Dispose-Reihenfolgen im Renderer, Recorder oder bei Kameras offenlegen.
  - Mitigation: Cleanup-Pfade zentralisieren und Async-Abbruchfaelle explizit testen.
- `R3 | medium |` Das Zurueckdruecken von `game.*`-Mutation kann Legacy-Wrapper oder implizite Call-Sites in UI, Debug oder Tests brechen.
  - Mitigation: Wrapper zuerst inventarisieren, dann schrittweise durch Ports ersetzen und Uebergangsadapter klar markieren.
- `R4 | medium |` Eine Entkopplung von `EntityManager` von Core-Globals kann Modus- oder Bot-Initialisierung subtil veraendern.
  - Mitigation: aktive Runtime-Inputs pro Session explizit dokumentieren und Bot-/Mode-Regressionen gegen vorhandene Smokes pruefen.
- `R5 | medium |` Schaerfere Architektur-Guards koennen bestehende, bisher tolerierte Legacy-Pfade ploetzlich blockieren.
  - Mitigation: Ratchet nur mit klarer Zielbaseline anheben und jede neue Regel an einer bewusst migrierten Call-Site verifizieren.
- `R6 | medium |` Multiplayer- und Arcade-Sonderpfade sind besonders sensitiv, weil sie bereits Zusatzlogik in Facade und UI tragen.
  - Mitigation: Ports so schneiden, dass Singleplayer zuerst stabil bleibt und Multiplayer/Arcade ueber dieselben Lifecycle-Vertraege nachgezogen werden.
- `R7 | medium |` Das Zurueckdruecken des globalen Runtime-Config-Stores kann zahlreiche indirekte `CONFIG`-Leser zugleich beruehren.
  - Mitigation: zuerst Consumer-Inventar erstellen, dann die kritischsten Simulationspfade ueber explizite Setup-Inputs migrieren und den Store nur als klar markierten Uebergangsadapter behalten.
- `R8 | medium |` Eine echte Port-Schicht kann kurzfristig mehr Boilerplate erzeugen und Legacy-Aufrufer sichtbar brechen.
  - Mitigation: Ports klein und auf konkrete Use-Cases schneiden, keine generischen `getGame()`-Backdoors zulassen und Uebergangsadapter nur befristet tolerieren.
- `R9 | medium |` Das Bereinigen der `multiplayer`-Semantik kann UI-, QA- und Nutzererwartungen aendern, auch wenn technisch zunaechst wenig Code bewegt wird.
  - Mitigation: Vertragsklarheit frueh in Doku/UI-Texten herstellen und Storage-Bridge-Modus explizit benennen, bevor tiefere Runtime-Arbeit darauf aufsetzt.
- `R10 | medium |` Die Konsolidierung auf einen einzigen Return-to-Menu-Pfad kann verdeckte Sonderfaelle in Pause-, Fehler- und Round-End-Flows freilegen.
  - Mitigation: alle aktuellen Exit-Call-Sites inventarisieren und die Konsolidierung mit gezielten Smokes fuer jeden Exit-Typ absichern.
- `R11 | low |` Das Entfernen roher State-Strings und Core-DOM-Debugpfade kann Debugging kurzfristig unbequemer machen, wenn kein Ersatz bereitsteht.
  - Mitigation: Debug-/Overlay-Funktionen nicht ersatzlos entfernen, sondern bewusst in UI-/Debug-Infrastruktur mit klaren Contracts ueberfuehren.
