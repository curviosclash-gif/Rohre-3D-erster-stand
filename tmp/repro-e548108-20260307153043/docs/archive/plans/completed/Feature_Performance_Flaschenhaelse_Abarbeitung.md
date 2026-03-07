# Feature Plan: Performance-Flaschenhaelse Abarbeitung

Stand: 2026-03-05
Status: Abgeschlossen (2026-03-05)
Owner: Single-Agent Umsetzung

## Ziel

Die identifizierten CPU-, GPU- und GC-Hotspots werden schrittweise reduziert, ohne Functional Drift im Gameplay.

## Ausgangslage (Kurz)

- Unnoetige Observation-Berechnung pro Bot-Tick auch fuer Policies ohne Observation-Nutzung.
- Hohe Kollisionslast in Bot-Sensing und Trail-Kollision.
- Hoher Allocation/Dispose-Druck bei MG-Tracer-Effekten.
- Hohe Draw-Calls in portalreichen Szenarien.
- Regelmaessige HUD-DOM-Updates im Runtime-Pfad.

## Scope

- `src/entities/**` (AI/Sensing/Trail/Projectile/MG-nahe Runtime)
- `src/hunt/**` (MG Tracer/Hit/Overheat)
- `src/core/**` (Runtime-/Render-Hotpath nur wenn noetig)
- `src/ui/**` (HUD-Hotpath)
- `scripts/bot-benchmark-baseline.mjs` nur falls fuer reproduzierbare Teilmessung zwingend notwendig

## Nicht-Ziele

- Kein Rework der Spielregeln/Balancing-Logik als eigenes Ziel.
- Kein wholesale-Refactor ohne messbaren Performance-Impact.
- Keine neuen Features ausser technischer Hilfen fuer Messbarkeit.

## Mess- und Abnahmekriterien

- Primarmetriken: `fpsAverage`, `drawCallsAverage`, Frametime-Stabilitaet.
- Sekundaermetriken: keine neuen `stuckEvents`, keine Verhaltensregressionen.
- Referenzreport: `data/performance_ki_baseline_report.json` (generatedAt 2026-03-04).
- Gate: Keine Verschlechterung >5% in FPS im relevanten Szenario ohne begruendete Ausnahme.

## Phasenplan (Single-Agent)

- [x] 24.0 Baseline-Freeze und Messprotokoll (abgeschlossen 2026-03-05)
  - Schritte:
    - Aktuelle Baseline-Daten und Szenario-Matrix dokumentieren.
    - Pro Phase ein Ziel-Szenario festlegen (CPU- oder GPU-fokussiert).
    - Iterations-Messprofil definieren (verkuerztes Sampling), Abschluss-Messprofil unverkuerzt.
  - Testphase (notwendig):
    - `npm run benchmark:baseline` einmal als Referenz-Lauf vor Codeaenderungen.
  - Exit:
    - Vergleichsfaehiger Vorher-Stand liegt vor.
  - Kurznotiz 2026-03-05:
    - Referenzlauf erfolgreich; Vorher-Stand gesichert in `data/performance_ki_baseline_report_phase24_0_before.json`.
    - Vollprofil: `SAMPLE_DURATION=8000ms`, `SAMPLE_INTERVAL=250ms`, `SAMPLE_WARMUP=1000ms`.
    - Trendprofil fuer 24.1-24.6 festgelegt: `SAMPLE_DURATION=2500ms`, `SAMPLE_INTERVAL=300ms`, `SAMPLE_WARMUP=400ms`.
    - Ziel-Szenarien: `24.1=V2`, `24.2=V2/V3`, `24.3=V2`, `24.4=V2`, `24.5=V3`, `24.6=V4`, `24.7=V1-V4`.

- [x] 24.1 Quick Win: Observation-Build nur bei Bedarf (abgeschlossen 2026-03-05)
  - Ziel:
    - Observation im Bot-Input-Pfad nur dann erzeugen, wenn aktive Policy sie nutzt.
  - Hauptpfade:
    - `src/entities/systems/PlayerInputSystem.js`
    - `src/entities/ai/BotRuntimeContextFactory.js` (nur falls noetig)
  - Testphase (notwendig):
    - `npm run test:core`
    - `npm run test:physics`
  - Zusatzmessung (nur wenn Phase umgesetzt):
    - verkuerzter Benchmark-Lauf zur CPU-Tendenz.
  - Exit:
    - Keine Bot-Regression, reduzierte Tick-Last in botlastigen Szenarien.
  - Kurznotiz 2026-03-05:
    - Observation-Erzeugung bedarfsgesteuert (`requiresObservation`/`usesRuntimeContext`/`getObservation`/Bridge-Typ), Runtime-Context ohne Observation-Teil fuer Rule/Hunt-Policies.
    - Verifikation: `npm run test:core`, `npm run test:physics` (nach T71-Fix erneut gezielt `npx playwright test ... -g "T71..."`).
    - Trendmessung: `tmp/perf_phase24_1_trend.json` (overall `fpsAverage=56.82`, `drawCallsAverage=19.64`, Fokus `V2 fps=58.33`).

