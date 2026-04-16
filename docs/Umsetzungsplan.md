# Umsetzungsplan (Master-Index)

Stand: 2026-04-15. Status-Fliesstext, Abgleich-Historie und abgeschlossene Block-Zusammenfassungen liegen in `docs/plaene/CHANGELOG.md`.
Naechste offene Subphase: `64.6.2` (siehe `docs/plaene/aktiv/V64.md`). Aktuelle Intake-Drafts: `docs/plaene/neu/`.

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

### Aktive und geplante Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V86 | Editor- und Map-Authoring-Vertraege | planned | P2 | frei | V72.99 | 86.1 | `docs/plaene/aktiv/V86.md` |
| V64 | Desktop Hauptprodukt Multiplayer Online Offline Kompatibilitaet | planned | P2 | frei | V74.99,V77.99 | 64.5 | `docs/plaene/aktiv/V64.md` |
| V75 | Cinematic Recorder Desktop WebM-MP4 Stabilisierung | planned | P3 | frei | V74.99,V77.99,V64.99 | 75.1 | `docs/plaene/aktiv/V75.md` |
| V76 | Desktop Hangar Arcade Fight | planned | P3 | frei | V71.4,V74.99,V77.99,V64.99,V82.99 | 76.1 | `docs/plaene/aktiv/V76.md` |
| V82 | Arcade-Parcours Progression XP Flugzeug-Tuning | planned | P2 | frei | V72.99,V74.99 | 82.1 | `docs/plaene/aktiv/V82.md` |
| V81 | Developer Tuning Console (Steuerkonsole) | planned | P3 | frei | V74.99,V72.99,V91.99 | 81.1 | `docs/plaene/aktiv/V81.md` |
| V94 | Wissensgraph als Query-Layer fuer Plaene, Scope-Files und Architektur-Surfaces | planned | P3 | frei | V93.99 | 94.1 | `docs/plaene/aktiv/V94.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V72 | Legacy-/Migrationspfad fuer Gate-/Portal-Validierung | hard | nein | Vor hartem Fail muessen sichtbare Warn-, Diagnose- oder Migrationspfade fuer bestehende Maps umgesetzt werden |
| V75 | V64.99 | hard | nein | Recorder-Polish folgt erst nach dem produktiven Host-/Join-Hauptpfad |
| V75 | V72 Recorder-/Telemetry-Result-Codes | soft | nein | Nur relevant, falls Export-Diagnostik gemeinsam mit Gameplay-Result-Codes vereinheitlicht wird |
| V76 | V64.99 | hard | nein | Hangar-/Werkstatt-Flows starten erst nach dem festgezogenen Produktbild fuer Host/Join und Browser-Demo |
| V76 | V82.99 | hard | nein | V76.3 Arcade-Hangar baut direkt auf V82-Contracts (XP, Upgrades, Leaderboard) auf; V82 muss vor V76.3 abgeschlossen sein |
| V81 | V77 Surface-Policy | soft | nein | Console ist Dev-Only-Feature; sollte V77-Capability-Vertrag respektieren, blockiert aber nicht |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V64 | - | frei | Nach `64.4.3` `VITE_SIGNALING_URL`, TURN-Optionen, Overrides und Packaging-Dokumentation fuer Desktop definieren |
| - | V71 | 2026-04-14 | closed | Abgeschlossen 2026-04-14: `71.99` blockerfest geschlossen (`71.99.1` Root-/Cleanup-Check gruen, Build reproduzierbar `spawn EPERM` dokumentiert; `71.99.2` Editor-/Plan-/Docs-Gates gruen; `71.99.3` Ignore-Artefakte klassifiziert) |
| - | V72 | 2026-04-15 | closed | Abgeschlossen 2026-04-15: `72.99` Gate gruen; alle drei Pflicht-Gates (plan:check, docs:sync, docs:check) und test:contract (120/120) bestanden; V72 freischaltet V82, V86 und V81 |
| - | V74 | - | frei | Abgeschlossen 2026-04-03: `74.99` Gate gruen, Folgebloecke mit `V74.99` koennen anlaufen |
| - | V86 | - | frei | Nach `V72.99` Authoring-Vertrag zwischen Editor, Templates, Serializer und Runtime-Presets konkretisieren |
| - | V77 | - | closed | Abgeschlossen 2026-04-15: `77.99` Gate gruen; Surface-Vertrag, Entscheidungsraster, Fallback-Contract-Tests und Dev-only-Expert-Policy sind konsistent verankert |
| - | V91 | 2026-04-15 | closed | Abgeschlossen 2026-04-15: `91.99` Gate gruen; Guard-Matrix, Boundary-/Ratchet-/Metrics-Checks, PlatformCapabilityData-Split, Lifecycle-/Capability-Contract-Tests, Feature-Start-Checkliste und Governance-Spiegelung (V64/V81/V82/V86, test_mapping) abgeschlossen; V64 und V81 haben ihre V91.99-Abhaengigkeit jetzt erfuellt |
| - | V92 | 2026-04-15 | closed | Abgeschlossen 2026-04-15: `92.99` Gate gruen; Hotspots im migrierten Scope reduziert, Restadapter explizit auf `GameRuntimePorts`-Transition-Helfer und `MatchFlowTransitionHotspots` begrenzt, globale Runtime-Surfaces nur noch Publish-/Cleanup-Diagnostics |
| - | V75 | - | frei | Exportstrategie/Finalize-Port erst nach `V64.99` auf denselben Lifecycle- und Surface-Vertrag heben |
| - | V76 | - | frei | Desktop-Hangar-Contract erst nach `V64.99` und unter `V77`-/`V74`-Leitplanken aufnehmen |
| - | V82 | - | frei | Nach `V72.99` und `V74.99` mit `82.1` daten- und regelnah starten; UI-/HUD-/Overlay-Schnitte sollen den Ownership-Zuschnitt aus `V92` konsumieren |
| - | V81 | - | frei | Nach `V92.99`, `V91.99`, `V74.99` und `V72.99` mit `81.1` Registry und Bridge starten |
| - | V93 | 2026-04-14 | closed | Abgeschlossen 2026-04-14: `93.99` Gate gruen; Master-Index-Einstieg -36% (7011->4472 Bytes Top-60), `gates:pre-commit` Meta-Gate produktiv, Rules/Workflows entdoppelt, keine Policy in mehrfacher Quelle |
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
