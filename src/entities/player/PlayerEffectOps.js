import { CONFIG } from '../../core/Config.js';
import { grantShield } from '../../hunt/HealthSystem.js';
import { resolveEntityRuntimeConfig } from '../../shared/contracts/EntityRuntimeConfig.js';
import { isPickupTypeAllowedForMode, getPickupDefinition } from '../PickupRegistry.js';

const SPEED_EFFECT_TYPES = Object.freeze(['SPEED_UP', 'SLOW_DOWN']);
const TRAIL_EFFECT_TYPES = Object.freeze(['THICK', 'THIN']);
const GLOBAL_TIME_EFFECT_TYPES = Object.freeze(['SLOW_TIME']);

function resolveModeType(player) {
    const config = resolveEntityRuntimeConfig(player);
    const enabled = config?.HUNT?.ENABLED !== false;
    const activeMode = String(config?.HUNT?.ACTIVE_MODE || config?.HUNT?.DEFAULT_MODE || 'CLASSIC').trim().toUpperCase();
    if (!enabled && activeMode === 'HUNT') {
        return 'CLASSIC';
    }
    return activeMode || 'CLASSIC';
}

function findLatestAllowedEffect(player, effectTypes = [], modeType = 'CLASSIC') {
    const activeEffects = Array.isArray(player?.activeEffects) ? player.activeEffects : [];
    for (let i = activeEffects.length - 1; i >= 0; i -= 1) {
        const effect = activeEffects[i];
        if (!effectTypes.includes(effect?.type)) continue;
        if (!isPickupTypeAllowedForMode(effect.type, modeType)) continue;
        return effect;
    }
    return null;
}

function hasAllowedEffect(player, type, modeType = 'CLASSIC') {
    const activeEffects = Array.isArray(player?.activeEffects) ? player.activeEffects : [];
    for (let i = 0; i < activeEffects.length; i += 1) {
        const effect = activeEffects[i];
        if (effect?.type !== type) continue;
        if (!isPickupTypeAllowedForMode(type, modeType)) continue;
        return true;
    }
    return false;
}

function removeEffectAtIndex(player, index) {
    if (!player || !Array.isArray(player.activeEffects)) return;
    if (index < 0 || index >= player.activeEffects.length) return;
    player.activeEffects.splice(index, 1);
}

function resetShieldState(player) {
    player.hasShield = false;
    player.shieldHP = 0;
    player.shieldHitFeedback = 0;
}

export function recomputePlayerEffectState(player) {
    if (!player) return;

    const modeType = resolveModeType(player);
    const runtimeConfig = resolveEntityRuntimeConfig(player);
    const powerupTypes = runtimeConfig?.POWERUP?.TYPES || CONFIG.POWERUP.TYPES;

    const speedEffect = findLatestAllowedEffect(player, SPEED_EFFECT_TYPES, modeType);
    const speedMultiplier = Number(powerupTypes?.[speedEffect?.type]?.multiplier);
    player.baseSpeed = Number.isFinite(speedMultiplier)
        ? CONFIG.PLAYER.SPEED * speedMultiplier
        : CONFIG.PLAYER.SPEED;
    player.speed = player.baseSpeed;

    const trailEffect = findLatestAllowedEffect(player, TRAIL_EFFECT_TYPES, modeType);
    const trailWidth = Number(powerupTypes?.[trailEffect?.type]?.trailWidth);
    if (player.trail) {
        if (Number.isFinite(trailWidth) && trailWidth > 0) {
            player.trail.setWidth(trailWidth);
        } else {
            player.trail.resetWidth();
        }
    }

    player.isGhost = hasAllowedEffect(player, 'GHOST', modeType);
    player.invertControls = hasAllowedEffect(player, 'INVERT', modeType);

    const slowTimeEffect = findLatestAllowedEffect(player, GLOBAL_TIME_EFFECT_TYPES, modeType);
    const slowTimeDef = slowTimeEffect ? getPickupDefinition(slowTimeEffect.type) : null;
    player.hasSlowTime = !!slowTimeEffect;
    player.slowTimeScale = Number.isFinite(slowTimeDef?.timeScale) ? slowTimeDef.timeScale : 1;

    const shieldEffectActive = hasAllowedEffect(player, 'SHIELD', modeType);
    if (!shieldEffectActive) {
        resetShieldState(player);
    } else if (modeType !== 'HUNT' && !player.hasShield) {
        grantShield(player, runtimeConfig);
    }
}

export function removePlayerEffect(player, effect) {
    if (!player || !effect || !Array.isArray(player.activeEffects)) return;
    const index = player.activeEffects.indexOf(effect);
    if (index >= 0) {
        removeEffectAtIndex(player, index);
    }
    recomputePlayerEffectState(player);
}

export function updatePlayerEffects(player, dt) {
    if (!player) return;

    const modeType = resolveModeType(player);
    for (let i = player.activeEffects.length - 1; i >= 0; i -= 1) {
        const effect = player.activeEffects[i];
        if (!effect || !isPickupTypeAllowedForMode(effect.type, modeType)) {
            removeEffectAtIndex(player, i);
            continue;
        }

        if (effect.type === 'SHIELD') {
            const shieldActive = !!player.hasShield && (Number(player.shieldHP) || 0) > 0;
            if (!shieldActive) {
                removeEffectAtIndex(player, i);
                continue;
            }
            if (modeType === 'HUNT') {
                continue;
            }
        }

        effect.remaining -= dt;
        if (effect.remaining <= 0) {
            removeEffectAtIndex(player, i);
        }
    }

    recomputePlayerEffectState(player);

    if (player.boostPortalTimer > 0) {
        player.boostPortalTimer -= dt;
        if (player.boostPortalTimer <= 0) {
            player.boostPortalParams = null;
        }
    }
    if (player.slingshotTimer > 0) {
        player.slingshotTimer -= dt;
        if (player.slingshotTimer <= 0) {
            player.slingshotParams = null;
        }
    }
}

export function applyPlayerPowerup(player, type) {
    if (!player) return;

    const runtimeConfig = resolveEntityRuntimeConfig(player);
    const powerupTypes = runtimeConfig?.POWERUP?.TYPES || CONFIG.POWERUP.TYPES;
    const config = powerupTypes[type];
    if (!config) return;

    const modeType = resolveModeType(player);
    if (!isPickupTypeAllowedForMode(type, modeType)) {
        return;
    }

    for (let i = player.activeEffects.length - 1; i >= 0; i -= 1) {
        if (player.activeEffects[i]?.type === type) {
            removeEffectAtIndex(player, i);
        }
    }

    player.activeEffects.push({
        type,
        remaining: Number.isFinite(Number(config.duration)) ? Number(config.duration) : 0,
    });

    if (type === 'SHIELD') {
        grantShield(player, runtimeConfig);
    }

    recomputePlayerEffectState(player);
}
