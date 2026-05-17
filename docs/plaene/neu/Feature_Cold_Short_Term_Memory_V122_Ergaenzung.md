---
planned_block_id: V122
title: Cold Short-Term Memory mit 30 Chats fuer Repo-Agent-Memory
status: draft
priority: P2
owner: frei
target_plan_file: docs/plaene/aktiv/V122.md
depends_on:
  - V116.99
  - V117.99
  - V119.1
soft_depends_on:
  - V122.2
  - V122.3
  - V120.99
blocked_by: []
affected_area: repo-agent-memory-short-term-context
scope_files:
  - docs/plaene/neu/Feature_Cold_Short_Term_Memory_V122_Ergaenzung.md
  - docs/plaene/aktiv/V122.md
  - docs/agent-memory/README.md
  - docs/agent-memory/schema.json
  - docs/agent-memory/memory.jsonl
  - scripts/agent-memory.mjs
  - package.json
  - tests/agent-memory.contract.test.mjs
scope_reference_files:
  - AGENTS.md
  - .agents/rules/planning_and_governance.md
  - .agents/rules/token_efficiency_and_tools.md
  - .agents/workflows/plan.md
  - docs/Umsetzungsplan.md
  - docs/plaene/aktiv/V122.md
  - docs/generated/knowledge-graph.json
verification:
  - npm run memory:check
  - npm run test:agent-memory
  - npm run check:agent-context
  - npm run plan:check
  - npm run gates:pre-commit
updated_at: 2026-05-17
---

# Feature: Cold Short-Term Memory mit 30 Chats

## Kurzfassung

Dieser Draft ergaenzt V122 um ein lokales Kurzzeitgedaechtnis fuer die letzten 30 vollstaendigen Chats. Die Chats werden gespeichert und ueber kleine Capsules durchsuchbar gemacht, aber niemals automatisch in den Agent-Kontext geladen.

Der zentrale Schnitt:

- `short-term` ist kalt, lokal und transient.
- `long-term` bleibt das repo-native, kleine, pruefbare Memory unter `docs/agent-memory/`.
- Ein lokales Modell darf Capsules und Memory-Kandidaten vorschlagen.
- Deterministischer Code entscheidet ueber Schema, Duplikate, Sensitivity, Secret-Blocker und `proposed`-Schreibbarkeit.
- `verified` bleibt Review- oder Gate-Sache.

## Ziel

Agenten sollen bei Bedarf auf die letzten 30 Chats zurueckgreifen koennen, ohne dass diese Historie den Standardstart, die Promptgroesse oder die Governance-Quellen verschmutzt.

Das System dient drei Zielen:

1. Arbeitskontinuitaet bei laengeren Planungs- und Code-Sessions.
2. Besseres Vergessen durch kontrollierte Compaction statt roher Langzeitablage.
3. Schutz des Langzeitgedaechtnisses vor Zwischenideen, Fehlern, Logs und privaten Rohdaten.

## Nicht-Ziel

- Kein automatisches Laden der letzten 30 Chats beim Agentenstart.
- Kein Speichern vollstaendiger Chats in `docs/`.
- Kein automatisches `verified` im Langzeitgedaechtnis.
- Kein Ersatz fuer `AGENTS.md`, Rules, Workflows, Masterplan, aktive Blockplaene, Changelog oder Knowledge Graph.
- Keine semantische Suche, keine externe Vektordatenbank und kein Ruflo-Pfad im MVP.
- Keine Speicherung von Secrets, Tokens, Credentials, langen Logs, `.env`-Inhalten oder temporaeren Gedanken im Langzeitgedaechtnis.

## Speicherorte

Raw-Chats und Capsules sind lokale Arbeitsdaten und sollen nicht versioniert werden.

```text
%LOCALAPPDATA%/CurviosClash/agent-memory/
  config.json
  short-term/
    index.jsonl
    capsules/
      chat-2026-05-17-001.json
    chats/
      chat-2026-05-17-001.json
  compaction/
    queue.jsonl
    log.jsonl

docs/agent-memory/
  memory.jsonl
  schema.json
  namespaces.md
```

Fallback fuer CLI-/CI-nahe lokale Laeufe:

```text
.codex_tmp/agent-memory/
```

Dieser Fallback bleibt lokal, ignoriert und darf nicht als Evidence- oder Langzeitquelle verkauft werden.

## Datenmodell

### Raw-Chat

