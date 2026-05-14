---
description: Create a compact implementation plan for a new feature or extension.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`.
- Read a related `docs/plaene/aktiv/VXX.md` when extending or refreshing an active block.
- If present, use `docs/generated/knowledge-graph.json` or `node scripts/query-knowledge-graph.mjs ...` for dependency/scope/surface reads before full plan text.
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
- Dependency-/Scope-Abgleich zuerst ueber Graph-Query (`open-deps`, `scope-collisions`), dann bei Bedarf Volltext.
- Decision-Klasse nach `.agents/rules/planning_and_governance.md` bestimmen; `D3`/`D4`-Aenderungen an Source-of-truth, Planstruktur, Archivierung oder Governance brauchen User-Gate.
- Subagents nur mit expliziter User-Erlaubnis und klarer Ownership nutzen; sie ersetzen keine Gate-, Evidence- oder Integrationsverantwortung.
- Neue dauerhafte Ablagen nach Zweckklasse (`transient`, `evidence`, `reference`, `governance`, `plan`, `archive-index`) einordnen und bestehende kanonische Zielquelle bevorzugen.
- Verdacht auf Totcode oder Legacy-Pfade frueh klassifizieren: `duplicate-backed`, `legacy-with-replacement`, `contract-first/plan-drift`, `unverified-altpath`.
- Fuer jeden geplanten Remove-Pfad Nachfolger, reale Konsumenten, verbleibende Harness-/Test-Nutzung und Delete-Kriterium festhalten.
- Abschluss-Claims nur planen, wenn Plan, Runtime und Tests denselben produktiven Pfad belegen; Contract-only Evidence reicht nicht.

## 3. Write plan

Create `docs/plaene/neu/Feature_[Name].md` with:
- Goal, affected files.
- Desktop-app-first scope and any demo-only exclusions.
- A planned `plan_file` target under `docs/plaene/aktiv/VXX.md` when the draft is intended for active-master intake.
- Phasen mit klaren Unterphasen (standardmaessig 2+, bei kleinen eng umrissenen Schritten sind auch 1-2 Unterpunkte ok).
- Abschluss-Gate als `X.99`.
- Bei Legacy-/Dead-Code-Scope pro Kandidat: Klassifikation, geplanter Nachfolger, verbleibende Konsumenten und Delete-Kriterium.
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
- After user confirms intake is complete, move the intake draft to `docs/plaene/alt/`; canonical active detail then lives in `docs/plaene/aktiv/VXX.md`.

## 5. Validate

// turbo
- `npm run plan:check`
- `npm run graph:check` sobald der Draft in `docs/plaene/aktiv/VXX.md` oder den Master aufgenommen wurde.
- `npm run docs:sync && npm run docs:check`

## 6. Commit

- `git add docs/plaene/neu/Feature_[Name].md .agents/workflows/plan.md` when changed.
- Commit message: `docs: add external implementation plan for [Name]`.

## Report

Standardformat verwenden.
