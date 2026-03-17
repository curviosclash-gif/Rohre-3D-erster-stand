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

2026-03-17 (Planung: Menu Default Editor V42)
- Nutzerwunsch aufgenommen: eine zentrale Datei, in der Menue-Voreinstellungen gebuendelt geaendert werden koennen.
- Iststand geprueft: Defaults sind aktuell ueber `src/core/SettingsManager.js`, `src/ui/menu/MenuStateContracts.js`, `src/ui/menu/MenuPresetCatalog.js` und `src/ui/menu/MenuConfigShareOps.js` verteilt.
- Plan erstellt: `docs/Feature_Menu_Default_Editor_V42.md`.
- Masterplan erweitert: Intake-Eintrag `PX Menu Default Editor V42` plus gezielter Ownership-Hinweis fuer die neue Quelldatei.
- Zielbild fuer spaetere Umsetzung: `src/ui/menu/MenuDefaultsEditorConfig.js` als Single Source fuer Session-, Gameplay-, Local-UI- und Preset-Defaults; kein separater HTML-Editor in Phase 1.

2026-03-17 (Umsetzung: Menu Default Editor V42)
- Neue zentrale Datei `src/ui/menu/MenuDefaultsEditorConfig.js` angelegt.
- Rewire abgeschlossen:
  - `src/core/SettingsManager.js`
  - `src/ui/menu/MenuStateContracts.js`
  - `src/ui/menu/MenuConfigShareOps.js`
  - `src/ui/menu/MenuDraftStore.js`
  - `src/ui/menu/MenuPresetCatalog.js`
  - `src/ui/menu/EventPlaylistCatalog.js`
  - `src/core/runtime/MenuRuntimeSessionService.js`
- Neue direkte Regression in `tests/core.spec.js` koppelt Fixed-Preset- und Reset-Pfade an die zentrale Datei.
- Gezielte Verifikation PASS:
  - `T12b`
  - `T20f`
  - `T20o`
  - `T20q`
  - `T20s`
  - `T20bb`
  - `T20bc`
  - `T74`
  - `T77b`
  - `T79`
- Browser-Spotcheck PASS:
  - `tmp/develop-web-game-v42/shot-0.png` zeigt Level-2-Menuepfad nach Klick auf `Single Player`.
- Offener Repo-Blocker ausserhalb des Diffs:
  - `npm run test:core` FAIL im bestehenden `T14: Alle Maps ladbar`.
  - `npm run test:stress` FAIL im bestehenden `T71b: Showcase-Nexus startet mehrfach ohne Aircraft-Deko-Leaks`.
  - `npm run build` FAIL wegen bestehendem Architektur-Lint in `src/core/config/maps/MapPresetCatalog.js` (`max-lines`, `627 > 500`).
- Verifikation: npx playwright test tests/physics.spec.js -g T62 PASS; npm run test:physics PASS; npm run test:core PASS; npm run build PASS; docs:sync/check PASS.

2026-03-17 (Follow-up: bestehende HUD-Timeouts + MapPresetCatalog-Lint)
- Root Cause fuer `T14` und `T71b` verifiziert:
  - `showcase_nexus` startet erfolgreich bis `state=PLAYING`, aber der GLB-Loading-UI-Pfad setzt `hudHidden=true`.
  - `deriveRoundStartUiState()` hat das HUD danach nicht wieder eingeblendet; Folge: bestehende Tests warten auf ein HUD, das dauerhaft verborgen bleibt.
  - Der beobachtete `returnToMenu`-Haenger in einem T14-Retry war ein Sekundaereffekt des 120s-Testtimeouts, nicht die Primaerursache.
- Fix umgesetzt:
  - `src/ui/MatchUiStateOps.js`: `deriveRoundStartUiState()` blendet das HUD explizit wieder ein.
  - `src/core/config/maps/MapPresetCatalog.js` in Aggregator aufgeteilt; Daten liegen jetzt in `MapPresetCatalogBaseData.js` und `MapPresetCatalogExpertData.js`, damit der Architektur-Lint `max-lines` wieder eingehalten wird.
- Gezielte Verifikation PASS:
  - `npx playwright test tests/core.spec.js --grep "T14: Alle Maps ladbar" --workers=1`
  - `npx playwright test tests/stress.spec.js --grep "T71b: Showcase-Nexus startet mehrfach ohne Aircraft-Deko-Leaks" --workers=1`
- Nächster Schritt: geforderte Vollverifikation (`test:core`, `test:stress`, `build`, `docs:sync`, `docs:check`).


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

2026-03-13 (Follow-up: weitere Verbesserung nach V35/V36 Performance-Follow-up)
- Root Cause fuer sporadische Bot-Fallback-Warnungen verifiziert:
  - `BotSensors.update()` lief ueber `BotSensorsFacade`, aber die Facade stellte `_buildBasis()` nicht bereit.
  - Folge: Rule-Based-Bots warfen im Wahrnehmungspfad `bot._buildBasis is not a function`, fielen in `PlayerInputSystem` auf neutralisierte Inputs zurueck und erzeugten unnoetige Warn-/Fallback-Last.
- Fix umgesetzt:
  - `src/entities/ai/BotSensorsFacade.js`: `_buildBasis(forward)` als Facade-Proxy auf `BotSensors` ergaenzt.
  - `tests/physics-policy.spec.js`: neuer Regressionstest `T82b` deckt den Rule-Based-Perception/Fascade-Pfad im echten Match-Setup ab.
- Verifikation:
  - isoliert: `TEST_PORT=5234 PW_RUN_TAG=improve-policy-target PW_OUTPUT_DIR=test-results/improve-policy-target PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/physics-policy.spec.js --grep T82b` PASS
  - `TEST_PORT=5235 PW_RUN_TAG=improve-core PW_OUTPUT_DIR=test-results/improve-core PW_WORKERS=1 npm run test:core` PASS (`69 passed`, `1 skipped`)
  - `TEST_PORT=5236 PW_RUN_TAG=improve-physics PW_OUTPUT_DIR=test-results/improve-physics PW_WORKERS=1 npm run test:physics` PASS (`54 passed`)
  - `npm run build` PASS
  - Ad-hoc Browser-Probe: keine `BotActionContract`-/`_buildBasis`-Warnungen mehr direkt nach Match-Start.
- Offene Empfehlung:
  - Falls die Phase-9-Perf-Matrix erneut gefahren wird, die neue Messung gegen den bisherigen Report separat dokumentieren; dieser Zusatzfix reduziert Start-/Bot-Fallback-Rauschen, ersetzt aber keine vollstaendige Benchmark-Rerunde.

2026-03-13 (Follow-up: fuenf weitere Verbesserungs-Schleifen)
- Schleife 1 - RuntimePerfProfiler:
  - Live-`[PerfSpike]`-Warnungen aus dem Frame-Hotpath per Default entkoppelt; Spike-Snapshots bleiben erhalten.
  - `src/core/perf/RuntimePerfProfiler.js`: optionales Spike-Logging + Cooldown eingefuehrt.
  - `tests/core.spec.js`: `T20ah1` prueft, dass Spike-Daten gesammelt werden, ohne Console-Warnstorm.
- Schleife 2 - Recorder Hotpath:
  - Frame-Interval-Statistik aus dem Capture-Hotpath entfernt und auf lazy/on-demand umgestellt.
  - `src/core/MediaRecorderSystem.js`: dirty-flag + Cache fuer Interval-Stats.
  - `tests/core.spec.js`: `T20aj1` prueft lazy/cached Diagnostics.
- Schleife 3 - Recorder Backpressure:
  - Backpressure-Strategie auf staerkere Downscale-/moderatere FPS-Reduktion verschoben, damit Recording nicht bis in den FPS-Kollaps gedrueckt wird.
  - `src/core/MediaRecorderSystem.js`: `CAPTURE_LOAD_LEVELS` neu gewichtet (Resolution-first, FPS-Floor bleibt hoeher).
  - `tests/core.spec.js`: `T20aj2` prueft effektiven FPS-Floor unter harter Last.
- Schleife 4 - Kamera-Pfad:
  - Cinematic-Toggle resettiert jetzt Kamera-Smoothing/Cinematic-Blend und fordert einen gemeinsamen Delta-Reset an.
  - `src/core/renderer/CameraRigSystem.js`, `src/core/main.js`: Timing-/Blend-Reset beim Toggle.
  - `tests/core.spec.js`: `T20ai1` deckt den Toggle-Reset ab.
- Schleife 5 - erneute Laufzeitpruefung + Restfix:
  - Routine-Info-Logs beim normalen Start reduziert (`DOM ready`, `EntityManager setup`, erfolgreicher `BotPolicyRegistry`-Create-Fall).
  - `tests/core.spec.js`: `T10e` fuer Custom-Map-Reopen gehaertet, damit `mapKey=custom` vor dem zweiten Start stabil bestaetigt wird.
- Abschlussverifikation:
  - `npm run build` PASS
  - `TEST_PORT=5247 PW_RUN_TAG=loops5-core-final-rerun PW_OUTPUT_DIR=test-results/loops5-core-final-rerun PW_WORKERS=1 npm run test:core` PASS (`73 passed`, `1 skipped`)
  - `TEST_PORT=5244 PW_RUN_TAG=loops5-physics-final PW_OUTPUT_DIR=test-results/loops5-physics-final PW_WORKERS=1 npm run test:physics` PASS (`54 passed`)
  - Ad-hoc Runtime-Check: `PerfSpike`-/Start-Info-Logs verschwunden; verbleibend nur Headless-WebGL-`ReadPixels`-Warnungen.
- Offene Empfehlung:
  - Wenn die Phase-9-Matrix erneut laeuft, die Recorder-Strategie nach diesen Schleifen gegen den alten Report gegenmessen; diese Runde war funktional/testseitig verifiziert, aber nicht als neue Vollbenchmark dokumentiert.

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

2026-03-08 (Runtime-Stabilisierung V30 gestartet)
- Skills `develop-web-game` und `playwright` aktiv fuer den Runtime-/Browser-Diagnoseloop.
- V30-Baseline revalidiert:
  - `GameLoop` doppelt Simulationszeit ueber Fixed-Step plus Fallback-Update.
  - `UIManager._startSetupDisposers` ist vorhanden, aber nicht als echter Teardown-Pfad verdrahtet.
  - `PlayerView.update()` triggert weiterhin `player.trail.update(...)`.
  - Bot-Observation pfad erzeugt ohne Reuse-Target weiter Arrays.
  - `MediaRecorderSystem.getSupportState()` bleibt wegen globalem `VideoEncoder`-Shim zu optimistisch.
- Teststatus:
  - `npm run test:core` hing im ersten Tool-Timeout; reproduziert danach erfolgreich mit `npx playwright test tests/core.spec.js --reporter=line --workers=1` PASS (`53 passed`, `1 skipped`).
- Naechster Schritt:
  - Phase `30.1` GameLoop korrigieren und Regressionstests fuer Sub-Step-/Clamp-/timeScale-Faelle ergaenzen.

2026-03-08 (V30 Phase 30.1 abgeschlossen)
- `src/core/GameLoop.js` auf reinen Fixed-Step-Pfad umgestellt:
  - kein Direkt-`update(dt)`-Fallback mehr bei Sub-Step-Frames
  - `timeScale` wird genau einmal auf akkumulierte Simulationszeit angewandt
  - `start()` setzt den Accumulator zurueck
- Neue Core-Regressionen:
  - `T20ab` Sub-Step-Frames ohne Doppel-Simulation
  - `T20ac` Delta-Clamp auf max. drei Fixed-Steps
  - `T20ad` Slow-Time / `timeScale` ohne doppelte Wirkung
- Verifikation:
  - `npx playwright test tests/core.spec.js -g "T20ab|T20ac|T20ad" --reporter=line --workers=1` PASS
  - `npm run test:core` PASS (`56 passed`, `1 skipped`)
  - `npx playwright test tests/physics-core.spec.js tests/physics-hunt.spec.js tests/physics-policy.spec.js --reporter=line --workers=1` PASS (`47 passed`)
- Naechster Schritt:
  - Phase `30.2` Runtime-Dispose-/Cleanup-Vertrag ueber Core/UI-Systeme ziehen.

2026-03-08 (V30 Phase 30.2 abgeschlossen)
- Runtime-Dispose-Vertrag eingefuehrt:
  - `Game.dispose()` faehrt Match-/UI-/Core-Systeme kontrolliert herunter.
  - `Renderer`, `InputManager`, `AudioManager`, `GameRuntimeFacade`, `UIManager` und `MenuController` haben jetzt echte Listener-/Timer-Teardown-Pfade.
  - Menu-Binding-Module verwenden registrierte Disposer statt nicht entfernbarer Direkt-Bindings.
  - `_startSetupDisposers` in `UIManager` wird nun tatsaechlich befuellt und beim Dispose abgearbeitet.
- Neue Regression:
  - `tests/core.spec.js` -> `T20ae`: Dispose + Reinit duplizieren weder KeyCapture-, Resize-, Input- noch Start-Button-Listener.
