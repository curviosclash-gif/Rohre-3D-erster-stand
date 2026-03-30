import { mkdir, open, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const STARTUP_DIAGNOSTICS_FILE = 'playwright-startup-diagnostics.json';
const STARTUP_PROBE_MAX_ATTEMPTS = 6;
const STARTUP_PROBE_TIMEOUT_MS = 15_000;
const STARTUP_PROBE_RETRY_DELAY_MS = 1_200;
const PREWARM_MAX_ATTEMPTS = 1;
const PREWARM_GOTO_TIMEOUT_MS = 30_000;
const PREWARM_MENU_TIMEOUT_MS = 180_000;
const PREWARM_RETRY_DELAY_MS = 2_000;
const STARTUP_LOG_SNIPPET_FILES = 4;
const STARTUP_LOG_SNIPPET_LINES = 60;
const MODULE_WARMUP_REQUEST_PATHS = [
    '/src/core/main.js',
    '/src/core/Config.js',
    '/src/state/RoundRecorder.js',
    '/src/entities/MapSchema.js',
    '/src/composition/core-ui/CoreUiAppPorts.js',
    '/src/core/SettingsManager.js',
    '/src/core/ProfileManager.js',
    '/src/state/RoundStateController.js',
    '/src/core/PlayingStateSystem.js',
    '/src/state/RoundStateTickSystem.js',
    '/src/hunt/HuntMode.js',
    '/src/core/GameBootstrap.js',
    '/src/core/GameRuntimeFacade.js',
    '/src/core/GameDebugApi.js',
    '/src/shared/contracts/GameStateIds.js',
    '/src/shared/contracts/MatchLifecycleContract.js',
    '/src/core/perf/RuntimePerfProfiler.js',
    '/src/core/AppInitializer.js',
    '/src/core/PlaytestLaunchParams.js',
    '/src/shared/contracts/RecordingCaptureContract.js',
    '/src/core/recording/MediaRecorderSupport.js',
    '/src/core/config/ConfigSections.js',
    '/src/core/config/MapPresets.js',
    '/src/core/runtime/ActiveRuntimeConfigStore.js',
    '/src/core/runtime/GameRuntimeBundle.js',
    '/src/shared/logging/Logger.js',
    '/src/state/recorder/RoundEventStore.js',
    '/src/state/recorder/RoundMetricsStore.js',
    '/src/state/recorder/RoundSnapshotStore.js',
    '/src/state/RoundStateControllerOps.js',
    '/src/state/RoundStateOps.js',
    '/src/entities/mapSchema/MapSchemaConstants.js',
    '/src/entities/mapSchema/MapSchemaMigrationOps.js',
    '/src/entities/mapSchema/MapSchemaRuntimeOps.js',
    '/src/ui/UIManager.js',
    '/src/ui/ProfileUiController.js',
    '/src/composition/core-ui/CoreSettingsPorts.js',
    '/src/core/RuntimeConfig.js',
    '/src/state/TelemetryHistoryStore.js',
    '/src/core/settings/SettingsDefaultsFacade.js',
    '/src/core/settings/SettingsSanitizerOps.js',
    '/src/core/settings/SettingsSessionDraftFacade.js',
    '/src/core/settings/SettingsPresetFacade.js',
    '/src/core/settings/SettingsDeveloperFacade.js',
    '/src/core/settings/SettingsTextOverrideFacade.js',
    '/src/core/settings/SettingsTelemetryFacade.js',
    '/src/composition/core-ui/CoreProfilePorts.js',
    '/src/core/SimStateSnapshot.js',
    '/src/ui/MatchUiStateOps.js',
    '/src/core/Renderer.js',
    '/src/core/GameLoop.js',
    '/src/core/InputManager.js',
    '/src/entities/Particles.js',
    '/src/core/Audio.js',
    '/src/core/RuntimeDiagnosticsSystem.js',
    '/src/hunt/ScreenShake.js',
    '/src/core/PlanarAimAssistSystem.js',
    '/src/core/MatchSessionRuntimeBridge.js',
    '/src/core/BuildInfoController.js',
    '/src/core/MediaRecorderSystem.js',
    '/src/shared/runtime/GameRuntimePorts.js',
    '/src/composition/core-ui/CoreUiBootstrapPorts.js',
    '/src/shared/contracts/MenuControllerContract.js',
    '/src/shared/contracts/RuntimeClockContract.js',
    '/src/state/MatchSessionFactory.js',
    '/src/core/runtime/MatchStartValidationService.js',
    '/src/core/replay/ReplayRecorder.js',
    '/src/core/arcade/ArcadeRunRuntime.js',
    '/src/state/arcade/ArcadeRoundStateController.js',
    '/src/composition/core-ui/CoreUiMenuPorts.js',
    '/src/core/runtime/GameRuntimeSettingsKeySets.js',
    '/src/core/runtime/RuntimeSessionLifecycleService.js',
    '/src/core/runtime/MenuRuntimePresetConfigService.js',
    '/src/core/runtime/MenuRuntimeMultiplayerService.js',
    '/src/core/runtime/RuntimeSettingsChangeOrchestrator.js',
    '/src/core/runtime/MenuRuntimeDeveloperTrainingService.js',
    '/src/core/runtime/MenuRuntimeDeveloperModeService.js',
    '/src/core/runtime/MenuRuntimeSessionService.js',
    '/src/core/runtime/menu-handlers/CreateMenuEventHandlerRegistry.js',
    '/src/core/runtime/ProfileLifecycleController.js',
];
const MODULE_WARMUP_REQUEST_TIMEOUT_MS = 30_000;
const MODULE_WARMUP_CONCURRENCY = 3;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPositiveInt(rawValue, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
    const numeric = Number.parseInt(String(rawValue || ''), 10);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
}

function serializeError(error) {
    if (!error) return null;
    return {
        name: String(error?.name || 'Error'),
        message: String(error?.message || String(error)),
        code: error?.code ? String(error.code) : null,
        stack: typeof error?.stack === 'string'
            ? error.stack.split('\n').slice(0, 8).join('\n')
            : null,
    };
}

function tailLines(input, maxLines = STARTUP_LOG_SNIPPET_LINES) {
    const lines = String(input || '').split(/\r?\n/).filter((line) => line.length > 0);
    if (lines.length <= maxLines) return lines;
    return lines.slice(lines.length - maxLines);
}

function toIsoNow(now = Date.now()) {
    return new Date(now).toISOString();
}

function asTrimmedList(value) {
    return String(value || '')
        .split(/[;,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function normalizeLockPayload(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    return {
        ownerToken: String(parsed.ownerToken || ''),
        pid: Number(parsed.pid) || 0,
        runTag: String(parsed.runTag || ''),
        testPort: String(parsed.testPort || ''),
        outputDir: String(parsed.outputDir || ''),
        workers: Number(parsed.workers) || 0,
        startedAt: Number(parsed.startedAt) || 0,
        startedAtIso: String(parsed.startedAtIso || ''),
    };
}

async function readLockFile(lockPath) {
    try {
        const raw = await readFile(lockPath, 'utf8');
        return normalizeLockPayload(JSON.parse(raw));
    } catch {
        return null;
    }
}

async function writeLockFile(lockPath, payload) {
    const handle = await open(lockPath, 'wx');
    try {
        await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    } finally {
        await handle.close();
    }
}

function isProcessAlive(pid) {
    const numericPid = Number(pid);
    if (!Number.isInteger(numericPid) || numericPid <= 0) return false;
    try {
        process.kill(numericPid, 0);
        return true;
    } catch (error) {
        return error?.code === 'EPERM';
    }
}

async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('probe-timeout')), timeoutMs);
    try {
        return await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
            headers: {
                'cache-control': 'no-store',
            },
        });
    } finally {
        clearTimeout(timer);
    }
}

