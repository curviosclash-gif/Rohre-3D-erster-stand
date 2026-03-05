# Code-Audit Plan (Source Code Analyse)

**Ziel:** Komplette Überprüfung und Analyse des Spiel-Codes ohne Code-Änderungen. Am Ende wird ein detaillierter Abschlussbericht erstellt.

## Phase 1: Architektur & Core-Module

- **Fokus:** `src/core/` (z.B. Engine, Renderer, AssetManager) und `src/state/` (Game-State).
- **Ziele:**
  - Verständnis der Boot-Sequenz (`index.html`, `main.js`, `Game.js`).
  - Prüfung von Datenfluss und Zustandsverwaltung.
  - Erkennen von Architektur-Mustern (Singleton, ECS, etc.).

## Phase 2: Entitäten & Gameplay-Systeme

- **Fokus:** `src/entities/` (Spieler, Bots, Waffen, Map-Logik) und `src/hunt/` (Jagd-Modus-Spezifika).
- **Ziele:**
  - Analyse der KI (`Bot.js`, Navigation).
  - Prüfung der Physik und Kollisionserkennung (`Terrain.js`, `Arena.js`, Systeme).
  - Bewerten der Erweiterbarkeit und Kopplung.

## Phase 3: Rendering & UI

- **Fokus:** `src/ui/` (HUD, Menüs, Minimap), Shader (falls vorhanden) und CSS (`style.css`).
- **Ziele:**
  - Performance der Render-Calls (Three.js Optimierungen, Frustum Culling).
  - Trennung von UI-Logik (`src/ui/`) und Game-Logik.
  - Skalierbarkeit der UI (Responsive-Verhalten).

## Phase 4: Editor & Tooling

- **Fokus:** `editor/` (Track-Editor) und `scripts/`.
- **Ziele:**
  - Check der Map-Load/Save Mechanismen.
  - Konsistenz zwischen Editor-Generierung und Ingame-Parsing.
  - Sauberkeit der Build/Start Skripte (`package.json`, Vite-Config).

## Phase 5: Code-Qualität & Best Practices

- **Fokus:** Projektweit (Linters, Error Handling).
- **Ziele:**
  - Suche nach Hardcoded Werten („Magic Numbers“).
  - Memory Leak Risiko (Event-Listener Cleanup, Scene-Object Disposal).
  - Tote Code-Pfade, redundante Importe und Konsolen-Logs.

## Phase 6: Konsistenz: Test & Dokumentation

- **Fokus:** `tests/` und `docs/`.
- **Ziele:**
  - Prüfen der Abdeckung durch bestehende Playwright/Unit Tests.
  - Verifizieren, ob die Code-Realität noch zum `Umsetzungsplan.md`, `Architektur.md` und Status-Docs passt.

## Phase 7: Abschlussbericht

- **Format:** `docs/Code_Audit_Abschlussbericht.md`.
- **Inhalt:**
  - Executive Summary (Gesamtstatus, Codebase-Gesundheit).
  - Konkrete Kritikpunkte und Bottlenecks (Problem + Root Cause + Risk).
  - Gelungene Umsetzungen (Positives).
  - Handlungsempfehlungen (Next Steps für zukünftige Refactorings).
