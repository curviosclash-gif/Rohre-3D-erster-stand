# Umsetzungsplan (Master-Index)

Stand: 2026-04-08 (V88 Testarchitektur und Verifikationsvertraege ist als naechster Architektur-/Verifikationsblock eingeplant; V87 87.99 hat Pflicht-Gates plus `test:smoke` gruen, der engere `dev-runtime`-Vertrag fuer `test:targeted` laeuft ohne Harness-Abbruch und ist frisch auf 23 FAIL neu geschnitten; echte Produktionsreste liegen jetzt in `physics-core`/`physics-hunt`/`physics-policy`, waehrend `core-targeted` im Voll-Lauf nur noch `page.goto`-/Harness-Signale zeigt; V72 bleibt in 72.3 aktiv)

Dieser Master ist der kompakte Index fuer aktive Arbeit.
Kanonische Blockdetails liegen in den jeweiligen Dateien unter `docs/plaene/aktiv/`.
Neue oder geaenderte Intake-Entwuerfe entstehen weiter unter `docs/plaene/neu/`.
Archivierte oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.
Inaktive bzw. zurueckgestellte Eintraege liegen in `docs/prozess/Backlog.md`.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Master werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Eintraege gepflegt.

## Lesereihenfolge

1. `docs/Umsetzungsplan.md` fuer aktive Bloecke, Abhaengigkeiten, Locks und Conflict-Log.
2. `docs/plaene/aktiv/VXX.md` fuer kanonische Blockdetails, DoD, Risiken, `scope_files`, Verifikation und Phasen.
3. `docs/plaene/neu/*.md` nur fuer neue oder ueberarbeitete Intake-Entwuerfe.
4. `docs/plaene/alt/*.md` nur fuer historische oder abgeloeste Planstaende.

## Aktive Bloecke

### Abgeschlossene Bloecke (Referenz fuer Abhaengigkeiten)

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V74 | Architektur-Runtime-Entkopplung (Refresh) | done | P1 | frei | V58.99,V60.3 | 74.99 | `docs/plaene/alt/V74.md` |
| V83 | Architektur SessionRuntime und Plattform-Capabilities | done | P1 | frei | V74.99 | 83.99 | `docs/plaene/alt/V83.md` |
| V84 | Headless MatchKernel und einheitliche GameMode-API | done | P2 | frei | V83.99 | 84.99 | `docs/plaene/alt/V84.md` |

