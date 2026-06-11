---
title: Plan-Autopilot isolierter Ein-Slice-Pilot
status: draft
planned_block_id: V147
plan_file: docs/plaene/aktiv/V147.md
target_master: docs/Umsetzungsplan.md
intake_status: needs-user-intake
decision_class: D3
priority: P2
owner: frei
depends_on:
  - V117.99
  - V145.99
soft_depends_on:
  - V118.1
blocked_by:
  - Produktfokus-Gate: neben V131 mindestens ein weiterer Produktblock aus V106, V113 oder V118 abgeschlossen
  - Nutzungs-Evidence fuer autopilot:plan, Plan-Dashboard und Graph-RAG-Viewer dokumentiert oder Meta-Moratorium explizit durch User aufgehoben
affected_area: ai-plan-autopilot
scope_files:
  - package.json
  - scripts/plan-autopilot.mjs
  - scripts/plan-autopilot/isolated-pilot.mjs
  - scripts/plan-autopilot/git-worktree.mjs
  - scripts/prompts/plan-autopilot-subphase.md
  - data/contracts/plan-autopilot-worker-output.v1.json
  - tests/plan-autopilot.contract.test.mjs
  - tests/plan-autopilot-isolated-pilot.contract.test.mjs
  - .agents/rules/planning_and_governance.md
  - docs/plaene/aktiv/V147.md
  - docs/plaene/CHANGELOG.md
verification:
  - node --test tests/plan-autopilot.contract.test.mjs tests/plan-autopilot-isolated-pilot.contract.test.mjs
  - npm run plan:check
  - npm run check:plan-evidence-claims
  - npm run gates:pre-commit
updated_at: 2026-06-11
---

# Feature: Plan-Autopilot isolierter Ein-Slice-Pilot

Status: Intake-Entwurf. Manuelle Uebernahme in `docs/Umsetzungsplan.md` und `docs/plaene/aktiv/V147.md` erforderlich.

## Kurzfassung

Der eingefrorene V145-Live-Executor wird nicht einfach wieder eingeschaltet. Stattdessen entsteht ein expliziter Pilotmodus, der genau eine vom User benannte D2-Subphase in einem separaten, sauberen Git-Worktree auf dem committed `HEAD` ausfuehrt.

Der Pilot darf weder automatisch mergen noch cherry-picken, den Haupt-Worktree bereinigen oder einen zweiten Slice starten. Ergebnis sind ein verifizierter Commit, ein Review-Bericht und ein weiterhin vorhandener isolierter Worktree. Erst nach manueller Entscheidung wird das Ergebnis uebernommen oder verworfen.

## Produktfokus

Die Arbeit verbessert nicht direkt das Spiel, sondern verwaltet die Ausfuehrung geplanter Arbeit. Sie ist nur gerechtfertigt, wenn sie nachweislich manuelle Koordination reduziert und Produktbloecke schneller abschliessbar macht.

Darum gilt:

- Kein Start vor dem oben genannten Produktfokus-Gate oder einer expliziten User-Aufhebung des Meta-Moratoriums.
- Kein Ausbau ueber einen Slice, bevor drei echte Piloten auf mindestens zwei Produktbloecken erfolgreich waren.
- Wenn der Pilot hauptsaechlich neue Governance-Pflege erzeugt, bleibt der Executor eingefroren.

## Ausgangslage

Baseline vom 2026-06-11:

- `autopilot:run` wurde am 2026-06-10 entfernt; erlaubt ist nur `npm run autopilot:plan`.
- Der Runner blockiert derzeit bei jedem Dirty-Worktree, auch wenn die Aenderungen disjunkt zum Kandidatenscope sind.
- Der aktuelle Dry-run findet 12 offene Kandidaten, parkt aber alle wegen `missing_ai_gate`; zusaetzlich liegt ein globaler `dirty_worktree`-Stopp vor.
- `validatePostWorkerGitState()` prueft bereits Commit-Existenz, Commit-Dateien, Worker-`changedFiles` und verbleibende Dirty-Dateien.
- `scripts/plan-autopilot.mjs` hat 1508 Zeilen. Die V145-Abschlussnotiz verlangt eine Modul-Extraktion vor mehr als einem echten Live-Pilot oder `--max-slices>1`.

## Ziel

