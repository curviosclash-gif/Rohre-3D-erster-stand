#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import process from 'node:process';

import { resolveDevLayoutRelativePath } from './dev-layout-paths.mjs';
import { normalizeTrainingRunStamp } from '../src/entities/ai/training/TrainingAutomationContractV33.js';
import {
    normalizeTrainingAlgorithmProfileName,
    resolveTrainingAlgorithmProfile,
    normalizeTrainingPerformanceProfileName,
    resolveTrainingPerformanceProfile,
} from '../src/state/training/TrainingBenchmarkContract.js';
import {
    buildThroughputSummary,
    captureHardwareTelemetry,
} from './training-benchmark-artifacts.mjs';

const SERIES_ROOT = 'data/training/series';
const DEFAULT_STAGE_TIMEOUT_MS = 60 * 60_000;
const DEFAULT_SERVER_READY_TIMEOUT_MS = 30_000;
const TRAINING_SCRIPT_PATHS = Object.freeze({
    TRAINER_SERVER: resolveDevLayoutRelativePath('scripts', 'trainer-server.mjs'),
    TRAINING_RUN: resolveDevLayoutRelativePath('scripts', 'training-run.mjs'),
    TRAINING_EVAL: resolveDevLayoutRelativePath('scripts', 'training-eval.mjs'),
    TRAINING_GATE: resolveDevLayoutRelativePath('scripts', 'training-gate.mjs'),
});

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

function parseOptionalInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (value == null || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

function parsePositiveNumber(value, fallback = null) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return numeric;
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

function appendArg(stageArgs, target, value) {
    if (value == null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    stageArgs.push(`--${target}`, normalized);
}

function resolveArgOrProfileValue(args, key, profileValue = null) {
    const direct = args.get(key);
    if (typeof direct === 'string' && direct.trim()) {
        return direct.trim();
    }
    if (profileValue == null) return null;
    return String(profileValue);
}

function resolveDurationBudgetMs(args) {
    if (typeof args.get('duration-ms') === 'string') {
        const durationMs = parseInteger(args.get('duration-ms'), null, 1, 7 * 24 * 60 * 60_000);
        if (durationMs == null) {
            throw new Error('duration-ms must be a positive integer');
        }
        return durationMs;
    }
    if (typeof args.get('duration-hours') === 'string') {
        const durationHours = parsePositiveNumber(args.get('duration-hours'), null);
        if (durationHours == null) {
            throw new Error('duration-hours must be a positive number');
        }
        return parseInteger(durationHours * 60 * 60_000, null, 1, 7 * 24 * 60 * 60_000);
    }
    return null;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(host, port, timeoutMs = 500) {
    return new Promise((resolve) => {
        const socket = net.createConnection({
            host,
            port,
        });
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve(ok);
        };
        socket.once('connect', () => finish(true));
        socket.once('error', () => finish(false));
        socket.setTimeout(timeoutMs, () => finish(false));
    });
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

function startTrainerServer(args, performanceProfile = null, algorithmProfileName = null) {
    const host = args.get('trainer-host') || process.env.TRAINER_HOST || '127.0.0.1';
    const port = args.get('trainer-port') || process.env.TRAINER_PORT || '8765';
    const verbose = args.get('trainer-verbose') || process.env.TRAINER_VERBOSE || 'false';
    const trainerArgs = [
        TRAINING_SCRIPT_PATHS.TRAINER_SERVER,
        '--host', host,
        '--port', port,
        '--verbose', verbose,
    ];
    appendArg(trainerArgs, 'algorithm-profile', algorithmProfileName);
    appendArg(
        trainerArgs,
        'replay-capacity',
        resolveArgOrProfileValue(args, 'replay-capacity', performanceProfile?.trainer?.replayCapacity)
    );
    appendArg(
        trainerArgs,
        'model-batch-size',
        resolveArgOrProfileValue(args, 'model-batch-size', performanceProfile?.trainer?.batchSize)
    );
    appendArg(
        trainerArgs,
        'model-replay-warmup',
        resolveArgOrProfileValue(args, 'model-replay-warmup', performanceProfile?.trainer?.replayWarmup)
    );
    appendArg(
        trainerArgs,
        'model-target-sync',
        resolveArgOrProfileValue(args, 'model-target-sync', performanceProfile?.trainer?.targetSyncInterval)
    );
    const child = spawn(process.execPath, trainerArgs, {
        stdio: 'inherit',
        shell: false,
        env: {
            ...process.env,
            ...(algorithmProfileName ? { TRAINING_ALGORITHM_PROFILE: algorithmProfileName } : {}),
        },
    });
    return {
        child,
        host,
        port,
    };
}

async function waitForTrainerServerReady(server, timeoutMs = DEFAULT_SERVER_READY_TIMEOUT_MS) {
    if (!server?.child) return;
    const timeout = parseInteger(timeoutMs, DEFAULT_SERVER_READY_TIMEOUT_MS, 500, 120_000);
    const port = parseInteger(server.port, 8765, 1, 65535);
    const startedAt = Date.now();
    while ((Date.now() - startedAt) < timeout) {
        if (server.child.exitCode !== null) {
            throw new Error(`trainer server exited before readiness (code=${server.child.exitCode})`);
        }
        if (await canConnect(server.host || '127.0.0.1', port, 400)) {
            return;
        }
        await sleep(100);
    }
    throw new Error(`trainer server not ready after ${timeout}ms (${server.host || '127.0.0.1'}:${port})`);
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

function buildRunStageArgs(args, stamp, performanceProfile = null, performanceProfileName = null, seriesStamp = null, algorithmProfileName = null) {
    const bridgeMode = (args.get('bridge-mode') || process.env.TRAINING_BRIDGE_MODE || 'bridge').trim();
    const resumeCheckpoint = (args.get('resume-checkpoint') || process.env.TRAINER_RESUME_CHECKPOINT || 'latest').trim();
    const bridgeUrl = args.get('bridge-url')
        || process.env.TRAINER_BRIDGE_URL
        || (args.get('trainer-host') || process.env.TRAINER_HOST || args.get('trainer-port') || process.env.TRAINER_PORT
            ? `ws://${args.get('trainer-host') || process.env.TRAINER_HOST || '127.0.0.1'}:${args.get('trainer-port') || process.env.TRAINER_PORT || '8765'}`
            : '');
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
    if (seriesStamp) {
        stageArgs.push('--series-stamp', seriesStamp);
    }
    if (performanceProfileName) {
        stageArgs.push('--performance-profile', performanceProfileName);
    }
    if (algorithmProfileName) {
        stageArgs.push('--algorithm-profile', algorithmProfileName);
    }
    if (bridgeUrl) {
        stageArgs.push('--bridge-url', bridgeUrl);
    }
    const profiledDefaults = Object.freeze({
        episodes: performanceProfile?.run?.episodes,
        'max-steps': performanceProfile?.run?.maxSteps,
        'runner-profile': performanceProfile?.run?.runnerProfile,
        'environment-profile': performanceProfile?.run?.environmentProfile,
        'step-timeout-retries': performanceProfile?.run?.stepTimeoutRetries,
        'timeout-step-ms': performanceProfile?.run?.timeoutStepMs,
        'timeout-episode-ms': performanceProfile?.run?.timeoutEpisodeMs,
        'timeout-run-ms': performanceProfile?.run?.timeoutRunMs,
        'bridge-max-pending-acks': performanceProfile?.bridge?.maxPendingAcks,
        'bridge-backpressure-threshold': performanceProfile?.bridge?.backpressureThreshold,
        'bridge-drop-training-when-backlogged': performanceProfile?.bridge?.dropTrainingWhenBacklogged,
        'write-checkpoint': true,
        'write-latest': true,
    });
    for (const [key, target] of [
        ['episodes', 'episodes'],
        ['seeds', 'seeds'],
        ['modes', 'modes'],
        ['max-steps', 'max-steps'],
        ['runner-profile', 'runner-profile'],
        ['environment-profile', 'environment-profile'],
        ['inject-invalid-actions', 'inject-invalid-actions'],
        ['step-timeout-retries', 'step-timeout-retries'],
        ['timeout-step-ms', 'timeout-step-ms'],
        ['timeout-episode-ms', 'timeout-episode-ms'],
        ['timeout-run-ms', 'timeout-run-ms'],
        ['bridge-strict', 'bridge-strict'],
        ['bridge-require-ready-message', 'bridge-require-ready-message'],
        ['bridge-ready-message-type', 'bridge-ready-message-type'],
        ['bridge-timeout-ms', 'bridge-timeout-ms'],
        ['bridge-max-retries', 'bridge-max-retries'],
        ['bridge-retry-delay-ms', 'bridge-retry-delay-ms'],
        ['bridge-connect-timeout-ms', 'bridge-connect-timeout-ms'],
        ['trainer-command-timeout-ms', 'trainer-command-timeout-ms'],
        ['bridge-action-probe-timeout-ms', 'bridge-action-probe-timeout-ms'],
        ['bridge-action-probe-observation-length', 'bridge-action-probe-observation-length'],
        ['bridge-drain-timeout-ms', 'bridge-drain-timeout-ms'],
        ['bridge-max-pending-acks', 'bridge-max-pending-acks'],
        ['bridge-backpressure-threshold', 'bridge-backpressure-threshold'],
        ['bridge-drop-training-when-backlogged', 'bridge-drop-training-when-backlogged'],
        ['write-checkpoint', 'write-checkpoint'],
        ['write-latest', 'write-latest'],
        ['quiet', 'quiet'],
    ]) {
        const explicitArgs = collectForwardArgs(args, key, target);
        if (explicitArgs.length > 0) {
            stageArgs.push(...explicitArgs);
            continue;
        }
        appendArg(stageArgs, target, profiledDefaults[key]);
    }
    return stageArgs;
}

function buildStageForwardArgs(args, stamp) {
    return [
        '--stamp', stamp,
        ...collectForwardArgs(args, 'write-latest', 'write-latest'),
        ...collectForwardArgs(args, 'bot-validation-report', 'bot-validation-report'),
    ];
}

function buildSummary(input) {
    const runs = Array.isArray(input?.runs) ? input.runs : [];
    const completedRuns = runs.filter((entry) => entry.status === 'completed').length;
    const failedRuns = runs.filter((entry) => entry.status === 'failed').length;
    const durationBudgetMs = parseOptionalInteger(input?.durationBudgetMs, 1, 7 * 24 * 60 * 60_000);
    const elapsedMs = parseInteger(input?.elapsedMs, 0, 0, 30 * 24 * 60 * 60_000);
    const stopReason = typeof input?.stopReason === 'string' && input.stopReason.trim()
        ? input.stopReason.trim()
        : null;
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
        elapsedMs,
        durationBudgetMs,
        durationBudgetReached: durationBudgetMs != null && elapsedMs >= durationBudgetMs,
        stopReason,
        stageFailures,
    };
}

async function main() {
    const args = parseArgMap(process.argv.slice(2));
    const performanceProfileName = normalizeTrainingPerformanceProfileName(
        args.get('performance-profile') || process.env.TRAINING_PERFORMANCE_PROFILE || '',
        null
    );
    const performanceProfile = resolveTrainingPerformanceProfile(performanceProfileName, null);
    const algorithmProfileName = normalizeTrainingAlgorithmProfileName(
        args.get('algorithm-profile')
            || process.env.TRAINING_ALGORITHM_PROFILE
            || performanceProfile?.algorithmProfileName
            || '',
        null
    );
    const algorithmProfile = resolveTrainingAlgorithmProfile(algorithmProfileName, null);
    const durationBudgetMs = resolveDurationBudgetMs(args)
        ?? (
            performanceProfile?.loop?.durationHours != null
                ? parseInteger(performanceProfile.loop.durationHours * 60 * 60_000, null, 1, 7 * 24 * 60 * 60_000)
                : null
        );
    const runsRequested = parseInteger(
        args.get('runs'),
        performanceProfile?.loop?.runs ?? (durationBudgetMs != null ? 100_000 : 3),
        1,
        100_000
    );
    const stopOnFail = parseBoolean(args.get('stop-on-fail'), performanceProfile?.loop?.stopOnFail ?? true);
    const withTrainerServer = parseBoolean(args.get('with-trainer-server'), performanceProfile?.loop?.withTrainerServer ?? true);
    const writeLatest = parseBoolean(args.get('write-latest'), true);
    const stageTimeoutMs = parseInteger(
        args.get('stage-timeout-ms'),
        performanceProfile?.loop?.stageTimeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS,
        500,
        24 * 60 * 60_000
    );
    const seriesStamp = resolveSeriesStamp(args);
    const seriesDir = `${SERIES_ROOT}/${seriesStamp}`;
    const artifactPath = `${seriesDir}/loop.json`;

    let trainerServer = null;
    const runResults = [];
    const startedAt = Date.now();
    let stopReason = null;

    try {
        if (withTrainerServer) {
            trainerServer = startTrainerServer(args, performanceProfile, algorithmProfileName);
            await waitForTrainerServerReady(
                trainerServer,
                parseInteger(args.get('trainer-server-ready-timeout-ms'), DEFAULT_SERVER_READY_TIMEOUT_MS, 500, 120_000)
            );
        }

        for (let runIndex = 1; runIndex <= runsRequested; runIndex++) {
            if (durationBudgetMs != null && (Date.now() - startedAt) >= durationBudgetMs) {
                stopReason = 'duration-budget-reached';
                break;
            }
            const runStamp = resolveRunStamp(seriesStamp, runIndex);
            const stages = [];
            const runStageArgs = buildRunStageArgs(
                args,
                runStamp,
                performanceProfile,
                performanceProfileName,
                seriesStamp,
                algorithmProfileName
            );
            const runResult = await runNodeScript(TRAINING_SCRIPT_PATHS.TRAINING_RUN, runStageArgs, {
                timeoutMs: stageTimeoutMs,
                env: {
                    TRAINING_RUN_STAMP: runStamp,
                    TRAINING_SERIES_STAMP: seriesStamp,
                    ...(performanceProfileName ? { TRAINING_PERFORMANCE_PROFILE: performanceProfileName } : {}),
                    ...(algorithmProfileName ? { TRAINING_ALGORITHM_PROFILE: algorithmProfileName } : {}),
                },
            });
            stages.push({
                stage: 'run',
                ...runResult,
            });

            if (runResult.status === 'completed') {
                const evalResult = await runNodeScript(
                    TRAINING_SCRIPT_PATHS.TRAINING_EVAL,
                    buildStageForwardArgs(args, runStamp),
                    {
                    timeoutMs: stageTimeoutMs,
                    env: {
                        TRAINING_RUN_STAMP: runStamp,
                        TRAINING_SERIES_STAMP: seriesStamp,
                        ...(performanceProfileName ? { TRAINING_PERFORMANCE_PROFILE: performanceProfileName } : {}),
                        ...(algorithmProfileName ? { TRAINING_ALGORITHM_PROFILE: algorithmProfileName } : {}),
                    },
                    }
                );
                stages.push({
                    stage: 'eval',
                    ...evalResult,
                });
                if (evalResult.status === 'completed') {
                    const gateResult = await runNodeScript(
                        TRAINING_SCRIPT_PATHS.TRAINING_GATE,
                        buildStageForwardArgs(args, runStamp),
                        {
                        timeoutMs: stageTimeoutMs,
                        env: {
                            TRAINING_RUN_STAMP: runStamp,
                            TRAINING_SERIES_STAMP: seriesStamp,
                            ...(performanceProfileName ? { TRAINING_PERFORMANCE_PROFILE: performanceProfileName } : {}),
                            ...(algorithmProfileName ? { TRAINING_ALGORITHM_PROFILE: algorithmProfileName } : {}),
                        },
                        }
                    );
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
                stopReason = 'stage-failure-stop-on-fail';
                break;
            }
        }
    } finally {
        await stopTrainerServer(trainerServer);
    }

    const finishedAt = Date.now();
    if (!stopReason) {
        if (runResults.length >= runsRequested) {
            stopReason = 'runs-limit-reached';
        } else if (durationBudgetMs != null && (finishedAt - startedAt) >= durationBudgetMs) {
            stopReason = 'duration-budget-reached';
        } else {
            stopReason = 'completed';
        }
    }
    const summary = buildSummary({
        runsRequested,
        elapsedMs: Math.max(0, finishedAt - startedAt),
        durationBudgetMs,
        stopReason,
        runs: runResults,
    });
    const throughput = buildThroughputSummary({
        elapsedMs: Math.max(0, finishedAt - startedAt),
        stages: runResults,
        runsExecuted: summary.runsExecuted,
    });
    const hardwareTelemetry = captureHardwareTelemetry({
        phase: 'loop',
        profileName: performanceProfileName,
        extra: {
            seriesStamp,
            stopReason,
            withTrainerServer,
        },
    });
    const output = {
        ok: summary.runsFailed === 0,
        contractVersion: 'v36-training-loop-v1',
        generatedAt: new Date().toISOString(),
        seriesStamp,
        performanceProfileName,
        performanceProfile,
        algorithmProfileName,
        algorithmProfile,
        withTrainerServer,
        stopOnFail,
        writeLatest,
        stageTimeoutMs,
        durationBudgetMs,
        stopReason,
        elapsedMs: Math.max(0, finishedAt - startedAt),
        runs: runResults,
        summary,
        throughput,
        hardwareTelemetry,
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

