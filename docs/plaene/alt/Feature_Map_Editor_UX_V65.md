# Feature Map-Editor UX V65

Stand: 2026-03-28
Status: In Umsetzung
Owner: Codex

## Ziel

Den 3D-Map-Editor auf eine klarere RTS-aehnliche Bau-UX umstellen:

- Horizontale Build-Leiste am unteren Rand statt primaer linker Tool-Buttonliste.
- Objektwahl ueber kleine Vorschaubilder mit Namen und klarer aktiver Auswahl.
- Sinnvolle Sortierung nach Bauabsicht statt nach technischen Select-Feldern.
- Weniger Klicktiefe, bessere Orientierung, robuste Bedienung auch bei vielen Assets.

## Ausgangslage

Der aktuelle Editor basiert auf:

- einer kompakten Tool-Buttonliste in `editor/map-editor-3d.html`,
- tool-spezifischen Sub-Menues mit `select`-Feldern fuer Spawn, Tunnel, Portale, Items und Flugzeuge,
- `EditorToolPaletteControls.js`, das nur aktive Buttons und Sub-Menues toggelt,
- `EditorFormState.js`, das den aktuellen `subType` direkt aus den einzelnen `select`-Feldern liest.

Dadurch entstehen mehrere UX-Probleme:

- Die eigentliche Objektbibliothek ist ueber mehrere Sub-Menues verteilt.
- Sortierung und Benennung folgen eher technischen IDs als einer Bau-Logik.
- Es gibt keine visuelle Vorschau fuer Objekte vor der Platzierung.
- Wichtige Varianten liegen in `select`-Listen verborgen statt direkt sichtbar im Arbeitsfluss.

## Zielbild

Der Editor bekommt ein klares Drei-Zonen-Layout:

1. Linke Inspector-Spalte:
   Status, Eigenschaften, Speichern/Playtest, Undo/Redo, Grid/Fly/Y-Layer.
2. Zentrale Szene:
   volle Flaeche fuer Kamera, Platzierung und Auswahl.
3. Untere Build-Dock-Leiste:
   Kategorien, horizontale Kartenleiste, aktive Auswahl, Quick-Actions.

Die Build-Leiste orientiert sich an RTS-Editors und Aufbauleisten:

- Kategorie-Tabs mit klaren Symbolen/Farben.
- Objektkarten mit Mini-Bild, lesbarem Namen, Kurzrolle und aktivem Highlight.
- Featured-/Zuletzt-verwendet-Reihe fuer haeufige Objekte.
- Wenige, starke Kategorien statt vieler kleiner Sondermenues.

## Vorgeschlagene Katalogstruktur

### Statische Kategorien (Tab-basiert)

- Bauen:
  Hartblock, Schaumblock, Tunnel-Segment, Tunnel-Pfeil
- Flow:
  Portal-Ring, Sonderportale, Player-Spawn, Bot-Spawn
- Pickups:
  Kristall, Stern, Batterie, Schild, Item-Box, Health, Rocket, weitere Items
- Flugobjekte:
  Standard-Schiffe zuerst, danach WWI/Funky/Sondermodelle

### Dynamische Zonen (immer sichtbar, oberhalb der Kartenreihe)

- Zuletzt benutzt: letzte N platzierte Objekte, kategoriuebergreifend.
- Favoriten: manuell gepinnte Objekte, persistent in LocalStorage (ueberleben Tab-Schliessen und Editor-Neustart).
- Optional "Empfohlen": kontextabhaengig, z.B. fehlende Pflicht-Spawns.

Sortierregeln:

- Zuerst spielrelevante Kernobjekte, dann Spezialformen.
- Keine rohe Alphabet-Sortierung nach Asset-ID.
- Namen deutsch, Asset-ID nur intern.
- Standardvarianten pro Kategorie an erster Stelle.

## Betroffene Dateien (geplant)

- `editor/map-editor-3d.html`
- `editor/js/EditorUI.js`
- `editor/js/EditorAssetLoader.js`
- `editor/js/ui/EditorDomRefs.js`
- `editor/js/ui/EditorFormState.js`
- `editor/js/ui/EditorToolPaletteControls.js` oder Nachfolger-Modul
- `editor/js/ui/EditorUiViews.js`
- `editor/js/ui/EditorCanvasInteractionControls.js`
- `editor/js/EditorBuildCatalog.js` (neu - zentrale Katalog-Metadaten)
- `editor/js/EditorMapManager.js`
- `tests/core.spec.js`
- `tests/editor-map-ui.spec.js` (neu)

## Architektur-Leitlinien

