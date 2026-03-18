# Next Agent Prompt: Bot-Training DeepLearning Server V34

Arbeite im Projekt `c:\Users\gunda\Desktop\CurviosCLash` weiter.

## Auftrag

Setze den Plan `docs/Feature_Bot_Training_DeepLearning_Server_V34.md` um.

Prioritaet fuer den naechsten Chat:

1. `34.0` Contract- und Laufzeit-Freeze
2. `34.1` Trainer-Server-Fundament
3. `34.2` Replay- und Datenpipeline

## Scope (erste Iteration)

1. `scripts/trainer-server.mjs` (Bootstrap auf echten Trainerpfad)
2. neues `trainer/**` (Server, Session, Replay, Config)
3. optional `src/entities/ai/training/WebSocketTrainerBridge.js` nur fuer zwingende Handshake-/Readiness-Fixes
4. neue V34-Tests unter `tests/**` (klar getrennte Dateien)
5. Doku-Update in `docs/**` (append-only)

## Nicht anfassen in dieser Iteration

1. `index.html`, `src/ui/menu/**` (kein UI-Umbau)
2. Gameplay-Kernmodule ausserhalb Bridge-/Training-Lane
3. grosse Refactors in unbeteiligten Subsystemen

## Verbindliche Reihenfolge

1. WS-Vertrag und Failure-Policy finalisieren
2. Trainer-Session-Loop mit Message-Routing implementieren
3. Replay-Buffer + Transition-Validierung einbauen
4. deterministische lokale Integration (Bridge <-> Trainer) nachweisen

## Mindest-Verifikation

1. neue V34 Unit-/Integrations-Tests
2. lokaler Bridge-Run mit `start_training_bridge.bat --episodes 100 --seeds 11 --modes hunt-2d`
3. `npm run test:core`
4. `npm run docs:sync`
5. `npm run docs:check`
6. `npm run build`

## Abschlussformat

1. Geaenderte/neu erzeugte Module
2. WS-Vertrag + Datenfluss (`request`, `step`, `ack`)
3. Verifikation mit PASS/FAIL je Befehl
4. Offene Risiken + naechste Phase (`34.3`)
