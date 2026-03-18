# Feature: Profile, Statistiken und Telemetrie (V27)

Stand: 2026-03-08
Status: In Umsetzung
Owner: Bot B

## Ziel

V27 erweitert drei Bereiche ohne Contract-Bruch:

1. `V7` Profile-UX (Duplizieren, Import/Export, Standardprofil)
2. `V8` Post-Match-Statistiken (Round/Match-Overlay)
3. `V15` Telemetrie-Dashboard fuer iteratives Balancing

## Baseline-Freeze 27.0 (2026-03-08)

### UI-Markup-Iststand

- Profil-Bedienung liegt in `index.html` unter `#submenu-level4` / `data-level4-section=\"tools\"`.
- Aktive Profil-Controls im Markup:
  - `#profile-name`
  - `#btn-profile-save`
  - `#profile-select`
  - `#btn-profile-load`
  - `#btn-profile-delete`
- Round-End-Overlay hat aktuell nur Textslots:
  - `#message-overlay`
  - `#message-text`
  - `#message-sub`

### Runtime/Event-Iststand

- Profil-Flow:
  - `src/ui/menu/MenuProfileBindings.js` emittiert `save/load/delete_profile`.
  - `src/core/GameRuntimeFacade.js` routed diese Events zu `Game._saveProfile/_loadProfile/_deleteProfile`.
  - `src/core/main.js` steuert Action-State ueber `deriveProfileActionUiState` und `deriveProfileControlSelectState`.
- Round-End-UI:
  - `src/ui/MatchFlowUiController.js` schreibt nur `messageText/messageSub` in `#message-overlay`.
  - `src/ui/MatchUiStateOps.js` besitzt aktuell kein strukturiertes Stats-Overlay-Modell.
- Datenbasis fuer Stats:
  - `src/state/RoundRecorder.js` + `src/state/recorder/RoundMetricsStore.js` liefern Round- und Aggregate-Metriken bereits als Runtime-API.
- Telemetrie-Basis:
  - `src/ui/menu/MenuTelemetryStore.js` erfasst aktuell vor allem Menu-Events (abort/backtrack/quickstart/start_attempt), kein Balancing-Dashboard.

### Gap-Liste fuer Folgephasen

- 27.1: Keine Markup-/Event-Pfade fuer Profil-Duplikat, Import/Export, Default-Profil.
- 27.2: Stats-Daten sind vorhanden, aber nicht als UI-Overlay am Round-End aufbereitet.
- 27.3: Telemetrie-Store ist vorhanden, aber ohne Dashboard-UI und ohne erweiterten Balancing-Fokus.

## Phase 27.1 Umsetzung (2026-03-08)

### V7 Profile-UX Ausbau

- Profil-Controls additiv erweitert:
  - neue Buttons fuer `Duplizieren`, `Als Standard markieren`, `Profil exportieren`, `Profil importieren`
  - neues Transfer-Feld `#profile-transfer-input` plus Statusslot `#profile-transfer-status`
- Persistenz erweitert:
  - Profil-Eintraege tragen jetzt optional `isDefault`
  - Import/Export nutzt den JSON-Vertrag `profile-export.v1`
- UX-Luecke aus dem Masterplan geschlossen:
  - Profil-Aktionsbuttons reagieren jetzt auf Texteingaben, Select-Wechsel und Import-Textarea sofort
  - Select-Optionen markieren das Standardprofil sichtbar als `(... Standard)`
- Sicherheits-/Verhaltensrahmen:
  - bestehende Profil-IDs blieben unveraendert
  - Import sanitiziert Settings weiter ueber `SettingsStore`
  - Speichern darf existierende Profile weiter nur fuer das aktuell geladene/gespeicherte Profil direkt aktualisieren

### Verifikation 27.1

