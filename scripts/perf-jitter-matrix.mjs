import { execSync, spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { getBotValidationMatrix } from '../src/state/validation/BotValidationMatrix.js';

const HOST = '127.0.0.1';
const PORT = parsePositiveInt(process.env.PERF_RUCKLER_PORT, 4286, 1024, 65_535);
const BASE_URL = `http://${HOST}:${PORT}`;
const APP_READY_TIMEOUT_MS = parsePositiveInt(process.env.PERF_RUCKLER_APP_READY_TIMEOUT_MS, 30_000, 5_000, 120_000);
const SAMPLE_DURATION_MS = parsePositiveInt(process.env.PERF_RUCKLER_SAMPLE_DURATION_MS, 15_000, 2_000, 120_000);
const AFTER_TOGGLE_WAIT_MS = parsePositiveInt(process.env.PERF_RUCKLER_AFTER_TOGGLE_WAIT_MS, 250, 0, 5_000);
const OUTPUT_PATH = String(process.env.PERF_RUCKLER_OUTPUT_PATH || `tmp/perf_jitter_matrix_${Date.now()}.json`);
const HEADED = String(process.env.PERF_RUCKLER_HEADED || '').trim() === '1';
const SCENARIO_FILTER = String(process.env.PERF_RUCKLER_SCENARIOS || '')
    .split(/[,\s;]+/)
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => entry.length > 0);

