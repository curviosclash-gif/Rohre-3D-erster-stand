---
description: Run full test analysis, persist results, and update prioritized action plan.
decision_floor: D0
mutates: optional
user_gate: conditional
commit_strategy: scoped
required_checks:
  - npm run plan:check
outputs:
  - report
  - repo-change
---

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/token_efficiency_and_tools.md`.

## 0. Context (skip for focused re-runs)

// turbo
- Use this workflow only after explicit user request for test execution/analysis or when the user provides fresh test results.
- Read `docs/Umsetzungsplan.md` and, when useful for historical comparison, `docs/archive/Analysebericht.md`.
- Abgrenzung: Dieser Workflow analysiert Tests, Testluecken und Regressionen. Abschlussclaims zu einzelnen Planbloecken gehoeren in `.agents/workflows/abschluss-analyse.md`; reine Docs-/Workflow-/Rule-Frische in `.agents/workflows/aktualitaet-check.md`.
- Keine Checkboxen, Statusfelder, Abschlussnotizen oder PASS-Claims nachtraeglich setzen, solange nur Analyse oder Planung angefordert ist.

## 1. Execute and persist

- Use `.agents/test_mapping.md` to select commands based on changed paths.
- Testauswahl begruenden: betroffene Pfade, passende Mapping-Zeile, gewaehlter Command und bewusst nicht gelaufene naheliegende Commands.
- Run core, specialized, and smoke tests only after explicit user request.
- Extra smoke commands, when requested: `npm run smoke:roundstate`, `npm run smoke:selftrail`.
- Save user-provided or explicitly requested results to `docs/tests/Testergebnisse_YYYY-MM-DD.md` with per-test `PASS`/`FAIL`/`WARN`.

## 2. Analyze deltas

- Compare against the previous analysis artifact (default historical baseline: `docs/archive/Analysebericht.md`).
- Document only: new issues, regressions, resolved items, and whether findings block the desktop app or only the online demo.
- Findings nach `P0`/`P1`/`P2`/`P3` sortieren und zusaetzlich als `blocker`, `follow-up`, `doc-only` oder `test-gap` markieren.
- Jede Finding-Evidence muss mindestens einen Test, eine Datei, einen Commit, eine Graph-Query oder eine Planstelle nennen.
- Jede Finding muss falsifizierbar sein: `Evidence`, `Produktpfad`, `Repro/Reasoning`, `Gegenbeweis`, `Confidence` und `Lifecycle` nennen.
- `P0`/`P1` brauchen zwei voneinander unabhaengige Quellen, z. B. `Test + Code`, `Git + Plan`, `Graph + Code` oder `Test + Plan`. Mit nur einer Quelle hoechstens als `P2` oder `low confidence` berichten.
- `P0`/`P1` brauchen zusaetzlich `Trace: Signal -> Ursache -> Consumer -> Produktwirkung -> Gegenprobe`.
- False-Positive-Bremse: Demo-/Test-/Doku-only, bereits dokumentierte Nicht-Ziele, fehlende Konsumenten oder nicht reproduzierbare Theorie ausdruecklich abgrenzen.

## 3. Wissensgraph pruefen

Der Wissensgraph ist Pflicht, sobald Testbefunde, Scope-Dateien, ein `VXX`-Block, Dependencies, Coverage oder Desktop-vs-Demo-Wirkung beruehrt werden. Nur bei rein externen oder nicht dateibezogenen Testergebnissen darf der Graph mit Begruendung uebersprungen werden.

| Signal | Graph-Query | Ergebnis nutzen fuer |
| --- | --- | --- |
| Graph-Frische | `npm run graph:check` | Graph-Confidence und Stale-/Diff-Findings |
| Testfail in Datei | `node scripts/query-knowledge-graph.mjs impact-for-file <path> --json` | betroffene Konsumenten, kritische Pfade, Folgechecks |
| `VXX`-Blockbezug | `node scripts/query-knowledge-graph.mjs open-deps VXX --json` | harte Dependencies und Blocker-Risiko |
| Scope-/Lock-Risiko | `node scripts/query-knowledge-graph.mjs scope-collisions --json` | parallele Scope-Konflikte und Intake-Ziel |
| Coverage-/Testluecke | `node scripts/query-knowledge-graph.mjs coverage-report` | `test-gap`-Priorisierung |
| Runtime-naher Befund | `node scripts/query-knowledge-graph.mjs critical-path-health` | Desktop-/Hotpath-Risiko |
| Event-/Flow-Befund | `node scripts/query-knowledge-graph.mjs event-flow spawn|combat-hit|round-end|settings` | Flow-spezifische Regressionen |

- Wenn `graph:check` rot ist, Analyse fortsetzen, aber Graph-Aussagen als `graph-low` markieren und nicht als alleinige harte Wahrheit verwenden.
- Graph-Findings erhalten dieselbe `P0`-`P3`-Schwere wie Test-/Plan-Findings plus `graph-high`, `graph-medium` oder `graph-low`.
- Generierte Graph-Artefakte (`docs/generated/knowledge-graph*.json`) nur lesen; keine automatische Reparatur oder manuelle Editierung in diesem Workflow.

## 4. Finding-Lifecycle

- `P0`/`P1` + `blocker`: nicht in Sammel-Follow-ups verstecken; als Bugfix-, Blocker-Report- oder dedizierten Plan-Intake vorschlagen.
- `P2` + `follow-up`: in `docs/plaene/neu/Analyse_Followup_YYYY-MM-DD.md` oder einen passenden vorhandenen Intake-Draft spiegeln, nur nach User-Gate.
- `doc-only`: als Doku-/Governance-Slice klassifizieren; keine produktive Codearbeit daraus ableiten.
- `test-gap`: naechstliegendes Testmapping, Zielblock oder Follow-up nennen; nicht gelaufene Tests bleiben `not-checked`.
- `graph-low`: vor Umsetzungsentscheidung ein frisches Graph-Signal oder eine nicht-Graph-Evidence verlangen.

## 5. Update follow-up plan (external)

- Sync findings into an external follow-up plan in `docs/plaene/neu/` (for example `docs/plaene/neu/Analyse_Followup_YYYY-MM-DD.md`).
- Do not create or update planning scopes directly in `docs/Umsetzungsplan.md`.
- Add intake notes for manual transfer by the user (target block, dependencies, risk).
- Graph-/Dependency-/Impact-Hinweise in Intake-Notizen uebernehmen, wenn sie die Priorisierung oder den Zielblock beeinflussen.

## 6. Final consistency

- No uncovered findings between test report, analysis, and plan.
- Keep `/fix-planung` compatibility.
- Keine nicht gelaufenen Tests als `PASS` zaehlen; deferred Tests mit Grund und Risiko nennen.
- Report muss immer `Not-checked:` oder eine gleichwertige Begrenzung enthalten.
- Report muss `Testauswahl:` enthalten, sobald `.agents/test_mapping.md` beruehrt oder ausgewertet wurde.
- Wenn eine Datei geschrieben wurde, im Final den Pfad nennen. Wenn keine Datei geschrieben wurde, Findings direkt im Chat ausgeben.

## Report

Standardformat:

```text
Analyseplanung: <YYYY-MM-DD oder Scope>
Confidence: high|medium|low
Quellen: <Testergebnisse>, <Plan/Archiv>, <Graph/Git falls genutzt>

