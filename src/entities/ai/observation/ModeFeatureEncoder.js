// ============================================
// ModeFeatureEncoder.js - stable mode ID features for bot observations
// ============================================

import { GAME_MODE_TYPES, normalizeGameMode } from '../../../hunt/HuntMode.js';

export const MODE_ID_CLASSIC = 0;
export const MODE_ID_HUNT = 1;

export function encodeModeId(mode) {
    const normalized = normalizeGameMode(mode, GAME_MODE_TYPES.CLASSIC);
    return normalized === GAME_MODE_TYPES.HUNT ? MODE_ID_HUNT : MODE_ID_CLASSIC;
}

export function writeModeFeatures(mode, target = [0, 0, 0], offset = 0) {
    const modeId = encodeModeId(mode);
    target[offset] = modeId;
    target[offset + 1] = modeId === MODE_ID_CLASSIC ? 1 : 0;
    target[offset + 2] = modeId === MODE_ID_HUNT ? 1 : 0;
    return target;
}
