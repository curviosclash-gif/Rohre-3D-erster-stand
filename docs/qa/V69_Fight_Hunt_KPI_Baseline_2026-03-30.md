# V69 KPI Baseline (Fight/Hunt)

Stand: 2026-03-30
Scope: V69.1.2
Evidence run:

- `TEST_PORT=5371 PW_RUN_TAG=v69-telemetry PW_OUTPUT_DIR=test-results/v69-telemetry node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --grep "T20ke"` -> PASS

## Baseline-Quelle

- Round-End Telemetrie aus `MatchFlowUiController -> MenuTelemetryStore -> SettingsTelemetryFacade`.
- Deterministischer Probe-Run aus `T20ke` (synthetische Fight/Hunt-Metriken):
  - `itemUse.byMode`: `shoot=1`, `mg=1`, `use=0`, `other=0`
  - `itemUse.byType`: `ROCKET_WEAK=1`, `MG=1`
  - `mgHits=1`, `rocketHits=1`, `hpDamage=24`, `shieldAbsorb=5`

## KPI Baseline (Vergleichswert fuer Folgephasen)

| KPI | Formel | Baseline |
| --- | --- | --- |
| TTK (synthetisch) | `duration / eliminations` | `1.6s` (1 Runde, 1 Elimination) |
| Pickrate (Items/Runde) | `itemUse.total / rounds` | `2.0` |
| Hitrate MG | `mgHits / itemUse.byMode.mg` | `1.00` |
| Hitrate Rocket | `rocketHits / itemUse.byType.ROCKET_WEAK` | `1.00` |
| Kill-Share (human) | `humanWins / rounds` | `1.00` |
| Shield-Uptime-Proxy | `rounds(shieldAbsorb>0) / rounds` | `1.00` |

## Hinweise fuer 69.2-69.6

- Diese Baseline ist ein reproduzierbarer Technik-Baseline-Run, kein Live-Balancewert.
- Fuer MG-/Rocket-Tuning (69.2/69.3) werden reale Matchreihen gegen diese Formeln gespiegelt.
- Fuer Shield-Semantik (69.4) bleibt `shieldAbsorbPerRound` plus `Shield-Uptime-Proxy` das Pflichtsignal.
