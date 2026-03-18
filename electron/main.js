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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let signalingProcess = null;
let tray = null;

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

    signalingProcess.stdout?.on('data', (data) => {
        console.log(`[Signaling] ${data}`);
    });

    signalingProcess.on('error', (err) => {
        console.error('[Signaling] Error:', err);
    });

    signalingProcess.on('exit', (code) => {
        console.log(`[Signaling] Exited with code ${code}`);
        signalingProcess = null;
        updateTrayTooltip();
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
    stopSignalingServer();
    if (tray) tray.destroy();
    app.quit();
});

app.on('before-quit', () => {
    stopSignalingServer();
});
