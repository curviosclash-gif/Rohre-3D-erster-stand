# Umsetzungsplan (Master-Index)

Stand: 2026-04-24. Status-Fliesstext, Abgleich-Historie und abgeschlossene Block-Zusammenfassungen liegen in `docs/plaene/CHANGELOG.md`.
V82 abgeschlossen 2026-04-20 (82.99 Abschluss-Gate gruen). V97 abgeschlossen 2026-04-20 (97.99 Abschluss-Gate gruen). V86 abgeschlossen 2026-04-20 (86.99 Abschluss-Gate gruen). V98 wurde auf Phase 98.99 fortgeschrieben (P2, abh. V77.99,V97.99). V101 abgeschlossen 2026-04-24 (101.99 Abschluss-Gate gruen). Deep-Audit 2026-04-22 verankerte Follow-up-Pakete als P32-P38 im Backlog; Deep-Code-Analyse 2026-04-24 ergaenzt P41-P46. Verbleibende Intake-Drafts liegen in `docs/plaene/neu/` (V99, V100, V102).

Dieser Master ist der kompakte Index fuer aktive Arbeit.
Kanonische Blockdetails liegen in den jeweiligen Dateien unter `docs/plaene/aktiv/`.
Neue oder geaenderte Intake-Entwuerfe entstehen weiter unter `docs/plaene/neu/`.
Archivierte oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.
Inaktive bzw. zurueckgestellte Eintraege liegen in `docs/prozess/Backlog.md`.
Aktuelle Intake-Drafts aus den Audits 2026-04-10 bis 2026-04-24: `docs/plaene/neu/Feature_Toolchain_Security_Dependency_Upgrade_2026-04-10.md` (Vorschlag V90), `docs/plaene/neu/Feature_Desktop_Multiplayer_Signaling_Connectivity_Hardening_V99.md` (Vorschlag V99), `docs/plaene/neu/Feature_Runtime_Rebuild_Remount_UI_StartSync_Stabilisierung_V100.md` (Vorschlag V100), `docs/plaene/neu/Feature_Security_Runtime_Contract_Hardening_V102.md` (Vorschlag V102). `V101` wurde in den aktiven Block `docs/plaene/aktiv/V101.md` uebernommen und abgeschlossen.

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

Nur Abschluesse, die von offenen Deps aktiver Bloecke noch referenziert werden. Aeltere Abschluesse siehe `docs/plaene/archiv/abgeschlossene-bloecke.md`.

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V71 | Repo-Aufraeumen Runtime-sicher | done | P1 | frei | V43-Strukturvertrag | 71.99 | `docs/plaene/aktiv/V71.md` |
| V72 | Gameplay-Powerups, Portale und Gates | done | P1 | frei | V69.99 | 72.99 | `docs/plaene/aktiv/V72.md` |
| V74 | Architektur-Runtime-Entkopplung (Refresh) | done | P1 | frei | V58.99,V60.3 | 74.99 | `docs/plaene/alt/V74.md` |
| V77 | Desktop Vollversion Browser Demo Grenzen | done | P2 | frei | V74.99 | 77.99 | `docs/plaene/aktiv/V77.md` |
| V91 | Architektur-Ratchet und Legacy-Surface-Sunset | done | P2 | frei | V87.99,V77.99 | 91.99 | `docs/plaene/aktiv/V91.md` |
| V92 | Runtime-Application-Ownership-Entkopplung und Orchestrator-Zuschnitt | done | P2 | frei | V91.99 | 92.99 | `docs/plaene/aktiv/V92.md` |
| V64 | Desktop Hauptprodukt Multiplayer Online Offline Kompatibilitaet | done | P2 | frei | V74.99,V77.99 | 64.99 | `docs/plaene/aktiv/V64.md` |
| V95 | Settings Studio fuer Menu-Defaults | done | P2 | frei | V77.99,V92.99 | 95.99 | `docs/plaene/aktiv/V95.md` |
| V82 | Arcade-Parcours Progression XP Flugzeug-Tuning | done | P2 | frei | V72.99,V74.99 | 82.99 | `docs/plaene/aktiv/V82.md` |
| V97 | Settings Studio Erklaerbarkeit, Save-Vorschau und Hardening | done | P2 | frei | V95.99,V77.99,V92.99 | 97.99 | `docs/plaene/aktiv/V97.md` |
| V86 | Editor- und Map-Authoring-Vertraege | done | P2 | frei | V72.99 | 86.99 | `docs/plaene/aktiv/V86.md` |
| V101 | Architecture Type-Safety und Contract-Hardening | done | P2 | frei | V98.99 | 101.99 | `docs/plaene/aktiv/V101.md` |

