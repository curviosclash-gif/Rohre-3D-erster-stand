# Analysebericht (Delta)

Vergleichsbasis: Bericht vom 2026-02-27.
Aktueller Stand: 2026-03-03.
Nachvalidierung: 2026-03-03 (`npx playwright test tests/physics.spec.js -g "T61|T63|T64"`, `npm run test:core`, `npm run build`).

## Neue Issues / Warnungen

- Keine neuen offenen Warnungen nach dem aktuellen Nachvalidierungs-Lauf.

## Regressionen

- Keine aktive SelfTrail-Regression mehr im aktuellen Lauf (Smoke PASS, `failures: []`).
- Behoben: Hunt-MG priorisierte Off-Axis Gegner per Dot-Kegel und verfehlte dadurch gegnerische Spursegmente auf der Schusslinie.

## Erledigt / Behoben Seit 2026-02-27

- Nachvalidiert: `smoke:selftrail` ist am 2026-02-28 erfolgreich durchgelaufen (drone/manta/aircraft, keine Failures).
- Aktualisiert: Verifikationslage zwischen Analysebericht, Umsetzungsplan und aktuellem Smoke-Stand konsistent gemacht.
- Behoben: Hunt-Input-Regressionspfad fuer Human-Player (MG/Item-Schuss) ist wieder aktiv; `SHOOT_MG` wird in Binding- und Runtime-Controls korrekt gefuehrt.
- Behoben: Hunt-MG nutzt fuer Spielerziele wieder eine physische Ray-vs-Hitbox-Pruefung; gegnerische Spur kann auf Schusslinie wieder zerstoert werden.
- Abgesichert: Neuer Physik-Regressionstest `T64` in `tests/physics.spec.js` deckt den Off-Axis-Fall explizit ab.