- Die Objektbibliothek bekommt eine zentrale Metadatenquelle (eigenes JS-Modul, z.B. `EditorBuildCatalog.js`) statt verteilter HTML-Optionen. Dort leben alle Felder aus 65.1.1.
- `currentTool` plus `subType` bleiben als Platzierungs-Contract erhalten, damit Serializer und Runtime nicht brechen.
- Die neue Dock-UI trennt Auswahl-Logik, Katalogdaten und DOM-Rendering sauber.
- Previews muessen auch ohne geladenes Asset funktionieren; Fallback-Karten bleiben waehlbar.
- Der Inspector bleibt funktional schlank und wird nicht mit Asset-Karten ueberladen.
- Undo/Redo im Inspector bezieht sich ausschliesslich auf Map-Aktionen (Platzierung, Loeschung, Verschiebung). UI-State wie Kategorie-Wechsel oder Favoriten-Aenderungen sind nicht undo-faehig.

## UX-Bausteine

- Sticky aktive Karte mit grosserem Highlight und Name im Dock-Header.
- Hover-Tooltip mit Kurzbeschreibung wie "Platzierbarer Spawn fuer Bots".
- Optionale Badge-Slots fuer "Standard", "Gameplay", "Deko", "Neu".
- Horizontal scrollbare Kartenreihe mit Wheel-/Trackpad-Unterstuetzung.
- Merkbare letzte Auswahl pro Kategorie.
- Schnelles Rueckspringen auf `Auswahl / Bewegen` ueber eine feste Primaeraktion.
- Suchfeld im Dock-Header: filtert Karten kategoriuebergreifend ueber `keywords` und `label` aus dem Katalog. Mindestens Freitext-Suche, optional Fuzzy-Match.
- Rechtsklick-Kontextmenue auf platzierte Objekte: Duplizieren, Loeschen, Eigenschaften anzeigen. Scope beschraenkt auf diese drei Aktionen; erweiterte Bearbeitung bleibt im Inspector.

### Minimap und Orientierung

- Kleine Minimap (Vogelperspektive) in der unteren rechten Ecke der Szene. Zeigt Kameraposition und platzierte Objekte als farbige Punkte.
- Objekt-Zaehler als Badge auf jedem Kategorie-Tab, z.B. "Bauen (12)" / "Flow (4)".
- Farbkodierung in der Szene: platzierte Objekte erhalten dezenten Umriss passend zur Kategorie (Bauen = blau, Flow = gruen, Pickups = gelb, Flugobjekte = rot). Abschaltbar ueber Inspector-Toggle.

### Layer-Visibility

- Jede Kategorie kann in der Szene einzeln ein-/ausgeblendet werden (Augen-Icon neben dem Kategorie-Tab).
- Ermoeglicht gezieltes Arbeiten auf dichten Maps, z.B. nur Pickups sichtbar beim Item-Balancing.

### Multi-Select und Gruppen-Aktionen

- Shift+Klick oder Rahmen-Auswahl (Drag in der Szene ohne aktives Tool) fuer mehrere Objekte gleichzeitig.
- Gruppen-Aktionen: Verschieben, Loeschen, Duplizieren der gesamten Auswahl.
- Ausgewaehlte Objekte erhalten einen gemeinsamen Bounding-Box-Rahmen.

### Quick-Place-Modus (Stempel)

- Nach Kartenwahl im Dock: gehaltene Maustaste platziert fortlaufend Objekte entlang der Mausbewegung.
- Ideal fuer Block-Reihen, Tunnel-Ketten oder Item-Pfade.
- Deaktivierung durch Rechtsklick oder Escape.

### Copy/Paste von Map-Bereichen

- Rahmen-Auswahl -> Ctrl+C kopiert alle enthaltenen Objekte relativ zueinander.
- Ctrl+V fuegt die Gruppe an der Mausposition ein. Ermoeglicht schnelles Bauen symmetrischer Strukturen.

### Shortcut-Cheatsheet

- `?`-Icon im Inspector-Header oeffnet ein Overlay mit allen Tastenkuerzeln.
- Kuerzel-Liste wird aus einer zentralen Keybinding-Map generiert (nicht hardcoded im HTML).

### Sichtbare Undo-Historie

- Aufklappbare Liste im Inspector (letzte 10-20 Aktionen) mit Kurzbeschreibung (z.B. "Block platziert bei [3,2,1]").
- Klick auf einen Eintrag springt direkt zu diesem Zustand zurueck (batch-undo).

### Objekt-Eigenschaften Inline-Edit

