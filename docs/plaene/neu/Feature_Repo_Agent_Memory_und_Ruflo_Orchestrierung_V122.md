---
planned_block_id: V122
title: Repo-natives Agent-Memory und externe Ruflo-Orchestrierung
status: draft
priority: P2
owner: frei
depends_on:
  - V116.99
  - V117.99
  - V119.1
soft_depends_on:
  - V120.99
blocked_by: []
affected_area: repo-agent-memory-ruflo-orchestration
scope_files:
  - docs/plaene/neu/Feature_Repo_Agent_Memory_und_Ruflo_Orchestrierung_V122.md
  - docs/agent-memory/README.md
  - docs/agent-memory/memory.jsonl
  - docs/agent-memory/namespaces.md
  - docs/agent-memory/schema.json
  - docs/agent-memory/role-profiles.v1.json
  - docs/agent-memory/orchestration-modes.v1.json
  - scripts/agent-memory.mjs
  - scripts/agent-memory-mcp.mjs
  - scripts/agent-orchestration-plan.mjs
  - package.json
  - .agents/rules/agent_memory.md
  - .agents/rules/token_efficiency_and_tools.md
  - .agents/workflows/plan.md
  - .agents/workflows/code.md
  - .agents/workflows/quick.md
  - docs/referenz/ai_project_onboarding.md
  - docs/plaene/CHANGELOG.md
  - tests/agent-memory.contract.test.mjs
  - tests/agent-orchestration-plan.contract.test.mjs
scope_reference_files:
  - AGENTS.md
  - .agents/rules/planning_and_governance.md
  - .agents/rules/token_efficiency_and_tools.md
  - docs/Umsetzungsplan.md
  - docs/plaene/aktiv/V116.md
  - docs/plaene/aktiv/V117.md
  - docs/plaene/aktiv/V119.md
  - docs/plaene/aktiv/V120.md
  - docs/generated/knowledge-graph.json
scope_overlap_allowed_with:
  - V116
  - V119
  - V120
verification:
  - npm run memory:check
  - npm run test:agent-memory
  - npm run test:agent-orchestration
  - npm run check:agent-context
  - npm run plan:check
  - npm run gates:pre-commit
updated_at: 2026-05-17
---

# Feature: Repo-natives Agent-Memory und externe Ruflo-Orchestrierung

## Kurzfassung

Dieser Draft plant ein kleines, versioniertes und pruefbares Agent-Memory im Repo sowie eine spaetere, klar begrenzte Ruflo-Anbindung fuer Review und Orchestrierung.

Der zentrale Schnitt ist bewusst konservativ:

- Kanonisch bleiben `AGENTS.md`, `.agents/rules/`, `.agents/workflows/`, `docs/Umsetzungsplan.md`, aktive Blockplaene, `docs/plaene/CHANGELOG.md`, `docs/prozess/Open_Findings.md` und der Knowledge Graph.
- Das neue Repo-Memory ist nur ein kuratierter Entscheidungs- und Hinweisindex.
- Ruflo ist nur ein externer Orchestrierungs-, Review- und optionaler Cache-Layer.
- Ruflo-Memory darf das Repo-Memory nie automatisch ersetzen oder zur Quelle fuer Repo-Aenderungen werden.

Der eigentliche Produkthebel liegt nicht in einem grossen Swarm-System, sondern in drei kleinen Bausteinen:

1. Ein kuratierter Memory-Index reduziert wiederholtes Lesen historischer Entscheidungen.
2. Kleine Rollenprofile machen Subagent-Nutzung reproduzierbar und gate-faehig.
3. Ruflo wird erst nach lokalem MVP als Sandbox-Adapter gegen diese Rollenprofile geprueft.

## Warum eigener Plan statt V116-Unterpunkt

V116 reduziert Kontext-Rauschen, klaert Plan-/Archivhygiene und bereitet Folgearbeit vor. Repo-Memory und Ruflo beruehren dagegen dauerhaft:

- neue versionierte Repo-Struktur unter `docs/agent-memory/`
- neue Scripts und npm-Kommandos
- Governance-Regeln fuer Agenten-Kontext
- optionale MCP-Schnittstelle
- externe Tool- und Cache-Anbindung
- Schreib- und Review-Gates fuer dauerhafte Agenten-Erinnerungen

Das ist mindestens `D3`-Governance-Scope. Als V116-Unterpunkt wuerde es den Cleanup-Block ueberladen und eine neue Wahrheitsschicht zu frueh in eine Entschlackungsphase ziehen. Deshalb bleibt dieser Draft ein separater Intake-Plan.

## Zielbild

```text
Codex / Gemini / Claude / andere Agents
        |
        v
Repo-Governance
AGENTS.md + .agents/rules + .agents/workflows
        |
        v
Knowledge Graph fuer harte Scope-/Runtime-/Impact-Fakten
        |
        v
Repo-Agent-Memory als kuratierter Hinweisindex
docs/agent-memory/memory.jsonl
        |
        v
CLI: npm run memory:search / memory:check / memory:add-proposed
        |
        v
optional read-only MCP: rohre_memory_search / get / sources / check
        |
        v
optional Ruflo fuer Swarm-Planung, Reviews, Cache und externe Orchestrierung
```

Leitregel:

