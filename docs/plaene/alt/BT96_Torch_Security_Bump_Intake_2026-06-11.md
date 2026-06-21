---
title: Torch-Security-Bump der PPO-Dependency-Lane
status: draft
planned_block_id: BT96
priority: P2
owner: frei
intake_rule: not-yet-in-master
decision_class: D3
target_master: docs/bot-training/Bot_Trainingsplan.md
depends_on: []
soft_depends_on: []
blocked_by: []
affected_area: bot-training-ppo-dependencies
scope_files:
  - docs/plaene/neu/BT96_Torch_Security_Bump_Intake_2026-06-11.md
  - python/requirements-ppo.txt
  - docs/bot-training/Bot_Trainingsplan.md
verification:
  - pip install -r python/requirements-ppo.txt (frisches venv) + pip check
  - python -m pytest python/tests
  - kleinster PPO-Smoke-Lauf (python/train.py Kurzlauf gemaess BT93-Harness)
updated_at: 2026-06-11
---

# Torch-Security-Bump der PPO-Dependency-Lane (Vorschlag BT96)

Status: Draft, noch nicht in `docs/bot-training/Bot_Trainingsplan.md` aufnehmen.

## Intake-Zusammenfassung

Die einzigen nach der V90/P21-Wiedervorlage 2026-06-11 noch offenen Dependabot-Alerts sind
12 `torch`-Findings (2x6, je 2 medium + 4 low) auf `python/requirements.txt` und
`python/requirements-ppo.txt`. Sie liegen ausserhalb des npm-/P21-Scopes und sind bisher von
keinem Plan abgedeckt. Befundlage (GHSA / verwundbarer Bereich):

- GHSA-vgrw-7cvw-pwgx | medium | Memory-Corruption `unpack_sequence` | `< 2.9.1`
- GHSA-f4hp-rmr7-r7v8 | medium | Memory-Consumption `pad_packed_sequence` | `<= 2.6.0`
- GHSA-rrmf-rvhw-rf47 | low | Memory-Corruption `torch.jit.script` | `<= 2.12.0`
- GHSA-qfhq-4f3w-5fph | low | Memory-Corruption `torch.lstm_cell` | `< 2.10.0`
- GHSA-x3gm-94wq-g975 | low | improper initialization scale/zero_point | `<= 2.6.0`
- GHSA-c678-jfcj-6jmf | low | Tuple-Handler Memory-Corruption | `<= 2.6.0`

Ist-Stand: `python/requirements-ppo.txt` pinnt `torch==2.3.1` (BT93C-Lane, gekoppelt an
`stable-baselines3==2.3.2`, `gymnasium==0.29.1`, `numpy==1.26.4`). Volle Bereinigung braucht
`torch >= 2.12.1` (wegen GHSA-rrmf-rvhw-rf47); das ist ein grosser Sprung und zieht
voraussichtlich einen `stable-baselines3`-Bump nach.

Stale-Anteil: `python/requirements.txt` enthaelt aktuell gar kein `torch` mehr (nur
`pytest`, `websockets`); die 6 Alerts darauf referenzieren einen alten Manifeststand und
sollten beim naechsten Dependabot-Rescan zufallen.

Exploit-Kontext: torch laeuft nur in der lokalen Bot-Trainings-Toolchain und verarbeitet
eigene Trainingsdaten; kein Spieler-/Runtime-Pfad. Deshalb P2 und kein P1-Stopper.

## Ziel

- `python/requirements-ppo.txt` auf eine torch-Version ohne offene GHSAs heben (Zielbild
  `>= 2.12.1`) oder eine begruendete Zwischenstufe mit dokumentierter Rest-Ausnahme waehlen.
- PPO-Lane bleibt funktionsfaehig (Install, Tests, kleinster Trainings-Smoke).
- Stale Alerts auf `python/requirements.txt` geklaert (Rescan oder begruendetes Dismiss, User-owned).

## Nicht-Ziel

- Keine Trainings-/Reward-/Curriculum-Aenderungen (BT93/BT95-Scope).
- Keine npm-Manifeste (V146-Intake) und keine neuen Python-Abhaengigkeiten ueber den
  Security-Bump hinaus.

## Phasen

### 96.1 Kompatibilitaetsmatrix
- [ ] 96.1.1 Zielversionen klaeren: kleinste torch-Version, die alle 6 GHSAs schliesst, gegen
      `stable-baselines3`-Kompatibilitaet (2.3.2 vs. aktuelle SB3-Releases), `gymnasium`-,
      `numpy`- und Python-Version-Annahmen der BT93-Harness.
- [ ] 96.1.2 Entscheidung dokumentieren: voller Sprung (`torch >= 2.12.1` + SB3-Bump) vs.
      Zwischenstufe (`2.9.1`/`2.10`) mit dokumentierter Rest-Ausnahme und Wiedervorlage.

### 96.2 Bump und Verifikation
- [ ] 96.2.1 `python/requirements-ppo.txt` gemaess 96.1.2 heben (eigener Commit; Rollback =
      Datei-Revert plus venv-Neuaufbau).
- [ ] 96.2.2 Gates: frisches venv-Install + `pip check`, `python -m pytest python/tests`,
      kleinster PPO-Smoke-Lauf (Kurzlauf-Config der BT93-Harness); bei Rot Blocker
      dokumentieren und reverten statt patchen.

### 96.3 Alert-Abgleich
- [ ] 96.3.1 Nach Push pruefen, ob die 6 Alerts auf `python/requirements-ppo.txt` zufallen
      (`gh api .../dependabot/alerts`).
- [ ] 96.3.2 Stale Alerts auf `python/requirements.txt` pruefen; falls sie nicht automatisch
      zufallen, Dismiss mit Begruendung "Manifest enthaelt kein torch" (User-owned).

### 96.99 Abschluss-Gate
- [ ] 96.99.1 Dependabot meldet 0 offene python-Alerts oder die Reste sind mit GHSA,
      Begruendung und Wiedervorlage dokumentiert.
- [ ] 96.99.2 Notiz im Bot-Trainingsplan (Dependency-Lane-Stand) und Querverweis im
      V90-Umfeld, damit die Security-Historie konsistent bleibt.

## Risiken

- R1 | mittel | torch 2.3 -> 2.12 ueberspringt viele Releases; SB3-/gymnasium-Kopplung kann Trainings-APIs brechen. Gegenmittel: Matrix in 96.1, Smoke-Gate in 96.2.
- R2 | niedrig | Groessere torch-Wheels verlaengern Install-/CI-Zeiten der Trainings-Lane.
- R3 | niedrig | Zwischenstufe statt Vollsprung laesst low-GHSAs offen; dann Pflicht zur dokumentierten Ausnahme mit Wiedervorlage.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/bot-training/Bot_Trainingsplan.md`
- Vorgeschlagene Block-ID: `BT96`
- Hard/soft dependencies: keine (BT93C-Lane ist abgeschlossen; kein laufender Trainingsblock betroffen)
- Manuelle Uebernahme erforderlich
