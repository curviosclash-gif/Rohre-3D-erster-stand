const DEFAULT_SERVER_PROBE_TIMEOUT_MS = 5_000;
const DEFAULT_RUN_PROFILE = 'preview-smoke';
const DEFAULT_SERVER_PROBE_PATH = '/';
const STARTUP_FAILURE_STAGES = new Set(['idle', 'goto', 'startup_probe', 'http_probe']);
const READINESS_FAILURE_STAGES = new Set([
    'shell_ready',
    'runtime_ready',
    'return_to_menu_probe',
    'return_to_menu',
    'menu_idle',
    'browser_prewarm',
]);
const PLAYWRIGHT_FLAKE_REASON_PATTERNS = [
    ['page_closed', /Target page, context or browser has been closed/i],
    ['browser_closed', /browser has been closed/i],
    ['frame_detached', /frame was detached/i],
    ['execution_context_destroyed', /Execution context was destroyed/i],
    ['navigation_aborted', /net::ERR_ABORTED/i],
    ['page_crashed', /page crashed/i],
];

function hasMainMenuDomHint(html) {
    const source = String(html || '');
    return (
        source.includes('id="main-menu"')
        || source.includes("id='main-menu'")
        || source.includes('#main-menu')
    );
}

function resolveRunProfile(rawValue = process.env.PW_RUN_PROFILE) {
    const normalized = String(rawValue || '').trim();
    return normalized || DEFAULT_RUN_PROFILE;
}

function toProbeErrorMessage(error) {
    return String(error?.message || 'request_failed');
}

function toResponseOk(response) {
    if (typeof response?.ok === 'function') {
        return response.ok();
    }
    return response?.ok === true;
}

function toResponseStatus(response) {
    if (typeof response?.status === 'function') {
        return Number(response.status()) || 0;
    }
    return Number(response?.status) || 0;
}

function createFallbackSnapshot(overrides = {}) {
    return {
        pageClosed: false,
        mainMenuVisible: false,
        runtimeReady: false,
        visiblePanelId: null,
        errorOverlayVisible: false,
        errorOverlayText: '',
        documentReadyState: 'unavailable',
        locationHref: '',
        appBootState: 'booting',
        ...overrides,
    };
}

function findPlaywrightFlakeReason(error) {
    const message = String(error?.message || error || '').trim();
    if (!message) return null;
    for (const [reason, pattern] of PLAYWRIGHT_FLAKE_REASON_PATTERNS) {
        if (pattern.test(message)) {
            return reason;
        }
    }
    return null;
}

function normalizeStage(stage) {
    const normalized = String(stage || '').trim();
    return normalized || 'idle';
}

function resolveFailureReason(stage, serverReady, shellReady, appReady, appBootState, error, pageClosed) {
    if (pageClosed === true) return 'page_closed';
    const flakeReason = findPlaywrightFlakeReason(error);
    if (flakeReason) return flakeReason;
    if (!serverReady) {
        return stage === 'goto' ? 'startup_navigation_failed' : 'server_not_ready';
    }
    if (!shellReady) return 'shell_not_ready';
    if (!appReady) {
        if (appBootState === 'runtime_error_overlay') return 'runtime_error_overlay';
        return `app_boot_${appBootState}`;
    }
    if (READINESS_FAILURE_STAGES.has(stage)) {
        return `${stage}_incomplete`;
    }
    if (STARTUP_FAILURE_STAGES.has(stage)) {
        return `${stage}_failed`;
    }
    return error ? 'transient_playwright_error' : null;
}

export function summarizeAppReadiness(appBootSnapshot) {
    return {
        shellReady: appBootSnapshot?.mainMenuVisible === true,
        appReady: appBootSnapshot?.runtimeReady === true,
        appBootState: String(appBootSnapshot?.appBootState || 'booting'),
    };
}

export function isServerProbeReady(serverProbe, options = {}) {
    if (!serverProbe || serverProbe.ok !== true) return false;
    if (options.requireDomHint !== true) return true;
    return serverProbe.domHintSeen === true;
}

export function createPlaywrightReadinessContract(options = {}) {
    const stage = normalizeStage(options.stage);
    const runProfile = resolveRunProfile(options.runProfile);
    const serverProbe = options.serverProbe && typeof options.serverProbe === 'object'
        ? options.serverProbe
        : {
            ok: false,
            status: 0,
            error: null,
            url: DEFAULT_SERVER_PROBE_PATH,
            domHintSeen: null,
        };
    const appBoot = options.appBootSnapshot && typeof options.appBootSnapshot === 'object'
        ? options.appBootSnapshot
        : createFallbackSnapshot();
    const requireDomHint = options.requireDomHint === true;
    const appReadiness = summarizeAppReadiness(appBoot);
    const serverReady = isServerProbeReady(serverProbe, { requireDomHint });
    const shellReady = appReadiness.shellReady;
    const appReady = appReadiness.appReady;
    const appBootState = appReadiness.appBootState;
    const failureReason = resolveFailureReason(
        stage,
        serverReady,
        shellReady,
        appReady,
        appBootState,
        options.error,
        appBoot.pageClosed === true
    );
    const failureClass = failureReason
        ? (
            findPlaywrightFlakeReason(options.error) || appBoot.pageClosed === true
                ? 'flake'
                : ((!serverReady || STARTUP_FAILURE_STAGES.has(stage)) ? 'startup' : 'readiness')
        )
        : null;

    return {
        stage,
        runProfile,
        serverProbe,
        serverReady,
        shellReady,
        appReady,
        appBootState,
        appBoot,
        failureClass,
        failureReason,
        errorMessage: options.error ? String(options.error?.message || options.error) : null,
    };
}

