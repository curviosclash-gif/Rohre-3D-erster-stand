# CLAUDE.md - Router fuer Claude Code

> Verbindliche Governance: `AGENTS.md` und `.agents/rules/*`.
> Diese Datei routet nur und definiert keine eigene Policy. Bei Widerspruch gewinnen AGENTS.md und die Rules.

## Leseweg (identisch zu AGENTS.md)

1. `AGENTS.md`
2. passende Rule in `.agents/rules/`
3. passender Workflow in `.agents/workflows/`
4. `docs/generated/plan-index.json` als kompakter, nicht-kanonischer Einstieg
5. `docs/Umsetzungsplan.md` als kanonischer Master-Index (gewinnt bei Konflikt)
6. genau eine `docs/plaene/aktiv/VXX.md` fuer Blockdetails

## Claude-Code-spezifische Startpunkte

- Harness-Tools (Glob/Grep/Read/Edit) statt Shell-Aequivalente; Lese-Budget fuer VXX.md beachten -> `.agents/rules/token_efficiency_and_tools.md`
- Git-Safety: kein `git stash`, kein `git add -A`, keine destruktiven Kommandos ohne Freigabe -> `.agents/rules/git_and_commits.md`
- Windows: vor Staging einmal `npm run git:acl:heal`; Commits ueber `npm run agent:commit -- ...`
- Tests sind user-owned; kleinste sinnvolle Verifikation statt Vollsuiten -> `.agents/rules/planning_and_governance.md`
- Scope-/Impact-Fragen zuerst per Graph: `npm run graph:query` bzw. `node scripts/query-knowledge-graph.mjs`
