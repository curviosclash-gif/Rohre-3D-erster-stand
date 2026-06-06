# Plan-Changelog (Umsetzungsplan-Historie)

Fortlaufende Status-, Abgleich- und Abschluss-Notizen zu Bloecken aus `docs/Umsetzungsplan.md`.

Dieses Changelog ist die kanonische Ablage fuer Status-Fliesstext, der frueher in der `Stand:`-Kopfzeile und unter `## Aufgeschobene Fixes` des Master-Index gefuehrt wurde. Der Master-Index verlinkt hierher statt den Fliesstext erneut zu kopieren.

Eintraege werden am Ende angehaengt und sind nicht streng chronologisch, aber jeder Eintrag fuehrt ein Datum und die betroffene Subphase.

## V132 Status-Sync 2026-06-06

- Nach User-Gate wurde die Master-/Index-Statusdrift fuer `V132` bereinigt: `docs/Umsetzungsplan.md` folgt jetzt der aktiven Detailakte `docs/plaene/aktiv/V132.md` mit Status `done`, Phase `132.99` und geschlossenem Lock-Hinweis.
- Begruendung: `V132.md` enthaelt vollstaendige Abschluss-Evidence bis `132.99`; Master und generierter Index standen noch auf `planned`/`132.1` und blockierten damit die Folgepriorisierung kuenstlich.
- Evidence: `npm run guard:main`, `npm run plan:check`, `npm run lock:validate` und `npm run plan:index:check` vor dem Sync -> PASS; `npm run docs:check` vor dem Sync -> FAIL wegen 3 Freshness-Stamps; `npm run graph:build` wurde nach User-Freigabe noetig, weil `graph:check` den Master-Sync als Generated-Drift erkannte; `npm run gates:pre-commit` nach Sync -> PASS.
- Residual-risk: Es wurde keine Android-Device-Nachpruefung nachgeholt; der Sync uebernimmt die Not-checked-Grenzen aus der aktiven V132-Akte.
- Not-checked: keine Produktcode-Aenderung, keine Runtime-/Android-/Touch-Dateien, keine Vollsuite, keine neue Source-of-Truth-Migration.

## Priorisierungsabgleich 2026-06-05 (offene V-Bloecke)

- Nach User-Auftrag wurde die tiefere read-only Analyse offener V-Bloecke in die empfohlene Reihenfolge des Master-Index eingetragen: erst `V132`-Statusdrift, dann ein kleiner `V140`-Gate-Recovery-Slice, danach `V131`, `V118`, `V106`, `V113`, `V96` und erst spaeter die gestaffelten Meta-/AI-Bloecke.
- Begruendung: `V132` ist im Master/Index noch `planned`, die aktive Detailakte enthaelt aber `done`-Evidence; `docs:check` war vor dem Eintrag wegen drei Freshness-Stamps rot; `lint:architecture` bleibt wegen `MobileClassicApp.js` und `TouchInputSource.js` rot. Diese Basisgates sollen vor breiter Produkt- oder Meta-Arbeit entschärft werden.
- Evidence: `npm run plan:check`, `npm run plan:index:check`, `npm run plan:context:check`, `npm run graph:check`, `npm run check:plan-evidence-claims`, `npm run check:agent-context`, `node scripts/query-knowledge-graph.mjs scope-collisions --json`, `critical-path-health`, `coverage-report`, `docs:check`, `lint:architecture`, `npm run plan:index:build` und `npm run gates:pre-commit` wurden fuer Priorisierung und Eintrag ausgewertet; das Meta-Gate fuehrte `docs:sync` aus und brachte Docs-Freshness wieder auf PASS.
- Residual-risk: Die Reihenfolge ist eine Planempfehlung und schliesst `V132` oder `lint:architecture` nicht selbst; die Architektur-Max-Lines-Basis bleibt bis zu einem eigenen Umsetzungsslice bestehen.
- Not-checked: keine Produktcode-Aenderung, keine Architekturfixes, keine Vollsuite, kein Bot-Training-Gate.

## Plan-Intake 2026-06-04 (V118, V127, V131, V136, V140-V144)

- Nach User-Gate `bitte aufnehmen` wurden die neun normalen `intake-review`-Drafts in den Master-Index und kanonische aktive Planakten uebernommen: `V118`, `V127`, `V131`, `V136`, `V140`, `V141`, `V142`, `V143` und `V144`.
- Die beiden bisherigen TBD-Drafts wurden eindeutig zugeordnet: Agent-Skills -> `V143`, JSON-Source-of-Truth-Future-Entscheidung -> `V144`; `V133` bleibt laut Rollback-Historie No-go, `V128`/`V129` bleiben V126-Handoff-Ideen.
- Scope-Grenze: keine Bot-Training-Intakes, keine Archiv-Moves, keine Runtime-/Code-Umsetzung und keine Source-of-Truth-Umstellung auf JSON.
- Evidence: `npm run plan:context:check` vor Intake -> PASS mit 9 `intake-review`, 0 Violations und cleanem Drift; nach Intake `npm run plan:check`, `npm run plan:index:check`, `npm run plan:context:check`, `npm run graph:check`, `npm run docs:check`, `npm run check:plan-evidence-claims` und `npm run gates:pre-commit` -> PASS.
- Residual-risk: Die neuen Bloecke sind geplant/frei und konkurrieren in der Priorisierung; V140 basiert auf der bereits vorhandenen uncommitted Draft-Aktualisierung, die nicht als Draft-Datei Teil dieses Intake-Commits wird.
- Not-checked: keine Vollsuite, keine Produktpfade, keine Bot-Training-Gates, keine Archivierung der Drafts.

## Governance-Notiz 2026-06-04 (Graph/RAG-Router)

- Nach User-Auftrag wurde die Graph-vs-RAG-Entscheidungslogik in Rules und Standard-Workflows sichtbarer gemacht: strukturierte Graph-/Plan-/Code-Quellen bleiben Pflicht fuer harte Scope-, Lock-, Dependency-, Impact-, Coverage- und Source-of-Truth-Fakten; Graph-RAG ist als Erklaer-, Historien- und Evidence-Summary-Hilfe begrenzt.
- Betroffene Governance-Pfade: `.agents/rules/token_efficiency_and_tools.md`, `.agents/workflows/code.md`, `.agents/workflows/quick.md`, `.agents/workflows/bugfix.md`, `.agents/workflows/plan.md`, `.agents/workflows/status.md`.
- Gate-Sync: `docs/generated/knowledge-graph.json` und `docs/generated/knowledge-graph.coverage.json` wurden durch `graph:build` nachgezogen, weil `graph:check` den bereits getrackten V141-Draft noch nicht im generierten Graph sah.
- Evidence: `npm run plan:check`, `npm run check:plan-evidence-claims`, `npm run graph:build` und `npm run gates:pre-commit` -> PASS.
- Residual-risk: Die Trennung ist workflow-seitig klarer, aber weiterhin agentenabhaengig; sie erzwingt keine maschinelle RAG-Nutzungspruefung pro Antwort.
- Not-checked: keine Produktcode-, Masterplan-, Lock- oder RAG-Kernskript-Aenderung; der fremde V140-Draft bleibt uncommitted ausserhalb dieses Slices.

## V122 122.1 Planungsschaerfung 2026-06-04

- Nach User-Auftrag wurde die externe Repo `pogii123/obsidian-agentic-second-brain` als begrenzter Quelleninput in V122 eingeplant: Curvios uebernimmt das Trust-Modell fuer Agent-Memory (`system_of_record`, `verification`, `review_after`, `last_synced`, External Mirrors, Health-Report und Node-Provenance-Pruefung), aber keine Obsidian-/PARA-Repo-Struktur.
- Einordnung: Die Ergaenzung schaerft V122.1/122.2/122.3/122.3a/122.6/122.7, ohne neue Source-of-Truth, neue Agent-Governance oder externe Tool-Installation einzufuehren.
- Evidence: `node scripts/query-knowledge-graph.mjs open-deps V122 --json` -> PASS mit `openDependencies: []`; `node scripts/query-knowledge-graph.mjs scope-collisions --json` -> PASS ohne V122-Kollision.
- Not-checked: keine `docs/agent-memory/**`-Dateien angelegt, kein Memory-CLI gebaut, kein Ruflo-/MCP-Setup, kein Obsidian-Vault-Import, keine produktiven Runtime-/UI-/Gameplay-Pfade und keine Vollsuite.

## Governance-Notiz 2026-05-31 (Freigabefragen)

- Nach User-Auftrag muessen Workflow-Freigabefragen den entscheidbaren Scope in Alltagssprache erklaeren: benoetigte Entscheidung, Gate-Grund, konkrete Umsetzung, erwarteter Effekt, ausgeschlossener Scope und passende Kurzantwort; bei D3/D4 bleiben Alternativen, Blast-Radius und D4-Recovery explizit.
- Die gemeinsame Pflicht steht in `.agents/rules/planning_and_governance.md`; `code`, `fix-planung`, `bugfix`, `plan`, `cleanup` und der Quick-Exit verweisen auf dieses Format.
- Residual-risk: Freitextqualitaet bleibt agentenabhaengig; die neue Regel macht die Pflicht pruefbar sichtbar, erzwingt aber noch kein maschinelles Prompt-Linting.
- Not-checked: keine Aenderung an produktivem Code, Plaenen, Locks oder Graph-Artefakten.

## Mobile Android Level-4 UX-Follow-up 2026-05-29

- Nach User-Gate wurde die freigegebene Mobile-Classic-WIP-Aenderung als V135-Follow-up uebernommen: Android-Level-4 oeffnet direkt die kuratierten `Einstellungen`, erlaubt mobil nur `mobile_controls` und `gameplay`, und blendet Desktop-/Expert-Tuning im Mobile-Shell aus.
- Evidence: `node --test tests/mobile-classic-app.contract.test.mjs tests/mobile-arcade-app.contract.test.mjs` -> PASS (29/29).
- Residual-risk: Die Aenderung ist bewusst Mobile-App-spezifisch; ein echter Android-WebView-/Device-Smoke bleibt separat.
- Not-checked: keine Vollsuite, kein APK-/Installationslauf, keine Desktop-Browser-Suite.

## V137 137.99 Abschluss-Gate 2026-05-29

- V137 ist abgeschlossen: CodeGraph bleibt nach Version-/Installationscheck, lokalem ignoriertem Index, drei Vergleichsfragen und Go/No-Go als `manual-only` CLI-Hinweisgeber begrenzt; keine MCP-Registrierung, kein globaler Install und keine Agent-/User-Config-Aenderung wurden ausgefuehrt.
- Der externe Abschlussblocker `update_android_phone.bat` ist geloest: der Root-Wrapper ist als `repo-ops` klassifiziert, waehrend `scripts/update-android-phone.mjs` als Graph-bekannter Skriptpfad sichtbar bleibt.
- Evidence: `node --test tests/knowledge-graph-build.contract.test.mjs`, `npm run graph:build`, `npm run graph:check`, `coverage-report`, `npm run plan:check`, `npm run plan:index:build`, `npm run plan:index:check`, `npm run docs:sync`, `npm run docs:check` und `npm run gates:pre-commit` -> PASS.
- Residual-risk: CodeGraph-Ausgaben bleiben technische Kandidaten und duerfen keine Plan-, Scope-, Lock-, Produktsemantik-, Testauswahl- oder Governance-Entscheidung tragen; ein spaeterer V122-MCP-Pfad bleibt D4/User-Gate.
- Not-checked: kein `codegraph uninit`, keine MCP-Registrierung, keine globale Installation, keine Agent-/User-Config-Aenderung, keine produktive Runtime-/UI-/Gameplay-Aenderung und keine Vollsuite.

## Mobile Android Steuerungs-Hardening 2026-05-28

- Nach User-Gate `bitte alles umsetzen` wurde der Android-Steuerungsslice umgesetzt: Classic und Parcours zeigen einen Pause-Button, Touch-Controls geben sichtbare Overlays frei, Android-Back wird im Match an Pause/Resume delegiert, der Joystick kann links als Floating-Fallback starten, und Mobile-Tilt nutzt `soft` als Default-Assist.
- Evidence: `node --test tests/mobile-classic-app.contract.test.mjs`, `node --test tests/mobile-arcade-app.contract.test.mjs`, `npm run app:android:check`, `npm run app:android:assets:check`, `npm run docs:check`, `npm run gates:pre-commit` -> PASS.
- Residual-risk: Native Back-Integration ist im Java-Wrapper contract-/textgesichert; echter Android-WebView-/Back-Button-Smoke bleibt wegen Device-Abhaengigkeit manuell.
- Not-checked: keine Vollsuite, keine echte Android-Installation, keine FPS-/Sensor-Latenz-Messung, keine Desktop-Playwright-Suite.

## V137 137.2 Repo-Schutz vor Init 2026-05-28

- Nach User-Gate `setze plan 137 fort` wurde der V137-Schutzslice vor jeder CodeGraph-Init-Wirkung geschlossen: `.gitignore` ignoriert jetzt `.codegraph/`, V137 steht im Master auf `137.3`, und der naechste Schritt bleibt D4/User-Gate.
- Evidence: `git status --short --branch` vor Init -> `main` ahead 5 mit bereits fremd gestagtem `docs/plaene/neu/Feature_Graph_RAG_Followup_Roadmap_V139.md`; `node scripts/query-knowledge-graph.mjs scope-collisions --json` meldete keine V137-Kollision; `npm run plan:check`, `npm run plan:index:check`, `npm run graph:check`, `npm run docs:sync`, `npm run docs:check`, `npm run check:plan-evidence-claims` und `npm run gates:pre-commit` -> PASS.
- Residual-risk: `137.3` darf ohne separates User-Gate keinen Projektindex erzeugen; MCP- und Agent-Config bleiben spaetere eigene D4-Gates.
- Not-checked: kein CodeGraph-Installer, kein `npx`, kein `codegraph init`/`uninit`, keine MCP-Registrierung, keine Agent-/User-Config-Aenderung, keine CodeGraph-Vergleichsfragen und keine Vollsuite.

## Android Classic Bugfix 2026-05-28

- Android-Classic setzt im nativen Capacitor-Wrapper `FLAG_KEEP_SCREEN_ON`, damit laufende Mobile-Partien bei Tilt-/Controller-Steuerung nicht nach dem Android-Display-Timeout abdunkeln oder sperren.
- Evidence: `npm run plan:check`, `npm run app:classic:android:check`, `npm run app:android:check` -> PASS.
- Not-checked: kein echter Android-Geraetelauf und kein APK-Installationslauf; Map-Tools-Android bleibt unveraendert.

## V76 DoD.5 Werkstatt-Follow-up 2026-05-27

- Nach User-Gate wurde der historische V76-DoD.5-Restwiderspruch geschlossen: Vehicle Lab besitzt jetzt History-State fuer Undo/Redo, ein Vergleichspanel gegen Presets und eine klare Desktop-Statusbar mit Blueprint-/History-/Auswahlstatus.
- Evidence: `node --check prototypes/vehicle-lab/main.js`, `node --check prototypes/vehicle-lab/src/VehicleLabUI.js`, `node --test tests/vehicle-lab-history.contract.test.mjs tests/vehicle-lab-workshop-ui.contract.test.mjs tests/hangar-desktop-flow.contract.test.mjs tests/arcade-hangar-rules.contract.test.mjs` -> PASS (18/18), `npm exec -- vite build` -> PASS.
- Residual-risk: `npm run build` stoppt vor dem Vite-Build im bestehenden `architecture:guard` wegen Max-Lines-Fehlern ausserhalb des Slices (`src/mobile-classic/MobileClassicApp.js`, `src/ui/TouchInputSource.js`); `test:browser:compat -- tests/editor-vehicle.spec.js` blieb im lokalen Vite-Dev-Transform fuer Vehicle-Lab-Dateien haengen und ist deshalb nicht als Abschluss-Evidence verwendet.
- Not-checked: keine Vollsuite, keine produktive Electron-Runtime, kein Multiplayer-/Recording-/Bot-Training-Scope und keine V113-Hangar-Shell-Productivierung.

## V123 123.99 Abschluss-Gate 2026-05-26

- Nach User-Gate `setze plan 123 fort` wurde V123 als D3-Plan-/Governance-Slice geschlossen: aktive Planakte, Master-Index und Lock-Status zeigen den abgeschlossenen Plan-Index-Pilot ohne Source-of-Truth-Wechsel.
- Abschlussbild: `docs/Umsetzungsplan.md` bleibt kanonische Schreib- und Entscheidungsquelle; `docs/generated/plan-index.json` bleibt generierter, nicht-kanonischer Einstieg fuer Blockstatus, `workstream`, Startanker, Empfehlung und Lock-Projektion; bei Konflikt gewinnt weiter der Markdown-Master.
- Drift-/Kontextpfad: `plan:index:check` und `plan:context:check` melden `drift_status=clean` und `index_violations=0`; das HTML-Dashboard bleibt eine generierte read-only Menschenansicht ohne eigene Planlogik.
- Entscheidung: Option A ist abgeschlossen. Option B, JSON als spaetere Source-of-Truth, bleibt als Future-Intake mit Blast-Radius, Promotion-Kriterien, Entscheidungstests und Rollback-Anforderungen dokumentiert.
- Evidence: `npm run plan:check`, `npm run plan:index:check`, `npm run plan:context:check`, `npm run graph:check`, `node --test tests/plan-dashboard.contract.test.mjs`, `npm run docs:sync`, `npm run docs:check` und `npm run gates:pre-commit` -> PASS.
- Not-checked: keine Vollsuite, keine produktiven Runtime-/UI-/Gameplay-/Bot-Training-Pfade, kein Graph-Source-Switch und keine Autoritaetsverschiebung auf JSON; V120/V123-Overlap bleibt bewusst spaeterer Consumer-/Migrationsscope.

## Plan-Intake 2026-05-26 (Block `V137`)

- `V137` ist als geplanter P2-Block fuer den CodeGraph Read-only Installationsspike in den Master aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V137.md`.
- Einordnung: eigener AI/Graph-Scope statt versteckter V120-Unterpunkt, weil `codegraph init`, MCP-Registrierung und globale Agent-Config D4/User-Gates bleiben muessen.
- Dependencies: harte Baseline `V107.99`, `V110.99`, `V111.99` und `V120.1`; der Spike soll nach dem V120-SLO-Ausgangssignal starten und V120 nicht durch eine Installation blockieren.
- Der Draft `docs/plaene/neu/Feature_CodeGraph_Readonly_Installation_Spike.md` ist als `adopted-open`/`superseded_by` markiert; aktive Steuerung liegt in `V137`.
- Evidence: `npm run plan:check`, `npm run plan:index:build`, `npm run plan:index:check`, `npm run plan:dashboard:build`, `npm run plan:context:check`, `npm run graph:build`, `npm run graph:check`, `npm run docs:sync`, `npm run docs:check`, `npm run check:plan-evidence-claims` und `npm run gates:pre-commit` -> PASS; `check:plan-evidence-claims` meldet weiterhin die bekannte V76-Warnung.
- Not-checked: kein CodeGraph-Installer, kein `codegraph init`, keine MCP-Registrierung, keine globale User-/Agent-Config, keine produktiven Runtime-/UI-/Spielpfade und keine Vollsuite.

## V119 119.99 Abschluss-Gate 2026-05-23

- Nach User-Gate `beende plan 119` wurde V119 als D3-Doku-/Governance-Slice geschlossen: aktive Planakte, Master-Index und Lock-Status zeigen `done`/`119.99`/closed, ohne historische Altplaene rueckwirkend schoenzuschreiben.
- Abschlussbild: P1-Befunde sind geloest oder als historischer Restwiderspruch dokumentiert; P2-Befunde sind nachgeschaerft oder als historische Minimal-Evidence begruendet; der Praeventions-Check meldet kuenftige offene DoDs, offene `*.99` und schwache Evidence-Muster reproduzierbar als Warnsignal.
- Bekannter Residual-risk bleibt `docs/plaene/aktiv/V76.md` DoD.5: Undo/Redo, Vergleich und Statusleiste sind in der historischen V76-Evidence nicht vollstaendig gedeckt und bleiben bewusst sichtbarer Restwiderspruch.
- Evidence: `npm run plan:check`, `npm run check:plan-evidence-claims`, `npm run graph:build`, `npm run graph:check`, `npm run docs:sync`, `npm run docs:check` und `npm run gates:pre-commit` -> PASS; `check:plan-evidence-claims` meldet weiterhin die erwartete V76-Warnung.
- Not-checked: keine Vollsuite und keine produktiven Runtime-/UI-/Multiplayer-/Recording-/Physik-/Bot-Training-Pfade; V119 war ein Plan-/Evidence-/Governance-Slice.

## V119 119.4 Praeventions-Gate 2026-05-23

- Nach User-Gate `ssetze plan 119 fort` wurde der D3-Slice fuer `V119 119.4` umgesetzt: `scripts/check-plan-evidence-claims.mjs` meldet offene Top-Level-DoDs bei `status: done`, offene `*.99`-Gates und schwache Evidence-Muster jetzt als Warn-Findings statt als harte Verletzung.
- `tests/plan-evidence-claims.contract.test.mjs` deckt die neuen Praeventionssignale ab: done-Plan plus offener DoD, done-Plan plus offenem `*.99` und `evidence: verified` werden jeweils reported; der fokussierte Node-Contract-Run ist gruen.
- Der Real-Repo-Check bleibt bewusst nicht blockierend: `npm run check:plan-evidence-claims` ist PASS und meldet aktuell `warnings=1` fuer den in `119.2` dokumentierten historischen V76-DoD.5-Restwiderspruch.
- `.agents/workflows/fix-planung.md` fordert fuer kuenftige Abschlussclaims den gemeinsamen Abgleich von DoD-Status, `*.99`-Gate, Git-/Gate-Historie und Evidence-Qualitaet. V119 steht danach auf `119.99` fuer das Abschluss-Gate.

## V119 119.3 P2-Evidence-Remediation 2026-05-22

- Nach User-Gate `setze plan 119 fort` wurde der D3-Doku-Slice fuer `V119 119.3` umgesetzt: `guard:main`, `plan:check`, `lock:validate`, `agent:preflight`, targeted Node-Contract-Nachbeleg (`88` PASS), `graph:check` und `gates:pre-commit` waren gruen.
- `V93` referenziert seine Top-Level-DoDs nun auf konkrete `93.x`-/`93.99`-Evidence und Commits; `V102` und `V105` ersetzen generische `test -> pass`-/`verified`-Abschlussclaims durch Commit-, Command- und Contract-Nachweise und spiegeln danach die gedeckten Top-Level-DoDs.
- `V114` ersetzt die bisherigen `verified`-Eintraege durch den `SurfacePolicyPort`-Commit, den targeted Contract-Run und einen Scan, der direkte produktive `isSurface*Allowed`-Imports auf `SurfacePolicyPort.js` begrenzt; die Master-Zeile zeigt wieder `114.99`.
- Archivfaelle: `V56` erhaelt konkrete DoD-Evidence aus `4a3b6a84` und `56.99`, `V54` ersetzt den Sammelclaim `all mandatory checks PASS` durch konkrete Architektur-/Build-/Test-Gates. `V52` war bereits hinreichend konkret und blieb unveraendert.
- V119 bleibt offen fuer `119.4`: Praeventions-Check und Contract-Regel gegen kuenftige schwache Abschlussclaims sind noch ausstehend; keine Runtime-, Test- oder Feature-Dateien wurden veraendert. `npm run graph:build` hat den Knowledge-Graph fuer die Plan-Doku-Aenderungen aktualisiert.

## V119 119.2 P1-Remediation 2026-05-22

- Nach User-Gate wurde der D3-Doku-Slice fuer `V119 119.2` umgesetzt: `npm run guard:main`, `npm run plan:check`, `npm run lock:validate` und `agent:preflight` waren gruen.
- `V94` ist top-level konsistent nachgezogen: DoD.1-DoD.13 spiegeln jetzt die bereits vorhandene `94.1`-bis-`94.99`-Evidence fuer Builder, Schema, Validator, Workflows, Query-CLI und Gate-Kette.
- `V76` wurde nur teilweise gespiegelt: DoD.1-DoD.4 und DoD.6 sind durch `76.99.1/76.99.2` plus Subphasen-Evidence gedeckt; DoD.5 bleibt offen, weil Undo/Redo/Vergleich/Statusleiste nicht vollstaendig durch V76-Abschluss-Evidence belegt sind.
- Archivierte oder ueberholte Faelle wurden bewusst nicht umgeschrieben: `V41`, `V48`, `V75`, `V81`, `V83` und `V84` behalten historische offene Top-Level-DoDs bzw. Gates als Restwiderspruch; bei `V74` gilt die neuere geschlossene Refresh-Akte `docs/plaene/alt/V74.md` statt des aelteren offenen Archivtexts.
- `V102` und `V105` bleiben fuer `119.3`, weil dort die vorhandene generische Evidence (`test -> pass`, `verified`) erst konkretisiert werden muss, bevor weitere DoD-Spiegelungen belastbar sind.

## Planarchiv-Notiz 2026-05-22 (Planrauschen reduziert)

- Nach User-Gate wurden die aktiven Archivkandidaten `V75`, `V81`, `V85`, `V86` und `V89` aus `docs/plaene/aktiv/` nach `docs/plaene/alt/VXX.md` verschoben; sie sind abgeschlossen, nicht Master-referenziert und verlieren aktive Steuerautoritaet.
- Ebenfalls archiviert wurden die 5 erledigt-adoptierten Intake-Drafts zu `V90`, `V112`, `V116` und `V134` unter `docs/plaene/alt/superseded-intakes-2026-05/`; der Archivindex nennt weiter Klassifikation, kanonische Quelle und Read-Regel.
- Bewusst nicht verschoben: 8 offen adoptierte Intake-Drafts, 5 echte Intake-Review-Drafts, Bot-Training-Sonderfaelle und Meta-Dateien.
- Recovery: `git revert <commit>` stellt die Plan-Dateimoves und README-/Changelog-Notizen wieder her.
- Evidence: `npm run graph:build` -> PASS; `npm run plan:context:check` -> PASS; `npm run plan:check` -> PASS; `node --test tests/plan-map-export.contract.test.mjs` -> PASS; `node --check scripts/export-plan-map.mjs` -> PASS; `node --check tools/plan-map/viewer.js` -> PASS; `npm run gates:pre-commit` -> PASS.

## Plan-Map-Notiz 2026-05-22 (Archivkontext ohne Intake-Rauschen)

- Die Plan Map exportiert `archiveReferences` aus `docs/plaene/alt/`, inklusive superseded Intake-Index und direkten archivierten `VXX.md`-Blockdateien, als read-only Historienlayer statt als normale Intake- oder Master-Map-Karten.
- Der Viewer zeigt Archivbezug nur als `Historie / Archiv` im Blockdetail und per optionalem `Archiv anzeigen`-Toggle in `Ideen / Intake`; Archivverweise zaehlen nicht in Readiness, Scope-Kollisionen, Startempfehlung oder normale Intake-Entscheidungen.
- Evidence: `node --test tests/plan-map-export.contract.test.mjs` -> PASS; `node --check scripts/export-plan-map.mjs` -> PASS; `node --check tools/plan-map/viewer.js` -> PASS; `npm run plan:context:check` -> PASS; `npm run plan:check` -> PASS; `npm run gates:pre-commit` -> PASS.

## Governance-Notiz 2026-05-22 (Commit-/Hook-Tooling)

- Der Lock-Registry-Merger schreibt `_locks-registry.json` nur noch bei semantischen Lock-/Metadaten-Aenderungen; reine `generated_at`-Abweichungen bleiben unveraendert, damit `pre-commit` und `lock:validate` keine Timestamp-Diffs erzeugen.
- `agent:preflight`/`commit-msg` geben bei fehlenden Restdiffs eine direkt nutzbare `Known-uncommitted:`-Zeile aus und markieren bekannte generierte Hook-/Timestamp-Churn-Dateien explizit.
- `npm run agent:commit` ist ein read-only Wrapper fuer typische Abschlusscommits: staged Scope lesen, Code/Test- vs. Plan/Graph/Doku-Slice anzeigen, Masterindex+Code-Split blockieren und die passende `Known-uncommitted:`-Zeile ausgeben.
- Laufzeitbefund: `lock:validate`, `plan:check` und `check:architecture:staged` lagen lokal jeweils bei rund 4.6-4.8s; der eigentliche Timeout-Risikopfad ist damit eher die Summe aus Hook plus Commit-Msg/Preflight als ein einzelner Lock-Check. Schwere Gates bleiben in `gates:pre-commit` statt doppelt im normalen `pre-commit`.

## Abschluss-Snapshot 2026-05-22 (Block `V134 134.99`)

- `V134` ist geschlossen: Plan Map exportiert fuer Intake-Drafts additive Lanes und Aktionen (`candidate`, `adopted-open`, `adopted-done`, `bot-training`, `meta`) plus `primaryBlockId`, `canonicalBlockId`, Ambiguitaetsmarker und User-Intake-Hinweis.
- Der Viewer zeigt `Ideen / Intake` als Lane-Ansicht mit Default `Ideen + Handoff`; Bot-Training und Meta bleiben aus der normalen Entscheidungssicht herausgefiltert, adoptierte Drafts verlinken zum kanonischen Masterblock, und Master-Details zeigen passende `Draft-Herkunft`.
- Dokumentation: `docs/plaene/neu/README.md` beschreibt empfohlene Frontmatter-Felder, `tools/plan-map/README.md` dokumentiert Lane-Modell, Summary-Split und die read-only Source-of-Truth-Grenze.
- Strukturentscheid: keine physische Ordnertrennung, keine Draft-Moves, keine Archivierungs- oder Schreibfunktion. Ein Ordnerumbau bleibt separater D3/D4-User-Gate-Scope mit Recovery-Pfad.
- Evidence: `node --test tests/plan-map-export.contract.test.mjs` -> PASS; `node --test tests/map-tools-android.contract.test.mjs tests/map-tools-electron.contract.test.mjs` -> PASS; `node --check tools/plan-map/viewer.js` -> PASS; `npm run plan:context:check` -> PASS; `npm run plan:check` -> PASS vor fremdem V135-Diff; `npm run docs:check` -> PASS vor fremdem V135-Diff; `npm run check:plan-evidence-claims` -> PASS mit bekannten Architektur-Acceptance-Warnungen fuer V96/V106/V113.
- Blocked: aktueller `npm run plan:check`/`npm run docs:check`/`npm run gates:pre-commit` stoppt an ungestagten, nicht-V134-bezogenen `docs/plaene/aktiv/V135.md`-Abschlussmarkierungen ohne Evidence-Format; siehe `docs/Fehlerberichte/2026-05-22_v134-gates-blocked-by-v135-plan-evidence.md`.
- Not-checked: lokaler Browser-Smoke, weil Browser Use `localhost`/`file://` fuer diesen Viewer in der Session blockiert hat; keine produktiven Spiel-/Runtime-Pfade, kein Plan-Index-Source-of-Truth-Umbau, keine Repo-Map-/Graph-RAG-Folgearbeit und keine physischen Moves in `docs/plaene/neu/`.

