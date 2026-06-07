---
description: Restructure code without changing behavior.
---

## 0. Scope

- Identify module and refactor objective. Confirm no behavior change.
- Bei architekturrelevantem Refactor die Architecture Capsule aus `.agents/rules/code_quality_and_debugging.md` benennen; neue Dependency-Kanten, Legacy-Surfaces, Runtime-/Global-Surfaces oder Application/UI/Core-Grenzen brauchen den `code.md`-Pfad und passenden Guard.
- Bei Dateien ab 400 Zeilen oder Debt-Surfaces aus `scripts/architecture/LegacyMaxLinesConfig.mjs` die aktuelle Verantwortung, den Vorher-Zeilenstand und genau eine bevorzugte Extraktionsgrenze fuer den Slice benennen.

## 1. Baseline

// turbo
- Capture baseline behavior from existing code, docs, or user-provided test evidence. Run baseline tests only after explicit user request.
- Fuer grosse oder gelistete Debt-Surfaces Vorher-/Nachher-Zeilenstand, produktive Konsumenten und kleinstes passendes Regression-Signal erfassen.

## 2. Refactor

- Reduce duplication and long functions.
- Clarify module boundaries and naming.
- Pro Slice bevorzugt genau eine fachliche Verantwortung, Lifecycle-Grenze oder testbare Berechnung extrahieren; kein mechanischer Split und kein versteckter Feature-Umbau.
- If the refactor reveals suspected dead code, classify it but do not delete it without replacement proof.
- When a new structure replaces an old path, migrate active consumers and document the remaining delete criterion.
- Nach erfolgreicher Extraktion das betroffene Legacy-Ceiling in einem passenden Guard-Scope senken oder entfernen; bleibt es unveraendert, die Restschuld und den naechsten Slice dokumentieren.

## 3. Verify

// turbo
- Re-run baseline tests only after explicit user request. Otherwise document the recommended regression checks for the user.
- If refactor touches plans/workflows/rules: `npm run plan:check`.
- `npm run docs:sync && npm run docs:check`.

## 4. Commit

- Git-Policy: `.agents/rules/git_and_commits.md`.

- `git add [scoped-files]` -> `refactor: [scope] - [reason]`
- Verify staged scope: `git diff --cached --name-only`; remaining worktree changes via `git status --short`.

## Report

Standardformat verwenden.
