# BT93S2R2 Recheck Predicate-/Window-Repair Intake

Status: in `docs/bot-training/Bot_Trainingsplan.md` aufgenommen.
Quelle: `BT93S2.3-Recheck=measurement-invalid` vom 2026-05-01.

## Harte Kritik am Erstentwurf

Der Erstentwurf war als Warnsignal brauchbar, aber fuer eine sichere
Fortsetzung zu weich:

- Er hat `BT93S2R.99=matrix-control-reentry-green` nicht hart genug als
  strukturelles Gruen klassifiziert. Der frische Recheck beweist, dass
  strukturelles Gate-Gruen keine echte Env-Messgueltigkeit ersetzt.
- Er hat die Failure-Verteilung nicht vollstaendig in Startbedingungen
  uebersetzt. Ohne konkrete Counts pro Szenario kann der naechste Fix wieder
  nur Escape-Symptome reparieren und Retained-v2-Szenarien mit Predicate- oder
  Window-Fails uebersehen.
- Er hat nicht explizit verlangt, dass Predicate-Ausdruck, Predicate-Funktion,
  StartMetrics, Warmup, Seeds und Session-Replay dieselbe Wahrheit liefern.
  Genau diese Luecke kann erneut `predicateFailureCount > 0` erzeugen.
- Er hat Negative-Control-First fuer `escape-left-open` nicht stark genug
  gemacht. Solange `noop` oder falsche Richtungen als Escape-Erfolg zaehlen,
  ist jede positive Action-Evidence kontaminiert.
- Er liess "Matrix-/Control-v4 oder aequivalent" zu offen. Erlaubt ist nur ein
  aus Recheck-Failure-Evidence abgeleiteter Repair-Vertrag mit echtem
  Env-Replay-Gate.
- Er hat nicht klar genug gesagt: Dieser Block repariert Messgueltigkeit,
  nicht Action-Qualitaet, nicht Reward, nicht Policy-Selection und nicht
  Bot-Survival.

Fazit: Der Erstentwurf haette die Probleme nicht sicher repariert. Er haette
wahrscheinlich den richtigen Bereich getroffen, aber ohne strengere Replay- und
Stop-Gates wieder ein metadaten-gruenes Zwischenartefakt riskieren koennen.

## Anlass

Der frische `BT93S2.3-Recheck` gegen Matrix-/Control-v3 ist nicht
closure-faehig fuer `93S2.4`. Der Report
`data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`
schreibt:

- `resultClass=measurement-invalid`
- `probeCount=338`
- `predicateFailureCount=36`
- `minimumWindowFailureCount=8`
- `opensNext=[]`
- `newTrainingEpisodes=0`, `holdoutEpisodes=0`

Damit bleibt `93S2.4` blockiert. `BT93T/U/W/O/P/94A`, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben geschlossen.

## Failure-Matrix

| Szenario | Predicate-Fails | Window-Fails | Klassenbefund | Harte Konsequenz |
| --- | ---: | ---: | --- | --- |
| `escape-left-open` | 13 | 0 | `measurement-invalid`, Negative-Control-Fail | `noop`/falsche Richtungen muessen vor jeder Positive-Control-Bewertung scheitern. |
| `escape-right-open` | 11 | 0 | `action-effect-weak`, keine erfolgreiche bestehende Action | Action-Space-Urteil bleibt gesperrt, bis Predicate-/Window-Fairness echt gruen ist. |
| `frontal-near-wall` | 3 | 2 | existing-action observed, aber Recheck-Fenster driftet | Retained-v2 darf nicht blind uebernommen werden. |
| `side-wall-left` | 1 | 0 | existing-action observed, aber Predicate-Drift | Direction-Vertrag braucht echten StartMetrics-Abgleich. |
| `narrowing-corridor` | 2 | 2 | existing-action observed, aber Recheck-Fenster driftet | Minimum-Window muss vor Action-Wirkung zaehlen. |
| `trail-ahead` | 1 | 4 | existing-action observed, aber Window-Fails | Trail-Evidence bleibt nicht telemetry-oeffnend. |
| `trail-side` | 5 | 0 | existing-action observed, aber Predicate-Drift | Trail-Evidence bleibt nicht telemetry-oeffnend. |
| `no-danger-control` | 0 | 0 | `neutral-control-unstable` | Control erzeugt kein Action-Gruen und darf keine Folge oeffnen. |
| `side-wall-right` | 0 | 0 | existing-action observed | Nur Kontext; kein Folge-Gruen ohne gesamten Recheck. |

## Ziel und Nicht-Ziel

Ziel: Die Diskrepanz zwischen Matrix-/Control-Vertrag und echter
`BT93S2.3-Recheck`-Env-Messung reparieren.

