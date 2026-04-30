# BT93Y PPO Lineage-Recovery/Retraining und Ersatzvergleich Intake

Datum: 2026-04-30

Status: kritisiert, gehaertet und zur Aufnahme in
`docs/bot-training/Bot_Trainingsplan.md` freigegeben. Die user-owned
Entscheidungen sind in diesem Entwurf festgehalten; der aktive Master muss die
Blockierung von `BT93S/O/X/P/94A` explizit nachziehen.

Ziel-Masterplan: `docs/bot-training/Bot_Trainingsplan.md`

## Harte Kritik und eingebaute Korrekturen

Der urspruengliche Draft war fachlich richtig, aber an den kritischen Kanten
noch zu freundlich:

- `BT93Y.99=bt93r-reentry-ready` war als Kurzform zu ungenau. Gruen darf nur
  ueber `bt93rReentryAllowed=true` plus eine der beiden expliziten
  Resultklassen `exact-lineage-restored-bt93r-reentry-ready` oder
  `retrain-lineage-ready-bt93r-reentry-ready` entstehen.
- Der Text sprach von "erneutem BT93R", ohne klar zu sagen, dass der alte
  abgeschlossene rote `BT93R` nicht nachtraeglich gesundgeschrieben wird. Der
  Folgepfad ist ein neuer Reentry-Probe-/Root-Cause-/Counterprobe-Claim mit
  frischer Evidence, kein Editieren alter Closure-Wahrheit.
- Die externe Lineage-Suche war zu weich. Sie braucht Suchmanifest,
  Hash-/Freshness-Pruefung, negative Evidence fuer nicht gefundene Artefakte
  und ein Verbot von `latest_*` als Recovery-Quelle.
- Der Retraining-Pfad hatte kein hartes Budget. Er bekommt ein enges
  Artifact-/Logit-faehiges Micro-Budget und darf nie durch Auto-Extend,
  Hyperparameter-Suche oder Qualitaetslauf wachsen.
- Die Ersatzvergleichspolitik war methodisch gut, aber nicht als
  Fix-Planungsurteil formuliert. Ergebnis: `/fix-planung` ist nur fuer
  `93Y.1` erlaubt; fuer `BT93S`, `BT93O`, volles `BT93X`, `BT93P`, `BT94A`
  und jeden Candidate-/Freeze-/Rollout-Pfad bleibt es No-Go.

## Geplanter Platz

Dieser Intake ist ein Recovery-Interposer vor jedem weiteren PPO-R/S/O/P-Pfad.
Er gehoert nach den roten Abschluessen:

- `BT93R.99=model-artifact-missing`
- `BT93X.0` read-only mit `preflightField=dqn-loader-fix-required`

und vor:

- erneutem `BT93R`-Root-Cause-/Counterprobe-Lauf
- `BT93S` bis `BT93W`
- `BT93O`
- vollem `BT93X`
- `BT93P`
- `BT94A`, `BT94B`, `BT95`

Aufzunehmende Masterplan-Verdrahtung:

- `BT93Y` wird als neuer P0/P1-Block direkt nach `BT93R` und `BT93X.0`
  aufgenommen.
- `BT93S depends_on` wird von `BT93R.99 in R-Allowlist` auf
  `BT93Y.99` mit `bt93rReentryAllowed=true` plus erneutem
  `BT93R-Reentry.99 in R-Allowlist` verschaerft.
- Volles `BT93X` nutzt keine BT11-Recovery mehr als Standardpfad, sondern die
  explizite Ersatzvergleichspolitik aus diesem Intake.
- `BT93P` bleibt gesperrt, bis `BT93O.99=bt93o-quality-green` und ein frischer
  `BT93X.99=bt93p-starttruth-green` mit Ersatzvergleichspolitik vorliegen.

## User-owned Entscheidungen

### UOD-1 Lineage-Recovery/Retraining vor R/S/O/P

