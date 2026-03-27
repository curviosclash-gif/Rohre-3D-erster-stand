// ============================================
// SettingsStore.js - localStorage persistence for settings and profiles
// ============================================

import {
    LEGACY_STORAGE_KEYS,
    STORAGE_KEYS,
} from './StorageKeys.js';
import { createDefaultStoragePlatform } from '../state/storage/StoragePlatform.js';
import { getDefaultBrowserStorage } from './base/PersistentStore.js';

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.settings;
const SETTINGS_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.settings;
const SETTINGS_PROFILES_STORAGE_KEY = STORAGE_KEYS.settingsProfiles;
const SETTINGS_PROFILES_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.settingsProfiles;
const MENU_PRESETS_STORAGE_KEY = STORAGE_KEYS.menuPresets;
const MENU_PRESETS_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.menuPresets;

function normalizeProfileEntries(profiles) {
    const sortedProfiles = Array.isArray(profiles)
        ? [...profiles].sort((a, b) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0))
        : [];
    let defaultAssigned = false;
    return sortedProfiles.map((profile) => {
        const isDefault = Boolean(profile?.isDefault) && !defaultAssigned;
        if (isDefault) {
            defaultAssigned = true;
        }
        return {
            name: String(profile?.name || '').trim(),
            updatedAt: Number(profile?.updatedAt || Date.now()),
            settings: profile?.settings || {},
            isDefault,
        };
    });
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
            if (!saved || typeof saved !== 'object') return this.createDefaultSettings();
            const sanitized = this.sanitizeSettings(saved);
            return sanitized;
        } catch {
            // Ignore malformed storage and fall back to defaults.
        }
        return this.createDefaultSettings();
    }

    saveSettings(settings) {
        const result = this.storagePlatform.writeJson(this.settingsStorageKey, settings);
        return result.ok;
    }

    loadProfiles() {
        try {
            const parsed = this.storagePlatform.readJson(
                this.settingsProfilesStorageKey,
                this.settingsProfilesStorageLegacyKeys,
                []
            );
            if (!Array.isArray(parsed)) return [];

            const out = [];
            const used = new Set();
            for (const entry of parsed) {
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
            return normalizeProfileEntries(out);
        } catch {
            return [];
        }
    }

    saveProfiles(profiles) {
        const result = this.storagePlatform.writeJson(
            this.settingsProfilesStorageKey,
            normalizeProfileEntries(profiles)
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
        } catch {
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
        return String(rawName || '')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 32);
    }

    getProfileNameKey(rawName) {
        return this.normalizeProfileName(rawName).toLocaleLowerCase();
    }

    findProfileIndexByName(profiles, profileName) {
        const key = this.getProfileNameKey(profileName);
        if (!key) return -1;
        if (!Array.isArray(profiles)) return -1;
        return profiles.findIndex((profile) => this.getProfileNameKey(profile.name) === key);
    }

    findProfileByName(profiles, profileName) {
        const index = this.findProfileIndexByName(profiles, profileName);
        return index >= 0 ? profiles[index] : null;
    }
}