async function runClientModuleWarmup(baseUrl) {
    const origin = new URL(baseUrl).origin;
    const queue = MODULE_WARMUP_REQUEST_PATHS.map((requestPath) => new URL(requestPath, origin).toString());
    const attempts = [];

    const worker = async () => {
        while (queue.length > 0) {
            const url = queue.shift();
            if (!url) break;
            const startedAt = Date.now();
            const attempt = {
                url,
                path: new URL(url).pathname,
                startedAtIso: toIsoNow(startedAt),
                status: null,
                ok: false,
                error: null,
                durationMs: 0,
            };
            try {
                const response = await fetchWithTimeout(url, MODULE_WARMUP_REQUEST_TIMEOUT_MS);
                attempt.status = Number(response?.status) || 0;
                attempt.ok = response?.ok === true;
                await response.text();
            } catch (error) {
                attempt.error = serializeError(error);
            } finally {
                attempt.durationMs = Math.max(0, Date.now() - startedAt);
                attempts.push(attempt);
            }
        }
    };

    await Promise.all(Array.from({ length: MODULE_WARMUP_CONCURRENCY }, () => worker()));

    return {
        origin,
        requestPaths: [...MODULE_WARMUP_REQUEST_PATHS],
        concurrency: MODULE_WARMUP_CONCURRENCY,
        requestTimeoutMs: MODULE_WARMUP_REQUEST_TIMEOUT_MS,
        requestedUrls: MODULE_WARMUP_REQUEST_PATHS.length,
        attempts,
        failedCount: attempts.filter((attempt) => attempt.ok !== true).length,
    };
}

