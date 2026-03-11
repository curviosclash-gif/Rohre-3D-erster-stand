import { CONFIG } from '../core/Config.js';
import { Arena } from '../entities/Arena.js';
import { EntityManager } from '../entities/EntityManager.js';
import { PowerupManager } from '../entities/Powerup.js';
import { ParticleSystem } from '../entities/Particles.js';
import { CUSTOM_MAP_KEY } from '../entities/MapSchema.js';
import { resolveArenaMapSelection } from '../entities/CustomMapLoader.js';
import { createArenaMapFingerprint } from '../entities/arena/ArenaBuildResourceCache.js';

let PREWARMED_ARENA_SESSION = null;

function toSafeInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.round(parsed);
}

function resolveArenaSourceMap(mapResolution, effectiveMapKey) {
    if (mapResolution?.mapDefinition && typeof mapResolution.mapDefinition === 'object') {
        return mapResolution.mapDefinition;
    }
    if (effectiveMapKey && CONFIG?.MAPS?.[effectiveMapKey]) {
        return CONFIG.MAPS[effectiveMapKey];
    }
    return CONFIG?.MAPS?.standard || null;
}

function buildArenaSessionKey(mapResolution, runtimeConfig, portalsEnabled) {
    const effectiveMapKey = mapResolution?.effectiveMapKey || 'standard';
    const gameplay = runtimeConfig?.gameplay || {};
    const arenaSourceMap = resolveArenaSourceMap(mapResolution, effectiveMapKey);
    const mapFingerprint = createArenaMapFingerprint(arenaSourceMap);
    return [
        String(effectiveMapKey || 'standard'),
        mapFingerprint,
        portalsEnabled ? '1' : '0',
        gameplay.planarMode ? '1' : '0',
        Math.max(0, Math.round(Number(gameplay.portalCount) || 0)),
        Math.max(0, Math.round(Number(gameplay.planarLevelCount) || 0)),
    ].join('|');
}

function resolveMatchMap(runtimeConfig = null, requestedMapKey = null) {
    const resolvedRequestedMapKey = runtimeConfig?.session?.mapKey || requestedMapKey;
    const mapResolution = resolveArenaMapSelection(resolvedRequestedMapKey);
    if (mapResolution.isCustom && mapResolution.mapDefinition) {
        CONFIG.MAPS[CUSTOM_MAP_KEY] = mapResolution.mapDefinition;
    }
    return mapResolution;
}

function consumePrewarmedArenaSessionIfMatch(renderer, sessionKey) {
    if (!PREWARMED_ARENA_SESSION) return null;
    if (PREWARMED_ARENA_SESSION.renderer !== renderer) return null;
    if (PREWARMED_ARENA_SESSION.sessionKey !== sessionKey) return null;

    const prepared = PREWARMED_ARENA_SESSION;
    PREWARMED_ARENA_SESSION = null;
    return prepared;
}

export function prewarmMatchArenaSession({
    renderer,
    settings,
    runtimeConfig = null,
    requestedMapKey,
} = {}) {
    if (!renderer) return null;

    const portalsEnabled = runtimeConfig?.session?.portalsEnabled ?? !!settings?.portalsEnabled;
    const mapResolution = resolveMatchMap(runtimeConfig, requestedMapKey);
    const effectiveMapKey = mapResolution.effectiveMapKey;
    const sessionKey = buildArenaSessionKey(mapResolution, runtimeConfig, portalsEnabled);

    if (PREWARMED_ARENA_SESSION
        && PREWARMED_ARENA_SESSION.renderer === renderer
        && PREWARMED_ARENA_SESSION.sessionKey === sessionKey) {
        return {
            prewarmed: true,
            reusedExisting: true,
            effectiveMapKey,
            sessionKey,
        };
    }

    renderer.clearMatchScene();

    const arena = new Arena(renderer);
    arena.portalsEnabled = !!portalsEnabled;
    arena.build(effectiveMapKey);

    PREWARMED_ARENA_SESSION = {
        renderer,
        sessionKey,
        mapResolution,
        effectiveMapKey,
        portalsEnabled: !!portalsEnabled,
        arena,
    };

    return {
        prewarmed: true,
        reusedExisting: false,
        effectiveMapKey,
        sessionKey,
    };
}

export function disposeMatchSessionSystems(renderer, currentSession, options = {}) {
    if (currentSession?.entityManager) {
        currentSession.entityManager.dispose();
    }
    if (currentSession?.powerupManager) {
        currentSession.powerupManager.dispose();
    }
    if (currentSession?.particles?.dispose) {
        currentSession.particles.dispose();
    }
    if (options.clearScene !== false) {
        renderer.clearMatchScene();
    }
}

