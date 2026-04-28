# Umsetzungsplan (Master-Index)

Stand: 2026-04-29. Status-Fliesstext, Abgleich-Historie und abgeschlossene Block-Zusammenfassungen liegen in `docs/plaene/CHANGELOG.md`.
V82 abgeschlossen 2026-04-20 (82.99 Abschluss-Gate gruen). V97 abgeschlossen 2026-04-20 (97.99 Abschluss-Gate gruen). V86 abgeschlossen 2026-04-20 (86.99 Abschluss-Gate gruen). V98 abgeschlossen 2026-04-24 (98.99 Abschluss-Gate gruen). V101 abgeschlossen 2026-04-24 (101.99 Abschluss-Gate gruen). V103 abgeschlossen 2026-04-26 (103.99 Abschluss-Gate gruen). V75 abgeschlossen 2026-04-27 (75.99 Abschluss-Gate gruen). V76 abgeschlossen 2026-04-27 (76.99 Abschluss-Gate gruen). V104 als geplanter Architekturblock aufgenommen 2026-04-28. Deep-Audit 2026-04-22 verankerte Follow-up-Pakete als P32-P38 im Backlog; Deep-Code-Analyse 2026-04-24 ergaenzt P41-P46; Code-Review 2026-04-28 ergaenzt P47-P48 als Guard-/Typecheck-Recovery-Paket. Multiplayer-Lobby-Review 2026-04-28 erweitert `V99` um P49-P52 fuer Ready-/Delivery-/Disconnect-Truthfulness. Neuer Intake-Entwurf `V107` (kompletter Spiel-Wissensgraph als mehrschichtiger Query-Layer) wurde am 2026-04-29 unter `docs/plaene/neu/` angelegt. Verbleibende Intake-Drafts liegen in `docs/plaene/neu/` (V99, V100, V102, V105, V107).

Dieser Master ist der kompakte Index fuer aktive Arbeit.
Kanonische Blockdetails liegen in den jeweiligen Dateien unter `docs/plaene/aktiv/`.
Neue oder geaenderte Intake-Entwuerfe entstehen weiter unter `docs/plaene/neu/`.
Archivierte oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.
Inaktive bzw. zurueckgestellte Eintraege liegen in `docs/prozess/Backlog.md`.
Aktuelle Intake-Drafts aus den Audits 2026-04-10 bis 2026-04-29: `docs/plaene/neu/Feature_Toolchain_Security_Dependency_Upgrade_2026-04-10.md` (Vorschlag V90), `docs/plaene/neu/Feature_Desktop_Multiplayer_Signaling_Connectivity_Hardening_V99.md` (Vorschlag V99), `docs/plaene/neu/Feature_Runtime_Rebuild_Remount_UI_StartSync_Stabilisierung_V100.md` (Vorschlag V100), `docs/plaene/neu/Feature_Security_Runtime_Contract_Hardening_V102.md` (Vorschlag V102), `docs/plaene/neu/Feature_Architecture_Guard_Typecheck_Regression_Recovery_V105.md` (Vorschlag V105), `docs/plaene/neu/Feature_Kompletter_Spielwissensgraph_V107.md` (Vorschlag V107). `V101` wurde in den aktiven Block `docs/plaene/aktiv/V101.md` uebernommen und abgeschlossen.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Master werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Eintraege gepflegt.

## Lesereihenfolge

1. `docs/Umsetzungsplan.md` fuer aktive Bloecke, Abhaengigkeiten, Locks und Conflict-Log.
2. `docs/plaene/aktiv/VXX.md` fuer kanonische Blockdetails, DoD, Risiken, `scope_files`, Verifikation und Phasen.
3. `docs/plaene/neu/*.md` nur fuer neue oder ueberarbeitete Intake-Entwuerfe.
4. `docs/plaene/alt/*.md` nur fuer historische oder abgeloeste Planstaende.

## Aktive Bloecke

### Abgeschlossene Bloecke (aktuell referenziert)

Nur Abschluesse, die von offenen Deps aktiver Bloecke aktuell referenziert werden. Aeltere Abschluesse siehe `docs/plaene/archiv/abgeschlossene-bloecke.md`.

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V92 | Runtime-Application-Ownership-Entkopplung und Orchestrator-Zuschnitt | done | P2 | frei | V91.99 | 92.99 | `docs/plaene/aktiv/V92.md` |
| V103 | Settings-Domain Nachhaltigkeit, Mutationsvertrag und Erweiterungspfad | done | P2 | frei | V92.99 | 103.99 | `docs/plaene/aktiv/V103.md` |

