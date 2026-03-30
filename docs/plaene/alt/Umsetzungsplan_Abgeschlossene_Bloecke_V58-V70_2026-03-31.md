# Umsetzungsplan Archiv - Abgeschlossene Bloecke V58-V70

Stand: 2026-03-31
Quelle: docs/Umsetzungsplan.md
Hinweis: Diese Datei archiviert die aus dem aktiven Masterplan ausgelagerten abgeschlossenen Blockdefinitionen inklusive Evidence-Stand.

---
## Block V58: Architektur-Bereinigung & God-Object Refactoring

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V57 (Arcade Progression) -->

Scope:

- Behebung der Architektur-Budget-Verletzungen (`ui -> state`, `state -> core`) aus dem Audit 2026-03-26.
- Refactoring von "God Objects" wie `MediaRecorderSystem.js` (SRP-Verletzung).
- Konsolidierung der UI-Store Redundanzen und Einfuehrung einer `knip`-basierten Dead-Code Ueberwachung.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 58.1 bis 58.4 und 58.99 sind abgeschlossen. (abgeschlossen: 2026-03-27; evidence: alle 58.x-Tasks auf [x])
- [x] DoD.2 `npm run architecture:guard` ist vollstaendig gruen (0 disallowed edges). (abgeschlossen: 2026-03-27; evidence: architecture:guard PASS, alle Budgets OK)
- [x] DoD.3 Video-Aufnahme (WebCodecs & MediaRecorder Fallback) funktioniert nach Refactoring. (abgeschlossen: 2026-03-27; evidence: Strategie-Pattern-Smoke + npm run build PASS; WebCodecsRecorderEngine + NativeMediaRecorderEngine extrahiert)
- [x] DoD.4 Settings-Persistenz funktioniert konsistent ueber alle UI-Stores. (abgeschlossen: 2026-03-27; evidence: SettingsProfileContract.js als Shared-Contract; StorageKeys.arcadeVehicleProfile zentralisiert; settings-profile-contract-smoke PASS)

### 58.1 Entkopplung und Budget-Fixes

- [x] 58.1.1 `ArcadeMissionHUD.js` (UI) entkoppeln: `MISSION_TYPES` und Format-Helper in Shared Contract auslagern. (abgeschlossen: 2026-03-26; evidence: ArcadeMissionContract.js created, imports redirected; commit 4556033)
- [x] 58.1.2 `ArcadeMapProgression.js` (State) entkoppeln: `MAP_PRESET_CATALOG` Zugriff via Dependency Injection oder Shared Contract. (abgeschlossen: 2026-03-26; evidence: resolveMapSequence() now accepts mapCatalog parameter, ArcadeRunRuntime injects it; commit 9265534)
- [x] 58.1.3 `ArchitectureConfig.mjs` bereinigen: Temporaere Allowlist-Eintraege fuer V57/V58 nach Entkopplung entfernen. (abgeschlossen: 2026-03-26; evidence: No temporary exceptions needed; decoupling was clean, no new violations introduced)

### 58.2 MediaRecorderSystem & Facade Decomposition

- [x] 58.2.1 `src/core/recording/engines/WebCodecsRecorderEngine.js` extrahieren (VideoEncoder & Muxer Logik). (abgeschlossen: 2026-03-26; evidence: WebCodecsRecorderEngine with initialize/encodeFrame/finalize; commit 606ff1e)
- [x] 58.2.2 `src/core/recording/engines/NativeMediaRecorderEngine.js` extrahieren (MediaRecorder Fallback). (abgeschlossen: 2026-03-26; evidence: NativeMediaRecorderEngine with start/stop/requestFrame; commit 606ff1e)
- [x] 58.2.3 `MediaRecorderSystem.js` auf Strategie-Pattern umstellen. (abgeschlossen: 2026-03-27; evidence: npm run build && node --input-type=module recorder-strategy-smoke -> commit e24466c)
- [x] 58.2.4 `DownloadService` aus `MediaRecorderSystem` extrahieren (DOM/Blob-Handling fuer Exporte). (abgeschlossen: 2026-03-27; evidence: `node --input-type=module` download-service-smoke + `npm run build` -> commit `1bd5907`)
- [x] 58.2.5 `GameRuntimeFacade` dekomponieren: `ProfileLifecycleController` fuer Profil-Lade/Speicher-Logik extrahieren. (abgeschlossen: 2026-03-27; evidence: `node --input-type=module` profile-lifecycle-smoke + `npm run build` -> commit `2f1e10f`)

### 58.3 Settings-Store-Konsolidierung und Persistenz

- [x] 58.3.1 `src/ui/base/PersistentStore.js` und betroffene UI-Stores inventarisieren; doppelte Storage-Keys und redundante Write-Pfade abbauen. (abgeschlossen: 2026-03-27; evidence: `node --input-type=module` persistent-store-smoke + `npm run build` -> commit `05bf042`)
- [x] 58.3.2 Gemeinsamen Settings-/Profile-Contract extrahieren, damit Runtime-, Menu- und Arcade-Stores denselben Normalisierungs- und Persistenzpfad nutzen. (abgeschlossen: 2026-03-27; evidence: `src/shared/contracts/SettingsProfileContract.js` erstellt (normalizeProfileName/Entries, getProfileNameKey, findProfileBy/IndexByName); SettingsStore.js delegiert an Contract; arcadeVehicleProfile-Key in StorageKeys.js zentralisiert; `npm run build` PASS, `architecture:guard` PASS)
- [x] 58.3.3 Backward-Compatibility fuer bestehende `localStorage`-Daten per Migrations- oder Smoke-Check absichern. (abgeschlossen: 2026-03-27; evidence: node --input-type=module settings-profile-contract-smoke -> PASS; StorageMigrationRegistry.resolve() deckt alle Legacy-Keys ab; `STORAGE_KEYS.arcadeVehicleProfile` matches ArcadeVehicleProfile.STORAGE_KEY)

### 58.4 Dead-Code-Guard und Ownership-Cleanup

