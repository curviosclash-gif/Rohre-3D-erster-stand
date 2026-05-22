---
planned_block_id: V136
plan_file: docs/plaene/aktiv/V136.md
target_master: docs/Umsetzungsplan.md
intake_status: draft
decision_class: D3
title: Portabler Knowledge-Core fuer Memory und RAG
priority: P1
owner: frei
depends_on:
  - V116.99
  - V117.99
soft_depends_on:
  - V119.1
  - V120.2
  - V120.3
  - V120.6
  - V122.2
  - V122.3
scope_files:
  - docs/plaene/neu/Feature_Portabler_Knowledge_Core_Memory_RAG_V136.md
  - docs/plaene/aktiv/V120.md
  - docs/plaene/aktiv/V122.md
  - docs/plaene/CHANGELOG.md
  - data/contracts/knowledge-core/source-manifest.v1.json
  - data/contracts/knowledge-core/knowledge-pack.v1.json
  - data/contracts/knowledge-core/evidence-package.v1.json
  - data/contracts/knowledge-core/memory-item.v1.json
  - scripts/knowledge-core-index.mjs
  - scripts/knowledge-core-query.mjs
  - scripts/knowledge-core-memory.mjs
  - scripts/knowledge-core-check.mjs
  - tests/knowledge-core-index.contract.test.mjs
  - tests/knowledge-core-memory.contract.test.mjs
  - tests/knowledge-core-query.contract.test.mjs
updated_at: 2026-05-22
---

# Feature: Portabler Knowledge-Core fuer Memory und RAG

## Kurzfassung

Dieser Plan trennt die wiederverwendbare Memory-/RAG-Konstruktion vom Curvios-spezifischen Wissen. Ziel ist eine kleine, repo-taugliche Engine, die mit unterschiedlichen Wissenspaketen betrieben werden kann:

```text
Knowledge-Core
  + Curvios-Knowledge-Pack
  + anderes Repo-Knowledge-Pack
  + spaeter optional private Docs / Export-Pack
```

Curvios bleibt der erste produktive Corpus und Testfall. Die Engine darf aber keine Curvios-Planlogik, keine VXX-Annahmen und keine Spielarchitektur hart einkompilieren. Anderes Wissen wird ueber Manifest, Quellenfilter, Memory-Namespace und Golden Questions geladen.

## Ziel

- Einen portablen Kern fuer Source Manifest, Chunk-Index, Query/Retrieval, Evidence-Pakete und kuratiertes Memory definieren.
- Curvios-Wissen als erstes `knowledge-pack` modellieren, nicht als Engine-Default.
- Weitere Wissenskoerper durch eigene Manifeste und Namespaces anschliessbar machen.
- Memory nur source-backed, versioniert und pruefbar speichern.
- RAG-Indexe als rebuildbare Caches behandeln, nicht als neue Wahrheit.
- V120 Graph-RAG und V122 Agent-Memory so ausrichten, dass sie denselben Kern nutzen koennen.

## Nicht-Ziel

- Kein Ersatz von `AGENTS.md`, Rules, Workflows, Masterplan, aktiven VXX-Dateien oder Knowledge Graph.
- Keine automatische Uebernahme fremden Wissens ohne Quellenmanifest.
- Keine Chatlog-Speicherung als Memory.
- Keine Embedding-/Vektor-Datenbank als Pflicht fuer den MVP.
- Keine Cloud-AI-Pflicht und keine automatische Installation lokaler Modelle.
- Keine Rueckschreibung in fremde Repos ohne explizites User-Gate.
- Kein Big-Bang-Umbau von V120 oder V122; dieser Plan definiert zuerst die neutrale Schnittstelle.

## Ausgangslage

V120 plant Graph-RAG fuer Curvios mit lokalem Context-Adapter. V122 plant repo-natives Agent-Memory und optionale Ruflo-Orchestrierung. Beide Plaene sind fachlich richtig, aber sie koennen zu stark an Curvios-Quellen, VXX-Blocklogik und lokale Governance gekoppelt werden.

Dieser Draft schiebt eine kleine portable Schicht dazwischen:

```text
source manifest -> chunk index -> retrieval -> evidence package -> answer/memory
```

Der entscheidende Unterschied: Nicht die Engine weiss, was Curvios ist. Das Knowledge-Pack weiss es.

## Zielarchitektur

