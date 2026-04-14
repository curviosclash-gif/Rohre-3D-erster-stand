---
description: Plan governance, bot-training governance, and blocker reporting (consolidated)
---

<!-- Frontmatter-Feld `trigger:` entfallen ab V93 93.3.3 - Rule-Aktivierung ist nicht maschinell ausgewertet. -->


## Master Plans

- `docs/Umsetzungsplan.md` — compact index only (one row per active block + Abhaengigkeiten, Lock-Status, Conflict-Log).
- `docs/bot-training/Bot_Trainingsplan.md` — sole source for bot-training phases, locks, DoD, risks.
- Do not create plan scopes directly in either master plan. Intake is user-owned.

## Plan Files

- New/revised drafts: `docs/plaene/neu/`
- Canonical active blocks: `docs/plaene/aktiv/VXX.md` (must include DoD, Nicht-Ziel, risk register, phased checklist ending `*.99`)
- Archived plans: `docs/plaene/alt/`
- Every active block row must link to exactly one canonical block file with `scope_files`.

## Phase & Gate Rules

- `*.99` gate may be `[x]` only when all earlier phases are `[x]`.
- Every `[x]` item needs evidence: `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result>)`
- Every block has at least 2 sub-phases per top-level phase.

## Blocker Reporting

- If implementation hits a blocker or repeated failure, create/update a report in `docs/Fehlerberichte/` before stopping.
- Reports: task context, failure, reproduction path, affected files, attempted fixes, status, next step.

## Closure Gates

- Meta-Gate: `npm run gates:pre-commit` (fuehrt `plan:check` -> `docs:sync` -> `docs:check` in fester Reihenfolge aus).
- Einzeln falls noetig: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.

## Test Ownership

- Tests sind user-owned - nicht standardmaessig ausfuehren. Ausnahmen: explizite User-Anfrage oder Abschluss-Gate `*.99`.
- Test-Auswahl und Pfade: `.agents/test_mapping.md` (nur lesen, wenn User Tests anfordert oder `*.99` laeuft).
- Fuer Block-Subphasen unterhalb `*.99` Tests vorbereiten, aber Ausfuehrung ans Abschluss-Gate verschieben.
- Ohne Test-Request Verifikation als user-owned oder block-end-pending markieren, nicht ungefragt laufen lassen.
