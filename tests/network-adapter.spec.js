import { test, expect } from '@playwright/test';
import {
    loadGame,
    openMultiplayerSubmenu,
    startGameWithBots,
} from './helpers.js';
import { createLANSignalingServer } from '../server/lan-signaling.js';
import { waitForRuntimePlayersLoaded } from '../src/core/runtime/RuntimeSessionLifecycleService.js';
import { DataChannelManager } from '../src/network/DataChannelManager.js';
import { LatencyMonitor } from '../src/network/LatencyMonitor.js';
import { PeerConnectionManager } from '../src/network/PeerConnectionManager.js';
import { SessionAdapterBase } from '../src/network/SessionAdapterBase.js';
import { StateReconciler } from '../src/network/StateReconciler.js';

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

test.describe('V59-59.7.3: Network Adapter Robustness', () => {

    test('LANSessionAdapter module loads without errors', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            try {
                const mod = await import('/src/network/LANSessionAdapter.js');
                return { ok: true, hasClass: typeof mod.LANSessionAdapter === 'function' };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });
        expect(result.ok).toBe(true);
        expect(result.hasClass).toBe(true);
    });

    test('OnlineSessionAdapter module loads without errors', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            try {
                const mod = await import('/src/network/OnlineSessionAdapter.js');
                return { ok: true, hasClass: typeof mod.OnlineSessionAdapter === 'function' };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });
        expect(result.ok).toBe(true);
        expect(result.hasClass).toBe(true);
    });

    test('LANMatchLobby module loads without errors', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            try {
                const mod = await import('/src/network/LANMatchLobby.js');
                return { ok: true, hasClass: typeof mod.LANMatchLobby === 'function' };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });
        expect(result.ok).toBe(true);
        expect(result.hasClass).toBe(true);
    });

    test('Multiplayer menu is accessible without errors', async ({ page }) => {
        await loadGame(page);
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.evaluate(() => {
            const btn = document.querySelector('[data-menu="multiplayer"]') ||
                        document.querySelector('button.multiplayer-btn');
            if (btn) btn.click();
        });
        await page.waitForTimeout(1000);
        expect(errors.length).toBe(0);
    });

    test('Game instance has no network adapter leaks after single-player match', async ({ page }) => {
        await startGameWithBots(page, 1);
        await page.waitForTimeout(2000);
        const state = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return {
                hasMultiplayerAdapter: !!g?.multiplayerAdapter,
                isConnected: g?.multiplayerAdapter?.isConnected === true,
            };
        });
        // Single-player should not have an active multiplayer adapter
        expect(state.isConnected).toBe(false);
    });
});

