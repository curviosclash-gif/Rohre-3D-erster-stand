# Prompt 002: BT101-Vertiefung (Headless Gymnasium Environment)

## ROLLE

Du vertiefst BT101 im BT90-PPO-Zweitpfad.
Der Plan ist Intake unter `docs/plaene/neu/` und darf keine produktiven Runtime- oder AI-Hub-Aenderungen voraussetzen.

## VORSTART / GATE

Bevor du block-spezifisch arbeitest, lies zwingend:

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/prompts/000_BT90_Followup_Loop.md`

Wenn im Tracker ein hoeher priorisierter offener oder blockierter Punkt existiert, dessen Abhaengigkeiten bereits erfuellt sind, bearbeite nicht direkt BT101 weiter.
Arbeite stattdessen den naechsten faelligen Tracker-Punkt ab, aktualisiere Status, `Wie erledigt`, Evidence und Verweise und gib danach wieder einen `NEXT_PROMPT` im selben Standard aus.

## KONTEXT (LIES IN DIESER REIHENFOLGE)

### Pflicht-Lektuere

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
3. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md`
4. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md`
5. `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
6. `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
7. `docs/referenz/ai_architecture_context.md`
8. `src/entities/ai/observation/ObservationSchemaV1.js`
9. `src/entities/ai/observation/ObservationSchemaV2.js`
10. `src/entities/ai/actions/BotActionContract.js`
10. `src/entities/ai/training/TrainingContractV1.js`
11. `src/entities/ai/training/TrainerPayloadAdapter.js`
12. `src/entities/ai/training/TrainingTransportFacade.js`
13. `src/core/MatchKernelTrainingAdapter.js`
14. `src/state/HeadlessMatchKernelRuntime.js`
15. `tests/training-environment.contract.test.mjs`
16. `scripts/training-eval-smoke.mjs`

### Optional bei Bedarf

- `src/state/training/RewardCalculator.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
- bestehende `python/envs/**`-Dateien

## WAS DU TUN SOLLST

### Phase 1: Analyse

- pruefe, ob BT101 Observation, Action, Reward und Episode-Semantik aus dem bestehenden JS-Pfad uebernimmt
- suche nach Stellen, an denen Python implizit zum zweiten Reward-/Curriculum-Owner wird
- suche nach Stellen, an denen Electron-Client-Management noch als Primaerarchitektur auftaucht

### Phase 2: BT101 ausarbeiten oder schaerfen

- baue BT101 um ein echtes headless `gymnasium.Env`
- halte den Single-Env-Pfad fuer `reset()`/`step()` als erste Pflicht
- behandle Mehr-Worker-/VecEnv-Pfade nur als Folge ausserhalb von `101.99`
- halte produktive Reward-, Safety- und Intent-Semantik JS-authoritative
- behandle Schema-/Payload-Mismatch als Blocker statt als stillen Adapter-Fallback
- behandle Runtime-/AI-Hub-Dateien weiter als read-only

## LEITPLANKEN

- Keine neue Aktionssprache in Python.
- `useItem` bleibt expliziter Inventory-Index gemaess `BotActionContract.js`.
- Keine Python-seitige Curriculum-Stage-Resolution als fachliche Quelle.
- Keine produktive Bridge-, Runtime- oder Policy-Umschaltung.
- Worker-Wrapper duerfen nur orchestrieren, nicht den Contract neu erfinden.

## PFLICHT-AUSGABE

### A. Aenderungsliste

Welche BT101-Abschnitte wurden ersetzt, gekuerzt oder nachgeschaerft?

### B. Offene Risiken und Loesungsansaetze

Welche Parallelisierungs-, Telemetrie- oder Ownership-Risiken bleiben offen?

### C. Naechste sinnvolle Schritte

Was ist der direkte Handover fuer BT102?

### D. Folge-Prompt

Erzeuge am Ende einen aktualisierten Folge-Prompt fuer BT102 oder verweise auf `003_BT102_Vertiefung.md`, falls dieser bereits konsistent ist.
