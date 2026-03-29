# Feature: Test Performance Optimization V2 (Testbeschleunigung V2)

**Ziel:** Die Ausführungszeit der Test-Suite weiter drastisch reduzieren und Flakes/Hänger komplett eliminieren.

**Betroffene Dateien:**

- `tests/core.spec.js`
- `tests/v28-regression.spec.js`
- `tests/stress.spec.js`
- `tests/physics-*.spec.js` (potenziell für `beforeAll`-Routing)

## Planungsphasen

### Phase 1: `core.spec.js` aufteilen (Parallelisierung maximieren)

Die aktuelle `core.spec.js` beinhaltet 61 Tests und läuft `serial`. Um die `workers: 2` (bzw. auf CI noch mehr) voll auszunutzen, muss die Datei thematisch aufgeteilt werden.

- [ ] 1.1 Neue Dateien anlegen (z.B. `core-infra.spec.js`, `core-menu.spec.js`, `core-editor.spec.js`).
- [ ] 1.2 Tests aus `core.spec.js` thematisch in die neuen Dateien umziehen.
- [ ] 1.3 `test.describe.configure({ mode: 'serial' })` in den jeweiligen neuen Dateien beibehalten, sofern sie intern State teilen.
- [ ] 1.4 Verifikation: `npm run test:core` läuft durch und nutzt nun mehrere Worker für die neuen Dateien parallel.

### Phase 2: Hängenden Test `T28c` in `v28-regression.spec.js` reparieren

Dieser Test bleibt reproduzierbar hängen (teilweise >30 Minuten), vermutlich wegen einer Race-Condition im UI-Setup (`startMazeGameWithBots`).

- [ ] 2.1 Analyse der `startMazeGameWithBots`-Hilfsfunktion und Erkennung des Timeouts/Blockers.
- [ ] 2.2 Robusteres Warten implementieren (z.B. auf Engine-Events statt fixer Timeouts).
- [ ] 2.3 Verifikation: `npm run test:v28:regression -- -g "T28c"` läuft konsistent und in unter 1 Minute durch.

### Phase 3: `test.beforeAll` / Engine-Soft-Reset einführen

Aktuell starten fast alle Tests per `page.goto('/')` komplett neu, was hohen Overhead (1-2s pro Test) erzeugt.

- [ ] 3.1 Eine zentrale Helfer-Funktion `resetEngineToMenu(page)` in `tests/helpers.js` schreiben, die statt `page.goto('/')` den aktuellen State per API ins Hauptmenü zurücksetzt (sofern der Browser-Tab noch lebt).
- [ ] 3.2 Tests, die lediglich read-only UI-Checks machen, auf die neue Reset-Funktion umstellen.
- [ ] 3.3 Verifikation: Lokale Messung der Gesamtlaufzeit der modifizierten Suites (sollte spürbar sinken).

### Phase 4: Event-basiertes Warten (Eliminierung von `waitForTimeout`)

Fixe `waitForTimeout`-Aufrufe sind instabil und langsam.

- [ ] 4.1 Verbliebene `waitForTimeout()` in den Spec-Dateien identifizieren (insb. in den verbliebenen `core-*.spec.js` und `stress.spec.js`).
- [ ] 4.2 Ersetzen durch explizites Warten auf DOM-Reaktivität (`page.waitForSelector`) oder Engine-State (`page.waitForFunction(() => window.GAME_INSTANCE...)`).
- [ ] 4.3 Verifikation: Voller Lauf aller Suits (`test:core`, `test:physics`, `test:stress`); keine neuen Flakes durch das entfernte Polling.

## Verification / Abschluss

- [ ] Abschließender Lauf: `npm run benchmark:baseline` gefolgt von der kompletten Test-Suite prüfen.
- [ ] `npm run docs:sync` & `npm run docs:check`.
