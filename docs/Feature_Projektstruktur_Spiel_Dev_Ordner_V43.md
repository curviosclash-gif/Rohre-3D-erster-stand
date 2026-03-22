# Feature Plan: Projektstruktur Spiel und Dev-Ordner V43

Stand: 2026-03-17
Status: Geplant
Owner: Single-Agent Planung

## Ziel

Die Repository-Struktur so ordnen, dass spielrelevante Dateien fuer Runtime und Editoren klar von Entwickler-, Test-, Trainings- und Wartungsdateien getrennt sind, ohne den aktuellen Vite-/Browser-/Playwright-Setup unnoetig zu destabilisieren.

Der Plan soll:

- spielnahe Dateien schnell auffindbar machen
- Map-Editor und Vehicle-Editor als Teil des Spielbereichs behandeln
- Entwickler-Werkzeuge in einem klaren Sammelpfad buendeln
- einen risikoarmen Migrationspfad definieren statt eines grossen Einmal-Umzugs

## Empfehlung

Nicht mit einem sofortigen Komplett-Umzug nach `spiel/` oder `game/` beginnen.

Empfohlen ist eine zweistufige Strategie:

1. Kurzfristig den Repo-/Build-Root stabil lassen und zuerst nur Entwicklerpfade unter `dev/` oder `tools/` buendeln.
2. Einen echten `game/`-Unterordner erst spaeter anfassen, nachdem harte Pfadkopplungen zentralisiert und getestet sind.

Fuer dieses Repo ist `dev/` der bessere erste Schritt als `developer/`, weil der Name kuerzer ist und besser zu den bereits englischen Pfaden passt.

## Ausgangslage

- Das Spiel laeuft aktuell ueber Root-Einstiege wie `index.html`, `style.css`, `vite.config.js` und `package.json`.
- Der Map-Editor liegt bereits separat unter `editor/` und wird aus dem Menue direkt per URL geoeffnet.
- Der Vehicle-Editor ist funktional an Vite-APIs, Datenpfade und generierte Vehicle-Konfigurationen gekoppelt.
- Training, Tests und Automatisierung liegen verteilt ueber `scripts/`, `tests/`, `trainer/`, Root-Startskripte und mehrere Arbeitsordner.

Harte Kopplungen, die einen sofortigen `game/`-Umzug riskant machen:

- `index.html` bindet `style.css` direkt im Root ein.
- `src/ui/menu/MenuGameplayBindings.js` oeffnet `editor/map-editor-3d.html` per `window.open(...)`.
- `tests/core.spec.js` navigiert direkt auf `/editor/map-editor-3d.html`.
- `start_editor.bat` und `start_editor_local.bat` zeigen auf `http://localhost:5173/editor/map-editor-3d.html`.
- `vite.config.js` importiert Root-pfadig `./src/entities/MapSchema.js`, liest und schreibt unter `data/maps` und `data/vehicles` und startet Trainingsprozesse ueber `scripts/**`.

## Variantenbewertung

### Variante A: Sofort alles nach `game/` und `dev/` verschieben

- Vorteil:
  - sehr saubere Zielstruktur
- Nachteil:
  - hoher Umbau an Vite-Root, Editor-URLs, Tests, Startskripten und Dateigeneratoren
- Risiko:
  - hoch
- Empfehlung:
  - derzeit nicht als erster Schritt

### Variante B: Spielpfade stabil lassen, nur Entwicklerpfade nach `dev/` ziehen

- Vorteil:
  - geringerer URL- und Runtime-Eingriff
  - Vite-Browserpfade bleiben zunaechst stabil
  - Root wird bereits deutlich sauberer
- Nachteil:
  - Zielbild ist noch nicht maximal konsolidiert
- Risiko:
  - mittel
- Empfehlung:
  - **empfohlener Startpfad**

### Variante C: Nur Root aufraeumen, aber keine echten Pfade aendern

- Vorteil:
  - geringstes Risiko
- Nachteil:
  - eigentliche Strukturprobleme bleiben
- Risiko:
  - niedrig
- Empfehlung:
  - nur sinnvoll als Vorstufe fuer Variante B

## Empfohlene Zielstruktur

### Phase-1-Zielbild

```text
/
  index.html
  style.css
  src/
  editor/
  assets/
  data/
  videos/
  dev/
    scripts/
    tests/
    trainer/
    prototypes/
    backups/
    bin/
  docs/
  package.json
  vite.config.js
```

### Optionales spaeteres Phase-2-Zielbild