- Fuer einfache Properties (Portal-Ziel, Spawn-Team, Item-Typ) erscheint ein kompaktes Inline-Formular direkt unter der aktiven Dock-Karte.
- Komplexe Eigenschaften bleiben im Inspector. Kann im MVP-Schnitt entfallen.

### Map-Vorlagen / Presets

- Beim Erstellen einer neuen Map: Auswahl aus Starter-Templates ("Leere Arena", "Tunnel-Parcours", "Item-Ring").
- Templates sind normale Map-Dateien in `editor/templates/`, die beim Start kopiert werden.

### Testflug "Play from here"

- Button im Inspector: startet Playtest an der aktuellen Kameraposition statt immer am Player-Spawn.
- Ermoeglicht schnelleres Iterieren bei grossen Maps.

### Map-Fragment Export/Import

- Rahmen-Auswahl -> "Als Snippet speichern" exportiert die Auswahl als eigenstaendige JSON-Datei.
- "Snippet einfuegen" laedt ein gespeichertes Fragment und platziert es an der Mausposition.
- Baut ueber Zeit eine wiederverwendbare Baustein-Bibliothek auf.

### Statistik-Panel

- Aufklappbares Panel im Inspector mit Map-Metriken:
  - Anzahl Objekte pro Kategorie, Spawns (Player/Bot), Portal-Paare, Pickup-Verteilung.
  - Warnungen: "Kein Bot-Spawn vorhanden", "Portal ohne Ziel", "Map hat keine Pickups".
- Hilft Balancing-Fehler und fehlende Pflicht-Objekte frueh zu erkennen.

### Drag & Drop

Drag-from-Dock-to-Scene ist explizit **out-of-scope fuer V65**. Der Platzierungsfluss bleibt Click-to-Select im Dock, dann Click-to-Place in der Szene. Drag & Drop kann als Erweiterung in einem spaeteren Block ergaenzt werden, ohne die Dock-Architektur zu aendern.

### Accessibility

- Dock-Karten erhalten `role="option"` innerhalb einer `role="listbox"`-Kartenreihe; Kategorien als `role="tablist"`.
- Fokus springt beim Kategorie-Wechsel auf die erste Karte der neuen Kategorie.
- Preview-Bilder erhalten `alt`-Texte aus dem Katalog-Label (Fallback: Asset-ID).
- Alle interaktiven Elemente muessen per Tastatur (Tab/Pfeiltasten/Enter) bedienbar sein.

### Responsive-Verhalten

- Bei Fensterbreite < 900 px kollabiert das Dock auf eine einzeilige Kartenreihe mit horizontalem Scroll; Kategorie-Tabs werden zu einem Dropdown.
- Bei Fensterbreite < 600 px (z.B. eingebetteter Preview) wird das Dock ausgeblendet und ueber einen Toggle-Button einblendbar.
- Kategorien mit weniger als 3 Objekten werden visuell zentriert, nicht gestreckt.
- Mindestbreite pro Karte: 72 px (Icon + abgekuerzter Name).

### Performance-Budget

- Dock-Rendering nach Kategorie-Wechsel: < 50 ms bis erste Karte sichtbar.
- Suchfeld-Filterung: < 30 ms bei Tastendruck (debounced auf 150 ms).
- Editor-Start mit Dock: max. 200 ms Overhead gegenueber aktuellem Start ohne Dock.
- Lazy-Preview-Nachladen darf den Main-Thread nicht blockieren; Fallback-Karten muessen sofort stehen.

## Akzeptanzkriterien

- Ein Objekt kann in max. 2 Klicks platziert werden (Kategorie-Tab -> Karte klicken -> Click-to-Place).
- Alle bestehenden Map-Dateien laden und speichern korrekt nach dem Umbau (kein Datenverlust).
- Jede statische Kategorie zeigt mindestens ihre Kernobjekte mit lesbarem Namen und waehlbarem Zustand.
- Die Suchleiste findet jedes Katalog-Objekt ueber Name oder Keyword innerhalb von 2 Tastenschlaegen.
- `currentTool/subType`-Contract bleibt identisch - bestehende Serializer-Tests laufen ohne Anpassung.
- Kein visueller Regression in Inspector-Funktionen (Save, Playtest, Properties, Undo/Redo).

## MVP-Schnitt (Fallback bei Scope-Ueberschreitung)

Falls 65.2 oder 65.3 groesser werden als geplant, ist folgende Minimalversion shippbar:

1. Dock mit Kategorie-Tabs und Text-only-Karten (ohne Previews/Thumbnails).
2. Katalog-Metadaten vollstaendig, aber `previewToken` wird ignoriert - nur Label + Badge.
3. Suchfeld und Favoriten koennen auf einen Folge-Block verschoben werden.
4. Kontextmenue auf platzierte Objekte ist optional und kann entfallen.

Dieser Schnitt liefert die Kern-UX-Verbesserung (weniger Klicktiefe, klare Kategorien) ohne die aufwaendigeren visuellen Features.

Folgende Features sind explizit **Folge-Block-Kandidaten** (nicht im MVP):
- Minimap, Layer-Visibility, Farbkodierung
- Multi-Select und Gruppen-Aktionen
- Quick-Place-Modus (Stempel)
- Copy/Paste von Map-Bereichen
- Map-Fragment Export/Import
- Inline-Edit im Dock
- Map-Vorlagen / Presets
- Statistik-Panel
- Sichtbare Undo-Historie

## Umsetzung 2026-03-28

Der erste funktionsfaehige Slice fuer V65 ist umgesetzt:

- `editor/map-editor-3d.html` nutzt jetzt Inspector plus Bottom-Dock statt sichtbarer Tool-Buttonliste und verteilter Submenu-Selects.
- `editor/js/ui/EditorBuildCatalog.js` kapselt die komplette Objektbibliothek inklusive `tool`, `subType`, Kategorie, Labels, Sortierung, Keywords, Default-Auswahl und Preview-Metadaten.
- `editor/js/ui/EditorToolDockState.js` merkt letzte Auswahl je Kategorie sowie Favoriten und Recents persistent in `localStorage`.
- `editor/js/ui/EditorToolPaletteControls.js` rendert Kategorien, Karten, Schnellzugriff und Dock-Header direkt aus dem Katalog und synchronisiert weiterhin den Legacy-`currentTool/subType`-Contract.
- `editor/js/main.js` stellt `CURVIOS_EDITOR` plus `render_game_to_text()` als Runtime-Hooks fuer Smoke-Checks bereit.
- `tests/editor-map-ui.spec.js` deckt Dock-Rendering, Kategorie-/Kartenwahl, Platzierung sowie Save/Export/Playtest-Smoke ab; der vorherige lokale Playwright-Blocker ist behoben.

## Phasenplan

Abhaengigkeiten: 65.1 muss abgeschlossen sein, bevor 65.2-65.4 starten. 65.2 und 65.3 koennen parallel bearbeitet werden. 65.4 setzt 65.2 + 65.3 voraus. 65.5 laeuft nach 65.4.

```
65.1 -> {65.2, 65.3} -> 65.4 -> 65.5 -> 65.99
```

- [x] 65.1 Katalog- und Interaktionskonzept festziehen (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)
  - [x] 65.1.1 Zentrale Build-Katalog-Metadaten definieren: `type`, `subType`, `label`, `gruppe`, `sortOrder`, `keywords`, `previewToken`, `isFeatured`, Default-Auswahl. (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)
  - [x] 65.1.2 Finale Interaktionsregeln fuer Dock festlegen: Kategorien, aktive Karte, Quick-Actions, Responsive-Verhalten und Inspector-Abgrenzung. (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)

- [x] 65.2 DOM- und State-Architektur umbauen (parallel zu 65.3) (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)
  - [x] 65.2.1 `editor/map-editor-3d.html` von verstreuten Tool-/Submenu-Feldern auf Inspector plus Bottom-Dock umbauen, ohne Save/Playtest/Property-Funktionen zu verlieren. (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)
  - [x] 65.2.2 Auswahlzustand in dedizierte UI-Module auslagern, damit Kategorie, aktive Karte, Recents/Favoriten und `currentTool/subType` konsistent bleiben. (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)

- [x] 65.3 Kartenansicht und Preview-System einfuehren (parallel zu 65.2) (abgeschlossen: 2026-03-29; evidence: commits `87cb45d`, `d33f042`)
  - [x] 65.3.1 Objektkarten mit Mini-Vorschau, Namen und Status-Badge rendern; Previews aus geladenen Assets oder stilisierten Fallbacks ableiten. (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)
  - [x] 65.3.2 Placeholder-, Lade- und Fehlerfaelle sichtbar machen, ohne die Platzierung zu blockieren. (abgeschlossen: 2026-03-29; evidence: commit `d33f042`)

