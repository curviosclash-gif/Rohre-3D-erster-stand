# AGENTS.md

Orientierung fuer alle Agents. Details liegen in den verlinkten Rules und Workflows.

## Leseweg

1. `AGENTS.md` (diese Datei)
2. passende Rule in `.agents/rules/`
3. passenden Workflow in `.agents/workflows/`
4. `docs/generated/plan-index.json` in der V123-Pilotphase als kompakter, generierter Einstieg fuer Blockstatus, Workstream und Lock-Projektion, sofern kein Drift bekannt ist.
5. `docs/Umsetzungsplan.md` bleibt bis zur expliziten Source-of-Truth-Migration kanonischer Master-Index; bei Konflikt gewinnt der Master.
6. Genau eine passende `docs/plaene/aktiv/VXX.md` fuer Blockdetails; Plan-Historie und Abgleich-Fliesstext in `docs/plaene/CHANGELOG.md` nur bei konkretem Evidence-, Drift- oder Abgleichsbedarf.

## Rule-Quellen (Einzelquelle je Thema)

- `.agents/rules/planning_and_governance.md` - Plan- und Gate-Governance, Closure-Gates, Test-Ownership
- `.agents/rules/git_and_commits.md` - Git-Safety, Branch-Policy, Commit-Granularitaet
- `.agents/rules/code_quality_and_debugging.md` - Code-Qualitaet, Debugging, Performance, Lifecycle
- `.agents/rules/token_efficiency_and_tools.md` - Token-Effizienz, Harness-Tools, Lese-Budget
- `.agents/rules/product_focus.md` - Desktop-first Produktfokus

Policy-Details werden nicht in AGENTS.md wiederholt. Bei Konflikt gewinnt die Rule.

## Workflow-Auswahl

| Aufgabe | Workflow |
| --- | --- |
| Feature-Planung | `.agents/workflows/plan.md` |
| Feature-Umsetzung (Blockscope) | `.agents/workflows/code.md` |
| Kleiner Scope, 1-2 Dateien | `.agents/workflows/quick.md` |
| Bugfix | `.agents/workflows/bugfix.md` |
| Testanalyse / Regressionsauswertung | `.agents/workflows/analyse-planung.md` |
| Phasenausfuehrung aus Master | `.agents/workflows/fix-planung.md` |
| Bot-Training | `.agents/workflows/bot-training-plan.md` |
| Freshness-Check/Sync | `.agents/workflows/aktualitaet-check.md` / `aktualitaet-sync.md` |
| Abschlussanalyse letzter Plan | `.agents/workflows/abschluss-analyse.md` |
| Cleanup/Refactor/Release | passender Workflow in `.agents/workflows/` |

## Plan-Einstieg

- `docs/Umsetzungsplan.md` ist nur der kompakte Master-Index.
- `docs/generated/plan-index.json` ist in der V123-Pilotphase ein generierter, nicht-kanonischer Index fuer schnelle AI-Kontextwahl.
- Der strukturierte Index ersetzt keine Master-, Status-, Phasen- oder Lock-Entscheidung; bei Abweichung gewinnt `docs/Umsetzungsplan.md`.
- Kanonische Blockdetails: `docs/plaene/aktiv/VXX.md` (DoD, Risiken, `scope_files`, Phasen).
- Neue Intake-Entwuerfe: `docs/plaene/neu/`. Intake in den Master bleibt User-owned.
- Bot-Training: `docs/bot-training/Bot_Trainingsplan.md`.

## Defaults

- Antworten kurz, ohne abschliessende Summaries (der User sieht Diff und Tool-Output).
- Ergebnisse parallel holen, wenn unabhaengig.
- Abgeschlossene Aufgaben mit verifizierten Repo-Aenderungen standardmaessig im selben Turn sinnvoll committen; nur offen lassen, wenn der User explizit keinen Commit will oder ein echter Blocker besteht.
- Zu eigenen Abschluss-Commits immer auch kurze erklaerende Notizen hinterlassen: planbezogen im Block/`docs/plaene/CHANGELOG.md`, sonst mindestens im passenden Governance-/Status-Kontext.
- Kein Plan-Mode fuer kleine Tasks.
