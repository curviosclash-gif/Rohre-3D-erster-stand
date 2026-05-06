# Feature: Repro Struktur-, Arbeits- und Qualitaets-Hardening (Ablage-Entwurf, kein Blockclaim)

Stand: 2026-05-05
Status: Abgeloester Alternativentwurf
Owner: Codex
Risiko: mittel-hoch
plan_file: `n/a`

Hinweis: Dieser Entwurf ist als Alternativvorschlag abgelegt und beansprucht keine eigene Block-ID mehr. Der kanonische aktive V112-Block ist `docs/plaene/aktiv/V112.md` und basiert auf `Feature_Spielaudit_Playtest_Improvement_Paket_V112.md`.

## Ziel

Die Repro soll in Struktur, Arbeitsfluss und Wartbarkeit so verbessert werden, dass produktive Desktop-Entwicklung schneller, stabiler und mit weniger Reibung laeuft.

Leitziele:

- Governance-/Plan-Gates dauerhaft stabil halten.
- Gross-Hotspots in Core/UI/Teststruktur in kleinere, ownership-klare Slices schneiden.
- Testsignale schneller und treffsicherer machen.
- Repo-/Workspace-Rauschen reduzieren.
- Security-/Hardening-Risiken priorisiert abbauen.

## Baseline (2026-05-05)

- `npm run check:architecture:boundaries`: gruen
- `npm run check:architecture:metrics`: gruen
- `npm run plan:check`: war rot (fehlende `V110`/`V111`); nach Sofortfix gruen
- `npm run docs:check`: gruen
- Knowledge-Graph Coverage (`coverage-report`): `84.4%` adjusted, `235` uncovered active files
- Dirty Working State: `103` geaenderte Dateien (`89` modified, `14` untracked)
- Groesste `src`-Hotspots: `ArcadeRunRuntime.js`, `MediaRecorderSystem.js`, `UIStartSyncController.js`
- Groesste Test-Hotspots: `core-targeted-runtime.spec.js`, `core-targeted-surface.spec.js`, `core-targeted-regressions.spec.js`
- Security-Status: `npm audit` meldet `2` moderate Findings (`vite`, `esbuild`)

## Desktop-first Scope

- Prioritaet: Desktop-Hauptpfad (Boot, Matchstart, Matchflow, Return-to-Menu, Recording, Multiplayer-Lifecycle).
- Browser-/Demo-Belange nur, wenn sie den Desktop-Vertrag oder Shared-Contracts direkt beeinflussen.
- Kein Feature-Paritaetsdruck zugunsten Browser-Demo.

## Nicht-Ziel

- Kein Big-Bang-Refactor ueber alle Layer in einem Schritt.
- Kein Volltest-Default gegen User-owned-Test-Regel.
- Kein ungeplanter Austausch bestehender Governance-Modelle aus `V109`.

## Betroffene Dateien/Module (Prioritaet)

- Governance/Plan:
  - `docs/Umsetzungsplan.md`
  - `docs/plaene/aktiv/V110.md`
  - `docs/plaene/aktiv/V111.md`
- Core/UI-Hotspots:
  - `src/core/arcade/ArcadeRunRuntime.js`
  - `src/core/MediaRecorderSystem.js`
  - `src/ui/UIStartSyncController.js`
  - `src/core/renderer/RecordingCapturePipeline.js`
- Test-Hotspots:
  - `tests/core-targeted-runtime.spec.js`
  - `tests/core-targeted-surface.spec.js`
  - `tests/core-targeted-regressions.spec.js`
  - `tests/helpers.js`
- Hardening:
  - `server/lan-signaling.js`
  - UI-Renderpfade aus `docs/prozess/Open_Findings.md` (`P42`)
- Hygiene/Artefakte:
  - `docs/archive/workspace/root-history/**`
  - Root `tmp-vite-*.log` Spuren

## Definition of Done

- [ ] DoD.1 Plan-/Docs-/Architecture-Gates bleiben ueber den gesamten Block stabil gruen.
- [ ] DoD.2 Mindestens drei priorisierte Grossdateien sind in ownership-klare Module geschnitten (ohne Vertragsdrift).
- [ ] DoD.3 Core-Targeted-Testcluster sind in kleinere fachliche Slices getrennt und schneller gezielt laufbar.
- [ ] DoD.4 Security-Hotspots mit hoher Prioritaet (`P41`/`P42`/`P44`) sind als umsetzbare, testbare Slices verankert.
- [ ] DoD.5 Repo-/Workspace-Hygiene hat klare Retention-Regeln mit reproduzierbarem Cleanup-Pfad.
- [ ] DoD.6 Dokumentierte Metrik-Baseline (Dateigroessen, Gate-Status, Testlaufzeiten) ist vor/nachher vergleichbar.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `n/a (abgeloester Alternativentwurf)`
- vorgeschlagene kanonische Blockdatei: `n/a`
- hard dependencies: `V109.99`
- soft dependencies: `V104.99`, `V105.99`, `V110.99`, `V111.99`
- Hinweis: `Nicht zur Uebernahme vorgesehen; nur als Ideenspeicher`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 112.1 Governance- und Gate-Stabilisierung
status: open
goal: Plan-/Gate-Betrieb dauerhaft robust halten
output: gruene Baseline fuer Folgearbeit

