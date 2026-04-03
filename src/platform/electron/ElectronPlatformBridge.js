import {
    createPlatformCapabilityDescriptor,
    createPlatformCapabilitySnapshot,
    PLATFORM_CAPABILITY_IDS,
} from '../../shared/contracts/PlatformCapabilityContract.js';
import {
    PLATFORM_RUNTIME_KINDS,
    resolveCapabilityProviderKind,
    resolvePlatformRuntimeKind,
} from '../../shared/contracts/PlatformCapabilityRegistry.js';

const PRELOAD_CONTRACT_VERSIONS = Object.freeze({
    discovery: 'preload.discovery.v1',
    host: 'preload.host.v1',
    save: 'preload.save.v1',
    recording: 'preload.recording.v1',
});

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function resolveRuntimeGlobal(runtimeGlobal = globalThis) {
    return runtimeGlobal && typeof runtimeGlobal === 'object' ? runtimeGlobal : globalThis;
}

function resolveAppRuntime(runtimeGlobal = globalThis) {
    const globalRef = resolveRuntimeGlobal(runtimeGlobal);
    const appRuntime = globalRef?.curviosApp && typeof globalRef.curviosApp === 'object'
        ? globalRef.curviosApp
        : {};
    return {
        globalRef,
        appRuntime,
    };
}

function resolveNamedContract(appRuntime, key) {
    const contracts = appRuntime?.contracts && typeof appRuntime.contracts === 'object'
        ? appRuntime.contracts
        : null;
    const contract = contracts?.[key] || appRuntime?.[key] || null;
    return contract && typeof contract === 'object' ? contract : null;
}

function resolveNamedCapability(appRuntime, key) {
    const capabilities = appRuntime?.capabilities && typeof appRuntime.capabilities === 'object'
        ? appRuntime.capabilities
        : null;
    const capability = capabilities?.[key];
    return capability && typeof capability === 'object' ? capability : null;
}

function isCallable(value) {
    return typeof value === 'function';
}

function createIntent(primaryContext, primaryFn, fallbackContext, fallbackFn) {
    if (isCallable(primaryFn)) {
        return (...args) => primaryFn.call(primaryContext, ...args);
    }
    if (isCallable(fallbackFn)) {
        return (...args) => fallbackFn.call(fallbackContext, ...args);
    }
    return null;
}

function createElectronCapabilityDescriptor(capabilityId, descriptor, fallback = {}) {
    const source = descriptor && typeof descriptor === 'object' ? descriptor : {};
    return Object.freeze(createPlatformCapabilityDescriptor(capabilityId, {
        ...fallback,
        ...source,
        contractVersion: normalizeString(source.contractVersion, normalizeString(fallback.contractVersion, '')),
        providerKind: normalizeString(source.providerKind, normalizeString(fallback.providerKind, 'unavailable')),
        degradedReason: normalizeString(source.degradedReason, normalizeString(fallback.degradedReason, '')),
    }));
}

export function isElectronPreloadRuntime(runtimeGlobal = globalThis) {
    return resolvePlatformRuntimeKind({ runtimeGlobal }) === PLATFORM_RUNTIME_KINDS.ELECTRON;
}

export function createElectronPreloadDiscoveryAdapter(runtimeGlobal = globalThis) {
    const { appRuntime } = resolveAppRuntime(runtimeGlobal);
    const discoveryContract = resolveNamedContract(appRuntime, 'discovery');
    const startDiscovery = createIntent(discoveryContract, discoveryContract?.start, appRuntime, appRuntime?.startDiscovery);
    const stopDiscovery = createIntent(discoveryContract, discoveryContract?.stop, appRuntime, appRuntime?.stopDiscovery);
    const getDiscoveredHosts = createIntent(discoveryContract, discoveryContract?.listHosts, appRuntime, appRuntime?.getDiscoveredHosts);
    const onDiscoveredHosts = createIntent(discoveryContract, discoveryContract?.subscribeHosts, appRuntime, appRuntime?.onDiscoveredHosts);
    const capability = createElectronCapabilityDescriptor(
        PLATFORM_CAPABILITY_IDS.DISCOVERY,
        resolveNamedCapability(appRuntime, 'discovery'),
        {
            available: !!(startDiscovery && stopDiscovery && onDiscoveredHosts),
            providerKind: resolveCapabilityProviderKind(PLATFORM_CAPABILITY_IDS.DISCOVERY, {
                runtimeGlobal,
                available: !!(startDiscovery && stopDiscovery && onDiscoveredHosts),
            }),
            contractVersion: discoveryContract?.contractVersion || PRELOAD_CONTRACT_VERSIONS.discovery,
            degradedReason: isElectronPreloadRuntime(runtimeGlobal) ? 'discovery_unavailable' : 'desktop_shell_unavailable',
            supportsSubscribe: !!onDiscoveredHosts,
        }
    );

    return Object.freeze({
        adapterName: 'electron.preload.discovery.v1',
        contractVersion: capability.contractVersion,
        capability,
        isAvailable: () => capability.available === true,
        startDiscovery,
        stopDiscovery,
        getDiscoveredHosts,
        onDiscoveredHosts,
        start: startDiscovery,
        stop: stopDiscovery,
        listHosts: getDiscoveredHosts,
        subscribeHosts: onDiscoveredHosts,
    });
}

