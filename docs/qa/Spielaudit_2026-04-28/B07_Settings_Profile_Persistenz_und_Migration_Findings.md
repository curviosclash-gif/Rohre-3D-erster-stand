# B07 Settings, Profile, Persistenz und Migration - Findings

Stand: 2026-04-29
Status: offen
Planquelle: [README.md](./README.md)

## Scope

Initiale Sichtung 2026-04-29:

- `src/ui/SettingsStore.js`
- `src/core/ProfileManager.js`
- `src/ui/ProfileTransferOps.js`
- `src/core/settings/SettingsSanitizerOps.js`
- `src/ui/UISettingsSyncMap.js`
- `src/ui/SettingsChangeKeys.js`
- `src/state/storage/StorageDriver.js`
- `src/state/storage/StoragePlatform.js`
- `src/ui/menu/MenuDeveloperModeOps.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/ui/menu/MenuDefaultsEditorConfig.js`
- `tests/persistence-version-migration.contract.test.mjs`
- `tests/core-targeted-surface.spec.js`

- `src/core/settings/**`
- `src/ui/SettingsStore.js`
- `src/ui/UISettingsSyncMap.js`
- `src/ui/SettingsChange*`
- `src/ui/Profile*`
- `src/state/storage/**`
- `src/core/ProfileManager.js`
- `src/shared/contracts/*Settings*`
- `src/shared/runtime/BrowserStoragePorts.js`

## Prueffokus

