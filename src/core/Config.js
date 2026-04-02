// ============================================
// Config.js - Zentrale Spielkonfiguration
// ============================================

import { CONFIG_SECTIONS } from './config/ConfigSections.js';
import { MAP_PRESETS } from './config/MapPresets.js';
import { getActiveRuntimeConfig } from './runtime/ActiveRuntimeConfigStore.js';
import { registerMapCatalogConfigSource } from '../shared/contracts/RuntimeMapCatalogContract.js';

export const CONFIG_BASE = {
    ...CONFIG_SECTIONS,
    MAPS: MAP_PRESETS,
};

export const CONFIG = new Proxy(CONFIG_BASE, {
    get(target, property, receiver) {
        const activeConfig = getActiveRuntimeConfig(target);
        return Reflect.get(activeConfig || target, property, receiver);
    },
});

// Register CONFIG as the map-catalog source so that shared-layer consumers
// can resolve MAPS and ARENA without importing from src/core/Config.js.
registerMapCatalogConfigSource(CONFIG);