function buildHumanConfigs(settings, runtimeConfig = null) {
    const runtimeVehicles = runtimeConfig?.player?.vehicles || null;
    return [
        {
            invertPitch: !!settings?.invertPitch?.PLAYER_1,
            cockpitCamera: !!settings?.cockpitCamera?.PLAYER_1,
            vehicleId: runtimeVehicles?.PLAYER_1 || settings?.vehicles?.PLAYER_1,
        },
        {
            invertPitch: !!settings?.invertPitch?.PLAYER_2,
            cockpitCamera: !!settings?.cockpitCamera?.PLAYER_2,
            vehicleId: runtimeVehicles?.PLAYER_2 || settings?.vehicles?.PLAYER_2,
        },
    ];
}

function buildEntityManagerSetupOptions(settings, runtimeConfig = null) {
    const runtimeBotConfig = runtimeConfig?.bot || null;
    const setupPlanarMode = runtimeConfig?.gameplay?.planarMode ?? settings?.gameplay?.planarMode;
    return {
        modelScale: runtimeConfig?.player?.modelScale ?? settings?.gameplay?.planeScale,
        botDifficulty: runtimeConfig?.bot?.activeDifficulty || settings?.botDifficulty || 'NORMAL',
        botPolicyType: runtimeBotConfig?.policyType || null,
        activeGameMode: runtimeConfig?.session?.activeGameMode || settings?.gameMode || null,
        planarMode: typeof setupPlanarMode === 'boolean' ? setupPlanarMode : undefined,
        runtimeConfig,
        humanConfigs: buildHumanConfigs(settings, runtimeConfig),
    };
}

export function createMatchSession({
    renderer,
    audio,
    recorder,
    settings,
    runtimeConfig = null,
    requestedMapKey,
    currentSession = null,
}) {
    const portalsEnabled = runtimeConfig?.session?.portalsEnabled ?? !!settings?.portalsEnabled;
    const mapResolution = resolveMatchMap(runtimeConfig, requestedMapKey);
    const effectiveMapKey = mapResolution.effectiveMapKey;
    const sessionKey = buildArenaSessionKey(mapResolution, runtimeConfig, portalsEnabled);
    const prewarmedArenaSession = consumePrewarmedArenaSessionIfMatch(renderer, sessionKey);
    const canPreservePrewarmedScene = !!prewarmedArenaSession
        && !currentSession?.entityManager
        && !currentSession?.powerupManager
        && !currentSession?.particles;
    const reusablePrewarmedArenaSession = canPreservePrewarmedScene ? prewarmedArenaSession : null;

    disposeMatchSessionSystems(renderer, currentSession, {
        clearScene: !canPreservePrewarmedScene,
    });

    const particles = new ParticleSystem(renderer);
    const arena = reusablePrewarmedArenaSession?.arena || new Arena(renderer);
    arena.portalsEnabled = !!portalsEnabled;
    if (!reusablePrewarmedArenaSession) {
        arena.build(effectiveMapKey);
    }

    const powerupManager = new PowerupManager(renderer, arena);
    const entityManager = new EntityManager(renderer, arena, powerupManager, particles, audio, recorder);

    const fallbackHumans = settings?.mode === '2p' ? 2 : 1;
    const fallbackBots = Number(settings?.numBots) || 0;
    const fallbackWinsNeeded = Number(settings?.winsNeeded) || 5;

    const numHumans = Math.max(1, toSafeInt(runtimeConfig?.session?.numHumans, fallbackHumans));
    const numBots = Math.max(0, toSafeInt(runtimeConfig?.session?.numBots, fallbackBots));
    const winsNeeded = Math.max(1, toSafeInt(runtimeConfig?.session?.winsNeeded, fallbackWinsNeeded));

    entityManager.setup(numHumans, numBots, buildEntityManagerSetupOptions(settings, runtimeConfig));

    return {
        particles,
        arena,
        powerupManager,
        entityManager,
        mapResolution,
        effectiveMapKey,
        numHumans,
        numBots,
        winsNeeded,
    };
}

