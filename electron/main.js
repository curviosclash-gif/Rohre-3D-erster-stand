// ============================================
// electron/main.js - Electron main process
// ============================================
// Starts the CurviosClash app with:
// - Embedded LAN signaling server (auto-started) (C.6)
// - Feature flag canHost = true
// - Full-screen game window
// - Replay file save IPC (C.5)

import { app, BrowserWindow, ipcMain, dialog, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import dgram from 'node:dgram';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let signalingProcess = null;
let tray = null;

const DISCOVERY_PORT = 9092;
const DISCOVERY_INTERVAL = 2000;
const DISCOVERY_MAGIC = 'CURVIOS_HOST';
let broadcastSocket = null;
let broadcastTimer = null;
let discoverySocket = null;
/** @type {Map<string, {ip:string, port:number, lobbyCode:string, hostName:string, playerCount:number, lastSeen:number}>} */
const discoveredHosts = new Map();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'CurviosClash',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Load the built web app
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startSignalingServer() {
    if (signalingProcess) return;
    const serverPath = path.join(__dirname, '..', 'server', 'lan-signaling.js');
    signalingProcess = fork(serverPath, ['9090'], { silent: true });

    signalingProcess.on('error', (err) => {
        console.error('[Signaling] Error:', err);
    });

    signalingProcess.on('exit', (code) => {
        console.log(`[Signaling] Exited with code ${code}`);
        signalingProcess = null;
        stopBroadcast();
        updateTrayTooltip();
    });

    // Start broadcasting presence on the LAN
    // We read the lobby code from the server's stdout (it prints it on startup)
    signalingProcess.stdout?.on('data', (data) => {
        const line = data.toString();
        console.log(`[Signaling] ${line.trim()}`);
        const match = line.match(/lobby code:\s*(\S+)/i);
        if (match) {
            startBroadcast(match[1]);
        }
    });

    updateTrayTooltip();
}

function stopSignalingServer() {
    if (signalingProcess) {
        signalingProcess.kill();
        signalingProcess = null;
        updateTrayTooltip();
    }
}

/** Create tray icon with server status (C.6 — optional) */
function createTray() {
    try {
        // Use a simple 16x16 placeholder icon
        const icon = nativeImage.createEmpty();
        tray = new Tray(icon);
        updateTrayTooltip();
    } catch {
        // Tray creation may fail in some environments
    }
}

function updateTrayTooltip() {
    if (!tray) return;
    const status = signalingProcess ? 'LAN Server: Running (Port 9090)' : 'LAN Server: Stopped';
    tray.setToolTip(`CurviosClash - ${status}`);
}

// --- LAN Auto-Discovery (UDP Broadcast) ---

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

function startBroadcast(lobbyCode) {
    stopBroadcast();
    broadcastSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    broadcastSocket.on('error', () => { /* ignore broadcast errors */ });
    broadcastSocket.bind(0, () => {
        broadcastSocket.setBroadcast(true);
        const ips = getLocalIPs();
        const hostName = os.hostname();
        broadcastTimer = setInterval(() => {
            const msg = JSON.stringify({
                magic: DISCOVERY_MAGIC,
                ip: ips[0] || '127.0.0.1',
                port: 9090,
                lobbyCode,
                hostName,
                playerCount: 0, // TODO: update via signaling process IPC
            });
            const buf = Buffer.from(msg);
            broadcastSocket.send(buf, 0, buf.length, DISCOVERY_PORT, '255.255.255.255');
        }, DISCOVERY_INTERVAL);
    });
}

function stopBroadcast() {
    if (broadcastTimer) { clearInterval(broadcastTimer); broadcastTimer = null; }
    if (broadcastSocket) { try { broadcastSocket.close(); } catch { /* */ } broadcastSocket = null; }
}

function startDiscoveryListener() {
    stopDiscoveryListener();
    discoveredHosts.clear();

    discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    discoverySocket.on('error', () => { /* ignore */ });
    discoverySocket.on('message', (msgBuf) => {
        try {
            const data = JSON.parse(msgBuf.toString());
            if (data.magic !== DISCOVERY_MAGIC) return;
            const key = `${data.ip}:${data.port}`;
            discoveredHosts.set(key, {
                ip: data.ip,
                port: data.port,
                lobbyCode: data.lobbyCode,
                hostName: data.hostName,
                playerCount: data.playerCount || 0,
                lastSeen: Date.now(),
            });
            // Prune hosts not seen for 10s
            const now = Date.now();
            for (const [k, v] of discoveredHosts) {
                if (now - v.lastSeen > 10_000) discoveredHosts.delete(k);
            }
            // Notify renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('discovered-hosts', Array.from(discoveredHosts.values()));
            }
        } catch { /* ignore malformed */ }
    });
    discoverySocket.bind(DISCOVERY_PORT, '0.0.0.0');
}

function stopDiscoveryListener() {
    if (discoverySocket) { try { discoverySocket.close(); } catch { /* */ } discoverySocket = null; }
    discoveredHosts.clear();
}

// IPC handlers
ipcMain.handle('get-lan-server-status', () => {
    return { running: !!signalingProcess, port: 9090 };
});

ipcMain.handle('start-lan-server', () => {
    if (!signalingProcess) startSignalingServer();
    return { running: true, port: 9090 };
});

ipcMain.handle('stop-lan-server', () => {
    stopSignalingServer();
    return { running: false };
});

// LAN Discovery IPC
ipcMain.handle('start-discovery', () => {
    startDiscoveryListener();
    return { listening: true };
});

ipcMain.handle('stop-discovery', () => {
    stopDiscoveryListener();
    return { listening: false };
});

ipcMain.handle('get-discovered-hosts', () => {
    return Array.from(discoveredHosts.values());
});

// Replay save IPC (C.5)
ipcMain.handle('save-replay', async (_event, jsonString, defaultName) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Replay speichern',
            defaultPath: defaultName || 'replay.json',
            filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (!result.canceled && result.filePath) {
            writeFileSync(result.filePath, jsonString, 'utf-8');
            return true;
        }
        return false;
    } catch {
        return false;
    }
});

app.whenReady().then(() => {
    // Auto-start LAN server (C.6)
    startSignalingServer();
    createWindow();
    createTray();
});

app.on('window-all-closed', () => {
    stopBroadcast();
    stopDiscoveryListener();
    stopSignalingServer();
    if (tray) tray.destroy();
    app.quit();
});

app.on('before-quit', () => {
    stopBroadcast();
    stopDiscoveryListener();
    stopSignalingServer();
});
