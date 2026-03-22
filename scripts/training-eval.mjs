import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { TrainingTransportFacade } from '../src/entities/ai/training/TrainingTransportFacade.js';
import { WebSocketTrainerBridge } from '../src/entities/ai/training/WebSocketTrainerBridge.js';
import { deriveTrainingGateKpis } from '../src/state/training/TrainingGateEvaluator.js';
import { TRAINING_GATE_BASELINE_REFERENCE } from '../src/state/training/TrainingGateThresholds.js';
import { deriveTrainingOpsKpis } from '../src/state/training/TrainingOpsKpiContractV36.js';
import { buildBotValidationEval } from './training-bot-validation-lane.mjs';
import {
    buildTrainingLatestIndex,
    resolveTrainingRunArtifactLayout,
} from '../src/entities/ai/training/TrainingAutomationContractV33.js';

const EVAL_SEEDS = Object.freeze([11, 23, 37, 41]);
const EVAL_DOMAINS = Object.freeze([
    Object.freeze({ mode: 'classic', planarMode: false, domainId: 'classic-3d' }),
    Object.freeze({ mode: 'classic', planarMode: true, domainId: 'classic-2d' }),
    Object.freeze({ mode: 'hunt', planarMode: false, domainId: 'hunt-3d' }),
    Object.freeze({ mode: 'hunt', planarMode: true, domainId: 'hunt-2d' }),
]);
const DEFAULT_RUNS_ROOT = path.join('data', 'training', 'runs');
const PLAY_EVAL_SCENARIOS = Object.freeze([
    Object.freeze({ scenarioId: 'play-classic-3d-a', mode: 'classic', planarMode: false, domainId: 'classic-3d', seed: 101, variant: 'done' }),
    Object.freeze({ scenarioId: 'play-classic-2d-b', mode: 'classic', planarMode: true, domainId: 'classic-2d', seed: 202, variant: 'truncated' }),
    Object.freeze({ scenarioId: 'play-hunt-3d-a', mode: 'hunt', planarMode: false, domainId: 'hunt-3d', seed: 303, variant: 'done' }),
    Object.freeze({ scenarioId: 'play-hunt-2d-b', mode: 'hunt', planarMode: true, domainId: 'hunt-2d', seed: 404, variant: 'truncated' }),
]);
const PLAY_EVAL_BASELINE = Object.freeze({
    scenarioReturnMean: 1.615,
    scenarioWinRate: 0.5,
});

function toRepoPath(targetPath) {
    return String(targetPath || '').split(path.sep).join('/');
}

function pad2(value) {
    return String(value).padStart(2, '0');
}

function createRunStamp(date = new Date()) {
    return [
        date.getUTCFullYear(),
        pad2(date.getUTCMonth() + 1),
        pad2(date.getUTCDate()),
    ].join('') + '-' + [
        pad2(date.getUTCHours()),
        pad2(date.getUTCMinutes()),
        pad2(date.getUTCSeconds()),
    ].join('');
}

