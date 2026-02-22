import { CONFIG } from './Config.js';
import {
    CUSTOM_MAP_KEY,
    CUSTOM_MAP_STORAGE_KEY,
    parseMapJSON,
    toArenaMapDefinition,
} from './MapSchema.js';

const DEFAULT_FALLBACK_MAP_KEY = 'standard';

function getStorage(storageOverride) {
    if (storageOverride) return storageOverride;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function getRuntimeScale() {
    const scale = Number(CONFIG?.ARENA?.MAP_SCALE);
    if (!Number.isFinite(scale) || scale <= 0) return 1;
    return scale;
}

function getFallbackMapKey() {
    if (CONFIG.MAPS[DEFAULT_FALLBACK_MAP_KEY]) {
        return DEFAULT_FALLBACK_MAP_KEY;
    }

    const mapKeys = Object.keys(CONFIG.MAPS || {});
    return mapKeys.length > 0 ? mapKeys[0] : DEFAULT_FALLBACK_MAP_KEY;
}

export function loadCustomMapFromStorage(storageOverride) {
    const storage = getStorage(storageOverride);
    if (!storage) {
        return {
            ok: false,
            error: 'localStorage is not available.',
            warnings: [],
        };
    }

    let rawJSON = null;
    try {
        rawJSON = storage.getItem(CUSTOM_MAP_STORAGE_KEY);
    } catch (error) {
        return {
            ok: false,
            error: `Unable to read localStorage key "${CUSTOM_MAP_STORAGE_KEY}": ${error.message}`,
            warnings: [],
        };
    }

    if (!rawJSON) {
        return {
            ok: false,
            error: `No custom map found in localStorage key "${CUSTOM_MAP_STORAGE_KEY}".`,
            warnings: [],
        };
    }

    try {
        const parsed = parseMapJSON(rawJSON);
        const converted = toArenaMapDefinition(parsed.map, {
            mapScale: getRuntimeScale(),
            name: 'Editor Playtest',
        });
        return {
            ok: true,
            mapDocument: converted.mapDocument,
            mapDefinition: converted.map,
            warnings: [...parsed.warnings, ...converted.warnings],
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message || 'Unknown custom map parsing error.',
            warnings: [],
        };
    }
}

export function resolveArenaMapSelection(requestedMapKey, storageOverride) {
    const mapKey = String(requestedMapKey || '');
    const fallbackMapKey = getFallbackMapKey();

    if (mapKey !== CUSTOM_MAP_KEY) {
        const knownMap = CONFIG.MAPS[mapKey];
        if (knownMap) {
            return {
                requestedMapKey: mapKey,
                effectiveMapKey: mapKey,
                mapDefinition: knownMap,
                warnings: [],
                isFallback: false,
                isCustom: false,
                error: null,
            };
        }

        return {
            requestedMapKey: mapKey,
            effectiveMapKey: fallbackMapKey,
            mapDefinition: CONFIG.MAPS[fallbackMapKey],
            warnings: [`Unknown map key "${mapKey}". Falling back to "${fallbackMapKey}".`],
            isFallback: true,
            isCustom: false,
            error: `Unknown map key "${mapKey}".`,
        };
    }

    const customResult = loadCustomMapFromStorage(storageOverride);
    if (customResult.ok) {
        return {
            requestedMapKey: mapKey,
            effectiveMapKey: CUSTOM_MAP_KEY,
            mapDefinition: customResult.mapDefinition,
            mapDocument: customResult.mapDocument,
            warnings: customResult.warnings,
            isFallback: false,
            isCustom: true,
            error: null,
        };
    }

    return {
        requestedMapKey: mapKey,
        effectiveMapKey: fallbackMapKey,
        mapDefinition: CONFIG.MAPS[fallbackMapKey],
        warnings: customResult.warnings,
        isFallback: true,
        isCustom: true,
        error: customResult.error,
    };
}
