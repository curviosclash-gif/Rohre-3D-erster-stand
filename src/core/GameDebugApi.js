import { BotValidationService } from '../state/validation/BotValidationService.js';
import { DeveloperTrainingController } from './DeveloperTrainingController.js';
import {
    TRAINING_AUTOMATION_CONTRACT_VERSION,
    TRAINING_GATE_CONTRACT_VERSION,
} from '../shared/contracts/TrainingRuntimeContract.js';
import { toFiniteNumber } from '../utils/MathOps.js';

const TRAINING_ARTIFACT_ROOT = 'data/training/runs';
const DEFAULT_AUTOMATION_CONFIG = Object.freeze({
    episodes: 3,
    seeds: Object.freeze([3, 7, 11]),
    modes: Object.freeze(['classic-3d', 'hunt-3d']),
    maxSteps: 180,
    inventoryLength: 2,
    bridgeMode: 'local',
    timeoutMs: 800,
});
const DEFAULT_GATE_THRESHOLDS = Object.freeze({
    minEpisodeReturnMean: 0.1,
    minTerminalRate: 0.5,
    maxTruncationRate: 0.75,
    maxInvalidActionRate: 0.05,
    maxRuntimeErrorCount: 0,
});

function toInt(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const intValue = Math.trunc(numeric);
    const minValue = Number.isFinite(Number(min)) ? Number(min) : intValue;
    const maxValue = Number.isFinite(Number(max)) ? Number(max) : intValue;
    return Math.max(minValue, Math.min(maxValue, intValue));
}

function toRate(value, fallback) {
    const numeric = toFiniteNumber(value, fallback);
    return Math.max(0, Math.min(1, numeric));
}

function roundMetric(value, decimals = 6) {
    const numeric = toFiniteNumber(value, 0);
    const factor = 10 ** decimals;
    return Math.round(numeric * factor) / factor;
}

function cloneSerializable(value) {
    if (value === null || value === undefined) return value;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

function normalizeBridgeMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return DEFAULT_AUTOMATION_CONFIG.bridgeMode;
    return normalized;
}

function normalizeDomainMode(modeToken) {
    const normalized = String(modeToken || '').trim().toLowerCase();
    if (normalized === 'classic' || normalized === 'classic-3d' || normalized === 'classic3d') {
        return { mode: 'classic', planarMode: false, domainId: 'classic-3d' };
    }
    if (normalized === 'classic-2d' || normalized === 'classic2d' || normalized === 'planar') {
        return { mode: 'classic', planarMode: true, domainId: 'classic-2d' };
    }
    if (normalized === 'hunt' || normalized === 'fight' || normalized === 'hunt-3d' || normalized === 'hunt3d' || normalized === 'fight-3d' || normalized === 'fight3d') {
        return { mode: 'hunt', planarMode: false, domainId: 'hunt-3d' };
    }
    if (normalized === 'hunt-2d' || normalized === 'hunt2d' || normalized === 'fight-2d' || normalized === 'fight2d') {
        return { mode: 'hunt', planarMode: true, domainId: 'hunt-2d' };
    }
    return null;
}

function normalizeModeList(value) {
    const fallback = [...DEFAULT_AUTOMATION_CONFIG.modes];
    const rawList = Array.isArray(value)
        ? value
        : String(value || '')
            .split(/[,\s;]+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 0);
    const normalized = rawList
        .map((token) => normalizeDomainMode(token))
        .filter((entry) => !!entry)
        .map((entry) => entry.domainId);
    if (normalized.length === 0) return fallback;
    return Array.from(new Set(normalized));
}

function normalizeSeedList(value) {
    const fallback = [...DEFAULT_AUTOMATION_CONFIG.seeds];
    const rawList = Array.isArray(value)
        ? value
        : String(value || '')
            .split(/[,\s;]+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 0);
    const normalized = rawList
        .map((token) => toInt(token, Number.NaN, 0, 1_000_000))
        .filter((seed) => Number.isFinite(seed));
    if (normalized.length === 0) return fallback;
    return Array.from(new Set(normalized));
}