Nicht-Ziel: Der Block beweist keine Action-Qualitaet und keine Bot-Qualitaet.
Selbst ein gruener `93S2R2.99` oeffnet nur einen neuen `BT93S2.3-Recheck`.
`93S2.4` startet erst, wenn dieser neue Recheck `measurementValid=true`
schreibt.

## Harte Startbedingungen

- `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`
  ist versioniert und schreibt `resultClass=measurement-invalid`.
- `BT93S2R.99=matrix-control-reentry-green` bleibt historische Quelle, aber
  nicht ausreichend fuer `93S2.4`.
- Es gibt keine ActionSurface-, Reward-, Telemetry-, Runtime-, Training- oder
  Holdout-Aenderung als Vorbedingung.
- Der Repair muss mit dem bestehenden ActionSurface-Hash starten und jede
  Drift als `measurement-invalid` oder `action-surface-lineage-invalidated`
  stoppen, nicht kaschieren.

## Scope-Dateien

| Pfad | Modus | Zweck |
| --- | --- | --- |
| `python/scripts/bt93s2r2_*.py` | write | Failure-Taxonomie, Predicate-/Window-Repair, Empirical-Reentry-Gate, Closure |
| `python/scripts/bt93s2_existing_action_effect_v3_recheck.py` | read/conditional write | nur fehlende Failure-Felder ergaenzen; alter Recheck bleibt rote Quelle |
| `python/scripts/bt93s2r_*.py` | read/conditional write | v3-Vorlagen nur fuer eng belegte Predicate-/Window-Reparatur |
| `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json` | read | rote Recheck-Quelle |
| `data/training/ppo/bt93s2r2/**` | write | neue versionierte S2R2-Evidence |
| `data/training/ppo/bt93s2r/**`, `data/training/ppo/bt93s2/**` | read | Source-Artefakte und Hashes |
| `docs/Fehlerberichte/2026-05-01_bt93s2r2_recheck_measurement_invalid.md` | write | Blocker-/Root-Cause-Status |
| `python/envs/ppo_action_surface.py` | read-only | keine ActionSurface-Aenderung |
| produktive Runtime-/AI-Hub-/Matchstart-/Strategy-Surfaces | read-only | Layer-Grenze |

## Definition of Done

- [ ] S2R2.DoD.1 Source-Lock pinnt Recheck-Report, Matrix-v3, Reentry-Gate,
  S2R-Closure, ActionSurfaceId, Decoder-Hash, Git-SHA und SampleCounts.
- [ ] S2R2.DoD.2 Failure-Taxonomie benennt pro Szenario, Seed und Action
  genau eine primaere Root-Cause-Klasse:
  `predicate-expression-drift`, `predicate-function-drift`,
  `start-metrics-drift`, `warmup-seed-drift`, `minimum-window-fail`,
  `negative-control-fail`, `direction-contract-mismatch`,
  `neutral-control-unstable`, `env-measurement-drift`.
- [ ] S2R2.DoD.3 Predicate-Ausdruck, Predicate-Funktion, StartMetrics,
  Warmup, Seeds und Session-ID werden vor jeder Action-Wirkung gegeneinander
  validiert; jede Uneinigkeit zaehlt als `measurement-invalid`.
- [ ] S2R2.DoD.4 `escape-left-open` Negative-Control-First ist hart: `noop`
  und falsche Richtungen muessen vor positiven Actions als Nicht-Erfolg
  klassifiziert sein.
- [ ] S2R2.DoD.5 `escape-right-open` darf erst als
  `action-space-required` bewertet werden, wenn alle positiven Controls auf
  gueltigem Predicate-/Minimum-Window-Fenster messbar waren.
- [ ] S2R2.DoD.6 Retained-v2-Szenarien mit Predicate-/Window-Fails werden
  repariert oder blockierend klassifiziert; sie duerfen nicht als Kontext
  durchgewunken werden.
- [ ] S2R2.DoD.7 Empirical-Reentry-Gate schreibt echte Env-Proben und verlangt
  `predicateFailureCount=0`, `minimumWindowFailureCount=0`,
  `measurementInvalidCount=0`, `negativeControlFailedCount=0`,
  `directionMismatchCount=0`.
- [ ] S2R2.DoD.8 Closure oeffnet hoechstens einen neuen
  `BT93S2.3-Recheck`; `93S2.4` bleibt bis zu einem spaeteren Recheck mit
  `measurementValid=true` geschlossen.
- [ ] S2R2.DoD.9 `npm.cmd run gates:pre-commit` ist gruen oder ein exakter
  Gate-Blocker ist dokumentiert.

## Phasen

### 93S2R2.1 Source-Lock und Failure-Taxonomie

- [ ] 93S2R2.1.1 Quellen mit Hash, Git-SHA, Resultklassen, SampleCounts,
  MatrixId, ContractId, ActionSurfaceId und Decoder-Hash locken.
