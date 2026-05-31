---
description: Code quality, debugging, performance, and lifecycle (consolidated)
---

<!-- Frontmatter-Feld `trigger:` entfallen ab V93 93.3.3 - Rule-Aktivierung ist nicht maschinell ausgewertet. -->


## Code Quality

- Prioritize clean, maintainable, self-documenting code.
- Adhere to architectural patterns (source: `docs/referenz/ai_architecture_context.md`).
- For architecture-relevant feature paths, use the active entry in `docs/referenz/architektur_ausfuehrlich.md` and prefer existing Contracts, Commands/Events, Snapshots, Ports, or Capabilities before adding a new direct path.
- The shared Architecture Capsule (Architektur-Capsule) for such scopes is: `Layers`, `Dependency delta`, `Contract/Port/Command/Snapshot`, `Legacy surface`, `Guard`, `Not checked`. Workflows may reference this capsule instead of repeating a separate checklist.
- Do not introduce new productive consumers for broad Runtime-/Global-Surfaces such as `game.*`, `runtimeBundle`, `runtimeFacade`, `window.GAME_RUNTIME`, `curviosApp`/`__CURVIOS_APP__`, or `getActiveRuntimeConfig` unless the change names an explicit transition adapter with owner, successor, and sunset criterion.
- If no suitable Contract, Port, Command/Event, Snapshot, or Capability exists, name the gap in the Architecture Capsule before implementation instead of silently adding a new Runtime-/Global-Surface.
- Before modifying complex functions, consider splitting into smaller testable units.
- Validate edge cases and potential null values proactively.
- Prefer explicit naming over comments. Comments explain *why*, not *what*.
- When a fix keeps a non-obvious compatibility, migration, alias, or fallback path alive, leave a short inline comment at that seam so the next reader understands why the branch still exists.

## Agent Simplicity Guard

- Before changing code, name critical ambiguity instead of silently choosing an interpretation.
- Prefer the smallest implementation that satisfies the requested behavior.
- Every changed line must trace back to the current scope; avoid adjacent refactors, formatting churn, or speculative cleanup.
- For bugfixes or risky changes, define the smallest relevant verification signal before declaring the fix done.

## Responsibility Growth Guard

- Dateigroesse ist ein Review-Signal, kein Selbstzweck: nicht mechanisch splitten, komprimieren oder Helfer ohne klare Ownership auslagern, nur um ein Zeilenlimit zu unterschreiten.
- Vor fachlicher Erweiterung einer produktiven Datei ab 400 Zeilen pruefen, ob der Slice eine neue Verantwortung einfuehrt. Falls ja, die neue Verantwortung in ein benanntes Modul mit engem Zweck legen oder vor Umsetzung einen begruendeten Refactor-Scope planen.
- Dateien aus `scripts/architecture/LegacyMaxLinesConfig.mjs` sind Debt-Surfaces. Enge Bugfixes innerhalb der bestehenden Verantwortung bleiben erlaubt; neue Verantwortlichkeiten duerfen dort nicht weiter anwachsen.
- Netto-Wachstum einer Debt-Surface braucht vor Abschluss eine kurze Begruendung und Evidence: Ausgangsstand, fachliches Delta, warum keine sichere Extraktion im aktuellen Slice erfolgt und welcher Nachfolger- oder Refactor-Pfad die Schuld begrenzt.
- Erhoehungen bestehender Legacy-Ceilings sind keine routinemaessige Bugfix-Massnahme. Sie sind Governance-/Guard-Aenderungen (`D3`) und brauchen User-Gate, Begruendung und Rueckbaukriterium.
- Refactor-Slices schneiden entlang fachlicher Verantwortung, Lifecycle-Grenze oder testbarer Berechnung. Pro Slice bevorzugt genau eine Verantwortung extrahieren und danach das passende Legacy-Ceiling senken oder entfernen.

## Dead Code Prevention

- Replace-first: when a newer path is introduced, migrate active consumers and remove the old path in the same scope whenever safely possible.
- Avoid long-running parallel old/new implementations without named owner, successor, and exit criterion.
- If an old path must remain, mark the entry path as `legacy`, `compatibility path`, `shim`, or `plan-drift` and name the intended successor.
- Contract-only or test-only usage is not enough evidence for productive runtime use.
- Prefer seams that make new consumers of legacy files obvious or impossible.

## Debugging

- Never guess — systematically narrow down root cause by analyzing logic flow and state.
- Verify proposed fixes for unintended side effects in related components.
- Test execution is user-owned; identify smallest relevant command and wait for user feedback.
- Prefer fixing the source of invalid data over generic null checks at the destination.
- Root-cause fixes are not done until the durable repo context is updated as well: add a short note in the appropriate block evidence, governance context, or `docs/plaene/CHANGELOG.md`.

## Performance (Hot Path)

- In `update`/`render` loops: minimize GC and allocation.
- Reuse objects/vectors (Object Pooling) instead of creating new instances per frame.
- Prefer efficient algorithms (fast AABB/OBB) over heavy math in repeating logic.

## Lifecycle

- Every created entity must have a planned destruction path.
- Ensure cleanup to prevent memory leaks, phantom collisions, or orphaned logic on restart.
- Validate spatial grids and entity managers correctly remove deleted object references.
