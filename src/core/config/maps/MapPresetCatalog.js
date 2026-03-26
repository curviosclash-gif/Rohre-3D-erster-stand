import { STANDARD_MAPS } from './presets/standard.js';
import { ARENA_MAPS } from './presets/arena_maps.js';
import { THEMED_MAPS } from './presets/themed_maps.js';
import { SHOWCASE_MAPS } from './presets/showcase_maps.js';
import { PARCOURS_MAPS } from './presets/parcours_maps.js';
import { EXPERT_MAPS } from './presets/expert_maps.js';
import { NEON_ABYSS_MAP } from './presets/neon_abyss.js';
import { CRYSTAL_RUINS_MAP } from './presets/crystal_ruins.js';

export const MAP_PRESET_CATALOG = {
    ...(STANDARD_MAPS || {}),
    ...(ARENA_MAPS || {}),
    ...(THEMED_MAPS || {}),
    ...(SHOWCASE_MAPS || {}),
    ...(PARCOURS_MAPS || {}),
    ...(EXPERT_MAPS || {}),
    ...(NEON_ABYSS_MAP || {}),
    ...(CRYSTAL_RUINS_MAP || {}),
};
