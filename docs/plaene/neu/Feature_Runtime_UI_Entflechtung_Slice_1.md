---
title: Runtime-/UI-Entflechtung Slice 1
status: draft
priority: P2
owner: user-intake
planned_block_id: V118
depends_on:
  - V116.99
  - V117.99
affected_area: runtime-ui-decoupling-slice-1
scope_files:
  - src/core/arcade/ArcadeRunRuntime.js
  - src/core/MediaRecorderSystem.js
  - src/ui/UIStartSyncController.js
  - src/ui/UIManager.js
  - src/ui/arcade/ArcadeVehicleManager.js
  - docs/plaene/neu/Feature_Repo_Context_Cleanup.md
  - docs/plaene/neu/Feature_AI_Decision_Framework.md
  - docs/generated/knowledge-graph.json
  - scripts/query-knowledge-graph.mjs
  - tests/**/*.mjs
  - tests/**/*.js
---

# Runtime-/UI-Entflechtung Slice 1

## Kurzfassung

Dieser Plan ist der nachgelagerte Entflechtungsblock nach V117 und V116. Er startet keinen breiten God-Class-Umbau, sondern waehlt genau einen sicheren ersten Slice aus Runtime-/UI-Hotspots aus und setzt ihn mit vorherigem Test-/Graph-/Consumer-Nachweis um.

## Geplante Reihenfolge

1. `V117` AI Decision Framework und Autonomie-Gates.
2. `V116` Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung.
3. `V118` Runtime-/UI-Entflechtung Slice 1.

## Ziel

- Einen konkreten Entflechtungs-Kandidaten aus den V116-Hotspots auswaehlen.
- Vor der Codeaenderung Consumer, offene Findings, Graph-Surfaces und passende Tests klaeren.
- Genau eine Verantwortlichkeit extrahieren oder entkoppeln.
- Verhalten stabil halten; Produktlogik, Physik, Bot-Training-Parameter und Recording-Verhalten nicht nebenbei veraendern.
- Einen wiederholbaren Ablauf fuer weitere Entflechtungs-Slices schaffen.

## Nicht-Ziele

- Kein kompletter Runtime-Neubau.
- Kein UI-Rewrite.
- Keine breite Zerlegung mehrerer God-Classes in einem Block.
- Kein Refactor ohne vorherigen Kandidaten-, Consumer- und Gate-Nachweis.
- Kein Rebuild-/Reborn-Spike.

## Kandidatenpool

Die endgueltige Auswahl erfolgt erst in Phase 118.1. Startkandidaten:

- `src/ui/UIStartSyncController.js`
- `src/ui/UIManager.js`
- `src/ui/arcade/ArcadeVehicleManager.js`
- `src/core/arcade/ArcadeRunRuntime.js`
- `src/core/MediaRecorderSystem.js`

## Definition of Done

- [ ] DoD.1 Ein Kandidat ist ueber Graph, Consumer, offene Findings und Testsignal ausgewaehlt.
- [ ] DoD.2 Vorher-/Nachher-Gate ist definiert und ausgefuehrt oder blockerfest dokumentiert.
- [ ] DoD.3 Genau eine Verantwortlichkeit wurde extrahiert oder entkoppelt.
- [ ] DoD.4 Kein produktives Verhalten wurde absichtlich geaendert.
- [ ] DoD.5 Compatibility-, Legacy- oder Fallback-Pfade sind begruendet und mit Delete-Kriterium dokumentiert.
- [ ] DoD.6 Folge-Slices sind als Vorschlag dokumentiert, aber nicht im selben Block umgesetzt.
- [ ] DoD.99 Abschluss-Gates sind gruen oder blockerfest dokumentiert.

## Phasen

### 118.1 Kandidatenauswahl und Scope-Freeze

status: draft
goal: Einen sicheren ersten Slice auswaehlen.
output: Kandidat, Nicht-Ziele, Consumer-Liste und Gate-Plan.

- [ ] 118.1.1 Kandidaten mit `query-knowledge-graph` pruefen: `impact-for-file`, `surfaces-for-file`, `coverage-report`, bei Event-Pfaden `event-flow`.
- [ ] 118.1.2 Offene Findings aus `docs/prozess/Open_Findings.md` und V116-Reports abgleichen.
- [ ] 118.1.3 Einen Kandidaten waehlen und alle anderen Kandidaten explizit als out-of-scope markieren.
- [ ] 118.1.4 Blast-Radius nach V117 klassifizieren; bei D3/D4 stoppen und User-Freigabe einholen.