```json
{
  "id": "chat-2026-05-17-001",
  "created_at": "2026-05-17T16:10:00+02:00",
  "repo": "CurviosCLash",
  "source": "codex-thread",
  "messages": [],
  "touched_files": [],
  "sensitivity": "normal",
  "pinned": false
}
```

### Capsule

Capsules sind kleine Suchhuellen. Sie duerfen beim Suchen gelesen werden, enthalten aber keinen kompletten Chat.

```json
{
  "id": "chat-2026-05-17-001",
  "created_at": "2026-05-17T16:10:00+02:00",
  "title": "Cold Short-Term Memory planen",
  "topics": ["agent-memory", "short-term", "cold-load"],
  "touched_files": ["docs/plaene/aktiv/V122.md"],
  "decisions": [
    "30 Chats werden gespeichert, aber nicht automatisch geladen."
  ],
  "open_questions": [
    "Exakten lokalen Speicherpfad und optionale Verschluesselung klaeren."
  ],
  "sensitivity": "normal",
  "pinned": false,
  "raw_path": "short-term/chats/chat-2026-05-17-001.json"
}
```

### Langzeit-Kandidat

```json
{
  "id": "agent-memory-cold-short-term-30-v1",
  "namespace": "agent_memory",
  "kind": "decision",
  "tags": ["short-term", "cold-load", "ring-buffer"],
  "summary": "Kurzzeitgedaechtnis speichert lokal die letzten 30 vollstaendigen Chats, laedt sie aber nie automatisch in den Agent-Kontext. Zugriff erfolgt nur ueber Need-to-load, Capsules und progressive Loading.",
  "sources": [
    {
      "type": "short_term_chat",
      "id": "chat-2026-05-17-001"
    }
  ],
  "status": "proposed",
  "confidence": "high",
  "created_at": "2026-05-17"
}
```

## Startverhalten

Beim Agentenstart darf das Short-Term-Memory nicht automatisch geladen werden.

Standardstart:

```text
1. aktuelle User-Aufgabe
2. AGENTS.md
3. passende Rule
4. passender Workflow
5. Graph-/Plan-Kontext nur nach Bedarf
```

Nicht erlaubt:

```text
1. letzte 30 Chats ungefragt laden
2. Raw-Chats als Prompt-Anhang laden
3. proposed Memory wie verified Memory behandeln
```

## Need-to-load Policy

Short-Term darf nur genutzt werden, wenn mindestens eine Bedingung erfuellt ist:

- Der User fragt ausdruecklich nach frueherem Kontext oder Gedachtnis.
- Die aktuelle Aufgabe nennt ein Thema, das in Capsules exakt oder stark genug matcht.
- Die Aufgabe beruehrt Dateien, die in Capsules als `touched_files` stehen.
- Ein verified/proposed Memory verweist auf einen Short-Term-Chat als Quelle.
- Ein Handoff, Widerspruch, Fehlerbericht oder Gate braucht historische Begruendung.

Jede Ladung muss begruendet werden.

```json
{
  "chat_id": "chat-2026-05-17-001",
  "loaded_because": "topic_match",
  "matched_terms": ["agent-memory", "V122"],
  "loaded_scope": "capsule_only"
}
```

## Progressive Loading

Ladefolge:

```text
1. Index-Treffer
2. Capsule
3. relevante Ausschnitte
4. Vollchat nur bei explizitem Bedarf
```

Budgets fuer den MVP:

```text
max_active_chats = 30
max_pinned_chats = 5
max_loaded_chats = 3
max_loaded_capsules = 10
max_loaded_snippets = 8
max_loaded_chars = 12000
max_candidates_per_evicted_chat = 5
max_summary_chars = 400
default_long_term_status = proposed
auto_verify = false
```

## Ringpuffer und Compaction

Wenn ein neuer Chat gespeichert wird:

```text
1. Raw-Chat lokal speichern.
2. Capsule erzeugen.
3. Index aktualisieren.
4. Wenn aktive unpinned Chats > 30:
   - aeltester unpinned Chat aus active entfernen
   - in compaction/queue.jsonl verschieben
   - keine direkte Loeschung ohne Queue-/Log-Spur
```

Compaction:

```text
1. Queue-Eintrag lesen.
2. Extractor erzeugt 0..5 Kandidaten.
3. Validator prueft Kandidaten.
4. Gueltige Kandidaten werden als proposed in docs/agent-memory/memory.jsonl geschrieben.
5. compaction/log.jsonl dokumentiert store, reject, duplicate, conflict oder model-error.
6. Raw-Chat wird erst nach erfolgreicher Verarbeitung oder Retention geloescht.
```

## Sensitivity-Regeln

| Stufe | Capsule | Extractor | Langzeit-Kandidat | Raw-Retention |
| --- | --- | --- | --- | --- |
| `normal` | ja | ja | proposed erlaubt | Standard |
| `private` | ja, redacted | nur manuell | nicht automatisch | kurz |
| `sensitive` | minimal | nein | nein | kurz oder pinned-manual |
| `secret-risk` | nein oder redacted | nein | nein | sofort verwerfen/redigieren |

Secret-Risk Beispiele:

- Tokens, API-Keys, Private Keys
- `.env`-Werte
- Credentials
- lange Terminal-Logs mit potentiell privaten Pfaden oder Daten
- personenbezogene Rohdaten ohne expliziten Nutzen

## Lokales Modell

Das lokale Modell ist nur ein Vorschlaeger.

Erlaubte Aufgaben:

- Capsule-Titel erzeugen.
- Topics extrahieren.
- Entscheidungen, offene Fragen und beruehrte Dateien erkennen.
- Beim Verdrangen Langzeit-Kandidaten vorschlagen.

Nicht erlaubt:

- `verified` setzen.
- Canonical Sources ersetzen.
- Raw-Chats in `docs/` schreiben.
- Secrets redaktionell "sicher genug" erklaeren.
- Governance-Gates ueberschreiben.

Der Modellaufruf muss JSON-Schema oder Grammar nutzen. Bei Modellfehlern bleibt die Queue intakt; es wird kein kaputtes JSON in Langzeit geschrieben.

## CLI-Schnitt

Geplante Befehle:

```json
{
  "memory:short:add": "node scripts/agent-memory.mjs short-add",
  "memory:short:search": "node scripts/agent-memory.mjs short-search",
  "memory:short:get": "node scripts/agent-memory.mjs short-get",
  "memory:short:pin": "node scripts/agent-memory.mjs short-pin",
  "memory:short:forget": "node scripts/agent-memory.mjs short-forget",
  "memory:short:compact": "node scripts/agent-memory.mjs short-compact",
  "memory:short:audit": "node scripts/agent-memory.mjs short-audit"
}
```

Suchbefehle lesen default nur Index und Capsules:

```text
npm run memory:short:search -- --topic agent-memory
npm run memory:short:search -- --file docs/plaene/aktiv/V122.md
npm run memory:short:get -- --id chat-2026-05-17-001 --scope capsule
npm run memory:short:get -- --id chat-2026-05-17-001 --scope snippets
```

Vollchat-Ladung braucht einen expliziten Scope:

```text
npm run memory:short:get -- --id chat-2026-05-17-001 --scope full --reason "User requested prior chat context"
```

## Canonical-Check

Vor jedem Langzeit-Kandidaten prueft der Validator:

- Steht die Aussage bereits in `AGENTS.md`, Rules, Workflows, aktivem V122, Changelog oder Knowledge Graph?
- Ist sie nur eine temporare Arbeitsnotiz?
- Widerspricht sie einem verified Memory?
- Widerspricht sie einer kanonischen Quelle?

Ergebnisse:

```text
store-proposed
reject-duplicate
reject-canonical-already
reject-temporary
reject-sensitive
mark-conflict
model-error
schema-error
```

## Decision-Klasse und Governance

Dieser Draft selbst ist ein `D2`-Plan-Draft in `docs/plaene/neu/`.

Die spaetere Umsetzung hat gemischte Klassen:

| Bereich | Klasse | Gate |
| --- | --- | --- |
| Lokaler Short-Term-Speicher unter AppData oder `.codex_tmp` | D1/D2 | begrenzte Implementierung |
| `docs/agent-memory` Schema-/README-Erweiterung | D2/D3 | Review, weil dauerhafte Kontextquelle |
| Aktiver V122-Plan oder `.agents/rules/*` | D3 | User-Gate |
| Automatische MCP-/Ruflo-Anbindung | D3/D4 | User-Gate |
| Loeschen/versionierte Moves | D4 | User-Gate + Recovery |

## Definition of Done

