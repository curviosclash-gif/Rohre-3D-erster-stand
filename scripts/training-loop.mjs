#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';

import { normalizeTrainingRunStamp } from '../src/entities/ai/training/TrainingAutomationContractV33.js';

const SERIES_ROOT = 'data/training/series';
const DEFAULT_STAGE_TIMEOUT_MS = 10 * 60_000;

function parseArgMap(argv) {
    const map = new Map();
    for (let i = 0; i < argv.length; i++) {
        const token = String(argv[i] || '');
        if (!token.startsWith('--')) continue;
        const eqIndex = token.indexOf('=');
        if (eqIndex >= 0) {
            map.set(token.slice(2, eqIndex), token.slice(eqIndex + 1));
            continue;
        }
        const key = token.slice(2);
        const next = argv[i + 1];
        if (typeof next === 'string' && !next.startsWith('--')) {
            map.set(key, next);
            i += 1;
            continue;
        }
        map.set(key, 'true');
    }
    return map;
}

function parseBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function parseInteger(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

function toRepoPath(targetPath) {
    return String(targetPath || '').replace(/\\/g, '/');
}

function pad2(value) {
    return String(value).padStart(2, '0');
}

function resolveSeriesStamp(args) {
    const raw = args.get('series-stamp') || args.get('stamp') || process.env.TRAINING_SERIES_STAMP || null;
    return normalizeTrainingRunStamp(raw);
}

function resolveRunStamp(seriesStamp, runIndex) {
    const safeIndex = Math.max(1, Math.trunc(runIndex));
    return `${seriesStamp}-r${pad2(safeIndex)}`;
}

function collectForwardArgs(args, key, target = key) {
    const value = args.get(key);
    if (typeof value !== 'string' || !value.trim()) return [];
    return [`--${target}`, value.trim()];
}

async function writeJson(path, payload) {
    await mkdir(path.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runNodeScript(scriptPath, scriptArgs = [], options = {}) {
    const timeoutMs = parseInteger(options.timeoutMs, DEFAULT_STAGE_TIMEOUT_MS, 500, 24 * 60 * 60_000);
    const env = {
        ...process.env,
        ...(options.env && typeof options.env === 'object' ? options.env : {}),
    };
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
            stdio: 'inherit',
            shell: false,
            env,
        });
        let finished = false;
        const finish = (result) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            resolve({
                ...result,
                elapsedMs: Math.max(0, Date.now() - startedAt),
            });
        };
        const timer = setTimeout(() => {
            try {
                child.kill('SIGTERM');
            } catch {
                // ignore shutdown races
            }
            finish({
                status: 'failed',
                exitCode: 1,
                reason: `timeout ${timeoutMs}ms`,
            });
        }, timeoutMs);

        child.on('error', (error) => {
            finish({
                status: 'failed',
                exitCode: 1,
                reason: error?.message || String(error),
            });
        });
        child.on('exit', (code) => {
            const exitCode = Number.isInteger(code) ? code : 1;
            finish({
                status: exitCode === 0 ? 'completed' : 'failed',
                exitCode,
                reason: exitCode === 0 ? null : `${scriptPath} exited with code ${exitCode}`,
            });
        });
    });
}

function startTrainerServer(args) {
    const host = args.get('trainer-host') || process.env.TRAINER_HOST || '127.0.0.1';
    const port = args.get('trainer-port') || process.env.TRAINER_PORT || '8765';
    const verbose = args.get('trainer-verbose') || process.env.TRAINER_VERBOSE || 'false';
    const child = spawn(process.execPath, [
        'scripts/trainer-server.mjs',
        '--host', host,
        '--port', port,
        '--verbose', verbose,
    ], {
        stdio: 'inherit',
        shell: false,
        env: process.env,
    });
    return {
        child,
        host,
        port,
    };
}

async function stopTrainerServer(server) {
    if (!server?.child) return;
    const child = server.child;
    if (child.exitCode !== null) return;
    try {
        child.kill('SIGTERM');
    } catch {
        // ignore shutdown races
    }
    await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1500);
        child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

function buildRunStageArgs(args, stamp) {
    const bridgeMode = (args.get('bridge-mode') || process.env.TRAINING_BRIDGE_MODE || 'bridge').trim();
    const resumeCheckpoint = (args.get('resume-checkpoint') || process.env.TRAINER_RESUME_CHECKPOINT || 'latest').trim();
    const resumeStrict = parseBoolean(
        args.get('resume-strict'),
        parseBoolean(process.env.TRAINER_RESUME_STRICT, false)
    );
    const stageArgs = [
        '--stamp', stamp,
        '--bridge-mode', bridgeMode,
        '--resume-checkpoint', resumeCheckpoint,
        '--resume-strict', String(resumeStrict),
    ];
    for (const [key, target] of [
        ['episodes', 'episodes'],
        ['seeds', 'seeds'],
        ['modes', 'modes'],
        ['max-steps', 'max-steps'],
        ['bridge-timeout-ms', 'bridge-timeout-ms'],
        ['bridge-max-retries', 'bridge-max-retries'],
        ['bridge-retry-delay-ms', 'bridge-retry-delay-ms'],
        ['bridge-connect-timeout-ms', 'bridge-connect-timeout-ms'],
    ]) {
        stageArgs.push(...collectForwardArgs(args, key, target));
    }
    return stageArgs;
}

