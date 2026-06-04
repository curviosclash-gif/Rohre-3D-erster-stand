---
title: Graph-Drift-Guard-Automatisierung
status: draft
planned_block_id: V142
priority: P2
owner: frei
intake_rule: not-yet-in-master
decision_class: D3
target_master: docs/Umsetzungsplan.md
plan_file: docs/plaene/aktiv/V142.md
depends_on:
  - V94.99
  - V116.99
  - V123.99
  - V138.99
soft_depends_on:
  - V141.99
blocked_by: []
affected_area: graph-drift-guard
scope_files:
  - docs/plaene/neu/Feature_Graph_Drift_Guard_Automatisierung_V142.md
  - package.json
  - .husky/pre-commit
  - .github/workflows/ci.yml
  - scripts/build-knowledge-graph.mjs
  - scripts/check-knowledge-graph.mjs
  - scripts/check-knowledge-graph-sync.mjs
  - scripts/gates-pre-commit.mjs
  - tests/knowledge-graph-sync.contract.test.mjs
  - docs/plaene/aktiv/V77.md
verification:
  - npm run graph:build
  - npm run graph:check
  - npm run plan:check
  - npm run check:plan-evidence-claims
  - node --test tests/knowledge-graph-sync.contract.test.mjs
  - npm run gates:pre-commit
updated_at: 2026-06-04
---

# Graph-Drift-Guard-Automatisierung (V142)

Status: Draft, noch nicht in `docs/Umsetzungsplan.md` aufnehmen.

## Intake-Zusammenfassung

V142 verhindert, dass Knowledge-Graph-Artefakte nach plan-, graph- oder file-inventory-relevanten Aenderungen stale eingecheckt werden. Der Block fuehrt ein schmales CI-Fangnetz und einen lokalen staged-sicheren Guard ein, der Graph-Drift meldet, aber keine Dateien automatisch staged, reverted oder in Master-/Aktivplaene uebernimmt.

Der Anlass ist der Drift vom 2026-06-04: Commit `61f68d03` fuegte den neuen V141-Draft unter `docs/plaene/neu/` hinzu, waehrend die Graph-Artefakte erst in `12c4f8fe` nachgezogen wurden. Der neue Draft wurde nicht als aktiver V141-Block gelesen, sondern durch den abgeschlossenen V77-Glob `docs/plaene/**` als V77-Scope-Datei materialisiert. Das war ein plausibler Build-Sync, aber der fehlende Gate-Fang machte den Drift erst nachtraeglich sichtbar.

## Ziel

- `graph:check` in CI verpflichtend machen, damit stale Graph-Artefakte nicht unbemerkt auf `main` oder in PRs landen.
- Einen lokalen `graph:sync:check`-Pfad planen, der nur bei staged graph-relevanten Aenderungen anspringt.
- Der Guard soll `graph:build`/Buildvergleich ausfuehren und klar melden, welche Generated-Artefakte nachgezogen und bewusst gestaged werden muessen.
- Neue aktive uncovered Files sollen als Blocker oder mindestens als klarer Fail-Code sichtbar werden.
- Untracked- und unstaged-Dateien duerfen den Commit-Guard nicht zufaellig verfaelschen; ihr Umgang wird explizit modelliert.
- Breite Scope-Globs in abgeschlossenen Bloecken werden als eigenes Risiko erkannt und mit einem separaten User-Gate behandelt.

## Nicht-Ziel

- Keine automatische Staging-, Commit-, Revert- oder Master-Index-Aktion.
- Keine automatische Uebernahme dieses Drafts in `docs/Umsetzungsplan.md` oder `docs/plaene/aktiv/V142.md`.
- Keine produktiven Runtime-, Spiel-, Physik-, Bot-Training- oder Multiplayer-Aenderungen.
- Kein Ersatz von `docs/generated/knowledge-graph.json` als generiertem Artefakt durch eine manuelle Quelle.
- Keine pauschale Bereinigung aller alten breiten `scope_files`-Globs ohne eigene Evidence und User-Freigabe.
- Keine harte Blockierung historischer Altfaelle, bevor die Warn-/Fail-Politik kalibriert ist.

## Quellen und Baseline

