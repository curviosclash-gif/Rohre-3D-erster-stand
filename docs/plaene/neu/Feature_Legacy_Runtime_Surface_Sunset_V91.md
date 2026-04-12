# Feature: Legacy-Runtime-Surface-Sunset und Ownership-Ratchet (V91)

Stand: 2026-04-08
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V91.md`

Hinweis: Dieser Intake-Draft war zuvor als `V89` vorbereitet und wurde am 2026-04-12 auf `V91` umnummeriert, weil `V89` inzwischen als aktiver Block fuer die Desktop-first-Testarchitektur vergeben ist.

## Ziel

Die nach `V74`, `V83`, `V84` und `V87` bewusst verbliebenen Legacy-Runtime-Surfaces als eigenen Architekturblock abbauen, damit `game.runtimeBundle`, `game.runtimeFacade`, `window.GAME_RUNTIME`, breite `GameRuntimePorts`-Fallbacks und globale Runtime-Config-Slots nicht dauerhaft als zweite Source of Truth bestehen bleiben.

- Der produktive Runtime-Verbrauch soll in migrierten Bereichen nur noch ueber Commands, Events, Snapshots und Capability-Adapter laufen.
- `SessionRuntime` soll den Runtime-/Lifecycle-/Config-Besitz klarer halten als die verbleibenden Legacy-Adapter.
- Folgeblocks wie `V64`, `V81`, `V85` und spaetere Architekturarbeit sollen keine neuen Backdoors auf alte Runtime-Surfaces mehr brauchen.

## Desktop-first Scope

- Desktop-App bleibt die primaere Zielflaeche fuer Runtime-, Capability- und Lifecycle-Verbrauch.
- Browser-/Demo-Pfade werden nur dort angepasst, wo gemeinsame Runtime- oder Capability-Vertraege denselben Sunset-Pfad verlangen.
- Kein Browser-demo-first-Refactor; Desktop-Verbrauch und gemeinsame Shared-Contracts bestimmen die Zielarchitektur.

## Nicht-Ziel

- Kein Multiplayer-Produktisierungsblock; echte LAN-/Online-Produktpfade bleiben in `V64`.
- Kein Testarchitektur-Block; Suite-Zuschnitte, Runner-Modi und Readiness-Fixtures bleiben in `V88`.
- Kein grossflaechiger Rewrite aller grossen Dateien nur wegen Zeilenanzahl; Monolith-Splits erfolgen nur, wenn sie direkt fuer Ownership- oder Sunset-Ziele notwendig sind.
- Kein Gameplay-, Content- oder Surface-Redesign fuer Endnutzer.

## Betroffene Dateien und Bereiche

- `src/core/runtime/GameRuntimeBundle.js`
- `src/core/GameBootstrap.js`
- `src/core/main.js`
- `src/core/runtime/GameRuntimeCoordinator.js`
- `src/core/GameRuntimeFacade.js`
- `src/shared/runtime/GameRuntimePorts.js`
- `src/state/RoundStateTickSystem.js`
- `src/ui/HudRuntimeSystem.js`
- `src/ui/UINavigationLifecycleController.js`
- `src/core/Config.js`
- `src/core/settings/SettingsSanitizerOps.js`
- `src/core/runtime/ActiveRuntimeConfigStore.js`
- `src/ui/menu/MenuRuntimeFeatureFlags.js`
- `src/ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js`
- `src/ui/menu/multiplayer/MenuMultiplayerHostIpResolver.js`
- `src/platform/**`
- `scripts/architecture-report.mjs`
- `scripts/check-architecture-boundaries.mjs`
- `scripts/check-architecture-ratchet.mjs`
- `tests/runtime-facade.spec.js`
- `tests/core-targeted.spec.js`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 Im migrierten Scope konsumiert produktiver Code keine breite Legacy-Runtime-Surface mehr ueber `game.runtimeBundle`, `game.runtimeFacade` oder `window.GAME_RUNTIME`.
- [ ] DoD.2 UI- und State-Controller lesen Runtime-, Lobby- und Capability-Zustand ueber Snapshots, Ports und benannte Commands statt ueber Reach-Throughs auf alte Runtime-Objekte.
- [ ] DoD.3 `SessionRuntime` oder ein expliziter Snapshot-/Injection-Vertrag besitzt Runtime-Config-Lesepfade; `ActiveRuntimeConfigStore` bleibt nur dort erhalten, wo er bewusst als Uebergangsadapter dokumentiert ist.
- [ ] DoD.4 Architektur-Guards, Referenzdoku und Sunset-Matrix verhindern neue Legacy-Backdoors im migrierten Scope.
- [ ] DoD.5 Folgeblocks `V64`, `V81`, `V85` und `V88` haben synchronisierte Leitplanken fuer den reduzierten Legacy-Verbrauch.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V91`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V91.md`
- hard dependencies: `V87.99`
- soft dependencies: `V84.99`, `V88.99`
- Abgrenzung: `V89` ist bereits als aktiver Block fuer Desktop-first-Testarchitektur und Desktop-Verifikation belegt.
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 91.1 Legacy-Surface-Inventar und Sunset-Zielbild fixieren

- [ ] 91.1.1 Alle produktiven Aufrufer auf `game.runtimeBundle`, `game.runtimeFacade`, `window.GAME_RUNTIME`, `curviosApp`-Aliasse und breite `GameRuntimePorts`-Fallbacks gegen aktuelle Dateien und Verantwortlichkeiten abgleichen.
- [ ] 91.1.2 Fuer jede Legacy-Surface den Zielpfad ueber Command, Snapshot, Capability oder Config-Injection festlegen und den Sunset-Status in der Referenzdoku aktualisieren.

### 91.2 RuntimeFacade- und Port-Sammelflaechen reduzieren

- [ ] 91.2.1 `GameRuntimeFacade` und `GameRuntimeCoordinator` auf explizite Legacy-Forwarding- oder Diagnostics-Rollen reduzieren, sodass neue Fachlogik dort nicht mehr landet.
- [ ] 91.2.2 `GameRuntimePorts` fuer den migrierten Scope von breiten Fallbacks auf `game`, `runtimeFacade` und `runtimeCoordinator` befreien oder diese Fallbacks klar als Rest-Adapter isolieren.

### 91.3 UI- und State-Reach-Throughs abbauen

- [ ] 91.3.1 UI- und State-Controller wie `RoundStateTickSystem`, `HudRuntimeSystem` und angrenzende Menue-Glue-Pfade auf `match_flow_snapshot`, `session_runtime_snapshot`, `lobby_session_snapshot` und `platform_capability_snapshot` ziehen.
- [ ] 91.3.2 Globale Debug- oder Shell-Surfaces wie `window.GAME_RUNTIME` und direkte `runtimeFacade`-Reads im produktiven Pfad entfernen oder auf explizite Dev-Diagnostics begrenzen.

### 91.4 Runtime-Config-Ownership geradeziehen

- [ ] 91.4.1 `Config.js`, `SettingsSanitizerOps.js` und verwandte Consumer von `ActiveRuntimeConfigStore` auf einen expliziten Runtime-Config- oder Settings-Snapshot-Vertrag umstellen.
- [ ] 91.4.2 `runtimeConfigAdapter`-Restspuren und verbleibende globale Active-Runtime-Config-Slots soweit abbauen, dass `V81` und `V85` keinen impliziten Global-State mehr voraussetzen.

### 91.5 Ratchet, Doku und Folgeverbrauch absichern

- [ ] 91.5.1 Architektur-Checks oder Reports so erweitern, dass neue `runtimeFacade`-, `window.GAME_RUNTIME`-, `game.runtimeBundle`- oder `curviosApp`-Bypaesse im migrierten Scope frueh auffallen.
- [ ] 91.5.2 Referenzdoku und Folgeblock-Leitplanken fuer `V64`, `V81`, `V85` und `V88` auf denselben Sunset- und Ownership-Stand spiegeln.

### 91.99 Abschluss-Gate

- [ ] 91.99.1 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:ratchet`, `npm run typecheck:architecture`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind fuer den betroffenen Scope gruensicher.
- [ ] 91.99.2 Verbleibende Legacy-Surfaces sind fuer den migrierten Scope entfernt, klar als Rest-Adapter markiert oder blockerfest dokumentiert; neue Runtime-Backdoors wurden nicht eingefuehrt.

## Risiken

- R1 | hoch | Ein zu frueher Sunset von Alias- oder Wrapper-Surfaces bricht produktive Aufrufer oder versteckte Tooling-Pfade.
- R2 | hoch | Der Block vermischt sich mit `V64` oder `V88`, wenn Lobby- oder Testarchitektur-Themen nicht sauber als Folgearbeit abgegrenzt bleiben.
- R3 | mittel | Runtime-Config-Ownership kollidiert mit `V81`, falls Developer-Tuning weiterhin einen globalen Config-Slot voraussetzt.
- R4 | mittel | Debug- und Diagnosepfade verlieren Sichtbarkeit, wenn `window.GAME_RUNTIME` entfernt wird, ohne read-only Ersatz bereitzustellen.
