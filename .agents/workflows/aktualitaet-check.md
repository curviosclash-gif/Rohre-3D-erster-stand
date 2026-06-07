---
description: Verify docs/workflows/rules are current with an automated gate.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/bot-training/Bot_Trainingsplan.md`, optional historical baseline `docs/archive/Analysebericht.md`, latest `docs/tests/Testergebnisse_*.md`.
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
- `docs:check` ist read-only und schreibt `docs/prozess/Dokumentationsstatus.md` nicht neu. Den Report nur als Evidence des letzten `docs:sync` lesen; bei gemeldeten Pending-Updates ist die aktuelle Konsolenausgabe massgeblich.

## 3. If check fails

- Run `/aktualitaet-sync`.
- Re-run `npm run plan:check` and `npm run docs:check` until both PASS.

## 4. Gate

- `npm run plan:check` PASS.
- `npm run docs:check` PASS.
- Nach einem erforderlichen `/aktualitaet-sync`: `docs/prozess/Dokumentationsstatus.md` hat das aktuelle Datum und keine blockierenden Issues. Bei einem reinen Check ohne Drift genuegt `docs:check` PASS; der Report darf aeltere Sync-Evidence enthalten.
- Product positioning is consistent: desktop app primary, online/browser demo secondary.

## Report

Standardformat verwenden.
