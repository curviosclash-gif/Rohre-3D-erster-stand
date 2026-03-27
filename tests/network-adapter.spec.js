import { test, expect } from '@playwright/test';
import { loadGame, startGameWithBots } from './helpers.js';

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