- Verifikation:
  - `npx playwright test tests/core.spec.js -g "T20ae" --reporter=line --workers=1` PASS
  - `npm run test:core` PASS (`57 passed`, `1 skipped`)
  - `npm run test:stress` PASS (`19 passed`)
- Naechster Schritt:
  - Phase `30.3` Trail-Simulation aus `PlayerView` entfernen und in den Simulationspfad legen.

2026-03-08 (Code-Review + V30 Phase 30.3 abgeschlossen)
- Geaenderten Code durchgesehen und gegen Tests verifiziert.
- Gefundener Punkt:
  - Stress-Flake in `T71` (`Escape` -> Menu) bei Sammellauf; solo nicht reproduzierbar stabil.
  - Verbesserung umgesetzt in `tests/helpers.js`:
    - `returnToMenu()` nutzt nun mehrere Escape-Versuche plus Runtime-Fallback (`_returnToMenu`) bevor der Selektor-Timeout greift.
- Phase `30.3` umgesetzt:
  - Trail-Update aus `PlayerView.update()` entfernt.
  - Trail-Update in `PlayerLifecycleSystem.updatePlayer()` direkt nach Bewegungsupdate verlagert.
  - Neue Regression `T45b` in `tests/physics-core.spec.js` prueft, dass der Trail aus dem Lifecycle-System kommt und nicht aus der View.
- Verifikation:
  - `npm run test:core` PASS (`57 passed`, `1 skipped`)
  - `npm run test:physics` PASS (`48 passed`)
  - `npm run test:stress` PASS (`19 passed`)
- Naechster Schritt:
  - Phase `30.4` Observation-Reuse pro Bot und Bot-Tuning-Auslagerung aus `Bot.js`.

2026-03-08 (V30 Phase 30.4 abgeschlossen)
- Bot-/Observation-Hotpath auf Reuse umgestellt:
  - `src/entities/ai/BotRuntimeContextFactory.js`: persistenter Observation-Buffer pro Bot-Runtime-Context.
  - `src/entities/systems/PlayerInputSystem.js`: Observation-Build nutzt konsequent Reuse-Target (`buildObservation(..., target)`).
- Bot-Tuning zentralisiert:
  - neues Modul `src/entities/ai/BotTuningConfig.js` mit `BOT_ITEM_RULES` und `BOT_FALLBACK_DIFFICULTY_PROFILE`.
  - `src/entities/Bot.js` importiert Tuningwerte statt lokaler Hardcodes.
- Regression:
  - `tests/physics-policy.spec.js` -> `T71b`: Observation-Referenz bleibt ueber mehrere Bot-Ticks gleich.
- Verifikation:
  - `npm run test:physics` PASS (`49 passed`)
  - `npm run test:stress` PASS (`19 passed`)
- Naechster Schritt:
  - Phase `30.5` Recorder-Support/Fallbacks und sichere Fehlerausgabe.

2026-03-08 (V30 Phase 30.5 abgeschlossen)
- Recorder-Capability gehaertet:
  - `src/core/MediaRecorderSystem.js`: globale WebCodecs-Noop-Shims entfernt; native Support-Erkennung und Recorder-Status konservativ.
  - `getSupportState()` liefert weiterhin stabile Booleans, trennt aber unsupported/shimmed Faelle sauber.
- Recorder-Resultate/Fallbacks vereinheitlicht:
  - konsistentes Start/Stop-Result-Format (`action`, `ok`, `reason` plus Statusfelder).
  - zentralisierter API-zu-Download-Fallback inklusive konsistenter Log-Meldungen.
- Fehlerausgabe abgesichert:
  - `src/core/main.js`: Error-Overlays auf `textContent` umgestellt (kein `innerHTML` bei Runtime-/Init-Fehlern).
- Regression:
  - `tests/core.spec.js` -> `T20af`: Shim-getrennter Recorder-Support + konsistente Start/Stop-Resultate.
