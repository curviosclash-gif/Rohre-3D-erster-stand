// ============================================
// WebSocketTrainerBridge.js - optional async trainer bridge with timeout/retry/error telemetry
// ============================================

import { TRAINING_CONTRACT_VERSION } from '../../../shared/contracts/TrainingRuntimeContract.js';
import { createTrainerTransportEnvelope } from './TrainerPayloadAdapter.js';

import { clamp } from '../../../utils/MathOps.js';

function toSafeUrl(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toNow(value) { return typeof value === 'function' ? value : () => Date.now(); }

const toBoundedInt = (value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => (Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Math.trunc(Number(value))))
    : fallback);

function computePercentile(samples, percentile) {
    if (!Array.isArray(samples) || samples.length === 0) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const clampedPercentile = clamp(percentile, 0, 1);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(sorted.length * clampedPercentile) - 1)
    );
    return sorted[index];
}

function createTelemetryState() {
    return {
        requestsSent: 0,
        actionRequests: 0,
        trainingRequests: 0,
        commandRequests: 0,
        responsesReceived: 0,
        actionResponses: 0,
        ackResponses: 0,
        commandResponses: 0,
        retries: 0,
        timeouts: 0,
        failures: 0,
        fallbacks: 0,
        readyMessages: 0,
        latencySamplesMs: [],
        latencyTotalMs: 0,
        latencyMinMs: null,
        latencyMaxMs: null,
        lastLatencyMs: null,
        learningReports: 0,
        learningUpdates: 0,
        lossSamples: [],
        lossTotal: 0,
        epsilonSamples: [],
        epsilonTotal: 0,
        replayFillSamples: [],
        replayFillTotal: 0,
        latestLoss: null,
        latestEpsilon: null,
        latestReplayFill: null,
        maxOptimizerSteps: 0,
        maxPendingAcks: 0, backpressureThreshold: 0, backpressureDrops: 0, ackEvictions: 0,
        lastFailure: null,
        lastFallbackReason: null,
    };
}

function cloneTelemetrySnapshot(state) {
    const sampleCount = state.latencySamplesMs.length;
    const latencyMeanMs = sampleCount > 0
        ? state.latencyTotalMs / sampleCount
        : null;
    const lossSampleCount = state.lossSamples.length;
    const epsilonSampleCount = state.epsilonSamples.length;
    const replayFillSampleCount = state.replayFillSamples.length;
    return {
        requestsSent: state.requestsSent,
        actionRequests: state.actionRequests,
        trainingRequests: state.trainingRequests,
        commandRequests: state.commandRequests,
        responsesReceived: state.responsesReceived,
        actionResponses: state.actionResponses,
        ackResponses: state.ackResponses,
        commandResponses: state.commandResponses,
        retries: state.retries,
        timeouts: state.timeouts,
        failures: state.failures,
        fallbacks: state.fallbacks,
        readyMessages: state.readyMessages,
        latencySampleCount: sampleCount,
        latencyMeanMs,
        latencyP95Ms: computePercentile(state.latencySamplesMs, 0.95),
        latencyMinMs: state.latencyMinMs,
        latencyMaxMs: state.latencyMaxMs,
        lastLatencyMs: state.lastLatencyMs,
        learningReports: state.learningReports,
        learningUpdates: state.learningUpdates,
        lossSampleCount,
        lossMean: lossSampleCount > 0 ? state.lossTotal / lossSampleCount : null,
        lossP95: computePercentile(state.lossSamples, 0.95),
        latestLoss: state.latestLoss,
        epsilonSampleCount,
        epsilonMean: epsilonSampleCount > 0 ? state.epsilonTotal / epsilonSampleCount : null,
        latestEpsilon: state.latestEpsilon,
        replayFillSampleCount,
        replayFillMean: replayFillSampleCount > 0 ? state.replayFillTotal / replayFillSampleCount : null,
        latestReplayFill: state.latestReplayFill,
        maxOptimizerSteps: state.maxOptimizerSteps, maxPendingAcks: state.maxPendingAcks,
        backpressureThreshold: state.backpressureThreshold, backpressureDrops: state.backpressureDrops, ackEvictions: state.ackEvictions,
        lastFailure: state.lastFailure,
        lastFallbackReason: state.lastFallbackReason,
        pendingActionRequest: !!state.pendingActionRequest,
        pendingAckCount: Number(state.pendingAckCount) || 0,
        pendingCommandCount: Number(state.pendingCommandCount) || 0,
    };
}

