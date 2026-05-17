# Feature: Desktop Multiplayer Signaling-, LAN- und Connectivity-Hardening (V99)

Stand: 2026-04-28
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V99.md`

## Ziel

Die nach `V64` verbleibenden Laufzeitluecken im Desktop-Multiplayer-Failure-Handling gezielt schliessen:

- Online- und LAN-Signaling-Fehler sollen produktiv als strukturierte, unterscheidbare Fehlerpfade ankommen statt als generische Socket-Abbrueche oder stille Ignore-Faelle.
- Disconnect-, Resume- und Host-finalized-Pfade sollen denselben robusten Lifecycle-Vertrag nutzen, inklusive asynchroner Fehlerbehandlung.
- Connectivity-Profile aus `V64 64.7.2` sollen nicht nur Test-/Doku-Vertrag bleiben, sondern in Validation, UI-Hinweisen und Diagnosepfaden produktiv genutzt werden.
- LAN-Lobby-Pfade sollen Kapazitaet, Host-Berechtigung, Polling-Stabilitaet und untrusted UI-Daten konsistent haerten.
- LAN- und Online-Lobby-Status muessen den tatsaechlichen Delivery-/Disconnect-Zustand widerspiegeln; Ready-, Matchstart- und Join-Zustaende duerfen nicht optimistisch gruen bleiben, wenn der Transport bereits weg ist.
- Neue Haertung soll keine alten `runtimeFacade`-/Global-Bypaesse reaktivieren und den `V92`-Ownership-Schnitt respektieren.

## Desktop-first Scope

- Desktop-App ist primaeres Ziel.
- Browser-/Demo-Auswirkungen bleiben auf Shared Contracts, vorhandene Surface-Resolver und degradierte Fehlermeldungen begrenzt.
- Kein Browser-first-Paritaetsausbau.

## Nicht-Ziel

- Kein neuer Multiplayer-Feature-Block fuer Matchmaking, Discovery-UX oder Transportwechsel.
- Kein zweites Connectivity- oder Signaling-System neben `OnlineSignalingSupport`, `OnlineMatchLobby` und `OnlineSessionAdapter`.
- Kein grossflaechiger Recorder-, Settings-Studio- oder Surface-Policy-Refactor in diesem Block.

## Betroffene Dateien und Bereiche

- `src/network/OnlineSignalingSupport.js`
- `src/network/OnlineMatchLobby.js`
- `src/network/OnlineSessionAdapter.js`
- `src/network/LANMatchLobby.js`
- `src/network/LANSessionAdapter.js`
- `src/network/SessionAdapterBase.js`
- `server/lan-signaling.js`
- `src/application/session-runtime/StorageLobbyService.js`
- `src/application/session-runtime/NetworkLobbyServiceSupport.js`
- `src/core/runtime/MultiplayerMatchLifecycleKernel.js`
- `src/core/runtime/RuntimeSessionLifecycleService.js`
- `src/shared/contracts/DesktopMultiplayerRoleContract.js`
- `src/shared/contracts/RuntimeSessionContract.js`
- `src/core/runtime/MatchStartValidationService.js`
- `src/core/runtime/MenuRuntimeMultiplayerService.js`
- `src/shared/contracts/PlatformSurfacePolicyOps.js`
- `src/ui/menu/testing/MenuMultiplayerPanel.js`
- `tests/transport-verification-matrix.contract.test.mjs`
- `tests/desktop-multiinstance-smoke.contract.test.mjs`
- `tests/platform-capabilities.contract.test.mjs`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 Online-Signaling unterscheidet produktiv zwischen Endpoint-/Payload-/Timeout-/Network-unavailable-Fehlern; kaputte Payloads werden nicht mehr still geschluckt.
- [ ] DoD.2 `host_disconnected`, `host_match_finalized` und vergleichbare Lifecycle-Trigger behandeln auch asynchrone Fehler sichtbar und ohne stilles Promise-Leak.
- [ ] DoD.3 `resolveDesktopConnectivityProfile()` oder derselbe kanonische Vertrag wird von produktiven Validation-/UI-Pfaden konsumiert, nicht nur von Tests.
- [ ] DoD.4 Disconnect-/Resume-/Close-Pfade respektieren den `V92`-Ownership-Schnitt; keine neuen Legacy-Reads oder Global-Bypaesse entstehen.
- [ ] DoD.5 Contract-/Smoketests decken die neuen Failure-Klassen und Guard-Pfade ab oder offene externe Blocker sind blockerfest dokumentiert.
- [ ] DoD.6 Host-Leave- und Session-Abbruch-Pfade im `StorageLobbyService` sprechen denselben Failure-/Lifecycle-Vertrag wie Lobby und SessionAdapter; keine stillen Sonderpfade bleiben zurueck.
- [ ] DoD.7 LAN-Join respektiert `maxPlayers`; mutierende LAN-Endpoints sind host-gebunden oder gleichwertig gegen Fremdtrigger gehaertet.
- [ ] DoD.8 LAN-Polling in Lobby/Session ist timeout- und overlap-sicher (kein ungebremster async-Interval-Backlog).
- [ ] DoD.9 Discovery-Hostdaten werden im UI ohne untrusted `innerHTML` dargestellt.
- [ ] DoD.10 Online-Lobby-Mutationen (`ready`, `invalidate-ready`, `match-start`) melden Erfolg nur noch bei verifizierbarer Zustellung/ACK oder liefern explizit einen Fehlerpfad.
- [ ] DoD.11 LAN-/Online-Lobby-Status faellt bei Signaling-Verlust oder Server-Disconnect sichtbar auf `disconnected`/`closed` zurueck; Start-/Ready-Gates bleiben nicht auf stale Erfolgszustand stehen.

## Review-Abgleich 2026-04-28

- Bereits im Draft enthalten:
  - `P32` -> `99.4.1`
  - `P33` -> `99.4.1`
  - `P34` -> `99.4.3`
  - `P35` -> `99.4.3`
  - `P36` -> `99.4.4`
- Neues Lobby-Truthfulness-/Disconnect-Delta aus dem Review:
  - Finding 1 / `P49` -> `99.4.2`
  - Finding 2 / `P50` -> `99.2.2`
  - Finding 3 / `P51` -> `99.2.3`
  - Finding 4 / `P52` -> `99.4.2`

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V99`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V99.md`
- hard dependencies: `V64.99`, `V92.99`
- soft dependencies: `V77.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Empfohlene Zuordnung angrenzender Fixes

