# Guardrails

## Why the raw prompt is unsafe

- It assumes "first open `[ ]`" is enough, but the plan uses locks and currently already has an active `BT93B` stream.
- It does not stop on a dirty worktree, so an unattended run can commit on top of unrelated local edits.
- It does not distinguish "continue active block" from "claim a new block", which is required once a loop spans multiple chats.
- It does not force the token-efficiency rule, so repeated runs can reread too much context and waste budget.
- It assumes `bot-training` branch work is always allowed, while repo policy requires explicit non-`main` approval.
- It can run overnight without an overlap guard, even though standalone recurring jobs do not expose a direct "start exactly when prior chat ends" hook here.

## Safe minimum

- Clean worktree only.
- Exactly one relevant active block, or none plus an explicit claim path.
- Mandatory `.agents/rules/token_efficiency_and_tools.md` read on every run.
- One subphase per run.
- No push by default.
- Immediate stop on blocker, lock mismatch, or guard failure.
