# Feature: Graph-RAG mit lokalem Context-Adapter

Stand: 2026-05-15
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V120.md`

## Ziel

Der bestehende deterministische Wissensgraph wird nicht ersetzt, sondern um eine Graph-gestuetzte RAG-Schicht mit lokalem Context-Adapter erweitert. Der Graph bleibt Quelle fuer harte Fakten wie Block-, Datei-, Critical-Path-, Scope- und Testbeziehungen. Die neue RAG-Schicht liefert nur relevante Textstellen, kompakte Zusammenfassungen und Evidence-Pakete, damit Hauptmodell-Kontext und Tokenverbrauch deutlich sinken.

Zielbild:

```text
User-Frage
  -> Intent Router
  -> Knowledge-Graph Query
  -> Kandidaten: Blocks, Files, Tests, Critical Paths, Docs
  -> lokaler Retrieval-/Context-Adapter
       - liest lokale Quellen read-only
       - chunked, rankt und fasst zusammen
       - entfernt irrelevante Treffer
  -> kompaktes Evidence-Paket
  -> Hauptmodell beantwortet, plant oder implementiert
```

Leitprinzipien:

- Graph = harte Fakten.
- RAG = relevante Textstellen.
- Lokale AI = Token-Sparer, Reranker und Verdichter im Adapter, nicht Governance-Subagent.
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
- Lokaler Context-Adapter ist optional und muss bei Nichtverfuegbarkeit sauber auf Graph-only oder regelbasiertes Retrieval zurueckfallen.
- Lokale LLM-Runtime-Auswahl und Installationspruefung sind Teil des Plans, aber kein lokales Modell wird zur harten Pflicht fuer Grundfunktionen.
- Browser-/Demo-Scopes sind nur Consumer der Analyse, nicht eigener Produktpfad.

## Nicht-Ziel

- Kein Ersatz des bestehenden Knowledge Graph.
- Kein Big-Bang-Umbau aller Query-Tools.
- Keine automatische Wahrheitserzeugung durch lokale AI.
- Keine Indexierung von Secrets, `.env`, Tokens, Credentials oder privaten Exporten.
- Keine produktiven Code-Aenderungen durch den lokalen Context-Adapter.
- Kein Codex-Subagent, kein Parallel-Agent und keine Umgehung der Subagent-Governance aus `.agents/rules/planning_and_governance.md`.
- Keine Verpflichtung auf ein bestimmtes lokales Modell oder einen bestimmten Anbieter.
- Keine automatische Installation externer Binaries oder Modell-Downloads ohne explizite User-Aktion.

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
  - `scripts/graph-rag-context-adapter.mjs`
  - `scripts/graph-rag-local-llm-check.mjs`
- neue Contracts, vorgeschlagen:
  - `data/contracts/knowledge-graph/rag-sources.v1.json`
  - `data/contracts/knowledge-graph/rag-evidence-package.v1.json`
  - `data/contracts/knowledge-graph/context-adapter-profiles.v1.json`
  - `data/contracts/knowledge-graph/local-llm-selection.v1.json`
- neue Tests, vorgeschlagen:
  - `tests/graph-rag-index.contract.test.mjs`
  - `tests/graph-rag-query.contract.test.mjs`
  - `tests/graph-rag-context-adapter.contract.test.mjs`
  - `tests/graph-rag-local-llm-selection.contract.test.mjs`

## Retrieval-Quellen

Primaere Startquellen:

- `docs/plaene/aktiv/`
- `docs/plaene/CHANGELOG.md`
- `docs/Umsetzungsplan.md`
- `docs/referenz/`
- `docs/qa/`
- `data/contracts/knowledge-graph/`
- `.agents/rules/`
- `.agents/workflows/`
- graph-gefiltert: ausgewaehlte `src/`, `tests/`, `scripts/`

Historische Quellen nur bedingt:

- `docs/plaene/alt/` nur bei Intent `historische Entscheidung`, Evidence-Abgleich oder wenn Graph, Changelog, Master-Index oder aktive Planquelle die Altquelle explizit referenziert.
- Archivierte Plaene duerfen keine Standard-Steuerquelle fuer aktuelle Umsetzung sein.
- Altplan-Treffer muessen im Evidence-Paket als `historical` markiert werden.

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

## Lokaler Context-Adapter

Der lokale Context-Adapter ist read-only und liefert ein Evidence-Paket. Er ist kein Codex-Subagent, kein Parallel-Agent und keine delegierte Agenteninstanz. Er darf nicht committen, schreiben, loeschen oder finale Architekturentscheidungen treffen.

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

## Lokale LLM-Auswahl und Installation

Die lokale LLM-Schicht ist ein optionales Beschleunigungs- und Verdichtungsmodul. Der Plan muss Auswahl, Installation und Smoke-Checks so konkret beschreiben, dass ein Arbeitsplatz reproduzierbar entscheiden kann, ob er Ollama, llama.cpp oder nur den regelbasierten Fallback nutzt.

Runtime-Prioritaet:

1. Ollama als primaerer MVP-Pfad, weil Modellverwaltung, lokaler HTTP-Zugriff und Smoke-Checks einfach sind.
2. llama.cpp als optionaler Low-Level-/Portable-Pfad fuer GGUF-Modelle.
3. anderer lokaler HTTP-/CLI-Adapter nur, wenn er denselben Profilvertrag erfuellt.
4. regelbasierter Fallback bleibt immer gueltig.

Auswahlkriterien fuer Modelle:

- lokal lauffaehig auf Zielhardware
- offline nutzbar nach Download
- stabile JSON-Ausgabe oder robust parsebarer Kurztext
- niedrige Latenz fuer Reranking
- ausreichende Kontextlaenge fuer Plan-/Changelog-Chunks
- geringe Halluzinationsneigung bei Extract-/Summary-Aufgaben
- klare Lizenz-/Nutzungsfreigabe fuer lokale Repo-Arbeit

Vorgeschlagene Modellprofile:

- `fast-rerank`: kleines, schnelles Modell; Aufgabe: Kandidaten sortieren und irrelevante Chunks verwerfen.
- `summary`: mittleres Modell; Aufgabe: 5-12 Chunks in kompakte, source-backed Aussagen verdichten.
- `fact-extract`: Modell mit guter JSON-Disziplin; Aufgabe: Claims, Unsicherheiten und Quellenhinweise extrahieren.
- `fallback-rulebased`: kein Modell; Aufgabe: Graph-Fakten, Heading-Matches, Pfadnaehe und einfache Textscores kombinieren.

Installations-/Smoke-Flow:

- Runtime-Erkennung: ist `ollama` oder ein konfigurierter llama.cpp-Endpunkt verfuegbar?
- Modell-Erkennung: sind die im Profil genannten Modelle lokal vorhanden?
- Minimalprobe: kurze Rerank-/Summary-Anfrage mit festem Fixture.
- JSON-/Output-Check: Antwort ist parsebar oder wird sauber als `adapter_unavailable`/`invalid_output` klassifiziert.
- Performance-Check: p95- oder Timeout-Grenze aus Profil einhalten; sonst Fallback.
- Ergebnis nur als lokaler Report unter `tmp/graph-rag/` oder als kompakte Evidence im aktiven Block, nicht als neue Wahrheit.

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
4. Lokalen Context-Adapter oder Fallback ausfuehren:
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

- Track-Regel: Contracts, Schemas und kleine deterministische Fixtures duerfen getrackt werden; Cache, Index und lokale Modellantworten bleiben standardmaessig untracked.
- Standard-Ablage fuer lokale Cache-/Index-Artefakte: `tmp/graph-rag/`.
- `tmp/graph-rag/` ist transient und darf keine zweite Wahrheit neben Graph, Master, aktiven Plaenen oder Changelog werden.
- Persistente Evidence entsteht nur im aktiven Block, passenden Report oder `docs/plaene/CHANGELOG.md`.
- Chunk-Cache nach Dateihash.
- Ranking-/Embedding-Cache nach Chunkhash und Query-Fingerprint.
- Summary-Cache nach `questionFingerprint + graphHits + chunkHashes`.
- Graph-Artefakte nur neu laden, wenn Hash geaendert.
- Lokale AI-Ausgaben immer an Quellhash binden.
- Cache darf keine Secrets oder unredigierte Exporte enthalten.

## Sicherheit

- `export-view` default-redacted verwenden.
- Keine `.env`, Secrets, Tokens, Credentials oder private Raw-Exports indexieren.
- Safety-Filter vor lokalem Context-Adapter und vor Evidence-Paket.
- Lokaler Context-Adapter read-only.
- `--unsafe-raw` darf nicht in Standardpfaden genutzt werden.
- Evidence-Pakete enthalten Quellen und Unsicherheiten, keine versteckten Vollkontexte.

## Definition of Done

- [ ] DoD.1 `graph:slo` ist repariert oder Query-IDs ohne SLO-Runner werden explizit und dokumentiert uebersprungen.
- [ ] DoD.2 Ein versionierter RAG-Quellenvertrag definiert erlaubte und ausgeschlossene Quellen.
- [ ] DoD.3 Ein deterministischer Markdown-/Plan-Chunker erzeugt stabile Chunk-IDs, Zeilenbereiche und Hashes.
- [ ] DoD.4 Graph-gesteuerte Kandidatenauswahl nutzt vorhandene Queries, bevor Text-Retrieval startet.
- [ ] DoD.5 Lokale LLM-Auswahl, Runtime-Profile, Modellrollen, Installationshinweise und Smoke-Checks sind versioniert beschrieben.
- [ ] DoD.6 Ein lokaler Context-Adapter ist optional verfuegbar und besitzt einen regelbasierten Fallback.
- [ ] DoD.7 Evidence-Paket `graph-rag.evidence-package.v1` ist schema-/contract-seitig beschrieben.
- [ ] DoD.8 Mindestens drei Referenzfragen liefern kompakte, source-backed Evidence-Pakete:
  - Warum kollidieren `V112` und `V96`?
  - Welche historischen Entscheidungen betreffen `SettingsManager`?
  - Welche Quellen erklaeren den `spawn` Critical Path?
- [ ] DoD.9 Token-/Kontextbudget ist messbar: Hauptmodell-Kontext enthaelt nur ausgewaehlte Chunks und kompakte Graph-Fakten.
- [ ] DoD.10 Safety-Filter verhindert Indexierung bekannter Secret-/PII-Muster und raw Graph Exports.
- [ ] DoD.11 Fallback-Test zeigt: ohne lokale LLM-Runtime und ohne lokalen Context-Adapter bleibt Graph-only Antwort moeglich.
- [ ] DoD.12 Contract-Tests decken Chunking, Evidence-Paket, LLM-Auswahlprofil, Install-Smoke-Fallback und mindestens eine Context-Adapter-Mock-Antwort ab.
- [ ] DoD.13 Abschluss-Gates bleiben gruen: `graph:check`, relevante Graph-RAG-Contract-Tests, `plan:check`, bei aktiver Uebernahme zusaetzlich Docs-/Graph-Sync nach Governance-Regel.

## Phasenplan

### 120.1 Stabilisierung der Graph-Basis
status: open
goal: Vor RAG-Erweiterung die vorhandenen Graph-Gates stabilisieren
output: reparierter SLO-Pfad und dokumentierte Ausgangsmetriken

- [ ] 120.1.1 `query-ops.v1.json` und `check-knowledge-graph-slos.mjs` synchronisieren; pro Query-ID explizit entscheiden, ob sie ein SLO-Budget braucht oder nur einen Contract-Smoke bekommt.
- [ ] 120.1.2 Score-Drop `-4.2` analysieren und als Ausgangsrisiko dokumentieren.
- [ ] 120.1.3 Nicht existierende File-Nodes und Scope-Kollisionen als bekannte Test-/Risiko-Faelle fuer Graph-RAG erfassen.

### 120.2 Quellenvertrag und Chunk-Index-MVP
status: open
goal: RAG-Quellen explizit, sicher und reproduzierbar erfassen
output: Quellenvertrag und lokaler Chunk-Index

- [ ] 120.2.1 Vor Index-Aufbau pruefen, ob `V116.3`, `V116.4` und `V119.1` fuer Kontext-/Archiv-/Evidence-Baseline ausreichend abgeschlossen oder bewusst als Restrisiko dokumentiert sind.
- [ ] 120.2.2 `data/contracts/knowledge-graph/rag-sources.v1.json` mit Includes, Excludes, Klassifikationen und Safety-Regeln anlegen.
- [ ] 120.2.3 Quellenprioritaet festschreiben: aktive Plaene, Master, Changelog und Referenzquellen zuerst; Altplaene nur historisch oder explizit graph-/changelog-referenziert.
- [ ] 120.2.4 `scripts/graph-rag-index.mjs` fuer Markdown-/Plan-Chunks mit stabilen IDs, Zeilenbereichen und Hashes implementieren.
- [ ] 120.2.5 Cache-/Index-Ablage unter `tmp/graph-rag/` mit untracked/transient-Regel absichern.
- [ ] 120.2.6 Generated Graph JSONs aus dem Volltextindex ausschliessen und nur ueber strukturierte Graph-Queries referenzieren.

### 120.3 Graph-gesteuerte Retrieval-Pipeline
status: open
goal: Erst harte Graph-Fakten, dann begrenztes Text-Retrieval
output: CLI fuer Graph-RAG-Fragen

- [ ] 120.3.1 Intent-Router fuer Plan-, Runtime-, Datei-, Test- und Architekturfragen als konservative Heuristik implementieren.
- [ ] 120.3.2 `scripts/graph-rag-query.mjs` anlegen: User-Frage -> Graph-Queries -> Kandidaten -> Chunks -> Evidence-Paket.
- [ ] 120.3.3 Referenzfragen fuer `scope-collisions`, `SettingsManager` und `spawn` als Contract-Fixtures ablegen.

### 120.4 Lokale LLM-Auswahl und Installation
status: open
goal: Lokale Modellnutzung reproduzierbar, optional und fallback-sicher machen
output: Auswahlvertrag, Installationshinweise und Smoke-Check

- [ ] 120.4.1 `data/contracts/knowledge-graph/local-llm-selection.v1.json` mit Runtime-Prioritaet, Modellprofilen, Hardware-Hinweisen, Timeouts und Fallback-Kriterien definieren.
- [ ] 120.4.2 Installationspfade fuer Ollama-first und llama.cpp-optional dokumentieren, inklusive Hinweis, dass Downloads/Installationen User-Aktion bleiben.
- [ ] 120.4.3 `scripts/graph-rag-local-llm-check.mjs` als lokalen Smoke-Check planen: Runtime erreichbar, Modell vorhanden, Mini-Fixture beantwortet, Output parsebar, Timeout eingehalten.
- [ ] 120.4.4 Modell-Auswahlkriterien pro Rolle festlegen: `fast-rerank`, `summary`, `fact-extract`, `fallback-rulebased`.
- [ ] 120.4.5 Fallback-Regel pruefbar machen: kein Modell, zu langsames Modell oder invalides JSON blockiert Graph-RAG nicht.

### 120.5 Lokaler Context-Adapter
status: open
goal: Lokale AI optional als Token-sparenden Vorfilter nutzen
output: Adapter mit Mock, Fallback und Safety-Grenzen

- [ ] 120.5.1 `data/contracts/knowledge-graph/context-adapter-profiles.v1.json` fuer Adapterprofile, Timeouts, Max-Input, Max-Output und Fallbacks definieren.
- [ ] 120.5.2 `scripts/graph-rag-context-adapter.mjs` als read-only Adapter fuer Rerank, Summary und Fact-Extraction implementieren.
- [ ] 120.5.3 Mock-/No-Agent-Modus fuer Tests und Arbeitsplaetze ohne lokale AI bereitstellen.

### 120.6 Evidence-Paket und Tests
status: open
goal: Antworten source-backed, kompakt und pruefbar machen
output: Contract-Tests und Budget-Signale

- [ ] 120.6.1 Evidence-Paket-Vertrag mit `claim`, `path`, `lineStart`, `lineEnd`, `confidence`, `uncertainties` validieren.
- [ ] 120.6.2 Contract-Tests fuer Chunking, Quellenfilter, Graph-Kandidatenauswahl, LLM-Auswahlprofil, Install-Smoke-Fallback und Mock-Adapter ergaenzen.
- [ ] 120.6.3 Kontextbudget messen und als Report ausgeben: Anzahl Kandidaten, selektierte Chunks, verworfene Chunks, Zeichen-/Token-Schaetzung.

### 120.7 Rollout und Workflow-Integration
status: open
goal: Graph-RAG als sparsamen Standardpfad fuer komplexe Repo-Fragen nutzbar machen
output: dokumentierte CLI-Nutzung und Governance-Evidence

- [ ] 120.7.1 Vor Rollout pruefen, ob `V119.1` die Evidence-Baseline fuer historische Planquellen ausreichend geklaert hat; sonst Rollout nur mit dokumentiertem Quellenrisiko.
- [ ] 120.7.2 Kurze Nutzungshinweise in passendem Referenz-/Plan-Kontext dokumentieren, ohne Masterplan direkt zu veraendern.
- [ ] 120.7.3 Graph-First-Regel konkretisieren: Graph-RAG fuer Erklaerfragen und historische Entscheidungen, reine Graph-Queries fuer harte Scope-/Impact-Fakten.
- [ ] 120.7.4 Abschluss-Evidence im aktiven Block und/oder `docs/plaene/CHANGELOG.md` hinterlegen.

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
- Lokale Modellwahl bindet den Plan an ein einzelnes Tool.
  - Gegenmassnahme: Ollama-first fuer MVP, llama.cpp optional, Profilvertrag und Fallback bleiben runtime-neutral.

## Dependencies

- hard: `V107.99` (Core-Graph und Query-Layer)
- hard: `V110.99` (Graph Ops-/Guard-Haertung)
- hard: `V111.99` (Adaptive Diagnose- und Entscheidungsintelligenz)
- phase gate: `V116.3` und `V116.4` vor `120.2`, sofern diese Phasen die Kontext-/Archivhygiene und Quellenautoritaet noch offen halten; andernfalls Risiko explizit im aktiven Block dokumentieren.
- phase gate: `V119.1` vor `120.6`, sofern Evidence-Baseline und historische Planquellen noch nicht nachgezogen sind; andernfalls Rollout nur mit dokumentiertem Quellenrisiko.
- soft: `V116.99` (Repo-Kontext-Reduktion; verbessert Nutzen und Index-Hygiene)
- soft: `V119.99` (Evidence-Remediation; verbessert historische Planquellen)

## AI-Ausfuehrungsmatrix

| Bereich | Klasse | Modus | Hinweis |
| --- | --- | --- | --- |
| Graph-/Coverage-Analyse | D0 | AUTO | Read-only Queries und Reports duerfen laufen. |
| Neue Intake-Datei | D2 | AUTO | Dieser Entwurf liegt unter `docs/plaene/neu/` und aendert keine aktive Quelle. |
| Aktive Planuebernahme | D3 | USER-GATE | Master-/Aktivplan-Aenderungen bleiben user-owned. |
| Lokaler Context-Adapter | D2 | REVIEW | Implementierung erlaubt nach Intake; kein Schreibrecht, kein Codex-Subagent, kein Parallel-Agent. |
| Safety-/Governance-Regeln | D3 | USER-GATE | Rule-/Workflow-Aenderungen nur nach Freigabe. |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V120`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V120.md`
- hard dependencies: `V107.99`, `V110.99`, `V111.99`
- phase gates: `V116.3`, `V116.4`, `V119.1` fuer Quellen-/Evidence-Baseline vor Index/Rollout pruefen
- soft dependencies: `V116.99`, `V119.99`
- Hinweis: Bis zur aktiven Uebernahme in `docs/Umsetzungsplan.md` und `docs/generated/knowledge-graph.json` sind Graph-Dependency-Signale zu `V120` nicht aussagekraeftig.
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
