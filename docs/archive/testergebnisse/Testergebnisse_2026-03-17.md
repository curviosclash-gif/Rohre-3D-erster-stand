# Testergebnisse vom 2026-03-17

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
| V1 | 1p | standard | 2 | nein | 0 | 4 |
| V2 | 1p | maze | 2 | ja | 0 | 4 |
| V3 | 1p | complex | 3 | ja | 4 | 4 |
| V4 | 2p | standard | 2 | nein | 6 | 4 |

### Kennzahlen (Gesamt)

- FPS-Mittel: 51.87
- Draw Calls (Mittel): 36.23
- Bot-Winrate: 50.0%
- Stuck-Events: 0
- Runden erfasst: 16
- Performance-Samples: 47

### Kennzahlen je Szenario

| Szenario | Runden | FPS-Mittel | Draw Calls (Mittel) | Bot-Winrate | Stuck | Avg Survival |
|---|---:|---:|---:|---:|---:|---:|
| V1 (standard) | 4 | 44.26 | 10.00 | 25.0% | 0 | 28.21s |
| V2 (maze) | 4 | 50.97 | 55.33 | 25.0% | 0 | 27.42s |
| V3 (complex) | 4 | 55.31 | 35.88 | 75.0% | 0 | 37.99s |
| V4 (standard) | 4 | 54.21 | 45.00 | 75.0% | 0 | 34.01s |

### Kurzbewertung

- Bot-Winrate/Stuck basieren auf dem reproduzierbaren Bot-Validierungslauf; FPS/DrawCalls wurden je Szenario separat unter gleichen Matrix-Parametern erfasst.
- JSON-Report: `data/performance_ki_baseline_report.json`
