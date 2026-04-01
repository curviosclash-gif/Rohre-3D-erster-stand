// ============================================
// lan-signaling.js - HTTP-based LAN signaling server
// ============================================

import http from 'node:http';
import {
    SIGNALING_HTTP_ROUTES,
    SIGNALING_SESSION_CONTRACT_VERSION,
} from '../src/shared/contracts/SignalingSessionContract.js';

const DEFAULT_MAX_PLAYERS = 10;
const DEFAULT_GHOST_PLAYER_TIMEOUT_MS = 60_000;
const DEFAULT_GHOST_CLEANUP_INTERVAL_MS = 5_000;

function normalizeLobbyCode(value) {
    return String(value || '').trim().toUpperCase();
}

function toPlayerId(value) {
    return String(value || '').trim();
}

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
        hostReady: lobby.hostReady === true,
        maxPlayers: Number(lobby.maxPlayers || DEFAULT_MAX_PLAYERS),
        updatedAt: Date.now(),
        players: lobby.players.map((player) => ({
            peerId: player.playerId,
            playerId: player.playerId,
            ready: player.ready === true,
            isHost: false,
        })),
        pendingPlayers: lobby.pendingPlayers.map((entry) => ({ playerId: entry.playerId })),
        pendingMatchStart: lobby.pendingMatchStart
            ? {
                commandId: String(lobby.pendingMatchStart.commandId || '').trim(),
                lobbyCode: String(lobby.pendingMatchStart.lobbyCode || lobby.code).trim(),
                hostPeerId: String(lobby.pendingMatchStart.hostPeerId || 'host').trim() || 'host',
                issuedAt: Number(lobby.pendingMatchStart.issuedAt || Date.now()),
                settingsSnapshot: lobby.pendingMatchStart.settingsSnapshot ?? null,
            }
            : null,
    };
}

