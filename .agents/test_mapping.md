# Test Mapping

Use this guide to choose the cheapest meaningful verification path for new feature work and block-end `*.99` runs.

## Klassen

- `guard`: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- `node-contract` (`contract`): `npm run test:contract`
- `desktop-smoke`: `npm run test:desktop:smoke`, `npm run test:playwright:desktop-smoke`
- `desktop-e2e`: `npm run test:desktop:e2e`, `npm run test:playwright:desktop-e2e`
- `browser-compat`: `npm run test:browser:compat`, `npm run test:playwright:browser-compat -- <spec-or-grep>`
- `heavy-diagnostic`: `npm run test:contract:targeted`, `npm run test:physics`, `npm run test:gpu`, `npm run test:stress`, `npm run test:heavy`, `npm run test:diagnostic`, `npm run test:v28:regression`, `npm run smoke:selftrail`, `npm run smoke:roundstate`, `npm run smoke:arcade`, `npm run test:editor-ui`

- `desktop-smoke` ist seit `V89.5.1` der kanonische Runner- und Skriptname fuer das primaere Desktop-Hauptgate; die Legacy-Aliasse `npm run test:smoke` und `npm run test:playwright:preview-smoke` bleiben nur als Kompatibilitaetsschicht bestehen.
- `desktop-smoke` startet den minimalen Electron-Smoke ueber `tests/helpers.desktop.js`; `tests/core.spec.js` prueft dabei App-Start, Menu-Sichtbarkeit, Preload-Bridge/`GAME_INSTANCE`, Matchstart, Input-Ankunft und Return-to-Menu auf der echten Desktop-Shell.
- `desktop-e2e` ist seit `V89.5.1` der kanonische Runner- und Skriptname fuer produktnahe Kernpfade; standardmaessig laufen nur `core-shell`, `core-platform`, `core-surface` und `core-runtime`. Die Legacy-Aliasse `npm run test:targeted` und `npm run test:playwright:dev-runtime` bleiben nur fuer bestehende Aufrufer bestehen.
- `desktop-e2e` deckt die produktnahen Kandidaten `tests/core-targeted.spec.js`, `tests/core-targeted-platform.spec.js`, `tests/core-targeted-surface.spec.js` und `tests/core-targeted-runtime.spec.js` ab.
- `heavy-diagnostic` bleibt absichtlich getrennt vom `desktop-e2e`-Hauptgate; die Restcluster `tests/core-targeted-regressions.spec.js`, `tests/physics-core.spec.js`, `tests/physics-hunt.spec.js`, `tests/physics-policy.spec.js`, `tests/arcade-blueprint.spec.js` und `tests/bot-targeting.spec.js` nutzen zwar weiter denselben Dev-Server-Harness, bleiben aber eigene Diagnose-Skripte statt primaerer Produktgates.
- `browser-compat` ist seit `V89.5.1` der kanonische Browser-/Demo-/Surface-Layer; der Legacy-Alias `npm run test:playwright:browser-contract` bleibt nur fuer bestehende Aufrufer bestehen.
- `browser-compat` deckt die fokussierten Browser-/Surface-/Demo-Vertraege `tests/network-adapter.spec.js`, `tests/recording.spec.js` und `tests/editor-vehicle.spec.js` ab.
- `tests/network-adapter.spec.js` prueft im Browser-Layer jetzt nur noch Web-Boot-nahe Adapter-Loads, browserseitige Signaling-/WebRTC-Fehlerpfade, Surface-Zugaenglichkeit und die bewusst degradierte Demo-Rolle fuer Host-/Discovery-Capabilities; produktnahe Match-/Zwei-Tab-Hauptpfade gehoeren nicht mehr in diesen Scope.
- `tests/recording.spec.js` prueft im Browser-Layer jetzt nur noch Browser-Recording-Support, MIME-/Capture-Kompatibilitaet und degradierte Demo-Faelle; Matchstart-, Return-to-Menu- und Export-Lifecycle bleiben produktnahe Desktop-/Runtime-Slices.
- `node-contract` deckt zusaetzlich browserunabhaengige Menu-Multiplayer-/Capability-/Storage-Vertraege in `tests/menu-multiplayer-bridge.contract.test.mjs` und `tests/platform-capabilities.contract.test.mjs` sowie KI-/Training-Gate- und Bridge-Vertraege in `tests/training-automation-core.contract.test.mjs` und `tests/training-environment.contract.test.mjs`.
- `V89.2.1` zieht den kuenftigen Desktop-Harness bewusst auf dem echten Electron-Bootpfad `electron/launch.cjs` -> `electron/main.cjs` -> `electron/static-server.cjs` -> `electron/preload.cjs` auf; seit `V89.5.1` sind `desktop-smoke`, `desktop-e2e` und `browser-compat` die offizielle Runner-Oberflaeche.
- Fuer diesen Uebergang bleibt der Artefaktvertrag der bestehende Run-Tag-/Output-Ordner-Schnitt aus `playwright.config.js` und `scripts/playwright-run-profile.mjs`; der Desktop-Harness soll denselben `PW_RUN_TAG`-/`PW_OUTPUT_DIR`-Stil uebernehmen, statt schon jetzt neue Namensraeume einzufuehren.
- Mindestartefakte des kuenftigen Desktop-Harness sind jetzt konkret `desktop-startup-diagnostics.json`, `desktop-main-process.log`, `desktop-renderer-console.log`, `desktop-renderer-errors.log`, `desktop-renderer-ready.png` und bei roten Laeufen `desktop-renderer-failure.png`; tiefere Trace-/Video-/Crashdump-Pakete bleiben spaeteren Phasen vorbehalten.
- `V89.2.2` fixiert die Ownership-Grenze: `tests/helpers.js` bleibt die heutige physische Basis fuer `helpers.browser` und behaelt nur Browser-/DOM-/Menue-/`GAME_INSTANCE`-Hilfen; Electron-Prozess, `BrowserWindow`, Preload-Bridge und Desktop-Artefakte gehoeren kuenftig ausschliesslich zu `helpers.desktop`.
- `V89.3.1` setzt diese Trennung erstmals produktiv um: `tests/helpers.desktop.js` besitzt Electron-Launch und Desktop-Readiness, waehrend `tests/helpers.js` nur rendererseitige Menu-/Matchflow-Helfer fuer bereits geladene Seiten bereitstellt.
- `V89.3.2` standardisiert den kleinen Desktop-Artefaktsatz direkt in `tests/helpers.desktop.js`: Diagnostics benennen letzte Stage, Failure-Klasse und Failure-Hints explizit; Main-Prozess-, Renderer-Console- und Renderer-Error-Logs bleiben ausschliesslich dort verankert.
- `tests/playwright-readiness.js` sowie die `httpProbe`-/`browserPrewarm`-Diagnostik in `tests/playwright.global-setup.js` bleiben die kanonische Browser-Basis und behalten die Failure-Klassen `startup|readiness|contract|runtime-regression|flake`.
- Die kuenftige Desktop-Basis haengt direkt an `electron/launch.cjs` -> `electron/main.cjs` -> `electron/static-server.cjs` -> `electron/preload.cjs`; ihre Readiness-Stufen sind `process_started -> window_created -> renderer_loaded -> preload_bridge_ready`, ihre Failure-Klassen `desktop-startup|desktop-readiness|desktop-runtime-regression|desktop-flake`.
- Die Trennung bleibt bewusst logisch statt vollstaendig physisch: keine Dateiumbenennung der Runner-Skripte und kein separater Heavy-Harness; die kanonische Skriptoberflaeche ist dennoch seit `V89.5.1` auf `desktop-smoke`, `desktop-e2e` und `browser-compat` umgestellt.

