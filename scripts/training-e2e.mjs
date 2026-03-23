#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import process from 'node:process';

import { resolveDevLayoutRelativePath } from './dev-layout-paths.mjs';
import {
    buildTrainingLatestIndex,
    normalizeTrainingRunStamp,
    resolveTrainingRunArtifactLayout,
} from '../src/entities/ai/training/TrainingAutomationContractV33.js';

const DEFAULT_STAGE_TIMEOUT_MS = 8 * 60_000;
const DEFAULT_SERVER_READY_TIMEOUT_MS = 30_000;
const TRAINING_SCRIPT_PATHS = Object.freeze({
    TRAINER_SERVER: resolveDevLayoutRelativePath('scripts', 'trainer-server.mjs'),
    TRAINING_RUN: resolveDevLayoutRelativePath('scripts', 'training-run.mjs'),
    BOT_VALIDATION: resolveDevLayoutRelativePath('scripts', 'bot-validation-runner.mjs'),
    TRAINING_EVAL: resolveDevLayoutRelativePath('scripts', 'training-eval.mjs'),
    TRAINING_GATE: resolveDevLayoutRelativePath('scripts', 'training-gate.mjs'),
});

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

async function fileExists(path) {
    try {
        await readFile(path, 'utf8');
        return true;
    } catch {
        return false;
    }
}

