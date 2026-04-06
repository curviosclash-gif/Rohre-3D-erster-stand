# Feature: Runtime-Hardening-Followup nach V83/V84 (V87)

Stand: 2026-04-04
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V87.md`

## Ziel

Die nach `V83` und waehrend `V84` sichtbar gebliebenen Runtime-Restschulden als eigenen Hardening-Block verankern, damit kritische Rennen und inkonsistente Lifecycle-/Capability-Pfade nicht unzugeordnet zwischen Multiplayer-, Recorder- und Folgefeatures liegen bleiben.

- Matchstart, Finalize, Return-to-Menu, Pause/Resume und Runtime-Commands sollen deterministisch und beobachtbar bleiben.
- Plattform-Capabilities und UI-Intents sollen echte Verfuegbarkeit melden statt implizite Null- oder Fire-and-forget-Pfade zu verstecken.
- Folgeblocks wie `V64`, `V75` und `V76` sollen auf einem haerteren Runtime-Kern aufsetzen koennen, statt bekannte Risiken mitzuschleppen.

## Desktop-first Scope

- Desktop-App bleibt die fuehrende Produktflaeche fuer Host-, Save-, Pause- und Finalize-Verhalten.
- Browser-/Demo-Pfade werden nur soweit angepasst, wie der gemeinsame Runtime- oder Capability-Vertrag es verlangt.
- Kein Ausbau neuer Produktoberflaechen; Fokus liegt auf Hardening vorhandener Kernpfade.

## Nicht-Ziel

- Kein neuer Headless-Kernel- oder GameMode-Block; das bleibt in `V84`.
- Kein voller Multiplayer-Produktisierungsblock; das bleibt in `V64`.
- Kein Recorder-Export- oder Surface-Policy-Redesign; das bleibt in `V75` bzw. `V77`.
- Keine neuen Legacy-Backdoors, um bekannte Rennen nur zu umgehen.

## Betroffene Dateien und Bereiche

- `src/state/MatchLifecycleSessionOrchestrator.js`
- `src/ui/MatchFlowUiController.js`
- `src/core/runtime/GameRuntimeSessionHandler.js`
- `src/application/session-runtime/SessionRuntimeCommandExecutor.js`
- `src/ui/PauseOverlayController.js`
- `src/platform/electron/ElectronPlatformBridge.js`
- `src/shared/contracts/SessionRuntimeStateMachine.js`
- `src/shared/runtime/SessionRuntimeObservability.js`
- `src/core/GameRuntimeFacade.js`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 Kritische Matchstart-, Finalize- und Return-to-Menu-Rennen sind technisch oder vertraglich geschlossen.
- [ ] DoD.2 Pause-, Command- und Capability-Pfade melden Verfuegbarkeit, Fehler und Lifecycle-Zustand konsistent.
- [ ] DoD.3 Runtime-State-Machine und Observability decken die haerteten Uebergaenge ohne versteckte Bypass-Pfade ab.
- [ ] DoD.4 `V64`, `V75` und weitere Folgebloecke haben einen klaren, dokumentierten Runtime-Hardening-Stand statt offener Hochrisiko-Restschulden.
- [ ] DoD.5 Architektur-, Plan- und Doku-Gates sind fuer den betroffenen Scope synchronisiert.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V87`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V87.md`
- hard dependencies: `V83.99`
- soft dependencies: `V84.99`, `V75.99`, `V64.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 87.1 Restschuld-Inventar und Ownership fixieren

- [ ] 87.1.1 Die offenen Review-Punkte aus Matchstart, Finalize, Pause, Commands, Capability-Bridge und State-Machine gegen aktuelle Dateien und Commits abgleichen.
- [ ] 87.1.2 Fuer jeden Restpunkt Zielmodul, Besitzerpfad und Sunset-Kriterium festlegen, damit keine unzugeordneten Runtime-Schulden im Master bleiben.

### 87.2 Lifecycle- und Finalize-Rennen haerten

- [ ] 87.2.1 Matchstart-, Session-Erzeugungs- und Finalize-Rennen in `MatchLifecycleSessionOrchestrator`, `GameRuntimeSessionHandler` und angrenzenden Ports deterministisch schliessen.
- [ ] 87.2.2 Return-to-Menu-, Dispose- und Fehlerpfade so angleichen, dass Finalize-Fehler nicht stillen inkonsistenten Zustand hinterlassen.

### 87.3 Commands, Capabilities und Fehlerpfade angleichen

- [ ] 87.3.1 `SessionRuntimeCommandExecutor` und verwandte Command-Pfade auf eindeutige Fehler- und Snapshot-Semantik heben.
- [ ] 87.3.2 `ElectronPlatformBridge` und andere Capability-Adapter so haerten, dass `available`, Intent-Erzeugung und Fallbacks denselben Vertrag sprechen.

### 87.4 Pause-, UI- und State-Machine-Uebergaenge absichern

- [ ] 87.4.1 `PauseOverlayController` und UI-Intents gegen TOCTOU- und Mehrfachausloese-Rennen absichern.
- [ ] 87.4.2 `SessionRuntimeStateMachine` und Observability so schaerfen, dass kritische FINALIZING-, MENU- und Cleanup-Uebergaenge nicht umgangen werden koennen.

### 87.5 Folgeverbrauch und Dokumentation synchronisieren

- [ ] 87.5.1 `V64`, `V75` und Referenzdoku auf den geharteten Runtime-Stand spiegeln.
- [ ] 87.5.2 Characterization- oder Contract-Checks fuer die geharteten Pfade vorbereiten, damit Folgearbeit nicht nur auf manuellem Vertrauen basiert.

### 87.99 Abschluss-Gate

- [ ] 87.99.1 Runtime-Hardening-Scope-Checks sowie `npm run architecture:report`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruensicher.
- [ ] 87.99.2 Kritische oder hohe Runtime-Restschulden aus Matchstart, Finalize, Pause, Commands und Capability-Bridge sind abgearbeitet oder blockerfest dokumentiert.

## Risiken

- R1 | hoch | Hardening oeffnet verdeckte Race-Conditions in Multiplayer-, Recorder- oder Menuerueckkehrpfaden.
- R2 | hoch | Ein zu breiter Follow-up-Scope verwischt wieder die Grenzen zu `V64`, `V75` oder `V77`.
- R3 | mittel | Observability und State-Machine bleiben zu locker, wenn nur Einzelfehler statt ganzer Uebergangspfade gehartet werden.
- R4 | mittel | Alte Workarounds oder Legacy-Adapter schleichen sich zurueck, wenn harte Capability- oder Finalize-Vertraege fehlen.
