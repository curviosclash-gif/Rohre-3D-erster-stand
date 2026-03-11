---
description: Create a compact implementation plan for a new feature or extension.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`.
- `git log -n 5 --oneline`.
- Scan impacted modules in `src/`, `tests/`, `editor/js/`.

## 1. Clarify (only if critical)

- What, why, which module?

## 2. Architecture check

- Existing modules/interfaces/events
- Reuse vs new file decision
- Risk rating (low/medium/high)
- Documentation impact list
- Datei-Ownership prüfen: kollidiert der Scope mit einem gelockten Block?

## 3. Write plan

Create `docs/Feature_[Name].md`:
- Goal, affected files
- **Phasen mit Pflicht-Unterphasen** (jede Phase mindestens 2 Unterphasen):

```markdown
- [ ] X.1 [Phasenname]
  - [ ] X.1.1 [Unterphasen-Schritt 1]
  - [ ] X.1.2 [Unterphasen-Schritt 2]
- [ ] X.2 [Phasenname]
  - [ ] X.2.1 ...
  - [ ] X.2.2 ...
- [ ] X.9 Abschluss-Gate
  - [ ] X.9.1 Tests und Build verifizieren
  - [ ] X.9.2 docs:sync, docs:check, Doku-Freeze
```

- Verification at functional-unit boundaries (not after every sub-phase)
- Include freshness note: run `npm run docs:sync && npm run docs:check` at closure

## 4. Update master plan

- Add new block in `docs/Umsetzungsplan.md`:
  - Lock-Header: `<!-- LOCK: frei -->`
  - Optional: `<!-- DEPENDS-ON: ... -->`
  - Scope, Hauptpfade, Konfliktregel
  - Sub-phase checkboxes
- Update `Datei-Ownership`-Tabelle with new paths

## 5. Commit

- `git add docs/Umsetzungsplan.md docs/Feature_[Name].md` → `docs: add implementation plan for [Name]`

## Report

Standardformat verwenden.
