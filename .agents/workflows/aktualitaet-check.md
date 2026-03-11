---
description: Verify docs/workflows/rules are current with an automated gate.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/Analysebericht.md`, latest `docs/Testergebnisse_*.md`.
- `git log -n 5 --oneline`.

## 1. Inventory

// turbo
- `git status --short`
- `rg --files docs .agents`
- Identify changed runtime areas (`src/`, `tests/`, `scripts/`, `editor/`).

## 2. Automated check

// turbo
- `npm run docs:check`. Read `docs/Dokumentationsstatus.md`.

## 3. If check fails

- Run `/aktualitaet-sync`. Re-run `npm run docs:check` until PASS.

## 4. Gate

- `npm run docs:check` PASS.
- `docs/Dokumentationsstatus.md` has current date and no blocking issues.

## Report

Standardformat verwenden.