- [ ] DoD.1 Short-Term-Memory ist als kalter lokaler Speicher beschrieben: 30 Chats, kein Autoload, keine Raw-Chats in `docs/`.
- [ ] DoD.2 Raw-Chat-, Capsule-, Index-, Queue- und Log-Formate sind dokumentiert und validierbar.
- [ ] DoD.3 `memory:short:search` liest default nur Index/Capsules.
- [ ] DoD.4 `memory:short:get` laedt Vollchats nur mit explizitem `--scope full` und `--reason`.
- [ ] DoD.5 Ringpuffer verdrangt nur unpinned Chats und verschiebt sie zuerst in die Compaction-Queue.
- [ ] DoD.6 Compaction erzeugt maximal `proposed` Langzeit-Kandidaten.
- [ ] DoD.7 Secret-/Sensitivity-Regeln verhindern Extractor- und Langzeit-Schreibpfade fuer sensible Inhalte.
- [ ] DoD.8 Load-Log oder CLI-Ausgabe nennt fuer jeden geladenen Chat den Grund und Scope.
- [ ] DoD.9 Tests decken Ringpuffer, Pins, Sensitivity, Modellfehler, Duplikate, Konflikte und `proposed`-Only ab.
- [ ] DoD.10 Abschlussnotiz stellt klar: Short-Term ist lokaler Arbeitskontext, nicht kanonische Wahrheit.

## Phasen

### 122.STM.1 Scope und Speicherentscheidung
status: open
goal: Cold Short-Term so abgrenzen, dass kein Prompt-Autoload und keine zweite Wahrheit entsteht
output: finaler Speicher- und Gate-Zuschnitt

- [ ] 122.STM.1.1 Lokalen Speicherpfad entscheiden: `%LOCALAPPDATA%/CurviosClash/agent-memory/` plus `.codex_tmp`-Fallback.
- [ ] 122.STM.1.2 Festlegen, dass Raw-Chats nie in `docs/` oder versionierte Evidence-Pfade geschrieben werden.
- [ ] 122.STM.1.3 Need-to-load-Regeln und Ladebudgets finalisieren.
- [ ] 122.STM.1.4 V122-Anschluss klaeren: als neue Unterphase nach `122.3` oder als Folgeblock nach CLI-MVP.

### 122.STM.2 Storage, Index und Capsules
status: open
goal: Vollchats speichern, aber nur kleine Suchhuellen standardmaessig lesen
output: lokales Datenmodell und CLI-Basics

- [ ] 122.STM.2.1 Raw-Chat-Schema definieren.
- [ ] 122.STM.2.2 Capsule-Schema definieren.
- [ ] 122.STM.2.3 Index- und Pfadstruktur implementieren.
- [ ] 122.STM.2.4 Pinning und Retention-Regeln implementieren.

### 122.STM.3 Ringpuffer und Compaction-Queue
status: open
goal: Mehr als 30 Chats sicher verdrangen, ohne ungeprueften Verlust
output: Eviction, Queue und Log

- [ ] 122.STM.3.1 `short-add` schreibt Chat, Capsule und Index.
- [ ] 122.STM.3.2 Der 31. unpinned Chat verschiebt den aeltesten unpinned Chat in die Queue.
- [ ] 122.STM.3.3 Queue-Eintraege bleiben bei Modell-/Validatorfehlern retry-faehig.
- [ ] 122.STM.3.4 `compaction/log.jsonl` dokumentiert Ergebnis und Ablehnungsgrund.

### 122.STM.4 Extractor und Validator
status: open
goal: Lokales Modell nur als Kandidatenquelle nutzen
output: proposed-only Langzeit-Schreibpfad

- [ ] 122.STM.4.1 JSON-Schema fuer Capsule- und Candidate-Output erzwingen.
- [ ] 122.STM.4.2 Secret-, Sensitivity-, Laengen-, Namespace- und Source-Checks implementieren.
- [ ] 122.STM.4.3 Duplikat- und Canonical-Checks gegen bestehendes Memory und zentrale Quellen implementieren.
- [ ] 122.STM.4.4 Konflikte markieren statt still ueberschreiben.

### 122.STM.5 Progressive Loading
status: open
goal: Alte Chats nur begruendet und stufenweise laden
output: search/get mit Scope- und Reason-Pflicht

- [ ] 122.STM.5.1 `short-search` durchsucht nur Index/Capsules.
- [ ] 122.STM.5.2 `short-get --scope capsule|snippets|full` implementieren.
- [ ] 122.STM.5.3 `--scope full` braucht `--reason`.
- [ ] 122.STM.5.4 Load-Budgets und Load-Log durchsetzen.

