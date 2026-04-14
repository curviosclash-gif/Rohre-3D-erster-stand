---
description: Diagnose a reported issue and apply a targeted fix.
---

Policy-Verweise: `.agents/rules/code_quality_and_debugging.md`, `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/product_focus.md`, `.agents/rules/token_efficiency_and_tools.md`.

## 0. Capture issue

- Symptom, Timing, Reproduzierbarkeit, Fehlertext erfassen.
- Impact einordnen: Desktop-App, Online-Demo oder beide (Default Desktop-Prioritaet, ausser Report ist klar demo-only).
- Follow-up nur bei fuer Diagnose blockierender Luecke.

## 1. Analyze evidence

// turbo
- Aktuelle Logs und Traces pruefen; auf Desktop-Pfad reproduzieren, ausser es ist klar online-demo-only.
- Wahrscheinlichen Failure-Pfad extrahieren.

## 2. Find root cause

- Fehlerpattern lokalisieren mit `Grep` (ripgrep-basiert).
- Ursache mit minimaler Reproduktion bestaetigen.
- Betroffene Dateien und Seiteneffekte notieren.

## 3. Fix

- Kleinste sichere Aenderung fuer Root-Cause.
- Desktop-first bleibt Prioritaet (siehe `product_focus.md`).
- Tests sind user-owned (siehe `planning_and_governance.md` -> Test Ownership). `npm run build` nur, wenn es das kleinste sinnvolle Signal ist.

## 4. Governance + Doc-Gates

// turbo
- Meta-Gate: `npm run gates:pre-commit` (ruft `plan:check` -> `docs:sync` -> `docs:check`).

## 5. Commit

- Git-Policy: `.agents/rules/git_and_commits.md`.
- `git add [scoped-files]` -> `fix: [short reason]`.
- Scope pruefen: `git diff --name-only`.

## Report

Standardformat verwenden.
