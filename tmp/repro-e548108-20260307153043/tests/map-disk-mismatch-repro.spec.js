import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { loadGame, openGameSubmenu } from './helpers.js';
import { stringifyMapDocument } from '../src/entities/MapSchema.js';

const GENERATED_MODULE_DIR = path.resolve(process.cwd(), 'js/modules');
const GENERATED_MODULE_PATH = path.resolve(GENERATED_MODULE_DIR, 'GeneratedLocalMaps.js');
const SRC_MODULE_PATH = path.resolve(process.cwd(), 'src/entities/GeneratedLocalMaps.js');
const EDITOR_MAP_DIR = path.resolve(process.cwd(), 'data/maps');
const EDITOR_JSON_SUFFIX = '.editor.json';
const RUNTIME_JSON_SUFFIX = '.runtime.json';

test('baseline repro: disk map is written outside runtime import path', async ({ page }) => {
    mkdirSync(GENERATED_MODULE_DIR, { recursive: true });

    const mapName = `Baseline Mismatch ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mapJson = stringifyMapDocument({
        arenaSize: { width: 2800, height: 950, depth: 2400 },
        hardBlocks: [
            { id: 'baseline_block', x: 0, y: 140, z: 0, width: 260, height: 180, depth: 260 },
        ],
    });

    let createdMapKey = '';

    try {
        await page.goto('/editor/map-editor-3d.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('#btnSaveToGame', { timeout: 15000 });

        const saveResult = await page.evaluate(async ({ mapName, mapJson }) => {
            const response = await fetch('/api/editor/save-map-disk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapName, jsonText: mapJson }),
            });
            return {
                ok: response.ok,
                status: response.status,
                payload: await response.json(),
            };
        }, { mapName, mapJson });

        expect(saveResult.ok).toBeTruthy();
        expect(saveResult.payload?.generatedModulePath).toBe('js/modules/GeneratedLocalMaps.js');

        createdMapKey = String(saveResult.payload?.mapKey || '');
        expect(createdMapKey).toMatch(/^editor_/);

        const generatedModuleText = readFileSync(GENERATED_MODULE_PATH, 'utf8');
        const srcModuleText = readFileSync(SRC_MODULE_PATH, 'utf8');
        expect(generatedModuleText).toContain(createdMapKey);
        expect(srcModuleText).not.toContain(createdMapKey);

        await loadGame(page);
        await openGameSubmenu(page);

        const menuState = await page.evaluate((expectedName) => {
            const options = Array.from(document.querySelectorAll('#map-select option')).map((option) => ({
                value: option.value,
                text: String(option.textContent || ''),
            }));
            return {
                optionCount: options.length,
                matching: options.find((entry) => entry.text === expectedName) || null,
            };
        }, mapName);

        expect(menuState.optionCount).toBeGreaterThan(0);
        expect(menuState.matching).toBeNull();
    } finally {
        if (createdMapKey) {
            rmSync(path.join(EDITOR_MAP_DIR, `${createdMapKey}${EDITOR_JSON_SUFFIX}`), { force: true });
            rmSync(path.join(EDITOR_MAP_DIR, `${createdMapKey}${RUNTIME_JSON_SUFFIX}`), { force: true });
        }
        rmSync(GENERATED_MODULE_PATH, { force: true });
    }
});
