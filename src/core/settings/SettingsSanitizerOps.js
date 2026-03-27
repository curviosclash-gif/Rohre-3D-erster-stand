import { CONFIG } from '../Config.js';
import { getActiveRuntimeConfig } from '../runtime/ActiveRuntimeConfigStore.js';
import { CUSTOM_MAP_KEY } from '../../entities/MapSchema.js';
import {
    applyMenuCompatibilityRuleSet,
    ensureMenuContractState,
    MENU_SESSION_TYPES,
    normalizeSessionType,
} from '../../composition/core-ui/CoreSettingsPorts.js';
import { GAME_MODE_TYPES, resolveActiveGameMode } from '../../hunt/HuntMode.js';
import {
    clampSettingValue,
    normalizeControlBindings,
    normalizeGlobalControlBindings,
    SETTINGS_LIMITS,
} from '../config/SettingsRuntimeContract.js';
import {
    normalizeBotPolicyStrategy,
} from '../RuntimeConfig.js';
import {
    createDefaultRecordingCaptureSettings,
    normalizeRecordingCaptureSettings,
} from '../../shared/contracts/RecordingCaptureContract.js';
import {
    createDefaultCameraPerspectiveSettings,
    normalizeCameraPerspectiveSettings,
} from '../../shared/contracts/CameraPerspectiveContract.js';
import {
    deepClone,
    normalizeModePath,
} from './SettingsDomainUtils.js';

function applySessionSanitization({ merged, src, defaults, migratedSessionType }) {
    const huntFeatureEnabled = getActiveRuntimeConfig(CONFIG)?.HUNT?.ENABLED !== false;
    merged.mode = migratedSessionType === MENU_SESSION_TYPES.SPLITSCREEN ? '2p' : '1p';
    merged.gameMode = resolveActiveGameMode(src.gameMode, huntFeatureEnabled);

    const requestedMapKey = String(src.mapKey || '');
    merged.mapKey = (requestedMapKey === CUSTOM_MAP_KEY || CONFIG.MAPS[requestedMapKey])
        ? requestedMapKey
        : defaults.mapKey;

    merged.numBots = clampSettingValue(
        src.numBots ?? defaults.numBots,
        SETTINGS_LIMITS.session.numBots,
        defaults.numBots
    );
    merged.botDifficulty = ['EASY', 'NORMAL', 'HARD'].includes(src.botDifficulty)
        ? src.botDifficulty
        : defaults.botDifficulty;
    merged.botPolicyStrategy = normalizeBotPolicyStrategy(src.botPolicyStrategy, defaults.botPolicyStrategy);
    merged.winsNeeded = clampSettingValue(
        src.winsNeeded ?? defaults.winsNeeded,
        SETTINGS_LIMITS.session.winsNeeded,
        defaults.winsNeeded
    );
    merged.autoRoll = typeof src.autoRoll === 'boolean' ? src.autoRoll : defaults.autoRoll;

    merged.invertPitch.PLAYER_1 = !!src?.invertPitch?.PLAYER_1;
    merged.invertPitch.PLAYER_2 = !!src?.invertPitch?.PLAYER_2;
    merged.cockpitCamera.PLAYER_1 = !!src?.cockpitCamera?.PLAYER_1;
    merged.cockpitCamera.PLAYER_2 = !!src?.cockpitCamera?.PLAYER_2;

    if (!merged.vehicles) merged.vehicles = { PLAYER_1: 'ship5', PLAYER_2: 'ship5' };
    merged.vehicles.PLAYER_1 = src?.vehicles?.PLAYER_1 || 'ship5';
    merged.vehicles.PLAYER_2 = src?.vehicles?.PLAYER_2 || 'ship5';

    merged.portalsEnabled = src?.portalsEnabled !== undefined ? !!src.portalsEnabled : defaults.portalsEnabled;
    merged.hunt.respawnEnabled = !!(src?.hunt?.respawnEnabled ?? defaults.hunt.respawnEnabled);
    if (merged.gameMode !== GAME_MODE_TYPES.HUNT) {
        merged.hunt.respawnEnabled = false;
    }
}

