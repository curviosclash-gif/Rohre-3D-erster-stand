import { createLogger } from '../../../shared/logging/Logger.js';
import { MAP_PRESET_CATALOG } from './MapPresetCatalog.js';

const logger = createLogger('MapPresetsBase');

const BASE_MAP_KEYS = [
    'standard',
    'custom',
    'empty',
    'glb_hangar',
    'maze',
    'complex',
    'pyramid',
    'vertical_maze',
    'trench',
    'foam_forest',
    'crossfire',
    'checkerboard',
    'the_pit',
    'core_fusion',
    'pillar_hall',
    'spiral_tower',
    'portal_madness',
    'the_loop',
    'upgrade_showcase',
    'showcase_nexus',
    'parcours_rift',
    'neon_abyss',
    'crystal_ruins',
];

export const MAP_PRESETS_BASE = Object.freeze(
    BASE_MAP_KEYS.reduce((result, key) => {
        if (MAP_PRESET_CATALOG[key]) {
            result[key] = MAP_PRESET_CATALOG[key];
        } else {
            logger.warn(`Map key "${key}" not found in MAP_PRESET_CATALOG — skipped`);
        }
        return result;
    }, {})
);
