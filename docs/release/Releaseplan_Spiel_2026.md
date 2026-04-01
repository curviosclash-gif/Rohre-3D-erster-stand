# Releaseplan Spiel 2026

Stand: 2026-03-27 (aktualisiert nach Codebase-Analyse)
Status: Entwurf
Owner: Codex
Ziel-Release-Fenster: KW22 2026 (Ende Mai) - verbindlich nach Phase-2-Scope-Freeze

## Ziel

Dieser Plan beschreibt, was bis zur Veroeffentlichung von `CuviosClash` noch erledigt werden sollte,
wo aktuell die groessten Probleme liegen und welche Entscheidungen den Release wahrscheinlicher
erfolgreich machen.

Der Plan basiert auf dem Repo-Stand vom 2026-03-27 und auf einer aktuellen lokalen Pruefung von:

- `npm run build`
- `npm run plan:check`
- `npm run docs:check`
- `npm run test:core`

## Kurzfazit

`CuviosClash` wirkt nicht mehr wie ein frueher Prototyp, sondern wie ein weit entwickeltes Spiel mit
echter Systemtiefe. Das Projekt ist technisch weit, aber noch nicht releasefertig.

Der groesste Engpass ist aktuell nicht fehlender Feature-Umfang, sondern:

1. fehlende Release-Sicherheit im Start-/Testpfad,
2. noch offene Persistenz-/Recording-Haertung,
3. ein zu breiter Scope im Verhaeltnis zur aktuellen Absicherung,
4. offene manuelle QA in mehreren releasekritischen Bereichen (0 von ~130 Checks bestanden),
5. fehlende Grundlagen fuer den Erstkontakt (kein Loading Screen, keine Musik, kein Audio-UI),
6. Sicherheitsluecken in Dependencies und unvollstaendige CI-Pipeline.

## Aktuelle Ausgangslage

### Positiv

- `npm run build` ist am 2026-03-27 lokal PASS.
- `npm run plan:check` ist am 2026-03-27 lokal PASS.
- `npm run docs:check` ist am 2026-03-27 lokal PASS.
- Fight/Hunt-Follow-up ist im aktiven Masterplan weitgehend geschlossen.
- Web- und App-Builds sind prinzipiell ueber vorhandene Skripte vorgesehen.

### Kritisch

- `npm run test:core` ist am 2026-03-27 lokal FAIL.
- Der Fehler tritt bereits in `T1: Seite laedt ohne JS-Fehler` auf.
- Der Boot-/Load-Pfad scheitert im Test-Helper an `page.goto('/')` nach zwei Versuchen mit Timeout.
- Solange dieser Punkt nicht stabil ist, fehlt ein verlaessliches Regressionsnetz.
- `npm audit` zeigt 5 Vulnerabilities (2x HIGH: Rollup Path Traversal, Flatted Prototype Pollution).
- CI-Pipeline (`.github/workflows/ci.yml`) fuehrt nur `test:core` aus, nicht `test:physics`, `test:stress`, `test:gpu`.
- Manuelle QA-Checkliste (`docs/qa/Manuelle_Testcheckliste_Spiel.md`) hat 0 von ~130 Punkten abgehakt.
- Kein Loading Screen / Splash Screen - Nutzer sieht bei langsamem Laden nichts.
- Kein Musik-/Soundtrack-System, keine Volume-Slider, keine Audio-Persistenz.
- Source Maps fuer Production-Builds fehlen - Crash-Stacks nach Release unlesbar.
- `localStorage` ist einziger Persistenz-Layer - Private Browsing oder Cache-Clearing loescht alle Spielerdaten.
- Kein `LICENSE`-File im Root, keine Privacy Policy, keine Terms of Service.
- Training-/Developer-UI-Code (20 KB Chunk) wird im Production-Build ausgeliefert.
- Bot-Qualitaet (Steckenbleiben, Balancing, Verhalten) ist kein explizites QA-Kriterium.
- Keine Browser-/Geraete-Kompatibilitaetsmatrix definiert.

### Offene aktive Release-Themen aus dem Masterplan

- V58: Persistenz-/Store-Konsolidierung, Recording-End-to-End-Smoke, Dead-Code-/Ownership-Cleanup.
- V60: Architektur-/Totcode-Konsolidierung, dormante Multiplayer-Pfade, Session-Typ-Mapping, Doppel-Orchestrierung - blockiert auf V58.99.
- V61: Arcade-Loop ist nur teilweise fertig; mehrere Kernmechaniken und UX-Schichten sind offen.
- V62: visueller Kamera-Smoke ist erledigt; finales Gate haengt noch an DoD.2 (`npm run test:core`, T7 Start/HUD sichtbar).

## Release-These

Der wahrscheinlich beste Release ist kein "alles gleichzeitig fertig"-Release, sondern ein klar
geschnittener `1.0-Release Candidate` mit einem starken, stabilen Kern.

Empfohlene Kernthese fuer `1.0`:

- `Classic/Normal` als leicht verstaendlicher Einstieg
- `Fight/Hunt` als markanter Feature-Modus
- `Parcours` als klarer Skill-/Challenge-Modus (Hinweis: Parcours ist kein eigenstaendiger GameMode im Code, sondern ein Checkpoint-Feature auf Classic-Basis mit spezialisierten Maps wie `parcours_rift`)
- stabiles Menu-, Settings-, Profil- und Recording-Verhalten

`Arcade` sollte nur dann als grosses Hauptfeature in `1.0` beworben werden, wenn der Gameplay-Loop
wirklich geschlossen ist. Falls das bis zum Release-Fenster nicht gelingt, ist eine saubere
Alternative sinnvoller:

- `Arcade` als Beta-/Preview-Feature in `1.0`, oder
- `Arcade` als klarer Post-Launch-Schwerpunkt fuer `1.1`

## Die groessten Probleme

### 1. Test- und Boot-Stabilitaet

Risiko:

- Wenn bereits `T1` im Core-Startpfad kippt, koennen viele spaetere Fehler nicht mehr sicher
  klassifiziert werden.

Auswirkung:

