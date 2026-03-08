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

### Contract-Freeze fuer V27-Folgeschritte

- Bestehende IDs bleiben erhalten:
  - `#profile-name`, `#btn-profile-save`, `#profile-select`, `#btn-profile-load`, `#btn-profile-delete`
  - `#message-overlay`, `#message-text`, `#message-sub`
- Erweiterungen fuer 27.1-27.3 erfolgen additiv (neue Controls/Container statt Breaking Rename).
