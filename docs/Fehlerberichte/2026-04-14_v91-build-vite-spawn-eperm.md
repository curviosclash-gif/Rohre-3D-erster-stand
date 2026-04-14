# Fehlerbericht: V91 91.1.1 Build-Gate blockiert durch `spawn EPERM`

## Aufgabe/Kontext

- Task: Recheck letzte Subphase `V77` + Umsetzung `V91 91.1.1` (Legacy-Surface-Inventar).
- Ziel: Pflicht-Gates fuer den Subphasenabschluss inklusive `npm run build`.
- Datum: 2026-04-14 (Europe/Berlin)

## Fehlerbild

- `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` laufen gruensicher.
- `npm run build` bricht beim Laden von `vite.config.js` mit `Error: spawn EPERM` ab.
- Abbruchstelle liegt im `esbuild`-Spawn (`node_modules/esbuild/lib/main.js`) und nicht im geaenderten V91/V77-Dokumentationsscope.

## Reproduktion

1. `npm run build`
2. `prebuild` startet `npm run architecture:guard` und alle Subchecks laufen durch.
3. `vite build` endet mit:
   - `failed to load config from C:\\Users\\gunda\\Desktop\\CurviosCLash\\vite.config.js`
   - `error during build: Error: spawn EPERM`

## Betroffene Dateien/Komponenten

- `vite.config.js` (Config-Ladepfad beim Buildstart)
- `node_modules/esbuild/lib/main.js` (Child-Process-Spawn)
- Build-Entry `npm run build`

## Bereits getestete Ansaetze

- Vollstaendige Gate-Reihenfolge vor Build (`plan:check -> docs:sync -> docs:check -> build`).
- `npm run guard:main` im selben Lauf erfolgreich (`git:acl:heal` entfernte Deny-Regeln).
- Ergebnis: Build bleibt in dieser Umgebung durch `spawn EPERM` blockiert.

## Aktueller Stand

- Status: Blockiert fuer den `build`-Gate in dieser Session.
- Root-Cause-Stand: Umgebungsnaher Spawn-Fehler (Vite/esbuild), kein direkter Hinweis auf eine fachliche Regression im geaenderten Scope.

## Naechster Schritt

- Build in einer Umgebung ohne Spawn-Restriktion erneut ausfuehren (oder Runtime/Policy-Ursache fuer `cmd.exe`/Child-Spawn isolieren), danach Gate-Nachweis aktualisieren.

## Verifikation-Nachtrag 2026-04-14 (`V91 91.5.1`)

- Reproduktion erneut bestaetigt: `npm run build` scheitert weiterhin mit `Error: spawn EPERM` beim `vite build`-Start (`failed to load config from .../vite.config.js`).
- Architektur-Guard, `plan:check`, `docs:sync` und `docs:check` laufen weiterhin gruensicher; der Blocker bleibt damit umgebungsnah und unabhaengig vom aktualisierten Doku-/Contract-Scope.
