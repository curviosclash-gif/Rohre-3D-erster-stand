Original prompt: bitte überprüfe den jagdmodus es funktioniert fast nichts

2026-03-02
- Skill `develop-web-game` aktiv für reproduzierbare Spielmodus-Diagnose.
- `.agents` Regeln/Workflows geladen (bugfix, test_mapping, reporting).
- `progress.md` neu erstellt.
- Hunt-Bug reproduziert im Browser: Human-Schuss in Hunt feuert nicht (shootCooldown bleibt 0 bei KeyF/KeyG).
- Laufzeit-Bindings zeigen `SHOOT_MG` fehlt nach `InputManager.setBindings`.
- Geplante Fixes: `InputManager` Action-Keys erweitern + Hunt-Schuss-Fallback im `PlayerLifecycleSystem` stabilisieren.
- Fix umgesetzt:
  - `src/core/InputManager.js`: `SHOOT_MG` in generischer Action-Liste integriert.
  - `src/core/RuntimeConfig.js`: `SHOOT_MG` in Runtime-Controls fuer P1/P2 uebernommen.
  - `src/entities/systems/PlayerInputSystem.js`: bei `shootItem` wird in Hunt der aktuelle `selectedItemIndex` gesetzt.
  - `src/entities/systems/PlayerLifecycleSystem.js`: Hunt-MG-Fallback bei `shootItem` ohne gueltigen Item-Index; deduplizierter `shootMG`-Pfad.
  - `src/core/config/ConfigSections.js`: Default-Keys fuer `SHOOT_MG` auf `KeyF`/`KeyJ` (ohne Konflikt mit `DROP`).
- Verifikation:
  - Playwright Runtime-Checks: Hunt-Schuss setzt `shootCooldown`/Overheat; Raketen-Schuss aus Inventory funktioniert.
  - `npm run test:core` PASS
  - `npm run test:physics` PASS
  - `npm run test:stress` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Abschlussstatus: Hunt-Schusspfad fuer Human-Player repariert und per Tests validiert.
- Offene TODO-Empfehlung fuer naechsten Agenten: dedizierte Hunt-Controls UX pruefen (ob `SHOOT_MG` standardmaessig separat belegt werden soll).
2026-03-02 (Follow-up auf Nutzerfeedback)
- Debug/FPS Overlay Hotkey von `F` auf `O` umgestellt (inkl. UI-Hinweise).
- Hunt-Input entkoppelt:
  - `SHOOT` bleibt Item/Rakete.
  - `SHOOT_MG` ist eigene Taste (default getrennt) und bleibt im Keybind-Editor konfigurierbar.
- MG-Feedback verbessert: sichtbare Tracer-Streifen pro Schuss (kurze Fade-TTL).
- Hunt-HUD erweitert: Leben/Schild/Boost zusaetzlich in eigenen Farbbalken.
- Tests erfolgreich (sequentiell): `test:core`, `test:physics`, `test:stress`.
- Doku-Gates: `docs:sync` und `docs:check` erfolgreich (mojibake-Hinweis bleibt unveraendert bei 1).
2026-03-02 (Jagd-Modus: Spursegment per MG wegschiessen)
- Wunsch umgesetzt: MG-Treffer koennen jetzt Spursegmente im Hunt-Modus direkt zerstoeren.
- src/hunt/OverheatGunSystem.js erweitert:
  - Hitscan bewertet jetzt naechsten Treffer zwischen Spieler und Trail.
  - Trail-Trefferpfad fuegt Segment-Schaden hinzu und entfernt Segment sofort (default: volle Segment-HP als MG-Schaden).
  - tryFire liefert zusaetzlich trailHit-Flag fuer Verifikation.
- Regressionstest hinzugefuegt:
  - tests/physics.spec.js -> T61: Hunt-MG entfernt getroffenes Spursegment sofort.
- Verifikation:
  - npm run build PASS
  - npm run test:physics PASS (inkl. T61)
  - npm run test:core PASS
  - npm run docs:sync PASS (updated=0, mojibake=1)
  - npm run docs:check PASS (updated=0, mojibake=1)
