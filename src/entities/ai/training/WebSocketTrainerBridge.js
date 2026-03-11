// ============================================
// WebSocketTrainerBridge.js - optional async trainer bridge with timeout/error tracking
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

export class WebSocketTrainerBridge {
    constructor(options = {}) {
        this.enabled = !!options.enabled;
        this.url = toSafeUrl(options.url, 'ws://127.0.0.1:8765');
        this.timeoutMs = clamp(options.timeoutMs, 20, 10000);
        this._socket = null;
        this._nextRequestId = 1;
        this._pendingRequest = null;
        this._latestAction = null;
        this._latestResponse = null;
        this._latestFailure = null;
        this._boundOpenHandler = null;
        this._boundMessageHandler = null;
        this._boundErrorHandler = null;
        this._boundCloseHandler = null;
    }

    _recordFailure(reason) {
        this._latestFailure = String(reason || 'bridge-error');
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
        const expectsAction = pending?.expectsAction !== false;
        this._latestResponse = parsed;
        this._clearPending();
        if (!expectsAction) {
            return;
        }

        const actionPayload = parsed?.action ?? parsed?.payload?.action ?? null;
        if (actionPayload && typeof actionPayload === 'object') {
            this._latestAction = actionPayload;
            return;
        }
        this._recordFailure('missing-action');
    }

    _ensureSocket() {
        if (!this.enabled) return;
        const isSocketOpen = this._socket && this._socket.readyState === WebSocket.OPEN;
        const isSocketConnecting = this._socket && this._socket.readyState === WebSocket.CONNECTING;
        if (isSocketOpen || isSocketConnecting) return;

        if (typeof WebSocket !== 'function') {
            this._recordFailure('websocket-unavailable');
            return;
        }

        try {
            this._socket = new WebSocket(this.url);
            this._attachSocketHandlers(this._socket);
        } catch (error) {
            this._recordFailure(error?.message || 'socket-create-failed');
            this._socket = null;
        }
    }

    _handleTimeout() {
        if (!this._pendingRequest) return;
        const ageMs = Date.now() - this._pendingRequest.sentAt;
        if (ageMs > this.timeoutMs) {
            this._recordFailure('timeout');
            this._clearPending();
        }
    }

    _canSendRequest() {
        return (
            this._socket
            && this._socket.readyState === WebSocket.OPEN
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
            this._pendingRequest = {
                id: requestId,
                sentAt: Date.now(),
                expectsAction: options.expectsAction !== false,
            };
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
                sentAtMs: Date.now(),
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
