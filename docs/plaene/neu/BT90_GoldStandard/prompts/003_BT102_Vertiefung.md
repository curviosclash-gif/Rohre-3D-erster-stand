# Prompt 003: BT102-Vertiefung (PPO-Baseline-Training)

## ROLLE

Du vertiefst BT102 im BT90-PPO-Zweitpfad.
BT90 ist ein Intake-Draft; produktive Runtime- oder DQN-Ablosungsarbeit gehoert noch nicht in diesen Block.

## KONTEXT (LIES IN DIESER REIHENFOLGE)

### Pflicht-Lektuere

1. `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
2. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md`
3. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`
4. `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
5. `docs/bot-training/Bot_Trainingsplan.md`
6. `docs/referenz/ai_architecture_context.md`

### Kontext-Lektuere bei Bedarf

- bestehende `python/train.py`, `python/eval.py`, `python/configs/**`
- vorhandene Artefaktordner unter `data/training/ppo/`
- `src/state/training/RewardCalculator.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`

## WAS DU TUN SOLLST

### Phase 1: Analyse

- pruefe, ob BT102 sauber zwischen Baseline-Training und spaeterer Promotion trennt
- suche nach Aussagen, die bereits produktive PPO-Inference, Runtime-Flags oder DQN-Ablosung implizieren
- pruefe, ob die geplanten KPIs auf den externen headless Pfad passen und ehrlich als Vorvergleich markiert sind

### Phase 2: BT102 ausarbeiten oder schaerfen

- halte BT102 konservativ und reproduzierbar
- beschreibe Checkpoint-, Resume-, Eval- und Manifest-Pfad
- dokumentiere DQN nur als eingefrorene Referenz
- ziehe keine ONNX-, Feature-Flag- oder Runtime-Umschaltarbeit in diesen Block
- halte alle produktiven Runtime-/AI-Hub-Dateien read-only

## LEITPLANKEN

- BT102 ist ein Baseline-Block, kein Promotionsblock.
- BT102 muss auf den gemessenen BT100-/BT101-Daten planen, nicht auf Wunschannahmen.
- Ein kleinerer, stabiler Referenzlauf ist besser als ein unrealistischer 4-Env-Plan.
- Jeder DQN-Vergleich muss explizit als externer Vorvergleich gelabelt sein.

## PFLICHT-AUSGABE

### A. Aenderungsliste

Welche BT102-Abschnitte wurden geschaerft, ersetzt oder entfernt?

### B. Offene Risiken und Loesungsansaetze

Welche Throughput-, Resume- oder Vergleichsrisiken bleiben offen?

### C. Naechste sinnvolle Schritte

Was ist der direkte Handover fuer BT103?

### D. Folge-Prompt

Erzeuge am Ende einen aktualisierten Folge-Prompt fuer BT103 oder verweise auf `004_BT103_Vertiefung.md`, falls dieser bereits konsistent ist.
