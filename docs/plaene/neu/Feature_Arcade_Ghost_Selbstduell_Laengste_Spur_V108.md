# Feature: Arcade-Spur speichern und Selbstduell (laengste Spur) im Menue (V108)

Stand: 2026-05-01
Status: Entwurf
Owner: Codex
Risiko: mittel-hoch
plan_file: `docs/plaene/aktiv/V108.md`

## Ziel

Im Arcade-Parcours soll die eigene Spur (Ghost) lokal gespeichert werden, damit im naechsten Durchlauf ein Einzelspieler gegen sich selbst fahren kann. Die Aktivierung erfolgt im Menue, und fuer die Wiedergabe wird immer die laengste verfuegbare Spur verwendet.

Kernnutzen:

- Wiederholbare Selbst-Challenge ohne Multiplayer.
- Klare, menuegestuetzte Aktivierung statt impliziter Runtime-Logik.
- Stabile Persistenz ueber Sessions hinweg (desktop-first, lokal).

## Desktop-first Scope

- Produktpfad: Desktop-App, lokale Persistenz, lokale Session.
- Keine Cloud-, Online- oder Cross-Device-Synchronisierung.
- Browser-Demo bleibt Consumer und bekommt keinen eigenen Sonderpfad fuer Ghost-Persistenz.

## Nicht-Ziel

- Kein neuer Online-Leaderboard-/Ghost-Upload-Mechanismus.
- Kein Umbau der bestehenden Top-10-Logik fuer Bestzeiten als primares Ranking.
- Kein neuer globaler Runtime-Bypass (kein direkter `game.*`-Wachstumspfad).
- Kein neuer vollwertiger Mode-Path, solange derselbe Menuezweck als Option im bestehenden Arcade-Pfad erreichbar ist.

## Wissensgraph- und Architektur-Readout

Graph-Snapshot (2026-05-01):

- `scope-collisions --json`: aktuell keine globalen Kollisionen.
- `why-file src/ui/UIStartSyncController.js --json`: Datei liegt im Scope von `V104`.
- `why-file src/ui/UIManager.js --json`: Datei liegt im Scope von `V104`.
- `why-file src/state/arcade/ArcadeLeaderboard.js --json`: Historie aus `V82/V84/V85/V91`.

Architekturleitplanke:

- Erweiterungen laufen ueber `Contract -> Snapshot -> Intent-Port -> Feature-Adapter`.
- Menuezustand ueber `settings/localSettings/startSetup` und bestehende Change-Key/Sync-Pfade.
- Keine neue direkte Runtime-Reachthrough-Kette ueber `UIManager`/`UIStartSyncController`.

## Betroffene Dateien und Bereiche