- Einen expliziten Befehl `npm run autopilot:pilot` fuer genau einen isolierten D2-Slice bereitstellen.
- Fremde, disjunkte Aenderungen im Haupt-Worktree nicht mehr pauschal als technischen Blocker behandeln.
- Governance- oder Scope-Drift weiterhin konservativ blockieren.
- Fehlende AI-Matrizen nicht durch breite AUTO-Inferenz ersetzen.
- Einen verifizierbaren Review-Handoff ohne Auto-Merge erzeugen.
- Nach drei Piloten anhand messbarer Evidence ueber Beibehalten, Ausbau oder erneuten Freeze entscheiden.

## Nicht-Ziele

- Kein allgemeines `autopilot:run`.
- Kein automatisches Auswaehlen und Ausfuehren beliebiger `missing_ai_gate`-Kandidaten.
- Kein Auto-Merge, Auto-Cherry-Pick, Auto-Rebase oder Push.
- Kein `git stash`, `git clean`, `git reset --hard`, Auto-Revert oder Aufraeumen fremder Aenderungen.
- Kein automatisches Entfernen eines Dirty- oder noch nicht entschiedenen Pilot-Worktrees.
- Keine D3-/D4-, Governance-, Master-, Aktivplan-, Delete-, Move-, Rebuild- oder produktive Parameter-Aenderung durch den Worker.
- Kein zweiter Slice und keine parallelen Worker.
- Keine nachtraegliche AI-Matrix-Pflege in allen offenen Plaenen nur zur Runner-Auslastung.

## Betriebsvertrag

Vorgesehener Aufruf:

```powershell
npm run autopilot:pilot -- --block=V118 --subphase=118.1.1 --max-slices=1 --mode=auto-d2-review
```

Pflichtbedingungen:

1. `--block`, `--subphase`, `--max-slices=1` und `--mode=auto-d2-review` sind explizit gesetzt.
2. Der Zielblock und die Zielsubphase existieren auf dem committed `HEAD`.
3. Der Kandidat ist hoechstens D2 und enthaelt keine roten Signale.
4. `allowedFiles` sind konkret; breite Globs, Governance-, Master-, Aktivplan-, Delete-/Move- oder produktive Parameter-Surfaces parken den Pilot.
5. Die geplanten Checks sind konkret und koennen im isolierten Worktree ausgefuehrt werden.
6. Dirty-Dateien im Haupt-Worktree werden gegen Auswahlinputs und Kandidatenscope verglichen:
   - disjunkt: im Bericht sichtbar, aber kein technischer Stopp;
   - Overlap mit Master, Zielplan, Plan-Index, Lock-/Scope-Inputs oder `allowedFiles`: Stopp `host_scope_overlap`.
7. Der Worker arbeitet in einem detached Worktree unter `tmp/plan-autopilot/runs/<run-id>/repo` auf dem vorab festgehaltenen `HEAD`.
8. Der Worker darf genau einen Commit erzeugen. Der Commit und seine Dateien werden mit Git verifiziert.
9. Der isolierte Worktree bleibt bis zur manuellen Review-Entscheidung bestehen.
10. Das Tool integriert nichts in den Haupt-Worktree und veraendert keinen Branch-Zeiger.

## Ergebnisvertrag

Der Pilotbericht nennt mindestens:

- `runId`, Ausgangs-`HEAD`, Worktree-Pfad;
- Block, Phase, Subphase, Decision und Gate-Ableitung;
- Host-Dirty-Dateien sowie Overlap-Klassifikation;
- erlaubte, gemeldete und tatsaechlich commitete Dateien;
- Checks und `notChecked`;
- Commit-Hash und Git-Verifikation;
- geparkte Gates und Stop-Grund;
- manuelle Optionen: Review fortsetzen, Commit gezielt uebernehmen oder Pilot verwerfen.

Ein `completed`-Ergebnis bedeutet nur: Der isolierte Slice ist technisch verifiziert und reviewbereit. Es bedeutet nicht, dass er in `main` integriert oder die Planphase abgeschlossen ist.

## Gate-Ableitung ohne AI-Matrix

Fehlende AI-Gates werden nicht allgemein zu `AUTO`.

