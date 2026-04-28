# B12 Editor, Content und Authoring - Findings

Stand: 2026-04-29
Status: abgeschlossen
Planquelle: [README.md](./README.md)

## Scope

- `editor/js/**`
- `src/entities/mapSchema/**`
- `src/entities/CustomMapLoader.js`
- `src/entities/GeneratedLocalMaps.js`
- `src/core/config/MapPresets.js`
- `src/shared/vehicle-lab/**`

## Prueffokus

- Editor-Runtime-Paritaet
- Map-Schema-, Loader- und Preset-Konsistenz
- Authoring-, Serialization- und Import/Export-Pfade
- Vehicle-Lab- und Content-Bridge-Kopplung

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B12-F01 | hoch | Editor-Roundtrip verwirft Parcours-Topologie und Regelparameter | `editor/js/EditorMapSerializer.js`, `src/entities/systems/ParcoursProgressUtils.js`, `src/core/config/maps/presets/parcours_maps.js` | Der Import reduziert Checkpoints auf `id`, `aliasOf`, `radius` und `forward`, waehrend der Export anschliessend `routeId: 'editor_route_v1'` plus harte Regeln neu aufbaut und keine `nextIds` oder `params` mehr serialisiert. Die Runtime nutzt genau diese Felder fuer Branching, Cooldowns und Strafzeiten; das shipped Preset `parcours_rift` verwendet `routeId`, `wrongOrderPenaltyMs` und `nextIds` aktiv. | Checkpoint- und Parcours-Metadaten vollstaendig roundtrip-faehig machen (`nextIds`, `params`, `routeId`, Regelparameter) und einen Roundtrip-Regressionstest mit einem bestehenden Parcours-Preset absichern. | offen |
| B12-F02 | mittel | Der visuelle Editor kann zentrale Runtime-Mapfeatures nicht selbst authoren | `editor/js/ui/EditorBuildCatalog.js`, `editor/js/EditorMapManager.js`, `editor/js/EditorMapSerializer.js`, `src/core/config/maps/presets/*.js` | Der Build-Katalog bietet nur Platzierung fuer Geometrie, Portale, Spawns, Pickups, Aircraft und Parcours-Checkpoints. Felder wie `portalLevels`, `gates`, `portalMode`, `itemSpawnMode`, `glbModel` und `glbColliderMode` werden nur aus `mapDocumentMeta` durchgereicht, das aus Imports stammt oder beim Reset leer ist. Gleichzeitig nutzen mehrere produktive Presets `portalLevels` und `gates`. | Ein explizites Metadata-/Authoring-Panel fuer diese Runtime-Felder einfuehren oder den JSON-only-Workflow sichtbar markieren und gegen unbeabsichtigte Feature-Verluste absichern. | offen |
| B12-F03 | mittel | Editor-Diagnostik meldet neue Parcours-Scope unzuverlaessig | `editor/js/EditorMapSerializer.js`, `editor/js/EditorMapManager.js`, `editor/js/main.js` | `resolveMapAuthoringStatus()` leitet `parcoursEnabled` aus `manager.mapDocumentMeta?.parcours?.enabled` ab. Neue Checkpoints im Scene-Graph setzen dieses Flag aber nicht; `mapDocumentMeta` wird nur bei Import gesetzt und bei `clearAllObjects()` geleert. Dadurch bleibt der Runtime-Snapshot `CURVIOS_EDITOR.getState().authoringStatus` fuer frisch gebaute Parcours zu lange auf `false` und verpasst z. B. die fehlende Finish-Warnung. | `parcoursEnabled` aus den platzierten Checkpoint-Objekten ableiten oder `mapDocumentMeta.parcours.enabled` auf Editor-Mutationen synchron halten. | offen |

## Offene Fragen

- Soll der Editor bewusst nur ein Geometrie-/JSON-Hybrid bleiben, oder ist Runtime-Paritaet fuer neue Maps ein explizites Produktziel?
- Sollen bestehende Parcours-Presets als Roundtrip-Fixture in eine dedizierte Import/Export-Regression fuer den Editor aufgenommen werden?

## Folgearbeit

- B12-F01 priorisiert angehen, weil der aktuelle Roundtrip branchende Parcours-Presets semantisch veraendert.
- Fuer B12-F02 zuerst entscheiden, ob Metadata-Authoring UI oder klar dokumentierter JSON-only-Scope das Zielbild ist.
- B12-F03 als kleine Guard-/QA-Haertung mit einer Snapshot-Pruefung fuer `authoringStatus` nach frisch platzierten Checkpoints absichern.