### Aktive und geplante Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V98 | Settings Studio Browser-Demo Begrenzung | planned | P2 | frei | V77.99,V97.99 | 98.99 | `docs/plaene/aktiv/V98.md` |
| V75 | Cinematic Recorder Desktop WebM-MP4 Stabilisierung | planned | P3 | frei | V74.99,V77.99,V64.99 | 75.1 | `docs/plaene/aktiv/V75.md` |
| V76 | Desktop Hangar Arcade Fight | active | P3 | frei | V71.4,V74.99,V77.99,V64.99,V82.99 | 76.99 | `docs/plaene/aktiv/V76.md` |
| V81 | Developer Tuning Console (Steuerkonsole) | planned | P3 | frei | V74.99,V72.99,V91.99 | 81.1 | `docs/plaene/aktiv/V81.md` |
| V94 | Wissensgraph als Query-Layer fuer Plaene, Scope-Files und Architektur-Surfaces | planned | P3 | frei | V93.99 | 94.1 | `docs/plaene/aktiv/V94.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V72 | Legacy-/Migrationspfad fuer Gate-/Portal-Validierung | hard | ja | In `V72` umgesetzt (sichtbare Warn-, Diagnose- und Migrationspfade); Block ist abgeschlossen |
| V75 | V64.99 | hard | ja | V64 abgeschlossen 2026-04-18; Recorder-Polish kann beginnen |
| V75 | V72 Recorder-/Telemetry-Result-Codes | soft | nein | Nur relevant, falls Export-Diagnostik gemeinsam mit Gameplay-Result-Codes vereinheitlicht wird |
| V76 | V64.99 | hard | ja | V64 abgeschlossen 2026-04-18; Hangar-/Werkstatt-Flows koennen nach V82.99 beginnen |
| V76 | V82.99 | hard | ja | V82 abgeschlossen 2026-04-20; V76.3 Arcade-Hangar kann jetzt auf V82-Contracts (XP, Upgrades, Leaderboard) aufbauen |
| V81 | V77 Surface-Policy | soft | nein | Console ist Dev-Only-Feature; sollte V77-Capability-Vertrag respektieren, blockiert aber nicht |
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
| V101 | V98.99 | hard | ja | V101 schliesst Typecheck-/Lint-/Contract-Hardening auf der V98-Resolverbasis ohne neue Guard-Verletzungen |

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
| - | V75 | - | frei | Siehe docs/lock-status/ |
| build-agent | V76 | 2026-04-20 | in-bearbeitung | Siehe docs/lock-status/ |
| - | V82 | - | frei | Siehe docs/lock-status/ |
| - | V81 | - | frei | Siehe docs/lock-status/ |
| - | V86 | - | frei | Siehe docs/lock-status/ |
| - | V94 | - | frei | Siehe docs/lock-status/ |
| - | V95 | - | frei | Siehe docs/lock-status/ |
| - | V97 | - | frei | Siehe docs/lock-status/ |
| - | V98 | - | frei | Siehe docs/lock-status/ |
| - | V101 | - | closed | Abgeschlossen 2026-04-24 |

## Empfohlene Reihenfolge

Die Reihenfolge dient als operative Leitplanke fuer neue Starts. Harte Abhaengigkeiten bleiben verbindlich; soft dependencies und Produktreihenfolge entscheiden die Priorisierung innerhalb der moeglichen Starts.

### Priorisierte Intake-Uebernahme (neu)

1. `V99` (Signaling/LAN/Connectivity-Hardening) als naechsten Intake-Prioritaetsblock uebernehmen.
2. Danach `V100` (Runtime-Rebuild/Remount/StartSync) nachziehen.
3. Danach `V102` (Security-/Runtime-/Contract-Hardening aus Deep-Code-Analyse) uebernehmen.

### Sofort laufende oder naechste Abschluesse

1. `V76` als aktiven Produktblock auf `76.2` weiterziehen; Hangar-/Werkstatt-Flows bleiben der laufende Hauptpfad.
2. `V98` als laufenden P2-Block bis Master-Abschluss nachziehen; hard dependencies (`V77.99`, `V97.99`) sind erfuellt.
3. `V75` als Recorder-Stabilisierung nachgezogen bearbeiten; `V64.99` ist bereits abgeschlossen.
4. `V81` und `V94` als nachgelagerte P3-Bloecke vorbereiten (`V81` mit V92-Ratchet, `V94` als Governance-/Query-Layer).

### Hauptpfad Architektur und Produkt

1. `V87 -> V88 -> V89` ist abgeschlossen; kuenftige Blocks laufen damit auf desktop-first-Gates statt browser-first-Harness.
2. `V85` ist abgeschlossen; Folgeblocks nutzen denselben Daten-/Persistenzrahmen jetzt als verpflichtende Baseline statt als offenen Ausbaupfad.
3. `V77` vor `V91`, damit Surface-Policy und Produktrollen vor dem haerteren Guard- und Sunset-Ratchet verbindlich sind.
4. `V91` vor `V92`, damit Guard-Ratchet und Legacy-Surface-Sunset die Ausgangsbasis fuer Ownership-Schnitt und Orchestrator-Zuschnitt sind.
5. `V92` vor `V64` und `V81`, damit Multiplayer-Produktisierung und Developer-Tuning keine neuen Runtime-, Port- oder Config-Backdoors auf alte Surfaces bauen.
6. `V64` vor `V75`, weil Recorder-Polish erst nach dem produktiven Desktop-Host-/Join-Hauptpfad kommen soll.
7. `V97` folgt nach `V95.99` als gezielter Produkt-Hardening-Block fuer Settings Studio; Erklaer-UX, Save-Vorschau und Migrationspfade koennen parallel zu Gameplay-Folgearbeit laufen, solange Desktop-only Surface-Policy und V92-Ratchet eingehalten bleiben.
8. `V98` folgt nach `V97.99` als Desktop-only Folgeblock fuer Browser-Demo-Begrenzung im Settings Studio; Browser bleibt read-only Consumer ueber einen expliziten Auslieferungspfad.

### Parallelpfad Gameplay und Authoring

1. `V76` bleibt der laufende Gameplay-Hauptpfad und nutzt die abgeschlossenen Datenvertraege aus `V82`.
2. `V98` kann parallel als Settings-/Contract-Block laufen; Ueberschneidung mit `V76` ist fachlich gering.
3. `V81` bleibt fachlich moeglich, ist aber hinter laufender Produktarbeit nachrangig und muss den `V92`-Ownership-Schnitt strikt halten.
4. `V94` ist als Governance-/Tooling-Block weitgehend entkoppelt und parallelisierbar.

### Kurzform

`V76 -> V98 -> V99 -> V100 -> V102 -> V75 -> V81 -> V94`

Parallelisierbar im aktuellen Stand: `V76` (laufend) plus `V98` (Settings-Studio-Demo-Grenzen) und `V94` (Governance-/Query-Layer). `V99`, `V100` und anschliessend `V102` folgen nach dem abgeschlossenen V101-Hardening auf einer wieder gruensicheren Typecheck-/Contract-Baseline. `V81` bleibt bewusst nachrangig und startet mit denselben Guard-Leitplanken (`V91`/`V92`), damit keine Runtime-/Config-Bypaesse reaktiviert werden. Die desktop-first-Hauptgates aus `V89` bleiben die Baseline fuer Folgearbeit am Desktop-Hauptprodukt.

## Aufgeschobene Fixes (Code-Review 2026-04-03)

Abgleich-Fliesstext und Stand-Snapshots liegen in `docs/plaene/CHANGELOG.md`. Dieser Abschnitt pflegt nur noch den offenen P-Backlog.
Die folgenden Punkte werden nach Abschluss des jeweiligen Blocks adressiert.
P39 und P40 wurden mit `V101` geschlossen und sind aus dem offenen Backlog entfernt.

### Im Runtime-Hardening-Follow-up V87 zu adressieren (betrifft scope_files von V83/V87)

Keine offenen Review-Punkte mehr im V87-Scope; `V87` ist abgeschlossen und dient hier nur noch als Referenz fuer Folgearbeit ausserhalb der damaligen `scope_files`.

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
| P32 | `server/lan-signaling.js` | `POST /lobby/join` ignoriert `maxPlayers`; Lobby kann ueber die konfigurierte Kapazitaet hinaus anwachsen (Folgeblock-Vorschlag: V99) | hoch |
| P33 | `server/lan-signaling.js` | Mutierende LAN-Endpoints (`/lobby/ready`, `/lobby/invalidate-ready`, `/lobby/match-start`) sind nicht host-gebunden und koennen von Fremdclients getriggert werden (Folgeblock-Vorschlag: V99) | hoch |
| P34 | `src/network/LANMatchLobby.js`, `src/network/LANSessionAdapter.js` | `setInterval(async ...)`-Polling ohne Inflight-/Abort-Guard; bei langsamen Netzpfaden drohen Request-Overlaps und Backlog (Folgeblock-Vorschlag: V99) | hoch |
| P35 | `src/network/LANMatchLobby.js` | Host-`leave()` nutzt semantisch `POST /lobby/create` als Reset-Side-Effect statt explizitem Host-Leave-Shutdown-Pfad; Lifecycle-/Diagnosevertrag bleibt unscharf (Folgeblock-Vorschlag: V99) | mittel |
| P36 | `src/ui/menu/testing/MenuMultiplayerPanel.js` | Discovery-Hostkarte rendert untrusted Hostdaten per `innerHTML`; LAN-Payload kann UI-Markup injizieren (Folgeblock-Vorschlag: V99) | hoch |
| P37 | `electron/preload.cjs` | `ipcRenderer.sendSync('settings-defaults:read-override-sync')` blockiert den Renderer-Thread und erhoeht UI-Stall-Risiko bei I/O-Latenz (Folgeblock-Vorschlag: V99/V100) | mittel |
| P38 | `src/ui/menu/MenuConfigShareOps.js` | `escape`/`unescape` in Code-Importpfad sind veraltet und fragil fuer Unicode-/Runtime-Kompatibilitaet (Folgeblock-Vorschlag: V99 oder V101) | mittel |
| P41 | `vite.config.js` | Editor-Video-Save akzeptiert nicht ausreichend eingeschraenkte Zielpfade; ohne kanonischen Root-Guard bleibt Traversal-/Out-of-root-Risiko (Folgeblock-Vorschlag: V102) | hoch |
| P42 | `src/ui/start-setup/StartSetupUiOps.js`, `src/ui/MatchFlowArcadeOverlayController.js` | UI rendert benutzer-/datennahe Inhalte per `innerHTML`; XSS-Risiko ausserhalb des bereits erfassten Discovery-Pfads (Folgeblock-Vorschlag: V102) | hoch |
| P43 | `src/shared/contracts/PlatformCapabilityRegistry.js` | Browser-Demo-Override liest Build-Artefakt per synchronem XHR; Renderer-Blockade und Startup-Stall-Risiko (Folgeblock-Vorschlag: V102) | mittel |
| P44 | `server/lan-signaling.js` | Request-Body-Reader ohne feste Size-Limits; Memory-/DoS-Risiko bei grossen Payloads (Folgeblock-Vorschlag: V102) | hoch |
| P45 | `src/ui/UIStartSyncController.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/arcade/ArcadeVehicleManager.js`, `vite.config.js` | Hohe zyklomatische/lineare Komplexitaet in Hotspots erhoeht Regressions- und Change-Risiko (Folgeblock-Vorschlag: V102) | mittel |
| P46 | `eslint.config.js`, `tsconfig.architecture.json` | Tooling-Gates decken nur einen engen Teil der Laufzeitpfade ab; Security-/Quality-Regressionen koennen zu spaet auffallen (Folgeblock-Vorschlag: V102) | mittel |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | Playwright-Verifikation fuer V74 scheiterte zusaetzlich an BOM+Shebang im Governance-Skript | UTF-8-no-BOM geschrieben; Parserblocker beseitigt, verbleibender Harness-Blocker separat dokumentiert | erledigt |
| 2026-04-02 | Agent-A | V72 (Agent-B lock) | `src/entities/player/PlayerInventoryOps.js` | Agent-A uebernimmt und erledigt 72.1.2 waehrend Agent-B locked war | 72.1 komplett umgesetzt: PlayerInventoryOps validiert selfUsable, blockiert Rockets; Umsetzungsplan aktualisiert auf 72.2 | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Explizite V74-Nachverifikation brach unter Windows bereits vor Playwright mit `spawn EINVAL` ab | Smoke-Launcher auf lokale Playwright-CLI plus separator-neutrale Filter umgestellt; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/verify-lock.mjs` | Gezielte Playwright-Reruns trafen Windows-Dateifilter und CLI-Aufloesung nicht stabil | Playwright-Aufrufe auf lokale CLI gehoben und Spec-Filter separator-neutral normalisiert; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | Browser-Runs luden `tests/*.test.mjs` mit `node:test` mit und endeten in `No tests found` statt echter Spec-Auswahl | Discovery auf `**/*.spec.js` begrenzt; verbliebener Vite-HTTP-Timeout in V74-Fehlerbericht festgehalten | erledigt |
