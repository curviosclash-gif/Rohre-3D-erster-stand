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
- Decision-Klasse nach `.agents/rules/planning_and_governance.md` bestimmen; Bugfixes bleiben klein, aber Source-of-truth-, Planstruktur-, Archivierungs-, Move-/Delete- oder High-Blast-Radius-Aenderungen brauchen User-Gate.
- Neue dauerhafte Ablagen nur nach Zweckklasse anlegen und bestehende kanonische Zielquelle bevorzugen.
- Verdaechtige Altpfade nicht still mitloeschen; nur entfernen, wenn ein juengerer produktiver Ersatzpfad oder eine exakte Dublette belegt ist.
- Wenn der Fix einen alten Pfad umgeht oder ersetzt, verbleibende Konsumenten und Delete-Kriterium im Scope dokumentieren.
- Wenn der Fix einen nicht-offensichtlichen Kompatibilitaets-, Migrations-, Alias- oder Fallback-Pfad behaelt, einen kurzen lokalen Why-Kommentar direkt an dieser Stelle hinterlassen.
- Tests sind user-owned. Vor `*.99` sind kleine, risikoadjustierte Signale erlaubt (enger Contract-/Build-/Runtime-Check).

## 4. Governance + Gate-Strategie

// turbo
- Immer: `npm run plan:check`.
- Wenn Docs/Governance/Graph-Dateien betroffen sind oder `*.99` geschlossen wird: `npm run gates:pre-commit`.
- Bei reinem Code-Bugfix ohne Drift: nur kleinste sinnvolle Zusatzchecks.

## 5. Commit

- Git-Policy: `.agents/rules/git_and_commits.md`.
- Nach erfolgreicher Root-Cause-Behebung und Verifikation den scoped Commit im selben Turn erstellen, statt die Fix-Aenderungen offen liegen zu lassen.
- Vor Abschluss kurze Bugfix-Notiz mit Ursache und wirksamem Fixpfad hinterlassen (Block-Evidence, Fehlerbericht oder `docs/plaene/CHANGELOG.md`).
- Abschluss erst, wenn sowohl die Repo-Notiz als auch der notwendige lokale Why-Kommentar fuer nicht-offensichtliche Restpfade vorhanden sind.
- `git add [scoped-files]` -> `fix: [short reason]`.
- Scope pruefen: `git diff --name-only`.

## Report

Standardformat verwenden.
