# BT90 Python-Bootstrap

Dieser Ordner ist der minimale Startkern fuer den PPO-Zweitpfad aus `BT90`.
Die JS-Dateien im Repo bleiben authoritative.
Python adaptiert nur den bestehenden `v1`-Pfad und erfindet keinen eigenen Wahrheitsshape.

## Scope von BT90

In BT90 enthalten:

- dokumentierter Minimalstack fuer Windows/PowerShell
- venv- und Install-Story fuer `python/.venv`
- read-only Referenzlisten unter `python/bridge/authority_snapshot.py`
- reservierte Bauorte unter `python/bridge/**`, `python/envs/**`, `python/scripts/**` und `python/tests/**`
- reservierter Artefaktpfad unter `data/training/ppo/**`

Explizit nicht Teil von BT90:

- Sidecar-Handshake
- 1-Worker- oder 100-Step-Lane
- Single-Env
- VecEnv
- PPO-Baseline
- neue Message-Typen
- Aenderungen an produktiven Runtime-, Matchstart- oder AI-Hub-Surfaces

## Minimalstack

- Python: `3.10+` fuer den BT90-Startpfad
- venv-Pfad: `python/.venv`
- Pflichtpakete:
  - `pytest==8.2.2`
  - `websockets==12.0`
- Bewusst noch nicht Teil des Startblocks:
  - `gymnasium`
  - `stable-baselines3`
  - `torch`
  - `tensorboard`
  - `numpy` nur dann, wenn BT91+ echte Payload-Helfer dafuer braucht

Klarstellung zum aktuellen Worktree:

- `python/requirements.txt` dokumentiert bewusst nur den BT90-Minimalbootstrap.
- Das bereits lokal vorhandene BT92-Single-Env importiert zwar `gymnasium`, diese Dependency bleibt fuer den Follow-up-Pfad aber ein spaeterer BT92-Bedarf und wird nicht rueckwirkend in den BT90-Startblock gezogen.

## Install-Story (PowerShell, empfohlen)

```powershell
python --version
python -m venv python/.venv
.\python\.venv\Scripts\python.exe -m pip install --upgrade pip
.\python\.venv\Scripts\python.exe -m pip install -r python/requirements.txt
.\python\.venv\Scripts\python.exe -c "import pytest, websockets; print('bt90-bootstrap-ok')"
```

Hinweise:

- Der letzte Befehl ist nur der empfohlene lokale Install-Smoketest fuer den User; BT90 fuehrt ihn nicht automatisch aus.
- Schwere PPO-Libraries bleiben ausserhalb dieses Minimalstacks, bis ein Folgeblock sie wirklich braucht.
- Lokale venv-Dateien bleiben ueber `python/.gitignore` unversioniert.

## Verzeichniszuschnitt

- `python/bridge/**`: read-only Referenzen fuer den eingefrorenen JS-Contract
- `python/envs/**`: reservierter spaeterer Bauort fuer Env-Adapter ab BT92
- `python/scripts/**`: reservierter spaeterer Bauort fuer nichtproduktive Orchestrierung ab BT91
- `python/tests/**`: reservierter spaeterer Bauort fuer Python- und Contract-Tests
- `data/training/ppo/**`: reservierter Artefaktpfad fuer spaetere PPO-Reports, Manifeste und Checkpoints

## BT91 Boundary-Smoke

Der nichtproduktive BT91-Pfad bleibt ausserhalb der Runtime-Surfaces und nutzt weiter nur den bestehenden Bridge-/Contract-v1-Weg.

- Python-Sidecar Entry: `python/scripts/headless_bridge_sidecar.py`
- JS Boundary-Harness: `node scripts/training-headless-bridge-smoke.mjs`
- lokale BT91-Artefakte im aktuellen Worktree (laut `git status` derzeit noch untracked):
  - `data/training/ppo/contract_smoke.json`
  - `data/training/ppo/lane_baseline.json`

BT91 oeffnet dabei bewusst nur:

- `trainer-ready`
- `bot-action-request`
- `training-reset`
- `training-step`
- `trainer-stats-request`

Weiterhin explizit ausserhalb:

- 2- oder 4-Worker-Lanes
- Mehr-Env oder VecEnv
- PPO-Baseline
- produktive Runtime-, Matchstart- oder AI-Hub-Aenderungen

## BT90 Freeze-Check

Vor dem naechsten `BT90`-, `BT91`- oder `BT92`-Claim muss der Freeze maschinenlesbar geprueft werden.

- Check-Skript: `python/scripts/bt90_freeze_check.py`
- lokales Artefakt: `data/training/ppo/freeze_check.json`
- Referenzanker: Snapshot-Commit `017e8edeb548cb64a164d8dc72d1d1cb3055cc93`