```text
Kanonische Quellen = Repo-Governance, aktive Plaene, Changelog, Findings, Knowledge Graph
Repo-Memory = versionierter Hinweis- und Entscheidungsindex
Ruflo-Memory = optionaler Arbeitscache
```

## Integrationsentscheidung

V122 soll als eigener Plan starten. Der Grund ist nicht "mehr Meta", sondern ein sauberer Ownership-Schnitt:

- V117 bleibt die operative Subagent- und Decision-Klassen-Regel.
- V120 bleibt der Graph-RAG- und Evidence-Paket-Pfad.
- V122 verantwortet nur Memory, Rollenprofile, Orchestrierungsmodi und die Ruflo-Sandbox-Entscheidung.

Damit bleibt der erste lieferbare Slice klein:

```text
Memory-CLI + Check + Rollenprofile + deterministischer Orchestration-Plan
```

Ruflo wird nicht als Voraussetzung fuer diesen Slice betrachtet.

## Ausgangslage

- Das Repo hat bereits einen festen Leseweg ueber `AGENTS.md`, `.agents/rules/`, `.agents/workflows/`, `docs/Umsetzungsplan.md`, aktive Blockplaene und Changelog.
- `.agents/rules/token_efficiency_and_tools.md` verlangt Graph-First fuer Plan-, Scope-, Surface- und Runtime-Fragen.
- V116 reduziert Standardkontext und trennt aktive Plaene, Intake und Archiv.
- V117 hat Decision-Klassen, D3/D4-Gates, Zweckklassen und User-Gates fuer Governance- und Source-of-Truth-Aenderungen eingefuehrt.
- V120 plant Graph-RAG mit lokalem Context-Adapter. V122 darf dieses System nicht doppeln, sondern kann spaeter dessen Evidence-Pakete als Quelle lesen.
- Ruflo ist als externes Tool fuer Codex/MCP-Orchestrierung beschrieben, bringt aber je nach Modus eigene Dateien, Settings, Memory und Orchestrierungskonzepte mit. Deshalb darf Ruflo nicht als erster Schritt in das Repo initialisiert werden.

## Nicht-Ziel

- Kein Ersatz fuer den Knowledge Graph.
- Kein zweiter Masterplan, kein zweites Changelog und keine alternative Governance.
- Kein automatisches Full-Init externer Tools im Hauptrepo.
- Kein automatisches Schreiben aus Ruflo-Memory in Repo-Dateien.
- Keine Speicherung von Secrets, Tokens, Credentials, Locks, langen Logs, Testrohdaten oder temporaeren Agentengedanken.
- Keine semantische Embedding-Suche im MVP.
- Keine externe Vektordatenbank als Pflichtpfad.
- Keine Umgehung von D3-/D4-Gates, Subagent-Regeln oder User-owned Intake.
- Keine produktiven Spiel-, Runtime-, UI-, Bot-Training-, Recording- oder Multiplayer-Aenderungen.

## Abgrenzung zu V120

V120 beantwortet: Wie findet ein Agent relevante Repo-Quellen und Evidence-Pakete mit Graph-RAG und lokalem Context-Adapter?

V122 beantwortet: Welche stabilen, kuratierten Erkenntnisse duerfen nach verifizierter Arbeit als kleiner Hinweisindex fuer spaetere Agents erhalten bleiben, und wie darf Ruflo danach extern helfen?

Folge:

- V120 kann spaeter Memory-Sources oder Memory-Treffer als Retrieval-Quelle beruecksichtigen.
- V122 darf sich nicht als RAG-System ausgeben.
- Semantische Suche fuer Memory ist nur ein spaeter optionaler Ausbau und sollte V120 wiederverwenden, wenn V120 stabil ist.
- Der CLI-only Memory-MVP darf ohne `V120.99` geplant werden. Alles, was Graph-RAG-Evidence-Pakete, semantische Suche, RAG-gestuetztes Memory-Ranking oder Ruflo-Orchestrierung mit RAG-Kontext nutzt, wartet auf `V120.99` oder ein explizites V120-`fixture-ready`-Gate.

## Abgrenzung zu V117

V117 hat bereits entschieden, dass Subagents ein kontrolliertes Parallelisierungswerkzeug sind. V122 darf diese Regel nicht lockern. V122 konkretisiert nur, wie eine fuehrende Agenteninstanz vor einer erlaubten Delegation reproduzierbar plant:

- Welche Rolle wird gebraucht?
- Welche Dateien, Oberflaechen oder Fragen gehoeren zum Auftrag?
- Welche Aktionen sind erlaubt: `read-only`, `review`, `verify`, `disjoint-edit`?
- Welche Gate-Klasse gilt?
- Welche Ausgabe muss zurueckkommen, damit der fuehrende Agent integrieren kann?

V122 erzeugt also keinen neuen Autonomie-Level, sondern ein Formblatt und Tooling fuer bereits erlaubte Subagent-Nutzung.

## Memory-Grundmodell

Geplante Dateiablage:

```text
docs/agent-memory/
  README.md
  memory.jsonl
  namespaces.md
  schema.json
  role-profiles.v1.json
  orchestration-modes.v1.json

scripts/
  agent-memory.mjs
  agent-memory-mcp.mjs   # erst spaeter
  agent-orchestration-plan.mjs
```

Minimaler Eintrag:

