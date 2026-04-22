# BT90 PPO-Zweitpfad - Intake-Masterplan

Stand: 2026-04-22

Dieser Master ist der kompakte Index fuer den BT90-PPO-Zweitpfad.
Kanonische Blockdetails leben ausschliesslich in den Dateien unter `docs/plaene/neu/BT90_GoldStandard/bloecke/`.

## Rolle des Dokuments

- BT90 ist ein Intake-Draft unter `docs/plaene/neu/`.
- Die einzige aktive Quelle fuer Bot-Training bleibt `docs/bot-training/Bot_Trainingsplan.md`.
- `docs/Umsetzungsplan.md` bleibt der kompakte Master-Index fuer das Gesamtprojekt.
- Operative Locks, Conflict-Logs, Trainingsfortschritt und Abschluss-Evidence werden erst nach User-Entscheid im aktiven Bot-Trainingsplan gefuehrt.
- Dieser Master haelt nur Zielbild, Leitplanken, Abhaengigkeiten, Ownership und die kompakte Blockliste.

## Empfohlener Startmodus

BT90 wird aktuell **nicht** als komplette BT100-BT105-Kette aktiviert.
Der governance-saubere Start ist ein Rolling-Ansatz:

- **jetzt implementieren:** `BT100` als Wahrheitsblock fuer Minimal-Bootstrap, Contract-PoC und genau eine 1-Worker-Headless-Lane
- **danach:** `BT101` nur in der Minimalspur `101.1` bis `101.3` fuer Observation-/Action-Authority, Single-Env und JS-authoritative Semantik
- **nur bei gruener Lage weiterziehen:** `BT101.4` bis `101.6` als explizite Folgespur fuer Mehr-Env-/VecEnv-Themen
- **bewusst rolling drafts lassen:** `BT102` bis `BT105`; diese Bloecke werden nach BT100/BT101 auf Basis echter Evidence re-baselined

Wichtig:

- BT90 bleibt bis zur User-Entscheidung ein Intake-Draft.
- Ein aktiver Start darf nicht direkt aus diesem Ordner heraus als zweiter operativer Wahrheitsraum passieren.
- Die spaetere Uebernahme in `docs/bot-training/Bot_Trainingsplan.md` erfolgt blockweise und user-managed; Details stehen in `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`.

## Zielbild

- Kurzfristig: PPO ausserhalb des produktiven Bot-Pfads ueber denselben fachlichen Kern trainierbar machen.
- Mittelfristig: PPO auf einer festen Matrix reproduzierbar gegen den eingefrorenen DQN-Champion einordnen.
- Langfristig: Nach gruener Evidence einen separaten spaeteren Integrationsblock fuer Runtime-Rollout und DQN-Sunset vorbereiten.

Leit-KPIs fuer die Evidence-Phase:

- `averageBotSurvival` gegen dieselbe DQN-Referenz verbessern
- `avgStepsPerEpisode` gegen dieselbe DQN-Referenz verbessern
- keine stillen Semantik- oder Interface-Aenderungen im produktiven Bot-Pfad
- keine Runtime- oder AI-Hub-Brueche im bestehenden Spielkern

## Governance-Leitplanken

