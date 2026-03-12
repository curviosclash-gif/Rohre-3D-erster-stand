import { CONFIG } from '../../core/Config.js';
import { Player } from '../Player.js';
import { normalizeBotPolicyType, resolveMatchBotPolicyType } from '../ai/BotPolicyTypes.js';
import { getVehicleIds, isValidVehicleId } from '../vehicle-registry.js';

function normalizeActiveMode(mode) {
    return String(mode || '').trim().toLowerCase();
}

function resolvePolicyFallbackByMode(activeMode, planarMode = false) {
    return resolveMatchBotPolicyType({
        huntModeActive: normalizeActiveMode(activeMode) === 'hunt',
        planarMode: !!planarMode,
    });
}

function resolveConfiguredBotPolicyType({ requestedPolicyType, runtimeConfig, activeGameMode, planarMode } = {}) {
    const runtimePolicyType = runtimeConfig?.bot?.policyType || null;
    const effectivePlanarMode = typeof planarMode === 'boolean'
        ? planarMode
        : !!runtimeConfig?.gameplay?.planarMode;
    const fallbackPolicyType = resolvePolicyFallbackByMode(activeGameMode, effectivePlanarMode);
    return normalizeBotPolicyType(requestedPolicyType || runtimePolicyType || fallbackPolicyType);
}

export class EntitySetupOps {
    constructor(entityManager) {
        this.entityManager = entityManager || null;
    }

    runSetup(numHumans, numBots, options = {}) {
        const owner = this.entityManager;
        if (!owner) return;
        this.applySetupRuntimeOptions(options);
        const setupContext = this.resolveSetupPlayerContext(options);
        this.resetSetupCollections();
        this.setupHumanPlayers(numHumans, setupContext);
        this.setupBotPlayers(numHumans, numBots, setupContext);
    }

    applySetupRuntimeOptions(options = {}) {
        const owner = this.entityManager;
        if (!owner) return;
        owner.runtimeConfig = options.runtimeConfig || null;
        owner.activeGameMode = options.activeGameMode
            || owner.runtimeConfig?.session?.activeGameMode
            || owner.activeGameMode
            || 'classic';
        const activeModeLower = String(owner.activeGameMode || '').toLowerCase();
        const setupPlanarMode = typeof options.planarMode === 'boolean'
            ? options.planarMode
            : owner.runtimeConfig?.gameplay?.planarMode;
        owner.huntEnabled = activeModeLower === 'hunt';
        owner.botDifficulty = options.botDifficulty || CONFIG.BOT.ACTIVE_DIFFICULTY || owner.botDifficulty;
        owner.botPolicyType = resolveConfiguredBotPolicyType({
            requestedPolicyType: options.botPolicyType,
            runtimeConfig: owner.runtimeConfig,
            activeGameMode: owner.activeGameMode,
            planarMode: setupPlanarMode,
        });
    }

    resolveSetupPlayerContext(options = {}) {
        const availableVehicleIds = getVehicleIds();
        const defaultVehicleId = String(CONFIG.PLAYER.DEFAULT_VEHICLE_ID || availableVehicleIds[0] || 'aircraft');
        const normalizeVehicleId = (value) => {
            const candidate = String(value || '').trim();
            if (isValidVehicleId(candidate)) {
                return candidate;
            }
            return defaultVehicleId;
        };
        const botVehicleSource = Array.isArray(options.botVehicleIds) && options.botVehicleIds.length > 0
            ? options.botVehicleIds
            : availableVehicleIds;
        const botVehicleIds = botVehicleSource.map((id) => normalizeVehicleId(id));
        return {
            humanConfigs: Array.isArray(options.humanConfigs) ? options.humanConfigs : [],
            modelScale: typeof options.modelScale === 'number' ? options.modelScale : (CONFIG.PLAYER.MODEL_SCALE || 1),
            defaultVehicleId,
            normalizeVehicleId,
            botVehicleIds,
        };
    }

    resetSetupCollections() {
        const owner = this.entityManager;
        if (!owner) return;
        owner.humanPlayers = [];
        owner.botByPlayer.clear();
    }

    setupHumanPlayers(numHumans, setupContext) {
        const owner = this.entityManager;
        if (!owner) return;
        const humanColors = [CONFIG.COLORS.PLAYER_1, CONFIG.COLORS.PLAYER_2];
        for (let i = 0; i < numHumans; i++) {
            const playerVehicleId = setupContext.normalizeVehicleId(setupContext.humanConfigs[i]?.vehicleId);
            const player = new Player(owner.renderer, i, humanColors[i], false, {
                vehicleId: playerVehicleId,
                entityManager: owner,
            });
            player.setControlOptions({
                invertPitch: !!setupContext.humanConfigs[i]?.invertPitch,
                cockpitCamera: !!setupContext.humanConfigs[i]?.cockpitCamera,
                modelScale: setupContext.modelScale,
            });
            owner.players.push(player);
            owner.humanPlayers.push(player);
        }
    }

    setupBotPlayers(numHumans, numBots, setupContext) {
        const owner = this.entityManager;
        if (!owner) return;
        for (let i = 0; i < numBots; i++) {
            const color = CONFIG.COLORS.BOT_COLORS[i % CONFIG.COLORS.BOT_COLORS.length];
            const botVehicleId = setupContext.botVehicleIds.length > 0
                ? setupContext.botVehicleIds[i % setupContext.botVehicleIds.length]
                : setupContext.defaultVehicleId;
            const player = new Player(owner.renderer, numHumans + i, color, true, {
                vehicleId: botVehicleId,
                entityManager: owner,
            });
            player.setControlOptions({ modelScale: setupContext.modelScale, invertPitch: false });
            const ai = owner.botPolicyRegistry.create(owner.botPolicyType, {
                difficulty: owner.botDifficulty,
                recorder: owner.recorder,
                runtimeConfig: owner.runtimeConfig,
                runtimeProfiler: owner.runtimeProfiler,
            });
            if (typeof ai?.setSensePhase === 'function') {
                ai.setSensePhase(i % 4); // Time-slicing for batched bot scans
            }
            owner.players.push(player);
            owner.bots.push({ player, ai });
            owner.botByPlayer.set(player, ai);
        }
    }
}
