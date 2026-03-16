import { CONFIG } from '../core/Config.js';
import { Arena } from '../entities/Arena.js';
import { EntityManager } from '../entities/EntityManager.js';
import { PowerupManager } from '../entities/Powerup.js';
import { ParticleSystem } from '../entities/Particles.js';
import { CUSTOM_MAP_KEY } from '../entities/MapSchema.js';
import { resolveArenaMapSelection } from '../entities/CustomMapLoader.js';
import { createArenaMapFingerprint } from '../entities/arena/ArenaBuildResourceCache.js';

let PREWARMED_ARENA_SESSION = null;
let PREWARMED_ARENA_SESSION_PROMISE = null;
let PREWARMED_ARENA_SESSION_META = null;

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

function isPromiseLike(value) {
    return !!value && typeof value.then === 'function';
}

function consumePrewarmedArenaSessionIfMatch(renderer, sessionKey) {
    if (!PREWARMED_ARENA_SESSION) return null;
    if (PREWARMED_ARENA_SESSION.renderer !== renderer) return null;
    if (PREWARMED_ARENA_SESSION.sessionKey !== sessionKey) return null;

    const prepared = PREWARMED_ARENA_SESSION;
    PREWARMED_ARENA_SESSION = null;
    return prepared;
}

async function awaitActivePrewarmForRenderer(renderer) {
    if (!PREWARMED_ARENA_SESSION_PROMISE) return null;
    if (PREWARMED_ARENA_SESSION_META?.renderer !== renderer) return null;
    try {
        await PREWARMED_ARENA_SESSION_PROMISE;
    } catch {
        return null;
    }
    return PREWARMED_ARENA_SESSION;
}

export async function prewarmMatchArenaSession({
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
            arenaBuildResult: PREWARMED_ARENA_SESSION.arenaBuildResult || null,
        };
    }
    if (PREWARMED_ARENA_SESSION_PROMISE
        && PREWARMED_ARENA_SESSION_META?.renderer === renderer
        && PREWARMED_ARENA_SESSION_META?.sessionKey === sessionKey) {
        return PREWARMED_ARENA_SESSION_PROMISE;
    }

    await awaitActivePrewarmForRenderer(renderer);

    if (PREWARMED_ARENA_SESSION
        && PREWARMED_ARENA_SESSION.renderer === renderer
        && PREWARMED_ARENA_SESSION.sessionKey === sessionKey) {
        return {
            prewarmed: true,
            reusedExisting: true,
            effectiveMapKey,
            sessionKey,
            arenaBuildResult: PREWARMED_ARENA_SESSION.arenaBuildResult || null,
        };
    }

    PREWARMED_ARENA_SESSION = null;

    const prewarmPromise = (async () => {
        renderer.clearMatchScene();

        const arena = new Arena(renderer);
        arena.portalsEnabled = !!portalsEnabled;
        const arenaBuildResult = await arena.build(effectiveMapKey);

        PREWARMED_ARENA_SESSION = {
            renderer,
            sessionKey,
            mapResolution,
            effectiveMapKey,
            portalsEnabled: !!portalsEnabled,
            arena,
            arenaBuildResult,
        };

        return {
            prewarmed: true,
            reusedExisting: false,
            effectiveMapKey,
            sessionKey,
            arenaBuildResult,
        };
    })();

    const trackedPromise = prewarmPromise.finally(() => {
        if (PREWARMED_ARENA_SESSION_PROMISE === trackedPromise) {
            PREWARMED_ARENA_SESSION_PROMISE = null;
        }
        if (PREWARMED_ARENA_SESSION_META?.renderer === renderer
            && PREWARMED_ARENA_SESSION_META?.sessionKey === sessionKey) {
            PREWARMED_ARENA_SESSION_META = null;
        }
    });

    PREWARMED_ARENA_SESSION_PROMISE = trackedPromise;
    PREWARMED_ARENA_SESSION_META = { renderer, sessionKey };
    return trackedPromise;
}

