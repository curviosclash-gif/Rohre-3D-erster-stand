import { CONFIG } from '../../core/Config.js';
import { Player } from '../Player.js';
import {
    BOT_POLICY_TYPES,
    isBridgeBotPolicyType,
    normalizeBotPolicyType,
    resolveMatchBotPolicyType,
} from '../ai/BotPolicyTypes.js';
import { getVehicleIds, isValidVehicleId } from '../vehicle-registry.js';
import { createGameModeStrategy } from '../../modes/GameModeRegistry.js';

function normalizeActiveMode(mode) {
    return String(mode || '').trim().toLowerCase();
}

function resolveLocalPolicyFallbackByMode(activeMode) {
    return normalizeActiveMode(activeMode) === 'hunt'
        ? BOT_POLICY_TYPES.HUNT
        : BOT_POLICY_TYPES.RULE_BASED;
}

function resolvePolicyFallbackByMode(activeMode, planarMode = false, bridgeEnabled = false) {
    if (!bridgeEnabled) {
        return resolveLocalPolicyFallbackByMode(activeMode);
    }
    return resolveMatchBotPolicyType({
        huntModeActive: normalizeActiveMode(activeMode) === 'hunt',
        planarMode: !!planarMode,
    });
}

function resolveConfiguredBotPolicyType({ requestedPolicyType, runtimeConfig, activeGameMode, planarMode, bridgeEnabled } = {}) {
    const runtimePolicyType = runtimeConfig?.bot?.policyType || null;
    const effectivePlanarMode = typeof planarMode === 'boolean'
        ? planarMode
        : !!runtimeConfig?.gameplay?.planarMode;
    const effectiveBridgeEnabled = typeof bridgeEnabled === 'boolean'
        ? bridgeEnabled
        : !!runtimeConfig?.bot?.trainerBridgeEnabled;
    const fallbackPolicyType = resolvePolicyFallbackByMode(
        activeGameMode,
        effectivePlanarMode,
        effectiveBridgeEnabled
    );
    const resolvedPolicyType = normalizeBotPolicyType(requestedPolicyType || runtimePolicyType || fallbackPolicyType);
    if (!effectiveBridgeEnabled && isBridgeBotPolicyType(resolvedPolicyType)) {
        return normalizeBotPolicyType(resolveLocalPolicyFallbackByMode(activeGameMode));
    }
    return resolvedPolicyType;
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
        const runtimePolicyStrategy = String(owner.runtimeConfig?.bot?.policyStrategy || '').trim().toLowerCase();
        const strategyForcesBridge = runtimePolicyStrategy === 'bridge';
        const setupBridgeEnabled = typeof options.bridgeEnabled === 'boolean'
            ? options.bridgeEnabled
            : (strategyForcesBridge || !!owner.runtimeConfig?.bot?.trainerBridgeEnabled);
        owner.huntEnabled = activeModeLower === 'hunt';
        owner.gameModeStrategy = createGameModeStrategy(owner.activeGameMode);
        owner.botDifficulty = options.botDifficulty || CONFIG.BOT.ACTIVE_DIFFICULTY || owner.botDifficulty;
        owner.botBridgeEnabled = setupBridgeEnabled;
        owner.botPolicyType = resolveConfiguredBotPolicyType({
            requestedPolicyType: options.botPolicyType,
            runtimeConfig: owner.runtimeConfig,
            activeGameMode: owner.activeGameMode,
            planarMode: setupPlanarMode,
            bridgeEnabled: setupBridgeEnabled,
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
                bridgeEnabled: owner.botBridgeEnabled,
                activeGameMode: owner.activeGameMode,
            });
            const sensePhase = i % 4;
            if (typeof ai?.setSensePhase === 'function') {
                ai.setSensePhase(sensePhase); // Time-slicing for batched bot scans
            }
            ai.sensePhase = sensePhase;
            owner.players.push(player);
            owner.bots.push({ player, ai });
            owner.botByPlayer.set(player, ai);
        }
    }
}
