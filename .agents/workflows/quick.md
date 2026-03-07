---
description: Fast path for small, scoped changes without ceremony.
---

## 1. Implement

- Apply change directly.
- Follow existing patterns.

## 2. Verify

- Run focused tests via `.agents/test_mapping.md`.
- If no mapping matches: `npm run test:core`.

## 3. Commit

```bash
git add [scoped-files]
git commit -m "[type]: [short reason]"
```

- Verify scope: `git diff --name-only`.
