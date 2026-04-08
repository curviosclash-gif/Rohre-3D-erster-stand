# Fehlerbericht: V87 87.99 Playwright-Abschlussgate blockiert

## Kontext

- Task: `V87 87.99` Abschluss-Gate fuer Runtime-Hardening verifizieren und den Block schliessen
- Erwartetes Verhalten: Pflicht-Gates plus die fuer den Scope relevanten Tests (`npm run test:contract`, `npm run smoke:roundstate`, `npm run test:smoke`, `npm run test:targeted`) laufen gruen

## Beobachtung

- Architektur-, Plan-, Doku- und Build-Gates sind gruen:
  - `npm run architecture:report` PASS
  - `npm run check:architecture:boundaries` PASS
  - `npm run check:architecture:metrics` PASS
  - `npm run check:architecture:ratchet` PASS
  - `npm run typecheck:architecture` PASS
  - `npm run plan:check` PASS
  - `npm run docs:sync` PASS (`updated=0`)
  - `npm run docs:check` PASS
  - `npm run build` PASS
- Node- und Scope-Smokes sind gruen:
  - `npm run test:contract` PASS
  - `npm run smoke:roundstate` PASS
  - `npm run test:smoke` PASS (`TEST_PORT=5561`, `PW_RUN_TAG=v87-smoke-20260407`, `PW_OUTPUT_DIR=test-results/v87-smoke-20260407`)
- Der alte Browser-/Harness-Startblocker ist entkoppelt:
  - `test:targeted` laeuft im engeren `dev-runtime`-Aggregat (`tests/core-targeted.spec.js`, `tests/physics-core.spec.js`, `tests/physics-hunt.spec.js`, `tests/physics-policy.spec.js`, `tests/arcade-blueprint.spec.js`, `tests/bot-targeting.spec.js`) und bricht nicht mehr am Preview-/Probe-Startpfad fest
  - `test-results/v87-targeted-dev-20260408/playwright-startup-diagnostics.json` meldet `serverReady=true`, `shellReady=true`, `ready=true`; `appReady` bleibt dabei `false`, `appBootState=menu_shell_ready`, weil `strictPrewarm=false` den Lauf bereits auf Shell-Readiness freigibt
  - `tmp-v87-targeted-dev-20260408.log` enthaelt kein `fetch failed`/`probe-timeout`, sondern nur den Hinweis `app boot probe reached only "menu_shell_ready"; continuing because strict prewarm is disabled`
- Fuer `test:targeted` wurde der Serververtrag gesplittet:
  - Smoke bleibt auf Preview, weil dort kein Browser-Source-Import benoetigt wird
  - Targeted nutzt wieder den Vite-Dev-Server, weil mehrere Tests im Browserkontext `import('/src/...')` ausfuehren und im Preview-Modus reproduzierbar mit `Failed to fetch dynamically imported module` brechen
  - Ab `V88 88.1.1` ist dieser Split als expliziter Run-Profile-Vertrag benannt: `preview-smoke` fuer den Preview-Pfad, `dev-runtime` fuer den Dev-Server-Pfad; fokussierte browsernahe Vertrags-Reruns koennen zusaetzlich ueber `browser-contract` mit expliziter Selektion laufen
  - Einordnung ab 2026-04-08 (`V88 88.1.2`): Der aktuelle `dev-runtime`-/`test:targeted`-Vertrag umfasst nur noch breite Runtime-Slices (`core-targeted`, `physics-*`, `arcade-blueprint`, `bot-targeting`); `tests/network-adapter.spec.js`, `tests/recording.spec.js`, `tests/training-automation.spec.js` und `tests/editor-vehicle.spec.js` laufen seither bewusst nur noch ueber `browser-contract` mit expliziter Selektion
