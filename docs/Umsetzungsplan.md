# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-25

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
| V53 | V52.6 | soft | nein | Settings-Persistenz-Refactor bevorzugt nach zentralem Storage-Rollout, Parallelisierung nur ohne Contract-Drift |
| V53 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Guard-Basis fuer Decomposition und Import-Grenzen vorhanden |
| V54 | V52.99 | hard | ja | V52 abgeschlossen; Rest-Ratchets laufen in V54.3/V54.7 weiter |
| V54 | V53.99 | hard | ja | Settings-Decomposition ist abgeschlossen (`docs/Feature_SettingsManager_Decomposition_V53.md`) |
| V54 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Ratchet-/Boundary-Guards bilden die Mess-Basis |
| V55 | V54.99 | hard | ja | V54 abgeschlossen; V55 setzt Tiefenaudit-Findings fuer Stabilitaet, Konsistenz und Robustheit um |
| V55 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Guard-Basis fuer Refactors in Runtime-/Netzwerk-Hotspots vorhanden |
| V56 | V55.99 | hard | nein | V56 behandelt Edge-Cases und Defensive Improvements aus Code-Audit |
| V56 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Keine neuen Layer-Drifts, keine grossen Decompositions-Aenderungen |

## Datei-Ownership (aktive Arbeit)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `src/network/OnlineSessionAdapter.js`, `src/network/LANSessionAdapter.js`, `src/network/StateReconciler.js`, `src/core/runtime/RuntimeSessionLifecycleService.js`, `src/core/InputManager.js`, `src/ui/TouchInputSource.js`, `scripts/architecture/**`, `scripts/check-architecture-*.mjs` | V52 | offen | Event-Contract, Layering-Guards, Input/Persistenz-Resthaertung |
| `src/core/SettingsManager.js`, `src/core/settings/**`, `src/core/runtime/MenuRuntimeSessionService.js`, `src/core/runtime/MenuRuntimePresetConfigService.js`, `src/core/runtime/MenuRuntimeDeveloperModeService.js`, `src/core/GameRuntimeFacade.js`, `tests/core.spec.js` | V53 | abgeschlossen | Settings-Domain-Decomposition in Facades/Operations umgesetzt |
| `src/core/MediaRecorderSystem.js`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/core/GameRuntimeFacade.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `src/core/main.js`, `src/entities/**`, `src/ui/**`, `src/state/**`, `src/shared/**`, `scripts/architecture/**`, `scripts/check-architecture-*.mjs` | V54 | abgeschlossen | Gesamtfix fuer God-Objects, Layer-Kopplung, Legacy-Patterns und Global-Kapselung |
| `tests/playwright.global-setup.js`, `tests/playwright.global-teardown.js`, `playwright.config.js`, `scripts/verify-lock.mjs`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `src/core/runtime/RuntimeSessionLifecycleService.js`, `src/entities/arena/portal/PortalRuntimeSystem.js`, `src/ui/PauseOverlayController.js`, `src/core/GameRuntimeFacade.js`, `src/core/runtime/RuntimeSettingsChangeOrchestrator.js`, `src/core/MediaRecorderSystem.js`, `src/state/TelemetryHistoryStore.js`, `tests/core.spec.js`, `tests/training-automation.spec.js` | V55 | offen | Tiefenaudit-Remediation fuer Teststabilitaet, Race-Conditions, Backpressure und Lifecycle-Haertung |
| `src/state/MatchLifecycleSessionOrchestrator.js`, `src/entities/systems/projectile/ProjectileSimulationOps.js`, `src/ui/TouchInputSource.js`, `src/ui/MatchFlowUiController.js`, `tests/core.spec.js`, `tests/physics-core.spec.js` | V56 | offen | Edge-Case-Fixes, Defensive Improvements, idempotency guards |
| `docs/**`, `tests/**`, `scripts/validate-umsetzungsplan.mjs` | Shared | shared | Append-only oder eigener Abschnitt |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| E | V52 | 2026-03-23 | frei | - |
| F | V53 | 2026-03-23 | frei | - |
| G | V54 | 2026-03-24 | frei | - |
| H | V55 | 2026-03-25 | frei | abgeschlossen 2026-03-25 |
| - | V56 | 2026-03-25 | frei | - |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-22 | Bot-Codex | V50 | `src/core/**`, `src/state/**`, `src/ui/**` | V51 Objective/Overlay/Telemetry benoetigt Round-End- und HUD-Hooks in Shared-Schichten | Scope strikt auf Parcours-Felder und Objective-Reason begrenzt, Regressionstests (`test:core`, `test:physics`, `test:stress`) ausgefuehrt | abgeschlossen |
| 2026-03-24 | Codex | V54 | `src/core/GameRuntimeFacade.js` | V53-Gate `T20x0` zeigte fehlendes Runtime-Apply bei Settings-Aenderungen | `onSettingsChanged` fuehrt wieder `applySettingsToRuntime({ schedulePrewarm: false })` aus; Verifikation via `test:core` | abgeschlossen |
| 2026-03-24 | Codex | V54 | `src/ui/MatchFlowUiController.js`, `src/ui/MatchInputSourceResolver.js`, `src/ui/PlayerInputSource.js` | V52.5 Input-Source-Priorisierung benoetigt Runtime-Wiring im Match-UI-Lifecycle | Scope auf Input-Quellen-Wiring begrenzt, Guard/Budget-Gates (`architecture:guard`, `build`) ausgefuehrt | abgeschlossen |
| 2026-03-25 | Bot-H | V2 | `scripts/perf-lifecycle-measure.mjs`, `scripts/perf-jitter-matrix.mjs` | V55.5.2 benoetigt belastbare Perf-Sanity ohne Dev-Server-Startup-Deadlocks | Benchmark-Runner auf `vite preview` mit Auto-Build-Fallback und robuster Navigation/Readiness umgestellt; `benchmark:lifecycle`/`benchmark:jitter` ausgefuehrt | abgeschlossen |
| 2026-03-25 | Bot-H | Shared | `tests/helpers.js`, `package.json` | V55.1 Startup-Flakes erfordern robusteren `loadGame`-Pfad und testseitige Timeout-Haertung | `loadGame` um Runtime-Readiness+Retry erweitert; `test:core`/`test:fast` auf `--timeout=240000` standardisiert; Gate-Laeufe dokumentiert | abgeschlossen |

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

