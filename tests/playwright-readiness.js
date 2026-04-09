const DEFAULT_SERVER_PROBE_TIMEOUT_MS = 5_000;
const DEFAULT_RUN_PROFILE = 'preview-smoke';
const DEFAULT_SERVER_PROBE_PATH = '/';

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
                ok: response.ok(),
                status: response.status(),
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
            ok: response.ok(),
            status: response.status(),
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
    const appReadiness = summarizeAppReadiness(appBoot);
    return {
        stage,
        runProfile: resolveRunProfile(options.runProfile),
        serverProbe,
        serverReady: isServerProbeReady(serverProbe, {
            requireDomHint: options.requireDomHint,
        }),
        shellReady: appReadiness.shellReady,
        appReady: appReadiness.appReady,
        appBootState: appReadiness.appBootState,
        appBoot,
    };
}
