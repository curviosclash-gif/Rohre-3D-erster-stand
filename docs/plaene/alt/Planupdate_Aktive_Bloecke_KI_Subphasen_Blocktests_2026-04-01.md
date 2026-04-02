# Planupdate Aktive Bloecke KI-Subphasen und Block-End-Tests

Stand: 2026-04-01
Status: Neu
Owner: Codex

## Ziel

Die noch offenen aktiven Bloecke werden fuer KI-Bearbeitung feiner geschnitten, ohne den aktiven Master direkt umzubauen.

Zusatzregel fuer alle hier betroffenen Bloecke:

- Funktionale Testlaeufe, Playwright-Suiten, Smokes und block-spezifische Integrationschecks werden nur im Abschluss-Gate `*.99` ausgefuehrt.
- Vor `*.99` duerfen Tests, Smokes und Harnesses angepasst oder erweitert werden, aber ihre Ausfuehrung ist nicht Teil der normalen Phasen-Abnahme.
- Fruehere Testausfuehrung ist nur als Ausnahme bei explizitem User-Wunsch oder fuer blocker-kritische Diagnose vorgesehen.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Betroffene Bloecke: `V64`, `V71`, `V74`, `V75`, `V76`
- Unveraendert lassen: `V72` bleibt wegen laufender Bearbeitung bewusst unangetastet.
- Diese Datei ist eine externe Planrevision fuer die naechste manuelle Intake-Runde und ersetzt keine user-owned Masterplan-Aenderung.

## Gemeinsame DoD-/Verifikationsanpassung

Fuer alle unten genannten Bloecke gilt bei der naechsten Intake-Runde:

- DoD- und Verifikationsstrategie-Texte sollen funktionale Tests, Playwright-Suiten, Smokes und block-spezifische Integrationschecks ausschliesslich im Abschluss-Gate `*.99` verlangen.
- Fruehe Phasen duerfen Testabdeckung vorbereiten, Testdaten aktualisieren und Smokes anpassbar machen, aber keine obligatorischen Testlaeufe mehr als Abnahmebedingung enthalten.
- `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` bleiben Prozess-/Dokugates gemaess Repo-Regeln und sind nicht Teil dieser Testverschiebung.

## V64 Revision

Referenz: `docs/plaene/alt/Feature_Desktop_Hauptprodukt_Multiplayer_Online_Offline_Kompatibilitaet_V64.md`

Die offene Phasengliederung soll fuer die naechste Intake-Runde wie folgt feiner geschnitten werden:

### 64.1 Produktbild und Session-Matrix

- [ ] 64.1.1 Desktop-/Browser-Rollen fuer `single`, `splitscreen`, `lan` und `online` verbindlich festziehen.
- [ ] 64.1.2 Host-/Join-/Offline-Matrix pro Session-Klasse als Produktvertrag ausformulieren.
- [ ] 64.1.3 Transportneutrale Invarianten fuer Settings, Loadout, Lifecycle und UI-Gates festschreiben.

### 64.2 Session-Contract und Capability-Begriffe

- [ ] 64.2.1 `sessionType`, `adapterSessionType` und `multiplayerTransport` begrifflich normalisieren.
- [ ] 64.2.2 Host-, Join-, Discovery- und Netzwerk-Capabilities als expliziten Vertrag fuer Menue, Runtime und App-Shell festlegen.
- [ ] 64.2.3 `storage-bridge` fachlich auf Legacy-/Fallback-Status absenken und sichtbar markieren.

### 64.3 Menue-Entry und Lobby-Erzeugung

- [ ] 64.3.1 Desktop-Menue auf explizite Wahl zwischen `LAN` und `Online` umstellen.
- [ ] 64.3.2 Echte Lobby-/Session-Objekte statt Storage-Koordination an den Menuepfad anbinden.
- [ ] 64.3.3 Lobby-Code-, Rollen- und Statusfluss auf einen gemeinsamen Transportvertrag heben.
- [ ] 64.3.4 Fehlertexte und Recovery-Pfade fuer fehlgeschlagene Lobby-Erzeugung vereinheitlichen.

### 64.4 Start-, Ready- und Match-Gates

