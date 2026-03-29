# Feature Plan: Menu Default Editor V42

Stand: 2026-03-17

## Ziel

Eine zentrale, gut editierbare Quelldatei schaffen, in der die Menue-Voreinstellungen gebuendelt gepflegt werden koennen. Die Datei soll als "Menu Editor auf Dateiebene" funktionieren: ein Ort fuer Startwerte, lokale Menue-Defaults und Quickstart-/Preset-Seed-Daten, ohne dass Werte parallel in `SettingsManager`, `MenuPresetCatalog` und Menue-Helfern dupliziert bleiben.

## Architektur-Check

- Bestehende Default-Quellen sind derzeit verteilt:
  - `src/core/SettingsManager.js` (`createDefaultSettings`)
  - `src/ui/menu/MenuStateContracts.js` (lokale Menue-Defaults)
  - `src/ui/menu/MenuPresetCatalog.js` (feste Menue-Presets)
  - `src/ui/menu/MenuConfigShareOps.js` (Import/Export-Payload-Fallbacks)
- Bestehende Menue-Architektur passt zu einer zentralen, reinen Datenquelle unter `src/ui/menu/**`, weil `SettingsManager` bereits mehrere Menue-Module konsumiert.
- Empfohlene neue Hauptdatei:
  - `src/ui/menu/MenuDefaultsEditorConfig.js`
- Empfohlene Rolle der Datei:
  - Pure Katalog-/Builder-Datei
  - Keine DOM-Zugriffe
  - Liefert strukturierte Default-Abschnitte fuer Runtime, Local UI State und feste Presets

## Risiko

- Mittel
- Grund:
  - Default-Werte beeinflussen Boot, Migration, Presets, Import/Export und Menue-Reset-Pfade gleichzeitig.
  - Ein falscher Zentralisierungsschritt kann stille Drift zwischen Sanitizing, Preset-Anwendung und UI-Sync erzeugen.

## Betroffene Dateien

- Neu:
  - `src/ui/menu/MenuDefaultsEditorConfig.js`
- Bestehend:
  - `src/core/SettingsManager.js`
  - `src/ui/menu/MenuStateContracts.js`
  - `src/ui/menu/MenuPresetCatalog.js`
  - `src/ui/menu/MenuConfigShareOps.js`
  - `src/ui/menu/MenuPresetApplyOps.js`
  - `tests/core.spec.js`
  - `docs/Umsetzungsplan.md`

## Zielbild

- Eine zentrale Datei beschreibt:
  - Basis-Sessiondefaults (`mode`, `gameMode`, `mapKey`, `numBots`, `winsNeeded`, Fahrzeuge)
  - Gameplay-Defaults
  - lokale Menue-Defaults (`sessionType`, `modePath`, `themeMode`, `shadowQuality`, `toolsState`, `startSetup`)
  - feste Preset-Definitionen fuer Quickstart und Level-4-Presetkatalog
- `SettingsManager.createDefaultSettings()` baut seine Defaults aus dieser Quelle auf.
- `MenuPresetCatalog.js` bezieht seine fixen Presets aus derselben Quelle.
- Import/Export-Helfer erhalten ihre Fallbacks aus derselben Quelle, damit Freitext-/JSON-Importe nicht andere Defaults ziehen als das Menue selbst.
- Phase 1 liefert bewusst keinen separaten HTML-Editor; die erste "Editor"-Stufe ist die eine gebuendelte Konfigurationsdatei.

## Nicht-Ziele

- Kein kompletter neuer Menue-Screen
- Kein Umbau des vorhandenen `editor/`-Bereichs
- Kein Redesign der Menue-Hierarchie
- Keine Aenderung bestehender Savegame-/Profile-Formate ausser notwendiger sanfter Anpassung an die neue Default-Quelle

## Phasen

- [x] 42.1 Zentrale Default-Quelle definieren
  - [x] 42.1.1 `MenuDefaultsEditorConfig.js` mit klar getrennten Bereichen fuer `baseSettings`, `localSettings`, `startSetup` und `fixedPresets` anlegen
  - [x] 42.1.2 Kleine Builder-/Clone-Helfer definieren, damit Konsumenten keine rohen Referenzen mutieren und die Datei manuell leicht editierbar bleibt

