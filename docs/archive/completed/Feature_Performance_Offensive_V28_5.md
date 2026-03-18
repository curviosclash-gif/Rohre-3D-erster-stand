# Feature: Performance-Offensive (V28.5)

Stand: 2026-03-07
Status: Abgeschlossen und revalidiert (2026-03-07)
Owner: Single-Agent Planung

## Leitprinzip

Maximale Performance bei voller Feature-Paritaet.
Grosse Umbauten sind ausdruecklich erlaubt, aber nur dann, wenn alle vorhandenen Spielfunktionen, Modi, Menuepfade, Steuerungsvarianten, Recording-Pfade und Tooling-Einstiege funktional erhalten bleiben oder testbar gleichwertig ersetzt werden.

## Kontext

Bestehende Performance-Arbeiten aus Phase 24 und 25 haben bereits mehrere offensichtliche Hotspots reduziert.
Der Ausgangsstand dieser Offensive zeigte aber noch genug strukturelles Potenzial, dass eine reine Feintuning-Runde nicht als Endstrategie reichte.

Aktuelle Referenzwerte:

- Baseline `data/performance_ki_baseline_report.json` (generatedAt `2026-03-07`):
  - overall `fpsAverage=59.977`
  - overall `drawCallsAverage=20.986`
  - Szenario `V2 (maze)`: `drawCallsAverage=24.000`, `drawCallsMax=24`
  - Szenario `V3 (complex)`: `drawCallsAverage=23.733`, `drawCallsMax=24`
- Lifecycle-Messung (`scripts/perf-lifecycle-measure.mjs`, `2026-03-07`):
  - Trendprofil `tmp/perf_phase28_5_lifecycle_trend.json`: `domToGameInstanceMs=4283`, `startMatchLatencyMs=68`, `returnToMenuLatencyMs=63`
  - Vollprofil `tmp/perf_phase28_5_lifecycle_full.json`: `domToGameInstanceMs=3253`, `startMatchLatencyMs=179`, `returnToMenuLatencyMs=26`

Wichtige Befunde im Abschlussstand:

- Das Portal-/Gate-Instancing beseitigt den frueheren Draw-Call-Resthotspot; `V3` und `V4` liegen nun klar im Zielbereich.
- Lifecycle-Ziele sind komfortabel erreicht (`startMatchLatencyMs=179`, `returnToMenuLatencyMs=26` im Vollprofil), `domToGameInstanceMs` schwankt weiter je nach Lauf.
- Der normale Renderpfad laeuft ohne Recorder-Overhead; Recording, Download und Lifecycle-Hooks bleiben funktionsfaehig.
- CPU-/Allocation-Hotpaths bleiben stabil (`stuckEvents=0`); der Worker-/SoA-Pfad musste im Abschlussstand nicht aktiviert werden.

Bereits vorhandene Staerken, die nicht zuerst neu erfunden werden sollen:

- Arena-Static-Geometry wird bereits zusammengefuehrt (`src/entities/arena/ArenaGeometryCompilePipeline.js`).
- Trails nutzen bereits `InstancedMesh` plus Spatial-Index (`src/entities/Trail.js`, `src/entities/systems/trails/**`).
- Projektil-State und Projektil-Meshes werden bereits gepoolt (`src/entities/systems/ProjectileSystem.js`).
- Kamera-Kollision besitzt bereits einen wirksamen Reuse-Cache (`src/core/renderer/camera/CameraCollisionSolver.js`).

## Ziel

Performance in Runtime, Lifecycle und Speicherverhalten maximal verbessern, ohne sichtbaren oder funktionalen Verlust bestehender Spielfunktionen.

Abnahmekriterien (Pflicht):

- Keine Spielfunktion faellt weg: Classic, Hunt, Portale, Bots, Split/Multiplayer-Menuepfade, Recording, Cinematic Camera, Keybinds, Editor-Launcher und Preset/Profile muessen weiter funktionieren.
- `overall fpsAverage` bleibt mindestens auf Baseline-Niveau vom `2026-03-07`.
- `overall drawCallsAverage <= 24` im Abschluss-Benchmark.
- `V3 (complex) drawCallsAverage <= 50` im Abschluss-Benchmark.
- `V2 (maze) drawCallsMax <= 70` im Abschluss-Benchmark.
- `startMatchLatencyMs <= 1100` im Lifecycle-Referenzlauf.
- `returnToMenuLatencyMs` darf sich gegen Stand `2026-03-05` nicht verschlechtern.
- Keine neuen `stuckEvents` in der Baseline-Matrix.
- Alle relevanten Tests (`test:core`, `test:physics`, `test:gpu`, `test:stress`) muessen im End-Gate gruen sein.

