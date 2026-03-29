# Feature Hunt Rocket Trail Targeting V40

## Ziel

- Hunt-Raketen sollen gegnerische Trail-Segmente als gueltiges Ziel annehmen koennen, wenn die MG-Zielsuche auf derselben Linie bereits einen Trail-Treffer erkennen wuerde.
- Trail-Treffer von Raketen sollen tier-abhaengig mehrere Segmente entfernen und ueber eine sichtbare Explosion rueckmelden.
- Hunt-Bots und Hunt-Bridge sollen fuer Raketen derselben Zielverfuegbarkeit folgen wie fuer MG, damit Trail-Ziele nicht nur im Human-Pfad funktionieren.

## Ist-Zustand

- `src/entities/systems/HuntCombatSystem.js` liefert mit `checkLockOn()` nur lebende Spieler und kennt keine Trail-Zielbeschreibung.
- `src/entities/systems/projectile/ProjectileSimulationOps.js` erwartet fuer Homing-Ziele aktuell `target.position` plus `target.alive`; Trail-Ziele passen nicht in diesen Vertrag.
- `src/hunt/mg/MGHitResolver.js` besitzt bereits die relevante Schusslinien-Logik fuer Spieler-vs-Trail-Priorisierung, diese ist aber nur fuer MG nutzbar.
- `src/hunt/DestructibleTrail.js` skaliert Rocket-Tiers derzeit nur ueber Schaden auf genau einem Segment (`1/2/3`), nicht ueber eine segmentweite Explosion.
- `src/hunt/HuntBotPolicy.js` und `src/entities/ai/HuntBridgePolicy.js` koppeln Rocket-Feuer an einen Gegner-Spieler, nicht an eine MG-aehnliche Trail-Zielsuche.

## Architektur-Entscheidung

- Reuse:
  - Bestehende Trail-Damage-Pfade in `src/hunt/DestructibleTrail.js`
  - Bestehende Rocket-Impact-VFX/SFX in `src/entities/runtime/EntityRuntimeAssembler.js`
  - Bestehende Trail-Registry/-Query in `src/entities/systems/trails/**`
- Neuer Baustein:
  - Shared Hunt-Target-Resolver, vorzugsweise als neues Modul `src/hunt/HuntTargetingOps.js`, damit MG, Rocket-Lock-On und Bot-Entscheidung dieselbe Zielquelle nutzen.
- Reuse-vs-New-File Entscheidung:
  - `MGHitResolver.js` soll nach der Extraktion nur noch MG-spezifischen Schaden/Feedback behalten.
  - Gemeinsame Zielsuche gehoert nicht in `ProjectileSimulationOps.js`, damit Homing-Physik und Zielwahl getrennt bleiben.

## Betroffene Dateien

- Neu: `src/hunt/HuntTargetingOps.js`
- `src/hunt/mg/MGHitResolver.js`
- `src/entities/systems/HuntCombatSystem.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/systems/projectile/ProjectileSimulationOps.js`
- `src/entities/systems/projectile/ProjectileHitResolver.js`
- `src/hunt/DestructibleTrail.js`
- `src/hunt/HuntConfig.js`
- `src/hunt/HuntBotPolicy.js`
- `src/entities/ai/HuntBridgePolicy.js`
- `src/entities/runtime/EntityRuntimeAssembler.js`
- `tests/physics-hunt.spec.js`
- `tests/physics-policy.spec.js`
- `docs/Umsetzungsplan.md`

## Risiken

- Risiko: mittel
- Hauptgrund:
  - Trail-Targets koennen durch Ringpuffer-Ueberschreiben oder sofortige Zerstoerung stale werden.
  - Ein gemeinsamer Resolver darf MG-Verhalten nicht unbeabsichtigt veraendern.
  - Mehrsegment-Explosionen duerfen weder Self-Trail-Schutz noch Trail-Mesh-/Spatial-Index-Konsistenz brechen.
