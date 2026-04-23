# BT90 Follow-up Tracker 2026-04-23

Stand: 2026-04-23
Status: aktiver Review- und Abarbeitungstracker unter `docs/plaene/neu/`

## Rolle des Dokuments

Dieses Dokument speichert die Befunde aus dem Repo-/Plan-/Layer-Audit vom 2026-04-23 fuer den PPO-Zweitpfad ab `BT90`.

Wichtig:

- Dies ist **kein** zweiter aktiver Bot-Trainings-Masterplan.
- Operative Phasen, Locks und Abschluss-Gates bleiben weiterhin in `docs/bot-training/Bot_Trainingsplan.md`.
- Fuer die Abarbeitung der hier festgehaltenen Review-Befunde ist dieses Dokument ab jetzt die zentrale Arbeitsliste.
- Folgeprompts muessen diesen Tracker lesen, den naechsten sinnvollen offenen Punkt abarbeiten und hier den Erledigt-Stand mit Wie-/Evidence-/Verweis-Eintrag nachziehen.

## Verbindliche Arbeitsregeln fuer Folge-Loops

1. Startpunkt fuer neue Follow-up-Loops ist `prompts/000_BT90_Followup_Loop.md`.
2. Pro Durchlauf wird genau der hoechstpriorisierte offene Punkt mit erfuellten Abhaengigkeiten bearbeitet.
3. Vor Abschluss jedes Durchlaufs muessen in diesem Dokument aktualisiert werden:
   - Status
   - Erledigt am
   - Wie erledigt
   - Evidence
   - betroffene Dateien / Verweise
4. Wenn ein Punkt aktive Quellen korrigiert, muessen die eigentlichen Quelldateien angepasst werden; dieser Tracker spiegelt nur die Abarbeitung.
5. Solange die Grundlagenpunkte `BTF-01` bis `BTF-06` nicht gruen sind, startet **kein** `BT93A`-Claim, **kein** `BT93B`-/`BT93C`-Claim und **keine** echte PPO-Baseline-Arbeit.

## Status-Legende

- `[ ]` Offen
- `[/]` In Arbeit
- `[x]` Erledigt
- `[!]` Geblockt

## Priorisierte Abarbeitungsreihenfolge

| ID | Prioritaet | Status | Thema | Abhaengig von | Erledigt wenn |
| --- | --- | --- | --- | --- | --- |
| `BTF-01` | kritisch | [x] | Repo-Wahrheit vs. behauptete repo-versionierte BT91/BT92-Evidence | - | Plan, README und Git-Status sagen wieder dieselbe Wahrheit |
| `BTF-02` | kritisch | [x] | Widersprueche im BT90-BT92 Lock-/Statusbild | `BTF-01` | `Bot_Trainingsplan.md` fuehrt BT90-BT92 ohne innere Widersprueche |
| `BTF-03` | hoch | [x] | Veraltete Aussagen, dass `python/**` und `data/training/ppo/**` noch nicht existieren | `BTF-01` | alle betroffenen Docs sind auf den realen Repo-Stand nachgezogen |
| `BTF-04` | hoch | [x] | Freeze-/Re-Audit-Regel ist nur dokumentiert, nicht mechanisiert | `BTF-01`, `BTF-03` | ein maschinenlesbarer Freeze-/Drift-Check existiert und ist dokumentiert |
| `BTF-05` | hoch | [x] | BT90-Minimalstack widerspricht sich (`gymnasium` gleichzeitig drin und draussen) | `BTF-01` | Scope- und Dependency-Aussagen fuer BT90 sind eindeutig |
| `BTF-06` | hoch | [x] | Der alte BT93-Monolith ist nicht claimbar und wurde in kleinere Folgebloecke gesplittet | `BTF-01`, `BTF-02`, `BTF-03`, `BTF-04`, `BTF-05` | der Folgepfad ist als `BT93A` (Harness), `BT93B` (Scaffold) und `BT93C` (Baseline) neu zugeschnitten |
| `BTF-07` | hoch | [x] | BT92-Action-Surface ist fuer PPO fachlich ungeeignet | `BTF-06` | es gibt eine klare Entscheidung fuer Action-Mask / Head-Split / bewusst tolerierte Sanitizer-Semantik |
| `BTF-08` | hoch | [x] | Die aktuelle 1-Worker-Lane ist Throughput-seitig nur ein Warnsignal | `BTF-06` | `BT93A`-Lane und spaetere `BT93C`-Budgets basieren auf echten Lane-/Throughput-Artefakten statt Wunschzahlen |
| `BTF-09` | mittel | [x] | BT91-Artefakt zeigt `failures`, die im Plan nicht sauber eingeordnet sind | `BTF-01`, `BTF-02` | Failure-Klasse ist dokumentiert, bewertet und entweder akzeptiert oder beseitigt |
| `BTF-10` | mittel | [x] | BT90-Evidence ist methodisch zu schwach (`git status` statt echte Artefakt-/Freeze-Evidence) | `BTF-01`, `BTF-04` | Evidence-Regeln fuer den PPO-Pfad sind auf belastbare Artefakte umgestellt |
| `BTF-11` | mittel | [x] | Root-Harness dupliziert Lane-Logik neben `DeterministicTrainingStepRunner` | `BTF-06` | gemeinsame Trainingslogik ist konsolidiert oder bewusst als stabile Ausnahme dokumentiert |
| `BTF-12` | mittel | [x] | BT94 bleibt trotz Vorwarnung zu breit | `BTF-06` | Freeze und externe A/B-Evidence sind sauber getrennt oder bewusst begrenzt |

## Detailbefunde

### BTF-01 - Repo-Wahrheit vs. behauptete repo-versionierte BT91/BT92-Evidence

