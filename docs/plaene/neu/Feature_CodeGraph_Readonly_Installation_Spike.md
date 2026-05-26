---
title: CodeGraph Read-only Installationsspike fuer Graph-RAG
status: superseded
planned_block_id: V137
plan_file: docs/plaene/aktiv/V137.md
target_master: docs/Umsetzungsplan.md
intake_status: adopted-open
superseded_by: docs/plaene/aktiv/V137.md
archive_read_rule: only-for-history-or-intake-trace
decision_class: D4
priority: P2
owner: frei
affected_area: codegraph-readonly-installation-spike
depends_on:
  - V107.99
  - V110.99
  - V111.99
soft_depends_on:
  - V120.1
  - V122.5
  - V124.1
scope_files:
  - docs/plaene/neu/Feature_CodeGraph_Readonly_Installation_Spike.md
  - .gitignore
  - docs/plaene/aktiv/V120.md
  - docs/plaene/aktiv/V122.md
  - docs/plaene/CHANGELOG.md
scope_reference_files:
  - AGENTS.md
  - .agents/rules/planning_and_governance.md
  - .agents/rules/token_efficiency_and_tools.md
  - docs/Umsetzungsplan.md
  - docs/plaene/aktiv/V94.md
  - docs/plaene/aktiv/V107.md
  - docs/plaene/aktiv/V110.md
  - docs/plaene/aktiv/V111.md
  - docs/plaene/aktiv/V120.md
  - docs/plaene/aktiv/V122.md
  - docs/plaene/aktiv/V124.md
verification:
  - npm run agent:preflight -- --workflow=plan --decision=D2 --evidence="git status --short -> PASS (clean before draft)" --known-uncommitted=none
  - npm run plan:check
  - npm run graph:check
updated_at: 2026-05-26
---

# Feature: CodeGraph Read-only Installationsspike fuer Graph-RAG

## Kurzfassung

CodeGraph soll nicht als Ersatz fuer den bestehenden Curvios-Wissensgraphen installiert werden, sondern als optionaler, read-only Hilfsindex fuer generische Code-Navigation evaluiert werden.

Der Curvios-Wissensgraph bleibt kanonisch fuer Planstatus, Dependencies, Locks, Scope-Dateien, Critical Paths, Produktsemantik, Testauswahl und Evidence. CodeGraph darf nur Kandidaten fuer Symbol-, Caller-/Callee-, Trace- und Implementierungsfragen liefern. Jede Aussage, die Plan-, Runtime-, Test- oder Governance-Wirkung beansprucht, muss gegen Curvios-Graph, Quelle oder Test-Evidence gegengeprueft werden.

## Ziel

- CodeGraph sicher und reversibel als lokalen read-only Spike einplanen.
- Vor jeder Installation klaeren, welche Dateien, User-Configs und lokalen Caches entstehen.
- Den Nutzen gegen bestehende Curvios-Queries messen, statt eine zweite Wahrheit aufzubauen.
- Eine klare Go/No-Go-Entscheidung fuer V120/V122 vorbereiten:
  - behalten als optionaler Candidate Provider,
  - nur manuell/CLI nutzen,
  - oder sauber verwerfen.

## Nicht-Ziel

- Kein Ersatz von `scripts/query-knowledge-graph.mjs`.
- Keine automatische MCP-Registrierung ohne explizites User-Gate.
- Keine globale Installation oder PowerShell-Pipe-Installation als Default.
- Keine Schreibtools, keine Agent-Orchestrierung und keine Rueckschreibung in Curvios-Plans, Memory oder Graph.
- Keine Aufnahme von `.codegraph/`, lokalen SQLite-Dateien, generierten CodeGraph-Reports oder Agent-Config-Dumps in Git.
- Kein Anspruch, dass CodeGraph Curvios-Produktsemantik, Locks oder User-Gates kennt.

## Einordnung

Primaere Andockstelle ist `V120` als Graph-RAG-/Context-Adapter-Folge: CodeGraph kann dort als zusaetzliche Kandidatenquelle fuer Code-Symbole und Callpfade dienen.

Sekundaere Andockstelle ist `V122`, falls spaeter ein read-only MCP-Tool fuer Agent-Kontext sinnvoll wird. Dann gilt die V122-Regel: erster MCP nur read-only, Registrierung nur nach User-Gate, Ergebnisse bleiben Hinweise.

`V124` bleibt der bessere Zielblock fuer produktsemantische Verbesserungen im Curvios-Graph. CodeGraph darf dort nur technische Code-Naehe liefern, keine Produktbedeutung.

## Installation Strategy

### Grundsatz

Die erste Evaluation laeuft ohne dauerhafte Agent-Registrierung. Bevor `codegraph init` im Hauptrepo ausgefuehrt wird, muss `.codegraph/` als lokaler Indexpfad in `.gitignore` abgesichert sein oder ein gleichwertiger No-Commit-Schutz dokumentiert werden.