Stretch-Ziele (wenn ohne Feature-Risiko erreichbar):

- `startMatchLatencyMs <= 900`.
- `domContentLoadedEventEndMs <= 1100`.
- `gameInstanceReadyMs <= 1200`.
- Bot-lastige Szenarien bleiben auch bei kuenftig hoeherer Bot-Zahl ohne spuerbare Main-Thread-Spikes erweiterbar.

## Nicht-Ziele

- Kein Gameplay-Balancing-Rework als eigenes Ziel.
- Kein absichtlicher Feature-Abbau zur Performance-Steigerung.
- Kein rein benchmark-getriebener Eingriff, der echte Spielpfade verschlechtert.
- Keine dauerhafte visuelle Degradierung als einzige Strategie; adaptive oder kontextuelle Qualitaetsbudgets sind erlaubt, wenn Feature-Paritaet und Lesbarkeit erhalten bleiben.

## Architektur-Check

Bestehende Module/Schnittstellen:

- Renderpfad: `src/core/Renderer.js`, `src/core/renderer/RenderViewportSystem.js`, `src/core/renderer/RenderQualityController.js`, `src/core/MediaRecorderSystem.js`
- Lifecycle/Bootstrap: `src/core/main.js`, `src/core/GameBootstrap.js`, `src/state/MatchSessionFactory.js`, `src/state/MatchLifecycleSessionOrchestrator.js`
- Arena/Portal-Build: `src/entities/arena/ArenaBuilder.js`, `src/entities/arena/ArenaGeometryCompilePipeline.js`, `src/entities/arena/PortalGateMeshFactory.js`, `src/entities/arena/portal/PortalLayoutBuilder.js`
- Gameplay-Hotpath: `src/entities/runtime/EntityTickPipeline.js`, `src/entities/ai/**`, `src/entities/systems/**`, `src/hunt/**`
- UI-Hotpath: `src/ui/HUD.js`, `src/hunt/HuntHUD.js`, `src/ui/HudRuntimeSystem.js`, `src/ui/UIManager.js`
- Messung: `scripts/bot-benchmark-baseline.mjs`, `data/performance_ki_baseline_report.json`, `tmp/perf_phase25_*`

Reuse-vs-Neu Entscheidung:

- Default ist gezielter Reuse bestehender Module und Vertrage.
- Neue Dateien sind erlaubt, wenn sie klare Struktur- oder Hotpath-Gewinne bringen.
- Ein grosser Umbau ist kein Selbstzweck, aber fuer den Maximalpfad explizit zulaessig.
- Die groesseren Strukturpfade werden nur nach klaren Mess-Gates aktiviert, nicht aus Bauchgefuehl.

Optional neue Dateien/Module:

- `scripts/perf-lifecycle-measure.mjs`
- `src/core/renderer/RenderResourceCache.js`
- `src/core/renderer/portal/PortalInstancingSystem.js`
- `src/state/MatchSessionPool.js`
- `src/workers/bot-perception.worker.js`
- `src/entities/runtime/soa/**` oder `src/sim/**` fuer einen spaeteren datenorientierten Kern

Entscheidungstore:

- Gate A nach `28.5.0`: Messharness steht, aktuelle Referenz ist belastbar, Top-3-Hotspots sind neu bestaetigt.
- Gate B nach `28.5.3`: Wenn Draw-Calls und Startlatenz bereits im Zielbereich liegen, bleibt der grosse Strukturpfad optional.
- Gate C nach `28.5.4`: Wenn weiterhin deutliche CPU-/Lifecycle-Deltas offen bleiben, wird `28.5.5` (Worker/SoA) aktiviert.
- Gate D vor Abschluss: Kein Performance-Gewinn wird akzeptiert, wenn Feature-Paritaet oder Teststabilitaet sichtbar leidet.

