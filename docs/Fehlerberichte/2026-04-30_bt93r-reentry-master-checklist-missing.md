# Fehlerbericht: BT93R-Reentry ohne aktive Master-Checklist

- Datum: 2026-04-30
- Block: BT93R-Reentry
- Phase: Claim-Vorpruefung
- Status: geschlossen

## Task-Kontext
`BT93Y.99` ist gruen abgeschlossen und oeffnet laut `data/training/ppo/bt93y/bt93y_closure_gate_report.json` ausschliesslich `BT93R-Reentry`.
Der erlaubte Reentry-Scope ist Artifact-Probe, Root-Cause und Counterprobe gegen die aktive Retrain-Lineage `bt93y-retrain-lineage-v1`.

## Fehlerbild
`docs/bot-training/Bot_Trainingsplan.md` enthaelt keinen aktiven Abschnitt `## Block BT93R-Reentry` und keine offenen Reentry-Checkboxen.
Die erste sichtbare offene Folgephase im Master ist `93S.1`, aber `BT93S` ist laut Dependency-Tabelle, Lock-Status, No-Go-Regel und BT93Y-Closure bis `BT93R-Reentry.99 in R-Allowlist` blockiert.

## Reproduktion
1. `git pull --rebase` -> Branch `bot-training` aktuell.
2. `npm.cmd run plan:check` -> PASS.
3. `Select-String` auf `docs/bot-training/Bot_Trainingsplan.md` nach `BT93R-Reentry` und `93R.*` -> nur Handoff-/No-Go-Referenzen, kein aktiver Reentry-Block.
4. `Get-Content data/training/ppo/bt93y/bt93y_closure_gate_report.json` -> `claimFlags.bt93rReentryAllowed=true`, `opensNext=[BT93R-Reentry]`.

## Betroffene Dateien
- `docs/bot-training/Bot_Trainingsplan.md`
- `data/training/ppo/bt93y/bt93y_closure_gate_report.json`
- `data/training/ppo/bt93y/bt93r_reentry_manifest.json`
- `docs/plaene/neu/BT93Y_PPO_Lineage_Recovery_Retraining_ReplacementPolicy_Intake_2026-04-30.md`

## Bereits durchgefuehrte Schritte
- Branch-/Planstatus geprueft.
- BT93Y-Closure-Evidence gelesen.
- BT93S/O/P/94A-Blocker gegen den Master abgeglichen.
- Kein BT93S-Start und keine Master-Block-Erfindung ausgefuehrt.

## Aktueller Status
Geschlossen durch Master-Aktivierung: `docs/bot-training/Bot_Trainingsplan.md` enthaelt jetzt einen eigenen, freien `BT93RR`-Block mit operativem Alias `BT93R-Reentry`, DoD, Scope, Phasen `93RR.1` bis `93RR.99`, Lock-Status und Dependency-/Roadmap-Eintrag.
Der alte rote `BT93R.99=model-artifact-missing` bleibt historische Wahrheit; `BT93S` bleibt bis `BT93RR.99 in R-Allowlist` blockiert.

## Naechster Schritt
Naechster `/fix-planung` kann `BT93RR`/`BT93R-Reentry` claimen und mit `93RR.1` starten.
