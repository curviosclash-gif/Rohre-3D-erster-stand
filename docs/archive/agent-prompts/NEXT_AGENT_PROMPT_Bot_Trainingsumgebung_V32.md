# Next Agent Prompt: Bot-Trainingsumgebung V32

Arbeite im Projekt `c:\Users\gunda\Desktop\CurviosCLash` weiter.

Wichtig: Diese Lane ist auf Parallelbetrieb zu V31 ausgelegt. Nicht in die V31-Kerndateien greifen.

## Auftrag

Fuehre den Plan `docs/Feature_Bot_Trainingsumgebung_V32.md` um.

Ziel:

1. additive Trainingsumgebung bauen
2. bestehenden Observation-/Action-Vertrag stabil lassen
3. parallel zu V31 arbeiten koennen

## Strikte Parallelregel

Diese Lane fasst nicht an:

1. `src/core/RuntimeConfig.js`
2. `src/entities/ai/BotPolicyTypes.js`
3. `src/entities/ai/BotPolicyRegistry.js`
4. `src/entities/runtime/EntitySetupOps.js`
5. `src/state/MatchSessionFactory.js`
6. V31-Prompt und V31-Plan

Diese Lane besitzt:

1. `src/entities/ai/training/**`
2. `src/state/training/**` falls neu benoetigt
3. trainingsbezogene Skripte unter `scripts/**`
4. neue trainingsbezogene Tests
5. V32-Dokumente

## Fachliche Leitplanken

1. Kein Breaking Change an Observation-Schema V1.
2. Kein Breaking Change an BotActionContract V1.
3. Training darf intern vorlaeufig auf `mode + planarMode` als Domaenenbeschreibung setzen.
4. Spaetere Kopplung an den von V31 aufgeloesten Match-Bot-Typ bleibt optional und nachgelagert.

## Startblock

1. `AGENTS.md` und relevante `.agents` Regeln/Workflows lesen.
2. Nur lesend revalidieren:
   - `git status --short`
   - `git diff --name-status`
   - `git log --oneline -n 10`
3. Diese Dateien lesen:
   - `docs/Feature_Bot_Trainingsumgebung_V32.md`
   - `docs/Bot-Training-Schnittstelle.md`
   - `docs/ai_architecture_context.md`
   - `docs/Umsetzungsplan.md`
4. Diese Codepfade revalidieren:
   - `src/entities/ai/ObservationBridgePolicy.js`
   - `src/entities/ai/training/WebSocketTrainerBridge.js`
   - `src/entities/ai/observation/ObservationSystem.js`
   - `src/entities/ai/actions/BotActionContract.js`
   - `src/state/validation/BotValidationService.js`

## Verbindliche Umsetzungsreihenfolge

1. Trainingsvertrag modellieren
2. Episoden-/Reward-Schicht bauen
3. deterministischen Step-Runner additiv bauen
4. Transport-/Payload-Adapter vervollstaendigen
5. Trainings-/Eval-Skripte und Smokes anlegen
6. Doku und Gates abschliessen

## Mindest-Verifikation

1. neue gezielte Trainings-Tests
2. `npm run test:core`
3. `npm run docs:sync`
4. `npm run docs:check`

## Abschlussformat

Die finale Ausgabe soll enthalten:

1. Welche neuen Trainingsmodule entstanden sind
2. Wie `reset`/`step`/`reward`/`done` modelliert wurden
3. Welche Dateien bewusst nicht angefasst wurden, um V31 parallel nicht zu stoeren
4. Exakte Verifikation mit PASS/FAIL
5. Offene Restpunkte fuer spaeteres echtes Training