export function createElectronPreloadHostAdapter(runtimeGlobal = globalThis) {
    const { appRuntime } = resolveAppRuntime(runtimeGlobal);
    const hostContract = resolveNamedContract(appRuntime, 'host');
    const getLanServerStatus = createIntent(hostContract, hostContract?.getStatus, appRuntime, appRuntime?.getLanServerStatus);
    const startLanServer = createIntent(hostContract, hostContract?.start, appRuntime, appRuntime?.startLanServer);
    const stopLanServer = createIntent(hostContract, hostContract?.stop, appRuntime, appRuntime?.stopLanServer);
    const capability = createElectronCapabilityDescriptor(
        PLATFORM_CAPABILITY_IDS.HOST,
        resolveNamedCapability(appRuntime, 'host'),
        {
            available: !!(getLanServerStatus && startLanServer && stopLanServer),
            providerKind: resolveCapabilityProviderKind(PLATFORM_CAPABILITY_IDS.HOST, {
                runtimeGlobal,
                available: !!(getLanServerStatus && startLanServer && stopLanServer),
            }),
            contractVersion: hostContract?.contractVersion || PRELOAD_CONTRACT_VERSIONS.host,
            degradedReason: isElectronPreloadRuntime(runtimeGlobal) ? 'host_unavailable' : 'desktop_shell_unavailable',
            supportsSessionOwnership: true,
        }
    );

    return Object.freeze({
        adapterName: 'electron.preload.host.v1',
        contractVersion: capability.contractVersion,
        capability,
        isAvailable: () => capability.available === true,
        getLanServerStatus,
        startLanServer,
        stopLanServer,
        getStatus: getLanServerStatus,
        start: startLanServer,
        stop: stopLanServer,
    });
}

export function createElectronPreloadSaveAdapter(runtimeGlobal = globalThis) {
    const { appRuntime } = resolveAppRuntime(runtimeGlobal);
    const saveContract = resolveNamedContract(appRuntime, 'save');
    const saveReplay = createIntent(saveContract, saveContract?.saveReplay, appRuntime, appRuntime?.saveReplay);
    const saveVideo = createIntent(saveContract, saveContract?.saveVideo, appRuntime, appRuntime?.saveVideo);
    const capability = createElectronCapabilityDescriptor(
        PLATFORM_CAPABILITY_IDS.SAVE,
        resolveNamedCapability(appRuntime, 'save'),
        {
            available: !!(saveReplay || saveVideo),
            providerKind: resolveCapabilityProviderKind(PLATFORM_CAPABILITY_IDS.SAVE, {
                runtimeGlobal,
                available: !!(saveReplay || saveVideo),
            }),
            contractVersion: saveContract?.contractVersion || PRELOAD_CONTRACT_VERSIONS.save,
            degradedReason: isElectronPreloadRuntime(runtimeGlobal) ? 'save_unavailable' : 'desktop_shell_unavailable',
            supportsBinaryExport: !!saveVideo,
        }
    );

    return Object.freeze({
        adapterName: 'electron.preload.save.v1',
        contractVersion: capability.contractVersion,
        capability,
        isAvailable: () => capability.available === true,
        saveReplay,
        saveVideo,
    });
}

export function createElectronPreloadRecordingAdapter(runtimeGlobal = globalThis) {
    const { appRuntime } = resolveAppRuntime(runtimeGlobal);
    const recordingContract = resolveNamedContract(appRuntime, 'recording');
    const explicitCapability = resolveNamedCapability(appRuntime, 'recording');
    const capability = createElectronCapabilityDescriptor(
        PLATFORM_CAPABILITY_IDS.RECORDING,
        explicitCapability,
        {
            available: recordingContract?.supportsCapture === true || isElectronPreloadRuntime(runtimeGlobal),
            providerKind: resolveCapabilityProviderKind(PLATFORM_CAPABILITY_IDS.RECORDING, {
                runtimeGlobal,
                available: recordingContract?.supportsCapture === true || isElectronPreloadRuntime(runtimeGlobal),
            }),
            contractVersion: recordingContract?.contractVersion || PRELOAD_CONTRACT_VERSIONS.recording,
            degradedReason: isElectronPreloadRuntime(runtimeGlobal) ? 'recording_unavailable' : 'desktop_shell_unavailable',
            supportsCapture: recordingContract?.supportsCapture === true
                || explicitCapability?.supportsCapture === true
                || isElectronPreloadRuntime(runtimeGlobal),
        }
    );

    return Object.freeze({
        adapterName: 'electron.preload.recording.v1',
        contractVersion: capability.contractVersion,
        capability,
        isAvailable: () => capability.available === true,
    });
}

export function getElectronPlatformCapabilitySnapshot(runtimeGlobal = globalThis) {
    const discoveryAdapter = createElectronPreloadDiscoveryAdapter(runtimeGlobal);
    const hostAdapter = createElectronPreloadHostAdapter(runtimeGlobal);
    const saveAdapter = createElectronPreloadSaveAdapter(runtimeGlobal);
    const recordingAdapter = createElectronPreloadRecordingAdapter(runtimeGlobal);

    return createPlatformCapabilitySnapshot({
        runtimeKind: resolvePlatformRuntimeKind({ runtimeGlobal }),
        discovery: discoveryAdapter.capability,
        host: hostAdapter.capability,
        save: saveAdapter.capability,
        recording: recordingAdapter.capability,
    });
}

export function isDesktopPlatformRuntime(runtimeGlobal = globalThis) {
    if (isElectronPreloadRuntime(runtimeGlobal)) {
        return true;
    }
    const snapshot = getElectronPlatformCapabilitySnapshot(runtimeGlobal);
    return snapshot.discovery.available || snapshot.host.available || snapshot.save.available;
}

export const createElectronDiscoveryIntentBridge = createElectronPreloadDiscoveryAdapter;
export const createElectronHostIntentBridge = createElectronPreloadHostAdapter;
