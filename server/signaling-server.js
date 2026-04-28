// ============================================
// signaling-server.js - WebSocket signaling server for Internet play
// ============================================

import { WebSocketServer } from 'ws';
import {
    SIGNALING_COMMAND_TYPES,
    SIGNALING_EVENT_TYPES,
    SIGNALING_SESSION_CONTRACT_VERSION,
    createSignalingEnvelope,
    normalizeSignalingEnvelope,
} from '../src/shared/contracts/SignalingSessionContract.js';

function generateLobbyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function generateMatchCommandId() {
    return `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const lobbies = new Map();
const peerToLobby = new Map();
const reconnectLeases = new Map();

const HEARTBEAT_INTERVAL = 4000;
const STALE_TIMEOUT = 15000;
const LOBBY_TIMEOUT = 30 * 60 * 1000;
const RECONNECT_WINDOW_MS = 30_000;

let nextPeerId = 1;

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeLobbyCode(value, fallback = '') {
    return normalizeString(value, fallback).toUpperCase();
}

function sendJson(ws, data) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}

function sendSignaling(ws, type, payload = null) {
    sendJson(ws, createSignalingEnvelope(type, payload));
}

function broadcastToLobby(lobby, type, payload = null, excludeWs = null) {
    for (const player of lobby.players) {
        if (player.ws === excludeWs) continue;
        sendSignaling(player.ws, type, payload);
    }
}

function getSocketPeerId(ws) {
    return normalizeString(ws?._peerId, '');
}

function buildReconnectLeaseKey(lobbyCode, peerId) {
    const normalizedLobbyCode = normalizeLobbyCode(lobbyCode, '');
    const normalizedPeerId = normalizeString(peerId, '');
    if (!normalizedLobbyCode || !normalizedPeerId) return '';
    return `${normalizedLobbyCode}:${normalizedPeerId}`;
}

function clearReconnectLease(lobbyCode, peerId) {
    const leaseKey = buildReconnectLeaseKey(lobbyCode, peerId);
    if (!leaseKey) return;
    reconnectLeases.delete(leaseKey);
}

function clearLobbyReconnectLeases(lobbyCode) {
    const normalizedLobbyCode = normalizeLobbyCode(lobbyCode, '');
    if (!normalizedLobbyCode) return;
    for (const leaseKey of reconnectLeases.keys()) {
        if (leaseKey.startsWith(`${normalizedLobbyCode}:`)) {
            reconnectLeases.delete(leaseKey);
        }
    }
}

function createLobbyPlayer({
    peerId,
    ws,
    isHost = false,
    ready = false,
    actorId = '',
    name = '',
    joinedAt = Date.now(),
    lastSeenAt = Date.now(),
} = {}) {
    const normalizedPeerId = normalizeString(peerId, '');
    const fallbackName = isHost === true ? 'Host' : normalizedPeerId;
    return {
        peerId: normalizedPeerId,
        ws,
        isHost: isHost === true,
        ready: ready === true,
        actorId: normalizeString(actorId, fallbackName),
        name: normalizeString(name || actorId, fallbackName),
        joinedAt: Number.isFinite(Number(joinedAt)) ? Math.max(0, Math.floor(Number(joinedAt))) : Date.now(),
        lastSeenAt: Number.isFinite(Number(lastSeenAt)) ? Math.max(0, Math.floor(Number(lastSeenAt))) : Date.now(),
    };
}

function bumpLobbyState(lobby) {
    if (!lobby) return;
    lobby.updatedAt = Date.now();
    lobby.revision = Number.isFinite(Number(lobby.revision))
        ? Math.max(0, Math.floor(Number(lobby.revision))) + 1
        : 1;
}

function buildLobbyState(lobby) {
    if (!lobby) return null;
    const members = lobby.players.map((player) => ({
        peerId: player.peerId,
        playerId: player.peerId,
        actorId: player.actorId,
        name: player.name,
        role: player.isHost === true ? 'host' : 'client',
        isHost: player.isHost === true,
        ready: player.ready === true,
        joinedAt: Number(player.joinedAt || lobby.createdAt || 0),
        lastSeenAt: Number(player.lastSeenAt || lobby.updatedAt || lobby.createdAt || 0),
    }));
    return {
        contractVersion: SIGNALING_SESSION_CONTRACT_VERSION,
        lobbyCode: lobby.code,
        hostPeerId: lobby.hostPeerId,
        maxPlayers: lobby.maxPlayers,
        createdAt: lobby.createdAt,
        updatedAt: Number(lobby.updatedAt || lobby.createdAt || Date.now()),
        revision: Number(lobby.revision || 0),
        pendingMatchStart: lobby.pendingMatchStart || null,
        members,
        players: members,
    };
}

function setReconnectLease(lobbyCode, player) {
    const leaseKey = buildReconnectLeaseKey(lobbyCode, player?.peerId);
    if (!leaseKey || !player) return;
    reconnectLeases.set(leaseKey, {
        lobbyCode: normalizeLobbyCode(lobbyCode, ''),
        peerId: normalizeString(player.peerId, ''),
        isHost: player.isHost === true,
        ready: player.ready === true,
        actorId: normalizeString(player.actorId, ''),
        name: normalizeString(player.name, ''),
        joinedAt: Number(player.joinedAt || Date.now()),
        expiresAt: Date.now() + RECONNECT_WINDOW_MS,
    });
}

function removePeerFromLobby(ws, options = {}) {
    const lobbyCode = peerToLobby.get(ws);
    if (!lobbyCode) return;

    const lobby = lobbies.get(lobbyCode);
    if (!lobby) {
        peerToLobby.delete(ws);
        return;
    }

    const socketPeerId = getSocketPeerId(ws);
    const player = lobby.players.find((entry) => entry.ws === ws || entry.peerId === socketPeerId);
    if (!player) return;

    lobby.players = lobby.players.filter((entry) => entry.ws !== ws);
    peerToLobby.delete(ws);
    if (options.allowResume === true && player.isHost !== true) {
        setReconnectLease(lobbyCode, player);
    } else {
        clearReconnectLease(lobbyCode, player.peerId);
    }
    bumpLobbyState(lobby);

    broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_LEFT, {
        peerId: player.peerId,
        sessionState: buildLobbyState(lobby),
    });

    if (lobby.players.length === 0) {
        clearLobbyReconnectLeases(lobbyCode);
        lobbies.delete(lobbyCode);
    }
}

function findPeerWs(senderWs, targetPeerId) {
    const lobbyCode = peerToLobby.get(senderWs);
    if (!lobbyCode) return null;
    const lobby = lobbies.get(lobbyCode);
    if (!lobby) return null;
    const target = lobby.players.find((entry) => entry.peerId === targetPeerId);
    return target?.ws || null;
}

export function createSignalingServer(port = 9090) {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws) => {
        ws._peerId = `peer-${nextPeerId++}`;
        ws._lastPong = Date.now();
        ws.isAlive = true;

        ws.on('pong', () => {
            ws._lastPong = Date.now();
            ws.isAlive = true;
        });

        ws.on('message', (raw) => {
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                return;
            }
            const envelope = normalizeSignalingEnvelope(parsed);
            const msg = envelope.payload;
            const peerId = getSocketPeerId(ws);

            switch (envelope.type) {
            case SIGNALING_COMMAND_TYPES.CREATE_LOBBY: {
                const code = generateLobbyCode();
                const maxPlayers = Math.min(Math.max(msg.maxPlayers || 10, 2), 10);
                const createdAt = Date.now();
                const lobby = {
                    code,
                    maxPlayers,
                    hostPeerId: peerId,
                    players: [createLobbyPlayer({
                        peerId,
                        ws,
                        isHost: true,
                        ready: true,
                        actorId: normalizeString(msg.actorId, 'Host'),
                        name: normalizeString(msg.name || msg.actorId, 'Host'),
                        joinedAt: createdAt,
                        lastSeenAt: createdAt,
                    })],
                    createdAt,
                    updatedAt: createdAt,
                    revision: 1,
                    pendingMatchStart: null,
                };
                lobbies.set(code, lobby);
                peerToLobby.set(ws, code);
                sendSignaling(ws, SIGNALING_EVENT_TYPES.LOBBY_CREATED, {
                    lobbyCode: code,
                    playerId: peerId,
                    maxPlayers,
                    sessionState: buildLobbyState(lobby),
                });
                break;
            }

            case SIGNALING_COMMAND_TYPES.JOIN_LOBBY: {
                const requestedLobbyCode = normalizeLobbyCode(msg.lobbyCode, '');
                const lobby = lobbies.get(requestedLobbyCode);
                if (!lobby) {
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Lobby not found' });
                    return;
                }
                if (lobby.players.length >= lobby.maxPlayers) {
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Lobby full' });
                    return;
                }
                lobby.players.push(createLobbyPlayer({
                    peerId,
                    ws,
                    isHost: false,
                    ready: false,
                    actorId: normalizeString(msg.actorId, peerId),
                    name: normalizeString(msg.name || msg.actorId, peerId),
                }));
                bumpLobbyState(lobby);
                peerToLobby.set(ws, requestedLobbyCode);
                sendSignaling(ws, SIGNALING_EVENT_TYPES.LOBBY_JOINED, {
                    playerId: peerId,
                    lobbyCode: requestedLobbyCode,
                    sessionState: buildLobbyState(lobby),
                });
                broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_JOINED, {
                    peerId,
                    name: msg.name || peerId,
                    sessionState: buildLobbyState(lobby),
                }, ws);
                break;
            }

            case SIGNALING_COMMAND_TYPES.RESUME_CONNECTION: {
                const lobbyCode = normalizeLobbyCode(msg.lobbyCode, '');
                const resumePeerId = normalizeString(msg.playerId, '');
                const lobby = lobbyCode ? lobbies.get(lobbyCode) : null;
                const leaseKey = buildReconnectLeaseKey(lobbyCode, resumePeerId);
                const lease = leaseKey ? reconnectLeases.get(leaseKey) : null;
                if (!lobby || !lease) {
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Reconnect window expired' });
                    break;
                }
                if (lease.expiresAt <= Date.now()) {
                    reconnectLeases.delete(leaseKey);
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Reconnect window expired' });
                    break;
                }
                if (lobby.players.some((entry) => entry.peerId === resumePeerId)) {
                    reconnectLeases.delete(leaseKey);
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Player already connected' });
                    break;
                }

                ws._peerId = resumePeerId;
                const resumedAt = Date.now();
                lobby.players.push(createLobbyPlayer({
                    peerId: resumePeerId,
                    ws,
                    isHost: lease.isHost === true,
                    ready: lease.ready === true,
                    actorId: lease.actorId,
                    name: lease.name,
                    joinedAt: lease.joinedAt,
                    lastSeenAt: resumedAt,
                }));
                peerToLobby.set(ws, lobbyCode);
                reconnectLeases.delete(leaseKey);
                bumpLobbyState(lobby);
                sendSignaling(ws, SIGNALING_EVENT_TYPES.CONNECTION_RESUMED, {
                    lobbyCode,
                    playerId: resumePeerId,
                    sessionState: buildLobbyState(lobby),
                });
                broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_RECONNECTED, {
                    peerId: resumePeerId,
                    name: normalizeString(lease.name || lease.actorId, resumePeerId),
                    sessionState: buildLobbyState(lobby),
                }, ws);
                break;
            }

            case SIGNALING_COMMAND_TYPES.OFFER: {
                const target = findPeerWs(ws, msg.targetPeerId);
                if (target) {
                    sendSignaling(target, SIGNALING_COMMAND_TYPES.OFFER, {
                        fromPeerId: peerId,
                        offer: msg.offer,
                    });
                }
                break;
            }

            case SIGNALING_COMMAND_TYPES.ANSWER: {
                const target = findPeerWs(ws, msg.targetPeerId);
                if (target) {
                    sendSignaling(target, SIGNALING_COMMAND_TYPES.ANSWER, {
                        fromPeerId: peerId,
                        answer: msg.answer,
                    });
                }
                break;
            }

            case SIGNALING_COMMAND_TYPES.ICE: {
                const target = findPeerWs(ws, msg.targetPeerId);
                if (target) {
                    sendSignaling(target, SIGNALING_COMMAND_TYPES.ICE, {
                        fromPeerId: peerId,
                        candidate: msg.candidate,
                    });
                }
                break;
            }

            case SIGNALING_COMMAND_TYPES.READY: {
                const lobbyCode = peerToLobby.get(ws);
                const lobby = lobbyCode ? lobbies.get(lobbyCode) : null;
                if (!lobby) break;
                const player = lobby.players.find((entry) => entry.peerId === peerId);
                if (player) {
                    player.ready = msg.ready === true;
                    player.lastSeenAt = Date.now();
                    bumpLobbyState(lobby);
                }
                broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_READY, {
                    peerId,
                    ready: msg.ready === true,
                    sessionState: buildLobbyState(lobby),
                });
                break;
            }

            case SIGNALING_COMMAND_TYPES.INVALIDATE_READY: {
                const lobbyCode = peerToLobby.get(ws);
                const lobby = lobbyCode ? lobbies.get(lobbyCode) : null;
                if (!lobby || lobby.hostPeerId !== peerId) break;
                const invalidatedPeerIds = [];
                for (const player of lobby.players) {
                    if (player.isHost === true || player.ready !== true) continue;
                    player.ready = false;
                    player.lastSeenAt = Date.now();
                    invalidatedPeerIds.push(player.peerId);
                }
                if (invalidatedPeerIds.length > 0) {
                    bumpLobbyState(lobby);
                    for (const peerIdToInvalidate of invalidatedPeerIds) {
                        broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_READY, {
                            peerId: peerIdToInvalidate,
                            ready: false,
                            sessionState: buildLobbyState(lobby),
                        });
                    }
                }
                break;
            }

            case SIGNALING_COMMAND_TYPES.START_MATCH: {
                const lobbyCode = peerToLobby.get(ws);
                const lobby = lobbyCode ? lobbies.get(lobbyCode) : null;
                if (!lobby || lobby.hostPeerId !== peerId) break;
                if (lobby.players.length < 2) {
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'At least two players are required' });
                    break;
                }
                if (lobby.players.some((player) => player.ready !== true)) {
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'All players must be ready' });
                    break;
                }
                lobby.pendingMatchStart = {
                    commandId: String(msg.commandId || '').trim() || generateMatchCommandId(),
                    lobbyCode: lobby.code,
                    hostPeerId: lobby.hostPeerId,
                    issuedAt: Date.now(),
                    settingsSnapshot: msg.settingsSnapshot ?? null,
                };
                bumpLobbyState(lobby);
                broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.MATCH_START, {
                    pendingMatchStart: lobby.pendingMatchStart,
                    sessionState: buildLobbyState(lobby),
                });
                break;
            }

            case SIGNALING_COMMAND_TYPES.LEAVE:
                removePeerFromLobby(ws, { allowResume: false });
                break;

            default:
                break;
            }
        });

        ws.on('close', () => {
            removePeerFromLobby(ws, { allowResume: true });
        });
    });

    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive || Date.now() - ws._lastPong > STALE_TIMEOUT) {
                removePeerFromLobby(ws, { allowResume: true });
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });

        const now = Date.now();
        for (const [leaseKey, lease] of reconnectLeases.entries()) {
            if (Number(lease?.expiresAt || 0) <= now) {
                reconnectLeases.delete(leaseKey);
            }
        }
        for (const [code, lobby] of lobbies) {
            if (now - lobby.createdAt <= LOBBY_TIMEOUT) continue;
            for (const player of lobby.players) {
                sendSignaling(player.ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Lobby expired' });
                peerToLobby.delete(player.ws);
            }
            clearLobbyReconnectLeases(code);
            lobbies.delete(code);
        }
    }, HEARTBEAT_INTERVAL);

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });

    console.log(`Signaling Server running on ws://0.0.0.0:${port}`);
    return wss;
}

if (process.argv[1] && process.argv[1].endsWith('signaling-server.js')) {
    const port = parseInt(process.argv[2] || '9090', 10);
    createSignalingServer(port);
}
