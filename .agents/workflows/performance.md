---
description: Measure baseline, optimize bottlenecks, and verify impact.
---

## 0. Context (optional – skip if target is already clear)

- Read `docs/Umsetzungsplan.md` and recent commits.
- Confirm slow scenario (FPS/load/latency).

## 1. Baseline

- Run relevant tests/benchmarks.
- Capture metrics: FPS, frame time, draw calls, memory.

## 2. Bottlenecks

- Identify top 3 issues (CPU/GPU/alloc/GC).
- Estimate impact per issue.

## 3. Optimize

- Implement smallest high-impact change first.
- Keep logic behavior unchanged unless requested.

## 4. Verify

- Re-run baseline scenario.
- Report before/after deltas.

## 5. Commit

```bash
git add [scoped-files]
git commit -m "perf: [short reason]"
```

- Verify scope first: `git diff --name-only`.

## Report

Standardformat verwenden.
