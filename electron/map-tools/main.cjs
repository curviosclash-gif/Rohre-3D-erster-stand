const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');
const { promisify } = require('node:util');
const {
    configureStoragePaths,
    initSessionDataSelfHeal,
} = require('../session-data-runtime.cjs');
const { startMapToolsServer } = require('./server.cjs');

const execFileAsync = promisify(execFile);

const SHARED_USER_DATA_DIR_NAME = 'curviosclash-app';
const MAP_TOOLS_SESSION_DATA_DIR_NAME = 'session-map-tools';
const MAP_TOOL_VIEWS = Object.freeze({
    plan: {
        id: 'plan',
        label: 'Plan Map',
        exportScript: 'scripts/export-plan-map.mjs',
        viewPath: '/tools/plan-map/index.html',
        readmePath: 'tools/plan-map/README.md',
    },
    repo: {
        id: 'repo',
        label: 'Repo Map',
        exportScript: 'scripts/export-repo-map.mjs',
        viewPath: '/tools/repo-map/index.html',
        readmePath: 'tools/repo-map/README.md',
    },
});

const SOURCE_REPO_ROOT = path.resolve(__dirname, '..', '..');
const NODE_EXECUTABLE = process.env.CURVIOS_NODE_EXECUTABLE || process.execPath;
let markSessionExitClean = () => {};
let mainWindow = null;
let mapServer = null;
let currentViewId = 'plan';
let refreshPromise = null;

function resolveRepoRoot() {
    return path.resolve(process.env.CURVIOS_MAP_TOOLS_REPO_ROOT || SOURCE_REPO_ROOT);
}

function getCurrentView() {
    return MAP_TOOL_VIEWS[currentViewId] || MAP_TOOL_VIEWS.plan;
}

function createExportError(error, view) {
    const detail = error?.stderr || error?.stdout || error?.message || String(error || 'export_failed');
    return new Error(`${view.label} Export fehlgeschlagen.\n\n${detail}`);
}

async function runMapExport(view) {
    const repoRoot = resolveRepoRoot();
    try {
        await execFileAsync(NODE_EXECUTABLE, [view.exportScript], {
            cwd: repoRoot,
            windowsHide: true,
            timeout: 60_000,
            maxBuffer: 4 * 1024 * 1024,
        });
    } catch (error) {
        throw createExportError(error, view);
    }
}

async function refreshExports(viewIds = Object.keys(MAP_TOOL_VIEWS)) {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        for (const viewId of viewIds) {
            const view = MAP_TOOL_VIEWS[viewId];
            if (view) {
                await runMapExport(view);
            }
        }
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

async function startServer() {
    if (mapServer) {
        return mapServer;
    }
    mapServer = await startMapToolsServer({ rootDir: resolveRepoRoot(), port: 0 });
    return mapServer;
}

async function stopServer() {
    if (!mapServer) {
        return;
    }
    const server = mapServer;
    mapServer = null;
    await server.close();
}

function updateWindowTitle() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }
    mainWindow.setTitle(`CurviosClash Map Tools - ${getCurrentView().label}`);
}

async function loadMapView(viewId, options = {}) {
    const view = MAP_TOOL_VIEWS[viewId] || MAP_TOOL_VIEWS.plan;
    currentViewId = view.id;
    updateWindowTitle();
    try {
        if (options.refresh !== false) {
            await refreshExports([view.id]);
        }
        const server = await startServer();
        if (mainWindow && !mainWindow.isDestroyed()) {
            await mainWindow.loadURL(`${server.url}${view.viewPath}`);
            updateWindowTitle();
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error || 'Unbekannter Fehler');
        dialog.showErrorBox('CurviosClash Map Tools', message);
    }
}

async function refreshCurrentView() {
    await loadMapView(currentViewId, { refresh: true });
}

async function refreshAllAndReloadCurrent() {
    try {
        await refreshExports();
        await loadMapView(currentViewId, { refresh: false });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error || 'Unbekannter Fehler');
        dialog.showErrorBox('CurviosClash Map Tools', message);
    }
}

function openRepoPath(relativePath) {
    const targetPath = path.join(resolveRepoRoot(), relativePath || '');
    shell.openPath(targetPath).catch((error) => {
        dialog.showErrorBox('CurviosClash Map Tools', error instanceof Error ? error.message : String(error));
    });
}

function buildApplicationMenu() {
    const template = [
        {
            label: 'Datei',
            submenu: [
                {
                    label: 'Exporte aktualisieren',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => { void refreshAllAndReloadCurrent(); },
                },
                {
                    label: 'Aktuelle Karte aktualisieren',
                    accelerator: 'F5',
                    click: () => { void refreshCurrentView(); },
                },
                { type: 'separator' },
                {
                    label: 'Repo-Ordner oeffnen',
                    click: () => openRepoPath(''),
                },
                { type: 'separator' },
                { role: 'quit', label: 'Beenden' },
            ],
        },
        {
            label: 'Karten',
            submenu: [
                {
                    label: 'Plan Map',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => { void loadMapView('plan'); },
                },
                {
                    label: 'Repo Map',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => { void loadMapView('repo'); },
                },
            ],
        },
        {
            label: 'Ansicht',
            submenu: [
                { role: 'reload', label: 'Neu laden' },
                { role: 'zoomIn', label: 'Zoom +' },
                { role: 'zoomOut', label: 'Zoom -' },
                { role: 'resetZoom', label: 'Zoom zuruecksetzen' },
                { type: 'separator' },
                { role: 'toggleDevTools', label: 'DevTools' },
            ],
        },
        {
            label: 'Hilfe',
            submenu: [
                {
                    label: 'Plan Map README',
                    click: () => openRepoPath(MAP_TOOL_VIEWS.plan.readmePath),
                },
                {
                    label: 'Repo Map README',
                    click: () => openRepoPath(MAP_TOOL_VIEWS.repo.readmePath),
                },
            ],
        },
    ];
    return Menu.buildFromTemplate(template);
}

async function createWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        return mainWindow;
    }

    const shouldShowWindow = String(process.env.CURVIOS_ELECTRON_SHOW_WINDOW || '').trim() !== '0';
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1040,
        minHeight: 700,
        title: 'CurviosClash Map Tools',
        show: shouldShowWindow,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
        },
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    Menu.setApplicationMenu(buildApplicationMenu());
    await loadMapView(currentViewId, { refresh: false });
    return mainWindow;
}

async function startMapTools() {
    await refreshExports();
    await startServer();
    await createWindow();
}

async function shutdownMapTools() {
    await stopServer();
}

app.setAppUserModelId('de.curviosclash.map-tools');
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
    app.quit();
} else {
    const { sessionDataPath } = configureStoragePaths({
        app,
        sharedUserDataDirName: SHARED_USER_DATA_DIR_NAME,
        sessionDataDirName: MAP_TOOLS_SESSION_DATA_DIR_NAME,
    });
    const sessionSelfHealState = initSessionDataSelfHeal({
        sessionDataPath,
        processLabel: 'map-tools',
    });
    markSessionExitClean = sessionSelfHealState.markCleanExit;
}

app.whenReady().then(async () => {
    if (!hasSingleInstanceLock) {
        return;
    }
    try {
        await startMapTools();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Startfehler';
        dialog.showErrorBox('Map Tools Startfehler', message);
        await shutdownMapTools();
        app.quit();
    }
});

app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
        void createWindow();
        return;
    }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.focus();
});

app.on('window-all-closed', () => {
    void shutdownMapTools().finally(() => {
        app.quit();
    });
});

app.on('before-quit', () => {
    markSessionExitClean();
    void shutdownMapTools();
});