function applyGameplaySanitization({ merged, src, defaults }) {
    merged.gameplay.speed = clampSettingValue(
        src?.gameplay?.speed ?? defaults.gameplay.speed,
        SETTINGS_LIMITS.gameplay.speed,
        defaults.gameplay.speed
    );
    merged.gameplay.turnSensitivity = clampSettingValue(
        src?.gameplay?.turnSensitivity ?? defaults.gameplay.turnSensitivity,
        SETTINGS_LIMITS.gameplay.turnSensitivity,
        defaults.gameplay.turnSensitivity
    );
    merged.gameplay.planeScale = clampSettingValue(
        src?.gameplay?.planeScale ?? defaults.gameplay.planeScale,
        SETTINGS_LIMITS.gameplay.planeScale,
        defaults.gameplay.planeScale
    );
    merged.gameplay.trailWidth = clampSettingValue(
        src?.gameplay?.trailWidth ?? defaults.gameplay.trailWidth,
        SETTINGS_LIMITS.gameplay.trailWidth,
        defaults.gameplay.trailWidth
    );
    merged.gameplay.gapSize = clampSettingValue(
        src?.gameplay?.gapSize ?? defaults.gameplay.gapSize,
        SETTINGS_LIMITS.gameplay.gapSize,
        defaults.gameplay.gapSize
    );
    merged.gameplay.gapFrequency = clampSettingValue(
        src?.gameplay?.gapFrequency ?? defaults.gameplay.gapFrequency,
        SETTINGS_LIMITS.gameplay.gapFrequency,
        defaults.gameplay.gapFrequency
    );
    merged.gameplay.itemAmount = clampSettingValue(
        src?.gameplay?.itemAmount ?? defaults.gameplay.itemAmount,
        SETTINGS_LIMITS.gameplay.itemAmount,
        defaults.gameplay.itemAmount
    );
    merged.gameplay.fireRate = clampSettingValue(
        src?.gameplay?.fireRate ?? defaults.gameplay.fireRate,
        SETTINGS_LIMITS.gameplay.fireRate,
        defaults.gameplay.fireRate
    );
    merged.gameplay.lockOnAngle = clampSettingValue(
        src?.gameplay?.lockOnAngle ?? defaults.gameplay.lockOnAngle,
        SETTINGS_LIMITS.gameplay.lockOnAngle,
        defaults.gameplay.lockOnAngle
    );
    merged.gameplay.mgTrailAimRadius = clampSettingValue(
        src?.gameplay?.mgTrailAimRadius ?? defaults.gameplay.mgTrailAimRadius,
        SETTINGS_LIMITS.gameplay.mgTrailAimRadius,
        defaults.gameplay.mgTrailAimRadius
    );
    merged.gameplay.fightPlayerHp = clampSettingValue(
        src?.gameplay?.fightPlayerHp ?? defaults.gameplay.fightPlayerHp,
        SETTINGS_LIMITS.gameplay.fightPlayerHp,
        defaults.gameplay.fightPlayerHp
    );
    merged.gameplay.fightMgDamage = clampSettingValue(
        src?.gameplay?.fightMgDamage ?? defaults.gameplay.fightMgDamage,
        SETTINGS_LIMITS.gameplay.fightMgDamage,
        defaults.gameplay.fightMgDamage
    );
    merged.gameplay.planarMode = !!(src?.gameplay?.planarMode ?? defaults.gameplay.planarMode);
    merged.gameplay.portalCount = clampSettingValue(
        src?.gameplay?.portalCount ?? defaults.gameplay.portalCount,
        SETTINGS_LIMITS.gameplay.portalCount,
        defaults.gameplay.portalCount
    );
    merged.gameplay.planarLevelCount = clampSettingValue(
        src?.gameplay?.planarLevelCount ?? defaults.gameplay.planarLevelCount,
        SETTINGS_LIMITS.gameplay.planarLevelCount,
        defaults.gameplay.planarLevelCount
    );
    merged.gameplay.portalBeams = false;
}

