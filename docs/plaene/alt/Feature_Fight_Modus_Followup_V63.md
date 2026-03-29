# Feature Fight-Modus Follow-up V63

Stand: 2026-03-26
Status: Geplant
Owner: Codex

## Ziel

Fight-Modus auf Basis der Analyse vom 2026-03-26 technisch konsolidieren:

- Runtime-Config und Mode-Semantik entlang eines eindeutigen Contracts vereinheitlichen.
- Trail-Targeting und Trefferfairness im Fight-Hotpath stabilisieren.
- HuntHUD-Updates und Fight-spezifische Runtime-Performance gezielt nachhaerten.

## Ausgangslage

Die Analyse hat vier konkrete Follow-up-Bereiche gezeigt:

- Fight-Hotpaths deaktivieren `optimizedTrailScan` trotz vorhandenem Guard.
- Fight-Code mischt `gameModeStrategy`, `getActiveRuntimeConfig()`, statische `HUNT_CONFIG` und deprecated Fallbacks.
- `TrailCollisionQuery` nimmt den ersten statt den naechsten Treffer entlang der Linie.
- Fight-HUD und Menu-/Respawn-Semantik erzeugen vermeidbare Last bzw. unklare UX.

Baseline-Artefakte:

- Runtime-Probe: `tmp/fight-mode-analysis-runtime/snapshot.json`
- Sichtprobe: `tmp/fight-mode-analysis-runtime/fight-playing.png`
- Vorherige Fight-Basis: `docs/archive/plans/completed/Feature_Fight_Modus_Qualitaet_V48.md`

## Betroffene Dateien (geplant)

- `src/entities/systems/HuntCombatSystem.js`
- `src/entities/systems/projectile/ProjectileSimulationOps.js`
- `src/entities/systems/projectile/ProjectileHitResolver.js`
- `src/entities/systems/trails/TrailCollisionQuery.js`
- `src/entities/ai/BotRuntimeContextFactory.js`
- `src/hunt/HuntTargetingPerf.js`
- `src/hunt/HuntHUD.js`
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/menu/MenuCompatibilityRules.js`
- `src/core/settings/SettingsSanitizerOps.js`
- `tests/physics-hunt.spec.js`
- `tests/core.spec.js`
- `tests/stress.spec.js`

## Architektur-Leitlinien

- Kein neuer Spielmodus, keine neue Session-Art.
- Fight bleibt auf bestehenden Hunt-/Strategy-Contracts aufgebaut.
- Hotpath-Optimierungen bleiben guard-faehig und rueckrollbar.
- Menu-/Respawn-Verhalten muss fuer Nutzer und Runtime dieselbe Quelle der Wahrheit haben.

## Phasenplan

- [ ] 63.1 Runtime-Config und Mode-Contracts vereinheitlichen
  - [ ] 63.1.1 `ProjectileHitResolver`, `BotRuntimeContextFactory`, `HuntModeStrategy` und angrenzende Fight-Pfade auf `gameModeStrategy + getActiveRuntimeConfig()` vereinheitlichen; deprecated/statische Fallbacks entfernen oder kapseln.
  - [ ] 63.1.2 `MenuCompatibilityRules`, `MenuGameplayBindings`, `SettingsSanitizerOps` und Fight-UI so abstimmen, dass Respawn-/Session-/Mode-Semantik eindeutig ist und mit Tests abgesichert werden kann.

- [ ] 63.2 Trail-Targeting und Trefferfairness haerten
  - [ ] 63.2.1 `optimizedTrailScan` in `HuntCombatSystem`, `ProjectileSimulationOps` und `HuntTargetingPerf` guarded aktivieren statt hart zu deaktivieren.
  - [ ] 63.2.2 `TrailCollisionQuery` auf nearest-hit Auswahl entlang der Linie umstellen und Characterization-Faelle fuer dichte Trail-Szenarien absichern.

- [ ] 63.3 HUD- und Runtime-Polish
  - [ ] 63.3.1 `HuntHUD` auf delta-basierte DOM-Updates fuer HP-/Shield-/Overheat-Anzeigen umstellen.
  - [ ] 63.3.2 Fight-Runtime-Probe fuer Menu-Readiness, Fight-Spikes und HUD-Verhalten nachziehen; Artefakte als Evidence ablegen.

- [ ] 63.4 Verifikation und Rollout
  - [ ] 63.4.1 Relevante Regressionen in `tests/physics-hunt.spec.js`, `tests/core.spec.js` und bei Bedarf `tests/stress.spec.js` erweitern oder aktualisieren.
  - [ ] 63.4.2 Verifikationsmatrix fuer Fight dokumentieren: `npm run test:core`, `npm run test:physics:hunt`, `npm run test:stress`, Runtime-Probe mit Snapshot/Screenshot.

- [ ] 63.99 Integrations- und Abschluss-Gate
  - [ ] 63.99.1 `npm run test:core`, `npm run test:physics:hunt`, `npm run test:stress` und `npm run build` sind fuer den Scope gruen.
  - [ ] 63.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; Lock-/Ownership-/Backlog-Pflege ist konsistent.

## Verifikationsstrategie

- Runtime/Settings/Menu: `npm run test:core`
- Fight-/Trail-Physik: `npm run test:physics:hunt`
- UI-/HUD-Regressionen unter Last: `npm run test:stress`
- Plan-/Doku-Gates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`

## Risiken

- Optimierter Trail-Scan veraendert Trefferselektion subtil.
  - Mitigation: Characterization-Tests fuer MG-, Rocket- und Dense-Trail-Faelle vor Rollout.
- Vereinheitlichte Respawn-/Mode-Semantik kann bestehende Menue-Presets sichtbar aendern.
  - Mitigation: Sanitizer-/Compatibility-Tests plus klare UI-Disable/Copy-Entscheidung.
- HUD-Delta-Updates koennen legitime Statuswechsel verschlucken.
  - Mitigation: Splitscreen-/Fight-Regressionen mit Snapshot und gezielter DOM-Assertion.
