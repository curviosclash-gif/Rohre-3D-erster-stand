---
planned_block_id: V127
title: Repo Map Gesamtuebersicht und Wissensgraph-Verankerung
status: draft
priority: P2
owner: frei
created_at: 2026-05-19
affected_area: repo-map-knowledge-graph
depends_on:
  - V107.99
  - V110.99
  - V111.99
soft_depends_on:
  - V120.99
  - V121.99
  - V123.99
  - V124.99
blocked_by: []
---

# Feature: Repo Map Gesamtuebersicht und Wissensgraph-Verankerung (V127)

## Ziel

Die vorhandene Repo Map wird zu einem belastbaren, dokumentierten und im Wissensgraphen erklaerten Navigationslayer fuer die komplette Repo-Arbeit ausgebaut.

Der Block soll nicht nur zeigen, welche Dateien existieren, sondern warum sie wichtig sind: Plan-/Blockbezug, Graph-Abdeckung, Tests, Tooling, Startpfade, Repo-Ops, historische Reste und offene Anchoring-Luecken sollen in einer einzigen read-only Sicht nachvollziehbar werden.

Kurzform:

```text
Repo Map heute: lokaler Viewer + JSON-Export.
Repo Map V127: erklaerter Repo-Navigationslayer mit Graph-Anker, Referenzdoku und klaren Follow-up-Kanten.
```

## Ausgangslage

Vorhanden und funktionsfaehig:

- `scripts/export-repo-map.mjs` erzeugt `curvios.repo-map.v1`.
- `tools/repo-map/index.html`, `viewer.js`, `viewer.css` und `README.md` stellen die Map read-only dar.
- `tests/repo-map-export.contract.test.mjs` sichert den Exportvertrag.
- `start_repo_map.bat` erzeugt den Export und startet den lokalen Viewer.

Aktueller Wissensgraph-Befund:

- `scripts/export-repo-map.mjs` ist im Core-Graph vorhanden und via `B13` Audit-Scope abgedeckt.
- `tests/repo-map-export.contract.test.mjs` ist im Core-Graph vorhanden und via `B13` Audit-Scope abgedeckt.
- `tools/repo-map/*` und `start_repo_map.bat` sind coverage-seitig bekannt, aber als `repo-ops` klassifiziert und bewusst aus Product-Code-Coverage ausgeschlossen.
- Es gibt noch keinen expliziten semantischen Graph-Anker fuer `tool:repo-map`, `contract:curvios.repo-map.v1`, den Startpfad oder die Rolle der Repo Map im Agent-Leseweg.

## Nicht-Ziel

- Kein Ersatz fuer `query-knowledge-graph.mjs`, `docs/Umsetzungsplan.md` oder aktive `VXX`-Plaene.
- Keine Schreibfunktionen aus dem Viewer in Plaene, Graph, Contracts, Locks oder Source-Dateien.
- Keine automatische Masterplan- oder Aktivplan-Uebernahme.
- Kein Vollrewrite von V120/V121 Graph-RAG-Viewer-Scope.
- Kein Anspruch, jede historische Datei semantisch perfekt zu erklaeren; priorisierte Repo-Navigation geht vor Scheingenauigkeit.
- Keine produktiven Gameplay-, UI-, Physik-, Training- oder Multiplayer-Aenderungen in diesem Block.

## Geplanter Nutzwert

- Agents und Menschen koennen zuerst die Repo Map oeffnen und sehen, welche Bereiche existieren, wo Tests/Graph/Planbezug liegen und welche Luecken bewusst sind.
- Repo-Ops-Dateien wie Startskripte, Viewer und lokale Tools bleiben sauber von Product-Code-Coverage getrennt, sind aber trotzdem erklaert.
- `why-file`, `impact-for-file` und spaetere Graph-RAG-/Viewer-Antworten koennen die Repo Map als erklaerten Tool-Consumer einordnen.
- Neue lokale Werkzeuge bekommen ein Muster: Contract, README, Startpfad, Test, Graph-Anker, Coverage-Klassifikation.
- Die vorhandene Plan Map und Repo Map koennen spaeter konsistent nebeneinander genutzt werden: Plan Map fuer Block-/Phasenfluss, Repo Map fuer Datei-/Tool-/Graphfluss.

## Desktop-first Scope