```json
{
  "id": "ppo-runtime-gate-2026-05-15",
  "namespace": "rohre.local_models",
  "kind": "decision",
  "tags": ["ppo", "runtime", "gate"],
  "summary": "PPO bleibt bis nach BT104/BT105 externer Python-Sidecar. Keine produktive Runtime-Policy-Umschaltung ohne separaten Integrationsblock und User-Entscheid.",
  "sources": [
    {
      "path": "docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md",
      "source_hash": "sha256:optional"
    }
  ],
  "status": "proposed",
  "confidence": "high",
  "created_at": "2026-05-15",
  "verified_by": null,
  "review_after": null,
  "supersedes": [],
  "superseded_by": []
}
```

Pflichtfelder im MVP:

- `id`
- `namespace`
- `kind`
- `tags`
- `summary`
- `sources`
- `status`
- `confidence`
- `created_at`

Erlaubte `kind`-Werte:

- `decision`
- `constraint`
- `pattern`
- `risk`
- `handoff`
- `deprecated`

Erlaubte `status`-Werte:

- `proposed`
- `verified`
- `deprecated`

## Memory-Schreibregel

Das Memory darf nicht als freies Agenten-Notizbuch starten. Schreibfluss:

1. Agent findet nach verifizierter Arbeit eine stabile Erkenntnis.
2. Agent erzeugt nur einen `proposed`-Eintrag:
   - `npm run memory:add-proposed -- ...`
3. `npm run memory:check` prueft Schema, Quellen, Secrets, Laenge und Namespace.
4. Review oder Abschluss-Gate macht daraus `verified`.
5. Veraltete Eintraege werden nicht geloescht, sondern `deprecated` und mit `superseded_by` verknuepft.

`verified` darf nicht bedeuten "Wahrheit", sondern nur:

```text
Der Eintrag ist kurz, belegt, schema-valide und als Hinweis fuer spaetere Agents geeignet.
```

## CLI-MVP

Geplante npm-Scripts:

```json
{
  "memory:search": "node scripts/agent-memory.mjs search",
  "memory:add-proposed": "node scripts/agent-memory.mjs add-proposed",
  "memory:verify": "node scripts/agent-memory.mjs verify",
  "memory:deprecate": "node scripts/agent-memory.mjs deprecate",
  "memory:get": "node scripts/agent-memory.mjs get",
  "memory:check": "node scripts/agent-memory.mjs check",
  "memory:rebuild": "node scripts/agent-memory.mjs rebuild",
  "agent:orchestration-plan": "node scripts/agent-orchestration-plan.mjs",
  "test:agent-orchestration": "node --test tests/agent-orchestration-plan.contract.test.mjs"
}
```

MVP-Suche bleibt deterministisch:

- Token-/Substring-Score auf `summary`, `tags`, `namespace`, `kind`, `sources`.
- Statusfilter: default `verified`; optional `--include-proposed`, `--include-deprecated`.
- Quellenfilter: `--source docs/plaene/aktiv/V120.md`.
- JSON-Ausgabe fuer Agenten: `--json`.

## Rollenprofile

Der MVP soll wenige, repo-spezifische Rollen definieren. Jede Rolle ist ein begrenztes Arbeitsmuster, keine eigene Autoritaet.

| Rolle | Zweck | Erlaubter Modus | Nicht erlaubt |
| --- | --- | --- | --- |
| `plan-consistency-reviewer` | Plan, Changelog, Graph und Governance auf Widerspruch pruefen | `read-only`, `review` | Master-/Aktivplan-Edit ohne Gate |
| `graph-auditor` | Scope, Dependencies, Impact und Coverage ueber Graph-Queries pruefen | `read-only`, `review` | Graph-Artefakte manuell als Wahrheit ueberschreiben |
| `architecture-reviewer` | Architektur- und Boundary-Fragen source-backed bewerten | `read-only`, `review` | Produktive Refactors ausfuehren |
| `test-gap-reviewer` | kleinste sinnvolle Verifikation und Testluecken vorschlagen | `read-only`, `review`, `verify` | Vollsuite als Default erzwingen |
| `security-reviewer` | Secret-, PII-, Prompt-Injection- und Tooling-Risiken pruefen | `read-only`, `review` | externe Scans oder Installationen ohne Gate |
| `performance-reviewer` | Hotpath-, Asset-, Memory- und Laufzeitrisiken bewerten | `read-only`, `review`, `verify` | produktive Parameter ohne Gate aendern |
| `implementation-worker` | disjunkte, klar begrenzte Code- oder Doc-Slices umsetzen | `disjoint-edit` | an denselben Dateien wie andere Worker arbeiten |

Pflichtfelder je Rolle:

- `id`
- `purpose`
- `allowed_modes`
- `default_output`
- `forbidden_actions`
- `required_inputs`
- `evidence_requirements`
- `max_scope`

Die Datei `role-profiles.v1.json` bleibt klein und validierbar. Neue Rollen brauchen einen konkreten wiederkehrenden Nutzen; keine Rollen fuer einmalige Vorlieben.

## Orchestrierungsmodi

V122 definiert keine Swarm-Autonomie, sondern vier abrufbare Modi:

| Modus | Wann sinnvoll | Ergebnis |
| --- | --- | --- |
| `single-review` | Eine klar abgegrenzte Frage braucht zweite Sicht | Review-Befund mit Quellen |
| `parallel-review` | Mehrere unabhaengige Fragen koennen gleichzeitig gelesen werden | getrennte Befunde, fuehrender Agent integriert |
| `consensus-review` | Riskante Architektur-/Governance-Frage braucht Gegenargumente | Pro/Contra, Unsicherheiten, Go/No-Go-Vorschlag |
| `disjoint-worker-slice` | Mehrere Implementierungen haben harte Dateigrenzen | Patch pro Worker, fuehrender Agent prueft und merged |

Jeder Modus muss vor Ausfuehrung einen kleinen Orchestration-Plan erzeugen:

```json
{
  "mode": "parallel-review",
  "decisionClass": "D2",
  "leadAgentResponsibilities": ["classification", "integration", "evidence", "commit"],
  "delegations": [
    {
      "role": "graph-auditor",
      "question": "Welche Scope-Kollisionen betreffen V120/V122?",
      "allowedActions": ["read-only"],
      "writeScope": [],
      "expectedOutput": "findings"
    }
  ],
  "stopConditions": ["D3/D4 change needed", "scope collision", "conflicting evidence"]
}
```

`agent-orchestration-plan.mjs` soll im MVP nur validieren und ausgeben, nicht Agents starten. Das Starten von Subagents bleibt eine explizite User- und Harness-Entscheidung.

## `memory:check`

Der Check soll mindestens pruefen:

- JSONL ist valide.
- Jeder Eintrag erfuellt `schema.json`.
- `id` ist eindeutig.
- `namespace` ist erlaubt.
- `kind`, `status`, `confidence` sind erlaubt.
- `summary` bleibt kurz.
- `sources[].path` existiert.
- optionale `source_hash`-Warnung bei geaenderter Quelle.
- keine Secrets, Tokens, Private Keys, `.env`-Werte oder langen Log-Dumps.
- keine Pfade aus Standard-Excludes wie `tmp/`, `.codex_tmp/`, `node_modules/`, rohen Trainingsdaten oder Build-Artefakten.
- `verified`-Eintraege brauchen `verified_by`.
- `deprecated`-Eintraege brauchen `superseded_by` oder eine kurze Deactivation-Begruendung.

## Governance-Integration

Neue oder geaenderte Governance-Regeln sind `D3` und brauchen User-Gate.

Minimalregel fuer spaeteren aktiven Block:

```md
## Repo-natives Agent-Memory

Bei komplexen Architektur-, Runtime-, Bot-Training-, lokalen Modell-, Security-, Test-, Release- oder Refactor-Aufgaben:

1. Repo-Leseweg einhalten.
2. Bei Scope-, Surface-, Impact- oder Runtime-Fragen zuerst Knowledge Graph nutzen.
3. Danach optional `npm run memory:search -- "<frage>"`.
4. Memory-Treffer sind Hinweise, keine kanonische Wahrheit.
5. Nach verifizierter Arbeit duerfen stabile Erkenntnisse als `proposed` Memory-Eintrag erfasst werden.
6. Keine Secrets, Locks, Logs, temporaeren Gedanken oder unverified Claims speichern.
```

Diese Regel gehoert entweder in eine eigene `.agents/rules/agent_memory.md` oder in eine sehr kurze Erweiterung von `.agents/rules/token_efficiency_and_tools.md`. Der aktive Block muss vor Umsetzung entscheiden, welche Variante weniger Governance-Rauschen erzeugt.

## MCP-Strategie

Der erste MCP-Server muss read-only sein.

Erlaubte erste Tools:

- `rohre_memory_search`
- `rohre_memory_get`
- `rohre_memory_sources`
- `rohre_memory_check`

Nicht im ersten MCP:

- `rohre_memory_add`
- `rohre_memory_verify`
- `rohre_memory_deprecate`

Schreibende MCP-Tools duerfen erst spaeter kommen und dann nur als `propose_add`, nicht als stilles Schreiben in `verified`.

## Ruflo-Strategie

Ruflo darf erst nach stabilem CLI-MVP und idealerweise nach read-only MCP geprueft werden.

Erlaubte Rolle:

- Swarm-Planung fuer grosse Review-/Architekturfragen.
- Security-/Performance-/Testlueckenanalyse als externer Reviewer.
- Optionaler Arbeitscache fuer laufende Orchestrierung.
- Kein kanonisches Memory.
- Kein automatisches Repo-Full-Init im Hauptbranch.

Verbotene Rolle:

- Source of Truth fuer Repo-Regeln.
- automatischer Writer in `docs/agent-memory/`.
- Ersatz fuer Knowledge Graph.
- Ersatz fuer User-Gates.
- Full-Init auf `main` oder in einem aktiven Arbeitsbaum ohne separaten User-Gate.

Empfohlener Pruefpfad:

1. Ruflo nur in separatem Sandbox-Worktree oder mit read-only Repo-Zugriff pruefen.
2. Version pinnen statt `latest`, sobald ein reproduzierbarer Pfad gewuenscht ist.
3. `codex mcp add ruflo -- npx -y ruflo@<version> mcp start` nur nach User-Gate.
4. Kein Commit von Ruflo-generierten Workspace-Dateien ohne explizite Klassifikation.
5. Ergebnisse zuerst als Bericht oder proposed Memory behandeln, nie direkt als verified.

## Ruflo-Bausteinmatrix

