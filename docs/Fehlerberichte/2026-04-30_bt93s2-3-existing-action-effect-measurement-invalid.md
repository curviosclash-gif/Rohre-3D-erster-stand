# Fehlerbericht: BT93S2.3 Existing-Action Effect v2 measurement-invalid

- Datum: 2026-04-30
- Block: BT93S2
- Phase: 93S2.3
- Status: offen/blockierend

## Aufgabe/Kontext
`BT93S2.3` sollte bestehende Actions ohne PPO-Training gegen die frisch gelockte Matrix-v2 messen. Ziel war eine urteilsfaehige Klassifikation fuer `escape-right-open`, Side-Wall und Narrowing sowie ein Nachweis, dass `no-danger-control` keine Action-Gruen-Evidence erzeugt.

## Fehlerbild
Der Full-Run hat Evidence geschrieben, endet aber `resultClass=measurement-invalid` und `opensNext=[]`.

- `escape-left-open` hat eine fehlschlagende Negative-Control: `noop` wird als erfolgreiche Action klassifiziert.
- `escape-right-open` bleibt `action-space-required`.
- `no-danger-control` erzeugt keine Action-Gruen-Evidence, ist aber `neutral-control-unstable`.
- Damit darf `93S2.4` nicht als normaler Folge-Scope starten.

## Reproduktion
1. `python python/scripts/bt93s2_existing_action_effect_v2.py --write-report`
2. Report lesen: `data/training/ppo/bt93s2/existing_action_effect_v2_report.json`
3. Kernergebnis: `ok=false`, `resultClass=measurement-invalid`, `classResultCounts.measurement-invalid=1`, `actionSpaceRequiredScenarioIds=[escape-right-open]`.

## Betroffene Dateien/Komponenten
- `python/scripts/bt93s2_existing_action_effect_v2.py`
- `data/training/ppo/bt93s2/existing_action_effect_v2_report.json`
- `data/training/ppo/bt93s2/scenario_matrix_v2_contract.json`
- `docs/bot-training/Bot_Trainingsplan.md`

## Bereits getestete Ansaetze
- Neuer S2.3-Full-Run mit allen v2-Seeds und 13 bestehenden Semantic-Actions.
- Start-/Matrix-/Search-Artefakte waren versioniert und lesbar.
- Keine Trainings-, Holdout-, Reward-, Telemetry-, Action-Surface- oder Runtime-Aenderung.

## Evidence
- `data/training/ppo/bt93s2/existing_action_effect_v2_report.json`
- Command: `python python/scripts/bt93s2_existing_action_effect_v2.py --write-report`
- Befund: `escape-left-open.negativeControlFailed=true`, `escape-right-open=action-effect-weak`, `no-danger-control=neutral-control-unstable`.

## Aktueller Stand
`93S2.3` ist als rote Diagnose abgeschlossen. Der Block bleibt aktiv, aber der normale `93S2.4 Action-Surface Repair Decision` ist blockiert, weil die Matrix-/Control-Evidence vor einer Action-Surface-Entscheidung nicht urteilsfaehig ist.

## Naechster Schritt
Enger BT93S2-Reparatur-Intake: `escape-left-open` Negative-Control/Success-Predicate und `no-danger-control` Stabilitaetsfenster reparieren, danach `93S2.2`/`93S2.3` gezielt re-runnen. Kein BT93T/U/W/O/P/94A-Start.