- [x] 42.2 Core- und Menue-Defaults auf die neue Quelle umhaengen
  - [x] 42.2.1 `SettingsManager.createDefaultSettings()` und Menue-Contract-Normalisierung so umstellen, dass ihre Fallbacks aus der zentralen Datei kommen
  - [x] 42.2.2 `MenuConfigShareOps.js` fuer Import/Export-Fallbacks und Reset-Pfade an dieselbe Quelle anbinden, damit kein zweiter Fallback-Katalog bestehen bleibt

- [x] 42.3 Preset-Katalog und Quickstart-Daten konsolidieren
  - [x] 42.3.1 `MenuPresetCatalog.js` auf Seed-Daten aus `MenuDefaultsEditorConfig.js` umstellen, ohne das bestehende Preset-Metadatenformat zu brechen
  - [x] 42.3.2 Schnellstart-/Preset-Anwendungslogik gegen Drift pruefen, insbesondere fuer `fight-standard`, `normal-standard`, `arcade`, `competitive` und `chaos`

- [x] 42.4 Editor-Ergonomie fuer spaetere Pflege absichern
  - [x] 42.4.1 Die neue Datei nach editierbaren Abschnitten strukturieren: Session, Gameplay, Local UI, Presets
  - [x] 42.4.2 Eine schlanke Exportfunktion oder Snapshot-Hilfe vorsehen, mit der die aktuell im Menue gesetzten Werte spaeter in das zentrale Editor-Format ueberfuehrt werden koennen

- [x] 42.5 Verifikation der funktionalen Einheiten
  - [x] 42.5.1 Core-/Menue-Regressionen fuer Boot, Reset, Preset-Anwendung und Settings-Sanitizing in `tests/core.spec.js` erweitern
  - [x] 42.5.2 Menue-Smoke pruefen: Default-Load, Preset-Load, Level-3-/Level-4-Reset und Import/Export muessen denselben Default-Katalog widerspiegeln

- [ ] 42.9 Abschluss-Gate
  - [ ] 42.9.1 `npm run test:core` und `npm run test:stress` gruen bestaetigen
  - [ ] 42.9.2 `npm run docs:sync`, `npm run docs:check` und Doku-Freeze abschliessen

## Verifikation

- Nach 42.2:
  - `npm run test:core`
- Nach 42.3:
  - `npm run test:core`
- Nach 42.5 / vor Abschluss:
  - `npm run test:core`
  - `npm run test:stress`
  - `npm run docs:sync`
  - `npm run docs:check`

## Freshness-Hinweis

Der Plan gilt erst als geschlossen, wenn `npm run docs:sync` und `npm run docs:check` nach dem finalen Code-Stand erfolgreich gelaufen sind.

## Status 2026-03-17

- `src/ui/menu/MenuDefaultsEditorConfig.js` ist als zentrale Datei fuer Menue-Basisdefaults, Local-UI-Defaults, Level-3-Reset, Config-Share-Fallbacks und Fixed-Preset-Seeds umgesetzt.
- `SettingsManager`, `MenuStateContracts`, `MenuConfigShareOps`, `MenuDraftStore`, `MenuPresetCatalog`, `EventPlaylistCatalog` und `MenuRuntimeSessionService` sind an diese Quelle angebunden.
- Gezielte Regressionen sind gruen:
  - `T12b`
  - `T20f`
  - `T20o`
  - `T20q`
  - `T20s`
  - `T20bb`
  - `T20bc`
  - `T74`
  - `T77b`
  - `T79`
- Browser-Spotcheck via `develop-web-game`-Client bestaetigt den Menuepfad visuell unter `tmp/develop-web-game-v42/shot-0.png`.
- Offenes Gate:
  - `npm run test:core` scheitert ausserhalb dieses Scopes im bestehenden Map-Ladetest `T14: Alle Maps ladbar`.
  - `npm run test:stress` scheitert ausserhalb dieses Scopes im bestehenden Showcase-Stresstest `T71b: Showcase-Nexus startet mehrfach ohne Aircraft-Deko-Leaks`.
  - `npm run build` scheitert weiter an einem bestehenden Architektur-Lint ausserhalb dieses Scopes: `src/core/config/maps/MapPresetCatalog.js` verletzt `max-lines` (`627 > 500`).
