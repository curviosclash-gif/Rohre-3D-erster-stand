# Feature: Kernmodularisierung fuer Performance und KI-Bearbeitbarkeit (2-Agenten)

Stand: 2026-03-03

## Ziel

Die verbleibenden Hotspots (`main.js`, `EntityManager.js`, `Bot.js`) werden in kleine, klar getrennte Module aufgeteilt, damit:

1. KI-Agents kleinere, eindeutige Aenderungsflaechen haben.
2. Merge-Konflikte sinken (weniger "God Files").
3. Hotpath-Performance stabil bleibt (keine neuen Frame-Allokationen).

---

## Agentenmodell (verbindlich)

- Agent A (Umsetzung):
  - Baut die Phasen 20.x strikt nacheinander.
  - Fuehrt **keine** Tests aus (`npm run ...`, Playwright, Build, Lint).
  - Aendert nur Runtime-/Struktur-/Dokupfade der Phase.
- Agent B (Kontrolle + Test):
  - Prueft jede Gate-Uebergabe von Agent A.
  - Fuehrt Tests aus und dokumentiert Findings.
  - Gibt Phase erst frei, wenn Gate-Kriterien erfuellt sind.

---

## Architektur- und Risikocheck

- Reuse vor Neubau: vorhandene `*System.js` / `*Ops.js` Muster beibehalten.
- Hotpath-Schutz: in `update/render`-Pfaden keine neuen Objekte pro Frame.
- Risiko:
  - `EntityManager` Split: hoch (Kollision, Spawn, Hunt-Combat).
  - `main.js` Split: mittel (Lifecycle-/UI-Orchestrierung).
  - `Bot.js` Split: hoch (Sensing/Decision-Verhalten).

---

## Geplanter Datei-Scope

Bestehend (primaer):

- `src/entities/EntityManager.js`
- `src/core/main.js`
- `src/entities/Bot.js`
- `src/entities/Arena.js.latest_commit` (Aufraeumen)

Neu (zielbild):

- `src/entities/systems/SpawnPlacementSystem.js`
- `src/entities/systems/CollisionResponseSystem.js`
- `src/entities/systems/HuntCombatSystem.js`
- `src/core/PlanarAimAssistSystem.js`
- `src/core/MatchSessionRuntimeBridge.js`
- `src/entities/ai/BotProbeOps.js`
- `src/entities/ai/BotPortalOps.js`
- `src/entities/ai/BotThreatOps.js`

---

## Phase 20.0 - Vorbereitende Leitplanken (Agent A)

- [ ] **20.0.1 Scope-Hygiene**
  - `src/entities/Arena.js.latest_commit` aus Runtime-Naehe entfernen (nach `docs/archive/` oder `backups/`), damit KI-Search/Edit keine Altdatei als aktiven Code behandelt.
- [ ] **20.0.2 Schnittstellen-Protokoll**
  - Kurze Modul-Contracts als Header-Kommentare in den neuen Zielmodulen vorbereiten (Inputs/Outputs/Seiteneffekte).
- [ ] **20.0.3 Guardrails fuer Hotpaths**
  - Bei neuen `update`-nahen Methoden nur wiederverwendbare Temp-Objekte und Pools nutzen.

### Gate Q0 (Agent B)

- [ ] Import-Graph laeuft ohne neue Dead Imports.
- [ ] `Arena.js.latest_commit` wird nicht mehr von Runtime-Pfaden referenziert.

Empfohlene Checks:

- `rg -n "Arena\\.js\\.latest_commit|from '../entities/Arena\\.js\\.latest_commit'" src docs`
- `npm run test:core`

---

## Phase 20.1 - EntityManager Split A: Spawn + Bounce + HuntCombat (Agent A)

- [ ] **20.1.1 SpawnPlacementSystem extrahieren**
  - Methoden aus `EntityManager` auslagern: `_findSpawnPosition`, `_findSafeSpawnDirection`, `_traceFreeDistance`, `_findSafeBouncePosition` (nur Spawn-relevanter Teil).
  - `EntityManager` bleibt orchestrierender Call-Site.
- [ ] **20.1.2 CollisionResponseSystem extrahieren**
  - Bounce-/Clamp-Methoden auslagern: `_clampBotPosition`, `_bounceBot`, `_bouncePlayerOnFoam`, `_isBotPositionSafe`.
- [ ] **20.1.3 HuntCombatSystem extrahieren**
  - Inventar-/Item-/MG-/LockOn-Pfade auslagern: `_takeInventoryItem`, `_useInventoryItem`, `_shootItemProjectile`, `_shootHuntGun`, `_checkLockOn`.
- [ ] **20.1.4 Kompatibilitaets-Fassade belassen**
  - Oeffentliche Aufrufer und bestehende Signaturen stabil halten.

