// ============================================
// SettingsStore.js - localStorage persistence for settings and profiles
// ============================================

import {
    LEGACY_STORAGE_KEYS,
    STORAGE_KEYS,
    migrateStorageValue,
    readFirstAvailableStorageValue,
} from './StorageKeys.js';

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.settings;
const SETTINGS_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.settings;
const SETTINGS_PROFILES_STORAGE_KEY = STORAGE_KEYS.settingsProfiles;
const SETTINGS_PROFILES_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.settingsProfiles;
const MENU_PRESETS_STORAGE_KEY = STORAGE_KEYS.menuPresets;
const MENU_PRESETS_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.menuPresets;

function getDefaultStorage() {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        // Some browser contexts can throw on localStorage access.
        return null;
    }
}

export class SettingsStore {
    constructor(options = {}) {
        this.storage = options.storage ?? getDefaultStorage();
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
        if (!this.storage || typeof this.storage.getItem !== 'function') {
            return this.createDefaultSettings();
        }

        try {
            const resolved = readFirstAvailableStorageValue(
                this.storage,
                this.settingsStorageKey,
                this.settingsStorageLegacyKeys
            );
            if (!resolved) return this.createDefaultSettings();
            const saved = JSON.parse(resolved.raw);
            const sanitized = this.sanitizeSettings(saved);
            migrateStorageValue(this.storage, this.settingsStorageKey, resolved);
            return sanitized;
        } catch {
            // Ignore malformed storage and fall back to defaults.
        }
        return this.createDefaultSettings();
    }

    saveSettings(settings) {
        if (!this.storage || typeof this.storage.setItem !== 'function') {
            return false;
        }

        try {
            this.storage.setItem(this.settingsStorageKey, JSON.stringify(settings));
            return true;
        } catch {
            // Ignore persistence errors (private mode, quotas, etc.)
            return false;
        }
    }

    loadProfiles() {
        if (!this.storage || typeof this.storage.getItem !== 'function') {
            return [];
        }

        try {
            const resolved = readFirstAvailableStorageValue(
                this.storage,
                this.settingsProfilesStorageKey,
                this.settingsProfilesStorageLegacyKeys
            );
            if (!resolved) return [];
            const parsed = JSON.parse(resolved.raw);
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
                });
            }
            out.sort((a, b) => b.updatedAt - a.updatedAt);
            migrateStorageValue(this.storage, this.settingsProfilesStorageKey, resolved);
            return out;
        } catch {
            return [];
        }
    }

    saveProfiles(profiles) {
        if (!this.storage || typeof this.storage.setItem !== 'function') {
            return false;
        }

        try {
            this.storage.setItem(this.settingsProfilesStorageKey, JSON.stringify(profiles));
            return true;
        } catch {
            // Ignore persistence errors.
            return false;
        }
    }

    loadJsonRecord(storageKey, fallbackValue = null) {
        const key = String(storageKey || '').trim();
        if (!key) return fallbackValue;
        if (!this.storage || typeof this.storage.getItem !== 'function') {
            return fallbackValue;
        }

        try {
            const resolved = readFirstAvailableStorageValue(
                this.storage,
                key,
                this._resolveLegacyKeysForStorageKey(key)
            );
            if (!resolved) return fallbackValue;
            const parsed = JSON.parse(resolved.raw);
            migrateStorageValue(this.storage, key, resolved);
            return parsed;
        } catch {
            return fallbackValue;
        }
    }

    saveJsonRecord(storageKey, value) {
        const key = String(storageKey || '').trim();
        if (!key) return false;
        if (!this.storage || typeof this.storage.setItem !== 'function') {
            return false;
        }

        try {
            this.storage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
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
