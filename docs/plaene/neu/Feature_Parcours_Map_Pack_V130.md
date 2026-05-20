---
planned_block_id: V130
title: Kreatives Parcours Map Pack und Arcade-Routenvarianz
status: draft
priority: P2
owner: frei
created_at: 2026-05-20
affected_area: parcours-map-pack
depends_on:
  - V82.99
  - V108.99
  - V115.99
soft_depends_on:
  - V106.99
  - V113.99
  - V128.99
  - V129.99
blocked_by: []
---

# Feature: Kreatives Parcours Map Pack und Arcade-Routenvarianz (V130)

## Ziel

Curvios Clash bekommt ein bewusst kuratiertes Parcours-Map-Pack, das nicht nur "mehr Strecken" liefert, sondern klar unterscheidbare Skill-Erlebnisse:

- kurze Tutorial- und Warm-up-Routen fuer sofortige Erfolgserlebnisse,
- Ghost-taugliche Flow-Strecken mit starkem "noch ein Lauf"-Sog,
- Branching-Routen mit echten Risiko-/Belohnungsentscheidungen,
- vertikale Setpieces fuer Desktop-Spektakel,
- engere Praezisionsrouten fuer fortgeschrittene Piloten,
- spaetere Kandidaten fuer GLB-/Asset-Setdressing, ohne V106/V128/V129 zu blockieren.

Der Block soll die bestehende Parcours-Technik aus `V82`, die Ghost-Selbstduell-Policy aus `V108` und die Playability-Erkenntnisse aus `V115` in ein groesseres, spielbares Content-Paket ueberfuehren.

Kurzform:

```text
Heute:
- parcours_rift + Sprint + Precision als Kernfamilie.
- weitere thematische Parcours-Presets existieren bereits, aber Arcade-Sektorpool nutzt nur Rift.
- Ghost, Leaderboard, Splits und Minimap sind technisch bereit.

V130:
- 6 neue shipping-faehige Parcours-Routen im ersten Pack.
- 6 weitere kreative Backlog-Entwuerfe mit klarer Umsetzungsreihenfolge.
- Desktop-App erhaelt Vielfalt; Browser-Demo bleibt bei kuratierter Parcours-Allowlist.
```

## Ausgangslage

Vorhandene produktive Parcours-Basis:

- `src/core/config/maps/presets/parcours_maps.js` enthaelt `parcours_rift`, `parcours_rift_sprint` und `parcours_rift_precision`.
- Weitere Parcours-Presets sind bereits katalogisiert: `vulkan_odyssey`, `frozen_helix`, `neon_circuit`, `sky_islands`, `abyssal_descent`, `magma_maze`.
- `src/entities/systems/ParcoursProgressUtils.js` unterstuetzt lineare Routen, `aliasOf`, `nextIds`-Branches, Branch-Merge-Metadaten, Wrong-Order-Penalties, Ghost-Opt-out und animierte Checkpoints.
- `src/state/arcade/ArcadeMapProgression.js` nutzt fuer `sector_parcours` aktuell nur die drei Rift-Varianten.
- `V108` speichert die laengste eigene Ghost-Spur pro Route; stabile `routeId`s sind deshalb Content-Vertrag, nicht Kosmetik.
- `V115` hat gezeigt: zu kleine Precision-Plattformen verschlechtern Spielbarkeit schnell; neue Map-Ideen brauchen Playability-Budget und gezielte Guard-Signale.

Aktuelle Luecken:

- Die vorhandenen thematischen Parcours-Maps werden nicht voll als Arcade-Varianz ausgespielt.
- Es fehlt eine sehr kurze Einsteigerroute, die man in 20-30 Sekunden wiederholen kann.
- Es fehlt eine "Mirror / Memory"-Route, bei der die beste Spur fast wie ein Gegner wirkt.
- Es fehlt eine Switchyard-/Weichenroute, die Branching als Kernmechanik nutzt.
- Es fehlt eine Route mit klarer vertikaler Kathedralen-Fantasie, die Slingshots als Hauptskill nutzt.
- Es fehlt eine lange Flow-Route, deren Ghost-Duell ueber mehrere Segmente wirklich spannend ist.

## Nicht-Ziel

- Kein Rewrite von `ParcoursProgressSystem`, Ghost-Library, Leaderboard oder Minimap.
- Keine beweglichen Plattformen, rotierenden Hindernisse oder echte Zeit-Hazards, solange die Runtime dafuer keinen stabilen produktiven Pfad hat.
- Kein Browser-Demo-Ausbau als Nebenwirkung. Die Demo-Allowlist bleibt konservativ, insbesondere `parcours_rift` als Tutorialpfad.
- Kein unkuratierter Asset-Import aus `assets/models/downloaded_cc0/**`.
- Kein GLB-Pflichtscope. GLB-Setdressing ist optionaler Spaetpfad nach V106/V128/V129.
- Kein Editor-Redesign. Editor-/Authoring-Luecken werden nur dokumentiert, nicht in diesem Block geloest.
- Kein Online-Leaderboard, kein Multiplayer-Ranking, kein Shop-/Waehrungssystem.

## Engine- und Design-Leitplanken

Diese Regeln begrenzen die Kreativitaet bewusst auf etwas, das in der bestehenden Runtime landen kann:

1. Routen bleiben gerichtete, acyclische Checkpoint-Graphen. `nextIds` duerfen nur auf spaetere kanonische Checkpoints zeigen.
2. Ein Branch ist nur dann "sauber", wenn beide Branch-Optionen wieder in denselben Merge-Checkpoint fuehren.
3. Echte Loops werden als laengere Sequenz modelliert, nicht als Rueckkante.
4. "Timing"-Ideen werden vorerst durch Gate-Cooldowns, enge Linien, visuelle Rhythmik und Ghost-Druck ausgedrueckt, nicht durch bewegliche Geometrie.
5. Jeder neue Map-Key braucht eine stabile `routeId`. Nach Release darf sie nur mit Migration geaendert werden, weil Ghosts und Leaderboards daran haengen.
6. Jede Route muss auch ohne Powerups finishbar sein. Items duerfen Linien belohnen, aber nicht Pflicht sein.
7. Foam ist Rettung, Trainingshilfe oder weiche Bande, nicht Ausrede fuer unlesbare Strecken.
8. Desktop-App ist Primaerziel. Browser-Demo bleibt reduziert, bis der User explizit mehr Demo-Content will.

