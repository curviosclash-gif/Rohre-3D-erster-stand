# Feature: Phase 13 - UI-Entkopplung und selektive Settings-Synchronisierung

Stand: 2026-03-02

## Ziel

Das Menue-UI soll in kleinen, sicheren Schritten weiter modularisiert werden, damit:

1. UI-Verantwortungen eindeutig sind (kein doppelter Context-/Toast-Pfad).
2. `UIManager` nicht mehr als monolithisches `syncAll()`-Objekt arbeitet.
3. Settings-Aenderungen nur noch die betroffenen UI-Bereiche aktualisieren.
4. Performance-Verbesserungen nicht vermutet, sondern ueber feste Mess-Gates belegt werden.

## Nicht-Ziele

1. Keine Gameplay- oder Physik-Logik aendern.
2. Keine neuen Features im Menue einbauen.
3. Keine Umstellung der Render-/Entity-Hotpaths in dieser Phase.

## Leitregeln pro Teilphase

1. Pro Teilphase ein Schwerpunkt, 2-5 produktive Dateien.
2. Keine Verhaltensaenderung, wenn nicht explizit gefordert.
3. Pro Teilphase mindestens `npm run test:core`.
4. Nach jeder abgeschlossenen Teilphase Pflicht-Gates: `npm run docs:sync` und `npm run docs:check`.

## Parallelbetrieb mit zwei Agenten

Ziel: moeglichst viel parallel ohne Merge-Konflikte.

Verantwortungen:

- Agent A (View-Sync): `src/ui/UIManager.js`, `src/ui/UISettingsSyncMap.js`
- Agent B (Event-Semantik): `src/ui/MenuController.js`, `src/ui/SettingsChangeKeys.js`, `src/ui/SettingsChangeSetOps.js`
- Integrations-Agent: `src/core/main.js` plus finale Zusammenfuehrung

Datei-Ownership-Regel:

1. In Parallelbloecken bearbeitet Agent A keine Dateien von Agent B und umgekehrt.
2. `src/core/main.js` wird erst in Integrationsphasen bearbeitet.
3. Schnittstelle fuer beide Spuren ist `SettingsChangeKeys` (stabiler Vertrag).

## Fortschrittsboard

- [x] 13.0 Baseline, Scope und Schnittstellenvertrag fixieren
- [x] 13.1A `UIManager` in fachliche Sync-Methoden aufteilen (Agent A)
- [x] 13.1B Typisierte Settings-Change-Keys emittieren (Agent B)
- [x] 13.2A Selektive UI-Sync-API im `UIManager` einfuehren (Agent A)
- [x] 13.2B Slider-/Input-Change-Coalescing im `MenuController` (Agent B)
- [x] 13.3 Integration I: `main.js` auf selektive UI-Sync umstellen
- [x] 13.4 Integration II: Context/Toast-Verantwortung final eindeutig machen
- [x] 13.5 Abschluss: Regression, Performance-Vergleich, Doku-Abschluss

---

## Phase 13.0 - Baseline, Scope und Schnittstellenvertrag fixieren

Ziel:

1. Einheitliche Startbasis fuer beide Agenten.
2. Change-Key-Vertrag fuer parallele Implementierung stabilisieren.

Dateien (2-5):

- `docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md`
- optional: `docs/Testergebnisse_2026-03-02.md` (nur falls Baseline-Abschnitt erweitert wird)

Arbeitsschritte:

1. Vorher-Zustand der UI-Synchronisierung in 5-10 Stichpunkten dokumentieren.
2. Fixe Key-Namenskonvention definieren (z. B. `mode`, `gameMode`, `bots.count`, `gameplay.speed`).
3. Parallelblock fuer 13.1A und 13.1B freigeben.

Definition of Done:

- Klarer Key-Vertrag vorhanden.
- Beide Agenten koennen ohne Dateikonflikte starten.

Verifikation:

