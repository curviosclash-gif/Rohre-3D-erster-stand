---
id: V82
title: Arcade-Parcours Progression XP Flugzeug-Tuning
status: planned
priority: P2
owner: frei
depends_on:
  - V72.99
  - V74.99
blocked_by: []
affected_area: arcade-parcours-progression
scope_files:
  - src/state/arcade/ArcadeVehicleProfile.js
  - src/state/arcade/ArcadeRunState.js
  - src/state/arcade/ArcadeLeaderboard.js
  - src/state/arcade/ArcadeGhostRecorder.js
  - src/state/storage/StoragePlatform.js
  - src/ui/StorageKeys.js
  - src/entities/systems/ParcoursProgressSystem.js
  - src/entities/systems/ParcoursProgressUtils.js
  - src/entities/arena/portal/PortalLayoutBuilder.js
  - src/entities/arena/portal/CheckpointRingMeshFactory.js
  - src/entities/arena/portal/CheckpointRingRuntime.js
  - src/entities/aircraft-mesh.js
  - src/entities/vehicle-registry.js
  - src/entities/Player.js
  - src/modes/ArcadeModeStrategy.js
  - src/core/config/maps/presets/parcours_maps.js
  - src/state/training/RewardCalculator.js
  - src/ui/HudRuntimeSystem.js
  - src/ui/arcade/ArcadeVehicleManager.js
  - src/ui/arcade/VehicleManagerCatalog.js
verification:
  - npm run build
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
updated_at: 2026-04-02
source_history:
  - docs/plaene/neu/Feature_Arcade_Parcours_Progression_V82.md
---

# V82 Arcade-Parcours Progression XP Flugzeug-Tuning

## Ziel

Arcade und Parcours zu einem einzigen Spielmodus vereinen, in dem Parcours-Checkpoints als Sektoren innerhalb des Arcade-Loops fungieren. Spieler sammeln XP durch Checkpoint-Completion, Bestzeiten und Sektor-Abschluss. Die gesammelten XP fliessen in ein persistentes Flugzeug-Progressionssystem (Level, Upgrades, Slot-Freischaltungen). Ergaenzt um Bestzeiten-Leaderboard, Segment-Splits, Ghost-Replay, Branching-Routen, visuelle Checkpoint-Zustaende, Minimap, Ring-Animationen und Parcours-Reward fuer Bot-Training.

## Nicht-Ziel

- Kein Shop- oder Waehrungssystem (bleibt V76 Hangar-UI vorbehalten).
- Keine Desktop-Hangar-Oberflaeche (V76).
- Kein Online-Leaderboard oder Multiplayer-Ranking (V64).
- Keine neuen Fahrzeug-3D-Modelle; nur Stat-Tuning und Slot-basierte Aenderungen.

## Kontext: Bestehende Systeme

Das XP/Level-System in `ArcadeVehicleProfile.js` ist bereits weitgehend implementiert (XP-Kurve, 30 Level, 15 Slots, Mastery-Perks, Persistence via StoragePlatform). Dieser Block aktiviert und erweitert es um die Parcours-Integration und die fehlenden Gameplay-Feedback-Systeme.

## Definition of Done

- [ ] DoD.1 Arcade und Parcours laufen als ein vereinter Modus; Parcours-Maps erscheinen als Arcade-Sektoren mit Checkpoint-Routing.
- [ ] DoD.2 XP wird bei Checkpoint-Durchgang, Sektor-Abschluss und Parcours-Completion vergeben und persistent gespeichert.
- [ ] DoD.3 Lokales Bestzeiten-Leaderboard pro Route speichert Top-10-Zeiten mit Segment-Splits.
- [ ] DoD.4 Ghost-Replay zeichnet Positionen auf und spielt die Bestzeit als transparenten Geist ab.
- [ ] DoD.5 Mindestens eine Parcours-Map bietet eine Branching-Route (schnell+riskant vs. sicher+langsam).
- [ ] DoD.6 Checkpoint-Ringe zeigen drei visuelle Zustaende: inaktiv (grau), naechstes Ziel (pulsierend), bestanden (gruen).
- [ ] DoD.7 HUD zeigt Segment-Splits mit Delta zur Bestzeit an.
- [ ] DoD.8 Minimap/Routenvorschau zeigt aktuelle Position und verbleibende Checkpoints.
- [ ] DoD.9 Ring-Durchflug loest eine sichtbare Puls-/Partikelanimation aus.
- [ ] DoD.10 Flugzeug-Stats (Speed, Turn-Rate, HP, Boost) aendern sich durch Level und installierte Upgrades.
- [ ] DoD.11 `wrongOrderCount` fuehrt zu einer konfigurierbaren Zeitstrafe (+2s default).
- [ ] DoD.12 RewardCalculator vergibt gestaffelten Parcours-Reward fuer Bot-Training (+0.5/CP, +2.0/Completion).