## Design-Achsen fuer neue Maps

| Achse | Zweck | Bestehende Abdeckung | V130-Ergaenzung |
| --- | --- | --- | --- |
| Tutorial kurz | 20-30s, niedrige Frustschwelle | Rift Sprint ist noch relativ gross | `micro_maw` |
| Mirror/Memory | Ghost-Duell, symmetrische Linienwahl | kaum vorhanden | `mirror_docks` |
| Speed/Flow | saubere Kurven, Boost-Linien | Neon/Vulkan teilweise | `glass_serpent` |
| Branching/Weichen | echte Entscheidung mit Merge | Rift hat einen Branch | `storm_switchyard` |
| Vertikal/Slingshot | Hoehenkontrolle, Setpiece | Frozen/Abyssal vorhanden, aber anders | `wind_cathedral` |
| Endurance/Ghost | lange Route, Segment-Splits wichtig | Vulkan lang, aber sehr hart | `chrono_spillway` |
| Rhythmus/Timing | Puls-Gefuehl ohne Moving Parts | fehlt | `pulse_foundry` |
| Orientierung/Minimalismus | wenig Deko, klare Linien | fehlt | `blackbox_ballet` |

## Map-Pack-Schnitt

### MVP-Pack: 6 shipping-faehige Maps

| Key | Name | Rolle | Zielzeit | Schwierigkeit | Kernmechanik |
| --- | --- | --- | --- | --- | --- |
| `micro_maw` | Mikro-Maul | kurzer Tutorial-Loop | 22-30s | leicht | enge, aber faire Mini-Tunnel |
| `mirror_docks` | Spiegelwerft | Memory/Ghost-Duell | 36-46s | mittel | linke/rechte Spiegelroute mit Merge |
| `glass_serpent` | Glasschlange | Speed-Flow | 44-56s | mittel | S-Kurve, Tube-Shortcut, kontrollierte Boosts |
| `storm_switchyard` | Sturmweiche | Branching-Route | 48-62s | mittel-hoch | Weichenentscheidung: sicherer Rangierhof vs. riskanter Hochgleis-Schnitt |
| `wind_cathedral` | Windkathedrale | vertikales Setpiece | 50-65s | mittel | Slingshot-Kette durch Turmboegen |
| `chrono_spillway` | Chrono-Abfluss | lange Ghost-/Split-Route | 62-78s | hoch | abfallende Kanalroute mit Safe/Risk-Sluice |

### Spaeteres Backlog: 6 kreative Folgeideen

| Key | Name | Rolle | Warum spaeter |
| --- | --- | --- | --- |
| `gravity_orchard` | Schwerkraftgarten | schwebende Route mit "Fruchtinseln" | braucht besonders sorgfaeltiges Falling-/Rescue-Tuning |
| `pulse_foundry` | Pulsschmiede | Rhythmusroute | profitiert von besserer visueller Puls-Kommunikation |
| `blackbox_ballet` | Blackbox Ballet | Minimalismus-/Memory-Route | braucht HUD-/Preview-Sorgfalt, damit es nicht leer wirkt |
| `lumen_quarry` | Lumenbruch | Terrassen-Steinbruch | passt gut zu spaeterem GLB-/Asset-Setdressing |
| `ember_viaduct` | Gluehviadukt | Hochgeschwindigkeits-Brueckenroute | hohes Clipping-/Frust-Risiko |
| `comet_yards` | Kometenhof | Debris-Feld mit langen Sichtachsen | braucht sehr gute Bot-/Spawn-Abstaende |

## Detailentwurf 1: `micro_maw` - Mikro-Maul

### Spielerlebnis

`micro_maw` ist die kleine, bissige Route fuer "nur noch ein Versuch". Sie soll sich wie ein Trainingskaefig anfuehlen: kurze Distanz, klare Tore, keine langen Rueckwege. Die Schwierigkeit entsteht nicht durch Tod, sondern durch saubere Linien.

### Layout

- Groesse: `[110, 50, 120]`
- Hoehenband: y 10-24
- Zielzeit Bronze/Silber/Gold: 30s / 25s / 21s
- Checkpoints: 7 plus Finish
- Reset-Policy: `resetToLastValid: true`, `resetOnDeath: false`
- Wrong-Order-Penalty: 1000ms
- Ghost: aktiv

### Route-Skizze

| CP | Typ | Position | Radius | Zweck |
| --- | --- | --- | --- | --- |
| CP01 | entry | `[-44, 12, -42]` | 6.5 | ruhiger Einstieg |
| CP02 | gate | `[-30, 14, -22]` | 5.4 | erster Richtungswechsel |
| CP03 | tunnel | `[-12, 15, -4]` | 4.2 | Mini-Maul, enger Fokus |
| CP04 | gate | `[8, 16, 16]` | 5.0 | Linie oeffnen |
| CP05 | precision | `[30, 17, 8]` | 4.0 | enger Zielpunkt |
| CP06 | tunnel | `[42, 18, -18]` | 4.1 | zweite Bisskante |
| CP07 | finish_pre | `[48, 17, -38]` | 5.2 | Finish vorbereiten |
| FINISH | finish | `[52, 16, -52]` | 6.8 | kurzer Abschluss |

### Obstacle-Ideen

- Zwei "Kiefer"-Waende mit je einem Tunnel, Achse `x`, Radius 4.2.
- Foam-Bodenstreifen unter den engen Tunneln, damit Fehler Zeit kosten, aber nicht hart abbrechen.
- Drei niedrige Pilaster als Slalom-Lesbarkeit.
- Keine Portale, ein kleiner Boost nach CP04.

### Items

- `SPEED_UP` nach CP02 fuer mutige Gold-Linie.
- `SHIELD` vor CP05 als Einsteigerhilfe.
- Kein Rocket-Item, damit Tutorial-Charakter sauber bleibt.

### Warum diese Map wichtig ist

Sie gibt dem Parcours-Modus einen echten Einstieg: eine Route, die man in unter einer halben Minute versteht, wiederholt und mit dem Ghost sofort verbessern kann.

## Detailentwurf 2: `mirror_docks` - Spiegelwerft

### Spielerlebnis