function buildSummary(input) {
    const runs = Array.isArray(input?.runs) ? input.runs : [];
    const completedRuns = runs.filter((entry) => entry.status === 'completed').length;
    const failedRuns = runs.filter((entry) => entry.status === 'failed').length;
    const stageFailures = [];
    for (const run of runs) {
        for (const stage of run.stages || []) {
            if (stage.status === 'failed') {
                stageFailures.push({
                    runIndex: run.runIndex,
                    runStamp: run.runStamp,
                    stage: stage.stage,
                    reason: stage.reason || null,
                });
            }
        }
    }
    return {
        runsRequested: parseInteger(input?.runsRequested, 0, 0, 100_000),
        runsExecuted: runs.length,
        runsCompleted: completedRuns,
        runsFailed: failedRuns,
        stageFailures,
    };
}

async function main() {
    const args = parseArgMap(process.argv.slice(2));
    const runsRequested = parseInteger(args.get('runs'), 3, 1, 500);
    const stopOnFail = parseBoolean(args.get('stop-on-fail'), true);
    const withTrainerServer = parseBoolean(args.get('with-trainer-server'), true);
    const stageTimeoutMs = parseInteger(args.get('stage-timeout-ms'), DEFAULT_STAGE_TIMEOUT_MS, 500, 24 * 60 * 60_000);
    const seriesStamp = resolveSeriesStamp(args);
    const seriesDir = `${SERIES_ROOT}/${seriesStamp}`;
    const artifactPath = `${seriesDir}/loop.json`;

    let trainerServer = null;
    const runResults = [];
    const startedAt = Date.now();

    try {
        if (withTrainerServer) {
            trainerServer = startTrainerServer(args);
            await new Promise((resolve) => setTimeout(resolve, 900));
        }

        for (let runIndex = 1; runIndex <= runsRequested; runIndex++) {
            const runStamp = resolveRunStamp(seriesStamp, runIndex);
            const stages = [];
            const runStageArgs = buildRunStageArgs(args, runStamp);
            const runResult = await runNodeScript('scripts/training-run.mjs', runStageArgs, {
                timeoutMs: stageTimeoutMs,
                env: {
                    TRAINING_RUN_STAMP: runStamp,
                },
            });
            stages.push({
                stage: 'run',
                ...runResult,
            });

            if (runResult.status === 'completed') {
                const evalResult = await runNodeScript('scripts/training-eval.mjs', ['--stamp', runStamp], {
                    timeoutMs: stageTimeoutMs,
                    env: {
                        TRAINING_RUN_STAMP: runStamp,
                    },
                });
                stages.push({
                    stage: 'eval',
                    ...evalResult,
                });
                if (evalResult.status === 'completed') {
                    const gateResult = await runNodeScript('scripts/training-gate.mjs', ['--stamp', runStamp], {
                        timeoutMs: stageTimeoutMs,
                        env: {
                            TRAINING_RUN_STAMP: runStamp,
                        },
                    });
                    stages.push({
                        stage: 'gate',
                        ...gateResult,
                    });
                }
            }

            const failedStage = stages.find((entry) => entry.status !== 'completed');
            const status = failedStage ? 'failed' : 'completed';
            runResults.push({
                runIndex,
                runStamp,
                status,
                failedStage: failedStage?.stage || null,
                stages,
            });
            if (failedStage && stopOnFail) {
                break;
            }
        }
    } finally {
        await stopTrainerServer(trainerServer);
    }

    const finishedAt = Date.now();
    const summary = buildSummary({
        runsRequested,
        runs: runResults,
    });
    const output = {
        ok: summary.runsFailed === 0,
        contractVersion: 'v36-training-loop-v1',
        generatedAt: new Date().toISOString(),
        seriesStamp,
        withTrainerServer,
        stopOnFail,
        stageTimeoutMs,
        elapsedMs: Math.max(0, finishedAt - startedAt),
        runs: runResults,
        summary,
        artifactPath: toRepoPath(artifactPath),
    };

    await writeJson(artifactPath, output);
    console.log(JSON.stringify(output, null, 2));
    if (!output.ok) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});