- [x] 65.4 Bedienfluss vereinfachen und beschleunigen (nach 65.2 + 65.3) (abgeschlossen: 2026-03-29; evidence: commits `87cb45d`, `d33f042`)
  - [x] 65.4.1 Klick auf Karte waehlt sofort das Platzierungsobjekt; letzte Auswahl pro Kategorie, Favoriten und zuletzt genutzte Objekte werden mitgefuehrt. (abgeschlossen: 2026-03-29; evidence: commit `87cb45d`)
  - [x] 65.4.2 Tastatur- und Mausfluss nachziehen: Kategorien schnell wechseln, Karten horizontal durchlaufen, klare aktive Zustandsanzeige, schneller Rueckweg zur Auswahl. (abgeschlossen: 2026-03-29; evidence: commit `d33f042`)

- [x] 65.5 Verifikation und visuelle Abnahme (abgeschlossen: 2026-03-29; evidence: `tests/editor-map-ui.spec.js` T65a-T65d -> `test-results/v65-final-pass2`)
  - [x] 65.5.1 Playwright-Abdeckung fuer Dock-Rendering, Kategorie-Wechsel, Kartenwahl und Platzierung von mindestens Block, Portal, Item und Flugobjekt ergaenzen. (abgeschlossen: 2026-03-29; evidence: `node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/editor-map-ui.spec.js -c playwright.editor.config.mjs --timeout=240000` -> `test-results/v65-final-pass2`)
  - [x] 65.5.2 Leichte visuelle Evidence erstellen: Screenshot der Build-Leiste plus kurze manuelle Smoke-Probe fuer Save/Export/Playtest. (abgeschlossen: 2026-03-29; evidence: `docs/qa/V65_Editor_Dock_Smoke_2026-03-29.md` + `docs/qa/V65_Editor_Build_Dock_2026-03-29.png`)

- [x] 65.99 Integrations- und Abschluss-Gate (abgeschlossen: 2026-03-29; evidence: Gate-Kommandos fuer Core/UI/Build/Docs gruen)
  - [x] 65.99.1 `npm run test:core` sowie editorrelevante UI-Checks und `npm run build` sind fuer den Scope gruen. (abgeschlossen: 2026-03-29; evidence: `TEST_PORT=5314 PW_RUN_TAG=v65-core PW_OUTPUT_DIR=test-results/v65-core npm run test:core` -> `117 passed, 3 skipped`; `TEST_PORT=5312 PW_RUN_TAG=v65-final-pass2 PW_OUTPUT_DIR=test-results/v65-final-pass2 node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/editor-map-ui.spec.js -c playwright.editor.config.mjs --timeout=240000` -> `4 passed`; `npm run build` -> PASS)
  - [x] 65.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Backlog-Abgleich sind abgeschlossen. (abgeschlossen: 2026-03-29; evidence: `npm run plan:check` + `npm run docs:sync` + `npm run docs:check` -> PASS; lock + backlog in `docs/Umsetzungsplan.md` und `docs/prozess/Backlog.md` aktualisiert)

## Verifikationsstrategie

- Editor-UI und Platzierungsfluss: `npm run test:core`
- Build-/Bundle-Sicherheit: `npm run build`
- Plan-/Doku-Gates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Manuelle Sichtprobe: Map-Editor oeffnen, Kategorien wechseln, Objekt per Kartenwahl platzieren, Screenshot ablegen

## Evidence-Format

Abgeschlossene Checkboxen muessen folgendes Format tragen:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

Beispiel:
`- [x] 65.2.1 ... (abgeschlossen: 2026-04-10; evidence: npm run test:core -> all green, commit a1b2c3d)`

## Risiken

- Zu viele Karten gleichzeitig machen das Dock unruhig.
  - Mitigation: klare Kategorien, Featured/Recent-Zone, feste Sortierung, kein endloses Mischen.
- Thumbnail-Erzeugung kann den Editorstart verlangsamen.
  - Mitigation: Lazy-Preview-Cache, Fallback-Karten zuerst rendern, echte Asset-Previews nachziehen.
- Umbau der Auswahl-UI kann bestehende `currentTool/subType`-Annahmen brechen.
  - Mitigation: Platzierungs-Contract beibehalten und gegen bestehende Serializer-/Placement-Pfade testen.
- Doppelte Bedienorte verwirren Nutzer, wenn alte und neue Auswahl parallel bestehen bleiben.
  - Mitigation: alte Submenu-Selektoren nach Uebergang entfernen oder eindeutig nur noch als interne Fallbacks halten.
- UX-Bruch fuer bestehende Editor-Nutzer: gewohnte Workflows funktionieren nicht mehr.
- Mitigation: beim ersten Oeffnen nach dem Umbau einen kurzen Tooltip-Hinweis auf die neue Build-Leiste anzeigen. Kein dauerhafter "Classic Mode" - das wuerde die Wartungslast verdoppeln.