function pushLatencySample(state, latencyMs) {
    const latency = Math.max(0, Math.trunc(clamp(latencyMs, 0, 60_000)));
    state.latencySamplesMs.push(latency);
    if (state.latencySamplesMs.length > 128) {
        const removed = state.latencySamplesMs.shift();
        state.latencyTotalMs -= Number.isFinite(removed) ? removed : 0;
    }
    state.latencyTotalMs += latency;
    state.lastLatencyMs = latency;
    state.latencyMinMs = state.latencyMinMs == null
        ? latency
        : Math.min(state.latencyMinMs, latency);
    state.latencyMaxMs = state.latencyMaxMs == null
        ? latency
        : Math.max(state.latencyMaxMs, latency);
}

function pushSample(state, key, totalKey, value, min = -1_000_000_000, max = 1_000_000_000) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return false;
    const clamped = clamp(numeric, min, max);
    state[key].push(clamped);
    if (state[key].length > 128) {
        const removed = state[key].shift();
        state[totalKey] -= Number.isFinite(removed) ? removed : 0;
    }
    state[totalKey] += clamped;
    return true;
}

export class WebSocketTrainerBridge {
    constructor(options = {}) {
        this.enabled = !!options.enabled;
        this.url = toSafeUrl(options.url, 'ws://127.0.0.1:8765');
        this.timeoutMs = clamp(options.timeoutMs, 20, 10000);
        this.maxRetries = Math.trunc(clamp(options.maxRetries, 0, 5));
        this.retryDelayMs = clamp(options.retryDelayMs, 0, 1000);
        this.readyMessageType = typeof options.readyMessageType === 'string' && options.readyMessageType.trim()
            ? options.readyMessageType.trim()
            : 'trainer-ready';
        this.requireReadyMessage = options.requireReadyMessage !== false;
        this.maxPendingAcks = toBoundedInt(options.maxPendingAcks, 512, 16, 8192);
        this.backpressureThreshold = Math.min(this.maxPendingAcks, toBoundedInt(
            options.backpressureThreshold,
            Math.max(8, Math.floor(this.maxPendingAcks * 0.75)),
            8,
            this.maxPendingAcks
        ));
        this.dropTrainingPayloadWhenBacklogged = options.dropTrainingPayloadWhenBacklogged !== false;
        this._now = toNow(options.now);
        this._socketFactory = typeof options.socketFactory === 'function'
            ? options.socketFactory
            : null;
        this._socket = null;
        this._nextRequestId = 1;
        this._pendingRequest = null;
        this._pendingAcks = new Map();
        this._pendingCommands = new Map();
        this._latestAction = null;
        this._latestResponse = null;
        this._latestFailure = null;
        this._latestReadyPayload = null;
        this._isReady = false;
        this._telemetry = createTelemetryState();
        this._telemetry.maxPendingAcks = this.maxPendingAcks; this._telemetry.backpressureThreshold = this.backpressureThreshold;
        this._boundOpenHandler = null; this._boundMessageHandler = null; this._boundErrorHandler = null; this._boundCloseHandler = null;
    }

    _resolveOpenState() {
        return typeof WebSocket === 'function' && Number.isInteger(WebSocket.OPEN) ? WebSocket.OPEN : 1;
    }

    _resolveConnectingState() {
        return typeof WebSocket === 'function' && Number.isInteger(WebSocket.CONNECTING) ? WebSocket.CONNECTING : 0;
    }

    _recordFailure(reason) {
        const normalizedReason = String(reason || 'bridge-error');
        this._latestFailure = normalizedReason;
        this._telemetry.failures += 1;
        this._telemetry.lastFailure = normalizedReason;
    }

    _markReady(payload = null) {
        this._isReady = true;
        this._telemetry.readyMessages += 1;
        if (payload && typeof payload === 'object') {
            this._latestReadyPayload = payload;
        }
    }

