# Map Tools Editor Push durch bestehende Max-Lines-Fehler blockiert

Datum: 2026-05-31

## Kontext

Der freigegebene Desktop-Map-Tools-Slice wurde als Commit `1043119e`
abgeschlossen. Der anschliessende Push auf `origin/main` wurde vom lokalen
`.husky/pre-push`-Hook gestoppt.

## Reproduktion

```powershell
npm run snapshot:tag
git push origin main
```

Der Hook fuehrt nach erfolgreichen Plan- und Docs-Gates
`npm run lint:architecture` aus.

## Befund

`lint:architecture` meldet zwei bestehende, scope-fremde `max-lines`-Fehler:

- `src/mobile-classic/MobileClassicApp.js`: 1276 Zeilen bei Maximum 1180
- `src/ui/TouchInputSource.js`: 1050 Zeilen bei Maximum 847

Der Map-Tools-Editor-Slice veraendert keine dieser Dateien:

```powershell
git diff HEAD~1 -- src/mobile-classic/MobileClassicApp.js src/ui/TouchInputSource.js
```

Ergebnis: keine Ausgabe.

## Status

- Map-Tools-Contract, Electron-Smoke, Graph-Build/-Check und
  `npm run gates:pre-commit` sind fuer den Editor-Slice gruen.
- Recovery-Tag vor dem fehlgeschlagenen Push:
  `snapshot/main-20260531-142038-1043119`
- Push bleibt offen, bis der User entweder die lokale `.husky/.bypass`-Ausnahme
  fuer diesen scope-fremden Hook-Blocker freigibt oder die beiden Altlasten in
  einem separaten Refactor-Scope behoben werden.
