# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-06

Dieser Masterplan ist die einzige aktive Planquelle fuer offene Arbeit.
Abgeschlossene oder abgeloeste Planstaende liegen unter `docs/archive/plans/`.

## Status-Uebersicht

- [ ] Offen
- [/] In Bearbeitung
- [x] Abgeschlossen

## Nutzung

- Offene Punkte werden nur noch in diesem Dokument gepflegt.
- Abgeschlossene Root-Plaene werden nach `docs/archive/plans/completed/` verschoben.
- Abgeloeste Master-/Detailplaene werden nach `docs/archive/plans/superseded/` verschoben.
- Historische Altarchive unter `docs/archive/` bleiben als Referenz bestehen.

## Prioritaeten (Stand: 2026-03-06)

**Wichtig:**

- V26-Restumfang abschliessen (`V4`, `V5`, `V9`, `V11`, `V16`).
- `maze`-Hotspot fuer V13 gezielt vorbereiten.

**Mittel:**

- V27 Profile, Statistiken und Balancing-Telemetrie.
- V28 God-Class-Abbau und Core-Performance.

**Querschnitt / Nachlauf:**

- Multiplayer-Runtime statt Menu-Stub.
- Recording-UI / manueller Trigger fuer V29.
- Dummy-Tests schrittweise durch echte Integritaetstests ersetzen.
- Bundle-Groesse ueber Code-Splitting weiter optimieren.

## Offene Produkt- und Technikpunkte

- [ ] V4 Treffer-/Schadensfeedback verbessern
  - Audio-/VFX-Signale fuer MG-, Raketen-, Trail- und Schildtreffer nachziehen.
  - Zielpfade: `src/hunt/HuntHUD.js`, `src/core/Audio.js`, `src/entities/systems/ProjectileSystem.js`.
- [ ] V5 Hunt-Mode Feintuning datenbasiert abschliessen
  - TTK, Overheat, Respawn-Timer und Pickup-Spawns gegen Telemetrie kalibrieren.
  - Zielpfade: `src/core/Config.js`, `src/hunt/HuntConfig.js`, `src/hunt/RespawnSystem.js`, `src/hunt/RocketPickupSystem.js`.
- [ ] V7 Profile-UX ausbauen
  - Profile duplizieren, importieren/exportieren und Standardprofil markieren.
  - Zielpfade: `src/ui/SettingsStore.js`, `src/ui/Profile*Ops.js`, `src/ui/MenuController.js`.
- [ ] V8 Post-Match-Statistiken erweitern
  - Kill/Death, Trefferquote, Ueberlebenszeit und Todesursachen sichtbar machen.
  - Zielpfade: `src/ui/HUD.js`, `src/ui/MatchFlowUiController.js`, `src/state/RoundRecorder.js`.
- [ ] V9 Replay/Ghost fuer letzte Runde
  - Leichten Replay-/Ghost-Pfad fuer Lern- und Highlight-Momente aufbauen.
  - Zielpfade: `src/state/RoundRecorder.js`, `src/core/main.js`, `src/ui/MatchFlowUiController.js`.
- [ ] V11 Mehr Map-Varianz ueber GLB/GLTF-Maps
  - Externe GLB-Umgebungen inkl. Collider- und Fallback-Pfad integrieren.
  - Zielpfade: `src/entities/Arena.js`, `src/entities/GLBMapLoader.js`, `src/core/Config.js`, `src/ui/MenuController.js`.
- [ ] V13 Performance-Hotspot `maze` gezielt optimieren
  - Draw-Calls per Batching/Instancing/LOD reduzieren, ohne Gameplay-Regression.
  - Zielpfade: `src/entities/Arena.js`, `src/core/Renderer.js`, `src/core/Config.js`.
- [ ] V15 Telemetrie-Dashboard fuer Balancing
  - Winrate-, Survival-, Stuck- und Schadensmetriken pro Mode/Map/Bot-Level auswertbar machen.
  - Zielpfade: `scripts/`, `data/`, `src/ui/`, `docs/archive/tests/Testergebnisse_*.md`.
- [ ] V16 Event-Playlist/Fun-Modes
  - Rotierende Spezialregeln als zeitlich limitierte Modi vorbereiten und testen.
  - Zielpfade: `src/core/Config.js`, `src/core/main.js`, `src/ui/MenuController.js`.
- [ ] N1 Multiplayer-Runtime statt UI-Stub
  - Host/Join/Ready-Stubs in echte Netzwerksession und Runtime-Wiring ueberfuehren.
  - Zielpfade: `src/ui/menu/MenuMultiplayerBridge.js`, `src/core/main.js`, kuenftige Netzwerkmodule.