- Skill-Hinweis:
  - develop-web-game Client-Skript aus Skill-Pfad konnte lokal nicht direkt laufen (playwright package resolution am Skill-Pfad fehlend); daher Verifikation ueber vorhandene Projekt-Playwright-Suite.

2026-03-02 (Follow-up: groessere MG-Kugeln) 
- MG-Visuals im Hunt-Modus deutlich vergroessert: Tracer jetzt mit dickerem Beam + grosser End-Kugel (TRACER_BEAM_RADIUS / TRACER_BULLET_RADIUS). 
- Verifikation: npx playwright test tests/physics.spec.js -g T61 PASS, npm run test:core PASS, npm run build PASS, docs:sync/check PASS.


2026-03-02 (Follow-up: groessere Raketen + Zielsuche + Segment-Hit einfacher) 
- HuntConfig erweitert: ROCKET-Tuning (groessere Visual-Skalen, groessere Kollisionsradius-Multiplikation, staerkere Homing-Werte inkl. Reacquire/Range).
- MG-Trail-Treffen erleichtert ueber Defaults in HUNT.MG (TRAIL_HIT_RADIUS=0.78, TRAIL_SAMPLE_STEP=0.45).
- ProjectileSystem erweitert: Hunt-Raketen werden sichtbar groesser skaliert, erhalten vergroesserten Hit-Radius und robustes Homing mit periodischem Reacquire/Fallback auf naechstes Ziel.
- Neuer Test T62 in tests/physics.spec.js prueft groessere Hunt-Rakete + Zielsuche.
- Verifikation: npx playwright test tests/physics.spec.js -g T62 PASS; npm run test:physics PASS; npm run test:core PASS; npm run build PASS; docs:sync/check PASS.


2026-03-03 (Follow-up: Gegner-Trail vs eigener Trail bei MG)
- Nutzerfeedback: In Jagd wirkte MG-Trail-Zielsuche bei gegnerischem Trail unzuverlaessig.
- Ursache im Trefferpfad: _resolveTrailHit konnte bei ueberlappenden Segmenten zuerst eigene Spur als Hit nehmen und damit gegnerische Spur wegpriorisieren.
- Fix in src/hunt/OverheatGunSystem.js:
  - Gegnerische Spur wird bei Trail-Overlap priorisiert.
  - Eigene Spur bleibt als Fallback zerstoerbar, falls keine gegnerische Spur auf der Schusslinie liegt.
- Regressionstest hinzugefuegt:
  - tests/physics.spec.js -> T83: Hunt-MG priorisiert gegnerische Spur vor eigener Spur auf Schusslinie.
- Verifikation:
  - npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83" PASS
  - npm run test:core PASS
  - npm run build PASS

2026-03-03 (Follow-up: gegnerische Trail-Kollision beim Durchflug)
- Nutzerfeedback: Gegnerische Spur-Kollision fuehlte sich ausfallend an; mehrfaches Durchfliegen ohne Treffer.
- Reproduktion abgesichert mit neuem Test T84: grosser Frame-Schritt (dt=0.55) konnte Trail zwischen Frames ueberspringen.
- Fix in src/entities/systems/PlayerLifecycleSystem.js:
  - neuer Sweep-Fallback fuer Trail-Kollision entlang des Wegs zwischen `prevPos` und aktueller Position.
  - direkter praeziser OBB-Check bleibt bestehen; Sweep greift nur, wenn der direkte Check nichts findet.
- Zusaetzliche Stabilisierung in src/hunt/OverheatGunSystem.js:
  - dichte Feinsuche nach gegnerischer Spur, wenn initial nur eigene Spur gefunden wurde.
- Regressionstest hinzugefuegt:
  - tests/physics.spec.js -> T84: Hunt-Trail-Kollision trifft gegnerische Spur auch bei grossem Frame-Schritt.
- Verifikation:
  - npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84" PASS
  - npm run test:physics PASS (44/44)
  - npm run test:core PASS
  - npm run build PASS

