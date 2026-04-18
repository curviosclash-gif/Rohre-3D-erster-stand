# Feature: Architektur-Follow-up Application Boundaries und Legacy-Surface-Reduktion (V96)

Stand: 2026-04-17
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V96.md`

## Ziel

Die nach `V91` und `V92` verbleibenden Architekturspannungen systematisch abbauen:

- `src/application/**` soll keine direkten UI- oder Core-Abhaengigkeiten mehr als Fachpfad besitzen.
- Core- und Application-Schicht sollen ohne zyklische Ownership arbeiten (Use-Case-first, Adapter-injiziert).
- Legacy-Surfaces (`game.runtimeBundle`, `game.runtimeFacade`, `window.GAME_INSTANCE`, `GameRuntimePorts`-Fallback-Helfer, `curviosApp` ausserhalb Plattformadaptern) sollen im migrierten Scope weiter reduziert werden.
- Architektur-Ratchet soll den Ist-Stand strenger einfrieren und neue Layer-Drifts frueh blockieren.

## Desktop-first Scope

- Desktop-App bleibt primaere Zieloberflaeche.
- Browser-Demo wird nur dort angepasst, wo Shared-Contracts und Plattformadapter denselben Boundary-Vertrag erzwingen.
- Kein Demo-first-Paritaetsausbau.

## Nicht-Ziel

- Kein Produktfeature-Block fuer Multiplayer-UX, Progression oder Editor-Funktionalitaet.
- Kein grossflaechiger Rewrite nur nach Dateigroesse ohne klaren Boundary-Nutzen.
- Kein neues paralleles Runtime- oder Contract-System neben bestehenden Shared-Contracts.

## Betroffene Dateien und Bereiche

- `src/application/session-runtime/NetworkLobbyService.js`
- `src/application/session-runtime/NetworkLobbyServiceSupport.js`
- `src/application/session-runtime/StorageLobbyService.js`
- `src/application/session-runtime/StorageLobbyServiceSupport.js`
- `src/application/session-runtime/SessionRuntimeCommandUseCases.js`
- `src/application/session-runtime/MenuLobbyServiceFactory.js`
- `src/core/runtime/MenuRuntimeMultiplayerService.js`
- `src/core/runtime/MatchFinalizeFlowService.js`
- `src/core/runtime/RuntimeCommandSettingsService.js`
- `src/shared/runtime/GameRuntimePorts.js`
- `src/state/RoundStateTickSystem.js`
- `src/core/MatchSessionRuntimeBridge.js`
- `src/entities/ai/ObservationBridgePolicy.js`
- `src/shared/contracts/PlatformCapabilityRegistry.js`
- `src/shared/contracts/PlatformSurfacePolicyOps.js`
- `src/platform/electron/**`
- `src/platform/browser/**`
- `scripts/architecture/ArchitectureConfig.mjs`
- `scripts/architecture/ArchitectureAnalysis.mjs`
- `scripts/architecture/architecture-budget-ratchet.json`
- `scripts/architecture/legacy-surface-guard-matrix.json`
- `scripts/check-architecture-boundaries.mjs`
- `scripts/check-architecture-ratchet.mjs`
- `scripts/check-architecture-metrics.mjs`
- `scripts/check-architecture-touched-strict.mjs`
- `docs/referenz/ai_architecture_context.md`
- `.agents/test_mapping.md`
- `docs/plaene/aktiv/V64.md`
- `docs/plaene/aktiv/V81.md`
- `docs/plaene/aktiv/V82.md`
- `docs/plaene/aktiv/V86.md`

## Definition of Done

- [ ] DoD.1 `src/application/**` besitzt im migrierten Scope keine direkten Imports aus `src/ui/**` oder `src/core/**` als Fachabhaengigkeit.
- [ ] DoD.2 Runtime-Use-Cases laufen ueber injizierte Adapter/Ports statt ueber direkte Core-Service-Imports in Application-Dateien.
- [ ] DoD.3 Legacy-Surface-Budget sinkt mindestens in einem der Restbereiche (`runtimeBundle`, `runtimeFacade`, `GameRuntimePorts-fallbacks`, `curviosApp`) ohne neue Budgets auszuweiten.
- [ ] DoD.4 `curviosApp`-/`__CURVIOS_APP__`-Direktreads ausserhalb dedizierter Plattformadapter sind fuer den migrierten Scope entfernt oder klar als Restadapter isoliert.
- [ ] DoD.5 Ratchet/Budget-Konfiguration deckt zusaetzlich `application -> ui` und `application -> core` ab und friert den aktuellen `ui -> state`-Iststand enger ein.
- [ ] DoD.6 Folgeblock-Leitplanken fuer `V64`, `V81`, `V82`, `V86` spiegeln denselben Boundary- und Sunset-Stand.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V96`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V96.md`
- hard dependencies: `V92.99`, `V64.99`
- soft dependencies: `V81.99`, `V86.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 96.1 Boundary-Baseline und Zielgrenzen fixieren
status: open
goal: Konkrete Soll-Importrichtungen, Ownership und Ratchet-Ziele verbindlich schneiden
output: Maschinenlesbare Boundary-Matrix fuer Application/Core/UI/Platform

- [ ] 96.1.1 Alle aktuellen Cross-Layer-Kanten (`application -> ui`, `application -> core`, Rest-`ui -> state`) als Ist-Snapshot dokumentieren und mit Ownership begruenden.
- [ ] 96.1.2 Zielgrenzen fuer Application-Use-Cases, Platform-Adapter, Shared-Contracts und Runtime-Ports als verbindliche Matrix in Referenzdoku + Architekturkonfig spiegeln.

### 96.2 Application-von-UI entkoppeln
status: open
goal: Application-Layer ohne UI-Imports lauffaehig machen
output: Shared/Application-nahe Ports statt UI-Runtime-Helper

- [ ] 96.2.1 UI-nahe Helfer (`MenuStateContracts`, Bridge-Runtime/CAS/Presence-Helfer) in shared/application-nahe Adapterflaechen ziehen oder ueber Ports injizieren.
- [ ] 96.2.2 `NetworkLobbyService` und `StorageLobbyService` auf diese Ports umstellen, sodass `application -> ui` auf `0` sinkt.

### 96.3 Application-von-Core entkoppeln
status: open
goal: Use-Cases ohne direkte Core-Service-Kopplung
output: Core-Implementierungen hinter injizierten Interfaces

- [ ] 96.3.1 `SessionRuntimeCommandUseCases` auf adapter-injizierte `start_match`-, `return_to_menu`-, `host_lobby`-, `join_lobby`- und `apply_settings`-Backends umstellen.
- [ ] 96.3.2 Core-seitige Factory/Composition anpassen, damit Application nur Vertragsinterfaces sieht und keine direkten `../../core/**`-Imports benoetigt.

### 96.4 Legacy-Surface-Reduktion Welle II
status: open
goal: Restadapter im Runtime-/State-Pfad weiter verengen
output: Kleinere Legacy-Surface-Nische ohne neue Backdoors

- [ ] 96.4.1 Restnutzung von `game.runtimeBundle` in `MatchSessionRuntimeBridge`/`RoundStateTickSystem` auf Snapshot-/Port-Pfade heben.
- [ ] 96.4.2 `GameRuntimePorts`-Fallback-Helfer (`getLegacyRuntime*`, `getRuntimeFeatureTransition*`) auf klar benannte Uebergangspfade begrenzen und Call-Surface minimieren.

### 96.5 Plattformgrenze und curviosApp-Migrationsschuld abbauen
status: open
goal: Runtime-Kind und Capability-Aufloesung ohne globale Direktreads ausserhalb Plattformadapter
output: Einziger Global-Read-Pfad unter `src/platform/**`

- [ ] 96.5.1 `ObservationBridgePolicy` von direktem `curviosApp`-Read auf Capability-/Runtime-Kind-Snapshot umstellen.
- [ ] 96.5.2 `PlatformCapabilityRegistry`-Direktread auf Plattformadapter/Resolver auslagern und Guard-Matrix entsprechend nachziehen.

### 96.6 Hotspot-Dekomposition mit Boundary-Nutzen
status: open
goal: Grosse Dateien entlang Verantwortung splitten, ohne Featuredrift
output: Kleinere, klar zuordenbare Services/Controller

- [ ] 96.6.1 `StorageLobbyService` und `NetworkLobbyService` in klar getrennte Verantwortungen schneiden (Transport, Discovery, SessionState, Event-Emission).
- [ ] 96.6.2 `UIStartSyncController` entlang Setup/Validation/Rendering-Teilen weiter modularisieren, ohne neue `ui -> state`-Kanten aufzubauen.

### 96.7 Guard- und Ratchet-Haertung
status: open
goal: Neue Boundary-Drifts frueh blockieren
output: Engeres Budget + zusaetzliche Layer-Checks

- [ ] 96.7.1 Ratchet enger setzen (`ui -> state` auf Ist-Stand) und Budgets fuer `application -> ui` sowie `application -> core` aufnehmen.
- [ ] 96.7.2 Architektur-Checks/Reports um diese neuen Kanten erweitern und in `check:architecture:*` sowie touched-strict integrieren.

### 96.99 Abschluss-Gate
status: open
goal: Boundary- und Legacy-Folgeblock gruensicher abschliessen
output: Gruene Guard-Gates plus dokumentierter Folgeverbrauch

- [ ] 96.99.1 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics`, `npm run check:architecture:ratchet`, `npm run check:architecture:touched-strict`, `npm run typecheck:architecture` sind gruen.
- [ ] 96.99.2 `npm run test:contract` und relevante targeted-contracts fuer den geaenderten Scope sind gruensicher oder blockerfest dokumentiert.
- [ ] 96.99.3 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen; Folgeblock-Leitplanken sind konsistent gespiegelt.

## Risiken

- R1 | hoch | Entkopplung von `application -> ui/core` erzeugt unbeabsichtigte Lifecycle-Regressionspfade in Lobby- und Session-Start.
- R2 | hoch | Ueberambitionierter Legacy-Sunset kollidiert mit laufender Produktisierung in `V64`.
- R3 | mittel | Hotspot-Splits verbessern Dateigroesse, aber nicht Ownership, wenn Ports/Contracts unscharf bleiben.
- R4 | mittel | Ratchet-Haertung blockiert produktive Folgearbeit, falls Adapter-Faelle nicht sauber als Restnische markiert sind.
