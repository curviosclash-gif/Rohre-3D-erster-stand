# Umsetzungsplan (Master-Index)

Stand: 2026-04-02

Dieser Master ist der kompakte Index fuer aktive Arbeit.
Kanonische Blockdetails liegen in den jeweiligen Dateien unter `docs/plaene/aktiv/`.
Neue oder geaenderte Intake-Entwuerfe entstehen weiter unter `docs/plaene/neu/`.
Archivierte oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.
Inaktive bzw. zurueckgestellte Eintraege liegen in `docs/prozess/Backlog.md`.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Master werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Eintraege gepflegt.

## Lesereihenfolge

1. `docs/Umsetzungsplan.md` fuer aktive Bloecke, Abhaengigkeiten, Locks und Conflict-Log.
2. `docs/plaene/aktiv/VXX.md` fuer kanonische Blockdetails, DoD, Risiken, `scope_files`, Verifikation und Phasen.
3. `docs/plaene/neu/*.md` nur fuer neue oder ueberarbeitete Intake-Entwuerfe.
4. `docs/plaene/alt/*.md` nur fuer historische oder abgeloeste Planstaende.

## Aktive Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V71 | Repo-Aufraeumen Runtime-sicher | blocked | P1 | frei | V43-Strukturvertrag | 71.99 | `docs/plaene/aktiv/V71.md` |
| V72 | Gameplay-Powerups, Portale und Gates | active | P1 | Agent-B | V69.99 | 72.3 | `docs/plaene/aktiv/V72.md` |
| V74 | Architektur-Runtime-Entkopplung (Refresh) | active | P1 | Bot-Codex | V58.99,V60.3 | 74.4 | `docs/plaene/aktiv/V74.md` |
| V77 | Desktop Vollversion Browser Demo Grenzen | planned | P2 | frei | V74.99 | 77.1 | `docs/plaene/aktiv/V77.md` |
| V64 | Desktop Hauptprodukt Multiplayer Online Offline Kompatibilitaet | planned | P2 | frei | V74.99,V77.99 | 64.1 | `docs/plaene/aktiv/V64.md` |
| V75 | Cinematic Recorder Desktop WebM-MP4 Stabilisierung | planned | P3 | frei | V74.99,V77.99,V64.99 | 75.1 | `docs/plaene/aktiv/V75.md` |
| V76 | Desktop Hangar Arcade Fight | planned | P3 | frei | V71.4,V77.99,V64.99 | 76.1 | `docs/plaene/aktiv/V76.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V64 | V74.99 | hard | nein | Desktop-Multiplayer muss Lifecycle-, Capability- und Composition-Grenzen aus V74 uebernehmen; keine neuen `game.*`- oder private-Facade-Backdoors |
| V64 | V50/V52 Netzwerk-Baseline | hard | ja | SessionAdapter-, Lobby-, Signaling- und `stateUpdate`-Grundvertraege bleiben verbindlich |
| V64 | V77.99 | hard | nein | Multiplayer darf das Verkaufsversprechen `Vollversion hostet, Demo joint` erst nach verankerter Surface-Policy umsetzen |
| V71 | V43-Strukturvertrag | hard | ja | Root-/Editor-Schutz und `EditorPathContract` bleiben bis nach 71.4 verbindlich; 71.4 ist abgeschlossen |
| V71 | Playwright-/Warmup-Entstoerung fuer Restgate | soft | nein | `71.99` bleibt aktuell an `tests/playwright.global-setup.js` mit `fetch failed`/Warmup-Hang offen |
| V72 | V69.99 | hard | ja | Fight/Hunt-Item-, Rocket- und Shield-Baseline aus V69 bleibt Ausgangspunkt fuer Pickup-/Portal-/Gate-Vertraege |
| V72 | Legacy-/Migrationspfad fuer Gate-/Portal-Validierung | hard | nein | Vor hartem Fail muessen sichtbare Warn-, Diagnose- oder Migrationspfade fuer bestehende Maps umgesetzt werden |
| V74 | V58.99 | hard | ja | Architektur-Guard- und Budget-Baseline aus V58 bleibt die verbindliche Ausgangsbasis |
| V74 | V60.3 | hard | ja | V60.3 dokumentiert das Zielbild fuer Rest-Orchestratoren und dient als Referenz fuer die Runtime-Entkopplung |
| V74 | V70.99 | soft | ja | Settings-/Preset-Pfade im Runtime-/Menue-Lifecycle muessen bei Refactors mitgeprueft werden |
| V74 | V67/V68 Abschlussstand | soft | ja | Multiplayer- und Arcade-Lifecycle aus V67/V68 liefern den Regression-Scope fuer Start-/Return-Pfade |
| V77 | V74.99 | hard | nein | Die Surface-Leitplanke fuer `Desktop Vollversion` vs `Browser Demo` darf erst auf der stabilisierten Runtime-/Capability-Basis aus V74 verankert werden |
| V75 | V74.99 | hard | nein | Recorder-Finalisierung muss denselben Lifecycle-/Dispose-Vertrag wie V74 nutzen; keine parallelen Sonderpfade fuer Stop, Return-to-Menu oder Shutdown |
| V75 | V77.99 | hard | nein | Export-, Download- und Browser-Fallbacks muessen der Demo-/Vollversions-Politik aus V77 folgen |
| V75 | V64.99 | hard | nein | Recorder-Polish folgt erst nach dem produktiven Host-/Join-Hauptpfad |
| V75 | V72 Recorder-/Telemetry-Result-Codes | soft | nein | Nur relevant, falls Export-Diagnostik gemeinsam mit Gameplay-Result-Codes vereinheitlicht wird |
| V76 | V71.4 | hard | ja | Vehicle-Lab- und Editor-Pfade sind seit `71.4` migrationssicher ueber Contracts/Guards abgesichert |
| V76 | V77.99 | hard | nein | Hangar, Werkstatt und Editoren muessen die in V77 definierte Vollversions-/Demo-Rollenlogik uebernehmen |
| V76 | V64.99 | hard | nein | Hangar-/Werkstatt-Flows starten erst nach dem festgezogenen Produktbild fuer Host/Join und Browser-Demo |
| V76 | V74 Navigations-/Composition-Grenzen | soft | nein | Hangar darf `main.js`, `GameRuntimeFacade` oder breite Desktop-Backdoors nicht erneut aufblasen |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V64 | - | frei | Nach `V77.99` `64.1` Transportmatrix und Capability-Modell fuer `Host Vollversion / Join Demo` konkretisieren |
| - | V71 | - | frei | `71.99` nach Warmup-Entstoerung oder belastbarem Restgate schliessen |
| Agent-B | V72 | 2026-04-02 | active | `72.2` abgeschlossen; `72.3` Portal-/Gate-Vertraege haerten steht an |
| Bot-Codex | V74 | 2026-03-31 | active | `74.4` Core-, UI- und State-Komposition weiter entkoppeln |
| - | V77 | - | frei | Nach `V74.99` die Surface-Leitplanke fuer `Desktop Vollversion` vs `Browser Demo` und die itch.io-Produktrollen festziehen |
| - | V75 | - | frei | Exportstrategie/Finalize-Port erst nach `V64.99` auf denselben Lifecycle- und Surface-Vertrag heben |
| - | V76 | - | frei | Desktop-Hangar-Contract erst nach `V64.99` und unter `V77`-/`V74`-Leitplanken aufnehmen |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | Playwright-Verifikation fuer V74 scheiterte zusaetzlich an BOM+Shebang im Governance-Skript | UTF-8-no-BOM geschrieben; Parserblocker beseitigt, verbleibender Harness-Blocker separat dokumentiert | erledigt |
| 2026-04-02 | Agent-A | V72 (Agent-B lock) | `src/entities/player/PlayerInventoryOps.js` | Agent-A uebernimmt und erledigt 72.1.2 während Agent-B locked war | 72.1 komplett umgesetzt: PlayerInventoryOps validiert selfUsable, blockiert Rockets; Umsetzungsplan aktualisiert auf 72.2 | erledigt |
