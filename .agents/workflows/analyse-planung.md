---
description: Run full test analysis, persist results, and update prioritized action plan.
---

## 0. Context (skip for focused re-runs)

// turbo
- Use this workflow only after explicit user request for test execution/analysis or when the user provides fresh test results.
- Read `docs/Umsetzungsplan.md` and latest `docs/Analysebericht.md`.

## 1. Execute and persist

- Use `.agents/test_mapping.md` to select commands based on changed paths.
- Run core, specialized, and smoke tests only after explicit user request.
- Extra smoke commands, when requested: `npm run smoke:roundstate`, `npm run smoke:selftrail`.
- Save user-provided or explicitly requested results to `docs/tests/Testergebnisse_YYYY-MM-DD.md` with per-test `PASS`/`FAIL`/`WARN`.

## 2. Analyze deltas

- Compare against previous `docs/Analysebericht.md`.
- Document only: new issues, regressions, resolved items.

## 3. Update follow-up plan (external)

- Sync findings into an external follow-up plan in `docs/plaene/neu/` (for example `docs/plaene/neu/Analyse_Followup_YYYY-MM-DD.md`).
- Do not create or update planning scopes directly in `docs/Umsetzungsplan.md`.
- Add intake notes for manual transfer by the user (target block, dependencies, risk).

## 4. Final consistency

- No uncovered findings between test report, analysis, and plan.
- Keep `/fix-planung` compatibility.

## Report

Standardformat verwenden.

