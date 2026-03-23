import {
    LEGACY_STORAGE_KEYS,
    STORAGE_KEYS,
} from '../StorageKeys.js';
import { createDefaultStoragePlatform } from '../../state/storage/StoragePlatform.js';

const MENU_TEXT_OVERRIDE_STORAGE_KEY = STORAGE_KEYS.menuTextOverrides;
const MENU_TEXT_OVERRIDE_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.menuTextOverrides;

function getDefaultStorage() {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

function sanitizeTextId(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized;
}

function sanitizeTextValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export class MenuTextOverrideStore {
    constructor(options = {}) {
        this.storagePlatform = options.storagePlatform || createDefaultStoragePlatform({
            storage: options.storage ?? getDefaultStorage(),
            onQuotaExceeded: options.onQuotaExceeded,
        });
        this.storage = this.storagePlatform?.driver?.storage || null;
        this.storageKey = options.storageKey || MENU_TEXT_OVERRIDE_STORAGE_KEY;
        this.storageLegacyKeys = Array.isArray(options.storageLegacyKeys)
            ? [...options.storageLegacyKeys]
            : [...MENU_TEXT_OVERRIDE_STORAGE_LEGACY_KEYS];
    }

    _loadRaw() {
        try {
            const parsed = this.storagePlatform.readJson(this.storageKey, this.storageLegacyKeys, {});
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    _saveRaw(rawOverrides) {
        return this.storagePlatform.writeJson(this.storageKey, rawOverrides).ok;
    }

    listOverrides() {
        return this._loadRaw();
    }

    getOverride(textId) {
        const normalizedTextId = sanitizeTextId(textId);
        if (!normalizedTextId) return '';
        const overrides = this._loadRaw();
        return sanitizeTextValue(overrides[normalizedTextId]);
    }

    setOverride(textId, textValue) {
        const normalizedTextId = sanitizeTextId(textId);
        const normalizedTextValue = sanitizeTextValue(textValue);
        if (!normalizedTextId) return { success: false, reason: 'invalid_text_id' };

        const overrides = this._loadRaw();
        if (!normalizedTextValue) {
            delete overrides[normalizedTextId];
        } else {
            overrides[normalizedTextId] = normalizedTextValue;
        }

        const stored = this._saveRaw(overrides);
        return {
            success: stored,
            reason: stored ? 'updated' : 'storage_failed',
            textId: normalizedTextId,
            value: normalizedTextValue,
        };
    }

    clearOverride(textId) {
        return this.setOverride(textId, '');
    }
}