export function createLANSignalingServer(port = 9090, options = {}) {
    const now = typeof options.now === 'function' ? options.now : () => Date.now();
    const ghostPlayerTimeoutMs = Number.isFinite(Number(options.ghostPlayerTimeoutMs))
        ? Math.max(1, Math.floor(Number(options.ghostPlayerTimeoutMs)))
        : DEFAULT_GHOST_PLAYER_TIMEOUT_MS;
    const ghostCleanupIntervalMs = Number.isFinite(Number(options.ghostCleanupIntervalMs))
        ? Math.max(0, Math.floor(Number(options.ghostCleanupIntervalMs)))
        : DEFAULT_GHOST_CLEANUP_INTERVAL_MS;

    const lobby = {
        code: generateLobbyCode(),
        hostReady: false,
        maxPlayers: DEFAULT_MAX_PLAYERS,
        players: [],
        pendingPlayers: [],
        offers: new Map(),
        answers: new Map(),
        // key: target playerId, value: Array<{ fromPlayerId: string, candidate: any }>
        ice: new Map(),
        pendingMatchStart: null,
    };

    let nextPlayerId = 1;

    const touchPlayerActivity = (playerId) => {
        const normalizedPlayerId = toPlayerId(playerId);
        if (!normalizedPlayerId) return;
        const timestamp = now();
        const player = lobby.players.find((entry) => entry.playerId === normalizedPlayerId);
        if (player) {
            player.lastActivityAt = timestamp;
        }
        const pendingEntry = lobby.pendingPlayers.find((entry) => entry.playerId === normalizedPlayerId);
        if (pendingEntry) {
            pendingEntry.lastActivityAt = timestamp;
        }
    };

    const removePlayerFromIceQueues = (playerId) => {
        for (const [targetPlayerId, queue] of lobby.ice.entries()) {
            if (targetPlayerId === playerId) {
                lobby.ice.delete(targetPlayerId);
                continue;
            }
            const remaining = queue.filter((entry) => entry.fromPlayerId !== playerId);
            if (remaining.length <= 0) {
                lobby.ice.delete(targetPlayerId);
            } else if (remaining.length !== queue.length) {
                lobby.ice.set(targetPlayerId, remaining);
            }
        }
    };

    const removePlayer = (playerId) => {
        const normalizedPlayerId = toPlayerId(playerId);
        if (!normalizedPlayerId) return;
        lobby.players = lobby.players.filter((entry) => entry.playerId !== normalizedPlayerId);
        lobby.pendingPlayers = lobby.pendingPlayers.filter((entry) => entry.playerId !== normalizedPlayerId);
        lobby.offers.delete(normalizedPlayerId);
        lobby.answers.delete(normalizedPlayerId);
        removePlayerFromIceQueues(normalizedPlayerId);
    };

    const cleanupGhostPlayers = (timestamp = now()) => {
        if (lobby.players.length > 0) {
            const stalePlayers = lobby.players
                .filter((entry) => timestamp - Number(entry.lastActivityAt || entry.joinedAt || 0) >= ghostPlayerTimeoutMs)
                .map((entry) => entry.playerId);
            for (const stalePlayerId of stalePlayers) {
                removePlayer(stalePlayerId);
            }
        }
        if (lobby.pendingPlayers.length > 0) {
            lobby.pendingPlayers = lobby.pendingPlayers.filter(
                (entry) => timestamp - Number(entry.lastActivityAt || 0) < ghostPlayerTimeoutMs
            );
        }
    };

    const cleanupIntervalId = ghostCleanupIntervalMs > 0
        ? setInterval(() => cleanupGhostPlayers(), ghostCleanupIntervalMs)
        : null;

    const server = http.createServer(async (req, res) => {
        if (req.method === 'OPTIONS') {
            jsonResponse(res, {});
            return;
        }

        const url = new URL(req.url, `http://localhost:${port}`);
        const path = url.pathname;

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_CREATE) {
            const body = await readBody(req);
            const requestedMaxPlayers = Number(body.maxPlayers);
            lobby.code = generateLobbyCode();
            lobby.hostReady = false;
            lobby.maxPlayers = Number.isFinite(requestedMaxPlayers)
                ? Math.max(2, Math.min(DEFAULT_MAX_PLAYERS, Math.floor(requestedMaxPlayers)))
                : DEFAULT_MAX_PLAYERS;
            lobby.players = [];
            lobby.pendingPlayers = [];
            lobby.offers.clear();
            lobby.answers.clear();
            lobby.ice.clear();
            lobby.pendingMatchStart = null;
            jsonResponse(res, {
                ok: true,
                lobbyCode: lobby.code,
                sessionState: buildLobbyState(lobby),
            });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_JOIN) {
            cleanupGhostPlayers();
            const body = await readBody(req);
            const requestedLobbyCode = normalizeLobbyCode(body.lobbyCode);
            if (requestedLobbyCode && requestedLobbyCode !== normalizeLobbyCode(lobby.code)) {
                jsonResponse(res, { ok: false, message: 'lobby_not_found' }, 404);
                return;
            }
            const playerId = `player-${nextPlayerId++}`;
            const timestamp = now();
            lobby.players.push({ playerId, ready: false, joinedAt: timestamp, lastActivityAt: timestamp });
            lobby.pendingPlayers.push({ playerId, lastActivityAt: timestamp });
            jsonResponse(res, {
                playerId,
                lobbyCode: lobby.code,
                sessionState: buildLobbyState(lobby),
            });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_READY) {
            const body = await readBody(req);
            const playerId = toPlayerId(body.playerId);
            const ready = body.ready === true;
            if (playerId === 'host') {
                lobby.hostReady = ready;
                jsonResponse(res, { ok: true, sessionState: buildLobbyState(lobby) });
                return;
            }
            const player = lobby.players.find((entry) => entry.playerId === playerId);
            if (!player) {
                jsonResponse(res, { ok: false, message: 'player_not_found' }, 404);
                return;
            }
            player.ready = ready;
            touchPlayerActivity(playerId);
            jsonResponse(res, { ok: true, sessionState: buildLobbyState(lobby) });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_LEAVE) {
            const body = await readBody(req);
            const playerId = toPlayerId(body.playerId);
            removePlayer(playerId);
            jsonResponse(res, { ok: true, sessionState: buildLobbyState(lobby) });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_INVALIDATE_READY) {
            lobby.hostReady = false;
            lobby.players = lobby.players.map((entry) => ({
                ...entry,
                ready: false,
            }));
            jsonResponse(res, { ok: true, sessionState: buildLobbyState(lobby) });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.LOBBY_STATUS) {
            cleanupGhostPlayers();
            const pending = lobby.pendingPlayers.map((entry) => ({ playerId: entry.playerId }));
            const lobbyState = buildLobbyState(lobby);
            jsonResponse(res, {
                sessionState: {
                    ...lobbyState,
                    pendingPlayers: pending,
                },
                ...lobbyState,
                pendingPlayers: pending,
            });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_ACK_PENDING) {
            const body = await readBody(req);
            const playerId = toPlayerId(body.playerId);
            if (playerId) {
                lobby.pendingPlayers = lobby.pendingPlayers.filter((entry) => entry.playerId !== playerId);
                touchPlayerActivity(playerId);
            }
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.LOBBY_MATCH_START) {
            const body = await readBody(req);
            const timestamp = now();
            const requestedCommandId = String(body.commandId || '').trim();
            lobby.pendingMatchStart = {
                commandId: requestedCommandId || `match-${timestamp}`,
                lobbyCode: lobby.code,
                hostPeerId: 'host',
                issuedAt: timestamp,
                settingsSnapshot: body?.settingsSnapshot ?? null,
            };
            jsonResponse(res, {
                ok: true,
                pendingMatchStart: lobby.pendingMatchStart,
                sessionState: buildLobbyState(lobby),
            });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.SIGNALING_OFFER) {
            const body = await readBody(req);
            const targetPlayerId = toPlayerId(body.targetPlayerId);
            if (targetPlayerId) {
                lobby.offers.set(targetPlayerId, body.offer);
                touchPlayerActivity(targetPlayerId);
            }
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.SIGNALING_OFFER) {
            const playerId = toPlayerId(url.searchParams.get('playerId'));
            const offer = lobby.offers.get(playerId);
            lobby.offers.delete(playerId);
            touchPlayerActivity(playerId);
            jsonResponse(res, { offer: offer || null });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ANSWER) {
            const body = await readBody(req);
            const playerId = toPlayerId(body.playerId);
            if (playerId) {
                lobby.answers.set(playerId, body.answer);
                touchPlayerActivity(playerId);
            }
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ANSWER) {
            const playerId = toPlayerId(url.searchParams.get('playerId'));
            const answer = lobby.answers.get(playerId);
            lobby.answers.delete(playerId);
            touchPlayerActivity(playerId);
            jsonResponse(res, { answer: answer || null });
            return;
        }

        if (req.method === 'POST' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ICE) {
            const body = await readBody(req);
            const fromPlayerId = toPlayerId(body.playerId);
            const targetPlayerId = toPlayerId(body.targetPlayerId) || fromPlayerId;
            if (!targetPlayerId) {
                jsonResponse(res, { ok: false, message: 'target_player_missing' }, 400);
                return;
            }
            if (!lobby.ice.has(targetPlayerId)) {
                lobby.ice.set(targetPlayerId, []);
            }
            lobby.ice.get(targetPlayerId).push({
                fromPlayerId: fromPlayerId || 'unknown',
                candidate: body.candidate,
            });
            touchPlayerActivity(fromPlayerId);
            touchPlayerActivity(targetPlayerId);
            jsonResponse(res, { ok: true });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.SIGNALING_ICE) {
            const playerId = toPlayerId(url.searchParams.get('playerId'));
            const fromPlayerId = toPlayerId(url.searchParams.get('fromPlayerId'));
            touchPlayerActivity(playerId);

            const queue = lobby.ice.get(playerId) || [];
            if (!fromPlayerId) {
                const candidates = queue.map((entry) => entry.candidate);
                lobby.ice.delete(playerId);
                jsonResponse(res, { candidates });
                return;
            }

            const candidates = [];
            const remaining = [];
            for (const entry of queue) {
                if (entry.fromPlayerId === fromPlayerId) {
                    candidates.push(entry.candidate);
                } else {
                    remaining.push(entry);
                }
            }
            if (remaining.length <= 0) {
                lobby.ice.delete(playerId);
            } else {
                lobby.ice.set(playerId, remaining);
            }
            jsonResponse(res, { candidates });
            return;
        }

        if (req.method === 'GET' && path === SIGNALING_HTTP_ROUTES.DISCOVERY_INFO) {
            cleanupGhostPlayers();
            jsonResponse(res, {
                lobbyCode: lobby.code,
                playerCount: lobby.players.length,
                maxPlayers: DEFAULT_MAX_PLAYERS,
                sessionState: buildLobbyState(lobby),
            });
            return;
        }

        jsonResponse(res, { error: 'Not found' }, 404);
    });

    server.on('close', () => {
        if (cleanupIntervalId) {
            clearInterval(cleanupIntervalId);
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`LAN Signaling Server running on port ${port}, lobby code: ${lobby.code}`);
    });

    return { server, lobby, cleanupGhostPlayers };
}

if (process.argv[1] && process.argv[1].endsWith('lan-signaling.js')) {
    const port = parseInt(process.argv[2] || '9090', 10);
    createLANSignalingServer(port);
}