- [ ] DoD.1 Alle Phasen 56.1 bis 56.4 sowie 56.99 sind abgeschlossen und dokumentiert.
- [ ] DoD.2 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind PASS.
- [ ] DoD.3 Neue Regressionstests fuer die behandelten Edge-Cases existieren in `tests/core.spec.js` oder `tests/physics-core.spec.js`.
- [ ] DoD.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-Pflege sind abgeschlossen.

### 56.1 Async Race Condition in MatchLifecycleSessionOrchestrator

**Issue:** Wenn `createMatchSession()` waehrend einer laufenden async `initializeMatchSession()` erneut aufgerufen wird, kann die alte Promise nach Erstellen der neuen Session noch resolven und stale Match-Daten anwenden (Lifecycle-Corruption).

**Fix-Strategie:**
- [x] 56.1.1 `_applyInitializedMatch()` mit Session-ID-Guard versehen: nur anwenden wenn `resolvedMatch._sessionId === this._activeSessionId` (abgeschlossen: 2026-03-25; evidence: TBD)
- [x] 56.1.2 Regressionstest in `tests/core.spec.js` fuer parallele `createMatchSession()`-Aufrufe hinzufuegen (abgeschlossen: 2026-03-25; evidence: TBD)

### 56.2 Defensive Null-Checks in ProjectileSimulationOps

**Issue:** `portalResult.target` wird nach `if (portalResult)` Check ohne Null-Assertion verwendet. Obwohl in der Praxis immer set, sollte defensiv geprueft werden.

**Fix-Strategie:**
- [x] 56.2.1 Linie 197 in ProjectileSimulationOps: `if (portalResult?.target)` statt `if (portalResult)` (abgeschlossen: 2026-03-25; evidence: TBD)
- [x] 56.2.2 Vergleichbare Portal-Zugriffe in `PortalRuntimeSystem.js`, `SpecialGateRuntime.js` durchsuchen und absichern (abgeschlossen: 2026-03-25; evidence: TBD)

### 56.3 Double-Dispose Guard in TouchInputSource

**Issue:** `dispose()` ruft `removeUI()` auf, bevor `super.dispose()` aufgerufen wird. Doppelaufrufe oder Fehler in `super.dispose()` könnten zu Problemen fuehren. Fehlende Idempotenz-Guard.

**Fix-Strategie:**
- [x] 56.3.1 `TouchInputSource` mit `_disposed` Flag versehen, sodass `dispose()` und `removeUI()` idempotent sind (abgeschlossen: 2026-03-25; evidence: TBD)
- [x] 56.3.2 `dispose()` -> if (this._disposed) return; am Anfang (abgeschlossen: 2026-03-25; evidence: TBD)
- [x] 56.3.3 Regressionstest fuer doppelter `dispose()`-Aufruf in `tests/core.spec.js` (abgeschlossen: 2026-03-25; evidence: TBD)

### 56.4 huntState Mutation-Pattern in MatchFlowUiController

**Issue:** `Object.assign(game.huntState, transition.huntStatePatch)` mutiert direkt ein Shared-State-Objekt. Wenn Patches verzögert oder aus Closures angewendet werden, könnten sie stale sein (keine dokumentierte Contract fuer Patchreihenfolge).

**Fix-Strategie:**
- [x] 56.4.1 `MatchFlowUiController` auf sichere Mutation umstellen: entweder Kopie vor assign oder Revision-Guard hinzufuegen (abgeschlossen: 2026-03-25; evidence: TBD)
- [x] 56.4.2 Comment hinzufuegen dass `transition.huntStatePatch` bis zum naechsten Frame gebueffert werden kann; Reihenfolge-Garantie dokumentieren (abgeschlossen: 2026-03-25; evidence: TBD)