## Risiken

- R1 | hoch | Arcade-Sektor-Logik und Parcours-Checkpoint-Logik divergieren bei Zustandsuebergaengen (Intermission vs. CP-Reset).
- R2 | mittel | Ghost-Replay-Aufzeichnung erzeugt Speicherdruck bei langen Routen.
- R3 | mittel | Branching-Routen erhoehen die Checkpoint-Validierungs-Komplexitaet (Lane-Alias-Erweiterung).
- R4 | niedrig | Minimap-Rendering muss performant bleiben bei >20 Checkpoints.
- R5 | mittel | Flugzeug-Stat-Modifikatoren aus Upgrades muessen mit Arcade-Modifiern (tight_turns, heat_stress) sauber stacken.

## Abhaengigkeit zu V76

V82 liefert die **Gameplay-Daten und Contracts**, V76 liefert die **Desktop-Hangar-UI**. Reihenfolge: V82 zuerst (Daten, Logik, Persistence), V76 danach (Darstellung, Werkstatt, Desktop-Navigation). V76.3 (Arcade-Hangar) wird direkt auf V82-Contracts aufbauen.

## Phasen

### 82.1 Arcade-Parcours-Vereinigung
status: open
goal: Parcours-Maps als Arcade-Sektoren integrieren, einheitlicher Modus-Einstieg
output: Parcours-Checkpoints fungieren als Sektor-Ziele im Arcade-Loop

- [ ] 82.1.1 `ArcadeModeStrategy` erweitern: Parcours-Maps als Sektor-Typ `sector_parcours` registrieren.
- [ ] 82.1.2 Sektor-Abschluss bei Parcours durch Checkpoint-Completion statt Timer/Kill-Count ausloesen.
- [ ] 82.1.3 Intermission-Phase zwischen Parcours-Sektoren analog zu bestehenden Sektoren beibehalten.
- [ ] 82.1.4 Einheitlichen Modus-Einstieg sicherstellen: Spieler waehlt "Arcade" und erhaelt gemischte Sektor-Typen (Arena + Parcours).

### 82.2 XP-Sammlung und Persistenz
status: open
goal: XP-Vergabe bei Parcours-Events aktivieren und persistent speichern
output: XP fliesst aus Checkpoint/Sektor/Completion in ArcadeVehicleProfile

- [ ] 82.2.1 XP-Reward-Tabelle in `ArcadeVehicleProfile` um Parcours-Events erweitern: Checkpoint (+10 XP), Sektor-Complete (+50 XP), Parcours-Finish (+80 XP), Bestzeit-Bonus (+40 XP).
- [ ] 82.2.2 `ParcoursProgressSystem` ruft `addXp()` bei Checkpoint-Trigger und Completion auf.
- [ ] 82.2.3 XP-Vergabe im HUD als kurze Einblendung ("+10 XP") sichtbar machen.
- [ ] 82.2.4 Sicherstellen, dass `saveVehicleProfiles()` nach jedem Run-Ende aufgerufen wird.

### 82.3 Bestzeiten-Leaderboard und Segment-Splits
status: open
goal: Lokale Bestzeiten pro Route mit Segment-Aufschluesselung speichern und anzeigen
output: Top-10-Leaderboard pro Route, Split-Zeiten im HUD