- Primaerer Zielpfad ist lokale Desktop-/Repo-Arbeit.
- Der Viewer bleibt statisch, read-only und ohne externe Services nutzbar.
- Browser-Nutzung ist nur Anzeige- und Komfortpfad; Wahrheit bleibt in Scripts, Contracts, Graph-Generates, Plaenen und Referenzdoku.
- Der Startpfad `start_repo_map.bat` bleibt Windows-kompatibel und darf keine produktiven Dateien schreiben ausser dem transienten Export unter `tmp/`.

## Betroffene Dateien und Bereiche

Bestehende Dateien:

- `scripts/export-repo-map.mjs`
- `tools/repo-map/index.html`
- `tools/repo-map/viewer.js`
- `tools/repo-map/viewer.css`
- `tools/repo-map/README.md`
- `tests/repo-map-export.contract.test.mjs`
- `start_repo_map.bat`
- `scripts/build-knowledge-graph.mjs`
- `scripts/query-knowledge-graph.mjs`
- `docs/generated/knowledge-graph.json`
- `docs/generated/knowledge-graph.coverage.json`
- `docs/generated/knowledge-graph.scorecard.json`

Moegliche neue oder erweiterte Dateien:

- `docs/referenz/repo_map.md`
- `data/contracts/knowledge-graph/repo-map-tool.v1.json`
- ergaenzte Knowledge-Graph-Mappingdaten unter `data/contracts/knowledge-graph/**`, falls Mapping-only reicht
- gezielte Contract-Tests fuer Repo-Map-Graph-Anker, falls neue Graph-Constraints noetig werden

## Definition of Done

- [ ] DoD.1 Referenzdoku erklaert Zweck, Start, Contract, Datenquellen, Grenzen und Nicht-Ziele der Repo Map.
- [ ] DoD.2 Der Wissensgraph kennt die Repo Map als Tool-/Contract-/Viewer-Surface oder gleichwertigen semantischen Anker.
- [ ] DoD.3 Repo-Ops-Klassifikation bleibt absichtlich: Viewer/Startdatei sind nicht Product-Code-Coverage, aber begruendet auffindbar.
- [ ] DoD.4 `why-file` oder eine gleichwertige Graph-Query erklaert fuer Export, Viewer, README, Test und Startdatei den Status.
- [ ] DoD.5 Repo Map zeigt mindestens Planbezug, Graph-Abdeckung, Testsignale, Repo-Ops-Klasse und offene Anchoring-Luecken sichtbar an.
- [ ] DoD.6 Plan Map und Repo Map sind begrifflich getrennt dokumentiert und widersprechen sich nicht.
- [ ] DoD.7 Keine Schreibpfade aus dem Viewer in Graph, Plaene, Locks, Contracts oder Source-Dateien.
- [ ] DoD.8 Abschluss-Gates fuer Plan, Graph, Contract-Test und lokale Viewer-Smoke sind gruen oder blockerfest dokumentiert.

## Phasen

### 127.1 Baseline und Abgrenzung
status: open
goal: aktuellen Repo-Map-Zustand festhalten und von V120/V121/V124 sauber trennen
output: bestaetigter Scope, Query-Befund, Lueckenliste

- [ ] 127.1.1 Aktuelle Befunde mit `why-file` fuer Export, Test, Viewer, README und Startdatei erfassen.
- [ ] 127.1.2 `scope-collisions` und Master-Abhaengigkeiten pruefen; V127 darf keine V120/V121/V124-Arbeit doppeln.
- [ ] 127.1.3 Plan Map und Repo Map begrifflich trennen: Plan Map = Block-/Phasenfluss, Repo Map = Datei-/Tool-/Graphfluss.
- [ ] 127.1.4 Repo-Ops-Ausnahme bestaetigen oder anpassen: Viewer/Startdatei sollen auffindbar, aber nicht Product-Code-Coverage werden.

### 127.2 Referenzdoku und Contract-Haertung
status: open
goal: Aufbau dauerhaft erklaeren, bevor neue Graph-Semantik hinzukommt
output: `docs/referenz/repo_map.md` und geschaerfte README-/Contract-Grenzen

