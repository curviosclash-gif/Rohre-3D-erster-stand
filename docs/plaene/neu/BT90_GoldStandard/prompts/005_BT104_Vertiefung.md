# Prompt 005: BT104-Vertiefung (Externe A/B-Validation und Promotions-Evidence)

## ROLLE

Du vertiefst BT104 im BT90-PPO-Zweitpfad.
Der Block soll saubere externe Evidence liefern, aber keine produktive Umschaltung vorwegnehmen.

## VORSTART / GATE

Bevor du block-spezifisch arbeitest, lies zwingend:

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/prompts/000_BT90_Followup_Loop.md`

Wenn im Tracker ein hoeher priorisierter offener oder blockierter Punkt existiert, dessen Abhaengigkeiten bereits erfuellt sind, bearbeite nicht direkt BT104 weiter.
Arbeite stattdessen den naechsten faelligen Tracker-Punkt ab, aktualisiere Status, `Wie erledigt`, Evidence und Verweise und gib danach wieder einen `NEXT_PROMPT` im selben Standard aus.

## KONTEXT (LIES IN DIESER REIHENFOLGE)

### Pflicht-Lektuere

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
3. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md`
4. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md`
5. `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
6. `docs/bot-training/Bot_Trainingsplan.md`
7. `docs/referenz/ai_architecture_context.md`

### Optional bei Bedarf

- vorhandene `python/eval.py`
- vorhandene Reports unter `data/training/ppo/reports/**`
- BT80C-Status im aktiven Bot-Trainingsplan

## WAS DU TUN SOLLST

### Phase 1: Analyse

- pruefe, ob BT104 sauber zwischen externer Evidence und spaeterem Integrationsentscheid trennt
- suche nach Stellen, an denen `bot:validate` faelschlich als alleiniger Gatekeeper auftaucht
- pruefe, ob die Vergleichsmatrix, das Urteil und die Grenzen des PPO-vs-DQN-Vergleichs ehrlich beschrieben sind
- pruefe, ob BT104 nur mit echtem Freeze-Paket aus BT103 startet

### Phase 2: BT104 ausarbeiten oder schaerfen

- definiere eine feste Vergleichsmatrix fuer PPO-Kandidat und DQN-Champion
- halte `promote|hold|rollback|diagnose` als Output fest
- verwende `bot:validate` nur als Zusatzsignal
- dokumentiere methodische Vergleichsluecken offen

## LEITPLANKEN

- Kein produktiver Rollout in BT104.
- Kein stillschweigender Champion-Wechsel.
- Wenn `BT80C 80.9.3` offen ist, bleibt das ein dokumentierter Restblocker fuer BT105.

## PFLICHT-AUSGABE

### A. Aenderungsliste

Welche BT104-Abschnitte wurden geschaerft, ersetzt oder entfernt?

### B. Offene Risiken und Loesungsansaetze

Welche methodischen oder Validierungsrisiken bleiben offen?

### C. Naechste sinnvolle Schritte

Was ist der direkte Handover fuer BT105 bei `promote`, und wo stoppt die Kette bei `hold`, `rollback` oder `diagnose`?

### D. Folge-Prompt

Erzeuge am Ende einen neuen Folge-Prompt fuer BT105 im selben Stil.