export function deriveMapResolutionFeedbackPlan({ mapResolution, portalsEnabled }) {
    const consoleEntries = [];
    const toasts = [];

    if (!mapResolution) {
        return { consoleEntries, toasts };
    }

    if (mapResolution.error) {
        consoleEntries.push({
            level: 'warn',
            args: ['[Game] Map loading fallback:', mapResolution.error],
        });
    }
    if (Array.isArray(mapResolution.warnings) && mapResolution.warnings.length > 0) {
        consoleEntries.push({
            level: 'warn',
            args: ['[Game] Map loading warnings:', mapResolution.warnings],
        });
    }

    if (mapResolution.isFallback && mapResolution.requestedMapKey === CUSTOM_MAP_KEY) {
        toasts.push({
            message: 'Custom-Map ungueltig, Standard-Map geladen',
            durationMs: 2600,
            tone: 'error',
        });
    } else if (mapResolution.isFallback) {
        toasts.push({
            message: `Map-Fallback aktiv: ${mapResolution.effectiveMapKey}`,
            durationMs: 2200,
            tone: 'error',
        });
    } else if (mapResolution.isCustom && Array.isArray(mapResolution.warnings) && mapResolution.warnings.length > 0) {
        const extraCount = Math.max(0, mapResolution.warnings.length - 1);
        const suffix = extraCount > 0 ? ` (+${extraCount} Hinweis(e) in Konsole)` : '';
        toasts.push({
            message: `Custom-Map Hinweis: ${mapResolution.warnings[0]}${suffix}`,
            durationMs: 3600,
            tone: 'info',
        });
    }

    if (mapResolution.isCustom && mapResolution.mapDocument && mapResolution.mapDefinition) {
        const doc = mapResolution.mapDocument;
        const runtimeObstacleCount = Array.isArray(mapResolution.mapDefinition.obstacles)
            ? mapResolution.mapDefinition.obstacles.length
            : 0;
        const runtimePortalCount = Array.isArray(mapResolution.mapDefinition.portals)
            ? mapResolution.mapDefinition.portals.length
            : 0;
        const ignoredCount = (
            (Array.isArray(doc.tunnels) ? doc.tunnels.length : 0) +
            (Array.isArray(doc.items) ? doc.items.length : 0) +
            (Array.isArray(doc.aircraft) ? doc.aircraft.length : 0) +
            (Array.isArray(doc.botSpawns) ? doc.botSpawns.length : 0)
        );

        if (runtimeObstacleCount === 0 && runtimePortalCount === 0 && ignoredCount > 0) {
            toasts.push({
                message: 'Custom-Map enthaelt nur aktuell nicht unterstuetzte Editor-Objekte (Tunnel/Items/Aircraft/Spawns).',
                durationMs: 4200,
                tone: 'error',
            });
        } else if (runtimeObstacleCount === 0 && runtimePortalCount > 0 && !portalsEnabled) {
            toasts.push({
                message: 'Custom-Map hat nur Portale, aber Portale sind im Menue deaktiviert.',
                durationMs: 3400,
                tone: 'error',
            });
        }
    }

    return { consoleEntries, toasts };
}

export function wireMatchSessionRuntime({
    renderer,
    entityManager,
    numHumans,
    onPlayerFeedback = null,
    onPlayerDied = null,
    onRoundEnd = null,
    resetScores = true,
}) {
    if (!renderer || !entityManager) {
        throw new Error('wireMatchSessionRuntime requires renderer and entityManager');
    }

    entityManager.onPlayerFeedback = typeof onPlayerFeedback === 'function' ? onPlayerFeedback : null;
    entityManager.onPlayerDied = typeof onPlayerDied === 'function' ? onPlayerDied : null;
    entityManager.onRoundEnd = typeof onRoundEnd === 'function' ? onRoundEnd : null;

    const cameraCount = Math.max(0, Number(numHumans) || 0);
    for (let i = 0; i < cameraCount; i++) {
        renderer.createCamera(i);
    }

    if (resetScores) {
        for (const player of entityManager.players) {
            player.score = 0;
        }
    }

    return {
        cameraCount,
        playerCount: Array.isArray(entityManager.players) ? entityManager.players.length : 0,
    };
}

export function initializeMatchSession({
    renderer,
    audio,
    recorder,
    settings,
    runtimeConfig = null,
    requestedMapKey,
    currentSession = null,
    onPlayerFeedback = null,
    onPlayerDied = null,
    onRoundEnd = null,
    resetScores = true,
}) {
    const session = createMatchSession({
        renderer,
        audio,
        recorder,
        settings,
        runtimeConfig,
        requestedMapKey,
        currentSession,
    });

    const runtime = wireMatchSessionRuntime({
        renderer,
        entityManager: session.entityManager,
        numHumans: session.numHumans,
        onPlayerFeedback,
        onPlayerDied,
        onRoundEnd,
        resetScores,
    });

    const feedbackPlan = deriveMapResolutionFeedbackPlan({
        mapResolution: session.mapResolution,
        portalsEnabled: runtimeConfig?.session?.portalsEnabled ?? !!settings?.portalsEnabled,
    });

    return {
        session,
        runtime,
        feedbackPlan,
    };
}
