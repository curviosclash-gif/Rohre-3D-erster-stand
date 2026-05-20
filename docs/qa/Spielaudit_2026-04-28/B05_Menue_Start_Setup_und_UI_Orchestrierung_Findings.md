# B05 Menue, Start-Setup und UI-Orchestrierung - Findings

Stand: 2026-04-29
Status: offen
Planquelle: [README.md](./README.md)

## Scope

Initiale Sichtung 2026-04-29:

- `src/ui/UIManager.js`
- `src/ui/UINavigationLifecycleController.js`
- `src/ui/UIStartSyncController.js`
- `src/shared/runtime/UiControllerRuntimePorts.js`

Gesamtscope des Blocks:

- `src/ui/UIManager.js`
- `src/ui/UINavigationLifecycleController.js`
- `src/ui/UIStartSyncController.js`
- `src/ui/menu/**`
- `src/ui/start-setup/**`
- `src/ui/dom/**`
- `src/ui/base/**`

## Prueffokus

- Menu-Lifecycle und Controller-Ownership
- Start-Setup-, Selection- und Writeback-Pfade
- Event-Listener-, DOM- und State-Synchronisierung
- God-Object-Risiken, Reach-Throughs und UI-Seams

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B05-F01 | hoch | Extrahierte UI-Controller bleiben strukturell an `manager` und `game` gekoppelt | `src/ui/UIManager.js`, `src/shared/runtime/UiControllerRuntimePorts.js`, `src/ui/UIStartSyncController.js`, `src/ui/UINavigationLifecycleController.js` | `UIManager` konstruiert beide Controller weiter mit `{ manager, game }` und Port-Factories, die nur Reach-Through-Getter auf `manager.settings`, `game.menuMultiplayerBridge`, `game._activeSubmenu` und `game._menuState` kapseln (`src/ui/UIManager.js:49-100`, `src/shared/runtime/UiControllerRuntimePorts.js:44-77`). Die Controller greifen danach weiter ueber `this.manager.settings`, `this.manager._listen(...)` und Port-Fallbacks wie `this.port?.getSettings?.() || this.manager?.settings` auf denselben Zustand zu (`src/ui/UIStartSyncController.js:61-72, 155-239`, `src/ui/UINavigationLifecycleController.js:130-172, 202-215, 252-305`). | `manager`-/`game`-Fallbacks aus den B05-Controllern entfernen und echte Snapshot-/Intent-Ports als alleinige produktive Naht setzen; private UIManager-Helfer wie `_listen()` duplizieren oder ueber eigene Controller-Utilities/Ports bereitstellen statt Reach-Through beizubehalten. | offen |
| B05-F02 | mittel | Menu-, Level4- und Start-Setup-Zustand haben mehrere Wahrheitsquellen und direkte UI-Setup-Writebacks | `src/ui/UINavigationLifecycleController.js`, `src/ui/UIStartSyncController.js`, `src/shared/runtime/UiControllerRuntimePorts.js` | `UINavigationLifecycleController` liest und schreibt `settings.localSettings.toolsState` direkt fuer Drawer-Depth, aktive Section und Open-State; beim Panelwechsel wird `level4Open` vor dem erneuten `setLevel4Open(false)` bereits manuell auf `false` gesetzt (`src/ui/UINavigationLifecycleController.js:126-138, 145-192, 283-305`). Parallel schreibt der Navigation-Port `_activeSubmenu`, `_menuState` und `_menuTransition` direkt ins `game`-Objekt (`src/shared/runtime/UiControllerRuntimePorts.js:66-76`). `UIStartSyncController.setupMapSelect()` normalisiert `modePath` waehrend einer Render-/Populate-Operation direkt nach `settings.localSettings.modePath` zurueck (`src/ui/UIStartSyncController.js:106-118`). | Einen kanonischen Menu-/Start-Setup-Snapshot plus explizite Mutationspfade definieren; DOM-Attribute, Drawer-Zustand und Start-Setup-Defaults nur noch aus diesem Snapshot ableiten und Setup-/Populate-Routinen ohne versteckte Persistenz-Seiteneffekte halten. | offen |
| B05-F03 | hoch | Start-Setup-Renderer bauen HTML direkt aus Laufzeitdaten und oeffnen einen Injection-Pfad | `src/ui/start-setup/StartSetupUiOps.js`, `src/ui/UIStartSyncController.js` | `renderSummaryBlocks()` und `renderPreviewCard()` setzen `innerHTML` aus zusammengebauten Label-/Value-/Badge-/Fact-Werten (`src/ui/start-setup/StartSetupUiOps.js:74-110`). Diese Payloads werden in `UIStartSyncController.syncStartSetupState()` aus Preview-/Auswahlwerten in den Renderer gegeben (`src/ui/UIStartSyncController.js:624-705`). Der Pfad nutzt damit nicht durchgaengig `textContent`/Element-API, obwohl parallel in derselben Komponente fuer andere Felder bereits sichere Textzuweisung verwendet wird. | Rendering auf sichere DOM-Erzeugung umstellen (`createElement` + `textContent`) oder HTML-escapen, bevor Markup zusammengesetzt wird; den Befund mit dem Security-Follow-up in `V102` synchronisieren, damit Start-Setup- und Overlay-Pfade denselben XSS-Schutzstandard haben. | erledigt in V112 (2026-05-20; `T20an` PASS) |

## Offene Fragen

- Soll `V104` die strukturelle Entkopplung von `UIManager`/`UIStartSyncController`/`UINavigationLifecycleController` voll uebernehmen, oder wird davor noch ein kleinerer B05-spezifischer Ownership-Schnitt fuer Menu-/Start-Setup akzeptiert?
- Ist `settings.localSettings.toolsState` als persistenter Produktzustand gedacht oder nur als UI-Session-Cache? Der aktuelle Code behandelt beides parallel.

## Folgearbeit

- Naechste Sichtung auf `src/ui/menu/**` und `src/ui/start-setup/**` erweitern, um zu pruefen, welche Reach-Throughs bereits aus Untermodulen heraus auf dieselben Manager-/Settings-Pfade aufbauen.
- Konsumentenkarte fuer `setLevel4Open()`, `setLevel4Section()`, `setupStartSetupControls()` und die Navigation-/Start-Setup-Ports anlegen, damit Folge-Fixes echte Truth-Sources reduzieren statt nur Controller-Code zu verschieben.
