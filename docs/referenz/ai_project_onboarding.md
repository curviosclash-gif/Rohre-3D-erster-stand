# AI Project Onboarding (Aktiv)

Stand: 2026-05-25

Diese Datei ist ein Referenz-Einstieg fuer KI-Assistenz in diesem Repository.
Operativ fuehrend bleibt `AGENTS.md` mit den passenden Rules und Workflows.

## 1. Projektkontext

CuviosClash ist ein schnelles 3D-Browser-Spiel mit Trail-Kollisionen in einer Rohr-/Arena-Umgebung.
Hauptziel im Match: ueberleben, Gegner zu Kollisionen zwingen, Round- und Match-Siege erzielen.

## 2. Canonical Quellen (zuerst lesen)

1. `AGENTS.md`
2. passende Rule in `.agents/rules/`
3. passender Workflow in `.agents/workflows/`
4. `docs/Umsetzungsplan.md`
5. genau die relevante aktive Detaildatei `docs/plaene/aktiv/V*.md`
6. `docs/prozess/Open_Findings.md` nur bei Finding-, Audit- oder Closure-Bezug
7. `docs/bot-training/Bot_Trainingsplan.md` nur bei Bot-Training-Scope

Bei Scope-, Dependency- oder Surface-Fragen zuerst den Knowledge-Graph nutzen.

## 3. Referenzquellen bei Bedarf

1. `docs/referenz/ai_architecture_context.md`
2. `docs/release/Releaseplan_Spiel_2026.md`
3. Neuester `docs/tests/Testergebnisse_Phase4b_YYYY-MM-DD.md`
4. `docs/prozess/Dokumentationsstatus.md`
5. `docs/INDEX.md`

Historische Deep-Dive-Dokumente liegen in `docs/archive/` und alte Planakten in `docs/plaene/alt/`.
Diese Quellen nur bei explizitem Historien-, Evidence-, Dependency- oder Abgleichsauftrag lesen.

Nicht als Standardkontext lesen: `tmp/`, `logs/`, `dist/`, `test-results/`, `.codex_tmp/`, `.claude/`, lokale Screenshots, generierte Reports und Videos. `videos/` ist als Cinematic-/Recording-nahe Ablage geschuetzt und kein generischer Muellpfad.

## 4. Entscheidungs- und Gate-Regeln

- Vor Repo-Aenderungen die Decision-Klasse aus `.agents/rules/planning_and_governance.md` bestimmen.
- `D0`/`D1`: Read-only oder lokale Reports, kein produktiver oder Governance-Diff.
- `D2`: kleiner scoped Repo-Diff mit klarer Evidence, Confidence und kleinstem sinnvollem Gate.
- `D3`: Source-of-truth, Governance, Master-/Aktivplan, Workflow oder Archivstruktur; Analyse und Patch-Vorschlag erlaubt, Umsetzung nur mit User-Gate.
- `D4`: Loeschung, Auto-Move, Rebuild, grosser Refactor, produktive Parameter oder History-Risiko; immer User-Gate plus Recovery-Pfad.
- Vor D3-/D4-Freigaben und in `[REVIEW]`-/`[USER-GATE]`-Phasen zuerst betroffene Dateien/Oberflaechen als `no-op`, `read-only evidence`, `optional` oder `edit required` klassifizieren. Nur `edit required` gehoert in die Freigabe; `optional` bleibt ohne ausdrueckliche Entscheidung unangetastet.
- Neue dauerhafte Ablagen brauchen Zweckklasse, Zielpfad und Abgleich gegen bestehende kanonische Quellen.

## 5. Harte Entwicklungsregeln

- Runtime-Pfade sind unter `src/` (nicht `js/modules/`).
- Zentrale Konstanten nur aus `src/core/Config.js`.
- Three.js-Cleanup ueber `src/core/three-disposal.js` und saubere `dispose()`-Pfade.
- Keine unnoetigen Allokationen in Hot Paths (`update`, Kollision, Bot-Sensing).
- State-Namen in Runtime/Doku konsistent halten (`PLAYING`, `ROUND_END`, `MATCH_END`).
- Fuer Persistenz-, Import- und Content-Scope immer den kanonischen V85-Leseweg nehmen: Store-/Transferfamilien ueber ihre Shared Contracts/Stores, Editor-/Template-/Runtime-Kataloge ueber `EditorBuildCatalog` bzw. die Descriptor-/Capability-Helfer statt ueber rohes JSON oder direkte `localStorage`-Reads.
- Additive Folgefeatures im V85-Scope nur ueber bestehende Versionssignale (`schemaVersion`/`contractVersion`/`descriptorVersion`) erweitern; neue Fallbacks brauchen strukturiertes Feedback und einen dokumentierten Sunset-Trigger.

## 6. Task-Start Checkliste

1. Scope aus User-Anfrage, `docs/INDEX.md` und `docs/Umsetzungsplan.md` ableiten.
2. Betroffene Module in `src/` und `tests/` identifizieren.
3. Decision-Klasse und Zweckklasse fuer neue Ablagen festhalten; bei D3/D4 vor Umsetzung stoppen und User-Gate einholen.
4. Vor dem ersten produktiven Commit den Architektur-Startcheck aus `V91 91.5.1` gegen den geplanten Diff laufen lassen:
   - `Contract`: Shared-Contract in `src/shared/contracts/**` erweitern statt Inline-Validierung.
   - `Command/Event`: Runtime-Dispatch ueber bestehende Ports/Contracts statt neuer `game.*`-Direktaufrufe.
   - `Snapshot`: `session_runtime_snapshot`, `match_flow_snapshot` oder `platform_capability_snapshot` als read-only Inputs verwenden.
   - `Capability`: `resolveSurfaceCapabilityAccess()`, `resolveSurfacePolicy()` oder `resolveSurfaceFeatureLaunchGuard()` nutzen.
   - `Sunset alter Pfade`: keine neuen Aufrufer fuer `game.runtimeBundle`, `game.runtimeFacade`, `window.GAME_RUNTIME`, `curviosApp`/`__CURVIOS_APP__` (ausserhalb `src/platform/**`) oder `getActiveRuntimeConfig` (ausserhalb Config/Settings).
   - `Desktop-vs-Demo`: Feature-Zugang ausschliesslich ueber Surface-Policy-Vertraege und nicht ueber Runtime-Kind-Ifs verdrahten.
5. Aendern, dann den leichtesten passenden Testlayer aus `.agents/test_mapping.md` waehlen: `node-contract` fuer reine Vertraege/Logik, `desktop-smoke` fuer Desktop-Hauptpfade, `desktop-e2e` nur fuer produktnahe Integrationen, `browser-compat` nur fuer Browser-Demo/Web-API-Scope und `heavy-diagnostic` nicht als Default.
6. Doku-/Prozess-Aktualitaet mit `npm run docs:sync` und `npm run docs:check` pruefen, wenn der Scope Doku, Governance oder Graph beruehrt.
7. Bei Folgearbeit an `V85`/`V86`: erst pruefen, ob `contractVersion`/`schemaVersion`/`descriptorVersion` und vorhandene Capability-Helfer den Leseweg bereits definieren, bevor neue Reader oder UI-Sonderpfade entstehen.
