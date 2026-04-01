# Feature Testlandschaft Umbau V78

Stand: 2026-04-01
Status: Entwurf
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die Testlandschaft von Curvios Clash wird in eine klarere und guenstigere Testpyramide umgebaut: schnelle `node:test`-Vertragstests als Standard, kleine Playwright-Smokes fuer echte Runtime-/UI-Integration immer verfuegbar und teure Browser-, GPU-, Stress- oder Multiplayer-Suiten nur noch gezielt nach Scope oder am Abschluss-Gate. Ziel ist mehr Aussagekraft pro Laufminute, weniger Flakes und eine bessere Kopplung zwischen geaendertem Pfad und sinnvoller Verifikation.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V78`
- Hard dependencies: Keine fachlich harte Vorbedingung. Bei spaeterer Umsetzung muessen nur aktive Ownerships respektiert werden, sobald Testumbauten in produktnahe Pfade wie `src/core/runtime/**`, `src/core/recording/**`, `src/ui/menu/**` oder `src/network/**` kleine Test-Seams benoetigen.
- Soft dependencies: `V64`, `V74`, `V75`, `V76`, `V77`, weil Multiplayer-, Runtime-, Recorder-, Shell- und Surface-Rollen die kuenftige Testauswahl beeinflussen und der Umbau diese Linien nicht versehentlich wieder zusammenziehen darf.
- Datei-Ownership: Hauptsaechlich `tests/**`, `.agents/test_mapping.md`, `.github/workflows/ci.yml`, `package.json`, `docs/**`; moegliche Kollisionen entstehen erst, wenn fuer Headless-Tests gezielt kleine Export-/Contract-Seams in `src/**` noetig werden.
- Hinweis: Manuelle Uebernahme in `docs/Umsetzungsplan.md` erforderlich.

## Ausgangslage

- Der aktuelle Bestand ist browserlastig: `20` Playwright-`.spec.js` stehen `17` `node:test`-Dateien gegenueber.
- `tests/core.spec.js` ist mit `149` Tests gleichzeitig Basissmoke, Vertragspruefung, Persistenzcheck, Runtime-Regression und Feature-Sammelbecken.
- Mehrere Suites testen reine Logik oder Vertragsverhalten ueber Playwright und kompletten App-Load, obwohl dafuer bereits ein leichteres Muster mit `node:test` im Repo existiert.
- Die globale Playwright-Vorbereitung ist teuer, weil `tests/playwright.global-setup.js` viele Module und Laufzeitpfade vorwaermt.
- Die aktuelle CI fuehrt nur `npm run test:core` aus; dadurch ist der Default-Lauf teuer, aber trotzdem nicht sauber nach Testklassen getrennt.
- `.agents/test_mapping.md` bevorzugt noch zu oft Playwright-Pfade, obwohl fuer viele Aenderungen ein schmalerer Vertragstest reichen wuerde.

## Scope

- Primaerer Verifikationspfad bleibt die Desktop-App-Runtime; Browser/Web wird nur in seinem Demo-Rahmen abgesichert.
- Browser-Demo erhaelt eine kleine, stabile Smoke-Schicht fuer Laden, erlaubte Menuepfade und Demo-kritische Flows, aber keine implizite Vollparitaet fuer jede Produktfunktion.
- Der Umbau betrifft Testarchitektur, Skripte, Mapping, CI-Selektion und Dokumentation; produktive Gameplay-Aenderungen sind nicht Ziel dieses Blocks.
- Kleine Test-Seams in `src/**` sind nur erlaubt, wenn sie den Code headless testbar machen und keine neue Runtime-Komplexitaet erzeugen.
- GPU-, Stress-, Multiplayer- und Training-E2E-Pfade bleiben erhalten, werden aber als gezielte Spezial-Suites statt als Default-Grundrauschen behandelt.

## Zielbild

- Ebene A: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Architektur-/Determinismus-/Encoding-Guards.
- Ebene B: schnelle `node:test`-Vertragstests fuer reine Logik, Contracts, Policies, Normalizer, State-Maschinen und Dateischnittstellen.
- Ebene C: kleine Playwright-Smokes fuer App-Load, Matchstart, Rueckkehr ins Menue, kritische Persistenz und ausgewaehlte Editor-/Demo-Einstiege.
- Ebene D: gezielte schwere Suites fuer GPU, Stress, Multiplayer, Recorder, Trainings-E2E und historische Regressionen nur bei passendem Scope oder am `*.99`-Gate.

## Betroffene Pfade (geplant)

- `package.json`
- `.agents/test_mapping.md`
- `.github/workflows/ci.yml`
- `playwright.config.js`
- `tests/core.spec.js`
- `tests/physics-core.spec.js`
- `tests/physics-hunt.spec.js`
- `tests/physics-policy.spec.js`
- `tests/game-mode-strategy.spec.js`
- `tests/audio.spec.js`
- `tests/training-environment.spec.js`
- `tests/training-automation-core.spec.js`
- `tests/network-adapter.spec.js`
- `tests/gpu.spec.js`
- `tests/stress.spec.js`
- `tests/editor-map-ui.spec.js`
- `tests/v28-regression.spec.js`
- `tests/tmp-shorts-diagnostic.spec.js`
- neue oder umgeschnittene `tests/*.test.mjs` fuer Vertrags-/Logikpfade
- bei Bedarf kleine Test-Seams in `src/**`
- Doku zu Teststrategie und Abschluss-Gate-Zuordnung

## Definition of Done (DoD)

- [ ] DoD.1 Die Testlandschaft ist in klar benannte Klassen aufgeteilt: `guard`, `node-contract`, `playwright-smoke`, `playwright-targeted`, `heavy-special`.
- [ ] DoD.2 `tests/core.spec.js` ist auf einen kleinen Default-Smoke reduziert; reine Vertrags-, Import-, Policy- und State-Checks sind in schnellere Tests ausgelagert.
- [ ] DoD.3 Logiklastige Suites wie Audio-, Game-Mode-, Training- und aehnliche Vertragspruefungen nutzen standardmaessig `node:test` oder gleich leichte Headless-Pfade statt kompletten Browser-Load.
- [ ] DoD.4 `package.json`, CI und `.agents/test_mapping.md` zeigen auf den billigsten sinnvollen Verifikationspfad; schwere Suites werden nicht mehr als stiller Default ausgefuehrt.
- [ ] DoD.5 Browser-/Demo-Smokes pruefen nur noch die fuer Web wirklich relevanten Pfade; Desktop bleibt Source of Truth fuer volle Feature-Abdeckung.
- [ ] DoD.6 Temporaere Diagnostik- oder Einmalsuites sind als solche markiert, archiviert oder aus dem Default-Pfad entfernt.
- [ ] DoD.7 Der Umbau dokumentiert einen Rollout- und Rueckfallpfad, falls Coverage-Luecken oder instabile Flanken sichtbar werden.
- [ ] DoD.8 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind fuer den Planstand gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 78.1 Bestand inventarisieren und wirtschaftlich klassifizieren

- [ ] 78.1.1 Alle bestehenden Testdateien, Skripte und CI-Einstiege in Klassen einordnen: `default`, `targeted`, `block-end`, `diagnostic`, `legacy`.
- [ ] 78.1.2 Pro Suite den echten Nutzentyp festhalten: `Produkt-Smoke`, `Vertrag`, `State/Policy`, `Performance`, `GPU`, `Netzwerk`, `Editor`, `Training`, `Diagnostik`.
- [ ] 78.1.3 Kandidaten markieren, die derzeit durch Playwright laufen, fachlich aber ohne Browser testbar sind.

### 78.2 Zielstruktur fuer Dateischnitt, Namen und Ausfuehrung festlegen

- [ ] 78.2.1 Eine verbindliche Zielstruktur fuer schnelle `node:test`-Dateien und kleine Playwright-Smokes definieren, damit neue Tests nicht erneut in `core.spec.js` oder andere Sammelbecken laufen.
- [ ] 78.2.2 Regeln fuer Testnamen, Laufklassen und Auswahlpfade in `package.json` entwerfen, inklusive klarer Trennung zwischen `immer`, `gezielt`, `nur Abschluss-Gate`.
- [ ] 78.2.3 Festlegen, welche Browser-/Demo-Flows dauerhaft als minimale Web-Smokes bestehen bleiben und welche Vollversionspfade nur fuer Desktop relevant sind.

### 78.3 Reine Logik- und Vertragstests aus dem Browser herausziehen

- [ ] 78.3.1 Logiklastige Teile aus `tests/game-mode-strategy.spec.js`, `tests/audio.spec.js`, `tests/training-environment.spec.js` und `tests/training-automation-core.spec.js` in schnelle `node:test`- oder gleich leichte Headless-Tests ueberfuehren.
- [ ] 78.3.2 Nur die wirklich browserabhaengigen Restfaelle als kleine Playwright-Slices behalten, zum Beispiel echte DOM-, Canvas- oder Browser-API-Abhaengigkeiten.
- [ ] 78.3.3 Falls noetig minimale Test-Seams in `src/**` planen, die Importierbarkeit und Determinismus verbessern, ohne Produktpfade aufzublaehen.

### 78.4 Playwright auf echte Smokes und Integrationsslices zuschneiden

- [ ] 78.4.1 `tests/core.spec.js` in einen kleinen Default-Smoke und separate gezielte Integrations- oder Regressionsslices aufteilen.
- [ ] 78.4.2 GPU-, Stress-, Recorder-, Netzwerk-, Editor- und historische Regressionssuites auf explizite Einsatzbedingungen reduzieren, statt sie implizit im Grundrauschen zu fuehren.
- [ ] 78.4.3 Global-Setup, Helfer und Modul-Warmup darauf pruefen, wo Overhead fuer kleine Smokes reduziert oder lokalisiert werden kann.

### 78.5 Skripte, Test-Mapping und CI verdrahten

- [ ] 78.5.1 `package.json` so schneiden, dass `fast`, `contract`, `smoke`, `targeted`, `heavy` und gegebenenfalls `diagnostic` als klare Einstiegspunkte existieren.
- [ ] 78.5.2 `.agents/test_mapping.md` auf `billigster sinnvoller Test zuerst` umstellen, mit Node-Tests als Default fuer Logikpfade und Playwright nur fuer echte Runtime-/UI-Fragen.
- [ ] 78.5.3 `.github/workflows/ci.yml` auf einen kleinen Pflichtpfad aus Guards plus schneller Vertrags-/Smoke-Schicht umbauen; schwere Suiten bleiben bewusst selektiv.

### 78.6 Spezialfaelle, Altlasten und Diagnostik sauber abgrenzen

- [ ] 78.6.1 Temporaere oder einmalspezifische Dateien wie `tests/tmp-shorts-diagnostic.spec.js` als Diagnostik markieren, verschieben oder aus dem regulaeren Pfad entfernen.
- [ ] 78.6.2 Historische Einzelregressionen wie `tests/v28-regression.spec.js` auf Nutzen, Aktualitaet und passende Trigger pruefen, damit sie nicht unnoetig den Default-Pfad vergroessern.
- [ ] 78.6.3 Fuer Training-, Multiplayer- und Recorder-Suiten festlegen, welche davon produktionskritische Gate-Tests sind und welche nur bei gezielten Eingriffen Sinn ergeben.

### 78.7 Rollout, Dokumentation und Rueckfallpfad absichern

- [ ] 78.7.1 Eine kurze Repo-Teststrategie dokumentieren: Wann laufen Guards, wann `node:test`, wann Playwright-Smoke, wann schwere Spezialpfade.
- [ ] 78.7.2 Einen zweistufigen Rollout planen, damit der Umbau zuerst die teuersten Low-Value-Tests verschiebt und erst danach die tiefen Sammelsuiten zerlegt.
- [ ] 78.7.3 Einen Rueckfallpfad dokumentieren, falls eine ausgelagerte Suite wichtige Integrationssignale verliert oder in der Praxis doch Browserabhaengigkeiten zeigt.

### 78.99 Integrations- und Abschluss-Gate

- [ ] 78.99.1 Der geplante Testklassen-Schnitt ist dokumentiert, die Datei-/Script-Ziele sind benannt und Ownership-Konflikte fuer `src/**`-Seams sind vor Umsetzung sichtbar.
- [ ] 78.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind vorbereitet beziehungsweise fuer die Planaufnahme nachweisbar.
- [ ] 78.99.3 Die manuelle Intake-Notiz fuer `docs/Umsetzungsplan.md` enthaelt Block-ID, Abhaengigkeiten, Scope und die Kernentscheidung `Node zuerst, Playwright gezielt`.

## Risiko-Register V78

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reine Logiktests werden zu aggressiv aus Playwright herausgezogen und verlieren echte Browser-Signale | mittel | QA/Test-Architektur | Restfaelle mit DOM-/Canvas-/Browser-API sauber als Smoke behalten; Migration pro Suite begruenden | Ein ausgelagerter Test braucht ploetzlich wieder `page`, Canvas oder Browser-Storage |
| `core.spec.js` wird verkleinert, aber ein kritischer Start-/Persistenzpfad faellt aus dem Default-Schutz | hoch | QA/Test-Architektur | Vor dem Split explizite Minimal-Smoke-Checkliste fuer App-Load, Matchstart, Menue-Return, Persistenz, Demo-Menue festschreiben | CI wird schneller, meldet aber spaeter Integrationsregressionen erst in Speziallaeufen |
| Neue `node:test`-Suiten sind technisch vorhanden, aber weder in `package.json` noch in CI oder `test_mapping` sauber angebunden | mittel | Build/Test-Infra | Verdrahtung als eigener Umbau-Schritt mit DoD und Abschluss-Gate erzwingen | Tests existieren, werden aber nie standardmaessig ausgewaehlt |
| Aktive Runtime-/Recorder-/Multiplayer-Bloecke aendern dieselben Vertraege waehrend des Testumbaus | mittel | Block-Owner | Nur minimale Test-Seams in fremden Ownership-Pfaden und vorherige Koordination ueber Intake/Sub-Lock | Umsetzung beruehrt `src/core/runtime/**`, `src/network/**` oder `src/core/recording/**` parallel zu aktiven Bloecken |
