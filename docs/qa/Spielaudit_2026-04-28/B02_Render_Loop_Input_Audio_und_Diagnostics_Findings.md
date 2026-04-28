# B02 Render-Loop, Input, Audio und Diagnostics - Findings

Stand: 2026-04-29
Status: offen
Planquelle: [README.md](./README.md)

## Scope

- `src/core/GameLoop.js`
- `src/core/Renderer.js`
- `src/core/renderer/**`
- `src/core/InputManager.js`
- `src/core/Audio.js`
- `src/core/RuntimeDiagnosticsSystem.js`
- `src/core/perf/**`
- `src/core/three-disposal.js`

## Prueffokus

- Render- und Update-Takt
- Input-/Audio-Lifecycle
- Diagnostics-, Perf- und Overlay-Pfade
- Disposal, Cleanup und potentielle Ressourcenlecks

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B02-F01 | hoch | Sticky-Input, weil `keyup` bei fokussierten Texteingaben verworfen wird und kein Fokus-Reset existiert | `src/core/InputManager.js` | `_handleKeyDown()` und `_handleKeyUp()` brechen beide bei `_isTextInputFocused()` sofort ab (`70-87`), sodass ein bereits gesetztes `keys[code]` beim Loslassen ueber einem `input`/`textarea` nicht geloescht wird. Ein eigener `blur`-/`visibilitychange`-Reset fuer Eingaben existiert nicht; im B02-Scope reagiert nur `GameLoop` auf Fokuswechsel (`src/core/GameLoop.js:95-116`). | `keyup` immer verarbeiten oder auf Fokus-/Blur-Wechsel `keys` plus `justPressed` hart zuruecksetzen. Den Texteingabe-Schutz nur fuer Gameplay-Aktionen bzw. `preventDefault`, nicht fuer das Freigeben bereits aktiver Tasten, anwenden. | offen |
| B02-F02 | mittel | Capture-Renderer werden im Fehlerpfad unvollstaendig freigegeben | `src/core/renderer/RecordingCapturePipeline.js` | `_ensureShortsRenderer()` und `_ensureCinematicRenderer()` erzeugen eigene `THREE.WebGLRenderer`-Instanzen (`200-213`, `583-594`). Wenn danach `setSize()` oder ein spaeterer Renderer-Schritt wirft, markieren die Catch-Pfade den Modus nur als `Unavailable` und nullen die Referenz (`221-231`, `601-611`), ohne den bereits angelegten Renderer sauber zu `dispose()`n. Saubere Freigabe existiert nur im Happy-Path-`dispose()` (`740-758`). | In beiden Catch-Pfaden den partiell erzeugten Renderer defensiv freigeben (`dispose()`, falls verfuegbar zusaetzlich Context-Loss/Canvas-Reset) und erst danach `Unavailable` setzen. So wird aus einem transienten Fehler kein stiller WebGL-Kontext-Leak. | offen |
| B02-F03 | niedrig | Debug-Hotkeys kippen auf Key-Repeat mehrfach hin und her | `src/core/RuntimeDiagnosticsSystem.js`, `src/core/Audio.js` | Die Toggle-Hotkeys fuer Grafik/Stats (`KeyP`, `KeyO`) und Audio-Mute (`KeyM`) reagieren direkt auf jedes `keydown` ohne `event.repeat`-Guard (`src/core/RuntimeDiagnosticsSystem.js:72-95`, `src/core/Audio.js:54-58`). Ein laenger gehaltener Tastendruck kann den Endzustand dadurch mehrfach flippen. | Toggle-Hotkeys nur auf den ersten Tastendruck reagieren lassen (`event.repeat` ignorieren oder ueber einen vorhandenen just-pressed-Pfad fuehren). | offen |

## Offene Fragen

- `persistentRoot` in `src/core/renderer/SceneRootManager.js` wirkt im aktuellen Repo-Stand ungenutzt. Falls der Pfad bewusst oeffentlich bleibt, sollte ein Folgecheck klaeren, ob `Renderer.dispose()`/`clearScene()` kuenftig auch diesen Root explizit mitraeumen muessen.

## Folgearbeit

- B02-F01 als priorisierten Runtime-Fix nachziehen, weil der Bug sowohl Menue-/Textfokus als auch Alt-Tab-/Fokuswechsel streift und direkt spielbare Eingaben festklemmen kann.
- B02-F02 mit einem gezielten Capture-Failure-Smoke absichern: Renderer-Erzeugung oder `setSize()` kuenstlich scheitern lassen und pruefen, dass danach keine verwaisten Capture-Renderer-/Canvas-Reste bleiben.
- B02-F03 als kleinen UX-/Debug-Hardening-Patch mitnehmen, idealerweise gemeinsam fuer alle globalen Toggle-Hotkeys im B02-Scope.
