---
description: Roll back safely to an earlier state with plan sync.
---

## 0. Inspect

// turbo
- `git log -n 10 --oneline --decorate`. Confirm target commit with user.

## 1. Protect local work

- If needed: create a scoped safety commit or patch backup first; never use `git stash`.

## 2. Safe default rollback

```bash
git revert --no-commit <COMMIT>..HEAD
git commit -m "revert: rollback to <COMMIT>"
```

## 3. Destructive option (explicit approval only)

```bash
git reset --hard <COMMIT>
```

## 4. Sync plan

- Update the affected `docs/plaene/aktiv/VXX.md` phase checklist and evidence so runtime, plan, and tests stay aligned.
- Sync the compact index in `docs/Umsetzungsplan.md` only when block status, dependency state, owner, or `current_phase` changed.
- `git add [scoped-plan-files]` -> `chore: sync plan state after rollback`

## Report

Standardformat verwenden.
