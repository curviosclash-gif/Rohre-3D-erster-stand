# BT80C Runtime-Startpfad fuer Validation-Ueberlauf

Stand: 2026-04-03
Status: Entwurf
Owner: Codex

## Anlass

- Die BT80C-Subphase `80.9.3` sollte `bot:validate` im Trainingsscope stabilisieren.
- Die aktuelle Analyse zeigt jedoch: `bot:validate` scheitert nicht nur am Harness, sondern am normalen Matchstart-/Session-Aufbau der App.
- Im `preview`-Pfad bootet die App, `applyBotValidationScenario(0)` bleibt ohne Start-Validierungsfehler, aber `startMatch()` loggt `Missing interactive match runtime` und faellt wieder nach `MENU` zurueck.
- Im `dev`-Pfad antworten `@vite/client` und `src/core/main.js` erst nach jeweils ca. 12s; der Runner wartet dadurch selbst mit `appReady=180000ms` vergeblich auf `GAME_INSTANCE`.

## Warum BT80C hier in normalen Spielscope ueberlaeuft

- Ein Runner-only-Fix reicht nicht aus: derselbe Validation-Trigger reproduziert den Fehler auch dann noch, wenn der Harness auf `preview` umgestellt wird.
- Der eigentliche Bruch liegt im Matchstart-/Session-Lifecycle der Produkt-Runtime, nicht in `scripts/bot-validation-runner.mjs`.
- Ein Trainingsspezialpfad, der fehlende Runtime-Systeme im Runner kuenstlich umgeht, wuerde die Desktop-Produktwahrheit verfremden und BT80C-Evidence unbrauchbar machen.

## Betroffene Nicht-Training-Dateien

Mindestens diese Nicht-Training-Pfade muessen fuer den eigentlichen Fix untersucht und voraussichtlich angepasst werden:

- `src/ui/MatchFlowUiController.js`
- `src/core/InteractiveMatchRuntimeGuard.js`
- `src/core/runtime/GameRuntimeSessionHandler.js`
- `src/core/GameRuntimeFacade.js`
- `src/state/MatchLifecycleSessionOrchestrator.js`
- `src/state/MatchSessionFactory.js`
- `src/core/runtime/RuntimeSessionLifecycleService.js`

## Risiko / warum keine scoped Bot-Loesung reicht

- `bot:validate` kann den Matchstart nicht belastbar absichern, solange die Produkt-Runtime `PLAYING` ohne interaktive Match-Systeme erreicht.
- Der Runner kann fehlende Komponenten wie `entityManager`, `arena`, `powerupManager` oder `particles` nicht repo-wahr reparieren.
- Ein reiner Timeout-, Click- oder Servermodus-Fix im Trainingsscope wuerde hoechstens den Fehler verschieben, nicht die Ursache beheben.

## Welcher neue Umsetzungsplan-Block noetig waere

Vorgeschlagener neuer Block fuer den normalen Spielscope:

- `VXX Runtime-Startpfad fuer Bot-Validation und QA-Matchstart haerten`

Ziel des Blocks:

- Matchstart fuer den Validation-/QA-Pfad wieder so herstellen, dass `startMatch()` aus dem Menu reproduzierbar in eine vollstaendige Interactive-Match-Runtime uebergeht.
- Erst danach BT80C `80.9.3` im Trainingsscope fortsetzen und die Drei-Pass-Vorbedingung repo-seitig absichern.

## Kleinster umsetzbarer Schnitt

1. Reproduktion auf `preview` mit `applyBotValidationScenario(0)` plus `startMatch()` als Referenzfall absichern.
2. Session-Aufbau entlang `GameRuntimeSessionHandler.startMatch -> MatchFlowUiController._startMatchInternal -> MatchLifecycleSessionOrchestrator.createMatchSession -> MatchSessionFactory.createMatchSession` nachverfolgen.
3. Sicherstellen, dass beim Uebergang nach `PLAYING` die Interactive-Match-Runtime (`entityManager`, `powerupManager`, `particles`, `arena`, `hudRuntimeSystem`) vorhanden ist.
4. Erst nach gruener Runtime-Reparatur zur BT80C-Haertung in `80.9.3` zurueckkehren.

## Evidence

- `node dev/scripts/bot-validation-runner.mjs --server-mode preview --headless true --bot-validation-report tmp/bt80c-debug-report-preview.json`
- Direkte Preview-Probe mit `applyBotValidationScenario(0)` und `startMatch()`; Ergebnis: kein Start-Validierungsfehler, aber Rueckfall nach `MENU` plus Console-Warnung `Missing interactive match runtime`
- `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md`

## Manuelle Uebernahme

- Dieser Plan wird bewusst nicht in `docs/Umsetzungsplan.md` eingetragen.
- Die manuelle Aufnahme in den Umsetzungsplan und die Vergabe der finalen Block-ID bleiben user-owned.
