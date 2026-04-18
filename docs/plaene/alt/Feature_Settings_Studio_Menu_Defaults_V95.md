# Feature: Settings Studio fuer Menu-Defaults (Vorschlag V95)

Stand: 2026-04-17
Status: Entwurf
Owner: frei
Risiko: mittel
plan_file: `docs/plaene/aktiv/V95.md`

## Ziel

Eine eigenstaendige Electron-App (`Settings Studio`) bereitstellen, mit der alle Menu-Default-Einstellungen uebersichtlich per Formular bearbeitet werden koennen, inklusive editierbarer Grenzen (z. B. `speed` min/max/step), strenger Validierung, automatischen Backups und persistenter Anwendung im Spiel ohne Export-Workflow.

Rahmen gemaess Nutzerentscheid:

- App-Form: komplett separate Electron-App mit eigenem Start.
- Bearbeitungsumfang: gesamter Default-Scope (`baseSettings`, `localSettings`, `fixedPresets`, `configShare`, `level3Reset`).
- Speicherung: direkt speichern und im Spiel anwenden, ohne Export/Import als Pflichtpfad.
- UI: Formular-basiert, menuegegliedert.
- Validierung: strikt blockierend bei Fehlern.
- Backup: automatisch vor jeder Speicherung.
- Sprache: DE/EN umschaltbar.

## Desktop-first Scope und Demo-Grenze

- Zieloberflaeche ist ausschliesslich Desktop (Electron).
- Browser-Demo bleibt ohne produktive Schreib-/Dev-Capability fuer Default-Overrides.
- Keine direkte Endnutzerfreigabe fuer Online-/Browser-Produktflaechen.

## Nicht-Ziel

- Kein direktes Ueberschreiben der Quell-Datei `src/ui/menu/MenuDefaultsEditorConfig.js`.
- Kein unvalidierter Freitext-JSON-Editor als Primarworkflow.
- Kein ungeprueftes Live-Mutieren kritischer Runtime-Pfade waehrend eines laufenden Matches in V1.
- Keine Erweiterung auf Bot-Training- oder Server-Konfigurationsflaechen ausserhalb Menu-Defaults.

## Betroffene Dateien und Bereiche (geplant)

- `package.json` (neue Scripts fuer Settings-Studio-Start/Build)
- `start_settings.bat` (neuer dedizierter Launcher)
- `electron/settings-studio/launch.cjs`
- `electron/settings-studio/main.cjs`
- `electron/settings-studio/preload.cjs`
- `electron/settings-studio/ipc/settings-studio-ipc.cjs`
- `electron/settings-studio/services/SettingsOverrideFileService.cjs`
- `electron/settings-studio/services/SettingsBackupService.cjs`
- `electron/settings-studio/services/SettingsSchemaService.cjs`
- `electron/settings-studio/ui/settings-studio.html`
- `electron/settings-studio/ui/settings-studio-app.js`
- `electron/settings-studio/ui/settings-studio-form-renderer.js`
- `electron/settings-studio/ui/settings-studio-limits-renderer.js`
- `electron/settings-studio/ui/settings-studio-i18n.js`
- `electron/settings-studio/ui/settings-studio.css`
- `src/core/settings/SettingsDefaultsFacade.js`
- `src/core/settings/SettingsDomainUtils.js` (nur falls Merge-Helfer erweitert werden)
- `src/core/settings/SettingsOverrideContract.js` (neu)
- `src/core/settings/SettingsOverrideMergeOps.js` (neu)
- `src/shared/contracts/SettingsProfileContract.js` (nur falls Contract-Extension noetig)
- `docs/referenz/ai_architecture_context.md` (falls Surface/Capability angepasst)

## Definition of Done

- [ ] DoD.1 Eigenstaendige Settings-Studio-App startet separat und stabil ueber `start_settings.bat`.
- [ ] DoD.2 Alle relevanten Einstellungsbereiche sind in einer menuebasierten Formular-UI logisch gruppiert.
- [ ] DoD.3 Numerische Felder unterstuetzen konfigurierbare Grenzen (`min/max/step`) inkl. strikter Plausibilitaetsregeln.
- [ ] DoD.4 Speichern ist nur bei vollstaendig validen Daten moeglich; Fehler werden feldgenau angezeigt.
- [ ] DoD.5 Vor jedem Speichern wird automatisch ein timestamp-basiertes Backup erstellt.
- [ ] DoD.6 Speichern schreibt in eine persistente Override-Datei und Anwendung erfolgt ohne Export/Import-Zwischenschritt.
- [ ] DoD.7 Spiel uebernimmt gespeicherte Overrides deterministisch (V1: spaetestens ab naechstem Match/Neustart).
- [ ] DoD.8 DE/EN Sprachumschaltung funktioniert fuer alle UI-Texte und Validierungsfehler.
- [ ] DoD.9 Browser-Demo erhaelt keinen produktiven Schreibpfad fuer Default-Overrides.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V95`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V95.md`
- hard dependencies:
  - `V77.99` (Surface-Policy, Desktop-vs-Demo-Grenze)
  - `V92.99` (Ownership-/Facade-Ratchet fuer Runtime-/Config-Zugriffe)