function normalizeAutomationConfig(input = {}) {
    const resolvedInput = input && typeof input === 'object' ? input : {};
    return {
        episodes: toInt(resolvedInput.episodes, DEFAULT_AUTOMATION_CONFIG.episodes, 1, 500),
        seeds: normalizeSeedList(resolvedInput.seeds),
        modes: normalizeModeList(resolvedInput.modes),
        maxSteps: toInt(resolvedInput.maxSteps, DEFAULT_AUTOMATION_CONFIG.maxSteps, 1, 10_000),
        inventoryLength: toInt(resolvedInput.inventoryLength, DEFAULT_AUTOMATION_CONFIG.inventoryLength, 0, 20),
        bridgeMode: normalizeBridgeMode(resolvedInput.bridgeMode),
        timeoutMs: toInt(resolvedInput.timeoutMs, DEFAULT_AUTOMATION_CONFIG.timeoutMs, 10, 120_000),
    };
}

function normalizeGateThresholds(input = {}) {
    const resolvedInput = input && typeof input === 'object' ? input : {};
    return {
        minEpisodeReturnMean: toFiniteNumber(
            resolvedInput.minEpisodeReturnMean,
            DEFAULT_GATE_THRESHOLDS.minEpisodeReturnMean
        ),
        minTerminalRate: toRate(
            resolvedInput.minTerminalRate,
            DEFAULT_GATE_THRESHOLDS.minTerminalRate
        ),
        maxTruncationRate: toRate(
            resolvedInput.maxTruncationRate,
            DEFAULT_GATE_THRESHOLDS.maxTruncationRate
        ),
        maxInvalidActionRate: toRate(
            resolvedInput.maxInvalidActionRate,
            DEFAULT_GATE_THRESHOLDS.maxInvalidActionRate
        ),
        maxRuntimeErrorCount: toInt(
            resolvedInput.maxRuntimeErrorCount,
            DEFAULT_GATE_THRESHOLDS.maxRuntimeErrorCount,
            0,
            1000
        ),
    };
}

function createRunStamp() {
    const now = new Date();
    const iso = now.toISOString().replace(/[-:.]/g, '').replace('T', '_').replace('Z', '');
    return `${iso}_${Math.trunc(Math.random() * 10_000)}`;
}

function createArtifactPaths(stamp) {
    const root = `${TRAINING_ARTIFACT_ROOT}/${stamp}`;
    return {
        root,
        run: `${root}/run.json`,
        eval: `${root}/eval.json`,
        gate: `${root}/gate.json`,
    };
}

