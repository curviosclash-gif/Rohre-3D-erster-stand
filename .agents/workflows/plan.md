---
description: Create a compact implementation plan for a new feature or extension.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`.
- For bot-training scope also read `docs/bot-training/Bot_Trainingsplan.md` and treat it as active master plan.
- `git log -n 5 --oneline`.
- Scan impacted modules in `src/`, `tests/`, `editor/js/`.

## 1. Clarify (only if critical)

- What, why, which module?

## 2. Architecture + governance check

- Existing modules/interfaces/events.
- Confirm primary target surface: desktop app first; online/browser only as demo scope unless explicitly requested otherwise.
- Reuse vs new file decision.
- Risk rating (low/medium/high).
- Documentation impact list.
- Note any intentional online-demo limitations or deferred parity work.
- Datei-Ownership pruefen: kollidiert der Scope mit einem gelockten Block?
- Dependencies klassifizieren (`hard`/`soft`).

## 3. Write plan

Create `docs/plaene/neu/Feature_[Name].md` with:
- Goal, affected files.
- Desktop-app-first scope and any demo-only exclusions.
- Phasen mit Pflicht-Unterphasen (jede Phase mindestens 2 Unterphasen).
- Abschluss-Gate als `X.99`.
- Evidence format for completed items:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Intake-Hinweis fuer den User:
  - Ziel-Masterplan (`docs/Umsetzungsplan.md` oder `docs/bot-training/Bot_Trainingsplan.md`)
  - vorgeschlagene Block-ID
  - hard/soft dependencies
  - Hinweis `Manuelle Uebernahme erforderlich`

## 4. Manual intake handoff (no direct master-plan edits)

- Do not create or change planning scopes directly in `docs/Umsetzungsplan.md`.
- Do not create or change planning scopes directly in `docs/bot-training/Bot_Trainingsplan.md`.
- Keep all planning deltas in `docs/plaene/neu/Feature_[Name].md`.
- Wait for user-managed intake into master plan.
- After user confirms intake is complete, move plan file to `docs/plaene/alt/`.

## 5. Validate

// turbo
- `npm run plan:check`
- `npm run docs:sync && npm run docs:check`

## 6. Commit

- `git add docs/plaene/neu/Feature_[Name].md .agents/workflows/plan.md` when changed.
- Commit message: `docs: add external implementation plan for [Name]`.

## Report

Standardformat verwenden.

