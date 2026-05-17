# Feature: Runtime Rebuild-, Remount- und StartSync-Stabilisierung (V100)

Stand: 2026-04-20
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V100.md`

## Ziel

Die akutesten Runtime-Sanierungspunkte aus Arena-Rebuild, App-Remount und Start-Setup-Sync in einem kleinen, klaren Stabilisierungsblock schliessen:

- Arena-Rebuilds duerfen keine alten Portal-, Gate- oder Checkpoint-Visuals in Scene, Registry oder Batch-Zustand zuruecklassen.
- Runtime-Remounts muessen alten Dispose/Teardown vollstaendig abschliessen, bevor neuer Global- oder Runtime-State wieder publiziert wird.
- Start- und Setup-Sync im UI sollen pro relevanter State-Aenderung koordiniert und dedupliziert laufen statt mehrfach pro Runde dieselben DOM- und Menu-Pfade zu triggern.

## Desktop-first Scope

- Desktop-App bleibt primaeres Ziel, weil Remount-, Dispose- und Global-Pfade dort das hoechste Produkt-Risiko tragen.
- Browser-/Demo-Auswirkungen bleiben auf dieselben Shared- oder UI-Controller begrenzt; kein Browser-first-Paritaetsausbau.
- Multiplayer-, Parcours- und Surface-Folgen werden nur dort angepasst, wo derselbe Stabilitaetsvertrag benoetigt wird.

## Nicht-Ziel

- Kein grossflaechiger Arena- oder UI-Refactor jenseits klarer Teardown-, Remount- und Sync-Pfade.
- Kein neuer Global-Slot oder paralleler Lifecycle-Manager neben `AppInitializer` und vorhandenem Runtime-Dispose.
- Kein Bundle-, Recorder- oder Settings-Studio-Refactor in diesem Block.

## Betroffene Dateien und Bereiche

- `src/entities/Arena.js`
- `src/entities/arena/portal/PortalLayoutBuilder.js`
- `src/entities/arena/portal/**`
- `src/core/AppInitializer.js`
- `src/core/main.js`
- `src/ui/UIManager.js`
- `src/ui/UIStartSyncController.js`
- `tests/core-targeted-runtime.spec.js`
- `tests/core-targeted-regressions.spec.js`
- `tests/runtime-regressions.contract.test.mjs`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 Arena-Rebuild fuehrt vor jedem Neuaufbau einen echten Reset-/Dispose-Pfad fuer Portal-, Gate- und Checkpoint-Visuals aus; alte Scene-Objekte oder Registry-Batches bleiben nicht haengen.
- [ ] DoD.2 `AppInitializer` oder derselbe kanonische Bootstrap-Pfad serialisiert Remount so, dass altes Runtime-Dispose sichtbar abgeschlossen ist, bevor ein neuer Mount globale Handles oder UI-Observer wieder freigibt.
- [ ] DoD.3 `UIManager` und `UIStartSyncController` fuehren Start-/Setup-Sync pro relevanter State-Aenderung koordiniert und dedupliziert aus; Mehrfach-Trigger derselben Runde werden unterdrueckt oder bewusst begrenzt.
- [ ] DoD.4 Guard-Tests decken mindestens Arena-Rebuild, Runtime-Remount und UI-StartSync-Rueckfallpfade ab oder externe Blocker sind blockerfest dokumentiert.
- [ ] DoD.5 Die Haertung respektiert den `V92`-Sunset fuer Runtime-Globals; keine neuen `GAME_INSTANCE`-, `runtimeFacade`- oder `GameRuntimePorts`-Bypaesse entstehen.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V100`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V100.md`
- hard dependencies: `V92.99`
- soft dependencies: `V64.99`, `V82.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Empfohlene Zuordnung angrenzender Sanierungspunkte

Nicht alle Punkte aus dem Sanierungsplan gehoeren in denselben Block:

- In `V100` aufnehmen:
  - teardown-sicherer Arena-Rebuild
  - serialisierter App-Remount
  - deduplizierter Start-/Setup-Sync
  - Guard-Tests fuer Rebuild und Remount
- In `V99` mitnehmen:
  - Host-Leave-/Disconnect-Guard im `StorageLobbyService` und angrenzenden Multiplayer-Failure-Pfaden
- In `V96` mitnehmen:
  - globalen Runtime-Config-Slot abbauen
  - `MatchRuntimeProjectionContract` versionieren und Fallback-/Migrationsregeln schneiden
  - `curviosApp` aus `SettingsRuntimeLimitsContract` ziehen
  - Persistenz aus `ArcadeRunRuntime`-Hotpaths loesen
- In `V75` oder separatem Performance-Follow-up beobachten:
  - `MediaRecorderSystem` und `RecordingCapturePipeline` als Recorder-Hotspots
  - Bundle-Groesse und spaeteres Code-Splitting fuer Training-, Recorder- und Editor-nahe Pfade
- In `V77` als Leitplanke belassen:
  - Dev-only-Schalter wie `MenuExpertLoginRuntime` nicht als Sicherheits- oder Produktgrenze ausweiten

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 100.1 Rebuild- und Remount-Iststand inventarisieren
status: open
goal: Konkrete Leck- und Reihenfolgepfade sichtbar machen
output: Ist-/Soll-Matrix fuer Arena-Rebuild, Remount und UI-StartSync

- [ ] 100.1.1 Portal-, Gate- und Checkpoint-Visual-Lifecycle in `Arena.js` und `PortalLayoutBuilder.js` inventarisieren: Aufbau, Registry, Batch, Dispose, Rebuild-Reihenfolge.
- [ ] 100.1.2 Bootstrap-/Dispose-Reihenfolge in `AppInitializer.js` und `main.js` sowie Triggerkette `UIManager` -> `UIStartSyncController` pro Runde als Ist-Snapshot festhalten.

### 100.2 Arena-Rebuild teardown-sicher machen
status: open
goal: Neuaufbau ohne Altlasten in Scene oder Registry
output: Expliziter Reset-/Dispose-Pfad fuer Portal-, Gate- und Checkpoint-Visuals

- [ ] 100.2.1 Vor jedem Arena-Neuaufbau einen kanonischen Reset fuer Portal-, Gate- und Checkpoint-Visuals einfuehren; alte Scene-Objekte, Registries und Batches werden deterministisch entsorgt.
- [ ] 100.2.2 Rebuild-Pfade gegen mehrfache Aufrufe und teils initialisierte Layouts absichern, ohne neue Visual-Dopplungen oder Dispose-Fehler zu erzeugen.

### 100.3 Runtime-Remount serialisieren
status: open
goal: Neuer Mount startet erst nach abgeschlossenem alten Teardown
output: Sichtbare, deduplizierte Remount-Reihenfolge

- [ ] 100.3.1 `AppInitializer` so nachschaerfen, dass altes Dispose/Teardown awaitbar oder explizit serialisiert ist, bevor neuer Runtime-State publiziert oder abonniert wird.
- [ ] 100.3.2 Remount-Guard gegen doppelte Starts, ueberschneidende Disposes und halb entsorgte Globals ergaenzen; `V92`-Ratchet bleibt unverletzt.

### 100.4 Start-Setup-Sync deduplizieren
status: open
goal: Ein koordinierter Sync pro relevanter State-Aenderung
output: Weniger DOM-Churn, weniger Drift, klarer Sync-Vertrag

- [ ] 100.4.1 Triggerpfade zwischen `UIManager` und `UIStartSyncController` auf einen koordinierten Sync pro State-Aenderung zusammenschneiden; Mehrfach-Trigger derselben Runde werden entfernt oder zentral gedrosselt.
- [ ] 100.4.2 Sync-Vertrag so spiegeln, dass Surface-, Multiplayer- und Setup-Darstellung denselben Snapshot nutzen und keine privaten Manager-Interna mehrfach lesen.

### 100.5 Guard-Tests und Referenzspiegelung
status: open
goal: Sanierung gegen Rueckfall absichern
output: Rebuild-/Remount-/Sync-Guardrails mit nachvollziehbarer Evidence

- [ ] 100.5.1 Relevante targeted- oder contract-Tests fuer Arena-Rebuild, Runtime-Remount und deduplizierten StartSync ergaenzen.
- [ ] 100.5.2 Referenzdoku und Test-Mapping auf denselben Dispose-, Remount- und Sync-Vertrag heben.

### 100.99 Abschluss-Gate
status: open
goal: Runtime-Stabilisierung gruensicher abschliessen
output: Reproduzierbare Evidence fuer Rebuild-, Remount- und Sync-Haertung

- [ ] 100.99.1 Relevante targeted-/contract-Tests fuer den geaenderten Scope sind gruensicher oder blockerfest dokumentiert.
- [ ] 100.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.
- [ ] 100.99.3 Keine neuen Runtime-Globals, Restadapter oder UI-Reach-throughs im migrierten Scope.

## Risiken

- R1 | hoch | Dispose- und Rebuild-Haertung verschiebt Fehler nur, wenn versteckte Nebenregister oder Scene-Batches ausserhalb des kanonischen Reset-Pfads verbleiben.
- R2 | hoch | Serialisierter Remount kann Boot oder Return-to-Menu blockieren, wenn bestehende Dispose-Promises nie sauber finalisieren.
- R3 | mittel | Zu aggressive Sync-Deduplizierung verliert legitime UI-Updates, wenn Trigger-Gruende nicht sauber geschnitten werden.
- R4 | mittel | Tests decken DOM- oder Render-Lecks nur teilweise ab und brauchen blockerfeste Referenz-Evidence fuer Restunsicherheit.