- `git diff --name-only 61f68d03^ 61f68d03 -> PASS`: nur `docs/plaene/neu/Feature_Finding_Plan_Doku_Drift_Automatisierung_V141.md` wurde hinzugefuegt.
- `git diff --name-only 61f68d03 12c4f8fe -- docs/generated/knowledge-graph*.json -> PASS`: Drift-Sync betraf `knowledge-graph.json` und `knowledge-graph.coverage.json`.
- `npm run graph:check -> PASS`: aktueller Graph ist nach Sync gruen.
- `node scripts/query-knowledge-graph.mjs scope-collisions --json -> WARN`: bestehende Kollisionen V106/V113 und V113/V96 sind unrelated zu V142.
- `node scripts/query-knowledge-graph.mjs impact-for-file docs/plaene/neu/Feature_Finding_Plan_Doku_Drift_Automatisierung_V141.md --json -> PASS`: Datei ist nur ueber V77-Scope covered, ohne Runtime-/Critical-Path-Bezug.

Graph: `scope-collisions`, `impact-for-file`, `graph:check`; Confidence: graph-high.  
RAG: skipped, harte Fakten kamen aus Git, Graph und Code.  
Source-of-truth: Git + Graph + Code.

## Scope-Klassifikation

| Pfad/Oberflaeche | Klasse | Regel |
| --- | --- | --- |
| `docs/plaene/neu/Feature_Graph_Drift_Guard_Automatisierung_V142.md` | edit required | Dieser Intake-Draft; keine Master-/Aktivplan-Autoritaet. |
| `package.json` | edit required nach Intake | Script `graph:sync:check` oder gleichwertiger Gate-Alias. |
| `scripts/check-knowledge-graph-sync.mjs` | edit required nach Intake | Staged-sicherer Guard, klare Fehlercodes, keine Auto-Staging-Aktion. |
| `tests/knowledge-graph-sync.contract.test.mjs` | edit required nach Intake | Contract-Tests fuer Trigger, Diff, Generated-Dateien und Untracked-Semantik. |
| `.github/workflows/ci.yml` | edit required nach Intake | CI fuehrt `npm run graph:check` oder den neuen Guard in sauberem Checkout aus. |
| `.husky/pre-commit` | optional, D3-gated | Lokaler Komfort-Guard nur fuer relevante staged Pfade; kein Ersatz fuer CI. |
| `scripts/build-knowledge-graph.mjs` | optional, D3-gated | Nur falls ein `--tracked-only`/`--index`-Modus noetig wird. |
| `scripts/check-knowledge-graph.mjs` | optional, D3-gated | Nur falls der bestehende Diff-Check wiederverwendbar parametrisiert wird. |
| `scripts/gates-pre-commit.mjs` | optional, D3-gated | Nur wenn Meta-Gate-Reihenfolge oder Dokumentation angepasst werden muss. |
| `docs/plaene/aktiv/V77.md` | optional, USER-GATE | Done-Glob-Freeze oder Scope-Snapshot ist Plan-/Governance-Semantik und wird nicht mechanisch editiert. |

## Architektur-Akzeptanz

| Thema | Erwartung |
| --- | --- |
| Betroffene Schichten | Repo-Tooling, CI/Husky-Gates, Knowledge-Graph-Generator, Plan-Governance. |
| Erlaubte Zielpfade | `scripts/check-knowledge-graph-sync.mjs`, schmale Tests, `package.json`-Script, CI-/Hook-Einhaengung. |
| Verbotene Legacy-/Risk-Surfaces | Kein Auto-Stage, kein `git reset`, kein automatisches Editieren von Master, aktiven Plaenen, Rules oder Workflows. |
| Neue/veraenderte Dependency-Kanten | CI/Hook -> `graph:sync:check`; `graph:sync:check` -> `graph:build`/Generated-Diff; optional `graph:check` -> staged-safe Buildmodus. |
| Contract-/Snapshot-Erweiterung | Contract-Test deckt staged Inputs, generated-only Diff, scorecard/schema Nicht-Aenderung und neue uncovered active Files ab. |
| Guard-Signal | `npm run graph:sync:check`, `npm run graph:check`, CI-Graph-Step, `npm run gates:pre-commit`. |
| Ratchet-Auswirkung | Additiv; kein bestehendes Graph-, Plan-, Docs- oder Architecture-Gate wird abgeschwaecht. |

## AI-Ausfuehrungsmatrix

