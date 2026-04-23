# BT90 Implementierungs-README

Stand: 2026-04-23

Dieses Dokument beschreibt, wie BT90 governance-sauber von einem Intake-Draft zu echter Umsetzung uebergeht.
Es ist **kein** zweiter aktiver Masterplan.
Die einzige aktive Quelle fuer Bot-Training bleibt `docs/bot-training/Bot_Trainingsplan.md`.

## Verbindlicher Follow-up-Loop ab 2026-04-23

Fuer Folgearbeit nach dem Audit vom 2026-04-23 gilt:

- Zentrale Review-Arbeitsliste: `BT90_Followup_Tracker_2026-04-23.md`
- Verbindlicher Loop-Startprompt: `prompts/000_BT90_Followup_Loop.md`
- Jeder Folgeprompt arbeitet den naechsten sinnvollen offenen Punkt aus dem Tracker ab.
- Erledigtes wird dort mit Status, Wie, Evidence und Verweisen eingetragen.

Bis ein claimbarer Folgepfad hinter `BT92` sauber uebernommen ist, gilt:

- kein Claim auf den alten Monolith `BT93`
- kein `BT93B`-/`BT93C`-Claim ohne vorgelagertes `BT93A`
- keine echte PPO-Baseline vor gruener Harness- und Scaffold-Lage
- kein Weiterziehen in BT94/BT95 ohne `BT93C.99`

Repo-Stand 2026-04-23:

- `python/**` und `data/training/ppo/**` liegen im aktuellen Worktree bereits vor.
- Laut `git status` und `git ls-files` sind diese Pfade derzeit aber noch nicht repo-versioniert.
- Folgearbeit referenziert sie deshalb als lokalen PPO-Bauort, nicht als fehlenden oder bereits repo-versionierten Basispfad.

## Grundregel

Der gesamte Ordner `docs/plaene/neu/BT90_GoldStandard/` wird **nicht** 1:1 als aktiver Arbeitsplan umgesetzt.

Stattdessen gilt:

- BT90 bleibt Entwurfs-, Review- und Handoff-Material.
- Aktive Phasen, Locks, Checkpoint-Logs und Abschluss-Evidence leben nur im Bot-Trainingsplan.
- Die Uebernahme erfolgt **blockweise**, nicht als Komplettlift des ganzen Ordners.

## Empfohlener Start

Der erste reale Start soll klein und wahrheitsorientiert sein:

1. `BT100.1` bis `BT100.2` als kleinsten Bootstrap- und Contract-Wahrheitskern schliessen.
2. `BT100.3` bis `BT100.5` als separaten kleinen Folgeblock fuer Sidecar-Handshake und 1-Worker-100-Step-Lane ziehen.
3. `BT101` nur in der Minimalspur `101.1` bis `101.3` anziehen.
4. `BT93A` erst als reinen Mehr-Env-/Throughput-Harness ueber `BT101.4` bis `BT101.6` oeffnen.
5. `BT93B` danach nur als minimalen PPO-Scaffold ueber `BT102.1` bis `BT102.3` oeffnen.
6. `BT93C` erst fuer die echte konservative PPO-Baseline ueber `BT102.4` bis `BT102.6` nachziehen.

Nach dem Audit vom 2026-04-23 reicht diese abstrakte Leiter allein aber nicht mehr.
Vor weiterem BT93+-Scope muss zuerst der Follow-up-Tracker abgearbeitet werden:

1. Repo-Wahrheit vs. Doku-Wahrheit herstellen.
2. Lock-/Status- und Freshness-Widersprueche beseitigen.
3. Freeze-/Evidence-Regeln haerten.
4. Erst danach den Folgepfad `BT93A -> BT93B -> BT93C` oeffnen.

## Contract-Freeze vor dem ersten Claim