async function runHttpReadinessProbe(url) {
    const attempts = [];
    let ready = false;

    for (let attempt = 1; attempt <= STARTUP_PROBE_MAX_ATTEMPTS; attempt += 1) {
        const startedAt = Date.now();
        const probeAttempt = {
            attempt,
            url,
            startedAt,
            startedAtIso: toIsoNow(startedAt),
            status: null,
            ok: false,
            domHintSeen: false,
            error: null,
            durationMs: 0,
        };
        try {
            const response = await fetchWithTimeout(url, STARTUP_PROBE_TIMEOUT_MS);
            probeAttempt.status = Number(response?.status) || 0;
            probeAttempt.ok = response?.ok === true;
            const html = await response.text();
            probeAttempt.domHintSeen = (
                html.includes('id="main-menu"')
                || html.includes("id='main-menu'")
                || html.includes('#main-menu')
            );
            probeAttempt.durationMs = Math.max(0, Date.now() - startedAt);
            attempts.push(probeAttempt);
            if (probeAttempt.ok && probeAttempt.domHintSeen) {
                ready = true;
                break;
            }
        } catch (error) {
            probeAttempt.error = serializeError(error);
            probeAttempt.durationMs = Math.max(0, Date.now() - startedAt);
            attempts.push(probeAttempt);
        }

        if (attempt < STARTUP_PROBE_MAX_ATTEMPTS) {
            await sleep(STARTUP_PROBE_RETRY_DELAY_MS * attempt);
        }
    }

    return {
        url,
        attempts,
        retries: Math.max(0, attempts.length - 1),
        ready,
        lastAttempt: attempts[attempts.length - 1] || null,
    };
}

async function runBrowserPrewarm(url, options = {}) {
    const maxAttempts = toPositiveInt(options.maxAttempts, PREWARM_MAX_ATTEMPTS, 1, 5);
    const gotoTimeoutMs = toPositiveInt(options.gotoTimeoutMs, PREWARM_GOTO_TIMEOUT_MS, 1_000, 600_000);
    const menuTimeoutMs = toPositiveInt(options.menuTimeoutMs, PREWARM_MENU_TIMEOUT_MS, 1_000, 600_000);
    const retryDelayMs = toPositiveInt(options.retryDelayMs, PREWARM_RETRY_DELAY_MS, 100, 30_000);
    const waitUntil = String(options.waitUntil || 'commit');
    const supportedWaitStates = new Set(['commit', 'domcontentloaded', 'load', 'networkidle']);
    const waitState = supportedWaitStates.has(waitUntil) ? waitUntil : 'commit';
    const attempts = [];
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const startedAt = Date.now();
        const browserAttempt = {
            attempt,
            url,
            startedAt,
            startedAtIso: toIsoNow(startedAt),
            waitUntil: waitState,
            gotoTimeoutMs,
            menuTimeoutMs,
            console: [],
            pageErrors: [],
            gotoCompleted: false,
            runtimeReady: false,
            mainMenuVisible: false,
            error: null,
            durationMs: 0,
        };
        const browser = await chromium.launch();
        try {
            const page = await browser.newPage();
            page.on('console', (msg) => {
                const type = String(msg?.type?.() || '').trim().toLowerCase();
                if (type !== 'error' && type !== 'warning') return;
                browserAttempt.console.push({
                    type,
                    text: String(msg?.text?.() || '').slice(0, 400),
                });
            });
            page.on('pageerror', (error) => {
                browserAttempt.pageErrors.push(serializeError(error));
            });

            await page.goto(url, { waitUntil: waitState, timeout: gotoTimeoutMs });
            browserAttempt.gotoCompleted = true;
            await page.waitForFunction(() => {
                const menu = document.getElementById('main-menu');
                const mainMenuVisible = (() => {
                    if (!(menu instanceof HTMLElement) || menu.classList.contains('hidden')) return false;
                    const style = window.getComputedStyle(menu);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                })();
                const runtimeReady = !!globalThis?.GAME_INSTANCE;
                return mainMenuVisible || runtimeReady;
            }, null, { timeout: menuTimeoutMs });
            const readinessSnapshot = await page.evaluate(() => {
                const menu = document.getElementById('main-menu');
                return {
                    mainMenuVisible: (() => {
                        if (!(menu instanceof HTMLElement) || menu.classList.contains('hidden')) return false;
                        const style = window.getComputedStyle(menu);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    })(),
                    runtimeReady: !!globalThis?.GAME_INSTANCE,
                };
            });
            browserAttempt.mainMenuVisible = readinessSnapshot.mainMenuVisible === true;
            browserAttempt.runtimeReady = readinessSnapshot.runtimeReady === true;
            browserAttempt.durationMs = Math.max(0, Date.now() - startedAt);
            attempts.push(browserAttempt);
            await browser.close();
            return {
                url,
                attempts,
                retries: Math.max(0, attempts.length - 1),
                ready: true,
                config: {
                    maxAttempts,
                    gotoTimeoutMs,
                    menuTimeoutMs,
                    retryDelayMs,
                    waitUntil: waitState,
                },
                lastError: null,
            };
        } catch (error) {
            lastError = error;
            browserAttempt.error = serializeError(error);
            browserAttempt.durationMs = Math.max(0, Date.now() - startedAt);
            attempts.push(browserAttempt);
            await browser.close();
            if (attempt < maxAttempts) {
                await sleep(retryDelayMs * attempt);
            }
        }
    }

    return {
        url,
        attempts,
        retries: Math.max(0, attempts.length - 1),
        ready: false,
        config: {
            maxAttempts,
            gotoTimeoutMs,
            menuTimeoutMs,
            retryDelayMs,
            waitUntil: waitState,
        },
        lastError: serializeError(lastError),
    };
}

