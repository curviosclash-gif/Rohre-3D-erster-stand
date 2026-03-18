# Testergebnisse vom 2026-03-11

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

- FPS-Mittel: 60.00
- Draw Calls (Mittel): 40.89
- Bot-Winrate: 87.5%
- Stuck-Events: 0
- Runden erfasst: 16
- Performance-Samples: 63

### Kennzahlen je Szenario

| Szenario | Runden | FPS-Mittel | Draw Calls (Mittel) | Bot-Winrate | Stuck | Avg Survival |
|---|---:|---:|---:|---:|---:|---:|
| V1 (standard) | 4 | 60.00 | 18.00 | 75.0% | 0 | 24.96s |
| V2 (maze) | 4 | 60.00 | 19.84 | 75.0% | 0 | 19.21s |
| V3 (complex) | 4 | 60.00 | 105.64 | 100.0% | 0 | 26.77s |
| V4 (standard) | 4 | 60.00 | 45.69 | 100.0% | 0 | 27.35s |

### Kurzbewertung

- Bot-Winrate/Stuck basieren auf dem reproduzierbaren Bot-Validierungslauf; FPS/DrawCalls wurden je Szenario separat unter gleichen Matrix-Parametern erfasst.
- JSON-Report: `data/performance_ki_baseline_report.json`