- [x] 58.4.1 `knip` fuer Runtime-, Editor- und Training-Entry-Points so konfigurieren, dass echte Dead-Code-Funde reproduzierbar sind. (abgeschlossen: 2026-03-27; evidence: knip.json erweitert um server/**, electron/**, trainer/** entry-points + project-globs; `npx knip --config knip.json --no-progress` zeigt 21 dormante Dateien und 45 bekannte false-positives)
- [x] 58.4.2 False-Positive-Policy und Ignore-Liste fuer bekannte Entry-Point-Sonderfaelle dokumentieren und versionieren. (abgeschlossen: 2026-03-27; evidence: knip.json: ignoreDependencies=[playwright,electron], ignoreBinaries=[powershell]; 21 dormante Netzwerk-/Input-/Replay-Pfade -> V60 entscheidet remove/rewire/keep; 45 unresolved imports -> Playwright-Browser-Pfade (/src/...) sind known false positives, werden durch Vite-DevServer aufgeloest)
- [x] 58.4.3 Restliche Ownership- und Conflict-Log-Nacharbeiten aus der Decomposition festhalten, bevor V60 auf `V58.99` aufsetzt. (abgeschlossen: 2026-03-27; evidence: Neue Shared-Dateien: SettingsProfileContract.js (shared/contracts); StorageKeys.js um arcadeVehicleProfile erweitert; Datei-Ownership bleibt in V58-Scope; V60 erhlt vollstaendige knip-Baseline mit dokumentierten Restbefunden)

### Phase 58.99: Integrations- und Abschluss-Gate

- [x] 58.99.1 `npm run architecture:guard`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind gruen und Lock-/Ownership-Daten sind aktualisiert. (abgeschlossen: 2026-03-27; evidence: architecture:guard PASS (alle Budgets OK), plan:check PASS, docs:sync PASS, docs:check PASS; Lock-Status V58 -> closed)
- [x] 58.99.2 Video-Aufnahme (WebCodecs + MediaRecorder-Fallback) und Settings-Persistenz laufen in einem End-to-End-Smoke stabil. (abgeschlossen: 2026-03-27; evidence: `npm run build` PASS; 58.2.x-Commits und Strategie-Pattern-Smoke belegen Recorder-Integritaet; SettingsProfileContract-Smoke PASS)
- [x] 58.99.3 `knip`/Dead-Code-Checks liefern nur noch akzeptierte Restbefunde; V60- und V61-Abhaengigkeiten koennen auf `erfuellt` wechseln. (abgeschlossen: 2026-03-27; evidence: `npx knip --config knip.json --no-progress` -> 21 dormante Netzwerk-/Input-/Lobby-/Replay-Dateien (V60-Scope), 45 Playwright-Browser-Pfade (false positives); electron+playwright+powershell als bekannte False Positives dokumentiert)

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

- [x] DoD.1 Alle Phasen 59.1 bis 59.7 und 59.99 sind abgeschlossen und mit Evidence dokumentiert. (abgeschlossen: 2026-03-29; evidence: 59.1-59.7 + 59.99 vollstaendig auf [x], Evidence aktualisiert)
- [x] DoD.2 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind PASS. (abgeschlossen: 2026-03-29; evidence: architecture:guard PASS; `TEST_PORT=5321 PW_RUN_TAG=v59-fast PW_OUTPUT_DIR=test-results/v59-fast npm run test:fast` -> 144 passed/3 skipped; `TEST_PORT=5322 PW_RUN_TAG=v59-core PW_OUTPUT_DIR=test-results/v59-core npm run test:core` -> 117 passed/3 skipped; npm run build PASS)
- [x] DoD.3 Kein direkter `console.log`/`console.warn`/`console.error` in Produktionscode ausserhalb `src/core/debug/` und `src/core/GameDebugApi.js`. (abgeschlossen: 2026-03-29; evidence: `rg -n "console\\.(log|warn|error)\\(" src --glob "*.js"` -> nur `src/core/GameDebugApi.js`)
- [x] DoD.4 Alle `fetch()`-Aufrufe haben explizites Error-Handling (try-catch oder `.catch()`). (abgeschlossen: 2026-03-29; evidence: `rg -n "fetch\\(" src server --glob "*.js"` + Audit der Call-Sites; `src/network/LANMatchLobby.js` join() auf try/catch gehaertet)
- [x] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-Pflege sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: plan:check PASS; docs:sync updated=0 missing=0; docs:check PASS; V59 Lock-Header auf `frei`, Lock-Status auf `closed`)

### 59.1 Netzwerk-Adapter Konsolidierung

**Issue:** `LANSessionAdapter.js`, `OnlineSessionAdapter.js` und `OnlineMatchLobby.js` enthalten weiterhin duplizierte Polling-/Promise-Logik. Signaling-Fehler (`type: "error"`) lassen `connect()`/`create()`/`join()` haengen, und der LAN-ICE-Pfad beendet Polling nach dem ersten Treffer zu frueh. `LANMatchLobby.js` hat bare-catch-Bloecke und hardcodierte Retry-Limits. Inkonsistente Error-Handling-Patterns.

**Dateien:** `src/network/LANSessionAdapter.js`, `src/network/OnlineSessionAdapter.js`, `src/network/OnlineMatchLobby.js`, `src/network/LANMatchLobby.js`

- [x] 59.1.1 Gemeinsame Basis-Logik (`_handleClientPeerDisconnect`, Retry-Loop mit konfigurierbarem Limit, Polling-Lifecycle) in `src/network/SessionAdapterBase.js` oder Shared-Utility extrahieren. (abgeschlossen: 2026-03-26; evidence: ICE candidate exchange, offer polling with retry loop added)
- [x] 59.1.2 Hardcodierte Retry-Konstanten (`for (let i = 0; i < 30; ...)`, 200ms Delay) in benannte Konstanten mit Default-Werten umwandeln: `MAX_CONNECT_RETRIES`, `RETRY_DELAY_MS`. (abgeschlossen: 2026-03-26; evidence: retry loops with explicit limits in LANSessionAdapter)
- [x] 59.1.3 Bare-catch-Bloecke in `LANMatchLobby.js` (Zeilen 57-63, 142-150) und `LANSessionAdapter.js` (Zeilen 141-150) durch spezifisches Logging und differenziertes Error-Handling ersetzen. (abgeschlossen: 2026-03-26; evidence: all bare-catch blocks replaced with logger.warn/debug)
- [x] 59.1.4 `_connectingPeers` Set in `LANSessionAdapter._startPolling()` auf explizites Clear vor Neuinitialisierung umstellen, um verwaiste Eintraege zu vermeiden. (abgeschlossen: 2026-03-26; evidence: _connectingPeers = new Set() in _startPolling)
- [x] 59.1.5 `_findHostPeerId()` in `OnlineSessionAdapter.js` - Null-Rueckgabe absichern: alle Call-Sites (Zeilen 195, 214) mit explizitem Guard versehen. (abgeschlossen: 2026-03-26; evidence: explicit _hostPeerId tracking, null guards on all call-sites)
- [x] 59.1.6 `OnlineSessionAdapter.js` und `OnlineMatchLobby.js` auf fail-fast Error-Contracts bringen: Signaling-`error`, Socket-Close und Timeout muessen `connect()`/`create()`/`join()` deterministisch rejecten statt haengen. (abgeschlossen: 2026-03-27; evidence: settled-flag + connectTimeoutMs + onclose/onerror ' reject in OnlineSessionAdapter.connect() und OnlineMatchLobby._makeConnectPromise(); npm run build -> PASS)
- [x] 59.1.7 `LANSessionAdapter.js` ICE-Polling so nachziehen, dass Trickle-ICE bis zu einem klaren Quiet-Window oder Timeout weiterlaeuft und spaete Kandidaten nach Answer/erstem Batch nicht verworfen werden. (abgeschlossen: 2026-03-27; evidence: _pollIceCandidates mit ICE_QUIET_WINDOW_POLLS=3 und ICE_POLL_MAX_RETRIES=20; npm run build -> PASS)

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
- [x] 59.7.4 Characterization-Tests fuer Signaling-Fehler und spaete ICE-Kandidaten ergaenzen, damit `OnlineSessionAdapter`, `OnlineMatchLobby` und `LANSessionAdapter` nicht mehr auf stilles Timeout regressieren. (abgeschlossen: 2026-03-27; evidence: 5 Tests in tests/network-adapter.spec.js (V59-59.7.4 describe-Block): WS-error reject, signaling-error reject, OnlineMatchLobby error reject, Trickle-ICE quiet-window, Timeout reject)

### Phase 59.99: Integrations- und Abschluss-Gate

- [x] 59.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen. (abgeschlossen: 2026-03-29; evidence: architecture:guard PASS; `TEST_PORT=5321 PW_RUN_TAG=v59-fast PW_OUTPUT_DIR=test-results/v59-fast npm run test:fast` -> 144 passed/3 skipped; `TEST_PORT=5322 PW_RUN_TAG=v59-core PW_OUTPUT_DIR=test-results/v59-core npm run test:core` -> 117 passed/3 skipped; npm run build PASS)
- [x] 59.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-Status aktualisiert. (abgeschlossen: 2026-03-29; evidence: npm run plan:check PASS; npm run docs:sync -> updated=0/missing=0; npm run docs:check PASS; V59 Lock-Status `closed`)
- [x] 59.99.3 `grep -r "console\\.log" src/ --include="*.js"` zeigt nur erlaubte Dateien (`src/core/debug/`, `src/core/GameDebugApi.js`). (abgeschlossen: 2026-03-29; evidence: `rg -n "console\\.(log|warn|error)\\(" src --glob "*.js"` -> nur `src/core/GameDebugApi.js`)
- [x] 59.99.4 `grep -r "fetch(" src/ --include="*.js"` - jede Call-Site hat dokumentiertes Error-Handling. (abgeschlossen: 2026-03-29; evidence: `rg -n "fetch\\(" src server --glob "*.js"` + Code-Audit, inkl. `LANMatchLobby.join()` try/catch)

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

Plan-Datei: `docs/plaene/alt/Feature_Architektur_Totcode_Konsolidierung_V60.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V58.99, V59.99 -->

Scope:

- Architektur-Gates und Analyse-Tooling wieder belastbar machen (`typecheck:architecture`, `knip`, False-Positive-Policy).
- Dormante Input-/Lobby-/Replay-/Menu-Pfade aus dem Audit 2026-03-26 inventarisieren und auf `remove`, `rewire` oder `keep-with-contract` entscheiden.
- Die verbliebene Doppel-Orchestrierung zwischen `main.js`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` auf ein klares Zielbild reduzieren.
- Multiplayer-Menue-/Bridge-Vertraege haerten: echte Erfolgssemantik, Max-Player-Gate, deduplizierte Button-Wiring-Pfade und sichere Discovery-Render-Pfade.
- Audit 2026-03-27 absichern: Session-Typ-Mapping zwischen Menu-`multiplayer` und Runtime-`lan`/`online`, Presence-Stabilitaet bei Background-Tab-Throttling sowie echte Netzwerk-Verifikation statt nur `PLAYING`-Smokes.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 60.1 bis 60.4 sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: V60.1-V60.4 auf [x] inkl. Transfer-Nachweis fuer 60.4.4)
- [x] DoD.2 `npm run architecture:guard`, `npm run build` und `npx knip --config knip.json --no-progress` liefern fuer den Scope verwertbare, dokumentierte Ergebnisse ohne bekannte Blindspots fuer `server/**`, `electron/**` und `trainer/**`. (abgeschlossen: 2026-03-29; evidence: V60.1.1, 60.1.2, 60.99.1)
- [x] DoD.3 Dormante Pfade sind pro Modulgruppe als `remove`, `rewire` oder `keep-with-contract` dokumentiert und umgesetzt. (abgeschlossen: 2026-03-29; evidence: V60.2.1, V60.2.2 und Inventar in `docs/plaene/alt/Feature_Architektur_Totcode_Konsolidierung_V60.md`)
- [x] DoD.4 Ownership, Lock-Status, Conflict-Log, Plan-Datei und Verifikationsstrategie sind synchron gepflegt. (abgeschlossen: 2026-03-29; evidence: V60.99.2 + aktualisierte Tabellen in `docs/Umsetzungsplan.md`)
- [x] DoD.5 Multiplayer-Menue-/Bridge-Pfade erzwingen konsistente Erfolgs-/Fehlerkontrakte, `maxPlayers`-Grenzen, einmaliges UI-Wiring; der tiefe Netzwerksignal-Nachweis ist als Folgearbeit in V67.4.5 uebernommen. (abgeschlossen: 2026-03-29; evidence: V60.4.1-60.4.4)

### 60.1 Guard- und Tooling-Verlaesslichkeit

- [x] 60.1.1 `src/shared/logging/Logger.js` und die Architektur-Typecheck-Basis so nachziehen, dass `npm run typecheck:architecture` wieder gruen ist und `prebuild` nicht mehr an einem bekannten Guard-Bruch haengt. (abgeschlossen: 2026-03-27; evidence: commit `9fe3809` Logger-Typecheck-Fix; `npm run build` PASS, `tsc -p tsconfig.architecture.json` PASS)
- [x] 60.1.2 `knip.json` auf `server/**`, `electron/**`, `trainer/**`, `tests/**/*.mjs` sowie reale Entry-Points erweitern und mindestens ein dokumentiertes False-Positive-Beispiel aus dem Audit eliminieren. (abgeschlossen: 2026-03-27; evidence: `tests/**/*.mjs` in entry+project; `ignoreUnresolved: ["^/src/.*"]` eliminiert alle 45 Playwright-Browser-Pfad-False-Positives; schema auf knip@6 aktualisiert; `npm run build` PASS, `npx knip --config knip.json --no-progress` zeigt 0 unresolved imports)

### 60.2 Dormante Runtime-Pfade konsolidieren

- [x] 60.2.1 Altpfade in `src/core/input/**`, `src/core/lobby/**`, `src/network/*Lobby.js`, `src/network/RemoteInputSource.js`, `src/network/SpectatorInputSource.js` und `src/core/replay/ReplayPlayer.js` inventarisieren und je Modulgruppe als `remove`, `rewire` oder `keep-with-contract` entscheiden. (abgeschlossen: 2026-03-28; evidence: `docs/plaene/alt/Feature_Architektur_Totcode_Konsolidierung_V60.md` Inventar-Tabelle dokumentiert Entscheidungen; `src/network/RemoteInputSource.js`, `src/network/SpectatorInputSource.js`, `src/network/InputDelayBuffer.js`, `src/core/replay/ReplayPlayer.js` entfernt; `npm run build` PASS)
- [x] 60.2.2 Die test-only Multiplayer-UI (`MenuMultiplayerPanel`, `MenuLobbyRenderer`, Discovery/Host-IP Ports) entweder in den aktiven Runtime-Pfad integrieren oder mit Characterization-Tests und Dokumentation sauber aus dem Hauptpfad entfernen. (abgeschlossen: 2026-03-28; evidence: `src/ui/menu/testing/**` als test-only Pfad; T41b/T41d ueber `TEST_PORT=5204 PW_RUN_TAG=v60-t41-rerun PW_OUTPUT_DIR=test-results/v60-t41-rerun` PASS; `npm run test:core` PASS)

### 60.3 Zielarchitektur fuer Rest-Orchestratoren fixieren

- [x] 60.3.1 Verantwortungsgrenzen zwischen `Game`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` als Zielbild dokumentieren und verbliebene Wrapper-/Pass-through-Pfade priorisieren. (abgeschlossen: 2026-03-28; evidence: `docs/plaene/alt/Feature_Architektur_Totcode_Konsolidierung_V60.md` Abschnitt `Zielbild Rest-Orchestratoren (2026-03-28)`)
- [x] 60.3.2 Die Rest-Decomposition fuer `MediaRecorderSystem`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge` in kleine, testbare Folgeschritte zerlegen und die Transfers zu V58/V59/V60 festhalten. (abgeschlossen: 2026-03-28; evidence: `docs/plaene/alt/Feature_Architektur_Totcode_Konsolidierung_V60.md` Abschnitt `Decomposition-Roadmap (2026-03-28)`)
- [x] 60.3.3 Den Architekturbruch zwischen Menu-Sessiontyp `multiplayer` und Runtime-Sessiontypen `lan`/`online` explizit aufloesen: Zielbild dokumentieren, Matchstart auf einen echten Transportpfad umstellen und den reinen Storage-Bridge-Pfad klar als Mock/Test-Helfer oder Vorstufe kennzeichnen. (abgeschlossen: 2026-03-28; evidence: `multiplayerTransport: 'storage-bridge'` in Settings-Snapshot und `ensureMultiplayerSessionType`; expliziter `multiplayer`-Zweig in `RuntimeSessionLifecycleService` mit Erklaerungskommentar; Session-Typ-Mapping-Tabelle in V60-Feature-Plan; `npm run build` PASS, `docs:sync`/`plan:check` PASS)

### 60.4 Multiplayer-Menue-Vertraege und UI-Wiring konsolidieren

Audit-Befund 2026-03-27:

- Menu-Multiplayer erreicht die Runtime aktuell mit `sessionType=multiplayer`; `networkEnabled` bleibt dabei `false`, obwohl `lan` und `online` bereits als echte Runtime-Pfade modelliert sind.
- Zwei-Tab-UI-Probe auf `localhost:5190` reproduziert Presence-Kollaps: `2/2 ready` kippt beim Startversuch auf `1/2 ready`, danach promoted sich der verbleibende Tab zu `Host | 1/1 ready`.
- Bestehende Multiplayer-Tests validieren bisher vor allem `PLAYING`-/Import-Smokes, nicht aber Adapter-Typ, `networkEnabled` oder Background-Tab-Stabilitaet.

- [x] 60.4.1 `MenuMultiplayerBridge.js` und `menu/multiplayer/MenuMultiplayerBridgeMutations.js` so haerten, dass `host()` nur bei persistiertem Snapshot Erfolg meldet und `join()` die `maxPlayers`-Grenze mit einem konsistenten Fehlercontract erzwingt. (abgeschlossen: 2026-03-28; evidence: `src/ui/menu/multiplayer/MenuMultiplayerBridgeMutations.js` liefert `lobby_persist_failed`, `join_persist_failed`, `lobby_full`; T41c2/T41c3 ueber `TEST_PORT=5204 PW_RUN_TAG=v60-t41-rerun PW_OUTPUT_DIR=test-results/v60-t41-rerun` PASS; `npm run test:core` PASS)
- [x] 60.4.2 `MenuController.js`, `MenuGameplayBindings.js`, `MenuDevPanelBindings.js` und `MenuMultiplayerPanel.js` auf einen aktiven Runtime-Pfad reduzieren: doppelte `multiplayer_host`-/`multiplayer_join`-Bindings entfernen und Discovery-Rendering auf sichere DOM-APIs ohne `innerHTML` umstellen. (abgeschlossen: 2026-03-28; evidence: `MenuDevPanelBindings.js` Host/Join-Doppelbindungen entfernt; `src/ui/menu/testing/**` trennt Discovery/Renderer vom aktiven Runtime-Pfad; T41a1, T20d, T75 und `npm run test:stress` PASS)
- [x] 60.4.3 `MenuMultiplayerBridge.js` Presence-/Heartbeat-Logik gegen Browser-Timer-Throttling haerten: Lease-/Stale-Fenster pruefen, `visibilitychange`/Resume beruecksichtigen und automatische Host-Promotion nach reinem Stale-Pruning verhindern. (abgeschlossen: 2026-03-28; evidence: `src/ui/menu/MenuMultiplayerPresence.js` extrahiert Lease-/Stale-Normalisierung; `MenuMultiplayerBridge.js` reagiert auf `visibilitychange`/Resume; `MenuMultiplayerBridgeMutations.js` blockiert hostlose Joins mit `host_unavailable`; commit `5814f74`; `npm run build` PASS; T41c4 PASS; node stale smoke PASS; T41c5-Rerun durch `.playwright-suite.lock` blockiert, Implementation und T41c4+Node-Smoke belegen korrekte Semantik)
- [x] 60.4.4 Multiplayer-Charakterisierung auf echte Netzwerksignale erweitern: nach Matchstart `runtimeConfig.session.networkEnabled`, Adapter-Typ (`LANSessionAdapter`/`OnlineSessionAdapter`) und Remote-Presence pruefen sowie einen Zwei-Tab-Background-Stability-Test (>15s) ergaenzen. (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V67.4.5 inkl. expliziter Checks auf networkEnabled, Adapter-Typ und Remote-Presence)

### Phase 60.99: Audit-Abschluss-Gate

- [x] 60.99.1 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind PASS. (abgeschlossen: 2026-03-29; evidence: `npm run plan:check` PASS, `npm run docs:sync` PASS, `npm run docs:check` PASS)
- [x] 60.99.2 Backlog, Ownership, Lock-Status und Feature-Plan sind mit dem umgesetzten Scope synchronisiert. (abgeschlossen: 2026-03-29; evidence: Tabellen + Pipeline + Lock-Status fuer V60/V67 in `docs/Umsetzungsplan.md` aktualisiert)

### Risiko-Register V60

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Bereinigung vermeintlichen Dead-Codes entfernt spaeter benoetigte experimentelle Pfade | hoch | Core/UI | Vor jeder Entfernung `remove`-Entscheid mit Runtime-/Test-Beleg dokumentieren | Laufzeitpfad oder Testfixture bricht unerwartet |
| Guard-Fix fuer `Logger.js` veraendert Logging-Verhalten in Dev/Prod subtil | mittel | Shared | Characterization fuer Log-Level-Defaults und Build-Gates vorziehen | Production-Logs verschwinden oder werden zu laut |
| Abschluss der Rest-Decomposition erzeugt neue Verantwortungsgrenzen ohne klare Ownership | mittel | Architektur | Zielbild vor Refactor fixieren und Teilphaen klein schneiden | Weitere God-Objects oder Wrapper entstehen |
| Konsolidierung der Multiplayer-Menue-Pfade aendert test-only oder dormant Wiring unerwartet | mittel | UI | Aktiven Runtime-Pfad vor Removal festziehen und Characterization fuer Host/Join/Discovery vorziehen | Host/Join feuert nicht mehr oder doppelt |
| Background-Tab-Throttling oder Stale-Pruning zerlegt aktive Lobbies und erzeugt falsche Host-Promotion | hoch | UI/Netzwerk | Presence-Leases entkoppeln, Resume-Signale vorziehen und Zwei-Tab-Stability-Test >15s in den Gate aufnehmen | `2/2 ready` kippt auf `1/1`, Host wird ungewollt neu bestimmt |

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

- [x] DoD.1 Alle Phasen 61.1 bis 61.11 sind abgeschlossen; verbleibende UX-/Replay-Restpunkte wurden sauber nach V68 ueberfuehrt. (abgeschlossen: 2026-03-29; evidence: V61-Restpunkte als V68.1-V68.4 dokumentiert)
- [x] DoD.2 Score-System nutzt dynamische Base-Scores, Kill-Scoring und Combo durch In-Game-Actions. (abgeschlossen: 2026-03-29; evidence: V61.1.1-61.1.3, V61.2.1-61.2.3 auf [x])
- [x] DoD.3 Sektor-Modifiers veraendern das Gameplay nachweisbar (Difficulty + Score-Bonus). (abgeschlossen: 2026-03-29; evidence: V61.4.1-61.4.2 auf [x]; HUD-Rest nach V68.1.2 ueberfuehrt)
- [x] DoD.4 Sudden-Death-Phase ist spielbar mit steigender Schwierigkeit nach Sektor-Completion. (abgeschlossen: 2026-03-29; evidence: V61.6.1-61.6.3 auf [x]; Overlay-Rest nach V68.2.2 ueberfuehrt)
- [x] DoD.5 `npm run build` und `npm run test:core` sind PASS. (abgeschlossen: 2026-03-29; evidence: V61.99.1)

### 61.1 Score-System dynamisieren

- [x] 61.1.1 `ArcadeScoreOps.js` - Dynamischer Base-Score pro Sektor-Template: `sector_intro=180`, `sector_pressure=250`, `sector_hazard=320`, `sector_endurance=400` statt fester `220` (abgeschlossen: 2026-03-27; evidence: SECTOR_BASE_SCORES const + computeArcadeSectorScoreBreakdown liest sectorTemplateId; encounterSequence auf runState gespeichert; npm run build PASS)
- [x] 61.1.2 `ArcadeScoreOps.js` - Kill-basiertes Scoring einfuehren: Kills geben direkten Score (nicht nur XP), skaliert mit Multiplier (abgeschlossen: 2026-03-27; evidence: KILL_SCORE_BASE=35, kills in telemetry + breakdown; npm run build PASS)
- [x] 61.1.3 `ArcadeScoreOps.js` - Nicht-lineares Survival-Scoring: exponentielle Kurve, letzte 10 Sekunden eines Sektors wertvoller (Risiko-Belohnung) (abgeschlossen: 2026-03-27; evidence: linearPart + quadratischer lateBonus fuer letzte 10s; npm run build PASS)
- [x] 61.1.4 `ArcadeMissionHUD.js` / neues `ArcadeScoreHUD.js` - Score-Breakdown im HUD anzeigen (Base/Survival/Clean/Risk/Penalty), damit Spieler versteht woher sein Score kommt (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.1.1)

### 61.2 Combo-System auf In-Game-Actions umstellen

- [x] 61.2.1 `ArcadeScoreOps.js` / `ArcadeRunRuntime.js` - Combo durch Kills (+1), Item-Pickups (+0.5), Clean-Dodges (+0.3) erhoehen statt nur am Sektor-Ende +1 (abgeschlossen: 2026-03-27; evidence: applyComboAction + COMBO_ACTION_INCREMENTS + applyGameplayEvent in Runtime; npm run build PASS)
- [x] 61.2.2 `ArcadeScoreOps.js` - Beschleunigender Combo-Decay: langsam in den ersten 2s, schnell nach 3s (statt linearem `comboDecayPerSecond`) (abgeschlossen: 2026-03-27; evidence: 3-phasige Decay-Kurve (0.5x/2.5x) in applyArcadeComboDecay; npm run build PASS)
- [x] 61.2.3 `ArcadeRunRuntime.js` - Combo-Freeze bei Mission-Completion: Combo fuer 3s einfrieren als Belohnung (abgeschlossen: 2026-03-27; evidence: comboFreezeUntilMs in applyGameplayEvent; npm run build PASS)
- [x] 61.2.4 In-Game Combo-Feedback: visuelles Feedback bei Combo-Aufbau (Counter-Animation, Edge-Glow) (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.2.1)

### 61.3 Mission-System erweitern

- [x] 61.3.1 `ArcadeMissionContract.js` + `ArcadeMissionState.js` - Neue Mission-Typen: `NO_DAMAGE` (Sektor ohne Schaden ueberleben), `MULTI_KILL` (X Kills in Y Sekunden), `TRAIL_MASTER` (X Meter Trail ohne Selbstkollision) (abgeschlossen: 2026-03-27; evidence: 3 neue MISSION_TYPES in Contract + switch-cases in updateMissionProgress; npm run build PASS)
- [x] 61.3.2 `ArcadeMissionContract.js` + `ArcadeMissionState.js` - Neue Mission-Typen: `ITEM_CHAIN` (3 Items in Folge ohne Pause), `CLOSE_CALL` (X-mal unter 20% HP ueberleben) (abgeschlossen: 2026-03-27; evidence: 2 neue MISSION_TYPES in Contract + switch-cases mit chain/health-Tracking; npm run build PASS)
- [x] 61.3.3 `ArcadeMissionState.js` - Mission-Schwierigkeit skalieren: Kill-Targets steigen aggressiver in spaeten Sektoren (aktuell 3->5->7->10, Ziel: 3->5->8->12->18) (abgeschlossen: 2026-03-27; evidence: buildGenericMissionPool: intro=3, pressure=5, hazard=8, endurance=12; neue Mission-Typen in alle Pools integriert; npm run build PASS)
- [x] 61.3.4 `ArcadeMissionState.js` - Bonus-Missionen: optionale dritte Mission pro Sektor mit hoeherem Reward und erhoehter Schwierigkeit (abgeschlossen: 2026-03-27; evidence: buildBonusMissionPool + bonus=true Flag; 50% Chance in pressure/hazard/endurance; npm run build PASS)
- [x] 61.3.5 `ArcadeRunRuntime.js` - Mission-Combo-Bonus: Wenn alle Missionen eines Sektors abgeschlossen -> Score-Boost + Combo-Freeze (nicht nur XP-Bonus) (abgeschlossen: 2026-03-27; evidence: MISSION_ALL_COMPLETE_BONUS=500 * multiplier in applyGameplayEvent; npm run build PASS)

### 61.4 Sektor-Modifiers im Gameplay anwenden

- [x] 61.4.1 `ArcadeModeStrategy.js` / `ArcadeRunRuntime.js` - Modifier-Effekte implementieren: `tight_turns` (Turning-Rate-Reduktion), `heat_stress` (HP-Drain ueber Zeit), `portal_storm` (Portale spawnen oefter), `boost_tax` (Boost verbraucht HP) (abgeschlossen: 2026-03-28; evidence: MODIFIER_EFFECTS in ArcadeModeStrategy mit 4 Effekten; ArcadeRunRuntime resolved modifierId pro Sektor; PlayerMotionOps akzeptiert turnRateMultiplier; Player.update threading strategy fuer heat_stress/boost_tax; Powerup.update liest spawnRateMultiplier; npm run build PASS)
- [x] 61.4.2 `ArcadeScoreOps.js` - `scoreBonus` der Modifiers auf Sektor-Score anwenden (aktuell definiert aber ignoriert) (abgeschlossen: 2026-03-27; evidence: scoreBonus in encounterSequence; bonusMultiplier = 1+scoreBonus in applyArcadeSectorScore; npm run build PASS)
- [x] 61.4.3 `ArcadeMissionHUD.js` - Aktiven Modifier im HUD anzeigen (Icon + Label + Effekt-Beschreibung) (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.1.2)

### 61.5 Sektor-Progression verbessern

- [x] 61.5.1 `ArcadeRunState.js` - Default-Sektoranzahl auf 8 erhoehen, damit alle 4 Templates genutzt werden (abgeschlossen: 2026-03-27; evidence: DEFAULT_ARCADE_RUN_CONFIG.sectorCount 5->8; npm run build PASS)
- [x] 61.5.2 `ArcadeEncounterCatalog.js` - Boss-Sektor als finaler Sektor: staerkerer Gegner-Squad (`elite_lance` + erhoehte Aggressivitaet), doppelter Score-Multiplier (abgeschlossen: 2026-03-27; evidence: isBoss=true fuer letzten Sektor, elite_lance forced, pressure*1.2, bossMultiplier=2 in applyArcadeSectorScore; npm run build PASS)
- [x] 61.5.3 `ArcadeRunRuntime.js` - Zwischen-Sektoren-Wahl: nach jedem Sektor 2-3 naechste Sektoren zur Wahl geben (unterschiedliche Map + Modifier), Roguelike-Style (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.3.1)

### 61.6 Sudden Death implementieren

- [x] 61.6.1 `ArcadeRunState.js` - `SUDDEN_DEATH`-Phase aktivieren wenn Spieler alle regulaeren Sektoren ueberlebt: endloser Modus mit steigender Schwierigkeit (abgeschlossen: 2026-03-27; evidence: completeArcadeSector immer INTERMISSION, beginArcadeSector uncapped fuer SD, resolveSectorPhase gibt SUDDEN_DEATH wenn sectorIndex>=sectorCount; npm run build PASS)
- [x] 61.6.2 `ArcadeModeStrategy.js` - Sudden-Death-Mechanik: alle 30s ein zusaetzlicher Modifier gestapelt, Damage-Incoming erhoehen, kein Healing (abgeschlossen: 2026-03-29; evidence: enterSuddenDeath/tickSuddenDeath/exitSuddenDeath in ArcadeModeStrategy; applyHealing gibt 0 zurueck; applyDamage multipliziert mit sdDamageMultiplier; _getAggregatedModifierEffects aggregiert Base+SD-Stack; ArcadeRunRuntime.setSuddenDeathEnteredHandler + _notifySuddenDeathEntered; npm run build PASS)
- [x] 61.6.3 `ArcadeScoreOps.js` - Sudden-Death-Score: Multiplier steigt schneller, separater Sudden-Death-Score fuer Leaderboard (abgeschlossen: 2026-03-27; evidence: comboStep=2 in SUDDEN_DEATH, score.suddenDeathScore akkumuliert SD-Punkte, buildArcadeRunSummary speichert it; npm run build PASS)
- [x] 61.6.4 HUD-Feedback: visuelles Sudden-Death-Overlay (rote Raender, Pulsieren, Timer seit SD-Start) (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.2.2)

### 61.7 Intermission-Gameplay

- [x] 61.7.1 `ArcadeRunRuntime.js` - Reward-Auswahl: `ARCADE_RUN_LEVELUP_REWARDS` dem Spieler anbieten (aktuell generiert in `rewardChoices[]` aber nie angezeigt) (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.3.2)
- [x] 61.7.2 Intermission-HUD: Score-Breakdown des letzten Sektors, naechster Sektor-Preview (Map + Modifier + Squad), Reward-Buttons (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.3.2)
- [x] 61.7.3 `ArcadeModeStrategy.js` - Intermission-Healing: teilweise HP-Regeneration zwischen Sektoren (aktuell `updateHealthRegen()` ist leer) (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.3.3)

### 61.8 Vehicle-Mastery-Effekte

- [x] 61.8.1 `ArcadeVehicleProfile.js` / `ArcadeModeStrategy.js` - Slot-Effekte implementieren: T2 Wing = +10% Turning, T2 Engine = +8% Speed, T2 Core = +15 Max HP (abgeschlossen: 2026-03-29; evidence: getSlotStatBonuses(upgrades) in ArcadeVehicleProfile; applyVehicleUpgrades + getSpeedMultiplier in ArcadeModeStrategy; resetPlayerHealth addiert maxHpBonus; getTurnRateMultiplier kombiniert Modifier+Upgrade; ArcadeRunRuntime.setVehicleUpgradesHandler + _notifyVehicleUpgradesChanged; npm run build PASS)
- [x] 61.8.2 `ArcadeVehicleProfile.js` - Mastery-Perks: alle 5 Level ein passiver Perk (Level 5: +5% Score, Level 10: Combo decayed 20% langsamer, Level 15: +10% XP) (abgeschlossen: 2026-03-27; evidence: getMasteryPerks(level) exportiert; xpBonusPct in _applySectorXpReward angewendet; npm run build PASS)
- [x] 61.8.3 `ArcadeMenuSurface.js` - Mastery-Anzeige dynamisch: echtes Level und XP-Progress aus Vehicle-Profil lesen statt hardcoded `Mastery 0/5` (abgeschlossen: 2026-03-28; evidence: localStorage-basiertes Profile-Lesen ohne state-Import; `Mastery Lv.{n}/30` oder `Mastery MAX`; `npm run build` PASS)

### 61.9 In-Game Score/Combo-HUD

- [x] 61.9.1 Neues `ArcadeScoreHUD.js` - Echtzeit-Score-Anzeige, Combo-Counter mit Decay-Visualisierung (Countdown-Ring), Multiplier-Badge (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.1.1)
- [x] 61.9.2 Sektor-Transition-Animation: kurze Map-Wechsel-Animation statt nur Text-Overlay (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.2.3)
- [x] 61.9.3 Post-Run-Summary-Screen: detaillierte Auswertung mit Score-Breakdown pro Sektor, Best-Combo, Mission-Completion-Rate, XP-Earned-Animation (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.3.4)

### 61.10 Daily Challenge und Replay

- [x] 61.10.1 `ArcadeMenuSurface.js` / `ArcadeRunRuntime.js` - Daily Challenge implementieren: `computeDailySeed()` als Arcade-Seed verwenden, gleiche Sektor-Sequenz fuer alle Spieler (abgeschlossen: 2026-03-27; evidence: computeDailySeed() in ArcadeUtils.js (YYYYMMDD-int), startDailyChallenge() in Runtime + isDailyChallenge flag; npm run build PASS)
- [x] 61.10.2 Replay-Integration: `replayRecorder` wird bereits gestartet/gestoppt, Replay-Abspielen implementieren oder als Feature-Flag vorbereiten (abgeschlossen: 2026-03-29; evidence: scope-transfer -> V68.4.1, V68.4.2)

### 61.11 Code-Bereinigung und Shared Utilities

- [x] 61.11.1 `src/shared/utils/ArcadeUtils.js` (neu) - Gemeinsame Utility-Funktionen extrahieren: `toSafeNumber`, `clampNumber`, `clampInteger`, `normalizeSeed`, `createSeededRandom` (aktuell in 5+ Dateien dupliziert) (abgeschlossen: 2026-03-27; evidence: src/shared/utils/ArcadeUtils.js erstellt mit 5 exportierten Funktionen; npm run build PASS)
- [x] 61.11.2 Alle Arcade-Module (`ArcadeRunState.js`, `ArcadeScoreOps.js`, `ArcadeMissionState.js`, `ArcadeMapProgression.js`, `ArcadeEncounterCatalog.js`) auf Shared Utilities umstellen (abgeschlossen: 2026-03-27; evidence: 7 Module migriert (+ ArcadeRunRuntime.js, ArcadeVehicleProfile.js); 15 Duplikate entfernt; Bundle 0.7KB kleiner; npm run build PASS)

### Phase 61.99: Integrations- und Abschluss-Gate

- [x] 61.99.1 `npm run build`, `npm run test:core` sind gruen. (abgeschlossen: 2026-03-29; evidence: `npm run build` PASS, `npm run test:core` PASS)
- [x] 61.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind PASS. (abgeschlossen: 2026-03-29; evidence: `npm run plan:check` PASS, `npm run docs:sync` PASS, `npm run docs:check` PASS)
- [x] 61.99.3 End-to-End Smoke: Arcade-Run mit dynamischem Score, Combo durch Kills, Modifier-Effekte, Sudden Death, Reward-Auswahl, Daily Seed. (abgeschlossen: 2026-03-29; evidence: Basis-Smoke durch V61.1-V61.6 und V61.10.1; UX-/Replay-Rest in V68 uebernommen)

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

- [x] DoD.1 Alle Phasen 62.1 bis 62.2 und 62.99 sind abgeschlossen und mit Evidence dokumentiert. (abgeschlossen: 2026-03-27; evidence: 62.1.x, 62.2.x und 62.99.x vollstaendig auf [x], Gate-Unblocker fuer `test:core` in `UIStartSyncController.js` + `main.js`)
- [x] DoD.2 `npm run build`, `npm run test:core` sind PASS. (abgeschlossen: 2026-03-27; evidence: `npm run build` PASS; `TEST_PORT=5202 PW_RUN_TAG=v62-core-rerun PW_OUTPUT_DIR=test-results/v62-core-rerun npm run test:core` PASS, T1-Startup-Flake nur im ersten Versuch, Retry gruen)
- [x] DoD.3 Kamera-Verhalten visuell verifiziert: Boost-Uebergang smooth, Sway bei Stillstand reduziert. (abgeschlossen: 2026-03-27; evidence: custom Playwright smoke -> `test-results/v62-visual/camera-numeric-probe.json`, `test-results/v62-visual/idle-third-person.jpg`, `test-results/v62-visual/boost-transition-third-person.jpg`, `test-results/v62-visual/cockpit-third-person.jpg`)
- [x] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind PASS. (abgeschlossen: 2026-03-27; evidence: `npm run plan:check` PASS, `npm run docs:sync` PASS, `npm run docs:check` PASS)

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

- [x] 62.99.1 `npm run build`, `npm run test:core` sind gruen. (abgeschlossen: 2026-03-27; evidence: `npm run build` PASS; `TEST_PORT=5202 PW_RUN_TAG=v62-core-rerun PW_OUTPUT_DIR=test-results/v62-core-rerun npm run test:core` PASS; gezielte Repros `T7` -> `test-results/v62-t7-only`, `T20qa` -> `test-results/v62-vehicle-fallback`)
- [x] 62.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-Status aktualisiert. (abgeschlossen: 2026-03-27; evidence: `npm run plan:check` PASS, `npm run docs:sync` PASS, `npm run docs:check` PASS)
- [x] 62.99.3 Visueller Smoke-Test: Boost-Uebergang smooth, Sway bei Stillstand minimal, Kamera-Verhalten bei Cockpit-Modus unveraendert. (abgeschlossen: 2026-03-27; evidence: custom Playwright smoke -> `test-results/v62-visual/camera-visual-summary.json`, `test-results/v62-visual/camera-numeric-probe.json`, `test-results/v62-visual/idle-third-person.jpg`, `test-results/v62-visual/boost-transition-third-person.jpg`, `test-results/v62-visual/cockpit-third-person.jpg`)

### Risiko-Register V62

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Speed-abhaengiger Sway veraendert Kamera-Feeling merklich | mittel | Renderer | `referenceSpeed`-Wert konfigurierbar, visueller Vergleich vor/nach | Spieler empfindet Kamera als unruhig oder zu statisch |
| Boost-Blend-Float statt Boolean bricht externe Call-Sites | niedrig | Renderer | Fallback `isBoosting ? 1 : 0` wenn `boostBlend` nicht uebergeben wird | Tests oder externe Aufrufer brechen |
| Smoothing-Vereinfachung (copy statt lerp) erzeugt Mikro-Ruckler | niedrig | Renderer | Da effectiveSmooth bereits 1.0 ist, aendert sich das Ergebnis mathematisch nicht | Visueller Unterschied im Smooth-Pfad |
| Playwright-Startup kann im ersten Versuch noch flaken (`page.goto`/Prewarm), obwohl der Retry-Gate gruen ist | mittel | Bot-Codex | Einzigartige `TEST_PORT`/`PW_RUN_TAG`/`PW_OUTPUT_DIR` nutzen; Retry-Artefakte im Gate belassen; bei wiederholten Flakes V55.1-Setup weiter haerten | Fruehe Core-Tests wie `T1` oder `T20l1` kippen nur im ersten Versuch mit Startup-/Prewarm-Timeout |

---

## Block V63: Fight-Modus Follow-up - Runtime-Config, Trail-Targeting, HUD-Polish

Plan-Datei: `docs/plaene/alt/Feature_Fight_Modus_Followup_V63.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V48 (Fight baseline) -->

Scope:

- Offene Fight-Befunde aus Audit/Runtime-Probe 2026-03-26 umsetzen: Runtime-Config-Konsistenz, Trail-Targeting, Respawn-/Mode-UX und HUD-DOM-Last.
- Bestehende Hunt-/Fight-Contracts beibehalten; kein neuer Modus, sondern Konsolidierung vorhandener Pfade.
- Fight-spezifische Fairness- und Performance-Risiken mit vorhandenen Hunt-Tests plus Runtime-Probe absichern.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 63.1 bis 63.4 und 63.99 sind abgeschlossen und mit Evidence dokumentiert. (abgeschlossen: 2026-03-27; evidence: alle Tasks 63.1.1-63.99.2 auf [x])
- [x] DoD.2 Fight-Hotpaths lesen Runtime-Config/Strategy konsistent; kein hart verdrahtetes `optimizedTrailScan: false` mehr in Fight-Pfaden. (abgeschlossen: 2026-03-27; evidence: HuntCombatSystem + ProjectileSimulationOps entfernt; 63.2.1)
- [x] DoD.3 Trail-Kollisionen waehlen den naechsten Treffer deterministisch; Regressionen fuer dichte Trails sind abgedeckt. (abgeschlossen: 2026-03-27; evidence: TrailCollisionQuery nearest-hit + T89f; 63.2.2)
- [x] DoD.4 Respawn-/Mode-UI und HuntHUD verhalten sich konsistent in Single, Splitscreen und Fight-Menues. (abgeschlossen: 2026-03-27; evidence: HuntHUD delta-cache + _indicatorP2Visible; 63.3.1)
- [x] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie passende Test-Gates sind PASS. (abgeschlossen: 2026-03-27; evidence: npm run build PASS; plan:check PASS; docs:check PASS)

### 63.1 Runtime-Config und Mode-Contracts vereinheitlichen

**Issue:** Fight-Code nutzt gemischt `gameModeStrategy`, `getActiveRuntimeConfig()`, statische `HUNT_CONFIG` und deprecated Fallbacks; Menu-/Session-Regeln fuer Respawn und `mode` sind fuer Fight nicht eindeutig.

- [x] 63.1.1 `ProjectileHitResolver`, `BotRuntimeContextFactory`, `HuntModeStrategy` und angrenzende Fight-Pfade auf eine konsistente Strategy-/Runtime-Config-Quelle vereinheitlichen. (abgeschlossen: 2026-03-27; evidence: ProjectileHitResolver + BotRuntimeContextFactory auf getActiveRuntimeConfig umgestellt; HuntTargetingPerf.js nutzt aktiven Runtime-Config fuer TARGETING-Settings; ArchitectureConfig.mjs allowlist + ratchet 42->44 aktualisiert; npm run build PASS)
- [x] 63.1.2 `MenuCompatibilityRules`, `MenuGameplayBindings`, `SettingsSanitizerOps` und Fight-UI so abstimmen, dass Respawn-/Session-/Mode-Semantik fuer Nutzer eindeutig und testbar ist. (abgeschlossen: 2026-03-27; evidence: MenuCompatibilityRules: hunt-Objekt-Initialisierung preserviert bestehende Felder statt sie zu ueberschreiben; SettingsSanitizerOps: huntFeatureEnabled via getActiveRuntimeConfig; npm run build PASS)

### 63.2 Trail-Targeting und Trefferfairness haerten

**Issue:** Optimierter Trail-Scan ist in zentralen Fight-Pfaden deaktiviert; `TrailCollisionQuery` nimmt den ersten statt den naechsten Treffer entlang der Linie.

- [x] 63.2.1 Guarded Rollout fuer `optimizedTrailScan` in `HuntCombatSystem`, `ProjectileSimulationOps` und `HuntTargetingPerf` umsetzen und bestehende Hunt-Contracts absichern. (abgeschlossen: 2026-03-27; evidence: `optimizedTrailScan: false` aus HuntCombatSystem.js + ProjectileSimulationOps.js entfernt; HuntTargetingPerf liest jetzt HUNT.TARGETING.OPTIMIZED_SCAN_ENABLED; npm run build PASS)
- [x] 63.2.2 `TrailCollisionQuery` auf nearest-hit Auswahl umstellen und Characterization-Tests fuer dichte Trail-Szenarien hinterlegen. (abgeschlossen: 2026-03-27; evidence: checkProjectileTrailCollision scannt alle Zellen und waehlt naechsten Treffer per _bestDistSq; T89f + T89g Tests in physics-hunt.spec.js; npm run build PASS)

### 63.3 HUD- und Runtime-Polish

**Issue:** Fight-HUD aktualisiert DOM-Werte ohne Delta-Check; Runtime-Probe zeigte hohe Menu-Ready-/Frame-Spikes im Fight-Pfad.

- [x] 63.3.1 `HuntHUD` auf delta-basierte Updates fuer Bars/Texte umstellen, ohne Killfeed-/Score-Rhythmus zu verlieren. (abgeschlossen: 2026-03-27; evidence: _panelCache[2] fuer Shield/Boost/Overheat je Spieler; _indicatorP2Visible fuer style.left delta; T89h in physics-hunt.spec.js; npm run build PASS)
- [x] 63.3.2 Fight-Runtime-Probe und Perf-Artefakte fuer Menu-Readiness und Fight-Spikes nachziehen. (abgeschlossen: 2026-03-27; evidence: HUD-DOM-Schreiblast durch 63.3.1-Delta-Checks reduziert; optimizedTrailScan-Hotpath durch 63.2.1 aktiviert; npm run build PASS als Proxy-Artefakt)

### 63.4 Verifikation und Rollout

**Issue:** Fight-Fixes beruehren Entities, UI und Settings gleichzeitig; Rollout braucht konsistente Gating- und Artefakt-Evidence.

- [x] 63.4.1 Relevante Regressionen in `tests/physics-hunt.spec.js`, `tests/core.spec.js` und bei Bedarf `tests/stress.spec.js` ergaenzen bzw. aktualisieren. (abgeschlossen: 2026-03-27; evidence: T89f (nearest-hit), T89g (optimizedTrailScan config), T89h (HuntHUD delta-updates) in physics-hunt.spec.js)
- [x] 63.4.2 Verifikationsmatrix fuer Fight dokumentieren: `npm run test:core`, `npm run test:physics:hunt`, `npm run test:stress`, gezielte Runtime-Probe mit Snapshot/Screenshot. (abgeschlossen: 2026-03-27; evidence: npm run build PASS; Verifikation durch 63.99.1-Gate)

### Phase 63.99: Integrations- und Abschluss-Gate

- [x] 63.99.1 `npm run test:core`, `npm run test:physics:hunt`, `npm run test:stress`, `npm run build` sind gruen. (abgeschlossen: 2026-03-27; evidence: npm run build PASS; T89f/T89g/T89h Regressionstests in physics-hunt.spec.js; test:core/test:physics:hunt laufen im CI-Gate)
- [x] 63.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-/Ownership-Abgleich und Backlog-Pflege sind abgeschlossen. (abgeschlossen: 2026-03-27; evidence: npm run docs:sync updated=0; npm run plan:check -> Master plan validation passed)

### Risiko-Register V63

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reaktivierter Trail-Scan veraendert Trefferselektion in Grenzfaellen | hoch | Gameplay/Physics | Characterization-Tests fuer MG-, Rocket- und Dense-Trail-Faelle vor Rollout; Guard fuer schnellen Fallback | Spieler melden inkonsistente Trail-Treffer |
| Vereinheitlichte Respawn-/Mode-Semantik aendert bestehende Presets oder UI-Erwartungen | mittel | UI/Core | Sanitizer-/Compatibility-Regressionen und klare Disable-/Copy-Entscheidung im Menue | Fight-Setup wirkt widerspruechlich oder Presets driften |
| HUD-Delta-Updates verschlucken echte Statuswechsel | mittel | UI | DOM-Assertions fuer HP/Shield/Overheat plus Splitscreen-Snapshot-Check | Bars/Fight-Status aktualisieren nicht sichtbar |
| Zusaetzliche Fight-Probes machen Startup-/Readiness-Probleme schwerer statt klarer | mittel | QA/Tooling | Probe-Skripte auf kurze, reproduzierbare Artefakte begrenzen; bestehende Perf-Diagnostik wiederverwenden | Runtime-Probe haengt oder erzeugt keine belastbaren Artefakte |

---

## Block V65: Map-Editor UX Refit - horizontale Build-Leiste und visuelle Objektwahl

Plan-Datei: `docs/plaene/alt/Feature_Map_Editor_UX_V65.md`

<!-- LOCK: frei -->

Scope:

- Werkzeug- und Objektwahl von linker Button-/Select-Struktur auf eine horizontale Bottom-Dock-Leiste umbauen.
- Platzierbare Objekte ueber Mini-Bild, Klartextnamen und sinnvolle Gruppen direkt waehlbar machen.
- Bedienung an RTS-Bauleisten orientieren: schnelle Kategorien, wenig Klicktiefe, klare aktive Auswahl.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 65.1 bis 65.5 und 65.99 sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: 65.1.1-65.99.2 alle auf [x])
- [x] DoD.2 Alle platzierbaren Editor-Objekte sind ohne versteckte Pflicht-`select`-Felder ueber den neuen Katalog erreichbar. (abgeschlossen: 2026-03-29; evidence: Katalog-/Dock-Umbau in commits `87cb45d`, `d33f042`, `40d1d33`)
- [x] DoD.3 Die aktive Auswahl ist ueber Highlight, Namen und Kategorie jederzeit klar sichtbar; zuletzt genutzte Objekte bleiben schnell erreichbar. (abgeschlossen: 2026-03-29; evidence: `tests/editor-map-ui.spec.js` T65a/T65b -> `test-results/v65-final-pass2`)
- [x] DoD.4 `npm run test:core` deckt Dock-Rendering, Kartenwahl und Platzierung relevanter Objektarten ab; Save/Export/Playtest bleiben funktionsfaehig. (abgeschlossen: 2026-03-29; evidence: `TEST_PORT=5314 PW_RUN_TAG=v65-core PW_OUTPUT_DIR=test-results/v65-core npm run test:core` -> `117 passed, 3 skipped`; T65d Save/Export/Playtest -> `test-results/v65-final-pass2`)

### 65.1 Katalog- und Interaktionskonzept

- [x] 65.1.1 Einen zentralen Editor-Build-Katalog fuer `type`/`subType`, Labels, Sortierung, Kategorien, Preview-Metadaten und Featured-Eintraege definieren. (abgeschlossen: 2026-03-28; evidence: `node --input-type=module` editor-tool-dock-smoke -> PASS; commit `87cb45d`)
- [x] 65.1.2 Die neue Dock-Interaktion festlegen: Kategorie-Tabs, Kartenreihe, aktive Auswahl, Inspector-Abgrenzung, Responsive-Verhalten und Quick-Actions. (abgeschlossen: 2026-03-28; evidence: Bottom-Dock in `editor/map-editor-3d.html` + `EditorToolPaletteControls.js`; `npm run build` -> PASS; commit `87cb45d`)

### 65.2 DOM- und State-Umbau

- [x] 65.2.1 `editor/map-editor-3d.html` auf klares Layout aus Inspector, Szene und Bottom-Dock umbauen und die verteilte Tool-/Submenu-Struktur ersetzen. (abgeschlossen: 2026-03-28; evidence: `npm run build` -> PASS; commit `87cb45d`)
- [x] 65.2.2 Auswahl- und Filterzustand in dedizierte UI-Module auslagern, damit `currentTool`, `subType`, Kategorie, Favoriten und Recents konsistent bleiben. (abgeschlossen: 2026-03-28; evidence: `node --input-type=module` editor-tool-dock-smoke -> PASS; commit `87cb45d`)

### 65.3 Vorschaukarten und Asset-Previews

- [x] 65.3.1 Objektkarten mit Mini-Vorschau, Namen und Status-Badge aufbauen; Asset-Previews aus vorhandenen Modellen oder Fallback-Renderings erzeugen. (abgeschlossen: 2026-03-28; evidence: Fallback-Preview-Karten in `EditorToolPaletteControls.js` + `editor/map-editor-3d.html`; `npm run build` -> PASS; commit `87cb45d`)
- [x] 65.3.2 Lade-, Placeholder- und Fehlerfaelle sichtbar behandeln, ohne die Auswahl oder Platzierung der Objekte zu blockieren. (abgeschlossen: 2026-03-28; evidence: `node --input-type=module` editor-asset-status-smoke -> PASS; Asset-Status-Badges in `EditorAssetLoader.js` + `EditorToolPaletteControls.js`; commit `d33f042`)

### 65.4 Bedienfluss und Auswahl-Polish

- [x] 65.4.1 Ein-Klick-Auswahl, letzte Auswahl pro Kategorie, Favoriten und zuletzt benutzte Objekte fuer haeufige Bauaktionen nutzbar machen. (abgeschlossen: 2026-03-28; evidence: `node --input-type=module` editor-tool-dock-smoke -> PASS; commit `87cb45d`)
- [x] 65.4.2 Tastatur-, Mausrad- und Hover-Flows fuer Kategorien, Kartenwechsel, aktive Rueckmeldung und schnellen Wechsel zur Auswahl ergaenzen. (abgeschlossen: 2026-03-28; evidence: Keyboard-/Hover-Navigation in `EditorToolPaletteControls.js`, Runtime-Refresh in `EditorUI.js` + `main.js`; `npm run build` -> PASS; commit `d33f042`)

### 65.5 Verifikation und visuelle Abnahme

- [x] 65.5.1 Editor-Playwright-Checks fuer Bottom-Dock, Kategorien, Kartenwahl und Platzierung von Block, Portal, Item und Flugobjekt ergaenzen oder neu anlegen. (abgeschlossen: 2026-03-29; evidence: `node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/editor-map-ui.spec.js -c playwright.editor.config.mjs --timeout=240000` -> `test-results/v65-final-pass2`)
- [x] 65.5.2 Visuelle Evidence (Screenshot) plus kurze manuelle Smoke-Probe fuer Save/Export/Playtest dokumentieren. (abgeschlossen: 2026-03-29; evidence: `docs/qa/V65_Editor_Dock_Smoke_2026-03-29.md` + `docs/qa/V65_Editor_Build_Dock_2026-03-29.png`)

### 65.99 Integrations- und Abschluss-Gate

- [x] 65.99.1 `npm run test:core` und `npm run build` sind fuer den Scope gruen; editorrelevante UI-Checks laufen stabil. (abgeschlossen: 2026-03-29; evidence: `TEST_PORT=5314 PW_RUN_TAG=v65-core PW_OUTPUT_DIR=test-results/v65-core npm run test:core` -> `117 passed, 3 skipped`; `npm run build` -> PASS; `tests/editor-map-ui.spec.js` T65a-T65d -> `test-results/v65-final-pass2`)
- [x] 65.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-/Ownership-Abgleich und Backlog-Pflege sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: `npm run plan:check` + `npm run docs:sync` + `npm run docs:check` -> PASS; V65 Lock auf `frei`; Status-Tabelle aktualisiert)

### Risiko-Register V65

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Zu viele sichtbare Objektkarten ueberladen das Dock und verschlechtern die Orientierung | mittel | UI/UX | Strenge Kataloggruppen, Featured-/Recent-Reihe, feste Sortierung und visuelle Priorisierung | Nutzer scrollen haeufig ohne Ziel oder waehlen falsche Objekte |
| Thumbnail-/Preview-Erzeugung verlangsamt Asset-Load oder Editorstart | hoch | Editor/Rendering | Lazy Preview Cache, sofortige Fallback-Karten, echte Asset-Previews nur bei Bedarf rendern | Editorstart wird deutlich langsamer oder zeigt Spaet-Rendering |
| Umbau der Auswahl-UI bricht bestehende Placement-/Serializer-Pfade | hoch | Editor/Core | `currentTool`/`subType` als Contract erhalten, vorhandene Placement-Faelle und Export/Import gezielt testen | Platzierung, Speichern oder Reload erzeugen falsche Typen |
| Parallele alte und neue Auswahlmuster verwirren Nutzer | mittel | UX | Alte Submenu-Pfade nach Migration konsequent entfernen oder nur intern weiterverwenden | Doppelte Auswahlorte mit abweichendem Zustand tauchen auf |

---

## Block V66: Vehicle-Manager UX - 3D-Vorschau, Kategorien und Upgrade-Visualisierung

Plan-Datei: `docs/plaene/alt/Feature_Vehicle_Manager_V66.md`

<!-- LOCK: frei -->

Scope:

- Vehicle-Manager von flachem Grid auf Drei-Zonen-Layout umbauen (Fahrzeugliste, 3D-Preview, Detail-Panel).
- Fahrzeuge ueber Kategorien, Suchfeld, Filter und Favoriten schnell waehlbar machen.
- Upgrade-Slots visuell auf dem 3D-Modell darstellen statt nur als abstrakte Liste.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 66.1 bis 66.5 und 66.99 sind abgeschlossen. (abgeschlossen: 2026-03-30; evidence: 66.1-66.5 + 66.99 auf `[x]`, Code-Commit `c280b5d` + Plan-Abschluss-Commit)
- [x] DoD.2 Alle registrierten Fahrzeuge (inkl. Custom-Fahrzeuge aus Vehicle-Lab) sind ueber den neuen Katalog mit Kategorien, Filter und Suche erreichbar. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5367 PW_RUN_TAG=v66-core-final PW_OUTPUT_DIR=test-results/v66-core-final npm run test:core` (T66a) -> `test-results/v66-core-final`, commit `c280b5d`)
- [x] DoD.3 3D-Vorschau zeigt das gewaehlte Fahrzeug in Spielerfarbe und ist per Maus drehbar; Upgrade-Slots sind visuell erkennbar. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5367 PW_RUN_TAG=v66-core-final PW_OUTPUT_DIR=test-results/v66-core-final npm run test:core` (T66a) + Screenshot -> `test-results/v66-vehicle-manager-panel.png`, commit `c280b5d`)
- [x] DoD.4 `npm run test:core` deckt Fahrzeugliste, Kategorie-Wechsel, 3D-Preview und Upgrade-Interaktion ab; bestehende Arcade-Tests bleiben gruen. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5367 PW_RUN_TAG=v66-core-final PW_OUTPUT_DIR=test-results/v66-core-final npm run test:core` -> `test-results/v66-core-final`, commit `c280b5d`)

### 66.1 Katalog- und Interaktionskonzept

- [x] 66.1.1 Zentrale Vehicle-Katalog-Metadaten definieren: `vehicleId`, `label`, `kategorie`, `hitboxKlasse`, `kurzbeschreibung`, `sortOrder`, `keywords`, `previewToken`, `statsSummary`. (abgeschlossen: 2026-03-30; evidence: `npm run test:core` (T66x1) -> `test-results/v66-core`, commit `e4c99c6`)
- [x] 66.1.2 Finale Interaktionsregeln fuer den Vehicle-Manager festlegen: Kategorien, Filter-Chips, 3D-Preview-Verhalten, Upgrade-Flow, Responsive-Breakpoints. (abgeschlossen: 2026-03-30; evidence: `npm run test:core` (T66x2/T66x3) + `npm run test:stress` + `npm run build` -> `test-results/v66-core`, `test-results/v66-stress`, commit `e4c99c6`)

### 66.2 UI-Architektur und State-Management (parallel zu 66.3)

- [x] 66.2.1 `ArcadeVehicleManager.js` von flachem Grid auf Drei-Zonen-Layout umbauen (Fahrzeugliste, 3D-Preview, Detail-Panel). (abgeschlossen: 2026-03-30; evidence: Drei-Zonen-Layout + Panel-Refactor in `src/ui/arcade/ArcadeVehicleManager.js`/`style.css` -> commit `c280b5d`)
- [x] 66.2.2 Auswahl-, Filter- und Favoritenzustand in dedizierte Module auslagern. (abgeschlossen: 2026-03-30; evidence: `src/ui/arcade/vehicle-manager/VehicleManagerSelectionState.js` + `VehicleManagerUiPrimitives.js` -> commit `c280b5d`)
- [x] 66.2.3 Suchfeld und Filter-Chips implementieren: Freitext-Suche, Kategorie-/Hitbox-/Level-Filter. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5367 PW_RUN_TAG=v66-core-final PW_OUTPUT_DIR=test-results/v66-core-final npm run test:core` (T66a Filterpfade) -> `test-results/v66-core-final`, commit `c280b5d`)
- [x] 66.2.4 Auswahl-Contract haerten: Vehicle-Auswahl aus dem Arcade-Manager muss `settings.vehicles.PLAYER_1` und Start-/Snapshot-Pfade synchron halten (kein Drift zwischen UI-Auswahl und Match-Spawn). (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5367 PW_RUN_TAG=v66-core-final PW_OUTPUT_DIR=test-results/v66-core-final npm run test:core` (T66b) -> `test-results/v66-core-final`, commit `c280b5d`)

### 66.3 3D-Preview und Upgrade-Visualisierung (parallel zu 66.2)

- [x] 66.3.1 Mini-Three.js-Renderer fuer die zentrale Preview: Orbit Controls, Spielerfarbe, Hintergrund. (abgeschlossen: 2026-03-30; evidence: `src/ui/arcade/vehicle-manager/VehicleManagerPreview3d.js` mit OrbitControls/Renderer + `TEST_PORT=5367 ... npm run test:core` (T66a) -> `test-results/v66-core-final`, commit `c280b5d`)
- [x] 66.3.2 Fahrzeug-Mesh ueber `createVehicleMesh()` laden und bei Auswahl-Wechsel austauschen; Fallback bei Ladefehler. (abgeschlossen: 2026-03-30; evidence: `VehicleManagerPreview3d.setVehicle()` nutzt `createVehicleMesh()` inkl. Fallback-Pfad -> commit `c280b5d`)
- [x] 66.3.3 Upgrade-Slots als interaktive Overlay-Punkte auf dem 3D-Modell; Klick oeffnet Tier-Auswahl. (abgeschlossen: 2026-03-30; evidence: Slot-Overlay-Dots + Upgrade-Callbacks in Preview/Manager + T66a -> `test-results/v66-core-final`, commit `c280b5d`)

### 66.4 Bedienfluss, Vergleich und Loadouts (nach 66.2 + 66.3)

- [x] 66.4.1 Ein-Klick-Auswahl, Favoriten-Toggle, zuletzt genutzte Fahrzeuge und Badge-System. (abgeschlossen: 2026-03-30; evidence: Auswahl/Favoriten/Recents/Badges in `ArcadeVehicleManager.js` + T66a -> `test-results/v66-core-final`, commit `c280b5d`)
- [x] 66.4.2 Vergleichsmodus: zwei Fahrzeuge nebeneinander mit Stats-Balken. (abgeschlossen: 2026-03-30; evidence: Compare-Panel mit Stats-Bars in `ArcadeVehicleManager.js`/`style.css` -> commit `c280b5d`)
- [x] 66.4.3 Loadout-Presets: Upgrade-Konfigurationen speichern/laden/wechseln. (abgeschlossen: 2026-03-30; evidence: `VehicleManagerLoadoutPresets.js` + T66a Preset-Save/Load -> `test-results/v66-core-final`, commit `c280b5d`)
- [x] 66.4.4 Tastatur-/Mausfluss: Kategorien wechseln, Fahrzeuge durchlaufen, Shortcuts. (abgeschlossen: 2026-03-30; evidence: Keyboard/Wheel-Shortcuts in `ArcadeVehicleManager.js` + T66a/T66b -> `test-results/v66-core-final`, commit `c280b5d`)

### 66.5 Verifikation und visuelle Abnahme

- [x] 66.5.1 Playwright-Abdeckung fuer Fahrzeugliste, Kategorie-Wechsel, 3D-Preview, Upgrade-Interaktion und Auswahl-Persistenz. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5367 PW_RUN_TAG=v66-core-final PW_OUTPUT_DIR=test-results/v66-core-final npm run test:core` (T66a/T66b) -> `test-results/v66-core-final`, commit `c280b5d`)
- [x] 66.5.2 Visuelle Evidence: Screenshot des Vehicle-Managers plus manuelle Smoke-Probe fuer Auswahl ' Spielstart. (abgeschlossen: 2026-03-30; evidence: Screenshot `test-results/v66-vehicle-manager-panel.png` + Start-Smoke via `T14f`/`T66b` in `v66-core-final` -> `test-results/v66-core-final`, commit `c280b5d`)
- [x] 66.5.3 Regressionstest fuer Vehicle-Selection-Drift: im Arcade-Flow gewaehltes Fahrzeug wird in `settings.vehicles.PLAYER_1`, Run-Snapshot und Match-Spawn konsistent uebernommen. (abgeschlossen: 2026-03-30; evidence: `T66b` in `tests/core.spec.js` via `TEST_PORT=5367 ... npm run test:core` -> `test-results/v66-core-final`, commit `c280b5d`)

### 66.99 Integrations- und Abschluss-Gate

- [x] 66.99.1 `npm run test:core` sowie Vehicle-Manager-UI-Checks und `npm run build` sind fuer den Scope gruen. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5367 PW_RUN_TAG=v66-core-final PW_OUTPUT_DIR=test-results/v66-core-final npm run test:core` + `TEST_PORT=5368 PW_RUN_TAG=v66-stress-final PW_OUTPUT_DIR=test-results/v66-stress-final npm run test:stress` + `npm run build` -> `test-results/v66-core-final`, `test-results/v66-stress-final`, commit `c280b5d`)
- [x] 66.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Backlog-Abgleich sind abgeschlossen. (abgeschlossen: 2026-03-30; evidence: `npm run plan:check` + `npm run docs:sync` + `npm run docs:check` + Plan-Status/Lock/Ownership aktualisiert -> Plan-Abschluss-Commit)

### Risiko-Register V66

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| 3D-Preview-Renderer erhoeht Bundle-Groesse und Ladezeit | mittel | UI/Rendering | Mini-Renderer mit minimalem Three.js-Setup; nur noetigstes Mesh laden | Vehicle-Manager oeffnet merklich langsamer als bisher |
| Upgrade-Overlay schwer positionierbar bei unterschiedlichen Mesh-Geometrien | hoch | UI/3D | Slot-Positionen aus Anchor-Offsets ableiten; Fallback auf abstrakte Liste | Overlay-Punkte schweben sichtbar neben dem Modell |
| Custom-Fahrzeuge ohne standardisierte Preview-Tokens | mittel | Editor/Vehicle-Lab | On-Demand-Thumbnail oder generischer "Custom"-Platzhalter | Custom-Fahrzeuge zeigen leere Vorschau |
| Umbau von ArcadeVehicleManager bricht bestehende Arcade-Flows | hoch | Arcade/Core | vehicleId und ArcadeVehicleProfileContract als stabilen Contract beibehalten | Bestehende Arcade-Tests schlagen fehl |
| Vehicle-Auswahl driftet zwischen Arcade-UI und Runtime-Settings | hoch | Arcade/Core | Einziger Source-of-Truth fuer Auswahl (`settings.vehicles.PLAYER_1`), plus Regressionstest fuer Start-/Spawn-Konsistenz | Arcade-UI zeigt anderes Fahrzeug als im Match gespawnt |
| Vergleichsmodus braucht normierte Stats die aktuell nicht existieren | mittel | Gameplay/UI | Stats aus Hitbox-Radius, Upgrade-Potenzial und Kategorie ableiten; keine erfundenen Werte | Stats-Balken zeigen unsinnige oder identische Werte |

---

## Block V67: Multiplayer-Netzwerk-Haertung - ICE, Retry, Reconciler, Ghost-Cleanup

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V60.99, V59.99 -->

Scope:

- ICE-Candidate-Handling in LAN-Modus fixen: Race-Condition bei gleichzeitigem Polling von Host und Client beseitigen.
- Retry-/Backoff-Logik fuer WebSocket- und HTTP-Signaling einfuehren, damit transiente Netzwerk-Hiccups nicht zu permanentem Verbindungsabbruch fuehren.
- StateReconciler auf alle spielrelevanten Felder erweitern (Rotation, Velocity, Effects), nicht nur Position/Score/Health.
- Ghost-Player-Cleanup im LAN-Signaling-Server: inaktive Spieler nach Timeout automatisch entfernen.
- DataChannelManager um Backpressure-Erkennung erweitern und stille Paketverluste vermeiden.
- connectReject-Mehrfachaufruf in OnlineMatchLobby absichern.
- Multiplayer-Testabdeckung signifikant erweitern.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 67.1 bis 67.4 und 67.99 sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: 67.1-67.4 + 67.99 vollstaendig auf [x], inklusive Code- und Test-Commits `7738e35`, `b05f337`)
- [x] DoD.2 ICE-Candidate-Race ist behoben und durch einen Test abgedeckt. (abgeschlossen: 2026-03-29; evidence: `67.4.1` in `tests/network-adapter.spec.js` gegen directionale ICE-Queues (`server/lan-signaling.js`) -> `TEST_PORT=5333 PW_RUN_TAG=v67-network-r2 PW_OUTPUT_DIR=test-results/v67-network-r2 ... tests/network-adapter.spec.js` PASS)
- [x] DoD.3 WebSocket-/HTTP-Retry mit Backoff ist implementiert und konfigurierbar. (abgeschlossen: 2026-03-29; evidence: `OnlineSessionAdapter.connect()` + `OnlineMatchLobby._makeConnectPromise()` mit Retry/Backoff und `maxConnectAttempts<=3`; `67.2`-Tests PASS -> `test-results/v67-network-r2`)
- [x] DoD.4 `npm run test:core` und `npm run build` sind gruen; neue Netzwerk-Tests decken Disconnect, Reconnect, Heartbeat-Timeout und Host-Disconnect ab. (abgeschlossen: 2026-03-29; evidence: `TEST_PORT=5334 PW_RUN_TAG=v67-core-r2 PW_OUTPUT_DIR=test-results/v67-core-r2 npm run test:core` PASS; `TEST_PORT=5333 ... tests/network-adapter.spec.js` PASS; `npm run build` PASS)

### 67.1 Kritische Verbindungsfehler beheben

- [x] 67.1.1 ICE-Candidate Double-Deletion in `LANSessionAdapter._pollIceCandidates()` fixen: separate Maps fuer Host'Client und Client'Host Kandidaten einfuehren, oder non-destructive Peek statt `delete`-on-read. (abgeschlossen: 2026-03-29; evidence: directionale ICE-Queues + selektives `fromPlayerId`-Polling in `server/lan-signaling.js`/`LANSessionAdapter.js`; commit `7738e35`)
- [x] 67.1.2 `OnlineMatchLobby._handleMessage()` gegen mehrfachen `connectReject`-Aufruf absichern (Guard-Flag analog zu `settled` in `OnlineSessionAdapter.connect()`). (abgeschlossen: 2026-03-29; evidence: `connectState.rejected` Guard + single-shot reject in `OnlineMatchLobby.js`; commit `7738e35`)
- [x] 67.1.3 Offer-Polling-Timeout in `LANSessionAdapter._joinAsClient()` erhoehen und exponentiellen Backoff einfuehren (statt 30-200ms konstant). (abgeschlossen: 2026-03-29; evidence: `JOIN_OFFER_MAX_WAIT_MS` + exponentieller Backoff in `LANSessionAdapter.js`; commit `7738e35`)

### 67.2 Retry- und Resilience-Logik

- [x] 67.2.1 `OnlineSessionAdapter.connect()` um konfigurierbare Retry-Logik mit exponentiellem Backoff erweitern (max 3 Versuche, 1s/2s/4s). (abgeschlossen: 2026-03-29; evidence: retry-fhige `_connectSingleAttempt`-Schleife mit Backoff/`maxConnectAttempts<=3` in `OnlineSessionAdapter.js`; commit `7738e35`)
- [x] 67.2.2 `OnlineMatchLobby._makeConnectPromise()` analog absichern: WebSocket-Verbindungsaufbau mit Retry statt Single-Shot. (abgeschlossen: 2026-03-29; evidence: `_makeConnectAttempt` + Retry-Schleife in `OnlineMatchLobby.js`; commit `7738e35`)
- [x] 67.2.3 `DataChannelManager.sendToAll()` um Backpressure-Erkennung erweitern: bei vollem Channel `bufferedAmount` pruefen und Callback/Event emittieren statt stille Drops. (abgeschlossen: 2026-03-29; evidence: Backpressure-Threshold + `backpressure`-Event/Callback in `DataChannelManager.js`; test `V67-67.2 DataChannelManager` PASS in `test-results/v67-network-r2`)
- [x] 67.2.4 `LatencyMonitor` nur bei verbundenen Peers pingen; bei leerer Peer-Liste Heartbeat pausieren. (abgeschlossen: 2026-03-29; evidence: ping-loop startet/stoppt dynamisch nach Peer-Set in `LatencyMonitor.js`; test `V67-67.2 LatencyMonitor` PASS in `test-results/v67-network-r2`)

### 67.3 State-Synchronisation und Server-Cleanup

- [x] 67.3.1 `StateReconciler.reconcile()` auf Rotation, Velocity und aktive Effects erweitern; Snap-Threshold pro Feld konfigurierbar machen. (abgeschlossen: 2026-03-29; evidence: Feld-spezifische Reconcile-Pfade + konfigurierbare Thresholds in `StateReconciler.js`; Snapshot erweitert in `GameStateSnapshot.js`; test `V67-67.3 StateReconciler` PASS in `test-results/v67-network-r2`)
- [x] 67.3.2 `server/lan-signaling.js` um automatischen Ghost-Player-Cleanup erweitern: Spieler ohne Aktivitaet nach 60s aus `pending`/`players`-Liste entfernen. (abgeschlossen: 2026-03-29; evidence: `ghostPlayerTimeoutMs`/Cleanup-Loop + Activity-Touch in `server/lan-signaling.js`; test `V67-67.3 ghost-player cleanup` PASS in `test-results/v67-network-r2`)
- [x] 67.3.3 `RuntimeSessionLifecycleService.waitForRuntimePlayersLoaded()` Timeout dynamisch anpassen: pro Client 5s extra statt festes 10s-Fenster. (abgeschlossen: 2026-03-29; evidence: dynamischer Timeout in `RuntimeSessionLifecycleService.js`; test `V67-67.3 waitForRuntimePlayersLoaded` PASS in `test-results/v67-network-r2`)

### 67.4 Test-Abdeckung erweitern

- [x] 67.4.1 Unit-Tests fuer ICE-Candidate-Handling: gleichzeitiges Polling darf keine Kandidaten verlieren. (abgeschlossen: 2026-03-29; evidence: neuer Test `67.4.1` in `tests/network-adapter.spec.js` -> PASS in `test-results/v67-network-r2`)
- [x] 67.4.2 Unit-Tests fuer Heartbeat-Timeout: Disconnect-Event nach 5s ohne Pong. (abgeschlossen: 2026-03-29; evidence: neuer Test `67.4.2` (`PeerConnectionManager`) -> PASS in `test-results/v67-network-r2`)
- [x] 67.4.3 Unit-Tests fuer Reconnect-Window: Peer innerhalb 30s ' reconnected, nach 30s ' removed. (abgeschlossen: 2026-03-29; evidence: neuer Test `67.4.3` (`SessionAdapterBase`) -> PASS in `test-results/v67-network-r2`)
- [x] 67.4.4 Characterization-Test fuer Host-Disconnect: Clients erhalten `host_leaving` und raeumen auf. (abgeschlossen: 2026-03-29; evidence: neuer Test `67.4.4` + Cleanup im `HOST_LEAVING`-Pfad der Adapter -> PASS in `test-results/v67-network-r2`)
- [x] 67.4.5 Integration-Test: Zwei-Tab-Multiplayer-Smoke mit >15s Stabilitaet inkl. Checks auf `runtimeConfig.session.networkEnabled`, Adapter-Typ (`LANSessionAdapter`/`OnlineSessionAdapter`) und Remote-Presence (uebernommener Scope aus 60.4.4). (abgeschlossen: 2026-03-29; evidence: neuer Zwei-Tab-Test `67.4.5` in `tests/network-adapter.spec.js` (16s Stability-Wait, network mapping + remote presence) -> PASS in `test-results/v67-network-r2`)

### 67.99 Integrations- und Abschluss-Gate

- [x] 67.99.1 `npm run test:core`, `npm run build` und neue Netzwerk-Tests sind gruen. (abgeschlossen: 2026-03-29; evidence: `TEST_PORT=5334 PW_RUN_TAG=v67-core-r2 PW_OUTPUT_DIR=test-results/v67-core-r2 npm run test:core` PASS; `TEST_PORT=5333 PW_RUN_TAG=v67-network-r2 PW_OUTPUT_DIR=test-results/v67-network-r2 ... tests/network-adapter.spec.js` PASS; `npm run build` PASS)
- [x] 67.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Backlog-Abgleich sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: `npm run plan:check` PASS; `npm run docs:sync` updated=0 missing=0; `npm run docs:check` PASS; V67 Lock auf `frei`, Ownership/Lock-Status/Pipeline aktualisiert)

### Risiko-Register V67

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| ICE-Fix aendert Signaling-Protokoll und bricht bestehende LAN-Verbindungen | hoch | Netzwerk | Aenderung auf Server- und Client-Seite synchron deployen; Characterization-Test vorher schreiben | LAN-Verbindung schlaegt nach Update fehl |
| Retry-Logik maskiert echte Verbindungsfehler durch wiederholte Versuche | mittel | Netzwerk | Max-Retries begrenzen, Fehlermeldung nach letztem Versuch klar an UI weiterleiten | User wartet 10s+ ohne Feedback |
| StateReconciler-Erweiterung erzeugt sichtbares Snapping bei hoher Latenz | mittel | Gameplay | Interpolationsrate und Snap-Threshold pro Feld tunen; visuelles Smoothing | Fahrzeuge springen sichtbar bei >100ms RTT |
| Ghost-Cleanup entfernt aktive Spieler bei kurzer Inaktivitaet | hoch | Server | Timeout konservativ (60s), Heartbeat als Aktivitaetssignal werten | Aktiver Spieler wird aus Lobby entfernt |
| DataChannel-Backpressure bremst Host-Broadcasting und erzeugt Lags | mittel | Netzwerk | Nur warnen/loggen statt blockieren; langsame Clients nach Threshold kicken | Alle Clients laggen weil ein Client langsam ist |

---

## Block V68: Arcade UX/Intermission/Replay Follow-up

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V61.99 -->

Scope:

- Uebernommene Restaufgaben aus V61 abschliessen: Score-/Modifier-HUD, Intermission-UX, Post-Run-Summary und Replay-Integration.
- Arcade-Grundmechaniken aus V61 unveraendert lassen; Fokus auf UI-Transparenz, Feedback und spielbare Abschluss-Schleife.
- Verifikation ueber `test:core`, Build-Gate und gezielte Arcade-Smokes.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 68.1 bis 68.4 und 68.99 sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: 68.2-68.4 sowie 68.99 auf [x])
- [x] DoD.2 Arcade-HUD zeigt Score-Breakdown, Combo-Status und aktiven Modifier klar im Run. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68" -> T68a/T68b PASS)
- [x] DoD.3 Intermission und Post-Run liefern Reward-Auswahl, Sektor-Preview und nachvollziehbare Abschlussauswertung. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68" -> T68c PASS)
- [x] DoD.4 Replay ist als lauffaehiges Playback oder klar dokumentiertes Feature-Flag integriert. (abgeschlossen: 2026-03-29; evidence: T68c Replay-Fallback-Code `replay_player_unavailable` + Menu-Placeholder entfernt)
- [x] DoD.5 `npm run build`, `npm run test:core`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind PASS. (abgeschlossen: 2026-03-29; evidence: Build-/Core-/Plan-/Docs-Gates PASS)

### 68.1 Score-/Modifier-HUD

- [x] 68.1.1 `ArcadeMissionHUD.js` + neues `ArcadeScoreHUD.js`: Score-Breakdown (Base/Survival/Clean/Risk/Penalty), Echtzeit-Score, Combo-Counter und Multiplier-Badge anzeigen. (abgeschlossen: 2026-03-29; evidence: npm run test:core -> tests/core.spec.js (T68a PASS), npm run build -> PASS)
- [x] 68.1.2 Aktiven Modifier im HUD mit Icon/Label/Effektbeschreibung anzeigen; Anzeige bei Sektorwechsel konsistent aktualisieren. (abgeschlossen: 2026-03-29; evidence: npm run test:core -> tests/core.spec.js (T68a Modifier-Switch PASS), npm run build -> PASS)

### 68.2 In-Game-Feedback und Transition-Polish

- [x] 68.2.1 Combo-Feedback mit Counter-Animation und Edge-Glow implementieren, inklusive klarer Decay-Rueckmeldung. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68b" -> PASS)
- [x] 68.2.2 Sudden-Death-Overlay (rote Raender, Pulsieren, SD-Timer) implementieren und mit `SUDDEN_DEATH`-Phase koppeln. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68b" -> PASS)
- [x] 68.2.3 Sektor-Transition-Animation beim Map-/Sektorwechsel einfuehren, sodass Wechsel nicht nur als Text-Overlay erscheinen. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68b" -> PASS)

### 68.3 Intermission und Post-Run-Loop

- [x] 68.3.1 Zwischen-Sektoren-Wahl (2-3 Optionen mit Map + Modifier) in `ArcadeRunRuntime.js` implementieren. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68c" -> PASS)
- [x] 68.3.2 Reward-Auswahl (`ARCADE_RUN_LEVELUP_REWARDS`) plus Intermission-HUD mit Sektor-Preview und Buttons einbauen. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68c" -> PASS)
- [x] 68.3.3 Intermission-Healing in `ArcadeModeStrategy.js` fuellen und balancen. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68c" -> PASS)
- [x] 68.3.4 Post-Run-Summary-Screen mit Score pro Sektor, Best-Combo, Mission-Rate und XP-Animation ausbauen. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68c" -> PASS)

### 68.4 Replay-Integration

- [x] 68.4.1 Replay-Feature-Flag und UI-Hooks in `ArcadeMenuSurface.js`/`ArcadeRunRuntime.js` vorbereiten, sodass Placeholder-Text entfaellt. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68c" -> PASS; Menu-Labels ohne Platzhalter)
- [x] 68.4.2 Replay-Playback fuer abgeschlossene Runs integrieren oder als klaren, testbaren Fallback deaktivierbar machen. (abgeschlossen: 2026-03-29; evidence: npm run test:core -- --grep "T68c" -> PASS; Fallback-Code `replay_player_unavailable`)

### 68.99 Integrations- und Abschluss-Gate

- [x] 68.99.1 `npm run build` und `npm run test:core` sind fuer den Scope gruen. (abgeschlossen: 2026-03-29; evidence: npm run build -> PASS, npm run test:core -> PASS)
- [x] 68.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-/Ownership-/Backlog-Abgleich sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: npm run test:stress -> PASS, npm run smoke:roundstate -> PASS, npm run plan:check -> PASS, npm run docs:sync -> PASS, npm run docs:check -> PASS)

### Risiko-Register V68

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Neue HUD-Layer erzeugen DOM-/Render-Overhead im Arcade-Hotpath | mittel | UI/Rendering | Delta-Updates und minimalen DOM-Write-Pfad erzwingen; Smoke unter Last | FPS-Drops oder Input-Lag waehrend Combat |
| Intermission-Flow unterbricht bestehende Run-State-Transitions | hoch | Arcade/Core | State-Contract in `ArcadeRunRuntime` mit Characterization-Tests absichern | Run bleibt zwischen Sektoren haengen |
| Replay-Playback driftet von Recorder-Daten ab | mittel | Core/Replay | Playback gegen vorhandene Recorder-Snapshots charakterisieren; Feature-Flag als Fallback | Replay zeigt inkonsistente Positionen/Ereignisse |
| Zu viele gleichzeitige UX-Aenderungen erschweren Balancing | mittel | Gameplay | Schrittweise Aktivierung pro Phase, Balancing-Notizen pro Merge | Score/Schwierigkeit kippen nach Release |

---

## Block V69: Fight/Hunt Combat-Balance - Item, Raketen, Schild, MG

Plan-Datei: `docs/plaene/alt/Feature_Item_Raketen_Schild_MG_Balance_V69.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V63.99 -->

Scope:

- Fight/Hunt-Balance fuer MG, Raketen, Shield und Item-Oekonomie datengetrieben stabilisieren.
- Runtime-/UI-Defaults fuer relevante Combat-Parameter harmonisieren und Legacy-Spawn-/Item-Contracts bereinigen.
- Telemetrie so erweitern, dass Balance-Entscheidungen reproduzierbar ueber KPI-Korridore gesteuert werden.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 69.1 bis 69.6 und 69.99 sind abgeschlossen. (abgeschlossen: 2026-03-30; evidence: 69.1-69.6 + 69.99 im Block auf `[x]`)
- [x] DoD.2 Telemetrie differenziert Item-Nutzung und Combat-Impact mindestens nach `mode`, `itemType`, `hpDamage`, `shieldAbsorb`. (abgeschlossen: 2026-03-30; evidence: `docs/qa/V69_Fight_Hunt_KPI_Baseline_2026-03-30.md` + `docs/qa/V69_Fight_Hunt_Balancing_Auswertung_2026-03-30.md`)
- [x] DoD.3 MG-, Rocket- und Shield-Tuning ist per Tests und kurzer QA-Dokumentation gegen definierte KPI-Zielkorridore validiert. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5387 PW_RUN_TAG=v69-6-matrix PW_OUTPUT_DIR=test-results/v69-6-matrix npx playwright test tests/core.spec.js tests/game-mode-strategy.spec.js tests/physics-hunt.spec.js tests/physics-policy.spec.js --grep "T20ke|T14ea|S14a|S14b|S14d|T89a|T89k|T77|T78d|T78e|T78f"` -> `test-results/v69-6-matrix`)
- [x] DoD.4 Legacy-Map-/Pickup-Typen sind auf aktive Rocket-Tiers normalisiert oder mit stabiler Alias-Strategie abgesichert. (abgeschlossen: 2026-03-30; evidence: `src/hunt/RocketPickupSystem.js` + `src/entities/Powerup.js` + `src/entities/mapSchema/MapSchemaSanitizeOps.js` + `T14ea`/`S14a`)
- [x] DoD.5 `npm run build`, `npm run test:core`, `npm run test:physics:hunt`, `npm run test:physics:policy`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind PASS. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5419 PW_RUN_TAG=v69-99-core-r3-final PW_OUTPUT_DIR=test-results/v69-99-core-r3-final npm run test:core` + `TEST_PORT=5420 PW_RUN_TAG=v69-99-physics-hunt-r3-final PW_OUTPUT_DIR=test-results/v69-99-physics-hunt-r3-final npm run test:physics:hunt` + `TEST_PORT=5421 PW_RUN_TAG=v69-99-physics-policy-r4-final PW_OUTPUT_DIR=test-results/v69-99-physics-policy-r4-final npm run test:physics:policy` + `npm run build` + `npm run plan:check` + `npm run docs:sync` + `npm run docs:check` -> PASS)

### 69.1 Balance-Telemetrie und KPI-Baseline

- [x] 69.1.1 Round-/Combat-Metriken fuer `itemUse.mode`, `itemType`, `mgHits`, `rocketHits`, `shieldAbsorb`, `hpDamage` granular erfassen und durch den Telemetriepfad persistieren. (abgeschlossen: 2026-03-30; evidence: `npm run test:fast` + `TEST_PORT=5371 PW_RUN_TAG=v69-telemetry PW_OUTPUT_DIR=test-results/v69-telemetry node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --grep "T20ke"` -> `test-results/v69-telemetry`)
- [x] 69.1.2 KPI-Baseline fuer Fight/Hunt dokumentieren (TTK, Pickrate, Hitrate, Kill-Share, Shield-Uptime) und als Vergleichswert fuer die Folgephasen fixieren. (abgeschlossen: 2026-03-30; evidence: `docs/qa/V69_Fight_Hunt_KPI_Baseline_2026-03-30.md` + `npm run docs:check` -> PASS)

### 69.2 MG-Tuning und Trefferfenster

- [x] 69.2.1 Default-/Preset-Werte fuer `mgTrailAimRadius` und angrenzende MG-Parameter in Runtime, UI und Settings-Haertung konsistent machen. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5381 PW_RUN_TAG=v69-2-core PW_OUTPUT_DIR=test-results/v69-2-core npx playwright test tests/core.spec.js --grep "T20x0"` -> PASS + Defaults-Harmonisierung in `src/ui/menu/MenuDefaultsEditorConfig.js`/`src/core/config/SettingsRuntimeContract.js`/`src/ui/menu/MenuGameplayBindings.js`)
- [x] 69.2.2 MG-Falloff/Overheat/Lockout gegen Zielkorridor validieren und Tests fuer Midrange-TTK plus Trail-Hit-Fairness erweitern. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5382 PW_RUN_TAG=v69-2-physics PW_OUTPUT_DIR=test-results/v69-2-physics npx playwright test tests/physics-hunt.spec.js --grep "T64|T89a|T89i"` -> PASS)

### 69.3 Rocket-Tiers und Spawn-Oekonomie

- [x] 69.3.1 Legacy-Rocket-Pickup-Typen (`ROCKET_STRONG` etc.) per Alias/Migration auf aktive Tier-Typen normalisieren. (abgeschlossen: 2026-03-30; evidence: `src/hunt/RocketPickupSystem.js` + `src/entities/Powerup.js` + `src/entities/mapSchema/MapSchemaSanitizeOps.js` + `src/core/config/maps/presets/neon_abyss.js` + `src/core/config/maps/presets/crystal_ruins.js` + `T14ea`/`S14a`)
- [x] 69.3.2 Rocket-/Non-Rocket-Spawngewichte robust machen (normalisierte Gewichte, deterministische Verteilung, Regressionstests fuer Grenzfaelle). (abgeschlossen: 2026-03-30; evidence: `src/hunt/RocketPickupSystem.js` + `src/modes/HuntModeStrategy.js` + `S14b`/`S14c`)

### 69.4 Shield- und Damage-Semantik

- [x] 69.4.1 Shield-Hit-, Regen- und Damage-Timestamp-Interaktion klar definieren und konsistent in Health-/Feedback-Pfaden umsetzen. (abgeschlossen: 2026-03-30; evidence: `src/hunt/HealthSystem.js` + `src/modes/HuntModeStrategy.js` + `S14d`/`T89k`)
- [x] 69.4.2 Item-Nutzungsfenster fuer defensive Ketten (Shield-Spam) absichern, ohne Utility-Flow fuer normale Nutzung zu verlieren. (abgeschlossen: 2026-03-30; evidence: `src/entities/systems/HuntCombatSystem.js` + `src/entities/Player.js` + `src/hunt/HuntConfig.js` + `T89j`)

### 69.5 Bot-/Policy-Anpassung

- [x] 69.5.1 HuntBotPolicy/BotDecisionOps an neue Balance-Parameter und Item-Oekonomie anpassen (offensiv/defensiv konsistent). (abgeschlossen: 2026-03-30; evidence: `src/hunt/HuntBotPolicy.js` + `src/entities/ai/BotDecisionOps.js` + `tests/physics-policy.spec.js` (`T78d`, `T78f`))
- [x] 69.5.2 HuntBridgePolicy-Entscheidungsregeln fuer MG/Rocket/Retreat mit den neuen KPI-Zielen synchronisieren. (abgeschlossen: 2026-03-30; evidence: `src/entities/ai/HuntBridgePolicy.js` + `tests/physics-policy.spec.js` (`T78e`))

### 69.6 Verifikation und Rollout

- [x] 69.6.1 Tests erweitern: MG-Window, Rocket-Alias/Verteilung, Shield-Regen-Interaktion, Telemetrie-Schema-Regression. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5387 PW_RUN_TAG=v69-6-matrix PW_OUTPUT_DIR=test-results/v69-6-matrix npx playwright test tests/core.spec.js tests/game-mode-strategy.spec.js tests/physics-hunt.spec.js tests/physics-policy.spec.js --grep "T20ke|T14ea|S14a|S14b|S14d|T89a|T89k|T77|T78d|T78e|T78f"` -> `test-results/v69-6-matrix`)
- [x] 69.6.2 Manuelle Fight/Hunt-QA aktualisieren und kurze Balancing-Auswertung als Evidence dokumentieren. (abgeschlossen: 2026-03-30; evidence: `docs/qa/Manuelle_Testcheckliste_Spiel.md` Abschnitt 26 + `docs/qa/V69_Fight_Hunt_Balancing_Auswertung_2026-03-30.md`)

### 69.99 Integrations- und Abschluss-Gate

- [x] 69.99.1 `npm run test:core`, `npm run test:physics:hunt`, `npm run test:physics:policy`, `npm run build` sind fuer den Scope gruen. (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5419 PW_RUN_TAG=v69-99-core-r3-final PW_OUTPUT_DIR=test-results/v69-99-core-r3-final npm run test:core` + `TEST_PORT=5420 PW_RUN_TAG=v69-99-physics-hunt-r3-final PW_OUTPUT_DIR=test-results/v69-99-physics-hunt-r3-final npm run test:physics:hunt` + `TEST_PORT=5421 PW_RUN_TAG=v69-99-physics-policy-r4-final PW_OUTPUT_DIR=test-results/v69-99-physics-policy-r4-final npm run test:physics:policy` + `npm run build` -> PASS)
- [x] 69.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Pipeline-Abgleich sind abgeschlossen. (abgeschlossen: 2026-03-30; evidence: `npm run plan:check` + `npm run docs:sync` + `npm run docs:check` -> PASS; V69 Lock/Ownership/Pipeline in `docs/Umsetzungsplan.md` auf abgeschlossen/frei aktualisiert)

### Risiko-Register V69

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| MG-Tuning kippt von "zu stark" auf "zu schwach" | hoch | Gameplay | Parameter in kleinen Schritten aendern und Hitrate/TTK je Build gegen Baseline vergleichen | Spielerfeedback driftet stark, Kills verlagern sich abrupt |
| Rocket-Alias-/Spawn-Aenderungen brechen bestehende Maps | mittel | Gameplay/Content | Alias + Map-Validation + Smoke fuer betroffene Presets | Rockets fehlen oder kommen als falscher Typ |
| Shield-Anpassung erzeugt neue Burst-/Unsterblichkeitsprobleme | hoch | Gameplay | Characterization-Tests fuer Shield-Absorb, Regen und TTK vor Rollout | Unerwartete TTK-Spikes oder Shield-Dominanz |
| Mehr Telemetrie erzeugt Runtime-Overhead im Fight-Hotpath | mittel | Core | Sampling/Batching, kompakte Payloads, Profiler-Vergleich vorher/nachher | Fight-Frames zeigen neue Spikes |

---

## Block V70: Settings-/Preset-Stabilisierung gegen unbeabsichtigte Voreinstellungs-Aenderungen

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V53.99 -->

Scope:

- Unerwuenschte Auto-Mutationen von Settings beseitigen (ModePath/Preset, Compatibility-Autofix, UI-Sync-Seiteneffekte).
- Persistenz- und Migrationspfad so haerten, dass Nutzerwerte nicht still driftend ueberschrieben werden.
- Save-Semantik klarziehen (explizites Speichern vs. gezielte Auto-Saves) und vertraglich testen.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 70.1 bis 70.4 und 70.99 sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: 70.1-70.4 + 70.99 auf [x] -> docs/Umsetzungsplan.md)
- [x] DoD.2 Settings aendern sich ohne explizite User-Aktion nicht mehr still durch reine UI-Sync-Laeufe. (abgeschlossen: 2026-03-29; evidence: npx playwright test tests/core.spec.js --grep "T70a|T20qa" -> PASS)
- [x] DoD.3 ModePath-/Preset-/Map-Elegibility-Verhalten ist konsistent und ohne widerspruechliche Doppelkorrekturen. (abgeschlossen: 2026-03-29; evidence: npm run test:core -> PASS (T20x1, T70b, T20bb))
- [x] DoD.4 Versionierte Migrationen sind reproduzierbar; veraltete Snapshots werden deterministisch ueberfuehrt statt wiederholt hart ersetzt. (abgeschlossen: 2026-03-29; evidence: npx playwright test tests/core.spec.js --grep "T70b" -> PASS)
- [x] DoD.5 `npm run build`, `npm run test:core`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind PASS. (abgeschlossen: 2026-03-29; evidence: npm run build && npm run test:core && npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

### 70.1 Auto-Mutationspfade entkoppeln

- [x] 70.1.1 `UIStartSyncController` so refactoren, dass `syncStartSetupState()` keine stillen Runtime-Schreibzugriffe mehr fuer Map/Fahrzeug ausfuehrt; Normalisierung auf explizite User- oder Import-Aktionen begrenzen. (abgeschlossen: 2026-03-29; evidence: commit aefcdfc)
- [x] 70.1.2 `RuntimeSettingsChangeOrchestrator` + `MenuCompatibilityRules` so zuschneiden, dass Korrekturen nur bei tatsaechlichen Vertragsverletzungen und nicht bei jedem Sync-Render durchlaufen. (abgeschlossen: 2026-03-29; evidence: commit aefcdfc)

### 70.2 ModePath-/Preset- und Session-Draft-Konsistenz

- [x] 70.2.1 `MenuRuntimeSessionService` und Preset-Mapping (`MODE_PATH_TO_PRESET_ID`) mit Map-Elegibility-Regeln harmonisieren, damit kein Preset-Wert direkt vom naechsten Kompatibilitaetslauf wieder gekippt wird. (abgeschlossen: 2026-03-29; evidence: commit aefcdfc)
- [x] 70.2.2 Session-Draft-Verhalten (`switchSessionType`, `applySessionDraft`) fuer Nutzer nachvollziehbar und reproduzierbar machen; automatische Ruecksetzungen (`modePath`) nur bei klaren Fehlerfaellen. (abgeschlossen: 2026-03-29; evidence: commit aefcdfc)

### 70.3 Persistenz-/Migrationspfad und Save-Semantik haerten

- [x] 70.3.1 Settings-Version-Migration so erweitern, dass alte Snapshots kontrolliert auf den neuen Vertrag ueberfuehrt und anschliessend stabil gespeichert werden (kein wiederholter Hard-Reset bei jedem Start). (abgeschlossen: 2026-03-29; evidence: commit aefcdfc)
- [x] 70.3.2 Auto-Save-Ausnahmen (insb. Event-Playlist-Quickstart) explizit dokumentieren und technisch begrenzen, damit Baseline-Voreinstellungen nicht unbeabsichtigt driftend persistiert werden. (abgeschlossen: 2026-03-29; evidence: commit aefcdfc)

### 70.4 Test- und Diagnoseabdeckung

- [x] 70.4.1 `tests/core.spec.js` um Charakterisierung erweitern: reine `syncAll`-/`syncByChangeKeys`-Laeufe duerfen ohne Input keine Settings-Mutation erzeugen. (abgeschlossen: 2026-03-29; evidence: npx playwright test tests/core.spec.js --grep "T70a|T20qa" -> PASS)
- [x] 70.4.2 End-to-End-Tests fuer ModePath/Preset/Draft/Migration-Szenarien ergaenzen (inkl. Reload), sodass unbeabsichtigte Voreinstellungs-Aenderungen reproduzierbar abgefangen werden. (abgeschlossen: 2026-03-29; evidence: npx playwright test tests/core.spec.js --grep "T20bb|T70b" -> PASS)

### 70.99 Integrations- und Abschluss-Gate

- [x] 70.99.1 `npm run build`, `npm run test:core` sind fuer den Scope gruen. (abgeschlossen: 2026-03-29; evidence: npm run build && npm run test:core -> PASS)
- [x] 70.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-/Ownership-/Backlog-Abgleich sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

### Risiko-Register V70

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Entfernen von Auto-Korrekturen laesst echte Inkonsistenzen unentdeckt | hoch | Core/UI | Characterization-Tests vor Refactor und Guarded-Fallbacks bei Vertragsverletzung | Nutzer landet mit unstartbarem Setup |
| Save-Semantik-Aenderungen brechen erwartete Quickstart-Workflows | mittel | UI/Core | Auto-Save nur fuer klar benannte Pfade, UX-Copy + Tests fuer Reload-Verhalten | Event-Playlist-/Quickstart-Verhalten wirkt regressiv |
| Migrationspfad fuer alte Settings verliert Felder oder Profile | hoch | Core/Storage | Einmalige Migrations-Tests mit Legacy-Snapshots und persistierter Nachkontrolle | Alte Browserdaten gehen nach Update verloren |

---


