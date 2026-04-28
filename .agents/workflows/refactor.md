---
description: Restructure code without changing behavior.
---

## 0. Scope

- Identify module and refactor objective. Confirm no behavior change.

## 1. Baseline

// turbo
- Capture baseline behavior from existing code, docs, or user-provided test evidence. Run baseline tests only after explicit user request.

## 2. Refactor

- Reduce duplication and long functions.
- Clarify module boundaries and naming.
- If the refactor reveals suspected dead code, classify it but do not delete it without replacement proof.
- When a new structure replaces an old path, migrate active consumers and document the remaining delete criterion.

## 3. Verify

// turbo
- Re-run baseline tests only after explicit user request. Otherwise document the recommended regression checks for the user.
- If refactor touches plans/workflows/rules: `npm run plan:check`.
- `npm run docs:sync && npm run docs:check`.

## 4. Commit (see AGENTS.md section Commit Convention)

- `git add [scoped-files]` -> `refactor: [scope] - [reason]`
- Verify scope: `git diff --name-only`.

## Report

Standardformat verwenden.
