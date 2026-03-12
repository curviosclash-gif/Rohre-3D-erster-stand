# Feature Plan: Menu Entschlackung V27b

Stand: 2026-03-11
Status: abgeschlossen 2026-03-11

## Ziel

Das Spielmenue soll deutlich uebersichtlicher werden, ohne Funktionen zu verlieren. Primaere Startpfade muessen schneller erreichbar sein, waehrend seltene oder expertenlastige Funktionen weiterhin verfuegbar bleiben, aber spaeter und klarer getrennt erscheinen.

## Ausgangslage

- Ebene 1 ist bereits kompakt und verstaendlich: drei Session-Einstiege plus kurzer Hilfetext.
- Ebene 3 ist der groesste Ueberladungs-Punkt im normalen Spielerpfad:
  - 34 interaktive Elemente in `submenu-game`
  - 3 Akkordeons standardmaessig gleichzeitig geoeffnet
  - Panelhoehe im Browser ca. `1675px` bei sichtbarer `menu-content`-Hoehe von ca. `851px`
- Ebene 4 verdichtet zu viele unterschiedliche Aufgaben in einem Drawer:
  - 75 interaktive Elemente insgesamt
  - `controls` 26, `gameplay` 15, `advanced_map` 4, `tools` 24
- Der Developer-Bereich ist noch einmal eine eigene Expertenoberflaeche:
  - 50 interaktive Elemente insgesamt
  - davon 38 allein im Trainings-/Automationsblock
- Mobil kippt Ebene 4 in einen Fullscreen-Overlay mit horizontal scrollender Tab-Leiste; der Einstieg bleibt sichtbar, aber der Fokus geht verloren.
- Mehrere Legacy-/Weiterleitungs-Panels existieren weiterhin im Markup und Schema, obwohl ihre Funktionen bereits in Ebene 4 konsolidiert wurden.

## Funktionsschutz

Folgende Funktionsgruppen muessen erhalten bleiben:

- Session-Wahl und Moduspfad
- Quickstart (`letzte Einstellungen`, `random map`)
- Match-Setup (`map`, `vehicle`, `match rules`, `presets`, `multiplayer stub`)
- Feineinstellungen (`controls`, `gameplay`, `advanced map`)
- Profile, Presets, Import/Export, explizites Speichern
- Editor-Launcher
- Developer, Debug, Training und Automation fuer Owner/Expertenscope

## Architektur-Check

- Bestehende Navigations- und State-Bausteine sollen wiederverwendet werden:
  - `MenuSchema`
  - `MenuPanelRegistry`
  - `MenuNavigationRuntime`
  - `UIManager`
- Die Entschlackung sollte zuerst ueber Informationsarchitektur, Default-Zustaende und Panel-Zuschnitt erfolgen, nicht ueber neue parallele UI-Systeme.
- Legacy-Kompatibilitaet fuer bestehende IDs, Tests und Event-Pfade muss bewusst gehalten oder ueber Alias-/Adapterpfade abgesichert werden.

## Betroffene Dateien

- `index.html`
- `style.css`
- `src/ui/UIManager.js`
- `src/ui/menu/MenuSchema.js`
- `src/ui/menu/MenuNavigationRuntime.js`
- optional `src/core/GameBootstrap.js` bei Ref-Verschiebungen
- `tests/core.spec.js`
- `tests/stress.spec.js`
- `docs/Umsetzungsplan.md`

## Risiko

- Risiko: mittel
- Hauptgrund: Das Menue ist funktional tief mit Navigation, Persistenz, Access-Policy und Testselektoren verdrahtet. Eine reine Layout-Aenderung reicht nicht; die Informationsarchitektur muss angepasst werden, ohne Contracts zu brechen.

## Dokumentations-Impact

- `docs/Umsetzungsplan.md`
- ggf. `docs/Analysebericht.md`, falls die Umsetzungsphase sichtbare UX-Entscheidungen finalisiert
- Abschluss-Hook: `npm run docs:sync && npm run docs:check`

## Erfolgsmetriken

- Ebene 3 zeigt oberhalb des ersten groesseren Scrolls nur die primaeren Startentscheidungen.
- Maximal ein grosser Detailblock in Ebene 3 ist standardmaessig geoeffnet.
- Ebene 4 zeigt pro Arbeitsbereich nur eine klar abgegrenzte Aufgabe, nicht mehrere Toolfamilien gleichzeitig.
- Developer/Debug/Training liegen ausserhalb des normalen Spielerpfads.
- Mobil keine horizontale Sucharbeit fuer Standardaufgaben.

## Umsetzungsstand

