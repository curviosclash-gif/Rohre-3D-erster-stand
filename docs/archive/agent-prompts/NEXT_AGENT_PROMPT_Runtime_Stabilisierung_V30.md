# Next Agent Prompt: Runtime-Stabilisierung & Wartbarkeit V30

Arbeite im Projekt `c:\\Users\\gunda\\Desktop\\Rohre-3D-erster-stand` weiter.

Wichtig: Nicht blind auf diesen Prompt aufbauen. Erst revalidieren, dann ausfuehren.

## Auftrag

Fuehre den Plan `docs/Feature_Runtime_Stabilisierung_Wartbarkeit_V30.md` in einem One-Stop-Durchlauf Phase fuer Phase aus.

Ziel:

- alle Phasen `30.0` bis `30.8` sequenziell abarbeiten
- nur bei echtem Blocker stoppen
- nach jeder Phase ein Zwischen-Gate gruenden
- am Ende einen voll validierten, dokumentierten Stand hinterlassen

## Verbindlicher Startblock

1. `AGENTS.md` sowie die aktuell vorhandenen `.agents` Regeln/Workflows revalidieren.
2. Worktree-Zustand nur lesend pruefen:
   - `git status --short`
   - `git diff --name-status`
   - `git diff --stat`
   - `git diff --cached --name-status`
   - `git diff --cached --stat`
   - `git log --oneline -n 15`
3. Plan und aktuelle Dokumentation lesen:
   - `docs/Feature_Runtime_Stabilisierung_Wartbarkeit_V30.md`
   - `docs/Analysebericht.md`
   - `docs/Testergebnisse_2026-03-07.md`
   - `docs/Umsetzungsplan.md`
   - `docs/ai_architecture_context.md`
4. Kritische Istpunkte gegen aktuellen Code revalidieren:
   - `src/core/GameLoop.js`
   - `src/core/main.js`
   - `src/core/Renderer.js`
   - `src/core/InputManager.js`
   - `src/core/Audio.js`
   - `src/core/GameRuntimeFacade.js`
   - `src/core/MediaRecorderSystem.js`
   - `src/ui/UIManager.js`
   - `src/entities/Player.js`
   - `src/entities/player/PlayerView.js`
   - `src/entities/Trail.js`
   - `src/entities/systems/PlayerLifecycleSystem.js`
   - `src/entities/systems/PlayerInputSystem.js`
   - `src/entities/ai/observation/ObservationSystem.js`
   - `src/entities/ai/BotRuntimeContextFactory.js`
   - `src/entities/Bot.js`

## Arbeitsmodus

- Arbeite strikt phasenweise.
- Nach jeder Phase:
  - relevante Checkboxen im Plan aktualisieren
  - nur pfadrelevante Tests laufen lassen
  - kurz notieren, ob Verhaltensaenderung ja/nein
- Erst wenn das Zwischen-Gate gruen ist, zur naechsten Phase gehen.
- Falls du auf fremde parallele Aenderungen triffst, die denselben Dateibereich konflikttraechtig beruehren, nicht ueberbuegeln; dann sauber stoppen und den Konflikt berichten.

## Verbindliche Reihenfolge

1. `30.0` Revalidierung und Baseline-Freeze
2. `30.1` GameLoop-Korrektheit
3. `30.2` Runtime-Dispose-/Cleanup-Vertrag
4. `30.3` Trail-Simulation aus `PlayerView`
5. `30.4` Observation-Reuse und Bot-Tuning-Auslagerung
6. `30.5` Recorder-/Fehlerpfade haerten
7. `30.6` `UIManager` modularisieren
8. `30.7` `GameRuntimeFacade` + State-Kontrakte konsolidieren
9. `30.8` Abschluss-Gate, Doku-Freeze, finale Verifikation

## Phase-spezifische Erwartung

### 30.0

- Revalidiere, dass der `GameLoop` aktuell noch Zeit doppeln kann.
- Revalidiere, dass `_startSetupDisposers` in `UIManager` aktuell nicht wirklich als Teardown-Pfad genutzt wird.
- Revalidiere, dass `PlayerView.update()` aktuell `trail.update(...)` anstoesst.
- Revalidiere, dass `ObservationSystem.buildObservation(...)` ohne Reuse-Target ein neues Array erzeugt.
- Revalidiere, dass `MediaRecorderSystem.getSupportState()` durch Shim/Support-Erkennung zu optimistisch sein kann.

