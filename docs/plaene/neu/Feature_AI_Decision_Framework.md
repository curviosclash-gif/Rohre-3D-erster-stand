---
title: AI Decision Framework und Autonomie-Gates
status: draft
priority: P1
owner: user-intake
planned_block_id: V117
depends_on:
  - V109.99
affected_area: ai-governance-decision-quality
scope_files:
  - AGENTS.md
  - .agents/rules/planning_and_governance.md
  - .agents/rules/git_and_commits.md
  - .agents/rules/code_quality_and_debugging.md
  - .agents/rules/token_efficiency_and_tools.md
  - .agents/workflows/plan.md
  - .agents/workflows/code.md
  - .agents/workflows/quick.md
  - .agents/workflows/bugfix.md
  - docs/Umsetzungsplan.md
  - docs/plaene/neu/Feature_Repo_Context_Cleanup.md
  - docs/referenz/ai_project_onboarding.md
  - scripts/check-ai-decision-policy.mjs
---

# AI Decision Framework und Autonomie-Gates

## Kurzfassung

Dieser Plan fuehrt ein allgemeines Entscheidungsmodell fuer AI-Agenten ein. Er soll vor V116 aufgenommen werden, damit der anschliessende Repo-Kontext-Cleanup bereits unter repo-weiten Autonomie-, Evidence- und User-Gate-Regeln laeuft.

Ziel ist nicht mehr Governance um der Governance willen. Ziel ist, dass Agenten bessere, nachvollziehbare Entscheidungen treffen und bei riskanten Entscheidungen rechtzeitig stoppen.

## Ziel

- AI-Entscheidungen werden nach Risiko und Reversibilitaet klassifiziert.
- Agenten muessen ab riskanteren Klassen Evidenz, Confidence und Gegenargumente nennen.
- Plan-, Governance-, Archivierungs-, Dead-Code-, Rebuild- und Refactor-Entscheidungen erhalten klare User-Gates.
- Bestehende Regeln werden nicht ersetzt, sondern um eine Entscheidungslogik ergaenzt.
- Das Framework bleibt kurz genug, um tatsaechlich von Agenten gelesen und angewendet zu werden.

## Nicht-Ziele

- Kein neues paralleles Planungssystem.
- Kein Ersatz fuer `AGENTS.md`, `.agents/rules/`, `.agents/workflows/` oder `docs/Umsetzungsplan.md`.
- Keine automatische Entscheidung ueber Master-Intake, Planarchivierung, Code-Refactor oder Rebuild.
- Keine pauschale Pflicht zu langen Decision Logs fuer kleine Routineaenderungen.
- Keine Einschraenkung auf nur einen Agenten; die Regeln gelten fuer Codex, Gemini, Claude und vergleichbare Repo-Agenten.

## Abgrenzung zu V116

- V116: Repo-Kontext-Reduktion, Planarchiv-Hygiene, Agenten-Leseweg und Cleanup-Automatisierung.
- V117: Allgemeines Entscheidungsframework fuer alle AI-Arbeiten im Repo; wird vor V116 geplant, damit V116 nicht ohne Entscheidungsleitplanken ausgefuehrt wird.

V116 darf seine lokale AI-Ausfuehrungsmatrix behalten. V117 liefert die repo-weiten Entscheidungsregeln, auf die V116 als harte Voraussetzung verweisen soll.

## Geplante Reihenfolge

1. `V117` AI Decision Framework und Autonomie-Gates.
2. `V116` Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung.
3. `V118` Runtime-/UI-Entflechtung Slice 1.

## Entscheidungsklassen

| Klasse | Bedeutung | Beispiele | Default |
| --- | --- | --- | --- |
| D0 | Read-only | Status lesen, Reports erzeugen, Graph-Abfragen, Dry-Run | Agent darf ausfuehren |
| D1 | Reversible local | lokale Reports unter `tmp/`, nicht-getrackte Diagnoseartefakte | Agent darf ausfuehren, wenn klar begrenzt |
| D2 | Scoped repo change | kleine Docs-/Code-Aenderung mit klarem Scope und Gate | Agent darf ausfuehren, wenn Evidence und Scope klar sind |
| D3 | Source-of-truth / Governance | `AGENTS.md`, `.agents/rules/`, Workflows, Master-/Aktivplan-Struktur, Planarchivierung | Review oder User-Gate |
| D4 | High-blast-radius / destructive | Loeschungen, Auto-Move, Rebuild, grosse Refactors, produktive Parameter, History-/Git-Risiko | Immer User-Gate |

