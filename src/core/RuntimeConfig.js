import { CONFIG, CONFIG_BASE } from './Config.js';
import { GAME_MODE_TYPES, isHuntMode, resolveActiveGameMode } from '../hunt/HuntMode.js';
import { BOT_POLICY_TYPES, resolveMatchBotPolicyType } from '../entities/ai/BotPolicyTypes.js';
import {
    clampSettingValue,
    createControlBindingsSnapshot,
    SETTINGS_LIMITS,
} from './config/SettingsRuntimeContract.js';
import { normalizeSessionType } from '../composition/core-ui/CoreSettingsPorts.js';
import {
    createDefaultRecordingCaptureSettings,
    normalizeRecordingCaptureSettings,
} from '../shared/contracts/RecordingCaptureContract.js';
import {
    createDefaultCameraPerspectiveSettings,
    normalizeCameraPerspectiveSettings,
} from '../shared/contracts/CameraPerspectiveContract.js';
import { cloneJsonValue } from '../shared/utils/JsonClone.js';

function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function deepClone(value) {
    return cloneJsonValue(value);
}

function clampInteger(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function hashSeed(input) {
    const source = String(input || '');
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) - hash) + source.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function resolveArcadeSeed(settings = null, activeGameMode = GAME_MODE_TYPES.CLASSIC) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const explicitSeed = source?.arcade && typeof source.arcade === 'object'
        ? source.arcade.seed
        : null;
    if (Number.isFinite(Number(explicitSeed))) {
        return clampInteger(explicitSeed, 0, 2_147_483_647, 0);
    }
    const mapKey = String(source.mapKey || 'standard');
    const numBots = clampInteger(source.numBots, 0, 12, 0);
    const modePath = String(source?.localSettings?.modePath || 'normal').trim().toLowerCase();
    return hashSeed(`${mapKey}|${activeGameMode}|${numBots}|${modePath}`);
}

function resolveBotDifficulty(requestedDifficulty, botConfig) {
    const botDefaults = botConfig || CONFIG.BOT;
    const fallback = botDefaults.DEFAULT_DIFFICULTY || 'NORMAL';
    const candidate = String(requestedDifficulty || fallback).toUpperCase();
    return Object.prototype.hasOwnProperty.call(botDefaults.DIFFICULTY_PROFILES || {}, candidate)
        ? candidate
        : fallback;
}

export const BOT_POLICY_STRATEGIES = Object.freeze({
    RULE_BASED: 'rule-based',
    BRIDGE: 'bridge',
    AUTO: 'auto',
});
const BOT_POLICY_STRATEGY_SET = new Set(Object.values(BOT_POLICY_STRATEGIES));

export function normalizeBotPolicyStrategy(strategy, fallback = BOT_POLICY_STRATEGIES.AUTO) {
    const normalizedFallback = BOT_POLICY_STRATEGY_SET.has(String(fallback || '').trim().toLowerCase())
        ? String(fallback).trim().toLowerCase()
        : BOT_POLICY_STRATEGIES.AUTO;
    const candidate = typeof strategy === 'string' ? strategy.trim().toLowerCase() : '';
    return BOT_POLICY_STRATEGY_SET.has(candidate) ? candidate : normalizedFallback;
}

function resolveLocalBotPolicyType(huntModeActive) {
    return huntModeActive ? BOT_POLICY_TYPES.HUNT : BOT_POLICY_TYPES.RULE_BASED;
}

