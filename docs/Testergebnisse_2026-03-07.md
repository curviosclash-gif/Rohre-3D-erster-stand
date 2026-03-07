# Testergebnisse vom 2026-03-07

## Phase 6 - Baseline Performance + KI-Stabilitaet

### Baseline-Setup

- Kommando: `npm run benchmark:baseline`
- Matrix: 4 Szenarien aus `data/bot_validation_report.json`
- Runden pro Szenario (Bot-Stabilitaet): 4
- FPS/Draw Sampling je Szenario: 8000 ms (Intervall 250 ms)
- Seed-Modus: none
- Repro-Hinweis: No explicit RNG seed hook available; reproducibility is driven by fixed matrix and runner parameters.

### Baseline-Matrix

| ID | Mode | Map | Bots | Planar | Portale | Runden |
|---|---|---|---:|:---:|---:|---:|
| V1 | 1p | standard | 1 | nein | 0 | 4 |
| V2 | 1p | maze | 3 | nein | 0 | 4 |
| V3 | 1p | complex | 3 | ja | 4 | 4 |
| V4 | 2p | standard | 2 | ja | 6 | 4 |

### Kennzahlen (Gesamt)

- FPS-Mittel: 59.98
- Draw Calls (Mittel): 20.99
- Bot-Winrate: 82.4%
- Stuck-Events: 0
- Runden erfasst: 17
- Performance-Samples: 70

### Kennzahlen je Szenario

| Szenario | Runden | FPS-Mittel | Draw Calls (Mittel) | Bot-Winrate | Stuck | Avg Survival |
|---|---:|---:|---:|---:|---:|---:|
| V1 (standard) | 5 | 59.94 | 17.00 | 60.0% | 0 | 30.82s |
| V2 (maze) | 4 | 60.00 | 24.00 | 100.0% | 0 | 29.63s |
| V3 (complex) | 4 | 60.00 | 23.73 | 100.0% | 0 | 31.62s |
| V4 (standard) | 4 | 60.00 | 22.50 | 75.0% | 0 | 45.25s |

### Kurzbewertung

- Bot-Winrate/Stuck basieren auf dem reproduzierbaren Bot-Validierungslauf; FPS/DrawCalls wurden je Szenario separat unter gleichen Matrix-Parametern erfasst.
- JSON-Report: `data/performance_ki_baseline_report.json`

## Phase 28.5 Abschluss-Gate

### Vorher/Nachher

- Draw-Call-Referenz vor echtem Portal-Instancing: `overall drawCallsAverage=37.67`, `V3 drawCallsAverage=62.40`, `V4 drawCallsAverage=37.00`.
- Abschlussstand nach echtem Portal-/Gate-Instancing: `overall drawCallsAverage=20.99`, `V3 drawCallsAverage=23.73`, `V4 drawCallsAverage=22.50`.
- FPS bleibt stabil bzw. leicht besser: `59.74 -> 59.98`, `stuckEvents=0`.

### Lifecycle

- Trend (`npm run benchmark:lifecycle -- --profile trend`): `domToGameInstanceMs=4283`, `startMatchLatencyMs=68`, `returnToMenuLatencyMs=63`.
- Vollprofil (`npm run benchmark:lifecycle -- --profile full`): `domToGameInstanceMs=3253`, `startMatchLatencyMs=179`, `returnToMenuLatencyMs=26`.

### End-Gate

- `npm run test:core` PASS (`49 passed`, `1 skipped`)
- `npm run test:physics` PASS (`47 passed`)
- `npm run test:gpu` PASS (`16 passed`)
- `npm run test:stress` PASS (`19 passed`)
- Visual-Checks:
  - Skill-Loop-Screenshot `tmp/develop-web-game-portal/shot-1.png`
  - Portal-Szenario `V3` Screenshot `tmp/perf-phase28-5-v3-instancing.png`
