---
trigger: commit_or_push_activity
description: Enforce main-first workflow and local recovery safety net
---

- Implement and integrate on `main` by default.
- Before commit/push, run `npm run guard:main` (or rely on hook execution that runs the same guard).
- For explicit exceptions, require user approval and scope `ALLOW_NON_MAIN=1` to the single command.
- Before push on `main`, run `npm run snapshot:tag` to create a local recovery tag for current HEAD.
- Keep `.husky/.bypass` ignored/untracked so hook bypass cannot leak into repository history.
