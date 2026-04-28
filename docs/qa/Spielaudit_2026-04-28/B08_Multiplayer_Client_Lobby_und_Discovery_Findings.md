# B08 Multiplayer-Client, Lobby und Discovery - Findings

Stand: 2026-04-29
Status: offen
Planquelle: [README.md](./README.md)

## Scope

- Initial geprueft: `src/network/LANMatchLobby.js`
- Initial geprueft: `src/network/OnlineMatchLobby.js`
- Initial geprueft: `src/network/LANSessionAdapter.js`
- Initial geprueft: `src/network/OnlineSessionAdapter.js`
- Initial geprueft: `src/application/session-runtime/NetworkLobbyService.js`
- Initial geprueft: `src/application/session-runtime/NetworkLobbyDiscoveryResolver.js`
- Initial geprueft: `src/application/session-runtime/OnlineLobbyService.js`
- Initial geprueft: `src/ui/menu/testing/MenuMultiplayerPanel.js`
- Zweiter Pass geprueft: `src/application/session-runtime/MenuLobbyServiceFactory.js`
- Zweiter Pass geprueft: `src/application/session-runtime/NetworkLobbyServiceSupport.js`
- Zweiter Pass geprueft: `src/network/DataChannelManager.js`
- Zweiter Pass geprueft: `src/network/LatencyMonitor.js`
- Zweiter Pass geprueft: `src/composition/core-ui/LanMenuMultiplayerBridge.js`

## Prueffokus

- Lobby-, Session- und Discovery-Vertraege
- Polling, Inflight-Guards und Lifecycle-Abbrueche
- Clientseitige Host-/Join-/Ready-Logik
- UI-Sicherheit, Rendering und Diagnosepfade

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P34 | hoch | LAN-Polling laeuft ohne Inflight-/Abort-Guard weiter | `src/network/LANMatchLobby.js`, `src/network/LANSessionAdapter.js` | `LANMatchLobby._startPolling()` nutzt `setInterval(async ...)` ohne Guard (`158-170`); `LANSessionAdapter._startPolling()` pollt `/lobby/status` genauso (`235-255`) | Polling auf serialisierte Schleife oder Inflight-Guard plus Abort/Cleanup umstellen | offen |
| P36 | hoch | Discovery-Hostkarten rendern untrusted Netzwerkdaten per `innerHTML` | `src/ui/menu/testing/MenuMultiplayerPanel.js` | `updateHostList()` setzt `card.innerHTML` mit `host.hostName`, `host.ip`, `host.port` und `host.lobbyCode` direkt aus Discovery-Daten (`267-280`) | Hostkarten ausschliesslich ueber `createElement`/`textContent` zusammensetzen und Discovery-Payload strikt normalisieren | offen |
| P49 | hoch | LAN-Ready-State bleibt nach erstem `ready=true` sticky | `src/network/LANMatchLobby.js` | `_syncWithServerStatus()` merged `ready` ueber `player?.ready === true || existing?.ready === true` (`104-116`); danach koennen `invalidateReadyForAll()` oder explizites Unready serverseitig rot sein, waehrend der Client lokal weiter gruen bleibt | Ready-State autoritativ aus dem letzten Serverstatus ableiten und alte Clientwerte nur fuer rein lokale Metadaten beibehalten | offen |
| P50 | hoch | Online-Lobby meldet Ready/Matchstart als Erfolg ohne bestaetigte Zustellung | `src/network/OnlineMatchLobby.js`, `src/application/session-runtime/NetworkLobbyService.js` | `OnlineMatchLobby.setReady()` sendet fire-and-forget (`376-381`), `startMatch()` liefert synthetisch `{ pendingMatchStart }` zurueck (`389-398`); `NetworkLobbyService.toggleReady()` und `requestMatchStart()` geben trotzdem `ok: true` zurueck (`356-383`, `423-456`) | ACK-/NACK-Vertrag fuer Ready und Matchstart einfuehren; Service-Erfolg erst nach server- bzw. socketbestaetigter Zustellung melden | offen |
| P51 | mittel | Etablierte Online-Socket-Closes propagieren nicht in den Menu-Layer | `src/network/OnlineMatchLobby.js`, `src/application/session-runtime/NetworkLobbyService.js` | `_makeConnectAttempt()` nutzt `onclose` nur fuer den Connect-Promise (`95-127`); nach erfolgreichem Join/Create gibt es keinen dauerhaften Close-Handler mehr, und `_emit('closed')` passiert nur in `leave()` (`364-373`); `NetworkLobbyService` wartet aber auf dieses Event (`142-145`) | Dauerhaften Disconnect-/Closed-Pfad nach erfolgreichem Connect binden und SessionState/Menu-Status bei remote close aktiv auf `closed` umstellen | offen |
| P52 | mittel | LAN-Status-Polling verschluckt Signaling-Ausfaelle und behaelt stale SessionState | `src/network/LANMatchLobby.js` | `_startPolling()` loggt Poll-Fehler nur per `logger.debug` (`162-168`); ein `closed`/Disconnect-Uebergang existiert nur in `leave()` (`173-205`) | Bei wiederholtem Polling-Fehler oder explizitem 4xx/5xx einen sichtbaren Disconnect-/Recovery-Zustand emittieren statt die letzte gruen wirkende Session weiterzufuehren | offen |

