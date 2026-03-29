# Feature Vehicle-Manager UX V66

Stand: 2026-03-28
Status: Geplant
Owner: —

## Ziel

Den Vehicle-Manager von einer einfachen Grid-Auswahl zu einem vollwertigen Fahrzeug-Hub umbauen:

- Uebersichtliche Fahrzeugauswahl mit 3D-Vorschau, Kategorien und Filterung.
- Klare Progression: XP, Level, Slot-Unlocks und Upgrades auf einen Blick.
- Schnelle Bedienung: wenig Klicktiefe, Favoriten, zuletzt genutzt, Suchfeld.
- Tiefere Moeglichkeiten: Vergleich, Loadout-Presets, Statistiken, Vehicle-Lab-Integration.

## Ausgangslage

Der aktuelle Vehicle-Manager basiert auf:

- `ArcadeVehicleManager.js`: einfaches Grid mit Auswahl-Highlight, XP-Bar und 7 Upgrade-Slots.
- `ArcadeVehicleProfile.js`: XP/Level-Progression (1–30), Slot-Unlocks, Tier-Upgrades (T1–T3).
- `UIStartSyncController.js`: Fahrzeugwahl im Start-Menue mit Favoriten und Recent-Liste.
- `vehicle-registry.js`: zentrale Fahrzeug-Definitionen (ID, MeshClass, Hitbox-Radius).
- `MenuPreviewCatalog.js`: Fahrzeug-Preview im Menue.

Dadurch entstehen mehrere UX-Probleme:

- Keine visuelle 3D-Vorschau des gewaehlten Fahrzeugs vor Spielstart.
- Upgrade-System ist flach dargestellt — Slot-Positionen, Tier-Effekte und Kosten nicht intuitiv.
- Kein Vergleich zwischen Fahrzeugen moeglich (Stats nebeneinander).
- Kein schneller Zugriff auf haeufig genutzte Fahrzeuge ausserhalb des Start-Menues.
- Modular gebaute Fahrzeuge aus dem Vehicle-Lab sind schwer auffindbar.
- Keine Filterung nach Fahrzeugklasse, Hitbox-Groesse oder Spielstil.

## Zielbild

Der Vehicle-Manager bekommt ein Drei-Zonen-Layout:

1. Linke Fahrzeugliste:
   Kategorien (Tabs), Suchfeld, Filter, Favoriten-Pins, Sortierung.
2. Zentrale 3D-Vorschau:
   Drehbares Fahrzeug-Modell mit Farbgebung, Slot-Overlay und Statistik-Balken.
3. Rechtes Detail-Panel:
   XP/Level, Upgrade-Slots visuell auf dem Fahrzeug markiert, Loadout-Presets, Vergleich.

## Vorgeschlagene Katalogstruktur

### Statische Kategorien (Tab-basiert)

- Jaeger:
  Aircraft, Arrow, Drone — kleine Hitbox, agil.
- Kreuzer:
  Spaceship, Ship1–Ship9 — mittlere bis grosse Hitbox, robust.
- Spezial:
  Manta (Gleiter), Orb (Energie) — unkonventionelle Spielstile.
- Custom:
  Alle im Vehicle-Lab erstellten modularen Fahrzeuge.

### Dynamische Zonen (oberhalb der Fahrzeugliste)

- Zuletzt genutzt: letzte 5 gespielte Fahrzeuge.
- Favoriten: manuell gepinnte Fahrzeuge, persistent in LocalStorage.
- Empfohlen: basierend auf Spielstil oder fehlender Progression (z.B. "Fast Level 10 — schalte Fluegel-Slots frei!").

### Filter und Sortierung

- Filter nach: Kategorie, Hitbox-Klasse (kompakt/standard/schwer), Unlock-Status, Level-Bereich.
- Sortierung nach: Name, Level, XP, zuletzt gespielt, Hitbox-Groesse.
- Suchfeld: Freitext ueber Name und Keywords.

## Betroffene Dateien (geplant)

- `src/ui/arcade/ArcadeVehicleManager.js` (Hauptumbau)
- `src/ui/UIStartSyncController.js` (Integration der neuen Auswahl)
- `src/ui/menu/MenuPreviewCatalog.js` (3D-Preview erweitern)
- `src/state/arcade/ArcadeVehicleProfile.js` (ggf. Erweiterung fuer Loadout-Presets)
- `src/shared/contracts/ArcadeVehicleProfileContract.js` (Contract-Erweiterung)
- `src/entities/vehicle-registry.js` (Kategorie-/Metadaten-Erweiterung)
- `src/ui/arcade/VehicleManagerCatalog.js` (neu — zentrale Katalog-Metadaten mit Kategorien, Labels, Stats)
- `src/ui/arcade/VehicleComparePanel.js` (neu — Vergleichsansicht)
- `src/ui/arcade/VehicleLoadoutPresets.js` (neu — Loadout-Verwaltung)
- `tests/core.spec.js`
- `tests/vehicle-manager-ui.spec.js` (neu)