- Der verbleibende Blocker ist jetzt inhaltlich:
  - `TEST_PORT=5588 PW_RUN_TAG=v87-targeted-dev-20260408 PW_OUTPUT_DIR=test-results/v87-targeted-dev-20260408 npm run test:targeted` endet nach 28.3 Minuten mit `105 passed`, `35 failed`, `1 flaky`, `3 skipped`, `124 did not run`
  - geschnittene Fail-Cluster im engeren `dev-runtime`-Vertrag:
    - `core-targeted`: 12 Fails (`T14`, `V74.3` `:6777`, `:6889`, `:6993`, `:8664`, `V87.2` `:7182`, `:7249`, `:7434`, `V87.4` `:7986`, `:8041`, `:8403`, `:8516`)
    - `physics-hunt`: 16 Fails (`T62a`, `T62`, `T63`, `T84`, `T85`, `T88`, `T89`, `T89d`, `T89e`, `T89a`, `T89i`, `T89j`, `T89j1`, `T89k`, `T89b`, `T89c`)
    - `physics-policy`: 5 Fails (`T78`, `T78e`, `T80c`, `T80e`, `T82`)
  - angrenzender Nebenrest ausserhalb der drei Hauptcluster:
    - `physics-core`: 2 Fails (`T43b`, `T45c`)
  - dazu kommt weiterhin ein sporadischer Browser-Flake:
    - `tests/core-targeted.spec.js:158` (`T1: Seite laedt ohne JS-Fehler`) kann den ersten `page.goto`-Versuch noch mit `Timeout 45000ms exceeded` verlieren; Retry gruenteils erfolgreich
  - der naechste frische Voll-Lauf nach geschlossenem `core-targeted`-Rest schneidet den Stand weiter zusammen:
    - `TEST_PORT=5593 PW_RUN_TAG=v87-targeted-dev-rerun-20260408 PW_OUTPUT_DIR=test-results/v87-targeted-dev-rerun-20260408 npm run test:targeted` endet nach 56.0 Minuten mit `104 passed`, `23 failed`, `1 flaky`, `2 skipped`, `138 did not run`
    - `core-targeted` liefert darin keine Produktionsfails mehr; stattdessen faellt `tests/core-targeted.spec.js:158` (`T1`) direkt als `page.goto`-Harness-Fail aus, `tests/core-targeted.spec.js:6720` (`V56.1`) bleibt `page.goto`-flaky und der bekannte `T14`-Slice wird dadurch im Voll-Lauf gar nicht erst wieder erreicht
    - verbleibende Produktionscluster im neuen Schnitt:
      - `physics-core`: 2 Fails (`T43b`, `T45c`)
      - `physics-hunt`: 16 Fails (`T62a`, `T62`, `T63`, `T84`, `T85`, `T88`, `T89`, `T89d`, `T89e`, `T89a`, `T89i`, `T89j`, `T89j1`, `T89k`, `T89b`, `T89c`)
      - `physics-policy`: 4 Fails (`T78`, `T78e`, `T80c`, `T80e`)

## Reproduktion

1. `TEST_PORT=5593 PW_RUN_TAG=v87-targeted-dev-rerun-20260408 PW_OUTPUT_DIR=test-results/v87-targeted-dev-rerun-20260408 npm run test:targeted`
2. Artefakte pruefen:
   - `tmp-v87-targeted-dev-rerun-20260408.log`
   - `test-results/v87-targeted-dev-rerun-20260408/playwright-startup-diagnostics.json`
   - `test-results/v87-targeted-dev-rerun-20260408/.last-run.json`
   - `test-results/v87-targeted-dev-rerun-20260408/`

## Betroffene Komponenten

- `tests/core-targeted.spec.js`
- `tests/physics-core.spec.js`
- `tests/physics-hunt.spec.js`
- `tests/physics-policy.spec.js`
- `tests/helpers.js` (`loadGame`)
- `tests/playwright.global-setup.js`
- `scripts/run-playwright-targeted.mjs`
- `scripts/playwright-run-profile.mjs`
- Playwright-/Vite-Browser-Readiness auf `127.0.0.1:<port>`
- Legacy-Settings-Migrationspfad fuer die aktuelle Storage-Namespace-Uebernahme

## Bereits getestete Ansaetze

