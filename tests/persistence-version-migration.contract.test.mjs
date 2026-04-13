import assert from 'node:assert/strict';
import test from 'node:test';

import { REPLAY_EXPORT_CONTRACT_VERSION, ReplayRecorder } from '../src/core/replay/ReplayRecorder.js';
import { MAP_SCHEMA_VERSION } from '../src/entities/mapSchema/MapSchemaConstants.js';
import { migrateMapDocument } from '../src/entities/mapSchema/MapSchemaMigrationOps.js';
import {
    CUSTOM_MAP_STORAGE_CAPABILITY_CONTRACT_VERSION,
    loadCustomMapFromStorage,
    resolveCustomMapStorageCapability,
} from '../src/entities/CustomMapLoader.js';
import { loadVehicleProfiles } from '../src/state/arcade/ArcadeVehicleProfile.js';
import {
    ARTIFACT_VERSION_DECISIONS,
    resolveArtifactVersionState,
} from '../src/shared/contracts/ArtifactVersionMigrationContract.js';
import { SettingsStore } from '../src/ui/SettingsStore.js';
import { createVehicleManagerLoadoutPresetStore } from '../src/ui/arcade/vehicle-manager/VehicleManagerLoadoutPresets.js';
import { MenuDraftStore } from '../src/ui/menu/MenuDraftStore.js';
import {
    exportMenuConfigAsJson,
    importMenuConfigFromInput,
    MENU_CONFIG_SHARE_CONTRACT_VERSION,
} from '../src/ui/menu/MenuConfigShareOps.js';
import { MenuTelemetryStore } from '../src/ui/menu/MenuTelemetryStore.js';
import { MenuTextOverrideStore } from '../src/ui/menu/MenuTextOverrideStore.js';
import { parseProfileImport } from '../src/ui/ProfileTransferOps.js';

function createMemoryStoragePlatform(initialRecords = {}) {
    const records = new Map(Object.entries(initialRecords));
    return {
        driver: { storage: null },
        readJson(key, legacyKeys = [], fallback = null) {
            const candidates = [key, ...(Array.isArray(legacyKeys) ? legacyKeys : [])];
            for (const candidate of candidates) {
                if (!records.has(candidate)) continue;
                return records.get(candidate);
            }
            return fallback;
        },
        writeJson(key, value) {
            records.set(key, value);
            return { ok: true, reason: 'ok', quotaExceeded: false };
        },
        remove(key) {
            records.delete(key);
            return { ok: true, reason: 'ok', quotaExceeded: false };
        },
        getRecord(key) {
            return records.get(key);
        },
    };
}

test('V85.2 migration contract classifies current, upgrade, fallback, and reject decisions', () => {
    const current = resolveArtifactVersionState({ schemaVersion: 2 }, {
        artifactType: 'settings',
        versionFields: ['schemaVersion'],
        supportedVersions: [1, 2],
        currentVersion: 2,
        allowMissingVersion: true,
        coerceNumericVersions: true,
    });
    assert.equal(current.decision, ARTIFACT_VERSION_DECISIONS.CURRENT);

    const upgrade = resolveArtifactVersionState({ schemaVersion: 1 }, {
        artifactType: 'settings',
        versionFields: ['schemaVersion'],
        supportedVersions: [1, 2],
        currentVersion: 2,
        allowMissingVersion: true,
        coerceNumericVersions: true,
    });
    assert.equal(upgrade.decision, ARTIFACT_VERSION_DECISIONS.UPGRADE);

    const fallback = resolveArtifactVersionState({}, {
        artifactType: 'settings',
        versionFields: ['schemaVersion'],
        supportedVersions: [1, 2],
        currentVersion: 2,
        allowMissingVersion: true,
        coerceNumericVersions: true,
    });
    assert.equal(fallback.decision, ARTIFACT_VERSION_DECISIONS.FALLBACK);

    const reject = resolveArtifactVersionState({ schemaVersion: 3 }, {
        artifactType: 'settings',
        versionFields: ['schemaVersion'],
        supportedVersions: [1, 2],
        currentVersion: 2,
        allowMissingVersion: true,
        coerceNumericVersions: true,
    });
    assert.equal(reject.decision, ARTIFACT_VERSION_DECISIONS.REJECT);
});

