# Feature Plan: Arcade Modus V45

Stand: 2026-03-18
Status: Planung
Owner: Single-Agent Planung

## Ziel

`Arcade` soll von einem reinen Menue-Preset zu einem echten Spielmodus mit eigener Run-Identitaet werden: kurze, hoch wiederholbare Runs, klares Score-Chasing, starke Eskalation, wenig Start-Reibung und ein sauberes Post-Run-Feedback.

Der Modus soll zu **CuviosClash** passen:

- 3D-Flug + Trail-Spiel bleibt der Kern.
- Bestehende Classic-/Hunt-Systeme werden bevorzugt wiederverwendet.
- V1 fokussiert auf **Singleplayer**, kurze Runs und lokale Wiederholbarkeit.
- Multiplayer, globale Online-Bestenlisten und schwere Meta-Progression sind bewusst nachgelagert.

## Warum jetzt

Aktuell existiert `arcade` im Projekt nur als Menue-/Preset-Pfad. Das ist fuer einen schnellen Einstieg nuetzlich, liefert aber noch keinen klaren Grund, warum Spieler gezielt immer wieder in genau diesen Modus zurueckkehren sollten.

Ein echter Arcade-Modus soll diese Luecke schliessen:

1. Sofortiger Einstieg mit niedrigem Setup-Aufwand.
2. Ein eigener Run-Loop, der nicht nur auf Rundensiege reduziert ist.
3. Ein Score-System, das gutes Fliegen, Risiko und Aggression belohnt.
4. Mehr Wiederholbarkeit ueber Seeds, Modifikatoren, Playlists und spaetere Daily Runs.

## Externe Recherche (Stand 2026-03-18)

Die folgenden Muster funktionieren in erfolgreichen Arcade-/Arena-/Score-Attack-Spielen wiederholt gut:

1. **Kurze, fokussierte Sessions mit Bestenlisten**
   - `SUPER SCORE SHOOTER CLASSIC` verkauft seine Kernidee direkt ueber 2- und 5-Minuten-Score-Attack-Modi plus Leaderboards.
   - `Devil Daggers` fokussiert den gesamten Loop auf das Ueberleben von Sekunden, globale Bestenlisten und Replay-Lernen.
   - Ableitung fuer CuviosClash: Arcade braucht mindestens einen klaren kurzen Run-Typ, der in einem Sitz mehrfach spielbar ist.

2. **Mehrere Submodi aus demselben Kernloop**
   - `Curved Space` kombiniert `Arena`, `Survival`, `Endless` und `Daily Run` ueber dieselben Kernmechaniken.
   - Ableitung: Arcade sollte nicht als ein einziger starrer Modus gedacht werden, sondern als Familie aus Score- und Survival-Varianten.

3. **Wellenstruktur plus Entscheidungspunkte**
   - `Brotato` setzt auf Runs unter 30 Minuten, 20-90-Sekunden-Wellen und Entscheidungen zwischen den Wellen.
   - Ableitung: Fuer CuviosClash ist ein Sektor-/Wellen-Rhythmus mit kurzen Ruhefenstern attraktiver als ein endloser Dauerstrom ohne Struktur.

4. **Aggressive Score-Systeme mit Chains/Multiplikatoren**
   - `Wrack` stellt Combos, Chains, Finisher sowie Score-/Time-Attack-Modi in den Vordergrund.
   - Ableitung: Reines Ueberleben ist fuer Arcade zu flach; Score muss an riskantes, sauberes und offensives Spiel gekoppelt werden.

5. **Modifikatoren und graduelle Eskalation**
   - Der Postmortem-Artikel zu `Atari Recharged` betont Replayability ueber Powerups, Challenge-Loops, Leaderboards, Modifikatoren und eine modernere Schwierigkeitsskala.
   - Ableitung: Arcade darf in spaeteren Minuten brutal werden, braucht aber einen lesbaren Ramp-up statt sofortiger Ueberforderung.

## Quellen fuer die Recherche

