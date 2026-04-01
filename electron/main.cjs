// ============================================
// electron/main.cjs - Electron main process
// ============================================

const { app, BrowserWindow, ipcMain, dialog, Tray, nativeImage } = require('electron');
const path = require('node:path');
const { writeFileSync } = require('node:fs');
const dgram = require('node:dgram');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { startStaticServer } = require('./static-server.cjs');

let mainWindow = null;
let tray = null;
let signalingRuntime = null;
let staticAppServer = null;

const SIGNALING_PORTS = [9090, 9091, 9093, 9094];
const DISCOVERY_PORT = 9092;
const DISCOVERY_INTERVAL = 2000;
const DISCOVERY_MAGIC = 'CURVIOS_HOST';
let signalingPort = 9090;
let broadcastSocket = null;
let broadcastTimer = null;
let discoverySocket = null;
const discoveredHosts = new Map();
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
    app.quit();
}

async function loadLanSignalingModule() {
    const moduleUrl = pathToFileURL(path.resolve(__dirname, '..', 'server', 'lan-signaling.js')).href;
    return import(moduleUrl);
}

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }

    return ips;
}

function updateTrayTooltip() {
    if (!tray) return;
    const status = signalingRuntime ? `LAN Server: Running (Port ${signalingPort})` : 'LAN Server: Stopped';
    tray.setToolTip(`CurviosClash - ${status}`);
}

function createTray() {
    try {
        tray = new Tray(nativeImage.createEmpty());
        updateTrayTooltip();
    } catch {
        // Tray is optional.
    }
}

function stopBroadcast() {
    if (broadcastTimer) {
        clearInterval(broadcastTimer);
        broadcastTimer = null;
    }
    if (broadcastSocket) {
        try {
            broadcastSocket.close();
        } catch {
            // Ignore close errors during shutdown.
        }
        broadcastSocket = null;
    }
}

function startBroadcast(resolveState) {
    stopBroadcast();
    broadcastSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    broadcastSocket.on('error', () => {});
    broadcastSocket.bind(0, () => {
        if (!broadcastSocket) return;
        broadcastSocket.setBroadcast(true);
        const hostName = os.hostname();
        const ips = getLocalIPs();
        broadcastTimer = setInterval(() => {
            const state = typeof resolveState === 'function' ? resolveState() : null;
            const lobbyCode = String(state?.lobbyCode || '').trim();
            if (!lobbyCode || !broadcastSocket) return;

            const broadcastIps = ips.length > 0 ? ips : ['127.0.0.1'];
            for (const ip of broadcastIps) {
                const payload = JSON.stringify({
                    magic: DISCOVERY_MAGIC,
                    ip,
                    port: signalingPort,
                    lobbyCode,
                    hostName,
                    playerCount: Number(state?.playerCount || 0),
                });
                const buffer = Buffer.from(payload);
                broadcastSocket.send(buffer, 0, buffer.length, DISCOVERY_PORT, '255.255.255.255');
            }
        }, DISCOVERY_INTERVAL);
    });
}

function waitForServerReady(server) {
    return new Promise((resolve, reject) => {
        const onListening = () => {
            server.removeListener('error', onError);
            resolve();
        };
        const onError = (err) => {
            server.removeListener('listening', onListening);
            reject(err);
        };
        server.once('listening', onListening);
        server.once('error', onError);
    });
}

async function startSignalingServer() {
    if (signalingRuntime) return signalingRuntime;

    const { createLANSignalingServer } = await loadLanSignalingModule();

    let runtime = null;
    for (const port of SIGNALING_PORTS) {
        const candidate = createLANSignalingServer(port);
        try {
            await waitForServerReady(candidate.server);
            runtime = candidate;
            signalingPort = port;
            break;
        } catch (err) {
            if (err?.code === 'EADDRINUSE') {
                console.warn(`[Signaling] Port ${port} belegt, versuche naechsten...`);
                try { candidate.server.close(); } catch { /* ignore */ }
                continue;
            }
            throw err;
        }
    }

    if (!runtime) {
        throw new Error(`Kein freier Port fuer Signaling Server (versucht: ${SIGNALING_PORTS.join(', ')})`);
    }

    runtime.server.on('error', (error) => {
        console.error('[Signaling] Error:', error);
    });
    runtime.server.on('close', () => {
        if (signalingRuntime?.server === runtime.server) {
            signalingRuntime = null;
            stopBroadcast();
            updateTrayTooltip();
        }
    });

    signalingRuntime = runtime;
    startBroadcast(() => ({
        lobbyCode: runtime.lobby?.code || '',
        playerCount: runtime.lobby?.players?.length || 0,
    }));
    updateTrayTooltip();
    return runtime;
}

