import { SETTINGS_CHANGE_KEYS } from '../../composition/core-ui/CoreSettingsPorts.js';

const PATH_CHANGE_KEY_ENTRIES = Object.freeze([
    ['localSettings.sessionType', SETTINGS_CHANGE_KEYS.SESSION_TYPE],
    ['localSettings.modePath', SETTINGS_CHANGE_KEYS.MODE_PATH],
    ['localSettings.multiplayerTransport', SETTINGS_CHANGE_KEYS.MULTIPLAYER_TRANSPORT],
    ['localSettings.themeMode', SETTINGS_CHANGE_KEYS.LOCAL_THEME_MODE],
    ['localSettings.shadowQuality', SETTINGS_CHANGE_KEYS.LOCAL_SHADOW_QUALITY],
    ['localSettings.startSetup.arcadeGhostDuelMode', SETTINGS_CHANGE_KEYS.ARCADE_GHOST_DUEL_MODE],
    ['mode', SETTINGS_CHANGE_KEYS.MODE],
    ['gameMode', SETTINGS_CHANGE_KEYS.GAME_MODE],
    ['mapKey', SETTINGS_CHANGE_KEYS.MAP_KEY],
    ['numBots', SETTINGS_CHANGE_KEYS.BOTS_COUNT],
    ['botDifficulty', SETTINGS_CHANGE_KEYS.BOTS_DIFFICULTY],
    ['winsNeeded', SETTINGS_CHANGE_KEYS.RULES_WINS_NEEDED],
    ['autoRoll', SETTINGS_CHANGE_KEYS.RULES_AUTO_ROLL],
    ['portalsEnabled', SETTINGS_CHANGE_KEYS.RULES_PORTALS_ENABLED],
    ['hunt.respawnEnabled', SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED],
    ['vehicles.player1', SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_1],
    ['vehicles.player2', SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_2],
    ['invertPitch.player1', SETTINGS_CHANGE_KEYS.RULES_INVERT_P1],
    ['invertPitch.player2', SETTINGS_CHANGE_KEYS.RULES_INVERT_P2],
    ['cockpitCamera.player1', SETTINGS_CHANGE_KEYS.RULES_COCKPIT_P1],
    ['cockpitCamera.player2', SETTINGS_CHANGE_KEYS.RULES_COCKPIT_P2],
    ['gameplay.speed', SETTINGS_CHANGE_KEYS.GAMEPLAY_SPEED],
    ['gameplay.turnSensitivity', SETTINGS_CHANGE_KEYS.GAMEPLAY_TURN_SENSITIVITY],
    ['gameplay.planeScale', SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANE_SCALE],
    ['gameplay.trailWidth', SETTINGS_CHANGE_KEYS.GAMEPLAY_TRAIL_WIDTH],
    ['gameplay.gapSize', SETTINGS_CHANGE_KEYS.GAMEPLAY_GAP_SIZE],
    ['gameplay.gapFrequency', SETTINGS_CHANGE_KEYS.GAMEPLAY_GAP_FREQUENCY],
    ['gameplay.itemAmount', SETTINGS_CHANGE_KEYS.GAMEPLAY_ITEM_AMOUNT],
    ['gameplay.fireRate', SETTINGS_CHANGE_KEYS.GAMEPLAY_FIRE_RATE],
    ['gameplay.lockOnAngle', SETTINGS_CHANGE_KEYS.GAMEPLAY_LOCK_ON_ANGLE],
    ['gameplay.nextCheckpointGlowIntensity', SETTINGS_CHANGE_KEYS.GAMEPLAY_NEXT_CHECKPOINT_GLOW_INTENSITY],
    ['gameplay.mgTrailAimRadius', SETTINGS_CHANGE_KEYS.GAMEPLAY_MG_TRAIL_AIM_RADIUS],
    ['gameplay.fightPlayerHp', SETTINGS_CHANGE_KEYS.GAMEPLAY_FIGHT_PLAYER_HP],
    ['gameplay.fightMgDamage', SETTINGS_CHANGE_KEYS.GAMEPLAY_FIGHT_MG_DAMAGE],
    ['gameplay.planarMode', SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_MODE],
    ['gameplay.portalCount', SETTINGS_CHANGE_KEYS.GAMEPLAY_PORTAL_COUNT],
    ['gameplay.planarLevelCount', SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_LEVEL_COUNT],
    ['recording.profile', SETTINGS_CHANGE_KEYS.RECORDING_PROFILE],
    ['recording.hudMode', SETTINGS_CHANGE_KEYS.RECORDING_HUD_MODE],
    ['cameraPerspective.normal', SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_NORMAL],
    ['cameraPerspective.reduceMotion', SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_REDUCE_MOTION],
    ['cameraPerspective.speedFovEnabled', SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_SPEED_FOV_ENABLED],
    ['cameraPerspective.speedFovIntensity', SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_SPEED_FOV_INTENSITY],
    ['cameraPerspective.thrusterExhaustEnabled', SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_THRUSTER_EXHAUST_ENABLED],
    ['cameraPerspective.thrusterExhaustIntensity', SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_THRUSTER_EXHAUST_INTENSITY],
    ['matchSettings.activePresetId', SETTINGS_CHANGE_KEYS.PRESET_ACTIVE_ID],
    ['matchSettings.activePresetKind', SETTINGS_CHANGE_KEYS.PRESET_ACTIVE_KIND],
    ['matchSettings.activePresetSourceId', SETTINGS_CHANGE_KEYS.PRESET_STATUS],
    ['localSettings.developerModeEnabled', SETTINGS_CHANGE_KEYS.DEVELOPER_MODE_ENABLED],
    ['localSettings.developerThemeId', SETTINGS_CHANGE_KEYS.DEVELOPER_THEME_ID],
    ['localSettings.developerModeVisibility', SETTINGS_CHANGE_KEYS.DEVELOPER_VISIBILITY_MODE],
    ['localSettings.fixedPresetLockEnabled', SETTINGS_CHANGE_KEYS.DEVELOPER_FIXED_PRESET_LOCK],
    ['localSettings.actorId', SETTINGS_CHANGE_KEYS.DEVELOPER_ACTOR_ID],
    ['localSettings.releasePreviewEnabled', SETTINGS_CHANGE_KEYS.DEVELOPER_RELEASE_PREVIEW],
]);

