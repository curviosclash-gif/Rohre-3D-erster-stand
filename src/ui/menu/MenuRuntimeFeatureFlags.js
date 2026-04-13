import { PLATFORM_CAPABILITY_IDS } from '../../shared/contracts/PlatformCapabilityContract.js';
import {
    isDesktopProductSurface,
    resolveSurfacePolicy,
    resolveSurfaceCapabilityAccess,
} from '../../shared/contracts/PlatformCapabilityRegistry.js';
import { createMenuFeatureFlags } from './MenuStateContracts.js';

/* global __APP_MODE__ */

export function isDesktopAppRuntime(runtimeGlobal = globalThis) {
    const appMode = typeof __APP_MODE__ !== 'undefined' ? String(__APP_MODE__).trim().toLowerCase() : 'web';
    return isDesktopProductSurface({
        runtimeGlobal,
        appMode,
    });
}

export function resolveRuntimeMenuFeatureFlags(sourceFlags = null, runtimeGlobal = globalThis) {
    const featureFlags = createMenuFeatureFlags(sourceFlags);
    const appMode = typeof __APP_MODE__ !== 'undefined' ? String(__APP_MODE__).trim().toLowerCase() : 'web';
    const surfacePolicy = resolveSurfacePolicy({
        runtimeGlobal,
        appMode,
    });
    const hostCapability = resolveSurfaceCapabilityAccess(PLATFORM_CAPABILITY_IDS.HOST, {
        runtimeGlobal,
        appMode,
    });
    return {
        ...featureFlags,
        canHost: hostCapability.available,
        surfacePolicy,
    };
}
