# AI Project Onboarding (Aktiv)

Stand: 2026-04-01

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

## 4. Task-Start Checkliste

1. Scope aus User-Anfrage, `docs/INDEX.md` und `docs/Umsetzungsplan.md` ableiten.
2. Betroffene Module in `src/` und `tests/` identifizieren.
3. Aendern, dann Tests gemaess `.agents/test_mapping.md` ausfuehren.
4. Doku-/Prozess-Aktualitaet mit `npm run docs:sync` und `npm run docs:check` pruefen.
