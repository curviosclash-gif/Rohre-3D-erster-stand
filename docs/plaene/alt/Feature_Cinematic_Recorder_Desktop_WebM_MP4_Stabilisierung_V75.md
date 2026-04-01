# Feature Cinematic Recorder Desktop WebM-MP4 Stabilisierung V75

Stand: 2026-04-01
Status: Neu
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die Cinematic-Aufnahme in der Desktop-App so weit stabilisieren, dass sie fuer normale Nutzer reproduzierbar ein scharfes, echtes Videofile speichert, statt zwischen unscharfem Export, Browser-Download-Fallback, Einzelbild-Effekt oder Container-/Codec-Sonderfaellen zu kippen.

Der Zielzustand ist bewusst zweistufig:

- Aufnahme in der Desktop-App bevorzugt robust als `WebM`, wenn dieser Pfad stabiler ist als direkter `MP4`-Encode.
- Optionaler nachgelagerter `WebM -> MP4`-Schritt liefert fuer Editoren oder Social-Workflows weiterhin `MP4`, ohne die eigentliche Aufnahme zu destabilisieren.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V75`
- Hard dependencies: Aktive Datei-Ownership kollidiert mit `V74`, weil `src/core/main.js`, `src/core/GameBootstrap.js`, `src/core/MediaRecorderSystem.js` und Runtime-Lifecycle-Pfade dort als offener Stream gefuehrt werden; Recorder-Stop, Dispose, Session-Wechsel und Return-to-Menu muessen deshalb kompatibel zu V74 bleiben. Die Schnitte aus `docs/plaene/neu/Feature_Architektur_Runtime_Entkopplung_V74_Refresh_2026-04-01.md` fuer Finalize-Port, `main.js`-Entlastung und Desktop-Shell-Capabilities sind fuer diesen Scope mitzunehmen.
- Soft dependencies: `V72` sollte mitgeprueft werden, falls Recorder-Diagnostik, Result-Codes oder HUD-/Telemetry-Ausgaben fuer Portal-/Item-/Gate-Ereignisse vereinheitlicht werden; Electron-Packaging oder Desktop-Tooling kann zusaetzlich Build-/Bundle-Abstimmung benoetigen.
- Hinweis: Manuelle Uebernahme erforderlich.

## Ausgangslage

Aktueller Zwischenstand nach den bereits umgesetzten Fixes:

- Die Cinematic-Aufnahme verliert nicht mehr offensichtlich ihre reale Dauer durch Backlog-/Timeline-Fehler.
- Die dedizierte Cinematic-Capture-Pipeline nutzt wieder die sichtbare Viewport-Groesse statt starr aus einem kleineren Live-Backbuffer zu erben.
- Orbit-Shots wurden gegen Arena-Kollisionen abgesichert, damit die Kamera nicht mehr blind in Geometrie faehrt.
- Die Desktop-App speichert Recording-Blobs nicht mehr nur ueber den Browser-Download-Fallback, sondern hat bereits eine direkte App-Save-Bridge.
- Die Desktop-App bevorzugt derzeit fuer Recording bewusst `MediaRecorder` mit `WebM`, weil dieser Pfad in der App stabiler ist als direkter WebCodecs-`MP4`.

Weiter bestehende oder neu sichtbar gewordene Probleme:

- Das Bild ist zwar besser, aber noch nicht so scharf wie das Live-Spielbild.
- Der Nutzer wuenscht explizit die Option, weiterhin `WebM` zu nutzen und erst danach nach `MP4` zu konvertieren.
- Es gibt noch keinen gebuendelten Desktop-Konvertierungspfad fuer `WebM -> MP4`.
- Der Desktop-Save-Dialog kann aktuell noch `WebM`-Rohdaten unter irrefuehrender `.mp4`-Endung abspeichern, obwohl keine echte Konvertierung stattfindet.
- Der Desktop-Export schreibt Recording-Dateien derzeit noch synchron im Electron-Main-Process; groessere Blobs koennen dadurch die App beim Speichern sichtbar blockieren.
- Runtime-Qualitaets-Drosselungen koennen den sichtbaren Renderpfad weiterhin beeinflussen und dadurch Recording-Weichzeichnung verursachen.
- Die UI meldet nach dem Stoppen nicht klar genug, welcher Engine-/Container-/Save-/Convert-Pfad wirklich aktiv war.
- Die Playwright-Regressionen sind in der aktuellen Umgebung weiter durch `loadGame`-/Warmup-Probleme belastet, sodass fokussierte Modul-Smokes als Fallback eingeplant werden muessen.

## Arbeitsannahmen

- Die Web-App darf weiterhin direkte `MP4`- oder Browser-Fallback-Pfade nutzen, sofern der Desktop-Pfad nicht verschlechtert wird.
- Fuer die Desktop-App ist Stabilitaet wichtiger als sofortige `MP4`-Finalisierung; ein sauber gespeichertes `WebM` ist besser als ein nominales `MP4`, das nicht oder nur als kaputter Export entsteht.
- Im Desktop-Pfad ist das Primarartefakt bis zu einer bestaetigt erfolgreichen Konvertierung immer ein korrekt benanntes `WebM`; `MP4` darf im Save-Dialog oder Ergebnisvertrag erst nach echter Konvertierung als finales Format auftauchen.
- Eine automatische Konvertierung darf nie dazu fuehren, dass bei Fehlschlag weder `WebM` noch `MP4` erhalten bleibt.
- Datei-Save und optionale Konvertierung duerfen den Electron-Main-Process nicht spuerbar blockieren; Schreiben und Convert muessen asynchron oder entkoppelt aus dem UI-Hot-Path laufen.
- Qualitaets-Locks fuer Recording muessen beim Stoppen, Abbruch oder Dispose vollstaendig zurueckgebaut werden.

## Betroffene Pfade (geplant)

- `src/core/main.js`
- `src/core/GameBootstrap.js`
- `src/core/MediaRecorderSystem.js`
- `src/core/Renderer.js`
- `src/core/renderer/RenderQualityController.js`
- `src/core/renderer/RecordingCapturePipeline.js`
- `src/core/renderer/camera/RecordingOrbitCameraDirector.js`
- `src/core/recording/MediaRecorderSupport.js`
- `src/core/recording/DownloadService.js`
- `src/core/recording/engines/NativeMediaRecorderEngine.js`
- `src/core/recording/engines/WebCodecsRecorderEngine.js`
- `src/shared/contracts/RecordingCaptureContract.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/PauseOverlayController.js`
- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/package.json` oder Desktop-Build-Konfiguration
- `package.json`
- `tests/core.spec.js`
- moeglicher neuer Desktop-Smoke unter `scripts/` oder `dev/scripts/`
- `docs/Fehlerberichte/` bei verbleibenden externen Blockern
- `docs/plaene/neu/Feature_Cinematic_Recorder_Desktop_WebM_MP4_Stabilisierung_V75.md`

