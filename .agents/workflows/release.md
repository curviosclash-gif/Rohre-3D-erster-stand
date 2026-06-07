---
description: Prepare and publish a safe release.
---

## 0. Pre-check

// turbo
- Automated release tests are user-owned. Wait for explicit user request or user-provided test evidence before counting test coverage as complete.
- `npm audit` (no critical issues)
- `git status` clean

## 1. Versioning

- Read current version from `package.json`. Choose patch/minor/major.

## 2. Changelog

- Update `CHANGELOG.md` from `git log`. Include new/changed/fixed sections and call out desktop-app-relevant changes before demo-only notes.

## 3. Build + governance + freshness gates

// turbo
- `npm run build`
- `npm run plan:check`
- `npm run docs:sync && npm run docs:check`
- Ensure release notes and plan status are date-accurate and reflect the desktop-first / online-demo product positioning.

## 4. Tag and push

- Git-Policy: `.agents/rules/git_and_commits.md`.
- `git add [release-files]` -> `release: v[X.Y.Z]`
- `git tag -a v[X.Y.Z] -m "Release v[X.Y.Z]"`
- Verify staged scope via `git diff --cached --name-only` and remaining worktree changes via `git status --short` before push.

## Report

Standardformat verwenden.
