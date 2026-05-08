---
description: Code quality, debugging, performance, and lifecycle (consolidated)
---

<!-- Frontmatter-Feld `trigger:` entfallen ab V93 93.3.3 - Rule-Aktivierung ist nicht maschinell ausgewertet. -->


## Code Quality

- Prioritize clean, maintainable, self-documenting code.
- Adhere to architectural patterns (source: `docs/referenz/ai_architecture_context.md`).
- Before modifying complex functions, consider splitting into smaller testable units.
- Validate edge cases and potential null values proactively.
- Prefer explicit naming over comments. Comments explain *why*, not *what*.
- When a fix keeps a non-obvious compatibility, migration, alias, or fallback path alive, leave a short inline comment at that seam so the next reader understands why the branch still exists.

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
