# Feature: Gesamtfix Architektur-/Qualitaetspunkte (V54)

Stand: 2026-03-24  
Status: Abgeschlossen (V54.99)  
Owner: Codex

## Ziel

Alle aktuell identifizierten Verbesserungs-Punkte als zusammenhaengenden Fix-Plan umsetzen:

- Decomposition der groessten God-Objects.
- Reduktion der Layer-Kopplung (`entities -> core`, `ui -> core`).
- Rueckbau von `constructor(game)` / `this.game = game` Legacy-Mustern.
- Vereinheitlichung von Deep-Clone/Payload-Clone-Pfaden.
- Kapselung von Browser-Global-Zugriffen ausserhalb `src/ui`.
- Abschluss mit Guard-/Test-/Dokumentations-Gates.

## Betroffene Dateien (umgesetzt)

- `src/core/MediaRecorderSystem.js`
- `src/ui/menu/MenuMultiplayerBridge.js`
- `src/core/GameRuntimeFacade.js`
- `src/entities/ai/training/WebSocketTrainerBridge.js`
- `src/core/main.js`
- `src/core/settings/**`
- `src/entities/**`
- `src/ui/**`
- `src/state/**`
- `src/shared/**`
- `scripts/architecture/**`
- `scripts/check-architecture-*.mjs`
- `tests/core.spec.js`
- `tests/physics-core.spec.js`
- `tests/physics-policy.spec.js`
- `docs/Umsetzungsplan.md`

## Architektur-Check

- Kantenabbau erfolgt ueber Ports/Contracts statt durch direkte Querverweise.
- Bestehende Guard-Ratchets bleiben aktiv und duerfen nur sinken, nicht steigen.
- Decomposition erfolgt schrittweise mit API-kompatiblen Facades.

Risiko-Einstufung: **hoch**  
Grund: mehrschichtiger Eingriff in `core`, `entities`, `ui`, `state` und Architekturskripte.

## Evidence-Format