- [ ] 64.4.1 Start-Validierung fuer `lan` und `online` ueber denselben fachlichen Gate-Kern schneiden.
- [ ] 64.4.2 Ready-Logik und Host-/Client-Verantwortung ohne transportbedingte UI-Abzweige zusammenziehen.
- [ ] 64.4.3 `playerLoaded`, `arena_start` und Matchstart-Handshake auf denselben Lifecycle-Begriffen aufbauen.

### 64.5 Desktop-LAN-Host und Discovery

- [ ] 64.5.1 Electron-LAN-Host fuer Start, Stop, Portwahl und Fehlerdiagnostik als eigene Capability modellieren.
- [ ] 64.5.2 Discovery-, Host-IP- und Join-Aufloesung gegen stale Broadcasts, Portkonflikte und Mehrfachhosts haerten.
- [ ] 64.5.3 Desktop-Fensterstart und LAN-Hoststart so entkoppeln, dass Host-Fehler nicht den ganzen App-Boot blockieren.

### 64.6 Online-Signaling und Desktop-Konfiguration

- [ ] 64.6.1 `VITE_SIGNALING_URL`, TURN-Optionen und dev/prod-Overrides fuer die Desktop-App klar definieren.
- [ ] 64.6.2 `OnlineMatchLobby` auf Timeout-, Retry-, Reconnect- und Endpoint-Fehlerbilder fuer Desktop haerten.
- [ ] 64.6.3 Packaging-, Override- und Diagnosepfad fuer produktive Online-Nutzung dokumentierbar machen.

### 64.7 Gemeinsamer Lifecycle und State-Sync

- [ ] 64.7.1 Session-Initialisierung, Pause/Resume und Leave/Disconnect fuer `lan` und `online` auf einen Kern verdichten.
- [ ] 64.7.2 State-Reconciliation, Host-Autoritaet und Round-Start-Gates fachlich angleichen.
- [ ] 64.7.3 `return-to-menu` und Teardown ausschliesslich ueber oeffentliche Lifecycle-/Capability-Ports anbinden.

### 64.8 Offline-Schutz und Verifikationsvorbereitung

- [ ] 64.8.1 `single` und `splitscreen` als eigene Kompatibilitaetsklasse gegen Netzwerk-Refactors absichern.
- [ ] 64.8.2 Desktop-ohne-Internet als gueltigen Produktzustand fuer lokal, LAN und Online-Fehlerbilder festziehen.
- [ ] 64.8.3 Verifikationsmatrix fuer `single`, `splitscreen`, `lan-host`, `lan-client`, `online-host`, `online-client` pflegen.
- [ ] 64.8.4 Block-End-Smokes und Contract-Test-Scope vorbereiten, aber noch nicht ausfuehren.

### 64.99 Integrations- und Abschluss-Gate

