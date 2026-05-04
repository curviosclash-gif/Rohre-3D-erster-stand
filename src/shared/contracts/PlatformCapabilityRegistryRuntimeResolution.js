import {
    PLATFORM_PRODUCT_SURFACE_IDS,
    PLATFORM_RUNTIME_KINDS,
} from './PlatformCapabilityData.js';
import {
    normalizePlatformProductSurfaceId,
    normalizePlatformRuntimeKind,
    normalizeString,
} from './PlatformCapabilityRegistryNormalization.js';

export function resolvePlatformRuntimeKind(options = {}) {
    const explicitRuntimeKind = normalizePlatformRuntimeKind(options.runtimeKind, '');
    if (explicitRuntimeKind) {
        return explicitRuntimeKind;
    }
    const snapshotRuntimeKind = normalizePlatformRuntimeKind(options?.platformRuntimeSnapshot?.runtimeKind, '');
    return snapshotRuntimeKind || PLATFORM_RUNTIME_KINDS.WEB;
}

export function resolvePlatformProductSurfaceId(options = {}) {
    const explicitProductSurfaceId = normalizePlatformProductSurfaceId(options.productSurfaceId, '');
    if (explicitProductSurfaceId) {
        return explicitProductSurfaceId;
    }
    const normalizedAppMode = normalizeString(options.appMode, '').toLowerCase();
    if (normalizedAppMode === 'app') {
        return PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP;
    }
    return resolvePlatformRuntimeKind(options) === PLATFORM_RUNTIME_KINDS.ELECTRON
        ? PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP
        : PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO;
}