## Definition of Done (DoD)

- [ ] DoD.1 Die Desktop-App speichert nach einer Cinematic-Aufnahme deterministisch genau ein verwertbares Videiartefakt pro Exportversuch; Save-Bridge, Dateiname, Container-/Dateiendungs-Vertrag und Fallback-Verhalten sind klar definiert.
- [ ] DoD.2 Die Desktop-App nimmt Cinematic standardmaessig ueber einen robusten `WebM`-Pfad auf und fuehrt optional eine nachgelagerte `WebM -> MP4`-Konvertierung aus, ohne den Primarexport zu gefaehrden.
- [ ] DoD.3 Waehrend aktiver Cinematic-Aufnahme sind qualitaetskritische Sparmodi fuer den Exportpfad kontrolliert gesperrt oder uebersteuert; nach dem Stoppen wird der vorherige Zustand sauber wiederhergestellt.
- [ ] DoD.4 Nach dem Stoppen gibt es eine verstaendliche Export-Diagnostik mit mindestens `Engine`, `Container`, `Aufloesung`, `Bitrate`, `Dauer`, `Dropped Frames`, `Save-Status`, `Conversion-Status` und Zielpfad.
- [ ] DoD.5 Recorder-Lifecycle fuer `manual stop`, `switch stop`, `dispose`, `session abort` und `return-to-menu` bleibt deterministisch; keine orphaned Temp-Dateien, keine haengenden Finalize-Promises und keine sichtbar blockierenden synchronen Main-Process-Saves.
- [ ] DoD.6 `npm run build:app`, die direkt betroffenen Recorder-Regressionen/Smokes, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen; verbleibende externe Testblocker sind dokumentiert.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 75.1 Exportstrategie und Desktop-Dateipfad festziehen

- [ ] 75.1.1 Eine eindeutige Matrix fuer `Web` vs. `Desktop`, `Cinematic` vs. Standard-Aufnahme sowie `WebCodecs`, `MediaRecorder`, `WebM` und `MP4` definieren, damit die Auswahl nicht mehr implizit aus verstreuten Fallbacks entsteht.
- [ ] 75.1.2 Den Desktop-Speicherpfad so haerten, dass Save-Dialog, Dateinamensbildung, Temp-Dateien, Overwrite-Verhalten, Container-/Dateiendungs-Validierung und Fehlercodes fuer Videoexporte als eigener stabiler Vertrag dokumentiert und implementiert werden.
- [ ] 75.1.3 Den Desktop-Exportpfad von blockierenden Main-Process-Schreiboperationen loesen, sodass Save und optionaler Convert ueber asynchronen Write-, Stream- oder entkoppelten Child-Process-Workflow laufen.
- [ ] 75.1.4 Die Recorder-Exportorchestrierung ueber einen dedizierten Finalize-/Export-Service oder Port schneiden, statt weiteren Desktop-Exportcode in `main.js`, `GameRuntimeFacade` oder den Electron-Main-Hotpath zu stapeln.

