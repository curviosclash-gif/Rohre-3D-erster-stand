---
description: Check and auto-update docs/workflows/rules to current repository reality.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/Analysebericht.md`, latest `docs/Testergebnisse_*.md`.
- `git log -n 5 --oneline`.

## 1. Auto-sync

// turbo
- `npm run docs:sync`. Review findings in `docs/Dokumentationsstatus.md`.

## 2. Resolve remaining drift

- Update affected files for legacy-path findings. Restore missing required files.
- Re-run `npm run docs:sync` after each fix.

## 3. Validate

// turbo
- `npm run docs:check` → must exit PASS.

## 4. Commit

- `git add docs/` → `docs: sync documentation status`

## 5. Optional reality checks

// turbo
- `npm run smoke:roundstate` and `npm run smoke:selftrail` (if docs claim stability).

## Gate

- `npm run docs:check` PASS. `docs/Dokumentationsstatus.md` reflects current date.

## Report

Standardformat verwenden.