| Fall | Pilotentscheidung |
| --- | --- |
| Explizites `AUTO`, D0/D1, read-only | weiterhin fuer Report-/Plan-Modus geeignet |
| Explizites `REVIEW`, D2 | nur mit exakt benanntem User-Aufruf und Pilotvertrag |
| Kein Gate, aber exakt benannter D2-Slice mit konkretem Scope und Checks | `pilot-review-required`; nur der explizite Pilotaufruf darf fortfahren |
| Unklare Decision, breite Globs, hohe Auswirkung oder fehlende Checks | parken |
| D3, D4, `USER-GATE`, Governance, Master-/Aktivplan-Edit, Delete/Move, Rebuild/Reborn | immer parken |

## Architecture Acceptance

| Bereich | Entscheidung |
| --- | --- |
| Betroffene Schichten | Repo-lokales Plan-/Agent-Tooling und Git-Isolation; keine Runtime-, UI-, Gameplay-, Android-, Electron-Produkt- oder Bot-Training-Logik. |
| Erlaubte Zielpfade | `package.json`, Autopilot-Entry-Point, neue Module unter `scripts/plan-autopilot/`, Worker-Prompt/-Contract, gezielte Contract-Tests, V147-Plan-/Changelog-Evidence und die explizite Governance-Regel. |
| Verbotene Legacy-Surfaces | Keine produktiven `src/`-, `android-classic/`-, `electron/`- oder Bot-Training-Aenderungen; kein neuer globaler Agenten-Default. |
| Neue/veraenderte Dependency-Kanten | Entry-Point delegiert Worktree-Lifecycle und Pilot-Orchestrierung an kleine Module; Git-Kommandos bleiben argumentbasiert ueber `execFile`/`spawn`, ohne Shell-String-Aufbau. |
| Contract-Erweiterung | Pilotbericht ergaenzt Run-ID, Ausgangs-HEAD, Worktree-Pfad und Host-Overlap; Worker-Output bleibt One-Slice-JSON. |
| Guard-Signal | Gezielte Contract-Tests fuer Worktree-Erzeugung, Overlap, Commit-Verifikation, Retention und No-Merge; danach Plan-/Governance-Gates. |
| Ratchet-Auswirkung | `scripts/plan-autopilot.mjs` nimmt keine neue Worktree-Verantwortung auf; neue Logik wird vor dem ersten echten Pilot extrahiert. |

## Responsibility-Growth-Matrix

| Surface | Bestehende Verantwortung | Neue Verantwortung | Ziel |
| --- | --- | --- | --- |
| `scripts/plan-autopilot.mjs` | CLI, Kandidatenauswahl, Gate-Policy, Worker-Aufruf, Git-Nachpruefung, Bericht | nur Wiring fuer `pilot` | Datei darf durch den Pilot nicht substanziell weiter wachsen |
| `scripts/plan-autopilot/isolated-pilot.mjs` | neu | Pilot-Zustandsmaschine, Host-Overlap, Handoff-Bericht | testbare Orchestrierung ohne Auswahlparser-Duplizierung |
| `scripts/plan-autopilot/git-worktree.mjs` | neu | detached Worktree anlegen, Zustand lesen, Retention melden | keine automatische Entfernung oder Bereinigung |
| Contract-Tests | Fake-Executor und Worker-/Git-Vertrag | echte Temp-Repo-/Worktree-Fixtures | Isolation und No-Merge beweisen |

Vorher-/Nachher-Evidence:

- Zeilenzahl und Exportliste von `scripts/plan-autopilot.mjs`;
- neue Modulgrenzen und Import-Richtung;
- keine neue produktive Runtime-Kante;
- kein doppelter Gate-Parser in den neuen Modulen.

## AI-Ausfuehrungsmatrix

| Arbeit | Decision | Gate |
| --- | --- | --- |
| Baseline, Dry-run-Auswertung, Temp-Repo-Tests | D0/D1 | `[AUTO]` |
| Modul-Extraktion, Pilot-Orchestrierung und Contract-Tests im genehmigten V147-Scope | D2 | `[REVIEW]` nach V147-D3-Intake-Gate |
| `autopilot:pilot` npm-Script | D2 | `[REVIEW]` |
| Aenderung der Report-only-Regel fuer exakt den Pilotmodus | D3 | `[USER-GATE]` |
| Echter Ein-Slice-Pilot | D2/D3 | `[USER-GATE]`, expliziter Block und Subphase |
| Auto-Merge, Cleanup eines Dirty-Worktrees, Branch-/History-Operationen | D4 | Nicht-Ziel |

## Definition of Done

