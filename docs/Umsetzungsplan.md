# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-11

Dieser Masterplan ist die einzige aktive Planquelle fuer offene Arbeit.
Abgeschlossene oder abgeloeste Planstaende liegen unter `docs/archive/plans/`.

## Status-Uebersicht

- [ ] Offen
- [/] In Bearbeitung
- [x] Abgeschlossen

## Nutzung

- Offene Punkte werden nur noch in diesem Dokument gepflegt.
- Abgeschlossene Root-Plaene werden nach `docs/archive/plans/completed/` verschoben.
- Abgeloeste Master-/Detailplaene werden nach `docs/archive/plans/superseded/` verschoben.
- Historische Altarchive unter `docs/archive/` bleiben als Referenz bestehen.

## Bearbeitungsprotokoll (merge-sicher)

- Bestehende Bloecke werden nicht umsortiert oder umnummeriert.
- Statusaenderungen passieren nur im jeweils betroffenen Block.
- Neue Plaene werden bei Parallelbetrieb nicht mitten in bestehende Bereiche eingefuegt.
- Ein zweiter Agent haengt neue Planideen oder neue Referenzplaene nur in `Plan-Eingang (append-only)` an.
- Die Rueckfuehrung aus dem Eingang in einen Hauptblock passiert spaeter in einem separaten Cleanup-Schritt.
- Prioritaeten und Index werden bewusst seltener angepasst als die Detailbloecke, um Merge-Konflikte klein zu halten.
- **Lock-Regeln**: Siehe `AGENTS.md` Abschnitt `Parallel Bots`. Jeder Block hat einen `<!-- LOCK -->` Header. Claim nur via atomarem Commit.
- **Phasen-Schema**: Jede Phase muss mindestens 2 Unterphasen haben. Einzelschritte als Unterphasen modellieren.

## Datei-Ownership (aktiv bei Parallelbetrieb)

| Pfad-Pattern | Besitzer-Block | Aktueller Bot |
|---|---|---|
| `src/hunt/**` | V26 | frei |
| `src/entities/ai/**` | V26 | frei |
| `src/ui/menu/**` | V27 | frei |
| `src/state/**` | V27 | frei |
| `src/core/**` | V28 | frei |
| `src/entities/systems/**` | V28 | frei |
| `scripts/**` | shared | alle |
| `trainer/**` | PX V34 | frei |
| `tests/**` | shared | alle (append-only) |
| `docs/**` | shared | alle (append-only) |
| `editor/**` | shared | alle |

## Conflict-Log (append-only)

| Datum | Bot | Fremder Block | Datei | Grund | Risiko |
|---|---|---|---|---|---|
| 2026-03-11 | A | V28 | `src/core/GameBootstrap.js` | Expertenlogin brauchte neue UI-Refs und Bootstrap-Verdrahtung fuer den V27-Menuepfad | niedrig |
| 2026-03-11 | A | V28 | `src/core/RuntimeConfig.js`, `src/core/SettingsManager.js`, `src/core/config/SettingsRuntimeContract.js`, `src/core/GameDebugApi.js` | V36 Runtime-Bridge-/Resume-Integration fuer produktiven Trainerbetrieb | mittel |
| 2026-03-11 | A | V27 | `src/state/training/TrainingGateEvaluator.js`, `src/state/training/TrainingGateThresholds.js`, `src/state/training/TrainingOpsKpiContractV36.js` | V36 KPI-/Gate-Vertrag (Ops-Metriken, Trend-Gate, Play-Eval-Drift) | niedrig |
| 2026-03-11 | A | V26 | `src/entities/ai/ObservationBridgePolicy.js`, `src/entities/ai/training/WebSocketTrainerBridge.js` | V36 Match-Resume-vor-Action und erweiterte Bridge-Telemetrie/Fallback-Messung | mittel |
| 2026-03-11 | A | PX V34 | `trainer/session/TrainerSession.mjs`, `trainer/server/TrainerServer.mjs`, `trainer/config/TrainerRuntimeContract.mjs`, `trainer/model/CheckpointValidation.mjs` | V36 Checkpoint-Resume-Haertung (`trainer-checkpoint-load-latest`) und Validierung | mittel |
| 2026-03-13 | Codex | V27/V28 | `src/ui/menu/EventPlaylistCatalog.js`, `src/ui/menu/MenuStateContracts.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/menu/MenuTextCatalog.js`, `src/ui/MenuController.js`, `src/core/GameBootstrap.js`, `src/core/GameRuntimeFacade.js` | V26.6 benoetigt einen additiven Event-Playlist-Quickstart ueber bestehende Menue-/Runtime-Pfade hinweg | mittel |

## Schnellindex Offener Arbeit

- `V26 Gameplay & Features`: `V4`, `V5`, `V9`, `V11`, `V16`
- `V27 Profile, Statistiken & UI`: `V7`, `V8`, `V15`
- `V28 Architektur & Performance`: `V13`, Player-/Bot-God-Class-Refactoring
- `Nachlauf / Technik`: `N1` Multiplayer-Runtime, `N2` Recording-UI, `T1` Testersatz, `T2` Bundle-Groesse

## Prioritaeten (stabil, nur bei Bedarf anpassen)

**Wichtig:**

- V26-Restumfang abschliessen (`V4`, `V5`, `V9`, `V11`, `V16`).
- `maze`-Hotspot fuer V13 gezielt vorbereiten.

**Mittel:**

- V27 Profile, Statistiken und Balancing-Telemetrie.
- V28 God-Class-Abbau und Core-Performance.

**Querschnitt / Nachlauf:**

- Multiplayer-Runtime statt Menu-Stub.
- Recording-UI / manueller Trigger fuer V29.
- Dummy-Tests schrittweise durch echte Integritaetstests ersetzen.
- Bundle-Groesse ueber Code-Splitting weiter optimieren.

## Aktive Workstreams

### Block V26: Gameplay & Features
<!-- LOCK: Codex seit 2026-03-14 -->
<!-- DEPENDS-ON: keine -->

- Scope: `V4`, `V5`, `V9`, `V11`, `V16`
- Hauptpfade: `src/hunt/**`, `src/entities/**`, `src/core/**`, `src/ui/**`
- Konfliktregel: keine neuen fremden Plaene mitten in diesen Block einfuegen; neue Arbeit nur im `Plan-Eingang` ankuendigen

- [x] 26.0 Baseline-Freeze und Gameplay-Metriken erfassen
  - Status 2026-03-08: Baseline ueber `npm run benchmark:baseline` neu eingefroren (`overall fpsAverage=60.00`, `overall drawCallsAverage=25.49`, `botWinRate=82.4%`, `stuckEvents=0`; Artefakte: `data/performance_ki_baseline_report.json`, `docs/Testergebnisse_2026-03-08.md`).
- [x] 26.1 V4 Treffer-/Schadensfeedback (Audio & VFX)
  - Abgeschlossen am: `2026-03-08`
  - [x] 26.1.1 Audio-Signale fuer MG, Raketen und Schild implementieren
  - [x] 26.1.2 VFX-Signale (Partikel/Flashes) bei Treffern ausbauen
  - Status 2026-03-08: Differenzierte Hunt-Feedback-Cues fuer MG, Raketen und Schild aktiv; neue MG-/Trail-/Rocket-/Shield-Partikelprofile sowie Regressionen `T88`/`T89` verifiziert.
- [x] 26.2 V5 Hunt-Mode Feintuning
  - Abgeschlossen am: `2026-03-13`
  - [x] 26.2.1 TTK und Overheat-Werte basierend auf Testdaten anpassen
  - [x] 26.2.2 Respawn- und Pickup-Logik verfeinern
  - Status 2026-03-13: Messlauf vor dem Fix zeigte MG-TTK ~`1.09s` ohne Lockout-vor-Kill, Raketen-Uebersampling (`111/200` Spawns) sowie Respawn mit uebernommenem Inventar. Hunt-Balance jetzt ueber MG-Tuning (`damage=7.75`, `overheat=9`, `lockoutThreshold=96`, `lockoutSeconds=0.75`), bereinigten Weighted Pickup-Pool ohne `SLOW_DOWN`/`INVERT`, reduzierte Rocket-Chance (`0.28`) und Respawn-Recovery (`ROCKET_WEAK`, `shieldHP=18`, Combat-State-Reset) gehaertet; Regressionen `T89a` bis `T89c` sowie `test:physics`, `test:core`, `build`, `docs:sync`, `docs:check` gruen.
