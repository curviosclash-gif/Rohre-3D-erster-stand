import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const CLI_ARGS = parseArgMap(process.argv.slice(2));
const HOST = '127.0.0.1';
const PORT = parseIntEnv('BOT_RUNNER_PORT', 4273, 1024);
const BASE_URL = `http://${HOST}:${PORT}`;
const FORCE_KILL_PORT = parseBoolEnv('BOT_RUNNER_FORCE_KILL_PORT', true);
const DEFAULT_SCENARIO_COUNT = parseIntEnv('BOT_RUNNER_SCENARIO_COUNT', 4, 1);
const ROUNDS_PER_SCENARIO = parseIntEnv('BOT_RUNNER_ROUNDS', 4, 1);
const FAIL_ON_FORCED_ROUND = parseBoolEnv('BOT_RUNNER_FAIL_ON_FORCED_ROUND', false);
const MAX_FORCED_ROUNDS = parseIntEnv('BOT_RUNNER_MAX_FORCED_ROUNDS', Number.MAX_SAFE_INTEGER, 0);

const SERVER_READY_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_SERVER_TIMEOUT', 45000, 5000);
const APP_READY_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_BOOT_TIMEOUT', 180000, 5000);
const NAVIGATION_TIMEOUT_MS = parseIntEnv(
    'BOT_RUNNER_NAV_TIMEOUT',
    Math.max(APP_READY_TIMEOUT_MS, 60000),
    5000
);
const ROUND_START_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_PLAYING_TIMEOUT', 10000, 1000);
const ROUND_ACTIVE_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_MATCH_TIMEOUT', 50000, 10000);
const ROUND_FORCE_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_FORCE_TIMEOUT', 12000, 1000);
const MENU_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_MENU_TIMEOUT', 12000, 1000);
const EVAL_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_EVAL_TIMEOUT', 10000, 1000);
const CLEANUP_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_CLEANUP_TIMEOUT', 12000, 1000);
const SERVER_STOP_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_SERVER_STOP_TIMEOUT', 8000, 1000);
const SERVER_PROBE_TIMEOUT_MS = parseIntEnv('BOT_RUNNER_PROBE_TIMEOUT', 10000, 500);
const SCENARIO_TIMEOUT_MS = parseIntEnv(
    'BOT_RUNNER_SCENARIO_TIMEOUT',
    Math.max(
        45000,
        ROUNDS_PER_SCENARIO * (ROUND_START_TIMEOUT_MS + ROUND_ACTIVE_TIMEOUT_MS + MENU_TIMEOUT_MS + 4000)
    ),
    10000
);
const TOTAL_TIMEOUT_MS = parseIntEnv(
    'BOT_RUNNER_TOTAL_TIMEOUT',
    Math.max(180000, DEFAULT_SCENARIO_COUNT * SCENARIO_TIMEOUT_MS + 60000),
    60000
);
const SERVER_MODE = resolveServerMode(
    resolveFirstValue(CLI_ARGS, ['server-mode'], process.env.BOT_RUNNER_SERVER_MODE)
);
const HEADLESS = parseBoolOption(
    resolveFirstValue(CLI_ARGS, ['headless'], process.env.BOT_RUNNER_HEADLESS),
    false
);
const PREVIEW_BUILD_BEFORE_START = parseBoolOption(
    resolveFirstValue(CLI_ARGS, ['preview-build'], process.env.BOT_RUNNER_PREVIEW_BUILD),
    true
);
const GOTO_WAIT_UNTIL = resolveGotoWaitUntil(process.env.BOT_RUNNER_GOTO_WAIT_UNTIL);
const PUBLISH_EVIDENCE = parseBoolOption(
    resolveFirstValue(CLI_ARGS, ['publish-evidence'], process.env.BOT_RUNNER_PUBLISH_EVIDENCE),
    false
);
const REPORT_JSON_OVERRIDE = resolveFirstValue(
    CLI_ARGS,
    ['bot-validation-report', 'report-json'],
    process.env.BOT_RUNNER_REPORT_JSON
);
const REPORT_MD_OVERRIDE = resolveFirstValue(CLI_ARGS, ['report-md'], process.env.BOT_RUNNER_REPORT_MD);