- Release-Gates sind weniger glaubwuerdig.
- Regressionen koennen sich verstecken.
- Das Team verliert Zeit in unsicherer Ursachenanalyse.

### 2. Persistenz und Zustandskonsistenz

Risiko:

- Unterschiedliche Persistenz-/Normalisierungswege zwischen Runtime, Menu und Arcade koennen zu
  inkonsistenten Einstellungen, Profilfehlern oder Datenverlust fuehren.

Auswirkung:

- Spieler erleben das Produkt als unzuverlaessig.
- Der Schaden fuer Vertrauen ist hoeher als bei einem kleineren Gameplay-Bug.

### 3. Arcade-Scope ist groesser als die aktuelle Produktreife

Offen sind unter anderem:

- echte Modifier-Effekte,
- Reward-/Intermission-Loop,
- Score-/Combo-HUD,
- Post-Run-Summary,
- Replay-Anbindung,
- End-to-End-Smoke fuer den vollstaendigen Loop.

Auswirkung:

- Arcade wirkt sonst wie ein angefangener Hauptmodus statt wie ein tragendes Release-Feature.

### 4. Manuelle QA ist noch nicht in Release-Sicherheit uebersetzt

Die Checkliste ist gut, aber viele Punkte sind noch offen:

- Boot
- Arcade
- Recording / Cinematic
- Gamepad
- Touch
- Multiplayer
- komplette End-to-End-Runs

Auswirkung:

- Das Projekt kann technisch "weit" sein und sich trotzdem fuer neue Spieler noch unfertig anfuehlen.

### 5. Go-to-Market ist angedeutet, aber noch nicht operationalisiert

Packaging existiert, aber ein kompletter Launch-Stream fehlt noch:

- klares Release-Messaging
- Trailer / Screenshots / Social-Clips
- Store-/Pitch-Text
- externe Playtests
- Day-1-Patchliste
- Post-Launch-Roadmap

### 6. Dependency-Sicherheit und CI-Abdeckung

Risiko:

- `npm audit` zeigt 2 HIGH-Vulnerabilities (Rollup Path Traversal, Flatted Prototype Pollution) und 3 MODERATE.
- Die CI-Pipeline fuehrt nur `test:core` aus. `test:physics`, `test:stress` und `test:gpu` laufen nicht automatisch.

Auswirkung:

- Build-Prozess hat bekannte Sicherheitsluecken.
- Regressionen in Physics, Stress und GPU werden erst manuell entdeckt.
- Falsche Sicherheit durch "CI ist gruen".

### 7. Fehlende Grundlagen fuer den Erstkontakt

Risiko:

- Kein Loading Screen / Splash Screen: Bei langsamen Geraeten sieht der Nutzer nichts waehrend das Spiel laedt.
- Kein Musik-/Soundtrack-System: SFX sind synthetisch vorhanden, aber es gibt keine Hintergrundmusik, keinen Volume-Slider in den Settings und keine Audio-Persistenz.
- Kein Source-Map-Setup fuer Production: Nach Release sind Crash-Stacks unlesbar.

Auswirkung:

- Der erste Eindruck wirkt unfertiger als das Spiel technisch ist.
- Musik ist fuer Spieler ein starkes Qualitaetssignal - fehlt sie komplett, wirkt das Spiel wie ein Tech-Demo.
- Post-Release-Debugging wird massiv erschwert.

### 8. V60 ist releasekritisch, aber nicht ausreichend adressiert

Risiko:

- V60 (Architektur-/Totcode-Konsolidierung) adressiert dormante Multiplayer-Pfade, Session-Typ-Mapping zwischen Menu-`multiplayer` und Runtime-`lan`/`online`, Doppel-Orchestrierung zwischen `main.js`, `GameRuntimeFacade`, `MatchFlowUiController` und `MenuMultiplayerBridge`.
- V60 ist blockiert auf V58.99 und wird im aktuellen Phasenplan nur indirekt erwaehnt.

Auswirkung:

- Ohne V60 bleiben tote Codepfade und inkonsistente Multiplayer-Wiring im Release-Build.
- Die Architektur-Guards koennen Blindspots haben fuer `server/**`, `electron/**`, `trainer/**`.

### 9. Sprach- und Lokalisierungsentscheidung fehlt

Risiko:

- Die gesamte UI ist hardcoded Deutsch. Es gibt ein `MenuTextCatalog`-System mit Override-Moeglichkeit, aber keine Multi-Language-Infrastruktur (kein i18next, kein Sprachwechsel-UI).

Auswirkung:

- Wenn das Spiel international beworben wird, ist die Sprachbarriere ein harter Blocker.
- Nachtraegliches Einbauen von i18n erfordert Aenderungen an fast allen UI-Dateien.

### 10. Accessibility ist nicht adressiert

Risiko:

- Keine Screen-Reader-Unterstuetzung (keine aria-Labels).
- Keine Farbenblind-Modi.
- Keine anpassbaren Textgroessen oder High-Contrast-Modi.

Auswirkung:

- Bestimmte Nutzergruppen koennen das Spiel nicht oder nur eingeschraenkt spielen.
- Je nach Zielplattform (z.B. Store-Richtlinien) kann fehlende Accessibility ein formaler Blocker sein.

### 11. Browser- und Geraete-Kompatibilitaet ist undefiniert

Risiko:

- Der Plan referenziert "Ziel-Hardware" und "Mittelklasse-Geraet", definiert aber nie konkret welche
  Browser (Chrome/Firefox/Safari/Edge), welche Mindest-Specs und welche Bildschirmgroessen unterstuetzt werden.

Auswirkung:

- QA kann nicht gezielt testen, weil die Zielmatrix fehlt.
- Store-Text und System-Requirements koennen nicht geschrieben werden.
- Safari/WebKit hat haeufig WebGL- und WebAudio-Eigenheiten - ohne Test ist das ein blindes Risiko.

### 12. localStorage als einziger Persistenz-Layer

Risiko:

- Private Browsing, Browser-Wechsel, Cache-Clearing oder Storage-Quota loeschen alle Spielerdaten
  (Profile, Arcade-Fortschritt, Settings, Presets).

Auswirkung:

- Spieler koennen Fortschritt unerwartet verlieren.
- Es gibt keinen Cloud-Save oder Export-Hinweis im normalen Spielfluss.

### 13. Rechtliche Grundlagen fehlen

Risiko:

- Kein `LICENSE`-File im Root (nur ISC in `package.json`).
- Keine Privacy Policy / Datenschutzerklaerung (Pflicht fuer Web-Release in der EU / DSGVO).
- Keine Terms of Service.
- CC0-Assets (`cc0/spaceship_pack/`) sind nicht formal als Attributions dokumentiert.
- Falls Store-Release (Steam, itch.io): Store-Richtlinien (Jugendschutz, Altersfreigabe) nicht adressiert.

Auswirkung:

- Web-Release ohne Privacy Policy kann in der EU abgemahnt werden.
- Store-Einreichung kann an fehlenden Rechtsdokumenten scheitern.
- Fehlende Lizenz-Datei macht den Open-Source-Status unklar.

### 14. Training-/Dev-Code im Production-Bundle

Risiko:

- Der `developer-ui` Chunk (20 KB) und Training-bezogene Module werden im Production-Build ausgeliefert.
- Das Developer-Panel ist hinter einem Expert-Passwort versteckt, aber der Code ist im Bundle.

Auswirkung:

- Unnoetige Bundle-Groesse.
- Potenzielle Sicherheits-/Cheat-Vektoren wenn Dev-Funktionen im Client liegen.
- Professioneller Eindruck leidet, falls Dev-UI versehentlich sichtbar wird.

### 15. Bot-Qualitaet als Erstkontakt-Risiko

Risiko:

- Bots sind fuer Singleplayer-Erstnutzer das primaere "Gegenueber".
- Die manuelle QA-Checkliste prueft keine Bot-Qualitaet (Steckenbleiben, unfaires Verhalten, Schwierigkeitsgrad).
- `bot:validate` existiert als Script, wird aber in keinem Sprint als Abnahme-Kriterium referenziert.

Auswirkung:

- Wenn Bots dumm wirken oder steckenbleiben, fuehlt sich das Spiel unfertig an - unabhaengig von der technischen Qualitaet.

### 16. Kapazitaets-/Ressourcenplanung fehlt

Risiko:

- Der Sprint-Plan hat Aufgaben, aber keine Zuordnung zu Personen oder verfuegbaren Stunden.
- Unklar, ob 1 Person, 2 Personen oder ein Team arbeitet.

Auswirkung:

- Sprint 3 (QA + Playtest + Blocker-Fixes in 2 Wochen) ist bei einem Solo-/Kleinteam kaum machbar.
- Ohne Kapazitaetsschaetzung sind die Sprint-Ziele nicht validierbar.

## Empfohlener 1.0-Scope

### Browser- und Geraete-Kompatibilitaetsmatrix

Vor dem Release muss definiert und getestet werden:

| Kategorie | Tier 1 (muss PASS) | Tier 2 (sollte PASS) | Nicht unterstuetzt |
| --- | --- | --- | --- |
| Browser | Chrome 120+, Edge 120+ | Firefox 120+, Safari 17+ | IE, alte Mobile-Browser |
| OS | Windows 10+, macOS 13+ | Linux (Ubuntu 22.04+) | ChromeOS, aeltere OS |
| GPU | WebGL 2.0 faehig | - | Nur Software-Rendering |
| Bildschirm | 1280x720 bis 2560x1440 | 4K, ultrawide | <720p |
| Eingabe | Tastatur + Maus | Gamepad, Touch | - |
| Electron | Windows NSIS | macOS DMG, Linux AppImage | - |

Hinweis: Safari/WebKit hat haeufig WebGL- und WebAudio-Eigenheiten. Falls Safari Tier 1 werden soll,
muss das explizit in Sprint 3 QA aufgenommen werden.

### Must-have fuer 1.0

- stabiler Boot und verlaessliche Core-Tests
- saubere Settings-/Profile-/Preset-Persistenz
- stabiler Singleplayer-Flow
- Fight/Hunt als voll verifizierter Feature-Modus
- Parcours als spielbarer und gut lesbarer Zusatzmodus (Map-basiert auf Classic-Engine)
- funktionierende Recording-/Cinematic-Basis
- verstaendliche Default-Erfahrung fuer neue Spieler
- Loading Screen / Splash Screen mit visuellem Feedback waehrend des Ladens
- `npm audit` ohne HIGH-Vulnerabilities
- CI-Pipeline erweitert um `test:physics` und `test:stress`
- Source Maps fuer Production-Builds aktiviert
- Sprachentscheidung: nur DE oder DE+EN fuer 1.0
- `LICENSE`-Datei im Root (passend zu ISC in `package.json`)
- Privacy Policy / Datenschutzerklaerung (mindestens als Link oder Seite)
- Bot-Qualitaets-Smoke: `npm run bot:validate` PASS als Release-Gate
- Browser-Kompatibilitaetsmatrix definiert und Tier-1-Browser getestet
- Developer-UI im Production-Build hinter Feature-Flag oder aus dem Bundle entfernt

### Should-have fuer 1.0

- Gamepad-Smoke und Desktop-Smoke
- externer kleiner Playtest
- bessere Post-Run-Kommunikation bei den Kernmodi
- Arcade in einem sichtbar verbesserten Zustand
- mindestens ein Musik-Track oder Ambient-Audio fuer den Erstkontakt
- Volume-Slider und Audio-Persistenz in den Settings
- Remote-Crash-Reporting (z.B. Sentry) fuer Post-Launch-Debugging
- PWA-Support (`manifest.json`, Service Worker) fuer Web-Retention
- Bundle-Size-Monitoring (z.B. `rollup-plugin-visualizer` im CI)

### Bewusst nicht in 1.0 (Won't-do)

- Accessibility (Screen-Reader, Farbenblind-Modi, anpassbare Textgroessen) - Post-launch oder 1.1
- Vollstaendige i18n-Infrastruktur mit Sprachwechsel-UI - Post-launch
- Spatial Audio / 3D-Sound-Positionierung - Post-launch
- Cloud-Save oder Server-seitige Persistenz - Post-launch
- Safari Tier-1-Support (falls nicht explizit priorisiert) - Post-launch