- [x] 26.4 V9 Replay/Ghost-System fuer die letzte Runde aufbauen
  - Abgeschlossen am: `2026-03-13`
  - [x] 26.4.1 Recorder-Snapshots fuer letzte Runde als Ghost-Clip aufbereiten
  - [x] 26.4.2 Ghost-Playback im Round-/Match-End verdrahten und Reset-Pfade absichern
  - Status 2026-03-13: `RoundSnapshotStore` speichert jetzt Position + Quaternion in chronologischer Clip-Form; `RoundRecorder` erfasst Replay-Snapshots standardmaessig auch ohne Debug-Flag und normalisiert extrem kleine Timestamp-Deltas fuer deterministische Captures. `EntityManager` rendert ein leichtes Ghost-Playback waehrend `ROUND_END`/`MATCH_END`, `MatchFlowUiController` raeumt es bei `startRound()`/`returnToMenu()` wieder auf; Regression `T20ba`, `smoke:roundstate`, `test:core`, `test:physics`, `build`, `docs:sync`, `docs:check` sowie Browser-Artefakte `tmp/develop-web-game-v26-4/last-round-ghost-canvas.png` und `tmp/develop-web-game-v26-4/last-round-ghost-state.json` gruen.
- [x] 26.5 V11 GLB-Map Loader Integration (konsolidiert aus altem Detailplan)
  - Abgeschlossen am: `2026-03-13`
  - [x] 26.5.1 `GLTFLoader`/`GLBMapLoader` einfuehren
  - [x] 26.5.2 `glbModel` in Map-Definitionen und Schema aufnehmen
  - [x] 26.5.3 `Arena.build()` asynchron machen und Fallback-Pfad absichern
  - [x] 26.5.4 Beispiel-GLB oder reproduzierbares Test-Asset bereitstellen
  - [x] 26.5.5 UI-Integration fuer Map-Auswahl und Ladezustand nachziehen
  - [x] 26.5.6 GLB-Loader-Test, Fallback-Test und manuelle Verifikation abschliessen
  - Status 2026-03-13: Neuer `GLBMapLoader` laedt GLB/GLTF-Szenen via `GLTFLoader`, extrahiert Collider aus Mesh-Namen (`_nocol`, `_foam`) und verdrahtet einen reproduzierbaren `glb_hangar`-Preset mit eingebettetem Test-Asset. `Arena.build()` unterstuetzt jetzt einen hybriden Startpfad: GLB-Maps laden asynchron mit Box-Fallback + Warn-Telemetrie, bestehende Non-GLB-Matches bleiben fuer alte Runtime-/Physics-Pfade synchron; der Prewarm-/Match-Start ist gegen gleichzeitige Builds serialisiert. Map-Schema, Runtime-Migration und Preview-UI tragen `glbModel`, die Map-Auswahl zeigt GLB-Badges, `MatchFlowUiController` blendet fuer GLB-Matches ein Ladeoverlay ein und zeigt Fallback-Warnungen nach dem Start als Toast. Regressionen `T14b`, `T14c`, `T20ba`, `test:core`, `test:physics`, `test:stress`, `smoke:roundstate`, `build`, `docs:sync`, `docs:check` sind gruen; visuelle/State-Artefakte liegen unter `tmp/develop-web-game-v26-5/glb-preview-card.png`, `tmp/develop-web-game-v26-5/glb-hangar-state.json`, `tmp/develop-web-game-v26-5/glb-fallback-state.json`, `tmp/develop-web-game-v26-5/console.json`.
- [x] 26.6 V16 Event-Playlist / Fun-Modes Mechanik testen
  - Abgeschlossen am: `2026-03-13`
  - [x] 26.6.1 Playlist-Katalog auf bestehende Fun-/Fixed-Presets aufsetzen und Zustand persistieren
  - [x] 26.6.2 Quickstart-/Menuepfad fuer Event-Playlist verdrahten und per Core-/Stress-Test absichern
  - Status 2026-03-13: Neuer `EventPlaylistCatalog` setzt additiv auf den vorhandenen Fixed-Presets `arcade`, `chaos` und `competitive` auf und persistiert den Rotationszustand in `settings.localSettings.eventPlaylistState` (`activePlaylistId`, `nextIndex`, `lastPresetId`). Level 2 erhaelt mit `btn-quick-event-playlist` einen direkten Event-Quickstart; `MenuController`, `MenuGameplayBindings`, `GameBootstrap` und `GameRuntimeFacade` verdrahten den neuen Event-Typ, wenden das naechste Preset deterministisch an, speichern den Cursor nach erfolgreichem Start sofort in `cuviosclash.settings.v1`, emitten Quickstart-Telemetrie (`variant=event_playlist`) und zeigen einen Fortschritts-Toast `Event-Playlist: <Preset> (n/3)`. Regressionen `T20bb`, `T20bc` und `T77b` sowie Vollsuiten `test:core` und `test:stress` sind gruen; visuelle Artefakte liegen unter `tmp/develop-web-game-v26-6/event-playlist-level2.png` und `tmp/develop-web-game-v26-6/event-playlist-state.json`.
