# Feature Repo-Aufraeumen Runtime-sicher V71

Stand: 2026-03-30
Status: In Arbeit
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Den Repository-Root und die Artefaktordner deutlich aufraeumen, ohne Spielstart, Editor-Flows, Vehicle-Lab, Recording oder Test-Infrastruktur zu beschaedigen.

Der Plan trennt deshalb strikt zwischen:

- sofort sicher loeschbaren Build-/Test-/Log-Artefakten
- nur archivierungsfaehigen Alt- und Nachweisordnern
- derzeit geschuetzten Runtime-/Editor-Pfaden, die erst nach Contract-Migration angefasst werden duerfen

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V71`
- Hard dependencies: V43-Strukturvertrag bleibt bis zum Abschluss von 71.4 die Quelle der Wahrheit; `prototypes/` darf vorher nicht entfernt oder verschoben werden.
- Soft dependencies: Abstimmung mit laufenden Trainings-/Operator-Runs vor Aufraeumen von `output/` und `tmp/`; bei Archiv-Move von `phase2_2026-03-02/` und `backups/` Dokumentationslinks mitpruefen.
- Hinweis: Manuelle Uebernahme erforderlich.

## Ausgangslage

Aktuelle Groessen-Hotspots im Root (Snapshot 2026-03-30):

- `.codex_tmp/` ca. `3257.36 MB`
- `tmp/` ca. `835.74 MB`
- `output/` ca. `172.23 MB`
- `node_modules/` ca. `109.54 MB`
- `videos/` ca. `60.51 MB`
- `phase2_2026-03-02/` ca. `7.28 MB`

Bereits abgesicherte Beobachtungen:

- `dist/`, `playwright-report/`, `test-results*/`, `tmp/`, `videos/`, `.codex_tmp/` sind in `.gitignore` als lokale Artefakte markiert.
- `scripts/clean-dev-temp-logs.mjs` raeumt bereits Root-Logs `tmp-dev-*` und `tmp-vite*` plus `tmp/dev-logs/*` auf.
- `scripts/check-root-runtime-invariants.mjs` verlangt weiterhin `index.html`, `style.css`, `server.ps1`, `start_game.bat`, `start_editor*.bat`, `data/maps` und `data/vehicles`.
- `src/shared/contracts/EditorPathContract.js` zeigt `VEHICLE_LAB` direkt auf `/prototypes/vehicle-lab/index.html`.
- `src/entities/runtime-modular-vehicle-mesh.js` importiert direkt aus `../../prototypes/vehicle-lab/src/ModularVehicleMesh.js`.
- `src/core/MediaRecorderSystem.js` und `tests/core.spec.js` halten den Ordnernamen `videos` als aktiven Contract.
- `phase2_2026-03-02/`, `backups/` und `prototypes/` sind versioniert; sie sind kein simpler Muell-Ordner.

## Schutzgrenzen

Vor jeder physischen Bereinigung gelten diese Grenzen:

- Nie direkt loeschen oder verschieben: `index.html`, `style.css`, `src/`, `assets/`, `data/`, `editor/`, `electron/`, `server.ps1`, `start_*.bat`.
- `prototypes/` bleibt geschuetzt, bis Vehicle-Lab- und Runtime-Importe auf einen migrationssicheren Pfad umgestellt sind.
- `videos/` bleibt als Ordnername erhalten; nur Inhalte duerfen nach Alters-/Bedarfsregel archiviert werden.
- `tmp/test-latest-index.lock`, aktive Dev-Logs und laufende Test-/Trainingsartefakte duerfen nicht waehrend eines Runs entfernt werden.
- `output/` ist nicht runtime-kritisch, kann aber Operator-/Trainings-Nachweise enthalten und wird deshalb nur nach Run-Status bereinigt.

## Betroffene Pfade (geplant)

- `.gitignore`
- `package.json`
- `scripts/clean-dev-temp-logs.mjs`
- `scripts/check-root-runtime-invariants.mjs`
- `scripts/root-runtime-protection.mjs`
- `scripts/` (neuer Cleanup-Dry-Run/Apply-Entry)
- `tmp/`
- `.codex_tmp/`
- `dist/`
- `playwright-report/`
- `test-results*/`
- `output/`
- `videos/`
- `phase2_2026-03-02/`
- `backups/`
- `src/shared/contracts/RecordingCaptureContract.js`
- `src/core/GameBootstrap.js`
- `src/core/MediaRecorderSystem.js`
- `src/shared/contracts/EditorPathContract.js`
- `src/entities/runtime-modular-vehicle-mesh.js`
- `tests/editor-vehicle.spec.js`
- `docs/plaene/neu/Feature_Repo_Aufraeumen_Runtime_sicher_V71.md`

## Definition of Done (DoD)

- [ ] DoD.1 Ein Dry-Run-Bericht klassifiziert jeden Aufraeum-Kandidaten als `delete`, `archive` oder `protect` inklusive Risikostufe.
- [ ] DoD.2 Sofort sichere Artefakte (`.codex_tmp/`, `dist/`, `playwright-report/`, `test-results*/`, Root-/Dev-Temp-Logs und freigegebene `tmp/`-Artefakte) lassen sich ueber einen reproduzierbaren Cleanup-Pfad entfernen, ohne aktive Locks/Runs zu zerstoeren.
- [ ] DoD.3 Historische oder langfristige Ordner (`backups/`, `phase2_2026-03-02/`, `output/`, alte `videos/`) haben eine klare Archiv-/Retention-Regel statt ad-hoc-Loeschung.
- [ ] DoD.4 `prototypes/` bleibt bis zur abgeschlossenen Contract-Migration funktionsfaehig; kein Cleanup-Schritt kappt Vehicle-Lab- oder Runtime-Importe.
- [ ] DoD.5 `npm run check:root:runtime`, `npm run build`, `npm run test:core`, die direkt betroffenen Editor-/Vehicle-Checks sowie `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 71.1 Schutzgrenzen und Inventar