Risiko: hoch

- Grund: Der Nutzer wuenscht maximale Performance und erlaubt dafuer grosse Umbauten.
- Hauptrisiken: versteckte Funktionsregressionen, Timing-Drift in Bot-/Trail-Logik, Recording-Kompatibilitaet, hoher Integrationsaufwand bei Session-Reuse oder Worker-Splits.
- Risikominderung: scharfe Mess-Gates, Feature-Parity-Checkliste, kleine aktivierbare Teilpfade statt Big-Bang-Umschaltung.

Dokumentations-Impact-Liste:

- `docs/Umsetzungsplan.md`
- `docs/Analysebericht.md` (falls neue Architektur- oder Messbefunde entstehen)
- `docs/ai_architecture_context.md` (falls Vertrage/Module/Worker-Grenzen geaendert werden)
- `docs/Testergebnisse_YYYY-MM-DD.md`
- ggf. `progress.md`, falls waehrend Umsetzung groessere Uebergabepunkte entstehen

## Betroffene Dateien (geplant)

Bestehend:

- `src/core/Renderer.js`
- `src/core/renderer/RenderQualityController.js`
- `src/core/renderer/RenderViewportSystem.js`
- `src/core/renderer/camera/CameraCollisionSolver.js`
- `src/core/main.js`
- `src/core/GameBootstrap.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/MediaRecorderSystem.js`
- `src/state/MatchSessionFactory.js`
- `src/state/MatchLifecycleSessionOrchestrator.js`
- `src/entities/Arena.js`
- `src/entities/EntityManager.js`
- `src/entities/Player.js`
- `src/entities/Bot.js`
- `src/entities/arena/ArenaBuilder.js`
- `src/entities/arena/ArenaGeometryCompilePipeline.js`
- `src/entities/arena/PortalGateMeshFactory.js`
- `src/entities/arena/portal/PortalLayoutBuilder.js`
- `src/entities/ai/BotSensors.js`
- `src/entities/ai/BotSensingOps.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/systems/trails/TrailCollisionQuery.js`
- `src/entities/systems/trails/TrailSegmentRegistry.js`
- `src/entities/runtime/EntityTickPipeline.js`
- `src/ui/HUD.js`
- `src/ui/HudRuntimeSystem.js`
- `src/ui/UIManager.js`
- `src/hunt/HuntHUD.js`
- `index.html`
- `style.css`
- `scripts/bot-benchmark-baseline.mjs`
- `tests/core.spec.js`
- `tests/physics-core.spec.js`
- `tests/physics-hunt.spec.js`
- `tests/physics-policy.spec.js`
- `tests/gpu.spec.js`
- `tests/stress.spec.js`
- `docs/Umsetzungsplan.md`

Optional neu:

- `scripts/perf-lifecycle-measure.mjs`
- `src/core/renderer/RenderResourceCache.js`
- `src/core/renderer/portal/PortalInstancingSystem.js`
- `src/state/MatchSessionPool.js`
- `src/workers/bot-perception.worker.js`
- `src/entities/runtime/soa/**` oder `src/sim/**`

## Priorisierung nach Hebel

1. Match-Session-Reuse und Startlatenz.
2. Portal-/Gate-Rendering und Recorder-Entkopplung.
3. Bot-/Trail-CPU-Hotpaths.
4. Lazy Bootstrap fuer Menu/UI.
5. Worker-/SoA-Pfad nur, wenn nach den ersten vier Bloecken noch deutliche Deltas offen sind.

## Umsetzungsphasen

