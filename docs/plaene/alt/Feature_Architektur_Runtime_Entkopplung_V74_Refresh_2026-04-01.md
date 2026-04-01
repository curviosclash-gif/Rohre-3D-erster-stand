# Feature Architektur-Runtime-Entkopplung V74 Refresh

Stand: 2026-04-01
Status: Neu
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die verbleibenden Architektur-Hotspots der Desktop-App so nachziehen, dass weitere Desktop-Features nicht mehr auf denselben wachsenden Sammelpunkten landen. Im Fokus stehen die noch offenen V74-Restarbeiten plus die neu sichtbaren Grenzen aus dem Architektur-Review vom 2026-04-01:

- `src/core/main.js` und `src/core/GameRuntimeFacade.js` weiter entlasten, statt neue Desktop-Logik dort anzulagern.
- Session-, Recorder-, Return-to-Menu- und App-Shell-Lifecycle auf kleine, eindeutige Ports schneiden.
- `state -> ui`- und `entities -> core`-Restkanten durch passendere Contracts, pure State-Ableitungen und shared Runtime-Kontexte abbauen.
- Desktop-spezifische Shell-Aufgaben wie LAN-Host, Discovery und Save-Bridge als Capability behandeln, nicht als implizite Startvoraussetzung fuer das ganze Fenster.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V74` (Refresh/Fortsetzung des aktiven Architektur-Blocks)
- Hard dependencies:
  - `V58.99` bleibt die Guard- und Budget-Baseline fuer Architekturgrenzen.
  - `V64` muss denselben Lifecycle-, Capability- und Desktop-Shell-Schnitt verwenden, damit Multiplayer-Produktisierung keine neuen `game.*`- oder Facade-Backdoors einfuehrt.
  - `V75` Recorder-Stabilisierung muss denselben Finalize-/Dispose-/Return-to-Menu-Vertrag nutzen, statt eigene Sonderpfade neben V74 aufzubauen.
- Soft dependencies:
  - `V72` ist mitzudenken, wenn Runtime-Config-, Gameplay- oder Overlay-Contracts in `shared/contracts` wandern.
  - Der Hangar-Plan in `docs/plaene/neu/Feature_Hangar_Arcade_Fight_V76.md` sollte die neuen Desktop-Navigation- und Composition-Grenzen wiederverwenden.
- Hinweis:
  - Dieser Plan aktualisiert den aktiven V74-Restscope und ersetzt fuer neue Intake-Runden die veraltete externe Referenz `docs/plaene/alt/Feature_Architektur_Runtime_Entkopplung_V74.md`.
  - Manuelle Uebernahme erforderlich.

## Risikoeinstufung

- Gesamt-Risiko: hoch
- Hauptgrund: Der Scope schneidet durch Desktop-Shell, Runtime-Core, UI-Orchestrierung, Match-Lifecycle, Recorder-Finalisierung und Entity-Setup zugleich. Fehler hier wirken breit, loesen aber gleichzeitig die groessten strukturellen Bremsen fuer die Desktop-App.

## Desktop-Leitbild

Der Zielzustand ist eine desktop-first Architektur mit klarer Richtung:

- Electron bleibt eine duenne Host-Shell fuer Fenster, Discovery, Save-Dialoge und optionale Host-Services.
- Renderer-/Game-Code bleibt plattformneutral, konsumiert Desktop-Faehigkeiten aber nur ueber kleine Preload-/Port-Vertraege.
- Neue Desktop-Features gehen ueber Composition-, Navigation- und Lifecycle-Ports statt ueber weiteres Wachstum in `Game`, `GameRuntimeFacade`, `UIManager` oder Root-Tooling-Monolithen.
- Host-, Discovery- oder Save-Fehler duerfen einzelne Capabilities degradieren, aber nicht mehr den kompletten Desktop-Startpfad dominieren.

## Ausgangslage

- Die bestehenden Architektur-Gates sind gruener als frueher:
  - `npm run check:architecture:boundaries` ist aktuell gruen.
  - `npm run check:architecture:metrics` ist aktuell gruen.
- Gleichzeitig liegen mehrere Budgets weiter am oberen Rand:
  - `ui -> core`: 7/7
  - `ui -> state`: 10/10
  - `state -> ui`: 3/3
  - `entities -> core`: 22/22
- Die groessten Runtime-/UI-Hotspots bleiben:
  - `src/core/MediaRecorderSystem.js`
  - `src/core/arcade/ArcadeRunRuntime.js`
  - `src/ui/MatchFlowUiController.js`
  - `src/core/GameRuntimeFacade.js`
- Das bestehende V74-External-Planartefakt in `docs/plaene/alt/` ist fachlich ueberholt: Es beschreibt 74.3-74.5 bereits als abgeschlossen, waehrend der aktive Masterplan diese Bereiche weiter offen fuehrt. Dieser Refresh harmonisiert die verbleibende Arbeit.
- Das Review vom 2026-04-01 hat zusaetzlich drei neue Brennpunkte sichtbar gemacht:
  - `MatchUiStateOps` ist pure Ableitungslogik, liegt aber unter `src/ui/**` und erzeugt unnoetige `state -> ui`-Legacy-Kanten.
  - `Config` und Runtime-Konfigurationswissen leben semantisch zu stark unter `src/core/**`, obwohl `ui` und `entities` sie als gemeinsamen Vertrag verwenden.
  - `electron/main.cjs` startet den LAN-Host aktuell als impliziten Teil des App-Boots; Host-Unverfuegbarkeit ist damit zu nah an einem Komplettfehler des Desktop-Starts.
- Neben dem Runtime-Kern sind auch Desktop-Shell-/Tooling-Grenzen zu gross geworden:
  - `vite.config.js`
  - `index.html`
  - `style.css`
  Diese Dateien sind fuer sich kein Architekturbruch, bremsen aber weitere Desktop-Flaechen, weil neue Oberflaechen und Build-Sonderfaelle zu leicht an denselben Root-Dateien haengen bleiben.

## Betroffene Pfade (geplant)

- `electron/main.cjs`
- `electron/preload.cjs`
- `src/core/main.js`
- `src/core/GameBootstrap.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/MediaRecorderSystem.js`
- `src/core/runtime/RuntimeSessionLifecycleService.js`
- `src/core/runtime/MenuRuntimeMultiplayerService.js`
- `src/shared/runtime/GameRuntimePorts.js`
- `src/state/MatchLifecycleSessionOrchestrator.js`
- `src/state/MatchSessionFactory.js`
- `src/state/RoundStateTickSystem.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/PauseOverlayController.js`
- `src/ui/MatchUiStateOps.js` oder Zielpfad unter `src/state/**` oder `src/shared/**`
- `src/entities/EntityManager.js`
- `src/entities/Trail.js`
- `src/entities/Powerup.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/arena/**`
- `src/hunt/**`
- `src/shared/contracts/**`
- `vite.config.js`
- `index.html`
- `style.css`
- `docs/referenz/ai_architecture_context.md`
- `docs/plaene/neu/Feature_Architektur_Runtime_Entkopplung_V74_Refresh_2026-04-01.md`

## Definition of Done (DoD)

- [ ] DoD.1 `main.js`, `GameBootstrap` und die Composition-Schicht tragen neue Desktop- oder Runtime-Logik nur noch ueber kleine Orchestratoren/Ports nach; `Game` wird nicht erneut zur stillen Integrationsflaeche fuer neue Features.
- [ ] DoD.2 `GameRuntimeFacade` ist fuer Multiplayer, Recorder, Menu und Arcade weiter entlastet oder in klarere Teilverantwortungen geschnitten; neue private Fremdvertraege kommen nicht hinzu.
- [ ] DoD.3 Matchstart, Session-Abbruch, Return-to-Menu, Recorder-Stop und Dispose laufen ueber deterministische Lifecycle-Pfade, die stale oder abgebrochene Initialisierungen aktiv aufraeumen.
- [ ] DoD.4 Desktop-Host, Discovery und Save-Faehigkeiten sind als degradierbare Capabilities modelliert; ein fehlender LAN-Host blockiert nicht mehr den grundsaetzlichen Desktop-Fensterstart.
- [ ] DoD.5 Pure UI-State-Ableitungen liegen nicht mehr unter `src/ui/**`, wenn sie von `state` oder `shared` fachlich besser getragen werden; der `state -> ui`-Legacy-Rest wird reduziert oder klar befristet dokumentiert.
- [ ] DoD.6 Runtime-Konfigurations- und Gameplay-Basiswerte sind fuer `ui`, `state` und `entities` ueber passende shared Contracts lesbar; `entities -> core` wird gegenueber der aktuellen Baseline weiter zurueckgedrueckt.
- [ ] DoD.7 Root-Shell- und Build-Sonderfaelle fuer Desktop, Recorder und kuenftige Oberflaechen sind modularer geschnitten, sodass `vite.config.js`, `index.html` und `style.css` nicht weiter als Sammelstelle wachsen.
- [ ] DoD.8 `docs/referenz/ai_architecture_context.md` sowie die betroffenen externen Plaene (`V64`, Recorder-`V75`, Hangar-`V76`) spiegeln die neuen Architekturgrenzen nachvollziehbar.
- [ ] DoD.9 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen; verbleibende Browser-/Harness-Blocker sind in `docs/Fehlerberichte/` dokumentiert.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 74.3 Match-Session-Lifecycle und Recorder-Finalisierung haerten

- [ ] 74.3.1 `MatchLifecycleSessionOrchestrator` auf ein kleines Dependency-Objekt oder Session-Port umstellen, das nur Match-Init, Round-Reset, Recorder-Settlement und Teardown benoetigt.
- [ ] 74.3.2 Verworfene oder ersetzte `initializeMatchSession()`-Ergebnisse aktiv disposen, damit Arena-, Entity-, Particle-, Camera- oder Bridge-Reste nicht im Renderer oder Runtime-Bundle haengen bleiben.
- [ ] 74.3.3 Einen gemeinsamen Finalize-Vertrag fuer `stopRecording()`, Dispose, Return-to-Menu, Session-Abbruch und Window-Shutdown einziehen, damit Recorder-Stop und Session-Teardown nicht mehr gegeneinander laufen.

### 74.4 Core-/UI-Komposition und State-Ableitungen weiter entkoppeln

- [ ] 74.4.1 `MatchUiStateOps` und aehnliche pure UI-State-Ableitungen an einen fachlich passenderen Ort (`src/state/**` oder `src/shared/**`) verschieben, damit `state -> ui` nicht weiter als Legacy-Sonderfall konserviert wird.
- [ ] 74.4.2 `main.js` und `GameRuntimePorts` weiter ausduennen: neue Orchestrierungslogik fuer Menu, Matchstart, Desktop-Flows oder Rueckkehr wird in dedizierte Coordinator-/Composition-Bausteine verschoben statt als weitere Alias-Weiterleitung an `game`.
- [ ] 74.4.3 `GameRuntimeFacade` in klarere Teilzustaendigkeiten schneiden oder intern ueber kleine Handler/Services organisieren, damit Multiplayer, Presets, Developer-Modus, Arcade und Lifecycle nicht weiter in einer einzelnen Sammelklasse auflaufen.

### 74.5 Entity-/Config-Vertraege von Core loesen

- [ ] 74.5.1 Einen shared Runtime-/Gameplay-Config-Vertrag definieren, der fuer `entities`, `ui` und `state` lesbar ist, ohne semantisch unter `src/core/**` zu haengen.
- [ ] 74.5.2 Die hochfrequenten `CONFIG`- bzw. Ambient-State-Leser in `Trail`, `Powerup`, Projectile-, Portal- und Hunt-Pfaden priorisieren und schrittweise auf explizite Runtime-Inputs oder Session-Kontexte umstellen.
- [ ] 74.5.3 Die Architektur-Guards auf eine strengere Zielbaseline nachziehen, sodass `entities -> core` unter den aktuellen Wert gedrueckt wird und neue Core-Importe fuer fachliche Runtime-Entscheidungen sichtbar blockiert werden.

### 74.6 Desktop-Shell und Capability-Grenzen haerten

- [ ] 74.6.1 `electron/main.cjs` so umstellen, dass Desktop-Fensterstart und LAN-Host-Start entkoppelt sind; Host-Unverfuegbarkeit wird als Capability-/Statusproblem behandelt und nicht als gesamter App-Startfehler.
- [ ] 74.6.2 Discovery-, Save- und Host-Faehigkeiten ueber kleine, benannte Preload-Vertraege absichern, damit kuenftige Desktop-Flaechen keine breite `curviosApp`-God-Bridge erzwingen.
- [ ] 74.6.3 Desktop-spezifische Build-/Shell-Sonderfaelle aus `vite.config.js`, `index.html` und `style.css` in kleinere, wiederverwendbare Module oder Einspritzpunkte schneiden, bevor weitere Desktop-Flaechen darauf aufsetzen.

### 74.7 Vertragsklarheit, Plan-Sync und Dokumentation

- [ ] 74.7.1 Den Drift zwischen aktivem Masterplan `V74`, der archivierten externen Plan-Datei und dem aktuellen Architekturzustand durch einen klaren Refresh-Scope dokumentieren und fuer die naechste manuelle Intake-Runde sauber vorbereiten.
- [ ] 74.7.2 `docs/referenz/ai_architecture_context.md` um die neuen Grenzen fuer Desktop-Shell, Lifecycle-Finalisierung, pure State-Ableitungen und shared Runtime-Contracts erweitern.
- [ ] 74.7.3 Die betroffenen Folgeplaene `V64`, Recorder-`V75` und Hangar-`V76` auf dieselben Architekturleitplanken ausrichten, damit dort keine alten Integrationsmuster erneut eingebaut werden.

### 74.99 Integrations- und Abschluss-Gate

- [ ] 74.99.1 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics` und die direkt betroffenen Runtime-/Desktop-Smokes sind fuer den Scope gruen.
- [ ] 74.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; verbleibende Browser- oder Harness-Blocker sind vor Handoff in `docs/Fehlerberichte/` dokumentiert.

## Verifikationsstrategie

- Architektur-Gates:
  - `npm run architecture:report`
  - `npm run check:architecture:boundaries`
  - `npm run check:architecture:metrics`
- Runtime-/Build-Grundlage:
  - `npm run build`
- Fokus-Checks je nach Teilscope:
  - gezielte Runtime-Smokes fuer `return-to-menu`, Session-Abbruch und Recorder-Finalisierung
  - Desktop-App-Smoke fuer `window start -> degraded host capability -> menu ready`
  - bei Contract-Migrationen gezielte Modulchecks fuer State-/Config-Ableitungen statt nur voller Browser-E2E-Pfade
- Plan-/Dokugates:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`

## Risiko-Register V74 Refresh

- `R1 | hoch | Hotspot-Zerlegung bricht bestehende Integrationspfade`
  - Mitigation: `main.js`, `GameRuntimeFacade` und `MatchFlowUiController` nur ueber kleine, testbare Schnitte entlasten; keine Big-Bang-Umsortierung.

- `R2 | hoch | Lifecycle-Haertung legt verdeckte Rennen offen`
  - Mitigation: Recorder-, Session- und Return-to-Menu-Finalisierung als gemeinsamen Vertrag behandeln und stale Pfade aktiv entsorgen.

- `R3 | mittel | Shared-Contract-Migration erzeugt breite Folgeaenderungen`
  - Mitigation: zuerst neue shared Contracts einfuehren, dann Consumer schrittweise migrieren und Guards erst danach strenger stellen.

- `R4 | mittel | Desktop-Capability-Schnitt wird zu breit oder zu app-spezifisch`
  - Mitigation: Preload klein halten, pro Capability benannte Methoden/Ports nutzen und keine neue globale App-Bridge als Sammelobjekt wachsen lassen.

- `R5 | mittel | Root-Shell-Split erzeugt Tooling-Drift`
  - Mitigation: nur die Desktop-relevanten Sonderfaelle zuerst modularisieren und Build-/Doku-Gates bei jedem Schritt mitziehen.

- `R6 | niedrig | Plan-Refresh bleibt neben alter V74-Datei missverstaendlich`
  - Mitigation: in Handoff und Intake explizit festhalten, dass dieser Plan die aktive Refresh-Referenz ist und die Datei in `docs/plaene/alt/` nur den historischen Zwischenstand beschreibt.

## Handoff-Hinweis

- Dieser Plan ist absichtlich ein externer Plan unter `docs/plaene/neu/`.
- Keine direkte Aenderung an `docs/Umsetzungsplan.md`.
- Fuer die manuelle Uebernahme sollte der aktive Block `V74` auf diese Refresh-Datei umgebogen oder ihr Inhalt in den offenen Restscope des bestehenden Blocks uebernommen werden.