Entscheidung: Vor jedem weiteren `BT93R`-, `BT93S`-, `BT93O`- oder
`BT93P`-Pfad wird zuerst ein enger Lineage-Recovery/Retraining-Block
eingeschoben.

Begruendung:

- `BT93R` konnte den deterministic-collapse nicht beweisbar reparieren, weil
  das exakte BT93N-Lineage-Paket fehlt.
- Ohne `model.zip`, Config, VecNormalize/Normalizer und Action-Surface-Hash
  sind Decoder-, Normalize- oder Eval-Mode-Counterprobes nicht belastbar.
- `BT93S` wuerde auf Action-/Reward-/Telemetry-Fragen arbeiten, obwohl die
  selektierte Policy nicht reproduzierbar geladen werden kann.

Konsequenz:

- Keine Fortsetzung nach `BT93S`.
- Keine direkte Fortsetzung nach `BT93O`, vollem `BT93X`, `BT93P` oder
  `BT94A`.
- Erst exakte BT93N-Lineage extern wiederherstellen oder, falls unmoeglich,
  eine neue eng begrenzte Retraining-Lineage erzeugen.

### UOD-2 Ersatzvergleichspolitik statt BT11-Recovery

Entscheidung: Fuer diesen PPO-Pfad wird nicht weiter auf Wiederherstellung des
BT11-Checkpoints als Standard-Comparator gesetzt. Stattdessen wird eine
explizite Ersatzvergleichspolitik beschlossen.

Policy-ID:

`bt93x-rcp1-same-matrix-control-suite-no-bt11`

Geltungsbereich:

- Ersetzt den fehlenden Same-Matrix-BT11/DQN-Anker nur fuer
  `BT93X`/`BT93P`-Starttruth.
- Erlaubt keinen Candidate, Freeze, Promote, Rollout, DQN-Sunset oder
  Produktions-Handoff.
- Historische DQN-/Bot-Reports bleiben Kontext, aber kein Comparator-Beweis.

Pflichtvergleich:

- `noop`
- `random`
- `semantic-cycle`
- `scripted-reachability`
- recovered/retrained PPO-Lineage auf derselben Matrix

Harte Regeln:

- `noop` muss non-success bleiben und klar schlechter als kontrollierte
  Progress-Policies sein.
- `random` oder `semantic-cycle` duerfen PPO oder `scripted-reachability` auf
  Pflichtmetriken nicht gleichziehen oder uebertreffen.
- `scripted-reachability` ist Reachability-/Task-Sanity, kein historischer
  Champion-Ersatz; die PPO-vs-scripted-Entscheidungsregel muss vor `BT93P`
  maschinenlesbar gepinnt sein.
- Jeder Vergleich braucht Matrix-ID, Matrix-Hash, Semantikfenster,
  Action-Surface-ID, Reward-Profil, Seeds, Episoden, Median/IQR,
  Mindestdelta, Invalidierungsregeln und Holdout-Lineage.
- Fehlen diese Felder, endet `BT93X` `comparison-policy-not-ready` oder
  `measurement-invalid`, nicht `bt93p-starttruth-green`.

## Kurzurteil

Der naechste sinnvolle Schritt ist nicht `BT93S`. Der aktuelle PPO-Pfad ist an
zwei Stellen hart blockiert:

| Quelle | Befund | Konsequenz |
| --- | --- | --- |
| `data/training/ppo/bt93r/bt93r_closure_gate_report.json` | `resultClass=model-artifact-missing`; `BT93R` nicht in R-Allowlist | `BT93S`, `BT93O`, `BT93P`, `BT94A` bleiben geschlossen |
| `data/training/ppo/bt93r/policy_artifact_report.json` | selektierte BT93N-Policy hat kein Modell, keine Config, keine VecNormalize; echte Logits fehlen | keine Decoder-/Normalize-/Eval-Mode-Fixbehauptung |
| `data/training/ppo/bt93r/policy_artifact_report.json` | Action-Surface-Lineage driftet: Policy-Evidence 9 Actions, aktueller Surface 13 Actions | alte Counts sind keine belastbare aktuelle Policy-Lineage |
| `data/training/ppo/bt93x/early_comparator_preflight_report.json` | `sameMatrixDqnAnchorPresent=false`, `comparisonPolicyDecision=dqn-anchor-blocked`, `preflightField=dqn-loader-fix-required` | BT11/DQN-Anker wird nicht als Starttruth akzeptiert |
| `data/training/ppo/bt94a/no_start_gate.json` | `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false` | kein BT94A-Start, kein Candidate, kein Freeze |