### Abgeschlossene Bloecke (offener Abgleich vor Archivierung)

Nur Abschluesse, die formal `done` sind, aber vor Archivierung noch einen explizit dokumentierten Plan-/Evidence-Abgleich brauchen.

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V76 | Desktop Hangar Arcade Fight | done | P3 | frei | V71.4,V77.99,V64.99 | 76.99 | `docs/plaene/aktiv/V76.md` |

### Aktive und geplante Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V104 | Runtime- und UI-God-Object-Sunset mit Port-Zuschnitt | planned | P2 | frei | V92.99,V103.99 | 104.1 | `docs/plaene/aktiv/V104.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V72 | Legacy-/Migrationspfad fuer Gate-/Portal-Validierung | hard | ja | In `V72` umgesetzt (sichtbare Warn-, Diagnose- und Migrationspfade); Block ist abgeschlossen |
| V75 | V64.99 | hard | ja | V64 abgeschlossen 2026-04-18; native Recorder-Delivery kann beginnen |
| V75 | V72 Recorder-/Telemetry-Result-Codes | soft | nein | Nur relevant, falls Export-Diagnostik gemeinsam mit Gameplay-Result-Codes vereinheitlicht wird |
| V76 | V64.99 | hard | ja | V64 abgeschlossen 2026-04-18; Hangar-/Werkstatt-Flows koennen nach V82.99 beginnen |
| V76 | V82.99 | hard | ja | V82 abgeschlossen 2026-04-20; V76.3 Arcade-Hangar kann jetzt auf V82-Contracts (XP, Upgrades, Leaderboard) aufbauen |
| V81 | V77 Surface-Policy | soft | ja | Console nutzt expliziten Desktop-Capability-State (F7/IPC), Browser-Demo bleibt ohne produktiven Dev-Zugang |
| V95 | V77.99 | hard | ja | Surface-Policy aus V77 ist abgeschlossen; Settings Studio bleibt Desktop-only |
| V95 | V92.99 | hard | ja | Ownership-/Facade-Ratchet aus V92 ist abgeschlossen und bleibt Leitplanke fuer neue Config-Pfade |
| V95 | V81.99 | soft | nein | UI-/IPC-Synergien mit Developer-Tuning sinnvoll, aber nicht blockierend |
| V95 | V64.99 | soft | nein | Lifecycle-Polish kann Integrationsaufwand spaeter senken, ist aber kein Startblocker |
| V97 | V95.99 | hard | ja | V95 liefert die Settings-Studio-Basis; V97 haertet UX, Migration und Diagnose auf diesem Pfad |
| V97 | V77.99 | hard | ja | Surface-Policy aus V77 bleibt bindend; V97 bleibt Desktop-only |
| V97 | V92.99 | hard | ja | Ownership-/Facade-Ratchet aus V92 bleibt Leitplanke fuer neue Config-, Diagnose- und Migrationspfade |
| V97 | V81.99 | soft | nein | Dev-Tuning-/Diagnose-Synergien sind sinnvoll, aber kein Startblocker |
| V97 | V64.99 | soft | nein | Desktop-Lifecycle-Polish kann Fokus-/Dialoghaertung spaeter vereinfachen, blockiert aber nicht |
| V98 | V77.99 | hard | ja | Surface-Policy aus V77 bleibt die bindende Baseline fuer jede Demo-Begrenzung |
| V98 | V97.99 | hard | ja | V97 liefert die gehartete Settings-Studio-Basis fuer den neuen Demo-Grenzen-Bereich |
| V98 | V81.99 | soft | nein | Developer-Tuning-Synergien sind sinnvoll, aber kein Startblocker |
| V98 | V64.99 | soft | nein | Multiplayer-Rollen-/Transportkontext kann spaetere Demo-Regeln schaerfen, blockiert aber nicht |
| V103 | V92.99 | hard | ja | Ownership-/Facade-Ratchet aus V92 ist die bindende Leitplanke fuer nachhaltige Settings-Pfade und Store-/Facade-Zuschnitte |
| V103 | V98.99 | soft | ja | V98 haertet angrenzende Settings-Studio-/Policy-Pfade; sinnvoll als Synchronisationspunkt, aber kein Startblocker fuer den Core-Settings-Zuschnitt |
| V101 | V98.99 | hard | ja | V101 schliesst Typecheck-/Lint-/Contract-Hardening auf der V98-Resolverbasis ohne neue Guard-Verletzungen |
| V104 | V92.99 | hard | ja | V92 liefert Ownership-, Snapshot- und Legacy-Surface-Ratchet als verbindliche Baseline fuer weiteren Alias- und Port-Abbau |
| V104 | V103.99 | hard | ja | V103 liefert den schmalen Settings-Persistenz- und Mutationspfad, damit UI-Splits keine neuen Store-Bypaesse reaktivieren |
| V107 | V94.99 | hard | ja | V94 liefert den bestehenden Wissensgraph-, Schema- und Check-Pfad als verbindliche Baseline fuer die mehrschichtige Spielgraph-Erweiterung |
| V107 | V104.99 | soft | nein | Runtime-/UI-Port-Zuschnitt kann die Runtime-System-Modellierung vereinfachen, blockiert den Start des Graph-Ausbaus aber nicht |
| V107 | V105.99 | soft | nein | Guard-/Typecheck-Recovery reduziert Mapping-Drift in Runtime-/Contract-Pfaden, ist jedoch kein harter Startblocker |

