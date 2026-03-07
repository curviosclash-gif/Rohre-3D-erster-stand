import { chromium } from '@playwright/test';
import path from 'node:path';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { loadGame, openGameSubmenu } from '../tests/helpers.js';
import { stringifyMapDocument } from '../src/entities/MapSchema.js';

const GENERATED_LOCAL_MAPS_MODULE_PATH = path.resolve(process.cwd(), 'src/entities/GeneratedLocalMaps.js');
const EDITOR_MAP_DIR = path.resolve(process.cwd(), 'data/maps');
const EDITOR_JSON_SUFFIX = '.editor.json';
const RUNTIME_JSON_SUFFIX = '.runtime.json';

function getArg(index, fallback = '') {
    return String(process.argv[index] || fallback);
}

function readState(statePath) {
    return JSON.parse(readFileSync(statePath, 'utf8'));
}

function writeState(statePath, payload) {
    writeFileSync(statePath, JSON.stringify(payload, null, 2), 'utf8');
}

function cleanupSavedMap(state) {
    if (!state?.mapKey) return;
    rmSync(path.join(EDITOR_MAP_DIR, `${state.mapKey}${EDITOR_JSON_SUFFIX}`), { force: true });
    rmSync(path.join(EDITOR_MAP_DIR, `${state.mapKey}${RUNTIME_JSON_SUFFIX}`), { force: true });
}

async function withBrowser(baseURL, run) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
        return await run(page);
    } finally {
        await context.close();
        await browser.close();
    }
}

async function saveMap(baseURL, statePath) {
    const moduleBackup = readFileSync(GENERATED_LOCAL_MAPS_MODULE_PATH, 'utf8');
    const mapName = `QA Runtime Map ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mapJson = stringifyMapDocument({
        arenaSize: { width: 2800, height: 950, depth: 2400 },
        hardBlocks: [
            { id: 'qa_runtime_block', x: 0, y: 160, z: 0, width: 320, height: 180, depth: 320 },
        ],
    });

    const result = await withBrowser(baseURL, async (page) => {
        await page.goto(`${baseURL}/editor/map-editor-3d.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('#btnSaveToGame', { timeout: 15000 });
        return page.evaluate(async ({ mapName, mapJson }) => {
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
    });

    const state = {
        baseURL,
        moduleBackup,
        mapKey: String(result?.payload?.mapKey || ''),
        mapName,
        saveResult: result,
    };
    writeState(statePath, state);
    console.log(JSON.stringify(state, null, 2));
}

async function verifyMap(baseURL, statePath, screenshotPath) {
    const state = readState(statePath);
    const result = await withBrowser(baseURL, async (page) => {
        await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await loadGame(page);
        await openGameSubmenu(page);
        const selectionState = await page.evaluate((expectedName) => {
            const options = Array.from(document.querySelectorAll('#map-select option')).map((option) => ({
                value: option.value,
                text: String(option.textContent || ''),
            }));
            const matching = options.find((entry) => entry.text === expectedName) || null;
            return {
                matching,
                optionCount: options.length,
            };
        }, state.mapName);

        if (!selectionState.matching) {
            await page.screenshot({ path: screenshotPath, fullPage: true });
            return {
                ...selectionState,
                matched: false,
            };
        }

        await page.evaluate((mapKey) => {
            const game = window.GAME_INSTANCE;
            if (!game?.settings) return;
            game.settings.mapKey = mapKey;
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

        await page.screenshot({ path: screenshotPath, fullPage: true });
        return {
            ...selectionState,
            matched: true,
            matchProbe,
        };
    });
    console.log(JSON.stringify(result, null, 2));
}

function cleanup(statePath) {
    const state = readState(statePath);
    cleanupSavedMap(state);
    writeFileSync(GENERATED_LOCAL_MAPS_MODULE_PATH, state.moduleBackup, 'utf8');
}

const mode = getArg(2);
const baseURL = getArg(3);
const statePath = getArg(4, path.resolve(process.cwd(), 'tmp', 'map-disk-runtime-state.json'));
const screenshotPath = getArg(5, path.resolve(process.cwd(), 'tmp', 'map-disk-runtime.png'));

if (mode === 'save') {
    await saveMap(baseURL, statePath);
} else if (mode === 'verify') {
    await verifyMap(baseURL, statePath, screenshotPath);
} else if (mode === 'cleanup') {
    cleanup(statePath);
} else {
    console.error('Usage: node tmp/map-disk-runtime-flow.mjs <save|verify|cleanup> <baseURL> <statePath> [screenshotPath]');
    process.exitCode = 1;
}