| Ruflo-Konzept | V122-Entscheidung | Curvios-Schnitt |
| --- | --- | --- |
| Swarm Coordination | `adopt concept` | Orchestrierungsmodi als Plan/Review-Muster, keine Autonomie |
| Specialized Agents | `adopt concept` | wenige Curvios-Rollenprofile statt grosser Agentenkatalog |
| Persistent Memory | `adopt limited` | Repo-Memory als source-backed Hinweisindex; Ruflo-Memory nur Cache |
| RAG Memory / Knowledge Graph | `defer to V120` | V120 Evidence-Pakete bleiben einziger RAG-Pfad |
| Autopilot / Background Workers | `reject for MVP` | widerspricht Gate- und User-Ownership-Modell |
| MCP Server | `sandbox-only first` | read-only pruefen; Registrierung ist D4/User-Gate |
| Federation / remote agents | `reject for now` | kein Produkthebel, hohes Sicherheits-/Scope-Risiko |
| Test generation | `sandbox-only` | nur Testlueckenanalyse, keine automatische Test-Erzeugung im Repo |
| Security audit | `sandbox-only` | Befundbericht, keine automatische Remediation |
| Docs generation | `reject for MVP` | Gefahr zweiter Wahrheit und Doku-Flut |

Diese Matrix ist der erste Schutz gegen schleichendes Full-Init: Jeder Ruflo-Teil braucht eine explizite Kategorie, bevor er in einem aktiven Block genutzt wird.

## Schnittstellenvertrag fuer Ruflo-Sandbox

Die Sandbox bekommt nur ein begrenztes Kontextpaket:

- Auftrag und Fragestellung.
- relevante Graph-Query-Ausgaben oder spaeter V120-Evidence-Paket.
- relevante Memory-Treffer mit Status und Quellen.
- erlaubter Modus und verbotene Aktionen.
- erwartetes Ausgabeformat.

Die Sandbox darf nicht bekommen:

- Secrets, `.env`, Tokens oder Credentials.
- ungeklaerte lokale Logs, Testrohdaten oder tmp-Artefakte.
- Schreibrechte in den aktiven Hauptarbeitsbaum.
- Auftrag zum Committen, Verschieben, Loeschen oder Full-Init.

Rueckgabeformat:

```json
{
  "summary": "kurzer Befund",
  "findings": [
    {
      "severity": "medium",
      "claim": "source-backed Aussage",
      "sources": [{"path": "docs/plaene/aktiv/V120.md", "lineStart": 66}],
      "uncertainty": "offene Pruefung"
    }
  ],
  "recommendedAction": "go|no-go|defer",
  "repoWriteSuggested": false
}
```

## Externe Quellenlage

Ruflo-Dokumentation wurde am 2026-05-16 als Planungsinput betrachtet:

- `https://raw.githubusercontent.com/ruvnet/ruflo/main/README.md`
- `https://raw.githubusercontent.com/ruvnet/ruflo/main/docs/USERGUIDE.md`

Diese externen Quellen sind nicht kanonisch fuer das Repo. Weil Ruflo-Versionen und Installationswege sich aendern koennen, muss die aktive Umsetzung vor jeder Installation oder MCP-Registrierung die aktuelle Dokumentation erneut pruefen und Version/Kommandos konkret festhalten.

## AI-Ausfuehrungsmatrix

| Bereich | Klasse | Default | Grenze |
| --- | --- | --- | --- |
| Analyse, Quellenvergleich, Draft unter `docs/plaene/neu/` | D0/D2 | [AUTO] | Keine Master-/Governance-Aenderung |
| `docs/agent-memory/*` MVP-Dateien | D2/D3 | [REVIEW] | Dauerhafte Agenten-Kontextquelle; vor Umsetzung Scope und Gate nennen |
| `scripts/agent-memory.mjs`, Tests, npm-Scripts | D2 | [REVIEW] | Nur Memory-MVP, keine externen Installs |
| Rollenprofile und Orchestration-Plan-Validator | D2/D3 | [REVIEW] | Kein automatisches Agent-Starten, kein Governance-Bypass |
| `.agents/rules/*`, Workflows, AGENTS.md | D3 | [USER-GATE] | Governance-Quelle |
| MCP-Server mit read-only Tools | D3 | [USER-GATE] | Tool-Oberflaeche fuer Agents |
| Schreibende MCP-Tools | D3/D4 | [USER-GATE] | Nur proposed, nie still verified |
| Ruflo-MCP-Registrierung oder externe Tool-Initialisierung | D4 | [USER-GATE] | Version, Worktree, Recovery-Pfad und No-Full-Init-Regel dokumentieren |
| Ruflo Full-Init im Hauptrepo | D4 | [USER-GATE] | Standardmaessig Nicht-Ziel |

## Definition of Done

