import assert from 'node:assert/strict';
import test from 'node:test';

import { SETTINGS_CHANGE_KEYS } from '../src/composition/core-ui/CoreSettingsPorts.js';
import { SettingsManager } from '../src/core/SettingsManager.js';
import { SettingsStore } from '../src/ui/SettingsStore.js';
import { STORAGE_KEYS } from '../src/ui/StorageKeys.js';
import { MENU_TEXT_CATALOG } from '../src/ui/menu/MenuTextCatalog.js';

function createMemoryStoragePlatform(initialRecords = {}, options = {}) {
    const records = new Map(Object.entries(initialRecords));
    const writeJson = typeof options.writeJson === 'function'
        ? options.writeJson
        : (key, value) => {
            records.set(key, value);
            return { ok: true, reason: 'ok', quotaExceeded: false };
        };
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
            return writeJson(key, value, records);
        },
        getRecord(key) {
            return records.get(key);
        },
    };
}

function createOwnerAccessContext(overrides = {}) {
    return {
        ownerId: 'owner',
        actorId: 'owner',
        isOwner: true,
        developerModeVisibility: 'owner_only',
        developerModeEnabled: true,
        releasePreviewEnabled: false,
        expertModeUnlocked: true,
        expertModeAvailable: true,
        expertModeAccessMode: 'owner_only',
        expertModeReason: '',
        expertModeProductSurfaceId: 'desktop-app',
        ...overrides,
    };
}

function createMemoryBrowserStorage(initialRecords = {}) {
    const records = new Map(
        Object.entries(initialRecords).map(([key, value]) => [key, String(value)])
    );
    return {
        getItem(key) {
            return records.has(key) ? records.get(key) : null;
        },
        setItem(key, value) {
            records.set(String(key), String(value));
        },
        removeItem(key) {
            records.delete(String(key));
        },
        clear() {
            records.clear();
        },
    };
}

function withMockLocalStorage(run) {
    const previous = globalThis.localStorage;
    globalThis.localStorage = createMemoryBrowserStorage();
    try {
        return run();
    } finally {
        if (typeof previous === 'undefined') {
            delete globalThis.localStorage;
        } else {
            globalThis.localStorage = previous;
        }
    }
}

test('V103 SettingsManager loadSettings rewrites persisted snapshots to canonical save shape', () => {
    const storagePlatform = createMemoryStoragePlatform({
        [STORAGE_KEYS.settings]: {
            mapKey: 'arena_simple',
            gameplay: {
                speed: 0.88,
            },
            localSettings: {
                sessionType: 'single',
            },
        },
    });
    const manager = new SettingsManager({ storagePlatform });

    const loadedSettings = manager.loadSettings();
    const persistedSettings = storagePlatform.getRecord(STORAGE_KEYS.settings);

    assert.deepEqual(persistedSettings, loadedSettings);
    assert.deepEqual(persistedSettings, manager.sanitizeSettings(persistedSettings));
});

test('V103 SettingsManager saveSettings persists the same canonical snapshot returned by loadSettings', () => {
    const storagePlatform = createMemoryStoragePlatform();
    const manager = new SettingsManager({ storagePlatform });
    const rawSettings = {
        mapKey: 'arena_simple',
        numBots: 3,
        gameplay: {
            speed: 1.12,
        },
        localSettings: {
            sessionType: 'multiplayer',
            multiplayerTransport: 'lan',
        },
    };

    const persisted = manager.saveSettings(rawSettings);
    const storedSettings = storagePlatform.getRecord(STORAGE_KEYS.settings);
    const canonicalSettings = manager.sanitizeSettings(rawSettings);

    assert.equal(persisted.success, true);
    assert.equal(persisted.reason, 'ok');
    assert.equal(persisted.metadata?.key, STORAGE_KEYS.settings);
    assert.deepEqual(storedSettings, canonicalSettings);
    assert.deepEqual(manager.loadSettings(), canonicalSettings);
});