- [ ] 64.99.1 Block-End-Testlauf fuer Netzwerk-/Desktop-Scope gemaess Matrix gesammelt ausfuehren.
- [ ] 64.99.2 `npm run build:app`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` abschliessen.
- [ ] 64.99.3 Offene Endpoint-/Infra-Blocker vor Handoff in `docs/Fehlerberichte/` dokumentieren.

## V71 Revision

Referenz: `docs/plaene/alt/Feature_Repo_Aufraeumen_Runtime_sicher_V71.md`

Die abgeschlossenen Phasen `71.1` bis `71.5` bleiben unveraendert. Nur das Restgate wird feiner geschnitten:

### 71.99 Restgate und Blockabschluss

- [ ] 71.99.1 Warmup-/Playwright-Blockerlage gegen aktuelle Cleanup-Realitaet neu bewerten und Ausnahmebedarf dokumentieren.
- [ ] 71.99.2 Finalen Block-End-Testscope fuer Root-Runtime, Build, Core und Editor-/Vehicle-Pfade zusammenstellen.
- [ ] 71.99.3 Gesammelten Block-End-Testlauf fuer den Cleanup-Scope einmalig ausfuehren.
- [ ] 71.99.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und Blocker-/Handoff-Doku abschliessen.

## V74 Revision

Referenz: `docs/plaene/alt/Feature_Architektur_Runtime_Entkopplung_V74_Refresh_2026-04-01.md`

Die bereits abgeschlossenen Phasen `74.1` und `74.2` bleiben unveraendert. Die offenen Phasen werden feiner geschnitten:

### 74.3 Match-Session-Lifecycle und Recorder-Finalisierung

- [ ] 74.3.1 `MatchLifecycleSessionOrchestrator` auf kleines Dependency-Objekt bzw. Session-Port reduzieren.
- [ ] 74.3.2 Match-Init- und Round-Reset-Pfade auf explizite Finalize-/Dispose-Schnittstellen ausrichten.
- [ ] 74.3.3 Verworfene `initializeMatchSession()`-Ergebnisse aktiv entsorgen.
- [ ] 74.3.4 Gemeinsamen Finalize-Vertrag fuer Recorder-Stop, Session-Abbruch, Return-to-Menu und Shutdown einziehen.

### 74.4 Core-/UI-Komposition und State-Ableitungen

- [ ] 74.4.1 `MatchUiStateOps` und aehnliche pure Ableitungen aus `src/ui/**` in passendere Vertragsorte verschieben.
- [ ] 74.4.2 `main.js` als Composition-Einstieg weiter ausduennen.
- [ ] 74.4.3 `GameRuntimePorts` von Alias-Weiterleitungen zu echten Richtungsports zurueckschneiden.
- [ ] 74.4.4 `GameRuntimeFacade` intern in klarere Handler-/Service-Zustaendigkeiten zerlegen.

### 74.5 Shared Runtime-/Gameplay-Contracts

- [ ] 74.5.1 Shared Runtime-/Gameplay-Config-Vertrag fuer `ui`, `state` und `entities` definieren.
- [ ] 74.5.2 Hochfrequente `CONFIG`-/Ambient-State-Leser nach Prioritaet auf explizite Inputs migrieren.
- [ ] 74.5.3 Portal-, Projectile-, Trail-, Hunt- und Powerup-Pfade an denselben shared Vertrag anbinden.
- [ ] 74.5.4 Architektur-Guards erst nach Migration auf die neue Zielbaseline schaerfen.

### 74.6 Desktop-Shell und Capability-Grenzen

- [ ] 74.6.1 `electron/main.cjs` auf entkoppelten Fensterstart und Host-Capability umstellen.
- [ ] 74.6.2 Discovery-, Save- und Host-Faehigkeiten ueber benannte kleine Preload-Vertraege schneiden.
- [ ] 74.6.3 Bestehende breite `curviosApp`-Zugriffe inventarisieren und auf kleine Capabilities rueckfuehren.
- [ ] 74.6.4 Desktop-Build-/Shell-Sonderfaelle aus Root-Dateien in kleinere Einspritzpunkte oder Module verschieben.

### 74.7 Vertragsklarheit und Folgeplaene

- [ ] 74.7.1 Refresh-Scope gegen historische V74-Datei und aktiven Master sauber abgrenzen.
- [ ] 74.7.2 `docs/referenz/ai_architecture_context.md` um neue Lifecycle-, Config- und Capability-Grenzen erweitern.
- [ ] 74.7.3 Folgeplaene `V64`, `V75` und `V76` auf dieselben Guardrails spiegeln.

### 74.99 Integrations- und Abschluss-Gate

- [ ] 74.99.1 Gesammelten Architektur-/Runtime-Block-End-Testlauf fuer den offenen Scope einmalig ausfuehren.
- [ ] 74.99.2 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` abschliessen.
- [ ] 74.99.3 Browser-/Harness-Blocker vor Handoff in `docs/Fehlerberichte/` aktualisieren.

## V75 Revision

Referenz: `docs/plaene/alt/Feature_Cinematic_Recorder_Desktop_WebM_MP4_Stabilisierung_V75.md`

Die offene Phasengliederung soll fuer die naechste Intake-Runde wie folgt feiner geschnitten werden:

### 75.1 Exportstrategie und Dateipfad

- [ ] 75.1.1 Engine-/Container-Matrix fuer Web/Desktop und Cinematic/Standard sauber festziehen.
- [ ] 75.1.2 Save-Dialog-, Dateinamens- und Endungs-Vertrag fuer Desktop-Videoexporte haerten.
- [ ] 75.1.3 Temp-Dateien, Overwrite-Verhalten und Fehlercodes in einen stabilen Save-Vertrag ueberfuehren.
- [ ] 75.1.4 Exportorchestrierung ueber einen dedizierten Finalize-/Export-Port schneiden.

### 75.2 Asynchrones Desktop-Speichern und Konvertieren

- [ ] 75.2.1 Blockierende Main-Process-Schreibpfade in asynchronen Write-/Stream-/Child-Process-Flow ueberfuehren.
- [ ] 75.2.2 Optionalen Desktop-Konverter fuer `WebM -> MP4` kapseln und Verfuegbarkeit erkennen.
- [ ] 75.2.3 Temp-zu-final, Convert-Timeout und Cleanup-Regeln transaktionsartig festziehen.

### 75.3 WebM-first Exportvertrag

- [ ] 75.3.1 `WebM` als Primarartefakt bis zur bestaetigten Konvertierung vertraglich festziehen.
- [ ] 75.3.2 Endgueltigen Ablauf `capture -> save WebM -> optional convert -> final MP4 oder WebM-Fallback` implementierbar machen.
- [ ] 75.3.3 Fehlgeschlagene Konvertierung ohne Verlust des Primarexports absichern.

### 75.4 Qualitaets-Locks und Capture-Profil

- [ ] 75.4.1 Quality-Drosselungen waehrend aktiver Cinematic fuer den Exportpfad gezielt sperren oder uebersteuern.
- [ ] 75.4.2 Explizites Cinematic-Profil fuer Capture-Aufloesung, Bitrate und Ziel-FPS einfuehren.
- [ ] 75.4.3 Rueckbau des Lock-Zustands fuer Stop, Abbruch und Dispose deterministisch machen.

### 75.5 Export-Diagnostik und Nutzerfeedback

- [ ] 75.5.1 UI-Rueckmeldung fuer gespeichertes `WebM`, konvertiertes `MP4` oder Fallback-Ergebnis klar unterscheiden.
- [ ] 75.5.2 Stabile Diagnostics-Felder fuer Container, Save-Transport, Convert-Status und Zielpfad ergaenzen.
- [ ] 75.5.3 Debug-/User-Sicht so schneiden, dass Diagnose reichhaltig bleibt ohne Standardfeedback zu ueberladen.

### 75.6 Lifecycle-Haertung

- [ ] 75.6.1 `manual stop`, `switch stop`, Session-Abbruch, Dispose und Return-to-Menu gegen doppelte Finalisierung absichern.
- [ ] 75.6.2 Save-/Convert-Rennen und orphaned Temp-Dateien fuer alle Stop-Pfade schliessen.
- [ ] 75.6.3 Recorder-Finalisierung an denselben V74-Lifecycle-Vertrag fuer Shutdown und Teardown haengen.

### 75.7 Verifikationsvorbereitung

- [ ] 75.7.1 Gezielte Tests fuer Engine-Wahl, Save-Bridge, Conversion-Fallback und Quality-Lock vorbereiten oder nachziehen.
- [ ] 75.7.2 Schmalen Recorder-Smoke oder Modul-Check fuer instabiles Warmup-Umfeld pflegen.
- [ ] 75.7.3 Externe Toolchain-/Encoder-Blocker vor Blockgate in `docs/Fehlerberichte/` vormerken.

### 75.99 Integrations- und Abschluss-Gate

- [ ] 75.99.1 Gesammelten Recorder-Block-End-Testlauf fuer Build, Modulchecks und Desktop-Smoke einmalig ausfuehren.
- [ ] 75.99.2 `npm run build:app`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` abschliessen.
- [ ] 75.99.3 Packaging-, Warmup- oder Encoder-Blocker vor Handoff explizit dokumentieren.

## V76 Revision

Referenz: `docs/plaene/alt/Feature_Hangar_Arcade_Fight_V76.md`

Die offene Phasengliederung soll fuer die naechste Intake-Runde wie folgt feiner geschnitten werden:

### 76.1 Desktop-Zielarchitektur und Navigation

- [ ] 76.1.1 Rollen von Electron Main, Preload, Renderer-Hangar und Werkstatt-Ansicht trennen.
- [ ] 76.1.2 Getrennte Nutzerfluesse fuer `Fight` und `Arcade` ohne neutralen Zwangs-Hangar festlegen.
- [ ] 76.1.3 Integration ueber dedizierten Navigation-/Composition-Port statt `window.open(...)` oder `game.*` planen.

### 76.2 Gemeinsame Hangar-Shell

- [ ] 76.2.1 Gemeinsame Shell fuer Liste, Suche, Filter, Favoriten und Recents schneiden.
- [ ] 76.2.2 3D-Preview, Preset-Zugriffe und Auswahlbasis aus bestehender Vehicle-UI wiederverwenden.
- [ ] 76.2.3 Rueckschreibebasis aus `UIStartSyncController` und `StartSetupUiOps` uebernehmen.
- [ ] 76.2.4 Desktop-Statusleiste, Shortcuts und spaetere Gamepad-Faehigkeit als Shell-Contract festziehen.

### 76.3 Getrennte Datenraeume und Persistenz

- [ ] 76.3.1 Datenraeume fuer `Arcade` und `Fight` sauber trennen.
- [ ] 76.3.2 Presets, aktive Builds und Validierungsstatus ohne versehentliche Modus-Leaks modellieren.
- [ ] 76.3.3 Gemeinsamen Rueckschreibepfad in `settings.vehicles` gegen Parallelquellen absichern.

### 76.4 Arcade-Hangar

- [ ] 76.4.1 Regelvertrag fuer erlaubte Chassis, Teile, Slots und Blueprint-Grenzen definieren.
- [ ] 76.4.2 `ArcadeVehicleProfile.js` auf XP, Freischaltungen, Slot-Zugriff und persistente Entwicklung ausbauen.
- [ ] 76.4.3 Desktop-Loop fuer Run -> Hangar -> Werkstatt -> Persistenz -> naechster Run festlegen.
- [ ] 76.4.4 Zwei Fortschrittsebenen `XP` und `Teile/Materialien` als getrennte Oekonomie festziehen.

### 76.5 Fight-Hangar

- [ ] 76.5.1 Fight-Build-Regeln innerhalb technischer Safety-Grenzen ohne freie Direktwerte planen.
- [ ] 76.5.2 Hitbox-Klassen als verbindlichen Balance-Contract fuer HP, Speed, Inventar und MG ueberfuehren.
- [ ] 76.5.3 Grenzfaelle, Mischformen und exploit-kritische Sonderfaelle deterministisch behandeln.
- [ ] 76.5.4 Permanente Live-Regelerklaerung fuer Hitbox-Klasse und abgeleitete Werte vorsehen.

### 76.6 Desktop-Werkstatt und Vehicle-Lab

- [ ] 76.6.1 Vehicle Lab fuer `Arcade` und `Fight` als unterschiedliche Werkstattmodi in dieselbe Desktop-Architektur einordnen.
- [ ] 76.6.2 Load-/Save-/Rename-/Delete-Pfade fuer Custom-Fahrzeuge ueber eine Desktop-Fassade kapseln.
- [ ] 76.6.3 `window.open(EDITOR_VIEW_PATHS.VEHICLE_LAB, '_blank')` als Legacy markieren und im selben Fenster ersetzen.
- [ ] 76.6.4 `Undo`/`Redo` und Vorher-/Nachher-Vergleich als Werkstatt-Grundfunktionen verankern.

### 76.7 Menue-, Runtime- und Rueckkehrpfad

- [ ] 76.7.1 Hauptmenue-Einstieg fuer `Fight` ueber einen eindeutigen Desktop-Entry festziehen.
- [ ] 76.7.2 `Fight`-Direktstart aus dem Hangar und getrennter `Arcade`-Rueckgabepfad sauber trennen.
- [ ] 76.7.3 Rueckkehr von Hangar und Werkstatt ueber klaren Desktop-Navigationsvertrag organisieren.
- [ ] 76.7.4 Persistenz-, Fensterwechsel- und Return-to-Menu-Logik aus verteilten Sonderpfaden herausziehen.

### 76.8 Migration und Verifikationsvorbereitung

- [ ] 76.8.1 Alten eingebetteten Arcade-Vehicle-Manager als Legacy-Pfad dokumentieren.
- [ ] 76.8.2 Zielbild fuer Katalog-, Balance-, Progressions- und Desktop-Bridge-Checks vorbereiten.
- [ ] 76.8.3 Vehicle-Lab-Integrations- und Modusgrenzen-Checks fuer das Blockgate sammeln, aber noch nicht ausfuehren.

### 76.99 Integrations- und Abschluss-Gate

- [ ] 76.99.1 Gesammelten Hangar-/Desktop-Block-End-Testlauf fuer Contracts, Bridge und UI-Integration einmalig ausfuehren.
- [ ] 76.99.2 `npm run build`, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` abschliessen.
- [ ] 76.99.3 Handoff nur mit stabilem Rueckschreibepfad und dokumentierten Restblockern schliessen.
