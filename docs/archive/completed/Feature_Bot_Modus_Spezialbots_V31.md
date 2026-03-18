# Feature: Bot-Modus-Spezialbots V31

Stand: 2026-03-11

## Ziel

Die Bot-Auswahl soll pro Match genau einen spezialisierten Bot-Typ laden. Die Auswahl erfolgt automatisch aus den im Spiel gesetzten Modi:

1. `normal`/`classic` + `3d` -> `classic-3d`
2. `normal`/`classic` + `planar` -> `classic-2d`
3. `fight`/`hunt` + `3d` -> `hunt-3d`
4. `fight`/`hunt` + `planar` -> `hunt-2d`

Wichtig:

1. Pro Match wird nur ein Bot-Typ verwendet.
2. Es gibt keinen Mischbetrieb verschiedener Bot-Typen im selben Match.
3. Die Auswahl im Spiel bleibt zuerst `Fight` vs. `Normal` auf Ebene 2, danach `3d` vs. `planar` auf Ebene 3.
4. Die Architektur bleibt erweiterbar, damit spaeter weitere Modus-Bots additiv registriert werden koennen.

## Nicht-Ziele

1. Keine Bot-Auswahl pro Bot-Slot.
2. Kein paralleler Betrieb mehrerer Bot-Typen im selben Match.
3. Keine Trainingsumgebung als Teil dieser Phase; sie laeuft separat in V32.
4. Keine Balance-Aenderungen an Hunt-, Weapon- oder Flugphysik als Teil dieser Phase.

## Architektur-Check

Bestehende Einhaengepunkte:

1. `src/core/RuntimeConfig.js` loest `bot.policyType` bei `strategy=auto` deterministisch aus `activeGameMode + planarMode` auf.
2. `src/entities/runtime/EntitySetupOps.js` uebernimmt genau einen `botPolicyType` pro Match und erstellt damit alle Bots.
3. `src/entities/ai/BotPolicyRegistry.js` ist der richtige Erweiterungspunkt fuer neue Bot-Typen.
4. `src/entities/ai/BotRuntimeContextFactory.js` liefert schon `mode` und `planarMode` in den Runtime-Context.
5. `src/entities/ai/observation/ObservationSystem.js` schreibt `MODE_ID` und `PLANAR_MODE_ACTIVE` bereits in den Observation-Vektor.
6. Revalidiert am 2026-03-10:
   - Ebene 2 nutzt im UI `Fight` und `Normal`
   - `Fight` setzt technisch `gameMode=HUNT`
   - `Normal` setzt technisch `gameMode=CLASSIC`
   - Ebene 3 schaltet nur `planarMode` und aendert die Ebene-2-Auswahl nicht

Reuse vs. Neu:

1. Reuse: `BotPolicyRegistry`, `RuntimeConfig`, `EntitySetupOps`, `BotRuntimeContextFactory`, `ObservationSystem`.
2. Neu: klarer Modus-Resolver fuer `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d` sowie optionale Bot-Definitionen/Factories.

Risiko-Rating: `mittel`

Hauptrisiken:

1. Falsches Mapping zwischen UI-Moduswahl und geladenem Bot-Typ.
2. Regression im bisherigen `rule-based`/`hunt` Fallback.
3. Drift zwischen Runtime-Resolver, Registry und Tests.

Dokumentations-Impact:

1. `docs/Umsetzungsplan.md`
2. `docs/ai_architecture_context.md`
3. `docs/Bot-Training-Schnittstelle.md`
4. optional neues Testergebnisdokument, falls Implementierung direkt folgt

## Parallelbetrieb mit V32

V31 ist parallel zu V32 ausfuehrbar, wenn die Datei-Grenzen strikt eingehalten werden.

V31 besitzt:

1. `src/core/RuntimeConfig.js`
2. `src/entities/ai/BotPolicyTypes.js`
3. `src/entities/ai/BotPolicyRegistry.js`
4. `src/entities/runtime/EntitySetupOps.js`
5. `src/state/MatchSessionFactory.js`
6. mode-bezogene Tests, bevorzugt `tests/physics-policy.spec.js`

V31 fasst bewusst nicht an:

1. `src/entities/ai/training/**`
2. `src/state/training/**`
3. Training-Skripte unter `scripts/**`
4. V32-Dokumente

## Phasen

- [x] 31.0 Revalidierung und Contract-Freeze
  - Abgeschlossen am: `2026-03-11`
  - [x] 31.0.1 Revalidieren, dass heute nur `classic` vs. `hunt` aufgeloest wird
  - [x] 31.0.2 Freeze dokumentieren: genau ein Bot-Typ pro Match, Auswahl ueber `gameMode + planarMode`
  - Status 2026-03-11: Revalidierung gegen Runtime-, Entity- und Session-Wiring abgeschlossen; Match bleibt Single-Policy pro Runde.
  - Verifikation: Code-Lesepfade + kein Testlauf noetig

- [x] 31.1 Bot-Domain-Typen einfuehren
  - Abgeschlossen am: `2026-03-11`
  - [x] 31.1.1 Neue stabile IDs definieren: `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`
  - [x] 31.1.2 Hilfsfunktionen fuer Normalisierung und Gruppierung ergaenzen
  - [x] 31.1.3 Alte Typen kontrolliert kompatibel halten, damit keine harten Brueche entstehen
  - Status 2026-03-11: `BOT_POLICY_TYPES`, Alias-Normalisierung und Match-Typ-Erkennung konsolidiert.
  - Betroffene Dateien: `src/entities/ai/BotPolicyTypes.js`, neue Helper-Datei falls sinnvoll
  - Verifikation: gezielte Policy-Contract-Tests

