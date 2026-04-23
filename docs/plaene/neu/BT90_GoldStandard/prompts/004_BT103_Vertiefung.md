# Prompt 004: BT103-Vertiefung (Ablationen, Curriculum-Hardening und Candidate Freeze)

## ROLLE

Du vertiefst BT103 im BT90-PPO-Zweitpfad.
Der korrigierte BT103-Block ist kein ONNX-, Inference- oder Runtime-Integrationsblock.

## VORSTART / GATE

Bevor du block-spezifisch arbeitest, lies zwingend:

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/prompts/000_BT90_Followup_Loop.md`

Wenn im Tracker ein hoeher priorisierter offener oder blockierter Punkt existiert, dessen Abhaengigkeiten bereits erfuellt sind, bearbeite nicht direkt BT103 weiter.
Arbeite stattdessen den naechsten faelligen Tracker-Punkt ab, aktualisiere Status, `Wie erledigt`, Evidence und Verweise und gib danach wieder einen `NEXT_PROMPT` im selben Standard aus.

## KONTEXT (LIES IN DIESER REIHENFOLGE)

### Pflicht-Lektuere

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
3. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`
4. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md`
5. `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
6. `docs/referenz/ai_architecture_context.md`
7. `src/state/training/RewardCalculator.js`
8. `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
9. `src/entities/ai/training/TrainerPayloadAdapter.js`

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
