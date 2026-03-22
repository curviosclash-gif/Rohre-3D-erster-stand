#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

import { TrainingAutomationRunner } from '../src/entities/ai/training/TrainingAutomationRunner.js';
import { WebSocketTrainerBridge } from '../src/entities/ai/training/WebSocketTrainerBridge.js';
import {
    TRAINING_AUTOMATION_RUN_CONTRACT_VERSION,
    buildTrainingLatestIndex,
    normalizeTrainingRunStamp,
    resolveTrainingRunArtifactLayout,
} from '../src/entities/ai/training/TrainingAutomationContractV33.js';
import { deriveTrainingOpsKpis } from '../src/state/training/TrainingOpsKpiContractV36.js';
import {
    readJsonIfExists,
    writeTrainerArtifacts,
} from '../trainer/artifacts/TrainerArtifactStore.mjs';
import { validateDqnCheckpointPayload } from '../trainer/model/CheckpointValidation.mjs';

const DEFAULT_TRAINER_COMMAND_TIMEOUT_MS = 20_000;

function parseBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function parseOptionalBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return null;
}

function parseInteger(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function parseArgMap(argv) {
    const map = new Map();
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
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

async function writeJson(path, payload) {
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function toRepoPath(path) {
    return String(path || '').replace(/\\/g, '/');
}

function toFiniteNumber(value, fallback = null) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateOutstandingAckCount(snapshot = null) {
    const trainingRequests = Math.max(0, Number(snapshot?.trainingRequests || 0));
    const ackResponses = Math.max(0, Number(snapshot?.ackResponses || 0));
    return Math.max(0, trainingRequests - ackResponses);
}

async function waitForBridgeDrain(bridge, timeoutMs = 180_000) {
    if (!bridge || typeof bridge.getTelemetrySnapshot !== 'function') {
        return null;
    }
    const timeout = Math.max(20, Math.min(10 * 60_000, Number(timeoutMs) || 180_000));
    const startedAt = Date.now();
    let snapshot = bridge.getTelemetrySnapshot();
    while ((Date.now() - startedAt) < timeout) {
        const pendingActionRequest = snapshot?.pendingActionRequest === true;
        const pendingAckCount = Number(snapshot?.pendingAckCount || 0);
        const pendingCommandCount = Number(snapshot?.pendingCommandCount || 0);
        const estimatedAckBacklog = estimateOutstandingAckCount(snapshot);
        if (
            !pendingActionRequest
            && pendingAckCount === 0
            && pendingCommandCount === 0
            && estimatedAckBacklog === 0
        ) {
            break;
        }
        await sleep(25);
        snapshot = bridge.getTelemetrySnapshot();
    }
    return snapshot;
}

function deriveCheckpointEpsilon(checkpoint, fallback = null) {
    const envSteps = toFiniteNumber(checkpoint?.envSteps, null);
    const epsilonStart = toFiniteNumber(checkpoint?.hyper?.epsilonStart, null);
    const epsilonEnd = toFiniteNumber(checkpoint?.hyper?.epsilonEnd, null);
    const epsilonDecaySteps = toFiniteNumber(checkpoint?.hyper?.epsilonDecaySteps, null);
    if (
        envSteps == null
        || epsilonStart == null
        || epsilonEnd == null
        || epsilonDecaySteps == null
        || epsilonDecaySteps <= 0
    ) {
        return fallback;
    }
    const progress = Math.max(0, Math.min(1, envSteps / epsilonDecaySteps));
    return epsilonStart + ((epsilonEnd - epsilonStart) * progress);
}

function buildTrainerStatsFallback(checkpointResponse, bridgeTelemetry = null) {
    if (!checkpointResponse || checkpointResponse.ok !== true) {
        return null;
    }
    const checkpoint = checkpointResponse.checkpoint && typeof checkpointResponse.checkpoint === 'object'
        ? checkpointResponse.checkpoint
        : null;
    const replay = checkpointResponse.replay && typeof checkpointResponse.replay === 'object'
        ? checkpointResponse.replay
        : null;
    return {
        ok: true,
        type: 'trainer-stats-fallback',
        source: 'checkpoint-request',
        sessionId: checkpointResponse.sessionId || null,
        replay,
        model: {
            optimizerSteps: toFiniteNumber(checkpoint?.optimizerSteps, null),
            epsilon: toFiniteNumber(
                bridgeTelemetry?.latestEpsilon,
                deriveCheckpointEpsilon(checkpoint, null)
            ),
            envSteps: toFiniteNumber(checkpoint?.envSteps, null),
            lastLoss: toFiniteNumber(
                checkpoint?.lastLoss,
                toFiniteNumber(bridgeTelemetry?.latestLoss, null)
            ),
        },
        state: checkpointResponse.state || null,
        resumeSource: checkpointResponse.resumeSource || null,
    };
}

async function waitForBridgeActionProbe(bridge, options = {}) {
    if (!bridge || typeof bridge.submitObservation !== 'function') {
        return {
            ok: false,
            action: null,
            failure: 'bridge-unavailable',
        };
    }
    const timeoutMs = Math.max(50, Math.min(30_000, Number(options.timeoutMs) || 1200));
    const observationLength = Math.max(8, Math.min(4096, Number(options.observationLength) || 40));
    bridge.submitObservation({
        mode: 'hunt',
        planarMode: true,
        domainId: 'hunt-2d',
        dt: 1 / 60,
        observation: new Array(observationLength).fill(0.25),
    });

    const startedAt = Date.now();
    let latestFailure = null;
    while ((Date.now() - startedAt) < timeoutMs) {
        const action = bridge.consumeLatestAction();
        if (action && typeof action === 'object') {
            return {
                ok: true,
                action,
                failure: null,
            };
        }
        const failure = bridge.consumeFailure();
        if (failure) {
            latestFailure = failure;
        }
        await sleep(20);
    }
    if (typeof bridge.recordFallback === 'function') {
        bridge.recordFallback('bridge-action-probe-timeout');
    }
    return {
        ok: false,
        action: null,
        failure: latestFailure || 'bridge-action-probe-timeout',
    };
}

async function resolveResumeCheckpoint(args) {
    const resumeToken = typeof args.get('resume-checkpoint') === 'string'
        ? args.get('resume-checkpoint').trim()
        : (typeof process.env.TRAINER_RESUME_CHECKPOINT === 'string'
            ? process.env.TRAINER_RESUME_CHECKPOINT.trim()
            : '');
    if (!resumeToken) {
        return {
            requested: false,
            mode: null,
            sourcePath: null,
            checkpoint: null,
            error: null,
            errorDetails: null,
        };
    }

    if (resumeToken.toLowerCase() === 'latest') {
        return {
            requested: true,
            mode: 'latest',
            sourcePath: 'latest',
            checkpoint: null,
            error: null,
            errorDetails: null,
        };
    }

    const sourcePath = resumeToken;
    const rawCheckpoint = await readJsonIfExists(sourcePath);
    const validation = validateDqnCheckpointPayload(rawCheckpoint);
    return {
        requested: true,
        mode: 'path',
        sourcePath: toRepoPath(sourcePath),
        checkpoint: validation.ok ? validation.checkpoint : null,
        error: validation.ok ? null : validation.error,
        errorDetails: validation.ok ? null : validation.details,
    };
}

async function submitBridgeCommand(bridge, type, payload = {}, timeoutMs = 1500) {
    if (!bridge || typeof bridge.submitCommand !== 'function') {
        return null;
    }
    return await bridge.submitCommand(type, payload, {
        timeoutMs: Math.max(20, Math.min(30_000, Number(timeoutMs) || 1500)),
    });
}

function buildRawConfigFromArgs(args) {
    const seeds = args.get('seeds');
    const modes = args.get('modes');
    const runnerProfile = typeof args.get('runner-profile') === 'string'
        ? args.get('runner-profile').trim()
        : (typeof process.env.TRAINING_RUNNER_PROFILE === 'string' ? process.env.TRAINING_RUNNER_PROFILE.trim() : '');
    const injectInvalidActions = parseOptionalBoolean(args.get('inject-invalid-actions'));
    const stepTimeoutRetries = parseInteger(args.get('step-timeout-retries'), null, 0, 10);
    return {
        episodes: parseInteger(args.get('episodes'), 3, 1, 100_000),
        seeds: typeof seeds === 'string' && seeds.trim() ? seeds : undefined,
        modes: typeof modes === 'string' && modes.trim() ? modes : undefined,
        maxSteps: parseInteger(args.get('max-steps'), 180, 1, 1_000_000),
        bridgeMode: args.get('bridge-mode') || 'local',
        runnerProfile: runnerProfile || undefined,
        injectInvalidActions: injectInvalidActions == null ? undefined : injectInvalidActions,
        stepTimeoutRetries: stepTimeoutRetries == null ? undefined : stepTimeoutRetries,
        timeouts: {
            stepMs: parseInteger(args.get('timeout-step-ms'), 75, 1, 60_000),
            episodeMs: parseInteger(args.get('timeout-episode-ms'), 20_000, 1, 10 * 60_000),
            runMs: parseInteger(args.get('timeout-run-ms'), 180_000, 1, 12 * 60 * 60_000),
        },
    };
}

function buildBridgeOptionsFromArgs(args) {
    return {
        enabled: true,
        url: args.get('bridge-url') || process.env.TRAINER_BRIDGE_URL || 'ws://127.0.0.1:8765',
        requireReadyMessage: parseBoolean(
            args.get('bridge-require-ready-message'),
            parseBoolean(process.env.TRAINER_BRIDGE_REQUIRE_READY_MESSAGE, true)
        ),
        readyMessageType: args.get('bridge-ready-message-type') || process.env.TRAINER_BRIDGE_READY_MESSAGE_TYPE || 'trainer-ready',
        timeoutMs: parseInteger(
            args.get('bridge-timeout-ms'),
            parseInteger(process.env.TRAINER_BRIDGE_TIMEOUT_MS, 80, 20, 10_000),
            20,
            10_000
        ),
        maxRetries: parseInteger(
            args.get('bridge-max-retries'),
            parseInteger(process.env.TRAINER_BRIDGE_MAX_RETRIES, 0, 0, 5),
            0,
            5
        ),
        retryDelayMs: parseInteger(
            args.get('bridge-retry-delay-ms'),
            parseInteger(process.env.TRAINER_BRIDGE_RETRY_DELAY_MS, 0, 0, 1_000),
            0,
            1_000
        ),
        maxPendingAcks: parseInteger(
            args.get('bridge-max-pending-acks'),
            parseInteger(process.env.TRAINER_BRIDGE_MAX_PENDING_ACKS, 512, 16, 8192),
            16,
            8192
        ),
        backpressureThreshold: parseInteger(
            args.get('bridge-backpressure-threshold'),
            parseInteger(process.env.TRAINER_BRIDGE_BACKPRESSURE_THRESHOLD, 384, 8, 8192),
            8,
            8192
        ),
        dropTrainingPayloadWhenBacklogged: parseBoolean(
            args.get('bridge-drop-training-when-backlogged'),
            parseBoolean(process.env.TRAINER_BRIDGE_DROP_TRAINING_WHEN_BACKLOGGED, true)
        ),
    };
}

async function main() {
    const args = parseArgMap(process.argv.slice(2));
    const stamp = normalizeTrainingRunStamp(args.get('stamp') || process.env.TRAINING_RUN_STAMP || null);
    const quiet = parseBoolean(args.get('quiet'), false);
    const writeLatest = parseBoolean(args.get('write-latest'), true);
    const strictBridge = parseBoolean(
        args.get('bridge-strict'),
        parseBoolean(process.env.TRAINER_BRIDGE_STRICT, true)
    );
    const resumeStrict = parseBoolean(
        args.get('resume-strict'),
        parseBoolean(process.env.TRAINER_RESUME_STRICT, false)
    );
    const writeCheckpoint = parseBoolean(
        args.get('write-checkpoint'),
        parseBoolean(process.env.TRAINER_WRITE_CHECKPOINT, true)
    );
    const config = buildRawConfigFromArgs(args);
    const layout = resolveTrainingRunArtifactLayout(stamp);

    await mkdir(layout.runDir, { recursive: true });
    const latestBefore = writeLatest
        ? await readJsonIfExists(layout.latestIndexPath)
        : null;
    if (writeLatest) {
        await writeJson(layout.latestBackupPath, {
            generatedAt: new Date().toISOString(),
            exists: latestBefore != null,
            latest: latestBefore,
        });
    }

    let bridge = null;
    let bridgeReady = null;
    let bridgeReadyPayload = null;
    let bridgeTelemetry = null;
    let bridgeActionProbe = null;
    let trainerStats = null;
    let opsKpis = null;
    let checkpointExport = null;
    let resumeInfo = {
        requested: false,
        mode: null,
        sourcePath: null,
        checkpoint: null,
        loaded: false,
        responseOk: null,
        error: null,
        errorDetails: null,
    };
    let trainerArtifactPath = null;
    let checkpointPath = null;
    if (config.bridgeMode === 'bridge') {
        bridge = new WebSocketTrainerBridge(buildBridgeOptionsFromArgs(args));
        if (typeof bridge.waitForReady === 'function') {
            const connectTimeoutMs = parseInteger(args.get('bridge-connect-timeout-ms'), 1500, 20, 30_000);
            bridgeReady = await bridge.waitForReady(connectTimeoutMs);
        }
        bridgeReadyPayload = typeof bridge.consumeLatestReadyPayload === 'function'
            ? bridge.consumeLatestReadyPayload()
            : null;
        if (strictBridge && bridgeReady !== true) {
            throw new Error('bridge-ready-check failed');
        }

        const resumeCandidate = await resolveResumeCheckpoint(args);
        resumeInfo = {
            ...resumeInfo,
            requested: resumeCandidate.requested,
            mode: resumeCandidate.mode || null,
            sourcePath: resumeCandidate.sourcePath,
            checkpoint: resumeCandidate.checkpoint,
            error: resumeCandidate.error || null,
            errorDetails: resumeCandidate.errorDetails || null,
        };
        if (resumeCandidate.requested) {
            if (resumeCandidate.mode === 'latest') {
                const checkpointLoadLatestResponse = await submitBridgeCommand(
                    bridge,
                    'trainer-checkpoint-load-latest',
                    {
                        strict: resumeStrict,
                    },
                    parseInteger(args.get('trainer-command-timeout-ms'), DEFAULT_TRAINER_COMMAND_TIMEOUT_MS, 20, 10 * 60_000)
                );
                resumeInfo.responseOk = checkpointLoadLatestResponse?.ok === true;
                resumeInfo.loaded = checkpointLoadLatestResponse?.ok === true && checkpointLoadLatestResponse?.loaded === true;
                if (!resumeInfo.loaded) {
                    resumeInfo.error = checkpointLoadLatestResponse?.error || 'checkpoint-load-latest-failed';
                }
            } else if (resumeCandidate.checkpoint) {
                const checkpointLoadResponse = await submitBridgeCommand(
                    bridge,
                    'trainer-checkpoint-load',
                    {
                        checkpoint: resumeCandidate.checkpoint,
                        resumeSource: resumeCandidate.sourcePath,
                        strict: resumeStrict,
                    },
                    parseInteger(args.get('trainer-command-timeout-ms'), DEFAULT_TRAINER_COMMAND_TIMEOUT_MS, 20, 10 * 60_000)
                );
                resumeInfo.responseOk = checkpointLoadResponse?.ok === true;
                resumeInfo.loaded = checkpointLoadResponse?.ok === true && checkpointLoadResponse?.loaded === true;
            } else {
                resumeInfo.responseOk = false;
                resumeInfo.loaded = false;
            }
            if (resumeStrict && !resumeInfo.loaded) {
                const reason = resumeInfo.error || 'checkpoint-resume-failed';
                throw new Error(`${reason} (${resumeInfo.sourcePath || 'unknown-source'})`);
            }
        }

        bridgeActionProbe = await waitForBridgeActionProbe(bridge, {
            timeoutMs: parseInteger(args.get('bridge-action-probe-timeout-ms'), 1200, 20, 30_000),
            observationLength: parseInteger(args.get('bridge-action-probe-observation-length'), 40, 8, 4096),
        });
        if (strictBridge && !bridgeActionProbe.ok) {
            throw new Error(`bridge-action-probe failed (${bridgeActionProbe.failure || 'no-action'})`);
        }
    }
    const runner = new TrainingAutomationRunner({ bridge });
    const summary = runner.run(config);
    if (bridge && typeof bridge.getTelemetrySnapshot === 'function') {
        const drainTimeoutMs = parseInteger(args.get('bridge-drain-timeout-ms'), 180_000, 20, 10 * 60_000);
        bridgeTelemetry = await waitForBridgeDrain(bridge, drainTimeoutMs);
        opsKpis = deriveTrainingOpsKpis(bridgeTelemetry);

        const commandTimeoutMs = parseInteger(
            args.get('trainer-command-timeout-ms'),
            DEFAULT_TRAINER_COMMAND_TIMEOUT_MS,
            20,
            10 * 60_000
        );
        const checkpointResponse = await submitBridgeCommand(
            bridge,
            'trainer-checkpoint-request',
            { stamp: layout.stamp },
            commandTimeoutMs
        );
        if (checkpointResponse?.ok === true && checkpointResponse?.checkpoint) {
            checkpointExport = checkpointResponse;
        }
        const statsResponse = await submitBridgeCommand(bridge, 'trainer-stats-request', {}, commandTimeoutMs);
        if (statsResponse?.ok === true) {
            trainerStats = statsResponse;
        } else if (checkpointExport) {
            trainerStats = buildTrainerStatsFallback(checkpointExport, bridgeTelemetry);
        }

        if (writeCheckpoint) {
            const written = await writeTrainerArtifacts({
                stamp: layout.stamp,
                generatedAt: new Date().toISOString(),
                resumeSource: resumeInfo?.sourcePath || null,
                checkpoint: checkpointExport?.checkpoint || null,
                trainer: trainerStats,
                bridge: bridgeTelemetry,
                opsKpis,
                runSummary: summary,
            });
            trainerArtifactPath = written.trainerArtifactPath;
            checkpointPath = written.checkpointPath;
        }
    }
    if (bridge && typeof bridge.close === 'function') {
        bridge.close();
    }
    const runArtifact = {
        contractVersion: TRAINING_AUTOMATION_RUN_CONTRACT_VERSION,
        stage: 'run',
        generatedAt: new Date().toISOString(),
        stamp: layout.stamp,
        runDir: layout.runDir,
        summary,
        bridgeReady,
        bridgeReadyPayload,
        bridgeActionProbe,
        bridgeTelemetry,
        opsKpis,
        trainerStats,
        checkpointPath: checkpointPath ? toRepoPath(checkpointPath) : null,
        trainerArtifactPath: trainerArtifactPath ? toRepoPath(trainerArtifactPath) : null,
        resume: {
            requested: resumeInfo.requested,
            mode: resumeInfo.mode,
            sourcePath: resumeInfo.sourcePath,
            loaded: resumeInfo.loaded,
            responseOk: resumeInfo.responseOk,
            error: resumeInfo.error,
            errorDetails: resumeInfo.errorDetails,
            strict: resumeStrict,
        },
    };
    await writeJson(layout.runArtifactPath, runArtifact);

    const evalExists = await fileExists(layout.evalArtifactPath);
    const gateExists = await fileExists(layout.gateArtifactPath);
    const trainerExists = trainerArtifactPath ? await fileExists(trainerArtifactPath) : false;
    const checkpointExists = checkpointPath ? await fileExists(checkpointPath) : false;
    const latestIndex = buildTrainingLatestIndex({
        stamp: layout.stamp,
        generatedAt: new Date().toISOString(),
        lastCompletedStage: 'run',
        resumeSource: resumeInfo?.sourcePath || null,
        artifacts: {
            run: { exists: true, status: 'completed' },
            eval: { exists: evalExists, status: evalExists ? 'completed' : 'pending' },
            gate: { exists: gateExists, status: gateExists ? 'completed' : 'pending' },
            trainer: { exists: trainerExists, status: trainerExists ? 'completed' : 'pending' },
            checkpoint: { exists: checkpointExists, status: checkpointExists ? 'completed' : 'pending' },
        },
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
    if (writeLatest) {
        await mkdir(layout.rootDir, { recursive: true });
        await writeJson(layout.latestIndexPath, latestIndex);
    }

    const output = {
        ok: true,
        stage: 'run',
        stamp: layout.stamp,
        bridgeMode: config.bridgeMode,
        bridgeActive: !!bridge,
        bridgeReady,
        bridgeActionProbe,
        runArtifactPath: layout.runArtifactPath,
        trainerArtifactPath: trainerArtifactPath ? toRepoPath(trainerArtifactPath) : null,
        checkpointPath: checkpointPath ? toRepoPath(checkpointPath) : null,
        latestIndexPath: writeLatest ? layout.latestIndexPath : null,
        resume: {
            requested: resumeInfo.requested,
            mode: resumeInfo.mode,
            sourcePath: resumeInfo.sourcePath,
            loaded: resumeInfo.loaded,
            responseOk: resumeInfo.responseOk,
            error: resumeInfo.error,
            strict: resumeStrict,
        },
        bridgeTelemetry,
        opsKpis,
        trainerStats: trainerStats ? {
            sessionId: trainerStats.sessionId || null,
            replaySize: trainerStats.replay?.size ?? null,
            optimizerSteps: trainerStats.model?.optimizerSteps ?? null,
            epsilon: trainerStats.model?.epsilon ?? null,
        } : null,
        kpis: summary.kpis,
        totals: summary.totals,
    };
    if (!quiet) {
        console.log(JSON.stringify(output, null, 2));
    }
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});