Kurzfazit:
- <1-3 Saetze>

Findings:
- [P1][blocker|follow-up|doc-only|test-gap] <Titel> - <Evidence> - <Risiko>
  Evidence: <Test|Datei|Commit|Graph-Query|Planstelle>
  Produktpfad: <Desktop|Browser-Demo|Test|Doku|unklar>
  Repro/Reasoning: <wie nachvollzogen>
  Gegenbeweis: <welcher Befund wuerde das Finding entkraeften>
  Confidence: high|medium|low
  Trace: <Signal -> Ursache -> Consumer -> Produktwirkung -> Gegenprobe, Pflicht fuer P0/P1>

Testauswahl:
- Mapping: <Pfad -> .agents/test_mapping.md-Zeile/Klasse>
- Gewaehlt: <Command oder SKIPPED mit Grund>
- Naheliegend nicht gelaufen: <Command/Risiko oder none>

Wissensgraph:
- Graph-Status: <graph:check PASS|WARN|FAIL|SKIPPED>, Confidence: <graph-high|graph-medium|graph-low|n/a>
- Queries: <impact-for-file, open-deps, scope-collisions, coverage-report, ...>
- Graph-Findings: <P0-P3 oder none>

Follow-up:
- Zielblock/Intake: <VXX oder docs/plaene/neu/...>
- Dependencies/Risiko: <kurz>
- Lifecycle: <bugfix|blocker-report|intake|doc-slice|testmapping|none>
- Kleinstes Gate: <plan:check|gates:pre-commit|gezielter Test>

Not-checked:
- <bewusst nicht gepruefte Tests/Pfade und Restrisiko>

Ausgefuehrte Checks:
- <command> -> PASS|FAIL|WARN|SKIPPED
```
