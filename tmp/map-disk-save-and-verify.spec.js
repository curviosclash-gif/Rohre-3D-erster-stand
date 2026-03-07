import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadGame, openGameSubmenu } from '../tests/helpers.js';
import { stringifyMapDocument } from '../src/entities/MapSchema.js';

const GENERATED_LOCAL_MAPS_MODULE_PATH = path.resolve(process.cwd(), 'src/entities/GeneratedLocalMaps.js');
const STATE_PATH = process.env.MAP_STATE_PATH || path.resolve(process.cwd(), 'tmp', 'map-disk-runtime-state.json');
const SCREENSHOT_PATH = process.env.MAP_SCREENSHOT_PATH || path.resolve(process.cwd(), 'tmp', 'map-disk-dev.png');

test('runtime repro setup: save editor disk map and verify it in dev runtime', async ({ page }) => {
    test.setTimeout(120000);

    const moduleBackup = readFileSync(GENERATED_LOCAL_MAPS_MODULE_PATH, 'utf8');
    const mapName = `QA Runtime Map ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mapJson = stringifyMapDocument({
        arenaSize: { width: 2800, height: 950, depth: 2400 },
        hardBlocks: [
            { id: 'qa_runtime_block', x: 0, y: 160, z: 0, width: 320, height: 180, depth: 320 },
        ],
    });

    await page.goto('/editor/map-editor-3d.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#btnSaveToGame', { timeout: 15000 });

    const saveResult = await page.evaluate(async ({ mapName, mapJson }) => {
        const response = await fetch('/api/editor/save-map-disk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mapName,
                jsonText: mapJson,
            }),
        });
        return {
            ok: response.ok,
            status: response.status,
            payload: await response.json(),
        };
    }, { mapName, mapJson });

    expect(saveResult.ok).toBeTruthy();
    expect(saveResult.payload?.generatedModulePath).toBe('src/entities/GeneratedLocalMaps.js');

    const mapKey = String(saveResult.payload?.mapKey || '');
    expect(mapKey).toMatch(/^editor_/);

    await page.waitForTimeout(900);
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
    }, mapName);

    expect(selectionState.matching?.value).toBe(mapKey);

    await page.evaluate((selectedMapKey) => {
        const game = window.GAME_INSTANCE;
        if (!game?.settings) return;
        game.settings.mapKey = selectedMapKey;
        game.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
    }, mapKey);
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

    expect(matchProbe.mapKey).toBe(mapKey);
    expect(matchProbe.obstacleCount).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    writeFileSync(STATE_PATH, JSON.stringify({
        mapKey,
        mapName,
        moduleBackup,
    }, null, 2), 'utf8');
});