- Ansatz: Capability-Vertrag Browser/Desktop angleichen und Browser-Noops fuer Desktop-only-Capabilities auf `null`-Intents zurueckziehen
- Ergebnis: umgesetzt; Fokus-Targeted-Checks fuer `V87.3` gruenteils gruen
- Ansatz: Storage-Migration auf strukturiertes Result plus Warnsignal bei `remove`-Fehlern heben
- Ergebnis: umgesetzt; `npm run test:smoke` jetzt gruen, Legacy-Key wird im Smoke entfernt
- Ansatz: Preview-/Readiness-Diagnostik scharf trennen und runspezifische Server-Logs erzeugen
- Ergebnis: umgesetzt; Startup-Diagnostik trennt jetzt `serverReady`, `shellReady`, `appReady` und referenziert nur noch aktuelle Run-Logs
- Ansatz: `test:targeted` auf dev-server-basierten Browser-Source-Import-Vertrag umstellen und aggressives Module-Warmup fuer diesen Pfad deaktivieren
- Ergebnis: Startup-/Harness-Blocker verschwindet; die Suite laeuft bis zu echten Assertion-Fails statt mit `fetch failed`/`probe-timeout` abzubrechen
- Ansatz: Finalize-/Start-Sequencing in `MatchLifecycleSessionOrchestrator`, `GameRuntimeSessionHandler`, `MatchFinalizeFlowService`, `GameRuntimeFacade` und `UiIntentAtomicity` so nachziehen, dass Pending-Guards vor Promise-Settlement geraeumt werden, `menu_opened` nicht mehr vor `match_finalized` laeuft und explizit injizierte Runtime-Ports im Facade-Testvertrag wieder greifen
- Ergebnis: fokussierte `core-targeted`-Reruns schliessen die inhaltlichen Charakterisierungen `:6993`, `:7182`, `:7434`, `:7986`, `:8041`, `:8516`; `:7249` und `:8664` laufen mit denselben Test-Stubs in direkter `node`-Repro gruen und sind spaeter auch im Browser-Rerun gruen.
- Ansatz: `MatchSessionFactory` gegen vorzeitiges `clearMatchScene()` ohne bestehende Session haerten und die Portal-Normalisierung fuer authored Preset-Paare in `MapSchemaSanitizeOps` auf denselben Laufzeitvertrag heben
- Ergebnis: `:6889` schliesst im fokussierten Browser-Rerun (Retry gruen) plus direkter `node`-Stub-Repro mit der erwarteten Cleanup-Reihenfolge; `:8403` laeuft im Browser sowie in direkter Preset-Repro ohne Warnungen (`abyssal_descent`, `neon_circuit`, `sky_islands`). Ein voller `dev-runtime`-Gesamtlauf wurde weiterhin bewusst noch nicht wiederholt.
- Ansatz: frischen Voll-Lauf nach geschlossenem `core-targeted`-Rest fahren und den neuen Stand strikt in Harness- gegen Produktionssignale schneiden
- Ergebnis: umgesetzt; der globale Schnitt schrumpft auf 23 FAIL und zeigt keine `core-targeted`-Produktionsfails mehr, sondern nur noch `page.goto`-/Harness-Signale im `core-targeted`-Slice
- Ansatz: `GameRuntimeSessionHandler.startMatch()` darauf haerten, asynchrone `applyStartMatchProjection()`-Ergebnisse nicht mehr sofort auf `true` zu verkuerzen
- Ergebnis: umgesetzt in `src/core/runtime/GameRuntimeSessionHandler.js`; direkte `node`-Repro bestaetigt den Await-Vertrag, ein fokussierter Browser-Rerun fuer `T43b`/`T80e`/`T82` blieb jedoch komplett am bekannten `page.goto`-Flake haengen und liefert daher keine neue Produktionsaussage

## Evidence

- Logs:
  - `tmp-v87-targeted-dev-rerun-20260408.log` -> `23 failed / 1 flaky / 2 skipped / 138 did not run / 104 passed (56.0m)`; kein `fetch failed`/`probe-timeout`
  - `test-results/v87-targeted-dev-rerun-20260408/playwright-startup-diagnostics.json` -> `serverReady=true`, `shellReady=true`, `ready=true`, `appReady=false`, `appBootState=menu_shell_ready`
  - `tests/core-targeted.spec.js:158`, `:6720` -> `page.goto`-/Harness-Signale im frischen Voll-Lauf; kein `core-targeted`-Produktionsfail mehr explizit gelistet
  - `tests/physics-core.spec.js:170`, `:353` -> authored-runtime-/boost-nahe Assertion-Fails
  - `tests/physics-hunt.spec.js:74`, `:545`, `:1520` -> Combat-/Trail-/Pickup-Regressions
  - `tests/physics-policy.spec.js:594`, `:1249`, `:1361` -> Policy-/Observation-/Steering-Regressions
