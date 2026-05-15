# Feature: Graph-RAG mit lokalem Context-Subagent

Stand: 2026-05-15
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V120.md`

## Ziel

Der bestehende deterministische Wissensgraph wird nicht ersetzt, sondern um eine Graph-gestuetzte RAG-Schicht mit lokalem Context-Subagent erweitert. Der Graph bleibt Quelle fuer harte Fakten wie Block-, Datei-, Critical-Path-, Scope- und Testbeziehungen. Die neue RAG-Schicht liefert nur relevante Textstellen, kompakte Zusammenfassungen und Evidence-Pakete, damit Hauptmodell-Kontext und Tokenverbrauch deutlich sinken.

Zielbild:

```text
User-Frage
  -> Intent Router
  -> Knowledge-Graph Query
  -> Kandidaten: Blocks, Files, Tests, Critical Paths, Docs
  -> lokaler Retrieval-/Context-Subagent
       - liest lokale Quellen read-only
       - chunked, rankt und fasst zusammen
       - entfernt irrelevante Treffer
  -> kompaktes Evidence-Paket
  -> Hauptmodell beantwortet, plant oder implementiert
```

Leitprinzipien:

- Graph = harte Fakten.
- RAG = relevante Textstellen.
- Lokale AI = Token-Sparer, Reranker und Verdichter.
- Hauptmodell = finale Entscheidung und Umsetzung.

## Ausgangslage

Der aktuelle Graph ist ein deterministischer Projekt-/Architekturgraph, kein RAG-System. Er enthaelt `block`, `phase`, `subphase`, `runtime`, `event`, `state`, `config`, `test`, `file` und `surface` Nodes sowie typisierte Kanten wie `scope`, `depends_on`, `implements`, `emits`, `consumes`, `reads_config`, `writes_state`, `validated_by`, `cannot`, `blocked_by`.

Aktuelle Untersuchung vom 2026-05-15:

- `node scripts/check-knowledge-graph.mjs` -> pass.
- `node scripts/query-knowledge-graph.mjs schema-lint --json` -> pass, keine Violations/Warnings.
- Scorecard: `91/pass`, Trend `-4.2` gegen `V111.3.1`.
- Critical Paths `combat-hit`, `round-end`, `settings`, `spawn` -> ok.
- `untested-systems` -> keine kritischen ungetesteten Systeme.
- Adjusted Coverage: `74.3%`, Gate weiterhin pass.
- Scope-Kollisionen vorhanden und als Testfaelle geeignet: u. a. `V112/V96`, `V112/V113`, `V113/V96`.
- `graph:slo` bricht aktuell bei `export-view` ab, weil `scripts/check-knowledge-graph-slos.mjs` nicht alle Query-IDs aus `data/contracts/knowledge-graph/query-ops.v1.json` unterstuetzt.

## Desktop-first Scope

- Primaerziel ist die lokale Desktop-/Repo-Arbeit mit vorhandenen Graph-Artefakten und lokalen Dateien.
- Keine externe Vektordatenbank als Pflicht.
- Keine Cloud-AI als zwingender Vorfilter.
- Lokaler Subagent ist optional und muss bei Nichtverfuegbarkeit sauber auf Graph-only oder regelbasiertes Retrieval zurueckfallen.
- Browser-/Demo-Scopes sind nur Consumer der Analyse, nicht eigener Produktpfad.

## Nicht-Ziel

- Kein Ersatz des bestehenden Knowledge Graph.
- Kein Big-Bang-Umbau aller Query-Tools.
- Keine automatische Wahrheitserzeugung durch lokale AI.
- Keine Indexierung von Secrets, `.env`, Tokens, Credentials oder privaten Exporten.
- Keine produktiven Code-Aenderungen durch den lokalen Subagent.
- Keine Verpflichtung auf ein bestimmtes lokales Modell oder einen bestimmten Anbieter.

## Betroffene Dateien und Bereiche

- `scripts/query-knowledge-graph.mjs`
- `scripts/check-knowledge-graph-slos.mjs`
- `scripts/build-knowledge-graph.mjs`
- `data/contracts/knowledge-graph/query-ops.v1.json`
- `docs/generated/knowledge-graph.json`
- `docs/generated/knowledge-graph.coverage.json`
- `docs/generated/knowledge-graph.scorecard.json`
- `docs/plaene/aktiv/V107.md`
- `docs/plaene/aktiv/V110.md`
- `docs/plaene/aktiv/V111.md`
- `docs/plaene/CHANGELOG.md`
- neue Scripts, vorgeschlagen:
  - `scripts/graph-rag-index.mjs`
  - `scripts/graph-rag-query.mjs`
  - `scripts/graph-rag-local-agent.mjs`
- neue Contracts, vorgeschlagen:
  - `data/contracts/knowledge-graph/rag-sources.v1.json`
  - `data/contracts/knowledge-graph/rag-evidence-package.v1.json`
  - `data/contracts/knowledge-graph/local-agent-profiles.v1.json`
- neue Tests, vorgeschlagen:
  - `tests/graph-rag-index.contract.test.mjs`
  - `tests/graph-rag-query.contract.test.mjs`
  - `tests/graph-rag-local-agent.contract.test.mjs`

## Retrieval-Quellen

Startquellen:

- `docs/plaene/aktiv/`
- `docs/plaene/alt/`
- `docs/plaene/CHANGELOG.md`
- `docs/Umsetzungsplan.md`
- `docs/referenz/`
- `docs/qa/`
- `data/contracts/knowledge-graph/`
- `.agents/rules/`
- `.agents/workflows/`
- graph-gefiltert: ausgewaehlte `src/`, `tests/`, `scripts/`

Nicht oder nur explizit ausgeschlossen:

- `assets/`
- `archive/`
- `data/training/`
- `tmp/`
- `.codex_tmp/`
- `node_modules/`
- rohe grosse generated JSONs als semantische Dokumente

`docs/generated/knowledge-graph*.json` bleiben strukturierte Graph-Artefakte und werden nicht als normale RAG-Textquellen behandelt.

## Chunk- und Metadatenmodell

Jeder Chunk muss stabile Metadaten tragen:

```json
{
  "chunkId": "docs/plaene/aktiv/V112.md#phase-3",
  "path": "docs/plaene/aktiv/V112.md",
  "kind": "plan",
  "blockId": "V112",
  "heading": "Phase 3",
  "lineStart": 120,
  "lineEnd": 168,
  "textHash": "sha256:...",
  "graphRefs": ["V112", "src/ui/start-setup/StartSetupUiOps.js"],
  "mtime": "..."
}
```

Chunk-Regeln:

- Markdown nach Frontmatter, Ueberschriften, DoD, Phasen und Evidence splitten.
- Plan-Dateien bevorzugt semantisch nach Phase/Subphase teilen.
- Code-Dateien nur graph-gefiltert und begrenzt lesen.
- Chunks grob `300-900` Woerter halten.
- Grosse JSONs strukturiert abfragen, nicht volltextlich indexieren.

## Lokaler Context-Subagent

Der lokale Subagent ist read-only und liefert ein Evidence-Paket. Er darf nicht committen, schreiben, loeschen oder finale Architekturentscheidungen treffen.

Aufgaben:

- Intent-nahe Kandidaten reranken.
- Lange Textstellen komprimieren.
- Duplikate und irrelevante Chunks entfernen.
- Claims mit Quelle, Zeilen und Unsicherheitsmarkierung extrahieren.
- Bei fehlendem Kontext explizit `insufficient_context` melden.

Moegliche lokale Laufzeiten:

- Ollama
- llama.cpp
- anderer lokaler HTTP-/CLI-Adapter
- regelbasierter Fallback ohne Modell

Modellrollen:

- `local-reranker`
- `local-summarizer`
- `local-fact-extractor`

## Evidence-Paket

Zentrales internes Format:

```json
{
  "contract": "graph-rag.evidence-package.v1",
  "question": "...",
  "intent": "scope-analysis",
  "graph": {
    "queries": ["scope-collisions"],
    "facts": []
  },
  "retrieval": {
    "selectedChunks": [],
    "discardedCount": 42
  },
  "summary": [
    "..."
  ],
  "evidence": [
    {
      "path": "docs/plaene/aktiv/V112.md",
      "lineStart": 10,
      "lineEnd": 30,
      "claim": "...",
      "confidence": "source-backed"
    }
  ],
  "uncertainties": []
}
```

Jeder Claim muss entweder source-backed sein oder als unsicher markiert werden.

## Query-Pipeline

1. Intent erkennen:
   - Planfrage
   - Runtimefrage
   - Datei-/Impactfrage
   - Testfrage
   - Architekturfrage
   - historische Entscheidung
2. Graph-Query ausfuehren:
   - `impact-for-file`
   - `surfaces-for-file`
   - `scope-collisions`
   - `critical-path-health`
   - `event-flow`
   - `coverage-report`
   - `why-file`
   - `files-for-block`
3. Kandidaten sammeln:
   - Blockplaene
   - betroffene Dateien
   - Tests
   - Changelogstellen
   - Contract-Dateien
4. Lokalen Subagent oder Fallback ausfuehren:
   - Chunks laden
   - ranken
   - zusammenfassen
   - Evidence-Paket bauen
5. Hauptmodell bekommt nur:
   - User-Frage
   - Graph-Fakten
   - lokale Zusammenfassung
   - Quellenliste
   - Unsicherheiten

## Caching

- Chunk-Cache nach Dateihash.
- Ranking-/Embedding-Cache nach Chunkhash und Query-Fingerprint.
- Summary-Cache nach `questionFingerprint + graphHits + chunkHashes`.
- Graph-Artefakte nur neu laden, wenn Hash geaendert.
- Lokale AI-Ausgaben immer an Quellhash binden.
- Cache darf keine Secrets oder unredigierte Exporte enthalten.

## Sicherheit

- `export-view` default-redacted verwenden.
- Keine `.env`, Secrets, Tokens, Credentials oder private Raw-Exports indexieren.
- Safety-Filter vor lokalem Agent und vor Evidence-Paket.
- Lokaler Subagent read-only.
- `--unsafe-raw` darf nicht in Standardpfaden genutzt werden.
- Evidence-Pakete enthalten Quellen und Unsicherheiten, keine versteckten Vollkontexte.

## Definition of Done

- [ ] DoD.1 `graph:slo` ist repariert oder Query-IDs ohne SLO-Runner werden explizit und dokumentiert uebersprungen.
- [ ] DoD.2 Ein versionierter RAG-Quellenvertrag definiert erlaubte und ausgeschlossene Quellen.
- [ ] DoD.3 Ein deterministischer Markdown-/Plan-Chunker erzeugt stabile Chunk-IDs, Zeilenbereiche und Hashes.
- [ ] DoD.4 Graph-gesteuerte Kandidatenauswahl nutzt vorhandene Queries, bevor Text-Retrieval startet.
- [ ] DoD.5 Ein lokaler Agent-Adapter ist optional verfuegbar und besitzt einen regelbasierten Fallback.
- [ ] DoD.6 Evidence-Paket `graph-rag.evidence-package.v1` ist schema-/contract-seitig beschrieben.
- [ ] DoD.7 Mindestens drei Referenzfragen liefern kompakte, source-backed Evidence-Pakete:
  - Warum kollidieren `V112` und `V96`?
  - Welche historischen Entscheidungen betreffen `SettingsManager`?
  - Welche Quellen erklaeren den `spawn` Critical Path?
- [ ] DoD.8 Token-/Kontextbudget ist messbar: Hauptmodell-Kontext enthaelt nur ausgewaehlte Chunks und kompakte Graph-Fakten.
- [ ] DoD.9 Safety-Filter verhindert Indexierung bekannter Secret-/PII-Muster und raw Graph Exports.
- [ ] DoD.10 Fallback-Test zeigt: ohne lokalen Agent bleibt Graph-only Antwort moeglich.
- [ ] DoD.11 Contract-Tests decken Chunking, Evidence-Paket, Fallback und mindestens eine lokale-Agent-Mock-Antwort ab.
- [ ] DoD.12 Abschluss-Gates bleiben gruen: `graph:check`, relevante Graph-RAG-Contract-Tests, `plan:check`, bei aktiver Uebernahme zusaetzlich Docs-/Graph-Sync nach Governance-Regel.

## Phasenplan

### 120.1 Stabilisierung der Graph-Basis
status: open
goal: Vor RAG-Erweiterung die vorhandenen Graph-Gates stabilisieren
output: reparierter SLO-Pfad und dokumentierte Ausgangsmetriken

- [ ] 120.1.1 `query-ops.v1.json` und `check-knowledge-graph-slos.mjs` synchronisieren; insbesondere `export-view`, `quality-scorecard`, `schema-lint`, `incident-auto-minimize`, `test-prioritization`, `policy-evaluate`, `feedback-loop`, `what-if-*` behandeln.
- [ ] 120.1.2 Score-Drop `-4.2` analysieren und als Ausgangsrisiko dokumentieren.
- [ ] 120.1.3 Nicht existierende File-Nodes und Scope-Kollisionen als bekannte Test-/Risiko-Faelle fuer Graph-RAG erfassen.

### 120.2 Quellenvertrag und Chunk-Index-MVP
status: open
goal: RAG-Quellen explizit, sicher und reproduzierbar erfassen
output: Quellenvertrag und lokaler Chunk-Index

- [ ] 120.2.1 `data/contracts/knowledge-graph/rag-sources.v1.json` mit Includes, Excludes, Klassifikationen und Safety-Regeln anlegen.
- [ ] 120.2.2 `scripts/graph-rag-index.mjs` fuer Markdown-/Plan-Chunks mit stabilen IDs, Zeilenbereichen und Hashes implementieren.
- [ ] 120.2.3 Generated Graph JSONs aus dem Volltextindex ausschliessen und nur ueber strukturierte Graph-Queries referenzieren.

### 120.3 Graph-gesteuerte Retrieval-Pipeline
status: open
goal: Erst harte Graph-Fakten, dann begrenztes Text-Retrieval
output: CLI fuer Graph-RAG-Fragen

- [ ] 120.3.1 Intent-Router fuer Plan-, Runtime-, Datei-, Test- und Architekturfragen als konservative Heuristik implementieren.
- [ ] 120.3.2 `scripts/graph-rag-query.mjs` anlegen: User-Frage -> Graph-Queries -> Kandidaten -> Chunks -> Evidence-Paket.
- [ ] 120.3.3 Referenzfragen fuer `scope-collisions`, `SettingsManager` und `spawn` als Contract-Fixtures ablegen.

### 120.4 Lokaler Context-Subagent
status: open
goal: Lokale AI optional als Token-sparenden Vorfilter nutzen
output: Adapter mit Mock, Fallback und Safety-Grenzen

- [ ] 120.4.1 `data/contracts/knowledge-graph/local-agent-profiles.v1.json` fuer Adapterprofile, Timeouts, Max-Input, Max-Output und Fallbacks definieren.
- [ ] 120.4.2 `scripts/graph-rag-local-agent.mjs` als read-only Adapter fuer Rerank, Summary und Fact-Extraction implementieren.
- [ ] 120.4.3 Mock-/No-Agent-Modus fuer Tests und Arbeitsplaetze ohne lokale AI bereitstellen.

### 120.5 Evidence-Paket und Tests
status: open
goal: Antworten source-backed, kompakt und pruefbar machen
output: Contract-Tests und Budget-Signale

- [ ] 120.5.1 Evidence-Paket-Vertrag mit `claim`, `path`, `lineStart`, `lineEnd`, `confidence`, `uncertainties` validieren.
- [ ] 120.5.2 Contract-Tests fuer Chunking, Quellenfilter, Graph-Kandidatenauswahl, Fallback und Mock-Agent ergaenzen.
- [ ] 120.5.3 Kontextbudget messen und als Report ausgeben: Anzahl Kandidaten, selektierte Chunks, verworfene Chunks, Zeichen-/Token-Schaetzung.

### 120.6 Rollout und Workflow-Integration
status: open
goal: Graph-RAG als sparsamen Standardpfad fuer komplexe Repo-Fragen nutzbar machen
output: dokumentierte CLI-Nutzung und Governance-Evidence

- [ ] 120.6.1 Kurze Nutzungshinweise in passendem Referenz-/Plan-Kontext dokumentieren, ohne Masterplan direkt zu veraendern.
- [ ] 120.6.2 Graph-First-Regel konkretisieren: Graph-RAG fuer Erklaerfragen und historische Entscheidungen, reine Graph-Queries fuer harte Scope-/Impact-Fakten.
- [ ] 120.6.3 Abschluss-Evidence im aktiven Block und/oder `docs/plaene/CHANGELOG.md` hinterlegen.

### 120.99 Abschluss-Gate
status: open
goal: Hybrid Graph-RAG ist stabil, sicher und token-sparend nutzbar
output: uebergabefaehiger Abschluss mit Evidence

- [ ] 120.99.1 `node scripts/check-knowledge-graph.mjs` -> pass.
- [ ] 120.99.2 Relevante Graph-RAG-Contract-Tests -> pass.
- [ ] 120.99.3 `npm run plan:check` -> pass.
- [ ] 120.99.4 Bei aktiver Uebernahme: `npm run docs:sync && npm run docs:check` nach Governance-Regel pruefen.
- [ ] 120.99.5 Abschlussnotiz mit Nutzen, Restrisiko, Fallback und Tokenbudget-Effekt dokumentieren.

## Risiken

- Lokale AI halluziniert oder fasst falsch zusammen.
  - Gegenmassnahme: lokale AI liefert nur source-backed Evidence oder markiert Unsicherheit; finale Wahrheit bleibt Graph/Quelle.
- Tokenersparnis kippt in Tool-Komplexitaet.
  - Gegenmassnahme: MVP mit drei Referenzfragen und messbarem Kontextbudget.
- Secrets gelangen in Index oder lokale Modellprompts.
  - Gegenmassnahme: Quellenvertrag, Excludes, Safety-Filter, keine Raw-Exports im Standardpfad.
- Graph-SLO-Drift verdeckt RAG-Nutzen.
  - Gegenmassnahme: SLO-Fix als Phase 120.1 vor RAG-Ausbau.
- Lokales Modell ist nicht installiert.
  - Gegenmassnahme: Mock- und regelbasierter Fallback sind Teil des DoD.

## Dependencies

- hard: `V107.99` (Core-Graph und Query-Layer)
- hard: `V110.99` (Graph Ops-/Guard-Haertung)
- hard: `V111.99` (Adaptive Diagnose- und Entscheidungsintelligenz)
- soft: `V116.99` (Repo-Kontext-Reduktion; verbessert Nutzen und Index-Hygiene)
- soft: `V119.99` (Evidence-Remediation; verbessert historische Planquellen)

## AI-Ausfuehrungsmatrix

| Bereich | Klasse | Modus | Hinweis |
| --- | --- | --- | --- |
| Graph-/Coverage-Analyse | D0 | AUTO | Read-only Queries und Reports duerfen laufen. |
| Neue Intake-Datei | D2 | AUTO | Dieser Entwurf liegt unter `docs/plaene/neu/` und aendert keine aktive Quelle. |
| Aktive Planuebernahme | D3 | USER-GATE | Master-/Aktivplan-Aenderungen bleiben user-owned. |
| Lokaler Agent Adapter | D2 | REVIEW | Implementierung erlaubt nach Intake; kein Schreibrecht fuer lokalen Agent. |
| Safety-/Governance-Regeln | D3 | USER-GATE | Rule-/Workflow-Aenderungen nur nach Freigabe. |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V120`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V120.md`
- hard dependencies: `V107.99`, `V110.99`, `V111.99`
- soft dependencies: `V116.99`, `V119.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
