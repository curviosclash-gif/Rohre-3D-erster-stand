# BT93K Intake-Vorschlag: Survival-First Objective Reset

Datum: 2026-04-27

Status: Vorschlag fuer user-owned Intake in `docs/bot-training/Bot_Trainingsplan.md`.

Dieser Vorschlag oeffnet BT94A nicht. Er erlaubt keinen Candidate, keinen Freeze,
keinen Promote, keinen Rollout und keine produktive Runtime-Umschaltung.

## Entscheidungskern

Der naechste Fortschritt kommt nicht aus einem weiteren Blind-Longrun. Der Bot
ueberlebt in der 1M-Lane laenger, aber die Lernaufgabe produziert weiter
`naturalTerminalCount=0`, `player-dead-only` und `checkpointReached=0`.

BT93K soll den PPO-Pfad hart auf das eigentliche Primaerziel zuschneiden:

- maximale Survival-Zeit bleibt Prio 1,
- Survival darf aber nicht mehr mit toten Progress-/Terminal-Signalen verwechselt
  werden,
- 6 Envs werden erst nach Infrastruktur-Smoke benutzt,
- CUDA wird separat benchmarked und nicht blind aktiviert.

## Harte Startbefunde

| Befund | Wert | Quelle |
| --- | ---: | --- |
| 93J.5c Resultat | `reward-still-blocking` | `data/training/ppo/bt93j/user_owned_1m_longrun_report.json` |
| 93J.7.1 Entscheidung | `diagnose-loop-required` | `data/training/ppo/bt93j/post_longrun_decision_report.json` |
| Final AvgSteps | `166.866667` | 93J.5c |
| Delta vs DQN Steps | `+49.341667` | 93J.5c |
| Natural Terminals | `0` | 93J.5c |
| Player-dead-only | `true` | 93J.5c |
| Progress-/Objective-Rewards | `0` | 93J.5c |
| BT94A | `claimable=false` | `data/training/ppo/bt94a/no_start_gate.json` |

Der User-owned 3M/4-Env-Versuch vom 2026-04-27 bestaetigt als Zusatzsignal:
Survival-Spitzen entstehen, aber die Lane blieb instabil und endete ohne finalen
Report. Diese Zusatzspur ist Diagnose, keine Plan-Evidence fuer BT94A.

## Ziel

Einen Bot trainieren, gegen den ein Mensch schwer laenger ueberlebt. Das heisst
zuerst:

- lange Survival-Episoden reproduzierbar machen,
- fruehe Todesfaelle reduzieren,
- max-step-only Plateaus transparent begrenzen,
- Natural-/Progress-/Objective-Signale mindestens reachability-gruen machen,
- danach erst 6-Env und laengere Runs.

Nicht-Ziel:

- kein Parcours-Abschluss als Hauptziel,
- kein Champion-/Candidate-Claim,
- keine Produktintegration,
- keine Holdout-Nutzung im Repair-Smoke.

## Phase K.1 Decision und Metrikvertrag

- [ ] K.1.1 93J.7.1-Entscheidung als Startwahrheit pinnen.
- [ ] K.1.2 Survival-Metriken trennen: `avgSteps`, `longestEpisode`,
  `deathBefore60Share`, `maxStepShare`, `naturalTerminalShare`,
  `progressSignalNonZero`.
- [ ] K.1.3 Gate definieren: ein Run darf nur laenger werden, wenn
  technische Gates gruen sind und mindestens ein Zielsignal erreichbar ist.

## Phase K.2 Runner-Signalreparatur

- [ ] K.2.1 Curriculum-Uhr von episodischem `tickIndex` auf monotone
  Env-/Trainingssteps umstellen.
- [ ] K.2.2 `activeCurriculumStage` in Step-/Eval-Telemetrie reporten.
- [ ] K.2.3 `progressEvent` nicht behaupten, solange es im echten Runner-Pfad
  nicht erreichbar ist; Reachability-Smoke definieren.
- [ ] K.2.4 `effectiveMap`, `effectiveDomainMode`, `planarMode` und Seeds in
  Train/Eval-Reports ausweisen.

## Phase K.3 Mode-/Map-Smokes

- [ ] K.3.1 Headless-CLI und Python-Env fuer `mapKey`, `domainMode`,
  `planarMode` und `modePath` verdrahten.
- [ ] K.3.2 Kurze Probes fuer `classic-3d`, `classic-2d`, `hunt-3d`,
  `hunt-2d` auf `standard` ausfuehren.
- [ ] K.3.3 Erst nach mode-aware Evidence entscheiden, ob gemeinsame Policy
  reicht oder getrennte Policies/Normalize-States noetig sind.

## Phase K.4 6-Env Survival-Smoke

- [ ] K.4.1 6-Env-Smoke mit kleinem Budget vorbereiten, nicht als Longrun.
- [ ] K.4.2 Erfolgskriterium: alle 6 Sidecars starten, Reports enthalten
  effektive Seeds/Mode/Map, keine Runtime-/Action-Safety-Regression.
- [ ] K.4.3 Nur bei gruenem Smoke 100k-Vergleich gegen 2/4 Env.

## Phase K.5 CUDA-Benchmark

- [ ] K.5.1 Separaten CUDA-PyTorch-Env vorbereiten; CPU-Env bleibt als
  funktionierender Referenzpfad erhalten.
- [ ] K.5.2 CPU vs CUDA mit identischem 2/4/6-Env-Smoke vergleichen.
- [ ] K.5.3 CUDA nur behalten, wenn Wallclock stabil mindestens 20-30 Prozent
  besser ist und keine Treiber-/Artifact-/Determinismusprobleme auftreten.

## Phase K.6 Longrun-Leiter

- [ ] K.6.1 20k Signal-Smoke.
- [ ] K.6.2 50k 6-Env-Smoke.
- [ ] K.6.3 100k Vergleich 2/4/6 Env.
- [ ] K.6.4 300k Diagnose-Longrun.
- [ ] K.6.5 1M nur nach nonzero Signal und stabiler Survival-Verteilung.

## Entscheidung

Empfehlung: BT93K aufnehmen, bevor ein weiterer grosser Lauf gestartet wird.

Begruendung: Der Bot hat Survival-Fortschritt gezeigt. Der aktuelle Pfad kann
aber noch nicht beweisen, dass er mehr als Cap-Survival lernt. Deshalb muessen
Runner-Signale, Mode-/Map-Wirklichkeit und 6-Env-Stabilitaet zuerst belastbar
werden.
