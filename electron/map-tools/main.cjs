const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');
const { promisify } = require('node:util');
const {
    configureStoragePaths,
    initSessionDataSelfHeal,
} = require('../session-data-runtime.cjs');
const { startMapToolsServer } = require('./server.cjs');
const {
    commitGovernanceMarkdown,
    getGovernanceGitState,
    listEditableMarkdownFiles,
    previewEditableMarkdown,
    pushGovernanceMarkdown,
    readEditableMarkdown,
    saveEditableMarkdown,
} = require('./governance-editor.cjs');

const execFileAsync = promisify(execFile);

const SHARED_USER_DATA_DIR_NAME = 'curviosclash-app';
const MAP_TOOLS_SESSION_DATA_DIR_NAME = 'session-map-tools';
const MAP_TOOLS_IPC_CONTRACT_VERSION = 'map-tools-ipc.v1';
const SOURCE_REPO_ROOT = path.resolve(__dirname, '..', '..');
const NODE_EXECUTABLE = process.env.CURVIOS_NODE_EXECUTABLE || process.execPath;

const IPC_CHANNELS = Object.freeze({
    getState: 'map-tools:get-state',
    refresh: 'map-tools:refresh',
    setView: 'map-tools:set-view',
    openPath: 'map-tools:open-path',
    listMarkdown: 'map-tools:list-markdown',
    readMarkdown: 'map-tools:read-markdown',
    previewMarkdown: 'map-tools:preview-markdown',
    saveMarkdown: 'map-tools:save-markdown',
    gitState: 'map-tools:git-state',
    commitMarkdown: 'map-tools:commit-markdown',
    pushMarkdown: 'map-tools:push-markdown',
    viewRequested: 'map-tools:view-requested',
    refreshRequested: 'map-tools:refresh-requested',
});

const MAP_TOOL_VIEWS = Object.freeze({
    plan: Object.freeze({
        id: 'plan',
        label: 'Plan Map',
        exportScript: 'scripts/export-plan-map.mjs',
        viewPath: '/tools/plan-map/index.html',
        readmePath: 'tools/plan-map/README.md',
    }),
    repo: Object.freeze({
        id: 'repo',
        label: 'Repo Map',
        exportScript: 'scripts/export-repo-map.mjs',
        viewPath: '/tools/repo-map/index.html',
        readmePath: 'tools/repo-map/README.md',
    }),
    agent: Object.freeze({
        id: 'agent',
        label: 'Agent Map',
        exportScript: 'scripts/export-agent-map.mjs',
        viewPath: '/tools/agent-map/index.html',
        readmePath: 'tools/agent-map/README.md',
    }),
});

const PATH_TARGETS = Object.freeze({
    repoRoot: '',
    planReadme: MAP_TOOL_VIEWS.plan.readmePath,
    repoReadme: MAP_TOOL_VIEWS.repo.readmePath,
    agentReadme: MAP_TOOL_VIEWS.agent.readmePath,
});

let markSessionExitClean = () => {};
let mainWindow = null;
let mapServer = null;
let currentViewId = 'plan';
let refreshPromise = null;
let ipcRegistered = false;
const lastRefreshByView = new Map();

function resolveRepoRoot() {
    return path.resolve(process.env.CURVIOS_MAP_TOOLS_REPO_ROOT || SOURCE_REPO_ROOT);
}

function normalizeViewId(viewId) {
    const normalized = String(viewId || '').trim();
    return Object.prototype.hasOwnProperty.call(MAP_TOOL_VIEWS, normalized) ? normalized : 'plan';
}

function getCurrentView() {
    return MAP_TOOL_VIEWS[normalizeViewId(currentViewId)];
}

function toViewList() {
    return Object.values(MAP_TOOL_VIEWS).map((view) => ({
        id: view.id,
        label: view.label,
        viewPath: view.viewPath,
        readmePath: view.readmePath,
    }));
}

function serializeError(error) {
    return {
        message: error instanceof Error ? error.message : String(error || 'Unbekannter Fehler'),
        stderr: String(error?.stderr || '').trim(),
        stdout: String(error?.stdout || '').trim(),
    };
}