## Lock-Status

Aktive Locks werden in `docs/lock-status/` verwaltet (pro Person eine JSON-Datei).
Siehe `docs/lock-status/README.md` fuer Anleitung und `npm run lock:status` fuer Live-Status.
Diese Tabelle bleibt als Validierungs-Ankerpunkt; der operative Status liegt in `docs/lock-status/`.

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V71 | 2026-04-14 | closed | Abgeschlossen 2026-04-14 |
| - | V72 | 2026-04-15 | closed | Abgeschlossen 2026-04-15 |
| - | V74 | - | closed | Abgeschlossen 2026-04-03 |
| - | V77 | - | closed | Abgeschlossen 2026-04-15 |
| - | V91 | 2026-04-15 | closed | Abgeschlossen 2026-04-15 |
| - | V92 | 2026-04-15 | closed | Abgeschlossen 2026-04-15 |
| - | V93 | 2026-04-14 | closed | Abgeschlossen 2026-04-14 |
| - | V64 | 2026-04-18 | closed | Abgeschlossen 2026-04-18 |
| - | V75 | 2026-04-27 | closed | Abgeschlossen 2026-04-27 |
| - | V76 | 2026-04-27 | closed | Abgeschlossen 2026-04-27 |
| - | V82 | - | frei | Siehe docs/lock-status/ |
| - | V81 | - | frei | Siehe docs/lock-status/ |
| - | V86 | - | frei | Siehe docs/lock-status/ |
| - | V94 | - | frei | Siehe docs/lock-status/ |
| - | V95 | - | frei | Siehe docs/lock-status/ |
| - | V97 | - | frei | Siehe docs/lock-status/ |
| - | V98 | - | frei | Siehe docs/lock-status/ |
| - | V103 | - | frei | Siehe docs/lock-status/ |
| - | V101 | - | closed | Abgeschlossen 2026-04-24 |
| - | V104 | - | frei | Siehe docs/lock-status/ |

## Empfohlene Reihenfolge

Die Reihenfolge dient als operative Leitplanke fuer neue Starts. Harte Abhaengigkeiten bleiben verbindlich; soft dependencies und Produktreihenfolge entscheiden die Priorisierung innerhalb der moeglichen Starts.

### Priorisierte Intake-Uebernahme (neu)

1. `V99` (Signaling/LAN/Connectivity-Hardening inkl. Lobby-Truthfulness-/Disconnect-Delta) als naechsten Intake-Prioritaetsblock uebernehmen.
2. Danach `V100` (Runtime-Rebuild/Remount/StartSync) nachziehen.
3. Danach `V104` (nachhaltiger God-Object-Sunset und UI-Port-Zuschnitt) einschieben.
4. Danach `V107` (kompletter Spiel-Wissensgraph als mehrschichtiger Query-Layer) uebernehmen.
5. Danach `V102` (Security-/Runtime-/Contract-Hardening aus Deep-Code-Analyse) uebernehmen.
6. Danach `V105` (Architecture-Guard- und Typecheck-Regression-Recovery aus Code-Review 2026-04-28) als gruensichernden Recovery-Block nachziehen.

### Sofort laufende oder naechste Abschluesse

1. `V76` ist abgeschlossen (`76.99`): Hangar-Entry, mode-spezifischer Save-Writeback und der gemeinsame Rueckgabe-Lifecycle sind per Contract-Smoke plus Build-/Gate-Run gruen verifiziert.
2. Naechste produktive Uebernahme bleibt `V99` inklusive der Multiplayer-Lobby-Funde `P49` bis `P52`, danach `V100`, `V104`, `V107`, `V102` und abschliessend `V105` entsprechend der Intake-Priorisierung.