### Post-launch

- Arcade als tiefer Progression-/Replay-/Daily-Loop
- Multiplayer-Ausbau
- weitere Fahrzeuge, Maps, Events
- umfassendere Meta-Progression
- groessere Content-Drops
- Accessibility-Grundlagen (Aria-Labels, Farbenblind-Modus)
- Internationalisierung (i18n-Framework, Englisch als Mindest-Zweitsprache)
- Musik und erweitertes Audio-System

## Go/No-Go-Regeln

### Go nur wenn

- `build`, `plan:check`, `docs:check` und die relevanten Test-Suites stabil gruen sind
- `test:core`, `test:physics` und `test:stress` sind alle PASS (nicht nur `test:core`)
- `npm run bot:validate` ist PASS (Bot-Qualitaets-Smoke)
- `npm audit` zeigt keine HIGH-Vulnerabilities
- kein bekannter Blocker im Boot-/Startpfad offen ist
- Persistenz und Recording mindestens ueber End-to-End-Smokes abgesichert sind
- alle `1.0`-Kernmodi mindestens einen vollstaendigen manuellen Durchlauf bestanden haben
- die manuelle QA-Checkliste ist fuer alle `1.0`-Pfade vollstaendig abgearbeitet (nicht nur "existiert")
- der Release-Scope eingefroren ist
- Loading Screen ist implementiert und funktional
- Performance: Initiales Laden unter 5 Sekunden auf Ziel-Hardware, stabile 30+ FPS auf Mittelklasse-Geraet
- Version, Tag und Changelog sind vorbereitet
- `LICENSE`-Datei existiert im Root
- Privacy Policy ist erreichbar (als Datei, Seite oder Link)
- Tier-1-Browser aus der Kompatibilitaetsmatrix sind getestet
- Known-Issues-Liste ist dokumentiert und oeffentlich kommunizierbar

### No-Go wenn

- `test:core` weiterhin am Startpfad flaked oder rot ist
- `test:physics` oder `test:stress` nicht mindestens 3x hintereinander stabil PASS sind
- Nutzerdaten-/Settings-Persistenz noch unsicher ist
- Arcade als Hauptfeature beworben werden soll, obwohl der Loop sichtbar offen bleibt
- Multiplayer/Gamepad/Touch versprochen werden, ohne dass sie durch reale Checks abgesichert sind
- HIGH-Vulnerabilities in Dependencies offen sind
- der Haupt-Bundle ueber 1.5 MB liegt ohne dokumentierte Begruendung
- keine Privacy Policy vorhanden ist (EU-Pflicht)
- Bots in `bot:validate` durchfallen oder sichtbar steckenbleiben
- kein einziger externer Playtest stattgefunden hat

## Konkreter Phasenplan bis zur Veroeffentlichung

Die Phasen sind in 4 Sprints a 2 Wochen organisiert (siehe "4 x 2-Wochen-Sprints" weiter unten).

| Sprint | Wochen | Fokus | Gate |
| --- | --- | --- | --- |
| Sprint 1 | KW14-15 | Technische Stabilitaet | Tests stabil, Dependencies sicher, CI erweitert |
| Sprint 2 | KW16-17 | Scope-Freeze & Produktreife | Scope fixiert, Kernmodi verifiziert, Loading Screen |
| Sprint 3 | KW18-19 | QA & Playtest | Manuelle QA bestanden, Playtest-Feedback eingearbeitet |
| Sprint 4 | KW20-21 | RC & Launch | Release-Kriterien erfuellt, Go/No-Go-Entscheidung |

Jeder Sprint hat ein eigenes Gate mit klaren Abnahme-Kriterien und einer Eskalationsregel.

### Versioning und Hotfix-Strategie

- RC-Phase: Tags `v1.0.0-rc.1`, `v1.0.0-rc.2`, etc.
- Finaler Release: Tag `v1.0.0`, `package.json` Version `1.0.0`.
- Hotfixes nach Release: Patch-Commits direkt auf `main` (gemaess Projekt-Konvention), Version bump auf `1.0.1`, neuer Tag.
- Kein separater Release-Branch noetig (Single-Branch-Workflow gemaess CLAUDE.md).

## 4 x 2-Wochen-Sprints (Start: KW14, Ziel: KW22)

---

### Sprint 1: Technische Stabilitaet (KW14-15 / 31. Maerz - 11. April)

Motto: "Nichts Neues bauen - erst das Fundament reparieren."

#### Sprint-Ziel

Das Projekt hat ein glaubwuerdiges technisches Fundament: Tests laufen stabil,
Dependencies sind sicher, CI deckt die wichtigsten Suiten ab.

#### Woche 1 (KW14: 31. Maerz - 4. April)

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | `test:core` Startup-Timeout analysieren und beheben | `npm run test:core` ist 3x hintereinander PASS |
| P0 | `npm audit fix` fuer HIGH-Vulnerabilities (Rollup, Flatted) | `npm audit` zeigt 0 HIGH |
| P1 | CI-Pipeline erweitern: `test:physics` und `test:stress` aufnehmen | CI-Workflow fuehrt alle 3 Suiten aus |
| P1 | V58.3.2 Settings-/Profile-Contract starten | Contract-Entwurf liegt vor |
| P2 | Source Maps fuer Production in `vite.config.js` aktivieren | `dist/*.js.map` existiert nach `npm run build` |
| P2 | `LICENSE`-Datei im Root anlegen (ISC, passend zu `package.json`) | Datei existiert und ist korrekt |

#### Woche 2 (KW15: 7. - 11. April)

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | V58.3.2 und V58.3.3 abschliessen | Tasks `[x]` mit Evidence |
| P1 | V58.4 (Dead-Code-Guard, knip) abschliessen | Tasks `[x]` mit Evidence |
| P1 | V58.99 Integrations-Gate schliessen | `architecture:guard`, `build`, Recording-Smoke PASS |
| P1 | V62 Rest-Gate DoD.2 pruefen (abhaengig von `test:core` Fix) | T7 Start/HUD sichtbar PASS oder als externer Blocker dokumentiert |
| P2 | Alle Test-Suiten je 3x stabil laufen lassen | Ergebnisse in `docs/tests/Testergebnisse_Sprint1.md` dokumentiert |
| P2 | `npm run bot:validate` ausfuehren und Ergebnis dokumentieren | Bot-Winrate und Stuck-Events dokumentiert |
| P2 | Developer-UI Chunk pruefen: Feature-Flag oder Build-Exclude fuer Prod | `developer-ui` nicht im Prod-Bundle oder hinter Flag |