Nicht alles braucht einen neuen Block. Fuer die naechsten Schritte ist diese Zuordnung empfohlen:

- In `V99` aufnehmen:
  - produktive Verdrahtung von `signaling_network_unavailable` / `signaling_payload_invalid`
  - asynchron robuste Behandlung in `MultiplayerMatchLifecycleKernel`
  - produktive Nutzung des Connectivity-Profils in Validation-/UI-Pfaden
- In `V98` mitnehmen, nicht als eigener Block:
  - Modularisierung von `PlatformSurfacePolicyOps` (Daten, Resolver, Copy trennen)
  - saubere Trennung von Settings-Studio-Sprachpraeferenz vs. produktivem Override-Draft
- In `V75` mitnehmen, nicht als eigener Block:
  - `P29` Null-Guard und Warning-Akkumulation in `DownloadService`
- Im offenen P-Backlog belassen:
  - `P12` Material-Lifecycle an `CheckpointRingMeshFactory`
  - Parcours-Hotpath-Optimierungen (`ParcoursMinimapRenderer`, `CheckpointRingRuntime`)
  - strengere Branch-Validierung in `ParcoursProgressUtils`
  - eigene Versionslinie fuer Ghost-/Leaderboard-Daten erst bei echtem Migrationsdruck

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 99.1 Failure-Taxonomie und Ist-Snapshot
status: open
goal: Signaling-, Connectivity- und Lifecycle-Fehler produktiv sauber schneiden
output: Verbindliche Fehlerklassen plus Zielpfad je Failure-Typ

- [ ] 99.1.1 Alle relevanten Online-Failure-Pfade (`invalid_url`, `timeout`, `socket_closed`, `payload_invalid`, `network_unavailable`) als Ist-/Soll-Matrix dokumentieren.
- [ ] 99.1.2 Zielverantwortung fuer Lobby, SessionAdapter, Lifecycle-Kern und UI-/Validation-Consumer festlegen, ohne neue Parallelpfade einzufuehren.

### 99.2 Signaling-Fehler produktiv verdrahten
status: open
goal: Strukturierte Fehler nicht nur definieren, sondern im Laufzeitpfad ausliefern
output: Robuste Online-Signaling-Fehlerklasse in Lobby und SessionAdapter

- [ ] 99.2.1 `OnlineMatchLobby` und `OnlineSessionAdapter` auf explizite Payload-/Parse-Fehlerbehandlung heben; kaputte Signaling-Nachrichten werden nicht mehr still ignoriert oder roh durchgereicht.
- [ ] 99.2.2 `OnlineMatchLobby`-Mutationen (`setReady`, `invalidateReadyForAll`, `startMatch`) nur noch bei offenem Socket plus verifizierbarer Zustellung/ACK als Erfolg aufloesen; geschlossene oder bereits verlorene Sockets muessen explizit fehlschlagen.
- [ ] 99.2.3 Etablierte Socket-Close-/Error-Pfade nach erfolgreichem Connect in `OnlineMatchLobby`/`NetworkLobbyService` sichtbar als `closed`/Disconnect-/Status-Event propagieren; die Menu-Layer darf keinen joined-Scheinzustand behalten.

