# Umsetzungsplan (Master-Index)

Stand: 2026-05-29. Aktiver Lock: `-`; Startanker: `V139 139.4 abgeschlossen`; kein offener P1-Schritt; naechster empfohlener AI/Graph-Folgepfad ist `V139 139.5` fuer SLO-, Ops- und Graph-Modell-Haertung oder `V121 121.1` nach User-Priorisierung.
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

## Arbeitsstrom-Index

Dieser Abschnitt ist eine Navigationshilfe fuer Menschen, Agents und die Plan-Map. Die kanonischen Zeilen bleiben die Tabellen unter `## Aktive Bloecke`; Abhaengigkeiten, Locks und Reihenfolge bleiben global.

| Arbeitsstrom | Master-Bloecke | Hinweis |
| --- | --- | --- |
| Hauptspiel | `V76`, `V99`, `V108`, `V112`, `V113`, `V115` | Gameplay, Multiplayer, Hangar, Playtest- und produktnahe Spielqualitaet. |
| Map Content, Map Tools & Settings | `V103`, `V106`, `V114`, `V130` | Map-/GLB-Content, SettingsManager, SurfacePolicy und kuratierte Parcours-Map-Varianz. |
| Android / Mobile | `V132`, `V135` | Android Arcade-Parcours als erster aktiver Mobile-Spielmodus-Folgeblock; V135 fuehrt die Mobile-Menue-/Start-Setup-UX als Folgeblock. Weitere Mobile-/Android-Intakes bleiben bis zur Uebernahme unter `docs/plaene/neu/`. |
| Architektur & Runtime | `V91`, `V92`, `V96`, `V100`, `V101`, `V102`, `V104`, `V105`, `V125` | Runtime-Grenzen, Contracts, Typecheck, Legacy-Surface und Architektur-Gates. |
| Repo-Pflege & Governance | `V90`, `V109`, `V116`, `V117`, `V119`, `V123`, `V126`, `V138` | Governance, Planpflege, Toolchain, Evidence, Cleanup, Delivery-/Dev- und Agent-Diff-Gates. |
| AI / Graph / Agenten-Werkzeuge | `V107`, `V110`, `V111`, `V120`, `V121`, `V122`, `V124`, `V134`, `V137`, `V139` | Wissensgraph, Graph-RAG, Agent-Memory, Plan-/Repo-Navigation und AI-Kontext. |

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
| V90 | Toolchain-Security und Dependency-Upgrade | done | P1 | frei | - | 90.99 | `docs/plaene/aktiv/V90.md` |
| V102 | Security-, Runtime- und Contract-Hardening | done | P1 | frei | V99.99,V100.99 | 102.99 | `docs/plaene/aktiv/V102.md` |
| V114 | SurfacePolicyPort fuer Demo- und Vollversionsgrenze | done | P1 | frei | V98.99,V103.99,V104.99 | 114.99 | `docs/plaene/aktiv/V114.md` |
| V115 | Product & Infra Follow-up (Gameplay, Leaks & Test-Recovery) | done | P2 | frei | - | 115.99 | `docs/plaene/aktiv/V115.md` |
| V105 | Architecture-Guard- und Typecheck-Regression-Recovery | done | P1 | frei | V99.99,V102.99,V104.99 | 105.99 | `docs/plaene/aktiv/V105.md` |
| V117 | AI Decision Framework und Autonomie-Gates | done | P1 | frei | V109.99 | 117.99 | `docs/plaene/aktiv/V117.md` |
| V116 | Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung | done | P1 | frei | V109.99,V117.99,V115.99 | 116.99 | `docs/plaene/aktiv/V116.md` |
| V119 | Planabschluss-Evidence-Remediation und Git-Historienabgleich | done | P1 | frei | V117.99 | 119.99 | `docs/plaene/aktiv/V119.md` |
| V123 | AI-optimierter Plan-Index und Source-of-Truth-Migration | done | P1 | frei | V116.4,V119.1 | 123.99 | `docs/plaene/aktiv/V123.md` |
| V125 | Architektur-Compliance fuer Folgearbeit | done | P1 | frei | V91.99,V104.99,V117.99 | 125.99 | `docs/plaene/aktiv/V125.md` |
| V126 | Local Dev-API, Preview- und Delivery-Hardening | done | P1 | frei | V102.99,V105.99 | 126.99 | `docs/plaene/aktiv/V126.md` |
| V138 | KI-Diff-Audit-Gate fuer deterministische Agenten-Selbstpruefung | done | P1 | frei | V117.99,V119.99,V123.99,V125.99 | 138.99 | `docs/plaene/aktiv/V138.md` |
| V120 | Graph-RAG mit lokalem Context-Adapter | done | P1 | frei | V107.99,V110.99,V111.99 | 120.99 | `docs/plaene/aktiv/V120.md` |
| V139 | Graph-RAG Follow-up Roadmap, Safety und Qualitaetsausbau | planned | P2 | frei | V120.99 | 139.5 | `docs/plaene/aktiv/V139.md` |
| V137 | CodeGraph Read-only Installationsspike fuer Graph-RAG | done | P2 | frei | V107.99,V110.99,V111.99,V120.1 | 137.99 | `docs/plaene/aktiv/V137.md` |
| V121 | Lokaler Graph-RAG Viewer und Evidence-Dashboard | planned | P2 | frei | V120.99,V107.99,V110.99,V111.99 | 121.1 | `docs/plaene/aktiv/V121.md` |
| V134 | Plan Map Intake-Uebersicht und Kandidaten-Trennung | done | P2 | frei | V116.99,V117.99 | 134.99 | `docs/plaene/aktiv/V134.md` |
| V122 | Repo-natives Agent-Memory und externe Ruflo-Orchestrierung | planned | P2 | frei | V116.99,V117.99,V119.1 | 122.1 | `docs/plaene/aktiv/V122.md` |
| V124 | Wissensgraph Produktsemantik-Ausbau und Nutzwert-Ratchet | planned | P2 | frei | V107.99,V110.99,V111.99 | 124.1 | `docs/plaene/aktiv/V124.md` |
| V112 | Spielaudit- und Playtest-Improvement-Paket | done | P1 | frei | V102.99,V105.99 | 112.99 | `docs/plaene/aktiv/V112.md` |
| V96 | Application Boundaries und Legacy-Surface-Reduktion | planned | P2 | frei | V92.99,V64.99 | 96.1 | `docs/plaene/aktiv/V96.md` |
| V106 | Kuratierte GLB-Map-Varianz | planned | P2 | frei | - | 106.1 | `docs/plaene/aktiv/V106.md` |
| V113 | Hangar Shell Productivierung und Rules Panel | planned | P2 | frei | V76.99,V103.99 | 113.1 | `docs/plaene/aktiv/V113.md` |
| V130 | Kreatives Parcours Map Pack und Arcade-Routenvarianz | done | P2 | frei | V82.99,V108.99,V115.99 | 130.99 | `docs/plaene/aktiv/V130.md` |
| V132 | Android Arcade-Parcours Integration | planned | P2 | frei | V82.99,V108.99,V130.99 | 132.1 | `docs/plaene/aktiv/V132.md` |
| V135 | Mobile Menue UX-Hardening und Start-Setup-Kompaktmodus | done | P2 | frei | V132.99 | 135.99 | `docs/plaene/aktiv/V135.md` |

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
| V137 | V107.99 | hard | ja | Core-Graph und Query-Layer bleiben kanonische Vergleichsbasis fuer den CodeGraph-Spike |
| V137 | V110.99 | hard | ja | Graph-Ops-, Guard- und SLO-Basis begrenzen externe Tool- und Installationswirkung |
| V137 | V111.99 | hard | ja | Adaptive Diagnose- und Entscheidungsregeln sichern die Trennung zwischen Curvios-Wahrheit und CodeGraph-Hinweis |
| V137 | V120.1 | hard | ja | Der Spike startet erst nach dem V120-SLO-Ausgangssignal; V120.1 und der V120-Abschluss sind erledigt |
| V123 | V116.4 | hard | ja | Plan-Kontext-Klassifikation und AI-Leseweg bilden die Baseline fuer den strukturierten Plan-Index-Pilot |
| V123 | V119.1 | hard | ja | Evidence-/Abschluss-Baseline ist durch V119 geklaert, bevor Source-of-Truth-Entscheidungen starten |
| V125 | V91.99 | hard | ja | Architektur-Ratchet und Legacy-Surface-Matrix sind die Baseline fuer die Workflow- und Guard-Verankerung |
| V125 | V104.99 | hard | ja | God-Object-/Port-Zuschnitt liefert den aktuellen Contract-/Snapshot-/Intent-Port-Zielpfad fuer Folgearbeit |
| V125 | V117.99 | hard | ja | AI Decision Framework und D3/D4-Gates begrenzen Governance-, Workflow- und Hook-Aenderungen |
| V138 | V117.99 | hard | ja | AI Decision Framework, D3/D4-Gates und Commit-Envelope-Regeln sind Grundlage fuer das Diff-Audit-Gate |
| V138 | V119.99 | hard | ja | Evidence-Remediation und Claim-Pruefung bilden die Baseline fuer ehrliche `Not-checked`- und Broad-Claim-Regeln |
| V138 | V123.99 | hard | ja | Plan-Index-Pilot und Markdown-Source-of-Truth-Regel begrenzen Generated-Artefakte und Schatten-Wahrheiten |
| V138 | V125.99 | hard | ja | Staged Architecture Guard und Workflow-Eskalation sind die technische Baseline fuer weitere Agent-Gate-Haertung |
| V126 | V102.99 | hard | ja | Security-/Runtime-Hardening ist Baseline fuer lokale API- und Preview-Grenzen |
| V126 | V105.99 | hard | ja | Guard-/Typecheck-Recovery ist Baseline fuer gezielte Tooling- und Preview-Verifikation |
| V126 | V90.2 | soft | ja | Dependency-/Version-/Lockfile-Scope ist mit dokumentierten Security-Ausnahmen geschlossen; V126 darf starten, solange Package-/Lockfile-/CI-Upgrades nicht Teil des Slices sind |
| V126 | V125.3 | soft | ja | Neue Pflicht-Gates, Hooks oder Pre-Commit-Policy sind durch den V125-staged-Guard-Pfad koordiniert; V126 bleibt ohne weiteren Hook-Umbau abgeschlossen |
| V121 | V120.99 | hard | ja | Viewer bleibt Consumer von stabilen Graph-RAG-Evidence-Paketen; V120.99 ist abgeschlossen |
| V121 | V107.99 | hard | ja | Core-Graph und Export-/Viewer-Historie bilden die technische Basis |
| V121 | V110.99 | hard | ja | Graph-Ops-, Guard- und SLO-Basis bleibt Voraussetzung fuer sichere Viewer-Exports |
| V121 | V111.99 | hard | ja | Safety-/Redaction- und adaptive Query-Grundlagen sind Basis fuer Evidence-Dashboard-Ausgaben |
| V139 | V120.99 | hard | ja | Der Graph-RAG-Kern ist abgeschlossen; V139 kann Safety-, Retrieval-, Budget- und Handoff-Haertung als Folgeblock starten |
| V122 | V116.99 | hard | ja | Repo-Kontext-Reduktion ist abgeschlossen; dauerhaftes Agent-Memory bleibt trotzdem an V119.1 und V117-Governance gebunden |
| V122 | V117.99 | hard | ja | Decision-Klassen, D3/D4-Gates und Zweckklassen begrenzen Memory-/Ruflo-Scope |
| V122 | V119.1 | hard | ja | Evidence-Baseline ist durch V119 geklaert, bevor dauerhafte Memory-Hinweise verifiziert werden |
| V124 | V107.99 | hard | ja | Core-Graph und Query-Layer sind Basis fuer Produktsemantik-Ausbau |
| V124 | V110.99 | hard | ja | Graph-Ops-, Guard- und SLO-Basis begrenzen Semantik-Ratchet und Coverage-Ausbau |
| V124 | V111.99 | hard | ja | Ownership, Stability, Scorecard und Test-Priorisierung sind Grundlage fuer Produktsemantik-Nutzwert |
| V124 | V112.99,V96.99,V106.99,V113.99 | soft | nein | Produktbloecke liefern wertvolle Harvest-Quellen, sind aber keine Startblocker fuer Baseline und Taxonomie |
| V130 | V82.99 | hard | ja | Arcade-Parcours-/Checkpoint-/Reward-Basis ist abgeschlossen |
| V130 | V108.99 | hard | ja | Ghost-Selbstduell und stabile Route-Persistenz sind abgeschlossen |
| V130 | V115.99 | hard | ja | Playability- und Audit-Follow-up-Erkenntnisse sind abgeschlossen und in Map-Tuning eingeflossen |
| V130 | V106.99,V113.99,V128.99,V129.99 | soft | nein | GLB-/Preview-/Asset-/Manifest-Folgearbeit bleibt bewusst ausserhalb des abgeschlossenen JS-authored Map-Pack-Slices |
| V132 | V82.99 | hard | ja | Arcade-Parcours-Progression, XP, Leaderboard, Splits, Minimap, Penalty und Ghost-Recorder sind technische Basis |
| V132 | V108.99 | hard | ja | Ghost-Selbstduell und stabile Route-Persistenz sind Basis fuer den Android-Wiederholungsreiz |
| V132 | V130.99 | hard | ja | Kuratierte Parcours-Map-Varianz ist kanonisch abgeschlossen |
| V132 | V125.99,V96.99 | soft | nein | V125.99 ist erledigt; V96.99 bleibt offener Boundary-Folgeblock und blockiert den ersten Android-Parcours-Slice nicht |
| V135 | V132.99 | hard | ja | Gemeinsame Android-App, Classic/Parcours-Einstieg, Route-Allowlist und Mobile-HUD-Baseline sind Grundlage fuer den Menue-UX-Folgeblock |
| V135 | V131.99,V125.99,V96.99 | soft | nein | V125.99 ist erledigt; Steuerungs- und V96-Boundary-Folgearbeit bleiben hilfreich, blockieren Fokus-, Chrome- und Start-Setup-UX aber nicht |
| V134 | V116.99 | hard | ja | Plan-Kontext-Reduktion, Intake-/Archivklassifikation und `plan:context:check` sind Baseline |
| V134 | V117.99 | hard | ja | D3/D4-Gates und User-owned Intake-Governance sind Baseline |
| V134 | V123.1,V127 | soft | nein | V123 kann spaeter strukturierte Plan-Daten liefern; V127 bleibt verwandter Repo-/Plan-Map-Crosslink-Scope, aber kein Startblocker |