### 122.STM.6 Tests und Gates
status: open
goal: Cold Short-Term ist robust gegen Datenverlust, Secrets und Kontextaufblaehung
output: Contract-Tests und Check-Erweiterung

- [ ] 122.STM.6.1 Test: 30 Chats bleiben aktiv, der 31. verdrangt den aeltesten unpinned Chat.
- [ ] 122.STM.6.2 Test: pinned Chat bleibt erhalten und zaehlt separat gegen Pin-Budget.
- [ ] 122.STM.6.3 Test: `sensitive` und `secret-risk` blockieren Extractor und Langzeit-Kandidaten.
- [ ] 122.STM.6.4 Test: Modellfehler schreibt kein kaputtes JSON und laesst Queue retry-faehig.
- [ ] 122.STM.6.5 Test: Langzeit-Kandidaten werden nur `proposed`.
- [ ] 122.STM.6.6 Test: Vollchat-Ladung ohne `--reason` wird abgelehnt.

### 122.STM.99 Abschluss-Gate
status: open
goal: Kurzzeitgedaechtnis ist kalt, lokal, suchbar und sicher begrenzt
output: uebergabefaehiger Cold-Memory-Slice

- [ ] 122.STM.99.1 Alle STM-Phasen sind abgeschlossen oder begruendet vertagt.
- [ ] 122.STM.99.2 `npm run memory:check` ist gruen.
- [ ] 122.STM.99.3 `npm run test:agent-memory` ist gruen, falls STM-Tests eingefuehrt wurden.
- [ ] 122.STM.99.4 `npm run check:agent-context` und `npm run plan:check` sind gruen.
- [ ] 122.STM.99.5 Abschlussnotiz nennt: keine automatische Prompt-Erweiterung, Raw-Chats bleiben lokal, Langzeit bleibt proposed/verified/deprecated.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| Agent laedt doch alle 30 Chats | hoch | Default-Suche nur Index/Capsules; Vollchat nur mit Scope und Reason |
| Raw-Chats landen im Repo | hoch | Lokaler Speicherpfad, `.codex_tmp`-Fallback, Checks gegen `docs/`-Raw-Chat-Pfade |
| Langzeit wird durch Zwischenideen verschmutzt | hoch | proposed-only, Canonical-Check, Duplikat-Check, Review fuer verified |
| Secrets werden extrahiert | hoch | Sensitivity-Stufen, Secret-Scan, Extractor-Block fuer secret-risk |
| Modellfehler loescht wichtige Chats | mittel | Compaction-Queue mit Retry, Raw-Chat erst nach Log/Retention entfernen |
| Pins blockieren den Ringpuffer | mittel | separates Pin-Budget und Audit-Warnung |
| Capsules werden zu lang | mittel | Laengenlimits und Capsule-Schema |
| Lokaler Speicher waechst unbegrenzt | mittel | Retention, Queue-Limit, Audit-Befehl |
| Short-Term wird als kanonische Quelle missverstanden | mittel | README/Rule-Hinweis: Short-Term ist Arbeitskontext, keine Wahrheit |

## Erfolgsmessung

| Signal | Ziel |
| --- | --- |
| Standard-Agentstart | keine Short-Term-Chats geladen |
| Suche | Index/Capsule-Treffer reichen fuer erste Orientierung |
| Ladebudget | maximal wenige gezielte Chats/Ausschnitte |
| Langzeitqualitaet | nur kurze proposed-Eintraege aus stabilen Punkten |
| Safety | sensitive/secret-risk erzeugt keine Langzeit-Kandidaten |
| Robustheit | Modellfehler zerstoert keine Queue und kein Memory |

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Ziel-Block: `docs/plaene/aktiv/V122.md`
- Vorschlag: als V122-Unterphase `122.STM` oder als kleiner Folgeblock nach `122.3` aufnehmen.
- Hard dependencies: `V116.99`, `V117.99`, `V119.1`
- Soft dependencies: `V122.2`, `V122.3`; `V120.99` nur fuer spaetere semantische Suche oder RAG-gestuetzte Ranking-Pfade.
- Manuelle Uebernahme erforderlich: Dieser Draft darf nicht automatisch in den Master oder aktiven V122-Plan uebernommen werden.
