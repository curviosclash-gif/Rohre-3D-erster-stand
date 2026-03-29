# Feature V50: 10h Trainingsmarathon fuer den Bot

Stand: 2026-03-21
Status: In Bearbeitung (10h-Lauf aktiv seit 2026-03-21 02:17 CET)

## Ziel

Ein reproduzierbarer Operator-Flow, der das bestehende Training ueber ein hartes Zeitbudget von 10 Stunden laufen laesst, sauber beendet und den Abschlusszustand als Artefakt dokumentiert.

## Betroffene Dateien

- `scripts/training-loop.mjs`
- `tests/trainer-v34-loop.test.mjs`
- `package.json`
- `docs/Umsetzungsplan.md`

## Risiko-Einschaetzung

- Risiko: mittel
- Hauptgruende:
  - Langlaeufer duerfen den bestehenden Kurzlauf-Flow nicht regressieren.
  - Die Stopp-Logik muss bei Failures und bei Budgetende eindeutig bleiben.
  - Operator-Start muss nachvollziehbar sein (PID, Logs, Serien-Stempel).

## Architektur-Check

- Wiederverwendung statt neuer Orchestrator:
  - `scripts/training-loop.mjs` bleibt Single-Source fuer `run -> eval -> gate`.
  - Zeitbudget wird als additive Steuerung integriert.
- Schnittstellen:
  - Keine Aenderung an `training-run`, `training-eval`, `training-gate` Contracts.
  - Serienartefakt `data/training/series/<seriesStamp>/loop.json` wird nur additiv erweitert.

## Umsetzung (Phasen mit Unterphasen)

- [x] 50.1 Plan- und Baseline-Setup
  - [x] 50.1.1 Plan und Scope in Masterplan + Feature-Dokument verankern
  - [x] 50.1.2 Kurzlauf als Baseline zur Laufzeitabschaetzung fahren

- [x] 50.2 Zeitbudget-Orchestrierung
  - [x] 50.2.1 CLI-Parameter `--duration-ms` und `--duration-hours` implementieren
  - [x] 50.2.2 Abbruchlogik und Serien-Summary um Budgetstatus/Stopgrund erweitern

- [x] 50.3 Operativer Startpfad
  - [x] 50.3.1 `npm`-Script fuer 10h-Lauf bereitstellen
  - [x] 50.3.2 10h-Lauf als Hintergrundprozess starten (PID + Logs dokumentieren)

- [x] 50.9 Abschluss-Gate
  - [x] 50.9.1 Script-nahe Verifikation (`tests/trainer-v34-loop.test.mjs`) inkl. Budget-Stop
  - [x] 50.9.2 `npm run docs:sync` und `npm run docs:check` erfolgreich

## Verifikation (functional-unit boundaries)

- Nach 50.2: Node-Test fuer `training-loop` inklusive neuer Duration-Logik.
- Nach 50.3: Realer Start eines 10h-Laufs (Background), Artefakt-/Log-Pfade pruefen.
- Nach 50.9: Doku-Freshness-Gate.

## Lauf-Metadaten (aktiver 10h-Run)

- Serien-Stempel: `TRAIN10H_20260321T021704`
- PID: `11800`
- Startzeit: `2026-03-21T02:17:05+01:00`
- Erwartetes Ende: `2026-03-21T12:17:05+01:00`
- Stdout-Log: `output/training/TRAIN10H_20260321T021704/stdout.log`
- Stderr-Log: `output/training/TRAIN10H_20260321T021704/stderr.log`
- Meta-Datei: `output/training/TRAIN10H_20260321T021704/run-meta.json`
