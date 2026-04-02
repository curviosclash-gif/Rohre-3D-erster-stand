---
id: V81
title: Developer Tuning Console (Steuerkonsole)
status: planned
priority: P3
owner: frei
depends_on:
  - V74.99
  - V72.99
blocked_by: []
affected_area: developer-tooling
scope_files:
  - src/dev/tuning/TuningParameterRegistry.js
  - src/dev/tuning/TuningRuntimeBridge.js
  - electron/tuning-window.cjs
  - electron/tuning-ipc.cjs
  - electron/tuning-preload.cjs
  - electron/tuning-console/tuning.html
  - electron/tuning-console/tuning-app.js
  - electron/tuning-console/tuning-renderer.js
  - electron/tuning-console/tuning-preset-ui.js
  - electron/tuning-console/tuning-style.css
  - electron/main.cjs
  - electron/preload.cjs
  - src/core/Config.js
  - src/core/main.js
  - src/core/runtime/ActiveRuntimeConfigStore.js
verification:
  - npm run build
  - npm run app:start
  - npm run plan:check
  - npm run docs:check
updated_at: 2026-04-02
source_history:
  - docs/plaene/neu/Feature_Developer_Tuning_Console_V81.md
---

# V81 Developer Tuning Console (Steuerkonsole)

## Ziel

Eigenstaendiges Electron-Fenster (zweites BrowserWindow, Toggle F7) fuer Live-Finetuning aller Gameplay-Grundeinstellungen (~265 Parameter). Nur fuer Entwickler, nicht fuer Endnutzer. Modular aufgebaut fuer einfache Erweiterbarkeit.

## Nicht-Ziel

- Kein Endnutzer-Feature; kein Einfluss auf Browser-Demo oder Produktoberflaeche.
- Kein externes UI-Framework (kein dat.gui, lil-gui, tweakpane).
- Keine Aenderung an der bestehenden Menue-/Settings-Architektur.
- PPO_V2-Bot-Profil wird nicht steuerbar (ML-gesteuert), nur readonly anzeigbar.

## Definition of Done

- [ ] DoD.1 F7 oeffnet ein separates Electron-Fenster mit Tab-basierter Parameterliste.
- [ ] DoD.2 Slider-/Input-Aenderungen wirken live im laufenden Spiel ohne Neustart.
- [ ] DoD.3 Frozen Objects (HuntConfig) werden korrekt behandelt (kein TypeError).
- [ ] DoD.4 Presets koennen gespeichert, geladen, exportiert (JSON) und importiert werden.
- [ ] DoD.5 Neue Parameter koennen durch einen einzelnen Registry-Eintrag hinzugefuegt werden.
- [ ] DoD.6 Console-Fenster schliesst sauber bei App-Exit; Spiel laeuft ohne Console weiter.

## Risiken

- R1 | mittel | Frozen Objects in HuntConfig verhindern direkte Mutation. Mitigation: Unfrozen-Clone beim Schreiben.
- R2 | niedrig | Gecachte Werte in Systemen reagieren nicht auf Live-Aenderung. Mitigation: Event `dev-config-changed` + Dokumentation hot/cold Parameter.
- R3 | niedrig | Preset-Kompatibilitaet bei Config-Aenderungen. Mitigation: Nur Deltas speichern, unbekannte Keys ignorieren.
- R4 | mittel | V74 oder V72 aendern Config-Struktur vor V81-Start. Mitigation: Harte Abhaengigkeit auf V74.99 + V72.99.

## Architektur

```
Game Window (index.html)          Tuning Console (tuning.html)
  CONFIG_BASE  <──Proxy──>          Slider / Inputs / Presets
  TuningRuntimeBridge               tuningApi (preload)
       |                                  |
       └──────── IPC via Main Process ────┘
                 electron/main.cjs
                 (tuning-ipc.cjs Broker)
```

Modularer Aufbau in 6 Modulen:
1. **Parameter-Registry** — deklaratives Schema (shared)
2. **Runtime-Bridge** — get/set auf CONFIG_BASE (Game-Fenster)
3. **IPC-Schicht** — Main-Process Broker + Preloads
4. **Console-UI** — HTML/JS/CSS im eigenen Fenster
5. **Preset-Manager** — Save/Load/Export/Import
6. **Fenster-Management** — BrowserWindow-Lifecycle

## Phasen

### 81.1 Parameter-Registry und Runtime-Bridge
status: open
goal: Deklaratives Schema fuer ~265 Parameter und Config-Schreibzugriff
output: TuningParameterRegistry.js + TuningRuntimeBridge.js