Vor jedem aktiven Claim fuer `BT90`, `BT91` oder `BT92` zuerst:

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md` lesen.
2. `python/scripts/bt90_freeze_check.py` ausfuehren, zum Beispiel mit `python python/scripts/bt90_freeze_check.py` oder `.\python\.venv\Scripts\python.exe python/scripts/bt90_freeze_check.py`.
3. Das lokale Artefakt `data/training/ppo/freeze_check.json` pruefen; nur `freezeOk=true` plus Exit-Code `0` zaehlen als gruene Freeze-Bestaetigung.
4. Wenn `reAuditRequired=true` ist oder der Check mit Exit-Code `1` endet, zuerst den Snapshot neu auditieren, statt den Python-Pfad still anzupassen.

Entscheidung zum Verhaeltnis mit `V101`:

- `V101` ist aktuell kein harter Vorblocker fuer `BT90` oder `BT91`.
- Fuer `BT90` bis `BT92` gilt stattdessen ein kontrollierter Dokumentations-Freeze gegen den Stand vom 2026-04-22.
- Nach relevanten `V101`-Aenderungen an Authority- oder Adjacent-Dateien ist vor dem naechsten Claim ein Re-Audit Pflicht.
- Fuer `BT92` ist diese frische Bestaetigung strenger als fuer `BT90` oder `BT91`, weil dort Observation-/Action-Authority und Semantik bereits direkt closure-kritisch sind.

## Vor dem lokalen Reset

Wenn der naechste Schritt ist, den aktuellen lokalen Stand zu sichern und den Worktree auf den Git-Repository-Stand zurueckzubringen, dann sollte der Ablauf so aussehen:

1. Den kompletten Ordner `docs/plaene/neu/BT90_GoldStandard/` ausserhalb des aktiven Worktrees sichern.
2. Optional zusaetzlich einen separaten Branch, Tag oder Archiv-Snapshot anlegen, falls die Entwurfs-Historie spaeter wieder verglichen werden soll.
3. Erst **nach** verifiziertem Snapshot den lokalen Worktree auf den gewuenschten Remote-/Repo-Stand zuruecksetzen.
4. Nach dem Reset BT90 nur als Referenz oder erneut als Draft in den frischen Worktree zurueckholen, nicht als sofortige operative Source of Truth.

Wichtig:

- Der Reset selbst ist user-owned.
- Die aktive Umsetzung startet erst nach sauberem Intake in den Bot-Trainingsplan.

## Governance-sauberer Migrationspfad in den aktiven Bot-Trainingsplan

Die Uebernahme sollte in vier kleine aktive BT-Bloecke geschnitten werden, nicht als ein grosser BT90-Monolith.

### Empfohlene aktive Blockleiter

| Aktiver Block im Bot-Trainingsplan | Quelle in BT90 | Zweck |
| --- | --- | --- |
| `BT90` | `BT100.1` bis `BT100.2` | Python-Bootstrap-Minimum und JS-authoritative Contract-Wahrheit |
| `BT91` | `BT100.3` bis `BT100.5` | Python-Sidecar-Handshake, Contract-Smoke und 1-Worker-100-Step-Lane |
| `BT92` | `BT101.1` bis `BT101.3` | Observation-/Action-Authority, Single-Env und JS-authoritative Semantik |
| `BT93A` | `BT101.4` bis `BT101.6` | Mehr-Env-/Throughput-Harness ausserhalb der produktiven Runtime |
| `BT93B` | `BT102.1` bis `BT102.3` | minimaler PPO-Baseline-Scaffold mit Smoke-, Checkpoint- und Resume-Kette |
| `BT93C` | `BT102.4` bis `BT102.6` | konservative PPO-Baseline, DQN-Vorvergleich und reproduzierbarer Referenzlauf |
| `BT94` | `BT103` + `BT104` | kleine Ablationsmatrix, Candidate Freeze, externe A/B-Evidence |
| `BT95` | `BT105` | Integrations-Handoff und spaeterer Rollout-/Sunset-Intake |

Diese Block-IDs sind ein **Vorschlag** fuer den spaeteren manuellen Intake.
Die eigentliche Aufnahme in `docs/bot-training/Bot_Trainingsplan.md` bleibt user-owned.

## Warum dieser Schnitt besser ist

So bleibt der Governance-Rahmen sauber:

- Der aktive Bot-Trainingsplan bleibt die einzige operative Quelle.
- BT90 bleibt Referenz- und Intake-Material.
- Der erste aktive Block prueft nur die kleinste riskanteste Grundannahme zuerst.
- Sidecar-Handshake, 100-Step-Lane und Single-Env werden nicht mehr in einen einzigen Startblock gepresst.
- Schwache Spaetbloecke blockieren den Start nicht mehr.
- der alte Monolith `BT93` wird durch `BT93A` bis `BT93C` ersetzt, bevor `BT94` oder `BT95` ueberhaupt claimbar werden.
- `BT102` bis `BT105` koennen nach echten Daten statt Wunschannahmen nachgeschaerft werden.

## Konkrete Intake-Regel pro Stufe

Jede Stufe soll denselben Mechanismus nutzen:

1. BT90-Draft als Referenz lesen.
2. Nur den **naechsten kleinen aktiven Block** manuell in `docs/bot-training/Bot_Trainingsplan.md` intaken.
3. Lock, Risiken, DoD, Checkpoint-Log und Evidence nur dort aktiv fuehren.
4. BT90 danach nur noch als Draft fuer den **darauffolgenden** Intake nachschneiden.

Nicht erlaubt:

- paralleles Pflegen aktiver Phasen in BT90 **und** im Bot-Trainingsplan
- direkte Lock-/Statusfuehrung im BT90-Ordner
- Komplettumsetzung von BT100-BT105 ohne vorherige aktive Zerlegung

## Wie die ersten kleinen aktiven BT-Bloecke aussehen sollten

Der erste aktive Block sollte bewusst nur den kleinsten Wahrheitskern enthalten:

- Python-Version, venv-Pfad und Minimal-Install-Smoketest
- JS-seitige Contract-Wahrheitsartefakte
- explizite Feldliste fuer den bestehenden `v1`-Pfad
- erlaubte PPO-Bauorte (`python/**`, `data/training/ppo/**`)
- read-only Runtime-, Matchstart- und AI-Hub-Grenzen
- Blocker-Regel fuer Contract- oder Runtime-Drift
- Freeze-Verweis auf `BT90_Contract_Authority_Snapshot_2026-04-22.md`

Bewusst nicht in den ersten aktiven BT90-Wahrheitsblock ziehen:

- Sidecar-Handshake
- 1-Worker-Lane
- Single-Env
- VecEnv
- PPO-Baseline

Der zweite kleine aktive Block zieht dann erst:

- Python-Sidecar fuer Contract `v1`
- Boundary-Smoke fuer genau einen Worker
- deterministische 100-Step-Lane
- kleine Boot-/Reset-/Step-Baseline

Der dritte kleine aktive Block zieht dann erst:

- `BT101.1` Observation-/Action-Authority
- `BT101.2` Single-Env-Grundgeruest
- `BT101.3` Reward-/Episode-Semantik verifizieren

Nicht in den ersten drei kleinen aktiven Startbloecke ziehen:

- Multi-Env-/VecEnv-Arbeit
- lange PPO-Baselines
- Ablationen
- A/B-Promotion
- Runtime-Handoff

## Action-Festlegung fuer PPO nach BT92

- `BT92` friert die rohe JS-authoritative Bool-/Index-Semantik ein; `python/envs/curvios_env.py` darf dafuer weiter die feste `257`er-Indexbreite fuer `shootItemIndex` und `useItem` spiegeln.
- Diese Rohsurface ist nicht die spaetere PPO-Policy-Surface.
- `BT93B` muss deshalb vor jedem `train.py`-/`eval.py`-Scaffold einen `Split-Head` pinnen: Bool-/Intent-Felder getrennt von `shootItemIndex` und `useItem`.
- Eine `Action-Mask` aus `inventoryLength` bleibt optionales Hilfssignal, kein Ersatz fuer den `Split-Head`.
- Sanitizer-Clamping/Neutralisierung aus `BotActionContract.js` bleibt Boundary-Schutz und darf nicht als still akzeptierte Lernsemantik eingeplant werden.

## Layer-sicherer Bauort fuer den PPO-Pfad

Der neue PPO-Pfad wird bewusst **ausserhalb** der produktiven Runtime aufgebaut.

### Erlaubte primaere Bauorte

| Pfad | Rolle |
| --- | --- |
| `python/bridge/**` | Python-Sidecar, Transportadapter, Payload-Validierung |
| `python/envs/**` | Gym-/Env-Adapter |
| `python/scripts/**` | nichtproduktive Train-/Eval-/Bootstrap-Orchestrierung |
| `python/tests/**` | Python- und Contract-Tests |
| `data/training/ppo/**` | Artefakte, Reports, Checkpoints, Kandidaten |
| `scripts/training-headless-bridge-smoke.mjs` | optionaler Boundary-Wrapper ab BT91; nicht Teil des aktiven BT90-Wahrheitsblocks |

### Read-only und ausserhalb des BT100/BT101-Bauorts

| Pfad | Regel |
| --- | --- |
| `src/state/HeadlessMatchKernelRuntime.js` | bestehender Simulationskern, read-only konsumieren |
| `src/core/MatchKernelTrainingAdapter.js` | bestehender Trainingsadapter, read-only konsumieren |
| `src/entities/ai/training/TrainingTransportFacade.js` | einziger Step-/Reset-Ausstiegspunkt, read-only konsumieren |
| `src/entities/ai/training/WebSocketTrainerBridge.js` | bestehender Transportvertrag, read-only konsumieren |
| `src/entities/ai/ObservationBridgePolicy.js` | produktive Runtime-Naht bleibt stabil |
| `src/core/RuntimeConfig.js` | keine produktive PPO-Umschaltung in BT100-BT105 |
| `src/entities/ai/BotPolicyRegistry.js`, `src/entities/ai/BotPolicyTypes.js` | keine neue produktive Policy-Auswahl im Intake-Pfad |
| `src/entities/ai/inference/LocalDqnInference.js` | DQN-Champion bleibt bis spaeterer Sunset-Arbeit unangetastet |
| `src/state/training/RewardCalculator.js`, `src/entities/ai/hybrid/HybridDecisionArchitecture.js` | produktive Reward-/Safety-/Intent-Semantik bleibt authoritative |

## Ist in BT100 klar definiert, wie gestartet wird?

**Nach der aktuellen Nachschaerfung: ja, ausreichend klar.**

BT100 definiert jetzt als Draft-Sammelblock ausdruecklich:

- dass die aktive Landung zuerst nur `BT90 = BT100.1 bis BT100.2` fuer Bootstrap-, Contract-, Bauort- und Drift-Grenzen zieht
- dass `BT91 = BT100.3 bis BT100.5` Sidecar-, Boundary- und 1-Worker-Scope erst als Folgeblock uebernimmt
- dass zuerst reale Payloads und der `v1`-Contract gelesen werden
- dass der Python-Sidecar unter `python/**` entsteht, aber erst ab BT91 closure-relevant wird
- dass ein Boundary-Script nur fuer Sidecar-/Headless-Smokes und nur fuer einen Worker zulaessig ist
- dass der produktive Runtime-/AI-Hub-Pfad read-only bleibt

Wenn BT100 fuer Handshake oder Headless-Pfad doch produktive Runtime-Aenderungen braucht, ist das kein "kleiner Zusatz", sondern ein Governance-Signal:

- dann ist der Zuschnitt des Startblocks falsch
- und es braucht vor der Fortsetzung einen neuen Intake-Entscheid

## Migrationsregel fuer BT102 bis BT105

`BT102` bis `BT105` bleiben absichtlich beweglich, bis BT100/BT101 echte Daten geliefert haben.
Operativ landet `BT102` nach `BTF-06` aber nicht mehr als ein einzelner Claim, sondern als `BT93B` (`102.1` bis `102.3`) und `BT93C` (`102.4` bis `102.6`).

Das heisst:

- Throughput-Ziele duerfen nach BT100 neu kalibriert werden
- Telemetrie-Annahmen duerfen nach BT101 korrigiert werden
- `BT103` darf BT104 nur oeffnen, wenn ein echter Freeze-Kandidat vorliegt
- `BT104` darf BT105 nur bei Urteil `promote` oeffnen
- `BT105` bleibt ohne gruene produktive Validation ein Draft-Handoff, kein Rolloutsignal

## Minimaler Governance-Check vor jeder aktiven Uebernahme

Vor jedem neuen aktiven BT-Block sollte geprueft werden:

1. Ist der naechste Block klein genug oder wird wieder ein Monolith intakt?
2. Liegen die aktiven Phasen nur im Bot-Trainingsplan?
3. Bleibt BT90 Referenz statt Parallel-Master?
4. Ist der neue Scope weiter headless-first und runtime-read-only, solange es noch kein Integrationsblock ist?
5. Ist klar, ob der Block echte Freigabe liefert oder nur neues Draft-Material erzeugt?

## Kurzfassung

Der saubere Weg lautet:

- BT90 als Draft behalten
- lokalen Stand separat sichern
- Repo auf sauberen Remote-Stand bringen
- zuerst nur den kleinsten BT100-Startblock intaken
- danach Sidecar- und 1-Worker-Lane als zweiten kleinen Block ziehen
- danach BT101-Single-Env als dritten kleinen Block ziehen
- den Rest erst nach echter Evidence nachziehen