- Ebene 1 wurde auf Branding, Session-Buttons und einen kompakten `Expert`-Einstieg reduziert; `subtitle`, sichtbares `build-info`, `nav-btn-meta`, `nav-help-card` und sichtbarer `menu-context` sind aus dem Hauptpfad entfernt.
- Ebene 2 zeigt nur noch Primaerlabels fuer Quickstart und Moduspfade; Eyebrows, Card-Copy und erklaerende Hints laufen ueber eine zentrale Reduktionsregel und sind nicht mehr sichtbar.
- Ebene 3 nutzt progressive disclosure: nur `map` ist initial offen, `vehicle` und `match` bleiben erreichbar, aber standardmaessig eingeklappt; sekundaere Akkordeon-Copy ist zentral ausgeblendet.
- Ebene 4 fuehrt `Profile & Presets` als klaren Arbeitsbereich; Editor, Config-Import/Export und explizites Speichern sitzen gebuendelt in einer separaten `Utilities`-Zone.
- Developer, Debug und Training wurden aus dem normalen Spielerpfad entfernt und an den Expertenpfad aus `V27c` uebergeben; bestehende IDs, Events und Testpfade bleiben ueber Helper/Policy-Anpassungen stabil.

## Phasenplan

- [x] 27.5 Menue-Inventur und Zielstruktur einfrieren
  - [x] 27.5.1 Alle vorhandenen Menue-Funktionen in `core`, `advanced`, `expert` clustern und pro Funktion die Zieloberflaeche festlegen
  - [x] 27.5.2 Bestehende DOM-IDs, Runtime-Events und Testselektoren markieren, die aus Kompatibilitaetsgruenden stabil bleiben muessen

- [x] 27.6 Ebene 2 und 3 auf Startfokus reduzieren
  - [x] 27.6.1 Ebene 2 auf wenige klare Einstiege zuschneiden: `quickstart`, `guided setup`, `expert route`
  - [x] 27.6.2 Ebene 3 standardmaessig nur mit Startleiste plus einem aktiven Detailblock oeffnen; Presets und sekundaere Hilfstexte auf progressive disclosure umstellen

- [x] 27.7 Ebene 3 Inhalte neu priorisieren
  - [x] 27.7.1 `map`, `vehicle` und `match rules` in eine Reihenfolge bringen, die den haeufigsten Startfaellen folgt; Such-/Favoriten-/Recent-Bloecke nur bei Bedarf zeigen
  - [x] 27.7.2 Multiplayerspezifische Inline-Controls nur im Multiplayer-Kontext zeigen und im Single-Player-Fluss komplett ausblenden

- [x] 27.8 Ebene 4 in klare Werkbaenke aufteilen
  - [x] 27.8.1 `controls`, `match tuning`, `advanced map`, `profile & presets` als getrennte Arbeitsbereiche definieren; den Sammelbegriff `Tools` fachlich aufloesen
  - [x] 27.8.2 Editor-Launcher, Config-Import/Export und explizites Speichern als sekundere Dienstaktionen in eine kompakte Action-Zone oder ein separates Utilities-Panel verschieben

- [x] 27.9 Expertenpfad isolieren
  - [x] 27.9.1 Developer, Debug und Training aus dem normalen Hauptpfad herausnehmen und nur ueber eine explizite Expertenschleuse erreichbar machen
  - [x] 27.9.2 Owner-/Release-Policies und bestehende Trainings-/Automation-Vertraege unveraendert absichern

- [x] 27.10 Legacy- und Redirect-Pfade bereinigen
  - [x] 27.10.1 Weiterleitungs-Panels (`settings`, `controls`, `profiles`, `portals`, `multiplayer`) auf echte Notwendigkeit pruefen und wenn moeglich aus DOM/Navigation entfernen
  - [x] 27.10.2 Falls Redirects fuer Altpfade benoetigt bleiben, nur die Schema-/Alias-Ebene erhalten und sichtbare Redundanz im Menue abbauen

- [x] 27.11 Verifikation und UX-Gate
  - [x] 27.11.1 Funktionale Grenzen pruefen: `npm run test:core`, `npm run test:stress`, Desktop-/Mobil-Screenshot-Check
  - [x] 27.11.2 `npm run docs:sync`, `npm run docs:check`, Doku-Freeze und Rest-Risiken festhalten

## Abschlussverifikation

- `npm run test:core` PASS (`61 passed`, `1 skipped`)
- `npm run test:stress` PASS (`19 passed`)
- `npx playwright test tests/training-environment.spec.js` PASS (`9 passed`)
- Desktop-Screenshots: `menu-v27-level1-desktop.png`, `menu-v27-level2-desktop.png`
- Mobil-Screenshots: `menu-v27-level2-mobile.png`

## Verifikationsgrenzen

- Nach 27.6 bis 27.8 jeweils manueller Desktop-/Mobil-Check des Menueflusses
- Nach 27.9 gezielte Regression fuer Developer-/Debug-/Training-Zugaenge
- Abschlussgate ueber `test:core`, `test:stress` und visuelle Screenshots