async function readJsonIfExists(path) {
    try {
        const raw = await readFile(path, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function writeJson(path, payload) {
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function collectForwardArgs(args, key, target = key) {
    const value = args.get(key);
    if (typeof value !== 'string' || !value.trim()) return [];
    return [`--${target}`, value.trim()];
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

function startTrainerServer(args) {
    const host = args.get('trainer-host') || process.env.TRAINER_HOST || '127.0.0.1';
    const port = args.get('trainer-port') || process.env.TRAINER_PORT || '8765';
    const verbose = args.get('trainer-verbose') || process.env.TRAINER_VERBOSE || 'false';
    const child = spawn(process.execPath, [
        TRAINING_SCRIPT_PATHS.TRAINER_SERVER,
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

async function runStage(stage, stamp, args = [], options = {}) {
    const timeoutMs = parseInteger(options.timeoutMs, DEFAULT_STAGE_TIMEOUT_MS, 500, 24 * 60 * 60_000);
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const child = spawn(process.execPath, [stage.scriptPath, '--stamp', stamp, ...args], {
            stdio: 'inherit',
            shell: false,
            env: {
                ...process.env,
                TRAINING_RUN_STAMP: stamp,
            },
        });
        let finished = false;
        const finish = (result) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            resolve({
                stage: stage.name,
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
                reason: exitCode === 0 ? null : `${stage.name} exited with code ${exitCode}`,
            });
        });
    });
}

function buildRunStageArgs(args) {
    const runArgs = [];
    const bridgeUrl = args.get('bridge-url')
        || process.env.TRAINER_BRIDGE_URL
        || (args.get('trainer-host') || process.env.TRAINER_HOST || args.get('trainer-port') || process.env.TRAINER_PORT
            ? `ws://${args.get('trainer-host') || process.env.TRAINER_HOST || '127.0.0.1'}:${args.get('trainer-port') || process.env.TRAINER_PORT || '8765'}`
            : '');
    for (const [key, target] of [
        ['bridge-mode', 'bridge-mode'],
        ['resume-checkpoint', 'resume-checkpoint'],
        ['resume-strict', 'resume-strict'],
        ['episodes', 'episodes'],
        ['seeds', 'seeds'],
        ['modes', 'modes'],
        ['max-steps', 'max-steps'],
        ['runner-profile', 'runner-profile'],
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
        runArgs.push(...collectForwardArgs(args, key, target));
    }
    if (bridgeUrl) {
        runArgs.push('--bridge-url', bridgeUrl);
    }
    if (!runArgs.includes('--bridge-mode')) {
        runArgs.push('--bridge-mode', 'bridge');
    }
    if (!runArgs.includes('--resume-checkpoint')) {
        runArgs.push('--resume-checkpoint', 'latest');
    }
    if (!runArgs.includes('--resume-strict')) {
        runArgs.push('--resume-strict', 'false');
    }
    return runArgs;
}

function buildStageForwardArgs(args, botValidationReportPath) {
    return [
        ...collectForwardArgs(args, 'write-latest', 'write-latest'),
        ...(typeof botValidationReportPath === 'string' && botValidationReportPath.trim()
            ? ['--bot-validation-report', botValidationReportPath.trim()]
            : []),
    ];
}

async function restoreLatestIndex(layout, fallbackLatest = null) {
    const backup = await readJsonIfExists(layout.latestBackupPath);
    if (backup && typeof backup === 'object') {
        if (backup.exists === true && backup.latest && typeof backup.latest === 'object') {
            await writeJson(layout.latestIndexPath, backup.latest);
            return true;
        }
        if (backup.exists === false) {
            await rm(layout.latestIndexPath, { force: true });
            return true;
        }
    }
    if (fallbackLatest && typeof fallbackLatest === 'object') {
        await writeJson(layout.latestIndexPath, fallbackLatest);
        return true;
    }
    return false;
}

async function main() {
    const args = parseArgMap(process.argv.slice(2));
    const stamp = normalizeTrainingRunStamp(args.get('stamp') || process.env.TRAINING_RUN_STAMP || null);
    const strictMissing = parseBoolean(args.get('strict'), parseBoolean(process.env.TRAINING_E2E_STRICT, false));
    const withTrainerServer = parseBoolean(args.get('with-trainer-server'), true);
    const writeLatest = parseBoolean(args.get('write-latest'), true);
    const refreshBotValidation = parseBoolean(args.get('refresh-bot-validation'), false);
    const stageTimeoutMs = parseInteger(args.get('stage-timeout-ms'), DEFAULT_STAGE_TIMEOUT_MS, 500, 24 * 60 * 60_000);
    const layout = resolveTrainingRunArtifactLayout(stamp);
    const botValidationReportPath = (typeof args.get('bot-validation-report') === 'string' && args.get('bot-validation-report').trim())
        ? args.get('bot-validation-report').trim()
        : `${layout.runDir}/bot-validation-report.json`;
    const botValidation = {
        refreshed: false,
        reportPath: botValidationReportPath.replace(/\\/g, '/'),
        promotedReportPath: null,
    };
    const latestBefore = writeLatest ? await readJsonIfExists(layout.latestIndexPath) : null;
    const stagePlan = [
        { name: 'run', scriptPath: TRAINING_SCRIPT_PATHS.TRAINING_RUN },
        ...(refreshBotValidation ? [{ name: 'bot-validation', scriptPath: TRAINING_SCRIPT_PATHS.BOT_VALIDATION }] : []),
        { name: 'eval', scriptPath: TRAINING_SCRIPT_PATHS.TRAINING_EVAL },
        { name: 'gate', scriptPath: TRAINING_SCRIPT_PATHS.TRAINING_GATE },
    ];
    const stageResults = [];
    const runStageArgs = buildRunStageArgs(args);
    let lastCompletedStage = null;
    let trainerServer = null;

    try {
        if (withTrainerServer) {
            trainerServer = startTrainerServer(args);
            await waitForTrainerServerReady(
                trainerServer,
                parseInteger(args.get('trainer-server-ready-timeout-ms'), DEFAULT_SERVER_READY_TIMEOUT_MS, 500, 120_000)
            );
        }

        for (let i = 0; i < stagePlan.length; i++) {
            const stage = stagePlan[i];
            const scriptExists = await fileExists(stage.scriptPath);
            if (!scriptExists) {
                const status = strictMissing ? 'failed' : 'pending';
                stageResults.push({
                    stage: stage.name,
                    status,
                    exitCode: strictMissing ? 1 : 0,
                    reason: `missing script: ${stage.scriptPath}`,
                });
                if (strictMissing) {
                    break;
                }
                continue;
            }
            if (stage.name === 'bot-validation' && !writeLatest) {
                stageResults.push({
                    stage: stage.name,
                    status: 'skipped',
                    exitCode: 0,
                    reason: 'bot-validation refresh skipped because write-latest false',
                });
                continue;
            }
            const stageArgs = stage.name === 'run'
                ? runStageArgs
                : buildStageForwardArgs(args, botValidationReportPath);
            let stageResult = await runStage(stage, stamp, stageArgs, { timeoutMs: stageTimeoutMs });
            if (stage.name === 'bot-validation' && stageResult.status === 'completed') {
                const reportExists = await fileExists(botValidationReportPath);
                if (!reportExists) {
                    stageResult = {
                        ...stageResult,
                        status: 'failed',
                        exitCode: 1,
                        reason: `missing bot-validation report: ${botValidationReportPath}`,
                    };
                } else {
                    botValidation.refreshed = true;
                    botValidation.promotedReportPath = botValidationReportPath.replace(/\\/g, '/');
                }
            }
            stageResults.push(stageResult);
            if (stageResult.status === 'completed') {
                lastCompletedStage = stage.name;
                continue;
            }
            break;
        }
    } finally {
        await stopTrainerServer(trainerServer);
    }

    const runExists = await fileExists(layout.runArtifactPath);
    const evalExists = await fileExists(layout.evalArtifactPath);
    const gateExists = await fileExists(layout.gateArtifactPath);
    const trainerExists = await fileExists(layout.trainerArtifactPath);
    const checkpointExists = await fileExists(layout.checkpointPath);
    const artifacts = {
        run: { exists: runExists, status: runExists ? 'completed' : 'pending' },
        eval: { exists: evalExists, status: evalExists ? 'completed' : 'pending' },
        gate: { exists: gateExists, status: gateExists ? 'completed' : 'pending' },
        trainer: { exists: trainerExists, status: trainerExists ? 'completed' : 'pending' },
        checkpoint: { exists: checkpointExists, status: checkpointExists ? 'completed' : 'pending' },
    };
    for (let i = 0; i < stageResults.length; i++) {
        const result = stageResults[i];
        if (!Object.prototype.hasOwnProperty.call(artifacts, result.stage)) continue;
        artifacts[result.stage].status = result.status;
    }
    const hasFailure = stageResults.some((result) => result.status === 'failed');

    const latestIndex = buildTrainingLatestIndex({
        stamp,
        generatedAt: new Date().toISOString(),
        lastCompletedStage,
        resumeSource: latestBefore?.resumeSource || null,
        artifacts,
    });
    if (!checkpointExists) {
        const previousCheckpointPath = latestBefore?.artifacts?.checkpoint?.exists === true
            ? latestBefore?.artifacts?.checkpoint?.path
            : null;
        if (typeof previousCheckpointPath === 'string' && previousCheckpointPath.trim()) {
            latestIndex.artifacts.checkpoint.path = previousCheckpointPath.trim();
            latestIndex.artifacts.checkpoint.exists = true;
            latestIndex.artifacts.checkpoint.status = latestBefore?.artifacts?.checkpoint?.status || 'completed';
        }
    }
    let latestRestored = false;
    if (writeLatest) {
        if (hasFailure) {
            latestRestored = await restoreLatestIndex(layout, latestBefore);
        } else {
            await mkdir(layout.rootDir, { recursive: true });
            await writeJson(layout.latestIndexPath, latestIndex);
        }
    }

    console.log(JSON.stringify({
        ok: !hasFailure,
        stamp: layout.stamp,
        withTrainerServer,
        stageTimeoutMs,
        runStageArgs,
        botValidation,
        stageResults,
        latestIndexPath: writeLatest ? layout.latestIndexPath : null,
        latestRestored,
    }, null, 2));
    if (hasFailure) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});