    _markNotReady() {
        this._isReady = false;
    }

    _ingestTrainingTelemetry(parsed) {
        const training = parsed?.training;
        if (!training || typeof training !== 'object') {
            return;
        }
        this._telemetry.learningReports += 1;
        if (training.trained === true) {
            this._telemetry.learningUpdates += 1;
        }
        if (pushSample(this._telemetry, 'lossSamples', 'lossTotal', training.loss, -1_000_000, 1_000_000)) {
            this._telemetry.latestLoss = Number(training.loss);
        }
        if (pushSample(this._telemetry, 'epsilonSamples', 'epsilonTotal', training.epsilon, 0, 1)) {
            this._telemetry.latestEpsilon = Number(training.epsilon);
        }
        if (pushSample(this._telemetry, 'replayFillSamples', 'replayFillTotal', training.replayFill, 0, 1)) {
            this._telemetry.latestReplayFill = Number(training.replayFill);
        }
        const optimizerSteps = Number(training.optimizerSteps);
        if (Number.isFinite(optimizerSteps)) {
            this._telemetry.maxOptimizerSteps = Math.max(
                this._telemetry.maxOptimizerSteps,
                Math.trunc(optimizerSteps)
            );
        }
    }

    _clearPending() {
        this._pendingRequest = null;
    }

    _attachSocketHandlers(socket) {
        this._boundOpenHandler = () => {
            if (!this.requireReadyMessage) {
                this._markReady(null);
            }
        };
        this._boundMessageHandler = (event) => this._handleSocketMessage(event);
        this._boundErrorHandler = () => {
            this._markNotReady();
            this._recordFailure('socket-error');
            this._clearPending();
            this._resolvePendingCommands(null);
        };
        this._boundCloseHandler = () => {
            this._markNotReady();
            this._recordFailure('socket-closed');
            this._clearPending();
            this._resolvePendingCommands(null);
        };

        this._addSocketListener(socket, 'open', this._boundOpenHandler);
        this._addSocketListener(socket, 'message', this._boundMessageHandler);
        this._addSocketListener(socket, 'error', this._boundErrorHandler);
        this._addSocketListener(socket, 'close', this._boundCloseHandler);
    }

    _detachSocketHandlers() {
        const socket = this._socket;
        if (!socket) return;
        if (this._boundOpenHandler) this._removeSocketListener(socket, 'open', this._boundOpenHandler);
        if (this._boundMessageHandler) this._removeSocketListener(socket, 'message', this._boundMessageHandler);
        if (this._boundErrorHandler) this._removeSocketListener(socket, 'error', this._boundErrorHandler);
        if (this._boundCloseHandler) this._removeSocketListener(socket, 'close', this._boundCloseHandler);
        this._boundOpenHandler = null;
        this._boundMessageHandler = null;
        this._boundErrorHandler = null;
        this._boundCloseHandler = null;
    }

    _addSocketListener(socket, type, handler) {
        if (!socket || typeof handler !== 'function') return;
        if (typeof socket.addEventListener === 'function') {
            socket.addEventListener(type, handler);
            return;
        }
        if (typeof socket.on === 'function') {
            socket.on(type, handler);
        }
    }

    _removeSocketListener(socket, type, handler) {
        if (!socket || typeof handler !== 'function') return;
        if (typeof socket.removeEventListener === 'function') {
            socket.removeEventListener(type, handler);
            return;
        }
        if (typeof socket.off === 'function') {
            socket.off(type, handler);
            return;
        }
        if (typeof socket.removeListener === 'function') {
            socket.removeListener(type, handler);
        }
    }

    _resolvePendingCommands(response) {
        if (this._pendingCommands.size <= 0) return;
        for (const entry of this._pendingCommands.values()) {
            if (entry?.timer) {
                clearTimeout(entry.timer);
            }
            if (typeof entry?.resolve === 'function') {
                entry.resolve(response);
            }
        }
        this._pendingCommands.clear();
    }

