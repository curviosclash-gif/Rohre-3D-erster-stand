import { isDesktopPlatformRuntime } from '../../platform/electron/ElectronPlatformBridge.js';
import { createMenuFeatureFlags } from './MenuStateContracts.js';

/* global __APP_MODE__ */

export function isDesktopAppRuntime(runtimeGlobal = globalThis) {
    const appMode = typeof __APP_MODE__ !== 'undefined' ? String(__APP_MODE__).trim().toLowerCase() : 'web';
    if (appMode === 'app') {
        return true;
    }

    return isDesktopPlatformRuntime(runtimeGlobal);
}

export function resolveRuntimeMenuFeatureFlags(sourceFlags = null, runtimeGlobal = globalThis) {
    const featureFlags = createMenuFeatureFlags(sourceFlags);
    return {
        ...featureFlags,
        canHost: isDesktopAppRuntime(runtimeGlobal),
    };
}
