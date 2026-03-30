# Feature Item/Raketen/Schild/MG Balance V69

Stand: 2026-03-29
Status: Geplant
Owner: Codex

## Ziel

- Kampf- und Item-Meta im Fight/Hunt-Modus stabilisieren, damit MG, Raketen, Shield und Utility-Items klar unterscheidbare Staerken haben.
- Balance-Entscheidungen datengetrieben machen (Telemetrie + reproduzierbare KPI-Gates statt Einzelwahrnehmung).
- Spawn- und Item-Contracts (inkl. Legacy-Mapdaten) konsolidieren, damit konfigurierte Werte im Match tatsaechlich so ankommen.

## Ausgangslage

- MG trifft mit hohem Default-Trail-Aimradius sehr verzeihend; gleichzeitige Shared-Cooldown-Nutzung mit Raketen erzeugt harte Tradeoffs.
- Rocket-Tiers sind funktional vorhanden, aber Legacy-Pickup-Typen in einzelnen Maps sind nicht auf aktive Tier-Namen normalisiert.
- Shield absorbiert Schaden korrekt, interagiert aber mit Regen-/Timing-Semantik und Item-Nutzung ohne expliziten globalen Use-Cooldown.
- Round-Telemetrie aggregiert `ITEM_USE`, aber differenziert noch nicht sauber nach Nutzungspfad (`use`/`shoot`/`mg`) und Item-Typ.

## Architektur-Leitlinien

- Kein neuer Modus; Umsetzung innerhalb bestehender Hunt/Fight-Contracts.
- RuntimeConfig bleibt zentrale Quelle fuer Balancing-Werte; keine versteckten Sonderpfade pro Modul.
- Balance-Parameter nur mit passenden Tests/Telemetry erweitern.
- Kompatibilitaet fuer bestehende Maps/Presets bleibt erhalten (Alias/Migration statt hartem Bruch).

## Betroffene Dateien (geplant)

- `src/hunt/HuntConfig.js`
- `src/core/RuntimeConfig.js`
- `src/core/settings/SettingsSanitizerOps.js`
- `src/ui/menu/MenuDefaultsEditorConfig.js`
- `src/ui/menu/MenuGameplayBindings.js`
- `src/entities/Powerup.js`
- `src/modes/HuntModeStrategy.js`
- `src/hunt/RocketPickupSystem.js`
- `src/hunt/HealthSystem.js`
- `src/entities/systems/lifecycle/PlayerActionPhase.js`
- `src/state/recorder/RoundMetricsStore.js`
- `src/ui/MatchFlowUiController.js`
- `src/hunt/HuntBotPolicy.js`
- `src/entities/ai/HuntBridgePolicy.js`
- `tests/physics-hunt.spec.js`
- `tests/physics-policy.spec.js`
- `tests/core.spec.js`
- `docs/Umsetzungsplan.md`
- `docs/qa/Manuelle_Testcheckliste_Spiel.md`

## Phasenplan

Hinweis fuer Abschluss-Evidence:

- Jeder spaeter auf `[x]` gesetzte Punkt nutzt das Format:
  `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

- [x] 69.1 Balance-Telemetrie und KPI-Baseline (abgeschlossen: 2026-03-30; evidence: `npm run test:fast` + `TEST_PORT=5371 PW_RUN_TAG=v69-telemetry PW_OUTPUT_DIR=test-results/v69-telemetry node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --grep "T20ke"` -> `test-results/v69-telemetry`)
  - [x] 69.1.1 Round-/Combat-Metriken fuer `itemUse.mode`, `itemType`, `mgHits`, `rocketHits`, `shieldAbsorb`, `hpDamage` granular erfassen und im Telemetrie-Payload durchreichen. (abgeschlossen: 2026-03-30; evidence: Round-End-Telemetriepfad erweitert in `RoundMetricsStore`/`MatchFlowUiController`/`MenuTelemetryStore` inkl. `T20ke`)
  - [x] 69.1.2 KPI-Baseline fuer Fight/Hunt dokumentieren (TTK, Pickrate, Hitrate, Kill-Share, Shield-Uptime) und als Vergleichswert fuer Folgephasen fixieren. (abgeschlossen: 2026-03-30; evidence: `docs/qa/V69_Fight_Hunt_KPI_Baseline_2026-03-30.md`)

- [x] 69.2 MG-Tuning und Trefferfenster (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5381 PW_RUN_TAG=v69-2-core PW_OUTPUT_DIR=test-results/v69-2-core npx playwright test tests/core.spec.js --grep "T20x0"` + `TEST_PORT=5382 PW_RUN_TAG=v69-2-physics PW_OUTPUT_DIR=test-results/v69-2-physics npx playwright test tests/physics-hunt.spec.js --grep "T64|T89a|T89i"` -> `test-results/v69-2-core`, `test-results/v69-2-physics`)
  - [x] 69.2.1 Default-/Preset-Werte fuer `mgTrailAimRadius` und angrenzende MG-Parameter fuer Fight/Hunt harmonisieren; UI- und Runtime-Defaults konsistent halten. (abgeschlossen: 2026-03-30; evidence: `src/ui/menu/MenuDefaultsEditorConfig.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/core/config/SettingsRuntimeContract.js`, `src/ui/UIManager.js`, `index.html`, `docs/prozess/Standardeinstellungen.md`)
  - [x] 69.2.2 MG-Falloff/Overheat/Lockout gegen Zielkorridor validieren und Tests fuer Midrange-TTK + Trail-Hit-Fairness erweitern. (abgeschlossen: 2026-03-30; evidence: `tests/physics-hunt.spec.js` (`T64`, `T89a`, `T89i`) + Physics-Run `test-results/v69-2-physics`)

