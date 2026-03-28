# Feature Map-Editor UX V65

Stand: 2026-03-28
Status: Geplant
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

- Bauen:
  Hartblock, Schaumblock, Tunnel-Segment, Tunnel-Pfeil
- Flow:
  Portal-Ring, Sonderportale, Player-Spawn, Bot-Spawn
- Pickups:
  Kristall, Stern, Batterie, Schild, Item-Box, Health, Rocket, weitere Items
- Flugobjekte:
  Standard-Schiffe zuerst, danach WWI/Funky/Sondermodelle
- Schnellzugriff:
  Zuletzt benutzt, Favoriten, optional "Empfohlen"

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
- `editor/js/EditorMapManager.js`
- `tests/core.spec.js`
- `tests/editor-map-ui.spec.js` (neu, geplant)

## Architektur-Leitlinien

- Die Objektbibliothek bekommt eine zentrale Metadatenquelle statt verteilter HTML-Optionen.
- `currentTool` plus `subType` bleiben als Platzierungs-Contract erhalten, damit Serializer und Runtime nicht brechen.
- Die neue Dock-UI trennt Auswahl-Logik, Katalogdaten und DOM-Rendering sauber.
- Previews muessen auch ohne geladenes Asset funktionieren; Fallback-Karten bleiben waehlbar.
- Der Inspector bleibt funktional schlank und wird nicht mit Asset-Karten ueberladen.

## UX-Bausteine

- Sticky aktive Karte mit grosserem Highlight und Name im Dock-Header.
- Hover-Tooltip mit Kurzbeschreibung wie "Platzierbarer Spawn fuer Bots".
- Optionale Badge-Slots fuer "Standard", "Gameplay", "Deko", "Neu".
- Horizontal scrollbare Kartenreihe mit Wheel-/Trackpad-Unterstuetzung.
- Merkbare letzte Auswahl pro Kategorie.
- Schnelles Rueckspringen auf `Auswahl / Bewegen` ueber eine feste Primäraktion.

## Phasenplan

- [ ] 65.1 Katalog- und Interaktionskonzept festziehen
  - [ ] 65.1.1 Zentrale Build-Katalog-Metadaten definieren: `type`, `subType`, `label`, `gruppe`, `sortOrder`, `keywords`, `previewToken`, `isFeatured`, Default-Auswahl.
  - [ ] 65.1.2 Finale Interaktionsregeln fuer Dock festlegen: Kategorien, aktive Karte, Quick-Actions, Responsive-Verhalten und Inspector-Abgrenzung.

- [ ] 65.2 DOM- und State-Architektur umbauen
  - [ ] 65.2.1 `editor/map-editor-3d.html` von verstreuten Tool-/Submenu-Feldern auf Inspector plus Bottom-Dock umbauen, ohne Save/Playtest/Property-Funktionen zu verlieren.
  - [ ] 65.2.2 Auswahlzustand in dedizierte UI-Module auslagern, damit Kategorie, aktive Karte, Recents/Favoriten und `currentTool/subType` konsistent bleiben.

- [ ] 65.3 Kartenansicht und Preview-System einfuehren
  - [ ] 65.3.1 Objektkarten mit Mini-Vorschau, Namen und Status-Badge rendern; Previews aus geladenen Assets oder stilisierten Fallbacks ableiten.
  - [ ] 65.3.2 Placeholder-, Lade- und Fehlerfaelle sichtbar machen, ohne die Platzierung zu blockieren.

- [ ] 65.4 Bedienfluss vereinfachen und beschleunigen
  - [ ] 65.4.1 Klick auf Karte waehlt sofort das Platzierungsobjekt; letzte Auswahl pro Kategorie, Favoriten und zuletzt genutzte Objekte werden mitgefuehrt.
  - [ ] 65.4.2 Tastatur- und Mausfluss nachziehen: Kategorien schnell wechseln, Karten horizontal durchlaufen, klare aktive Zustandsanzeige, schneller Rueckweg zur Auswahl.

- [ ] 65.5 Verifikation und visuelle Abnahme
  - [ ] 65.5.1 Playwright-Abdeckung fuer Dock-Rendering, Kategorie-Wechsel, Kartenwahl und Platzierung von mindestens Block, Portal, Item und Flugobjekt ergaenzen.
  - [ ] 65.5.2 Leichte visuelle Evidence erstellen: Screenshot der Build-Leiste plus kurze manuelle Smoke-Probe fuer Save/Export/Playtest.

- [ ] 65.99 Integrations- und Abschluss-Gate
  - [ ] 65.99.1 `npm run test:core` sowie editorrelevante UI-Checks und `npm run build` sind fuer den Scope gruen.
  - [ ] 65.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sowie Lock-/Ownership-/Backlog-Abgleich sind abgeschlossen.

## Verifikationsstrategie

- Editor-UI und Platzierungsfluss: `npm run test:core`
- Build-/Bundle-Sicherheit: `npm run build`
- Plan-/Doku-Gates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Manuelle Sichtprobe: Map-Editor oeffnen, Kategorien wechseln, Objekt per Kartenwahl platzieren, Screenshot ablegen

## Evidence-Format

Abgeschlossene Checkboxen muessen folgendes Format tragen:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Risiken

- Zu viele Karten gleichzeitig machen das Dock unruhig.
  - Mitigation: klare Kategorien, Featured/Recent-Zone, feste Sortierung, kein endloses Mischen.
- Thumbnail-Erzeugung kann den Editorstart verlangsamen.
  - Mitigation: Lazy-Preview-Cache, Fallback-Karten zuerst rendern, echte Asset-Previews nachziehen.
- Umbau der Auswahl-UI kann bestehende `currentTool/subType`-Annahmen brechen.
  - Mitigation: Platzierungs-Contract beibehalten und gegen bestehende Serializer-/Placement-Pfade testen.
- Doppelte Bedienorte verwirren Nutzer, wenn alte und neue Auswahl parallel bestehen bleiben.
  - Mitigation: alte Submenu-Selektoren nach Uebergang entfernen oder eindeutig nur noch als interne Fallbacks halten.