Damit ist der Recovery-Pfad:

1. Lineage-Entscheidung locken.
2. Exaktes BT93N-Lineage-Paket extern suchen und verifizieren.
3. Falls nicht wiederherstellbar: eng retrainen und eine neue, nicht als BT93N
   ausgegebene Lineage erzeugen.
4. Ersatzvergleichspolitik `bt93x-rcp1-same-matrix-control-suite-no-bt11`
   maschinenlesbar locken.
5. Erst danach einen neuen `BT93R-Reentry` als Artifact-Probe, Root-Cause und
   Counterprobe planen; der alte rote `BT93R.99=model-artifact-missing` bleibt
   historische Wahrheit.

## Fix-Planungsurteil

GO fuer `/fix-planung` ausschliesslich mit Scope `BT93Y.1`
Recovery-/Entscheidungs-Lock.

NO-GO fuer:

- `BT93S` bis `BT93W`
- `BT93O`
- volles `BT93X`
- `BT93P`
- `BT94A`, `BT94B`, `BT95`
- Candidate, Freeze, Holdout-Verbrauch, Promote, Rollout
- produktive Runtime-/Registry-/Feature-Flag-/JS-Inference-Aenderungen

Begruendung: Die selektierte PPO-Lineage ist aktuell nicht loadbar belegt, der
Same-Matrix-DQN/BT11-Anker ist technisch blockiert, und die Ersatzpolitik ist
noch nicht maschinenlesbar gelockt.

## Nicht-Ziele

- Kein BT93S-Start aus dem roten `BT93R`.
- Kein BT93O-, BT93X-full-, BT93P- oder BT94A-Start.
- Kein Candidate, Freeze, Holdout-Verbrauch, Promote, Rollout oder
  `BT95-Handoff-ready`.
- Kein BT11-Loader-Fix als Standardpfad in diesem Intake.
- Keine Nutzung historischer DQN-/Bot-Reports als Same-Matrix-Anker.
- Keine produktive Runtime-, Registry-, Feature-Flag- oder JS-Inference-
  Aenderung.
- Kein breites Hyperparameter- oder Langlauf-Retraining.
- Keine Wiederverwendung quarantinierter User-owned 3M/4-Env-Spuren als
  Evidence.

## Scope Files

Plan-/Dokumentationsscope:

- `docs/plaene/neu/BT93Y_PPO_Lineage_Recovery_Retraining_ReplacementPolicy_Intake_2026-04-30.md`
- `docs/bot-training/Bot_Trainingsplan.md` nach user-owned Aufnahme
- `docs/bot-training/Bot_Trainings_Roadmap.md` nur wenn alte BT11-/BT93R-X-
  Formulierungen der neuen Entscheidung widersprechen

Moeglicher Implementierungsscope nach Aufnahme:

- `python/scripts/bt93y_*`
- `data/training/ppo/bt93y/**`
- `data/training/ppo/bt93r/**` nur fuer einen neuen R-Reentry-Claim nach
  `BT93Y.99` mit `bt93rReentryAllowed=true`
- `data/training/ppo/bt93x/replacement_policy_decision.json`

Read-only/forbidden im Intake:

- `src/entities/ai/**`
- produktive DQN-/PPO-Inference
- Runtime-/Matchstart-/AI-Hub-Dateien
- Freeze-/Promote-/Rollout-Artefakte