function closeNodeServer(server) {
    return new Promise((resolve) => {
        try {
            server.close(() => resolve());
        } catch {
            resolve();
        }
    });
}

async function stopSignalingServer() {
    if (!signalingRuntime) return;
    const runtime = signalingRuntime;
    signalingRuntime = null;
    stopBroadcast();
    updateTrayTooltip();
    await closeNodeServer(runtime.server);
}

async function startAppServer() {
    if (staticAppServer) return staticAppServer;
    const distDir = path.join(__dirname, '..', 'dist');
    staticAppServer = await startStaticServer({ rootDir: distDir });
    return staticAppServer;
}

async function stopAppServer() {
    if (!staticAppServer) return;
    const server = staticAppServer;
    staticAppServer = null;
    await server.close();
}

async function createWindow() {
    const appServer = await startAppServer();
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'CurviosClash',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
        },
    });

    await mainWindow.loadURL(appServer.url);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const DISCOVERY_RATE_LIMIT_MS = 500;
const DISCOVERY_RATE_LIMIT_MAX_SOURCES = 64;
const discoveryRateMap = new Map();

function stopDiscoveryListener() {
    if (discoverySocket) {
        try {
            discoverySocket.close();
        } catch {
            // Ignore close errors during shutdown.
        }
        discoverySocket = null;
    }
    discoveredHosts.clear();
    discoveryRateMap.clear();
}

function isDiscoveryRateLimited(sourceKey) {
    const now = Date.now();
    const lastSeen = discoveryRateMap.get(sourceKey);
    if (lastSeen && (now - lastSeen) < DISCOVERY_RATE_LIMIT_MS) {
        return true;
    }
    if (discoveryRateMap.size >= DISCOVERY_RATE_LIMIT_MAX_SOURCES && !discoveryRateMap.has(sourceKey)) {
        return true;
    }
    discoveryRateMap.set(sourceKey, now);
    return false;
}

function startDiscoveryListener() {
    stopDiscoveryListener();
    discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    discoverySocket.on('error', () => {});
    discoverySocket.on('message', (msgBuf, rinfo) => {
        try {
            const sourceKey = `${rinfo.address}:${rinfo.port}`;
            if (isDiscoveryRateLimited(sourceKey)) return;

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

            const now = Date.now();
            for (const [hostKey, hostState] of discoveredHosts) {
                if (now - hostState.lastSeen > 10_000) {
                    discoveredHosts.delete(hostKey);
                }
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('discovered-hosts', Array.from(discoveredHosts.values()));
            }
        } catch {
            // Ignore malformed discovery packets.
        }
    });
    discoverySocket.bind(DISCOVERY_PORT, '0.0.0.0');
}

ipcMain.handle('get-lan-server-status', () => ({
    running: !!signalingRuntime,
    port: signalingRuntime ? signalingPort : null,
}));

ipcMain.handle('start-lan-server', async () => {
    await startSignalingServer();
    return { running: true, port: signalingPort };
});

ipcMain.handle('stop-lan-server', async () => {
    await stopSignalingServer();
    return { running: false };
});

ipcMain.handle('start-discovery', () => {
    startDiscoveryListener();
    return { listening: true };
});

ipcMain.handle('stop-discovery', () => {
    stopDiscoveryListener();
    return { listening: false };
});

ipcMain.handle('get-discovered-hosts', () => Array.from(discoveredHosts.values()));

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
    } catch {
        // Surface failure as a boolean for the renderer.
    }

    return false;
});

async function shutdownRuntime() {
    stopDiscoveryListener();
    await Promise.allSettled([
        stopSignalingServer(),
        stopAppServer(),
    ]);

    if (tray) {
        tray.destroy();
        tray = null;
    }
}

app.whenReady().then(async () => {
    if (!hasSingleInstanceLock) {
        return;
    }
    try {
        await startSignalingServer();
        await createWindow();
        createTray();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Startfehler';
        dialog.showErrorBox('CurviosClash Startfehler', message);
        await shutdownRuntime();
        app.quit();
    }
});

app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.focus();
});

app.on('window-all-closed', () => {
    void shutdownRuntime().finally(() => {
        app.quit();
    });
});

app.on('before-quit', () => {
    stopDiscoveryListener();
    stopBroadcast();
});