- [ ] 81.1.1 `TuningParameterRegistry.js` mit Schema fuer Player, Trail, Arena, Gameplay, Powerup, Hunt, Projectile, Portal, Homing, Camera, Render, Farben und Bot-Profile (EASY/NORMAL/HARD). PPO_V2 nur readonly.
- [ ] 81.1.2 `TuningRuntimeBridge.js` mit getValue/setValue/getAllValues/resetToDefaults. Frozen-Object-Handling fuer HuntConfig. clearActiveRuntimeConfig() nach jeder Aenderung.
- [ ] 81.1.3 CONFIG_BASE Export in Config.js sicherstellen; refreshActiveRuntimeConfig() in ActiveRuntimeConfigStore.js.

### 81.2 Electron IPC und Fenster-Management
status: open
goal: Zweites BrowserWindow mit IPC-Kommunikation zum Game-Fenster
output: tuning-window.cjs + tuning-ipc.cjs + tuning-preload.cjs + Aenderungen an main.cjs/preload.cjs

- [ ] 81.2.1 `tuning-window.cjs` — createTuningWindow/closeTuningWindow, 420x800, alwaysOnTop optional.
- [ ] 81.2.2 `tuning-ipc.cjs` — IPC-Handler: tuning:get-all, tuning:set-value, tuning:reset-all, tuning:get-registry.
- [ ] 81.2.3 `tuning-preload.cjs` — tuningApi fuer Console-Window (getAll, setValue, onUpdate).
- [ ] 81.2.4 `preload.cjs` erweitern — Tuning-Request-Handler fuer Game-Window.
- [ ] 81.2.5 `main.cjs` — Import tuning-window + tuning-ipc, F7-Hotkey via globalShortcut, Cleanup bei App-Exit.

### 81.3 Console-UI (Kern)
status: open
goal: Funktionale Parameterliste mit Tabs, Slider, Inputs, Suche
output: tuning.html + tuning-app.js + tuning-renderer.js + tuning-style.css

- [ ] 81.3.1 `tuning.html` — Startdatei mit Container-Struktur (Tab-Leiste, Content-Scroll, Footer).
- [ ] 81.3.2 `tuning-app.js` — Tab-Wechsel, Suchfeld-Filter, Initialisierung via tuningApi.
- [ ] 81.3.3 `tuning-renderer.js` — Renderer fuer number (Slider+Input), boolean (Toggle), color (Picker), select (Dropdown). Geaenderte Werte hervorgehoben, Reset-Button pro Parameter.
- [ ] 81.3.4 `tuning-style.css` — Dunkles Theme (konsistent mit Game-UI), 420px Breite, Scrollbar, Monospace fuer Werte.
- [ ] 81.3.5 Bot-Tab: Dropdown zur Profilwahl (EASY/NORMAL/HARD), Profil-Parameter anzeigen/aendern. PPO_V2 readonly.

### 81.4 Preset-System
status: open
goal: Benannte Konfigurationsschnappschuesse speichern, laden, ex-/importieren
output: tuning-preset-ui.js + TuningPresetManager.js (shared)

- [ ] 81.4.1 `TuningPresetManager.js` — Save/Load (localStorage, nur Deltas), Export/Import (JSON via Electron File-Dialog).
- [ ] 81.4.2 `tuning-preset-ui.js` — Preset-Dropdown, Save/Load/Export/Import/Reset-Buttons im Footer. Statusanzeige (X Parameter geaendert).

### 81.99 Abschluss-Gate
status: open
goal: Smoke-Test und Dokumentation
output: Gruene Verifikation, aktualisierte Referenz

- [ ] 81.99.1 Smoke-Test: F7 oeffnet Console, Player-Speed aendern wirkt live, Preset-Roundtrip (Save → Reload → Load), JSON Export/Import, Hunt-MG-Damage aendern (Frozen-Object), Console schliessen ohne Fehler.
- [ ] 81.99.2 `npm run build`, `npm run plan:check`, `npm run docs:check` sind gruensicher.
- [ ] 81.99.3 Kurze Entwickler-Referenz fuer Erweiterung (neuen Parameter hinzufuegen = ein Registry-Eintrag).

## Erweiterbarkeit

Neuer Parameter = ein Eintrag in der Registry:
```js
{ section: 'CAMERA', path: 'CINEMATIC.SWAY_FREQUENCY', label: 'Cinematic Sway',
  type: 'number', min: 0, max: 5, step: 0.1, default: 0.8 }
```
Kein weiterer Code noetig — UI baut sich automatisch aus der Registry.