- Settings-Ownership und Sync-Richtung
- Profil-, Persistenz- und Storage-Migrationspfade
- Contract-Versionen und Fallback-Verhalten
- Desktop-, Browser- und Local-Settings-Abgrenzung

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B07-F01 | hoch | Fehlgeschlagene Profil-Persistenz laesst `ProfileManager` in einen Phantomzustand kippen | `src/core/ProfileManager.js`, `src/ui/ProfileUiController.js`, `src/state/storage/StorageDriver.js`, `src/state/storage/StoragePlatform.js` | `StorageDriver.writeRaw()` und `StoragePlatform.writeJson()` modellieren reale Fehlpfade wie `storage_unavailable` und `quotaExceeded` (`src/state/storage/StorageDriver.js:31-44`, `src/state/storage/StoragePlatform.js:50-67`). Trotzdem mutiert `ProfileManager` seine In-Memory-Quelle jeweils vor dem Persist-Check: bei Save (`src/core/ProfileManager.js:95-107`), Duplicate (`src/core/ProfileManager.js:140-149`), Import (`src/core/ProfileManager.js:214-226`), Default-Wechsel (`src/core/ProfileManager.js:250-263`) und Delete (`src/core/ProfileManager.js:278-285`). `ProfileUiController` synchronisiert seinen UI-Snapshot dagegen nur im Erfolgsfall und bricht bei Fehler sofort ab (`src/ui/ProfileUiController.js:123-128`, `src/ui/ProfileUiController.js:150-155`, `src/ui/ProfileUiController.js:209-214`, `src/ui/ProfileUiController.js:243-247`, `src/ui/ProfileUiController.js:259-263`). Damit entstehen nach einem fehlgeschlagenen Write Phantom-Profile bzw. Phantom-Deletes im Manager, waehrend die UI weiterhin einen Fehler meldet und den alten sichtbaren Zustand zeigt. | Profile-Mutationen erst nach erfolgreichem Persist committen oder bei Fehlern atomar auf den vorherigen Snapshot zurueckrollen; zusaetzlich einen negativen Contract-Test fuer `saveProfile`/`importProfile`/`deleteProfile` mit `writeJson -> { ok: false }` nachziehen. | offen |
| B07-F02 | hoch | Profile kapseln lokale Session-, Tooling- und Developer-Zustaende statt nur portable Settings | `src/core/settings/SettingsSanitizerOps.js`, `src/ui/ProfileTransferOps.js`, `src/core/ProfileManager.js`, `src/ui/ProfileUiController.js`, `src/ui/SettingsChangeKeys.js`, `src/ui/menu/MenuDeveloperModeOps.js`, `src/core/runtime/MenuRuntimeSessionService.js`, `src/ui/menu/MenuDefaultsEditorConfig.js` | Der Sanitizer uebernimmt `localSettings` und menueigene Vertragsobjekte ungefiltert in den kanonischen Snapshot (`src/core/settings/SettingsSanitizerOps.js:199-220`). Profile exportieren und importieren anschliessend den kompletten `settings`-Payload (`src/ui/ProfileTransferOps.js:167-175`), `ProfileManager.loadProfile()` gibt diesen Snapshot wieder aus (`src/core/ProfileManager.js:155-166`) und `ProfileUiController.loadProfile()` setzt ihn direkt als aktive Settings (`src/ui/ProfileUiController.js:171-184`). Gleichzeitig leben unter `localSettings` nicht nur Theme und Shadow-Quality (`src/ui/SettingsChangeKeys.js:5-6`, `src/core/runtime/MenuRuntimeSessionService.js:439-489`), sondern auch persistente Session-/UI-Caches wie `toolsState` und `eventPlaylistState` (`src/ui/menu/MenuDefaultsEditorConfig.js:351-358`) sowie Developer-Flags wie `developerModeEnabled`, `developerThemeId`, `fixedPresetLockEnabled`, `actorId` und `releasePreviewEnabled` (`src/ui/menu/MenuDeveloperModeOps.js:53-130`). Damit transportiert ein Profil-Load oder Profil-Import nicht nur Gameplay-Konfiguration, sondern auch lokale Oberflaechen-, Session- und Entwicklerzustand ueber Maschinen- und Surface-Grenzen hinweg. | Den Profilvertrag auf portable Settings zuschneiden und `localSettings`/Developer-/UI-Session-Caches vor Save, Export und Import explizit ausfiltern oder in einen getrennten lokalen Snapshot verschieben; solange das nicht geklaert ist, Profiltransfer als `portable gameplay preset` statt `voller Settings-Snapshot` eindeutig dokumentieren. | offen |
| B07-F03 | mittel | Profil-Deduplizierung verletzt den eigenen Vertrag und kann neuere Eintraege verwerfen | `src/shared/contracts/SettingsProfileContract.js`, `src/ui/SettingsStore.js` | `normalizeProfileEntries()` behauptet laut Kommentar, doppelte Profile zu entfernen und den zuletzt aktualisierten Eintrag zu behalten, implementiert aber nur Sortierung plus Flag-Normalisierung (`src/shared/contracts/SettingsProfileContract.js:33-55`). `SettingsStore.saveProfiles()` serialisiert genau dieses Ergebnis unveraendert (`src/ui/SettingsStore.js:159-167`), dedupliziert also auf dem Write-Pfad nicht. `SettingsStore.loadProfiles()` ueberspringt Duplikate zwar spaeter per `used`-Set, tut das aber vor `normalizeProfileEntries()` in der Originalreihenfolge (`src/ui/SettingsStore.js:129-143`). Falls ein migrierter, manuell gemergter oder anderweitig inkonsistenter Storage-Snapshot doppelte Namen enthaelt, gewinnt deshalb nicht der neueste `updatedAt`-Eintrag, sondern schlicht das erste Array-Element; der juengere Stand geht still verloren. | Deduplizierung zentral in `normalizeProfileEntries()` mit eindeutiger `updatedAt`-Praeferenz implementieren und sowohl Save- als auch Load-Pfad nur noch darueber laufen lassen; dazu einen Contract-Test fuer doppelte Namen mit gegensaetzlichen `updatedAt`-Werten ergaenzen. | offen |
| B07-F04 | mittel | Zukunfts-Schemata fuer den Profilspeicher werden still als leere Profilmenge behandelt | `src/ui/SettingsStore.js`, `src/shared/contracts/ArtifactVersionMigrationContract.js`, `src/core/ProfileManager.js`, `tests/persistence-version-migration.contract.test.mjs` | `SettingsStore.loadProfiles()` verwirft jeden Snapshot mit `versionState.shouldReject` kommentarlos und liefert einfach `[]` zurueck (`src/ui/SettingsStore.js:115-150`). `resolveArtifactVersionState()` stuft unbekannte oder zukuenftige Versionen standardmaessig als `REJECT` ein (`src/shared/contracts/ArtifactVersionMigrationContract.js:146-171`). `ProfileManager` uebernimmt dieses leere Ergebnis beim Start ohne Warnung als kanonischen Arbeitsstand (`src/core/ProfileManager.js:19-22`). Gleichzeitig deckt der existierende Persistence-Test fuer Profile nur das Legacy-Array-Upgrade ab (`tests/persistence-version-migration.contract.test.mjs:208-225`), nicht den Reject-Pfad. In einer Downgrade- oder Mischversionslage verschwinden Profile damit zunaechst still aus der UI; jede anschliessende erfolgreiche Speicherung schreibt den leeren/neu aufgebauten Stand wieder unter denselben Key und kann die urspruenglichen Profildaten praktisch ueberfahren. | Zukunfts-/Reject-Pfade fuer `settings-profiles` explizit als blockierenden Migrationsfehler surfacen statt als leere Liste zu behandeln; mindestens einen Contract-Test fuer `schemaVersion` aus einer zukuenftigen Version und einen UI-/Manager-Pfad mit sichtbarer Fehlerrueckmeldung nachziehen. | offen |

## Offene Fragen

- Soll ein Profil im Produkt wirklich den kompletten Settings-Snapshot inklusive `localSettings`, Session-Caches und Developer-Flags transportieren, oder ist eigentlich ein portabler Gameplay-/Match-Preset gemeint?
- Wie sollen `SettingsStore.loadProfiles()` und angrenzende UI-Pfade reagieren, wenn ein gespeicherter Profil-Snapshot wegen Zukunfts- oder Fehler-Schema nicht lesbar ist: hart ablehnen mit Nutzerhinweis oder bewusst leeren Fallback fahren?

## Folgearbeit

- Sichtung auf `src/core/settings/SettingsSessionDraftFacade.js`, `src/core/settings/SettingsDeveloperFacade.js`, `src/shared/contracts/SettingsRuntimeContract.js` und `src/shared/contracts/SettingsProfileContract.js` erweitern, um die fachlich beabsichtigte Grenze zwischen portablem Profil, lokalem UI-State und Developer-State eindeutig zu belegen.
- Pruefen, welche Konsumenten ausserhalb des Profilpfads `settings.localSettings` produktiv voraussetzen, damit ein spaeterer Zuschnitt keine Session-/Theme-/Transport-Rehydration still bricht.
- Negativtests fuer Storage-Failures und Duplicate-Profile in den bestehenden Persistence-/Profile-Contracts nachziehen, falls aus dem Audit ein Fix-Block entsteht.