Die Spiegelwerft ist eine symmetrische Dockanlage mit zwei fast gleichen, aber nicht identischen Linien. Links ist kuerzer und enger, rechts ist breiter, hat aber einen spaeteren Richtungswechsel. Der eigene Ghost wird hier besonders wertvoll, weil man sieht, welche Seite langfristig schneller ist.

### Layout

- Groesse: `[190, 65, 150]`
- Hoehenband: y 14-34
- Zielzeit Bronze/Silber/Gold: 46s / 40s / 35s
- Checkpoints: 9 plus Finish
- Branch: CP03 -> CP04_LEFT oder CP04_RIGHT -> CP05
- Reset-Policy: `resetOnDeath: true`, `resetToLastValid: false`
- Wrong-Order-Penalty: 1800ms
- Ghost: aktiv

### Route-Skizze

| CP | Typ | Position | Radius | Next |
| --- | --- | --- | --- | --- |
| CP01 | entry | `[-82, 16, 0]` | 6.8 | linear |
| CP02 | gate | `[-56, 18, 0]` | 5.8 | linear |
| CP03 | branch_entry | `[-30, 20, 0]` | 5.4 | `CP04_LEFT`, `CP04_RIGHT` |
| CP04_LEFT | branch_precision | `[-6, 23, -34]` | 4.6 | `CP05` |
| CP04_RIGHT | branch_boost | `[-4, 21, 34]` | 5.8 | `CP05` |
| CP05 | gate | `[24, 24, 0]` | 5.4 | merge |
| CP06 | split | `[48, 26, -18]` | 5.0 | linear |
| CP06_R | split alias | `[48, 26, 18]` | 5.0 | alias of CP06 |
| CP07 | tunnel | `[70, 28, 0]` | 4.4 | linear |
| CP08 | finish_pre | `[86, 26, -22]` | 5.2 | linear |
| FINISH | finish | `[94, 24, -38]` | 6.8 | done |

### Obstacle-Ideen

- Zwei Dockarme links/rechts, gespiegelt als lange Plattformen.
- Zentraler Glas-Tunnel durch eine Werftbruecke bei CP07.
- Foam-Fender an Dockkanten, damit Wandkontakt lesbar bleibt.
- Zwei Portalpaare nur als Recovery: Aussenbecken -> kurz vor CP05.

### Items

- Links: `SPEED_UP` knapp vor CP04_LEFT, schwer zu treffen.
- Rechts: `SHIELD` auf breiter Linie.
- Nach CP05: `GHOST`/Coin zentral, um beiden Routen gleiche Chance zu geben.

### Balancing-Hypothese

Die linke Linie soll 1.0-1.5s schneller sein, aber deutlich hoeheres Fehlerpotenzial haben. Die rechte Linie ist fuer Erstspieler stabiler und fuer Bot-/Ghost-Vergleiche sauberer.

## Detailentwurf 3: `glass_serpent` - Glasschlange

### Spielerlebnis

Eine lange S-Kurve aus transparent wirkenden Tube- und Brueckensegmenten. Die Map soll nicht hart wirken, sondern gleiten: Wer Boosts zu frueh nimmt, rutscht aus der Ideallinie; wer sauber dosiert, fliegt in einem Zug durch.

### Layout

- Groesse: `[260, 80, 160]`
- Hoehenband: y 18-48
- Zielzeit Bronze/Silber/Gold: 56s / 49s / 43s
- Checkpoints: 11 plus Finish
- Branch: CP06 -> CP07_TUBE oder CP07_BALCONY -> CP08
- Reset-Policy: `resetOnDeath: true`
- Wrong-Order-Penalty: 2000ms
- Ghost: aktiv

### Route-Skizze

| CP | Typ | Position | Radius | Zweck |
| --- | --- | --- | --- | --- |
| CP01 | entry | `[-116, 20, -36]` | 7.0 | weiter Start |
| CP02 | gate | `[-88, 22, -18]` | 5.8 | erster S-Bogen |
| CP03 | tunnel | `[-54, 26, 18]` | 5.0 | Schlange quert |
| CP04 | gate | `[-18, 30, 34]` | 5.4 | Tempo halten |
| CP05 | gate | `[16, 34, 10]` | 5.2 | in Mitte einfuehren |
| CP06 | branch_entry | `[42, 36, -18]` | 5.0 | Shortcut-Wahl |
| CP07_TUBE | branch_tunnel | `[68, 38, -42]` | 4.2 | schnell/eng |
| CP07_BALCONY | branch_gate | `[72, 42, 10]` | 5.8 | sicher/weit |
| CP08 | gate | `[98, 40, -6]` | 5.4 | Merge |
| CP09 | precision | `[116, 38, 28]` | 4.4 | Ideallinie |
| CP10 | finish_pre | `[120, 34, 52]` | 5.4 | Bremse |
| FINISH | finish | `[112, 32, 66]` | 7.0 | Abschluss |

### Obstacle-Ideen

- Drei lange `shape: 'tube'`-Segmente als Schlangenkoerper.
- Aussenwaende aus Foam, damit die Route schnell bleibt, aber Fehler bouncen.
- Zwei Boost-Gates auf Geraden, ein Slingshot nur vor dem hohen Balkon.
- Keine Portale im Hauptpfad; ein Recovery-Portal vom unteren Foam-Feld nach CP05.

### Items

- `SPEED_UP` vor CP03 und CP08.
- `SHIELD` vor dem engen Tube-Shortcut.
- `ROCKET_WEAK` nur ausserhalb der Ideallinie, damit es Zeit kostet.

### Balancing-Hypothese

Der Tube-Branch soll im Bestfall 2s schneller sein, aber CP07_TUBE braucht kleineren Radius und niedrigeren Fehlerpuffer. CP07_BALCONY bleibt fuer saubere Silberzeiten gut genug.

## Detailentwurf 4: `storm_switchyard` - Sturmweiche

### Spielerlebnis

Ein fliegender Rangierbahnhof: Linien kreuzen sich, Portale fuehlen sich wie Weichen an, und die beste Route entsteht aus einer Entscheidung in der Mitte. Die Map soll lesbar bleiben: alle Weichen sind farbcodiert, Branch-Ringe sind klar sichtbar.

### Layout

