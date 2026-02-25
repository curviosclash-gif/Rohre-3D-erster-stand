# Umsetzungsplan (Master)

Dies ist der konsolidierte Plan für anstehende und aktuelle Implementierungen.
Neu aufgedeckte Bugs durch den Analysebericht fließen hier ein.

## Status-Übersicht

[ ] Offen
[/] In Bearbeitung
[x] Abgeschlossen

---

## Prioritäten (Triage)

**Wichtig:**

- Laufzeitfehler in `smoke:selftrail` beheben (`derivedSkipRecent helper value not available`).
- Playwright `test:core` Fehler beheben (T7: HUD nicht sichtbar, T10: Arena nicht gebaut).

**Mittel:**

- (Derzeit keine weiteren Fehler aus Stubs)

**Unwichtig/Backlog:**

- Weitere Dummy-Tests durch echte WebGL/Playwright Integritätstests ersetzen.

---

## Phase 1: [x] Kritische Build- und Pfad-Fixes

- **Ziele:**
  1. `Failed to resolve entry for package "three"` in `src/ui/Leaderboard.js` beheben. Das deutet meist auf falsche import-Syntax in vite-setups hin.
  2. Pfad in `scripts/round-state-controller-smoke.mjs` von `js/modules/` auf den neuen ES-Module Pfad (`src/...`) updaten.
- **Dateien:** `src/ui/Leaderboard.js`, `scripts/round-state-controller-smoke.mjs`
- **Verifikation:** `npm run smoke:selftrail` und `npm run smoke:roundstate` durchlaufen ohne Fehler.

## Phase 2a: [x] Kernfixes & UX - Menü & Profil

- **Ziele:**
  1. Profilname-Bugfix (Sichere Eingabe).
  2. Build-/Versionsanzeige im Menü.
  3. Untermenüs organisieren.
  4. Mehrprofil-End-to-End-Flow härten.
- **Dateien:** `src/ui/UIManager.js`, `index.html`, `style.css`, `src/core/main.js`
- **Verifikation:** Manueller Test der Profilerstellung und Navigation im Menü.

## Phase 2b: [ ] Kernfixes & UX - Gameplay

- **Ziele:**
  1. Portal-Ebenen reproduzierbar machen.
  2. First-Person Boost-Kamera auf Nase/Flugzeugspitze legen.
- **Dateien:** `src/core/main.js`, `src/entities/Player.js`, `src/entities/Arena.js`
- **Verifikation:** In-Game-Kameraführung sowie Portal-Teleports manuell testen.

## Phase 3: [ ] 3D-Map-Editor MVP

- **Ziele:**
  1. Laauffähiger End-to-End-Flow (Editor -> Spiel).
  2. Versioniertes JSON-Schema & Migration für alte Map-JSONs.
  3. Editor-Playtest direkt im Spiel laden.
- **Dateien:** `editor/js/EditorMapManager.js`, `js/modules/MapSchema.js`, `js/modules/CustomMapLoader.js`, `src/core/main.js`
- **Verifikation:** Bauen, anpassen, speichern und Map über "Map im Browser spielen" fehlerfrei testen (`custom_map_test`).

## Phase 4: [ ] Bot-KI Struktur & Navigation

- **Ziele:**
  1. KI-Struktur refactoren (Trennung Wahrnehmung / Entscheidung / Aktion).
  2. Kollisionsvermeidung durch Mehrfach-Richtungsproben (Raycasts).
  3. Robustes Anti-Stuck-Verhalten & Recovery-Maneuver.
- **Dateien:** `src/entities/Bot.js` (bzw. Entsprechung), `src/core/EntityManager.js`
- **Verifikation:** Winrate & Stuck-Events über automatische Runs messen. Deutlich weniger Wand-Treffer.

## Phase 5: [ ] Test-Runtime & Headless Fehler (P1)

- **Ziele:**
  1. Fehlende Helper-Werte (`derivedSkipRecent`) für Fahrzeuge im `smoke:selftrail` Script analysieren und korrigieren.
  2. Fehlende HUD-Anzeige (T7) im Headless-Mode/Playwright fixen.
  3. Arena-Generierung (T10) im Headless-Mode/Playwright fixen.
- **Dateien:** `scripts/self-trail-debug-smoke.mjs`, `src/entities/Player.js` (Fahrzeug-Setup), `tests/core.spec.js`, `src/core/main.js`
- **Verifikation:** `npm run test:core` und `npm run smoke:selftrail` laufen beide komplett ohne Fehler durch.