- Screenshots/Artefakte:
  - `test-results/v87-targeted-dev-rerun-20260408/`
- Fokussierte Reruns / Repros:
  - `test-results/v87-core-restblock-20260408/` -> `:6889` Retry gruen, `:8403` gruen; Erstversuch bei `:6889` nur `page.goto`-Flake
  - `test-results/v87-core-flake-consolidated-20260408/` -> `:6777`, `:7249`, `:8664` im Browser gruen; `T14` bleibt reiner `page.goto`-Flake
  - `test-results/v87-start-promise-fix-20260408/` + `tmp-v87-start-promise-fix-20260408.log` -> fokussierter Browser-Rerun fuer `T43b`/`T80e`/`T82` nur mit `page.goto`-Flakes, keine belastbare Produktionsaussage
  - `node --input-type=module -` (`createMatchSession`-Stub-Repro) -> `errorMessage=arena-build-fail`, Cleanup-Reihenfolge `arena.dispose -> particles.dispose -> renderer.clearMatchScene`
  - `node --input-type=module -` (Preset-Repro) -> `warningCount=0` fuer `abyssal_descent`, `neon_circuit`, `sky_islands`
  - `node --input-type=module -` (`GameRuntimeSessionHandler.startMatch()`-Direktrepro) -> `{"immediateState":false,"finalState":true,"result":true,"elapsedMs":82}`
- Relevante Commits:
  - keiner; der Stand ist aktuell im Worktree verifiziert und dokumentiert

## Aktueller Stand

- Status: blocked
- Root-Cause-Stand: kein reiner Browser-/Harness-Startblocker mehr
  - Harness-Seite: der engere `dev-runtime`-Vertrag ist reproduzierbar; der Lauf erreicht die Suite ohne `fetch failed`-/`probe-timeout`-Abbruch
  - Readiness-Nuance: Prewarm endet aktuell nur bei `menu_shell_ready`; `appReady=false` ist unter `strictPrewarm=false` toleriert, aber nicht mehr der dominierende Blocker
  - Produkt-/Regression-Seite: der frische Voll-Lauf schneidet nur noch echte Produktionsfails in `physics-core`, `physics-hunt` und `physics-policy`; `core-targeted` liefert dort keine Produktionsfail-Liste mehr
  - Teilstand 2026-04-08 (`87.99.3` Restabschluss + Vollrerun): der verbleibende V87-nahe `core-targeted`-Produktionsrest ist fachlich geschlossen. Im neuen Voll-Lauf ueberdecken `tests/core-targeted.spec.js:158` (`T1`) und `:6720` (`V56.1`) den Slice als `page.goto`-/Harness-Flakes; der bekannte `T14`-Pfad wurde dadurch im Voll-Lauf nicht erneut erreicht. Die belastbare Baseline liegt jetzt bei `23 FAIL` (`physics-core=2`, `physics-hunt=16`, `physics-policy=4`)
- V87 ist technisch weitgehend abgearbeitet; offen bleibt das gruene Abschlussgate, weil `test:targeted` als Gesamtlauf noch nicht gruen ist

## Naechster Schritt

- Naechster sinnvoller Schritt ist jetzt `physics-core` als kleinster belastbarer Produktionscluster (`T43b`, `T45c`); danach `physics-policy`, dann der breite `physics-hunt`-Rest
- Den sporadischen `page.goto`-Flake in `tests/helpers.js` / App-Boot weiter beobachten und strikt von Produktionssignalen trennen; der fokussierte Browser-Rerun fuer den Direktstart-Fix bleibt dadurch bewusst nur als Harness-Evidence eingeordnet
