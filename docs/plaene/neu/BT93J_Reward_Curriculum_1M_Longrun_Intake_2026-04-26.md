# BT93J Intake-Vorschlag: Reward/Curriculum Proof-Lane und 1000000-Step Longrun

Datum: 2026-04-26

Status: Vorschlag fuer user-owned Intake in `docs/bot-training/Bot_Trainingsplan.md`.

Dieser Vorschlag oeffnet BT94A nicht. Er erlaubt keinen Candidate, keinen Freeze,
keinen Promote, keinen Rollout und keine produktive Runtime-/AI-Hub-/Matchstart-
Integration.

## Entscheidungskern

Der bisherige Plan bleibt fachlich sinnvoll, wenn BT93J zwischen `93J.5a` und
`93J.6` zwei neue Phasen bekommt:

1. `93J.5b` baut die Reward-/Curriculum-Lane so um, dass der folgende Longrun
   nicht nur passives Sterben positiv optimiert.
2. `93J.5c` fuehrt den explizit user-owned 1000000-Step-Diagnose-Longrun aus,
   um Untertraining gegen Reward-/Curriculum-Fehlsteuerung zu trennen.

Ohne diese Zwischenphasen ist ein 1000000-Step-Lauf riskant, weil die bisherigen
Runs fast nur `survival` positiv und `loss` negativ sehen. Dann kann ein langer
Lauf einfach lernen, laenger zu sterben.

## Harte Startbefunde

| Befund | Wert | Quelle |
| --- | --- | --- |
| R2-Ergebnis | `same-red` | `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` |
| R2-Eval | `72.833333` avgSteps | `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` |
| DQN-Steps-Anker | `117.525` | `data/training/ppo/bt93i/matrix_green_report.json` |
| Terminal-Matrix R2 | `player-dead-only`, `6/6` | `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` |
| Reward R2 | `survival=61.2`, `loss=-9.0`, sonst `0` | `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` |
| PPO-Lernmetriken | kein Collapse-Signal | `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` |
| Action-Safety | invalid/clamp/sanitizer/veto rotfrei | `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` |

Groesster bisheriger Trainingslauf:

- Run: `20260425T151155Z-terminal-curriculum-repair`
- Requested Timesteps: `2048`
- Kumulative Model-Steps danach: `3968`
- Wallclock: `69.501582s`
- Optimizer Updates: `30 -> 62`

Groesster kumulativer Modellstand:

- Run: `20260426T084300Z-bt93j-r2-micro-train-counterprobe`
- Kumulative Model-Steps: `4992`
- Requested Timesteps im Run: `1024`
- Optimizer Updates: `62 -> 78`

Damit gab es bisher keinen echten Longrun. Ein 1000000-Step-Lauf ist rund Faktor
`200x` groesser als der aktuelle kumulative Modellstand. Bei den beobachteten
`~57` Steps/Sekunde ist grob mit `5-7h` Laufzeit plus Eval-/IO-Overhead zu
rechnen.

## Bewertung: Ergibt der Folgeplan danach noch Sinn?

Ja, aber nur mit klarer Rollenverteilung:

- `93J.5b` ist Pflicht vor dem Longrun, weil der Reward aktuell survival-lastig
  ist und `player-dead-only` netto positiv bleiben kann.
- `93J.5c` ist ein Diagnose-Longrun, kein Pilot, kein Candidate und kein
  BT94A-Startsignal.
- `93J.6` bleibt sinnvoll als Post-Longrun-Pilot/Holdout-Schutz, aber nur wenn
  `93J.5c` `green-for-93J.6` liefert.
- `93J.7` bleibt sinnvoll als Gate-Refresh/Handover, aber nicht mehr als
  zweiter Longrun-Block.
- BT94A bleibt geschlossen, solange `no_start_gate.json` nicht wirklich gruen
  wird und F.05/F.19/F.27/F.31 geschlossen oder nicht mehr blockierend belegt
  sind.

Wenn `93J.5c` trotz 1000000 Steps weiter `player-dead-only` und Steps unter
DQN-Anker liefert, ist Untertraining allein nicht mehr die beste Erklaerung.
Dann liegt der Fokus wieder auf Reward/Curriculum, Environment-Zielsignal,
Terminal-Diversitaet oder Aufgaben-/Map-Design.

## Phase 93J.5b: Reward-/Curriculum-Proof-Lane

Ziel:

- Den Longrun so vorbereiten, dass er eine echte Hypothese testet:
  "Der PPO ist primaer untertrainiert" gegen "Reward/Curriculum optimiert das
  falsche Verhalten".

