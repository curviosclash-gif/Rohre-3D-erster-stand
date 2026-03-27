# Fehlerbericht: training resume-command-timeout

## Aufgabe/Kontext

- Task: BT20 Survival-Trainingsplan anlegen und 10h-Training starten
- Ziel: 10h-Survival-Fenster mit Resume vom letzten stabilen BT11-Checkpoint starten
- Datum: 2026-03-28

## Fehlerbild

- Beobachtung: `scripts/training-run.mjs` bekommt fuer `trainer-checkpoint-load` bzw. `trainer-checkpoint-load-latest` keinen Command-Reply und laeuft in `command-timeout`.
- Erwartetes Verhalten: Der Bridge-Command liefert eine Antwort mit `loaded=true|false` und ggf. einer Fehlerursache.
- Tatsaechliches Verhalten: `responseOk=false`, `loaded=false`, `error=null`, waehrend der Lauf nur mit `resume-strict false` weiterlaeuft.

## Reproduktion

1. `npm run training:10h -- --series-stamp BT20_SURV_... --resume-checkpoint data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json --resume-strict true`
2. Warten, bis `scripts/training-run.mjs` den Resume-Command an den Trainer-Server sendet.
3. Im Log erscheint `checkpoint-resume-failed (...)` oder bei `strict=false` nur `command-timeout` ohne Command-Response.

## Betroffene Dateien/Komponenten

- `scripts/training-run.mjs`
- `src/entities/ai/training/WebSocketTrainerBridge.js`
- `trainer/server/TrainerServer.mjs`
- `scripts/trainer-server.mjs`

## Bereits getestete Ansaetze

- Ansatz: Direktes Laden des BT11-Checkpoints via `DqnTrainer.importCheckpoint(...)` und `TrainerSession` mit Server-Config.
- Ergebnis: Import funktioniert lokal und mit `hiddenLayers=[256,128]` korrekt.
- Ansatz: Startup-Resume ueber `TRAINER_RESUME_CHECKPOINT` + leerem Run-Token `--resume-checkpoint=`.
- Ergebnis: Funktioniert als Workaround; echter Resume ist in `trainer.json` ueber `checkpointLoads=1`, `resumeSource`, `optimizerSteps=1588329` und `envSteps=10979007` belegt.
- Ansatz: Direkter Bridge-Command `trainer-checkpoint-load` gegen Test-Server.
- Ergebnis: Ready kommt an, Command-Response bleibt `null`.

## Evidence

- Logs:
  - `output/training/BT20_SURV_20260328T000841-10h.log`
- Screenshots/Artefakte:
  - `data/training/runs/BT20_SURV_20260328T000841-r01/run.json`
  - `data/training/runs/BT20_SURV_20260328T000841-r01/trainer.json`
  - `data/training/runs/latest.json`
- Relevante Commits:
  - noch keiner fuer diesen Workaround

## Aktueller Stand

- Status: Workaround aktiv, 10h-Lauf gestartet
- Root-Cause-Stand: Checkpoint selbst ist gueltig; Problem liegt im Command-Response-Pfad zwischen `training-run`/Bridge und Trainer-Server, nicht im Checkpoint-Import.

## Naechster Schritt

- Bridge-/Server-Response fuer `trainer-checkpoint-load` instrumentieren und fixen, damit Resume wieder ueber den normalen Run-Command statt nur ueber Startup-Resume moeglich ist.
