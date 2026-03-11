// ============================================
// WebSocketTrainerBridge.js - optional async trainer bridge with timeout/retry/error telemetry
// ============================================

import { TRAINING_CONTRACT_VERSION } from './TrainingContractV1.js';
import { createTrainerTransportEnvelope } from './TrainerPayloadAdapter.js';

function clamp(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    if (numeric < min) return min;
    if (numeric > max) return max;
    return numeric;
}

function toSafeUrl(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}

function toNow(value) {
    return typeof value === 'function' ? value : () => Date.now();
}

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
        responsesReceived: 0,
        actionResponses: 0,
        ackResponses: 0,
        retries: 0,
        timeouts: 0,
        failures: 0,
        fallbacks: 0,
        latencySamplesMs: [],
        latencyTotalMs: 0,
        latencyMinMs: null,
        latencyMaxMs: null,
        lastLatencyMs: null,
        lastFailure: null,
        lastFallbackReason: null,
    };
}

function cloneTelemetrySnapshot(state) {
    const sampleCount = state.latencySamplesMs.length;
    const latencyMeanMs = sampleCount > 0
        ? state.latencyTotalMs / sampleCount
        : null;
    return {
        requestsSent: state.requestsSent,
        responsesReceived: state.responsesReceived,
        actionResponses: state.actionResponses,
        ackResponses: state.ackResponses,
        retries: state.retries,
        timeouts: state.timeouts,
        failures: state.failures,
        fallbacks: state.fallbacks,
        latencySampleCount: sampleCount,
        latencyMeanMs,
        latencyP95Ms: computePercentile(state.latencySamplesMs, 0.95),
        latencyMinMs: state.latencyMinMs,
        latencyMaxMs: state.latencyMaxMs,
        lastLatencyMs: state.lastLatencyMs,
        lastFailure: state.lastFailure,
        lastFallbackReason: state.lastFallbackReason,
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

export class WebSocketTrainerBridge {
    constructor(options = {}) {
        this.enabled = !!options.enabled;
        this.url = toSafeUrl(options.url, 'ws://127.0.0.1:8765');
        this.timeoutMs = clamp(options.timeoutMs, 20, 10000);
        this.maxRetries = Math.trunc(clamp(options.maxRetries, 0, 5));
        this.retryDelayMs = clamp(options.retryDelayMs, 0, 1000);
        this._now = toNow(options.now);
        this._socketFactory = typeof options.socketFactory === 'function'
            ? options.socketFactory
            : null;
        this._socket = null;
        this._nextRequestId = 1;
        this._pendingRequest = null;
        this._latestAction = null;
        this._latestResponse = null;
        this._latestFailure = null;
        this._telemetry = createTelemetryState();
        this._boundOpenHandler = null;
        this._boundMessageHandler = null;
        this._boundErrorHandler = null;
        this._boundCloseHandler = null;
    }

    _resolveOpenState() {
        return typeof WebSocket === 'function' && Number.isInteger(WebSocket.OPEN)
            ? WebSocket.OPEN
            : 1;
    }

    _resolveConnectingState() {
        return typeof WebSocket === 'function' && Number.isInteger(WebSocket.CONNECTING)
            ? WebSocket.CONNECTING
            : 0;
    }

    _recordFailure(reason, options = {}) {
        const normalizedReason = String(reason || 'bridge-error');
        this._latestFailure = normalizedReason;
        this._telemetry.failures += 1;
        this._telemetry.lastFailure = normalizedReason;
        if (options.timeout === true) {
            this._telemetry.timeouts += 1;
        }
    }

    _clearPending() {
        this._pendingRequest = null;
    }

    _attachSocketHandlers(socket) {
        this._boundOpenHandler = () => {
            // no-op; connection state checked by readyState
        };
        this._boundMessageHandler = (event) => this._handleSocketMessage(event);
        this._boundErrorHandler = () => {
            this._recordFailure('socket-error');
            this._clearPending();
        };
        this._boundCloseHandler = () => {
            this._recordFailure('socket-closed');
            this._clearPending();
        };

        socket.addEventListener('open', this._boundOpenHandler);
        socket.addEventListener('message', this._boundMessageHandler);
        socket.addEventListener('error', this._boundErrorHandler);
        socket.addEventListener('close', this._boundCloseHandler);
    }

    _detachSocketHandlers() {
        const socket = this._socket;
        if (!socket) return;
        if (this._boundOpenHandler) socket.removeEventListener('open', this._boundOpenHandler);
        if (this._boundMessageHandler) socket.removeEventListener('message', this._boundMessageHandler);
        if (this._boundErrorHandler) socket.removeEventListener('error', this._boundErrorHandler);
        if (this._boundCloseHandler) socket.removeEventListener('close', this._boundCloseHandler);
        this._boundOpenHandler = null;
        this._boundMessageHandler = null;
        this._boundErrorHandler = null;
        this._boundCloseHandler = null;
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

        const responseId = Number(parsed?.id);
        if (!Number.isInteger(responseId) || !this._pendingRequest || responseId !== this._pendingRequest.id) {
            return;
        }

        const pending = this._pendingRequest;
        this._telemetry.responsesReceived += 1;
        pushLatencySample(this._telemetry, this._now() - pending.sentAt);
        const expectsAction = pending?.expectsAction !== false;
        this._latestResponse = parsed;
        this._clearPending();
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
            if (!this._socket || typeof this._socket.addEventListener !== 'function') {
                this._recordFailure('socket-create-failed');
                this._socket = null;
                return;
            }
            this._attachSocketHandlers(this._socket);
        } catch (error) {
            this._recordFailure(error?.message || 'socket-create-failed');
            this._socket = null;
        }
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
        const ageMs = this._now() - this._pendingRequest.sentAt;
        if (ageMs > this.timeoutMs) {
            if (this._retryPendingRequest(this._pendingRequest)) {
                return;
            }
            this._recordFailure('timeout', { timeout: true });
            this._clearPending();
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

        try {
            this._socket.send(serialized);
            const now = this._now();
            this._pendingRequest = {
                id: requestId,
                sentAt: now,
                expectsAction: options.expectsAction !== false,
                retryAt: now + this.timeoutMs + this.retryDelayMs,
                retryCount: 0,
                serialized,
            };
            this._telemetry.requestsSent += 1;
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
        return cloneTelemetrySnapshot(this._telemetry);
    }

    resetTelemetry() {
        this._telemetry = createTelemetryState();
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
        this._latestAction = null;
        this._latestResponse = null;
    }
}