- Groesse: `[240, 70, 180]`
- Hoehenband: y 12-44
- Zielzeit Bronze/Silber/Gold: 62s / 54s / 47s
- Checkpoints: 10 plus Finish
- Branch: CP04 -> CP05_LOW oder CP05_HIGH -> CP06
- Alias-Lane spaeter bei CP08 fuer zwei gleichwertige Einfahrten
- Reset-Policy: `resetToLastValid: true`
- Wrong-Order-Penalty: 2200ms
- Ghost: aktiv

### Route-Skizze

| CP | Typ | Position | Radius | Next |
| --- | --- | --- | --- | --- |
| CP01 | entry | `[-104, 14, 0]` | 7.0 | linear |
| CP02 | gate | `[-76, 16, -28]` | 5.8 | linear |
| CP03 | tunnel | `[-42, 18, -28]` | 4.8 | linear |
| CP04 | branch_entry | `[-10, 22, 0]` | 5.2 | `CP05_LOW`, `CP05_HIGH` |
| CP05_LOW | branch_boost | `[18, 18, -42]` | 5.6 | `CP06` |
| CP05_HIGH | branch_precision | `[18, 36, 34]` | 4.4 | `CP06` |
| CP06 | gate | `[48, 28, 0]` | 5.6 | merge |
| CP07 | gate | `[76, 30, -24]` | 5.2 | linear |
| CP08 | split | `[96, 28, -4]` | 5.0 | linear |
| CP08_R | split alias | `[96, 28, 24]` | 5.0 | alias of CP08 |
| CP09 | finish_pre | `[110, 24, 44]` | 5.4 | linear |
| FINISH | finish | `[116, 22, 58]` | 7.0 | done |

### Obstacle-Ideen

- Drei parallele "Gleis"-Korridore mit niedrigen Leitplanken.
- Kreuzung in der Mitte mit einem grossen Foam-Puffer, damit Fehler sichtbar, aber nicht tot sind.
- High-Branch: schmaler Hochsteg, kuerzer, keine Items.
- Low-Branch: breiter Boost-Tunnel, etwas laenger, dafuer `SPEED_UP`.
- Portale dienen als Recovery aus Sackgassen, nicht als Pflichtpfad.

### Items

- `SPEED_UP` im Low-Branch.
- `SHIELD` vor CP07.
- `GHOST`/Coin auf CP08-Mitte als kleine Belohnung fuer saubere Merge-Linie.

### Balancing-Hypothese

Low ist besser fuer Erstlauf und Bots, High fuer Bestzeiten. High darf nur etwa 1.5s schneller sein, sonst wird die Entscheidung zu eindeutig.

## Detailentwurf 5: `wind_cathedral` - Windkathedrale

### Spielerlebnis

Eine vertikale Kathedrale aus Boegen, Saeulen und Slingshots. Die Route fuehrt durch "Schiffe" der Kathedrale nach oben, laesst den Spieler kurz ueber dem Dach schweben und schliesst mit einem kontrollierten Sinkflug durch das Hauptportal ab.

### Layout

- Groesse: `[180, 120, 180]`
- Hoehenband: y 14-96
- Zielzeit Bronze/Silber/Gold: 65s / 57s / 50s
- Checkpoints: 11 plus Finish
- Keine harte Branch-Pflicht; ein Alias-Paar fuer linke/rechte Turmboegen.
- Reset-Policy: `resetOnDeath: true`
- Wrong-Order-Penalty: 2000ms
- Ghost: aktiv

### Route-Skizze

| CP | Typ | Position | Radius | Zweck |
| --- | --- | --- | --- | --- |
| CP01 | entry | `[-64, 16, 0]` | 7.0 | Eingang |
| CP02 | gate | `[-38, 22, 0]` | 5.8 | Hauptschiff |
| CP03 | slingshot | `[-14, 34, -22]` | 5.2 | erster Auftrieb |
| CP04 | gate | `[8, 48, -34]` | 5.4 | oberer Bogen |
| CP05 | split | `[30, 58, -18]` | 5.0 | linker Turmbogen |
| CP05_R | split alias | `[30, 58, 18]` | 5.0 | rechter Turmbogen |
| CP06 | gate | `[48, 68, 0]` | 5.4 | Merge |
| CP07 | precision | `[24, 82, 36]` | 4.2 | Glockenloch |
| CP08 | gate | `[-8, 92, 30]` | 5.2 | Dachkante |
| CP09 | tunnel | `[-34, 78, 0]` | 4.8 | Sinkbogen |
| CP10 | finish_pre | `[-52, 42, -20]` | 5.4 | Rueckkehr |
| FINISH | finish | `[-64, 24, -34]` | 7.0 | Ausgang |

### Obstacle-Ideen

- Saeulenpaare links/rechts, hoch genug fuer echtes Vertikalgefuehl.
- Drei grosse Torboegen mit Tunnel-Parametern.
- Foam-"Wolken" als Rettung unter hohen Praezisionspunkten.
- Slingshot-Gates mit klaren `forward`- und `up`-Vektoren.

### Items

- `SHIELD` vor CP07, weil der Glockenloch-Abschnitt eng ist.
- `SPEED_UP` nur auf Dachkante nach CP08.
- Kein Rocket auf Hauptlinie, damit die Map eher majestetisch als chaotisch bleibt.

### Balancing-Hypothese

Die Map darf spektakulaer sein, aber nicht "Vulkan hart". Die groesste Gefahr ist falscher Auftrieb; deshalb muessen Slingshot-Impulse konservativ starten.

## Detailentwurf 6: `chrono_spillway` - Chrono-Abfluss

### Spielerlebnis

Eine lange, abfallende Kanalroute. Sie fuehlt sich wie ein Rennen gegen den eigenen Ghost an: breite obere Schleusen, dann engere Wasserlaeufe, dann ein Risk-Sluice, der eine Goldzeit ermoeglicht. Kein echtes Wasser, keine dynamische Physik; der Look entsteht durch Foam-Baender, blaue Portale und abgestufte Hoehen.

### Layout

- Groesse: `[280, 95, 150]`
- Hoehenband: y 72 -> 14
- Zielzeit Bronze/Silber/Gold: 78s / 69s / 61s
- Checkpoints: 13 plus Finish
- Branch: CP07 -> CP08_SLUICE oder CP08_OVERFLOW -> CP09
- Reset-Policy: `resetToLastValid: true`
- Wrong-Order-Penalty: 2500ms
- Ghost: aktiv

### Route-Skizze