test('V85.2 profile import rejects unknown contract versions but keeps legacy fallback', () => {
    const normalizeProfileName = (value) => String(value || '').trim();
    const rejectResult = parseProfileImport(JSON.stringify({
        contractVersion: 'profile-export.v2',
        profile: {
            name: 'Pilot',
            settings: {},
        },
    }), { normalizeProfileName });
    assert.equal(rejectResult.success, false);
    assert.match(rejectResult.error || '', /contractVersion/i);

    const legacyResult = parseProfileImport(JSON.stringify({
        name: 'Legacy Pilot',
        settings: {},
    }), { normalizeProfileName });
    assert.equal(legacyResult.success, true);
    assert.equal(legacyResult.profile?.name, 'Legacy Pilot');

    const invalidVersionResult = parseProfileImport(JSON.stringify({
        contractVersion: '  ',
        profile: {
            name: 'Invalid Pilot',
            settings: {},
        },
    }), { normalizeProfileName });
    assert.equal(invalidVersionResult.success, false);
    assert.match(invalidVersionResult.error || '', /contractVersion/i);
});

test('V85.2 map migration keeps legacy fallback and rejects future schema versions', () => {
    const migrated = migrateMapDocument({
        schemaVersion: 2,
        arenaSize: { width: 1200, height: 400, depth: 900 },
    });
    assert.equal(migrated.map.schemaVersion, MAP_SCHEMA_VERSION);
    assert.ok(migrated.warnings.some((entry) => String(entry).includes('Map schema v2 detected')));

    assert.throws(
        () => migrateMapDocument({ schemaVersion: MAP_SCHEMA_VERSION + 1 }),
        /Unsupported schemaVersion/
    );
});

test('V85.2 replay exports include contractVersion and legacy version alias', () => {
    const recorder = new ReplayRecorder();
    const replay = recorder.getReplay();
    assert.equal(replay.contractVersion, REPLAY_EXPORT_CONTRACT_VERSION);
    assert.equal(replay.version, REPLAY_EXPORT_CONTRACT_VERSION);
});

test('V85.4 menu config share import/export validates contractVersion with legacy fallback', () => {
    const exportedPayload = JSON.parse(exportMenuConfigAsJson({
        mapKey: 'arena_simple',
        numBots: 2,
        localSettings: { sessionType: 'solo' },
    }));
    assert.equal(exportedPayload.contractVersion, MENU_CONFIG_SHARE_CONTRACT_VERSION);
    assert.ok(exportedPayload.payload && typeof exportedPayload.payload === 'object');

    const settings = {};
    const importResult = importMenuConfigFromInput(settings, JSON.stringify(exportedPayload));
    assert.equal(importResult.success, true);
    assert.equal(importResult.usedLegacyFallback, false);
    assert.equal(settings.mapKey, 'arena_simple');

    const legacyResult = importMenuConfigFromInput(settings, JSON.stringify({
        mapKey: 'arena_legacy',
        numBots: 1,
    }));
    assert.equal(legacyResult.success, true);
    assert.equal(legacyResult.usedLegacyFallback, true);
    assert.equal(settings.mapKey, 'arena_legacy');

    const rejectResult = importMenuConfigFromInput(settings, JSON.stringify({
        contractVersion: 'menu-config-share.v9',
        payload: { mapKey: 'arena_reject' },
    }));
    assert.equal(rejectResult.success, false);
    assert.equal(rejectResult.reason, 'unsupported_contract_version');
});

test('V85.2 settings profiles migrate legacy arrays into schema envelope', () => {
    const platform = createMemoryStoragePlatform({
        'cuviosclash.settings-profiles.v1': [
            { name: 'Pilot', settings: { speed: 1 } },
        ],
    });
    const store = new SettingsStore({
        storagePlatform: platform,
        sanitizeSettings: (settings) => ({ ...(settings || {}) }),
    });
    const profiles = store.loadProfiles();
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].name, 'Pilot');

    const persisted = platform.getRecord('cuviosclash.settings-profiles.v1');
    assert.equal(persisted.schemaVersion, 'settings-profiles.v1');
    assert.ok(Array.isArray(persisted.profiles));
});