Bevor ein Installer mit Schreibwirkung laeuft, wird ein aktueller Freshness-Check der offiziellen CodeGraph-Doku gemacht und die konkrete Version festgehalten.

### Erlaubte Reihenfolge

1. Read-only Freshness:
   - Offizielle CodeGraph-README/Doku erneut pruefen.
   - Version, Installationsweg, MCP-Tools und erwartete Datei-/Config-Wirkung notieren.

2. Repo-Schutz:
   - `.gitignore` um `.codegraph/` ergaenzen oder begruenden, warum der Index ausschliesslich ausserhalb des Repos entsteht.
   - `git status --short` muss vor dem Init sauber oder bewusst dokumentiert sein.

3. Dry-run/Print-config:
   - Wenn verfuegbar, erst `codegraph install --print-config codex` oder aequivalente No-write-Ausgabe nutzen.
   - Keine automatische Aenderung an globalen Codex-, Claude-, Cursor- oder MCP-Configs.

4. Lokaler Projekt-Init:
   - `codegraph init` oder `codegraph init -i` nur nach User-Gate.
   - Erwartete Ausgabe: lokaler `.codegraph/` Index, keine getrackten Repo-Dateien ausser bewusstem `.gitignore`-/Plan-Diff.

5. Vergleichsqueries:
   - Curvios zuerst:
     - `node scripts/query-knowledge-graph.mjs scope-collisions --json`
     - `node scripts/query-knowledge-graph.mjs impact-for-file src/core/SettingsManager.js --json`
     - `node scripts/query-knowledge-graph.mjs event-flow spawn --json`
     - `node scripts/query-knowledge-graph.mjs test-prioritization src/core/SettingsManager.js --json`
   - CodeGraph danach:
     - Symbol-/Files-/Context-/Impact-/Trace-Fragen fuer dieselben Referenzbereiche.
   - Ergebnis nur als Vergleichsreport unter `tmp/graph-rag/codegraph-spike/` oder als kurze Evidence im spaeteren aktiven Block.

6. MCP nur als separates Gate:
   - MCP-Registrierung ist D4/User-Gate.
   - Erste MCP-Nutzung read-only.
   - Keine Schreibtools und keine automatische Agenten-Delegation.

7. Cleanup/Recovery:
   - `codegraph uninit` oder manuelles Entfernen von `.codegraph/`.
   - Externe Agent-/MCP-Config nur zuruecknehmen, wenn sie im Gate explizit geaendert wurde.
   - `git status --short` muss danach nur erwartete getrackte Plan-/Schutzdateien zeigen.

## Decision-Klasse und Gates

| Schritt | Klasse | Gate | Begruendung |
| --- | --- | --- | --- |
| Doku-/Freshness-Check | D0 | AUTO | Read-only Web-/Doku-Abgleich. |
| Plan-Draft und Vergleichsplanung | D2 | AUTO nach Preflight | Keine aktive Source-of-Truth-Aenderung. |
| `.gitignore`-Absicherung fuer `.codegraph/` | D2 | REVIEW | Kleiner Repo-Schutz, bevor lokale Indexdateien entstehen. |
| `codegraph init` im Hauptrepo | D4 | USER-GATE | Externes Tool erzeugt lokale Daten im Arbeitsbaum. |
| Globale Installation oder Agent-Config | D4 | USER-GATE | Aendert User-Umgebung und MCP-/Agent-Oberflaeche. |
| MCP-Registrierung | D4 | USER-GATE | Neue Tool-Oberflaeche fuer Agents. |
| Uebernahme als V120-Candidate-Provider | D3 | USER-GATE | Aendert aktive Plan-/Workflow-Semantik. |

## Definition of Done

- [ ] DoD.1 Aktuelle CodeGraph-Version, Installationsweg, Lizenz, Datei-/Config-Wirkung und MCP-Tools sind dokumentiert.
- [ ] DoD.2 `.codegraph/` oder der gewaehlte lokale Indexpfad kann nicht versehentlich in Git landen.
- [ ] DoD.3 Kein Installer mit Schreibwirkung wurde ohne User-Gate ausgefuehrt.
- [ ] DoD.4 Ein No-write-/Dry-run-Pfad fuer Codex-MCP-Konfiguration wurde geprueft oder als nicht verfuegbar dokumentiert.
- [ ] DoD.5 CodeGraph wurde gegen mindestens drei Curvios-Referenzfragen verglichen.
- [ ] DoD.6 Vergleich trennt klar: Curvios-Wahrheit, CodeGraph-Hinweis, offene Unsicherheit.
- [ ] DoD.7 Eine Go/No-Go-Entscheidung fuer V120/V122 liegt vor.
- [ ] DoD.8 Recovery-Pfad wurde trocken dokumentiert oder praktisch ausgefuehrt.

## Phasen

### CG.1 Freshness und Installationswirkung

goal: Externes Tool vor jeder lokalen Wirkung verstehen