| Schrittklasse | Markierung | Regel |
| --- | --- | --- |
| Read-only Driftanalyse, Graph-Queries, Commit-Diff-Pruefung | `[AUTO]` | Darf ohne Rueckfrage laufen. |
| Neues Guard-Script, Tests, package-Script, CI-Step | `[REVIEW]` | Umsetzung erst nach User-Intake in den aktiven Block; Diff klein und scoped. |
| `.husky/pre-commit`-Aenderung | `[REVIEW]` | Erlaubt nach Intake, wenn CI-Fangnetz zuerst oder parallel steht. |
| `docs/plaene/aktiv/V77.md`, Master, AGENTS, Rules, Workflows | `[USER-GATE]` | Immer explizite Freigabe mit Blast-Radius und Alternative. |
| Auto-Stage, Auto-Revert, Auto-Move oder History-Operationen | `[USER-GATE]` | Standardpfad ist Verbot/Deferred, nicht Implementierung. |

## Definition of Done

- [ ] DoD.1 CI enthaelt ein Graph-Drift-Gate (`graph:check` oder `graph:sync:check`) in sauberem Checkout.
- [ ] DoD.2 Lokaler Guard triggert nur bei staged graph-relevanten Quellen: `docs/plaene/**`, `docs/Umsetzungsplan.md`, `data/contracts/knowledge-graph/**`, relevante Graph-Skripte, `package.json`, CI-/Hook-Gate-Dateien.
- [ ] DoD.3 Guard meldet Generated-Diff fuer `docs/generated/knowledge-graph.json`, `docs/generated/knowledge-graph.coverage.json`, `docs/generated/knowledge-graph.scorecard.json` und optional `docs/generated/knowledge-graph.schema.json` getrennt.
- [ ] DoD.4 Guard staged nichts automatisch und gibt eine klare manuelle Recovery aus: Build laufen lassen, Generated-Diff pruefen, bewusst stagen oder Befund melden.
- [ ] DoD.5 Untracked/unstaged Semantik ist explizit: pre-commit prueft Commit-Scope, manuelle Diagnose darf optional untracked einschliessen.
- [ ] DoD.6 Neue aktive uncovered Files werden mit Pfadliste und Fail-Code sichtbar.
- [ ] DoD.7 Breite Globs in `done`-Bloecken werden mindestens als Warnklasse berichtet oder als separater User-Gate-Freeze dokumentiert.
- [ ] DoD.8 Contract-Tests decken positiven Sync, fehlenden Generated-Sync, unrelated staged Files und untracked-noise ab.
- [ ] DoD.9 `npm run graph:build`, `npm run graph:check`, `npm run plan:check` und der neue Guard sind gruen oder blockerfest dokumentiert.
- [ ] DoD.99 Abschlussnotiz nennt CI-Schutz, lokalen Schutz, nicht automatisierte User-Gates, verbleibende Done-Glob-Risiken und Recovery-Schritte.

## Phasen

### 142.1 Baseline und Trigger-Modell

- [ ] 142.1.1 Aktuelle Drift-Ursache als Regression-Fall festhalten: V141-Draft + V77-Glob + fehlender Graph-Sync im selben Commit.
- [ ] 142.1.2 Graph-Input-Klassen inventarisieren: Plan-/Master-Dateien, Mapping-Contracts, Graph-Skripte, Repo-File-Inventar, Hotspot-Overlay.
- [ ] 142.1.3 Staged-vs-untracked Semantik entscheiden: lokaler Commit-Guard darf nicht durch ungestagte Scratch-Dateien blockieren.
- [ ] 142.1.4 Baseline-Kommandos ausfuehren: `git status --short`, `npm run graph:check`, `node scripts/query-knowledge-graph.mjs scope-collisions --json`.

### 142.2 Staged-sicherer Graph-Sync-Guard

- [ ] 142.2.1 `scripts/check-knowledge-graph-sync.mjs` oder gleichwertigen Modus entwerfen: staged Input erkennen, Buildvergleich ausfuehren, Generated-Diff klassifizieren.
- [ ] 142.2.2 Fehlercodes definieren: `GRAPH_SYNC_REQUIRED`, `GRAPH_GENERATED_UNSTAGED`, `GRAPH_NEW_ACTIVE_UNCOVERED`, `GRAPH_UNTRACKED_NOISE_WARN`.
- [ ] 142.2.3 Guard-Ausgabe kurz halten: betroffene Generated-Dateien, naechster Command, bewusst kein Auto-Stage.
- [ ] 142.2.4 `package.json`-Script `graph:sync:check` oder gleichwertigen Alias einhaengen.

### 142.3 CI- und Hook-Fangnetz