### 56.5 Code-Quality Improvements (kleinere Punkte)

**Verbesserungen, die im Audit identifiziert wurden:**

- [x] 56.5.1 `ProfileManager.js:97` — `JSON.parse/stringify` Clone ersetzen durch dedizierte Cloning-Utility (bereits in V54.5.1 gemacht via `JsonClone.js`) (abgeschlossen: 2026-03-25; evidence: src/shared/utils/JsonClone.js exists)
- [x] 56.5.2 Debugging/Hotpath `console.log` in `PortalRuntimeSystem.js` ueberpruefung (bereits in V55.5.1 gemacht) (abgeschlossen: 2026-03-25; evidence: V55.5.1 completed)
- [x] 56.5.3 Unused exports (z. B. `crc32()` in `GameStateSnapshot.js`) identifizieren und entfernen oder dokumentieren (abgeschlossen: 2026-03-25; evidence: TBD)

### Phase 56.99: Integrations- und Abschluss-Gate

- [ ] 56.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen (evidence: TBD)
- [ ] 56.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Lock-Status aktualisiert (evidence: TBD)

### Risiko-Register V56

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Session-ID-Guard in _applyInitializedMatch veraendert Lifecycle-Semantik | mittel | Core | Konservative Guard: nur reject wenn ID nicht-leer und nicht-matching; weiterhin alle Patches anwenden | Matches starten nicht korrekt |
| Defensive null-checks maskieren echte Fehler in Portal-Datenstruktur | niedrig | Physics | null-checks kombiniert mit Telemetrie-Log bei Abweichung | Portal-Config-Fehler bleibt verborgen |
| Doppelt-dispose Guard reduziert Sichtbarkeit echter Dispose-Fehler | niedrig | Core | Telemetrie-Log bei zweitem dispose()-Aufruf | Dispose-Fehler-Debugging wird schwieriger |

---

## Backlog (priorisiert, nicht gestartet)

Hinweis: Bot-Training-Backlog wird in `docs/Bot_Trainingsplan.md` gepflegt.

| ID | Titel | Plan-Datei | Impact | Aufwand | Prioritaet | Naechster Schritt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V39 | Komplexe Showcase-Map | `docs/Feature_Komplexe_Showcase_Map_V39.md` | mittel | gross | P2 | Scope-Review nach V46 | In Bearbeitung |
| V40 | Hunt Rocket Trail Targeting | `docs/Feature_Hunt_Rocket_Trail_Targeting_V40.md` | mittel | mittel | P1 | mit V50.1 Contract abstimmen | Offen |
| V53 | SettingsManager Decomposition und Settings-Domain-Entkopplung | `docs/Feature_SettingsManager_Decomposition_V53.md` | hoch | mittel | P1 | abgeschlossen (V53.99) | Abgeschlossen |
| V54 | Gesamtfix Architektur-/Qualitaetspunkte | `docs/Feature_Gesamtfix_Architektur_Qualitaet_V54.md` | sehr hoch | gross | P1 | abgeschlossen (V54.99) | Abgeschlossen |
| V55 | Tiefenaudit-Remediation (Teststabilitaet, Concurrency, Runtime-Robustheit) | `docs/Umsetzungsplan.md` | sehr hoch | gross | P1 | abgeschlossen (55.99) | Abgeschlossen |
| V56 | Code-Audit Remediation - Defensive Improvements & Edge-Case Fixes | `docs/Umsetzungsplan.md` | mittel | mittel | P2 | Impl. starten (56.1-56.4) | Offen |
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

## Weekly Review (KW 12/2026)

Stand: 2026-03-25

- Abgeschlossen diese Woche: V46.2.1, V46.2.2, V46.3.1, V46.3.2, V46.99, 41.99.1, 41.99.2, 41.99.3, 41.99.4, V50.1-V50.9, V50.99, V52.1-V52.99, V54.1-V54.99, V55.1-V55.99, Planarchiv-Bereinigung.
- Blockiert: kein aktiver Blocker; V55 abgeschlossen, V56 geplant basierend auf Code-Audit.
- Naechste 3 Ziele:
  1. V56: Defensive Improvements aus Code-Audit implementieren (56.1-56.4, edge-case focus).
  2. V42: Menu-Default-Editor UX/Ownership finalisieren.
  3. V2: Test-Performance-Baseline erneuern und Ratchet aktualisieren.
- Audit-Befunde: Code-Qualitaets-Audit identifizierte 4 konkrete Verbesserungsmoeglichkeiten (Async Race Condition, Defensive Null-Checks, Double-Dispose Guard, Mutation Pattern). V55 hatte bereits viele potenzielle Probleme adressiert.
- Entscheidungsbedarf: Nach V56 absolviert, ob V42 oder V2 prioritaer werden sollen.

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`

