import assert from 'node:assert/strict';
import test from 'node:test';

import { SettingsManager } from '../src/core/SettingsManager.js';
import { STORAGE_KEYS } from '../src/ui/StorageKeys.js';

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
        getRecord(key) {
            return records.get(key);
        },
    };
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

    assert.equal(persisted, true);
    assert.deepEqual(storedSettings, canonicalSettings);
    assert.deepEqual(manager.loadSettings(), canonicalSettings);
});
