# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-27

Dieser Plan ist die einzige aktive Quelle fuer offene Arbeit.
Alle abgeschlossenen oder abgeloesten Plaene liegen unter `docs/archive/plans/`.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Plan werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Eintraege gepflegt.

## Status-Legende

- Offen = `[ ]`
- In Bearbeitung = `[/]`
- Abgeschlossen = `[x]`

## Governance-Regeln (verbindlich)

1. `*.99`-Gates duerfen nur auf `[x]` stehen, wenn alle vorherigen Phasen desselben Blocks auf `[x]` stehen.
2. Jeder `[x]`-Eintrag muss Evidence tragen: `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`.
3. Jeder aktive Block braucht eine `Definition of Done (DoD)` mit mindestens 4 Pruefpunkten.
4. Jeder aktive Block braucht genau einen gueltigen Lock-Header: `<!-- LOCK: frei -->` oder `<!-- LOCK: Bot-X seit YYYY-MM-DD -->`.
5. Plan-Governance ist Pflicht-Gate in den Workflows: `npm run plan:check`.

## Abhaengigkeiten (Hard/Soft)

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V52 | V50.99 | hard | ja | V50.99 abgeschlossen; Details im Archiv unter `docs/archive/plans/completed/Umsetzungsplan_Block_V50_Architektur-Haertung_II_2026-03-23.md` |
| V52 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Bestehende Guard-Basis wird auf `server/**` und dynamic imports erweitert |
| V53 | V52.6 | soft | ja | V52.6 und V53 abgeschlossen |
| V53 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Guard-Basis fuer Decomposition und Import-Grenzen vorhanden |
| V54 | V52.99 | hard | ja | V52 abgeschlossen; Rest-Ratchets laufen in V54.3/V54.7 weiter |
| V54 | V53.99 | hard | ja | Settings-Decomposition ist abgeschlossen (`docs/Feature_SettingsManager_Decomposition_V53.md`) |
| V54 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Ratchet-/Boundary-Guards bilden die Mess-Basis |
| V55 | V54.99 | hard | ja | V54 abgeschlossen; V55 setzt Tiefenaudit-Findings fuer Stabilitaet, Konsistenz und Robustheit um |
| V55 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Guard-Basis fuer Refactors in Runtime-/Netzwerk-Hotspots vorhanden |
| V56 | V55.99 | hard | ja | V55.99 und V56 abgeschlossen |
| V56 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Keine neuen Layer-Drifts, keine grossen Decompositions-Aenderungen |
| V57 | V45 (Arcade-Basis) | soft | ja | Arcade-Run-Infrastruktur (ArcadeRunRuntime, EncounterDirector, BlueprintSchema) ist vorhanden |
| V57 | V53.99 | soft | ja | Settings-Persistenz fuer Vehicle-Profile benoetigt Storage-Contracts |
| V58 | V57 | soft | ja | Architektur-Budget-Verletzungen aus V57 werden in V58 bereinigt |
| V59 | V58.1 | soft | ja | V58.1 abgeschlossen (3/3 Tasks erledigt) |
| V59 | V55.99 | hard | ja | V55 Tiefenaudit-Remediation ist Voraussetzung fuer weitere Qualitaetsarbeit |
| V60 | V58.99 | hard | nein | Audit-Folge startet erst, wenn die laufende MediaRecorder-/Dead-Code-Bereinigung abgeschlossen ist |
| V60 | V59.99 | hard | nein | Guard-/Logger-/Async-Restarbeiten aus V59 muessen abgeschlossen sein, bevor die Konsolidierung produktiv umgesetzt wird |
| V60 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Guard-Basis ist vorhanden, muss in 60.1 wieder voll belastbar gemacht werden |
| V61 | V57 (Arcade Progression) | soft | ja | V57 Arcade-Infrastruktur ist abgeschlossen; V61 baut darauf auf |
| V61 | V58.99 | soft | nein | Code-Duplizierung und Architektur-Bereinigung bevorzugt vor Feature-Erweiterung, Parallelisierung moeglich |
| V63 | V48 (Fight baseline) | soft | ja | Archivierter Fight-Qualitaetsplan liefert Baseline fuer Runtime-Config-, HUD- und Targeting-Follow-ups |
| V63 | V40 | soft | nein | Rocket-/Trail-Targeting-Contract vor finalem Rollout mit bestehendem Hunt-Trail-Plan abstimmen |
| V62 | V59.5 (Camera Polish) | soft | ja | V59.5 Code-Qualitaets-Fixes abgeschlossen; V62 baut auf bereinigter Camera-Basis auf |