- [ ] DoD.1 Ein kleiner, versionierter Memory-Ordner existiert mit README, Namespace-Regeln, Schema und leerem oder kuratiertem JSONL.
- [ ] DoD.2 `scripts/agent-memory.mjs` bietet deterministische Suche, `add-proposed`, `verify`, `deprecate`, `get` und `check`.
- [ ] DoD.3 `memory:check` validiert Schema, Quellen, Status, Namespace, Secret-Muster, Laengenlimit und Source-Staleness-Warnungen.
- [ ] DoD.4 Governance-Dokumentation stellt klar: Memory-Treffer sind Hinweise, keine kanonische Wahrheit.
- [ ] DoD.5 Rollenprofile und Orchestrierungsmodi sind versioniert, klein, validierbar und an V117-Gates gebunden.
- [ ] DoD.6 Ein Orchestration-Plan-Validator kann Delegationsplaene pruefen, startet aber keine Agents.
- [ ] DoD.7 Erste Memory-Eintraege sind klein, source-backed und nur `verified`, wenn Review/Gate erfolgt ist.
- [ ] DoD.8 Tests decken Parser, Suche, Check, Secret-Blocker, Source-Existenz, Statusuebergaenge, Rollenprofile, Orchestrierungsmodi und JSON-Ausgabe ab.
- [ ] DoD.9 Read-only MCP ist optional implementiert oder bewusst auf Folgeblock verschoben.
- [ ] DoD.10 Ruflo-Integration ist entweder als Sandbox-Report bewertet oder bewusst vertagt; kein Full-Init im Hauptrepo.
- [ ] DoD.11 Abschluss-Evidence nennt Nutzen, Grenzen, Restrisiken und Verhaeltnis zu V116/V117/V120.
- [ ] DoD.12 `npm run plan:check`, `npm run check:agent-context`, `npm run memory:check`, relevante Tests und bei Governance-Diff `npm run gates:pre-commit` sind gruen oder blockerfest dokumentiert.

## Phasen

### 122.1 Scope-Entscheidung und Quellenanalyse
status: open
goal: Memory/Ruflo so schneiden, dass keine zweite Wahrheit entsteht
output: finaler Scope, Gate-Entscheid und Quellenbewertung

- [ ] 122.1.1 V116-, V117-, V119- und V120-Anschluss pruefen: `V119.1` ist harte Evidence-Baseline; `V120.99` bleibt nur fuer CLI-only Memory soft, wird aber fuer Graph-RAG-, semantische Such- oder Ruflo-RAG-Nutzung zum Gate.
- [ ] 122.1.2 Entscheiden, ob Memory als eigener aktiver Block startet oder als V120-Folge nach Graph-RAG; Empfehlung und Gegenargumente dokumentieren.
- [ ] 122.1.3 Ruflo-Dokumentation aktuell pruefen, Installationsmodi klassifizieren und Full-Init-Risiko gegen Repo-Governance abgrenzen.
- [ ] 122.1.4 Zweckklasse fuer jede neue dauerhafte Datei festhalten: `plan`, `reference`, `governance`, `evidence` oder `tooling`.
- [ ] 122.1.5 Ruflo-Bausteine in `adopt concept`, `adopt limited`, `defer to V120`, `sandbox-only` oder `reject for MVP` klassifizieren.
- [ ] 122.1.6 Minimalen ersten Liefer-Slice festlegen: Memory-CLI, Check, Rollenprofile und Orchestration-Plan-Validator ohne Ruflo-Installation.

### 122.2 Schema und Speicherformat
status: open
goal: Memory als kleinen, pruefbaren Hinweisindex definieren
output: `docs/agent-memory/` Baseline

- [ ] 122.2.1 `docs/agent-memory/README.md` anlegen: Zweck, Nicht-Zweck, kanonische Quellen, Schreibfluss, Review-Regeln.
- [ ] 122.2.2 `docs/agent-memory/schema.json` mit Pflichtfeldern, Enums, Laengenlimits und Source-Struktur definieren.
- [ ] 122.2.3 `docs/agent-memory/namespaces.md` mit erlaubten Namespaces und Beispielen pflegen.
- [ ] 122.2.4 `docs/agent-memory/memory.jsonl` initial leer oder mit maximal wenigen reviewed Seed-Eintraegen starten.
- [ ] 122.2.5 Retention-Regel definieren: deprecate statt loeschen; keine Locks, Logs, Secrets oder temporaeren Gedanken.

### 122.3 CLI-MVP
status: open
goal: Memory ohne MCP und ohne Embeddings nutzbar machen
output: `npm run memory:*` Scripts und Contract-Tests

- [ ] 122.3.1 `scripts/agent-memory.mjs` implementieren: `search`, `get`, `add-proposed`, `verify`, `deprecate`, `check`.
- [ ] 122.3.2 `package.json` um `memory:search`, `memory:get`, `memory:add-proposed`, `memory:verify`, `memory:deprecate`, `memory:check` erweitern.
- [ ] 122.3.3 Deterministische Suche mit Status-, Namespace-, Tag- und Source-Filtern implementieren; keine Embeddings.
- [ ] 122.3.4 JSON-Ausgabe und kurze Textausgabe fuer Agenten-Arbeit bereitstellen.
- [ ] 122.3.5 `tests/agent-memory.contract.test.mjs` fuer Happy Path, ungueltige Eintraege, Secret-Blocker und Source-Checks anlegen.

### 122.3a Rollenprofile und Orchestration-Plan
status: open
goal: Subagent-Nutzung reproduzierbar planen, ohne Agents automatisch zu starten
output: Rollen-/Modus-Vertraege und Plan-Validator