## Produktsignal und Gate-Reihenfolge

- Desktop ist das primaere Produktsignal: `guard` -> `contract` -> `desktop-smoke` (`npm run test:desktop:smoke`) -> erst danach gezielte `desktop-e2e`-Slices.
- `desktop-smoke` kommt vor `desktop-e2e`, weil Boot, Menu, Matchstart und Return-to-Menu das kleinste aussagekraeftige Hauptgate fuer die Desktop-App bilden.
- Innerhalb der kuenftigen Desktop-Gates kommt zuerst die Desktop-Readiness `process_started -> preload_bridge_ready`; Browser-Readiness ist danach nur noch fuer `browser-compat` und Demo-/Web-API-Scope relevant.
- `browser-compat` ist nachrangig und sichert nur Browser-, Demo-, Editor- und Web-API-Kompatibilitaet; dieser Layer ist kein primaeres Produkt- oder Release-Signal mehr.
- Unterhalb der Desktop-Gates bleibt `node-contract` der guenstigste gemeinsame Vertragslayer; breite oder lange Restcluster laufen bis zur weiteren Migration als `heavy-diagnostic`.

## Schnellwahl fuer neue Features

| Aenderungstyp | Leichtester passender Layer | Erst dann hochziehen |
| --- | --- | --- |
| Pure Logik, Contracts, Normalizer, Policy, Storage- oder Capability-Code ohne DOM, Browser-API, Electron-Boot oder echten Matchflow | `node-contract` | Nur wenn der neue Fehler erst mit echter App-, Browser- oder Desktop-Integration sichtbar wird |
| Sichtbarer Desktop-Hauptproduktpfad mit Risiko bei Boot, Menu, Matchstart, erstem Input oder Return-to-Menu | `desktop-smoke` | Nur wenn die Aenderung ueber den Smoke-Kern hinaus echte Session-, Plattform-, Recording- oder Mehrschritt-Integration beruehrt |
| Produktnahe Desktop-Integration ueber den Smoke-Kern hinaus, z. B. Session-/Lobby-Lifecycle, Plattform-Capabilities, Recording-Lifecycle oder breitere Runtime-Pfade | `desktop-e2e` | Nur wenn bereits bestehende schwere Diagnose-Cluster direkt betroffen sind oder der Fehler sonst nicht isolierbar ist |
| Browser-Demo, Web-APIs, degradierte Browser-Fallbacks, browsernahe Surface-Routen oder Editor-/Vehicle-Lab-Webpfade | `browser-compat` | Nicht fuer Desktop-Hauptproduktpfade; dafuer zuerst `desktop-smoke` oder `desktop-e2e` |
| Physics-, Bot-, GPU-, Stress-, Legacy- oder andere bestehende Diagnose-Cluster | `heavy-diagnostic` | Nie als Default fuer neue Features; nur bei direktem Scope-Treffer oder explizitem Analysebedarf |

