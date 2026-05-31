const { contextBridge, ipcRenderer } = require('electron');

const MAP_TOOLS_PRELOAD_CONTRACT_VERSION = 'map-tools-preload.v1';

function invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
}

function subscribe(channel, callback) {
    if (typeof callback !== 'function') {
        return () => {};
    }
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
}

const mapToolsApi = Object.freeze({
    contractName: 'map-tools',
    contractVersion: MAP_TOOLS_PRELOAD_CONTRACT_VERSION,
    getState: () => invoke('map-tools:get-state'),
    setView: (viewId) => invoke('map-tools:set-view', viewId),
    refresh: (viewId = 'all') => invoke('map-tools:refresh', { viewId }),
    openPath: (targetId) => invoke('map-tools:open-path', targetId),
    listMarkdown: () => invoke('map-tools:list-markdown'),
    readMarkdown: (path) => invoke('map-tools:read-markdown', path),
    previewMarkdown: (payload) => invoke('map-tools:preview-markdown', payload),
    saveMarkdown: (payload) => invoke('map-tools:save-markdown', payload),
    gitState: () => invoke('map-tools:git-state'),
    commitMarkdown: (payload) => invoke('map-tools:commit-markdown', payload),
    pushMarkdown: () => invoke('map-tools:push-markdown'),
    onViewRequested: (callback) => subscribe('map-tools:view-requested', callback),
    onRefreshRequested: (callback) => subscribe('map-tools:refresh-requested', callback),
});

contextBridge.exposeInMainWorld('__CURVIOS_MAP_TOOLS__', true);
contextBridge.exposeInMainWorld('mapToolsApi', mapToolsApi);