- [ ] DoD.1 Der Report-Modus bleibt unveraendert nutzbar.
- [ ] DoD.2 `autopilot:pilot` verlangt expliziten Block, Subphase und `--max-slices=1`.
- [ ] DoD.3 Der Pilot laeuft in einem separaten Worktree auf festgehaltenem `HEAD`.
- [ ] DoD.4 Disjunkte Host-Aenderungen werden berichtet, aber blockieren nicht; relevante Overlaps blockieren vor Worker-Start.
- [ ] DoD.5 `missing_ai_gate` wird nur fuer einen explizit benannten, konservativ validierten D2-Slice zu `pilot-review-required`.
- [ ] DoD.6 D3, D4, `USER-GATE`, Governance, Master-/Aktivplan-Edits, Deletes/Moves, Rebuilds und produktive Parameter bleiben technisch geblockt.
- [ ] DoD.7 Der Worker erzeugt hoechstens einen verifizierten Commit und hinterlaesst keine uncommitteten Dateien.
- [ ] DoD.8 Es gibt kein Auto-Merge, Auto-Cherry-Pick, Push oder automatisches Worktree-Entfernen.
- [ ] DoD.9 Drei echte Piloten auf mindestens zwei Produktbloecken sind mit Nutzen-, Blocker- und Review-Evidence dokumentiert, oder der Block endet bewusst mit `hold` und erneutem Freeze.
- [ ] DoD.10 `scripts/plan-autopilot.mjs` hat die neue Worktree-Verantwortung nicht aufgenommen; die V145-Extraktionsleitplanke ist erfuellt.
- [ ] DoD.99 Abschlussentscheidung lautet explizit `keep-pilot`, `expand-later` oder `freeze-again`.

## Phasen

### 147.0 Intake- und Reaktivierungs-Gate

status: planned
goal: Produktfokus, D3-Scope und Pilotgrenzen vor Code-Aenderungen bestaetigen.
output: Explizite User-Freigabe oder `hold`.

- [ ] 147.0.1 Meta-Moratorium gegen aktuelle Produktblock- und Tool-Nutzungs-Evidence pruefen.
- [ ] 147.0.2 D3-Freigabe fuer Rule-Aenderung, `autopilot:pilot` und genau einen isolierten Pilot einholen.
- [ ] 147.0.3 Dateien als `no-op`, `read-only evidence`, `optional` oder `edit required` klassifizieren; nur `edit required` in die Freigabe aufnehmen.

Gate:

- Keine Implementierung ohne explizite User-Freigabe.

### 147.1 Baseline und Pilotvertrag

status: planned
goal: Aktuelle Blocker und Sicherheitsgrenzen in Tests festhalten.
output: Rote Baseline fuer globalen Dirty-Stopp und fehlende AI-Gates, gruener Pilotvertrag in Fixtures.

- [ ] 147.1.1 Aktuellen Dry-run gegen offene Bloecke erfassen: Kandidaten, `missing_ai_gate`, Dirty- und Scope-Signale.
- [ ] 147.1.2 Temp-Git-Repo-Fixtures fuer disjunkte Host-Aenderung, Host-Overlap, detached Worktree und Worker-Commit anlegen.
- [ ] 147.1.3 Ergebnisvertrag fuer Run-ID, Ausgangs-HEAD, Worktree, Commit und Review-Optionen konkretisieren.

Gate:

- `node --test tests/plan-autopilot.contract.test.mjs tests/plan-autopilot-isolated-pilot.contract.test.mjs`

### 147.2 Modul-Extraktion und Worktree-Isolation

status: planned
goal: Worktree-Lifecycle ausserhalb des 1508-zeiligen Entry-Points implementieren.
output: Kleine, testbare Pilot- und Git-Module.

- [ ] 147.2.1 Bestehende Runner-/Git-Helfer inventarisieren und nur die fuer Isolation noetigen Verantwortungen extrahieren.
- [ ] 147.2.2 Detached Worktree auf festgehaltenem `HEAD` unter run-spezifischem `tmp/`-Pfad anlegen.
- [ ] 147.2.3 Kein automatisches Remove/Clean implementieren; Retention und manuellen Review-Pfad berichten.
- [ ] 147.2.4 Entry-Point nur um Argumente und Delegation erweitern; Vorher-/Nachher-Zeilenzahl dokumentieren.

Gate:

- `node --test tests/plan-autopilot-isolated-pilot.contract.test.mjs`

### 147.3 Scope- und Gate-Policy