2026-03-03 (Follow-up: gleiche Enemy-Trail-Logik wie Self-Trail)
- Nutzerfeedback: Eigene Spur funktioniert, gegnerische Spur nicht stabil.
- Root Cause verifiziert: `player.hitboxBox` konnte nach Vehicle-Load leer sein (`isEmpty=true`), dadurch schlug `isSphereInOBB` immer fehl und OBB-basierte Trail-Treffer wurden verworfen.
- Fix in `src/entities/Player.js`:
  - Fallback-Hitbox fuer invalide/leere Mesh-Boxes in `_createModel()->updateBox` eingebaut.
- Zusaetzlich verbessert:
  - `src/entities/systems/TrailSpatialIndex.js`: OBB-Check verwendet jetzt konsistenten effektiven Radius (`segment + queryRadius`).
  - `src/hunt/OverheatGunSystem.js`: Enemy-Trail wird pro Sample explizit vor eigener Spur gesucht (self nur Fallback).
- Regressionstest hinzugefuegt:
  - `tests/physics.spec.js` -> `T85: Hunt-Trail-Kollision trifft gegnerische Spur auch bei kleinen Frames (Enemy-Offset)`.
- Verifikation:
  - npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85" PASS
  - npm run test:physics PASS (45/45)
  - npm run test:core PASS
  - npm run build PASS

2026-03-03 (Follow-up: Treffer ja, aber Segment nicht sofort weg)
- Nutzerfeedback: Gegnerischer Trail wird getroffen, aber Segment bleibt stehen.
- Fix in `src/hunt/OverheatGunSystem.js`:
  - MG-Trail-Treffer erzwingt jetzt standardmaessig `destroy-on-hit`.
  - Optional abschaltbar ueber `HUNT.MG.DESTROY_TRAIL_ON_HIT=false`.
- Regressionstest hinzugefuegt:
  - `tests/physics.spec.js` -> `T86: Hunt-MG zerstoert gegnerisches echtes Trail-Segment (ownerTrail) sofort`.
- Verifikation:
  - npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86" PASS
  - npm run test:physics PASS (46/46)
  - npm run test:core PASS
  - npm run build PASS

2026-03-03 (Follow-up: Segment bleibt sichtbar, Kollision weg)
- Analyse bestaetigt: Segment konnte nach MG-Treffer im Grid entfernt sein, aber visuell bei totem Gegner noch stehen bleiben.
- Ursache: `Trail.destroySegmentByEntry` setzte `_dirty`, aber markierte `instanceMatrix.needsUpdate` nicht sofort.
- Fix in `src/entities/Trail.js`:
  - `destroySegmentByEntry` setzt jetzt zusaetzlich `this.mesh.instanceMatrix.needsUpdate = true`.
- Regressionstest hinzugefuegt:
  - `tests/physics.spec.js` -> `T87: Hunt-MG entfernt Trail-Visual auch bei totem Gegner sofort`.
- Verifikation:
  - npx playwright test tests/physics.spec.js -g "T86|T87" PASS
  - npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87" PASS
  - npm run test:physics PASS (46/46)
  - npm run test:core PASS
  - npm run build PASS

2026-03-06 (Branding-Rename auf CuviosClash)
- Sichtbares Branding aktualisiert:
  - `index.html` Titel + Menue-Headline auf `CuviosClash`.
  - `style.css` Kommentar, `package.json`/`package-lock.json` Paketname und `scripts/self-trail-debug-smoke.mjs` Projektprobe angepasst.
- Persistenz-Namespace migriert:
  - Neue Storage-Keys laufen unter `cuviosclash.*`.
  - Legacy-Fallback fuer den vorherigen Storage-Namespace bleibt lesbar und migriert beim Laden automatisch auf die neuen Keys.
- Tests/Doku:
  - Neuer Core-Test prueft Legacy-Migration des Settings-Keys.
  - `npm run test:core` PASS
  - `npm run test:stress` PASS
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Visuelle Verifikation:
  - Preview-Screenshot `tmp/cuviosclash-preview.png` zeigt den Menue-Header mit `CuviosClash`.

2026-03-06 (Branding-Rename Follow-up: Archiv, Tools, Startskripte)
- Weitere Rest-Renames umgesetzt:
  - Archivdoku auf `CuviosClash` gezogen (`docs/archive/*` relevante Projekt-/Titelstellen).
  - Editor- und Startskripte umbenannt (`editor/*.html`, `start_*.bat`, `server.ps1`, `auto-backup.ps1`).
  - Temp-Logs mit altem Paketnamen aus `tmp/` entfernt.
