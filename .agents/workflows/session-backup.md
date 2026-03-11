---
description: Create a quick safety checkpoint before edits.
---

## 1. Preferred backup

- `git add [scoped-files]` → `WIP: [context]`
- Confirm scope with `git diff --name-only`.

## 2. Optional extra backup

// turbo
- `powershell -File backup.ps1`

## 3. Temporary alternative

- `git stash push -m "WIP: [context]"` / `git stash pop`

## 4. Restore single file

// turbo
- `git restore --source=HEAD -- src/PATH/FILE.js`
