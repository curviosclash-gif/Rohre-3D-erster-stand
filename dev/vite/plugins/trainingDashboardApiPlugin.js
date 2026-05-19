import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';

import { createTrainingLogBuffer } from '../../training/trainingLogBuffer.js';
import { buildTrainingSpawnCommand } from '../../training/trainingSpawnArgs.js';
import {
    createPreviewLocalArtifactDisabledResponse,
    createPreviewLocalMutationDisabledResponse,
    shouldBlockPreviewLocalArtifactRead,
    shouldBlockPreviewLocalMutation,
} from '../previewLocalApiGuard.js';

export const TRAINING_DASHBOARD_API_PLUGIN_NAME = 'training-dashboard-api';

function createJsonResponse(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

function readRequestBody(req, maxBytes = 5 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let total = 0;
        const chunks = [];

        req.on('data', (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                reject(new Error('Request body too large.'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf-8'));
        });

        req.on('error', reject);
    });
}

function safeReadJson(filePath) {
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
        return null;
    }
}

function maybeBlockPreviewLocalMutation({ isPreviewServer = false, reqPath = '', res } = {}) {
    if (!shouldBlockPreviewLocalMutation({ isPreviewServer })) return false;
    const response = createPreviewLocalMutationDisabledResponse({ route: reqPath });
    createJsonResponse(res, response.statusCode, response.payload);
    return true;
}

function maybeBlockPreviewLocalArtifactRead({ isPreviewServer = false, method = 'GET', reqPath = '', res } = {}) {
    if (!shouldBlockPreviewLocalArtifactRead({ isPreviewServer, method, route: reqPath })) return false;
    const response = createPreviewLocalArtifactDisabledResponse({ route: reqPath });
    createJsonResponse(res, response.statusCode, response.payload);
    return true;
}

