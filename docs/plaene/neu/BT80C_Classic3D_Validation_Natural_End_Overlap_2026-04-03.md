# BT80C Classic-3D Validation Natural-End Overlap (2026-04-03)

## Anlass

- BT80C `80.9.3` ist nach dem Matchstart-Fix und der BT-Runner-/Budget-Haertung weiter offen.
- `bot:validate` erreicht in `preview` wieder sauber `PLAYING`, aber die feste Validation-Lane liefert fuer `classic-3d` keinen natuerlichen `ROUND_END`/`MATCH_END`.

## BT-Evidence

- `tmp/bt80c-debug-report-90s-nobuild.json`: `preview-build=false`, `scenarioCount=1`, `rounds=1`, `matchTimeout=90000` -> `forced-round`/`timeout-round`.
- `tmp/bt80c-debug-report-150s-nobuild.json`: `preview-build=false`, `scenarioCount=1`, `rounds=1`, `matchTimeout=150000` -> `PLAYING`, alle drei Spieler `alive`, `roundsRecorded=0`.
- Lokale Preview-Probe 2026-04-03:
  - `classic-3d` nah an V1: `standard` 3D 2 Bots, `maze` 3D 2 Bots, `maze` 3D 3 Bots -> jeweils nach ca. 45s weiter `PLAYING`, `roundsRecorded=0`.
  - Aggressivere BT-nahe Varianten: `standard` 3D mit 6 Portalen, `complex` 3D mit 3 Bots und 4 Portalen -> ebenfalls nach ca. 40s weiter `PLAYING`, `roundsRecorded=0`.
- `scripts/bot-benchmark-baseline.mjs` dokumentiert fuer die Validation-Lane bereits `seedMode: "none"` bzw. fehlenden expliziten RNG-Seed-Haken.

## Schlussfolgerung

- Der Restblocker liegt nicht mehr an Matchstart, Preview-Build oder Runner-Budget.
- Der BT-Harness kann den Fehler sauber eingrenzen, aber nicht mehr allein aufloesen:
  - Die feste `classic-3d`-Matrix terminiert im aktuellen Runtime-Verhalten nicht verlaesslich natuerlich.
  - Fuer eine wirklich feste, reproduzierbare Validation-Lane fehlt ein deterministischer Seed-/Starthebel auf normaler Runtime-/Session-Oberflaeche oder alternativ eine bewusst geaenderte Gameplay-Terminalsemantik.

## Vermuteter Normal-Scope

- Runtime-/Session-Seed oder Startparameter fuer Validation/Quickstart exponieren.
- Oder klaren Produktvertrag schaffen, wie `classic-3d` in der Validation-Lane natuerlich terminieren soll.

Moeglich betroffene Dateien:

- `src/core/GameDebugApi.js`
- `src/core/main.js`
- `src/core/runtime/GameRuntimeCoordinator.js`
- `src/core/runtime/GameRuntimeSessionHandler.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- gegebenenfalls `src/state/validation/BotValidationService.js`

## Risiken

- Beruehrt den normalen Matchstart-/Session-Pfad, der gerade erst ueber Commit `4d7745e` stabilisiert wurde.
- Seed-/Start-Injektion kann Reproduzierbarkeit verbessern, aber auch neue Abhaengigkeiten zwischen Validation-Harness und Produkt-Runtime schaffen.
- Eine Aenderung der Terminalsemantik wuerde Benchmark-/Validation-Evidence im eingefrorenen Semantikfenster potenziell invalidieren.

## Nicht-Ziele

- Kein Champion-Wechsel.
- Kein stiller Wechsel an `docs/Umsetzungsplan.md`.
- Kein normaler Gameplay-/Runtime-Fix ohne ausdrueckliche User-Freigabe.

## Empfohlener naechster Schritt

1. User-Freigabe fuer normalen Folgeblock einholen.
2. Danach einen kleinen, isolierten Normal-Scope-Block aufmachen:
   - Entweder deterministische Seed-/Startoberflaeche fuer Validation,
   - oder explizite `classic-3d`-Terminalsemantik fuer die Validation-Lane.
3. Erst anschliessend zu BT80C `80.9.3` zurueckkehren und drei reproduzierbare Validation-Paesse neu aufbauen.
