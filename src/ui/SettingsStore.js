// ============================================
// SettingsStore.js - localStorage persistence for settings and profiles
// ============================================

import {
    LEGACY_STORAGE_KEYS,
    STORAGE_KEYS,
} from './StorageKeys.js';
import { createDefaultStoragePlatform } from '../state/storage/StoragePlatform.js';
import { getDefaultBrowserStorage } from './base/PersistentStore.js';
import {
    normalizeProfileEntries,
    normalizeProfileName,
    getProfileNameKey,
    findProfileIndexByName,
    findProfileByName,
} from '../shared/contracts/SettingsProfileContract.js';
import { resolveArtifactVersionState } from '../shared/contracts/ArtifactVersionMigrationContract.js';

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.settings;
const SETTINGS_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.settings;
const SETTINGS_PROFILES_STORAGE_KEY = STORAGE_KEYS.settingsProfiles;
const SETTINGS_PROFILES_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.settingsProfiles;
const SETTINGS_PROFILES_SCHEMA_VERSION = 'settings-profiles.v1';
const MENU_PRESETS_STORAGE_KEY = STORAGE_KEYS.menuPresets;
const MENU_PRESETS_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.menuPresets;

function safeJsonStringify(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return '';
    }
}

export class SettingsStore {
    constructor(options = {}) {
        this.storagePlatform = options.storagePlatform || createDefaultStoragePlatform({
            storage: options.storage ?? getDefaultBrowserStorage(),
            onQuotaExceeded: options.onQuotaExceeded,
        });
        this.storage = this.storagePlatform?.driver?.storage || null;
        this.sanitizeSettings = typeof options.sanitizeSettings === 'function'
            ? options.sanitizeSettings
            : (settings) => settings;
        this.createDefaultSettings = typeof options.createDefaultSettings === 'function'
            ? options.createDefaultSettings
            : () => ({});
        this.settingsStorageKey = options.settingsStorageKey || SETTINGS_STORAGE_KEY;
        this.settingsStorageLegacyKeys = Array.isArray(options.settingsStorageLegacyKeys)
            ? [...options.settingsStorageLegacyKeys]
            : [...SETTINGS_STORAGE_LEGACY_KEYS];
        this.settingsProfilesStorageKey = options.settingsProfilesStorageKey || SETTINGS_PROFILES_STORAGE_KEY;
        this.settingsProfilesStorageLegacyKeys = Array.isArray(options.settingsProfilesStorageLegacyKeys)
            ? [...options.settingsProfilesStorageLegacyKeys]
            : [...SETTINGS_PROFILES_STORAGE_LEGACY_KEYS];
        this.menuPresetsStorageKey = options.menuPresetsStorageKey || MENU_PRESETS_STORAGE_KEY;
        this.menuPresetsStorageLegacyKeys = Array.isArray(options.menuPresetsStorageLegacyKeys)
            ? [...options.menuPresetsStorageLegacyKeys]
            : [...MENU_PRESETS_STORAGE_LEGACY_KEYS];
    }

    loadSettings() {
        try {
            const saved = this.storagePlatform.readJson(
                this.settingsStorageKey,
                this.settingsStorageLegacyKeys,
                null
            );
            const hasPersistedSnapshot = !!saved && typeof saved === 'object';
            const canonicalSettings = hasPersistedSnapshot
                ? this.sanitizeSettings(saved)
                : this.sanitizeSettings(this.createDefaultSettings());
            if (hasPersistedSnapshot && safeJsonStringify(saved) !== safeJsonStringify(canonicalSettings)) {
                this.storagePlatform.writeJson(this.settingsStorageKey, canonicalSettings);
            }
            return canonicalSettings;
        } catch (error) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn('[SettingsStore] loadSettings failed, using defaults.', error);
            }
        }
        return this.sanitizeSettings(this.createDefaultSettings());
    }

    saveSettings(settings) {
        const canonicalSettings = this.sanitizeSettings(settings);
        const result = this.storagePlatform.writeJson(this.settingsStorageKey, canonicalSettings);
        return result.ok;
    }

    loadProfiles() {
        try {
            const parsed = this.storagePlatform.readJson(
                this.settingsProfilesStorageKey,
                this.settingsProfilesStorageLegacyKeys,
                null
            );
            if (parsed === null || parsed === undefined) return [];
            const versionState = resolveArtifactVersionState(parsed, {
                artifactType: 'settings-profiles',
                versionFields: ['schemaVersion'],
                supportedVersions: [SETTINGS_PROFILES_SCHEMA_VERSION],
                currentVersion: SETTINGS_PROFILES_SCHEMA_VERSION,
                allowMissingVersion: true,
            });
            if (versionState.shouldReject) return [];
            const rawProfiles = versionState.hasVersionField
                ? parsed?.profiles
                : (Array.isArray(parsed) ? parsed : parsed?.profiles);
            if (!Array.isArray(rawProfiles)) return [];

            const out = [];
            const used = new Set();
            for (const entry of rawProfiles) {
                const name = this.normalizeProfileName(entry?.name || '');
                const key = this.getProfileNameKey(name);
                if (!name || used.has(key)) continue;
                used.add(key);
                out.push({
                    name,
                    updatedAt: Number(entry?.updatedAt || Date.now()),
                    settings: this.sanitizeSettings(entry?.settings || {}),
                    isDefault: Boolean(entry?.isDefault),
                });
            }
            const normalized = normalizeProfileEntries(out);
            if (versionState.shouldFallback || versionState.shouldUpgrade) {
                this.storagePlatform.writeJson(this.settingsProfilesStorageKey, {
                    schemaVersion: SETTINGS_PROFILES_SCHEMA_VERSION,
                    profiles: normalized,
                });
            }
            return normalized;
        } catch (error) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn('[SettingsStore] loadProfiles failed, using empty list.', error);
            }
            return [];
        }
    }

    saveProfiles(profiles) {
        const result = this.storagePlatform.writeJson(
            this.settingsProfilesStorageKey,
            {
                schemaVersion: SETTINGS_PROFILES_SCHEMA_VERSION,
                profiles: normalizeProfileEntries(profiles),
            }
        );
        return result.ok;
    }

    loadJsonRecord(storageKey, fallbackValue = null) {
        const key = String(storageKey || '').trim();
        if (!key) return fallbackValue;
        try {
            const parsed = this.storagePlatform.readJson(
                key,
                this._resolveLegacyKeysForStorageKey(key),
                fallbackValue
            );
            return parsed;
        } catch (error) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn(`[SettingsStore] loadJsonRecord failed for key "${key}", using fallback.`, error);
            }
            return fallbackValue;
        }
    }

    saveJsonRecord(storageKey, value) {
        const key = String(storageKey || '').trim();
        if (!key) return false;
        const result = this.storagePlatform.writeJson(key, value);
        return result.ok;
    }

    _resolveLegacyKeysForStorageKey(storageKey) {
        if (storageKey === this.settingsStorageKey) {
            return this.settingsStorageLegacyKeys;
        }
        if (storageKey === this.settingsProfilesStorageKey) {
            return this.settingsProfilesStorageLegacyKeys;
        }
        if (storageKey === this.menuPresetsStorageKey) {
            return this.menuPresetsStorageLegacyKeys;
        }
        return [];
    }

    normalizeProfileName(rawName) {
        return normalizeProfileName(rawName);
    }

    getProfileNameKey(rawName) {
        return getProfileNameKey(rawName);
    }

    findProfileIndexByName(profiles, profileName) {
        return findProfileIndexByName(profiles, profileName);
    }

    findProfileByName(profiles, profileName) {
        return findProfileByName(profiles, profileName);
    }
}
