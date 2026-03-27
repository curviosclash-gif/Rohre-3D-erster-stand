# Releaseplan Spiel 2026

Stand: 2026-03-27
Status: Entwurf
Owner: Codex

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
4. offene manuelle QA in mehreren releasekritischen Bereichen.

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

### Offene aktive Release-Themen aus dem Masterplan

- V58: Persistenz-/Store-Konsolidierung, Recording-End-to-End-Smoke, Dead-Code-/Ownership-Cleanup.
- V61: Arcade-Loop ist nur teilweise fertig; mehrere Kernmechaniken und UX-Schichten sind offen.
- V62: Technisch fast abgeschlossen, aber visueller Kamera-Smoke fehlt.

## Release-These

Der wahrscheinlich beste Release ist kein "alles gleichzeitig fertig"-Release, sondern ein klar
geschnittener `1.0-Release Candidate` mit einem starken, stabilen Kern.

Empfohlene Kernthese fuer `1.0`:

- `Classic/Normal` als leicht verstaendlicher Einstieg
- `Fight/Hunt` als markanter Feature-Modus
- `Parcours` als klarer Skill-/Challenge-Modus
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

## Empfohlener 1.0-Scope

### Must-have fuer 1.0

- stabiler Boot und verlaessliche Core-Tests
- saubere Settings-/Profile-/Preset-Persistenz
- stabiler Singleplayer-Flow
- Fight/Hunt als voll verifizierter Feature-Modus
- Parcours als spielbarer und gut lesbarer Zusatzmodus
- funktionierende Recording-/Cinematic-Basis
- verstaendliche Default-Erfahrung fuer neue Spieler

### Should-have fuer 1.0

- Gamepad-Smoke und Desktop-Smoke
- externer kleiner Playtest
- bessere Post-Run-Kommunikation bei den Kernmodi
- Arcade in einem sichtbar verbesserten Zustand

### Post-launch

- Arcade als tiefer Progression-/Replay-/Daily-Loop
- Multiplayer-Ausbau
- weitere Fahrzeuge, Maps, Events
- umfassendere Meta-Progression
- groessere Content-Drops

## Go/No-Go-Regeln

### Go nur wenn

- `build`, `plan:check`, `docs:check` und die relevanten Test-Suites stabil gruen sind
- kein bekannter Blocker im Boot-/Startpfad offen ist
- Persistenz und Recording mindestens ueber End-to-End-Smokes abgesichert sind
- alle `1.0`-Kernmodi mindestens einen vollstaendigen manuellen Durchlauf bestanden haben
- der Release-Scope eingefroren ist

### No-Go wenn

- `test:core` weiterhin am Startpfad flaked oder rot ist
- Nutzerdaten-/Settings-Persistenz noch unsicher ist
- Arcade als Hauptfeature beworben werden soll, obwohl der Loop sichtbar offen bleibt
- Multiplayer/Gamepad/Touch versprochen werden, ohne dass sie durch reale Checks abgesichert sind

## Konkreter Phasenplan bis zur Veroeffentlichung

### Phase 1: Release-Basis haerten

Ziel:

- Wiederherstellen von technischer Verlaesslichkeit.

Aufgaben:

- `test:core` Start-/Boot-Timeout sauber eingrenzen und beheben.
- Core-Suite mehrmals hintereinander stabil laufen lassen.
- V58.3.2 und V58.3.3 abschliessen.
- V58.99.2 mit echten End-to-End-Smokes fuer Recording und Persistenz schliessen.
- V62.99.3 visuellen Kamera-Smoke abschliessen.

Ergebnis:

- Das Projekt hat wieder ein glaubwuerdiges technisches Release-Fundament.

### Phase 2: Release-Scope einfrieren

Ziel:

- Klar festlegen, was `1.0` ist und was nicht.

Aufgaben:

- Entscheidung: Arcade Hauptfeature, Beta oder Post-Launch.
- Entscheidung: Multiplayer Kernscope oder nicht.
- Entscheidung: Desktop gleichwertiger Release-Kanal oder nachgelagerter Kanal.
- `Must-have / Should-have / Post-launch` schriftlich fixieren.

Ergebnis:

- Keine diffuse Parallelentwicklung mehr.

### Phase 3: Kernmodi produktfertig machen

Ziel:

- Die beworbenen Modi sollen sich abgeschlossen anfuehlen.

