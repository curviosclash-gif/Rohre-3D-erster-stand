# Manuelle Testcheckliste Spiel

Stand: 2026-03-27

Ziel: moeglichst vollstaendige manuelle Regression fuer die aktuell sichtbaren und spielbaren Funktionen von CuviosClash.

Status-Empfehlung pro Punkt:
- `[ ]` offen
- `[x]` bestanden
- `[!]` Fehler gefunden
- `[-]` fuer diesen Lauf nicht relevant

Hinweise:
- Multiplayer benoetigt mindestens 2 Clients oder 2 Geraete/Fenster.
- Gamepad-, Touch-, Recording- und App-/Host-Checks nur ausfuehren, wenn die Umgebung verfuegbar ist.
- Arcade hat sichtbare Platzhalter-Flaechen. Dort ist ein korrekter Hinweis/Toast aktuell ein gueltiges Ergebnis.
- Recording-Hotkeys sind standardmaessig `F8` fuer Cinematic-Kamera und `F9` fuer Aufnahme Start/Stopp.

## 1. Boot, Laden, Grundzustand

- [ ] Spiel startet ohne White Screen, Endlos-Lader oder sichtbaren Runtime-Error-Overlay.
- [ ] Hauptmenue erscheint mit allen erwarteten Haupteintraegen.
- [ ] Erster Fokus ist sinnvoll gesetzt und Tastatur-Navigation im Menue funktioniert.
- [ ] Zurueck-Buttons fuehren immer in den erwarteten vorigen Zustand.
- [ ] Reload der Seite laedt den letzten persistierten Menuezustand statt eines kaputten Zwischenstands.
- [ ] Audio startet nach erster Nutzerinteraktion ohne haengenden Stummzustand.
- [ ] Kein UI-Element liegt dauerhaft falsch ueber anderen Menues oder ueber dem Spiel.

## 2. Hauptnavigation und Menue-Flows

- [ ] Wechsel zwischen `Match vorbereiten`, `Spielstil`, `Einstellungen`, `Steuerung`, `Profile`, `Portale / Map`, `Expert` funktioniert.
- [ ] Klick auf `Steuerung`, `Profile` und `Portale / Map` oeffnet sauber die passende Ebene-4-Sektion.
- [ ] `Ebene 4 oeffnen`, `Ebene 4 reset`, `Schliessen` funktionieren ohne UI-Dead-End.
- [ ] Menue bleibt nach mehrfacher Navigation konsistent; keine doppelt geoeffneten Drawer oder ueberlappenden Panels.
- [ ] Statusmeldungen/Toasts erscheinen lesbar und verschwinden wieder.

## 3. Session-Typen und Draft-Wechsel

- [ ] Wechsel `Single Player` -> `Splitscreen` -> `Multiplayer` funktioniert ohne verlorene UI-Kontrolle.
- [ ] Beim Session-Wechsel werden passende Drafts geladen und das Menue zeigt nachvollziehbar den geladenen Zustand.
- [ ] Rueckwechsel auf den vorherigen Session-Typ stellt den letzten gespeicherten Draft dieses Typs wieder her.
- [ ] Lokale Einstellungen wie Theme bleiben lokal und verhalten sich nicht wie Match-Regeln.

## 4. Schnellstart und Start-Level

- [ ] Schnellstart mit letzten Einstellungen startet direkt ein Match.
- [ ] Schnellstart mit Zufallsmap startet mit geaenderter, gueltiger Map.
- [ ] Event-Playlist-Start funktioniert oder liefert einen klaren Fehlerhinweis statt still zu scheitern.
- [ ] Preset-Chips `Arcade`, `Competitive`, `Chaos`, `Fight Standard`, `Normal Standard` sind anklickbar.
- [ ] Nach Preset-Anwendung aktualisieren sich sichtbare Match-Werte, Map, Bots und Modus wie erwartet.
- [ ] `Preset: ...`-Anzeige entspricht dem zuletzt aktivierten Preset oder zeigt wieder `custom`.

## 5. Start-Setup: Map, Fahrzeug, Theme, Bots

