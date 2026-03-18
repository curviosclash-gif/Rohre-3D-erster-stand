# Feature Plan: Projektstruktur Spiel und Dev-Ordner V43

Stand: 2026-03-17
Status: Geplant
Owner: Single-Agent Planung

## Ziel

Die Repository-Struktur so ordnen, dass spielrelevante Dateien fuer Runtime und Editoren klar von Entwickler-, Test-, Trainings- und Wartungsdateien getrennt sind, ohne den aktuellen Vite-/Browser-/Playwright-Setup unnoetig zu destabilisieren.

Der Plan soll:

- spielnahe Dateien schnell auffindbar machen
- Map-Editor und Vehicle-Editor als Teil des Spielbereichs behandeln
- Entwickler-Werkzeuge in einem klaren Sammelpfad buendeln
- einen risikoarmen Migrationspfad definieren statt eines grossen Einmal-Umzugs

## Empfehlung

Nicht mit einem sofortigen Komplett-Umzug nach `spiel/` oder `game/` beginnen.

Empfohlen ist eine zweistufige Strategie:

1. Kurzfristig den Repo-/Build-Root stabil lassen und zuerst nur Entwicklerpfade unter `dev/` oder `tools/` buendeln.
2. Einen echten `game/`-Unterordner erst spaeter anfassen, nachdem harte Pfadkopplungen zentralisiert und getestet sind.

Fuer dieses Repo ist `dev/` der bessere erste Schritt als `developer/`, weil der Name kuerzer ist und besser zu den bereits englischen Pfaden passt.

## Ausgangslage

- Das Spiel laeuft aktuell ueber Root-Einstiege wie `index.html`, `style.css`, `vite.config.js` und `package.json`.
- Der Map-Editor liegt bereits separat unter `editor/` und wird aus dem Menue direkt per URL geoeffnet.
- Der Vehicle-Editor ist funktional an Vite-APIs, Datenpfade und generierte Vehicle-Konfigurationen gekoppelt.
- Training, Tests und Automatisierung liegen verteilt ueber `scripts/`, `tests/`, `trainer/`, Root-Startskripte und mehrere Arbeitsordner.

Harte Kopplungen, die einen sofortigen `game/`-Umzug riskant machen:

- `index.html` bindet `style.css` direkt im Root ein.
- `src/ui/menu/MenuGameplayBindings.js` oeffnet `editor/map-editor-3d.html` per `window.open(...)`.
- `tests/core.spec.js` navigiert direkt auf `/editor/map-editor-3d.html`.
- `start_editor.bat` und `start_editor_local.bat` zeigen auf `http://localhost:5173/editor/map-editor-3d.html`.
- `vite.config.js` importiert Root-pfadig `./src/entities/MapSchema.js`, liest und schreibt unter `data/maps` und `data/vehicles` und startet Trainingsprozesse ueber `scripts/**`.

## Variantenbewertung

### Variante A: Sofort alles nach `game/` und `dev/` verschieben

- Vorteil:
  - sehr saubere Zielstruktur
- Nachteil:
  - hoher Umbau an Vite-Root, Editor-URLs, Tests, Startskripten und Dateigeneratoren
- Risiko:
  - hoch
- Empfehlung:
  - derzeit nicht als erster Schritt

### Variante B: Spielpfade stabil lassen, nur Entwicklerpfade nach `dev/` ziehen

- Vorteil:
  - geringerer URL- und Runtime-Eingriff
  - Vite-Browserpfade bleiben zunaechst stabil
  - Root wird bereits deutlich sauberer
- Nachteil:
  - Zielbild ist noch nicht maximal konsolidiert
- Risiko:
  - mittel
- Empfehlung:
  - **empfohlener Startpfad**

### Variante C: Nur Root aufraeumen, aber keine echten Pfade aendern

- Vorteil:
  - geringstes Risiko
- Nachteil:
  - eigentliche Strukturprobleme bleiben
- Risiko:
  - niedrig
- Empfehlung:
  - nur sinnvoll als Vorstufe fuer Variante B

## Empfohlene Zielstruktur

### Phase-1-Zielbild

```text
/
  index.html
  style.css
  src/
  editor/
  assets/
  data/
  videos/
  dev/
    scripts/
    tests/
    trainer/
    prototypes/
    backups/
    bin/
  docs/
  package.json
  vite.config.js
```

### Optionales spaeteres Phase-2-Zielbild

```text
/
  game/
    index.html
    style.css
    src/
    editor/
    assets/
    data/
    videos/
  dev/
    scripts/
    tests/
    trainer/
    prototypes/
    backups/
    bin/
  docs/
  package.json
  vite.config.js
```

## Was als Spielbereich gelten sollte

- `index.html`
- `style.css`
- `src/**`
- `editor/**`
- `assets/**`
- `data/maps/**`
- `data/vehicles/**`
- `videos/**` sofern sie Spiel-/Replay-/Capture-Artefakte enthalten

## Was als Entwicklerbereich gelten sollte

- `scripts/**`
- `tests/**`
- `trainer/**`
- `prototypes/**`
- `backups/**`
- Root-Start-/Ops-Skripte wie `start_*.bat`, `server.ps1`, `backup*.ps1`
- Playwright-/Test-Arbeitsordner, sofern sie nicht bewusst als Build-Artefakt im Root bleiben sollen

## Architektur-Check

