# Menü-Redesign Anleitung (Quickstart + Benutzerdefiniert + Online-Lobby)

Diese Anleitung beschreibt eine Menüstruktur, die **sehr schnell startbar** ist (Quickstart) und trotzdem **sehr viele Einstellungen** erlaubt (Presets, Feintuning, Bots, Fahrzeuge, Editor-Shortcuts).  
Kernprinzip: **Progressive Disclosure** – erst das Nötigste, Details in Tabs/Akkordeons.

---

## 0) Wichtigste Leitideen (neu/verbessert)

### 0.1 Quick Config statt „starrer Wizard“
Auch wenn du Phasen hast: Nutzer sollen **jederzeit** in Phase 2–4 springen können (Stepper klickbar).  
Viele ändern nur „Map“ oder „Bots“ und wollen sofort starten.

### 0.2 Trennung in drei Settings-Blöcke (entscheidend für Online)
- **MatchSettings** (Host-controlled): Modus, Map, Bots, Darstellung/2D, Restriktionen
- **PlayerLoadout** (pro Spieler): Fahrzeug + Fahrzeug/Handling-Preset + ggf. Skin/Farbe
- **LocalSettings** (rein lokal): Keybinds, HUD, Audio/Graphics, Accessibility

### 0.3 Kompatibilitäts-Engine (verhindert kaputte Kombinationen)
Modus/Map/Preset bekommen Tags (z. B. `supports2D`, `supportsBots` …).  
UI kann dann automatisch:
- inkompatible Optionen ausgrauen + Begründung zeigen
- Button **„Automatisch anpassen“** (z. B. 2D aus oder andere Map wählen)

### 0.4 Online „Dirty State“ / Ready-Reset
Wenn der Host MatchSettings ändert:
- alle Clients werden **un-ready**
- Hinweis: „Settings updated“

---

## 1) Zielbild: Zwei Ebenen

### Ebene A: Schnellstart (sehr schnell spielen)
Auf dem Startscreen:
- **Sofort spielen** (nimmt letzte/Standard-Konfiguration)
- **Benutzerdefiniert** (öffnet Konfigurator mit Phasen 1–4)
- **Online**
  - **Lobby erstellen**
  - **Lobby beitreten**
- **Preset-Kacheln** (z. B. „Arcade FFA“, „2D Ebenen“, „Jagd Hardcore“)

Zusätze für Geschwindigkeit:
- Bereiche **„Zuletzt gespielt“** (letzte 5 Maps/Fahrzeuge/Modi)
- **Favoriten** (Stern)
- Optional: **Random** mit „Seed“ (später hilfreich für Replays/Challenges)

### Ebene B: Benutzerdefiniert (Wizard/Configurator in 4 Phasen)
- Oben/seitlich **immer sichtbar**: eine **Zusammenfassung** der aktuellen Auswahl
- **Starten**-Button immer sichtbar (aktiv sobald Mindestanforderungen erfüllt sind)
- **Zurück** + **Standard wiederherstellen**
- **Stepper 1–4 ist klickbar** (Quick Config)

---

## 2) Phase 1: Spieltyp
- **Single Player**
- **Splitscreen**
- **Online** → **Lobby erstellen** / **Lobby beitreten**  
Online ändert nur Lobby/Netzwerk. Alle Modi sind auch im Multiplayer möglich.

---

## 3) Phase 2: Modus
- **Arcade**
- **Jagd** (aktuell FFA)
- **Normal**
Teams später optional vorbereiten (zunächst deaktiviert).

---

## 4) Phase 3: Map / Bots / Darstellung / Fahrzeuge (Tabs)

### Tab A: Map
- Favoriten/Random/Zuletzt + Filter (u. a. 2D-kompatibel)
- **Map-Editor öffnen**: Single/Splitscreen ja, Online nein
- Nach Editor: **Übernehmen** / **Als Kopie speichern**

### Tab B: Bots
- an/aus, Anzahl, Schwierigkeit
- Online: **Host-only**
- Optional: Bots füllen Slots

### Tab C: Darstellung
- Hell/Dunkel
- **2D-Modus** (keine Pitch-Steuerung, Ebenenbewegung)
- Online: **Host-only**
- Presets müssen 2D-kompatibel sein oder warnen

### Tab D: Fahrzeuge
- Single/Splitscreen: Fahrzeug wählen + **Fahrzeug-Editor öffnen** (mit Übernehmen/Kopie)
- Online: kein Editor, Anpassung nur über Presets; Fahrzeugwahl pro Spieler im Loadout

---

## 5) Phase 4: Steuerung & Gameplay (Presets + Feintuning)
- Presets wählen (Kacheln/Dropdown)
- Single/Split: Presets verwalten (Duplizieren/Speichern/Umbenennen/Löschen)
- Feintuning in Akkordeons (Steuerung/Gameplay/HUD/Accessibility)
- Online: **nur Presets**, Feintuning gesperrt

---

## 6) Multiplayer: Player-Loadout (Fahrzeug pro Spieler)
In Lobby oder vor Matchstart pro Spieler:
- Fahrzeug wählen
- Fahrzeug-/Handling-Preset wählen (online nur Presets)
- Optional später: Skin/Farbe

Empfehlung: Splitscreen genauso (weniger Sonderfälle).

---

## 7) Online-Lobby (Host vs Client)
Host:
- kontrolliert **MatchSettings** (Mode/Map/Bots/Display/2D/Restriktionen)
- nutzt optional **Match-Presets** (komplette Regelsets per Klick)

Clients:
- sehen MatchSettings read-only
- wählen eigenes Loadout
- setzen Ready

**Ready/Dirty-State:** Host-Änderung → alle Clients un-ready + Hinweis.

---

## 8) Starten-Button hilft aktiv
Wenn Starten nicht möglich ist:
- zeige den Grund („Wähle Map oder Random“)
- Klick springt direkt zum passenden Tab/Schritt

---

## 9) Defaults (damit Start fast immer geht)
- Single, Normal, Random-Map, Hell, 2D aus, Bots aus, Preset Standard

---

## 10) Ergebnis
- Quickstart bleibt sehr schnell
- Custom ist mächtig aber übersichtlich
- Online sauber getrennt: Host-Regeln vs Spieler-Loadout vs lokale Settings
- Editor nur dort, wo er Sinn macht (Single/Split)
- Kompatibilitätsregeln verhindern ungültige Kombinationen
