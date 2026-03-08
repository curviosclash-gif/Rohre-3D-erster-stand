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

## Schnellpfad (nur bei kleinen Aenderungen)

- `src/ui/**` nur visuell → `npm run test:core` reicht, `test:stress` entfaellt
- `src/entities/Bot*.js` → `npm run test:physics:core` reicht, `test:physics:hunt` und `test:physics:policy` entfallen
- `src/core/MediaRecorderSystem.js` → nur T20a/T20af/T20n aus `test:core`
- Workflow-/Doc-Aenderungen → keine Tests noetig

## Port-Konflikte vermeiden

Bei parallelen Test-Runs verschiedene Ports nutzen:

```
TEST_PORT=5174 npm run test:core
TEST_PORT=5175 npm run test:physics
```