### Aktive und geplante Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V71 | Repo-Aufraeumen Runtime-sicher | blocked | P1 | frei | V43-Strukturvertrag,Playwright-Warmup | 71.99 | `docs/plaene/aktiv/V71.md` |
| V72 | Gameplay-Powerups, Portale und Gates | active | P1 | Agent-B | V69.99 | 72.3 | `docs/plaene/aktiv/V72.md` |
| V85 | Persistence-, Content-Contracts und Schema-Migrationen | planned | P2 | frei | V83.99 | 85.1 | `docs/plaene/aktiv/V85.md` |
| V87 | Runtime-Hardening-Followup | active | P2 | Bot-Codex | V83.99 | 87.99 | `docs/plaene/aktiv/V87.md` |
| V88 | Testarchitektur und Verifikationsvertraege | planned | P2 | frei | V87.99 | 88.3 | `docs/plaene/aktiv/V88.md` |
| V86 | Editor- und Map-Authoring-Vertraege | planned | P2 | frei | V72.99 | 86.1 | `docs/plaene/aktiv/V86.md` |
| V77 | Desktop Vollversion Browser Demo Grenzen | planned | P2 | frei | V74.99 | 77.1 | `docs/plaene/aktiv/V77.md` |
| V64 | Desktop Hauptprodukt Multiplayer Online Offline Kompatibilitaet | planned | P2 | frei | V74.99,V77.99 | 64.1 | `docs/plaene/aktiv/V64.md` |
| V75 | Cinematic Recorder Desktop WebM-MP4 Stabilisierung | planned | P3 | frei | V74.99,V77.99,V64.99 | 75.1 | `docs/plaene/aktiv/V75.md` |
| V76 | Desktop Hangar Arcade Fight | planned | P3 | frei | V71.4,V74.99,V77.99,V64.99,V82.99 | 76.1 | `docs/plaene/aktiv/V76.md` |
| V82 | Arcade-Parcours Progression XP Flugzeug-Tuning | planned | P2 | frei | V72.99,V74.99 | 82.1 | `docs/plaene/aktiv/V82.md` |
| V81 | Developer Tuning Console (Steuerkonsole) | planned | P3 | frei | V74.99,V72.99 | 81.1 | `docs/plaene/aktiv/V81.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V64 | V74.99 | hard | ja | Desktop-Multiplayer muss Lifecycle-, Capability- und Composition-Grenzen aus V74 uebernehmen; keine neuen `game.*`- oder private-Facade-Backdoors |
| V64 | V50/V52 Netzwerk-Baseline | hard | ja | SessionAdapter-, Lobby-, Signaling- und `stateUpdate`-Grundvertraege bleiben verbindlich |
| V64 | V77.99 | hard | nein | Multiplayer darf das Verkaufsversprechen `Vollversion hostet, Demo joint` erst nach verankerter Surface-Policy umsetzen |
| V71 | V43-Strukturvertrag | hard | ja | Root-/Editor-Schutz und `EditorPathContract` bleiben bis nach 71.4 verbindlich; 71.4 ist abgeschlossen |
| V71 | Playwright-/Warmup-Entstoerung fuer Restgate | hard | nein | `71.99` Abschluss-Gate blockiert; `tests/playwright.global-setup.js` mit `fetch failed`/Warmup-Hang offen |
| V72 | V69.99 | hard | ja | Fight/Hunt-Item-, Rocket- und Shield-Baseline aus V69 bleibt Ausgangspunkt fuer Pickup-/Portal-/Gate-Vertraege |
| V72 | Legacy-/Migrationspfad fuer Gate-/Portal-Validierung | hard | nein | Vor hartem Fail muessen sichtbare Warn-, Diagnose- oder Migrationspfade fuer bestehende Maps umgesetzt werden |
| V74 | V58.99 | hard | ja | Architektur-Guard- und Budget-Baseline aus V58 bleibt die verbindliche Ausgangsbasis |
| V74 | V60.3 | hard | ja | V60.3 dokumentiert das Zielbild fuer Rest-Orchestratoren und dient als Referenz fuer die Runtime-Entkopplung |
| V74 | V70.99 | soft | ja | Settings-/Preset-Pfade im Runtime-/Menue-Lifecycle muessen bei Refactors mitgeprueft werden |
| V74 | V67/V68 Abschlussstand | soft | ja | Multiplayer- und Arcade-Lifecycle aus V67/V68 liefern den Regression-Scope fuer Start-/Return-Pfade |
| V83 | V74.99 | hard | ja | SessionRuntime-, Command/Event- und Capability-Folgeschnitt setzt die Runtime-Entkopplung aus V74 als Baseline voraus |
| V83 | V77 Surface-Policy | soft | entfallen | V83 ohne diese soft-dep abgeschlossen; Capability-Grenzen werden in V77 eigenstaendig verankert |
| V83 | V67/V68 Abschlussstand | soft | ja | Arcade- und Multiplayer-Lifecycle aus den Altbloecken liefern den Regression-Scope fuer Runtime-Kern, Lobby-Service und Finalize-Contracts |
| V84 | V83.99 | hard | ja | Headless MatchKernel und GameMode-API bauen auf dem SessionRuntime-, Command/Event- und Capability-Vertrag aus V83 auf |
| V84 | V72.99 | soft | entfallen | V84 ohne diese soft-dep abgeschlossen; Powerup-/Gate-Vertraege fliessen spaeter ueber V86/V82 ein |
| V84 | V82.99 | soft | entfallen | V84 ohne diese soft-dep abgeschlossen; Arcade-Progressionsregeln fliessen spaeter ueber V82 ein |
| V85 | V83.99 | hard | ja | Versionierte Persistence- und Content-Vertraege sollen erst nach stabilisiertem Runtime-, Capability- und Legacy-Sunset-Vertrag aufsetzen |
| V85 | V84.99 | soft | ja | Headless Kernel und GameMode-API liefern spaeter den saubereren Verbrauchspfad fuer Replay-, Snapshot- und Content-Projektionen |
| V87 | V83.99 | hard | ja | Runtime-Hardening-Follow-up setzt den SessionRuntime-, Command/Event- und Capability-Kern aus V83 als Baseline voraus |
| V87 | V84.99 | soft | ja | Dokumentierter Headless-Boot- und Projektionsvertrag aus V84 soll mit den gehaerteten Runtime-Pfaden abgeglichen werden |
| V88 | V87.99 | hard | nein | Testarchitektur soll auf dem in `V87` geklaerten Runtime-, Capability- und Playwright-Vertrag aufsetzen statt denselben Scope parallel neu zu verhandeln |
| V88 | V84.99 | soft | ja | Headless MatchKernel und gemeinsame GameMode-API liefern bevorzugte Kandidaten fuer niedrigere Contract-Testschichten unterhalb von Playwright |
| V86 | V72.99 | hard | nein | Editor- und Authoring-Vertraege sollen auf stabilen Pickup-, Portal-, Gate- und Spawn-Warnpfaden aus V72 aufsetzen |
| V86 | V85.99 | soft | nein | Descriptor-, Preset- und Template-Leseweg soll spaeter denselben Content-Vertrag wie V85 nutzen |
| V77 | V74.99 | hard | ja | Die Surface-Leitplanke fuer `Desktop Vollversion` vs `Browser Demo` darf erst auf der stabilisierten Runtime-/Capability-Basis aus V74 verankert werden |
| V75 | V74.99 | hard | ja | Recorder-Finalisierung muss denselben Lifecycle-/Dispose-Vertrag wie V74 nutzen; keine parallelen Sonderpfade fuer Stop, Return-to-Menu oder Shutdown |
| V75 | V77.99 | hard | nein | Export-, Download- und Browser-Fallbacks muessen der Demo-/Vollversions-Politik aus V77 folgen |
| V75 | V64.99 | hard | nein | Recorder-Polish folgt erst nach dem produktiven Host-/Join-Hauptpfad |
| V75 | V72 Recorder-/Telemetry-Result-Codes | soft | nein | Nur relevant, falls Export-Diagnostik gemeinsam mit Gameplay-Result-Codes vereinheitlicht wird |
| V76 | V71.4 | hard | ja | Vehicle-Lab- und Editor-Pfade sind seit `71.4` migrationssicher ueber Contracts/Guards abgesichert |
| V76 | V77.99 | hard | nein | Hangar, Werkstatt und Editoren muessen die in V77 definierte Vollversions-/Demo-Rollenlogik uebernehmen |
| V76 | V64.99 | hard | nein | Hangar-/Werkstatt-Flows starten erst nach dem festgezogenen Produktbild fuer Host/Join und Browser-Demo |
| V76 | V74.99 | hard | ja | Hangar darf `main.js`, `GameRuntimeFacade` oder breite Desktop-Backdoors nicht erneut aufblasen; Navigations-/Composition-Grenzen aus V74 sind verbindlich |
| V82 | V72.99 | hard | nein | Stabile Pickup-/Portal-/Gate-Vertraege als Basis fuer erweiterte Checkpoint-Logik und Parcours-Arcade-Vereinigung |
| V82 | V74.99 | hard | ja | Runtime-Entkopplung muss abgeschlossen sein fuer saubere State-Komposition (XP, Leaderboard, Ghost) |
| V76 | V82.99 | hard | nein | V76.3 Arcade-Hangar baut direkt auf V82-Contracts (XP, Upgrades, Leaderboard) auf; V82 muss vor V76.3 abgeschlossen sein |
| V81 | V74.99 | hard | ja | Tuning Console liest/schreibt CONFIG_BASE und nutzt ActiveRuntimeConfigStore; Runtime-Entkopplung muss abgeschlossen sein |
| V81 | V72.99 | hard | nein | Parameter-Registry muss auf stabiler Pickup-Registry und Config-Struktur aufbauen |
| V81 | V77 Surface-Policy | soft | nein | Console ist Dev-Only-Feature; sollte V77-Capability-Vertrag respektieren, blockiert aber nicht |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V64 | - | frei | Nach `V77.99` `64.1` Transportmatrix und Capability-Modell fuer `Host Vollversion / Join Demo` konkretisieren |
| - | V71 | - | frei | `71.99` nach Warmup-Entstoerung oder belastbarem Restgate schliessen |
| Agent-B | V72 | 2026-04-02 | active | `72.2` abgeschlossen; `72.3` Portal-/Gate-Vertraege haerten steht an |
| - | V74 | - | frei | Abgeschlossen 2026-04-03: `74.99` Gate gruen, Folgebloecke mit `V74.99` koennen anlaufen |
| - | V83 | - | closed | Abgeschlossen 2026-04-04: `83.99` Gate gruen; Folgebloecke V84/V85 mit `V83.99` koennen anlaufen |
| - | V84 | 2026-04-04 | closed | Abgeschlossen 2026-04-05: `84.99.2` dokumentiert Headless-Boot, GameMode-API und Runtime-Projektionsvertrag fuer Folgearbeit |
| - | V85 | - | frei | Nach `V83.99` mit `85.1` Dateninventar, Versionsmatrix und Migrationsrahmen starten |
| Bot-Codex | V87 | 2026-04-05 | active | Frischer Voll-Lauf vom 2026-04-08 schneidet `test:targeted` auf 23 FAIL neu; offen bleiben die Produktionscluster `physics-core`/`physics-hunt`/`physics-policy`, waehrend `core-targeted` im Voll-Lauf nur noch `page.goto`-/Harness-Signale (`T1`, `V56.1`) liefert |
| Bot-Codex | V88 | 2026-04-09 | active | `88.3.1` Browser-Suites entlang ihrer Vertragscluster schneiden und fuer gezielte Reruns vorbereiten |
| - | V86 | - | frei | Nach `V72.99` Authoring-Vertrag zwischen Editor, Templates, Serializer und Runtime-Presets konkretisieren |
| - | V77 | - | frei | Nach `V74.99` die Surface-Leitplanke fuer `Desktop Vollversion` vs `Browser Demo` und die itch.io-Produktrollen festziehen |
| - | V75 | - | frei | Exportstrategie/Finalize-Port erst nach `V64.99` auf denselben Lifecycle- und Surface-Vertrag heben |
| - | V76 | - | frei | Desktop-Hangar-Contract erst nach `V64.99` und unter `V77`-/`V74`-Leitplanken aufnehmen |
| - | V82 | - | frei | Nach `V72.99` und `V74.99` mit `82.1` Arcade-Parcours-Vereinigung starten; liefert Daten-Contracts fuer V76.3 |
| - | V81 | - | frei | Nach `V74.99` und `V72.99` mit `81.1` Registry und Bridge starten |

## Empfohlene Reihenfolge

Die Reihenfolge dient als operative Leitplanke fuer neue Starts. Harte Abhaengigkeiten bleiben verbindlich; soft dependencies und Produktreihenfolge entscheiden die Priorisierung innerhalb der moeglichen Starts.

### Sofort laufende oder naechste Abschluesse

1. `V72` bis `72.99` weiterziehen, weil Pickup-, Portal-, Gate- und Spawn-Vertraege mehrere Folgeblocks freischalten.
2. `V87` sauber bis zum dokumentierten Abschluss oder belastbaren Restgate weiterziehen, damit offene Runtime-Rennen und der verbleibende `87.99`-Cluster nicht in Folgearbeit weitergetragen werden.
3. `V88` direkt nach `V87.99` starten, damit Laufmodi, Readiness-Fixtures, Suite-Zuschnitte und niedrigere Contract-Layer fuer weitere Architekturarbeit stabil werden.
4. `V71.99` opportunistisch schliessen, sobald der Playwright-/Warmup-Blocker belastbar entschaerft oder sauber blockerfest dokumentiert ist.

### Hauptpfad Architektur und Produkt

1. `V87` vor `V88`, weil die Testarchitektur auf einem geklaerten Runtime- und Playwright-Vertrag aufsetzen soll statt denselben Scope parallel weiter zu vermischen.
2. `V88` vor `V85`, damit neue Daten-, Content- und Folgeblocks auf expliziten Verifikationsmodi und kleineren Failure-Clustern aufsetzen.
3. `V85` vor breiterem Authoring- und Content-Ausbau, damit Presets, Templates, Replay- und Content-Descriptoren einen gemeinsamen Vertragsrahmen bekommen.
4. `V77` vor `V64`, damit die Produkt- und Surface-Policy `Desktop Vollversion / Browser Demo` vor Multiplayer-Produktisierung feststeht.
5. `V64` vor `V75`, weil Recorder-Polish erst nach dem produktiven Desktop-Host-/Join-Hauptpfad kommen soll.

### Parallelpfad Gameplay und Authoring

1. `V82` kann nach `V72.99` und `V74.99` anlaufen und ist der empfohlene erste Gameplay-Folgeblock, weil er Daten- und Progressionsvertraege fuer `V76` liefert.
2. `V86` folgt nach `V72.99` bevorzugt hinter `V85`, damit Editor-, Template- und Preset-Lesewege moeglichst direkt auf denselben Content-Vertrag aufsetzen.
3. `V76` folgt nach `V64.99`, `V77.99` und `V82.99`, weil Hangar-/Werkstatt-Flows sowohl Produktrollen als auch Arcade-Datenvertraege voraussetzen.
4. `V81` bleibt nach `V72.99` und `V74.99` moeglich, ist aber bewusst nachrangig gegenueber Produkt-, Runtime- und Progressionsarbeit.

### Kurzform

`V72.99 -> V87 -> V88 -> V85 -> V77 -> V64 -> V75`

Parallel nach `V72.99` moeglich: `V82 -> V76`; `V86` bevorzugt nach `V85`; `V81` zuletzt oder opportunistisch.

## Aufgeschobene Fixes (Code-Review 2026-04-03)

Identifiziert durch 24h-Commit-Review. Sofort-Fixes (P3, P5, P13) sind bereits committed.
Abgleich 2026-04-05: `V87 87.1.1` ist dokumentiert. `P1` ist im aktuellen Code-Stand bereits ueber `provisionalId` plus `_pendingSessionInit` guardiert; `P2`, `P4`, `P8`, `P9`, `P10`, `P11`, `P15`, `P16` und `P20` bleiben offene V87-Arbeit.
`V87 87.1.2` ordnet fuer diese offenen Punkte Zielmodul, Besitzerpfad und Sunset-Kriterium; die kanonische Matrix lebt in `docs/plaene/aktiv/V87.md` und gespiegelt in `docs/referenz/ai_architecture_context.md`.
`V87 87.2.1` haertet jetzt den Start-/Finalize-Determinismus: `MatchLifecycleSessionOrchestrator` merged Pending-Finalizes und blockiert ueberholte Neustarts, `GameRuntimeSessionHandler` besitzt den autoritativen Start-Inflight-Guard und `SessionRuntimeCommandExecutor.START_MATCH` nutzt keinen separaten Snapshot-Bypass mehr.
Abgleich 2026-04-06: `V87 87.2.2` schliesst `P4` und `P11`; Finalize-Fehler bleiben jetzt ueber Snapshot-/Guard-State sichtbar, `dispose()` wartet den Finalize-Abschluss ab und fehlgeschlagene Return-to-Menu-Finalizes triggern kein neues Prewarm mehr.
Abgleich 2026-04-06 (spaet): `V87 87.3.1` schliesst `P8` und `P15`; `APPLY_SETTINGS` sowie `START_MATCH(settingsSnapshot)` nutzen jetzt denselben `RuntimeCommandSettingsService`, `MatchFlowUiController` fuehrt keinen zweiten Settings-Apply mehr aus und async Command-Caller koennen ueber `executeSessionRuntimeCommandResult()` einen settlebaren Fehlervertrag konsumieren. Offene V87-Arbeit bleiben `P2`, `P9`, `P10`, `P16` und `P20`.
Abgleich 2026-04-07: `V87 87.3.1` ist gegen den Ist-Code verifiziert und im Settled-API-Pfad nachgeschaerft; `executeSessionRuntimeCommandResult()` liefert fuer ungueltige Commands jetzt ebenfalls einen expliziten `invalid_command`-Fehlervertrag statt `undefined`.
Abgleich 2026-04-07 (spaet): `V87 87.3.2` schliesst `P10`; `ElectronPlatformBridge` und die Browser-Capability-Adapter leiten `available`, Intent-Erzeugung, Support-Flags und `degradedReason` jetzt aus derselben Invoke-Basis ab, Browser-Noop-Fallbacks fuer Desktop-only-Capabilities entfallen. Offene V87-Arbeit bleiben `P2`, `P9`, `P16` und `P20`.
Abgleich 2026-04-07 (spaeter): `V87 87.4.1` schliesst `P2` und `P9`; `MatchFlowUiController` setzt den Start-Inflight-Guard jetzt vor der eigentlichen Startarbeit, und `PauseOverlayController` plus `GameRuntimeSessionHandler` sprechen fuer Resume und `pause_menu_return` denselben `pauseLease`-/Snapshot-Revalidierungsvertrag. Offene V87-Arbeit bleiben `P16` und `P20`.
Abgleich 2026-04-07 (nachts): `V87 87.4.2` schliesst `P16` und `P20`; `SessionRuntimeStateMachine` erlaubt `FINALIZING -> MENU` nur noch nach explizitem `match_finalized`-/`menu_opened`-Abschluss, `MatchLifecycleSessionOrchestrator` haelt Cleanup deterministisch in `finalizing` bis `match_finalized`, und `SessionRuntimeObservability` trimmt die History ueber bounded-copy statt `splice()`. Offene V87-Arbeit wechselt auf `87.5.1`; im aktuellen Scope bleibt kein Restloch mehr bei FINALIZING-/MENU-Transitionen, Cleanup-Umgehung oder Observability-History.
Abgleich 2026-04-07 (spaet nachts): `V87 87.5.1` spiegelt `V64`, `V75` und `docs/referenz/ai_architecture_context.md` auf denselben geharteten Runtime-Vertrag; Folgearbeit konsumiert FINALIZING, MENU-Abschluss, Cleanup und Observability jetzt explizit ueber Runtime-Commands, Snapshots, Events und Capability-Ports. Nach dem Doku-Abgleich bleibt im aktuellen V87-Scope kein Dokumentations- oder Verbrauchsloch mehr offen; Restarbeit wechselt auf `87.99`.
Abgleich 2026-04-07 (Gate, spaet): `V87 87.99` zieht jetzt auch `npm run test:smoke` gruen. Der alte Playwright-Startblocker ist getrennt: `test:targeted` nutzt fuer Browser-Source-Imports wieder einen dev-server-basierten Vertrag statt Preview-only, die runspezifischen Logs enthalten keine `fetch failed`-/`probe-timeout`-Signale mehr. `V87` bleibt dennoch in `87.99` blockiert; die dauerhafte Blockerdoku liegt in `docs/Fehlerberichte/2026-04-07_v87-runtime-hardening-87.99-playwright-blockers.md`.
Abgleich 2026-04-08 (Rebaseline): Der engere `dev-runtime`-Vertrag fuer `test:targeted` ist mit genau einem frischen Lauf (`TEST_PORT=5588 PW_RUN_TAG=v87-targeted-dev-20260408 PW_OUTPUT_DIR=test-results/v87-targeted-dev-20260408 npm run test:targeted`) neu gebaselined. Die Startup-Diagnostik meldet `serverReady=true`, `shellReady=true`, `ready=true`, aber `appReady=false` bei `appBootState=menu_shell_ready`; wegen `strictPrewarm=false` laeuft die Suite dennoch ohne Harness-Abbruch bis in die Assertions. Ergebnis nach 28.3 Minuten: 105 PASS / 35 FAIL / 1 flaky / 3 skipped / 124 did not run; Cluster: `core-targeted=12`, `physics-core=2`, `physics-hunt=16`, `physics-policy=5`. Kleinster sinnvoller Folgeabschnitt fuer `V87 87.99` ist `87.99.3` mit `core-targeted` zuerst; `physics-hunt` und `physics-policy` folgen danach getrennt.
Abgleich 2026-04-08 (Fortsetzung `87.99.3`): Der erste `core-targeted`-Sequencing-Slice ist im Produktionscode fortgesetzt. Fokussierte `core-targeted`-Reruns schliessen `:6993`, `:7182`, `:7434`, `:7986`, `:8041` und `:8516`; direkte `node`-Repros bestaetigen denselben Fix auch fuer `:7249` und `:8664`. Die bekannten Browser-`page.goto`-Flakes ueberdecken einzelne Reruns weiter, deshalb bleibt der globale `dev-runtime`-/`test:targeted`-Baseline-Stand bis zum naechsten konsolidierten Lauf bewusst unveraendert.
Abgleich 2026-04-08 (Restabschluss `87.99.3`): `MatchSessionFactory` leert die Match-Scene vor einem frischen Init ohne bestehende Session nicht mehr vorzeitig, und `MapSchemaSanitizeOps` erkennt authored Portal-Paare aus Presets jetzt als echte Endpunkte. Fokussierte `core-targeted`-Reruns schliessen damit `:6889` und `:8403`; der anschliessende konsolidierte Browser-Rerun zieht `:6777`, `:7249` und `:8664` gruen nach. Offen bleibt im `core-targeted`-Umfeld nur noch `tests/core-targeted.spec.js:297` (`T14`) als bekannter `page.goto`-/Harness-Flake. Ein konsolidierter `dev-runtime`-/`test:targeted`-Lauf ist damit wieder sinnvoll, um die verbleibenden `physics-*`-Cluster neu zu schneiden.
Abgleich 2026-04-08 (Konsolidierter Vollrerun): Der frische Voll-Lauf `TEST_PORT=5593 PW_RUN_TAG=v87-targeted-dev-rerun-20260408 PW_OUTPUT_DIR=test-results/v87-targeted-dev-rerun-20260408 npm run test:targeted` endet nach 56.0 Minuten mit 104 PASS / 23 FAIL / 1 flaky / 2 skipped / 138 did not run. Der neue Schnitt zeigt keine `core-targeted`-Produktionsfails mehr; stattdessen ueberdecken `tests/core-targeted.spec.js:158` (`T1`) und `:6720` (`V56.1`) den Slice als `page.goto`-/Harness-Flakes, waehrend die echten Produktionscluster jetzt auf `physics-core=2`, `physics-hunt=16` und `physics-policy=4` zusammenschrumpfen. Ein kleiner Folgefix haertet `GameRuntimeSessionHandler.startMatch()` darauf, asynchrone `applyStartMatchProjection()`-Promises nicht mehr sofort auf `true` zu verkuerzen; der dazugehoerige fokussierte Browser-Rerun blieb erneut vom `page.goto`-Flake ueberdeckt, deshalb bleibt die 23-Fail-Baseline der belastbare Stand.
Die folgenden Punkte werden nach Abschluss des jeweiligen Blocks adressiert.

### Im Runtime-Hardening-Follow-up V87 zu adressieren (betrifft scope_files von V83/V87)

Keine offenen Review-Punkte mehr im V87-Scope; `87.5.1` ist dokumentiert, offen bleibt nur noch das `87.99` Abschluss-Gate.

### In Folgeblocks oder eigenstaendig (nicht in V83/V87 scope_files)

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P6 | `PortalLayoutBuilder.js` | Portal-Slot-Modulo erzeugt identische Positionen bei `slots.length < 8` | hoch |
| P7 | `vulkan_odyssey.js` | Precision-Plattformen (4x2 Einheiten) vermutlich unspielbar | hoch |
| P12 | `CheckpointRingMeshFactory.js` | Material-Leak: jeder Checkpoint bekommt neues Material ohne Disposal | mittel |
| P14 | `UIStartSyncController.js` | Event-Listener-Duplikation bei Mehrfachaufruf von `setupStartSetupControls()` | mittel |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | Playwright-Verifikation fuer V74 scheiterte zusaetzlich an BOM+Shebang im Governance-Skript | UTF-8-no-BOM geschrieben; Parserblocker beseitigt, verbleibender Harness-Blocker separat dokumentiert | erledigt |
| 2026-04-02 | Agent-A | V72 (Agent-B lock) | `src/entities/player/PlayerInventoryOps.js` | Agent-A uebernimmt und erledigt 72.1.2 während Agent-B locked war | 72.1 komplett umgesetzt: PlayerInventoryOps validiert selfUsable, blockiert Rockets; Umsetzungsplan aktualisiert auf 72.2 | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Explizite V74-Nachverifikation brach unter Windows bereits vor Playwright mit `spawn EINVAL` ab | Smoke-Launcher auf lokale Playwright-CLI plus separator-neutrale Filter umgestellt; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/verify-lock.mjs` | Gezielte Playwright-Reruns trafen Windows-Dateifilter und CLI-Aufloesung nicht stabil | Playwright-Aufrufe auf lokale CLI gehoben und Spec-Filter separator-neutral normalisiert; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | Browser-Runs luden `tests/*.test.mjs` mit `node:test` mit und endeten in `No tests found` statt echter Spec-Auswahl | Discovery auf `**/*.spec.js` begrenzt; verbliebener Vite-HTTP-Timeout in V74-Fehlerbericht festgehalten | erledigt |