```text
/
  game/
    index.html
    style.css
    src/
    editor/
    assets/
    data/
    videos/
  dev/
    scripts/
    tests/
    trainer/
    prototypes/
    backups/
    bin/
  docs/
  package.json
  vite.config.js
```

## Was als Spielbereich gelten sollte

- `index.html`
- `style.css`
- `src/**`
- `editor/**`
- `assets/**`
- `data/maps/**`
- `data/vehicles/**`
- `videos/**` sofern sie Spiel-/Replay-/Capture-Artefakte enthalten

## Was als Entwicklerbereich gelten sollte

- `scripts/**`
- `tests/**`
- `trainer/**`
- `prototypes/**`
- `backups/**`
- Root-Start-/Ops-Skripte wie `start_*.bat`, `server.ps1`, `backup*.ps1`
- Playwright-/Test-Arbeitsordner, sofern sie nicht bewusst als Build-Artefakt im Root bleiben sollen

## Architektur-Check

- Der Plan kreuzt praktisch alle zentralen Ownership-Bereiche (`src/ui/**`, `src/core/**`, `src/state/**`, `scripts/**`, `tests/**`, `editor/**`).
- Deshalb sollte V43 zunaechst nur als Intake-/Referenzplan stehen und nicht parallel zu einem grossen Runtime-Umbau aktiviert werden.
- Vor einem echten `game/`-Umzug muessen URL- und Pfadkonstanten zentralisiert werden, damit Editor-, Test- und Build-Pfade nicht an vielen Stellen hart codiert bleiben.
- Die Editoren gehoeren fachlich zum Spielbereich, nicht zum Dev-Bereich. Sie sind Spielwerkzeuge fuer Content-Erstellung und werden direkt aus dem Menue geoeffnet.

## Risiko

- Gesamt: **mittel bis hoch**
- Niedrigeres Teilrisiko:
  - nur `dev/`-Buendelung
- Hoeheres Teilrisiko:
  - echter `game/`-Umzug

Hauptgruende:

- Root-relative Browserpfade
- Vite-Plugin-Logik fuer Map-/Vehicle-Save und Training
- viele Paket- und Testskripte mit direkten `scripts/**`-Pfaden
- Editor-Startpfade in Tests und Batch-Dateien

## Betroffene Dateien (geplant)

- `package.json`
- `vite.config.js`
- `index.html`
- `style.css`
- `src/**`
- `editor/**`
- `scripts/**`
- `tests/**`
- `trainer/**`
- `start_*.bat`
- `server.ps1`
- `backup*.ps1`
- `docs/Umsetzungsplan.md`
- neue Zielpfade `dev/**` und optional spaeter `game/**`

## Erfolgsmetriken

- Die Root-Ebene enthaelt nur noch Repo-/Build-/Doku-Kernpfade und keine verstreuten Dev-Werkzeuge mehr.
- Spielbereich und Dev-Bereich sind fuer neue Dateien eindeutig.
- Editor-Links, Startskripte, Build und Tests laufen nach jeder Migrationsstufe weiterhin.
- Ein spaeterer `game/`-Umzug ist optional vorbereitet, aber nicht erzwungen.

## Phasenplan

- [x] 43.0 Scope-Freeze und Ordnervertrag (abgeschlossen: 2026-03-22; evidence: `Get-ChildItem -Force | Select-Object Name,Mode` -> `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md`)
  - [x] 43.0.1 Alle Root-Pfade in Kategorien einteilen: Spiel, Editor, Dev, Repo-Metadaten, Artefakte (abgeschlossen: 2026-03-22; evidence: `Get-ChildItem -Force | Select-Object Name,Mode` -> `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md`)
  - [x] 43.0.2 Endgueltigen Namensvertrag festziehen: `dev/` statt `developer/`; Editoren explizit als Spielbereich markieren (abgeschlossen: 2026-03-22; evidence: `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md` -> Abschnitt `Ordnervertrag 43.0`)

### Ordnervertrag 43.0 (Stand 2026-03-22)

| Kategorie | Root-Pfade |
| --- | --- |
| Spielbereich | `index.html`, `style.css`, `src/`, `assets/`, `data/`, `videos/`, `electron/`, `server/` |
| Editorbereich (fachlich Spiel) | `editor/`, `training.html` |
| Dev-/Tooling-Bereich (heute verteilt) | `scripts/`, `tests/`, `trainer/`, `prototypes/`, `backups/`, `tmp/`, `output/` |
| Repo-Metadaten und Governance | `.git/`, `.github/`, `.agents/`, `.husky/`, `AGENTS.md`, `package.json`, `vite.config.js`, `tsconfig*.json`, `eslint.config.js` |
| Build-/Test-Artefakte | `dist/`, `playwright-report/`, `test-results*/`, `.codex_tmp/`, `phase2_2026-03-02/` |

