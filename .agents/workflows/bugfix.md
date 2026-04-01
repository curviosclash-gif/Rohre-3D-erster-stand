---
description: Diagnose a reported issue and apply a targeted fix.
---

## 0. Capture issue

- Get exact symptom, timing, reproducibility, and error text.
- Ask follow-up only if missing data blocks diagnosis.

## 1. Analyze evidence

// turbo
- Check latest logs and error traces. Correlate timestamps.
- Extract likely failure path.

## 2. Find root cause

- Locate error pattern: `rg [pattern] src tests`.
- Validate cause with minimal reproduction.
- Note impacted files and side effects.

## 3. Fix

- Apply smallest safe change for root cause.
- If the user explicitly requests Playwright validation, do not run multiple Playwright suites concurrently on same repo/port/output directory.
- If concurrent bot validation is explicitly requested, assign unique `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`.
- Re-run `npm run build` when it is the smallest useful check. Focused tests via `.agents/test_mapping.md` only after explicit user request; otherwise hand the recommended test command to the user.

## 4. Governance + docs

// turbo
- If bugfix touches plans/workflows/rules: `npm run plan:check`.
- `npm run docs:sync && npm run docs:check`.

## 5. Commit (see AGENTS.md section Commit Convention)

- `git add [scoped-files]` -> `fix: [short reason]`
- Verify scope: `git diff --name-only`.

## Report

Standardformat verwenden.
