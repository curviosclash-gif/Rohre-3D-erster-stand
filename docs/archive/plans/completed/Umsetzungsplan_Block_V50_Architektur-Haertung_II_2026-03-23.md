# Archivierter Block V50

Archiviert aus `docs/Umsetzungsplan.md` am 2026-03-23.
Quelle-Stand des Masterplans: 2026-03-23.

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