- [ ] Map-Suche filtert die Liste sinnvoll.
- [ ] Map-Filter aendert die angezeigten Eintraege plausibel.
- [ ] Map-Vorschau aktualisiert sich beim Wechsel.
- [ ] GLB-Maps sind im Menue klar als `[GLB]` erkennbar.
- [ ] Fahrzeug-Suche filtert die Fahrzeugliste sinnvoll.
- [ ] Fahrzeug-Filter aendert die angezeigten Eintraege plausibel.
- [ ] P1-Vorschau aktualisiert sich beim Fahrzeugwechsel.
- [ ] In Splitscreen aktualisiert sich auch die P2-Vorschau korrekt.
- [ ] Theme-Umschaltung `hell`/`dunkel` wirkt lokal und sofort.
- [ ] Bot-Anzahl, Bot-Schwierigkeit und `Siege zum Gewinn` lassen sich aendern und zeigen korrekte Labels.
- [ ] `Ebene 3 zurueckgesetzt` stellt Map, Theme und Fahrzeuge auf den erwarteten Reset-Zustand zurueck.

## 6. Startvalidierung und Fehlermeldungen

- [ ] Start mit gueltiger Map und gueltigem Fahrzeug funktioniert ohne Validierungsfehler.
- [ ] Ungueltige oder fehlende Map blockiert den Start mit klarer Feldmarkierung.
- [ ] Fehlendes Fahrzeug P1 blockiert den Start mit klarer Feldmarkierung.
- [ ] Im Splitscreen blockiert fehlendes Fahrzeug P2 den Start.
- [ ] Ungueltiges Theme blockiert den Start sauber.
- [ ] Feldhinweise oeffnen die passende Sektion und fokussieren das relevante Feld.
- [ ] Bei aktivem fixed preset werden gesperrte Startfelder als gesperrt erkennbar.

## 7. Ebene 4: Steuerung

- [ ] P1-Keybinds lassen sich anklicken und auf neue Tasten legen.
- [ ] P2-Keybinds lassen sich anklicken und auf neue Tasten legen.
- [ ] Globale Keybinds fuer Cinematic/Recording lassen sich aendern.
- [ ] `Taste druecken...`-Zustand endet sauber nach Eingabe.
- [ ] `Escape` bricht Key-Capture ohne Seiteneffekt ab.
- [ ] Konfliktwarnung erscheint bei Mehrfachbelegung sichtbar.
- [ ] `Standard-Tasten wiederherstellen` stellt Default-Belegung wieder her.
- [ ] Geaenderte Belegung bleibt nach Reload erhalten.

## 8. Ebene 4: Gameplay-Feineinstellungen

- [ ] `Geschwindigkeit` wirkt auf das Fluggefuehl.
- [ ] `Lenk-Empfindlichkeit` wirkt spuerbar und erwartbar.
- [ ] `Flugzeug-Groesse` wirkt sichtbar im Match.
- [ ] `Strahldicke` veraendert Trail-Breite.
- [ ] `Luecken-Groesse` und `Luecken-Haeufigkeit` veraendern das Trail-Verhalten sichtbar.
- [ ] `Item-Menge` beeinflusst Item-Dichte oder Item-Spawns.
- [ ] `Schussgeschwindigkeit` wirkt im Match spuerbar.
- [ ] `Lock-On Radius` wirkt bei Zielerfassung plausibel.
- [ ] `MG Trail-Zielsuchradius` wirkt in Fight/Hunt plausibel.
- [ ] `Fight Spieler-HP` ist nur im Fight-Kontext sichtbar/aktiv.
- [ ] `Fight MG Schaden` ist nur im Fight-Kontext sichtbar/aktiv.
- [ ] `Schattenqualitaet` wirkt sichtbar auf die Darstellung.
- [ ] `Recording-Profil` aktualisiert den Hint korrekt.
- [ ] `Recording HUD` aktualisiert den Hint korrekt.
- [ ] `Video-Perspektive` und `beruhigen` aktualisieren den Hint korrekt.
- [ ] `Auto-Roll`, `Invert Pitch P1/P2`, `Cockpit P1/P2` bleiben gespeichert und wirken im Match.

