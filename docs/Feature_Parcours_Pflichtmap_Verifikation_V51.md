# Feature: Parcours-Pflichtmap mit Lauf-Verifikation (V51)

Stand: 2026-03-22  
Status: Abgeschlossen  
Owner: Codex

## Ziel

Eine neue Map als "Skill-Parcours" einfuehren, die nicht nur frei bespielt wird, sondern in einer definierten Reihenfolge absolviert werden muss.  
Der Match-Fortschritt soll fuer jeden Spieler deterministisch und manipulationsarm verifiziert werden, inklusive klarer Signale in HUD, Toasts und Round-End-Logik.

## Kreatives Map-Konzept: "Rift Gauntlet"

Die Map besteht aus 6 zusammenhaengenden Parcours-Sektoren und wirkt wie eine Trainingsanlage in einer instabilen Portal-Zitadelle:

- Sektor A "Launch Deck": sichtbarer Startkorridor, klare Linienfuehrung, erstes Erfolgsgefuehl.
- Sektor B "Foam Needle": enger Slalom aus Hard/Foam-Wechseln mit einem optionalen Risiko-Shortcut.
- Sektor C "Tunnel Spine": laengerer Tube-Abschnitt mit Rhythmuswechseln und zwei versetzten Ausgaengen.
- Sektor D "Helix Lift": vertikaler Aufstieg ueber Portal-Level und Slingshot-Impulse.
- Sektor E "Split Cathedral": symmetrische Doppelkorridore mit Rueckfuehrung auf eine gemeinsame Finish-Achse.
- Sektor F "Crown Gate": finales Gate-Fenster mit klarer Zielsignatur und spectator-tauglicher Sichtachse.

## Parcours-Route (Pflichtreihenfolge)

Jeder Lauf nutzt dieselbe Reihenfolge; optionale Side-Lanes sind erlaubt, zaehlen aber nicht als Fortschritt.

| Route-ID | Typ | Zweck | Kernregel |
| --- | --- | --- | --- |
| CP01 | entry | Startvalidierung | Nur gueltig nach Spawn und Vorwaerts-Durchflug |
| CP02 | gate | Slalom Exit | Muss nach CP01 und innerhalb Zeitfenster kommen |
| CP03 | tunnel | Tunnel-Mitte | Nur gueltig, wenn aus korrekter Richtung durchflogen |
| CP04 | gate | Vertikalwechsel 1 | Portal-/Gate-Hybrid mit Richtungspruefung |
| CP05 | gate | Vertikalwechsel 2 | Nur gueltig nach CP04 (kein Ruecksprung) |
| CP06 | split | Linke/rechte Lane Merge | Beide Lanes mappen auf denselben Fortschrittspunkt |
| CP07 | precision | Enge Passage | Kleiner Radius, hohe Praezision |
| CP08 | finish_pre | Zielvorraum | Armierung fuer Finish-Pruefung |
| FINISH | finish | Laufabschluss | Nur gueltig, wenn CP01-CP08 in Reihenfolge erledigt sind |

## Verifikationsmechanik (spielseitig)

### 1. Datenmodell (Map/Schema)

Neue optionale Map-Section `parcours`:

- `enabled`: aktiviert Parcourslogik fuer diese Map.
- `routeId`: technische Versions-ID (z. B. `rift_gauntlet_v1`).
- `checkpoints[]`: geordnete Liste mit `id`, `type`, `pos`, `radius`, `forward`, `params`.
- `rules`: Verhaltensregeln (`ordered=true`, `resetOnDeath`, `maxSegmentTimeMs`, `allowLaneAliases`).
- `finish`: finaler Abschlusspunkt mit eigener Richtungs- und Radiuspruefung.

### 2. Laufzeit-Tracking pro Spieler

Pro Spieler ein kompakter Progress-State:

- `nextCheckpointIndex`
- `passedMask` (Bitset oder bool-array)
- `startedAtMs`, `lastCheckpointAtMs`
- `wrongOrderCount`, `resetCount`
- `completed`, `completedAtMs`

### 3. Validierungslogik pro Checkpoint

Checkpoint gilt nur als getroffen, wenn alle Bedingungen erfuellt sind:

- Distanzregel: Kugelschnitt `playerRadius + checkpointRadius`.
- Richtungsregel: Crossing-Test analog SpecialGate (`dotPrev <= 0 && dotCurr > 0`).
- Reihenfolgeregel: nur `checkpoint.index === nextCheckpointIndex` (Alias-Lanes ausgenommen).
- Zeitregel: Segmentzeit <= konfiguriertes Fenster.
- Cooldownregel: Re-Trigger-Schutz gegen Pendeln/Exploit.

### 4. Abschlussbedingung