- `SUPER SCORE SHOOTER CLASSIC` auf Steam: <https://store.steampowered.com/app/3324560/SUPER_SCORE_SHOOTER_CLASSIC/>
- `Curved Space` auf Steam: <https://store.steampowered.com/app/1320230/Curved_Space/>
- `Brotato` auf Steam: <https://store.steampowered.com/app/1942280/Brotato/>
- `Wrack` auf Steam: <https://store.steampowered.com/app/253610/Wrack/>
- `Devil Daggers` auf Steam: <https://store.steampowered.com/app/422970/Devil_Daggers/>
- `Devil Daggers` Update/Replay-News: <https://store.steampowered.com/news/?appgroupname=Devil+Daggers&appids=422970&feed=steam_community_announcements>
- `Nova Drift` auf Steam: <https://store.steampowered.com/app/858210/Nova_Drift/>
- `Crossout` auf Steam: <https://store.steampowered.com/app/386180/Crossout/>
- `EVERSPACE 2` Community-Update zu Perks/Modulen: <https://store.steampowered.com/news/posts/?appids=1128920&enddate=1710180372&feed=steam_community_announcements>
- GameDeveloper: `Reviving retro: the art and science of recharging Atari's classic games for modern audiences`
  - <https://www.gamedeveloper.com/production/reviving-retro-the-art-and-science-of-recharging-atari-s-classic-games-for-modern-audiences>

## Ideenraum und Abwaegung

### Idee A: Score Sprint

**Konzept**

- Fester Timer (`2`, `5` oder `8` Minuten)
- Ziel: maximaler Score
- Eskalation nur ueber Spawn-Intensitaet, Multiplikator und Modifikatoren

**Was daran gut funktioniert**

- Extrem niedrige Einstiegshuerde
- Perfekt fuer schnelle Restarts und Bestenlisten
- Guter Daily-Run-Kandidat

**Schwaechen**

- Ohne Run-Shaping oft schnell monoton
- Kann sich im bestehenden Spiel zu sehr wie `Classic + Timer` anfuehlen
- Nutzt die vorhandene Tiefe aus Items, Bot-Dichte und Karten nicht voll aus

**Fit fuer CuviosClash**

- Sehr gut als **sekundaerer Untermodus**
- Zu duenn als alleinige Hauptvision fuer Arcade

### Idee B: Survival Gauntlet

**Konzept**

- Ein Run besteht aus kurzen Sektoren/Wellen
- Jede Welle fuegt Druck, Regeln oder Feindprofile hinzu
- Zwischen Wellen: kurze Draft-/Upgrade-/Heilungs-Entscheidung

**Was daran gut funktioniert**

- Sehr gute Run-Dramaturgie
- Nutzt vorhandene Bots, Powerups, Portale und Map-Layouts
- Erzeugt natuerliche Hoehepunkte ohne Komplettumbau des Kernspiels

**Schwaechen**

- Braucht einen guten Director fuer Eskalation
- UI/HUD und Post-Run-Auswertung werden komplexer

**Fit fuer CuviosClash**

- **Beste Hauptvariante fuer V1**

### Idee C: Daily Seed / Challenge Playlist

**Konzept**

- Ein taeglicher, deterministischer Run
- Feste Map, feste Modifikatoren, fester Seed
- Ein Versuch pro Tag oder begrenzte Versuche

**Was daran gut funktioniert**

- Hoher Rueckkehrreiz
- Asynchrone Konkurrenz ohne Multiplayer-Zwang
- Passt gut zum existierenden Playlist-Gedanken im Menue

**Schwaechen**

- Braucht zuerst ein belastbares Score-System
- Persistenz, Seed-Vertrag und Fairness muessen stabil sein

**Fit fuer CuviosClash**

- Sehr stark als **Phase-2-Erweiterung**
- Nicht als erster Lieferumfang

### Idee D: Roguelite-Meta-Progression

**Konzept**

- Permanente Freischaltungen, Waehrung, Upgradetree, Run-unabhaengige Boni

**Was daran gut funktioniert**

- Hohe Langzeitbindung
- Gibt schwachen Spielern trotzdem Fortschritt

**Schwaechen**

- Sehr hoher Scope in Savegame, Balancing und UI
- Gefaehrdet den sauberen Arcade-Charakter
- Kann Score-Chasing und faire Leaderboards verunreinigen

**Fit fuer CuviosClash**

- Bewusst **nicht V1**
- Wenn ueberhaupt, spaeter nur kosmetisch oder in separatem Progressionspfad

## Empfehlung

Empfohlen wird ein **Hybrid aus Idee B + leichten Elementen aus A und C**:

- **Kern von V1:** `Arcade Run` als Survival-Gauntlet mit kurzen Sektoren, Score, Multiplikator und Risiko-System.
- **Eingebaut aus Idee A:** kurze Restart-Zyklen, optional spaeter `Sprint 5` als kleiner Untermodus.
- **Nach V1 aus Idee C:** taeglicher Seed, lokale/optionale Online-Bestenlisten und kuratierte Playlists.

Damit bleibt der Modus klar arcade-ig, ohne sofort in einen grossen Roguelite-Umbau zu kippen.

## Erweiterung: Flugzeug-Leveling und Vehicle-Editor

### Lokaler Ausgangspunkt im Projekt

Das Projekt bringt bereits mehrere Anker mit, an die ein aufruestbares Arcade-Flugzeug sauber andocken kann:

- Im Menue existiert ein echter Fahrzeugpfad inklusive Auswahl, Preview und `Vehicle-Editor oeffnen`.
- Es gibt mit `RuntimeModularVehicleMesh` bereits eine Runtime-Bruecke fuer modulare Fahrzeuge.
- `GeneratedVehicleConfigs.js` ist als generierter Einstiegspunkt fuer Editor-Exporte vorhanden.
- `data/vehicles/**` ist aktuell faktisch frei und eignet sich als Persistenzpfad fuer Blueprints.

Wichtige Einschraenkung:

- Die Runtime kann Hitboxen aus dem Fahrzeug-Mesh bzw. dessen `localBox` ableiten.
- Deshalb darf der Vehicle-Editor **nicht** zu freiem Power-Creep ueber Mesh-Skalierung fuehren.
- Benoetigt werden harte Grenzen wie `hitboxClass`, `massBudget`, `powerBudget`, `heatBudget` und validierte Part-Slots.

### Externe Muster fuer Flugzeug-/Fahrzeug-Progression

1. **In-Run-Schiffsevolution funktioniert sehr gut**
   - `Nova Drift` zeigt, wie schnell lesbare Run-Levelups, modulare Upgrades und Super Mods aus einem Arcade-Kern viel Build-Tiefe machen.
   - Ableitung: Arcade in CuviosClash sollte pro Run echte Levelups bieten, statt nur Score-Zahlen zu erhoehen.

2. **Echte Fahrzeug-Workshops brauchen Budget- und Slot-Grenzen**
   - `Crossout` zeigt den Reiz, eigene Fahrzeuge aus vielen Teilen zusammenzubauen.
   - Gleichzeitig wird klar: Ohne Budget, Slot- oder Power-Score-System wird ein Editor schnell unbalanciert.
   - Ableitung: Der Vehicle-Editor in CuviosClash braucht valide Archetypen und harte Baugrenzen.

3. **Lieblings-Schiffe sollten relevant bleiben duerfen**
   - `EVERSPACE 2` arbeitet mit Schiffsklassen, Perks, Modulen, Favoriten-Handling und spaeteren QoL-Verbesserungen fuer Lieblingsgear.
   - Ableitung: Ein Spieler sollte sein Lieblingsflugzeug langfristig weiterentwickeln koennen, ohne dass jede neue Freischaltung das alte Modell wertlos macht.

### Moeglichkeitsraum

#### Moeglichkeit A: Reines In-Run-Leveling

- Waehren eines Arcade-Runs sammelt das Flugzeug XP.
- Bei jedem Level-Up waehlt der Spieler `1 aus 3` Run-Mods.
- Nach dem Tod wird alles zurueckgesetzt.

**Vorteile**

- Sehr arcade-kompatibel
- Kein Savegame-Balancing notwendig
- Sofort spannend pro Run

**Nachteile**

- Erfuellt den Wunsch nach langfristigem Flugzeugaufbau nur teilweise
- Vehicle-Editor bleibt eher kosmetisch oder optional

#### Moeglichkeit B: Persistente Airframe-Mastery pro Flugzeug

- Jedes Basismodell (`ship5`, `ship8`, `aircraft`, spaetere Custom Blueprints) hat eigene Mastery-XP.
- Level schalten kleine, kontrollierte Vorteile oder Editor-Optionen frei.

**Vorteile**

- Starke Bindung an ein Lieblingsflugzeug
- Gute Langzeitmotivation
- Gut mit Arcade-Runs kombinierbar

**Nachteile**

- Risiko fuer Power-Creep
- Save-/Migrationsthema kommt dazu

#### Moeglichkeit C: Vehicle-Editor als Blueprint-Fortschritt