- [x] 31.2 Match-Resolver fuer Modus -> Bot-Typ bauen
  - Abgeschlossen am: `2026-03-11`
  - [x] 31.2.1 Resolver aus `activeGameMode + gameplay.planarMode` implementieren
  - [x] 31.2.2 `normal` sauber auf Classic-Bot-Familie und `fight` auf Hunt-Bot-Familie mappen
  - [x] 31.2.3 Resolver in `RuntimeConfig` verdrahten
  - Status 2026-03-11: `resolveBotPolicyType` nutzt bei `auto` den Match-Resolver fuer alle vier Kombinationen.
  - Betroffene Dateien: `src/core/RuntimeConfig.js`, ggf. neues Resolver-Modul
  - Verifikation: RuntimeConfig-Tests fuer alle vier Kombinationen

- [x] 31.3 Entity-Setup auf den neuen Resolver ziehen
  - Abgeschlossen am: `2026-03-11`
  - [x] 31.3.1 `EntitySetupOps` uebernimmt den aufgeloesten Bot-Typ pro Match
  - [x] 31.3.2 Match-Setup bleibt bei genau einem Bot-Typ fuer alle Bots im Match
  - [x] 31.3.3 Fallback-Verhalten fuer unbekannte Typen bleibt kontrolliert
  - Status 2026-03-11: `MatchSessionFactory` und `EntitySetupOps` reichen den aufgeloesten Typ durch; alle Bot-Instanzen eines Matches teilen denselben Policy-Type.
  - Betroffene Dateien: `src/entities/runtime/EntitySetupOps.js`, `src/state/MatchSessionFactory.js`
  - Verifikation: Session-Wiring-Tests

- [x] 31.4 Registry und Bot-Factories fuer vier Spezialbots vervollstaendigen
  - Abgeschlossen am: `2026-03-11`
  - [x] 31.4.1 Registry um vier Match-Bot-Typen erweitern
  - [x] 31.4.2 Bestehende Policies/Fallbacks sinnvoll zuordnen
  - [x] 31.4.3 Hook vorbereiten, damit spaeter echte spezialisierte Modelle/Policies pro Typ hinterlegt werden koennen
  - Status 2026-03-11: Registry mappt `classic-*` auf Classic-Bridge-Familie und `hunt-*` auf Hunt-Bridge-Familie; kontrollierte Fallbacks bleiben aktiv.
  - Betroffene Dateien: `src/entities/ai/BotPolicyRegistry.js`, neue Policy-/Factory-Module falls noetig
  - Verifikation: Registry-Tests + Smoke ueber Match-Start

- [x] 31.5 Validierungsmatrix fuer vier Modus-Bots ausbauen
  - Abgeschlossen am: `2026-03-11`
  - [x] 31.5.1 `BotValidationMatrix` auf vier Szenarien nach Bot-Familie scharfziehen
  - [x] 31.5.2 KPI-Vergleiche pro Bot-Typ dokumentieren
  - [x] 31.5.3 Debug-/Validation-Protokoll fuer Revalidierung der vier Modi notieren
  - Status 2026-03-11: Validation-Matrix fuehrt jetzt vier explizite V31-Domaenen (`classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`) inkl. `gameMode`, `botPolicyStrategy` und `expectedPolicyType`; `BotValidationService.applyScenario()` setzt diese Felder deterministisch.
  - Betroffene Dateien: `src/state/validation/BotValidationMatrix.js`, `src/state/validation/BotValidationService.js`, Doku
  - Verifikation: gezielte Core-/Physics-Checks oder Debug-API-Szenarien

- [x] 31.6 Abschluss-Gate und Doku-Freeze
  - Abgeschlossen am: `2026-03-11`
  - [x] 31.6.1 `docs/Bot-Training-Schnittstelle.md` aktualisieren
  - [x] 31.6.2 `docs/ai_architecture_context.md` aktualisieren
  - [x] 31.6.3 Masterplan/Restpunkte aktualisieren
  - [x] 31.6.4 Doku-Gates gruen
  - Status 2026-03-11: Doku auf V31/V32-Stand konsolidiert; Testfilter fuer geaenderte Testtitel auf exakte IDs gehaertet.
  - Verifikation: `npm run docs:sync`, `npm run docs:check`

## Definition of Done

1. Matchstart waehlt reproduzierbar genau einen Bot-Typ aus den vier Modus-Kombinationen.
2. `normal/fight` im UI bzw. `classic/hunt` technisch sowie `3d/planar` ergeben deterministisch den erwarteten Bot-Typ.
3. Alle Bots eines Matches nutzen denselben aufgeloesten Typ.
4. Alte Fallbacks brechen nicht unkontrolliert.
5. Doku und Tests beschreiben den neuen Resolver klar.

## Verifikation

Empfohlene Reihenfolge waehrend der Umsetzung:

1. `npx playwright test tests/physics-policy.spec.js -g "T73:|T74:|T79:|T81:|T82:" --workers=1`
2. `npm run test:core`
3. `npm run docs:sync`
4. `npm run docs:check`

Optional nach Implementierung:

1. Browser-Repro fuer alle vier Kombinationen:
   - `normal + 3d`
   - `normal + planar`
   - `fight + 3d`
   - `fight + planar`
2. Debug-Ausgabe oder Test-Assertion, welcher Bot-Typ jeweils gebunden wurde