## Decision Requirements

### D0 und D1

- Kurz sagen, welcher Report oder Check erzeugt wird.
- Keine produktiven oder governance-relevanten Dateien aendern.
- Bei unerwartetem Diff stoppen.

### D2

- Scope benennen.
- Evidence nennen: relevante Datei, Plan, Graph, Test oder Contract.
- Confidence einschaetzen: `high`, `medium`, `low`.
- Kleinstes sinnvolles Gate nennen oder ausfuehren.
- Bei `medium` oder `low` Confidence vor Umsetzung nachfragen, wenn produktive Pfade betroffen sind.

### D3

- Mindestens zwei Quellen heranziehen.
- Alternativen nennen: konservativ vs. staerker automatisiert.
- Blast-Radius einschaetzen.
- User-Freigabe einholen, bevor Source-of-truth-Dateien geaendert werden.

### D4

- Immer stoppen und User fragen.
- Recovery-/Rollback-Pfad nennen.
- Keine Umsetzung ohne explizite Freigabe.
- Keine Buendelung mit anderen Delivery-Slices.

## Zwei-Quellen-Regel

Plan-, Archivierungs-, Dead-Code- und Legacy-Entscheidungen duerfen nicht aus einer einzelnen Quelle abgeleitet werden.

Beispiele fuer zulaessige Quellen:

- Master-Index `docs/Umsetzungsplan.md`
- aktive VXX-Frontmatter und DoD
- `docs/prozess/Open_Findings.md`
- Knowledge-Graph / `query-knowledge-graph`
- reale Runtime-Consumer
- Contract-/Targeted-Test
- Git-Tracking / Diff
- aktive Locks

Wenn Quellen widersprechen, gewinnt nicht automatisch die bequemere Quelle. Der Agent klassifiziert den Widerspruch und fragt nach.

## Blast-Radius-Check

Vor D2 bis D4 muss der Agent kurz einschaetzen:

- `files`: `1-2`, `few`, `many`
- `surface`: `docs`, `governance`, `runtime`, `tests`, `assets`, `build/generated`
- `reversibility`: `easy`, `medium`, `hard`
- `user-visible-risk`: `low`, `medium`, `high`

User-Gate ist Pflicht, wenn:

- `files=many`
- `surface=governance` und Source-of-truth betroffen ist
- `surface=runtime` plus `reversibility=hard`
- getrackte Dateien geloescht oder verschoben wuerden
- fremde uncommittete Aenderungen beruehrt wuerden

## Stop-Loss-Regeln

Agenten stoppen und fragen nach, wenn:

- ein unerwartetes Gate rot wird
- der Diff mehr Dateien betrifft als geplant
- Graph, Master, Findings oder Locks widersprechen
- getrackte Dateien geloescht oder verschoben wuerden
- `git status` fremde Aenderungen in betroffenen Dateien zeigt
- ein Cleanup-Skript mehr Klassen trifft als angekuendigt
- ein Refactor produktive Parameter, Physik, Bot-Training, Recording oder Multiplayer beruehrt
- ein Rebuild-/Reborn-Pfad entstehen soll

## Decision Log

Fuer D3/D4 und fuer strittige D2-Entscheidungen wird ein kurzer Eintrag erzeugt:

```text
Decision:
Class:
Chosen:
Evidence:
Alternatives:
Risk:
Fallback:
Gate:
```

Der Eintrag gehoert in die aktive Plan-Evidence, den relevanten Report oder `docs/plaene/CHANGELOG.md`, nicht in eine neue parallele Statusablage.

## Definition of Done

- [ ] DoD.1 Entscheidungsklassen D0-D4 sind in `.agents/rules/planning_and_governance.md` oder einer passenden zentralen Rule verankert.
- [ ] DoD.2 Workflows verweisen auf das Decision Framework, ohne normale kleine Tasks mit langen Formularen zu belasten.
- [ ] DoD.3 D3/D4-Entscheidungen verlangen Alternativen, Evidence, Blast-Radius und User-Gate.
- [ ] DoD.4 Stop-Loss-Regeln sind zentral dokumentiert und widersprechen nicht der Git-Safety-Policy.
- [ ] DoD.5 V116 verweist auf diesen Folgeplan, ohne seine lokale AI-Ausfuehrungsmatrix zu verlieren.
- [ ] DoD.6 Optionaler Check `check:ai-decision-policy` ist geplant oder bewusst verworfen.
- [ ] DoD.99 Abschluss-Gates fuer Governance-Scope sind gruen oder blockerfest dokumentiert.

