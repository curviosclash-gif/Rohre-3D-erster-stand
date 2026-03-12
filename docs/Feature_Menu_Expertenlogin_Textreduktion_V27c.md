# Feature Plan: Menu Expertenlogin und Textreduktion V27c

Stand: 2026-03-11
Status: abgeschlossen 2026-03-11

## Ziel

Punkt 4 der Menue-Entschlackung wird als eigener Umsetzungsblock konkretisiert:

- Developer, Debug und Training sollen aus dem normalen Spielerpfad herausgenommen werden.
- Der Expertenbereich soll ueber einen expliziten Login mit Passwort erreichbar sein.
- Das Passwort wird auf `1307` gesetzt.
- Die gelb markierten Texte aus den bereitgestellten Screenshots sollen im sichtbaren Menue entfernt werden.
- Die Entfernung soll der bestehenden Reduktionslogik im restlichen Menue folgen: primaere Aktionen bleiben sichtbar, sekundaere Erklaertexte verschwinden oder wandern in spaetere Expertensichten.

## Wichtige Annahmen

- Es handelt sich um ein rein lokales UI-Gate in einer statischen Client-Anwendung, nicht um echte sichere Authentifizierung.
- Das Passwort `1307` schuetzt den Expertenbereich auf UX-Ebene gegen versehentliches Oeffnen, nicht gegen Quellcode-Inspektion.
- Der normale Spielstart darf durch die Aenderung keinen zusaetzlichen Schritt bekommen.
- Build-Info, Debug und Training bleiben funktional erhalten, werden aber aus dem Hauptpfad entfernt.

## Fokus-Scope

### A. Expertenpfad

- Neuer Expertenzugang mit Passwortfeld
- Freischaltung von `submenu-developer` und `submenu-debug`
- Schutz der bestehenden Developer-/Training-Events und Owner-Policies

### B. Textreduktion im Hauptmenue

Die folgenden sichtbar markierten Textfamilien sollen entfernt oder in nicht sichtbare/accessibility-kompatible Alternativen ueberfuehrt werden:

- `subtitle`
- `build-info` im Hauptmenue
- `nav-btn-meta`
- `nav-help-card`
- sichtbarer `menu-context`
- `menu-hint` in Ebene 1/2 fuer erklaerenden Copy-Text
- `menu-choice-eyebrow`
- `menu-choice-copy`
- `menu-accordion-copy`, soweit sie nur erklaerende Zweitcopy liefern

## Bestehende Hotspots

- Level 1 Hauptkopf und Session-Navigation in `index.html`
- Level 2 Schnellstart-/Modus-Karten in `index.html`
- Expertenzugang aktuell ueber `Tools -> Developer oeffnen`
- Access-Policy heute in `src/ui/menu/MenuAccessPolicy.js`
- Build-Badge und Build-Details in `src/core/BuildInfoController.js`
- Sichtbare Copy-Stile zentral in `style.css`
- Bestehende Tests erwarten sichtbare Build-/Context-Elemente und einen direkten Developer-Zugang

## Architektur-Entscheidung

Die Umsetzung soll keinen zweiten Menue-Stack erzeugen. Stattdessen wird auf den bestehenden Bausteinen aufgebaut:

- `MenuSchema`
- `MenuNavigationRuntime`
- `MenuAccessPolicy`
- `UIManager`
- `GameBootstrap`

Fuer die neue Expertenfreischaltung ist ein kleines separates Runtime-Modul sinnvoll, statt Passwortlogik in `UIManager` oder `GameRuntimeFacade` zu verteilen.

Empfohlene neue Verantwortlichkeit:

- `src/ui/menu/MenuExpertLoginRuntime.js`
  - verwaltet Passwortdialog/-panel
  - fuehrt Passwortvergleich gegen `1307` aus
  - haelt Auth-Status session-lokal
  - bietet `unlock`, `lock`, `isUnlocked` und Fehlermeldungszustand

## Ziel-UX

### Normaler Spielerpfad

- Ebene 1 zeigt nur Branding, Session-Buttons und die noetigen Hauptlabels.
- Ebene 2 zeigt nur Karten-/Aktionsnamen und keine beschreibende Zweitcopy.
- Ebene 3 bleibt fuer Start-Setup zugaenglich, aber ohne Experteneinladung im primaeren Blickfeld.
- Build-Info ist nicht mehr im Hauptkopf sichtbar.

### Expertenpfad

- Ein kompakter Eintrag `Expertenlogin` oder `Expert` ersetzt den bisherigen Build-/Meta-Slot oder sitzt in einer kleinen sekunderen Utility-Zone.
- Klick oeffnet Passwort-Overlay oder kompaktes Dialogpanel.
- Passwort `1307` schaltet den Expertenbereich fuer die aktuelle Sitzung frei.
- Nach erfolgreichem Login erscheinen erst dann die Developer-/Debug-Zugaenge.
- Ein sichtbarer `Logout` oder `Sperren`-Pfad setzt den Zugang wieder zurueck.

