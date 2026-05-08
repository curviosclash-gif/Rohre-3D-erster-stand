# Umsetzungsplan (Master-Index)

Stand: 2026-05-08. Aktuelle offene Subphase: `V102 102.1`.
Status-Fliesstext und Abschluss-Historie liegen in `docs/plaene/CHANGELOG.md`.
Offene Findings und Audit-Reste liegen kanonisch in `docs/prozess/Open_Findings.md`.

Dieser Master bleibt ein kompakter Index fuer aktive Arbeit.
Kanonische Blockdetails liegen in `docs/plaene/aktiv/VXX.md`.
Neue oder geaenderte Intake-Entwuerfe entstehen unter `docs/plaene/neu/`.
Archivierte oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Master werden keine Bot-Training-Phasen oder Bot-Training-Locks gepflegt.

## Lesereihenfolge

1. `docs/Umsetzungsplan.md` fuer aktive Bloecke, harte Dependencies, Lock-Index und Conflict-Log.
2. `docs/plaene/aktiv/VXX.md` fuer kanonische Blockdetails, DoD, Risiken, `scope_files` und Phasen.
3. `docs/plaene/neu/*.md` nur fuer neue oder ueberarbeitete Intake-Entwuerfe.
4. `docs/plaene/CHANGELOG.md` fuer Verlauf und Abschluss-Snapshots.
5. `docs/prozess/Open_Findings.md` fuer offene Findings-/Audit-Reste ausserhalb des kompakten Master-Index.

## Aktive Bloecke

### Abgeschlossene Bloecke (aktuell referenziert)

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V91 | Architektur-Ratchet und Legacy-Surface-Sunset | done | P2 | frei | V87.99,V77.99 | 91.99 | `docs/plaene/aktiv/V91.md` |
| V92 | Runtime-Application-Ownership-Entkopplung und Orchestrator-Zuschnitt | done | P2 | frei | V91.99 | 92.99 | `docs/plaene/aktiv/V92.md` |
| V101 | Architecture Type-Safety und Contract-Hardening | done | P2 | frei | V98.99 | 101.99 | `docs/plaene/aktiv/V101.md` |
| V103 | Settings-Domain Nachhaltigkeit, Mutationsvertrag und Erweiterungspfad | done | P2 | frei | V92.99 | 103.99 | `docs/plaene/aktiv/V103.md` |
| V99 | Desktop Multiplayer Signaling-, LAN- und Connectivity-Hardening | done | P1 | frei | V64.99,V92.99 | 99.99 | `docs/plaene/aktiv/V99.md` |
| V109 | Governance-, Workflow- und Masterplan-Entschlackung fuer AI-gestuetzte Repo-Arbeit | done | P1 | frei | V99.99 | 109.99 | `docs/plaene/aktiv/V109.md` |
| V104 | Runtime- und UI-God-Object-Sunset mit Port-Zuschnitt | done | P2 | frei | V92.99,V103.99 | 104.99 | `docs/plaene/aktiv/V104.md` |
| V100 | Runtime Rebuild-, Remount- und StartSync-Stabilisierung | done | P1 | frei | V92.99 | 100.99 | `docs/plaene/aktiv/V100.md` |
| V108 | Arcade-Ghost Selbstduell (laengste Spur pro Route) | done | P2 | frei | V82.99 | 108.99 | `docs/plaene/aktiv/V108.md` |
| V107 | Kompletter Spiel-Wissensgraph als mehrschichtiger Query-Layer | done | P2 | frei | V94.99 | 107.99 | `docs/plaene/aktiv/V107.md` |

### Abgeschlossene Bloecke (offener Abgleich vor Archivierung)

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V76 | Desktop Hangar Arcade Fight | done | P3 | frei | V71.4,V77.99,V64.99 | 76.99 | `docs/plaene/aktiv/V76.md` |