- [x] 28.5.0 Baseline-Refresh und Feature-Parity-Harness
  - [x] 28.5.0.1 Baseline-Matrix mit kurzem und vollem Messprofil festziehen (`2500ms` Trendlauf, `8000ms` Abschlusslauf).
  - [x] 28.5.0.2 Lifecycle-Messung fuer `DOMContentLoaded`, `GAME_INSTANCE ready`, `startMatch`, `returnToMenu` standardisieren.
  - [x] 28.5.0.3 Feature-Parity-Checkliste fuer Classic, Hunt, Portale, Cinematic Camera, Recording, Profile/Presets, Editor-Launcher definieren.
  - [x] 28.5.0.4 Hotspot-Ranking nach `GPU`, `CPU`, `Lifecycle`, `Allocation` mit Zahlen dokumentieren.
  - Exit:
    - reproduzierbarer Vorher-Stand liegt mit klarer Referenz vor.
  - Verifikation:
    - `npm run benchmark:baseline`
    - `npm run test:core`
  - Kurznotiz 2026-03-07: Lifecycle-Harness (`npm run benchmark:lifecycle -- --profile trend|full`) eingefuehrt und Baseline neu referenziert; Start-/Menu-Latenzen sind jetzt reproduzierbar als JSON unter `tmp/perf_phase28_5_lifecycle_*.json`.

- [x] 28.5.1 Render-Resource-Cache und Portal-/Gate-Instancing
  - [x] 28.5.1.1 Shared-Geometrie-/Material-Caches fuer Portal- und Gate-Varianten einfuehren.
  - [x] 28.5.1.2 Portal- und Gate-Visuals auf Instancing oder klar begrenztes Pooling je Variantenschluessel umstellen.
  - [x] 28.5.1.3 Rein dekorative Unterobjekte auf minimalen Draw-Call-/Material-State trimmen.
  - [x] 28.5.1.4 Portalreiche Szenarien (`V2`, `V3`) visuell per Screenshot/Spieltest gegenpruefen.
  - Exit:
    - deutlicher Draw-Call-Rueckgang in `V2` und `V3` ohne sichtbaren Funktionsverlust.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:gpu`
    - Trendmessung `V2` und `V3` via Benchmark-Script
  - Kurznotiz 2026-03-07: Portal-/Gate-Factory nutzt jetzt echte `InstancedMesh`-Batches mit shared Geometry-/Material-Caches und `instanceColor`; Portal-Szenarien wurden visuell via `tmp/perf-phase28-5-v3-instancing.png` und Skill-Loop (`tmp/develop-web-game-portal/shot-1.png`) gegengeprueft. Abschluss-Benchmark liegt danach bei `overall drawCallsAverage=20.99`, `V3 drawCallsAverage=23.73`, `V2 drawCallsMax=24`.

- [x] 28.5.2 Non-Recording-Renderer entschlacken
  - [x] 28.5.2.1 Normalen Renderpfad von dauerhaftem `preserveDrawingBuffer` entkoppeln.
  - [x] 28.5.2.2 Recorder-Pfad nur dann aktivieren, wenn Recording wirklich laeuft.
  - [x] 28.5.2.3 Capture-FPS/Intervall fuer Laufzeit-sensible Sessions konfigurierbar machen.
  - [x] 28.5.2.4 Sicherstellen, dass Videoaufnahme, Download und Lifecycle-Hooks weiter funktionieren.
  - Exit:
    - normale Matches laufen ohne Recorder-Overhead, Recording bleibt funktional.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:gpu`
  - Kurznotiz 2026-03-07: Renderer nutzt jetzt standardmaessig `preserveDrawingBuffer=false`; Recorder-Defaultpfad ist non-recording (`autoRecordingEnabled=false`) und `captureFps` ist per Runtime/API konfigurierbar (Default 30, Query `recordfps`).