test.describe('V59-59.7.4: Signaling error and late ICE candidate characterization', () => {

    test('OnlineSessionAdapter.connect() rejects on WebSocket error', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            try {
                const { OnlineSessionAdapter } = await import('/src/network/OnlineSessionAdapter.js');
                const adapter = new OnlineSessionAdapter({ isHost: true, signalingUrl: 'ws://127.0.0.1:1' });
                await adapter.connect({ connectTimeoutMs: 3000 });
                return { rejected: false };
            } catch (err) {
                return { rejected: true, message: err.message };
            }
        });
        expect(result.rejected).toBe(true);
    });

    test('OnlineSessionAdapter.connect() rejects on signaling error message', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            try {
                const { OnlineSessionAdapter } = await import('/src/network/OnlineSessionAdapter.js');
                const adapter = new OnlineSessionAdapter({ isHost: false });
                // Simulate signaling error via the internal handler directly
                let rejectCalled = false;
                await new Promise((resolve, reject) => {
                    adapter._handleSignalingMessage(
                        { type: 'error', message: 'lobby not found' },
                        resolve,
                        (err) => { rejectCalled = true; reject(err); }
                    );
                });
                return { rejected: false };
            } catch (err) {
                return { rejected: true, message: err.message };
            }
        });
        expect(result.rejected).toBe(true);
        expect(result.message).toContain('lobby not found');
    });

    test('OnlineMatchLobby.create() rejects on signaling error message', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            try {
                const { OnlineMatchLobby } = await import('/src/network/OnlineMatchLobby.js');
                const lobby = new OnlineMatchLobby({ signalingUrl: '' });
                let rejectCalled = false;
                await new Promise((resolve, reject) => {
                    lobby._handleMessage(
                        { type: 'error', message: 'max players reached' },
                        resolve,
                        (err) => { rejectCalled = true; reject(err); }
                    );
                });
                return { rejected: false };
            } catch (err) {
                return { rejected: true, message: err.message };
            }
        });
        expect(result.rejected).toBe(true);
        expect(result.message).toContain('max players reached');
    });

    test('LANSessionAdapter._pollIceCandidates continues past first batch (trickle-ICE)', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { LANSessionAdapter } = await import('/src/network/LANSessionAdapter.js');
            const adapter = new LANSessionAdapter({ isHost: false, signalingUrl: 'http://127.0.0.1:1' });
            // Track addIceCandidate calls
            const added = [];
            adapter._peerManager = {
                addIceCandidate: async (peerId, c) => { added.push(c); },
            };
            let callCount = 0;
            // Batch 1 on call 0, empty on calls 1-3 (quiet window = 3), stops after 3rd empty
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                callCount += 1;
                if (callCount === 1) {
                    return { json: async () => ({ candidates: ['c1', 'c2'] }) };
                }
                return { json: async () => ({ candidates: [] }) };
            };
            adapter.localPlayerId = 'p1';
            await adapter._pollIceCandidates('host');
            globalThis.fetch = originalFetch;
            return { added, callCount };
        });
        // Should have added candidates from first batch
        expect(result.added).toEqual(['c1', 'c2']);
        // Should have polled beyond first batch: 1 (batch) + 3 (quiet window) = 4 total
        expect(result.callCount).toBeGreaterThanOrEqual(4);
    });

    test('OnlineSessionAdapter.connect() rejects on timeout', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            try {
                const { OnlineSessionAdapter } = await import('/src/network/OnlineSessionAdapter.js');
                const adapter = new OnlineSessionAdapter({ isHost: true, signalingUrl: 'ws://127.0.0.1:1' });
                await adapter.connect({ connectTimeoutMs: 500 });
                return { rejected: false };
            } catch (err) {
                return { rejected: true, message: err.message };
            }
        });
        expect(result.rejected).toBe(true);
    });
});