Vertrag fuer die naechsten Schritte:

- Zielname fuer den kuenftigen Dev-Sammelpfad bleibt `dev/` (nicht `developer/`).
- Editoren bleiben fachlich im Spielbereich und werden nicht in den Dev-Bereich verschoben.
- Runtime-Browserpfade (`/editor/...`, `/assets/...`) werden erst nach zentralisierten Pfad-Contracts migriert.

- [x] 43.1 Pfad-Inventar und Kopplungen zentralisieren (abgeschlossen: 2026-03-22; evidence: `rg -n "EDITOR_VIEW_PATHS|EDITOR_API_ROUTES|EDITOR_DATA_PATHS" src/ui/menu/MenuGameplayBindings.js src/core/MediaRecorderSystem.js tests/core.spec.js tests/editor-vehicle.spec.js vite.config.js src/shared/contracts/EditorPathContract.js` -> `src/shared/contracts/EditorPathContract.js`)
  - [x] 43.1.1 Alle hart codierten Editor-, Test- und Tool-Pfade in `vite.config.js`, Startskripten, Tests und Menuecode erfassen (abgeschlossen: 2026-03-22; evidence: `rg -n "editor/map-editor-3d\\.html|prototypes/vehicle-lab/index\\.html|save-map-disk|save-video-disk|save-vehicle-disk|list-vehicles-disk|get-vehicle-disk|rename-vehicle-disk|delete-vehicle-disk|data/maps|data/vehicles|GeneratedLocalMaps\\.js" src/ui/menu/MenuGameplayBindings.js src/core/MediaRecorderSystem.js tests/core.spec.js vite.config.js` -> `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md`)
  - [x] 43.1.2 Wo sinnvoll zentrale Konstanten oder Hilfsfunktionen fuer Editor-URLs, Tool-Roots und Generierungsziele einfuehren (abgeschlossen: 2026-03-22; evidence: `rg -n "EDITOR_VIEW_PATHS|EDITOR_API_ROUTES|EDITOR_DATA_PATHS" src/ui/menu/MenuGameplayBindings.js src/core/MediaRecorderSystem.js tests/core.spec.js tests/editor-vehicle.spec.js vite.config.js src/shared/contracts/EditorPathContract.js` -> `src/shared/contracts/EditorPathContract.js`)

### Inventar 43.1.1 (Stand 2026-03-22)

| Kategorie | Datei | Fundstellen | Hart codierter Pfad / Route |
| --- | --- | --- | --- |
| Menue -> Editor-URL | `src/ui/menu/MenuGameplayBindings.js` | 332 | `editor/map-editor-3d.html` |
| Menue -> Tool-URL | `src/ui/menu/MenuGameplayBindings.js` | 338 | `prototypes/vehicle-lab/index.html` |
| Runtime -> Editor-API | `src/core/MediaRecorderSystem.js` | 1077 | `/api/editor/save-video-disk` |
| Test -> Editor-URL | `tests/core.spec.js` | 3162 | `/editor/map-editor-3d.html` |
| Test -> Editor-API | `tests/core.spec.js` | 3166 | `/api/editor/save-map-disk` |
| Test -> generiertes Modul | `tests/core.spec.js` | 30, 3186 | `src/entities/GeneratedLocalMaps.js` |
| Test -> Editor-Datenpfad | `tests/core.spec.js` | 31 | `data/maps` |
| Dev-Server -> Editor API-Routen | `vite.config.js` | 475-481 | `/api/editor/save-map-disk`, `/api/editor/save-vehicle-disk`, `/api/editor/list-vehicles-disk`, `/api/editor/get-vehicle-disk`, `/api/editor/rename-vehicle-disk`, `/api/editor/delete-vehicle-disk`, `/api/editor/save-video-disk` |
| Build/Tooling -> Datenpfade | `vite.config.js` | 19, 31 | `data/maps`, `data/vehicles` |
| Startskript -> Editor-URL | `start_editor.bat` | 8 | `http://localhost:5173/editor/map-editor-3d.html` |
| Startskript -> Editor-URL (variabel) | `start_editor_local.bat` | 8 | `http://%HOST%:%PORT%/editor/map-editor-3d.html` |

### Umsetzung 43.1.2 (Stand 2026-03-22)

