# Feature: Gesamtfix Architektur-/Qualitaetspunkte (V54)

Stand: 2026-03-24  
Status: Geplant  
Owner: Codex

## Ziel

Alle aktuell identifizierten Verbesserungs-Punkte als zusammenhaengenden Fix-Plan umsetzen:

- Decomposition der groessten God-Objects.
- Reduktion der Layer-Kopplung (`entities -> core`, `ui -> core`).
- Rueckbau von `constructor(game)` / `this.game = game` Legacy-Mustern.
- Vereinheitlichung von Deep-Clone/Payload-Clone-Pfaden.
- Kapselung von Browser-Global-Zugriffen ausserhalb `src/ui`.
- Abschluss mit Guard-/Test-/Dokumentations-Gates.

## Betroffene Dateien (geplant)

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

- [ ] 54.1 Architektur-Baseline und Kanteninventar
  - [ ] 54.1.1 Vollstaendige Kantenmatrix fuer `entities -> core`, `ui -> core`, `state -> core` inklusive Legacy-Ausnahmen erfassen
  - [ ] 54.1.2 Zielbudgets (Ratchet) pro Kantenklasse und Legacy-Muster (`constructor(game)`, DOM ausserhalb `src/ui`) verbindlich festlegen

- [ ] 54.2 God-Object-Decomposition
  - [ ] 54.2.1 `MediaRecorderSystem`, `MenuMultiplayerBridge`, `GameRuntimeFacade`, `WebSocketTrainerBridge` entlang Domain-Schnitten in kleinere Module/Facades splitten
  - [ ] 54.2.2 Oeffentliche Runtime-/Menu-APIs stabil halten und Call-Sites schrittweise migrieren

- [ ] 54.3 Layer-Kopplung abbauen
  - [ ] 54.3.1 Direkte `entities -> core` Imports auf `shared` Contracts/Ports umstellen, insbesondere fuer Config-/Runtime-Zugriffe
  - [ ] 54.3.2 Direkte `ui -> core` Imports auf `composition`/Port-Schichten migrieren, inklusive Event-/Command-Pfaeden

- [ ] 54.4 Legacy-Konstruktor-/Game-Referenzen reduzieren
  - [ ] 54.4.1 `constructor(game)`-Nutzungen auf explizite, kleine Dependency-Objekte umstellen
  - [ ] 54.4.2 `this.game = game`-Pattern in betroffenen Klassen entfernen oder auf read-only Ports/Funktionen begrenzen

- [ ] 54.5 Clone-/Determinismus-/Zeitpfade vereinheitlichen
  - [ ] 54.5.1 Einheitlichen Clone-Helper fuer strukturierte Payloads einfuehren und `JSON.parse(JSON.stringify(...))` in Kernpfaden ersetzen
  - [ ] 54.5.2 Zeit-/Zufallsquellen in kritischen Runtime-Pfaden ueber injizierbare Clock/RNG-Contracts vereinheitlichen

- [ ] 54.6 Browser-Globals kapseln
  - [ ] 54.6.1 `window`/`document`/Storage-Zugriffe ausserhalb `src/ui` hinter Runtime-Adaptern kapseln
  - [ ] 54.6.2 Legacy-Ausnahmen abbauen und Boundary-Checks fuer neue Verstosse verschaerfen

- [ ] 54.7 Test- und Guard-Haertung
  - [ ] 54.7.1 Relevante Regressionstests fuer Menu/Runtime/Physics aktualisieren (`test:core`, `test:physics`, ggf. `test:fast`)
  - [ ] 54.7.2 `architecture:guard`, Build und betroffene Smokes als Pflicht-Gate pro Teilphase gruen halten

- [ ] 54.99 Integrations- und Abschluss-Gate
  - [ ] 54.99.1 `npm run architecture:guard`, `npm run test:fast`, `npm run test:core`, `npm run build` sind gruen
  - [ ] 54.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log und Lock-Bereinigung sind abgeschlossen

## Verifikationsstrategie (DoD-fokussiert)

- Architektur-Metriken sinken gegenueber Baseline (`entities -> core`, `ui -> core`, Legacy-Patterns).
- Decomposition erzeugt keine Verhaltensregression in Menu-, Match-, Recording- und Multiplayer-Pfaden.
- Dokumentations- und Governance-Gates bleiben durchgehend gruen.

## Frische-Hinweis

Vor jedem Teilabschluss: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.