function parsePositiveInt(rawValue, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
    const numeric = Number.parseInt(String(rawValue || ''), 10);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
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

async function waitForServer(url, timeoutMs = 45_000) {
    const start = Date.now();
    let lastError = null;
    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url, {
                redirect: 'follow',
                signal: AbortSignal.timeout(1_500),
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

function detectPeriodicSpikes(spikeEvents = []) {
    if (!Array.isArray(spikeEvents) || spikeEvents.length < 4) {
        return {
            periodic: false,
            intervalCount: 0,
            inBandRatio: 0,
            meanIntervalMs: 0,
            stdDevMs: 0,
        };
    }

    const sorted = spikeEvents
        .map((entry) => Number(entry?.timestampMs))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
    if (sorted.length < 4) {
        return {
            periodic: false,
            intervalCount: 0,
            inBandRatio: 0,
            meanIntervalMs: 0,
            stdDevMs: 0,
        };
    }

    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
        const delta = sorted[i] - sorted[i - 1];
        if (delta > 0) intervals.push(delta);
    }
    if (intervals.length < 3) {
        return {
            periodic: false,
            intervalCount: intervals.length,
            inBandRatio: 0,
            meanIntervalMs: 0,
            stdDevMs: 0,
        };
    }

    const inBand = intervals.filter((value) => value >= 900 && value <= 2200);
    const inBandRatio = inBand.length / intervals.length;
    const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const variance = intervals.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const periodic = inBandRatio >= 0.6 && stdDev <= 260;

    return {
        periodic,
        intervalCount: intervals.length,
        inBandRatio,
        meanIntervalMs: mean,
        stdDevMs: stdDev,
    };
}

function evaluateAcceptance(run) {
    const p95 = Number(run?.performance?.frameMs?.p95 || 0);
    const p99 = Number(run?.performance?.frameMs?.p99 || 0);
    const periodic = !!run?.spikeRhythm?.periodic;
    const intervalStats = run?.recording?.frameIntervalStats || null;
    const recordingGapMaxMs = Number(intervalStats?.max || 0);
    const recordingStable = run.recording?.requested
        ? recordingGapMaxMs > 0 && recordingGapMaxMs <= 60
        : true;
    return {
        pass: p95 < 22 && p99 < 30 && !periodic && recordingStable,
        p95Pass: p95 < 22,
        p99Pass: p99 < 30,
        periodicPass: !periodic,
        recordingPass: recordingStable,
    };
}

async function ensureMenuState(page) {
    await page.waitForFunction(() => !!window.GAME_INSTANCE, null, { timeout: APP_READY_TIMEOUT_MS });
    await page.evaluate(() => {
        const game = window.GAME_INSTANCE;
        if (!game) throw new Error('GAME_INSTANCE missing');
        if (game.state !== 'MENU' && typeof game._returnToMenu === 'function') {
            game._returnToMenu();
        }
    });
    await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'MENU', null, { timeout: 12_000 });
}

async function runSingleMatrixCase(page, scenario, options) {
    await ensureMenuState(page);

    const setup = await page.evaluate(async ({ scenarioId, cinematicEnabled, recordingEnabled }) => {
        const game = window.GAME_INSTANCE;
        if (!game) throw new Error('GAME_INSTANCE missing');
        const debugApi = game.debugApi || window.GAME_DEBUG || null;
        const applyScenario = typeof game.applyBotValidationScenario === 'function'
            ? game.applyBotValidationScenario.bind(game)
            : (typeof debugApi?.applyBotValidationScenario === 'function'
                ? debugApi.applyBotValidationScenario.bind(debugApi)
                : null);
        if (typeof applyScenario !== 'function') throw new Error('applyBotValidationScenario missing');
        const appliedScenario = applyScenario(scenarioId);
        if (!appliedScenario) throw new Error(`Scenario not found: ${scenarioId}`);

        if (typeof game.renderer?.setCinematicEnabled === 'function') {
            game.renderer.setCinematicEnabled(!!cinematicEnabled);
        }

        game.runtimePerfProfiler?.reset?.();
        if (game.recorder?.resetAggregateMetrics) {
            game.recorder.resetAggregateMetrics();
        }

        const recorder = game.mediaRecorderSystem;
        const support = recorder?.getSupportState?.() || {};
        let recordingStarted = false;
        let recordingStartResult = null;
        if (recordingEnabled && support.canRecord) {
            if (typeof recorder?.startRecording === 'function') {
                recordingStartResult = await recorder.startRecording({
                    type: 'recording_requested',
                    context: {
                        command: 'start',
                        source: 'perf-jitter-matrix',
                    },
                });
                recordingStarted = !!recordingStartResult?.started || !!recorder?.isRecording?.();
            } else if (typeof recorder?.notifyLifecycleEvent === 'function') {
                recorder.notifyLifecycleEvent('recording_requested', {
                    command: 'start',
                    source: 'perf-jitter-matrix',
                });
                await new Promise((resolve) => setTimeout(resolve, 150));
                recordingStarted = !!recorder?.isRecording?.();
            }
        }

        if (typeof game.startMatch !== 'function') throw new Error('startMatch missing');
        game.startMatch();

        return {
            appliedScenarioId: appliedScenario.id,
            recordingRequested: !!recordingEnabled,
            recordingSupported: !!support.canRecord,
            recordingStarted,
            recordingStartResult,
        };
    }, {
        scenarioId: scenario.id,
        cinematicEnabled: options.cinematicEnabled,
        recordingEnabled: options.recordingEnabled,
    });

    await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'PLAYING', null, { timeout: 15_000 });
    await delay(AFTER_TOGGLE_WAIT_MS);
    await page.evaluate(() => {
        window.GAME_INSTANCE?.runtimePerfProfiler?.reset?.();
    });
    await delay(SAMPLE_DURATION_MS);

    const snapshot = await page.evaluate(async ({ recordingEnabled }) => {
        const game = window.GAME_INSTANCE;
        if (!game) throw new Error('GAME_INSTANCE missing');
        const debugApi = game.debugApi || window.GAME_DEBUG || null;
        const perfSnapshot = typeof debugApi?.getRuntimePerformanceSnapshot === 'function'
            ? debugApi.getRuntimePerformanceSnapshot({
                windowSize: 420,
                spikeEventsLimit: 24,
            })
            : {
                performance: game.runtimePerfProfiler?.getSnapshot?.({
                    windowSize: 420,
                    spikeEventsLimit: 24,
                }) || null,
                recorder: game.mediaRecorderSystem?.getRecordingDiagnostics?.() || null,
            };

        let stopResult = null;
        let exportMeta = null;
        if (recordingEnabled && game.mediaRecorderSystem?.isRecording?.()) {
            stopResult = await game.mediaRecorderSystem.stopRecording({
                source: 'perf-jitter-matrix',
                command: 'stop',
            });
            exportMeta = game.mediaRecorderSystem?.getLastExportMeta?.() || exportMeta;
        }

        return {
            state: game.state,
            perfSnapshot,
            stopResult,
            exportMeta,
            recordingState: game.mediaRecorderSystem?.getRecordingDiagnostics?.() || null,
        };
    }, {
        recordingEnabled: !!options.recordingEnabled,
    });

    await ensureMenuState(page);

    const perfData = snapshot?.perfSnapshot?.performance || null;
    const spikeEvents = perfData?.spikes?.events || [];
    const spikeRhythm = detectPeriodicSpikes(spikeEvents);
    const run = {
        scenarioId: scenario.id,
        scenario,
        cinematicEnabled: !!options.cinematicEnabled,
        recording: {
            requested: !!options.recordingEnabled,
            supported: !!setup.recordingSupported,
            started: !!setup.recordingStarted,
            startResult: setup.recordingStartResult || null,
            stopResult: snapshot?.stopResult || null,
            frameIntervalStats: options.recordingEnabled
                ? (snapshot?.exportMeta?.frameIntervalStats || snapshot?.stopResult?.frameIntervalStats || null)
                : null,
            recorderDiagnostics: snapshot?.recordingState || null,
        },
        performance: perfData,
        spikeRhythm,
        finalState: snapshot?.state || null,
    };
    run.acceptance = evaluateAcceptance(run);
    return run;
}

