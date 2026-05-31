---
title: Mobile God-File-Sunset fuer App-Shell und Touch-Input
status: draft
priority: P2
owner: user-intake
planned_block_id: V140
depends_on:
  - V132.99
  - V135.99
affected_area: mobile-god-file-sunset
scope_files:
  - src/mobile-classic/MobileClassicApp.js
  - src/ui/TouchInputSource.js
  - src/mobile-classic/MobileClassicStyles.js
  - src/mobile-classic/MobileClassicUpdateUi.js
  - src/mobile-classic/MobileClassicMenuUi.js
  - src/ui/touch/TouchTiltSteeringOps.js
  - src/ui/touch/TouchTiltSensorLifecycle.js
  - src/ui/touch/TouchControlLayoutOps.js
  - tests/mobile-classic-app.contract.test.mjs
  - tests/mobile-arcade-app.contract.test.mjs
  - scripts/architecture/LegacyMaxLinesConfig.mjs
  - docs/plaene/neu/Feature_Mobile_God_File_Sunset_V140.md
---

# Mobile God-File-Sunset fuer App-Shell und Touch-Input (V140)

Status: Draft fuer User-Intake.
Ziel-Masterplan: `docs/Umsetzungsplan.md`.
Vorgeschlagene Block-ID: `V140`.
Geplante aktive Detaildatei nach Intake: `docs/plaene/aktiv/V140.md`.
Zweckklasse: `plan`.
Decision-Klasse dieses Drafts: `D2` (neuer Plan-Draft unter `docs/plaene/neu/`, keine Master-/Aktivplan-Aenderung).

## Ziel

Die zwei gewachsenen Mobile-Hotspots werden in kleinen verhaltensneutralen Slices entlang echter Verantwortlichkeiten verkleinert:

- `src/mobile-classic/MobileClassicApp.js` bleibt eine duenne App-Shell statt Sammelstelle fuer Styles, Update-UI, Menue-DOM, Route-Sync und UI-Locks.
- `src/ui/TouchInputSource.js` bleibt Input-Adapter statt Sammelstelle fuer Tilt-Mathematik, Sensor-Lifecycle, Touch-Layout und DOM-Rendering.
- Jedes sichere Extraktionsergebnis senkt das passende Legacy-Ceiling oder entfernt den Eintrag.
- Funktionale Mobile-Aenderungen bleiben getrennt und bauen nicht weiter in die Hotspots hinein.

## Ausgangslage 2026-06-01

Der repository-weite Pre-Push-Lint meldet zwei bestehende `max-lines`-Verstoesse:

| Datei | ESLint-Zaehlerstand | Legacy-Ceiling | Delta |
| --- | ---: | ---: | ---: |
| `src/mobile-classic/MobileClassicApp.js` | 1276 | 1180 | +96 |
| `src/ui/TouchInputSource.js` | 1050 | 847 | +203 |

Die Blocker sind in `docs/Fehlerberichte/2026-05-31_map-tools-editor-push-blocked-by-existing-max-lines.md` reproduzierbar dokumentiert. Der letzte Map-Tools-Slice hat beide Dateien nicht veraendert; sichtbar wurde die Schuld erst beim spaeteren repository-weiten Push-Gate.

Historisches Wachstum nach dem Ceiling-Abgleich vom 2026-05-27:

- `src/ui/TouchInputSource.js`: funktionaler Mobile-Control-Slice mit `+230/-12`.
- `src/mobile-classic/MobileClassicApp.js`: Mobile-Settings-/Menue-Slices mit `+5` und `+94/-1`.

Der Refactor behandelt deshalb nicht nur Zeilenanzahl. Er schneidet die Verantwortlichkeiten so, dass kommende Mobile-Arbeit sichere Zielmodule hat.

## Governance-Handoff 2026-06-01

Mit explizitem D3-User-Gate wurden der Responsibility Growth Guard und die zugehoerigen Workflow-Eskalationen in `.agents/rules/code_quality_and_debugging.md` sowie `quick.md`, `code.md`, `bugfix.md`, `refactor.md` und `plan.md` verankert.

Effekt:

- Dateien ab 400 Zeilen und gelistete Debt-Surfaces brauchen vor fachlicher Erweiterung eine Verantwortlichkeitspruefung.
- Enge Bugfixes bleiben moeglich.
- Neue Verantwortung wandert in benannte Module oder einen geplanten Refactor-Scope.
- Legacy-Ceilings werden nicht routinemaessig an wachsende Ist-Staende angepasst.

Nicht Teil dieses Governance-Slices:

- keine Runtime-Aenderung,
- kein Hook- oder ESLint-Skript-Umbau,
- keine Ceiling-Aenderung,
- kein Master-/Aktivplan-Intake.

