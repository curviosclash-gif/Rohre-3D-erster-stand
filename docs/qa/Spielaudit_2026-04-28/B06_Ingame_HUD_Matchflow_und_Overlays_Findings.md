# B06 Ingame-HUD, Matchflow und Overlays - Findings

Stand: 2026-04-29
Status: abgeschlossen
Planquelle: [README.md](./README.md)

## Scope

Sichtung und Recheck 2026-04-29:

- `src/ui/MatchFlowUiController.js`
- `src/ui/PauseOverlayController.js`
- `src/ui/MatchFlowArcadeOverlayController.js`
- `src/ui/KeybindEditorController.js`
- `src/ui/HUD.js`
- `src/ui/HuntHUD.js`
- `src/ui/HudRuntimeSystem.js`
- Stichprobe ohne Testausfuehrung: `tests/core-targeted-surface.spec.js`, `tests/core-targeted-runtime.spec.js`

## Prueffokus

- HUD- und Overlay-Lifecycle
- Matchflow-, Pause- und Endscreen-Pfade
- Runtime-Projektionen versus direkte Runtime-Zugriffe
- UI-Korrektheit, Visibility- und Input-Handling

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P42 | hoch | Arcade-Overlay rendert laufzeitnahe Labels und IDs per `innerHTML` | `src/ui/MatchFlowArcadeOverlayController.js` | `_renderArcadeIntermissionPanel()` interpoliert `mapLabel`, `modifierLabel`, `modifierEffect`, Reward-Labels und `entry.id` direkt in Button-/Panel-Markup (`114-175`); `_renderArcadePostRunPanel()` rendert `scorePerSector.mapKey` ebenfalls ungeescaped in HTML (`185-244`) | Overlay ausschliesslich ueber `createElement`/`textContent` und strikt normalisierte `data-*`-Attribute aufbauen; negativen Escape-/Injection-Fall mit eigenem Surface-Test absichern | erledigt in V112 (2026-05-20; `T20an` PASS) |

## Offene Fragen

- Soll der derzeit unreferenzierte Pfad `PauseOverlayController.showHostPausedOverlay()` produktiv noch an ein echtes Session-Event gebunden werden, oder ist fuer Nicht-Hosts ausschliesslich der Disconnect-Confirmation-Pfad gewollt?
- Soll der statische Scoreboard-Zeilenaufbau in `HudRuntimeSystem` langfristig als harmloser Struktur-Shortcut bleiben, oder soll B06/B08 den Pfad vorsorglich auf `createElement` vereinheitlichen, damit Overlay- und Lobby-UI denselben DOM-Haertungsstil nutzen?

## Folgearbeit

- `P42` ist in V112 erledigt; der negative Escape-/Injection-Fall ist mit `T20an` abgedeckt.
- Bei Bedarf B06/B08 gemeinsam auf eine einheitliche DOM-Haertungslinie ziehen, damit `innerHTML` fuer UI-Struktur nur noch auf statische, nicht datengetriebene Fragmente begrenzt bleibt.

## Detailnotizen

### P42 - `innerHTML` im Arcade-Overlay ist in V112 erledigt

- Problem: B06 interpoliert laufzeitnahe Arcade-Daten direkt in HTML-Strings statt sie ueber DOM-Knoten und `textContent` zu schreiben.
- Risiko: Schon ein manipuliertes Map-/Reward-/Preview-Label oder eine ungehaertete ID kann Markup injizieren und den Overlay-Pfad im Round-End-/Match-End-Screen kompromittieren.
- Evidenz: `src/ui/MatchFlowArcadeOverlayController.js:114-175`; `src/ui/MatchFlowArcadeOverlayController.js:185-244`.
- Zusatzbeobachtung: Die aktuelle Surface-Abdeckung prueft Intermission-/Post-Run-Happy-Paths, aber keinen Escape-/Injection-Negativfall.

### Recheck 2026-04-29 - Keybind-Refresh-Fund verworfen

- Ergebnis: Der im ersten Pass notierte Stale-UI-Verdacht im Keybind-Menue haelt dem Recheck nicht stand.
- Evidenz: `KeybindEditorController.handleKeyCapture()` ruft weiterhin `game._onSettingsChanged()` auf (`src/ui/KeybindEditorController.js:95-102`), und der zentrale Settings-Orchestrator rendert danach den Haupt-Keybind-Editor explizit neu (`src/core/runtime/RuntimeSettingsChangeOrchestrator.js:45-55`).
- Schluss: Kein eigenstaendiger B06-Fund; der Punkt bleibt nur als Auditspur dokumentiert, damit spaetere Folgepasse denselben Pfad nicht erneut als offenen Fehler aufnehmen.
