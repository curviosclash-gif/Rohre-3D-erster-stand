# Feature Architektur-Entflechtung Runtime Tooling V79

Stand: 2026-04-01
Status: Entwurf
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die derzeit sichtbar verdichteten Architektur-Knoten von CurviosClash werden in einen klareren Zuschnitt aus Runtime, Tooling, Desktop-Shell und Test-/Verifikationspfaden ueberfuehrt. Ziel ist nicht ein kosmetischer Grossumbau, sondern eine gezielte Reduktion der kognitiven Last: weniger Mischzustaendigkeiten in zentralen Dateien, klarere Ownership pro Schicht und ein stabilerer Einstieg fuer Folgearbeit an Desktop-App, Browser-Demo, Multiplayer, Recording und Bot-Training.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V79`
- Hard dependencies: `V74.99`, weil Lifecycle-, Composition- und Capability-Grenzen fuer `src/core/main.js`, `src/core/runtime/**`, `src/state/**` und `vite.config.js` erst nach Abschluss der aktiven Runtime-Entkopplung belastbar weitergeschnitten werden sollten.
- Soft dependencies: `V77.99`, weil Surface- und Produktrollen (`desktop-app` vs `browser-demo`) den kuenftigen Zuschnitt fuer Shell-, Export-, Editor- und Multiplayer-Pfade beeinflussen; `V78`, falls Testumbauten parallel bereits neue Test-Seams und guenstigere Verifikationspfade schaffen.
- Datei-Ownership: geplanter Scope beruehrt vor allem `src/core/**`, `src/state/**`, `src/ui/**`, `vite.config.js`, `electron/**`, `scripts/**`, `tests/**`, `docs/**`; fachliche Kollisionen mit `V74`, spaeter auch mit `V64`, `V75` und `V76`, sind wahrscheinlich und muessen vor Umsetzung ueber Lock/Sub-Lock oder sequenzielle Intake-Fenster geklaert werden.
- Hinweis: Manuelle Uebernahme in `docs/Umsetzungsplan.md` erforderlich.

## Ausgangslage

- `src/core/main.js` ist trotz vorhandener Facades weiterhin ein zentraler Orchestrator mit hoher Verantwortung fuer Bootstrap, Runtime-State, globale Hotkeys, Recording-Trigger, UI-Anbindung und Match-Lifecycle.
- `vite.config.js` traegt nicht nur Build-Konfiguration, sondern auch Editor-Disk-APIs, Video-Speicherung, Trainings-Dashboard, WebSocket-Status und Asset-Kopierlogik; Build-/Dev-Infra und produktnahe Tooling-Pfade sind dadurch eng gekoppelt.
- Die Repo-Governance ist stark, aber ein Teil dieser Regel- und Guard-Dichte kompensiert sichtbar reale Komplexitaet in den Codepfaden.
- Desktop-App, Browser-Demo, Editor, Recorder, Multiplayer und Bot-Training teilen sich eine gemeinsame Codebasis, aber ihre Grenzen sind nicht ueberall gleich gut in eigene Schichten oder klar benannte Ports uebersetzt.
- Die Architektur-Doku ist bereits vergleichsweise stark; der Hauptbedarf liegt weniger im Erfinden neuer Regeln als im weiteren Angleichen des Codes an das bereits beschriebene Architekturmodell.

## Scope

- Primaerziel ist Architektur- und Wartbarkeitsverbesserung, nicht neue Produktfunktion.
- Desktop-App bleibt Source of Truth fuer Vollfunktion; Browser/Web bleibt Demo-Surface und darf durch die Entflechtung keine neue implizite Vollparitaet erhalten.
- Refactor-Zielpfade werden an klarere Schichten gebunden: `runtime`, `tooling/dev-server`, `desktop-shell`, `ui-navigation`, `verification`.
- Schwerpunkt sind wenige hochwirksame Knoten mit breiter Wirkung statt grossflaechiger Umbenennungs- oder Strukturkosmetik.
- Bestehende Contracts und produktive Verhaltenspfade bleiben so weit wie moeglich stabil; wo neue Ports oder Service-Grenzen entstehen, werden sie aus bestehender Verantwortung abgeleitet.

## Zielbild

- `src/core/main.js` ist wieder ein schlanker Start- und Lebenszyklus-Orchestrator statt Sammelpunkt fuer Querschnittsverhalten.
- `vite.config.js` enthaelt nur noch Build-/Dev-Setup; Editor-, Video-, Training- und sonstige API-Logik lebt in eigenen Modulen mit klarer Zuständigkeit.
- Desktop-spezifische Shell-Faehigkeiten sind sichtbar von Web-/Demo-Pfaden getrennt und folgen derselben Surface-Policy wie `V77`.
- Kritische Querschnitte wie Recording, Export, Match-Start, Menu-Navigation und Tooling-APIs haengen an klareren Ports statt an impliziten Global- oder Sammelobjekten.
- Einstieg und Verifikation sind fuer neue Aenderungen einfacher: weniger “zentrale Alles-Dateien”, klarere Testzuordnung, bessere Systemkarte in der Doku.

## Betroffene Pfade (geplant)

- `src/core/main.js`
- `src/core/GameBootstrap.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/runtime/**`
- `src/state/**`
- `src/ui/**`
- `vite.config.js`
- `electron/main.cjs`
- `electron/preload.cjs`
- `scripts/**` nur bei Bedarf fuer ausgelagerte Tooling- oder Guard-Einstiege
- `tests/**` fuer Characterization- oder Port-Refactor-Seams
- `docs/referenz/ai_architecture_context.md`
- `docs/referenz/ai_project_onboarding.md`
- gegebenenfalls weitere Referenz- oder Prozessdokumente fuer die neue Systemkarte

## Definition of Done (DoD)

- [ ] DoD.1 Die groessten Mischzustaendigkeiten sind identifiziert und in eine priorisierte Zielreihenfolge uebersetzt: `main.js`, `vite.config.js`, Shell-/Surface-Pfade, Verifikation/Einstieg.
- [ ] DoD.2 Fuer `src/core/main.js` existiert ein klarer Zuschnitt in verbleibende Kernverantwortung versus auszulagernde Lifecycle-, Input-, Recording- und Menu-Koordinatoren.
- [ ] DoD.3 Fuer `vite.config.js` existiert ein klarer Zuschnitt in verbleibendes Vite-Setup versus auszulagernde Editor-, Video-, Training- und Dev-API-Module.
- [ ] DoD.4 Desktop-Shell, Demo-Surface und produktnahe Tooling-Pfade sind in einem konsistenten Architekturmodell beschrieben, das `V77` nicht unterlaeuft.
- [ ] DoD.5 Der Plan definiert einen risikoarmen Rollout mit Characterization- und Verifikationspunkten, sodass die Entflechtung nicht als unkontrollierter Grossumbau startet.
- [ ] DoD.6 Einstieg und Doku werden explizit mitgedacht: es gibt eine kurze Systemkarte fuer neue Entwickler und kuenftige Agenten.
- [ ] DoD.7 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind fuer den Planstand gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 79.1 Architektur-Knoten inventarisieren und priorisieren

- [ ] 79.1.1 Die hoechstverdichteten Dateien und Schichten nach Wirkung und Risiko ordnen: `src/core/main.js`, `vite.config.js`, `electron/*`, `src/core/runtime/**`, `src/ui/**`, `tests/**`.
- [ ] 79.1.2 Pro Knoten die aktuelle Mischverantwortung benennen: Bootstrap, Lifecycle, Tooling-API, Surface-Gating, Navigation, Export, Diagnostics, Verifikation.
- [ ] 79.1.3 Eine Prioritaetslogik festschreiben, die kleine hochwirksame Entflechtungen vor grossen Strukturreformen bevorzugt.

### 79.2 Runtime-Orchestrator in klarere Ports schneiden

- [ ] 79.2.1 Fuer `src/core/main.js` einen Zielzuschnitt definieren: was dort verbleibt und was in eigene Lifecycle-, Input-, Recording- oder Menu-Koordinatoren wandert.
- [ ] 79.2.2 Kritische Oeffentlichkeitsgrenzen fuer `GameRuntimeFacade`, `GameBootstrap` und angrenzende State-/UI-Ports festhalten, damit keine neuen Backdoors ueber `game.*` oder implizite Aliasfelder entstehen.
- [ ] 79.2.3 Einen Migrationspfad fuer Characterization-Checks, Sequenzsicherheit und Rueckkehr-zum-Menue-/Dispose-Pfade festlegen.

### 79.3 Vite- und Tooling-Schicht entkoppeln

- [ ] 79.3.1 Alle nicht-Build-Verantwortungen aus `vite.config.js` klassifizieren: Editor-Disk-Save, Vehicle-API, Video-Save, Training-Dashboard, WebSocket, Asset-Kopie.
- [ ] 79.3.2 Ein Zielbild fuer ausgelagerte Dev-/Tooling-Module oder Services definieren, sodass `vite.config.js` wieder primär Build-, Serve- und Bundle-Verhalten kapselt.
- [ ] 79.3.3 Klare Grenzen zwischen produktnahem Runtime-Code und lokalem Entwicklungs- oder Authoring-Tooling festschreiben.

### 79.4 Desktop-Shell, Demo-Surface und Produktrollen angleichen

- [ ] 79.4.1 Electron-, Preload- und app-spezifische Capabilities gegen die Surface-Politik aus `V77` spiegeln, damit Shell-spezifische Sonderwege nicht erneut implizit Produktlogik werden.
- [ ] 79.4.2 Browser-/Demo-Pfade, Desktop-Vollpfade und lokale Tooling-/Editor-Pfade als getrennte Konsumentengruppen in der Architekturkarte beschreiben.
- [ ] 79.4.3 Export-, Discovery-, Editor- und kuenftige Shell-Funktionen auf eine klarere Capability-Herkunft vorbereiten.

### 79.5 Verifikation und Refactor-Sicherheit vorbereiten

- [ ] 79.5.1 Fuer jede Entflechtungsstufe den billigsten sinnvollen Characterization-Pfad festlegen: Guard, Node-/Contract-Test, Playwright-Smoke oder gezielter Integrationslauf.
- [ ] 79.5.2 Bestehende Test-Sammelpunkte und teure Warmup-Wege markieren, die Refactors unnoetig teuer oder riskant machen.
- [ ] 79.5.3 Einen kleinen Rueckfallpfad definieren, falls eine Entflechtung fachlich richtig, aber organisatorisch zu breit fuer einen einzelnen Block wird.

### 79.6 Doku- und Einstiegskarte vereinfachen

- [ ] 79.6.1 Eine kurze Systemkarte planen: Wo startet das Spiel, wo endet die Shell, wo lebt Tooling, wo laufen Training und Editor, welche Dateien sind Einstiegspunkte statt Archive.
- [ ] 79.6.2 `ai_architecture_context.md` und `ai_project_onboarding.md` auf die minimal noetigen Einstiegspfade zuspitzen, damit neue Bearbeiter schneller handlungsfaehig werden.
- [ ] 79.6.3 Regeln und Guard-Hinweise nur dort erweitern, wo der Code allein die Leitplanke nicht ausreichend ausdrueckt.

### 79.7 Rollout-Reihenfolge und Ownership absichern

- [ ] 79.7.1 Eine Umsetzungsreihenfolge definieren, die nach `V74` zuerst `vite.config.js` und `main.js` entschärft, bevor breitere Shell- oder Testumbauten folgen.
- [ ] 79.7.2 Cross-Block-Konflikte mit `V64`, `V75`, `V76`, `V77` frueh als Intake-Hinweis oder Conflict-Log-Vorlage vorbereiten.
- [ ] 79.7.3 Den Plan so schneiden, dass abgeschlossene Teilschritte jeweils separat commit- und verifizierbar bleiben.

### 79.99 Integrations- und Abschluss-Gate

- [ ] 79.99.1 Der Entflechtungsplan ist mit `V74` und `V77` vereinbar und erzeugt kein widerspruechliches Produkt- oder Lifecycle-Modell.
- [ ] 79.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen.
- [ ] 79.99.3 Intake-Notiz, Abhaengigkeiten, Risikozuschnitt und Rollout-Reihenfolge sind klar genug, dass die Umsetzung ohne neue Grundsatzdebatte gestartet werden kann.

## Verifikationsstrategie

- Plan-/Dokugates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Refactor-Charakterisierung bei Umsetzung: zuerst Guards und bestehende Contract-/Smoke-Pfade sichern, dann Koordinator-/Tooling-Schnitte in kleinen Schritten verschieben.
- Desktop-first-Prinzip bleibt fuer Verifikation verbindlich; Browser-Smokes pruefen nur Demo-relevante Oberflaechen statt Vollparitaet.

## Risiko-Register V79

- `R1 | hoch | Entflechtung kollidiert mit laufendem V74-Refactor`
  - Mitigation: Harte Dependency auf `V74.99`; bis dahin nur Plan-/Zielbild-Arbeit, keine konkurrierende Ownership.
- `R2 | hoch | Auslagerungen erzeugen neue indirekte Backdoors statt klarer Grenzen`
  - Mitigation: Ports und verbleibende Verantwortungen pro Knoten vor der ersten Codebewegung explizit festschreiben.
- `R3 | mittel | Vite-/Tooling-Auslagerung zerlegt lokale Dev-Workflows`
  - Mitigation: Characterization fuer Editor-, Training- und Video-APIs vor Umzug; keine gleichzeitige Produkt- und Infra-Neuerfindung.
- `R4 | mittel | Doku wird laenger statt einfacher`
  - Mitigation: Fokus auf kurze Systemkarte und wenige kanonische Einstiegspfade statt neuer Volltext-Dokumente.
- `R5 | hoch | Refactor wird zu breit und bleibt halb fertig`
  - Mitigation: Kleine, atomiche Teilschritte mit eigener Verifikation und klarer Rollout-Reihenfolge planen.