- [ ] 127.2.1 `docs/referenz/repo_map.md` anlegen: Zweck, Startpfad, Exportvertrag, Datenquellen, Grenzen, Troubleshooting.
- [ ] 127.2.2 `tools/repo-map/README.md` mit Referenzlink, Startdatei und Graph-Status ergaenzen.
- [ ] 127.2.3 Exportvertrag `curvios.repo-map.v1` auf benoetigte Felder fuer Coverage-, Plan-, Test- und Repo-Ops-Sicht pruefen.
- [ ] 127.2.4 Contract-Test erweitern, falls neue Felder oder Invarianten fuer Graph-Anker benoetigt werden.

### 127.3 Wissensgraph-Anker
status: open
goal: Repo Map als erklaerten Tool-Consumer im Graph sichtbar machen
output: Mapping/Constraints/Queries fuer Repo-Map-Semantik

- [ ] 127.3.1 Semantisches Modell waehlen: `tool`, `contract`, `surface`, `repo-ops` oder kompatible vorhandene Node-Typen wiederverwenden.
- [ ] 127.3.2 Mapping fuer `curvios.repo-map.v1`, `scripts/export-repo-map.mjs`, `tools/repo-map/*`, `start_repo_map.bat` und Referenzdoku ergaenzen.
- [ ] 127.3.3 Query-Verhalten pruefen: `why-file` muss fehlende Core-Graph-Teilnahme bei Repo-Ops-Dateien erklaeren statt als blinde Luecke wirken.
- [ ] 127.3.4 `graph:check` und relevante Contract-Tests sichern, dass der neue Anker keine bestehenden Graph-SLOs oder Coverage-Regeln verwischt.

### 127.4 Komplette Repo-Sicht und Lueckenlogik
status: open
goal: Repo Map deckt die komplette Repo-Struktur nuetzlich ab, ohne Scheinabdeckung zu erzeugen
output: filterbare Gesamtansicht mit erklaerten Kategorien

- [ ] 127.4.1 Exportdaten fuer Kategorien pruefen: Product-Code, Tests, Docs, Plans, Repo-Ops, Generated, Transient, Archive.
- [ ] 127.4.2 UI-Filter und Zaehler fuer Graph-Abdeckung, Coverage-Status, Scope-Block, Testbezug und Repo-Ops-Klasse schaerfen.
- [ ] 127.4.3 Offene Anchoring-Luecken sichtbar machen: nicht jeder uncovered Pfad ist ein Fehler, aber jede wichtige Luecke braucht eine Klasse.
- [ ] 127.4.4 Grosse Aussagen wie "komplette Repo Map" nur mit konkreten Export-/Coverage-/Query-Evidence belegen.

### 127.5 Startpfad, UX und lokale Verifikation
status: open
goal: Start und Nutzung bleiben robust fuer Alltagsarbeit
output: stabiler Startpfad, Viewer-Smoke, klare Fehlerzustaende

- [ ] 127.5.1 `start_repo_map.bat --check` als schnelles Health-Signal erhalten oder erweitern.
- [ ] 127.5.2 Viewer zeigt fehlenden Export, falschen Contract und stale Daten lesbar an.
- [ ] 127.5.3 Desktop- und schmale Viewport-Smokes pruefen, dass Filter, Details und Tabellen nicht ueberlappen.
- [ ] 127.5.4 Keine Persistenz sensibler Daten im Browser; hoechstens nicht-sensitive UI-Praeferenzen.

### 127.6 Handoff zu V120/V121/V124
status: open
goal: Repo Map mit Graph-RAG und Produktsemantik verbinden, ohne Scope-Vermischung
output: klare Handoff-Regeln und optionale Folgefragen

- [ ] 127.6.1 V120 kann Repo-Map-Daten als Kontextquelle nutzen, aber nicht als Wahrheitsschicht.
- [ ] 127.6.2 V121 kann die Repo Map verlinken oder als Quelle anzeigen, ohne den Graph-RAG-Viewer-Scope zu doppeln.
- [ ] 127.6.3 V124 kann produktsemantische Luecken aus der Repo Map priorisieren, aber Produktsemantik bleibt eigener Graph-Ratchet.
- [ ] 127.6.4 Offene Entscheidungen fuer spaetere Bloecke dokumentieren: welche Luecken gehoeren in V127, welche in V124, welche bleiben bewusst repo-ops.

