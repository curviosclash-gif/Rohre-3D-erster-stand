// ============================================
// Config.js - Zentrale Spielkonfiguration
// ============================================

import { CONFIG_SECTIONS } from './config/ConfigSections.js';
import { MAP_PRESETS } from './config/MapPresets.js';
import { getActiveRuntimeConfig } from './runtime/ActiveRuntimeConfigStore.js';

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
