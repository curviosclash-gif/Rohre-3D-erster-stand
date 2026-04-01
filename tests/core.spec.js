import { expect, test } from '@playwright/test';

import {
    collectErrors,
    loadGame,
    returnToMenu,
    startGame,
} from './helpers.js';

const SETTINGS_STORAGE_KEY = 'cuviosclash.settings.v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'aero-arena-3d.settings.v1';

test.describe('Core Smoke', () => {
    test('loads the desktop runtime without uncaught startup errors', async ({ page }) => {
        const errors = collectErrors(page);
        await loadGame(page);

        await expect(page.locator('#main-menu')).toBeVisible();
        await expect(page.locator('#game-canvas')).toBeVisible();
        expect(errors).toHaveLength(0);
    });

    test('starts a match with visible HUD and a wired game mode strategy', async ({ page }) => {
        await startGame(page);

        const runtimeState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            return {
                hudVisible: !document.getElementById('hud')?.classList.contains('hidden'),
                playerCount: game?.entityManager?.players?.length || 0,
                modeType: game?.entityManager?.gameModeStrategy?.modeType || null,
            };
        });

        expect(runtimeState.hudVisible).toBeTruthy();
        expect(runtimeState.playerCount).toBeGreaterThan(0);
        expect(typeof runtimeState.modeType).toBe('string');
        expect(runtimeState.modeType.length).toBeGreaterThan(0);
    });

    test('returns from an active match back to the menu', async ({ page }) => {
        await startGame(page);
        await returnToMenu(page);

        await expect(page.locator('#main-menu')).toBeVisible();
        await expect(page.locator('.submenu-panel:not(.hidden)')).toHaveCount(0);
    });

    test('keeps persisted settings across reloads without crashing', async ({ page }) => {
        const errors = collectErrors(page);
        await loadGame(page);
        await page.evaluate((storageKey) => {
            localStorage.setItem(storageKey, JSON.stringify({
                volume: 0.42,
                botCount: 3,
                shadowQuality: 2,
            }));
        }, SETTINGS_STORAGE_KEY);

        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 15_000 });

        const persisted = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '{}'), SETTINGS_STORAGE_KEY);
        expect(persisted.botCount).toBe(3);
        expect(persisted.shadowQuality).toBe(2);
        expect(errors).toHaveLength(0);
    });

    test('migrates the legacy settings key into the current storage namespace', async ({ page }) => {
        await loadGame(page);
        await page.evaluate(({ legacyKey, currentKey }) => {
            localStorage.removeItem(currentKey);
            localStorage.setItem(legacyKey, JSON.stringify({
                botCount: 2,
                quality: 'high',
            }));
        }, {
            legacyKey: LEGACY_SETTINGS_STORAGE_KEY,
            currentKey: SETTINGS_STORAGE_KEY,
        });

        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 15_000 });

        const migrated = await page.evaluate(({ legacyKey, currentKey }) => ({
            current: JSON.parse(localStorage.getItem(currentKey) || '{}'),
            legacyStillPresent: localStorage.getItem(legacyKey) !== null,
        }), {
            legacyKey: LEGACY_SETTINGS_STORAGE_KEY,
            currentKey: SETTINGS_STORAGE_KEY,
        });

        expect(migrated.current.botCount).toBe(2);
        expect(migrated.legacyStillPresent).toBeFalsy();
    });
});
