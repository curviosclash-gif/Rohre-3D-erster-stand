// ============================================
// BotRuntimeContextFactory.js - centralized runtime context for bot policies
// ============================================

import { CONFIG } from '../../core/Config.js';
import { isHuntHealthActive } from '../../hunt/HealthSystem.js';
import { GAME_MODE_TYPES, normalizeGameMode } from '../../hunt/HuntMode.js';
import { createObservationContext } from './observation/ObservationSystem.js';
import { OBSERVATION_LENGTH_V1 } from './observation/ObservationSchemaV1.js';

const RUNTIME_CONTEXT_BY_PLAYER = new WeakMap();

function resolveRuntimeMode(entityManager) {
    const requestedMode = entityManager?.activeGameMode
        || entityManager?.runtimeConfig?.session?.activeGameMode
        || CONFIG?.HUNT?.ACTIVE_MODE
        || GAME_MODE_TYPES.CLASSIC;
    const normalized = normalizeGameMode(requestedMode, GAME_MODE_TYPES.CLASSIC);
    if (normalized === GAME_MODE_TYPES.HUNT) {
        return GAME_MODE_TYPES.HUNT;
    }
    return isHuntHealthActive() ? GAME_MODE_TYPES.HUNT : GAME_MODE_TYPES.CLASSIC;
}

function createCachedRuntimeContext() {
    return {
        dt: 0,
        player: null,
        arena: null,
        players: [],
        projectiles: [],
        mode: GAME_MODE_TYPES.CLASSIC,
        rules: {
            planarMode: false,
            huntEnabled: false,
            portalsEnabled: false,
        },
        observationContext: null,
        observationBuffer: new Array(OBSERVATION_LENGTH_V1).fill(0),
        observation: null,
    };
}

function resolveCachedRuntimeContext(player) {
    if (!player || (typeof player !== 'object' && typeof player !== 'function')) {
        return createCachedRuntimeContext();
    }
    let cached = RUNTIME_CONTEXT_BY_PLAYER.get(player);
    if (!cached) {
        cached = createCachedRuntimeContext();
        RUNTIME_CONTEXT_BY_PLAYER.set(player, cached);
    }
    return cached;
}

export function createBotRuntimeContext(entityManager, player, dt = 0, options = {}) {
    const mode = resolveRuntimeMode(entityManager);
    const players = Array.isArray(entityManager?.players) ? entityManager.players : [];
    const projectiles = Array.isArray(entityManager?.projectiles) ? entityManager.projectiles : [];
    const planarMode = !!(entityManager?.runtimeConfig?.gameplay?.planarMode ?? CONFIG?.GAMEPLAY?.PLANAR_MODE);
    const includeObservationContext = options?.includeObservationContext !== false;
    const runtimeContext = resolveCachedRuntimeContext(player);
    const rules = runtimeContext.rules || (runtimeContext.rules = {
        planarMode: false,
        huntEnabled: false,
        portalsEnabled: false,
    });

    runtimeContext.dt = Number.isFinite(dt) ? dt : 0;
    runtimeContext.player = player || null;
    runtimeContext.arena = entityManager?.arena || null;
    runtimeContext.players = players;
    runtimeContext.projectiles = projectiles;
    runtimeContext.mode = mode;
    rules.planarMode = planarMode;
    rules.huntEnabled = mode === GAME_MODE_TYPES.HUNT || isHuntHealthActive();
    rules.portalsEnabled = !!entityManager?.arena?.portalsEnabled;
    runtimeContext.observationContext = includeObservationContext
        ? createObservationContext({
            arena: runtimeContext.arena,
            players,
            projectiles,
            mode,
            planarMode: rules.planarMode,
        }, runtimeContext.observationContext)
        : null;
    if (!runtimeContext.observationBuffer || runtimeContext.observationBuffer.length !== OBSERVATION_LENGTH_V1) {
        runtimeContext.observationBuffer = new Array(OBSERVATION_LENGTH_V1).fill(0);
    }
    runtimeContext.observation = null;
    return runtimeContext;
}