Umsetzungsvorgaben:

- Neue Config `python/configs/ppo_bt93j_user_owned_1m_proof_longrun.json`.
- Run-kind-gebundene Reward-/Curriculum-Lane, keine Default-/Runtime-Aenderung.
- Staerkere Death-/Loss-Pressure fuer `player-dead`.
- Survival-Cap oder Survival-Taper, damit reine Lebensdauer nicht beliebig
  positive Sterbeepisoden erzeugt.
- Positive Signale fuer Natural-Terminal, Progress, belegte Risikoreduktion
  oder gleichwertige Zielnaehe getrennt ausweisen.
- Reward-Smoke: `player-dead-only` darf ohne Progress/Natural-Terminal nicht
  netto-gruen werden.
- Bericht `data/training/ppo/bt93j/reward_curriculum_proof_lane_report.json`.
- Bericht `data/training/ppo/bt93j/user_owned_1m_longrun_readiness_report.json`.

Erlaubte Dateien:

- `python/configs/ppo_bt93j*.json`
- `python/scripts/bt93j_*.py`
- `python/train.py` nur fuer Config-/Report-Verkabelung
- `python/eval.py` nur fuer Eval-/Report-Erweiterungen
- `scripts/training-headless-lane-runner.mjs` nur fuer run-kind-gebundene
  Reward-Optionen
- `src/state/training/RewardCalculator.js` nur trainingsnah und ohne produktive
  Runtime-Umschaltung
- `data/training/ppo/bt93j/**`

Verboten:

- Produktive Runtime-, Matchstart-, AI-Hub-, Strategy-, Registry-, Rollback-,
  Rollout-, Authority- oder Bridge-Aenderung.

## Phase 93J.5c: User-owned 1000000-Step Proof-Longrun

Ziel:

- Den PPO bewusst deutlich laenger lernen lassen, um die Untertraining-Hypothese
  ernsthaft zu pruefen.

Vorgaben:

- `totalTimesteps=1000000`
- `run-kind=bt93j-user-owned-1m-proof-longrun`
- Checkpoint mindestens alle `50000` Timesteps
- Eval-Snapshot mindestens alle `50000` Timesteps
- Kein Holdout waehrend Training oder Zwischen-Eval
- Kein Candidate, Freeze, Promote, Rollout oder BT94A-Refresh waehrend des Laufs

Technische Stop-Regeln:

- NaN/Inf oder nicht ladbares Modell
- Runtime-Fehler oder Artefaktkorruption
- fehlender Checkpoint
- Observation-Drift
- Action-Safety-Regression
- nicht reproduzierbare Config-/Hash-Kette

Nicht-technische rote Metriken stoppen den Lauf nicht. Wenn Steps rot bleiben
oder `player-dead-only` weiter besteht, wird das bewusst als Ergebnis
dokumentiert.

Endbericht:

- `data/training/ppo/bt93j/user_owned_1m_longrun_report.json`

Result-Klassen:

- `green-for-93J.6`
- `undertraining-supported`
- `reward-still-blocking`
- `new-instability`
- `measurement-invalid`

## Entscheidung nach 93J.5c

| Ergebnis | Konsequenz |
| --- | --- |
| `green-for-93J.6` | `93J.6` Pilot/Holdout-Schutz darf starten. |
| `undertraining-supported` | Weitere Trainings-/Curriculum-Entscheidung moeglich, aber noch kein BT94A. |
| `reward-still-blocking` | Kein weiterer Blindlauf; neue Reward-/Curriculum- oder Environment-Hypothese. |
| `new-instability` | Stop, Fehlerbericht, keine Gate-Oeffnung. |
| `measurement-invalid` | Mess-/Artefakt-/Runner-Fix vor jeder Interpretation. |

## Intake-Entscheidung

Empfehlung: aufnehmen und ausfuehren.

Begruendung:

- Die aktuelle Datenlage beweist nicht, dass PPO prinzipiell ungeeignet ist.
- Die aktuelle Datenlage beweist aber auch nicht, dass "mehr Timesteps" allein
  reicht.
- `93J.5b` macht den 1000000-Step-Lauf aussagefaehig.
- `93J.5c` ist der noetige harte Gegenbeweis gegen die Untertraining-Hypothese.
- Der bestehende Folgeplan bleibt sinnvoll, solange `93J.6` und BT94A nicht durch
  den Longrun allein geoeffnet werden.
