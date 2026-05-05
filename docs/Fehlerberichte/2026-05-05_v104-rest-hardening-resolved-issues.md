# 2026-05-05 V104 Rest-Hardening - Resolved Issues

## Kontext
- Scope: Rest-Hardening nach V104 (Constructor/Game-Kopplung reduzieren, PlatformCapabilityRegistry modularisieren, Mojibake bereinigen).
- Ziel: Keine Funktionsaenderung, keine neuen globalen Runtime-Reads, alle Pflichtchecks gruen.

## Fehler 1 - Architecture Boundary Guard
- Symptom:
  - `npm run check:architecture:boundaries` schlug fehl mit
  - `core -> ui import @ src/core/GameBootstrap.js -> src/ui/KeybindEditorController.js`
- Ursache:
  - Beim Constructor-Refactor wurde `createKeybindEditorRuntimeAccess` direkt aus `src/ui/KeybindEditorController.js` in `src/core/GameBootstrap.js` importiert.
- Fix:
  - Re-Export des Helpers ueber `src/composition/core-ui/CoreUiBootstrapPorts.js`.
  - `src/core/GameBootstrap.js` importiert den Helper wieder nur ueber den Composition-Port.
- Status:
  - Resolved.

## Fehler 2 - Platform Capability Contract Test
- Symptom:
  - `node --test tests/platform-capabilities.contract.test.mjs` hatte 1 Fail:
  - `V77.2.2 runtime menu feature flags read host access from surface capability contract`
  - Assertion: `desktopFlags.canHost` war `false` statt `true`.
- Ursache:
  - Nach Registry-Modularisierung fehlte im Consumer `MenuRuntimeFeatureFlags` der Electron-Runtime-Snapshot im Resolver-Input.
- Fix:
  - `src/ui/menu/MenuRuntimeFeatureFlags.js` nutzt `resolveElectronRuntimeSnapshot(...)`.
  - `resolveSurfacePolicy(...)` und `resolveSurfaceCapabilityAccess(...)` erhalten `platformRuntimeSnapshot` statt impliziter Global-Auswertung.
- Status:
  - Resolved.

## Abschluss-Check
- `npm run typecheck:architecture` -> pass
- `npm run check:architecture:boundaries` -> pass
- `npm run check:architecture:metrics` -> pass
- `npm run graph:build` -> pass
- `npm run graph:check` -> pass
- `npm run plan:check` -> pass
- `npm run docs:sync` -> pass
- `npm run docs:check` -> pass

## Reststatus
- Kein offener Blocker aus diesem Lauf.
