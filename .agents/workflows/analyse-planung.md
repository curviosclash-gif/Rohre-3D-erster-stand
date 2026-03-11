---
description: Run full test analysis, persist results, and update prioritized action plan.
---

## 0. Context (skip for focused re-runs)

// turbo
- Read `docs/Umsetzungsplan.md` and latest `docs/Analysebericht.md`.

## 1. Execute and persist

- Use `.agents/test_mapping.md` to select commands based on changed paths.
- Always run core tests; specialized tests (GPU, physics, stress) only if relevant or at milestones.
- Extra smoke: `npm run smoke:roundstate`, `npm run smoke:selftrail`.
- Save to `docs/Testergebnisse_YYYY-MM-DD.md` with per-test `PASS`/`FAIL`/`WARN`.

## 2. Analyze deltas

- Compare against previous `docs/Analysebericht.md`.
- Document only: new issues, regressions, resolved items.

## 3. Update master plan

- Sync findings into `docs/Umsetzungsplan.md`.
- Keep completed items for history. Use checkbox format: `## Phase X: [ ] Title`.

## 4. Final consistency

- No uncovered findings between test report, analysis, and plan.
- Keep `/fix-planung` compatibility.

## Report

Standardformat verwenden.