## Plan-Intake 2026-05-22 (Block `V134`)

- `V134` ist nach expliziter User-Anforderung als geplanter P2-Block im Master-Index aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V134.md`.
- Zweck: Die Plan Map soll echte neue Intake-Ideen, bereits von offenen Master-Bloecken adoptierte Drafts, erledigt adoptierte Archivkandidaten, Bot-Training-Sonderfaelle und Meta-Dateien sichtbar trennen.
- Der Draft `docs/plaene/neu/Feature_Plan_Map_Intake_Uebersicht_V134.md` bleibt vorerst als Source-History liegen; Draft-Move oder Archivierung ist bewusst kein Teil dieses D3-Intake-Slices.
- Nicht-Ziel: keine neue Plan-Source-of-Truth, keine Viewer-Schreibpfade, keine automatische Intake-Uebernahme und kein Wiederaufleben des zurueckgenommenen V133-Glossar-/Wiki-Scope.
- Evidence: `npm run plan:check`, `npm run plan:context:check`, `node --test tests/plan-map-export.contract.test.mjs`, `npm run docs:check`, `npm run check:plan-evidence-claims`, `npm run graph:check` und `npm run gates:pre-commit` fuer diesen Intake-Slice.

## Produkt-Notiz 2026-05-21 (Map Tools Android)

- Die Android-Map-Tools-Update-Aktion wurde als kleiner D2-Slice vom reinen Release-Link zum Release-APK-Download erweitert: Die Shell nutzt weiter GitHub Releases, bevorzugt aber ein `.apk`-Asset aus dem neuesten Release und faellt bei fehlendem Asset oder Offline-Fehlern auf die Release-Seite zurueck.
- Nicht-Ziel: kein nativer Silent-Installer und keine Android-Package-Installer-Permission; der ausgelieferte Map-Snapshot bleibt bis zur Installation einer neueren APK der Offline-Fallback.
- Evidence: `npm run app:maps:android:check` -> PASS, `npm run plan:check` -> PASS.

## Rollback-Notiz 2026-05-21 (Plan-Map-Glossar / V133)

- Ruecknahme auf User-Wunsch: `f902e7351581df4ee7c4f6e379c08b0445f0e73e` und `2590117c04a607aac6ddfe1bfe3bd5b1ffe0e451` wurden per Revert zurueckgenommen; die aus `bfa5df96e89ac0c853d8757eeac5084a7baacad4` stammenden V133-Master-/Graph-Anker wurden gezielt entfernt.
- Evidence: `rg "(?i)wikki|wiki|V133|Fachbegriffe" tools/plan-map docs/Umsetzungsplan.md docs/plaene/CHANGELOG.md docs/plaene/aktiv docs/plaene/neu docs/generated` -> keine Plan-Map-/V133-Treffer ausser dieser Rollback-Notiz, alter V90-Three.js-Wiki-Referenz und bestehender V132-Folgearbeitsnummer.

## Plan-Notiz 2026-05-21 (Master-Index / Plan-Map)

- `docs/Umsetzungsplan.md` fuehrt jetzt einen kompakten Arbeitsstrom-Index als Navigationshilfe fuer Hauptspiel, Map Content/Map Tools/Settings, Android/Mobile, Architektur/Runtime, Repo-Pflege/Governance und AI/Graph/Agenten-Werkzeuge.
- Die kanonische Master-Wahrheit bleibt unveraendert in den bestehenden Blocktabellen; Dependencies, Locks, Reihenfolge und Conflict-Log bleiben global.
- Die Plan-Map exportiert dieselben Arbeitsstroeme als `workstream`/`workstreamLabel`, zeigt sie im Blockdetail und bietet einen Filter, ohne daraus eine zweite Planquelle zu machen.
- Die Android-Map-Tools-Shell fuehrt denselben Arbeitsstrom-Filter ueber der eingebetteten Plan-Map; Android/Mobile bleibt sichtbar, auch solange noch kein aktiver Android-Masterblock existiert.
- Evidence: `node --test tests/plan-map-export.contract.test.mjs` -> PASS, `npm run app:maps:android:check` -> PASS, `npm run app:maps:android:build` -> PASS, Browser-Smoke auf `dist/map-tools-android` -> PASS, `npm run docs:check` -> PASS. `npm run gates:pre-commit` stoppt weiterhin bei `graph:check` wegen bestehendem Knowledge-Graph-Diff/Map-Tools-Domain-Drift.

## Produkt-Notiz 2026-05-20 (Mobile Classic Android)

- Mobile Classic Android wurde als scoped D2-Slice gehaertet: Touch-Controls werden im Match explizit sichtbar geschaltet, Tilt bietet jetzt Classic-Aktionen fuer Schuss, Item, naechstes Item und Boost, Gamepads gewinnen vor Touch-Fallbacks, und Touch-Erkennung akzeptiert auch `maxTouchPoints`/coarse pointer.
- Release-Pfad: Der Mobile-Classic-Build entfernt inaktive Developer-/Training-/Recorder-/Map-Preloads und Developer-DOM aus dem ausgelieferten HTML; Capacitor hat ein Asset-Freshness-Gate, und Android `versionCode`/`versionName` werden aus dem Root-`package.json` abgeleitet.
- Evidence: `npm run app:classic:android:check` -> PASS, `npm run plan:check` -> PASS, `npm run app:classic:android:build` -> PASS, `npm run app:classic:android:assets:check` -> PASS.
- Not-checked: kein Android-Studio-Gradle-Build; APK-Install auf dem angeschlossenen Motorola wurde nach dem Commit ueber `npm run app:classic:android:install` ausgefuehrt.

## Abschluss-Snapshot 2026-05-20 (Block `V112 112.99`)

- `V112` ist geschlossen: Sticky-Input, deterministischer Bounce, Arcade-Seed-/Sudden-Death-Lifecycle, Start-Setup-/Arcade-Overlay-Injection-Pfade, Desktop-CSP-/Font-Boot und produktnahe Helper-/Contract-Gates sind abgearbeitet.
- Abschluss-Evidence: `npm run test:contract` -> PASS, `npm run test:desktop:smoke` -> PASS, exakt `T20b:` -> PASS, `T20n:` -> SKIP mit Sunset-Kriterium; `npm run plan:check`, `npm run check:plan-evidence-claims`, `npm run docs:sync` und `npm run docs:check` -> PASS. `npm run gates:pre-commit` stoppte bei `graph:check` wegen bereits vorhandener nicht-V112-Map-Tools-/Plan-Map-Graph-Drift.
- Befund-Abgleich: `Open_Findings.md` und die Spielaudit-Dateien markieren B02-F01, B03-F04, B04-F1/F3, B05-F03 und P42 als V112-erledigt; B02-F02/F03, B03-F01/F02/F03, B04-F2/F4/F5/F6 und weitere Delta-Reste bleiben bewusst offen.
- Residual Risk: Der breite Playwright-Grep `-g "T20b"` traf auch `T20ba`; der dabei sichtbare Ghost-Replay-`entryCount`-Seitenfund ist dokumentiert, aber nicht Teil des V112-Scope.

## Bugfix-Notiz 2026-05-20 (Block `V112 112.99`)

- V112-Evidence-Reruns nutzen historische `-g`-Playwright-Beispiele; `scripts/playwright-run-profile.mjs` normalisiert `-g`/`-g=...` jetzt auf `--grep` und reicht Spec-Pfade mit `/` weiter, damit die dokumentierten Windows-Kommandos gegen die aktuelle Playwright-CLI wieder reproduzierbar sind.
- Der neue Runner-Contract-Test ist im V112-Scope verankert. Das Graph-Coverage-Gate ist nachgezogen: `android-classic/` bleibt `native-wrapper`, `src/mobile-classic/` ist als app-spezifischer `mobile-wrapper` ausserhalb des Desktop-Architektur-KPI klassifiziert.
- Evidence: `node --test tests/playwright-run-profile.contract.test.mjs` -> PASS, `node --test tests/mobile-classic-app.contract.test.mjs` -> PASS, `npm run plan:check` -> PASS, `npm run check:plan-evidence-claims` -> PASS, `npm run graph:check` -> PASS mit bekannten Domain-Drift-Warnungen, `node dev/scripts/verify-lock.mjs --playwright -- node scripts/run-playwright-targeted.mjs tests/core-targeted-runtime.spec.js -g T20al --timeout=180000` -> PASS.

## Abschluss-Snapshot 2026-05-20 (Block `V126 126.99`)

- `V126` ist geschlossen: lokale Dev-/Preview-APIs sind klassifiziert und gegated, Training-Spawn laeuft ohne Shell-Zwischenschicht, CLI-Argumente sind allowlisted, Trainingslogs nutzen einen Ringbuffer und die Training-Dashboard-API ist als erste fokussierte Vite-Plugin-Familie ausgelagert.
- Abschluss-Evidence: `node --test tests/training-dashboard-spawn.contract.test.mjs tests/vite-preview-local-api.contract.test.mjs tests/training-dashboard-log-buffer.contract.test.mjs` -> PASS, `npm --ignore-scripts run build` -> PASS, `npm run plan:check` -> PASS, `npm run check:plan-evidence-claims` -> PASS und `npm run gates:pre-commit` -> PASS; die gemeldeten `graph:check` Domain-Drift-Warnungen bleiben nicht-blockierend.
- Not-checked: keine Playwright-/Gameplay-Vollsuite, kein `npm run training:e2e`, kein Bot-Training-Langlauf, keine Dependency-/Electron-/Lockfile-Upgrades und keine CI-/Hook-Policy-Aenderungen; das ist bewusst, weil V126 keine Trainingsalgorithmen, Rewards, Produktions-Gameplay-Pfade, Dependency-Versionen oder globale Gates geaendert hat.
- Folgeblock-Handoff: `V127` fuer repo-weite Tooling-Gates/DX, `V128` fuer Release- und Asset-Compliance, `V129` fuer Generated-Content-Manifest-Migration.

## Plan-Notiz 2026-05-20 (Block `V121`)

- `V121` plant jetzt zusaetzlich ein `Ask Repo`-Chat-Panel als read-only Evidence-Oberflaeche ueber den V120-Graph-RAG-Contracts.
- Der Chat ist bewusst kein autonomer Repo-Agent: keine Schreibbuttons, keine Modellinstallation aus dem Viewer, keine persistente Prompt-/Antwort-History und keine Wahrheitsschicht neben Graph, Plaenen und Evidence-Paketen.
- Neu im Scope: `scripts/graph-rag-chat.mjs`, `graph-rag.chat-response.v1`, Chat-Fixture, Chat-Contract-Test, Fallback-Regeln ohne lokale LLM-Runtime und spaetere Links zu Repo Map/Plan Map.
- Nachschaerfung: Chat wird evidence-first geplant mit Antwortmodi, Replay-Befehl, `Explain this answer`-Trace, Prompt-Injection-Schutz, Evidence-only Cache-Policy und mindestens acht Referenzfragen.

## Plan-Notiz 2026-05-19 (Draft `V127`)

- `V127` wurde als gekoppelter Map-Navigationslayer geschaerft: Repo Map bleibt die Datei-/Tool-/Graph-Sicht, Plan Map bleibt die Block-/Phasen-/Dependency-Sicht.
- Neu im Draft: Datei-Steckbriefe, mehrstufige Datei-Fokuskarte, Plan-Map-Dependency-Fokus (`Upstream -> Fokusblock -> Downstream`), Edge-Inspector und read-only Crosslinks zwischen Datei- und Blocksicht.
- Governance-Grenze bleibt unveraendert: beide Viewer sind Navigation, nicht Wahrheitsschicht; Schreibpfade in Graph, Plaene, Locks, Contracts oder Source-Dateien bleiben Nicht-Ziel.

## Abschluss-Snapshot 2026-05-18 (Block `V90 90.99`)

- `V90` ist geschlossen: non-force Fixes (`fast-uri`, `ip-address`, lockfile-kompatibler `@tootallnate/once`-Pfad) sind erledigt, Major-Upgrades bleiben getrennte Folge-Slices statt stiller `--force`-Sprung.
- Verbleibende Security-Ausnahmen: Root hat 2 moderate `vite`/`esbuild`-Reste mit force-only `vite@8.0.13`; Electron hat 12 `electron`-/`electron-builder`-/`tar`-/`@tootallnate/once`-Reste mit force-only `electron@42.1.0` oder `electron-builder@26.8.1`; Server-Audit ist gruen.
- Wiedervorlage: 2026-06-17 oder frueher, wenn `npm audit` fuer Root oder Electron einen non-force Fix ohne Vite-/Electron-/Electron-Builder-Major-Sprung meldet.
- Abschluss-Evidence: `npm run architecture:guard`, `npm run build`, `npm run docs:check`, `npm run graph:build`, `npm run gates:pre-commit`, Root-/Electron-/Server-Audit-Snapshots, `npm ls`-Dependency-Sanity, `open-deps V90` und `scope-collisions`; V90/V120/V126-Overlaps bleiben bekannt und freigegeben.

## Stand-Snapshot 2026-05-18 (Subphase `V116 116.99`)

- `V116` ist geschlossen: Master-Index, aktive Detaildatei, Open Findings und Changelog zeigen `done`/`116.99`; `V122` sieht `V116.99` jetzt als erfuellt, bleibt aber weiter von `V119.1` abhaengig.
- Abschluss-Evidence: Cleanup blieb konservativ (`delete=203`, `archive=0`, `failed=0`), `videos/`, produktive Assets, getrackte Dateien, Bot-Training-Checkpoints und unklare Evidence-Pfade blieben geschuetzt.
- Abschluss-Gates waren gruen: `npm run plan:check`, `npm run check:gemini`, `npm run check:agent-context`, `npm run check:plan-evidence-claims`, `npm run plan:context:check`, `npm run graph:check` und `npm run gates:pre-commit`.
- Folgearbeit bleibt bewusst ausserhalb von V116: `V90` aktualisiert die Audit-Baseline, V118 bleibt User-Intake fuer den ersten `UIStartSyncController`-Entflechtungs-Slice, V119 klaert historische Abschluss-Evidence.

## Governance-Notiz 2026-05-18 (Workflows `analyse-planung` / `abschluss-analyse`)

- `analyse-planung` bindet den Wissensgraphen jetzt als Pflichtpruefung ein, sobald Testbefunde Scope-Dateien, `VXX`-Bloecke, Dependencies, Coverage oder Desktop-vs-Demo-Wirkung beruehren.
- Das Analyse-Reportformat klassifiziert Findings einheitlich nach `P0`-`P3`, `blocker`/`follow-up`/`doc-only`/`test-gap`, Graph-Status und Graph-Confidence.
- `abschluss-analyse` wurde spiegelnd geschaerft: Default bleibt Chat-Ausgabe oder optionaler `tmp/abschluss-analyse-VXX.md`-Report, Findings nutzen dieselben Kategorien wie die Testanalyse.
- Nachschaerfung: `AGENTS.md` nennt Testanalyse/Regressionsauswertung jetzt explizit als eigenen Workflow; beide Analyse-Workflows grenzen sich gegen Abschlussclaim-Analyse und Freshness-Checks ab.
- Nachschaerfung: `analyse-planung` enthaelt eine Graph-Query-Matrix fuer Testfail-Dateien, `VXX`-Bezug, Scope-Kollisionen, Coverage-, Runtime- und Event-Flow-Befunde.
- Nachschaerfung: Beide Analyse-Workflows beschreiben den Finding-Lifecycle fuer `blocker`, `follow-up`, `doc-only`, `test-gap` und `graph-low`; Reports muessen bewusst nicht gepruefte Pfade nennen.
- Qualitaetshebel: Findings muessen jetzt falsifizierbar sein (`Evidence`, `Produktpfad`, `Repro/Reasoning`, `Gegenbeweis`, `Confidence`, `Lifecycle`); `P0`/`P1` brauchen zwei unabhaengige Quellen oder bleiben `low confidence`.
- Qualitaetshebel: Abschlussanalysen nutzen Risk-first Sampling (`scope_files` -> Graph-Impact -> Tests/Contracts -> grosse Diffs) und Testanalysen muessen ihre `.agents/test_mapping.md`-Auswahl begruenden.
- Tiefenhebel: `P0`/`P1`-Findings muessen jetzt einen Trace ausweisen (`Signal -> Ursache -> Consumer -> Produktwirkung -> Gegenprobe`), damit harte Analysebefunde vom Symptom bis zur falsifizierbaren Produktwirkung reichen.

## Stand-Snapshot 2026-05-18 (Subphase `V116 116.6`)

- `116.6` ist als Gate-Matrix-Slice geschlossen: vorhandene Plan-, Graph-, Agenten-Kontext- und Architektur-Signale wurden inventarisiert, ohne `architecture:guard` oder Playwright-Vollruns als neuen Default einzufuehren.
- Gruene lokale Evidence: `npm run plan:check`, `npm run check:gemini`, `npm run check:agent-context`, `npm run graph:check`, `node scripts/check-plan-evidence-claims.mjs`, `npm run check:architecture:boundaries`, `npm run check:architecture:ratchet`, `npm run check:architecture:metrics` und `npm run typecheck:architecture`.
- Bekannte Restarbeit bleibt owning-block-scharf: P21/Dependency-Audit bleibt bei `V90`; produktnahe Gameplay-/UI-Hardening-Reste bleiben bei `V112`; der erste Runtime-/UI-Entflechtungs-Slice bleibt V118-Draft und wird erst nach V116.7/116.8 kandidatenscharf.

## Stand-Snapshot 2026-05-18 (Subphase `V116 116.7`)

- `116.7` inventarisiert die fuenf Refactor-Hotspots ohne Produktcode-Diff: `ArcadeRunRuntime`, `MediaRecorderSystem`, `UIStartSyncController`, `UIManager` und `ArcadeVehicleManager`.
- Graph-/Coverage-Signal: alle fuenf Dateien sind `covered=true` und `product-code`, haben aber keine direkten `surfaces` oder `criticalPaths`; die Graph-Risikowertung `low` wird deshalb fuer den ersten Code-Slice als Unsicherheit `medium` gelesen.
- V118-Handoff: empfohlen ist `src/ui/UIStartSyncController.js` mit einem reinen Start-Setup-Snapshot-/Viewmodel-Slice. `ArcadeRunRuntime` und `MediaRecorderSystem` bleiben wegen V112/V96- bzw. V105/P48-Hotpath-Risiko zurueckgestellt.

## Stand-Snapshot 2026-05-18 (Subphase `V116 116.8`)

- Der V118-Draft ist kandidatenscharf: `src/ui/UIStartSyncController.js` ist der empfohlene erste Entflechtungs-Slice, begrenzt auf Snapshot-/Viewmodel-Logik plus direkte Start-Setup-/Testnachbarn.
- Nicht in V118 Slice 1: `ArcadeRunRuntime`, `MediaRecorderSystem`, `ArcadeVehicleManager`, Recording, Gameplay-Parameter, Bot-/Headless-Training und Hangar-Legacy-Contract.
- V118 bleibt Draft mit `owner: user-intake` und wird durch V116 nicht in den Master aufgenommen; die naechste V116-Phase ist nur die Rebuild-/Reborn-Grenze.

## Stand-Snapshot 2026-05-18 (Subphase `V116 116.9`)

- `116.9` ist als Rebuild-/Reborn-Grenze geschlossen: kein Clean-Slate- oder Reborn-Pfad ist Default, und das Hauptrepo bleibt Source of Truth.
- Jeder Spike braucht einen eigenen User-Intake unter `docs/plaene/neu/` mit Zeitlimit, Nicht-Zielen, Paritaetsmatrix und Abbruchkriterien; automatisierte Skripte duerfen keinen `CurviosClash_Reborn`-Default erzeugen.
- V116 steht damit auf `116.99`; das Abschluss-Gate bleibt wegen `[USER-GATE]` explizit freigabepflichtig.

## Stand-Snapshot 2026-05-17 (Subphase `V116 116.4` Done-Intake-Archivierung)

- `plan-context-report` trennt uebernommene Intake-Drafts jetzt nach Master-Status: `adopted-by-done-master-block` fuer erledigte Zielbloecke und `adopted-by-open-master-block` fuer geplante, aktive oder blockierte Zielbloecke.
- Nach User-Gate `los` wurden 12 erledigt adoptierte Intake-Drafts nach `docs/plaene/alt/superseded-intakes-2026-05/` verschoben; der Archivindex nennt Klassifikation, V116-Report, kanonische `docs/plaene/aktiv/VXX.md`-Quelle und Read-Regel.
- Bewusst nicht verschoben: 10 offen adoptierte Drafts, darunter V112, V116, V120, V121, V122 und V124; sie bleiben in `docs/plaene/neu/`, bis ihr Zielblock geschlossen oder separat entschieden ist. Bot-Training-Drafts bleiben geschuetzt.
- `source_history` der erledigten aktiven Plaene verweist jetzt auf die Archivpfade. `V112` wurde statusseitig an den Master angeglichen (`planned`, Dependencies erfuellt), ohne eine V112-Umsetzungsphase als erledigt zu markieren.

## CI-Fix 2026-05-17 (Workflow `bugfix`)

- Ursache fuer das rote GitHub-X auf `origin/main`: `tests/training-gate.test.mjs` legte den Lock `tmp/test-latest-index.lock` direkt an, waehrend der frische GitHub-Actions-Checkout den Parent-Ordner `tmp/` nicht mitbrachte.
- Fixpfad: Der Test-Helfer erstellt `tmp/` vor dem exklusiven Lock-Mkdir rekursiv und behaelt den Lock selbst als kollisionsfaehigen Ordner bei. Zweck: `Run Node Contract Tests` soll in CI wieder reproduzierbar starten, ohne produktive Training-Logik zu veraendern.

## Governance-Notiz 2026-05-17 (Workflow `abschluss-analyse`)

- Neuer Workflow `.agents/workflows/abschluss-analyse.md` definiert einen read-only-first Analysepfad, um den zuletzt abgeschlossenen Plan gruendlich gegen Master, Blockfile, Changelog, Git-Historie, Scope-Dateien, DoD, `*.99`-Gate und Evidence-Qualitaet zu pruefen.
- Zweck: Abschlussdrift und Claim-only-Evidence sichtbar machen, ohne historische Planstatus automatisch zu korrigieren; konkrete Verbesserungen werden nach Risiko, Evidence-Pfad, Decision-Klasse und kleinstem Gate vorgeschlagen.
- Nachschaerfung: Die Abschlussanalyse enthaelt jetzt eine Pflicht-Codepruefung fuer planrelevante Runtime-, Test-, Script-, Electron-, Editor-, Daten- und Contract-Aenderungen inklusive Diff-Review, Legacy-/Fallback-Risiken, Testabgleich und Code-Findings.
- Nachschaerfung: Der Wissensgraph ist jetzt Pflicht-Evidence fuer Abschlussanalysen; `graph:check`, Open-Dependencies, Scope-Kollisionen, Coverage, Impact-Queries und runtime-nahe Critical-/Event-Flow-Abfragen werden gegen Plan, Git und Code gespiegelt.

## Stand-Snapshot 2026-05-16 (Intake `V123 123.1`)

- Neuer geplanter P1-Block `V123` ist nach User-Freigabe im Master-Index aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V123.md`.
- Zweck: Den Umsetzungsplan fuer AI-Agents ueber einen strukturierten `docs/plan-index.yaml`-Pilot robuster lesbar machen, ohne `docs/Umsetzungsplan.md` sofort als Master-Wahrheit abzuloesen.
- Leitentscheidung: Zuerst entsteht ein nicht-kanonischer Spiegel mit Drift-Validator; erst nach stabilen Checks wird entschieden, ob YAML/JSON zur Source of Truth wird und Markdown/HTML nur generierte Menschenansichten sind.
- Abgrenzung: `V121` bleibt als vorhandener Graph-RAG-Viewer-Draft reserviert; V123 betrifft Plan-Index, Leseweg, Validatoren und Source-of-Truth-Migration.

## Stand-Snapshot 2026-05-16 (Subphase `V116 116.4`)

- `116.4` ist report-only fortgesetzt: `npm run plan:context:check` klassifiziert aktive Plaene und Intake-Drafts graph-gestuetzt gegen Master, Open Findings und `docs/generated/knowledge-graph.json`; `npm run plan:check` und `npm run graph:check` sind gruen.
- Report-Ergebnis: 26 master-referenzierte aktive Plaene, 12 dependency-geschuetzte aktive Plaene, 5 aktive Archivkandidaten (`V75`, `V81`, `V85`, `V86`, `V89`), 41 Bot-Training-Sonderfaelle, 19 superseded Intake-Drafts und 4 Intake-Review-Faelle. Report: `tmp/plan-context-report.json`.
- Keine Planverschiebung, kein Archivordner und keine Auto-Move-Logik wurden ausgefuehrt; Archivkandidaten bleiben bis zu einem separaten User-Gate nur proposed-move Evidence.

## Stand-Snapshot 2026-05-15 (Intake `V120 120.1`)

- Neuer geplanter P1-Block `V120` ist nach User-Freigabe im Master-Index aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V120.md`; der Intake-Draft `docs/plaene/neu/Feature_Graph_RAG_Lokaler_Context_Adapter.md` bleibt als `source_history` referenziert.
- Zweck: Den bestehenden deterministischen Wissensgraphen um eine lokale Graph-RAG-Schicht erweitern, die relevante Textstellen, source-backed Evidence-Pakete und Kontextbudget-Signale liefert, ohne lokale AI zur Wahrheitsschicht oder zum Code-Agenten zu machen.
- Einordnung: `V120` startet nach `V116.3/116.4` und mindestens `V119.1`, damit Quellenautoritaet, Archivhygiene und historische Evidence-Baseline vor Chunk-Index und RAG-Rollout geklaert oder als Restrisiko dokumentiert sind.
- Lokale Modelle: Ollama ist der bevorzugte MVP-Adapter, llama.cpp/HTTP-/CLI-Adapter bleiben optional; regelbasierter Fallback, Healthcheck, Timeouts und Secret-/PII-Excludes sind verpflichtender Planbestandteil.
- Abgrenzung: Der vorhandene V121-Viewer-Draft bleibt Folgeblock und Consumer stabiler V120-Outputs, nicht Teil des Graph-RAG-Kernblocks.

## Stand-Snapshot 2026-05-15 (Intake `V119 119.1`)

- Neuer geplanter P1-Block `V119` ist nach User-Freigabe im Master-Index aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V119.md`.
- Zweck: erledigte oder done-ish Plaene gegen Git-Historie, Top-Level-DoDs, `*.99`-Gates und Evidence-Qualitaet abgleichen, ohne alte Haken pauschal nachzutragen.
- Ausgangsbefund: P1-Abschlusswidersprueche betreffen `V41`, `V48`, `V74`, `V75`, `V76`, `V81`, `V83`, `V84`, `V94`, `V102`, `V105`; P2-Evidence-Schaerfung betrifft `V52/V56`, `V54`, `V93`, `V102`, `V105`, `V114`.
- Leitregel: Kein nachtraeglicher Abschlussclaim ohne konkrete Evidence aus Commit, Command, Testreport, Plan-/Changelog-Beleg oder explizitem User-Override; historische Restwidersprueche werden dokumentiert statt still geglaettet.

## Stand-Snapshot 2026-05-14 (Intake `V116 116.1`)