#### Sprint-1-Gate (Ende KW15)

- [ ] `test:core`, `test:physics`, `test:stress` alle 3x PASS
- [ ] `npm run bot:validate` PASS (0 Stuck-Events, Winrate >80%)
- [ ] `npm audit` 0 HIGH
- [ ] V58.99 geschlossen
- [ ] CI laeuft mit allen Suiten
- [ ] Source Maps aktiv
- [ ] `LICENSE`-Datei existiert

**Eskalation bei Nicht-Erreichen:** Wenn `test:core` nach 2 Wochen noch nicht stabil ist,
wird Sprint 2 um 1 Woche nach hinten verschoben und der Release-Termin angepasst.

---

### Sprint 2: Scope-Freeze & Produktreife (KW16-17 / 14. - 25. April)

Motto: "Entscheidungen treffen, Kernmodi fertig machen, Erstkontakt verbessern."

#### Sprint-Ziel

Der 1.0-Scope ist verbindlich fixiert. Alle Kernmodi fuehlen sich spielerisch fertig an.
Der erste Eindruck fuer neue Spieler ist deutlich verbessert.

#### Woche 3 (KW16: 14. - 18. April) - Scope-Freeze

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | Arcade-Entscheidung: Hauptfeature / Beta / Post-Launch | Schriftlich fixiert in diesem Dokument |
| P0 | Multiplayer-Entscheidung: 1.0-Scope ja/nein | Schriftlich fixiert; V60-Tasks entsprechend priorisiert |
| P0 | Desktop-Entscheidung: gleichwertiger Kanal oder nachgelagert | Schriftlich fixiert; Electron-QA-Aufwand bewertet |
| P1 | Sprach-Entscheidung: DE-only oder DE+EN | Schriftlich fixiert |
| P1 | Zielplattform-Prioritaet festlegen (Web-first / Desktop-first) | Schriftlich fixiert |
| P1 | V60-Triage: 1.0-kritische Tasks vs. Post-launch | V60-Tasks mit `1.0` / `post-launch` markiert |
| P1 | `Must-have / Should-have / Won't-do / Post-launch` final fixieren | Aktualisierte Scope-Sektion in diesem Dokument |
| P1 | Browser-/Geraete-Kompatibilitaetsmatrix finalisieren | Tier-1/Tier-2-Matrix in diesem Dokument fixiert |
| P1 | Kapazitaetsplan: Wer arbeitet wie viele h/Woche an welchem Sprint? | Zuordnung dokumentiert, Sprint-3-Last realistisch bewertet |
| P2 | Privacy Policy Entwurf starten (DSGVO-Minimum fuer Web-Release) | Entwurf liegt vor oder externer Dienstleister beauftragt |

#### Woche 4 (KW17: 21. - 25. April)

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | Loading Screen / Splash Screen implementieren | Visuelles Feedback beim Laden sichtbar |
| P1 | Fight/Hunt manuell mehrfach komplett durchspielen | Mindestens 3 komplette Runs ohne Auffaelligkeiten |
| P1 | Classic/Normal als Onboarding-Einstieg pruefen und optimieren | Default-Map, Default-Fahrzeug, Default-Preset bewusst gesetzt |
| P1 | Parcours auf Lesbarkeit, Flow und Frustlevel pruefen | Mindestens 2 Runs auf `parcours_rift` ohne HUD-/Logik-Bruch |
| P2 | First-Time-User-Flow polieren: interne Begriffe minimieren | Release-Pfad enthaelt keine Dev-Terminologie |
| P2 | Optional: Volume-Slider + Audio-Persistenz in Settings | Settings zeigen Audio-Kontrollen |
| P2 | Optional: Ambient-/Musik-Track fuer Menu oder Match | Mindestens 1 Track laeuft im Menu |

#### Sprint-2-Gate / Checkpoint 1 (Ende KW17)

- [ ] 1.0-Scope ist schriftlich eingefroren
- [ ] Alle Scope-Entscheidungen (Arcade, Multiplayer, Desktop, Sprache) sind dokumentiert
- [ ] Browser-Kompatibilitaetsmatrix ist finalisiert
- [ ] Kapazitaetsplan ist dokumentiert und Sprint-3-Last realistisch bewertet
- [ ] Loading Screen ist funktional
- [ ] Kernmodi (Classic, Fight/Hunt, Parcours) sind manuell verifiziert
- [ ] Privacy-Policy-Entwurf liegt vor oder ist beauftragt
- [ ] Zeitplan-Check: Ist der Release-Termin KW22 noch realistisch?

**Eskalation bei Nicht-Erreichen:** Falls Scope-Entscheidungen nicht getroffen werden koennen,
wird der konservativste Scope angenommen (Arcade=Post-Launch, Multiplayer=Post-Launch, Desktop=nachgelagert, DE-only).

---

### Sprint 3: QA & Playtest (KW18-19 / 28. April - 9. Mai)

Motto: "Von 'sollte gehen' zu 'ist nachweislich geprueft'."

#### Sprint-Ziel

Die manuelle QA-Checkliste ist fuer alle 1.0-Pfade abgearbeitet. Ein externer Playtest
hat reales Feedback geliefert. Alle Blocker sind identifiziert und priorisiert.