## Lock-Status

Operativer Lock-Wahrheitsraum liegt in `docs/lock-status/*.json`.
Diese Tabelle ist der kompakte Index fuer Blocksicht im Master.

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V90 | 2026-05-18 | closed | Abgeschlossen 2026-05-18; Security-Ausnahmen mit Wiedervorlage 2026-06-17 |
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
| - | V114 | 2026-05-12 | closed | Abgeschlossen 2026-05-12; V119 119.3 hat schwache `verified`-Evidence konkret nachbelegt |
| - | V115 | - | closed | Abgeschlossen 2026-05-14 |
| - | V105 | 2026-05-13 | closed | Abgeschlossen 2026-05-13 |
| - | V117 | 2026-05-14 | closed | Abgeschlossen 2026-05-14 |
| - | V116 | 2026-05-18 | closed | Abgeschlossen 2026-05-18 |
| - | V119 | 2026-05-23 | closed | Abgeschlossen 2026-05-23; P1-/P2-Evidence-Remediation, Praeventions-Check und Abschluss-Gates gruen |
| - | V123 | 2026-05-26 | closed | Abgeschlossen 2026-05-26; Plan-Index-Pilot, Drift-/Kontext-/Dashboard-/Docs-/Graph-Gates gruen; Markdown bleibt kanonisch |
| - | V125 | 2026-05-22 | closed | Abgeschlossen 2026-05-22; Architektur-Capsule, staged Guard, Boundary-/Ratchet-/Contract-Evidence und Abschluss-Gates gruen |
| - | V126 | 2026-05-20 | closed | Abgeschlossen 2026-05-20; Dev-API-/Preview-Hardening gruen, Handoff an V127/V128/V129 |
| - | V138 | 2026-05-26 | closed | Abgeschlossen 2026-05-27; KI-Diff-Audit, Agent-Preflight-Integration, D2-Not-checked und Abschluss-Gates gruen |
| - | V120 | 2026-05-27 | closed | Abgeschlossen 2026-05-28; Graph-RAG-Abschluss-Gates, Docs, Fallbacks und Budget-Evidence gruen |
| - | V139 | - | frei | 139.4 abgeschlossen 2026-05-29; naechster Slice 139.5 SLO-, Ops- und Graph-Modell-Haertung |
| - | V137 | 2026-05-29 | closed | Abgeschlossen 2026-05-29; CodeGraph bleibt `manual-only`, kein MCP/Agent-Config, Graph-/Plan-/Docs-Gates gruen |
| - | V121 | - | frei | Geplant |
| - | V134 | 2026-05-22 | closed | Abgeschlossen 2026-05-22; Plan-Map-Intake-Lanes, Summary-Split und read-only Handoff-Links gruen |
| - | V122 | - | frei | Geplant |
| - | V124 | - | frei | Geplant |
| - | V96 | - | frei | Geplant |
| - | V106 | - | frei | Geplant |
| - | V107 | 2026-05-07 | closed | Abgeschlossen 2026-05-08 |
| - | V110 | 2026-05-08 | closed | Abgeschlossen 2026-05-09 |
| - | V111 | 2026-05-09 | closed | Abgeschlossen 2026-05-10 |
| - | V112 | 2026-05-20 | closed | Abgeschlossen 2026-05-20; Spielaudit-/Playtest-Hardening gruen, T20ba-Seitenfund dokumentiert |
| - | V113 | - | frei | Geplant |
| - | V130 | 2026-05-20 | closed | Abgeschlossen 2026-05-20; sechs Parcours-Maps, gestaffelter Arcade-Pool und targeted Map-Pack-Smokes gruen |
| - | V132 | - | frei | Geplant; Android Arcade-Parcours nach V82/V108 und kanonischem V130-Abschluss |
| - | V135 | 2026-05-22 | closed | Abgeschlossen 2026-05-22; Fokus-/Scrollsprung, kompakter Start-Setup-CTA und Mobile-Route-Auswahl gruen |