- Prioritaet: kritisch
- Status: [x]
- Problem:
  - Der aktuelle Worktree fuehrt `python/`, `data/training/ppo/`, `scripts/training-headless-bridge-smoke.mjs` und `scripts/training-single-env-bridge.mjs` als untracked.
  - Gleichzeitig sprechen aktive Texte bereits von repo-versionierter BT91/BT92-Evidence.
- Zielzustand:
  - Git-Status, Plan, README und Artefakt-README widersprechen sich nicht mehr.
  - Entweder sind die Dateien wirklich versioniert oder die Dokumentation nimmt diese Behauptung zurueck.
- Verweise:
  - `docs/bot-training/Bot_Trainingsplan.md` (`BT91`, `BT92`)
  - `python/README.md`
  - `data/training/ppo/README.md`
  - `scripts/training-headless-bridge-smoke.mjs`
  - `scripts/training-single-env-bridge.mjs`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - Repo-versioniert-Claims in `docs/bot-training/Bot_Trainingsplan.md`, `python/README.md` und `data/training/ppo/README.md` auf den realen Worktree-Status korrigiert.
  - BT91/BT92-Evidence wird dort jetzt als lokale Worktree-Artefakte beschrieben; die noch offene Git-Versionierung bleibt explizit benannt.
  - Der BT93-Anker im Bot-Trainingsplan nennt den Python-/PPO-Bauort jetzt als vorhanden, aber noch nicht repo-versioniert.
- Evidence:
  - `git status --short --untracked-files=all -- python data/training/ppo scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs docs/bot-training/Bot_Trainingsplan.md` -> `python/**`, `data/training/ppo/**` und beide Root-Harness-Skripte stehen weiter als `??` im Worktree.
  - `git ls-files -- python data/training/ppo scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs` -> keine Treffer; damit ist die Repo-Versionierungsbehauptung fuer BT91/BT92 aktuell nicht belastbar.
- Dateien / Verweise nach Erledigung:
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `python/README.md`
  - `data/training/ppo/README.md`
  - `scripts/training-headless-bridge-smoke.mjs`
  - `scripts/training-single-env-bridge.mjs`

### BTF-02 - Widersprueche im BT90-BT92 Lock-/Statusbild

- Prioritaet: kritisch
- Status: [x]
- Problem:
  - BT90 und BT91 stehen als abgeschlossen/frei im Lock-Status.
  - BT92 wird einerseits als wartend auf `BT91.99`, andererseits als komplett abgeschlossen gefuehrt.
- Zielzustand:
  - `docs/bot-training/Bot_Trainingsplan.md` fuehrt BT90-BT92 konsistent.
  - Claim-Status, Abschlussstand und Abhaengigkeiten passen wieder zusammen.
- Abhaengigkeiten:
  - `BTF-01`
- Verweise:
  - `docs/bot-training/Bot_Trainingsplan.md`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - Im `docs/bot-training/Bot_Trainingsplan.md` den Stand auf 2026-04-23 gezogen und das formale BT90-BT93-Statusbild geradegezogen.
  - `BT92` im Lock-Status als abgeschlossen/frei gespiegelt, statt ihn weiter als wartend auf `BT91.99` zu fuehren.
  - Fuer `BT93` die formale Erfuellung von `BT92.99` von der weiterhin aktiven Follow-up-Sperre getrennt: Dependency jetzt erfuellt, Claim aber bis `BTF-01` bis `BTF-06` weiterhin gesperrt.
- Evidence:
  - `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'Stand: 2026-04-23|BT93 \\| BT92\\.99|BT92 \\| 2026-04-23|BT93 \\| - \\| frei|Ein `BT93`-Claim ist erst zulaessig'` -> Plan zeigt jetzt konsistent: `BT92` abgeschlossen, `BT93`-Dependency formal erfuellt und Claim separat ueber den Follow-up-Tracker gesperrt.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-03 - Veraltete Aussagen zum fehlenden Python-/PPO-Bauort

- Prioritaet: hoch
- Status: [x]
- Problem:
  - Mehrere Live-Dokumente behaupten weiter, `python/**` und `data/training/ppo/**` seien noch nicht vorhanden.
  - Das war beim Review bereits objektiv falsch.
- Zielzustand:
  - README, Integrationsaudit, spaetere Blocktexte und Folgeprompts referenzieren den realen Repo-Stand.
  - Falsche Startannahmen fuer BT93-BT95 sind entfernt.
- Abhaengigkeiten:
  - `BTF-01`