- [x] 69.3 Rocket-Tiers und Spawn-Oekonomie (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5383 PW_RUN_TAG=v69-3 PW_OUTPUT_DIR=test-results/v69-3 npx playwright test tests/core.spec.js tests/game-mode-strategy.spec.js --grep "T14ea|S14a|S14b|S14c"` -> `test-results/v69-3`)
  - [x] 69.3.1 Legacy-Rocket-Pickup-Typen (`ROCKET_STRONG` etc.) per Alias/Migration auf aktive Tier-Typen normalisieren. (abgeschlossen: 2026-03-30; evidence: `src/hunt/RocketPickupSystem.js` + `src/entities/Powerup.js` + `src/entities/mapSchema/MapSchemaSanitizeOps.js` + Map-Preset-Migration in `src/core/config/maps/presets/neon_abyss.js`/`src/core/config/maps/presets/crystal_ruins.js` + `T14ea`/`S14a`)
  - [x] 69.3.2 Rocket-Tier- und Non-Rocket-Spawngewichte robust machen (normalisierte Gewichte, deterministische Verteilung, Tests fuer Grenzfaelle). (abgeschlossen: 2026-03-30; evidence: `src/hunt/RocketPickupSystem.js` + `src/modes/HuntModeStrategy.js` + `S14b`/`S14c`)

- [x] 69.4 Shield- und Damage-Semantik (abgeschlossen: 2026-03-30; evidence: `TEST_PORT=5384 PW_RUN_TAG=v69-4 PW_OUTPUT_DIR=test-results/v69-4 npx playwright test tests/game-mode-strategy.spec.js tests/physics-hunt.spec.js --grep "S14d|T89j|T89k"` -> `test-results/v69-4`)
  - [x] 69.4.1 Shield-Hit-, Regen- und Damage-Timestamp-Interaktion klar definieren und konsistent in Health-/Feedback-Pfaden abbilden. (abgeschlossen: 2026-03-30; evidence: `src/hunt/HealthSystem.js` + `src/modes/HuntModeStrategy.js` + `S14d`/`T89k`)
  - [x] 69.4.2 Item-Nutzungsfenster fuer defensive Ketten (Shield-Spam) absichern, ohne Utility-Flow fuer normale Nutzung zu zerstoeren. (abgeschlossen: 2026-03-30; evidence: `src/entities/systems/HuntCombatSystem.js` + `src/entities/Player.js` + `src/hunt/HuntConfig.js` + `T89j`)

- [ ] 69.5 Bot-/Policy-Anpassung
  - [ ] 69.5.1 HuntBotPolicy/BotDecisionOps an neue Balance-Parameter und Item-Oekonomie anpassen (offensiv/defensiv sauber getrennt).
  - [ ] 69.5.2 HuntBridgePolicy-Entscheidungsregeln fuer MG/Rocket/Retreat mit den neuen KPI-Zielen synchronisieren.

- [ ] 69.6 Verifikation und Rollout
  - [ ] 69.6.1 Tests erweitern: MG-Window, Rocket-Alias/Verteilung, Shield-Regen-Interaktion, Telemetrie-Schema-Regression.
  - [ ] 69.6.2 Manuelle QA fuer Fight/Hunt-Combat-Checks aktualisieren und kurze Balancing-Auswertung als Evidence dokumentieren.

- [ ] 69.99 Integrations- und Abschluss-Gate
  - [ ] 69.99.1 `npm run test:core`, `npm run test:physics:hunt`, `npm run test:physics:policy`, `npm run build` sind fuer den Scope gruen.
  - [ ] 69.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Pipeline-Abgleich sind abgeschlossen.

## Risiko-Register

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| MG-Nerf fuehlt sich unpraezise statt fair an | hoch | Gameplay | Trefferfenster schrittweise reduzieren, parallel TTK/Hitrate messen | Spielerfeedback: "MG useless" oder "MG immer noch auto-hit" |
| Rocket-Alias-Migration bricht bestehende Maps | mittel | Gameplay/Content | Alias + Validation + Map-Smoke fuer betroffene Presets | Items spawnen nicht oder als falscher Typ |
| Shield-Anpassung erzeugt neue Unsterblichkeits- oder Burst-Probleme | hoch | Gameplay | Shield-/Regen-Interaktion mit Characterization-Tests absichern | TTK driftet stark oder Shield dominiert Meta |
| Mehr Telemetrie erzeugt Runtime-Overhead | mittel | Core | Sampling/Batching, kompakte Payloads, Profiler-Vergleich vorher/nachher | Fight-Frames zeigen zusaetzliche Spikes |