status: planned
goal: Disjunkte Host-Arbeit erlauben, relevante Drift und unsichere Kandidaten weiter blockieren.
output: Deterministische Eligibility- und Overlap-Entscheidung.

- [ ] 147.3.1 Host-Dirty-Dateien gegen Master, Zielplan, Plan-Index, Lock-/Scope-Inputs und `allowedFiles` klassifizieren.
- [ ] 147.3.2 `pilot-review-required` nur fuer explizit benannte D2-Slices mit konkreten Dateien und Checks erlauben.
- [ ] 147.3.3 Globs, Governance-Surfaces, Master-/Aktivplan-Edits, Deletes/Moves, produktive Parameter und rote Signale technisch parken.
- [ ] 147.3.4 Bestehende `validatePostWorkerGitState()`-Pruefung fuer isolierten Worktree wiederverwenden.

Gate:

- `node --test tests/plan-autopilot.contract.test.mjs tests/plan-autopilot-isolated-pilot.contract.test.mjs`

### 147.4 CLI, Bericht und Fake-Pilot

status: planned
goal: Den gesamten Ein-Slice-Ablauf ohne echten Codex-Worker beweisen.
output: `autopilot:pilot` mit Fake-Executor und Review-Bericht.

- [ ] 147.4.1 `autopilot:pilot` mit Pflichtargumenten und hartem `--max-slices=1` verdrahten.
- [ ] 147.4.2 Fake-Pilot fuer `completed`, `gate_required`, `blocked`, `no_change`, Scope-Verletzung und Host-Overlap ausfuehren.
- [ ] 147.4.3 Beweisen, dass Haupt-Worktree, Branch-Zeiger und fremde Aenderungen unveraendert bleiben.
- [ ] 147.4.4 Report-only-Regel nur fuer den exakt begrenzten Pilotmodus anpassen; allgemeiner Live-Executor bleibt eingefroren.

Gate:

- `node --test tests/plan-autopilot.contract.test.mjs tests/plan-autopilot-isolated-pilot.contract.test.mjs`
- `npm run plan:check`
- `npm run check:plan-evidence-claims`

### 147.5 Echter Ein-Slice-Pilot

status: planned
goal: Einen kleinen Produktblock-Slice isoliert ausfuehren und manuell reviewen.
output: Ein verifizierter, nicht integrierter Commit oder blockerfester Stop.

- [ ] 147.5.1 User waehlt explizit einen kleinen D2-Slice aus V106, V113 oder V118.
- [ ] 147.5.2 Pilot mit Codex-Executor starten; Worktree-Pfad und Ausgangs-HEAD protokollieren.
- [ ] 147.5.3 Diff, Checks, Commit, `notChecked`, Host-Overlap und geparkte Gates manuell reviewen.
- [ ] 147.5.4 Ergebnis nur nach separater User-Entscheidung gezielt uebernehmen; der Pilot selbst integriert nichts.

Gate:

- Explizite User-Entscheidung zum Pilotstart.
- Explizite separate User-Entscheidung zur Uebernahme oder Verwerfung.

### 147.6 Nutzwert-Pilotreihe

status: planned
goal: Nutzen und Fehlalarme vor jedem Ausbau messen.
output: Drei Pilotberichte auf mindestens zwei Produktbloecken oder `hold`.

- [ ] 147.6.1 Insgesamt drei echte Ein-Slice-Piloten dokumentieren.
- [ ] 147.6.2 Mindestens zwei verschiedene Produktbloecke abdecken.
- [ ] 147.6.3 Messen: Start-zu-Review-Zeit, manuelle Eingriffe, Scope-/Gate-Stopps, erfolgreiche Commit-Verifikation und tatsaechlich uebernommene Ergebnisse.
- [ ] 147.6.4 Bei Scope-Verletzung, Governance-Bypass oder zwei nutzlosen/fehlerhaften Piloten sofort `freeze-again`.

Ausbaukriterien:

- null Scope-Verletzungen;
- null D3/D4-/USER-GATE-Bypasses;
- alle `completed`-Commits Git-verifiziert;
- mindestens zwei der drei Ergebnisse nach Review fachlich uebernommen;
- dokumentierter Zeit- oder Koordinationsgewinn gegen manuelle Ausfuehrung.

### 147.99 Abschlussentscheidung

status: planned
goal: Pilotbetrieb bewusst beibehalten, spaeter erweitern oder erneut einfrieren.
output: Evidence, scoped Commit und eindeutige Governance-Entscheidung.

