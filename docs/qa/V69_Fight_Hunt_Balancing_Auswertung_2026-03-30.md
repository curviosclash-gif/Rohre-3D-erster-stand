# V69 Balancing-Auswertung (Fight/Hunt)

Stand: 2026-03-30  
Scope: 69.5-69.6

## Evidence Runs

- `TEST_PORT=5386 PW_RUN_TAG=v69-5-policy PW_OUTPUT_DIR=test-results/v69-5-policy npx playwright test tests/physics-policy.spec.js --grep "T77|T78|T78b|T78c|T78d|T78e|T78f"` -> PASS (7/7)
- `TEST_PORT=5387 PW_RUN_TAG=v69-6-matrix PW_OUTPUT_DIR=test-results/v69-6-matrix npx playwright test tests/core.spec.js tests/game-mode-strategy.spec.js tests/physics-hunt.spec.js tests/physics-policy.spec.js --grep "T20ke|T14ea|S14a|S14b|S14d|T89a|T89k|T77|T78d|T78e|T78f"` -> PASS (11/11)

## Kurzfazit je Ziel

- MG-Window: stabiler Midrange-Korridor bleibt erhalten (`T89a`, `T77`, `T78d`).
- Rocket-Oekonomie/Alias: Legacy-Typen bleiben kompatibel, Verteilung und Auswahlpfad bleiben stabil (`T14ea`, `S14a`, `S14b`).
- Shield-Semantik: Shield-Hits beeinflussen Regenfenster korrekt und verhindern fruehe HP-Regeneration (`S14d`, `T89k`).
- Bot-/Policy-Verhalten: offensiv/defensiv getrennt, Retreat und Rocket-Trigger im Vitalitaetskontext plausibel (`T78d`, `T78e`, `T78f`).
- Telemetrie-Schema: Round-End Payload fuer Balancing-KPIs bleibt vollstaendig (`T20ke`).

## KPI-Bezug

- Referenz-Baseline bleibt `docs/qa/V69_Fight_Hunt_KPI_Baseline_2026-03-30.md`.
- V69-Aenderungen halten die Baseline-Felder intakt; keine Schema-Regression im Evidence-Lauf.

## Manuelle QA-Synchronisation

- Die manuelle Fokus-Checkliste wurde in `docs/qa/Manuelle_Testcheckliste_Spiel.md` unter Abschnitt 26 erweitert.
- Offene manuelle Punkte bleiben dort explizit trackbar fuer den naechsten interaktiven QA-Lauf.
