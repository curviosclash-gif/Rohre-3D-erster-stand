# Refactoring Plan: Auflösung der God Classes (Multi-Agent Setup)

**Zweck:** Behebung der Architekturrisiken (enge Kopplung von Rendering, Input, Physik und KI in `Player.js` und `Bot.js`), optimiert für die **parallele Bearbeitung durch 2 Bots**.

Jeder Bot bekommt eindeutig getrennte Bereiche (Scopes), um Merge-Konflikte und überschneidende Änderungen zu vermeiden.

---

## 🚦 Phase 1: Baseline & Vorbereitung (Bot A)

*Dieser Schritt muss sequenziell vor den parallelen Phasen laufen.*

- **Scope:** `tests/` und Smoke-Test Setups.
- **Aktion:** Sicherung des Ist-Zustandes. Ausführen der Playwright-Smoke-Tests (`round-state-controller-smoke.mjs`, `bot-benchmark-baseline.mjs`), um Referenzwerte für Physik/Kollision zu speichern.

---

## 🔀 Phase 2: Parallele Entkopplung (Bot A & Bot B)

*Beide Bots arbeiten gleichzeitig an strikt getrennten Dateien.*

### 🤖 Bot A: Visualisierung & Input (Player Scope)

- **Fokus-Dateien:** `src/entities/Player.js`, `src/entities/player/*`
- **Ziel:** 3D-Kopplung aus der Entität entfernen.
- **Aufgaben:**
  1. **PlayerView erstellen:** Extraktion von `_createModel`, `_updateModel` und Three.js Shared Geometries in eine neue `PlayerView.js`.
  2. **Effects auslagern:** Engine-Trails (`_updateEffects`) in die `PlayerView` verlegen.
  3. **Input / Controller-Extraktion:** Die Verarbeitung von Steuerung (`pitchUp`, `boost`) aus `Player.update()` in einen `PlayerController`-Dienst verschieben.
  4. **Umbau Player.js:** Reduktion auf reinen State-Container (Position, Stats, Inventar), der die `PlayerView` bei Bedarf aktualisiert.

### � Bot B: Sensoren & KI-Logik (Bot Scope)

- **Fokus-Dateien:** `src/entities/Bot.js`, `src/entities/ai/*`, `src/hunt/HuntBotPolicy.js`
- **Ziel:** Probe/Raycast-Logik aus dem Bot entkoppeln.
- **Aufgaben:**
  1. **BotSensors erstellen:** Auslagerung der Umgebungswahrnehmung (Raycast/Probes, `_scanProbeRay`, `_senseProjectiles`, Height/Spacing-Sensing) in ein neues `BotSensors.js`-Modul.
  2. **Memoization auslagern:** Den Kollisions-Cache (`_getCollisionMemoized`) in ein Hilfsobjekt oder die Arena-Kollision verschieben.
  3. **Umbau Bot.js:** Die `BotAI`-Klasse wird zum reinen "Entscheider", der Sensor-Ergebnisse (z.B. "Gefahr Links: 80%") konsumiert und Aktionen auswählt, statt selbst Vektormathematik zu betreiben.

---

## 🔀 Phase 3: Physik & Hitboxen (Bot A & Bot B)

*Zusammenführung der reduzierten Klassen.*

### 🤖 Bot A: Player Physics & Hitbox

- **Fokus:** `src/entities/player/PlayerMotionOps.js`
- **Aufgaben:** Überholschritt der Kinematik. Sicherstellen, dass die OBB (Hitbox) unabhängig vom Three.js Render-Mesh aktualisiert wird.

### 🤖 Bot B: Bot Navigation & Integration

- **Fokus:** `src/hunt/HuntBotPolicy.js` und PPO/ML-Schnittstellen
- **Aufgaben:** Die neue Sensor-Struktur (`BotSensors`) in die dedizierten Policies (Hunt/Classic) integrieren und sicherstellen, dass die ML-Schnittstelle (zukünftiges Bot-Training) klare Input-Vektoren aus den Sensoren erhält.

---

## 🏁 Phase 4: Qualitätsprüfung & Verifizierung (Bot A)

*Zusammenführung und finaler Test.*

- **Aktion:** Ausführen der isolierten Benchmark- und Smoke-Tests.
- **Ziel:** Sicherstellen, dass die Entkopplung (Headless Simulation der Kernphysik ohne Renderer) funktioniert und keine Performance-Einbußen (vs. Baseline Phase 1) existieren.
- **Abschluss:** Kurzer Bericht über die erfolgreiche Aufteilung.
