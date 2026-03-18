# Feature: Bot-Trainingsumgebung V32

Stand: 2026-03-10

## Ziel

Eine modulare Trainingsumgebung auf Basis der bestehenden Bot-Schnittstelle bauen, ohne den bestehenden Observation-/Action-Vertrag zu brechen.

Die Trainingsumgebung soll:

1. additiv neben der aktuellen Runtime existieren
2. `reset`, `step`, `reward`, `done`, `truncated` als sauberen Trainingsvertrag bereitstellen
3. spaeter externe Trainer fuer `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d` aufnehmen koennen
4. parallel zu V31 umsetzbar sein

## Nicht-Ziele

1. Keine Aenderung der Match-Bot-Auswahl aus V31
2. Kein Umbau von `RuntimeConfig`, `EntitySetupOps` oder `BotPolicyRegistry` in dieser Phase
3. Kein Breaking Change an Observation-Schema V1 oder Action-Contract V1
4. Kein finales GPU-/Cluster-Training als Teil dieser Phase

## Architektur-Check

Bestehende Einhaengepunkte:

1. `docs/Bot-Training-Schnittstelle.md` beschreibt den bestehenden KI-Vertrag.
2. `src/entities/ai/ObservationBridgePolicy.js` und `src/entities/ai/training/WebSocketTrainerBridge.js` liefern bereits eine Kommunikationsbasis.
3. `src/entities/ai/observation/ObservationSystem.js` und `src/entities/ai/actions/BotActionContract.js` sind geeignete stabile Vertragsgrenzen.
4. `src/state/validation/BotValidationService.js` und `BotValidationMatrix.js` koennen spaeter fuer Eval-KPIs wiederverwendet werden.

Gap zum echten Training:

1. Es fehlt ein sauberer Episoden-Lifecycle.
2. Es fehlt ein Reward-Service.
3. Es fehlt ein deterministischer `step`-Vertrag fuer Trainingslaeufe.
4. Es fehlt eine additive Trainings-Orchestrierung, die nicht in V31-Dateien hineinragt.

Risiko-Rating: `mittel`

## Parallelbetrieb mit V31

V32 ist explizit fuer parallele Umsetzung ausgelegt.

V32 besitzt:

1. `src/entities/ai/training/**`
2. `src/state/training/**` (neu, falls benoetigt)
3. trainingsbezogene Skripte unter `scripts/**`
4. trainingsbezogene Tests in neuen oder getrennten Testdateien
5. V32-Dokumente

V32 fasst bewusst nicht an:

1. `src/core/RuntimeConfig.js`
2. `src/entities/ai/BotPolicyTypes.js`
3. `src/entities/ai/BotPolicyRegistry.js`
4. `src/entities/runtime/EntitySetupOps.js`
5. `src/state/MatchSessionFactory.js`
6. mode-bezogene V31-Tests ausser bei explizitem Handoff

Handoff zwischen V31 und V32:

1. V32 darf intern weiter auf `mode + planarMode` als Domaenenbeschreibung aufsetzen.
2. Sobald V31 fertig ist, kann V32 optional den aufgeloesten Match-Bot-Typ konsumieren.
3. Bis dahin keine harte Kopplung an V31-Dateien erzwingen.

## Phasen

- [x] 32.0 Contract-Freeze und Parallelgrenzen setzen
  - Abgeschlossen am: `2026-03-10`
  - [x] 32.0.1 Observation-/Action-Vertrag gegen aktuellen Code revalidieren
  - [x] 32.0.2 Parallel-Ownership gegen V31 dokumentieren
  - [x] 32.0.3 Trainingsdomaene vorlaeufig ueber `mode + planarMode` definieren
  - Status 2026-03-10: Trainingsdomaene ist additiv in `src/state/training/TrainingDomain.js` ueber `mode + planarMode` eingefroren; Observation-Schema V1 und BotActionContract V1 blieben unveraendert.
  - Verifikation: Code-Lesepfade + kein Testlauf noetig

- [x] 32.1 Trainingsvertrag additiv modellieren
  - Abgeschlossen am: `2026-03-10`
  - [x] 32.1.1 Neues Trainings-Contract-Modul fuer `reset`, `step`, `reward`, `done`, `truncated`
  - [x] 32.1.2 Match-/Episode-Metadaten definieren
  - [x] 32.1.3 Keine Aenderung an Observation-V1 oder BotActionContract
  - Status 2026-03-10: `src/entities/ai/training/TrainingContractV1.js` modelliert den additiven Vertrag inklusive Match-/Episode-Metadaten und stabiler Observation-Laenge.
  - Betroffene Dateien: neue Module unter `src/entities/ai/training/**`
  - Verifikation: gezielte Contract-Tests

