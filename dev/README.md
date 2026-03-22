# Dev Layout Staging

This folder stages the future `dev/` migration from V43.

- `dev/scripts/*` are compatibility wrappers that currently forward to legacy `scripts/*`.
  - includes training entrypoints and `verify-lock` for test/benchmark lock orchestration.
- `dev/bin/*` hosts launcher helper scripts and keeps root `start_*.bat` files thin.
- `dev/tests/`, `dev/trainer/`, and `dev/prototypes/` are reserved targets for the later physical move.

Path resolution for migration-safe tooling is centralized in `scripts/dev-layout-paths.mjs`.
