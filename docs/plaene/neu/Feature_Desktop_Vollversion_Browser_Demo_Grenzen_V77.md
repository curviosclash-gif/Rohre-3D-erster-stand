# Feature Desktop-Vollversion Browser-Demo-Grenzen V77

Stand: 2026-04-01
Status: Entwurf
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die Produktoberflaechen von Curvios Clash fruehzeitig in `desktop-app` als bezahlte Vollversion und `browser-demo` als kostenlose, bewusst begrenzte itch.io-Demo schneiden, ohne den gemeinsamen Gameplay-, State- und Contract-Kern in zwei getrennte Codebasen aufzuteilen. Neue Features entstehen kuenftig desktop-first; Browser/Web erhaelt nur explizit freigegebene Demo-Capabilities. Multiplayer-Zielbild: Die Vollversion kann Spiele hosten, die Demo kann nur joinen, sodass in einer Gruppe eine gekaufte Vollversion als Host ausreicht.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V77`
- Hard dependencies: `V74.99` bleibt Pflicht, weil Capability-, Lifecycle- und Composition-Grenzen fuer `electron/*`, `vite.config.js`, `src/core/runtime/**` und `src/ui/menu/**` nicht gegen die aktive Architekturspur arbeiten duerfen.
- Soft dependencies: `V64` muss die hier definierten Surface-Rollen fuer Multiplayer, Host/Join und Transportwahl uebernehmen; `V76` muss Hangar-/Werkstatt-Flows an dieselbe Desktop-vollwertig/Web-demo-Logik binden; `V75` muss Export-/Recorder-Pfade an dieselbe Surface-Policy haengen.
- Datei-Ownership: Der geplante Scope kollidiert fachlich mit `V74` und spaeter mit `V64`, `V75`, `V76`; Umsetzung nur in einem sequenziellen Ownership-Fenster oder mit explizitem Sub-Lock.
- Hinweis: Manuelle Uebernahme in `docs/Umsetzungsplan.md` erforderlich.

## Ausgangslage

- Die Repo-Regeln definieren die Desktop-App bereits als Primaerprodukt; Browser/Web ist laut Governance nur Demo mit absichtlich reduziertem Umfang.
- Build-Seite ist die Trennung bereits vorbereitet: `.env.app` und `.env.web` setzen `VITE_APP_MODE`, und `vite.config.js` mappt diese Surface-Info zur Laufzeit.
- Electron exponiert ueber `electron/preload.cjs` bereits app-spezifische Capabilities wie LAN-Host, Discovery sowie Datei-Export.
- Im Renderer existieren erste Surface-Abfragen, zum Beispiel in `src/ui/menu/MenuRuntimeFeatureFlags.js` (`canHost`) sowie in Recording-/Replay-/Discovery-Pfaden ueber `curviosApp` bzw. `__CURVIOS_APP__`.
- Die Trennung ist heute jedoch punktuell und ad hoc: einzelne Features pruefen auf App-Runtime, aber es gibt noch keinen zentralen Produktvertrag, welche Capabilities Browser/Web ueberhaupt bewusst anbieten darf.
- `V64` formuliert bereits "Desktop Hauptprodukt, Browser Demo/Join/Fallback" fuer Multiplayer; dieselbe Rollenlogik fehlt aber noch als uebergreifender Vertrag fuer Menue, Export, Persistenz, Tooling, kuenftige Hangar-/Werkstatt-Flows und neue Features.
- Wenn die Begrenzung erst nach Fertigstellung nachgezogen wird, wachsen Feature-Paritaet, falsche UX-Erwartungen und versteckte Web-Fallbacks in den Standardpfad ein; die spaetere Rueckwaerts-Sortierung wird dadurch teurer als ein frueher Surface-Schnitt.

## Release-Zielbild

- `desktop-app`: bezahlte Vollversion auf itch.io
- `browser-demo`: kostenlose Demo auf itch.io
- Gruppenversprechen: Eine Vollversion darf Hosts bereitstellen; Browser-Demos duerfen denselben Match joinen, aber selbst keine produktiven Hosts aufmachen.
- Demo-Inhaltsmodell:
  - `Arcade` verfuegbar
  - `Parcours` nur als Tutorial-/Einstiegsvariante
  - `Fight` verfuegbar
  - `Normal`/`Classic` nur auf einer von dir kuratierten Map-Auswahl
- Vollversions-exklusiv:
  - Host-Funktionen im Multiplayer
  - Vehicle-Editor
  - Map-Editor

## Scope

- `desktop-app` ist die Vollversion und der Source-of-Truth fuer Feature-Vollstaendigkeit.
- `browser-demo` ist ein absichtlich beschnittener Showcase-/Join-/Fallback-Pfad und kein gleichwertiges Produktziel.
- Surface-Unterschiede werden ueber einen expliziten Capability-Vertrag ausgedrueckt, nicht ueber verstreute Einzelpruefungen.
- Menue, Runtime, Multiplayer, Export, Persistenz, Diagnostics und kuenftige Feature-Flows muessen gegen denselben Surface-Vertrag laufen.
- Neue Features folgen kuenftig der Regel `desktop standard, web nur per explizitem opt-in`.
- Die Browser-Demo zeigt nur folgende freigegebene Inhalte: `Arcade`, ein `Parcours`-Tutorialpfad, `Fight` sowie `Normal`/`Classic` auf einer von dir vorgegebenen Map-Auswahl.
- Browser-Demo-Multiplayer ist `join only`; produktives `host` bleibt Vollversions-Funktion.
- Vehicle-Editor und Map-Editor bleiben strikt Vollversions-Funktionen.

Initialer Demo-Ausschlusskorridor:

- Kein produktiver Default fuer Host-, Discovery- oder echte LAN-Server-Flows im Browser; Demo darf joinen, aber nicht hosten.
- Kein stiller Produktstandard ueber `storage-bridge`, wenn fachlich ein echter Transport erwartet wird.
- Keine implizite Vollversion fuer app-native Dateioperationen wie Replay-/Video-Speichern.
- Kein Zugriff der Demo auf Vehicle- oder Map-Editor.
- Kein unkuratiertes Map-Angebot in `Normal`/`Classic`; Browser bekommt nur die von dir freigegebenen Maps.
- Kein automatischer Anspruch auf Feature-Paritaet fuer kuenftige Desktop-Shell-Features wie Hangar, Werkstatt, Training oder tiefere Diagnostics.

## Betroffene Pfade (geplant)

- `.env.app`
- `.env.web`
- `vite.config.js`
- `electron/main.cjs`
- `electron/preload.cjs`
- `server/lan-signaling.js`
- `server/signaling-server.js`
- `src/ui/menu/MenuRuntimeFeatureFlags.js`
- `src/ui/menu/**`
- `src/ui/start-setup/**`
- `src/ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js`
- `src/ui/menu/multiplayer/MenuMultiplayerHostIpResolver.js`
- `src/core/runtime/MenuRuntimeMultiplayerService.js`
- `src/core/runtime/**`
- `src/network/**`
- `src/core/recording/DownloadService.js`
- `src/core/recording/MediaRecorderSupport.js`
- `src/core/replay/ReplayRecorder.js`
- `src/shared/contracts/RuntimeSessionContract.js`
- `src/shared/contracts/MultiplayerSessionContract.js`
- `src/shared/runtime/GameRuntimePorts.js`
- `editor/**`
- `docs/referenz/ai_architecture_context.md`
- Folgeplaene und Intake-Dokumente fuer `V64`, `V75`, `V76`

## Definition of Done (DoD)

- [ ] DoD.1 `desktop-app` und `browser-demo` sind als Produktrollen mit Pflichten, Rechten, Preismodell und itch.io-Ausspielung explizit dokumentiert; Browser wird nirgends mehr stillschweigend als gleichwertiger Hauptpfad behandelt.
- [ ] DoD.2 Ein zentraler Surface-/Capability-Vertrag ersetzt verstreute Einzelpruefungen auf `curviosApp`, `__CURVIOS_APP__` oder isolierte `__APP_MODE__`-Sonderfaelle als alleinige Produktlogik.
- [ ] DoD.3 Menue, Runtime, Multiplayer, Export und kuenftige Shell-Features lesen dieselbe Capability-Quelle; Demo-Ausschluesse sind UI-seitig sichtbar und runtime-seitig hart durchgesetzt.
- [ ] DoD.4 Browser/Web zeigt nur die freigegebene Demo-Allowlist: `Arcade`, ein `Parcours`-Tutorialpfad, `Fight` sowie `Normal`/`Classic` auf einer kuratierten Map-Auswahl; nicht freigegebene Vollversions-Features werden klar verborgen, deaktiviert oder als "nur Desktop" kommuniziert.
- [ ] DoD.5 Browser-Demo kann Multiplayer-Matches joinen, aber nicht hosten; Vollversion kann als Host fuer Gruppen mit Demo-Clients fungieren.
- [ ] DoD.6 Vehicle-Editor und Map-Editor sind technisch wie UX-seitig strikt Vollversions-Funktionen.
- [ ] DoD.7 `V64`, `V75` und `V76` referenzieren dieselben Surface-Regeln, sodass keine Folgearbeit neue Paritaetsannahmen oder heimliche Browser-Hauptpfade wieder einfuehrt.
- [ ] DoD.8 Neue Features folgen einem wiederverwendbaren Rollout-Muster: zuerst Desktop, dann optional explizite Web-Freigabe mit dokumentierter Demo-Begruendung.
- [ ] DoD.9 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind fuer den Planstand gruen; verbleibende Ownership- oder Intake-Offenpunkte sind dokumentiert.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 77.1 Produktrollen und Demo-Allowlist verbindlich machen

- [ ] 77.1.1 Einen verbindlichen Produktvertrag fuer `desktop-app = bezahlte Vollversion auf itch.io` und `browser-demo = kostenlose begrenzte Demo auf itch.io` ausformulieren, inklusive Zielbild, Nicht-Zielen und Nutzererwartung.
- [ ] 77.1.2 Eine konkrete Allowlist-/Denylist-Matrix fuer die Demo definieren: `Arcade`, `Parcours` nur als Tutorialpfad, `Fight` sowie `Normal`/`Classic` nur auf einer von dir kuratierten Map-Auswahl.
- [ ] 77.1.3 Die Begriffe `Demo`, `nur Desktop`, `Join/Fallback`, `Legacy`, `Host`, `produktiver Pfad` und `nicht verfuegbar` sprachlich normieren, damit UI, Doku und Folgeplaene dieselben Labels verwenden.

### 77.2 Surface-Capability-Vertrag zentralisieren

- [ ] 77.2.1 Einen zentralen `SurfaceCapabilities`- oder `SurfacePolicy`-Vertrag planen, der Build-Mode, App-Bridge und Produktrolle in eine einzige konsumierbare Quelle ueberfuehrt.
- [ ] 77.2.2 Bestehende ad-hoc-Pruefungen in Menue-, Recording-, Replay- und Discovery-Pfaden inventarisieren und auf den kuenftigen zentralen Vertrag abbilden.
- [ ] 77.2.3 Fuer Browser/Web ein `default deny, explicit allow`-Prinzip festlegen; fuer Desktop gilt `default full`, solange keine bewusste Ausnahme dokumentiert ist.

### 77.3 Menue-, CTA- und Navigationsgrenzen schneiden

- [ ] 77.3.1 Hauptmenue, Untermenues und Setup-Flows so planen, dass Browser nur die freigegebenen Demo-Modi, Tutorialpfade und kuratierten Maps anbietet und keine Vollversions-CTA zeigt, die spaeter nur in Fehler oder verdeckte Fallbacks laufen.
- [ ] 77.3.2 Fuer deaktivierte oder reduzierte Demo-Funktionen einen konsistenten UX-Pfad festlegen: `verbergen`, `deaktivieren mit Label`, oder `auf Desktop verweisen`.
- [ ] 77.3.3 Host-/Join-/Offline-/Showcase-Einstiege pro Surface explizit schneiden, damit Browser-Demo und Desktop-Vollversion unterschiedliche, aber nachvollziehbare Startpfade erhalten.

### 77.4 Runtime-, Session- und Multiplayer-Semantik ausrichten

- [ ] 77.4.1 Den V64-Transportvertrag an die neue Surface-Politik koppeln: Desktop darf produktive `lan`-/`online`-Flows fuehren; Browser bekommt nur explizit freigegebene Join-, Demo- oder Fallback-Rollen.
- [ ] 77.4.2 Verhindern, dass `storage-bridge` oder aehnliche Browser-internen Behelfswege erneut als verdeckter Produktstandard erscheinen, wenn fachlich echter Multiplayer gemeint ist.
- [ ] 77.4.3 Den Gruppenvertrag `Vollversion hostet, Demo joint` technisch fuer Discovery-, Lobby-, Signaling- und Session-Gates ausbuchstabieren, inklusive klarer Verbote fuer Demo-Hostfluesse.

### 77.5 Export-, Persistenz-, Tooling- und Shell-Grenzen definieren

- [ ] 77.5.1 Replay-/Video-Export, Dateioperationen, Diagnostics, Editor-/Training-Zugaenge und kuenftige Shell-Funktionen als `desktop-only`, `demo-safe`, `legacy` oder `future opt-in` klassifizieren.
- [ ] 77.5.2 Browser-Fallbacks fuer Export oder Persistenz nur dort zulassen, wo sie fachlich wirklich eine Demo stiften; reine Notloesungen duerfen nicht den Produktvertrag ersetzen.
- [ ] 77.5.3 Vehicle-Editor und Map-Editor explizit als Vollversions-Funktionen verankern; Browser erhaelt dafuer weder direkte Einstiege noch versteckte Deep-Links.
- [ ] 77.5.4 Hangar-, Werkstatt- und andere kuenftige Shell-Features aus `V76` von Beginn an als Desktop-Standard planen und Browser nur ueber ausdruecklich dokumentierte Demo-Ausnahmen anbinden.

### 77.6 Folgeblock-Governance und Rollout-Muster verankern

- [ ] 77.6.1 `V64`, `V75` und `V76` auf dieselben Surface-Regeln spiegeln, damit dort keine widerspruechlichen Rollenbilder fuer Browser und Desktop bleiben.
- [ ] 77.6.2 Ein leichtgewichtiges Entscheidungsraster fuer neue Features festlegen: `desktop only`, `desktop first mit spaeterem web opt-in`, oder `demo-safe von Anfang an`.
- [ ] 77.6.3 Architektur- und Referenzdokumentation so erweitern, dass Surface-Rollen, Capability-Herkunft und Demo-Grenzen fuer kuenftige Implementierungen schnell auffindbar bleiben.

### 77.7 Itch.io-Ausspielung und Produktpakete vorbereiten

- [ ] 77.7.1 Das Release-Modell fuer itch.io spezifizieren: kostenlose Browser-Demo als Web-Build, bezahlte Vollversion als Desktop-App-Build mit klarer Feature-Abgrenzung.
- [ ] 77.7.2 Einen konsistenten Upgrade-Pfad zwischen Demo und Vollversion planen, damit Browser-Nutzer Host-, Editor- und Vollversions-Features nachvollziehbar der Kaufversion zuordnen koennen.
- [ ] 77.7.3 Die Kompatibilitaetszusage fuer Gruppen sauber definieren: eine gekaufte Vollversion hostet, Demo-Spieler duerfen beitreten, und diese Zusage wird weder im UI noch in der Session-Logik widersprochen.

### 77.99 Integrations- und Abschluss-Gate

- [ ] 77.99.1 Der neue Surface-Plan widerspricht weder `V74` noch `V64`/`V75`/`V76`; offene Ownership- oder Intake-Konflikte sind vor Uebernahme explizit notiert.
- [ ] 77.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen.
- [ ] 77.99.3 Der dokumentierte Demo-Ausschlusskorridor ist vor Intake klar genug, dass Folgearbeit Desktop-Vollversion und Browser-Demo nicht erneut vermischt.
- [ ] 77.99.4 Das itch.io-Releasebild sowie die Join-only-Demo-Strategie sind fachlich so klar, dass V64/V76 daraus ohne erneute Produktgrundsatzdebatte implementieren koennen.

## Verifikationsstrategie

- Plan-/Dokugates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Architektur-Folgevalidierung bei Umsetzung: betroffene Capability-/Composition-Checks aus `V74` uebernehmen, damit die Surface-Trennung nicht wieder ueber `game.*` oder implizite Runtime-Globals eingebaut wird.
- Surface-Rollout-Folgevalidierung bei Umsetzung: `build:app` und `build:web` sowie gezielte Characterization-Checks fuer Menue-Entries, Host/Join-Sichtbarkeit, kuratierte Map-Auswahl, Editor-Sperren, Exportverhalten und Demo-Labels vorbereiten.

## Risiko-Register V77

- `R1 | hoch | Paritaetsdrift trotz Desktop-first-Regel`
  - Mitigation: Browser/Web nur ueber explizite Allowlist freischalten; neue Features ohne dokumentierte Web-Freigabe standardmaessig Desktop-only behandeln.
- `R2 | hoch | Surface-Logik bleibt verstreut`
  - Mitigation: Einen einzigen Capability-Vertrag planen und vorhandene Einzelchecks systematisch daran anbinden statt neue Sonderfaelle zuzulassen.
- `R3 | mittel | Nutzerverwirrung durch inkonsistente Demo-UX`
  - Mitigation: Einheitliche Labels, CTA-Regeln und "nur Desktop"-Kommunikation fuer Menue, Einstellungen und Exportpfade festlegen.
- `R4 | hoch | Ownership-Kollision mit V74/V64/V75/V76`
  - Mitigation: Erst Governance-Plan festziehen, danach Folgebloecke sequenziell oder mit explizitem Sub-Lock an denselben Surface-Vertrag anbinden.
- `R5 | mittel | Browser-Fallbacks bleiben heimlicher Produktionspfad`
  - Mitigation: `storage-bridge`-, Download- und andere Fallback-Pfade klar als Demo-/Legacy-Verhalten markieren; keine stillen produktiven Defaults im Browser.
- `R6 | mittel | Demo-Inhalt ist zu offen oder zu unklar`
  - Mitigation: Demo-Allowlist frueh festschreiben, kuratierte Maps zentral pflegen und alle nicht freigegebenen Modi oder Tools explizit als Vollversions-Funktionen labeln.