test('V85.2 menu draft/text/telemetry stores migrate legacy payloads to schema wrappers', () => {
    const draftPlatform = createMemoryStoragePlatform({
        'cuviosclash.menu-drafts.v1': {
            single: { mapKey: 'arena_simple' },
        },
    });
    const draftStore = new MenuDraftStore({ storagePlatform: draftPlatform });
    const draft = draftStore.loadDraft('single');
    assert.ok(draft);
    const draftPersisted = draftPlatform.getRecord('cuviosclash.menu-drafts.v1');
    assert.equal(draftPersisted.schemaVersion, 'menu-draft-store.v1');
    assert.ok(draftPersisted.drafts && typeof draftPersisted.drafts === 'object');

    const textPlatform = createMemoryStoragePlatform({
        'cuviosclash.menu-text-overrides.v1': {
            'menu.start': '  Start Jetzt  ',
        },
    });
    const textStore = new MenuTextOverrideStore({ storagePlatform: textPlatform });
    const overrides = textStore.listOverrides();
    assert.equal(overrides['menu.start'], 'Start Jetzt');
    const textPersisted = textPlatform.getRecord('cuviosclash.menu-text-overrides.v1');
    assert.equal(textPersisted.schemaVersion, 'menu-text-overrides.v1');
    assert.equal(textPersisted.overrides['menu.start'], 'Start Jetzt');

    const telemetryPlatform = createMemoryStoragePlatform({
        'cuviosclash.menu-telemetry.v1': {
            startAttempts: 3,
            events: [{ type: 'start_attempt', at: 'now', payload: null }],
        },
    });
    const telemetryStore = new MenuTelemetryStore({ storagePlatform: telemetryPlatform });
    const snapshot = telemetryStore.getSnapshot();
    assert.equal(snapshot.startAttempts, 3);
    const telemetryPersisted = telemetryPlatform.getRecord('cuviosclash.menu-telemetry.v1');
    assert.equal(telemetryPersisted.schemaVersion, 'menu-telemetry.v1');
    assert.ok(telemetryPersisted.state && typeof telemetryPersisted.state === 'object');
});

test('V85.2 arcade persistence drops rejected future schemas and rewrites legacy payloads', () => {
    const profileStore = {
        data: {
            ship1: { xp: 120, level: 2, upgrades: { core_t2: 'T2' } },
            ship2: { schemaVersion: 'arcade-vehicle-profile.v9', xp: 9999 },
        },
        saved: null,
        loadJsonRecord() {
            return this.data;
        },
        saveJsonRecord(_key, value) {
            this.saved = value;
        },
    };
    const profiles = loadVehicleProfiles(profileStore);
    assert.ok(profiles.ship1);
    assert.equal(profiles.ship1.schemaVersion, 'arcade-vehicle-profile.v1');
    assert.equal(profiles.ship2, undefined);
    assert.ok(profileStore.saved);
    assert.equal(profileStore.saved.ship2, undefined);

    const loadoutStore = {
        data: {
            presets: [
                {
                    vehicleId: 'ship5',
                    name: 'Burst',
                    upgrades: { wing_left_t2: 'T2' },
                },
            ],
        },
        saved: null,
        loadJsonRecord() {
            return this.data;
        },
        saveJsonRecord(_key, value) {
            this.saved = value;
            this.data = value;
        },
    };
    const loadoutPresetStore = createVehicleManagerLoadoutPresetStore({ store: loadoutStore });
    const presets = loadoutPresetStore.listPresets('ship5');
    assert.equal(presets.length, 1);
    assert.equal(loadoutStore.saved?.schemaVersion, 'arcade-vehicle-loadouts.v1');
});

test('V85.4 custom-map import exposes explicit browser storage capability contract', () => {
    const capability = resolveCustomMapStorageCapability();
    assert.equal(capability.contractVersion, CUSTOM_MAP_STORAGE_CAPABILITY_CONTRACT_VERSION);
    assert.equal(typeof capability.available, 'boolean');
    if (capability.available) {
        assert.equal(capability.degradedReason, '');
    } else {
        assert.equal(capability.degradedReason, 'storage_unavailable');
    }

    const result = loadCustomMapFromStorage();
    assert.equal(result.capability?.contractVersion, CUSTOM_MAP_STORAGE_CAPABILITY_CONTRACT_VERSION);
    if (result.ok) {
        assert.equal(result.capability?.available, true);
    } else {
        assert.equal(typeof result.error, 'string');
    }
});