- Neue Contract-Datei: `src/shared/contracts/EditorPathContract.js`
  - `EDITOR_VIEW_PATHS` fuer Editor-/Tool-Views
  - `EDITOR_API_ROUTES` fuer Editor-Disk-API-Routen
  - `EDITOR_DATA_PATHS` fuer Maps/Vehicles und generierte Modulziele
- Konsumenten umgehaengt:
  - `src/ui/menu/MenuGameplayBindings.js`
  - `src/core/MediaRecorderSystem.js`
  - `tests/core.spec.js`
  - `tests/editor-vehicle.spec.js`
  - `vite.config.js`
- Weiterhin bewusst lokal in Startskripten:
  - `start_editor.bat`
  - `start_editor_local.bat`
  - Grund: Batch-Dateien konsumieren keine JS-Contracts; Harmonisierung folgt erst mit geplanter Dev-Pfad-Migration.

- [x] 43.2 Dev-Bereich mit geringem Risiko auslagern (abgeschlossen: 2026-03-22; evidence: `rg -n "dev/scripts/(training|verify-lock)|dev/bin/start_|resolveDevLayoutRelativePath" package.json .husky/pre-commit start_trainer_server.bat start_training_bridge.bat start_trainer_and_training.bat scripts/dev-layout-paths.mjs` -> `package.json`)
  - [x] 43.2.1 `scripts/**`, `tests/**`, `trainer/**`, `prototypes/**` und Hilfsskripte in einen gemeinsamen `dev/`-Pfad verschieben oder ueber Wrapper dorthin abstrahieren (abgeschlossen: 2026-03-22; evidence: `rg -n "DEV_LAYOUT_CATEGORY_ROOTS|resolveDevLayoutRelativePath|forwardLegacyScriptAndExit|TRAINING_SCRIPT_PATHS" scripts/dev-layout-paths.mjs dev/scripts/_forward-legacy-script.mjs scripts/training-loop.mjs scripts/training-e2e.mjs tests/training-gate.test.mjs tests/trainer-v34-loop.test.mjs tests/trainer-v34-run-fallback.test.mjs tests/training-e2e.test.mjs` -> `scripts/dev-layout-paths.mjs`)
  - [x] 43.2.2 `package.json`, CI-/Hook-Pfade, Startskripte und Doku auf den neuen Dev-Pfad anpassen, ohne Browser-Runtime-Pfade anzufassen (abgeschlossen: 2026-03-22; evidence: `rg -n "dev/scripts/(training|verify-lock)|dev/bin/start_" package.json .husky/pre-commit start_trainer_server.bat start_training_bridge.bat start_trainer_and_training.bat` -> `package.json`)

### Umsetzung 43.2.1 (Stand 2026-03-22)

- Neue Pfadabstraktion: `scripts/dev-layout-paths.mjs`
  - zentrale Kategorien fuer `scripts`, `tests`, `trainer`, `prototypes` und `helpers`
  - Resolver mit bevorzugtem `dev/**`-Pfad und Legacy-Fallback auf Root-Pfade
- Neues `dev/`-Geruest fuer risikoarmen Uebergang:
  - `dev/scripts/*` Wrapper-Einstiege fuer Trainings-/Bot-Tools
  - `dev/bin/*` Wrapper fuer Trainings-Hilfsskripte
  - reservierte Zielordner `dev/tests/`, `dev/trainer/`, `dev/prototypes/`
- Root-Hilfsskripte auf Wrapper umgestellt:
  - `start_trainer_server.bat`
  - `start_training_bridge.bat`
  - `start_trainer_and_training.bat`
- Trainings-Orchestrierung und zugehoerige Node-Tests auf den Resolver umgestellt:
  - `scripts/training-loop.mjs`
  - `scripts/training-e2e.mjs`
  - `tests/training-gate.test.mjs`
  - `tests/trainer-v34-loop.test.mjs`
  - `tests/trainer-v34-run-fallback.test.mjs`
  - `tests/training-e2e.test.mjs`

### Umsetzung 43.2.2 (Stand 2026-03-22)

- `package.json` Trainings- und Playwright-Lock-Einstiege auf `dev/scripts/*`-Wrapper umgestellt:
  - `training:*`, `training:e2e`, `bot:validate`
  - `benchmark:jitter` und `test:*` ueber `dev/scripts/verify-lock.mjs`
- Hook-Pfad angepasst:
  - `.husky/pre-commit` nutzt fuer Bot-Mode-Lockcheck jetzt `node dev/scripts/verify-lock.mjs`
- Startskript-Wrapping als Teil der `dev/`-Vorbereitung beibehalten:
  - Root-`start_trainer*.bat` delegieren auf `dev/bin/*`