- Der Editor baut kein rein kosmetisches Modell, sondern ein `Blueprint`.
- Das Blueprint bestimmt erlaubte Teile, Gewichte, Hardpoints, Modul-Slots und Seitenwerte.
- Arcade-Leveling schaltet neue Part-Familien oder Budgetpunkte frei.

**Vorteile**

- Nutzt den vorhandenen Editor sinnvoll
- Sehr hohe Identitaet pro Flugzeug
- Gute Spielerbindung ueber eigene Builds

**Nachteile**

- Hoher Balance- und Validierungsaufwand
- Hitbox-/Exploit-Gefahr ohne Guardrails

#### Moeglichkeit D: Modul-/Teil-Inventar

- Runs belohnen konkrete Teile: Triebwerke, Fluegel, Stabilisatoren, Cockpit-Module, Shield-Cores.
- Diese Teile werden im Editor verbaut.

**Vorteile**

- Starkes Sammelgefuehl
- Gut fuer spaetere Loot-/Season-Inhalte

**Nachteile**

- Schnell sehr inventory-lastig
- Hohe UI-/Drop-/Duplikat-Komplexitaet

#### Moeglichkeit E: Overclocks mit Vor- und Nachteilen

- Spaete Upgrades geben starke Seiteneffekte statt nur linearen Buffs.
- Beispiele:
  - `Heisser Antrieb`: mehr Topspeed, weniger Kontrolle
  - `Duennere Signatur`: kleinere Zielsilhouette, weniger Struktur
  - `Portal-Junkie`: Bonus nach Portalen, aber hoeherer Hitzerisiko-Decay

**Vorteile**

- Sehr gute Arcade-Identitaet
- Gute Build-Differenzierung ohne reine Vertikal-Skalierung

**Nachteile**

- Braucht gute Tooltips und Telemetrie

#### Moeglichkeit F: Rein kosmetische Prestige-Stufen

- Farben, Contrails, Cockpit-Frames, Partikel, Embleme, Fin-Flairs

**Vorteile**

- Null Balance-Risiko
- Gute Langzeitbelohnung

**Nachteile**

- Erfuellt den Wunsch nach echter Verbesserung nur begrenzt

### Empfohlene Hybrid-Loesung

Empfohlen wird ein **Drei-Schichten-Modell**:

1. **Run-Leveling im Arcade-Run**
   - Das aktive Flugzeug sammelt waehrend des Runs XP.
   - Alle `60-90 Sekunden` oder nach Sektorabschluss gibt es einen Level-Up-Pick.
   - Diese Boni sind **nur fuer den aktuellen Run** gueltig.

2. **Persistente Airframe-Mastery**
   - Jedes Flugzeug bzw. jede Blueprint-Familie hat `airframeXp`, `airframeLevel` und `masteryTrack`.
   - Mastery schaltet vor allem **Seitoptionen** frei:
     - neue Editor-Part-Familien
     - mehr Budgetpunkte
     - ein zusaetzlicher Passiv-Slot
     - kosmetische Freischaltungen
     - spaetere Overclock-Slots

3. **Vehicle-Editor als Blueprint-Werkbank**
   - Der Editor erzeugt persistente Blueprints unter `data/vehicles/**`.
   - Die Runtime konsumiert diese ueber `GeneratedVehicleConfigs` -> `vehicle-registry.js` -> `RuntimeModularVehicleMesh`.
   - Blueprints bekommen einen validierten Stat-Block statt freier Rohwerte.

### Konkreter Vorschlag fuer die Progressionsachsen

**Permanent**

- `airframeLevel`
- `airframeXp`
- `editorBudget`
- `unlockedPartFamilies`
- `passiveSocketCount`
- `maxOverclockTier`
- `cosmeticPrestige`

**Nur pro Run**

- `runLevel`
- `runXp`
- `runMods[]`
- `sectorRewards[]`
- `repairTokens`
- `currentOverclockState`

### Konkreter Vorschlag fuer den Vehicle-Editor

Der Vehicle-Editor sollte mittelfristig von einem freien Formbaukasten zu einem **validierten Arcade-Blueprint-Editor** ausgebaut werden:

- `Basis-Archetyp` waehlen:
  - `Interceptor`
  - `Striker`
  - `Vanguard`
  - `Bruiser`
  - `Trickster`
- `Pflicht-Slots`:
  - Core
  - Nose
  - Wing-L/R
  - Engine-L/R
  - Utility