- Verifikation:
  - `npm run test:core` PASS
  - `npm run smoke:selftrail` PASS
  - `npm run build` PASS (im Smoke enthalten)
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - Preview-Check bestaetigt erneut `document.title = CuviosClash` und Menue-Header `CuviosClash`.
- Restrisiko / offener Punkt:
  - Der physische Ordner-Rename des Workspace auf Desktop wurde versucht, aber durch einen noch am aktiven Projektpfad haengenden Prozess blockiert; inhaltlich sind die Pfadreferenzen bereits auf `CuviosClash` aktualisiert.

2026-03-06 (Menu UX Follow-up V26.3c gestarteter No-Stop-Block)
- Skill `develop-web-game` aktiv; Ziel ist die vollstaendige Abarbeitung von `docs/Feature_Menu_UX_Followup_V26_3c.md` ohne Zwischenstopp.
- Workflow/Regeln geladen: `.agents/workflows/fix-planung.md`, `.agents/workflows/code.md`, `.agents/test_mapping.md`, relevante `.agents/rules/*`.
- Baseline-Freeze fuer Phase `26.3c.0` erstellt:
  - echter Desktop-/Mobil-Browser-Check per Playwright mit Screenshots nach `tmp/menu-baseline-*.png`
  - Metriken nach `tmp/menu-baseline-review.json`
  - Hauptbefunde: Header ausserhalb Ebene 1 zu hoch, Ebene 3 nicht startfokussiert genug, mobile Kopfzone verliert zu viel Nutzhoehe.
- Implementierungsplan in `implementation_plan.md` angelegt.

2026-03-07 (Menu UX Follow-up V26.3c abgeschlossen)
- Phasen `26.3c.1` bis `26.3c.9` umgesetzt und in `docs/Feature_Menu_UX_Followup_V26_3c.md` abgehakt.
- Menue-UX fertiggestellt:
  - kompakter Header ausserhalb Ebene 1
  - Ebene 2 als Karten-/Direktpfad
  - sticky Startleiste und strukturierte Vorschaukarten auf Ebene 3
  - sektionierte Ebene 4 mit lokal persistierter aktiver Sektion
  - bereinigter Release-Textpfad bei stabilen Text-IDs
- Test- und Visual-Verifikation:
  - `npm run test:core` PASS (`48 passed`, `1 skipped`)
  - `npm run test:stress` PASS
  - `npm run build` PASS; bekannter Warnhinweis kommt aus bereits fremd veraenderter `src/core/MediaRecorderSystem.js`
  - Desktop-/Mobil-Screenshots unter `tmp/menu-visual-*.png`

2026-03-07 (Launcher-Startfehler Diagnose)
- Nutzerproblem reproduziert: Spiel startet ueber den statischen Launcher/`server.ps1` nicht mehr, waehrend der Vite-Pfad (`npm run dev`, Playwright) weiter funktioniert.
- Root Cause verifiziert im Browser auf `http://localhost:9999/`: `Failed to resolve module specifier "mp4-muxer"`; dadurch bricht `src/core/main.js` vor Menu-Initialisierung ab.
- Fix umgesetzt:
  - `index.html`: Importmap um `mp4-muxer -> ./node_modules/mp4-muxer/build/mp4-muxer.mjs` erweitert.
  - `server.ps1`: `.mjs` MIME-Type als `application/javascript` ergaenzt.
- Zusatzbereinigung:
  - `src/core/MediaRecorderSystem.js`: unnoetigen `default`-Fallback fuer `mp4-muxer` entfernt; Build-Warnung verschwindet.
- Verifikation:
  - Statischer Launcher-Smoke mit `server.ps1` + Chromium: keine Console/Page-Errors, Menu sichtbar, `GAME_INSTANCE`/Renderer vorhanden.
  - Visual-Check: `tmp/launcher-start-ok.png`.
  - `npm run build` PASS
  - `npm run test:core` PASS (`48 passed`, `1 skipped`)