| CP | Typ | Position | Radius | Next |
| --- | --- | --- | --- | --- |
| CP01 | entry | `[-128, 72, -28]` | 7.0 | linear |
| CP02 | gate | `[-104, 68, -8]` | 5.8 | linear |
| CP03 | gate | `[-78, 62, 24]` | 5.6 | linear |
| CP04 | tunnel | `[-42, 56, 34]` | 5.0 | linear |
| CP05 | gate | `[-8, 50, 20]` | 5.4 | linear |
| CP06 | gate | `[22, 44, -6]` | 5.2 | linear |
| CP07 | branch_entry | `[50, 38, -28]` | 5.0 | `CP08_SLUICE`, `CP08_OVERFLOW` |
| CP08_SLUICE | branch_precision | `[78, 30, -44]` | 4.2 | `CP09` |
| CP08_OVERFLOW | branch_gate | `[76, 36, 8]` | 6.0 | `CP09` |
| CP09 | gate | `[104, 28, -16]` | 5.4 | merge |
| CP10 | tunnel | `[122, 24, 18]` | 4.8 | linear |
| CP11 | gate | `[132, 20, 42]` | 5.2 | linear |
| CP12 | finish_pre | `[118, 16, 62]` | 5.4 | linear |
| FINISH | finish | `[104, 14, 72]` | 7.0 | done |

### Obstacle-Ideen

- Terrassierte Kanalboeden als lange Foam-Baender.
- Seitliche harte Schleusenwaende mit grossen Tunneln.
- Ein enges Risk-Sluice als Tube-Segment.
- Recovery-Portal unten zurueck zu CP09, nicht zur Spitze.

### Items

- `SPEED_UP` nach CP03 und CP09.
- `SHIELD` vor CP08_SLUICE.
- `ROCKET_WEAK` auf Overflow-Route als Ausgleich fuer laengeren Weg.

### Balancing-Hypothese

Diese Map ist fuer Splits und Ghost-Duelle gebaut. Segmentzeiten sollen klar unterscheidbar sein: obere Schleuse, Mittelkanal, Branch, Finale. Gold setzt den Risk-Sluice voraus, Silber nicht.

## Backlog-Ideen im Detail

### `gravity_orchard` - Schwerkraftgarten

Eine schwebende Gartenroute aus kleinen Inseln, "Frucht"-Saeulen und Slingshot-Aesten. Die Route startet breit, fuehrt ueber drei vertikale Obstgruppen und endet in einem sanften Sinkflug. Risk-Route: direkter Sprung zwischen zwei Baumkronen. Safe-Route: laengerer Astpfad mit Foam-Landungen.

- Groesse: `[210, 120, 210]`
- Zielzeit: 55-70s
- Schwierigkeit: mittel
- Besonderheit: viele vertikale Mikroentscheidungen, aber weniger eng als `sky_islands`.
- Risiko: Falls Rescue-Portale falsch sitzen, wirkt die Map wie Absturz-Simulator.
- Spaeterer Nutzen: sehr guter Kandidat fuer GLB-Baeume/Setdressing nach Asset-Compliance.

### `pulse_foundry` - Pulsschmiede

Eine Industriehalle mit farbigen Korridoren, in denen der Spieler den "Puls" der Route liest. Technisch bleiben Hindernisse statisch; der Rhythmus entsteht durch abwechselnde Torabstaende, Boost-Cooldowns und Checkpoint-Farben.

- Groesse: `[220, 70, 160]`
- Zielzeit: 48-60s
- Schwierigkeit: mittel-hoch
- Besonderheit: erste Route mit bewusstem Taktgefuehl ohne Moving Parts.
- Risiko: Ohne neue visuelle Kommunikation kann "Pulse" nur behauptet wirken.
- Spaeterer Nutzen: kann nach V113/UI-Preview als auffaellige Showcase-Map dienen.

### `blackbox_ballet` - Blackbox Ballet

Eine reduzierte Trainingsbuehne: wenige Hindernisse, klare Lichtachsen, sehr praezise Checkpoint-Abstaende. Der Reiz liegt im perfekten Flugbogen und im Ghost-Vergleich. Kein Deko-Overload.

- Groesse: `[150, 70, 150]`
- Zielzeit: 36-44s
- Schwierigkeit: mittel
- Besonderheit: hohe Lesbarkeit, ideal fuer Speedrunner.
- Risiko: Kann leer wirken, wenn Preview und Ringe nicht stark genug sind.
- Spaeterer Nutzen: guter Benchmark fuer Ghost-Selbstduell und Split-Deltas.

### `lumen_quarry` - Lumenbruch

Ein terrassierter Steinbruch mit Lichtkegeln, Rampen und Quarry-Ebenen. Spieler steigen erst ab, dann ueber Boost-Gates wieder auf. Safe-Linie nutzt breite Rampen, Risk-Linie nutzt diagonale Spruenge ueber leere Terrassen.

- Groesse: `[240, 100, 200]`
- Zielzeit: 65-80s
- Schwierigkeit: hoch
- Besonderheit: grosse vertikale Arena, aber weniger linear als `abyssal_descent`.
- Risiko: Sehr viele Plattformen koennen Cold-Start und Kollisionsbudget belasten.
- Spaeterer Nutzen: idealer GLB-/CC0-Kandidat nach V106/V128.

### `ember_viaduct` - Gluehviadukt

Eine lange Brueckenroute ueber leere Tiefe. Es gibt drei Viaduktboegen, jeweils mit anderer Linienregel: Speed, Precision, Recovery. Die Map soll nervoes und schnell sein, aber mit gut sichtbaren Foam-Leitplanken.

- Groesse: `[300, 85, 130]`
- Zielzeit: 58-72s
- Schwierigkeit: hoch
- Besonderheit: sehr hohe Geschwindigkeit ueber lange Sichtachsen.
- Risiko: Clipping und Absturzfrust; erst nach stabilerem Playability-Harness bauen.
- Spaeterer Nutzen: Expert-Parcours fuer Arcade-Endurance-Pool.

### `comet_yards` - Kometenhof

Ein Truemmerfeld aus schwebenden Dockplatten und "Kometen"-Saeulen. Anders als `sky_islands` ist die Route horizontaler und schneller: Spieler fliegen durch Luecken, nicht von Insel zu Insel.

