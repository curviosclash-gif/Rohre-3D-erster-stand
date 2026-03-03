# Analysebericht (Delta)

Vergleichsbasis: Bericht vom 2026-02-27.
Aktueller Stand: 2026-03-03.
Nachvalidierung: 2026-03-03 (`npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"`, `npm run test:physics`, `npm run test:core`, `npm run build`).

## Neue Issues / Warnungen

- Keine neuen offenen Warnungen nach dem aktuellen Nachvalidierungs-Lauf.

## Regressionen

- Keine aktive SelfTrail-Regression mehr im aktuellen Lauf (Smoke PASS, `failures: []`).
- Behoben: Hunt-MG priorisierte Off-Axis Gegner per Dot-Kegel und verfehlte dadurch gegnerische Spursegmente auf der Schusslinie.
- Behoben: Hunt-MG konnte bei ueberlappender Schusslinie eigene Spur vor gegnerischer Spur waehlen.
- Behoben: Trail-Kollision konnte bei grossen Frame-Schritten gegnerische Spur zwischen Frames ueberspringen.
- Behoben: Player-Hitbox konnte nach Vehicle-Load als leere Box enden; dadurch fielen OBB-basierte Trail-Treffer (insb. gegnerische Spur) aus.
- Behoben: MG-Trail-Treffer konnte Segment nur ankratzen statt sicher entfernen.
- Behoben: Nach Treffer auf Trail eines toten Gegners konnte Visual stehen bleiben, obwohl Kollision bereits entfernt war.

## Erledigt / Behoben Seit 2026-02-27

- Nachvalidiert: `smoke:selftrail` ist am 2026-02-28 erfolgreich durchgelaufen (drone/manta/aircraft, keine Failures).
- Aktualisiert: Verifikationslage zwischen Analysebericht, Umsetzungsplan und aktuellem Smoke-Stand konsistent gemacht.
- Behoben: Hunt-Input-Regressionspfad fuer Human-Player (MG/Item-Schuss) ist wieder aktiv; `SHOOT_MG` wird in Binding- und Runtime-Controls korrekt gefuehrt.
- Behoben: Hunt-MG nutzt fuer Spielerziele wieder eine physische Ray-vs-Hitbox-Pruefung; gegnerische Spur kann auf Schusslinie wieder zerstoert werden.
- Abgesichert: Neuer Physik-Regressionstest `T64` in `tests/physics.spec.js` deckt den Off-Axis-Fall explizit ab.
- Behoben: Hunt-MG priorisiert bei Trail-Overlap gegnerische Spur vor eigener Spur (eigene Spur bleibt Fallback).
- Abgesichert: Neuer Physik-Regressionstest `T83` in `tests/physics.spec.js` deckt den Overlap-Fall explizit ab.
- Behoben: PlayerLifecycle nutzt Sweep-Trail-Kollisionscheck als Fallback, damit gegnerische Spur auch bei grossen Delta-Zeiten zuverlaessig triggert.
- Abgesichert: Neuer Physik-Regressionstest `T84` in `tests/physics.spec.js` deckt den Tunnel-Fall explizit ab.
- Behoben: `Player._createModel()` setzt bei invalider/leerer Vehicle-Hitbox eine gueltige Radius-Fallback-OBB; Trail-Kollision greift damit wieder robust.
- Abgesichert: Neuer Physik-Regressionstest `T85` in `tests/physics.spec.js` deckt gegnerische Trail-Kollision bei kleinen Frame-Schritten (Offset-Fall) ab.
- Behoben: `OverheatGunSystem._applyTrailHit` erzwingt fuer MG standardmaessig `destroy-on-hit` (abschaltbar ueber `HUNT.MG.DESTROY_TRAIL_ON_HIT=false`).
- Abgesichert: Neuer Physik-Regressionstest `T86` in `tests/physics.spec.js` prueft echte `ownerTrail`-Segmente (nicht nur Dummy-Registrierung).
- Behoben: `Trail.destroySegmentByEntry` markiert InstancedMesh-Matrix sofort fuer GPU-Update, damit entfernte Segmente auch ohne Owner-Update-Frame verschwinden.
- Abgesichert: Neuer Physik-Regressionstest `T87` in `tests/physics.spec.js` deckt den toter-Gegner-Visualfall ab.
