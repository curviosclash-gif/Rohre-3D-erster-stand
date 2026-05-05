---
description: Fast path for small, scoped changes (1-2 Dateien, keine Subphase).
---
// turbo-all

Eintrittskriterium: 1-2 Dateien, kein `*.99`-Gate, keine aktive Subphase aus `docs/Umsetzungsplan.md`. Groesserer Scope -> `.agents/workflows/code.md`.

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/token_efficiency_and_tools.md`.

## 0. Context

- Kein Pflicht-Read des Master-Index. Nur die betroffenen Dateien und ggf. deren direkte Nachbarn laden.
- `git log -n 3 --oneline` fuer aktuellen Stand.

## 1. Implement

- Aenderung direkt anwenden. Bestehende Patterns folgen. Desktop-App ist primaeres Ziel.
- Wenn die Aenderung auf Totcode-Loeschung oder Legacy-Ablosung hinauslaeuft, Quick-Path verlassen und `.agents/workflows/code.md` oder `.agents/workflows/cleanup.md` nutzen.

## 2. Verify

- Tests sind user-owned; keine Voll-Suite ohne User-Anfrage.
- Kleine risikoadjustierte Checks sind erlaubt (enger Build-/Contract-/Runtime-Signalpfad).
- Wenn Plan-/Workflow-/Rule-Dateien geaendert wurden: `npm run gates:pre-commit`.
- Sonst mindestens `npm run plan:check`.
- Keine Totcode-Loeschung ohne nachgewiesenen Nachfolgerpfad und dokumentierte Konsumentenlage.

## 3. Commit

- `git add [scoped-files]` -> `[type]: [short reason]`.
- Scope pruefen: `git diff --name-only`.
