import {
    PLATFORM_PRODUCT_SURFACE_IDS,
    PLATFORM_SURFACE_MENU_MODE_PATHS,
    PLATFORM_SURFACE_POLICY_MODES,
    PLATFORM_SURFACE_QUICK_START_ACTION_IDS,
    resolveSurfacePolicy,
} from './PlatformCapabilityRegistry.js';

const VALID_SURFACE_MENU_MODE_PATHS = new Set(Object.values(PLATFORM_SURFACE_MENU_MODE_PATHS));
const VALID_SURFACE_QUICK_START_ACTION_IDS = new Set(Object.values(PLATFORM_SURFACE_QUICK_START_ACTION_IDS));
const SURFACE_POLICY_BLOCKED_REASON = 'surface_policy_blocked';
const SURFACE_POLICY_BLOCKED_TONE = 'warning';
const SURFACE_POLICY_BLOCKED_DURATION_MS = 1600;

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeSurfaceMenuModePath(value, fallback = '') {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_SURFACE_MENU_MODE_PATHS.has(normalized) ? normalized : fallback;
}

function normalizeSurfaceQuickStartActionId(value, fallback = '') {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_SURFACE_QUICK_START_ACTION_IDS.has(normalized) ? normalized : fallback;
}

export function resolveSurfaceFallbackModePath(options = {}) {
    return resolveSurfacePolicy(options).defaultModePath;
}

export function isSurfaceModePathAllowed(modePath, options = {}) {
    const policy = resolveSurfacePolicy(options);
    const normalizedModePath = normalizeSurfaceMenuModePath(modePath, '');
    if (!normalizedModePath) {
        return false;
    }
    if (policy.allowedModePaths.length === 0) {
        return policy.defaultAccessMode === PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL;
    }
    return policy.allowedModePaths.includes(normalizedModePath);
}

export function listSurfaceAllowedMapKeysForModePath(modePath, options = {}) {
    const policy = resolveSurfacePolicy(options);
    const normalizedModePath = normalizeSurfaceMenuModePath(modePath, '');
    if (!normalizedModePath) {
        return Object.freeze([]);
    }
    return Array.isArray(policy.curatedMapKeysByModePath?.[normalizedModePath])
        ? Object.freeze([...policy.curatedMapKeysByModePath[normalizedModePath]])
        : Object.freeze([]);
}

export function isSurfaceMapKeyAllowedForModePath(mapKey, modePath, options = {}) {
    const policy = resolveSurfacePolicy(options);
    const normalizedMapKey = normalizeString(mapKey, '');
    const normalizedModePath = normalizeSurfaceMenuModePath(modePath, '');
    if (!normalizedMapKey || !normalizedModePath) {
        return false;
    }
    if (!isSurfaceModePathAllowed(normalizedModePath, {
        productSurfaceId: policy.productSurfaceId,
    })) {
        return false;
    }
    if (policy.requiresCuratedMaps !== true) {
        return true;
    }
    return listSurfaceAllowedMapKeysForModePath(normalizedModePath, {
        productSurfaceId: policy.productSurfaceId,
    }).includes(normalizedMapKey);
}

export function isSurfacePresetAllowed(presetId, options = {}) {
    const policy = resolveSurfacePolicy(options);
    const normalizedPresetId = normalizeString(presetId, '');
    if (!normalizedPresetId) {
        return false;
    }
    if (policy.allowedPresetIds.length === 0) {
        return policy.defaultAccessMode === PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL;
    }
    return policy.allowedPresetIds.includes(normalizedPresetId);
}

export function isSurfaceQuickStartActionAllowed(actionId, options = {}) {
    const policy = resolveSurfacePolicy(options);
    const normalizedActionId = normalizeSurfaceQuickStartActionId(actionId, '');
    if (!normalizedActionId) {
        return false;
    }
    if (policy.allowedQuickStartActionIds.length === 0) {
        return policy.defaultAccessMode === PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL;
    }
    return policy.allowedQuickStartActionIds.includes(normalizedActionId);
}

export function resolveSurfaceBlockedFeatureFeedback(featureLabel = 'Diese Funktion', options = {}) {
    const policy = resolveSurfacePolicy(options);
    const normalizedFeatureLabel = normalizeString(featureLabel, 'Diese Funktion');
    const isBrowserDemo = policy.productSurfaceId === PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO;
    return Object.freeze({
        reason: SURFACE_POLICY_BLOCKED_REASON,
        productSurfaceId: policy.productSurfaceId,
        message: `${normalizedFeatureLabel} ist in dieser ${isBrowserDemo ? 'Demo' : 'Surface'} nicht verfuegbar.`,
        tone: SURFACE_POLICY_BLOCKED_TONE,
        durationMs: SURFACE_POLICY_BLOCKED_DURATION_MS,
    });
}
