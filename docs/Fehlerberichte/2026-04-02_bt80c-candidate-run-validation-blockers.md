# Fehlerbericht: BT80C candidate run validation blockers

## Aufgabe/Kontext

- Task: BT80C naechste Schritte ausfuehren und ersten echten Challenger-Kandidatenlauf mit voller Evidence fahren
- Ziel: `challenger-balanced` gegen den eingefrorenen BT11-/BT20-Stand mit `run -> bot:validate -> eval -> gate` pruefen, ohne `latest` oder Champion umzuschreiben
- Datum: 2026-04-02

## Fehlerbild

- Beobachtung: Der volle `quick-benchmark`-Loop (`training:quick-benchmark`) laeuft auf dieser Hardware bereits in `training:run` in den 20-Minuten-Stage-Timeout. Ein verkleinerter Kandidatenlauf schreibt dagegen `run/eval/gate` sauber, aber `bot:validate` haengt wiederholt in `phase=scenario=V1 ... :wait-playing`, waehrend die Runtime auf `state=\"MENU\"` stehen bleibt.
- Erwartetes Verhalten: Ein kurzer BT80C-Kandidatenlauf erzeugt `run.json`, `bot-validation-report.json`, `eval.json`, `gate.json` und einen lesbaren Promotion-Status.
- Tatsaechliches Verhalten: Der volle Quick-Benchmark liefert nur ein `loop.json` mit `failedStage=run`; der verkleinerte Kandidatenlauf endet formal mit `promotionStatus=blocked`, weil `bot:validate` keinen Report schreibt und das Gate deshalb auf `validation-disabled` / `artifact-missing` faellt.

## Reproduktion

1. `npm run training:quick-benchmark -- --algorithm-profile challenger-balanced --series-stamp BT80C_QB_20260402T232241 --write-latest false --runs 1 --stop-on-fail false`
2. Warten, bis `data/training/series/BT80C_QB_20260402T232241/loop.json` geschrieben ist; der Run endet mit `reason: "timeout 1200000ms"` in der Stage `run`.
3. Einen verkleinerten Kandidatenlauf mit `training-run` fuer `BT80C_QB_SAFE_20260402T232241` starten und anschliessend `bot:validate` gegen denselben Run ausfuehren; der Validation-Lauf endet mit `page.waitForFunction ... wait-playing`, `state="MENU"` und schreibt keinen `bot-validation-report.json`.

## Betroffene Dateien/Komponenten

- `scripts/training-loop.mjs`
- `scripts/training-run.mjs`
- `scripts/bot-validation-runner.mjs`
- Preview-/Build-Pfad ueber `vite build` + `vite preview`
- Runtime-Start/Matchstart fuer Validation-Szenario `V1`

## Bereits getestete Ansaetze

- Ansatz: Minimaler Bridge-Run ohne Resume auf separatem Trainer-Port.
- Ergebnis: `training-run` funktioniert sauber; `run.json`, `trainer.json` und `checkpoint.json` werden in Sekunden geschrieben.
- Ansatz: Minimaler Bridge-Run mit `resume-checkpoint latest`.
- Ergebnis: Funktioniert ebenfalls sauber; `loaded=true`, keine Bridge-/Resume-Fehler.
- Ansatz: Verkleinerter echter Kandidatenlauf mit `performance-profile quick-benchmark`, `algorithm-profile challenger-balanced`, Resume von `latest`, aber kleinem Episoden-/Seed-/Mode-Budget.
- Ergebnis: `run.json`, `eval.json`, `gate.json` werden geschrieben; Promotion bleibt wegen fehlender Validation-Lane blockiert.
- Ansatz: `bot:validate` im Preview-Modus einmal mit Standardmatrix und einmal mit der frueher genutzten stabileren Konfiguration (`SCENARIO_COUNT=2`, `ROUNDS=3`, grosszuegigere Timeouts, `FORCE_KILL_PORT=false`).
- Ergebnis: Beide Laeufe bleiben vor Matchstart in `MENU` haengen; es wird kein `bot-validation-report.json` geschrieben.

## Evidence

- Logs:
  - Tool/Terminal-Ausgabe von `bot:validate` mit `phase=scenario=V1 ... wait-playing`, `state="MENU"`
- Screenshots/Artefakte:
  - `data/training/series/BT80C_QB_20260402T232241/loop.json`
  - `data/training/runs/BT80C_QB_SAFE_20260402T232241/run.json`
  - `data/training/runs/BT80C_QB_SAFE_20260402T232241/eval.json`
  - `data/training/runs/BT80C_QB_SAFE_20260402T232241/gate.json`
  - `data/training/runs/BT80C_DIAG_20260402T232241/run.json`
  - `data/training/runs/BT80C_DIAG_RESUME_20260402T232241/run.json`
- Relevante Commits:
  - noch keiner; aktueller Stand ist Diagnose/Evidence ohne Codefix

## Aktueller Stand

- Status: BT80C-Kandidatenlauf technisch anstossbar; Abschluss weiterhin blockiert
- Root-Cause-Stand:
  - `training-run` / Bridge / Resume sind im kleinen Pfad funktionsfaehig.
  - Der volle `quick-benchmark` ist fuer diese Maschine in der aktuellen Form zu schwer fuer den konfigurierten Stage-Timeout.
  - Der eigentliche Abschlussblocker fuer BT80C ist aktuell `bot:validate`: Die Validation-Runtime startet die Szene, kommt aber nicht aus `MENU` in `PLAYING`, sodass der Pflichtreport komplett fehlt.

## Naechster Schritt

- `scripts/bot-validation-runner.mjs` bzw. den Runtime-Startpfad fuer Szenario `V1` instrumentieren und fixen, damit der Validation-Lauf reproduzierbar den Matchstart erreicht; danach den BT80C-Kandidatenlauf erneut mit voller `bot:validate`-Lane und frischem Gate fahren.
