# CuviosClash - Standardeinstellungen

Dokumentation aller Standard-Spieleinstellungen (Stand: 2026-03-15).
Diese Werte werden verwendet, wenn keine gespeicherten Einstellungen im Browser vorhanden sind
oder wenn die Settings-Version sich aendert (aktuell: Version 2).

---

## Session & Match

| Einstellung        | Wert             |
|--------------------|------------------|
| Session            | Splitscreen (2P) |
| Spielstil          | Fight            |
| Game Mode          | HUNT             |
| Map                | Mega-Labyrinth (`mega_maze`) |
| Flugstil           | Freier Flug (3D) |
| Theme              | Dunkel           |
| Respawn            | Aktiviert        |
| Siege zum Gewinn   | 5                |

---

## Bots

| Einstellung        | Wert   |
|--------------------|--------|
| Anzahl Bots        | 5      |
| Bot-Schwierigkeit  | Hard   |

---

## Flugzeuge

| Spieler | Schiff                   | ID     |
|---------|--------------------------|--------|
| P1      | Striker (Ship 8)         | ship8  |
| P2      | Star-Cruiser (Ship 5)    | ship5  |

---

## Gameplay-Feineinstellungen

| Einstellung              | Wert  | Min  | Max   |
|--------------------------|-------|------|-------|
| Geschwindigkeit          | 35 M/S| 8    | 40    |
| Lenk-Empfindlichkeit     | 3.4   | 0.8  | 5.0   |
| Flugzeug-Groesse         | 1.0   | 0.6  | 2.0   |
| Strahldicke              | 0.6   | 0.2  | 2.5   |
| Luecken-Groesse          | 0.30  | 0.05 | 1.5   |
| Luecken-Haeufigkeit      | 2% (0.02) | 0 | 0.25 |
| Item-Menge               | 10    | 1    | 20    |
| Schussgeschwindigkeit    | 1.25s | 0.1  | 2.0   |
| Lock-On Radius           | 11 Grad | 5  | 45    |
| MG Trail-Zielsuchradius  | 3.00  | 0.2  | 3.0   |
| Schattenqualitaet        | Hoch (3) | 0 (Aus) | 3 (Hoch) |

---

## Toggles

| Einstellung        | Wert       |
|--------------------|------------|
| Auto-Roll aktiv    | Aktiviert  |
| Invert Pitch P1    | Aktiviert  |
| Invert Pitch P2    | Aktiviert  |
| Cockpit P1         | Deaktiviert|
| Cockpit P2         | Deaktiviert|

---

## Erweiterte Map-Einstellungen

| Einstellung        | Wert       |
|--------------------|------------|
| Portale aktiviert  | Ja         |
| Anzahl Portale     | 8          |
| Anzahl Ebenen      | 5          |
| Planar Modus       | Deaktiviert|

---

## Steuerung Spieler 1

| Aktion            | Taste        | KeyCode     |
|-------------------|--------------|-------------|
| Pitch Hoch        | W            | KeyW        |
| Pitch Runter      | S            | KeyS        |
| Links (Gier)      | A            | KeyA        |
| Rechts (Gier)     | D            | KeyD        |
| Rollen Links      | Q            | KeyQ        |
| Rollen Rechts     | E            | KeyE        |
| Boost             | Shift Links  | ShiftLeft   |
| Schiessen (Item)  | F            | KeyF        |
| MG Schiessen      | X            | KeyX        |
| Item nutzen       | G            | KeyG        |
| Item Wechseln     | R            | KeyR        |
| Kamera            | C            | KeyC        |

---

## Steuerung Spieler 2

| Aktion            | Taste          | KeyCode       |
|-------------------|----------------|---------------|
| Pitch Hoch        | Num 8          | Numpad8       |
| Pitch Runter      | Num 5          | Numpad5       |
| Links (Gier)      | Num 4          | Numpad4       |
| Rechts (Gier)     | Num 6          | Numpad6       |
| Rollen Links      | Num 7          | Numpad7       |
| Rollen Rechts     | Num 9          | Numpad9       |
| Boost             | Pfeil Rechts   | ArrowRight    |
| Schiessen (Item)  | Pfeil Hoch     | ArrowUp       |
| MG Schiessen      | Pfeil Runter   | ArrowDown     |
| Item nutzen       | Anf.zeichen (')| Quote         |
| Item Wechseln     | Pfeil Links    | ArrowLeft     |
| Kamera            | Num Divide (/) | NumpadDivide  |

---

## Globale Tasten

| Aktion              | Taste | KeyCode |
|----------------------|-------|---------|
| Cinematic Toggle     | F8    | F8      |
| Aufnahme Toggle      | F9    | F9      |

---

## Geaenderte Dateien

Diese Einstellungen sind in folgenden Dateien hinterlegt:

| Datei                                     | Inhalt                                  |
|-------------------------------------------|-----------------------------------------|
| `src/core/SettingsManager.js`             | `createDefaultSettings()` - Hauptdefaults |
| `src/core/config/ConfigSections.js`       | Basiswerte (Speed, Keys, Bots, etc.)    |
| `src/hunt/HuntConfig.js`                  | Hunt-Modus Defaults (Mode, Respawn)     |
| `src/core/renderer/ShadowQuality.js`      | Schattenqualitaet Default               |
| `src/ui/menu/MenuStateContracts.js`       | Session-Type, ModePath Defaults         |
| `index.html`                              | HTML-Slider und Checkbox Initialwerte   |

---

## Settings-Versionierung

Die Einstellungen verwenden `settingsVersion: 2`.
Wenn ein Browser noch alte Einstellungen (Version < 2) gespeichert hat,
werden diese automatisch verworfen und durch die neuen Defaults ersetzt.
