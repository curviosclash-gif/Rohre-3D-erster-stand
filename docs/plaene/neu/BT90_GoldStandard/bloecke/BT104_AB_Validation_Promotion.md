---
id: BT104
title: Externe A/B-Validation und Promotions-Evidence
status: planned
priority: P2
owner: frei
depends_on:
  - BT103.freeze_candidate
blocked_by:
  - BT103 endet mit hold
  - kein Freeze-Paket unter data/training/ppo/candidates/**
affected_area: bot-training-ppo-validation
scope_files:
  - python/eval.py
  - python/reports/ab_compare/**
  - data/training/ppo/reports/**
  - scripts/training-headless-compare.mjs
verification:
  - node scripts/training-headless-compare.mjs --manifest data/training/ppo/reports/ab_manifest.json
  - python python/eval.py --ab-compare data/training/ppo/reports/ab_manifest.json
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
  - npm run build
updated_at: 2026-04-22
---

# BT104 Externe A/B-Validation und Promotions-Evidence

## Ziel

BT104 entscheidet nicht ueber einen sofortigen Runtime-Rollout.
Der Block liefert ein belastbares externes Evidence-Paket, das spaeter als Grundlage fuer eine moegliche DQN-Ablosung dienen kann.

BT104 soll die Frage beantworten:

"Ist der gefrorene PPO-Kandidat auf einer festen, reproduzierbaren Matrix besser, gleichwertig oder schlechter als der eingefrorene DQN-Champion?"

## Nicht-Ziel

- produktive Runtime-Umschaltung
- stillschweigender Champion-Wechsel
- `bot:validate` als alleiniger Gatekeeper
- methodische Schaetzung auf Basis eines Gluecksruns

## Referenzen

- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
- `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md`
- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/referenz/ai_architecture_context.md`

## Abhaengigkeit: BT80C 80.9.3

`BT80C 80.9.3` ist fuer BT104 nur ein Soft-Dependency.

Das bedeutet:

- externe PPO-Evidence darf auch ohne gruene produktive Validation-Lane vorbereitet werden
- wenn `bot:validate` verfuegbar ist, wird es als Zusatzsignal genutzt
- wenn `bot:validate` weiter instabil ist, muss BT104 das offen dokumentieren und darf daraus keine stillschweigende Promotion ableiten

Stand 2026-04-22:

- Die feste produktionsnahe Validation-Lane aus `BT80C 80.9.3` bleibt offen; dokumentiert ist weiter, dass die Matrix in `PLAYING` mit `roundsRecorded=0` haengen kann.
- `bot:validate` bleibt damit fuer BT104 ausdruecklich Zusatzsignal oder Restblocker, nicht methodische Hauptbasis des Urteils.

## Startvoraussetzung

BT104 startet fachlich nur, wenn BT103 einen echten Kandidaten geliefert hat.
Das bedeutet:

- `BT103` darf nicht mit reinem `hold` enden
- unter `data/training/ppo/candidates/**` muss ein Freeze-Paket mit Manifest, Checkpoint und Eval-Report vorliegen

Wenn diese Voraussetzungen fehlen, wird BT104 nicht "trotzdem mal vorbereitet", sondern bleibt bewusst blockiert.

Phase-5-Hartgrenze:

- BT104 konsumiert genau ein Freeze-Paket aus BT103 und oeffnet weder Ablationen noch Kandidatenwahl erneut.
- Wenn Freeze-Paket, Lane-Budget oder Vergleichsmanifest unklar bleiben, ist das kein kleiner Rest, sondern `hold` oder `diagnose` vor aktivem Claim.

## Vergleichsmatrix

BT104 arbeitet mit einer festen Matrix aus:

- DQN-Champion-Referenz
- gefrorenem PPO-Kandidaten
- Seeds
- Modi
- identischen oder sauber dokumentiert angenaeherten Vergleichsregeln

Pflicht:

- dieselbe Matrix fuer beide Kandidaten
- mindestens 3 vollstaendige Vergleichspaesse auf derselben Matrix
- medianbasierte Auswertung statt Einzelrun-Entscheidung
- klares Manifest, damit spaeter nachvollziehbar bleibt, was wirklich verglichen wurde

Ein Pass ist nur gueltig, wenn:

- beide Kandidaten auf derselben Matrix ohne Artefaktmismatch laufen
- Crash-, Timeout- oder Invaliditaetsfaelle dokumentiert sind
- die Lane nicht still auf andere Seeds, Modi oder Profile ausweicht

Invalidierte Paesse werden nicht still mitgerechnet.
Sie muessen als `invalid` protokolliert und auf derselben Matrix neu gefahren oder als Restblocker ausgewiesen werden.

## Bewertungsregel

BT104 produziert eines von vier Urteilen:

- `promote`
- `hold`
- `rollback`
- `diagnose`

Interpretation:

- `promote` heisst nur: PPO ist als naechster Integrationskandidat fachlich plausibel.
- `hold` heisst: Evidence reicht nicht, ist methodisch zu unsauber oder der Vorteil ist zu klein.
- `rollback` heisst: Der Kandidat ist gegen die feste Matrix sichtbar schlechter oder regressiv; die Kette faellt bewusst auf den vorherigen Freeze-/Champion-Stand zurueck.
- `diagnose` heisst: Harness, Artefakte oder Vergleichslane sind methodisch zu instabil fuer ein ehrliches Sachurteil; zuerst Fehlerursache schliessen, nicht still werten.

`promote` ist nur zulaessig, wenn:

- mindestens 3 gueltige Vergleichspaesse vorliegen
- PPO den Median von `averageBotSurvival` gegen DQN verbessert
- `avgStepsPerEpisode` im Median nicht schlechter als eine vorab dokumentierte Non-Inferiority-Schwelle ist
- `invalidActionRate`, Failure-Klassen und Crash-Stabilitaet nicht sichtbar schlechter sind

`hold` ist zulaessig, wenn:

- weniger als 3 gueltige Vergleichspaesse vorliegen
- die Matrix methodisch nicht sauber genug ist
- oder die KPI-Lage gemischt bleibt und keine ehrliche `promote`- oder `rollback`-Aussage traegt

`rollback` ist zulaessig, wenn:

- `averageBotSurvival` im Median schlechter ist
- oder `invalidActionRate`, Failure-Klassen oder Crash-Stabilitaet sichtbar schlechter sind
- oder der Kandidat methodisch nicht reproduzierbar bleibt

`diagnose` ist zulaessig, wenn:

- die Lane durch Harness-, Artifact- oder Matrix-Defekte kein ehrliches Sachurteil traegt
- wiederholte Invalidierungen oder Drift nicht auf Kandidatenstaerke, sondern auf das Verfahren selbst zeigen
- vor einer echten Wertung zuerst ein klarer Ursachen- und Reparaturpfad noetig ist

Keines dieser Urteile schaltet produktiv um.

## Pflichtmetriken

- `averageBotSurvival`
- `avgStepsPerEpisode`
- `invalidActionRate`
- Failure-Klassen und Crash-Stabilitaet
- qualitative Hinweise auf Reward-/Safety-/Intent-Unterschiede, soweit beobachtbar

## Definition of Done

- [ ] DoD.1 PPO- und DQN-Referenzartefakte sind auf dieselbe Vergleichsmatrix eingefroren.
- [ ] DoD.2 Externe A/B-Auswertung liefert ein klares Urteil `promote|hold|rollback|diagnose`.
- [ ] DoD.3 Es liegen mindestens 3 gueltige Vergleichspaesse vor oder die Restblockade ist explizit dokumentiert.
- [ ] DoD.4 Falls `bot:validate` verfuegbar ist, ist eine Zusatz-Gegenprobe dokumentiert; falls nicht, ist der Restblocker offen und ehrlich dokumentiert.
- [ ] DoD.5 Ergebnis ist verdict-sensitiv verpackt: `promote` oeffnet BT105, `hold`, `rollback` oder `diagnose` stoppen die Kette bewusst; laufende Ablationen oder Kandidatenneuwahl werden nicht in BT104 mitgezogen.

## Risiken

| ID | Risiko | Wahrscheinlichkeit | Impact | Mitigation | Trigger | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R104.1 | DQN-vs-PPO bleibt methodisch nur teilweise apples-to-apples | HIGH | HIGH | Matrix, Manifest und Entscheidungskriterien hart einfrieren | Debatte ueber Vergleichbarkeit | Governance |
| R104.2 | `bot:validate` bleibt instabil und vernebelt das Urteil | HIGH | MED | nur Zusatzsignal, nie einziger Gatekeeper | Validation-Lane haengt oder terminiert nicht | Integration |
| R104.3 | `promote` wird als Freigabe fuer sofortigen Rollout missverstanden | MED | HIGH | BT105 als separaten Integrations-Handoff erzwingen | Stakeholder lesen Evidence als Rollout-Entscheid | Governance |
| R104.4 | PPO ist extern besser, aber Integrationsrisiken bleiben unsichtbar | MED | HIGH | BT105 muss Rollout-/Rollback-/Touchpoint-Matrix separat aufziehen | extern gruene Zahlen, aber unklare Runtime-Folgen | Integration |

## Phasen

### 104.1 Vergleichsartefakte einfrieren
status: open
goal: Kandidaten und Matrix unveraenderlich fuer die A/B-Lane festziehen
output: DQN-Champion, PPO-Kandidat und Vergleichsmanifest

- DQN-Champion und PPO-Kandidat inklusive Manifest fixieren
- Vergleichsmatrix und Urteilskriterien dokumentieren
- Primaer- und Sekundaermetriken festschreiben

### 104.2 Externe A/B-Lane ausfuehren
status: open
goal: Belastbare externe Gegenueberstellung ohne Produktivumschaltung liefern
output: mindestens 3 gueltige Vergleichspaesse auf fester Matrix

- beide Kandidaten auf derselben Matrix auswerten
- Reports und Delta-Auswertung erzeugen
- invalidierte Paesse separat dokumentieren und nicht still mitzaehlen

### 104.3 `bot:validate`-Zusatzsignal oder ehrlicher Restblocker
status: open
goal: Produktive Validation nur als Zusatzsignal einordnen
output: dokumentierte Gegenprobe oder sauber benannter Restblocker

- falls gruener Pfad verfuegbar: Zusatz-Gegenprobe dokumentieren
- falls nicht: Restblocker offen und sauber benennen, inklusive aktueller BT80C-Ursache
- keine falsche Umdeutung zu einem Alleingate erlauben

### 104.4 Promotions-Evidence-Paket und Handover
status: open
goal: Urteil, Restunsicherheit und Integrationshygiene zusammenfassen
output: Endurteil `promote|hold|rollback|diagnose` mit verdict-sensitivem Handover

- Endurteil `promote|hold|rollback|diagnose` schreiben
- Restunsicherheiten dokumentieren
- BT105-Handover nur bei `promote` als echten Integrationskandidaten vorbereiten

### 104.99 Abschluss-Gate
status: open
goal: BT104 nur mit belastbarer Matrix und ehrlichem Urteil schliessen
output: sauberes externes Evidence-Paket; `hold`/`rollback`/`diagnose` stoppen die Kette bewusst

- [ ] 104.99.1 Alle Phasen 104.1 bis 104.4 sind mit Evidence dokumentiert.
- [ ] 104.99.2 PPO und DQN sind auf einer festen Matrix ehrlich eingeordnet.
- [ ] 104.99.3 Es liegen mindestens 3 gueltige Vergleichspaesse vor oder der Restblocker ist explizit dokumentiert.
- [ ] 104.99.4 `bot:validate` ist als Zusatzsignal dokumentiert oder als offener Restblocker sauber ausgewiesen.
- [ ] 104.99.5 Das Abschlussurteil fuehrt nicht automatisch zu einer produktiven Umschaltung; nur `promote` oeffnet BT105.

## Checkpoint-Log

| Datum | Typ | Evidence | Ergebnis |
| --- | --- | --- | --- |
| - | - | - | - |