- Playwright-Core-Regression `T20ka` deckt Save-State, Duplicate, Default-Markierung und Profil-Import/Export ab.
- `npx playwright test tests/core.spec.js --reporter=line --workers=1` PASS (`59 passed`, `1 skipped`)
- `npx playwright test tests/stress.spec.js --reporter=line --workers=1` PASS (`19 passed`)
- `npm run build` PASS
- `npm run docs:sync` PASS
- `npm run docs:check` PASS
- Visueller Browser-Check:
  - Skill `develop-web-game` Client gegen `http://127.0.0.1:4173` ausgefuehrt, Screenshot unter `tmp/develop-web-game-v27/shot-0.png`
  - zusaetzlicher Playwright-UI-Screenshot der neuen Tools-Controls unter `profile-tools-populated.png`

### Contract-Freeze fuer V27-Folgeschritte

- Bestehende IDs bleiben erhalten:
  - `#profile-name`, `#btn-profile-save`, `#profile-select`, `#btn-profile-load`, `#btn-profile-delete`
  - `#message-overlay`, `#message-text`, `#message-sub`
- Erweiterungen fuer 27.1-27.3 erfolgen additiv (neue Controls/Container statt Breaking Rename).

## Phase 27.2 Umsetzung (2026-03-13)

### V8 Post-Match-Statistiken

- Round-End-Overlay additiv erweitert:
  - neuer Container `#message-stats` unterhalb von `#message-sub`
  - drei strukturierte Karten fuer `Diese Runde`, `Match bisher` und `Zwischenstand`
- Neue Aggregationsschicht:
  - `src/state/PostMatchStatsAggregator.js` verdichtet `RoundRecorder`-Round-/Aggregate-Metriken in den UI-Vertrag `post-match-stats.v1`
  - Round-/Match-End-Pfad nutzt dieselbe Datenbasis und wechselt nur Titel/Scoreboard je nach `MATCH_END`
- Runtime-Wiring:
  - `src/state/RoundEndCoordinator.js` haengt die Stats-Zusammenfassung an den bestehenden Round-End-Plan
  - `src/ui/MatchUiStateOps.js` fuehrt `overlayStats` additiv im Match-UI-State ein
  - `src/ui/MatchFlowUiController.js` rendert die Karten dynamisch und laesst Countdown-Updates die Stats nicht ueberschreiben
- Stabilisierung im Startpfad:
  - `src/core/GameRuntimeFacade.js`, `src/core/main.js` und `src/ui/MatchFlowUiController.js` unterdruecken beim laufenden Match-Start ein erneutes Prewarm-Scheduling
  - damit kippt der GLB-Startpfad nicht mehr in das reproduzierte `matchRoot`-/`_floorMesh`-Race aus `T14b`

### Verifikation 27.2

- Neue Core-Regressionen:
  - `T20kc` prueft Round-End-Overlay mit Round-/Match-/Scoreboard-Karten
  - `T20kd` prueft Match-End-Overlay mit Endstand und aggregierten Match-Werten
- Gezielte Laeufe PASS:
  - `TEST_PORT=5318 PW_RUN_TAG=v27-2-t20kc-r2 PW_OUTPUT_DIR=test-results/v27-2-t20kc-r2 PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test --grep T20kc`
  - `TEST_PORT=5319 PW_RUN_TAG=v27-2-t20kd-r2 PW_OUTPUT_DIR=test-results/v27-2-t20kd-r2 PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test --grep T20kd`
  - `TEST_PORT=5315 PW_RUN_TAG=v27-2-t14b-racefix PW_OUTPUT_DIR=test-results/v27-2-t14b-racefix PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test --grep T14b`
- Mapping-/Gate-Laeufe PASS:
  - `npm run smoke:roundstate`
  - `TEST_PORT=5322 PW_RUN_TAG=v27-2-core-r4 PW_OUTPUT_DIR=test-results/v27-2-core-r4 PW_WORKERS=1 npm run test:core` (`81 passed`, `1 skipped`)
  - `TEST_PORT=5324 PW_RUN_TAG=v27-2-stress PW_OUTPUT_DIR=test-results/v27-2-stress PW_WORKERS=1 npm run test:stress` (`20 passed`)
  - `npm run build`
  - `npm run docs:sync`
