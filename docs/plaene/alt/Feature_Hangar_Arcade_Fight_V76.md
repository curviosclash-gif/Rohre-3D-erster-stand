# Feature Desktop Hangar Arcade Fight V76

Stand: 2026-04-01
Status: Entwurf
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Einen neuen Hangar als Desktop-App-Feature planen, der in der Electron-Anwendung die zentrale Fahrzeugoberflaeche fuer Fahrzeugverwaltung bildet und zwei klar getrennte Modi mit getrennten Nutzerfluesen besitzt:

- `Arcade`: regelgebundener Fortschritts-Hangar mit XP, Teilen, Freischaltungen und dauerhafter Fahrzeugentwicklung.
- `Fight`: freier Build-Hangar mit klaren Safety-Grenzen, bei dem HP, Geschwindigkeit, Inventargroesse und MG-Anzahl automatisch aus der Groesse der Hitbox abgeleitet werden.

Primaerziel ist die Desktop-App. Browser-/Prototype-Pfade bleiben nur Wiederverwendungsbasis und duerfen nicht mehr der fuehrende UX-Pfad sein.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V76`
- Hard dependencies:
  - `V71.4` bleibt Grundlage fuer Vehicle-Lab-/Custom-Vehicle-Speicherpfade.
  - Die Disk-API aus `EditorPathContract` bleibt Quelle der Wahrheit fuer gespeicherte Custom-Fahrzeuge.
- Soft dependencies:
  - `V72` bleibt Referenz fuer Fight-nahe Gameplay-Balance und Inventar-/Powerup-Kontrakte.
  - `V64` bleibt Produktleitplanke fuer Desktop-Hauptprodukt vs. Browser-Demo; der Hangar fuehrt deshalb keinen gleichwertigen Browser-Hauptpfad ein.
  - `V74` kann Menue- und Runtime-Integration beruehren. Die Leitplanken aus `docs/plaene/neu/Feature_Architektur_Runtime_Entkopplung_V74_Refresh_2026-04-01.md` gelten insbesondere dafuer, dass der Hangar nicht ueber weiteres Wachstum in `src/core/main.js`, `src/core/GameRuntimeFacade.js` oder globale Desktop-Backdoors integriert wird.
- Hinweis: Manuelle Uebernahme erforderlich.

## Desktop-Leitbild

Der Zielzustand besteht aus einer Desktop-gefuehrten Hangar-Architektur:

- Die Desktop-App besitzt einen klaren Einstieg `Hangar` im Hauptmenue.
- Der Hangar ist kein loses Browser-Tab und kein alter eingebetteter Arcade-Block mehr.
- Electron verwaltet Oeffnen, Ansichtswechsel, Rueckkehr und Persistenz fuer Hangar und Werkstatt innerhalb desselben Desktop-Fensters.
- Renderer-UI, Main-Process und Preload-Bridge haben klar getrennte Verantwortungen.
- Die Hangar-Integration darf `main.js`, `GameRuntimeFacade` und `UIManager` nicht zu neuen Sammelpunkten aufblasen; neue Desktop-Flaechen laufen ueber dedizierte Composition-, Navigation- und Persistenz-Ports.
- Das bestehende `Vehicle Lab` wird als Werkstatt-Basis wiederverwendet, aber als Desktop-Werkstatt neu eingeordnet.
- `Fight` und `Arcade` teilen technische Bausteine, aber nicht zwingend denselben direkten Oberflaechen-Flow.

## Produktbild

Der Zielzustand besteht aus drei Schichten, die zusammen die Desktop-Hangar-Erfahrung bilden:

- Desktop-Shell:
  - Hauptmenue oeffnet den Hangar ueber einen Desktop-Pfad.
  - Electron haelt Hangar und Werkstatt im selben Hauptfenster und steuert nur den Wechsel zwischen den Ansichten.
  - `window.open(...)` ist fuer die Desktop-App kein Primaerpfad mehr.
- Gemeinsame Komponentenbasis:
  - Fahrzeugliste, Suche, Filter, Favoriten, Recents, 3D-Preview, Vergleichsansicht, Statusleiste und Rueckschreiben in `settings.vehicles`.
  - Eine gemeinsame Auswahlbasis fuer `PLAYER_1`, spaeter optional `PLAYER_2`.
  - Geteilte UI-Bausteine, aber getrennte Regelvertraege, getrennte Datenraeume und getrennte Startpfade.
- Getrennte Modusraeume:
  - `Arcade` bleibt progression-getrieben und streng regelgebunden.
  - `Fight` bleibt gestaltungsfrei, aber kampfseitig deterministisch normalisiert.
  - Beide Modi koennen dieselbe Werkstatt-Basis nutzen, aber mit verschiedenen Freiheiten, Limits und Rueckgabevertraegen.

## Desktop-Interaktionsfluss

`Fight`-Pfad:

1. Spieler startet die Desktop-App und oeffnet im Hauptmenue den `Fight`-Hangar.
2. Der `Fight`-Hangar zeigt aktives Fahrzeug, Preview, Bibliothek, freie Werkstatt und Live-Regelerklaerung.
3. Bei tieferem Umbau wechselt die Desktop-App kontrolliert in die Werkstatt-Ansicht im selben Fenster.
4. Nach Speichern kehrt der Spieler in den `Fight`-Hangar zurueck und startet von dort direkt `Fight`.

`Arcade`-Pfad:

1. Spieler erreicht den `Arcade`-Hangar ueber den getrennten Arcade-Spiel-Flow.
2. Der `Arcade`-Hangar zeigt Fortschritt, freigeschaltete Teile, erlaubte Umbauten und persistente Entwicklung.
3. Die Werkstatt bleibt regelgebunden und gibt kontrolliert in den naechsten Arcade-Run zurueck.

## Fight-Balance-Rahmen

Die erste Planungsrunde nutzt drei klare Hitbox-Klassen als deterministischen Normalisierungsvertrag.

| Klasse | Hitbox-Radius | HP | Speed-Multiplikator | Inventar-Slots | MG-Anzahl |
| --- | --- | --- | --- | --- | --- |
| `kompakt` | `<= 1.00` | `80-110` | `1.15-1.30` | `5-6` | `4` |
| `standard` | `> 1.00 && < 1.35` | `111-159` | `0.95-1.14` | `7-8` | `3` |
| `schwer` | `>= 1.35` | `160-220` | `0.75-0.94` | `9-10` | `2` |

Interpretation:

- Kleine Hitbox: schnell, wenig HP, kleines Inventar, hohe MG-Dichte.
- Grosse Hitbox: langsam, viel HP, grosses Inventar bis maximal `10`, reduzierte MG-Anzahl.
- Der minimale Inventarwert fuer `Fight` ist `5`.
- Die konkrete Endabstimmung erfolgt spaeter ueber Playtests, Telemetrie und Bot-Simulation, aber diese Spannen sind der verbindliche Startkorridor.

## Arcade-Regelbild

`Arcade` folgt einem festen Fortschrittsmodell:

- Fahrzeuge bauen nur innerhalb erlaubter Chassis-, Slot- und Teile-Regeln.
- Teile, Upgrades und Slot-Zugriffe werden im Spiel verdient.
- XP, Freischaltungen und Mastery bleiben persistent.
- Der Hangar ist die Nachbereitungs- und Fortschrittsoberflaeche zwischen Runs.
- Die Werkstatt darf in `Arcade` nur freigeschaltete und regelkonforme Aenderungen zulassen.

## Ergaenzende Produkt- und UX-Vorgaben

Die folgenden Verbesserungen werden zusaetzlich als Planungsziel aufgenommen:

- Gemeinsame UI-Basis, aber getrennte Datenraeume fuer `Arcade` und `Fight`, damit Presets, Freischaltungen und aktive Fahrzeuge sich nicht vermischen.
- `Fight` zeigt jederzeit live an, welche Hitbox-Klasse aktiv ist und wie daraus HP, Speed, Inventar und MG-Anzahl abgeleitet werden.
- `Arcade` nutzt zwei Fortschrittsebenen: `XP` fuer Stufen/Freischaltlogik und `Teile` oder Materialien fuer konkrete Bau- und Upgrade-Schritte.
- Werkstatt-Flows erhalten `Undo`/`Redo` sowie einen klaren `Vorher/Nachher`-Vergleich fuer Werte und Build-Aenderungen.
- `Fight` startet direkt aus dem `Fight`-Hangar; `Arcade` bleibt an seinen getrennten Spiel-Flow gebunden.
- Die Bedienung wird klar auf Desktop ausgelegt: grosse Interaktionszonen, Tastatur-Shortcuts und spaetere Gamepad-Faehigkeit.
- Eine feste Statusleiste zeigt Modus, aktives Schiff, Validitaet, ungespeicherte Aenderungen und Startbereitschaft.

## Bestehende Basis

Bereits vorhandene und wiederverwendbare Grundlagen:

- `src/ui/arcade/VehicleManagerCatalog.js`
- `src/ui/arcade/vehicle-manager/VehicleManagerPreview3d.js`
- `src/ui/arcade/vehicle-manager/VehicleManagerLoadoutPresets.js`
- `src/state/arcade/ArcadeVehicleProfile.js`
- `src/entities/arcade/ArcadeBlueprintSchema.js`
- `src/ui/UIStartSyncController.js`
- `src/ui/start-setup/StartSetupUiOps.js`
- `prototypes/vehicle-lab/**`
- `src/entities/GeneratedVehicleConfigs.js`
- `src/entities/vehicle-registry.js`
- `src/entities/runtime-modular-vehicle-mesh.js`
- `electron/main.cjs`
- `electron/preload.cjs`

Wichtige Architekturbeobachtungen:

- Der alte `ArcadeVehicleManager.js` ist eher Feature-Referenz als Ziel fuer direkten Weiterbau.
- Das `Vehicle Lab` ist die staerkere Basis fuer echtes Bauen und Bearbeiten, muss fuer die Desktop-App aber neu gerahmt werden.
- Die Desktop-App besitzt bereits Main-/Preload-Infrastruktur, nutzt fuer den Vehicle-Editor aktuell aber noch einen losen `window.open(...)`-Pfad.

## Betroffene Pfade (geplant)

- `src/ui/hangar/**` (neu)
- `src/shared/contracts/HangarModeContract.js` (neu)
- `src/shared/contracts/FightHangarBalanceContract.js` (neu)
- `src/shared/contracts/ArcadeHangarRulesContract.js` (neu)
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/UIStartSyncController.js`
- `src/ui/start-setup/StartSetupUiOps.js`
- `src/ui/arcade/VehicleManagerCatalog.js`
- `src/ui/arcade/vehicle-manager/VehicleManagerPreview3d.js`
- `src/ui/arcade/vehicle-manager/VehicleManagerLoadoutPresets.js`
- `src/state/arcade/ArcadeVehicleProfile.js`
- `src/entities/arcade/ArcadeBlueprintSchema.js`
- `src/entities/vehicle-registry.js`
- `src/entities/GeneratedVehicleConfigs.js`
- `src/entities/runtime-modular-vehicle-mesh.js`
- `src/shared/contracts/EditorPathContract.js`
- `electron/main.cjs`
- `electron/preload.cjs`
- `prototypes/vehicle-lab/index.html`
- `prototypes/vehicle-lab/main.js`
- `prototypes/vehicle-lab/src/**`
- `tests/**` (gezielte Hangar-, Contract- und Desktop-Bridge-Checks)
- `docs/plaene/neu/Feature_Hangar_Arcade_Fight_V76.md`

## Definition of Done (DoD)

- [ ] DoD.1 Die Desktop-App besitzt einen klaren `Fight`-Hangar-Einstieg; der `Arcade`-Hangar bleibt als eigener Spiel-Flow sauber getrennt.
- [ ] DoD.2 `Arcade` und `Fight` teilen eine gemeinsame Komponentenbasis, besitzen aber getrennte Regelvertraege, Datenraeume und Startpfade.
- [ ] DoD.3 `Arcade` deckt XP, Teile, Freischaltungen, Slot-Unlocks, Upgrade-Tiers und persistente Fahrzeugentwicklung reproduzierbar ab.
- [ ] DoD.4 `Fight` leitet HP, Geschwindigkeit, Inventar-Slots und MG-Anzahl deterministisch aus der Hitbox-Klasse ab und zeigt diese Ableitung live nachvollziehbar an.
- [ ] DoD.5 Werkstatt-Flows unterstuetzen `Undo`/`Redo`, Vergleichsansicht und eine klare Desktop-Statusleiste.
- [ ] DoD.6 Werkstatt-/Vehicle-Lab-Flows sind fuer die Desktop-App sauber als interne Ansicht im selben Fenster ueber Electron/Main/Preload integriert und nicht mehr primaer an loses `window.open(...)` gebunden.
- [ ] DoD.7 Menue, Hangar, Werkstatt und Match-Start nutzen einen einzigen nachvollziehbaren Rueckschreibepfad in `settings.vehicles` und den zugehoerigen Persistenzobjekten.
- [ ] DoD.8 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, `npm run build` und die direkt betroffenen Hangar-/Desktop-Checks sind gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 76.1 Desktop-Zielarchitektur und Schnittstellen

- [ ] 76.1.1 Einen Desktop-Hangar-Vertrag festlegen, der Rollen von `electron/main.cjs`, `electron/preload.cjs`, Renderer-Hangar-Shell und Werkstatt-Ansicht eindeutig trennt.
- [ ] 76.1.2 Getrennte Nutzerfluesse fuer `Fight` und `Arcade` spezifizieren, sodass kein erzwungener neutraler Zwischen-Hangar entsteht und beide Modi ihre passende Rueckkehr-Logik behalten.
- [ ] 76.1.3 Die Integration ueber einen dedizierten Desktop-Navigation-/Composition-Port planen, statt `window.open(...)`, globale `game.*`-Mutation oder neue Sonderfaelle in `GameRuntimeFacade` als Default-Muster weiterzutragen.

### 76.2 Gemeinsame Hangar-Shell

- [ ] 76.2.1 Eine gemeinsame Hangar-Shell unter `src/ui/hangar/**` planen, die Suche, Filter, Favoriten, Recents, Fahrzeugliste, 3D-Preview und Preset-Zugriffe aus bestehenden Bausteinen wiederverwendet.
- [ ] 76.2.2 Die vorhandene Start-Setup-Anbindung aus `UIStartSyncController` und `StartSetupUiOps` als gemeinsame Auswahl- und Rueckschreibebasis uebernehmen, statt neue parallele State-Silos aufzubauen.
- [ ] 76.2.3 Getrennte Datenraeume fuer `Arcade` und `Fight` planen, damit aktive Builds, Presets, Fortschritt und Validierungsstatus nicht versehentlich geteilt werden.
- [ ] 76.2.4 Eine feste Desktop-Statusleiste sowie desktop-first Bedienmuster mit Shortcuts und spaeterer Gamepad-Faehigkeit als Shell-Bestandteil definieren.

### 76.3 Arcade-Hangar

- [ ] 76.3.1 Arcade-Fahrzeuge in feste Regelpfade aufteilen: erlaubte Chassis, erlaubte Teile, Slot-Gates, Tier-Gates und valide Blueprint-Limits muessen aus Contracts ableitbar sein.
- [ ] 76.3.2 Die vorhandene XP-/Mastery-/Upgrade-Basis aus `ArcadeVehicleProfile.js` auf Teile-Freischaltungen, Slot-Zugriff und dauerhafte Fahrzeugentwicklung erweitern.
- [ ] 76.3.3 Einen klaren Desktop-Loop planen: im Run XP und Teile sammeln, im Hangar Teile installieren/verbessern, Presets speichern, Fortschritt persistieren und kontrolliert in den naechsten Run zurueckgeben.
- [ ] 76.3.4 Zwei Fortschrittsebenen fuer `Arcade` festlegen: `XP` fuer Stufen/Freischaltung und `Teile` oder Materialien fuer konkrete Umbauten und Upgrades.

### 76.4 Fight-Hangar

- [ ] 76.4.1 Die Fight-Build-Regeln so planen, dass das Schiff innerhalb technischer Safety-Grenzen frei gebaut werden kann, ohne freie Direktwahl von HP, Geschwindigkeit, Inventar oder MG-Anzahl.
- [ ] 76.4.2 Die Hitbox-Klassen `kompakt`, `standard`, `schwer` als verbindlichen Balance-Contract fuer HP, Speed, Inventar-Slots und MG-Anzahl ueberfuehren.
- [ ] 76.4.3 Exploit-Schutz fuer Grenzfaelle planen: Bandgrenzen, Mischformen, asymmetrische Builds, minimale/maximale Hitboxen und geladene Custom-Fahrzeuge muessen deterministisch behandelt werden.
- [ ] 76.4.4 Eine permanente Live-Regelerklaerung planen, die aktuelle Hitbox-Klasse, Normalisierung und resultierende Werte fuer den Spieler sichtbar macht.

### 76.5 Desktop-Werkstatt und Vehicle-Lab-Integration

- [ ] 76.5.1 Das Vehicle Lab als Werkstatt-Modul in die Desktop-Hangar-Architektur einordnen: fuer `Arcade` im regelgebundenen Werkstattmodus, fuer `Fight` im freien Build-Modus.
- [ ] 76.5.2 Die vorhandenen Load-/Save-/Rename-/Delete-Pfade fuer Custom-Fahrzeuge ueber eine Desktop-Fassade anbinden, damit Menue, Runtime und Werkstatt nicht direkt ueber lose Dateipfade gekoppelt bleiben.
- [ ] 76.5.3 Den bisherigen `window.open(EDITOR_VIEW_PATHS.VEHICLE_LAB, '_blank')`-Pfad als Legacy markieren und einen Electron-gesteuerten Ansichtswechsel im selben Fenster definieren.
- [ ] 76.5.4 `Undo`/`Redo` und `Vorher/Nachher`-Vergleich als festen Bestandteil der Werkstatt-Interaktion planen.

### 76.6 Menue-, Runtime- und Rueckschreibepfad

- [ ] 76.6.1 Das Hauptmenue der Desktop-App oeffnet den `Fight`-Hangar ueber einen nachvollziehbaren Desktop-Entry statt ueber verteilte Einzelaktionen.
- [ ] 76.6.2 Hangar, Werkstatt und Match-Start nutzen einen einzigen Rueckschreibepfad in `settings.vehicles`, damit Auswahl, Custom-Fahrzeuge und Progressionsstand nicht auseinanderlaufen.
- [ ] 76.6.3 `Fight` startet direkt aus seinem Hangar-Pfad; `Arcade` bleibt sauber an seinen getrennten Spiel-Flow gekoppelt.
- [ ] 76.6.4 Rueckkehr von Hangar und Werkstatt laeuft ueber einen klaren Desktop-Navigationsvertrag, damit Fensterwechsel, Persistenz und Return-to-Menu nicht erneut als verteilte Sonderlogik im UI- oder Core-Layer landen.

### 76.7 Migration, Tests und Dokumentation

- [ ] 76.7.1 Den alten eingebetteten Arcade-Vehicle-Manager endgueltig als Legacy-Pfad dokumentieren und die Migration auf die neue Desktop-Hangar-Shell beschreiben.
- [ ] 76.7.2 Tests fuer Katalog, Balance-Contracts, Progressionspfade, Fight-Normalisierung, Desktop-Bridge und Vehicle-Lab-Integration gezielt erweitern.

### 76.99 Integrations- und Abschluss-Gate

- [ ] 76.99.1 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, `npm run build` und die direkt betroffenen Hangar-/Desktop-Checks sind gruen.
- [ ] 76.99.2 `Arcade`- und `Fight`-Hangar lassen sich in der Desktop-App stabil oeffnen, speichern korrekt, und die Rueckgabe an Menue und Match-Start nutzt einen einzigen nachvollziehbaren Contract.

## Verifikationsstrategie

- Plan-/Dokugates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Allgemeine Runtime-Sicherheit: `npm run build`
- Contract-Checks: gezielte Tests fuer `VehicleManagerCatalog`, `ArcadeVehicleProfile`, `FightHangarBalanceContract` und Blueprint-Validierung
- Desktop-Checks: Ansichtswechsel, Rueckkehr, Save/Load, Statusleiste, Vergleichsansicht und Renderer-Bridge fuer Hangar/Werkstatt im selben Fenster
- Menue-/Hangar-Checks: Start-Setup-Rueckschreiben, Favoriten/Recents, Preview, Fight-Direktstart und Arcade-getrennter Rueckgabepfad

## Risiko-Register V76

- `R1 | high | Gemeinsame Vehicle-Basis kann Arcade- und Fight-Regeln versehentlich vermischen.`
  - Mitigation: harte Contract-Trennung zwischen `ArcadeHangarRulesContract` und `FightHangarBalanceContract`.
- `R2 | high | Desktop-App kann durch lose Browser-Fenster weiterhin uneinheitliche Werkstatt-Flows behalten.`
  - Mitigation: Electron-gesteuerter Hangar-/Werkstattpfad im selben Fenster wird Primaerarchitektur; `window.open(...)` bleibt nur Legacy-/Fallback-Thema.
- `R3 | high | Vehicle-Lab-Integration kann fragile Kopplungen zwischen Menue, Runtime und Custom-Fahrzeug-Speicher erzeugen.`
  - Mitigation: Fassade/Ports zwischen Desktop-Hangar, Werkstatt und Persistenz; Speicherpfade bleiben klar gekapselt.
- `R4 | medium | Fight-Normalisierung an Bandgrenzen kann exploitable werden.`
  - Mitigation: klare Hitbox-Baender, deterministische Rundung und spaetere Telemetrie-/Playtest-Iteration einplanen.
- `R5 | medium | Arcade-Fortschritt kann ohne saubere Teil-/Upgrade-Oekonomie zu komplex oder grind-lastig werden.`
  - Mitigation: XP, Teile, Slot-Unlocks und Upgrade-Tiers getrennt modellieren und mit engem Startkorridor einfuehren.
- `R6 | medium | Start-Setup, Hangar und Werkstatt koennen mehrere konkurrierende Quellen der Wahrheit erzeugen.`
  - Mitigation: ein gemeinsamer Rueckschreibepfad in `settings.vehicles` plus klar definierte Persistenz fuer Fortschritt und Custom-Configs.
- `R7 | medium | Gemeinsame UI-Bausteine koennen trotz getrennter Modi zu versehentlich geteilten Presets oder Zustandslecks fuehren.`
  - Mitigation: getrennte Datenraeume, explizite Speicher-Namespaces und tests fuer Modusgrenzen einplanen.

## Handoff-Hinweis

- Dieser Plan ist absichtlich ein externer Plan unter `docs/plaene/neu/`.
- Keine direkte Aenderung an `docs/Umsetzungsplan.md`.
- Fuer die manuelle Uebernahme sollte der Scope als eigener Hangar-Block `V76` im Desktop-/Vehicle-Lab-Umfeld einsortiert werden.