    _handleSocketMessage(event) {
        const raw = event?.data;
        if (!raw) return;

        let parsed = null;
        try {
            parsed = JSON.parse(raw);
        } catch {
            this._recordFailure('invalid-json');
            return;
        }

        const responseType = typeof parsed?.type === 'string' ? parsed.type.trim().toLowerCase() : '';
        if (responseType && responseType === this.readyMessageType.trim().toLowerCase()) {
            this._markReady(parsed);
            this._latestResponse = parsed;
            return;
        }

        const responseId = Number(parsed?.id);
        if (!Number.isInteger(responseId)) {
            return;
        }

        if (this._pendingCommands.has(responseId)) {
            const pendingCommand = this._pendingCommands.get(responseId);
            this._pendingCommands.delete(responseId);
            if (pendingCommand?.timer) {
                clearTimeout(pendingCommand.timer);
            }
            this._telemetry.responsesReceived += 1;
            if (Number.isFinite(pendingCommand?.sentAt)) {
                pushLatencySample(this._telemetry, this._now() - pendingCommand.sentAt);
            }
            this._latestResponse = parsed;
            this._telemetry.commandResponses += 1;
            this._ingestTrainingTelemetry(parsed);
            if (typeof pendingCommand?.resolve === 'function') {
                pendingCommand.resolve(parsed);
            }
            return;
        }

        if (this._pendingAcks.has(responseId)) {
            const sentAt = this._pendingAcks.get(responseId);
            this._pendingAcks.delete(responseId);
            this._telemetry.responsesReceived += 1;
            if (Number.isFinite(sentAt)) {
                pushLatencySample(this._telemetry, this._now() - sentAt);
            }
            this._latestResponse = parsed;
            this._telemetry.ackResponses += 1;
            this._ingestTrainingTelemetry(parsed);
            return;
        }

        if (!this._pendingRequest || responseId !== this._pendingRequest.id) {
            if (
                parsed?.ok === true
                && (responseType === 'training-step' || responseType === 'training-reset' || responseType === 'training-ack')
            ) {
                this._telemetry.responsesReceived += 1;
                this._telemetry.ackResponses += 1;
                this._latestResponse = parsed;
                this._ingestTrainingTelemetry(parsed);
            }
            return;
        }

        const pending = this._pendingRequest;
        this._telemetry.responsesReceived += 1;
        pushLatencySample(this._telemetry, this._now() - pending.sentAt);
        const expectsAction = pending?.expectsAction !== false;
        this._latestResponse = parsed;
        this._clearPending();
        this._ingestTrainingTelemetry(parsed);
        if (!expectsAction) {
            this._telemetry.ackResponses += 1;
            return;
        }

        const actionPayload = parsed?.action ?? parsed?.payload?.action ?? null;
        if (actionPayload && typeof actionPayload === 'object') {
            this._latestAction = actionPayload;
            this._telemetry.actionResponses += 1;
            return;
        }
        this._recordFailure('missing-action');
    }

    _ensureSocket() {
        if (!this.enabled) return;
        const openState = this._resolveOpenState();
        const connectingState = this._resolveConnectingState();
        const isSocketOpen = this._socket && this._socket.readyState === openState;
        const isSocketConnecting = this._socket && this._socket.readyState === connectingState;
        if (isSocketOpen || isSocketConnecting) return;
        this._markNotReady();

        if (typeof WebSocket !== 'function') {
            if (!this._socketFactory) {
                this._recordFailure('websocket-unavailable');
                return;
            }
        }

        try {
            this._socket = this._socketFactory
                ? this._socketFactory(this.url)
                : new WebSocket(this.url);
            if (
                !this._socket
                || (
                    typeof this._socket.addEventListener !== 'function'
                    && typeof this._socket.on !== 'function'
                )
            ) {
                this._recordFailure('socket-create-failed');
                this._socket = null;
                return;
            }
            this._attachSocketHandlers(this._socket);
            if (!this.requireReadyMessage && this._socket.readyState === openState) {
                this._markReady(null);
            }
        } catch (error) {
            this._recordFailure(error?.message || 'socket-create-failed');
            this._socket = null;
        }
    }

