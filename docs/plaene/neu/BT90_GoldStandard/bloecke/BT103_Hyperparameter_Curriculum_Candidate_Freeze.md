---
id: BT103
title: Hyperparameter-Tuning, Curriculum-Hardening und Candidate Freeze
status: planned
priority: P2
owner: frei
depends_on:
  - BT102.99
blocked_by: []
affected_area: bot-training-ppo-ablation
scope_files:
  - python/configs/ablations/**
  - python/scripts/run_ablation.py
  - python/scripts/freeze_candidate.py
  - python/eval.py
  - python/reports/**
  - data/training/ppo/ablations/**
  - data/training/ppo/candidates/**
verification:
  - python python/scripts/run_ablation.py --smoke-plan python/configs/ablations
  - python python/scripts/freeze_candidate.py --dry-run
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
  - npm run build
updated_at: 2026-04-22
---

# BT103 Hyperparameter-Tuning, Curriculum-Hardening und Candidate Freeze

## Ziel

BT103 hat drei Aufgaben:

1. Eine kleine, priorisierte Ablationsmatrix fahren.
2. Curriculum-, Reward- und Telemetry-Paritaet gegen den bestehenden JS-authoritative Pfad haerten.
3. Einen gefrorenen PPO-Kandidaten fuer BT104 bereitstellen.

## Nicht-Ziel

- ONNX-Export
- produktive PPO-Inference
- neue Bot-Policy-Typen
- Runtime-Umschaltung oder Feature-Flags fuer das Spiel
- offene Forschungsdrift ohne klaren Freeze-Entscheid

## Referenzen

- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
- `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`
- `docs/referenz/ai_architecture_context.md`
- `src/state/training/RewardCalculator.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
- `src/entities/ai/training/TrainerPayloadAdapter.js`

## Ablationsstrategie

### Kleine, harte Matrix

BT103 arbeitet mit einer kleinen Matrix von 5 bis 7 gezielten Laeufen.
Legitime Hebel sind zum Beispiel:

- `learning_rate`
- `n_steps`
- `batch_size`
- `gae_lambda`
- `ent_coef`
- Env-Anzahl oder Eval-Frequenz, falls der Headless-Pfad das verlangt

Nicht legitim:

- parallele Umbauten am Runtime-Vertrag
- neue Reward-Semantik im Python-Stack
- unendliche Forschungsserien ohne Champion-/Challenger-Regel

### Champion-/Challenger-Regel

- BT102-Referenz ist der Baseline-Champion innerhalb des PPO-Pfads.
- Jeder BT103-Lauf ist Challenger gegen BT102.
- Nur ein klar dokumentierter Sieger wird eingefroren.
- Wenn kein Sieger sichtbar ist, endet BT103 ehrlicherweise mit `hold`.

## Curriculum-, Reward- und Telemetry-Paritaet

### Fachliche Regel

Curriculum, Reward, Safety und Intent bleiben fachlich im bestehenden JS-Pfad verankert.
BT103 darf diese Signale:

- mitloggen
- im Report aufschluesseln
- auf Konsistenz pruefen

BT103 darf sie nicht neu definieren.

### Praktische Konsequenz

Jeder Kandidatenlauf muss dokumentieren:

- Observation-Schema-Version
- Domain-/Mode-Matrix
- relevante `rewardBreakdown`-Felder
- `hybridDecision`-/Veto-Hinweise, soweit transportiert
- bekannte Unterschiede gegen produktive DQN-Evidence

## Candidate Freeze

Ein gefrorener Kandidat ist mehr als ein Checkpoint.
Pflichtpaket:

- Modell-/Checkpoint-Datei
- Normalize-Stats, falls genutzt
- Run-Manifest
- Eval-Report
- Ablationskontext: gegen welche Laeufe der Kandidat gewonnen oder verloren hat

Der gefrorene Kandidat ist die einzige Eingabe fuer BT104.
Wenn BT103 mit `hold` endet und kein Freeze-Paket vorliegt, startet BT104 **nicht**.

## Definition of Done

- [ ] DoD.1 Mindestens 5 und hoechstens 7 klar begruendete Ablationslaeufe sind dokumentiert.
- [ ] DoD.2 Curriculum-/Reward-/Telemetry-Paritaet bleibt gegen den JS-authoritative Pfad nachvollziehbar.
- [ ] DoD.3 Ein gefrorener PPO-Kandidat ist als Artefaktpaket mit Manifest, Checkpoint, Normalize-Stats und Eval-Reports abgelegt.
- [ ] DoD.4 Der Kandidat ist gegen BT102-Baseline und eine feste interne KPI-Matrix eingeordnet; der externe DQN-Vergleich bleibt BT104 vorbehalten.
- [ ] DoD.5 Keine ONNX-, Runtime- oder Produktivintegration wurde in diesen Block gezogen.
- [ ] DoD.6 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Risiken

| ID | Risiko | Wahrscheinlichkeit | Impact | Mitigation | Trigger | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R103.1 | Ablationen verbessern nur Proxy-Metriken statt echtes Ueberleben | MED | HIGH | Survival-/DQN-Referenz immer mitfuehren | Reward steigt, Survival stagniert | RL |
| R103.2 | Curriculum-Paritaet ist nur scheinbar gegeben | MED | HIGH | relevante Transportfelder hart im Manifest sichern | gleiche Config, aber andere Signalverteilung | Integration |
| R103.3 | Der Block driftet in Runtime- oder Integrationsideen zurueck | MED | HIGH | Nicht-Ziele explizit im Block fixieren | Diskussion dreht sich wieder um produktive Inference | Governance |
| R103.4 | Viele Ablationen, aber kein klarer Kandidat | MED | MED | kleine Matrix, feste Abbruchkriterien | lauter halbplausible Ergebnisse ohne Freeze | Governance |

## Phasen

### 103.1 Ablationsmatrix und Entscheidungsregeln
status: open
goal: Kleine, harte Matrix mit klaren Abbruch- und Siegerregeln festziehen
output: priorisierte 5-7-Lauf-Matrix mit Champion-/Challenger-Logik

- 5 bis 7 gezielte Laeufe definieren
- Abbruchkriterien und Entscheidungslogik dokumentieren
- Champion-/Challenger-Regel festziehen

### 103.2 Curriculum-/Reward-/Telemetry-Paritaet
status: open
goal: Fachliche Signale gegen den JS-Pfad absichern
output: dokumentierte Paritaet oder ehrliche Restluecken

- relevante Felder im Eval-/Manifestpfad pruefen
- bekannte Luecken offen dokumentieren
- JS-authoritative Ownership in allen Reports konsistent halten

### 103.3 Kandidatenlaeufe und Freeze
status: open
goal: Siegerlauf gegen BT102 und feste interne KPI-Matrix sauber einfrieren
output: Freeze-Paket unter `data/training/ppo/candidates/`

- priorisierte Laeufe ausfuehren
- Sieger gegen BT102 und feste interne KPI-Matrix einordnen
- Freeze-Paket unter `data/training/ppo/candidates/` schreiben

### 103.4 Reproduzierbarkeit und BT104-Handover
status: open
goal: Gefrorenen Kandidaten fuer BT104 uebergabefaehig machen
output: Abschlussreport und Vergleichsmatrix fuer BT104

- gefrorenen Kandidaten dokumentieren oder `hold` explizit als Kettenstopp ausweisen
- Vergleichsmatrix fuer BT104 nur vorbereiten, wenn ein Freeze-Paket vorliegt
- Abschlussreport schreiben

### 103.99 Abschluss-Gate
status: open
goal: BT103 nur mit klarem Kandidaten oder ehrlichem `hold` schliessen
output: sauber referenzierbarer PPO-Kandidat fuer BT104 oder dokumentierter `hold`-Stopp

- [ ] 103.99.1 Alle Phasen 103.1 bis 103.4 sind mit Evidence dokumentiert.
- [ ] 103.99.2 Eine kleine, klare Ablationsmatrix ist sauber abgeschlossen.
- [ ] 103.99.3 Ein gefrorener PPO-Kandidat mit Manifest, Report und Checkpoint liegt vor oder BT103 endet explizit mit `hold`.
- [ ] 103.99.4 BT104 wird nur geoeffnet, wenn ein Freeze-Paket vorliegt; bei `hold` endet die Kette bewusst hier.
- [ ] 103.99.5 Runtime- oder Produktivintegration wurde nicht in diesen Block gezogen.
- [ ] 103.99.6 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Checkpoint-Log

| Datum | Typ | Evidence | Ergebnis |
| --- | --- | --- | --- |
| - | - | - | - |
