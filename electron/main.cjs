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
let signalingStartPromise = null;
let signalingStopPromise = null;

const SIGNALING_PORTS = [9090, 9091, 9093, 9094];
const GRACEFUL_CLOSE_TIMEOUT_MS = 3000;
const SIGNALING_PORT_FALLBACK = 0;
const DISCOVERY_PORT = 9092;
const DISCOVERY_INTERVAL = 2000;
const DISCOVERY_MAGIC = 'CURVIOS_HOST';
let signalingPort = 9090;
let broadcastSocket = null;
let broadcastTimer = null;
let discoverySocket = null;
const discoveredHosts = new Map();
const signalingDiagnostics = {
    state: 'stopped',
    configuredPorts: Object.freeze([...SIGNALING_PORTS]),
    attemptedPorts: [],
    selectedPort: null,
    selectedPortMode: null,
    lastStartAttemptAt: null,
    lastStartedAt: null,
    lastStoppedAt: null,
    lastError: null,
};
const hasSingleInstanceLock = app.requestSingleInstanceLock();
const WINDOW_SHELL_CONTRACT_VERSION = 'electron.window-shell.v1';
const HOST_SHELL_CONTRACT_VERSION = 'electron.lan-host-shell.v1';

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

function toErrorSnapshot(error, fallbackMessage) {
    const message = error instanceof Error
        ? error.message
        : String(error || fallbackMessage || 'Unbekannter Fehler');
    return {
        code: String(error?.code || '').trim() || null,
        message,
        at: Date.now(),
    };
}

function resetSignalingError() {
    signalingDiagnostics.lastError = null;
}

function recordSignalingError(error, fallbackMessage) {
    signalingDiagnostics.lastError = toErrorSnapshot(error, fallbackMessage);
}

function getSignalingDiagnosticsSnapshot() {
    const localIps = getLocalIPs();
    return {
        running: !!signalingRuntime,
        state: signalingDiagnostics.state,
        port: signalingRuntime ? signalingPort : null,
        selectedPort: signalingRuntime ? signalingPort : signalingDiagnostics.selectedPort,
        selectedPortMode: signalingDiagnostics.selectedPortMode,
        configuredPorts: [...signalingDiagnostics.configuredPorts],
        attemptedPorts: [...signalingDiagnostics.attemptedPorts],
        discoveryPort: DISCOVERY_PORT,
        broadcasting: !!broadcastTimer,
        localIps,
        hostIp: localIps[0] || 'localhost',
        lastStartAttemptAt: signalingDiagnostics.lastStartAttemptAt,
        lastStartedAt: signalingDiagnostics.lastStartedAt,
        lastStoppedAt: signalingDiagnostics.lastStoppedAt,
        lastError: signalingDiagnostics.lastError ? { ...signalingDiagnostics.lastError } : null,
    };
}

function updateTrayTooltip() {
    if (!tray) return;
    const status = signalingRuntime
        ? `LAN Server: Running (Port ${signalingPort})`
        : (signalingDiagnostics.state === 'starting'
            ? 'LAN Server: Starting'
            : (signalingDiagnostics.state === 'stopping'
                ? 'LAN Server: Stopping'
                : (signalingDiagnostics.lastError?.message
                    ? `LAN Server: Fehler (${signalingDiagnostics.lastError.message})`
                    : 'LAN Server: Stopped')));
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
    broadcastSocket.on('error', (err) => { console.error('[broadcast] UDP socket error:', err.message); });
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

function waitForServerReady(server, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        if (!server) {
            reject(new Error('Signaling-Serverinstanz fehlt.'));
            return;
        }
        if (server.listening) {
            resolve();
            return;
        }
        let settled = false;
        let timeoutId = null;
        const finish = (callback) => {
            if (settled) return;
            settled = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            server.removeListener('listening', onListening);
            server.removeListener('error', onError);
            callback();
        };
        const onListening = () => {
            finish(resolve);
        };
        const onError = (err) => {
            finish(() => reject(err));
        };
        timeoutId = setTimeout(() => {
            const timeoutError = new Error(`Signaling-Server wurde nach ${timeoutMs}ms nicht bereit.`);
            timeoutError.code = 'LAN_SIGNALING_START_TIMEOUT';
            finish(() => reject(timeoutError));
        }, timeoutMs);
        server.once('listening', onListening);
        server.once('error', onError);
    });
}

