# Feature: SettingsManager Decomposition und Settings-Domain-Entkopplung (V53)

Stand: 2026-03-24  
Status: Abgeschlossen  
Owner: Codex

## Ziel

`src/core/SettingsManager.js` wurde von monolithischer Logik auf eine schlanke Orchestrator-Fassade umgestellt.  
Domain-Logik liegt jetzt in dedizierten Modulen unter `src/core/settings/**` bei unveraenderter oeffentlicher API.

## Betroffene Dateien (ist)

- `src/core/SettingsManager.js`
- `src/core/settings/SettingsDefaultsFacade.js`
- `src/core/settings/SettingsSanitizerOps.js`
- `src/core/settings/SettingsSessionDraftFacade.js`
- `src/core/settings/SettingsPresetFacade.js`
- `src/core/settings/SettingsDeveloperFacade.js`
- `src/core/settings/SettingsTextOverrideFacade.js`
- `src/core/settings/SettingsTelemetryFacade.js`
- `src/core/settings/SettingsDomainUtils.js`
- `src/core/GameRuntimeFacade.js`
- `tests/core.spec.js`

## API-Inventar (53.1.1)

Stabile `SettingsManager`-Fassade und aktive Call-Sites:

- `switchSessionType`, `applyMenuPreset`, `createDefaultSettings`: `src/core/runtime/MenuRuntimeSessionService.js`
- `applyMenuPreset`, `saveMenuPreset`, `deleteMenuPreset`: `src/core/runtime/MenuRuntimePresetConfigService.js`
- `setDeveloperMode`, `setDeveloperTheme`, `setDeveloperVisibility`, `setMenuTextOverride`: `src/core/runtime/MenuRuntimeDeveloperModeService.js`
- `recordMenuTelemetry`, `applyMenuCompatibilityRules`, `createRuntimeConfig`, `cloneDefaultControls`: `src/core/GameRuntimeFacade.js`
- `saveSessionDraft`, `applySessionDraft`, `sanitizeSettings`: `tests/core.spec.js` (Characterization)

Evidence: `rg -n "settingsManager\\." src/core/runtime src/core/GameRuntimeFacade.js tests/core.spec.js`

## Characterization-Baseline (53.1.2)

Kritische Flows sind durch bestehende + ergaenzte `test:core`-Faelle abgedeckt:

- `sanitizeSettings`: `T20o1`
- Session-Switch und Session-Drafts: `T20o`
- Preset-Apply/Save-Contracts: `T20e`, `T20f`, `T20bb`, `T20bc`
- Telemetry/History/UI: `T20ke`, `T20t`
- Fight-Tuning Runtime-Apply: `T20x0`

Evidence: `TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2`

## Phasenplan

- [x] 53.1 Scope-Baseline und API-Inventar (abgeschlossen: 2026-03-24; evidence: rg -n "settingsManager\\." src/core/runtime src/core/GameRuntimeFacade.js tests/core.spec.js -> docs/plaene/alt/Feature_SettingsManager_Decomposition_V53.md)
  - [x] 53.1.1 Oeffentliche `SettingsManager`-Methoden inkl. Aufrufer inventarisiert und Facade-Vertrag fixiert (abgeschlossen: 2026-03-24; evidence: rg -n "settingsManager\\." src/core/runtime src/core/GameRuntimeFacade.js tests/core.spec.js -> docs/plaene/alt/Feature_SettingsManager_Decomposition_V53.md)
  - [x] 53.1.2 Characterization-Baseline fuer kritische Flows dokumentiert (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)

- [x] 53.2 Settings-Normalisierung zerlegen (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.2.1 `sanitizeSettings` in dedizierte Ops/Funktionen entlang Domain-Grenzen ausgelagert (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.2.2 Migrations-/Clamp-/Kompatibilitaetsregeln unveraendert abgesichert (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5302 PW_RUN_TAG=botFv53d PW_OUTPUT_DIR=test-results/botFv53d npm run test:core -- --grep "T20o1" -> test-results/botFv53d)

- [x] 53.3 Preset- und Session-Draft-Domain trennen (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.3.1 Session-Draft-Flow als eigene Service-Schicht gekapselt (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.3.2 Preset-Flow auf getrennte Ops mit stabilem Result-Contract migriert (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)

- [x] 53.4 Developer/Text/Telemetry-Domain extrahieren (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.4.1 Developer-Aktionen in dedizierte Facade ausgelagert (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.4.2 Text-Override- und Telemetry-History-Pfade als eigene Services ausgefuehrt (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)

- [x] 53.5 Orchestrator-Manager finalisieren (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.5.1 `SettingsManager` auf Store-Wiring + Domain-Orchestrierung + Runtime-Config reduziert (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)
  - [x] 53.5.2 Imports/Exporte fuer Call-Sites stabilisiert, Legacy-Helfer entfernt (abgeschlossen: 2026-03-24; evidence: git show --name-only 0f04006 -> 0f04006)

- [x] 53.6 Verifikation und Guard-Haertung (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)
  - [x] 53.6.1 `test:core` fuer Settings/Menu/Session/Preset/Telemetry-Flows erweitert/nachgezogen (`T20o1`) (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)
  - [x] 53.6.2 `architecture:guard` gegen neue Grenzen gefahren (abgeschlossen: 2026-03-24; evidence: npm run architecture:guard -> 0f04006)

- [x] 53.99 Integrations- und Abschluss-Gate (abgeschlossen: 2026-03-24; evidence: npm run build -> 0f04006)
  - [x] 53.99.1 `npm run test:core`, `npm run architecture:guard`, `npm run build` sind fuer den Scope gruen (abgeschlossen: 2026-03-24; evidence: TEST_PORT=5306 PW_RUN_TAG=botFv53-full2 PW_OUTPUT_DIR=test-results/botFv53-full2 npm run test:core -> test-results/botFv53-full2)
  - [x] 53.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` abgeschlossen (abgeschlossen: 2026-03-24; evidence: npm run docs:check -> docs/prozess/Dokumentationsstatus.md)

## Verifikationsstrategie (DoD-fokussiert)

- API-stabil: bestehende Runtime/Menu-Call-Sites nutzen unveraenderte Entry-Points.
- Verhaltensstabil: Sanitizing-, Preset-, Session- und Telemetry-Pfade bleiben regressionsabgesichert.
- Wartbarer: klar getrennte Domain-Module statt monolithischer Klasse.


