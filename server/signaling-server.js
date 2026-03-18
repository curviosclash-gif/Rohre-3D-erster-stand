// ============================================
// signaling-server.js - WebSocket signaling server for Internet play
// ============================================
// Self-hosted on VPS. Handles lobby CRUD, SDP/ICE forwarding.
// Deploy: node server/signaling-server.js [port]
// Or via Docker: see server/Dockerfile

import { WebSocketServer } from 'ws';

function generateLobbyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
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

function broadcastToLobby(lobby, data, excludeWs) {
    for (const player of lobby.players) {
        if (player.ws !== excludeWs) {
            sendJson(player.ws, data);
        }
    }
}

function removePeerFromLobby(ws) {
    const lobbyCode = peerToLobby.get(ws);
    if (!lobbyCode) return;

    const lobby = lobbies.get(lobbyCode);
    if (!lobby) return;

    const player = lobby.players.find((p) => p.ws === ws);
    if (!player) return;

    lobby.players = lobby.players.filter((p) => p.ws !== ws);
    peerToLobby.delete(ws);

    broadcastToLobby(lobby, { type: 'player_left', peerId: player.peerId });

    if (lobby.players.length === 0) {
        lobbies.delete(lobbyCode);
    }
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
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            switch (msg.type) {
            case 'create_lobby': {
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
                sendJson(ws, { type: 'lobby_created', lobbyCode: code, playerId: peerId });
                break;
            }

            case 'join_lobby': {
                const lobby = lobbies.get(msg.lobbyCode);
                if (!lobby) {
                    sendJson(ws, { type: 'error', message: 'Lobby not found' });
                    return;
                }
                if (lobby.players.length >= lobby.maxPlayers) {
                    sendJson(ws, { type: 'error', message: 'Lobby full' });
                    return;
                }
                lobby.players.push({ peerId, ws, isHost: false, ready: false });
                peerToLobby.set(ws, msg.lobbyCode);
                sendJson(ws, { type: 'lobby_joined', playerId: peerId });
                broadcastToLobby(lobby, { type: 'player_joined', peerId, name: msg.name || peerId }, ws);
                break;
            }

            case 'offer': {
                const target = findPeerWs(ws, msg.targetPeerId);
                if (target) {
                    sendJson(target, { type: 'offer', fromPeerId: peerId, offer: msg.offer });
                }
                break;
            }

            case 'answer': {
                const target = findPeerWs(ws, msg.targetPeerId);
                if (target) {
                    sendJson(target, { type: 'answer', fromPeerId: peerId, answer: msg.answer });
                }
                break;
            }

            case 'ice': {
                const target = findPeerWs(ws, msg.targetPeerId);
                if (target) {
                    sendJson(target, { type: 'ice', fromPeerId: peerId, candidate: msg.candidate });
                }
                break;
            }

            case 'ready': {
                const lobbyCode = peerToLobby.get(ws);
                const lobby = lobbyCode ? lobbies.get(lobbyCode) : null;
                if (lobby) {
                    const player = lobby.players.find((p) => p.peerId === peerId);
                    if (player) player.ready = !!msg.ready;
                    broadcastToLobby(lobby, { type: 'player_ready', peerId, ready: !!msg.ready });
                }
                break;
            }

            case 'leave':
                removePeerFromLobby(ws);
                break;
            }
        });

        ws.on('close', () => {
            removePeerFromLobby(ws);
        });
    });

    // Heartbeat and lobby cleanup
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

        // Clean up old lobbies
        const now = Date.now();
        for (const [code, lobby] of lobbies) {
            if (now - lobby.createdAt > LOBBY_TIMEOUT) {
                for (const player of lobby.players) {
                    sendJson(player.ws, { type: 'error', message: 'Lobby expired' });
                    peerToLobby.delete(player.ws);
                }
                lobbies.delete(code);
            }
        }
    }, HEARTBEAT_INTERVAL);

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });

    function findPeerWs(senderWs, targetPeerId) {
        const lobbyCode = peerToLobby.get(senderWs);
        if (!lobbyCode) return null;
        const lobby = lobbies.get(lobbyCode);
        if (!lobby) return null;
        const target = lobby.players.find((p) => p.peerId === targetPeerId);
        return target?.ws || null;
    }

    console.log(`Signaling Server running on ws://0.0.0.0:${port}`);
    return wss;
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].endsWith('signaling-server.js')) {
    const port = parseInt(process.argv[2] || '9090', 10);
    createSignalingServer(port);
}
