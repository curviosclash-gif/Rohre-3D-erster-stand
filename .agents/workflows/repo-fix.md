---
description: Apply a targeted repo-only fix for tooling, gates, docs, graph, governance, or harness failures.
decision_floor: D2
mutates: required
user_gate: conditional
commit_strategy: scoped
required_checks:
  - npm run plan:check
outputs:
  - repo-change
  - chat
---

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/token_efficiency_and_tools.md`, `.agents/rules/code_quality_and_debugging.md`.

Eintrittskriterium: Repo-only Fix fuer Tooling, Gates, Docs, Graph, Workflows, Rules, Git-/CI-/Test-Harness, Package-/Config- oder Planvalidierung. Produkt-, Gameplay-, Runtime- oder UI-Bugs gehoeren in `.agents/workflows/bugfix.md`, `.agents/workflows/code.md` oder `.agents/workflows/refactor.md`.

## 0. Context

- Ausgangspunkt ist eine bestaetigte Repro-Analyse, ein konkreter failing repo command oder ein klarer User-Auftrag.
- `AGENTS.md`, passende Rule und diesen Workflow lesen.
- Betroffene Surface klassifizieren: `governance`, `docs-plan`, `graph`, `tooling-script`, `test-harness`, `ci`, `git`, `package-config`, `unknown`.
- Decision-Klasse bestimmen. Repo-only heisst nicht automatisch niedriges Risiko: `.agents/`, Rules, Workflows, Master-/Aktivplan-Struktur und Governance-Skripte sind `D3`; Delete-/Move-/History- oder High-Blast-Radius-Schritte sind `D4`.
- Bei `D3`/`D4`, `[REVIEW]` oder `[USER-GATE]` die betroffenen Dateien/Oberflaechen als `no-op`, `read-only evidence`, `optional` oder `edit required` klassifizieren und User-Gate einholen.

## 1. Scope

// turbo
- Minimalen Fix-Scope nennen: Zielpfade, erwarteter Effekt, kleinster Gate-Command und bewusst ausgeschlossener Scope.
- Bei Plan-/Lock-/Blockbezug `docs/generated/plan-index.json` nur als Einstieg und `docs/Umsetzungsplan.md` als kanonische Quelle nutzen; genau eine passende aktive `VXX.md` nachladen.
- Bei Graph-, Dependency- oder Surface-Fragen strukturierte Queries bevorzugen:
  - `npm run graph:check`
  - `node scripts/query-knowledge-graph.mjs scope-collisions --json`
  - `node scripts/query-knowledge-graph.mjs impact-for-file <path> --json`
  - `node scripts/query-knowledge-graph.mjs open-deps <VXX> --json`
- Wenn produktiver Code fuer den Fix noetig wird, stoppen und auf `.agents/workflows/bugfix.md`, `.agents/workflows/code.md` oder einen Plan-Draft wechseln.
- Fremde uncommittete Aenderungen nicht absorbieren; nur scoped Dateien anfassen und committen.

## 2. Fix

- Kleinste Aenderung an der kanonischen Quelle anwenden.
- Bestehende Repo-Patterns, Validatoren, Script-Argumente und strukturierte Parser nutzen.
- Generierte Artefakte nicht manuell editieren, wenn ein Generator existiert; Generator laufen lassen und Diff pruefen.
- Keine Master-, Aktivplan-, Abschluss-, PASS- oder Checkbox-Claims setzen, wenn der Fix nur Tooling oder Diagnose vorbereitet.
- Keine breite Formatierung, keine Generated-Artefakt-Flut und keine opportunistischen Refactors.
- Nicht-offensichtliche Kompatibilitaets-, Alias-, Fallback- oder Migrationspfade mit kurzem Why-Kommentar an der Stelle markieren.

## 3. Verify

// turbo
- Immer mindestens `npm run plan:check`, sofern der Fix Repo-Dateien veraendert.
- Bei `.agents/`, `docs/`, Graph-Artefakten, Planstruktur, Workflow-/Rule-/Governance- oder Validator-Scope: `npm run gates:pre-commit`.
- Bei Script-/Harness-Fixes zusaetzlich den kleinsten betroffenen Command oder Contract-Run ausfuehren.
- Bei rotem Gate Ursache klassifizieren: eigener Diff, generiertes Artefakt, fremde uncommittete Aenderung, bekannter Fremdblocker oder neuer Blocker. Nur eigenen Diff direkt reparieren.

## 4. Evidence

- Abschlussnotiz kurz und repo-nah halten: Ursache, Fixpfad, Gate und bewusst nicht gepruefte Bereiche.
- Fuer Block-/Planarbeit gehoert die Notiz in die aktive VXX-Datei oder `docs/plaene/CHANGELOG.md`.
- Fuer reine Workflow-/Rule-/Tooling-Slices reicht die Begruendung im geaenderten Governance-Artefakt, wenn sie dort als Eintrittskriterium, Scope-Grenze oder Gate-Regel sichtbar ist.
- Harte Blocker in `docs/Fehlerberichte/` dokumentieren, wenn der Fix nicht abgeschlossen werden kann.

## 5. Commit

- Git-Policy: `.agents/rules/git_and_commits.md`.
- Windows vor Staging: `npm run git:acl:heal`.
- Nur scoped Dateien stagen: `git add [scoped-files]`.
- Staged Scope pruefen: `git diff --cached --name-only`; Restdiffs mit `git status --short` erfassen.
- Wenn fremde staged Aenderungen vorhanden sind, nicht unstage'n und keinen gemischten Commit erzeugen; Commit als blockiert melden oder User-Gate fuer Index-Bereinigung einholen.
- `npm run agent:commit -- --message="fix: [short repo reason]" --workflow=repo-fix --decision=<D0-D4> --evidence="<command> -> PASS" --not-checked="<nicht geprueft>"`.

## Report

Standardformat:

```text
Repo-Fix: <Scope>
Decision: <D2-D4>
Surface: <governance|docs-plan|graph|tooling-script|test-harness|ci|git|package-config|unknown>

Ursache:
- <kurz>

Fix:
- <Pfad -> Effekt>

Verification:
- <command> -> PASS|FAIL|WARN|SKIPPED

Not-checked:
- <bewusst nicht gepruefte Pfade und Risiko>

Residual-risk:
- <kurz oder none>
```