Gate:

- `npm run plan:check`

### 118.2 Baseline und Testsignal

status: draft
goal: Verhalten vor dem Refactor festhalten.
output: Vorher-Signal fuer den gewaehlten Pfad.

- [ ] 118.2.1 Kleinsten sinnvollen Contract-, Build-, Graph- oder Playwright-Check fuer den Kandidaten festlegen.
- [ ] 118.2.2 Vorher-Signal ausfuehren oder blockerfest dokumentieren.
- [ ] 118.2.3 Riskante Randfaelle notieren: Lifecycle, Cleanup/Dispose, Restart, Recording, Input, Bot-/Headless-Pfad.

Gate:

- Kandidatenspezifisches Vorher-Signal.

### 118.3 Entflechtungs-Slice

status: draft
goal: Genau eine Verantwortlichkeit extrahieren.
output: Kleiner Code-Diff mit unveraendertem Verhalten.

- [ ] 118.3.1 Nur den gewaehlten Kandidaten und direkt notwendige Tests/Imports anfassen.
- [ ] 118.3.2 Keine Feature-Arbeit, kein Parameter-Tuning, keine opportunistische Formatierung.
- [ ] 118.3.3 Nicht-offensichtliche Compatibility-Pfade mit Why-Kommentar und Delete-Kriterium dokumentieren.

Gate:

- Kandidatenspezifisches Nachher-Signal.
- `npm run plan:check`

### 118.4 Abschluss und Folge-Slices

status: draft
goal: Ergebnis sauber abschliessen und naechste Schritte begrenzen.
output: Abschluss-Evidence und Folge-Slice-Vorschlag.

- [ ] 118.4.1 Vorher-/Nachher-Signal vergleichen.
- [ ] 118.4.2 Abschluss-Evidence mit Datei, Gate, Ergebnis, Risiko und Fallback dokumentieren.
- [ ] 118.4.3 Maximal zwei Folge-Slices vorschlagen; keine Umsetzung in V118.

Gate:

- Passendes technisches Signal fuer den Kandidaten.
- `npm run gates:pre-commit` bei Docs-/Governance-/Graph-Scope oder `118.99`.

### 118.99 Abschluss-Gate

status: draft
goal: Slice reproduzierbar und ohne offene eigene Aenderungen abschliessen.
output: Scoped Commit und klare Folgeempfehlung.

- [ ] 118.99.1 Alle vorherigen Phasen sind abgeschlossen oder blockerfest dokumentiert.
- [ ] 118.99.2 Keine offenen eigenen Aenderungen bleiben im Worktree.
- [ ] 118.99.3 Folge-Slices sind nicht als versteckte Arbeit in V118 umgesetzt.

Gate:

- Kandidatenspezifische Checks.
- `npm run plan:check`
- `npm run gates:pre-commit` falls `*.99` geschlossen wird.

## Risiko-Register

| Risiko | Schwere | Beschreibung | Gegenmassnahme |
| --- | --- | --- | --- |
| R1 | hoch | Refactor veraendert Produktverhalten unbemerkt. | Vorher-/Nachher-Signal und enger Scope. |
| R2 | hoch | Slice wird zu breitem God-Class-Umbau. | Genau ein Kandidat, genau eine Verantwortlichkeit. |
| R3 | mittel | UI-/Runtime-Pfade haben versteckte Lifecycle-Abhaengigkeiten. | Graph-, Consumer- und Restart-/Dispose-Pruefung. |
| R4 | mittel | Tests decken den Kandidaten nicht direkt ab. | Kleinstes passendes Signal definieren oder Blocker dokumentieren. |

## Vorgeschlagene Master-Intake-Daten

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V118`
- Titel: `Runtime-/UI-Entflechtung Slice 1`
- Status: `planned`
- Prioritaet: `P2`
- Owner: `frei`
- Hard dependencies: `V116.99`, `V117.99`
- Current phase nach Intake: `118.1`
- Manuelle Uebernahme erforderlich: ja