## Result-Class- und Dependency-Vertrag

| Uebergang | Oeffnet nur bei | Blockiert bei |
| --- | --- | --- |
| BT93R/BT93X.0 -> BT93Y.1 | rote Abschlussberichte liegen versioniert vor | fehlende R/X0-Quelle, unklare User-Entscheidung |
| 93Y.1 -> 93Y.2 | `lineage-recovery-lock-green` | `lineage-decision-missing`, `source-evidence-stale`, `measurement-invalid` |
| 93Y.2 -> BT93R-Reentry-Planung | `exact-bt93n-lineage-restored` | `exact-lineage-unavailable`, `lineage-package-invalid`, `surface-hash-mismatch`, `measurement-invalid` |
| 93Y.2 -> 93Y.3 | `exact-lineage-unavailable` plus User-Freigabe aus UOD-1 | `lineage-search-incomplete`, `external-artifact-ambiguous`, `measurement-invalid` |
| 93Y.3 -> BT93R-Reentry-Planung | `retrain-lineage-ready` | `retrain-lineage-not-comparable`, `model-package-incomplete`, `normalizer-missing`, `surface-contract-drift`, `measurement-invalid` |
| 93Y.4 -> full BT93X spaeter | `replacement-policy-approved` | `replacement-policy-decision-missing`, `comparison-policy-not-ready`, `measurement-invalid` |
| 93Y.99 -> BT93R-Reentry-Planung | `bt93rReentryAllowed=true` plus gruene BT93Y.99-Resultklasse | `lineage-recovery-blocked`, `replacement-policy-decision-missing`, `bt93r-reentry-blocked`, `measurement-invalid` |
| BT93R-Reentry.99 -> BT93S | erneutes `BT93R-Reentry.99` in R-Allowlist | jedes rote R-Result |

Gruene `BT93Y.99`-Resultklassen:

- `exact-lineage-restored-bt93r-reentry-ready`
- `retrain-lineage-ready-bt93r-reentry-ready`

Rote `BT93Y.99`-Resultklassen:

- `lineage-recovery-blocked`
- `lineage-package-invalid`
- `retrain-lineage-not-comparable`
- `replacement-policy-decision-missing`
- `bt93r-reentry-blocked`
- `measurement-invalid`

Wichtig: `BT93Y.99` oeffnet nur einen neuen `BT93R-Reentry`-Probe-/
Root-Cause-/Counterprobe-Claim. Es oeffnet nicht `BT93S`, `BT93O`, `BT93P`,
`BT94A` oder Kandidatenarbeit.

## Report-Schema-Mindestvertrag

Jeder neue BT93Y-Report schreibt mindestens:

- `schemaVersion`, `blockId`, `phaseId`, `resultClass`, `ok`,
  `generatedAt`, `generatedBy`, `git.sha`, `git.branch`.
- `lineageDecision.owner=user`, `lineageDecision.mode`,
  `lineageDecision.exactRecoveryAttempted`, `lineageDecision.retrainingAllowed`.
- `replacementPolicy.owner=user`, `replacementPolicy.policyId`,
  `replacementPolicy.replaces`, `replacementPolicy.scope`,
  `replacementPolicy.approved`.
- `sourceArtifacts[]` mit `path`, `sha256`, `tracked`, `fresh`, `blockId`,
  `phaseId`, `resultClass`.
- `modelPackage` mit `model`, `config`, `vecnormalize`/`normalizer`,
  `optimizerState` oder `notApplicableReason`.
- `actionSurfaceId`, `actionSurfaceSha256`, `semanticActions[]`,
  `rewardProfileId`, `matrixId`, `matrixHash`, `semanticWindow`.
- `sampleCounts` mit Seeds, Episoden, Steps und Missing-Raten, falls ein
  Retraining oder Eval laeuft.
- `allowNext[]`, `blocksNext[]`, `bt93rReentryAllowed`,
  `bt93sClaimAllowed=false`, `bt93oClaimAllowed=false`,
  `bt93pClaimAllowed=false`, `bt94aClaimAllowed=false`.