- [ ] 122.3a.1 `role-profiles.v1.json` mit den MVP-Rollen anlegen: `plan-consistency-reviewer`, `graph-auditor`, `architecture-reviewer`, `test-gap-reviewer`, `security-reviewer`, `performance-reviewer`, `implementation-worker`.
- [ ] 122.3a.2 `orchestration-modes.v1.json` fuer `single-review`, `parallel-review`, `consensus-review` und `disjoint-worker-slice` definieren.
- [ ] 122.3a.3 `scripts/agent-orchestration-plan.mjs` implementieren: JSON-Plan validieren, D3/D4-Stopps erkennen, Write-Scope-Grenzen pruefen, kurze Text-/JSON-Ausgabe liefern.
- [ ] 122.3a.4 Contract-Tests fuer erlaubte Rollen, verbotene Aktionen, fehlende Quellen, kollidierende Write-Scopes und D3/D4-Gate-Hinweise anlegen.
- [ ] 122.3a.5 Klar dokumentieren: Das Tool startet keine Subagents und ersetzt keine User-Freigabe.

### 122.4 Governance-Einhaengung
status: open
goal: Agents nutzen Memory erst nach Repo-Leseweg und Graph-First
output: minimale Governance-Regel ohne Meta-Rauschen

- [ ] 122.4.1 Entscheiden: eigene `.agents/rules/agent_memory.md` oder kleine Erweiterung in bestehender Rule.
- [ ] 122.4.2 Regel einhaengen: Memory-Suche nach Repo-Leseweg und Graph-First, nicht davor.
- [ ] 122.4.3 Workflows `plan.md`, `code.md` und `quick.md` nur punktuell anpassen, falls sie Memory-Nutzung sonst verhindern oder uebertreiben.
- [ ] 122.4.4 `docs/referenz/ai_project_onboarding.md` um kurze Memory-Read-Regel ergaenzen.
- [ ] 122.4.5 `check:agent-context` oder ein eigener Check verhindert, dass Memory als Masterplan, Changelog oder Rule-Ersatz formuliert wird.
- [ ] 122.4.6 Subagent-Regel nur referenzieren, nicht duplizieren: V117/`planning_and_governance.md` bleiben operative Wahrheit.
- [ ] 122.4.7 Orchestration-Plan-Nutzung als optionalen Vorbereitungscheck fuer explizit erlaubte Subagent-Arbeit dokumentieren.

### 122.5 Read-only MCP
status: open
goal: Repo-Memory als sicheres Tool fuer Agents anbieten
output: optionaler MCP-Server ohne Schreibtools

- [ ] 122.5.1 Entscheiden, ob MCP im aktiven Block noetig ist oder ob CLI fuer den ersten Rollout reicht.
- [ ] 122.5.1a Vor MCP-Umsetzung pruefen, ob der MCP nur deterministische CLI-Memory-Treffer ausliefert. Sobald Graph-RAG-Evidence-Pakete, semantisches Ranking oder RAG-Kontext integriert werden, ist `V120.99` oder ein explizites V120-`fixture-ready`-Gate erforderlich.
- [ ] 122.5.2 `scripts/agent-memory-mcp.mjs` nur mit read-only Tools implementieren.
- [ ] 122.5.3 MCP-Tool-Ausgaben klein, source-backed und statusmarkiert halten.
- [ ] 122.5.4 Schreibtools bewusst ausschliessen oder nur als spaeteres `propose_add` planen.
- [ ] 122.5.5 Lokale Registrierungsanleitung dokumentieren, aber keine automatische MCP-Registrierung im Repo erzwingen.

### 122.6 Ruflo-Sandbox und Integrationsentscheidung
status: open
goal: Ruflo als externen Review-/Orchestrierungs-Layer bewerten, ohne Repo-Governance zu ueberschreiben
output: Sandbox-Report und Go/No-Go fuer MCP-Integration

- [ ] 122.6.1 Ruflo-Version, Installationsweg, Dateiauswirkungen und MCP-Tools erneut aktuell pruefen.
- [ ] 122.6.1a Ruflo-Orchestrierung mit Graph-RAG- oder Evidence-Paket-Kontext erst nach `V120.99` oder explizitem V120-`fixture-ready`-Gate planen; vorher nur isolierte Sandbox-Bewertung ohne Repo-Rueckschreibung.
- [ ] 122.6.2 Sandbox- oder separaten Worktree-Pfad definieren; kein Full-Init im aktiven Hauptrepo.
- [ ] 122.6.3 Zwei Testfragen ausfuehren: Architektur-Review und Testlueckenanalyse, jeweils mit vorherigem Repo-Memory-/Graph-Kontext.
- [ ] 122.6.4 Ergebnisse nur als Bericht oder proposed Memory behandeln; keine automatische Rueckschreibung.
- [ ] 122.6.5 Go/No-Go dokumentieren: Nutzen, Risiken, Version, Recovery-Pfad, erlaubte Einsatzfaelle.
- [ ] 122.6.6 Ruflo-Ausgaben gegen das Orchestration-Plan-Format spiegeln: Rolle, Quellen, Findings, Unsicherheiten, keine Repo-Write-Aktion.
- [ ] 122.6.7 Entscheiden, ob Ruflo nur als gelegentlicher externer Review-Layer bleibt oder ein spaeterer MCP-Adapter gerechtfertigt ist.

### 122.7 Optionaler Spiegel und Semantik-Backlog
status: open
goal: Spaetere Erweiterungen begrenzen statt sofort zu bauen
output: klare Folgeentscheidungen fuer Ruflo-Cache und semantische Suche

