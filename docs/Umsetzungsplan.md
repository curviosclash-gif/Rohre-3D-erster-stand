# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-23

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
| V41.99 | - | soft | ja | Rest-Gate kann isoliert weiterlaufen |
| V46 | V45.9 | hard | ja | V45-Integration abgeschlossen |
| V50 | V41.99, V46.99 | hard | ja | User-Override am 2026-03-23; V41.99 als erledigt markiert |
| V50 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Laufende Ratchet-Basis vorhanden |
| V51 | V50.99 | hard | ja | User-Override am 2026-03-22, Scope V51 vorgezogen umgesetzt |
| V51 | V39.9 | soft | ja | `parcours_rift` nutzt vorhandene Showcase-Muster und erweitert sie |
| V52 | V50.99 | hard | ja | V50.99 am 2026-03-23 abgeschlossen; Folge-Haertung kann starten |
| V52 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Bestehende Guard-Basis wird auf `server/**` und dynamic imports erweitert |
| V53 | V52.6 | soft | nein | Settings-Persistenz-Refactor bevorzugt nach zentralem Storage-Rollout, Parallelisierung nur ohne Contract-Drift |
| V53 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Guard-Basis fuer Decomposition und Import-Grenzen vorhanden |

## Datei-Ownership (aktive Arbeit)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `src/core/MediaRecorderSystem.js`, `src/core/GameRuntimeFacade.js`, `src/core/runtime/**`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/ui/menu/multiplayer/**` | V46 / 46.2 | abgeschlossen | Core/Menu-Decomposition abgeschlossen |
| `src/hunt/**`, `src/entities/ai/**`, `src/entities/systems/ProjectileSystem.js`, `src/ui/HuntHUD.js` | V46 / 46.3 | abgeschlossen | Hunt/AI-Cleanups abgeschlossen |
| `src/network/**`, `server/**`, `src/ui/menu/**`, `src/core/**`, `src/state/**` | V50 | abgeschlossen | Architektur-Haertung II abgeschlossen (Gate 50.99) |
| `src/network/OnlineSessionAdapter.js`, `src/network/LANSessionAdapter.js`, `src/network/StateReconciler.js`, `src/core/runtime/RuntimeSessionLifecycleService.js`, `src/core/InputManager.js`, `src/ui/TouchInputSource.js`, `scripts/architecture/**`, `scripts/check-architecture-*.mjs` | V52 | offen | Event-Contract, Layering-Guards, Input/Persistenz-Resthaertung |
| `src/core/SettingsManager.js`, `src/core/settings/**`, `src/core/runtime/MenuRuntimeSessionService.js`, `src/core/runtime/MenuRuntimePresetConfigService.js`, `src/core/runtime/MenuRuntimeDeveloperModeService.js`, `src/core/GameRuntimeFacade.js`, `tests/core.spec.js` | V53 | offen | Settings-Domain-Decomposition in Facades/Operations geplant |
| `scripts/perf-host-budget-v41.mjs`, `tmp/perf-host-budget-report-v41.json` | V41 / 41.99.4 | abgeschlossen | Host-Performance-Gate fuer 10 Spieler als Smoke + Report abgesichert |
| `src/entities/mapSchema/**`, `src/entities/systems/ParcoursProgress*`, `src/ui/HudRuntimeSystem.js`, `src/state/recorder/**`, `editor/js/EditorMapSerializer.js`, `src/core/config/maps/presets/parcours_maps.js` | V51 | abgeschlossen | Parcours-Objective End-to-End integriert |
| `docs/**`, `tests/**`, `scripts/validate-umsetzungsplan.mjs` | Shared | shared | Append-only oder eigener Abschnitt |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| A | V46.2 | 2026-03-22 | frei | - |
| B | V46.3 | 2026-03-22 | frei | - |
| C | V50 | 2026-03-22 | frei | - |
| D | V51 | 2026-03-22 | closed | 2026-03-22 |
| E | V52 | 2026-03-23 | frei | - |
| F | V53 | 2026-03-23 | frei | - |
| Bot-Codex | V41 / 41.99.4 | 2026-03-22 | closed | 2026-03-23 |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-22 | Bot-Codex | V50 | `src/core/**`, `src/state/**`, `src/ui/**` | V51 Objective/Overlay/Telemetry benoetigt Round-End- und HUD-Hooks in Shared-Schichten | Scope strikt auf Parcours-Felder und Objective-Reason begrenzt, Regressionstests (`test:core`, `test:physics`, `test:stress`) ausgefuehrt | abgeschlossen |

---

## Aktive Bloecke

