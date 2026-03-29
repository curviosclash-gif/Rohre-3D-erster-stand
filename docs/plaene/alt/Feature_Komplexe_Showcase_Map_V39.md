# Feature: Komplexe Showcase-Map (V39)

Stand: 2026-03-16  
Status: In Umsetzung abgeschlossen, Abschluss-Gate offen  
Owner: Codex

## Ziel

Eine neue komplexe Showcase-Map aufbauen, die die vorhandenen Map-Systeme des Projekts konsequent ausnutzt und die groessten Luecken zwischen Editor/Schema und Runtime schliesst.

Die Map soll explizit diese bereits vorhandenen oder angelegten Moeglichkeiten nutzen:

- GLB-Map-Rendering mit Box-/Fallback-Kollidern
- Hard-/Foam-Obstacles inklusive Tunnel-Aussparungen
- Feste Portalpaare und planar-faehige Portal-Levels
- Special Gates (`boost`, `slingshot`)
- Authored `playerSpawn` und `botSpawns`
- Authored `items[]` als echte Pickup-/Spawn-Anker statt nur Editor-Daten
- Authored `aircraft[]` als Runtime-Deko
- Preview-/Menue-Metadaten fuer die neue Map
- Editor-Roundtrip ohne stilles Verwerfen der fuer die Map benoetigten Felder

Nicht Bestandteil dieses Plans: ein komplett neues Script-/Hazard-System mit beweglichen Plattformen oder Sequencer-Logik. Dafuer existiert aktuell keine belastbare Runtime-Basis; der Plan nutzt daher alle realen Projektmoeglichkeiten statt neue fiktive Systeme zu erfinden.

## Betroffene Dateien (geplant)

- `src/core/config/maps/MapPresetCatalog.js`
- `src/entities/Arena.js`
- `src/entities/GLBMapLoader.js`
- `src/entities/CustomMapLoader.js`
- `src/entities/mapSchema/MapSchemaRuntimeOps.js`
- `src/entities/arena/ArenaBuilder.js`
- `src/entities/arena/ArenaGeometryCompilePipeline.js`
- `src/entities/arena/PortalPlacementOps.js`
- `src/entities/arena/portal/PortalLayoutBuilder.js`
- `src/entities/runtime/EntitySetupOps.js`
- `src/entities/runtime/EntitySpawnOps.js`
- `src/entities/systems/SpawnPlacementSystem.js`
- `src/entities/Powerup.js`
- `src/state/MatchSessionFactory.js`
- `src/ui/menu/MenuPreviewCatalog.js`
- `src/ui/UIStartSyncController.js`
- `editor/js/EditorMapSerializer.js`
- `editor/js/EditorMapManager.js`
- `tests/helpers.js`
- `tests/playwright.global-setup.js`
- `playwright.config.js`
- `tests/core.spec.js`
- `tests/physics-core.spec.js`
- `tests/physics-hunt.spec.js`
- `tests/stress.spec.js`
- `docs/Umsetzungsplan.md`

## Architektur-Check

- Bestehende Systeme werden weiterverwendet: `MapSchema`, `CustomMapLoader`, `ArenaBuilder`, `ArenaGeometryCompilePipeline`, `PortalLayoutBuilder`, `SpawnPlacementSystem` und `PowerupManager`.
- Keine zweite Map-Pipeline: Editor-/Custom-Maps und ausgelieferte Presets bleiben im selben Datenmodell.
- Die groesste funktionale Luecke liegt aktuell in `MapSchemaRuntimeOps`: `tunnels[]`, `items[]`, `aircraft[]`, `playerSpawn` und `botSpawns` sind im Schema vorhanden, werden in der Runtime aber ganz oder teilweise ignoriert.
- Die Showcase-Map sollte deshalb nicht nur ein neues Preset sein, sondern ein Runtime-Haertungsprojekt fuer authorisierte Map-Daten.
- GLB bleibt fuer die visuelle Huelle zustaendig; spielkritische Kollisionen, Spawnlogik und Portalgates muessen weiterhin deterministisch ueber Runtime-Daten/Fallbacks funktionieren.

Risiko-Einstufung: **hoch** (betrifft Arena-Build, Spawn-Determinismus, Powerup-Platzierung, Portal-/Planar-Pfade, UI-Preview und Custom-Map-Kompatibilitaet gleichzeitig).

Datei-Ownership-Check:

- `src/core/**` liegt derzeit in `V28`.
- `src/ui/menu/**` liegt derzeit in `V27`.
- `src/entities/**` ist teilweise historisch in Gameplay-/Runtime-Bloecken beruehrt.
- Deshalb bleibt dieser Plan zunaechst bewusst als Intake-Eintrag geparkt; spaetere Umsetzung nur mit additiven Shared-Fixes und sauberem Conflict-Log.

Dokumentationswirkung:

- `docs/plaene/alt/Feature_Komplexe_Showcase_Map_V39.md`
- `docs/Umsetzungsplan.md`
- bei Umsetzung zusaetzlich Testergebnis-/Analyse-Dokumente fuer Playtests und Runtime-Warnungen

## Phasenplan

- [x] 39.0 Baseline-Freeze und Feature-Matrix
  - [x] 39.0.1 Iststand der Map-Pipeline dokumentieren: Presets, GLB, Gates, Portal-Levels, Spawn-System, Editor-Exports, ignorierte Schema-Felder
  - [x] 39.0.2 Zielbild der Showcase-Map festlegen: Layout-Rollen, Performance-Budget, Verifikationsmatrix fuer `classic`, `hunt`, `planar`