- [x] 71.1.1 Eine verbindliche Allowlist fuer runtime- und editor-kritische Root-Pfade aus `scripts/check-root-runtime-invariants.mjs`, `EditorPathContract`, Recorder-Contract und Startskripten ableiten. (abgeschlossen: 2026-03-30; evidence: `npm run check:root:runtime && npm run cleanup:workspace` -> `tmp/workspace-cleanup-report.json`)
- [x] 71.1.2 Einen Dry-Run-Inventarbericht erstellen, der alle Root-/Artefaktordner in `delete`, `archive` oder `protect` einsortiert und pro Eintrag `low`, `medium` oder `high` Risiko vergibt. (abgeschlossen: 2026-03-30; evidence: `npm run cleanup:workspace` -> `tmp/workspace-cleanup-report.json`)

### 71.2 Sofort sichere Artefakte bereinigen

- [x] 71.2.1 Den bestehenden Log-Cleanup auf einen allgemeinen Workspace-Cleanup-Dry-Run erweitern oder einen eigenen Script-Entry anlegen, der mindestens `.codex_tmp/`, `dist/`, `playwright-report/`, `test-results*/`, Root-Temp-Logs und `tmp/dev-logs/*` sicher behandelt. (abgeschlossen: 2026-03-30; evidence: `npm run logs:clean -- --dry-run && npm run cleanup:workspace` -> `tmp/workspace-cleanup-report.json`)
- [x] 71.2.2 Fuer `tmp/` eine konservative Retention-Regel einziehen: Locks, aktuelle Diagnosen und explizit referenzierte Evidence bleiben; verwaiste Repros, Screenshots, alte JSON-Snapshots und lokale Diagnosekopien koennen nach Dry-Run entfernt werden. (abgeschlossen: 2026-03-30; evidence: `npm run cleanup:workspace` -> `tmp/workspace-cleanup-report.json`)

### 71.3 Archivierungsfaehige Langzeitordner ordnen

