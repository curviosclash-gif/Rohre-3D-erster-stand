---
description: Restructure code without changing behavior.
---

## 0. Scope

- Identify module and refactor objective. Confirm no behavior change.

## 1. Baseline

// turbo
- Run baseline tests and store result.

## 2. Refactor

- Reduce duplication and long functions. Clarify module boundaries and naming.

## 3. Verify

// turbo
- Re-run baseline tests. Compare; investigate regressions immediately.

## 4. Commit (see AGENTS.md §Commit Convention)

- `git add [scoped-files]` → `refactor: [scope] - [reason]`
- Verify scope: `git diff --name-only`.

## Report

Standardformat verwenden.