## Architektur-Leitlinien

- Die Fahrzeugbibliothek bekommt eine zentrale Metadatenquelle (`VehicleManagerCatalog.js`) die `vehicle-registry.js` um UX-relevante Felder erweitert (Kategorie, Label deutsch, Kurzbeschreibung, Stats-Summary, previewToken).
- `vehicleId` bleibt als zentraler Identifier erhalten — keine Breaking Changes an Player, EntitySetupOps oder Serializer.
- Die neue Vehicle-Manager-UI trennt Auswahl-Logik, Katalogdaten, 3D-Preview und DOM-Rendering sauber.
- 3D-Preview nutzt `createVehicleMesh()` aus dem Registry mit einem eigenen kleinen Three.js-Renderer (kein Vollspiel-Setup).
- Upgrade-Visualisierung zeigt Slots direkt auf dem 3D-Modell (Highlight-Overlay) statt nur als abstrakte Liste.
- Loadout-Presets werden in LocalStorage gespeichert, nicht im Spielstand.

## UX-Bausteine

- 3D-Fahrzeug-Preview mit Maus-Rotation (Orbit Controls), Spielerfarbe und optionalem Slot-Overlay.
- Hover-Tooltip auf Fahrzeugen: Name, Kategorie, Hitbox-Klasse, aktuelles Level.
- XP-Fortschrittsbalken mit naechstem Unlock-Meilenstein hervorgehoben.
- Upgrade-Slots als interaktive Punkte auf dem 3D-Modell: Klick oeffnet Tier-Auswahl.
- Visueller Tier-Effekt: Upgrade-Stufe aendert Slot-Farbe/Glow auf dem Modell.
- Vergleichsmodus: zwei Fahrzeuge nebeneinander mit Stats-Balken (Hitbox, Speed-Eignung, Wendigkeit, Upgrade-Potenzial).
- Loadout-Presets: gespeicherte Upgrade-Konfigurationen pro Fahrzeug, schnell wechselbar.
- Badge-System: "Max Level", "Voll aufgeruestet", "Neuling", "Custom" auf den Fahrzeugkarten.

### Suchfeld und Filter

- Suchfeld oben in der Fahrzeugliste: filtert ueber Name und Keywords aus dem Katalog.
- Filter-Chips unter dem Suchfeld: Kategorie, Hitbox-Klasse, Level-Status (alle klickbar, kombinierbar).
- Aktive Filter als Chips mit X-Button zum Entfernen.

### Vehicle-Lab-Integration

- Custom-Fahrzeuge aus dem Vehicle-Lab erscheinen automatisch in der "Custom"-Kategorie.
- "Im Lab bearbeiten"-Button oeffnet das Vehicle-Lab mit dem ausgewaehlten Fahrzeug vorgeladen.
- Blueprint-Validierungsstatus wird als Badge angezeigt (gueltig/ungueltig/unvollstaendig).

### Statistik-Ansicht

- Aufklappbares Stats-Panel pro Fahrzeug:
  - Gespielte Runden, Gesamtzeit, Kills, Tode, Lieblings-Map.
  - XP-Verlauf als Mini-Diagramm (letzte 10 Spiele).
- Globale Flotten-Uebersicht: Anzahl Fahrzeuge pro Kategorie, Durchschnittslevel, meistgespieltes Fahrzeug.

### Minimap / Groessen-Vergleich

- Optionaler Groessen-Vergleich: zeigt ausgewaehltes Fahrzeug neben einem Referenz-Objekt (z.B. Standard-Block) zur Einschaetzung der Hitbox.

### Shortcut-Cheatsheet

- `?`-Icon oeffnet Overlay mit Tastenkuerzeln fuer den Vehicle-Manager (z.B. Pfeiltasten fuer Navigation, Enter fuer Auswahl, F fuer Favorit-Toggle).

### Accessibility

- Fahrzeugkarten als `role="option"` in einer `role="listbox"`.
- Kategorien als `role="tablist"`.
- 3D-Preview hat `aria-label` mit Fahrzeugname und -klasse.
- Alle interaktiven Elemente per Tastatur bedienbar (Tab/Pfeiltasten/Enter/Escape).
- Upgrade-Slots per Tastatur erreichbar und mit Screenreader-Labels versehen.

