---
description: Reproduce and diagnose repo-only issues without applying fixes.
decision_floor: D0
mutates: optional
user_gate: conditional
commit_strategy: scoped
required_checks:
  - npm run plan:check
outputs:
  - report
  - chat
---
// turbo

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/token_efficiency_and_tools.md`.

Eintrittskriterium: Repo-only Diagnose fuer Tooling, Gates, Docs, Graph, Workflows, Rules, Git-/CI-/Test-Harness oder Planvalidierung. Produkt-, Gameplay-, Runtime- oder UI-Bugs gehoeren in `.agents/workflows/bugfix.md`, `.agents/workflows/code.md` oder `.agents/workflows/analyse-planung.md`.

## 0. Capture

- Symptom, erwartetes Ergebnis, beobachtetes Ergebnis, Command, Umgebung und Timing erfassen.
- Repo-Surface klassifizieren: `governance`, `docs-plan`, `graph`, `tooling-script`, `test-harness`, `ci`, `git`, `package-config`, `unknown`.
- Decision-Klasse bestimmen: reine Analyse ist `D0`; lokale Diagnoseartefakte unter `tmp/` sind `D1`; persistente Reports sind mindestens `D2`; `.agents/`, Master-/Aktivplan-, Rule- oder Workflow-Aenderungen sind `D3` und brauchen User-Gate.
- Kein Fix, keine Status-/Planclaims und keine Checkbox-Aenderungen in diesem Workflow.

## 1. Context

// turbo
- `AGENTS.md`, passende Rule und diesen Workflow lesen.
- Nur bei Plan-/Lock-/Blockbezug: `docs/generated/plan-index.json` als Einstieg und `docs/Umsetzungsplan.md` als kanonische Quelle nutzen; genau eine passende aktive `VXX.md` nachladen.
- Bei Graph-, Scope-, Dependency- oder Surface-Fragen strukturierte Queries bevorzugen:
  - `npm run graph:check`
  - `node scripts/query-knowledge-graph.mjs scope-collisions --json`
  - `node scripts/query-knowledge-graph.mjs impact-for-file <path> --json`
  - `node scripts/query-knowledge-graph.mjs open-deps <VXX> --json`
- Fremde uncommittete Aenderungen nur als Kontext/Risiko notieren, nicht absorbieren.

## 2. Reproduce

- Minimalen Repro-Command oder kleinste reproduzierbare Lesesequenz waehlen.
- Voll-Suites nicht ohne explizite User-Anfrage laufen lassen; fuer Repo-Signale kleine Gates oder fokussierte Scripts bevorzugen.
- Bei Flake-Verdacht einen engen Rerun oder Gegenprobe benennen; nicht gelaufene naheliegende Checks unter `Not-checked:` fuehren.
- Wenn keine Reproduktion gelingt, Gegenbeweis und Restrisiko festhalten statt einen Fix-Scope zu erfinden.

## 3. Diagnose

- Ursache als falsifizierbare Hypothese dokumentieren: `Signal -> Ursache -> betroffene Repo-Surface -> Wirkung -> Gegenprobe`.
- Findings nach `P0`/`P1`/`P2`/`P3` und Lifecycle markieren: `repo-fix`, `bugfix`, `intake`, `doc-only`, `test-gap`, `blocker-report`, `none`.
- `P0`/`P1` brauchen zwei unabhaengige Quellen, z. B. `Command + Code`, `Plan + Git`, `Graph + Code` oder `Gate + Docs`.
- Sobald produktiver Code oder Gameplay-Wirkung die Hauptursache wird, stoppen und auf `.agents/workflows/bugfix.md` oder `.agents/workflows/code.md` wechseln.

## 4. Optional persist

- Transiente Diagnoseartefakte unter `tmp/` ablegen, wenn sie den Repro pruefbar machen.
- Harte Blocker in `docs/Fehlerberichte/` dokumentieren, wenn die Arbeit sonst stoppen muss.
- Follow-up-Intakes nur nach User-Gate in `docs/plaene/neu/` anlegen; Master- oder Aktivplan-Status nicht aus Analyse allein aendern.
- Wenn Dateien geschrieben wurden: kleinste passende Verifikation ausfuehren; bei Docs-/Governance-/Graph-Scope `npm run gates:pre-commit`.

## 5. Output

- Wenn keine Datei geschrieben wurde, Ergebnis direkt im Chat ausgeben und keinen Commit erzeugen.
- Wenn ein Report oder ein anderes Repo-Artefakt geschrieben wurde, Git-Policy aus `.agents/rules/git_and_commits.md` anwenden und scoped committen, sofern keine fremden staged Aenderungen den Index blockieren.

## Report

Standardformat:

```text
Repro-Analyse: <Scope oder Command>
Confidence: high|medium|low
Surface: <governance|docs-plan|graph|tooling-script|test-harness|ci|git|package-config|unknown>

Kurzfazit:
- <1-3 Saetze>

Reproduktion:
- Command/Quelle: <...>
- Ergebnis: PASS|FAIL|WARN|NOT-REPRODUCED
- Gegenprobe: <...>

Finding:
- [P0-P3][repo-fix|bugfix|intake|doc-only|test-gap|blocker-report|none] <Titel>
  Evidence: <Command|Datei|Graph|Plan|Git>
  Trace: <Signal -> Ursache -> Surface -> Wirkung -> Gegenprobe>
  Confidence: high|medium|low

Graph/RAG:
- Graph: <query|skipped>, <confidence|reason>
- RAG: <query|skipped>, <reason>
- Source-of-truth: <Graph|Master|Plan|Code|Git|Command>

Follow-up:
- Lifecycle: <repo-fix|bugfix|intake|doc-only|test-gap|blocker-report|none>
- Kleinstes Gate: <plan:check|gates:pre-commit|gezielter Command|none>

Not-checked:
- <bewusst nicht gepruefte Pfade und Risiko>
```
