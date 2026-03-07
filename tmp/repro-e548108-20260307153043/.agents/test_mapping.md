# Test Mapping

Use this table to select verification commands from changed paths.

## Path -> Command

- `src/entities/**` -> `npm run test:core` and `npm run test:physics`
- `src/state/**` -> `npm run test:core` and `npm run smoke:roundstate`
- `src/ui/**` -> `npm run test:core` and `npm run test:stress`
- `src/core/**` -> `npm run test:core`
- `tests/**` -> run the directly affected test command(s)
- `scripts/self-trail-*.mjs` -> `npm run smoke:selftrail`
- `scripts/round-state-*.mjs` -> `npm run smoke:roundstate`
- `editor/**` -> `npm run test:core`

## Fallback

- If no mapping matches, run `npm run test:core`.
