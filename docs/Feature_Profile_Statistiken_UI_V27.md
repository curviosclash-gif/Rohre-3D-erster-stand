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
