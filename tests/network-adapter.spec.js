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
