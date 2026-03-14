# Architektur-Maßnahmenplan V38

Dieser Plan beschreibt die Schritte zur Behebung der in der Evaluierung (Stand 2026-03-13) identifizierten Architektur-Probleme sowie die Maßnahmen, mit denen deren erneutes Auftreten (Regression) verhindert wird.

## 1. Problem: "God Objects" (`UIManager.js`, `main.js`)
Dateien über 60 KB (wie der `UIManager.js`) werden extrem fehleranfällig und schwer wartbar. "God Objects" binden zu viel State oder orchestrieren zu viele unabhängige Systeme.

### Lösung: Modularisierung (Split & Extract)
- **`UIManager.js` Refactoring**:
  - Trennung in einzelne dedizierte *Sub-Controller*, wie z.B. `MatchSettingsController.js`, `HudFeedbackController.js` oder `MenuOverlayManager.js`.
  - Die Kern-Logik des UIManagers wird nur noch zur Initialisierung/Zusammenführung der Controller genutzt (Fassade).
- **`main.js` Entschlackung**:
  - Code-Teile, die reine Inits für ThreeJS durchführen, in ein `AppInitializer.js` verschieben.
  - Das Lifecycle-Management (`PLAYING`, `ROUND_END`) streng an die bestehenden Zustandsautomaten binden.

### Prävention: Automatisierte Grenzen
- Einführung einer Linter-Regel (z.B. ESLint `max-lines`). Jede Datei mit über 400-500 Zeilen löst einen Build-Fehler/Warning in der Pipeline bzw. beim Hook-Check aus (`eslint /* --max-warnings 0`). Dies zwingt Entwickler und KI dazu, neuen Code von Beginn an zu modularisieren.

---

## 2. Problem: Vanilla JS Komplexität & Fehlende Verträge
Komplexe Objekte (`*Ops.js` Signaturen, UI-Events) sind "wobbly". Das Ändern eines Eintrags in `Config.js` oder eines Events kann unentdeckte Bugs in `botPolicyStrategy` erzeugen, da das System nicht typsicher ist.

### Lösung: Check-Driven JSDoc Typing
- Ohne auf TypeScript umzustellen (da .js-Dateien explizit gewollt/verwendet wurden), wird **JSDoc** konsequent angewendet.
- Komplexe Transferobjekte (z.B. der `botPolicy` Vektor) werden zentral in einer `types.d.js` oder oben in der Datei definiert (`/** @typedef {Object} BotObservation ... */`).

### Prävention: Typ-Checks in der Pipeline
- Aufbau von automatisiertem Type-Checking über `tsc --noEmit --allowJs --checkJs`.
- Dadurch schlägt der CI-Check und der lokale Husky-Pre-Commit-Hook fehl, wenn eine Variable einen anderen Typ zugewiesen bekommt oder ein Parameter der Funktion fehlt. Die IDE (VSCode) zeigt sofort Fehler beim Coden an.

---

## 3. Problem: UI-Coalescing und eigene Store-Logik
Custom UI-Reaktivität (`UISettingsSyncMap.js`) birgt das Risiko von Race Conditions, Re-Render-Schleifen oder Memory Leaks, falls Nodes nicht sauber abgemeldet werden.

### Lösung: Isolierung & Coverage
- Da der Ansatz performance-orientiert ist und ein Framework-Wechsel (`React/Vue`) oft Out-Of-Scope für ein Vanilla WebGL Spiel ist, behalten wir das Muster, härten es aber massiv ab.
- Identifikation und Fix eventueller Leaks im Subscription/Disposal Zyklus von `SettingsChangeSetOps.js`.

### Prävention: TDD (Test-Driven Development) für die UI
- Das *UI-Coalescing* und der *SyncMap*-Prozess müssen durch Unittests (mit Playwright, wie derzeit die `core.spec.js`) zu 100% abgedeckt sein.
- Keine UI-Änderung darf durchgehen, wenn der Zustand (State A -> View B) nicht dediziert den Lifecycle (Init -> Update -> Dispose) durchläuft.
## Umsetzungsstand 2026-03-14
- `src/core/AppInitializer.js`, `src/core/RuntimeErrorOverlay.js` und `src/core/PlaytestLaunchParams.js` entlasten `main.js` um Bootstrap-, Fehler-Overlay- und URL-Parsing-Logik.
- `eslint.config.js` fuehrt einen `max-lines`-Guard fuer `src/**/*.js` ein und gibt den bestehenden Grossdateien nur additive Legacy-Ceilings statt unbegrenztem Wachstum.
- `tsconfig.json` plus `npm run typecheck:architecture` pruefen die neuen Bootstrap-Helfer per `tsc --checkJs`.
- `prebuild` haengt `npm run architecture:guard` vor jeden `vite build`, damit neue Architektur-Regressionen frueh scheitern.
