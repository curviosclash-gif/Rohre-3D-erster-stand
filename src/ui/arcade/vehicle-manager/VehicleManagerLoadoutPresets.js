const VEHICLE_LOADOUT_PRESET_STORAGE_KEY = 'cuviosclash.arcade-vehicle-loadouts.v1';
const VEHICLE_LOADOUT_PRESET_SCHEMA = 'arcade-vehicle-loadouts.v1';

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeVehicleId(value, fallback = 'ship5') {
    return normalizeString(value, fallback).toLowerCase();
}

function toSafeTimestamp(value) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp) : Date.now();
}

function toSafeUpgradeMap(source) {
    const result = {};
    if (!source || typeof source !== 'object') return result;
    const keys = Object.keys(source);
    for (let index = 0; index < keys.length; index += 1) {
        const key = normalizeString(keys[index]);
        if (!key) continue;
        const value = normalizeString(source[key], 'T1').toUpperCase();
        if (value === 'T1' || value === 'T2' || value === 'T3') {
            result[key] = value;
        }
    }
    return result;
}

function safeReadFromLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
        return window.localStorage.getItem(VEHICLE_LOADOUT_PRESET_STORAGE_KEY);
    } catch {
        return null;
    }
}

function safeWriteToLocalStorage(value) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(VEHICLE_LOADOUT_PRESET_STORAGE_KEY, value);
    } catch {
        // ignore write failures
    }
}

function sanitizePresetRecord(source) {
    const normalized = source && typeof source === 'object' ? source : {};
    const normalizedVehicleId = normalizeVehicleId(normalized.vehicleId, 'ship5');
    const normalizedPresetId = normalizeString(normalized.presetId, `preset-${toSafeTimestamp(normalized.updatedAtMs)}`);
    return {
        presetId: normalizedPresetId,
        vehicleId: normalizedVehicleId,
        name: normalizeString(normalized.name, normalizedPresetId),
        upgrades: toSafeUpgradeMap(normalized.upgrades),
        updatedAtMs: toSafeTimestamp(normalized.updatedAtMs),
    };
}

function sanitizeStorePayload(source) {
    const normalized = source && typeof source === 'object' ? source : {};
    const items = Array.isArray(normalized.presets) ? normalized.presets : [];
    const presets = items.map((entry) => sanitizePresetRecord(entry));
    return {
        schemaVersion: VEHICLE_LOADOUT_PRESET_SCHEMA,
        presets,
    };
}

function loadPayload(store) {
    if (store && typeof store.loadJsonRecord === 'function') {
        const loaded = store.loadJsonRecord(VEHICLE_LOADOUT_PRESET_STORAGE_KEY, null);
        return sanitizeStorePayload(loaded);
    }
    const raw = safeReadFromLocalStorage();
    if (!raw) return sanitizeStorePayload(null);
    try {
        return sanitizeStorePayload(JSON.parse(raw));
    } catch {
        return sanitizeStorePayload(null);
    }
}

function persistPayload(store, payload) {
    const normalized = sanitizeStorePayload(payload);
    if (store && typeof store.saveJsonRecord === 'function') {
        store.saveJsonRecord(VEHICLE_LOADOUT_PRESET_STORAGE_KEY, normalized);
        return;
    }
    safeWriteToLocalStorage(JSON.stringify(normalized));
}

function createPresetId(vehicleId, name) {
    const prefix = normalizeString(name, vehicleId)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${prefix || 'preset'}-${Date.now()}`;
}

export function createVehicleManagerLoadoutPresetStore({ store } = {}) {
    let payload = loadPayload(store);

    function persist() {
        persistPayload(store, payload);
    }

    function listPresets(vehicleId) {
        const normalizedVehicleId = normalizeVehicleId(vehicleId);
        return payload.presets
            .filter((entry) => entry.vehicleId === normalizedVehicleId)
            .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
            .map((entry) => ({
                presetId: entry.presetId,
                vehicleId: entry.vehicleId,
                name: entry.name,
                upgrades: { ...entry.upgrades },
                updatedAtMs: entry.updatedAtMs,
            }));
    }

    function savePreset(vehicleId, name, upgrades) {
        const normalizedVehicleId = normalizeVehicleId(vehicleId);
        const normalizedName = normalizeString(name, 'Preset');
        const nowMs = Date.now();
        const presetId = createPresetId(normalizedVehicleId, normalizedName);
        const nextPreset = sanitizePresetRecord({
            presetId,
            vehicleId: normalizedVehicleId,
            name: normalizedName,
            upgrades,
            updatedAtMs: nowMs,
        });
        payload.presets.unshift(nextPreset);
        if (payload.presets.length > 120) {
            payload.presets = payload.presets.slice(0, 120);
        }
        persist();
        return { ...nextPreset, upgrades: { ...nextPreset.upgrades } };
    }

    function deletePreset(vehicleId, presetId) {
        const normalizedVehicleId = normalizeVehicleId(vehicleId);
        const normalizedPresetId = normalizeString(presetId);
        const beforeCount = payload.presets.length;
        payload.presets = payload.presets.filter((entry) => {
            return !(entry.vehicleId === normalizedVehicleId && entry.presetId === normalizedPresetId);
        });
        if (payload.presets.length !== beforeCount) {
            persist();
            return true;
        }
        return false;
    }

    function loadPreset(vehicleId, presetId) {
        const normalizedVehicleId = normalizeVehicleId(vehicleId);
        const normalizedPresetId = normalizeString(presetId);
        const found = payload.presets.find((entry) => {
            return entry.vehicleId === normalizedVehicleId && entry.presetId === normalizedPresetId;
        });
        if (!found) return null;
        return {
            presetId: found.presetId,
            vehicleId: found.vehicleId,
            name: found.name,
            upgrades: { ...found.upgrades },
            updatedAtMs: found.updatedAtMs,
        };
    }

    return {
        listPresets,
        savePreset,
        deletePreset,
        loadPreset,
    };
}

