---
description: Measure baseline, optimize bottlenecks, and verify impact.
---

## 0. Context (skip if target is clear)

// turbo
- Read `docs/Umsetzungsplan.md` and recent commits. Confirm slow scenario.

## 1. Baseline

// turbo
- Run relevant tests/benchmarks. Capture: FPS, frame time, draw calls, memory.

## 2. Bottlenecks

- Identify top 3 issues (CPU/GPU/alloc/GC). Estimate impact per issue.

## 3. Optimize

- Implement smallest high-impact change first. Keep logic behavior unchanged unless requested.

## 4. Verify

// turbo
- Re-run baseline scenario. Report before/after deltas.

## 5. Commit (see AGENTS.md §Commit Convention)

- `git add [scoped-files]` → `perf: [short reason]`
- Verify scope: `git diff --name-only`.

## Report

Standardformat verwenden.