test('V103 SettingsManager sanitizeSettings applies runtime-specific limit overrides from runtimeGlobal', () => {
    const storagePlatform = createMemoryStoragePlatform();
    const runtimeGlobal = {
        settingsDefaultsContract: {
            getOverrideSnapshot() {
                return {
                    draft: {
                        schemaVersion: 'menu-defaults-override.v1',
                        limitOverrides: {
                            'baseSettings.gameplay.speed': { max: 12 },
                        },
                    },
                };
            },
        },
    };
    const manager = new SettingsManager({ storagePlatform, runtimeGlobal });

    const sanitized = manager.sanitizeSettings({
        gameplay: {
            speed: 20,
        },
    });

    assert.equal(sanitized.gameplay.speed, 12);
});

test('V103 SettingsManager exposes a narrow record-store port for runtime consumers', () => {
    const storagePlatform = createMemoryStoragePlatform();
    const manager = new SettingsManager({ storagePlatform });
    const recordPort = manager.getSettingsRecordStorePort();

    assert.equal(typeof recordPort.loadJsonRecord, 'function');
    assert.equal(typeof recordPort.saveJsonRecord, 'function');
    assert.equal('loadSettings' in recordPort, false);
    assert.equal('saveSettings' in recordPort, false);

    assert.deepEqual(recordPort.saveJsonRecord('custom.record', { ok: true }), {
        success: true,
        reason: 'ok',
        metadata: {
            key: 'custom.record',
        },
    });
    assert.deepEqual(recordPort.loadJsonRecord('custom.record', null), { ok: true });
});

test('V103 SettingsManager persistence contract maps invalid_key, quota_exceeded and storage_failed reasons', () => {
    const quotaStoragePlatform = createMemoryStoragePlatform({}, {
        writeJson() {
            return {
                ok: false,
                reason: 'QuotaExceededError',
                quotaExceeded: true,
            };
        },
    });
    const quotaManager = new SettingsManager({ storagePlatform: quotaStoragePlatform });
    const quotaResult = quotaManager.saveSettings(quotaManager.createDefaultSettings());
    const quotaProfilesResult = quotaManager.getProfileStorePort().saveProfiles([]);

    assert.equal(quotaResult.success, false);
    assert.equal(quotaResult.reason, 'quota_exceeded');
    assert.equal(quotaResult.metadata?.storageReason, 'QuotaExceededError');
    assert.equal(quotaProfilesResult.success, false);
    assert.equal(quotaProfilesResult.reason, 'quota_exceeded');
    assert.equal(quotaProfilesResult.metadata?.key, STORAGE_KEYS.settingsProfiles);

    const failedStoragePlatform = createMemoryStoragePlatform({}, {
        writeJson() {
            return {
                ok: false,
                reason: 'storage_unavailable',
                quotaExceeded: false,
            };
        },
    });
    const failedManager = new SettingsManager({ storagePlatform: failedStoragePlatform });
    const failedResult = failedManager.saveSettings(failedManager.createDefaultSettings());
    const failedProfilesResult = failedManager.getProfileStorePort().saveProfiles([]);

    assert.equal(failedResult.success, false);
    assert.equal(failedResult.reason, 'storage_failed');
    assert.equal(failedResult.metadata?.storageReason, 'storage_unavailable');
    assert.equal(failedProfilesResult.success, false);
    assert.equal(failedProfilesResult.reason, 'storage_failed');
    assert.equal(failedProfilesResult.metadata?.key, STORAGE_KEYS.settingsProfiles);

    const manager = new SettingsManager({ storagePlatform: createMemoryStoragePlatform() });
    const recordPort = manager.getSettingsRecordStorePort();
    const invalidKeyResult = recordPort.saveJsonRecord('   ', { ok: true });

    assert.equal(invalidKeyResult.success, false);
    assert.equal(invalidKeyResult.reason, 'invalid_key');
});

test('V103 SettingsStore canonical rewrite check ignores property order for semantically identical data', () => {
    const sourceSettings = {
        gameplay: { speed: 1, planarMode: true },
        localSettings: { sessionType: 'single', modePath: 'quick_action' },
    };
    const reorderedSettings = {
        localSettings: { modePath: 'quick_action', sessionType: 'single' },
        gameplay: { planarMode: true, speed: 1 },
    };
    let writeCount = 0;
    const storagePlatform = createMemoryStoragePlatform(
        { [STORAGE_KEYS.settings]: sourceSettings },
        {
            writeJson(key, value, records) {
                writeCount += 1;
                records.set(key, value);
                return { ok: true, reason: 'ok', quotaExceeded: false };
            },
        }
    );
    const store = new SettingsStore({
        storagePlatform,
        sanitizeSettings: () => reorderedSettings,
        createDefaultSettings: () => ({}),
    });

    const loaded = store.loadSettings();

    assert.equal(writeCount, 0);
    assert.deepEqual(loaded, reorderedSettings);
});

