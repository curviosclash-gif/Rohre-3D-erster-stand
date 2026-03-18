// ============================================
// electron/preload.js - IPC bridge to renderer
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

// Set the app flag so the game knows it can host
contextBridge.exposeInMainWorld('__CURVIOS_APP__', true);

// Expose LAN server controls and replay save to the renderer
contextBridge.exposeInMainWorld('curviosApp', {
    getLanServerStatus: () => ipcRenderer.invoke('get-lan-server-status'),
    startLanServer: () => ipcRenderer.invoke('start-lan-server'),
    stopLanServer: () => ipcRenderer.invoke('stop-lan-server'),
    /** Save replay JSON to filesystem via dialog (C.5) */
    saveReplay: (jsonString, defaultName) => ipcRenderer.invoke('save-replay', jsonString, defaultName),
    isApp: true,
});