Der Check vergleicht das Authority-Viereck und die Adjacent-Dateien gegen den Snapshot-Commit.

- Exit-Code `0` plus `freezeOk=true` bedeutet: kein Drift.
- Exit-Code `1` oder `reAuditRequired=true` bedeutet: Re-Audit statt stiller Python-Anpassung.

## BT92 Single-Env

Der BT92-Pfad kapselt genau ein `gymnasium.Env` ueber denselben Headless-/Bridge-v1-Weg.

- `gymnasium==0.29.1` ist fuer diesen BT92-Pfad der lokale Zusatzbedarf.
- Diese Dependency ist absichtlich nicht Teil von `python/requirements.txt`, weil die Datei nur den BT90-Minimalstack beschreibt.

- Python-Env: `python/envs/curvios_env.py`
- Python-Smoke: `python/scripts/bt92_single_env_smoke.py`
- JS Boundary-Controller: `scripts/training-single-env-bridge.mjs`
- lokales BT92-Artefakt im aktuellen Worktree (laut `git status` derzeit noch untracked):
  - `data/training/ppo/single_env_smoke.json`

BT92 bleibt bewusst bei:

- genau einem Env
- bestehendem `trainer-ready` / `bot-action-request` / `training-reset` / `training-step` / `trainer-stats-request`
- JS-authoritativer Reward-, Episode- und Hybrid-Semantik

Weiterhin explizit ausserhalb:

- Mehr-Env
- VecEnv
- PPO-Baseline
- Parallelisierung

## JS-authoritative Contract-Wahrheit

### Autoritative Dateien fuer den `v1`-Pfad

- `src/entities/ai/training/TrainingContractV1.js`
  - authoritative fuer den internen Reset-/Step-Transitionshape
- `src/entities/ai/training/TrainerPayloadAdapter.js`
  - authoritative fuer den externen serialisierbaren Transport-/Projection-Payload
- `src/entities/ai/observation/ObservationSchemaV2.js`
  - authoritative fuer `v2-runtime-near` und Laenge `64`
- `src/entities/ai/actions/BotActionContract.js`
  - authoritative fuer Bool-/Index-Semantik, Sanitization und Clamping

### JS-Wahrheitsartefakte

- `tests/training-environment.contract.test.mjs`
  - bestaetigt Reset-/Step-Contract, Observation V2 mit Laenge `64` und `hybridDecision` in `info.metadata`
- `scripts/training-smoke.mjs`
  - bestaetigt Reset-/Step-Emission ueber `TrainingTransportFacade` und die Index-Sanitization fuer `shootItemIndex`
- `scripts/headless-match-kernel-smoke.mjs`
  - bestaetigt den bestehenden Headless-Runtime-Pfad und dessen read-only Konsum fuer BT90

### Pflichtfelder: `TrainingContractV1`

Top-Level:

- `contractVersion`
- `operation`
- `episodeId`
- `episodeIndex`
- `stepIndex`
- `observation`
- `action`
- `reward`
- `done`
- `truncated`

`info`:

- `observationSchemaVersion`
- `observationLength`
- `domain`
- `match`
- `terminalReason`
- `truncatedReason`
- `rewardBreakdown`
- `metadata`

Freeze-Stand fuer BT90:

- `contractVersion` bleibt `v1`
- `operation` bleibt nur `reset` oder `step`
- `observation` wird auf `v2-runtime-near` mit Laenge `64` normalisiert
- `hybridDecision` ist hier kein eigener Top-Level-`info`-Schluessel, sondern lebt falls vorhanden in `info.metadata`

### Pflichtfelder: `TrainerPayloadAdapter`

`buildTrainerRuntimeObservationPayload(...)` liefert top-level:

- `mode`
- `planarMode`
- `controlProfileId`
- `domainId`
- `domainVersion`
- `dt`
- `observationSchemaVersion`
- `observationLength`
- `observation`
- `observationContext`
- `player`

`buildTrainerTransitionPayload(...)` liefert top-level:

- `contractVersion`
- `observationSchemaVersion`
- `observationLength`
- `operation`
- `episodeId`
- `episodeIndex`
- `stepIndex`
- `reward`
- `done`
- `truncated`
- `observation`
- `action`
- `info`
- `kernelRuntime`

`buildTrainerTransitionPayload(...).info` fuehrt:

- `domain`
- `terminalReason`
- `truncatedReason`
- `rewardBreakdown`
- `match`
- `observationContext`
- `hybridDecision`

Nur soweit real projeziert:

- `match`
- `observationContext`
- `hybridDecision`
- `kernelRuntime`

Python-Regel:

- kein boolesches Umdeuten von `useItem`
- kein Fallback auf einen alten V1-Observation-Snapshot
- keine Python-seitige Neuberechnung von Reward-, Episode- oder Domain-Semantik

