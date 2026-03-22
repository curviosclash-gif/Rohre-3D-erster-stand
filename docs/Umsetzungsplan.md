# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-22

Dieser Plan ist die einzige aktive Quelle fuer offene Arbeit.
Alle abgeschlossenen oder abgeloesten Plaene liegen unter `docs/archive/plans/`.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Plan werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Eintraege gepflegt.

## Status-Legende

- Offen = `[ ]`
- In Bearbeitung = `[/]`
- Abgeschlossen = `[x]`

## Governance-Regeln (verbindlich)

1. `*.99`-Gates duerfen nur auf `[x]` stehen, wenn alle vorherigen Phasen desselben Blocks auf `[x]` stehen.
2. Jeder `[x]`-Eintrag muss Evidence tragen: `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`.
3. Jeder aktive Block braucht eine `Definition of Done (DoD)` mit mindestens 4 Pruefpunkten.
4. Jeder aktive Block braucht genau einen gueltigen Lock-Header: `<!-- LOCK: frei -->` oder `<!-- LOCK: Bot-X seit YYYY-MM-DD -->`.
5. Plan-Governance ist Pflicht-Gate in den Workflows: `npm run plan:check`.

## Abhaengigkeiten (Hard/Soft)

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V41.99 | - | soft | ja | Rest-Gate kann isoliert weiterlaufen |
| V46 | V45.9 | hard | ja | V45-Integration abgeschlossen |
| V50 | V41.99, V46.99 | hard | nein | V46.99 erledigt; Start wartet nur noch auf V41.99 |
| V50 | Architektur-Governance Baseline (`architecture:guard`) | soft | ja | Laufende Ratchet-Basis vorhanden |
| V51 | V50.99 | hard | nein | Parcours-Objective greift in Core/State/UI-Grenzen ein |
| V51 | V39.9 | soft | nein | Showcase-Map-Faehigkeiten als Basis weiterhin teilweise offen |

## Datei-Ownership (aktive Arbeit)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `src/core/MediaRecorderSystem.js`, `src/core/GameRuntimeFacade.js`, `src/core/runtime/**`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/ui/menu/multiplayer/**` | V46 / 46.2 | abgeschlossen | Core/Menu-Decomposition abgeschlossen |
| `src/hunt/**`, `src/entities/ai/**`, `src/entities/systems/ProjectileSystem.js`, `src/ui/HuntHUD.js` | V46 / 46.3 | abgeschlossen | Hunt/AI-Cleanups abgeschlossen |
| `src/network/**`, `server/**`, `src/ui/menu/**`, `src/core/**`, `src/state/**` | V50 | offen | Architektur-Haertung II |
| `docs/**`, `tests/**`, `scripts/validate-umsetzungsplan.mjs` | Shared | shared | Append-only oder eigener Abschnitt |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| A | V46.2 | 2026-03-22 | frei | - |
| B | V46.3 | 2026-03-22 | frei | - |
| C | V50 | 2026-03-22 | frei | - |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | Noch leer | - | - |

---

## Aktive Bloecke

## Block V41: Multiplayer Rest-Gate

Plan-Datei: `docs/Feature_Lokaler_Multiplayer_V41.md`

<!-- LOCK: frei -->

Scope:

- Restliche Real-World-Verifikation fuer Multiplayer-LAN/Internet.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Block-Phasen sind `[x]` inklusive 41.99.*.
- [ ] DoD.2 Relevante Tests/Smokes sind gruen (`test:core`, Multiplayer-Smokes).
- [ ] DoD.3 `npm run docs:sync` und `npm run docs:check` sind PASS.
- [ ] DoD.4 Evidence, Conflict-Log und Lock-Status sind konsistent.

### Phase 41.99: Abschluss-Gate

- [ ] 41.99.1 LAN-Match auf 2+ Rechnern manuell verifizieren (stabiler Session-Lebenszyklus)
- [ ] 41.99.2 Internet-Match auf 2+ Rechnern via Signaling-Server verifizieren
- [ ] 41.99.3 Gamepad + Touch in Multiplayer validieren
- [ ] 41.99.4 Host-Performance bei 10 Spielern gegen Zielbudget pruefen