## 9. Ebene 4: Erweiterte Map-Einstellungen

- [ ] `Portale aktiviert` schaltet Portale im Match sichtbar ein/aus.
- [ ] `Anzahl Portale` wirkt auf die Map.
- [ ] `Anzahl Ebenen` wirkt auf planar/tunnel-lastige Maps plausibel.
- [ ] `Planar Modus` entfernt Pitch-Abhaengigkeit und veraendert die Bewegung erwartbar.

## 10. Ebene 4: Profile, Presets, Config-Share, Tools

- [ ] Profil unter neuem Namen speichern funktioniert.
- [ ] Gespeichertes Profil erscheint in der Liste.
- [ ] Profil laden stellt den gespeicherten Zustand sauber wieder her.
- [ ] Profil loeschen entfernt nur das ausgewaehlte Profil.
- [ ] Profil duplizieren erzeugt eine eigenstaendige Kopie.
- [ ] `Als Standard markieren` wirkt nach Reload.
- [ ] Profil-Export fuellt den Transfer-Bereich mit gueltigem Inhalt.
- [ ] Profil-Import aus gueltigem Inhalt funktioniert.
- [ ] Profil-Import aus ungueltigem Inhalt scheitert mit brauchbarer Rueckmeldung.
- [ ] Preset aus Katalog laden funktioniert.
- [ ] Open Preset speichern funktioniert.
- [ ] Fixed Preset speichern funktioniert nur in erlaubtem Kontext.
- [ ] Preset loeschen entfernt nur das ausgewaehlte Preset.
- [ ] Config-Export als Code funktioniert.
- [ ] Config-Export als JSON funktioniert.
- [ ] Config-Import aus gueltigem Code/JSON funktioniert.
- [ ] Config-Import aus kaputtem Inhalt liefert Fehlerhinweis statt UI-Bruch.
- [ ] `Einstellungen explizit speichern` speichert den aktuellen Zustand.
- [ ] `3D Map-Editor oeffnen` startet den Editor oder liefert einen sauberen Hinweis.
- [ ] `Vehicle-Editor oeffnen` startet den Editor oder liefert einen sauberen Hinweis.

## 11. Map-Abdeckung

- [ ] Mindestens eine Standard-Map startet fehlerfrei, z. B. `standard`.
- [ ] Mindestens eine Arena-/Kampfmap startet fehlerfrei, z. B. `maze` oder `complex`.
- [ ] Mindestens eine vertikale/komplexere Map startet fehlerfrei, z. B. `vertical_maze` oder `spiral_tower`.
- [ ] Mindestens eine Showcase-Map startet fehlerfrei, z. B. `showcase_nexus`.
- [ ] Mindestens eine thematische Spezialmap startet fehlerfrei, z. B. `neon_abyss` oder `crystal_ruins`.
- [ ] GLB-Map `glb_hangar` startet, zeigt Geometrie und hat brauchbare Kollision.
- [ ] Parcours-Map `parcours_rift` startet fehlerfrei.
- [ ] `custom`-Map funktioniert, wenn ueber Editor oder Import eine gueltige Custom-Map vorhanden ist.
- [ ] Spawnpunkte, Portale, Items und Kollisionsflaechen fuehlen sich auf jeder getesteten Map konsistent an.

## 12. Normal-/Classic-Match

- [ ] `Normal` setzt intern auf Classic und startet ohne Fight-/Respawn-Sonderlogik.
- [ ] Runde startet sauber aus dem Menue.
- [ ] Bewegung, Trail-Kollisionen und Rundengewinn fuehlen sich konsistent an.
- [ ] Sieger wird korrekt bestimmt und angezeigt.
- [ ] Neustart naechster Runde funktioniert ohne haengenden Zustand.
- [ ] Match-Ende nach `Siege zum Gewinn` funktioniert.
- [ ] Rueckkehr ins Menue nach Match-Ende funktioniert.

## 13. Fight-/Hunt-Match