- [x] 39.1 Runtime-Contract fuer komplexe Authored-Maps schliessen
  - [x] 39.1.1 `MapSchemaRuntimeOps` und `CustomMapLoader` so erweitern, dass benoetigte authored Daten (`portalLevels`, Spawns, Items, Deko-Hinweise) nicht mehr still verloren gehen
  - [x] 39.1.2 Warning-/Fallback-Pfade, Fingerprints und Prewarm-Verhalten fuer neue Map-Metadaten stabil halten

- [x] 39.2 Traversal- und Geometrie-Layer ausbauen
  - [x] 39.2.1 Standalone-`tunnels[]` und Block-Tunnel konsistent in spielbare Runtime-Geometrie/Kollision ueberfuehren
  - [x] 39.2.2 Vertikale Traversal-Regeln fuer `portalLevels`, Tunnelachsen und Gate-Platzierung kollisionssicher machen

- [x] 39.3 Authored Spawn-System aktivieren
  - [x] 39.3.1 `playerSpawn` und `botSpawns` zuerst nutzen, erst danach auf zufaellige Spawn-Suche zurueckfallen
  - [x] 39.3.2 Hunt-/Respawn-/Planar-Pfade so haerten, dass authored Spawns auch unter Last und bei Bot-Matches stabil bleiben

- [x] 39.4 Authored Pickups und Deko nutzbar machen
  - [x] 39.4.1 `items[]` in feste oder gewichtete Pickup-Anker fuer `PowerupManager` ueberfuehren statt sie zu ignorieren
  - [x] 39.4.2 `aircraft[]` als nicht-blockierende Runtime-Deko mit sauberem Load-/Dispose-Vertrag rendern

- [x] 39.5 Showcase-Map-Inhalt "nutzt alle Moeglichkeiten"
  - [x] 39.5.1 Neues Preset/GLB fuer eine mehrzonige Map mit Hard/Foam, Tunneln, vertikalen Ebenen, Portalpaaren sowie `boost`- und `slingshot`-Gates erstellen
  - [x] 39.5.2 Spawn-Routen, Sichtlinien, Pickup-Lanes und Bot-Traversal fuer `classic`, `hunt` und `planar` gezielt auf derselben Map austarieren

- [x] 39.6 Editor-, Auswahl- und Preview-Pfad schliessen
  - [x] 39.6.1 Editor-Export/Import so absichern, dass fuer die Showcase-Map benoetigte Features round-trip-faehig bleiben
  - [x] 39.6.2 Preview-/Menue-Metadaten um relevante Signale wie GLB, Spawn-Reichtum, Gate-Nutzung und vertikale Komplexitaet erweitern

- [x] 39.7 Tests, Playtests und Balancing-Gates
  - [x] 39.7.1 Regressionen fuer Spawn-Nutzung, Tunnel-Runtime, Pickup-Anker, GLB-Fallback und Gate-/Portal-Interaktion ergaenzen
  - [x] 39.7.2 Browser-Spotchecks mit Bots in 3D, Hunt und Planar fahren und Artefakte fuer Screenshot, State und Konsole festhalten

- [ ] 39.9 Abschluss-Gate
  - [ ] 39.9.1 `test:core`, `test:physics`, `test:stress` und `build` fuer den gesamten Scope gruen ziehen
  - [ ] 39.9.2 `npm run docs:sync`, `npm run docs:check` und Doku-Freeze abschliessen

## Verifikation

- Gruen:
  - `npm run build`
  - `npx playwright test tests/core.spec.js --grep "T14d|T14e"`
  - `npx playwright test tests/physics-core.spec.js --grep "T43b"`
  - `npx playwright test tests/core.spec.js` laeuft mit erweitertem Cold-Load-Budget bis in bestehende Legacy-Migrationsfaelle

- Offen bzw. extern blockiert:
  - `test:core` stoppt derzeit an bestehendem Core-Fall `T12b` (`expected maze`, `received mega_maze`)
  - weitere Volllaeufe von `test:physics` / `test:stress` waren zeitweise durch parallele Playwright-Locks aus fremden V40-Runs blockiert
  - erste Cold-Load-/Match-Start-Pfade benoetigten fuer Playwright ein zentrales Prewarm-/Timeout-Hardening in `tests/helpers.js`, `tests/playwright.global-setup.js` und `playwright.config.js`

## Umsetzungsergebnis

- `MapSchemaRuntimeOps`, `Arena`, `SpawnPlacementSystem`, `PowerupManager` und die Tunnel-/Portal-Layer nutzen authored `portalLevels`, `gates`, `playerSpawn`, `botSpawns`, `items[]`, `aircraft[]` und Standalone-`tunnels[]` jetzt in der Runtime statt sie zu ignorieren.
- Das neue Preset `showcase_nexus` kombiniert GLB-Rendering mit `fallbackOnly`-Kollidern, Hard/Foam-Obstacles, Block-Tunnel, Standalone-Tubes, authored Portalpaaren, `boost`-/`slingshot`-Gates, authored Spawns, Pickup-Ankern und Aircraft-Deko.
- Editor-Roundtrip, Menu-Preview und Session-Hinweise wurden nachgezogen; fuer stabile Playwright-Vollsuiten wurde der erste Browser-/Match-Cold-Load zentral vorgewaermt und mit realistischeren Timeouts versehen.

## Frische-Hinweis

Bei Abschluss der spaeteren Umsetzung muessen `npm run docs:sync` und `npm run docs:check` zwingend als letzter Schritt laufen.