function parseArgs(argv = []) {
    const parsed = {};
    for (let i = 0; i < argv.length; i++) {
        const token = String(argv[i] || '');
        if (!token.startsWith('--')) continue;
        const stripped = token.slice(2);
        const eqIndex = stripped.indexOf('=');
        if (eqIndex >= 0) {
            const key = stripped.slice(0, eqIndex);
            const value = stripped.slice(eqIndex + 1);
            parsed[key] = value;
            continue;
        }
        const next = argv[i + 1];
        if (typeof next === 'string' && !next.startsWith('--')) {
            parsed[stripped] = next;
            i += 1;
        } else {
            parsed[stripped] = true;
        }
    }
    return parsed;
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

function toInt(value, fallback = 0, min = 0, max = 1_000_000) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function roundMetric(value) {
    return Math.round(toFiniteNumber(value, 0) * 1_000_000) / 1_000_000;
}

function createDeterministicClock(startMs = 1_000_000) {
    let currentMs = toInt(startMs, 1_000_000);
    return {
        now() {
            return currentMs;
        },
        advance(deltaMs) {
            currentMs += Math.max(0, toInt(deltaMs, 0));
            return currentMs;
        },
    };
}

function flushAsyncEvents() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

async function readJsonIfExists(filePath) {
    try {
        const raw = await readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

async function writeJson(filePath, payload) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function upsertLatestIndex(runStamp, updates = {}) {
    const latestPath = path.join(DEFAULT_RUNS_ROOT, 'latest.json');
    const current = await readJsonIfExists(latestPath) || {};
    const layout = resolveTrainingRunArtifactLayout(runStamp);

    const currentRunPath = current?.artifacts?.run?.path || current?.run || null;
    const currentEvalPath = current?.artifacts?.eval?.path || current?.eval || null;
    const currentGatePath = current?.artifacts?.gate?.path || current?.gate || null;
    const currentTrainerPath = current?.artifacts?.trainer?.path || current?.trainer || null;
    const currentCheckpointPath = current?.artifacts?.checkpoint?.path || current?.checkpoint || null;
    const runPath = Object.prototype.hasOwnProperty.call(updates, 'run') ? updates.run : currentRunPath;
    const evalPath = Object.prototype.hasOwnProperty.call(updates, 'eval') ? updates.eval : currentEvalPath;
    const gatePath = Object.prototype.hasOwnProperty.call(updates, 'gate') ? updates.gate : currentGatePath;
    const trainerPath = Object.prototype.hasOwnProperty.call(updates, 'trainer') ? updates.trainer : currentTrainerPath;
    const checkpointPath = Object.prototype.hasOwnProperty.call(updates, 'checkpoint') ? updates.checkpoint : currentCheckpointPath;
    const resumeSource = Object.prototype.hasOwnProperty.call(updates, 'resumeSource')
        ? updates.resumeSource
        : (current?.resumeSource || null);

    const next = buildTrainingLatestIndex({
        stamp: runStamp,
        generatedAt: new Date().toISOString(),
        lastCompletedStage: gatePath ? 'gate' : 'eval',
        resumeSource,
        artifacts: {
            run: { status: runPath ? 'completed' : 'pending', exists: !!runPath },
            eval: { status: evalPath ? 'completed' : 'pending', exists: !!evalPath },
            gate: { status: gatePath ? 'completed' : 'pending', exists: !!gatePath },
            trainer: {
                status: trainerPath ? 'completed' : 'pending',
                exists: !!trainerPath,
            },
            checkpoint: {
                status: checkpointPath ? 'completed' : 'pending',
                exists: !!checkpointPath,
            },
        },
    });
    if (runPath) next.artifacts.run.path = runPath;
    if (evalPath) next.artifacts.eval.path = evalPath;
    if (gatePath) next.artifacts.gate.path = gatePath;
    if (trainerPath) next.artifacts.trainer.path = trainerPath;
    if (checkpointPath) next.artifacts.checkpoint.path = checkpointPath;
    next.runDir = layout.runDir;
    await writeJson(latestPath, next);
    return {
        latestPath,
        latest: next,
    };
}

function createObservation(seed, stepIndex, domainIndex) {
    const vector = new Array(40).fill(0);
    const normalizedSeed = (seed % 101) / 100;
    const normalizedStep = Math.min(1, stepIndex / 10);
    vector[0] = Math.max(0, Math.min(1, 0.15 + normalizedSeed * 0.6 + normalizedStep * 0.15));
    vector[1] = Math.max(0, Math.min(1, 0.9 - normalizedStep * 0.35));
    vector[2] = Math.max(0, Math.min(1, domainIndex / 5));
    vector[17] = domainIndex % 2 === 0 ? 0 : 1;
    vector[18] = domainIndex >= 2 ? 1 : 0;
    return vector;
}

function buildScenarioAction(seed, stepIndex) {
    if ((seed + stepIndex) % 4 === 0) {
        return {
            yawLeft: 'invalid',
            shootItem: true,
            shootItemIndex: 99,
        };
    }
    if ((seed + stepIndex) % 3 === 0) {
        return {
            yawRight: true,
            boost: true,
            shootMG: true,
        };
    }
    return {
        yawLeft: true,
        shootItem: stepIndex % 2 === 0,
        shootItemIndex: stepIndex % 2 === 0 ? 0 : -1,
    };
}

function buildRewardSignals(seed, stepIndex, doneVariant) {
    const dealt = ((seed + stepIndex) % 5) + 1;
    return {
        survival: true,
        itemUses: stepIndex % 2,
        damageDealt: dealt,
        kills: doneVariant && stepIndex === 5 ? 1 : 0,
        won: doneVariant && stepIndex === 5,
    };
}

function countActionMismatch(requestedAction, sanitizedAction) {
    const requested = requestedAction && typeof requestedAction === 'object'
        ? requestedAction
        : null;
    const sanitized = sanitizedAction && typeof sanitizedAction === 'object'
        ? sanitizedAction
        : null;
    return JSON.stringify(requested) === JSON.stringify(sanitized) ? 0 : 1;
}

function runEpisodeScenario(config) {
    const bridgeFrames = [];
    const mockBridge = {
        enabled: true,
        submitTrainingPayload(type, payload) {
            bridgeFrames.push({
                type,
                episodeId: payload?.episodeId || null,
                stepIndex: toInt(payload?.stepIndex, 0),
            });
        },
    };
    const facade = new TrainingTransportFacade({
        bridge: mockBridge,
        episode: {
            defaultMaxSteps: config.maxSteps,
        },
    });

    const resetPacket = facade.reset({
        mode: config.mode,
        planarMode: config.planarMode,
        matchId: `eval-${config.domainId}-${config.seed}`,
        maxSteps: config.maxSteps,
        observation: createObservation(config.seed, 0, config.domainIndex),
    });

    let steps = 0;
    let actionCount = 0;
    let invalidActionCount = 0;
    let episodeReturn = 0;
    let latestTransition = resetPacket.transition;
    for (let stepIndex = 1; stepIndex <= config.maxSteps + 1; stepIndex++) {
        const requestedAction = buildScenarioAction(config.seed, stepIndex);
        const done = config.variant === 'done' && stepIndex === config.maxSteps;
        const packet = facade.step({
            mode: config.mode,
            planarMode: config.planarMode,
            maxSteps: config.maxSteps,
            observation: createObservation(config.seed, stepIndex, config.domainIndex),
            action: requestedAction,
            inventoryLength: 2,
            rewardSignals: buildRewardSignals(config.seed, stepIndex, config.variant === 'done'),
            done,
            terminalReason: done ? 'match-win' : null,
        });
        const transition = packet.transition;
        steps += 1;
        actionCount += 1;
        invalidActionCount += countActionMismatch(requestedAction, transition?.action);
        episodeReturn += toFiniteNumber(transition?.reward, 0);
        latestTransition = transition;
        if (transition?.done || transition?.truncated) {
            break;
        }
    }

    return {
        scenarioId: config.scenarioId,
        domainId: config.domainId,
        mode: config.mode,
        planarMode: config.planarMode,
        seed: config.seed,
        variant: config.variant,
        steps,
        actionCount,
        invalidActionCount,
        episodeReturn: roundMetric(episodeReturn),
        done: !!latestTransition?.done,
        truncated: !!latestTransition?.truncated,
        terminalReason: latestTransition?.info?.terminalReason || null,
        truncatedReason: latestTransition?.info?.truncatedReason || null,
        transportFrames: bridgeFrames.length,
    };
}

function buildPlayEvalResult() {
    const scenarios = [];
    for (let i = 0; i < PLAY_EVAL_SCENARIOS.length; i++) {
        const scenario = PLAY_EVAL_SCENARIOS[i];
        scenarios.push(runEpisodeScenario({
            scenarioId: scenario.scenarioId,
            domainIndex: i % EVAL_DOMAINS.length,
            domainId: scenario.domainId,
            mode: scenario.mode,
            planarMode: scenario.planarMode,
            seed: scenario.seed,
            variant: scenario.variant,
            maxSteps: scenario.variant === 'done' ? 6 : 4,
        }));
    }
    const scenarioCount = scenarios.length;
    const winCount = scenarios.filter((entry) => entry.terminalReason === 'match-win').length;
    const returnSum = scenarios.reduce((sum, entry) => sum + toFiniteNumber(entry.episodeReturn, 0), 0);
    const scenarioReturnMean = scenarioCount > 0 ? roundMetric(returnSum / scenarioCount) : 0;
    const scenarioWinRate = scenarioCount > 0 ? roundMetric(winCount / scenarioCount) : 0;
    return {
        contractVersion: 'v36-play-eval-v1',
        scenarios,
        metrics: {
            scenarioCount,
            scenarioReturnMean,
            scenarioWinRate,
        },
        baseline: {
            reference: PLAY_EVAL_BASELINE,
            drift: {
                scenarioReturnMean: roundMetric(scenarioReturnMean - PLAY_EVAL_BASELINE.scenarioReturnMean),
                scenarioWinRate: roundMetric(scenarioWinRate - PLAY_EVAL_BASELINE.scenarioWinRate),
            },
        },
    };
}

function createMockSocketFactory(onSend) {
    return () => {
        const listeners = new Map();
        const emit = (type, payload) => {
            const handlers = listeners.get(type) || [];
            for (const handler of handlers) {
                handler(payload);
            }
        };
        const socket = {
            readyState: 1,
            addEventListener(type, handler) {
                const handlers = listeners.get(type) || [];
                handlers.push(handler);
                listeners.set(type, handlers);
            },
            removeEventListener(type, handler) {
                const handlers = listeners.get(type) || [];
                listeners.set(type, handlers.filter((entry) => entry !== handler));
            },
            send(raw) {
                let envelope = null;
                try {
                    envelope = JSON.parse(raw);
                } catch {
                    emit('message', { data: '{invalid-json' });
                    return;
                }
                onSend({
                    envelope,
                    emitMessage(responsePayload, beforeEmit = null) {
                        setTimeout(() => {
                            if (typeof beforeEmit === 'function') {
                                beforeEmit();
                            }
                            emit('message', { data: JSON.stringify(responsePayload) });
                        }, 0);
                    },
                });
            },
            close() {
                this.readyState = 3;
                emit('close', {});
            },
        };
        setTimeout(() => {
            emit('open', {});
        }, 0);
        return socket;
    };
}

async function runBridgeScenarioSuccess() {
    const clock = createDeterministicClock();
    const bridge = new WebSocketTrainerBridge({
        enabled: true,
        timeoutMs: 40,
        maxRetries: 1,
        retryDelayMs: 0,
        now: () => clock.now(),
        socketFactory: createMockSocketFactory(({ envelope, emitMessage }) => {
            if (envelope.type === 'bot-action-request') {
                emitMessage({
                    id: envelope.id,
                    action: { yawLeft: true },
                }, () => {
                    clock.advance(6);
                });
                return;
            }
            emitMessage({
                id: envelope.id,
                ok: true,
            }, () => {
                clock.advance(4);
            });
        }),
    });

    bridge.submitObservation({
        mode: 'classic',
        planarMode: false,
        dt: 1 / 60,
        observation: new Array(40).fill(0.2),
    });
    await flushAsyncEvents();
    const action = bridge.consumeLatestAction();
    if (!action) bridge.recordFallback('success-no-action');

    bridge.submitTrainingStep({
        operation: 'step',
        episodeId: 'bridge-success',
        stepIndex: 1,
        reward: 0.2,
    });
    await flushAsyncEvents();
    const ack = bridge.consumeLatestResponse();
    const failure = bridge.consumeFailure();
    const telemetry = bridge.getTelemetrySnapshot();
    bridge.close();

    return {
        scenarioId: 'bridge-success-action-ack',
        actionReceived: !!action,
        ackReceived: !!ack?.ok,
        failure: failure || null,
        telemetry,
    };
}

async function runBridgeScenarioRetrySuccess() {
    const clock = createDeterministicClock();
    let actionRequests = 0;
    const bridge = new WebSocketTrainerBridge({
        enabled: true,
        timeoutMs: 8,
        maxRetries: 1,
        retryDelayMs: 0,
        now: () => clock.now(),
        socketFactory: createMockSocketFactory(({ envelope, emitMessage }) => {
            if (envelope.type === 'bot-action-request') {
                actionRequests += 1;
                if (actionRequests === 1) {
                    return;
                }
                emitMessage({
                    id: envelope.id,
                    action: { yawRight: true },
                }, () => {
                    clock.advance(3);
                });
                return;
            }
            emitMessage({
                id: envelope.id,
                ok: true,
            }, () => {
                clock.advance(2);
            });
        }),
    });

    bridge.submitObservation({
        mode: 'hunt',
        planarMode: true,
        dt: 1 / 60,
        observation: new Array(40).fill(0.4),
    });
    clock.advance(25);
    bridge.consumeFailure();
    await flushAsyncEvents();
    const action = bridge.consumeLatestAction();
    if (!action) bridge.recordFallback('retry-no-action');
    const failure = bridge.consumeFailure();
    const telemetry = bridge.getTelemetrySnapshot();
    bridge.close();

    return {
        scenarioId: 'bridge-retry-then-success',
        actionReceived: !!action,
        ackReceived: false,
        failure: failure || null,
        telemetry,
    };
}

async function runBridgeScenarioTimeoutFallback() {
    const clock = createDeterministicClock();
    const bridge = new WebSocketTrainerBridge({
        enabled: true,
        timeoutMs: 8,
        maxRetries: 0,
        retryDelayMs: 0,
        now: () => clock.now(),
        socketFactory: createMockSocketFactory(() => {
            // no response to force timeout + fallback path
        }),
    });

    bridge.submitObservation({
        mode: 'classic',
        planarMode: true,
        dt: 1 / 60,
        observation: new Array(40).fill(0.1),
    });
    clock.advance(25);
    const failure = bridge.consumeFailure();
    await flushAsyncEvents();
    const action = bridge.consumeLatestAction();
    if (!action) bridge.recordFallback('eval-timeout-fallback');
    const telemetry = bridge.getTelemetrySnapshot();
    bridge.close();

    return {
        scenarioId: 'bridge-hard-timeout',
        actionReceived: !!action,
        ackReceived: false,
        failure: failure || null,
        telemetry,
    };
}

function aggregateBridgeTelemetry(scenarios = []) {
    const aggregate = {
        requestsSent: 0,
        actionRequests: 0,
        trainingRequests: 0,
        commandRequests: 0,
        responsesReceived: 0,
        actionResponses: 0,
        ackResponses: 0,
        retries: 0,
        timeouts: 0,
        failures: 0,
        fallbacks: 0,
        latencyP95Ms: 0,
        latencyMeanMs: 0,
        latencySampleCount: 0,
        scenarioCount: scenarios.length,
    };

    for (const scenario of scenarios) {
        const telemetry = scenario?.telemetry || {};
        aggregate.requestsSent += toInt(telemetry.requestsSent, 0);
        aggregate.actionRequests += toInt(telemetry.actionRequests, 0);
        aggregate.trainingRequests += toInt(telemetry.trainingRequests, 0);
        aggregate.commandRequests += toInt(telemetry.commandRequests, 0);
        aggregate.responsesReceived += toInt(telemetry.responsesReceived, 0);
        aggregate.actionResponses += toInt(telemetry.actionResponses, 0);
        aggregate.ackResponses += toInt(telemetry.ackResponses, 0);
        aggregate.retries += toInt(telemetry.retries, 0);
        aggregate.timeouts += toInt(telemetry.timeouts, 0);
        aggregate.failures += toInt(telemetry.failures, 0);
        aggregate.fallbacks += toInt(telemetry.fallbacks, 0);
        aggregate.latencySampleCount += toInt(telemetry.latencySampleCount, 0);
        aggregate.latencyMeanMs += toFiniteNumber(telemetry.latencyMeanMs, 0);
        aggregate.latencyP95Ms = Math.max(
            aggregate.latencyP95Ms,
            toFiniteNumber(telemetry.latencyP95Ms, 0)
        );
    }

    if (aggregate.scenarioCount > 0) {
        aggregate.latencyMeanMs = roundMetric(aggregate.latencyMeanMs / aggregate.scenarioCount);
    } else {
        aggregate.latencyMeanMs = 0;
    }
    aggregate.latencyP95Ms = roundMetric(aggregate.latencyP95Ms);
    return aggregate;
}

function buildBaselineDrift(kpis) {
    const baseline = TRAINING_GATE_BASELINE_REFERENCE;
    const metricKeys = [
        'episodeReturnMean',
        'terminalRate',
        'truncationRate',
        'invalidActionRate',
        'timeoutRate',
        'fallbackRate',
        'actionCoverage',
        'responseCoverage',
        'bridgeTimeoutRate',
        'bridgeFallbackRate',
        'bridgeLatencyP95Ms',
    ];
    const drift = [];
    for (const metricName of metricKeys) {
        const baselineValue = toFiniteNumber(baseline[metricName], 0);
        const currentValue = toFiniteNumber(kpis[metricName], 0);
        const delta = roundMetric(currentValue - baselineValue);
        const relative = baselineValue === 0
            ? null
            : roundMetric((delta / baselineValue) * 100);
        drift.push({
            metric: metricName,
            baseline: roundMetric(baselineValue),
            value: roundMetric(currentValue),
            delta,
            relativePercent: relative,
        });
    }
    return drift;
}

async function resolveRunArtifact(runDir) {
    const runArtifactPath = path.join(runDir, 'run.json');
    const direct = await readJsonIfExists(runArtifactPath);
    if (direct) {
        return {
            path: runArtifactPath,
            importedFromLegacy: false,
            artifact: direct,
        };
    }

    const legacyPath = path.join('data', 'training', 'training_smoke_latest.json');
    const legacy = await readJsonIfExists(legacyPath);
    if (!legacy) {
        return {
            path: null,
            importedFromLegacy: false,
            artifact: null,
        };
    }

    const migrated = {
        migratedFrom: toRepoPath(legacyPath),
        migratedAt: new Date().toISOString(),
        source: 'training-smoke-fallback',
        payload: legacy,
    };
    await writeJson(runArtifactPath, migrated);
    return {
        path: runArtifactPath,
        importedFromLegacy: true,
        artifact: migrated,
    };
}

async function resolveBotValidation(runDir, args) {
    const configuredReportPath = typeof args['bot-validation-report'] === 'string' && args['bot-validation-report'].trim()
        ? args['bot-validation-report'].trim()
        : path.join(runDir, 'bot-validation-report.json');
    const report = await readJsonIfExists(configuredReportPath);
    return buildBotValidationEval(report, {
        reportPath: toRepoPath(configuredReportPath),
        exists: report != null,
    });
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const writeLatest = parseBoolean(args['write-latest'], true);
    const runStampArg = typeof args.stamp === 'string' ? args.stamp.trim() : '';
    const runStamp = runStampArg || createRunStamp();
    const runDir = path.join(DEFAULT_RUNS_ROOT, runStamp);

    const episodes = [];
    const runtimeErrors = [];
    let scenarioCounter = 0;

    for (let domainIndex = 0; domainIndex < EVAL_DOMAINS.length; domainIndex++) {
        const domain = EVAL_DOMAINS[domainIndex];
        for (let seedIndex = 0; seedIndex < EVAL_SEEDS.length; seedIndex++) {
            const seed = EVAL_SEEDS[seedIndex];
            const variant = seedIndex % 2 === 0 ? 'done' : 'truncated';
            scenarioCounter += 1;
            const scenarioConfig = {
                scenarioId: `eval-${scenarioCounter}`,
                domainIndex,
                domainId: domain.domainId,
                mode: domain.mode,
                planarMode: domain.planarMode,
                seed,
                variant,
                maxSteps: variant === 'done' ? 5 : 3,
            };
            try {
                episodes.push(runEpisodeScenario(scenarioConfig));
            } catch (error) {
                runtimeErrors.push({
                    scenarioId: scenarioConfig.scenarioId,
                    message: error?.message || String(error),
                });
            }
        }
    }

    const bridgeScenarios = [];
    for (const runner of [
        runBridgeScenarioSuccess,
        runBridgeScenarioRetrySuccess,
        runBridgeScenarioTimeoutFallback,
    ]) {
        try {
            bridgeScenarios.push(await runner());
        } catch (error) {
            runtimeErrors.push({
                scenarioId: runner.name,
                message: error?.message || String(error),
            });
        }
    }
    const bridgeTelemetry = aggregateBridgeTelemetry(bridgeScenarios);
    const opsKpis = deriveTrainingOpsKpis(bridgeTelemetry);
    const kpis = deriveTrainingGateKpis({
        episodes,
        bridgeTelemetry,
        runtimeErrors,
    });
    const runArtifact = await resolveRunArtifact(runDir);
    const playEval = buildPlayEvalResult();
    const botValidation = await resolveBotValidation(runDir, args);

    const evalArtifact = {
        ok: runtimeErrors.length === 0,
        runStamp,
        generatedAt: new Date().toISOString(),
        contractVersion: 'v33-eval-b1',
        config: {
            seeds: EVAL_SEEDS,
            domains: EVAL_DOMAINS,
            bridgeScenarios: bridgeScenarios.map((entry) => entry.scenarioId),
        },
        source: {
            runArtifactPath: runArtifact.path ? toRepoPath(runArtifact.path) : null,
            runArtifactImportedFromLegacy: runArtifact.importedFromLegacy,
            botValidationReportPath: botValidation.source?.reportPath || null,
            botValidationReportExists: botValidation.source?.exists === true,
        },
        episodes,
        bridge: {
            scenarios: bridgeScenarios,
            telemetry: bridgeTelemetry,
            opsKpis,
        },
        metrics: {
            ...kpis,
            timeoutRate: opsKpis.timeoutRate,
            fallbackRate: opsKpis.fallbackRate,
            actionCoverage: opsKpis.actionCoverage,
            responseCoverage: opsKpis.responseCoverage,
            runtimeErrorCount: runtimeErrors.length,
            botValidationEnabled: botValidation.enabled === true,
            botValidationAverageBotSurvival: botValidation.metrics?.averageBotSurvival ?? null,
        },
        playEval,
        botValidation,
        baseline: {
            reference: TRAINING_GATE_BASELINE_REFERENCE,
            drift: buildBaselineDrift(kpis),
        },
        runtimeErrors,
    };

    const evalPath = path.join(runDir, 'eval.json');
    await writeJson(evalPath, evalArtifact);
    const latestResult = writeLatest
        ? await upsertLatestIndex(runStamp, {
            run: runArtifact.path ? toRepoPath(runArtifact.path) : null,
            eval: toRepoPath(evalPath),
        })
        : null;

    console.log(JSON.stringify({
        ok: evalArtifact.ok,
        runStamp,
        evalPath: toRepoPath(evalPath),
        latestIndexPath: latestResult ? toRepoPath(latestResult.latestPath) : null,
        episodeCount: kpis.episodeCount,
        metrics: {
            episodeReturnMean: kpis.episodeReturnMean,
            terminalRate: kpis.terminalRate,
            truncationRate: kpis.truncationRate,
            invalidActionRate: kpis.invalidActionRate,
            runtimeErrorCount: runtimeErrors.length,
            timeoutRate: opsKpis.timeoutRate,
            fallbackRate: opsKpis.fallbackRate,
            actionCoverage: opsKpis.actionCoverage,
            bridgeTimeoutRate: kpis.bridgeTimeoutRate,
            bridgeFallbackRate: kpis.bridgeFallbackRate,
            bridgeLatencyP95Ms: kpis.bridgeLatencyP95Ms,
            playEvalScenarioReturnMean: playEval.metrics.scenarioReturnMean,
            playEvalScenarioWinRate: playEval.metrics.scenarioWinRate,
            botValidationAverageBotSurvival: botValidation.metrics?.averageBotSurvival ?? null,
        },
    }, null, 2));

    if (runtimeErrors.length > 0) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});