- Der Plan kreuzt praktisch alle zentralen Ownership-Bereiche (`src/ui/**`, `src/core/**`, `src/state/**`, `scripts/**`, `tests/**`, `editor/**`).
- Deshalb sollte V43 zunaechst nur als Intake-/Referenzplan stehen und nicht parallel zu einem grossen Runtime-Umbau aktiviert werden.
- Vor einem echten `game/`-Umzug muessen URL- und Pfadkonstanten zentralisiert werden, damit Editor-, Test- und Build-Pfade nicht an vielen Stellen hart codiert bleiben.
- Die Editoren gehoeren fachlich zum Spielbereich, nicht zum Dev-Bereich. Sie sind Spielwerkzeuge fuer Content-Erstellung und werden direkt aus dem Menue geoeffnet.

## Risiko

- Gesamt: **mittel bis hoch**
- Niedrigeres Teilrisiko:
  - nur `dev/`-Buendelung
- Hoeheres Teilrisiko:
  - echter `game/`-Umzug

Hauptgruende:

- Root-relative Browserpfade
- Vite-Plugin-Logik fuer Map-/Vehicle-Save und Training
- viele Paket- und Testskripte mit direkten `scripts/**`-Pfaden
- Editor-Startpfade in Tests und Batch-Dateien

## Betroffene Dateien (geplant)

- `package.json`
- `vite.config.js`
- `index.html`
- `style.css`
- `src/**`
- `editor/**`
- `scripts/**`
- `tests/**`
- `trainer/**`
- `start_*.bat`
- `server.ps1`
- `backup*.ps1`
- `docs/Umsetzungsplan.md`
- neue Zielpfade `dev/**` und optional spaeter `game/**`

## Erfolgsmetriken

- Die Root-Ebene enthaelt nur noch Repo-/Build-/Doku-Kernpfade und keine verstreuten Dev-Werkzeuge mehr.
- Spielbereich und Dev-Bereich sind fuer neue Dateien eindeutig.
- Editor-Links, Startskripte, Build und Tests laufen nach jeder Migrationsstufe weiterhin.
- Ein spaeterer `game/`-Umzug ist optional vorbereitet, aber nicht erzwungen.

## Phasenplan

- [ ] 43.0 Scope-Freeze und Ordnervertrag
  - [ ] 43.0.1 Alle Root-Pfade in Kategorien einteilen: Spiel, Editor, Dev, Repo-Metadaten, Artefakte
  - [ ] 43.0.2 Endgueltigen Namensvertrag festziehen: `dev/` statt `developer/`; Editoren explizit als Spielbereich markieren

- [ ] 43.1 Pfad-Inventar und Kopplungen zentralisieren
  - [ ] 43.1.1 Alle hart codierten Editor-, Test- und Tool-Pfade in `vite.config.js`, Startskripten, Tests und Menuecode erfassen
  - [ ] 43.1.2 Wo sinnvoll zentrale Konstanten oder Hilfsfunktionen fuer Editor-URLs, Tool-Roots und Generierungsziele einfuehren

- [ ] 43.2 Dev-Bereich mit geringem Risiko auslagern
  - [ ] 43.2.1 `scripts/**`, `tests/**`, `trainer/**`, `prototypes/**` und Hilfsskripte in einen gemeinsamen `dev/`-Pfad verschieben oder ueber Wrapper dorthin abstrahieren
  - [ ] 43.2.2 `package.json`, CI-/Hook-Pfade, Startskripte und Doku auf den neuen Dev-Pfad anpassen, ohne Browser-Runtime-Pfade anzufassen

- [ ] 43.3 Spielbereich stabilisieren
  - [ ] 43.3.1 Editoren, Map-/Vehicle-Datenpfade und generierte Artefakte als klaren Spielbereich dokumentieren und gegen Drift absichern
  - [ ] 43.3.2 Root nur soweit bereinigen, dass Spielstart, Editor-Start und lokale Speicherpfade unveraendert funktionieren

- [ ] 43.4 Optionaler `game/`-Unterordner als zweite Stufe
  - [ ] 43.4.1 Erst nach gruener Dev-Migration pruefen, ob `index.html`, `style.css`, `src/`, `editor/` und ggf. Assets explizit unter `game/` gezogen werden sollen
  - [ ] 43.4.2 Falls ja: Vite-Root, Editor-URLs, Playwright-Targets, Startskripte, Generierungsziele und Doku in einem eigenen, voll verifizierten Schritt umhaengen

- [ ] 43.5 Verifikation an Funktionsgrenzen
  - [ ] 43.5.1 Nach Dev-Migration: `npm run build`, `npm run test:core` und relevante Editor-/Tool-Smokes bestaetigen
  - [ ] 43.5.2 Nach optionalem `game/`-Umzug: Browser-Spotchecks fuer Spielstart, Map-Editor, Vehicle-Editor und Disk-Save-APIs festhalten

- [ ] 43.9 Abschluss-Gate
  - [ ] 43.9.1 Finale Struktur und Pfadvertraege per `build`, Kern-Tests und manuellem Editor-Spotcheck bestaetigen
  - [ ] 43.9.2 `npm run docs:sync`, `npm run docs:check` und Doku-Freeze abschliessen

## Verifikation

- Nach 43.2:
  - `npm run build`
  - `npm run test:core`
- Nach 43.4:
  - `npm run build`
  - `npm run test:core`
  - gezielter Map-Editor-Spotcheck
- Vor Abschluss:
  - `npm run docs:sync`
  - `npm run docs:check`

## Freshness-Hinweis

Der Plan gilt erst als abgeschlossen, wenn nach der finalen Umsetzungsstufe `npm run docs:sync` und `npm run docs:check` erfolgreich gelaufen sind.
