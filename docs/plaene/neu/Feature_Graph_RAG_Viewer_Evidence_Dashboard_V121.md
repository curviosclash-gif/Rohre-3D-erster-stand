# Feature: Lokaler Graph-RAG Viewer und Evidence-Dashboard (V121)

Stand: 2026-05-15
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V121.md`

## Ziel

Nach Abschluss des Graph-RAG-Kernblocks `V120` entsteht ein lokaler, read-only HTML-Viewer fuer Graph-, Graph-RAG- und Evidence-Ergebnisse. Der Viewer macht harte Graph-Fakten, RAG-Treffer, Quellen, Redaction-Status, lokale LLM-/Adapter-Smokes und Kontextbudget sichtbar, ohne selbst Datenhaltung, Steuerquelle oder Wahrheitsschicht zu werden.

Kurzform:

```text
V120 baut Graph-RAG, Evidence-Pakete und Adapter.
V121 baut das lokale Cockpit fuer Lesen, Pruefen und Erklaeren.
```

Leitprinzipien:

- JSON/Contracts/Scripts bleiben Wahrheit und Logik.
- HTML/CSS/JS ist nur read-only Anzeige, Filterung und Erklaeroberflaeche.
- Keine Schreibfunktionen in Graph, Plaene, Contracts, Cache oder Modelle.
- Kein Modell-Download und keine Installation aus dem Viewer.
- Viewer funktioniert ohne lokale LLM-Runtime.
- Viewer zeigt Safety-/Redaction-/Historical-Status sichtbar an.

## Ausgangslage

Der vorhandene Wissensgraph kennt bereits historische Viewer-Reste:

- `tools/graph-viewer/index.html`
- `tools/graph-viewer/viewer.js`
- `tools/graph-viewer/viewer.css`
- `scripts/export-knowledge-graph-view.mjs`

Graph-Befund vom 2026-05-15:

- `node scripts/query-knowledge-graph.mjs why-file tools/graph-viewer/index.html --json` meldet Scope `V107`, `V111`, aber `exists=false`.
- `files-for-block V107` und `files-for-block V111` listen `tools/graph-viewer/*` und `scripts/export-knowledge-graph-view.mjs`, diese Pfade sind aktuell nicht vorhanden/covered.
- `query-knowledge-graph.mjs export-view --json` existiert und liefert einen redigierten Exportpfad fuer lokale Viewer-/Audit-Nutzung.
- V111 dokumentiert Viewer/Exports als lokal und read-only sowie Safety-Filter fuer `export-view`.
- Der neue V120-Entwurf fokussiert Graph-RAG-Kernlogik, lokale LLM-Auswahl, Context-Adapter, Evidence-Paket, Tests und Rollout; ein Viewer ist dort bewusst nicht Kernbestandteil.

V121 soll diese historischen Viewer-Reste nicht blind wiederbeleben, sondern als Folgeplan kontrolliert ersetzen oder migrieren.

## Desktop-first Scope

- Primaerziel ist ein lokales, offlinefaehiges HTML-Dashboard fuer Desktop-/Repo-Arbeit.
- Der Viewer kann als statisches Tool unter `tools/graph-rag-viewer/` liegen.
- Daten kommen aus redigierten Exporten, Graph-RAG-Evidence-Paketen oder vom User ausgewaehlten lokalen JSON-Dateien.
- Der Viewer darf als Browser-/HTML-Oberflaeche existieren, aber der Desktop-/Repo-Workflow bleibt CLI- und Contract-first.
- Falls ein Dev-Server noetig wird, ist er nur Komfortpfad; Grundfunktion soll mit lokalem Export/File-Input oder statischem Preview moeglich bleiben.

## Nicht-Ziel

- Keine kanonische Graph-Datenhaltung in HTML.
- Kein Ersatz fuer `query-knowledge-graph.mjs`, `graph-rag-query.mjs` oder Contract-Tests.
- Keine Schreib-/Editierfunktion fuer Plaene, Graph, Contracts, Evidence-Pakete, Cache oder Einstellungen.
- Keine Speicherung von Raw-Exports, Secrets, Tokens oder unredigierten PII-Daten im Browser-State.
- Keine lokale LLM-Installation, kein Modell-Download und kein Adapter-Start aus dem Viewer.
- Keine schwere Visualisierungsplattform oder externe Cloud-Abhaengigkeit.
- Kein In-App-Landing-Page- oder Marketing-Screen; erster Screen ist das nutzbare Dashboard.

## Betroffene Dateien und Bereiche

Neue Viewer-Dateien, vorgeschlagen:

- `tools/graph-rag-viewer/index.html`
- `tools/graph-rag-viewer/viewer.js`
- `tools/graph-rag-viewer/viewer.css`
- `tools/graph-rag-viewer/README.md`

Neue Export-/Contract-Dateien, vorgeschlagen:

- `scripts/graph-rag-viewer-export.mjs`
- `data/contracts/knowledge-graph/graph-rag-viewer-export.v1.json`
- `data/contracts/knowledge-graph/graph-rag-viewer-fixture.v1.json`

Neue Tests, vorgeschlagen:

- `tests/graph-rag-viewer-export.contract.test.mjs`
- `tests/graph-rag-viewer-ui.contract.test.mjs`

Bestehende Inputs/Consumer:

- `scripts/query-knowledge-graph.mjs`
- `scripts/graph-rag-query.mjs` (aus V120)
- `scripts/graph-rag-local-llm-check.mjs` (aus V120)
- `docs/generated/knowledge-graph.json`
- `docs/generated/knowledge-graph.coverage.json`
- `docs/generated/knowledge-graph.scorecard.json`
- `data/contracts/knowledge-graph/query-ops.v1.json`
- `data/contracts/knowledge-graph/rag-evidence-package.v1.json` (aus V120)
- `tmp/graph-rag/` als transienter lokaler Export-/Report-Ort

Historische Bezugspunkte:

- `docs/plaene/aktiv/V107.md`
- `docs/plaene/aktiv/V111.md`
- `tools/graph-viewer/*` als nicht existierende historische Scope-Reste
- `scripts/export-knowledge-graph-view.mjs` als nicht existierender historischer Scope-Rest

## Informationsarchitektur

Der Viewer soll ein dichtes, arbeitsorientiertes Dashboard sein, keine Landing Page. Erwartete Oberflaechen:

- `Overview`: Graph-Score, Coverage, Critical-Path-Status, Export-/Redaction-Status.
- `Critical Paths`: `spawn`, `combat-hit`, `round-end`, `settings` mit Layern, Validierung und Risiken.
- `Scope & Plans`: Block-/Datei-Beziehungen, Scope-Kollisionen, V120/V121-Abhaengigkeiten.
- `Evidence`: Graph-RAG-Evidence-Pakete mit Claims, Quellen, Zeilen, Confidence und Unsicherheiten.
- `Chunks`: ausgewaehlte RAG-Chunks, verworfene Kandidatenzaehlung und Ranking-Begruendung.
- `Local Adapter`: lokale LLM-/Context-Adapter-Smoke-Ergebnisse, Modellprofil, Fallback-Status.
- `Safety`: redigierte Felder, `default-redacted` vs. `unsafe-raw`, historische Quellenmarkierung.
- `Diff/Export Info`: Erzeugungszeit, Eingabehashes, Contract-Versionen, verwendete Query-IDs.

## Datenfluss

Primärer read-only Datenfluss:

```text
Graph/Scorecard/Coverage + V120 Evidence-Pakete + LLM-Smoke-Reports
  -> graph-rag-viewer-export.mjs
  -> redigierter Viewer-Export unter tmp/graph-rag/viewer/
  -> tools/graph-rag-viewer/index.html
```

Alternative ohne Export-Script:

```text
User waehlt lokale JSON-Datei per File-Input
  -> Viewer validiert Contract-Feld
  -> Viewer zeigt nur read-only Inhalte
```

Der Viewer darf keine Daten aus `docs/plaene/alt/` selbst crawlen. Historische Inhalte muessen bereits im Evidence-Paket oder Viewer-Export als `historical` markiert sein.

## Viewer-Export-Vertrag

V121 soll einen stabilen, kleinen Exportvertrag einfuehren. Beispielstruktur:

```json
{
  "contract": "graph-rag.viewer-export.v1",
  "generatedAt": "2026-05-15T00:00:00.000Z",
  "safety": {
    "mode": "default-redacted",
    "redactionApplied": true,
    "unsafeRaw": false
  },
  "graph": {
    "scorecard": {},
    "coverageSummary": {},
    "criticalPaths": []
  },
  "rag": {
    "evidencePackages": [],
    "contextBudget": {},
    "chunkStats": {}
  },
  "localAdapter": {
    "runtime": "none|ollama|llama.cpp|other",
    "status": "available|fallback|unavailable",
    "smoke": {}
  },
  "sources": {
    "contracts": [],
    "artifacts": [],
    "historical": []
  }
}
```

Regeln:

- Export ist read-only und redigiert per Default.
- Export unter `tmp/graph-rag/viewer/` bleibt untracked.
- Kleine Fixtures fuer Tests duerfen unter `data/contracts/knowledge-graph/` getrackt werden.
- Raw-/Unsafe-Exports duerfen nicht Standardinput fuer den Viewer sein.
- Export verweist auf Pfade/Zeilen, kopiert aber keine grossen Quelltexte unnoetig.

## UI- und Interaktionsregeln

- Keine Card-in-Card-Struktur; Dashboard als klare Arbeitsflaeche mit Tabs oder Segmented Controls.
- Kein Marketing-Hero, keine dekorativen Orbs, keine Landing Page.
- Dichte, scanbare Tabellen und Detailpanels fuer wiederholte Repo-Arbeit.
- Filter fuer Node-Typ, Critical Path, Block-ID, Datei, Confidence, Safety-Status und `historical`.
- Quellenpfade und Zeilenbereiche sichtbar, klick-/kopierbar als lokale Pfadangabe.
- Lange Claims zusammenklappbar, aber nicht versteckt, wenn sie Safety- oder Unsicherheitsstatus tragen.
- Viewer muss bei fehlender lokaler LLM-Runtime sauber `fallback` anzeigen.
- Viewer muss bei unpassendem Contract mit lesbarer Fehlermeldung abbrechen.

## Sicherheit und Governance

- Viewer ist Consumer, keine Quelle.
- Kein Speichern von Evidence-Paketen in `localStorage`, ausser optional UI-State wie Tab/Filter.
- Falls Browser-State genutzt wird, nur nicht-sensitive UI-Praeferenzen.
- `unsafe-raw` wird sichtbar als Audit-/Gefahrenmodus markiert und ist kein Default.
- `historical` Quellen werden sichtbar gekennzeichnet und nicht als aktive Steuerquelle dargestellt.
- Viewer-Scope darf nicht dazu fuehren, dass V107/V111 nachtraeglich als vollstaendig visualisiert behauptet werden; alte Scope-Reste werden entweder ersetzt oder als historische Drift dokumentiert.
- Bei aktiver Uebernahme muss der Viewer-Scope in `scope_files` explizit und begrenzt aufgefuehrt werden.

## Definition of Done

- [ ] DoD.1 V120 ist abgeschlossen. Ein frueherer V121-Start ist nur erlaubt, wenn der aktive V120-Block vorher ein explizites `fixture-ready`-Gate mit Evidence-Paket, Graph-RAG-Query-Ausgabe, LLM-/Adapter-Smoke-Status und Cache-/Export-Regeln dokumentiert.
- [ ] DoD.2 Viewer-Export-Vertrag `graph-rag.viewer-export.v1` ist definiert und durch Contract-Test validiert.
- [ ] DoD.3 `scripts/graph-rag-viewer-export.mjs` erzeugt einen default-redacted Export unter `tmp/graph-rag/viewer/`, ohne getrackte Cache-/Export-Artefakte.
- [ ] DoD.4 `tools/graph-rag-viewer/index.html`, `viewer.js`, `viewer.css` stellen Graph-, RAG-, Evidence-, Safety- und Adapter-Status read-only dar.
- [ ] DoD.5 Viewer kann mit einem kleinen getrackten Fixture ohne lokale LLM-Runtime starten.
- [ ] DoD.6 Viewer zeigt `historical` Quellen, Redaction-Status, Fallback-Status und Unsicherheiten sichtbar an.
- [ ] DoD.7 Viewer erzeugt keine zweite Wahrheit: keine Schreibfunktion, kein automatischer Crawl, kein lokaler Raw-Cache, keine Aenderung an Graph/Plans/Contracts.
- [ ] DoD.8 Historische V107/V111-Viewer-Reste sind entschieden: ersetzt, bewusst nicht umgesetzt oder in V121-Evidence als abgeloeste Scope-Reste dokumentiert.
- [ ] DoD.9 UI-Smoke prueft mindestens: Fixture laden, Critical-Path-Ansicht sichtbar, Evidence-Paket sichtbar, Safety-Badge sichtbar, fehlende LLM-Runtime als Fallback sichtbar.
- [ ] DoD.10 Abschluss-Gates: relevante Viewer-Contract-Tests, `node scripts/check-knowledge-graph.mjs`, `npm run plan:check`; bei aktiver Uebernahme zusaetzlich Docs-/Graph-Sync nach Governance-Regel.

## Phasenplan

### 121.1 Intake und Scope-Abgrenzung
status: open
goal: Viewer als Folgeblock sauber von V120-Kernlogik trennen
output: finaler Scope, historische Drift-Entscheidung, Exportvertrag-Entwurf

- [ ] 121.1.1 V120-Outputs pruefen: Evidence-Paket, Graph-RAG-Query-Ausgabe, LLM-Smoke-Report und Cache-/Export-Regeln.
- [ ] 121.1.2 Historische V107/V111-Viewer-Reste klassifizieren: ersetzen, bewusst nicht wieder aufnehmen oder als Drift dokumentieren.
- [ ] 121.1.3 Viewer-Scope begrenzen: read-only HTML, Export-Script, Fixture, Tests; keine Graph-/RAG-Kernlogik.
- [ ] 121.1.4 `scope_files` fuer spaetere aktive Uebernahme vorbereiten, inklusive `tools/graph-rag-viewer/**`, Export-Script, Contract und Tests.

### 121.2 Viewer-Export und Fixture
status: open
goal: Stabile, redigierte Datenbasis fuer den Viewer schaffen
output: Exportvertrag, Export-Script, Testfixture

- [ ] 121.2.1 `graph-rag.viewer-export.v1` definieren: Graph-Summary, Coverage, Critical Paths, Evidence, Chunks, Safety, Adapterstatus.
- [ ] 121.2.2 `scripts/graph-rag-viewer-export.mjs` planen/implementieren: liest Graph-/RAG-/Smoke-Artefakte, schreibt redigierten Export nach `tmp/graph-rag/viewer/`.
- [ ] 121.2.3 Kleines getracktes Fixture fuer Tests anlegen, ohne Secrets, Raw-Quelltexte oder grosse Graph-Dumps.
- [ ] 121.2.4 Contract-Test fuer Export-Schema, Redaction-Default, Historical-Markierung und fehlende LLM-Runtime ergaenzen.

### 121.3 HTML-Dashboard-MVP
status: open
goal: Read-only Viewer mit Kernansichten lauffaehig machen
output: Lokales HTML/CSS/JS-Dashboard

- [ ] 121.3.1 `tools/graph-rag-viewer/index.html` mit direktem Dashboard-Einstieg, File-Input oder Fixture-Load und Fehlermeldungen anlegen.
- [ ] 121.3.2 `viewer.js` fuer Contract-Validierung, Tab-/Filter-State, Tabellen, Detailpanels und Evidence-Rendering implementieren.
- [ ] 121.3.3 `viewer.css` fuer dichte, responsive Desktop-first Oberflaeche ohne Marketing-/Hero-Layout erstellen.
- [ ] 121.3.4 Ansichten fuer Overview, Critical Paths, Evidence, Chunks, Local Adapter und Safety umsetzen.

### 121.4 Safety, Explainability und Historical UX
status: open
goal: Viewer macht Quellenqualitaet und Risiken klar statt sie zu verstecken
output: sichtbare Badges, Warnungen und Quellenpfade

- [ ] 121.4.1 Redaction-Badge und Unsafe-Raw-Warnung anzeigen; Unsafe-Raw darf nur explizit als lokaler Auditmodus erscheinen.
- [ ] 121.4.2 `historical` Quellen optisch und textlich von aktiven Plan-/Graphquellen unterscheiden.
- [ ] 121.4.3 Evidence-Claims mit `path`, `lineStart`, `lineEnd`, `confidence`, `uncertainties` und Query-Herkunft anzeigen.
- [ ] 121.4.4 Kontextbudget und verworfene Kandidaten als Diagnose anzeigen, damit Tokenersparnis nachvollziehbar wird.

### 121.5 Tests und lokale Verifikation
status: open
goal: Viewer bleibt read-only, robust und ohne lokale LLM lauffaehig
output: Contract-/UI-Smoke-Signale

- [ ] 121.5.1 Export-Contract-Test fuer Fixture und realen redigierten Export ergaenzen.
- [ ] 121.5.2 UI-Smoke-Test mit Fixture: Dashboard laedt, Critical Paths sichtbar, Evidence sichtbar, Safety sichtbar, LLM-Fallback sichtbar.
- [ ] 121.5.3 Negativtests: invalides Contract-Feld, fehlende Evidence-Liste, unsafe-raw Input, historical-only Quellen.
- [ ] 121.5.4 Sicherstellen, dass keine Schreibpfade in Graph/Plans/Contracts/Cache aus dem Viewer existieren.

### 121.6 Dokumentation und Rollout
status: open
goal: Viewer nutzbar machen, ohne neue Wahrheitsschicht zu erzeugen
output: README, Handoff und Abschluss-Evidence

- [ ] 121.6.1 `tools/graph-rag-viewer/README.md` dokumentiert Nutzung, Input-Dateien, Safety-Modi, Fallback und Nicht-Ziele.
- [ ] 121.6.2 Referenz-/Plan-Kontext dokumentiert: Viewer ist Consumer von V120-Outputs und nicht Steuerquelle.
- [ ] 121.6.3 Historische V107/V111-Viewer-Reste im Abschlusskontext erklaeren: ersetzt oder bewusst nicht fortgefuehrt.
- [ ] 121.6.4 Abschluss-Evidence im aktiven Block und/oder `docs/plaene/CHANGELOG.md` hinterlegen.

### 121.99 Abschluss-Gate
status: open
goal: Viewer ist sicher, read-only und als Folgeconsumer uebergabefaehig
output: verifizierter Abschluss

- [ ] 121.99.1 Relevante Viewer-Contract-Tests -> pass.
- [ ] 121.99.2 UI-Smoke mit Fixture -> pass.
- [ ] 121.99.3 `node scripts/check-knowledge-graph.mjs` -> pass.
- [ ] 121.99.4 `npm run plan:check` -> pass.
- [ ] 121.99.5 Bei aktiver Uebernahme: `npm run docs:sync && npm run docs:check` nach Governance-Regel pruefen.
- [ ] 121.99.6 Abschlussnotiz nennt read-only Grenze, Safety-Status, V120-Dependency, historische Viewer-Reste und verbleibende Nicht-Ziele.

## Risiken

- Viewer wird versehentlich als neue Wahrheit verstanden.
  - Gegenmassnahme: read-only Consumer-Regel in Ziel, DoD, UI-Badges und README.
- Historische V107/V111-Reste werden unkritisch wieder aufgenommen.
  - Gegenmassnahme: 121.1 und 121.6 verlangen explizite Drift-/Ersatzentscheidung.
- UI-Scope blockiert V120-Kernnutzen.
  - Gegenmassnahme: hard dependency auf V120; V121 ist Folgeblock.
- Raw-/PII-Daten landen im Browser.
  - Gegenmassnahme: default-redacted Export, kein Raw-Default, keine sensitive LocalStorage-Nutzung.
- Statisches HTML kann lokale Dateien nicht bequem laden.
  - Gegenmassnahme: File-Input/Fixture als Baseline, optional Dev-Server nur Komfortpfad.
- Dashboard wird zu breit und schwer wartbar.
  - Gegenmassnahme: MVP-Ansichten strikt auf Overview, Critical Paths, Evidence, Chunks, Adapter, Safety begrenzen.

## Dependencies

- hard: `V120.99`.
- optional early-start gate: Nur wenn der aktive V120-Block ein explizites `fixture-ready`-Gate mit Evidence-Paket, Graph-RAG-Query-Ausgabe, lokaler LLM-/Adapter-Smoke-Evidence und Cache-/Export-Regeln dokumentiert, darf V121 vor `V120.99` als Fixture-Consumer starten.
- hard: `V107.99`, `V110.99`, `V111.99` als historische Graph-/Export-/Safety-Basis.
- phase gate: V120 muss entscheiden, wo Evidence-Pakete, Cache/Index und lokale Reports liegen, bevor V121 diese anzeigt.
- soft: `V116.99` fuer Kontext-/Archivhygiene.
- soft: `V119.99` fuer Evidence-Remediation und historische Planquellen.
- historical context: V107/V111 Viewer-Scope-Reste (`tools/graph-viewer/*`, `scripts/export-knowledge-graph-view.mjs`).

## AI-Ausfuehrungsmatrix

| Bereich | Klasse | Modus | Hinweis |
| --- | --- | --- | --- |
| Neue Intake-Datei | D2 | AUTO | Dieser Entwurf liegt unter `docs/plaene/neu/` und aendert keine aktive Quelle. |
| Viewer-Export-Script | D2 | REVIEW | Darf nur redigierte, read-only Exporte erzeugen. |
| HTML/CSS/JS Viewer | D2 | REVIEW | Keine Schreibpfade, keine Modellinstallation, keine zweite Wahrheit. |
| Aktive Planuebernahme | D3 | USER-GATE | Master-/Aktivplan-Aenderungen bleiben user-owned. |
| Safety-/Governance-Regeln | D3 | USER-GATE | Rule-/Workflow-Aenderungen nur nach Freigabe. |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V121`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V121.md`
- hard dependencies: `V120.99`, `V107.99`, `V110.99`, `V111.99`
- optional early-start gate: nur bei explizitem V120-`fixture-ready`-Gate mit dokumentierten Fixture-Artefakten und Export-/Cache-Regeln
- soft dependencies: `V116.99`, `V119.99`
- historische Referenzen: V107/V111 Viewer-Reste
- Hinweis: Bis zur aktiven Uebernahme in `docs/Umsetzungsplan.md` und `docs/generated/knowledge-graph.json` sind Graph-Dependency-Signale zu `V121` nicht aussagekraeftig.
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
