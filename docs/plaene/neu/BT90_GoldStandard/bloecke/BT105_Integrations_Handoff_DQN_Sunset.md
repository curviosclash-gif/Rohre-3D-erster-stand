---
id: BT105
title: Integrations-Handoff und DQN-Sunset-Vorbereitung
status: planned
priority: P3
owner: frei
depends_on:
  - BT104.promote_evidence
blocked_by:
  - BT104 endet mit hold
  - BT104 endet mit reject
affected_area: bot-training-ppo-handoff
scope_files:
  - docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md
  - docs/plaene/neu/BT90_GoldStandard/README.md
  - docs/plaene/neu/BT90_GoldStandard/offene_risiken.md
  - docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md
  - docs/plaene/neu/*.md
verification:
  - rg -n "ObservationBridgePolicy|RuntimeConfig|BotPolicyRegistry|BotPolicyTypes|LocalDqnInference" src
  - rg -n "BT80C 80\\.9\\.3|promote|hold|reject" docs/bot-training/Bot_Trainingsplan.md docs/plaene/neu/BT90_GoldStandard
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
  - npm run build
updated_at: 2026-04-22
---

# BT105 Integrations-Handoff und DQN-Sunset-Vorbereitung

## Ziel

BT105 ueberfuehrt BT90 noch nicht in produktiven Code.
Der Block bereitet stattdessen einen spaeteren aktiven Integrationsblock vor, der nach gruener PPO-Evidence und User-Entscheid umgesetzt werden koennte.

BT105 beantwortet:

- Welche produktiven Touchpoints waeren spaeter betroffen?
- Welche Rollout-Reihenfolge waere sinnvoll?
- Wie saehe ein sicherer Rollback aus?
- Unter welchen Bedingungen darf DQN spaeter abgeschaltet werden?

## Charakter des Blocks

BT105 ist bewusst **kein** sofortiger Umsetzungsblock.
Er ist ein verdict-sensitiver Handoff-Draft fuer einen spaeteren aktiven Integrationsblock.

Das bedeutet:

- BT105 wird nur als echter Integrationskandidat relevant, wenn BT104 mit `promote` endet.
- Bei `hold` oder `reject` bleibt BT105 hoechstens Referenzmaterial fuer einen spaeteren Neuansatz.
- Offene produktive Validation-Risiken duerfen in BT105 dokumentiert werden; sie erlauben aber keinen aktiven Rollout-Intake.

## Nicht-Ziel

- produktive PPO-Inference im Spiel
- Runtime-Umschaltung
- neue Policy-Registrierung
- Self-Play-Implementierung

Self-Play, Opponent-Pools und weitere PPO-Haertung wandern in einen spaeteren Folgebacklog.

## Referenzen

- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
- `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md`
- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/referenz/ai_architecture_context.md`

## Touchpoint-Matrix fuer den spaeteren Integrationsblock

BT105 soll eine ehrliche Matrix der spaeteren potentiellen Eingriffspunkte liefern.
Erwartete Kandidaten fuer einen spaeteren Integrationsblock sind typischerweise:

- `src/entities/ai/ObservationBridgePolicy.js`
- `src/core/RuntimeConfig.js`
- `src/entities/ai/BotPolicyRegistry.js`
- `src/entities/ai/BotPolicyTypes.js`
- `src/entities/ai/inference/**`
- `src/state/validation/**`
- trainingsnahe Runner-/Eval-Skripte

Wichtig:

- BT105 dokumentiert diese Touchpoints.
- BT105 aendert sie nicht.

## Rollout- und Rollback-Leiter

Ein spaeterer aktiver Integrationsblock braucht mindestens:

1. klaren Challenger-Modus neben DQN
2. feste Vergleichslane gegen den eingefrorenen DQN-Champion
3. Rollback-Regel bei KPI-Einbruch oder instabiler Validation
4. Sunset-Regel fuer DQN erst nach stabiler Produktions-Evidence

## Sunset-Regeln fuer DQN

Eine vollstaendige DQN-Ablosung ist erst zulaessig, wenn alle folgenden Bedingungen erfuellt sind:

- BT104 liefert belastbare PPO-Evidence mit Urteil `promote`
- `BT80C 80.9.3` oder ein gleichwertiger stabiler produktiver Validation-Pfad ist gruen
- ein separater aktiver Integrationsblock wurde erstellt und abgearbeitet
- der User trifft die explizite Rollout-Entscheidung

Ohne diese Bedingungen bleibt DQN der produktive Champion.

## Folgebacklog ausserhalb des Kernpfads

Als moegliche Folgearbeit dokumentieren, aber nicht in BT105 vermischen:

- Self-Play
- Frozen Opponent Pools
- spaetere Curriculum-Erweiterungen
- weitere PPO-Haertung nach produktiver Integration

## Definition of Done

- [ ] DoD.1 Ein spaeterer Integrationsblock fuer PPO-Runtime-Rollout und DQN-Sunset ist sauber zugeschnitten.
- [ ] DoD.2 Touchpoints, Rollback-Pfade und Sunset-Reihenfolge sind dokumentiert.
- [ ] DoD.3 Es ist explizit dokumentiert, welche heutigen BT90-No-Touch-Dateien spaeter angefasst werden duerfen und unter welchen Voraussetzungen.
- [ ] DoD.4 Self-Play und weitere Forschung sind sauber aus dem Kernpfad ausgegliedert.
- [ ] DoD.5 BT105 dokumentiert keine still vorweggenommene Produktivintegration und bleibt ohne `BT104=promote` ein No-go-/Restblocker-Handoff.

## Risiken

| ID | Risiko | Wahrscheinlichkeit | Impact | Mitigation | Trigger | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R105.1 | Der spaetere Integrationsblock braucht mehr Runtime-Eingriffe als heute angenommen | MED | HIGH | Touchpoint-Matrix breit und ehrlich halten | neue Abhaengigkeiten tauchen im Handoff auf | Integration |
| R105.2 | PPO-Evidence wird als automatische DQN-Ablosung gelesen | MED | HIGH | User-Entscheid und separaten aktiven Integrationsblock verpflichtend machen | `PPO besser` wird mit `DQN abschalten` verwechselt | Governance |
| R105.3 | Self-Play oder Folgeforschung schieben den Kernpfad wieder auf | LOW | MED | Folgebacklog strikt vom Integrations-Handoff trennen | neue BT90-Arbeit driftet in Forschungsnebenpfade | Governance |
| R105.4 | `BT80C 80.9.3` bleibt offen und verhindert ehrliche Produktionsfreigabe | HIGH | HIGH | Restblocker explizit im Handoff fuehren | PPO-Evidence ist gruen, produktive Validation aber weiter rot | Integration |

## Phasen

### 105.1 Spaeteren Integrationsscope zuschneiden
status: open
goal: Produktive Touchpoints und No-Touch-Ausnahmen fuer spaetere Arbeit sauber eingrenzen
output: dokumentierte Touchpoint-Matrix fuer einen spaeteren aktiven Integrationsblock

- moegliche Touchpoints sammeln
- No-touch-Ausnahmen fuer spaeteren Rollout benennen
- Scope gegen BT90 klar abgrenzen

### 105.2 Rollout-, Rollback- und Sunset-Regeln
status: open
goal: Spaetere Produktivintegration nur mit klarer Leiter erlauben
output: dokumentierte Rollout-/Rollback-/Sunset-Regeln

- Rollout-Reihenfolge skizzieren
- Rollback-Kriterien definieren
- DQN-Sunset nur unter expliziten Voraussetzungen erlauben

### 105.3 Folgebacklog separieren
status: open
goal: Forschungs- und Folgearbeit aus dem Kernpfad herausziehen
output: klarer Folgebacklog statt versteckter Scope-Verlaengerung

- Self-Play und weitere Folgearbeit aus dem Kernpfad ausgliedern
- klare Backlog-Liste statt versteckter Scope-Verlaengerung schreiben

### 105.4 Intake-Handoff vorbereiten
status: open
goal: Uebernahmevoraussetzungen fuer den aktiven Bot-Trainingsplan dokumentieren
output: Intake-Handoff mit Restblockern und Entscheidungsbedarf

- BT90-Ergebnisse fuer moegliche Uebernahme in `docs/bot-training/Bot_Trainingsplan.md` vorbereiten
- Abhaengigkeiten, Restblocker und User-Entscheid dokumentieren
- bei `hold` oder `reject` explizit dokumentieren, warum **kein** aktiver Integrations-Intake geoeffnet wird

### 105.99 Abschluss-Gate
status: open
goal: BT105 nur als ehrlichen Handoff-Block schliessen
output: vorbereiteter, aber nicht vorweggenommener Integrationspfad

- [ ] 105.99.1 Alle Phasen 105.1 bis 105.4 sind mit Evidence dokumentiert.
- [ ] 105.99.2 Ein spaeterer produktiver Integrationsblock ist nur fuer den Fall `BT104=promote` klar zugeschnitten, aber nicht still vorweggenommen.
- [ ] 105.99.3 DQN-Sunset ist an klare Voraussetzungen und User-Entscheid gebunden.
- [ ] 105.99.4 Self-Play ist aus dem Kernpfad entfernt und nur noch als Folgebacklog dokumentiert.

## Checkpoint-Log

| Datum | Typ | Evidence | Ergebnis |
| --- | --- | --- | --- |
| - | - | - | - |