### 75.2 WebM-first in der Desktop-App und nachgelagerte MP4-Konvertierung

- [ ] 75.2.1 Einen Desktop-Konverter abstrahieren oder bundeln, der `WebM -> MP4` reproduzierbar ausfuehren kann, inklusive Feature-Detection fuer nicht verfuegbare Encoder-Tools.
- [ ] 75.2.2 Den Exportfluss auf `capture -> save temp/final WebM -> optional convert -> final MP4 oder sauberer WebM-Fallback` umstellen, inklusive Temp-Cleanup, Timeout-Handling, sichtbarem Conversion-Ergebnis und der Regel, dass `MP4` erst nach erfolgreicher echter Konvertierung als finales Ergebnis gilt.

### 75.3 Schaerfe und Qualitaets-Locks fuer den Recording-Pfad

- [ ] 75.3.1 Waehrend aktiver Cinematic-Aufnahme `LOW`-Quality, aggressive Pixel-Ratio-Reduktion, ungewuenschte Runtime-Drosselung und aehnliche Sparmodi fuer den Exportpfad deaktivieren oder gezielt uebersteuern.
- [ ] 75.3.2 Fuer Cinematic ein explizites Qualitaetsprofil einfuehren, das Capture-Aufloesung, optionales Supersampling, Bitrate und Ziel-FPS klar trennt und nicht von der fluktuierenden Live-Ansicht abhaengig macht.

### 75.4 Export-Diagnostik und Benutzerfeedback

- [ ] 75.4.1 Die Export-Rueckmeldung nach `F9` so erweitern, dass der Nutzer sofort erkennt, ob ein `WebM`, ein konvertiertes `MP4` oder ein Fallback-Ergebnis gespeichert wurde, ob Konvertierung nur geplant/uebersprungen/fehlgeschlagen ist und wo die Datei liegt.
- [ ] 75.4.2 `lastExport`-, Diagnostics- und Recorder-Status um stabile Felder fuer `requestedContainer`, `savedContainer`, `conversionAttempted`, `conversionSucceeded`, `conversionSkippedReason`, `saveTransport`, `finalPath` und `qualityLockState` erweitern, damit UI, Tests und Debug denselben Vertrag nutzen.

### 75.5 Lifecycle-Haertung und Temp-/Abbruchfaelle

- [ ] 75.5.1 Alle Stop-Pfade (`cinematic_manual_stop`, `cinematic_switch_stop`, Session-Abbruch, Dispose, Return-to-Menu) gegen haengende Temp-Dateien, doppelte Finalisierung, verlorene Promise-Resolution und blockierende Save-/Convert-Rennen absichern.
- [ ] 75.5.2 Wenn Konvertierung oder Save-Bridge fehlschlaegt, muss der Recorder sauber auf den noch gueltigen Primarexport zurueckfallen, statt einen leeren oder halbfertigen Zustand zu hinterlassen.
- [ ] 75.5.3 Der Recorder nutzt denselben Lifecycle-Vertrag wie V74 fuer Dispose, Return-to-Menu, Session-Abbruch und App-Shutdown, damit keine parallelen Sonderpfade fuer Export-Finalisierung neben dem Runtime-Core entstehen.

### 75.6 Verifikation und reproduzierbare Smokes

- [ ] 75.6.1 Gezielte Tests fuer Desktop-Engine-Praeferenz, Save-Bridge, Conversion-Fallback, Qualitaets-Lock und Export-Diagnostik ergaenzen, ohne das Verhalten nur ueber Full-Flow-Playwright zu belegen.
- [ ] 75.6.2 Einen schmalen Recorder-Smoke oder Modul-Check pflegen, der auch dann aussagekraeftig bleibt, wenn die bestehende Playwright-Umgebung weiter am `loadGame`-/Warmup-Start haengt; verbleibende Umgebungslimits werden in `docs/Fehlerberichte/` dokumentiert.

### 75.99 Integrations- und Abschluss-Gate

- [ ] 75.99.1 `npm run build:app` und die direkt betroffenen Recorder-Regressionen bzw. Desktop-Smokes sind fuer den Scope gruen; bei Build-/Toolchain-Aenderungen wird der Desktop-Pfad zusaetzlich gegen Packaging-Regressionen geprueft.
- [ ] 75.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; offene externe Blocker wie Playwright-Warmup oder fehlende Encoder-Bundles sind vor Handoff explizit dokumentiert.