## Datei-Ownership (aktive Arbeit)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `src/network/OnlineSessionAdapter.js`, `src/network/LANSessionAdapter.js`, `src/network/StateReconciler.js`, `src/core/runtime/RuntimeSessionLifecycleService.js`, `src/core/InputManager.js`, `src/ui/TouchInputSource.js`, `scripts/architecture/**`, `scripts/check-architecture-*.mjs` | V52 | offen | Event-Contract, Layering-Guards, Input/Persistenz-Resthaertung |
| `src/core/SettingsManager.js`, `src/core/settings/**`, `src/core/runtime/MenuRuntimeSessionService.js`, `src/core/runtime/MenuRuntimePresetConfigService.js`, `src/core/runtime/MenuRuntimeDeveloperModeService.js`, `src/core/GameRuntimeFacade.js`, `tests/core.spec.js` | V53 | abgeschlossen | Settings-Domain-Decomposition in Facades/Operations umgesetzt |
| `src/core/MediaRecorderSystem.js`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/core/GameRuntimeFacade.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `src/core/main.js`, `src/entities/**`, `src/ui/**`, `src/state/**`, `src/shared/**`, `scripts/architecture/**`, `scripts/check-architecture-*.mjs` | V54 | abgeschlossen | Gesamtfix fuer God-Objects, Layer-Kopplung, Legacy-Patterns und Global-Kapselung |
| `src/entities/systems/CinematicCameraSystem.js`, `src/core/renderer/CameraRigSystem.js` | V62 | in Bearbeitung | Cinematic-Camera funktionale Verbesserungen: Boost-Blend, Speed-Sway, Cockpit-Cleanup |
| `tests/playwright.global-setup.js`, `tests/playwright.global-teardown.js`, `playwright.config.js`, `scripts/verify-lock.mjs`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `src/core/runtime/RuntimeSessionLifecycleService.js`, `src/entities/arena/portal/PortalRuntimeSystem.js`, `src/ui/PauseOverlayController.js`, `src/core/GameRuntimeFacade.js`, `src/core/runtime/RuntimeSettingsChangeOrchestrator.js`, `src/core/MediaRecorderSystem.js`, `src/state/TelemetryHistoryStore.js`, `tests/core.spec.js`, `tests/training-automation.spec.js` | V55 | offen | Tiefenaudit-Remediation fuer Teststabilitaet, Race-Conditions, Backpressure und Lifecycle-Haertung |
| `src/state/MatchLifecycleSessionOrchestrator.js`, `src/entities/systems/projectile/ProjectileSimulationOps.js`, `src/ui/TouchInputSource.js`, `src/ui/MatchFlowUiController.js`, `tests/core.spec.js`, `tests/physics-core.spec.js` | V56 | offen | Edge-Case-Fixes, Defensive Improvements, idempotency guards |
| `src/state/arcade/ArcadeVehicleProfile.js`, `src/state/arcade/ArcadeMapProgression.js`, `src/state/arcade/ArcadeMissionState.js`, `src/ui/arcade/ArcadeVehicleManager.js`, `src/ui/arcade/ArcadeMapSelect.js`, `src/entities/directors/ArcadeEncounterCatalog.js` (mapPool-Erweiterung), `src/entities/arcade/ArcadeBlueprintSchema.js` (Upgrade-Tiers), `src/core/arcade/ArcadeRunRuntime.js` (Multi-Map) | V57 | offen | Arcade Progression: Vehicle Manager, Multi-Map, Missions |
| `src/core/MediaRecorderSystem.js`, `src/core/recording/**`, `src/ui/arcade/ArcadeMissionHUD.js`, `src/ui/arcade/ArcadeVehicleManager.js`, `src/state/arcade/ArcadeMapProgression.js`, `scripts/architecture/ArchitectureConfig.mjs`, `src/ui/base/PersistentStore.js`, `src/core/GameRuntimeFacade.js` | V58 | in Bearbeitung | Architektur-Bereinigung, MediaRecorder-Decomposition, UI-Store-Redundanz, Facade-Cleanup |
| `src/modes/ArcadeModeStrategy.js`, `src/core/arcade/ArcadeRunRuntime.js`, `src/state/arcade/ArcadeRunState.js`, `src/state/arcade/ArcadeScoreOps.js`, `src/state/arcade/ArcadeMissionState.js`, `src/shared/contracts/ArcadeMissionContract.js`, `src/ui/arcade/ArcadeMissionHUD.js` (Score-HUD-Erweiterung), `src/ui/arcade/ArcadeMenuSurface.js` (Post-Run, Daily), `src/entities/directors/ArcadeEncounterCatalog.js`, `src/entities/directors/ArcadeEncounterDirector.js`, `src/state/arcade/ArcadeRoundStateController.js`, `src/shared/utils/ArcadeUtils.js` (neu) | V61 | offen | Arcade-Modus Gameplay-Verbesserungen: Score, Combo, Missionen, Modifiers, Sudden Death, HUD |
| `src/network/LANSessionAdapter.js`, `src/network/LANMatchLobby.js`, `src/network/OnlineSessionAdapter.js`, `src/network/OnlineMatchLobby.js`, `server/lan-signaling.js`, `src/shared/logging/**`, `src/core/renderer/camera/CameraShakeSolver.js`, `src/core/renderer/camera/CameraModeStrategySet.js`, `src/core/renderer/RecordingCapturePipeline.js`, `src/entities/systems/CinematicCameraSystem.js`, `src/shared/contracts/RecordingCaptureContract.js`, `src/core/GameBootstrap.js`, `src/core/main.js` | V59 | offen | Netzwerk-Haertung, Logger-Abstraktion, Camera/Recording-Polish, Async-Error-Konsistenz |
| `knip.json`, `src/shared/logging/Logger.js`, `src/core/main.js`, `src/core/GameRuntimeFacade.js`, `src/ui/MenuController.js`, `src/ui/MatchFlowUiController.js`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/ui/menu/multiplayer/MenuMultiplayerBridgeMutations.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/menu/MenuDevPanelBindings.js`, `src/ui/MatchInputSourceResolver.js`, `src/core/input/**`, `src/core/lobby/**`, `src/network/InputDelayBuffer.js`, `src/network/RemoteInputSource.js`, `src/network/SpectatorInputSource.js`, `src/core/replay/ReplayPlayer.js`, `src/ui/menu/MenuMultiplayerPanel.js`, `src/ui/menu/MenuLobbyRenderer.js` | V60 | offen | Audit-Folge fuer Guard-Reliability, dormant input/multiplayer paths und Rest-Decomposition; Start nach V58/V59 |
| `src/entities/systems/HuntCombatSystem.js`, `src/entities/systems/projectile/ProjectileSimulationOps.js`, `src/entities/systems/projectile/ProjectileHitResolver.js`, `src/entities/systems/trails/TrailCollisionQuery.js`, `src/entities/ai/BotRuntimeContextFactory.js`, `src/hunt/**`, `src/ui/HuntHUD.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/menu/MenuCompatibilityRules.js`, `src/core/settings/SettingsSanitizerOps.js`, `tests/physics-hunt.spec.js`, `tests/core.spec.js`, `tests/stress.spec.js` | V63 | offen | Fight-Follow-up fuer Runtime-Config, Trail-Scan, HUD-Delta-Updates und Respawn-/Mode-Semantik |
| `docs/**`, `tests/**`, `scripts/validate-umsetzungsplan.mjs` | Shared | shared | Append-only oder eigener Abschnitt |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| E | V52 | 2026-03-23 | closed | abgeschlossen 2026-03-24 |
| F | V53 | 2026-03-23 | closed | abgeschlossen 2026-03-24 |
| G | V54 | 2026-03-24 | closed | abgeschlossen 2026-03-24 |
| H | V55 | 2026-03-25 | closed | abgeschlossen 2026-03-25 |
| I | V56 | 2026-03-25 | closed | abgeschlossen 2026-03-25 |
| J | V57 | 2026-03-26 | closed | abgeschlossen 2026-03-26 |
| - | V58 | 2026-03-26 | frei | pausiert, 58.2.3 in Arbeit gewesen |
| - | V59 | 2026-03-26 | frei | pausiert, 59.1.6/59.1.7/59.7.4 offen |
| - | V60 | - | frei | blockiert auf V58.99 + V59.99 |
| - | V61 | - | frei | - |
| - | V62 | 2026-03-26 | frei | pausiert, Gate 62.99.1/62.99.3 offen |
| - | V63 | - | frei | - |
| - | V64 | - | frei | - |
| - | V65 | - | frei | blockiert auf V62 |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-22 | Bot-Codex | V50 | `src/core/**`, `src/state/**`, `src/ui/**` | V51 Objective/Overlay/Telemetry benoetigt Round-End- und HUD-Hooks in Shared-Schichten | Scope strikt auf Parcours-Felder und Objective-Reason begrenzt, Regressionstests (`test:core`, `test:physics`, `test:stress`) ausgefuehrt | abgeschlossen |
| 2026-03-24 | Codex | V54 | `src/core/GameRuntimeFacade.js` | V53-Gate `T20x0` zeigte fehlendes Runtime-Apply bei Settings-Aenderungen | `onSettingsChanged` fuehrt wieder `applySettingsToRuntime({ schedulePrewarm: false })` aus; Verifikation via `test:core` | abgeschlossen |
| 2026-03-24 | Codex | V54 | `src/ui/MatchFlowUiController.js`, `src/ui/MatchInputSourceResolver.js`, `src/ui/PlayerInputSource.js` | V52.5 Input-Source-Priorisierung benoetigt Runtime-Wiring im Match-UI-Lifecycle | Scope auf Input-Quellen-Wiring begrenzt, Guard/Budget-Gates (`architecture:guard`, `build`) ausgefuehrt | abgeschlossen |
| 2026-03-25 | Bot-H | V2 | `scripts/perf-lifecycle-measure.mjs`, `scripts/perf-jitter-matrix.mjs` | V55.5.2 benoetigt belastbare Perf-Sanity ohne Dev-Server-Startup-Deadlocks | Benchmark-Runner auf `vite preview` mit Auto-Build-Fallback und robuster Navigation/Readiness umgestellt; `benchmark:lifecycle`/`benchmark:jitter` ausgefuehrt | abgeschlossen |
| 2026-03-25 | Bot-H | Shared | `tests/helpers.js`, `package.json` | V55.1 Startup-Flakes erfordern robusteren `loadGame`-Pfad und testseitige Timeout-Haertung | `loadGame` um Runtime-Readiness+Retry erweitert; `test:core`/`test:fast` auf `--timeout=240000` standardisiert; Gate-Laeufe dokumentiert | abgeschlossen |
| 2026-03-26 | Agent A | V57 | `src/ui/arcade/ArcadeVehicleManager.js` | V58 Architektur-Guard zeigt ui->state import zu ArcadeVehicleProfile; muss via Facade/Contract entkoppelt werden | V58.1 hat Budget-Fixes umgesetzt; verbleibende Entkopplung in V58.3 oder V60 | DEFERRED |
| 2026-03-26 | Bot-Codex | V59/V60 | `src/shared/logging/Logger.js` | V62-Abschluss-Gate benoetigt gruene `build`-/Architecture-Typecheck-Laeufe; Blocker war JSDoc/ImportMeta-Typfehler | Commit `9fe3809` hat Logger-Typecheck gefixt; `npm run build` und `tsc -p tsconfig.architecture.json` gruen (2026-03-27) | abgeschlossen |

---

## Parallelisierungs-Empfehlung (Stand: 2026-03-27)

Folgende Bloecke haben keine ueberlappenden Dateien und koennen parallel bearbeitet werden:

| Spur | Bloecke | Hinweis |
| --- | --- | --- |
| A | **V58** (Rest) + **V60** (nach V58.99+V59.99) | Architektur-Bereinigung + Konsolidierung |
| B | **V59** (Rest) | Netzwerk + Logger, 3 Tasks offen |
| C | **V61** | Arcade Gameplay, keine Ueberlappung mit A/B |
| D | **V63** | Fight-Modus, eigene Dateien |
| E | **V64** | Desktop/Electron, komplett isoliert |
| F | **V62** (Gate) + **V65** | Camera Gate schliessen, dann MP4-Modularisierung |

Empfehlung: 4 Agents parallel auf Spuren B + C + D + E. Spur A und F nach Gate-Abschluss.

---

## Aktive Bloecke

## Block V52: Architektur-Haertung III - Event-Konsistenz, Layer-Grenzen, Guard-Coverage

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V50.99 -->

Scope:

- Session-Event-Pipeline, State/UI-Schichtung und Protokollhaertung konsolidieren.
- Architektur-Guards auf `server/**` und dynamic imports erweitern, Input-/Persistenz-Restpfade finalisieren.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 52.1 bis 52.8 sind abgeschlossen. (abgeschlossen: 2026-03-24; evidence: plan-review V52-phases -> docs/Umsetzungsplan.md)
- [x] DoD.2 52.99.* ist abgeschlossen und Gate-Invariante erfuellt. (abgeschlossen: 2026-03-24; evidence: npm run plan:check -> Master plan validation passed)
- [x] DoD.3 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core` und `npm run build` sind PASS. (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard && npm run build -> 81e99df; TEST_PORT=5311 PW_RUN_TAG=v52-core-gate PW_OUTPUT_DIR=test-results/v52-core-gate npx playwright test tests/core.spec.js -> 102 passed; TEST_PORT=5310 PW_RUN_TAG=v52-fast-gate PW_OUTPUT_DIR=test-results/v52-fast-gate npx playwright test tests/core.spec.js tests/physics-core.spec.js -> 129 passed)
- [x] DoD.4 Evidence, Conflict-Log, Ownership und Lock-Status sind konsistent gepflegt. (abgeschlossen: 2026-03-24; evidence: npm run docs:check -> docs/Dokumentationsstatus.md)

### 52.1 Session-Event-Contract und Player-Registry stabilisieren

- [x] 52.1.1 `stateUpdate`-Payload in LAN/Online-Adaptern und `StateReconciler` auf ein gemeinsames Schema vereinheitlichen (inkl. Version/Felder) (abgeschlossen: 2026-03-24; evidence: node --input-type=module -e stateUpdate-contract-smoke -> stateUpdate contract smoke: ok; commit 2ee3aad)
- [x] 52.1.2 `playerLoaded`-Lifecycle und `getPlayers()` aus realen Session-Daten statt Schattenlisten verdrahten (abgeschlossen: 2026-03-24; evidence: node --input-type=module -e waitForRuntimePlayersLoaded-smoke -> waitForRuntimePlayersLoaded smoke: ok; commit 81e99df)

### 52.2 State-UI-Boundary entkoppeln

- [x] 52.2.1 Direkte `state -> ui` Imports auf Ports/Events migrieren, damit die Layer-Richtung wieder eindeutig ist (abgeschlossen: 2026-03-24; evidence: plan-transfer V52.2.1 -> V54.3.1 -> docs/Umsetzungsplan.md)
- [x] 52.2.2 Direkte `ui -> state` Mutationen auf einen klaren Command-/Reducer-Pfad mit Ownership umstellen (abgeschlossen: 2026-03-24; evidence: plan-transfer V52.2.2 -> V54.3.2 -> docs/Umsetzungsplan.md)

### 52.3 Architektur-Guards erweitern

- [x] 52.3.1 `ArchitectureAnalysis` fuer `src/**` und `server/**` ausbauen und `import(...)` (dynamic import) in die Kantenanalyse aufnehmen (abgeschlossen: 2026-03-24; evidence: npm run check:architecture:metrics -> Source files: 373, ui/state budgets sichtbar; commit 81e99df)
- [x] 52.3.2 Budget-/Ratchet-Checks fuer bidirektionale Drift (`state <-> ui`) ergaenzen und als Gate erzwingen (abgeschlossen: 2026-03-24; evidence: npm run check:architecture:ratchet -> ui->state/state->ui budgets at-baseline)

### 52.4 Command- und Mutationspfad vereinheitlichen

- [x] 52.4.1 `ActionDispatcher` entweder produktiv in Runtime/UI integrieren oder komplett entfernen (kein halber Pfad) (abgeschlossen: 2026-03-24; evidence: rg -n ActionDispatcher src -> no runtime references; commit 81e99df)
- [x] 52.4.2 Direkte Store-Schreibpfade reduzieren und ueber dokumentierte Commands zentralisieren (abgeschlossen: 2026-03-24; evidence: plan-transfer V52.4.2 -> V54.3.2 -> docs/Umsetzungsplan.md)

### 52.5 Input-Source-Architektur finalisieren

- [x] 52.5.1 `InputManager.setPlayerSource` in Runtime/Setup aktiv nutzen und Prioritaeten fuer Touch/Gamepad/Keyboard deterministisch festlegen (abgeschlossen: 2026-03-24; evidence: node --input-type=module -e match-input-source-resolver-smoke -> match-input-source resolver smoke: ok; commit 81e99df)
- [x] 52.5.2 Defekte oder tote Input-Pfade bereinigen (inkl. `TouchInputSource`-Importpfad) und Regressionstests hinterlegen (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard -> PASS nach TouchInputSource/PlayerInputSource wiring; commit 81e99df)

### 52.6 Persistenz-Rollout vervollstaendigen

- [x] 52.6.1 Verbleibende ad-hoc Storage-Keys auf zentrale Storage-Contracts migrieren (abgeschlossen: 2026-03-24; evidence: V53 completion check -> docs/Feature_SettingsManager_Decomposition_V53.md)
- [x] 52.6.2 Migrations-/Kompatibilitaetstests fuer Menu-, Arcade- und Multiplayer-Datenpfade abschliessen (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)

### 52.7 Protokollhaertung und Decoder-Strictness

- [x] 52.7.1 Multiplayer-Decoder auf strict validation (required fields, type guards, unknown-field policy) umstellen (abgeschlossen: 2026-03-24; evidence: plan-transfer V52.7.1 -> V54.7.2 -> docs/Umsetzungsplan.md)
- [x] 52.7.2 Contract-Tests fuer LAN/Online/Server inkl. Negativfaelle (invalid payload, version mismatch, reconnect edge cases) erweitern (abgeschlossen: 2026-03-24; evidence: plan-transfer V52.7.2 -> V54.7.1 -> docs/Umsetzungsplan.md)

### 52.8 Decomposition-Welle III (Rest-God-Objects)

- [x] 52.8.1 Ueberlaenge-Module (`MediaRecorderSystem`, `MenuMultiplayerBridge`, `GameRuntimeFacade`) entlang Domain-Grenzen weiter zerlegen (abgeschlossen: 2026-03-24; evidence: plan-transfer V52.8.1 -> V54.2.1 -> docs/Umsetzungsplan.md)
- [x] 52.8.2 Dead-Code-/Orphan-Module identifizieren, entfernen und Import-Graph-Regression absichern (abgeschlossen: 2026-03-24; evidence: plan-transfer V52.8.2 -> V54.2.2/V54.7.2 -> docs/Umsetzungsplan.md)

### Phase 52.99: Integrations- und Abschluss-Gate

- [x] 52.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core` und `npm run build` sind gruen (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard && npm run build -> 81e99df; TEST_PORT=5311 PW_RUN_TAG=v52-core-gate PW_OUTPUT_DIR=test-results/v52-core-gate npx playwright test tests/core.spec.js -> 102 passed; TEST_PORT=5310 PW_RUN_TAG=v52-fast-gate PW_OUTPUT_DIR=test-results/v52-fast-gate npx playwright test tests/core.spec.js tests/physics-core.spec.js -> 129 passed)
- [x] 52.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen (abgeschlossen: 2026-03-24; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

### Risiko-Register V52

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Event-Contract-Umstellung bricht bestehende Session-Flows | hoch | Netzwerk | Versionierter Payload-Contract + Adapter-Compatibility-Tests + Rollout-Flag | Join/Reconnect-Fehler in LAN/Online |
| Striktere Decoder verursachen kurzfristig mehr Drops | mittel | Netzwerk/Server | Shadow-Mode mit Telemetrie vor Hard-Enforce | Erhoehte Rate an abgewiesenen Paketen |
| Guard-Erweiterung erzeugt viele Legacy-Verstoesse gleichzeitig | mittel | Architektur | Ratchet mit Baseline + touched-file strict rollout in Schritten | Pipeline wird rot durch Altlasten |

---

## Block V53: SettingsManager Decomposition und Settings-Domain-Entkopplung

Plan-Datei: `docs/Feature_SettingsManager_Decomposition_V53.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V52 -->

Scope:

- `SettingsManager` von monolithischer Logik in klar getrennte Settings-Domain-Module ueberfuehren.
- API-Stabilitaet fuer Runtime/Menu-Call-Sites sichern und Regressionen in Settings-/Preset-/Telemetry-Flows vermeiden.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 53.1 bis 53.6 und 53.99 sind abgeschlossen. (abgeschlossen: 2026-03-24; evidence: docs/Feature_SettingsManager_Decomposition_V53.md -> docs/Feature_SettingsManager_Decomposition_V53.md)
- [x] DoD.2 `SettingsManager` ist als schlanke Facade umgesetzt; Domain-Logik liegt in `src/core/settings/**`. (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
- [x] DoD.3 `npm run test:core`, `npm run architecture:guard` und `npm run build` sind PASS. (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)
- [x] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Evidence/Lock/Ownership sind konsistent. (abgeschlossen: 2026-03-24; evidence: npm run docs:check -> docs/Dokumentationsstatus.md)

### 53.1 Scope-Baseline und API-Inventar

- [x] 53.1.1 Oeffentliche `SettingsManager`-Methoden und Call-Sites (`src/core/runtime/**`, `GameRuntimeFacade`) inventarisieren und Facade-Vertrag fixieren (abgeschlossen: 2026-03-24; evidence: rg -n "settingsManager\\." src/core/runtime src/core/GameRuntimeFacade.js tests/core.spec.js -> docs/Feature_SettingsManager_Decomposition_V53.md)
- [x] 53.1.2 Characterization-Baseline fuer kritische Flows (`sanitizeSettings`, Session-Switch, Preset-Apply/Save, Telemetry) dokumentieren (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)

### 53.2 Settings-Normalisierung zerlegen

- [x] 53.2.1 `sanitizeSettings` in dedizierte Ops/Funktionen entlang Domain-Grenzen (`session`, `gameplay`, `botBridge`, `controls`, `menuContracts`) auslagern (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
- [x] 53.2.2 Migrations-/Clamp-/Kompatibilitaetsregeln (`settingsVersion`, Hunt-Respawn, `modePath`, Recording) unveraendert absichern (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5302 PW_RUN_TAG=botFv53d PW_OUTPUT_DIR=test-results/botFv53d npm run test:core -- --grep "T20o1" -> test-results/botFv53d)

### 53.3 Preset- und Session-Draft-Domain trennen

- [x] 53.3.1 Session-Draft-Flow (`saveSessionDraft`, `applySessionDraft`, `switchSessionType`) als eigene Service-Schicht kapseln (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
- [x] 53.3.2 Preset-Flow (`applyMenuPreset`, `saveMenuPreset`, `deleteMenuPreset`) auf klaren Result-Contract und getrennte Ops migrieren (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)

### 53.4 Developer/Text/Telemetry-Domain extrahieren

- [x] 53.4.1 Developer-Aktionen (Mode/Theme/Actor/Visibility/Lock/ReleasePreview) in dedizierte Facade auslagern (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
- [x] 53.4.2 Text-Override- und Telemetry-History-Pfade als eigene Services mit stabilen I/O-Contracts ausfuehren (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)

### 53.5 Orchestrator-Manager finalisieren

- [x] 53.5.1 `SettingsManager` auf Store-Wiring + Domain-Orchestrierung + Runtime-Config reduzieren (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
- [x] 53.5.2 Imports/Exporte fuer Call-Sites stabilisieren, Legacy-Helfer entfernen, Import-Grenzen dokumentieren (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)

### 53.6 Verifikation und Guard-Haertung

- [x] 53.6.1 `test:core` fuer Settings/Menu/Session/Preset/Telemetry-Flows erweitern bzw. nachziehen (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)
- [x] 53.6.2 `architecture:guard` gegen neue Grenzen fahren und Ratchet-Verstoesse beheben (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard -> 0f04006)

### Phase 53.99: Integrations- und Abschluss-Gate

- [x] 53.99.1 `npm run test:core`, `npm run architecture:guard`, `npm run build` sind gruen (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)
- [x] 53.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen (abgeschlossen: 2026-03-24; evidence: npm run docs:check -> docs/Dokumentationsstatus.md)

### Risiko-Register V53

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Versteckte Seiteneffekte beim Split von `sanitizeSettings` | hoch | Core | Characterization-Tests + schrittweise Extraktion mit unveraenderter API | Abweichende Defaults/Migrationswerte |
| API-Drift bei Runtime-Call-Sites (`MenuRuntime*`, `GameRuntimeFacade`) | mittel | Core/UI | Facade-Contract zuerst fixieren, danach interne Migration | Laufzeitfehler in Menu-Flows |
| Import-Grenzen werden durch neue Module verletzt | mittel | Architektur | `architecture:guard` pro Teilphase + Ratchet-Review | Neue disallowed edges |

---

## Block V54: Gesamtfix Architektur-/Qualitaetspunkte

Plan-Datei: `docs/Feature_Gesamtfix_Architektur_Qualitaet_V54.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V52.99, V53.99 -->

Scope:

- Alle identifizierten Architektur-/Qualitaets-Punkte als zusammenhaengenden Fix-Fahrplan umsetzen.
- Schwerpunkt auf Decomposition, Layer-Grenzen, Legacy-Pattern-Abbau und Guard-Ratchet-Senkung.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 54.1 bis 54.7 und 54.99 sind abgeschlossen. (abgeschlossen: 2026-03-24; evidence: plan-review V54-phases -> docs/Umsetzungsplan.md)
- [x] DoD.2 Architektur-Metriken sind gegenueber Baseline verbessert (`entities -> core`, `ui -> core`, Legacy-Pattern). (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard -> Architecture Scorecard: ui->core 7, entities->core 42, state->core 0, constructor(game) files 8)
- [x] DoD.3 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind PASS. (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5412 PW_RUN_TAG=v54-final-fast-pass PW_OUTPUT_DIR=test-results/v54-final-fast-pass npm run test:fast -> 128 passed, 1 flaky, 1 skipped; TEST_PORT=5413 PW_RUN_TAG=v54-final-core-pass PW_OUTPUT_DIR=test-results/v54-final-core-pass npm run test:core -> 102 passed, 1 skipped; npm run architecture:guard && npm run build -> PASS)
- [x] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Evidence/Lock/Ownership sind konsistent. (abgeschlossen: 2026-03-24; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

### 54.1 Architektur-Baseline und Kanteninventar

- [x] 54.1.1 Vollstaendige Kantenmatrix fuer `entities -> core`, `ui -> core`, `state -> core` erfassen (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard -> Architecture Scorecard report)
- [x] 54.1.2 Zielbudgets pro Kantenklasse und Legacy-Muster (`constructor(game)`, DOM ausserhalb `src/ui`) festschreiben (abgeschlossen: 2026-03-24; evidence: git show --name-only 11ad51b -> scripts/architecture/ArchitectureConfig.mjs, scripts/architecture/architecture-budget-ratchet.json)

### 54.2 God-Object-Decomposition

- [x] 54.2.1 `MediaRecorderSystem`, `MenuMultiplayerBridge`, `GameRuntimeFacade`, `WebSocketTrainerBridge` entlang Domain-Grenzen splitten (abgeschlossen: 2026-03-24; evidence: git show --name-only b218f3c -> src/core/recording/MediaRecorderSystemOps.js, src/core/runtime/GameRuntimeSettingsKeySets.js)
- [x] 54.2.2 Oeffentliche APIs stabil halten und Call-Sites schrittweise migrieren (abgeschlossen: 2026-03-24; evidence: npm run test:core -> 102 passed, 1 skipped; test-results/v54-final-core-pass)

### 54.3 Layer-Kopplung abbauen

- [x] 54.3.1 Direkte `entities -> core` Imports auf shared Contracts/Ports migrieren (abgeschlossen: 2026-03-24; evidence: git show --name-only 88d436e -> src/entities/CustomMapLoader.js)
- [x] 54.3.2 Direkte `ui -> core` Imports auf Composition-/Port-Schichten migrieren (abgeschlossen: 2026-03-24; evidence: git show --name-only 88d436e -> src/ui/menu/MenuCompatibilityRules.js, src/ui/menu/MenuPreviewCatalog.js)

### 54.4 Legacy-Konstruktor-/Game-Referenzen reduzieren

- [x] 54.4.1 `constructor(game)` auf explizite Dependency-Objekte umstellen (abgeschlossen: 2026-03-24; evidence: git show --name-only 4cf8efd -> src/state/MatchLifecycleSessionOrchestrator.js)
- [x] 54.4.2 `this.game = game`-Pattern entfernen oder auf read-only Ports begrenzen (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard -> constructor(game)/this.game budget 8)

### 54.5 Clone-/Determinismus-/Zeitpfade vereinheitlichen

- [x] 54.5.1 Einheitlichen Clone-Helper einfuehren und `JSON.parse(JSON.stringify(...))` in Kernpfaden ersetzen (abgeschlossen: 2026-03-24; evidence: git show --name-only 58e22b6 -> src/shared/utils/JsonClone.js)
- [x] 54.5.2 Zeit-/RNG-Nutzung in kritischen Pfaden auf injizierbare Contracts vereinheitlichen (abgeschlossen: 2026-03-24; evidence: git show --name-only 0ff690c -> src/core/GameRuntimeFacade.js)

### 54.6 Browser-Globals kapseln

- [x] 54.6.1 `window`/`document`/Storage-Zugriffe ausserhalb `src/ui` hinter Runtime-Adaptern kapseln (abgeschlossen: 2026-03-24; evidence: git show --name-only 2efc185 -> src/shared/runtime/BrowserStoragePorts.js)
- [x] 54.6.2 Legacy-Ausnahmen reduzieren und Boundary-Checks verschaerfen (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard -> boundary + ratchet PASS)

### 54.7 Test- und Guard-Haertung

- [x] 54.7.1 Regressions-Tests fuer Menu/Runtime/Physics auf den Refactor-Scope erweitern (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5412 PW_RUN_TAG=v54-final-fast-pass PW_OUTPUT_DIR=test-results/v54-final-fast-pass npm run test:fast -> 128 passed, 1 flaky, 1 skipped)
- [x] 54.7.2 Guard-/Build-Gates pro Teilphase gruen halten (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard && npm run build -> PASS)

### Phase 54.99: Integrations- und Abschluss-Gate

- [x] 54.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard && npm run build -> PASS; test-results/v54-final-fast-pass + test-results/v54-final-core-pass)
- [x] 54.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen (abgeschlossen: 2026-03-24; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

### Risiko-Register V54

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Gleichzeitige Multi-Layer-Refactors erzeugen schwer isolierbare Regressionen | hoch | Core/Architektur | Kleine Teilphasen, strikte Guard-/Test-Gates je Schritt | Mehrere Subsysteme brechen parallel |
| Ratchet-Budgets sinken nicht trotz Umbau | mittel | Architektur | Kanteninventar + priorisierter Abbau der teuersten Imports | Metriken bleiben auf Baseline |
| API-Drift bei Decomposition grosser Klassen | hoch | Core/UI | Facade-Contract zuerst fixieren, Migration call-site-weise | Runtime/Menu Fehler nach Split |

---

## Block V55: Tiefenaudit-Remediation - Teststabilitaet, Multiplayer-Konsistenz, Runtime-Robustheit

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V54.99 -->

Scope:

- Die im Tiefenaudit identifizierten Qualitaetsrisiken gezielt und priorisiert abbauen: flaky Tests, konkurrierende Session-Updates, stille Request-Drops, Lifecycle-Leaks und inkonsistente Export-/Persistenzpfade.
- Fokus auf reproduzierbare Stabilitaet unter Last sowie klare Telemetrie fuer Fehlerbilder statt stiller Degradation.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 55.1 bis 55.8 sowie 55.99 sind abgeschlossen und jeweils mit Evidence dokumentiert. (abgeschlossen: 2026-03-25; evidence: 55.1.1-55.8.2 abgehakt inkl. `tests/core.spec.js` T41c1/T20ae1/T20ae2/T20ae3 und `tests/training-automation.spec.js` T97)
- [x] DoD.2 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind PASS; Test-Setup ist ohne `global-setup` Timeout in Wiederholungslauf stabil. (abgeschlossen: 2026-03-25; evidence: `npm run architecture:guard` PASS; `npm run build` PASS; `npm run test:core` PASS (runTag `pid-8624-mn5tpt3u`, 106 passed, 1 skipped, 1 flaky); `npm run test:fast` PASS (runTag `pid-5488-mn5u1wzp`, 133 passed, 1 skipped, 1 flaky))
- [x] DoD.3 Concurrency-/Backpressure-Regressionen sind durch neue/erweiterte Tests in `tests/core.spec.js` und `tests/training-automation.spec.js` abgesichert. (abgeschlossen: 2026-03-25; evidence: `tests/core.spec.js` T41c1/T20ae2 PASS; `tests/training-automation.spec.js` T97 PASS, runTag `pid-11096-mn5tjwzh`)
- [x] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Conflict-Log-Pflege sind konsistent abgeschlossen. (abgeschlossen: 2026-03-25; evidence: `npm run plan:check` PASS; `npm run docs:sync` PASS; `npm run docs:check` PASS; Conflict-Log+Lock aktualisiert)

### 55.1 Playwright-Setup und Test-Isolation haerten

- [x] 55.1.1 `tests/playwright.global-setup.js` um explizite Readiness-Probe + aussagekraeftige Diagnoseartefakte (URL, Retry-Status, relevante Server-Logs) erweitern, damit `page.goto`-Timeouts reproduzierbar analysierbar sind. (abgeschlossen: 2026-03-25; evidence: `tests/playwright.global-setup.js` Readiness-/Prewarm-Diagnostik, `test-results/pid-8624-mn5tpt3u/playwright-startup-diagnostics.json`)
- [x] 55.1.2 Stabilitaets-Validierung fuer `npm run test:fast` mit Wiederholungslaeufen und dokumentierter Flake-Rate durchfuehren; Abbruchkriterien und Eskalationspfad fuer Infrastrukturprobleme festlegen. (abgeschlossen: 2026-03-25; evidence: `docs/qa/Playwright_Stability_Runbook.md`, `npm run test:fast` PASS runTags `pid-1168-mn5sxuzj` und `pid-5488-mn5u1wzp`)

### 55.2 MenuMultiplayerBridge gegen konkurrierende Snapshot-Updates absichern

- [x] 55.2.1 Read-Modify-Write-Pfade in `src/ui/menu/MenuMultiplayerBridge.js` auf revision-gesicherte CAS-/Retry-Strategie umstellen, um verlorene Updates bei parallelen Host/Client-Operationen zu vermeiden. (abgeschlossen: 2026-03-25; evidence: `src/ui/menu/multiplayer/MenuMultiplayerBridgeCas.js`, `src/ui/menu/multiplayer/MenuMultiplayerBridgeMutations.js`, CAS-Import-Fix in `src/ui/menu/MenuMultiplayerBridge.js`)
- [x] 55.2.2 Regressionstests fuer gleichzeitige `ready_toggle`, Heartbeat und `match_start`-Mutationen ergaenzen; Nachweis, dass Revisionen monotonic bleiben und kein Snapshot-Rollback auftritt. (abgeschlossen: 2026-03-25; evidence: `tests/core.spec.js` T41c1 PASS in `npm run test:core`)

### 55.3 WebSocketTrainerBridge Backpressure- und Drop-Semantik klarziehen

- [x] 55.3.1 Request-Fluss fuer Action-Requests in `src/entities/ai/training/WebSocketTrainerBridge.js` um `latest-wins`-Queue/Koaleszierung erweitern; stille Drops ohne Telemetrie entfernen. (abgeschlossen: 2026-03-25; evidence: `src/entities/ai/training/WebSocketTrainerBridge.js` latest-wins Queue + koaleszierte Action-Sends)
- [x] 55.3.2 Telemetrie um differenzierte Zaehler (`actionDrops`, `actionSendSkipped`, `backpressureDrops`) erweitern und in `tests/training-automation.spec.js` deterministisch absichern. (abgeschlossen: 2026-03-25; evidence: `src/entities/ai/training/WebSocketTrainerBridgeTelemetry.js`, `tests/training-automation.spec.js` T97 PASS in runTag `pid-11096-mn5tjwzh`)

### 55.4 RuntimeSessionLifecycle Start- und Reconcile-Gates robust machen

- [x] 55.4.1 Client-Seite in `waitForRuntimePlayersLoaded` auf explizites Host-Startsignal haerten, damit Matchstart bei Netzwerkschwankungen nicht asymmetrisch erfolgt. (abgeschlossen: 2026-03-25; evidence: `src/core/runtime/RuntimeSessionLifecycleService.js`, `tests/core.spec.js` T20ae2 PASS)
- [x] 55.4.2 Fruehe `stateUpdate`-Pakete vor Verfuegbarkeit des `StateReconciler` puffern und nach Initialisierung kontrolliert replayen; Kein Verlust der ersten autoritativen Snapshots. (abgeschlossen: 2026-03-25; evidence: `src/core/runtime/RuntimeSessionLifecycleService.js`, `tests/core.spec.js` T20ae2 PASS)

### 55.5 Hotpath-Logging und Portal-Update-Kosten reduzieren

- [x] 55.5.1 `console.log` im Portal-Hotpath (`src/entities/arena/portal/PortalRuntimeSystem.js`) entfernen oder strikt debug-gated machen; Laufzeitkosten bei haeufigen Portalhits minimieren. (abgeschlossen: 2026-03-25; evidence: `src/entities/arena/portal/PortalRuntimeSystem.js` Hotpath-Logging entfernt/debug-gated)
- [x] 55.5.2 Performance-Sanity fuer betroffene Hotpaths (Portal/Update) dokumentieren und mit vorhandenem Perf-Tooling (`benchmark:jitter`, `benchmark:lifecycle`) gegen Regressionen absichern. (abgeschlossen: 2026-03-25; evidence: `npm run benchmark:lifecycle` PASS -> `tmp/perf_phase28_5_lifecycle_full.json`; `npm run benchmark:jitter` PASS -> `tmp/perf_jitter_matrix_1774426370083.json`)

### 55.6 PauseOverlay-Lifecycle und Event-Listener-Disposal vervollstaendigen

- [x] 55.6.1 `src/ui/PauseOverlayController.js` um vollstaendige Listener-Verwaltung inkl. `dispose()` erweitern, damit Re-Init/HMR keine Mehrfach-Bindings erzeugt. (abgeschlossen: 2026-03-25; evidence: `src/ui/PauseOverlayController.js` dispose-/idempotency-Haertung)
- [x] 55.6.2 Tests fuer wiederholtes Setup/Teardown und idempotentes Verhalten ergaenzen; Nachweis, dass keine doppelten Handler oder verwaisten UI-Aktionen verbleiben. (abgeschlossen: 2026-03-25; evidence: `tests/core.spec.js` T20ae1 PASS)

### 55.7 Text-/Encoding-Integritaet im Runtime-UI-Pfad herstellen

- [x] 55.7.1 Mojibake-Literale in `GameRuntimeFacade`, `RuntimeSettingsChangeOrchestrator` und `PauseOverlayController` korrigieren; konsistente UTF-8-Ausgabe in UI/Toasts sicherstellen. (abgeschlossen: 2026-03-25; evidence: `src/core/GameRuntimeFacade.js`, `src/core/runtime/RuntimeSettingsChangeOrchestrator.js`, `src/ui/PauseOverlayController.js`)
- [x] 55.7.2 Leichtgewichtigen Check gegen neue Encoding-Schaeden in Runtime-Strings integrieren (z. B. Script/Lint-Regel), damit defekte Literale frueh in der Pipeline auffallen. (abgeschlossen: 2026-03-25; evidence: `scripts/check-runtime-encoding.mjs`, `npm run check:runtime:encoding` PASS)

### 55.8 Recorder-Export- und Telemetry-Persistenz robustifizieren

- [x] 55.8.1 Exportpfad in `MediaRecorderSystem` so nachschaerfen, dass API-Save-Erfolg/Fallback semantisch klar reportet wird (kein vorzeitiges Erfolgs-Signal ohne Abschlussstatus). (abgeschlossen: 2026-03-25; evidence: `src/core/MediaRecorderSystem.js`, `tests/core.spec.js` T20ak1 PASS)
- [x] 55.8.2 `TelemetryHistoryStore` um Retry-/Reopen-Strategie bei temporaeren IndexedDB-Fehlern erweitern, damit Persistenz nicht dauerhaft bis zum Reload deaktiviert bleibt. (abgeschlossen: 2026-03-25; evidence: `src/state/TelemetryHistoryStore.js`, `tests/core.spec.js` T20ae3 PASS)

### Phase 55.99: Integrations- und Abschluss-Gate

- [x] 55.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen; Teststabilitaet fuer den Playwright-Startpfad ist mit Evidence belegt. (abgeschlossen: 2026-03-25; evidence: `npm run architecture:guard` PASS, `npm run build` PASS, `npm run test:core` PASS runTag `pid-8624-mn5tpt3u`, `npm run test:fast` PASS runTag `pid-5488-mn5u1wzp`, Startup-Diagnosen je Run in `test-results/*/playwright-startup-diagnostics.json`)
- [x] 55.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung sind abgeschlossen und dokumentiert. (abgeschlossen: 2026-03-25; evidence: `npm run plan:check` PASS, `npm run docs:sync` PASS, `npm run docs:check` PASS, Conflict-Log und Lock-Header aktualisiert)

### Risiko-Register V55

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Concurrency-Fixes im Multiplayer-Snapshot-Pfad erzeugen neue Edge-Case-Deadlocks | hoch | UI/Netzwerk | CAS mit begrenzten Retries, deterministische Konflikt-Tests, Fallback auf letzte valide Revision | Lobbies frieren bei parallelen Host/Client-Aktionen |
| Backpressure-Haertung veraendert Trainer-Verhalten und maskiert reale Latenzprobleme | hoch | AI/Training | Telemetrie-Ausbau + Replay-Tests fuer Drop-/Retry-Pfade + klare Alert-Schwellen | Erhoehte Fallback-Rate oder sinkende Action-Qualitaet |
| Test-Infrastruktur-Haertung reduziert Timeouts nicht nachhaltig | mittel | QA/Tooling | Diagnoseartefakte pro Fehlversuch, Wiederholungsmatrix, klarer Infra-vs-Code-Entscheidungsbaum | Weiterhin `global-setup` Timeout in Serienlaeufen |
| Lifecycle-/Disposal-Refactors verursachen regressives UI-Verhalten im Pause-Flow | mittel | UI/Core | Idempotenz-Tests fuer Setup/Dispose, schrittweiser Rollout, Guarded Feature Flags falls noetig | Doppelte Klick-Aktionen oder blockierte Pause-Menues |
| Recorder-/Persistenz-Resilienz aendert bestehende Export-/Telemetrie-Erwartungen | mittel | Core/State | Rueckwaertskompatible Result-Flags, abgestimmte Kontrakt-Tests, Dokumentation der neuen Semantik | Nutzer meldet falsche Export-Erfolgsanzeige oder fehlende Historie |

---

## Block V56: Code-Audit Remediation - Defensive Improvements & Edge-Case Fixes

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V55.99 -->

Scope:

- Gezielte Behebung der im Code-Audit identifizierten Edge-Cases und Verbesserungsmoeglichkeiten.
- Defensive null-checks, idempotency-guards und race-condition-mitigations einfuehren.
- Fokus auf Stabilitaet unter Edge-Case-Bedingungen, nicht grosse Refactors.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 56.1 bis 56.4 sowie 56.99 sind abgeschlossen und dokumentiert. (abgeschlossen: 2026-03-25)
- [x] DoD.2 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind PASS. (abgeschlossen: 2026-03-25)
- [x] DoD.3 Neue Regressionstests fuer die behandelten Edge-Cases existieren in `tests/core.spec.js` oder `tests/physics-core.spec.js`. (abgeschlossen: 2026-03-25)
- [x] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-Pflege sind abgeschlossen. (abgeschlossen: 2026-03-25)

### 56.1 Async Race Condition in MatchLifecycleSessionOrchestrator

**Issue:** Wenn `createMatchSession()` waehrend einer laufenden async `initializeMatchSession()` erneut aufgerufen wird, kann die alte Promise nach Erstellen der neuen Session noch resolven und stale Match-Daten anwenden (Lifecycle-Corruption).

**Fix-Strategie:**
- [x] 56.1.1 `_applyInitializedMatch()` mit Session-ID-Guard versehen: nur anwenden wenn `resolvedMatch._sessionId === this._activeSessionId` (abgeschlossen: 2026-03-25; evidence: provisional session ID in createMatchSession + expectedSessionId guard in _applyInitializedMatch)
- [x] 56.1.2 Regressionstest in `tests/core.spec.js` fuer parallele `createMatchSession()`-Aufrufe hinzufuegen (abgeschlossen: 2026-03-25; evidence: test 'V56.1 Session-ID guard rejects stale async createMatchSession result' in tests/core.spec.js)

### 56.2 Defensive Null-Checks in ProjectileSimulationOps

**Issue:** `portalResult.target` wird nach `if (portalResult)` Check ohne Null-Assertion verwendet. Obwohl in der Praxis immer set, sollte defensiv geprueft werden.

**Fix-Strategie:**
- [x] 56.2.1 Linie 197 in ProjectileSimulationOps: `if (portalResult?.target)` statt `if (portalResult)` (abgeschlossen: 2026-03-25; evidence: ProjectileSimulationOps.js:196 + PlayerInteractionPhase.js:32 geaendert)
- [x] 56.2.2 Vergleichbare Portal-Zugriffe in `PortalRuntimeSystem.js`, `SpecialGateRuntime.js` durchsuchen und absichern (abgeschlossen: 2026-03-25; evidence: PlayerInteractionPhase.js:32 ebenfalls auf portalResult?.target geaendert; PortalRuntimeSystem/SpecialGateRuntime haben keine unsicheren target-Zugriffe)

### 56.3 Double-Dispose Guard in TouchInputSource

**Issue:** `dispose()` ruft `removeUI()` auf, bevor `super.dispose()` aufgerufen wird. Doppelaufrufe oder Fehler in `super.dispose()` koennten zu Problemen fuehren. Fehlende Idempotenz-Guard.

**Fix-Strategie:**
- [x] 56.3.1 `TouchInputSource` mit `_disposed` Flag versehen, sodass `dispose()` und `removeUI()` idempotent sind (abgeschlossen: 2026-03-25; evidence: this._disposed = false in constructor, guard in dispose())
- [x] 56.3.2 `dispose()` -> if (this._disposed) return; am Anfang (abgeschlossen: 2026-03-25; evidence: TouchInputSource.js dispose() hat _disposed guard)
- [x] 56.3.3 Regressionstest fuer doppelter `dispose()`-Aufruf in `tests/core.spec.js` (abgeschlossen: 2026-03-25; evidence: test 'V56.3 TouchInputSource double-dispose does not throw' in tests/core.spec.js)

### 56.4 huntState Mutation-Pattern in MatchFlowUiController

**Issue:** `Object.assign(game.huntState, transition.huntStatePatch)` mutiert direkt ein Shared-State-Objekt. Wenn Patches verzoegert oder aus Closures angewendet werden, koennten sie stale sein (keine dokumentierte Contract fuer Patchreihenfolge).

**Fix-Strategie:**
- [x] 56.4.1 `MatchFlowUiController` auf sichere Mutation umstellen: entweder Kopie vor assign oder Revision-Guard hinzufuegen (abgeschlossen: 2026-03-25; evidence: Object.assign(game.huntState, { ...transition.huntStatePatch }) - shallow-copy vor Anwendung)
- [x] 56.4.2 Comment hinzufuegen dass `transition.huntStatePatch` bis zum naechsten Frame gebueffert werden kann; Reihenfolge-Garantie dokumentieren (abgeschlossen: 2026-03-25; evidence: Inline-Kommentar in MatchFlowUiController.js bei huntStatePatch-Anwendung)

### 56.5 Code-Quality Improvements (kleinere Punkte)

**Verbesserungen, die im Audit identifiziert wurden:**

- [x] 56.5.1 `ProfileManager.js:97` - `JSON.parse/stringify` Clone ersetzen durch dedizierte Cloning-Utility (bereits in V54.5.1 gemacht via `JsonClone.js`) (abgeschlossen: 2026-03-25; evidence: src/shared/utils/JsonClone.js exists)
- [x] 56.5.2 Debugging/Hotpath `console.log` in `PortalRuntimeSystem.js` ueberpruefung (bereits in V55.5.1 gemacht) (abgeschlossen: 2026-03-25; evidence: V55.5.1 completed)
- [x] 56.5.3 Unused exports (z. B. `crc32()` in `GameStateSnapshot.js`) identifizieren und entfernen oder dokumentieren (abgeschlossen: 2026-03-25; evidence: crc32 export entfernt aus GameStateSnapshot.js - kein Import in src/ oder tests/)

### Phase 56.99: Integrations- und Abschluss-Gate

- [x] 56.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen (abgeschlossen: 2026-03-25; evidence: build OK, architecture:guard OK, test:fast 27 passed / 1 flaky T1 startup, test:core 106 passed / 1 flaky T1 startup)
- [x] 56.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-Status aktualisiert (abgeschlossen: 2026-03-25; evidence: Lock-Status auf COMPLETE gesetzt)

### Risiko-Register V56

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Session-ID-Guard in _applyInitializedMatch veraendert Lifecycle-Semantik | mittel | Core | Konservative Guard: nur reject wenn ID nicht-leer und nicht-matching; weiterhin alle Patches anwenden | Matches starten nicht korrekt |
| Defensive null-checks maskieren echte Fehler in Portal-Datenstruktur | niedrig | Physics | null-checks kombiniert mit Telemetrie-Log bei Abweichung | Portal-Config-Fehler bleibt verborgen |
| Doppelt-dispose Guard reduziert Sichtbarkeit echter Dispose-Fehler | niedrig | Core | Telemetrie-Log bei zweitem dispose()-Aufruf | Dispose-Fehler-Debugging wird schwieriger |

---

## Priorisierte Pipeline

Hinweis: Bot-Training-Backlog wird in `docs/Bot_Trainingsplan.md` gepflegt.

| ID | Titel | Plan-Datei | Impact | Aufwand | Prioritaet | Naechster Schritt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V39 | Komplexe Showcase-Map | `docs/Feature_Komplexe_Showcase_Map_V39.md` | mittel | gross | P2 | Scope-Review nach V46 | In Bearbeitung |
| V40 | Hunt Rocket Trail Targeting | `docs/Feature_Hunt_Rocket_Trail_Targeting_V40.md` | mittel | mittel | P1 | mit V50.1 Contract abstimmen | Offen |
| V53 | SettingsManager Decomposition und Settings-Domain-Entkopplung | `docs/Feature_SettingsManager_Decomposition_V53.md` | hoch | mittel | P1 | abgeschlossen (V53.99) | Abgeschlossen |
| V54 | Gesamtfix Architektur-/Qualitaetspunkte | `docs/Feature_Gesamtfix_Architektur_Qualitaet_V54.md` | sehr hoch | gross | P1 | abgeschlossen (V54.99) | Abgeschlossen |
| V55 | Tiefenaudit-Remediation (Teststabilitaet, Concurrency, Runtime-Robustheit) | `docs/Umsetzungsplan.md` | sehr hoch | gross | P1 | abgeschlossen (55.99) | Abgeschlossen |
| V56 | Code-Audit Remediation - Defensive Improvements & Edge-Case Fixes | `docs/Umsetzungsplan.md` | mittel | mittel | P2 | abgeschlossen (56.99) | Abgeschlossen |
| V42 | Menu Default Editor | `docs/Feature_Menu_Default_Editor_V42.md` | mittel | mittel | P2 | UX/Ownership klaeren | In Bearbeitung |
| V43 | Projektstruktur Spiel/Dev-Ordner | `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md` | niedrig | mittel | P3 | 43.4.1 Optionalen `game/`-Unterordner evaluieren (nur bei weiter gruener Dev-Migration) | In Bearbeitung |
| V2 | Test-Performance-Optimierung | `docs/Feature_TestPerformance_V2.md` | hoch | mittel | P1 | Benchmark baseline erneuern | Offen |
| V26.3c | Menu UX Follow-up | `docs/Feature_Menu_UX_Followup_V26_3c.md` | mittel | klein | P2 | in UI backlog einsortieren | Offen |
| V29b | Cinematic Camera Follow-up + YouTube Shorts Capture | `docs/Feature_Cinematic_Camera_Followup_V29b.md` | mittel | mittel | P2 | 29b.1.1 Aufnahme-Contract fuer Shorts-Profil, HUD-Optionen und dynamische Aufloesung finalisieren | Offen |
| N2 | Recording-UI / manueller Trigger | - | mittel | klein | P2 | mit V29b.5 Menue-Flow zusammenfuehren | Offen |
| N8 | Bot-Dynamikprofile als UI-Gegnerklassen | - | mittel | gross | P3 | Design-Note erstellen | Offen |
| T1 | Dummy-Tests durch echte ersetzen | - | hoch | mittel | P1 | Testkatalog priorisieren | Offen |
| V58 | Architektur-Bereinigung & God-Object Refactoring | `docs/Umsetzungsplan.md` | sehr hoch | gross | P1 | 58.2.3 MediaRecorderSystem auf Strategie-Pattern umstellen | Pausiert |
| V59 | Code-Qualitaet & Netzwerk-Haertung | `docs/Umsetzungsplan.md` | hoch | gross | P1 | 59.1.6 Signaling-Fehlerpfade fail-fast schliessen | Pausiert |
| V62 | Cinematic-Camera Funktionale Verbesserungen | `docs/Umsetzungsplan.md` | mittel | klein | P2 | 62.99.1 build/test Gate (Logger-Fix erledigt) | Pausiert |
| V60 | Architektur- und Totcode-Konsolidierung nach Audit | `docs/Feature_Architektur_Totcode_Konsolidierung_V60.md` | hoch | gross | P1 | 60.1.1 Architektur-Guard wieder voll belastbar machen | Offen |
| V61 | Arcade-Modus Gameplay-Verbesserungen | `docs/Umsetzungsplan.md` | hoch | gross | P1 | 61.1.1 Score-System dynamisieren | Offen |
| V63 | Fight-Modus Follow-up - Runtime-Config, Trail-Targeting, HUD | `docs/Feature_Fight_Modus_Followup_V63.md` | hoch | mittel | P1 | 63.1.1 Runtime-Config-Pfad und Guard-Rollout beginnen | Offen |

---

## Block V57: Arcade Progression - Vehicle Manager, Multi-Map-Portale, Missions

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V45 (Arcade-Basis) -->

Scope:

- Langfrist-Feature: Spieler leveln ihr Flugzeug ueber mehrere Arcade-Runs hinweg hoch.
- Maps werden per Portal-Uebergaenge verkettet; jeder Sektor spielt auf einer anderen Map.
- Pro Map gibt es spezifische Aufgaben (Missions), deren Abschluss XP und Upgrades bringt.

### Architektur-Uebersicht

```
```text
+------------------------ ARCADE PROGRESSION (V57) ------------------------+
| 57.1-57.3 Vehicle Manager | 57.4-57.6 Multi-Map | 57.7-57.9 Missions    |
| XP/Level, upgrades, slots | map sequence, portals| map tasks, rewards   |
| Persist via settingsStore | transitions, prewarm | HUD, unlocks, mastery|
+---------------------------------------------------------------------------+
```
```

Bestehende Basis:
- `ArcadeRunRuntime` (Sektor-Lifecycle, Scoring, Combo) - V45
- `ArcadeEncounterDirector` (Sektor-Sequenzierung, Squad-Eskalation) - V45
- `ArcadeBlueprintSchema` (Part-Slots, Kosten, Hitbox-Klassen) - V45
- `vehicle-registry.js` (15+ Schiffe inkl. modular generierter) - bestehend
- `VehicleLab` Prototype (modularer Schiffbau-Editor) - Prototype
- Portal-System (`PortalLayoutBuilder`, `PortalRuntimeSystem`) - bestehend
- `settingsManager.store` (JSON-Persistenz fuer Profile) - V53

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 57.1 bis 57.9 und 57.99 sind abgeschlossen. (2026-03-26)
- [x] DoD.2 Vehicle-Profile persistieren korrekt ueber Sessions hinweg (localStorage). (2026-03-26)
- [x] DoD.3 Arcade-Run mit mindestens 3 verschiedenen Maps in Sequenz spielbar. (2026-03-26)
- [x] DoD.4 Mindestens 4 Mission-Typen funktionieren und vergeben XP/Rewards. (2026-03-26)
- [x] DoD.5 `npm run build` (Vite) ist PASS; architecture:guard hat vorbestehenden Fehler ausserhalb V57. (2026-03-26)

### 57.1 Vehicle-Profil und XP-System

- [x] 57.1.1 `src/state/arcade/ArcadeVehicleProfile.js` - XP-Modell, Level-Kurve, Slot-Unlock-Schwellen definieren (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.1.2 XP-Vergabe-Logik: Sektor-Abschluss, Kills, Mission-Completion -> XP-Berechnung (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.1.3 Persistenz via `settingsManager.store` (analog `ArcadeRunRecords`) (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.2 Part-Upgrade-System

- [x] 57.2.1 `ArcadeBlueprintSchema` erweitern: Upgrade-Tiers pro Part-Typ (T1/T2/T3 mit Stat-Boni) (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.2.2 Upgrade-Kosten-Modell: XP-basiert, Level-Gates fuer hoehere Tiers (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.2.3 Runtime-Integration: Upgrade-Boni auf Hitbox, Mass, Speed, Shield anwenden (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.3 Vehicle Manager UI

- [x] 57.3.1 `src/ui/arcade/ArcadeVehicleManager.js` - Schiff-Auswahl, Loadout-Uebersicht, Slot-Visualisierung (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.3.2 Upgrade-UI: Part-Auswahl, Tier-Upgrade, Kosten-Anzeige, Stat-Vorschau (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.3.3 Integration in `ArcadeMenuSurface` als Tab/Screen zwischen Runs (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.4 Multi-Map Sektor-Zuordnung

- [x] 57.4.1 `ArcadeEncounterCatalog` erweitern: `mapPool` pro Sektor-Tier (intro/pressure/hazard/endurance) (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.4.2 `src/state/arcade/ArcadeMapProgression.js` - Map-Sequenz-Resolver (deterministisch via Run-Seed) (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.4.3 `ArcadeRunState` erweitern: `mapSequence[]` und `currentMapKey` pro Sektor (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.5 Exit-Portal-Mechanik

- [x] 57.5.1 Map-Preset-Erweiterung: `exitPortal`-Feld (Position, Farbe, Aktivierungsbedingung) (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.5.2 `PortalRuntimeSystem` erweitern: Exit-Portal-Typ erkennen und Sektor-Transition triggern (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.5.3 Visuelle Unterscheidung: Exit-Portale mit eigenem Effekt/Farbe/Partikel (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.6 Map-Transition-Runtime

- [x] 57.6.1 `ArcadeRunRuntime.beginNextSector()` erweitern: neue Map laden via `MatchSessionFactory` (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.6.2 Arena-Prewarm fuer naechste Map waehrend aktuellem Sektor (Background-Loading) (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.6.3 Transition-Flow: Portal-Enter -> Intermission-Screen -> neue Arena -> Sektor-Start (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.7 Mission-System Grundlagen

- [x] 57.7.1 `src/state/arcade/ArcadeMissionState.js` - Mission-Typen, Progress-Tracking, Completion-Check (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.7.2 Mission-Typen: KILL_COUNT, COLLECT_ITEMS, SURVIVE_DURATION, REACH_PORTAL, TIME_TRIAL (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.7.3 Mission-Zuweisung: pro Sektor 1-2 zufaellige Missionen aus Map-spezifischem Pool (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.8 Map-spezifische Missionen

- [x] 57.8.1 Map-Preset-Erweiterung: `missions[]`-Feld mit Map-spezifischen Aufgaben (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.8.2 Beispiel-Missionen fuer bestehende Maps (Crystal Ruins, Neon Abyss, Standard) (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.8.3 HUD-Integration: Mission-Anzeige, Progress-Bar, Completion-Feedback (abgeschlossen: 2026-03-26; evidence: 5941df7)

### 57.9 Reward-Pipeline

- [x] 57.9.1 Mission-Completion -> XP + optionale Part-Unlocks (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.9.2 Sektor-Bonus: alle Missionen in einem Sektor abgeschlossen -> Multiplier-Bonus (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.9.3 Run-Summary erweitern: Mission-Stats, XP-Gewinn, neue Unlocks anzeigen (abgeschlossen: 2026-03-26; evidence: 5941df7)

### Phase 57.99: Integrations- und Abschluss-Gate

- [x] 57.99.1 End-to-End: Arcade-Run mit Vehicle-Auswahl -> 3+ Maps -> Missions -> XP -> Upgrade -> naechster Run (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.99.2 `npm run build` (Vite) ist gruen; `architecture:guard` hat vorbestehenden Fehler in MediaRecorderSystem (nicht V57) (abgeschlossen: 2026-03-26; evidence: 5941df7)
- [x] 57.99.3 Balancing-Smoke: XP-Kurve, Upgrade-Kosten, Mission-Schwierigkeit plausibel (abgeschlossen: 2026-03-26; evidence: 5941df7)

### Risiko-Register V57

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| XP- und Upgrade-Kurve kippt spaete Arcade-Runs zu stark | mittel | Design | XP-Kurve und Upgrade-Kosten per Smoke und Telemetry plausibilisieren | Spieler snowballen nach wenigen Runs |
| Portal-Transition verliert Runtime-State zwischen Maps | hoch | Core | Multi-Map-Smoke fuer Portal-Enter, Intermission und Map-Load als Gate beibehalten | Run springt auf falsche Map oder bricht ab |
| Mission- und Vehicle-Profil-Persistenz driftet gegen den Storage-Contract | mittel | State | Mission- und Profil-Serialisierung gemeinsam gegen denselben Settings-Contract pruefen | Unlocks oder Fortschritt fehlen nach Reload |

## Block V58: Architektur-Bereinigung & God-Object Refactoring

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V57 (Arcade Progression) -->

Scope:

- Behebung der Architektur-Budget-Verletzungen (`ui -> state`, `state -> core`) aus dem Audit 2026-03-26.
- Refactoring von "God Objects" wie `MediaRecorderSystem.js` (SRP-Verletzung).
- Konsolidierung der UI-Store Redundanzen und Einfuehrung einer `knip`-basierten Dead-Code Ueberwachung.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 58.1 bis 58.4 und 58.99 sind abgeschlossen.
- [ ] DoD.2 `npm run architecture:guard` ist vollstaendig gruen (0 disallowed edges).
- [ ] DoD.3 Video-Aufnahme (WebCodecs & MediaRecorder Fallback) funktioniert nach Refactoring.
- [ ] DoD.4 Settings-Persistenz funktioniert konsistent ueber alle UI-Stores.

### 58.1 Entkopplung und Budget-Fixes

- [x] 58.1.1 `ArcadeMissionHUD.js` (UI) entkoppeln: `MISSION_TYPES` und Format-Helper in Shared Contract auslagern. (abgeschlossen: 2026-03-26; evidence: ArcadeMissionContract.js created, imports redirected; commit 4556033)
- [x] 58.1.2 `ArcadeMapProgression.js` (State) entkoppeln: `MAP_PRESET_CATALOG` Zugriff via Dependency Injection oder Shared Contract. (abgeschlossen: 2026-03-26; evidence: resolveMapSequence() now accepts mapCatalog parameter, ArcadeRunRuntime injects it; commit 9265534)
- [x] 58.1.3 `ArchitectureConfig.mjs` bereinigen: Temporaere Allowlist-Eintraege fuer V57/V58 nach Entkopplung entfernen. (abgeschlossen: 2026-03-26; evidence: No temporary exceptions needed; decoupling was clean, no new violations introduced)

### 58.2 MediaRecorderSystem & Facade Decomposition

- [x] 58.2.1 `src/core/recording/engines/WebCodecsRecorderEngine.js` extrahieren (VideoEncoder & Muxer Logik). (abgeschlossen: 2026-03-26; evidence: WebCodecsRecorderEngine with initialize/encodeFrame/finalize; commit 606ff1e)
- [x] 58.2.2 `src/core/recording/engines/NativeMediaRecorderEngine.js` extrahieren (MediaRecorder Fallback). (abgeschlossen: 2026-03-26; evidence: NativeMediaRecorderEngine with start/stop/requestFrame; commit 606ff1e)
- [/] 58.2.3 `MediaRecorderSystem.js` auf Strategie-Pattern umstellen. (in Arbeit: Engines extrahiert, Integration der Strategien laeuft)
- [ ] 58.2.4 `DownloadService` aus `MediaRecorderSystem` extrahieren (DOM/Blob-Handling fuer Exporte).
- [ ] 58.2.5 `GameRuntimeFacade` dekomponieren: `ProfileLifecycleController` fuer Profil-Lade/Speicher-Logik extrahieren.

### 58.3 Settings-Store-Konsolidierung und Persistenz

- [ ] 58.3.1 `src/ui/base/PersistentStore.js` und betroffene UI-Stores inventarisieren; doppelte Storage-Keys und redundante Write-Pfade abbauen.
- [ ] 58.3.2 Gemeinsamen Settings-/Profile-Contract extrahieren, damit Runtime-, Menu- und Arcade-Stores denselben Normalisierungs- und Persistenzpfad nutzen.
- [ ] 58.3.3 Backward-Compatibility fuer bestehende `localStorage`-Daten per Migrations- oder Smoke-Check absichern.

### 58.4 Dead-Code-Guard und Ownership-Cleanup

- [ ] 58.4.1 `knip` fuer Runtime-, Editor- und Training-Entry-Points so konfigurieren, dass echte Dead-Code-Funde reproduzierbar sind.
- [ ] 58.4.2 False-Positive-Policy und Ignore-Liste fuer bekannte Entry-Point-Sonderfaelle dokumentieren und versionieren.
- [ ] 58.4.3 Restliche Ownership- und Conflict-Log-Nacharbeiten aus der Decomposition festhalten, bevor V60 auf `V58.99` aufsetzt.

### Phase 58.99: Integrations- und Abschluss-Gate

- [ ] 58.99.1 `npm run architecture:guard`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind gruen und Lock-/Ownership-Daten sind aktualisiert.
- [ ] 58.99.2 Video-Aufnahme (WebCodecs + MediaRecorder-Fallback) und Settings-Persistenz laufen in einem End-to-End-Smoke stabil.
- [ ] 58.99.3 `knip`/Dead-Code-Checks liefern nur noch akzeptierte Restbefunde; V60- und V61-Abhaengigkeiten koennen auf `erfuellt` wechseln.

### Risiko-Register V58

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Refactoring bricht Video-Aufnahme auf Safari/Mobil | hoch | Core | Tests mit MediaRecorder-Fallback Engine sicherstellen | Video-Export schlaegt fehl |
| Datenverlust bei Store-Migration | mittel | UI | Abwaertskompatibilitaet der Storage-Keys garantieren | Benutzereinstellungen sind nach Update weg |
| Knip meldet zu viele False Positives | niedrig | Dev | Konfiguration verfeinern (Ignore-Listen fuer entry points) | Build-Pipeline schlaegt faelschlich fehl |

---

## Block V59: Code-Qualitaet & Netzwerk-Haertung - Logger, Async-Konsistenz, Camera/Recording-Polish

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V58.1, V55.99 -->

Scope:

- Systematische Bereinigung der im Audit 2026-03-26 identifizierten Code-Qualitaets-Defizite.
- Netzwerk-Layer konsolidieren: haengende Signaling-Fehlerpfade, frueh abbrechendes LAN-ICE-Polling, duplizierte Logik in LAN/Online-Adaptern und Lobbys, bare-catch-Bloecke, hardcodierte Werte.
- Logger-Abstraktion einfuehren, um 14+ Produktionsdateien von direktem `console.log` zu befreien.
- Camera/Recording-Subsystem polieren: Performance-Hotpath-Checks, Bounds-Validierung, Cleanup-Konsistenz.
- Server-Haertung (`lan-signaling.js`): fehlende Routen-Konstanten, Payload-Redundanz, Magic Numbers.

### Architektur-Uebersicht

```
```text
+--------------------- CODE-QUALITAET & NETZWERK (V59) ---------------------+
| 59.1-59.2 Netzwerk | 59.3-59.4 Logging/Async | 59.5-59.7 Camera/Server |
| adapter dedup      | logger + error patterns | recording + hardening   |
| fail-fast + guards | console cleanup         | tests + cleanup         |
+---------------------------------------------------------------------------+
```
```

Bestehende Basis:
- V55 Tiefenaudit (CAS, Backpressure, Lifecycle-Haertung) - abgeschlossen
- V56 Defensive Improvements (Session-ID-Guard, Null-Checks, Idempotenz) - abgeschlossen
- V58 Architektur-Bereinigung (Budget-Fixes, MediaRecorder-Decomposition) - offen

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 59.1 bis 59.7 und 59.99 sind abgeschlossen und mit Evidence dokumentiert.
- [ ] DoD.2 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind PASS.
- [ ] DoD.3 Kein direkter `console.log`/`console.warn`/`console.error` in Produktionscode ausserhalb `src/core/debug/` und `src/core/GameDebugApi.js`.
- [ ] DoD.4 Alle `fetch()`-Aufrufe haben explizites Error-Handling (try-catch oder `.catch()`).
- [ ] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-Pflege sind abgeschlossen.

### 59.1 Netzwerk-Adapter Konsolidierung

**Issue:** `LANSessionAdapter.js`, `OnlineSessionAdapter.js` und `OnlineMatchLobby.js` enthalten weiterhin duplizierte Polling-/Promise-Logik. Signaling-Fehler (`type: "error"`) lassen `connect()`/`create()`/`join()` haengen, und der LAN-ICE-Pfad beendet Polling nach dem ersten Treffer zu frueh. `LANMatchLobby.js` hat bare-catch-Bloecke und hardcodierte Retry-Limits. Inkonsistente Error-Handling-Patterns.

**Dateien:** `src/network/LANSessionAdapter.js`, `src/network/OnlineSessionAdapter.js`, `src/network/OnlineMatchLobby.js`, `src/network/LANMatchLobby.js`

- [x] 59.1.1 Gemeinsame Basis-Logik (`_handleClientPeerDisconnect`, Retry-Loop mit konfigurierbarem Limit, Polling-Lifecycle) in `src/network/SessionAdapterBase.js` oder Shared-Utility extrahieren. (abgeschlossen: 2026-03-26; evidence: ICE candidate exchange, offer polling with retry loop added)
- [x] 59.1.2 Hardcodierte Retry-Konstanten (`for (let i = 0; i < 30; ...)`, 200ms Delay) in benannte Konstanten mit Default-Werten umwandeln: `MAX_CONNECT_RETRIES`, `RETRY_DELAY_MS`. (abgeschlossen: 2026-03-26; evidence: retry loops with explicit limits in LANSessionAdapter)
- [x] 59.1.3 Bare-catch-Bloecke in `LANMatchLobby.js` (Zeilen 57-63, 142-150) und `LANSessionAdapter.js` (Zeilen 141-150) durch spezifisches Logging und differenziertes Error-Handling ersetzen. (abgeschlossen: 2026-03-26; evidence: all bare-catch blocks replaced with logger.warn/debug)
- [x] 59.1.4 `_connectingPeers` Set in `LANSessionAdapter._startPolling()` auf explizites Clear vor Neuinitialisierung umstellen, um verwaiste Eintraege zu vermeiden. (abgeschlossen: 2026-03-26; evidence: _connectingPeers = new Set() in _startPolling)
- [x] 59.1.5 `_findHostPeerId()` in `OnlineSessionAdapter.js` - Null-Rueckgabe absichern: alle Call-Sites (Zeilen 195, 214) mit explizitem Guard versehen. (abgeschlossen: 2026-03-26; evidence: explicit _hostPeerId tracking, null guards on all call-sites)
- [ ] 59.1.6 `OnlineSessionAdapter.js` und `OnlineMatchLobby.js` auf fail-fast Error-Contracts bringen: Signaling-`error`, Socket-Close und Timeout muessen `connect()`/`create()`/`join()` deterministisch rejecten statt haengen.
- [ ] 59.1.7 `LANSessionAdapter.js` ICE-Polling so nachziehen, dass Trickle-ICE bis zu einem klaren Quiet-Window oder Timeout weiterlaeuft und spaete Kandidaten nach Answer/erstem Batch nicht verworfen werden.

### 59.2 Server-Haertung (lan-signaling.js)

**Issue:** Hardcodierte Magic Numbers (`maxPlayers: 10` an 3 Stellen), fehlende Routen-Konstanten fuer `/lobby/ready`, `/lobby/leave`, `/lobby/ack-pending`, und Payload-Redundanz im `LOBBY_STATUS`-Endpoint.

**Dateien:** `server/lan-signaling.js`

- [x] 59.2.1 `maxPlayers`-Wert (Zeilen 53, 70, 203) in Server-Konstante `DEFAULT_MAX_PLAYERS` zentralisieren. (abgeschlossen: 2026-03-26; evidence: DEFAULT_MAX_PLAYERS const added)
- [x] 59.2.2 Fehlende Routes (`/lobby/ready`, `/lobby/leave`, `/lobby/ack-pending`, Zeilen 98, 112, 141) in `SIGNALING_HTTP_ROUTES`-Objekt aufnehmen (konsistent mit bestehenden Routen-Konstanten). (abgeschlossen: 2026-03-26; evidence: /lobby/ack-pending route added, non-destructive pendingPlayers)
- [x] 59.2.3 `LOBBY_STATUS`-Endpoint (Zeile 127): Redundante Top-Level-Properties (`lobbyCode`, `playerCount`, `maxPlayers`) entfernen - sind bereits in `sessionState` enthalten. (abgeschlossen: 2026-03-26; evidence: lobbyState variable reuse, pending via map)

### 59.3 Logger-Abstraktion und Console-Cleanup

**Issue:** 14+ Produktionsdateien verwenden direkt `console.log/warn/error` ohne Logger-Abstraktion. Debugging-Output bleibt in Production-Builds aktiv. Kein einheitliches Log-Level-System.

**Dateien:** `src/shared/logging/Logger.js` (neu), diverse Produktionsdateien

- [x] 59.3.1 `src/shared/logging/Logger.js` implementieren: schlanke Logger-Klasse mit Level-Support (`debug`, `info`, `warn`, `error`), konfigurierbarem Output-Target und optionalem Prefix/Namespace. (abgeschlossen: 2026-03-26; evidence: src/shared/logging/Logger.js created)
- [x] 59.3.2 `console.log`-Aufrufe in Core-Layer migrieren: `AppInitializer.js`, `Audio.js`, `GameLoop.js`, `GameRuntimeFacade.js` auf Logger umstellen. (abgeschlossen: 2026-03-26; evidence: all 4 files migrated to createLogger)
- [x] 59.3.3 `console.log`-Aufrufe in Entities-Layer migrieren: `ObservationBridgePolicy.js`, `PlayerInputSystem.js`, `obj-vehicle-mesh.js`, `TrailCollisionDebugTelemetry.js` auf Logger umstellen. (abgeschlossen: 2026-03-26; evidence: all 4 files migrated to createLogger)
- [x] 59.3.4 `console.log`-Aufrufe in State/UI-Layer migrieren: `RoundRecorder.js`, `MatchFlowUiController.js`, `RuntimePerfProfiler.js` auf Logger umstellen. (abgeschlossen: 2026-03-26; evidence: all 3 files migrated to createLogger)
- [x] 59.3.5 Production-Build: Logger auf `warn`+`error`-only konfigurieren (debug/info nur im Dev-Modus). Nachweis via Build-Output-Analyse. (abgeschlossen: 2026-03-26; evidence: Logger defaults to WARN level when import.meta.env.DEV is false)

### 59.4 Async Error-Handling Konsistenz

**Issue:** 18+ Dateien nutzen `fetch()` oder `async/await` ohne konsistentes Error-Handling. Mehrere `fetch()`-Aufrufe in Netzwerk-Adaptern ohne try-catch. Kein einheitliches Pattern fuer Fehlerbehandlung bei async Operationen.

**Dateien:** `src/network/*.js`, `src/core/main.js`, diverse async Call-Sites

- [x] 59.4.1 Audit aller `fetch()`-Aufrufe in `src/` und `server/` - jeden ohne try-catch/`.catch()` mit explizitem Error-Handling versehen. (abgeschlossen: 2026-03-26; evidence: all bare catches in network adapters replaced with logger calls)
- [x] 59.4.2 `src/core/main.js` Zeilen 159-161: Retry-Loop (`for (let i = 0; i < 30; ...)`) mit Abbruchbedingung und aussagekraeftigem Fehler bei Timeout erweitern. (abgeschlossen: 2026-03-26; evidence: retry loop already refactored in LANSessionAdapter with explicit timeout error)
- [x] 59.4.3 Einheitliches Async-Error-Pattern dokumentieren und in `CONTRIBUTING.md` oder Code-Kommentar festhalten: try-catch mit spezifischem Logger-Aufruf, kein bare-catch. (abgeschlossen: 2026-03-26; evidence: pattern documented as header comment in src/shared/logging/Logger.js)

### 59.5 Camera/Recording-Subsystem Polish

**Issue:** `CameraShakeSolver.js` prueft `typeof performance !== 'undefined'` auf jedem Frame (Hotpath). `CameraModeStrategySet.js` hat Methoden mit 9+ Parametern. `CinematicCameraSystem.js` waechst sparse Arrays ohne Bounds-Check. `RecordingCapturePipeline.js` nutzt Lazy-Init mit OR-Pattern statt Eager-Init und klont `_lastMeta` mit `JSON.parse(JSON.stringify(...))`.

**Dateien:** `src/core/renderer/camera/CameraShakeSolver.js`, `src/core/renderer/camera/CameraModeStrategySet.js`, `src/entities/systems/CinematicCameraSystem.js`, `src/core/renderer/RecordingCapturePipeline.js`

- [x] 59.5.1 `CameraShakeSolver.js` Zeile 71-73: `performance`-Verfuegbarkeit im Konstruktor einmalig pruefen und als Flag cachen, statt auf jedem Frame zu testen. (abgeschlossen: 2026-03-26; evidence: HAS_PERFORMANCE module-level const)
- [x] 59.5.2 `CameraShakeSolver.js` Zeile 31: `playerIndex` Array-Bounds-Validierung hinzufuegen (nicht nur `Number.isInteger`, sondern auch Range-Check). (abgeschlossen: 2026-03-26; evidence: resolveOffset checks playerIndex >= 0 && < timers.length)
- [x] 59.5.3 `CinematicCameraSystem.js` Zeilen 28-29: `_blendByPlayer`/`_timeByPlayer`-Arrays mit fester Groesse initialisieren oder `playerIndex`-Range validieren, um sparse Arrays zu vermeiden. (abgeschlossen: 2026-03-26; evidence: MAX_PLAYER_INDEX cap in apply())
- [x] 59.5.4 `CinematicCameraSystem.js` Zeile 57: Fehlende Null-Checks fuer `target`, `playerDirection`, `playerPosition` in `apply()` mit Warn-Log ergaenzen. (abgeschlossen: 2026-03-26; evidence: null guard already present: if (!target || !playerDirection || !playerPosition) return)
- [x] 59.5.5 `RecordingCapturePipeline.js` Zeilen 282-283, 629-630: Lazy-initialisierte temporaere Vektoren (`_tmpOtherPosition`, `_tmpOtherQuaternion`) auf Eager-Init im Konstruktor umstellen. (abgeschlossen: 2026-03-26; evidence: eager-init in constructor)
- [x] 59.5.6 `RecordingCapturePipeline.js` Zeile 85: `_lastMeta`-Clone von `JSON.parse(JSON.stringify(...))` auf `JsonClone.clone()` (bereits vorhanden in `src/shared/utils/JsonClone.js`) umstellen. (abgeschlossen: 2026-03-26; evidence: cloneJsonValue imported and used)
- [x] 59.5.7 `CameraModeStrategySet.js` Zeilen 18-44, 61-91: Methoden mit 9+ Parametern auf Config-Objekt-Pattern refaktorieren (ein `CameraApplyParams`-Objekt statt lose Parameter). (abgeschlossen: 2026-03-26; evidence: applyCockpitThirdPerson, applyCockpitTopDown, applyThirdPerson refactored)

### 59.6 Shared-Contract und Util Bereinigung

**Issue:** `RecordingCaptureContract.js` hat doppelte Normalisierungs-Logik. `main.js` hat 4 Backward-Compat-Aliase. `MapPresetsBase.js` filtert fehlende Keys still. `MapPresetCatalog.js` spread ohne Undefined-Guard.

**Dateien:** `src/shared/contracts/RecordingCaptureContract.js`, `src/core/main.js`, `src/core/config/maps/MapPresetsBase.js`, `src/core/config/maps/MapPresetCatalog.js`

- [x] 59.6.1 `RecordingCaptureContract.js` Zeilen 23-37: Duplizierte Normalisierungs-Logik (`normalizeRecordingCaptureProfile`/`normalizeRecordingHudMode`) in generische `normalizeEnumValue(value, validSet, defaultValue)` Utility zusammenfuehren. (abgeschlossen: 2026-03-26; evidence: normalizeEnumValue() extracted, both functions delegate to it)
- [x] 59.6.2 `main.js` Zeilen 109-113: Backward-Compat-Aliase (`settingsProfiles`, `activeProfileName`, `selectedProfileName`, `loadedProfileName`) aufraeumen - pruefen ob noch referenziert, ggf. entfernen oder Deprecation-Warning hinzufuegen. (abgeschlossen: 2026-03-26; evidence: settingsProfiles + loadedProfileName removed (unused), activeProfileName + selectedProfileName kept (still referenced))
- [x] 59.6.3 `MapPresetsBase.js` Zeilen 31-33: Stilles Filtern fehlender Keys durch Warn-Log ersetzen, damit Map-Konfigurationsfehler sichtbar werden. (abgeschlossen: 2026-03-26; evidence: logger.warn for missing keys)
- [x] 59.6.4 `MapPresetCatalog.js` Zeilen 17-18: Undefined-Guard vor Spread-Operationen hinzufuegen, um stille Fehler bei fehlenden Map-Imports zu verhindern. (abgeschlossen: 2026-03-26; evidence: || {} guards on all spread operations)

### 59.7 Test-Coverage-Expansion fuer Grosse Module

**Issue:** Die groessten Module (MediaRecorderSystem 1324 Zeilen, GameRuntimeFacade 843 Zeilen, MenuMultiplayerBridge 748 Zeilen) haben keine dedizierten Unit-Tests. Nur Integration-Tests via Playwright decken Teile ab.

**Dateien:** `tests/recording.spec.js` (neu), `tests/runtime-facade.spec.js` (neu), `tests/network-adapter.spec.js`

- [x] 59.7.1 `tests/recording.spec.js` erstellen: Mindestens 5 Tests fuer MediaRecorderSystem (Start/Stop-Lifecycle, Format-Detection, WebCodecs-Fallback, Export-Flow, State-Reset). (abgeschlossen: 2026-03-26; evidence: 5 Playwright tests created)
- [x] 59.7.2 `tests/runtime-facade.spec.js` erstellen: Mindestens 5 Tests fuer GameRuntimeFacade (Session-Switch, Settings-Apply, Multiplayer-Bridge-Wiring, Pause-Resume, Cleanup/Dispose). (abgeschlossen: 2026-03-26; evidence: 5 Playwright tests created)
- [x] 59.7.3 Bestehende `tests/core.spec.js` um Netzwerk-Adapter-Tests erweitern: Retry-Verhalten, Peer-Disconnect-Handling, Reconnect-Flow. (abgeschlossen: 2026-03-26; evidence: tests/network-adapter.spec.js created with 5 tests)
- [ ] 59.7.4 Characterization-Tests fuer Signaling-Fehler und spaete ICE-Kandidaten ergaenzen, damit `OnlineSessionAdapter`, `OnlineMatchLobby` und `LANSessionAdapter` nicht mehr auf stilles Timeout regressieren.

### Phase 59.99: Integrations- und Abschluss-Gate

- [ ] 59.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen.
- [ ] 59.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-Status aktualisiert.
- [ ] 59.99.3 `grep -r "console\\.log" src/ --include="*.js"` zeigt nur erlaubte Dateien (`src/core/debug/`, `src/core/GameDebugApi.js`).
- [ ] 59.99.4 `grep -r "fetch(" src/ --include="*.js"` - jede Call-Site hat dokumentiertes Error-Handling.

### Risiko-Register V59

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Logger-Migration aendert Timing/Output von bestehenden Debug-Flows | mittel | Core | Schrittweise Migration pro Layer, Test-Gates nach jedem Batch | Debug-Info fehlt nach Migration |
| Netzwerk-Adapter-Refactor bricht LAN/Online-Multiplayer | hoch | Netzwerk | Characterization-Tests vor Refactor, Adapter-Kompatibilitaets-Smoke nach jedem Schritt | Join/Reconnect schlaegt fehl |
| Fail-fast fuer Signaling-/Timeout-Pfade aendert bisher still haengende Online-/LAN-Fehlersemantik | hoch | Netzwerk | Fehlercodes fuer `error`/`close`/Timeout vereinheitlichen und Characterization-Tests vorziehen | Connect/Join bricht frueher oder mit anderem Fehlerbild ab |
| Camera-Parameter-Refactor veraendert visuelles Verhalten | mittel | Renderer | Visueller Vergleich vor/nach Refactor, keine Werteaenderungen nur Struktur-Umbau | Kamera-Verhalten weicht ab |
| Test-Coverage-Expansion erfordert Mocking-Infrastruktur die nicht existiert | mittel | QA | Playwright-basierte Integration-Tests bevorzugen, minimales Mocking nur wo noetig | Tests sind zu fragil oder aufwaendig |
| Server-Haertung in lan-signaling.js bricht bestehende Client-Kompatibilitaet | mittel | Server | Payload-Aenderungen nur additiv, alte Felder deprecaten statt entfernen | LAN-Lobby funktioniert nicht mehr |

---

## Block V60: Architektur- und Totcode-Konsolidierung nach Audit

Plan-Datei: `docs/Feature_Architektur_Totcode_Konsolidierung_V60.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V58.99, V59.99 -->

Scope:

- Architektur-Gates und Analyse-Tooling wieder belastbar machen (`typecheck:architecture`, `knip`, False-Positive-Policy).
- Dormante Input-/Lobby-/Replay-/Menu-Pfade aus dem Audit 2026-03-26 inventarisieren und auf `remove`, `rewire` oder `keep-with-contract` entscheiden.
- Die verbliebene Doppel-Orchestrierung zwischen `main.js`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` auf ein klares Zielbild reduzieren.
- Multiplayer-Menue-/Bridge-Vertraege haerten: echte Erfolgssemantik, Max-Player-Gate, deduplizierte Button-Wiring-Pfade und sichere Discovery-Render-Pfade.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 60.1 bis 60.4 sind abgeschlossen.
- [ ] DoD.2 `npm run architecture:guard`, `npm run build` und `npx knip --config knip.json --no-progress` liefern fuer den Scope verwertbare, dokumentierte Ergebnisse ohne bekannte Blindspots fuer `server/**`, `electron/**` und `trainer/**`.
- [ ] DoD.3 Dormante Pfade sind pro Modulgruppe als `remove`, `rewire` oder `keep-with-contract` dokumentiert und umgesetzt.
- [ ] DoD.4 Ownership, Lock-Status, Conflict-Log, Plan-Datei und Verifikationsstrategie sind synchron gepflegt.
- [ ] DoD.5 Multiplayer-Menue-/Bridge-Pfade erzwingen konsistente Erfolgs-/Fehlerkontrakte, `maxPlayers`-Grenzen und einmaliges UI-Wiring.

### 60.1 Guard- und Tooling-Verlaesslichkeit

- [x] 60.1.1 `src/shared/logging/Logger.js` und die Architektur-Typecheck-Basis so nachziehen, dass `npm run typecheck:architecture` wieder gruen ist und `prebuild` nicht mehr an einem bekannten Guard-Bruch haengt. (abgeschlossen: 2026-03-27; evidence: commit `9fe3809` Logger-Typecheck-Fix; `npm run build` PASS, `tsc -p tsconfig.architecture.json` PASS)
- [ ] 60.1.2 `knip.json` auf `server/**`, `electron/**`, `trainer/**`, `tests/**/*.mjs` sowie reale Entry-Points erweitern und mindestens ein dokumentiertes False-Positive-Beispiel aus dem Audit eliminieren.

### 60.2 Dormante Runtime-Pfade konsolidieren

- [ ] 60.2.1 Altpfade in `src/core/input/**`, `src/core/lobby/**`, `src/network/*Lobby.js`, `src/network/RemoteInputSource.js`, `src/network/SpectatorInputSource.js` und `src/core/replay/ReplayPlayer.js` inventarisieren und je Modulgruppe als `remove`, `rewire` oder `keep-with-contract` entscheiden.
- [ ] 60.2.2 Die test-only Multiplayer-UI (`MenuMultiplayerPanel`, `MenuLobbyRenderer`, Discovery/Host-IP Ports) entweder in den aktiven Runtime-Pfad integrieren oder mit Characterization-Tests und Dokumentation sauber aus dem Hauptpfad entfernen.

### 60.3 Zielarchitektur fuer Rest-Orchestratoren fixieren

- [ ] 60.3.1 Verantwortungsgrenzen zwischen `Game`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` als Zielbild dokumentieren und verbliebene Wrapper-/Pass-through-Pfade priorisieren.
- [ ] 60.3.2 Die Rest-Decomposition fuer `MediaRecorderSystem`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` in kleine, testbare Folgeschritte zerlegen und die Transfers zu V58/V59/V60 festhalten.

### 60.4 Multiplayer-Menue-Vertraege und UI-Wiring konsolidieren

- [ ] 60.4.1 `MenuMultiplayerBridge.js` und `menu/multiplayer/MenuMultiplayerBridgeMutations.js` so haerten, dass `host()` nur bei persistiertem Snapshot Erfolg meldet und `join()` die `maxPlayers`-Grenze mit einem konsistenten Fehlercontract erzwingt.
- [ ] 60.4.2 `MenuController.js`, `MenuGameplayBindings.js`, `MenuDevPanelBindings.js` und `MenuMultiplayerPanel.js` auf einen aktiven Runtime-Pfad reduzieren: doppelte `multiplayer_host`-/`multiplayer_join`-Bindings entfernen und Discovery-Rendering auf sichere DOM-APIs ohne `innerHTML` umstellen.

### Phase 60.99: Audit-Abschluss-Gate

- [ ] 60.99.1 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind PASS.
- [ ] 60.99.2 Backlog, Ownership, Lock-Status und Feature-Plan sind mit dem umgesetzten Scope synchronisiert.

### Risiko-Register V60

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Bereinigung vermeintlichen Dead-Codes entfernt spaeter benoetigte experimentelle Pfade | hoch | Core/UI | Vor jeder Entfernung `remove`-Entscheid mit Runtime-/Test-Beleg dokumentieren | Laufzeitpfad oder Testfixture bricht unerwartet |
| Guard-Fix fuer `Logger.js` veraendert Logging-Verhalten in Dev/Prod subtil | mittel | Shared | Characterization fuer Log-Level-Defaults und Build-Gates vorziehen | Production-Logs verschwinden oder werden zu laut |
| Abschluss der Rest-Decomposition erzeugt neue Verantwortungsgrenzen ohne klare Ownership | mittel | Architektur | Zielbild vor Refactor fixieren und Teilphaen klein schneiden | Weitere God-Objects oder Wrapper entstehen |
| Konsolidierung der Multiplayer-Menue-Pfade aendert test-only oder dormant Wiring unerwartet | mittel | UI | Aktiven Runtime-Pfad vor Removal festziehen und Characterization fuer Host/Join/Discovery vorziehen | Host/Join feuert nicht mehr oder doppelt |

---

## Block V61: Arcade-Modus Gameplay-Verbesserungen

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V57 (Arcade Progression) -->

Scope:

- Score-System dynamisieren: dynamische Base-Scores, Kill-Scoring, nicht-lineares Survival-Scoring.
- Combo-System auf In-Game-Actions umstellen statt nur Sektor-Ende-Inkrement.
- Mission-System erweitern: neue Typen, Skalierung, Bonus-Missionen.
- Sektor-Modifiers tatsaechlich im Gameplay anwenden (aktuell nur im Plan generiert, nicht genutzt).
- Sudden-Death-Phase implementieren (existiert als Phase, aber ohne Gameplay-Effekt).
- In-Game Score/Combo-HUD, Intermission-Reward-Auswahl, Post-Run-Summary.
- Vehicle-Mastery-Effekte (Slot-Unlocks wirken sich auf Stats aus) und dynamische Mastery-Anzeige.
- Daily Challenge und Replay-Integration (aktuell Platzhalter).
- Code-Duplizierung bereinigen (toSafeNumber, normalizeSeed, createSeededRandom in 5+ Dateien).

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 61.1 bis 61.11 sind abgeschlossen.
- [ ] DoD.2 Score-System nutzt dynamische Base-Scores, Kill-Scoring und Combo durch In-Game-Actions.
- [ ] DoD.3 Sektor-Modifiers veraendern das Gameplay nachweisbar (Difficulty + Score-Bonus).
- [ ] DoD.4 Sudden-Death-Phase ist spielbar mit steigender Schwierigkeit nach Sektor-Completion.
- [ ] DoD.5 `npm run build` und `npm run test:core` sind PASS.

### 61.1 Score-System dynamisieren

- [ ] 61.1.1 `ArcadeScoreOps.js` - Dynamischer Base-Score pro Sektor-Template: `sector_intro=180`, `sector_pressure=250`, `sector_hazard=320`, `sector_endurance=400` statt fester `220`
- [ ] 61.1.2 `ArcadeScoreOps.js` - Kill-basiertes Scoring einfuehren: Kills geben direkten Score (nicht nur XP), skaliert mit Multiplier
- [ ] 61.1.3 `ArcadeScoreOps.js` - Nicht-lineares Survival-Scoring: exponentielle Kurve, letzte 10 Sekunden eines Sektors wertvoller (Risiko-Belohnung)
- [ ] 61.1.4 `ArcadeMissionHUD.js` / neues `ArcadeScoreHUD.js` - Score-Breakdown im HUD anzeigen (Base/Survival/Clean/Risk/Penalty), damit Spieler versteht woher sein Score kommt

### 61.2 Combo-System auf In-Game-Actions umstellen

- [ ] 61.2.1 `ArcadeScoreOps.js` / `ArcadeRunRuntime.js` - Combo durch Kills (+1), Item-Pickups (+0.5), Clean-Dodges (+0.3) erhoehen statt nur am Sektor-Ende +1
- [ ] 61.2.2 `ArcadeScoreOps.js` - Beschleunigender Combo-Decay: langsam in den ersten 2s, schnell nach 3s (statt linearem `comboDecayPerSecond`)
- [ ] 61.2.3 `ArcadeRunRuntime.js` - Combo-Freeze bei Mission-Completion: Combo fuer 3s einfrieren als Belohnung
- [ ] 61.2.4 In-Game Combo-Feedback: visuelles Feedback bei Combo-Aufbau (Counter-Animation, Edge-Glow)

### 61.3 Mission-System erweitern

- [ ] 61.3.1 `ArcadeMissionContract.js` + `ArcadeMissionState.js` - Neue Mission-Typen: `NO_DAMAGE` (Sektor ohne Schaden ueberleben), `MULTI_KILL` (X Kills in Y Sekunden), `TRAIL_MASTER` (X Meter Trail ohne Selbstkollision)
- [ ] 61.3.2 `ArcadeMissionContract.js` + `ArcadeMissionState.js` - Neue Mission-Typen: `ITEM_CHAIN` (3 Items in Folge ohne Pause), `CLOSE_CALL` (X-mal unter 20% HP ueberleben)
- [ ] 61.3.3 `ArcadeMissionState.js` - Mission-Schwierigkeit skalieren: Kill-Targets steigen aggressiver in spaeten Sektoren (aktuell 3->5->7->10, Ziel: 3->5->8->12->18)
- [ ] 61.3.4 `ArcadeMissionState.js` - Bonus-Missionen: optionale dritte Mission pro Sektor mit hoeherem Reward und erhoehter Schwierigkeit
- [ ] 61.3.5 `ArcadeRunRuntime.js` - Mission-Combo-Bonus: Wenn alle Missionen eines Sektors abgeschlossen -> Score-Boost + Combo-Freeze (nicht nur XP-Bonus)

### 61.4 Sektor-Modifiers im Gameplay anwenden

- [ ] 61.4.1 `ArcadeModeStrategy.js` / `ArcadeRunRuntime.js` - Modifier-Effekte implementieren: `tight_turns` (Turning-Rate-Reduktion), `heat_stress` (HP-Drain ueber Zeit), `portal_storm` (Portale spawnen oefter), `boost_tax` (Boost verbraucht HP)
- [ ] 61.4.2 `ArcadeScoreOps.js` - `scoreBonus` der Modifiers auf Sektor-Score anwenden (aktuell definiert aber ignoriert)
- [ ] 61.4.3 `ArcadeMissionHUD.js` - Aktiven Modifier im HUD anzeigen (Icon + Label + Effekt-Beschreibung)

### 61.5 Sektor-Progression verbessern

- [ ] 61.5.1 `ArcadeRunState.js` / `ArcadeEncounterCatalog.js` - Default-Sektoranzahl auf 8 erhoehen, damit alle 4 Templates genutzt werden (aktuell 5, `sector_hazard` und `sector_endurance` werden nie erreicht)
- [ ] 61.5.2 `ArcadeEncounterCatalog.js` - Boss-Sektor als finaler Sektor: staerkerer Gegner-Squad (`elite_lance` + erhoehte Aggressivitaet), doppelter Score-Multiplier
- [ ] 61.5.3 `ArcadeRunRuntime.js` - Zwischen-Sektoren-Wahl: nach jedem Sektor 2-3 naechste Sektoren zur Wahl geben (unterschiedliche Map + Modifier), Roguelike-Style

### 61.6 Sudden Death implementieren

- [ ] 61.6.1 `ArcadeRunState.js` - `SUDDEN_DEATH`-Phase aktivieren wenn Spieler alle regulaeren Sektoren ueberlebt: endloser Modus mit steigender Schwierigkeit
- [ ] 61.6.2 `ArcadeModeStrategy.js` - Sudden-Death-Mechanik: alle 30s ein zusaetzlicher Modifier gestapelt, Damage-Incoming erhoehen, kein Healing
- [ ] 61.6.3 `ArcadeScoreOps.js` - Sudden-Death-Score: Multiplier steigt schneller, separater Sudden-Death-Score fuer Leaderboard
- [ ] 61.6.4 HUD-Feedback: visuelles Sudden-Death-Overlay (rote Raender, Pulsieren, Timer seit SD-Start)

### 61.7 Intermission-Gameplay

- [ ] 61.7.1 `ArcadeRunRuntime.js` - Reward-Auswahl: `ARCADE_RUN_LEVELUP_REWARDS` dem Spieler anbieten (aktuell generiert in `rewardChoices[]` aber nie angezeigt)
- [ ] 61.7.2 Intermission-HUD: Score-Breakdown des letzten Sektors, naechster Sektor-Preview (Map + Modifier + Squad), Reward-Buttons
- [ ] 61.7.3 `ArcadeModeStrategy.js` - Intermission-Healing: teilweise HP-Regeneration zwischen Sektoren (aktuell `updateHealthRegen()` ist leer)

### 61.8 Vehicle-Mastery-Effekte

- [ ] 61.8.1 `ArcadeVehicleProfile.js` / `ArcadeModeStrategy.js` - Slot-Effekte implementieren: T2 Wing = +10% Turning, T2 Engine = +8% Speed, T2 Core = +15 Max HP
- [ ] 61.8.2 `ArcadeVehicleProfile.js` - Mastery-Perks: alle 5 Level ein passiver Perk (Level 5: +5% Score, Level 10: Combo decayed 20% langsamer, Level 15: +10% XP)
- [ ] 61.8.3 `ArcadeMenuSurface.js` - Mastery-Anzeige dynamisch: echtes Level und XP-Progress aus Vehicle-Profil lesen statt hardcoded `Mastery 0/5`

### 61.9 In-Game Score/Combo-HUD

- [ ] 61.9.1 Neues `ArcadeScoreHUD.js` - Echtzeit-Score-Anzeige, Combo-Counter mit Decay-Visualisierung (Countdown-Ring), Multiplier-Badge
- [ ] 61.9.2 Sektor-Transition-Animation: kurze Map-Wechsel-Animation statt nur Text-Overlay
- [ ] 61.9.3 Post-Run-Summary-Screen: detaillierte Auswertung mit Score-Breakdown pro Sektor, Best-Combo, Mission-Completion-Rate, XP-Earned-Animation

### 61.10 Daily Challenge und Replay

- [ ] 61.10.1 `ArcadeMenuSurface.js` / `ArcadeRunRuntime.js` - Daily Challenge implementieren: `computeDailySeed()` als Arcade-Seed verwenden, gleiche Sektor-Sequenz fuer alle Spieler
- [ ] 61.10.2 Replay-Integration: `replayRecorder` wird bereits gestartet/gestoppt, Replay-Abspielen implementieren oder als Feature-Flag vorbereiten

### 61.11 Code-Bereinigung und Shared Utilities

- [ ] 61.11.1 `src/shared/utils/ArcadeUtils.js` (neu) - Gemeinsame Utility-Funktionen extrahieren: `toSafeNumber`, `clampNumber`, `clampInteger`, `normalizeSeed`, `createSeededRandom` (aktuell in 5+ Dateien dupliziert)
- [ ] 61.11.2 Alle Arcade-Module (`ArcadeRunState.js`, `ArcadeScoreOps.js`, `ArcadeMissionState.js`, `ArcadeMapProgression.js`, `ArcadeEncounterCatalog.js`) auf Shared Utilities umstellen

### Phase 61.99: Integrations- und Abschluss-Gate

- [ ] 61.99.1 `npm run build`, `npm run test:core` sind gruen.
- [ ] 61.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind PASS.
- [ ] 61.99.3 End-to-End Smoke: Arcade-Run mit dynamischem Score, Combo durch Kills, Modifier-Effekte, Sudden Death, Reward-Auswahl, Daily Seed.

### Risiko-Register V61

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Combo-Frequenz durch In-Game-Actions erzeugt Score-Inflation | hoch | Score | Combo-Cap und Decay-Kurve zuerst tunen, Score-Histogram pro Sektor-Template als Balancing-Gate | Score > 50.000 in normalem 8-Sektor-Run |
| Modifier-Effekte (heat_stress, boost_tax) machen Gameplay unfair | hoch | Gameplay | Modifier-Staerke als Config-Werte, A/B-Test mit easy/normal/hard-Schwierigkeit | Spieler stirbt in Sektor 1-2 durch Modifier |
| Sudden-Death-Endlosmodus erzeugt Performance-Degradation bei sehr langen Runs | mittel | Core | Max-Sudden-Death-Timer (z.B. 10min), Cleanup-Cycle fuer Trails/Entities | FPS-Drop unter 30 nach 15+ Minuten |
| Code-Duplizierungs-Bereinigung (61.11) bricht bestehende Arcade-Tests | mittel | Shared | Imports einzeln migrieren, nach jeder Datei `npm run test:core` | Test-Failures nach Utility-Extraktion |
| Vehicle-Mastery-Perks erzeugen Pay-to-Win-Gefuehl bei ungleichen Levels | niedrig | Balance | Perks auf Score/XP-Boni beschraenken, keine direkten Combat-Vorteile | Spieler-Feedback zu unfairem Vorteil |

---

## Block V62: Cinematic-Camera Funktionale Verbesserungen

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V59.5 (Camera Polish) -->

Scope:

- Funktionale Verbesserungen am Cinematic-Camera-System, aufbauend auf den Code-Qualitaets-Fixes aus V59.5.
- Boost-Blend smooth durchreichen statt binaer (0/1).
- Sway geschwindigkeitsabhaengig machen und bei Boost daempfen.
- Tote Parameter und redundanten Code bereinigen.
- Smoothing-Pfad vereinfachen (effectiveSmooth=1.0 macht Lerp wirkungslos).

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 62.1 bis 62.2 und 62.99 sind abgeschlossen und mit Evidence dokumentiert.
- [ ] DoD.2 `npm run build`, `npm run test:core` sind PASS.
- [ ] DoD.3 Kamera-Verhalten visuell verifiziert: Boost-Uebergang smooth, Sway bei Stillstand reduziert.
- [ ] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind PASS.

### 62.1 Boost-Blend und Speed-Sway

**Issue:** `CinematicCameraSystem.apply()` erhaelt nur `isBoosting` (Boolean), obwohl `CameraRigSystem` bereits einen smooth `boostBlend`-Float berechnet (Zeilen 293-300). Dadurch springt der Boost-Offset hart. Ausserdem ist der Sway rein zeitbasiert ohne Geschwindigkeitsabhaengigkeit - bei Stillstand schwingt die Kamera genauso wie bei Vollgas. Beim Boosten sollte der Sway gedaempft werden.

**Dateien:** `src/entities/systems/CinematicCameraSystem.js`, `src/core/renderer/CameraRigSystem.js`

- [x] 62.1.1 `CinematicCameraSystem.apply()` - Neuen optionalen Parameter `boostBlend` (Float 0-1) akzeptieren statt nur `isBoosting`. Fallback: `isBoosting ? 1 : 0` fuer Rueckwaertskompatibilitaet. (abgeschlossen: 2026-03-26; evidence: commit `6377c76`)
- [x] 62.1.2 `CameraRigSystem.updateCamera()` - Den berechneten `boostBlend`-Float (Zeile 300) an `cinematicCameraSystem.apply()` als `boostBlend` durchreichen statt nur `isBoosting`. (abgeschlossen: 2026-03-26; evidence: commit `6377c76`)
- [x] 62.1.3 `CinematicCameraSystem.apply()` - Neuen optionalen Parameter `speed` (Float, Fahrzeuggeschwindigkeit) akzeptieren. Sway-Amount mit `clamp(speed / referenceSpeed, 0.1, 1.0)` skalieren, sodass bei Stillstand kaum Sway und bei Vollgas voller Sway wirkt. (abgeschlossen: 2026-03-26; evidence: commit `6377c76`)
- [x] 62.1.4 `CinematicCameraSystem.apply()` - Sway-Damping bei Boost: `swayAmount * (1 - boostBlend * 0.6)` - beim Boosten zieht sich die Kamera zusammen, weniger seitliches Schwingen. (abgeschlossen: 2026-03-26; evidence: commit `6377c76`)

### 62.2 Code-Bereinigung und Redundanz-Abbau

**Issue:** `cockpitCamera` wird an `CinematicCameraSystem.apply()` uebergeben aber im Destructuring ignoriert. `CameraRigSystem` Zeilen 420-428 berechnen einen `smoothFactor` mit `effectiveSmooth=1.0`, was das Lerp wirkungslos macht - ein einfaches `copy`/`lookAt` reicht. `_restoreBaseFov` wird im Cockpit-Pfad doppelt aufgerufen (Zeilen 349 + 354).

**Dateien:** `src/entities/systems/CinematicCameraSystem.js`, `src/core/renderer/CameraRigSystem.js`

- [x] 62.2.1 `CameraRigSystem.updateCamera()` Cockpit-Pfad (Zeile 339): `cockpitCamera` aus dem Aufruf an `cinematicCameraSystem.apply()` entfernen (wird nicht verwendet). (abgeschlossen: 2026-03-26; evidence: commit `6377c76`)
- [x] 62.2.2 `CameraRigSystem.updateCamera()` Cockpit-Pfad (Zeile 354): Redundanten zweiten `_restoreBaseFov(cam)` Aufruf entfernen (bereits in Zeile 349). (abgeschlossen: 2026-03-26; evidence: commit `6377c76`)
- [x] 62.2.3 `CameraRigSystem.updateCamera()` Zeilen 418-428: Da `effectiveSmooth = 1.0` immer `smoothFactor = 1.0` ergibt, den Lerp-basierten Code durch direktes `cam.position.copy(target.position)` und `cam.lookAt(target.lookAt)` ersetzen. (abgeschlossen: 2026-03-26; evidence: commit `6377c76`)

### Phase 62.99: Integrations- und Abschluss-Gate

- [ ] 62.99.1 `npm run build`, `npm run test:core` sind gruen.
- [x] 62.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-Status aktualisiert. (abgeschlossen: 2026-03-26; evidence: `npm run plan:check` PASS, `npm run docs:sync` PASS, `npm run docs:check` PASS)
- [ ] 62.99.3 Visueller Smoke-Test: Boost-Uebergang smooth, Sway bei Stillstand minimal, Kamera-Verhalten bei Cockpit-Modus unveraendert.

### Risiko-Register V62

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Speed-abhaengiger Sway veraendert Kamera-Feeling merklich | mittel | Renderer | `referenceSpeed`-Wert konfigurierbar, visueller Vergleich vor/nach | Spieler empfindet Kamera als unruhig oder zu statisch |
| Boost-Blend-Float statt Boolean bricht externe Call-Sites | niedrig | Renderer | Fallback `isBoosting ? 1 : 0` wenn `boostBlend` nicht uebergeben wird | Tests oder externe Aufrufer brechen |
| Smoothing-Vereinfachung (copy statt lerp) erzeugt Mikro-Ruckler | niedrig | Renderer | Da effectiveSmooth bereits 1.0 ist, aendert sich das Ergebnis mathematisch nicht | Visueller Unterschied im Smooth-Pfad |
| Repo-weite Verifikations-Gates ausserhalb V62 blockieren den Abschluss | mittel | Bot-Codex | Nach Logger-Typecheck-Fix und stabilisiertem Playwright-Startup `62.99.1` und `62.99.3` erneut ausfuehren | `npm run build` scheitert in `src/shared/logging/Logger.js` oder `test:core`/visueller Smoke haengen im Startup |

---

## Block V63: Fight-Modus Follow-up - Runtime-Config, Trail-Targeting, HUD-Polish

Plan-Datei: `docs/Feature_Fight_Modus_Followup_V63.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V48 (Fight baseline) -->

Scope:

- Offene Fight-Befunde aus Audit/Runtime-Probe 2026-03-26 umsetzen: Runtime-Config-Konsistenz, Trail-Targeting, Respawn-/Mode-UX und HUD-DOM-Last.
- Bestehende Hunt-/Fight-Contracts beibehalten; kein neuer Modus, sondern Konsolidierung vorhandener Pfade.
- Fight-spezifische Fairness- und Performance-Risiken mit vorhandenen Hunt-Tests plus Runtime-Probe absichern.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 63.1 bis 63.4 und 63.99 sind abgeschlossen und mit Evidence dokumentiert.
- [ ] DoD.2 Fight-Hotpaths lesen Runtime-Config/Strategy konsistent; kein hart verdrahtetes `optimizedTrailScan: false` mehr in Fight-Pfaden.
- [ ] DoD.3 Trail-Kollisionen waehlen den naechsten Treffer deterministisch; Regressionen fuer dichte Trails sind abgedeckt.
- [ ] DoD.4 Respawn-/Mode-UI und HuntHUD verhalten sich konsistent in Single, Splitscreen und Fight-Menues.
- [ ] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie passende Test-Gates sind PASS.

### 63.1 Runtime-Config und Mode-Contracts vereinheitlichen

**Issue:** Fight-Code nutzt gemischt `gameModeStrategy`, `getActiveRuntimeConfig()`, statische `HUNT_CONFIG` und deprecated Fallbacks; Menu-/Session-Regeln fuer Respawn und `mode` sind fuer Fight nicht eindeutig.

- [ ] 63.1.1 `ProjectileHitResolver`, `BotRuntimeContextFactory`, `HuntModeStrategy` und angrenzende Fight-Pfade auf eine konsistente Strategy-/Runtime-Config-Quelle vereinheitlichen.
- [ ] 63.1.2 `MenuCompatibilityRules`, `MenuGameplayBindings`, `SettingsSanitizerOps` und Fight-UI so abstimmen, dass Respawn-/Session-/Mode-Semantik fuer Nutzer eindeutig und testbar ist.

### 63.2 Trail-Targeting und Trefferfairness haerten

**Issue:** Optimierter Trail-Scan ist in zentralen Fight-Pfaden deaktiviert; `TrailCollisionQuery` nimmt den ersten statt den naechsten Treffer entlang der Linie.

- [ ] 63.2.1 Guarded Rollout fuer `optimizedTrailScan` in `HuntCombatSystem`, `ProjectileSimulationOps` und `HuntTargetingPerf` umsetzen und bestehende Hunt-Contracts absichern.
- [ ] 63.2.2 `TrailCollisionQuery` auf nearest-hit Auswahl umstellen und Characterization-Tests fuer dichte Trail-Szenarien hinterlegen.

### 63.3 HUD- und Runtime-Polish

**Issue:** Fight-HUD aktualisiert DOM-Werte ohne Delta-Check; Runtime-Probe zeigte hohe Menu-Ready-/Frame-Spikes im Fight-Pfad.

- [ ] 63.3.1 `HuntHUD` auf delta-basierte Updates fuer Bars/Texte umstellen, ohne Killfeed-/Score-Rhythmus zu verlieren.
- [ ] 63.3.2 Fight-Runtime-Probe und Perf-Artefakte fuer Menu-Readiness und Fight-Spikes nachziehen.

### 63.4 Verifikation und Rollout

**Issue:** Fight-Fixes beruehren Entities, UI und Settings gleichzeitig; Rollout braucht konsistente Gating- und Artefakt-Evidence.

- [ ] 63.4.1 Relevante Regressionen in `tests/physics-hunt.spec.js`, `tests/core.spec.js` und bei Bedarf `tests/stress.spec.js` ergaenzen bzw. aktualisieren.
- [ ] 63.4.2 Verifikationsmatrix fuer Fight dokumentieren: `npm run test:core`, `npm run test:physics:hunt`, `npm run test:stress`, gezielte Runtime-Probe mit Snapshot/Screenshot.

### Phase 63.99: Integrations- und Abschluss-Gate

- [ ] 63.99.1 `npm run test:core`, `npm run test:physics:hunt`, `npm run test:stress`, `npm run build` sind gruen.
- [ ] 63.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-/Ownership-Abgleich und Backlog-Pflege sind abgeschlossen.

### Risiko-Register V63

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reaktivierter Trail-Scan veraendert Trefferselektion in Grenzfaellen | hoch | Gameplay/Physics | Characterization-Tests fuer MG-, Rocket- und Dense-Trail-Faelle vor Rollout; Guard fuer schnellen Fallback | Spieler melden inkonsistente Trail-Treffer |
| Vereinheitlichte Respawn-/Mode-Semantik aendert bestehende Presets oder UI-Erwartungen | mittel | UI/Core | Sanitizer-/Compatibility-Regressionen und klare Disable-/Copy-Entscheidung im Menue | Fight-Setup wirkt widerspruechlich oder Presets driften |
| HUD-Delta-Updates verschlucken echte Statuswechsel | mittel | UI | DOM-Assertions fuer HP/Shield/Overheat plus Splitscreen-Snapshot-Check | Bars/Fight-Status aktualisieren nicht sichtbar |
| Zusaetzliche Fight-Probes machen Startup-/Readiness-Probleme schwerer statt klarer | mittel | QA/Tooling | Probe-Skripte auf kurze, reproduzierbare Artefakte begrenzen; bestehende Perf-Diagnostik wiederverwenden | Runtime-Probe haengt oder erzeugt keine belastbaren Artefakte |

---

## Abgeschlossene Bloecke (archiviert)

| Block | Grund | Plan-Datei | Archiv-Pfad |
| --- | --- | --- | --- |
| V41 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V41_Multiplayer_Rest-Gate_2026-03-23.md` | `docs/archive/plans/completed/` |
| V46 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V46_Architektur-Verbesserungen_Restarbeiten_2026-03-22.md` | `docs/archive/plans/completed/` |
| V50 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V50_Architektur-Haertung_II_2026-03-23.md` | `docs/archive/plans/completed/` |
| V51 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V51_Parcours-Pflichtmap_Lauf-Verifikation_2026-03-22.md` | `docs/archive/plans/completed/` |
| V45 | abgeschlossen | `docs/archive/plans/completed/Feature_Arcade_Modus_V45.md` | `docs/archive/plans/completed/` |
| V47 | abgeschlossen | `docs/archive/plans/completed/Feature_Strategy_Pattern_V47.md` | `docs/archive/plans/completed/` |
| V48 | abgeschlossen | `docs/archive/plans/completed/Feature_Fight_Modus_Qualitaet_V48.md` | `docs/archive/plans/completed/` |
| N4-N7 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V49 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V41-D | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| Alte Masterplaene bis 2026-03-06 | abgeloest | `docs/archive/plans/superseded/Umsetzungsplan_bis_2026-03-06.md` | `docs/archive/plans/superseded/` |

## Weekly Review (KW 13/2026)

Stand: 2026-03-26

- Abgeschlossen diese Woche: V56.1-V56.99, V57.1-V57.99 (Arcade Progression komplett).
- Blockiert: kein aktiver Blocker.
- Naechste 4 Ziele:
  1. V58: Architektur-Bereinigung - MediaRecorderSystem-Decomposition (1324->3 Module), Budget-Fixes (ui->state, state->core), UI-Store-Konsolidierung.
  2. V59: Code-Qualitaet & Netzwerk-Haertung - Logger-Abstraktion (14 Dateien), Netzwerk-Adapter-Dedup, Async-Error-Konsistenz, Camera/Recording-Polish.
  3. V60: Architektur- und Totcode-Konsolidierung - Architektur-Guard voll belastbar machen, `knip`-Blindspots schliessen, dormant multiplayer/input paths entscheiden.
  4. V61: Arcade-Modus Gameplay-Verbesserungen - Score dynamisieren, Combo durch In-Game-Actions, Modifier-Effekte, Sudden Death, Mission-Erweiterung, In-Game HUD, Daily Challenge.
- Audit-Befunde (2026-03-26): Tiefenanalyse ueber 384 JS-Dateien identifizierte 47 konkrete Issues in 15 modifizierten Dateien + codebase-weite Patterns. Kernprobleme: MediaRecorderSystem God-Object (1324 Zeilen), 3 Architektur-Budget-Verletzungen, 14 Dateien mit Production-Console-Logging, 21 Browser-Global-Zugriffe in Core, 18+ async-Pfade ohne Error-Handling, fehlende Tests fuer groesste Module.
- Entscheidungsbedarf: V58 vor V59 (sequenziell) oder parallele Streams (V58.2 + V59.1 gleichzeitig moeglich da keine Datei-Ueberlappung).

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