```text
data/contracts/knowledge-core/
  source-manifest.v1.json
  knowledge-pack.v1.json
  evidence-package.v1.json
  memory-item.v1.json

docs/knowledge-packs/
  curvios/
    sources.json
    excludes.json
    golden-questions.json
    retrieval-profile.json
  <anderes-wissen>/
    sources.json
    excludes.json
    golden-questions.json
    retrieval-profile.json

tmp/knowledge-core/
  <pack>/
    chunks.jsonl
    index.json
    query-report.json

docs/agent-memory/
  memory.jsonl
  namespaces.md
  schema.json
```

Der Pfad unter `tmp/knowledge-core/` ist transient und rebuildbar. Dauerhafte Wahrheit liegt in den Quellen, Contracts und reviewed Memory-Eintraegen.

## Memory-Vertrag

Ein Memory-Eintrag ist keine Notiz, sondern ein belegter Claim:

```json
{
  "id": "mem_...",
  "namespace": "curvios.governance",
  "status": "proposed|verified|deprecated",
  "claim": "Kurzer wiederverwendbarer Sachverhalt.",
  "sources": [
    {
      "path": "docs/plaene/aktiv/V120.md",
      "lineStart": 120,
      "lineEnd": 160,
      "hash": "..."
    }
  ],
  "confidence": "high|medium|low",
  "tags": ["rag", "memory", "governance"],
  "created_at": "2026-05-22",
  "reviewed_at": null,
  "stale_after": null,
  "delete_or_deprecate_criterion": "Quelle ersetzt oder Claim widersprochen."
}
```

Regeln:

- `proposed` darf gesucht, aber nicht als harte Wahrheit benutzt werden.
- `verified` braucht mindestens eine konkrete Quelle.
- `deprecated` bleibt historisch lesbar, gewinnt aber nie gegen aktive Quellen.
- Secrets, Tokens, persoenliche Rohlogs und fluessige Gedankenspuren sind verboten.

## Knowledge-Pack-Vertrag

Ein Knowledge-Pack beschreibt, welches Wissen geladen wird:

```json
{
  "id": "curvios",
  "title": "CurviosClash Repo Knowledge",
  "sourcePriority": [
    "AGENTS.md",
    ".agents/rules/",
    ".agents/workflows/",
    "docs/Umsetzungsplan.md",
    "docs/plaene/aktiv/",
    "docs/plaene/CHANGELOG.md",
    "docs/referenz/"
  ],
  "excludes": [
    ".env*",
    "node_modules/",
    "dist/",
    "tmp/",
    "logs/",
    "test-results/"
  ],
  "namespaces": [
    "curvios.governance",
    "curvios.architecture",
    "curvios.product"
  ]
}
```

Andere Repos oder Wissensbestaende bekommen eigene Packs. Dadurch bleibt die Engine gleich, waehrend Quellen, Begriffe, Prioritaeten und Memory-Namespace wechseln.

## Phasen

### 136.1 Abgrenzung gegen V120 und V122
status: open
goal: Portablen Kern als Vor- oder Begleitschnitt sauber von Graph-RAG und Agent-Memory trennen
output: Handoff-Regel fuer V120/V122 und Scope-Grenze fuer V136

- [ ] 136.1.1 V120/V122 lesen und markieren, welche Teile Engine-neutral sind und welche Curvios-spezifisch bleiben.
- [ ] 136.1.2 Entscheiden, ob V136 vor V120/V122 als kleiner Kernel-Slice startet oder als Acceptance-Ergaenzung in V120/V122 eingeht.
- [ ] 136.1.3 D3-Blast-Radius dokumentieren: Contracts, Scripts, Memory-Docs, V120/V122-Abgleich, keine Master-Aufnahme ohne User-Intake.
- [ ] 136.1.4 Handoff-Regel festlegen: V120/V122 duerfen Curvios-Pack-Defaults nutzen, aber keine Curvios-Pfade in den Knowledge-Core hart einkompilieren.

### 136.2 Source-Manifest und Knowledge-Pack-Contracts
status: open
goal: Wissenskoerper austauschbar machen
output: Versionierte Contracts fuer Quellen, Excludes, Namespaces und Golden Questions