function getActivePrewarmPromiseForRenderer(renderer) {
    if (!PREWARMED_ARENA_SESSION_PROMISE) return null;
    if (PREWARMED_ARENA_SESSION_META?.renderer !== renderer) return null;
    return PREWARMED_ARENA_SESSION_PROMISE;
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
    runtimeProfiler = null,
    settings,
    runtimeConfig = null,
    requestedMapKey,
    currentSession = null,
}) {
    const portalsEnabled = runtimeConfig?.session?.portalsEnabled ?? !!settings?.portalsEnabled;
    const mapResolution = resolveMatchMap(runtimeConfig, requestedMapKey);
    const effectiveMapKey = mapResolution.effectiveMapKey;
    const sessionKey = buildArenaSessionKey(mapResolution, runtimeConfig, portalsEnabled);
    const fallbackHumans = settings?.mode === '2p' ? 2 : 1;
    const fallbackBots = Number(settings?.numBots) || 0;
    const fallbackWinsNeeded = Number(settings?.winsNeeded) || 5;

    const numHumans = Math.max(1, toSafeInt(runtimeConfig?.session?.numHumans, fallbackHumans));
    const numBots = Math.max(0, toSafeInt(runtimeConfig?.session?.numBots, fallbackBots));
    const winsNeeded = Math.max(1, toSafeInt(runtimeConfig?.session?.winsNeeded, fallbackWinsNeeded));

    const finalizeSession = (prewarmedArenaSession = null) => {
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

        const buildSessionPayload = (arenaBuildResult = reusablePrewarmedArenaSession?.arenaBuildResult || null) => {
            const powerupManager = new PowerupManager(renderer, arena);
            const entityManager = new EntityManager(
                renderer,
                arena,
                powerupManager,
                particles,
                audio,
                recorder,
                runtimeProfiler
            );

            entityManager.setup(numHumans, numBots, buildEntityManagerSetupOptions(settings, runtimeConfig));

            return {
                particles,
                arena,
                powerupManager,
                entityManager,
                mapResolution,
                arenaBuildResult,
                effectiveMapKey,
                numHumans,
                numBots,
                winsNeeded,
            };
        };

        if (reusablePrewarmedArenaSession) {
            return buildSessionPayload();
        }

        const arenaBuildResult = arena.build(effectiveMapKey);
        if (isPromiseLike(arenaBuildResult)) {
            return Promise.resolve(arenaBuildResult).then((resolvedArenaBuildResult) => buildSessionPayload(resolvedArenaBuildResult));
        }
        return buildSessionPayload(arenaBuildResult);
    };

    const activePrewarmPromise = getActivePrewarmPromiseForRenderer(renderer);
    if (activePrewarmPromise) {
        return Promise.resolve(activePrewarmPromise)
            .catch(() => null)
            .then(() => finalizeSession(consumePrewarmedArenaSessionIfMatch(renderer, sessionKey)));
    }

    return finalizeSession(consumePrewarmedArenaSessionIfMatch(renderer, sessionKey));
}

export function deriveMapResolutionFeedbackPlan({ mapResolution, portalsEnabled, arenaBuildResult = null }) {
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
    if (Array.isArray(arenaBuildResult?.glbLoadWarnings) && arenaBuildResult.glbLoadWarnings.length > 0) {
        consoleEntries.push({
            level: 'warn',
            args: ['[Game] GLB map loading warnings:', arenaBuildResult.glbLoadWarnings],
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
    if (arenaBuildResult?.glbLoadError) {
        toasts.push({
            message: 'GLB-Map konnte nicht geladen werden, Box-Fallback aktiv',
            durationMs: 2600,
            tone: 'error',
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
        const runtimeGateCount = Array.isArray(mapResolution.mapDefinition.gates)
            ? mapResolution.mapDefinition.gates.length
            : 0;
        if (runtimeObstacleCount === 0 && runtimePortalCount > 0 && runtimeGateCount === 0 && !portalsEnabled) {
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
    runtimeProfiler = null,
    settings,
    runtimeConfig = null,
    requestedMapKey,
    currentSession = null,
    onPlayerFeedback = null,
    onPlayerDied = null,
    onRoundEnd = null,
    resetScores = true,
}) {
    const finalizeInitializedMatch = (session) => {
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
            arenaBuildResult: session.arenaBuildResult,
        });

        return {
            session,
            runtime,
            feedbackPlan,
        };
    };

    const session = createMatchSession({
        renderer,
        audio,
        recorder,
        runtimeProfiler,
        settings,
        runtimeConfig,
        requestedMapKey,
        currentSession,
    });
    if (isPromiseLike(session)) {
        return Promise.resolve(session).then((resolvedSession) => finalizeInitializedMatch(resolvedSession));
    }
    return finalizeInitializedMatch(session);
}