- [ ] 142.3.1 `.github/workflows/ci.yml` um Graph-Gate ergaenzen; CI ist primaeres unverfaelschtes Fangnetz.
- [ ] 142.3.2 `.husky/pre-commit` nur fuer relevante staged Pfade um lokalen Graph-Guard ergaenzen.
- [ ] 142.3.3 Bestehendes `gates:pre-commit` nicht verdoppeln; Reihenfolge und Kosten dokumentieren.
- [ ] 142.3.4 Bypass-Regel `.husky/.bypass` respektieren; CI bleibt unabhaengiges Gegengewicht.

### 142.4 Done-Glob- und Coverage-Risiko

- [ ] 142.4.1 Breite Globs in `done`-Bloecken erkennen, mindestens `docs/plaene/**` aus V77 als Referenzfall.
- [ ] 142.4.2 Entscheidungsvorschlag erarbeiten: Warnklasse, Snapshot/Frozen-Scope, oder explizites Beibehalten mit dokumentiertem Grund.
- [ ] 142.4.3 Keine Aenderung an `docs/plaene/aktiv/V77.md` ohne separaten User-Gate.
- [ ] 142.4.4 Coverage-Baseline pruefen: neue aktive uncovered Files muessen als Fail oder klare Warnung erscheinen.

### 142.99 Abschluss-Gate

- [ ] 142.99.1 `npm run graph:build` -> PASS oder blockerfest dokumentiert.
- [ ] 142.99.2 `npm run graph:check` -> PASS.
- [ ] 142.99.3 `npm run graph:sync:check` oder finaler Alias -> PASS fuer sauberen Scope und FAIL im absichtlich simulierten Drift-Fall.
- [ ] 142.99.4 `node --test tests/knowledge-graph-sync.contract.test.mjs` -> PASS.
- [ ] 142.99.5 `npm run plan:check` und `npm run check:plan-evidence-claims` -> PASS.
- [ ] 142.99.6 `npm run gates:pre-commit` -> PASS oder begruendeter, fremder Blocker mit Recovery.
- [ ] 142.99.7 Abschlussnotiz nennt: CI-Gate, Hook-Gate, untracked Semantik, Done-Glob-Entscheidung, verbleibende Risiken und Nicht-Ziele.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| Lokaler Hook blockiert wegen untracked Scratch-Dateien | mittel | Staged-/index-sicheren Modus fuer pre-commit; untracked nur als manuelle Diagnose. |
| Guard staged Generated-Dateien heimlich und verschleiert Diff | hoch | Auto-Stage bleibt Nicht-Ziel; Guard bricht mit klarer Handlungsanweisung ab. |
| CI und lokaler Hook pruefen unterschiedliche Semantik | mittel | CI als sauberes Fangnetz; lokaler Hook nur Komfort. Contract-Test dokumentiert beide Modi. |
| Done-Block mit breitem Glob waechst weiter | mittel | Warnklasse oder expliziter Freeze-Pfad; V77-Aenderung nur per User-Gate. |
| Voller `gates:pre-commit` wird fuer kleine Plan-Drafts zu schwer | mittel | Targeted `graph:sync:check` statt pauschalem Meta-Gate im Hook. |
| Neue aktive uncovered Files werden im Build-Sync mitgeschleppt | hoch | Guard liest Coverage-Gate und meldet Pfadliste als Fail. |
| V141 und V142 ueberlappen begrifflich | niedrig | V141 bleibt Finding-/Plan-/Doku-Freshness; V142 ist Graph-Generated-Gate und CI/Hook-Schutz. |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V142`
- Vorgeschlagene kanonische Blockdatei nach Intake: `docs/plaene/aktiv/V142.md`
- Arbeitsstrom: `Repo-Pflege & Governance` mit Naehe zu `AI / Graph / Agenten-Werkzeuge`
- Hard dependencies: `V94.99`, `V116.99`, `V123.99`, `V138.99`
- Soft dependencies: `V141.99`
- Decision Class: `D3`, sobald Umsetzung CI-/Hook-/Governance-/Graph-Generator-Regeln oder aktive Plansemantik beruehrt
- Manuelle Uebernahme erforderlich: Master-Zeile und aktive `V142.md` werden nicht durch diesen Draft erzeugt.
- Nicht Teil des Intake: produktive Runtime-Arbeit, automatische Staging-/History-Aktionen, ungegatete Aenderungen an `V77.md`.
