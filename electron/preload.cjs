// ============================================
// electron/preload.cjs - IPC bridge to renderer
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__CURVIOS_APP__', true);

contextBridge.exposeInMainWorld('curviosApp', {
    getLanServerStatus: () => ipcRenderer.invoke('get-lan-server-status'),
    startLanServer: () => ipcRenderer.invoke('start-lan-server'),
    stopLanServer: () => ipcRenderer.invoke('stop-lan-server'),
    saveReplay: (jsonString, defaultName) => ipcRenderer.invoke('save-replay', jsonString, defaultName),
    startDiscovery: () => ipcRenderer.invoke('start-discovery'),
    stopDiscovery: () => ipcRenderer.invoke('stop-discovery'),
    getDiscoveredHosts: () => ipcRenderer.invoke('get-discovered-hosts'),
    onDiscoveredHosts: (callback) => {
        const handler = (_event, hosts) => callback(hosts);
        ipcRenderer.on('discovered-hosts', handler);
        return () => ipcRenderer.removeListener('discovered-hosts', handler);
    },
    isApp: true,
});
