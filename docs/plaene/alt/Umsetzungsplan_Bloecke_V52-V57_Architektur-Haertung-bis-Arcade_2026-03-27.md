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