- Waehle immer den ersten fachlich passenden Layer, nicht den groessten vorhandenen Runner.
- Desktop-first heisst: Wenn ein gemeinsamer Contract-Test reicht, bleibe bei `node-contract`; wenn ein sichtbarer Desktop-Hauptpfad betroffen ist, starte bei `desktop-smoke` statt direkt bei `desktop-e2e`.
- `browser-compat` ist ein Seitenscope fuer Browser-Demo, Web-API und degradierte Web-Faelle, nicht die Abkuerzung fuer produktnahe Desktop-Regressionen.
- `heavy-diagnostic` bleibt Reserve fuer bestehende schwere Cluster; neue Feature-Arbeit soll dort nicht anfangen.

## Einsatzregel

- Standardreihenfolge: `guard` -> `node-contract` -> `desktop-smoke` -> nur bei produktnaher Lifecycle-/Integrationsfrage `desktop-e2e`.
- Playwright nur fuer DOM-, Canvas-, Browser-API- oder Runtime-Integration einsetzen.
- `desktop-smoke` ist in `V89` das primaere Produktsignal fuer die Desktop-App.
- Neue Feature-Arbeit startet auf dem leichtesten passenden Layer und wird nur bei ungedecktem Restrisiko eskaliert.
- `node-contract` bleibt die Standardwahl fuer gemeinsame Runtime-, Match-, KI-, Storage-, Config- und Capability-Vertraege ohne UI-Harness-Bedarf.
- `desktop-smoke` ist die Standardwahl fuer Desktop-Hauptproduktpfade, solange kein breiterer Mehrschritt- oder Plattform-Integrationsbedarf vorliegt.
- Solange die physische Aufspaltung noch nicht erfolgt ist, gilt `tests/helpers.js` als Browser-Helfer und darf keine neuen Desktop-only-Aufgaben aufnehmen; die Desktop-Readiness bleibt an der Electron-Bootkette verankert.
- `desktop-e2e` wird nach `desktop-smoke` fuer gezielte produktnahe Kernpfade genutzt; breite Physics-/Bot-/Regression-Cluster bleiben aktuell `heavy-diagnostic`.
- `browser-compat` bleibt fuer fokussierte Checks mit expliziter Spec- oder `--grep`-Selektion reserviert.
- Redundante Produkt-Hauptpfade wie Matchstart, Return-to-Menu, Recorder-Lifecycle im Live-Match oder laengere Zwei-Tab-Lobby-Stabilitaet werden nicht ueber `browser-compat` gatebar gemacht; sie bleiben bei `desktop-smoke` bzw. den produktnahen `desktop-e2e`-Slices.
- Vollflaechige Editor-Surfaces bleiben auf `npm run test:editor-ui` (`playwright.editor.config.mjs`) und werden nicht in die Runtime-Profile gezogen.
- `heavy-diagnostic` bleibt fuer passende Scopes oder das Abschluss-Gate reserviert.
- Waehrend normaler Blockphasen werden die zugeordneten Tests vorbereitet, aber ohne expliziten User-Wunsch nicht standardmaessig ausgefuehrt.

## Path -> Command