test.describe('V67-67.2: Retry and resilience hardening', () => {
    test('OnlineSessionAdapter.connect() retries with configurable backoff', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const originalWebSocket = globalThis.WebSocket;
            let attempts = 0;
            class MockWebSocket {
                static OPEN = 1;

                constructor() {
                    this.readyState = 0;
                    attempts += 1;
                    setTimeout(() => {
                        if (attempts < 3) {
                            this.onerror?.(new Error('mock-failure'));
                            this.onclose?.();
                            return;
                        }
                        this.readyState = MockWebSocket.OPEN;
                        this.onopen?.();
                        setTimeout(() => {
                            this.onmessage?.({
                                data: JSON.stringify({
                                    type: 'lobby_created',
                                    lobbyCode: 'MOCK',
                                    playerId: 'host',
                                }),
                            });
                        }, 0);
                    }, 0);
                }

                send() {}

                close() {
                    this.readyState = 3;
                }
            }
            globalThis.WebSocket = MockWebSocket;
            try {
                const { OnlineSessionAdapter } = await import('/src/network/OnlineSessionAdapter.js');
                const adapter = new OnlineSessionAdapter({ isHost: true, signalingUrl: 'ws://mock' });
                await adapter.connect({
                    connectTimeoutMs: 250,
                    connectRetryDelaysMs: [0, 0],
                    maxConnectAttempts: 3,
                });
                const connected = adapter.isConnected === true;
                adapter.dispose();
                return { attempts, connected };
            } finally {
                globalThis.WebSocket = originalWebSocket;
            }
        });

        expect(result.connected).toBe(true);
        expect(result.attempts).toBe(3);
    });

    test('OnlineMatchLobby.create() retries and connectReject remains single-shot', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const originalWebSocket = globalThis.WebSocket;
            let attempts = 0;
            class MockWebSocket {
                static OPEN = 1;

                constructor() {
                    this.readyState = 0;
                    attempts += 1;
                    setTimeout(() => {
                        if (attempts < 3) {
                            this.onerror?.(new Error('mock-failure'));
                            this.onclose?.();
                            return;
                        }
                        this.readyState = MockWebSocket.OPEN;
                        this.onopen?.();
                        setTimeout(() => {
                            this.onmessage?.({
                                data: JSON.stringify({
                                    type: 'lobby_created',
                                    lobbyCode: 'L-1',
                                    playerId: 'host',
                                    maxPlayers: 4,
                                }),
                            });
                            this.onmessage?.({
                                data: JSON.stringify({
                                    type: 'error',
                                    message: 'late error must not re-reject',
                                }),
                            });
                        }, 0);
                    }, 0);
                }

                send() {}

                close() {
                    this.readyState = 3;
                }
            }
            globalThis.WebSocket = MockWebSocket;
            try {
                const { OnlineMatchLobby } = await import('/src/network/OnlineMatchLobby.js');
                const lobby = new OnlineMatchLobby({ signalingUrl: 'ws://mock' });
                await lobby.create({
                    connectTimeoutMs: 250,
                    connectRetryDelaysMs: [0, 0],
                    maxConnectAttempts: 3,
                    maxPlayers: 4,
                });
                const state = lobby.sessionState;
                lobby.dispose();
                return {
                    attempts,
                    lobbyCode: state?.lobbyCode || null,
                    memberCount: state?.members?.length || 0,
                };
            } finally {
                globalThis.WebSocket = originalWebSocket;
            }
        });

        expect(result.attempts).toBe(3);
        expect(result.lobbyCode).toBe('L-1');
        expect(result.memberCount).toBe(1);
    });

    test('DataChannelManager emits backpressure events instead of silent drops', async () => {
        const manager = new DataChannelManager({
            backpressureThresholdBytes: 64,
            backpressureCooldownMs: 0,
        });

        let sendCalls = 0;
        const events = [];
        manager.on('backpressure', (event) => events.push(event));
        manager._channels.set('peer-a:state', {
            readyState: 'open',
            bufferedAmount: 512,
            send: () => {
                sendCalls += 1;
            },
            close: () => {},
        });

        manager.sendToAll('state', { type: 'snapshot' });
        manager.dispose();

        expect(sendCalls).toBe(0);
        expect(events.length).toBe(1);
        expect(events[0].peerId).toBe('peer-a');
        expect(events[0].channel).toBe('state');
    });

    test('LatencyMonitor pauses heartbeat loop when no peers are tracked', async () => {
        const monitor = new LatencyMonitor({
            pingInterval: 10,
            onPingNeeded: () => {},
        });

        monitor.start();
        expect(monitor._intervalId).toBeNull();
        monitor.addPeer('peer-1');
        expect(monitor._intervalId).not.toBeNull();
        monitor.removePeer('peer-1');
        expect(monitor._intervalId).toBeNull();
        monitor.stop();
    });
});

