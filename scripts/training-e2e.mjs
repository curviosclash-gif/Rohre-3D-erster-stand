#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

import {
    buildTrainingLatestIndex,
    normalizeTrainingRunStamp,
    resolveTrainingRunArtifactLayout,
} from '../src/entities/ai/training/TrainingAutomationContractV33.js';

const DEFAULT_STAGE_TIMEOUT_MS = 8 * 60_000;

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
    for (const [key, target] of [
        ['bridge-mode', 'bridge-mode'],
        ['resume-checkpoint', 'resume-checkpoint'],
        ['resume-strict', 'resume-strict'],
        ['episodes', 'episodes'],
        ['seeds', 'seeds'],
        ['modes', 'modes'],
        ['max-steps', 'max-steps'],
        ['bridge-timeout-ms', 'bridge-timeout-ms'],
        ['bridge-max-retries', 'bridge-max-retries'],
        ['bridge-retry-delay-ms', 'bridge-retry-delay-ms'],
        ['bridge-connect-timeout-ms', 'bridge-connect-timeout-ms'],
    ]) {
        runArgs.push(...collectForwardArgs(args, key, target));
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

async function main() {
    const args = parseArgMap(process.argv.slice(2));
    const stamp = normalizeTrainingRunStamp(args.get('stamp') || process.env.TRAINING_RUN_STAMP || null);
    const strictMissing = parseBoolean(args.get('strict'), parseBoolean(process.env.TRAINING_E2E_STRICT, false));
    const withTrainerServer = parseBoolean(args.get('with-trainer-server'), true);
    const stageTimeoutMs = parseInteger(args.get('stage-timeout-ms'), DEFAULT_STAGE_TIMEOUT_MS, 500, 24 * 60 * 60_000);
    const layout = resolveTrainingRunArtifactLayout(stamp);
    const latestBefore = await readJsonIfExists(layout.latestIndexPath);
    const stagePlan = [
        { name: 'run', scriptPath: 'scripts/training-run.mjs' },
        { name: 'eval', scriptPath: 'scripts/training-eval.mjs' },
        { name: 'gate', scriptPath: 'scripts/training-gate.mjs' },
    ];
    const stageResults = [];
    const runStageArgs = buildRunStageArgs(args);
    let lastCompletedStage = null;
    let trainerServer = null;

    try {
        if (withTrainerServer) {
            trainerServer = startTrainerServer(args);
            await new Promise((resolve) => setTimeout(resolve, 900));
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
            const stageArgs = stage.name === 'run' ? runStageArgs : [];
            const stageResult = await runStage(stage, stamp, stageArgs, { timeoutMs: stageTimeoutMs });
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

    const latestIndex = buildTrainingLatestIndex({
        stamp,
        generatedAt: new Date().toISOString(),
        lastCompletedStage,
        resumeSource: latestBefore?.resumeSource || null,
        artifacts,
    });
    await mkdir(layout.rootDir, { recursive: true });
    await writeJson(layout.latestIndexPath, latestIndex);

    const hasFailure = stageResults.some((result) => result.status === 'failed');
    console.log(JSON.stringify({
        ok: !hasFailure,
        stamp: layout.stamp,
        withTrainerServer,
        stageTimeoutMs,
        runStageArgs,
        stageResults,
        latestIndexPath: layout.latestIndexPath,
    }, null, 2));
    if (hasFailure) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});