- [x] 24.2 Observation-Wall-Probing budgetieren (abgeschlossen 2026-03-05)
  - Ziel:
    - Arena-Abfragen im Observation-Pfad reduzieren (adaptive Steps/Caching je Tick).
  - Hauptpfade:
    - `src/entities/ai/observation/ObservationSystem.js`
    - `src/entities/ai/perception/EnvironmentSamplingOps.js`
  - Testphase (notwendig):
    - `npm run test:core`
    - `npm run test:physics`
  - Zusatzmessung (notwendig):
    - verkuerzter Benchmark-Lauf mit Fokus auf Bot-Szenarien (`V2`/`V3`).
  - Exit:
    - Messbarer CPU-Gewinn ohne Sensorik-Fehlverhalten.
  - Kurznotiz 2026-03-05:
    - Adaptive Wall-Probe-Steps (`min/max`) und kurzer Reuse-Cache je nahezu identischer Pose/Orientierung eingefuehrt.
    - Verifikation: `npm run test:core`, `npm run test:physics`.
    - Trendmessung: `tmp/perf_phase24_2_trend.json` (overall `fpsAverage=58.25`, Fokus `V2=58.56`, `V3=59.19`).

- [x] 24.3 Trail-Kollision deduplizieren und Sweep-Kosten senken (abgeschlossen 2026-03-05)
  - Ziel:
    - Redundante Segmentpruefungen minimieren, Sweep-Kosten begrenzen.
  - Hauptpfade:
    - `src/entities/systems/trails/TrailCollisionQuery.js`
    - `src/entities/systems/lifecycle/PlayerCollisionPhase.js`
  - Testphase (notwendig):
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run smoke:selftrail` (nur weil Trail-Hotpath direkt betroffen ist)
  - Exit:
    - Keine Collision-Regression, weniger Hotpath-Arbeit in Trail-Kollision.
  - Kurznotiz 2026-03-05:
    - `TrailCollisionQuery.checkGlobalCollision` dedupliziert Segmentkandidaten jetzt wie der Projectile-Pfad.
    - Sweep in `PlayerCollisionPhase` nutzt konservativ adaptive Schrittzahl (geringere Kosten im selben Grid-Cell-Fall).
    - Verifikation: `npm run test:core`, `npm run test:physics` (initialer lokaler Serverabbruch, danach `--last-failed` voll gruen), `npm run smoke:selftrail`.

- [x] 24.4 MG-Tracer pooling und Hit-Sampling straffen (abgeschlossen 2026-03-05)
  - Ziel:
    - Pro-Schuss Allocation/Dispose in MG-Tracer eliminieren oder stark reduzieren.
    - Hit-Sampling im MG-Trail-Hit-Path kostenbewusst halten.
  - Hauptpfade:
    - `src/hunt/mg/MGTracerFx.js`
    - `src/hunt/mg/MGHitResolver.js`
  - Testphase (notwendig):
    - `npm run test:core`
    - `npm run test:physics`
  - Zusatzmessung (notwendig):
    - verkuerzter Benchmark-Lauf in Hunt-lastiger Konfiguration.
  - Exit:
    - Deutlich weniger kurzlebige Objekte pro MG-Feuerfolge.
  - Kurznotiz 2026-03-05:
    - `MGTracerFx` nutzt jetzt Reuse-Pool fuer Mesh/Material-Objekte (kein per-shot Dispose mehr im Normalfall).
    - `MGHitResolver` scannt Trail-Hits in kostenguensigeren Passes (enemy-first, Self-Fallback mit optionalem Dense-Check).
    - Verifikation: `npm run test:core`, `npm run test:physics` (lokaler Serverabbruch im Volllauf, danach betroffene Tests via `--last-failed` gruen).
    - Trendmessung: `tmp/perf_phase24_4_trend.json` (overall `fpsAverage=58.76`, `drawCallsAverage=28.92`).

- [x] 24.5 Portal/Gate Renderkosten reduzieren (abgeschlossen 2026-03-05)
  - Ziel:
    - Draw-Call- und Materialkosten portalreicher Maps reduzieren.
  - Hauptpfade:
    - `src/entities/arena/PortalGateMeshFactory.js`
    - `src/entities/arena/portal/PortalLayoutBuilder.js`
    - optional `src/core/Renderer.js`/`src/core/Config.js` fuer LOD/Qualitaetsstufen
  - Testphase (notwendig):
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:gpu`
  - Zusatzmessung (notwendig):
    - verkuerzter Benchmark-Lauf mit Fokus auf `V3` (portalreich).
  - Exit:
    - Draw-Calls sinken in portalreichen Szenarien bei gleichem Verhalten.
  - Kurznotiz 2026-03-05:
    - Portalmeshes erhalten in portalreichen Layouts (`>=3` Paare/Defs) automatisch einen kompakten Rendermodus (weniger Submeshes, reduzierte Segmentdichte).
    - Umsetzung in `createPortalMesh(..., options)` + `PortalLayoutBuilder`-Schalter fuer compact/non-compact.
    - Verifikation: `npm run test:core`, `npm run test:physics`, `npm run test:gpu`.
    - Trendmessung V3-fokussiert: `tmp/perf_phase24_5_trend_v3.json` (`fpsAverage=56.88`, `drawCallsAverage=21.71`).