- Browser-Runtime-Pfade (`/editor/**`, `/assets/**`) unveraendert gelassen.

- [x] 43.3 Spielbereich stabilisieren (abgeschlossen: 2026-03-22; evidence: `npm run check:editor:path-drift && npm run check:root:runtime` -> `scripts/check-editor-path-drift.mjs`)
  - [x] 43.3.1 Editoren, Map-/Vehicle-Datenpfade und generierte Artefakte als klaren Spielbereich dokumentieren und gegen Drift absichern (abgeschlossen: 2026-03-22; evidence: `npm run check:editor:path-drift` -> `scripts/check-editor-path-drift.mjs`)
  - [x] 43.3.2 Root nur soweit bereinigen, dass Spielstart, Editor-Start und lokale Speicherpfade unveraendert funktionieren (abgeschlossen: 2026-03-22; evidence: `npm run check:root:runtime` -> `scripts/check-root-runtime-invariants.mjs`)

### Umsetzung 43.3.1 (Stand 2026-03-22)

- Editor-/Vehicle-Lab-API-Routen als Spielbereichspfad verankert:
  - `editor/js/ui/EditorSessionControls.js` nutzt `EDITOR_API_ROUTES.SAVE_MAP_DISK`
  - `prototypes/vehicle-lab/main.js` nutzt `EDITOR_API_ROUTES.*` fuer List/Get/Save/Rename/Delete
- Neuer Drift-Guard eingefuehrt:
  - `scripts/check-editor-path-drift.mjs` blockiert neue hart codierte Editor-/API-/Datenpfade ausserhalb erlaubter Dateien
  - Guard ist in `architecture:guard` eingebunden (`package.json`), damit er in Build-/Architektur-Gates automatisch laeuft
- Runtime-Browserpfade bleiben unveraendert; die Absicherung fokussiert bewusst auf Contract-Nutzung und Pfad-Drift.

### Umsetzung 43.3.2 (Stand 2026-03-22)

- Root-Invarianten fuer Runtime/Editor-Start explizit abgesichert:
  - neuer Guard `scripts/check-root-runtime-invariants.mjs`
  - prueft erforderliche Root-Dateien (`index.html`, `style.css`, `server.ps1`, `start_game.bat`, `start_editor*.bat`)
  - prueft lokale Speicherpfade (`data/maps`, `data/vehicles`)
  - prueft, dass `start_editor*.bat` weiterhin auf `/editor/map-editor-3d.html` zeigen
- Guard ist in `architecture:guard` integriert (`npm run check:root:runtime`), damit Root-Cleanup nicht still regressiert.
- Keine Browser-Runtime-Pfadmigration; Ziel bleibt bewusst ein risikoarmer Root-Cleanup mit stabilen Startpfaden.

- [ ] 43.4 Optionaler `game/`-Unterordner als zweite Stufe
  - [ ] 43.4.1 Erst nach gruener Dev-Migration pruefen, ob `index.html`, `style.css`, `src/`, `editor/` und ggf. Assets explizit unter `game/` gezogen werden sollen
  - [ ] 43.4.2 Falls ja: Vite-Root, Editor-URLs, Playwright-Targets, Startskripte, Generierungsziele und Doku in einem eigenen, voll verifizierten Schritt umhaengen

- [ ] 43.5 Verifikation an Funktionsgrenzen
  - [ ] 43.5.1 Nach Dev-Migration: `npm run build`, `npm run test:core` und relevante Editor-/Tool-Smokes bestaetigen
  - [ ] 43.5.2 Nach optionalem `game/`-Umzug: Browser-Spotchecks fuer Spielstart, Map-Editor, Vehicle-Editor und Disk-Save-APIs festhalten

- [ ] 43.9 Abschluss-Gate
  - [ ] 43.9.1 Finale Struktur und Pfadvertraege per `build`, Kern-Tests und manuellem Editor-Spotcheck bestaetigen
  - [ ] 43.9.2 `npm run docs:sync`, `npm run docs:check` und Doku-Freeze abschliessen

## Verifikation

- Nach 43.2:
  - `npm run build`
  - `npm run test:core`
- Nach 43.4:
  - `npm run build`
  - `npm run test:core`
  - gezielter Map-Editor-Spotcheck
- Vor Abschluss:
  - `npm run docs:sync`
  - `npm run docs:check`

## Freshness-Hinweis

Der Plan gilt erst als abgeschlossen, wenn nach der finalen Umsetzungsstufe `npm run docs:sync` und `npm run docs:check` erfolgreich gelaufen sind.