async function collectServerLogSnippets(baseDir) {
    const snippets = [];
    const explicitPaths = asTrimmedList(process.env.PW_SERVER_LOG_PATHS);
    const candidates = [];

    for (const explicitPath of explicitPaths) {
        const resolvedPath = path.resolve(baseDir, explicitPath);
        candidates.push({ path: resolvedPath, explicit: true });
    }

    try {
        const entries = await readdir(baseDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            if (!/^tmp-vite-.*\.(out|err)\.log$/i.test(entry.name)) continue;
            candidates.push({
                path: path.resolve(baseDir, entry.name),
                explicit: false,
            });
        }
    } catch {
        return snippets;
    }

    const uniqueCandidatePaths = Array.from(new Set(candidates.map((entry) => entry.path)));
    const withStat = [];
    for (const candidatePath of uniqueCandidatePaths) {
        try {
            const fileStat = await stat(candidatePath);
            withStat.push({
                path: candidatePath,
                mtimeMs: Number(fileStat.mtimeMs) || 0,
            });
        } catch {
            // Ignore stale candidate entries.
        }
    }

    withStat
        .sort((left, right) => right.mtimeMs - left.mtimeMs)
        .slice(0, STARTUP_LOG_SNIPPET_FILES)
        .forEach((entry) => snippets.push(entry));

    const resolvedSnippets = [];
    for (const snippet of snippets) {
        try {
            const raw = await readFile(snippet.path, 'utf8');
            resolvedSnippets.push({
                path: path.relative(baseDir, snippet.path),
                mtimeIso: toIsoNow(snippet.mtimeMs),
                tail: tailLines(raw, STARTUP_LOG_SNIPPET_LINES),
            });
        } catch {
            // Ignore read failures for ephemeral logs.
        }
    }
    return resolvedSnippets;
}

async function writeStartupDiagnostics(baseDir, outputDir, diagnostics) {
    const resolvedOutputDir = path.resolve(baseDir, outputDir || 'test-results');
    await mkdir(resolvedOutputDir, { recursive: true });
    const diagnosticsPath = path.resolve(resolvedOutputDir, STARTUP_DIAGNOSTICS_FILE);
    await writeFile(diagnosticsPath, `${JSON.stringify(diagnostics, null, 2)}\n`, 'utf8');
    return diagnosticsPath;
}

