# Fehlerbericht: Null-Update-Crash bei unvollstaendiger Playing-Runtime

## Aufgabe/Kontext

- Task: Crash `Cannot read properties of null (reading 'update')` im aktiven Matchfluss beheben
- Ziel: keinen Hard-Crash mehr erzeugen, wenn `PLAYING` oder `PAUSED` kurzzeitig ohne vollstaendige Match-Runtime getickt werden
- Datum: 2026-04-01

## Fehlerbild

- Beobachtung: der Client zeigt ein rotes Fehler-Overlay mit Stack aus `updatePlayingState`
- Erwartetes Verhalten: Match-Lifecycle uebergaenge duerfen auch bei asynchronem Session-Setup/-Teardown nicht abstuerzen
- Tatsaechliches Verhalten:
  - `PlayingStateSystem.update()` ruft direkte `.update(...)`-Methoden auf `entityManager`, `powerupManager`, `particles`, `arena` und `hudRuntimeSystem` auf
  - wenn einer dieser Refs waehrend eines Lifecycle-Uebergangs `null` ist, crasht der Tick sofort

## Reproduktion

1. Match starten bzw. einen Lifecycle-Uebergang rund um `PLAYING` oder `PAUSED` ausloesen
2. Session-Refs werden waehrend Init/Finalize kurz unvollstaendig oder bereits gecleart
3. `updatePlayingState` tickt trotzdem weiter und loest `null.update(...)` aus

## Betroffene Dateien/Komponenten

- `src/core/main.js`
- `src/core/InteractiveMatchRuntimeGuard.js`
- `src/core/runtime/MatchFinalizeFlowService.js`
- `src/core/PlayingStateSystem.js`

## Bereits getestete Ansaetze

- Ansatz: Return-to-Menu-UI vor Session-Teardown anwenden
- Ergebnis: reduziert einen Race-Pfad beim Finalize
- Ansatz: zentrales Lifecycle-Gate vor `PLAYING`-/`PAUSED`-Ticks einbauen
- Ergebnis: fehlende Match-Runtime fuehrt nicht mehr zum Hard-Crash; bei echtem Invariant-Bruch faellt der Client kontrolliert ins Menue zurueck

## Evidence

- Logs:
  - `Cannot read properties of null (reading 'update')`
  - Stack zeigte wiederholt `updatePlayingState`
- Screenshots/Artefakte:
  - User-Screenshot mit Fehler-Overlay vom 2026-04-01
- Relevante Commits:
  - `f1ef94f` fuer den ersten Finalize-Reihenfolge-Fix
  - Follow-up-Fix fuer Runtime-Gate im aktuellen Task

## Aktueller Stand

- Status: Fix umgesetzt, Build- und Doc-Gates gruen, manuelle Repro im laufenden Client noch offen
- Root-Cause-Stand: `PLAYING`/`PAUSED` konnten einen Frame lang ohne vollstaendige Match-Runtime laufen; der Tickpfad war dafuer nicht abgesichert

## Naechster Schritt

- Laufenden Client erneut ueber denselben Match-Pfad pruefen und bestaetigen, dass statt des Crash-Overlays entweder normal weitergespielt oder kontrolliert ins Menue zurueckgekehrt wird