const PATH_CHANGE_KEY_MAP = new Map(PATH_CHANGE_KEY_ENTRIES);

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneComparableValue(value) {
    if (value === undefined) return null;
    if (!value || typeof value !== 'object') return value;
    return JSON.parse(JSON.stringify(value));
}

function isEqualValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function getChangeKeyForPath(path) {
    if (PATH_CHANGE_KEY_MAP.has(path)) {
        return PATH_CHANGE_KEY_MAP.get(path);
    }
    for (const [prefix, changeKey] of PATH_CHANGE_KEY_ENTRIES) {
        if (path.startsWith(`${prefix}.`)) {
            return changeKey;
        }
    }
    return null;
}

function collectChanges(before, after, path, changes) {
    if (isPlainObject(before) && isPlainObject(after)) {
        const keys = Array.from(new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ])).sort();
        for (const key of keys) {
            collectChanges(before[key], after[key], path ? `${path}.${key}` : key, changes);
        }
        return;
    }

    if (isEqualValue(before, after)) return;
    changes.push({
        path,
        before: cloneComparableValue(before),
        after: cloneComparableValue(after),
        changeKey: getChangeKeyForPath(path),
    });
}

export function diffSettingsSnapshots(before, after) {
    const changes = [];
    collectChanges(
        before && typeof before === 'object' ? before : {},
        after && typeof after === 'object' ? after : {},
        '',
        changes
    );
    const changedKeys = Array.from(new Set(
        changes
            .map((change) => change.changeKey)
            .filter((changeKey) => typeof changeKey === 'string' && changeKey.trim())
    ));
    return {
        changed: changes.length > 0,
        changedKeys,
        changes,
    };
}
