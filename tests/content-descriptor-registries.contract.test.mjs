import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CONTENT_DESCRIPTOR_TYPES,
    CONTENT_DESCRIPTOR_VERSION,
} from '../src/shared/contracts/ContentDescriptorContract.js';
import {
    getRuntimeMapPresetRegistryDescriptor,
} from '../src/shared/contracts/RuntimeMapCatalogContract.js';
import { MAP_PRESETS } from '../src/core/config/MapPresets.js';
import {
    getEditorBuildCatalogDescriptor,
    getEditorTemplateRegistryDescriptor,
} from '../editor/js/ui/EditorBuildCatalog.js';
import {
    getArcadeMissionRegistryDescriptor,
} from '../src/shared/contracts/ArcadeMissionContract.js';
import {
    getArcadeModifierRegistryDescriptor,
} from '../src/shared/contracts/ArcadeModifierContract.js';
import {
    getArcadeRewardRegistryDescriptor,
} from '../src/shared/contracts/ArcadeRewardContract.js';
import {
    getVehicleRegistryDescriptor,
} from '../src/entities/vehicle-registry.js';
import {
    ARCADE_SECTOR_CATALOG,
} from '../src/entities/directors/ArcadeEncounterCatalog.js';

function assertRegistryEnvelope(registry, descriptorType) {
    assert.ok(registry && typeof registry === 'object');
    assert.equal(registry.descriptorVersion, CONTENT_DESCRIPTOR_VERSION);
    assert.equal(registry.descriptorType, descriptorType);
    assert.ok(Array.isArray(registry.entries));
    assert.equal(registry.entryCount, registry.entries.length);
}

test('V85.3 content descriptors expose shared registry envelopes', () => {
    const mapRegistry = getRuntimeMapPresetRegistryDescriptor(MAP_PRESETS);
    assertRegistryEnvelope(mapRegistry, CONTENT_DESCRIPTOR_TYPES.RUNTIME_MAP_PRESETS);
    assert.ok(mapRegistry.entries.some((entry) => entry.id === 'standard'));

    const editorBuildRegistry = getEditorBuildCatalogDescriptor();
    assertRegistryEnvelope(editorBuildRegistry, CONTENT_DESCRIPTOR_TYPES.EDITOR_BUILD_CATALOG);
    assert.ok(editorBuildRegistry.entries.some((entry) => entry.id === 'build-hard'));

    const editorTemplateRegistry = getEditorTemplateRegistryDescriptor();
    assertRegistryEnvelope(editorTemplateRegistry, CONTENT_DESCRIPTOR_TYPES.EDITOR_TEMPLATES);
    assert.equal(editorTemplateRegistry.status, 'missing');
    assert.equal(editorTemplateRegistry.entryCount, 0);

    const missionRegistry = getArcadeMissionRegistryDescriptor();
    assertRegistryEnvelope(missionRegistry, CONTENT_DESCRIPTOR_TYPES.ARCADE_MISSIONS);
    assert.ok(missionRegistry.entries.some((entry) => entry.id === 'KILL_COUNT'));

    const modifierRegistry = getArcadeModifierRegistryDescriptor();
    assertRegistryEnvelope(modifierRegistry, CONTENT_DESCRIPTOR_TYPES.ARCADE_MODIFIERS);
    assert.ok(modifierRegistry.entries.some((entry) => entry.id === 'tight_turns'));

    const rewardRegistry = getArcadeRewardRegistryDescriptor();
    assertRegistryEnvelope(rewardRegistry, CONTENT_DESCRIPTOR_TYPES.ARCADE_REWARDS);
    assert.ok(rewardRegistry.entries.some((entry) => entry.id === 'run_speed_t1'));

    const vehicleRegistry = getVehicleRegistryDescriptor();
    assertRegistryEnvelope(vehicleRegistry, CONTENT_DESCRIPTOR_TYPES.VEHICLES);
    assert.ok(vehicleRegistry.entries.some((entry) => entry.id === 'ship5'));
});

test('V85.3 arcade sector pools resolve against descriptor-backed registries', () => {
    const mapIds = new Set(
        getRuntimeMapPresetRegistryDescriptor(MAP_PRESETS).entries.map((entry) => entry.id)
    );
    const modifierIds = new Set(
        getArcadeModifierRegistryDescriptor().entries.map((entry) => entry.id)
    );
    const rewardIds = new Set(
        getArcadeRewardRegistryDescriptor().entries.map((entry) => entry.id)
    );

    ARCADE_SECTOR_CATALOG.forEach((template) => {
        (template.mapPool || []).forEach((mapId) => {
            assert.ok(mapIds.has(mapId), `Unknown map descriptor in sector pool: ${mapId}`);
        });
        (template.modifierPool || []).forEach((modifierId) => {
            assert.ok(modifierIds.has(modifierId), `Unknown modifier descriptor in sector pool: ${modifierId}`);
        });
        (template.rewardPool || []).forEach((rewardId) => {
            assert.ok(rewardIds.has(rewardId), `Unknown reward descriptor in sector pool: ${rewardId}`);
        });
    });
});
