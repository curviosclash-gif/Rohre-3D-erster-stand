---
trigger: task_execution_with_blockers
description: Rule for mandatory blocker and error reporting during task execution
---

- If implementation hits a blocker, repeated failure, unexpected regression, or unresolved runtime error, create or update a task-scoped error report under `docs/Fehlerberichte/` before stopping, handing off, or changing approach.
- Error reports must be concise and evidence-driven. Record the task context, observed failure, reproduction path, affected files/components, attempted fixes, current status, and next concrete step.
- Prefer updating the existing report for the same task instead of creating multiple fragmented files.
- Do not leave unresolved implementation problems only in chat output or terminal logs; the durable status belongs in `docs/Fehlerberichte/`.
