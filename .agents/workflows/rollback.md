---
description: Roll back safely to an earlier state with plan sync.
---

## 0. Inspect

// turbo
- `git log -n 10 --oneline --decorate`. Confirm target commit with user.

## 1. Protect local work

- If needed: `git stash push -m "rollback backup"`.

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

- Update `docs/Umsetzungsplan.md` phases that are no longer done.
- `git add docs/Umsetzungsplan.md` → `chore: sync plan after rollback`

## Report

Standardformat verwenden.
