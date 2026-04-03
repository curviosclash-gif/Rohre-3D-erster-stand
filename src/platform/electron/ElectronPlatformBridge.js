import { createPlatformCapabilitySnapshot } from '../../shared/contracts/PlatformCapabilityContract.js';

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

export function getElectronPlatformCapabilitySnapshot(runtimeGlobal = globalThis) {
    const { appRuntime } = resolveAppRuntime(runtimeGlobal);
    const discoveryContract = resolveNamedContract(appRuntime, 'discovery');
    const hostContract = resolveNamedContract(appRuntime, 'host');
    const saveContract = resolveNamedContract(appRuntime, 'save');

    if (appRuntime?.capabilities && typeof appRuntime.capabilities === 'object') {
        return createPlatformCapabilitySnapshot(appRuntime.capabilities);
    }

    return createPlatformCapabilitySnapshot({
        runtimeKind: appRuntime?.isApp === true ? 'electron' : 'web',
        discovery: {
            available: isCallable(discoveryContract?.start) && isCallable(discoveryContract?.stop) && isCallable(discoveryContract?.subscribeHosts),
            providerKind: appRuntime?.isApp === true ? 'electron-ipc' : 'browser-demo',
            contractVersion: discoveryContract?.contractVersion || '',
            supportsSubscribe: isCallable(discoveryContract?.subscribeHosts),
        },
        host: {
            available: isCallable(hostContract?.getStatus) && isCallable(hostContract?.start) && isCallable(hostContract?.stop),
            providerKind: appRuntime?.isApp === true ? 'electron-ipc' : 'browser-demo',
            contractVersion: hostContract?.contractVersion || '',
            supportsSessionOwnership: true,
        },
        save: {
            available: isCallable(saveContract?.saveReplay) || isCallable(saveContract?.saveVideo),
            providerKind: appRuntime?.isApp === true ? 'electron-ipc' : 'browser-demo',
            contractVersion: saveContract?.contractVersion || '',
            supportsBinaryExport: isCallable(saveContract?.saveVideo),
        },
        recording: {
            available: false,
            providerKind: appRuntime?.isApp === true ? 'electron-ipc' : 'browser-demo',
        },
    });
}

export function isDesktopPlatformRuntime(runtimeGlobal = globalThis) {
    const snapshot = getElectronPlatformCapabilitySnapshot(runtimeGlobal);
    return snapshot.discovery.available || snapshot.host.available || snapshot.save.available;
}

export function createElectronDiscoveryIntentBridge(runtimeGlobal = globalThis) {
    const { appRuntime } = resolveAppRuntime(runtimeGlobal);
    const discoveryContract = resolveNamedContract(appRuntime, 'discovery');
    const startDiscovery = createIntent(discoveryContract, discoveryContract?.start, appRuntime, appRuntime?.startDiscovery);
    const stopDiscovery = createIntent(discoveryContract, discoveryContract?.stop, appRuntime, appRuntime?.stopDiscovery);
    const getDiscoveredHosts = createIntent(discoveryContract, discoveryContract?.listHosts, appRuntime, appRuntime?.getDiscoveredHosts);
    const onDiscoveredHosts = createIntent(discoveryContract, discoveryContract?.subscribeHosts, appRuntime, appRuntime?.onDiscoveredHosts);

    return Object.freeze({
        startDiscovery,
        stopDiscovery,
        getDiscoveredHosts,
        onDiscoveredHosts,
    });
}

export function createElectronHostIntentBridge(runtimeGlobal = globalThis) {
    const { appRuntime } = resolveAppRuntime(runtimeGlobal);
    const hostContract = resolveNamedContract(appRuntime, 'host');
    const getStatus = createIntent(hostContract, hostContract?.getStatus, appRuntime, appRuntime?.getLanServerStatus);
    const start = createIntent(hostContract, hostContract?.start, appRuntime, appRuntime?.startLanServer);
    const stop = createIntent(hostContract, hostContract?.stop, appRuntime, appRuntime?.stopLanServer);

    return Object.freeze({
        getStatus,
        start,
        stop,
        getLanServerStatus: getStatus,
        startLanServer: start,
        stopLanServer: stop,
    });
}