function createRefreshResult(view, ok, extra = {}) {
    return {
        viewId: view.id,
        label: view.label,
        exportScript: view.exportScript,
        ok,
        refreshedAt: new Date().toISOString(),
        error: null,
        ...extra,
    };
}

async function runMapExport(view) {
    try {
        await execFileAsync(NODE_EXECUTABLE, [view.exportScript], {
            cwd: resolveRepoRoot(),
            windowsHide: true,
            timeout: 60_000,
            maxBuffer: 4 * 1024 * 1024,
        });
        return createRefreshResult(view, true);
    } catch (error) {
        return createRefreshResult(view, false, {
            error: serializeError(error),
        });
    }
}

function resolveRefreshViewIds(targetViewId = 'all') {
    if (targetViewId === 'all') {
        return Object.keys(MAP_TOOL_VIEWS);
    }
    return [normalizeViewId(targetViewId)];
}

async function refreshExports(targetViewId = 'all') {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const results = [];
        for (const viewId of resolveRefreshViewIds(targetViewId)) {
            const view = MAP_TOOL_VIEWS[viewId];
            const result = await runMapExport(view);
            lastRefreshByView.set(view.id, result);
            results.push(result);
        }
        return {
            ok: results.every((result) => result.ok),
            results,
        };
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

function createStateSnapshot() {
    return {
        contractVersion: MAP_TOOLS_IPC_CONTRACT_VERSION,
        activeViewId: currentViewId,
        serverUrl: mapServer?.url || '',
        repoRoot: resolveRepoRoot(),
        views: toViewList(),
        refreshes: Object.fromEntries(lastRefreshByView.entries()),
    };
}

function updateWindowTitle() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }
    mainWindow.setTitle(`CurviosClash Map Tools - ${getCurrentView().label}`);
}

function sendRendererEvent(channel, payload) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return false;
    }
    mainWindow.webContents.send(channel, payload);
    return true;
}

async function openRepoPath(targetId) {
    const targetRelativePath = PATH_TARGETS[String(targetId || '')] ?? PATH_TARGETS.repoRoot;
    const targetPath = path.join(resolveRepoRoot(), targetRelativePath);
    const message = await shell.openPath(targetPath);
    return {
        ok: !message,
        targetPath,
        message,
    };
}

async function confirmDesktopAction({ title, message, detail, confirmLabel }) {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: [confirmLabel, 'Abbrechen'],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
        title,
        message,
        detail,
    });
    return result.response === 0;
}

function registerIpc() {
    if (ipcRegistered) {
        return;
    }
    ipcRegistered = true;

    ipcMain.handle(IPC_CHANNELS.getState, async () => {
        await startServer();
        return createStateSnapshot();
    });
    ipcMain.handle(IPC_CHANNELS.setView, async (_event, viewId) => {
        currentViewId = normalizeViewId(viewId);
        updateWindowTitle();
        return createStateSnapshot();
    });
    ipcMain.handle(IPC_CHANNELS.refresh, async (_event, payload = null) => {
        const targetViewId = payload && typeof payload === 'object'
            ? String(payload.viewId || 'all')
            : 'all';
        const refresh = await refreshExports(targetViewId);
        return {
            ...createStateSnapshot(),
            refresh,
        };
    });
    ipcMain.handle(IPC_CHANNELS.openPath, async (_event, targetId) => (
        openRepoPath(targetId)
    ));
    ipcMain.handle(IPC_CHANNELS.listMarkdown, async () => (
        listEditableMarkdownFiles(resolveRepoRoot())
    ));
    ipcMain.handle(IPC_CHANNELS.readMarkdown, async (_event, relativePath) => (
        readEditableMarkdown(resolveRepoRoot(), relativePath)
    ));
    ipcMain.handle(IPC_CHANNELS.previewMarkdown, async (_event, payload) => (
        previewEditableMarkdown(resolveRepoRoot(), payload)
    ));
    ipcMain.handle(IPC_CHANNELS.saveMarkdown, async (_event, payload) => {
        const preview = await previewEditableMarkdown(resolveRepoRoot(), payload);
        if (!preview.changed) return { ...preview, saved: false };
        const confirmed = await confirmDesktopAction({
            title: 'Governance-Markdown speichern',
            message: `${preview.path} wirklich speichern?`,
            detail: 'Die lokale Repository-Datei wird geaendert. Commit und Push bleiben separate Schritte.',
            confirmLabel: 'Speichern',
        });
        if (!confirmed) return { ...preview, saved: false, cancelled: true };
        await saveEditableMarkdown(resolveRepoRoot(), payload);
        return { ...preview, saved: true };
    });
    ipcMain.handle(IPC_CHANNELS.gitState, async () => (
        getGovernanceGitState(resolveRepoRoot())
    ));
    ipcMain.handle(IPC_CHANNELS.commitMarkdown, async (_event, payload) => {
        const state = await getGovernanceGitState(resolveRepoRoot());
        const confirmed = await confirmDesktopAction({
            title: 'Governance-Markdowns committen',
            message: `${state.files.length} freigegebene Markdown-Datei(en) committen?`,
            detail: state.files.join('\n') || 'Keine freigegebenen Markdown-Aenderungen vorhanden.',
            confirmLabel: 'Commit erstellen',
        });
        if (!confirmed) return { cancelled: true };
        return commitGovernanceMarkdown(resolveRepoRoot(), payload || {});
    });
    ipcMain.handle(IPC_CHANNELS.pushMarkdown, async () => {
        const state = await getGovernanceGitState(resolveRepoRoot());
        const confirmed = await confirmDesktopAction({
            title: 'Nach GitHub pushen',
            message: `Aktuellen Stand nach ${state.remote} pushen?`,
            detail: 'Vor dem Push wird ein lokaler Recovery-Tag erzeugt. Der Push wirkt extern auf GitHub.',
            confirmLabel: 'Snapshot + Push',
        });
        if (!confirmed) return { cancelled: true };
        return pushGovernanceMarkdown(resolveRepoRoot());
    });
}