- [ ] 112.1.1 Fehlende aktive Blockreferenzen, Lock-Index und Plan-Validator dauerhaft synchron halten (`V110`, `V111`, Folgebloecke).
- [ ] 112.1.2 Gate-Startbaseline dokumentieren (`plan:check`, `docs:check`, `check:architecture:*`) und als Pflicht-Startsignal fuer weitere Slices fixieren.

### 112.2 Struktur-Schnitt Core/UI-Hotspots
status: open
goal: grosse Dateien auf ownership-klare Module reduzieren
output: kleinere, testbare Core/UI-Surfaces

- [ ] 112.2.1 `ArcadeRunRuntime` und `MediaRecorderSystem` in orchestrierende Kernpfade plus fachliche Support-Module aufteilen.
- [ ] 112.2.2 `UIStartSyncController` und `RecordingCapturePipeline` entlang Intent/Projection/Adapter trennen; bestehende Contracts beibehalten.

### 112.3 Testarchitektur und Laufzeit-Signal
status: open
goal: gezielte Regressionen schneller und stabiler sichtbar machen
output: feinere Test-Cluster und klarere Mapping-Pfade

- [ ] 112.3.1 `core-targeted-*` Spezifikationen in kleinere fachliche Cluster (runtime/surface/platform/regression) mit klaren Selektoren schneiden.
- [ ] 112.3.2 `tests/helpers.js` entlasten und implizite Seiteneffekte reduzieren; Mapping in `.agents/test_mapping.md` synchronisieren.

### 112.4 Security- und Runtime-Hardening
status: open
goal: priorisierte Sicherheitsrisiken in produktiven Pfaden reduzieren
output: testbar gehaertete Pfade fuer LAN und UI-Rendering

- [ ] 112.4.1 LAN-Signaling-Body-Limits und Request-Hardening (`P44`) mit Contract-Test-Evidence absichern.
- [ ] 112.4.2 `innerHTML`-nahe UI-Pfade (`P42`) auf sichere Renderstrategien umstellen und Regressionstests nachziehen.

### 112.5 Repo-Hygiene und Artefakt-Strategie
status: open
goal: Arbeitsflaeche von Dauerrauschen entlasten
output: klare Retention-/Cleanup-Regeln mit wenig Risiko

- [ ] 112.5.1 Retention-Regeln fuer `docs/archive/workspace/root-history/**`, Root-Logs und temporaere Artefakte verbindlich dokumentieren.
- [ ] 112.5.2 `cleanup:workspace`-Pfad und Schutzregeln so schaerfen, dass aktive Dev-/Test-Laeufe nicht gestoert werden.

### 112.6 Security-Toolchain und Dependency-Pfad
status: open
goal: moderate Audit-Befunde kontrolliert abbauen
output: Upgrade- und Verifikationspfad fuer `vite`/`esbuild`

- [ ] 112.6.1 Vite-/Esbuild-Upgradepfad als risikogestuften Slice definieren (Major-Wechsel inkl. Kompatibilitaetscheck).
- [ ] 112.6.2 Vorher/Nachher-Verification fuer Dev-Server, Build und Kern-Playwright-Profile dokumentieren.

### 112.99 Abschluss-Gate
status: open
goal: Struktur- und Qualitaetsverbesserung reproduzierbar abschliessen
output: stabile, messbar verbesserte Arbeitsbasis

- [ ] 112.99.1 `npm run plan:check`, `npm run docs:check`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics` sind gruen.
- [ ] 112.99.2 Hotspot-Splits, Testcluster-Splits und Hardening-Slices sind mit Evidence abgeschlossen und ohne neue Legacy-Surface-Drift.
- [ ] 112.99.3 Hygiene-/Retention-Regeln sind wirksam dokumentiert und mit mindestens einem reproduzierbaren Cleanup-Run abgesichert.
- [ ] 112.99.4 Security-/Dependency-Pfad ist inklusive Restrisiko, Rollback und Verifikationsmatrix dokumentiert.

## Risiken

- R1 | hoch | Grosser paralleler Dirty-State kann Strukturarbeit mit fremden Aenderungen kollidieren lassen.
- R2 | mittel | Hotspot-Splits koennen unbeabsichtigte Vertragsdrift in Runtime-/UI-Glue erzeugen.
- R3 | mittel | Test-Cluster-Splitting kann kurzfristig Mapping- und Runner-Drift verursachen.
- R4 | mittel | Dependency-Upgrades (Vite Major) koennen Build-/Harness-Inkompatibilitaeten ausloesen.
- R5 | niedrig | Hygiene-Massnahmen koennen ohne klare Schutzregeln versehentlich nuetzliche lokale Artefakte entfernen.