## Detailnotizen

### P34 - LAN-Polling ohne Inflight-/Abort-Guard

- Problem: Sowohl Lobby- als auch Session-Client koennen neue HTTP-Polls starten, obwohl der vorherige Request noch laeuft.
- Risiko: Bei langsamen oder haengenden Netzpfaden entstehen ueberlappende Status-Requests, veraltete Ruecklaeufer und unnoetiger Backlog.
- Evidenz: `src/network/LANMatchLobby.js:158-170`; `src/network/LANSessionAdapter.js:235-255`.
- Empfehlung: Polling als serielle async-Schleife mit `await` und explizitem Stop-Token/AbortController modellieren.

### P36 - Discovery-UI injiziert Hostdaten in HTML

- Problem: Discovery-Daten aus dem Netzwerk werden fuer Hostkarten direkt in HTML-Strings interpoliert.
- Risiko: Ein manipulierter Broadcast kann Markup oder Script-geeignete Payloads in die Lobby-Auswahl einschleusen.
- Evidenz: `src/ui/menu/testing/MenuMultiplayerPanel.js:267-280`.
- Empfehlung: Alle Hostkarten ueber DOM-Knoten und `textContent` rendern; niemals Netzwerknamen oder Codes in `innerHTML` interpolieren.

### P49 - Sticky Ready-State im LAN-Client

- Problem: Der Merge bevorzugt einmal beobachtete `ready=true`-Werte selbst dann weiter, wenn der Server sie spaeter invalidiert.
- Risiko: `allReady` und `canStart` koennen im Menu gruen bleiben, obwohl der Host oder ein Spieler bereits wieder unready ist.
- Evidenz: `src/network/LANMatchLobby.js:104-116` in Kombination mit `src/network/LANMatchLobby.js:228-239`.
- Empfehlung: Member-Ready aus dem letzten Serverpayload ableiten; alte Sessiondaten nur fuer stabile Felder wie `joinedAt` oder `actorId` wiederverwenden.

### P50 - Fire-and-forget wird als erfolgreicher Mutationsabschluss gemeldet

- Problem: Online-Mutationen geben Erfolg zurueck, obwohl nur ein lokaler WebSocket-Send versucht wurde.
- Risiko: Menu- und Runtime-State koennen annehmen, Ready oder Matchstart seien serverseitig verarbeitet, obwohl der Socket bereits weg oder die Nachricht nie angekommen ist.
- Evidenz: `src/network/OnlineMatchLobby.js:357-398`; `src/application/session-runtime/NetworkLobbyService.js:356-383`; `src/application/session-runtime/NetworkLobbyService.js:423-456`.
- Empfehlung: Mutationserfolg an serverseitige ACK-Events koppeln und fehlende Zustellung als expliziten Fehler- oder Retry-Zustand sichtbar machen.