## Block V41: Multiplayer Rest-Gate

Plan-Datei: `docs/Feature_Lokaler_Multiplayer_V41.md`

<!-- LOCK: frei -->

Scope:

- Restliche Real-World-Verifikation fuer Multiplayer-LAN/Internet.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Block-Phasen sind `[x]` inklusive 41.99.*.
- [ ] DoD.2 Relevante Tests/Smokes sind gruen (`test:core`, Multiplayer-Smokes).
- [ ] DoD.3 `npm run docs:sync` und `npm run docs:check` sind PASS.
- [ ] DoD.4 Evidence, Conflict-Log und Lock-Status sind konsistent.

### Phase 41.99: Abschluss-Gate

- [x] 41.99.1 LAN-Match auf 2+ Rechnern manuell verifizieren (stabiler Session-Lebenszyklus) (abgeschlossen: 2026-03-23; evidence: user-override -> docs/Umsetzungsplan.md)
- [x] 41.99.2 Internet-Match auf 2+ Rechnern via Signaling-Server verifizieren (abgeschlossen: 2026-03-23; evidence: user-override -> docs/Umsetzungsplan.md)
- [x] 41.99.3 Gamepad + Touch in Multiplayer validieren (abgeschlossen: 2026-03-23; evidence: user-override -> docs/Umsetzungsplan.md)
- [x] 41.99.4 Host-Performance bei 10 Spielern gegen Zielbudget pruefen (abgeschlossen: 2026-03-23; evidence: node scripts/perf-host-budget-v41.mjs -> tmp/perf-host-budget-report-v41.json)

### Risiko-Register V41

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reconnect-Drift zwischen LAN/Online | mittel | Netzwerk | End-to-End Testmatrix je Session-Typ | Disconnect/Resume Unterschiede |
| Multi-Input Regression (Gamepad/Touch) | mittel | UI | Dedizierte Input-Smokes + manuelle Matrix | UI/Input Event Konflikte |
| Performance-Einbruch bei 10 Spielern | hoch | Runtime | Profiling + CPU-Budget-Gate vor Abschluss | Host-FPS/CPU ausserhalb Ziel |

---

## Block V46: Architektur-Verbesserungen (Restarbeiten)

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V45.9 -->

Scope:

- God Objects weiter zerlegen (Core/Menu + Hunt/AI).
- Magic Numbers und Sensing-Pfade in klare Contracts/Konfigs ueberfuehren.

### Definition of Done (DoD)

- [x] DoD.1 46.2.* und 46.3.* sind abgeschlossen und per Tests abgesichert. (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics -> PASS)
- [x] DoD.2 46.99.* ist abgeschlossen und Gate-Invariante erfuellt. (abgeschlossen: 2026-03-22; evidence: plan status audit -> docs/Umsetzungsplan.md)
- [x] DoD.3 `npm run architecture:guard`, `npm run build` und relevante Tests sind PASS. (abgeschlossen: 2026-03-22; evidence: npm run architecture:guard && npm run build -> PASS)
- [x] DoD.4 Evidence-Format, Conflict-Log und Lock-Bereinigung sind erledigt. (abgeschlossen: 2026-03-22; evidence: npm run plan:check -> PASS)

### 46.2 Core- und Menu-Decomposition

- [x] 46.2.1 `MediaRecorderSystem` und `GameRuntimeFacade` in kleinere Module mit klaren Facades zerlegen (abgeschlossen: 2026-03-22; evidence: npm run build -> PASS (inkl. architecture:guard))
- [x] 46.2.2 `MenuMultiplayerBridge` entkoppeln und Runtime-Ports (`src/ui/menu/multiplayer/*`) per DI nutzen (abgeschlossen: 2026-03-22; evidence: npm run test:core -- --grep T41d -> commit 045de8b)

### 46.3 Hunt/AI-Cleanups und Modulgrenzen

- [x] 46.3.1 Magic Numbers in Hunt/Projectile/AI in Konfig-Objekte ueberfuehren und Sensing-Primitives abschliessen (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics -> PASS)
- [x] 46.3.2 `HuntHUD` nach `src/ui/` migriert, Lifecycle/Dispose verdrahtet (abgeschlossen: 2026-03-21; evidence: npm run test:physics:hunt -> commit f4b7f1b)

### Phase 46.99: Integrations- und Abschluss-Gate

