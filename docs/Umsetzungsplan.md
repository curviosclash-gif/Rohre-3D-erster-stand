# Umsetzungsplan (Master-Index)

Stand: 2026-05-17. Aktiver Lock: `codex` auf `V116 116.4`; naechster freier P1-Startpfad: `V119 119.1`.
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
| V110 | Wissensgraph Ops-, Guard- und Integritaets-Haertung | done | P2 | frei | V107.99 | 110.99 | `docs/plaene/aktiv/V110.md` |
| V111 | Wissensgraph Adaptive Diagnose- und Entscheidungsintelligenz | done | P2 | frei | V107.99,V110.99 | 111.99 | `docs/plaene/aktiv/V111.md` |

### Abgeschlossene Bloecke (offener Abgleich vor Archivierung)

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V76 | Desktop Hangar Arcade Fight | done | P3 | frei | V71.4,V77.99,V64.99 | 76.99 | `docs/plaene/aktiv/V76.md` |

### Aktive und geplante Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V90 | Toolchain-Security und Dependency-Upgrade | blocked | P1 | frei | - | 90.2 | `docs/plaene/aktiv/V90.md` |
| V102 | Security-, Runtime- und Contract-Hardening | done | P1 | frei | V99.99,V100.99 | 102.99 | `docs/plaene/aktiv/V102.md` |
| V114 | SurfacePolicyPort fuer Demo- und Vollversionsgrenze | done | P1 | frei | V98.99,V103.99,V104.99 | 114.1 | `docs/plaene/aktiv/V114.md` |
| V115 | Product & Infra Follow-up (Gameplay, Leaks & Test-Recovery) | done | P2 | frei | - | 115.99 | `docs/plaene/aktiv/V115.md` |
| V105 | Architecture-Guard- und Typecheck-Regression-Recovery | done | P1 | frei | V99.99,V102.99,V104.99 | 105.99 | `docs/plaene/aktiv/V105.md` |
| V117 | AI Decision Framework und Autonomie-Gates | done | P1 | frei | V109.99 | 117.99 | `docs/plaene/aktiv/V117.md` |
| V116 | Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung | active | P1 | frei | V109.99,V117.99,V115.99 | 116.4 | `docs/plaene/aktiv/V116.md` |
| V119 | Planabschluss-Evidence-Remediation und Git-Historienabgleich | planned | P1 | frei | V117.99 | 119.1 | `docs/plaene/aktiv/V119.md` |
| V123 | AI-optimierter Plan-Index und Source-of-Truth-Migration | planned | P1 | frei | V116.4,V119.1 | 123.1 | `docs/plaene/aktiv/V123.md` |
| V120 | Graph-RAG mit lokalem Context-Adapter | planned | P1 | frei | V107.99,V110.99,V111.99 | 120.1 | `docs/plaene/aktiv/V120.md` |
| V121 | Lokaler Graph-RAG Viewer und Evidence-Dashboard | planned | P2 | frei | V120.99,V107.99,V110.99,V111.99 | 121.1 | `docs/plaene/aktiv/V121.md` |
| V122 | Repo-natives Agent-Memory und externe Ruflo-Orchestrierung | planned | P2 | frei | V116.99,V117.99,V119.1 | 122.1 | `docs/plaene/aktiv/V122.md` |
| V124 | Wissensgraph Produktsemantik-Ausbau und Nutzwert-Ratchet | planned | P2 | frei | V107.99,V110.99,V111.99 | 124.1 | `docs/plaene/aktiv/V124.md` |
| V112 | Spielaudit- und Playtest-Improvement-Paket | planned | P1 | frei | V102.99,V105.99 | 112.1 | `docs/plaene/aktiv/V112.md` |
| V96 | Application Boundaries und Legacy-Surface-Reduktion | planned | P2 | frei | V92.99,V64.99 | 96.1 | `docs/plaene/aktiv/V96.md` |
| V106 | Kuratierte GLB-Map-Varianz | planned | P2 | frei | - | 106.1 | `docs/plaene/aktiv/V106.md` |
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
| V105 | V102.99 | hard | ja | Security-/Runtime-/Contract-Haertung aus V102 ist abgeschlossen und war V105-Baseline |
| V105 | V104.99 | hard | ja | God-Object-/Port-Zuschnitt ist abgeschlossen und Baseline fuer Boundary-Recovery |
| V76 | V64.99 | hard | ja | Abschluss vorhanden; verbleibt nur im offenen Abgleich vor Archivierung |
| V76 | V77.99 | hard | ja | Surface-Policy-Baseline weiterhin erfuellt |
| V96 | V92.99 | hard | ja | Runtime-Application-Ownership-Entkopplung ist Voraussetzung fuer weitere Boundary-Reduktion |
| V96 | V64.99 | hard | ja | Desktop-Multiplayer-/Runtime-Basis bleibt Grundlage fuer Application-Boundary-Schnitt |
| V107 | V94.99 | hard | ja | V94 ist abgeschlossen; V107 kann als Core-Graph-Block gestartet werden |
| V108 | V82.99 | hard | ja | Arcade-Parcours-/Ghost-/Leaderboard-Basis ist abgeschlossen |
| V110 | V107.99 | hard | ja | Core-Graph, Query-Layer, Coverage-Gate und Workflow-Spiegelung aus V107 sind abgeschlossen |
| V111 | V107.99 | hard | ja | Mehrschichtiger Graph-Core aus V107 ist abgeschlossen; V110 bleibt als weitere Voraussetzung offen |
| V111 | V110.99 | hard | ja | Ops-/Guard-Haertung aus V110 ist abgeschlossen |
| V112 | V102.99 | hard | ja | Security-/Runtime-Hardening aus V102 ist abgeschlossen |
| V112 | V105.99 | hard | ja | Guard-/Typecheck-Recovery aus V105 ist abgeschlossen |
| V113 | V76.99 | hard | ja | Hangar-Contracts und Shell-Zielbild aus V76 sind abgeschlossen |
| V113 | V103.99 | hard | ja | Settings-Domain- und Persistenzpfad aus V103 sind Grundlage fuer Hangar-Writeback |
| V114 | V98.99 | hard | ja | Browser-Demo-Policy, Settings-Studio-Export und read-only Demo-Lesepfad sind Grundlage fuer den SurfacePolicyPort |
| V114 | V103.99 | hard | ja | SettingsManager-Zuschnitt und Mutationsvertrag bleiben Grundlage fuer die Abgrenzung Settings vs. Produktgrenze |
| V114 | V104.99 | hard | ja | Port-/Snapshot-Zielpfad ist Grundlage fuer den zentralen SurfacePolicyPort |
| V117 | V109.99 | hard | ja | Governance-/Workflow-Entschlackung aus V109 ist abgeschlossen und Grundlage fuer das allgemeine AI Decision Framework |
| V116 | V109.99 | hard | ja | Governance-/Workflow-Entschlackung aus V109 ist Baseline fuer Kontext- und Planhygiene |
| V116 | V117.99 | hard | ja | AI Decision Framework, D3/D4-User-Gates und Zweckklassen sind Grundlage fuer Cleanup-, Archiv- und Governance-Scope |
| V116 | V115.99 | hard | ja | Product-/Infra-Follow-up und P22-Retention sind abgeschlossen; V116 darf Retention nicht doppelt entscheiden |
| V119 | V117.99 | hard | ja | AI Decision Framework und Evidence-Claim-Regeln sind Grundlage fuer nachtraegliche Planabschluss-Remediation ohne falsche Abschlussbehauptungen |
| V120 | V107.99 | hard | ja | Core-Graph und Query-Layer sind Baseline fuer Graph-RAG-Kandidatenauswahl |
| V120 | V110.99 | hard | ja | Graph Ops-, Guard-, SLO- und Playbook-Basis ist Voraussetzung fuer sichere RAG-Gates |
| V120 | V111.99 | hard | ja | Adaptive Query-, Safety-, Scorecard- und Feedback-Mechanik ist Grundlage fuer Evidence-Pakete und lokale Adapter |
| V123 | V116.4 | hard | ja | Plan-Kontext-Klassifikation und AI-Leseweg bilden die Baseline fuer den strukturierten Plan-Index-Pilot |
| V123 | V119.1 | hard | nein | Evidence-/Abschluss-Baseline soll historische Drift vor Source-of-Truth-Entscheidungen sichtbar machen |
| V121 | V120.99 | hard | nein | Viewer bleibt Consumer von stabilen Graph-RAG-Evidence-Paketen oder einem explizit dokumentierten V120-`fixture-ready`-Gate |
| V121 | V107.99 | hard | ja | Core-Graph und Export-/Viewer-Historie bilden die technische Basis |
| V121 | V110.99 | hard | ja | Graph-Ops-, Guard- und SLO-Basis bleibt Voraussetzung fuer sichere Viewer-Exports |
| V121 | V111.99 | hard | ja | Safety-/Redaction- und adaptive Query-Grundlagen sind Basis fuer Evidence-Dashboard-Ausgaben |
| V122 | V116.99 | hard | nein | Repo-Kontext-Reduktion soll abgeschlossen sein, bevor dauerhaftes Agent-Memory als neue Kontextquelle startet |
| V122 | V117.99 | hard | ja | Decision-Klassen, D3/D4-Gates und Zweckklassen begrenzen Memory-/Ruflo-Scope |
| V122 | V119.1 | hard | nein | Evidence-Baseline muss geklaert sein, bevor dauerhafte Memory-Hinweise verifiziert werden |
| V124 | V107.99 | hard | ja | Core-Graph und Query-Layer sind Basis fuer Produktsemantik-Ausbau |
| V124 | V110.99 | hard | ja | Graph-Ops-, Guard- und SLO-Basis begrenzen Semantik-Ratchet und Coverage-Ausbau |
| V124 | V111.99 | hard | ja | Ownership, Stability, Scorecard und Test-Priorisierung sind Grundlage fuer Produktsemantik-Nutzwert |
| V124 | V112.99,V96.99,V106.99,V113.99 | soft | nein | Produktbloecke liefern wertvolle Harvest-Quellen, sind aber keine Startblocker fuer Baseline und Taxonomie |

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
| - | V102 | 2026-05-12 | closed | Abgeschlossen 2026-05-12 |
| - | V114 | - | frei | Geplant |
| - | V115 | - | closed | Abgeschlossen 2026-05-14 |
| - | V105 | 2026-05-13 | closed | Abgeschlossen 2026-05-13 |
| - | V117 | 2026-05-14 | closed | Abgeschlossen 2026-05-14 |
| codex | V116 | 2026-05-15 | active | 116.4 Plan-Kontext |
| - | V119 | - | frei | Geplant |
| - | V123 | - | frei | Geplant |
| - | V120 | - | frei | Geplant |
| - | V121 | - | frei | Geplant |
| - | V122 | - | frei | Geplant |
| - | V124 | - | frei | Geplant |
| - | V96 | - | frei | Geplant |
| - | V106 | - | frei | Geplant |
| - | V107 | 2026-05-07 | closed | Abgeschlossen 2026-05-08 |
| - | V110 | 2026-05-08 | closed | Abgeschlossen 2026-05-09 |
| - | V111 | 2026-05-09 | closed | Abgeschlossen 2026-05-10 |
| - | V112 | - | frei | Geplant |
| - | V113 | - | frei | Geplant |

