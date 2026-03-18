// ============================================
// lan-signaling.js - HTTP-based LAN signaling server
// ============================================
// Embedded in Electron/Tauri app main process.
// Handles lobby creation, SDP/ICE exchange for WebRTC setup.
// Runs on port 9090, accessible only in LAN (bind: 0.0.0.0).

import http from 'node:http';

function generateLobbyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
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
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); } catch { resolve({}); }
        });
    });
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

        if (req.method === 'POST' && path === '/lobby/join') {
            const playerId = `player-${nextPlayerId++}`;
            lobby.players.push({ playerId, ready: false, joinedAt: Date.now() });
            lobby.pendingPlayers.push({ playerId });
            jsonResponse(res, { playerId, lobbyCode: lobby.code });
            return;
        }

        if (req.method === 'GET' && path === '/lobby/status') {
            const pending = lobby.pendingPlayers.splice(0);
            jsonResponse(res, {
                lobbyCode: lobby.code,
                players: lobby.players,
                pendingPlayers: pending,
            });
            return;
        }

        if (req.method === 'POST' && path === '/signaling/offer') {
            const body = await readBody(req);
            lobby.offers.set(body.targetPlayerId, body.offer);
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === '/signaling/offer') {
            const playerId = url.searchParams.get('playerId');
            const offer = lobby.offers.get(playerId);
            lobby.offers.delete(playerId);
            jsonResponse(res, { offer: offer || null });
            return;
        }

        if (req.method === 'POST' && path === '/signaling/answer') {
            const body = await readBody(req);
            lobby.answers.set(body.playerId, body.answer);
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === '/signaling/answer') {
            const playerId = url.searchParams.get('playerId');
            const answer = lobby.answers.get(playerId);
            lobby.answers.delete(playerId);
            jsonResponse(res, { answer: answer || null });
            return;
        }

        if (req.method === 'POST' && path === '/signaling/ice') {
            const body = await readBody(req);
            if (!lobby.ice.has(body.playerId)) lobby.ice.set(body.playerId, []);
            lobby.ice.get(body.playerId).push(body.candidate);
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === '/signaling/ice') {
            const playerId = url.searchParams.get('playerId');
            const candidates = lobby.ice.get(playerId) || [];
            lobby.ice.delete(playerId);
            jsonResponse(res, { candidates });
            return;
        }

        // Discovery info endpoint — returns lobby metadata for auto-discovery
        if (req.method === 'GET' && path === '/discovery/info') {
            jsonResponse(res, {
                lobbyCode: lobby.code,
                playerCount: lobby.players.length,
                maxPlayers: 10,
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

// Allow standalone execution
if (process.argv[1] && process.argv[1].endsWith('lan-signaling.js')) {
    const port = parseInt(process.argv[2] || '9090', 10);
    createLANSignalingServer(port);
}
