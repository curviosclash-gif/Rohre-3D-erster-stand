# Fehlerbericht: V91 91.3.1 Contract-Testlauf mit `spawn EPERM` blockiert

## Aufgabe/Kontext

- Task: Recheck `V91 91.2.3` + Umsetzung `V91 91.3.1` (Runtime-Adapterzuschnitt).
- Ziel: neuen Contract-Testscope `tests/runtime-regressions.contract.test.mjs` ausfuehren.
- Datum: 2026-04-14 (Europe/Berlin)

## Fehlerbild

- `node --test tests/runtime-regressions.contract.test.mjs` startet nicht und endet sofort mit `Error: spawn EPERM`.
- Der Fehler kommt aus dem Node-Test-Runner (`node:internal/test_runner/runner`) beim Child-Process-Spawn.

## Reproduktion

1. `node --test tests/runtime-regressions.contract.test.mjs`
2. Ergebnis: Testdatei wird als fehlgeschlagen gemeldet, Ursache `spawn EPERM`.

## Betroffene Dateien/Komponenten

- `tests/runtime-regressions.contract.test.mjs`
- Node Test Runner (`node --test`)

## Bereits getestete Ansaetze

- Direkter isolierter Test-Run nur fuer die betroffene Contract-Datei.
- Ergebnis unveraendert: `spawn EPERM`.

## Aktueller Stand

- Status: Umgebung blockiert die Testausfuehrung.
- Wirkung: Non-`*.99`-Subphase bleibt fachlich dokumentiert/umgesetzt; Test-Run ist deferred bis eine Umgebung ohne Spawn-Restriktion verfuegbar ist.

## Naechster Schritt

- Den isolierten Testlauf in einer Umgebung ohne Child-Process-Spawn-Restriktion wiederholen und Ergebnis in den Gate-Nachweisen nachziehen.