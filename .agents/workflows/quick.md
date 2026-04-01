---
description: Fast path for small, scoped changes without ceremony.
---
// turbo-all

## 1. Implement

- Apply change directly. Follow existing patterns.

## 2. Verify

- Run focused tests via `.agents/test_mapping.md` only after explicit user request.
- If no mapping matches for a requested run, recommend `npm run test:core` to the user instead of auto-running it.
- Without a test request, skip test execution and mark verification as user-owned.
- If plan/workflow/rule files changed: `npm run plan:check`.

## 3. Docs/process gate

- `npm run docs:sync && npm run docs:check`

## 4. Commit

- `git add [scoped-files]` -> `[type]: [short reason]`
- Verify scope: `git diff --name-only`.