test.describe('V67-67.3: State and server cleanup hardening', () => {
    test('StateReconciler reconciles rotation, velocity, effects and field thresholds', () => {
        const reconciler = new StateReconciler({
            correctionRate: 0.5,
            positionSnapThreshold: 100,
            rotationSnapThreshold: 10,
            velocitySnapThreshold: 100,
        });

        const localPlayer = {
            index: 0,
            position: { x: 0, y: 0, z: 0 },
            quaternion: { x: 0, y: 0, z: 0, w: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            activeEffects: [],
            score: 0,
            health: 100,
            speed: 0,
        };
        reconciler.receiveServerState({
            state: {
                players: [{
                    index: 0,
                    pos: [10, 0, 0],
                    rot: [0, 0, 0.7071067, 0.7071067],
                    vel: [6, 0, 0],
                    effects: [{ type: 'SPEED_UP', remaining: 2.5 }],
                    score: 42,
                    health: 77,
                    speed: 18,
                }],
            },
        });

        reconciler.reconcile([localPlayer], {});

        expect(localPlayer.position.x).toBeGreaterThan(0);
        expect(localPlayer.velocity.x).toBeGreaterThan(0);
        expect(localPlayer.quaternion.w).not.toBe(1);
        expect(localPlayer.activeEffects.length).toBe(1);
        expect(localPlayer.activeEffects[0].type).toBe('SPEED_UP');
        expect(localPlayer.score).toBe(42);
        expect(localPlayer.health).toBe(77);
        expect(localPlayer.speed).toBe(18);
    });

    test('LAN signaling server performs ghost-player cleanup after timeout', async () => {
        const lanServer = await startLanServer({
            ghostPlayerTimeoutMs: 40,
            ghostCleanupIntervalMs: 0,
        });
        try {
            const joinResponse = await fetch(`${lanServer.baseUrl}/lobby/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lobbyCode: 'TEST' }),
            });
            const joinData = await joinResponse.json();
            expect(joinData.playerId).toContain('player-');

            await new Promise((resolve) => setTimeout(resolve, 80));
            lanServer.cleanupGhostPlayers();

            const statusResponse = await fetch(`${lanServer.baseUrl}/lobby/status`);
            const statusData = await statusResponse.json();
            expect(Array.isArray(statusData.players)).toBe(true);
            expect(statusData.players.length).toBe(0);
            expect(Array.isArray(statusData.pendingPlayers)).toBe(true);
            expect(statusData.pendingPlayers.length).toBe(0);
        } finally {
            await stopLanServer(lanServer.server);
        }
    });

    test('waitForRuntimePlayersLoaded scales timeout by remote client count', async () => {
        const listeners = new Map();
        const sentInputs = [];
        const session = {
            isHost: true,
            localPlayerId: 'host',
            on(event, handler) {
                if (!listeners.has(event)) listeners.set(event, []);
                listeners.get(event).push(handler);
            },
            off(event, handler) {
                const entries = listeners.get(event) || [];
                const index = entries.indexOf(handler);
                if (index >= 0) entries.splice(index, 1);
            },
            emit(event, payload) {
                for (const handler of listeners.get(event) || []) {
                    handler(payload);
                }
            },
            sendInput(payload) {
                sentInputs.push(payload);
            },
            getPlayers() {
                return [
                    { peerId: 'host' },
                    { peerId: 'client-1' },
                    { peerId: 'client-2' },
                    { peerId: 'client-3' },
                ];
            },
        };

        const facade = {
            session,
            _arenaLoadedPeers: new Set(),
            _onPlayerLoadedHandler: null,
        };

        const originalSetTimeout = globalThis.setTimeout;
        let observedTimeoutMs = null;
        globalThis.setTimeout = (fn, ms, ...args) => {
            observedTimeoutMs = Number(ms);
            return originalSetTimeout(fn, ms, ...args);
        };

        try {
            const waitPromise = waitForRuntimePlayersLoaded(facade);
            session.emit('playerLoaded', { playerId: 'client-1' });
            session.emit('playerLoaded', { playerId: 'client-2' });
            session.emit('playerLoaded', { playerId: 'client-3' });
            await waitPromise;

            expect(observedTimeoutMs).toBe(25_000);
            expect(sentInputs[0]?.type).toBe('arena_start');
        } finally {
            globalThis.setTimeout = originalSetTimeout;
        }
    });
});

test.describe('V67-67.4: Expanded multiplayer coverage', () => {
    test('67.4.1 ICE polling does not lose candidates during concurrent host/client fetches', async () => {
        const lanServer = await startLanServer({
            ghostPlayerTimeoutMs: 60_000,
            ghostCleanupIntervalMs: 0,
        });
        try {
            const joinResponse = await fetch(`${lanServer.baseUrl}/lobby/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lobbyCode: 'QA' }),
            });
            const joinData = await joinResponse.json();
            const playerId = joinData.playerId;

            await fetch(`${lanServer.baseUrl}/signaling/ice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: 'host',
                    targetPlayerId: playerId,
                    candidate: 'host-candidate-1',
                }),
            });
            await fetch(`${lanServer.baseUrl}/signaling/ice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    targetPlayerId: 'host',
                    candidate: 'client-candidate-1',
                }),
            });

            const [hostPoll, clientPoll] = await Promise.all([
                fetch(`${lanServer.baseUrl}/signaling/ice?playerId=host&fromPlayerId=${playerId}`).then((res) => res.json()),
                fetch(`${lanServer.baseUrl}/signaling/ice?playerId=${playerId}&fromPlayerId=host`).then((res) => res.json()),
            ]);

            expect(hostPoll.candidates).toEqual(['client-candidate-1']);
            expect(clientPoll.candidates).toEqual(['host-candidate-1']);

            const emptyHostPoll = await fetch(
                `${lanServer.baseUrl}/signaling/ice?playerId=host&fromPlayerId=${playerId}`
            ).then((res) => res.json());
            const emptyClientPoll = await fetch(
                `${lanServer.baseUrl}/signaling/ice?playerId=${playerId}&fromPlayerId=host`
            ).then((res) => res.json());

            expect(emptyHostPoll.candidates).toEqual([]);
            expect(emptyClientPoll.candidates).toEqual([]);
        } finally {
            await stopLanServer(lanServer.server);
        }
    });

    test('67.4.2 PeerConnectionManager emits heartbeat timeout after missing pong window', async () => {
        const originalSetInterval = globalThis.setInterval;
        const originalClearInterval = globalThis.clearInterval;
        const intervalCallbacks = [];
        globalThis.setInterval = (fn) => {
            intervalCallbacks.push(fn);
            return intervalCallbacks.length;
        };
        globalThis.clearInterval = () => {};

        try {
            const manager = new PeerConnectionManager({
                dataChannelManager: {
                    send: () => true,
                    closeChannels: () => {},
                },
            });
            let timedOutPeerId = null;
            manager.on('heartbeatTimeout', ({ peerId }) => {
                timedOutPeerId = peerId;
            });

            manager._startHeartbeat('peer-heartbeat');
            const heartbeatEntry = manager._heartbeats.get('peer-heartbeat');
            heartbeatEntry.lastPong = Date.now() - 6000;
            intervalCallbacks[0]();

            expect(timedOutPeerId).toBe('peer-heartbeat');
            manager.dispose();
        } finally {
            globalThis.setInterval = originalSetInterval;
            globalThis.clearInterval = originalClearInterval;
        }
    });

    test('67.4.3 Reconnect window keeps peer within 30s and removes peer after expiry', async () => {
        class HostReconnectAdapter extends SessionAdapterBase {
            constructor(options = {}) {
                super({
                    ...options,
                    isHost: true,
                });
                this.closedPeers = [];
                this.removedLatencyPeers = [];
                this.broadcastMessages = [];
            }

            _sendStateToAll(message) {
                this.broadcastMessages.push(message);
            }

            _sendStateToPeer() {}

            _closePeerConnection(peerId) {
                this.closedPeers.push(peerId);
            }

            _removePeerLatency(peerId) {
                this.removedLatencyPeers.push(peerId);
            }
        }

        let nowMs = 1000;
        const adapter = new HostReconnectAdapter({
            reconnectWindowMs: 30_000,
            now: () => nowMs,
        });

        let reconnectedPeer = null;
        let removedPeer = null;
        adapter.on('playerReconnected', ({ peerId }) => {
            reconnectedPeer = peerId;
        });
        adapter.on('playerRemoved', ({ peerId }) => {
            removedPeer = peerId;
        });

        adapter._registerPeerDisconnect('peer-a', 'network-drop');
        nowMs = 25_000;
        adapter._resolvePeerReconnect('peer-a');
        expect(reconnectedPeer).toBe('peer-a');
        expect(adapter.getReconnectInfo('peer-a')).toBeNull();

        adapter._registerPeerDisconnect('peer-b', 'timeout');
        const disconnectEntry = adapter._disconnectedPeers.get('peer-b');
        clearTimeout(disconnectEntry.timer);
        nowMs = 40_500;
        adapter._finalizePeerRemoval('peer-b');

        expect(removedPeer).toBe('peer-b');
        expect(adapter.closedPeers).toContain('peer-b');
        expect(adapter.removedLatencyPeers).toContain('peer-b');
    });

    test('67.4.4 Client host_leaving handling emits host disconnect and performs cleanup', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { OnlineSessionAdapter } = await import('/src/network/OnlineSessionAdapter.js');
            const adapter = new OnlineSessionAdapter({ isHost: false });
            const events = [];
            const closedPeers = [];
            const removedPeers = [];

            adapter.on('hostDisconnected', (payload) => events.push({ type: 'hostDisconnected', payload }));
            adapter.on('playerDisconnected', (payload) => events.push({ type: 'playerDisconnected', payload }));
            adapter._closePeerConnection = (peerId) => {
                closedPeers.push(peerId);
            };
            adapter._removePeerLatency = (peerId) => {
                removedPeers.push(peerId);
            };

            adapter._handleDataMessage('host', 'state', { type: 'host_leaving' });
            adapter.dispose();

            return { events, closedPeers, removedPeers };
        });

        expect(result.events.find((entry) => entry.type === 'hostDisconnected')).toBeTruthy();
        expect(result.events.find((entry) => entry.type === 'playerDisconnected')?.payload?.isHost).toBe(true);
        expect(result.closedPeers).toContain('host');
        expect(result.removedPeers).toContain('host');
    });

    test('67.4.5 Two-tab multiplayer stability >15s with network mapping checks and remote presence', async ({ page }) => {
        test.setTimeout(120000);
        await page.context().addInitScript(() => {
            globalThis.__CURVIOS_APP__ = true;
        });
        const secondPage = await page.context().newPage();
        try {
            await secondPage.context().addInitScript(() => {
                globalThis.__CURVIOS_APP__ = true;
            });

            await loadGame(page);
            await loadGame(secondPage);

            const networkMapping = await page.evaluate(async () => {
                const { createRuntimeConfigSnapshot } = await import('/src/core/RuntimeConfig.js');
                const { createRuntimeSessionAdapter } = await import('/src/core/runtime/RuntimeSessionLifecycleService.js');
                const lanConfig = createRuntimeConfigSnapshot({
                    localSettings: { sessionType: 'lan' },
                });
                const onlineConfig = createRuntimeConfigSnapshot({
                    localSettings: { sessionType: 'online' },
                });
                const lanAdapter = await createRuntimeSessionAdapter('lan');
                const onlineAdapter = await createRuntimeSessionAdapter('online');
                const payload = {
                    lanNetworkEnabled: lanConfig?.session?.networkEnabled === true,
                    onlineNetworkEnabled: onlineConfig?.session?.networkEnabled === true,
                    lanAdapterType: lanAdapter?.constructor?.name || null,
                    onlineAdapterType: onlineAdapter?.constructor?.name || null,
                };
                lanAdapter?.dispose?.();
                onlineAdapter?.dispose?.();
                return payload;
            });

            expect(networkMapping.lanNetworkEnabled).toBe(true);
            expect(networkMapping.onlineNetworkEnabled).toBe(true);
            expect(networkMapping.lanAdapterType).toBe('LANSessionAdapter');
            expect(networkMapping.onlineAdapterType).toBe('OnlineSessionAdapter');

            await openMultiplayerSubmenu(page);
            await page.fill('#multiplayer-lobby-code', 'V67-STABLE');
            await page.click('#btn-multiplayer-host');
            await page.waitForFunction(
                () => window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.()?.joined === true,
                null,
                { timeout: 10000 }
            );

            await openMultiplayerSubmenu(secondPage);
            await secondPage.fill('#multiplayer-lobby-code', 'V67-STABLE');
            await secondPage.click('#btn-multiplayer-join');
            await secondPage.waitForFunction(
                () => window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.()?.joined === true,
                null,
                { timeout: 10000 }
            );

            await page.waitForFunction(() => {
                const state = window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.();
                return state?.memberCount === 2;
            }, null, { timeout: 10000 });

            await page.bringToFront();
            await page.waitForTimeout(16000);

            const hostPresence = await page.evaluate(() => {
                const state = window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.();
                return {
                    joined: state?.joined === true,
                    memberCount: state?.memberCount || 0,
                    staleCount: state?.staleCount || 0,
                };
            });
            const clientPresence = await secondPage.evaluate(() => {
                const state = window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.();
                return {
                    joined: state?.joined === true,
                    memberCount: state?.memberCount || 0,
                };
            });

            expect(hostPresence.joined).toBe(true);
            expect(hostPresence.memberCount).toBe(2);
            expect(hostPresence.staleCount).toBe(0);
            expect(clientPresence.joined).toBe(true);
            expect(clientPresence.memberCount).toBe(2);
        } finally {
            await secondPage.close();
        }
    });
});
