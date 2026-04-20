# Feature: Settings Studio Browser-Demo Begrenzung (Vorschlag V98)

Stand: 2026-04-20
Status: Entwurf
Owner: frei
Risiko: hoch
plan_file: `docs/plaene/aktiv/V98.md`

## Ziel

Im Desktop-Settings-Studio soll ein eigener Bereich entstehen, mit dem Browser-Demo-Grenzen gezielt konfiguriert werden koennen, ohne die Desktop-Vollversion zu beschneiden.

Kernziel:

- Grenzen der Demo zentral, versioniert und nachvollziehbar steuern (Session-Typen, Mode-Paths, kuratierte Maps, Presets, Quickstart, Capability-Gates).
- Desktop-Pfad bleibt autoritativ; Browser-Demo bleibt read-only Consumer.
- Keine versteckten Parallelpfade ausserhalb des bestehenden Surface-Policy-Vertrags (`V77`).

## Nicht-Ziel

- Kein produktiver Browser-Schreibpfad.
- Kein Umgehen der `default-deny` Browser-Leitplanke aus `V77`.
- Kein zweites, konkurrierendes Surface-Policy-System neben `PlatformCapabilityRegistry`/`PlatformSurfacePolicyOps`.
- Kein unkontrolliertes Aufweiten der Demo auf Desktop-Paritaet.

## Kontext und Befund (Recherche)

Aktueller Stand im Code:

- Browser-Demo-Grenzen sind statisch in `src/shared/contracts/PlatformCapabilityData.js` hinterlegt (`products.browser-demo.surfacePolicy` + `capabilities`).
- Laufzeit-Resolver (`resolveSurfacePolicy`, `resolveSurfaceCapabilityAccess`) lesen diese Daten zentral in `src/shared/contracts/PlatformCapabilityRegistry.js`.
- UI-/Start-/Match-Gates haengen bereits sauber daran (`src/shared/contracts/PlatformSurfacePolicyOps.js`, `src/core/runtime/MenuRuntimeSessionService.js`, `src/core/runtime/MatchStartValidationService.js`, `src/ui/menu/MenuSurfacePolicyUiSync.js`).
- Settings Studio (`V95`/`V97`) bearbeitet aktuell nur `menu-defaults.override.json` (Gameplay/Menu-Defaults + Limits), nicht Surface-Policy.
- Browser-Demo nutzt `VITE_APP_MODE=web` und hat keinen Zugriff auf Desktop-`userData`-Dateien.

Wichtige Konsequenz:

- Ein reiner `userData`-Save im Settings Studio reicht nicht, um eine veroeffentlichte Browser-Demo zu begrenzen.
- Es braucht einen expliziten Read-Pfad fuer Browser-Build/Browser-Runtime (Export-/Deploy-Artefakt oder Build-Integration).

## Architekturentscheidung (empfohlen)

Empfehlung: **Monotone Browser-Demo-Policy-Overrides mit Desktop-Editor + explizitem Export-Artefakt**

1. Basis bleibt weiterhin `PlatformCapabilityData` (kanonische Default-Policy).
2. Neuer Override-Vertrag fuer Browser-Demo (`browser-demo-surface-policy.v1`) wird hinzugefuegt.
3. Resolver merge-t Basis + Override **nur einschnuerend** (Intersection/Clamp), nicht aufweitend.
4. Settings Studio bearbeitet den Override im Desktop-Tool.
5. Browser-Demo konsumiert den Override read-only ueber expliziten Build-/Deploy-Pfad.

Warum diese Entscheidung:

- Entspricht Produktfokus (Desktop-first, Demo eingeschraenkt).
- Verhindert, dass Bedienfehler im Studio die Demo unabsichtlich aufweiten.
- Nutzt vorhandene Resolver/Gates weiter statt neue Sonderlogik zu verteilen.

## Betroffene Dateien und Bereiche (geplant)

- `electron/settings-studio/ipc/settings-studio-ipc.cjs`
- `electron/settings-studio/services/` (neuer Service fuer Demo-Policy-Override)
- `electron/settings-studio/ui/settings-studio-app.js`
- `electron/settings-studio/ui/settings-studio-form-renderer.js`
- `electron/settings-studio/ui/settings-studio-i18n.js`
- `electron/settings-studio/ui/settings-studio.html`
- `electron/settings-studio/ui/settings-studio.css`
- `src/shared/contracts/PlatformCapabilityData.js`
- `src/shared/contracts/PlatformCapabilityRegistry.js`
- `src/shared/contracts/PlatformSurfacePolicyOps.js`
- `src/shared/contracts/` (neuer Browser-Demo-Policy-Contract/Normalizer)
- `tests/platform-capabilities.contract.test.mjs`
- `tests/settings-studio-override.contract.test.mjs` (oder dedizierte neue Studio-Policy-Tests)
- `docs/referenz/ai_architecture_context.md`
- optional Export-Artefakt unter `data/` (falls im finalen Design ausgewaehlt)

## Definition of Done