test('V103 SettingsManager profile store port is immutable', () => {
    const manager = new SettingsManager({ storagePlatform: createMemoryStoragePlatform() });
    const profilePort = manager.getProfileStorePort();

    assert.equal(Object.isFrozen(profilePort), true);
});

test('V103 SettingsManager mutation facades expose a shared result contract', () => {
    withMockLocalStorage(() => {
        const storagePlatform = createMemoryStoragePlatform();
        const manager = new SettingsManager({ storagePlatform });
        const settings = manager.createDefaultSettings();
        settings.localSettings.ownerId = 'owner';
        settings.localSettings.actorId = 'owner';
        const accessContext = createOwnerAccessContext();
        const textId = Object.keys(MENU_TEXT_CATALOG)[0];

        const developerResult = manager.setDeveloperTheme(settings, 'classic-blue', accessContext);
        const presetResult = manager.saveMenuPreset(settings, { kind: 'open', name: 'Contract Preset' }, accessContext);
        const sessionResult = manager.switchSessionType(settings, 'splitscreen');
        const textResult = manager.setMenuTextOverride(textId, 'Contract override');

        assert.equal(developerResult.success, true);
        assert.equal(developerResult.reason, 'updated');
        assert.deepEqual(developerResult.changedKeys, [SETTINGS_CHANGE_KEYS.DEVELOPER_THEME_ID]);
        assert.deepEqual(developerResult.metadata, { uiEffectOwner: 'ui' });

        assert.equal(presetResult.success, true);
        assert.equal(Array.isArray(presetResult.changedKeys), true);
        assert.ok(presetResult.changedKeys.includes(SETTINGS_CHANGE_KEYS.PRESET_LIST));
        assert.ok(presetResult.changedKeys.includes(SETTINGS_CHANGE_KEYS.PRESET_STATUS));
        assert.equal(typeof presetResult.metadata?.presetId, 'string');

        assert.equal(sessionResult.success, true);
        assert.equal(typeof sessionResult.reason, 'string');
        assert.equal(Array.isArray(sessionResult.changedKeys), true);
        assert.equal(sessionResult.metadata?.sessionType, 'splitscreen');

        assert.equal(textResult.success, true);
        assert.equal(textResult.reason, 'updated');
        assert.deepEqual(textResult.changedKeys, [SETTINGS_CHANGE_KEYS.DEVELOPER_TEXT_OVERRIDES]);
        assert.equal(textResult.metadata?.textId, textId);
    });
});

test('V103 SettingsManager mutation contracts preserve ownership and failure reasons', () => {
    const storagePlatform = createMemoryStoragePlatform();
    const manager = new SettingsManager({ storagePlatform });
    const settings = manager.createDefaultSettings();
    settings.localSettings.ownerId = 'owner';
    settings.localSettings.actorId = 'guest';
    const guestAccessContext = createOwnerAccessContext({
        actorId: 'guest',
        isOwner: false,
    });

    const developerResult = manager.setDeveloperVisibility(settings, 'open', guestAccessContext);
    const fixedPresetResult = manager.saveMenuPreset(settings, { kind: 'fixed', name: 'Locked Preset' }, guestAccessContext);
    const unknownTextResult = manager.setMenuTextOverride('missing.text.id', 'Nope');

    assert.equal(developerResult.success, false);
    assert.equal(developerResult.reason, 'owner_required');
    assert.deepEqual(developerResult.changedKeys, []);

    assert.equal(fixedPresetResult.success, false);
    assert.equal(fixedPresetResult.reason, 'owner_required');
    assert.deepEqual(fixedPresetResult.changedKeys, []);

    assert.equal(unknownTextResult.success, false);
    assert.equal(unknownTextResult.reason, 'unknown_text_id');
    assert.deepEqual(unknownTextResult.changedKeys, []);
});