- `Abgeleitete Werte` anzeigen:
  - Topspeed
  - Turn Rate
  - Boost-Kapazitaet
  - Stabilitaet
  - Struktur
  - Signatur/Hitbox-Klasse
  - Hitzelast / Energiebedarf
- `Illegale Builds` klar blockieren:
  - Budget ueberschritten
  - Power zu hoch
  - Hitbox ausserhalb der Klasse
  - fehlende Pflicht-Slots

### Balance-Guardrails

1. Editor-Teile geben **Trade-offs**, keine freien Stapel-Buffs.
2. Hitbox wird nicht nur aus Geometrie uebernommen, sondern auf erlaubte Klassen geclamped.
3. Arcade-Mastery entsperrt vor allem **Optionen**, nicht lineare `+20%`-Power.
4. Overclocks bleiben Sidegrades mit echtem Nachteil.
5. Competitive-/Nicht-Arcade-Pfade koennen den Editor spaeter ignorieren oder auf normalisierte Stats beschraenken.

### Empfehlung fuer die Reihenfolge

1. **Zuerst**: In-Run-Leveling im Arcade-Mode
2. **Dann**: Persistente Airframe-Mastery pro Flugzeug
3. **Danach**: Vehicle-Editor als Blueprint-Werkbank mit Budget-/Slot-System
4. **Spaeter**: Teil-Inventar, seltene Overclocks, Prestige-Kosmetik

Diese Reihenfolge ist wichtig, weil sie zuerst den Spielspass im Run absichert und erst danach die schwere Persistenz- und Editorlogik aufsetzt.

## Produktpfeiler

1. **Sofort lesbar**
   - Spieler versteht in den ersten 10 Sekunden: Ziel, Score, naechste Gefahr, naechste Belohnung.

2. **Kurz, aber nicht flach**
   - Ziel-Runlaenge fuer den Hauptmodus: `8-12 Minuten`.
   - Ein kompletter Fehlstart darf nach `30-60 Sekunden` klar erkennbar und sofort neu spielbar sein.

3. **Mastery statt Grind**
   - Score kommt aus Flugsauberkeit, Risiko, Kills, Bounties, engen Passagen, no-damage-Sektoren und Streak-Management.

4. **Varianz aus Regeln, nicht nur aus Zufall**
   - Seeds, Sektor-Modifikatoren und Reward-Drafts erzeugen Vielfalt.
   - Kernsteuerung und Kernphysik bleiben stabil.

5. **Saubere Eskalation**
   - Spaete Minuten duerfen brutal sein.
   - Fruehe Minuten muessen lehren statt sofort bestrafen.

## Architektur-Check

### Wichtige technische Entscheidung

`Arcade` sollte in V1 **kein neuer `GAME_MODE_TYPE`** werden.

Begruendung:

- Die aktive Architektur dokumentiert einen stabilen Bot-/Training-Vertrag mit `MODE_ID: 0=classic, 1=hunt`.
- Ein dritter technischer Modus wuerde `HuntMode`, Runtime-Resolver, Bot-Domaenen, Beobachtungs-Features und Trainingspfade unnoetig aufbrechen.

**Empfehlung**

- `localSettings.modePath = 'arcade'` bleibt die sichtbare Produktwahl.
- Runtime-seitig wird Arcade als **eigener Regelsatz/Lifecycle-Layer** modelliert:
  - `runtimeConfig.arcade.enabled`
  - `runtimeConfig.arcade.profileId`
  - `runtimeConfig.arcade.runType`
  - `runtimeConfig.arcade.seed`
  - `runtimeConfig.arcade.scoreModel`
- Der darunterliegende technische Kampfpfad bleibt fuer V1 `CLASSIC`-nah.

### Zweite zentrale Entscheidung

`player.score` bleibt Rundensieg-Score und wird **nicht** fuer Arcade missbraucht.

Stattdessen braucht Arcade einen separaten State:

- `runScore`
- `multiplier`
- `comboWindow`
- `riskMeter`
- `sectorIndex`
- `waveIndex`
- `bountiesCompleted`
- `lives/continues`
- `runTimeSeconds`
- `finalGrade`

Das vermeidet Seiteneffekte in:

- `RoundStateOps.js`
- `RoundEndCoordinator.js`
- Netzwerk-State-Reconciliation
- bestehendem Match-/HUD-Verhalten

### Reuse-Strategie