- [ ] 122.7.1 Regel fuer Repo -> Ruflo Spiegel definieren: selektiv, kurz, verified-only, niemals automatisch umgekehrt.
- [ ] 122.7.2 Semantische Suche nur als Backlog markieren und an V120-Outputs koppeln.
- [ ] 122.7.2a Semantische Memory-Suche nicht im CLI-MVP bauen; sie bleibt ein Folgepfad nach stabilem V120-Output.
- [ ] 122.7.3 Kriterien definieren, wann Embeddings noetig sind: Suchtrefferqualitaet, Memory-Groesse, Query-Latenz, Review-Aufwand.
- [ ] 122.7.4 Lokale Embedding-/Vector-Pfade nicht im MVP bauen.
- [ ] 122.7.5 Loesch-/Deprecation- und Source-Staleness-Report als spaeteres Wartungsfenster planen.

### 122.99 Abschluss-Gate
status: open
goal: Agent-Memory ist klein, pruefbar, nicht-kanonisch und Ruflo bleibt extern begrenzt
output: uebergabefaehiger Memory-/Orchestrierungs-Schnitt

- [ ] 122.99.1 Alle vorherigen Phasen sind abgeschlossen oder begruendet vertagt.
- [ ] 122.99.2 `npm run memory:check` ist gruen.
- [ ] 122.99.3 `npm run test:agent-memory` ist gruen, falls Tests eingefuehrt wurden.
- [ ] 122.99.4 `npm run check:agent-context` und `npm run plan:check` sind gruen.
- [ ] 122.99.5 Bei Governance-/MCP-/Ruflo-Diff ist `npm run gates:pre-commit` gruen oder blockerfest dokumentiert.
- [ ] 122.99.6 Abschlussnotiz nennt: Memory ist Hinweisindex, kanonische Quellen bleiben unveraendert, Ruflo ist optionaler externer Layer, keine automatische Rueckschreibung.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| Memory wird zur zweiten Wahrheit | hoch | Governance-Regel: Memory ist Hinweisindex; kanonische Quellen bleiben Rules, Plaene, Changelog, Findings und Graph |
| Agents speichern Vermutungen oder Arbeitsnotizen | hoch | Nur `add-proposed`, Check, Review, Statusmodell und Laengenlimits |
| Secrets oder Logs landen im Memory | hoch | Secret-Scanner, Excludes, kurze Summaries, keine Log-Dumps |
| Ruflo Full-Init erzeugt Governance-Drift | hoch | Sandbox zuerst, kein Full-Init im Hauptrepo, User-Gate fuer externe Tool-Initialisierung |
| Ruflo-Memory ueberschreibt Repo-Memory | hoch | Ruflo -> Repo nie automatisch; nur Bericht oder proposed Entry |
| V122 dupliziert V120 Graph-RAG | mittel | Memory bleibt kuratierter Index; semantische Suche erst spaeter und an V120 koppeln |
| Rollenprofile wirken wie neue Governance | mittel | V117 bleibt Quelle; Rollenprofile sind Tooling-Vertrag, nicht Regelquelle |
| Orchestration-Plan wird als Agent-Start-Automatik missverstanden | mittel | Validator startet keine Agents; User-Freigabe bleibt erforderlich |
| Zu viele Rollen erzeugen Koordinationsrauschen | mittel | MVP-Rollen begrenzen, neue Rollen nur mit wiederkehrendem Nutzen |
| Zu viel Meta-Arbeit statt Produktnutzen | mittel | MVP klein halten: CLI, Check, wenige Eintraege, messbarer Agenten-Nutzen |
| Source-Staleness fuehrt zu falschen Hinweisen | mittel | source_hash-Warnungen, deprecate/supersede, Review nach Quellaenderung |
| MCP-Schreibtools werden zu riskant | mittel | erster MCP read-only; Schreibtools nur spaeter als propose-only |

## Erfolgsmessung

| Signal | Ziel |
| --- | --- |
| Memory-Groesse im MVP | klein, kuratiert, keine Massensammlung |
| Search-Nutzwert | relevante Treffer fuer Architektur-/Runtime-/Training-/Governance-Fragen ohne Volltextlesen |
| Check-Nutzwert | invalides JSONL, Secrets, stale Quellen und zu lange Eintraege werden erkannt |
| Governance-Klarheit | Agent kann aus README/Rule erkennen, dass Memory nicht kanonisch ist |
| Rollenprofil-Nutzwert | Fuehrender Agent kann Delegation mit Rolle, Modus, Scope und Stopps knapp planen |
| Orchestrierungs-Sicherheit | Kein Tool startet Agents, schreibt Memory-verified oder registriert MCP ohne Gate |
| Ruflo-Nutzen | mindestens ein Review-Szenario liefert Mehrwert ohne Repo-Dateien unkontrolliert zu veraendern |
| Kontextbudget | komplexe Agentenstarts lesen weniger breite historische Plaene |

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V122`
- vorgeschlagene kanonische Datei nach Intake: `docs/plaene/aktiv/V122.md`
- hard dependencies: `V116.99`, `V117.99`, `V119.1`
- soft dependencies: `V120.99` fuer CLI-only Memory; hard gate fuer semantische Suche, Graph-RAG-Evidence-Pakete oder Ruflo-Orchestrierung mit RAG-Kontext
- Manuelle Uebernahme erforderlich: Dieser Draft darf nicht automatisch in den Master oder in `docs/plaene/aktiv/` uebernommen werden.
