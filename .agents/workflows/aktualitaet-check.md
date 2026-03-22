---
description: Verify docs/workflows/rules are current with an automated gate.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/Bot_Trainingsplan.md`, `docs/Analysebericht.md`, latest `docs/Testergebnisse_*.md`.
- `git log -n 5 --oneline`.
- `npm run guard:main`.

## 1. Inventory

// turbo
- `git status --short`
- `rg --files docs .agents scripts`
- Identify changed runtime areas (`src/`, `tests/`, `scripts/`, `editor/`).

## 2. Automated checks

// turbo
- `npm run plan:check`
- `npm run docs:check`
- Read `docs/Dokumentationsstatus.md`.

## 3. If check fails

- Run `/aktualitaet-sync`.
- Re-run `npm run plan:check` and `npm run docs:check` until both PASS.

## 4. Gate

- `npm run plan:check` PASS.
- `npm run docs:check` PASS.
- `docs/Dokumentationsstatus.md` has current date and no blocking issues.

## Report

Standardformat verwenden.
