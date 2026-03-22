---
description: Create a compact implementation plan for a new feature or extension.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`.
- For bot-training scope also read `docs/Bot_Trainingsplan.md` and treat it as active master plan.
- `git log -n 5 --oneline`.
- Scan impacted modules in `src/`, `tests/`, `editor/js/`.

## 1. Clarify (only if critical)

- What, why, which module?

## 2. Architecture + governance check

- Existing modules/interfaces/events.
- Reuse vs new file decision.
- Risk rating (low/medium/high).
- Documentation impact list.
- Datei-Ownership pruefen: kollidiert der Scope mit einem gelockten Block?
- Dependencies klassifizieren (`hard`/`soft`).

## 3. Write plan

Create `docs/Feature_[Name].md` with:
- Goal, affected files.
- Phasen mit Pflicht-Unterphasen (jede Phase mindestens 2 Unterphasen).
- Abschluss-Gate als `X.99`.
- Evidence format for completed items:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## 4. Update master plan

- Select master plan file by scope:
  - Default: `docs/Umsetzungsplan.md`
  - Bot training (`scripts/training-*`, `src/entities/ai/training/**`, `trainer/**`, training tests/docs): `docs/Bot_Trainingsplan.md`

- Add or update block with:
  - `<!-- LOCK: frei -->`
  - optional `<!-- DEPENDS-ON: ... -->`
  - `Definition of Done (DoD)` section
  - risk register section
- Update dependency table (`hard/soft`) and backlog priority table.
- Keep gate invariant valid: `*.99` cannot be `[x]` while prior phases are open.

## 5. Validate

// turbo
- `npm run plan:check`
- `npm run docs:sync && npm run docs:check`

## 6. Commit

- `git add [masterplan-datei] docs/Feature_[Name].md .agents/workflows/plan.md` when changed.
- Commit message: `docs: add implementation plan for [Name]`.

## Report

Standardformat verwenden.