### 127.99 Abschluss-Gate
status: open
goal: Repo Map ist dokumentiert, graph-verankert und als lokaler Navigationslayer uebergabefaehig
output: verifizierter Abschluss mit nachvollziehbarer Evidence

- [ ] 127.99.1 Alle frueheren Phasen sind abgeschlossen oder blockerfest mit Nachfolgeentscheid dokumentiert.
- [ ] 127.99.2 `node --test tests/repo-map-export.contract.test.mjs` -> PASS.
- [ ] 127.99.3 `cmd /c start_repo_map.bat --check` -> PASS.
- [ ] 127.99.4 `npm run graph:build` und `npm run graph:check` -> PASS.
- [ ] 127.99.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` -> PASS.
- [ ] 127.99.6 Abschlussnotiz erklaert Graph-Anker, Repo-Ops-Grenze, offene Produktsemantik-Handoffs und verbleibende Risiken.

## Risiken

| Risiko | Schwere | Mitigation |
| --- | --- | --- |
| Repo Map wird als neue Wahrheit missverstanden | hoch | Read-only-Regel, Referenzdoku, UI-Hinweis und DoD.7 |
| Repo-Ops-Dateien werden faelschlich als Product-Code-Coverage gerechnet | mittel | Klassifikation beibehalten, aber semantisch erklaeren |
| V127 doppelt V121/V124-Scope | mittel | Klare Trennung: Repo-Navigation statt Graph-RAG-Viewer oder Produktsemantik-Ratchet |
| "Komplette Repo Map" wird zu breit | mittel | Kategorien und Lueckenklassen statt Vollperfektion |
| Graph-Anker blaeht Query-Ausgaben auf | mittel | Default-Filter, Tool-Semantik nur bei passenden Queries ausgeben |
| Startdatei driftet gegen Exportvertrag | niedrig | `--check`, Contract-Test und README zusammen halten |

## Dependencies

### Hard

- `V107.99`: Core-Graph und Query-Layer.
- `V110.99`: Graph-Ops, Guardrails, SLOs und Coverage-Regeln.
- `V111.99`: Ownership-/Stability-/Scorecard-Grundlagen.

### Soft

- `V120.99`: Graph-RAG kann Repo-Map-Kontext spaeter nutzen.
- `V121.99`: Viewer-/Evidence-Dashboard kann Repo-Map-Links oder Status uebernehmen.
- `V123.99`: Plan-Index- und Source-of-Truth-Migration kann Repo-Map-Lesewege beeinflussen.
- `V124.99`: Produktsemantik-Ratchet kann offene Semantik-Luecken aus der Repo Map harvesten.

V127 kann als kleiner, eigenstaendiger Repo-Tooling-Block vorbereitet werden, ohne auf V120/V121/V124 zu warten. Die Handoffs werden wertvoller, wenn diese Bloecke aktiv oder abgeschlossen sind.

## Decision-Klasse und AI-Ausfuehrungsmatrix

| Bereich | Klasse | Default | Grenze |
| --- | --- | --- | --- |
| Query-Befunde, `--check`, lokale Reports unter `tmp/` | D0/D1 | [AUTO] | Keine getrackten Source-of-truth-Dateien aendern |
| Neuer Intake-Draft unter `docs/plaene/neu/` | D2 | [AUTO] | Keine Master-/Aktivplan-Aenderung |
| Referenzdoku, README, Contract-Test, Repo-Map-Viewer-Ergaenzung | D2 | [REVIEW] | Read-only und klarer Scope |
| Knowledge-Graph-Mapping/Builder/Query-Aenderung | D2/D3 | [REVIEW] | D3, wenn Source-of-truth-/Governance-Regeln betroffen sind |
| Masterplan, aktive V127-Datei, Rules, Workflows | D3 | [USER-GATE] | User-owned Intake |
| Loeschungen, Moves, grosse Rebuilds, produktive Codepfade | D4 | [USER-GATE] | Grundsaetzlich Nicht-Ziel |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V127`
- vorgeschlagene kanonische Blockdatei nach Intake: `docs/plaene/aktiv/V127.md`
- hard dependencies: `V107.99`, `V110.99`, `V111.99`
- soft dependencies: `V120.99`, `V121.99`, `V123.99`, `V124.99`
- vorgeschlagene Prioritaet: `P2`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