function parseArgMap(argv) {
    const result = new Map();
    for (let i = 0; i < argv.length; i++) {
        const token = String(argv[i] || '');
        if (!token.startsWith('--')) continue;
        const trimmed = token.slice(2);
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex >= 0) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            if (key) result.set(key, value);
            continue;
        }
        const key = trimmed.trim();
        if (!key) continue;
        const next = argv[i + 1];
        if (typeof next === 'string' && !next.startsWith('--')) {
            result.set(key, next.trim());
            i += 1;
            continue;
        }
        result.set(key, 'true');
    }
    return result;
}

function resolveFirstValue(argMap, keys = [], envValue = '') {
    for (const key of keys) {
        const candidate = argMap?.get?.(key);
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }
    if (typeof envValue === 'string' && envValue.trim()) {
        return envValue.trim();
    }
    return '';
}

function parseBoolOption(value, fallback = false) {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
    return fallback;
}

function parseIntEnv(name, fallback, minValue = 1) {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minValue, parsed);
}

function parseBoolEnv(name, fallback = false) {
    const raw = process.env[name];
    if (!raw) return fallback;
    const normalized = String(raw).trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function normalizeOutputPath(rawValue, fallback) {
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    return value || fallback;
}

async function writeTextFile(targetPath, content) {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf8');
}

function resolveGotoWaitUntil(value) {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!raw) return 'commit';
    if (raw === 'commit' || raw === 'domcontentloaded' || raw === 'load' || raw === 'networkidle') {
        return raw;
    }
    return 'commit';
}

function resolveServerMode(value) {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (raw === 'preview') return 'preview';
    return 'dev';
}

function log(message, payload) {
    const stamp = new Date().toISOString();
    if (typeof payload === 'undefined') {
        console.log(`[bot-validation-runner ${stamp}] ${message}`);
        return;
    }
    console.log(`[bot-validation-runner ${stamp}] ${message} ${JSON.stringify(payload)}`);
}

function toShortError(error) {
    if (!error) return 'unknown';
    if (typeof error === 'string') return error;
    return error.message || String(error);
}

function appendTail(previous, chunk, maxLen = 7000) {
    return (previous + chunk).slice(-maxLen);
}

function createDeadline(label, timeoutMs) {
    const startedAt = Date.now();
    const deadlineAt = startedAt + timeoutMs;
    return {
        label,
        timeoutMs,
        startedAt,
        elapsedMs() {
            return Date.now() - startedAt;
        },
        remainingMs(phase = 'unknown') {
            const remaining = deadlineAt - Date.now();
            if (remaining <= 0) {
                throw new Error(`[${phase}] ${label} timeout after ${timeoutMs}ms`);
            }
            return remaining;
        },
    };
}

function resolveTimeout(limitMs, phase, deadlines = []) {
    let timeout = limitMs;
    for (const deadline of deadlines) {
        timeout = Math.min(timeout, deadline.remainingMs(phase));
    }
    return Math.max(1, timeout);
}