Aufgaben:

- Fight/Hunt feinjustieren und manuell mehrfach komplett durchspielen.
- Classic/Normal als bestes Onboarding pruefen.
- Parcours auf Lesbarkeit, Flow und Frustlevel pruefen.
- Arcade nur dann weiter vertiefen, wenn es wirklich in `1.0` gehoert.

Ergebnis:

- Der Kern fuehlt sich spielerisch fertig an, nicht nur technisch implementiert.

### Phase 4: Release-QA durchziehen

Ziel:

- Von "sollte gehen" zu "ist nachweislich geprueft" wechseln.

Aufgaben:

- Manuelle Checkliste fuer alle `1.0`-Pfade wirklich abarbeiten.
- Boot, Menu, Settings, Fight, Parcours, Recording und Persistenz voll pruefen.
- Gamepad, Touch, Multiplayer und Desktop nur dann freigeben, wenn reale Laeufe PASS sind.
- Bugs in `Blocker / Major / Minor / Cosmetic` trennen.

Ergebnis:

- Release-Risiko sinkt deutlich, weil nicht nur die Architektur-, sondern auch die Nutzerpfade
  abgesichert sind.

### Phase 5: First-Time-User Experience optimieren

Ziel:

- Das Spiel muss in den ersten Minuten stark wirken.

Aufgaben:

- Schnellstart optimieren.
- Default-Map, Default-Fahrzeug und Default-Preset bewusst setzen.
- erste Match-Minute auf Lesbarkeit, Flow und "Coolness" trimmen.
- technische oder interne Begriffe im Release-Pfad minimieren.

Ergebnis:

- Hoehere Chance, dass neue Spieler die erste Runde verstehen und direkt weiterspielen wollen.

### Phase 6: Launch-Vorbereitung

Ziel:

- Den technischen Release in einen erfolgreichen Produkt-Release uebersetzen.

Aufgaben:

- Trailer / Screenshots / kurze Clips erstellen.
- klaren Pitch-Satz fuer das Spiel formulieren.
- Store-Text und Release-Kommunikation vorbereiten.
- externe Testsession kurz vor dem Release fahren.
- Day-1-Patchliste und erste Post-Launch-Ziele vorbereiten.

Ergebnis:

- Der Release ist nicht nur fertig gebaut, sondern auch praesentierbar.

## Empfohlener 8-Wochen-Plan

### Woche 1

- `test:core` Startup-Probleme analysieren
- Boot-Pfad stabilisieren
- V58-Restpunkte priorisieren

### Woche 2

- V58 abschliessen
- V62 visuellen Smoke abschliessen
- mehrfache Core-/Physics-/Stress-Laeufe fahren

### Woche 3

- verbindlichen `1.0`-Scope festschreiben
- Fight/Hunt und Parcours als Kernmodi manuell vertieft pruefen
- Arcade-Entscheidung treffen

### Woche 4

- First-Time-User-Flow polieren
- Default-Setups, HUD-Verstaendlichkeit und Schnellstart verbessern
- Release-Pfad textlich und visuell schaerfen

### Woche 5

- manuelle QA fuer alle `1.0`-Pfadgruppen
- Persistenz, Recording, Return-to-Menu, Reset-Flows gezielt pruefen
- erste Blocker-Triage

### Woche 6

- externer kleiner Playtest
- Balancing- und UX-Nachbesserungen aus echtem Feedback
- Gamepad-/Desktop-/Multiplayer-Scope final pruefen oder sauber aus `1.0` nehmen

### Woche 7

- Release Candidate bauen
- nur noch Blocker und Major-Bugs bearbeiten
- Trailer, Screenshots, Clips, Release-Text fertigstellen

### Woche 8

- finaler QA-Durchlauf
- Go/No-Go-Entscheidung
- Veroeffentlichung oder bewusster Verschub mit klarer Restliste

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

## Schlussfolgerung

Das Projekt braucht sehr wahrscheinlich nicht primaer noch mehr Umfang, sondern:

- mehr Stabilitaet,
- engeren Scope,
- haertere Release-Gates,
- besseren Erstkontakt,
- und eine klarere Produktpositionierung.

Wenn diese Punkte sauber umgesetzt werden, ist ein deutlich staerkerer Release wahrscheinlicher als
mit einem breiteren, aber weniger abgesicherten Umfang.