- [x] 28.5.3 Match-Session-Reuse und Start-/Transition-Latenz
  - [x] 28.5.3.1 Vertrag fuer `resetMatchState()` bzw. Session-Reuse definieren statt Komplett-Neuaufbau bei jedem Start.
  - [x] 28.5.3.2 Arena-, Partikel-, Kamera- und Runtime-Ressourcen fuer identische Konfigurationen wiederverwenden.
  - [x] 28.5.3.3 Vorbereitbare Arbeit in die Menuephase ziehen und Startpfad nur auf notwendige Aktivierung reduzieren.
  - [x] 28.5.3.4 Rueckkehr ins Menue auf stabile konstante Latenz absichern.
  - Exit:
    - `startMatchLatencyMs <= 1100` bei stabiler Funktionsparitaet.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`
    - Lifecycle-Messskript (bestehend oder neu)
  - Kurznotiz 2026-03-07: Menu-seitiges Arena-Prewarm (`prewarmMatchArenaSession`) mit Runtime-Scheduling eingebunden; Vollprofil-Messung jetzt bei `startMatchLatencyMs=202` und `returnToMenuLatencyMs=23` (`tmp/perf_phase28_5_lifecycle_full.json`).

- [x] 28.5.4 Bot-/Trail-/Projectile-CPU-Hotpaths und Allocation-Budget
  - [x] 28.5.4.1 Bot-Perception und Decision-Frequenz als Multirate-System budgetieren, ohne Spiellogik zu verlieren.
  - [x] 28.5.4.2 Trail-Kollisionsquery auf weniger Kandidatenarbeit, weniger `Set`-/Objektverkehr und striktes Reuse trimmen.
  - [x] 28.5.4.3 Projektil-, Player- und Bot-Hotpaths auf neue Objektallokationen pro Tick pruefen und entfernen.
  - [x] 28.5.4.4 Guardrails dokumentieren: keine unnoetigen neuen Objekte in `update`/`render`-Pfaden.
  - Exit:
    - CPU-Last sinkt in bot- und traillastigen Szenarien ohne KI-/Physikdrift.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:stress`
    - optional `npm run smoke:selftrail`
  - Kurznotiz 2026-03-07: Bot-Sensing wurde als Multirate budgetiert, Trail-Kollisionsquery auf Stamp-Reuse statt `Set`-Dedupe umgestellt, Bot- und Observation-Runtime-Kontexte werden pro Bot wiederverwendet und Projektilentfernung nutzt O(1)-swap-pop; Verifikation gruen (`core/physics/stress`) bei `stuckEvents=0` und Lifecycle-Vollprofil `startMatchLatencyMs=196`, `returnToMenuLatencyMs=218`.

- [x] 28.5.5 Structural Scaling Path (Worker/SoA, nur bei offenem Delta)
  - [x] 28.5.5.1 Entscheidung treffen, welche Teilsysteme zuerst in Snapshot-/Worker-Grenzen ueberfuehrt werden.
  - [x] 28.5.5.2 Bot-Perception als Worker-geeigneten Snapshot-Pfad kapseln.
  - [x] 28.5.5.3 Falls noetig: datenorientierten Kern fuer die teuersten Subsysteme (`Bot`, `Projectile`, Trail-Kollision oder spaeter `Player`) vorbereiten.
  - [x] 28.5.5.4 Jedes migrierte Subsystem mit Rollback-Moeglichkeit und Parity-Tests absichern.
  - Gate zum Einstieg:
    - nach `28.5.4` liegt mindestens eines der Pflichtziele noch klar ausserhalb des Zielbereichs.
  - Exit:
    - struktureller Performance-Gewinn ist messbar und regressionsarm oder der Pfad wird bewusst nicht benoetigt geschlossen.
  - Verifikation:
    - `npm run benchmark:baseline`
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:stress`
  - Kurznotiz 2026-03-07: Gate-C wurde mit aktueller Baseline geprueft; Worker-Thread-Rollout wurde bewusst nicht aktiviert, da das offene Delta primaer GPU/draw-call-seitig ist und der CPU-Pfad bereits ueber Context-/Snapshot-Reuse vorbereitet wurde. Parity-Risiko wurde mit vollem Core/Physics/Stress-Gate abgesichert (alles gruen).

- [x] 28.5.6 Menu/UI-Bootstrap und DOM-Last reduzieren
  - [x] 28.5.6.1 `createGameUiRefs()` und schwere Menue-Panels auf Lazy-Initialisierung umbauen.
  - [x] 28.5.6.2 Nicht sofort benoetigte Editor-/Developer-/Preset-Pfade spaeter laden oder erst bei Interaktion initialisieren.
  - [x] 28.5.6.3 HUD/HuntHUD-DOM-Schreiblast weiter diff-basiert und tick-budgetiert halten.
  - [x] 28.5.6.4 Initial-Load gegen `DOMContentLoaded` und `GAME_INSTANCE ready` validieren.
  - Exit:
    - geringere Bootstrap-Kosten ohne UX-/Menueverlust.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`
    - Lifecycle-Messskript
  - Kurznotiz 2026-03-07: `createGameUiRefs()` nutzt Lazy-Resolver fuer Level4/Developer-/Preset-Collections; Level4-Tabs und Developer-Textkatalog werden erst beim echten Oeffnen initialisiert. Lifecycle-Vollprofil liegt bei `domToGameInstanceMs=1943`, `startMatchLatencyMs=65`, `returnToMenuLatencyMs=42`; Core/Stress weiterhin gruen.

