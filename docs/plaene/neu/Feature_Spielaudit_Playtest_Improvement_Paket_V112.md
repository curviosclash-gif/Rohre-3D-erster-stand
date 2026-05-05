# Feature: Spielaudit- und Playtest-Improvement-Paket (V112)

Stand: 2026-05-05
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V112.md`

## Ausgangslage

Playtest- und Wissensgraph-Sichtung zeigen ein priorisierbares Delta aus offenen Gameplay-, Runtime- und UI-Funden:

- B02: Sticky-Input (`B02-F01`) und Capture-Fehlerpfad (`B02-F02`)
- B03: Determinismusbruch im Kollisionspfad (`B03-F04`)
- B04: Arcade-Seed-Drift (`B04-F1`) und Sudden-Death-Lifecycle-Drift (`B04-F3`)
- B05/B06: datengetriebenes `innerHTML` in Start-Setup/Arcade-Overlay (`B05-F03`, `P42`)
- Desktop-Shell/UI-Surface: CSP-/Font-Fehlerbild im Desktop-Startpfad

Referenzen:

- `docs/qa/Spielaudit_2026-04-28/B02_Render_Loop_Input_Audio_und_Diagnostics_Findings.md`
- `docs/qa/Spielaudit_2026-04-28/B03_Kernsimulation_Arena_und_Entity_Systems_Findings.md`
- `docs/qa/Spielaudit_2026-04-28/B04_Modi_Hunt_und_Arcade_Fortschritt_Findings.md`
- `docs/qa/Spielaudit_2026-04-28/B05_Menue_Start_Setup_und_UI_Orchestrierung_Findings.md`
- `docs/qa/Spielaudit_2026-04-28/B06_Ingame_HUD_Matchflow_und_Overlays_Findings.md`
- `docs/prozess/Open_Findings.md`

## Ziel

Ein fokussiertes Verbesserungs-Paket liefern, das Desktop-Spielbarkeit, Reproduzierbarkeit und UI-Sicherheit sichtbar verbessert, ohne grossflaechigen Architekturumbau.

## Desktop-first Scope

- Primaerer Zielpfad ist die Desktop-App (Boot, Menu, Match-Start, Ingame-HUD, Eingaben).
- Browser-/Demo-Pfade werden nur dort angepasst, wo Shared-Runtime-Vertraege beruehrt sind.
- Keine Browser-first-Paritaetsarbeit.

## Nicht-Ziel

- Kein umfassender UI-Redesign-Block.
- Kein Full-Refactor der gesamten Match-/Entity-Runtime.
- Kein Dead-Code-Cleanup als Primarscope.
- Keine Erweiterung auf Bot-Training-Streams.

## Betroffene Dateien und Bereiche (geplant)

- `src/core/InputManager.js`
- `src/entities/systems/CollisionResponseSystem.js`
- `src/entities/systems/lifecycle/PlayerCollisionPhase.js`
- `src/core/arcade/ArcadeRunRuntime.js`
- `src/modes/ArcadeModeStrategy.js`
- `src/ui/start-setup/StartSetupUiOps.js`
- `src/ui/MatchFlowArcadeOverlayController.js`
- `style.css`
- `electron/static-server.cjs`
- `tests/core.spec.js`
- `tests/core-targeted-surface.spec.js`
- `tests/core-targeted-runtime.spec.js`

## Definition of Done

- [ ] DoD.1 `Sticky-Input` ist behoben: Eingaben bleiben nach Fokuswechsel/Textinput nicht mehr haengen (`B02-F01`).
- [ ] DoD.2 Determinismus im Kollisions-Bounce folgt einem reproduzierbaren RNG-/Replay-vertraeglichen Pfad (`B03-F04`).
- [ ] DoD.3 Arcade-Seed ist run-konsistent fuer Sequenz-/Mission-Ableitung (`B04-F1`), und Sudden-Death-Zustand leakt nicht in Folge-Runs (`B04-F3`).
- [ ] DoD.4 Start-Setup- und Arcade-Overlay-Pfade rendern datengetriebene Inhalte ohne ungesichertes `innerHTML` (`B05-F03`, `P42`).
- [ ] DoD.5 Desktop-Startpfad produziert keine vermeidbaren CSP-bedingten Dauerkonsolenfehler fuer externe Fonts/Surface-Nebenpfade.
- [ ] DoD.6 Gezielte Verifikationssignale fuer geaenderte Pfade sind dokumentiert und gruen oder blockerfest begruendet.

## Dead-Code-/Legacy-Governance

- Kein Remove-Primarscope geplant.
- Falls waehrend der Umsetzung Legacy-/Shim-Pfade beruehrt werden, erfolgt Klassifikation pro Kandidat in:
  - `duplicate-backed`
  - `legacy-with-replacement`
  - `contract-first/plan-drift`
  - `unverified-altpath`

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V112`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V112.md`
- hard dependencies: `-`
- soft dependencies: `V102` (Security-Hardening-Abgleich), `V105` (Guard-/Typecheck-Recovery)
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 112.1 Input- und Lifecycle-Stabilisierung
status: open
goal: Spielbarkeit im Desktop-Livepfad stabilisieren
output: keine klemmenden Inputs, saubere Zustandsuebergaenge

- [ ] 112.1.1 `InputManager` so haerten, dass `keyup`/Reset auch bei Fokuswechseln und Texteingaben korrekt verarbeitet wird.
- [ ] 112.1.2 Run-/Round-Lifecycle-Schnittstellen auf Sticky-Input-Randfaelle (Menu <-> Match, Fokusverlust, Resume) gezielt absichern.

### 112.2 Determinismus und Arcade-Run-Konsistenz
status: open
goal: reproduzierbare Simulation und konsistente Challenge-Logik
output: Seed-/RNG-konsistente Core-Pfade

- [ ] 112.2.1 Kollisions-Bounce von unseeded `Math.random` auf deterministischen Pfad umstellen oder replay-kompatibel serialisieren.
- [ ] 112.2.2 Arcade-Seed-Ableitung (Map/Mission) auf aktive Run-Seed-Quelle vereinheitlichen.
- [ ] 112.2.3 Sudden-Death-Status pro Run korrekt resetten (keine Folge-Run-Kontamination).

### 112.3 UI-Sicherheits- und Overlay-Hardening
status: open
goal: datengetriebene UI ohne Injection-Pfad
output: sichere Rendering-Pfade in Start-Setup und Arcade-Overlays

- [ ] 112.3.1 `StartSetupUiOps` auf sichere DOM-Erzeugung (`createElement`/`textContent`) umstellen oder gleichwertig escapen.
- [ ] 112.3.2 `MatchFlowArcadeOverlayController` analog haerten, inklusive IDs/Labels aus Runtime-Daten.
- [ ] 112.3.3 Negativfall-Test fuer Escape/Injection im Surface-Pfad ergaenzen.

### 112.4 Desktop-Surface- und CSP-Bereinigung
status: open
goal: cleaner Desktop-Boot ohne vermeidbare CSP-Fehlersignale
output: konsistenter Font-/Surface-Pfad fuer Desktop

- [ ] 112.4.1 Externe Font-Imports gegen Desktop-CSP-Policy harmonisieren (lokale Assets oder Policy-konforme Alternative).
- [ ] 112.4.2 Surface-Policy-/Contract-Nebenpfad auf synchronen/fehlertraechtigen Zugriff im Boot-Kontext ueberpruefen und minimieren.

### 112.5 Gezielte Verifikation und Befund-Abgleich
status: open
goal: Verbesserungen reproduzierbar nachweisen
output: kompakte Evidence fuer geaenderte Pfade

- [ ] 112.5.1 Targeted Desktop-Smoke plus relevante Surface/Runtime-Tests fuer geaenderte Komponenten fahren.
- [ ] 112.5.2 B02/B03/B04/B05/B06-Befunde und `docs/prozess/Open_Findings.md` auf neue Statuslage aktualisieren.

### 112.99 Abschluss-Gate
status: open
goal: Paket sauber und governance-konform abschliessen
output: belastbare Evidence + grune Plan-/Docs-Gates

- [ ] 112.99.1 Relevante targeted Verifikationssignale fuer den geaenderten Scope sind gruen oder blockerfest dokumentiert.
- [ ] 112.99.2 `npm run plan:check` ist gruen.
- [ ] 112.99.3 Falls Docs-/Governance-Scope geaendert wurde: `npm run docs:sync` und `npm run docs:check` sind gruen.

## Risiken

- R1 | hoch | Eingriffsstellen liegen auf Live-Hotpaths (Input, Kollision, Arcade-Runtime) und koennen Matchflow-Regressions ausloesen.
- R2 | mittel | Determinismus-Haertung kann bestehende Balance-/Feel-Parameter sichtbar veraendern.
- R3 | mittel | UI-Hardening gegen `innerHTML` kann bestehende Overlay-/Layout-Annahmen brechen, wenn DOM-Selektoren implizit gekoppelt sind.
- R4 | mittel | CSP-/Font-Bereinigung kann visuelle Unterschiede verursachen, wenn keine gleichwertige lokale Font-Strategie vorliegt.