- `completed=true` erst bei FINISH-Crossing nach vollstaendiger Sequenz.
- Round-End kann (map-abhaengig) ueber `winnerByParcoursComplete` ausgeloest werden.
- Bei mehreren Human-Spielern gewinnt zuerst verifizierter Abschlusszeitpunkt.

### 5. Exploit-Schutz

- Out-of-order Treffer erzeugen kein Fortschrittsinkrement.
- Portal-Spruenge koennen pro Route explizit als erlaubte Kante hinterlegt werden.
- Respawn-Verhalten konfigurierbar:
- `resetOnDeath=true`: kompletter Reset.
- `resetToLastValid=true`: Rueckfall auf letzten gueltigen Checkpoint.

### 6. Sichtbarkeit fuer Spieler

- HUD: `CP 3/8` + Segment-Timer + Fehlerindikator bei ungultiger Reihenfolge.
- Toasts: "Checkpoint validiert", "Falsche Reihenfolge", "Parcours abgeschlossen".
- Match-End Overlay: Siegergrund "Parcours abgeschlossen" + Laufzeit.

## Betroffene Dateien (geplant)

- `src/core/config/maps/MapPresetCatalogBaseData.js`
- `src/core/config/maps/presets/showcase_maps.js` oder neues `src/core/config/maps/presets/parcours_maps.js`
- `src/core/config/maps/MapPresetCatalog.js`
- `src/entities/mapSchema/MapSchemaMigrationOps.js`
- `src/entities/mapSchema/MapSchemaSanitizeOps.js`
- `src/entities/mapSchema/MapSchemaRuntimeOps.js`
- `editor/js/EditorMapSerializer.js`
- `editor/js/EditorMapManager.js`
- `src/entities/Arena.js`
- `src/entities/arena/PortalGateSystem.js`
- `src/entities/arena/portal/PortalLayoutBuilder.js`
- `src/entities/systems/lifecycle/PlayerInteractionPhase.js`
- `src/entities/systems/PlayerLifecycleSystem.js`
- `src/entities/systems/RoundOutcomeSystem.js`
- `src/entities/runtime/EntityTickPipeline.js`
- `src/state/MatchSessionFactory.js`
- `src/ui/HudRuntimeSystem.js`
- `src/ui/MatchFlowUiController.js`
- `src/state/recorder/RoundMetricsStore.js`
- `src/state/RoundRecorder.js`
- `tests/core.spec.js`
- `tests/physics-core.spec.js`
- `tests/stress.spec.js`
- `docs/Umsetzungsplan.md`

## Architektur-Check

- Reuse statt Parallel-System:
- Checkpoint-Crossing wird auf dem existierenden Gate-Crossing-Prinzip aufgebaut.
- Fortschritt wird in bestehende Entity-/Round-Pipeline integriert (kein zweiter Match-State-Loop).
- Victory-Entscheidung bleibt in `RoundOutcomeSystem`/`EntityTickPipeline`, wird aber um map-bedingte Objective-Signale erweitert.
- Session-/Multiplayer-Pfade erhalten denselben Verifikations-Eventfluss (Host autoritativ, Clients nur Anzeige).

Risiko-Einstufung: **hoch**  
Grund: Eingriff in Map-Schema, Runtime-Lifecycle, Round-End und HUD gleichzeitig.

Datei-Ownership-Check:

- Scope beruehrt `src/core/**`, `src/state/**`, `src/ui/**` und ist damit von V50-Randbedingungen betroffen.
- Umsetzung erst nach klarer V50-Abstimmung oder in strikt gekapselten, conflict-gelogten Teilschritten starten.

Dokumentationswirkung:

- `docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md`
- `docs/Umsetzungsplan.md`
- bei Umsetzung zusaetzlich Test-/Playtest-Artefakte fuer Laufverifikation

## Phasenplan

- [x] 51.1 Parcours-Design und Route-Spezifikation (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js -> `parcours_rift` Route spezifiziert)
  - [x] 51.1.1 Finale Topologie "Rift Gauntlet" mit Sector-Flows, Sichtachsen, Risiko-Shortcuts und Rueckfuehrungen festgezurrt (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js -> Sektoren/Flow authored)
  - [x] 51.1.2 Checkpoint/Finish-Contract (IDs, Reihenfolge, Radius, Richtung, Segmentbudgets) als feste Route-Definition dokumentiert (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + Abschnitt "Parcours-Route")

