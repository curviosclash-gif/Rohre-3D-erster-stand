import {
    LEGACY_STORAGE_KEYS,
    STORAGE_KEYS,
    migrateStorageValue,
    readFirstAvailableStorageValue,
} from '../StorageKeys.js';

const MENU_TELEMETRY_STORAGE_KEY = STORAGE_KEYS.menuTelemetry;
const MENU_TELEMETRY_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.menuTelemetry;

function getDefaultStorage() {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

function sanitizeEventType(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || 'unknown';
}

function createDefaultState() {
    return {
        abortCount: 0,
        backtrackCount: 0,
        quickStartCount: 0,
        startAttempts: 0,
        events: [],
    };
}

export class MenuTelemetryStore {
    constructor(options = {}) {
        this.storage = options.storage ?? getDefaultStorage();
        this.storageKey = options.storageKey || MENU_TELEMETRY_STORAGE_KEY;
        this.storageLegacyKeys = Array.isArray(options.storageLegacyKeys)
            ? [...options.storageLegacyKeys]
            : [...MENU_TELEMETRY_STORAGE_LEGACY_KEYS];
    }

    _loadState() {
        if (!this.storage || typeof this.storage.getItem !== 'function') return createDefaultState();
        try {
            const resolved = readFirstAvailableStorageValue(this.storage, this.storageKey, this.storageLegacyKeys);
            if (!resolved) return createDefaultState();
            const parsed = JSON.parse(resolved.raw);
            migrateStorageValue(this.storage, this.storageKey, resolved);
            return {
                ...createDefaultState(),
                ...(parsed && typeof parsed === 'object' ? parsed : {}),
                events: Array.isArray(parsed?.events) ? parsed.events : [],
            };
        } catch {
            return createDefaultState();
        }
    }

    _saveState(state) {
        if (!this.storage || typeof this.storage.setItem !== 'function') return false;
        try {
            this.storage.setItem(this.storageKey, JSON.stringify(state));
            return true;
        } catch {
            return false;
        }
    }

    recordEvent(eventType, payload = null) {
        const state = this._loadState();
        const normalizedEventType = sanitizeEventType(eventType);
        if (normalizedEventType === 'abort') state.abortCount += 1;
        if (normalizedEventType === 'backtrack') state.backtrackCount += 1;
        if (normalizedEventType === 'quickstart') state.quickStartCount += 1;
        if (normalizedEventType === 'start_attempt') state.startAttempts += 1;

        state.events.push({
            type: normalizedEventType,
            at: new Date().toISOString(),
            payload: payload && typeof payload === 'object' ? { ...payload } : null,
        });
        if (state.events.length > 30) {
            state.events = state.events.slice(state.events.length - 30);
        }
        this._saveState(state);
        return state;
    }

    getSnapshot() {
        return this._loadState();
    }

    clear() {
        const clearedState = createDefaultState();
        this._saveState(clearedState);
        return clearedState;
    }
}
