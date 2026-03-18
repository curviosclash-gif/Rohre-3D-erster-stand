# Next Agent Prompt: Menu Entschlackung V27b/V27c

Arbeite im Projekt `c:\Users\gunda\Desktop\CurviosCLash` weiter.

Wichtig: Fuehre die Umsetzung end-to-end aus. Nicht bei der Planung stehenbleiben. Erst revalidieren, dann den kompletten Plan umsetzen.

## Auftrag

Fuehre die Plaene

- `docs/Feature_Menu_Entschlackung_V27b.md`
- `docs/Feature_Menu_Expertenlogin_Textreduktion_V27c.md`

vollstaendig um.

## Ziele

1. Das Menue im normalen Spielerpfad deutlich entschlacken, ohne Funktionen zu verlieren.
2. Developer, Debug und Training aus dem normalen Menuepfad herausnehmen.
3. Einen expliziten Expertenlogin einfuehren.
4. Das Passwort fuer den Expertenlogin fest auf `1307` setzen.
5. Die gelb markierten sichtbaren Texte aus den Screenshots entfernen.
6. Die Textentfernung soll der bestehenden Entfernungs-/Reduktionslogik des restlichen Menues folgen: Hauptlabels bleiben, Zweitcopy verschwindet.

## Verbindliche fachliche Klarstellung

Der Expertenlogin ist ein lokales UI-Gate in einer Client-Anwendung.

Das bedeutet:

1. `1307` ist eine bewusste Bedien-Schranke, keine echte sichere Authentifizierung.
2. Der normale Spielstart darf dadurch keinen zusaetzlichen Schritt bekommen.
3. Build-Info, Debug und Training duerfen nicht verloren gehen, sondern muessen in den Expertenpfad verschoben oder dort erhalten bleiben.

## Zu entfernende sichtbare Textfamilien

Die markierten Texte sind nicht einzeln, sondern systematisch zu reduzieren.

Entfernen oder aus dem sichtbaren Hauptpfad herausziehen:

1. `subtitle`
2. `build-info` im sichtbaren Hauptkopf
3. `nav-btn-meta`
4. `nav-help-card`
5. sichtbarer `menu-context`
6. erklaerende `menu-hint`-Texte im normalen Hauptpfad
7. `menu-choice-eyebrow`
8. `menu-choice-copy`
9. rein erklaerende `menu-accordion-copy`, sofern sie keine Pflichtinformation tragen

Nicht verlieren:

1. Accessibility-relevante Statusinfos
2. Build-Info im Debug-/Expertenbereich
3. funktionale Hinweise, falls sie fuer Validation oder Fehlerzustaende gebraucht werden

## Expertenbereich

Nach der Umsetzung soll gelten:

1. Developer-/Debug-/Training-Zugaenge sind ohne Expertenlogin nicht sichtbar oder nicht oeffenbar.
2. Nach korrektem Passwort `1307` wird der Expertenbereich fuer die aktuelle Sitzung freigeschaltet.
3. Es gibt einen klaren `Logout`/`Sperren`-Pfad.
4. Nach Reload ist der Bereich wieder gesperrt.
5. Bestehende Owner-/Release-Policies bleiben erhalten; der Login ist nur eine additive Schicht.

## Startblock

1. `AGENTS.md` und relevante `.agents` Regeln/Workflows lesen.
2. Nur lesend revalidieren:
   - `git status --short`
   - `git diff --name-status`
   - `git log --oneline -n 10`
3. Diese Dokumente lesen:
   - `docs/Feature_Menu_Entschlackung_V27b.md`
   - `docs/Feature_Menu_Expertenlogin_Textreduktion_V27c.md`
   - `docs/Umsetzungsplan.md`
   - `docs/NEXT_AGENT_PROMPT_Menu_Entschlackung_V27c.md`
4. Diese Codepfade revalidieren:
   - `index.html`
   - `style.css`
   - `src/core/GameBootstrap.js`
   - `src/core/BuildInfoController.js`
   - `src/ui/UIManager.js`
   - `src/ui/menu/MenuSchema.js`
   - `src/ui/menu/MenuNavigationRuntime.js`
   - `src/ui/menu/MenuAccessPolicy.js`
   - `src/ui/menu/MenuDeveloperStateSync.js`
   - `tests/helpers.js`
   - `tests/core.spec.js`
   - `tests/stress.spec.js`
   - `tests/training-environment.spec.js`
5. UI real revalidieren:
   - Desktop
   - Mobil
   - Level 1
   - Level 2
   - Developer-Zugang heute