- Guardrails:
  `candidateRun=false`, `freezeCandidate=false`, `holdoutUsed=false`,
  `promotionAllowed=false`, `rolloutAllowed=false`,
  `productiveRuntimeChanged=false`.

## Phasen

### 93Y.1 Recovery- und Entscheidungs-Lock

Ziel: Die roten Quellen und User-Entscheidungen werden als Startwahrheit
gepinnt. Diese Phase erzeugt keine Bot-Qualitaet.

- [ ] 93Y.1.1 `BT93R.99` aus
  `data/training/ppo/bt93r/bt93r_closure_gate_report.json` als
  `model-artifact-missing` referenzieren.
- [ ] 93Y.1.2 `BT93X.0` aus
  `data/training/ppo/bt93x/early_comparator_preflight_report.json` als
  `dqn-loader-fix-required`/`dqn-anchor-blocked` referenzieren.
- [ ] 93Y.1.3 User-Entscheid UOD-1 als
  `lineageRecoveryBeforeAnyR/S/O/P=true` maschinenlesbar locken.
- [ ] 93Y.1.4 User-Entscheid UOD-2 als
  `replacementPolicyId=bt93x-rcp1-same-matrix-control-suite-no-bt11`
  maschinenlesbar locken.
- [ ] 93Y.1.5 Verbotene naechste Aktionen schreiben:
  `BT93S`, `BT93O`, `BT93P`, `BT94A`, Candidate, Freeze, Holdout, Promote,
  Rollout.

Evidence:

- `data/training/ppo/bt93y/lineage_recovery_decision_lock.json`

### 93Y.2 Exakte BT93N-Lineage-Recovery

Ziel: Das exakte externe BT93N-Lineage-Paket wird gesucht, gehasht und nur bei
vollstaendiger Uebereinstimmung als Recovery akzeptiert.

Pflichtbestandteile:

- BT93N `model.zip`
- BT93N Config
- BT93N VecNormalize/Normalizer
- optional Optimizer-State, falls vorhanden
- Action-Surface-Hash der selektierten BT93N/BT93Q-Evidence
- Matrix-ID und Semantikfenster der BT93N/BT93Q-Diagnose

Checkliste:

- [ ] 93Y.2.1 Externe Suchorte, Zeitfenster, erwartete Run-ID und erwartete
  Artefaktnamen dokumentieren.
- [ ] 93Y.2.2 Gefundene Artefakte nur per Hash/Manifest aufnehmen; keine
  `latest_*`-Aufloesung als Recovery akzeptieren.
- [ ] 93Y.2.3 Loader-Smoke gegen Modell, Config und VecNormalize ohne neuen
  Trainingslauf ausfuehren.
- [ ] 93Y.2.4 Action-Surface-Hash gegen die selektierte BT93N/BT93Q-Evidence
  pruefen; Drift endet `surface-hash-mismatch`.
- [ ] 93Y.2.5 Wenn vollstaendig: `exact-bt93n-lineage-restored` schreiben.
- [ ] 93Y.2.6 Wenn nicht vollstaendig: `exact-lineage-unavailable` schreiben
  und nur nach UOD-1 in 93Y.3 wechseln.
- [ ] 93Y.2.7 Nicht gefundene externe Artefakte brauchen negative Evidence:
  Suchpfad, Zeitfenster, erwartete Dateinamen, Owner und Grund, warum kein
  hashbarer Fund akzeptiert wurde.

Evidence:

- `data/training/ppo/bt93y/exact_lineage_inventory_report.json`
- `data/training/ppo/bt93y/exact_lineage_loader_smoke_report.json`
- `data/training/ppo/bt93y/exact_lineage_manifest.json`

### 93Y.3 Enge Retraining-Lineage nur bei fehlender Exakt-Lineage