- [ ] 136.2.1 `source-manifest.v1.json` definieren: Quellen, Excludes, Source-Prioritaet, erlaubte Dateitypen, Hash-Regel.
- [ ] 136.2.2 `knowledge-pack.v1.json` definieren: Pack-ID, Titel, Namespaces, Source-Priority, Retrieval-Profil, Golden Questions.
- [ ] 136.2.3 Curvios-Pack als erstes Beispiel planen oder anlegen, ohne andere Packs vorauszusetzen.
- [ ] 136.2.4 Fremdwissen-Pack als Fixture vorbereiten: minimaler Markdown/JSON-Corpus ohne Curvios-Begriffe.

### 136.3 Chunk-Index und Cache-Grenze
status: open
goal: Rebuildbaren, quellennahen Index statt neuer Wahrheit schaffen
output: `knowledge-core-index` mit stabilen Chunk-IDs, Hashes und Zeilenbereichen

- [ ] 136.3.1 Chunk-ID-Regel festlegen: Pack-ID, Source-Pfad, Heading-Pfad, Zeilenfenster, Content-Hash.
- [ ] 136.3.2 `scripts/knowledge-core-index.mjs` als read-only Builder fuer `tmp/knowledge-core/<pack>/` implementieren.
- [ ] 136.3.3 Secrets-/Exclude-Guard einbauen: `.env`, Tokens, lokale Logs, tmp und ausgeschlossene Pfade blockieren.
- [ ] 136.3.4 Contract-Test fuer deterministische Chunks und Cache-Rebuild ergaenzen.

### 136.4 Memory-Schema und Namespace-Wechsel
status: open
goal: Memory als portablen, source-backed Hinweisindex definieren
output: Memory-Item-Contract und CLI-Grundfunktionen

- [ ] 136.4.1 `memory-item.v1.json` mit `namespace`, `status`, `claim`, `sources`, `confidence`, `tags`, `stale_after` und Deprecation-Kriterium definieren.
- [ ] 136.4.2 `scripts/knowledge-core-memory.mjs` fuer `search`, `get`, `add-proposed`, `verify`, `deprecate`, `check` planen oder implementieren.
- [ ] 136.4.3 Namespace-Regel dokumentieren: Curvios-Memory darf nicht automatisch in fremde Packs einfliessen.
- [ ] 136.4.4 Contract-Test fuer proposed/verified/deprecated, Secret-Blocker und Source-Pruefung ergaenzen.

### 136.5 Retrieval und Evidence-Paket
status: open
goal: Antworten und Agent-Kontext nur mit belegten Quellenpaketen erzeugen
output: Query-CLI mit Evidence-Paket statt freiem Volltext-Kontext

- [ ] 136.5.1 `evidence-package.v1.json` definieren: `claim`, `path`, `lineStart`, `lineEnd`, `confidence`, `uncertainties`, `packId`.
- [ ] 136.5.2 `scripts/knowledge-core-query.mjs` als konservative Retrieval-CLI implementieren: Pack -> Query -> Kandidaten -> Evidence-Paket.
- [ ] 136.5.3 RAG optional halten: deterministisches Retrieval muss ohne Embeddings und ohne lokales Modell funktionieren.
- [ ] 136.5.4 Golden Questions fuer Curvios und Fremdwissen-Fixture absichern.

### 136.6 Curvios-Pack als Pilot
status: open
goal: Bestehende Curvios-Governance als erstes Pack nutzen, aber nicht in die Engine backen
output: Curvios-Knowledge-Pack mit klaren Quellen und Excludes

- [ ] 136.6.1 Curvios-Quellen priorisieren: AGENTS, Rules, Workflows, Master, aktive Plaene, Changelog, Referenzdocs, Graph-Queries.
- [ ] 136.6.2 Curvios-Excludes spiegeln: `tmp/`, `logs/`, `dist/`, `test-results/`, `.codex_tmp/`, Secrets, generierte Langreports.
- [ ] 136.6.3 Mindestens fuenf Golden Questions definieren: Governance, Graph, Planstatus, Architektur, Memory-Grenze.
- [ ] 136.6.4 Query-Ergebnisse gegen direkte Source-Reads plausibilisieren.

### 136.7 Fremdwissen-Pilot
status: open
goal: Beweisen, dass die Konstruktion mit anderem Wissen funktioniert
output: Zweites Knowledge-Pack ohne Curvios-Abhaengigkeit