async function run() {
    forceKillPort(PORT);
    const server = startViteServer();
    let browser = null;
    let context = null;
    try {
        await waitForServer(BASE_URL, APP_READY_TIMEOUT_MS);

        browser = await chromium.launch({
            headless: !HEADED,
            args: HEADED
                ? []
                : [
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                ],
        });
        context = await browser.newContext({
            viewport: { width: 1600, height: 900 },
        });
        const page = await context.newPage();
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: APP_READY_TIMEOUT_MS });
        await ensureMenuState(page);

        const scenarios = getBotValidationMatrix()
            .slice(0, 4)
            .filter((scenario) => {
                if (SCENARIO_FILTER.length === 0) return true;
                return SCENARIO_FILTER.includes(String(scenario.id || '').toUpperCase());
            });
        const runs = [];
        const matrixVariants = [
            { cinematicEnabled: false, recordingEnabled: false },
            { cinematicEnabled: true, recordingEnabled: false },
            { cinematicEnabled: false, recordingEnabled: true },
            { cinematicEnabled: true, recordingEnabled: true },
        ];

        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];
            for (let j = 0; j < matrixVariants.length; j++) {
                const variant = matrixVariants[j];
                const runResult = await runSingleMatrixCase(page, scenario, variant);
                runs.push(runResult);
                console.log(
                    `[perf-jitter] ${scenario.id} cinematic=${variant.cinematicEnabled ? 'on' : 'off'} recording=${variant.recordingEnabled ? 'on' : 'off'} p95=${(runResult.performance?.frameMs?.p95 || 0).toFixed(2)} p99=${(runResult.performance?.frameMs?.p99 || 0).toFixed(2)} pass=${runResult.acceptance.pass}`
                );
            }
        }

        const summary = {
            totalRuns: runs.length,
            passedRuns: runs.filter((entry) => entry.acceptance.pass).length,
            worstP95: Math.max(...runs.map((entry) => Number(entry?.performance?.frameMs?.p95 || 0))),
            worstP99: Math.max(...runs.map((entry) => Number(entry?.performance?.frameMs?.p99 || 0))),
            periodicSpikeRuns: runs.filter((entry) => entry.spikeRhythm?.periodic).length,
            recordingGapViolations: runs.filter((entry) => !entry.acceptance.recordingPass).length,
        };

        const report = {
            generatedAt: new Date().toISOString(),
            host: BASE_URL,
            sampleDurationMs: SAMPLE_DURATION_MS,
            scenarios,
            runs,
            summary,
            acceptanceTargets: {
                frameP95Ms: '< 22',
                frameP99Ms: '< 30',
                periodicSpikes: 'none in 1-2s rhythm',
                recordingFrameGapMaxMs: '<= 60',
            },
        };

        await writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\n[perf-jitter] wrote ${OUTPUT_PATH}`);
        console.log(JSON.stringify(summary, null, 2));
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
    console.error('[perf-jitter] failed:', error?.stack || toShortError(error));
    process.exit(1);
});
