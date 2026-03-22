---
description: Fast path for small, scoped changes without ceremony.
---
// turbo-all

## 1. Implement

- Apply change directly. Follow existing patterns.

## 2. Verify

- Run focused tests via `.agents/test_mapping.md`.
- Fallback: `npm run test:core`.
- If plan/workflow/rule files changed: `npm run plan:check`.

## 3. Docs/process gate

- `npm run docs:sync && npm run docs:check`

## 4. Commit

- `git add [scoped-files]` -> `[type]: [short reason]`
- Verify scope: `git diff --name-only`.
