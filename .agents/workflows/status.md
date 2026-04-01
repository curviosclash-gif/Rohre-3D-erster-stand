---
description: Quick project status snapshot.
---
// turbo-all

## 1. Plan status

- Read `docs/Umsetzungsplan.md` and `docs/bot-training/Bot_Trainingsplan.md`.
- Identify next open phase and dependency blockers for both master plans.
- Check pending external intake plans in `docs/plaene/neu/`.
- Run `npm run plan:check`.

## 2. Git state

- `git log -n 5 --oneline --decorate`
- `git status --short`
- `git branch -a`

## 3. Output

- Next phase, open dependencies, lock status, uncommitted changes, active branches.
- Highlight desktop-app priorities and any intentional gaps versus the online demo.
- List pending external plans waiting for manual intake.
- If documentation/process drift suspected: `npm run docs:sync && npm run docs:check`.

## Report

Standardformat verwenden.

