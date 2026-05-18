---
description: Run full test analysis, persist results, and update prioritized action plan.
---

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/token_efficiency_and_tools.md`.

## 0. Context (skip for focused re-runs)

// turbo
- Use this workflow only after explicit user request for test execution/analysis or when the user provides fresh test results.
- Read `docs/Umsetzungsplan.md` and, when useful for historical comparison, `docs/archive/Analysebericht.md`.
- Abgrenzung: Dieser Workflow analysiert Tests und daraus folgende Plan-/Scope-Risiken; Abschlussclaims zu einzelnen Planbloecken gehoeren in `.agents/workflows/abschluss-analyse.md`.
- Keine Checkboxen, Statusfelder, Abschlussnotizen oder PASS-Claims nachtraeglich setzen, solange nur Analyse oder Planung angefordert ist.

## 1. Execute and persist

- Use `.agents/test_mapping.md` to select commands based on changed paths.
- Run core, specialized, and smoke tests only after explicit user request.
- Extra smoke commands, when requested: `npm run smoke:roundstate`, `npm run smoke:selftrail`.
- Save user-provided or explicitly requested results to `docs/tests/Testergebnisse_YYYY-MM-DD.md` with per-test `PASS`/`FAIL`/`WARN`.

## 2. Analyze deltas

- Compare against the previous analysis artifact (default historical baseline: `docs/archive/Analysebericht.md`).
- Document only: new issues, regressions, resolved items, and whether findings block the desktop app or only the online demo.
- Findings nach `P0`/`P1`/`P2`/`P3` sortieren und zusaetzlich als `blocker`, `follow-up`, `doc-only` oder `test-gap` markieren.
- Jede Finding-Evidence muss mindestens einen Test, eine Datei, einen Commit, eine Graph-Query oder eine Planstelle nennen.

## 3. Wissensgraph pruefen

Der Wissensgraph ist Pflicht, sobald Testbefunde, Scope-Dateien, ein `VXX`-Block, Dependencies, Coverage oder Desktop-vs-Demo-Wirkung beruehrt werden. Nur bei rein externen oder nicht dateibezogenen Testergebnissen darf der Graph mit Begruendung uebersprungen werden.

- `npm run graph:check` ausfuehren oder bei rein read-only/stale Graph als `graph:check -> WARN/FAIL` dokumentieren.
- Bei betroffenen Dateien: `node scripts/query-knowledge-graph.mjs impact-for-file <path> --json`.
- Bei Blockbezug: `node scripts/query-knowledge-graph.mjs open-deps VXX --json`.
- Bei Scope-Risiko: `node scripts/query-knowledge-graph.mjs scope-collisions --json`.
- Bei Coverage-/Testluecken: `node scripts/query-knowledge-graph.mjs coverage-report`.
- Bei runtime-nahem Befund: `node scripts/query-knowledge-graph.mjs critical-path-health`.
- Bei Event-/Flow-Befund: `node scripts/query-knowledge-graph.mjs event-flow spawn|combat-hit|round-end|settings`.
- Graph-Findings erhalten dieselbe `P0`-`P3`-Schwere wie Test-/Plan-Findings plus `graph-high`, `graph-medium` oder `graph-low`.
- Generierte Graph-Artefakte (`docs/generated/knowledge-graph*.json`) nur lesen; keine automatische Reparatur oder manuelle Editierung in diesem Workflow.

## 4. Update follow-up plan (external)

- Sync findings into an external follow-up plan in `docs/plaene/neu/` (for example `docs/plaene/neu/Analyse_Followup_YYYY-MM-DD.md`).
- Do not create or update planning scopes directly in `docs/Umsetzungsplan.md`.
- Add intake notes for manual transfer by the user (target block, dependencies, risk).
- Graph-/Dependency-/Impact-Hinweise in Intake-Notizen uebernehmen, wenn sie die Priorisierung oder den Zielblock beeinflussen.

## 5. Final consistency

- No uncovered findings between test report, analysis, and plan.
- Keep `/fix-planung` compatibility.
- Keine nicht gelaufenen Tests als `PASS` zaehlen; deferred Tests mit Grund und Risiko nennen.
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

Wissensgraph:
- Graph-Status: <graph:check PASS|WARN|FAIL|SKIPPED>, Confidence: <graph-high|graph-medium|graph-low|n/a>
- Queries: <impact-for-file, open-deps, scope-collisions, coverage-report, ...>
- Graph-Findings: <P0-P3 oder none>

Follow-up:
- Zielblock/Intake: <VXX oder docs/plaene/neu/...>
- Dependencies/Risiko: <kurz>
- Kleinstes Gate: <plan:check|gates:pre-commit|gezielter Test>

Ausgefuehrte Checks:
- <command> -> PASS|FAIL|WARN|SKIPPED
```