- [x] 51.2 Schema- und Editor-Erweiterung (abgeschlossen: 2026-03-22; evidence: src/entities/mapSchema/* + editor/js/EditorMapSerializer.js -> `parcours` roundtrip-faehig)
  - [x] 51.2.1 `MapSchema` um `parcours`-Section (Migration, Sanitize, Runtime-Mapping) erweitert (abgeschlossen: 2026-03-22; evidence: src/entities/mapSchema/MapSchemaMigrationOps.js + MapSchemaSanitizeOps.js + MapSchemaRuntimeOps.js)
  - [x] 51.2.2 Editor Import/Export und Metadatenhaltung fuer `parcours.checkpoints` round-trip-faehig gemacht (abgeschlossen: 2026-03-22; evidence: editor/js/EditorMapSerializer.js + npm run test:core -> PASS (T14g))

- [x] 51.3 Runtime-Verifikation und Fortschrittszustand (abgeschlossen: 2026-03-22; evidence: src/entities/systems/ParcoursProgressSystem.js + Runtime-Pipeline-Integration)
  - [x] 51.3.1 `ParcoursProgressSystem` fuer ordered Checkpoint-Pruefung, Cooldowns und Segment-Timer eingefuehrt (abgeschlossen: 2026-03-22; evidence: src/entities/systems/ParcoursProgressSystem.js + npm run test:physics -> PASS (T60a/T60b/T60c))
  - [x] 51.3.2 Player-Lifecycle angereichert, damit Checkpoint-Crossings pro Tick deterministisch verarbeitet werden (abgeschlossen: 2026-03-22; evidence: src/entities/systems/PlayerLifecycleSystem.js + src/entities/runtime/EntityTickPipeline.js)

- [x] 51.4 Match-Logik, HUD und Feedback (abgeschlossen: 2026-03-22; evidence: Objective-Reason + HUD/Overlay im Lauf aktiv)
  - [x] 51.4.1 Round-Outcome um "Parcours abgeschlossen" als Gewinnergrund erweitert (abgeschlossen: 2026-03-22; evidence: src/entities/systems/RoundOutcomeSystem.js + src/state/RoundStateOps.js)
  - [x] 51.4.2 HUD/Toast/Overlay um Progress-Anzeige (`CP n/m`, Fehlerstatus, Completion-Time) erweitert (abgeschlossen: 2026-03-22; evidence: src/ui/HudRuntimeSystem.js + index.html + style.css + npm run test:core -> PASS (T14f))

- [x] 51.5 Content-Authoring der Map (abgeschlossen: 2026-03-22; evidence: `parcours_rift` Preset aktiv im Katalog)
  - [x] 51.5.1 Neues Preset `parcours_rift` mit Hard/Foam/Tunnel/Portal/Gate-Kombination aufgebaut (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + src/core/config/maps/MapPresetCatalog.js)
  - [x] 51.5.2 Spawn-, Item- und Bot-Lanes so austariert, dass Parcours-Druck hoch bleibt, aber nicht unfair wird (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + npm run test:core -> PASS (T14/T14f))

- [x] 51.6 Test- und Anti-Exploit-Absicherung (abgeschlossen: 2026-03-22; evidence: Tests + Telemetry-Felder integriert)
  - [x] 51.6.1 Automatisierte Tests fuer Reihenfolgefehler, Portal-Abkuerzungen, Respawn-Reset und Finish-Validierung ergaenzt (abgeschlossen: 2026-03-22; evidence: tests/core.spec.js + tests/physics-core.spec.js + tests/stress.spec.js -> T14f/T14g/T60a-c/T81)
  - [x] 51.6.2 Playtests (1P, 2P, Bot-lastig) gefahren und Telemetrie fuer Completion-Rate/Median-Laufzeit ausgewertet (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:stress + src/state/recorder/RoundMetricsStore.js + src/ui/menu/MenuTelemetryDashboard.js)

- [x] 51.99 Abschluss-Gate (abgeschlossen: 2026-03-22; evidence: Pflicht-Checks fuer Build/Docs/Governance PASS)
  - [x] 51.99.1 `npm run test:core`, `npm run test:physics`, `npm run test:stress`, `npm run build` fuer den Scope gruen (abgeschlossen: 2026-03-22; evidence: Pflicht-Testlauf + Build -> PASS)
  - [x] 51.99.2 `npm run docs:sync`, `npm run docs:check`, Conflict-Log und Plan-Governance vollstaendig abgeschlossen (abgeschlossen: 2026-03-22; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)

## Verifikationsstrategie (DoD-fokussiert)

- Technisch abgeschlossen, wenn eine Runde auf `parcours_rift` nur bei valider Sequenz CP01..CP08 + FINISH als "completed" gewertet wird.
- Robust abgeschlossen, wenn falschreihige und abkuerzende Pfade keinen Completion-Status erzeugen.
- UX-abgeschlossen, wenn Spieler den Fortschritt ohne Debugtools in HUD/Overlay verstehen.
- Betriebsabgeschlossen, wenn Replay/Recorder/Telemetry Completion-Faelle konsistent abbilden.

## Frische-Hinweis

Vor Abschluss der spaeteren Umsetzung muessen `npm run docs:sync` und `npm run docs:check` als letzter Schritt laufen.
