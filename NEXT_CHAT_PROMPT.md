# Next Chat Prompt (paste into next Codex chat)

Arbeite im Projekt `c:\\Users\\gunda\\Desktop\\Rohre-3D-erster-stand` weiter.

Wichtig: Bitte zuerst den aktuellen Ist-Stand revalidieren und nicht blind auf diesem Prompt aufbauen.

## Verbindliches Vorgehen vor dem Weiterarbeiten

1. `Spielanalyse_Projektstruktur_Audit.md` lesen (nur relevante Teile, inkl. Abschnitt `Umsetzungsstatus (Session 2026-02-22, append)`).
2. Git-/Worktree-Status pruefen:
   - `git status --short`
   - `git diff --name-status`
   - `git diff --stat`
   - `git log --oneline -n 8`
3. Gezielte `rg`-Checks auf die zuletzt relevanten Stellen:
   - `js/modules/Renderer.js` (`persistentRoot`, `matchRoot`, `debugRoot`, `clearMatchScene`, `clearScene`)
   - `js/modules/Player.js` (`dispose`, `isSphereInOBB`, shared-geo markers)
   - `js/modules/Particles.js` (`dispose`)
   - `js/modules/Arena.js` (Checker-Texture in `build()`)
   - `js/main.js` (Match-Lifecycle, `clearMatchScene`, `particles.dispose`, `requiredWins`, `timeScale`)
   - `js/modules/three-disposal.js`
4. Kurz revalidieren:
   - Was ist weiterhin wie erwartet vorhanden?
   - Was hat sich seit der letzten Session geaendert (auch unverwandte Dateien)?
   - Welche Audit-Punkte sind damit bereits erledigt / ueberholt?

## Letzter validierter Stand (bitte revalidieren)

- Bot `_senseEnvironment`-Crashfix vorhanden
- `SLOW_TIME`-TimeScale-Reset vorhanden
- Trail-Alt-API `Trail.checkCollision()` offenbar entfernt
- `requiredWins` UI/Runtime synchron (1-15)
- `InputManager.preventDefault()` nur noch fuer relevante Tasten
- `EntityManager.dispose()` / `PowerupManager.dispose()` im Match-Lifecycle genutzt
- `PowerupManager.dispose()` entsorgt Shared-Geometrien
- `Renderer` hat Scene-Roots + `clearMatchScene()`; `main.js` nutzt `clearMatchScene()`
- `Player.dispose()` macht Deep-Disposal; `three-disposal.js` vorhanden; Shared-Geometrien gegen Doppel-Dispose markiert
- `EntityManager.dispose()` entsorgt Projektil-Assets
- Zus. Fix: `Arena.build()` Checker-Texture-Template-Leak behoben
- Zus. Fix: `ParticleSystem.dispose()` vorhanden und wird in `startMatch()` / `_returnToMenu()` explizit aufgerufen
- Letzte Verifikation: gezielter `ParticleSystem`-Dispose-Smoke erfolgreich, `npm run build` erfolgreich

## Aufgabe fuer diese Session (Phase 1, kleiner Refactor)

Bitte eine **kleine `SettingsStore`-Extraktion aus `js/main.js`** umsetzen.

### Minimaler Scope (nur das)

- Load/Save Settings (`localStorage`)
- Load/Save Settings-Profile (`localStorage`)
- Profilname-Normalisierung / Profil-Lookup

### Nicht in diesem Schritt anfassen

- `_applySettingsToRuntime()`
- UI-Event-Listener / DOM-Verkabelung
- sanitize-Logik gross umbauen (nur verschieben, nicht redesignen)

## Praktische Regeln

- Unverwandte Aenderungen im Worktree nicht ueberschreiben
- `dist/` nicht unnoetig zuruecksetzen
- Keine destruktiven Git-Befehle (`reset --hard`, `checkout --`, etc.)

## Nach dem Refactor

- gezielter Smoke-Test fuer Settings/Profile-Laden/Speichern (so klein wie moeglich)
- `npm run build` wenn sinnvoll
- kurz dokumentieren:
  - Was wurde extrahiert?
  - Verhaltensaenderung ja/nein (sollte nein sein)
  - Audit-Punkt Phase 1 begonnen / Fortschritt

## Abschluss der Session

- Zusammenfassung der Aenderungen
- Verifikationsergebnisse
- offene Risiken / naechste Schritte
- optional Audit um kurzen `Umsetzungsstatus`-Append erweitern (nur ergaenzen, nichts ueberschreiben)
