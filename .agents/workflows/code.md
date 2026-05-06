---
description: Implement a planned change from coding to verification and commit.
---

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/code_quality_and_debugging.md`, `.agents/rules/product_focus.md`, `.agents/rules/token_efficiency_and_tools.md`.

## 0. Context

Pflicht-Reads:
- `docs/Umsetzungsplan.md` (nur Master-Index, keine Historie).
- Die verlinkte `docs/plaene/aktiv/VXX.md` mit Lese-Budget: Frontmatter + DoD + aktuelle + naechste Subphase.
- Fuer Abhaengigkeits-, Scope- und Surface-Fragen zuerst `docs/generated/knowledge-graph.json` oder `node scripts/query-knowledge-graph.mjs ...` nutzen.
- `git log -n 3 --oneline`.
- `npm run guard:main`.

Optional (nur bei Bedarf):
- `docs/plaene/CHANGELOG.md` fuer Abgleich-Historie.
- `docs/bot-training/Bot_Trainingsplan.md`, wenn Scope Bot-Training beruehrt.
- Intake- oder Altplaene unter `docs/plaene/neu/*.md` bzw. `docs/plaene/alt/*.md` als unterstuetzender Kontext.

## 1. Scope

- Zielpfade und erwartetes Verhalten festlegen.
- Desktop-App-Ergebnis priorisieren; Online/Browser-Parity nur explizit auf Wunsch oder bei geringem Aufwand.
- Bei klarem Scope direkt weiter. Nur bei kritisch fehlender Information nachfragen.
- Fremde uncommittete Aenderungen nicht absorbieren; nur scoped Dateien committen.

## 2. Implement

- Bestehende Projekt-Patterns folgen.
- Keine hartkodierten Config-Werte.
- Fuer neue Runtime-Objekte Cleanup/Dispose mitdenken.
- Totcode oder Legacy-Pfade vor einem Remove erst klassifizieren: `duplicate-backed`, `legacy-with-replacement`, `contract-first/plan-drift`, `unverified-altpath`.
- Nur exakte Dubletten/Shims oder nachweislich ersetzte Altpfade entfernen; sonst im Scope als `legacy`, `compatibility path`, `shim` oder `plan-drift` markieren.
- Wenn ein neuer Pfad einen alten ersetzt, verbleibende Konsumenten und Delete-Kriterium im aktiven Block oder den Scope-Docs festhalten.
- Planentwuerfe bleiben in `docs/plaene/neu/`, aktive Bloecke in `docs/plaene/aktiv/VXX.md`.
- Bot-Training-Scope: Status/Phase nur in `docs/bot-training/Bot_Trainingsplan.md` pflegen.

## 3. Self-check

// turbo
- `Grep` nach offenen Markern in geaenderten Pfaden: `(console\.log|TODO:|FIXME:|HACK:)`.
- Keine offenen TODOs im geaenderten Code.
- Bei Legacy-/Dead-Code-Aenderungen pruefen, dass keine neuen Konsumenten auf markierte Altpfade zeigen und dass Ersatz-/Behalteentscheidung im Scope dokumentiert ist.
- Kleine risikoadjustierte Verifikation vor `*.99` ist erlaubt (enges Contract-/Build-/Runtime-Signal fuer den geaenderten Pfad).

## 4. Governance + Gate-Strategie

// turbo
- Immer: `npm run plan:check`.
- Wenn `docs/`, `.agents/`, `scripts/validate-umsetzungsplan.mjs`, Graph-Artefakte oder Master-/Blockplan-Struktur geaendert wurden: `npm run gates:pre-commit`.
- Wenn `*.99` geschlossen wird: `npm run gates:pre-commit` verpflichtend.
- Bei reinem Code-Scope ohne Doc-/Governance-Drift: nur kleinste sinnvolle Zusatzchecks (z. B. `npm run build` oder fokussierter Contract-Run).

## 5. Commit

- Git-Policy: `.agents/rules/git_and_commits.md` (Scope, Commit-Slice, Safety).
- Wenn die angeforderte Aufgabe nach Self-check/Gates abgeschlossen ist und scoped Repo-Aenderungen vorliegen, den Commit im selben Turn erstellen; keinen eigenen offenen Worktree zuruecklassen.
- Vor oder zusammen mit dem Commit kurze Notizen hinterlassen, die Zweck und Effekt des Delivery-Slices erklaeren (Block-Evidence und/oder `docs/plaene/CHANGELOG.md`).
- `npm run guard:main`.
- Windows vor Staging: `npm run git:acl:heal`.
- `git add [scoped-files]` -> `git commit -m "[type]: [name] - [short reason]"`.
- Scope pruefen: `git diff --name-only`.
- Vor Push auf `main`: `npm run snapshot:tag`.

## Report

Standardformat verwenden.