- [x] 24.6 HUD/DOM Runtime-Updates weiter entkoppeln (abgeschlossen 2026-03-05)
  - Ziel:
    - DOM-Schreiblast in laufenden Matches weiter reduzieren (diff-basiert/throttled).
  - Hauptpfade:
    - `src/ui/HUD.js`
    - `src/ui/HudRuntimeSystem.js`
    - optional `src/hunt/HuntHUD.js`
  - Testphase (notwendig):
    - `npm run test:core`
    - `npm run test:stress`
  - Exit:
    - Keine UI-Regression bei sinkender Runtime-DOM-Last.
  - Kurznotiz 2026-03-05:
    - `HUD.js`: style/text/class writes auf diff-basierte Setter umgestellt (keine redundanten DOM-Assigns).
    - `HudRuntimeSystem.js`: Fighter-HUD Updatefrequenz via `fighterHudInterval` gedrosselt (Default `0.05s`).
    - Verifikation: `npm run test:core`, `npm run test:stress` (lokaler Serverabbruch im Volllauf, danach betroffene Tests via `--last-failed` gruen).

- [x] 24.7 Abschluss-Gate, Regression und Doku-Freeze (abgeschlossen 2026-03-05)
  - Schritte:
    - Gesamtvergleich Vorher/Nachher auf identischer Matrix.
    - Risiko- und Delta-Doku mit konkreten Zahlen.
  - Testphase (nur notwendige End-Gates):
    - `npm run benchmark:baseline` (voll, einmal)
    - `npm run test:core`
    - `npm run test:physics` (weil `src/entities/**` geaendert)
    - `npm run test:gpu` (nur falls Renderpfade in 24.5 geaendert wurden)
    - `npm run test:stress` (nur falls UI-Pfade in 24.6 geaendert wurden)
    - `npm run docs:sync`
    - `npm run docs:check`
  - Exit:
    - Deltas dokumentiert, Gates gruen, Plan- und Testergebnisdoku aktuell.
  - Kurznotiz 2026-03-05:
    - End-Gates gruen: `benchmark:baseline`, `test:core`, `test:physics`, `test:gpu`, `test:stress`, `docs:sync`, `docs:check`.
    - Vorher/Nachher (voller Lauf): overall `fpsAverage 60.001 -> 59.686 (-0.53%)`, `drawCallsAverage 46.083 -> 32.813 (-28.80%)`.
    - Portalfokus: `V3 drawCalls 87.250 -> 23.778 (-72.75%)`, `V4 drawCalls 80.077 -> 24.462 (-69.45%)`; `stuckEvents` bleiben `0`.

## Teststrategie (nur notwendige Tests)

- Regel:
  - Pro Phase nur Tests aus den geaenderten Pfaden ausfuehren.
  - Keine Vollsuite nach jeder Subphase.
  - Performance-Benchmark voll nur in 24.0 und 24.7; dazwischen verkuerzte Trendlaeufe.
- Pfadbasierte Mindesttests:
  - `src/entities/**` -> `npm run test:core` + `npm run test:physics`
  - `src/core/**` -> `npm run test:core`
  - `src/ui/**` -> `npm run test:core` + `npm run test:stress`
  - `scripts/self-trail-*.mjs` oder Trail-Hotpath-Fixes -> `npm run smoke:selftrail`

## Agent-Ausfuehrungsprotokoll

1. Immer nur eine Phase aktiv (`24.x`), keine Parallelphase.
2. Nach Code und Tests pro Phase: Checkbox setzen, kurzes Delta notieren.
3. Bei fehlgeschlagenem Gate: innerhalb derselben Phase stabilisieren, kein Phase-Sprung.
4. Nach 24.7: Abschlussbericht mit Vorher/Nachher-Werten und Restrisiken.

## Dokumentations-Hook

Bei Implementierungsabschluss verpflichtend:

- `npm run docs:sync`
- `npm run docs:check`
