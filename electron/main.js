// ============================================
// electron/main.js - Electron main process
// ============================================
// Starts the CurviosClash app with:
// - Embedded LAN signaling server
// - Feature flag canHost = true
// - Full-screen game window

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let signalingProcess = null;

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
    });
}

function stopSignalingServer() {
    if (signalingProcess) {
        signalingProcess.kill();
        signalingProcess = null;
    }
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

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    stopSignalingServer();
    app.quit();
});

app.on('before-quit', () => {
    stopSignalingServer();
});
