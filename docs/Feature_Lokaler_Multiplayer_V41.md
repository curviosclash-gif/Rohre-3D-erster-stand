# Feature: Lokaler Multiplayer Modus (V41)

Stand: 2026-03-16
Status: Geplant
Owner: Single-Agent Planung

## Ziel

Einen klaren lokalen Multiplayer-Modus fuer zwei Spieler auf einem Geraet planen, der die bereits vorhandene 2P-/Splitscreen-Runtime produktreif nutzt und fuer Spieler eindeutig vom offenen Netzwerk-/Lobby-Stub trennt.

Der erste Release soll:

- zwei lokale Spieler auf einem Geraet stabil durch Matchstart, Runde, Pause und Rueckkehr ins Menue fuehren
- vorhandene `splitscreen`-Technik weiterverwenden statt eine zweite Runtime einzufuehren
- Eingabegeraete, Flugzeugwahl und Startbereitschaft vor dem Match explizit pruefen
- mindestens `keyboard + keyboard` sicher tragen; Gamepad-Support additiv und klar gated aufsetzen
- `N1 Multiplayer-Runtime statt UI-Stub` nicht vorwegnehmen, sondern sauber davon abgrenzen

Nicht Bestandteil dieses Plans: echte Netzwerksessions, Host/Join ueber mehrere Browser oder Geraete, Netcode-/Rollback-Logik und BroadcastChannel-/localStorage-Lobby-Sync als Produktfeature. Das bleibt weiter im Backlog `N1`.

## Ausgangslage

- `splitscreen` ist intern bereits bis in `SettingsManager`, `RuntimeConfig`, `MatchSessionFactory`, `MatchUiStateOps`, `Renderer` und HUD/Crosshair verdrahtet.
- Default-Controls fuer `PLAYER_2` existieren bereits; lokaler 2P-Start ist technisch naeher an einem Produkt als der Netzwerkpfad.
- Der aktuelle `multiplayer`-Pfad ist ein Lobby-/Ready-Stub mit `MenuMultiplayerBridge` und `BroadcastChannel`-Sync ueber mehrere Tabs.
- Spielerseitig ist die Trennung unklar: `Splitscreen` beschreibt die Kameraform, nicht den Produktnutzen; `Multiplayer` klingt produktiv, ist aber noch kein echter Online-Modus.
- Gamepad wird bisher nur fuer Menue-Navigation gepollt; fuer Gameplay fehlt eine belastbare lokale Zuweisungsschicht.

## Betroffene Dateien (geplant)

- `index.html`
- `style.css`
- `src/ui/menu/MenuTextCatalog.js`
- `src/ui/menu/MenuSchema.js`
- `src/ui/menu/MenuStateContracts.js`
- `src/ui/UIManager.js`
- `src/ui/UIStartSyncController.js`
- `src/ui/MatchUiStateOps.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/PauseOverlayController.js`
- `src/core/GameBootstrap.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/RuntimeConfig.js`
- `src/core/InputManager.js`
- `src/core/runtime/MatchStartValidationService.js`
- `src/state/MatchSessionFactory.js`
- optional neu: `src/core/input/GamepadGameplayInputService.js` oder ein gleichwertiger lokaler Device-Adapter
- optional neu: `src/ui/menu/LocalMultiplayerStartSetup.js` oder ein gleichwertiger Session-Helper fuer lokale Slot-/Ready-Logik
- `tests/core.spec.js`
- `tests/stress.spec.js`
- `tests/helpers.js`
- `docs/Umsetzungsplan.md`

## Architektur-Check

- Wiederverwendung vor Neubau: Der vorhandene `splitscreen`-Pfad bleibt die technische Basis des lokalen Multiplayer-MVP. Intern sollte zunaechst `sessionType='splitscreen'` erhalten bleiben, um Draft-Persistenz, Runtime- und Testvertraege nicht unnoetig aufzubrechen.
- Produktsprache und Technik werden entkoppelt: Nach aussen heisst der Modus `Lokaler Multiplayer`, intern darf er in Phase 1 weiter auf `splitscreen` mappen.
- Keine Vermischung mit Online-Stub: Lokale Slot-/Ready-/Device-Logik gehoert nicht in `MenuMultiplayerBridge` oder `MenuRuntimeMultiplayerService`, sondern in einen dedizierten lokalen Session-/Setup-Pfad.
- Die schmale Integrationsnaht verlaeuft ueber `SettingsManager`/`MenuStateContracts`, `MatchStartValidationService`, `InputManager`, `RuntimeConfig`, `MatchSessionFactory` und `MatchFlowUiController`.
- Release-Fallback: Wenn Gamepad-Unterstuetzung in der Umsetzungsphase instabil bleibt, muss `keyboard + keyboard` als belastbarer lokaler Mindestumfang alleine releasefaehig sein.
- Risiko-Einstufung: **mittel**. Der Match-Kern fuer 2P ist vorhanden, aber Menue-Semantik, Device-Zuweisung, Pause-/Rematch-Regeln und Regressionstests greifen ueber V27- und V28-Pfade hinweg.

Datei-Ownership-Check:

