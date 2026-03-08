# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-08

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

## Schnellindex Offener Arbeit

- `V26 Gameplay & Features`: `V4`, `V5`, `V9`, `V11`, `V16`
- `V27 Profile, Statistiken & UI`: `V7`, `V8`, `V15`
- `V28 Architektur & Performance`: `V13`, Player-/Bot-God-Class-Refactoring
- `Nachlauf / Technik`: `N1` Multiplayer-Runtime, `N2` Recording-UI, `N3` T82-Policy-Fix (geparkt), `T1` Testersatz, `T2` Bundle-Groesse

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

- Scope: `V4`, `V5`, `V9`, `V11`, `V16`
- Hauptpfade: `src/hunt/**`, `src/entities/**`, `src/core/**`, `src/ui/**`
- Konfliktregel: keine neuen fremden Plaene mitten in diesen Block einfuegen; neue Arbeit nur im `Plan-Eingang` ankuendigen

- [x] 26.0 Baseline-Freeze und Gameplay-Metriken erfassen
  - Status 2026-03-08: Baseline ueber `npm run benchmark:baseline` neu eingefroren (`overall fpsAverage=60.00`, `overall drawCallsAverage=25.49`, `botWinRate=82.4%`, `stuckEvents=0`; Artefakte: `data/performance_ki_baseline_report.json`, `docs/Testergebnisse_2026-03-08.md`).
- [ ] 26.1 V4 Treffer-/Schadensfeedback (Audio & VFX)
  - [ ] 26.1.1 Audio-Signale fuer MG, Raketen und Schild implementieren
  - [ ] 26.1.2 VFX-Signale (Partikel/Flashes) bei Treffern ausbauen
- [ ] 26.2 V5 Hunt-Mode Feintuning
  - [ ] 26.2.1 TTK und Overheat-Werte basierend auf Testdaten anpassen
  - [ ] 26.2.2 Respawn- und Pickup-Logik verfeinern
- [ ] 26.4 V9 Replay/Ghost-System fuer die letzte Runde aufbauen
- [ ] 26.5 V11 GLB-Map Loader Integration (konsolidiert aus altem Detailplan)
  - [ ] 26.5.1 `GLTFLoader`/`GLBMapLoader` einfuehren
  - [ ] 26.5.2 `glbModel` in Map-Definitionen und Schema aufnehmen
  - [ ] 26.5.3 `Arena.build()` asynchron machen und Fallback-Pfad absichern
  - [ ] 26.5.4 Beispiel-GLB oder reproduzierbares Test-Asset bereitstellen
  - [ ] 26.5.5 UI-Integration fuer Map-Auswahl und Ladezustand nachziehen
  - [ ] 26.5.6 GLB-Loader-Test, Fallback-Test und manuelle Verifikation abschliessen
- [ ] 26.6 V16 Event-Playlist / Fun-Modes Mechanik testen
- [ ] 26.8 Abschluss-Gate, Playtest und Doku-Freeze (`docs:sync`, `docs:check`)

### Block V27: Profile, Statistiken & UI

- Scope: `V7`, `V8`, `V15`
- Hauptpfade: `src/ui/**`, `src/state/**`, `scripts/**`, `data/**`
- Konfliktregel: Statistik-/Profil-Details nur in diesem Block pflegen

- [x] 27.0 Baseline-Freeze und UI-Markup-Analyse
  - Abgeschlossen am: `2026-03-08`
  - Status 2026-03-08:
    - Baseline-Analyse fuer V27 in `docs/Feature_Profile_Statistiken_UI_V27.md` festgeschrieben.
    - Contract-Freeze gesetzt fuer bestehende Profil-IDs (`#profile-name`, `#btn-profile-save`, `#profile-select`, `#btn-profile-load`, `#btn-profile-delete`) und Round-End-Overlay (`#message-overlay`, `#message-text`, `#message-sub`).
    - Iststand bestaetigt: Round/Match-Metriken sind in `RoundRecorder`/`RoundMetricsStore` verfuegbar, aber UI-seitig noch nicht als vertiefte Post-Match-Ansicht verdrahtet.
