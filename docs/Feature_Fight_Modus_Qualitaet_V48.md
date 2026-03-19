# Feature Fight Modus Qualitaet V48

## Ziel

- Fight-Modus logisch konsistent halten (`modePath`, `gameMode`, Feature-Flag-Verhalten).
- Schaden/Feedback fuer Spieler klarer machen (Shield-Absorption vs. echte HP-Aenderung).
- Splitscreen-HUD im Fight-Modus verbessern (Damage-Indicator pro Human-Player).
- Hunt-Targeting-Hotpath absichern, damit hohe Fire-Rate + Bots stabil bleiben.

## Ist-Zustand

- `modePath`-Sync ist nicht vollstaendig bidirektional.
- Startvalidierung deckt den Konflikt `fight != HUNT` ab, aber nicht die inverse Drift.
- Feed-/Score-Werte verwenden an mehreren Stellen `applied` als "HP", obwohl Shield absorbieren kann.
- Damage-Indicator ist global statt pro Player.
- Trail-Line-Scan ist im MG-/Lock-On-Pfad schrittbasiert und kann bei Last teuer werden.

## Architektur-Entscheidung

- Kein neuer Spielmodus, keine neue Session-Art.
- Bestehende Event-Vertraege bleiben erhalten; neue Felder nur additiv (`hpDamage`, `shieldAbsorb`).
- UI-Verbesserungen bleiben im bestehenden HUD-/MatchFlow-System.
- Hotpath-Optimierung nur mit Guard/Feature-Toggle, um Rollback zu erleichtern.

## Betroffene Dateien

- `src/ui/menu/MenuCompatibilityRules.js`
- `src/core/runtime/MatchStartValidationService.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/UIManager.js`
- `src/hunt/HealthSystem.js`
- `src/hunt/HuntScoring.js`
- `src/hunt/mg/MGHitResolver.js`
- `src/entities/runtime/EntityRuntimeSupportAssembly.js`
- `src/hunt/HuntHUD.js`
- `src/ui/MatchFlowUiController.js`
- `src/hunt/HuntTargetingOps.js`
- `tests/core.spec.js`
- `tests/physics-hunt.spec.js`
- `tests/stress.spec.js`
- `docs/Umsetzungsplan.md`

## Risiken

- Risiko: mittel
- Hauptgruende:
  - Semantikwechsel bei Schaden kann bestehende Assertions/Telemetry beeinflussen.
  - HUD-Umstellung fuer Splitscreen kann unbeabsichtigt Singleplayer-Verhalten beruehren.
  - Hotpath-Optimierung kann Targeting-Regeln veraendern, wenn Sampling-Logik nicht gleichwertig bleibt.
- Mitigation:
  - Rueckwaertskompatible Event-Felder, klare Namenskonventionen (`hpDamage` vs. `applied`).
  - Szenario-Tests fuer Single/Splitscreen getrennt.
  - Baseline-Messung vor Optimierung + Guarded Rollout.

- [x] 48.1 Modus-Konsistenz und Startvalidierung
  - [x] 48.1.1 Bidirektionale Sync-Regeln fuer `modePath`/`gameMode` in Menu-Runtime + Compatibility-Regeln implementieren
  - [x] 48.1.2 Startvalidierung und Fight-Feature-Flag-UI-Guard synchronisieren
  - Verifikation:
    - `npm run test:core -- --grep T20v`
    - `npm run test:core -- --grep T20x`

- [x] 48.2 Schaden-/Feed-Semantik praezisieren
  - [x] 48.2.1 Einheitliche Schadensableitung definieren (`applied`, `absorbedByShield`, `hpDamage`) und in Combat-Events nutzbar machen
  - [x] 48.2.2 Killfeed/Scoreboard auf korrekte HP-Kommunikation umstellen (Shield separat)
  - Verifikation:
    - `npm run test:physics:hunt -- --grep T88`
    - `npm run test:physics:hunt -- --grep T89a`

- [x] 48.3 HUD und Splitscreen-Feedback
  - [x] 48.3.1 Damage-Indicator auf Player-spezifischen State + DOM-Mapping erweitern
  - [x] 48.3.2 Sichtbarkeit/Updates in Single, Splitscreen und Multiplayer pruefen
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`

- [ ] 48.4 Hunt-Targeting-Hotpath
  - [ ] 48.4.1 Baseline fuer MG-/Trail-Scan-Kosten erfassen und Profiling-Grenzen dokumentieren
  - [ ] 48.4.2 Optimierte Scan-Strategie (adaptive Step oder Gitter-Traversal) unter Guard implementieren
  - Verifikation:
    - `npm run test:physics:hunt -- --grep T61`
    - `npm run test:physics:hunt -- --grep T64`
    - `npm run test:physics:hunt -- --grep T89c`

- [ ] 48.99 Abschluss-Gate
  - [ ] 48.99.1 `npm run test:core`, `npm run test:physics:hunt`, `npm run test:stress`, `npm run build` erfolgreich
  - [ ] 48.99.2 `npm run docs:sync` und `npm run docs:check` erfolgreich, Lock/Ownership/Conflict-Log geprueft

## Dokumentationswirkung

- Neuer Detailplan: `docs/Feature_Fight_Modus_Qualitaet_V48.md`
- Neuer Masterblock: `docs/Umsetzungsplan.md` Block V48
- Ownership/Backlog in `docs/Umsetzungsplan.md` aktualisiert

## Freshness-Hinweis

Vor Abschluss der spaeteren Implementierung immer:

- `npm run docs:sync`
- `npm run docs:check`