- [ ] 93S2R2.1.2 Recheck-Failures pro Szenario, Seed, Action, Predicate,
  Minimum-Window, Negative-Control und Direction-Vertrag schreiben.
- [ ] 93S2R2.1.3 Roten Status in
  `docs/Fehlerberichte/2026-05-01_bt93s2r2_recheck_measurement_invalid.md`
  aktualisieren.

### 93S2R2.2 Predicate-/Window-Root-Cause Repair

- [ ] 93S2R2.2.1 Predicate-Ausdruck und Predicate-Funktion gegen echte
  StartMetrics vergleichen; Divergenzen explizit klassifizieren.
- [ ] 93S2R2.2.2 StartState, Warmup, Seeds, Session-ID und Minimum-Window je
  roter Szenario-ID reparieren oder blockierend klassifizieren.
- [ ] 93S2R2.2.3 Nur belegte Matrix-/Control-Reparaturen schreiben; keine
  ActionSurface-, Reward-, Telemetry-, Runtime-, Training- oder
  Holdout-Aenderung.

### 93S2R2.3 Empirical-Reentry Gate

- [ ] 93S2R2.3.1 Reparierten Vertrag gegen echte Env-Proben validieren.
- [ ] 93S2R2.3.2 Negative-Control-First fuer `escape-left-open`,
  Fairness-First fuer `escape-right-open` und Retained-v2-Revalidation
  maschinenlesbar zaehlen.
- [ ] 93S2R2.3.3 Gruen verlangt alle Null-Counts und oeffnet nur
  `BT93S2.3-Recheck`.

### 93S2R2.99 Closure

- [ ] 93S2R2.99.1 Closure schreibt genau eine Resultklasse:
  `matrix-control-reentry-green`, `predicate-window-required`,
  `escape-control-required`, `neutral-control-required`,
  `measurement-invalid`.
- [ ] 93S2R2.99.2 Closure schreibt `allowNext[]`, `opensNext[]`,
  `blocksNext[]`, ClaimFlags, SampleCounts, SourceArtifacts und
  Invalidations.
- [ ] 93S2R2.99.3 Kein BT93T/U/W/O/P/94A-, Candidate-, Freeze-, Holdout-,
  Promote-, Rollout-, PPO-Validate- oder BT95-Signal.
- [ ] 93S2R2.99.4 Abschluss-Gate: `npm.cmd run gates:pre-commit`.

## Result-Class-Vertrag

| ResultClass | Bedeutung | Erlaubt |
| --- | --- | --- |
| `matrix-control-reentry-green` | Predicate-/Window-/Control-Reentry ist empirisch messgueltig | neuer `BT93S2.3-Recheck` |
| `predicate-window-required` | Startfenster, Predicate-Funktion oder Mindestfenster bleibt rot | enger weiterer Repair, kein S2.4 |
| `escape-control-required` | Escape-Control, Negative-Control oder Direction bleibt rot | enger weiterer Repair, kein S2.4 |
| `neutral-control-required` | `no-danger-control` bleibt instabil oder erzeugt Action-Gruen | enger weiterer Repair, kein S2.4 |
| `measurement-invalid` | Quellen, Versionierung oder Messung ungueltig | nichts |

## Risiko-Register

| Risiko | Severity | Mitigation | Trigger |
| --- | --- | --- | --- |
| Wieder nur strukturelles Gruen statt Env-Gruen | kritisch | Empirical-Reentry-Gate mit echten Proben als DoD | Contract schreibt gruen ohne Probe-Counts |
| Predicate-Funktion und Predicate-Text driften auseinander | kritisch | Ausdruck, Funktion und StartMetrics getrennt reporten | `predicateFailureCount > 0` nach Repair |
| `escape-left-open` bleibt durch `noop` kontaminiert | kritisch | Negative-Control-First vor Positive-Control | `noop` success > 0 |
| `escape-right-open` wird zu frueh ActionSurface-Thema | hoch | Action-Space-Urteil erst nach Fairness-Null-Counts | positive Controls nicht messbar |
| Retained-v2-Szenarien werden ignoriert | hoch | alle Predicate-/Window-Fails im Reentry-Gate | Failures ausserhalb Escape-Szenarien |
| Scope weitet sich auf Reward/Telemetry/Training aus | kritisch | explizite Nicht-Ziele und Diff-Grenzen | Reward-, Telemetry-, PPO- oder Runtime-Datei im Diff |

## Nicht-Ziele

- Kein PPO-Training.
- Kein Holdout.
- Keine ActionSurface-Aenderung.
- Kein Reward- oder Telemetry-Fix.
- Kein BT93T/U/W/O/P/94A-Start.
- Kein Candidate, Freeze, Promote, Rollout oder PPO-Validate-Signal.