### Aktionssemantik aus `BotActionContract`

Bool-Felder:

- `pitchUp`
- `pitchDown`
- `yawLeft`
- `yawRight`
- `rollLeft`
- `rollRight`
- `boost`
- `cameraSwitch`
- `dropItem`
- `shootItem`
- `shootMG`
- `nextItem`

Index-Felder:

- `shootItemIndex`
- `useItem`

Freeze-Stand:

- `useItem` bleibt ein Inventory-Index; `-1` bedeutet "kein Item verwenden"
- `shootItem` ohne gueltigen `shootItemIndex` wird neutralisiert
- Indizes werden nur in `-1..inventoryLength-1` geklemmt

### PPO-Festlegung nach BTF-07

- `CurviosEnv` spiegelt fuer `BT92` bewusst nur die rohe JS-authoritative Bool-/Index-Semantik.
- Die feste `257`er-Indexbreite der beiden Index-Felder ist nur Boundary-Kompatibilitaet fuer den Single-Env-Pfad, nicht die spaetere PPO-Policy-Surface.
- `BT93B` und `BT93C` muessen ueber `Split-Head` fuer Bool-/Intent-Felder plus `shootItemIndex`/`useItem` gehen.
- Eine `Action-Mask` aus `inventoryLength` bleibt optionales Hilfssignal; Sanitizer-Clamping/Neutralisierung bleibt nur Fallback und Diagnostik, nicht die gewollte Lernsemantik.

## Erlaubte Bauorte und No-Touch-Grenzen

Erlaubte PPO-Bauorte:

- `python/bridge/**`
- `python/envs/**`
- `python/scripts/**`
- `python/tests/**`
- `data/training/ppo/**`

Read-only Runtime-, Matchstart- und AI-Hub-Surfaces:

- `src/state/HeadlessMatchKernelRuntime.js`
- `src/core/MatchKernelTrainingAdapter.js`
- `src/entities/ai/training/TrainingTransportFacade.js`
- `src/entities/ai/training/WebSocketTrainerBridge.js`
- `src/entities/ai/ObservationBridgePolicy.js`
- `src/core/RuntimeConfig.js`
- `src/entities/ai/BotPolicyRegistry.js`
- `src/entities/ai/BotPolicyTypes.js`
- `src/entities/ai/inference/LocalDqnInference.js`
- `src/state/training/RewardCalculator.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
- `src/state/MatchSessionFactory.js`

Wenn der BT90-Startpfad Schreibzugriffe auf diese Surfaces, neue Message-Typen oder neue Runtime-Schalter braucht, ist das kein Restpunkt.
Dann ist ein Re-Audit mit neuem Intake noetig.

## Freeze-Check und Re-Audit-Regel

Vor BT91/BT92 gegen diese Freeze-Dateien pruefen:

- `src/entities/ai/training/TrainingContractV1.js`
- `src/entities/ai/training/TrainerPayloadAdapter.js`
- `src/entities/ai/observation/ObservationSchemaV2.js`
- `src/entities/ai/actions/BotActionContract.js`

Zusatzpruefung gegen diese Adjacent-Dateien:

- `src/state/training/TrainingDomain.js`
- `src/entities/ai/observation/RuntimeNearObservationAdapter.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
- `src/state/training/EpisodeController.js`

Sofort stoppen und neu auditieren, wenn:

- `TRAINING_CONTRACT_VERSION` nicht mehr `v1` ist
- `OBSERVATION_SCHEMA_VERSION_V2` oder `OBSERVATION_LENGTH_V2` driftet
- `useItem` oder `shootItemIndex` ihre Index-Semantik verlieren
- `rewardBreakdown`, `terminalReason` oder `truncatedReason` verschwinden
- `hybridDecision` oder `observationContext` still verschoben oder entfernt werden
- der Python-Pfad ploetzlich neue Message-Typen, neue Runtime-Schalter oder Schreibzugriffe auf read-only Surfaces braucht

## Reservierte Artefakte

`data/training/ppo/**` ist ab BT90 der einzige vorgesehene versionierbare Repo-Bauort fuer nichtproduktive PPO-Artefakte.
Die aktuell dort liegenden BT91/BT92-Dateien sind im Worktree vorhanden, werden von Git derzeit aber noch als untracked gefuehrt.
BT90 legt nur den Pfad fest.
Empfohlene Folgedateien fuer spaetere Bloecke sind z. B.:

- `data/training/ppo/bootstrap_manifest.json`
- `data/training/ppo/contract_smoke.json`
- `data/training/ppo/lane_baseline.json`

Lock, Status und Evidence bleiben weiterhin ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md`.