async function startSignalingServer() {
    if (signalingRuntime) return signalingRuntime;
    if (signalingStartPromise) return signalingStartPromise;
    if (signalingStopPromise) {
        await signalingStopPromise;
    }

    signalingDiagnostics.state = 'starting';
    signalingDiagnostics.attemptedPorts = [];
    signalingDiagnostics.selectedPort = null;
    signalingDiagnostics.selectedPortMode = null;
    signalingDiagnostics.lastStartAttemptAt = Date.now();
    resetSignalingError();
    updateTrayTooltip();

    signalingStartPromise = (async () => {
        const { createLANSignalingServer } = await loadLanSignalingModule();
        const candidatePorts = [...SIGNALING_PORTS, SIGNALING_PORT_FALLBACK];

        let runtime = null;
        for (const port of candidatePorts) {
            signalingDiagnostics.attemptedPorts.push(port);
            const candidate = createLANSignalingServer(port, {
                resolveDiagnostics: getSignalingDiagnosticsSnapshot,
            });
            try {
                await waitForServerReady(candidate.server);
                runtime = candidate;
                const address = candidate.server.address();
                signalingPort = address && typeof address === 'object'
                    ? Number(address.port || port || 0)
                    : Number(port || 0);
                signalingDiagnostics.selectedPort = signalingPort;
                signalingDiagnostics.selectedPortMode = port === SIGNALING_PORT_FALLBACK
                    ? 'ephemeral-fallback'
                    : 'configured';
                break;
            } catch (err) {
                if (err?.code === 'EADDRINUSE') {
                    console.warn(`[Signaling] Port ${port} belegt, versuche naechsten...`);
                    try { candidate.server.close(); } catch { /* ignore */ }
                    continue;
                }
                recordSignalingError(err, 'Signaling-Server konnte nicht gestartet werden.');
                try { candidate.server.close(); } catch { /* ignore */ }
                throw err;
            }
        }

        if (!runtime) {
            const attemptedPortsLabel = candidatePorts
                .map((port) => (port === SIGNALING_PORT_FALLBACK ? 'ephemeral' : String(port)))
                .join(', ');
            const error = new Error(`Kein freier Port fuer Signaling Server (versucht: ${attemptedPortsLabel})`);
            error.code = 'LAN_SIGNALING_PORT_UNAVAILABLE';
            recordSignalingError(error);
            signalingDiagnostics.state = 'error';
            throw error;
        }

        runtime.server.on('error', (error) => {
            recordSignalingError(error, 'Signaling-Serverfehler');
            console.error('[Signaling] Error:', error);
            updateTrayTooltip();
        });
        runtime.server.on('close', () => {
            if (signalingRuntime?.server === runtime.server) {
                signalingRuntime = null;
            }
            signalingDiagnostics.state = 'stopped';
            signalingDiagnostics.lastStoppedAt = Date.now();
            stopBroadcast();
            updateTrayTooltip();
        });

        signalingRuntime = runtime;
        signalingDiagnostics.state = 'running';
        signalingDiagnostics.lastStartedAt = Date.now();
        resetSignalingError();
        startBroadcast(() => ({
            lobbyCode: runtime.lobby?.code || '',
            playerCount: runtime.lobby?.players?.length || 0,
        }));
        updateTrayTooltip();
        return runtime;
    })();

    try {
        return await signalingStartPromise;
    } finally {
        signalingStartPromise = null;
        if (signalingDiagnostics.state === 'starting') {
            signalingDiagnostics.state = signalingRuntime ? 'running' : 'stopped';
            updateTrayTooltip();
        }
    }
}

function closeNodeServer(server, timeoutMs = 3000) {
    return new Promise((resolve) => {
        if (!server || server.listening !== true) {
            resolve();
            return;
        }
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            resolve();
        };
        const timeoutId = setTimeout(finish, timeoutMs);
        try {
            server.close(() => finish());
        } catch {
            finish();
        }
    });
}

