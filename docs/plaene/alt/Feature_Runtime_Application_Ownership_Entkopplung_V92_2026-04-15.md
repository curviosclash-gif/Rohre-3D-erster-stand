# Feature: Runtime-Application-Ownership-Entkopplung und Orchestrator-Zuschnitt (V92)

Stand: 2026-04-15
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V92.md`

## Ziel

Die nach `V91` verbleibenden Architektur-Hotspots gezielt abbauen, damit neue Produkt- und Gameplay-Arbeit nicht wieder in `GameRuntimeFacade`, `MatchFlowUiController`, breite `GameRuntimePorts`-Fallbacks oder globale Runtime-Surfaces hineinwaechst.

- `src/application/**` soll vom reinen Dispatcher-Vorhof zu einer echten Use-Case-Schicht fuer Runtime-Commands werden.
- `GameRuntimePorts` soll im migrierten Scope Commands, Snapshots und Capability-Pfade ohne Legacy-Fallbacks auf `game.runtimeFacade` oder `game.runtimeCoordinator` bereitstellen.
- `window.GAME_RUNTIME` und aehnliche globale Runtime-Surfaces sollen aus produktiven Pfaden verschwinden oder auf read-only Diagnostics reduziert werden.
- Folgeblocks `V64`, `V81`, `V82` und `V86` sollen dieselben Ownership-Grenzen konsumieren, statt die bekannten Orchestrator-Hotspots weiter aufzublasen.

## Desktop-first Scope

- Desktop-App bleibt die primaere Zielflaeche fuer Runtime-, Session-, UI- und Capability-Verbrauch.
- Browser-/Demo-Pfade werden nur dort angepasst, wo gemeinsame Contracts, Snapshots oder Capability-Resolver denselben Ownership-Schnitt brauchen.
- Kein browser-demo-first-Refactor; produktive Desktop-Pfade und gemeinsame Shared-Contracts bestimmen die Zielarchitektur.

## Nicht-Ziel

- Kein Multiplayer-Produktisierungsblock; LAN-/Online-Hauptpfade bleiben in `V64`.
- Kein Arcade-/Parcours-Featureblock; Progression, Leaderboard, Ghost und HUD-Ausbau bleiben in `V82`.
- Kein Developer-Tooling-Featureblock; Tuning-Window, Presets und F7-Flow bleiben in `V81`.
- Kein kosmetischer Rewrite grosser Dateien nur wegen Zeilenanzahl; Splits muessen Ownership, Contract- oder Snapshot-Ziele direkt verbessern.
- Kein Endnutzer-Redesign fuer Menues, HUD oder Browser-Demo.

## Betroffene Dateien und Bereiche

- `src/application/session-runtime/SessionRuntimeCommandExecutor.js`
- `src/application/session-runtime/MenuLobbyServiceFactory.js`
- `src/application/session-runtime/NetworkLobbyService.js`
- `src/application/session-runtime/StorageLobbyService.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/runtime/GameRuntimeCoordinator.js`
- `src/shared/runtime/GameRuntimePorts.js`
- `src/core/AppInitializer.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/PauseOverlayController.js`
- `src/ui/HudRuntimeSystem.js`
- `src/state/RoundStateTickSystem.js`
- `src/platform/**`
- `src/shared/contracts/PlatformCapabilityRegistry.js`
- `src/shared/contracts/SessionRuntimeCommandContract.js`
- `src/shared/contracts/SessionRuntimeSnapshotContract.js`
- `scripts/architecture-report.mjs`
- `scripts/check-architecture-boundaries.mjs`
- `scripts/check-architecture-ratchet.mjs`
- `tests/lifecycle-capability.contract.test.mjs`
- `tests/runtime-regressions.contract.test.mjs`
- `docs/referenz/ai_architecture_context.md`
- `.agents/test_mapping.md`

## Definition of Done

- [ ] DoD.1 `src/application/**` besitzt fuer den migrierten Scope die Runtime-Use-Cases hinter `start_match`, `return_to_menu`, `host_lobby`, `join_lobby` und `apply_settings`; der Executor bleibt ein schmaler Normalisierungs-, Observability- und Dispatch-Adapter.
- [ ] DoD.2 `GameRuntimePorts` liefert im migrierten Scope Commands, Snapshots und Projektionen ohne produktive Fallbacks auf `game.runtimeFacade`, `game.runtimeCoordinator` oder andere breite Legacy-Surfaces.
- [ ] DoD.3 `window.GAME_RUNTIME`, `GAME_INSTANCE` und aehnliche globale Runtime-Handles sind kein produktiver Zugriffspfad mehr; verbleibende Debug-Surfaces sind explizit read-only oder blockerfest dokumentiert.
- [ ] DoD.4 `GameRuntimeFacade` und `MatchFlowUiController` sind im betroffenen Scope sichtbar schmaler geschnitten; neue Fachlogik landet nicht mehr in diesen Sammelmodulen.
- [ ] DoD.5 Architektur-Guards, Referenzdoku und Folgeblock-Leitplanken (`V64`, `V81`, `V82`, `V86`) spiegeln denselben Ownership- und Sunset-Stand.

## Einplanungslogik fuer Folgeblocks

- `V64` sollte `V92` vor produktiver Erweiterung von Multiplayer-Use-Cases konsumieren, weil Host-/Join-/Disconnect-Arbeit sonst erneut in Fassade, UI-Hotspots oder Legacy-Ports landet.
- `V81` sollte `V92` vor Runtime-Bridge-/IPC-Integration konsumieren, damit Developer-Tooling keine neuen globalen Runtime- oder Config-Backdoors reaktiviert.
- `V82` muss nicht voll blockiert werden: fruehe daten- und regelnahe Phasen (`82.1`, `82.2`, `82.10`) koennen parallel vorbereitet werden. UI-/HUD-/Overlay-nahe Ausbauten (`82.3`, `82.6`, `82.7`) sollten den Zuschnitt aus `92.4` jedoch konsumieren, bevor neue Last in `MatchFlowUiController` oder HUD-Hotspots landet.
- `V86` konsumiert `V92` vor allem als Leitplanke fuer Runtime- und Capability-Zugriffe; ein harter Blocker ist daraus nur fuer runtime-nahe Editor-Glue-Pfade abzuleiten.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V92`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V92.md`
- empfohlene Prioritaet: `P2`
- hard dependencies: `V91.99`
- soft dependencies: `V89.99`, `V77.99`
- empfohlene Reihenfolge: `V92` vor `V64` und `V81`; parallel zu fruehen datenlastigen Teilen von `V82` moeglich
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 92.1 Ownership-Schnitt und Zielpfade fixieren

- [ ] 92.1.1 Die verbleibenden Hotspots (`GameRuntimeFacade`, `MatchFlowUiController`, `GameRuntimePorts`, `window.GAME_RUNTIME`) gegen reale Aufrufer, Besitzgrenzen und Folgeblock-Risiken inventarisieren.
- [ ] 92.1.2 Fuer jeden Hotspot den Zielpfad ueber Application-Service, Snapshot, Port oder Diagnostics-only-Surface festlegen und im Architekturkontext spiegeln.

### 92.2 Application-Layer fuer Runtime-Commands materialisieren

- [ ] 92.2.1 Runtime-Use-Cases fuer `apply_settings`, `start_match`, `return_to_menu`, `host_lobby` und `join_lobby` in kleine Application-Services schneiden, sodass `SessionRuntimeCommandExecutor` nicht mehr direkt an breite Core-Runtime-Implementierungen gekoppelt ist.
- [ ] 92.2.2 Observability-, Result- und Failure-Vertraege (`executeSessionRuntimeCommandResult`) auf denselben Use-Case-Schnitt heben, ohne neue parallele Command-Pfade einzufuehren.

### 92.3 Legacy-Port- und Global-Surface-Sunset

- [ ] 92.3.1 `GameRuntimePorts` fuer den migrierten Scope von Legacy-Fallbacks auf `game.runtimeFacade` und `game.runtimeCoordinator` befreien oder diese Restadapter klar auf nicht-produktive Migrationsnischen begrenzen.
- [ ] 92.3.2 `window.GAME_RUNTIME`, `GAME_INSTANCE` und vergleichbare globale Runtime-Publishes auf read-only Diagnostics zurueckschneiden oder aus produktiven Pfaden entfernen.

### 92.4 Orchestrator-Hotspots aufteilen

- [ ] 92.4.1 `MatchFlowUiController` entlang von Verantwortung schneiden: Lifecycle-Intents, Arcade-/Overlay-Rendering und Telemetrie-/Feedback-Pfade sollen nicht weiter in einer Sammelklasse wachsen.
- [ ] 92.4.2 `GameRuntimeFacade` auf schmale Forwarding-, Composition- oder Legacy-Adapter-Rollen reduzieren; Arcade-, Recording-, Session- oder Multiplayer-Unterfluesse landen in expliziten Diensten statt erneut in der Fassade.

### 92.5 Ratchet, Doku und Folgeblock-Verbrauch absichern

- [ ] 92.5.1 Architektur-Checks, Report oder Guard-Matrix so nachschaerfen, dass neue `runtimeFacade`-, `GAME_RUNTIME`-, Port-Fallback- oder App-Global-Bypaesse im migrierten Scope frueh auffallen.
- [ ] 92.5.2 Referenzdoku, Test-Mapping und Folgeblock-Leitplanken fuer `V64`, `V81`, `V82` und `V86` auf denselben Ownership- und Sunset-Stand spiegeln.

### 92.99 Abschluss-Gate

- [ ] 92.99.1 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:ratchet`, `npm run typecheck:architecture`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind fuer den betroffenen Scope gruensicher.
- [ ] 92.99.2 Die dokumentierten Hotspots sind fuer den migrierten Scope reduziert oder klar als Restadapter markiert; neue Produktarbeit auf `V64`, `V81`, `V82` und `V86` braucht keine neuen Legacy-Backdoors.

## Risiken

- R1 | hoch | Ein zu frueher Sunset von Runtime- oder Debug-Surfaces bricht bestehende Tooling-, Test- oder Diagnosepfade.
- R2 | hoch | Der Block vermischt sich mit `V64` oder `V82`, wenn Produkt- oder Gameplay-Featurearbeit nicht sauber von Ownership-Schnitten getrennt bleibt.
- R3 | mittel | Ein halbherziger Split erzeugt nur neue Dateigrenzen, aber keine echte Ownership-Verbesserung.
- R4 | mittel | `V81` oder spaetere Runtime-Config-Arbeit reaktivieren globale Config- oder Runtime-Slots, wenn Bridge-/Store-Grenzen nicht frueh genug festgezogen werden.