- [ ] 82.3.1 `ArcadeLeaderboard.js` erstellen: Schema fuer Route-ID, Gesamtzeit, Segment-Splits (Array von Checkpoint-Zeiten), Datum, Fahrzeug-ID.
- [ ] 82.3.2 Persistence via StoragePlatform unter Key `cuviosclash.parcours-leaderboard.v1`.
- [ ] 82.3.3 Bei Parcours-Completion automatisch einsortieren (Top 10 pro Route behalten).
- [ ] 82.3.4 HUD-Erweiterung: Segment-Split nach jedem Checkpoint anzeigen mit Delta zur Bestzeit (gruen = schneller, rot = langsamer).

### 82.4 Ghost-Replay
status: open
goal: Bestzeit-Durchlauf als transparenten Geist aufzeichnen und abspielen
output: Ghost-Flugzeug faehrt die Bestzeit-Route visuell ab

- [ ] 82.4.1 `ArcadeGhostRecorder.js` erstellen: Position+Rotation alle 50ms samplen, kompakt als Float32Array speichern.
- [ ] 82.4.2 Speicherlimit: Max 60s Aufzeichnung (~1200 Samples), aeltere Ghosts ueberschreiben.
- [ ] 82.4.3 Ghost-Playback als halbtransparentes Mesh (alpha 0.3) ohne Kollision rendern.
- [ ] 82.4.4 Ghost ein-/ausschaltbar ueber Parcours-Regeln (`rules.showGhost: true`).
- [ ] 82.4.5 Ghost-Daten zusammen mit Leaderboard-Eintrag persistent speichern (nur Platz 1 pro Route).

### 82.5 Branching-Routen
status: open
goal: Mindestens eine Map mit optionaler Routenwahl (schnell+riskant vs. sicher)
output: Lane-Alias-System erweitert um bewusste Verzweigungen

- [ ] 82.5.1 `ParcoursProgressUtils.buildRouteFromParcours()` um Branch-Nodes erweitern: ein Checkpoint kann zwei Folge-Checkpoints definieren.
- [ ] 82.5.2 Branch-Regeln: beide Pfade muessen zum selben Merge-Checkpoint fuehren.
- [ ] 82.5.3 `parcours_rift`-Map um einen Branch erweitern (z.B. CP04 splittet in CP04a-Tunnel vs. CP04b-Boost, beide fuehren zu CP05).
- [ ] 82.5.4 Visuelle Kennzeichnung: Branch-Checkpoints in eigener Farbe (z.B. cyan).

### 82.6 Checkpoint-Zustandsfarben und Ring-Animation
status: open
goal: Ringe zeigen visuell den Fortschritt, Durchflug-Animation bei Trigger
output: Dreifarbige Checkpoint-Ringe mit Puls-Effekt

- [ ] 82.6.1 `CheckpointRingMeshFactory` um drei Zustaende erweitern: `inactive` (grau, 0x666666), `next` (pulsierend lime, animierte Emissive-Intensitaet), `passed` (gruen, 0x00cc00, reduzierte Emissive).
- [ ] 82.6.2 `CheckpointRingRuntime` aktualisiert Zustaende pro Frame basierend auf `passedMask` und `nextCheckpointIndex`.
- [ ] 82.6.3 Durchflug-Animation: kurzer Scale-Pulse (1.0 → 1.3 → 1.0 ueber 300ms) + Partikel-Burst beim Trigger.
- [ ] 82.6.4 Finish-Ring erhaelt eigene Completion-Animation (Gold-Pulse + Partikel-Regen).

### 82.7 Minimap und Routenvorschau
status: open
goal: Kleine Uebersichtskarte mit Route, Checkpoints und Spielerposition
output: HUD-Element mit Minimap