async function stopSignalingServer() {
    if (signalingStopPromise) {
        await signalingStopPromise;
        return;
    }

    signalingDiagnostics.state = 'stopping';
    updateTrayTooltip();

    signalingStopPromise = (async () => {
        if (signalingStartPromise) {
            try {
                await signalingStartPromise;
            } catch {
                // Failed starts should still allow cleanup and state reset.
            }
        }
        if (!signalingRuntime) {
            signalingDiagnostics.state = 'stopped';
            signalingDiagnostics.selectedPort = null;
            signalingDiagnostics.selectedPortMode = null;
            signalingDiagnostics.lastStoppedAt = Date.now();
            updateTrayTooltip();
            return;
        }

        const runtime = signalingRuntime;
        signalingRuntime = null;
        stopBroadcast();
        updateTrayTooltip();
        await closeNodeServer(runtime.server);
        signalingDiagnostics.state = 'stopped';
        signalingDiagnostics.selectedPort = null;
        signalingDiagnostics.selectedPortMode = null;
        signalingDiagnostics.lastStoppedAt = Date.now();
        updateTrayTooltip();
    })();

    try {
        await signalingStopPromise;
    } finally {
        signalingStopPromise = null;
    }
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

    // ── Graceful-close handshake ──────────────────────────────────────────────
    // Before destroying the window, ask the renderer to run its own lifecycle
    // teardown (facade.dispose → GAME_DISPOSE finalize → MATCH_FINALIZED signal
    // to any connected multiplayer peers).  A GRACEFUL_CLOSE_TIMEOUT_MS timeout
    // ensures the window always closes even if the renderer is unresponsive.
    let gracefulCloseReady = false;
    mainWindow.on('close', (event) => {
        if (gracefulCloseReady) return;
        event.preventDefault();

        const finish = () => {
            if (gracefulCloseReady) return;
            gracefulCloseReady = true;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.close();
            }
        };

        const timeoutId = setTimeout(finish, GRACEFUL_CLOSE_TIMEOUT_MS);
        ipcMain.once('graceful-close-ready', () => {
            clearTimeout(timeoutId);
            finish();
        });

        try {
            mainWindow.webContents.send('request-graceful-close');
        } catch {
            // Renderer already gone — proceed immediately.
            clearTimeout(timeoutId);
            finish();
        }
    });
}

function createDesktopWindowShellCapability() {
    return Object.freeze({
        contractName: 'desktop-window-shell',
        contractVersion: WINDOW_SHELL_CONTRACT_VERSION,
        async start() {
            if (mainWindow && !mainWindow.isDestroyed()) {
                return mainWindow;
            }
            await createWindow();
            return mainWindow;
        },
        focus() {
            if (!mainWindow || mainWindow.isDestroyed()) {
                return false;
            }
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
            return true;
        },
        getWindow() {
            return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
        },
    });
}

function createLanHostShellCapability() {
    return Object.freeze({
        contractName: 'lan-host-shell',
        contractVersion: HOST_SHELL_CONTRACT_VERSION,
        getStatus() {
            return getSignalingDiagnosticsSnapshot();
        },
        async start() {
            await startSignalingServer();
            return getSignalingDiagnosticsSnapshot();
        },
        async stop() {
            await stopSignalingServer();
            return getSignalingDiagnosticsSnapshot();
        },
    });
}

const desktopWindowShellCapability = createDesktopWindowShellCapability();
const lanHostShellCapability = createLanHostShellCapability();

async function startDesktopShell() {
    await desktopWindowShellCapability.start();
    createTray();
}

const DISCOVERY_RATE_LIMIT_MS = 500;
const DISCOVERY_RATE_LIMIT_MAX_SOURCES = 64;
const discoveryRateMap = new Map();

function normalizeDiscoveryPort(value) {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 0;
}

function buildDiscoveryHostKey(host) {
    return `${String(host?.ip || '').trim()}::${String(host?.lobbyCode || '').trim().toUpperCase()}`;
}

function sortDiscoveredHosts(left, right) {
    const leftLastSeen = Number(left?.lastSeen || 0);
    const rightLastSeen = Number(right?.lastSeen || 0);
    if (leftLastSeen !== rightLastSeen) {
        return rightLastSeen - leftLastSeen;
    }
    const leftLobbyCode = String(left?.lobbyCode || '').trim().toUpperCase();
    const rightLobbyCode = String(right?.lobbyCode || '').trim().toUpperCase();
    if (leftLobbyCode !== rightLobbyCode) {
        return leftLobbyCode.localeCompare(rightLobbyCode);
    }
    const leftIp = String(left?.ip || '').trim();
    const rightIp = String(right?.ip || '').trim();
    if (leftIp !== rightIp) {
        return leftIp.localeCompare(rightIp);
    }
    return normalizeDiscoveryPort(left?.port) - normalizeDiscoveryPort(right?.port);
}

