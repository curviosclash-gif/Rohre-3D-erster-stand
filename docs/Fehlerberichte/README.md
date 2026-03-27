# Fehlerberichte

Dieser Ordner enthaelt task-spezifische Fehlerberichte fuer Umsetzungsprobleme, Blocker, unerwartete Regressionen und hartnaeckige Debugging-Faelle.

## Pflichtfall

Erstelle oder aktualisiere einen Bericht, wenn beim Umsetzen einer Aufgabe mindestens einer dieser Punkte eintritt:

- die Aufgabe ist blockiert
- ein Fehler bleibt nach mehreren zielgerichteten Versuchen offen
- eine Aenderung erzeugt eine neue Regression
- die Aufgabe wird mit offenem technischem Restproblem uebergeben oder beendet

## Dateiname

Nutze nach Moeglichkeit dieses Schema:

`YYYY-MM-DD_<bereich>_<kurztitel>.md`

Beispiel:

`2026-03-27_bot-validation_runner-timeout.md`

## Mindestinhalt

Jeder Bericht soll diese Abschnitte enthalten:

1. Aufgabe/Kontext
2. Fehlerbild
3. Reproduktion
4. Betroffene Dateien/Komponenten
5. Bereits getestete Ansaetze
6. Aktueller Stand
7. Naechster Schritt

## Vorlage

Nutze fuer neue Berichte bevorzugt [FEHLERBERICHT_TEMPLATE.md](./FEHLERBERICHT_TEMPLATE.md).