## Verifikationsstrategie

- Grundgate fuer Plan und Doku:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`
- Recorder-/Desktop-Build:
  - `npm run build:app`
- Recorder-Fokus:
  - `npm run test:core -- --grep "T20aj1|desktop recording|cinematic"`
- Fallback bei weiter instabilem Playwright-Startup:
  - gezielte `node --input-type=module`-Modulchecks fuer Engine-Selektion, Save-Bridge, Conversion-Fallback und Quality-Lock
- Bei neuem Konvertierungstool oder Packaging-Aenderung:
  - zusaetzlicher Desktop-Smoke fuer `save -> convert -> cleanup`

## Risiko-Register V75

- `R1 | hoch | Desktop-Konvertierung`
  - Risiko: Gebuendelte `ffmpeg`-/Konverter-Abhaengigkeiten vergroessern den App-Build, sind plattformspezifisch oder scheitern auf Zielsystemen.
  - Mitigation: Konverter strikt optional kapseln, Verfuegbarkeit vor Start pruefen und immer auf das bereits gespeicherte `WebM` zurueckfallen.

- `R1b | mittel | Container-/Dateiendungs-Mismatch`
  - Risiko: Nutzer speichern oder sehen nominell ein `MP4`, obwohl intern nur ein `WebM` ohne echte Konvertierung persistiert wurde; externe Player oder Editoren lehnen die Datei dann ab.
  - Mitigation: Save-Dialog strikt an den echten Primarcontainer koppeln, Endungen validieren/korrigieren und `MP4` erst nach erfolgreicher Konvertierung als finales Ergebnis ausweisen.

- `R2 | hoch | Lifecycle-Rennen`
  - Risiko: `stopRecording()`, Switch-Stop, Dispose und Session-Abbruch koennen mit Save- oder Convert-Schritten kollidieren und orphaned Temp-Dateien oder Pending-Promises hinterlassen.
  - Mitigation: Finalisierung zentralisieren, Temp-Dateien transaktionsartig behandeln und alle Stop-Pfade gegen denselben Resolver laufen lassen.

- `R2b | mittel | Main-Process-Blockierung bei grossen Exports`
  - Risiko: Synchrone File-Writes oder Konvertierung im Electron-Main-Process frieren Fenster, Tray, Shutdown oder UI-Rueckmeldung waehrend groesserer Recorder-Exporte sichtbar ein.
  - Mitigation: Export-Schreiben asynchronisieren, Convert aus dem UI-Hot-Path auslagern und Progress-/Abort-Zustaende ueber einen stabilen Finalize-Vertrag rueckmelden.

- `R3 | mittel | Qualitaets-Lock vs. Runtime-Performance`
  - Risiko: Ein harter Recording-Qualitaets-Lock kann FPS oder thermische Last in kritischen Szenen sichtbar erhoehen.
  - Mitigation: Lock nur fuer den Exportpfad und klar zeitlich begrenzt anwenden; Profile `Balanced` vs. `High` erlauben.

- `R4 | mittel | Unscharfe Quelle trotz korrektem Export`
  - Risiko: Auch mit stabilem Container bleibt der Export weich, wenn Live-Renderer, Pixel-Ratio oder Antialiasing im App-Modus bereits reduziert sind.
  - Mitigation: Capture-Groesse, Pixel-Ratio, Quality-Controller und dedizierte Cinematic-Renderer-Settings gemeinsam betrachten statt nur Bitrate zu erhoehen.

- `R5 | mittel | Nutzerfeedback wird zu technisch`
  - Risiko: Vollstaendige Recorder-Diagnostik ueberlaedt Toaster oder Menues.
  - Mitigation: Kurze User-Zusammenfassung mit optionalem Detail-Block fuer Debug-/Diagnoseansichten.

- `R6 | niedrig | Testumgebung bleibt fragil`
  - Risiko: Playwright belegt den Scope weiterhin mit Warmup-/`loadGame`-Timeouts und verdeckt produktive Recorder-Verbesserungen.
  - Mitigation: Fokus auf deterministische Modul-Smokes und Fehlerberichtspfad, bis der E2E-Start separat entstoert ist.

## Handoff-Hinweis

- Dieser Plan ist absichtlich ein externer Plan unter `docs/plaene/neu/`.
- Keine direkte Aenderung an `docs/Umsetzungsplan.md`.
- Fuer die manuelle Uebernahme sollte der Scope als eigener Block `V75` im Runtime-/Recorder-Umfeld einsortiert werden.
