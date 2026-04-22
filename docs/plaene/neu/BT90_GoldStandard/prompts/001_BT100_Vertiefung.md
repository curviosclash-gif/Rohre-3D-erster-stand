# Prompt 001: BT100-Vertiefung (Python-Bootstrap und Headless-Contract-PoC)

## ROLLE

Du arbeitest an einem Intake-Draft fuer den BT90-PPO-Zweitpfad.
BT90 ist kein aktiver Masterplan, sondern eine Planungsgrundlage unter `docs/plaene/neu/`.

## KONTEXT (LIES IN DIESER REIHENFOLGE)

### Pflicht-Lektuere

1. `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
2. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md`
3. `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
4. `docs/bot-training/Bot_Trainingsplan.md`
5. `docs/referenz/ai_architecture_context.md`
6. `src/state/HeadlessMatchKernelRuntime.js`
7. `src/core/MatchKernelTrainingAdapter.js`
8. `src/entities/ai/training/TrainingTransportFacade.js`
9. `src/entities/ai/training/WebSocketTrainerBridge.js`
10. `src/entities/ai/training/TrainingContractV1.js`
11. `src/entities/ai/training/TrainerPayloadAdapter.js`
12. `tests/training-environment.contract.test.mjs`
13. `scripts/training-smoke.mjs`
14. `scripts/headless-match-kernel-smoke.mjs`

### Optional bei Bedarf

- `src/shared/contracts/TrainingRuntimeContract.js`
- bestehende `python/**`-Dateien, falls schon vorhanden

## WAS DU TUN SOLLST

### Phase 1: Analyse

- pruefe, ob BT100 den bestehenden headless Kernelpfad und Contract `v1` korrekt konsumiert
- suche nach Aussagen, die implizit Spiel-, Runtime- oder AI-Hub-Aenderungen verlangen
- markiere jede Electron-first-Annahme als Fehler, wenn sie nicht rein optionaler Smoke ist

### Phase 2: BT100 ausarbeiten oder schaerfen

- halte den Block auf externer Sidecar-Architektur
- halte BT100 auf Minimal-Bootstrap, Contract-Wahrheit und genau einer 1-Worker-Lane
- haenge den PoC an `HeadlessMatchKernelRuntime`, `MatchKernelTrainingAdapter` und `TrainingTransportFacade`
- beschreibe nur Helper-Skripte, die ausserhalb des produktiven Runtime-Pfads liegen
- halte `ObservationBridgePolicy`, `WebSocketTrainerBridge`, `RuntimeConfig`, `BotPolicyRegistry`, `BotPolicyTypes`, `LocalDqnInference`, `RewardCalculator`, `HybridDecisionArchitecture` und `MatchSessionFactory` read-only
- formuliere einen ehrlichen Minimal-Install-Pfad fuer CPU; schwere PPO-Libs und Mehr-Worker nicht in BT100.99 hineinziehen

## LEITPLANKEN

- BT90 ist Intake, nicht aktiver Bot-Trainings-Master.
- Die einzige aktive Bot-Training-Quelle bleibt `docs/bot-training/Bot_Trainingsplan.md`.
- Keine neuen produktiven Message-Typen, keine neuen Runtime-Schalter, keine neue Bot-Auswahl im Spiel.
- Python ist externer Sidecar; das Spiel bleibt unangetastet.
- Wenn der Block fuer den PoC neue Runtime-Semantik braucht, dokumentiere das als Risiko statt es still einzuplanen.

## PFLICHT-AUSGABE

### A. Aenderungsliste

Welche BT100-Abschnitte wurden geschaerft, ersetzt oder entfernt?

### B. Offene Risiken und Loesungsansaetze

Welche Risiken bleiben fuer BT100 offen und muessen in `offene_risiken.md` landen oder aktualisiert werden?

### C. Naechste sinnvolle Schritte

Was ist der direkte Handover fuer BT101?

### D. Folge-Prompt

Erzeuge am Ende einen aktualisierten Folge-Prompt fuer BT101 oder verweise auf `002_BT101_Vertiefung.md`, falls dieser bereits konsistent ist.