#### Woche 5 (KW18: 28. April - 2. Mai) - Manuelle QA, Teil 1

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | QA Tag 1: Boot, Menu, Navigation (Sektionen 1-3) | Alle Checks `[x]` oder `[!]` mit Bug-Ticket |
| P0 | QA Tag 2: Sessions, Schnellstart, Start-Setup (Sektionen 4-6) | Alle Checks `[x]` oder `[!]` |
| P0 | QA Tag 3: Steuerung, Gameplay-Tuning, Map-Settings (Sektionen 7-9) | Alle Checks `[x]` oder `[!]` |
| P1 | QA Tag 4: Profile, Presets, Config-Share (Sektion 10) | Alle Checks `[x]` oder `[!]` |
| P1 | QA Tag 5: Map-Abdeckung, Classic, Fight/Hunt (Sektionen 11-13) | Alle Checks `[x]` oder `[!]` |
| P1 | Persistenz, Recording, Return-to-Menu, Reset-Flows gezielt pruefen | Ergebnisse dokumentiert |
| P1 | Blocker-Triage: gefundene Bugs in `Blocker / Major / Minor / Cosmetic` trennen | Bug-Liste existiert mit Severity |

#### Woche 6 (KW19: 5. - 9. Mai) - Manuelle QA, Teil 2 + Browser-Tests

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | QA: Parcours, Arcade, HUD, Kamera, Aufnahme (Sektionen 14-17) | Alle Checks `[x]` oder `[!]` |
| P0 | QA: Eingaben, Gamepad, Touch (Sektionen 18-20) - nur falls im 1.0-Scope | Alle Checks `[x]` oder `[!]` oder `[-]` |
| P0 | QA: Multiplayer, Expert/Developer (Sektionen 21-23) - nur falls im 1.0-Scope | Alle Checks `[x]` oder `[!]` oder `[-]` |
| P1 | Tier-1-Browser-Tests: Chrome + Edge auf Kern-Flows (Boot, Match, Settings) | PASS auf beiden Browsern dokumentiert |
| P1 | Tier-2-Browser-Tests: Firefox, ggf. Safari - falls priorisiert | Ergebnisse dokumentiert, Known Issues erfasst |
| P1 | Bot-Qualitaets-Check: `npm run bot:validate` + manuelle Bot-Beobachtung | 0 Stuck-Events, kein sichtbar dummes Verhalten |
| P1 | Blocker-Fixes aus QA umsetzen | Alle Blocker geschlossen oder als Known-Issue dokumentiert |
| P2 | localStorage-Warnung / Export-Hinweis fuer Spieler pruefen | Hinweis im Menu oder in Known Issues dokumentiert |

Hinweis: Der externe Playtest wurde bewusst in Sprint 4, Woche 7 verschoben, um Sprint 3 nicht zu
ueberladen. QA-Ergebnisse muessen erst stabil sein, bevor externe Tester eingeladen werden.

#### Sprint-3-Gate / Checkpoint 2 (Ende KW19)

- [ ] Manuelle QA-Checkliste: alle 1.0-relevanten Sektionen vollstaendig abgearbeitet
- [ ] Tier-1-Browser (Chrome, Edge) sind getestet und PASS
- [ ] `npm run bot:validate` PASS
- [ ] Alle Blocker geschlossen oder bewusst als Known-Issue fuer 1.0 akzeptiert
- [ ] Bug-Liste: 0 Blocker offen, Major-Liste ist kurz und akzeptabel
- [ ] Known-Issues-Liste ist angelegt
- [ ] Zeitplan-Check: Ist Go in KW21/22 realistisch?

**Eskalation bei Nicht-Erreichen:** Falls mehr als 3 Blocker offen bleiben, wird der Release
um mindestens 2 Wochen verschoben. Falls QA systematisch scheitert (>30% der Checks `[!]`),
wird der 1.0-Scope nochmals reduziert.

---

### Sprint 4: RC & Launch (KW20-21 / 12. - 23. Mai)

Motto: "Nur noch stabilisieren, verpacken, ausliefern."

#### Sprint-Ziel

Der Release Candidate ist gebaut, getestet und praesentierbar. Am Ende steht eine
Go/No-Go-Entscheidung auf Basis harter Kriterien.

#### Woche 7 (KW20: 12. - 16. Mai) - RC + Playtest

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | RC bauen: `v1.0.0-rc.1` taggen, `package.json` Version setzen | Tag existiert, Build laeuft sauber |
| P0 | Nur noch Blocker und Major-Bugs bearbeiten - kein neuer Feature-Code | Commit-History zeigt nur Fixes |
| P0 | Externer kleiner Playtest (3-5 neue Spieler) auf RC-Build | Feedback-Protokoll mit Verstaendlichkeit, Frustpunkte, Abbruchstellen |
| P1 | Changelog aus Commit-History generieren | `CHANGELOG.md` oder Release-Notes existieren |
| P1 | Known-Issues-Liste finalisieren | Datei `docs/Known_Issues_1.0.md` existiert, ist oeffentlich kommunizierbar |
| P1 | Trailer / Screenshots / kurze Clips erstellen | Mindestens 3 Screenshots + 1 Clip vorhanden |
| P1 | Pitch-Satz und Store-/Release-Text formulieren | Text ist review-fertig |
| P1 | Privacy Policy finalisieren und verlinken | Erreichbar als Datei, Seite oder Link im Spiel/Store |
| P2 | Falls Desktop-Release: Electron-Builds signieren und testen | Installer laeuft auf Windows/macOS/Linux |
| P2 | Falls Crash-Reporting: Sentry o.ae. einrichten | Fehler werden remote erfasst |
| P2 | Kritische Playtest-Findings als Blocker-Fixes umsetzen | Blocker aus Playtest geschlossen |

#### Woche 8 (KW21: 19. - 23. Mai) - Finaler QA-Durchlauf & Go/No-Go

| Prio | Aufgabe | Abnahme-Kriterium |
| --- | --- | --- |
| P0 | Finaler QA-Durchlauf: Persistenz + Abschlussrunden (Sektionen 24-25) | Alle Checks PASS |
| P0 | Alle automatisierten Gates: `build`, `test:core`, `test:physics`, `test:stress`, `bot:validate`, `npm audit` | Alle PASS |
| P0 | Go/No-Go-Entscheidung anhand der definierten Kriterien | Entscheidung dokumentiert |
| P1 | Day-1-Patchliste und Post-Launch-Ziele vorbereiten | Dokument existiert |
| P1 | Falls Go: Veroeffentlichung mit Tag `v1.0.0` | Tag + Build veroeffentlicht |
| P1 | Falls No-Go: Klare Restliste + neues Zieldatum | Neuer Zeitplan dokumentiert |