- Groesse: `[260, 90, 220]`
- Zielzeit: 50-64s
- Schwierigkeit: mittel-hoch
- Besonderheit: Debris-Slalom mit grossen Sichtachsen.
- Risiko: Zu viele Einzelhindernisse koennen unruhig und schwer lesbar werden.
- Spaeterer Nutzen: starker Kandidat fuer visuelle Asset-Varianz.

## Implementierungsstrategie

### Dateischnitt

Geplanter Code-Scope fuer die spaetere Umsetzung:

- `src/core/config/maps/presets/parcours_pack_v130.js` neu fuer die sechs MVP-Maps.
- `src/core/config/maps/MapPresetCatalog.js` erweitert Imports und Merge.
- `src/core/config/maps/MapPresetsBase.js` nimmt neue Keys in Desktop-/Vollkatalog auf.
- `src/state/arcade/ArcadeMapProgression.js` erweitert `sector_parcours` in Stufen, nicht blind um alle Maps.
- `src/ui/menu/MenuPreviewCatalog.js` nur falls V113-Kollision geloest oder explizit freigegeben ist; sonst Preview-Fallback nutzen.
- `tests/parcours-map-pack.contract.test.mjs` neu fuer Route-Graph, Checkpoint-Distanzen und Map-Key-Katalog.
- Optional: `tests/parcours-start.spec.js` oder targeted Playwright-Smoke um neue Maps erweitern.

### Arcade-Pool-Strategie

Nicht alle neuen Maps sollen sofort gleich wahrscheinlich sein. Der `sector_parcours`-Pool soll in Stufen wachsen:

1. Startpool stabil halten: `parcours_rift`, `parcours_rift_sprint`, `parcours_rift_precision`.
2. MVP-Erweiterung fuer kurze/mittlere Sektoren: `micro_maw`, `mirror_docks`, `glass_serpent`.
3. Spaetere Arcade-Endurance-Beimischung: `storm_switchyard`, `wind_cathedral`, `chrono_spillway`.
4. Expert-/Longrun-Maps erst nach Playtest in eigene Endurance-/Expert-Pools.

Damit Arcade nicht ploetzlich zu lange oder zu schwer wird, sollten `chrono_spillway` und aehnliche Langrouten erst ab spaeteren Sektoren auftauchen.

### Surface-Policy

- Desktop-App: voller neuer Map-Pack-Katalog.
- Browser-Demo: keine automatische Erweiterung; `parcours_rift` bleibt Demo-Tutorialpfad.
- Falls der User spaeter eine Demo-Erweiterung will, zuerst genau eine neue kurze Route pruefen: `micro_maw` als bester Kandidat.
- Custom-Maps/Editor: kein neuer Autoringscope in V130.

### Route-ID-Policy

Vorschlag fuer stabile IDs:

| Map-Key | Route-ID |
| --- | --- |
| `micro_maw` | `micro_maw_v1` |
| `mirror_docks` | `mirror_docks_v1` |
| `glass_serpent` | `glass_serpent_v1` |
| `storm_switchyard` | `storm_switchyard_v1` |
| `wind_cathedral` | `wind_cathedral_v1` |
| `chrono_spillway` | `chrono_spillway_v1` |

Route-IDs duerfen nach ersten produktiven Ghosts nur noch mit Migration geaendert werden.

## Definition of Done

- [x] DoD.1 Mindestens sechs neue Parcours-Presets sind im Desktop-Runtime-Katalog vorhanden und haben stabile Map-Keys, Namen, `parcours.enabled`, `routeId`, Regeln, Checkpoints, Finish, Player-Spawn, Bot-Spawns und Item-Anchor.
- [x] DoD.2 Jede MVP-Map hat eine eigene Skill-Rolle; reine Varianten derselben Geometrie zaehlen nicht als erledigte Map-Varianz.
- [x] DoD.3 Jede neue Route ist per Contract-Smoke validiert: acyclische Checkpoint-Reihenfolge, gueltige Branch-Merges, keine leeren Checkpoint-Listen, Finish vorhanden, Radius-/Segmentwerte plausibel.
- [x] DoD.4 Ghost-/Leaderboard-Vertraege bleiben stabil: Jede Route nutzt eindeutige `routeId`, und Ghost-Selbstduell kann pro Route unterscheiden.
- [x] DoD.5 Arcade-Sektorpool wird bewusst erweitert, ohne Langrouten frueh oder zu haeufig zu ziehen.
- [x] DoD.6 Browser-Demo-Surface bleibt unveraendert oder eine Aenderung ist explizit user-gated dokumentiert.
- [x] DoD.7 Mindestens ein Playability-Signal prueft neue Maps auf Startbarkeit und grobe Finishbarkeit; Langrouten duerfen bei Flakiness nicht still als fertig gelten.
- [x] DoD.8 Dokumentation nennt fuer jede Map Zielzeit, Skill-Rolle, Risiken und Tuning-Hypothese.

## Phasen

### 130.1 Content-Baseline und Routenmatrix festziehen
status: done
mode: [AUTO]
goal: Bestehende Parcours-Maps, neue Ideen und technische Grenzen auf eine klare Matrix bringen
output: finalisierte MVP-Auswahl, Skill-Achsen, Route-ID-Liste, Testbedarf

- [x] 130.1.1 Bestehende Parcours-Presets inventarisieren: Map-Key, Route-ID, Checkpoint-Anzahl, Branches, Zielzeit, Reset-Regeln, Ghost-Policy.
- [x] 130.1.2 MVP-Auswahl bestaetigen: `micro_maw`, `mirror_docks`, `glass_serpent`, `storm_switchyard`, `wind_cathedral`, `chrono_spillway`.
- [x] 130.1.3 Arcade-Pool-Regel festlegen: kurze Maps frueh, mittlere Maps normal, lange Maps spaeter oder expert-only.
- [x] 130.1.4 Demo-Grenze dokumentieren: keine Browser-Demo-Erweiterung ohne explizite Freigabe.

### 130.2 Contract- und Validierungsrahmen fuer Map-Pack
status: done
mode: [REVIEW]
goal: Neue Maps nicht nur optisch, sondern vertraglich stabil authoren
output: gezielte Map-Pack-Contract-Checks

