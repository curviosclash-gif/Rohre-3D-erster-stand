---
description: Plan governance, bot-training governance, and blocker reporting (consolidated)
---

<!-- Frontmatter-Feld `trigger:` entfallen ab V93 93.3.3 - Rule-Aktivierung ist nicht maschinell ausgewertet. -->


## Master Plans

- `docs/Umsetzungsplan.md` - compact index only (one row per active block + Abhaengigkeiten, Lock-Status, Conflict-Log).
- `docs/bot-training/Bot_Trainingsplan.md` - sole source for bot-training phases, locks, DoD, risks.
- Do not create plan scopes directly in either master plan. Intake is user-owned.

## Plan Files

- New/revised drafts: `docs/plaene/neu/`
- Canonical active blocks: `docs/plaene/aktiv/VXX.md` (must include DoD, Nicht-Ziel, risk register, phased checklist ending `*.99`)
- Archived plans: `docs/plaene/alt/`
- Every active block row must link to exactly one canonical block file with `scope_files`.

## Phase & Gate Rules

- `*.99` gate may be `[x]` only when all earlier phases are `[x]`.
- Abschluss-Evidence muss nachvollziehbar sein, aber darf kompakt pro Subphase oder Deliverable gebuendelt werden (kein Pflicht-Mikroprotokoll pro Einzel-Checkbox).
- In aktiven Blockplaenen gilt weiterhin mindestens-2-Unterphasen pro Top-Level-Phase (Validator-kompatibel); die Entschlackung erfolgt ueber kompaktere Evidence- und Commit-Slices statt Mikro-Unterteilung.

## AI Execution Gates

- Blockplaene duerfen Phasen oder Arbeitspakete mit `[AUTO]`, `[REVIEW]` und `[USER-GATE]` markieren.
- `[AUTO]`: Read-only-Checks, Reports und explizit konservative Schritte duerfen ohne Rueckfrage laufen, solange keine produktiven oder governance-relevanten Dateien geaendert, geloescht oder verschoben werden.
- `[REVIEW]`: Der Agent darf analysieren, klassifizieren und konkrete Vorschlaege machen, muss aber vor Datei-Aenderungen, Apply-Modi, Planverschiebungen, Master-/Aktivplan-Edits, Governance-Edits oder Code-Aenderungen stoppen und den User fragen.
- `[USER-GATE]`: Der Agent muss vor jeder Umsetzung explizit User-Freigabe einholen; ohne Freigabe nur Bericht oder Planvorschlag.
- Wenn ein Plan eine AI-Ausfuehrungsmatrix enthaelt, gewinnt die strengere Markierung gegen allgemeinere Workflow-Defaults.
- Cleanup-, Archivierungs-, Governance-, Agenten-Kontext-, Rebuild- und Code-Entflechtungsphasen duerfen nicht als vollautomatische Umsetzung interpretiert werden, solange sie `[REVIEW]` oder `[USER-GATE]` enthalten.

## AI Decision Framework

Vor Repo-Aenderungen klassifiziert der Agent Risiko und Reversibilitaet. Die strengere Planmatrix gewinnt immer gegen diese Defaults.

| Klasse | Bedeutung | Default |
| --- | --- | --- |
| `D0` | Read-only: Status lesen, Graph-Abfragen, Reports, Dry-Run | darf laufen |
| `D1` | Reversible local: lokale Reports unter `tmp/`, nicht-getrackte Diagnoseartefakte | darf laufen, wenn klar begrenzt |
| `D2` | Scoped repo change: kleine Docs-/Code-/Test-Aenderung mit klarem Scope, Evidence und Gate | darf laufen, wenn Confidence und Scope klar sind |
| `D3` | Source-of-truth/Governance: `AGENTS.md`, `.agents/rules/`, Workflows, Master-/Aktivplan-Struktur, Planarchivierung, dauerhafte Governance-/Statusablagen | Analyse erlaubt; Aenderung nur mit User-Gate |
| `D4` | High-blast-radius/destructive: Loeschungen, Auto-Move, Rebuild, grosse Refactors, produktive Parameter, History-/Git-Risiko | immer User-Gate |