- Ausstehend bei diesem Eintrag: `docs:sync` und `docs:check`.

2026-03-07 (Cinematic Camera Bugfix gestartet)
- Nutzerproblem "Cinematic Camera funktioniert nicht" analysiert (Skill `develop-web-game`).
- Repro gefunden: Mit `cockpitCamera=true` fuer PLAYER_1 und aktivem `THIRD_PERSON` bleibt `cinematicCameraSystem.getPlayerBlend(0)` bei `0`.
- Root Cause eingegrenzt:
  - `CameraRigSystem.updateCamera()` springt bei Cockpit in einen Early-Return-Pfad.
  - `CinematicCameraSystem.apply()` blockiert Cinematic zusaetzlich bei `cockpitCamera`.
- Geplanter Fix: Cinematic auch im Cockpit-Third-Person-Pfad anwenden + Regressionstest in `tests/gpu.spec.js`.
2026-03-07 (Cinematic Camera Bugfix abgeschlossen)
- Root Cause behoben:
  - `src/core/renderer/CameraRigSystem.js`: Cinematic-Apply wird nun auch im Cockpit-Updatepfad ausgefuehrt.
  - `src/entities/systems/CinematicCameraSystem.js`: Third-Person-Cinematic blockiert nicht mehr allein wegen `cockpitCamera`.
- Regressionstest hinzugefuegt:
  - `tests/gpu.spec.js` -> `T33b: Cinematic Camera bleibt in Third-Person mit Cockpit aktiv`.
- Manuelle Repro-Verifikation (Launcherpfad `http://localhost:9999`):
  - Vor Fix reproduzierbar `blend=0` bei `cockpitCamera=true` + `THIRD_PERSON`.
  - Nach Fix bestaetigt `blend>0` (gemessen `0.423...`).
- Teststatus:
  - `npm run test:gpu -- -g "T33|T33b"` PASS
  - `npm run test:core` PASS (48 passed, 1 skipped)
  - `npm run build` PASS
  - `npm run test:physics` FAIL bei bestehendem Test `T82` (Policy-Wiring erwartet `hunt-bridge`, bekommt `classic-bridge`), nicht im Kamera-Diff betroffen.
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Doku-Updates:
  - `docs/Analysebericht.md` um Cinematic-Cockpit-Fix + Testnachweis erweitert.
  - `docs/Umsetzungsplan.md` Statuszeile zu Cinematic-Fix ergaenzt.
- TODO fuer naechsten Agenten:
  - Separat `tests/physics-policy.spec.js` T82-Divergenz analysieren und zu aktuellem Bot-Policy-Wiring abgleichen.
2026-03-07 (Planung: Cinematic Follow-up ohne Punkt 5)
- Neuer Plan erstellt: `docs/Feature_Cinematic_Camera_Followup_V29b.md` (enthaelt Vorschlaege 1/2/3/4/6 in granularen Phasen).
- Punkt 5 explizit separat im Masterplan geparkt: `docs/Umsetzungsplan.md` -> `N3 T82 Policy-Wiring isolieren und spaeter separat beheben`.
- Plan-Eingang im Masterplan um `PX Cinematic Camera Follow-up V29b` erweitert.

2026-03-07 (Performance Offensive V28.5 revalidiert und auf Zielwerte gebracht)
- Ausgangslage beim Start dieses Blocks:
  - Doku markierte `28.5.x` bereits als abgeschlossen, aber reale Metriken lagen noch bei `overall drawCallsAverage=37.67`, `V3 drawCallsAverage=62.40`, `V4 drawCallsAverage=37.00`.
  - Root Cause: `src/entities/arena/PortalGateMeshFactory.js` teilte nur Geometry/Material, baute Portal-/Gate-Visuals aber weiterhin als einzelne Meshes pro Instanz auf.
