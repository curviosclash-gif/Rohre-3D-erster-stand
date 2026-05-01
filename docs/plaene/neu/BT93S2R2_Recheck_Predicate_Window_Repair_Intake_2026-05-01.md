# BT93S2R2 Recheck Predicate-/Window-Repair Intake (Entwurf)

Status: Entwurf, nicht in den Master integriert.
Quelle: `BT93S2.3-Recheck=measurement-invalid` vom 2026-05-01.

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

## Primaere Befunde

| Befund | Evidence | Konsequenz |
| --- | --- | --- |
| Predicate-Failures trotz `BT93S2R.99=matrix-control-reentry-green` | Recheck: `predicateFailureCount=36` | Matrix-/Control-v3 ist metadaten-gruen, aber nicht messfenster-gruen in echter Env-Messung. |
| Minimum-Window-Failures | Recheck: `minimumWindowFailureCount=8` | Einige Szenarien liefern keine gueltige 8-Step-Mindestmessung. |
| `escape-left-open` bleibt measurement-invalid | Negative-Control-Fail im Recheck; `noop`/falsche Richtungen zaehlen weiterhin als Erfolg | Direction-/Baseline-/Predicate-Vertrag muss erneut gegen echte Startmetriken repariert werden. |
| `escape-right-open` bleibt action-effect-weak | keine erfolgreiche bestehende Action im Recheck | Action-Space-Urteil bleibt gesperrt, solange Predicate-/Window-Fairness nicht messgueltig ist. |
| Mehrere nicht-escape Szenarien haben Predicate- oder Window-Fails | Recheck-Failure-Verteilung im JSON | Der naechste Scope darf nicht nur Escape-IDs patchen, sondern muss globale Revalidation zwischen Matrix und Env-Messung pruefen. |

## Vorgeschlagener Block

Block-ID-Vorschlag: `BT93S2R2`

Ziel: Die Diskrepanz zwischen `scenario_matrix_v3_contract.json` und der
echten `BT93S2.3-Recheck`-Messung reparieren, ohne ActionSurface, Reward,
Telemetry, PPO-Training, Holdout oder Runtime-Surfaces zu aendern.

## Scope-Dateien

| Pfad | Modus | Zweck |
| --- | --- | --- |
| `python/scripts/bt93s2_existing_action_effect_v3_recheck.py` | read/conditional write | Recheck-Failure-Extraktion, falls Berichtsfelder fehlen |
| `python/scripts/bt93s2r_*.py` | read/conditional write | v3-Reentry-Vorlagen, Predicate-/Window-Reparatur nur fuer Messgueltigkeit |
| `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json` | read | rote Recheck-Quelle |
| `data/training/ppo/bt93s2r/**` | read/conditional write | neue Reentry-Evidence, falls als S2R2-Pfad aufgenommen |
| `python/envs/ppo_action_surface.py` | read-only | keine ActionSurface-Aenderung in diesem Block |
| produktive Runtime-/AI-Hub-/Matchstart-/Strategy-Surfaces | read-only | Layer-Grenze |

## Definition of Done

- [ ] S2R2.1 Recheck-Failure-Taxonomie benennt pro Szenario und Seed genau
  eine Root-Cause-Klasse: Predicate-Drift, Warmup-/Seed-Drift,
  Minimum-Window-Fail, Negative-Control-Fail, Direction-Mismatch oder
  Env-Measurement-Drift.
- [ ] S2R2.2 Matrix-/Control-v4 oder aequivalenter Repair-Vertrag wird nur
  aus Recheck-Failure-Evidence abgeleitet und schreibt keine ActionSurface-,
  Reward-, Telemetry- oder Runtime-Aenderung.
- [ ] S2R2.3 Reentry-Gate misst die reparierten Predicate-/Window- und
  Control-Vertraege gegen echte Env-Proben und verlangt:
  `predicateFailureCount=0`, `minimumWindowFailureCount=0`,
  `measurementInvalidCount=0`, `negativeControlFailedCount=0`.
- [ ] S2R2.4 Closure oeffnet hoechstens einen neuen
  `BT93S2.3-Recheck`; `93S2.4` bleibt bis zu einem Recheck mit
  `measurementValid=true` geschlossen.
- [ ] S2R2.5 Meta-Gate `npm.cmd run gates:pre-commit` ist gruen oder
  der Blocker ist maschinenlesbar dokumentiert.

## Phasen

### S2R2.1 Failure-Taxonomie

- [ ] Recheck-Report lesen und Failure-Counts pro Szenario, Seed, Action und
  Predicate/Window-Klasse schreiben.
- [ ] `escape-left-open` Negative-Control-Fail von Predicate-/Window-Drift
  trennen.
- [ ] `escape-right-open` action-effect-weak erst nach gueltigem Predicate- und
  Minimum-Window-Fenster bewerten.

### S2R2.2 Predicate-/Window-Repair

- [ ] StartState, Warmup, Seeds und Predicate-Expression je roter Szenario-ID
  gegen echte Startmetriken abgleichen.
- [ ] Nur belegte Matrix-/Control-Reparaturen schreiben; keine ActionSurface-
  oder Reward-Aenderung.
- [ ] Globale Retained-v2-Szenarien mit Predicate-/Window-Fails ebenfalls
  reparieren oder als measurement-invalid blockieren.

### S2R2.3 Reentry-Gate

- [ ] Reparierten Vertrag gegen echte Env-Proben validieren.
- [ ] Gate zaehlt Predicate-, Window-, Measurement-, Negative-Control- und
  Direction-Fails maschinenlesbar.
- [ ] Gruen oeffnet nur `BT93S2.3-Recheck`.

### S2R2.99 Closure

- [ ] Closure schreibt genau eine Resultklasse:
  `matrix-control-reentry-green`, `predicate-window-required`,
  `escape-control-required`, `measurement-invalid`.
- [ ] Closure schreibt `allowNext[]`, `opensNext[]`, `blocksNext[]`,
  ClaimFlags, SampleCounts und SourceArtifacts.
- [ ] Kein BT93T/U/W/O/P/94A-, Candidate-, Freeze-, Holdout-, Promote-,
  Rollout-, PPO-Validate- oder BT95-Signal.

## Result-Class-Vertrag

| ResultClass | Bedeutung | Erlaubt |
| --- | --- | --- |
| `matrix-control-reentry-green` | Predicate-/Window-/Control-Reentry ist messgueltig | neuer `BT93S2.3-Recheck` |
| `predicate-window-required` | Startfenster oder Mindestfenster bleibt rot | enger weiterer Repair, kein S2.4 |
| `escape-control-required` | Escape-Control/Direction bleibt rot | enger weiterer Repair, kein S2.4 |
| `measurement-invalid` | Quellen, Versionierung oder Messung ungueltig | nichts |

## Nicht-Ziele

- Kein PPO-Training.
- Kein Holdout.
- Keine ActionSurface-Aenderung.
- Kein Reward- oder Telemetry-Fix.
- Kein BT93T/U/W/O/P/94A-Start.
- Kein Candidate, Freeze, Promote, Rollout oder PPO-Validate-Signal.