- `src/core/config/**` -> `npm run test:contract`
- `src/ui/menu/MenuMultiplayerBridge.js` -> `npm run test:contract`
- `src/ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js` -> `npm run test:contract`
- `src/platform/browser/BrowserPlatformAdapters.js` -> `npm run test:contract`
- `src/platform/electron/ElectronPlatformBridge.js` -> `npm run test:contract`
- `src/state/storage/StoragePlatform.js` -> `npm run test:contract`
- `src/entities/ai/training/**` -> `npm run test:contract`
- `src/entities/ai/**` -> `npm run test:contract`
- `src/entities/player/**` -> `npm run test:contract`
- `src/hunt/**` -> `npm run test:contract` then `npm run test:physics`
- `src/modes/**` -> `npm run test:contract`
- `src/network/**` -> `npm run test:contract` then `npm run test:browser:compat -- tests/network-adapter.spec.js`
- `src/shared/vehicle-lab/**` -> `npm run test:browser:compat -- tests/editor-vehicle.spec.js`
- `src/shared/contracts/**` -> `npm run test:contract`
- `src/state/training/**` -> `npm run test:contract`
- `src/state/**` -> `npm run test:contract` then `npm run smoke:roundstate`
- `src/core/runtime/**` -> `npm run test:desktop:smoke` then `npm run test:desktop:e2e -- core-shell core-platform core-surface core-runtime`
- `src/core/recording/**` -> `npm run test:desktop:smoke` then `npm run test:browser:compat -- tests/recording.spec.js`
- `src/core/Renderer.js` -> `npm run test:desktop:smoke` then `npm run test:heavy`
- `src/ui/**` -> `npm run test:desktop:smoke`
- `editor/js/EditorAssetLoader.js` -> `npm run test:browser:compat -- tests/editor-vehicle.spec.js`
- `editor/**` -> `npm run test:editor-ui`
- `tests/*.contract.test.mjs` -> `npm run test:contract`
- `tests/core.spec.js` -> `npm run test:playwright:desktop-smoke`
- `tests/core-targeted.spec.js` -> `npm run test:playwright:desktop-e2e`
- `tests/core-targeted-platform.spec.js` -> `npm run test:playwright:desktop-e2e`
- `tests/core-targeted-surface.spec.js` -> `npm run test:playwright:desktop-e2e`
- `tests/core-targeted-runtime.spec.js` -> `npm run test:playwright:desktop-e2e`
- `tests/core-targeted-regressions.spec.js` -> `npm run test:desktop:e2e -- core-regressions`
- `tests/physics-*.spec.js` -> `npm run test:physics`
- `tests/network-adapter.spec.js` -> `npm run test:playwright:browser-compat -- tests/network-adapter.spec.js`
- `tests/recording.spec.js` -> `npm run test:playwright:browser-compat -- tests/recording.spec.js`
- `tests/training-automation-core.contract.test.mjs` -> `npm run test:contract`
- `tests/training-environment.contract.test.mjs` -> `npm run test:contract`
- `tests/editor-vehicle.spec.js` -> `npm run test:playwright:browser-compat -- tests/editor-vehicle.spec.js`
- `tests/menu-multiplayer-bridge.contract.test.mjs` -> `npm run test:contract`
- `tests/platform-capabilities.contract.test.mjs` -> `npm run test:contract`
- `tests/gpu.spec.js` -> `npm run test:heavy`
- `tests/stress.spec.js` -> `npm run test:heavy`
- `tests/v28-regression.spec.js` -> `npm run test:heavy`
- `tests/tmp-shorts-diagnostic.spec.js` -> `npm run test:diagnostic`
- `scripts/self-trail-*.mjs` -> `npm run smoke:selftrail`
- `scripts/round-state-*.mjs` -> `npm run smoke:roundstate`
- Workflow-/Plan-/Rule-Aenderungen -> `npm run plan:check` and `npm run docs:check`

## Fallback

- If no mapping matches, start with `npm run test:contract`.
- If the change touches visible runtime flow and no narrower mapping exists, escalate to `npm run test:desktop:smoke`.
- Escalate from `desktop-smoke` to `desktop-e2e` only when the change genuinely needs broader desktop lifecycle or platform integration coverage.
- Use `npm run test:browser:compat -- <spec-or-grep>` only when the affected behavior is intentionally browser-specific or a degraded browser fallback.
- Use `heavy-diagnostic` only when an existing heavy cluster is the smallest truthful reproduction path.
- Use `npm run test:core` only when you intentionally want the cheap default path (`contract + smoke`) in one command.
- Use `npm run test:playwright:browser-compat -- <spec-or-grep>` only with an explicit selector; the runner aborts bare invocations on purpose.

## Parallelisierung

For parallel Playwright runs isolate port and artifacts:

```
TEST_PORT=5174 PW_RUN_TAG=desktop-smoke-bot1 PW_OUTPUT_DIR=test-results/desktop-smoke-bot1 npm run test:playwright:desktop-smoke
TEST_PORT=5175 PW_RUN_TAG=desktop-e2e-bot2 PW_OUTPUT_DIR=test-results/desktop-e2e-bot2 npm run test:playwright:desktop-e2e
```

Wichtig: Keine parallelen Runs mit identischem `TEST_PORT` oder identischem `PW_OUTPUT_DIR`.
`desktop-smoke` erzwingt Preview-Server plus `PW_PREWARM=0`; `desktop-e2e` und `browser-compat` erzwingen den Vite-Dev-Server ohne Modul-Warmup.