### Risiko-Register V41

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reconnect-Drift zwischen LAN/Online | mittel | Netzwerk | End-to-End Testmatrix je Session-Typ | Disconnect/Resume Unterschiede |
| Multi-Input Regression (Gamepad/Touch) | mittel | UI | Dedizierte Input-Smokes + manuelle Matrix | UI/Input Event Konflikte |
| Performance-Einbruch bei 10 Spielern | hoch | Runtime | Profiling + CPU-Budget-Gate vor Abschluss | Host-FPS/CPU ausserhalb Ziel |

---

## Block V46: Architektur-Verbesserungen (Restarbeiten)

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V45.9 -->

Scope:

- God Objects weiter zerlegen (Core/Menu + Hunt/AI).
- Magic Numbers und Sensing-Pfade in klare Contracts/Konfigs ueberfuehren.

### Definition of Done (DoD)

- [x] DoD.1 46.2.* und 46.3.* sind abgeschlossen und per Tests abgesichert. (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics -> PASS)
- [x] DoD.2 46.99.* ist abgeschlossen und Gate-Invariante erfuellt. (abgeschlossen: 2026-03-22; evidence: plan status audit -> docs/Umsetzungsplan.md)
- [x] DoD.3 `npm run architecture:guard`, `npm run build` und relevante Tests sind PASS. (abgeschlossen: 2026-03-22; evidence: npm run architecture:guard && npm run build -> PASS)
- [x] DoD.4 Evidence-Format, Conflict-Log und Lock-Bereinigung sind erledigt. (abgeschlossen: 2026-03-22; evidence: npm run plan:check -> PASS)

### 46.2 Core- und Menu-Decomposition

- [x] 46.2.1 `MediaRecorderSystem` und `GameRuntimeFacade` in kleinere Module mit klaren Facades zerlegen (abgeschlossen: 2026-03-22; evidence: npm run build -> PASS (inkl. architecture:guard))
- [x] 46.2.2 `MenuMultiplayerBridge` entkoppeln und Runtime-Ports (`src/ui/menu/multiplayer/*`) per DI nutzen (abgeschlossen: 2026-03-22; evidence: npm run test:core -- --grep T41d -> commit 045de8b)

### 46.3 Hunt/AI-Cleanups und Modulgrenzen

- [x] 46.3.1 Magic Numbers in Hunt/Projectile/AI in Konfig-Objekte ueberfuehren und Sensing-Primitives abschliessen (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics -> PASS)
- [x] 46.3.2 `HuntHUD` nach `src/ui/` migriert, Lifecycle/Dispose verdrahtet (abgeschlossen: 2026-03-21; evidence: npm run test:physics:hunt -> commit f4b7f1b)

### Phase 46.99: Integrations- und Abschluss-Gate