- **Reuse bevorzugen**
  - `MenuRuntimeSessionService.js`
  - `RuntimeConfig.js`
  - `GameRuntimeFacade.js`
  - `MatchSessionFactory.js`
  - `EntityManager.js`
  - `Powerup.js`
  - `HudRuntimeSystem.js`
  - `MatchFlowUiController.js`
  - `PostMatchStatsAggregator.js`
  - vorhandener Recorder-/Replay-Pfad

- **Neu nur dort, wo Struktur gewinnt**
  - `src/state/arcade/ArcadeRunState.js`
  - `src/state/arcade/ArcadeScoreOps.js`
  - `src/state/arcade/ArcadeDirectorOps.js`
  - `src/state/arcade/ArcadeRewardCatalog.js`
  - `src/ui/ArcadeHudController.js`
  - optional `src/state/arcade/ArcadeSeedService.js`

### Risiko

- **Mittel bis hoch**
- Hauptgruende:
  - bestehender Match-Lifecycle ist auf Runden-/Match-Siege ausgelegt
  - HUD zeigt heute primaer Rundenscores
  - Balancing-Risiko ist hoch, wenn Score und Difficulty nicht sauber gekoppelt werden

## Betroffene Dateien

Bestehend:

- `src/ui/menu/MenuDefaultsEditorConfig.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/core/SettingsManager.js`
- `src/core/RuntimeConfig.js`
- `src/core/GameRuntimeFacade.js`
- `src/state/MatchSessionFactory.js`
- `src/state/RoundStateController.js`
- `src/state/RoundStateOps.js`
- `src/entities/EntityManager.js`
- `src/entities/vehicle-registry.js`
- `src/entities/GeneratedVehicleConfigs.js`
- `src/entities/runtime-modular-vehicle-mesh.js`
- `src/entities/Player.js`
- `src/entities/player/PlayerMotionOps.js`
- `src/entities/Powerup.js`
- `src/ui/HudRuntimeSystem.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/UIManager.js`
- `src/ui/menu/MenuTextCatalog.js`
- `src/ui/menu/EventPlaylistCatalog.js`
- `prototypes/vehicle-lab/**`
- `data/vehicles/**`
- `src/state/PostMatchStatsAggregator.js`
- `src/core/replay/ReplayRecorder.js`
- `tests/core.spec.js`
- `tests/stress.spec.js`
- `docs/Umsetzungsplan.md`

Neu empfohlen:

- `src/state/arcade/ArcadeRunState.js`
- `src/state/arcade/ArcadeScoreOps.js`
- `src/state/arcade/ArcadeDirectorOps.js`
- `src/state/arcade/ArcadeRewardCatalog.js`
- `src/state/arcade/ArcadeRunController.js`
- `src/ui/ArcadeHudController.js`
- `scripts/arcade-run-smoke.mjs`

## Produktentscheidungen fuer V45

1. V1 ist **Singleplayer-first**.
2. `Arcade` wird als **Run-Layer** auf dem bestehenden technischen Mode-Stack modelliert, nicht als dritter technischer Hauptmodus.
3. V1 startet mit einem **Haupt-Untermodus**:
   - `Arcade Run`
4. `Sprint 5` und `Daily Seed` sind explizit als Folgephasen vorgesehen, aber nicht Pflicht fuer die erste lieferfaehige Version.
5. Die Run-Struktur ist **kontinuierlich** und nicht als Serie klassischer Rundensiege aufgebaut.
6. Zwischen-Sektor-Entscheidungen sind Pflicht, damit Runs eine eigene Dramaturgie bekommen.
7. Leaderboards sind in V1 mindestens **lokal**; remote/global ist optional spaeter.
8. Replays sollen in V1 mindestens `letzter Run` und `bester Run` abdecken, wenn der vorhandene Recorder ohne Architekturbruch angedockt werden kann.
9. Breite Roguelite-Meta-Progression bleibt ausserhalb von V1, aber ein begrenztes `Airframe Mastery + Blueprint`-System ist ausdruecklich als Folgeausbau innerhalb von V45 vorgesehen.

## Zielbild fuer V1

### Startflow

- Spieler waehlt `Arcade`.
- Ebene 3 zeigt statt nur eines Presets einen kompakten Arcade-Startblock:
  - Run-Typ
  - Schwierigkeit/Preset
  - Map oder Playlist
  - erwartete Runlaenge
  - Highscore / Bestzeit / bester Rang

### Laufender Run