- Neuer geplanter P1-Block `V116` ist nach User-Freigabe im Master-Index aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V116.md`; der fruehere Intake-Draft `docs/plaene/neu/Feature_Repo_Context_Cleanup.md` ist damit abgeloest.
- Nachschaerfung: V116 startet nach `V115.99` und `V117.99`, fuehrt `check:agent-context` erst als kleines eigenstaendiges Gate ein, laesst `plan-context-report` vorerst report-only und schliesst Auto-Move/Archivverschiebungen ohne User-Gate aus.
- Zweck: Agenten-Leseweg, Planhygiene, Archivklassifikation und Workspace-Cleanup werden als D3/D4-nahe Sanierung gefuehrt, ohne produktive Spiel-, Physik-, Recording-, Bot-Training- oder UI-Logik im Cleanup-Scope zu veraendern.

## V117 Review-Follow-up 2026-05-14

- Review-Follow-up umgesetzt: `check:ai-decision-policy --all` bewertet nun Markdown-Abschnitte statt nur ein enges Zeilenfenster, ignoriert Frontmatter-/Scope-Dateilisten und nutzt engere Muster fuer Source-of-truth- und neue-Ablage-Hinweise. Zweck: Baseline-Review bleibt report-only, aber deutlich rauschaermer (`63/48` -> `14/3` Warn-/Info-Signal im lokalen Vergleich); `.agents/workflows/cleanup.md` ist bewusst als D3/D4-nahe Pruefflaeche dokumentiert.
- Review-Fund nachgezogen: `check:ai-decision-policy` scannt im Standardmodus nur hinzugefuegte/geaenderte Diff-Zeilen in Markdown-/Governance-Dateien seit `HEAD`; der breite Baseline-Scan bleibt optional ueber `--all`. Zweck: Report-only bleibt als Review-Signal nutzbar und erzeugt weniger Alarmrauschen.
- Evidence-Text in `V117` ist korrigiert: Der Check behauptet keine Archivordner-, `canonical_source`-, Diff- oder Skriptstrukturpruefung mehr, sondern beschreibt die tatsaechlichen Markdown-Muster. Der Intake-Reststatus ist auf `done` geglaettet.

## Stand-Snapshot 2026-05-14 (Subphase `V117 117.99`)

- `V117` ist abgeschlossen: D0-D4, Zweckklassen, Stop-Loss, D3/D4-User-Gates, Subagent-Regeln und der nicht blockierende Decision-Policy-Report sind repo-weit verankert.
- Abschluss-Evidence: D0 bleibt `plan:check`/Graph/Dry-Run, D1 bleibt lokaler Report unter `tmp/`, D2 bleibt scoped Aenderung mit Evidence/Confidence/Gate, D3 braucht User-Gate fuer Governance-/Plan-/Workflow-Aenderungen, D4 braucht User-Gate plus Recovery-/Rollback-Pfad fuer Delete/Move/Rebuild/grosse Refactors.
- V116 verweist auf `V117.99` und behaelt seine lokale AI-Ausfuehrungsmatrix; kein neuer Schattenprozess oder paralleler Statusspeicher wurde eingefuehrt. Subagents wurden in V117 nicht genutzt.

## Stand-Snapshot 2026-05-14 (Subphase `V117 117.3`)

- `117.3` ist geschlossen: `scripts/check-ai-decision-policy.mjs` und `npm run check:ai-decision-policy` liefern einen eigenstaendigen Report-only-Check fuer D4-nahe Begriffe, Source-of-truth-Flaechen und neue dauerhafte Ablagen ohne den Pre-Commit-Pfad zu blockieren.
- Decision: Check bleibt bewusst ausserhalb `docs:check` und `gates:pre-commit`; Chosen: niedrigschwelliger Review-Hinweis statt harter Policy-Blocker; Risk: Muster koennen rauschen, deshalb Exit 0 und spaetere Gate-Integration nur nach Stabilisierung.

## Stand-Snapshot 2026-05-14 (Subphase `V117 117.2`)

- `117.2` ist geschlossen: Das Decision Framework, Repo-Organisationsregeln und Subagent-/Parallel-Agent-Regeln sind operativ in `planning_and_governance.md` verankert; `plan.md`, `code.md`, `quick.md` und `bugfix.md` enthalten nur knappe Verweise statt duplizierter Formularlogik.
- Decision: `V117 117.2` bleibt D3-Governance-Scope; Chosen: zentrale Rule als Wahrheit plus minimale Workflow-Anker; Alternatives: breite Workflow-Duplikation oder neuer Parallelprozess wurden verworfen; Risk: Governance-Diff, reversibel per scoped Commit; Gate: `npm run gates:pre-commit`.

## Stand-Snapshot 2026-05-14 (Intake `V117 117.1`)

- Neuer geplanter Governance-Block `V117` ist nach User-Freigabe im Master-Index aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V117.md`.
- Der Block macht das vorhandene Draft-Ziel zum aktiven P1-Startpfad: D0-D4-Entscheidungsklassen, Evidence-/Confidence-Regeln, Blast-Radius, Stop-Loss und User-Gates werden vor V116 zentralisiert. Zweck: Cleanup-, Archivierungs-, Governance- und Refactor-Arbeit nicht als automatische Routinearbeit fehlzuklassifizieren.
- Plan-Schaerfung 2026-05-14: V117 fuehrt Repo-Organisationsregeln mit Zweckklassen fuer neue Ablagen ein; V116 verankert darauf aufbauend Archivordner mit README/Index, Knowledge-Graph-/Report-Verknuepfung und kompakter Changelog-Pflicht. Zweck: Archiv bleibt nachvollziehbare Historie, verliert aber aktive Plan-Autoritaet und wird fuer Agenten nicht mit aktuellen Plaenen verwechselt.
- Governance-Schaerfung 2026-05-14: V117s gewaehlter Umsetzungspfad ist zentral in `planning_and_governance.md` verankert; die Workflows verweisen nur knapp auf Decision-Klassen und Zweckklassen. Zweck: D3/D4-User-Gates und Ablage-Disziplin werden operativ sichtbar, ohne kleine D2-Arbeit mit Formularpflicht zu ueberladen.
- Plan-Erweiterung 2026-05-14: V117 nimmt Subagent-/Parallel-Agent-Nutzung als optionales Ausfuehrungsmuster auf. Zweck: parallele Recherche, Review, Verifikation oder disjunkte Umsetzung ermoeglichen, aber nur mit expliziter User-Erlaubnis, klarer Ownership und ohne Umgehung von D3/D4-Gates oder Abschluss-Evidence.

## V105 Follow-up 2026-05-13

- Abschlussabgleich nach Review nachgezogen: Master-Index und Blockfrontmatter stehen wieder auf `done/105.99`, V112 ist durch die erfuellten V102/V105-Abhaengigkeiten entblockt, und der WebCodecs-Muxer-Buffer-Fallback ist mit `T20aj5b` gegen Targets abgesichert, die nur `getBuffer()` anbieten. Zweck: V105 nicht nur gate-gruen, sondern governance-konsistent und regressionsfester abschliessen.

## Stand-Snapshot 2026-05-10 (Subphase `V111 111.4.2`)

- `111.4.2` ist abgeschlossen: `test-prioritization`, `policy-evaluate` und `feedback-loop` erweitern den Wissensgraphen um graphgestuetzte Testauswahl, Policy-as-Data und auditierbares Human-Feedback. Referenzfall Settings priorisiert `tests/runtime-settings-live-apply.contract.test.mjs` und `tests/settings-manager.contract.test.mjs`, Policy-Evaluation meldet `pass`, und Feedback bleibt bewusst `watch` mit Guardrails statt automatischer Preset-Mutation.
- Operative Verankerung: `query-ops.v1.json#playbook:adaptive-quality-control` fuehrt SLOs, Policies und Feedback-Regeln; `docs/referenz/ai_architecture_context.md` nennt die neuen Standardqueries. Gruen: fokussierter Contract-Run fuer `adaptive quality control|adaptive diagnostics|query ops contract`; `npm run graph:build` mit Scorecard `94.8/pass`.

## Stand-Snapshot 2026-05-09 (Subphase `V111 111.3.2`)

- `111.3.2` ist abgeschlossen: `npm run graph:build` erzeugt jetzt neben Graph und Coverage eine deterministische `docs/generated/knowledge-graph.scorecard.json`, gespeist aus Build-Metriken plus `data/contracts/knowledge-graph/quality-scorecard-history.v1.json`. `graph:check` prueft die Scorecard bytegleich gegen den Build-Output.
- Neue Entscheidungsqueries: `quality-scorecard`, `what-if-remove` und `what-if-replace` liefern Score/Trend, Blast-Radius, empfohlene Checks und ein explizites `uncertaintyBudget`. Referenzfall Settings: Scorecard `94.8/pass`, `what-if-remove src/core/SettingsManager.js` meldet `settings`, `blockerEdgeCount=1`, `uncertainty=low`; `what-if-replace src/core/SettingsManager.js tests/runtime-settings-live-apply.contract.test.mjs` meldet `validationEdgeDelta=-1` und `maxCausalScoreDelta=-3.46`.

## Stand-Snapshot 2026-05-09 (Subphase `V111 111.1.2`)

- `111.1.2` ist abgeschlossen: zentrale Settings- und Round-End-Kanten im Desktop-Critical-Path-Contract tragen `strength` und `directness`; `impact-for-file` und `impact-diff` berechnen daraus `causalScore` und sortieren Impact-Kanten reproduzierbar nach Entscheidungsrelevanz.
- Referenzsignal: `impact-for-file src/core/SettingsManager.js --json` priorisiert `forbidden_by runtime:settings-manager -> config:settings-runtime-limits` mit Score 3.96 vor den direkten State-Writes 2.82/2.70; `impact-diff` gibt dieselben Top-Kanten als `primaryImpactEdges` plus `maxCausalScore` aus. V111 wechselt damit auf `111.2` fuer Ownership, Presets und Explainability.

## Stand-Snapshot 2026-05-09 (Subphase `V111 111.1.1`)

- `111.1.1` ist abgeschlossen: `cannot`, `forbidden_by` und `blocked_by` sind als produktive Mapping-Kanten in Schema, Builder und Predicate-Constraints verankert. `why-not` priorisiert explizite Blocker nach Relationstyp und Severity und gibt Reason-/Provenance-Kontext fuer Incident- und Review-Fragen aus.
- Referenzsignale: `settings` meldet `forbidden_by runtime:settings-manager -> config:settings-runtime-limits`, `round-end` meldet `blocked_by runtime:round-end-coordinator -> state:round-outcome`. Der Slice schafft die Blocker-Basis fuer die folgende Causal-Weighting-Subphase, ohne die bestehenden Integritaets- und Runtime-Health-Queries zu ersetzen.

## Stand-Snapshot 2026-05-09 (Subphase `V110 110.4`)

- `110.4.1` ist abgeschlossen: `data/contracts/knowledge-graph/query-ops.v1.json` versioniert Query-SLO-Profile fuer `desktop-local` und `ci-linux`, `scripts/check-knowledge-graph-slos.mjs` misst Kernqueries mit Warm-up plus 7 Samples, und `npm run graph:slo` ist als Regression-Gate verankert.
- `110.4.2` ist abgeschlossen: `critical-path-health` und `change-risk` besitzen verlinkbare Failure-Playbooks mit Triggern, Triage-Queries, Recovery-Schritten und Exit-Kriterien. `change-risk` ist als Operator-Alias fuer den bestehenden Delta-Risikopfad in `scripts/query-knowledge-graph.mjs` verfuegbar.
- Lokales Evidence-Signal: `node --test tests/knowledge-graph-build.contract.test.mjs` PASS; `npm run graph:slo` PASS mit `desktop-local` p95-Samples fuer Health, Change-Risk, Event-Flows und Settings-Impact. Der Block wechselt damit auf `110.99`.

## Stand-Snapshot 2026-05-09 (Subphase `V110 110.99`)

