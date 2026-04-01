# Feature Desktop Hauptprodukt Multiplayer Online Offline Kompatibilitaet V64

Stand: 2026-04-01
Status: Neu
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die Desktop-App soll das fuehrende Produkt fuer CurviosClash werden und den verbindlichen Multiplayer-Hauptpfad stellen. Das bedeutet:

- Die Desktop-App hostet und joined echte Multiplayer-Sessions ueber `LAN` und `Online`.
- Offline-Pfade (`single`, `splitscreen`, lokales Desktop-Spiel ohne Internet) bleiben voll funktionsfaehig.
- Spielregeln, Match-Lifecycle, Session-Contracts, Start-Gates und State-Sync bleiben zwischen `offline`, `lan` und `online` kompatibel.
- Browser/Web bleibt zulaessiger Demo-/Client-Pfad, aber nicht mehr die fuehrende Host- oder Architektur-Referenz.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V64`
- Hard dependencies:
  - `V74` ist aktiver Runtime-/Lifecycle-Block und kollidiert mit diesem Scope in `src/core/**`, `src/ui/**`, Kompositionsports und Match-Session-Lifecycle. Die Leitplanken aus `docs/plaene/neu/Feature_Architektur_Runtime_Entkopplung_V74_Refresh_2026-04-01.md` fuer `main.js`, `GameRuntimeFacade`, `GameRuntimePorts` und degradierbare Desktop-Capabilities sind fuer diesen Scope verbindlich.
  - Die archivierten Netzwerk-Baselines aus `V50` und `V52` bleiben verbindliche Vertragsgrundlage fuer SessionAdapter, Lobby-State, `stateUpdate`, `playerLoaded`, Reconnect und Signaling.
- Soft dependencies:
  - `V72` sollte mitgeprueft werden, falls Multiplayer-Haertung Gameplay-Contracts, Item-/Portal-/Gate-Sichtbarkeit oder Mode-spezifische State-Payloads beruehrt.
  - Folgearbeiten fuer Desktop-Recorder, Desktop-Bot-Checkpoint oder App-Shell-Diagnostik koennen anschliessen, sind aber nicht Primarscope dieses Plans.
- Hinweis: Manuelle Uebernahme erforderlich.

## Risikoeinstufung

- Gesamt-Risiko: hoch
- Hauptgrund: Der Scope beruehrt gleichzeitig Desktop-Shell, Menuelayer, Runtime-Session-Mapping, SessionAdapter, Lobbyvertraege, Signaling, Reconnect und Match-Lifecycle. Fehler an einer Stelle koennen Online, LAN und Offline zugleich regressieren.

## Desktop-Leitbild

Der Zielzustand ist ein klarer Desktop-first-Produktentscheid:

- Desktop-App:
  - Primaerer Host fuer `LAN`.
  - Vollwertiger Host und Client fuer `Online`.
  - Vollwertiger Client fuer `LAN`.
  - Vollwertiger lokaler Modus fuer `single` und `splitscreen`.
- Browser/Web:
  - Darf Join-/Demo-/Verifikationspfad bleiben.
  - Host-Faehigkeit bleibt optional und darf hinter Desktop zurueckstehen.
  - Browser-spezifische Stubs oder Legacy-Bridges duerfen nicht mehr das Hauptmodell fuer Multiplayer darstellen.

## Ausgangslage

Bereits vorhandene Grundlagen:

- Die Runtime kennt bereits echte Session-Typen `lan` und `online`.
- Es existieren `LANSessionAdapter`, `OnlineSessionAdapter`, `LANMatchLobby` und `OnlineMatchLobby`.
- Electron besitzt bereits eine App-Shell mit eingebettetem LAN-Signaling, Discovery und Save-Bridge.
- Die Netzwerk-Basisvertraege wurden in frueheren Bloecken bereits fuer Lobby-State, Signaling und `stateUpdate` vereinheitlicht.

Aktuelle Produktluecken:

- Der aktive Menue-Multiplayerfluss nutzt derzeit primar den Storage-Bridge-Pfad und nicht den echten Netzwerktransport.
- Der Storage-Bridge-Pfad ist ein Menue-/Tab-Koordinationspfad und kein echter Runtime-Multiplayer.
- Die Desktop-App hat im App-Build aktuell keinen konfigurierten Online-Signaling-Endpoint als produktionsreife Standardeinstellung.
- Damit ist die Desktop-App bereits staerker als Web fuer LAN, aber noch nicht konsistent genug als einziges Hauptprodukt fuer Multiplayer.

## Architekturprinzipien

- Ein Match darf fachlich nicht wissen, ob es `single`, `splitscreen`, `lan` oder `online` ist, ausser dort, wo Transport, Ownership oder Disconnect-Semantik es zwingend erfordern.
- Matchregeln, Map-Wahl, Fahrzeugwahl, Loadout, HUD-Grundzustaende, Pause-Semantik und Round-Lifecycle muessen transportneutral bleiben.
- `storage-bridge` ist ein Legacy-/Test-/Fallbackpfad, kein produktiver Multiplayer-Hauptpfad.
- `LAN` und `Online` muessen dieselben Session- und Lobbyvertraege nutzen, soweit Transportunterschiede nicht explizit abweichen.
- Desktop-spezifische Vorteile wie eingebetteter LAN-Host, Discovery und native IPC duerfen den Vertragskern nicht duplizieren, sondern nur faehigkeitenbasiert erweitern.

## Kompatibilitaetsmatrix

Der Plan betrachtet vier verbindliche Session-Klassen:

| Session-Klasse | Netzwerk | Host in Desktop | Join in Desktop | Browser-Rolle | Kompatibilitaetsziel |
| --- | --- | --- | --- | --- | --- |
| `single` | nein | n/a | n/a | voll | identische Regeln ohne Netcode-Abhaengigkeit |
| `splitscreen` | nein | lokal | lokal | optional | identischer Match- und Settings-Vertrag ohne Remote-Lobby |
| `lan` | ja | ja | ja | optional/join-only | gleicher Match-Vertrag wie `online`, andere Discovery/Signaling-Quelle |
| `online` | ja | ja | ja | optional/join-only | gleicher Match-Vertrag wie `lan`, andere Endpoint-/NAT-/TURN-Anforderungen |

Verbindliche Invarianten ueber alle Klassen:

- dieselbe Match-Settings-Struktur
- dieselbe Fahrzeug-/Loadout-Struktur
- dieselben ModePath-/GameMode-Regeln
- derselbe Round-Start-/Round-End-Grundvertrag
- dieselben `playerLoaded`-/`arena_start`-Gates fuer echte Netzwerkmatches
- dieselbe Fehler- und Disconnect-Semantik auf UI-Ebene, soweit fachlich moeglich

## Nicht-Ziele

Nicht Primarscope dieses Plans:

- globales Matchmaking
- Accounts, Friends, Presence-Backend
- Ranked, Anti-Cheat, Dedicated Server, Spectator
- umfassende Cloud-Save-Strategien
- komplette Mobil-/Touch-Produktisierung

## Betroffene Pfade (geplant)

- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/static-server.cjs`
- `.env.app`
- `package.json`
- `src/shared/contracts/RuntimeSessionContract.js`
- moeglicher neuer Capability-/Desktop-Transport-Contract unter `src/shared/contracts/**`
- `src/shared/contracts/MultiplayerSessionContract.js`
- `src/shared/contracts/SignalingSessionContract.js`
- `src/core/RuntimeConfig.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/runtime/MenuRuntimeMultiplayerService.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/core/runtime/RuntimeSessionLifecycleService.js`
- `src/core/runtime/MatchStartValidationService.js`
- `src/network/LANSessionAdapter.js`
- `src/network/OnlineSessionAdapter.js`
- `src/network/LANMatchLobby.js`
- `src/network/OnlineMatchLobby.js`
- `src/network/StateReconciler.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/UIManager.js`
- `src/ui/UIStartSyncController.js`
- `src/ui/menu/MenuRuntimeFeatureFlags.js`
- `src/ui/menu/MenuSchema.js`
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/menu/MenuMultiplayerBridge.js`
- `src/ui/menu/testing/MenuMultiplayerPanel.js`
- `server/lan-signaling.js`
- `server/signaling-server.js`
- `tests/network-adapter.spec.js`
- `tests/core.spec.js`
- moegliche neue Desktop-/Netzwerk-Smokes unter `scripts/` oder `dev/scripts/`
- `docs/Fehlerberichte/` bei externen Blockern
- `docs/plaene/neu/Feature_Desktop_Hauptprodukt_Multiplayer_Online_Offline_Kompatibilitaet_V64.md`

## Dokumentationsfolgen

- Klarer Produktentscheid `Desktop first` fuer Multiplayer dokumentieren.
- Browser-/Web-Rolle explizit als Demo-/Join-/Fallback-Pfad kennzeichnen, falls dies der finale Entscheid bleibt.
- Legacy-Rolle von `storage-bridge` dokumentieren, damit spaetere Arbeit es nicht versehentlich wieder als Produktpfad behandelt.
- Verifikationsmatrix fuer `single`, `splitscreen`, `lan`, `online` pflegen.

## Definition of Done (DoD)

- [ ] DoD.1 Die Desktop-App ist der produktive Hauptpfad fuer `single`, `splitscreen`, `lan` und `online`; Rollen und Einschraenkungen von Desktop und Browser sind klar dokumentiert und im UI widerspruchsfrei umgesetzt.
- [ ] DoD.2 Der produktive Multiplayer-Menuefluss verwendet echte `lan`-/`online`-Transporte; `storage-bridge` ist nicht mehr produktiver Standardpfad.
- [ ] DoD.3 `LAN` und `Online` nutzen einen gemeinsamen fachlichen Session-, Lobby- und Match-Vertrag; Unterschiede sind auf Discovery, Signaling, Endpoint- und NAT/TURN-Themen begrenzt.
- [ ] DoD.4 Offline-Pfade (`single`, `splitscreen`) bleiben funktional und teilen dieselben Match-Settings-, Loadout- und Lifecycle-Grundvertraege mit den Netzwerkpfaden.
- [ ] DoD.5 App-Build, Konfiguration und Diagnostik fuer Online-Signaling und LAN-Discovery sind so definiert, dass die Desktop-App ohne Repo-Insiderwissen betrieben und debuggt werden kann.
- [ ] DoD.6 Reconnect, Disconnect, Host-Rolle, Ready-Gates, Start-Gates, `playerLoaded`, `stateUpdate` und `return-to-menu` sind ueber `lan` und `online` kompatibel charakterisiert.
- [ ] DoD.7 `npm run build:app`, die direkt betroffenen Netzwerk-/Desktop-Smokes, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen; verbleibende externe Blocker sind in `docs/Fehlerberichte/` dokumentiert.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 64.1 Produktentscheid und Transportmatrix festziehen

- [ ] 64.1.1 Den Produktentscheid `Desktop first fuer Multiplayer` verbindlich in Rollen, Pflichten und Einschraenkungen fuer `Desktop` und `Browser` uebersetzen, inklusive Host-/Join-/Offline-Matrix.
- [ ] 64.1.2 Eine transportneutrale Kompatibilitaetsmatrix fuer `single`, `splitscreen`, `lan` und `online` definieren, damit Regelinvarianten, UI-Pflichten und Lifecycle-Unterschiede explizit statt implizit bleiben.

### 64.2 Session-Contract und Capability-Modell vereinheitlichen

- [ ] 64.2.1 `RuntimeSessionContract` so schaerfen, dass `sessionType`, `adapterSessionType`, `multiplayerTransport`, Netzwerkfaehigkeit und Host-/Join-/Discovery-Capabilities eindeutig getrennt und fuer Menue, Runtime und App-Shell gleich lesbar sind.
- [ ] 64.2.2 `storage-bridge` fachlich auf Legacy-/Test-/Fallback-Status zurueckstufen und durch einen klaren Capability- oder Feature-Flag-Vertrag absichern, damit der Produktpfad nicht erneut auf Schein-Multiplayer kippt.

### 64.3 Menue- und Lobby-Pfad auf echte Transporte umstellen

- [ ] 64.3.1 Den aktiven Multiplayer-Menuefluss von `MenuRuntimeMultiplayerService` und Menue-UI so umbauen, dass Desktop-Nutzer bewusst `LAN` oder `Online` waehlen und danach echte Lobby-/Session-Objekte statt Storage-Koordination verwenden.
- [ ] 64.3.2 Start-Validierung, Ready-Logik, Host-/Client-Rollen, Lobby-Code-Eingabe, Statusmeldungen und Fehlertexte auf einen transportneutralen Vertrag heben, damit `lan` und `online` dieselben Gates mit transportspezifischer Diagnose nutzen.

### 64.4 Desktop-LAN-Host und Discovery produktisieren

- [ ] 64.4.1 Den eingebetteten LAN-Signaling-Host in Electron fuer Start, Stop, Portwahl, Tray-/Window-Lifecycle und Fehlerdiagnostik haerten, sodass LAN-Hosting nicht mehr nur implizites Nebenprodukt des App-Starts ist.
- [ ] 64.4.2 Discovery, Host-IP-Aufloesung und Join-Flows fuer Desktop robust machen, inklusive nachvollziehbarer UI-Zustaende bei fehlendem Host, Port-Konflikten, stale Broadcasts oder mehreren gefundenen Hosts.
- [ ] 64.4.3 Desktop-Fensterstart und LAN-Hoststart explizit entkoppeln: Die App muss auch ohne erfolgreichen Host-Start bedienbar bleiben und den Host nur als Capability-/Statuszustand ausweisen statt den gesamten Desktop-Bootpfad daran zu koppeln.

### 64.5 Online-Signaling und App-Konfiguration abschliessen

- [ ] 64.5.1 Den Desktop-App-Build fuer `Online` vervollstaendigen: `VITE_SIGNALING_URL`, TURN-Optionen, dev/prod-Konfiguration, Override-Strategie und Packaging-Dokumentation muessen fuer die App klar definiert sein.
- [ ] 64.5.2 `OnlineMatchLobby` und `OnlineSessionAdapter` fuer Desktop-Betrieb gegen fehlende Endpoints, fehlerhafte WS-Verbindungen, Timeout, Retry, Reconnect und klare User-Diagnostik haerten, ohne den gemeinsamen Session-Vertrag zu brechen.

### 64.6 Match-Lifecycle und State-Sync zwischen LAN und Online angleichen

- [ ] 64.6.1 Session-Initialisierung, `playerLoaded`, `arena_start`, `stateUpdate`, Pause-/Resume-, Leave-/Disconnect- und Return-to-Menu-Semantik fuer `lan` und `online` auf denselben Lifecycle-Kern verdichten.
- [ ] 64.6.2 State-Reconciliation, Round-Start-Gates und Host-Autoritaet so charakterisieren und absichern, dass Unterschiede zwischen `lan` und `online` nur transportbedingt und nicht fachlich sichtbar werden.
- [ ] 64.6.3 Die Multiplayer-Produktisierung ausschliesslich ueber oeffentliche Lifecycle- und Capability-Ports anbinden; neue private Facade-Hooks, `game.*`-Backdoors oder implizite Storage-Bridge-Fallbacks duerfen fuer `lan`/`online` nicht erneut entstehen.

### 64.7 Offline-Kompatibilitaet explizit schuetzen

- [ ] 64.7.1 `single` und `splitscreen` gegen Multiplayer-Refactor regressionssicher halten, indem Settings, Map-Wahl, Fahrzeugwahl, HUD, Pause und Match-Start weiterhin ohne Netzwerkverfuegbarkeit denselben fachlichen Vertrag erfuellen.
- [ ] 64.7.2 Desktop ohne Internet als gueltigen Produktzustand behandeln: lokale Modi, LAN-Host, LAN-Join und sinnvolle Online-Fehlerbilder muessen ohne harte Online-Abhaengigkeit bedienbar bleiben.

### 64.8 Verifikationsmatrix, Characterization und Rollout-Schutz

- [ ] 64.8.1 Eine Verifikationsmatrix fuer `single`, `splitscreen`, `lan-host`, `lan-client`, `online-host`, `online-client` aufbauen und die wichtigsten Contract-/Regressionstests fuer Session-Mapping, Adapterwahl, Join/Ready/Start und Disconnect ableiten.
- [ ] 64.8.2 Einen fokussierten Desktop-Mehrinstanzen-Smoke fuer Host/Join/Start/Disconnect pflegen, der echte App-/Transportpfade abdeckt und verbleibende Umgebungslimits oder externe Infrastrukturblocker in `docs/Fehlerberichte/` festhaelt.

### 64.99 Integrations- und Abschluss-Gate

- [ ] 64.99.1 Desktop-Hauptpfad fuer Multiplayer ist technisch und dokumentarisch konsistent: kein produktiver Standardfluss fuehrt mehr ueber `storage-bridge`, und Browser-/Desktop-Rollen sind widerspruchsfrei.
- [ ] 64.99.2 `npm run build:app`, die direkt betroffenen Netzwerk-/Desktop-Smokes, `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; offene externe Endpoint- oder Infra-Blocker sind vor Handoff explizit dokumentiert.

## Verifikationsstrategie

- Grundgate fuer Plan und Doku:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`
- Desktop-Build:
  - `npm run build:app`
- Netzwerk-/Runtime-Fokus:
  - `npm run test:core -- --grep "multiplayer|network|desktop"`
  - `npm run test:fast`
  - gezielte `tests/network-adapter.spec.js`-Faelle fuer Mapping, Retry, Reconnect, Error-Contracts und Adapter-Typwahl
- Desktop-/Mehrinstanzen-Fokus:
  - fokussierter App- oder Browser-Zweiinstanzen-Smoke fuer `host -> join -> ready -> start -> disconnect`
- Bei externen Infrastrukturproblemen:
  - Blocker in `docs/Fehlerberichte/` dokumentieren statt implizit zu uebergehen

## Risiko-Register V64

- `R1 | hoch | Transport-Mischzustand`
  - Risiko: Menue und Runtime koennen waehrend der Migration gleichzeitig teils `storage-bridge`, teils echte SessionAdapter nutzen und dadurch inkonsistente Rollen oder Start-Gates erzeugen.
  - Mitigation: Capability-Vertrag frueh einfuehren, produktive Pfade hart auf echte Transporte legen und Legacy-Pfade klar markieren.

- `R2 | hoch | Offline-Regressionsrisiko`
  - Risiko: Beim Umbau auf Desktop-first-Multiplayer brechen `single` oder `splitscreen`, obwohl sie fachlich unveraendert bleiben sollten.
  - Mitigation: Offline-Pfade als eigene Kompatibilitaetsklasse behandeln und Characterization-Tests vor jeder tieferen Session-Migration erweitern.

- `R3 | hoch | Lifecycle-Drift zwischen LAN und Online`
  - Risiko: `ready`, `playerLoaded`, `arena_start`, Disconnect oder Return-to-Menu verhalten sich in `lan` und `online` unterschiedlich und fuehren zu schwer reproduzierbaren Match-Fehlern.
  - Mitigation: Gemeinsame Lifecycle-Kernpfade und Contract-Tests fuer beide Transporte; transportbedingte Unterschiede nur an klaren Boundary-Punkten zulassen.

- `R4 | mittel | App-Konfigurationsluecken`
  - Risiko: Desktop funktioniert in Entwicklung, aber nicht produktiv, weil Endpoint-, TURN- oder Packaging-Konfiguration unvollstaendig bleibt.
  - Mitigation: dev/prod-Konfigurationsschema, Defaults, Overrides und Diagnoseausgaben als Teil des Produktpfads behandeln, nicht als nachgelagerte Ops-Aufgabe.

- `R5 | mittel | Browser-/Desktop-Rollen verwirren Nutzer und Code`
  - Risiko: UI, Doku und Feature-Flags sagen unterschiedliche Dinge ueber Host-/Join-Faehigkeit aus.
  - Mitigation: Produktrollen in einem einzigen Capability-Modell ausdruecken und sowohl Menue als auch Runtime daran koppeln.

- `R6 | mittel | Reconnect-/Retry-Haertung erzeugt neue Timeouts`
  - Risiko: Fail-fast- oder Retry-Anpassungen aendern das Timing fuer bestehende Flows und brechen Stabilitaet in Grenzfaellen.
  - Mitigation: Characterization-Tests fuer Error-, Timeout- und Retry-Semantik vorziehen und fuer `LAN` wie `Online` parallel pflegen.

- `R7 | niedrig | Legacy-Storage-Bridge bleibt versteckt lebendig`
  - Risiko: Der Altpfad bleibt ueber Tests, Debug-UI oder Menueabkuerzungen produktiv erreichbar und verschleiert echte Fehler.
  - Mitigation: Legacy-Pfad explizit labeln, zentraler Feature-Flag, keine stillen Fallbacks fuer produktive Desktop-Flows.

## Handoff-Hinweis

- Dieser Plan ist absichtlich ein externer Plan unter `docs/plaene/neu/`.
- Keine direkte Aenderung an `docs/Umsetzungsplan.md`.
- Fuer die manuelle Uebernahme sollte der bisher undefinierte Desktop-Block `V64` mit diesem Scope konkretisiert werden.
