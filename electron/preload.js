// ============================================
// electron/preload.js - IPC bridge to renderer
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

// Set the app flag so the game knows it can host
contextBridge.exposeInMainWorld('__CURVIOS_APP__', true);

// Expose LAN server controls, discovery, and replay save to the renderer
contextBridge.exposeInMainWorld('curviosApp', {
    getLanServerStatus: () => ipcRenderer.invoke('get-lan-server-status'),
    startLanServer: () => ipcRenderer.invoke('start-lan-server'),
    stopLanServer: () => ipcRenderer.invoke('stop-lan-server'),
    /** Save replay JSON to filesystem via dialog (C.5) */
    saveReplay: (jsonString, defaultName) => ipcRenderer.invoke('save-replay', jsonString, defaultName),
    /** LAN auto-discovery */
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