- [ ] N2 Recording-UI / manueller Trigger fuer V29
  - Optionalen UI-Toggle bzw. manuellen Recording-Trigger produktiv anbinden.
  - Zielpfade: `index.html`, `src/ui/KeybindEditorController.js`, `src/ui/menu/MenuControlBindings.js`, `src/core/MediaRecorderSystem.js`.
- [ ] T1 Dummy-Tests schrittweise durch echte Integritaetstests ersetzen
  - Bestehende Platzhaltertests entlang des geaenderten Codes ersetzen.
- [ ] T2 Bundle-Groesse weiter optimieren
  - Code-Splitting und Ladepfade nur dann vertiefen, wenn der Nutzen messbar bleibt.

## Single-Agent Block V26: Gameplay & Features (offen)

- [ ] 26.0 Baseline-Freeze und Gameplay-Metriken erfassen
- [ ] 26.1 V4 Treffer-/Schadensfeedback (Audio & VFX)
  - [ ] 26.1.1 Audio-Signale fuer MG, Raketen und Schild implementieren
  - [ ] 26.1.2 VFX-Signale (Partikel/Flashes) bei Treffern ausbauen
- [ ] 26.2 V5 Hunt-Mode Feintuning
  - [ ] 26.2.1 TTK und Overheat-Werte basierend auf Testdaten anpassen
  - [ ] 26.2.2 Respawn- und Pickup-Logik verfeinern
- [ ] 26.4 V9 Replay/Ghost-System fuer die letzte Runde aufbauen
- [ ] 26.5 V11 GLB-Map Loader Integration (konsolidiert aus altem Detailplan)
  - [ ] 26.5.1 `GLTFLoader`/`GLBMapLoader` einfuehren
  - [ ] 26.5.2 `glbModel` in Map-Definitionen und Schema aufnehmen
  - [ ] 26.5.3 `Arena.build()` asynchron machen und Fallback-Pfad absichern
  - [ ] 26.5.4 Beispiel-GLB oder reproduzierbares Test-Asset bereitstellen
  - [ ] 26.5.5 UI-Integration fuer Map-Auswahl und Ladezustand nachziehen
  - [ ] 26.5.6 GLB-Loader-Test, Fallback-Test und manuelle Verifikation abschliessen
- [ ] 26.6 V16 Event-Playlist / Fun-Modes Mechanik testen
- [ ] 26.8 Abschluss-Gate, Playtest und Doku-Freeze (`docs:sync`, `docs:check`)

## Single-Agent Block V27: Profile, Statistiken & UI (offen)

- [ ] 27.0 Baseline-Freeze und UI-Markup-Analyse
- [ ] 27.1 V7 Profile-UX Ausbau
  - [ ] 27.1.1 Duplizieren und Import/Export-Funktion
  - [ ] 27.1.2 Standardprofil-Markierung ergaenzen
- [ ] 27.2 V8 Post-Match-Statistiken
  - [ ] 27.2.1 Datenaggregator fuer Round/Match-Stats ausbauen
  - [ ] 27.2.2 UI-Overlay fuer vertiefte Statistiken am Rundenende
- [ ] 27.3 V15 Telemetrie-Dashboard fuer iteratives Balancing
- [ ] 27.4 Abschluss-Gate, UI-Verifikation und Doku-Freeze (`docs:sync`, `docs:check`)

## Single-Agent Block V28: Architektur & Performance (offen)

- [ ] 28.0 Baseline-Freeze und Regression-Setup
- [ ] 28.1 Player "God Class" Refactoring
  - [ ] 28.1.1 Three.js Rendering in `PlayerView` auslagern
  - [ ] 28.1.2 Input-Handling in `PlayerController` isolieren
- [ ] 28.2 Bot "God Class" Refactoring
  - [ ] 28.2.1 Rendering in `BotView` kapseln
  - [ ] 28.2.2 Sensing/Probing-Logik fuer kuenftiges ML-Training abstrahieren
- [ ] 28.3 V13 Performance-Hotspot `maze` (Draw-Calls / Batching optimieren)
- [ ] 28.4 Abschluss-Gate, Performance-Metrics pruefen und Doku-Freeze (`docs:sync`, `docs:check`)

## Archivierte Referenzen

- Abgeschlossen: `docs/archive/plans/completed/`
- Abgeloest: `docs/archive/plans/superseded/`
- Frueherer Masterstand: `docs/archive/plans/superseded/Umsetzungsplan_bis_2026-03-06.md`
- GLB-Detailplan alt: `docs/archive/plans/superseded/Feature_GLB_Map_Loader.md`

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run docs:sync`
- `npm run docs:check`