- [ ] CG.1.1 Offizielle CodeGraph-Doku erneut pruefen: Version, unterstuetzte Agents, MCP-Tools, `init`, `uninit`, `install --print-config`, lokale Indexpfade.
- [ ] CG.1.2 Datei- und Config-Wirkung klassifizieren: repo-lokal, global user config, MCP registry, Cache, Netzwerkdownload.
- [ ] CG.1.3 Sicherheitsentscheidung festhalten: kein Pipe-Installer als Default; bevorzugt versionierter npm-/npx- oder bereits installierter Binary-Pfad.

### CG.2 Repo-Schutz vor Init

goal: Kein lokaler CodeGraph-Index landet in Git

- [ ] CG.2.1 `.gitignore`-Status pruefen und `.codegraph/` absichern, bevor `codegraph init` im Hauptrepo laeuft.
- [ ] CG.2.2 `git status --short` vor Init dokumentieren.
- [ ] CG.2.3 Wenn ein separater Sandbox-Pfad genutzt wird, den Pfad unter `tmp/` halten und nicht als dauerhafte Doku verwenden.

### CG.3 Projekt-Init und Baseline

goal: CodeGraph lokal erzeugen, aber noch nicht als Agent-Tool verdrahten

- [ ] CG.3.1 User-Gate einholen fuer `codegraph init` oder `codegraph init -i`.
- [ ] CG.3.2 Nach Init `git status --short` pruefen; getrackte Aenderungen duerfen nur vorher erlaubte Schutz-/Plan-Dateien sein.
- [ ] CG.3.3 CodeGraph-Status/Files-Signal erfassen und grob mit Curvios-Dateiabdeckung vergleichen.

### CG.4 Vergleich mit Curvios-Graph

goal: Nutzen an echten Referenzfragen messen

- [ ] CG.4.1 Settings-Referenz: `SettingsManager` Curvios-Impact gegen CodeGraph-Symbol-/Caller-/Callee-Sicht vergleichen.
- [ ] CG.4.2 Spawn-Referenz: Curvios `event-flow spawn` gegen CodeGraph-Trace/Context vergleichen.
- [ ] CG.4.3 Scope-Referenz: `scope-collisions` bleibt Curvios-only Wahrheit; pruefen, ob CodeGraph trotzdem relevante Code-Lesepfade kuerzt.
- [ ] CG.4.4 Ergebnis als kurzer transienter Report oder aktive V120-Evidence zusammenfassen.

### CG.5 MCP-Entscheidung

goal: Tool-Oberflaeche nur oeffnen, wenn der Nutzen den Governance-Preis rechtfertigt

- [ ] CG.5.1 No-MCP-Variante bewerten: CLI/Report reicht fuer V120 Candidate Provider?
- [ ] CG.5.2 Falls MCP sinnvoll: konkrete read-only Tools, Config-Pfad, Recovery und User-visible Risk nennen.
- [ ] CG.5.3 MCP-Registrierung nur nach separatem D4/User-Gate ausfuehren.

### CG.6 Go/No-Go

goal: Klare Folgeentscheidung statt dauerhafter Probeinstallation

- [ ] CG.6.1 `keep`: CodeGraph bleibt optionaler read-only Candidate Provider fuer V120.
- [ ] CG.6.2 `manual-only`: CodeGraph bleibt lokales CLI-Hilfsmittel ohne Agent-/MCP-Registrierung.
- [ ] CG.6.3 `remove`: `codegraph uninit`/Cleanup ausfuehren und Ergebnis dokumentieren.

## Risiken

| Risiko | Stufe | Mitigation |
| --- | --- | --- |
| Zweite Wahrheit neben Curvios-Graph | hoch | CodeGraph-Ausgaben nur als Hinweise; Curvios-Graph/Plan/Test bleibt kanonisch. |
| Lokale Indexdateien landen in Git | hoch | `.codegraph/` vor Init ignorieren oder Index ausserhalb des Repos halten. |
| MCP erweitert Agent-Rechte unbemerkt | hoch | MCP nur D4/User-Gate, read-only, keine Schreibtools. |
| Externes Tool veraendert User-Config | mittel | Erst Print-config/Dry-run, danach explizites Gate fuer Config-Schreibzugriff. |
| Technischer Callgraph wird mit Produktwirkung verwechselt | mittel | Vergleichsreport trennt Code-Naehe von Produkt-/Plan-/Test-Evidence. |
| Pflegeaufwand uebersteigt Nutzen | mittel | Go/No-Go nach drei Referenzfragen; kein Dauerbetrieb ohne messbaren Nutzen. |

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Empfohlene Einordnung: kleiner V120-Vorslice oder separater Folgeblock vor V120.3, falls CodeGraph als Candidate Provider genutzt werden soll.
- V122 wird erst relevant, wenn MCP-Registrierung oder Agent-Tooling wirklich vorgesehen ist.
- Manuelle Uebernahme erforderlich.