- [ ] `Fight` setzt intern auf Hunt und aktiviert die Fight-spezifischen Optionen.
- [ ] Health-/Life-Anzeige ist sichtbar und passt zum eingestellten HP-Wert.
- [ ] MG feuert, trifft und verursacht nachvollziehbaren Schaden.
- [ ] Item-Schuesse funktionieren.
- [ ] Respawn funktioniert, wenn `hunt.respawnEnabled` aktiv ist.
- [ ] Respawn ist aus, wenn der Fight-/Preset-Zustand es verlangt.
- [ ] Killfeed / Hunt-HUD / Schaden-Feedback erscheinen im richtigen Moment.
- [ ] Lock-Reticle und Zielverfolgung wirken plausibel.
- [ ] Mehrere schnelle Treffer oder dichte Trails fuehren nicht zu unfair/offensichtlich falschen Treffern.

## 14. Parcours

- [ ] `parcours_rift` zeigt Parcours-HUD an.
- [ ] HUD zeigt Route, `CP n/m`, Segment-/Finish-Zeit und Status.
- [ ] Richtige Checkpoint-Reihenfolge zaehlt Fortschritt hoch.
- [ ] Falsche Reihenfolge zaehlt keinen Fortschritt.
- [ ] Finish zaehlt nur nach kompletter gueltiger Sequenz.
- [ ] Siegergrund `Parcours abgeschlossen` erscheint korrekt im Ergebnis.
- [ ] Respawn/Crash setzt den Fortschritt gemaess Regelwerk sinnvoll zurueck.
- [ ] Parcours funktioniert sowohl solo als auch in 2P/Bot-lastigen Runs ohne sichtbaren HUD-Bruch.

## 15. Arcade

- [ ] `Arcade` setzt intern auf Classic und blockiert ungueltige Nicht-Parcours-Maps sauber.
- [ ] Start eines Arcade-Runs funktioniert ueber den Arcade-Button bzw. den Moduspfad.
- [ ] Seed-Anzeige ist sichtbar und plausibel.
- [ ] `Seed neu rollen` aendert den Seed und speichert ihn.
- [ ] `Seed als Challenge nutzen` zeigt die erwartete Rueckmeldung.
- [ ] HUD-Shell zeigt Score, Multiplikator, Sektor und Combo.
- [ ] Score steigt bei sinnvollen Aktionen.
- [ ] Combo und Multiplikator reagieren auf Kills/Events.
- [ ] Sektorwechsel funktioniert.
- [ ] Post-Run-Zeile zeigt den letzten Run mit Zeit, Map, Vehicle und Seed.
- [ ] Vehicle-Mastery-Zeile zeigt das aktive Airframe.
- [ ] Vehicle-Manager zeigt alle Schiffe an.
- [ ] Schiffwechsel aktualisiert den aktiven Arcade-Zustand.
- [ ] Upgrade-Slots lassen sich nur dann upgraden, wenn sie freigeschaltet/verfuegbar sind.
- [ ] Erfolgreiche Upgrades bleiben nach Reload gespeichert.
- [ ] `Replay (Platzhalter)` zeigt aktuell den erwarteten Platzhalter-Hinweis.
- [ ] `Daily Seed (Platzhalter)` zeigt aktuell den erwarteten Platzhalter-Hinweis.

## 16. HUD, Kamera, Pause, Overlays

- [ ] P1-HUD erscheint im Match korrekt.
- [ ] P2-HUD erscheint im Splitscreen korrekt.
- [ ] Fighter-HUD mit Horizon, Tape, Heading und Crosshair aktualisiert sich live.
- [ ] Boost-Bar reagiert auf Verbrauch und Regeneration.
- [ ] Life-Bar reagiert in Fight/Hunt auf Schaden.
- [ ] Lock-Reticle erscheint nur in passenden Situationen.
- [ ] Pause per Standardtaste funktioniert.
- [ ] `Fortsetzen`, `Einstellungen`, `Menue` im Pause-Overlay funktionieren.
- [ ] Pause-Einstellungen fuer Auto-Roll und Invert Pitch wirken nach Resume.
- [ ] Keybind-Editor im Pause-Menue funktioniert ebenso wie im Hauptmenue.
- [ ] Kein Overlay bleibt nach Match-Ende oder Rueckkehr ins Menue haengen.