1. `*.99`-Gates duerfen nur `[x]` sein, wenn alle frueheren Phasen desselben Blocks `[x]` sind.
2. Jeder abgeschlossene Phasenpunkt braucht Evidence im Format `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`.
3. BT90 konsumiert bestehende Spiel-, Adapter-, Payload- und Transport-Vertraege; er definiert sie in BT100-BT105 nicht neu.
4. PPO laeuft in BT100-BT105 als externer Sidecar-/Trainingspfad ueber bestehende headless Adapter.
5. Produktive Runtime-/AI-Hub-Surfaces bleiben in BT100-BT105 read-only:
   - `src/entities/ai/ObservationBridgePolicy.js`
   - `src/entities/ai/training/WebSocketTrainerBridge.js`
   - `src/core/RuntimeConfig.js`
   - `src/entities/ai/BotPolicyRegistry.js`
   - `src/entities/ai/BotPolicyTypes.js`
   - `src/entities/ai/inference/LocalDqnInference.js`
   - `src/state/training/RewardCalculator.js`
   - `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
   - `src/state/MatchSessionFactory.js`
6. Eine produktive DQN-Ablosung ist erst nach gruener PPO-Evidence, separatem Integrationsblock und explizitem User-Entscheid zulaessig.

## Layer-System und Architekturgrenzen

Quelle: `docs/referenz/ai_architecture_context.md`

| Layer | Bestehende Struktur | BT90-Regel |
| --- | --- | --- |
| Match-/Runtime-Kern | `HeadlessMatchKernelRuntime`, `MatchKernelTrainingAdapter` | Primaerer Simulationspfad fuer PPO; kein neuer Matchstart ausserhalb dieses Kerns |
| Trainings-Adapter | `DeterministicTrainingStepRunner`, `TrainingTransportFacade`, `TrainerPayloadAdapter` | Muss wiederverwendet werden; kein doppelter Step-/Reward-/Reset-Vertrag |
| Transport / AI-Hub | `WebSocketTrainerBridge`, Bot-Bridge-Vertrag V1 | Nur konsumieren, nicht brechen; externer PPO-Sidecar spricht denselben Vertrag |
| Runtime-Bot-Auswahl | `ObservationBridgePolicy`, `RuntimeConfig`, `BotPolicyRegistry`, `BotPolicyTypes` | In BT100-BT105 read-only; produktive PPO-Auswahl ist Folgearbeit |
| Reward / Safety / Intent | `RewardCalculator`, `HybridDecisionArchitecture` | Produktive Semantik bleibt authoritative; BT90 trainiert gegen diese Semantik |
| Python-Stack | `python/**` neu | Darf neu aufgebaut werden, aber nur ausserhalb des produktiven Runtime-Pfads |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| BT100 | - | - | ja | Startet als Intake-Draft sofort |
| BT101 | BT100.99 | hard | nein | Headless-/Contract-PoC muss stehen |
| BT102 | BT101.99 | hard | nein | PPO-Baseline braucht stabiles headless Gym-Env |
| BT103 | BT102.99 | hard | nein | Tuning braucht Baseline- und Artefaktpfad |
| BT104 | BT103 Freeze-Paket vorhanden | hard | nein | BT104 startet nur, wenn BT103 nicht mit `hold` endet und ein gefrorener Kandidat unter `data/training/ppo/candidates/**` vorliegt |
| BT104 | BT80C 80.9.3 | soft | nein | Gruener `bot:validate`-Pfad verbessert die Vergleichbarkeit, ist aber kein Startblocker |
| BT105 | BT104 Urteil `promote` | hard | nein | Der Handoff Richtung spaeterer Integration ist nur nach positiver externer Evidence sinnvoll |
| BT105 | BT80C 80.9.3 oder gleichwertiger produktiver Validation-Pfad | soft | nein | Fuer den Draft-Handoff als Restblocker dokumentieren; fuer einen spaeteren aktiven Rollout-Intake bleibt der Punkt hart |

Cross-Plan-Leitplanke:

- BT104 darf externe PPO-Evidence auch dann vorbereiten, wenn `BT80C 80.9.3` noch offen ist.
- BT105 darf als Draft-Handoff offene produktive Validation-Risiken dokumentieren.
- Ein spaeterer aktiver Rollout-/Sunset-Intake darf aber erst entstehen, wenn `BT80C 80.9.3` oder ein gleichwertiger stabiler produktiver Validation-Pfad gruener Bestandteil der Gesamtlage ist.

## Datei-Ownership

### Neue oder draft-nahe Dateien

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `python/**` | BT100-BT105 | neu | PPO-Stack, Gym-Env, Train/Eval/Ablation, Reports |
| `data/training/ppo/**` | BT100-BT105 | neu | Artefakte, Checkpoints, Reports, Frozen Candidates |
| `docs/plaene/neu/BT90_GoldStandard/**` | BT100-BT105 | neu | Intake-Master, Blockdetails, Risiken, Prompts |
| `scripts/training-headless-*.mjs` | BT100-BT104 | optional neu | Nur fuer nichtproduktive Orchestrierung ueber bestehende Vertraege |
| `package.json` | BT100-BT104 | optional minimal | Nur fuer nichtproduktive PPO-/Headless-Helferskripte |

### Read-only in BT100-BT105

| Pfadmuster | Grund |
| --- | --- |
| `src/entities/ai/ObservationBridgePolicy.js` | produktive Runtime-/AI-Hub-Naht bleibt stabil |
| `src/entities/ai/training/WebSocketTrainerBridge.js` | Transportvertrag bleibt eingefroren |
| `src/core/RuntimeConfig.js` | keine produktive PPO-Umschaltung in BT100-BT105 |
| `src/entities/ai/BotPolicyRegistry.js`, `src/entities/ai/BotPolicyTypes.js` | keine neue produktive Policy-Auswahl im Intake-Pfad |
| `src/entities/ai/inference/LocalDqnInference.js` | DQN-Champion bleibt bis spaeterer Sunset-Arbeit unangetastet |
| `src/state/training/RewardCalculator.js` | produktive Reward-Semantik bleibt authoritative |
| `src/entities/ai/hybrid/HybridDecisionArchitecture.js` | Safety-/Intent-Vertrag bleibt unveraendert |
| `src/state/MatchSessionFactory.js` | keine alternativen Matchstartpfade aufziehen |

## Intake-Bloecke

Kanonische Blockdetails liegen ausschliesslich in den verlinkten Blockdateien.

| id | titel | status | prio | owner | depends_on | current_phase | plan_file | rolle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BT100 | Python-Bootstrap und Headless-Contract-PoC | planned | P1 | frei | - | 100.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` | Wahrheitsblock fuer Minimal-Bootstrap, Contract-PoC und 1-Worker-Headless-Lane |
| BT101 | Headless Gymnasium Environment ueber bestehende Vertraege | planned | P1 | frei | BT100.99 | 101.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md` | BT101.99 schliesst nur mit Single-Env; VecEnv-/Mehr-Worker bleiben Folgepfad |
| BT102 | PPO-Baseline-Training | planned | P1 | frei | BT101.99 | 102.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md` | rolling draft fuer konservative Baseline nach echter BT100/BT101-Evidence |
| BT103 | Hyperparameter-Tuning, Curriculum-Hardening und Candidate Freeze | planned | P2 | frei | BT102.99 | 103.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md` | rolling draft fuer kleine Ablationsmatrix und Freeze-Entscheid |
| BT104 | Externe A/B-Validation und Promotions-Evidence | planned | P2 | frei | BT103 Freeze-Paket | 104.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md` | rolling draft fuer verdict-sensitive externe Evidence ohne Runtime-Umschaltung |
| BT105 | Integrations-Handoff und DQN-Sunset-Vorbereitung | planned | P3 | frei | BT104 Urteil `promote` | 105.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md` | rolling draft fuer spaeteren Integrations-Handoff statt sofortigem Umsetzungsblock |

## Empfohlene Reihenfolge

1. BT100 - Minimal-Bootstrap, Contract-PoC und 1-Worker-Headless-Lane sauber schliessen
2. BT101 - nur `101.1` bis `101.3` als Single-Env-Minimalspur stabilisieren
3. BT101 - `101.4` bis `101.6` nur bei gruener Minimalspur als expliziten Folgepfad oeffnen
4. BT102 bis BT105 mit echter Evidence aus BT100/BT101 neu schaerfen und dann blockweise intaken

## Beziehung zum bestehenden Bot-Trainingsplan

- Der bestehende DQN-Pfad (`BT10-BT80C`) bleibt aktiv und autoritativ.
- BT90 ist ein zweiter Pfad als Intake-Draft fuer die spaetere Uebernahme in den bestehenden Bot-Trainingsplan.
- BT90 ersetzt die aktive Bot-Training-Governance nicht.
- BT100-BT105 liefern Voraussetzungen fuer spaetere PPO-Integration, fuehren sie aber nicht im produktiven Spiel aus.
- Die erste aktive Uebernahme sollte nicht die komplette BT90-Kette sein, sondern ein kleiner aktiver PPO-Startblock auf Basis von BT100 plus BT101-Single-Env-Grundpfad; Details stehen in `IMPLEMENTATION_README.md`.

## Dokumentations-Hook

- Root-Ueberblick: `docs/plaene/neu/BT90_GoldStandard/README.md`
- Implementierungs- und Migrationspfad: `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`
- Kanonische Blockdetails: `docs/plaene/neu/BT90_GoldStandard/bloecke/*.md`
- Session-Risiken: `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
- Vertiefungs-Prompts: `docs/plaene/neu/BT90_GoldStandard/prompts/*.md`