### Responsive-Verhalten

- Bei Fensterbreite < 1000 px: Detail-Panel klappt unter die 3D-Vorschau (vertikales Stack-Layout).
- Bei Fensterbreite < 700 px: 3D-Preview wird kleiner, Fahrzeugliste als Dropdown statt Seitenleiste.
- Mindestbreite pro Fahrzeugkarte: 80 px.

### Performance-Budget

- 3D-Preview-Rendering: < 16 ms pro Frame (60 fps) mit einem einzigen Fahrzeug-Mesh.
- Katalog-Filterung: < 30 ms bei Tastendruck (debounced auf 150 ms).
- Wechsel zwischen Fahrzeugen in der Preview: < 100 ms bis Mesh sichtbar.
- Vehicle-Manager oeffnen: < 300 ms vom Klick bis zur vollstaendigen Darstellung.

## Akzeptanzkriterien

- Ein Fahrzeug kann in max. 2 Klicks ausgewaehlt werden (Kategorie → Fahrzeugkarte).
- 3D-Vorschau zeigt das Fahrzeug in Spielerfarbe und ist per Maus drehbar.
- Upgrade-Slots sind visuell auf dem 3D-Modell erkennbar und per Klick aufruestbar.
- Vergleichsmodus zeigt zwei Fahrzeuge nebeneinander mit lesbaren Stats-Balken.
- Alle bestehenden Vehicle-IDs und Upgrade-Profile laden korrekt (kein Datenverlust).
- `vehicleId`-Contract bleibt identisch — bestehende Player/EntitySetupOps-Tests laufen ohne Anpassung.
- Custom-Fahrzeuge aus dem Vehicle-Lab erscheinen in der Custom-Kategorie mit korrektem Badge.

## MVP-Schnitt (Fallback bei Scope-Ueberschreitung)

Falls der Umbau groesser wird als geplant, ist folgende Minimalversion shippbar:

1. Fahrzeugliste mit Kategorien und Text-only-Karten (ohne 3D-Preview).
2. Katalog-Metadaten vollstaendig, aber Preview nutzt statische Thumbnails statt Live-3D.
3. Upgrade-Slots bleiben als Liste (wie bisher), kein Overlay auf dem Modell.
4. Kein Vergleichsmodus, keine Loadout-Presets, kein Stats-Panel.

Dieser Schnitt liefert die Kern-UX-Verbesserung (Kategorien, Filter, Suchfeld, Favoriten) ohne die aufwaendigeren 3D- und Vergleichs-Features.

Folgende Features sind explizit **Folge-Block-Kandidaten** (nicht im MVP):
- Vergleichsmodus (zwei Fahrzeuge nebeneinander)
- Loadout-Presets
- Statistik-Ansicht (Spielhistorie, XP-Diagramm)
- Groessen-Vergleich mit Referenz-Objekt
- Vehicle-Lab "Im Lab bearbeiten"-Button
- Upgrade-Overlay auf dem 3D-Modell

## Phasenplan

Abhaengigkeiten: 66.1 muss abgeschlossen sein, bevor 66.2–66.4 starten. 66.2 und 66.3 koennen parallel bearbeitet werden. 66.4 setzt 66.2 + 66.3 voraus. 66.5 laeuft nach 66.4.

```
66.1 ──┬── 66.2 ──┐
       └── 66.3 ──┴── 66.4 ── 66.5 ── 66.99
```

- [ ] 66.1 Katalog- und Interaktionskonzept festziehen
  - [ ] 66.1.1 Zentrale Vehicle-Katalog-Metadaten definieren: `vehicleId`, `label`, `kategorie`, `hitboxKlasse`, `kurzbeschreibung`, `sortOrder`, `keywords`, `previewToken`, `statsSummary`.
  - [ ] 66.1.2 Finale Interaktionsregeln fuer den Vehicle-Manager festlegen: Kategorien, Filter-Chips, 3D-Preview-Verhalten, Upgrade-Flow, Responsive-Breakpoints.

- [ ] 66.2 UI-Architektur und State-Management (parallel zu 66.3)
  - [ ] 66.2.1 `ArcadeVehicleManager.js` von flachem Grid auf Drei-Zonen-Layout umbauen (Fahrzeugliste, 3D-Preview, Detail-Panel).
  - [ ] 66.2.2 Auswahl-, Filter- und Favoritenzustand in dedizierte Module auslagern, damit Kategorie, aktive Auswahl, Recents und `vehicleId` konsistent bleiben.
  - [ ] 66.2.3 Suchfeld und Filter-Chips implementieren: Freitext-Suche, Kategorie-/Hitbox-/Level-Filter, kombinierbar.

