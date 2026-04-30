# Fehlerbericht: BT93Y.99 Build-Gate durch `typecheck:architecture` blockiert

- Datum: 2026-04-30
- Block: BT93Y
- Phase: 93Y.99
- Status: offen

## Task-Kontext
`BT93Y.99` wurde als Closure-Gate fuer Lineage-Recovery, Retraining-Lineage, Ersatzvergleichspolitik und den neuen `BT93R-Reentry` ausgefuehrt. Das Bot-Training-Gate selbst schreibt `bt93rReentryAllowed=true` und oeffnet nur `BT93R-Reentry`.

## Fehlerbild
`npm.cmd run gates:pre-commit` ist nach `npm.cmd run graph:build` gruen. `npm.cmd run build` bricht anschliessend in `typecheck:architecture` ab. Die Fehler liegen in bestehenden Runtime-/Recorder-/Network-/Contract-Dateien ausserhalb des BT93Y-Scope.

## Reproduktion
1. `npm.cmd run gates:pre-commit` -> PASS
2. `npm.cmd run build`
3. `tsc -p tsconfig.architecture.json` meldet TS2322/TS2339/TS2345/TS2367 in bestehenden Architektur-Typecheck-Surfaces

## Betroffene Dateien (Auszug)
- `src/core/MediaRecorderSystem.js`
- `src/core/recording/MediaRecorderExportFinalizeOps.js`
- `src/core/recording/RecordingVideoExportContract.js`
- `src/core/renderer/CameraRigSystem.js`
- `src/core/renderer/RecordingCapturePipeline.js`
- `src/core/runtime/MatchStartValidationService.js`
- `src/network/OnlineSessionAdapter.js`
- `src/network/PeerConnectionManager.js`
- `src/shared/contracts/MultiplayerSessionContract.js`
- `src/shared/contracts/PlatformSurfacePolicyOps.js`

## Bereits durchgefuehrte Schritte
- `python python/scripts/bt93y_closure_gate.py --write-reports` -> PASS, `resultClass=retrain-lineage-ready-bt93r-reentry-ready`
- `npm.cmd run graph:build` -> Graph-Drift bereinigt
- `npm.cmd run gates:pre-commit` -> PASS
- `npm.cmd run build` -> FAIL bei `typecheck:architecture`

## Aktueller Status
BT93Y-Closure-Evidence ist gruen und beruehrt keine produktiven Runtime-/Matchstart-/AI-Hub-Dateien. Der globale Build bleibt wegen bestehender Architektur-Typecheck-Restschuld blockiert und ist nicht durch den naechsten Bot-Training-`/fix-planung`-Schritt zu beheben.

## Naechster Schritt
Fuer Bot Training: naechster `/fix-planung`-Scope bleibt `BT93R-Reentry` als Artifact-Probe, Root-Cause und Counterprobe. Fuer den globalen Build: separaten Architektur-Recovery-Scope aus `V105`/P48 priorisieren und danach `npm.cmd run build` erneut verifizieren.