## Betroffene Dateien

- `index.html`
- `style.css`
- `src/core/GameBootstrap.js`
- `src/core/BuildInfoController.js`
- `src/ui/UIManager.js`
- `src/ui/menu/MenuSchema.js`
- `src/ui/menu/MenuAccessPolicy.js`
- `src/ui/menu/MenuNavigationRuntime.js`
- `src/ui/menu/MenuDeveloperStateSync.js`
- voraussichtlich neues Modul `src/ui/menu/MenuExpertLoginRuntime.js`
- `tests/helpers.js`
- `tests/core.spec.js`
- `tests/stress.spec.js`
- `tests/training-environment.spec.js`
- `docs/Umsetzungsplan.md`

## Risiko

- Risiko: mittel bis hoch
- Gruende:
  - bestehende Developer-/Training-Tests haengen am direkten Menuezugang
  - sichtbarer Build-/Context-Bereich ist aktuell in Core-Tests verdrahtet
  - statisches Passwort darf UX-seitig sauber integriert werden, ohne falsche Sicherheitsannahmen zu erzeugen

## Erfolgsmetriken

- Im sichtbaren Hauptmenue bleiben nur primaere Aktionslabels stehen; die in den Screenshots markierten Zweittexte sind entfernt.
- Kein Developer-/Training-Zugang ist ohne Expertenlogin sichtbar oder normal erreichbar.
- Nach korrektem Passwort `1307` sind Developer und Debug unveraendert funktional.
- Nach Logout oder Reload ist der Expertenbereich wieder gesperrt.
- Screenreader-relevante Statusinformationen bleiben erhalten, auch wenn sichtbare Copy reduziert wird.

## Abschlussstand

- `src/ui/menu/MenuExpertLoginRuntime.js` fuehrt einen session-lokalen Expertenstatus mit `unlock`, `lock`, `isUnlocked`, Fehlerzustand und fest verdrahtetem Passwort `1307`.
- `MenuAccessPolicy`, `MenuNavigationRuntime`, `UIManager` und `MenuDeveloperStateSync` behandeln den Expertenstatus als additive Gate-Schicht vor Developer/Debug; Owner-/Release-Policies bleiben zusaetzlich aktiv.
- `index.html` fuehrt einen kompakten `Expert`-Einstieg samt Sperren-Quick-Action, einen gesperrten/freigeschalteten Expertenbereich und die Verlagerung von `build-info`, `Developer` und `Debug / Info` in diesen Pfad ein.
- Sichtbare Zweitcopy wird zentral ueber CSS reduziert: `subtitle`, `nav-btn-meta`, `nav-help-card`, `menu-choice-eyebrow`, `menu-choice-copy`, `menu-accordion-copy`, `menu-copy-secondary`; `menu-context` bleibt als `sr-only`-Status erhalten.
- Tests und Helper wurden auf den gesperrten Expertenpfad migriert; neue Regressionen decken falsches Passwort, korrektes Passwort `1307`, Logout/Reload-Sperre und entfernte Copy-Familien ab.

## Phasenplan

- [x] 4.1 Contract-Freeze fuer Expertenzugang und Textentfernung
  - [x] 4.1.1 Alle zu entfernenden sichtbaren Texte anhand der bestehenden Klassen/IDs katalogisieren (`subtitle`, `nav-btn-meta`, `nav-help-card`, `menu-context`, `menu-choice-eyebrow`, `menu-choice-copy`, relevante `menu-hint`-Texte)
  - [x] 4.1.2 Bestehende Developer-/Debug-/Training-Zugangspfade, Testhelpers und Access-Policies einfrieren, damit die neue Sperrschicht keine stillen Vertragsbrueche erzeugt

- [x] 4.2 Expertenlogin-UX entwerfen
  - [x] 4.2.1 Kompakten Einstiegspunkt fuer den Expertenpfad festlegen, bevorzugt im bisherigen Meta-Slot statt als neue grosse Hauptaktion
  - [x] 4.2.2 Passwortdialog mit Maskierung, Fehlerzustand, Cancel und Logout definieren; Passwort-Contract ist fest auf `1307`

- [x] 4.3 Auth-State und Runtime-Schnittstelle einfuehren
  - [x] 4.3.1 Session-lokalen Expertenstatus modellieren (`locked`, `unlocked`, `error`, optional `lastAttemptAt`) und sauber in bestehende Local-UI-State-Strukturen einhaengen
  - [x] 4.3.2 Eigenes kleines Runtime-Modul fuer `unlock/lock/isUnlocked` einfuehren, statt die Logik in `UIManager` oder `GameRuntimeFacade` zu vermischen