Ziel: Wenn exakte BT93N-Lineage nicht wiederherstellbar ist, wird eine neue
enge, vollstaendig persistierte PPO-Lineage erzeugt. Sie darf nicht als BT93N
ausgegeben werden.

Vertrag:

- neue Lineage-ID, z.B. `bt93y-retrain-lineage-v1`
- keine Qualitaets-, Candidate- oder Freeze-Aussage
- kein Holdout-Verbrauch
- keine 50k/100k/200k/500k/1M-Erweiterung
- maximales Micro-Budget: 10k Timesteps oder kleineres vorab gepinntes Budget;
  kein Auto-Extend, keine Hyperparameter-Suche, kein Qualitaetsurteil
- Training nur so weit, wie fuer loadbare Artifact-/Logit-/Counterprobe-
  Faehigkeit noetig ist
- Modell, Config, VecNormalize/Normalizer, Optimizer-State und Action-Surface
  werden als Paket manifestiert

Checkliste:

- [ ] 93Y.3.1 Retraining-Startcontract pinnt Matrix, Semantikfenster,
  Action-Surface, Reward-Profil, Seeds, Stepbudget, Stop-Regeln und
  Nicht-Ziele.
- [ ] 93Y.3.2 Mini-Retraining erzeugt ein vollstaendiges Modellpaket mit
  Hashes und Loader-Smoke.
- [ ] 93Y.3.3 Deterministic- und stochastic-Eval erzeugen echte Logit- oder
  Policy-Distribution-Evidence aus dem geladenen Modell.
- [ ] 93Y.3.4 Fehlersignatur wird nur klassifiziert, nicht repariert:
  DeathBefore60, Wall/Trail, deterministic-collapse, Action-Surface und
  Reward-Ordering.
- [ ] 93Y.3.5 Wenn die neue Lineage nicht mit BT93N/Q vergleichbar ist, endet
  die Phase `retrain-lineage-not-comparable` und oeffnet keinen R-Reentry.
- [ ] 93Y.3.6 Wenn die neue Lineage loadbar und methodisch vergleichbar ist,
  endet die Phase `retrain-lineage-ready`.
- [ ] 93Y.3.7 Wenn das Micro-Budget nicht reicht, ist das Ergebnis ein roter
  Lineage-/Messblocker; das Budget wird nicht nachtraeglich erhoeht.

Evidence:

- `data/training/ppo/bt93y/retrain_start_contract.json`
- `data/training/ppo/bt93y/retrain_lineage_manifest.json`
- `data/training/ppo/bt93y/retrain_loader_smoke_report.json`
- `data/training/ppo/bt93y/retrain_policy_probe_report.json`

### 93Y.4 Ersatzvergleichspolitik locken

Ziel: Die BT11/DQN-Luecke wird nicht durch historische Reports oder einen
weichen Textentscheid ersetzt, sondern durch eine explizite
Ersatzvergleichspolitik fuer spaeteres volles `BT93X`.

Checkliste:

- [ ] 93Y.4.1 `replacement_policy_decision.json` schreibt
  `owner=user`, `decision=approved`, `policyId`,
  `replaces=BT11-same-matrix-DQN-anchor`.
- [ ] 93Y.4.2 Scope wird begrenzt auf `BT93X`/`BT93P`-Starttruth; Promote,
  Rollout, DQN-Sunset und Produkt-Handoff bleiben verboten.
- [ ] 93Y.4.3 Pflichtvergleich mit `noop`, `random`, `semantic-cycle`,
  `scripted-reachability` und recovered/retrained PPO-Lineage wird
  maschinenlesbar.
- [ ] 93Y.4.4 Mindeststatistik und Invalidierungsregeln werden vor spaeterem
  `BT93P` gepinnt; nachtraegliche Schwellenanpassung ist ungueltig.
- [ ] 93Y.4.5 Historische DQN-/Bot-Reports werden explizit als
  `context-only` markiert.

Evidence:

- `data/training/ppo/bt93x/replacement_policy_decision.json`
- `data/training/ppo/bt93y/replacement_policy_lock_report.json`

### 93Y.5 BT93R-Reentry-Paket

Ziel: Der naechste erlaubte technische Schritt wird eng definiert:
`BT93R` erneut laufen lassen, aber nur Artifact-Probe, Root-Cause und
Counterprobe.

Checkliste:

- [ ] 93Y.5.1 Reentry-Manifest referenziert entweder
  `exact-bt93n-lineage-restored` oder `retrain-lineage-ready`.
- [ ] 93Y.5.2 Neuer `BT93R-Reentry`-Plan laeuft in drei Stufen:
  Artifact-Probe, Root-Cause, Counterprobe.
- [ ] 93Y.5.3 `93R.4` Fix ist weiterhin verboten, bis die neue R-Probe eine
  konkrete Fixklasse und Counterprobe-Faehigkeit schreibt.
- [ ] 93Y.5.4 `BT93S` bleibt gesperrt, bis der erneute `BT93R-Reentry.99` eine
  R-Allowlist-Resultklasse schreibt.
- [ ] 93Y.5.5 Verbotene Signale bleiben false: Candidate, Freeze, Holdout,
  Promote, Rollout, PPO-Validate, BT95-Handoff.

Evidence:

- `data/training/ppo/bt93y/bt93r_reentry_manifest.json`
- `data/training/ppo/bt93y/bt93r_reentry_gate_report.json`

### 93Y.99 Abschluss-Gate

- [ ] 93Y.99.1 Alle Phasen 93Y.1 bis 93Y.5 sind mit Evidence dokumentiert
  oder ehrlich blockiert.
- [ ] 93Y.99.2 Genau eine Lineage-Quelle ist aktiv:
  exakte BT93N-Recovery oder neue Retraining-Lineage.
- [ ] 93Y.99.3 Ersatzvergleichspolitik ist user-owned und maschinenlesbar
  entschieden.
- [ ] 93Y.99.4 `BT93Y.99` oeffnet nur den neuen `BT93R-Reentry`-Probepfad.
- [ ] 93Y.99.5 `BT93S`, `BT93O`, `BT93P`, `BT94A`, Candidate, Freeze,
  Holdout, Promote und Rollout bleiben geschlossen.
- [ ] 93Y.99.6 `npm.cmd run plan:check`, `npm.cmd run docs:sync`,
  `npm.cmd run docs:check` und `npm.cmd run build` sind fuer den Abschluss
  vorgesehen; Tests und Trainingslaeufe bleiben user-owned, sofern nicht
  explizit beauftragt.

Evidence:

- `data/training/ppo/bt93y/bt93y_closure_gate_report.json`
- `data/training/ppo/bt93y/bt93y_handover_package.json`

## Definition of Done

- [ ] DoD.1 Der Intake benennt die aktuelle rote Wahrheit aus `BT93R.99` und
  `BT93X.0` mit konkreten Artefaktpfaden.
- [ ] DoD.2 Der Intake verhindert jede Fortsetzung nach `BT93S/O/P/94A`, bis
  Lineage und R-Reentry wieder belastbar sind.
- [ ] DoD.3 Exakte BT93N-Recovery und enges Retraining sind getrennte Pfade;
  ein Retrain darf nicht als wiederhergestellte BT93N-Lineage ausgegeben
  werden.
- [ ] DoD.4 Die Ersatzvergleichspolitik statt BT11 ist explizit, user-owned,
  maschinenlesbar und auf Starttruth begrenzt.
- [ ] DoD.5 Historische DQN-/Bot-Reports, `tmp/**`, `latest_*` und
  Fremdmatrix-Metriken sind als Comparator-Evidence ausgeschlossen.
- [ ] DoD.6 Jeder gruene Ausgang oeffnet nur einen neuen
  `BT93R-Reentry`-Probe-/Root-Cause-/Counterprobe-Pfad.
