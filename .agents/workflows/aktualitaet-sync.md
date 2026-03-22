---
description: Check and auto-update docs/workflows/rules to current repository reality.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/Bot_Trainingsplan.md`, `docs/Analysebericht.md`, latest `docs/Testergebnisse_*.md`.
- `git log -n 5 --oneline`.

## 1. Auto-sync

// turbo
- `npm run docs:sync`
- Review findings in `docs/Dokumentationsstatus.md`.

## 2. Resolve remaining drift

- Update affected files for legacy-path findings and missing required files.
- Re-run `npm run docs:sync` after each fix.

## 3. Validate governance + docs

// turbo
- `npm run plan:check`
- `npm run docs:check`

## 4. Commit

- `git add docs/ .agents/ scripts/validate-umsetzungsplan.mjs package.json` (only what changed)
- `git commit -m "docs: sync documentation and plan governance"`

## 5. Optional reality checks

// turbo
- `npm run smoke:roundstate` and `npm run smoke:selftrail` (if docs claim stability).

## Gate

- `npm run plan:check` PASS.
- `npm run docs:check` PASS.
- `docs/Dokumentationsstatus.md` reflects current date.

## Report

Standardformat verwenden.
