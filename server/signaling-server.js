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

const lobbies = new Map();
const peerToLobby = new Map();

const HEARTBEAT_INTERVAL = 4000;
const STALE_TIMEOUT = 15000;
const LOBBY_TIMEOUT = 30 * 60 * 1000;

let nextPeerId = 1;

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

function buildLobbyState(lobby) {
    if (!lobby) return null;
    return {
        contractVersion: SIGNALING_SESSION_CONTRACT_VERSION,
        lobbyCode: lobby.code,
        hostPeerId: lobby.hostPeerId,
        maxPlayers: lobby.maxPlayers,
        createdAt: lobby.createdAt,
        players: lobby.players.map((player) => ({
            peerId: player.peerId,
            playerId: player.peerId,
            isHost: player.isHost === true,
            ready: player.ready === true,
        })),
    };
}

function removePeerFromLobby(ws) {
    const lobbyCode = peerToLobby.get(ws);
    if (!lobbyCode) return;

    const lobby = lobbies.get(lobbyCode);
    if (!lobby) return;

    const player = lobby.players.find((entry) => entry.ws === ws);
    if (!player) return;

    lobby.players = lobby.players.filter((entry) => entry.ws !== ws);
    peerToLobby.delete(ws);

    broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_LEFT, { peerId: player.peerId });

    if (lobby.players.length === 0) {
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
        const peerId = `peer-${nextPeerId++}`;
        ws._peerId = peerId;
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

            switch (envelope.type) {
            case SIGNALING_COMMAND_TYPES.CREATE_LOBBY: {
                const code = generateLobbyCode();
                const maxPlayers = Math.min(Math.max(msg.maxPlayers || 10, 2), 10);
                const lobby = {
                    code,
                    maxPlayers,
                    hostPeerId: peerId,
                    players: [{ peerId, ws, isHost: true, ready: true }],
                    createdAt: Date.now(),
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
                const lobby = lobbies.get(msg.lobbyCode);
                if (!lobby) {
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Lobby not found' });
                    return;
                }
                if (lobby.players.length >= lobby.maxPlayers) {
                    sendSignaling(ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Lobby full' });
                    return;
                }
                lobby.players.push({ peerId, ws, isHost: false, ready: false });
                peerToLobby.set(ws, msg.lobbyCode);
                sendSignaling(ws, SIGNALING_EVENT_TYPES.LOBBY_JOINED, {
                    playerId: peerId,
                    lobbyCode: msg.lobbyCode,
                    sessionState: buildLobbyState(lobby),
                });
                broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_JOINED, {
                    peerId,
                    name: msg.name || peerId,
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
                }
                broadcastToLobby(lobby, SIGNALING_EVENT_TYPES.PLAYER_READY, {
                    peerId,
                    ready: msg.ready === true,
                    sessionState: buildLobbyState(lobby),
                });
                break;
            }

            case SIGNALING_COMMAND_TYPES.LEAVE:
                removePeerFromLobby(ws);
                break;

            default:
                break;
            }
        });

        ws.on('close', () => {
            removePeerFromLobby(ws);
        });
    });

    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive || Date.now() - ws._lastPong > STALE_TIMEOUT) {
                removePeerFromLobby(ws);
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });

        const now = Date.now();
        for (const [code, lobby] of lobbies) {
            if (now - lobby.createdAt <= LOBBY_TIMEOUT) continue;
            for (const player of lobby.players) {
                sendSignaling(player.ws, SIGNALING_EVENT_TYPES.ERROR, { message: 'Lobby expired' });
                peerToLobby.delete(player.ws);
            }
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