- `V110` ist abgeschlossen: Wissensgraph-Constraints, Provenance, Widerspruchserkennung, Telemetrie-Replay, Delta-Gates, Migrationspfad, Query-SLOs und Operator-Playbooks sind versioniert und gate-wirksam.
- Abschluss-Gates gruen: `npm run graph:build`, `npm run graph:check`, `npm run graph:slo`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`. `V111` ist damit durch `V110.99` entsperrt.

## Stand-Snapshot 2026-05-08 (Subphase `V110 110.3`)

- `110.3.1` ist abgeschlossen: `impact-diff` ist als Delta-Query fuer PR-/Commit-Sicht verfuegbar und reportet geaenderte Dateien, kritische Pfade, Runtime-Subgraph, Risikodateien und empfohlene Graph-Checks. Referenzdiffs sind reproduzierbar ueber explizite Dateiliste oder `--base <REF>`.
- `110.3.2` ist abgeschlossen: Der Ontology-Migrationspfad ist mit `data/contracts/knowledge-graph/schema-migrations.v1.json` versioniert, `npm run graph:migrate` prueft den aktuellen v1-Pfad und `graph:check` validiert den Migrationsvertrag. Der Block wechselt damit auf `110.4`.

## Stand-Snapshot 2026-05-08 (Subphase `V110 110.1.1`)

- Planlogik-Fix 2026-05-08: Master-Kopf und empfohlene Reihenfolge trennen jetzt aktiven Lock `V110 110.2` vom naechsten freien P1-Startpfad `V102 102.1`; `Open_Findings` spiegelt den aktuellen V90-Audit-Rest als 2 moderate Root-Befunde. `V105`/`V113` dokumentieren die breiten Scope-Overlaps enger, der aktive Planordner ist als aktive plus referenzierte Detailablage beschrieben, und der Bot-Trainingsplan markiert `BT93M` als operative PPO-Claim-Quelle statt alter Legacy-active-Zeilen.
- V107 ist fachlich geschlossen; die Fortsetzung laeuft im entsperrten Folgeblock `V110`.
- `110.1.1` ist abgeschlossen: `data/contracts/knowledge-graph/predicate-constraints.v1.json` versioniert Domain-/Range-/Layer-Constraints fuer produktive Mapping-Relationen, und `graph:check` validiert diese Constraints fail-fast gegen Mapping-Kanten.
- `110.1.2` ist abgeschlossen: Mapping-Knoten und -Kanten tragen jetzt `file`/`line`/`commit`-Provenance aus den Contract-Dateien; `graph:check` stoppt fehlende Provenance, und die Kernqueries geben die Evidence fuer Incident- und Review-Pfade direkt aus. Der Block steht damit bei `110.2`.
- Der frisch promovierte Folgeblock `V114` ist in den beidseitigen Scope-Overlap-Freigaben der betroffenen aktiven Bloecke nachgetragen, damit der Graph-Guard wieder zwischen erlaubter Planueberlappung und echter Kollision unterscheiden kann.
- Der Slice schuetzt die V107-Graphbasis gegen semantisch falsche Kanten, ohne den Builder auf eine neue Graph-Datenbank oder breite Runtime-Aenderungen umzubauen.
- V107-Nachzug: `round-end` liest jetzt explizit `config:gameplay-config-contract`, und `critical-path-health` prueft je Kernpfad die erwarteten Layer statt nur Runtime/Test. Damit ist der Abschluss-Claim Runtime/State/Config/Test auch fuer Round-End maschinell sichtbar.

## Stand-Snapshot 2026-05-08

- Splitscreen-Bugfix ausserhalb eines aktiven Blocks: `MenuRuntimeSessionService` prueft Session-Wechsel jetzt gegen die tatsaechliche Runtime-Surface der Desktop-App statt gegen den Browser-Demo-Default. Dadurch wird `splitscreen` im Desktop nicht mehr vor dem Matchstart auf `single` zurueckgebogen; der lokale 2P-Pfad kann wieder `mode=2p`, zwei lokale Spieler und zwei Kameras erzeugen. Gruen: `node --test tests/menu-runtime-session-service.contract.test.mjs`; `node --test tests/offline-session-compatibility.contract.test.mjs`.
- Surface-Gate-Follow-up ausserhalb eines aktiven Blocks: Weitere Runtime-Actions im gleichen Muster wurden auf expliziten `productSurfaceId` umgestellt: Mode-/Map-Fallbacks, Quickstart-Aktionen und Preset-Apply. Damit behandeln Desktop-Default-Full-Pfade freie Quickstarts, nicht kuratierte Vollversions-Maps und eigene Presets nicht mehr versehentlich wie Browser-Demo-Restriktionen. Gruen: `node --test tests/menu-runtime-session-service.contract.test.mjs tests/menu-runtime-preset-config-service.contract.test.mjs`; `npm run plan:check`.

## Stand-Snapshot 2026-05-07

- Build-/Desktop-Bugfix ausserhalb eines aktiven Blocks: `ParcoursProgressSystem` unterschreitet den Architektur-`max-lines`-Guard durch Auslagerung der Progress-Snapshot-/HUD-DTO-Erzeugung; die Desktop-CSP bleibt self-contained, weil der Google-Fonts-Import entfernt wurde und Vite-`data:`-Buildartefakte fuer `browser-demo-surface-policy.export.v1.json` ohne XHR gelesen werden. `tmp/` ist aus dem Git-Index entfernt, lokale transiente Artefakte bleiben durch `.gitignore` unversioniert.
- Ghost-Bugfix ausserhalb eines aktiven Blocks: `ArcadeGhostLibrary` liest bei `schemaVersion=arcade-ghost-library.v2` jetzt auch gemischte Legacy-Top-Level-Routeneintraege mit ein und schreibt sie anschliessend kanonisch zurueck; damit bleibt das Selbstduell-/Ghost-Rendering in Desktop/Electron auf Maps mit `routeId`-Aliasen auch dann stabil, wenn bestehende lokale Storage-Daten noch vor der vollstaendigen v2-Migration entstanden sind.
- Settings-Follow-up ausserhalb eines aktiven Blocks: SettingsManager kapselt Menu-Text-Overrides jetzt ueber einen schmalen Read-Port, produktive Arcade-/UI-Consumer nutzen keine direkten settingsManager.store-Fallbacks mehr, und die Settings-Mutationsfacades teilen sich einen kleinen Result-Helper fuer konsistente changedKeys-/metadata-Formen.
- Settings-Diagnose-Follow-up ausserhalb eines aktiven Blocks: `diffSettings`, `previewMenuConfigImport` und `getSettingsHealthSnapshot` machen Settings-Aenderungen, Import-Auswirkungen und Port-Verfuegbarkeit sichtbar, ohne interne Stores oder komplette Settings-Dumps an Runtime-/UI-Consumer zu leaken; der Import-Preview-Pfad mutiert nur einen geklonten und sanitizten Snapshot. Gruen: `node --test tests/settings-manager.contract.test.mjs`.
- Settings-Refactor-Follow-up ausserhalb eines aktiven Blocks: Menu-Config-Import trennt reine Parse-/Normalize-Diagnostik von Apply-Mutation, `diffSettings` nutzt einen zentralen ChangeKey-Pfadvertrag, und der Health-Snapshot zeigt nur schmale Persistenzsignale ohne Settings-Dumps oder Store-Leaks.
- V107 107.3.2 abgeschlossen: `knowledge-graph.coverage.json` enthaelt jetzt ein HEAD-basierendes Coverage-Gate gegen neu oder regressiv uncovered aktive Dateien; `graph:check` validiert den Gate-Status und der Query-Report zeigt `gate: pass (new uncovered active: 0)`. Zweck des Slices ist ein fruehes Stoppsignal fuer neue Graph-Luecken, ohne die historisch bekannten Coverage-Luecken sofort zum Blocker zu machen.

## Stand-Snapshot 2026-04-28

- Neuer geplanter Architekturblock `V104` ist im Master-Index aufgenommen und verweist kanonisch auf `docs/plaene/aktiv/V104.md`.
- `V104` trennt den nachhaltigen God-Object-Sunset bewusst von `V100`: Remount-/Rebuild-/StartSync-Stabilisierung bleibt dort, waehrend `V104` den Ownership-, Port- und Alias-Zuschnitt fuer `UIManager`, `UIStartSyncController`, `UINavigationLifecycleController`, `GameRuntimeBundle`, `GameRuntimePorts`, `ArcadeVehicleManager`, `MatchFlowUiController` und `PlatformCapabilityRegistry` plant.
- Die empfohlene Intake-Reihenfolge lautet damit `V99 -> V100 -> V104 -> V102`.


## Stand-Snapshot 2026-04-17

- Nachpflege zum V92-Architekturscope: `src/ui/MatchFlowTransitionHotspots.js` nutzt fuer Arcade-/Recording-/Session-Transitions nur noch Runtime-Port-Fallbacks und keinen direkten `game.runtimeFacade`-Reach-through mehr.
- Guard-/Ratchet-Baseline ist entsprechend nachgeschaerft: `scripts/architecture/legacy-surface-guard-matrix.json` erkennt `game?.runtimeFacade` explizit, `GameRuntimePorts-fallbacks` sind nur noch in `src/shared/runtime/GameRuntimePorts.js` erlaubt, und `scripts/architecture/architecture-budget-ratchet.json` fuehrt dafuer jetzt ein 1-Datei-Budget.
- Referenz- und Folgeblock-Leitplanken (`docs/referenz/ai_architecture_context.md`, `.agents/test_mapping.md`, `docs/plaene/aktiv/V64.md`, `V81.md`, `V82.md`, `V86.md`) spiegeln denselben Ownership-Stand.

## Stand-Snapshot 2026-04-15

- Abgeschlossen: V71, V72, V74, V77, V83, V84, V85, V87, V88, V89, V91, V92. V89 spiegelt Browser-, Desktop- und Contract-Layer widerspruchsfrei; `desktop-smoke` bleibt primaeres Desktop-Hauptsignal, `browser-compat` der Web-/Demo-Layer, `node-contract` traegt weiterhin den Restfehler `T97`.
- V92 ist vollstaendig abgeschlossen (2026-04-15): Hotspot-Inventar und Zielpfad-Matrix fixiert, Runtime-Commands auf kleine Application-Use-Cases gehoben, produktive Legacy-Globals im migrierten Scope entfernt, `MatchFlowUiController` und `GameRuntimeFacade` entlang echter Verantwortung geschnitten, Guard-/Ratchet-/Folgeblock-Leitplanken verankert, `92.99` mit gruensicheren Architektur-/Plan-/Doku-Gates geschlossen. Restadapter klar markiert (`GameRuntimePorts`-Transition-Helfer, `MatchFlowTransitionHotspots`, Publish-/Cleanup-Diagnostics fuer `window.GAME_INSTANCE`/`window.GAME_RUNTIME`).
- Offene Risiken im Master: V71 fuehrt getrackte Ignore-Artefakte als Restgate-Risiko, V81 fuehrt den Expertenlogin als Dev-only-/Surface-Risiko (per V77 77.6.5 als lokaler Dev-only-Schalter entschieden). Aktueller Intake-Draft aus dem Audit 2026-04-10: `docs/plaene/neu/Feature_Toolchain_Security_Dependency_Upgrade_2026-04-10.md` (Vorschlag V90, noch nicht aktiv).
- Naechste offene Subphase im aktiven Master: `64.1.1`.

## Stand-Snapshot 2026-04-14 (V93 Abschluss)

- V93 vollstaendig abgeschlossen (2026-04-14): Governance-Refactor fuer Agents-Einstieg. Master-Index-Einstieg (Top-60-Bytes) von 7011 auf 4472 Bytes reduziert (-36%), Gesamtdatei 294 -> 155 Zeilen. Status-Fliesstext und Abgleich-Historie in dieses Changelog ausgelagert; abgeschlossene Bloecke in `docs/plaene/archiv/abgeschlossene-bloecke.md`. AGENTS.md entpoliciert, `.agents/rules/*` und `.agents/workflows/*` entdoppelt, Rule-Trigger entfallen (V93 93.3.3). Neues Meta-Gate `npm run gates:pre-commit` (`scripts/gates-pre-commit.mjs`) fuehrt plan:check -> docs:sync -> docs:check in fester Reihenfolge mit per-Step-Exit. `.agents/rules/git_and_commits.md` verankert "ein Commit pro Subphase" zusaetzlich zur bereits vorhandenen "Umsetzungsplan-Aenderungen separater Commit"-Regel. Policy-Duplikat-Grep (`Niemals git stash`) trifft nur noch `git_and_commits.md`.
- V94 (Wissensgraph) ist damit entsperrt.

## Abgleich-Historie (uebernommen aus `## Aufgeschobene Fixes`)

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
Abgleich 2026-04-10 (Subphase `V88 88.4.1`): Zwei neue Node-Contract-Tests (`tests/menu-multiplayer-bridge.contract.test.mjs`, `tests/platform-capabilities.contract.test.mjs`) uebernehmen Runtime-nahe Capability-, Storage- und Menu-Multiplayer-Vertraege aus der Browser-Layer-Naehe. `package.json` erweitert `test:contract` entsprechend; offene Restarbeit in V88 wechselt auf `88.4.2` fuer Mapping-/Doku-Abgleich.
Abgleich 2026-04-10 (Subphase `V88 88.4.2`): `.agents/test_mapping.md` mappt die neuen Menu-Multiplayer-, Plattform-Capability- und Storage-Vertraege jetzt explizit auf den `node-contract`-Layer. Der Doku-/Mapping-Abgleich ist abgeschlossen, naechste offene V88-Subphase ist `88.5.1` (Failure-Taxonomie).
Abgleich 2026-04-10 (Subphase `V88 88.5.1`): `tests/playwright-readiness.js` fuehrt mit `resolvePlaywrightFailureTaxonomy()` einen gemeinsamen Klassifikationsvertrag fuer `startup`, `readiness`, `contract`, `runtime-regression` und `flake` ein und nutzt ihn direkt in `createPlaywrightReadinessContract()`. `scripts/run-playwright-targeted-clusters.mjs` klassifiziert fehlgeschlagene Cluster jetzt gegen denselben Vertrag (inkl. Diagnostics-Lookup + `runtime-regression`-Fallback). Naechste offene V88-Subphase ist `88.5.2` (Blockerberichte/Test-Ausgaben auf aktuelle Artefaktpfade und Cluster syncen).
Abgleich 2026-04-10 (Subphase `V88 88.5.2`): `scripts/run-playwright-targeted-clusters.mjs` emittiert bei roten Clustern jetzt den konsistenten Artefaktvertrag (`mode`, `runTag`, `output`, `diagnostics`, `server-log`) und fasst Failure-Klassen weiterhin ueber dieselbe Taxonomie zusammen. `docs/Fehlerberichte/2026-04-07_v87-runtime-hardening-87.99-playwright-blockers.md` sowie `docs/referenz/ai_architecture_context.md` referenzieren denselben Cluster-/Artefaktpfad-Vertrag statt historischer Nebenpfade. Naechste offene V88-Subphase ist `88.99.1` (Abschluss-Gate).
Abgleich 2026-04-10 (Subphase `V88 88.99.1`): `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run typecheck:architecture`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen. `npm run test:contract`, `npm run test:smoke` und `npm run test:targeted` brechen in dieser Automation-Umgebung konsistent mit `spawn EPERM` ab; der Gate-Blocker ist in `docs/Fehlerberichte/2026-04-10_v88-88.99.1-spawn-eperm-gate-blocker.md` blockerfest dokumentiert. Naechste offene V88-Subphase ist `88.99.2` (Mapping-/Doku-Abschluss).
Abgleich 2026-04-10 (Subphase `V88 88.99.2`): `.agents/test_mapping.md` bleibt als kanonischer Layer-/Runner-Einstieg mit den V88-Run-Profilen (`preview-smoke`, `dev-runtime`, `browser-contract`) synchron; `docs/referenz/ai_architecture_context.md` und `docs/plaene/aktiv/V88.md` spiegeln denselben Failure-Klassifikationsvertrag (`startup|readiness|contract|runtime-regression|flake`) fuer Folgeblocks. `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen; V88 ist damit blockerfest abgeschlossen.
Abgleich 2026-04-13 (Subphase `V77 77.2.1`): Recheck von `77.1.3` zeigte eine Luecke zwischen Terminologie-Vertrag und Registry-Semantik: Browser-`HOST` war nur dokumentarisch als `Nicht verfuegbar` normiert. `src/shared/contracts/PlatformCapabilityRegistry.js` fuehrt jetzt pro Produktrolle einen expliziten `surfacePolicy`-Block (`defaultAccessMode`, `multiplayerRole`, `allowedGameModes`, `requiresCuratedMaps`) plus Resolver `resolveSurfacePolicy()` ein und mappt deaktiviertes Browser-`HOST` auf `PLATFORM_PROVIDER_KINDS.UNAVAILABLE`. `tests/platform-capabilities.contract.test.mjs` deckt den neuen Surface-Policy-Vertrag und die Browser-`HOST`-Aufloesung ab; `docs/plaene/aktiv/V77.md` sowie `docs/referenz/ai_architecture_context.md` sind darauf synchronisiert. Naechste offene V77-Subphase ist `77.2.2` (Ad-hoc-Pruefungen in Menue-/Recording-/Replay-/Discovery-Pfaden auf den zentralen Vertrag abbilden).
Abgleich 2026-04-13 (Subphase `V77 77.2.3`): Recheck von `77.2.2` zeigte eine Vertragsluecke bei der impliziten Availability-Aufloesung: Browser-`HOST` konnte ohne explizites Disabled-Flag als verfuegbar durchrutschen. `PlatformCapabilityRegistry` fuehrt fuer Browser-`HOST` jetzt `enabled: false` ein, trennt explizite Capability-Mappings von Policy-Fallbacks und zieht die Surface-Default-Regel zentral fest (`desktop-app => default-full`, `browser-demo => default-deny`, inkl. `resolvedByDefaultPolicy` fuer unbekannte Capabilities). `tests/platform-capabilities.contract.test.mjs` deckt den Recheck-Fix sowie die neue Default-Regel ab; Menue-, Discovery-, Recording- und Replay-Verbrauch bleiben auf `resolveSurfaceCapabilityAccess()` synchronisiert. Naechste offene V77-Subphase ist `77.2.4` (Dev-only-Schalter/Expertenlogin in denselben Surface-Vertrag ziehen).
Abgleich 2026-04-13 (Subphase `V77 77.3.2`): Recheck von `77.3.1` zeigte keine neue Allowlist-Luecke, aber inkonsistente UX fuer gesperrte Demo-Aktionen. `src/shared/contracts/PlatformSurfacePolicyOps.js` fuehrt mit `resolveSurfaceBlockedFeatureFeedback()` jetzt einen gemeinsamen Feedback-Vertrag (`surface_policy_blocked`, `warning`, `1600ms`, surface-spezifische Meldung) ein; `MenuRuntimeSessionService` und `MenuRuntimePresetConfigService` lesen denselben Resolver fuer blockierte Mode-/Quickstart-/Preset-Aktionen. `tests/platform-capabilities.contract.test.mjs` deckt den Vertrag ab; naechste offene V77-Subphase ist `77.3.3` (Host-/Join-/Offline-/Showcase-Einstiege pro Surface explizit schneiden).
Abgleich 2026-04-13 (Subphase `V77 77.3.3`): Recheck von `77.3.2` zeigte keinen neuen Allowlist-Fehler, aber noch ungeschnittene Einstiege fuer Session-Umschalter, Start-CTA und Lobby-Status. `PlatformCapabilityRegistry` und `PlatformSurfacePolicyOps` fuehren deshalb jetzt `allowedSessionTypes` sowie denselben Einstiegstextvertrag fuer `Showcase`, `Join only` und `Nur Desktop`; `MenuSurfacePolicyUiSync`, `UIManager` und `UIStartSyncController` spiegeln denselben Schnitt in Session-Buttons, Start-Button, Summary und Lobby-UI. `MenuRuntimeSessionService` faellt disallowte Session-Einstiege sichtbar auf den Surface-Fallback zurueck, `MatchStartValidationService` benennt Browser-Multiplayer jetzt explizit als Desktop-Host-Join-Pfad, und `tests/platform-capabilities.contract.test.mjs` plus `tests/core-targeted-runtime.spec.js` sind auf denselben Vertrag vorbereitet. Naechste offene V77-Subphase ist `77.4.1` (V64-Transportvertrag an die neue Surface-Politik koppeln).
Abgleich 2026-04-13 (Subphase `V77 77.4.1`): Recheck von `77.3.3` zeigte keinen neuen CTA-Widerspruch, aber der V64-nahe Transportdefault war noch nicht an dieselbe Surface-Policy gebunden. `PlatformCapabilityRegistry` exportiert jetzt die kleine Surface-Transportmatrix (`defaultMultiplayerTransport`, `allowed`/`host`/`join`/`legacy` transports) fuer `desktop-app` und `browser-demo`; `resolveDefaultLobbyTransport()` sowie `MenuRuntimeMultiplayerService` lesen denselben Vertrag fuer Bridge-Defaults und Snapshot-Fallbacks. `docs/plaene/aktiv/V64.md` und `docs/referenz/ai_architecture_context.md` spiegeln denselben Vorvertrag: Desktop bleibt bei echten `lan|online`-Flows, Browser-Demo fuehrt Multiplayer nur noch als expliziten `join-only`-Pfad ueber `lan`, waehrend `storage-bridge` nur als Legacy-Pfad sichtbar bleibt. Naechste offene V77-Subphase ist `77.4.2` (Altpfade wie `storage-bridge` explizit als Nicht-Standard haerten).
Abgleich 2026-04-10 (Subphase `V72 72.3.1`): `MapSchemaSanitizeOps` meldet ungueltige `portalMode`/`itemSpawnMode`-Werte sowie malformed Portal-/Gate-Eintraege jetzt als sichtbare Sanitisierungswarnungen statt stiller Nullpunkt-Normalisierung. `MapSchemaMigrationOps` und `MapSchemaRuntimeOps` reichen denselben Warnvertrag ueber `parseMapJSON()` und `toArenaMapDefinition()` durch. Naechste offene V72-Subphase ist `72.3.2` (Authoring-Vertrag `dynamic|authored|hybrid`).
Abgleich 2026-04-10 (Subphase `V72 72.3.2`): `MapSchemaRuntimeOps` fuehrt mit `map.portalAuthoring` einen expliziten Authoring-Vertrag fuer `dynamic|authored|hybrid` ein (`mode`, Paar-/Knotenzaehlung, `usesAuthoredPortals`, `usesDynamicPortals`, `hasDanglingPortalNode`). Fehlende oder unvollstaendige authored Portalpaare laufen jetzt ueber klare Warnpfade statt impliziter Interpretation (`authored` ohne Paar bleibt bewusst ohne Dynamic-Fallback; `hybrid` ohne Paar faellt sichtbar auf dynamic-only zurueck). `MapSchemaSanitizeOps` normalisiert den Legacy-Fallback dabei anhand vollstaendiger Portalpaare statt einzelner Knoten. Naechste offene V72-Subphase ist `72.3.3` (Cooldown-, Inaktiv- und Post-Portal-Signale).
Abgleich 2026-04-10 (Subphase `V72 72.3.3`): `PortalRuntimeSystem` und `SpecialGateRuntime` liefern pro Entity lesbare Traversal-Signale fuer Portal-/Gate-Cooldowns, Exit-Portal-Inaktivstatus und Post-Portal-Fenster. `PortalGateSystem`, `Arena` sowie `MatchRuntimeProjectionBuilder` reichen den Vertrag als `players[*].traversal` in die Runtime-Projektion durch; `MatchRuntimeProjectionContract` normalisiert dieselben Felder stabil (`portalsEnabled`, Cooldowns, Exit-Portal-Zaehlung, `postPortal*`). `docs/referenz/gameplay_powerups_portale_gates.md` dokumentiert den Signalpfad. Naechste offene V72-Subphase ist `72.4.1` (Spawn-Vertrag authored Item-Anker).
Abgleich 2026-04-10 (Subphase `V72 72.4.1`): `MapSchemaRuntimeOps` modelliert authored Item-Spawns jetzt explizit ueber `map.itemSpawnAuthoring` (`mode`, `authoredAnchorCount`, `requiresAuthoredAnchor`, `usesAuthoredAnchors`, `usesRandomFallback`, `disablesSpawnWithoutAnchor`) und meldet `anchor-only`/`hybrid`-Grenzfaelle sichtbar als Warnpfad. `PowerupManager` konsumiert denselben Vertrag und verhindert fuer `anchor-only` den bisher impliziten Random-Fallback, wenn keine authored Anchors verfuegbar sind. `docs/referenz/gameplay_powerups_portale_gates.md` dokumentiert den Spawn-Vertrag; naechste offene V72-Subphase ist `72.4.2` (Map-/Editor-Validierung fuer Spawn- und Gate-Felder).
Abgleich 2026-04-11 (Subphase `V72 72.4.2`): `MapSchemaSanitizeOps` validiert ungueltige authored `pickupType`-Werte jetzt sichtbar und faellt deterministisch auf `type`/`model` zurueck; unbekannte Gate-Typen werden bereits im Schema-Warnpfad statt erst spaeter im Runtime-Port gemeldet. `EditorMapSerializer` und `EditorSessionControls` spiegeln denselben Warnvertrag fuer Export, Disk-Save, Import und Playtest sichtbar in den Editor-Flow. `tests/core-targeted.spec.js` deckt den fruehen Editor-Export-Warnpfad ab; naechste offene V72-Subphase ist `72.5.1` (gezielte Regressionstests).
Abgleich 2026-04-13 (Subphase `V72 72.5.1`): `tests/gameplay-powerups-portals-gates.contract.test.mjs` ergaenzt einen gezielten `node-contract`-Regressionstest fuer die zentrale Pickup-Capability-Matrix (inkl. Hunt-only-Raketen und Utility-Mode-Grenzen), sichtbare Gate-/Portal-Schema-Warnpfade (`portalMode`, Legacy-Gate-Typen, invalides `pickupType`) und die mode-spezifische Shield-Semantik von `ClassicModeStrategy` und `HuntModeStrategy`. `package.json` bindet den neuen Scope im `test:contract`-Einstieg ein; naechste offene V72-Subphase ist `72.5.2` (fehlgeschlagene Item-Aktionen als Telemetrie/Recorder-Diagnostik erfassen).
Abgleich 2026-04-13 (Subphase `V72 72.5.2`): Recheck von `72.5.1` gegen DoD zeigte keine Vertragsluecke; der offene Rest lag in explizit auswertbaren Fehlpfaden fuer Item-Aktionen. `RoundMetricsStore` fuehrt dafuer jetzt strukturierte Recorder-Diagnostik `failedItemActions`, `failedItemActionModeCounts` und `failedItemActionCodeCounts` ein (pro Runde und aggregiert), wobei `item.use.*`, `item.shoot.*` und `mg.shoot.*` konsistent gegen den Success-/Failure-Codevertrag getrennt werden. `tests/gameplay-powerups-portals-gates.contract.test.mjs` deckt denselben Fehlpfadvertrag ab; `docs/referenz/gameplay_powerups_portale_gates.md` dokumentiert die neuen Diagnosefelder. Naechste offene V72-Subphase ist `72.5.3` (Gameplay-Referenz, Editor-Hinweise und Custom-Map-Warnungen aktualisieren).
Abgleich 2026-04-13 (Subphase `V72 72.5.3`): Recheck von `72.5.2` gegen DoD zeigte keine neue Recorder-Vertragsluecke; der offene Rest lag im sichtbaren Warn-Fanout fuer Custom-Map-Hinweise. `MatchSessionFeedbackPlan` haengt bei mehreren Custom-Map-Warnungen jetzt den Zusatz `(+N Hinweis(e) in Konsole)` auch dann an, wenn bereits eine Runtime-Message gesetzt ist, damit Warnumfang nicht still verloren geht. `tests/gameplay-powerups-portals-gates.contract.test.mjs` deckt den Toast-/Warnfanout-Vertrag ab, und `docs/referenz/gameplay_powerups_portale_gates.md` fuehrt Editor-Hinweise sowie den strukturierten Custom-Map-Warnpfad (`reason`/`message`/`warnings`/`migration`) jetzt explizit. Naechste offene V72-Subphase ist `72.6.1` (HUD, Touch-Input und Action-Oberflaechen auf Capability-/Cooldown-Vertrag angleichen).
Abgleich 2026-04-14 (Subphase `V72 72.6.2`): `GameplayActionResultContract` fuehrt jetzt auch fuer Traversal standardisierte Result-Codes (`portal.travel.cooldown`, `portal.travel.inactive`, `portal.exit.trigger|cooldown|inactive`, `gate.trigger.cooldown`) ein. `PortalRuntimeSystem` und `SpecialGateRuntime` liefern dieselben Codes direkt in ihren Runtime-Rueckgaben, waehrend `PlayerInteractionPhase` fuer Erfolgs-Logs denselben Contract statt eigener Gate-/Portal-Sonderwerte konsumiert. `tests/gameplay-powerups-portals-gates.contract.test.mjs` deckt Portal-, Exit-Portal- und Spezial-Gate-Rueckgaben gegen denselben Codevertrag ab; `docs/referenz/gameplay_powerups_portale_gates.md` dokumentiert die neuen Traversal-Codes. Naechste offene V72-Subphase ist `72.6.3` (Hunt-Bot- und Fallback-Policies fuer Portal-, Gate- und Nicht-Raketen-Items erweitern).
Abgleich 2026-04-14 (Subphase `V72 72.6.3`): `HuntBotPolicy` und `HuntBridgePolicy` teilen jetzt denselben defensiven Fallback fuer Nicht-Raketen-Items, statt Hunt-Pfade weiter auf Rocket-only zu verengen. Unter hohem Survival-Druck priorisieren beide Hunt-Layer defensive Utility-Items (`useItem`) vor blosem MG-Druck, und Retreat-Steering kann nun neben bereiten Special Gates auch bereite Portale als Traversal-Anker nutzen. `tests/gameplay-powerups-portals-gates.contract.test.mjs` deckt den neuen Retreat-/Item-Vertrag direkt gegen beide Hunt-Policies ab; naechste offene V72-Subphase ist `72.6.4` (Shared-Cooldown-Aufloesung in `TraversalCooldownOps` extrahieren).
Abgleich 2026-04-12 (Subphase `V85 85.1.1`): Persistierte Artefakte, Import/Export-Pfade und schema-lose JSON-Stellen fuer Settings/Profile/Menu-Stores, Arcade-Records, Replay sowie Map-/Editor-JSON sind inventarisiert; `editor/templates/**` ist im aktuellen Repo-Stand nicht vorhanden und als Scope-Luecke markiert. Naechste offene V85-Subphase ist `85.1.2` (Versionsmatrix).
Abgleich 2026-04-13 (Subphase `V85 85.1.2`): `docs/plaene/aktiv/V85.md` fixiert jetzt die kanonische Versionsmatrix fuer Settings-, Profil-, Preset-, Replay-, Arcade-, Map- und kuenftige Meta-Artefakt-Familien. Dabei ist festgezogen: Store-Payloads fuehren `schemaVersion`, Transfer-/Snapshot-Huellen `contractVersion`, kuenftige Runtime-/Editor-/Template-Kataloge `descriptorVersion`, waehrend authored Maps bewusst auf der numerischen `MAP_SCHEMA_VERSION` bleiben; `docs/referenz/ai_architecture_context.md` spiegelt dieselbe Leitplanke fuer Folgearbeit. Naechste offene V85-Subphase ist `85.2.1` (kleiner Migrationsrahmen).
Abgleich 2026-04-13 (Subphase `V85 85.2.1`): `src/shared/contracts/ArtifactVersionMigrationContract.js` fuehrt einen kleinen, gemeinsamen Entscheidungsvertrag `current|upgrade|fallback|reject` fuer `schemaVersion`/`contractVersion`/`version` ein. `src/ui/ProfileTransferOps.js`, `src/entities/mapSchema/MapSchemaMigrationOps.js` und `src/core/replay/ReplayRecorder.js` konsumieren denselben Rahmen jetzt produktiv fuer explizites Reject, Legacy-Fallback und Upgrade-Lesepfade; `tests/persistence-version-migration.contract.test.mjs` ist im `node-contract`-Runner registriert. Naechste offene V85-Subphase ist `85.2.2` (bestehende Stores schrittweise auf denselben Rahmen ziehen).
Abgleich 2026-04-13 (Subphase `V85 85.2.2`): `SettingsStore`, `MenuPresetStore`, `MenuDraftStore`, `MenuTextOverrideStore`, `MenuTelemetryStore`, `ArcadeVehicleProfile` und `VehicleManagerLoadoutPresets` nutzen jetzt denselben Migrationsrahmen fuer `schemaVersion`-Entscheide (`current|upgrade|fallback|reject`) und migrieren Legacy- oder schema-lose Payloads beim Laden auf versionierte Envelope-Formate zurueck. `parseProfileImport()` rejectet zusaetzlich explizit gesetzte, aber ungueltige `contractVersion`; `tests/persistence-version-migration.contract.test.mjs` deckt die erweiterten Store-/Preset-Migrationspfade im `node-contract`-Layer ab. Naechste offene V85-Subphase ist `85.3.1` (gemeinsame Content-Descriptor-Vertraege fuer Maps, Runtime-Presets und Editor-Templates).
Abgleich 2026-04-13 (Subphase `V85 85.3.1`): `src/shared/contracts/ContentDescriptorContract.js` verankert den gemeinsamen Registry-Envelope `descriptorVersion: content-descriptor.v1`; `RuntimeMapCatalogContract`, `EditorBuildCatalog`, `ArcadeMissionContract`, `ArcadeRewardContract`, `ArcadeModifierContract` und `vehicle-registry.js` exportieren jetzt stabile Descriptor-Registries fuer Maps, Editor-Build/Template-Scope, Missionen, Rewards, Modifiers und Fahrzeuge. `tests/content-descriptor-registries.contract.test.mjs` deckt Envelope + Cross-Referenzen der Arcade-Pools gegen Map-/Reward-/Modifier-IDs ab, und `expert_gauntlet` ist als Runtime-Map-Key in den Expert-Presets verankert. Naechste offene V85-Subphase ist `85.3.2` (Runtime-, Editor- und Import-Verbrauch auf dieselben Descriptor-Registries zurueckfuehren).
Abgleich 2026-04-13 (Subphase `V85 85.3.2`): Recheck von `85.3.1` gegen DoD zeigte keine blockerhafte Vertragsluecke; der Folgefokus lag auf Verbrauchspfaden. `ArcadeRunRuntime`, `CustomMapLoader`/`CustomMapSelectionResolver`, `EditorBuildCatalog`, `ArcadeMissionState` und `vehicle-registry` lesen Runtime-/Editor-/Mission-/Reward-/Modifier-/Vehicle-Daten jetzt ueber dieselben Descriptor-Registry-Vertraege statt ueber verstreute Sonderlisten (`MapPresetCatalog`, direkte Objekt-Keys, ad-hoc Fallback-Listen). `tests/content-descriptor-registries.contract.test.mjs` deckt den erweiterten Consumer-Abgleich fuer Runtime-Map-Keys/-Labels, Editor-Build-Getter und descriptorbasierte Custom-Map-Fallbacks ab. Naechste offene V85-Subphase ist `85.4.1` (Datei-, Browser-, Desktop-, Editor-Import und Template-Pfade ueber Capability- und Versionspruefungen absichern).
Abgleich 2026-04-13 (Subphase `V85 85.4.1`): Recheck von `85.3.2` gegen DoD zeigte keine blockerhafte Vertragsluecke. `MenuConfigShareOps` nutzt jetzt den versionierten Transfer-Envelope `menu-config-share.v1` mit Legacy-Fallback und Reject fuer unbekannte `contractVersion`; `EditorSessionControls` plus `vite.config.js` haerten die Datei-/Editor-Disk-API ueber `editor-disk-io.v1` auf Request- und Response-Seite. `CustomMapLoader` liefert einen expliziten Browser-Storage-Capability-Vertrag (`custom-map-storage-capability.v1`), `DownloadService` prueft Desktop-Save-Adapter-Vertraege vor App-Save-Fallbacks, und `EditorBuildCatalog` exponiert fuer `editor/templates/**` jetzt einen expliziten Template-Import-Capability-Status. `tests/persistence-version-migration.contract.test.mjs` und `tests/content-descriptor-registries.contract.test.mjs` decken die neuen Version-/Capability-Kanten ab. Naechste offene V85-Subphase ist `85.4.2` (Fehler-, Warn- und Migrationsmeldungen fuer inkompatible oder veraltete Artefakte bewusst gestalten).
Abgleich 2026-04-13 (Subphase `V85 85.4.2`): Recheck von `85.4.1` gegen DoD zeigte keine blockerhafte Vertragsluecke; der offene Rest lag in bewussten Nutzer- und Fallback-Meldungen. `MenuConfigShareOps` plus `MenuRuntimePresetConfigService` kennzeichnen Legacy-Config-Imports jetzt sichtbar ueber `message`/`tone`/`warnings`/`migration`, `CustomMapLoader`/`CustomMapSelectionResolver`/`MatchSessionFeedbackPlan` liefern lesbare Storage-, Parse-, Fallback- und Migrationsmeldungen fuer Custom-Maps, und `EditorSessionControls` trennt normale Hinweise von Migrationshinweisen inklusive klarer Stand-Mismatch-Meldung fuer `editor-disk-io.v1`. `DownloadService` fuehrt strukturierte Recording-Export-Meldungen fuer App-, API- und Browser-Fallback ein, waehrend `EditorBuildCatalog` den fehlenden `editor/templates/**`-Pfad jetzt auch mit lesbarer Capability-Botschaft markiert. `tests/persistence-version-migration.contract.test.mjs`, `tests/content-descriptor-registries.contract.test.mjs` und `tests/core-targeted-runtime.spec.js` sind auf die neuen Meldungsvertraege vorbereitet. Naechste offene V85-Subphase ist `85.5.1` (Altformate, Shadow-Writes oder Kompatibilitaetsadapter mit Sunset-Regeln dokumentieren).
Abgleich 2026-04-13 (Subphase `V85 85.5.1`): Recheck von `85.4.2` gegen DoD und Ist-Code zeigte keine blockerhafte Vertragsluecke. `docs/plaene/aktiv/V85.md` dokumentiert jetzt die verbindliche Sunset-Matrix fuer verbleibende Legacy-Importe, Replay-Shadow-Write, Store-/Menu-Fallback-Huellen, `editor-disk-io.v1`, Desktop-Save-Adapter und Map-Schema-Upgrades inkl. Exit-Kriterien; `docs/referenz/ai_architecture_context.md` spiegelt dieselbe Leitplanke unter `4.6.5.7`. Neue Kompatibilitaetspfade bleiben damit nur noch mit dokumentiertem Sunset-Trigger und strukturiertem Feedback-Vertrag zulaessig. Naechste offene V85-Subphase ist `85.5.2` (Folgeblocks, Editor-Authoring-Verbraucher und Referenzdoku auf den neuen Daten- und Content-Leseweg ausrichten).
Abgleich 2026-04-13 (Subphase `V85 85.5.2`): Recheck von `85.5.1` zeigte eine echte Verbrauchsluecke im Profil-Transfer; `ProfileTransferOps`, `ProfileManager` und `ProfileUiController` transportieren Legacy-Profile ohne `contractVersion` jetzt sichtbar ueber `reason`/`message`/`tone`/`warnings`/`migration`, waehrend Envelope-Exports weiter `profile-export.v1` bleiben. `ArcadeMenuSurface` liest Vehicle-Mastery nicht mehr roh aus `localStorage`, sondern ueber `SettingsStore.loadJsonRecord()` plus `ArcadeVehicleProfileContract` und damit ueber denselben schemaVersion-/Migrationspfad wie die Writer. `editor/js/main.js` und `EditorSessionControls` exponieren fuer Folgearbeit ausserdem `descriptorVersion`, Template-Capability und `editor-disk-io.v1` als sichtbare Editor-Contract-Signale; `docs/plaene/aktiv/V86.md`, `docs/referenz/ai_architecture_context.md` und `docs/referenz/ai_project_onboarding.md` spiegeln denselben Leseweg fuer Folgeblocks. Naechste offene V85-Subphase ist `85.99.1` (Architektur-, Doku- und Governance-Gates).
Abgleich 2026-04-13 (Subphase `V85 85.99.1`): Recheck von `85.5.2` gegen DoD und Ist-Code zeigte keine neue Vertragsluecke; Profil-Import-Feedback, Arcade-Vehicle-Mastery-Leseweg und Editor-Authoring-Hints bleiben konsistent auf den in V85 dokumentierten Consumption-Contracts. Die Abschluss-Gates liefen vollstaendig gruen (`npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics`, `npm run check:architecture:ratchet`, `npm run typecheck:architecture`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, `npm run build`). Naechste offene V85-Subphase ist `85.99.2` (Versionsmatrix, Migrationsregeln und Capability-Grenzen fuer additive Folgefeatures final dokumentarisch absichern).
Abgleich 2026-04-13 (Subphase `V85 85.99.2`): Recheck von `85.99.1` zeigte keine neue Code-Luecke, aber eine Dokumentations-Unsauberkeit (DoD/Abschlussstatus noch nicht deckungsgleich zu den gruenen Gates). `docs/plaene/aktiv/V85.md`, `docs/referenz/ai_architecture_context.md` und `docs/referenz/ai_project_onboarding.md` fuehren jetzt denselben Abschlussvertrag fuer additive Folgefeatures: bestehende `schemaVersion`-/`contractVersion`-/`descriptorVersion`-Reader zuerst erweitern, neue Fallbacks nur mit strukturiertem Feedback plus Sunset-Trigger und keine parallelen Raw-JSON-Lesepfade. `V85` ist damit blockerfrei abgeschlossen.
Abgleich 2026-04-12 (Subphase `V89 89.2.1`): Der kleinste sinnvolle Desktop-Harness ist jetzt dokumentiert: echter Electron-Bootpfad (`launch -> main -> static-server -> preload`), vierstufiger Start-/Fenster-/Renderer-Readiness-Schnitt und Mindestartefakte `desktop-startup-diagnostics.json`, Main-Prozess-Log, Renderer-Console-/Error-Log plus Fenster-Screenshot. Die heutige Runner-Basis (`playwright.config.js`, `scripts/playwright-run-profile.mjs`, `scripts/run-playwright-smoke.mjs`, `scripts/run-playwright-targeted-clusters.mjs`, `scripts/run-playwright-browser-contract.mjs`) bleibt bis `V89.5` bewusst als Uebergangsoberflaeche bestehen; naechste offene V89-Subphase ist `89.2.2` (Helper-/Taxonomie-Trennung).
Abgleich 2026-04-12 (Subphase `V89 89.2.2`): Die Zieltrennung ist jetzt festgezogen: `helpers.browser` bleibt fuer DOM-/Menue-/`GAME_INSTANCE`-Hilfen und behaelt die bestehende Browser-Taxonomie `startup|readiness|contract|runtime-regression|flake`, waehrend `helpers.desktop` kuenftig ausschliesslich an der Electron-Bootkette (`launch -> main -> static-server -> preload`) haengt und die Desktop-Klassen `desktop-startup|desktop-readiness|desktop-runtime-regression|desktop-flake` mit der vierstufigen Readiness `process_started -> window_created -> renderer_loaded -> preload_bridge_ready` nutzt. Die heutige physische Basis (`tests/helpers.js`, `tests/playwright-readiness.js`, `tests/playwright.global-setup.js`, `playwright.config.js`) bleibt bis zum spaeteren Harness-/Script-Umbau erhalten; naechste offene V89-Subphase ist `89.3.1` (minimaler Desktop-Smoke).
Abgleich 2026-04-12 (Subphase `V89 89.3.1`): `tests/helpers.desktop.js` startet jetzt die echte Electron-App ueber das lokale `electron/`-Binary und nutzt erstmals produktiv die vierstufige Desktop-Readiness `process_started -> window_created -> renderer_loaded -> preload_bridge_ready`. `tests/core.spec.js` bildet darauf den minimalen Desktop-Smoke fuer App-Start, Menu-Sichtbarkeit, Preload-Bridge/`GAME_INSTANCE`, Matchstart, Input-Ankunft und Return-to-Menu; `tests/helpers.js` bleibt dabei renderer-only und nimmt nur wiederverwendbare `already-loaded`-Wartepfade fuer geladene Seiten auf. Naechste offene V89-Subphase ist `89.3.2` (Artefakt-Standardisierung).
Abgleich 2026-04-12 (Subphase `V89 89.3.2`): `tests/helpers.desktop.js` standardisiert den kleinen Desktop-Artefaktsatz jetzt produktiv auf `desktop-startup-diagnostics.json`, `desktop-main-process.log`, `desktop-renderer-console.log`, `desktop-renderer-errors.log`, `desktop-renderer-ready.png` und `desktop-renderer-failure.png`. Die Diagnostics fuehren letzte Desktop-Stage, Failure-Klasse (`desktop-startup|desktop-readiness|desktop-runtime-regression|desktop-flake`) und konkrete Failure-Hints zusammen; `tests/helpers.js` bleibt dabei renderer-only. Naechste offene V89-Subphase ist `89.4.1` (Browser-Scope reduzieren).
Abgleich 2026-04-12 (Subphase `V89 89.4.1`): `tests/network-adapter.spec.js` und `tests/recording.spec.js` sind fuer `browser-compat` jetzt auf Web-Boot, browsernahe APIs, Surface-Checks und Browser-Demo-Kompatibilitaet zugeschnitten. Redundante Produkt-Hauptpfade wie der Singleplayer-Match-Leak-Check, laengere Zwei-Tab-Multiplayer-Stabilitaet sowie Recorder-Match-Lifecycle im Live-Flow laufen dort nicht mehr mit; der Browser-Layer bleibt damit nachgelagerter `browser-compat`-Scope statt Hauptprodukt-Gate. Naechste offene V89-Subphase ist `89.4.2` (gemeinsame Runtime-/Match-/KI-/Storage-/Capability-Vertraege weiter nach `node-contract` verschieben).
Abgleich 2026-04-12 (Subphase `V89 89.4.2`): `tests/menu-multiplayer-bridge.contract.test.mjs`, `tests/platform-capabilities.contract.test.mjs`, `tests/training-automation-core.contract.test.mjs` und `tests/training-environment.contract.test.mjs` tragen jetzt die gemeinsamen Runtime-/Match-/KI-/Storage-/Capability-Vertraege, die zuvor noch als Browser-Duplikate in `tests/core-targeted-platform.spec.js`, `tests/core-targeted-regressions.spec.js` und `tests/training-automation.spec.js` haengen blieben. Der Browser-Layer verliert damit weitere UI-harness-unabhaengige Vertragslast und bleibt naeher an Web-Boot, Demo-Kompatibilitaet und Surface-Pruefungen. Naechste offene V89-Subphase ist `89.5.1` (Skripte und Gate-Namen umstellen).
Abgleich 2026-04-12 (Subphase `V89 89.5.1`): `package.json`, `scripts/playwright-run-profile.mjs`, `scripts/run-playwright-smoke.mjs`, `scripts/run-playwright-targeted.mjs`, `scripts/run-playwright-targeted-clusters.mjs` und `scripts/run-playwright-browser-contract.mjs` fuehren jetzt die kanonischen Einstiegspunkte `test:desktop:smoke`, `test:desktop:e2e` und `test:browser:compat` sowie die korrespondierenden Playwright-Profile `desktop-smoke`, `desktop-e2e` und `browser-compat`. `test:desktop:e2e` fokussiert standardmaessig nur die produktnahen Kerncluster `core-shell`, `core-platform`, `core-surface` und `core-runtime`; schwerere Cluster bleiben expliziter `heavy-diagnostic`-Scope. `.agents/test_mapping.md` und `docs/plaene/aktiv/V89.md` spiegeln dieselbe Trennung gegen `node-contract` und `heavy-diagnostic`; Legacy-Aliasse (`test:smoke`, `test:targeted`, `test:playwright:preview-smoke`, `test:playwright:dev-runtime`, `test:playwright:browser-contract`) bleiben nur als Kompatibilitaetsschicht. Naechste offene V89-Subphase ist `89.5.2` (Mapping-/Referenzdoku fuer kuenftige Feature-Arbeit scharfziehen).
Abgleich 2026-04-12 (Subphase `V89 89.5.2`): `.agents/test_mapping.md` fuehrt jetzt eine explizite Schnellwahl fuer neue Feature-Arbeit ein: `node-contract` fuer gemeinsame Vertraege und Logik, `desktop-smoke` fuer das kleinste Desktop-Hauptproduktsignal, `desktop-e2e` nur fuer produktnahe Integrationen ueber den Smoke-Kern hinaus, `browser-compat` nur fuer Browser-Demo-/Web-API-/Fallback-Scope und `heavy-diagnostic` nur fuer bestehende schwere Cluster oder Diagnosebedarf. `docs/qa/Teststrategie_Testpyramide.md`, `docs/referenz/ai_project_onboarding.md`, `docs/referenz/ai_architecture_context.md` und `docs/plaene/aktiv/V89.md` spiegeln dieselbe Leitplanke; naechste offene V89-Subphase ist `89.99.1` (Abschluss-Gate).
Abgleich 2026-04-12 (Subphase `V89 89.99.1`): `npm run test:desktop:smoke` ist fuer den dokumentierten Kernscope gruen (2/2 in `tests/core.spec.js`) und bestaetigt den minimalen Desktop-Hauptpfad ueber die echte Electron-Shell. `npm run test:contract` bleibt mit genau einem fachlichen Restfehler in `tests/training-environment.contract.test.mjs` (`T97`, `requestTick` erwartet `3`, erhalten `1`) rot; der Kernscope ist dafuer in `docs/Fehlerberichte/2026-04-12_v89-89.99.1-node-contract-core-gate-blocker.md` blockerfest dokumentiert. `test:core` bleibt dadurch nur ueber den Contract-Layer blockiert; naechste offene V89-Subphase ist `89.99.2` (Browser-/Desktop-/Contract-Sync ohne Widerspruch).
Abgleich 2026-04-12 (Subphase `V89 89.99.2`): `docs/plaene/aktiv/V89.md`, `docs/Umsetzungsplan.md`, `.agents/test_mapping.md`, `docs/qa/Teststrategie_Testpyramide.md`, `docs/referenz/ai_architecture_context.md` und `docs/referenz/ai_project_onboarding.md` spiegeln jetzt denselben Abschlussstand: `desktop-smoke` bleibt das primaere Desktop-Hauptsignal, `browser-compat` ist der nachgelagerte Browser-/Demo-Layer, gemeinsame Runtime-/Match-/KI-/Storage-/Capability-Vertraege liegen im `node-contract`, und `test:core` haengt weiterhin nur am blockerfest dokumentierten Contract-Restfehler `T97`. V89 ist damit blockerfest abgeschlossen.
Abgleich 2026-04-14 (Subphase `V77 77.4.3`): `src/shared/contracts/PlatformSurfacePolicyOps.js` fuehrt mit `resolveSurfaceMultiplayerGateAccess()` den zentralen Gruppenvertrag `Vollversion hostet, Demo joint` fuer Discovery-, Lobby- und Session-Gates ein. `src/core/runtime/MenuRuntimeMultiplayerService.js` prueft den Host-Gate jetzt vor dem `host()`-Aufruf, `src/core/runtime/MatchStartValidationService.js` konsumiert denselben Resolver statt eigener Capability-Abfragen. `tests/platform-capabilities.contract.test.mjs` deckt Host-Verweigerung, Join-Erlaubnis, Discovery-Erlaubnis und unbekannte Aktionen explizit ab. Naechste offene V77-Subphase ist `77.4.4` (Surface-Fallbacks fuer `modePath`, `sessionType` aus `MenuSurfacePolicyUiSync` in expliziten Migrationspfad ziehen).
Abgleich 2026-04-14 (Subphase `V77 77.4.4`): `src/shared/contracts/PlatformSurfacePolicyOps.js` fuehrt mit `resolveSurfaceMenuState()` einen reinen Surface-Fallback-Resolver fuer `sessionType`, `modePath` und kuratierte `mapKey`-Defaults ein; `applySurfaceMenuState()` bleibt der explizite Mutationspfad. `src/ui/menu/MenuSurfacePolicyUiSync.js`, `src/ui/UIManager.js` und `src/ui/UIStartSyncController.js` lesen diesen Resolver jetzt nur noch fuer Darstellung, waehrend `src/core/runtime/GameRuntimeSettingsHandler.js` plus `src/core/runtime/GameRuntimeSessionHandler.js` die Browser-Demo-Fallbacks erst direkt vor dem Match-Start bewusst anwenden. `tests/platform-capabilities.contract.test.mjs` und `tests/core-targeted-runtime.spec.js` decken den Resolver und den expliziten Startpfad ab. Naechste offene V77-Subphase ist `77.5.1` (Replay-, Video-, Datei-, Diagnostics- und Tooling-Pfade klassifizieren).
Abgleich 2026-04-14 (Subphase `V77 77.5.1`): `src/shared/contracts/PlatformSurfacePolicyOps.js` klassifiziert Replay, Video-Export, Dateioperationen, Diagnostics und Tooling zentral ueber `PLATFORM_SURFACE_FEATURE_IDS`, `PLATFORM_SURFACE_FEATURE_CLASSIFICATIONS` und `resolveSurfaceFeatureClassification()`. `src/core/replay/ReplayRecorder.js` nutzt die Replay-Klasse fuer den expliziten `demo-safe`-Persistenzpfad, und `src/core/recording/DownloadService.js` schreibt die Video-Klasse als `surfaceClassification` plus degradierte Fallback-Warnungen in den Export-Status. `tests/platform-capabilities.contract.test.mjs` deckt die neue Klassifizierungs-Matrix ab und sichert den Browser-Demo-Curated-Fallback zusaetzlich gegen nicht-kuratierte Map-Ausweichpfade. Naechste offene V77-Subphase ist `77.5.2` (Browser-Fallbacks auf echten Demo-Wert begrenzen).
Abgleich 2026-04-14 (Subphase `V91 91.1.1`): Recheck der zuletzt bearbeiteten `V77`-Subphase gegen DoD-/Abschlusskonsistenz zeigte keine fachliche Luecke, aber einen Planwiderspruch (`V77 77.3` stand trotz abgeschlossener `77.3.x`-Subphasen noch auf `status: open`); der Blockstatus ist jetzt konsistent. Fuer `V91 91.1.1` sind die Legacy-Surfaces `game.runtimeBundle`, `game.runtimeFacade`, `window.GAME_RUNTIME`, `GameRuntimePorts`-Fallbacks, `curviosApp`-/`__CURVIOS_APP__`-Reads und ActiveRuntimeConfig-Globalslots gegen reale produktive Aufrufer inventarisiert und den erlaubten Uebergangsadaptern zugeordnet (`docs/plaene/aktiv/V91.md`, `docs/referenz/ai_architecture_context.md`). Gates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` gruen; `npm run build` in dieser Umgebung mit `spawn EPERM` blockiert und in `docs/Fehlerberichte/2026-04-14_v91-build-vite-spawn-eperm.md` dokumentiert. Naechste offene V91-Subphase ist `91.1.2` (maschinenlesbare Guard-Matrix in Guard-Konfiguration und Referenzdoku verankern).
Abgleich 2026-04-14 (Subphase `V91 91.3.1`): Recheck der zuletzt bearbeiteten Subphase `V91 91.2.3` gegen DoD zeigte keine neue Data-/Resolver-Luecke in `PlatformCapabilityData`/`PlatformCapabilityRegistry`; die verbleibende Unsauberkeit lag in impliziten Runtime-Legacy-Fallbacks. `src/shared/runtime/GameRuntimePorts.js` nutzt fuer Runtime-Intents jetzt eine explizite Adapter-Reihenfolge (Bundle `runtimeCoordinator`/`runtimeFacade` vor markierten Legacy-Restadaptern), `createLifecyclePort()` liest denselben Resolver, `src/core/runtime/GameRuntimeCoordinator.js` entfernt rohe Runtime-Slot-Fallbacks fuer Ports/Facade/UIManager und `src/core/GameRuntimeFacade.js` liest `uiManager` nur noch ueber den Bundle-Handle. `tests/runtime-regressions.contract.test.mjs` wurde um drei Regression-Tests fuer den neuen Adapter-Vertrag erweitert; die Ausfuehrung per `node --test` ist in dieser Umgebung mit `spawn EPERM` blockiert (non-`*.99` deferred). Naechste offene V91-Subphase ist `91.3.2` (UI-/State-/Config-Consumer auf Snapshots/Injection ziehen).
Abgleich 2026-04-14 (Subphase `V91 91.3.4`): Recheck der zuletzt bearbeiteten Subphase `V91 91.3.3` gegen DoD zeigte keine neue Normalisierungsdrift; die verbleibende Unsauberkeit waren bidirektionale UI-Kontextpfade. `src/ui/menu/MenuUiSyncContext.js` fuehrt jetzt den gemeinsamen Snapshot-Vertrag fuer Access-/Release-/Surface-Kontext ein. `src/ui/UIManager.js`, `src/ui/UINavigationLifecycleController.js`, `src/ui/UIStartSyncController.js` und `src/ui/menu/MenuDeveloperStateSync.js` konsumieren denselben expliziten Kontextpfad statt impliziter Reach-Through- oder Callback-Ripple-Ketten. `tests/runtime-regressions.contract.test.mjs` deckt den Snapshot-Resolver und den Release-State-Vertrag mit zwei zusaetzlichen Regression-Tests ab (non-`*.99` Testausfuehrung deferred). Naechste offene V91-Subphase ist `91.3.5` (Persistence-Store-Boilerplate extrahieren).
Abgleich 2026-04-14 (Subphase `V91 91.4.1`): Recheck der zuletzt bearbeiteten Subphase `V91 91.3.6` gegen DoD zeigte keine neue Logging-/Migrationsluecke; Store-Fehlerpfade bleiben konsistent ueber `PersistentStoreLoadUtils`. Der Shared-Contract-Pfad fuer `91.4.x` ist jetzt auf `tests/lifecycle-capability.contract.test.mjs` konsolidiert, damit Lifecycle-/Capability-Gating nicht ueber zwei Testdateien driftet. Der 91.4.1-Kern bleibt unveraendert abgesichert: Lease-Race-Guard fuer `return_to_menu`, Finalize-Blocking (`finalizing -> menu`) und Event-Reihenfolge `capability_fallback_used -> match_finalized -> menu_opened`.
Abgleich 2026-04-14 (Subphase `V91 91.4.2`): `tests/lifecycle-capability.contract.test.mjs` deckt jetzt den snapshotgetriebenen UI-Gating-Pfad (`createSessionRuntimeSnapshot`, `createMatchFlowSnapshot`, `createPlatformCapabilitySnapshot`) und die Surface-/Capability-Vertraege (`resolveSurfaceBlockedFeatureFeedback`, `resolveSurfaceFeatureLaunchGuard`, `resolveSurfaceMultiplayerGateAccess`, `resolveSurfaceFeatureClassification`) in einem kanonischen Contract-Scope ab. `package.json` registriert den Test in `test:contract`; naechste offene V91-Subphase ist `91.5.1` (Feature-Start-Checkliste in Referenzdoku/Onboarding verankern).
Abgleich 2026-04-14 (Subphase `V91 91.5.1`): Recheck der zuletzt bearbeiteten Subphase `91.4.2` zeigte keine DoD-Luecke im Lifecycle-/Capability-Vertrag; als Nachschaerfung prueft `tests/lifecycle-capability.contract.test.mjs` den Browser-Demo-Blocked-Branch fuer `quick_action` jetzt explizit statt nur den erlaubten `normal`-Pfad. `docs/referenz/ai_architecture_context.md` (Abschnitt 4.5.6) und `docs/referenz/ai_project_onboarding.md` (Task-Start-Checkliste) fuehren jetzt dieselbe 6-Dimensionen-Feature-Start-Checkliste fuer `Contract`, `Command/Event`, `Snapshot`, `Capability`, `Sunset alter Pfade` und `Desktop-vs-Demo`. Naechste offene V91-Subphase ist `91.5.2` (Folgeblock-Spiegelung fuer V64/V81/V86/Test-Mapping).
Abgleich 2026-04-14 (Subphase `V91 91.5.2`): Die Folgeblock-Spiegelung ist in `V64`/`V81`/`V82`/`V86` verankert und das kanonische Test-Mapping (`.agents/test_mapping.md`) fuehrt die `architecture-guard`-Klasse inklusive neuer Pfad->Command-Eintraege fuer `PlatformCapabilityData.js`, `legacy-surface-guard-matrix.json`, `lifecycle-capability.contract.test.mjs` und `runtime-regressions.contract.test.mjs`; `91.5.2` ist abgeschlossen.
Abgleich 2026-04-15 (Subphase `V92 92.1.2`): Recheck der zuletzt bearbeiteten Subphase `V92 92.1.1` zeigte eine Unsauberkeit im Global-Surface-Inventar (`window.GAME_INSTANCE`-Leser in `src/ui/arcade/ArcadeMenuSurface.js` waren nicht gespiegelt); der Hotspot-Snapshot ist jetzt korrigiert und um `MatchLifecycleSessionPort`/`TouchInputSource`/`MatchFlowTransitionHotspots` als runtimeFacade-Reach-Throughs ergaenzt. `docs/plaene/aktiv/V92.md` und `docs/referenz/ai_architecture_context.md` fuehren fuer `GameRuntimeFacade`, `MatchFlowUiController`, `GameRuntimePorts` und `window.GAME_RUNTIME` jetzt dieselbe Zielpfad-Matrix (`Application-Use-Cases`, `Snapshot-/Port-Verbrauch`, `Diagnostics-only Globals`) als verbindliche Leitplanke; naechste offene V92-Subphase ist `92.2.1`.
Abgleich 2026-04-15 (Subphase `V92 92.2.1`): `src/application/session-runtime/SessionRuntimeCommandUseCases.js` fuehrt kleine Application-Services fuer `apply_settings`, `start_match`, `return_to_menu`, `host_lobby` und `join_lobby` ein. `src/application/session-runtime/SessionRuntimeCommandExecutor.js` delegiert diese fuenf Commands jetzt nur noch an denselben Use-Case-Schnitt und behaelt Observability, Normalisierung und Dispatch als schmale Verantwortung; neue parallele Command-Pfade wurden dabei nicht eingefuehrt. Naechste offene V92-Subphase ist `92.2.2` (Observability-, Result- und Failure-Vertraege auf denselben Use-Case-Schnitt heben).
Abgleich 2026-04-15 (Subphase `V92 92.2.2`): `src/application/session-runtime/SessionRuntimeCommandUseCases.js` traegt jetzt fuer den Runtime-Command-Katalog die gemeinsame Execution-Huelle fuer `received`/`completed`/`failed`-Observability, Settled-Results und Failure-Vertraege. `src/application/session-runtime/SessionRuntimeCommandExecutor.js` ist dadurch auf Command-Normalisierung plus Use-Case-Auswahl reduziert; `executeSessionRuntimeCommandResult()` fuehrt keinen parallelen Pfad mehr neben dem Use-Case-Schnitt. `tests/runtime-regressions.contract.test.mjs` verankert denselben Vertrag fuer asynchrone Rejections und `invalid_command`; naechste offene V92-Subphase ist `92.3.1` (Legacy-Port-Fallbacks im migrierten Scope zurueckdruecken).
Abgleich 2026-04-15 (Subphase `V92 92.3.1`): `src/shared/runtime/GameRuntimePorts.js` liest migrierte Runtime-Intents und Lifecycle-Pfade jetzt nur noch ueber Bundle-Handles (`runtimeCoordinator`, `runtimeFacade`) und nicht mehr produktiv ueber `game.runtimeCoordinator`/`game.runtimeFacade`. Fuer den noch nicht migrierten Arcade-/Recording-Scope bleiben explizit benannte Transition-Adapter erhalten (`getRuntimeFeatureTransitionCoordinator()` / `getRuntimeFeatureTransitionFacade()`), sodass die Restnische klar begrenzt ist. Der Session-Snapshot nutzt denselben Ownership-Schnitt ueber `RuntimeSessionContract`, `game.session` und den Bundle-State statt Legacy-Facade-Reads; `tests/runtime-regressions.contract.test.mjs` ratcheted den Sunset mit Negativtests fuer alte Fallbacks. Naechste offene V92-Subphase ist `92.3.2` (globale Runtime-Publishes auf Diagnostics-only zurueckschneiden).
Abgleich 2026-04-15 (Subphase `V92 92.3.2`): Recheck der zuletzt bearbeiteten Subphase `92.3.1` zeigte keine neue Legacy-Fallback-Luecke im migrierten `runtimeIntentPort`-/`lifecyclePort`-Scope; der offene Rest war der produktive Global-Read im Arcade-Menue. `src/core/GameRuntimeFacade.js` kapselt Arcade-/Toast-/Store-Zugriffe fuer das Menue jetzt in einem expliziten `runtimeAccess`-Schnitt, den `src/ui/MenuController.js` in den Binding-Context durchreicht. `src/ui/arcade/ArcadeMenuSurface.js` liest Runtime-State, Replay-Fallback und Store damit nicht mehr produktiv aus `window.GAME_INSTANCE`/`window.GAME_RUNTIME`. `tests/runtime-regressions.contract.test.mjs` fuehrt den Ratchet gegen direkte produktive `GAME_INSTANCE`-/`GAME_RUNTIME`-Reads; naechste offene V92-Subphase ist `92.4.1`.
Abgleich 2026-04-15 (Subphase `V92 92.4.1`): `src/ui/MatchFlowUiController.js` bleibt die stabile UI-Fassade, delegiert Round-/Menu-Lifecycle aber jetzt an `src/ui/MatchFlowLifecycleController.js`, Arcade-/Message-Overlay-Rendering an `src/ui/MatchFlowArcadeOverlayController.js` und Hunt-/Round-End-Telemetrie an `src/ui/MatchFlowTelemetryController.js`. Damit wachsen Return-to-Menu-, Round-End-, Intermission-/Post-Run-Overlay- und Feedback-Pfade nicht weiter in derselben Sammelklasse; `tests/runtime-regressions.contract.test.mjs` spiegelt den Split mit kleinen Contract-Checks fuer Lifecycle-Port-Delegation und den extrahierten Hunt-Feedback-Seam. `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen; `npm run build` bleibt in dieser Session an `check:eslint:touched-strict` fuer die bereits erweiterte `src/core/GameRuntimeFacade.js` blockiert (`docs/Fehlerberichte/2026-04-15_v92-92.4.1-build-touched-strict-gameruntimefacade.md`). Naechste offene V92-Subphase ist `92.4.2`.
Abgleich 2026-04-15 (Subphase `V92 92.4.2`): Recheck der zuletzt bearbeiteten Subphase `92.4.1` zeigte eine Guard-Luecke (`ui -> state`) in `src/ui/MatchFlowLifecycleController.js`; Round-End- und Transition-Strategien werden dort jetzt injiziert ueber `src/ui/MatchFlowUiController.js` statt direkter State-Imports. `src/core/GameRuntimeFacade.js` reduziert Arcade- und Recording-Pfade im migrierten Scope auf schmale Composition-/Forwarding-Seams. `src/core/runtime/GameRuntimeArcadeSupport.js` uebernimmt Arcade-Run-State, Round-Controller-Aktivierung, Sudden-Death-/Replay-/Reward-Pfade sowie Round-/Match-End-Telemetrie; `src/core/runtime/GameRuntimeRecordingSupport.js` kapselt mit `createGameRuntimeRecordingFacadeSupport()` Cinematic-Recording, Recorder-Dump, Metrics und Ghost-Clip-Zugriff fuer die Fassade. `tests/runtime-regressions.contract.test.mjs` spiegelt Match-End-, Arcade- und Recording-Delegation; `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen. Naechste offene V92-Subphase ist `92.5.1`.
Abgleich 2026-04-15 (Subphase `V92 92.5.1`): `scripts/architecture/legacy-surface-guard-matrix.json` fuehrt `window.GAME_INSTANCE` jetzt als eigene Diagnostics-only-Legacy-Surface und ratcheted `GameRuntimePorts-fallbacks` ueber explizite Helfer (`getLegacyRuntime*`, `getRuntimeFeatureTransition*`, `allowLegacyFallback=true`) statt ueber den blossen Factory-Namen. `scripts/architecture/architecture-budget-ratchet.json` friert denselben Ist-Stand fuer `window.GAME_INSTANCE` (nur `src/core/AppInitializer.js`, `src/core/main.js`) und `GameRuntimePorts-fallbacks` (nur `src/shared/runtime/GameRuntimePorts.js`, dokumentierter Restcaller `src/ui/MatchFlowTransitionHotspots.js`) als Budget ein. `node scripts/check-architecture-boundaries.mjs`, `node scripts/check-architecture-ratchet.mjs` und `node scripts/check-architecture-metrics.mjs` sind gruen; naechste offene V92-Subphase ist `92.5.2`.
Abgleich 2026-04-15 (Subphase `V92 92.5.2`): `docs/referenz/ai_architecture_context.md` fuehrt mit Abschnitt `4.5.14` jetzt dieselbe Ratchet-Baseline fuer Folgeblocks: `window.GAME_INSTANCE` bleibt auf Bootstrap-Diagnostics begrenzt und `GameRuntimePorts`-Fallback-Helfer bleiben auf `src/shared/runtime/GameRuntimePorts.js` plus den dokumentierten Restcaller `src/ui/MatchFlowTransitionHotspots.js` beschraenkt. `.agents/test_mapping.md` spiegelt das als konkrete `architecture-guard`-Budgetregel und neue Pfad-zu-Guard-Kommandos fuer `src/shared/runtime/GameRuntimePorts.js`, `src/core/AppInitializer.js`, `src/core/main.js` und `src/ui/MatchFlowTransitionHotspots.js`. `docs/plaene/aktiv/V64.md`, `docs/plaene/aktiv/V81.md`, `docs/plaene/aktiv/V82.md` und `docs/plaene/aktiv/V86.md` konsumieren denselben Ownership-/Sunset-Stand jetzt explizit in DoD- oder Leitplankenform, sodass Folgearbeit keine neuen Runtime-Globals oder direkten Fallback-Helfer aufzieht. Naechste offene V92-Subphase ist `92.99.1`.
Abgleich 2026-04-15 (Subphase `V92 92.99.1`): Das Abschluss-Gate ist fuer den migrierten Scope gruensicher. `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:ratchet`, `npm run typecheck:architecture`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` liefen alle erfolgreich; `docs:sync` meldet `updated=0`, die Scorecard haelt `window.GAME_INSTANCE` und `GameRuntimePorts-fallbacks` jeweils bei 2 erlaubten Dateien und der Ratchet bleibt ohne Budget-Ausweitung. Naechste offene V92-Subphase ist `92.99.2`.
Abgleich 2026-04-15 (Subphase `V92 92.99.2`): Der Hotspot-Recheck bestaetigt den blockerfesten Abschluss des migrierten V92-Scope. `src/application/session-runtime/SessionRuntimeCommandExecutor.js` delegiert Runtime-Commands weiterhin nur an `createSessionRuntimeCommandUseCases()`, `src/ui/MatchFlowUiController.js` haelt Lifecycle-, Overlay- und Telemetrie-Verantwortung nur noch als Delegation auf spezialisierte Controller, und `src/ui/arcade/ArcadeMenuSurface.js` liest Runtime-Zustand ausschliesslich ueber den injizierten `runtimeAccess`-Schnitt statt ueber `window.GAME_INSTANCE` oder `window.GAME_RUNTIME`. Verbleibende Restadapter sind jetzt klar benannt und eng begrenzt: `src/shared/runtime/GameRuntimePorts.js` behaelt nur die expliziten Transition-Helfer `getRuntimeFeatureTransitionCoordinator()` / `getRuntimeFeatureTransitionFacade()` fuer Arcade-/Recording-Uebergang, `src/ui/MatchFlowTransitionHotspots.js` bleibt die zentrale Legacy-Nische fuer diese Transition-Helfer, und `src/core/AppInitializer.js` plus `src/core/main.js` halten `window.GAME_INSTANCE`/`window.GAME_RUNTIME` nur noch als Publish-/Cleanup-Diagnostics. `docs/plaene/aktiv/V64.md`, `docs/plaene/aktiv/V81.md`, `docs/plaene/aktiv/V82.md` und `docs/plaene/aktiv/V86.md` spiegeln dieselbe V91-/V92-Ratchet-Leitplanke; die naechste offene Subphase im aktiven Master ist `64.1.1`.
Abgleich 2026-04-15 (Subphase `V64 64.4.3`): `electron/main.cjs` fuehrt mit `createDesktopWindowShellCapability()` und `createLanHostShellCapability()` zwei kleine explizite Shell-Capabilities ein, sodass Fensterstart, Fokus-/Dialog-Zugriff und Discovery-Publish nicht mehr implizit am LAN-Host-Lifecycle haengen. `startDesktopShell()` und `second-instance` lesen nur noch die Window-Capability; `get-lan-server-status`, `start-lan-server` und `stop-lan-server` delegieren weiter ueber die dedizierte Host-Capability und behalten damit den bestehenden Preload-/IPC-Vertrag bei. `node --check electron/main.cjs`, `npm run build` und `npm run gates:pre-commit` sind gruen; naechste offene V64-Subphase ist `64.5.1` (Desktop-Endpoint-, TURN- und Packaging-Konfiguration).
Abgleich 2026-04-14 (Subphase `V71 71.99.3`): `git ls-files -ci --exclude-standard` zeigt 683 getrackte Ignore-Pfade (`tmp=641`, `assets=37`, `.codex_tmp=5`), davon 604 unter `tmp/repro-e548108-20260307153043/**`. Der Scope ist jetzt als bewusste Evidence klassifiziert (`tmp/repro-*` Root-History, `tmp/*` Diagnose, `.codex_tmp/*` Backups, `assets/models/jets/cc0/spaceship_pack/dist/*` Asset-Quellen); Loeschzwang bleibt ausserhalb dieser Subphase.
Abgleich 2026-04-14 (Subphase `V71 71.99.1` + `71.99.2`): `npm run check:root:runtime`, `npm run cleanup:workspace` und `npm run check:editor:path-drift` sind gruen; `npm run build` scheitert reproduzierbar umgebungsnah mit `Error: spawn EPERM` (blockerfest in `docs/Fehlerberichte/2026-03-30_workspace-cleanup-verification-blockers.md` und `docs/Fehlerberichte/2026-04-14_v91-build-vite-spawn-eperm.md`). Die Closure-Gates `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind gruen; `V71 71.99` ist damit blockerfest abgeschlossen.
Abgleich 2026-04-18 (Subphase `V82 82.5`): `src/entities/systems/ParcoursProgressUtils.js` leitet Parcours-Routen jetzt aus expliziten `nextIds`-Kanten ab statt nur aus linearer Alias-Reihenfolge; Branch-Paare bekommen denselben Stage-Index, muessen fuer `validMerge=true` auf denselben Merge-Checkpoint zeigen und erscheinen im Snapshot mit `branches`, `isBranchOption`, `branchParentId` und `mergeCheckpointId`. `src/entities/mapSchema/MapSchemaSanitizeOps.js` und `src/entities/mapSchema/MapSchemaRuntimeOps.js` tragen `nextIds` fuer Editor-/Runtime-Roundtrips mit. `src/core/config/maps/presets/parcours_maps.js` erweitert `parcours_rift` um den Branch `CP04 -> {CP04A_TUNNEL, CP04B_BOOST} -> CP05`; der Smoke `node --input-type=module -` bestaetigt dafuer `totalCheckpoints=9`, `branchStageEntries=CP04A_TUNNEL|CP04B_BOOST` und `mergeCheckpointId=CP05`. `src/entities/arena/CheckpointRingMeshFactory.js` plus `src/entities/arena/portal/PortalLayoutBuilder.js` markieren Branch-Ringe zusaetzlich in Cyan. `npm run gates:pre-commit` ist gruen. `npm run build` bleibt in diesem Workspace ausserhalb des V82-Scope an einer bereits offenen Legacy-Surface-Violation in `src/core/settings/SettingsDefaultsFacade.js` blockiert; der naechste offene V82-Abschnitt ist `82.6` (Checkpoint-Zustandsfarben und Ring-Animation).

## Stand-Snapshot 2026-04-24 (Deep-Code-Analyse Integration)

- Deep-Code-Analyse-Befunde wurden als neue Follow-up-Punkte `P41` bis `P46` in `docs/Umsetzungsplan.md` verankert (Traversal-Hardening, XSS-Renderpfade ausserhalb Discovery, sync-I/O-Blocker, LAN-Body-Limits, Hotspot-Komplexitaet, Tooling-Abdeckung).
- Neuer Intake-Entwurf `docs/plaene/alt/superseded-intakes-2026-05/Feature_Security_Runtime_Contract_Hardening_V102.md` ist als uebernahmefaehiger Vorschlag fuer einen dedizierten Hardening-Block angelegt.
- Priorisierte Intake-Reihenfolge im Master wurde entsprechend erweitert: `V99 -> V100 -> V102`.

## Stand-Snapshot 2026-04-20 (Intake V98)

- Neuer geplanter Block `V98` ist im Master-Index aufgenommen (`docs/Umsetzungsplan.md`) und verweist kanonisch auf `docs/plaene/aktiv/V98.md`.
- Fokus von `V98`: Desktop-only Settings-Studio-Editor fuer Browser-Demo-Grenzen mit monotone(m) Merge (`nur einschnuerend`) und explizitem Browser-Read-Only-Auslieferungspfad.
- Die hard dependencies `V77.99` und `V97.99` sind als erfuellt markiert; soft dependencies `V81.99` und `V64.99` sind dokumentiert.

## Stand-Snapshot 2026-04-20 (Plan-Konsistenzfix)

- Master-Index synchronisiert: `V72`-Abhaengigkeitszeile auf `erfuellt=ja` gesetzt; `V76`-Aktivlock ueber `docs/lock-status/build-agent.json` und `_locks-registry.json` wieder konsistent mit dem aktiven Master-Status hergestellt.
- Priorisierungsabschnitte (`Sofort laufende...`, `Parallelpfad...`, `Kurzform`) auf den aktuellen offenen Block-Stand aktualisiert: `V76`, `V98`, `V75`, `V81`, `V94`.
- Kanonische Blockdateien bereinigt: in abgeschlossenen Bloecken `V64`, `V72`, `V77`, `V82`, `V86`, `V91`, `V92`, `V97` wurden DoD-Checkboxen auf `[x]` mit Evidence-Format angeglichen; `V64`-Frontmatter auf `status: done` aktualisiert.

## Stand-Snapshot 2026-04-21 (Subphase `V98 98.2`)

- `src/shared/contracts/PlatformCapabilityRegistry.js` fuehrt Browser-Demo-Override-Merge zentral im Resolver ein: `resolveSurfacePolicy()`, `resolveSurfaceCapabilityAccess()` und `resolvePlatformEnvironment()` lesen fuer `browser-demo` denselben gemergten Policy-Stand statt statischer Basisdaten.
- Consumer bleiben unveraendert auf den Resolverpfaden: `PlatformSurfacePolicyOps` nutzt ohne Sonderzweig denselben gemergten Zustand fuer Mode-Gates und Multiplayer-Join/Host-Guardrails.
- Strukturierte Diagnostics sind jetzt resolverweit verfuegbar (`applied`, `skipped`, `fallback`, `reject` + `reasonCode`, `migrationCode`, `errorCodes`, `warningCodes`) und decken fehlende Quellen, invaliden Draft, Future-Version-Fallback und Validation-Reject sauber ab.
- `tests/platform-capabilities.contract.test.mjs` erweitert den Contract-Scope um `V98 98.2.1` bis `98.2.3` (Resolver-Merge, Consumer-Konsistenz, Diagnostics-/Capability-Flag-Narrowing).
- Naechste offene V98-Subphase ist `98.3` (Settings-Studio-Sektion "Browser-Demo-Grenzen").

## Stand-Snapshot 2026-04-22 (Deep-Audit Architektur + Runtime)

- Architektur-Grenzen bleiben formal eingehalten (`check:architecture:boundaries` gruen, keine neuen disallowed edges), aber mehrere Legacy-Budgets laufen am aktuellen Ratchet-Limit.
- Neue Audit-Hotspots wurden als umsetzbare Backlog-Eintraege `P32` bis `P40` in `docs/Umsetzungsplan.md` aufgenommen (LAN-Kapazitaet/Endpoint-Rollen, Polling-Backlog, UI-Injection-Pfad, Sync-IPC, Contract-Hotspots, Typecheck-Rotstand).
- Der bestehende Intake-Entwurf `docs/plaene/alt/superseded-intakes-2026-05/Feature_Desktop_Multiplayer_Signaling_Connectivity_Hardening_V99.md` wurde auf LAN-Hardening erweitert (Kapazitaets- und Rollen-Guards, Polling-Timeout/Inflight-Guards, sichere Discovery-UI-Renderpfade).
- Neuer Intake-Entwurf `docs/plaene/alt/superseded-intakes-2026-05/Feature_Architecture_TypeSafety_Contract_Hardening_V101.md` fuehrt den Type-Safety-/Lint-Hardening-Scope fuer den roten Architektur-Typecheck und die uebergrossen Contract-Dateien.

## Stand-Snapshot 2026-04-24 (Abschluss `V101 101.99`)

- `V101` ist als kanonischer aktiver Block unter `docs/plaene/aktiv/V101.md` uebernommen und mit `101.99` abgeschlossen.
- Architektur-Hardening-Gates sind gruen: `npm run typecheck:architecture`, `npm run lint:architecture`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics`.
- Plan-/Docs-Gates sind gruen: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.
- Der offene P-Backlog im Master wurde auf den Restscope nach `V101` reduziert; `P39` und `P40` gelten als geschlossen.

## Stand-Snapshot 2026-04-26 (Plan-Konsistenz und Encoding-Bereinigung)

- `V76` ist dokumentarisch auf den realen Stand nachgezogen: `76.3` bis `76.7` stehen jetzt konsistent auf `status: done`, `76.99.1` ist mit gruener Build-/Plan-/Docs-Evidence abgeschlossen und der alte externe Build-Blockertext wurde entfernt. Offener Rest im Block ist nur noch `76.99.2`.
- `V103` bleibt validator-konform als geplanter Block im Master gespiegelt; der dokumentierte Fortschritt bis `103.3` ist im Blockfile sichtbar, ohne den Lock-/Master-Status vorzeitig auf aktiv zu ziehen.
- Der Master-Index bundelt den offenen P-Backlog jetzt zusaetzlich nach Zielbloecken (`V90`, `V99`, `V102`) und macht damit die naechste Uebernahme-Reihenfolge schneller lesbar, ohne die Detailtabelle zu ersetzen.
- Mojibake in `V72`, `V82` und `V91` wurde auf ASCII-normalisierte Plantexte bereinigt; `docs:sync`/`docs:check` laufen danach ohne Encoding-Warnungen.

## Stand-Snapshot 2026-04-26 (Subphasen `V103 103.2` und `103.3`)

- `src/ui/SettingsStore.js` nutzt jetzt belastbar eine gemeinsame kanonische Persistenzpipeline fuer `loadSettings()` und `saveSettings()`; `tests/settings-manager.contract.test.mjs` spiegelt Load-/Save-Symmetrie und den schmalen Record-Port fuer Runtime-Consumer.
- `src/core/SettingsManager.js` fuehrt mit `getSettingsRecordStorePort()` einen schmalen JSON-Record-Port ein; `src/core/GameRuntimeFacade.js` reicht fuer die Arcade-Surface keinen direkten `settingsManager.store`-Reach-through mehr weiter.
- `src/core/runtime/MenuRuntimeDeveloperModeService.js`, `MenuRuntimePresetConfigService.js` und `MenuRuntimeSessionService.js` lesen `changedKeys` jetzt zentral ueber kleine Resolver und nutzen Result-`reason`-Codes fuer gezieltere Runtime-Fehlermeldungen.
- Naechste offene V103-Subphase ist `103.4.1`.

## Stand-Snapshot 2026-04-26 (Subphase `V103 103.4`)

- Im Core-Settings-Scope (`src/core/settings/*.js`, `src/core/SettingsManager.js`) gibt es keine direkten `document`-/DOM-Zugriffe mehr; UI-seitige Theme-Anwendung bleibt bewusst in `src/ui/menu/MenuDeveloperModeOps.js`.
- `src/ui/KeybindEditorController.js` konsumiert Keybind-Deskriptoren bereits ueber `src/ui/KeybindActionCatalog.js`, waehrend `src/core/SettingsManager.js` keine Keybind-Action-Listen mehr traegt.
- Naechste offene V103-Subphase ist `103.5.1`.

## Stand-Snapshot 2026-04-26 (Subphase `V103 103.5`)

- `tests/settings-manager.contract.test.mjs` deckt jetzt neben Persistenzsymmetrie auch den schmalen Record-Port, strukturierte Mutationsresultate und Ownership-/Failure-Reasons fuer Developer-, Preset-, Session- und Text-Override-Pfade ab.
- `docs/referenz/ai_architecture_context.md` Abschnitt `4.6.6.2` enthaelt den kompakten Erweiterungspfad fuer neue Settings-Funktionen inklusive Domain-Ort, `changedKeys`-Vertrag, Store-Port-Regel, DOM-Freiheit und Testzielpfaden.
- Naechste offene V103-Subphase ist `103.99.1`.

## Stand-Snapshot 2026-04-26 (Abschluss `V103 103.99`)

- `node --test tests/settings-manager.contract.test.mjs` ist mit 5/5 PASS gruen; `node --test tests/runtime-settings-live-apply.contract.test.mjs` bestaetigt den angrenzenden Live-Apply-/Runtime-Pfad mit 8/8 PASS.
- `npm run gates:pre-commit` ist nach dem finalen Planabgleich gruen (`plan:check`, `docs:sync`, `docs:check`).
- Im geaenderten V103-Scope gibt es keine neuen produktiven `settingsManager.store`-Reads und keine neuen Core-zu-DOM-Seiteneffekte; die verbliebenen Arcade-Legacy-Reads liegen ausserhalb des Blocks.
- `V103` ist damit abgeschlossen; der naechste freie geplante Produktblock im Master ist `V75`, waehrend `V76 76.99.2` weiter gelockt bleibt.

## Stand-Snapshot 2026-04-27 (Subphasen `V75 75.6` und `75.7`)

- `src/core/recording/engines/NativeMediaRecorderEngine.js` haertet Stop-Finalisierung jetzt mit einem expliziten Timeout (`stopTimeoutMs`) ab; bei ausbleibendem `stop`-Event wird eine partielle Blob-Resolution statt haengender Promise geliefert.
- `electron/recording-video-export-job.cjs` fuehrt fuer native Exportprozesse einen robusteren Timeout-Pfad ein: Child-Prozess-Terminierung (`terminateChildProcess`) plus Force-Resolve verhindern haengende Exportjobs und reduzieren Orphan-Risiken.
- `src/core/MediaRecorderSystem.js` bindet `match_ended`/`menu_opened` jetzt ueber `settleRecording(event)` an denselben Lifecycle-Settlement-Vertrag statt separatem Stop-Sonderpfad.
- `tests/recording-video-export-job.contract.test.mjs` deckt jetzt den nativen MP4-Erfolgsfall sowie den degradierten Master-Fallback (`RECORDING_SAVE_OK_MASTER_FALLBACK`) in einem reproduzierbaren Modul-Smoke ab.
- `tests/media-recorder-engine.contract.test.mjs` und `tests/media-recorder-lifecycle.contract.test.mjs` verankern Stop-Timeout- und Lifecycle-Settlement-Vertraege; `package.json` bindet diese Recorder-Contract-Tests in `test:contract` ein.
- Naechste offene V75-Subphase ist `75.99.1`.

## Stand-Snapshot 2026-04-27 (Abschluss `V75 75.99`)

- `npm run build:app` ist gruensicher; die Recorder-relevanten Contract-/Regressionstests (`runtime-regressions`, `recording-video-export*`, `media-recorder-*`) laufen mit 34/34 PASS.
- `npm run gates:pre-commit` ist nach dem V75-Abschlussstand erneut gruen (`plan:check`, `docs:sync`, `docs:check` inkl. Abschluss-Recheck).
- `tests/recording-video-export-job.contract.test.mjs` validiert den nativen MP4-Erfolgsfall sowie den degradierten Master-Fallback auf derselben Job-API (`RECORDING_SAVE_OK` vs `RECORDING_SAVE_OK_MASTER_FALLBACK`).
- `V75` ist damit abgeschlossen; im freien Master ist der naechste geplante Produktblock `V81`, waehrend `V76 76.99.2` weiter im aktiven Lock laeuft.

## Stand-Snapshot 2026-04-27 (Subphase `V81 81.1`)

- `src/dev/tuning/TuningParameterRegistry.js` wurde als deklarativer Einstieg fuer Developer-Tuning eingefuehrt: Section-Mapping fuer Player/Trail/Arena/Gameplay/Powerup/Hunt/Projectile/Portal/Homing/Camera/Render/Farben/Bot sowie PPO_V2-Readonly-Ratchet.
- `src/dev/tuning/TuningRuntimeBridge.js` kapselt jetzt `getValue`, `setValue`, `getAllValues` und `resetToDefaults`; Writes clonieren eingefrorene Branches defensiv und triggern danach den Runtime-Config-Refresh.
- `src/core/runtime/ActiveRuntimeConfigStore.js` exportiert zusaetzlich `refreshActiveRuntimeConfig()` als expliziten Hook fuer Dev-Tuning-Mutationen.
- `tests/tuning-runtime-bridge.contract.test.mjs` verankert Registry-Exposure, Runtime-Bridge-Mutation mit Refresh sowie PPO_V2-Readonly-Verhalten; `package.json` bindet den Test in `test:contract` ein.
- Naechste offene V81-Subphase ist `81.2.1`.

## Stand-Snapshot 2026-04-27 (Subphasen `V81 81.2` bis `81.4`)

- Electron-Tuning-Shell ist Ende-zu-Ende verdrahtet: `electron/tuning-window.cjs`, `electron/tuning-ipc.cjs` und `electron/tuning-preload.cjs` bilden BrowserWindow-Lifecycle, Runtime-Forwarding (`tuning:get-all|set-value|reset-all|get-registry`) und Update-Push (`tuning:update`) ab; `electron/main.cjs` registriert F7-Hotkey, Capability-Check und Cleanup.
- `electron/preload.cjs` verarbeitet `tuning-runtime:request` jetzt direkt im Game-Renderer: Registry und Runtime-Bridge werden lazy aus `src/dev/tuning/*` geladen, Actions werden ohne neue Runtime-Global-Slots bedient.
- Console-UI steht in `electron/tuning-console/*`: Tab-/Such-Workflow, typed Controls (number/boolean/color/select/text), Changed-Highlighting, Parameter-Reset und BOT-Profilfilter (EASY/NORMAL/HARD, PPO_V2 readonly).
- Preset-System ist aktiv: `src/dev/tuning/TuningPresetManager.js` speichert Delta-only Presets in localStorage; `electron/tuning-console/tuning-preset-ui.js` steuert Save/Load/Export/Import/Reset inkl. Changed-Counter; JSON Export/Import laeuft ueber Electron-Dialog-IPC.
- Neue Contract-Abdeckung: `tests/tuning-ipc.contract.test.mjs`, `tests/tuning-window.contract.test.mjs`, `tests/tuning-preset-manager.contract.test.mjs`; `package.json` (`test:contract`) bindet sie in den Standardlauf ein. Fokussierter Lauf `node --test ... tuning-*` ist 12/12 PASS.
- Gate-Stand: `npm run guard:main`, `npm run plan:check`, `npm run docs:check` und `npm run gates:pre-commit` sind gruen. `npm run build` bleibt in dieser Session an einem bestehenden touched-strict-Blocker ausserhalb des V81-Scope haengen (`src/core/MediaRecorderSystem.js` Baseline-Delta).
- Naechste offene V81-Subphase ist `81.99.1`.

## Stand-Snapshot 2026-04-27 (Subphasen `V81 81.99.1` und `81.99.3`)

- Abschluss-Smoke fuer V81 laeuft gruen: `node --test tests/tuning-runtime-bridge.contract.test.mjs tests/tuning-ipc.contract.test.mjs tests/tuning-window.contract.test.mjs tests/tuning-preset-manager.contract.test.mjs` ist mit 14/14 PASS durch, inklusive F7-Hotkey-Vertrag, Frozen-Hunt-Write und Preset-Roundtrip.
- `docs/referenz/developer_tuning_console.md` steht als kompakte Erweiterungsreferenz (Registry-Eintrag, Control-Typen, Preset-Vertrag) und deckt `81.99.3` ab.
- `81.99.2` bleibt offen: `npm run build` scheitert weiterhin ausserhalb des V81-Scope an `check:eslint:touched-strict` in `src/core/MediaRecorderSystem.js`; Blockerdoku liegt in `docs/Fehlerberichte/2026-04-27_v81-81.99.2-build-touched-strict-mediarecorder.md`.
- Naechste offene V81-Subphase ist `81.99.2`.

## Stand-Snapshot 2026-04-27 (Subphasen `V94 94.1` bis `94.3`)

- `94.1` ist abgeschlossen: Frontmatter-/depends_on-/scope-Inventar mit offenen Blocken (`V76`, `V81`, `V94`) und null aktuellen Scope-Ueberlappungen ist in `docs/plaene/aktiv/V94.md` dokumentiert; `docs/generated/knowledge-graph.schema.json` fuehrt `schema_version: 1` plus explizite Versionierungs-/Migrationsregeln.
- `94.2` ist umgesetzt: `scripts/build-knowledge-graph.mjs` baut deterministisch `docs/generated/knowledge-graph.json` (aktuell `nodes=871`, `edges=1051`) aus Master-Index, aktiven Blockplaenen und Guard-Matrix; Parser-Fixtures liegen in `tests/knowledge-graph-build.contract.test.mjs`; Query-CLI `scripts/query-knowledge-graph.mjs` liefert `open-deps`, `scope-collisions`, `surfaces-for-file`.
- `94.3` ist als Validator implementiert: `scripts/check-knowledge-graph.mjs` prueft Byte-Diff, Dead-Edges, hard-dep-Zyklen, Scope-Kollisionen, Pflichtdaten, Duplicate-/Orphan-Nodes und Dependency-Merge-Konsistenz.
- Aktueller Lint-Stand aus `graph:check`: mehrere Dependency-Metadatenzeilen im Master haben keine Basis-Depends-Kante (`V95::V81`, `V97::V64`, `V98::V81`, `V103::V98` etc.); dieser Datenabgleich bleibt fuer `94.4`/`94.99` offen.
- Naechste offene V94-Subphase ist `94.4.1`.

## Stand-Snapshot 2026-04-27 (Subphase `V94 94.4`)

- `package.json` fuehrt jetzt die Graph-Toolchain-Scripts `graph:build`, `graph:check` und `graph:query`; `scripts/gates-pre-commit.mjs` fuehrt die Meta-Gate-Reihenfolge auf `plan:check -> graph:check -> docs:sync -> docs:check`.
- `.agents/rules/token_efficiency_and_tools.md` verankert den Graph-First-Leseweg fuer Abhaengigkeits-/Scope-/Surface-Fragen inklusive Query-Shortcuts fuer `open-deps`, `scope-collisions` und `surfaces-for-file`.
- `.agents/workflows/status.md`, `.agents/workflows/code.md` und `.agents/workflows/plan.md` lesen den Graphen jetzt als bevorzugte Query-Schicht vor Volltext-Lesewegen und spiegeln die neue Gate-Sequenz.
- `docs/referenz/ai_architecture_context.md` dokumentiert den Graphen explizit als sekundaere Query-Schicht unter dem bestehenden Master-Index-Leseweg.
- Naechste offene V94-Subphase ist `94.99.1`.

## Stand-Snapshot 2026-04-27 (Subphase `V94 94.99.1`)

- Abschluss-Gates fuer den Graph-Block laufen gruensicher: `npm run graph:build`, `npm run graph:check`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run gates:pre-commit` (inkl. neuem `graph:check`-Schritt) liefern Exit-Code 0.
- `graph:check` ist fuer den aktiven Scope blockerfrei; die verbleibenden Abschlussarbeiten liegen in `94.99.2` (Token-Messtrace) und `94.99.3` (sekundaerer Leseweg in V64/V81/V82/V86/V92).
- Naechste offene V94-Subphase ist `94.99.2`.

## Stand-Snapshot 2026-04-27 (V81 Architektur-Ratchet-Nachzug)

- `src/dev/tuning/TuningRuntimeBridge.js` liest `ActiveRuntimeConfigStore` nicht mehr direkt; Runtime-Refresh laeuft jetzt ueber den expliziten Config-Adapter `refreshConfigRuntimeCache()` aus `src/core/Config.js`.
- Architektur-Gates sind damit wieder gruensicher: `npm run check:architecture:boundaries` und `npm run check:architecture:ratchet` passieren ohne neue Legacy-Surface- oder Budget-Verletzung.

## Stand-Snapshot 2026-04-27 (Subphasen `V81 81.99.1` bis `81.99.3`)

- `tests/tuning-runtime-bridge.contract.test.mjs` und `tests/tuning-window.contract.test.mjs` wurden fuer das Abschlussfenster erweitert: expliziter Frozen-Branch-Write (`HUNT.MG.DAMAGE`) und F7-Hotkey-Vertragsanker in `electron/main.cjs` sind jetzt mitabgedeckt.
- Fokussierter Abschluss-Smoke `node --test tests/tuning-runtime-bridge.contract.test.mjs tests/tuning-ipc.contract.test.mjs tests/tuning-window.contract.test.mjs tests/tuning-preset-manager.contract.test.mjs` ist mit 14/14 PASS gruen; damit sind `81.99.1` (Smoke) und `81.99.3` (Entwickler-Referenz) abgeschlossen.
- `npm run plan:check` und `npm run docs:check` sind gruen; `npm run build` bleibt fuer `81.99.2` am ausserhalb von V81 liegenden touched-strict-Verstoss in `src/core/MediaRecorderSystem.js` blockiert. Blockerdoku: `docs/Fehlerberichte/2026-04-27_v81-81.99.2-build-touched-strict-mediarecorder.md`.
- Naechste offene V81-Subphase ist `81.99.2`.

## Stand-Snapshot 2026-04-27 (Abschluss `V94 94.99`)

- `V94` ist abgeschlossen: `94.99.2` dokumentiert den Messtrace fuer die drei Referenz-Queries mit deutlichem Zeilengewinn des Graph-Lesewegs (`Q1`: 30 vs 308, `Q2`: 4 vs 580, `Q3`: 5 vs 315).
- `94.99.3` ist abgeschlossen: `docs/plaene/aktiv/V64.md`, `V81.md`, `V82.md`, `V86.md` und `V92.md` enthalten jetzt den Abschnitt `Sekundaerer Leseweg (V94)`; es waren keine neuen `scope_overlap_allowed_with`-Freigaben noetig.
- Meta-Gates bleiben gruensicher mit Graph-Pruefung in der Kette (`plan:check -> graph:check -> docs:sync -> docs:check`).
- Naechste offene Subphase im freien Master bleibt `V81 81.99.2` (Build-Blocker ausserhalb V81-Scope weiterhin dokumentiert), waehrend `V76 76.99.2` parallel im aktiven Lock laeuft.

## Stand-Snapshot 2026-04-27 (Abschluss `V81 81.99.2`)

- Der fruehere Build-Blocker in `src/core/MediaRecorderSystem.js` ist aufgeloest: die Export-Finalisierung liegt jetzt in `src/core/recording/MediaRecorderExportFinalizeOps.js`, wodurch `MediaRecorderSystem.js` wieder unter dem touched-strict-Limit bleibt.
- `npm run build` ist inklusive `architecture:guard` gruensicher; `check:eslint:touched-strict`, `check:architecture:boundaries` und `check:architecture:ratchet` laufen im selben Build-Pfad ohne neue Verstosse.
- `V81` ist damit vollstaendig abgeschlossen (`81.99` done). Der Fehlerbericht `docs/Fehlerberichte/2026-04-27_v81-81.99.2-build-touched-strict-mediarecorder.md` ist auf geloest aktualisiert.
- Naechste offene Subphase im aktiven Master ist `V76 76.99.2` (weiter im Lock), waehrend die naechste freie Intake-Reihenfolge bei `V99 -> V100 -> V102` liegt.

## Stand-Snapshot 2026-05-05 (Start `V100`, Subphasen `100.1` bis `100.3`)

- `V100` wurde aus `docs/plaene/alt/superseded-intakes-2026-05/Feature_Runtime_Rebuild_Remount_UI_StartSync_Stabilisierung_V100.md` als aktiver Block nach `docs/plaene/aktiv/V100.md` uebernommen und im Master auf `status: active` gespiegelt.
- `100.1` ist abgeschlossen: der Iststand zeigte Rebuild-Lecks bei Portal-/Gate-/Checkpoint-Visuals (Array-Reset ohne Registry-/Mesh-Dispose) sowie Remount ohne await auf vorherigem `dispose`.
- `100.2` ist abgeschlossen: `PortalLayoutBuilder` fuehrt vor jedem Rebuild einen kanonischen Visual-Reset aus; `PortalGateVisualRegistry` besitzt ein explizites `dispose()`, und `PortalGateSystem` resettet Portal-/Checkpoint-Runtime-Zwischenstaende vor dem Neuaufbau.
- `100.3` ist abgeschlossen: `AppInitializer` serialisiert Mounts ueber eine Queue und wartet den vorherigen `dispose`-Pfad (inkl. asynchronem Runtime-Finalize) vor neuem `createGame()` ab.
- Kleiner StartSync-Dedupe wurde mitgezogen: `UIManager.syncAll()` vermeidet den doppelten `syncStartSetupState`-Aufruf.
- `npm run plan:check` und `npm run check:architecture:boundaries` sind gruensicher; naechste offene V100-Subphase ist `100.4.1`.

## Stand-Snapshot 2026-04-27 (Abschluss `V76 76.99.2`)

- `V76` ist abgeschlossen (`76.99` done): `docs/plaene/aktiv/V76.md` steht jetzt auf `status: done`, `76.99` ist geschlossen und `76.99.2` dokumentiert den produktnahen Verifikationslauf.
- Neuer Hangar-Contract-Smoke `tests/hangar-desktop-flow.contract.test.mjs` verifiziert Fight-/Arcade-Entry, mode-spezifischen Selection-Writeback sowie den einheitlichen Lifecycle-Return zu Menue und Match-Start; zusammen mit `tests/arcade-hangar-rules.contract.test.mjs` laeuft der Scope mit 9/9 PASS.
- Abschluss-Gates sind gruen: `npm run build` sowie `npm run gates:pre-commit` (`plan:check`, `graph:check`, `docs:sync`, `docs:check`) liefern Exit-Code 0.
- Der Master-Index spiegelt `V76` jetzt unter den abgeschlossenen Bloecken; die naechste freie Intake-Reihenfolge bleibt `V99 -> V100 -> V102`.

## Stand-Snapshot 2026-04-29 (Subphase `V104 104.2.2`)

- `src/shared/runtime/GameRuntimePorts.js` nutzt fuer Runtime-Intent-Aufrufe keinen generischen `runtimeFacade`-Fallback mehr; fehlende Intents wurden in `src/core/runtime/GameRuntimeCoordinator.js` explizit nachgezogen (`restartRound`, `handleMenuPanelChanged`), sodass der Port-Adapter nur noch den Coordinator-Pfad als Fach-Entry konsumiert.
- `src/core/runtime/GameRuntimeBundle.js` hat die Legacy-Alias-Inventarliste sichtbar verkleinert: nicht mehr als Game-Alias benoetigte Menu-State-Felder (`menuController`, `menuMultiplayerBridge`, `_navButtons`, `_menuButtonByPanel`, `_activeSubmenu`, `_lastMenuTrigger`, `_buildInfoClipboardText`) sind aus `GAME_RUNTIME_LEGACY_ALIAS_SPECS` entfernt.
- Wissensgraph wurde fuer den neuen Sunset-Stand aktualisiert und validiert (`npm run graph:build`, `npm run graph:check`).
- Naechste offene V104-Subphase ist `104.3.1`.

## Stand-Snapshot 2026-05-04 (Start `V109`, Subphasen `109.1` bis `109.5`)

- `V109` wurde von `planned` auf `active` gesetzt; `109.1` bis `109.5` sind umgesetzt und im Block mit Evidence markiert.
- Rule-Entschlackung: Commit-Policy wurde auf fachliche Delivery-Slices umgestellt; Blocker-/Evidence-Regeln sind kompakter, ohne Dead-Code- oder Scope-Safety aufzuweichen.
- Workflow-Entschlackung: `code`, `bugfix` und `quick` fahren konditionale Gate-Strategie (`plan:check` default, `gates:pre-commit` nur bei `*.99` oder Docs-/Governance-/Graph-Scope) und erlauben kleine risikoadjustierte Vorab-Signale.
- Lock-Modell wurde vereinheitlicht: `docs/lock-status/*.json` ist der operative Wahrheitsraum; Lock-only Claim-/Release-Commits sind nicht mehr Default.
- `docs/Umsetzungsplan.md` wurde auf kompakten Index reduziert; offene Findings wurden nach `docs/prozess/Open_Findings.md` ausgelagert und von dort kanonisch referenziert.

## Stand-Snapshot 2026-05-04 (Abschluss `V109 109.99`)

- `V109` ist abgeschlossen (`status: done`, `109.99` geschlossen) und in den abgeschlossenen Referenzblock des Master-Index verschoben.
- `docs/Umsetzungsplan.md` bleibt als kompakter Steuerindex; offene Findings liegen kanonisch in `docs/prozess/Open_Findings.md`.
- Lock- und Workflow-Governance sind konsistent auf den operativen Wahrheitsraum `docs/lock-status/*.json` ausgerichtet.
- Abschluss-Gates sind gruen: `npm run gates:pre-commit` (inkl. `plan:check`, `graph:check`, `docs:sync`, `docs:check`).
- Naechste offene Subphase im Master ist `104.1`.

## Stand-Snapshot 2026-05-05 (Abschluss `V104 104.99`)

- `V104` ist abgeschlossen (`status: done`, `104.99` geschlossen); DoD, Phasenstatus und Abschluss-Gate sind im Blockfile konsistent nachgezogen.
- Der verbleibende Abschluss-Blocker wurde behoben: `npm run typecheck:architecture` ist wieder gruen (Fix in `src/shared/contracts/DesktopMultiplayerRoleContract.js` via kanonischem `normalizePlatformProductSurfaceId()`).
- Abschluss-Gates fuer `V104` sind gruensicher: `architecture:report`, `check:architecture:{boundaries,metrics,ratchet}`, `typecheck:architecture`, `graph:check`, `plan:check`, `docs:sync`, `docs:check` sowie die gezielten Contract-Checks (`104.5.1`, `V104.4.4`) laufen ohne Fehler.
- Der Master-Index fuehrt `V104` jetzt als done-Block mit `current_phase 104.99`; der Lock-Index ist auf `closed` aktualisiert.

## Stand-Snapshot 2026-05-05 (Plan-Update `V112` Test-Hardening)

- `V112` wurde um den dedizierten Test-Hardening-Slice `112.6` erweitert, um die im Test-Review sichtbar gewordenen Gate- und Harness-Risiken strukturiert abzuarbeiten.
- Der Scope deckt jetzt explizit `package.json`, `.agents/test_mapping.md`, `tests/helpers.js` sowie `core-targeted`-Testpfade ab.
- Neue DoD-Ergaenzungen sichern (1) vollstaendige `test:contract`-Abdeckung fuer `*.contract.test.mjs`, (2) UI-first-E2E-Verhalten ohne verdeckende Runtime-Mutationspfade im Standardpfad und (3) nachvollziehbare Reduktion bzw. Sunset-Dokumentation von `skip`-/Sleep-Hotspots.
- Naechste offene Subphase im Block bleibt `112.1`; `112.6` ist als geplanter Folge-Slice fuer die Testqualitaets-Haertung aufgenommen.

## Stand-Snapshot 2026-05-06 (Abschluss `V100 100.99`)

- Start `V107 107.1.1`: Wissensgraph-Block ist als aktiver Produktblock im Master/Lock-System aufgenommen (`docs/Umsetzungsplan.md`, `docs/lock-status/codex.json`).
- Neuer versionierter Mapping-Slice unter `data/contracts/knowledge-graph/`: `runtime-taxonomy.v1.json` fixiert Event-/State-Taxonomie fuer Spawn, Combat/Hit, Round-Ende und Settings; `desktop-critical-paths.v1.json` verknuepft dieselben Pfade mit Runtime- und Testknoten inkl. `SettingManager`-Pflichtreferenz.
- `scripts/build-knowledge-graph.mjs`, `scripts/check-knowledge-graph.mjs` und `docs/generated/knowledge-graph.schema.json` tragen jetzt die neuen Knotentypen (`runtime`, `event`, `state`, `test`) und Kernkanten (`implements`, `emits`, `consumes`, `reads_state`, `writes_state`, `validated_by`), sodass `graph:build`/`graph:check` dieselbe Mapping-Schicht deterministisch erzeugen und pruefen.
- `107.1.1` ist jetzt geschlossen: Der Graph kennt mit `config` einen versionierten Layer fuer `Config`, `RuntimeConfig`, Runtime-Session- und Settings-Vertraege; `reads_config` verbindet Spawn-, Combat- und `SettingsManager`-Pfade mit ihren echten Konfigurationsquellen statt nur mit Runtime-/State-Knoten.

- `V100` ist abgeschlossen: der Runtime-Dispose-Pfad entfernt den alten `MenuController` jetzt deterministisch vor Reinit, und der Start-Setup-Sync priorisiert den autoritativen `settings.mapKey` vor der persistierten Hangar-Auswahl, sodass Custom-Map-Rebuilds mit gleichem Key keinen Standard-Layout-Drift mehr verursachen.
- Relevante Runtime-Gates sind gruen: `node --test tests/runtime-regressions.contract.test.mjs` (31/31 PASS), `node dev/scripts/verify-lock.mjs --playwright -- node scripts/run-playwright-targeted.mjs tests/core-targeted-runtime.spec.js --grep "T20ae:" --timeout=240000` (`test-results/v100-runtime-dispose`) und `node dev/scripts/verify-lock.mjs --playwright -- node scripts/run-playwright-targeted.mjs tests/core-targeted-runtime.spec.js --grep "T10e:|T10f:" --timeout=240000` (`test-results/v100-runtime-t10ef`).
- Abschluss-Gates sind gruen: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, `npm run graph:build`, `npm run gates:pre-commit` und `npm run lock:validate`.
- Die V92-Ratchets bleiben unverletzt: `npm run check:architecture:boundaries` und `npm run check:architecture:ratchet` bleiben gruen; `window.GAME_INSTANCE` und `window.GAME_RUNTIME` verbleiben nur im Bootstrap-/Diagnostics-Scope.

## Stand-Snapshot 2026-05-06 (Subphase `V107 107.1.2`)

- `107.1.2` ist geschlossen: `scripts/check-knowledge-graph.mjs` validiert jetzt die Pflicht-Mapping-IDs `runtime-taxonomy` und `desktop-critical-paths` sowie verbindliche Spawn-, Combat/Hit-, Round-End- und Settings-Knoten/-Kanten direkt im Graph-Artefakt.
- `tests/knowledge-graph-build.contract.test.mjs` baut den Graphen jetzt explizit gegen dieselben Critical-Path-Anforderungen und haertet dabei insbesondere die `SettingsManager`-Pflichtreferenz, Mehrfachpfade wie `GameplayConfigContract` und die `validated_by`-/`reads_config`-Verknuepfungen gegen Drift.
- Der aktive Planstand springt damit von `107.1` auf `107.2`; naechste offene Subphase ist `107.2.1` fuer Builder-Runtime-/State-/Test-Relationen.

## Stand-Snapshot 2026-05-07 (Subphase `V107 107.3.1`)

- `107.3.1` ist geschlossen: `scripts/check-knowledge-graph.mjs` prueft Mapping-Runtime-Knoten jetzt gezielt auf produktive Runtime-/State-/Config-/Event-/Test-Relationen, kritische Runtime-Knoten ohne `validated_by`-Testkante und unbekannte Mapping-/Dateireferenzen.
- Der fokussierte Contract-Test haertet die neuen Fehlercodes `KG_RUNTIME_ORPHAN`, `KG_RUNTIME_VALIDATION_MISSING`, `KG_UNKNOWN_REFERENCE` und `KG_UNKNOWN_FILE_REFERENCE`; `node --test tests/knowledge-graph-build.contract.test.mjs` lief mit 15/15 PASS.
- `npm run graph:check` erreicht die neuen V107-Regeln, bleibt im aktuellen Dirty-Workspace aber an fremden Intake-/Scope-Drifts blockiert (`GRAPH_DIFF`, `COVERAGE_DIFF`, V113-Scope-Kollisionen). Naechste V107-Subphase ist `107.3.2` fuer Coverage-Gate-Regeln.

## Stand-Snapshot 2026-05-07 (Subphase `V107 107.4.1`)

- `107.4.1` ist geschlossen: `event-flow` gibt fuer Spawn, Combat/Hit und Round-Ende nicht mehr nur Event-Kanten aus, sondern auch Runtime-Systeme, States, Configs, Tests und die zugehoerigen Kontextkanten.
- Die Query bleibt rueckwaertskompatibel ueber `edges` fuer Event-Kanten; neue Diagnosefelder `states`, `configs`, `tests` und `contextEdges` machen die kritischen Desktop-Pfade direkt querybar.
- Evidence: `node --test tests/knowledge-graph-build.contract.test.mjs` (16/16 PASS), `node scripts/query-knowledge-graph.mjs event-flow spawn`, `node scripts/query-knowledge-graph.mjs event-flow combat-hit --json`, `node scripts/query-knowledge-graph.mjs event-flow round-end`. Naechste V107-Subphase ist `107.4.2` fuer die `SettingManager`-Pflichtreferenz.

## Stand-Snapshot 2026-05-08 (V107 Abschluss-Sync)

- `V107` ist im Master-Index geschlossen: `docs/plaene/aktiv/V107.md` steht auf `status: done`, `current_phase: 107.99`, und der Master spiegelt den Block jetzt unter den abgeschlossenen referenzierten Bloecken.
- Die V107-Abhaengigkeiten fuer `V110` und `V111` sind im Master als erfuellt markiert; `V111` bleibt weiter durch `V110.99` gesperrt.
- Abschluss-Evidence bleibt im Blockplan reproduzierbar: `graph:build`, `graph:check`, `plan:check`, `docs:sync`, `docs:check`, `gates:pre-commit` sowie die Kernqueries `critical-path-health`, `coverage-report` und `event-flow settings`.
- Nachtrag: Die Zwischenphase `107.4` ist im Blockplan ebenfalls auf `done` gesetzt, weil `107.4.1` und `107.4.2` bereits mit Runtime-/Settings-Evidence abgeschlossen waren; der V107-Abschlussstand ist damit intern konsistent.

## Commit-Notizen 2026-05-06

- `43a510fe` `fix: harden parcours runtime feedback and sync flows`: Parcours-Feedback, Ring-/Minimap-Zustand und Start-Setup-Sync wurden gemeinsam gehoben, damit Branch-/Checkpoint-Fortschritt im Runtime-, UI- und Testpfad denselben Zustand lesen und der Nutzer keine widerspruechlichen Signale zwischen Overlay, Audio und Replay-Fallback bekommt.
- `b456c7bf` `docs: sync governance plans and enforce task-closure commits`: Governance und Planstand wurden nachgezogen, damit abgeschlossene Arbeit nicht mehr als offener Worktree endet und der aktuelle Block-/Lock-/Graph-Stand wieder denselben Repo-Zustand beschreibt wie die Commits.
- `ff0b37eb` `chore: tighten pre-commit parcours validation`: Das Meta-Gate prueft Parcours-Routen jetzt auch strikt vor dem Commit, um fehlerhafte Stage-Spruenge oder Branch-Drift frueh abzufangen, bevor UI-/Runtime-Fixes mit inkonsistenten Streckendaten eingecheckt werden.

## Bugfix-Notiz 2026-05-07 (Arcade-Ghost Selbstduell)

- Ursache fuer unsichtbare Ghosts im zweiten Lauf eingegrenzt: Der Playback-Tick hing nur am neuen `actionUpdateLastRoundGhostPlayback`-Port, waehrend Legacy-/Kernel-Testpfade noch den alten Alias liefern; zusaetzlich brach `finish` ohne Record-Store vor dem Ghost-Library-Upsert ab und der sichtbare Ghost hatte noch keine robuste Spur-Geometrie.
- Fixpfad: `PlayingStateSystem` nutzt den alten Ghost-Update-Alias als Fallback, `ArcadeRunRuntime` schreibt Finish-Clips mindestens in die In-Memory-Ghost-Library, die Ghost-Library normalisiert gemischte v2/Legacy-Speicherformen und `LastRoundGhostSystem` rendert pro Ghost sichtbare Trail-Segmente aus den Clip-Frames.
- Evidence: `node --test tests/runtime-settings-live-apply.contract.test.mjs`, `node --test tests/parcours-ghost.contract.test.mjs tests/last-round-ghost-system.contract.test.mjs tests/playing-state-ghost-playback.contract.test.mjs`, `node --test tests/arcade-ghost-library.contract.test.mjs`, Desktop-Roundtrip `tests/ghost-selfduel-roundtrip.desktop.spec.js` mit Trail-Assertion und `npm run plan:check` sind gruen.

## Bugfix-Follow-up 2026-05-07 (Arcade-Ghost Spuraufbau)

- Nutzerfeedback: Der Ghost war sichtbar, aber seine Spur lag sofort komplett im Raum statt waehrend des Ghost-Flugs zu entstehen.
- Fixpfad: `LastRoundGhostSystem` benutzt fuer Ghosts jetzt die normale `Trail`-Klasse und fuettert sie pro Playback-Tick mit der interpolierten Ghost-Position; beim Playback-Loop wird die Ghost-Spur geloescht und waechst neu an.
- Evidence: `node --test tests/last-round-ghost-system.contract.test.mjs tests/playing-state-ghost-playback.contract.test.mjs`, `node --test tests/parcours-ghost.contract.test.mjs tests/last-round-ghost-system.contract.test.mjs tests/playing-state-ghost-playback.contract.test.mjs`, Desktop-Roundtrip `tests/ghost-selfduel-roundtrip.desktop.spec.js` und `npm run plan:check` sind gruen.

## Bugfix-Follow-up 2026-05-07 (Arcade-Ghost Trail-Kollision)

- Nutzerfeedback: Die Ghost-Spur soll wie im normalen Spiel entstehen, aber ihre Trail-Kollision soll im Menue ein- und ausschaltbar bleiben.
- Fixpfad: Das Start-Menue speichert `arcadeGhostTrailCollisionEnabled`; `RuntimeConfig` und `EntityRuntimeConfig` reichen die Option bis zum `LastRoundGhostSystem` durch. Bei aktivem Toggle registriert die Ghost-Spur ihre Segmente im normalen Trail-Spatial-Index mit eigener Ghost-Owner-ID, damit P1 nicht als eigener frischer Trail uebersprungen wird.
- Evidence: `node --test tests/last-round-ghost-system.contract.test.mjs tests/runtime-settings-live-apply.contract.test.mjs` und `git diff --check` sind gruen.

## Stand-Snapshot 2026-05-07 (Intake-Abgleich offener Feature-Plaene)

- Alle nicht abgeloesten Feature-Intake-Entwuerfe aus `docs/plaene/neu/` sind gegen den Master abgeglichen und mit kanonischen `docs/plaene/aktiv/VXX.md`-Dateien aufgenommen.
- Neu im Master sind `V90`, `V96`, `V102`, `V105`, `V106` und `V113`; bereits vorhandene aktive Detaildateien `V91`, `V101` und `V108` sind als abgeschlossene referenzierte Bloecke ergaenzt.
- Bot-Training-Entwuerfe bleiben gemaess Master-Regel ausserhalb von `docs/Umsetzungsplan.md`; der abgeloeste V112-Repro-Alternativentwurf bleibt nur Ideenspeicher, weil der kanonische V112-Block bereits `Feature_Spielaudit_Playtest_Improvement_Paket_V112.md` ist.
- `V90` und `V105` starten blockiert, weil ihre Abschluss-/Startpfade von stabiler Build-/Typecheck- bzw. `V102.99`-Evidence abhaengen; `V102`, `V96`, `V106` und `V113` sind geplant.

## Bugfix-Notiz 2026-05-07 (Heuristik-Bot Survival)

- Nutzerfeedback: Der Heuristik-Bot stirbt sehr schnell.
- Ursache: Die Observation-Felder `WALL_DISTANCE_LEFT`/`WALL_DISTANCE_RIGHT` waren im Runtime-Sampling semantisch vertauscht, weil die lokale Seitenbasis `WORLD_UP x forward` links statt rechts zeigt; die Heuristik wich dadurch in die blockierte Seite aus. Der RuleBased-Fallback hatte denselben links-positiven Yaw-Vertrag beim Input-Mapping invertiert.
- Fixpfad: `ObservationSystem` befuellt links/rechts wieder schema-korrekt; `BotActionOps` und `BotRecoveryOps` mappen positive Yaw-Entscheidungen konsistent auf `yawLeft`. Der Regressionstest `heuristic-bot-survival-regression` deckt Observation, Heuristik-Ausweichen und RuleBased-Yaw ab.
- Evidence: `node --test tests/heuristic-bot-survival-regression.test.mjs` und `npm run plan:check` sind gruen.

## Tooling-Notiz 2026-05-08 (Bot-Spielanalyse)

- Neuer CLI-Pfad `npm run bot:analyze`: Der vorhandene Bot-Validation-Runner spielt konfigurierbare Szenarien, danach klassifiziert `scripts/bot-play-analysis.mjs` Survival-, Wand-/Trail-, Stuck-, Winrate- und Forced-Round-Signale zu priorisierten Tuning-Hinweisen.
- Standardausgaben landen in `tmp/`; mit `--publish true` werden JSON/Markdown-Evidence nach `data/` und `docs/tests/` geschrieben.
- Evidence: `npm run bot:analyze -- --skip-run true --source-json data/bot_validation_report.json --report-json tmp/bot-play-analysis-npm-test.json --report-md tmp/bot-play-analysis-npm-test.md`, `node --check scripts/bot-play-analysis.mjs` und `npm run plan:check` sind gruen.

## Guard-Fix-Notiz 2026-05-08 (Pre-push max-lines)

- Pre-push blockierte auf `lint:architecture`, weil `HeuristicBotPolicy` und `MenuGameplayBindings` den `max-lines`-Guard ueberschritten.
- Fixpfad: Profil-/Observation-Helfer der Heuristik und Recording-/Kamera-Menuebinding wurden in schmale Nachbarmodule ausgelagert, ohne Runtime-Verhalten oder UI-Vertraege zu aendern.
- Evidence: `npm run lint:architecture`, `node --test tests/heuristic-bot-survival-regression.test.mjs`, `npm run plan:check` und `npm run docs:check` sind gruen.

## Stand-Snapshot 2026-05-08 (Subphase `V110 110.2.1`)

- `110.2.1` ist geschlossen: `data/contracts/knowledge-graph/contradictions.v1.json` versioniert Widerspruchsregeln fuer CriticalPath-Overlap, Runtime/Event-Richtungswiderspruch und optionale Domain-Drift.
- `scripts/check-knowledge-graph.mjs` fuehrt die Regeln in `graph:check` aus und trennt harte Violations von nicht-blockierenden Warnings; der Contract-Test belegt beide Pfade deterministisch.
- Evidence: `node --test tests/knowledge-graph-build.contract.test.mjs`, `npm run graph:build`, `npm run graph:check` und `npm run plan:check` sind gruen. Naechste offene Subphase ist `110.2.2` fuer Telemetrie-Replay-Fixtures.

## Stand-Snapshot 2026-05-08 (Subphase `V110 110.2.2`)

- `110.2.2` ist geschlossen: `data/contracts/knowledge-graph/runtime-telemetry-replay.v1.json` bindet Replay-Fixtures fuer Spawn, Combat/Hit und Round-Ende an den modellierten Graph-Flow.
- `graph:check` validiert erwartete Events, Runtime-Systeme, States, Configs, Tests und Telemetrie-Kanten und reportet Drift ueber `KG_TELEMETRY_REPLAY_*`-Fehlercodes.
- Evidence: `node --test tests/knowledge-graph-build.contract.test.mjs`, `npm run graph:build`, `npm run graph:check` und `npm run plan:check` sind gruen. V110 steht damit auf `110.3` fuer Delta-Validation und Migration.

## Bugfix-Notiz 2026-05-08 (Round-Ghost Bot-Spuren)

- Nutzerfeedback: Im Einzelspiel mit Bots entstanden mehrere Ghost-Spuren, obwohl der Parcours-Ghost Human-only gedacht ist.
- Ursache: Der RoundRecorder-Fallback erzeugte Last-Round-Ghost-Clips aus allen Snapshot-Spielern inklusive Bots; diese Clips wurden am Rundenende abgespielt und fuer die Arcade-Ghost-Library persistiert.
- Fixpfad: `RoundRecorder.getLastRoundGhostClip` filtert Bots standardmaessig aus Frames und Player-Metadaten; Bot-Spuren bleiben nur ueber `includeBots: true` fuer explizite Debug-Pfade verfuegbar.
- Evidence: `node --test tests/round-recorder-ghost-fallback.contract.test.mjs tests/parcours-ghost.contract.test.mjs tests/last-round-ghost-system.contract.test.mjs`, `npm run plan:check` und `git diff --check` sind gruen.

## Stand-Snapshot 2026-05-09 (Subphase `V111 111.2`)

- `111.2` ist geschlossen: Kritische Runtime-Knoten tragen jetzt Owner-/Stability-Metadaten, und `impact-diff`/`change-risk` geben diese zusammen mit ADR-/Issue-/PR-Handoff-Artefakten und Explainability-Treibern aus.
- Die Presets `incident`, `review`, `balance` und `onboarding` steuern reproduzierbar die empfohlenen Folgechecks; `change-risk` nutzt `incident` als Default, waehrend `impact-diff` weiterhin mit `balance` startet.
- Evidence: `npm run graph:build`, `npm run graph:check`, fokussierte Graph-Contract-Tests fuer Runtime-Queries/Presets sowie `change-risk --preset incident src/core/SettingsManager.js --json` sind gruen. Naechste V111-Subphase ist `111.3` fuer Safety, Scorecard und What-if-Analyse.

## Stand-Snapshot 2026-05-09 (Subphase `V111 111.3.1`)

- `111.3.1` ist geschlossen: `export-view` ist der lokale Export-/Viewer-Handoff und nutzt standardmaessig `default-redacted` fuer PII-/Secret-aehnliche Schluessel und Werte.
- Der rohe Auditpfad ist bewusst explizit: `--unsafe-raw` setzt `safety.mode=unsafe-raw` und ist in `query-ops.v1.json#playbook:export-view-safety` sowie im Architekturkontext als local-only Override dokumentiert.
- Evidence: `node --test tests/knowledge-graph-query.contract.test.mjs`, `node --test --test-name-pattern "query ops contract|export-view" tests/knowledge-graph-build.contract.test.mjs tests/knowledge-graph-query.contract.test.mjs`, `npm run graph:build`, `npm run graph:check` und `npm run plan:check` sind gruen. Naechste V111-Subphase ist `111.3.2` fuer Scorecard, Counterfactuals und Uncertainty-Budget.

## Stand-Snapshot 2026-05-09 (Subphase `V111 111.4.1`)

- `111.4.1` ist geschlossen: `incident-auto-minimize`, `temporal-anomalies` und `schema-lint` sind als lokale Graph-Queries verfuegbar und im Playbook `adaptive-diagnostics` dokumentiert.
- Der Settings-Referenzfall wird auf einen minimierten Kandidaten mit Root-Evidence und konkreten Folgechecks reduziert; die Scorecard-Drift wird als `watch` signalisiert, und Schema-Lint bleibt vor `graph:check` als schneller Shape-Check nutzbar.
- Evidence: `node --test --test-name-pattern "adaptive diagnostics|query ops contract" tests/knowledge-graph-build.contract.test.mjs`, `node scripts/query-knowledge-graph.mjs incident-auto-minimize src/core/SettingsManager.js --json`, `node scripts/query-knowledge-graph.mjs temporal-anomalies --json`, `node scripts/query-knowledge-graph.mjs schema-lint --json` und `npm run graph:build` sind gruen. Naechste V111-Subphase ist `111.4.2` fuer Test-Prioritization, Policy-as-Data und Feedback-Loop.

## Abschluss-Snapshot 2026-05-10 (Block `V111 111.99`)

- `V111` ist geschlossen: Negative Edges, Causal-Weighting, Query-Presets, Ownership/Stability, Safety-Export, Scorecard, Counterfactuals, Uncertainty-Budget, Auto-Minimization, Anomaly-Detection, Test-Prioritization, Policy-as-Data und Feedback-Loop sind im lokalen Wissensgraph-Workflow verankert.
- Der Abschluss bleibt bewusst local-first: Exporte sind per Default redacted, rohe Auditdaten laufen nur ueber den expliziten `--unsafe-raw`-Pfad, und adaptive Feedback-Signale bleiben durch Human-Review-Guardrails auf `watch`.
- Evidence: `npm run graph:build` -> core nodes=3709 edges=8002, coverage adjusted=85%, scorecard 94.8/pass; `npm run graph:check`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.

## Stand-Snapshot 2026-05-12 (Subphase V102 102.99)

- V102 (Security-, Runtime- und Contract-Hardening) erfolgreich abgeschlossen. Path-Traversal und XSS Risiken eliminiert. Sync-IPC für Settings asynchronisiert und Request-Size-Limits für den LAN-Server etabliert. ESLint no-restricted-syntax für innerHTML als Warnung hinterlegt.
- V114 (SurfacePolicyPort fuer Demo- und Vollversionsgrenze) abgeschlossen: Runtime-, Menu- und Startvalidierungs-Pfade konsumieren Surface-Gates ueber den zentralen Port; Produktmatrix-Contracts decken Desktop-vs-Browser-Demo-Fallbacks ab.
- V115 (Product & Infra Follow-up) abgeschlossen: Portal-Slot-Dopplungen, Checkpoint-Ring-Disposal und die lokale Expert-Credential-Hygiene sind bereinigt; Gemini-Agenten/Plan-Skill sind als expliziter Infra-Scope im Graph gemappt.

## Bugfix-Notiz 2026-05-13 (48h-Review-Follow-up)

- Der Architektur-Lint bleibt lauffaehig, indem der neue `innerHTML`-Guard als Warn-Ratchet statt als sofortiger Bestandserror greift; die 29 bekannten Treffer blockieren damit nicht mehr `prebuild`.
- `.gitignore` ist wieder textuell sauber und ignoriert lokale `scripts/tmp_refactor*.cjs`, damit Scratch-Refactor-Skripte den Knowledge-Graph nicht erneut verschmutzen.
- Der Electron-Preload kann den Settings-Override-Snapshot beim ersten synchronen Runtime-Limits-Read wieder deterministisch liefern; der asynchrone Cache bleibt als schneller Folgepfad erhalten.

## Plan-Korrektur 2026-05-13 (Block `V115`)

- `V115` ist nach erneutem Closure-Abgleich wieder offen: Der vorherige Abschluss deckte nur `P6`, `P12` und `P23` belastbar ab, waehrend `P7`, `P22` und `P24` bis `P31` weiterhin in `docs/prozess/Open_Findings.md` offen standen.
- Die erledigte Teilmenge bleibt als `115.1` dokumentiert, inklusive der bereits gemappten Gemini-Infra-Governance; offene Map-, Repo-Hygiene-, Test-Harness- und Contract-/API-Reste sind jetzt in `115.2` bis `115.4` mit eigenem Abschluss-Gate `115.99` geplant.
- Master-Index, Lock-Status-Zeile und Findings-Zuordnung zeigen damit wieder denselben Stand; erneutes Closure verlangt konkrete Evidence statt pauschalem `verified` sowie `npm run gates:pre-commit`.

## Stand-Snapshot 2026-05-13 (Block `V115 115.2-115.4`)

- `115.2` ist geschlossen: Vulkan-Odyssey-Precision-Footprints sind verbreitert, und P22-Retention ist ohne destruktive Asset-/Tmp-Bereinigung klassifiziert.
- `115.3` ist geschlossen: Playwright-/Targeted-Harness-Spawnfehler erhalten Diagnoseartefakte, Windows-Spawn-Fallbacks und pro Cluster klassifizierte `harness-spawn-error`-Reports; der breite Test-Barrel ist nach Consumer-Gruppen dokumentiert.
- `115.4` ist bis auf P27 geschlossen: P28 bleibt als additiver v1-Traversal-Pfad dokumentiert und getestet, P29 wirft bei fehlendem Download-Handler nicht mehr, P30 hat einen Runtime-Consumer-Nachweis, und P31 ergaenzt Registry-Immutability-Tests. Offen bleibt nur die repo-weite P27-Evidence-Kuerzung.

## Abschluss-Snapshot 2026-05-14 (Block `V115 115.99`)

- `V115` ist geschlossen: P27 ist aus den offenen Findings entfernt, und die V115-Evidence bleibt in den Planstellen kompakt mit konkreten Commands, Commits oder Artefakten statt pauschalen `verified`-Claims.
- Der Master-Index steht fuer V115 auf `done`/`115.99`; `docs/prozess/Open_Findings.md` enthaelt keine V115-Zuordnung mehr.
- Abschluss-Evidence: `npm run test:fast`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, `npm run graph:build` und `npm run gates:pre-commit` im Closure-Slice.

## Stand-Snapshot 2026-05-13 (Gemini-Governance-Hygiene)

- Gemini-Gedaechtnis-/Skill-Definitionen nachgezogen: `.gemini/skills/plan-generator/SKILL.md` respektiert jetzt die User-owned Intake-Governance (`docs/plaene/neu/` statt direkter Master-/Aktivblock-Aenderung), und `.gemini/agents/test_engineer.md` verweist auf `.agents/test_mapping.md`, `docs/qa/**` und aktive Blockplaene statt auf eine nicht vorhandene `Open_Findings.md`.
- Alle Gemini-Agenten haben jetzt eine gemeinsame Repo-Governance-Praeambel: erst `AGENTS.md`, passende Rules und Workflows lesen; bei Konflikt gewinnt die Repo-Governance; Audit-/Review-Aufgaben sollen Findings berichten statt Produktlogik ungefragt zu aendern. `doc_sync` ist zusaetzlich gegen eigenmaechtige Master-Index- und Archivierungsaktionen begrenzt.
- `.gemini/README.md` dokumentiert die Grenze zwischen repo-lokalen Gemini-Definitionen und globalem Session-/Brain-Memory. Die Spezialagenten sind weiter an konkrete Repo-Pfade gebunden: Graph-First fuer Contract-Fragen, Architecture-Gates fuer Security/Boundary-Scope, `src/core/three-disposal.js` fuer Three.js-Cleanup und kleinster passender Testlayer fuer QA.
- `npm run check:gemini` schuetzt die repo-lokalen Gemini-Definitionen gegen erneute Governance-Drifts: fehlende Repo-Governance-Praeambeln, alte Findings-/Testskript-Verweise und direkte Master-/Aktivblock-Intake-Anweisungen werden im `docs:check`-Pfad blockiert.
- Der Gemini-Governance-Check ist als importierbare Funktion testbar und mit `tests/gemini-governance.contract.test.mjs` im `test:contract`-Layer gegen Positiv- und Drift-Fixtures abgesichert.
- `scripts/gates-pre-commit.mjs` ruft den Gemini-Governance-Check jetzt explizit auf, weil der Meta-Gate-Pfad die Doku-Skripte direkt startet und den `npm run docs:check`-Wrapper bewusst umgeht.

## Stand-Snapshot 2026-05-14 (Subphase `V117 117.1`)

- `117.1` ist geschlossen: Das AI Decision Framework ist fachlich fixiert, D0-D4 sind gegen V116, Dead-Code, Planarchivierung, Rebuild und Refactor abgeglichen.
- Der Referenz-Onboarding-Pfad verweist wieder auf `AGENTS.md`, passende Rules/Workflows, Master-Index und aktive Detailplaene statt eigene Steuerlogik aufzubauen.
- Decision: V117 117.1 bleibt D3-Governance-Scope; Chosen: kompakte Plan-/Referenzklaerung statt breiter Workflow-Umbau; Evidence: `open-deps V117`, `scope-collisions`, `npm run plan:check`; Gate: `npm run plan:check`.

## Review-Fix 2026-05-15 (Block `V117` Evidence-Claim-Haertung)

- P2-Fund geschlossen: `.agents/workflows/cleanup.md` hat jetzt einen direkten Decision-Klassen-/D3-D4-/User-Gate-/Zweckklassen-Verweis fuer Cleanup-, Archivierungs-, Move-/Delete- und Refactor-Scope.
- Praevention: `scripts/check-plan-evidence-claims.mjs` prueft V117-Workflow-Integrationsclaims gegen konkrete Marker in den betroffenen Workflow-Dateien; `npm run check:plan-evidence-claims` laeuft im `gates:pre-commit`-Meta-Gate.
- P3-Funde nachgeschaerft: Die verfruehte Lock-Freigabe bleibt als historischer Befund dokumentiert statt per History-Rewrite kaschiert; `check:ai-decision-policy` bleibt Report-only, waehrend harte Plan-Evidence-Claims jetzt einen blockierenden Assertion-Check haben.

## Review-Haertung 2026-05-15 (Block `V117` Claim-Registry)

- `check-plan-evidence-claims` erkennt Workflow-Glob-Claims wie `.agents/workflows/{...}.md` und blockiert sie, wenn keine passende Assertion registriert ist.
- Der Contract-Test prueft neben Fixtures auch die echten V117-Default-Assertions, damit geloeschte Workflow-Marker oder fehlende Claim-Abdeckung im Repo selbst auffallen.
- `check:ai-decision-policy` meldet sich im Output als `ai-decision-policy:report-only`; `report:ai-decision-policy` ist als sprechender Alias verfuegbar, waehrend harte Evidence-Claims weiter ueber `check:plan-evidence-claims` laufen.

## Workflow-Haertung 2026-05-15 (Plan-/Code-Workflow Evidence-Claims)

- `.agents/workflows/plan.md` verlangt fuer neue Plaene bei Glob- oder "alle X"-Evidence konkrete File-by-File-Evidence oder eine Assertion in `check-plan-evidence-claims`.
- `.agents/workflows/code.md` macht `npm run check:plan-evidence-claims` bei aktiven Plan-, Workflow-, Rule-, Scope- oder Abschluss-Evidence-Aenderungen zum vorgesehenen Governance-Gate.
- Der Claim-Check blockiert jetzt auch Rule-/Docs-Globs, "alle Rules/Regeln", "alle/vollstaendige scope_files" und repo-weite Konsistenzclaims ohne passende Assertion.

## Governance-Haertung 2026-05-15 (Agent-Workflow-Erzwingung)

- Bot-Commits muessen im Commit-Body jetzt `Workflow:`, `Decision:` und `Evidence:` enthalten; D3-Scope braucht zusaetzlich `Gate:`, D4-Scope zusaetzlich explizites User-Gate und `Recovery:`.
- `npm run agent:preflight` prueft denselben Envelope gegen gestagte Dateien und blockiert unterklassifizierte Governance-/Plan-Source-of-truth-Aenderungen sowie getrackte Deletes/Renames ohne D4-Recovery-Pfad.
- `.husky/commit-msg` ruft nach `commitlint` den neuen Agent-Commit-Check auf, damit die Workflow-Nutzung als technische Spur erzwungen wird statt nur als Markdown-Regel zu existieren.

## Governance-Haertung 2026-05-15 (Agent-Preflight als Graph-Radar)

- `npm run agent:preflight` bleibt der technische Einstiegspunkt und liest jetzt fuer gestagte Dateien den Knowledge-Graph-Kontext, wenn `docs/generated/knowledge-graph.json` vorhanden ist.
- Graph-Funde liefern Scope-Bloecke und Scope-Edges als Warn-/Orientierungsschicht; fehlende Graph-Eintraege blockieren nicht, damit der Graph Radar bleibt und keine zweite Policy-Quelle wird.
- Die harten Blocks bleiben weiterhin Workflow/Decision/Evidence, D3/D4-Gates und Delete-/Rename-Recovery; der Graph hilft beim Einstieg, ersetzt aber nicht `AGENTS.md`, Rules oder Workflows.

## Governance-Haertung 2026-05-15 (Agent-Claim-Nachvollziehbarkeit)

- `Evidence:` muss jetzt ein Ergebnis wie `-> PASS`, `WARN` oder `FAIL` enthalten, statt nur einen Command-Namen zu behaupten.
- `Scope:` wird gegen die gestagten Dateien geprueft; `Known-uncommitted:` muss ungestagte/untracked Restdateien nennen oder explizit `none` sagen.
- D3/D4-Commits brauchen zusaetzlich `Residual-risk:` und `Not-checked:`; breite Claims wie "repo-weit konsistent" werden ohne breite Gate- oder File-by-File-Evidence blockiert.

## Stand-Snapshot 2026-05-15 (Subphase `V116 116.2`)

- `116.2` ist nach User-Gate geschlossen: `npm run cleanup:workspace:apply` entfernte 203 konservative Low-Risk-Artefakte aus ignorierten Build-, Playwright-, Root-Log-, Dev-Log- und tmp-Diagnosepfaden; Archivaktionen blieben bei 0 und es gab keine Apply-Fehler.
- Geschuetzte Klassen blieben unberuehrt: `videos/`, `prototypes`, `.codex_tmp`, unklare `tmp/*`-Evidence und P22-nahe Retention-Artefakte wurden nicht neu entschieden. `git status --short` blieb nach Apply leer.
- Der Master-Index wechselt damit auf `V116 116.3` fuer die KI-Kontext-Policy; V116 hat weiter keinen produktiven Code-, Asset-, Recording-, Physik- oder Bot-Training-Diff.

## Stand-Snapshot 2026-05-15 (Subphase `V116 116.3`)

- `116.3` ist geschlossen: Der Standard-Leseweg bleibt `AGENTS.md` -> passende Rules/Workflows -> Master-Index -> aktive Detaildatei; `CLAUDE.md` und `.gemini/README.md` sind nur Adapter, keine konkurrierenden Governance-Quellen.
- Neu als nachhaltige Gate-Schaerfung: Vor D3-/D4-Freigaben und in `[REVIEW]`-/`[USER-GATE]`-Phasen muessen betroffene Dateien/Oberflaechen als `no-op`, `read-only evidence`, `optional` oder `edit required` klassifiziert werden; die Freigabe umfasst nur `edit required`.
- `npm run check:agent-context` prueft den Leseweg, Adapter-Prioritaet, Nicht-Standardkontext-Zonen und optionale `CURRENT_CONTEXT.md`-Grenzen. `CURRENT_CONTEXT.md` wurde bewusst nicht angelegt; das Gate akzeptiert `currentContext=absent` und verhindert spaeter Plan-/Master-Duplikation.

## Plan-Intake 2026-05-17 (Block `V125`)

- `V125` ist als geplanter P1-Architektur-Compliance-Block im Master und in `docs/plaene/aktiv/V125.md` angelegt: Zweck ist die Verankerung von Architektur-Capsule, staged Architecture Guard, Acceptance-Regeln und Ratchet-/Boundary-Evidence fuer Folgearbeit.
- Scope bleibt Governance-/Guard-Haertung; produktiver Runtime-, UI-, Multiplayer-, Recording-, Physik- oder Bot-Training-Code ist explizit nicht Teil dieses Plan-Slices.
- Commit-/Gate-Signal fuer den Intake-Slice: `npm run plan:check` und `npm run gates:pre-commit`; Restrisiko bleibt die spaetere User-Gate-Freigabe fuer konkrete V125-Phasen mit Rule-, Workflow-, Hook- oder Budget-Aenderungen.

## Reihenfolge-Anker 2026-05-17 (Block `V126`)

- Der Master-Index verankert die naechste P1-Reihenfolge jetzt als `V116` Abschluss-/Park-Slice, kurze `V90` Audit-Baseline und danach `V126 126.1` als produktnahen Dev-API-/Preview-Hardening-Start.
- `V126` bleibt nur hart von `V102.99` und `V105.99` abhaengig; `V90.2` und `V125.3` sind Soft-Koordination fuer Package-/Lockfile-/CI-Upgrades sowie neue Pflicht-Gates, Hooks oder Pre-Commit-Policy.
- Das V126-Startgate erlaubt den Start vor vollstaendigem `V119`, `V123`, `V120` oder `V125`, solange keine historischen Evidence-, Source-of-Truth-, Graph- oder RAG-Abschlussclaims entstehen.

## Stand-Snapshot 2026-05-17 (Subphase `V116 116.5`)

- `116.5` ist no-op-first geschlossen: `token_efficiency_and_tools.md`, `CLAUDE.md` und `.gemini/README.md` decken Kontext-Policy und Adapter-Prinzip bereits ab; daher keine Rule-/Workflow-/Adapter-Diffs.
- Safety blieb unverkuerzt: Dead-Code-, Git-, Lock-, Commit-, D3/D4- und Test-Ownership-Regeln wurden nur als Evidence abgeglichen, nicht reduziert.
- Der Master-Index springt fuer V116 auf `116.6 Gate-Matrix`; der Draft `docs/plaene/neu/Feature_Agent_Skills_statt_Regeltext.md` bleibt bewusst ausserhalb des Master-Intakes.

# 2026-05-18 - Codex Cloud Node runtime

- Added `.nvmrc` with Node 24 so Codex Cloud setup uses a runtime compatible with Cesium's `>=22` engine requirement and the local Windows development setup.

## V126 Review-Fix 2026-05-18 (Local API Preview)

- `dev/training/trainingSpawnArgs.js` ist jetzt im Training-Dashboard-Pfad verdrahtet: `vite.config.js` startet `npm run training:e2e` ohne `shell: true` und nutzt den Windows-Command-Resolver.
- Preview-Mutationen fuer Editor-Disk-POSTs und Training-Start/Stop/Schedule werden ohne `ENABLE_LOCAL_MUTATION_APIS=1` mit `403 preview-local-mutation-disabled` blockiert.
- V126 bleibt offen fuer die read-only Artefakt-Entscheidung, den Log-Ringbuffer und die erste groessere `vite.config.js`-Entflechtung.

## SettingsManager Nachhaltigkeitsfix 2026-05-19

- `SettingsManager` reicht den injizierten Storage-Pfad jetzt auch an Preset-, Draft-, Text-Override- und Menu-Telemetry-Stores weiter; Sidecar-Persistenz nutzt damit dieselbe Plattformgrenze wie `SettingsStore`.
- Runtime-Services nutzen einen zentralen Changed-Key-Helfer; der Runtime-Orchestrator filtert bekannte Keys frueh und faellt bei unbekannten Keys bewusst auf `syncAll` zurueck.
- Die Diagnostics-API ist als explizite Manager-Fassade verdrahtet statt Methoden nachtraeglich an die Instanz zu haengen.

## Bugfix-Notiz 2026-05-19 (Map Tools Electron Viewer-Hoehe)

- Ursache: Der Electron-Shell-Viewer wurde bei verborgenem Fehlerpanel automatisch in die `auto`-Grid-Zeile einsortiert; dadurch fiel das iframe auf seine Default-Hoehe zurueck und liess unter der Repo Map eine grosse dunkle Flaeche.
- Fixpfad: `electron/map-tools/ui/map-tools.css` bindet Header, Status, Fehlerpanel und Viewer per Grid-Areas an feste Zeilen, waehrend der Viewer die `minmax(0, 1fr)`-Zeile fuellt. Der Electron-Smoke prueft die Viewer-Hoehe fuer Plan Map und Repo Map.

## Bugfix-Notiz 2026-05-21 (Mobile Classic Tilt-Steuerung)

- Ursache: Die Android-/Mobile-Classic-Neigungssteuerung hatte eine zu grosse Default-Deadzone, starke Glaettung und separate Press-/Release-Richtungsschwellen; leichte Neigung blieb dadurch wirkungslos und mittlere Neigung fuehlte sich eher binaer als analog an.
- Fixpfad: `src/ui/TouchInputSource.js` senkt Deadzone und Release-Schwelle, reduziert die Glaettung und leitet die Richtungsflags direkt aus der geglaetteten Analogachse ab. `tests/mobile-classic-app.contract.test.mjs` prueft jetzt leichte, mittlere und starke Neigung als monotone Analogwerte sowie die erste Tilt-Auswertung.
- Evidence: `node --test tests/mobile-classic-app.contract.test.mjs` -> PASS; `npm run plan:check` -> PASS.

## Plan-Intake 2026-05-21 (Block `V130`)

- `V130` ist nach expliziter User-Anforderung als abgeschlossener aktiver Block kanonisiert: der Draft liegt in `docs/plaene/alt/Feature_Parcours_Map_Pack_V130.md`, die Source of Truth in `docs/plaene/aktiv/V130.md`.
- Der bereits gelieferte Code-Slice aus `309ef8a9` bleibt fachlich die Umsetzung: sechs JS-authored Parcours-Maps, stabile `*_v1`-Route-IDs, gestaffelte Arcade-Pool-Erweiterung und targeted Contract-/Playwright-Smokes.
- Der Intake loest die V132-Hard-Dependency `V130.99`; bewusst unveraendert bleiben Browser-Demo-Allowlist, `MenuPreviewCatalog.js`, GLB-/CC0-Assets, bewegliche Hazards, echte Loops und Editor-/Authoring-Pfade.

## Tooling-Notiz 2026-05-21 (Plan Map Intake-Layer)

- `export-plan-map` exportiert Intake-Drafts aus `docs/plaene/neu/` jetzt als eigene `intakePlans`-Ebene statt sie mit kanonischen Master-Bloecken zu vermischen.
- Electron- und Android-Map-Tools konsumieren denselben Plan-Map-Viewer; der neue Intake-Tab zeigt Klassifikation, Arbeitsstrom, Zielplan, Gruende und `scope_files`.
- Evidence: `node --test tests/plan-map-export.contract.test.mjs tests/map-tools-android.contract.test.mjs tests/map-tools-electron.contract.test.mjs` -> PASS; `node --test tests/knowledge-graph-build.contract.test.mjs` -> PASS; `npm run plan:context:check` -> PASS; `npm run plan:check` -> PASS; `npm run graph:check` -> PASS mit bekannten Map-Tools-Domain-Drift-Warnungen.

## Stand-Snapshot 2026-05-21 (Subphase `V125 125.1`)

- `125.1` ist als D3/User-Gate-Slice geschlossen: `code_quality_and_debugging.md` definiert die gemeinsame Architecture Capsule, `code.md` nutzt sie ueber den bestehenden Architektur-Startcheck, und `quick.md` eskaliert neue Dependency-, Legacy-, Runtime-/Global-Surface- sowie Application/UI/Core-Grenzen aus dem Quick-Path.
- `bugfix.md`, `refactor.md`, `performance.md` und `fix-planung.md` verlangen denselben Mindestcheck mit kleinstem Guard bzw. verbieten stille Boundary-/Legacy-/Runtime-Abkuerzungen.
- Evidence: `npm run plan:check` -> PASS; `npm run check:plan-evidence-claims` -> PASS; `npm run graph:build` -> PASS; `npm run gates:pre-commit` -> PASS mit bekannten Map-Tools-Domain-Drift-Warnungen.
- Not-checked: kein produktiver Runtime-/UI-Code, keine Hook-/Package-Aenderung, keine ArchitectureAnalysis-/Ratchet-Aenderung und keine Vollsuite; diese bleiben V125.3 bis V125.99.

## Stand-Snapshot 2026-05-21 (Subphase `V125 125.2`)

- `125.2` ist als D3/User-Gate-Slice geschlossen: `plan.md` verlangt fuer neue oder groesser ueberarbeitete Code-/Runtime-Featureplaene eine `## Architecture Acceptance`-Sektion mit Schichten, Zielpfaden, verbotenen Legacy-Surfaces, Dependency-Kanten, Contract-/Port-/Snapshot-Bezug, Guard und Ratchet-Auswirkung.
- `check-plan-evidence-claims.mjs` bleibt fuer diesen Slice warnend statt blockierend: aktive Code-/Runtime-Plaene ohne Acceptance melden `architecture-acceptance.missing`, und abgeschlossene Architekturclaims ohne konkrete Guard-/Metrics-/Ratchet-/Contract-Evidence melden `architecture-claim.weak-evidence`.
- Kandidatenklassifikation ohne Autoumschreibung: V96, V106 und V113 sind `edit required` bei naechster Planpflege, V112 bleibt wegen Abschluss `no-op`, V124 bleibt `optional`/Handoff-Kandidat fuer spaetere Code-/Runtime-Erweiterungen. Evidence: `node --test tests/plan-evidence-claims.contract.test.mjs tests/validate-umsetzungsplan.test.mjs` -> PASS; `npm run check:plan-evidence-claims` -> PASS mit Warnungen fuer V96, V106 und V113; `npm run plan:check` -> PASS; `npm run graph:build` -> PASS; sauberer Temp-Worktree `npm run gates:pre-commit` -> PASS mit bekannten Map-Tools-Domain-Drift-Warnungen.
- Not-checked: kein produktiver Runtime-/UI-Code, keine Hook-/Package-Aenderung, keine ArchitectureAnalysis-/Ratchet-Aenderung und keine Vollsuite; staged Guard und harte Architektur-Ratchets bleiben V125.3 bis V125.5.

## Stand-Snapshot 2026-05-22 (Subphase `V125 125.3`)

- `125.3` ist als D3/Review-Slice geschlossen: `scripts/check-architecture-staged.mjs` routet staged Architekturdateien jetzt auf das kleinste passende Signal statt den Pre-Commit-Pfad pauschal nur ueber `touched-strict` laufen zu lassen.
- Routing: `src/**` nutzt weiter touched-strict mit gestagten Dateien via `ARCH_TOUCHED_FILES`; Architektur-Tooling nutzt boundaries/metrics/ratchet; Application-, Runtime-, Contract- und Server-Scope bekommen die breitere Baseline; Electron-/Platform-Scope wird erkannt und mit Boundary-/Metrics-Baseline gefuehrt.
- Evidence: `npm run check:architecture:staged -- --dry-run` -> PASS mit Routing auf boundaries/metrics/ratchet fuer `scripts/check-architecture-staged.mjs`; `npm run check:architecture:staged` -> PASS; `npm run plan:check` -> PASS.
- Not-checked: keine produktiven Runtime-/UI-Aenderungen, keine neuen `ArchitectureAnalysis`-Findings fuer Electron-/Preload oder `application -> ui/core`, keine Ratchet-Senkung und keine Vollsuite. `curviosApp` bleibt als unterbotenes Budget (`2` bei Baseline `3`) bewusst offen fuer 125.5.

## Abschluss-Snapshot 2026-05-22 (Block `V125 125.99`)

- `V125` ist geschlossen: Architektur-Capsule, Workflow-Eskalation, Architecture Acceptance, staged Architecture Guard, Electron-/Preload- und `application -> ui/core`-Scorecard sowie Ratchet-/Contracttest-Evidence sind als Folgearbeits-Guard verankert.
- Effekt: neue architekturrelevante Feature-, Bugfix-, Refactor- und Performance-Slices muessen Contract/Port/Command/Snapshot/Capability, Legacy-Surface, Dependency-Delta, Guard und Not-checked kompakt benennen; kleine Workflows koennen Boundary-/Legacy-/Runtime-Surface-Arbeit nicht mehr still am Architektur-Startcheck vorbeifuehren.
- Evidence: `npm run plan:check` -> PASS; `npm run check:architecture:boundaries` -> PASS; `npm run check:architecture:metrics` -> PASS; `npm run check:architecture:ratchet` -> PASS; `npm run check:architecture:staged` -> PASS/skipped bei 0 staged Architekturdateien; `node --test tests/architecture-governance.contract.test.mjs tests/agent-governance.contract.test.mjs` -> PASS; `npm run gates:pre-commit` -> PASS.
- Restrisiko: `npm run gates:pre-commit` meldet weiterhin bekannte, nicht-blockierende Map-Tools-Domain-Drift-Warnungen im Graph.
- Not-checked: keine Vollsuite, keine produktiven Runtime-/UI-/Multiplayer-/Recording-/Physik-/Bot-Training-Aenderungen, keine V96-Boundary-Migration, keine Electron-IPC-Ratchetpflicht und kein Browser-/Android-E2E.

## Graph-Contract-Notiz 2026-05-22 (Map Tools Domain-Drift)

- Der Domain-Drift-Checker hat jetzt eine enge Allowlist fuer `map-tools` read-only Dashboard-Kanten auf die drei Dataset-Knoten `state:plan-map-readonly-dataset`, `state:repo-map-readonly-dataset` und `state:agent-map-readonly-dataset`.
- Domains bleiben Ownership-Signal: `plan-map`, `repo-map` und `agent-governance` werden nicht auf `map-tools` umetikettiert; `writes_state` oder Reads auf andere fremde States melden weiter `KG_CONTRADICTION_DOMAIN_DRIFT`.
- Evidence: `node --test tests/knowledge-graph-build.contract.test.mjs` -> PASS; `npm run graph:check` -> PASS; `npm run plan:check` -> PASS.

## Abschluss-Snapshot 2026-05-27 (Block `V138 138.99`)

- `V138` ist geschlossen: das staged Diff-Audit klassifiziert Runtime-Code, Generator-Code, Generated-Artefakte, Governance, Source-of-Truth und Tests deterministisch und bleibt an den bestehenden Agent-Preflight-/Commit-Envelope-Pfad gebunden.
- Effekt: `Generated-by:`, `Canonical-source:` und `Not-checked:` machen Generated-/Shadow-Truth- und D2-Slices expliziter; Gate-Bypass- und Test-Only/Skip-Spuren werden ohne semantische Pseudo-Bewertung abgefangen.
- Evidence: `node --test tests/agent-diff-audit.contract.test.mjs` -> PASS; `npm run check:ai-diff-audit` -> PASS; `npm run plan:check` -> PASS; `npm run gates:pre-commit` -> PASS mit bekannter nicht-blockierender V76-Evidence-Warnung.
- Restrisiko: weichere Testqualitaetswarnungen bleiben heuristisch; Scope-Validator-Import, CI-Hardening und direkte Pre-Commit-Hardverdrahtung bleiben bewusst separate Folgeentscheidungen.
- Not-checked: keine semantische Bewertung guter Tests, kein Import-/Refactor von `.agents/scripts/scope-validator.js`, keine CI-/Pre-Commit-Hardverdrahtung ausserhalb Agent-Preflight, keine Vollsuite.

## Stand-Snapshot 2026-05-27 (Subphase `V120 120.6`)

- `120.6` ist geschlossen: Graph-RAG Query-Ausgaben nutzen jetzt den finalen Contract `knowledge-graph.rag-evidence-package.v1` statt eines Drafts.
- Effekt: Evidence-Packages validieren source-backed Claims mit Pfad, Zeilenbereich, Confidence, Unsicherheiten, Chunk-ID und Hash; der Budget-Report zeigt ausgewaehlte, verworfene und geschaetzte Kontext-Tokens fuer den Hauptmodell-Kontext.
- Evidence: `node --test tests/graph-rag-index.contract.test.mjs tests/graph-rag-query.contract.test.mjs tests/graph-rag-local-llm-selection.contract.test.mjs tests/graph-rag-context-adapter.contract.test.mjs` -> PASS mit 13 Tests; `node scripts/graph-rag-query.mjs "Zeige mir den spawn Critical Path mit Tests und Evidence." --max-chunks 3` -> PASS mit `Budget: 3/3 chunks; rejected: 131; fallback: no`; `npm run gates:pre-commit` -> PASS.
- Not-checked: keine echte lokale Ollama-/llama.cpp-Installation, kein Viewer/UI, keine Produkt-Runtime, keine Vollsuite und kein `120.99`-Abschlussgate.

## Guard-Fix-Notiz 2026-05-27 (Pre-push mobile max-lines)

- `git push origin main` wurde lokal vom Pre-Push-Hook blockiert, weil `npm run lint:architecture` an bestehenden Max-Lines-Hotspots in `src/mobile-classic/MobileClassicApp.js` und `src/ui/TouchInputSource.js` stoppte.
- Fixpfad: `scripts/architecture/LegacyMaxLinesConfig.mjs` fuehrt fuer die bestehende Mobile-Android-Shell ein Legacy-Ceiling ein und aktualisiert das Touch-Input-Ceiling auf den aktuellen ESLint-Zaehlerstand; Verhalten, UI und Runtime-Code bleiben unveraendert.
- Residual-risk: Die Ceilings sichern den Push-Guard, ersetzen aber keinen spaeteren fachlichen Split der Mobile-App-/Touch-Module.

## Stand-Snapshot 2026-05-27 (Subphase `V120 120.7`)

- `120.7` ist geschlossen: die bestehende Graph-First-Regel trennt jetzt Graph-RAG fuer Erklaerfragen, historische Entscheidungen und source-backed Evidence-Summaries von strukturierten Graph-Queries fuer harte Scope-, Lock-, Dependency-, Impact- und Surface-Fakten.
- Effekt: Agents koennen `graph-rag-query` oder den regelbasierten Context-Adapter als token-sparenden Erklaerpfad nutzen, ohne Graph-RAG zur neuen Source of Truth zu machen; die Wahrheit fuer Scope und Impact bleibt beim Knowledge-Graph und den kanonischen Markdown-Quellen.
- Evidence: `rg -n "Graph-RAG-Ergaenzung" .agents/rules/token_efficiency_and_tools.md` -> PASS; `node scripts/graph-rag-query.mjs "Wie nutze ich Graph-RAG fuer historische SettingsManager-Entscheidungen?" --max-chunks 3` -> PASS; `npm run check:plan-evidence-claims` und `npm run gates:pre-commit` -> PASS.
- Residual-risk: V120 bleibt offen fuer `120.99`; Abschluss-Gates fuer Graph, Plan und Docs sind noch nicht als Blockabschluss markiert.
- Not-checked: keine echte lokale Ollama-/llama.cpp-Installation, kein Viewer/UI, keine Produkt-Runtime und keine Vollsuite.

## Abschluss-Snapshot 2026-05-28 (Block `V120 120.99`)

- `V120` ist geschlossen: der lokale Graph-RAG-Pfad bleibt graph-first, source-backed und optional; lokale AI darf nur verdichten, reranken oder Fakten aus Quellen extrahieren, aber keine neue Wahrheitsschicht oder Aenderungsautoritaet werden.
- Nutzen: Komplexe Repo-Fragen koennen nun ueber `graph-rag-query` und den Context-Adapter mit begrenzten Chunks, Claims, Zeilen-Evidence und Budget-Report beantwortet werden, statt breite Volltextkontexte in das Hauptmodell zu laden.
- Fallback: Ohne Ollama/llama.cpp bleibt Graph-only, `rulebased` und `mock` verfuegbar; fehlende, langsame oder invalide lokale Runtime blockiert Graph-RAG nicht.
- Evidence: `npm run graph:slo`, `npm run graph:build`, `npm run graph:check`, `npm run plan:check`, `node --test tests/graph-rag-index.contract.test.mjs tests/graph-rag-query.contract.test.mjs tests/graph-rag-local-llm-selection.contract.test.mjs tests/graph-rag-context-adapter.contract.test.mjs`, `npm run docs:sync`, `npm run docs:check`, `npm run plan:index:build`, `npm run plan:index:check` und `npm run gates:pre-commit` -> PASS.
- Residual-risk: keine echte lokale Ollama-/llama.cpp-Installation, kein Viewer/UI, keine Produkt-Runtime und keine Vollsuite; V121 und V137 bleiben separate Folge- bzw. Spike-Bloecke.
- Not-checked: keine produktiven Runtime-/UI-/Gameplay-/Bot-Training-Pfade, keine Cloud-AI-Integration, kein CodeGraph-Init/MCP/Agent-Config und kein Graph-Source-of-Truth-Wechsel.

## Bugfix-Notiz 2026-05-29 (Mobile Tilt Pitch-Invert)

- Ursache: Die gemeinsame Android-Mobile-App erbt den Desktop-Default `invertPitch.PLAYER_1=true`; bei Tilt-Steuerung macht das die Handy-Pitch-Richtung gefuehlt falsch.
- Fixpfad: `applyMobileClassicSettings()` setzt `invertPitch.PLAYER_1=false` nur im Mobile-Target und laesst die bestehenden Mobile-Tilt-Achsen unveraendert.
- Evidence: `node --test tests/mobile-classic-app.contract.test.mjs` -> PASS; `node --test tests/mobile-arcade-app.contract.test.mjs` -> PASS; `npm run plan:check` -> PASS.

## Plan-Notiz 2026-05-30 (Block `V121 121.6`)

- Nach User-Gate `bitte einplanen` misst V121 den praktischen Nutzen des Viewer-MVP quantitativ statt nur Safety und Contract-Korrektheit zu pruefen.
- Fuer mindestens acht Referenzaufgaben werden CLI-Baseline, Dashboard-only und fuer passende Fragen Dashboard plus `Ask Repo` verglichen: Zeit bis zur source-backed Antwort und Anzahl manueller CLI-Schritte.
- Akzeptanz: Das Dashboard senkt die medianen manuellen CLI-Schritte mindestens um 30 Prozent, ohne die mediane Antwortzeit zu verschlechtern. `Ask Repo` bleibt nur im Vollscope, wenn es einen zusaetzlichen messbaren Nutzen zeigt; andernfalls wird es vor Rollout vereinfacht oder verschoben.
- Residual-risk: Fixture-nahe Referenzaufgaben koennen den Alltagsnutzen ueberzeichnen; die Abschluss-Evidence muss deshalb Aufgaben, Messwerte und Reduce-/Defer-Entscheidung sichtbar dokumentieren.