### Hauptpfad Architektur und Produkt

1. `V87 -> V88 -> V89` ist abgeschlossen; kuenftige Blocks laufen damit auf desktop-first-Gates statt browser-first-Harness.
2. `V85` ist abgeschlossen; Folgeblocks nutzen denselben Daten-/Persistenzrahmen jetzt als verpflichtende Baseline statt als offenen Ausbaupfad.
3. `V77` vor `V91`, damit Surface-Policy und Produktrollen vor dem haerteren Guard- und Sunset-Ratchet verbindlich sind.
4. `V91` vor `V92`, damit Guard-Ratchet und Legacy-Surface-Sunset die Ausgangsbasis fuer Ownership-Schnitt und Orchestrator-Zuschnitt sind.
5. `V92` vor `V64` und `V81`, damit Multiplayer-Produktisierung und Developer-Tuning keine neuen Runtime-, Port- oder Config-Backdoors auf alte Surfaces bauen.
6. `V64` vor `V75`, weil native Recorder-Delivery und Desktop-Export erst nach dem produktiven Desktop-Host-/Join-Hauptpfad kommen sollen.
7. `V97` folgt nach `V95.99` als gezielter Produkt-Hardening-Block fuer Settings Studio; Erklaer-UX, Save-Vorschau und Migrationspfade koennen parallel zu Gameplay-Folgearbeit laufen, solange Desktop-only Surface-Policy und V92-Ratchet eingehalten bleiben.
8. `V98` folgt nach `V97.99` als Desktop-only Folgeblock fuer Browser-Demo-Begrenzung im Settings Studio; Browser bleibt read-only Consumer ueber einen expliziten Auslieferungspfad.
9. `V103` folgt auf dem durch `V53`, `V92`, `V95`, `V97` und `V98` vorbereiteten Settings-Pfad als nachhaltiger Core-Settings-Block; neue Funktionen sollen danach ueber stabile Domain-/Result-Vertraege statt Manager-Aufblaehung wachsen.
10. `V104` folgt nach `V100` als nachhaltiger Ownership- und Port-Block fuer die verbleibenden Runtime-/UI-God-Objects; Stabilitaets- oder Security-Fixes sollen danach auf denselben schmalen Erweiterungspfaden statt auf Sammelmodulen aufsetzen.
11. `V105` folgt nach `V99`, `V102` und `V104` als expliziter Recovery-Block fuer wieder gebrochene Boundary-/Typecheck-Gates; er schliesst die Guard-Signale erst dann, wenn die ueberlappenden Produkt- und Hardening-Pfade stabil eingefroren sind.

### Parallelpfad Gameplay und Authoring

1. `V76`, `V81` und `V94` sind abgeschlossen; Gameplay-/Authoring-Baselines sind gruensicher in den Produkt-Gates verankert.
2. Folgearbeit startet auf Intake-Bloecken (`V99`, `V100`, `V102`, spaeter `V105`) und nutzt weiterhin dieselben `V91`/`V92`-Ratchet- und Graph-Gates.

### Kurzform

`V99 -> V100 -> V104 -> V107 -> V102 -> V105`

Parallelisierbar im aktuellen Stand: `V76`, `V81` und `V94` sind abgeschlossen; `V94` liefert den verpflichtenden Graph-Query-Leseweg plus `graph:check` im Meta-Gate. `V99`, `V100`, `V104`, `V107` und anschliessend `V102` bleiben die priorisierten Intake-Uebernahmen; `V105` folgt danach als expliziter Guard-/Typecheck-Recovery-Block, sobald die ueberlappenden Produkt- und Security-Pfade eingefroren sind. Die desktop-first-Hauptgates aus `V89` bleiben die Baseline fuer Folgearbeit am Desktop-Hauptprodukt.

## Aufgeschobene Fixes (Code-Review 2026-04-03)

Abgleich-Fliesstext und Stand-Snapshots liegen in `docs/plaene/CHANGELOG.md`. Dieser Abschnitt pflegt nur noch den offenen P-Backlog.
Die folgenden Punkte werden nach Abschluss des jeweiligen Blocks adressiert.
P39 und P40 wurden mit `V101` geschlossen und sind aus dem offenen Backlog entfernt.

### Im Runtime-Hardening-Follow-up V87 zu adressieren (betrifft scope_files von V83/V87)

