---
description: Create a quick safety checkpoint before edits.
---

## 1. Preferred backup

```bash
git add [scoped-files]
git commit -m "WIP: [context]"
```

- Confirm scope with `git diff --name-only` before creating WIP commit.

## 2. Optional extra backup

```bash
powershell -File backup.ps1
```

- Push only after confirming there are no unrelated changes in the commit.

## 3. Temporary alternative

```bash
git stash push -m "WIP: [context]"
git stash pop
```

## 4. Restore single file safely

```bash
git restore --source=HEAD -- src/PATH/FILE.js
```