- [x] 130.2.1 `tests/parcours-map-pack.contract.test.mjs` planen oder anlegen: prueft neue Keys im Catalog, `buildRouteFromParcours`, Branch-Merges, Finish und Route-IDs.
- [x] 130.2.2 Plausibilitaetsregeln definieren: minimale/maximale Checkpoint-Abstaende, Radius-Untergrenzen, keine identischen Spawnpunkte, keine leeren Bot-Spawns.
- [x] 130.2.3 Ghost-/Leaderboard-Probe vorbereiten: Jede neue Route erzeugt eindeutigen Keyspace fuer lokale Ghosts.
- [x] 130.2.4 Falls vorhandenes `npm run parcours:check -- --strict` genutzt wird, neue Maps dort explizit aufnehmen oder dokumentieren, warum targeted Contract reicht.

### 130.3 Erste Map-Welle: kurz, mirror, speed
status: done
mode: [REVIEW]
goal: Drei Maps mit geringem bis mittlerem Risiko shipping-faehig machen
output: `micro_maw`, `mirror_docks`, `glass_serpent`

- [x] 130.3.1 `micro_maw` implementieren: kurze Tutorialroute, kein Portal-Pflichtpfad, geringe Penalty, sicherer Finish.
- [x] 130.3.2 `mirror_docks` implementieren: Branch-Merge sauber mit `nextIds`, gespiegelte Linien und faire Item-Verteilung.
- [x] 130.3.3 `glass_serpent` implementieren: S-Kurve, Tube-Shortcut, konservative Boost-Impulse, Recovery-Portal.
- [x] 130.3.4 Erste Welle in Catalog/Base einhaengen, aber Arcade-Pool nur konservativ erweitern.

### 130.4 Zweite Map-Welle: Branching, Vertikal, Endurance
status: done
mode: [REVIEW]
goal: Drei staerkere Charakter-Maps ergaenzen
output: `storm_switchyard`, `wind_cathedral`, `chrono_spillway`

- [x] 130.4.1 `storm_switchyard` implementieren: Weichen-Branch mit High/Low-Linie, klare Merge-Logik, Recovery-Portale.
- [x] 130.4.2 `wind_cathedral` implementieren: Slingshot-Kette, Hoehenlesbarkeit, sichere Foam-Rettungsfelder.
- [x] 130.4.3 `chrono_spillway` implementieren: lange Segmentroute, Risk-Sluice-Branch, Ghost-/Split-Fokus.
- [x] 130.4.4 Langrouten im Arcade-Pool erst spaet oder expert-nah aktivieren.

### 130.5 UI-, Preview- und Surface-Abgleich
status: done
mode: [REVIEW]
goal: Spielauswahl zeigt neue Maps korrekt, ohne V113 oder Demo-Policy zu stoeren
output: Menue- und Surface-Vertrag bleiben konsistent

- [x] 130.5.1 Map-Auswahl und Mode-Eligibility pruefen: Arcade darf neue Parcours-Maps sehen, normale Modi nur wenn bestehende Regeln es erlauben.
- [x] 130.5.2 Preview-Labels/Badges nur dann anfassen, wenn V113-Scope frei ist; sonst Fallback-Preview akzeptieren.
- [x] 130.5.3 Browser-Demo-Allowlist unveraendert lassen oder mit User-Gate bewusst erweitern.
- [x] 130.5.4 Favoriten-/Recent-/Random-Map-Pfade auf nicht kuratierte Demo-Auswahl pruefen.

### 130.6 Playability, Balancing und Regression
status: done
mode: [REVIEW]
goal: Neue Maps fuehlen sich spielbar an und brechen bestehende Parcours-Systeme nicht
output: gruenes targeted Signal plus dokumentierte Tuning-Entscheide

- [x] 130.6.1 Contract-Gates fuer alle neuen Routen ausfuehren.
- [x] 130.6.2 Mindestens `micro_maw`, `mirror_docks` und eine Langroute per Playwright/desktop-start smoke pruefen.
- [x] 130.6.3 Schwierigkeit staffeln: Tutorial, Flow, Branch, Vertikal, Endurance duerfen nicht alle gleich hart sein.
- [x] 130.6.4 Ghost-/Split-Verhalten exemplarisch pruefen: Route-ID, Finish-Event, Segment-Splits und Penalty bleiben plausibel.

### 130.7 Dokumentation und Handoff
status: done
mode: [REVIEW]
goal: Content-Entscheide fuer spaetere Map-Arbeit nachvollziehbar machen
output: Map-Pack-Doku, Risiken, Backlog-Status

- [x] 130.7.1 Pro shipping Map eine kompakte Designnotiz pflegen: Skill-Rolle, Zielzeit, Risiken, Tuning-Hypothese.
- [x] 130.7.2 Backlog-Ideen klassifizieren: sofort umsetzbar, GLB/Asset-abhaengig, Preview/UI-abhaengig, Expert-only.
- [x] 130.7.3 Handoff an V106/V128/V129 dokumentieren, falls GLB- oder Asset-Setdressing spaeter relevant wird.
- [x] 130.7.4 Bekannte Limitierungen dokumentieren: keine beweglichen Hazards, keine echten Loops, keine Demo-Erweiterung.

### 130.99 Abschluss-Gate
status: done
mode: [REVIEW]
goal: Map-Pack reproduzierbar abschliessen
output: gruene Gates, klare Evidence, keine versteckte Surface-Ausweitung

- [x] 130.99.1 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.
- [x] 130.99.2 Map-Pack-Contract-Checks sind gruen oder ein Blocker ist in `docs/Fehlerberichte/` dokumentiert.
- [x] 130.99.3 Playability-Smoke ist fuer die vereinbarte Auswahl gruen.
- [x] 130.99.4 `scope-collisions` nennt keine ungeklaerte Kollision mit V113/V106/V128/V129 fuer die tatsaechlich geaenderten Dateien.
- [x] 130.99.5 Abschlussnotiz nennt, welche Backlog-Maps bewusst nicht gebaut wurden.

## Umsetzungsevidence 2026-05-20

Status: D2-Code-/Test-Scope aus diesem Draft umgesetzt. D3-Intake in `docs/Umsetzungsplan.md` und `docs/plaene/aktiv/V130.md` bleibt bewusst unberuehrt; dieser Draft bleibt die dokumentierte externe Planquelle.

Umgesetzter Scope:

- `src/core/config/maps/presets/parcours_pack_v130.js` fuegt `micro_maw`, `mirror_docks`, `glass_serpent`, `storm_switchyard`, `wind_cathedral` und `chrono_spillway` mit stabilen `*_v1`-Route-IDs hinzu.
- `src/core/config/maps/MapPresetCatalog.js` und `src/core/config/maps/MapPresetsBase.js` haengen die sechs Presets in Desktop-Katalog und Vollkatalog ein.
- `src/state/arcade/ArcadeMapProgression.js` und `src/entities/directors/ArcadeEncounterCatalog.js` erweitern den Parcours-Pool gestaffelt: Rift-Basis zuerst, danach kurze/mittlere V130-Routen, danach lange/haertere Routen.
- `tests/parcours-map-pack.contract.test.mjs` prueft Catalog/Base-Registrierung, Route-IDs, Ghost-/Finish-Vertrag, Branch-Merges, Spawn-/Radius-/Distanz-Plausibilitaet und Pool-Reihenfolge.
- `tests/parcours-map-pack-start.spec.js` startet `micro_maw`, `mirror_docks` und `chrono_spillway` in Arcade und triggert die authored Route bis zum Finish.

Evidence:

- `node --test tests\parcours-map-pack.contract.test.mjs` -> PASS, 5 Tests.
- `npm run parcours:check -- --strict` -> PASS, 15 Parcours-Maps, 0 Errors, 0 Warnings.
- `node scripts\run-playwright-smoke.mjs tests\parcours-map-pack-start.spec.js --timeout=180000` -> PASS, 3 Tests.
- `node scripts/query-knowledge-graph.mjs scope-collisions --json` -> PASS; tatsaechlich geaenderte V130-Dateien vermeiden `src/ui/menu/MenuPreviewCatalog.js` und damit die bekannte V106/V113-Kollision.

Bewusst nicht gebaut:

- `gravity_orchard`, `pulse_foundry`, `blackbox_ballet`, `lumen_quarry`, `ember_viaduct` und `comet_yards` bleiben Backlog.
- Browser-Demo-Allowlist, `MenuPreviewCatalog.js`, GLB-/CC0-Assets, bewegliche Hazards, echte Loops und Editor-/Authoring-Pfade bleiben unveraendert.

Not-checked:

- Keine volle Playwright-/Desktop-E2E-Suite; V130 nutzt targeted Contract-, Strict-Parcours- und drei Map-Start-Smokes.

## Risiken

| Risiko | Stufe | Beschreibung | Gegenmassnahme |
| --- | --- | --- | --- |
| R1 | mittel | Mehr Maps im Arcade-Pool koennen Runs zu lang oder zu schwer machen. | Pool stufen, Langrouten spaet/expert-only. |
| R2 | mittel | Branching-Definitionen koennen formal gueltig, aber spielerisch unklar sein. | Branch-Ringe, Minimap und Contract-Smoke plus Playtest. |
| R3 | mittel | Ghost-/Leaderboard-Daten driften, wenn Route-IDs spaeter umbenannt werden. | Route-ID-Policy vor Implementierung einfrieren. |
| R4 | hoch | Vertikale Maps koennen durch schlechte Slingshot-Impulse frustig werden. | konservative Impulse, Foam-Rescue, targeted Start-Smoke. |
| R5 | mittel | V113-Kollision in `MenuPreviewCatalog.js`. | Preview als spaete Phase oder Fallback; nicht im MVP erzwingen. |
| R6 | mittel | Browser-Demo zeigt versehentlich Vollversions-Maps. | Surface-Policy-Tests und Demo-Allowlist nicht erweitern. |
| R7 | niedrig | Viele neue Objekte belasten Cold-Start. | Erst JS-authored, wenig GLB, keine unkuratierte Asset-Flut. |

## Abhaengigkeiten

Hard:

- `V82.99`: Parcours-Progression, Branching, XP, Leaderboard und Rewards sind Basis.
- `V108.99`: Ghost-Selbstduell und Route-Persistenz sind Basis fuer den Wiederholungsreiz.
- `V115.99`: Playability- und Audit-Follow-up-Erkenntnisse sind Basis fuer Plattform-/Precision-Tuning.

Soft:

- `V106.99`: GLB-Map-Varianz kann spaeter Setdressing fuer `lumen_quarry`, `gravity_orchard` oder `comet_yards` liefern.
- `V113.99`: Bessere Preview-/Rules-Panel-Flaeche wuerde neue Map-Rollen sichtbarer machen.
- `V128.99`: Release-/Asset-Compliance wichtig, falls GLB/CC0-Assets in Map-Pack-Folgearbeit kommen.
- `V129.99`: Generated-Content-Manifest-Migration kann spaeter Map-Registry und Asset-Manifest verbinden.

## Governance und Decision-Klasse

Dieser Draft selbst ist `D2`: neue Plan-Datei unter `docs/plaene/neu/`, keine Master-/Aktivplan-/Governance-Aenderung.

Spaetere Umsetzung:

| Flaeche | Erwartete Klasse | Gate |
| --- | --- | --- |
| neue JS-Map-Presets und targeted Tests | D2 | normale scoped Umsetzung |
| Arcade-Pool-Erweiterung | D2 | Playability-Evidence |
| Preview-Dateien mit V113-Kollision | D2 mit Review-Gate | vorher Scope pruefen |
| Browser-Demo-Allowlist / Surface-Policy-Ausweitung | mindestens explizites User-Gate | nur wenn User gewuenscht |
| Masterplan-/Aktivplan-Intake | D3 | user-owned Intake |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V130`
- vorgeschlagene kanonische Blockdatei nach Intake: `docs/plaene/aktiv/V130.md`
- hard dependencies: `V82.99`, `V108.99`, `V115.99`
- soft dependencies: `V106.99`, `V113.99`, `V128.99`, `V129.99`
- Hinweis: Manuelle Uebernahme erforderlich. Dieser Draft ist keine aktive Source of Truth, bis er user-owned in den Master und nach `docs/plaene/aktiv/V130.md` uebernommen wurde.

## Validierungsplan fuer diesen Draft

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`

## Preflight-Evidence fuer Draft-Erstellung

- `node scripts/query-knowledge-graph.mjs open-deps V106 --json` -> PASS, `openDependencies: []`
- `node scripts/query-knowledge-graph.mjs scope-collisions --json` -> PASS, bekannte relevante Kollision: `V106`/`V113` in `src/ui/menu/MenuPreviewCatalog.js`; V130 vermeidet diese Flaeche im Draft und macht Preview spaet/gated.
