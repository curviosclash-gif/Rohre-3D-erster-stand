import { PLATFORM_CAPABILITY_IDS } from '../../shared/contracts/PlatformCapabilityContract.js';
import {
    isDesktopProductSurface,
    resolveSurfacePolicy,
    resolveSurfaceCapabilityAccess,
} from '../../shared/contracts/PlatformCapabilityRegistry.js';
import { resolveElectronRuntimeSnapshot } from '../../platform/electron/ElectronPlatformBridge.js';
import { createMenuFeatureFlags } from './MenuStateContracts.js';

/* global __APP_MODE__ */

export function isDesktopAppRuntime(runtimeGlobal = globalThis) {
    const appMode = typeof __APP_MODE__ !== 'undefined' ? String(__APP_MODE__).trim().toLowerCase() : 'web';
    const platformRuntimeSnapshot = resolveElectronRuntimeSnapshot(runtimeGlobal);
    return isDesktopProductSurface({
        appMode,
        platformRuntimeSnapshot,
    });
}

export function resolveRuntimeMenuFeatureFlags(sourceFlags = null, runtimeGlobal = globalThis) {
    const featureFlags = createMenuFeatureFlags(sourceFlags);
    const appMode = typeof __APP_MODE__ !== 'undefined' ? String(__APP_MODE__).trim().toLowerCase() : 'web';
    const platformRuntimeSnapshot = resolveElectronRuntimeSnapshot(runtimeGlobal);
    const surfacePolicy = resolveSurfacePolicy({
        appMode,
        platformRuntimeSnapshot,
    });
    const hostCapability = resolveSurfaceCapabilityAccess(PLATFORM_CAPABILITY_IDS.HOST, {
        appMode,
        platformRuntimeSnapshot,
    });
    return {
        ...featureFlags,
        canHost: hostCapability.available,
        surfacePolicy,
    };
}