- [x] 46.99.1 `npm run architecture:guard`, relevante Tests und Build sind gruen (nach 46.2.1 + 46.3.1) (abgeschlossen: 2026-03-22; evidence: npm run architecture:guard && npm run build -> PASS)
- [x] 46.99.2 `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen (abgeschlossen: 2026-03-22; evidence: npm run docs:sync && npm run docs:check -> PASS)

### Risiko-Register V46

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Regression durch Decomposition | hoch | Core | Kleine PR-Schritte + zielgerichtete Regressionstests | Fehler in Runtime-Start/Tick |
| Boundary-Drift bei Refactor | mittel | Architektur | `architecture:guard` in jedem Gate | Neue verbotene Imports |
| Unvollstaendige Legacy-Entkopplung | mittel | Runtime/UI | Explizite Removal-Checkliste pro Modul | Verbleibende Legacy Hooks |

---

## Block V50: Architektur-Haertung II - Netzwerk, Boundaries, Persistenz, Determinismus

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V41.99, V46.99 -->

Scope:

- Netzwerkpfade konsolidieren, Persistenz vereinheitlichen, Determinismus absichern.
- Zusetzliche God-Objects zerlegen und Governance auf Debt-Paydown umstellen.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 50.1 bis 50.9 sind abgeschlossen.
- [ ] DoD.2 50.99.* ist abgeschlossen und Gate-Invariante erfuellt.
- [ ] DoD.3 `architecture:guard`, `test:fast`, netzwerkbezogene Kernfaelle und `build` sind PASS.
- [ ] DoD.4 Evidence, Conflict-Log, Lock-Bereinigung und Abschlussdokumentation sind sauber.

### 50.1 Netzwerk-Contract und SessionAdapter-Basis

- [ ] 50.1.1 Gemeinsamen Multiplayer-Message-Contract (`join/ready/leave/reconnect/full_state_sync`) fuer `src/network/**` und `server/**` definieren und versionieren
- [ ] 50.1.2 Gemeinsame SessionAdapter-Basis fuer Reconnect/Heartbeat/Leave/State-Dispatch extrahieren

### 50.2 Lobby/Signaling-Semantik angleichen

- [ ] 50.2.1 `LANMatchLobby` und `OnlineMatchLobby` auf einheitliche Session-State-Datenstruktur umstellen
- [ ] 50.2.2 `server/signaling-server.js` und `server/lan-signaling.js` ueber denselben Protokollvertrag harmonisieren

### 50.3 Boundary-Refactor `core -> ui`

- [ ] 50.3.1 UI-nahe Imports in Core ueber Ports/Facades in eine Kompositionsschicht verschieben
- [ ] 50.3.2 Architektur-Checks um `core -> ui`-Budgets erweitern und Legacy-Kanten abbauen

### 50.4 Persistenzplattform vereinheitlichen

- [ ] 50.4.1 Gemeinsame Storage-Infrastruktur aufbauen (`StorageDriver`, Migration-Registry, Quota-Handling)
- [ ] 50.4.2 Settings-/Menu-/Telemetry-Stores auf die gemeinsame Plattform migrieren

### 50.5 Deterministische Zeit-/RNG-Infrastruktur

- [ ] 50.5.1 `RuntimeClock` und `RuntimeRng` als injizierbare Contracts einfuehren
- [ ] 50.5.2 Direkte Nutzung von `Date.now`/`Math.random`/`performance.now` in kritischen Pfaden per Guard reduzieren

### 50.6 Decomposition-Welle II (zusaetzliche God-Objects)

- [ ] 50.6.1 `GameDebugApi` und `SettingsManager` in kleinere Domain-Facades aufteilen
- [ ] 50.6.2 `UIStartSyncController` und `WebSocketTrainerBridge` in Render-/Protocol-/Telemetry-Module zerlegen

### 50.7 EntityRuntimeCompat-Abbau

- [ ] 50.7.1 Capability-basierte Runtime-Ports fuer Spawn/Combat/Collision/Trail definieren
- [ ] 50.7.2 `Object.assign(this, this.runtime.compat)` in `EntityManager` entfernen

### 50.8 Multiplayer-UI Channel-Ownership final absichern

- [ ] 50.8.1 BroadcastChannel-Lifecycle ausschliesslich in `MenuMultiplayerBridge` halten
- [ ] 50.8.2 `MenuLobbyRenderer` als pure View ohne Channel-/Side-Effect-Verantwortung festschreiben

### 50.9 Architektur-Governance auf Debt-Paydown umstellen

- [ ] 50.9.1 Legacy-Budgets als Ratchet pflegen (nur sinkend)
- [ ] 50.9.2 Touched-File-Strict-Mode in Architektur-Checks/ESLint aktivieren

### Phase 50.99: Integrations- und Abschluss-Gate

- [ ] 50.99.1 `npm run architecture:guard`, `npm run test:fast`, netzwerkbezogene Kernfaelle und `npm run build` sind gruen
- [ ] 50.99.2 `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich, Lock-Bereinigung und Abschlussdokumentation abgeschlossen

### Risiko-Register V50

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Contract-Breaking Change zwischen LAN/Online | hoch | Netzwerk | Versionierter Message-Contract + Adapter-Compatibility-Tests | Protocol Drift |
| Persistenz-Migration verursacht Datenverlust | hoch | Core | Migration Registry + Rollback/Testdaten | Fehlschlag bei Upgrade |
| Determinismus unvollstaendig in Hotpaths | mittel | Entities/State | Guard-Regeln + gezielte clock/rng audits | Divergierende Sim-Verlaeufe |

---

## Backlog (priorisiert, nicht gestartet)

Hinweis: Bot-Training-Backlog wird in `docs/Bot_Trainingsplan.md` gepflegt.

| ID | Titel | Plan-Datei | Impact | Aufwand | Prioritaet | Naechster Schritt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V39 | Komplexe Showcase-Map | `docs/Feature_Komplexe_Showcase_Map_V39.md` | mittel | gross | P2 | Scope-Review nach V46 | In Bearbeitung |
| V40 | Hunt Rocket Trail Targeting | `docs/Feature_Hunt_Rocket_Trail_Targeting_V40.md` | mittel | mittel | P1 | mit V50.1 Contract abstimmen | Offen |
| V51 | Parcours-Pflichtmap mit Lauf-Verifikation | `docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md` | hoch | gross | P1 | Start nach V50.99; Route/Schema-Freeze mit 51.1/51.2 | Offen |
| V42 | Menu Default Editor | `docs/Feature_Menu_Default_Editor_V42.md` | mittel | mittel | P2 | UX/Ownership klaeren | In Bearbeitung |
| V43 | Projektstruktur Spiel/Dev-Ordner | `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md` | niedrig | mittel | P3 | 43.2.1 Dev-Bereich ueber Wrapper vorbereiten (`scripts/tests/trainer/prototypes`) | In Bearbeitung |
| V2 | Test-Performance-Optimierung | `docs/Feature_TestPerformance_V2.md` | hoch | mittel | P1 | Benchmark baseline erneuern | Offen |
| V26.3c | Menu UX Follow-up | `docs/Feature_Menu_UX_Followup_V26_3c.md` | mittel | klein | P2 | in UI backlog einsortieren | Offen |
| V29b | Cinematic Camera Follow-up + YouTube Shorts Capture | `docs/Feature_Cinematic_Camera_Followup_V29b.md` | mittel | mittel | P2 | 29b.1.1 Aufnahme-Contract fuer Shorts-Profil, HUD-Optionen und dynamische Aufloesung finalisieren | Offen |
| N2 | Recording-UI / manueller Trigger | - | mittel | klein | P2 | mit V29b.5 Menue-Flow zusammenfuehren | Offen |
| N8 | Bot-Dynamikprofile als UI-Gegnerklassen | - | mittel | gross | P3 | Design-Note erstellen | Offen |
| T1 | Dummy-Tests durch echte ersetzen | - | hoch | mittel | P1 | Testkatalog priorisieren | Offen |

---

## Abgeschlossene Bloecke (archiviert)

| Block | Grund | Plan-Datei | Archiv-Pfad |
| --- | --- | --- | --- |
| V45 | abgeschlossen | `docs/archive/plans/completed/Feature_Arcade_Modus_V45.md` | `docs/archive/plans/completed/` |
| V47 | abgeschlossen | `docs/archive/plans/completed/Feature_Strategy_Pattern_V47.md` | `docs/archive/plans/completed/` |
| V48 | abgeschlossen | `docs/archive/plans/completed/Feature_Fight_Modus_Qualitaet_V48.md` | `docs/archive/plans/completed/` |
| N4-N7 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V49 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V41-D | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| Alte Masterplaene bis 2026-03-06 | abgeloest | `docs/archive/plans/superseded/Umsetzungsplan_bis_2026-03-06.md` | `docs/archive/plans/superseded/` |

## Weekly Review (KW 12/2026)

Stand: 2026-03-22

- Abgeschlossen diese Woche: V46.2.1, V46.2.2, V46.3.1, V46.3.2, V46.99, Planarchiv-Bereinigung.
- Blockiert: V50 (wartet auf V41.99 Real-World-Gates).
- Naechste 3 Ziele:
  1. 41.99.1 LAN-Match auf 2+ Rechnern verifizieren.
  2. 41.99.2 Internet-Match auf 2+ Rechnern via Signaling-Server verifizieren.
  3. 41.99.3/41.99.4 Input- und Host-Performance-Gates abschliessen.
- Groesstes Risiko: V50 startet zu spaet, wenn V41.99 manuell blockiert.
- Entscheidungsbedarf: reale Multiplayer-Testumgebung (2+ Maschinen) terminieren.

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