- [ ] 71.3.1 `phase2_2026-03-02/` und `backups/` auf Null-Referenzen pruefen und anschliessend in einen expliziten Archivpfad mit kurzer Manifest-/README-Notiz verschieben statt im Root liegen zu lassen.
- [ ] 71.3.2 Fuer `output/` und `videos/` eine Retention-Regel definieren: aktive oder juengste Runs bleiben lokal, aeltere Artefakte werden datiert archiviert; der Contract `videos` als Download-/Recorder-Ziel bleibt unveraendert.

### 71.4 Legacy-Pfade entkoppeln, bevor tiefer aufgeraeumt wird

- [ ] 71.4.1 Direkte Runtime-/Test-Kopplungen auf `prototypes/vehicle-lab/**` ueber einen migrationssicheren Pfad oder Contract abstrahieren, damit `prototypes/` spaeter ohne Seiteneffekt verschoben werden kann.
- [ ] 71.4.2 Editor-/Vehicle-Tests und Root-Guards so nachziehen, dass ein kuenftiger Archiv- oder `dev/prototypes/`-Move reproduzierbar pruefbar ist und nicht nur auf manuelle Spotchecks vertraut.

### 71.5 Dokumentation und Bedienpfad

- [ ] 71.5.1 README-/Workflow-Hinweise fuer den neuen Cleanup-Ablauf dokumentieren: Dry-Run zuerst, Apply nur fuer freigegebene Kategorien, keine Loeschung waehrend laufender Dev-/Test-/Training-Prozesse.
- [ ] 71.5.2 Die Kategorien `delete`, `archive`, `protect` mit Beispielpfaden dokumentieren, damit kuenftige Aufraeumrunden denselben Vertrag nutzen und nicht erneut Root-Runtime-Pfade angreifen.

### 71.99 Integrations- und Abschluss-Gate

- [ ] 71.99.1 `npm run check:root:runtime`, `npm run build` und `TEST_PORT=<port> PW_RUN_TAG=v71-core PW_OUTPUT_DIR=test-results/v71-core npm run test:core` sind fuer den Cleanup-Scope gruen.
- [ ] 71.99.2 Falls `prototypes/`, Editor-Pfade oder Vehicle-Lab betroffen sind, laufen die direkt betroffenen Editor-/Vehicle-Checks ebenfalls gruen; zusaetzlich sind `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` abgeschlossen.

## Verifikationsstrategie

- Plan-/Dokugates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Root-/Startpfad-Schutz: `npm run check:root:runtime`
- Allgemeine Runtime-Sicherheit: `npm run build`
- Fallback gemaess Test-Mapping: `TEST_PORT=<port> PW_RUN_TAG=<tag> PW_OUTPUT_DIR=test-results/<tag> npm run test:core`
- Bei `src/entities/**`-Aenderungen durch Prototype-Migration zusaetzlich: `npm run test:physics`
- Bei Editor-/Vehicle-Lab-Pfadaenderungen: direkt betroffene Playwright-Specs bzw. Editor-Checks mit isoliertem `TEST_PORT` und `PW_OUTPUT_DIR`

## Risiko-Register V71

- `R1 | high | prototypes/` ist weiter direkt an Menue-, Runtime- und Testpfade gekoppelt.
  - Mitigation: erst in 71.4 abstrahieren, vorher nur `protect`.
- `R2 | medium | videos/` ist als Recorder- und Test-Contract aktiv, obwohl der Ordner in `.gitignore` steht.
  - Mitigation: Ordnername nie aendern; nur Inhalts-Rotation mit dokumentierter Retention.
- `R3 | medium | tmp/` enthaelt sowohl verwaiste Artefakte als auch aktive Locks/Diagnosen.
  - Mitigation: Dry-Run mit Ausschlussliste fuer Locks, juengste Artefakte und laufende Prozesse.
- `R4 | medium | output/` kann Trainings-/Operator-Nachweise enthalten, auch wenn der Ordner nicht runtime-kritisch ist.
  - Mitigation: nur nach Run-Status und Altersregel archivieren, nicht blind loeschen.
- `R5 | low | phase2_2026-03-02/` und `backups/` sind wahrscheinlich archivierungsfaehig, koennen aber implizite Dokumentationsreferenzen tragen.
  - Mitigation: Null-Referenz-Check vor Move und kleine Manifest-Notiz am Zielpfad.