- [x] 32.2 Episoden- und Reward-Schicht bauen
  - Abgeschlossen am: `2026-03-10`
  - [x] 32.2.1 EpisodeController fuer Start, Reset, Terminal-Reason
  - [x] 32.2.2 RewardCalculator fuer Survival, Kill, Crash, Stuck, Item-/Damage-Events
  - [x] 32.2.3 Eval-/Reward-Signale ausserhalb des bestehenden Observation-Vektors halten
  - Status 2026-03-10: `src/state/training/EpisodeController.js` und `src/state/training/RewardCalculator.js` liefern deterministischen Episoden-Lifecycle und Reward-Shaping ausserhalb des Observation-Vektors.
  - Betroffene Dateien: neue Trainings-/State-Module
  - Verifikation: neue Trainings-Unit-Tests

- [x] 32.3 Deterministischen Step-Runner einfuehren
  - Abgeschlossen am: `2026-03-10`
  - [x] 32.3.1 Additiven Runner oder Debug-Adapter fuer einen kontrollierten Simulationsschritt bauen
  - [x] 32.3.2 Trainingspayload aus Runtime-Zustand ableiten
  - [x] 32.3.3 `done`/`truncated` sauber aus Match-/Episode-Ende ableiten
  - Status 2026-03-10: `src/entities/ai/training/DeterministicTrainingStepRunner.js` kombiniert EpisodeController, RewardCalculator und TrainingContract V1 fuer reproduzierbare `reset`/`step`-Transitions.
  - Betroffene Dateien: neue Trainingsmodule, ggf. neue Debug-API-Helfer
  - Verifikation: Smoke-Tests fuer Reset/Step/Done

- [x] 32.4 Transport- und Trainer-Adapter vervollstaendigen
  - Abgeschlossen am: `2026-03-10`
  - [x] 32.4.1 Bestehende WebSocket-Bridge additiv wrappen statt hart umzubauen
  - [x] 32.4.2 TrainerPayloadAdapter bauen
  - [x] 32.4.3 Checkpoint-/Eval-Metadaten vorbereiten
  - Status 2026-03-10: `TrainerPayloadAdapter`, `TrainingTransportFacade` und additive Methoden in `WebSocketTrainerBridge` (`submitTrainingReset`, `submitTrainingStep`, `submitTrainingPayload`) sind implementiert; `submitObservation` bleibt kompatibel.
  - Betroffene Dateien: `src/entities/ai/training/**`
  - Verifikation: Bridge-Smoke und Fallback-Pfade

- [x] 32.5 Trainings-Skripte und Eval-Smoketests
  - Abgeschlossen am: `2026-03-10`
  - [x] 32.5.1 Trainings-Smoke-Skript fuer lokale Sessions anlegen
  - [x] 32.5.2 Eval-Skript fuer einzelne Episoden anlegen
  - [x] 32.5.3 Log-/Artefaktstruktur definieren
  - Status 2026-03-10: `scripts/training-smoke.mjs` und `scripts/training-eval-smoke.mjs` schreiben Artefakte unter `data/training/*.json`; gezielte Tests liegen in `tests/training-environment.spec.js`.
  - Betroffene Dateien: `scripts/**`, neue Tests
  - Verifikation: Script-Smoke + gezielte Testdatei

- [x] 32.6 Abschluss-Gate und Doku-Freeze
  - Abgeschlossen am: `2026-03-10`
  - [x] 32.6.1 `docs/Bot-Training-Schnittstelle.md` trainingsseitig aktualisieren
  - [x] 32.6.2 V32-Doku und Restpunkte aktualisieren
  - [x] 32.6.3 Doku-Gates gruen
  - Verifikation: `npm run docs:sync`, `npm run docs:check`

## Definition of Done

1. Es existiert eine additive Trainingsschicht ohne Breaking Changes am bestehenden Bot-Vertrag.
2. `reset`/`step`/`reward`/`done` sind als klarer Trainingsvertrag modelliert.
3. V32 konnte ohne Aenderungen an den V31-Kerndateien umgesetzt werden.
4. Die Umgebung kann spaeter getrennte Trainer fuer vier Bot-Domaenen aufnehmen.

## Verifikation

Empfohlene Reihenfolge waehrend der Umsetzung:

1. neue gezielte Trainings-Tests
2. `npm run test:core`
3. `npm run docs:sync`
4. `npm run docs:check`

Optional:

1. lokaler Trainings-Smoke ueber neues Script
2. Einzelepisode mit Debug-Output fuer Reward/Done/Truncated