function unregisterIpc() {
    if (!ipcRegistered) {
        return;
    }
    for (const channel of [
        IPC_CHANNELS.getState,
        IPC_CHANNELS.setView,
        IPC_CHANNELS.refresh,
        IPC_CHANNELS.openPath,
        IPC_CHANNELS.listMarkdown,
        IPC_CHANNELS.readMarkdown,
        IPC_CHANNELS.previewMarkdown,
        IPC_CHANNELS.saveMarkdown,
        IPC_CHANNELS.gitState,
        IPC_CHANNELS.commitMarkdown,
        IPC_CHANNELS.pushMarkdown,
    ]) {
        ipcMain.removeHandler(channel);
    }
    ipcRegistered = false;
}

function requestRendererView(viewId) {
    currentViewId = normalizeViewId(viewId);
    updateWindowTitle();
    sendRendererEvent(IPC_CHANNELS.viewRequested, { viewId: currentViewId });
}

function requestRendererRefresh(viewId) {
    if (!sendRendererEvent(IPC_CHANNELS.refreshRequested, { viewId })) {
        void refreshExports(viewId);
    }
}

function buildApplicationMenu() {
    const template = [
        {
            label: 'Datei',
            submenu: [
                {
                    label: 'Exporte aktualisieren',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => requestRendererRefresh('all'),
                },
                {
                    label: 'Aktuelle Karte aktualisieren',
                    accelerator: 'F5',
                    click: () => requestRendererRefresh(currentViewId),
                },
                { type: 'separator' },
                {
                    label: 'Repo-Ordner oeffnen',
                    click: () => { void openRepoPath('repoRoot'); },
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
                    click: () => requestRendererView('plan'),
                },
                {
                    label: 'Repo Map',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => requestRendererView('repo'),
                },
                {
                    label: 'Agent Map',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => requestRendererView('agent'),
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
                    click: () => { void openRepoPath('planReadme'); },
                },
                {
                    label: 'Repo Map README',
                    click: () => { void openRepoPath('repoReadme'); },
                },
                {
                    label: 'Agent Map README',
                    click: () => { void openRepoPath('agentReadme'); },
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
            preload: path.resolve(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
        },
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    Menu.setApplicationMenu(buildApplicationMenu());
    await mainWindow.loadFile(path.resolve(__dirname, 'ui', 'map-tools.html'));
    updateWindowTitle();
    return mainWindow;
}

async function startMapTools() {
    registerIpc();
    await startServer();
    await refreshExports();
    await createWindow();
}

async function shutdownMapTools() {
    unregisterIpc();
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
