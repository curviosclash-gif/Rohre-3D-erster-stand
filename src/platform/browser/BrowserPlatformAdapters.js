import {
    createPlatformCapabilityDescriptor,
    PLATFORM_CAPABILITY_IDS,
} from '../../shared/contracts/PlatformCapabilityContract.js';

const NOOP = () => {};

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function createBrowserCapability(capabilityId, descriptor = {}) {
    return Object.freeze(createPlatformCapabilityDescriptor(capabilityId, descriptor));
}

function normalizeSaveResult(result, defaultSaved = true) {
    if (result && typeof result === 'object') {
        return {
            saved: result.saved !== false,
            ...result,
        };
    }
    if (result === false) {
        return { saved: false };
    }
    return { saved: defaultSaved };
}

async function invokeSaveImpl(saveImpl, args, defaultSaved = true) {
    if (typeof saveImpl !== 'function') {
        return { saved: false };
    }
    try {
        const result = await saveImpl(...args);
        return normalizeSaveResult(result, defaultSaved);
    } catch (error) {
        return {
            saved: false,
            error,
        };
    }
}

export function createBrowserDiscoveryAdapter() {
    const capability = createBrowserCapability(PLATFORM_CAPABILITY_IDS.DISCOVERY, {
        available: false,
        providerKind: 'browser-demo',
        contractVersion: 'browser.discovery.v1',
        degradedReason: 'desktop_only',
        supportsSubscribe: false,
    });

    return Object.freeze({
        adapterName: 'browser.discovery.v1',
        contractVersion: capability.contractVersion,
        capability,
        isAvailable: () => false,
        startDiscovery: NOOP,
        stopDiscovery: NOOP,
        getDiscoveredHosts: async () => [],
        onDiscoveredHosts: () => NOOP,
    });
}

export function createBrowserHostAdapter() {
    const capability = createBrowserCapability(PLATFORM_CAPABILITY_IDS.HOST, {
        available: false,
        providerKind: 'browser-demo',
        contractVersion: 'browser.host.v1',
        degradedReason: 'desktop_only',
        supportsSessionOwnership: false,
    });

    const getLanServerStatus = async () => null;
    const startLanServer = async () => ({ running: false });
    const stopLanServer = async () => ({ running: false });

    return Object.freeze({
        adapterName: 'browser.host.v1',
        contractVersion: capability.contractVersion,
        capability,
        isAvailable: () => false,
        getLanServerStatus,
        startLanServer,
        stopLanServer,
        getStatus: getLanServerStatus,
        start: startLanServer,
        stop: stopLanServer,
    });
}

export function createBrowserSaveAdapter(options = {}) {
    const saveReplayImpl = typeof options.saveReplay === 'function' ? options.saveReplay : null;
    const saveVideoImpl = typeof options.saveVideo === 'function' ? options.saveVideo : null;
    const available = !!(saveReplayImpl || saveVideoImpl);
    const capability = createBrowserCapability(PLATFORM_CAPABILITY_IDS.SAVE, {
        available,
        providerKind: normalizeString(options.providerKind, available ? 'browser-download' : 'browser-demo'),
        contractVersion: normalizeString(options.contractVersion, 'browser.save.v1'),
        degradedReason: normalizeString(options.degradedReason, available ? '' : 'save_unavailable'),
        supportsBinaryExport: typeof saveVideoImpl === 'function',
    });

    return Object.freeze({
        adapterName: 'browser.save.v1',
        contractVersion: capability.contractVersion,
        capability,
        isAvailable: () => capability.available === true,
        saveReplay: (payload, fileName) => invokeSaveImpl(saveReplayImpl, [payload, fileName], true),
        saveVideo: (payload, fileName, mimeType) => invokeSaveImpl(saveVideoImpl, [payload, fileName, mimeType], true),
    });
}

export function createBrowserRecordingAdapter(options = {}) {
    const available = options.available === true;
    const capability = createBrowserCapability(PLATFORM_CAPABILITY_IDS.RECORDING, {
        available,
        providerKind: normalizeString(options.providerKind, available ? 'browser-native' : 'browser-demo'),
        contractVersion: normalizeString(options.contractVersion, 'browser.recording.v1'),
        degradedReason: normalizeString(options.degradedReason, available ? '' : 'recording_unavailable'),
        supportsCapture: options.supportsCapture === true || available,
    });

    return Object.freeze({
        adapterName: 'browser.recording.v1',
        contractVersion: capability.contractVersion,
        capability,
        support: options.support && typeof options.support === 'object'
            ? { ...options.support }
            : null,
        isAvailable: () => capability.available === true,
    });
}
