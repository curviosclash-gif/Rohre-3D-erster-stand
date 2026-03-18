# Next Agent Prompt: Bot-Modus-Spezialbots V31

Arbeite im Projekt `c:\Users\gunda\Desktop\CurviosCLash` weiter.

Wichtig: Erst revalidieren, dann implementieren. Nicht auf alten Annahmen aufbauen.

## Auftrag

Fuehre den Plan `docs/Feature_Bot_Modus_Spezialbots_V31.md` um.

Ziel:

1. Pro Match genau einen Bot-Typ laden.
2. Bot-Typ automatisch aus Moduswahl bestimmen.
3. Genau vier Match-Bots unterstuetzen:
   - `classic-3d`
   - `classic-2d`
   - `hunt-3d`
   - `hunt-2d`

## Fachliche Klarstellung

Die Spielauswahl funktioniert fachlich so:

1. Zuerst waehlt der Nutzer `normal` oder `fight`.
2. Danach waehlt der Nutzer `3d` oder `planar`.
3. `fight` entspricht technisch dem Hunt-Modus.
4. `normal` entspricht technisch dem Classic-Modus.
5. `planar` entspricht technisch `planarMode=true`.

Verbindliche Match-Regel:

1. Im selben Match wird nur eine Bot-Art verwendet.
2. Es gibt keine Bot-Auswahl pro Slot.
3. Alle Bots eines Matches werden aus demselben aufgeloesten Bot-Typ erzeugt.

Verbindliches Mapping:

1. `normal` im UI bzw. `classic` technisch + `3d` -> `classic-3d`
2. `normal` im UI bzw. `classic` technisch + `planar` -> `classic-2d`
3. `fight/hunt + 3d` -> `hunt-3d`
4. `fight/hunt + planar` -> `hunt-2d`

## Parallelregel zu V32

Falls parallel eine Trainingsumgebung umgesetzt wird, gilt:

1. V31 besitzt die Match-Bot-Auswahl.
2. V31 fasst `src/entities/ai/training/**`, `src/state/training/**` und Training-Skripte nicht an.
3. V31 arbeitet nur an Resolver, Registry, Match-Wiring, mode-bezogenen Tests und Doku.

## Startblock

1. `AGENTS.md` und relevante `.agents` Regeln/Workflows lesen.
2. Nur lesend revalidieren:
   - `git status --short`
   - `git diff --name-status`
   - `git log --oneline -n 10`
3. Diese Dateien lesen:
   - `docs/Feature_Bot_Modus_Spezialbots_V31.md`
   - `docs/Umsetzungsplan.md`
   - `docs/Bot-Training-Schnittstelle.md`
   - `docs/ai_architecture_context.md`
4. Diese Codepfade revalidieren:
   - `src/core/RuntimeConfig.js`
   - `src/entities/runtime/EntitySetupOps.js`
   - `src/entities/ai/BotPolicyTypes.js`
   - `src/entities/ai/BotPolicyRegistry.js`
   - `src/entities/ai/BotRuntimeContextFactory.js`
   - `src/entities/ai/ObservationBridgePolicy.js`
   - `src/ui/menu/MenuGameplayBindings.js`
   - `src/state/MatchSessionFactory.js`
   - `tests/physics-policy.spec.js`

## Erwartete Befunde vor Implementierung

1. Aktuell wird nur grob `classic` vs. `hunt` aufgeloest.
2. `planarMode` ist bisher eher Kontext als Auswahlkriterium fuer den konkreten Bot-Typ.
3. `EntitySetupOps` verwendet heute genau einen aufgeloesten Bot-Typ pro Match, was fachlich korrekt bleiben soll.
4. Revalidierter UI-Fluss:
   - Ebene 2: `Fight` oder `Normal`
   - Ebene 3: nur `3d` oder `planar`
   - `Fight` -> `HUNT`
   - `Normal` -> `CLASSIC`
   - Ebene 3 darf die Ebene-2-Auswahl nicht ueberschreiben

## Verbindliche Umsetzungsreihenfolge

1. Neue stabile Bot-Typen einfuehren.
2. Resolver fuer `gameMode + planarMode` bauen.
3. `RuntimeConfig` auf den neuen Resolver umstellen.
4. `EntitySetupOps` und `MatchSessionFactory` auf das neue Mapping ziehen.
5. Registry/Factories fuer die vier Match-Bots verdrahten.
6. Tests und Doku aktualisieren.

## Wichtige Umsetzungsregeln

1. Kein Mischbetrieb verschiedener Bot-Typen im selben Match.
2. Keine Slot-spezifische Bot-Auswahl einfuehren.
3. Observation-Schema V1 nicht ohne zwingenden Grund brechen.
4. Alte Fallbacks kontrolliert lassen, damit bestehende Tests nicht unnoetig kippen.
5. Neue Logik ueber Resolver/Registry kapseln, nicht ueber verstreute `if`-Ketten.
6. Keine Trainingsumgebungs-Module in dieser Lane anfassen.

## Besitz dieser Lane

Bevorzugte Dateien:

1. `src/core/RuntimeConfig.js`
2. `src/entities/ai/BotPolicyTypes.js`
3. `src/entities/ai/BotPolicyRegistry.js`
4. `src/entities/runtime/EntitySetupOps.js`
5. `src/state/MatchSessionFactory.js`
6. `tests/physics-policy.spec.js`

## Mindest-Verifikation

1. `npx playwright test tests/physics-policy.spec.js -g "T73:|T74:|T79:|T81:|T82:" --workers=1`
2. `npm run test:core`
3. `npm run docs:sync`
4. `npm run docs:check`

Wenn neue Tests hinzukommen, dann gezielt fuer:

1. `normal + 3d`
2. `normal + planar`
3. `fight + 3d`
4. `fight + planar`

## Abschlussformat

Die finale Ausgabe soll enthalten:

1. Welche Dateien geaendert wurden
2. Welcher Resolver jetzt das vierfache Mapping uebernimmt
3. Welche Tests neu/angepasst wurden
4. Exakte Verifikation mit PASS/FAIL
5. Offene Risiken oder bewusst verschobene Erweiterungen