- Fix umgesetzt:
  - `src/entities/arena/PortalGateMeshFactory.js`: echte InstancedMesh-Batches mit shared no-dispose Resource-Caches und `instanceColor` fuer Portal-/Gate-Komponenten.
  - `src/entities/arena/portal/PortalLayoutBuilder.js`: Match-lokale Visual-Registry fuer Portal-/Gate-Aufbau.
  - `src/entities/arena/portal/PortalRuntimeSystem.js` und `src/entities/arena/portal/SpecialGateRuntime.js`: Animationspfade auf neue Instancing-Handles erweitert, kompatibel zum bisherigen Mesh-Pfad.
  - `src/core/three-disposal.js`: shared Materialien/Geometrien werden beim Match-Cleanup nicht versehentlich wegdisponiert.
  - Regressionen: `tests/core.spec.js` (`T10b` Portal-Runtime) und `tests/gpu.spec.js` (`T21b` Portal-Instancing).
- Verifikation / Metriken:
  - `npm run build` PASS
  - `npm run test:core` PASS (`49 passed`, `1 skipped`)
  - `npm run test:physics` PASS (`47 passed`)
  - `npm run test:gpu` PASS (`16 passed`)
  - `npm run test:stress` PASS (`19 passed`)
  - `npm run benchmark:baseline` PASS -> `overall fpsAverage=59.977`, `overall drawCallsAverage=20.986`, `V2 drawCallsMax=24`, `V3 drawCallsAverage=23.733`, `stuckEvents=0`
  - `npm run benchmark:lifecycle -- --profile trend` PASS -> `domToGameInstanceMs=4283`, `startMatchLatencyMs=68`, `returnToMenuLatencyMs=63`
  - `npm run benchmark:lifecycle -- --profile full` PASS -> `domToGameInstanceMs=3253`, `startMatchLatencyMs=179`, `returnToMenuLatencyMs=26`
- Visuelle Checks:
  - Skill `develop-web-game` Client erfolgreich ausgefuehrt; Screenshots unter `tmp/develop-web-game-portal/`.
  - Gezielter `V3` Portal-Screenshot unter `tmp/perf-phase28-5-v3-instancing.png` geprueft; Portal-Visuals sichtbar und intakt.
- Abschluss:
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - Doku-Freeze fuer `docs/Feature_Performance_Offensive_V28_5.md`, `docs/Umsetzungsplan.md` und `docs/Testergebnisse_2026-03-07.md` auf finale Referenzwerte gezogen.

2026-03-07 (Map-Load Regression nach Prewarm/Portal-Optimierungen behoben)
- Nutzerfeedback: Maps wirken nach den juengsten Aenderungen nicht korrekt geladen.
- Root Cause verifiziert per Browser-Repro:
  - `prewarmMatchArenaSession()` baut die Arena bereits in `renderer.matchRoot`.
  - `createMatchSession()` rief danach weiterhin `renderer.clearMatchScene()` auf und reused dieselbe Prewarm-Arena ohne Rebuild.
  - Ergebnis: Kollisions-/Portal-Daten leben weiter, aber `_floorMesh` / `_mergedWallMesh` / `_mergedObstacleMesh` sind aus der Szene geloescht.
- Zusatzrisiken aus derselben Aenderung behoben:
  - Prewarm-Session-Key war zu grob (`mapKey|portalsEnabled`) und ignorierte arena-relevante Unterschiede wie Custom-Map-Inhalt, `portalCount`, `planarMode`, `planarLevelCount`.
  - Arena-Build-Signatur war ebenfalls zu grob und konnte Custom-Maps mit gleichem Key/Size oder veraenderte Portal-Layouts faelschlich auf `reuse` lassen.
- Fixes:
  - `src/state/MatchSessionFactory.js`: Prewarm-Szene bleibt beim reuse erhalten; Session-Key jetzt inkl. Map-Fingerprint + arena-relevanter Gameplay-Parameter.
  - `src/entities/arena/ArenaBuildResourceCache.js`: Map-Fingerprint + erweiterte Build-Signatur.
  - `src/entities/arena/ArenaBuilder.js`: Reuse nur noch bei wirklich noch angehaengter Geometrie; Signatur deckt Portal-/Planar-Parameter mit ab.
  - `tests/core.spec.js`: neue Regressionen `T10c` / `T10d` / `T10e` fuer sichtbare Arena-Meshes nach Prewarm, Portal-Layout-Rebuild und Custom-Map-Wechsel mit gleichem Key.