- [ ] DoD.7 Kein Candidate-, Freeze-, Holdout-, Promote-, Rollout-,
  PPO-Validate- oder BT95-Handoff-Signal wird erzeugt.

## Risiko-Register

| Risiko | Impact | Owner | Mitigation | Stop-Kriterium |
| --- | --- | --- | --- | --- |
| Exakte BT93N-Artefakte bleiben extern unauffindbar | hoch | User/RL | Retraining-Pfad nur mit neuer Lineage-ID und Nicht-Aequivalenz-Hinweis | kein `bt93rReentryAllowed=true` ohne loadbares Paket |
| Retraining reproduziert die BT93N/Q-Fehlersignatur nicht | hoch | RL | als neue Lineage klassifizieren, nicht als alter BT93N-Ersatz | `retrain-lineage-not-comparable` |
| Ersatzvergleich wird zu weich und ersetzt DQN ohne Methodik | hoch | User/RL | RCP1 mit Matrix, Baselines, Statistik und Invalidierungsregeln | `comparison-policy-not-ready` |
| Historische DQN-Reports werden wieder als Same-Matrix-Anker gelesen | hoch | Governance | context-only-Feld in jedem Report | `measurement-invalid` |
| Action-Surface-Drift entwertet alte Counts | hoch | RL | Surface-ID/Hash in jedem Paket pinnen | `surface-contract-drift` |
| Recovery erzeugt versehentlich Candidate-/Freeze-Signale | hoch | Governance | Guardrails in jedem Report false | Closure rot |
| BT94A-No-Start wird stale | mittel | Governance | nach R-Reentry/BT93X spaeter frischen Gate-Refresh erzwingen | kein BT94A-Claim |

## Aufnahmehinweise fuer den Masterplan

Vorgeschlagene neue Blockzeile:

| id | titel | status | prio | depends_on | current_phase | quelle |
| --- | --- | --- | --- | --- | --- | --- |
| BT93Y | PPO Lineage-Recovery/Retraining und Ersatzvergleich | planned | P0 | `BT93R.99=model-artifact-missing` + `BT93X.0=dqn-loader-fix-required` | 93Y.1 | `docs/plaene/neu/BT93Y_PPO_Lineage_Recovery_Retraining_ReplacementPolicy_Intake_2026-04-30.md` |

Abhaengigkeitsschaerfung:

- `BT93S depends_on = BT93Y.99 mit bt93rReentryAllowed=true + erneutes BT93R-Reentry.99 in R-Allowlist`
- `BT93O depends_on = BT93W.99=bt93o-precondition-green` bleibt, kann aber
  erst nach neuem R/S/T/U/V/W-Pfad erreicht werden.
- `BT93X full depends_on = BT93O.99=bt93o-quality-green + replacement_policy_decision.approved=true`
- `BT93P depends_on = BT93O.99=bt93o-quality-green + BT93X.99=bt93p-starttruth-green`
- `BT94A depends_on = BT93P.4 + bt94a_gate_check.py claimable=true`

## Bericht

Warum dieser Intake vor `BT93S` sitzt:

1. `BT93R` hat nicht bewiesen, ob der Collapse aus Decoder, Normalize,
   Eval-Mode, Action-Surface-Drift oder Modellartefakt-Mangel stammt.
2. Ohne loadbare Policy sind Action-/Reward-Fixes aus `BT93S` bis `BT93W`
   methodisch schwach, weil nicht klar ist, welche Policy wirklich repariert
   wird.
3. `BT93X.0` bestaetigt unabhaengig, dass der alte Same-Matrix-DQN/BT11-Pfad
   nicht verwendbar ist.
4. Der user-owned Entscheid ersetzt BT11 nicht durch Bauchgefuehl, sondern
   durch eine eng definierte Same-Matrix-Control-Suite mit harten
   Invalidierungsregeln.
5. Der einzige gruene Ausgang ist ein erneuter `BT93R`-Probepfad. Alles andere
   bleibt geschlossen.