- [x] 26.8 Abschluss-Gate, Playtest und Doku-Freeze (`docs:sync`, `docs:check`)
  - Abgeschlossen am: `2026-03-13`
  - [x] 26.8.1 Vollverifikation fuer V26-Restumfang (`test:core`, `test:stress`, `build`) abschliessen
  - [x] 26.8.2 Browser-Spotcheck, Doku-Sync und Doku-Check einfrieren
  - Status 2026-03-13: Abschluss-Gate fuer V26 ist geschlossen. `npm run docs:sync` und `npm run docs:check` liefen ohne Aktualisierungsbedarf (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`), `npm run build` ist gruen und der Browser-Spotcheck bestaetigt den neuen Event-Playlist-Button sichtbar in Ebene 2. Vollverifikation: `TEST_PORT=5303 PW_RUN_TAG=v26-6-core-r2 PW_OUTPUT_DIR=test-results/v26-6-core-r2 PW_WORKERS=1 npm run test:core` PASS (`79 passed`, `1 skipped`) und `TEST_PORT=5304 PW_RUN_TAG=v26-6-stress PW_OUTPUT_DIR=test-results/v26-6-stress PW_WORKERS=1 npm run test:stress` PASS (`20 passed`); ein frueher `test:core`-Lauf scheiterte einmalig in `T14b` auf dem bestehenden GLB-Pfad, isolierter Re-Run und Voll-Rerun waren anschliessend gruen.

### Block V27: Profile, Statistiken & UI
<!-- LOCK: frei -->
<!-- DEPENDS-ON: keine -->

- Scope: `V7`, `V8`, `V15`
- Hauptpfade: `src/ui/**`, `src/state/**`, `scripts/**`, `data/**`
- Konfliktregel: Statistik-/Profil-Details nur in diesem Block pflegen

- [x] 27.0 Baseline-Freeze und UI-Markup-Analyse
  - Abgeschlossen am: `2026-03-08`
  - Status 2026-03-08:
    - Baseline-Analyse fuer V27 in `docs/Feature_Profile_Statistiken_UI_V27.md` festgeschrieben.
    - Contract-Freeze gesetzt fuer bestehende Profil-IDs (`#profile-name`, `#btn-profile-save`, `#profile-select`, `#btn-profile-load`, `#btn-profile-delete`) und Round-End-Overlay (`#message-overlay`, `#message-text`, `#message-sub`).
    - Iststand bestaetigt: Round/Match-Metriken sind in `RoundRecorder`/`RoundMetricsStore` verfuegbar, aber UI-seitig noch nicht als vertiefte Post-Match-Ansicht verdrahtet.
- [x] 27.1 V7 Profile-UX Ausbau
  - Abgeschlossen am: `2026-03-08`
  - Status 2026-03-08:
    - Profil-UX additiv um Duplizieren, JSON-Import/Export (`profile-export.v1`) und Standardprofil-Markierung erweitert.
    - Profil-Aktionszustand reagiert jetzt korrekt auf Eingabe-/Select-Wechsel; der offene Befund `Profil speichern bleibt deaktiviert` ist damit geschlossen.
    - Visuelle und technische Verifikation erfolgt ueber `tests/core.spec.js` (`T20ka`), `test:core`, `test:stress`, `build` sowie Browser-Screenshots.
  - [x] 27.1.1 Duplizieren und Import/Export-Funktion
  - [x] 27.1.2 Standardprofil-Markierung ergaenzen
- [x] 27.2 V8 Post-Match-Statistiken
  - Abgeschlossen am: `2026-03-13`
  - Status 2026-03-13:
    - `RoundRecorder`-Metriken werden ueber `PostMatchStatsAggregator` in einen additiven UI-Vertrag `post-match-stats.v1` ueberfuehrt und im bestehenden Round-/Match-End-Overlay als drei Karten (`Diese Runde`, `Match bisher`, `Zwischenstand`) unter `#message-stats` gerendert.
    - `RoundEndCoordinator`, `MatchUiStateOps` und `MatchFlowUiController` verdrahten die Stats ohne Contract-Bruch; Countdown-Ticks behalten die Karten sichtbar und Match-Ende schaltet Titel/Scoreboard deterministisch auf Finalzustand um.
    - Beim Vollgate gefundene GLB-Start-Race beseitigt: `applySettingsToRuntime({ schedulePrewarm: false })` unterdrueckt waehrend `startMatch()` ein konkurrierendes Prewarm-Reschedule, damit `T14b` den `matchRoot` stabil behaelt.
    - Regressionen `T20kc` und `T20kd`, `smoke:roundstate`, `test:core`, `test:stress` sowie `build` sind gruen; visueller Spotcheck liegt unter `tmp/develop-web-game-v27-2/post-match-overlay-element.png` und `tmp/develop-web-game-v27-2/post-match-overlay-state.json`.
  - [x] 27.2.1 Datenaggregator fuer Round/Match-Stats ausbauen
  - [x] 27.2.2 UI-Overlay fuer vertiefte Statistiken am Rundenende
- [x] 27.3 V15 Telemetrie-Dashboard fuer iteratives Balancing
  - Abgeschlossen am: `2026-03-13`
  - Status 2026-03-13:
    - `MenuTelemetryStore` persistiert jetzt neben Menue-Events auch Round-/Match-Balancingdaten (`balanceSummary`, `recentRounds`) inklusive Aggregationen je Map und Modus.
    - `MatchFlowUiController` emitttiert normierte Round-End-/Match-End-Payloads in die bestehende Telemetrie-Pipeline; `SettingsManager` leitet daraus lesbare Snapshot-Bloecke `balance`, `topMaps`, `topModes` und `recentRounds` fuer das Developer-Menue ab.
    - Das Developer-Menue rendert ueber `#developer-telemetry-dashboard` nun ein echtes Dashboard mit Karten fuer Uebersicht, Balancing, Top Maps, Top Modi und Letzte Runden; das bisherige Roh-JSON in `#developer-telemetry-output` bleibt erhalten.
    - Neue Core-Regression `T20ke` sowie bestehender Telemetriepfad `T20t` sind gruen; visueller Spotcheck liegt unter `tmp/develop-web-game-v27-3/telemetry-dashboard.png` und `tmp/develop-web-game-v27-3/telemetry-dashboard-state.json`.
- [x] 27.4 Abschluss-Gate, UI-Verifikation und Doku-Freeze (`docs:sync`, `docs:check`)
  - Abgeschlossen am: `2026-03-13`
  - Status 2026-03-13:
    - V27 ist als Block geschlossen: `27.1`, `27.2` und `27.3` sind voll verifiziert.
    - Vollverifikation: `npm run smoke:roundstate` PASS, `TEST_PORT=5332 PW_RUN_TAG=v27-3-core-r2 PW_OUTPUT_DIR=test-results/v27-3-core-r2 PW_WORKERS=1 npm run test:core` PASS (`82 passed`, `1 skipped`) und `TEST_PORT=5333 PW_RUN_TAG=v27-3-stress PW_OUTPUT_DIR=test-results/v27-3-stress PW_WORKERS=1 npm run test:stress` PASS (`20 passed`).
    - UI-Spotchecks bestaetigen sowohl das neue Round-End-Stats-Overlay (`tmp/develop-web-game-v27-2/post-match-overlay-element.png`) als auch das Telemetrie-Dashboard (`tmp/develop-web-game-v27-3/telemetry-dashboard.png`).
    - Abschluss-Gates gruen: `npm run build` PASS sowie `npm run docs:sync`/`npm run docs:check` jeweils mit `updated=0`, `missing=0`, `legacy=0`, `mojibake=0`.

### Block V28: Architektur & Performance
<!-- LOCK: frei -->
<!-- DEPENDS-ON: keine -->

- Scope: `V13`, Player-/Bot-God-Class-Refactoring
- Hauptpfade: `src/entities/**`, `src/core/**`
- Konfliktregel: `maze`-Optimierung und Klassen-Splits bleiben in diesem Block gebuendelt

- [x] 28.0 Baseline-Freeze und Regression-Setup (abgeschlossen 2026-03-08)
- [x] 28.1 Player "God Class" Refactoring
  - [x] 28.1.1 Three.js Rendering in `PlayerView` auslagern
  - [x] 28.1.2 Input-Handling in `PlayerController` isolieren
  - Abgeschlossen am: `2026-03-08`
  - Status 2026-03-08: `Player` instanziiert den Rendering-Pfad ueber `createPlayerView`/`PlayerView`, Eingabeaufloesung bleibt in `PlayerController`; V28-Regression `T28a` bestaetigt getrennte Verantwortungen.
- [x] 28.2 Bot "God Class" Refactoring
  - [x] 28.2.1 Rendering in `BotView` kapseln
  - [x] 28.2.2 Sensing/Probing-Logik fuer kuenftiges ML-Training abstrahieren
  - Abgeschlossen am: `2026-03-08`
  - Status 2026-03-08: Bots erhalten eine explizite `BotView`-Seam ueber die gemeinsame View-Fabrik; Sensorik und probe-/ML-nahe Runtime bleiben ueber `BotSensorsFacade`, `BotRuntimeContextFactory` und Observation-Reuse entkoppelt. V28-Regressionen `T28b` und `T28b2` gruen.
- [x] 28.3 V13 Performance-Hotspot `maze` (Draw-Calls / Batching optimieren)
  - Abgeschlossen am: `2026-03-13`
  - [x] 28.3.1 `T28c` fuer den `maze`-Pfad wieder unter die aktuelle Huelle ziehen
  - [x] 28.3.2 `maze`-Metriken im aktuellen Regression-/Baseline-Harness bestaetigen
  - Status 2026-03-13: `TEST_PORT=5340 PW_RUN_TAG=plan-v28 PW_OUTPUT_DIR=test-results/plan-v28 PW_WORKERS=1 npm run test:v28:regression -- --workers=1` bestaetigt den eigentlichen Hotspot `T28c` wieder gruen; im selben Lauf blieb nur `T28a` einmalig am 30s-Testtimeout haengen, ohne den `maze`-Pfad zu beruehren. Der aktualisierte Baseline-Report (`BOT_BASELINE_PORT=4275 npm run benchmark:baseline`) misst fuer `V2 (maze)` `fpsAverage=55.17`, `drawCallsAverage=20.00`, `drawCallsMax=20`.
- [x] 28.4 Abschluss-Gate, Performance-Metrics pruefen und Doku-Freeze (`docs:sync`, `docs:check`)
  - [x] 28.4.1 Repo-Gates (`docs:sync`, `docs:check`, `build`) auf aktuellem Stand bestaetigen
  - [x] 28.4.2 Vollbenchmark wieder auf das historische 28.5-Performance-Niveau ziehen
  - Status 2026-03-13: Das verbleibende V28-Delta war kein neuer `maze`-Draw-Call-Regressionspfad, sondern ein Jitter-/Render-Stall im Vollbenchmark. `scripts/perf-jitter-matrix.mjs` trennt die interaktive Messung jetzt sauber von Recording-Gap-Probes; zusaetzlich vermeiden idempotente Quality-/Shadow-Setter in `src/core/renderer/RenderQualityController.js` unnoetige Material-Recompiles im Benchmark-Setup. Finales Gate: `PERF_RUCKLER_PORT=5353 npm run benchmark:jitter` PASS (`tmp/perf_jitter_matrix_1773422511548.json`, `worstInteractiveP95=16.10ms`, `interactiveAggregateP99=17.10ms`, `worstRecordingGapMs=55.556ms`, `benchmarkPass=true`), dazu `npm run test:core` PASS (`82 passed`, `1 skipped`), `npm run test:gpu` PASS (`17 passed`), `npm run test:physics` PASS (`57 passed`) und `npm run build` PASS.
- [x] 28.5 Performance-Offensive Maximalpfad (CPU/GPU/Startup ohne Feature-Verlust)
  - [x] 28.5.0 Baseline-Refresh und Feature-Parity-Harness
  - [x] 28.5.1 Render-Resource-Cache und Portal-/Gate-Instancing
  - [x] 28.5.2 Non-Recording-Renderer entschlacken
  - [x] 28.5.3 Match-Session-Reuse und Start-/Transition-Latenz
  - [x] 28.5.4 Bot-/Trail-/Projectile-CPU-Hotpaths und Allocation-Budget
  - [x] 28.5.5 Structural Scaling Path (Worker/SoA, nur bei offenem Delta)
  - [x] 28.5.6 Menu/UI-Bootstrap und DOM-Last reduzieren
  - [x] 28.5.7 Vollbenchmark und Feature-Parity-Gate
  - [x] 28.5.8 Abschluss-Gate und Doku-Freeze (`docs:sync`, `docs:check`)
  - Status 2026-03-07: 28.5.0 abgeschlossen (Baseline + Lifecycle-Harness mit Trend/Vollprofil unter `tmp/perf_phase28_5_lifecycle_*.json`).
  - Status 2026-03-07: 28.5.1 abgeschlossen (echtes Portal-/Gate-Instancing via shared `InstancedMesh`-Batches + no-dispose Resource-Caches; `benchmark:baseline` danach bei `overall drawCallsAverage=20.99`, `V3 drawCallsAverage=23.73`, `V2 drawCallsMax=24`; Core/GPU gruen).
  - Status 2026-03-07 (Follow-up): Portalfarben im Instancing-Pfad wiederhergestellt; Portale/Gates nutzen weiter Instancing, aber farbgetrennte Material-Batches fuer leuchtende Portalringe statt weiss-grauer Shared-Materialien (`build` gruen, GPU `T21b` gruen, portalnahe Core-Regressionen gruen; einmalige Playwright-Navigationsfluktuation bei Sammellauf von `T10b|T10c|T10d|T10e`, `T10d` solo gruen).
  - Status 2026-03-07: 28.5.2 abgeschlossen (Non-Recording-Rendererpfad, Recorder-Defaults auf expliziten Start umgestellt, Core/GPU gruen).
  - Status 2026-03-07: 28.5.3 abgeschlossen (Menu-Prewarm fuer Match-Arena aktiv; Lifecycle-Vollprofil bei `startMatchLatencyMs=202`, `returnToMenuLatencyMs=23`).
  - Status 2026-03-07: 28.5.4 abgeschlossen (Bot-Multirate + Trail-Query-Stamp-Reuse + Bot/Observation-Context-Reuse + Projectile swap-pop; `test:core`, `test:physics`, `test:stress` gruen).
  - Status 2026-03-07: 28.5.5 abgeschlossen (Gate-C bewertet; Worker/SoA bewusst nicht aktiviert, da Delta aktuell GPU-seitig. Volles Verifikationspaket `benchmark:baseline` + `test:core/physics/stress` gruen).
  - Status 2026-03-07: 28.5.6 abgeschlossen (Lazy-UI-Bootstrap fuer Level4/Developer/Preset-Pfade; Lifecycle-Vollprofil `domToGameInstanceMs=1943`, `startMatchLatencyMs=65`, `returnToMenuLatencyMs=42`; Core/Stress gruen).
  - Status 2026-03-07: 28.5.7 abgeschlossen (Vollgate mit `benchmark:baseline`, `benchmark:lifecycle -- --profile trend|full` und `test:core/physics/gpu/stress` komplett gruen; Pflichtmetriken erreicht: `overall drawCallsAverage=20.99`, `V3 drawCallsAverage=23.73`, `V2 drawCallsMax=24`, `startMatchLatencyMs=179`, `returnToMenuLatencyMs=26`).
  - Status 2026-03-07: 28.5.8 abgeschlossen (Doku-Freeze gesetzt; `docs:sync`/`docs:check` nach finalem Performance-End-Gate gruen, keine offenen Pflichtdeltas mehr).

## Nachlauf / Technik-Backlog

- [ ] N1 Multiplayer-Runtime statt UI-Stub
  - Ziel: Host/Join/Ready-Stubs in echte Netzwerksession und Runtime-Wiring ueberfuehren.
  - Zielpfade: `src/ui/menu/MenuMultiplayerBridge.js`, `src/core/main.js`, kuenftige Netzwerkmodule.
- [ ] N2 Recording-UI / manueller Trigger fuer V29
  - Ziel: optionalen UI-Toggle bzw. manuellen Recording-Trigger produktiv anbinden.
  - Zielpfade: `index.html`, `src/ui/KeybindEditorController.js`, `src/ui/menu/MenuControlBindings.js`, `src/core/MediaRecorderSystem.js`.
  - Status 2026-03-07: statischer Launcherpfad wieder kompatibel; Bare-Import `mp4-muxer` wird im Browserpfad ueber die Importmap aufgeloest und `server.ps1` liefert `.mjs` korrekt aus.
  - Status 2026-03-07: Cinematic-Kamera funktioniert wieder konsistent in `THIRD_PERSON`, auch wenn `cockpitCamera` aktiv ist (GPU-Regressionstest `T33b`).
- [x] N3 T82 Policy-Wiring isolieren und spaeter separat beheben (Punkt 5 geparkt)
  - Ziel: Divergenz in `tests/physics-policy.spec.js` (`T82`) isolieren und minimal fixen.
  - Status 2026-03-11: ueber V31-Resolver/Registry/Session-Wiring geschlossen; `T81` und `T82` laufen mit vier Match-Bot-Typen stabil gruen.
  - Verifikation: `npx playwright test tests/physics-policy.spec.js -g "T81:|T82:" --workers=1`.
- [ ] T1 Dummy-Tests schrittweise durch echte Integritaetstests ersetzen
  - Ziel: bestehende Platzhaltertests entlang des geaenderten Codes ersetzen.
  - Status 2026-03-07: Playwright-Menuecheck erfolgreich (`npm run test:core` = 48 passed / 1 skipped, `npm run test:stress` = 19 passed).
  - Offene Befunde 2026-03-07: `Profil speichern` bleibt nach Eingabe deaktiviert; `Build-Info kopieren` hat kein Runtime-Binding.
- [ ] T2 Bundle-Groesse weiter optimieren
  - Ziel: Code-Splitting und Ladepfade nur dann vertiefen, wenn der Nutzen messbar bleibt.
- [ ] N4 Object-Pooling fuer Partikel & Projektile
  - Ziel: Garbage Collection (GC) Spikes reduzieren durch Ringpuffer-Wiederverwendung von Partikeln und Geschossen (MG, Raketen, Schilde).
  - Zielpfade: `src/entities/**`, Render-Effekte.
- [ ] N5 Delta-Kompression fuer Replay-System
  - Ziel: Speicherbedarf des `RoundSnapshotStore` signifikant senken, Basis fuer laengere Matches.
  - Zielpfade: `src/core/RoundSnapshotStore.js`, `src/core/RoundRecorder.js`.
- [ ] N6 Determinismus & Rollback-Vorstufen (State-Snapshots)
  - Ziel: Trennung von Render/Sim-Alpha nutzen, um voll-reproduzierbare Frame-Snapshots fuer kuenftigen Multiplayer (GGPO-Style) bereitzustellen.
  - Zielpfade: `src/core/GameLoop.js`, `src/core/PlayingStateSystem.js`.
- [ ] N7 Persistente Telemetrie-Historie (IndexedDB)
  - Ziel: Balancing-Daten im Telemetrie-Dashboard ueber Browser-Sessions hinweg vergleichen.
  - Zielpfade: `src/state/MenuTelemetryStore.js`, lokaler Storage-Adapter.
- [ ] N8 Bot-Dynamikprofile als UI-Gegnerklassen
  - Ziel: Die in V35 abstrahierten `controlProfileId`s als waehlbare "Gegner-Typen" (aggressiv, wendig, traeg) ins UI heben.
  - Zielpfade: `src/ui/menu/**`, `src/state/**`.

## Plan-Eingang (append-only)

Regeln:

- Neue Plaene eines zweiten Agenten nur hier am Ende anhaengen.
- Bestehende Bloecke dafuer nicht umsortieren.
- Pro neuem Plan genau einen Eintrag anlegen; die spaetere Einsortierung passiert separat.

Template:

- [ ] PX Kurztitel
  - Erstellt am: `YYYY-MM-DD`
  - Agent: `A`, `B` oder `C`
  - Plan-Datei: `docs/Feature_Name.md`
  - Datei-Scope: `src/...`, `tests/...`
  - Konfliktregel: kurzer Hinweis zu Datei-Overlap oder bewusstem Non-Overlap

<!-- PLAN-INTAKE-START -->
- [ ] PX Menu UX Follow-up V26.3c
  - Erstellt am: `2026-03-06`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Menu_UX_Followup_V26_3c.md`
  - Datei-Scope: `index.html`, `style.css`, `src/ui/**`, `tests/**`
  - Konfliktregel: nur append-only Intake-Eintrag; keine Umsortierung bestehender Masterplan-Bloecke waehrend paralleler Restrukturierung
- [ ] PX Performance-Offensive V28.5
  - Erstellt am: `2026-03-07`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Performance_Offensive_V28_5.md`
  - Datei-Scope: `src/core/**`, `src/entities/**`, `src/hunt/**`, `src/ui/**`, `scripts/**`, `tests/**`
  - Konfliktregel: Performance-Hotpaths nur innerhalb V28.5-Phasen aendern; keine Umsortierung bestehender Bloecke
- [ ] PX Cinematic Camera Follow-up V29b
  - Erstellt am: `2026-03-07`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Cinematic_Camera_Followup_V29b.md`
  - Datei-Scope: `src/core/**`, `src/entities/systems/CinematicCameraSystem.js`, `src/ui/**`, `tests/gpu.spec.js`, `tests/core.spec.js`, `tests/physics-policy.spec.js`, `docs/**`
  - Konfliktregel: beinhaltet Vorschlaege 1/2/3/4/6; Vorschlag 5 bleibt separat als `N3` geparkt
- [ ] PX Runtime-Stabilisierung & Wartbarkeit V30
  - Erstellt am: `2026-03-07`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Runtime_Stabilisierung_Wartbarkeit_V30.md`
  - Datei-Scope: `src/core/**`, `src/entities/**`, `src/ui/**`, `src/state/**`, `tests/**`, `docs/**`
  - Konfliktregel: Korrektheits- und Lifecycle-Fixes zuerst; groessere UI-/Runtime-Splits erst nach gruenen Zwischen-Gates der frueheren Phasen
- [ ] PX Parallelbetrieb 3-Bot Kickoff V26 (Bot A)
  - Erstellt am: `2026-03-08`
  - Agent: `A`
  - Plan-Datei: `docs/Umsetzungsplan.md` (Block `V26`)
  - Datei-Scope: `src/hunt/**`, `src/entities/**`, `src/core/**`, `src/ui/**`, `tests/**`, `docs/**`
  - Konfliktregel: nur V26-Phasen (`26.0` bis `26.8`) bearbeiten; keine Aenderungen in V27/V28 ausser zwingende Shared-Fixes mit kurzer Notiz im Bearbeitungsprotokoll
- [ ] PX Parallelbetrieb 3-Bot Kickoff V27 (Bot B)
  - Erstellt am: `2026-03-08`
  - Agent: `B`
  - Plan-Datei: `docs/Umsetzungsplan.md` (Block `V27`)
  - Datei-Scope: `src/ui/**`, `src/state/**`, `scripts/**`, `data/**`, `tests/**`, `docs/**`
  - Konfliktregel: nur V27-Phasen (`27.0` bis `27.4`) bearbeiten; keine Aenderungen in V26/V28 ausser zwingende Shared-Fixes mit kurzer Notiz im Bearbeitungsprotokoll
- [ ] PX Parallelbetrieb 3-Bot Kickoff V28/Nachlauf (Bot C)
  - Erstellt am: `2026-03-08`
  - Agent: `C`
  - Plan-Datei: `docs/Umsetzungsplan.md` (Block `V28` + `Nachlauf / Technik-Backlog`)
  - Datei-Scope: `src/core/**`, `src/entities/**`, `src/state/**`, `src/ui/menu/**`, `tests/**`, `docs/**`
  - Konfliktregel: zuerst V28 (`28.0` bis `28.4`), danach Nachlauf (`N1` bis `T2`); keine Eingriffe in V26/V27 ausser zwingende Shared-Fixes mit kurzer Notiz im Bearbeitungsprotokoll
- [ ] PX Test Performance Optimization V2
  - Erstellt am: `2026-03-09`
  - Agent: `A` (aktuell)
  - Plan-Datei: `docs/Feature_TestPerformance_V2.md`
  - Datei-Scope: `tests/**`
  - Konfliktregel: Nur Test-Code wird umgebaut, Engine-Code bleibt unberuehrt. Parallelisierbar.
- [x] PX Bot-Modus-Spezialbots V31
  - Erstellt am: `2026-03-10`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Bot_Modus_Spezialbots_V31.md`
  - Datei-Scope: `src/core/RuntimeConfig.js`, `src/entities/ai/**`, `src/entities/runtime/EntitySetupOps.js`, `src/state/MatchSessionFactory.js`, `src/state/validation/**`, `tests/physics-policy.spec.js`, `docs/**`
  - Konfliktregel: Pro Match bleibt genau ein Bot-Typ aktiv; Resolver- und Registry-Aenderungen gebuendelt in diesem Plan halten
  - Status 2026-03-11: umgesetzt und verifiziert (Resolver + Session-Wiring + Validation-Matrix fuer `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`).
  - Verifikation: `npx playwright test tests/physics-policy.spec.js -g "T73:|T74:|T79:|T81:|T82:" --workers=1`.
- [x] PX Bot-Trainingsumgebung V32
  - Erstellt am: `2026-03-10`
  - Agent: `B`
  - Plan-Datei: `docs/Feature_Bot_Trainingsumgebung_V32.md`
  - Datei-Scope: `src/entities/ai/training/**`, `src/state/training/**`, `scripts/**`, neue trainingsbezogene Tests, `docs/**`
  - Konfliktregel: Keine Eingriffe in V31-Kerndateien (`RuntimeConfig`, `BotPolicyTypes`, `BotPolicyRegistry`, `EntitySetupOps`, `MatchSessionFactory`); additive Trainingslane
  - Status 2026-03-11: Trainingsumgebung additiv abgeschlossen; Trainings-Smokes und `T90-T93` gruen.
  - Verifikation: `npx playwright test tests/training-environment.spec.js --workers=1`, `node scripts/training-smoke.mjs`, `node scripts/training-eval-smoke.mjs`.
- [x] PX Bot-Training-Automatisierung V33 (Bot A)
  - Erstellt am: `2026-03-11`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Bot_Training_Automatisierung_V33.md`
  - Datei-Scope: `src/entities/ai/training/**` (Automation-Core), `scripts/training-run.mjs`, optionale Orchestrierungsanteile fuer `training:e2e`, `tests/**`, `docs/**`
  - Konfliktregel: Kein Eingriff in UI-Lane (`index.html`, `src/ui/menu/**`) und keine Gate-/Eval-Skripte von Bot B; Cross-Lane-Aenderungen im Conflict-Log dokumentieren
  - Status 2026-03-13: A-Lane inklusive gemeinsamem `33.9`-Gate abgeschlossen; `npm run training:e2e`, `npx playwright test tests/training-environment.spec.js --workers=1`, `npm run test:core`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.
- [x] PX Menu Entschlackung V27b
  - Erstellt am: `2026-03-11`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Menu_Entschlackung_V27b.md`
  - Datei-Scope: `index.html`, `style.css`, `src/ui/**`, `src/core/GameBootstrap.js`, `tests/**`, `docs/**`
  - Konfliktregel: Nur Menue-Informationsarchitektur und UI-Verdichtung anfassen; bestehende Developer-/Training-Vertraege aus V33 ueber stabile IDs/Event-Pfade schuetzen
  - Status 2026-03-11: Level 1/2 sichtbar entschlackt, Level 3 auf einen offenen Detailblock reduziert, Ebene 4 in `Profile & Presets` plus `Utilities` verdichtet; normaler Menuepfad enthaelt keine Developer-/Debug-Einstiege mehr.
  - Verifikation 2026-03-11: `npm run test:core` PASS, `npm run test:stress` PASS, `npx playwright test tests/training-environment.spec.js` PASS, Desktop-/Mobil-Screenshots `menu-v27-level1-desktop.png`, `menu-v27-level2-desktop.png`, `menu-v27-level2-mobile.png`.
- [x] PX Bot-Training-Automatisierung V33 (Bot B)
  - Erstellt am: `2026-03-11`
  - Agent: `B`
  - Plan-Datei: `docs/Feature_Bot_Training_Automatisierung_V33.md`
  - Datei-Scope: Bridge-/Gate-Lane unter `src/entities/ai/training/**`, `src/state/training/**`, `scripts/training-eval.mjs`, `scripts/training-gate.mjs`, `package.json`, `tests/**`, `docs/**`
  - Konfliktregel: Kein Eingriff in UI- und Dev-Panel-Dateien von Bot C; `package.json` nur in dieser Lane anfassen
  - Status 2026-03-11: Eval/Gate-Lane mit KPI-Gate, Exit-Code, Bridge-Retry/Timeout/Fallback-Telemetrie und `training:e2e`-Scriptverdrahtung abgeschlossen.
  - Verifikation: `npm run training:run`, `npm run training:eval`, `npm run training:gate`, `npm run training:e2e`, `npx playwright test tests/training-automation.spec.js --workers=1`, `npx playwright test tests/physics-policy.spec.js -g "T80:" --workers=1`, `npx playwright test tests/training-environment.spec.js -g "T93:" --workers=1`, `npm run docs:sync`, `npm run docs:check`, `npm run build`.
- [x] PX Bot-Training-Automatisierung V33 (Bot C)
  - Erstellt am: `2026-03-11`
  - Agent: `C`
  - Plan-Datei: `docs/Feature_Bot_Training_Automatisierung_V33.md`
  - Datei-Scope: `index.html`, `src/core/GameBootstrap.js`, `src/ui/menu/**`, `src/core/runtime/MenuRuntimeDeveloperTrainingService.js`, `src/core/GameRuntimeFacade.js`, `src/core/GameDebugApi.js`, `tests/**`, `docs/**`
  - Konfliktregel: Kein Eingriff in `scripts/training-eval.mjs`/`scripts/training-gate.mjs`/`package.json` (Bot B) und keine Core-Automationmodule von Bot A
  - Status 2026-03-13: 33.4/33.5 plus gemeinsames `33.9`-Gate sind abgeschlossen; `npx playwright test tests/training-environment.spec.js --workers=1`, `npm run training:e2e`, `npm run test:core`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.
- [x] PX Bot-Training DeepLearning Server V34
  - Erstellt am: `2026-03-11`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Bot_Training_DeepLearning_Server_V34.md`
  - Datei-Scope: `scripts/trainer-server.mjs`, neues `trainer/**`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `scripts/training-run.mjs`, `tests/**`, `docs/**`
  - Konfliktregel: Kein UI-Umbau (`index.html`, `src/ui/menu/**`), Bridge-/Training-Scope strikt halten und Shared-Pfade append-only pflegen
  - Status 2026-03-13: Detailplan V34 ist geschlossen; `node --test tests/trainer-v34-*.test.mjs`, `npm run training:e2e`, `npm run test:core`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.
- [x] PX Menu Expertenlogin und Textreduktion V27c
  - Erstellt am: `2026-03-11`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Menu_Expertenlogin_Textreduktion_V27c.md`
  - Datei-Scope: `index.html`, `style.css`, `src/ui/**`, `src/core/**`, `tests/**`, `docs/**`
  - Konfliktregel: Developer-/Training-IDs, Events und Owner-Policies aus V33 nicht brechen; Expertenlogin nur als additive Gate-Schicht einfuehren
  - Status 2026-03-11: Expertenlogin mit festem Passwort `1307` als lokales Session-Gate umgesetzt; Build-Info, Developer und Debug in den Expertenpfad verlagert; Logout und Reload sperren den Bereich erneut.
  - Verifikation 2026-03-11: `npm run test:core` PASS, `npm run test:stress` PASS, `npx playwright test tests/training-environment.spec.js` PASS, Experten-Screenshots `menu-v27-expert-unlocked-desktop.png`, `menu-v27-expert-mobile.png`.
- [x] PX Steuerungsfluss Input-Rampen + Render-Interpolation V35 (bot-robust)
  - Erstellt am: `2026-03-11`
  - Agent: `A+B` (optional Integrator fuer `35.9`)
  - Plan-Datei: `docs/Umsetzungsplan.md` (Intake-Block, Parallel-Lanes `35.1` bis `35.4`)
  - Datei-Scope Lane A: `src/entities/player/PlayerController.js`, `src/entities/player/PlayerMotionOps.js`, `src/entities/Player.js`, `tests/physics-core.spec.js`, `docs/**`
  - Datei-Scope Lane B: `src/core/GameLoop.js`, `src/core/main.js`, `src/core/PlayingStateSystem.js`, `src/entities/player/PlayerView.js`, `src/entities/EntityManager.js`, `src/entities/ai/BotRuntimeContextFactory.js`, `src/entities/ai/training/TrainerPayloadAdapter.js`, `src/entities/ai/training/TrainingContractV1.js`, `src/state/training/TrainingDomain.js`, `tests/core.spec.js`, `tests/gpu.spec.js`, `tests/training-environment.spec.js`, `docs/**`
  - Konfliktregel: Lane A und Lane B bearbeiten keine fremden Lane-Dateien; `docs/**` und `tests/**` nur append-only je eigener Sektion. Plan 1 darf fuer Bots erst aktiv werden, wenn `35.3` und `35.4` abgeschlossen sind.
  - <!-- LOCK: frei -->
  - [x] 35.1 Plan 1 - Input-Rampen (Lane A)
    - <!-- SUB-LOCK: Bot-A -->
    - [x] 35.1.1 Digitale Achsen (`pitch/yaw/roll`) im `PlayerController` auf geglaettete Zielwerte mit Attack-/Release-Raten umstellen
    - [x] 35.1.2 Steering-Lock, Invertierung und Planar-Mode mit den geglaetteten Achsen konsistent halten, Hotpath-Allocation vermeiden und Bot-Pfad zunaechst per Guard auf Legacy belassen
  - [x] 35.2 Plan 2 - Render-Interpolation (Lane B)
    - <!-- SUB-LOCK: frei -->
    - [x] 35.2.1 `GameLoop` um Render-Alpha (`accumulator/fixedStep`) erweitern und Renderpfad (`main`/`PlayingStateSystem`) auf Alpha-Weitergabe vorbereiten
    - [x] 35.2.2 Interpolierte Player-/Kamera-Transforms einbauen (inkl. Reset bei Teleport/Bounce/Spawn), ohne Simulations-Determinismus zu veraendern
  - [x] 35.3 Bot-Runtime-Kontext normalisieren (Lane B)
    - <!-- SUB-LOCK: Bot-B -->
    - [x] 35.3.1 Bot-Runtime-Kontext um normalisierte Dynamikparameter erweitern (`speed`, `turnSpeed`, Rampenparameter) und daraus stabile `controlProfileId` ableiten
    - [x] 35.3.2 Trainings-/Transport-Contracts (`TrainingContractV1`, `TrainerPayloadAdapter`, `TrainingDomain`) um `controlProfileId` erweitern, sodass Eval/Training profile-aware bleibt
  - [x] 35.4 Dynamik-invariante Actions und Rollout-Sicherheit (Lane B)
    - <!-- SUB-LOCK: Bot-B -->
    - [x] 35.4.1 Optionalen Action-Adapter fuer dynamik-invariante Steuerung einfuehren (z. B. gewuenschte Winkelrate -> diskrete Flags), standardmaessig feature-flag-gesteuert
    - [x] 35.4.2 Gate-Regel festziehen: Bot-Rampen nur aktiv bei passendem `controlProfileId` (oder Multi-Profile-Training), sonst Legacy-Pfad beibehalten
  - [x] 35.9 Abschluss-Gate
    - [x] 35.9.1 Verifikation je Lane: `npm run test:physics` (Lane A) sowie `npm run test:core` + `npx playwright test tests/training-environment.spec.js` + `npm run training:e2e` (Lane B)
    - [x] 35.9.2 Vergleichbarkeit absichern: Bot-Validation vor/nach Profilwechsel dokumentieren (`npm run bot:validate`) und nur ohne KPI-Regression freigeben
    - [x] 35.9.3 Dokumentationsabschluss: `npm run docs:sync`, `npm run docs:check`, danach Lock-Rueckgabe auf `<!-- LOCK: frei -->` bestaetigen
  - Status 2026-03-11: 35.1 bis 35.4 umgesetzt (Input-Rampen inkl. Bot-Legacy-Guard, Render-Interpolation inkl. Spawn/Bounce-Reset und Teleport-Discontinuity-Reset, normalisierter BotRuntimeContext mit `controlProfileId`, dynamik-invarianter Action-Adapter mit Profil-Gate).
  - Gate-Status 2026-03-13: `TEST_PORT=5342 PW_RUN_TAG=plan-physics PW_OUTPUT_DIR=test-results/plan-physics PW_WORKERS=1 npm run test:physics` PASS (`57 passed`), `TEST_PORT=5341 PW_RUN_TAG=plan-core PW_OUTPUT_DIR=test-results/plan-core PW_WORKERS=1 npm run test:core` PASS (`82 passed`, `1 skipped`), `TEST_PORT=5343 PW_RUN_TAG=plan-training-ui PW_OUTPUT_DIR=test-results/plan-training-ui PW_WORKERS=1 npx playwright test tests/training-environment.spec.js --workers=1` PASS (`10 passed`), `npm run training:e2e` PASS (`stamp=20260313T124557Z`), `npm run bot:validate` PASS (`forcedRounds=10/17`), `npm run docs:sync` PASS und `npm run docs:check` PASS.
- [x] PX Bot-Training Produktivbetrieb und Automatisierung V36
  - Erstellt am: `2026-03-11`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Bot_Training_Produktivbetrieb_Automatisierung_V36.md`
  - Datei-Scope: `scripts/**`, `trainer/**`, `src/entities/ai/training/**`, `src/core/**`, `src/state/training/**`, `tests/**`, `docs/**`
  - Konfliktregel: Kein UI-Redesign in normalen Menuepfaden; Bridge/Trainer/Automation zuerst in shared+training-Pfaden halten. Cross-Block-Aenderungen in `src/core/**` oder `src/state/**` vor Commit im Conflict-Log eintragen.
  - Status 2026-03-13: Phasen `36.0` bis `36.9` abgeschlossen (`[x]`); der historische Core-Blocker `T7` ist auf dem aktuellen Stand nicht mehr reproduzierbar.
  - Verifikation 2026-03-13: `node scripts/training-loop.mjs --runs 2 --episodes 2 --seeds 11 --modes hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict false --with-trainer-server true --stop-on-fail true` PASS (`series 20260313T124626Z`), `npm run training:e2e` PASS (`20260313T124557Z`), `node --test tests/trainer-v34-*.test.mjs` PASS, `npx playwright test tests/training-environment.spec.js --workers=1` PASS, `npm run test:core` PASS, `npm run docs:sync` PASS, `npm run docs:check` PASS und `npm run build` PASS.
- [x] PX Performance-Restrisiken & Jitter-Stabilisierung V37
  - Erstellt am: `2026-03-13`
  - Agent: `A`
  - Plan-Datei: `docs/Feature_Performance_Restrisiken_V37.md`
  - Datei-Scope: `src/core/**`, `src/entities/**`, `tests/core.spec.js`, `docs/**`
  - Konfliktregel: Nur Performance-Hotpaths bearbeiten, keine funktionale Logik aendern. Start-Latenzen (T7) zuerst angehen.
  - Status 2026-03-13: Phasen `37.1` bis `37.9` abgeschlossen (`[x]`). Der finale Jitter-Matrixlauf `tmp/perf_jitter_matrix_1773422511548.json` ist gruen (`interactiveAggregateP99=17.10ms`, `worstRecordingGapMs=55.556ms`, `benchmarkPass=true`), `npm run test:core` laeuft stabil ohne T7-Timeout durch, und `npm run test:gpu` sowie `npm run test:physics` sind PASS. Browser-Spotchecks bestaetigen Menue -> Setup -> Match-Transition unter `tmp/develop-web-game-v37-menu/shot-0.png`, `tmp/develop-web-game-v37-level2/shot-0.png` und `tmp/develop-web-game-v37-play2/shot-0.png`; ein abgeschnittener Three.js-Bounding-Warnhinweis trat nur im Skill-Client mit synthetischem Quickstart auf und liess sich im aequivalenten direkten Playwright-Selektorpfad nicht reproduzieren.
- [/] PX Architektur-Verbesserung & Prävention V38
  - Erstellt am: `2026-03-13`
  - Agent: `Codex`
  - Plan-Datei: `docs/Feature_Architektur_Massnahmenplan_V38.md`
  - Datei-Scope: `src/core/main.js`, `src/ui/UIManager.js`, `package.json`, `.eslint*`, `tsconfig.json`
  - Konfliktregel: Tooling-Updates (ESLint, TS-Check) separat von funktionalen Anpassungen durchführen. "God Object"-Splits nur nach Absprache/Sicherung der Tests.
  - [x] 38.1 Tooling-Grails fuer Dateigroesse und JS-Vertraege
    - [x] 38.1.1 `eslint.config.js` mit `max-lines`-Guard und additiven Legacy-Ceilings fuer bestehende Grossdateien einfuehren
    - [x] 38.1.2 `tsconfig.json` + `npm run typecheck:architecture` fuer neue Bootstrap-Helfer mit `tsc --checkJs` aufbauen
  - [x] 38.2 `main.js` entlasten
    - [x] 38.2.1 Runtime-Error-Overlay und DOM-Bootstrap nach `src/core/RuntimeErrorOverlay.js` und `src/core/AppInitializer.js` auslagern
    - [x] 38.2.2 Playtest-URL-Parsing nach `src/core/PlaytestLaunchParams.js` verschieben
  - [ ] 38.3 `UIManager.js` modularisieren
    - [ ] 38.3.1 Start-/Preview-/Summary-Sync in dedizierte Controller/Ops extrahieren
    - [ ] 38.3.2 Navigation-/Access-/Dispose-Lifecycle in dedizierte Controller ueberfuehren
  - [ ] 38.9 Abschluss-Gate
    - [ ] 38.9.1 `npm run architecture:guard` und `npm run test:core` gruen bestaetigen
    - [ ] 38.9.2 `npm run build`, `npm run docs:sync` und `npm run docs:check` gruen bestaetigen
  - Status 2026-03-14: Erste Praeventionsstufe umgesetzt. `main.js` ist um Bootstrap-/Error-/Playtest-Helfer entlastet, `prebuild` fuehrt jetzt einen additiven Architektur-Guard aus ESLint-`max-lines` plus inkrementellem `tsc --checkJs` aus; der verbleibende offene Rest ist die eigentliche Modularisierung von `UIManager.js`.
<!-- PLAN-INTAKE-END -->

## Archivierte Referenzen

- Abgeschlossen: `docs/archive/plans/completed/`
- Abgeloest: `docs/archive/plans/superseded/`
- Frueherer Masterstand: `docs/archive/plans/superseded/Umsetzungsplan_bis_2026-03-06.md`
- GLB-Detailplan alt: `docs/archive/plans/superseded/Feature_GLB_Map_Loader.md`

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run docs:sync`
- `npm run docs:check`

## Status-Log (append-only)

### 2026-03-11 - PX Bot-Training DeepLearning Server V34 - Iteration 1

- Scope abgeschlossen fuer `34.0`, `34.1`, `34.2`:
  - Contract-/Failure-Policy-Freeze im neuen `trainer/config/**`
  - Trainer-Server + Session-Routing in `trainer/server/**` und `trainer/session/**`
  - Replay-/Transitions-Pipeline in `trainer/replay/**`
  - Bootstrap von `scripts/trainer-server.mjs` auf den neuen Trainerpfad
  - V34-Tests additiv unter `tests/trainer-v34-*.mjs`
- Laufstatus:
  - `start_training_bridge.bat --episodes 100 --seeds 11 --modes hunt-2d` ausgefuehrt, Exit-Code `0`
  - Core-Gate bleibt von bestehendem Timeout-Flake (`T7`) betroffen

### 2026-03-11 - PX Bot-Training DeepLearning Server V34 - Iteration 2

- Scope fuer `34.3` umgesetzt:
  - neues `trainer/model/**` mit deterministischem DQN/MLP (`SeededRng`, `DqnMlpNetwork`, `DqnTrainer`, `ActionVocabulary`)
  - Session-Inferenz von Heuristik auf Modellpfad gehoben (`bot-action-request`)
  - Replay->Optimizer-Pfad aktiv (`training-step` triggert TD-Loss/Backprop/Target-Sync)
- Verifikation:
  - V34-Node-Tests (Replay/Server/Model) PASS
  - Bridge-Run `start_training_bridge.bat --episodes 100 --seeds 11 --modes hunt-2d` PASS
  - `runtimeErrorCount` im Run-Artefakt auf `0` in diesem Lauf

### 2026-03-11 - PX Bot-Training DeepLearning Server V34 - Iteration 3

- Scope fuer `34.4` bis `34.7` + `34.9` umgesetzt:
  - Bridge-Handshake/Readiness und Lerntelemetrie in `WebSocketTrainerBridge` gehaertet.
  - Checkpoint-Export/Load + Resume-Quelle im Trainer-Contract/Session verankert.
  - Artefaktpfad `trainer.json` + `checkpoint.json` inkl. Latest-Index-Erweiterung integriert.
  - Startskripte mit Strict-Ready-Modus finalisiert.
  - Gate-Kompatibilitaetsfix fuer `latest.stamp` in `scripts/training-gate.mjs`.
- Verifikation:
  - V34-Node-Tests (`tests/trainer-v34-*.mjs`) PASS
  - `start_training_bridge.bat --episodes 100 --seeds 11 --modes hunt-2d`:
    - ohne laufenden Trainer FAIL (`bridge-ready-check failed`)
    - mit laufendem `scripts/trainer-server.mjs` PASS
  - `npm run training:e2e` PASS
  - `npm run test:core` FAIL (bestehende Playwright-Timeout-Flakes `T7`/`T10e`)
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - `npm run build` PASS

### 2026-03-11 - PX Steuerungsfluss Input-Rampen + Render-Interpolation V35 - Lane B (`35.2`)

- Scope `35.2` abgeschlossen:
  - `GameLoop` liefert `renderAlpha = accumulator / fixedStep` als Render-Argument.
  - Renderpfad in `main`/`PlayingStateSystem` auf Alpha-Renderphase verdrahtet.
  - Interpolierte Player-/Kamera-Transforms laufen im Renderpfad; Fixed-Step bleibt Sim-Source-of-Truth.
  - Hard-Snap-Reset bei Spawn/Bounce aktiv; Teleport-Spruenge werden per Discontinuity-Guard abgefangen.
- Verifikation:
  - `npm run test:core` FAIL (`T7` Timeout-Flake im Startpfad, bekannte Instabilitaet).
  - `npm run test:gpu` FAIL (mehrere Start-/Setup-Timeouts; isolierte Einzeltests wie `T21`/`T21a` PASS).

### 2026-03-11 - PX Steuerungsfluss Input-Rampen + Render-Interpolation V35 - Abschlussstand (`35.1` bis `35.4`, `35.9`)

- Scope umgesetzt:
  - Input-Rampen fuer `pitch/yaw/roll` in `PlayerController` mit Attack-/Release-Glattung; Steering-Lock, Invert und Planar-Modus konsistent auf Zielachsen angewendet.
  - Bot-Legacy-Guard aktiv: Bot-Rampen bleiben standardmaessig aus, bis ein passendes `controlProfileId` explizit freigegeben ist.
  - Render-Interpolation fuer Player/Kamera aktiv (Fixed-Step Sim bleibt deterministisch); Spawn/Bounce setzen harte Reset-Marken, Teleport-Spruenge werden ueber Discontinuity-Reset abgefangen.
  - Bot-Runtime-Kontext normalisiert um `speed`/`turnSpeed`/`rollSpeed`/Rampenparameter; stabile `controlProfileId`-Ableitung eingebaut.
  - Trainings-Contract-Lane um `controlProfileId` erweitert (`TrainingDomain`, `TrainingContractV1`, `TrainerPayloadAdapter`, `TrainingTransportFacade`).
  - Dynamik-invarianter Action-Adapter (Desired-Rate -> diskrete Flags) als Feature-Flag hinter Runtime-Context-Gate aktiviert.
- Gate-Ergebnisse:
  - `npm run test:physics` FAIL (mehrfach reproduzierte Timeout-/Stabilitaetskaskade im Multi-Worker-Lauf, 17-35 PASS je Re-Run; Artefakte unter `test-results/**`).
  - `npm run test:core` PASS.
  - `npx playwright test tests/training-environment.spec.js` PASS.
  - `npm run training:e2e` PASS.
  - `npm run bot:validate` PASS (Runner-Ende erfolgreich, Bericht geschrieben).
  - `npm run docs:sync` PASS.
  - `npm run docs:check` PASS.

### 2026-03-11 - PX Bot-Training Produktivbetrieb und Automatisierung V36 - Abschlussstand (`36.0` bis `36.9`)

- Scope umgesetzt:
  - V36 Ops-KPI-Vertrag (`timeoutRate`, `fallbackRate`, `actionCoverage`, `responseCoverage`) in Run/Eval/Gate integriert.
  - Serien-Orchestrierung (`scripts/training-loop.mjs`) mit `resume-checkpoint=latest`, Stop-on-fail und Serienartefakt unter `data/training/series/**`.
  - Resume-/Checkpoint-Haertung in Trainer-Server/Session inkl. `trainer-checkpoint-load-latest` und Checkpoint-Validierung.
  - Match-Runtime-Integration: `botBridge`-Settings + Resume-vor-Action in `ObservationBridgePolicy`; Bridge-Status fuer Runtime-Diagnose in `GameDebugApi`.
  - Eval-/Gate-Erweiterung um Play-Eval-Lane und Rolling-Window-Trend-Gate.
  - Runbook/Troubleshooting fuer Produktivbetrieb in `docs/Bot-Training-Schnittstelle.md` ergaenzt.
- Gate-Ergebnisse:
  - `node scripts/training-loop.mjs --runs 2 --episodes 2 --seeds 11 --modes hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict false --with-trainer-server true --stop-on-fail true` PASS.
  - `npm run training:e2e` PASS.
  - `node --test tests/trainer-v34-*.test.mjs` PASS.
  - `npx playwright test tests/training-environment.spec.js --workers=1` PASS.
  - `npm run test:core` FAIL (`T7: Spiel startet - HUD sichtbar`, Timeout reproduzierbar).
  - Isolierte Re-Runs: `npx playwright test tests/core.spec.js -g "T7: Spiel startet" --workers=1` FAIL, inkl. `--retries=1` weiterhin FAIL.
  - `npm run docs:sync` PASS.
  - `npm run docs:check` PASS.
  - `npm run build` PASS.

### 2026-03-13 - V35/V36 Performance-Follow-up (`Phase 5`, `Phase 6`, `Phase 8`, `Phase 9`)

- Scope umgesetzt:
  - gemeinsamer Kamera-Timing-Pfad fuer `GameLoop` -> `PlayingStateSystem` -> `CameraRigSystem` inkl. Fokus-/Visibility-Reset
  - Recorder-Backpressure mit aggressiveren Load-Levels, Backlog-Trim und normalisierten Export-Zeitstempeln
  - Playwright-/Benchmark-Wrapper mit lokalem Start-Lock und erzwungener Run-Isolation (`TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`, `PW_WORKERS=1`)
  - Jitter-Matrix-Runner mit eindeutig benannten Referenzclips fuer Phase 9
- Gate-Ergebnisse:
  - `npm run build` PASS
  - `npm run test:core` FAIL (`T7: Spiel startet - HUD sichtbar`, isolierter Re-Run ebenfalls FAIL)
  - `npx playwright test tests/core.spec.js -g "T10e:" --workers=1` PASS
  - `npm run test:physics` PASS
  - `npm run test:gpu` PASS
  - `npm run benchmark:jitter` FAIL auf den Acceptance-Zielen (`worstP95=183.30ms`, `worstP99=366.60ms`, `recordingGapViolations=8`, `periodicSpikeRuns=0`)
- Artefakte:
  - Report: `docs/Testergebnisse_2026-03-13_V35V36_Phase5_9.md`
  - Matrix: `tmp/perf_jitter_matrix_v35v36_phase9_final_20260312.json`
  - Referenzclips: `videos/aero-arena-*-phase9-*.webm`