export function formatPlaywrightReadinessContract(contract) {
    const parts = [];
    if (contract?.failureClass) parts.push(`failureClass="${contract.failureClass}"`);
    if (contract?.failureReason) parts.push(`failureReason="${contract.failureReason}"`);
    parts.push(`stage="${normalizeStage(contract?.stage)}"`);
    parts.push(`serverReady=${contract?.serverReady === true}`);
    parts.push(`shellReady=${contract?.shellReady === true}`);
    parts.push(`appReady=${contract?.appReady === true}`);
    parts.push(`appBootState="${String(contract?.appBootState || 'booting')}"`);
    return parts.join(' ');
}

export async function probeServerReadiness(target, options = {}) {
    const timeoutMs = Number.isFinite(options.timeoutMs)
        ? Math.max(1, Number(options.timeoutMs))
        : DEFAULT_SERVER_PROBE_TIMEOUT_MS;
    const requestPath = String(options.path || DEFAULT_SERVER_PROBE_PATH);
    const expectDomHint = options.expectDomHint === true;

    if (typeof target === 'string' || target instanceof URL) {
        const url = String(target);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error('probe-timeout')), timeoutMs);
        try {
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal,
                headers: {
                    'cache-control': 'no-store',
                },
            });
            const probe = {
                ok: toResponseOk(response),
                status: toResponseStatus(response),
                error: null,
                url,
                domHintSeen: null,
            };
            if (expectDomHint) {
                probe.domHintSeen = hasMainMenuDomHint(await response.text());
            }
            return probe;
        } catch (error) {
            return {
                ok: false,
                status: 0,
                error: toProbeErrorMessage(error),
                url,
                domHintSeen: null,
            };
        } finally {
            clearTimeout(timer);
        }
    }

    try {
        const response = await target.context().request.get(requestPath, {
            failOnStatusCode: false,
            timeout: timeoutMs,
        });
        const probe = {
            ok: toResponseOk(response),
            status: toResponseStatus(response),
            error: null,
            url: requestPath,
            domHintSeen: null,
        };
        if (expectDomHint) {
            probe.domHintSeen = hasMainMenuDomHint(await response.text());
        }
        return probe;
    } catch (error) {
        return {
            ok: false,
            status: 0,
            error: toProbeErrorMessage(error),
            url: requestPath,
            domHintSeen: null,
        };
    }
}

export async function captureAppBootSnapshot(page) {
    if (page.isClosed()) {
        return createFallbackSnapshot({
            pageClosed: true,
            appBootState: 'page_closed',
        });
    }
    try {
        return await page.evaluate(() => {
            const menu = document.getElementById('main-menu');
            const visiblePanel = document.querySelector('.submenu-panel:not(.hidden)');
            const errorOverlay = document.getElementById('runtime-error-overlay');
            const mainMenuVisible = (() => {
                if (!(menu instanceof HTMLElement) || menu.classList.contains('hidden')) return false;
                const style = window.getComputedStyle(menu);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })();
            const errorOverlayVisible = (() => {
                if (!(errorOverlay instanceof HTMLElement) || errorOverlay.classList.contains('hidden')) return false;
                const style = window.getComputedStyle(errorOverlay);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })();
            const runtimeReady = !!globalThis?.GAME_INSTANCE;
            return {
                pageClosed: false,
                mainMenuVisible,
                runtimeReady,
                visiblePanelId: visiblePanel instanceof HTMLElement ? visiblePanel.id : null,
                errorOverlayVisible,
                errorOverlayText: errorOverlayVisible
                    ? String(errorOverlay?.textContent || '').slice(0, 400)
                    : '',
                documentReadyState: String(document.readyState || ''),
                locationHref: String(window.location.href || ''),
                appBootState: runtimeReady
                    ? 'runtime_ready'
                    : (errorOverlayVisible
                        ? 'runtime_error_overlay'
                        : (mainMenuVisible ? 'menu_shell_ready' : 'booting')),
            };
        });
    } catch (error) {
        return createFallbackSnapshot({
            pageClosed: false,
            appBootState: 'snapshot_unavailable',
            snapshotError: toProbeErrorMessage(error),
        });
    }
}

export async function waitForShellOrRuntimeReady(page, timeoutMs) {
    await page.waitForFunction(() => {
        const menu = document.getElementById('main-menu');
        const runtimeReady = !!globalThis?.GAME_INSTANCE;
        if (runtimeReady) return true;
        if (!(menu instanceof HTMLElement) || menu.classList.contains('hidden')) return false;
        const style = window.getComputedStyle(menu);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }, null, { timeout: timeoutMs });
}

export async function waitForRuntimeReady(page, timeoutMs) {
    await page.waitForFunction(() => !!globalThis?.GAME_INSTANCE, null, { timeout: timeoutMs });
}

export async function collectPlaywrightStageDiagnostics(page, stage, options = {}) {
    const [serverProbe, appBoot] = await Promise.all([
        probeServerReadiness(page, {
            path: options.path,
            timeoutMs: options.serverProbeTimeoutMs,
            expectDomHint: options.expectDomHint,
        }),
        captureAppBootSnapshot(page),
    ]);
    return createPlaywrightReadinessContract({
        stage,
        runProfile: options.runProfile,
        serverProbe,
        appBootSnapshot: appBoot,
        requireDomHint: options.requireDomHint,
        error: options.error,
    });
}