### Gate Q1 (Agent B)

- [ ] Keine Verhaltensabweichung bei Spawn, Bounce und Hunt-Hit-Pfaden.
- [ ] Keine neuen per-frame Allokationen in den extrahierten Hotpaths.

Empfohlene Checks:

- `npm run test:core`
- `npm run test:physics`
- `npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"`

---

## Phase 20.2 - main.js Split B: Runtime-Orchestrierung verschaelern (Agent A)

- [ ] **20.2.1 MatchSessionRuntimeBridge einfuehren**
  - Session-Ref-Lifecycle und Apply/Clear-Helfer aus `main.js` herausziehen (`_applyInitializedMatchSession`, `_getCurrentMatchSessionRefs`, `_clearMatchSessionRefs`).
- [ ] **20.2.2 PlanarAimAssistSystem einfuehren**
  - `_getPlanarAimAxis` + `_updatePlanarAimAssist` + TimeScale-Abgleich in dediziertes Core-System verschieben.
- [ ] **20.2.3 BuildInfo/Clipboard-Helfer kapseln**
  - Build-Info-Render/Kopierlogik in klar getrennten Utility-/Controller-Pfad auslagern.
- [ ] **20.2.4 main.js als Facade stabilisieren**
  - `main.js` bleibt Entry-Orchestrator mit Delegation statt Detail-Logik.

### Gate Q2 (Agent B)

- [ ] Match Start/Stop, Round-End und Menu-Rueckkehr unveraendert.
- [ ] UI-Status (Crosshair/HUD/Toast) regressionsfrei.

Empfohlene Checks:

- `npm run test:core`
- `npm run test:stress`
- `npm run build`

---

## Phase 20.3 - Bot.js Split C: Sensing-Hilfen auslagern (Agent A)

- [ ] **20.3.1 BotProbeOps extrahieren**
  - Probe-Richtung, Probe-Ray und Probe-Scoring-Helfer aus `Bot.js` in `src/entities/ai/BotProbeOps.js`.
- [ ] **20.3.2 BotPortalOps extrahieren**
  - Portal-Intent und Exit-Safety-Pfade auslagern (`_estimateExitSafety`, `_evaluatePortalIntent`).
- [ ] **20.3.3 BotThreatOps extrahieren**
  - Projektil-, Hoehen- und Bot-Abstands-Sensorik auslagern (`_senseProjectiles`, `_senseHeight`, `_senseBotSpacing`, `_evaluatePursuit`).
- [ ] **20.3.4 Bot.js als schlanke Runtime-Huelle**
  - `update()` + Statusverwaltung bleibt zentral; Fachlogik lebt in Ops-Modulen.

### Gate Q3 (Agent B)

- [ ] Bot-Verhalten bleibt stabil (kein Totalausfall von Recovery/Pursuit/Portal-Intent).
- [ ] Keine Leistungseinbrueche in dichten Bot-Szenen.

Empfohlene Checks:

- `npm run test:core`
- `npm run test:physics`
- `npm run smoke:roundstate`
- `npm run build`

---

## Phase 20.4 - Abschluss und Doku-Freeze (Agent A + Agent B)

- [ ] **20.4.1 Agent A**
  - Restliche Runtime-Doku/Kommentare in den neuen Modulen auf Endstand bringen.
  - Keine Testausfuehrung.
- [ ] **20.4.2 Agent B**
  - Endabnahme mit gebuendelter Test-Suite.
  - Ergebnisprotokoll in `docs/Testergebnisse_2026-03-03.md` ergaenzen.
- [ ] **20.4.3 Dokumentations-Freshness**
  - `npm run docs:sync`
  - `npm run docs:check`

Empfohlene Endabnahme (Agent B):

- `npm run test:core`
- `npm run test:physics`
- `npm run test:stress`
- `npm run smoke:roundstate`
- `npm run build`
- `npm run docs:sync`
- `npm run docs:check`

---

## Koordinationsprotokoll pro Gate

Agent A liefert pro Gate:

1. Geaenderte Dateien.
2. Kurzbeschreibung der Extraktion.
3. Offene Risiken/Hypothesen.

Agent B liefert pro Gate:

1. Testkommandos + Ergebnis (`pass/fail`).
2. Regressions-Fundstellen mit Datei/Zeile.
3. Freigabe (`GO`) oder Rueckgabe (`NO-GO`).

---

## Definition of Done

- `main.js`, `EntityManager.js`, `Bot.js` sind jeweils deutlich reduziert und delegieren.
- Extrahierte Module haben klaren Verantwortungsfokus (kein neues God-File).
- Hotpaths bleiben allocationsarm.
- Alle Q-Gates inkl. Endabnahme sind `GO`.
- Dokumentation ist frisch (`docs:sync`, `docs:check` gruen).
