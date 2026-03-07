import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { loadGame, openGameSubmenu } from '../tests/helpers.js';

const STATE_PATH = process.env.MAP_STATE_PATH || path.resolve(process.cwd(), 'tmp', 'map-disk-runtime-state.json');
const SCREENSHOT_PATH = process.env.MAP_SCREENSHOT_PATH || path.resolve(process.cwd(), 'tmp', 'map-disk-runtime.png');

test('runtime repro verify: generated disk map appears and loads', async ({ page }) => {
    test.setTimeout(120000);

    const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));

    await loadGame(page);
    await openGameSubmenu(page);

    const selectionState = await page.evaluate((expectedName) => {
        const options = Array.from(document.querySelectorAll('#map-select option')).map((option) => ({
            value: option.value,
            text: String(option.textContent || ''),
        }));
        return {
            matching: options.find((entry) => entry.text === expectedName) || null,
            optionCount: options.length,
        };
    }, state.mapName);

    expect(selectionState.optionCount).toBeGreaterThan(0);
    expect(selectionState.matching?.value).toBe(state.mapKey);

    await page.evaluate((selectedMapKey) => {
        const game = window.GAME_INSTANCE;
        if (!game?.settings) return;
        game.settings.mapKey = selectedMapKey;
        game.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
    }, state.mapKey);
    await page.waitForTimeout(200);
    await page.click('#submenu-game:not(.hidden) #btn-start');
    await page.waitForFunction(() => {
        const hud = document.getElementById('hud');
        const g = window.GAME_INSTANCE;
        return hud && !hud.classList.contains('hidden') && g?.entityManager?.players?.length > 0;
    }, { timeout: 15000 });

    const matchProbe = await page.evaluate(() => ({
        mapKey: window.GAME_INSTANCE?.arena?.currentMapKey ?? null,
        obstacleCount: window.GAME_INSTANCE?.arena?.obstacles?.filter((entry) => !entry?.isWall)?.length ?? 0,
    }));

    expect(matchProbe.mapKey).toBe(state.mapKey);
    expect(matchProbe.obstacleCount).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
});