### 30.1

- Fix muss vor allen groesseren Refactors stehen.
- Fuege Regressionstests hinzu, nicht nur Codefix.
- Achte darauf, dass `timeScale`/Slow-Time nicht doppelt wirkt.

### 30.2

- Fuehre einen echten Dispose-Pfad ein; keine halbherzigen `clear()`-Inseln.
- Anonyme Listener in `main.js`, `Renderer.js`, `InputManager.js`, `Audio.js`, `UIManager.js` und verwandten Menuepfaden aufloesen.
- Wenn noetig einen kleinen Runtime-Disposal-Helper neu anlegen; kein Overengineering.

### 30.3

- Trail-Update muss in die Simulation, nicht in die View.
- `PlayerView` danach nur noch visuell verantwortlich halten.
- Physik-/Trail-Regressionen gruendlich mitnehmen.

### 30.4

- Observation-Reuse pro Bot einfuehren.
- `ITEM_RULES` und lokale Bot-Fallbackwerte aus `Bot.js` herausziehen.
- Bridge-/Policy-Contract nicht brechen.

### 30.5

- Unsupported-Recorder muss ehrlich als unsupported melden.
- Fehler-Overlay-Ausgabe haerten; keine unnoetige `innerHTML`-Interpolation fuer Runtime-Fehlertexte.

### 30.6

- `UIManager` in kleinere Verantwortungsbloecke teilen.
- Reuse bestehender Runtime-/Menuemodule bevorzugen.
- Keine Event-/Selector-Regressionen im Menuepfad verursachen.

### 30.7

- `GameRuntimeFacade` auf Routing/Komposition reduzieren.
- State-Wechsel zentraler und klarer machen.
- Kein neuer paralleler Lifecycle-Weg.

### 30.8

- Alle relevanten Dokus aktualisieren.
- Doku-Gates sind verpflichtend.
- Abschluss nur mit gruenem Test-/Doku-Paket.

## Teststrategie

- Folge `.agents/test_mapping.md`.
- Minimum je Phase:
  - Core-Pfade: `npm run test:core`
  - Entity-/Trail-/Bot-Pfade: `npm run test:physics`
  - UI-/Lifecycle-Pfade: `npm run test:stress`
  - Recorder-/Render-Pfade: `npm run test:gpu`
- Am Ende:
  - `npm run test:core`
  - `npm run test:physics`
  - `npm run test:gpu`
  - `npm run test:stress`
  - optional `npm run benchmark:baseline`
  - `npm run docs:sync`
  - `npm run docs:check`

## Git- und Safety-Regeln

- Keine destruktiven Git-Befehle.
- Unverwandte Worktree-Aenderungen nicht ruecksetzen.
- Nur eigene Dateien bzw. eigenen Scope committen.
- Wenn du committen solltest, dann atomar pro sinnvoller Teilmenge.

## Dokumentationspflicht

- Halte `docs/Feature_Runtime_Stabilisierung_Wartbarkeit_V30.md` waehrend der Abarbeitung aktuell.
- Aktualisiere `docs/Analysebericht.md`, wenn neue Architektur-/Fehler-/Verifikationsbefunde entstehen.
- Ergaenze `docs/Umsetzungsplan.md`, falls aus dem Plan neue Restpunkte oder Abhaengigkeiten entstehen.

## Abschlussformat

Die finale Ausgabe muss enthalten:

1. Umgesetzte Phasen und wesentliche Aenderungen.
2. Verifikationsergebnisse mit exakten Befehlen und PASS/FAIL.
3. Verhaltensaenderung ja/nein pro kritischem Bereich:
   - GameLoop
   - Runtime-Cleanup
   - Trail-Kollision
   - Bot-/Observation-Hotpath
   - Recorder-/Fehlerpfad
   - UI-/Runtime-Architektur
4. Offene Risiken oder bewusst verschobene Punkte.
5. Eine Schluss-Sektion `Klare Handlungsanweisungen (naechste Schritte)` mit nummerierten, sofort ausfuehrbaren Punkten.