## Nicht-Ziele

- Kein Big-Bang-Rewrite beider Dateien.
- Keine Verhaltensaenderung an Mobile-Menue, Classic-/Parcours-Auswahl, Tilt-Mapping, Touch-Aktionen, Pause oder Android-Wrapper.
- Kein mechanischer Split nur fuer ein Zeilenlimit.
- Kein Hook-, Pre-Push-, ESLint- oder Touched-Guard-Umbau; technische Gate-Haertung bleibt separater Tooling-Scope.
- Kein direkter Intake in `docs/Umsetzungsplan.md`; die Uebernahme bleibt user-owned.
- Keine Vermischung mit funktionaler V131-Arbeit.

## Dependencies und Abgrenzung

Hard dependencies:

- `V132.99`: gemeinsame Android-App, Classic-/Parcours-Einstieg und Touch-/HUD-Baseline.
- `V135.99`: Mobile-Menue-UX, Start-Setup-Kompaktmodus und Route-Sync-Baseline.

Koordination:

- `V131` bleibt der funktionale Mobile-Classic-Steuerungsblock fuer Press-Events, Pause/Back, Tilt-Onboarding und Orientation-Policy.
- V140 sollte vor breiteren V131-Implementierungsslices mindestens die reinen Touch-Tilt-Ops extrahieren oder V131 explizit auf neue Zielmodule routen.
- Bestehende Funktionsfehler duerfen weiterhin eng behoben werden; sie rechtfertigen keinen verdeckten Ausbau der Debt-Surfaces.

Graph-/Scope-Signal:

- `node scripts/query-knowledge-graph.mjs impact-for-file src/mobile-classic/MobileClassicApp.js --json`: Klassifikation `mobile-wrapper`, Scope-Historie `V132`, `V135`.
- `node scripts/query-knowledge-graph.mjs impact-for-file src/ui/TouchInputSource.js --json`: Klassifikation `product-code`, Scope-Historie `V105`, `V132`, `V72`, `V91`.
- `node scripts/query-knowledge-graph.mjs scope-collisions --json`: keine aktive Dateikollision fuer die beiden Hotspots; historischer Mobile-Scope bleibt bei V132/V135 nachvollziehbar.

## Responsibility-Growth-Matrix

| Debt-Surface | Bestehende Verantwortungen | Erster bevorzugter Schnitt | Folge-Schnitt | Vorher-/Nachher-Evidence |
| --- | --- | --- | --- | --- |
| `MobileClassicApp.js` | App-Target, Mobile-Settings, Styles, Update-UI, Android-Menue-DOM, Route-Sync, Quick-Starts, UI-Locks | Style-Injection nach `MobileClassicStyles.js` extrahieren | Update-UI und danach Menue-/Route-Sync in eigene Module schneiden | ESLint-Zaehlerstand, Mobile-Contracts, Android-Asset-Check |
| `TouchInputSource.js` | Touch-State, Button-Definitionen, Tilt-Mathematik, Kalibrierung, Sensor-Lifecycle, Layout, DOM-Rendering | Pure Tilt-Mathematik und Kalibrierung nach `TouchTiltSteeringOps.js` extrahieren | Sensor-Lifecycle und danach Layout-/DOM-Ops schneiden | ESLint-Zaehlerstand, Tilt-Contracts, Mobile-Contracts |

## Architecture Acceptance

Betroffene Schichten:

- Mobile-App-Shell: `src/mobile-classic/**`.
- UI-Input-Adapter: `src/ui/TouchInputSource.js` und neue `src/ui/touch/**`-Ops.
- Tests: Mobile-Classic-/Mobile-Arcade-Contracts plus gezielte Pure-Ops-Contracts.
- Guard: `scripts/architecture/LegacyMaxLinesConfig.mjs` nur zum Senken oder Entfernen bestehender Ceilings.

Erlaubte Zielpfade:

- Reine Ops fuer Tilt-Berechnung, Kalibrierung und Layout.
- Kleine DOM-/Binding-Module fuer Mobile-Menue und Update-UI.
- Duenne Composition in den bisherigen Entry-Dateien.
- Bestehende Contracts, Events und Input-State-Strukturen bleiben kompatibel.

Verbotene Risiko-Surfaces:

- Keine neuen Runtime-/Global-Surfaces.
- Kein zweiter paralleler Mobile-Settings- oder Menu-State.
- Keine versteckte Verhaltensaenderung unter dem Label Refactor.
- Keine Ceiling-Erhoehung als Ersatz fuer Extraktion.

Neue oder veraenderte Dependency-Kanten:

- `MobileClassicApp.js` darf kleine `src/mobile-classic/**`-Module komponieren.
- `TouchInputSource.js` darf reine `src/ui/touch/**`-Ops konsumieren.
- Neue Module duerfen keine breiteren Runtime-Abhaengigkeiten einfuehren als der bisherige Entry-Pfad.

Guard-Signal:

- Vorher-/Nachher: `npm run lint:architecture`.
- Pro Touch-Slice: gezielter Node-Contract fuer exportierte Pure-Ops plus `node --test tests/mobile-classic-app.contract.test.mjs tests/mobile-arcade-app.contract.test.mjs`.
- Pro App-Shell-Slice: `node --test tests/mobile-classic-app.contract.test.mjs tests/mobile-arcade-app.contract.test.mjs`.
- Bei Android-Bundle-Wirkung: `npm run app:android:assets:check`.
- Abschluss: `npm run architecture:guard`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`.

Ratchet-Auswirkung:

- Nach jedem verifizierten Slice das zugehoerige Legacy-Ceiling absenken.
- V140 ist erst abgeschlossen, wenn beide aktuellen `max-lines`-Blocker verschwunden sind und keine neue Debt-Surface entstanden ist.

## AI-Ausfuehrungsmatrix

| Arbeit | Decision | Gate |
| --- | --- | --- |
| Analyse, Graph-Queries, Baseline, Plan-Draft | D0/D2 | AUTO |
| Reine Ops-Extraktion ohne Verhaltensaenderung | D2/D4 | REVIEW; D4 falls breiter Refactor oder unerwartete Surface-Wirkung |
| Legacy-Ceiling senken oder entfernen | D3 | USER-GATE zusammen mit dem verifizierten Extraktions-Slice |
| Ceiling erhoehen | D3 | separate USER-GATE-Ausnahme mit Rueckbaukriterium |
| Master-/Aktivplan-Intake | D3 | USER-GATE |

## Phasen

### 140.1 Baseline und Scope-Freeze

status: draft
goal: Verantwortlichkeiten, Konsumenten und kleinstes Regression-Signal vor dem Refactor festhalten.
output: Bestaetigte Matrix und Slice-Reihenfolge.

- [ ] 140.1.1 ESLint-Zaehlerstand, physische Zeilenzahl, Exporte und produktive Konsumenten fuer beide Debt-Surfaces erfassen.
- [ ] 140.1.2 Mobile-Contracts und vorhandene Tilt-/Touch-Testsignale inventarisieren; Testluecken fuer Pure-Ops-Extraktionen benennen.
- [ ] 140.1.3 Reihenfolge gegen V131 festziehen: zuerst verhaltensneutrale Ops-Extraktion oder explizite Zielmodul-Nutzung im funktionalen Nachbarblock.
- [ ] 140.1.4 Architecture Capsule und D2/D4-Slice-Grenze pro Extraktion dokumentieren.

### 140.2 Touch-Tilt-Ops extrahieren

status: draft
goal: Pure Tilt-Mathematik und Kalibrierung aus dem Input-Adapter loesen.
output: `TouchTiltSteeringOps.js` mit fokussierten Contracts.

- [ ] 140.2.1 `resolveTiltCalibrationNeutral`, Response-Curve-, Sensitivity-, Assist- und Steering-State-Berechnung als pure Ops extrahieren.
- [ ] 140.2.2 Bestehende Exporte kompatibel halten oder mit nachgewiesenem Konsumentenabgleich migrieren.
- [ ] 140.2.3 Gezielte Pure-Ops-Contracts und Mobile-Contracts ausfuehren; `TouchInputSource.js`-Ceiling auf den verifizierten Stand senken.

### 140.3 Touch-Sensor-Lifecycle und Layout schneiden

status: draft
goal: Sensor-Lifecycle und Touch-Layout vom Input-State-Adapter trennen.
output: Kleine Lifecycle- und Layout-Module ohne Semantikdrift.

- [ ] 140.3.1 Device-Orientation-Binding, Permission-, Calibration- und Dispose-Pfad nach `TouchTiltSensorLifecycle.js` schneiden.
- [ ] 140.3.2 Button-Definitionen, Layout-Resolver und DOM-nahe Darstellung nach `TouchControlLayoutOps.js` schneiden.
- [ ] 140.3.3 Press-/Hold-Semantik unveraendert lassen; funktionale V131-Aenderungen erst auf den neuen Zielmodulen umsetzen.
- [ ] 140.3.4 Contract-Signale ausfuehren und `TouchInputSource.js`-Ceiling erneut senken oder entfernen.

### 140.4 Mobile-App-Shell schneiden

status: draft
goal: Mobile-App-Entry auf Composition und Target-State begrenzen.
output: Kleine Mobile-Styles-, Update- und Menu-Module.

- [ ] 140.4.1 Style-Injection nach `MobileClassicStyles.js` extrahieren.
- [ ] 140.4.2 Update-Konfiguration, Github-Release-Check und Update-DOM nach `MobileClassicUpdateUi.js` extrahieren.
- [ ] 140.4.3 Android-Menue-DOM, Route-Sync, Quick-Starts und UI-Locks nach Verantwortung pruefen und den kleinsten sicheren Folge-Schnitt nach `MobileClassicMenuUi.js` umsetzen.
- [ ] 140.4.4 Mobile-Contracts und Android-Asset-Check ausfuehren; `MobileClassicApp.js`-Ceiling nach jedem sicheren Schnitt senken oder entfernen.

### 140.5 Guard-Ratchet und Handoff

status: draft
goal: Verkleinerung technisch festschreiben und funktionale Folgearbeit auf Zielmodule routen.
output: Gesenkte Ceilings, dokumentierte Restschuld und V131-Handoff.

- [ ] 140.5.1 `LegacyMaxLinesConfig.mjs` nur auf verifizierte niedrigere Staende anpassen; keine Ceiling-Erhoehung.
- [ ] 140.5.2 Restverantwortungen und maximal zwei weitere Folge-Slices dokumentieren, falls eine Entry-Datei noch ueber 500 Zeilen liegt.
- [ ] 140.5.3 V131-Handoff aktualisieren: Press-/Hold-, Pause-/Back- und Orientation-Arbeit nutzt die neuen Zielmodule statt die Debt-Surfaces auszubauen.

### 140.99 Abschluss-Gate

status: draft
goal: Beide Pre-Push-Blocker verhaltensneutral beseitigen.
output: Reproduzierbare Evidence und scoped Commits.

- [ ] 140.99.1 Alle vorherigen Phasen sind abgeschlossen oder blockerfest dokumentiert.
- [ ] 140.99.2 `npm run lint:architecture`, `npm run architecture:guard`, Mobile-Contracts, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.
- [ ] 140.99.3 Beide aktuellen `max-lines`-Blocker sind entfernt; keine neue Debt-Surface und keine versteckte Mobile-Verhaltensaenderung sind entstanden.

## Risiken

| Risiko | Stufe | Gegenmassnahme |
| --- | --- | --- |
| Refactor veraendert Tilt-Gefuehl oder Touch-Semantik | hoch | Pure-Ops zuerst, Contracts vor und nach jedem Slice, V131-Verhaltensaenderungen getrennt halten |
| App-Shell-Split bricht Android-Menue oder Route-Sync | hoch | Style-, Update- und Menu-Slices getrennt committen; Mobile-Classic-/Arcade-Contracts pro Slice |
| Neue Module werden nur verschobene Sammeldateien | mittel | Pro Slice genau eine Verantwortung, enge Exporte, keine neue Debt-Surface |
| Ceiling-Aenderung kaschiert Wachstum statt Sunset | mittel | Nur Absenkung oder Remove im selben verifizierten Slice; Erhoehung separat gegated |
| V131 und V140 greifen parallel dieselben Dateien an | mittel | Reihenfolge vor Intake festziehen; funktionale V131-Arbeit auf neue Zielmodule routen |

## Verifikationsplan

Kleinste sinnvolle Gates pro Slice:

- `node --test tests/mobile-classic-app.contract.test.mjs tests/mobile-arcade-app.contract.test.mjs`
- gezielte neue Pure-Ops-Contracts fuer Touch-Tilt-Extraktionen
- `npm run app:android:assets:check` bei Mobile-App-Shell- oder Android-Bundle-Wirkung
- `npm run lint:architecture`
- `npm run plan:check`

Abschluss-Gates:

- `npm run architecture:guard`
- `npm run docs:sync`
- `npm run docs:check`

Not-checked im Draft:

- Kein Runtime-Code geaendert.
- Keine Tests ausgefuehrt.
- Kein Device-Smoke ausgefuehrt.
- Kein Hook-/ESLint-Skript-Umbau geplant.

## Intake-Hinweis

Manuelle Uebernahme erforderlich:

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V140`
- Aktive Detaildatei nach Intake: `docs/plaene/aktiv/V140.md`
- Hard dependencies: `V132.99`, `V135.99`
- Koordination: V131 funktional getrennt halten und vor breiten Touch-Slices auf neue Zielmodule routen
- Empfohlene Prioritaet: P2 Architektur-Follow-up vor groesserer weiterer Mobile-Erweiterung