#### Sprint-4-Gate / Release-Gate (Ende KW21)

- [ ] `npm run build` PASS
- [ ] `npm run test:core` PASS (3x stabil)
- [ ] `npm run test:physics` PASS
- [ ] `npm run test:stress` PASS
- [ ] `npm run bot:validate` PASS
- [ ] `npm run architecture:guard` PASS
- [ ] `npm run plan:check` PASS
- [ ] `npm run docs:check` PASS
- [ ] `npm audit` zeigt 0 HIGH
- [ ] Manuelle QA-Checkliste: alle 1.0-Sektionen `[x]`
- [ ] Tier-1-Browser (Chrome, Edge) getestet und PASS
- [ ] Externer Playtest durchgefuehrt, Feedback dokumentiert
- [ ] Loading Screen funktional
- [ ] Source Maps aktiv
- [ ] Version `1.0.0` in `package.json`
- [ ] Git-Tag `v1.0.0` erstellt
- [ ] Changelog vorhanden
- [ ] Known-Issues-Liste dokumentiert
- [ ] `LICENSE`-Datei existiert
- [ ] Privacy Policy erreichbar
- [ ] Trailer / Screenshots / Release-Text fertig
- [ ] Performance: Laden <5s, stabile 30+ FPS auf Mittelklasse-Geraet
- [ ] Haupt-Bundle unter 1.5 MB
- [ ] Developer-UI im Prod-Bundle hinter Flag oder entfernt

---

### Sprint-Ueberblick

```
Sprint 1 (KW14-15)     Sprint 2 (KW16-17)     Sprint 3 (KW18-19)     Sprint 4 (KW20-21)
Stabilitaet             Scope & Produkt        QA & Browser-Tests     RC & Launch
--------------------    --------------------   --------------------   --------------------
test:core Fix           Scope-Freeze           Manuelle QA 130+       RC bauen
npm audit fix           Arcade/MP/Desktop      Browser-Kompat.        Externer Playtest
CI erweitern            Entscheidungen         Bot-Qualitaet          Known Issues
V58 abschliessen        Loading Screen         Blocker-Triage         Trailer/Store-Text
Source Maps + LICENSE   Kernmodi pruefen       Blocker-Fixes          Privacy Policy
Bot-Validate            Privacy-Entwurf        Known-Issues-Start     Go/No-Go
--------------------    --------------------   --------------------   --------------------
Gate: Tests stabil      Gate: Scope fixiert    Gate: QA bestanden     Gate: Release-Kriterien
```

## Risiko-Matrix

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
| --- | --- | --- | --- |
| `test:core` Boot-Flake bleibt laenger bestehen | hoch | sehr hoch | P0-Fokus in Woche 1; bei Nicht-Loesung bis Woche 2: Eskalation |
| V58 dauert laenger als 2 Wochen | mittel | hoch | Checkpoint 1 in Woche 3 prueft Zeitplan |
| Manuelle QA deckt mehr Blocker auf als erwartet | hoch | hoch | Blocker-Triage ab Woche 5; Scope-Reduktion als Fallback |
| Multiplayer-Entscheidung wird zu spaet getroffen | mittel | hoch | Entscheidung in Woche 3 erzwingen, nicht auf Woche 6 verschieben |
| Desktop-Build (Electron) erfordert unerwarteten Aufwand | mittel | mittel | Desktop als nachgelagerten Kanal definieren falls Aufwand zu hoch |
| Keine Musik verfuegbar | niedrig | mittel | SFX-only Release akzeptabel; Musik als Post-launch |
| Bundle-Size waechst ueber Budget | niedrig | mittel | `rollup-plugin-visualizer` im CI; Lazy-Loading fuer Training/Recorder |
| Externe Playtester finden Grundprobleme | mittel | hoch | Playtest in Woche 7 auf RC; 1 Woche Puffer fuer kritische Fixes |
| Privacy Policy / Rechtliches verzoegert sich | mittel | hoch | Entwurf in Sprint 2 starten; Minimum-Template verwenden falls noetig |
| Bots verhalten sich fuer neue Spieler unbefriedigend | mittel | mittel | `bot:validate` als Gate; manuelle Bot-Beobachtung in Sprint 3 QA |
| localStorage-Datenverlust bei Nutzern | niedrig | mittel | Export-Hinweis im Menu oder Known-Issues-Dokumentation |
| Safari/WebKit-Inkompatibilitaeten | mittel | mittel | Safari als Tier-2 oder Won't-do; Tier-1 auf Chrome+Edge begrenzen |
| Solo-Entwickler-Kapazitaet reicht nicht fuer Sprint 3 | hoch | hoch | Kapazitaetsplan in Sprint 2; Sprint 3 ggf. auf 3 Wochen strecken |

## Wie das Spiel erfolgreicher werden kann

### 1. Eine klare Hauptfantasie definieren

Das Spiel braucht einen einfachen, starken Satz:

- Was ist das Produkt?
- Warum ist es spannend?
- Warum ist es nicht austauschbar?

Nicht empfehlenswert:

- zu viele Modi gleichzeitig gleich stark zu bewerben

Besser:

- ein klares Kernversprechen mit 1 bis 2 stark praesentierten Differenzierungsmerkmalen

### 2. Die ersten 5 Minuten perfektionieren

Der groesste Wachstumstreiber ist oft nicht ein spaetes Feature, sondern ein sehr guter Einstieg.

Wichtig:

- sofortiger Start
- starke erste Map
- gutes Fluggefuehl
- klare HUD-Rueckmeldung
- wenig Menue-Reibung

### 3. Recording/Cinematic als Wachstumskanal nutzen

Das ist eines der spannendsten Unterscheidungsmerkmale des Projekts.

Wenn stabil:

- besseres Trailer-Material
- besseres Social-Material
- mehr teilbare Highlights fuer Spieler
- klarerer Wiedererkennungswert

### 4. Arcade nur pushen, wenn der Loop wirklich motiviert

