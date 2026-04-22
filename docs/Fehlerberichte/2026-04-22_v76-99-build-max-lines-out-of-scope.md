# Fehlerbericht: V76 76.99 Build-Gate durch Max-Lines ausserhalb Scope blockiert

- Datum: 2026-04-22
- Block: V76
- Phase: 76.99.1
- Status: offen

## Task-Kontext
Im Rahmen von V76 wurden die Subphasen 76.3 bis 76.7 umgesetzt. Fuer 76.99.1 sollte das Abschluss-Gate (`npm run build`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`) gruen laufen.

## Fehlerbild
`npm run build` bricht im `prebuild`-Schritt (`npm run architecture:guard` -> `npm run lint:architecture`) mit `max-lines`-Verstoessen ab.

## Reproduktion
1. `npm run build`
2. Build laeuft in `prebuild` auf `npm run lint:architecture`
3. ESLint meldet `max-lines`-Fehler

## Betroffene Dateien
- `src/shared/contracts/BrowserDemoSurfacePolicyOverrideContract.js`
- `src/shared/contracts/PlatformCapabilityRegistry.js`

## Bereits durchgefuehrte Schritte
- Gate-Kette lokal ausgefuehrt: `npm run build; npm run plan:check; npm run docs:sync; npm run docs:check`
- `plan:check`, `docs:sync`, `docs:check` sind gruen
- Build-Fehler reproduzierbar und ausserhalb V76-Implementierungsscope

## Aktueller Status
- V76 ist bis Phase 76.7 umgesetzt
- 76.99.1 bleibt offen, da `npm run build` aktuell nicht gruen ist

## Naechster Schritt
Max-Lines-Verstoesse in den beiden genannten Contract-Dateien separat beheben oder in einem dedizierten Block/Scope freigeben; danach 76.99.1 erneut ausfuehren.
