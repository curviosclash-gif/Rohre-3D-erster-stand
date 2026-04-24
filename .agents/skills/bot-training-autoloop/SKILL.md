---
name: bot-training-autoloop
description: Use when the user wants to analyze, harden, or schedule an unattended recurring bot-training loop, especially for BT93+ style work that should resume in fresh standalone jobs. This skill replaces unsafe raw loop prompts with a guarded preflight, mandatory token-efficiency rules, a one-subphase execution limit, and paused or suggested Codex automations by default.
---

# Bot Training Autoloop

Use this skill for recurring bot-training automation, overnight runs, or "start a new chat/job after the last one ends" requests.

## Read first

- `.agents/rules/planning_and_governance.md`
- `.agents/rules/git_and_commits.md`
- `.agents/rules/token_efficiency_and_tools.md`
- `.agents/workflows/fix-planung.md`
- the smallest relevant slice of `docs/bot-training/Bot_Trainingsplan.md`

## Hard rules

- Never schedule the raw user prompt unchanged for unattended execution.
- Token-efficiency is mandatory on every run. Read `.agents/rules/token_efficiency_and_tools.md` first and follow its file-read budget.
- Prefer standalone cron automations for "new chat per cycle". Heartbeats stay in the same thread.
- Default to `codex_app.automation_update` as `suggested_create` or `PAUSED`, not a live active automation, unless the user explicitly asks to activate it.
- Before proposing or running the loop, use `python/scripts/bt_autoloop_preflight.py --branch bot-training --owner Bot-Codex --block-regex '^BT9' --json`.
- If preflight reports a dirty worktree, branch mismatch, behind/diverged upstream, multiple matching active blocks, or an owned active block with no open subphase, stop and report.

## Prompt shaping

- Load [references/guardrails.md](references/guardrails.md).
- Load [references/safe-prompt.md](references/safe-prompt.md).
- Continue an already active owned block before claiming a new free block.
- Execute exactly one subphase per run.
- Keep reads narrow: do not reread files already in context, and only open the current relevant BT plan slice.
- Never push unless a `*.99` gate is complete or the user explicitly asked for push.
- On any blocker or guard failure, stop without edits.

## Automation mapping

- If the user wants a fresh standalone run each cycle, use a cron automation.
- If the user wants this same thread to wake up later, use a heartbeat.
- For overnight setups, recommend a paused or suggested automation first and only activate after preflight is clean.