### P51 - Remote Socket-Close bleibt fuer den Menu-Layer unsichtbar

- Problem: Nach erfolgreichem Connect gibt es im Lobby-Client keinen persistenten `onclose`-Pfad, der den SessionState aktiv in einen Disconnect-Zustand ueberfuehrt.
- Risiko: Eine Lobby kann joined aussehen, obwohl das Signaling laengst geschlossen wurde und weitere Mutationen nur noch lokal verpuffen.
- Evidenz: `src/network/OnlineMatchLobby.js:95-127`; `src/network/OnlineMatchLobby.js:364-373`; `src/application/session-runtime/NetworkLobbyService.js:142-145`.
- Empfehlung: Nach erfolgreichem Join/Create einen dauerhaften Close-Handler registrieren, der `closed` oder einen dedizierten Disconnect-Event emittiert und die Service-Schicht synchron nachzieht.

### P52 - LAN-Client behaelt stale Session trotz Polling-Ausfall

- Problem: Polling-Fehler werden im LAN-Lobby-Client nur geloggt und loesen keinen sichtbaren Zustandswechsel aus.
- Risiko: Hostverlust oder Signaling-Ausfall werden fuer den Spieler erst sehr spaet oder gar nicht erkennbar, waehrend die UI mit alten Member-/Ready-Daten weiterarbeitet.
- Evidenz: `src/network/LANMatchLobby.js:162-168`; `src/network/LANMatchLobby.js:173-205`.
- Empfehlung: Fehlerbudget fuer Polling einfuehren und danach auf `closed`, `disconnected` oder einen expliziten Recovery-/Reconnect-State wechseln.

## Zweitpass-Abgleich

- `MenuLobbyServiceFactory.js` fuegt keine neue Eigenlogik hinzu; die Datei delegiert nur auf LAN-, Online- oder Storage-Service und bestaetigt damit die Relevanz der bereits dokumentierten Transport-Funde.
- `NetworkLobbyServiceSupport.js` normalisiert Discovery- und Sessiondaten, haertet aber Hostnamen nicht ueber die bestehende String-Normalisierung hinaus; damit bleibt `P36` primaer ein Renderpfad-Problem und kein separater Support-Layer-Fund.
- `DataChannelManager.js` und `LatencyMonitor.js` enthalten im B08-Kontext keine neue unabhaengige Lobby-/Discovery-Schwachstelle; sie liefern Backpressure-, Close- und Ping-Signale, erklaeren aber nicht die fehlende Menu-Propagation aus `P51` oder die LAN-Stale-State-Probleme aus `P52`.
- `LanMenuMultiplayerBridge.js` ist nur ein Re-Export und fuegt keine eigene Auditoberflaeche hinzu.

## Offene Fragen

- Soll `NetworkLobbyService` Disconnects produktseitig ueber das bestehende `closed`-Event modellieren, oder braucht B08/B09 einen eigenen `signalingDisconnected`-Vertrag fuer Lobby-UIs?
- Gehoert die Hostnamen-/Discovery-Normalisierung in `NetworkLobbyDiscoveryResolver.js`, damit spaetere UIs nicht erneut untrusted Felder direkt rendern?
- Sollen die bereits im Backlog verankerten V99-Pakete die komplette B08-Lobby-Wahrhaftigkeit abdecken, oder bleibt fuer die UI-Sicherheit (`P36`) ein separater Hardening-Schnitt sinnvoll?

## Folgearbeit

- B08-Funde mit dem jetzt vollstaendig geprueften Blockscope gegen `V99` und `V102` abgleichen und fehlende Client-Only-Schritte markieren; `P34`, `P49`, `P50`, `P51` und `P52` bleiben dabei die primaeren Connectivity-/Truthfulness-Pakete.
- `P36` als UI-Sicherheitsfix separat gegen `V99`/`V102` abgrenzen, damit das HTML-Rendering nicht hinter reiner Lobby-Connectivity-Arbeit verschwindet.
