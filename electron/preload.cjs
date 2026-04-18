// ============================================
// electron/preload.cjs - IPC bridge to renderer
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

const PRELOAD_CONTRACT_VERSIONS = Object.freeze({
    discovery: 'preload.discovery.v1',
    host: 'preload.host.v1',
    save: 'preload.save.v1',
    recording: 'preload.recording.v1',
    lifecycle: 'preload.lifecycle.v1',
    settingsDefaults: 'preload.settings-defaults.v1',
});
const PLATFORM_CAPABILITY_SNAPSHOT_CONTRACT_VERSION = 'platform-capability-snapshot.v1';

function createInvokeBridge(channel) {
    return (...args) => ipcRenderer.invoke(channel, ...args);
}

function createNamedContract(contractName, contractVersion, surface) {
    return Object.freeze({
        contractName,
        contractVersion,
        ...surface,
    });
}

function deepCloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function createCapabilityDescriptor(capabilityId, contractVersion, providerKind, available, extra) {
    return Object.freeze({
        capabilityId,
        available: available === true,
        providerKind,
        contractVersion,
        degradedReason: '',
        supportsSubscribe: extra?.supportsSubscribe === true,
        supportsSessionOwnership: extra?.supportsSessionOwnership === true,
        supportsBinaryExport: extra?.supportsBinaryExport === true,
        supportsCapture: extra?.supportsCapture === true,
    });
}

function createDiscoveryContract() {
    return createNamedContract('discovery', PRELOAD_CONTRACT_VERSIONS.discovery, {
        start: createInvokeBridge('start-discovery'),
        stop: createInvokeBridge('stop-discovery'),
        listHosts: createInvokeBridge('get-discovered-hosts'),
        subscribeHosts: (callback) => {
            if (typeof callback !== 'function') {
                return () => {};
            }
            const handler = (_event, hosts) => callback(hosts);
            ipcRenderer.on('discovered-hosts', handler);
            return () => ipcRenderer.removeListener('discovered-hosts', handler);
        },
    });
}

function createHostContract() {
    return createNamedContract('host', PRELOAD_CONTRACT_VERSIONS.host, {
        getStatus: createInvokeBridge('get-lan-server-status'),
        start: createInvokeBridge('start-lan-server'),
        stop: createInvokeBridge('stop-lan-server'),
    });
}

function createSaveContract() {
    return createNamedContract('save', PRELOAD_CONTRACT_VERSIONS.save, {
        saveReplay: createInvokeBridge('save-replay'),
        saveVideo: createInvokeBridge('save-video'),
    });
}

function createRecordingContract() {
    return createNamedContract('recording', PRELOAD_CONTRACT_VERSIONS.recording, {
        supportsCapture: true,
    });
}

/**
 * Lifecycle capability contract — exposes the shell's graceful-close handshake.
 *
 * The main process sends 'request-graceful-close' before destroying the window.
 * The renderer calls onGracefulClose(cb) to receive the notification, runs its
 * own dispose/finalize sequence (e.g. facade.dispose()), and then calls
 * confirmGracefulClose() to allow the window to proceed with closing.
 */
function createLifecycleContract() {
    return createNamedContract('lifecycle', PRELOAD_CONTRACT_VERSIONS.lifecycle, {
        /**
         * Register a callback fired when the shell requests a graceful close.
         * The callback may be async; call confirmGracefulClose() once the
         * renderer-side lifecycle teardown is complete.
         *
         * @param {() => void | Promise<void>} callback
         * @returns {() => void} unsubscribe function
         */
        onGracefulClose: (callback) => {
            if (typeof callback !== 'function') return () => {};
            const handler = () => callback();
            ipcRenderer.on('request-graceful-close', handler);
            return () => ipcRenderer.removeListener('request-graceful-close', handler);
        },
        /** Signal to the main process that the renderer is ready to be destroyed. */
        confirmGracefulClose: () => ipcRenderer.send('graceful-close-ready'),
    });
}

function readMenuDefaultsOverrideSnapshot() {
    try {
        const snapshot = ipcRenderer.sendSync('settings-defaults:read-override-sync');
        if (snapshot && typeof snapshot === 'object') {
            return snapshot;
        }
    } catch (error) {
        return {
            contractVersion: PRELOAD_CONTRACT_VERSIONS.settingsDefaults,
            filePath: '',
            exists: false,
            loadedAt: Date.now(),
            readError: error instanceof Error ? error.message : String(error || 'override_sync_failed'),
            parseError: null,
            draft: null,
        };
    }

    return {
        contractVersion: PRELOAD_CONTRACT_VERSIONS.settingsDefaults,
        filePath: '',
        exists: false,
        loadedAt: Date.now(),
        readError: 'override_sync_unavailable',
        parseError: null,
        draft: null,
    };
}

function createSettingsDefaultsContract() {
    const snapshot = readMenuDefaultsOverrideSnapshot();
    return createNamedContract('settingsDefaults', PRELOAD_CONTRACT_VERSIONS.settingsDefaults, {
        getOverrideSnapshot: () => deepCloneJson(snapshot),
    });
}

const discoveryContract = createDiscoveryContract();
const hostContract = createHostContract();
const saveContract = createSaveContract();
const recordingContract = createRecordingContract();
const lifecycleContract = createLifecycleContract();
const settingsDefaultsContract = createSettingsDefaultsContract();
const platformContracts = Object.freeze({
    discovery: discoveryContract,
    host: hostContract,
    save: saveContract,
    recording: recordingContract,
    lifecycle: lifecycleContract,
    settingsDefaults: settingsDefaultsContract,
});
const platformCapabilities = Object.freeze({
    contractVersion: PLATFORM_CAPABILITY_SNAPSHOT_CONTRACT_VERSION,
    runtimeKind: 'electron',
    discovery: createCapabilityDescriptor('discovery', discoveryContract.contractVersion, 'electron-ipc', true, {
        supportsSubscribe: true,
    }),
    host: createCapabilityDescriptor('host', hostContract.contractVersion, 'electron-ipc', true, {
        supportsSessionOwnership: true,
    }),
    save: createCapabilityDescriptor('save', saveContract.contractVersion, 'electron-ipc', true, {
        supportsBinaryExport: true,
    }),
    recording: createCapabilityDescriptor('recording', recordingContract.contractVersion, 'electron-renderer', true, {
        supportsCapture: true,
    }),
    lifecycle: createCapabilityDescriptor('lifecycle', lifecycleContract.contractVersion, 'electron-ipc', true),
});
const curviosApp = Object.freeze({
    contracts: platformContracts,
    capabilities: platformCapabilities,
    discovery: discoveryContract,
    host: hostContract,
    save: saveContract,
    recording: recordingContract,
    lifecycle: lifecycleContract,
    settingsDefaults: settingsDefaultsContract,
    getLanServerStatus: hostContract.getStatus,
    startLanServer: hostContract.start,
    stopLanServer: hostContract.stop,
    saveReplay: saveContract.saveReplay,
    saveVideo: saveContract.saveVideo,
    startDiscovery: discoveryContract.start,
    stopDiscovery: discoveryContract.stop,
    getDiscoveredHosts: discoveryContract.listHosts,
    onDiscoveredHosts: discoveryContract.subscribeHosts,
    isApp: true,
});

contextBridge.exposeInMainWorld('__CURVIOS_APP__', true);
contextBridge.exposeInMainWorld('curviosApp', curviosApp);