`D2` darf keine Master-, Aktivplan-, Rule-, Workflow-, Loesch-, Move-, Archivstruktur- oder produktiven Parameteraenderungen enthalten. Sobald ein kleiner Scope eine dieser Flaechen beruehrt, wird er auf `D3` oder `D4` hochgestuft.

Fuer `D2` nennt der Agent Scope, Evidence, Confidence (`high`/`medium`/`low`) und kleinstes sinnvolles Gate. Bei `medium` oder `low` Confidence vor produktiven Pfaden nachfragen.

Fuer `D3` und `D4` braucht es vor Umsetzung: mindestens zwei Quellen, Alternativen, Blast-Radius (`files`, `surface`, `reversibility`, `user-visible-risk`), User-Gate und bei `D4` einen Recovery-/Rollback-Pfad. Analyse, Klassifikation und Patch-Vorschlaege sind bei `D3` ohne Freigabe erlaubt; Datei-Aenderungen nicht.

Agenten stoppen und fragen nach, wenn Graph, Master, Findings oder Locks widersprechen, ein unerwartetes Gate rot wird, der Diff groesser als angekuendigt wird, fremde uncommittete Aenderungen in betroffenen Dateien liegen, getrackte Dateien geloescht/verschoben wuerden, ein Cleanup-Skript mehr Klassen trifft als angekuendigt, ein Refactor produktive Parameter/Physik/Bot-Training/Recording/Multiplayer beruehrt oder ein Rebuild-/Reborn-Pfad entstehen soll.

## Subagent and Parallel Agent Use

- Subagents oder Parallel-Agenten duerfen nur eingesetzt werden, wenn der User sie explizit erlaubt oder anfragt; normale Tool-Parallelisierung bleibt davon unberuehrt.
- Eine allgemeine Freigabe wie "Subagents, wenn sinnvoll" erlaubt nur klar unabhaengige Recherche-, Review-, Verifikations- oder disjunkte Implementierungsaufgaben.
- Subagents umgehen keine Decision-Klassen: `D3`/`D4` brauchen weiterhin User-Gate, Evidence, Blast-Radius und bei `D4` Recovery-/Rollback-Pfad.
- Vor delegierter Implementierung muss die fuehrende Agenteninstanz Ownership und betroffene Dateien/Oberflaechen abgrenzen; mehrere Worker duerfen nicht ohne harte Grenze an denselben Dateien arbeiten.
- Der fuehrende Agent bleibt verantwortlich fuer Klassifikation, Integration, Konfliktauflosung, Abschluss-Evidence, passende Gates und scoped Commit.
- Bei planrelevanter Subagent-Nutzung dokumentiert die fuehrende Instanz kurz delegierte Frage oder Ownership, Ergebnis, Integrationsentscheidung und verbleibendes Risiko im aktiven Block, Report oder Changelog.

## Repo Organization

Vor neuen Dateien, Reports oder dauerhaften Doku-Ablagen klassifiziert der Agent den Zweck und nutzt vorhandene kanonische Zielquellen, statt neue Schatten-Wahrheiten zu erzeugen.

| Zweckklasse | Zielort | Regel |
| --- | --- | --- |
| `transient` | `tmp/` oder lokaler ignorierter Arbeitsordner | Diagnose-/Zwischenergebnis; nicht als dauerhafte Doku verwenden. |
| `evidence` | aktive `docs/plaene/aktiv/VXX.md`, relevanter Report oder `docs/plaene/CHANGELOG.md` | Kompakt: Pfad, Gate, Ergebnis, kurzer Effekt; keine langen Terminal-Logs. |
| `reference` | `docs/referenz/` | Dauerhafte Anleitung oder Erklaerung, keine Phasen-/Statussteuerung. |
| `governance` | `AGENTS.md`, `.agents/rules/`, `.agents/workflows/` | Source-of-truth-Regel; Aenderung ist `D3` und braucht User-Gate. |
| `plan` | Draft in `docs/plaene/neu/`, aktiver Block in `docs/plaene/aktiv/VXX.md`, abgeloest in `docs/plaene/alt/` | Genau eine kanonische aktive Detaildatei pro Block. |
| `archive-index` | `docs/plaene/alt/<archivordner>/README.md` oder `docs/archive/<bereich>/README.md` | Erklaert historische Ablage, neue kanonische Quelle und Read-Regel. |