function deterministicValue(seed, index) {
    const value = Math.sin((seed + 1) * (index + 1) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function buildDeterministicStepPayload({ mode, planarMode, seed, stepIndex, maxSteps, inventoryLength }) {
    const modeOffset = mode === 'hunt' ? 17 : 0;
    const planarOffset = planarMode ? 7 : 3;
    const baseSeed = seed + stepIndex * 31 + modeOffset + planarOffset;
    const yawRoll = deterministicValue(baseSeed, 1);
    const pitchRoll = deterministicValue(baseSeed, 2);
    const boostRoll = deterministicValue(baseSeed, 3);
    const shootMgRoll = deterministicValue(baseSeed, 4);
    const shootItemRoll = deterministicValue(baseSeed, 5);
    const itemIndexRoll = deterministicValue(baseSeed, 6);
    const terminalRoll = deterministicValue(baseSeed, 7);
    const killRoll = deterministicValue(baseSeed, 8);
    const damageDealtRoll = deterministicValue(baseSeed, 9);
    const damageTakenRoll = deterministicValue(baseSeed, 10);

    const shootItem = shootItemRoll > 0.72;
    const maxInventoryIndex = inventoryLength > 0 ? inventoryLength - 1 : -1;
    const rawShootItemIndex = shootItem
        ? Math.trunc(itemIndexRoll * (inventoryLength + 4)) - 1
        : -1;
    const normalizedShootItemIndex = shootItem
        ? Math.max(-1, Math.min(maxInventoryIndex, rawShootItemIndex))
        : -1;
    const invalidAction = shootItem && rawShootItemIndex !== normalizedShootItemIndex;
    const canFinish = stepIndex >= Math.max(1, Math.floor(maxSteps * 0.55));
    const done = canFinish && terminalRoll > 0.87;
    const won = done && deterministicValue(baseSeed, 11) > 0.52;
    const lost = done && !won;

    return {
        action: {
            yawLeft: yawRoll < 0.3,
            yawRight: yawRoll > 0.7,
            pitchDown: pitchRoll < 0.3,
            pitchUp: pitchRoll > 0.7,
            boost: boostRoll > 0.56,
            shootMG: shootMgRoll > 0.61,
            shootItem,
            shootItemIndex: rawShootItemIndex,
        },
        rewardSignals: {
            survival: true,
            kills: killRoll > 0.95 ? 1 : 0,
            damageDealt: Number((damageDealtRoll * 7).toFixed(3)),
            damageTaken: Number((damageTakenRoll * 4).toFixed(3)),
            itemUses: shootItem ? 1 : 0,
            crashed: done && mode === 'hunt' && !won,
            stuck: false,
            won,
            lost,
        },
        done,
        terminalReason: done
            ? (won ? 'match-win' : 'match-loss')
            : '',
        invalidAction,
    };
}

function buildTrainingKpis(episodeResults, runtimeErrorCount = 0) {
    const episodesTotal = episodeResults.length;
    const stepsTotal = episodeResults.reduce((sum, episode) => sum + toInt(episode?.stepsExecuted, 0, 0, Number.MAX_SAFE_INTEGER), 0);
    const episodeReturnTotal = episodeResults.reduce((sum, episode) => sum + toFiniteNumber(episode?.episodeReturn, 0), 0);
    const terminalEpisodes = episodeResults.reduce((sum, episode) => sum + (episode?.done ? 1 : 0), 0);
    const truncatedEpisodes = episodeResults.reduce((sum, episode) => sum + (episode?.truncated ? 1 : 0), 0);
    const invalidActionCount = episodeResults.reduce((sum, episode) => sum + toInt(episode?.invalidActionCount, 0, 0, Number.MAX_SAFE_INTEGER), 0);
    return {
        episodeReturnMean: roundMetric(episodesTotal > 0 ? (episodeReturnTotal / episodesTotal) : 0),
        terminalRate: roundMetric(episodesTotal > 0 ? (terminalEpisodes / episodesTotal) : 0),
        truncationRate: roundMetric(episodesTotal > 0 ? (truncatedEpisodes / episodesTotal) : 0),
        invalidActionRate: roundMetric(stepsTotal > 0 ? (invalidActionCount / stepsTotal) : 0),
        runtimeErrorCount: toInt(runtimeErrorCount, 0, 0, Number.MAX_SAFE_INTEGER),
        episodesTotal,
        stepsTotal,
    };
}

export class GameDebugApi {
    constructor(game) {
        this.game = game || null;
        this.validationService = new BotValidationService({
            getRecorder: () => this.game?.recorder || null,
        });
        this.trainingController = new DeveloperTrainingController();
        this.trainingAutomationState = {
            latestBatch: null,
            latestEval: null,
            latestGate: null,
        };
    }

    getRuntimePerformanceSnapshot(options = {}) {
        const game = this.game;
        const profiler = game?.runtimePerfProfiler || null;
        const performance = typeof profiler?.getSnapshot === 'function'
            ? profiler.getSnapshot(options)
            : null;
        const recorder = game?.mediaRecorderSystem?.getRecordingDiagnostics?.() || null;
        return {
            performance,
            recorder,
        };
    }

    resetRuntimePerformanceSamples() {
        const profiler = this.game?.runtimePerfProfiler || null;
        if (typeof profiler?.reset !== 'function') {
            return false;
        }
        profiler.reset();
        return true;
    }

    resolveRecorderFrameCaptureEnabledDefault() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const raw = params.get('recordframes') || params.get('recorderFrames');
            if (!raw) return false;
            const normalized = String(raw).trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'on';
        } catch {
            return false;
        }
    }

    setRecorderFrameCaptureEnabled(enabled) {
        const game = this.game;
        game._recorderFrameCaptureEnabled = !!enabled;
        if (game.recorder?.setFrameCaptureEnabled) {
            game.recorder.setFrameCaptureEnabled(game._recorderFrameCaptureEnabled);
        }
    }

    captureBotBaseline(label = 'BASELINE') {
        const game = this.game;
        const baseline = this.validationService.captureBaseline(label);
        const normalized = String(baseline?.label || label || 'BASELINE').toUpperCase();
        game._showStatusToast(`Bot-Baseline gespeichert: ${normalized}`);
        console.log(`[Validation] Baseline gespeichert (${normalized}):`, baseline);
        return baseline;
    }

    printBotValidationReport(label = 'BASELINE') {
        const report = this.validationService.buildValidationReport(label);
        console.log('[Validation] report:', report);
        return report;
    }

    getBotValidationMatrix() {
        return this.validationService.getValidationMatrix();
    }

    printBotTestProtocol() {
        const protocol = this.validationService.buildTestProtocol();
        console.log('[Validation] Bot-Testprotokoll:', protocol);
        return protocol;
    }

    applyBotValidationScenario(idOrIndex = 0) {
        const game = this.game;
        const scenario = this.validationService.applyScenario(game, idOrIndex);
        if (!scenario) return null;

        game._showStatusToast(`Szenario ${scenario.id} geladen`);
        console.log('[Validation] scenario loaded:', scenario);
        return scenario;
    }

    resetTrainingSession(input = {}) {
        return this.trainingController.reset(input);
    }

    stepTrainingSession(input = {}) {
        return this.trainingController.step(input);
    }

    runTrainingAutoSteps(input = {}) {
        return this.trainingController.autoStep(input);
    }

    getTrainingSessionSnapshot() {
        return this.trainingController.getSnapshot();
    }

    runTrainingBatch(input = {}) {
        const result = this._runTrainingAutomation('run', input);
        this.trainingAutomationState.latestBatch = cloneSerializable(result);
        return result;
    }

    runTrainingEval(input = {}) {
        const result = this._runTrainingAutomation('eval', input);
        this.trainingAutomationState.latestEval = cloneSerializable(result);
        return result;
    }

    runTrainingGate(input = {}) {
        const payload = input && typeof input === 'object' ? input : {};
        const sourceThresholds = payload.gateThresholds && typeof payload.gateThresholds === 'object'
            ? payload.gateThresholds
            : payload;
        const thresholds = normalizeGateThresholds(sourceThresholds);

        let source = 'latest-eval';
        let evalResult = payload.evalResult && typeof payload.evalResult === 'object'
            ? payload.evalResult
            : this.trainingAutomationState.latestEval;
        if (payload.evalResult && typeof payload.evalResult === 'object') {
            source = 'provided-eval';
        }
        if (!evalResult) {
            evalResult = this.runTrainingEval(payload);
            source = 'auto-eval';
        }

        const kpis = evalResult?.kpis || buildTrainingKpis([], 0);
        const checks = [
            {
                kpiId: 'episodeReturnMean',
                operator: '>=',
                threshold: thresholds.minEpisodeReturnMean,
                actual: roundMetric(kpis.episodeReturnMean),
            },
            {
                kpiId: 'terminalRate',
                operator: '>=',
                threshold: thresholds.minTerminalRate,
                actual: roundMetric(kpis.terminalRate),
            },
            {
                kpiId: 'truncationRate',
                operator: '<=',
                threshold: thresholds.maxTruncationRate,
                actual: roundMetric(kpis.truncationRate),
            },
            {
                kpiId: 'invalidActionRate',
                operator: '<=',
                threshold: thresholds.maxInvalidActionRate,
                actual: roundMetric(kpis.invalidActionRate),
            },
            {
                kpiId: 'runtimeErrorCount',
                operator: '<=',
                threshold: thresholds.maxRuntimeErrorCount,
                actual: toInt(kpis.runtimeErrorCount, 0, 0, Number.MAX_SAFE_INTEGER),
            },
        ].map((entry) => ({
            ...entry,
            pass: entry.operator === '>='
                ? entry.actual >= entry.threshold
                : entry.actual <= entry.threshold,
        }));

        const pass = checks.every((entry) => !!entry.pass);
        const stamp = String(evalResult?.stamp || createRunStamp());
        const artifacts = evalResult?.artifacts && typeof evalResult.artifacts === 'object'
            ? { ...evalResult.artifacts }
            : createArtifactPaths(stamp);
        const result = {
            contractVersion: TRAINING_GATE_CONTRACT_VERSION,
            stamp,
            source,
            generatedAt: new Date().toISOString(),
            sourceArtifactPath: evalResult?.artifactPath || artifacts.eval,
            artifactPath: artifacts.gate,
            artifacts,
            thresholds,
            kpis,
            checks,
            pass,
            exitCode: pass ? 0 : 1,
        };

        this.trainingAutomationState.latestGate = cloneSerializable(result);
        return result;
    }

    getTrainingAutomationSnapshot() {
        return cloneSerializable(this.trainingAutomationState);
    }

    getTrainerBridgeRuntimeSnapshot() {
        const entityManager = this.game?.entityManager;
        if (!entityManager || !(entityManager.botByPlayer instanceof Map)) {
            return {
                available: false,
                reason: 'entity-manager-unavailable',
                bots: [],
                totals: null,
            };
        }
        const bots = [];
        const totals = {
            botCount: 0,
            bridgeEnabledCount: 0,
            timeoutCount: 0,
            fallbackCount: 0,
            failureCount: 0,
            actionRequestCount: 0,
            actionResponseCount: 0,
        };
        for (const [player, policy] of entityManager.botByPlayer.entries()) {
            const status = typeof policy?.getTrainerBridgeStatus === 'function'
                ? policy.getTrainerBridgeStatus()
                : null;
            const telemetry = status?.telemetry
                || (typeof policy?.getTrainerBridgeTelemetry === 'function'
                    ? policy.getTrainerBridgeTelemetry()
                    : null)
                || null;
            const botSnapshot = {
                index: Number(player?.index ?? -1),
                policyType: String(policy?.type || ''),
                bridgeEnabled: !!status?.enabled,
                resume: status?.resume || null,
                telemetry: telemetry || null,
            };
            bots.push(botSnapshot);
            totals.botCount += 1;
            if (botSnapshot.bridgeEnabled) {
                totals.bridgeEnabledCount += 1;
            }
            totals.timeoutCount += toInt(telemetry?.timeouts, 0, 0, Number.MAX_SAFE_INTEGER);
            totals.fallbackCount += toInt(telemetry?.fallbacks, 0, 0, Number.MAX_SAFE_INTEGER);
            totals.failureCount += toInt(telemetry?.failures, 0, 0, Number.MAX_SAFE_INTEGER);
            totals.actionRequestCount += toInt(telemetry?.actionRequests, 0, 0, Number.MAX_SAFE_INTEGER);
            totals.actionResponseCount += toInt(telemetry?.actionResponses, 0, 0, Number.MAX_SAFE_INTEGER);
        }
        totals.timeoutRate = roundMetric(
            totals.actionRequestCount > 0 ? (totals.timeoutCount / totals.actionRequestCount) : 0
        );
        totals.fallbackRate = roundMetric(
            totals.actionRequestCount > 0 ? (totals.fallbackCount / totals.actionRequestCount) : 0
        );
        totals.actionCoverage = roundMetric(
            totals.actionRequestCount > 0 ? (totals.actionResponseCount / totals.actionRequestCount) : 0
        );

        return {
            available: true,
            generatedAt: new Date().toISOString(),
            bots,
            totals,
        };
    }

    _runTrainingAutomation(kind = 'run', input = {}) {
        const config = normalizeAutomationConfig(input);
        const stamp = createRunStamp();
        const artifacts = createArtifactPaths(stamp);
        const artifactPath = kind === 'eval' ? artifacts.eval : artifacts.run;
        const episodes = [];
        let runtimeErrorCount = 0;
        let episodeIndex = 0;

        for (const modeId of config.modes) {
            const domainMode = normalizeDomainMode(modeId);
            if (!domainMode) continue;
            for (const seed of config.seeds) {
                for (let episodeOffset = 0; episodeOffset < config.episodes; episodeOffset += 1) {
                    const episodeSeed = seed + episodeOffset;
                    const episodeResult = this._runTrainingAutomationEpisode({
                        ...domainMode,
                        seed: episodeSeed,
                        episodeIndex,
                        maxSteps: config.maxSteps,
                        inventoryLength: config.inventoryLength,
                        timeoutMs: config.timeoutMs,
                    });
                    episodes.push(episodeResult);
                    if (episodeResult.runtimeError) {
                        runtimeErrorCount += 1;
                    }
                    episodeIndex += 1;
                }
            }
        }

        const kpis = buildTrainingKpis(episodes, runtimeErrorCount);
        return {
            contractVersion: TRAINING_AUTOMATION_CONTRACT_VERSION,
            kind,
            generatedAt: new Date().toISOString(),
            stamp,
            config: {
                ...config,
                seeds: [...config.seeds],
                modes: [...config.modes],
            },
            artifactPath,
            artifacts,
            kpis,
            episodes,
            summary: {
                episodesTotal: kpis.episodesTotal,
                stepsTotal: kpis.stepsTotal,
                runtimeErrorCount: kpis.runtimeErrorCount,
            },
        };
    }

    _runTrainingAutomationEpisode({
        mode,
        planarMode,
        domainId,
        seed,
        episodeIndex,
        maxSteps,
        inventoryLength,
        timeoutMs,
    }) {
        let latestTransition = null;
        let episodeReturn = 0;
        let stepsExecuted = 0;
        let invalidActionCount = 0;

        try {
            this.trainingController.reset({
                mode,
                planarMode,
                maxSteps,
                seed,
                inventoryLength,
            });

            const startedAt = Date.now();
            for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
                if ((Date.now() - startedAt) > timeoutMs) {
                    const timeoutSnapshot = this.trainingController.step({
                        mode,
                        planarMode,
                        maxSteps,
                        seed: seed + stepIndex + 1,
                        inventoryLength,
                        action: {},
                        rewardSignals: {
                            survival: false,
                        },
                        truncated: true,
                        truncatedReason: 'timeout',
                    });
                    latestTransition = timeoutSnapshot?.latestTransition || null;
                    episodeReturn += toFiniteNumber(latestTransition?.reward, 0);
                    stepsExecuted += 1;
                    break;
                }

                const stepPayload = buildDeterministicStepPayload({
                    mode,
                    planarMode,
                    seed,
                    stepIndex,
                    maxSteps,
                    inventoryLength,
                });
                const snapshot = this.trainingController.step({
                    mode,
                    planarMode,
                    maxSteps,
                    seed: seed + stepIndex + 1,
                    inventoryLength,
                    action: stepPayload.action,
                    rewardSignals: stepPayload.rewardSignals,
                    done: stepPayload.done,
                    terminalReason: stepPayload.terminalReason,
                });
                latestTransition = snapshot?.latestTransition || null;
                episodeReturn += toFiniteNumber(latestTransition?.reward, 0);
                stepsExecuted += 1;
                if (stepPayload.invalidAction) {
                    invalidActionCount += 1;
                }
                if (latestTransition?.done || latestTransition?.truncated) {
                    break;
                }
            }

            return {
                episodeId: latestTransition?.episodeId || `episode-${episodeIndex + 1}`,
                episodeIndex,
                seed,
                domainId,
                mode,
                planarMode,
                stepsExecuted,
                episodeReturn: roundMetric(episodeReturn),
                invalidActionCount,
                done: !!latestTransition?.done,
                truncated: !!latestTransition?.truncated,
                terminalReason: latestTransition?.terminalReason || null,
                truncatedReason: latestTransition?.truncatedReason || null,
                runtimeError: false,
            };
        } catch (error) {
            return {
                episodeId: `episode-${episodeIndex + 1}`,
                episodeIndex,
                seed,
                domainId,
                mode,
                planarMode,
                stepsExecuted,
                episodeReturn: roundMetric(episodeReturn),
                invalidActionCount,
                done: false,
                truncated: false,
                terminalReason: null,
                truncatedReason: null,
                runtimeError: true,
                runtimeErrorMessage: String(error?.message || 'training-automation-error'),
            };
        }
    }
}
