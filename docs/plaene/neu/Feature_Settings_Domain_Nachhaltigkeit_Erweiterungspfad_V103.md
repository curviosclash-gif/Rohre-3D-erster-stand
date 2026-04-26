# Feature: Settings-Domain Nachhaltigkeit, Mutationsvertrag und Erweiterungspfad (V103)

Stand: 2026-04-25
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V103.md`

## Ziel

Den vorhandenen `SettingsManager` nicht erneut als Gross-Refactor aufrollen, sondern den bestehenden V53-Zuschnitt gezielt so nachhaerten, dass neue Settings-Funktionen kuenftig nachhaltig erweiterbar bleiben:

- Persistenz soll einen einzigen kanonischen Load-/Save-Pfad erhalten statt asymmetrischer Nachnormalisierung.
- Mutierende Settings-Aktionen sollen einen einheitlichen Result-Vertrag liefern (`success`, `reason`, `changedKeys`, optional `metadata`), damit Runtime-Services keine ad-hoc-Sonderlogik nachbauen.
- Core-Settings-Facades sollen keine direkten DOM-/UI-Seiteneffekte mehr ausloesen; Ownership bleibt gemaess V92 im Runtime-/UI-Layer.
- UI-nahe Metadaten wie Keybind-Action-Listen sollen aus `src/core/SettingsManager.js` in stabile Vertrags-/UI-Module wandern.
- Neue Settings-Features sollen kuenftig zuerst in `src/core/settings/**` oder schmalen Settings-Ports landen und nicht wieder durch direkte `store`-Zugriffe oder Manager-Aufblaehung wachsen.

Der Block ist explizit als Nachhaltigkeits- und Erweiterbarkeits-Follow-up zu V53 und unter den Ownership-Leitplanken von V92 zu verstehen, nicht als alternatives Settings-Studio-Feature.

## Desktop-first Scope

- Primaerziel bleibt die Desktop-App und deren Runtime-/Authoring-Pfad.
- Browser-/Demo-Auswirkungen sind nur dort erlaubt, wo bestehende Shared-Contracts denselben Settings-Pfad konsumieren.
- Kein Browser-first-Paritaetsausbau und kein neuer produktiver Browser-Schreibpfad.

## Nicht-Ziel

- Kein Big-Bang-Rewrite der gesamten Settings-Domain.
- Kein zweites Settings-Tool neben Settings Studio.
- Kein visuelles Redesign von Settings Studio oder Menu-UI.
- Kein ungeprueftes Reaktivieren direkter Global-/`settingsManager.store`-Bypaesse in produktiven Pfaden.
- Kein neues Gameplay-Feature ohne direkten Nachhaltigkeits- oder Erweiterbarkeitsbezug.

## Betroffene Dateien und Bereiche

- `src/core/SettingsManager.js`
- `src/ui/SettingsStore.js`
- `src/core/main.js`
- `src/core/settings/SettingsDeveloperFacade.js`
- `src/core/settings/SettingsPresetFacade.js`
- `src/core/settings/SettingsSessionDraftFacade.js`
- `src/core/settings/SettingsTextOverrideFacade.js`
- `src/core/runtime/MenuRuntimeDeveloperModeService.js`
- `src/core/runtime/MenuRuntimePresetConfigService.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/ui/KeybindEditorController.js`
- `src/core/settings/**` fuer neue Result-/Repository-/Contract-Helfer
- `tests/runtime-settings-live-apply.contract.test.mjs`
- `tests/settings-manager.contract.test.mjs`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 Load- und Save-Pfad nutzen dieselbe kanonische Normalisierungs-/Persistenzpipeline; Rohspeicherung ohne Rebase-/Sanitize-Ratchet ist im betroffenen Scope entfernt.
- [ ] DoD.2 Mutierende Settings-Aktionen liefern einen einheitlichen Result-Vertrag mit `success`, `reason` und `changedKeys`; Runtime-Services konsumieren diesen Vertrag statt ad-hoc-Listen zu streuen.
- [ ] DoD.3 Core-Settings-Facades enthalten im betroffenen Scope keine direkten DOM-/Dokument-Seiteneffekte mehr.
- [ ] DoD.4 UI-nahe Keybind-/Descriptor-Metadaten liegen nicht mehr in `src/core/SettingsManager.js`, sondern in einem stabilen Vertrags- oder UI-Modul.
- [ ] DoD.5 Produktive Direktzugriffe auf `settingsManager.store` werden im betroffenen Scope durch schmale Ports/Repository-Zugaenge ersetzt oder explizit auf Legacy-Adapter begrenzt; neue Zugriffe sind ausgeschlossen.
- [ ] DoD.6 Gezielte Contract-Tests sichern Persistenzsymmetrie, Mutationsresultate und Ownership-Grenzen gegen Regression ab.
- [ ] DoD.7 Architekturkontext und Erweiterungsregeln dokumentieren, wie neue Settings-Funktionen kuenftig ohne Manager-Aufblaehung eingefuegt werden.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V103`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V103.md`
- hard dependencies: `V92.99`
- soft dependencies: `V98.99`
- Hinweis: `Manuelle Uebernahme erforderlich`
- Zusatzhinweis: Vor Intake den Status von `V98` zwischen Master und Detaildatei synchronisieren; die Detail-Checklist wirkt bereits abgeschlossen, der Header steht aber noch auf `planned`.

## Vorgeschlagene Master-Integration

Empfohlene Einordnung im Master:

- Abschnitt `### Aktive und geplante Bloecke`
- Einfuegen als neuer `planned`-Block direkt nach `V98`, weil `V103` fachlich an den Settings-/Ownership-Pfad anschliesst, aber vor spaeteren Recorder-/Console-/Governance-Bloecken liegen sollte.

Vorgeschlagene Tabellenzeile:

`| V103 | Settings-Domain Nachhaltigkeit, Mutationsvertrag und Erweiterungspfad | planned | P2 | frei | V92.99 | 103.1 | docs/plaene/aktiv/V103.md |`

Empfohlene Dependency-Ergaenzungen:

- `| V103 | V92.99 | hard | ja | Ownership-/Facade-Ratchet aus V92 ist die bindende Leitplanke fuer nachhaltige Settings-Pfade und Store-/Facade-Zuschnitte |`
- `| V103 | V98.99 | soft | ja | V98 haertet angrenzende Settings-Studio-/Policy-Pfade; sinnvoll als Synchronisationspunkt, aber kein Startblocker fuer den Core-Settings-Zuschnitt |`

Empfohlene Reihenfolge-Ergaenzung:

- In der Kurzform nach `V98` einsortieren: `V76 -> V98 -> V103 -> V99 -> V100 -> V102 -> V75 -> V81 -> V94`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 103.1 Zielbild, API-Inventar und Erweiterungsregeln
status: open
goal: Nachhaltigen Zuschnitt statt naechstem Ad-hoc-Fix festlegen
output: Inventar der aktiven Mutationspfade plus verbindliche Erweiterungsregeln

- [ ] 103.1.1 Oeffentliche mutierende `SettingsManager`-Methoden und reale Call-Sites inventarisieren, inklusive `changedKeys`-Ownership, Seiteneffekt-Typ (`core`, `runtime`, `ui`) und Legacy-/Bypass-Markierung.
- [ ] 103.1.2 Erweiterungsregel dokumentieren: Neue Settings-Funktionalitaet landet zuerst in `src/core/settings/**` oder einem schmalen Settings-Port; `SettingsManager` bleibt Orchestrator-Fassade, `SettingsStore` kein frei konsumierbarer Querzugriff.

### 103.2 Persistenzpfad und Store-Zuschnitt
status: open
goal: Einen einzigen belastbaren Persistenzpfad schaffen
output: Symmetrische Load-/Save-Pipeline plus schmalerer Store-Zugriff

- [ ] 103.2.1 Kanonische Persistenzpipeline fuer `loadSettings` und `saveSettings` einziehen (`sanitize`, `rebase`, optionale Migration/Diagnostics) und Rohspeicherung im geaenderten Scope entfernen.
- [ ] 103.2.2 Direkte `settingsManager.store`-Nutzung in produktiven Call-Sites auf schmale Repository-/Port-Zugaenge umstellen oder als explizite Legacy-Adapter isolieren, ohne neue Ownership-Bypaesse zu erzeugen.

### 103.3 Einheitlicher Mutationsvertrag fuer Runtime und Settings-Domain
status: open
goal: Neue Features ueber stabilen Result-Vertrag erweiterbar machen
output: Gemeinsamer Result-Typ und nachgezogene Runtime-Consumer

- [ ] 103.3.1 Gemeinsamen Mutationsvertrag fuer Preset-, Session-, Developer- und Text-Override-Pfade einfuehren (`success`, `reason`, `changedKeys`, optionale `metadata`/`warnings`).
- [ ] 103.3.2 Runtime-Services im betroffenen Scope so nachziehen, dass `changedKeys` und Fehlgruende primaer aus dem Result-Vertrag kommen statt aus verstreuter Service-Sonderlogik.

### 103.4 Ownership-Cleanup zwischen Core, Runtime und UI
status: open
goal: V92-Leitplanke im Settings-Scope sichtbar absichern
output: Klare Grenzen fuer Seiteneffekte und UI-Metadaten

- [ ] 103.4.1 Direkte DOM-/Dokument-Seiteneffekte aus Core-Facades entfernen und ueber Runtime-/UI-Adapter an den passenden Stellen ausfuehren.
- [ ] 103.4.2 Keybind-Action-Listen und vergleichbare UI-Deskriptoren aus `SettingsManager` in ein stabiles Contract-/UI-Modul verschieben und Importpfade bereinigen.

### 103.5 Erweiterungs-Sicherheitsnetz und Dokumentation
status: open
goal: Nachhaltigkeit durch Tests und klare Einbauanleitung absichern
output: Gezielte Tests und dokumentierter Erweiterungspfad

- [ ] 103.5.1 Contract-Tests fuer Persistenzsymmetrie, Mutationsresultate, `changedKeys`-Verhalten und Ownership-Grenzen ergaenzen oder nachziehen.
- [ ] 103.5.2 Architekturkontext und Referenzdoku um einen kompakten Einbaupfad fuer neue Settings-Funktionen erweitern (`wohin mit Domain-Logik`, `wer liefert changedKeys`, `wo duerfen UI-Seiteneffekte passieren`, `wie bleibt V92 eingehalten`).

### 103.99 Abschluss-Gate
status: open
goal: Nachhaltigkeits-Follow-up reproduzierbar abschliessen
output: Gruene Contract-/Governance-Nachweise ohne neue Legacy-Aufweitungen

- [ ] 103.99.1 Gezielte Settings-Contract-Tests fuer den Blockscope sind gruen.
- [ ] 103.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.
- [ ] 103.99.3 Im geaenderten Scope gibt es keine neuen produktiven `settingsManager.store`-Reads und keine neuen Core-zu-DOM-Seiteneffekte.

## Risiken

- R1 | mittel | Ein zu breiter Refactor reaktiviert genau die Manager-Aufblaehung, die V53 bereits zurueckgeschnitten hat.
- R2 | hoch | Store-Kapselung kann bestehende Profile-/Runtime-Pfade brechen, wenn Legacy-Aufrufer nicht vorher sauber inventarisiert werden.
- R3 | mittel | Ueberlappung mit Settings-Studio-/Browser-Demo-Arbeit erzeugt Merge-Konflikte, falls `V98` im Master noch als offen behandelt wird.
- R4 | mittel | Ein einheitlicher Mutationsvertrag bleibt wirkungslos, wenn Runtime-Services ihn nur teilweise konsumieren und weiter ad-hoc-`changedKeys` streuen.
- R5 | niedrig | Zu viel Doku ohne Tests schafft Scheinsicherheit; Nachhaltigkeit entsteht hier nur, wenn Ratchets und Contract-Tests gemeinsam nachgezogen werden.
