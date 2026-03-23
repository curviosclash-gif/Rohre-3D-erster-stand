# Feature: SettingsManager Decomposition und Settings-Domain-Entkopplung (V53)

Stand: 2026-03-23  
Status: Geplant  
Owner: Codex

## Ziel

`src/core/SettingsManager.js` ist aktuell ein Sammelpunkt fuer mehrere Domains (Sanitizing, Session-Drafts, Presets, Developer-Mode, Text-Overrides, Telemetrie, Runtime-Config).  
Ziel ist eine klare Zerlegung in kleinere, testbare Module mit stabiler oeffentlicher API fuer bestehende Call-Sites.

## Betroffene Dateien (geplant)

- `src/core/SettingsManager.js`
- `src/core/settings/**` (neu/erweitert)
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/core/runtime/MenuRuntimePresetConfigService.js`
- `src/core/runtime/MenuRuntimeDeveloperModeService.js`
- `src/core/GameRuntimeFacade.js`
- `src/ui/KeybindEditorController.js` (nur falls Exportpfad angepasst wird)
- `tests/core.spec.js`
- `docs/Umsetzungsplan.md`

## Architektur-Check

- Reuse vor Neubau: bestehende Store-Ports (`SettingsStore`, `MenuPresetStore`, `MenuDraftStore`, `MenuTelemetryStore`, `MenuTextOverrideStore`) bleiben erhalten.
- `SettingsManager` wird auf Facade/Orchestrator reduziert; Domain-Logik wandert in `src/core/settings/**`.
- Keine Verhaltensaenderung an Runtime-Contracts ohne passende Regressionstests.

Risiko-Einstufung: **mittel-hoch**  
Grund: zentrale Klasse fuer Start-/Menu-/Persistenzpfade, hohe Regressionsempfindlichkeit.

## Evidence-Format

Abgeschlossene Punkte werden in Masterplan/Feature-Plan so dokumentiert:  
`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

- [ ] 53.1 Scope-Baseline und API-Inventar
  - [ ] 53.1.1 Oeffentliche `SettingsManager`-Methoden inkl. Aufrufer (`src/core/runtime/**`, `GameRuntimeFacade`) inventarisieren und als stabile Facade-API festschreiben
  - [ ] 53.1.2 Characterization-Baseline fuer kritische Flows (`sanitizeSettings`, Session-Switch, Preset-Apply/Save, Telemetry) mit bestehenden Tests referenzieren

- [ ] 53.2 Settings-Normalisierung zerlegen
  - [ ] 53.2.1 `sanitizeSettings` in dedizierte Ops/Funktionen splitten (`session`, `gameplay`, `botBridge`, `controls`, `menuContracts`) und in `src/core/settings/**` auslagern
  - [ ] 53.2.2 Migrations- und Clamp-Regeln unveraendert absichern (insb. `settingsVersion`, Hunt-Respawn, `modePath`, Recording-Normalisierung)

- [ ] 53.3 Preset- und Session-Draft-Domain trennen
  - [ ] 53.3.1 Session-Draft-Logik (`saveSessionDraft`, `applySessionDraft`, `switchSessionType`) als eigene Domain-Service-Schicht kapseln
  - [ ] 53.3.2 Preset-Operationen (`applyMenuPreset`, `saveMenuPreset`, `deleteMenuPreset`) in klar getrennte Operations mit einheitlichem Result-Contract ueberfuehren

- [ ] 53.4 Developer/Text/Telemetry-Domain extrahieren
  - [ ] 53.4.1 Developer-Aktionen (Mode/Theme/Actor/Visibility/Lock/ReleasePreview) in dedizierte Facade auslagern und Side-Effects begrenzen
  - [ ] 53.4.2 Text-Override- und Telemetry-History-Pfade (`setMenuTextOverride`, `recordMenuTelemetry`, Summary) in eigene Services auslagern

- [ ] 53.5 Orchestrator-Manager finalisieren
  - [ ] 53.5.1 `SettingsManager` auf schlanke Komposition/Fassade reduzieren (Store-Wiring + Domain-Aufrufe + Runtime-Config)
  - [ ] 53.5.2 Exporte/Imports fuer Call-Sites stabilisieren, Legacy-Helfer entfernen und Import-Grenzen dokumentieren

- [ ] 53.6 Verifikation und Guard-Haertung
  - [ ] 53.6.1 Relevante `test:core`-Faelle fuer Settings/Menu/Session/Preset/Telemetry erweitern bzw. nachziehen
  - [ ] 53.6.2 Architektur-/Boundary-Checks (`architecture:guard`) gegen neue Kanten validieren und Ratchet-Verstoesse beheben

- [ ] 53.99 Integrations- und Abschluss-Gate
  - [ ] 53.99.1 `npm run test:core`, `npm run architecture:guard`, `npm run build` sind fuer den Scope gruen
  - [ ] 53.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Conflict-/Lock-Abgleich sind abgeschlossen

## Verifikationsstrategie (DoD-fokussiert)

- API-stabil: bestehende Call-Sites nutzen unveraenderte oder sauber migrierte Entry-Points.
- Verhaltensstabil: identische Ergebnisse fuer Sanitizing, Presets, Session-Typ-Wechsel und Telemetrie.
- Wartbarer: deutlich kleinere Domain-Module statt monolithischer Klasse.

## Frische-Hinweis

Vor Abschluss der Umsetzung immer: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.
