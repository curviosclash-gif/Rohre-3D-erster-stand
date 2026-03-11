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
- Re-run relevant checks: `npm run build` + focused tests via `.agents/test_mapping.md`.

## 4. Commit (see AGENTS.md §Commit Convention)

- `git add [scoped-files]` → `fix: [short reason]`
- Verify scope: `git diff --name-only`.

## Report

Standardformat verwenden.