## Empfohlene Reihenfolge

1. `V116` (Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung) als P1-Kontextfenster bis mindestens `116.4`, besser bis zur V118-Finalisierung in `116.8`, bevor neue breite Plan-/Agentenarbeit startet.
2. `V119` (Planabschluss-Evidence-Remediation und Git-Historienabgleich) mit `119.1` vor neuen breiten Abschlussclaims abschliessen, damit erledigte Plaene formal nachgezogen oder bewusst als historische Restwidersprueche dokumentiert sind.
3. `V123` (AI-optimierter Plan-Index und Source-of-Truth-Migration) als strukturierter Pilot nach `V116.4` und `V119.1`, bevor ein kanonischer Quellenwechsel entschieden wird.
4. `V120` (Graph-RAG mit lokalem Context-Adapter) nach `V116.3/116.4` und mindestens `V119.1` als Token-/Kontexthebel fuer anschliessende breite Agenten-, Audit- und Boundary-Arbeit.
5. `V121` (Lokaler Graph-RAG Viewer und Evidence-Dashboard) erst nach `V120.99` oder einem expliziten V120-`fixture-ready`-Gate als read-only Consumer starten.
6. `V122` (Repo-natives Agent-Memory und externe Ruflo-Orchestrierung) nach V116/V119; vor `V120.99` nur als kleines CLI-only Memory-MVP, Graph-RAG-/Ruflo-Kontext erst danach.
7. `V124` (Wissensgraph Produktsemantik-Ausbau und Nutzwert-Ratchet) als geretteter Produktsemantik-Folgeblock; groesster Nutzen nach ersten produktnahen Harvest-Quellen aus V112/V96/V106/V113.
8. `V112` (Spielaudit- und Playtest-Improvement-Paket) als produktnahes Qualitaetsfenster.
9. `V114` (SurfacePolicyPort fuer Demo- und Vollversionsgrenze), falls nach Abschlussabgleich noch Produktgrenzen nachzuziehen sind.
10. `V90` nach stabiler Build-/Typecheck-Basis wieder aufnehmen und abschliessen.
11. `V96` als groesseren Boundary-/Legacy-Folgeblock nach den P1-Recovery-Schnitten einplanen.
12. `V106` und `V113` als produktnahe Content-/Hangar-Folgeblocks einordnen, sobald kein P1-Hardening blockiert.

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | BOM+Shebang blockierte Playwright-Verifikation | UTF-8-no-BOM geschrieben; Parserblocker beseitigt | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Windows-Startblocker (`spawn EINVAL`) vor Playwright | Launcher auf lokale CLI + separator-neutrale Filter umgestellt | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | `node:test`-Files wurden als Playwright-Specs entdeckt | Discovery auf `**/*.spec.js` begrenzt | erledigt |