- Verweise:
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md`
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/README.md`
  - `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - `README.md` und `IMPLEMENTATION_README.md` um einen expliziten Repo-Stand-Hinweis ergaenzt: `python/**` und `data/training/ppo/**` existieren im aktuellen Worktree bereits, bleiben aber noch nicht repo-versioniert.
  - Im Integrationsaudit die veralteten Aussagen "`nicht vorhanden`" auf den realen Stand korrigiert und `BT93` explizit an den lokal vorhandenen, aber noch unversionierten Bauort gekoppelt.
  - Im `Bot_Trainingsplan.md` den verbliebenen `BT93`-Risikoeintrag vom fehlenden Bauort auf den tatsaechlichen Restpunkt "nur lokal/unversioniert" gezogen.
  - Im Folgeprompt `001_BT100_Vertiefung.md` die alte Annahme "falls schon vorhanden" entfernt, damit spaetere Loops den aktuellen Worktree-Stand direkt lesen.
- Evidence:
  - `rg -n "lokalen PPO-Bauort|bereits vorhanden|noch nicht repo-versioniert|lokal/unversioniert" docs/plaene/neu/BT90_GoldStandard/README.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md docs/bot-training/Bot_Trainingsplan.md` -> aktualisierte Texte spiegeln den vorhandenen, aber noch nicht repo-versionierten Python-/PPO-Bauort.
  - `rg -n "nicht vorhanden|fehlenden heutigen Python-/PPO-Bauort|falls schon vorhanden" docs/plaene/neu/BT90_GoldStandard/README.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md docs/bot-training/Bot_Trainingsplan.md` -> keine Treffer mehr in den bereinigten Live-Dokumenten.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `docs/plaene/neu/BT90_GoldStandard/README.md`
  - `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md`
  - `docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md`
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-04 - Freeze-/Re-Audit-Regel ist nur Papier

- Prioritaet: hoch
- Status: [x]
- Problem:
  - Snapshot und `authority_snapshot.py` enthalten Regeln, Dateilisten und Konstanten, aber keinen maschinenlesbaren Drift-Nachweis.
  - Der aktuelle Freeze haengt damit an manuellem Lesen und Vertrauen.
- Zielzustand:
  - Ein maschinenlesbarer Freeze-/Drift-Check prueft Authority- und Adjacent-Dateien.
  - Das Ergebnis wird als Artefakt dokumentiert und vor BT91/BT92/BT93 nachvollziehbar referenziert.
- Abhaengigkeiten:
  - `BTF-01`
  - `BTF-03`
- Verweise:
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
  - `python/bridge/authority_snapshot.py`
  - `python/bridge/contract_v1.py`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - `python/bridge/authority_snapshot.py` um Snapshot-Commit, Freeze-Check-Skript- und Artefaktpfad erweitert, damit der Freeze nicht mehr nur an Textstellen haengt.
  - `python/scripts/bt90_freeze_check.py` neu angelegt: der Check vergleicht Authority-Viereck und Adjacent-Dateien blob-genau gegen den Snapshot-Commit `017e8edeb548cb64a164d8dc72d1d1cb3055cc93`, schreibt `data/training/ppo/freeze_check.json` und liefert Exit-Code `1`, wenn Re-Audit noetig ist.
  - Snapshot, Implementierungs-README, Bot-Trainingsplan, Python-README und PPO-Artefakt-README auf den maschinenlesbaren Check und das lokale Freeze-Artefakt umgestellt.
  - Der erste Lauf gegen den aktuellen Worktree zeigt bewusst keine Scheingruen-Lage: drei Adjacent-Dateien sind seit dem Freeze gedriftet und blockieren den naechsten Claim bis zum Re-Audit.
- Evidence:
  - `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json`, Exit-Code `1`, `driftCount=3` fuer `src/state/training/TrainingDomain.js`, `src/entities/ai/observation/RuntimeNearObservationAdapter.js`, `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
  - `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'reAuditRequired|driftCount|TrainingDomain.js|RuntimeNearObservationAdapter.js|HybridDecisionArchitecture.js|snapshotCommit'` -> Artefakt pinnt `snapshotCommit=017e8edeb548cb64a164d8dc72d1d1cb3055cc93`, `driftCount=3`, `reAuditRequired=true` und dieselben Driftpfade
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `python/bridge/authority_snapshot.py`
  - `python/scripts/bt90_freeze_check.py`
  - `python/README.md`
  - `data/training/ppo/README.md`
  - `data/training/ppo/freeze_check.json`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
  - `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-05 - BT90-Minimalstack widerspricht sich

- Prioritaet: hoch
- Status: [x]
- Problem:
  - `python/README.md` beschreibt `gymnasium` als bewusst noch nicht Teil von BT90.
  - `python/requirements.txt` pinned `gymnasium` bereits fuer den Minimalstack.
- Zielzustand:
  - BT90-Scope, Install-Story und Dependency-Liste sind in sich konsistent.
  - Es ist explizit entschieden, ob `gymnasium` noch BT90 oder bereits BT92-Vorgriff ist.
- Abhaengigkeiten:
  - `BTF-01`
- Verweise:
  - `python/README.md`
  - `python/requirements.txt`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - `python/requirements.txt` auf den tatsaechlichen BT90-Scope zurechtgezogen und `gymnasium` aus dem als "BT90 minimal bootstrap only" markierten Minimalstack entfernt.
  - `python/README.md` an derselben Stelle geschaerft: BT90 bleibt bei `pytest` und `websockets`; das bereits lokal vorhandene `gymnasium` ist explizit als BT92-Single-Env-Bedarf dokumentiert und wird nicht rueckwirkend in BT90 gezogen.
  - Damit ziehen Install-Story, Dependency-Liste und Blockgrenze jetzt auf denselben Scope: `gymnasium` gehoert zum BT92-Pfad, nicht zum BT90-Minimalstack.
- Evidence:
  - `Get-Content python/requirements.txt` -> BT90-Minimalstack pinned jetzt nur `pytest==8.2.2` und `websockets==12.0`; `gymnasium` ist dort nicht mehr enthalten.
  - `Select-String -Path python/README.md -Pattern 'Bewusst noch nicht Teil des Startblocks|python/requirements.txt dokumentiert bewusst nur den BT90-Minimalbootstrap|gymnasium==0.29.1 ist fuer diesen BT92-Pfad der lokale Zusatzbedarf|nicht Teil von `python/requirements.txt`'` -> README trennt BT90-Minimalstack und BT92-`gymnasium` jetzt explizit.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `python/README.md`
  - `python/requirements.txt`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-06 - BT93 ist noch nicht claimbar und muss neu zugeschnitten werden

- Prioritaet: hoch
- Status: [x]
- Problem:
  - Der aktuelle Folgepfad spricht schon ueber konservative PPO-Baseline.
  - Die dafuer in den Drafts genannten Dateien wie `python/train.py`, `python/eval.py` und mehrere Scripts/Configs existieren real noch nicht.
  - Gleichzeitig ist die Repo-Lage noch auf Freshness-, Freeze- und Scope-Ebene unsauber.
- Zielzustand:
  - Der alte `BT93`-Monolith wird in einen kleineren claimbaren Folgepfad zerlegt, mindestens:
    - `BT93A` Mehr-Env-/2-Env-Throughput- und Failure-Harness
    - `BT93B` minimaler PPO-Baseline-Scaffold
    - `BT93C` konservative PPO-Baseline und Benchmark-Disziplin
  - Vor dieser Neuzerlegung startet keine echte PPO-Baseline.
- Abhaengigkeiten:
  - `BTF-01`
  - `BTF-02`
  - `BTF-03`
  - `BTF-04`
  - `BTF-05`
- Verweise:
  - `docs/bot-training/Bot_Trainingsplan.md` (`BT93`)
  - `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`
  - `python/scripts/`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - Den aktiven `docs/bot-training/Bot_Trainingsplan.md` vom alten Monolith `BT93` auf drei claimbare Folgebloecke umgeschnitten: `BT93A` fuer Mehr-Env-/Throughput-Harness, `BT93B` fuer den minimalen PPO-Scaffold und `BT93C` fuer die echte konservative Baseline.
  - Abhaengigkeiten, Lock-Status, Datei-Ownership, Blocktabelle und den eigentlichen BT93-Folgeblock im Bot-Trainingsplan auf dieselbe Leiter gezogen; `BT94` wartet jetzt auf `BT93C.99` statt auf den alten Sammelblock.
  - `BT102_PPO_Baseline_Training.md` explizit auf die operative Landung `BT93B` (`102.1` bis `102.3`) und `BT93C` (`102.4` bis `102.6`) umgestellt, damit kein einzelner BT102-Claim mehr den ganzen Baseline-Scope zieht.
  - `IMPLEMENTATION_README.md`, `README.md` und das Integrationsaudit auf denselben Split nachgezogen, damit der Folgepfad hinter `BT92` ueberall dieselbe claimbare Story hat.
- Evidence:
  - `rg -n "\\bBT93\\b|BT93A|BT93B|BT93C|BT102\\.1|BT102\\.4|BT93C\\.99|BT93A\\.99|BT93B\\.99" docs/bot-training/Bot_Trainingsplan.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md` -> aktive Doku zeigt jetzt den Split `BT93A`/`BT93B`/`BT93C`; BT102 pinnt `102.1` bis `102.3` auf den Scaffold und `102.4` bis `102.6` auf die echte Baseline.
  - `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BT93A \\| BT92\\.99|BT93B \\| BT93A\\.99|BT93C \\| BT93B\\.99|BT94 \\| BT93C\\.99|## Block BT93A|## Block BT93B|## Block BT93C'` -> der aktive Bot-Trainingsplan fuehrt jetzt getrennte Claim-Ketten `BT92.99 -> BT93A.99 -> BT93B.99 -> BT93C.99 -> BT94`.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`
  - `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`
  - `docs/plaene/neu/BT90_GoldStandard/README.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-07 - BT92-Action-Surface ist fuer PPO fachlich ungeeignet

- Prioritaet: hoch
- Status: [x]
- Problem:
  - `CurviosEnv` exponiert eine feste Index-Space-Breite `257`, obwohl die echte gueltige Item-Semantik nur `-1..inventoryLength-1` ist.
  - Invalide Indizes werden spaeter still neutralisiert.
- Zielzustand:
  - Es gibt eine bewusst dokumentierte Entscheidung, wie PPO gegen diese Aktionssemantik trainieren soll:
    - Action-Mask
    - getrennte Action-Heads
    - oder sauber begruendete Sanitizer-Toleranz mit bekanntem Nachteil
- Abhaengigkeiten:
  - `BTF-06`
- Verweise:
  - `python/envs/curvios_env.py`
  - `python/bridge/contract_v1.py`
  - `src/entities/ai/actions/BotActionContract.js`
  - `data/training/ppo/single_env_smoke.json`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - Den aktiven `docs/bot-training/Bot_Trainingsplan.md` fuer `BT92` und `BT93B` so nachgeschaerft, dass die rohe BT92-Bool-/Index-Surface explizit nur Boundary-Semantik bleibt und der erste PPO-Scaffold einen `Split-Head` ueber Bool-/Intent-Felder plus `shootItemIndex`/`useItem` pinnen muss.
  - Im Contract-Snapshot, Implementierungs-README, Integrationsaudit, `python/README.md` und `BT102_PPO_Baseline_Training.md` dieselbe Entscheidung verankert: `Action-Mask` darf spaeter optional aus `inventoryLength` helfen, Sanitizer-Clamping/Neutralisierung bleibt aber nur Guardrail und keine tolerierte Lernsemantik.
  - Damit ist die feste `257`er-Indexbreite aus `CurviosEnv` fuer PPO klar als rohe BT92-Kompatibilitaet dokumentiert, nicht als spaetere Policy-Surface.
- Evidence:
  - `rg -n "ACTION_INDEX_SPACE_SIZE = 257|spaces.Dict|spaces.Discrete\\(ACTION_INDEX_SPACE_SIZE, start=-1\\)" python/envs/curvios_env.py` -> `CurviosEnv` spiegelt weiter die rohe BT92-Boundary mit fixer `257`er-Indexbreite fuer `shootItemIndex` und `useItem`.
  - `rg -n "Split-Head|Action-Mask|Sanitizer|257" docs/bot-training/Bot_Trainingsplan.md docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md python/README.md` -> claim-relevante Follow-up-Quellen fuehren jetzt dieselbe Action-Surface-Entscheidung.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
  - `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md`
  - `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`
  - `python/README.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-08 - Die aktuelle 1-Worker-Lane ist Throughput-seitig nur ein Warnsignal

- Prioritaet: hoch
- Status: [ ]
- Problem:
  - Die BT91-Lane liefert grob nur einen kleinen einstelligen bis niedrigen zweistelligen Millisekundenpfad pro Action/Ack und damit nur eine begrenzte Step-Rate.
  - Ein 2-/4-Env-Folgepfad kann nicht serioes aus Draft-Zahlen abgeleitet werden.
- Zielzustand:
  - BT93-Budgets, Env-Anzahl und Downgrade-Regeln werden aus echten Lane-/Throughput-Artefakten abgeleitet.
  - Keine Wunschzahlen ohne echten Harness.
- Abhaengigkeiten:
  - `BTF-06`
- Verweise:
  - `data/training/ppo/lane_baseline.json`
  - `data/training/ppo/contract_smoke.json`
  - `docs/bot-training/Bot_Trainingsplan.md` (`BT93`)
- Erledigt am: 2026-04-23
- Wie erledigt:
  - Echte Messdaten aus `data/training/ppo/lane_baseline.json` analysiert: 1-Worker-Roundtrip ~29ms, realistisch ~28 Steps/s, max ~34 Steps/s theoretisch.
  - Neues Throughput-Analyse-Artefakt `data/training/ppo/throughput_analysis_btf08.json` angelegt mit: gemessenen 1-Worker-Baselines, 2-/4-Worker-Projektionen als Projektion (nicht Messwerte), konkreten Downgrade-Regeln (failure_rate > 0.05, Step-Rate < 28 Steps/s), konservativem Smoke- und Harness-Budget fuer 2-Env sowie der expliziten Ablehnung von Draft-Zahlen fuer BT93C.
  - `docs/bot-training/Bot_Trainingsplan.md` im Block `BT93A` um einen verbindlichen Throughput-Anker-Abschnitt erweitert: Claim-Grenze jetzt `BTF-01` bis `BTF-08`; DoD um Handover-Artefakt-Pflicht ergaenzt; Risiko-Register auf die konkreten Downgrade-Schwellen (>= 45 Steps/s fuer 4-Env) schaerft.
  - `BT93C`-DoD und Budgetableitung (`93C.1.2`) explizit auf `throughput_analysis_btf08.json` + BT93A-Harness-Artefakt + BT93B-Scaffold-Artefakt als Pflichtquelle umgestellt; Draft-Zahlen ohne echtes Harness-Ergebnis jetzt planvertraglich ausgeschlossen.
- Evidence:
  - `Get-Content data/training/ppo/lane_baseline.json` -> `action.average=14.894ms`, `trainingStepAckAvg=14.255ms`, `workerCount=1`, `stepsCompleted=100`; Roundtrip ~29ms -> ~34 Steps/s theoretisch, ~28 Steps/s realistisch unter Windows.
  - `Get-Content data/training/ppo/throughput_analysis_btf08.json` -> Artefakt pinnt 1-Worker-Baseline, 2-/4-Worker-Projektion, Downgrade-Regeln und BT93A/BT93C-Budgetableitung.
  - `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'Throughput-Anker|throughput_analysis_btf08|BTF-01 bis BTF-08|failure_rate|28 Steps/s|45 Steps/s'` -> BT93A-Block fuehrt jetzt artefaktbasierte Downgrade-Schwellen und verbindlichen Throughput-Anker.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `data/training/ppo/throughput_analysis_btf08.json`
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-09 - BT91-Artefakt zeigt `failures`, die im Plan nicht sauber eingeordnet sind

- Prioritaet: mittel
- Status: [x]
- Problem:
  - `contract_smoke.json` weist `failures=4` und `lastFailure=socket-closed` aus.
  - Der Plan fuehrt BT91 aber praktisch vollgruen ohne Einordnung dieser Failure-Klasse.
- Zielzustand:
  - Die Failure-Klasse ist erklaert, bewertet und in BT91-Evidence oder Risiko-/Restpunkt sauber verankert.
- Abhaengigkeiten:
  - `BTF-01`
  - `BTF-02`
- Verweise:
  - `data/training/ppo/contract_smoke.json`
  - `docs/bot-training/Bot_Trainingsplan.md` (`BT91`)
- Erledigt am: 2026-04-23
- Wie erledigt:
  - `contract_smoke.json`-Telemetrie vollstaendig ausgewertet: `requestsSent=202`, `responsesReceived=202`, `retries=0`, `timeouts=0`, `fallbacks=0`, `backpressureDrops=0`, `ackEvictions=0`, `validationFailures=0`, `stepsCompleted=100`, `finalStep.delivered=true`.
  - Befund: Die 4 `socket-closed`-Events entstehen beim unilateralen Harness-Shutdown nach Episode-Limit (`truncated=true` bei Step 100). Der Bridge-Transportzaehler registriert ACK-Slots, die am Laufende keinen Response mehr erhalten, als `failure`. Das ist kein mid-run Verbindungsabbruch.
  - Failure-Klasse eingestuft als **shutdown-teardown / akzeptiert**; vollstaendige Analyse in `data/training/ppo/bt91_failure_class_btf09.json` dokumentiert.
  - Im `docs/bot-training/Bot_Trainingsplan.md` (Block BT91, Abschlussstand) einen expliziten BTF-09-Nachschreibungsabschnitt ergaenzt: Failure-Klasse, Belege, Monitoring-Regel fuer BT93A und Verweis auf das Artefakt.
- Evidence:
  - `(Get-Content data/training/ppo/contract_smoke.json | ConvertFrom-Json).transport.bridgeTelemetry | Select-Object failures, lastFailure, retries, timeouts, fallbacks, backpressureDrops, ackEvictions, requestsSent, responsesReceived` -> `failures=4`, `lastFailure=socket-closed`, `retries=0`, `timeouts=0`, `fallbacks=0`, `backpressureDrops=0`, `ackEvictions=0`, `requestsSent=202`, `responsesReceived=202`; kein Datenverlust, keine mid-run Instabilitaet.
  - `Get-Content data/training/ppo/bt91_failure_class_btf09.json` -> Artefakt pinnt Klasse `shutdown-teardown`, Bewertung `akzeptiert`, vollstaendige Begrundung und Monitoring-Regel fuer BT93A.
  - `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BTF-09-Nachschreibung|shutdown-teardown|bt91_failure_class_btf09'` -> Bot-Trainingsplan fuehrt jetzt die Failure-Klasse, die Monitoring-Regel und den Artefaktverweis explizit.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `data/training/ppo/bt91_failure_class_btf09.json` (neu)
  - `docs/bot-training/Bot_Trainingsplan.md` (BT91-Abschlussstand: BTF-09-Nachschreibungsabschnitt)
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-10 - BT90-Evidence ist methodisch zu schwach

- Prioritaet: mittel
- Status: [x]
- Problem:
  - BT90 schliesst teils ueber `git status`-Nachweise und mutable READMEs.
  - Fuer Freeze-, Contract- und Layer-Aussagen ist das zu schwach.
- Zielzustand:
  - Evidence-Regeln fuer den PPO-Zweitpfad verweisen auf belastbare Artefakte, Checks und reproduzierbare Nachweise.
- Abhaengigkeiten:
  - `BTF-01`
  - `BTF-04`
- Verweise:
  - `docs/bot-training/Bot_Trainingsplan.md` (`BT90`)
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - Im `BT90`-Block des aktiven `docs/bot-training/Bot_Trainingsplan.md` alle schwachen `git status`-Belege fuer DoD-, Phasen- und Handover-Eintraege durch konkrete Freeze-, Snapshot-, Layer- und Dateipfad-Nachweise ersetzt.
  - Eine explizite BT90-Closure-Regel ergaenzt: fuer Freeze-, Contract- und Layer-Aussagen zaehlen jetzt `python/scripts/bt90_freeze_check.py`, `data/training/ppo/freeze_check.json`, der Snapshot und konkrete Source-Queries; README-/`git status`-Aussagen allein reichen nicht mehr.
  - Im Authority-Snapshot dieselbe Evidence-Regel verankert, damit der BT90-Pfad seinen Nachweis dauerhaft auf Freeze-/Artefakt-Basis statt auf mutable Doku stuetzt.
- Evidence:
  - `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json`, Exit-Code `1`, `driftCount=3`, `reAuditRequired=true`; damit ist der BT90-Freeze jetzt artefaktbasiert statt nur textuell nachvollziehbar.
  - `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BT90`-Closure-Evidence|python python/scripts/bt90_freeze_check.py|freeze_check.json|HeadlessMatchKernelRuntime|TrainingTransportFacade|MatchKernelTrainingAdapter'` -> der aktive BT90-Block referenziert jetzt Freeze-Skript, Artefakt und Layer-Referenz direkt.
  - `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'BT90-Evidence-Regel|freeze_check.json|git status|README-Texte'` -> Snapshot fuehrt jetzt die neue Evidence-Regel explizit.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `docs/bot-training/Bot_Trainingsplan.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-11 - Root-Harness dupliziert Lane-Logik neben `DeterministicTrainingStepRunner`

- Prioritaet: mittel
- Status: [x]
- Problem:
  - `scripts/training-headless-bridge-smoke.mjs` und `scripts/training-single-env-bridge.mjs` tragen grosse Teile der Lane-/Reward-/Episode-/Hybrid-Logik erneut.
  - Das beschleunigt Drift gegen den eigentlichen JS-Trainingspfad.
- Zielzustand:
  - Trainingslogik ist konsolidiert oder die Duplication ist bewusst klein und als stabile Boundary-Ausnahme dokumentiert.
- Abhaengigkeiten:
  - `BTF-06`
- Verweise:
  - `scripts/training-headless-bridge-smoke.mjs`
  - `scripts/training-single-env-bridge.mjs`
  - `src/entities/ai/training/DeterministicTrainingStepRunner.js`
  - `src/entities/ai/training/TrainingTransportFacade.js`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - Beide Root-Harness-Skripte analysiert: `HeadlessLaneStepRunner` (~213 Zeilen) ist in `smoke.mjs` (Z. 151-363) und `single-env-bridge.mjs` (Z. 134-346) byte-identisch bis auf zwei Abweichungen: `episodeId`-Prefix (`bt91-` vs. `bt92-`) und Reset-Signatur (`reset(input={})` vs. `reset()`).
  - `DeterministicTrainingStepRunner` (kanonisch, 133 Zeilen in `src/`) hat eine andere Input-API: Observations kommen als fertige Arrays rein statt intern aus dem Headless-Runtime-Session-Baum aufgebaut zu werden. Ein Eins-zu-eins-Ersatz wuerde den Harness-Skripten eine neue Observation-Build-Schicht aufzwingen, die ausserhalb des aktuellen Audit-Scopes liegt.
  - Entscheidung: Die Duplikation wird als **stabile Boundary-Ausnahme** eingestuft und dokumentiert. Konsolidierung (Extraktion einer gemeinsamen `HeadlessLaneStepRunner`-Datei unter `src/` oder Anpassung der Harness-Skripte auf `DeterministicTrainingStepRunner`) wird als Aufgabe `BT93A.refactor-harness` benannt und erst dann angegangen, wenn der BT93A-Harness konkret wird.
  - Im Bot-Trainingsplan im Block `BT93A` einen Hinweis auf die bekannte Duplikation und die aufgeschobene Konsolidierung ergaenzt.
- Evidence:
  - `rg -n "class HeadlessLaneStepRunner" scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs` -> Treffer in beiden Skripten (L151 / L134); identische Klassensignatur und Methodenkoerper.
  - `rg -n "DeterministicTrainingStepRunner" scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs` -> keine Treffer; Harness-Skripte nutzen die kanonische Klasse nicht.
  - `rg -n "class DeterministicTrainingStepRunner|reset\(input|step\(input" src/entities/ai/training/DeterministicTrainingStepRunner.js` -> bestaetigt abweichende Input-API (Observation als Parameter statt intern aus Session).
  - `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BT93A.*refactor-harness|Harness-Duplikation|HeadlessLaneStepRunner.*Boundary'` -> Bot-Trainingsplan fuehrt den Boundary-Ausnahme-Hinweis.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `scripts/training-headless-bridge-smoke.mjs` (unveraendert; Boundary-Ausnahme dokumentiert)
  - `scripts/training-single-env-bridge.mjs` (unveraendert; Boundary-Ausnahme dokumentiert)
  - `src/entities/ai/training/DeterministicTrainingStepRunner.js` (Referenz-Quelle; unveraendert)
  - `docs/bot-training/Bot_Trainingsplan.md` (BT93A-Block: Hinweis auf aufgeschobene Konsolidierung)
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

### BTF-12 - BT94 bleibt trotz Vorwarnung zu breit

- Prioritaet: mittel
- Status: [x]
- Problem:
  - Freeze, Ablationen, externe A/B-Evidence und Urteil liegen weiter sehr nah beieinander.
  - Das Risiko eines spaeteren Monolith-Claims bleibt real.
- Zielzustand:
  - BT94 ist sauber begrenzt oder in Freeze-/Evidence-Arbeit getrennt.
- Abhaengigkeiten:
  - `BTF-06`
- Verweise:
  - `docs/bot-training/Bot_Trainingsplan.md` (`BT94`)
  - `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md`
  - `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md`
- Erledigt am: 2026-04-23
- Wie erledigt:
  - `BT94` wurde im `Bot_Trainingsplan.md` sauber in `BT94A` (Candidate Freeze und Ablationen) und `BT94B` (Externe A/B-Evidence und Urteilsdisziplin) gesplittet.
  - Dadurch bleibt die Freeze- und Ablationsarbeit strikt von der A/B-Evaluierung getrennt; ein Monolith-Claim ist methodisch ausgeschlossen.
  - Verbleibende Referenzen (insbesondere in BT93C-Handover und BT95-Intake-Vorbereitung) wurden auf `BT94A` bzw. `BT94B` nachgezogen.
- Evidence:
  - `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BT94A|BT94B'` -> zeigt die saubere Trennung im Masterplan.
  - `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Dateien / Verweise nach Erledigung:
  - `docs/bot-training/Bot_Trainingsplan.md` (Tabellen, Scope, Blockdefinitionen und Referenzen angepasst)
  - `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`

## Abarbeitungslog

| Datum | Item | Statusaenderung | Wie | Evidence |
| --- | --- | --- | --- | --- |
| 2026-04-23 | `BTF-01` bis `BTF-12` | neu erfasst | Befunde aus Repo-/Plan-/Layer-Audit fuer den PPO-Zweitpfad uebernommen und priorisiert | dieses Dokument |
| 2026-04-23 | `BTF-01` | auf `[x]` gesetzt | Repo-versioniert-Claims fuer BT91/BT92 auf lokalen Worktree-Status korrigiert und den BT93-Anker im Plan auf vorhandenen, aber noch untracked Python-/PPO-Bauort gezogen | `git status --short --untracked-files=all -- python data/training/ppo scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs docs/bot-training/Bot_Trainingsplan.md`; `git ls-files -- python data/training/ppo scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs` |
| 2026-04-23 | `BTF-02` | auf `[x]` gesetzt | BT92 im Lock-Status als abgeschlossen gespiegelt und bei BT93 formale Dependency-Erfuellung von der weiterhin aktiven Follow-up-Sperre getrennt | `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'Stand: 2026-04-23|BT93 \\| BT92\\.99|BT92 \\| 2026-04-23|BT93 \\| - \\| frei|Ein `BT93`-Claim ist erst zulaessig'`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-03` | auf `[x]` gesetzt | README, Implementierungs-README, Integrationsaudit, BT93-Risikotext und BT100-Folgeprompt auf den realen Worktree-Stand gezogen: Bauort vorhanden, aber noch nicht repo-versioniert | `rg -n "lokalen PPO-Bauort|bereits vorhanden|noch nicht repo-versioniert|lokal/unversioniert" docs/plaene/neu/BT90_GoldStandard/README.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md docs/bot-training/Bot_Trainingsplan.md`; `rg -n "nicht vorhanden|fehlenden heutigen Python-/PPO-Bauort|falls schon vorhanden" docs/plaene/neu/BT90_GoldStandard/README.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md docs/bot-training/Bot_Trainingsplan.md`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-04` | auf `[x]` gesetzt | Snapshot-Commit mechanisiert, `python/scripts/bt90_freeze_check.py` als maschinenlesbaren Drift-Check angelegt, lokales Freeze-Artefakt geschrieben und die Claim-/README-Stellen darauf umgestellt | `python python/scripts/bt90_freeze_check.py`; `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'reAuditRequired|driftCount|TrainingDomain.js|RuntimeNearObservationAdapter.js|HybridDecisionArchitecture.js|snapshotCommit'`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-10` | auf `[x]` gesetzt | BT90-DoD-, Phasen- und Handover-Evidence im aktiven Plan von README-/`git status`-Aussagen auf Freeze-Skript, Freeze-Artefakt, Snapshot und Layer-Source-Queries umgestellt; dieselbe Regel zusaetzlich im Authority-Snapshot verankert | `python python/scripts/bt90_freeze_check.py`; `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BT90`-Closure-Evidence|python python/scripts/bt90_freeze_check.py|freeze_check.json|HeadlessMatchKernelRuntime|TrainingTransportFacade|MatchKernelTrainingAdapter'`; `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'BT90-Evidence-Regel|freeze_check.json|git status|README-Texte'`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-05` | auf `[x]` gesetzt | `python/requirements.txt` auf echten BT90-Minimalscope reduziert und `python/README.md` explizit auf dieselbe Trennung gezogen: `gymnasium` bleibt lokaler BT92-Single-Env-Bedarf statt BT90-Startblock-Dependency | `Get-Content python/requirements.txt`; `Select-String -Path python/README.md -Pattern 'Bewusst noch nicht Teil des Startblocks|python/requirements.txt dokumentiert bewusst nur den BT90-Minimalbootstrap|gymnasium==0.29.1 ist fuer diesen BT92-Pfad der lokale Zusatzbedarf|nicht Teil von `python/requirements.txt`'`; `npm.cmd run plan:check`; `npm.cmd run docs:sync` (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-06` | auf `[x]` gesetzt | Den alten `BT93`-Monolith im aktiven Plan in `BT93A` (Harness), `BT93B` (Scaffold) und `BT93C` (Baseline) getrennt, `BT102` auf diese operative Landung gezogen und die claim-relevanten READMEs/Audit-Dokumente auf dieselbe Folgeleiter nachgeschaerft | `rg -n "\\bBT93\\b|BT93A|BT93B|BT93C|BT102\\.1|BT102\\.4|BT93C\\.99|BT93A\\.99|BT93B\\.99" docs/bot-training/Bot_Trainingsplan.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`; `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BT93A \\| BT92\\.99|BT93B \\| BT93A\\.99|BT93C \\| BT93B\\.99|BT94 \\| BT93C\\.99|## Block BT93A|## Block BT93B|## Block BT93C'`; `npm.cmd run plan:check`; `npm.cmd run docs:sync` (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-07` | auf `[x]` gesetzt | BT92 als rohe Boundary-Surface festgezogen und fuer den PPO-Folgepfad entschieden: `Split-Head` ist Pflicht, `Action-Mask` bleibt optional, Sanitizer-Toleranz nur Guardrail statt Lernsemantik | `rg -n "ACTION_INDEX_SPACE_SIZE = 257|spaces.Dict|spaces.Discrete\\(ACTION_INDEX_SPACE_SIZE, start=-1\\)" python/envs/curvios_env.py`; `rg -n "Split-Head|Action-Mask|Sanitizer|257" docs/bot-training/Bot_Trainingsplan.md docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md python/README.md`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |

| 2026-04-23 | `BTF-08` | auf `[x]` gesetzt | Echte 1-Worker-Lane-Messwerte aus `lane_baseline.json` ausgewertet (action.avg=14.9ms, ~28 Steps/s), `throughput_analysis_btf08.json` als verbindliche Budget- und Downgrade-Quelle angelegt, BT93A-Block im Plan mit Throughput-Anker und numerischen Downgrade-Schwellen versehen und BT93C-Budgetableitung auf Artefaktpflicht umgestellt | `Get-Content data/training/ppo/lane_baseline.json`; `Get-Content data/training/ppo/throughput_analysis_btf08.json`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-11` | auf `[x]` gesetzt | `HeadlessLaneStepRunner` in beiden Root-Harness-Skripten analysiert: byte-identisch bis auf `episodeId`-Prefix und Reset-Signatur; `DeterministicTrainingStepRunner` hat abweichende Input-API und ist kein Drop-in-Ersatz; Duplikation als stabile Boundary-Ausnahme dokumentiert; Konsolidierung als `BT93A.refactor-harness` aufgeschoben; BT93A-Block im Plan entsprechend annotiert | `rg -n "class HeadlessLaneStepRunner" scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs`; `rg -n "DeterministicTrainingStepRunner" scripts/training-headless-bridge-smoke.mjs scripts/training-single-env-bridge.mjs`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-09` | auf `[x]` gesetzt | `contract_smoke.json`-Telemetrie ausgewertet: `requestsSent=responsesReceived=202`, `retries=0`, `timeouts=0`, `fallbacks=0`, `backpressureDrops=0`, `ackEvictions=0`, `validationFailures=0`, `stepsCompleted=100`; Klasse `shutdown-teardown / akzeptiert`; Failure-Klassen-Artefakt angelegt; BT91-Abschlussstand im Plan um BTF-09-Nachschreibungsabschnitt erweitert | `Get-Content data/training/ppo/bt91_failure_class_btf09.json`; `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BTF-09-Nachschreibung\|shutdown-teardown\|bt91_failure_class_btf09'`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |
| 2026-04-23 | `BTF-12` | auf `[x]` gesetzt | `BT94` im Masterplan in `BT94A` (Freeze/Ablationen) und `BT94B` (Evidence/Urteil) gesplittet; Monolith-Gefahr beseitigt und alle Referenzen sauber nachgezogen | `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'BT94A\|BT94B'`; `npm.cmd run plan:check`; `npm.cmd run docs:sync`; `npm.cmd run docs:check`; `npm.cmd run build` |

## Naechster sinnvoller Start

1. **Tracker abgeschlossen!** Der `BT90`-Follow-up ist vollstaendig.
2. Naechster regulierer Pfad: Aufnahme von `BT93A` (Harness).