export function resolveBotPolicyType(
    strategy,
    activeGameMode,
    {
        huntFeatureEnabled = true,
        planarMode = false,
        trainerBridgeEnabled = false,
    } = {}
) {
    const normalizedStrategy = normalizeBotPolicyStrategy(strategy, BOT_POLICY_STRATEGIES.AUTO);
    const huntModeActive = isHuntMode(activeGameMode, huntFeatureEnabled);

    if (normalizedStrategy === BOT_POLICY_STRATEGIES.BRIDGE) {
        return huntModeActive ? BOT_POLICY_TYPES.HUNT_BRIDGE : BOT_POLICY_TYPES.CLASSIC_BRIDGE;
    }
    if (normalizedStrategy === BOT_POLICY_STRATEGIES.RULE_BASED) {
        return BOT_POLICY_TYPES.RULE_BASED;
    }
    // AUTO strategy: always use bridge policy types so that local checkpoint
    // auto-loading works. The bridge policy gracefully falls back to rule-based
    // when no checkpoint and no WebSocket bridge are available.
    return resolveMatchBotPolicyType({
        huntModeActive,
        planarMode: !!planarMode,
    });
}

export function createRuntimeConfigSnapshot(settings, { baseConfig = CONFIG_BASE } = {}) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const gameplaySource = source.gameplay && typeof source.gameplay === 'object' ? source.gameplay : {};
    const huntSource = source.hunt && typeof source.hunt === 'object' ? source.hunt : {};
    const botBridgeSource = source.botBridge && typeof source.botBridge === 'object' ? source.botBridge : {};
    const arcadeSource = source.arcade && typeof source.arcade === 'object' ? source.arcade : {};
    const recordingSource = source.recording && typeof source.recording === 'object'
        ? source.recording
        : createDefaultRecordingCaptureSettings();
    const cameraPerspectiveSource = source.cameraPerspective && typeof source.cameraPerspective === 'object'
        ? source.cameraPerspective
        : createDefaultCameraPerspectiveSettings();

    const sessionType = normalizeSessionType(source?.localSettings?.sessionType || (source.mode === '2p' ? 'splitscreen' : 'single'));
    const modePath = String(source?.localSettings?.modePath || 'normal').trim().toLowerCase();
    const arcadeEnabled = modePath === 'arcade';
    const networkEnabled = sessionType === 'lan' || sessionType === 'online';
    const mode = sessionType === 'splitscreen' ? '2p' : '1p';
    const numHumans = networkEnabled ? 1 : (mode === '2p' ? 2 : 1);
    const huntFeatureEnabled = baseConfig?.HUNT?.ENABLED !== false;
    const activeGameMode = resolveActiveGameMode(source.gameMode, huntFeatureEnabled);
    const huntModeActive = isHuntMode(activeGameMode, huntFeatureEnabled);

    const playerDefaults = baseConfig.PLAYER || CONFIG.PLAYER;
    const gameplayDefaults = baseConfig.GAMEPLAY || CONFIG.GAMEPLAY;
    const trailDefaults = baseConfig.TRAIL || CONFIG.TRAIL;
    const powerupDefaults = baseConfig.POWERUP || CONFIG.POWERUP;
    const projectileDefaults = baseConfig.PROJECTILE || CONFIG.PROJECTILE;
    const botDefaults = baseConfig.BOT || CONFIG.BOT;
    const homingDefaults = baseConfig.HOMING || CONFIG.HOMING;
    const controlsDefaults = baseConfig.KEYS || CONFIG.KEYS;
    const planarMode = !!gameplaySource.planarMode;

    const botDifficulty = resolveBotDifficulty(source.botDifficulty, botDefaults);
    const botPolicyStrategy = normalizeBotPolicyStrategy(source.botPolicyStrategy, BOT_POLICY_STRATEGIES.AUTO);
    const trainerBridgeEnabled = !!botBridgeSource.enabled;
    const botPolicyType = resolveBotPolicyType(botPolicyStrategy, activeGameMode, {
        huntFeatureEnabled,
        planarMode,
        trainerBridgeEnabled,
    });

    const runtimeConfig = {
        session: {
            sessionType,
            mode,
            modePath,
            numHumans,
            networkEnabled,
            maxPlayers: clampSettingValue(source.maxPlayers, { min: 2, max: 10, step: 1 }, 10),
            numBots: clampSettingValue(source.numBots, SETTINGS_LIMITS.session.numBots, 0),
            winsNeeded: clampSettingValue(source.winsNeeded, SETTINGS_LIMITS.session.winsNeeded, 5),
            mapKey: String(source.mapKey || 'standard'),
            portalsEnabled: !!source.portalsEnabled,
            activeGameMode,
        },
        player: {
            speed: clampSettingValue(gameplaySource.speed, SETTINGS_LIMITS.gameplay.speed, playerDefaults.SPEED),
            turnSpeed: clampSettingValue(gameplaySource.turnSensitivity, SETTINGS_LIMITS.gameplay.turnSensitivity, playerDefaults.TURN_SPEED),
            modelScale: clampSettingValue(gameplaySource.planeScale, SETTINGS_LIMITS.gameplay.planeScale, playerDefaults.MODEL_SCALE),
            autoRoll: typeof source.autoRoll === 'boolean' ? source.autoRoll : !!playerDefaults.AUTO_ROLL,
            vehicles: {
                PLAYER_1: source?.vehicles?.PLAYER_1 || playerDefaults.DEFAULT_VEHICLE_ID || 'ship5',
                PLAYER_2: source?.vehicles?.PLAYER_2 || playerDefaults.DEFAULT_VEHICLE_ID || 'ship5',
            },
        },
        gameplay: {
            planarMode,
            portalCount: clampSettingValue(gameplaySource.portalCount, SETTINGS_LIMITS.gameplay.portalCount, gameplayDefaults.PORTAL_COUNT || 0),
            planarLevelCount: clampSettingValue(gameplaySource.planarLevelCount, SETTINGS_LIMITS.gameplay.planarLevelCount, gameplayDefaults.PLANAR_LEVEL_COUNT || 5),
            portalBeams: false,
            planarAimInputSpeed: toNumber(gameplayDefaults.PLANAR_AIM_INPUT_SPEED, 1.5),
            planarAimReturnSpeed: toNumber(gameplayDefaults.PLANAR_AIM_RETURN_SPEED, 0.6),
        },
        trail: {
            width: clampSettingValue(gameplaySource.trailWidth, SETTINGS_LIMITS.gameplay.trailWidth, trailDefaults.WIDTH),
            gapDuration: clampSettingValue(gameplaySource.gapSize, SETTINGS_LIMITS.gameplay.gapSize, trailDefaults.GAP_DURATION),
            gapChance: clampSettingValue(gameplaySource.gapFrequency, SETTINGS_LIMITS.gameplay.gapFrequency, trailDefaults.GAP_CHANCE),
        },
        powerup: {
            maxOnField: clampSettingValue(gameplaySource.itemAmount, SETTINGS_LIMITS.gameplay.itemAmount, powerupDefaults.MAX_ON_FIELD),
        },
        projectile: {
            cooldown: clampSettingValue(gameplaySource.fireRate, SETTINGS_LIMITS.gameplay.fireRate, projectileDefaults.COOLDOWN),
        },
        bot: {
            activeDifficulty: botDifficulty,
            policyStrategy: botPolicyStrategy,
            policyType: botPolicyType,
            trainerBridgeEnabled,
            trainerBridgeUrl: typeof botBridgeSource.url === 'string' && botBridgeSource.url.trim()
                ? botBridgeSource.url.trim()
                : 'ws://127.0.0.1:8765',
            trainerBridgeTimeoutMs: clampSettingValue(botBridgeSource.timeoutMs, SETTINGS_LIMITS.botBridge.timeoutMs, 80),
            trainerBridgeMaxRetries: clampSettingValue(botBridgeSource.maxRetries, SETTINGS_LIMITS.botBridge.maxRetries, 1),
            trainerBridgeRetryDelayMs: clampSettingValue(botBridgeSource.retryDelayMs, SETTINGS_LIMITS.botBridge.retryDelayMs, 0),
            trainerCheckpointResumeToken: typeof botBridgeSource.resumeCheckpoint === 'string'
                ? botBridgeSource.resumeCheckpoint.trim()
                : '',
            trainerCheckpointResumeStrict: botBridgeSource.resumeStrict === true,
        },
        homing: {
            lockOnAngle: clampSettingValue(gameplaySource.lockOnAngle, SETTINGS_LIMITS.gameplay.lockOnAngle, homingDefaults.LOCK_ON_ANGLE),
        },
        controls: createControlBindingsSnapshot(source.controls, controlsDefaults, { guardCombatConflicts: true }),
        huntCombat: {
            mgTrailAimRadius: clampSettingValue(
                gameplaySource.mgTrailAimRadius,
                SETTINGS_LIMITS.gameplay.mgTrailAimRadius,
                baseConfig?.HUNT?.MG?.TRAIL_HIT_RADIUS ?? CONFIG?.HUNT?.MG?.TRAIL_HIT_RADIUS ?? 0.78
            ),
            fightTuningEnabled: modePath === 'fight',
            fightPlayerHp: clampSettingValue(
                gameplaySource.fightPlayerHp,
                SETTINGS_LIMITS.gameplay.fightPlayerHp,
                baseConfig?.HUNT?.PLAYER_MAX_HP ?? CONFIG?.HUNT?.PLAYER_MAX_HP ?? 100
            ),
            fightMgDamage: clampSettingValue(
                gameplaySource.fightMgDamage,
                SETTINGS_LIMITS.gameplay.fightMgDamage,
                baseConfig?.HUNT?.MG?.DAMAGE ?? CONFIG?.HUNT?.MG?.DAMAGE ?? 7.75
            ),
        },
        hunt: {
            enabled: huntModeActive,
            respawnEnabled: huntModeActive ? !!huntSource.respawnEnabled : false,
        },
        arcade: {
            enabled: arcadeEnabled,
            profileId: String(arcadeSource.profileId || 'arcade-default'),
            runType: String(arcadeSource.runType || 'gauntlet'),
            seed: resolveArcadeSeed(source, activeGameMode),
            scoreModel: String(arcadeSource.scoreModel || 'arcade-score.v1'),
            sectorCount: clampInteger(arcadeSource.sectorCount, 1, 20, 5),
            intermissionSeconds: clampSettingValue(arcadeSource.intermissionSeconds, { min: 1, max: 10 }, 3),
            comboWindowMs: clampInteger(arcadeSource.comboWindowMs, 800, 20_000, 5000),
            comboDecayPerSecond: clampSettingValue(arcadeSource.comboDecayPerSecond, { min: 0, max: 10 }, 1),
            maxMultiplier: clampInteger(arcadeSource.maxMultiplier, 1, 25, 8),
            replayHooksEnabled: arcadeSource.replayHooksEnabled !== false,
        },
        recording: normalizeRecordingCaptureSettings(recordingSource, createDefaultRecordingCaptureSettings()),
        cameraPerspective: normalizeCameraPerspectiveSettings(
            cameraPerspectiveSource,
            createDefaultCameraPerspectiveSettings()
        ),
        settingsSnapshot: deepClone(source),
    };

    return runtimeConfig;
}

