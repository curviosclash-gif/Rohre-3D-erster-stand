import { expect, test } from './helpers.desktop.js';
import {
    collectErrors,
    returnToMenu,
    startGameFromMenu,
    waitForLoadedGame,
} from './helpers.js';

test.describe('Desktop Smoke', () => {
    test('boots the desktop app to menu with preload bridge and GAME_INSTANCE', async ({ page, desktopHarness }) => {
        const errors = collectErrors(page);
        await waitForLoadedGame(page);

        const runtimeState = await page.evaluate(() => ({
            mainMenuVisible: !!document.getElementById('main-menu')
                && !document.getElementById('main-menu')?.classList.contains('hidden'),
            canvasVisible: !!document.getElementById('game-canvas')
                && !document.getElementById('game-canvas')?.classList.contains('hidden'),
            hasGameInstance: !!window.GAME_INSTANCE,
            preloadBridgeReady: globalThis.__CURVIOS_APP__ === true && globalThis.curviosApp?.isApp === true,
            runtimeKind: window.curviosApp?.capabilities?.runtimeKind || null,
        }));

        expect(runtimeState.mainMenuVisible).toBeTruthy();
        expect(runtimeState.canvasVisible).toBeTruthy();
        expect(runtimeState.hasGameInstance).toBeTruthy();
        expect(runtimeState.preloadBridgeReady).toBeTruthy();
        expect(runtimeState.runtimeKind).toBe('electron');
        expect(errors).toHaveLength(0);
        expect(desktopHarness.diagnosticsPath.endsWith('desktop-startup-diagnostics.json')).toBeTruthy();
        expect(desktopHarness.artifacts.mainProcessLogPath.endsWith('desktop-main-process.log')).toBeTruthy();
        expect(desktopHarness.artifacts.rendererConsoleLogPath.endsWith('desktop-renderer-console.log')).toBeTruthy();
        expect(desktopHarness.artifacts.rendererErrorsLogPath.endsWith('desktop-renderer-errors.log')).toBeTruthy();
        expect(desktopHarness.artifacts.readyScreenshotPath.endsWith('desktop-renderer-ready.png')).toBeTruthy();
        expect(desktopHarness.artifacts.failureScreenshotPath.endsWith('desktop-renderer-failure.png')).toBeTruthy();
    });

    test('starts a match, receives desktop input, and returns to menu', async ({ page }) => {
        const errors = collectErrors(page);
        await startGameFromMenu(page);

        const inputProbe = await page.evaluate(() => ({
            upCode: String(window.GAME_INSTANCE?.input?.bindings?.PLAYER_1?.UP || 'KeyW'),
            modeType: window.GAME_INSTANCE?.entityManager?.gameModeStrategy?.modeType || null,
            playerCount: window.GAME_INSTANCE?.entityManager?.players?.length || 0,
            hudVisible: !document.getElementById('hud')?.classList.contains('hidden'),
        }));

        await page.keyboard.down(inputProbe.upCode);
        await page.waitForFunction((keyCode) => {
            const input = window.GAME_INSTANCE?.input;
            const currentInput = input?.getKeyboardInput?.(0, { includeSecondaryBindings: true });
            return !!(input?.keys?.[keyCode] && currentInput?.pitchUp);
        }, inputProbe.upCode, { timeout: 4000 });
        await page.keyboard.up(inputProbe.upCode);

        const inputArrived = await page.evaluate((keyCode) => {
            const input = window.GAME_INSTANCE?.input;
            const currentInput = input?.getKeyboardInput?.(0, { includeSecondaryBindings: true });
            return {
                keyReleased: input?.keys?.[keyCode] === false,
                playerPitchUp: currentInput?.pitchUp === false,
            };
        }, inputProbe.upCode);

        expect(inputProbe.hudVisible).toBeTruthy();
        expect(inputProbe.playerCount).toBeGreaterThan(0);
        expect(typeof inputProbe.modeType).toBe('string');
        expect(inputProbe.modeType.length).toBeGreaterThan(0);
        expect(inputArrived.keyReleased).toBeTruthy();
        expect(inputArrived.playerPitchUp).toBeTruthy();

        await returnToMenu(page);

        await expect(page.locator('#main-menu')).toBeVisible();
        await expect(page.locator('#submenu-game:not(.hidden)')).toHaveCount(1);
        expect(errors).toHaveLength(0);
    });
});