- Mitigation:
  - Trail-Zielvertrag ueber expliziten Descriptor (`kind`, `playerIndex`, `segmentIdx`, `point`) statt nackten Segment-Refs.
  - Reacquire/Invalidate pro Tick fuer Raketen statt blinder Dauerreferenz.
  - Regressionen fuer MG-Priorisierung und echte `ownerTrail`-Segmente beibehalten/erweitern.

- [ ] 40.1 Gemeinsame Hunt-Zielsuche fuer MG und Raketen
  - [ ] 40.1.1 MG-Spieler-/Trail-Priorisierung aus `src/hunt/mg/MGHitResolver.js` in einen shared Resolver ueberfuehren, der explizite Ziel-Deskriptoren fuer `player` oder `trail` liefert
  - [ ] 40.1.2 `src/entities/systems/HuntCombatSystem.js` und `src/entities/systems/ProjectileSystem.js` auf den neuen Zielvertrag umstellen, inklusive Cache-/Invalidate-Regeln fuer Trail-Ziele
  - Verifikation:
    - `npm run test:physics:hunt`
    - Fokus auf bestehende MG-Regressionen `T61`, `T64`, `T83`, `T86` plus neue Rocket-Lock-On-Checks

- [ ] 40.2 Trail-Explosionen mit tier-abhaengigem Segment-Abtrag
  - [ ] 40.2.1 `src/hunt/DestructibleTrail.js` um einen Rocket-Explosion-Pfad erweitern, der vom Einschlagsegment aus je nach Tier konfigurierbar benachbarte Segmente des `ownerTrail` mit entfernt
  - [ ] 40.2.2 `src/hunt/HuntConfig.js`, `src/entities/systems/projectile/ProjectileHitResolver.js` und `src/entities/runtime/EntityRuntimeAssembler.js` fuer tier-spezifische Blast-Parameter, Explosion-VFX und saubere Audio-/Feedback-Signale verdrahten
  - Verifikation:
    - `npm run test:physics:hunt`
    - `npm run smoke:selftrail`
    - Neue Regressionen fuer `weak/medium/strong` mit unterschiedlicher Segmentanzahl und Visual-Cleanup

- [ ] 40.3 Hunt-Bot- und Bridge-Logik auf Rocket-Trail-Ziele angleichen
  - [ ] 40.3.1 `src/hunt/HuntBotPolicy.js` auf shared Target-Availability umstellen, damit Rocket-Schuesse auch bei gueltigem Trail-Ziel ohne direkten Spieler-Lock ausgelost werden koennen
  - [ ] 40.3.2 `src/entities/ai/HuntBridgePolicy.js` an denselben Entscheidungsvertrag anbinden und Guards fuer Self-Trail-Vermeidung, stale Trail-Ziele und Player-Fallback einbauen
  - Verifikation:
    - `npm run test:physics:policy`
    - `npm run test:physics:hunt`
    - Neue Bot-/Bridge-Szenarien: Trail vor Spieler, Spieler off-axis, Self-Trail weiterhin gesperrt

- [ ] 40.9 Abschluss-Gate
  - [ ] 40.9.1 `npm run test:core`, `npm run test:physics`, `npm run smoke:selftrail` und `npm run build` gruen bestaetigen
  - [ ] 40.9.2 `npm run docs:sync` und `npm run docs:check` ausfuehren, Doku-Freeze setzen und Einsortierung aus dem Plan-Eingang spaeter separat planen

## Dokumentationswirkung

- Neuer Detailplan in `docs/plaene/alt/Feature_Hunt_Rocket_Trail_Targeting_V40.md`
- Neuer Eintrag im `Plan-Eingang` von `docs/Umsetzungsplan.md`
- Datei-Ownership im Masterplan bleibt fuer diesen Planungsschritt bewusst unveraendert, weil neue Plaene laut append-only-Regel zuerst im Eingang gesammelt und spaeter in einem separaten Cleanup in Hauptbloecke ueberfuehrt werden

## Freshness-Hinweis

Vor Abschluss der spaeteren Implementierung immer:

- `npm run docs:sync`
- `npm run docs:check`

