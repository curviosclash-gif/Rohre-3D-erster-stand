import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

import { TrainerSession } from '../session/TrainerSession.mjs';
import {
    TRAINER_PROTOCOL_VERSION,
    TRAINER_RESPONSE_TYPES,
} from '../config/TrainerRuntimeContract.mjs';

function now() {
    return Date.now();
}

function createLogger(verbose) {
    if (!verbose) {
        return () => {};
    }
    return (message, payload = null) => {
        const stamp = new Date().toISOString();
        if (payload == null) {
            console.log(`[trainer-server ${stamp}] ${message}`);
            return;
        }
        console.log(`[trainer-server ${stamp}] ${message} ${JSON.stringify(payload)}`);
    };
}

function serialize(payload) {
    try {
        return JSON.stringify(payload);
    } catch {
        return JSON.stringify({
            id: null,
            ok: false,
            type: TRAINER_RESPONSE_TYPES.ERROR,
            error: 'serialize-failed',
        });
    }
}

export class TrainerServer {
    constructor(config) {
        this.config = config || {};
        this._log = createLogger(!!this.config.verbose);
        this._startedAt = null;
        this._server = null;
        this._nextConnectionId = 1;
        this._sessions = new Map();
        this._stats = {
            protocolVersion: TRAINER_PROTOCOL_VERSION,
            connectionsAccepted: 0,
            connectionsClosed: 0,
            messagesReceived: 0,
            responsesSent: 0,
            errorsSent: 0,
        };
    }

    _safeSend(socket, payload) {
        if (!socket || socket.readyState !== 1) {
            return false;
        }
        try {
            socket.send(serialize(payload));
            this._stats.responsesSent += 1;
            if (payload?.ok === false || payload?.type === TRAINER_RESPONSE_TYPES.ERROR) {
                this._stats.errorsSent += 1;
            }
            return true;
        } catch {
            this._stats.errorsSent += 1;
            return false;
        }
    }

    _createSession(connectionId) {
        const sessionId = `${connectionId}-${randomUUID().slice(0, 8)}`;
        try {
            return new TrainerSession({
                sessionId,
                connectionId,
                config: this.config,
            });
        } catch (error) {
            this._log('startup-checkpoint-import-failed', {
                connectionId,
                message: error?.message || String(error),
            });
            const fallbackConfig = {
                ...this.config,
                startupCheckpoint: null,
            };
            return new TrainerSession({
                sessionId,
                connectionId,
                config: fallbackConfig,
            });
        }
    }

    async start() {
        if (this._server) return;
        this._startedAt = now();
        this._server = new WebSocketServer({
            host: this.config.host,
            port: this.config.port,
        });

        this._server.on('connection', (socket, request) => {
            const connectionId = this._nextConnectionId++;
            const session = this._createSession(connectionId);
            this._stats.connectionsAccepted += 1;
            this._sessions.set(socket, session);
            this._log('client-connected', {
                connectionId,
                remoteAddress: request?.socket?.remoteAddress || null,
            });

            this._safeSend(socket, session.getReadyEnvelope());

            socket.on('message', (raw) => {
                this._stats.messagesReceived += 1;
                const response = session.routeMessage(raw, socket);
                this._safeSend(socket, response);
            });

            socket.on('close', () => {
                this._stats.connectionsClosed += 1;
                this._sessions.delete(socket);
                this._log('client-closed', { connectionId });
            });

            socket.on('error', (error) => {
                this._log('client-error', {
                    connectionId,
                    message: error?.message || String(error),
                });
            });
        });

        await new Promise((resolve, reject) => {
            this._server.once('listening', resolve);
            this._server.once('error', reject);
        });
    }

    getAddress() {
        if (!this._server) return null;
        const address = this._server.address();
        if (!address) return null;
        if (typeof address === 'string') {
            return {
                host: this.config.host || '127.0.0.1',
                port: this.config.port || 8765,
                raw: address,
            };
        }
        return {
            host: address.address,
            port: address.port,
            raw: `${address.address}:${address.port}`,
        };
    }

    getStatsSnapshot() {
        const activeConnections = this._sessions.size;
        const sessionStats = [];
        for (const session of this._sessions.values()) {
            sessionStats.push(session.getStatsSnapshot());
        }
        return {
            ...this._stats,
            uptimeMs: this._startedAt == null ? 0 : Math.max(0, now() - this._startedAt),
            activeConnections,
            sessionStats,
        };
    }

    async stop() {
        if (!this._server) return;
        const sockets = Array.from(this._sessions.keys());
        for (const socket of sockets) {
            try {
                socket.close();
            } catch {
                // ignore close errors
            }
        }
        this._sessions.clear();

        await new Promise((resolve) => {
            this._server.close(() => resolve());
        });
        this._server = null;
    }
}