- [ ] 82.7.1 Minimap als Canvas-Overlay (200x200px, oben-rechts) mit Top-Down-Projektion der Checkpoint-Positionen.
- [ ] 82.7.2 Checkpoints als farbige Punkte (gleiche Zustandsfarben wie 82.6), Spieler als weisser Pfeil.
- [ ] 82.7.3 Verbindungslinien zwischen aufeinanderfolgenden Checkpoints; Branches als Y-Gabelung.
- [ ] 82.7.4 Minimap ein-/ausblendbar (Toggle-Taste, default: M).

### 82.8 Flugzeug-Tuning durch Progression
status: open
goal: Level und Upgrades aendern tatsaechlich die Flugzeug-Stats im Gameplay
output: Stat-Modifikatoren aus ArcadeVehicleProfile werden zur Laufzeit angewendet

- [ ] 82.8.1 `Player.js` beim Spawn: `getSlotStatBonuses()` und `getMasteryPerks()` aus dem aktiven Profil laden und auf Basis-Stats anwenden.
- [ ] 82.8.2 Stat-Modifikatoren stacken multiplikativ mit Arcade-Modifiern (tight_turns etc.): `finalStat = baseStat * upgradeMultiplier * arcadeModifier`.
- [ ] 82.8.3 HUD-Anzeige: aktuelle effektive Stats (Speed, Turn, HP, Boost) beim Sektor-Start kurz einblenden.
- [ ] 82.8.4 Balance-Cap: Gesamtbonus aus Upgrades darf +50% pro Stat nicht ueberschreiten.

### 82.9 Parcours-Penalties und Zeitstrafen
status: open
goal: Falscher Checkpoint-Reihenfolge eine spuerbare Konsequenz geben
output: Konfigurierbare Zeitstrafe bei Wrong-Order

- [ ] 82.9.1 Neuer Regelparameter `rules.wrongOrderPenaltyMs` (default: 2000ms).
- [ ] 82.9.2 Bei Wrong-Order: Penalty auf `completionTimeMs` addieren und im HUD rot anzeigen ("+2.0s PENALTY").
- [ ] 82.9.3 Penalty-Summe in Leaderboard-Eintrag separat erfassen fuer Transparenz.

### 82.10 Bot-Training Parcours-Reward
status: open
goal: RewardCalculator vergibt expliziten Parcours-Reward fuer effektiveres Training
output: Gestaffelter Checkpoint-Bonus im Reward-Signal

- [ ] 82.10.1 `RewardCalculator` um Parcours-Gewichte erweitern: `checkpointReached: +0.5`, `parcoursCompleted: +2.0`, `wrongOrder: -0.3`.
- [ ] 82.10.2 Parcours-Rewards nur aktiv wenn `parcours.enabled` in der Map-Definition.
- [ ] 82.10.3 Bestehende Reward-Caps pruefen und ggf. anpassen damit Parcours-Bonusse nicht geclippt werden.

### 82.99 Abschluss-Gate
status: open
goal: Alle Systeme integriert, persistiert, verifiziert
output: Gruene Build-, Plan- und Doku-Gates

- [ ] 82.99.1 `npm run build`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` gruen.
- [ ] 82.99.2 Ein vollstaendiger Arcade-Run mit Parcours-Sektoren laeuft durch: XP wird vergeben, Bestzeit gespeichert, Ghost sichtbar, Checkpoint-Farben korrekt.
- [ ] 82.99.3 Flugzeug-Stats aendern sich nachweislich durch Level-Up und Upgrade-Installation.
- [ ] 82.99.4 Bot-Training-Run mit Parcours-Map zeigt Reward-Signal fuer Checkpoint-Events.

## Einordnung im Umsetzungsplan

**Abhaengigkeiten:**
- V72.99 (hard): Stabile Pickup-/Portal-/Gate-Vertraege als Basis fuer erweiterte Checkpoint-Logik.
- V74.99 (hard): Runtime-Entkopplung muss abgeschlossen sein fuer saubere State-Komposition.
- V76 (liefert-an): V76.3 (Arcade-Hangar) baut direkt auf V82-Contracts auf. V82 sollte vor V76.3 abgeschlossen sein.

**Empfohlene Position:** Nach V74.99 und V72.99, vor V76. Prioritaet P2, da Kern-Gameplay-Progression.
