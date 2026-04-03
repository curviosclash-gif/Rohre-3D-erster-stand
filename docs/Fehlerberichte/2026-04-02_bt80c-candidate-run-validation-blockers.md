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

## Analyse 2026-04-03

- Der Default-Runner auf `dev` ist im aktuellen Worktree zusaetzlich instabil: sowohl headed als auch headless wartet `bot:validate` mit `app:game-instance` 180000ms vergeblich auf `GAME_INSTANCE`.
- Direkte HTTP-Probes auf `http://127.0.0.1:<port>/@vite/client` und `http://127.0.0.1:<port>/src/core/main.js` liefern zwar `200`, brauchen lokal aber jeweils ca. 12s; der Dev-Transformpfad ist fuer den Validation-Runner damit kein belastbarer BT80C-Fixpunkt.
- Der eigentliche Alt-Blocker bleibt dennoch reproduzierbar: `node dev/scripts/bot-validation-runner.mjs --server-mode preview --headless true --bot-validation-report tmp/bt80c-debug-report-preview.json` bootet sauber und endet wieder in `phase=scenario=V1(1/1) round=1/1:wait-playing`, Diagnose `state="MENU"`, `players=[]`.
- Eine isolierte Preview-Probe mit `applyBotValidationScenario(0)` und anschliessendem `startMatch()` zeigt keinen Start-Validierungsfehler, loggt aber waehrend des kurzen `PLAYING`-Uebergangs `"[Game] Missing interactive match runtime"` und faellt danach ueber `submenu-game` nach `MENU` zurueck.
- Damit liegt der operative Fix nicht mehr im Trainings-Harness allein, sondern im normalen Matchstart-/Session-Aufbau (`src/ui/MatchFlowUiController.js`, `src/core/InteractiveMatchRuntimeGuard.js`, `src/core/runtime/GameRuntimeSessionHandler.js`, `src/state/MatchLifecycleSessionOrchestrator.js`, `src/state/MatchSessionFactory.js`, `src/core/runtime/RuntimeSessionLifecycleService.js`).
- Neuer Ueberlauf-Plan fuer den notwendigen Spielscope-Block: `docs/plaene/neu/BT80C_Runtime_Startpfad_Validation_Ueberlauf_2026-04-03.md`.

## Aktueller Stand

- Status: BT80C-Kandidatenlauf technisch anstossbar; Abschluss weiterhin blockiert
- Root-Cause-Stand:
  - `training-run` / Bridge / Resume sind im kleinen Pfad funktionsfaehig.
  - Der volle `quick-benchmark` ist fuer diese Maschine in der aktuellen Form zu schwer fuer den konfigurierten Stage-Timeout.
  - `bot:validate` bleibt der Abschlussblocker fuer BT80C, aber die aktuelle Analyse zeigt jetzt einen Scope-Ueberlauf: der Runner kann den Runtime-Start nur bis zu dem Punkt reproduzieren, an dem der normale Matchstart-/Session-Pfad `Missing interactive match runtime` produziert und wieder nach `MENU` faellt.
  - Solange dieser normale Spielscope-Defekt offen ist, kann `80.9.3` im Trainingsscope weder sauber implementiert noch mit drei reproduzierbaren Validation-Paessen abgeschlossen werden.

## Naechster Schritt

- Zuerst den neuen Ueberlauf-Plan `docs/plaene/neu/BT80C_Runtime_Startpfad_Validation_Ueberlauf_2026-04-03.md` manuell in den normalen Umsetzungsplan uebernehmen; `docs/Umsetzungsplan.md` bleibt dabei user-owned.
- Danach den normalen Matchstart-/Session-Pfad im vorgeschlagenen Spielscope-Block reparieren.
- Erst nach diesem Runtime-Fix zu BT80C `80.9.3` zurueckkehren und die eigentliche Harness-Haertung samt Drei-Pass-Vorbedingung abschliessen.

## Update 2026-04-03 Runtime-Fix

- Der Spielscope-Fix liegt in `src/state/MatchLifecycleSessionOrchestrator.js`: Ein bootstrap-weites Menu-`particles` wurde bisher als aktive Match-Session fehlinterpretiert und loeste vor dem ersten echten Matchstart eine asynchrone Finalisierung aus. Dadurch wurde die frisch initialisierte Session als `stale` verworfen, `startRound()` lief ohne `arena`/`entityManager`/`powerupManager`, und der Guard fiel mit `Missing interactive match runtime` nach `MENU` zurueck.
- Nach der Haertung zaehlen fuer `_hasCurrentSessionRefs()` nur noch echte Match-Refs (`arena`, `entityManager`, `powerupManager`), nicht mehr ein isoliertes Bootstrap-`particles`.
- Repo-Evidence fuer den reparierten Runtime-Startpfad:
  - `node scripts/perf-lifecycle-measure.mjs` mit `PERF_LIFECYCLE_SERVER_MODE=preview` und `PERF_LIFECYCLE_PLAYING_TIMEOUT=60000` schreibt `tmp/perf_phase28_5_lifecycle_trend.json` und misst wieder einen erfolgreichen Lifecycle (`match_started -> match_ended -> menu_opened`, `startMatchLatencyMs=10677`).
  - `node dev/scripts/bot-validation-runner.mjs` mit `BOT_RUNNER_SERVER_MODE=preview`, `BOT_RUNNER_SCENARIO_COUNT=1`, `BOT_RUNNER_ROUNDS=1`, `BOT_RUNNER_PLAYING_TIMEOUT=30000` und `BOT_RUNNER_MATCH_TIMEOUT=60000` schreibt `tmp/bt80c-repro-report.json`; der Runner sieht jetzt `state="PLAYING"` mit drei Spielern statt `MENU`/`players=[]`.
- Offener Restpunkt:
  - Der minimierte Validation-Lauf endet noch mit `forced-round`/`timeout-round`, weil die Runde innerhalb des aktuellen Harness-Budgets nicht natuerlich zu `ROUND_END` oder `MATCH_END` kommt. Das ist kein normaler Matchstart-/Session-Defekt mehr, sondern wieder BT80C-/Trainingsscope-Arbeit fuer `80.9.3`.