- Run startet mit kurzer Aufwaermphase.
- Danach folgen Sektoren/Wellen mit klaren Zielbildern:
  - Ueberleben
  - Bounty-Kill
  - No-Crash-Bonus
  - Score-Gate
  - Hazard-Sektor
- Nach 2-3 Sektoren kommt ein kurzer Reward-Draft.
- Spaetere Sektoren steigern Druck ueber:
  - mehr/aggressivere Bot-Squads
  - dichtere Item-/Portal-Konstellationen
  - Modifikatoren
  - hoehere Tempofenster

### Run-Ende

- `MATCH_END` wird fuer das Run-Finale wiederverwendet.
- Post-Run-Screen zeigt:
  - Endscore
  - Multiplikator-Spitze
  - ueberlebte Sektoren
  - Kills / Bounties / Clean-Sektoren
  - Rekordvergleich
  - Retry / gleicher Seed / naechster Seed

## V45.1 Stream A Freeze (Stand 2026-03-19)

### V1-Nicht-Ziele (fest)

- Kein neuer technischer `GAME_MODE_TYPE` fuer Arcade.
- Kein globales Online-Leaderboard in V1.
- Kein voll ausgebautes Mastery-/Blueprint-Progressionssystem in V1.

### UX-Flow fuer Stream A

1. Spieler waehlt `Arcade` in Ebene 2.
2. Ebene 3 bleibt der vorhandene Runtime-Einstieg, zeigt zusaetzlich eine Arcade-Inline-Flaeche mit Run-Kontext, Seed-Anker und Start-CTA.
3. HUD wird in V45.1 als Shell sichtbar gemacht (Score, Multiplikator, Sektor, Combo) und an bestehende Menu-/Settings-Hooks gebunden.
4. Post-Run bleibt in V45.1 ein Platzhalter-Layer mit letzter Run-Zusammenfassung; echte Replay-/Breakdown-Logik folgt in V45.2+.

### Seed-/Replay-/Daily-/Mastery-Anker

- Seed-Anker: lokaler Run-Seed, rerollbar, plus Daily-Seed-Referenz fuer denselben Kalendertag.
- Replay-Anker: expliziter UI-Platzhalter fuer den spaeteren Recorder-Hook.
- Daily-Anker: expliziter UI-Platzhalter fuer den spaeteren Daily-Challenge-Pfad.
- Vehicle-Mastery-Anker: sichtbarer Status fuer aktives Airframe als Bruecke zu V45.3 (Mastery/Blueprint).

## Umsetzungsphasen

- [ ] 45.0 Produkt-Freeze und Research-Transfer
  - [ ] 45.0.1 Arcade-Produktbild festziehen: `Arcade Run` als V1-Kern, `Sprint 5` und `Daily Seed` als Folgepfade dokumentieren
  - [ ] 45.0.2 Run-Pfeiler, Erfolgskriterien und harte Nicht-Ziele definieren: keine Meta-Progression, kein neuer `GAME_MODE_TYPE`, Singleplayer-first

- [ ] 45.1 Runtime- und Vertragsfundament
  - [ ] 45.1.1 `MenuDefaultsEditorConfig`, `SettingsManager`, `MenuRuntimeSessionService` und `RuntimeConfig` um einen sauberen `arcade`-Block erweitern
  - [ ] 45.1.2 Architekturgrenze absichern: Bot-/Training-Vertrag bleibt `classic|hunt`; Arcade wird als Session-/Run-Layer modelliert

- [ ] 45.2 Arcade-Run-Lifecycle aufbauen
  - [ ] 45.2.1 Separaten `ArcadeRunState` mit Phasen wie `warmup`, `sector_active`, `intermission`, `sudden_death`, `finished` einfuehren
  - [ ] 45.2.2 `GameRuntimeFacade`, `MatchSessionFactory` und `MatchFlowUiController` so erweitern, dass Arcade ohne klassischen Rundensieg-Zyklus funktioniert

- [ ] 45.3 Score-, Combo- und Risiko-System
  - [ ] 45.3.1 `ArcadeScoreOps` definieren: Punkte fuer Kills, lange Ueberlebensketten, enge Passagen, No-Damage-Sektoren, Bounties und Hazard-Spiel
  - [ ] 45.3.2 Multiplikator-/Combo-Fenster, Decay-Regeln, Rank-Auswertung (`C` bis `S` oder aehnlich) und Bestwert-Speicherung modellieren

