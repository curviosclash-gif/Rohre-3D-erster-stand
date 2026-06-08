---
description: Create a quick safety checkpoint before edits.
decision_floor: D2
mutates: optional
user_gate: conditional
commit_strategy: scoped
required_checks: []
outputs:
  - repo-change
  - commands
---

## 1. Preferred backup

- `git add [scoped-files]` -> `WIP: [context]`
- Confirm scope with `git diff --name-only`.

## 2. Optional extra backup

// turbo
- `powershell -File backup.ps1`

## 3. Temporary alternative

- Export a scoped patch backup instead of stashing:
  - `git diff -- [scoped-files] > backup-session.patch`
  - Restore later with `git apply backup-session.patch`

## 4. Restore single file

// turbo
- `git restore --source=HEAD -- src/PATH/FILE.js`
