import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HOST = '127.0.0.1';
const PORT = parseIntEnv('PERF_LIFECYCLE_PORT', 4275, 1024);
const BASE_URL = `http://${HOST}:${PORT}`;

const APP_READY_TIMEOUT_MS = parseIntEnv('PERF_LIFECYCLE_APP_READY_TIMEOUT', 25000, 5000);
const PLAYING_TIMEOUT_MS = parseIntEnv('PERF_LIFECYCLE_PLAYING_TIMEOUT', 10000, 1000);
const MENU_TIMEOUT_MS = parseIntEnv('PERF_LIFECYCLE_MENU_TIMEOUT', 10000, 1000);

const PROFILE_CONFIG = Object.freeze({
    trend: { sampleDurationMs: 2500 },
    full: { sampleDurationMs: 8000 },
});

function parseIntEnv(name, fallback, minValue = 1) {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minValue, parsed);
}

function parseProfile() {
    const cliProfileIndex = process.argv.findIndex((arg) => arg === '--profile');
    const cliProfile = cliProfileIndex >= 0 ? process.argv[cliProfileIndex + 1] : null;
    const requested = String(cliProfile || process.env.PERF_LIFECYCLE_PROFILE || 'full')
        .trim()
        .toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROFILE_CONFIG, requested) ? requested : 'full';
}

function toShortError(error) {
    if (!error) return 'unknown';
    if (typeof error === 'string') return error;
    return error.message || String(error);
}

function forceKillPort(port) {
    try {
        if (process.platform === 'win32') {
            execSync(
                `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
                { stdio: 'ignore' }
            );
            return;
        }
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    } catch {
        // no-op
    }
}

function startViteServer() {
    const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
    return spawn(process.execPath, [viteBin, 'dev', '--host', HOST, '--port', String(PORT), '--strictPort'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true,
    });
}

async function waitForServer(url, timeoutMs = 45000) {
    const start = Date.now();
    let lastError = null;
    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url, {
                redirect: 'follow',
                signal: AbortSignal.timeout(1500),
            });
            if (response.ok) return;
            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await delay(250);
    }
    throw new Error(`Server not reachable after ${timeoutMs}ms (${toShortError(lastError)})`);
}

async function stopServer(server) {
    if (!server || server.exitCode !== null) return;
    server.kill();
    await delay(250);
    if (server.exitCode !== null) return;

    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: 'ignore' });
        } else {
            execSync(`kill -9 ${server.pid}`, { stdio: 'ignore' });
        }
    } catch {
        // no-op
    }
}

async function runLifecycleProbe(page, sampleDurationMs) {
    const navStart = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: APP_READY_TIMEOUT_MS });
    await page.waitForFunction(() => !!window.GAME_INSTANCE, null, { timeout: APP_READY_TIMEOUT_MS });
    await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'MENU', null, { timeout: APP_READY_TIMEOUT_MS });
    const domToGameInstanceMs = Date.now() - navStart;

    const startMatchBegin = Date.now();
    await page.evaluate(() => {
        const game = window.GAME_INSTANCE;
        if (!game || typeof game.startMatch !== 'function') {
            throw new Error('startMatch missing');
        }
        game.startMatch();
    });
    await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'PLAYING', null, { timeout: PLAYING_TIMEOUT_MS });
    const startMatchLatencyMs = Date.now() - startMatchBegin;

    if (sampleDurationMs > 0) {
        await delay(sampleDurationMs);
    }

    const returnToMenuBegin = Date.now();
    await page.evaluate(() => {
        const game = window.GAME_INSTANCE;
        if (!game || typeof game._returnToMenu !== 'function') {
            throw new Error('_returnToMenu missing');
        }
        game._returnToMenu();
    });
    await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'MENU', null, { timeout: MENU_TIMEOUT_MS });
    const returnToMenuLatencyMs = Date.now() - returnToMenuBegin;

    const lifecycleEventTypes = await page.evaluate(() => {
        const recorder = window.GAME_INSTANCE?.mediaRecorderSystem;
        const events = recorder?.getLifecycleEvents?.() || [];
        return events.map((entry) => String(entry?.type || ''));
    });

    return {
        timings: {
            domToGameInstanceMs,
            startMatchLatencyMs,
            returnToMenuLatencyMs,
        },
        lifecycleEventTypes,
    };
}

async function run() {
    const profile = parseProfile();
    const sampleDurationMs = PROFILE_CONFIG[profile].sampleDurationMs;
    const outputPath = process.env.PERF_LIFECYCLE_OUTPUT_PATH || `tmp/perf_phase28_5_lifecycle_${profile}.json`;

    let server = null;
    let browser = null;
    let context = null;

    try {
        forceKillPort(PORT);
        server = startViteServer();
        await waitForServer(BASE_URL);

        browser = await chromium.launch({ headless: true });
        context = await browser.newContext();
        const page = await context.newPage();

        const probe = await runLifecycleProbe(page, sampleDurationMs);
        const report = {
            generatedAt: new Date().toISOString(),
            profile,
            sampleDurationMs,
            appUrl: BASE_URL,
            measurements: probe.timings,
            lifecycleEventTypes: probe.lifecycleEventTypes,
        };

        await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

        console.log('\nPERF_LIFECYCLE_RESULT');
        console.log(JSON.stringify(report, null, 2));
        console.log(`\nWrote: ${outputPath}`);
    } finally {
        try {
            await context?.close();
        } catch {
            // no-op
        }
        try {
            await browser?.close();
        } catch {
            // no-op
        }
        await stopServer(server);
        forceKillPort(PORT);
    }
}

run().catch((error) => {
    console.error('[perf-lifecycle] failed:', error?.stack || toShortError(error));
    process.exit(1);
});