- [x] 28.5.7 Vollbenchmark und Feature-Parity-Gate
  - [x] 28.5.7.1 Gesamte Baseline-Matrix erneut laufen lassen.
  - [x] 28.5.7.2 Lifecycle-Werte mit Vorher/Nachher-Deltas dokumentieren.
  - [x] 28.5.7.3 Feature-Parity-Checkliste komplett durchgehen.
  - [x] 28.5.7.4 Restrisiken und bewusst offene Restdeltas sauber benennen.
  - Exit:
    - Pflichtkriterien sind erreicht oder verbleibende Deltas sind klar dokumentiert und begruendet.
  - Verifikation:
    - `npm run benchmark:baseline`
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:gpu`
    - `npm run test:stress`
  - Kurznotiz 2026-03-07: Vollgate komplett gruen (`benchmark:baseline`, `benchmark:lifecycle -- --profile trend|full`, `test:core`, `test:physics`, `test:gpu`, `test:stress`). Pflichtmetriken sind erreicht: `overall fpsAverage=59.977`, `overall drawCallsAverage=20.99`, `V3 drawCallsAverage=23.73`, `V2 drawCallsMax=24`, `stuckEvents=0`, `startMatchLatencyMs=179`, `returnToMenuLatencyMs=26`.

- [x] 28.5.8 Abschluss-Gate und Doku-Freeze
  - [x] 28.5.8.1 Delta-Doku mit finalen Kennzahlen aktualisieren.
  - [x] 28.5.8.2 Folgephase nur dann eroeffnen, wenn nachweisbar noch lohnende Resthebel bestehen.
  - [x] 28.5.8.3 Dokumentations- und Test-Gates als Abschlussbedingung erzwingen.
  - Exit:
    - Abschlussstand ist dokumentiert, reproduzierbar und fuer den naechsten Agenten klar uebernehmbar.
  - Verifikation:
    - `npm run docs:sync`
    - `npm run docs:check`
  - Kurznotiz 2026-03-07: Abschlussstand dokumentiert, reproduzierbar und ohne offene Pflichtdeltas eingefroren. `docs:sync`/`docs:check` bleiben verpflichtender Abschlussblock; Resthebel sind nur noch optionale Feintuning-Themen, kein offener Muss-Pfad.

## Teststrategie

- Pro Teilphase nur pfadrelevante Tests ausfuehren; Vollbenchmark nur bei Gates und Abschluss.
- Renderpfade: mindestens `test:core` plus `test:gpu`.
- Entity-/AI-/Trail-Pfade: mindestens `test:core` plus `test:physics`, bei Lastaenderungen zusaetzlich `test:stress`.
- UI-/Bootstrap-Pfade: mindestens `test:core` plus `test:stress`.
- Lifecycle-/Startlatenz-Themen: immer zusaetzlich standardisierte Messung fuer `DOMContentLoaded`, `GAME_INSTANCE ready`, `startMatch`, `returnToMenu`.
- Nach jedem groesseren Strukturpfad muss die Feature-Parity-Checkliste erneut gegen die betroffenen Modi/Subsysteme ausgefuehrt werden.

## Rollout- und Sicherheitsregeln

- Keine gleichzeitige Umstellung mehrerer Hochrisiko-Systeme ohne Zwischenmessung.
- Reuse vor Ersatz, ausser wenn ein Mess-Gate zeigt, dass die bestehende Architektur den Zielkorridor realistisch nicht erreicht.
- Worker-/SoA-Pfade nur subsystemweise und mit Rueckfallpfad einfuehren.
- Jeder Performance-Gewinn muss mit Zahlen und nicht nur mit subjektivem Eindruck belegt werden.

## Dokumentations-Hook

Vor Abschluss jeder Implementierungsphase:

- `npm run docs:sync`
- `npm run docs:check`