async function withTimeout(task, timeoutMs, phase) {
    let timer = null;
    try {
        return await Promise.race([
            Promise.resolve().then(task),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(`[${phase}] timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function sleep(ms) {
    await delay(ms);
}

async function fetchProbe(url, timeoutMs = SERVER_PROBE_TIMEOUT_MS) {
    return fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
    });
}

async function isServerReady(url) {
    try {
        const response = await fetchProbe(url);
        return !!response.ok;
    } catch {
        return false;
    }
}

async function waitForServer(url, serverHandle, timeoutMs) {
    const startedAt = Date.now();
    let lastError = null;
    while (Date.now() - startedAt < timeoutMs) {
        if (serverHandle?.child?.exitCode !== null) {
            const tails = serverHandle.getTails ? serverHandle.getTails() : { stdoutTail: '', stderrTail: '' };
            throw new Error(
                `Dev server exited before readiness (code=${serverHandle.child.exitCode})\n` +
                (tails.stdoutTail ? `stdout tail:\n${tails.stdoutTail}\n` : '') +
                (tails.stderrTail ? `stderr tail:\n${tails.stderrTail}` : '')
            );
        }
        try {
            const response = await fetchProbe(url);
            if (response.ok) return;
            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await sleep(300);
    }
    throw new Error(`Server not ready after ${timeoutMs}ms: ${url} (${toShortError(lastError)})`);
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

function killProcessTree(pid) {
    if (!pid || pid <= 0) return;
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            return;
        }
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    } catch {
        // no-op
    }
}

function startViteServer(mode = 'dev') {
    const viteBin = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
    const command = mode === 'preview' ? 'preview' : 'dev';
    const child = spawn(process.execPath, [viteBin, command, '--host', HOST, '--port', String(PORT), '--strictPort'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true,
    });

    let stdoutTail = '';
    let stderrTail = '';

    child.stdout?.on('data', (chunk) => {
        const text = String(chunk);
        stdoutTail = appendTail(stdoutTail, text);
        process.stdout.write(text);
    });
    child.stderr?.on('data', (chunk) => {
        const text = String(chunk);
        stderrTail = appendTail(stderrTail, text);
        process.stderr.write(text);
    });

    return {
        child,
        getTails() {
            return { stdoutTail, stderrTail };
        },
    };
}

async function waitForChildExit(child, timeoutMs) {
    if (!child) return true;
    if (child.exitCode !== null) return true;
    return new Promise((resolve) => {
        let finished = false;
        const finish = (result) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            child.off('exit', onExit);
            child.off('error', onError);
            resolve(result);
        };
        const onExit = () => finish(true);
        const onError = () => finish(true);
        const timer = setTimeout(() => finish(false), timeoutMs);
        child.once('exit', onExit);
        child.once('error', onError);
    });
}

async function stopServer(serverHandle) {
    const child = serverHandle?.child;
    if (!child) return;
    if (child.exitCode !== null) return;
    child.kill();
    const exited = await waitForChildExit(child, SERVER_STOP_TIMEOUT_MS);
    if (exited) return;
    log('Server did not stop gracefully, killing process tree', { pid: child.pid });
    killProcessTree(child.pid);
    await waitForChildExit(child, 2000);
}

async function safeClose(label, closer) {
    if (typeof closer !== 'function') return;
    try {
        await withTimeout(() => closer(), CLEANUP_TIMEOUT_MS, `cleanup:${label}`);
    } catch (error) {
        log(`Cleanup failed for ${label}`, { error: toShortError(error) });
    }
}

async function captureGameDiagnostics(page) {
    if (!page || page.isClosed()) {
        return { pageClosed: true };
    }
    try {
        return await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const players = Array.isArray(game?.entityManager?.players) ? game.entityManager.players : [];
            return {
                hasGameInstance: !!game,
                state: game?.state || null,
                roundPause: Number(game?.roundPause ?? 0),
                winsNeeded: Number(game?.winsNeeded ?? game?.settings?.winsNeeded ?? 0),
                roundsRecorded: Number(game?.recorder?.getRoundSummaries?.().length ?? 0),
                players: players.map((p) => ({
                    index: p?.index ?? null,
                    isBot: !!p?.isBot,
                    alive: !!p?.alive,
                    score: Number(p?.score ?? 0),
                })),
            };
        });
    } catch (error) {
        return { diagnosticsError: toShortError(error) };
    }
}

async function waitForGameInstance(page, timeoutMs, phase) {
    try {
        await page.waitForFunction(() => !!window.GAME_INSTANCE, null, { timeout: timeoutMs });
    } catch (error) {
        const diagnostics = await captureGameDiagnostics(page);
        throw new Error(`${toShortError(error)} | phase=${phase} | diagnostics=${JSON.stringify(diagnostics)}`);
    }
}

async function waitForGameState(page, expectedStates, timeoutMs, phase) {
    try {
        await page.waitForFunction((states) => states.includes(window.GAME_INSTANCE?.state), expectedStates, { timeout: timeoutMs });
    } catch (error) {
        const diagnostics = await captureGameDiagnostics(page);
        throw new Error(
            `${toShortError(error)} | phase=${phase} | expected=${expectedStates.join(' | ')} | diagnostics=${JSON.stringify(diagnostics)}`
        );
    }
}

async function evaluatePhase(page, phase, timeoutMs, pageFunction, arg) {
    try {
        return await withTimeout(() => page.evaluate(pageFunction, arg), timeoutMs, phase);
    } catch (error) {
        const diagnostics = await captureGameDiagnostics(page);
        throw new Error(`${toShortError(error)} | phase=${phase} | diagnostics=${JSON.stringify(diagnostics)}`);
    }
}

async function ensureMenuState(page, phasePrefix, deadlines) {
    const currentState = await evaluatePhase(
        page,
        `${phasePrefix}:read-state`,
        resolveTimeout(EVAL_TIMEOUT_MS, `${phasePrefix}:read-state`, deadlines),
        () => window.GAME_INSTANCE?.state || null
    );
    if (currentState === 'MENU') return;
    await evaluatePhase(
        page,
        `${phasePrefix}:force-menu`,
        resolveTimeout(EVAL_TIMEOUT_MS, `${phasePrefix}:force-menu`, deadlines),
        () => {
            const g = window.GAME_INSTANCE;
            if (!g) throw new Error('GAME_INSTANCE missing');
            if (typeof g._returnToMenu !== 'function') throw new Error('_returnToMenu missing');
            g._returnToMenu();
            return g.state;
        }
    );
    await waitForGameState(
        page,
        ['MENU'],
        resolveTimeout(MENU_TIMEOUT_MS, `${phasePrefix}:wait-menu`, deadlines),
        `${phasePrefix}:wait-menu`
    );
}

async function forceRoundEnd(page, phasePrefix, deadlines) {
    const forceResult = await evaluatePhase(
        page,
        `${phasePrefix}:force-round-end`,
        resolveTimeout(EVAL_TIMEOUT_MS, `${phasePrefix}:force-round-end`, deadlines),
        () => {
            const g = window.GAME_INSTANCE;
            if (!g) throw new Error('GAME_INSTANCE missing');
            if (typeof g._onRoundEnd !== 'function') throw new Error('_onRoundEnd missing');

            const players = Array.isArray(g?.entityManager?.players) ? g.entityManager.players : [];
            const alivePlayers = players.filter((player) => !!player?.alive);
            const forcedWinner = alivePlayers.find((player) => !!player?.isBot) || alivePlayers[0] || players[0] || null;

            g.winsNeeded = 1;
            if (g.settings) g.settings.winsNeeded = 1;
            if (typeof g._onSettingsChanged === 'function') {
                g._onSettingsChanged();
            }
            g._onRoundEnd(forcedWinner);
            return {
                forcedWinnerIndex: forcedWinner?.index ?? null,
                stateAfterForce: g.state,
            };
        }
    );

    await waitForGameState(
        page,
        ['ROUND_END', 'MATCH_END'],
        resolveTimeout(ROUND_FORCE_TIMEOUT_MS, `${phasePrefix}:wait-forced-end`, deadlines),
        `${phasePrefix}:wait-forced-end`
    );

    log(`${phasePrefix} forced round-end applied`, forceResult);
}

async function runRound(page, scenario, scenarioIndex, scenarioCount, roundIndex, deadlines, stats) {
    const roundNumber = roundIndex + 1;
    const roundLabel = `scenario=${scenario.id}(${scenarioIndex + 1}/${scenarioCount}) round=${roundNumber}/${ROUNDS_PER_SCENARIO}`;
    const roundStartedAt = Date.now();

    log(`${roundLabel} start`);
    await ensureMenuState(page, `${roundLabel}:prepare`, deadlines);

    await evaluatePhase(
        page,
        `${roundLabel}:start-match`,
        resolveTimeout(EVAL_TIMEOUT_MS, `${roundLabel}:start-match`, deadlines),
        () => {
            const g = window.GAME_INSTANCE;
            if (!g) throw new Error('GAME_INSTANCE missing');
            if (typeof g.startMatch !== 'function') throw new Error('startMatch missing');
            g.startMatch();
            return g.state;
        }
    );

    await waitForGameState(
        page,
        ['PLAYING', 'ROUND_END', 'MATCH_END'],
        resolveTimeout(ROUND_START_TIMEOUT_MS, `${roundLabel}:wait-playing`, deadlines),
        `${roundLabel}:wait-playing`
    );

    const stateAfterStart = await evaluatePhase(
        page,
        `${roundLabel}:read-state-after-start`,
        resolveTimeout(EVAL_TIMEOUT_MS, `${roundLabel}:read-state-after-start`, deadlines),
        () => window.GAME_INSTANCE?.state || null
    );

    let forced = false;
    if (stateAfterStart !== 'ROUND_END' && stateAfterStart !== 'MATCH_END') {
        try {
            await waitForGameState(
                page,
                ['ROUND_END', 'MATCH_END'],
                resolveTimeout(ROUND_ACTIVE_TIMEOUT_MS, `${roundLabel}:wait-round-end`, deadlines),
                `${roundLabel}:wait-round-end`
            );
        } catch (error) {
            forced = true;
            stats.timeoutRounds += 1;
            log(`${roundLabel} active phase timeout, forcing round-end`, { error: toShortError(error) });
            await forceRoundEnd(page, roundLabel, deadlines);
        }
    } else {
        log(`${roundLabel} finished before active wait`, { stateAfterStart });
    }

    await evaluatePhase(
        page,
        `${roundLabel}:return-menu`,
        resolveTimeout(EVAL_TIMEOUT_MS, `${roundLabel}:return-menu`, deadlines),
        () => {
            const g = window.GAME_INSTANCE;
            if (!g) throw new Error('GAME_INSTANCE missing');
            if (typeof g._returnToMenu !== 'function') throw new Error('_returnToMenu missing');
            g._returnToMenu();
            return g.state;
        }
    );

    await waitForGameState(
        page,
        ['MENU'],
        resolveTimeout(MENU_TIMEOUT_MS, `${roundLabel}:wait-menu`, deadlines),
        `${roundLabel}:wait-menu`
    );

    if (forced) {
        stats.forcedRounds += 1;
    }
    log(`${roundLabel} done`, {
        forced,
        durationMs: Date.now() - roundStartedAt,
    });
}

function sumBy(items, selector) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += Number(selector(items[i])) || 0;
    }
    return total;
}

function buildScenarioMetrics(rounds) {
    const played = rounds.length;
    const totalDuration = sumBy(rounds, (r) => r.duration);
    const botWins = rounds.filter((r) => !!r.winnerIsBot).length;
    const stuckEvents = sumBy(rounds, (r) => r.stuckEvents);
    const wallHits = sumBy(rounds, (r) => r.bounceWallEvents);
    const trailHits = sumBy(rounds, (r) => r.bounceTrailEvents);
    const avgBotSurvival = played > 0 ? sumBy(rounds, (r) => r.botSurvivalAverage) / played : 0;
    const stuckPerMinute = totalDuration > 0 ? stuckEvents / (totalDuration / 60) : 0;
    return {
        rounds: played,
        botWinRate: played > 0 ? botWins / played : 0,
        stuckEvents,
        wallHits,
        trailHits,
        averageBotSurvival: avgBotSurvival,
        stuckPerMinute,
        totalDuration,
    };
}

function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function formatSeconds(value) {
    return `${Number(value || 0).toFixed(2)}s`;
}

function formatNumber(value) {
    return Number(value || 0).toFixed(2);
}

function buildMarkdownReport({ generatedAt, roundsPerScenario, scenarioResults, overall }) {
    const lines = [];
    lines.push(`# Bot-Validation Telemetrie (${generatedAt})`);
    lines.push('');
    lines.push(`- Runden pro Szenario: ${roundsPerScenario}`);
    lines.push(`- Gesamtrunden: ${overall.rounds}`);
    lines.push(`- Gesamt-Winrate Bots: ${formatPercent(overall.botWinRate)}`);
    lines.push(`- Gesamt-Stuck-Events: ${overall.stuckEvents}`);
    lines.push(`- Gesamt-Wandtreffer (Bounce Wall): ${overall.wallHits}`);
    lines.push(`- Gesamt-Durchschnitt Bot-Ueberlebenszeit: ${formatSeconds(overall.averageBotSurvival)}`);
    lines.push(`- Gesamt-Stuck/Minute: ${formatNumber(overall.stuckPerMinute)}`);
    lines.push('');
    lines.push('| Szenario | Runden | Bot-Winrate | Stuck | Wandtreffer | Trailtreffer | Avg Survival | Stuck/Minute |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const result of scenarioResults) {
        const m = result.metrics;
        lines.push(`| ${result.scenario.id} (${result.scenario.mapKey}) | ${m.rounds} | ${formatPercent(m.botWinRate)} | ${m.stuckEvents} | ${m.wallHits} | ${m.trailHits} | ${formatSeconds(m.averageBotSurvival)} | ${formatNumber(m.stuckPerMinute)} |`);
    }
    lines.push('');
    return lines.join('\n');
}

async function run() {
    const runDeadline = createDeadline('total-run', TOTAL_TIMEOUT_MS);
    const hardStopTimer = setTimeout(() => {
        console.error(`[bot-validation-runner] hard timeout after ${TOTAL_TIMEOUT_MS}ms - forcing exit`);
        process.exit(1);
    }, TOTAL_TIMEOUT_MS + 15000);
    hardStopTimer.unref();

    if (FORCE_KILL_PORT) {
        forceKillPort(PORT);
    }
    let serverHandle = null;
    let browser = null;
    let context = null;
    let page = null;
    try {
        log('Runner config', {
            baseUrl: BASE_URL,
            forceKillPort: FORCE_KILL_PORT,
            serverMode: SERVER_MODE,
            headless: HEADLESS,
            previewBuildBeforeStart: PREVIEW_BUILD_BEFORE_START,
            roundsPerScenario: ROUNDS_PER_SCENARIO,
            forcedRoundPolicy: {
                failOnForcedRound: FAIL_ON_FORCED_ROUND,
                maxForcedRounds: MAX_FORCED_ROUNDS,
            },
            timeoutsMs: {
                serverReady: SERVER_READY_TIMEOUT_MS,
                serverProbe: SERVER_PROBE_TIMEOUT_MS,
                appReady: APP_READY_TIMEOUT_MS,
                navigation: NAVIGATION_TIMEOUT_MS,
                roundStart: ROUND_START_TIMEOUT_MS,
                roundActive: ROUND_ACTIVE_TIMEOUT_MS,
                forceRound: ROUND_FORCE_TIMEOUT_MS,
                menu: MENU_TIMEOUT_MS,
                scenario: SCENARIO_TIMEOUT_MS,
                total: TOTAL_TIMEOUT_MS,
            },
            gotoWaitUntil: GOTO_WAIT_UNTIL,
        });

        const serverAlreadyRunning = await isServerReady(BASE_URL);
        if (!serverAlreadyRunning) {
            if (SERVER_MODE === 'preview' && PREVIEW_BUILD_BEFORE_START) {
                log('Building app before preview server start');
                execSync('npm run build', { stdio: 'inherit' });
            }
            log(`Starting Vite ${SERVER_MODE} server`, { baseUrl: BASE_URL });
            serverHandle = startViteServer(SERVER_MODE);
            await waitForServer(
                BASE_URL,
                serverHandle,
                resolveTimeout(SERVER_READY_TIMEOUT_MS, 'server:start', [runDeadline])
            );
            log(`${SERVER_MODE} server ready`);
        } else {
            log('Reusing existing server', { baseUrl: BASE_URL, requestedServerMode: SERVER_MODE });
        }

        browser = await withTimeout(
            () => chromium.launch({ headless: HEADLESS }),
            resolveTimeout(APP_READY_TIMEOUT_MS, 'browser:launch', [runDeadline]),
            'browser:launch'
        );
        context = await withTimeout(
            () => browser.newContext(),
            resolveTimeout(APP_READY_TIMEOUT_MS, 'browser:new-context', [runDeadline]),
            'browser:new-context'
        );
        page = await withTimeout(
            () => context.newPage(),
            resolveTimeout(APP_READY_TIMEOUT_MS, 'browser:new-page', [runDeadline]),
            'browser:new-page'
        );
        const appReadyTimeoutMs = resolveTimeout(APP_READY_TIMEOUT_MS, 'app:bootstrap', [runDeadline]);
        const navigationTimeoutMs = resolveTimeout(NAVIGATION_TIMEOUT_MS, 'page:navigation', [runDeadline]);
        page.setDefaultTimeout(appReadyTimeoutMs);
        page.setDefaultNavigationTimeout(navigationTimeoutMs);

        await withTimeout(
            () => page.goto(BASE_URL, { waitUntil: GOTO_WAIT_UNTIL, timeout: navigationTimeoutMs }),
            navigationTimeoutMs,
            'page:goto'
        );
        await waitForGameInstance(
            page,
            resolveTimeout(APP_READY_TIMEOUT_MS, 'app:game-instance', [runDeadline]),
            'app:game-instance'
        );
        await waitForGameState(
            page,
            ['MENU'],
            resolveTimeout(APP_READY_TIMEOUT_MS, 'app:menu-ready', [runDeadline]),
            'app:menu-ready'
        );

        await evaluatePhase(
            page,
            'setup:reset-recorder',
            resolveTimeout(EVAL_TIMEOUT_MS, 'setup:reset-recorder', [runDeadline]),
            () => {
                const g = window.GAME_INSTANCE;
                if (!g?.recorder?.resetAggregateMetrics) throw new Error('recorder.resetAggregateMetrics missing');
                g.recorder.resetAggregateMetrics();
                return true;
            }
        );

        const scenarioMatrix = await evaluatePhase(
            page,
            'setup:get-scenarios',
            resolveTimeout(EVAL_TIMEOUT_MS, 'setup:get-scenarios', [runDeadline]),
            () => {
                const g = window.GAME_INSTANCE;
                if (!g?.getBotValidationMatrix) throw new Error('getBotValidationMatrix missing');
                return g.getBotValidationMatrix();
            }
        );
        if (!Array.isArray(scenarioMatrix) || scenarioMatrix.length === 0) {
            throw new Error('No bot validation scenarios available');
        }
        const scenarioLimit = Math.max(1, DEFAULT_SCENARIO_COUNT);
        const scenarios = scenarioMatrix.slice(0, scenarioLimit);
        log('Loaded validation matrix', {
            availableScenarios: scenarioMatrix.length,
            selectedScenarios: scenarios.length,
            scenarioLimit,
        });

        const scenarioResults = [];
        const runnerStats = {
            forcedRounds: 0,
            timeoutRounds: 0,
        };

        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];
            const scenarioDeadline = createDeadline(`scenario:${scenario?.id || i}`, SCENARIO_TIMEOUT_MS);
            const localStats = {
                forcedRounds: 0,
                timeoutRounds: 0,
            };
            const scenarioLabel = `scenario=${scenario.id}(${i + 1}/${scenarios.length})`;
            log(`${scenarioLabel} start`, { mapKey: scenario.mapKey, mode: scenario.mode, bots: scenario.bots });

            const startCount = await evaluatePhase(
                page,
                `${scenarioLabel}:read-start-count`,
                resolveTimeout(EVAL_TIMEOUT_MS, `${scenarioLabel}:read-start-count`, [runDeadline, scenarioDeadline]),
                () => {
                    const recorder = window.GAME_INSTANCE?.recorder;
                    if (!recorder?.getRoundSummaries) throw new Error('recorder.getRoundSummaries missing');
                    return recorder.getRoundSummaries().length;
                }
            );

            await evaluatePhase(
                page,
                `${scenarioLabel}:apply`,
                resolveTimeout(EVAL_TIMEOUT_MS, `${scenarioLabel}:apply`, [runDeadline, scenarioDeadline]),
                (index) => {
                    const g = window.GAME_INSTANCE;
                    if (!g) throw new Error('GAME_INSTANCE missing');
                    if (typeof g.applyBotValidationScenario !== 'function') throw new Error('applyBotValidationScenario missing');
                    const applied = g.applyBotValidationScenario(index);
                    g.winsNeeded = 1;
                    if (g.settings) g.settings.winsNeeded = 1;
                    if (typeof g._onSettingsChanged === 'function') {
                        g._onSettingsChanged();
                    }
                    return {
                        appliedId: applied?.id || null,
                        state: g.state,
                    };
                },
                i
            );

            await ensureMenuState(page, `${scenarioLabel}:post-apply`, [runDeadline, scenarioDeadline]);

            for (let round = 0; round < ROUNDS_PER_SCENARIO; round++) {
                await runRound(
                    page,
                    scenario,
                    i,
                    scenarios.length,
                    round,
                    [runDeadline, scenarioDeadline],
                    localStats
                );
            }

            const scenarioRounds = await evaluatePhase(
                page,
                `${scenarioLabel}:collect-rounds`,
                resolveTimeout(EVAL_TIMEOUT_MS, `${scenarioLabel}:collect-rounds`, [runDeadline, scenarioDeadline]),
                (count) => {
                    const recorder = window.GAME_INSTANCE?.recorder;
                    if (!recorder?.getRoundSummaries) throw new Error('recorder.getRoundSummaries missing');
                    const all = recorder.getRoundSummaries();
                    return all.slice(count);
                },
                startCount
            );

            runnerStats.forcedRounds += localStats.forcedRounds;
            runnerStats.timeoutRounds += localStats.timeoutRounds;

            const metrics = buildScenarioMetrics(scenarioRounds);
            scenarioResults.push({
                scenario,
                metrics,
                runner: {
                    forcedRounds: localStats.forcedRounds,
                    timeoutRounds: localStats.timeoutRounds,
                    elapsedMs: scenarioDeadline.elapsedMs(),
                },
            });

            log(`${scenarioLabel} done`, {
                rounds: metrics.rounds,
                forcedRounds: localStats.forcedRounds,
                timeoutRounds: localStats.timeoutRounds,
                elapsedMs: scenarioDeadline.elapsedMs(),
            });
        }

        const allRounds = await evaluatePhase(
            page,
            'finalize:all-rounds',
            resolveTimeout(EVAL_TIMEOUT_MS, 'finalize:all-rounds', [runDeadline]),
            () => {
                const recorder = window.GAME_INSTANCE?.recorder;
                if (!recorder?.getRoundSummaries) throw new Error('recorder.getRoundSummaries missing');
                return recorder.getRoundSummaries();
            }
        );
        const overall = buildScenarioMetrics(allRounds);
        const generatedAt = new Date().toISOString().slice(0, 10);
        const report = {
            generatedAt,
            baseUrl: BASE_URL,
            roundsPerScenario: ROUNDS_PER_SCENARIO,
            scenarios: scenarioResults,
            overall,
            runner: {
                forcedRounds: runnerStats.forcedRounds,
                timeoutRounds: runnerStats.timeoutRounds,
                failOnForcedRound: FAIL_ON_FORCED_ROUND,
                maxForcedRounds: MAX_FORCED_ROUNDS,
            },
        };

        const canonicalJsonPath = 'data/bot_validation_report.json';
        const canonicalMdPath = `docs/tests/Testergebnisse_Phase4b_${generatedAt}.md`;
        const jsonPath = normalizeOutputPath(REPORT_JSON_OVERRIDE, 'tmp/bot-validation-report.json');
        const mdPath = normalizeOutputPath(REPORT_MD_OVERRIDE, `tmp/Testergebnisse_Phase4b_${generatedAt}.md`);
        const markdownReport = buildMarkdownReport({
            generatedAt,
            roundsPerScenario: ROUNDS_PER_SCENARIO,
            scenarioResults,
            overall,
        });

        const writtenPaths = [];
        await writeTextFile(jsonPath, JSON.stringify(report, null, 2));
        writtenPaths.push(jsonPath);
        await writeTextFile(mdPath, markdownReport);
        writtenPaths.push(mdPath);

        if (PUBLISH_EVIDENCE) {
            if (jsonPath !== canonicalJsonPath) {
                await writeTextFile(canonicalJsonPath, JSON.stringify(report, null, 2));
                writtenPaths.push(canonicalJsonPath);
            }
            if (mdPath !== canonicalMdPath) {
                await writeTextFile(canonicalMdPath, markdownReport);
                writtenPaths.push(canonicalMdPath);
            }
        }

        const forcedRoundRatio = overall.rounds > 0 ? runnerStats.forcedRounds / overall.rounds : 0;
        log('Runner round-end summary', {
            rounds: overall.rounds,
            forcedRounds: runnerStats.forcedRounds,
            timeoutRounds: runnerStats.timeoutRounds,
            forcedRoundRatio: Number(forcedRoundRatio.toFixed(3)),
        });

        const policyErrors = [];
        if (FAIL_ON_FORCED_ROUND && runnerStats.forcedRounds > 0) {
            policyErrors.push(
                `forced rounds encountered (${runnerStats.forcedRounds}) with BOT_RUNNER_FAIL_ON_FORCED_ROUND=true`
            );
        }
        if (runnerStats.forcedRounds > MAX_FORCED_ROUNDS) {
            policyErrors.push(`forced rounds ${runnerStats.forcedRounds} exceeded BOT_RUNNER_MAX_FORCED_ROUNDS=${MAX_FORCED_ROUNDS}`);
        }
        if (policyErrors.length > 0) {
            throw new Error(`[forced-round-policy] ${policyErrors.join('; ')}`);
        }

        console.log('\nBOT_VALIDATION_RESULT');
        console.log(JSON.stringify(report, null, 2));
        for (const targetPath of writtenPaths) {
            console.log(`\nWrote: ${targetPath}`);
        }
        if (!PUBLISH_EVIDENCE) {
            console.log('Evidence publish skipped (set --publish-evidence true to write data/docs reports).');
        }
        log('Runner finished successfully', {
            elapsedMs: runDeadline.elapsedMs(),
            forcedRounds: runnerStats.forcedRounds,
            timeoutRounds: runnerStats.timeoutRounds,
        });
    } finally {
        clearTimeout(hardStopTimer);
        await safeClose('page', () => page?.close());
        await safeClose('context', () => context?.close());
        await safeClose('browser', () => browser?.close());
        await stopServer(serverHandle);
        if (FORCE_KILL_PORT) {
            forceKillPort(PORT);
        }
    }
}

run()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('[bot-validation-runner] failed:', error?.stack || toShortError(error));
        process.exit(1);
    });