function applyBotBridgeSanitization({ merged, src, defaults }) {
    merged.botBridge = {
        enabled: !!(src?.botBridge?.enabled ?? defaults.botBridge.enabled),
        url: typeof src?.botBridge?.url === 'string' && src.botBridge.url.trim()
            ? src.botBridge.url.trim()
            : defaults.botBridge.url,
        timeoutMs: clampSettingValue(
            src?.botBridge?.timeoutMs ?? defaults.botBridge.timeoutMs,
            SETTINGS_LIMITS.botBridge.timeoutMs,
            defaults.botBridge.timeoutMs
        ),
        maxRetries: clampSettingValue(
            src?.botBridge?.maxRetries ?? defaults.botBridge.maxRetries,
            SETTINGS_LIMITS.botBridge.maxRetries,
            defaults.botBridge.maxRetries
        ),
        retryDelayMs: clampSettingValue(
            src?.botBridge?.retryDelayMs ?? defaults.botBridge.retryDelayMs,
            SETTINGS_LIMITS.botBridge.retryDelayMs,
            defaults.botBridge.retryDelayMs
        ),
        resumeCheckpoint: typeof src?.botBridge?.resumeCheckpoint === 'string'
            ? src.botBridge.resumeCheckpoint.trim()
            : defaults.botBridge.resumeCheckpoint,
        resumeStrict: typeof src?.botBridge?.resumeStrict === 'boolean'
            ? src.botBridge.resumeStrict
            : defaults.botBridge.resumeStrict,
    };
}

function applyControlAndMediaSanitization({ merged, src, defaults }) {
    merged.recording = normalizeRecordingCaptureSettings(
        src?.recording,
        defaults.recording || createDefaultRecordingCaptureSettings()
    );
    merged.cameraPerspective = normalizeCameraPerspectiveSettings(
        src?.cameraPerspective,
        defaults.cameraPerspective || createDefaultCameraPerspectiveSettings()
    );
    merged.controls.PLAYER_1 = normalizeControlBindings(src?.controls?.PLAYER_1, defaults.controls.PLAYER_1, { guardCombatConflicts: true });
    merged.controls.PLAYER_2 = normalizeControlBindings(src?.controls?.PLAYER_2, defaults.controls.PLAYER_2, { guardCombatConflicts: true });
    merged.controls.GLOBAL = normalizeGlobalControlBindings(src?.controls?.GLOBAL, defaults.controls.GLOBAL);
}

function applyMenuContractPayloadSanitization({ merged, src }) {
    if (src?.menuFeatureFlags && typeof src.menuFeatureFlags === 'object') {
        merged.menuFeatureFlags = { ...src.menuFeatureFlags };
    }
    if (src?.menuContracts && typeof src.menuContracts === 'object') {
        merged.menuContracts = { ...src.menuContracts };
    }
    if (src?.matchSettings && typeof src.matchSettings === 'object') {
        merged.matchSettings = { ...src.matchSettings };
    }
    if (src?.playerLoadout && typeof src.playerLoadout === 'object') {
        merged.playerLoadout = { ...src.playerLoadout };
    }
    if (src?.localSettings && typeof src.localSettings === 'object') {
        merged.localSettings = { ...src.localSettings };
    }
}

function finalizeSanitizedSettings({ merged, migratedSessionType }) {
    ensureMenuContractState(merged);
    merged.localSettings.sessionType = migratedSessionType;
    merged.localSettings.modePath = normalizeModePath(merged.localSettings.modePath, 'normal');
    applyMenuCompatibilityRuleSet(merged);
    return merged;
}

export function sanitizeSettingsSnapshot(saved, createDefaultSettings) {
    const defaults = createDefaultSettings();
    const src = saved && typeof saved === 'object' ? saved : {};

    if ((src.settingsVersion || 0) < (defaults.settingsVersion || 0)) {
        return deepClone(defaults);
    }

    const merged = deepClone(defaults);
    const migratedSessionType = normalizeSessionType(
        src?.localSettings?.sessionType || (src.mode === '2p' ? MENU_SESSION_TYPES.SPLITSCREEN : MENU_SESSION_TYPES.SINGLE)
    );

    applySessionSanitization({ merged, src, defaults, migratedSessionType });
    applyGameplaySanitization({ merged, src, defaults });
    applyBotBridgeSanitization({ merged, src, defaults });
    applyControlAndMediaSanitization({ merged, src, defaults });
    applyMenuContractPayloadSanitization({ merged, src });

    return finalizeSanitizedSettings({ merged, migratedSessionType });
}