- [ ] 147.99.1 Alle vorherigen Phasen sind abgeschlossen oder blockerfest als `hold` dokumentiert.
- [ ] 147.99.2 Gezielte Contract-Tests und `npm run gates:pre-commit` sind gruen.
- [ ] 147.99.3 Haupt-Worktree-/Branch-Unveraendertheit und No-Merge-Vertrag sind belegt.
- [ ] 147.99.4 Entscheidung `keep-pilot`, `expand-later` oder `freeze-again` ist mit Nutzwert-Evidence begruendet.
- [ ] 147.99.5 `--max-slices>1`, automatische Integration und parallele Worker bleiben separate spaetere D3/D4-Entscheidungen.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| Isolation umgeht aktuelle, noch uncommittete Planwahrheit. | hoch | Auf committed `HEAD` arbeiten; Overlap mit Master, Zielplan und Auswahlinputs blockiert. |
| Fehlendes AI-Gate wird zu grosszuegig interpretiert. | hoch | Nur exakt adressierter D2-Slice; konkrete Dateien/Checks; unklar bleibt geparkt. |
| Detached Commit geht verloren. | mittel | Worktree bis zur manuellen Entscheidung behalten; Commit und Pfad im Bericht ausgeben; kein Auto-Remove. |
| Worktrees sammeln sich an. | mittel | Run-Inventar berichten; Cleanup bleibt bewusste Folgeentscheidung und darf Dirty-Worktrees nie automatisch entfernen. |
| Entry-Point wird zum groesseren God-Script. | hoch | Worktree- und Pilot-Orchestrierung vor dem echten Pilot extrahieren; Zeilen-/Export-Evidence. |
| Tool erzeugt mehr Meta-Arbeit als Nutzen. | hoch | Produktfokus-Gate, drei Piloten, messbarer Uebernahme-/Zeitnutzen, sonst `freeze-again`. |
| Pilotcommit kollidiert spaeter mit Haupt-Worktree-Aenderungen. | mittel | Kein Auto-Merge; Review und gezielte manuelle Uebernahme erst nach aktuellem Diff-/Konfliktcheck. |

## Alternativen

| Alternative | Bewertung |
| --- | --- |
| Nur `autopilot:run` wieder in `package.json` eintragen | Verworfen: globaler Dirty-Stopp und `missing_ai_gate` bleiben; keine Isolation. |
| Dirty-Dateien im Haupt-Worktree pauschal ignorieren | Verworfen: Plan-/Scope-Drift und spaetere Commit-Kollisionen waeren unsichtbar. |
| Alle offenen Plaene mit AI-Matrizen nachpflegen | Verworfen: hohe Governance-Pflege ohne belegten Produktnutzen. |
| Pro Pilot einen neuen Branch anlegen | Vorerst verworfen: Repo-Policy bevorzugt `main`; Branch-Betrieb braeuchte zusaetzliche Freigabe und Lifecycle-Governance. |
| Executor dauerhaft Report-only lassen | Gueltige Rueckfalloption, falls Produktfokus-Gate oder Pilotnutzen nicht erreicht wird. |

## Intake-Hinweis

- Ziel-Master: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V147`
- Geplante aktive Datei: `docs/plaene/aktiv/V147.md`
- Harte Dependencies: `V117.99`, `V145.99`
- Soft Dependency: ein kleiner geeigneter Produkt-Slice, bevorzugt aus `V118`
- Blocker: Produktfokus- und Tool-Nutzungs-Gate aus `Handlungsempfehlungen_Meta_Quote_Reduktion.md`
- Decision: D3, weil die bindende Report-only-Regel gezielt fuer einen Live-Pilot angepasst wird
- Manuelle Uebernahme erforderlich; dieser Draft veraendert weder Master noch aktive Planstruktur.

Graph: `impact-for-file scripts/plan-autopilot.mjs` und `scope-collisions`, hohe Confidence fuer V145-Zuordnung und keine aktive VXX-Scope-Kollision.

RAG: skipped; aktuelle Regel, V145-Abschlussakte, Code und Git-Historie reichen als Source-backed Evidence.

Source-of-truth: `.agents/rules/planning_and_governance.md`, `docs/Umsetzungsplan.md`, `docs/plaene/alt/V145.md`, `scripts/plan-autopilot.mjs`, Git.
