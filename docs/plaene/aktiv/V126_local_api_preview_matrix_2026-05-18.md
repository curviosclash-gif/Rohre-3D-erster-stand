# V126 126.1 Local-API- und Preview-Matrix

Stand: 2026-05-18
Block: `V126` Local Dev-API, Preview- und Delivery-Hardening
Phase: `126.1`
Decision-Klasse: `D1` fuer read-only Analyse-Artefakt

## Scope-Guard

Dieser Start-Slice ist absichtlich gefahrlos geschnitten:

- Keine Aenderung an `package.json`, Lockfiles, Dependency-Versionen, Electron-Install oder CI.
- Keine neuen Pflicht-Gates, Hooks oder Pre-Commit-Policy.
- Keine Runtime-/Gameplay-Dateien unter `src/**` geaendert.
- Kein Bot-Training-Masterplan-Edit.
- Kein Code-Refactor in `vite.config.js`; diese Datei wurde nur gelesen.

## Gelesene Quelle

- `vite.config.js` auf `main`

## Route-/Surface-Matrix

| Surface | Registrierung | Methode/Pfad | Klasse | Aktueller Preview-Status | Zielentscheidung fuer V126 |
| --- | --- | --- | --- | --- | --- |
| Playwright Health | `playwrightHealthApiPlugin` | `GET /_pw/health` | `test-health`, `read-only` | in Dev und Preview registriert | Preview erlaubt; kein Mutationsrisiko. |
| Editor Map Disk Save | `editorDiskSaveApiPlugin` | `POST EDITOR_API_ROUTES.SAVE_MAP_DISK` | `local-mutation`, `disk-write` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Editor Vehicle Disk Save | `editorDiskSaveApiPlugin` | `POST EDITOR_API_ROUTES.SAVE_VEHICLE_DISK` | `local-mutation`, `disk-write` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Editor Vehicle List | `editorDiskSaveApiPlugin` | `GET EDITOR_API_ROUTES.LIST_VEHICLES_DISK` | `artifact-read`, `read-only` | in Dev und Preview registriert | Preview nur bewusst erlauben, wenn lokale Artefakt-Exposition akzeptiert ist. |
| Editor Vehicle Get | `editorDiskSaveApiPlugin` | `GET EDITOR_API_ROUTES.GET_VEHICLE_DISK` | `artifact-read`, `read-only` | in Dev und Preview registriert | Preview nur bewusst erlauben, wenn lokale Artefakt-Exposition akzeptiert ist. |
| Editor Vehicle Rename | `editorDiskSaveApiPlugin` | `POST EDITOR_API_ROUTES.RENAME_VEHICLE_DISK` | `local-mutation`, `disk-write` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Editor Vehicle Delete | `editorDiskSaveApiPlugin` | `POST EDITOR_API_ROUTES.DELETE_VEHICLE_DISK` | `local-mutation`, `disk-write` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Editor Video Save | `editorDiskSaveApiPlugin` | `POST EDITOR_API_ROUTES.SAVE_VIDEO_DISK` | `local-mutation`, `disk-write`, `large-body-write` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Latest Checkpoint | `latestCheckpointApiPlugin` | `GET /api/bot/latest-checkpoint` | `artifact-read`, `training-artifact-read` | in Dev und Preview registriert | Preview nur nach Risikopruefung erlauben; kann lokale Trainingsartefakte exponieren. |
| Training Status | `trainingDashboardApiPlugin` | `GET /api/training/status` | `artifact-read`, `training-state-read` | in Dev und Preview registriert | Preview read-only moeglich, aber lokale Artefakt-Exposition dokumentieren. |
| Training History | `trainingDashboardApiPlugin` | `GET /api/training/history` | `artifact-read`, `training-artifact-read` | in Dev und Preview registriert | Preview read-only moeglich, aber lokale Artefakt-Exposition dokumentieren. |
| Training Progress | `trainingDashboardApiPlugin` | `GET /api/training/progress` | `training-state-read`, `read-only` | in Dev und Preview registriert | Preview read-only moeglich; Ringbuffer folgt in `126.4`. |
| Training Start | `trainingDashboardApiPlugin` | `POST /api/training/start` | `process-control`, `training-process`, `local-mutation` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Training Stop | `trainingDashboardApiPlugin` | `POST /api/training/stop` | `process-control`, `training-process`, `local-mutation` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Training Schedule | `trainingDashboardApiPlugin` | `POST /api/training/schedule` | `process-control`, `disk-write`, `local-mutation` | in Dev und Preview registriert | Preview standardmaessig blockieren; nur mit explizitem Local-Mutation-Flag erlauben. |
| Training WebSocket | `trainingDashboardApiPlugin` | `WS /ws/training` | `training-state-read`, `websocket-upgrade` | nur `configureServer`; nicht in Preview verdrahtet | Dev-only lassen; fuer Preview nur bewusst read-only nachziehen, falls noetig. |
| OBJ Vehicle Asset Copy | `copyObjVehicleAssetsPlugin` | Build `writeBundle` | `build-artifact-copy`, `disk-write` im Build | nur `apply: build` | Kein Preview-API-Scope; nicht Teil des ersten Mutations-Gates. |

## 126.1 Entscheidungen

- Mutierende lokale APIs muessen in Preview standardmaessig aus sein.
- Explizites Opt-in sollte zentral benannt werden, z. B. `ENABLE_LOCAL_MUTATION_APIS=1`.
- Blockierte Preview-Mutationen sollten einheitlich mit `403 preview-local-mutation-disabled` antworten.
- Read-only Preview-Routen brauchen eine bewusste Expositionsentscheidung, weil lokale Trainings-/Vehicle-/Checkpoint-Artefakte trotzdem sensitiv sein koennen.
- `trainingDashboardApiPlugin` ist der beste erste Auslagerungskandidat fuer `126.5`, weil dort Spawn, Log-Ringbuffer und Preview-Gating zusammenhaengen.

## Kollisionen / Abgrenzung

| Block | Status fuer diesen Slice | Entscheidung |
| --- | --- | --- |
| V90 | keine Kollision | Keine Package-, Lockfile-, Dependency- oder CI-Aenderung. |
| V112 | keine Kollision | Kein Gameplay-, Input-, Playtest- oder Kollisionsfix. |
| V125 | keine Kollision | Keine neuen Pflicht-Gates, Hooks oder Architecture-Guard-Regeln. |
| Bot-Training | read-only Kontext | Keine Bot-Training-Phasen und kein Bot-Training-Masterplan-Edit. |

## Naechster kleinster Implementierungs-Slice

1. Kleinen Helper fuer Preview-Mutation-Gating einfuehren.
2. Mutierende Editor-/Training-POSTs in `configurePreviewServer` ohne Flag mit `403 preview-local-mutation-disabled` blockieren.
3. `buildCliArgs(config)` und Command-Resolver in eine testbare Einheit schneiden.
4. Contracttests fuer Preview-Gating und Spawn-Args ergaenzen.

## Verifikation

Nicht ausgefuehrt in diesem Start-Slice, weil der aktuelle Schritt ein read-only Analyse-Artefakt auf Branch ist und keine lokale Checkout-/Node-Ausfuehrung ueber den Connector verfuegbar war.

Empfohlene Gates vor Merge oder Folgecommit:

```bash
npm run plan:check
npm run check:plan-evidence-claims
node --test tests/vite-preview-local-api.contract.test.mjs
node --test tests/training-dashboard-spawn.contract.test.mjs
```