export default async function globalSetup() {
    const runTag = String(process.env.PW_RUN_TAG || `pid-${process.pid}`).trim();
    const testHost = String(process.env.TEST_HOST || '127.0.0.1').trim() || '127.0.0.1';
    const testPort = String(process.env.TEST_PORT || '').trim();
    const outputDir = String(process.env.PW_OUTPUT_DIR || '').trim();
    const workers = toPositiveInt(process.env.PW_WORKERS, 1, 1, 32);
    const strictPrewarm = process.env.PW_STRICT_PREWARM === '1';
    const prewarmMaxAttempts = toPositiveInt(process.env.PW_PREWARM_MAX_ATTEMPTS, PREWARM_MAX_ATTEMPTS, 1, 5);
    const prewarmGotoTimeoutMs = toPositiveInt(process.env.PW_PREWARM_GOTO_TIMEOUT_MS, PREWARM_GOTO_TIMEOUT_MS, 1_000, 600_000);
    const prewarmMenuTimeoutMs = toPositiveInt(process.env.PW_PREWARM_MENU_TIMEOUT_MS, PREWARM_MENU_TIMEOUT_MS, 1_000, 600_000);
    const prewarmRetryDelayMs = toPositiveInt(process.env.PW_PREWARM_RETRY_DELAY_MS, PREWARM_RETRY_DELAY_MS, 100, 30_000);
    const prewarmWaitUntilCandidate = String(process.env.PW_PREWARM_WAIT_UNTIL || 'commit');
    const prewarmWaitUntil = (
        prewarmWaitUntilCandidate === 'domcontentloaded'
        || prewarmWaitUntilCandidate === 'load'
        || prewarmWaitUntilCandidate === 'networkidle'
        || prewarmWaitUntilCandidate === 'commit'
    )
        ? prewarmWaitUntilCandidate
        : 'commit';
    process.env.PW_WORKERS = String(workers);

    if (!testPort || !outputDir || !runTag) {
        throw new Error(
            '[PlaywrightIsolation] Missing mandatory isolation env. ' +
            'Required: TEST_PORT, PW_RUN_TAG, PW_OUTPUT_DIR.'
        );
    }

    const baseDir = process.cwd();
    const diagnostics = {
        runTag,
        testHost,
        testPort,
        outputDir,
        workers,
        pid: process.pid,
        setupStartedAt: toIsoNow(),
        lock: {
            path: null,
            waitMs: null,
            pollMs: null,
            staleMs: null,
            attempts: [],
        },
        readiness: {
            url: `http://${testHost}:${testPort}/`,
            strictPrewarm,
            moduleWarmup: null,
            prewarmConfig: {
                maxAttempts: prewarmMaxAttempts,
                gotoTimeoutMs: prewarmGotoTimeoutMs,
                menuTimeoutMs: prewarmMenuTimeoutMs,
                retryDelayMs: prewarmRetryDelayMs,
                waitUntil: prewarmWaitUntil,
            },
            httpProbe: null,
            browserPrewarm: null,
            ready: false,
        },
        serverLogs: [],
        error: null,
    };

    const lockPath = path.resolve(baseDir, String(process.env.PW_LOCK_PATH || '.playwright-suite.lock'));
    const lockWaitMs = toPositiveInt(process.env.PW_LOCK_WAIT_MS, 300_000, 1_000, 3_600_000);
    const lockPollMs = toPositiveInt(process.env.PW_LOCK_POLL_MS, 250, 50, 10_000);
    const lockStaleMs = toPositiveInt(process.env.PW_LOCK_STALE_MS, 14_400_000, 30_000, 86_400_000);
    const startedAt = Date.now();
    const ownerToken = `${process.pid}-${startedAt}-${Math.random().toString(36).slice(2, 10)}`;
    const lockPayload = {
        ownerToken,
        pid: process.pid,
        runTag,
        testPort,
        outputDir,
        workers,
        startedAt,
        startedAtIso: new Date(startedAt).toISOString(),
    };
    diagnostics.lock.path = lockPath;
    diagnostics.lock.waitMs = lockWaitMs;
    diagnostics.lock.pollMs = lockPollMs;
    diagnostics.lock.staleMs = lockStaleMs;

    let diagnosticsPath = null;
    try {
        while (Date.now() - startedAt < lockWaitMs) {
            const lockAttemptStartedAt = Date.now();
            const lockAttempt = {
                attempt: diagnostics.lock.attempts.length + 1,
                startedAtIso: toIsoNow(lockAttemptStartedAt),
                acquired: false,
                staleLockRemoved: false,
                blockedBy: null,
                error: null,
                durationMs: 0,
            };
            try {
                await writeLockFile(lockPath, lockPayload);
                process.env.PW_SUITE_LOCK_PATH = lockPath;
                process.env.PW_SUITE_LOCK_OWNER = ownerToken;
                lockAttempt.acquired = true;
                lockAttempt.durationMs = Math.max(0, Date.now() - lockAttemptStartedAt);
                diagnostics.lock.attempts.push(lockAttempt);
                console.log(`[PlaywrightIsolation] lock acquired: ${lockPath}`);
                console.log(
                    `[PlaywrightIsolation] TEST_HOST=${testHost} TEST_PORT=${testPort} ` +
                    `PW_RUN_TAG=${runTag} PW_OUTPUT_DIR=${outputDir} PW_WORKERS=${workers}`
                );

                const readinessUrl = `http://${testHost}:${testPort}/`;
                diagnostics.readiness.httpProbe = await runHttpReadinessProbe(readinessUrl);
                diagnostics.readiness.moduleWarmup = await runClientModuleWarmup(readinessUrl);
                diagnostics.readiness.browserPrewarm = await runBrowserPrewarm(readinessUrl, {
                    maxAttempts: prewarmMaxAttempts,
                    gotoTimeoutMs: prewarmGotoTimeoutMs,
                    menuTimeoutMs: prewarmMenuTimeoutMs,
                    retryDelayMs: prewarmRetryDelayMs,
                    waitUntil: prewarmWaitUntil,
                });
                diagnostics.readiness.ready = (
                    diagnostics.readiness.httpProbe?.ready === true
                    && (
                        !strictPrewarm
                        || diagnostics.readiness.browserPrewarm?.ready === true
                    )
                );

                diagnostics.serverLogs = await collectServerLogSnippets(baseDir);
                diagnosticsPath = await writeStartupDiagnostics(baseDir, outputDir, diagnostics);
                console.log(`[PlaywrightIsolation] startup diagnostics: ${diagnosticsPath}`);
                if (!diagnostics.readiness.browserPrewarm?.ready) {
                    console.warn(
                        `[PlaywrightIsolation] prewarm probe failed after retries; ` +
                        `continuing because strict prewarm is ${strictPrewarm ? 'enabled' : 'disabled'}`
                    );
                }

                if (!diagnostics.readiness.ready) {
                    throw new Error(
                        '[PlaywrightIsolation] Runtime readiness probe failed after retries. ' +
                        `diagnostics=${diagnosticsPath}`
                    );
                }
                return;
            } catch (error) {
                if (error?.code !== 'EEXIST') {
                    lockAttempt.error = serializeError(error);
                    lockAttempt.durationMs = Math.max(0, Date.now() - lockAttemptStartedAt);
                    diagnostics.lock.attempts.push(lockAttempt);
                    throw error;
                }

                const existingLock = await readLockFile(lockPath);
                const existingStartedAt = Number(existingLock?.startedAt || 0);
                const lockAgeMs = Date.now() - (Number.isFinite(existingStartedAt) ? existingStartedAt : 0);
                const existingPid = Number(existingLock?.pid || 0);
                const staleOrDeadLock = !isProcessAlive(existingPid) || lockAgeMs > lockStaleMs;

                lockAttempt.blockedBy = existingLock;
                lockAttempt.staleLockRemoved = staleOrDeadLock;
                lockAttempt.durationMs = Math.max(0, Date.now() - lockAttemptStartedAt);
                diagnostics.lock.attempts.push(lockAttempt);

                if (staleOrDeadLock) {
                    await rm(lockPath, { force: true });
                    continue;
                }

                await sleep(lockPollMs);
            }
        }

        const blockingLock = await readLockFile(lockPath);
        throw new Error(
            '[PlaywrightIsolation] Timed out waiting for lock. ' +
            `Path=${lockPath} waitMs=${lockWaitMs} ` +
            `blocking=${JSON.stringify(blockingLock || {})}`
        );
    } catch (error) {
        diagnostics.error = serializeError(error);
        if (!Array.isArray(diagnostics.serverLogs) || diagnostics.serverLogs.length === 0) {
            diagnostics.serverLogs = await collectServerLogSnippets(baseDir);
        }
        if (!diagnosticsPath) {
            diagnosticsPath = await writeStartupDiagnostics(baseDir, outputDir, diagnostics);
        }
        throw new Error(
            `[PlaywrightIsolation] global setup failed. diagnostics=${diagnosticsPath} ` +
            `reason=${error?.message || 'unknown'}`
        );
    }
}
