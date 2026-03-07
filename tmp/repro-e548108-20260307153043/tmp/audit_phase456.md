## Phase 4: Editor & Tooling

- **Editor**: Eigener In-Browser 3D Editor in `editor/`. Speichert JSON Maps passend zum `MapSchema.js`. Saubere Trennung.
- **Skripte**: NPM Scripts für `docs-freshness.mjs` (prüft Legacy-Pfade und Datumsstempel) und Playwright Smoke-Tests (`bot-benchmark`, `round-state`).

## Phase 5 & 6: Code-Qualität & Konsistenz

- Code ist durchgehend in modernem ES-Modules geschrieben (`import/export`).
- Trennung in `core`, `entities`, `hunt`, `state`, `ui` ist strikt und sinnvoll.
- `Player.js` und `Bot.js` sind die einzigen "God Classes", die potenziell weiter in ECS (Entity Component System) zerlegt werden könnten (z.B. PlayerInput, PlayerRender).
- Dokumentation (`docs/`) ist das führende System und wird via Script aktuell gehalten.