- Browser-Spotcheck:
  - sichtbares Round-End-Overlay mit drei Stats-Karten unter `tmp/develop-web-game-v27-2/post-match-overlay-element.png`
  - DOM-/Console-Artefakt unter `tmp/develop-web-game-v27-2/post-match-overlay-state.json`

### Offener Folgepfad

- 27.3 bleibt offen:
  - Developer-Telemetrie zeigt aktuell weiter nur Roh-JSON in `#developer-telemetry-output`
  - fuer V15 fehlt noch das eigentliche Dashboard fuer Balancing-Auswertung

## Phase 27.3 Umsetzung (2026-03-13)

### V15 Telemetrie-Dashboard fuer iteratives Balancing

- Persistenz erweitert:
  - `src/ui/menu/MenuTelemetryStore.js` speichert jetzt zusaetzlich `balanceSummary` und `recentRounds`
  - Round-End-/Match-End-Ereignisse aggregieren Runden, Match-Enden, Human-/Bot-Siege, Dauer, Self-Crashes, Item-Nutzung und Stuck-Events, gruppiert nach Map und Modus
- Runtime-Wiring:
  - `src/ui/MatchFlowUiController.js` erzeugt am Round-End einen normierten Balancing-Telemetrie-Payload (`mapKey`, `mode`, Sieger-Typ, Dauer, KPI-Zaehler)
  - `src/core/GameRuntimeFacade.js` exponiert dafuer explizite Writer `recordRoundEndTelemetry` und `recordMatchEndTelemetry`
  - `src/core/SettingsManager.js` liefert aus dem Rohzustand ein lesbares Snapshot-Modell mit `balance`, `topMaps`, `topModes` und `recentRounds`
- Developer-UI:
  - neues `#developer-telemetry-dashboard` im Experten-/Developer-Menue
  - neues `src/ui/menu/MenuTelemetryDashboard.js` rendert Karten fuer `Uebersicht`, `Balancing`, `Top Maps`, `Top Modi` sowie `Letzte Runden`
  - Roh-JSON in `#developer-telemetry-output` bleibt fuer bestehende Tools/Tests erhalten

### Verifikation 27.3

- Neue Core-Regression:
  - `T20ke` verfolgt eine synthetische Round-End-Runde bis in JSON-Snapshot und Dashboard-Karten des Developer-Menues
- Gezielte Laeufe PASS:
  - `TEST_PORT=5327 PW_RUN_TAG=v27-3-target-t20t PW_OUTPUT_DIR=test-results/v27-3-target-t20t PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test --grep T20t`
  - `TEST_PORT=5328 PW_RUN_TAG=v27-3-target-ke-r2 PW_OUTPUT_DIR=test-results/v27-3-target-ke-r2 PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test --grep T20ke`
- Vollgate PASS:
  - `npm run smoke:roundstate`
  - `TEST_PORT=5332 PW_RUN_TAG=v27-3-core-r2 PW_OUTPUT_DIR=test-results/v27-3-core-r2 PW_WORKERS=1 npm run test:core` (`82 passed`, `1 skipped`)
  - `TEST_PORT=5333 PW_RUN_TAG=v27-3-stress PW_OUTPUT_DIR=test-results/v27-3-stress PW_WORKERS=1 npm run test:stress` (`20 passed`)
- Browser-Spotcheck:
  - Dashboard-Screenshot unter `tmp/develop-web-game-v27-3/telemetry-dashboard.png`
  - Zustand unter `tmp/develop-web-game-v27-3/telemetry-dashboard-state.json`

## Abschluss-Gate 27.4 (2026-03-13)

- V27 ist damit fachlich geschlossen:
  - `27.1` Profile-UX
  - `27.2` Post-Match-Statistiken
  - `27.3` Balancing-Telemetrie-Dashboard
- Abschluss-Gates:
  - `npm run build` PASS
  - `npm run docs:sync` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run docs:check` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