## 17. Aufnahme, Cinematic-Kamera und Export

- [ ] `F8` schaltet die Cinematic-Kamera im Match sichtbar um.
- [ ] Nochmaliges `F8` schaltet sauber zurueck.
- [ ] `F9` startet eine Cinematic-Aufnahme, wenn der Browser Recording unterstuetzt.
- [ ] Zweites `F9` stoppt die Aufnahme und speichert/exportiert die Datei.
- [ ] Erfolgreiche Aufnahme liefert eine brauchbare Dateigroesse und keine leere Datei.
- [ ] Recording mit HUD `clean` enthaelt kein unerwuenschtes HUD.
- [ ] Recording mit HUD `with_hud` enthaelt die erwarteten HUD-Overlays.
- [ ] `YouTube Shorts` erzeugt ein vertikales Layout, sofern dieser Pfad aktiv genutzt wird.
- [ ] P1/P2 bleiben im Shorts-Layout stabil oben/unten zugeordnet.
- [ ] Fehlerfall ohne Recording-Support liefert einen klaren Hinweis statt Freeze.

## 18. Eingaben im Match

- [ ] Tastatursteuerung fuer P1 ist komplett spielbar.
- [ ] Im Splitscreen ist P2 gleichzeitig steuerbar.
- [ ] Kamera-Umschaltung im Match funktioniert.
- [ ] `Auto-Roll` an/aus ist klar spuerbar.
- [ ] `Invert Pitch` fuer P1/P2 wirkt korrekt.
- [ ] Cockpit-Kamera fuer P1/P2 laesst sich wahrnehmen und korrekt zurueckschalten.

## 19. Gamepad

- [ ] Gamepad wird nach Anstecken erkannt.
- [ ] Gamepad wird nach Abziehen sauber getrennt.
- [ ] Linker Stick steuert Pitch/Yaw.
- [ ] Rechter Stick bzw. Roll-Achse steuert Rollen.
- [ ] Boost-Button funktioniert.
- [ ] Item-Schuss, MG, Item-Nutzung, Item-Wechsel funktionieren.
- [ ] Pause-/Start-Button funktioniert.
- [ ] Gamepad und Tastatur stoeren sich nicht offensichtlich gegenseitig.

## 20. Touch

- [ ] Touch-UI erscheint nur auf Touch-Geraeten bzw. im Touch-Kontext.
- [ ] Touch-UI ist im Menue verborgen und erst im Match sichtbar.
- [ ] Virtueller Joystick steuert Pitch/Yaw nachvollziehbar.
- [ ] Buttons fuer Fire, Boost und MG reagieren auf Touch korrekt.
- [ ] Touch-UI verschwindet wieder nach Match-Ende.
- [ ] Layout ist auf Tablet/kleinerem Bildschirm noch bedienbar.

## 21. Multiplayer

- [ ] Multiplayer-Menue laesst sich oeffnen.
- [ ] `Spiel erstellen` ist nur sichtbar, wenn Hosting erlaubt ist.
- [ ] `Spiel beitreten` funktioniert ueber Code-Eingabe.
- [ ] Netzwerksuche/Discovery zeigt verfuegbare Hosts oder einen leeren, aber sauberen Zustand.
- [ ] Join mit ungueltigem Code liefert brauchbaren Fehlerhinweis.
- [ ] Host sieht Lobby-Code, Spielerliste und Host-IP plausibel.
- [ ] Joiner erscheint in der Lobbyliste des Hosts.
- [ ] Ready-Toggle funktioniert fuer jeden Teilnehmer.
- [ ] Matchstart ist blockiert, solange nicht alle ready sind.
- [ ] Matchstart ist blockiert, solange weniger als 2 Teilnehmer verbunden sind.
- [ ] Nur der Host darf starten.
- [ ] Host-Aenderungen an MatchSettings invalidieren Ready-Status der Clients.
- [ ] `Lobby verlassen` bringt beide Seiten in einen sauberen Menuezustand zurueck.
- [ ] Lobby voll (10 Spieler) liefert den erwarteten Fehler.
- [ ] Network-HUD zeigt Ping/Status/Spielerzahl sinnvoll an.
- [ ] Multiplayer-Runde laeuft ohne sofortige Desync-, Freeze- oder UI-Probleme.