- [ ] 27.1 V7 Profile-UX Ausbau
  - [ ] 27.1.1 Duplizieren und Import/Export-Funktion
  - [ ] 27.1.2 Standardprofil-Markierung ergaenzen
- [ ] 27.2 V8 Post-Match-Statistiken
  - [ ] 27.2.1 Datenaggregator fuer Round/Match-Stats ausbauen
  - [ ] 27.2.2 UI-Overlay fuer vertiefte Statistiken am Rundenende
- [ ] 27.3 V15 Telemetrie-Dashboard fuer iteratives Balancing
- [ ] 27.4 Abschluss-Gate, UI-Verifikation und Doku-Freeze (`docs:sync`, `docs:check`)

### Block V28: Architektur & Performance

- Scope: `V13`, Player-/Bot-God-Class-Refactoring
- Hauptpfade: `src/entities/**`, `src/core/**`
- Konfliktregel: `maze`-Optimierung und Klassen-Splits bleiben in diesem Block gebuendelt

- [x] 28.0 Baseline-Freeze und Regression-Setup (abgeschlossen 2026-03-08)
- [ ] 28.1 Player "God Class" Refactoring
  - [ ] 28.1.1 Three.js Rendering in `PlayerView` auslagern
  - [ ] 28.1.2 Input-Handling in `PlayerController` isolieren
- [ ] 28.2 Bot "God Class" Refactoring
  - [ ] 28.2.1 Rendering in `BotView` kapseln
  - [ ] 28.2.2 Sensing/Probing-Logik fuer kuenftiges ML-Training abstrahieren
- [ ] 28.3 V13 Performance-Hotspot `maze` (Draw-Calls / Batching optimieren)
- [ ] 28.4 Abschluss-Gate, Performance-Metrics pruefen und Doku-Freeze (`docs:sync`, `docs:check`)
  - Status 2026-03-08: 28.0 abgeschlossen (`benchmark:baseline` erneuert, neuer Harness `npm run test:v28:regression`; Referenzen `data/performance_ki_baseline_report.json` und `docs/Testergebnisse_2026-03-08.md`).
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
- [ ] N3 T82 Policy-Wiring isolieren und spaeter separat beheben (Punkt 5 geparkt)
  - Ziel: Divergenz in `tests/physics-policy.spec.js` (`T82`: erwartet `hunt-bridge`, erhaelt `classic-bridge`) isolieren und minimal fixen.
  - Status: bewusst separat vom Cinematic-Follow-up geparkt; nicht Teil von `docs/Feature_Cinematic_Camera_Followup_V29b.md`.
  - Verifikation (bei Abarbeitung): `npm run test:physics -- -g "T81|T82"` plus `npm run docs:sync` und `npm run docs:check`.
- [ ] T1 Dummy-Tests schrittweise durch echte Integritaetstests ersetzen
  - Ziel: bestehende Platzhaltertests entlang des geaenderten Codes ersetzen.
  - Status 2026-03-07: Playwright-Menuecheck erfolgreich (`npm run test:core` = 48 passed / 1 skipped, `npm run test:stress` = 19 passed).
  - Offene Befunde 2026-03-07: `Profil speichern` bleibt nach Eingabe deaktiviert; `Build-Info kopieren` hat kein Runtime-Binding.
- [ ] T2 Bundle-Groesse weiter optimieren
  - Ziel: Code-Splitting und Ladepfade nur dann vertiefen, wenn der Nutzen messbar bleibt.

## Plan-Eingang (append-only)

Regeln:

- Neue Plaene eines zweiten Agenten nur hier am Ende anhaengen.
- Bestehende Bloecke dafuer nicht umsortieren.
- Pro neuem Plan genau einen Eintrag anlegen; die spaetere Einsortierung passiert separat.

Template:

- [ ] PX Kurztitel
  - Erstellt am: `YYYY-MM-DD`
  - Agent: `A` oder `B`
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