### Aktive und geplante Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V90 | Toolchain-Security und Dependency-Upgrade | blocked | P1 | frei | - | 90.2 | `docs/plaene/aktiv/V90.md` |
| V102 | Security-, Runtime- und Contract-Hardening | planned | P1 | frei | V99.99,V100.99 | 102.1 | `docs/plaene/aktiv/V102.md` |
| V105 | Architecture-Guard- und Typecheck-Regression-Recovery | blocked | P1 | frei | V99.99,V102.99,V104.99 | 105.1 | `docs/plaene/aktiv/V105.md` |
| V112 | Spielaudit- und Playtest-Improvement-Paket | blocked | P1 | frei | V102.99,V105.99 | 112.1 | `docs/plaene/aktiv/V112.md` |
| V96 | Application Boundaries und Legacy-Surface-Reduktion | planned | P2 | frei | V92.99,V64.99 | 96.1 | `docs/plaene/aktiv/V96.md` |
| V106 | Kuratierte GLB-Map-Varianz | planned | P2 | frei | - | 106.1 | `docs/plaene/aktiv/V106.md` |
| V110 | Wissensgraph Ops-, Guard- und Integritaets-Haertung | planned | P2 | frei | V107.99 | 110.1 | `docs/plaene/aktiv/V110.md` |
| V111 | Wissensgraph Adaptive Diagnose- und Entscheidungsintelligenz | planned | P2 | frei | V107.99,V110.99 | 111.1 | `docs/plaene/aktiv/V111.md` |
| V113 | Hangar Shell Productivierung und Rules Panel | planned | P2 | frei | V76.99,V103.99 | 113.1 | `docs/plaene/aktiv/V113.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V91 | V87.99 | hard | ja | Legacy-Surface-Sunset baute auf Runtime-Hardening-Folgearbeit auf |
| V91 | V77.99 | hard | ja | Desktop-vs-Browser-Surface-Policy war Baseline fuer Ratchet-Regeln |
| V104 | V92.99 | hard | ja | Ownership-, Snapshot- und Legacy-Surface-Ratchet als Baseline fuer weiteren Port-/Alias-Abbau |
| V104 | V103.99 | hard | ja | Schmaler Settings-Persistenzpfad verhindert neue Store-Bypaesse bei UI-Splits |
| V109 | V99.99 | hard | ja | V99 ist am 2026-05-04 mit `99.99` abgeschlossen |
| V100 | V92.99 | hard | ja | V92 ist abgeschlossen; V100 kann als Runtime-Stabilisierung direkt starten |
| V101 | V98.99 | hard | ja | Settings-/Browser-Demo-Override-Baseline war Voraussetzung fuer Contract-Hardening |
| V102 | V99.99 | hard | ja | Netzwerk-/Signaling-Hardening aus V99 ist Grundlage fuer Security-Folgearbeit |
| V102 | V100.99 | hard | ja | Runtime-StartSync-Stabilisierung ist Baseline fuer sync-I/O- und Contract-Hardening |
| V105 | V99.99 | hard | ja | Guard-Recovery darf LAN-/Signaling-Abschluss aus V99 voraussetzen |
| V105 | V102.99 | hard | nein | V105 setzt die Security-/Runtime-/Contract-Haertung aus V102 voraus |
| V105 | V104.99 | hard | ja | God-Object-/Port-Zuschnitt ist abgeschlossen und Baseline fuer Boundary-Recovery |
| V76 | V64.99 | hard | ja | Abschluss vorhanden; verbleibt nur im offenen Abgleich vor Archivierung |
| V76 | V77.99 | hard | ja | Surface-Policy-Baseline weiterhin erfuellt |
| V96 | V92.99 | hard | ja | Runtime-Application-Ownership-Entkopplung ist Voraussetzung fuer weitere Boundary-Reduktion |
| V96 | V64.99 | hard | ja | Desktop-Multiplayer-/Runtime-Basis bleibt Grundlage fuer Application-Boundary-Schnitt |
| V107 | V94.99 | hard | ja | V94 ist abgeschlossen; V107 kann als Core-Graph-Block gestartet werden |
| V108 | V82.99 | hard | ja | Arcade-Parcours-/Ghost-/Leaderboard-Basis ist abgeschlossen |
| V110 | V107.99 | hard | ja | Core-Graph, Query-Layer, Coverage-Gate und Workflow-Spiegelung aus V107 sind abgeschlossen |
| V111 | V107.99 | hard | ja | Mehrschichtiger Graph-Core aus V107 ist abgeschlossen; V110 bleibt als weitere Voraussetzung offen |
| V111 | V110.99 | hard | nein | V111 setzt die Ops-/Guard-Haertung aus V110 voraus |
| V112 | V102.99 | hard | nein | V112 startet erst nach Security-/Runtime-Hardening aus V102 |
| V112 | V105.99 | hard | nein | V112 startet erst nach Guard-/Typecheck-Recovery aus V105 |
| V113 | V76.99 | hard | ja | Hangar-Contracts und Shell-Zielbild aus V76 sind abgeschlossen |
| V113 | V103.99 | hard | ja | Settings-Domain- und Persistenzpfad aus V103 sind Grundlage fuer Hangar-Writeback |

## Lock-Status

Operativer Lock-Wahrheitsraum liegt in `docs/lock-status/*.json`.
Diese Tabelle ist der kompakte Index fuer Blocksicht im Master.

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V90 | - | blockiert | Wartet auf Build-/Typecheck-Recovery vor Abschluss-Gate |
| - | V91 | - | closed | Abgeschlossen 2026-04-14 |
| - | V92 | - | closed | Abgeschlossen 2026-04-15 |
| - | V101 | - | closed | Abgeschlossen 2026-04-24 |
| - | V103 | - | closed | Abgeschlossen 2026-04-26 |
| - | V99 | - | closed | Abgeschlossen 2026-05-04 |
| - | V76 | 2026-04-27 | closed | Abgeschlossen 2026-04-27 |
| - | V104 | 2026-05-05 | closed | Abgeschlossen 2026-05-05 |
| - | V109 | 2026-05-04 | closed | Abgeschlossen 2026-05-04 |
| - | V100 | 2026-05-05 | closed | Abgeschlossen 2026-05-06 |
| - | V108 | - | closed | Abgeschlossen 2026-05-01 |
| - | V102 | - | frei | Geplant |
| - | V105 | - | blockiert | Wartet auf V102.99 |
| - | V96 | - | frei | Geplant |
| - | V106 | - | frei | Geplant |
| - | V107 | 2026-05-07 | closed | Abgeschlossen 2026-05-08 |
| - | V110 | - | frei | Geplant |
| - | V111 | - | frei | Geplant |
| - | V112 | - | blockiert | Wartet auf V102.99 und V105.99 |
| - | V113 | - | frei | Geplant |

## Empfohlene Reihenfolge

1. `V102` (Security-/Runtime-/Contract-Hardening).
2. Danach `V105` (Guard-/Typecheck-Recovery).
3. Danach `V112` (Spielaudit- und Playtest-Improvement-Paket) als produktnahes Qualitaetsfenster.
4. Danach `V110` (Wissensgraph Ops-/Guard-Haertung).
5. Danach `V111` (Wissensgraph adaptive Diagnose- und Entscheidungsintelligenz).
7. `V90` nach stabiler Build-/Typecheck-Basis wieder aufnehmen und abschliessen.
8. `V96` als groesseren Boundary-/Legacy-Folgeblock nach den P1-Recovery-Schnitten einplanen.
9. `V106` und `V113` als produktnahe Content-/Hangar-Folgeblocks einordnen, sobald kein P1-Hardening blockiert.

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | BOM+Shebang blockierte Playwright-Verifikation | UTF-8-no-BOM geschrieben; Parserblocker beseitigt | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Windows-Startblocker (`spawn EINVAL`) vor Playwright | Launcher auf lokale CLI + separator-neutrale Filter umgestellt | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | `node:test`-Files wurden als Playwright-Specs entdeckt | Discovery auf `**/*.spec.js` begrenzt | erledigt |