- [ ] 136.7.1 Kleines neutrales Test-Knowledge-Pack anlegen: 3-5 Markdown/JSON-Quellen, eigene Namespaces, eigene Golden Questions.
- [ ] 136.7.2 Sicherstellen, dass Curvios-spezifische Regeln, VXX-Begriffe und Spielarchitektur dort nicht als Default auftauchen.
- [ ] 136.7.3 Query- und Memory-CLI mit `--pack <id>` testen.
- [ ] 136.7.4 Ergebnis dokumentieren: Welche Teile sind wirklich portabel, welche bleiben repo-adapter-spezifisch.

### 136.99 Abschluss-Gate
status: open
goal: Portabler Knowledge-Core ist als Kernel oder als V120/V122-Handoff entscheidbar
output: Abschlussnotiz mit Nutzwert, Grenzen und Intake-Entscheidung

- [ ] 136.99.1 Alle Phasen sind erledigt oder mit bewusstem Handoff an V120/V122 dokumentiert.
- [ ] 136.99.2 `npm run plan:check` ist gruen.
- [ ] 136.99.3 Relevante Knowledge-Core-Contracttests sind gruen, falls Scripts/Contracts eingefuehrt wurden.
- [ ] 136.99.4 `npm run check:agent-context` ist gruen, falls Memory-/Agent-Kontext-Regeln beruehrt wurden.
- [ ] 136.99.5 Bei Graph-/Docs-/Governance-Scope ist `npm run gates:pre-commit` gruen oder ein Graph-/Fremddiff-Blocker ist dokumentiert.
- [ ] 136.99.6 Abschlussnotiz nennt: Engine-vs-Pack-Grenze, Curvios-Pack-Status, Fremdwissen-Pilot, nicht gelaufene Tests, Restrisiko.

## Definition of Done

- [ ] DoD.1 Ein Knowledge-Pack kann Quellen, Excludes, Namespaces und Golden Questions definieren, ohne Engine-Code zu aendern.
- [ ] DoD.2 Curvios ist nur ein Pack/Adapter, nicht die harte Annahme des Knowledge-Core.
- [ ] DoD.3 Memory-Eintraege sind source-backed, statusmarkiert und pruefbar.
- [ ] DoD.4 Query-Ergebnisse liefern Evidence-Pakete mit Quelle, Zeilenbereich, Confidence und Unsicherheiten.
- [ ] DoD.5 Ein zweites Fremdwissen-Pack laeuft ohne Curvios-spezifische Defaults.
- [ ] DoD.6 V120/V122-Handoff ist dokumentiert: welche Bausteine sie wiederverwenden, welche bewusst lokal bleiben.

## Risiken

| Risiko | Wirkung | Gegenmassnahme |
| --- | --- | --- |
| Curvios-Wissen sickert in die Engine | Andere Repos bekommen falsche Defaults | Pack-ID, Namespace und Golden Questions strikt trennen |
| Memory wird Schattenwahrheit | Agenten glauben alte Claims trotz neuer Quellen | `verified` braucht Sources; aktive Quellen gewinnen immer; Deprecation statt Loeschung |
| RAG erzeugt unbelegte Antworten | Falsche Sicherheit | Evidence-Paket-Vertrag, Confidence, Uncertainties, source-backed Output |
| Index wird dauerhafte Wahrheit | Drift und Cache-Vertrauen | Index nur unter `tmp/`, rebuildbar, Hash-Checks |
| Zu viel auf einmal | V120/V122 werden blockiert | Kernel-MVP klein halten: Contracts, Chunker, Query, Memory-Check |
| Fremde Wissensquellen enthalten Secrets | Datenschutz-/Security-Risiko | Exclude-Guard, Secret-Pattern, keine automatische Aufnahme |

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V136`
- Geplante aktive Detaildatei: `docs/plaene/aktiv/V136.md`
- Entscheidungsklasse: `D3`, weil dauerhafte Memory-/RAG-Vertraege, Agent-Kontext und V120/V122-Handoff Governance-nahe Flaechen beruehren.
- Harte Dependencies: `V116.99`, `V117.99`
- Soft Dependencies: `V119.1`, `V120.2`, `V120.3`, `V120.6`, `V122.2`, `V122.3`
- Manuelle Uebernahme erforderlich: ja

Empfohlener Startzeitpunkt: nach `V125.99` und sauberem Graph-/Plan-Signal als kleiner Kernel-Slice. Wenn V120/V122 vorher starten, sollte mindestens die Engine-vs-Pack-Grenze aus 136.1 als Acceptance-Kriterium in diese Bloecke uebernommen werden.