    waitForReady(timeoutMs = this.timeoutMs) {
        if (!this.enabled) return Promise.resolve(false);

        const timeout = clamp(timeoutMs, 20, 30_000);
        this._ensureSocket();
        const socket = this._socket;
        if (!socket) return Promise.resolve(false);

        const openState = this._resolveOpenState();
        const isReady = socket.readyState === openState && (this._isReady || !this.requireReadyMessage);
        if (isReady) {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            let settled = false;
            const finish = (ready) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this._removeSocketListener(socket, 'open', handleOpen);
                this._removeSocketListener(socket, 'error', handleError);
                this._removeSocketListener(socket, 'close', handleClose);
                this._removeSocketListener(socket, 'message', handleMessage);
                resolve(!!ready);
            };
            const handleOpen = () => {
                if (!this.requireReadyMessage) {
                    this._markReady(null);
                    finish(true);
                }
            };
            const handleError = () => finish(false);
            const handleClose = () => finish(false);
            const handleMessage = () => {
                if (socket.readyState !== openState) return;
                if (this._isReady || !this.requireReadyMessage) {
                    finish(true);
                }
            };
            const timer = setTimeout(() => {
                if (socket.readyState === openState && (this._isReady || !this.requireReadyMessage)) {
                    finish(true);
                    return;
                }
                this._recordFailure(this.requireReadyMessage ? 'ready-timeout' : 'connect-timeout');
                finish(false);
            }, timeout);

            this._addSocketListener(socket, 'open', handleOpen);
            this._addSocketListener(socket, 'error', handleError);
            this._addSocketListener(socket, 'close', handleClose);
            this._addSocketListener(socket, 'message', handleMessage);
        });
    }

    _retryPendingRequest(pending) {
        if (!pending) return false;
        if (pending.retryCount >= this.maxRetries) return false;
        const now = this._now();
        if (now < pending.retryAt) return false;

        try {
            this._socket.send(pending.serialized);
            pending.retryCount += 1;
            pending.sentAt = now;
            pending.retryAt = now + this.timeoutMs + this.retryDelayMs;
            this._telemetry.retries += 1;
            return true;
        } catch {
            this._recordFailure('send-failed');
            this._clearPending();
            return false;
        }
    }

    _handleTimeout() {
        if (!this._pendingRequest) return;
        const now = this._now();
        const pending = this._pendingRequest;
        const ageMs = now - pending.sentAt;
        if (ageMs > this.timeoutMs) {
            if (pending.retryCount < this.maxRetries) {
                if (now < pending.retryAt) {
                    return;
                }
                this._telemetry.timeouts += 1;
                if (this._retryPendingRequest(pending)) {
                    return;
                }
            } else {
                this._telemetry.timeouts += 1;
                this._recordFailure('timeout');
                this._clearPending();
            }
        }
    }

    _canSendRequest() {
        const openState = this._resolveOpenState();
        return (
            this._socket
            && this._socket.readyState === openState
            && !this._pendingRequest
        );
    }

    _submitRequest(type, payload, options = {}) {
        if (!this.enabled) return;
        this._ensureSocket();
        this._handleTimeout();
        if (!this._canSendRequest()) return;

        const requestId = this._nextRequestId++;
        const envelope = createTrainerTransportEnvelope(
            type,
            requestId,
            payload,
            options.envelopeOptions || {}
        );

        let serialized = '';
        try {
            serialized = JSON.stringify(envelope);
        } catch {
            this._recordFailure('serialize-failed');
            return;
        }

        const expectsAction = options.expectsAction !== false;
        if (!expectsAction && this.dropTrainingPayloadWhenBacklogged && this._pendingAcks.size >= this.backpressureThreshold) {
            this._telemetry.backpressureDrops += 1;
            return;
        }

        try {
            this._socket.send(serialized);
            const now = this._now();
            this._telemetry.requestsSent += 1;
            if (expectsAction) {
                this._telemetry.actionRequests += 1;
            } else {
                this._telemetry.trainingRequests += 1;
            }
            if (expectsAction) {
                this._pendingRequest = {
                    id: requestId,
                    sentAt: now,
                    expectsAction: true,
                    retryAt: now + this.timeoutMs + this.retryDelayMs,
                    retryCount: 0,
                    serialized,
                };
                return;
            }

            this._pendingAcks.set(requestId, now);
            if (this._pendingAcks.size > this.maxPendingAcks) {
                const firstKey = this._pendingAcks.keys().next().value;
                this._pendingAcks.delete(firstKey);
                this._telemetry.ackEvictions += 1;
            }
        } catch {
            this._recordFailure('send-failed');
        }
    }

    submitObservation(payload) {
        this._submitRequest('bot-action-request', payload, {
            expectsAction: true,
        });
    }

    submitTrainingPayload(messageType, payload) {
        const type = typeof messageType === 'string' && messageType.trim()
            ? messageType.trim()
            : 'training-step';
        this._submitRequest(type, payload, {
            expectsAction: false,
            envelopeOptions: {
                contractVersion: TRAINING_CONTRACT_VERSION,
                sentAtMs: this._now(),
            },
        });
    }

    submitTrainingReset(payload) {
        this.submitTrainingPayload('training-reset', payload);
    }

    submitTrainingStep(payload) {
        this.submitTrainingPayload('training-step', payload);
    }

    submitCommand(messageType, payload = {}, options = {}) {
        if (!this.enabled) return Promise.resolve(null);
        const type = typeof messageType === 'string' && messageType.trim()
            ? messageType.trim()
            : 'trainer-stats-request';
        const timeout = clamp(options.timeoutMs, 20, 30_000);
        this._ensureSocket();
        this._handleTimeout();
        if (!this._canSendRequest()) {
            return Promise.resolve(null);
        }

        const requestId = this._nextRequestId++;
        const envelope = createTrainerTransportEnvelope(
            type,
            requestId,
            payload,
            {
                contractVersion: TRAINING_CONTRACT_VERSION,
                sentAtMs: this._now(),
            }
        );

        let serialized = '';
        try {
            serialized = JSON.stringify(envelope);
        } catch {
            this._recordFailure('serialize-failed');
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            try {
                this._socket.send(serialized);
            } catch {
                this._recordFailure('send-failed');
                resolve(null);
                return;
            }
            const sentAt = this._now();
            this._telemetry.requestsSent += 1;
            this._telemetry.commandRequests += 1;
            const timer = setTimeout(() => {
                const pending = this._pendingCommands.get(requestId);
                if (!pending) return;
                this._pendingCommands.delete(requestId);
                this._telemetry.timeouts += 1;
                this._recordFailure('command-timeout');
                resolve(null);
            }, timeout);
            this._pendingCommands.set(requestId, {
                sentAt,
                timer,
                resolve,
            });
        });
    }

    consumeLatestAction() {
        const action = this._latestAction;
        this._latestAction = null;
        return action;
    }

    consumeLatestResponse() {
        const response = this._latestResponse;
        this._latestResponse = null;
        return response;
    }

    consumeLatestReadyPayload() {
        const readyPayload = this._latestReadyPayload;
        this._latestReadyPayload = null;
        return readyPayload;
    }

    consumeFailure() {
        this._handleTimeout();
        const failure = this._latestFailure;
        this._latestFailure = null;
        return failure;
    }

    recordFallback(reason = 'external-fallback') {
        this._telemetry.fallbacks += 1;
        this._telemetry.lastFallbackReason = String(reason || 'external-fallback');
    }

    getTelemetrySnapshot() {
        this._handleTimeout();
        return cloneTelemetrySnapshot({
            ...this._telemetry,
            pendingActionRequest: !!this._pendingRequest,
            pendingAckCount: this._pendingAcks.size,
            pendingCommandCount: this._pendingCommands.size,
        });
    }

    resetTelemetry() {
        this._telemetry = createTelemetryState();
        this._telemetry.maxPendingAcks = this.maxPendingAcks;
        this._telemetry.backpressureThreshold = this.backpressureThreshold;
    }

    close() {
        if (this._socket) {
            this._detachSocketHandlers();
            try {
                this._socket.close();
            } catch {
                // ignore close errors
            }
        }
        this._socket = null;
        this._clearPending();
        this._pendingAcks.clear();
        this._resolvePendingCommands(null);
        this._latestReadyPayload = null;
        this._markNotReady();
        this._latestAction = null;
        this._latestResponse = null;
    }
}
