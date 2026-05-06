---
description: Plan governance, bot-training governance, and blocker reporting (consolidated)
---

<!-- Frontmatter-Feld `trigger:` entfallen ab V93 93.3.3 - Rule-Aktivierung ist nicht maschinell ausgewertet. -->


## Master Plans

- `docs/Umsetzungsplan.md` - compact index only (one row per active block + Abhaengigkeiten, Lock-Status, Conflict-Log).
- `docs/bot-training/Bot_Trainingsplan.md` - sole source for bot-training phases, locks, DoD, risks.
- Do not create plan scopes directly in either master plan. Intake is user-owned.

## Plan Files

- New/revised drafts: `docs/plaene/neu/`
- Canonical active blocks: `docs/plaene/aktiv/VXX.md` (must include DoD, Nicht-Ziel, risk register, phased checklist ending `*.99`)
- Archived plans: `docs/plaene/alt/`
- Every active block row must link to exactly one canonical block file with `scope_files`.

## Phase & Gate Rules

- `*.99` gate may be `[x]` only when all earlier phases are `[x]`.
- Abschluss-Evidence muss nachvollziehbar sein, aber darf kompakt pro Subphase oder Deliverable gebuendelt werden (kein Pflicht-Mikroprotokoll pro Einzel-Checkbox).
- In aktiven Blockplaenen gilt weiterhin mindestens-2-Unterphasen pro Top-Level-Phase (Validator-kompatibel); die Entschlackung erfolgt ueber kompaktere Evidence- und Commit-Slices statt Mikro-Unterteilung.

## Dead-Code Governance

- Dead code may be removed only when a newer better path with real consumers or an exact productive duplicate-/shim-replacement is proven.
- Suspected candidates must be classified before deletion: `duplicate-backed`, `legacy-with-replacement`, `contract-first/plan-drift`, `unverified-altpath`.
- For every retained legacy or compatibility path, document successor, remaining consumers, and delete criterion in the active block or intake draft.
- Do not mark a scope as done when only contracts or isolated tests exist; plan, runtime, and tests must point to the same productive path.
- No new consumers may be added to files already marked `legacy`, `compatibility path`, or `shim`.

## Blocker Reporting

- If implementation hits a hard blocker or repeated failure, create/update a report in `docs/Fehlerberichte/` before stopping.
- Kurzfristige lokale Reibung ohne Stop-Loss braucht keinen separaten Fehlerbericht, wenn sie im Commit-/Phasen-Evidence nachvollziehbar bleibt.
- Reports: task context, failure, reproduction path, affected files, attempted fixes, status, next step.

## Closure Gates

- Normaler Codepfad: kleinste sinnvolle Verifikation waehlen (z. B. gezielter Contract-Run, Build-Signal oder Architekturcheck).
- Meta-Gate `npm run gates:pre-commit` ist Pflicht bei `*.99` oder bei Docs-/Governance-/Planstruktur-Aenderungen.
- Einzeln falls noetig: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.
- Abschluss eines Tasks oder einer Subphase mit Repo-Aenderungen ist erst uebergabefaehig, wenn Evidence und passender scoped Commit vorliegen.
- Offene eigene Scope-Aenderungen nach bestandenem Gate gelten als Closure-Luecke; vor Abschluss committen oder den fehlenden Abschlussgrund explizit dokumentieren.
- If scope includes dead-code or legacy cleanup, closure evidence must also name the replacement proof or the explicit retention reason.

## Test Ownership

- Tests sind user-owned - nicht standardmaessig volle Test-Suites ausfuehren.
- Kleine risikoadjustierte Verifikationssignale vor `*.99` sind erlaubt, wenn sie den geaenderten Pfad direkt absichern und den User nicht mit unnoetigen Vollruns belasten.
- Test-Auswahl und Pfade: `.agents/test_mapping.md` (nur lesen, wenn User Tests anfordert oder ein Abschluss-Gate vorbereitet wird).
- Fuer `*.99` oder explizite User-Anfrage die vorgesehenen Mappings/Gates vollstaendig fahren.
