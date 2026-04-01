---
description: Verify docs/workflows/rules are current with an automated gate.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/bot-training/Bot_Trainingsplan.md`, `docs/Analysebericht.md`, latest `docs/tests/Testergebnisse_*.md`.
- Sample linked files in `docs/plaene/aktiv/` when checking planning drift for active blocks.
- `git log -n 5 --oneline`.
- `npm run guard:main`.

## 1. Inventory

// turbo
- `git status --short`
- `rg --files docs .agents scripts`
- Identify changed runtime areas (`src/`, `tests/`, `scripts/`, `editor/`).
- Flag docs/workflows/rules that still imply feature parity between desktop app and online demo.

## 2. Automated checks

// turbo
- `npm run plan:check`
- `npm run docs:check`
- Read `docs/prozess/Dokumentationsstatus.md`.

## 3. If check fails

- Run `/aktualitaet-sync`.
- Re-run `npm run plan:check` and `npm run docs:check` until both PASS.

## 4. Gate

- `npm run plan:check` PASS.
- `npm run docs:check` PASS.
- `docs/prozess/Dokumentationsstatus.md` has current date and no blocking issues.
- Product positioning is consistent: desktop app primary, online/browser demo secondary.

## Report

Standardformat verwenden.