Ab `D2` nennt der Agent vor dem Anlegen neuer dauerhafter Dateien kurz Zweckklasse, Zielpfad, bestehende Zielquelle und ob dadurch eine zweite Wahrheit entstehen koennte. Archivierte Plaene verlieren aktive Autoritaet und duerfen nur fuer Historie, Evidence, Dependency- oder Abgleichsauftraege gelesen werden, wenn Master-Index, aktive VXX-Datei oder Changelog eine neuere kanonische Quelle nennen.

## Dead-Code Governance

- Dead code may be removed only when a newer better path with real consumers or an exact productive duplicate-/shim-replacement is proven.
- Suspected candidates must be classified before deletion: `duplicate-backed`, `legacy-with-replacement`, `contract-first/plan-drift`, `unverified-altpath`.
- For every retained legacy or compatibility path, document successor, remaining consumers, and delete criterion in the active block or intake draft.
- Do not mark a scope as done when only contracts or isolated tests exist; plan, runtime, and tests must point to the same productive path.
- No new consumers may be added to files already marked `legacy`, `compatibility path`, or `shim`.

## Blocker Reporting

- If implementation hits a hard blocker or repeated failure, create/update a report in `docs/Fehlerberichte/` before stopping.
- Kurzfristige lokale Reibung ohne Stop-Loss braucht keinen separaten Fehlerbericht, wenn sie im Commit-/Phasen-Evidence nachvollziehbar bleibt.
- Reports: task context, failure, reproduction path, affected files, attempted fixes, status, next step.

## Closure Gates

- Normaler Codepfad: kleinste sinnvolle Verifikation waehlen (z. B. gezielter Contract-Run, Build-Signal oder Architekturcheck).
- Meta-Gate `npm run gates:pre-commit` ist Pflicht bei `*.99` oder bei Docs-/Governance-/Planstruktur-Aenderungen.
- Einzeln falls noetig: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.
- Abschluss eines Tasks oder einer Subphase mit Repo-Aenderungen ist erst uebergabefaehig, wenn Evidence und passender scoped Commit vorliegen.
- Offene eigene Scope-Aenderungen nach bestandenem Gate gelten als Closure-Luecke; vor Abschluss committen oder den fehlenden Abschlussgrund explizit dokumentieren.
- Nicht-offensichtliche Kompatibilitaets-, Migrations-, Alias- oder Fallback-Pfade brauchen vor Abschluss einen kurzen lokalen Why-Kommentar direkt am Code-Seam.
- Abschluss-Notizen muessen den Commit fachlich erklaeren; reine Hash-/Message-Wiederholung reicht nicht.
- Fuer Block-/Phasenarbeit gehoeren diese Notizen in die Evidence oder nach `docs/plaene/CHANGELOG.md`; fuer Governance-Slices in den passenden Doku-/Workflow-Kontext.
- If scope includes dead-code or legacy cleanup, closure evidence must also name the replacement proof or the explicit retention reason.

## Test Ownership

- Tests sind user-owned - nicht standardmaessig volle Test-Suites ausfuehren.
- Kleine risikoadjustierte Verifikationssignale vor `*.99` sind erlaubt, wenn sie den geaenderten Pfad direkt absichern und den User nicht mit unnoetigen Vollruns belasten.
- Test-Auswahl und Pfade: `.agents/test_mapping.md` (nur lesen, wenn User Tests anfordert oder ein Abschluss-Gate vorbereitet wird).
- Fuer `*.99` oder explizite User-Anfrage die vorgesehenen Mappings/Gates vollstaendig fahren.