- [x] 46.99.1 `npm run architecture:guard`, relevante Tests und Build sind gruen (nach 46.2.1 + 46.3.1) (abgeschlossen: 2026-03-22; evidence: npm run architecture:guard && npm run build -> PASS)
- [x] 46.99.2 `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen (abgeschlossen: 2026-03-22; evidence: npm run docs:sync && npm run docs:check -> PASS)

### Risiko-Register V46

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Regression durch Decomposition | hoch | Core | Kleine PR-Schritte + zielgerichtete Regressionstests | Fehler in Runtime-Start/Tick |
| Boundary-Drift bei Refactor | mittel | Architektur | `architecture:guard` in jedem Gate | Neue verbotene Imports |
| Unvollstaendige Legacy-Entkopplung | mittel | Runtime/UI | Explizite Removal-Checkliste pro Modul | Verbleibende Legacy Hooks |

---

## Block V50: Architektur-Haertung II - Netzwerk, Boundaries, Persistenz, Determinismus

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V41.99, V46.99 -->

Scope:

- Netzwerkpfade konsolidieren, Persistenz vereinheitlichen, Determinismus absichern.
- Zusetzliche God-Objects zerlegen und Governance auf Debt-Paydown umstellen.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 50.1 bis 50.9 sind abgeschlossen. (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> V50-Codeartefakte in `src/network/**`, `server/**`, `src/core/**`, `src/state/**`, `src/ui/**`)
- [x] DoD.2 50.99.* ist abgeschlossen und Gate-Invariante erfuellt. (abgeschlossen: 2026-03-23; evidence: docs/Umsetzungsplan.md -> Block V50 / 50.99.* auf `[x]`)
- [x] DoD.3 `architecture:guard`, `test:fast`, netzwerkbezogene Kernfaelle und `build` sind PASS. (abgeschlossen: 2026-03-23; evidence: npm run architecture:guard && npm run test:fast && npm run test:core -- --grep "T20d1|T20d2|T41d" && npm run build -> PASS)
- [x] DoD.4 Evidence, Conflict-Log, Lock-Bereinigung und Abschlussdokumentation sind sauber. (abgeschlossen: 2026-03-23; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

### 50.1 Netzwerk-Contract und SessionAdapter-Basis

- [x] 50.1.1 Gemeinsamen Multiplayer-Message-Contract (`join/ready/leave/reconnect/full_state_sync`) fuer `src/network/**` und `server/**` definieren und versionieren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/shared/contracts/MultiplayerSessionContract.js` + `src/shared/contracts/SignalingSessionContract.js`)
- [x] 50.1.2 Gemeinsame SessionAdapter-Basis fuer Reconnect/Heartbeat/Leave/State-Dispatch extrahieren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/network/SessionAdapterBase.js` + `src/network/LANSessionAdapter.js` + `src/network/OnlineSessionAdapter.js`)

### 50.2 Lobby/Signaling-Semantik angleichen

- [x] 50.2.1 `LANMatchLobby` und `OnlineMatchLobby` auf einheitliche Session-State-Datenstruktur umstellen (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/network/LANMatchLobby.js` + `src/network/OnlineMatchLobby.js` + `src/network/MatchLobbySessionState.js`)
- [x] 50.2.2 `server/signaling-server.js` und `server/lan-signaling.js` ueber denselben Protokollvertrag harmonisieren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `server/signaling-server.js` + `server/lan-signaling.js` + `src/shared/contracts/SignalingSessionContract.js`)

### 50.3 Boundary-Refactor `core -> ui`

- [x] 50.3.1 UI-nahe Imports in Core ueber Ports/Facades in eine Kompositionsschicht verschieben (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/composition/core-ui/CoreUi*.js` + `src/core/GameBootstrap.js` + `src/core/main.js`)
- [x] 50.3.2 Architektur-Checks um `core -> ui`-Budgets erweitern und Legacy-Kanten abbauen (abgeschlossen: 2026-03-23; evidence: npm run architecture:guard -> PASS (core -> ui disallowed imports: 0))

### 50.4 Persistenzplattform vereinheitlichen

- [x] 50.4.1 Gemeinsame Storage-Infrastruktur aufbauen (`StorageDriver`, Migration-Registry, Quota-Handling) (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/state/storage/StorageDriver.js` + `src/state/storage/StorageMigrationRegistry.js` + `src/state/storage/StoragePlatform.js`)
- [x] 50.4.2 Settings-/Menu-/Telemetry-Stores auf die gemeinsame Plattform migrieren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/ui/SettingsStore.js` + `src/ui/menu/MenuDraftStore.js` + `src/ui/menu/MenuPresetStore.js` + `src/ui/menu/MenuTelemetryStore.js` + `src/ui/menu/MenuTextOverrideStore.js`)

### 50.5 Deterministische Zeit-/RNG-Infrastruktur

- [x] 50.5.1 `RuntimeClock` und `RuntimeRng` als injizierbare Contracts einfuehren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/shared/contracts/RuntimeClockContract.js` + `src/shared/contracts/RuntimeRngContract.js`)
- [x] 50.5.2 Direkte Nutzung von `Date.now`/`Math.random`/`performance.now` in kritischen Pfaden per Guard reduzieren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `scripts/check-runtime-determinism.mjs`; npm run architecture:guard -> PASS)

### 50.6 Decomposition-Welle II (zusaetzliche God-Objects)

- [x] 50.6.1 `GameDebugApi` und `SettingsManager` in kleinere Domain-Facades aufteilen (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/core/GameDebugApi.js` + `src/core/debug/GameDebugTrainingFacade.js` + `src/core/SettingsManager.js` + `src/core/settings/SettingsTelemetryFacade.js`)
- [x] 50.6.2 `UIStartSyncController` und `WebSocketTrainerBridge` in Render-/Protocol-/Telemetry-Module zerlegen (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/ui/UIStartSyncController.js` + `src/entities/ai/training/WebSocketTrainerBridge.js` + `src/entities/ai/training/WebSocketTrainerBridgeTelemetry.js`)

### 50.7 EntityRuntimeCompat-Abbau

- [x] 50.7.1 Capability-basierte Runtime-Ports fuer Spawn/Combat/Collision/Trail definieren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/entities/runtime/EntityRuntimePorts.js` + `src/entities/runtime/EntityRuntimeAssembler.js`)
- [x] 50.7.2 `Object.assign(this, this.runtime.compat)` in `EntityManager` entfernen (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/entities/EntityManager.js` + `src/entities/runtime/EntityRuntimeCompat.js`)

### 50.8 Multiplayer-UI Channel-Ownership final absichern

- [x] 50.8.1 BroadcastChannel-Lifecycle ausschliesslich in `MenuMultiplayerBridge` halten (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/ui/menu/MenuMultiplayerBridge.js` + `src/ui/menu/multiplayer/MenuMultiplayerBridgeRuntime.js`)
- [x] 50.8.2 `MenuLobbyRenderer` als pure View ohne Channel-/Side-Effect-Verantwortung festschreiben (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `src/ui/menu/MenuLobbyRenderer.js`; git show --name-only 7378a60 -> `src/ui/menu/MenuMultiplayerPanel.js`)

### 50.9 Architektur-Governance auf Debt-Paydown umstellen

- [x] 50.9.1 Legacy-Budgets als Ratchet pflegen (nur sinkend) (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `scripts/check-architecture-ratchet.mjs` + `scripts/architecture/architecture-budget-ratchet.json`)
- [x] 50.9.2 Touched-File-Strict-Mode in Architektur-Checks/ESLint aktivieren (abgeschlossen: 2026-03-23; evidence: git show --name-only fee76ac -> `scripts/check-architecture-touched-strict.mjs` + `scripts/check-eslint-touched-strict.mjs` + `scripts/architecture/TouchedFiles.mjs`)

### Phase 50.99: Integrations- und Abschluss-Gate

- [x] 50.99.1 `npm run architecture:guard`, `npm run test:fast`, netzwerkbezogene Kernfaelle und `npm run build` sind gruen (abgeschlossen: 2026-03-23; evidence: npm run architecture:guard && npm run test:fast && npm run test:core -- --grep T20d1 && npm run test:core -- --grep T20d2 && npm run test:core -- --grep T41d && npm run build -> PASS)
- [x] 50.99.2 `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich, Lock-Bereinigung und Abschlussdokumentation abgeschlossen (abgeschlossen: 2026-03-23; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

### Risiko-Register V50

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Contract-Breaking Change zwischen LAN/Online | hoch | Netzwerk | Versionierter Message-Contract + Adapter-Compatibility-Tests | Protocol Drift |
| Persistenz-Migration verursacht Datenverlust | hoch | Core | Migration Registry + Rollback/Testdaten | Fehlschlag bei Upgrade |
| Determinismus unvollstaendig in Hotpaths | mittel | Entities/State | Guard-Regeln + gezielte clock/rng audits | Divergierende Sim-Verlaeufe |

---

## Block V51: Parcours-Pflichtmap mit Lauf-Verifikation

Plan-Datei: `docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V50.99, V39.9 -->

Scope:

- Neue Parcours-Pflichtmap `parcours_rift` mit geordneter Route und Finish-Gate.
- Deterministische Runtime-Verifikation (Reihenfolge, Richtung, Cooldown, Segmentzeit, Respawn-Reset).
- Objective-basiertes Match-End, HUD/Overlay-Feedback, Recorder/Telemetry und Anti-Exploit-Tests.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 51.1 bis 51.6 und 51.99 sind abgeschlossen und mit Evidence hinterlegt. (abgeschlossen: 2026-03-22; evidence: docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md + docs/Umsetzungsplan.md -> aktualisiert)
- [x] DoD.2 Pflicht-Tests fuer Core/Physics/Stress sowie Build sind PASS. (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics && npm run test:stress && npm run build -> PASS)
- [x] DoD.3 Plan-/Docs-Gates (`plan:check`, `docs:sync`, `docs:check`) sind PASS. (abgeschlossen: 2026-03-22; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)
- [x] DoD.4 Conflict-Log, Lock-Status und Ownership sind fuer V51 konsistent gepflegt. (abgeschlossen: 2026-03-22; evidence: docs/Umsetzungsplan.md -> V51-Block/Conflict-Log/Ownership aktualisiert)

### 51.1 Parcours-Design und Route-Spezifikation

- [x] 51.1.1 Finale Topologie "Rift Gauntlet" mit Sektorfluss, Pflichtroute und Sichtachsen festgelegt (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js -> `parcours_rift` layout)
- [x] 51.1.2 Checkpoint/Finish-Contract (IDs, Reihenfolge, Radius, Richtung, Segmentbudget) verbindlich definiert (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md -> Route-Contract)

### 51.2 Schema- und Editor-Erweiterung

- [x] 51.2.1 MapSchema um `parcours` (Migration, Sanitize, Runtime-Mapping) erweitert (abgeschlossen: 2026-03-22; evidence: src/entities/mapSchema/MapSchemaMigrationOps.js + MapSchemaSanitizeOps.js + MapSchemaRuntimeOps.js -> umgesetzt)
- [x] 51.2.2 Editor-Import/Export fuer `parcours.checkpoints/rules/finish` roundtrip-faehig gemacht (abgeschlossen: 2026-03-22; evidence: editor/js/EditorMapSerializer.js + npm run test:core -> PASS (T14g))

### 51.3 Runtime-Verifikation und Fortschrittszustand

- [x] 51.3.1 `ParcoursProgressSystem` fuer Ordered-Checkpoints, Richtung, Timing, Cooldown und Reset-Regeln integriert (abgeschlossen: 2026-03-22; evidence: src/entities/systems/ParcoursProgressSystem.js + npm run test:physics -> PASS (T60a/T60b/T60c))
- [x] 51.3.2 Player-/Lifecycle-/Tick-Pipeline deterministisch auf Parcours-Progress verdrahtet (abgeschlossen: 2026-03-22; evidence: src/entities/systems/PlayerLifecycleSystem.js + src/entities/runtime/EntityTickPipeline.js -> Integration aktiv)

### 51.4 Match-Logik, HUD und Feedback

- [x] 51.4.1 Round-Outcome um Gewinnergrund `PARCOURS_COMPLETE` inkl. Completion-Metadaten erweitert (abgeschlossen: 2026-03-22; evidence: src/entities/systems/RoundOutcomeSystem.js + src/state/RoundStateOps.js -> Objective Reason integriert)
- [x] 51.4.2 HUD/Overlay/Feedback fuer `CP n/m`, Fehlerindikator und Completion-Time eingebunden (abgeschlossen: 2026-03-22; evidence: src/ui/HudRuntimeSystem.js + src/ui/MatchFlowUiController.js + npm run test:core -> PASS (T14f))

### 51.5 Content-Authoring der Map

- [x] 51.5.1 Neues Preset `parcours_rift` in den Map-Katalog aufgenommen (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + MapPresetCatalog.js + MapPresetsBase.js -> registriert)
- [x] 51.5.2 Spawn-/Item-/Lane-Setups fuer spielbare Pflichtroute austariert (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + npm run test:core -> PASS (T14/T14f))

### 51.6 Test- und Anti-Exploit-Absicherung

- [x] 51.6.1 Automatisierte Happy-Path/Wrong-Order/Exploit/Respawn/Finish-Tests ergaenzt (abgeschlossen: 2026-03-22; evidence: tests/core.spec.js + tests/physics-core.spec.js + tests/stress.spec.js -> T14f/T14g/T60a-c/T81)
- [x] 51.6.2 Recorder/Telemetry um Parcours-Completion erweitert und in Dashboard-/History-Pfad gespiegelt (abgeschlossen: 2026-03-22; evidence: src/state/recorder/RoundMetricsStore.js + src/ui/menu/MenuTelemetryDashboard.js -> Completion-Felder aktiv)

### Phase 51.99: Integrations- und Abschluss-Gate

- [x] 51.99.1 `npm run test:core`, `npm run test:physics`, `npm run test:stress`, `npm run build` sind gruen (abgeschlossen: 2026-03-22; evidence: test/build Pflichtlauf -> PASS)
- [x] 51.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log/Governance abgeschlossen (abgeschlossen: 2026-03-22; evidence: docs-gates + Governance-Update -> PASS)

### Risiko-Register V51

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Falsch-positive Checkpoint-Hits durch Bewegungsrauschen | mittel | Entities | Richtungs-Crossing + Radius-Schnitt + Cooldown je CP | Pendelbewegung an Gates |
| Objective-Ende kollidiert mit bestehender K.O.-Logik | mittel | State | Objective-Precheck vor Legacy-Win-Path + Regression in Core-Tests | Unerwarteter Gewinnergrund |
| HUD/Telemetry Drift zwischen Runtime und Round-End | mittel | UI/State | Gemeinsame Outcome-Payload + Dashboard-Regressionstests | Fehlende Completion-Daten |

---

## Block V52: Architektur-Haertung III - Event-Konsistenz, Layer-Grenzen, Guard-Coverage

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V50.99 -->

Scope:

- Session-Event-Pipeline, State/UI-Schichtung und Protokollhaertung konsolidieren.
- Architektur-Guards auf `server/**` und dynamic imports erweitern, Input-/Persistenz-Restpfade finalisieren.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 52.1 bis 52.8 sind abgeschlossen.
- [ ] DoD.2 52.99.* ist abgeschlossen und Gate-Invariante erfuellt.
- [ ] DoD.3 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core` und `npm run build` sind PASS.
- [ ] DoD.4 Evidence, Conflict-Log, Ownership und Lock-Status sind konsistent gepflegt.

### 52.1 Session-Event-Contract und Player-Registry stabilisieren

- [ ] 52.1.1 `stateUpdate`-Payload in LAN/Online-Adaptern und `StateReconciler` auf ein gemeinsames Schema vereinheitlichen (inkl. Version/Felder)
- [ ] 52.1.2 `playerLoaded`-Lifecycle und `getPlayers()` aus realen Session-Daten statt Schattenlisten verdrahten

### 52.2 State-UI-Boundary entkoppeln

- [ ] 52.2.1 Direkte `state -> ui` Imports auf Ports/Events migrieren, damit die Layer-Richtung wieder eindeutig ist
- [ ] 52.2.2 Direkte `ui -> state` Mutationen auf einen klaren Command-/Reducer-Pfad mit Ownership umstellen

### 52.3 Architektur-Guards erweitern

- [ ] 52.3.1 `ArchitectureAnalysis` fuer `src/**` und `server/**` ausbauen und `import(...)` (dynamic import) in die Kantenanalyse aufnehmen
- [ ] 52.3.2 Budget-/Ratchet-Checks fuer bidirektionale Drift (`state <-> ui`) ergaenzen und als Gate erzwingen

### 52.4 Command- und Mutationspfad vereinheitlichen

- [ ] 52.4.1 `ActionDispatcher` entweder produktiv in Runtime/UI integrieren oder komplett entfernen (kein halber Pfad)
- [ ] 52.4.2 Direkte Store-Schreibpfade reduzieren und ueber dokumentierte Commands zentralisieren

### 52.5 Input-Source-Architektur finalisieren

- [ ] 52.5.1 `InputManager.setPlayerSource` in Runtime/Setup aktiv nutzen und Prioritaeten fuer Touch/Gamepad/Keyboard deterministisch festlegen
- [ ] 52.5.2 Defekte oder tote Input-Pfade bereinigen (inkl. `TouchInputSource`-Importpfad) und Regressionstests hinterlegen

### 52.6 Persistenz-Rollout vervollstaendigen

- [ ] 52.6.1 Verbleibende ad-hoc Storage-Keys auf zentrale Storage-Contracts migrieren
- [ ] 52.6.2 Migrations-/Kompatibilitaetstests fuer Menu-, Arcade- und Multiplayer-Datenpfade abschliessen

### 52.7 Protokollhaertung und Decoder-Strictness

- [ ] 52.7.1 Multiplayer-Decoder auf strict validation (required fields, type guards, unknown-field policy) umstellen
- [ ] 52.7.2 Contract-Tests fuer LAN/Online/Server inkl. Negativfaelle (invalid payload, version mismatch, reconnect edge cases) erweitern

### 52.8 Decomposition-Welle III (Rest-God-Objects)

- [ ] 52.8.1 Ueberlaenge-Module (`MediaRecorderSystem`, `MenuMultiplayerBridge`, `GameRuntimeFacade`) entlang Domain-Grenzen weiter zerlegen
- [ ] 52.8.2 Dead-Code-/Orphan-Module identifizieren, entfernen und Import-Graph-Regression absichern

### Phase 52.99: Integrations- und Abschluss-Gate

- [ ] 52.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core` und `npm run build` sind gruen
- [ ] 52.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen

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

- [ ] DoD.1 Alle Phasen 53.1 bis 53.6 und 53.99 sind abgeschlossen.
- [ ] DoD.2 `SettingsManager` ist als schlanke Facade umgesetzt; Domain-Logik liegt in `src/core/settings/**`.
- [ ] DoD.3 `npm run test:core`, `npm run architecture:guard` und `npm run build` sind PASS.
- [ ] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Evidence/Lock/Ownership sind konsistent.

### 53.1 Scope-Baseline und API-Inventar

- [ ] 53.1.1 Oeffentliche `SettingsManager`-Methoden und Call-Sites (`src/core/runtime/**`, `GameRuntimeFacade`) inventarisieren und Facade-Vertrag fixieren
- [ ] 53.1.2 Characterization-Baseline fuer kritische Flows (`sanitizeSettings`, Session-Switch, Preset-Apply/Save, Telemetry) dokumentieren

### 53.2 Settings-Normalisierung zerlegen

- [ ] 53.2.1 `sanitizeSettings` in dedizierte Ops/Funktionen entlang Domain-Grenzen (`session`, `gameplay`, `botBridge`, `controls`, `menuContracts`) auslagern
- [ ] 53.2.2 Migrations-/Clamp-/Kompatibilitaetsregeln (`settingsVersion`, Hunt-Respawn, `modePath`, Recording) unveraendert absichern

### 53.3 Preset- und Session-Draft-Domain trennen

- [ ] 53.3.1 Session-Draft-Flow (`saveSessionDraft`, `applySessionDraft`, `switchSessionType`) als eigene Service-Schicht kapseln
- [ ] 53.3.2 Preset-Flow (`applyMenuPreset`, `saveMenuPreset`, `deleteMenuPreset`) auf klaren Result-Contract und getrennte Ops migrieren

### 53.4 Developer/Text/Telemetry-Domain extrahieren

- [ ] 53.4.1 Developer-Aktionen (Mode/Theme/Actor/Visibility/Lock/ReleasePreview) in dedizierte Facade auslagern
- [ ] 53.4.2 Text-Override- und Telemetry-History-Pfade als eigene Services mit stabilen I/O-Contracts ausfuehren

### 53.5 Orchestrator-Manager finalisieren

- [ ] 53.5.1 `SettingsManager` auf Store-Wiring + Domain-Orchestrierung + Runtime-Config reduzieren
- [ ] 53.5.2 Imports/Exporte fuer Call-Sites stabilisieren, Legacy-Helfer entfernen, Import-Grenzen dokumentieren

### 53.6 Verifikation und Guard-Haertung

- [ ] 53.6.1 `test:core` fuer Settings/Menu/Session/Preset/Telemetry-Flows erweitern bzw. nachziehen
- [ ] 53.6.2 `architecture:guard` gegen neue Grenzen fahren und Ratchet-Verstoesse beheben

### Phase 53.99: Integrations- und Abschluss-Gate

- [ ] 53.99.1 `npm run test:core`, `npm run architecture:guard`, `npm run build` sind gruen
- [ ] 53.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen

### Risiko-Register V53

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Versteckte Seiteneffekte beim Split von `sanitizeSettings` | hoch | Core | Characterization-Tests + schrittweise Extraktion mit unveraenderter API | Abweichende Defaults/Migrationswerte |
| API-Drift bei Runtime-Call-Sites (`MenuRuntime*`, `GameRuntimeFacade`) | mittel | Core/UI | Facade-Contract zuerst fixieren, danach interne Migration | Laufzeitfehler in Menu-Flows |
| Import-Grenzen werden durch neue Module verletzt | mittel | Architektur | `architecture:guard` pro Teilphase + Ratchet-Review | Neue disallowed edges |

---

## Backlog (priorisiert, nicht gestartet)

Hinweis: Bot-Training-Backlog wird in `docs/Bot_Trainingsplan.md` gepflegt.

| ID | Titel | Plan-Datei | Impact | Aufwand | Prioritaet | Naechster Schritt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V39 | Komplexe Showcase-Map | `docs/Feature_Komplexe_Showcase_Map_V39.md` | mittel | gross | P2 | Scope-Review nach V46 | In Bearbeitung |
| V40 | Hunt Rocket Trail Targeting | `docs/Feature_Hunt_Rocket_Trail_Targeting_V40.md` | mittel | mittel | P1 | mit V50.1 Contract abstimmen | Offen |
| V51 | Parcours-Pflichtmap mit Lauf-Verifikation | `docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md` | hoch | gross | P1 | Abgeschlossen am 2026-03-22 | Abgeschlossen |
| V53 | SettingsManager Decomposition und Settings-Domain-Entkopplung | `docs/Feature_SettingsManager_Decomposition_V53.md` | hoch | mittel | P1 | 53.1.1 API-Inventar + Call-Site-Matrix erstellen | Offen |
| V42 | Menu Default Editor | `docs/Feature_Menu_Default_Editor_V42.md` | mittel | mittel | P2 | UX/Ownership klaeren | In Bearbeitung |
| V43 | Projektstruktur Spiel/Dev-Ordner | `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md` | niedrig | mittel | P3 | 43.4.1 Optionalen `game/`-Unterordner evaluieren (nur bei weiter gruener Dev-Migration) | In Bearbeitung |
| V2 | Test-Performance-Optimierung | `docs/Feature_TestPerformance_V2.md` | hoch | mittel | P1 | Benchmark baseline erneuern | Offen |
| V26.3c | Menu UX Follow-up | `docs/Feature_Menu_UX_Followup_V26_3c.md` | mittel | klein | P2 | in UI backlog einsortieren | Offen |
| V29b | Cinematic Camera Follow-up + YouTube Shorts Capture | `docs/Feature_Cinematic_Camera_Followup_V29b.md` | mittel | mittel | P2 | 29b.1.1 Aufnahme-Contract fuer Shorts-Profil, HUD-Optionen und dynamische Aufloesung finalisieren | Offen |
| N2 | Recording-UI / manueller Trigger | - | mittel | klein | P2 | mit V29b.5 Menue-Flow zusammenfuehren | Offen |
| N8 | Bot-Dynamikprofile als UI-Gegnerklassen | - | mittel | gross | P3 | Design-Note erstellen | Offen |
| T1 | Dummy-Tests durch echte ersetzen | - | hoch | mittel | P1 | Testkatalog priorisieren | Offen |

---

## Abgeschlossene Bloecke (archiviert)

| Block | Grund | Plan-Datei | Archiv-Pfad |
| --- | --- | --- | --- |
| V45 | abgeschlossen | `docs/archive/plans/completed/Feature_Arcade_Modus_V45.md` | `docs/archive/plans/completed/` |
| V47 | abgeschlossen | `docs/archive/plans/completed/Feature_Strategy_Pattern_V47.md` | `docs/archive/plans/completed/` |
| V48 | abgeschlossen | `docs/archive/plans/completed/Feature_Fight_Modus_Qualitaet_V48.md` | `docs/archive/plans/completed/` |
| N4-N7 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V49 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V41-D | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| Alte Masterplaene bis 2026-03-06 | abgeloest | `docs/archive/plans/superseded/Umsetzungsplan_bis_2026-03-06.md` | `docs/archive/plans/superseded/` |

## Weekly Review (KW 12/2026)

Stand: 2026-03-23

- Abgeschlossen diese Woche: V46.2.1, V46.2.2, V46.3.1, V46.3.2, V46.99, 41.99.1, 41.99.2, 41.99.3, 41.99.4, V50.1-V50.9, V50.99, Planarchiv-Bereinigung.
- Blockiert: kein aktiver Blocker; V50 abgeschlossen.
- Naechste 3 Ziele:
  1. 52.1.1 `stateUpdate`-Payload in LAN/Online/StateReconciler auf gemeinsames Schema bringen.
  2. 52.2.1 State-UI-Boundary weiter entkoppeln (`state -> ui` via Ports/Events).
  3. 53.1.1 `SettingsManager`-API/Call-Site-Matrix als Refactor-Baseline fixieren.
- Groesstes Risiko: V52-Haertung bricht bestehende Session-Edge-Cases in LAN/Online.
- Entscheidungsbedarf: Reihenfolge V52-Resthaertung vs. V53-Decomposition fuer minimale Konflikte auf `src/core/**`.

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
