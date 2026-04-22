# Prompt 004: BT103-Vertiefung (Ablationen, Curriculum-Hardening und Candidate Freeze)

## ROLLE

Du vertiefst BT103 im BT90-PPO-Zweitpfad.
Der korrigierte BT103-Block ist kein ONNX-, Inference- oder Runtime-Integrationsblock.

## KONTEXT (LIES IN DIESER REIHENFOLGE)

### Pflicht-Lektuere

1. `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
2. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`
3. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md`
4. `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
5. `docs/referenz/ai_architecture_context.md`
6. `src/state/training/RewardCalculator.js`
7. `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
8. `src/entities/ai/training/TrainerPayloadAdapter.js`

### Optional bei Bedarf

- vorhandene `python/configs/ablations/**`
- vorhandene Reports/Artefakte unter `data/training/ppo/**`

## WAS DU TUN SOLLST

### Phase 1: Analyse

- pruefe, ob BT103 eine kleine, klare Ablationsmatrix statt offenen Forschungsdrift beschreibt
- suche nach Resten von ONNX-, Runtime- oder produktiver PPO-Integration
- pruefe, ob Reward-, Curriculum- und Safety-Signale weiterhin aus dem JS-authoritative Pfad gelesen werden

### Phase 2: BT103 ausarbeiten oder schaerfen

- halte den Block auf 5 bis 7 gezielten Ablationen
- dokumentiere Champion-/Challenger-Regeln gegen BT102
- definiere einen echten Candidate-Freeze mit Manifest, Checkpoint und Report
- verschiebe ONNX oder produktive Inference explizit aus dem Block heraus

## LEITPLANKEN

- Keine neue Runtime-Policy, kein Feature-Flag, kein Bot-Registry-Eingriff.
- Keine Python-seitige Uminterpretation von Reward-/Curriculum-Semantik.
- Ein `hold`-Ergebnis ist zulaessig und ehrlicher als ein erzwungener Sieger.

## PFLICHT-AUSGABE

### A. Aenderungsliste

Welche BT103-Abschnitte wurden geschaerft, ersetzt oder entfernt?

### B. Offene Risiken und Loesungsansaetze

Welche Ablations-, Paritaets- oder Candidate-Freeze-Risiken bleiben offen?

### C. Naechste sinnvolle Schritte

Was ist der direkte Handover fuer BT104?

### D. Folge-Prompt

Erzeuge am Ende einen neuen Folge-Prompt fuer BT104 im selben Stil.