export function applyRuntimeConfigCompatibility(runtimeConfig, targetConfig = CONFIG_BASE) {
    const nextConfig = deepClone(targetConfig || CONFIG_BASE);
    if (!runtimeConfig || typeof runtimeConfig !== 'object') {
        return nextConfig;
    }

    nextConfig.PLAYER.SPEED = runtimeConfig.player.speed;
    nextConfig.PLAYER.TURN_SPEED = runtimeConfig.player.turnSpeed;
    nextConfig.PLAYER.MODEL_SCALE = runtimeConfig.player.modelScale;
    nextConfig.PLAYER.AUTO_ROLL = runtimeConfig.player.autoRoll;
    nextConfig.PLAYER.VEHICLES = {
        PLAYER_1: runtimeConfig.player.vehicles.PLAYER_1,
        PLAYER_2: runtimeConfig.player.vehicles.PLAYER_2,
    };

    nextConfig.GAMEPLAY.PLANAR_MODE = runtimeConfig.gameplay.planarMode;
    nextConfig.GAMEPLAY.PORTAL_COUNT = runtimeConfig.gameplay.portalCount;
    nextConfig.GAMEPLAY.PLANAR_LEVEL_COUNT = runtimeConfig.gameplay.planarLevelCount;
    nextConfig.GAMEPLAY.PORTAL_BEAMS = runtimeConfig.gameplay.portalBeams;

    nextConfig.TRAIL.WIDTH = runtimeConfig.trail.width;
    nextConfig.TRAIL.GAP_DURATION = runtimeConfig.trail.gapDuration;
    nextConfig.TRAIL.GAP_CHANCE = runtimeConfig.trail.gapChance;

    nextConfig.POWERUP.MAX_ON_FIELD = runtimeConfig.powerup.maxOnField;
    nextConfig.PROJECTILE.COOLDOWN = runtimeConfig.projectile.cooldown;
    nextConfig.BOT.ACTIVE_DIFFICULTY = runtimeConfig.bot.activeDifficulty;
    nextConfig.BOT.ACTIVE_POLICY_STRATEGY = runtimeConfig?.bot?.policyStrategy || BOT_POLICY_STRATEGIES.AUTO;
    nextConfig.BOT.ACTIVE_POLICY_TYPE = runtimeConfig?.bot?.policyType || BOT_POLICY_TYPES.RULE_BASED;
    nextConfig.BOT.TRAINER_BRIDGE_ENABLED = !!runtimeConfig.bot.trainerBridgeEnabled;
    nextConfig.BOT.TRAINER_BRIDGE_URL = runtimeConfig.bot.trainerBridgeUrl;
    nextConfig.BOT.TRAINER_BRIDGE_TIMEOUT_MS = runtimeConfig.bot.trainerBridgeTimeoutMs;
    nextConfig.BOT.TRAINER_BRIDGE_MAX_RETRIES = runtimeConfig.bot.trainerBridgeMaxRetries;
    nextConfig.BOT.TRAINER_BRIDGE_RETRY_DELAY_MS = runtimeConfig.bot.trainerBridgeRetryDelayMs;
    nextConfig.BOT.TRAINER_CHECKPOINT_RESUME_TOKEN = runtimeConfig.bot.trainerCheckpointResumeToken;
    nextConfig.BOT.TRAINER_CHECKPOINT_RESUME_STRICT = runtimeConfig.bot.trainerCheckpointResumeStrict;
    nextConfig.HOMING.LOCK_ON_ANGLE = runtimeConfig.homing.lockOnAngle;
    if (nextConfig.HUNT) {
        nextConfig.HUNT.ACTIVE_MODE = runtimeConfig?.session?.activeGameMode || GAME_MODE_TYPES.CLASSIC;
        nextConfig.HUNT.RESPAWN_ENABLED = !!runtimeConfig?.hunt?.respawnEnabled;
        const fightTuningEnabled = runtimeConfig?.huntCombat?.fightTuningEnabled === true;
        if (fightTuningEnabled) {
            nextConfig.HUNT.PLAYER_MAX_HP = Math.max(
                1,
                Number(runtimeConfig?.huntCombat?.fightPlayerHp || nextConfig?.HUNT?.PLAYER_MAX_HP || 100)
            );
        }
        if (nextConfig.HUNT.MG && runtimeConfig?.huntCombat) {
            nextConfig.HUNT.MG = {
                ...nextConfig.HUNT.MG,
                TRAIL_HIT_RADIUS: runtimeConfig.huntCombat.mgTrailAimRadius,
                ...(fightTuningEnabled
                    ? {
                        DAMAGE: Math.max(
                            1,
                            Number(runtimeConfig?.huntCombat?.fightMgDamage || nextConfig?.HUNT?.MG?.DAMAGE || 7.75)
                        ),
                    }
                    : {}),
            };
        }
    }

    return nextConfig;
}