Abgeschlossene Punkte dokumentieren mit:  
`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

- [x] 54.1 Architektur-Baseline und Kanteninventar (abgeschlossen: 2026-03-24; evidence: `npm run architecture:guard` -> Architecture Scorecard)
  - [x] 54.1.1 Vollstaendige Kantenmatrix fuer `entities -> core`, `ui -> core`, `state -> core` inklusive Legacy-Ausnahmen erfassen (abgeschlossen: 2026-03-24; evidence: `npm run architecture:guard` -> Architecture Scorecard report)
  - [x] 54.1.2 Zielbudgets (Ratchet) pro Kantenklasse und Legacy-Muster (`constructor(game)`, DOM ausserhalb `src/ui`) verbindlich festlegen (abgeschlossen: 2026-03-24; evidence: `git show --name-only 11ad51b` -> `scripts/architecture/ArchitectureConfig.mjs`, `scripts/architecture/architecture-budget-ratchet.json`)

- [x] 54.2 God-Object-Decomposition (abgeschlossen: 2026-03-24; evidence: `git show --name-only b218f3c` -> decomposition modules)
  - [x] 54.2.1 `MediaRecorderSystem`, `MenuMultiplayerBridge`, `GameRuntimeFacade`, `WebSocketTrainerBridge` entlang Domain-Schnitten in kleinere Module/Facades splitten (abgeschlossen: 2026-03-24; evidence: `git show --name-only b218f3c` -> `src/core/recording/MediaRecorderSystemOps.js`, `src/core/runtime/GameRuntimeSettingsKeySets.js`)
  - [x] 54.2.2 Oeffentliche Runtime-/Menu-APIs stabil halten und Call-Sites schrittweise migrieren (abgeschlossen: 2026-03-24; evidence: `TEST_PORT=5413 PW_RUN_TAG=v54-final-core-pass PW_OUTPUT_DIR=test-results/v54-final-core-pass npm run test:core` -> 102 passed, 1 skipped)

- [x] 54.3 Layer-Kopplung abbauen (abgeschlossen: 2026-03-24; evidence: `git show --name-only 88d436e` -> map contract migration)
  - [x] 54.3.1 Direkte `entities -> core` Imports auf `shared` Contracts/Ports umstellen, insbesondere fuer Config-/Runtime-Zugriffe (abgeschlossen: 2026-03-24; evidence: `git show --name-only 88d436e` -> `src/entities/CustomMapLoader.js`)
  - [x] 54.3.2 Direkte `ui -> core` Imports auf `composition`/Port-Schichten migrieren, inklusive Event-/Command-Pfaeden (abgeschlossen: 2026-03-24; evidence: `git show --name-only 88d436e` -> `src/ui/menu/MenuCompatibilityRules.js`, `src/ui/menu/MenuPreviewCatalog.js`)

- [x] 54.4 Legacy-Konstruktor-/Game-Referenzen reduzieren (abgeschlossen: 2026-03-24; evidence: `git show --name-only 4cf8efd` -> orchestrator migration)
  - [x] 54.4.1 `constructor(game)`-Nutzungen auf explizite, kleine Dependency-Objekte umstellen (abgeschlossen: 2026-03-24; evidence: `git show --name-only 4cf8efd` -> `src/state/MatchLifecycleSessionOrchestrator.js`)
  - [x] 54.4.2 `this.game = game`-Pattern in betroffenen Klassen entfernen oder auf read-only Ports/Funktionen begrenzen (abgeschlossen: 2026-03-24; evidence: `npm run architecture:guard` -> constructor/game budget 8)

- [x] 54.5 Clone-/Determinismus-/Zeitpfade vereinheitlichen (abgeschlossen: 2026-03-24; evidence: `git show --name-only 58e22b6` + `git show --name-only 0ff690c`)
  - [x] 54.5.1 Einheitlichen Clone-Helper fuer strukturierte Payloads einfuehren und `JSON.parse(JSON.stringify(...))` in Kernpfaden ersetzen (abgeschlossen: 2026-03-24; evidence: `git show --name-only 58e22b6` -> `src/shared/utils/JsonClone.js`)
  - [x] 54.5.2 Zeit-/Zufallsquellen in kritischen Runtime-Pfaden ueber injizierbare Clock/RNG-Contracts vereinheitlichen (abgeschlossen: 2026-03-24; evidence: `git show --name-only 0ff690c` -> `src/core/GameRuntimeFacade.js`)

- [x] 54.6 Browser-Globals kapseln (abgeschlossen: 2026-03-24; evidence: `git show --name-only 2efc185` + `npm run architecture:guard`)
  - [x] 54.6.1 `window`/`document`/Storage-Zugriffe ausserhalb `src/ui` hinter Runtime-Adaptern kapseln (abgeschlossen: 2026-03-24; evidence: `git show --name-only 2efc185` -> `src/shared/runtime/BrowserStoragePorts.js`)
  - [x] 54.6.2 Legacy-Ausnahmen abbauen und Boundary-Checks fuer neue Verstosse verschaerfen (abgeschlossen: 2026-03-24; evidence: `npm run architecture:guard` -> boundary + ratchet PASS)

- [x] 54.7 Test- und Guard-Haertung (abgeschlossen: 2026-03-24; evidence: `npm run test:fast` + `npm run architecture:guard` + `npm run build`)
  - [x] 54.7.1 Relevante Regressionstests fuer Menu/Runtime/Physics aktualisieren (`test:core`, `test:physics`, ggf. `test:fast`) (abgeschlossen: 2026-03-24; evidence: `TEST_PORT=5412 PW_RUN_TAG=v54-final-fast-pass PW_OUTPUT_DIR=test-results/v54-final-fast-pass npm run test:fast` -> 128 passed, 1 flaky, 1 skipped)
  - [x] 54.7.2 `architecture:guard`, Build und betroffene Smokes als Pflicht-Gate pro Teilphase gruen halten (abgeschlossen: 2026-03-24; evidence: `npm run architecture:guard && npm run build` -> PASS)

- [x] 54.99 Integrations- und Abschluss-Gate (abgeschlossen: 2026-03-24; evidence: all mandatory checks PASS)
  - [x] 54.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen (abgeschlossen: 2026-03-24; evidence: `npm run architecture:guard && npm run build` -> PASS; `test-results/v54-final-fast-pass`, `test-results/v54-final-core-pass`)
  - [x] 54.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log und Lock-Bereinigung sind abgeschlossen (abgeschlossen: 2026-03-24; evidence: `npm run plan:check && npm run docs:sync && npm run docs:check` -> PASS)

## Verifikationsstrategie (DoD-fokussiert)

- Architektur-Metriken sinken gegenueber Baseline (`entities -> core`, `ui -> core`, Legacy-Patterns).
- Decomposition erzeugt keine Verhaltensregression in Menu-, Match-, Recording- und Multiplayer-Pfaden.
- Dokumentations- und Governance-Gates bleiben durchgehend gruen.

## Frische-Hinweis

Vor jedem Teilabschluss: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.