- soft dependencies:
  - `V81.99` (Developer-Tooling-Synergien bei UI/IPC, ohne Blockierung)
  - `V64.99` (Desktop-Lifecycle-Polish kann Integrationsaufwand spaeter reduzieren)
- Hinweis: Manuelle Uebernahme in den Master-Index erforderlich.

## Evidence-Format fuer Abschluss-Haken

Jeder spaetere `[x]`-Eintrag nutzt:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 95.1 Contract- und Schema-Fundament

- [ ] 95.1.1 `SettingsOverrideContract` fuer persistente Overrides definieren (inkl. schemaVersion).
- [ ] 95.1.2 Feld-Registry mit Typ, Kategorie, Label-Key, Default, `min/max/step`, Locks und Abhaengigkeiten aufbauen.
- [ ] 95.1.3 Konfliktregeln fuer Grenzwerte festlegen (z. B. `min <= value <= max`, `step > 0`, Obergrenzen-Plausi).

### 95.2 Separate Electron-App und IPC-Shell

- [ ] 95.2.1 Eigenen Electron-Entry (`electron/settings-studio/*`) mit Window-Lifecycle und Crash-safe Shutdown erstellen.
- [ ] 95.2.2 IPC-Vertrag fuer `load`, `validate`, `save`, `listBackups`, `restoreBackup`, `getSchema`, `setLanguage` implementieren.
- [ ] 95.2.3 Launcher/Scripts (`start_settings.bat`, `npm run app:settings:start`) integrieren.

### 95.3 Formular-UI mit Menuestruktur

- [ ] 95.3.1 Navigationsstruktur nach Bereichen bauen (Base, Local, Presets, ConfigShare, Level3Reset, Limits).
- [ ] 95.3.2 Feldrenderer fuer `number`, `boolean`, `select`, `text`, Objektlisten und Preset-Mapping implementieren.
- [ ] 95.3.3 Aenderungsstatus sichtbar machen (dirty state, geaenderte Felder, Reset pro Feld/Bereich).

### 95.4 Validierung, Persistenz und Backup

- [ ] 95.4.1 Strenge Validator-Pipeline implementieren; Speichern bei Fehlern blockieren.
- [ ] 95.4.2 Persistenz nach `app.getPath('userData')/menu-defaults.override.json` umsetzen.
- [ ] 95.4.3 Backup-Service mit Zeitstempeldateien (`backups/menu-defaults.override.<ts>.json`) und Restore-Pfad umsetzen.

### 95.5 Runtime-Integration ohne Export

- [ ] 95.5.1 Merge-Strategie in `SettingsDefaultsFacade` einhaengen: Code-Defaults + validierte Override-Datei.
- [ ] 95.5.2 Fallback-Verhalten bei ungueltiger Override-Datei: Spiel startet mit Code-Defaults und markiert Diagnose.
- [ ] 95.5.3 Anwendungsgarantie fuer V1: Werte gelten ab naechstem Match/Neustart (deterministischer Basispfad).

### 95.6 Sprache und UX-Haertung

- [ ] 95.6.1 Vollstaendige DE/EN-Textressourcen fuer Labels, Menues, Tooltips und Fehlertexte einziehen.
- [ ] 95.6.2 Sprachumschalter persistent speichern (pro Benutzerprofil).
- [ ] 95.6.3 Guardrails fuer Bedienung (Unsaved-Changes-Warnung, Restore-Confirm, Konfliktauflistung) finalisieren.

### 95.99 Abschluss-Gate

- [ ] 95.99.1 Build-/Start-Gate gruen (`npm run build:app`, `npm run app:settings:start` Smoke).
- [ ] 95.99.2 Governance-Gates gruen (`npm run plan:check`, `npm run docs:sync`, `npm run docs:check`).
- [ ] 95.99.3 End-to-End-Szenario belegt: Grenze aendern -> validieren -> speichern -> Neustart/naechstes Match -> Wert aktiv.

## Risiken

- R1 | mittel | Schema-Drift zwischen Code-Defaults und Override-Struktur fuehrt zu uneindeutigen Feldern.
  Mitigation: Versionierter Contract + zentraler Merge mit unbekannte-Felder-Policy.
- R2 | mittel | Ueberstrenge Validierung blockiert legitime Spezialwerte.
  Mitigation: Registry-basierte Ausnahmen und dokumentierte Feldspezifika.
- R3 | hoch | Fehlerhafte Persistenz koennte Startpfad stoeren.
  Mitigation: Atomic Write + Backup vor Save + Fallback auf Code-Defaults.
- R4 | mittel | Overlap mit V81 Developer-Tooling fuehrt zu Doppelpfaden.
  Mitigation: klare Trennung `user defaults editor` vs `live tuning console`, Soft-Dependency dokumentiert.
- R5 | niedrig | Sprachinkonsistenzen zwischen DE/EN reduzieren Bedienbarkeit.
  Mitigation: zentrale I18n-Keys und Coverage-Check vor Gate.