- `src/ui/**` und `src/ui/menu/**` kreuzen V27.
- `src/core/**` kreuzt V28.
- `src/state/**` liegt ebenfalls in einem parallelen Ownership-Bereich.
- Deshalb bleibt der Plan zunaechst als Intake-Eintrag geparkt; spaetere Umsetzung nur additiv mit Conflict-Log, sobald der Scope aktiv gezogen wird.

Dokumentationswirkung:

- `docs/Feature_Lokaler_Multiplayer_V41.md`
- `docs/Umsetzungsplan.md`
- spaeter zusaetzlich Testergebnis-/Playtest-Dokumente fuer lokale Eingabekombinationen und Matchfluss

## Erfolgsmetriken

- Ebene 1 kommuniziert eindeutig den Unterschied zwischen lokalem 2P und dem spaeteren Netzwerk-/Lobby-Pfad.
- Der lokale Matchstart scheitert frueh und fokussiert korrekt, wenn P2-Setup, Device-Zuweisung oder Ready-State fehlen.
- Matchstart, Pause, Round-Restart, Rematch und Return-to-Menu laufen fuer zwei lokale Spieler ohne HUD-/State-Leaks.
- Mindestens ein belastbarer lokaler Eingabepfad (`keyboard + keyboard`) ist gruener Default; weitere Device-Kombinationen sind explizit verifiziert oder sauber deaktiviert.
- Die Online-/Lobby-Baustelle `N1` bleibt funktional unabhaengig und wird durch den lokalen Modus nicht schwerer wartbar.

## Phasenplan

- [ ] 41.0 Scope-Freeze und Produktvertrag
  - [ ] 41.0.1 Iststand von `single`, `multiplayer` und `splitscreen` in Menue, Validierung, Input und Runtime dokumentieren; offene UX-Verwechslungen explizit festhalten
  - [ ] 41.0.2 Release-Vertrag definieren: lokaler MVP, Mindest-Input-Matrix (`keyboard + keyboard`), Abgrenzung zu `N1` und klare Nicht-Ziele einfrieren

- [ ] 41.1 Menue-Semantik und lokales Start-Setup
  - [ ] 41.1.1 Nutzerseitige Sprache von `Splitscreen` auf `Lokaler Multiplayer` heben und den vorhandenen Lobby-Pfad sichtbar als spaeteren Netzwerk-/Join-Flow markieren, ohne bestehende IDs/Contracts unnoetig zu brechen
  - [ ] 41.1.2 In `submenu-game` einen lokalen Start-Block fuer Spieler-Slots, Device-Hinweise und lokale Bereitschaft aufbauen; bestehende Summary-/Focus-/Hint-Mechaniken wiederverwenden

- [ ] 41.2 Lokaler Session-State und Startvalidierung
  - [ ] 41.2.1 Session-Drafts und `localSettings` um lokale Slot-/Ready-/Input-Zustandsdaten erweitern, ohne die bestehende `splitscreen`-Kompatibilitaet zu verlieren
  - [ ] 41.2.2 `MatchStartValidationService` und UI-Fokuspfade auf P2-Flugzeug, kollidierende Bindings, fehlende Devices und lokale Default-Fairness (z. B. Bots oder Loadouts) ausweiten

- [ ] 41.3 Input- und Device-Zuordnung
  - [ ] 41.3.1 Dedizierten lokalen Input-Zuweisungspfad einfuehren: `keyboard + keyboard` als Pflichtpfad, `keyboard + gamepad` und `gamepad + gamepad` additiv hinter Faehigkeits- und Stabilitaets-Gates
  - [ ] 41.3.2 Hot-plug, Disconnect, Konfliktfeedback sowie Pause-/Rematch-Berechtigungen fuer lokale Spieler in Menue und Pause-Overlay konsistent modellieren

- [ ] 41.4 Runtime-, HUD- und Matchfluss-Haertung
  - [ ] 41.4.1 Start/Reset/Return rund um `numHumans=2`, Split-HUD, Kamera, Crosshair und Round-Transition deterministisch haerten
  - [ ] 41.4.2 Lokale Nach-Match-Aktionen (`rematch`, Seiten oder Loadouts tauschen, zurueck ins Menue) sauber in Lifecycle und Cleanup verdrahten

- [ ] 41.5 Tests, Playtests und Rollout-Gates
  - [ ] 41.5.1 Core-/Stress-Regressionen fuer lokale Session-Wahl, Setup-Validierung, Input-Zuweisung, Matchstart, Pause und Rueckkehr ins Menue aufbauen oder erweitern
  - [ ] 41.5.2 Browser-Spotchecks fuer den lokalen MVP und jede aktivierte Device-Kombination mit Screenshot-/State-/Console-Artefakten festhalten

- [ ] 41.9 Abschluss-Gate
  - [ ] 41.9.1 `npm run test:core`, `npm run test:stress`, `npm run smoke:roundstate` und `npm run build` fuer den lokalen Multiplayer-Scope gruen bestaetigen
  - [ ] 41.9.2 `npm run docs:sync`, `npm run docs:check`, Doku-Freeze und Backlog-Abgrenzung zu `N1` final bestaetigen