Arcade ist dann wertvoll, wenn Spieler direkt verstehen:

- wie Score entsteht
- warum Combo wichtig ist
- welche Belohnung die naechste Runde besser macht
- warum ein weiterer Run reizvoll ist

Ohne diese Klammer wirkt Arcade schnell wie "viel Struktur, aber wenig Sog".

### 5. Externe Tests vor Release einplanen

Interne Einschaetzungen reichen nicht aus.

Vor Release sollten echte neue Spieler getestet werden mit Fokus auf:

- Verstaendlichkeit
- Frustpunkte
- bevorzugter Modus
- Abbruchstellen
- "wow"-Momente

## Known Issues Template (fuer 1.0-Release)

Vor dem Release wird eine `docs/Known_Issues_1.0.md` erstellt mit folgendem Format:

```
# Known Issues - CuviosClash 1.0

## Bekannte Einschraenkungen

- Spielfortschritt wird ausschliesslich im Browser-localStorage gespeichert.
  Private Browsing, Cache-Clearing oder Browser-Wechsel loeschen alle Daten.
  Empfehlung: Profil-Export vor Browserwechsel nutzen.
- [weitere Items aus QA]

## Bekannte Bugs (Minor/Cosmetic)

- [aus Blocker-Triage Sprint 3]

## Nicht unterstuetzte Konfigurationen

- [aus Browser-Kompatibilitaetsmatrix]
```

## Rollback- und Incident-Plan nach Release

### Monitoring

- Falls Crash-Reporting (Sentry) eingerichtet: Dashboard in den ersten 72h nach Release aktiv beobachten.
- Falls kein Crash-Reporting: Community-Kanaele (Discord, GitHub Issues, Store-Reviews) taeglich pruefen.

### Incident-Schweregrade

| Schweregrad | Beschreibung | Reaktionszeit | Beispiel |
| --- | --- | --- | --- |
| Critical | Spiel startet nicht / Datenverlust | <24h Hotfix | Boot-Crash, localStorage-Corruption |
| High | Kernmodus unspielbar | <48h Hotfix | Fight-Mode Freeze, Recording-Export kaputt |
| Medium | Feature eingeschraenkt | Naechster Patch (1-2 Wochen) | HUD-Glitch, Gamepad-Mapping falsch |
| Low | Kosmetisch | Naechster regulaerer Patch | Textfehler, minimaler visueller Bug |

### Hotfix-Ablauf

1. Bug reproduzieren und Ursache eingrenzen.
2. Fix auf `main` committen (gemaess Projekt-Konvention, kein Feature-Branch).
3. `build`, `test:core`, `test:physics`, `bot:validate` PASS.
4. Neuer Tag `v1.0.1` (bzw. naechste Patch-Version), `package.json` Version bump.
5. Build veroeffentlichen, Known-Issues-Liste aktualisieren.
6. Bei Critical: Falls Fix nicht innerhalb von 24h moeglich, Maintenance-Hinweis auf Landing-Page setzen.

### Rollback

- Web: Vorherigen Build aus `dist/`-Backup oder Git-Tag `v1.0.0` neu deployen.
- Electron: Vorherige Installer-Version aus `release/`-Archiv bereitstellen.
- Kommunikation: Store-Text / Landing-Page um Hinweis ergaenzen.

## Post-Launch-Support-Plan (erste 4 Wochen nach Release)

### Woche 1 nach Release

- Taeglich Crash-Reports / Community-Feedback pruefen.
- Critical- und High-Bugs sofort adressieren.
- Day-1-Patch falls noetig (innerhalb 48h).

### Woche 2 nach Release

- Gesammeltes Feedback auswerten und priorisieren.
- Ersten regulaeren Patch vorbereiten (Medium-Bugs, UX-Verbesserungen).
- Post-Launch-Metriken dokumentieren (Downloads, Retention, haeufigste Bugs).

### Woche 3-4 nach Release

- Patch 1.0.2 oder 1.0.3 veroeffentlichen.
- Post-Launch-Roadmap fuer 1.1 konkretisieren (basierend auf echtem Nutzerfeedback).
- Entscheidung: Welche Post-launch-Items (Arcade, Multiplayer, i18n, Accessibility) kommen in 1.1?

### Langfristig

- Patch-Rhythmus: mindestens 1x pro Monat, solange aktive Bugs offen sind.
- Kommunikation: Jeder Patch hat Release-Notes (auch wenn kurz).
- Support-Ende: Klar kommunizieren falls das Projekt in Maintenance-Modus wechselt.

## Kapazitaetsplanung (Template)

Dieses Template muss in Sprint 2 mit realen Werten gefuellt werden:

| Sprint | Verfuegbare Personen | Stunden / Woche / Person | Gesamt h | Kritischer Engpass |
| --- | --- | --- | --- | --- |
| Sprint 1 | ? | ? | ? | test:core Fix ist P0, alles andere wartet |
| Sprint 2 | ? | ? | ? | Scope-Entscheidungen brauchen Entscheider-Verfuegbarkeit |
| Sprint 3 | ? | ? | ? | QA ist zeitintensiv - reicht die Kapazitaet fuer 130+ Checks? |
| Sprint 4 | ? | ? | ? | Playtest braucht externe Tester-Organisation |

Hinweis: Falls nur 1 Person verfuegbar ist, sollte Sprint 3 auf 3 Wochen gestreckt oder
die QA-Checkliste auf die 1.0-kritischen Sektionen (1-14, 24-25) reduziert werden.

## Schlussfolgerung

Das Projekt braucht sehr wahrscheinlich nicht primaer noch mehr Umfang, sondern:

- mehr Stabilitaet,
- engeren Scope,
- haertere Release-Gates,
- besseren Erstkontakt (Loading Screen, ggf. Musik),
- geschlossene Sicherheitsluecken in Dependencies,
- eine vollstaendigere CI-Pipeline,
- fruehere Entscheidungen (Multiplayer, Desktop, Sprache),
- und eine klarere Produktpositionierung.

Wenn diese Punkte sauber umgesetzt werden, ist ein deutlich staerkerer Release wahrscheinlicher als
mit einem breiteren, aber weniger abgesicherten Umfang.