## Empfohlene Reihenfolge

1. `V126` ist abgeschlossen: Training-Spawn, Preview-Mutationsgrenze, lokale API-Matrix, Ringbuffer und erste `vite.config.js`-Entflechtung sind gruen; Folgepfade bleiben `V127`, `V128` und `V129`.
2. `V112` ist abgeschlossen; der dokumentierte `T20ba`-Seitenfund bleibt ausserhalb dieses Blocks als separater Ghost-Replay-Hinweis.
3. `V125` ist abgeschlossen: Architektur-Capsule, staged Architecture Guard, Workflow-Eskalation, Application-/Electron-Scorecard und Ratchet-/Contracttest-Evidence sind gruen.
4. `V119` ist abgeschlossen: historische Plan-Evidence ist pro Befund entschieden, schwache Abschlussclaims sind nachgeschaerft oder als Restwiderspruch sichtbar, und der Praeventions-Check ist gruen.
5. `V123` ist abgeschlossen: Plan-Index, Drift-/Kontext-Checks und Dashboard laufen als nicht-kanonischer Pilot; `docs/Umsetzungsplan.md` bleibt bis zur expliziten Migration kanonisch.
6. `V138` ist abgeschlossen: staged Diff Audit, `Generated-by:`, `Canonical-source:`, Shadow-Truth-Heuristik, Gate-Bypass-Muster und `Not-checked:` ab D2 sind im Agent-Preflight/Commit-Envelope verankert.
7. `V120` (Graph-RAG mit lokalem Context-Adapter) ist abgeschlossen: Graph-RAG-Nutzung fuer Erklaer-/Historienfragen ist von strukturierten Graph-Queries fuer harte Scope-/Impact-Fakten getrennt; Abschluss-Gates fuer Graph, Plan, Docs, Contracts, Fallbacks und Budget-Evidence sind gruen.
8. `V137` ist abgeschlossen: CodeGraph bleibt nach lokalem Init, Sync, drei Curvios-/CodeGraph-Referenzvergleichen und `manual-only`-Entscheidung ein lokaler CLI-Hinweisgeber; MCP und Agent-Config bleiben separate D4-Gates; Curvios-Graph bleibt Wahrheit.
9. `V139` (Graph-RAG Follow-up Roadmap, Safety und Qualitaetsausbau) ist nach `V120.99` und `V137.99` gestartet; `139.2` hat Output-Pfade und lokale Runtime-Grenzen geschlossen, `139.3` hat Retrieval-Aliase, negative Referenzfragen, Ranking-Metriken und ehrliche Confidence-Signale ergaenzt, `139.4` hat Consumer-Hints, Budget-Konsistenz und Adapter-Evidence-Qualitaet nachgezogen; danach folgen in `139.5` SLO-/Ops-Signale und Handoffs zu V121/V137/V122/V124.
10. `V121` (Lokaler Graph-RAG Viewer und Evidence-Dashboard) kann nach `V120.99` als read-only Consumer stabiler Graph-RAG-Evidence-Pakete starten.
11. `V134` ist abgeschlossen: Plan Map trennt Intake-Drafts in Ideen, bereits geplante Drafts, Archivkandidaten, Bot-Training und Meta, ohne Source-of-Truth- oder Move-Pfade zu erweitern.
12. `V122` (Repo-natives Agent-Memory und externe Ruflo-Orchestrierung) kann nach V119-Baseline eingeordnet werden; Graph-RAG-/Ruflo-Kontext darf nach `V120.99` nur mit eigenem Scope und Governance-Gate starten.
13. `V124` (Wissensgraph Produktsemantik-Ausbau und Nutzwert-Ratchet) nach Graph-Frische und ersten produktnahen Harvest-Quellen aus V112/V96/V106/V113 einordnen.
14. `V114` (SurfacePolicyPort fuer Demo- und Vollversionsgrenze), falls nach Abschlussabgleich noch Produktgrenzen nachzuziehen sind.
15. `V96` als groesseren Boundary-/Legacy-Folgeblock nach den P1-Hardening- und Produktqualitaets-Schnitten einplanen.
16. `V106` und `V113` als produktnahe Content-/Hangar-Folgeblocks einordnen, sobald kein P1-Hardening blockiert.
17. `V130` ist kanonisch abgeschlossen: sechs neue Parcours-Maps, gestaffelte Arcade-Pool-Erweiterung und targeted Contract-/Start-Smokes sind gruen; Browser-Demo, GLB-/Asset-Setdressing und Preview-Scope bleiben bewusst unveraendert.
18. `V132` (Android Arcade-Parcours Integration) kann nach kanonischem V130-Abschluss und idealerweise nach V131-Steuerungsbaseline eingeordnet werden; erster Slice bleibt kuratierter Android-Parcours statt vollstaendiger Desktop-Modusparitaet.
19. `V135` ist abgeschlossen: Fokus-/Scrollsprung, kompakter Mobile-Start-CTA, Route-Kurzpfad und Landscape-/Small-Viewport-Regeln sind gruen; echtes Android-WebView-Geraet und APK/Install-Flow bleiben ausserhalb dieses Slices.

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | BOM+Shebang blockierte Playwright-Verifikation | UTF-8-no-BOM geschrieben; Parserblocker beseitigt | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Windows-Startblocker (`spawn EINVAL`) vor Playwright | Launcher auf lokale CLI + separator-neutrale Filter umgestellt | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | `node:test`-Files wurden als Playwright-Specs entdeckt | Discovery auf `**/*.spec.js` begrenzt | erledigt |