function listDiscoveredHosts() {
    return Array.from(discoveredHosts.values()).sort(sortDiscoveredHosts);
}

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
    discoverySocket.on('error', (err) => { console.error('[discovery] UDP socket error:', err.message); });
    discoverySocket.on('message', (msgBuf, rinfo) => {
        try {
            const sourceKey = `${rinfo.address}:${rinfo.port}`;
            if (isDiscoveryRateLimited(sourceKey)) return;

            const data = JSON.parse(msgBuf.toString());
            if (data.magic !== DISCOVERY_MAGIC) return;

            const ip = String(data.ip || '').trim();
            const lobbyCode = String(data.lobbyCode || '').trim().toUpperCase();
            const port = normalizeDiscoveryPort(data.port);
            if (!ip || !lobbyCode || port <= 0) return;

            const hostRecord = {
                ip,
                port,
                lobbyCode,
                hostName: String(data.hostName || '').trim(),
                playerCount: Math.max(0, Math.floor(Number(data.playerCount) || 0)),
                lastSeen: Date.now(),
            };
            discoveredHosts.set(buildDiscoveryHostKey(hostRecord), hostRecord);

            const now = Date.now();
            for (const [hostKey, hostState] of discoveredHosts) {
                if (now - hostState.lastSeen > 10_000) {
                    discoveredHosts.delete(hostKey);
                }
            }

            const windowRef = desktopWindowShellCapability.getWindow();
            if (windowRef) {
                windowRef.webContents.send('discovered-hosts', listDiscoveredHosts());
            }
        } catch {
            // Ignore malformed discovery packets.
        }
    });
    discoverySocket.bind(DISCOVERY_PORT, '0.0.0.0');
}

ipcMain.handle('get-lan-server-status', () => lanHostShellCapability.getStatus());

ipcMain.handle('start-lan-server', () => lanHostShellCapability.start());

ipcMain.handle('stop-lan-server', () => lanHostShellCapability.stop());

ipcMain.handle('start-discovery', () => {
    startDiscoveryListener();
    return { listening: true };
});

ipcMain.handle('stop-discovery', () => {
    stopDiscoveryListener();
    return { listening: false };
});

ipcMain.handle('get-discovered-hosts', () => listDiscoveredHosts());

ipcMain.handle('save-replay', async (_event, jsonString, defaultName) => {
    try {
        const result = await dialog.showSaveDialog(desktopWindowShellCapability.getWindow(), {
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

ipcMain.handle('save-video', async (_event, videoBytes, defaultName, mimeType) => {
    try {
        const normalizedName = String(defaultName || 'recording.webm').trim() || 'recording.webm';
        const ext = path.extname(normalizedName).toLowerCase();
        const fallbackExt = String(mimeType || '').toLowerCase().includes('mp4') ? 'mp4' : 'webm';
        const defaultPath = ext ? normalizedName : `${normalizedName}.${fallbackExt}`;
        const filters = ext === '.mp4'
            ? [{ name: 'MP4 Video', extensions: ['mp4'] }]
            : [{ name: 'WebM Video', extensions: ['webm'] }, { name: 'MP4 Video', extensions: ['mp4'] }];
        const result = await dialog.showSaveDialog(desktopWindowShellCapability.getWindow(), {
            title: 'Video speichern',
            defaultPath,
            filters,
        });

        if (!result.canceled && result.filePath) {
            const bytes = videoBytes instanceof Uint8Array
                ? videoBytes
                : new Uint8Array(videoBytes || []);
            writeFileSync(result.filePath, Buffer.from(bytes));
            return { saved: true, filePath: result.filePath };
        }
    } catch {
        // Surface failure as a structured result for the renderer.
    }

    return { saved: false };
});

async function shutdownRuntime() {
    stopDiscoveryListener();
    await Promise.allSettled([
        lanHostShellCapability.stop(),
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
        await startDesktopShell();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Startfehler';
        dialog.showErrorBox('CurviosClash Startfehler', message);
        await shutdownRuntime();
        app.quit();
    }
});

app.on('second-instance', () => {
    desktopWindowShellCapability.focus();
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