### 99.3 Lifecycle-Kern async robust machen
status: open
goal: Disconnect- und Finalize-Signale ohne stille Promise-Fehler behandeln
output: Sichtbare, deduplizierte Return-to-Menu-Failure-Pfade

- [ ] 99.3.1 `MultiplayerMatchLifecycleKernel` so nachschaerfen, dass `returnToMenu()`-Promises beobachtet, Fehler geloggt und doppelte Trigger sauber unterdrueckt werden.
- [ ] 99.3.2 `RuntimeSessionLifecycleService`, `StorageLobbyService` und angrenzende Session-Adapter gegen Disconnect-/Finalize-/Host-Leave-Rennen rechecken und nur noetige Guardrails nachziehen.

### 99.4 LAN-Hardening fuer Kapazitaet, Endpoint-Rollen und Polling
status: open
goal: LAN-Pfade gegen Kapazitaetsdrift, Fremdtrigger und Polling-Backlog absichern
output: Stabilere LAN-Lobby-/Session-Pfade mit klaren Rollen- und Timeout-Guards

- [ ] 99.4.1 `server/lan-signaling.js`: `LOBBY_JOIN` strikt auf `maxPlayers` begrenzen; mutierende Endpoints (`ready`, `invalidate-ready`, `match-start`, `leave`) host-/player-spezifisch haerten.
- [ ] 99.4.2 `src/network/LANMatchLobby.js`: Session-State aus dem Serverstatus wahrheitsgetreu ableiten; Ready/Unready/Invalidate duerfen nicht sticky bleiben und Signaling-Verlust muss den Lobby-Status sichtbar auf disconnected/closed kippen.
- [ ] 99.4.3 `src/network/LANMatchLobby.js` und `src/network/LANSessionAdapter.js`: Polling auf overlap-sichere Schleifen mit Timeout/Abort und sauberer Stop-/Host-Leave-Logik umstellen; kein semantischer Reset ueber `LOBBY_CREATE` als impliziter Leave-Ersatz.
- [ ] 99.4.4 `src/ui/menu/testing/MenuMultiplayerPanel.js`: Discovery-Karten ohne untrusted `innerHTML` rendern (textContent/Node-Aufbau, kein HTML-Injection-Pfad).

### 99.5 Connectivity-Profil in Produktpfade ziehen
status: open
goal: `V64 64.7.2` als produktiven Read-Vertrag nutzen
output: Validation-/UI-Hinweise lesen denselben Connectivity-Stand wie die Tests

- [ ] 99.5.1 Validation- oder Menu-Pfade fuer LAN/Online auf `resolveDesktopConnectivityProfile()` oder denselben kanonischen Vertrag umstellen.
- [ ] 99.5.2 Nutzerhinweise fuer kein Netz, nur LAN und echtes Internet klar auf denselben Diagnosevertrag heben, ohne Browser-/Demo-Grenzen aus `V77` zu verletzen.

### 99.6 Contract- und Guard-Haertung
status: open
goal: Failure-Klassen und Ownership gegen Rueckfall absichern
output: Kleine Tests plus Doku-/Guard-Spiegelung

- [ ] 99.6.1 Contract-Tests fuer Payload-Parse-Failures, Network-unavailable, Lifecycle-Reject, Host-Leave, LAN-`maxPlayers`-Gates und Polling-Timeout-Verhalten ergaenzen.
- [ ] 99.6.2 Referenzdoku auf denselben Failure- und Ownership-Leseweg spiegeln; keine neuen Legacy-Adapter ausser blockerfest dokumentierten Restnischen zulassen.

### 99.99 Abschluss-Gate
status: open
goal: Multiplayer-Failure-Hardening gruensicher abschliessen
output: Reproduzierbare Evidence fuer Laufzeit-, Doku- und Guard-Pfade

- [ ] 99.99.1 Relevante Contract-/Smoketests fuer Signaling, Connectivity und Lifecycle sind gruensicher oder blockerfest dokumentiert.
- [ ] 99.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.
- [ ] 99.99.3 Der `V92`-Ratchet bleibt gewahrt; keine neuen Runtime- oder Global-Backdoors sind hinzugekommen.

## Risiken

- R1 | hoch | Failure-Hardening erzeugt neue Disconnect-/Resume-Regressionspfade, wenn Lobby und SessionAdapter nicht denselben Diagnosevertrag sprechen.
- R2 | hoch | Asynchrone Lifecycle-Nachschaerfung loest Doppel-Finalisierung oder stuck `finalizing` aus, wenn Guard-Conditions nicht sauber deduplizieren.
- R3 | mittel | Connectivity-Hinweise driften von `V77`-Surface-Regeln weg, wenn LAN-/Online-/Demo-Texte parallel gepflegt werden.
- R4 | mittel | Testabdeckung bleibt wegen externer Netzwerk-/Playwright-Blocker hinter dem Architekturbedarf zurueck und braucht blockerfeste Dokumentation.
