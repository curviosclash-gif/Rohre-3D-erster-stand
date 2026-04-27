# Fehlerbericht: User-owned 4-Env-Longrun endete ohne finalen Report

Datum: 2026-04-27

## Kontext

Der User-owned Survival-Longrun wurde nach dem 2-Env-Start bei 200000 Steps auf
4 Envs umgestellt. Ziel war Diagnose fuer maximale Survival-Zeit mit
10-Minuten-Step-Cap, unabhaengig vom offiziellen Bot-Trainingsplan.

## Fehlerbild

- Der 4-Env-Prozess war spaeter nicht mehr aktiv.
- `stderr` war leer.
- Artefakte existieren bis `step_0600000`.
- Es gibt keinen finalen `training_report.json`.
- Es gibt keinen finalen `user_owned_1m_longrun_report.json` fuer diese
  Zusatzspur.

## Betroffene Pfade

- `data/training/ppo/user-owned-survival-3m-4env/`
- `logs/training/user-owned-survival-3m-4env/`
- `dev/scripts/switch-user-owned-ppo-survival-to-4env-at-next-checkpoint.ps1`

## Befund

Die vorhandenen Snapshots sind als Diagnose brauchbar, aber der Lauf ist nicht
abschlussfaehig. Ohne finalen Report fehlen Exit-Code, finaler Snapshot-Status,
komplette Guardrails und maschinenlesbare Abschlussklasse.

Zusatzbefunde:

- Der automatische Wechsel funktionierte erst nach Korrektur eines
  PowerShell-Quoting-Problems bei Pfaden mit Leerzeichen/Klammern.
- Der Run bestaetigt Survival-Schwankung statt stabilen Fortschritt:
  300k `196.5`, 400k `304.25`, 500k `412.25`, 600k `151.5`.
- Terminal-/Death-Matrix blieb in den geprueften Snapshots `player-dead`/ohne
  Natural-Terminal-Signal.

## Root Cause

Wahrscheinlich operativer Runner-/Supervisor-Mangel, nicht PPO-Crash mit klarer
Exception:

- Detached Start loggt keinen verlässlichen Exit-Code in ein finales Artefakt.
- Kein Watchdog schreibt bei Prozessende zwingend einen Abschlussreport.
- Kein Supervisor unterscheidet sauber: normaler Stop, User-Stop,
  Prozessabbruch, Systemsleep, Terminal-Close, Sidecar-Ende.

## Status

Offen. Kein weiterer Langlauf sollte mit diesem losen Start-/Switch-Mechanismus
als beweisfuehrende Evidence gestartet werden.

## Naechster Schritt

Vor dem naechsten Longrun:

- Supervisor mit Heartbeat, PID-Liste, Exit-Code, letzter Snapshot-Zusammenfassung
  und finalem `run_exit_report.json` bauen.
- Stop/Switch nur als explizite Statusmaschine: `running`, `switch-requested`,
  `stopping-at-checkpoint`, `stopped`, `restarted`, `failed`.
- Pfade immer argument-list-sicher starten, nicht ueber fragile String-Commands.
- 6-Env zuerst als Smoke, nicht als 3M-Lauf.
