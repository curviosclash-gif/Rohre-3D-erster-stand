// ============================================
// lan-signaling.js - HTTP-based LAN signaling server
// ============================================

import http from 'node:http';
import {
    SIGNALING_HTTP_ROUTES,
    SIGNALING_SESSION_CONTRACT_VERSION,
} from '../src/shared/contracts/SignalingSessionContract.js';

function generateLobbyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function jsonResponse(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify({
        contractVersion: SIGNALING_SESSION_CONTRACT_VERSION,
        ...data,
    }));
}

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve({});
            }
        });
    });
}

function buildLobbyState(lobby) {
    return {
        lobbyCode: lobby.code,
        hostPeerId: 'host',
        maxPlayers: 10,
        updatedAt: Date.now(),
        players: lobby.players.map((player) => ({
            peerId: player.playerId,
            playerId: player.playerId,
            ready: player.ready === true,
            isHost: false,
        })),
        pendingPlayers: lobby.pendingPlayers.map((entry) => ({ playerId: entry.playerId })),
    };
}

export function createLANSignalingServer(port = 9090) {
    const lobby = {
        code: generateLobbyCode(),
        players: [],
        pendingPlayers: [],
        offers: new Map(),
        answers: new Map(),
        ice: new Map(),
    };

    let nextPlayerId = 1;

    const server = http.createServer(async (req, res) => {
        if (req.method === 'OPTIONS') {
            jsonResponse(res, {});
            return;
        }

        const url = new URL(req.url, `http://localhost:${port}`);
        const path = url.pathname;

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_JOIN) {
            const playerId = `player-${nextPlayerId++}`;
            lobby.players.push({ playerId, ready: false, joinedAt: Date.now() });
            lobby.pendingPlayers.push({ playerId });
            jsonResponse(res, {
                playerId,
                lobbyCode: lobby.code,
                sessionState: buildLobbyState(lobby),
            });
            return;
        }

        if (req.method === 'POST' && path === '/lobby/ready') {
            const body = await readBody(req);
            const playerId = String(body.playerId || '').trim();
            const ready = body.ready === true;
            const player = lobby.players.find((entry) => entry.playerId === playerId);
            if (!player) {
                jsonResponse(res, { ok: false, message: 'player_not_found' }, 404);
                return;
            }
            player.ready = ready;
            jsonResponse(res, { ok: true, sessionState: buildLobbyState(lobby) });
            return;
        }

        if (req.method === 'POST' && path === '/lobby/leave') {
            const body = await readBody(req);
            const playerId = String(body.playerId || '').trim();
            if (playerId) {
                lobby.players = lobby.players.filter((entry) => entry.playerId !== playerId);
                lobby.pendingPlayers = lobby.pendingPlayers.filter((entry) => entry.playerId !== playerId);
                lobby.offers.delete(playerId);
                lobby.answers.delete(playerId);
                lobby.ice.delete(playerId);
            }
            jsonResponse(res, { ok: true, sessionState: buildLobbyState(lobby) });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.LOBBY_STATUS) {
            const pending = lobby.pendingPlayers.splice(0);
            jsonResponse(res, {
                sessionState: {
                    ...buildLobbyState(lobby),
                    pendingPlayers: pending,
                },
                ...buildLobbyState(lobby),
                pendingPlayers: pending,
            });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.SIGNALING_OFFER) {
            const body = await readBody(req);
            lobby.offers.set(body.targetPlayerId, body.offer);
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.SIGNALING_OFFER) {
            const playerId = url.searchParams.get('playerId');
            const offer = lobby.offers.get(playerId);
            lobby.offers.delete(playerId);
            jsonResponse(res, { offer: offer || null });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ANSWER) {
            const body = await readBody(req);
            lobby.answers.set(body.playerId, body.answer);
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ANSWER) {
            const playerId = url.searchParams.get('playerId');
            const answer = lobby.answers.get(playerId);
            lobby.answers.delete(playerId);
            jsonResponse(res, { answer: answer || null });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ICE) {
            const body = await readBody(req);
            if (!lobby.ice.has(body.playerId)) lobby.ice.set(body.playerId, []);
            lobby.ice.get(body.playerId).push(body.candidate);
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ICE) {
            const playerId = url.searchParams.get('playerId');
            const candidates = lobby.ice.get(playerId) || [];
            lobby.ice.delete(playerId);
            jsonResponse(res, { candidates });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.DISCOVERY_INFO) {
            jsonResponse(res, {
                lobbyCode: lobby.code,
                playerCount: lobby.players.length,
                maxPlayers: 10,
                sessionState: buildLobbyState(lobby),
            });
            return;
        }

        jsonResponse(res, { error: 'Not found' }, 404);
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`LAN Signaling Server running on port ${port}, lobby code: ${lobby.code}`);
    });

    return { server, lobby };
}

if (process.argv[1] && process.argv[1].endsWith('lan-signaling.js')) {
    const port = parseInt(process.argv[2] || '9090', 10);
    createLANSignalingServer(port);
}