Keine offenen Review-Punkte mehr im V87-Scope; `V87` ist abgeschlossen und dient hier nur noch als Referenz fuer Folgearbeit ausserhalb der damaligen `scope_files`.

### In Folgeblocks oder eigenstaendig (nicht in V83/V87 scope_files)

Offene Zuordnung fuer die naechsten Folgebloecke:

- `V90`: `P21`
- `V99`: `P32` bis `P38` sowie `P49` bis `P52`
- `V104`: `P14` plus architektureller Zuschnitt aus `P45` fuer `UIStartSyncController`, `UIManager`-nahe Menuepfade und `ArcadeVehicleManager`; Dead-Code-/Legacy-Konsolidierung nur bei nachgewiesenem Duplicate-/Ersatzpfad
- `V102`: `P41` bis `P46`
- `V105`: `P47` bis `P48`
- Eigenstaendig oder spaeterer Produkt-/Infra-Follow-up: `P6`, `P7`, `P12`, `P14`, `P22` bis `P31`

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P6 | `PortalLayoutBuilder.js` | Portal-Slot-Modulo erzeugt identische Positionen bei `slots.length < 8` | hoch |
| P7 | `vulkan_odyssey.js` | Precision-Plattformen (4x2 Einheiten) vermutlich unspielbar | hoch |
| P12 | `CheckpointRingMeshFactory.js` | Material-Leak: jeder Checkpoint bekommt neues Material ohne Disposal | mittel |
| P14 | `UIStartSyncController.js` | Event-Listener-Duplikation bei Mehrfachaufruf von `setupStartSetupControls()`; nachhaltige Behebung ueber den Ownership-/Port-Zuschnitt in `V104` statt rein lokalem Patch | mittel |
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
| P32 | `server/lan-signaling.js` | `POST /lobby/join` ignoriert `maxPlayers`; Lobby kann ueber die konfigurierte Kapazitaet hinaus anwachsen (Folgeblock-Vorschlag: V99) | hoch |
| P33 | `server/lan-signaling.js` | Mutierende LAN-Endpoints (`/lobby/ready`, `/lobby/invalidate-ready`, `/lobby/match-start`) sind nicht host-gebunden und koennen von Fremdclients getriggert werden (Folgeblock-Vorschlag: V99) | hoch |
| P34 | `src/network/LANMatchLobby.js`, `src/network/LANSessionAdapter.js` | `setInterval(async ...)`-Polling ohne Inflight-/Abort-Guard; bei langsamen Netzpfaden drohen Request-Overlaps und Backlog (Folgeblock-Vorschlag: V99) | hoch |
| P35 | `src/network/LANMatchLobby.js` | Host-`leave()` nutzt semantisch `POST /lobby/create` als Reset-Side-Effect statt explizitem Host-Leave-Shutdown-Pfad; Lifecycle-/Diagnosevertrag bleibt unscharf (Folgeblock-Vorschlag: V99) | mittel |
| P36 | `src/ui/menu/testing/MenuMultiplayerPanel.js` | Discovery-Hostkarte rendert untrusted Hostdaten per `innerHTML`; LAN-Payload kann UI-Markup injizieren (Folgeblock-Vorschlag: V99) | hoch |
| P37 | `electron/preload.cjs` | `ipcRenderer.sendSync('settings-defaults:read-override-sync')` blockiert den Renderer-Thread und erhoeht UI-Stall-Risiko bei I/O-Latenz (Folgeblock-Vorschlag: V102) | mittel |
| P38 | `src/ui/menu/MenuConfigShareOps.js` | `escape`/`unescape` in Code-Importpfad sind veraltet und fragil fuer Unicode-/Runtime-Kompatibilitaet (Folgeblock-Vorschlag: V99 oder V101) | mittel |
| P41 | `vite.config.js` | Editor-Video-Save akzeptiert nicht ausreichend eingeschraenkte Zielpfade; ohne kanonischen Root-Guard bleibt Traversal-/Out-of-root-Risiko (Folgeblock-Vorschlag: V102) | hoch |
| P42 | `src/ui/start-setup/StartSetupUiOps.js`, `src/ui/MatchFlowArcadeOverlayController.js` | UI rendert benutzer-/datennahe Inhalte per `innerHTML`; XSS-Risiko ausserhalb des bereits erfassten Discovery-Pfads (Folgeblock-Vorschlag: V102) | hoch |
| P43 | `src/shared/contracts/PlatformCapabilityRegistry.js` | Browser-Demo-Override liest Build-Artefakt per synchronem XHR; Renderer-Blockade und Startup-Stall-Risiko (Folgeblock-Vorschlag: V102) | mittel |
| P44 | `server/lan-signaling.js` | Request-Body-Reader ohne feste Size-Limits; Memory-/DoS-Risiko bei grossen Payloads (Folgeblock-Vorschlag: V102) | hoch |
| P45 | `src/ui/UIStartSyncController.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/arcade/ArcadeVehicleManager.js`, `vite.config.js` | Hohe zyklomatische/lineare Komplexitaet in Hotspots erhoeht Regressions- und Change-Risiko (Folgeblock-Vorschlag: V102) | mittel |
| P46 | `eslint.config.js`, `tsconfig.architecture.json` | Tooling-Gates decken nur einen engen Teil der Laufzeitpfade ab; Security-/Quality-Regressionen koennen zu spaet auffallen (Folgeblock-Vorschlag: V102) | mittel |
| P47 | `src/core/AppInitializer.js`, `src/core/TestApiBridge.js` | Test-/E2E-Modulregistries importieren `ui`-Module direkt aus `core` und brechen damit `check:architecture:boundaries`, Metrics und Ratchet (Folgeblock-Vorschlag: V105) | hoch |
| P48 | `src/core/MediaRecorderSystem.js`, `src/core/recording/**/*`, `src/core/renderer/RecordingCapturePipeline.js`, `src/core/renderer/CameraRigSystem.js` | `typecheck:architecture` ist wieder rot; Recorder-, Export- und Capture-Vertraege driften bei Literalen und Result-Shapes auseinander und entwerten den Architektur-Guard (Folgeblock-Vorschlag: V105) | hoch |
| P49 | `src/network/LANMatchLobby.js` | LAN-Ready-State bleibt nach erstem `ready=true` sticky; `invalidateReadyForAll()` und explizites Unready werden vom Merge ueberschrieben, wodurch `allReady`/`canStart` stale gruen bleiben koennen (Folgeblock-Vorschlag: V99) | hoch |
| P50 | `src/network/OnlineMatchLobby.js`, `src/application/session-runtime/NetworkLobbyService.js` | Online-Lobby-Mutationen melden Erfolg ohne verifizierbare Zustellung/ACK; bei geschlossenem Socket kann Menu-/Runtime-State glauben, Ready oder Matchstart seien serverseitig angekommen (Folgeblock-Vorschlag: V99) | hoch |
| P51 | `src/network/OnlineMatchLobby.js` | Etablierte Online-Socket-Closes werden nach erfolgreichem Connect nicht als `closed`/Disconnect an die Menu-Layer propagiert; Lobbys koennen joined wirken, obwohl das Signaling bereits weg ist (Folgeblock-Vorschlag: V99) | mittel |
| P52 | `src/network/LANMatchLobby.js` | LAN-Status-Polling loggt Signaling-Ausfall nur und behaelt stale SessionState; fehlender Disconnect-/Close-Uebergang verwischt echte Host-/Server-Verluste (Folgeblock-Vorschlag: V99) | mittel |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | Playwright-Verifikation fuer V74 scheiterte zusaetzlich an BOM+Shebang im Governance-Skript | UTF-8-no-BOM geschrieben; Parserblocker beseitigt, verbleibender Harness-Blocker separat dokumentiert | erledigt |
| 2026-04-02 | Agent-A | V72 (Agent-B lock) | `src/entities/player/PlayerInventoryOps.js` | Agent-A uebernimmt und erledigt 72.1.2 waehrend Agent-B locked war | 72.1 komplett umgesetzt: PlayerInventoryOps validiert selfUsable, blockiert Rockets; Umsetzungsplan aktualisiert auf 72.2 | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Explizite V74-Nachverifikation brach unter Windows bereits vor Playwright mit `spawn EINVAL` ab | Smoke-Launcher auf lokale Playwright-CLI plus separator-neutrale Filter umgestellt; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/verify-lock.mjs` | Gezielte Playwright-Reruns trafen Windows-Dateifilter und CLI-Aufloesung nicht stabil | Playwright-Aufrufe auf lokale CLI gehoben und Spec-Filter separator-neutral normalisiert; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | Browser-Runs luden `tests/*.test.mjs` mit `node:test` mit und endeten in `No tests found` statt echter Spec-Auswahl | Discovery auf `**/*.spec.js` begrenzt; verbliebener Vite-HTTP-Timeout in V74-Fehlerbericht festgehalten | erledigt |
