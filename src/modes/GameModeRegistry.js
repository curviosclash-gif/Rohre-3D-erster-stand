// ============================================
// GameModeRegistry.js - factory for game mode strategies
// ============================================

import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { ClassicModeStrategy } from './ClassicModeStrategy.js';
import { HuntModeStrategy } from './HuntModeStrategy.js';

const FACTORIES = {
    [GAME_MODE_TYPES.CLASSIC]: () => new ClassicModeStrategy(),
    [GAME_MODE_TYPES.HUNT]: () => new HuntModeStrategy(),
};

export function createGameModeStrategy(modeType) {
    const normalized = String(modeType || '').trim().toUpperCase();
    const factory = FACTORIES[normalized] || FACTORIES[GAME_MODE_TYPES.CLASSIC];
    return factory();
}

export function registerGameModeStrategy(modeType, factoryFn) {
    FACTORIES[String(modeType || '').trim().toUpperCase()] = factoryFn;
}