- `npm run test:core`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.0 als erledigt und starte die Parallelphasen 13.1A und 13.1B aus docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md.`

---

## Phase 13.1A - `UIManager` in fachliche Sync-Methoden aufteilen (Agent A)

Ziel:

1. `syncAll()` in kleine, lesbare Sync-Bloecke zerlegen.
2. Verhalten 1:1 beibehalten.

Dateien (2-5):

- `src/ui/UIManager.js`

Arbeitsschritte:

1. `syncAll()` in Methoden wie `syncModes`, `syncMap`, `syncBots`, `syncRules`, `syncGameplay`, `syncVehicles` teilen.
2. `syncAll()` bleibt als Orchestrator erhalten und ruft die Teilmethoden in fixer Reihenfolge auf.
3. Defensive Null-Pruefungen konsistent halten.

Definition of Done:

- `syncAll()` ist klar lesbar und delegiert nur noch.
- Kein sichtbarer Unterschied im Menue-Verhalten.

Verifikation:

- `npm run test:core`
- `npm run test:stress`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.1A als erledigt und starte Phase 13.2A aus docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md.`

---

## Phase 13.1B - Typisierte Settings-Change-Keys emittieren (Agent B)

Ziel:

1. `MenuController` emittiert nicht nur "settings changed", sondern strukturierte Keys.
2. Vertrag fuer selektive UI-Sync schaffen.

Dateien (2-5):

- `src/ui/MenuController.js`
- `src/ui/SettingsChangeKeys.js` (neu)

Arbeitsschritte:

1. Konstanten fuer alle relevanten Settings-Bereiche definieren.
2. Jeder Listener emittiert `SETTINGS_CHANGED` mit `changedKeys`.
3. Events bleiben rueckwaertskompatibel (ohne Payload weiterhin gueltig).

Definition of Done:

- Einheitlicher Key-Satz vorhanden.
- Keine Regression im Event-Flow.

Verifikation:

- `npm run test:core`
- `npm run test:stress`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.1B als erledigt und starte Phase 13.2B aus docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md.`

---

## Phase 13.2A - Selektive UI-Sync-API im `UIManager` einfuehren (Agent A)

GATE: startet erst, wenn `SettingsChangeKeys` aus 13.1B stabil ist.

Ziel:

1. Gezielte Synchronisierung einzelner UI-Bereiche.
2. `syncAll()` nur noch als Fallback.

Dateien (2-5):

- `src/ui/UIManager.js`
- `src/ui/UISettingsSyncMap.js` (neu)

Arbeitsschritte:

1. Mapping `changeKey -> syncTeilfunktion` definieren.
2. Neue API `syncByChangeKeys(changedKeys)` implementieren.
3. Bei unbekannten Keys automatisch auf `syncAll()` fallen.

Definition of Done:

- Selektive Sync laeuft fuer bekannte Keys.
- Fallback sichert Verhalten bei Altpfaden.

Verifikation:

- `npm run test:core`
- `npm run test:stress`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.2A als erledigt und bereite Integration 13.3 vor.`

---

## Phase 13.2B - Slider-/Input-Change-Coalescing im `MenuController` (Agent B)

Ziel:

1. Bei schnellen Slider-Inputs weniger redundante `SETTINGS_CHANGED`-Events.
2. Gleiches Endverhalten bei reduzierter UI-Last.

Dateien (2-5):

- `src/ui/MenuController.js`
- `src/ui/SettingsChangeSetOps.js` (neu)

Arbeitsschritte:

1. Coalescing fuer `input`-Storms einbauen (z. B. pro Animation Frame).
2. Mehrere Keys innerhalb eines Frames zu einem Event zusammenfassen.
3. `change`-/`click`-Events mit sofortiger Rueckmeldung beibehalten.

Definition of Done:

- Event-Flut bei Slidern reduziert.
- Settings-Endzustand bleibt identisch.

Verifikation:

- `npm run test:core`
- `npm run test:stress`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.2B als erledigt und starte Integration 13.3 aus docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md.`

---

## Phase 13.3 - Integration I: `main.js` auf selektive UI-Sync umstellen

GATE: 13.2A und 13.2B muessen auf `[x]` stehen.

Ziel:

1. `main.js` nutzt Payload-basierte UI-Sync statt pauschalem Vollsync.
2. Bestehende Altpfade bleiben als Fallback intakt.

Dateien (2-5):

- `src/core/main.js`
- `src/ui/UIManager.js`
- optional: `src/ui/MenuController.js`

Arbeitsschritte:

1. `_onSettingsChanged(event)` auf `event.changedKeys` erweitern.
2. Bei vorhandenen Keys `uiManager.syncByChangeKeys(changedKeys)` aufrufen.
3. Bei fehlenden Keys weiter `syncAll()` nutzen.

Definition of Done:

- Selektive Sync ist im Runtime-Pfad aktiv.
- Kein Bruch bei Profil-Laden/Reset-Key/Mode-Wechsel.

Verifikation:

- `npm run test:core`
- `npm run test:stress`
- `npm run smoke:roundstate`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.3 als erledigt und starte Phase 13.4 aus docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md.`

---

## Phase 13.4 - Integration II: Context/Toast-Verantwortung final eindeutig machen

Ziel:

1. Genau eine technische Stelle fuer Menu-Context.
2. Genau eine technische Stelle fuer Status-Toast.

Dateien (2-5):

- `src/core/main.js`
- `src/ui/UIManager.js`
- optional: `src/ui/MatchFlowUiController.js`

Arbeitsschritte:

1. Doppelpfad fuer Menu-Context entfernen (`main.js` vs `UIManager`).
2. Toast-Verantwortung entscheiden und Altpfad loeschen (inkl. ungenutzter Methoden).
3. Alle Aufrufer auf die finale API umstellen.

Definition of Done:

- Kein duplizierter Context-/Toast-Code mehr.
- Debug-/Build-Info- und Profil-Flow weiterhin funktional.

Verifikation:

- `npm run test:core`
- `npm run test:stress`
- `npm run smoke:roundstate`
- `npm run smoke:selftrail`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.4 als erledigt und starte Phase 13.5 aus docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md.`

---

## Phase 13.5 - Abschluss: Regression, Performance-Vergleich, Doku-Abschluss

Ziel:

1. Wirkung der selektiven Sync objektiv pruefen.
2. Restrisiken und Folgeoptionen dokumentieren.

Dateien (2-5):

- `docs/Testergebnisse_2026-03-02.md` (oder neues Tagesdokument)
- `docs/ai_architecture_context.md` (falls Zustaendigkeiten geaendert wurden)
- `docs/Umsetzungsplan.md`

Arbeitsschritte:

1. Vorher/Nachher fuer Menue-Interaktionen vergleichen (Testdauer/Fehlerbild/Responsiveness).
2. Restrisiken und offene Folgearbeiten dokumentieren.
3. Phase 13 im Masterplan auf abgeschlossen setzen.

Definition of Done:

- Testmatrix ist gruen.
- Doku und Planstatus sind konsistent.

Verifikation:

- `npm run test:core`
- `npm run test:stress`
- `npm run smoke:roundstate`
- `npm run smoke:selftrail`
- `npm run benchmark:baseline`
- `npm run docs:sync`
- `npm run docs:check`

Naechster-Chat-Prompt:

`Markiere Phase 13.5 als erledigt, aktualisiere docs/Umsetzungsplan.md auf abgeschlossen und erstelle einen kompakten Abschlussbericht mit Restrisiken und naechsten Optionen.`

---

## Prompt-Vorlage fuer jede abgeschlossene Teilphase

`Markiere Phase 13.X als erledigt und starte Phase 13.Y aus docs/Feature_Modularisierung_Phase13_UI_Sync_Wartbarkeit.md. Fuehre danach die Verifikation gemaess Phase 13.Y aus und gib den naechsten Prompt aus.`
