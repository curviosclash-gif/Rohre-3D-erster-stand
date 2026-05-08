---
description: Fast path for small, scoped changes (1-2 Dateien, keine Subphase).
---
// turbo-all

Eintrittskriterium: 1-2 Dateien, kein `*.99`-Gate, und die betroffenen Dateien gehoeren zu keinem aktiven Block-/Lock-Scope. Groesserer Scope -> `.agents/workflows/code.md`.

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/token_efficiency_and_tools.md`.

## 0. Context

- Kein Pflicht-Read des kompletten Master-Index. Vor Einstieg aber einen kompakten Governance-Check machen: betroffene Dateien gegen `docs/Umsetzungsplan.md`, `docs/plaene/aktiv/VXX.md` oder `docs/lock-status/*.json` abgleichen.
- Nur wenn kein aktiver Block, kein Lock und keine laufende Subphase betroffen sind, im Quick-Path bleiben.
- `git log -n 3 --oneline` fuer aktuellen Stand.

## 1. Implement

- Aenderung direkt anwenden. Bestehende Patterns folgen. Desktop-App ist primaeres Ziel.
- Bleibt ein nicht-offensichtlicher Kompatibilitaets-, Migrations-, Alias- oder Fallback-Pfad stehen, einen kurzen lokalen Why-Kommentar direkt dort hinterlassen.
- Wenn die Aenderung auf Totcode-Loeschung oder Legacy-Ablosung hinauslaeuft, Quick-Path verlassen und `.agents/workflows/code.md` oder `.agents/workflows/cleanup.md` nutzen.

## 2. Verify

- Tests sind user-owned; keine Voll-Suite ohne User-Anfrage.
- Kleine risikoadjustierte Checks sind erlaubt (enger Build-/Contract-/Runtime-Signalpfad).
- Wenn Plan-/Workflow-/Rule-Dateien geaendert wurden: `npm run gates:pre-commit`.
- Sonst mindestens `npm run plan:check`.
- Keine Totcode-Loeschung ohne nachgewiesenen Nachfolgerpfad und dokumentierte Konsumentenlage.

## 3. Commit

- Wenn die kleine Aufgabe abgeschlossen ist und scoped Aenderungen erzeugt hat, Commit direkt im selben Turn erstellen.
- Eine kurze Notiz zum Commit-Zweck im passenden Kontext hinterlassen; bei fehlendem Block mindestens in `docs/plaene/CHANGELOG.md`, wenn Repo-Governance oder Statuswissen betroffen ist.
- Nicht-offensichtliche Restpfade sind im Quick-Path nur fertig, wenn Why-Kommentar im Code und passende Repo-Notiz beide vorhanden sind.
- `git add [scoped-files]` -> `[type]: [short reason]`.
- Scope pruefen: `git diff --name-only`.
