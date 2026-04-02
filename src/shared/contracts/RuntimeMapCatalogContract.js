import {
    getGameplayConfigSection,
    getGameplayMapCatalog,
    CONFIG_SECTIONS,
    GAMEPLAY_CONFIG_DEFAULTS,
} from './GameplayConfigContract.js';

let _configSource = null;

/**
 * Registers an external config source so that map-catalog lookups can resolve
 * MAPS and ARENA without importing from src/core/Config.js.
 * Called once during bootstrap; consumers that pass explicit overrides are
 * unaffected.
 */
export function registerMapCatalogConfigSource(source) {
    _configSource = source && typeof source === 'object' ? source : null;
}

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
    const maps = getGameplayMapCatalog(_configSource);
    return normalizeMapCatalog(Object.keys(maps).length > 0 ? maps : null);
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
    const arenaSection = getGameplayConfigSection(_configSource, CONFIG_SECTIONS.ARENA);
    const scale = Number(arenaSection?.MAP_SCALE ?? GAMEPLAY_CONFIG_DEFAULTS.ARENA.MAP_SCALE);
    if (!Number.isFinite(scale) || scale <= 0) {
        return fallback;
    }
    return scale;
}
