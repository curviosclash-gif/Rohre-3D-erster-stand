# AI Project Onboarding (Aktiv)

Stand: 2026-04-13

Diese Datei ist der aktuelle Einstieg fuer KI-Assistenz in diesem Repository.

## 1. Projektkontext

CuviosClash ist ein schnelles 3D-Browser-Spiel mit Trail-Kollisionen in einer Rohr-/Arena-Umgebung.
Hauptziel im Match: ueberleben, Gegner zu Kollisionen zwingen, Round- und Match-Siege erzielen.

## 2. Canonical Quellen (zuerst lesen)

1. `docs/referenz/ai_architecture_context.md`
2. `docs/Umsetzungsplan.md`
3. `docs/release/Releaseplan_Spiel_2026.md`
4. Neuester `docs/tests/Testergebnisse_Phase4b_YYYY-MM-DD.md`
5. `docs/prozess/Dokumentationsstatus.md`
6. `docs/INDEX.md`

Hinweis: Historische Deep-Dive-Dokumente liegen in `docs/archive/` (u. a. `docs/archive/Analysebericht.md`).

## 3. Harte Entwicklungsregeln

- Runtime-Pfade sind unter `src/` (nicht `js/modules/`).
- Zentrale Konstanten nur aus `src/core/Config.js`.
- Three.js-Cleanup ueber `src/core/three-disposal.js` und saubere `dispose()`-Pfade.
- Keine unnoetigen Allokationen in Hot Paths (`update`, Kollision, Bot-Sensing).
- State-Namen in Runtime/Doku konsistent halten (`PLAYING`, `ROUND_END`, `MATCH_END`).
- Fuer Persistenz-, Import- und Content-Scope immer den kanonischen V85-Leseweg nehmen: Store-/Transferfamilien ueber ihre Shared Contracts/Stores, Editor-/Template-/Runtime-Kataloge ueber `EditorBuildCatalog` bzw. die Descriptor-/Capability-Helfer statt ueber rohes JSON oder direkte `localStorage`-Reads.

## 4. Task-Start Checkliste

1. Scope aus User-Anfrage, `docs/INDEX.md` und `docs/Umsetzungsplan.md` ableiten.
2. Betroffene Module in `src/` und `tests/` identifizieren.
3. Aendern, dann den leichtesten passenden Testlayer aus `.agents/test_mapping.md` waehlen: `node-contract` fuer reine Vertraege/Logik, `desktop-smoke` fuer Desktop-Hauptpfade, `desktop-e2e` nur fuer produktnahe Integrationen, `browser-compat` nur fuer Browser-Demo/Web-API-Scope und `heavy-diagnostic` nicht als Default.
4. Doku-/Prozess-Aktualitaet mit `npm run docs:sync` und `npm run docs:check` pruefen.
5. Bei Folgearbeit an `V85`/`V86`: erst pruefen, ob `contractVersion`/`schemaVersion`/`descriptorVersion` und vorhandene Capability-Helfer den Leseweg bereits definieren, bevor neue Reader oder UI-Sonderpfade entstehen.