- Verifikation:
  - `npm run build` PASS
  - `npm run test:core -- -g "T10b|T10c|T10d|T10e"` PASS
  - `npm run test:core` PASS (`52 passed`, `1 skipped`)
  - `npm run test:physics` PASS (`47 passed`)
  - `npm run test:gpu -- -g "T21b"` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - visueller Gameplay-Screenshot geprueft: `tmp/map-prewarm-fix-after.png`

2026-03-07 (Portal-Visual Follow-up: schwarze Portale nach Instancing)
- Nutzerfeedback: Portale erscheinen ploetzlich nur noch schwarz.
- Root Cause verifiziert:
  - Der Performance-Fix fuer Portal-/Gate-Instancing hatte farbige/emissive Einzelmaterialien auf einen shared weiss/grauen Materialpfad umgestellt.
  - Ergebnis im Browser: Portal-Batches existieren weiter, aber die Torus-/Disc-Materialien waren materialseitig `ffffff`/`1f1f1f`; farbige Leuchtwirkung war weg.
- Fix umgesetzt:
  - `src/entities/arena/PortalGateMeshFactory.js`: farbgetrennte Instancing-Batches fuer Portal- und Gate-Ringe; Materialfarbe/Emissive wieder pro Portalfarbe gesetzt.
  - `tests/gpu.spec.js` `T21b`: Batch-Counts werden ueber farbgetrennte InstancedMeshes summiert; Test prueft zusaetzlich Rot/Grun in Material- und Emissive-Farben.
- Verifikation:
  - Browser-Probe bestaetigt Portal-Batches `portal:torus:...:00ff00` / `...:ff0000` mit passenden Material-/Emissive-Farben.
  - Visual-Check: `tmp/portal-color-restored-close.png` zeigt wieder leuchtende rot/gruene Portale.
  - `npm run build` PASS
  - `npm run test:gpu -- -g "T21b"` PASS
  - `npm run test:core -- -g "T10b|T10c|T10d|T10e"` -> `T10b/T10c/T10e` PASS, `T10d` einmal mit Playwright-Navigation-Flake; `npm run test:core -- -g "T10d"` danach PASS

2026-03-07 (Map-Disk-Path-Fix fuer Editor-/Generated-Maps)
- Nutzerauftrag ab `e548108`: separaten Map-bezogenen Fix nach Prewarm-Regressions-Commit uebernehmen.
- Root Cause end-to-end reproduziert:
  - Baseline-Snapshot von `e548108` bestaetigt Pfad-Mismatch: `vite.config.js` schrieb Disk-Maps nach `js/modules/GeneratedLocalMaps.js`, die Runtime importiert aber `src/entities/GeneratedLocalMaps.js`.
  - Ohne `js/modules/` scheitert der Save-POST bereits mit 500 nach dem Schreiben der `data/maps/*.json`.
  - Mit absichtlich angelegtem `js/modules/` landet die generierte Map zwar dort, taucht im Runtime-Menue aber weiterhin nicht auf, weil `src/entities/GeneratedLocalMaps.js` stub bleibt.
- Fix umgesetzt:
  - `vite.config.js`: `GENERATED_LOCAL_MAPS_MODULE_PATH` auf `src/entities/GeneratedLocalMaps.js` umgestellt.
  - `tests/core.spec.js`: neue Regression `T10f` fuer echten Editor-Disk-Save -> Runtime-Menue -> Match-Load.
  - `tests/core.spec.js`: `T10f` mit eigenem Timeout/robusterem Cleanup stabilisiert.
- Echte Runtime-Verifikation:
  - Dev-Server: Browserflow speichert Map ueber `/api/editor/save-map-disk`, zeigt sie im Menue und laedt sie im Match (`tmp/map-disk-dev.png`).
  - Preview-Bundle: dieselbe gespeicherte Map erscheint nach `npm run build` im Preview und laedt im Match (`tmp/map-disk-preview.png`).
  - Statischer Launcher: dieselbe Map erscheint ueber `server.ps1` im Menu und laedt im Match (`tmp/map-disk-static.png`).
- Test-/Gate-Status:
  - `npx playwright test tests/core.spec.js -g "T10f"` PASS
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