- [ ] 66.3 3D-Preview und Upgrade-Visualisierung (parallel zu 66.2)
  - [ ] 66.3.1 Eigenen Mini-Three.js-Renderer fuer die zentrale Preview aufsetzen: Orbit Controls, Spielerfarbe, Hintergrund.
  - [ ] 66.3.2 Fahrzeug-Mesh ueber `createVehicleMesh()` laden und bei Auswahl-Wechsel austauschen; Fallback-Platzhalter bei Ladefehler.
  - [ ] 66.3.3 Upgrade-Slots als interaktive Overlay-Punkte auf dem 3D-Modell rendern; Klick oeffnet Tier-Auswahl.

- [ ] 66.4 Bedienfluss, Vergleich und Loadouts (nach 66.2 + 66.3)
  - [ ] 66.4.1 Ein-Klick-Auswahl, Favoriten-Toggle, zuletzt genutzte Fahrzeuge und Badge-System umsetzen.
  - [ ] 66.4.2 Vergleichsmodus: zwei Fahrzeuge nebeneinander mit Stats-Balken.
  - [ ] 66.4.3 Loadout-Presets: Upgrade-Konfigurationen speichern/laden/wechseln.
  - [ ] 66.4.4 Tastatur-/Mausfluss nachziehen: Kategorien schnell wechseln, Fahrzeuge durchlaufen, Shortcuts.

- [ ] 66.5 Verifikation und visuelle Abnahme
  - [ ] 66.5.1 Playwright-Abdeckung fuer Fahrzeugliste, Kategorie-Wechsel, 3D-Preview, Upgrade-Interaktion und Auswahl-Persistenz.
  - [ ] 66.5.2 Visuelle Evidence: Screenshot des Vehicle-Managers plus manuelle Smoke-Probe fuer Auswahl → Spielstart.

- [ ] 66.99 Integrations- und Abschluss-Gate
  - [ ] 66.99.1 `npm run test:core` sowie Vehicle-Manager-UI-Checks und `npm run build` sind fuer den Scope gruen.
  - [ ] 66.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Backlog-Abgleich sind abgeschlossen.

## Verifikationsstrategie

- Vehicle-Manager-UI und Auswahl-Flow: `npm run test:core`
- 3D-Preview-Rendering: manueller Smoke-Test (Fahrzeug drehen, Farbe pruefen, Slots klicken)
- Build-/Bundle-Sicherheit: `npm run build`
- Plan-/Doku-Gates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Upgrade-Persistenz: Profil speichern, Browser neu laden, Zustand pruefen

## Evidence-Format

Abgeschlossene Checkboxen muessen folgendes Format tragen:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

Beispiel:
`- [x] 66.2.1 ... (abgeschlossen: 2026-04-15; evidence: npm run test:core -> all green, commit b2c3d4e)`

## Risiken

- 3D-Preview-Renderer erhoet die Bundle-Groesse und Ladezeit.
  - Mitigation: Mini-Renderer mit minimalem Three.js-Setup; nur das noetige Mesh laden, kein Vollspiel-Setup.
- Upgrade-Overlay auf dem 3D-Modell ist schwer positionierbar bei unterschiedlichen Mesh-Geometrien.
  - Mitigation: Slot-Positionen aus `firstPersonAnchor`/Muzzle-Offsets ableiten; Fallback auf abstrakte Liste wenn Positionen unklar.
- Vehicle-Lab Custom-Fahrzeuge haben keine standardisierten Preview-Tokens.
  - Mitigation: On-Demand-Thumbnail-Generierung oder generischer "Custom"-Platzhalter.
- Loadout-Presets koennten mit zukuenftigen Balancing-Aenderungen inkompatibel werden.
  - Mitigation: Presets speichern nur Tier-Stufen pro Slot; bei ungueltigen Eintraegen graceful Fallback auf Default.
- Vergleichsmodus braucht normierte Stats, die aktuell nicht existieren.
  - Mitigation: Stats aus Hitbox-Radius, Upgrade-Potenzial und Kategorie ableiten; keine erfundenen Werte.
- Umbau von `ArcadeVehicleManager.js` kann bestehende Arcade-Flows brechen.
  - Mitigation: `vehicleId` und `ArcadeVehicleProfileContract` als stabilen Contract beibehalten; bestehende Arcade-Tests muessen weiterhin gruen sein.
