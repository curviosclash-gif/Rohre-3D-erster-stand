# Feature: Toolchain-Security und Dependency-Upgrade (Vorschlag V90)

Stand: 2026-04-10
Status: Entwurf
Owner: frei
Risiko: hoch
plan_file: `docs/plaene/aktiv/V90.md`

## Ziel

Die aktuellen `npm audit`- und `npm outdated`-Befunde kontrolliert abbauen, ohne Build-, Electron-, Playwright- oder Vite-Vertraege zu destabilisieren.

Der Audit vom 2026-04-10 meldet 5 Security-Befunde:

- `flatted` - high, Prototype Pollution.
- `rollup` - high, Arbitrary File Write via Path Traversal.
- `brace-expansion` - moderate, Zero-step sequence DoS.
- `esbuild`/`vite` - moderate, Dev-Server-Request-Isolation.

Zusaetzlich sind mehrere Tooling-Abhaengigkeiten veraltet, darunter `@playwright/test`, `eslint`, `ws`, `@types/node`, `@commitlint/*`, sowie Major-Kandidaten `vite`, `three` und `typescript`.

## Nicht-Ziel

- Kein unkontrolliertes `npm audit fix --force` ohne Kompatibilitaetsmatrix.
- Kein gleichzeitiger Major-Upgrade von Vite, Three und TypeScript ohne getrennte Smoke-/Build-Gates.
- Keine Playwright-Vollsuites ausser an expliziten Block-Gates oder auf User-Anforderung.

## Betroffene Dateien und Bereiche

- `package.json`
- `package-lock.json`
- `vite.config.js`
- `playwright.config.js`
- `electron/package.json`
- `server/package.json`
- `.github/workflows/ci.yml`
- `.agents/test_mapping.md`
- `docs/referenz/ai_architecture_context.md`
- `docs/prozess/Dokumentationsstatus.md`

## Definition of Done

- [ ] DoD.1 `npm audit --audit-level=low` ist gruen oder jeder verbleibende Befund ist mit Risiko, Scope und Upgrade-Blocker dokumentiert.
- [ ] DoD.2 Nicht-breaking Security-Fixes sind separat von Major-Upgrades umgesetzt.
- [ ] DoD.3 Major-Upgrades fuer Vite, Three und TypeScript haben eine Kompatibilitaetsmatrix mit Rollback-Pfad.
- [ ] DoD.4 Build-, Architektur- und Doku-Gates bleiben gruen.
- [ ] DoD.5 CI- und lokale Skripte nutzen dieselben Toolchain-Versionen und dokumentierten Node-/npm-Annahmen.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V90`, da `V89` bereits als Legacy-Runtime-Surface-Sunset-Draft belegt ist.
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V90.md`
- hard dependencies: keine
- soft dependencies: `V88.99`, weil Testarchitektur und Failure-Taxonomie Upgrade-Risiken besser eingrenzen
- Hinweis: Manuelle Uebernahme in den Master-Index erforderlich.

## Phasenplan

### 90.1 Audit- und Versionenmatrix

- [ ] 90.1.1 `npm audit`, `npm outdated`, Electron-/Server-Unterpakete und CI-Versionen erfassen.
- [ ] 90.1.2 Befunde in `runtime`, `dev-server`, `build-tooling`, `test-tooling`, `electron-shell` und `server` klassifizieren.

### 90.2 Nicht-breaking Security-Fixes

- [ ] 90.2.1 `npm audit fix` ohne `--force` trocken bewerten und nur kompatible Lockfile-Updates uebernehmen.
- [ ] 90.2.2 Build-, Architektur- und Doku-Gates nachziehen.

### 90.3 Major-Upgrade-Entscheidungen

- [ ] 90.3.1 Vite/esbuild/Rollup-Upgradepfad isoliert planen, inklusive Dev-Server-, Preview- und Electron-App-Build.
- [ ] 90.3.2 Three-Upgrade separat bewerten, weil Rendering-, Loader- und Asset-Pfade betroffen sein koennen.
- [ ] 90.3.3 TypeScript-/ESLint-/Playwright-Upgrades getrennt von Runtime-Dependencies schneiden.

### 90.99 Abschluss-Gate

- [ ] 90.99.1 `npm run architecture:guard`, `npm run build`, `npm run docs:check` und der kleinste relevante Dependency-Sanity-Check sind gruen.
- [ ] 90.99.2 Verbleibende Security-Ausnahmen sind dokumentiert und haben ein Wiedervorlagedatum.

## Risiken

- R1 | hoch | `npm audit fix --force` hebt Vite auf eine Breaking-Version und destabilisiert Build/Preview/Electron.
- R2 | mittel | Three-Major-Upgrade veraendert Loader-, Material- oder Kamera-Verhalten.
- R3 | mittel | Playwright-Upgrade veraendert bestehende Harness-Flakes und erschwert V87/V88-Abschluss.
- R4 | mittel | Lockfile-only-Fixes werden ohne CI-/Build-Abgleich committed und verstecken echte Kompatibilitaetsfehler.
