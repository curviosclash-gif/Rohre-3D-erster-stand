---
description: Quick project status snapshot.
---
// turbo-all

## 1. Plan status

- Read `docs/Umsetzungsplan.md` and `docs/Bot_Trainingsplan.md`.
- Identify next open phase and dependency blockers for both master plans.
- Run `npm run plan:check`.

## 2. Git state

- `git log -n 5 --oneline --decorate`
- `git status --short`
- `git branch -a`

## 3. Output

- Next phase, open dependencies, lock status, uncommitted changes, active branches.
- If documentation/process drift suspected: `npm run docs:sync && npm run docs:check`.

## Report

Standardformat verwenden.
