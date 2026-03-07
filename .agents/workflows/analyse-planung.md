---
description: Run full test analysis, persist results, and update prioritized action plan.
---

## 0. Context (optional – skip for focused re-runs)

- Read `docs/Umsetzungsplan.md`.
- Read latest `docs/Analysebericht.md` if present.

## 1. Test mapping (source of truth)

- Use `.agents/test_mapping.md` to select commands based on changed paths.
- Extra smoke: `npm run smoke:roundstate`, `npm run smoke:selftrail`.

## 2. Execute and persist

- Run mapped commands sensibly. Always run core tests, but run specialized tests (GPU, physics, stress) only if relevant to recent changes or during a major milestone.
- Save raw outcome to `docs/Testergebnisse_YYYY-MM-DD.md`.
- Use per-test status: `PASS` / `FAIL` / `WARN`.

## 3. Analyze deltas only

- Compare against previous `docs/Analysebericht.md`.
- Document only: new issues, regressions, resolved items.

## 4. Update master plan

- Sync findings into `docs/Umsetzungsplan.md`.
- Keep completed items for history.
- Ensure phase headers use checkbox format: `## Phase X: [ ] Title`.

## 5. Final consistency check

- No uncovered findings between test report, analysis, and plan.
- Keep `/fix-planung` compatibility.

## Report

Standardformat verwenden.