## 22. Expert, Developer, Debug

- [ ] Expert-Pfad laesst sich oeffnen.
- [ ] Falsches Expert-Passwort wird abgewiesen, ohne das Menue zu zerstoeren.
- [ ] Korrektes Expert-Passwort schaltet Developer/Debug frei.
- [ ] `Sperren`/`Quick Lock` sperrt den Bereich wieder sauber.
- [ ] Developer-Modus Toggle wirkt sichtbar.
- [ ] Wechsel des Developer-Themes wirkt sichtbar.
- [ ] `Developer Zugriff` aendert die Sichtbarkeit entsprechend.
- [ ] `Fixed-Preset-Lock fuer Spieler erzwingen` wirkt auf editierbare Felder.
- [ ] `Session Actor` Wechsel wirkt auf Zugriffsrechte nachvollziehbar.
- [ ] `Release-Vorschau aktivieren` simuliert Developer-Off sauber.
- [ ] Textkatalog-Override setzt sichtbaren Text um.
- [ ] Textkatalog-Override loeschen stellt Originaltext wieder her.
- [ ] Developer-Hinweistext zeigt Scope/Session plausibel an.
- [ ] Debug-Panel zeigt Build-Information.
- [ ] `Build-Info kopieren` funktioniert.
- [ ] Hinweis `O` fuer FPS-Overlay funktioniert im Match.
- [ ] Hinweis `P` fuer Grafik-Toggle funktioniert im Match.

## 23. Developer Training und Telemetrie

- [ ] Training Reset liefert einen sauberen neuen Zustand.
- [ ] Training Step fuehrt genau einen Schritt aus und zeigt Ausgabe.
- [ ] Auto Step fuehrt mehrere Schritte aus und bleibt bedienbar.
- [ ] Batch-Konfiguration akzeptiert gueltige Seeds und Modes.
- [ ] `Run Batch`, `Run Eval`, `Run Gate` liefern Rueckmeldung statt still zu haengen.
- [ ] Training-Output wird aktualisiert.
- [ ] Telemetrie-Dashboard zeigt nach Nutzung Daten statt leerem Platz.
- [ ] Telemetrie-Ansicht bleibt bei Reload/persistierten Daten konsistent.

## 24. Persistenz, Robustheit, Regression

- [ ] Geaenderte Menuewerte bleiben nach Reload erhalten.
- [ ] Profile, Presets, Arcade-Upgrades und Session-Drafts bleiben nach Reload erhalten.
- [ ] Nach mehreren Matches hintereinander steigt kein offensichtlicher Speicher-/UI-Leak sichtbar an.
- [ ] Wiederholtes Starten/Verlassen von Matches fuehrt nicht zu doppelten HUDs, doppelten Toastern oder kaputten Inputs.
- [ ] Wechsel zwischen Menue, Match, Pause, Match-Ende und Menue funktioniert mehrfach hintereinander.
- [ ] Ungueltige Imports oder fehlende Netzwerk-/Recording-Unterstuetzung liefern Fehlertexte statt Absturz.

## 25. Empfohlene Abschlussrunde

- [ ] Ein kompletter Solo-Run in `Normal`
- [ ] Ein kompletter Solo-Run in `Fight`
- [ ] Ein kompletter Parcours-Run auf `parcours_rift`
- [ ] Ein kompletter Arcade-Run mit Seed-Wechsel und Vehicle-Check
- [ ] Ein kompletter Splitscreen-Run
- [ ] Ein kompletter Multiplayer-Run
- [ ] Ein Recording-Check mit `F9`
- [ ] Ein Expert-/Developer-Check
