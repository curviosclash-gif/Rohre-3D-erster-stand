import { test, expect } from '@playwright/test';
import { loadGame, startGameWithBots, returnToMenu } from './helpers.js';

test.describe('V59-59.7.2: GameRuntimeFacade', () => {

    test('RuntimeFacade is available after game load', async ({ page }) => {
        await loadGame(page);
        const exists = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return !!g?.runtimeFacade;
        });
        expect(exists).toBe(true);
    });

    test('Settings apply does not throw', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            const facade = g?.runtimeFacade;
            if (!facade) return { error: 'no facade' };
            try {
                facade.applySettingsToRuntime?.();
                return { ok: true };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });
        expect(result.ok).toBe(true);
    });

    test('Session switch: start match then return to menu', async ({ page }) => {
        await startGameWithBots(page, 1);
        await page.waitForTimeout(2000);
        await returnToMenu(page);
        const menuVisible = await page.evaluate(() => {
            const menu = document.getElementById('main-menu');
            return !!(menu && !menu.classList.contains('hidden'));
        });
        expect(menuVisible).toBe(true);
    });

    test('Pause and resume does not crash', async ({ page }) => {
        await startGameWithBots(page, 1);
        const result = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            try {
                if (typeof g?.pause === 'function') g.pause();
                if (typeof g?.resume === 'function') g.resume();
                return { ok: true };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });
        expect(result.ok).toBe(true);
    });

    test('Cleanup/dispose does not leave dangling state', async ({ page }) => {
        await startGameWithBots(page, 1);
        await page.waitForTimeout(1000);
        await returnToMenu(page);
        const state = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return {
                hasPlayers: g?.entityManager?.players?.length > 0,
                gameLoop: !!g?.gameLoop?.running,
            };
        });
        // After returning to menu, game loop should not be running
        expect(state.gameLoop).toBe(false);
    });
});