export function createTrainingDashboardApiPlugin({ rootDir = process.cwd(), env = process.env } = {}) {
    const projectRoot = path.resolve(rootDir);
    const TRAINING_RUNS_DIR = path.resolve(projectRoot, 'data', 'training', 'runs');
    const SCHEDULE_CONFIG_PATH = path.resolve(projectRoot, 'data', 'training', 'schedule.json');

    let trainingProcess = null;
    let wsClients = new Set();
    let scheduledTimer = null;
    let scheduledConfig = null;

    function broadcast(msg) {
        const json = JSON.stringify(msg);
        for (const ws of wsClients) {
            try { ws.send(json); } catch { /* ignore */ }
        }
    }

    function appendOutputLine(source, text) {
        if (!trainingProcess) return;
        const entries = trainingProcess.outputBuffer.append(source, text);
        for (const entry of entries) {
            broadcast({ type: 'line', ...entry });
        }
    }

    function spawnTraining(config, onExit) {
        const spawnCommand = buildTrainingSpawnCommand(config);

        const child = spawn(spawnCommand.command, spawnCommand.args, {
            shell: spawnCommand.shell,
            cwd: projectRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...env },
        });

        child.stdout?.on('data', (data) => appendOutputLine('stdout', data.toString()));
        child.stderr?.on('data', (data) => appendOutputLine('stderr', data.toString()));
        child.on('exit', (code) => {
            const exitCode = Number.isInteger(code) ? code : 1;
            if (trainingProcess && trainingProcess.child === child) {
                trainingProcess.exitCode = exitCode;
                broadcast({ type: 'done', exitCode, mode: trainingProcess.mode });
            }
            if (typeof onExit === 'function') onExit(exitCode);
        });
        child.on('error', (err) => {
            appendOutputLine('stderr', `[spawn error] ${err.message}`);
            if (trainingProcess && trainingProcess.child === child) {
                trainingProcess.exitCode = 1;
                broadcast({ type: 'done', exitCode: 1, mode: trainingProcess.mode });
            }
            if (typeof onExit === 'function') onExit(1);
        });

        return child;
    }

    function createCurriculumStageConfig(stage, stageIdx) {
        return {
            episodes: stage.episodes ?? 20,
            modes: stage.modes || 'classic-3d',
            maxSteps: stage.maxSteps ?? '',
            resumeCheckpoint: stageIdx > 0 ? 'latest' : (stage.resumeCheckpoint || ''),
        };
    }

    function validateTrainingConfig(config) {
        buildTrainingSpawnCommand(config);
    }

    function getTrainingRequestErrorStatus(error) {
        if (error instanceof SyntaxError) return 400;
        if (error instanceof TypeError) return 422;
        return 500;
    }

    function startSingle(config) {
        trainingProcess = {
            child: null, startedAt: Date.now(), outputBuffer: createTrainingLogBuffer(), exitCode: null,
            pid: null, mode: 'single', config, shouldContinue: true, loopIteration: 0,
            curriculumStage: null, curriculumIndex: 0, curriculumTotal: 0,
        };
        const child = spawnTraining(config, () => {
            broadcast({ type: 'status', running: false, mode: 'single', exitCode: trainingProcess?.exitCode });
        });
        trainingProcess.child = child;
        trainingProcess.pid = child.pid;
        broadcast({ type: 'status', running: true, mode: 'single' });
    }

    function startLoop(config) {
        trainingProcess = {
            child: null, startedAt: Date.now(), outputBuffer: createTrainingLogBuffer(), exitCode: null,
            pid: null, mode: 'loop', config, shouldContinue: true, loopIteration: 1,
            curriculumStage: null, curriculumIndex: 0, curriculumTotal: 0,
        };

        function launchIteration() {
            const iterConfig = trainingProcess.loopIteration > 1
                ? { ...config, resumeCheckpoint: 'latest' }
                : config;
            appendOutputLine('system', `--- Loop Iteration ${trainingProcess.loopIteration} ---`);
            broadcast({ type: 'loop-restart', iteration: trainingProcess.loopIteration });

            const child = spawnTraining(iterConfig, (exitCode) => {
                if (exitCode === 0 && trainingProcess?.shouldContinue) {
                    trainingProcess.loopIteration++;
                    trainingProcess.exitCode = null;
                    launchIteration();
                } else {
                    broadcast({ type: 'status', running: false, mode: 'loop', exitCode });
                }
            });
            trainingProcess.child = child;
            trainingProcess.pid = child.pid;
        }

        broadcast({ type: 'status', running: true, mode: 'loop' });
        launchIteration();
    }

    function startCurriculum(stages) {
        trainingProcess = {
            child: null, startedAt: Date.now(), outputBuffer: createTrainingLogBuffer(), exitCode: null,
            pid: null, mode: 'curriculum', config: {}, shouldContinue: true, loopIteration: 0,
            curriculumStage: null, curriculumIndex: 0, curriculumTotal: stages.length,
        };

        let stageIdx = 0;
        function runNextStage() {
            if (stageIdx >= stages.length || !trainingProcess?.shouldContinue) {
                broadcast({ type: 'status', running: false, mode: 'curriculum', exitCode: trainingProcess?.exitCode ?? 0 });
                return;
            }
            const stage = stages[stageIdx];
            trainingProcess.curriculumStage = stage.name || `stage-${stageIdx + 1}`;
            trainingProcess.curriculumIndex = stageIdx;
            appendOutputLine('system', `--- Curriculum Stage ${stageIdx + 1}/${stages.length}: ${stage.name || 'unnamed'} ---`);
            broadcast({ type: 'curriculum-stage', stage: stage.name, index: stageIdx, total: stages.length });

            const stageConfig = createCurriculumStageConfig(stage, stageIdx);

            const child = spawnTraining(stageConfig, (exitCode) => {
                if (exitCode === 0 && trainingProcess?.shouldContinue) {
                    stageIdx++;
                    runNextStage();
                } else {
                    trainingProcess.exitCode = exitCode;
                    broadcast({ type: 'status', running: false, mode: 'curriculum', exitCode });
                }
            });
            trainingProcess.child = child;
            trainingProcess.pid = child.pid;
        }

        broadcast({ type: 'status', running: true, mode: 'curriculum' });
        runNextStage();
    }

    function isRunning() {
        return trainingProcess && trainingProcess.child && trainingProcess.exitCode === null;
    }

    function loadRunArtifacts(runDir) {
        const run = safeReadJson(path.resolve(runDir, 'run.json'));
        const evalData = safeReadJson(path.resolve(runDir, 'eval.json'));
        const gate = safeReadJson(path.resolve(runDir, 'gate.json'));
        const trainer = safeReadJson(path.resolve(runDir, 'trainer.json'));
        return { run, eval: evalData, gate, trainer };
    }

    function resolveStatusPayload(stampFilter) {
        const latestPath = path.resolve(TRAINING_RUNS_DIR, 'latest.json');
        const latest = safeReadJson(latestPath);
        if (!latest) return { ok: true, stamp: null, run: null, eval: null, gate: null, trainer: null, checkpoint: null, training: getTrainingState() };

        const stamp = stampFilter || latest.stamp;
        const runDir = path.resolve(TRAINING_RUNS_DIR, stamp);
        const artifacts = loadRunArtifacts(runDir);

        const checkpointPath = latest?.artifacts?.checkpoint?.path;
        const checkpointExists = checkpointPath ? existsSync(path.resolve(projectRoot, checkpointPath)) : false;
        const checkpointRaw = checkpointExists ? safeReadJson(path.resolve(projectRoot, checkpointPath)) : null;
        const hasData = !!(checkpointRaw?.checkpoint && typeof checkpointRaw.checkpoint === 'object')
            || checkpointRaw?.contractVersion === 'v35-dqn-checkpoint-v1'
            || checkpointRaw?.contractVersion === 'v34-dqn-checkpoint-v1';

        let runPayload = null;
        if (artifacts.run) {
            runPayload = {
                kpis: artifacts.run.summary?.kpis || null,
                totals: {
                    episodesTotal: artifacts.run.summary?.episodesTotal ?? 0,
                    stepsTotal: artifacts.run.summary?.stepsTotal ?? 0,
                    elapsedMs: artifacts.run.summary?.elapsedMs ?? 0,
                },
                episodes: artifacts.run.summary?.episodes || [],
            };
        }

        let evalPayload = null;
        if (artifacts.eval) {
            const episodes = artifacts.eval.summary?.episodes || artifacts.eval.episodes || [];
            const domains = {};
            for (const ep of episodes) {
                const d = ep.domainId || 'unknown';
                if (!domains[d]) domains[d] = { count: 0, totalReturn: 0, wins: 0 };
                domains[d].count++;
                domains[d].totalReturn += ep.episodeReturn || 0;
                if (ep.done && ep.terminalReason?.includes?.('win')) domains[d].wins++;
            }
            const domainSummary = {};
            for (const [d, v] of Object.entries(domains)) {
                domainSummary[d] = { count: v.count, avgReturn: v.count > 0 ? v.totalReturn / v.count : 0, winRate: v.count > 0 ? v.wins / v.count : 0 };
            }
            evalPayload = { domains: domainSummary, episodes };
        }

        let gatePayload = null;
        if (artifacts.gate) {
            gatePayload = {
                status: artifacts.gate.passed === true ? 'pass' : artifacts.gate.passed === false ? 'fail' : 'unknown',
                checks: artifacts.gate.checks || artifacts.gate.criteria || [],
            };
        }

        let trainerPayload = null;
        if (artifacts.trainer) {
            const eps = artifacts.trainer.episodes || [];
            const lastEp = eps.length > 0 ? eps[eps.length - 1] : {};
            trainerPayload = {
                episodeCount: eps.length,
                latestEpsilon: lastEp.epsilon ?? null,
                latestReplayFill: lastEp.replayFill ?? null,
                latestLoss: lastEp.avgLoss ?? null,
            };
        }

        return {
            ok: true,
            stamp,
            generatedAt: latest.generatedAt,
            lastCompletedStage: latest.lastCompletedStage,
            run: runPayload,
            eval: evalPayload,
            gate: gatePayload,
            trainer: trainerPayload,
            checkpoint: { exists: checkpointExists, hasData, path: checkpointPath || null },
            training: getTrainingState(),
        };
    }

    function getTrainingState() {
        if (!trainingProcess) return { running: false, pid: null, mode: null, loopIteration: 0, exitCode: null };
        return {
            running: isRunning(),
            pid: trainingProcess.pid,
            mode: trainingProcess.mode,
            loopIteration: trainingProcess.loopIteration,
            exitCode: trainingProcess.exitCode,
            startedAt: trainingProcess.startedAt,
            elapsedMs: trainingProcess.startedAt ? Date.now() - trainingProcess.startedAt : 0,
            curriculumStage: trainingProcess.curriculumStage,
            curriculumIndex: trainingProcess.curriculumIndex,
            curriculumTotal: trainingProcess.curriculumTotal,
        };
    }

    function resolveHistory() {
        if (!existsSync(TRAINING_RUNS_DIR)) return { ok: true, runs: [] };
        const dirs = readdirSync(TRAINING_RUNS_DIR).filter(d => /^\d{8}T\d{6}Z$/.test(d)).sort().reverse();
        const runs = [];
        for (const stamp of dirs.slice(0, 50)) {
            const runJson = safeReadJson(path.resolve(TRAINING_RUNS_DIR, stamp, 'run.json'));
            const gateJson = safeReadJson(path.resolve(TRAINING_RUNS_DIR, stamp, 'gate.json'));
            runs.push({
                stamp,
                kpis: runJson?.summary?.kpis || null,
                episodes: runJson?.summary?.episodesTotal ?? 0,
                avgReturn: runJson?.summary?.kpis?.episodeReturnMean ?? null,
                gateStatus: gateJson?.passed === true ? 'pass' : gateJson?.passed === false ? 'fail' : null,
            });
        }
        return { ok: true, runs };
    }

    function loadScheduleConfig() {
        const raw = safeReadJson(SCHEDULE_CONFIG_PATH);
        if (raw && raw.enabled) {
            scheduledConfig = { enabled: true, intervalHours: raw.intervalHours || 6, config: raw.config || {} };
        }
    }

    function saveScheduleConfig() {
        if (!scheduledConfig) return;
        mkdirSync(path.dirname(SCHEDULE_CONFIG_PATH), { recursive: true });
        writeFileSync(SCHEDULE_CONFIG_PATH, JSON.stringify(scheduledConfig, null, 2), 'utf-8');
    }

    function setupScheduledTimer() {
        if (scheduledTimer) { clearInterval(scheduledTimer); scheduledTimer = null; }
        if (!scheduledConfig?.enabled) return;
        const ms = (scheduledConfig.intervalHours || 6) * 3600000;
        scheduledTimer = setInterval(() => {
            if (!isRunning()) startSingle(scheduledConfig.config || {});
        }, ms);
    }

    const registerMiddleware = (middlewares, { isPreviewServer = false } = {}) => {
        middlewares.use(async (req, res, next) => {
            const reqPath = String(req.url || '').split('?')[0];
            const urlParams = new URL(req.url || '', 'http://localhost').searchParams;
            const isTrainingMutation = req.method === 'POST'
                && ['/api/training/start', '/api/training/stop', '/api/training/schedule'].includes(reqPath);
            const isTrainingReadOnly = req.method === 'GET'
                && ['/api/training/status', '/api/training/history', '/api/training/progress'].includes(reqPath);

            if (isTrainingMutation && maybeBlockPreviewLocalMutation({ isPreviewServer, reqPath, res })) {
                return;
            }
            if (isTrainingReadOnly && maybeBlockPreviewLocalArtifactRead({ isPreviewServer, method: req.method, reqPath, res })) {
                return;
            }

            if (req.method === 'GET' && reqPath === '/api/training/status') {
                const stamp = urlParams.get('stamp') || null;
                createJsonResponse(res, 200, resolveStatusPayload(stamp));
                return;
            }

            if (req.method === 'GET' && reqPath === '/api/training/history') {
                createJsonResponse(res, 200, resolveHistory());
                return;
            }

            if (req.method === 'GET' && reqPath === '/api/training/progress') {
                const since = parseInt(urlParams.get('since') || '0', 10) || 0;
                const lines = trainingProcess ? trainingProcess.outputBuffer.getLinesSince(since) : [];
                createJsonResponse(res, 200, {
                    ok: true,
                    ...getTrainingState(),
                    lines,
                    totalLines: trainingProcess ? trainingProcess.outputBuffer.totalLines : 0,
                    retainedLines: trainingProcess ? trainingProcess.outputBuffer.retainedLines : 0,
                });
                return;
            }

            if (req.method === 'POST' && reqPath === '/api/training/start') {
                if (isRunning()) {
                    createJsonResponse(res, 409, { ok: false, error: 'already-running', pid: trainingProcess.pid });
                    return;
                }
                try {
                    const rawBody = await readRequestBody(req);
                    const body = JSON.parse(rawBody || '{}');
                    const mode = String(body.mode || 'single').toLowerCase();

                    if (mode === 'loop') {
                        validateTrainingConfig(body);
                        startLoop(body);
                    } else if (mode === 'curriculum') {
                        const stages = Array.isArray(body.curriculum) ? body.curriculum : [
                            { name: 'Navigate', episodes: 20, modes: 'classic-3d', maxSteps: 5000 },
                            { name: 'Combat', episodes: 20, modes: 'classic-3d,hunt-3d', maxSteps: 10000 },
                            { name: 'Full', episodes: 20, modes: 'classic-3d,classic-2d,hunt-3d,hunt-2d', maxSteps: 15000 },
                        ];
                        stages.forEach((stage, stageIdx) => validateTrainingConfig(createCurriculumStageConfig(stage, stageIdx)));
                        startCurriculum(stages);
                    } else {
                        validateTrainingConfig(body);
                        startSingle(body);
                    }
                    createJsonResponse(res, 200, { ok: true, pid: trainingProcess.pid, mode: trainingProcess.mode });
                } catch (err) {
                    createJsonResponse(res, getTrainingRequestErrorStatus(err), { ok: false, error: err.message });
                }
                return;
            }

            if (req.method === 'POST' && reqPath === '/api/training/stop') {
                if (!trainingProcess || !isRunning()) {
                    createJsonResponse(res, 200, { ok: true, message: 'not-running' });
                    return;
                }
                trainingProcess.shouldContinue = false;
                try { trainingProcess.child.kill(); } catch { /* ignore */ }
                appendOutputLine('system', '--- Training stopped by user ---');
                createJsonResponse(res, 200, { ok: true });
                return;
            }

            if (req.method === 'POST' && reqPath === '/api/training/schedule') {
                try {
                    const rawBody = await readRequestBody(req);
                    const body = JSON.parse(rawBody || '{}');
                    scheduledConfig = {
                        enabled: !!body.enabled,
                        intervalHours: Math.max(0.01, Number(body.intervalHours) || 6),
                        config: body.config || {},
                    };
                    saveScheduleConfig();
                    setupScheduledTimer();
                    createJsonResponse(res, 200, {
                        ok: true,
                        scheduled: {
                            enabled: scheduledConfig.enabled,
                            intervalHours: scheduledConfig.intervalHours,
                            nextRunAt: scheduledConfig.enabled
                                ? new Date(Date.now() + scheduledConfig.intervalHours * 3600000).toISOString()
                                : null,
                        },
                    });
                } catch (err) {
                    createJsonResponse(res, 500, { ok: false, error: err.message });
                }
                return;
            }

            next();
        });
    };

    return {
        name: TRAINING_DASHBOARD_API_PLUGIN_NAME,
        configureServer(server) {
            registerMiddleware(server.middlewares);
            loadScheduleConfig();
            setupScheduledTimer();

            const wss = new WebSocketServer({ noServer: true });
            server.httpServer?.on('upgrade', (request, socket, head) => {
                const url = new URL(request.url || '', 'http://localhost');
                if (url.pathname !== '/ws/training') return;
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wsClients.add(ws);
                    ws.on('close', () => wsClients.delete(ws));
                    ws.on('error', () => wsClients.delete(ws));
                    try { ws.send(JSON.stringify({ type: 'status', ...getTrainingState() })); } catch { /* ignore */ }
                });
            });

            const cleanup = () => {
                if (scheduledTimer) { clearInterval(scheduledTimer); scheduledTimer = null; }
                if (trainingProcess?.child && trainingProcess.exitCode === null) {
                    try { trainingProcess.child.kill(); } catch { /* ignore */ }
                }
            };
            process.on('exit', cleanup);
            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
        },
        configurePreviewServer(server) {
            registerMiddleware(server.middlewares, { isPreviewServer: true });
        },
    };
}
