import assert from 'node:assert/strict';
import test from 'node:test';

import { createLANSignalingServer } from '../server/lan-signaling.js';

async function startLanServer(options = {}) {
    const bundle = createLANSignalingServer(0, options);
    await new Promise((resolve) => bundle.server.once('listening', resolve));
    const address = bundle.server.address();
    const port = Number(address?.port || 0);
    return {
        ...bundle,
        baseUrl: `http://127.0.0.1:${port}`,
    };
}

async function stopLanServer(server) {
    if (!server || !server.listening) return;
    await new Promise((resolve) => server.close(() => resolve()));
}

async function postJson(baseUrl, path, body = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    return {
        ok: response.ok,
        status: response.status,
        payload,
    };
}

async function postRaw(baseUrl, path, rawBody) {
    const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
    });
    const payload = await response.json().catch(() => ({}));
    return {
        ok: response.ok,
        status: response.status,
        payload,
    };
}

test('LAN signaling enforces maxPlayers on join requests', async () => {
    const lanServer = await startLanServer();
    try {
        const created = await postJson(lanServer.baseUrl, '/lobby/create', { maxPlayers: 2 });
        assert.equal(created.ok, true);

        const joinedFirst = await postJson(lanServer.baseUrl, '/lobby/join', {
            lobbyCode: created.payload?.lobbyCode || '',
        });
        assert.equal(joinedFirst.ok, true);
        assert.ok(String(joinedFirst.payload?.playerId || '').startsWith('player-'));

        const joinedSecond = await postJson(lanServer.baseUrl, '/lobby/join', {
            lobbyCode: created.payload?.lobbyCode || '',
        });
        assert.equal(joinedSecond.ok, false);
        assert.equal(joinedSecond.status, 409);
        assert.equal(joinedSecond.payload?.message, 'lobby_full');
    } finally {
        await stopLanServer(lanServer.server);
    }
});

test('LAN signaling rejects oversized JSON payloads with 413', async () => {
    const lanServer = await startLanServer();
    try {
        const oversizedPayload = JSON.stringify({
            maxPlayers: 4,
            padding: 'x'.repeat(20 * 1024),
        });

        const oversizedCreate = await postRaw(lanServer.baseUrl, '/lobby/create', oversizedPayload);
        assert.equal(oversizedCreate.ok, false);
        assert.equal(oversizedCreate.status, 413);
        assert.equal(oversizedCreate.payload?.message, 'payload_too_large');
    } finally {
        await stopLanServer(lanServer.server);
    }
});

test('LAN signaling requires host token for host-only mutating routes', async () => {
    const lanServer = await startLanServer();
    try {
        const created = await postJson(lanServer.baseUrl, '/lobby/create', { maxPlayers: 4 });
        const hostToken = String(created.payload?.hostToken || '').trim();
        assert.equal(created.ok, true);
        assert.ok(hostToken.length > 0);

        const joined = await postJson(lanServer.baseUrl, '/lobby/join', {
            lobbyCode: created.payload?.lobbyCode || '',
        });
        const playerId = String(joined.payload?.playerId || '').trim();
        const playerToken = String(joined.payload?.playerToken || '').trim();
        assert.equal(joined.ok, true);
        assert.ok(playerId.length > 0);
        assert.ok(playerToken.length > 0);

        const clientReady = await postJson(lanServer.baseUrl, '/lobby/ready', {
            playerId,
            playerToken,
            ready: true,
        });
        assert.equal(clientReady.ok, true);

        const hostReady = await postJson(lanServer.baseUrl, '/lobby/ready', {
            playerId: 'host',
            hostToken,
            ready: true,
        });
        assert.equal(hostReady.ok, true);

        const invalidateDenied = await postJson(lanServer.baseUrl, '/lobby/invalidate-ready', {
            hostPeerId: 'host',
        });
        assert.equal(invalidateDenied.ok, false);
        assert.equal(invalidateDenied.status, 403);
        assert.equal(invalidateDenied.payload?.message, 'host_auth_failed');

        const invalidateAllowed = await postJson(lanServer.baseUrl, '/lobby/invalidate-ready', {
            hostPeerId: 'host',
            hostToken,
        });
        assert.equal(invalidateAllowed.ok, true);

        const startDenied = await postJson(lanServer.baseUrl, '/lobby/match-start', {
            hostPeerId: 'host',
        });
        assert.equal(startDenied.ok, false);
        assert.equal(startDenied.status, 403);
        assert.equal(startDenied.payload?.message, 'host_auth_failed');
    } finally {
        await stopLanServer(lanServer.server);
    }
});

test('LAN signaling requires player token for player mutating routes', async () => {
    const lanServer = await startLanServer();
    try {
        const created = await postJson(lanServer.baseUrl, '/lobby/create', { maxPlayers: 4 });
        const lobbyCode = String(created.payload?.lobbyCode || '').trim();
        assert.equal(created.ok, true);

        const joined = await postJson(lanServer.baseUrl, '/lobby/join', { lobbyCode });
        const playerId = String(joined.payload?.playerId || '').trim();
        const playerToken = String(joined.payload?.playerToken || '').trim();
        assert.equal(joined.ok, true);
        assert.ok(playerId.length > 0);
        assert.ok(playerToken.length > 0);

        const readyDenied = await postJson(lanServer.baseUrl, '/lobby/ready', {
            playerId,
            ready: true,
        });
        assert.equal(readyDenied.ok, false);
        assert.equal(readyDenied.status, 403);
        assert.equal(readyDenied.payload?.message, 'player_auth_failed');

        const readyAllowed = await postJson(lanServer.baseUrl, '/lobby/ready', {
            playerId,
            playerToken,
            ready: true,
        });
        assert.equal(readyAllowed.ok, true);

        const leaveDenied = await postJson(lanServer.baseUrl, '/lobby/leave', {
            playerId,
        });
        assert.equal(leaveDenied.ok, false);
        assert.equal(leaveDenied.status, 403);
        assert.equal(leaveDenied.payload?.message, 'player_auth_failed');

        const leaveAllowed = await postJson(lanServer.baseUrl, '/lobby/leave', {
            playerId,
            playerToken,
        });
        assert.equal(leaveAllowed.ok, true);
    } finally {
        await stopLanServer(lanServer.server);
    }
});
