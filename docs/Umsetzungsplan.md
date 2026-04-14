# Umsetzungsplan (Master-Index)

Stand: 2026-04-15. Status-Fliesstext, Abgleich-Historie und abgeschlossene Block-Zusammenfassungen liegen in `docs/plaene/CHANGELOG.md`.
Naechste offene Subphase: `64.1.1` (siehe `docs/plaene/aktiv/V64.md`). Aktuelle Intake-Drafts: `docs/plaene/neu/`.

Dieser Master ist der kompakte Index fuer aktive Arbeit.
Kanonische Blockdetails liegen in den jeweiligen Dateien unter `docs/plaene/aktiv/`.
Neue oder geaenderte Intake-Entwuerfe entstehen weiter unter `docs/plaene/neu/`.
Archivierte oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.
Inaktive bzw. zurueckgestellte Eintraege liegen in `docs/prozess/Backlog.md`.
Aktueller Intake-Draft aus dem Audit 2026-04-10: `docs/plaene/neu/Feature_Toolchain_Security_Dependency_Upgrade_2026-04-10.md` (Vorschlag V90, noch nicht aktiv).

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
| V71 | Repo-Aufraeumen Runtime-sicher | done | P1 | frei | V43-Strukturvertrag | 71.99 | `docs/plaene/aktiv/V71.md` |
| V72 | Gameplay-Powerups, Portale und Gates | done | P1 | frei | V69.99 | 72.99 | `docs/plaene/aktiv/V72.md` |
| V85 | Persistence-, Content-Contracts und Schema-Migrationen | done | P2 | frei | V83.99 | 85.99 | `docs/plaene/aktiv/V85.md` |
| V87 | Runtime-Hardening-Followup | done | P2 | frei | V83.99 | 87.99 | `docs/plaene/aktiv/V87.md` |
| V88 | Testarchitektur und Verifikationsvertraege | done | P2 | frei | V87.99 | 88.99 | `docs/plaene/aktiv/V88.md` |
| V89 | Desktop-first Testarchitektur und Desktop-Verifikation | done | P1 | frei | V74.99,V88.99 | 89.99 | `docs/plaene/aktiv/V89.md` |
| V86 | Editor- und Map-Authoring-Vertraege | planned | P2 | frei | V72.99 | 86.1 | `docs/plaene/aktiv/V86.md` |
| V77 | Desktop Vollversion Browser Demo Grenzen | done | P2 | frei | V74.99 | 77.99 | `docs/plaene/aktiv/V77.md` |
| V91 | Architektur-Ratchet und Legacy-Surface-Sunset | done | P2 | frei | V87.99,V77.99 | 91.99 | `docs/plaene/aktiv/V91.md` |
| V92 | Runtime-Application-Ownership-Entkopplung und Orchestrator-Zuschnitt | done | P2 | frei | V91.99 | 92.99 | `docs/plaene/aktiv/V92.md` |
| V64 | Desktop Hauptprodukt Multiplayer Online Offline Kompatibilitaet | planned | P2 | frei | V74.99,V77.99 | 64.1 | `docs/plaene/aktiv/V64.md` |
| V75 | Cinematic Recorder Desktop WebM-MP4 Stabilisierung | planned | P3 | frei | V74.99,V77.99,V64.99 | 75.1 | `docs/plaene/aktiv/V75.md` |
| V76 | Desktop Hangar Arcade Fight | planned | P3 | frei | V71.4,V74.99,V77.99,V64.99,V82.99 | 76.1 | `docs/plaene/aktiv/V76.md` |
| V82 | Arcade-Parcours Progression XP Flugzeug-Tuning | planned | P2 | frei | V72.99,V74.99 | 82.1 | `docs/plaene/aktiv/V82.md` |
| V81 | Developer Tuning Console (Steuerkonsole) | planned | P3 | frei | V74.99,V72.99,V91.99 | 81.1 | `docs/plaene/aktiv/V81.md` |
| V93 | Agent-Governance, Token-Effizienz und Workflow-Zuschnitt | planned | P2 | frei | - | 93.1 | `docs/plaene/aktiv/V93.md` |
| V94 | Wissensgraph als Query-Layer fuer Plaene, Scope-Files und Architektur-Surfaces | planned | P3 | frei | V93.99 | 94.1 | `docs/plaene/aktiv/V94.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V64 | V74.99 | hard | ja | Desktop-Multiplayer muss Lifecycle-, Capability- und Composition-Grenzen aus V74 uebernehmen; keine neuen `game.*`- oder private-Facade-Backdoors |
| V64 | V50/V52 Netzwerk-Baseline | hard | ja | SessionAdapter-, Lobby-, Signaling- und `stateUpdate`-Grundvertraege bleiben verbindlich |
| V64 | V77.99 | hard | ja | Multiplayer darf das Verkaufsversprechen `Vollversion hostet, Demo joint` erst nach verankerter Surface-Policy umsetzen; V77.99 abgeschlossen 2026-04-15 |
| V71 | V43-Strukturvertrag | hard | ja | Root-/Editor-Schutz und `EditorPathContract` bleiben bis nach 71.4 verbindlich; 71.4 ist abgeschlossen |
| V71 | Playwright-/Warmup-Entstoerung fuer Restgate | hard | ja | `71.99` blockerfest abgeschlossen (2026-04-14): Root-/Cleanup-/Editor-/Plan-/Docs-Gates gruen; Build-Blocker `spawn EPERM` und Warmup-Historie in Fehlerberichten dokumentiert |
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
| V88 | V87.99 | hard | ja | Runtime-, Capability- und Playwright-Baseline aus `V87 87.99` ist blockerfest dokumentiert und als Startbasis fuer `V88` verfuegbar |
| V88 | V84.99 | soft | ja | Headless MatchKernel und gemeinsame GameMode-API liefern bevorzugte Kandidaten fuer niedrigere Contract-Testschichten unterhalb von Playwright |
| V89 | V74.99 | hard | ja | Desktop-first-Tests duerfen keine `main.js`-/Runtime-Backdoors neu aufziehen; Runtime-/Capability-Grenzen aus V74 bleiben verbindlich |
| V89 | V88.99 | hard | ja | Die neue Desktop-Testpyramide baut auf der in V88 dokumentierten Failure-Taxonomie, dem Test-Mapping und den bestehenden Verifikationsvertraegen auf |
| V89 | V77.99 | soft | ja | Die Surface-Policy `Desktop Vollversion / Browser Demo` ist mit V77.99 verankert; V89 bleibt abgeschlossen |
| V91 | V87.99 | hard | ja | Architektur-Ratchet und Legacy-Surface-Sunset bauen auf dem gehaerteten Runtime-, Lifecycle- und Capability-Kern aus V87 auf |
| V91 | V77.99 | hard | ja | Guard-Matrix und Surface-nahe Sunset-Regeln sollen auf der verbindlichen `desktop-app`-/`browser-demo`-Policy aufsetzen; V77.99 abgeschlossen 2026-04-15 |
| V91 | V89.99 | soft | ja | Desktop-first-Tests und `node-contract` liefern die bevorzugten kleinen Verifikationspfade fuer neue Architektur-Ratchets |
| V92 | V91.99 | hard | ja | Ownership-Folgeblock baut auf dem blockerfesten Legacy-Surface-Sunset und den Guard-Ratchets aus V91 auf |
| V92 | V89.99 | soft | ja | Desktop-first-Gates und `node-contract` liefern die bevorzugten kleinen Verifikationspfade fuer den Ownership-Zuschnitt |
| V92 | V77.99 | soft | ja | Surface- und Capability-Policy aus V77 bleibt die verbindliche Grenze fuer Diagnostics-, Tooling- und Browser-Demo-Verbrauch |
| V64 | V91.99 | soft | ja | Multiplayer-Produktisierung sollte denselben Legacy-Sunset- und Guard-Ratchet konsumieren, bevor neue Runtime-Surfaces wachsen; V91.99 abgeschlossen 2026-04-15 |
| V64 | V92.99 | soft | ja | Multiplayer-Use-Cases sollen den Ownership-Zuschnitt aus V92 konsumieren, bevor neue Runtime-, UI- oder Port-Hotspots wachsen; V92.99 abgeschlossen 2026-04-15 |
| V86 | V72.99 | hard | ja | Editor- und Authoring-Vertraege sollen auf stabilen Pickup-, Portal-, Gate- und Spawn-Warnpfaden aus V72 aufsetzen |
| V86 | V85.99 | soft | ja | Descriptor-, Preset- und Template-Leseweg konsumiert den in V85 finalisierten Content-Vertrag jetzt als Baseline |
| V86 | V92.99 | soft | ja | Runtime-nahe Authoring-Integrationen sollen denselben Ownership- und Capability-Schnitt lesen statt neue Glue-Bypaesse aufzubauen; V92.99 abgeschlossen 2026-04-15 |
| V77 | V74.99 | hard | ja | Die Surface-Leitplanke fuer `Desktop Vollversion` vs `Browser Demo` darf erst auf der stabilisierten Runtime-/Capability-Basis aus V74 verankert werden |
| V75 | V74.99 | hard | ja | Recorder-Finalisierung muss denselben Lifecycle-/Dispose-Vertrag wie V74 nutzen; keine parallelen Sonderpfade fuer Stop, Return-to-Menu oder Shutdown |
| V75 | V77.99 | hard | ja | Export-, Download- und Browser-Fallbacks muessen der Demo-/Vollversions-Politik aus V77 folgen; V77.99 abgeschlossen 2026-04-15 |
| V75 | V64.99 | hard | nein | Recorder-Polish folgt erst nach dem produktiven Host-/Join-Hauptpfad |
| V75 | V72 Recorder-/Telemetry-Result-Codes | soft | nein | Nur relevant, falls Export-Diagnostik gemeinsam mit Gameplay-Result-Codes vereinheitlicht wird |
| V76 | V71.4 | hard | ja | Vehicle-Lab- und Editor-Pfade sind seit `71.4` migrationssicher ueber Contracts/Guards abgesichert |
| V76 | V77.99 | hard | ja | Hangar, Werkstatt und Editoren muessen die in V77 definierte Vollversions-/Demo-Rollenlogik uebernehmen; V77.99 abgeschlossen 2026-04-15 |
| V76 | V64.99 | hard | nein | Hangar-/Werkstatt-Flows starten erst nach dem festgezogenen Produktbild fuer Host/Join und Browser-Demo |
| V76 | V74.99 | hard | ja | Hangar darf `main.js`, `GameRuntimeFacade` oder breite Desktop-Backdoors nicht erneut aufblasen; Navigations-/Composition-Grenzen aus V74 sind verbindlich |
| V82 | V72.99 | hard | ja | Stabile Pickup-/Portal-/Gate-Vertraege als Basis fuer erweiterte Checkpoint-Logik und Parcours-Arcade-Vereinigung |
| V82 | V74.99 | hard | ja | Runtime-Entkopplung muss abgeschlossen sein fuer saubere State-Komposition (XP, Leaderboard, Ghost) |
| V82 | V92.99 | soft | ja | UI-/HUD-/Overlay-nahe Progressionsarbeit soll den Ownership-Zuschnitt aus V92 konsumieren, bevor weitere Last in `MatchFlowUiController` oder Runtime-Hotspots landet; V92.99 abgeschlossen 2026-04-15 |
| V76 | V82.99 | hard | nein | V76.3 Arcade-Hangar baut direkt auf V82-Contracts (XP, Upgrades, Leaderboard) auf; V82 muss vor V76.3 abgeschlossen sein |
| V81 | V74.99 | hard | ja | Tuning Console liest/schreibt CONFIG_BASE und nutzt ActiveRuntimeConfigStore; Runtime-Entkopplung muss abgeschlossen sein |
| V81 | V72.99 | hard | ja | Parameter-Registry muss auf stabiler Pickup-Registry und Config-Struktur aufbauen |
| V81 | V77 Surface-Policy | soft | nein | Console ist Dev-Only-Feature; sollte V77-Capability-Vertrag respektieren, blockiert aber nicht |
| V81 | V91.99 | hard | ja | Developer-Tuning soll Runtime-Config-Ownership nicht ueber alte Global-Slots vertiefen, sondern auf dem in V91 geharteten Contract aufsetzen; V91.99 abgeschlossen 2026-04-15 |
| V81 | V92.99 | soft | ja | Developer-Tooling soll den Ownership-Zuschnitt aus V92 konsumieren, bevor neue Runtime-Bridge-, Port- oder Global-Surface-Backdoors entstehen; V92.99 abgeschlossen 2026-04-15 |
| V94 | V93.99 | hard | nein | Wissensgraph-Build parst Master-Index und Plan-Frontmatter; setzt die V93-Entlastung des Masters (Kopf-Fliesstext raus, Dependency-Tabelle eingedampft) und das `gates:pre-commit`-Meta-Gate aus V93.5.1 voraus |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V64 | - | frei | Nach `V77.99` `64.1` Transportmatrix und Capability-Modell fuer `Host Vollversion / Join Demo` konkretisieren |
| - | V71 | 2026-04-14 | closed | Abgeschlossen 2026-04-14: `71.99` blockerfest geschlossen (`71.99.1` Root-/Cleanup-Check gruen, Build reproduzierbar `spawn EPERM` dokumentiert; `71.99.2` Editor-/Plan-/Docs-Gates gruen; `71.99.3` Ignore-Artefakte klassifiziert) |
| - | V72 | 2026-04-15 | closed | Abgeschlossen 2026-04-15: `72.99` Gate gruen; alle drei Pflicht-Gates (plan:check, docs:sync, docs:check) und test:contract (120/120) bestanden; V72 freischaltet V82, V86 und V81 |
| - | V74 | - | frei | Abgeschlossen 2026-04-03: `74.99` Gate gruen, Folgebloecke mit `V74.99` koennen anlaufen |
| - | V83 | - | closed | Abgeschlossen 2026-04-04: `83.99` Gate gruen; Folgebloecke V84/V85 mit `V83.99` koennen anlaufen |
| - | V84 | 2026-04-04 | closed | Abgeschlossen 2026-04-05: `84.99.2` dokumentiert Headless-Boot, GameMode-API und Runtime-Projektionsvertrag fuer Folgearbeit |
| - | V85 | 2026-04-12 | closed | Abgeschlossen 2026-04-13: `85.99.2` synchronisiert DoD, Versionsmatrix-, Migrations- und Capability-Leitplanken fuer additive Folgefeatures |
| - | V87 | - | closed | Abgeschlossen 2026-04-10: `87.99.1` Gate-Checks gruen; Restcluster `physics-core`/`physics-hunt`/`physics-policy` als gezielte Folgearbeit dokumentiert |
| - | V88 | - | closed | Abgeschlossen 2026-04-10: `88.99.2` synchronisiert Test-Mapping, Failure-Taxonomie und Doku auf den blockerfesten Gate-Stand |
| - | V89 | - | closed | Abgeschlossen 2026-04-12: `89.99.2` synchronisiert Browser-/Desktop-/Contract-Layer widerspruchsfrei; `desktop-smoke` bleibt gruen, `node-contract`-Restfehler `T97` blockerfest dokumentiert |
| - | V86 | - | frei | Nach `V72.99` Authoring-Vertrag zwischen Editor, Templates, Serializer und Runtime-Presets konkretisieren |
| - | V77 | - | closed | Abgeschlossen 2026-04-15: `77.99` Gate gruen; Surface-Vertrag, Entscheidungsraster, Fallback-Contract-Tests und Dev-only-Expert-Policy sind konsistent verankert |
| - | V91 | 2026-04-15 | closed | Abgeschlossen 2026-04-15: `91.99` Gate gruen; Guard-Matrix, Boundary-/Ratchet-/Metrics-Checks, PlatformCapabilityData-Split, Lifecycle-/Capability-Contract-Tests, Feature-Start-Checkliste und Governance-Spiegelung (V64/V81/V82/V86, test_mapping) abgeschlossen; V64 und V81 haben ihre V91.99-Abhaengigkeit jetzt erfuellt |
| - | V92 | 2026-04-15 | closed | Abgeschlossen 2026-04-15: `92.99` Gate gruen; Hotspots im migrierten Scope reduziert, Restadapter explizit auf `GameRuntimePorts`-Transition-Helfer und `MatchFlowTransitionHotspots` begrenzt, globale Runtime-Surfaces nur noch Publish-/Cleanup-Diagnostics |
| - | V75 | - | frei | Exportstrategie/Finalize-Port erst nach `V64.99` auf denselben Lifecycle- und Surface-Vertrag heben |
| - | V76 | - | frei | Desktop-Hangar-Contract erst nach `V64.99` und unter `V77`-/`V74`-Leitplanken aufnehmen |
| - | V82 | - | frei | Nach `V72.99` und `V74.99` mit `82.1` daten- und regelnah starten; UI-/HUD-/Overlay-Schnitte sollen den Ownership-Zuschnitt aus `V92` konsumieren |
| - | V81 | - | frei | Nach `V92.99`, `V91.99`, `V74.99` und `V72.99` mit `81.1` Registry und Bridge starten |
| - | V93 | - | frei | Governance-, Regel- und Workflow-Zuschnitt fuer Agentenarbeit synchronisieren, ohne bestehende Block-Gates aufzubrechen |
| - | V94 | - | frei | Nach `V93.99` Wissensgraph als generiertes JSON-Artefakt (`docs/generated/knowledge-graph.json`) plus Build-/Check-Scripts und Gate-Einhaengung als sekundaeren Query-Layer verankern |

## Empfohlene Reihenfolge

Die Reihenfolge dient als operative Leitplanke fuer neue Starts. Harte Abhaengigkeiten bleiben verbindlich; soft dependencies und Produktreihenfolge entscheiden die Priorisierung innerhalb der moeglichen Starts.

### Sofort laufende oder naechste Abschluesse

1. `V92` als naechsten Architektur-Folgeblock nach abgeschlossenem `V91.99` anziehen, damit Application-Layer, Runtime-Ports und globale Diagnostics-Surfaces vor weiterer Produktarbeit sauber zugeschnitten werden.
2. `V82` daten- und regelnahe Phasen nach abgeschlossenem `V72.99` anziehen; UI-/HUD-/Overlay-lastige Teile sollen den Ownership-Zuschnitt aus `V92` mitlesen.
3. `V64` mit `64.1` erst nach `V92` produktiv transport- und capability-seitig konkretisieren, damit Multiplayer nicht erneut in Fassade, Ports oder UI-Hotspots waechst.
4. `V81` nach `V92.99` mit derselben Runtime-Config-Ownership starten, damit keine alten Global-Slots oder neue Runtime-Bridge-Bypaesse reaktiviert werden.

### Hauptpfad Architektur und Produkt

1. `V87 -> V88 -> V89` ist abgeschlossen; kuenftige Blocks laufen damit auf desktop-first-Gates statt browser-first-Harness.
2. `V85` ist abgeschlossen; Folgeblocks nutzen denselben Daten-/Persistenzrahmen jetzt als verpflichtende Baseline statt als offenen Ausbaupfad.
3. `V77` vor `V91`, damit Surface-Policy und Produktrollen vor dem haerteren Guard- und Sunset-Ratchet verbindlich sind.
4. `V91` vor `V92`, damit Guard-Ratchet und Legacy-Surface-Sunset die Ausgangsbasis fuer Ownership-Schnitt und Orchestrator-Zuschnitt sind.
5. `V92` vor `V64` und `V81`, damit Multiplayer-Produktisierung und Developer-Tuning keine neuen Runtime-, Port- oder Config-Backdoors auf alte Surfaces bauen.
6. `V64` vor `V75`, weil Recorder-Polish erst nach dem produktiven Desktop-Host-/Join-Hauptpfad kommen soll.

### Parallelpfad Gameplay und Authoring

1. `V82` kann nach `V72.99` und `V74.99` anlaufen und bleibt der empfohlene erste Gameplay-Folgeblock, weil er Daten- und Progressionsvertraege fuer `V76` liefert; UI-/HUD-/Overlay-nahe Phasen lesen dabei denselben Ownership-Zuschnitt wie `V92`.
2. `V86` folgt nach `V72.99` und nutzt die in `V85` abgeschlossene Descriptor-, Template- und Preset-Leitplanke ohne neue Parallelpfade; runtime-nahe Glue-Pfade sollen dabei denselben Ownership-Schnitt wie `V92` lesen.
3. `V76` folgt nach `V64.99`, `V77.99` und `V82.99`, weil Hangar-/Werkstatt-Flows sowohl Produktrollen als auch Arcade-Datenvertraege voraussetzen.
4. `V81` bleibt fachlich moeglich, ist aber bewusst hinter `V92` nachrangig, damit die Tuning-Bridge nicht erneut globale Runtime- oder Config-Backdoors aufzieht.

### Kurzform

`V72.99 -> V77 -> V91 -> V92 -> V64 -> V75`

Parallel nach `V72.99` moeglich: `V82` in daten- und regelnahen Phasen, spaeter `V76`; `V86` nutzt den abgeschlossenen V85-Vertragsrahmen als Baseline und sollte bei Runtime-/Capability-Verbrauch denselben V92-Ownership-Schnitt lesen; `V81` nach `V92` oder spaetestens mit denselben Guard-Leitplanken. Die desktop-first-Hauptgates aus `V89` sind jetzt die Baseline fuer Folgearbeit am Desktop-Hauptprodukt.

## Aufgeschobene Fixes (Code-Review 2026-04-03)

Abgleich-Fliesstext und Stand-Snapshots liegen in `docs/plaene/CHANGELOG.md`. Dieser Abschnitt pflegt nur noch den offenen P-Backlog.
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
| P21 | `package.json`, `package-lock.json` | `npm audit` meldet 5 Befunde (2 high, 3 moderate); Dependency-Security ist als neuer Intake-Draft `V90` vorbereitet, aber noch nicht als aktiver Block uebernommen | hoch |
| P22 | `tmp/`, `.codex_tmp/`, `assets/models/jets/cc0/spaceship_pack/dist/*` | Ignore-Artefakte sind seit `V71 71.99.3` klassifiziert, aber weiterhin repo-schwergewichtig; Hygiene bleibt als Folgearbeit fuer Retention-/Enttracking offen | mittel |
| P23 | `src/ui/menu/MenuExpertLoginRuntime.js` | Hartcodiertes Expertenpasswort `1307` darf nicht als Sicherheitsbarriere gelten; V77/V81 muessen es als Dev-only-/Surface-Policy klaeren | mittel |
| P24 | `tests/playwright.global-setup.js`, `dev/scripts/verify-lock.mjs`, `scripts/run-playwright-*.mjs` | `spawn EPERM` blockiert weiter `test:contract`, `test:smoke` und `test:targeted`; blockerfest dokumentiert, aber als eigene Root-Cause- oder Fallback-Arbeit weiter offen | hoch |
| P25 | `scripts/run-playwright-targeted-clusters.mjs` | Cluster laufen sequentiell und ohne abgestufte Degradation; isolierte Clusterfehler kosten unverhaeltnismaessig viel Laufzeit und Aussagekraft | mittel |
| P26 | `tests/core-targeted.shared.js` | Test-Barrel exportiert sehr breit; Abhaengigkeiten zwischen `core-targeted`-Specs bleiben opak und aenderungsanfällig | mittel |
| P27 | `docs/plaene/aktiv/*.md`, `docs/Umsetzungsplan.md` | Evidence-Strings sind teils laenger als der eigentliche Arbeitsnachweis; Governance bleibt nachvollziehbar, aber die Lesbarkeit der Plaene sinkt | niedrig |
| P28 | `src/shared/contracts/MatchRuntimeProjectionContract.js` | 8 neue Traversal-Felder hinzugefuegt ohne Versions-Bump (`match-runtime-projection.v1` unveraendert); Alt-Consumer erhalten neue Felder als `undefined` ohne Unterscheidung ob fehlendes Feld oder aelterer Producer | mittel |
| P29 | `src/core/recording/DownloadService.js` | Fehlender Null-Guard fuer `downloadHandler` vor Browser-Adapter-Aufruf (Zeile 139); inkonsistente Warning-Akkumulation zwischen `api-throw`- und `api-failed`-Branches | mittel |
| P30 | `src/shared/contracts/ArcadeMissionContract.js` | `getArcadeMissionRegistryDescriptor()` wird nur in Tests aufgerufen, nicht zur Laufzeit; API-Surface klaeren (behalten als Debug-/Introspection-API oder entfernen) | niedrig |
| P31 | `tests/content-descriptor-registries.contract.test.mjs`, `tests/platform-capabilities.contract.test.mjs` | Keine Immutability-Tests fuer `Object.freeze()`-gesicherte Content-Descriptor-Registries und Surface-Policy-Objekte; Freeze-Verletzungen wuerden unbemerkt durchgehen | niedrig |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | Playwright-Verifikation fuer V74 scheiterte zusaetzlich an BOM+Shebang im Governance-Skript | UTF-8-no-BOM geschrieben; Parserblocker beseitigt, verbleibender Harness-Blocker separat dokumentiert | erledigt |
| 2026-04-02 | Agent-A | V72 (Agent-B lock) | `src/entities/player/PlayerInventoryOps.js` | Agent-A uebernimmt und erledigt 72.1.2 waehrend Agent-B locked war | 72.1 komplett umgesetzt: PlayerInventoryOps validiert selfUsable, blockiert Rockets; Umsetzungsplan aktualisiert auf 72.2 | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Explizite V74-Nachverifikation brach unter Windows bereits vor Playwright mit `spawn EINVAL` ab | Smoke-Launcher auf lokale Playwright-CLI plus separator-neutrale Filter umgestellt; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/verify-lock.mjs` | Gezielte Playwright-Reruns trafen Windows-Dateifilter und CLI-Aufloesung nicht stabil | Playwright-Aufrufe auf lokale CLI gehoben und Spec-Filter separator-neutral normalisiert; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | Browser-Runs luden `tests/*.test.mjs` mit `node:test` mit und endeten in `No tests found` statt echter Spec-Auswahl | Discovery auf `**/*.spec.js` begrenzt; verbliebener Vite-HTTP-Timeout in V74-Fehlerbericht festgehalten | erledigt |