- `src/core/arcade/ArcadeRunRuntime.js`
- `src/core/runtime/GameRuntimeArcadeSupport.js`
- `src/core/RuntimeConfig.js`
- `src/state/arcade/ArcadeLeaderboard.js`
- `src/state/arcade/ArcadeGhostRecorder.js`
- `src/state/arcade/` (neues Ghost-Store-Modul, z. B. `ArcadeGhostLibrary.js`)
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/UIStartSyncController.js`
- `src/ui/UIManager.js`
- `src/ui/dom/GameUiDomRefs.js`
- `src/ui/SettingsChangeKeys.js`
- `src/ui/UISettingsSyncMap.js`
- `src/ui/menu/MenuDefaultsEditorConfig.js`
- `src/ui/menu/MenuStateContracts.js`
- `src/ui/start-setup/StartSetupUiOps.js`
- `src/ui/hangar/HangarSelectionWritebackContract.js`
- `index.html`
- `style.css` (nur falls neue UI-Hinweise/Stati notwendig sind)
- `tests/runtime-settings-live-apply.contract.test.mjs`
- `tests/core-targeted-surface.spec.js`
- `tests/hangar-desktop-flow.contract.test.mjs` (falls StartSetup-Snapshot-Felder erweitert werden)

## Datenmodellvorschlag (Planstand)

Empfohlen: Ghost-Persistenz vom Leaderboard entkoppeln, damit "laengste Spur" robust und dauerhaft ermittelbar bleibt.

- Neues persistentes Ghost-Library-Objekt pro Route:
  - `routeId`
  - `longestGhostClip`
  - `durationMs` (kanonischer Vergleichswert)
  - `updatedAt`
- Leaderboard (`Top-10 nach Bestzeit`) bleibt fuer Ranking unveraendert.
- Runtime-Auswahl fuer Selbstduell zieht Ghost aus der Ghost-Library, nicht aus Rank-1.
- Rueckwaertskompatibilitaet: vorhandene `ghostClip`-Daten koennen als Initialwert in die neue Library uebernommen werden.

## Festgelegte Entscheidungen (2026-05-01)

- Vergleichsmetrik fuer "laengste Spur": `durationMs`.
- Persistenz und Auswahl erfolgen pro Route/Map.
- Menueoption ist in allen Single-Mode-Pfaden aktiv (`normal`, `fight`, `arcade`); ausserhalb davon deaktiviert/ausgeblendet.
- Wenn keine gespeicherte Spur vorhanden ist, wird kein Ghost abgespielt (stiller Fallback).

## Definition of Done

- [ ] DoD.1 Nach jedem Parcours-Finish wird ein Ghost-Clip fuer die Route lokal gespeichert und auf "laengste Spur" aktualisiert.
- [ ] DoD.2 Bei aktiviertem Selbstduell spielt der naechste Lauf im Einzelspieler die laengste gespeicherte Spur derselben Route ab.
- [ ] DoD.3 Auswahl ist im Menue sichtbar und persistent (`aus` vs. `selbstduell_laengste_spur`) und in allen Single-Mode-Pfaden aktiv.
- [ ] DoD.4 Bestehende Arcade-Features (XP, Leaderboard, Splits, Penalty, Ghost-Recorder) bleiben regressionsfrei.
- [ ] DoD.5 Runtime-/UI-Erweiterung folgt dem bestehenden Settings-/Intent-/Sync-Pfad ohne neue God-Object-Reachthroughs.
- [ ] DoD.6 Contract-/Surface-/Runtime-Tests decken Persistenz, Auswahlpolitik und Menuebindung ab.

## Abhaengigkeiten (Vorschlag)

- hard: `V82.99` (Ghost-/Parcours- und Leaderboard-Basis)
- soft: `V103.99` (Settings-Domain-Ratchet und Mutationsvertrag)
- soft: `V104.99` (Scope-Ueberlappung in `UIStartSyncController`/`UIManager`; Ausfuehrungsreihenfolge abstimmen)

## Phasenplan

### 108.1 Fachregel und Contracts fuer Selbstduell festziehen
status: open
goal: Eindeutige Funktions- und Persistenzregeln fuer Ghost-Selbstduell
output: Abgestimmter Contract fuer Menuezustand und Replay-Policy

- [ ] 108.1.1 Ghost-Duell-Enum und Defaults definieren (`off`, `self_longest_ghost`) im bestehenden Menue-Settingspfad.
- [ ] 108.1.2 Vergleichsmetrik fuer "laengste Spur" als kanonischen Wert fixieren (`durationMs`) und in Contract/Tests spiegeln.
- [ ] 108.1.3 Ueberlappung mit `V104` dokumentieren (insb. `UIStartSyncController`, `UIManager`) und Reihenfolge fuer konfliktarme Umsetzung festlegen.

### 108.2 Persistenzpfad fuer Ghost-Library aufbauen
status: open
goal: Dauerhaften, routebezogenen Speicher fuer laengste Spur herstellen
output: Neues Ghost-Library-Modul inkl. Migration/Fallback

- [ ] 108.2.1 Ghost-Library-State-Modul in `src/state/arcade/` einfuehren (load/save/upsertLongest/getLongestByRoute).
- [ ] 108.2.2 Rueckwaertskompatible Initialisierung umsetzen (wenn moeglich aus bestehendem Rank-1-`ghostClip` bootstrapen).
- [ ] 108.2.3 Schutzregeln fuer defekte Clips und ungueltige Dauerwerte ergaenzen (sanitizing/guarded write).

### 108.3 Arcade-Runtime auf laengste-Spur-Policy umstellen
status: open
goal: Aufzeichnung und Wiedergabe entlang der neuen Policy stabilisieren
output: Ghost-Start und Finish-Writeback nutzen Ghost-Library

- [ ] 108.3.1 Bei `finish` Ghost + Dauer in Ghost-Library schreiben und nur bei laengerer Spur ersetzen.
- [ ] 108.3.2 Bei `ghost_start` im Modus `self_longest_ghost` die laengste Spur der aktiven Route/Map abspielen.
- [ ] 108.3.3 Fallbackverhalten fixieren (kein Clip vorhanden -> kein Playback, keine Fehlermeldungsflut).

### 108.4 Menueintegration und Settings-Sync
status: open
goal: Selbstduell-Option sauber auswaehlbar und persistent machen
output: UI-Control, Binding, Sync-Keys und Summary-Integration

- [ ] 108.4.1 Menue-Control in `index.html` einfuegen (Arcade/Start-Setup-Bereich) und DOM-Refs anbinden.
- [ ] 108.4.2 `SettingsChangeKeys` + `UISettingsSyncMap` fuer neue Option erweitern; `MenuGameplayBindings` an den Intent-Pfad anbinden.
- [ ] 108.4.3 `UIStartSyncController`-Summary/Hints aktualisieren und Option ausserhalb `single` deaktivieren/ausblenden.

### 108.5 Tests und Regression-Hardening
status: open
goal: Verhalten und Kompatibilitaet reproduzierbar absichern
output: Gruene Contract-/Surface-Evidence fuer Persistenz + Playback-Policy

- [ ] 108.5.1 Contract-Tests fuer Ghost-Library (longest-selection, update-policy, fallback/migration) ergaenzen.
- [ ] 108.5.2 `runtime-settings-live-apply.contract.test.mjs` um Ghost-Start/Finish-Faelle fuer `self_longest_ghost` erweitern.
- [ ] 108.5.3 Surface-Test fuer Menuewahl + Persistenz + naechster Lauf (Einzelspieler/Arcade) ergaenzen.

### 108.6 Doku- und Governance-Abgleich
status: open
goal: Plan, Architekturkontext und Evidence konsistent halten
output: Nachvollziehbarer Intake- und Abschlusspfad

- [ ] 108.6.1 Bei Intake in `V108.md` Scope, DoD und Verifikationspfad mit Master abstimmen.
- [ ] 108.6.2 Architektur-Referenz nur dort nachziehen, wo neue Ghost-Policy/Settingspfade dauerhaft relevant sind.

### 108.99 Abschluss-Gate
status: open
goal: Feature regressionsarm und governance-konform abschliessen
output: Gruene Gates, reproduzierbare Evidence

- [ ] 108.99.1 `npm run build`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` gruen.
- [ ] 108.99.2 Betroffene Contract-/Targeted-Tests fuer Ghost-Speicher und Menue-Sync gruen oder blockerfest dokumentiert.
- [ ] 108.99.3 Kein neuer Architektur-Bypass (keine neuen produktiven `this.game`-Kurzschluesse im geaenderten Pfad).

## Risiken

- R1 | niedrig | `durationMs` ist fixiert; Risiko bleibt nur bei inkonsistenter Berechnung zwischen Recorder und Runtime.
- R2 | mittel | Scope-Ueberlappung mit `V104` in UI-Dateien kann Merge-Konflikte ausloesen.
- R3 | mittel | Speicherung grosser Ghost-Clips kann lokale Storage-Groesse belasten, wenn kein klares Ersetzungs-/Begrenzungskonzept gilt.
- R4 | mittel | Route-Mismatch (Ghost von anderer Map) muss strikt ausgeschlossen werden.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V108`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V108.md`
- hard dependencies: `V82.99`
- soft dependencies: `V103.99`, `V104.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