- [ ] DoD.1 Settings Studio hat eine eigene Sektion fuer Browser-Demo-Grenzen mit klaren Guardrails.
- [ ] DoD.2 Browser-Demo-Policy-Override ist versioniert, validiert und migrationsfaehig.
- [ ] DoD.3 Runtime-Resolver nutzt zentral den gemergten Browser-Demo-Policy-Stand.
- [ ] DoD.4 Merge ist monotone Begrenzung: Override kann nur einschnueren, nicht erweitern.
- [ ] DoD.5 Browser-Demo liest den Override ueber einen expliziten, read-only Auslieferungspfad.
- [ ] DoD.6 Bestehende Surface-Gates (Menu, Start, Match, Feature-Launch) bleiben konsistent.
- [ ] DoD.7 Contract-Tests decken Basis, Override, Merge und Guard-Faelle ab.
- [ ] DoD.8 Desktop-only Leitplanke bleibt erhalten (kein Browser-Schreibpfad, keine Demo-Backdoor).

## Risiken

- R1 | hoch | Override erweitert Demo unbeabsichtigt -> Gegenmassnahme: monotones Clamp-Merge.
- R2 | hoch | Browser-Build liest Override nicht deterministisch -> Gegenmassnahme: expliziter Export-/Build-Pfad mit Diagnose.
- R3 | mittel | Drift zwischen Registry-Defaults und Override-Schema -> Gegenmassnahme: zentraler Normalizer + Contract-Tests.
- R4 | mittel | Settings-Studio-UX wird fuer Nicht-Experten zu komplex -> Gegenmassnahme: eigene Sektion mit Explainability + Preview.
- R5 | mittel | Folgefeatures umgehen Resolver und lesen weiterhin nur statische Data -> Gegenmassnahme: Resolver-only Leitplanke + Tests.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V98`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V98.md`
- hard dependencies:
  - `V77.99` (Surface-Policy-Grundlagen und Demo-Korridor)
  - `V97.99` (Settings-Studio-Hardening-Basis)
- soft dependencies:
  - `V81.99` (Developer-Tuning-Synergien)
  - `V64.99` (Multiplayer-Rollen- und Transportkontext)
- Hinweis: **Manuelle Uebernahme erforderlich**.

## Phasenplan

### 98.1 Contract-Design fuer Browser-Demo-Override

- [ ] 98.1.1 Neuen Override-Vertrag `browser-demo-surface-policy.v1` definieren (Version, erlaubte Felder, Normalizer, Validation-Codes).
- [ ] 98.1.2 Monotones Merge-Design spezifizieren: welche Felder per Intersection geclamped werden (`allowedSessionTypes`, `allowedModePaths`, `allowedPresetIds`, `curatedMapKeysByModePath`, `join/host transports`, Capability-Flags).
- [ ] 98.1.3 Migrations- und Reject-Regeln fuer kuenftige Vertragsversionen festlegen.

### 98.2 Resolver-Integration ohne Surface-Drift

- [ ] 98.2.1 `resolveSurfacePolicy`/`resolveSurfaceCapabilityAccess` um zentrales Browser-Demo-Override-Merge erweitern.
- [ ] 98.2.2 Sicherstellen, dass alle bestehenden Consumer (`PlatformSurfacePolicyOps`, Menu-/Start-/Match-Gates, Feature-Launch-Guards) unveraendert den gemergten Zustand lesen.
- [ ] 98.2.3 Strukturierte Diagnostik bereitstellen (`applied`, `skipped`, `fallback`, `reject`, reason-codes).

### 98.3 Settings-Studio-Sektion "Browser-Demo-Grenzen"

- [ ] 98.3.1 UI-Sektion mit klaren Feldern und Constraints aufbauen (keine freie JSON-Eingabe als Primarpfad).
- [ ] 98.3.2 Save-/Validate-/Preview-Flow analog V97 erweitern (inkl. Diff und Risk-Hinweisen fuer Demo-Grenzen).
- [ ] 98.3.3 I18n/Explainability fuer neue Felder und Fehlermeldungen (DE/EN) ergaenzen.

### 98.4 Persistenz und Auslieferungspfad (Desktop-only Editor, Browser read-only)

- [ ] 98.4.1 Dedizierten Policy-Service im Settings-Studio einfuehren (separate Datei, getrennt von `menu-defaults.override.json`).
- [ ] 98.4.2 Export-Mechanismus fuer Browser-Auslieferung definieren (z. B. versioniertes JSON-Artefakt im Repo-/Deploy-Pfad).
- [ ] 98.4.3 Build-/Runtime-Lesepfad fuer Browser-Demo verbindlich anbinden (fail-safe Fallback auf Basis-Policy, keine Laufzeitaufweitung).

### 98.5 Test- und Governance-Haertung

- [ ] 98.5.1 Contract-Tests fuer Override-Normalisierung, monotones Merge und Capability-/Policy-Konsistenz erweitern.
- [ ] 98.5.2 Settings-Studio-Tests fuer neue Sektion, Save-Preview, Fehlerpfade und Restore-Hygiene erweitern.
- [ ] 98.5.3 Architektur-/Referenzdoku auf neuen Leseweg und Guardrails aktualisieren.

### 98.99 Abschluss-Gate

- [ ] 98.99.1 Desktop-only Leitplanke nachweislich eingehalten (Editor nur Desktop, Browser nur read-only Consumer). (abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)
- [ ] 98.99.2 Browser-Demo-Grenzen lassen sich im Studio enger stellen und wirken im Browser-Lesepfad deterministisch. (abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)
- [ ] 98.99.3 Monotones Merge verhindert Aufweitung gegen Basis-Policy. (abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)
- [ ] 98.99.4 Contract-/Docs-/Plan-Gates sind gruen. (abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)

