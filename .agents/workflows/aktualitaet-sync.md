---
description: Check and auto-update docs/workflows/rules to current repository reality.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/bot-training/Bot_Trainingsplan.md`, `docs/Analysebericht.md`, latest `docs/tests/Testergebnisse_*.md`.
- `git log -n 5 --oneline`.
- `npm run guard:main`.

## 1. Auto-sync

// turbo
- `npm run docs:sync`
- Review findings in `docs/prozess/Dokumentationsstatus.md`.

## 2. Resolve remaining drift

- Update affected files for legacy-path findings, missing required files, and stale wording that treats online/browser as equal to the desktop app.
- Re-run `npm run docs:sync` after each fix.

## 3. Validate governance + docs

// turbo
- `npm run plan:check`
- `npm run docs:check`

## 4. Commit

- `npm run guard:main`
- `git add docs/ .agents/ scripts/validate-umsetzungsplan.mjs package.json` (only what changed)
- `git commit -m "docs: sync documentation and plan governance"`
- Before push on `main`: `npm run snapshot:tag`

## 5. Optional reality checks

// turbo
- `npm run smoke:roundstate` and `npm run smoke:selftrail` (if docs claim stability).

## Gate

- `npm run plan:check` PASS.
- `npm run docs:check` PASS.
- `docs/prozess/Dokumentationsstatus.md` reflects current date.

## Report

Standardformat verwenden.