## Erwartete Befunde vor Implementierung

1. Der normale Menuepfad ist textlastig in Ebene 1 und 2.
2. Build-Info und Context sind im sichtbaren Hauptkopf praesent.
3. Developer liegt aktuell noch direkt im Menuefluss.
4. Tests greifen derzeit direkt oder indirekt auf den Developer-Bereich zu.
5. Access-Policy kennt Owner-/Release-Grenzen, aber noch kein Passwort-Gate.

## Verbindliche Umsetzungsreihenfolge

1. Text-/Element-Inventur und Contract-Freeze fuer alle sichtbaren Copy-Arten und Expertenzugriffe.
2. Expertenlogin-UX und session-lokalen Auth-State einfuehren.
3. Zugang zu Developer/Debug/Training ueber additive Login-Gate-Schicht sperren.
4. Sichtbare Textreduktion in Ebene 1 und 2 umsetzen.
5. Build-Info aus dem sichtbaren Hauptkopf entfernen und in den Experten-/Debug-Pfad verlagern.
6. Bestehende Redirect-/Utility-Pfade auf die neue Entschlackung anpassen.
7. Tests/Helper auf den gesperrten Expertenpfad migrieren.
8. Desktop-/Mobil-Check, dann Abschluss-Gates.

## Umsetzungsregeln

1. Keine neue parallele Menuearchitektur bauen.
2. Bestehende IDs, Events und Training-Vertraege nur aendern, wenn unbedingt noetig.
3. Passwortlogik nicht in einen Monolithen kippen; wenn sinnvoll, eigenes kleines Runtime-Modul anfuehren.
4. `1307` fest und explizit verdrahten.
5. `menu-context` nicht stumpf loeschen, wenn dadurch `aria-live`-Signale verloren gehen; notfalls visuell ausblenden und accessibility-kompatibel erhalten.
6. Build-Info-Clipboard-Funktion erhalten.
7. Entferne Copy konsistent ueber Klassen/Struktur, nicht nur ueber einzelne Textstrings.
8. Der normale Startpfad muss nach der Entschlackung schneller und klarer wirken als vorher.

## Bevorzugte Dateien dieser Lane

1. `index.html`
2. `style.css`
3. `src/core/GameBootstrap.js`
4. `src/core/BuildInfoController.js`
5. `src/ui/UIManager.js`
6. `src/ui/menu/MenuSchema.js`
7. `src/ui/menu/MenuNavigationRuntime.js`
8. `src/ui/menu/MenuAccessPolicy.js`
9. optional neues Modul `src/ui/menu/MenuExpertLoginRuntime.js`
10. `tests/helpers.js`
11. `tests/core.spec.js`
12. `tests/stress.spec.js`
13. `tests/training-environment.spec.js`

## Mindest-Verifikation

Pflicht:

1. `npm run test:core`
2. `npm run test:stress`
3. `npm run docs:sync`
4. `npm run docs:check`

Zusatz wegen Expertenzugang:

1. gezielte Re-Runs fuer `tests/training-environment.spec.js`
2. neue oder angepasste Tests fuer:
   - falsches Passwort
   - korrektes Passwort `1307`
   - Logout / erneute Sperre
   - Developer erst nach Login sichtbar/erreichbar
   - gelb markierte sichtbare Texte in Level 1 und 2 entfernt

Manuelle Verifikation:

1. Desktop-Screenshot Level 1 ohne Zweitcopy
2. Desktop-Screenshot Level 2 ohne Eyebrows/Beschreibungscopy
3. Mobil-Screenshot desselben Zustands
4. Expertenlogin-Flow mit erfolgreicher Freischaltung

## Bekannte Stolpersteine

1. `tests/core.spec.js` prueft aktuell sichtbaren Build-/Context-Bereich mit.
2. `tests/helpers.js` oeffnet Developer derzeit direkt ueber den Menuepfad.
3. `tests/training-environment.spec.js` haengt funktional am Developer-Zugang.
4. Bestehende Training-/Stress-Flakes nicht mit neuen Fehlern verwechseln; sauber isolieren.

## Abschlussformat

Die finale Ausgabe soll enthalten:

1. Welche Dateien geaendert wurden
2. Wie der Expertenlogin mit Passwort `1307` implementiert wurde
3. Welche sichtbaren Textfamilien entfernt oder verlagert wurden
4. Wo Build-Info, Debug und Training jetzt liegen
5. Welche Tests neu/angepasst wurden
6. Exakte Verifikation mit PASS/FAIL
7. Offene Restrisiken, falls etwas bewusst spaeter bleiben musste