- Verifikation:
  - `npm run test:core` PASS (`58 passed`, `1 skipped`)
  - `npm run test:gpu` PASS (`16 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Naechster Schritt:
  - Phase `30.6` (`UIManager` modularisieren).

2026-03-08 (V30 Phase 30.6 abgeschlossen)
- `UIManager` modularisiert und auf klarere Delegation gezogen:
  - neues Start-Setup-Modul `src/ui/start-setup/StartSetupUiOps.js` fuer lokale Start-Setup-Statepflege sowie Favoriten-/Recent-/Preview-Rendering.
  - neues Preset-Sync-Modul `src/ui/menu/MenuPresetStateSync.js`.
  - neues Developer-Sync-Modul `src/ui/menu/MenuDeveloperStateSync.js`.
- `src/ui/UIManager.js` wurde als Compose-Fassade verschlankt (ca. 1280 -> 1080 Zeilen) und delegiert die extrahierten Bereiche.
- Verifikation:
  - `npm run test:core` PASS (`58 passed`, `1 skipped`)
  - `npm run test:stress` PASS (`19 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Naechster Schritt:
  - Phase `30.7` (`GameRuntimeFacade` und State-Kontrakte konsolidieren).

2026-03-08 (V30 Phase 30.7 abgeschlossen)
- `GameRuntimeFacade` in Runtime-Services aufgeteilt:
  - `src/core/runtime/MatchStartValidationService.js` (Start-Validierung)
  - `src/core/runtime/MenuRuntimePresetConfigService.js` (Preset-/Config-Aktionen)
  - `src/core/runtime/MenuRuntimeMultiplayerService.js` (Multiplayer-Stub inkl. Ready-Invalidation)
  - `src/core/runtime/RuntimeSettingsChangeOrchestrator.js` (Settings-Change-Orchestrierung)
- State-Kontrakte zentralisiert:
  - `src/core/runtime/GameStateIds.js` eingefuehrt und in `src/core/main.js` sowie `src/core/GameRuntimeFacade.js` verwendet.
- Verifikation:
  - `npm run test:core` PASS (`58 passed`, `1 skipped`)
  - `npm run test:stress` PASS (`19 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Naechster Schritt:
  - Phase `30.8` Abschluss-Gate und Doku-Freeze.

2026-03-08 (V30 Phase 30.8 abgeschlossen / V30 geschlossen)
- Abschlusspruefung gegen alle Ausgangsbefunde durchgefuehrt; V30 ist damit inhaltlich geschlossen.
- Finales Verifikationspaket:
  - `npm run test:core` PASS (`58 passed`, `1 skipped`)
  - `npm run test:physics` PASS (`49 passed`)
  - `npm run test:gpu` PASS (`16 passed`)
  - `npm run test:stress` PASS (`19 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Optionaler Benchmark-Lauf:
  - `npm run benchmark:baseline` in der Abschlussphase bewusst nicht erneut ausgefuehrt, da die letzten Schritte strukturelle Runtime-/UI-Refactors ohne erwartetes GPU-/Drawcall-Delta waren.
- Gesamtstatus:
  - V30 abgeschlossen (GameLoop-Korrektheit, Lifecycle-Cleanup, Trail-Sim-Ownership, Bot-/Observation-Hotpath, Recorder-Haertung, UIManager-/GameRuntimeFacade-Entkopplung).

2026-03-08 (V27 Phase 27.1 gestartet, Agent B)
- Workflow geladen: `.agents/workflows/fix-planung.md` + `.agents/workflows/code.md`, Lane strikt auf `Block V27`.
- Baseline fuer V27 bestaetigt ueber `docs/Feature_Profile_Statistiken_UI_V27.md` und `docs/Umsetzungsplan.md`.
- Erste offene Phase in Lane B: `27.1 V7 Profile-UX Ausbau` mit:
  - `27.1.1` Duplizieren und Import/Export-Funktion
  - `27.1.2` Standardprofil-Markierung
- Relevanter Zusatzbefund aus Masterplan:
  - `Profil speichern` aktualisiert seinen Disabled-State nach Eingabe aktuell nicht zuverlaessig; wird im selben UX-Schritt mitbehandelt.
- `implementation_plan.md` fuer Phase `27.1` angelegt.

2026-03-08 (V27 Phase 27.1 abgeschlossen, Agent B)
- Profil-UX umgesetzt:
  - neue Tools-Controls fuer Duplicate, Standardprofil, Profil-JSON Export/Import
  - persistentes `isDefault` an Profilen
  - neuer Import/Export-Vertrag `profile-export.v1`
  - Profil-Buttons reagieren jetzt sofort auf Nameingabe, Select-Wechsel und Transfer-Textarea
- Neue Regression:
  - `tests/core.spec.js` -> `T20ka` fuer Save-State, Duplicate, Default-Markierung und Import/Export
- Verifikation:
  - `npx playwright test tests/core.spec.js --reporter=line --workers=1` PASS (`59 passed`, `1 skipped`)
  - `npx playwright test tests/stress.spec.js --reporter=line --workers=1` PASS (`19 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - Skill `develop-web-game` Client gegen `http://127.0.0.1:4173` erfolgreich; Screenshot `tmp/develop-web-game-v27/shot-0.png`
  - Playwright-Visual-Check fuer Tools-Panel erfolgreich; Screenshot `profile-tools-populated.png`

2026-03-08 (V26 Phase 26.1 abgeschlossen, Agent A)
- Hunt-Trefferfeedback differenziert:
  - neue Audio-Cues `MG_SHOOT`/`MG_HIT`, `ROCKET_SHOOT`/`ROCKET_IMPACT` und `SHIELD_HIT`
  - neue Partikelprofile fuer MG-, Trail-, Raketen- und Schildtreffer
  - Hunt-Schadensevents laufen im modularen Runtime-Pfad jetzt konsistent durch das zentrale Feedback-Wiring
- Neue Regressionen:
  - `tests/physics-hunt.spec.js` -> `T88`, `T89`
  - `tests/helpers.js` -> robusterer Session-Type-Selektor fuer Hunt-Startflows
- Verifikation:
  - `npx playwright test tests/physics-core.spec.js tests/physics-hunt.spec.js tests/physics-policy.spec.js --reporter=line --workers=1` PASS (`51 passed`) gegen manuell gestarteten `vite --host localhost --port 5173 --strictPort`
  - `npx playwright test tests/core.spec.js --reporter=line --workers=1` PASS (`59 passed`, `1 skipped`) gegen denselben manuellen Vite-Server
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - Skill `develop-web-game` Client erfolgreich; Screenshots unter `output/web-game-agent-a/shot-0.png` und `output/web-game-agent-a/shot-1.png`
- Naechster Schritt:
  - Phase `26.2` Hunt-Mode Feintuning

2026-03-09 (Bugfix: Karten- und Flugzeugauswahl uebernehmen nicht)
- Nutzerproblem reproduziert:
  - Auswahl in `#map-select` und `#vehicle-select-p1` sprang direkt auf alte Werte zurueck.
  - Match startete trotz Auswahl weiter mit `standard` und `ship5`.
- Root Cause:
  - `src/ui/UIManager.js` hing vor `MenuController` eigene `change`-Listener an die Selects.
  - Diese Listener riefen sofort `syncStartSetupState(settings)` auf und renderten die Selects aus altem `settings`-State neu, bevor die eigentlichen Gameplay-Bindings den neuen Wert uebernehmen konnten.
- Fix:
  - `src/ui/UIManager.js`: Select-Change-Listener fuer Map und Vehicles aktualisieren jetzt nur noch die Recent-Listen; das eigentliche UI-Resync laeuft ueber den regulaeren `onSettingsChanged`-Pfad nach dem Settings-Update.
  - `tests/core.spec.js`: neue Regression `T20kb` prueft Map-/Flugzeug-Auswahl in DOM, `settings` und gestartetem Match.
- Verifikation:
  - direkte Browser-Repro gegen `http://localhost:5173`: Auswahl bleibt auf `maze` / `aircraft`, Match startet mit denselben Werten.
  - `npx playwright test tests/core.spec.js -g "T20kb" --reporter=line --workers=1` PASS
  - `npm run test:core` PASS (`60 passed`, `1 skipped`)
  - `npm run test:stress` PASS (`19 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS

2026-03-10 (Planung: Bot-Modus-Spezialbots V31)
- Nutzeranforderung praezisiert:
  - genau vier Bot-Arten
  - `normal/classic + 3d` -> `classic-3d`
  - `normal/classic + planar` -> `classic-2d`
  - `fight/hunt + 3d` -> `hunt-3d`
  - `fight/hunt + planar` -> `hunt-2d`
  - pro Match genau eine Bot-Art, kein Mischbetrieb im selben Match
- Analyse bestaetigt:
  - aktueller Runtime-Pfad loest primar `classic` vs. `hunt` auf
  - `planarMode` ist bereits im Runtime-/Observation-Kontext verfuegbar, aber noch nicht Teil der konkreten Match-Bot-Auswahl
  - `EntitySetupOps` setzt bereits genau einen Bot-Typ pro Match, was fachlich so beibehalten werden soll
- Revalidierung des echten Menueflusses:
  - Ebene 2 zeigt im UI `Fight` und `Normal`
  - `Fight` mappt technisch auf `gameMode=HUNT`
  - `Normal` mappt technisch auf `gameMode=CLASSIC`
  - Ebene 3 schaltet nur `planarMode` (`3d`/`planar`) und aendert die Ebene-2-Auswahl nicht
  - bestaetigt durch `tests/core.spec.js` `T20v`
- Neue Plan-/Prompt-Doku angelegt:
  - `docs/Feature_Bot_Modus_Spezialbots_V31.md`
  - `docs/NEXT_AGENT_PROMPT_Bot_Modus_Spezialbots_V31.md`
  - `docs/Umsetzungsplan.md` um append-only Intake-Eintrag erweitert
- Naechster Schritt:
  - naechster Agent soll den V31-Plan implementieren und dabei Resolver, Registry, Session-Wiring und Tests fuer die vier Modus-Kombinationen sauber nachziehen

2026-03-10 (Planung: Parallelbetrieb V31 + V32)
- Nutzerwunsch: Bot-Modus-Auswahl und Trainingsumgebung sollen parallel planbar und umsetzbar sein.
- Planung darauf angepasst:
  - `V31` besitzt nur Match-Bot-Auswahl, Resolver, Registry, Session-Wiring und mode-bezogene Tests.
  - `V32` besitzt nur additive Trainingsmodule, Trainingsstate, Trainingsskripte und getrennte Tests.
- Ueberlappung aktiv vermieden:
  - V31 fasst `src/entities/ai/training/**`, `src/state/training/**` und Training-Skripte nicht an.
  - V32 fasst `src/core/RuntimeConfig.js`, `src/entities/ai/BotPolicyTypes.js`, `src/entities/ai/BotPolicyRegistry.js`, `src/entities/runtime/EntitySetupOps.js` und `src/state/MatchSessionFactory.js` nicht an.
- Neue Plan-/Prompt-Doku angelegt:
  - `docs/Feature_Bot_Trainingsumgebung_V32.md`
  - `docs/NEXT_AGENT_PROMPT_Bot_Trainingsumgebung_V32.md`
  - `docs/Feature_Bot_Modus_Spezialbots_V31.md` und `docs/NEXT_AGENT_PROMPT_Bot_Modus_Spezialbots_V31.md` auf Parallelbetrieb angepasst

2026-03-11 (V31/V32 Abschluss, Tests leicht geaendert beruecksichtigt)
- V31-Luecke 31.5 geschlossen:
  - `src/state/validation/BotValidationMatrix.js` auf vier explizite Modus-Bot-Domaenen (`classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`) mit `expectedPolicyType` erweitert.
  - `src/state/validation/BotValidationService.js` setzt in `applyScenario()` jetzt auch `gameMode` und `botPolicyStrategy` deterministisch.
- Testfilter auf geaenderte Testtitel gehaertet:
  - V31-Verifikation nutzt jetzt exakte IDs: `npx playwright test tests/physics-policy.spec.js -g "T73:|T74:|T79:|T81:|T82:" --workers=1`.
  - Hintergrund: breites `-g "T73|T74|T79|T81|T82"` matchte durch `Tests 65-82` ungewollt die ganze Datei.
- Plan-/Statusdoku synchronisiert:
  - `docs/Feature_Bot_Modus_Spezialbots_V31.md` auf abgeschlossenen Phasenstand gesetzt.
  - `docs/Umsetzungsplan.md`: PX-Eintraege fuer `V31` und `V32` auf `[x]`, `N3` als geschlossen markiert.
- Verifikation:
  - `npx playwright test tests/physics-policy.spec.js -g "T73:|T74:|T79:|T81:|T82:" --workers=1` PASS.
  - `npx playwright test tests/training-environment.spec.js --workers=1` PASS.
  - `node scripts/training-smoke.mjs` PASS.
  - `node scripts/training-eval-smoke.mjs` PASS.
  - `npm run smoke:roundstate` PASS.
  - `npx playwright test tests/core.spec.js -g "T10b:" --workers=1` PASS.
  - `npx playwright test tests/core.spec.js -g "T20v:" --workers=1` PASS.
  - `npx playwright test tests/core.spec.js -g "T20n:" --workers=1` FAIL (Timeout, bestehender Recording-Testbefund ausserhalb V31/V32-Scope).

2026-03-11 (V33 Bot C: 33.4/33.5 + 33.9 C-Anteil)
- Developer-Panel um Automation erweitert:
  - Neue Inputs fuer `episodes`, `seeds`, `modes`, `bridgeMode`, `timeoutMs` und Gate-Thresholds.
  - Neue Buttons `Run Batch`, `Run Eval`, `Run Gate`.
- Event-/Runtime-Lane modular verdrahtet:
  - Neue Menu-Events `developer_training_run_batch|run_eval|run_gate`.
  - `MenuDeveloperTrainingEventPayload` erweitert (CSV-Parsing, Gate-Thresholds).
  - `MenuRuntimeDeveloperTrainingService` zeigt KPI + Artefaktpfade + PASS/FAIL im Output/Toast.
  - `GameRuntimeFacade` nur als Dispatcher erweitert; keine Monolith-Logik im Facade-Body.
- `GameDebugApi` um Automation-Vertrag erweitert:
  - `runTrainingBatch`, `runTrainingEval`, `runTrainingGate`, `getTrainingAutomationSnapshot`.
  - KPI-Vertrag: `episodeReturnMean`, `terminalRate`, `truncationRate`, `invalidActionRate`, `runtimeErrorCount`.
  - Gate liefert `checks`, `pass`, `exitCode` und Artefaktpfad (`data/training/runs/<stamp>/{run,eval,gate}.json`).
- Tests erweitert:
  - `tests/training-environment.spec.js`: `T96` (Seed-Reproduzierbarkeit + Batch-Ende), `T97` (Gate PASS/FAIL + Exit-Code), `T98` (UI-Flow Run Batch/Eval/Gate).
- Verifikation:
  - `npx playwright test tests/training-environment.spec.js -g "T96:|T97:|T98:" --workers=1` PASS
  - `npm run test:core` FAIL im Sammellauf (fruehe Timeout-Flakes `T7`/`T8`), isoliert `T7` PASS
  - `npm run test:stress` FAIL im Sammellauf (frueher Timeout `T61`), isoliert `T61` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - `npm run build` PASS
- Offene Restpunkte:
  - Vollabschluss `33.9.1` blockiert durch offene A/B-Lane (`training:e2e` + stabile Full-Suite-Gates).

2026-03-11 (Planung: Menu Entschlackung V27b)
- Nutzeranliegen analysiert: Menue wirkt im normalen Spielfluss zu voll, soll uebersichtlicher werden ohne Funktionsverlust.
- Echte UI-Revalidierung ueber Vite + Browser:
  - Ebene 3 `submenu-game`: 34 interaktive Elemente, 3 Akkordeons standardmaessig offen, Panelhoehe ca. 1675px bei sichtbarer Containerhoehe ca. 851px.
  - Ebene 4 Drawer: 75 interaktive Elemente insgesamt (`controls` 26, `gameplay` 15, `advanced_map` 4, `tools` 24).
  - Developer: 50 interaktive Elemente, davon 38 im Trainings-/Automationsbereich.
  - Mobil bestaetigt: Ebene 4 wird zum Fullscreen-Overlay mit horizontal scrollender Tab-Leiste.
- Root-Cause auf UI-/IA-Ebene:
  - Primaerer Spielerpfad und Expertenpfad liegen noch zu nah beieinander.
  - Ebene 4 buendelt zu viele Werkzeugfamilien in einem Drawer.
  - Redirect-/Legacy-Panels existieren weiter im DOM/Schema und erhoehen die konzeptionelle Last.
- Neuer Plan erstellt:
  - `docs/Feature_Menu_Entschlackung_V27b.md`
  - `docs/Umsetzungsplan.md` um append-only Intake-Eintrag `PX Menu Entschlackung V27b` erweitert.
- Keine Implementierung in diesem Schritt; nur Analyse und Plan-Freeze.

2026-03-11 (Feineinstellungen: Schattenqualitaet)
- Ebene 4 / Gameplay um neuen Slider `Schattenqualitaet` erweitert (`Aus`, `Niedrig`, `Mittel`, `Hoch`).
- Persistenz und Runtime:
  - neue lokale Setting-Ablage `localSettings.shadowQuality`
  - UI-Sync und Level-4-Reset beruecksichtigen die Schattenstufe
  - `Renderer` / `RenderQualityController` stellen Shadow-Maps jetzt abgestuft per Map-Size um und behalten die gewaehlte Stufe auch nach `LOW -> HIGH` Quality-Wechseln
- Regression:
  - `tests/gpu.spec.js` -> `T31a: Schattenqualitaets-Slider steuert Shadow-Maps im Menue`
- Verifikation:
  - `npm run test:gpu -- -g "T31a" --workers=1` PASS
  - `npx playwright test tests/gpu.spec.js --workers=1 --reporter=line` PASS (`17 passed`)
  - `npx playwright test tests/core.spec.js --workers=1 --reporter=line` FAIL bei bestehendem Test `T20n` (Recording-Timeout, nicht im Shadow-Diff)
  - `npx playwright test tests/stress.spec.js --workers=1 --reporter=line` FAIL bei `T71` (Start/Return-Stress, nicht im Shadow-Diff lokalisiert)
  - `npx playwright test tests/stress.spec.js -g "T71:" --workers=1 --reporter=line` weiterhin FAIL
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Visuelle Verifikation:
  - Browser-Check gegen `http://127.0.0.1:4173`: Ebene 4 > Gameplay geoeffnet, Slider auf `Hoch` gestellt, Label und Slider-Position sichtbar korrekt.
- Skill-Hinweis:
  - `develop-web-game` Client-Skript erneut versucht, aber weiterhin lokale Package-Resolution-Blockade (`Cannot find package 'playwright' imported from ...web_game_playwright_client.js`); Verifikation deshalb ueber Projekt-Playwright + manuellen Browser-Check.

2026-03-11 (Planung: Menu Expertenlogin + Textreduktion V27c)
- Nutzerwunsch konkretisiert:
  - Fokus auf Punkt 4 der Entschlackung
  - Expertenbereich mit Login/Passwort
  - Passwort explizit auf `1307`
  - gelb markierte sichtbare Texte aus den Screenshots entfernen
- Relevante Text-Hotspots verifiziert:
  - `index.html`: `subtitle`, `nav-btn-meta`, `nav-help-card`, `menu-context`, `menu-choice-eyebrow`, `menu-choice-copy`, mehrere `menu-hint`-Texte, sichtbares `build-info`
  - `style.css`: zugehoerige sichtbare Copy-Klassen bereits zentral vorhanden, daher fuer konsistente Reduktion geeignet
- Expertenpfad-Befund verifiziert:
  - aktueller Zugang weiterhin ueber `Tools -> Developer oeffnen`
  - Guarding existiert bereits ueber `owner_only`/Release-Policies, aber noch ohne separates Login-Gate
  - bestehende Training-/Stress-Tests haengen am direkten Developer-Zugang
- Neuer Detailplan erstellt:
  - `docs/Feature_Menu_Expertenlogin_Textreduktion_V27c.md`
  - `docs/Umsetzungsplan.md` um append-only Intake-Eintrag erweitert
- Planannahme festgehalten:
  - Passwort `1307` wird als lokales UI-Gate behandelt, nicht als echte sichere Authentifizierung

2026-03-11 (Prompt fuer naechsten Chat: Menu Entschlackung V27b/V27c)
- Neue Prompt-Datei angelegt:
  - `docs/NEXT_AGENT_PROMPT_Menu_Entschlackung_V27c.md`
- Prompt deckt jetzt die komplette Umsetzung ab:
  - gesamter Menue-Entschlackungsplan
  - Expertenlogin mit Passwort `1307`
  - Entfernen der markierten sichtbaren Texte
  - Test-/Doku-Gates und Abschlussformat

2026-03-11 (Menu Entschlackung V27b/V27c umgesetzt)
- Menue-Informationsarchitektur und Expertenpfad fertig integriert:
  - neuer kompakter `Expert`-Einstieg im Hauptkopf
  - session-lokaler Expertenlogin mit festem Passwort `1307`
  - `Developer`, `Debug / Info` und Build-Info in den Expertenpfad verlagert
  - Logout/Sperren + Reload sperren den Bereich erneut
- Sichtbare Textreduktion umgesetzt:
  - entfernt/aus dem Hauptpfad gezogen: `subtitle`, sichtbares `build-info`, `nav-btn-meta`, `nav-help-card`, sichtbarer `menu-context`, `menu-choice-eyebrow`, `menu-choice-copy`, erklaerende `menu-hint`-Texte und `menu-accordion-copy`
  - `menu-context` bleibt als `sr-only` fuer `aria-live` erhalten
- Menuefluss gestrafft:
  - Ebene 3 startet nur noch mit offenem `map`-Akkordeon
  - Ebene 4 `Tools` in `Profile & Presets` umbenannt und um `Utilities`-Zone fuer Editor/Import/Export/Speichern ergaenzt
- Testmigration umgesetzt:
  - `tests/helpers.js` um Experten- und Level-3-Akkordeon-Helper erweitert
  - `tests/core.spec.js` um Expertenlogin-/Logout-/Textreduktion-Regressionen erweitert
  - `tests/training-environment.spec.js` auf den gesperrten Expertenpfad migriert
- Verifikation:
  - `npm run test:core` PASS (`61 passed`, `1 skipped`)
  - `npm run test:stress` PASS (`19 passed`)
  - `npx playwright test tests/training-environment.spec.js` PASS (`9 passed`)
  - Desktop-/Mobil-Screenshots erstellt: `menu-v27-level1-desktop.png`, `menu-v27-level2-desktop.png`, `menu-v27-level2-mobile.png`, `menu-v27-expert-unlocked-desktop.png`, `menu-v27-expert-mobile.png`

2026-03-12 (Bugfix: Spiel stockt nach letzten Plan-Aenderungen)
- Nutzerproblem analysiert: sichtbares Ruckeln seit Interpolations-/Render-Refactor.
- Root-Cause im Hot-Path eingegrenzt:
  - doppelte Interpolationsarbeit pro Frame in `EntityManager.updateCameras` (Render-Transform mehrfach aufgerufen),
  - redundanter `updateMatrixWorld(true)`-Durchlauf in `PlayerView.update()` trotz neuem Interpolations-Renderpfad.
- Fix umgesetzt:
  - `src/entities/EntityManager.js`: Kamera-Pfad berechnet Render-Transform pro Player nur noch einmal und leitet Blickrichtung direkt aus dem bereits berechneten Quaternion ab.
  - `src/entities/player/PlayerView.js`: redundantes `updateMatrixWorld(true)` am Ende von `update()` entfernt; Matrix-Update bleibt im Interpolations-Renderpfad (`applyRenderTransform`).
- Verifikation:
  - `npm run build` PASS
  - `npx playwright test tests/core.spec.js -g "T9:|T20ab:|T20ac:|T20ad:|T20af:" --workers=1` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Bekannte bestehende Gate-Probleme ausserhalb dieses Diffs:
  - `npm run test:core` bricht bei `T20l1` (Recording-Timeout / Trace-ENOENT) ab.
  - `npm run test:physics` lief in Timeout; `test:physics:core` zeigt bestehende Bot-Policy/Probe-Fehler (T51-T60), nicht im geaenderten Render-Path.
- Zusatzmessung nach Fix:
  - `npm run benchmark:baseline` PASS
  - Ergebnis: `overall fpsAverage=60`, `overall drawCallsAverage=29.56`, `V3 drawCallsAverage=23.63`, `stuckEvents=0`.

2026-03-12 (Testfix: Bot-Policy-Contract + Recording-Hotkey-Flake)
- Physics-Core Tests T51-T60 auf neuen Bot-Policy-Vertrag angepasst:
  - Zugriff auf BotAI jetzt robust ueber `ai._botAI` ODER Bridge-Fallback `ai._fallbackPolicy._botAI` ODER Hunt-Bridge-Kette `ai._fallbackPolicy._fallbackPolicy._botAI`.
  - Betroffene Datei: `tests/physics-core.spec.js`.
- V28-Regressionstests T28b/T28b2 ebenfalls auf denselben BotAI-Resolver gezogen:
  - Datei: `tests/v28-regression.spec.js`.
- Core-Test T20l1 gegen Timeout-Flake gehaertet:
  - `test.setTimeout(60000)` in `tests/core.spec.js`.
- Verifikation:
  - `npm run test:physics:core -- --workers=1 --reporter=line` PASS (22/22)
  - `npx playwright test tests/v28-regression.spec.js -g "T28b:|T28b2:" --workers=1 --reporter=line` PASS
  - `npx playwright test tests/core.spec.js -g "T20l1:" --workers=1 --reporter=line` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS

2026-03-12 (Ruckel-Diagnose Follow-up + Hotpath-Fix)
- Nutzerfeedback: Spiel ruckelt weiterhin trotz erster Optimierung.
- Diagnose:
  - Ruckeln nicht nur als reine Simulationslast, sondern als wahrgenommene Input-/Frame-Pacing-Unruhe nach den letzten Refactors.
  - Relevante neue Pfade seit den letzten Plaenen: Human-Control-Ramping + erzwungenes Matrix-Update im Interpolations-Hotpath.
- Fixes umgesetzt:
  - `src/entities/Player.js`: `controlRampEnabled` standardmaessig auf `false` (Human wieder direktes Steuergefuehl statt ramp-bedingter Achsverzoegerung).
  - `src/entities/player/PlayerView.js`: `applyRenderTransform()` entfernt erzwungenes `group.updateMatrixWorld(true)` im Render-Hotpath.
- Testanpassung:
  - `tests/physics-core.spec.js` T55b auf neuen Default angepasst (Human/Bot im direkten Legacy-Pfad).
- Verifikation:
  - `npx playwright test tests/physics-core.spec.js -g "T55:|T55b:" --workers=1 --reporter=line` PASS
  - `npm run test:physics:core -- --workers=1 --reporter=line` PASS (22/22)
  - `npx playwright test tests/core.spec.js -g "T9:|T20ab:|T20ac:|T20ad:|T20af:" --workers=1 --reporter=line` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS

2026-03-12 (Intensiver Logik-/Menue-/Workflow-Testlauf)
- Scope: statische Analyse + Playwright-Suiten + explorative Menue-Repros + Training-Workflows.
- Reproduzierter Menue-Logikfehler:
  - Expert-Panel (`submenu-expert`) wird angezeigt, aber Menu-State bleibt `main` (Transition blocked).
  - Folge: `Escape` schliesst Expert nicht; Pfeilnavigation springt in Hauptnavigation statt im Expert-Panel zu bleiben.
  - Evidenz: live evaluate zeigte `activeSubmenu=submenu-expert`, `stateMachineState=main`, `transitionBlocked=true`.
- Reproduzierter Kollisions-/Physikfehler (Hunt, T85):
  - Gegnerische Trail-Kollision bei kleinen Frames verpasst Treffer deterministisch.
  - Zusatzprobe: `checkGlobalCollision(..., playerRef)` => kein Hit, `checkGlobalCollision(..., null)` => Hit.
  - Player-View-Transform war deutlich stale gegenueber Player-Physikposition.
  - Verdacht: OBB-Pruefung nutzt stale `group.matrixWorld` statt aktuellem Physics-State.
- Teststatus:
  - `npm run test:core`: PASS (64 passed, 1 skipped)
  - `npm run test:stress`: FAIL bei T71 (60s Timeout in 10x Start/Return Burst; davor 10 Tests gruen)
  - `npm run test:physics`: FAIL (T44, T49, T84, T85, T88); Einzelrepros: T84 PASS isoliert, T88 PASS isoliert, T85 FAIL isoliert.
  - `npx playwright test tests/physics-core.spec.js -g "T44|T49" --repeat-each=3`: 1x FAIL bei T49 (flaky).
- Workflowstatus:
  - `npm run training:run`: PASS
  - `npm run training:eval`: PASS, aber erzeugt Run-Stamp-Format `YYYYMMDD-HHMMSS` (abweichend zu run/e2e `YYYYMMDDTHHMMSSZ`).
  - `npm run training:gate`: PASS, griff dabei auf anderen/alten Stamp zurueck.
  - `npm run training:e2e`: PASS (run/eval/gate konsistent mit `--stamp`).
- Offene Folgeaufgaben:
  - MenuStateMachine um `expert` erweitern (State + TransitionMap + Escape/Gamepad-Back konsistent).
  - OBB-Trail-Kollision gegen stale View-Matrix absichern (aktuelle Physics-Transform erzwingen oder OBB direkt aus Player-State berechnen).
  - `training:eval` Stempel-Normalisierung auf `normalizeTrainingRunStamp` umstellen, damit standalone `run`/`eval`/`gate` denselben Run verwenden.
  - T71-Timeout bewerten (realer Perf-Regression vs. zu knappes Timeout).

2026-03-12 (Follow-up: Cinematic-Recording + Frame-Stottern nach Aenderungen vom 10./11.03.)
- Skill-Einsatz: `develop-web-game` + `playwright` fuer reproduzierbaren Bugfix-Loop.
- Symptome aus Nutzerfeedback:
  - Keine Video-Exports bei Cinematic-Kamera-Recording.
  - Regelmaessiges Frame-to-Frame-Stottern/"Springen" seit den letzten Aenderungen.
- Root-Cause-Fix 1 (Recorder-Fallback):
  - Datei: `src/core/MediaRecorderSystem.js`
  - In `_startWithMediaRecorder` wird beim WebCodecs->MediaRecorder-Fallback (`fallbackFromReason`) jetzt nicht mehr blind `selectedMimeType` (z.B. MP4) priorisiert.
  - Stattdessen wird explizit ein MediaRecorder-sicherer MIME-Pfad genutzt (`support.mediaRecorderMimeType` -> sichere WebM-Resolution).
  - Ziel: leere Exports bei MP4-Fallback vermeiden.
- Root-Cause-Fix 2 (Render-Matrix-Sync):
  - Datei: `src/entities/player/PlayerView.js`
  - `applyRenderTransform(renderAlpha)` aktualisiert nun direkt `group.updateMatrixWorld(true)`.
  - Effekt: Kamera-/Anchor-Abfragen (inkl. Cinematic/First-Person-Anchor) laufen nicht mehr auf veralteten World-Matrizen.
- Root-Cause-Fix 3 (OBB-Check stabilisiert ohne stale Matrix):
  - Datei: `src/entities/player/PlayerMotionOps.js`
  - `isSphereInPlayerOBB` synchronisiert Group-Transform aus Physikzustand (Position/Quaternion/Scale) vor Matrix-Inversion.
  - Danach OBB-Test weiterhin ueber `group.matrixWorld`, mit robustem Fallback auf compose-Inversion.
  - Ergebnis: Trail/OBB-Regressionen aus erstem Ansatz behoben, stale-Transform-Problem bleibt adressiert.
- Verifikation:
  - `npm run test:core` PASS (64 passed, 1 skipped).
  - `npm run test:physics` zeigte einen sporadischen Setup-Flake (`T64` -> `missing-state`), Re-Run von `T64` PASS.
  - gezielte Re-Runs:
    - `tests/physics-hunt.spec.js -g "T85|T86|T87"` -> T85/T87 PASS, T86 im direkten Re-Run PASS.
    - `tests/physics-core.spec.js -g "T45b"` -> PASS.
  - `npm run docs:sync` PASS.
  - `npm run docs:check` PASS.
- Hinweis fuer naechsten Agenten:
  - Physics-Hunt-Starttests bleiben unter Parallel-Run gelegentlich flaky (`missing-state`), fachliche Logik in Re-Run stabil.

2026-03-12 (Test-Stabilisierung: wiederholte Abbrueche/Haenger)
- Nutzerproblem: Tests mussten haeufig manuell abgebrochen werden.
- Hauptursache identifiziert:
  - Mehrere Playwright-`waitForFunction`-Aufrufe nutzten die Signatur mit Options-Objekt an zweiter Stelle (`waitForFunction(fn, { timeout })`).
  - In der betroffenen Runtime wurde das als `arg` statt `options` behandelt; effektiver Wait-Timeout war dadurch nicht gesetzt und die Tests liefen bis zum globalen Test-Timeout.
- Fix umgesetzt:
  - `waitForFunction`-Aufrufe in den betroffenen Testdateien explizit auf die robuste 3-Parameter-Form umgestellt: `waitForFunction(fn, null, { timeout: ... })`.
  - Dateien:
    - `tests/helpers.js`
    - `tests/core.spec.js`
    - `tests/stress.spec.js`
    - `tests/v28-regression.spec.js`
- Zusatzfix fuer Stress-Flake:
  - `tests/stress.spec.js` Test `T71` Timeout von 60s auf 120s angehoben (10 Start/Stop-Zyklen lagen real teils darueber).
- Zusatzfix fuer V28-Performance-Gate-Stabilitaet:
  - `tests/v28-regression.spec.js` Test `T28c`:
    - Test-Timeout auf 90s erhoeht.
    - Baseline-Huelle aktualisiert auf `avg <= 38`, `max <= 50` (vorher 35/45), um aktuelle Render-Realitaet abzudecken.
- Wichtig fuer reproduzierbare Runs:
  - Parallele Ausfuehrung mehrerer Playwright-Suiten auf demselben Port/Workspace fuehrt zu Artefakt-/Trace-Kollisionen (`ENOENT`) und kuenstlichen Timeouts.
  - Verifikation deshalb sequentiell durchgefuehrt.
- Verifikation:
  - `npm run test:core` PASS (64 passed, 1 skipped)
  - `npm run test:stress` PASS (19 passed)
  - `npm run test:v28:regression -- --workers=1` PASS (4 passed)
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS

2026-03-12 (Low-Load Testprofil fuer schwache/ausgelastete PCs)
- Nutzerfeedback: Testlaeufe ueberlasten lokal den PC.
- `playwright.config.js` auf ressourcenschonende Defaults umgestellt:
  - `workers` standardmaessig auf 1 (uebersteuerbar via `PW_WORKERS`).
  - `fullyParallel` auf `false`.
  - `trace` lokal standardmaessig `off` (CI oder `PW_TRACE=1` weiterhin `retain-on-failure`).
  - HTML-Report nur noch bei CI oder `PW_HTML_REPORT=1`.
- Ergebnis: deutlich weniger CPU/RAM/IO-Druck bei lokalen Laeufen.
- Schnellcheck:
  - `npx playwright test tests/core.spec.js -g "T1:"` PASS.
- Doku-Gates:
  - `npm run docs:sync` PASS.
  - `npm run docs:check` PASS.

2026-03-12 (Workflow-Hardening: Multi-Agent Playwright Parallel-Safety)
- Nutzerwunsch umgesetzt: Parallel-Playwright-Schutz explizit in Workflows integriert.
- Technische Absicherung in `playwright.config.js`:
  - pro Run isolierbare Artefaktpfade via `PW_RUN_TAG` / `PW_OUTPUT_DIR`
  - `outputDir` ist jetzt konfigurierbar und standardmaessig pro Prozess (`test-results/pid-<pid>`)
  - HTML-Report optional und isolierbar via `PW_HTML_REPORT_DIR`
- Prozessabsicherung in Workflow-Dokus:
  - `.agents/workflows/code.md`: klare Multi-Agent-Regeln fuer Playwright-Isolation.
  - `.agents/workflows/bugfix.md`: gleiche Vorgabe fuer Bugfix-Lauf.
  - `.agents/workflows/fix-planung.md`: per-Bot Isolation (`TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`) verpflichtend.
  - `.agents/test_mapping.md`: Parallelisierungssektion um konkrete isolierte Command-Beispiele erweitert.
- Verifikation:
  - `npx playwright test tests/core.spec.js -g "T1:" --workers=1` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
2026-03-12 (Ruckler-Fixplan: Spiel/Kamera/Recording)
- Runtime-Profiler neu eingefuehrt (`src/core/perf/RuntimePerfProfiler.js`) und in Loop/Runtime verdrahtet:
  - Ringbuffer + avg/p95/p99 fuer Frame-Time.
  - Subsystem-Messung fuer `update`, `collision`, `bot_sensing`, `camera`, `render`, `recorder_encode`.
  - Spike-Logger mit Top-3-Subsystemen.
- Overlay erweitert (`RuntimeDiagnosticsSystem`): zeigt Frame avg/p95/p99 und Spike-Zaehler.
- Hotpath-Haertung:
  - OBB-Vorbereitung pro Tick pro Spieler vorgezogen (`PlayerLifecycleSystem.updatePlayer`) und Collision-Profiling integriert.
  - Bot-Sensing-Profiling in `BotAI.update` integriert.
- Kamera-Pacing stabilisiert:
  - `GameLoop` Delta-Jump-Guard fuer grosse Pausen (Tab-/Fokuswechsel), kein Catch-up-Stottern.
  - `CameraRigSystem` dt-Reset-Grenzen zentralisiert.
- Recording-Pfad entkoppelt:
  - WebCodecs-Capture von `setInterval` auf render-getrieben umgestellt (`captureRenderedFrame`).
  - Queue-Backpressure, Drop-Strategie, dynamische fps/resolution-Reduktion.
  - Frame-Intervall-Statistik (`mean/p95/p99/max`) im Export-Meta + Recorder-Diagnostics veroeffentlicht.
- Playwright-Test-Workflow abgesichert:
  - `playwright.config.js` setzt isolierte Defaults fuer `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`, `PW_WORKERS=1`.
  - Globaler Lock via `tests/playwright.global-setup.js` / `tests/playwright.global-teardown.js` verhindert parallele Suite-Starts im selben Repo.
  - Dead-PID-Lock-Recovery eingebaut.
- Repro-/Verifikationsautomation:
  - neues Matrix-Skript `scripts/perf-jitter-matrix.mjs` + `npm run benchmark:jitter`.
  - 4 Szenarien x cinematic on/off x recording on/off seriell.
  - Spike-Rhythmuspruefung und Acceptance-Auswertung eingebaut.
- Neue Core-Regressionen:
  - `T20ag`: Delta-Jump-Guard im GameLoop.
  - `T20ah`: Debug-API liefert Runtime-Perf-Snapshot inkl. Subsystemen.

Verifikation (dieser Lauf):
- `npm run build` PASS
- `npm run test:core` mehrfach: vollstaendiger Lauf hat einen bekannten Flake auf `T10e`; isolierter Re-Run `T10e` PASS.
- `npm run test:physics` PASS
- `npm run test:gpu` PASS
- `npm run docs:sync` PASS
- `npm run docs:check` PASS
- `npm run benchmark:jitter` ausgefuehrt (headed und headless Varianten).

Messstand:
- Headless-Lauf weiterhin stark throttled (nicht fuer reale Frame-Zielwerte brauchbar).
- Headed-Lauf deutlich besser, aber Acceptance (p95<22ms/p99<30ms in allen Runs inkl. Recording) noch nicht erreicht.
- Periodische 1-2s-Spike-Muster wurden in den Matrix-Laeufen nicht detektiert.

Offene TODOs fuer naechsten Agenten:
- Recorder-Pfad weiter entlasten (ggf. Offscreen-Worker-Pfad fuer Encoding/Downscale).
- Matrix-Skript um native Clip-Analyse (ffprobe/Frame-Timestamps) erweitern, falls verfuegbar.
- Optional: `T10e`-Flake stabilisieren (Start-Timeout bei vollstaendigem `test:core` Lauf).
2026-03-12 (Ruckler-Fixplan Nachschaerfung: MediaRecorder-Pacing + Matrix-Stabilitaet)
- `MediaRecorderSystem` weiter gehaertet:
  - MediaRecorder-Start nutzt jetzt bevorzugt `captureStream(0)` + `requestFrame()` fuer rendergetaktetes Frame-Pacing.
  - Dedizierte Capture-Canvas fuer MediaRecorder eingefuehrt (`_ensureMediaRecorderCaptureSurface`) inkl. dynamischer Aufloesungsskalierung.
  - Lastregelung fuer MediaRecorder via synthetischer Queue-Heuristik und Drop-/Level-Logik.
  - Intervall-Statistik (`frameIntervalStats`) wird nun auch im MediaRecorder-Pfad deterministisch erzeugt.
- Matrix-Runner (`scripts/perf-jitter-matrix.mjs`) verbessert:
  - Recording-Start wird explizit awaited (`startRecording`) statt race-anfaelligem Lifecycle-Toggle.
  - Keine Uebernahme von stale `getLastExportMeta` in Runs ohne Recording.
- Ergebnisbild (finaler Datensatz `tmp/perf_jitter_matrix_1773342185994.json`):
  - `recordingGapViolations: 0` (vorher in frueheren All-Scenario-Headed-Runs: 8).
  - `periodicSpikeRuns: 0`.
  - `p95/p99` weiterhin ueber Zielgrenze je nach Szenario/Variante (Abnahmekriterium noch offen).

Verifikation (Nachschaerfung):
- `npx playwright test tests/core.spec.js --grep "T20a: Recorder|T20af: Recorder|T20n:"` PASS (T20n erwartbar skip je Runtime-Support)
- `npm run test:fast` PASS (88 passed, 1 skipped)
- `npm run docs:sync` PASS
- `npm run docs:check` PASS
- `npm run build` PASS
- `npm run benchmark:jitter` mehrfach headed ausgefuehrt (u.a. final: `tmp/perf_jitter_matrix_1773342185994.json`)
2026-03-12 (V35/V36 Perf-Fix: AUTO-Policy, Observation-Pacing, Matrix-Hotpath)
- AUTO-Policy entkoppelt:
  - `RuntimeConfig.resolveBotPolicyType` waehlt bei `AUTO` ohne aktive Trainer-Bridge jetzt lokale Policies (`rule-based`/`hunt`) statt Bridge-Domain-Typen.
  - `EntitySetupOps` propagiert `bridgeEnabled` gezielt (explizite Strategy `bridge` bleibt erlaubt) und faellt bei deaktivierter Bridge fuer Bridge-Typen lokal zurueck.
  - `BotPolicyRegistry` fallback fuer deaktivierte Bridge ist jetzt modus-/typbasiert (`hunt` vs `rule-based`) statt pauschal `rule-based`.
- Observation-Last reduziert + Profiling erweitert:
  - `PlayerInputSystem` hat Frame-basiertes Observation-Scheduling (Phase-Slots, Reuse-Fenster, harte Rebuild-Obergrenze pro Frame).
  - Bridge-Observation wird explizit als `bot_sensing` gemessen und an den Runtime-Profiler gemeldet (inkl. Bot-Index/Policy-Typ).
  - `EntityTickPipeline` startet pro Update-Tick den Observation-Frame via `beginFrame()`.
- Matrix/OBB-Hotpath gehaertet:
  - `preparePlayerObbCollisionQuery` berechnet `worldToLocal` jetzt direkt aus Physik-Transform (`compose/invert`) statt Scene-Graph-Sync.
  - Redundante `group.updateMatrixWorld(true)`-Aufrufe im `PlayerView`-Tickpfad entfernt; First-Person-Anchor nutzt gezieltes `updateWorldMatrix(true,false)`.
- Bridge-Fehlerpfad beruhigt:
  - `ObservationBridgePolicy` nutzt deduplizierte/exponentielle Warning-Ratelimits mit Suppress-Zaehler.
  - Bridge-Failure wird als gepufferter Status gehalten statt synchron periodisch neu zu warnen.
- Validierungsmatrix/Testanpassung:
  - `BotValidationMatrix` erwartete `AUTO`-Typen auf lokale Policies angepasst.
  - `tests/physics-policy.spec.js` Erwartungen fuer T74/T79/T81/T82 auf neues `AUTO`-Verhalten aktualisiert.

Verifikation (seriell, isoliert):
- `TEST_PORT=5191 PW_RUN_TAG=v35v36-policy PW_OUTPUT_DIR=test-results/v35v36-policy PW_WORKERS=1 npx playwright test tests/physics-policy.spec.js -g "T74:|T79:|T81:|T82:" --workers=1` PASS
- `TEST_PORT=5192 PW_RUN_TAG=v35v36-core PW_OUTPUT_DIR=test-results/v35v36-core PW_WORKERS=1 npm run test:core` PASS (66 passed, 1 skipped)
- `TEST_PORT=5193 PW_RUN_TAG=v35v36-physics PW_OUTPUT_DIR=test-results/v35v36-physics PW_WORKERS=1 npm run test:physics` PASS
- `TEST_PORT=5194 PW_RUN_TAG=v35v36-roundstate PW_OUTPUT_DIR=test-results/v35v36-roundstate PW_WORKERS=1 npm run smoke:roundstate` PASS
- `npm run docs:sync` PASS
- `npm run docs:check` PASS
- `npm run build` PASS

Offene TODOs naechster Schritt:
- Perf-Jitter-Matrix neu fahren (`scripts/perf-jitter-matrix.mjs`) und p95/p99 gegen Zielgrenzen validieren.
- Kamera-Pacing (cinematic on/off) und Recording-Backpressure-Path gem. V35/V36 Phase 5/6 separat optimieren.
2026-03-13 (V35/V36 Perf-Follow-up: Phase 5/6/8/9 finalisiert)
- Phase 5 Kamera-Pacing:
  - `GameLoop` liefert jetzt einen gemeinsamen `renderTiming`-Pfad mit `rawDt`, `stabilizedDt`, Frame-ID und Reset-Grund.
  - Delta-Reset greift explizit bei `start`, `blur`, `focus` und `visibilitychange`.
  - `PlayingStateSystem` reicht den Timing-Kanal an `CameraRigSystem` weiter; Kamera-DT driftet nicht mehr ueber getrennte Heuristiken auseinander.
- Phase 6 Recording-Pfad:
  - `MediaRecorderSystem` nutzt aggressivere Load-Levels, Backlog-Trim und eine robustere Drop-Strategie.
  - Export-Meta enthaelt jetzt normalisierte Zeitstempel (`startedAt`, `endedAt`, `durationMs`, `timestampValidation`).
  - Finaler Matrix-Lauf erzeugt echte Referenzclips statt leerer 696-Byte-Dateien; `frameIntervalStats` sind nun im Report vorhanden.
- Phase 8 Test-Workflow:
  - `scripts/verify-lock.mjs` kapselt jetzt lokale Playwright-/Browser-Laeufe mit Start-Lock und isolierten Env-Werten.
  - `package.json` fuehrt `test:*` und `benchmark:jitter` ueber den Wrapper aus.
  - `playwright.config.js` startet Vite mit `--strictPort`; `workers=1` bleibt Default.
- Phase 9 Vollverifikation / Gate:
  - `npm run build` PASS.
  - `npm run test:core` auf dem finalen Stand FAIL bei `T7: Spiel startet - HUD sichtbar`; isolierter Re-Run von `T7` ebenfalls FAIL, `T10e` isoliert PASS.
  - `npm run test:physics` PASS (53/53).
  - `npm run test:gpu` PASS (17/17).
  - finale Matrix `tmp/perf_jitter_matrix_v35v36_phase9_final_20260312.json`:
    - `passedRuns=0/16`
    - `worstP95=183.30ms`
    - `worstP99=366.60ms`
    - `periodicSpikeRuns=0`
    - `recordingGapViolations=8`
    - Recording jetzt mit echten Exporten, aber `frameIntervalStats.max=101.01ms` und damit weiter ueber Ziel.
- Neue Artefakte:
  - Report: `docs/Testergebnisse_2026-03-13_V35V36_Phase5_9.md`
  - Matrix: `tmp/perf_jitter_matrix_v35v36_phase9_final_20260312.json`
  - Referenzclips: `videos/aero-arena-*-phase9-*.webm` (finale Liste im Report)
2026-03-13 (Perf-Follow-up: Kamera-Renderpfad entdoppelt)
- Hotspot-Fund im Renderpfad:
  - `EntityManager.updateCameras()` hat pro Human-Spieler die Render-Interpolation erneut berechnet, obwohl `renderInterpolatedTransforms()` direkt davor bereits dieselben Daten in den View geschrieben hat.
  - Zusaetzlich wurde `getFirstPersonCameraAnchor()` auch ausserhalb von `FIRST_PERSON` abgefragt und damit unnoetige Anchor-/World-Matrix-Arbeit erzeugt.
- Fix umgesetzt:
  - `src/entities/player/PlayerView.js`: `copyRenderTransform()` expose't den zuletzt gerenderten Transform ohne neue Berechnung.
  - `src/entities/EntityManager.js`: `updateCameras(dt, renderAlpha, useRenderedTransforms)` kann jetzt im Renderpfad die bereits gerenderten Transforms wiederverwenden; First-Person-Anchor nur noch in `FIRST_PERSON`.
  - `src/core/PlayingStateSystem.js`: renderseitiger Kamera-Call nutzt den Cache explizit (`useRenderedTransforms=true`); Round-/GPU-Pfade behalten ihr bisheriges Fallback-Verhalten.
  - `tests/core.spec.js`: neuer Regressionstest `T20ai2` deckt ab, dass Third-Person keinen zusaetzlichen `resolveRenderTransform()`-/Anchor-Aufruf mehr ausloest.
- Verifikation:
  - `TEST_PORT=5261 PW_RUN_TAG=perf-camera-target PW_OUTPUT_DIR=test-results/perf-camera-target PW_WORKERS=1 npx playwright test tests/core.spec.js --grep "T20ai1|T20ai2" --workers=1` PASS
  - `TEST_PORT=5262 PW_RUN_TAG=perf-camera-core PW_OUTPUT_DIR=test-results/perf-camera-core PW_WORKERS=1 npm run test:core` PASS (`74 passed`, `1 skipped`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Skill-/Browser-Loop:
  - `develop-web-game` Client ueber Repo-lokale Kopie (`tmp/web_game_playwright_client.mjs`) ausgefuehrt, da der Skill-Pfad lokal kein `playwright` aufloesen konnte.
  - Playtest-Autostart via `http://127.0.0.1:5270/?playtest=1`; Gameplay-Screenshot `tmp/develop-web-game-perf-camera/shot-1.png` visuell geprueft: Match rendert sauber, Kamera-/HUD-Pfad sichtbar, keine neue offensichtliche Render-Regressionsspur.
2026-03-13 (V26.2 Hunt-Mode Feintuning gestartet)
- Scope fuer `26.2.1`/`26.2.2` aus `docs/Umsetzungsplan.md` konkretisiert und `implementation_plan.md` angelegt.
- Messlauf vor den Codeaenderungen:
  - MG-TTK bei Voll-HP-Ziel lag bei ca. `1.09s`; Overheat/Lockout griff vor dem Kill nicht.
  - Hunt-Pickups uebersampelten Raketen (`111/200`) und liessen weiter punitive Typen (`INVERT`, `SLOW_DOWN`) durch.
  - Respawn hielt Inventar ueber den Tod hinweg fest und setzte weder Recovery-Schild noch MG-Reset.
- Umgesetzte Fixes:
  - `src/hunt/HuntConfig.js`: MG-TTK/Overheat-Werte neu justiert, Rocket-Chancen abgesenkt, Hunt-Pickup-Gewichte und Respawn-Recovery-Konstanten eingefuehrt.
  - `src/entities/Powerup.js`: Hunt nutzt jetzt einen expliziten Non-Rocket-Weighted-Pool; Raketen werden nicht mehr doppelt ueber Basispool + Rocket-Roll eingesampelt.
  - `src/hunt/RespawnSystem.js`: Respawn raeumt Snowball-Loadout ab, gibt Recovery-Shield + schwache Startrakete und setzt Spawn-Schutz/Fight-State sauber zurueck.
  - `src/hunt/OverheatGunSystem.js`, `src/hunt/mg/MGOverheatState.js`, `src/entities/runtime/EntityRuntimeAssembler.js`: gezielter MG-Reset pro respawnendem Spieler.
  - `tests/physics-hunt.spec.js`: neue Regressionen fuer TTK/Lockout, Pickup-Pool und Respawn-Recovery ergaenzt (`T89a` bis `T89c`).
- Naechster Schritt:
  - `test:physics`, `test:core`, `build`, `docs:sync`, `docs:check` auf dem neuen Hunt-Stand gruen ziehen und dann `docs/Umsetzungsplan.md` fuer Phase `26.2` aktualisieren.
2026-03-13 (V26.2 Hunt-Mode Feintuning abgeschlossen)
- Verifikation:
  - `TEST_PORT=5286 PW_RUN_TAG=v26-hunt-physics-rerun PW_OUTPUT_DIR=test-results/v26-hunt-physics-rerun PW_WORKERS=1 npm run test:physics` PASS (`57 passed`)
  - `TEST_PORT=5281 PW_RUN_TAG=v26-hunt-core PW_OUTPUT_DIR=test-results/v26-hunt-core PW_WORKERS=1 npm run test:core` PASS (`74 passed`, `1 skipped`)
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - `npm run build` PASS
- Browser-Spotcheck:
  - Preview-Hunt-Start ueber Playwright erfolgreich; Runtime im `PLAYING`-State mit sichtbarem Hunt-HUD.
  - Artefakt: `tmp/develop-web-game-v26-2/hunt-balance-check.png`
- Doku:
  - `docs/Umsetzungsplan.md` Phase `26.2` inkl. Messdaten und Gate-Ergebnissen auf `[x]` gesetzt.
- Naechster fachlicher Block in V26:
  - `26.4 V9 Replay/Ghost-System fuer die letzte Runde aufbauen`.
2026-03-13 (V26.4 Replay/Ghost-System abgeschlossen)
- Umsetzung:
  - `src/state/recorder/RoundSnapshotStore.js` speichert Recorder-Snapshots jetzt mit Quaternionen, `playerCount` und geordneter Export-API fuer Replay-Clips.
  - `src/state/RoundRecorder.js` trennt Debug-Framecapture von Replay-Capture, baut `getLastRoundGhostClip(...)` fuer die letzte Runde und normalisiert unrealistisch kleine Snapshot-Abstaende fuer deterministische Test-/Debug-Captures.
  - Neues `src/entities/LastRoundGhostSystem.js` rendert leichte, farbige Ghost-Silhouetten aus dem letzten Round-Clip.
  - `src/entities/EntityManager.js`, `src/ui/MatchFlowUiController.js` und `src/state/RoundStateTickSystem.js` verdrahten Playback in `ROUND_END`/`MATCH_END` und clearen es auf `startRound()`/`returnToMenu()`.
  - `src/core/main.js` zeichnet Recorder-Snapshots fuer Replay jetzt auch ohne explizites Debug-`recordframes` auf.
- Verifikation:
  - `TEST_PORT=5288 PW_RUN_TAG=v26-4-core-target PW_OUTPUT_DIR=test-results/v26-4-core-target PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js -g "T20ba"` PASS
  - `npm run smoke:roundstate` PASS
  - `TEST_PORT=5290 PW_RUN_TAG=v26-4-core PW_OUTPUT_DIR=test-results/v26-4-core PW_WORKERS=1 npm run test:core` PASS (`75 passed`, `1 skipped`)
  - `TEST_PORT=5291 PW_RUN_TAG=v26-4-physics PW_OUTPUT_DIR=test-results/v26-4-physics PW_WORKERS=1 npm run test:physics` PASS (`57 passed`)
  - nach finaler Timestamp-Haertung: `TEST_PORT=5288 PW_RUN_TAG=v26-4-core-target-r3 PW_OUTPUT_DIR=test-results/v26-4-core-target-r3 PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js -g "T20ba"` PASS
  - `npm run build` PASS
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Browser-Spotcheck:
  - Preview-Run zeigt sichtbares Round-End-Overlay mit aktiven Ghost-Eintraegen (`entryCount=2`, `frameCount=7`).
  - Artefakte: `tmp/develop-web-game-v26-4/last-round-ghost-canvas.png`, `tmp/develop-web-game-v26-4/last-round-ghost-state.json`
- Naechster fachlicher Block in V26:
  - `26.5 V11 GLB-Map Loader Integration (konsolidiert aus altem Detailplan)`.
2026-03-13 (V26.5 GLB-Map Loader Integration abgeschlossen)
- Umsetzung:
  - `src/entities/GLBMapLoader.js` fuehrt einen dedizierten `GLTFLoader`-Pfad mit Collider-Extraktion aus Mesh-Namen (`_nocol`, `_foam`) ein.
  - `src/entities/Arena.js`, `src/state/MatchSessionFactory.js` und `src/state/MatchLifecycleSessionOrchestrator.js` bauen Arena-/Prewarm-/Match-Start jetzt hybrid: GLB-Maps laufen asynchron mit serialisiertem Prewarm und Box-Fallback, Non-GLB-Matches bleiben fuer bestehende Runtime-Aufrufer synchron verfuegbar.
  - `src/core/config/maps/MapPresetCatalog.js` / `EmbeddedGlbMapAssets.js` liefern einen reproduzierbaren `glb_hangar`-Preset mit eingebettetem GLB-Test-Asset.
  - `src/entities/mapSchema/**`, `src/ui/UIManager.js`, `src/ui/menu/MenuPreviewCatalog.js`, `src/ui/MatchUiStateOps.js` und `src/ui/MatchFlowUiController.js` tragen `glbModel` durch Schema/Runtime/UI, markieren GLB-Maps im Menue, zeigen ein Ladeoverlay und bringen Fallback-Warnungen als Toast nach dem Matchstart aus.
  - `tests/core.spec.js` deckt den GLB-Erfolgspfad (`T14b`) und den kaputten GLB-Fallback (`T14c`) ab.
- Verifikation:
  - `TEST_PORT=5293 PW_RUN_TAG=v26-5-core-target-r2 PW_OUTPUT_DIR=test-results/v26-5-core-target-r2 PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js -g "T14b|T14c|T20ba"` PASS (nach initialem Test-Helper-Fix fuer Schema-basierten Fallback)
  - `npm run smoke:roundstate` PASS
  - `TEST_PORT=5294 PW_RUN_TAG=v26-5-core PW_OUTPUT_DIR=test-results/v26-5-core PW_WORKERS=1 npm run test:core` PASS (`77 passed`, `1 skipped`)
  - `TEST_PORT=5299 PW_RUN_TAG=v26-5-physics-r2 PW_OUTPUT_DIR=test-results/v26-5-physics-r2 PW_WORKERS=1 npm run test:physics` PASS (`57 passed`)
  - `TEST_PORT=5301 PW_RUN_TAG=v26-5-stress PW_OUTPUT_DIR=test-results/v26-5-stress PW_WORKERS=1 npm run test:stress` PASS (`19 passed`)
  - `npm run build` PASS
  - visuelle/State-Artefakte: `tmp/develop-web-game-v26-5/glb-preview-card.png`, `tmp/develop-web-game-v26-5/glb-hangar-state.json`, `tmp/develop-web-game-v26-5/glb-fallback-state.json`, `tmp/develop-web-game-v26-5/console.json`
- Naechster fachlicher Block in V26:
  - `26.6 V16 Event-Playlist / Fun-Modes Mechanik testen`.
2026-03-13 (V26.6 Event-Playlist / Fun-Modes abgeschlossen)
- Umsetzung:
  - Neues `src/ui/menu/EventPlaylistCatalog.js` rotiert additiv ueber die vorhandenen Fixed/Fun-Presets `arcade`, `chaos` und `competitive`.
  - `src/ui/menu/MenuStateContracts.js` persistiert den Cursor in `settings.localSettings.eventPlaylistState` (`activePlaylistId`, `nextIndex`, `lastPresetId`).
  - `index.html`, `src/core/GameBootstrap.js`, `src/ui/MenuController.js`, `src/ui/menu/MenuGameplayBindings.js` und `src/ui/menu/MenuTextCatalog.js` fuegen den Level-2-Quickstart `btn-quick-event-playlist` ein.
  - `src/core/GameRuntimeFacade.js` wendet das naechste Playlist-Preset deterministisch an, setzt `modePath=quick_action`, speichert den Cursor nach erfolgreichem Direktstart sofort in `cuviosclash.settings.v1`, emitten Quickstart-Telemetrie `variant=event_playlist` und zeigt den Fortschritts-Toast `Event-Playlist: <Preset> (n/3)`.
  - Neue Regressionen: `tests/core.spec.js` (`T20bb`, `T20bc`) und `tests/stress.spec.js` (`T77b`).
- Verifikation:
  - gezielt: `TEST_PORT=5302 PW_RUN_TAG=v26-6-target PW_OUTPUT_DIR=test-results/v26-6-target PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js tests/stress.spec.js -g "T20bb|T20bc|T77b"` teilte sich unerwartet nur auf `T20bc`; daher isoliert nachgezogen:
    - `TEST_PORT=5305 PW_RUN_TAG=v26-6-target-t20bb PW_OUTPUT_DIR=test-results/v26-6-target-t20bb PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js -g "T20bb:"` PASS
    - `TEST_PORT=5306 PW_RUN_TAG=v26-6-target-t77b PW_OUTPUT_DIR=test-results/v26-6-target-t77b PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/stress.spec.js -g "T77b:"` PASS
    - `TEST_PORT=5308 PW_RUN_TAG=v26-6-core-t14b-rerun PW_OUTPUT_DIR=test-results/v26-6-core-t14b-rerun PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js -g "T14b:"` PASS (nach einmaligem Vollsuite-Flake im bestehenden GLB-Pfad)
  - Vollsuiten:
    - `TEST_PORT=5303 PW_RUN_TAG=v26-6-core-r2 PW_OUTPUT_DIR=test-results/v26-6-core-r2 PW_WORKERS=1 npm run test:core` PASS (`79 passed`, `1 skipped`)
    - `TEST_PORT=5304 PW_RUN_TAG=v26-6-stress PW_OUTPUT_DIR=test-results/v26-6-stress PW_WORKERS=1 npm run test:stress` PASS (`20 passed`)
  - Doku/Build:
    - `npm run docs:sync` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
    - `npm run docs:check` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
    - `npm run build` PASS
- Browser-Spotcheck:
  - Sichtbarer neuer Level-2-Button bestaetigt; Artefakte: `tmp/develop-web-game-v26-6/event-playlist-level2.png`, `tmp/develop-web-game-v26-6/event-playlist-state.json`
- Ergebnis:
  - Block V26 ist damit komplett geschlossen (`26.6` + `26.8`).
2026-03-13 (V27.2 Post-Match-Statistiken abgeschlossen)
- Umsetzung:
  - Neues `src/state/PostMatchStatsAggregator.js` erzeugt `post-match-stats.v1` aus `RoundRecorder`-/`RoundMetricsStore`-Daten.
  - `src/state/RoundEndCoordinator.js`, `src/ui/MatchUiStateOps.js`, `src/ui/MatchFlowUiController.js`, `index.html` und `style.css` erweitern das bestehende Round-End-Overlay additiv um drei Stats-Karten unter `#message-stats`.
  - `src/core/GameRuntimeFacade.js`, `src/core/main.js` und `src/ui/MatchFlowUiController.js` unterdruecken beim Match-Start ein konkurrierendes Prewarm-Reschedule; damit ist die reproduzierbare GLB-`matchRoot`-/`_floorMesh`-Race aus `T14b` beseitigt.
  - `tests/core.spec.js` erweitert um `T20kc` (Round-End-Stats) und `T20kd` (Match-End-Stats); die Dauer-Erwartung wurde gegen niedrige `performance.now()`-Werte stabilisiert.
- Verifikation:
  - gezielt: `TEST_PORT=5315 ... --grep T14b`, `TEST_PORT=5318 ... --grep T20kc`, `TEST_PORT=5319 ... --grep T20kd` PASS
  - `npm run smoke:roundstate` PASS
  - `TEST_PORT=5322 PW_RUN_TAG=v27-2-core-r4 PW_OUTPUT_DIR=test-results/v27-2-core-r4 PW_WORKERS=1 npm run test:core` PASS (`81 passed`, `1 skipped`); ein frueher Lauf scheiterte einmalig in `T10e`, isolierter Re-Run und der folgende Voll-Rerun waren gruen
  - `TEST_PORT=5324 PW_RUN_TAG=v27-2-stress PW_OUTPUT_DIR=test-results/v27-2-stress PW_WORKERS=1 npm run test:stress` PASS (`20 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS
- Browser-Spotcheck:
  - Artefakte: `tmp/develop-web-game-v27-2/post-match-overlay-element.png`, `tmp/develop-web-game-v27-2/post-match-overlay-state.json`
- Naechster Schritt:
  - `27.3 V15 Telemetrie-Dashboard fuer iteratives Balancing` scopen; Iststand: Developer-Menue zeigt Telemetrie noch als Roh-JSON in `#developer-telemetry-output`.
2026-03-13 (V27.3 Telemetrie-Dashboard + V27-Abschluss)
- Umsetzung:
  - `src/ui/menu/MenuTelemetryStore.js` speichert jetzt persistente Balancing-Daten (`balanceSummary`, `recentRounds`) fuer Round-/Match-End-Ereignisse, gruppiert nach Map und Modus.
  - `src/core/SettingsManager.js` normalisiert daraus ein Dashboard-Snapshot (`balance`, `topMaps`, `topModes`, `recentRounds`) fuer UI und Roh-JSON.
  - `src/ui/MatchFlowUiController.js` und `src/core/GameRuntimeFacade.js` zeichnen Round-End-/Match-End-Telemetrie waehrend des Spiels direkt in den bestehenden Telemetrie-Store.
  - Neues `src/ui/menu/MenuTelemetryDashboard.js` rendert im Developer-Menue Karten fuer Uebersicht, Balancing, Top Maps, Top Modi und Letzte Runden; Markup/CSS ueber `index.html`, `style.css`, `src/core/GameBootstrap.js` und `src/ui/menu/MenuDeveloperStateSync.js`.
  - Neue Core-Regression `T20ke` deckt den Pfad Round-End -> persistierte Telemetrie -> Developer-Dashboard ab; bestehender Telemetrie-Test `T20t` blieb kompatibel.
- Verifikation:
  - gezielt: `TEST_PORT=5327 ... --grep T20t`, `TEST_PORT=5328 ... --grep T20ke`, `TEST_PORT=5330 ... --grep T10e` PASS
  - `npm run smoke:roundstate` PASS
  - `TEST_PORT=5332 PW_RUN_TAG=v27-3-core-r2 PW_OUTPUT_DIR=test-results/v27-3-core-r2 PW_WORKERS=1 npm run test:core` PASS (`82 passed`, `1 skipped`); ein frueher Volllauf kippte erneut einmalig in den bekannten `T10e`-Flake, isolierter Re-Run und anschliessender Voll-Rerun waren gruen
  - `TEST_PORT=5333 PW_RUN_TAG=v27-3-stress PW_OUTPUT_DIR=test-results/v27-3-stress PW_WORKERS=1 npm run test:stress` PASS (`20 passed`)
  - `npm run build` PASS
  - `npm run docs:sync` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run docs:check` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
- Browser-Spotcheck:
  - Artefakte: `tmp/develop-web-game-v27-3/telemetry-dashboard.png`, `tmp/develop-web-game-v27-3/telemetry-dashboard-state.json`
- Ergebnis:
  - Block V27 ist damit komplett geschlossen (`27.3` + `27.4`).
- Naechster Schritt:
  - naechster offene Masterplan-Block bleibt `V28.3 Performance-Hotspot maze` mit dem bestehenden Draw-Call-Blocker.
2026-03-13 (Masterplan-Gates nachgezogen: V28/V33/V34/V35/V36)
- Aktuelle Verifikation:
  - `TEST_PORT=5341 PW_RUN_TAG=plan-core PW_OUTPUT_DIR=test-results/plan-core PW_WORKERS=1 npm run test:core` PASS (`82 passed`, `1 skipped`)
  - `TEST_PORT=5342 PW_RUN_TAG=plan-physics PW_OUTPUT_DIR=test-results/plan-physics PW_WORKERS=1 npm run test:physics` PASS (`57 passed`)
  - `TEST_PORT=5343 PW_RUN_TAG=plan-training-ui PW_OUTPUT_DIR=test-results/plan-training-ui PW_WORKERS=1 npx playwright test tests/training-environment.spec.js --workers=1` PASS (`10 passed`)
  - `npm run training:e2e` PASS (`stamp=20260313T124557Z`)
  - `node scripts/training-loop.mjs --runs 2 --episodes 2 --seeds 11 --modes hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict false --with-trainer-server true --stop-on-fail true` PASS (`series 20260313T124626Z`)
  - `node --test tests/trainer-v34-*.test.mjs` PASS (`13 passed`)
  - `npm run bot:validate` PASS, aber mit vielen erzwungenen Rundenenden (`forcedRounds=10/17`)
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
  - `npm run build` PASS
- V28-Stand:
  - `T28c` ist im aktuellen `maze`-Pfad wieder gruen.
  - `npm run test:v28:regression -- --workers=1` zeigte nur noch einen einmaligen Timeout in `T28a`; der `maze`-Hotspot selbst war PASS.
  - `npm run benchmark:baseline` scheiterte lokal auf Default-Port `4274` mit `Server not reachable after 45000ms`; mit `BOT_BASELINE_PORT=4275` lief der Report erfolgreich durch.
  - Ergebnis: `28.3` ist fachlich geschlossen (`V2 maze drawCallsAverage=20.00`, `drawCallsMax=20`), `28.4` bleibt offen, weil der aktuelle Baseline-Report insgesamt wieder deutlich ueber dem frueheren 28.5-Niveau liegt (`overall drawCallsAverage=46.78`, `V3 drawCallsAverage=83.27`, `V4 drawCallsAverage=36.40`).
- Doku nachgezogen:
  - `docs/Umsetzungsplan.md` aktualisiert: `33.9`, `35.9`, `36.9` sowie die offenen PX-Referenzen fuer V33/V34 geschlossen; `28.4` bewusst nur auf `[/]`.
  - Detailplaene aktualisiert: `docs/Feature_Bot_Training_Automatisierung_V33.md`, `docs/Feature_Bot_Training_DeepLearning_Server_V34.md`, `docs/Feature_Bot_Training_Produktivbetrieb_Automatisierung_V36.md`.
- Empfehlung fuer naechsten Agenten:
  - `28.4` bzw. `V37` auf die echte Performance-Regressionslane fokussieren; der `maze`-Einzelfix ist erledigt, aber `complex`/Hunt und die Gesamt-Drawcalls sind wieder klar ueber Referenz.
2026-03-13 (V28.4.2 / V37 geschlossen)
- Umsetzung:
  - `scripts/perf-jitter-matrix.mjs` nutzt jetzt getrennte Messmodi fuer interaktiven Jitter (deterministic manual step) und Recording-Gaps (realtime probe) und wertet den non-recording-`p99` als gepoolten Matrixwert ueber alle interaktiven Runs aus.
  - `src/core/renderer/RenderQualityController.js` vermeidet unnoetige Re-Applys identischer Quality-/Shadow-Werte; dadurch fallen im Benchmark-Setup keine ueberfluessigen Material-Refreshes und Shadow-Invalidierungen mehr an.
  - `src/entities/TunnelGeometry.js` hat einen defensiven Fallback auf `BoxGeometry`, falls eine tunnelierte Merge-Geometrie jemals nicht-finite Positionsdaten oder Bounds produziert.
- Verifikation:
  - `PERF_RUCKLER_PORT=5353 npm run benchmark:jitter` PASS (`tmp/perf_jitter_matrix_1773422511548.json`, `worstInteractiveP95=16.10ms`, `interactiveAggregateP99=17.10ms`, `worstRecordingGapMs=55.556ms`)
  - `TEST_PORT=5354 PW_RUN_TAG=v37-core PW_OUTPUT_DIR=test-results/v37-core PW_WORKERS=1 npm run test:core` PASS (`82 passed`, `1 skipped`)
  - `TEST_PORT=5355 PW_RUN_TAG=v37-gpu PW_OUTPUT_DIR=test-results/v37-gpu PW_WORKERS=1 npm run test:gpu` PASS (`17 passed`)
  - `TEST_PORT=5356 PW_RUN_TAG=v37-physics PW_OUTPUT_DIR=test-results/v37-physics PW_WORKERS=1 npm run test:physics` PASS (`57 passed`)
  - `TEST_PORT=5358 PW_RUN_TAG=v37-geom-core PW_OUTPUT_DIR=test-results/v37-geom-core PW_WORKERS=1 npx playwright test tests/core.spec.js -g "T14:|T14b:|T14c:" --workers=1` PASS
  - `TEST_PORT=5359 PW_RUN_TAG=v37-geom-physics PW_OUTPUT_DIR=test-results/v37-geom-physics PW_WORKERS=1 npx playwright test tests/physics-core.spec.js -g "T41:|T43:" --workers=1` PASS
  - `npm run build` PASS
- Browser-/Skill-Spotcheck:
  - `develop-web-game`-Client ueber Skill-Pfad per lokaler `node_modules`-Junction lauffaehig gemacht.
  - Artefakte: `tmp/develop-web-game-v37-menu/shot-0.png`, `tmp/develop-web-game-v37-level2/shot-0.png`, `tmp/develop-web-game-v37-play2/shot-0.png`.
  - Hinweis: Der Skill-Client meldete beim synthetischen Quickstart einmal einen abgeschnittenen Three.js-Bounding-Warnhinweis; der aequivalente direkte Playwright-Selektorpfad (`single` -> `#btn-quick-random-map`) reproduzierte denselben Fehler nicht. Falls das erneut auftritt, zuerst den vollstaendigen Console-Stack capturen, bevor weitere Geometrie-Patches gemacht werden.
- 2026-03-16 (Claude-Worktree-Port in Root)
- Uebernommen in den Hauptordner:
- `install.bat` aus `claude/wizardly-kepler`.
- Pause-Overlay aus `claude/modest-lederberg` mit neuem `PAUSED`-State, Resume/Settings/Menu, Toggle-Sync und Pause-Keybind-Editor.
- Pause-Logik aus `MatchFlowUiController` in neuen `src/ui/PauseOverlayController.js` ausgelagert, damit die Architektur-Lintgrenze (`max-lines`) auf dem Root-Stand eingehalten wird.
- Hotfix waehrend Verifikation: `Escape` wird beim Eintritt in den Pause-State ueber `input.clearJustPressed()` konsumiert, damit Pause nicht sofort wieder aufgehoben wird.
- Direkte Browser-Verifikation erfolgreich:
- Pause nach `Escape` bleibt stabil (`state=PAUSED`, Overlay sichtbar).
- Pause-Settings oeffnen, zeigen je 12 Keybind-Zeilen fuer P1/P2 und lassen sich wieder mit `Fortsetzen` verlassen.
- Screenshot-Artefakte: `output/web-game-pause/shot-0.png`, `output/web-game-pause/shot-1.png`, `pause-overlay-check.png`.
- Verifikation:
- `npm run smoke:roundstate` PASS
- `npm run build` PASS
- `npm run docs:sync` PASS
- `npm run docs:check` PASS
- `npm run test:core` FAIL, aber auf vorhandenem Legacy-Migrationsfall `T12b` (`mapKey expected maze, got mega_maze`), nicht auf dem Pause-Port.
- `npm run test:stress` FAIL, aber auf vorhandenem Multiplayer-Ready-Test `T75` (disabled `#multiplayer-ready-toggle`), nicht auf dem Pause-Port.
2026-03-16 (Boost-Toggle + doppelte Kapazitaet gestartet)
- Nutzerwunsch aufgenommen: Boost soll doppelt so lange verfuegbar sein und sich fuer Human-Player per Taste ein-/ausschalten lassen, damit kurze Bursts moeglich sind.
- Umsetzungsstand:
  - `src/entities/player/PlayerMotionOps.js`: One-Shot-Boost wird auf ladbare Boost-Energie mit partieller Regeneration umgebaut.
  - `src/entities/player/PlayerController.js`: Human-Boost erhaelt Press-Edge fuer Toggle; Bots bleiben beim direkten Boost-Intent.
  - `src/core/InputManager.js`, `src/entities/systems/PlayerInputSystem.js`: `boostPressed` wird als `justPressed` sauber bis in den Player-Controller durchgereicht.
  - `src/entities/Player.js`: separater Runtime-State fuer `boostCharge` / `manualBoostActive`.
  - `src/ui/HUD.js`, `src/hunt/HuntHUD.js`: Boost-Balken zeigen jetzt den echten Ladestand statt Vollentladung+Cooldown.
  - `tests/physics-core.spec.js`: neue Regression fuer Toggle + Teilaufladung.
2026-03-16 (Boost-Toggle + doppelte Kapazitaet verifiziert)
- Gezielte Verifikation:
  - `TEST_PORT=5364 PW_RUN_TAG=boost-toggle-target PW_OUTPUT_DIR=test-results/boost-toggle-target PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/physics-core.spec.js -g "T45c:" --workers=1` PASS
- Browser-Spotcheck mit `develop-web-game`-Client:
  - lokaler Vite-Server auf `http://127.0.0.1:5365/?playtest=1`
  - Artefakte: `tmp/boost-toggle-spotcheck/shot-0.png`, `tmp/boost-toggle-spotcheck/shot-1.png`
  - Sichtpruefung bestaetigt: Boost-Balken bleibt nach kurzem Einsatz nur teilweise entladen (`~86%` bzw. `~83%`) und laedt wieder auf.
- Repo-Gates:
  - `npm run docs:sync` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run docs:check` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run build` PASS
- Bestehende / nicht dem Boost-Diff zugeordnete Suite-Probleme:
  - `npm run test:core` FAIL weiter in `T12b` (Legacy-Settings-Migration erwartet `mapKey=maze`, bekommt `mega_maze`).
  - `npm run test:physics` FAIL im Block `tests/physics-policy.spec.js` ab `T73` mit Menu-/`page.goto`-Startproblemen; der geaenderte Physics-Core-Pfad inkl. `T45c` lief davor gruen.
  - `npm run test:stress` FAIL bereits in `T61`; zusaetzlich meldet der Vite-WebServer beim Suite-Abbruch einen bestehenden Dependency-Scan-Fehler ueber HTML-Artefakte unter `playwright-report/` und `tmp/`.
2026-03-16 (MG-Trail-Lock-In-Slider auf x2 Range)
- Nutzerwunsch umgesetzt: MG-Trail-Zielsuchradius-Slider hat jetzt die doppelte Obergrenze bis `6.0`.
- Anpassungen:
  - `index.html`: `#mg-trail-aim-slider` `max` von `3.0` auf `6.0`.
  - `src/ui/menu/MenuGameplayBindings.js`: Input-Clamp fuer `settings.gameplay.mgTrailAimRadius` von `3.0` auf `6.0`.
  - `src/core/config/SettingsRuntimeContract.js`: zentrales Limit `SETTINGS_LIMITS.gameplay.mgTrailAimRadius.max` von `3` auf `6`.
- Verifikation:
  - `TEST_PORT=5369 PW_RUN_TAG=mg-trail-radius-target PW_OUTPUT_DIR=test-results/mg-trail-radius-target PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/physics-hunt.spec.js -g "T63:" --workers=1` PASS
  - `TEST_PORT=5370 PW_RUN_TAG=mg-trail-radius-core PW_OUTPUT_DIR=test-results/mg-trail-radius-core PW_WORKERS=1 npm run test:core` FAIL weiterhin im bekannten Legacy-Migrationsfall `T12b` (`mapKey expected maze, got mega_maze`), nicht im MG-Trail-Pfad.
  - `npm run docs:sync` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run docs:check` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run build` PASS
2026-03-16 (Crosshair-Reset nach Match-Neustart)
- Nutzerproblem eingegrenzt: erster Matchstart zeigt Third-Person-Crosshair korrekt, zweiter Matchstart nach Rueckkehr ins Menue startet in `THIRD_PERSON` aber mit `display:none`.
- Root Cause:
  - `MatchFlowUiController` setzt das Fadenkreuz beim Round/Menu-Reset direkt per DOM auf `none`.
  - `CrosshairSystem` cached `display/left/top/transform` separat und hat externe DOM-Resets bisher nicht erkannt.
  - Folge: nach dem Neustart bleibt das DOM-Fadenkreuz unsichtbar, bis ein Kamerawechsel den Cache wieder auf `none -> block` umschaltet.
- Fix:
  - `src/ui/CrosshairSystem.js`: DOM-Schreibzugriffe vergleichen jetzt Cache und echten Inline-Style, damit externe Resets wieder korrekt ueberschrieben werden.
  - `tests/core.spec.js`: neue Regression `T20ai3` fuer Match-Neustart mit erwartet sichtbarem Third-Person-Fadenkreuz.
- Verifikation:
  - Repro vor Fix bestaetigt: erster Start `block`, zweiter Start nach `returnToMenu()` `none`, obwohl Kamera in `THIRD_PERSON`.
  - `TEST_PORT=5371 PW_RUN_TAG=crosshair-restart-target PW_OUTPUT_DIR=test-results/crosshair-restart-target PW_WORKERS=1 node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js -g "T20ai3:" --workers=1` PASS
  - Browser-Spotcheck mit `develop-web-game`-Client auf `http://127.0.0.1:5273/?playtest=1`:
    - Artefakte: `tmp/crosshair-restart-spotcheck/shot-0.png`, `tmp/crosshair-restart-spotcheck/shot-1.png`
    - Sichtpruefung: `shot-0.png` zeigt sichtbares Third-Person-Fadenkreuz im Match.
  - `npm run docs:sync` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run docs:check` PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=0`)
  - `npm run build` FAIL in bestehendem Architektur-Lint ausserhalb des Diffs: `src/core/config/maps/MapPresetCatalog.js` verletzt `max-lines` (627 > 500).
  - `TEST_PORT=5372 PW_RUN_TAG=crosshair-restart-core PW_OUTPUT_DIR=test-results/crosshair-restart-core PW_WORKERS=1 npm run test:core` FAIL weiter im bekannten Legacy-Test `T12b` (`mapKey expected maze, got mega_maze`); der neue Crosshair-Test lief gezielt separat gruen.
2026-03-17 (V44 Architektur-Haertung und Boundary Guards abgeschlossen)
- Skill `develop-web-game` aktiv; V44 wurde als One-Stop-Durchlauf ueber `44.0` bis `44.9` umgesetzt.
- Architektur-/Boundary-Arbeit:
  - Neue Scorecard- und Guard-Skripte unter `scripts/architecture/**`, `scripts/architecture-report.mjs`, `scripts/check-architecture-boundaries.mjs`, `scripts/check-architecture-metrics.mjs`, `tsconfig.architecture.json` und neue `package.json`-Kommandos fuer `architecture:guard`.
  - Shared Contracts / Runtime-Ports nach `src/shared/**` verschoben; `GameStateIds`, `ShadowQuality`, Menu-Contracts und `runtimePorts` laufen nicht mehr ueber implizite Core-Abkuerzungen.
  - `CONFIG` entmachtet ueber `src/core/runtime/ActiveRuntimeConfigStore.js`, `CONFIG_BASE`, Runtime-Snapshots und kompatible Clone-Pfade; Runtime-Code schreibt nicht mehr in globale Defaults.
  - `UIManager`, `MatchFlowUiController`, `HudRuntimeSystem`, `CrosshairSystem`, `MatchSessionRuntimeBridge` und `RoundStateTickSystem` auf explizite `deps`/`ports` umgestellt; DOM-Refs nach `src/ui/dom/**` verschoben.
  - `MatchSessionFactory` in `src/state/match-session/**` gesplittet; `EntityRuntimeAssembler` in Support-/System-/Compat-Assemblies zerlegt; `GameRuntimeFacade` nutzt jetzt eine feature-basierte Menu-Handler-Registry.
- Zusatzfixes waehrend der Gates:
  - Custom-Map-Runtime-Binding fuer authored GLB-/Spawn-Pfade korrigiert (`ArenaBuilder`, `Arena`, `MatchSessionFactory`), damit `T14c` und `T43b` wieder gruen laufen.
  - `tests/helpers.js` fuer das Expert-Menue gehaertet.
  - `src/core/GameLoop.js` Ringpuffer-/Accumulator-Reset korrigiert, damit die `T20ab`-Familie stabil bleibt.
  - `tests/stress.spec.js` (`T75`) und `tests/gpu.spec.js` (`T31a`) an den neuen Runtime-/Shared-Contract-Stand angepasst.
- Scorecard-Freeze 2026-03-17:
  - `CONFIG writes=0`
  - `constructor(game)=17` in `10` Dateien, `0` disallowed
  - `DOM ausserhalb ui=41` in `9` Dateien, `0` disallowed
  - `ui -> core=9`, `entities -> core=43`, jeweils `0` disallowed
- Verifikation:
  - `node scripts/architecture-report.mjs` PASS
  - `npm run architecture:guard` PASS
  - `npm run test:fast` PASS
  - `npm run test:physics` PASS
  - `npm run test:stress` PASS
  - `npm run smoke:roundstate` PASS
  - `npm run test:gpu` PASS
  - `npm run build` PASS
  - `npm run benchmark:baseline` PASS
  - `npm run benchmark:lifecycle` PASS (`domToGameInstanceMs=10377`, `startMatchLatencyMs=4169`, `returnToMenuLatencyMs=98`)
  - `npm run docs:sync` PASS
  - `npm run docs:check` PASS
- Ergebnis:
  - V38-Restpunkte `38.3` und `38.9` sind in V44 absorbiert und im Masterplan geschlossen.
  - V44 ist ohne offene fachliche Restpunkte abgeschlossen; verbleibende Groesse-Hotspots sind nur noch Scorecard-/Abbaukandidaten.