## Phasen

### 117.1 Framework finalisieren

status: draft
goal: Entscheidungsklassen und Eskalationslogik fachlich fixieren.
output: Kompaktes Decision Framework fuer AI-Agenten.

- [ ] 117.1.1 D0-D4 Klassen final pruefen und Beispiele aus V116, Dead-Code, Planarchivierung, Rebuild und Refactor aufnehmen.
- [ ] 117.1.2 Confidence-, Evidence-, Zwei-Quellen- und Blast-Radius-Regeln auf kurze, agentenlesbare Form bringen.
- [ ] 117.1.3 Stop-Loss-Regeln gegen Git-Safety, Dead-Code-Governance und Test-Ownership abgleichen.

Gate:

- `npm run plan:check`

### 117.2 Governance integrieren

status: draft
goal: Zentrale Agents-Regeln ergaenzen, ohne die Workflows aufzublasen.
output: Repo-weite AI-Entscheidungsregel.

- [ ] 117.2.1 `.agents/rules/planning_and_governance.md` um Decision Framework oder Verweis ergaenzen.
- [ ] 117.2.2 `.agents/rules/git_and_commits.md` nur dann anpassen, wenn Recovery-/Rollback-Regeln unklar sind.
- [ ] 117.2.3 `.agents/workflows/plan.md`, `code.md`, `quick.md` und `bugfix.md` mit knappen Verweisen versehen, falls noetig.

Gate:

- `npm run plan:check`
- `npm run gates:pre-commit` bei Rule-/Workflow-Aenderungen

### 117.3 Check-Strategie

status: draft
goal: Entscheiden, ob ein maschineller Check sinnvoll ist.
output: Check-Plan oder bewusster Verzicht.

- [ ] 117.3.1 Pruefen, welche Regeln maschinell sinnvoll validierbar sind: verbotene Auto-Move-Claims, fehlende User-Gates, D4 ohne Freigabe, grosse Diffs ohne Blast-Radius.
- [ ] 117.3.2 Optional `scripts/check-ai-decision-policy.mjs` planen; zuerst nur Report, nicht blockierend.
- [ ] 117.3.3 Entscheiden, ob der Check eigenstaendig bleibt oder spaeter in `docs:check`/`gates:pre-commit` integriert wird.

Gate:

- `npm run plan:check`

### 117.99 Abschluss

status: draft
goal: Framework repo-weit nutzbar abschliessen.
output: Klare, leichte Entscheidungsmechanik fuer AI-Agenten.

- [ ] 117.99.1 Regeln, Workflows und V116-Verweise sind konsistent.
- [ ] 117.99.2 Abschluss-Evidence nennt Beispiele fuer D0-D4 und ihre jeweiligen User-Gates.
- [ ] 117.99.3 Kein neuer Schattenprozess oder neue parallele Statusablage wurde eingefuehrt.

Gate:

- `npm run gates:pre-commit`

## Risiko-Register

| Risiko | Schwere | Beschreibung | Gegenmassnahme |
| --- | --- | --- | --- |
| R1 | mittel | Framework wird zu schwerfaellig fuer kleine Tasks. | D0-D2 leicht halten; nur D3/D4 verlangen volle Decision-Form. |
| R2 | hoch | Agenten umgehen User-Gates durch zu niedrige Klassifikation. | Beispiele und Stop-Loss-Regeln klar machen; strengere Planmatrix gewinnt. |
| R3 | mittel | Decision Logs erzeugen neue Meta-Flut. | Nur fuer D3/D4 und strittige D2 verpflichtend. |
| R4 | mittel | Framework kollidiert mit bestehenden Workflows. | Bestehende Git-, Dead-Code- und Test-Ownership-Regeln bleiben fuehrend. |

## Vorgeschlagene Master-Intake-Daten

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V117`
- Titel: `AI Decision Framework und Autonomie-Gates`
- Status: `planned`
- Prioritaet: `P1`
- Owner: `frei`
- Hard dependencies: `V109.99`
- Soft dependencies: keine; V116 nutzt V117 als Folgebasis
- Current phase nach Intake: `117.1`
- Manuelle Uebernahme erforderlich: ja
