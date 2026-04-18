const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const { registerSettingsStudioIpc } = require('./ipc/settings-studio-ipc.cjs');

const WINDOW_SHELL_CONTRACT_VERSION = 'settings-studio.window-shell.v1';
const hasSingleInstanceLock = app.requestSingleInstanceLock();

let mainWindow = null;
let disposeIpc = null;

if (!hasSingleInstanceLock) {
    app.quit();
}

function createWindowShellCapability() {
    return Object.freeze({
        contractName: 'settings-studio-window-shell',
        contractVersion: WINDOW_SHELL_CONTRACT_VERSION,
        async start() {
            if (mainWindow && !mainWindow.isDestroyed()) {
                return mainWindow;
            }

            mainWindow = new BrowserWindow({
                width: 1280,
                height: 860,
                minWidth: 960,
                minHeight: 680,
                title: 'CurviosClash Settings Studio',
                webPreferences: {
                    preload: path.resolve(__dirname, 'preload.cjs'),
                    contextIsolation: true,
                    nodeIntegration: false,
                    backgroundThrottling: false,
                },
            });

            await mainWindow.loadFile(path.resolve(__dirname, 'ui', 'settings-studio.html'));
            mainWindow.on('closed', () => {
                mainWindow = null;
            });
            return mainWindow;
        },
        focus() {
            if (!mainWindow || mainWindow.isDestroyed()) return false;
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
            return true;
        },
    });
}

const windowShell = createWindowShellCapability();

async function startSettingsStudio() {
    if (!disposeIpc) {
        disposeIpc = registerSettingsStudioIpc({ ipcMain, app });
    }
    await windowShell.start();
}

async function shutdownSettingsStudio() {
    if (disposeIpc) {
        disposeIpc();
        disposeIpc = null;
    }
}

app.whenReady().then(async () => {
    if (!hasSingleInstanceLock) {
        return;
    }
    try {
        await startSettingsStudio();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Startfehler';
        dialog.showErrorBox('Settings Studio Startfehler', message);
        await shutdownSettingsStudio();
        app.quit();
    }
});

app.on('second-instance', () => {
    windowShell.focus();
});

app.on('window-all-closed', () => {
    void shutdownSettingsStudio().finally(() => {
        app.quit();
    });
});

app.on('before-quit', () => {
    void shutdownSettingsStudio();
});