- [x] 4.4 Access-Policy und Navigation verdrahten
  - [x] 4.4.1 `MenuSchema`, `MenuAccessPolicy` und `MenuNavigationRuntime` so erweitern, dass Developer-/Debug-Panels zusaetzlich zum Owner-Check auch einen erfolgreichen Expertenlogin benoetigen
  - [x] 4.4.2 Bestehende Developer-Events und Training-Aktionen weiter ueber die bestehenden Policy-Grenzen laufen lassen; Expertenlogin ist additive Gate-Schicht, kein Ersatz fuer Owner-Policy

- [x] 4.5 Sichtbare Textreduktion in Ebene 1 und 2 umsetzen
  - [x] 4.5.1 Branding-Unterzeile, Session-Metatexte, Hilfekarte, sichtbaren Menuekontext und das Build-Badge aus dem sichtbaren Hauptkopf entfernen oder in SR-only/Debug verschieben
  - [x] 4.5.2 In Ebene 2 Hints, Eyebrow-Labels und Card-Beschreibungstexte entfernen; Karten behalten nur noch die primaeren Aktionsnamen

- [x] 4.6 Entfernen nach bestehender Menue-Logik angleichen
  - [x] 4.6.1 Reduktionslogik zentralisieren, damit die gleichen Textarten ueber Klassen/Utility-Regeln und nicht ueber einzelne Ad-hoc-Loeschungen verschwinden
  - [x] 4.6.2 `menu-context` und vergleichbare Statusausgaben fuer Accessibility erhalten, aber visuell konsistent mit der restlichen Entschlackung behandeln

- [x] 4.7 Expertenbereich neu andocken
  - [x] 4.7.1 Den bisherigen `Tools -> Developer oeffnen` Pfad in einen gesperrten Expertenzugang umwandeln oder nach erfolgreichem Login sichtbar machen
  - [x] 4.7.2 Build-Info final in `Debug / Info` oder einen expliziten Experten-Utility-Bereich verlagern, damit keine Funktion verloren geht

- [x] 4.8 Tests und Helper migrieren
  - [x] 4.8.1 `tests/helpers.js` um einen stabilen Expertenlogin-Helper erweitern, damit Core-, Stress- und Training-Tests den gesperrten Bereich reproduzierbar erreichen
  - [x] 4.8.2 Neue Regressionen fuer falsches Passwort, korrektes Passwort `1307`, Logout, versteckte Textfamilien und weiterhin funktionierende Developer-/Training-Flows ergaenzen

- [x] 4.9 Abschluss-Gate
  - [x] 4.9.1 Verifikation mit `npm run test:core`, `npm run test:stress` und gezielten `training-environment`-Re-Runs sowie Desktop-/Mobil-Screenshots abschliessen
  - [x] 4.9.2 `npm run docs:sync`, `npm run docs:check`, Doku-Freeze und bekannte Restrisiken dokumentieren

## Verifikationsplan

- Pflicht laut Test-Mapping:
  - `npm run test:core`
  - `npm run test:stress`
- Zusatztests wegen Expertenzugang:
  - gezielte Re-Runs fuer `tests/training-environment.spec.js`
  - falls notwendig gezielte `core.spec.js`- und `stress.spec.js`-Filter fuer Login-/Textreduktion
- Manuelle Verifikation:
  - Desktop: Level 1 und Level 2 ohne markierte Texte
  - Desktop: Expertenlogin mit `1307`, danach Developer/Debug erreichbar
  - Mobil: Expertenlogin nicht layout-zerstoerend, kein ungewollter Text-Rest im Hauptpfad

## Offene technische Hinweise

- Wenn das Passwort fest im Client liegt, muss in der Doku klar benannt werden, dass dies nur eine Bedien-Schranke ist.
- Falls `menu-context` visuell entfernt wird, sollte ein `sr-only`-Pfad geprueft werden, damit `aria-live`-Informationen nicht verloren gehen.
- Build-Info im Hauptkopf sollte nicht einfach geloescht werden, solange `Debug / Info` und Clipboard-Flow nicht als Ersatz gesichert sind.

## Abschlussverifikation

- `npm run test:core` PASS (`61 passed`, `1 skipped`)
- `npm run test:stress` PASS (`19 passed`)
- `npx playwright test tests/training-environment.spec.js` PASS (`9 passed`)
- Expertenlogin-Regressionen in `tests/core.spec.js` (`T20ia`, `T20ib`, `T20w`) im Voll-Run gruen
- Screenshots: `menu-v27-expert-unlocked-desktop.png`, `menu-v27-expert-mobile.png`
