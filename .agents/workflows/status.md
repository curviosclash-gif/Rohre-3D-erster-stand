---
description: Quick project status snapshot.
---
// turbo-all

## 1. Plan status

- Read `docs/Umsetzungsplan.md` and bei Bot-Training-Scope `docs/bot-training/Bot_Trainingsplan.md`.
- If available, read `docs/generated/knowledge-graph.json` first for dependency/scope/surface questions.
- Determine the actually relevant active block ID from `docs/Umsetzungsplan.md` first, then run graph queries for that block:
  - `node scripts/query-knowledge-graph.mjs open-deps <active-block-id> --json`
  - `node scripts/query-knowledge-graph.mjs scope-collisions --json`
- For runtime-impact or graph-health status, use the V107 query layer before free-text scans:
  - `node scripts/query-knowledge-graph.mjs critical-path-health`
  - `node scripts/query-knowledge-graph.mjs coverage-report`
  - `node scripts/query-knowledge-graph.mjs impact-for-file <path> --json`
  - `node scripts/query-knowledge-graph.mjs event-flow spawn|combat-hit|round-end|settings`
- Identify next open phase and dependency blockers.
- Check pending external intake plans in `docs/plaene/neu/`.
- Run `npm run plan:check`.

## 2. Git state

- `git log -n 5 --oneline --decorate`
- `git status --short`
- `git branch -a`

## 3. Output

- Next phase, open dependencies, lock status, uncommitted changes, active branches.
- Include graph-query findings for open deps and scope collisions when graph data exists.
- Include runtime health, coverage gate, or event-flow findings when the status question touches runtime impact, tests, or critical desktop paths.
- Highlight desktop-app priorities and intentional demo limitations.
- List pending external plans waiting for manual intake.
- Keep output compact and action-oriented; keine neue Meta-Arbeit erfinden.
- Nur bei konkretem Drift-Signal `npm run docs:sync && npm run docs:check` empfehlen.

## Report

Standardformat verwenden.
