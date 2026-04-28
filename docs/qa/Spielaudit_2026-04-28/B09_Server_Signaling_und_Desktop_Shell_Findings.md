# B09 Server, Signaling und Desktop-Shell - Findings

Stand: 2026-04-29
Status: in Arbeit
Planquelle: [README.md](./README.md)

## Scope

- `server/lan-signaling.js` (voller HTTP-Mutationspfad inkl. Discovery-Ausgabe geprueft)
- `server/signaling-server.js` (Stichprobe auf Host-/Join-/Ready-Gates)
- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/session-data-runtime.cjs`
- `electron/static-server.cjs`
- `electron/tuning-ipc.cjs`
- `src/platform/electron/ElectronPlatformBridge.js`
- `src/platform/electron/ElectronShellLifecycleBridge.js`

## Prueffokus

- IPC-, Host-, Discovery- und Save-Capabilities
- Sync-/Async-Grenzen zwischen Renderer und Shell
- LAN-Signaling-Sicherheit und Request-Validierung
- Plattformadapter, Browser-Demo-Degradation und Shell-Lifecycle

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B09-F01 | hoch | LAN-Kapazitaetsvertrag wird serverseitig nicht durchgesetzt | `server/lan-signaling.js` | `LOBBY_CREATE` speichert `maxPlayers`, `LOBBY_JOIN` pusht trotzdem bedingungslos, `DISCOVERY_INFO` exportiert wieder nur `DEFAULT_MAX_PLAYERS` | Join serverseitig hart gegen `lobby.maxPlayers` gate'n und Discovery-/Status-Output auf denselben Wahrheitswert ziehen | offen |
| B09-F02 | kritisch | Mutierende LAN-Endpoints vertrauen ungesicherten Caller-Angaben | `server/lan-signaling.js` | `ready`, `leave`, `invalidate-ready`, `match-start`, `offer`, `answer`, `ice` akzeptieren Host-/Player-Identitaet ohne serverseitigen Besitznachweis | Host-/Player-Operationen an issued Session-Identitaet binden und Host-only-Mutationen explizit absichern | offen |
| B09-F03 | hoch | Request-Body-Parser hat weder Size-Limit noch parse-feste Fehlerpfade | `server/lan-signaling.js` | `readBody()` akkumuliert unbegrenzt und faellt bei kaputtem JSON auf `{}` zurueck | Byte-Limit, `413`/`400`-Antworten und Abbruch vor jeder stateful Mutation einfuehren | offen |
| B09-F04 | mittel | Preload blockiert Rendererstart ueber synchrones Defaults-IPC | `electron/preload.cjs`, `electron/main.cjs` | `ipcRenderer.sendSync()` triggert im Main-Prozess einen synchronen `readFileSync()`-Pfad | Snapshot asynchron oder vorinjiziert bereitstellen; `sendSync` aus dem Rendererverbrauchspfad entfernen | offen |

### B09-F01 - LAN-Kapazitaetsvertrag wird serverseitig nicht durchgesetzt

Problem:
`LOBBY_CREATE` uebernimmt ein geclamp'tes `maxPlayers`, aber `POST /lobby/join` fuegt neue Spieler ohne Kapazitaetspruefung hinzu. Gleichzeitig meldet `/discovery/info` immer `DEFAULT_MAX_PLAYERS` statt des echten Lobbywerts.

Risiko:
Clientseitige Anzeige, Discovery und Join-Gates koennen der Serverwahrheit nicht vertrauen. Ueberfuellte Lobbys und falsche Kapazitaetsanzeigen sind damit kein UI-, sondern ein Serververtragsproblem.

Evidenz:
- `server/lan-signaling.js:183-189` speichert den Hostwunsch in `lobby.maxPlayers`.
- `server/lan-signaling.js:204-220` laesst jeden Join ohne `lobby.players.length >= lobby.maxPlayers` durch.
- `server/lan-signaling.js:399-410` exportiert in `DISCOVERY_INFO` wieder `DEFAULT_MAX_PLAYERS`.

Empfehlung:
Join serverseitig auf `lobby.maxPlayers` hart begrenzen und Discovery-/Status-Pfade aus demselben kanonischen Lobbyzustand speisen. Dieser Befund gehoert primaer in den `V99`-Hardening-Scope.

### B09-F02 - Mutierende LAN-Endpoints vertrauen ungesicherten Caller-Angaben

Problem:
Der HTTP-Signaling-Server vertraut bei mutierenden Requests komplett den mitgesendeten IDs. Ein Caller kann `playerId: "host"` setzen, fremde Player-IDs entfernen oder host-only Aktionen ohne Besitznachweis ausloesen.

Risiko:
Jeder Teilnehmer im LAN kann Ready-Zustaende faelschen, Spieler entfernen, Matchstarts triggern oder Signaling-Nachrichten fuer andere Rollen einstellen. Das unterlaeuft sowohl Fairness als auch die gesamte Lobby-Truthfulness.

Evidenz:
- `server/lan-signaling.js:224-240` setzt `hostReady`, sobald im Body `playerId === "host"` steht.
- `server/lan-signaling.js:244-249` entfernt beliebige `playerId`-Eintraege via `LOBBY_LEAVE`.
- `server/lan-signaling.js:252-304` laesst `invalidate-ready` und `match-start` ohne Hostnachweis mutieren.
- `server/lan-signaling.js:307-364` akzeptiert `offer`-, `answer`- und `ice`-Mutationen ebenfalls rein ueber Bodydaten.

Empfehlung:
Mutationen an eine serverseitig ausgegebene Session-Identitaet binden, Host-only-Endpunkte separat absichern und Requests mit fremder oder fehlender Identitaet hart ablehnen. Dieser Befund ist ein Kernpaket fuer `V99`.

### B09-F03 - Request-Body-Parser hat weder Size-Limit noch parse-feste Fehlerpfade

Problem:
`readBody()` sammelt alle Chunks in einen String, ohne Byte-Limit oder Fruehabbruch. Schlaegt `JSON.parse` fehl, liefert die Funktion `{}` zurueck statt einen expliziten Fehlerpfad.

Risiko:
Grosse Bodies koennen Speicher und Event-Loop unnoetig belasten. Kaputte Payloads werden nicht als Clientfehler sichtbar, sondern laufen in Default-Pfade weiter; bei stateful Endpunkten entstehen so stille, schwer diagnostizierbare Mutationen.

Evidenz:
- `server/lan-signaling.js:45-58` zeigt unlimitierte Akkumulation plus `resolve({})` bei Parsefehlern.
- `server/lan-signaling.js:182-199` erstellt mit leerem Body trotzdem eine Lobby mit Defaultwerten.
- `server/lan-signaling.js:288-303` kann mit kaputtem Body trotzdem `pendingMatchStart` aus Defaults erzeugen.

Empfehlung:
Feste Byte-Obergrenze, `413 Payload Too Large`, `400 Invalid JSON` und keine stateful Mutation nach Parse- oder Validierungsfehlern. Das gehoert primaer in `V102` und muss mit `V99`-Endpoint-Hardening abgestimmt werden.

### B09-F04 - Preload blockiert Rendererstart ueber synchrones Defaults-IPC

Problem:
Der Preload liest das Settings-Defaults-Snapshot per `ipcRenderer.sendSync()`. Der Main-Prozess beantwortet dies ueber einen synchronen `readFileSync()`-Pfad inklusive Migrations-/Parse-Logik.

Risiko:
Dateisystemlatenz, Locks oder grosse Override-Dateien blockieren den Rendererstart direkt. Der Pfad ist damit ein Shell-/I/O-Stall-Risiko statt eines normalen asynchronen Read-Modells.

Evidenz:
- `electron/preload.cjs:132-145` nutzt `ipcRenderer.sendSync('settings-defaults:read-override-sync')`.
- `electron/main.cjs:593-625` liest und parst die Datei synchron.
- `electron/main.cjs:849-851` verdrahtet den Sync-IPC direkt auf diesen Pfad.

Empfehlung:
Snapshot beim Boot asynchron vorbereiten oder vom Main-Prozess vorinjiziert cachen, damit Rendererverbrauch und Dateizugriff entkoppelt werden. Dieser Befund gehoert in den `V102`-Scope.

## Offene Fragen

- Soll der Online-WebSocket-Signaling-Server in `server/signaling-server.js` dieselben Payload- und Auth-Haertungen wie der LAN-HTTP-Server erhalten oder bleibt das ein separater Follow-up-Stream?
- Soll das Settings-Defaults-Snapshot kuenftig als einmaliger Bootstrap-Wert injiziert werden oder braucht der Renderer absichtlich einen Live-Read-Pfad fuer spaetere Overrides?

## Folgearbeit

- `V99`: `server/lan-signaling.js` fuer Kapazitaetsgates, Host-/Player-Authentisierung und Truthfulness der LAN-Mutationen uebernehmen.
- `V102`: `readBody()` auf Limit- und Fehlervertraege haerten und den synchronen Defaults-Read aus `preload`/`main` entfernen.
- Nach Intake der Fixes B09 erneut gegen `server/signaling-server.js`, `electron/tuning-ipc.cjs` und die `src/platform/electron/*`-Adapter spiegeln.
