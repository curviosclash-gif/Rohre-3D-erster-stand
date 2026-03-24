import { CONFIG } from '../../core/Config.js';

function normalizeMapCatalog(maps) {
    if (!maps || typeof maps !== 'object') {
        return {};
    }
    return maps;
}

export function getRuntimeMapCatalog(overrideMaps = null) {
    if (overrideMaps && typeof overrideMaps === 'object') {
        return normalizeMapCatalog(overrideMaps);
    }
    return normalizeMapCatalog(CONFIG?.MAPS);
}

export function getRuntimeMapDefinition(mapKey, overrideMaps = null) {
    const maps = getRuntimeMapCatalog(overrideMaps);
    const normalizedMapKey = typeof mapKey === 'string' ? mapKey.trim() : '';
    if (normalizedMapKey && maps[normalizedMapKey]) {
        return maps[normalizedMapKey];
    }
    if (maps.standard) {
        return maps.standard;
    }
    const firstMapKey = Object.keys(maps)[0];
    return firstMapKey ? maps[firstMapKey] : null;
}

export function hasRuntimeMap(mapKey, overrideMaps = null) {
    const maps = getRuntimeMapCatalog(overrideMaps);
    const normalizedMapKey = typeof mapKey === 'string' ? mapKey.trim() : '';
    return normalizedMapKey ? !!maps[normalizedMapKey] : false;
}

export function getRuntimeMapScale(fallback = 1) {
    const scale = Number(CONFIG?.ARENA?.MAP_SCALE);
    if (!Number.isFinite(scale) || scale <= 0) {
        return fallback;
    }
    return scale;
}