- [ ] 45.4 Encounter Director und Content-Profile
  - [ ] 45.4.1 Sektor-/Wellen-Katalog bauen: Bot-Squad-Profile, Spawn-Druck, Zieltypen, Modifikatoren, Seed-basiertes Sequencing
  - [ ] 45.4.2 Bestehende Systeme als Arcade-Hebel orchestrieren: Portale, Powerups, Kartenzonen, Geschwindigkeitsfenster, Bounty-Ziele, eventuell Mini-Boss-artige Elite-Squads

- [ ] 45.5 Run-Shaping, Flugzeug-Leveling und Belohnungsentscheidungen
  - [ ] 45.5.1 Zwischen-Sektor-Drafts und run-temporare Flugzeug-Levelups einfuehren: z. B. mehr Score-Risiko, mehr Haltbarkeit, mehr Tempo, mehr Item-Dichte, mehr Portal-Chaos
  - [ ] 45.5.2 Kontrollierte Fehlerverzeihung und Run-Mod-Taxonomie modellieren: Repair-/Shield-/Continue-Mechaniken, Decay-Regeln und Rueckbau am Run-Ende

- [ ] 45.6 Persistente Airframe-Mastery und Vehicle-Editor-Integration
  - [ ] 45.6.1 Save- und Progressionsmodell fuer `airframeXp`, `airframeLevel`, Budgetpunkte, Part-Familien und Overclock-Freischaltungen definieren
  - [ ] 45.6.2 Vehicle-Lab an Runtime anschliessen: Blueprint-Schema, `data/vehicles/**`, generierte Configs, Hitbox-/Budget-Guards und Loadout-Bruecke ins Menue

- [ ] 45.7 UI, HUD und Menueeinbindung
  - [ ] 45.7.1 Menuepfad fuer Arcade aufwerten: Run-Vorschau, Submodus-Karten, Schwierigkeits-Presets, Highscore-Anker und Airframe-Mastery-Status
  - [ ] 45.7.2 Ingame-HUD und Post-Run-Bildschirm fuer Arcade bauen: Score, Multiplikator, Sektorstatus, naechste Belohnung, Flugzeug-Levelups und Blueprint-/Mastery-Fortschritt

- [ ] 45.8 Replayability, Balancing, Accessibility und Telemetrie
  - [ ] 45.8.1 Event-Playlist, Seeds, Recorder-/Replay-Anbindung sowie spaetere `Sprint 5`-/`Daily Seed`-Pfade anschlussfaehig machen
  - [ ] 45.8.2 Arcade-spezifische Difficulty-Presets, Assist-Optionen und Telemetrie fuer Sterbegruende, Reward-Picks, Build-Performance und Dominanz-Builds einfuehren

- [ ] 45.9 Verifikation und Abschluss-Gate
  - [ ] 45.9.1 Funktionale Grenzen pruefen: `npm run test:fast`, `npm run smoke:roundstate`, `npm run test:stress` und zusaetzlich `npm run smoke:arcade` (neu)
  - [ ] 45.9.2 Abschluss mit `npm run docs:sync`, `npm run docs:check` und Doku-Freeze

## Verifikation

- Nach 45.1:
  - `npm run test:core`
- Nach 45.2:
  - `npm run smoke:roundstate`
  - `npm run test:core`
- Nach 45.4:
  - `npm run test:fast`
  - `npm run smoke:arcade` (neu)
- Nach 45.6:
  - `npm run test:core`
  - gezielter Vehicle-Editor -> Runtime-Blueprint Spotcheck
- Nach 45.7:
  - `npm run test:core`
  - `npm run test:stress`
- Vor Abschluss:
  - `npm run test:fast`
  - `npm run smoke:roundstate`
  - `npm run smoke:arcade`
  - `npm run docs:sync`
  - `npm run docs:check`

## Doku-Impact

- `docs/Umsetzungsplan.md`
- `docs/ai_architecture_context.md` falls neue Runtime-Vertraege fuer `runtimeConfig.arcade` oder neue State-Module eingefuehrt werden
- `docs/Dokumentationsstatus.md` indirekt ueber `docs:sync`

## Freshness-Hinweis

Der Plan gilt erst als sauber uebernommen, wenn nach einer spaeteren Umsetzung mindestens `npm run docs:sync` und `npm run docs:check` erfolgreich auf dem finalen Stand gelaufen sind.
